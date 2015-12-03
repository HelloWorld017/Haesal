var libAsync = require('async');
var libCheerio = require('cheerio');
var libFs = require('fs');
var libMarked = require('marked');
var libManymatch = require('manymatch');
var libPath = require('path');
var libRequest = require('request');

var config = require('../config');

module.exports = function(req, callback){
	var folderPath = getFolderPath(req.originalUrl);

	getFolder(folderPath, function(folder){
		if(!folder){
			callback(404);
			//res.statusCode = 404;
			//res.render('404');
			return;
		}

		if(folder.getAccessibility() === ACCESSIBILITY_NO){
			/*res.statusCode = 403;
			if(isJSON){
				res.json([]);
				return;
			}
			res.render('403');*/
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

				/*if(isJSON){
					res.json(data);
					return;
				}

				res.render('index', data);*/
			});
		});
	});
};

const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;
const ACCESSIBILITY_NEGATIVE_PARTIALLY = 3;

const FILE_TYPE_LOCAL = 0;
const FILE_TYPE_REMOTE = 1;

const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_URL_BASE = "https://github.com/";

const GITHUB_HANDLER_NAME = "github";
const LIST_HANDLER_NAME = "list";

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
			case "markdown":
				libFs.readFile(this.config["index"], config.read_config, function(err, data){
					if(err){
						callback(null);
						return;
					}

					callback(libMarked(data));
				});
				break;

			case "html":
				libFs.readFile(this.config["index"], config.read_config, function(err, data){
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
		var fileObjects = [];
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
					libAsync.each(files, function(v, asyncCallback){
						libFs.stat(libPath.join(path, v), function(err, stat){
							if(err){
								asyncCallback();
							}

							if(stat.isDirectory()){
								getFile(v, path, function(folder){
									fileObjects.push(folder);
									asyncCallback();
								});
							}else if(libPath.extname(v) === config.file_ext){
								libFs.readFile(libPath.join(path, v), config.read_config, function(err, data){
									if(err){
										asyncCallback();
										return;
									}
									var json = JSON.parse(data);
									//Although it is a file, I used getFolderName because the algorithm is same.
									fileObjects.push((new File(getFolderName(json["download"]), json)));
									asyncCallback();
								});
							}else{
								asyncCallback();
							}
						});
					}, function(err){
						if(err){
							callback([]);
							return;
						}

						callback(fileObjects.filter(function(v){
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

function GithubFolder(folder){
	this.path = folder.path;
	this.config = folder.config;
	this.project = this.config["github-project"];
	this.author = this.config["github-author"];
	this.name = this.project;
	this.location = GITHUB_URL_BASE + this.author + "/" + this.project;
	this.__parent = folder;
}

GithubFolder.prototype = Object.create(Folder.prototype);

GithubFolder.prototype.getIndex = function(callback){
	var index = null;

	if(this.config["index-type"] !== GITHUB_HANDLER_NAME){
		return this.__parent.getIndex(callback);
	}

	libRequest(this.location + "/blob/master/README.md", function(err, response, body){
		if(err || (response.statusCode !== 200)){
			callback(null);
			return;
		}

		var $ = libCheerio.load(body);
		var readme = $('#readme');
		if(readme){
			callback(readme.html());
			return;
		}

		callback(null);
	});
};

GithubFolder.prototype.getLocation = function(){
	return this.location;
};

GithubFolder.prototype.listFiles = function(callback){
	if(this.getAccessibility() === ACCESSIBILITY_NO) return;

	var url = GITHUB_API_BASE + this.author + "/" + this.project + "/releases";
	if(config.github.use_api_key) url += "?client_id" + config.github.client_id + "&client_secret" + config.github.client_secret;

	libRequest({
		url: url,
		headers: {
			'User-Agent': 'Haesal'
		}
	}, function(err, response, body){
		if(err || response.statusCode !== 200){
			callback([]);
			return;
		}

		var lists = [];

		libAsync.each(JSON.parse(body), function(json, asyncCallback){
			if(!json){
				asyncCallback();
				return;
			}

			var index = libMarked(json["body"]);
			var files = [];

			json["assets"].forEach(function(v){
				files.push(new File(v["name"], {
					download: v["browser_download_url"],
					type: FILE_TYPE_REMOTE
				}));
			});

			files.push(new File(json["name"] + ".zip", {
				download: json["zipball_url"],
				type: FILE_TYPE_REMOTE
			}));

			files.push(new File(json["name"] + ".tar.gz", {
				download: json["tarball_url"],
				type: FILE_TYPE_REMOTE
			}));

			lists.push(new FileList(
				json["name"],
				files,
				index
			));

			asyncCallback();

		}, function(err){
			if(err){
				callback([]);
				return;
			}

			callback(lists);
		});
	});
};

function ListFolder(folder){
	this.path = folder.path;
	this.config = folder.config;
	this.name = folder.name;
	this.__parent = folder;
}

ListFolder.prototype = Object.create(Folder.prototype);

ListFolder.prototype.listFiles = function(callback){
	this.__parent.listFiles(function(v){
		libAsync.map(v, function(fileOrFolder, asyncCallback){
			if(!fileOrFolder.isFile()){
				fileOrFolder.listFiles(function(list){
					fileOrFolder.getIndex(function(index){
						asyncCallback(undefined, new FileList(fileOrFolder.getName(), list, index));
					});
				});

				return;
			}

			asyncCallback(undefined, fileOrFolder);
		}, function(err, res){
			callback(res);
		});
	});
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

function getFolder(directory, callback){
	libFs.readFile(libPath.join(directory, config.folder_name), config.read_config, function(err, data){
		var folder;
		if(err){
			folder = new Folder(directory, config.default_config);
		}else{
			folder = new Folder(directory, JSON.parse(data));
		}

		switch(folder.getFolderType()){
			case GITHUB_HANDLER_NAME: callback(new GithubFolder(folder)); break;
			case LIST_HANDLER_NAME: callback(new ListFolder(folder)); break;
			default: callback(folder);
		}
	});
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
