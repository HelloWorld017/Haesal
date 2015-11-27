var libExpress = require('express');
var libAsync = require('async');
var libMarked = require('marked');
var libRequest = require('request');
var libCheerio = require('cheerio');
var libFs = require('fs');
var libPath = require('path');

var router = libExpress.Router();

/* GET home page. */

router.get('*', function(req, res){
	var folderPath = getFolderPath(req.originalUrl);

	getFolder(folderPath, function(folder){
		if(!folder){
			console.log("render404");
			res.render('404');
			return;
		}

		folder.listFiles(function(returnValue){
			var data = {
				name: folder.getName(),
				list: returnValue
			};

			if(req.query.hasOwnProperty("json") && req.query.json === "true"){
				console.log("json");
				res.json(data);
				return;
			}

			console.log("index");
			res.render('index', data);
		});
	});
});


const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;

const FOLDER_INFO = "folder.hsfin";
const FILE_INFO_EXTENSION = ".hsinf";
const MAIN_DIRECTORY = "./public/";

const GITHUB_HANDLER_NAME = "github";
const GITHUB_CLIENT_ID = "xxxx";
const GITHUB_CLIENT_SECRET = "yyyy";
const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_URL_BASE = "https://github.com/";

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
		return this.config["download"];
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
					libAsync.each(function(v, asyncCallback){
						libFs.stat(v, function(err, stat){
							if(stat.isDirectory() || libPath.extname(v) === FILE_INFO_EXTENSION){
								getFileOrFolder(v, path, function(file){
									fileObjects.push(file);
									asyncCallback();
								});
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

				default: callback([]);
					break;
			}
		});
	}
};

function GithubFolder(folder){
	this.path = folder.path;
	this.config = folder.config;
	this.project = this.config["github-project"];
	this.author = this.config["github-author"];
	this.location = GITHUB_URL_BASE + this.author + "/" + this.project;
	this._parent = folder;
	this.prototype = this._parent.prototype;
}

GithubFolder.prototype.getIndex = function(callback){
	var index = null;

	if(this.config["index-type"] !== GITHUB_HANDLER_NAME){
		return this._parent.getIndex(callback);
	}

	libRequest(this.location + "/blob/master/README.md", function(err, response, body){
		if(err || (response !== 200)){
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
	var files = [];
	libRequest({
		url: GITHUB_API_BASE + this.author + "/" + this.project + "/releases?client_id=" + GITHUB_CLIENT_ID + "&client_secret=" + GITHUB_CLIENT_SECRET,
		headers: {
			'User-Agent': 'Haesal'
		}
	}, function(err, response, body){
		if(err) return;
		if(response !== 200) return;

		JSON.parse(body).forEach(function(json){
			if(!json) return;

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

			files.push(new FileList(
				json["name"],
				files,
				index
			));
		});

		callback(files);
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
	libFs.readFile(FOLDER_INFO, readConfig, function(err, data){
		var folder;
		if(err){
			folder = new Folder(directory, defaultConfig);
		}else{
			folder = new Folder(directory, JSON.parse(data));
		}

		switch(folder.getFolderType()){
			case GITHUB_HANDLER_NAME: callback(new GithubFolder(folder)); break;
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
	return refineFolderPath(libPath.join(MAIN_DIRECTORY, url.split("?").splice(0, 1)[0]));
}

function getFolderName(path){
	var folders = path.split(libPath.sep);
	return folders[folders.length - 1];
}

module.exports = router;
