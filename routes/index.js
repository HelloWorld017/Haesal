var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('*', function(req, res){
	var folderName = "";
	console.log(getFolderName(req.originalUrl));
	if(req.query.hasOwnProperty("json") && req.query.json === "true"){
		res.send(getFolder(req.path).listFiles);
		return;
	}

	res.render('index', {folderName: folderName});
});


const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;

const FOLDER_INFO = "folder.hsfin";
const FILE_INFO_EXTENSION = ".hsinf";

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

function File(path, config){
	this.path = path;
	this.config = config;
}

File.prototype = {
	getPath: function() {
		return this.path;
	},

	getDownloadURL: function(){
		return this.config["download"];
	}
};

function Folder(path, config){
	this.path = path;
	this.config = config;
}

Folder.prototype = {
	getPath: function(){
		return this.path;
	},

	getAccessibility: function(){
		return this.config["accessibility"];
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

		fileSystem.readdir(this.getPath(), function(err, fileList){
			if(err) return;
			files = fileList;
		});

		switch(this.getAccessibility()){
			case ACCESSIBILITY_NO: return [];

			case ACCESSIBILITY_PARTIALLY:
				files.forEach(function(v){
					if(v.endsWith(FILE_INFO_EXTENSION)) fileObjects.push(getFile(v, fileSystem));
				});

				return fileObjects.filter(function(v){
					return v !== null;
				});

			case ACCESSIBILITY_YES:
				return files.map(function(v){
					return getFile(v, fileSystem);
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

	if(this.config["index-type"] !== "github"){
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
	request({
		url: GITHUB_URL_BASE + this.author + "/" + this.project + "/releases?client_id=" + GITHUB_CLIENT_ID + "&client_secret=" + GITHUB_CLIENT_SECRET,
		headers: {
			'User-Agent': 'Haesal'
		}
	}, function(err, response, body){
		if(err) return;
		if(response !== 200) return;

		JSON.parse(body).forEach(function(v){
			//TODO implement github release request
		});

	});
};

function getFolder(directory){

	var fileSystem = require('fs');
	var conf = defaultConfig;

	fileSystem.readFile(FOLDER_INFO, readConfig, function(err, data){
		if(err) return;

		//conf = cherryPick(JSON.parse(data), defaultConfig);
		conf = JSON.parse(data);
	});

	var folder = new Folder(directory, conf);

	switch(folder.getFolderType()){
		case "github": return new GithubFolder(folder);
		default: return folder;
	}
}

function getFile(file, fs){

}

function getFolderName(url){
	return '.' + url.split("?").splice(0, 1);
}

/*function cherryPick(array1, array2){
	array2.forEach(function f(v, k){
		if(!array1.hasOwnProperty(k)){
			array1[k] = v;
		}
	});

	return array1;
}*/

module.exports = router;
