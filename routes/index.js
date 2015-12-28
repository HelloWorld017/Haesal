var libAsync = require('async');
var libFs = require('fs');
var libMarked = require('marked');
var libManymatch = require('manymatch');
var libPath = require('path');

var plugins = require('../plugins')();
var config = require('../config');

const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;
const ACCESSIBILITY_NEGATIVE_PARTIALLY = 3;

const FILE_TYPE_LOCAL = 0;
const FILE_TYPE_REMOTE = 1;

const INDEX_TYPE_HTML = "html";
const INDEX_TYPE_MARKDOWN = "markdown";

function File(name, config){
	this.name = name;
	this.config = config;
}

File.prototype = {
	getName: function() {
		return this.name;
	},

	getDownloadURL: function(){
		if(this.getType() === FILE_TYPE_REMOTE) return this.config["download"];

		var download = this.config["download"].replace("\\", "/");
		if (download.charAt(0) === "/") download = download.substr(1);
		return '/' + removeHomeDir(download).join('/');
	},

	getPath: function(){
		var download = this.config["download"];

		if(this.getType() === FILE_TYPE_REMOTE) return download;

		if(download.charAt(0) === libPath.sep){
			download = "." + download;
		}else{
			download = "." + libPath.sep + download;
		}

		return download;
	},

	getType: function(){
		if(this.config.hasOwnProperty("type")){
			return this.config["type"];
		}

		return FILE_TYPE_LOCAL;
	},

	isFile: function(){
		return true;
	}
};


function Folder(path, config){
	this.path = path;
	this.config = config;
	this.name = getFolderName(path);
}

Folder.prototype = {
	getPath: function(){
		return this.path;
	},

	getAccessibility: function(){
		return this.config["accessibility"];
	},

	getName: function(){
		return this.name;
	},

	getDownloadPath: function(){
		return '/' + removeHomeDir(this.getPath()).join('/');
	},

	getIndex: function(callback){
		if(!this.config["index"]){
			callback(null);
			return;
		}

		switch(this.config["index-type"]){
			case INDEX_TYPE_MARKDOWN:
				libFs.readFile(libPath.join(this.getPath(), this.config["index"]), config.read_config, function(err, data){
					if(err){
						callback(null);
						return;
					}

					callback(libMarked(data));
				});
				break;

			case INDEX_TYPE_HTML:
				libFs.readFile(libPath.join(this.getPath(), this.config["index"]), config.read_config, function(err, data){
					if(err){
						callback(null);
						return;
					}

					callback(data);
				});
				break;

			default:
				callback(null);
				break;
		}
	},

	getFolderType: function(){
		return this.config["type"];
	},

	listFiles: function(callback){
		var path = this.getPath();
		var accessibility = this.getAccessibility();

		libFs.readdir(path, function(err, files){
			if(!files){
				callback([]);
				return;
			}

			switch(accessibility){
				case ACCESSIBILITY_NO:
					callback([]);
					return;

				case ACCESSIBILITY_PARTIALLY:
					libAsync.map(files, function(v, asyncCallback){
						libFs.stat(libPath.join(path, v), function(err, stat){
							if(err){
								asyncCallback(undefined, null);
							}

							if(stat.isDirectory()){
								libFs.readFile(libPath.join(path, v, config.folder_name), config.read_config, function(err, data){
									if(!err){
										getFolder(refineFolderPath(libPath.join(path, v)), function(folder){
											asyncCallback(undefined, folder);
										}, data);
										return;
									}

									asyncCallback(undefined, null);
								});
							}else if(libPath.extname(v) === config.file_ext){
								libFs.readFile(libPath.join(path, v), config.read_config, function(err, data){
									if(err){
										asyncCallback(undefined, null);
										return;
									}
									var json = JSON.parse(data);
									//Although it is a file, I used getFolderName because the algorithm is same.
									asyncCallback(undefined, (new File(getFolderName(json["download"]), json)));
								});
							}else{
								asyncCallback(undefined, null);
							}
						});
					}, function(err, res){
						if(err){
							callback([]);
							return;
						}

						callback(res.filter(function(v){
							return v !== null;
						}));
					});

					break;

				case ACCESSIBILITY_YES:
					libAsync.map(files, function(v, asyncCallback){
						if(v === config.folder_name){
							asyncCallback(undefined, null);
							return;
						}

						getFileOrFolder(v, path, function(res){
							asyncCallback(undefined, res);
						});
					}, function(err, res){
						if(err){
							callback([]);
							return;
						}

						callback(res.filter(function(v){
							return v !== null;
						}));
					});
					break;

				case ACCESSIBILITY_NEGATIVE_PARTIALLY:
					libAsync.map(files, function(v, asyncCallback){
						if(v === config.folder_name){
							asyncCallback(undefined, null);
							return;
						}

						getFileOrFolder(v, path, function(res){
							asyncCallback(undefined, res);
						});
					}, function(err, res){
						if(err){
							callback([]);
							return;
						}

						libFs.readFile(config.exclusion_name, config.read_config, function(err, data){
							if(err){
								callback([]);
								return;
							}

							var exclusions = data.split(/\r|\n/).filter(function(v){
								return v !== '';
							});

							if(config.wildcard_auto_sep) exclusions = exclusions.map(function(v){
								if(path.sep === "\\") return v.replace("/", "\\");

								return v.replace("\\", "/");
							});

							var manymatch = new libManymatch(exclusions);

							libAsync.filter(res, function(fileObj, filterCallback){
								if(fileObj === null){
									filterCallback(false);
									return;
								}

								filterCallback(!manymatch.match(fileObj.getPath().substr(1)));
							}, function(res){
								callback(res);
							});
						});
					});
					break;

				default: callback([]);
					break;
			}
		});
	},

	isFile: function(){
		return false;
	}
};

