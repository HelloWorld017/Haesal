var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('*', function(req, res){
	var folderPath = getFolderPath(req.originalUrl);
	var folder = null;

	if(req.query.hasOwnProperty("list") && req.query.list === "true"){
		folder = getCustomFileList(req.query.handler, req.query.uid, req.query.meta, req.query.name);
	}else{
		folder = getFolder(folderPath);
	}

	if(!folder){
		res.render('404');
		return;
	}

	var listFiles = folder.listFiles();
	var folderName = folder.getName();

	if(req.query.hasOwnProperty("json") && req.query.json === "true"){
		res.send(JSON.stringify({
			name: folderName,
			list: listFiles
		}));
		return;
	}

	res.render('index', {folderName: folderName, files: listFiles});
});


const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;

const FOLDER_INFO = "folder.hsfin";
const FILE_INFO_EXTENSION = ".hsinf";

const GITHUB_HANDLER_NAME = "github";
const GITHUB_CLIENT_ID = "xxxx";
const GITHUB_CLIENT_SECRET = "yyyy";
const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_URL_BASE = "https://github.com/";

const CUSTOM_HANDLER_NAME = "custom";

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

	getIndex: function(){
		if(!this.config["index"]) return;

		var fs = undefined;
		var index = null;

		switch(this.config["index-type"]){
			case "markdown":
				var marked = require('marked');
				fs = require('fs');

				fs.readFile(this.config["index"], readConfig, function(err, data){
					if(err) return;

					index = marked(data);
				});
				break;

			case "html":
				fs = require('fs');

				fs.readFile(this.config["index"], readConfig, function(err, data){
					if(err) return;

					index = data;
				});
				break;
		}

		return index;
	},

	getFolderType: function(){
		return this.config["type"];
	},

	listFiles: function(fileSystem){
		var files = [];
		var fileObjects = [];
		var path = this.getPath();

		fileSystem.readdir(this.getPath(), function(err, fileList){
			if(err) return;
			files = fileList;
		});

		switch(this.getAccessibility()){
			case ACCESSIBILITY_NO: return [];

			case ACCESSIBILITY_PARTIALLY:
				files.forEach(function(v){
					if(fileSystem.statSync(v).isDirectory()) fileObjects.push(getFolder(refineFolderPath(v)));
					if(v.endsWith(FILE_INFO_EXTENSION)) fileObjects.push(getFile(path, v, fileSystem));
				});

				return fileObjects.filter(function(v){
					return v !== null;
				});

			case ACCESSIBILITY_YES:
				return files.map(function(v){
					return getFileOrFolder(path, v, fileSystem);
				});

			default: return [];
		}
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

this.prototype.getIndex = function(){
	var request = require('request');
	var cheerio = require('cheerio');
	var index = null;

	if(this.config["index-type"] !== GITHUB_HANDLER_NAME){
		return this._parent.getIndex();
	}

	request(this.location + "/blob/master/README.md", function(err, response, body){
		if(err) return;
		if(response !== 200) return;

		var $ = cheerio.load(body);
		var readme = $('#readme');
		if(readme) index = readme.html();
	});

	return index;
};

this.prototype.getLocation = function(){
	return this.location;
};

this.prototype.listFiles = function(){
	if(this.getAccessibility() === ACCESSIBILITY_NO) return;
	var request = require('request');
	var json = null;
	request({
		url: GITHUB_API_BASE + this.author + "/" + this.project + "/releases?client_id=" + GITHUB_CLIENT_ID + "&client_secret=" + GITHUB_CLIENT_SECRET,
		headers: {
			'User-Agent': 'Haesal'
		}
	}, function(err, response, body){
		if(err) return;
		if(response !== 200) return;

		JSON.parse(body).forEach(function(v){
			json = v;
		});

	});

	if(!json) return [];

	/*return new CustomFileList(GITHUB_HANDLER_NAME, json["tag_name"],
		JSON.stringify({
			assets: json["assets_url"],
			index: json["body"]
		}), json["name"]);*/

	var marked = require('marked');
	var index = marked(json["body"]);
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

	return new FileList(
		json["name"],
		files,
		index
	)
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

/*function CustomFileList(handlerName, uniqueId, meta, name){
	this.handlerName = handlerName;
	this.listName = name;
	this.meta = meta;
	this.uniqueId = uniqueId;
}

CustomFileList.prototoype = {
	getName: function(){
		return this.listName;
	},

	getHandlerName: function(){
		return this.handlerName;
	},

	getID: function(){
		return this.uniqueId;
	},

	getMeta: function(){
		return this.meta;
	}
};

/*function CustomFolder(path, customFolderName, files, index){
	this.path = path;
	this.name = customFolderName;
	this.files = files;
	this.index = index;
	this._parent = new Folder(path, config);
	this.prototype = this._parent.prototype;
}

CustomFolder.prototype.listFiles = function(){
	return this.files;
};

CustomFolder.prototype.getIndex = function(){
	return this.index;
};

CustomFolder.prototype.getAccessibility = function(){
	return true;
};

CustomFolder.prototype.getFolderType = function(){
	return CUSTOM_HANDLER_NAME;
};*/

function getFolder(directory){
	var fileSystem = require('fs');
	var conf = defaultConfig;

	fileSystem.readFile(FOLDER_INFO, readConfig, function(err, data){
		if(err) return;

		conf = JSON.parse(data);
	});

	var folder = new Folder(directory, conf);

	switch(folder.getFolderType()){
		case GITHUB_HANDLER_NAME: return new GithubFolder(folder);
		default: return folder;
	}
}

function getFile(fileName, path, fs){
	path += fileName;

	var conf = {
		download: path
	};

	fs.readFile(path, readConfig, function(err, data){
		if(err) return;
		conf = JSON.parse(data);
	});

	return new File(fileName, fs);
}

function getFileOrFolder(fileName, path, fs){
	path += fileName;

	if(fs.statSync(path).isDirectory()){
		return getFolder(refineFolderPath(path));
	}

	return getFile(fileName, path, fs);
}

function refineFolderPath(path){
	path = path.replace("\\", "/");

	if(path.charAt(path.length - 1) !== "/"){
		return path + "/";
	}

	return path;
}

function getFolderPath(url){
	return refineFolderPath('.' + url.split("?").splice(0, 1));
}

function getFolderName(path){
	var folders = path.split("/");
	return folders[folders.length - 1];
}

/*function getCustomFileList(path, handler, uid, meta, name){
	switch(handler){
		case GITHUB_HANDLER_NAME:
			var files = [];
			var json = null;
			meta = JSON.parse(meta);

			var request = require('request');
			request({
				url: meta["assets"] + "?client_id=" + GITHUB_CLIENT_ID + "&client_secret=" + GITHUB_CLIENT_SECRET,
				headers: {
					'User-Agent': 'Haesal'
				}
			}, function(err, response, body){
				if(err) return;
				if(response !== 200) return;
				json = JSON.parse(body);
			});

			if(!json) return null;

			json.forEach(function(v){
				files.push(
					new File(path + v["name"], {
						download: v["browser_download_url"]
					})
				);
			});

			var folder = new CustomFolder(path, name, files, meta["index"]);
	}
}*/

module.exports = router;
