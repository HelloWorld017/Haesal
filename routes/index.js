var libAsync = require('async');
var libCheerio = require('cheerio');
var libExpress = require('express');
var libFs = require('fs');
var libMarked = require('marked');
var libManymatch = require('manymatch');
var libPath = require('path');
var libRequest = require('request');

var config = require('../config');

var router = libExpress.Router();

router.get('*', function(req, res){
	var folderPath = getFolderPath(req.originalUrl);
	var isJSON = (req.query.hasOwnProperty("json") && req.query.json === "true");

	getFolder(folderPath, function(folder){
		if(!folder){
			res.statusCode = 404;
			res.render('404');
			return;
		}

		if(folder.getAccessibility() === ACCESSIBILITY_NO){
			res.statusCode = 403;
			if(isJSON){
				res.json([]);
				return;
			}
			res.render('403');
			return;
		}

		folder.listFiles(function(returnValue){
			var data = {
				name: folder.getName(),
				path: getPathList(folder.getPath()),
				list: returnValue
			};

			if(isJSON){
				res.json(data);
				return;
			}

			res.render('index', data);
		});
	});
});


const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;
const ACCESSIBILITY_NEGATIVE_PARTIALLY = 3;

const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_URL_BASE = "https://github.com/";

const GITHUB_HANDLER_NAME = "github";
const LIST_HANDLER_NAME = "list";

var defaultConfig = {
	accessibility: ACCESSIBILITY_YES,
	index: false,
	type: "local"
};

var readConfig = {
	encoding: "UTF-8"
};

function File(name, config){
	this.name = name;
	this.config = config;
}

File.prototype = {
	getName: function() {
		return this.name;
	},

	getDownloadURL: function(){
		var download = this.config["download"].replace("\\", "/");
		if(download.charAt(0) === "/") download = download.substr(1);
		return download;
	},

	getPath: function(){
		var download = this.config["download"];

		if(download.charAt(0) === libPath.sep){
			download = "." + download;
		}else{
			download = "." + libPath.sep + download;
		}

		return download;
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

	getIndex: function(callback){
		if(!this.config["index"]) return;

		switch(this.config["index-type"]){
			case "markdown":
				libFs.readFile(this.config["index"], readConfig, function(err, data){
					if(err){
						callback(null);
						return;
					}

					callback(libMarked(data));
				});
				break;

			case "html":
				libFs.readFile(this.config["index"], readConfig, function(err, data){
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
								libFs.readFile(libPath.join(path, v), readConfig, function(err, data){
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

						libFs.readFile(config.exclusion_name, readConfig, function(err, data){
							if(err){
								callback([]);
								return;
							}

							var exclusions = data.split(/\r|\n/).filter(function(v){
								return v !== '';
							});
							var manymatch = new libManymatch(exclusions);

							console.log(exclusions);
							libAsync.filter(res, function(fileObj, filterCallback){
								if(fileObj === null){
									filterCallback(false);
									return;
								}

								console.log(manymatch.match(fileObj.getPath()) + ":" + fileObj.getPath());
								filterCallback(!manymatch.match(fileObj.getPath()));
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
					download: v["browser_download_url"]
				}));
			});

			files.push(new File(json["name"] + ".zip", {
				download: json["zipball_url"]
			}));

			files.push(new File(json["name"] + ".tar.gz", {
				download: json["tarball_url"]
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
					asyncCallback(undefined, new FileList(fileOrFolder.getName(), list, fileOrFolder.getIndex()));
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
	}
};

function getFolder(directory, callback){
	libFs.readFile(libPath.join(directory, config.folder_name), readConfig, function(err, data){
		var folder;
		if(err){
			folder = new Folder(directory, defaultConfig);
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

	libFs.readFile(path, readConfig, function(err, data){
		if(err){
			callback(new File(fileName, {
				download: path
			}));
			return;
		}

		callback(new File(fileName, JSON.parse(data)));
	});
}

function getFileOrFolder(fileName, path, callback){
	path = libPath.join(path, fileName);

	libFs.stat(path, function(err, stats){
		if(err){
			callback(null);
		}

		if(stats.isDirectory()){
			getFolder(refineFolderPath(path), callback);
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

function getPathList(path){
	return path.split(libPath.sep).filter(function(v){
		return ((v !== '') && (v !== '.') && (v !== '..'));
	});
}

module.exports = router;