function FileList(name, files, index){
	this.name = name;
	this.files = files;
	this.index = index;
}

FileList.prototype = {
	getName: function(){
		return this.name;
	},

	getFiles: function(){
		return this.files;
	},

	getIndex: function(){
		return this.index;
	},

	isFile: function(){
		return false;
	},

	isList: function(){
		return true;
	}
};

function getFolder(directory, callback, conf){
	if(conf !== undefined){
		if(typeof conf === 'string') conf = JSON.parse(conf);

		callback(getTypedFolder(new Folder(directory, conf)));
		return;
	}

	libFs.readFile(libPath.join(directory, config.folder_name), config.read_config, function(err, data){
		var folder;
		if(err){
			folder = new Folder(directory, config.default_config);
		}else{
			folder = new Folder(directory, JSON.parse(data));
		}

		callback(getTypedFolder(folder));
	});
}

function getTypedFolder(folder){
	if(plugins.hasOwnProperty(folder.getFolderType())){
		return new (plugins[folder.getFolderType()])(folder);
	}

	default: return folder;
}

function getFile(fileName, path, callback){
	path = libPath.join(path, fileName);

	var defaultFileConfig = {
		download: path
	};

	if(libPath.extname(fileName) !== config.file_ext){
		callback(new File(fileName, defaultFileConfig));
		return;
	}

	libFs.readFile(path, config.read_config, function(err, data){
		if(err){
			callback(new File(fileName, defaultFileConfig));
			return;
		}
		try {
			callback(new File(fileName, JSON.parse(data)));
		}catch(e){
			callback(new File(fileName, defaultFileConfig));
		}
	});
}

function getFileOrFolder(fileName, path, callback){
	var fpath = libPath.join(path, fileName);

	libFs.stat(fpath, function(err, stats){
		if(err){
			callback(null);
		}

		if(stats.isDirectory()){
			getFolder(refineFolderPath(fpath), callback);
			return;
		}

		getFile(fileName, path, callback);
	});
}

function refineFolderPath(path){
	if(libPath.sep === "\\"){
		path = path.replace("/", "\\");
	}else{
		path = path.replace("\\", "/");
	}

	if(path.charAt(path.length - 1) !== libPath.sep){
		path += libPath.sep;
	}

	path = path.replace("." + libPath.sep, "").replace(".." + libPath.sep, "");

	if(path.charAt(0) === libPath.sep){
		path = "." + path;
	}else{
		path = "." + libPath.sep + path;
	}

	return path;
}

function getFolderPath(url){
	return refineFolderPath(libPath.join(config.main_directory, url.split("?").splice(0, 1)[0]));
}

function getFolderName(path){
	var folders = getPathList(path);

	return folders[folders.length - 1];
}

function getPathList(path, sep){
	if(sep === undefined) sep = libPath.sep;
	var pathList = [];

	if(sep === true){
		pathList =  path.split("\\").join("/").split("/");
	}else{
		pathList = path.split(sep);
	}


	return pathList.filter(function(v){
		return ((v !== '') && (v !== '.') && (v !== '..'));
	});
}

function removeHomeDir(path){
	var split;

	if(typeof path === "string") split = getPathList(path, true);
	else split = path;

	var homeSplit = getPathList(config.main_directory, true);

	var index = 0;

	return split.filter(function(v){
		if(index === -1) return true;

		if(v === homeSplit[index]){
			index++;
			return false;
		}else{
			index = -1;
			return true;
		}
	});
}

module.exports = {
	getList: function(req, callback){
		req.originalUrl = decodeURI(req.originalUrl);
		var folderPath = getFolderPath(req.originalUrl);
		try{
			libFs.statSync(folderPath);
		}catch(err){
			callback(404);
			return;
		}

		getFolder(folderPath, function(folder){
			if(!folder){
				callback(404);
				return;
			}

			if(folder.getAccessibility() === ACCESSIBILITY_NO){
				callback(403);
				return;
			}

			folder.listFiles(function(returnValue){
				folder.getIndex(function(index){
					callback({
						name: folder.getName(),
						path: removeHomeDir(getPathList(folder.getPath())),
						list: returnValue,
						index: index
					});
				});
			});
		});
	},

	Folder: Folder,
	File: File,
	FileList: FileList
};
