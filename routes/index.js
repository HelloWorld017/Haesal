var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('*', function(req, res){
	var folderName = "";
	console.log(getFolderName(req.originalUrl));
	if(req.query.hasOwnProperty("json") && req.query.json === "true"){
		res.send(getFiles(req.path));
		return;
	}

	res.render('index', {folderName: folderName});
});


const ACCESSIBILITY_NO = 0;
const ACCESSIBILITY_PARTIALLY = 1;
const ACCESSIBILITY_YES = 2;

const FOLDER_INFO = "folder.hsfin";

var defaultConfig = {
	accessibility: ACCESSIBILITY_NO,
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

	isAccessible: function(){
		return this._config["accessibility"];
	}
};

function Folder(path, config){
	this.path = path;
	this._config = config;
}

Folder.prototype = {
	getPath: function(){
		return this.path;
	},

	isAccessible: function(){
		return this._config["accessibility"];
	},

	getIndex: function(){
		if(!this._config["index"]) return;

		var fs = undefined;
		var index = null;

		switch(this._config["index-type"]){
			case "markdown":
				var marked = require('marked');
				fs = require('fs');

				fs.readFile(this._config["index"], readConfig, function(err, data){
					if(err) return;

					index = marked(data);
				});
				break;

			case "html":
				fs = require('fs');

				fs.readFile(this._config["index"], readConfig, function(err, data){
					if(err) return;

					index = data;
				});
				break;
		}

		return index;
	},

	getFolderType: function(){
		return this._config["type"];
	}
};

function GithubFolder(path, location, config){
	this.path = path;
	this.location = location;
	this._config = config;
	this._parent = new Folder(path, config);
	this.prototype = this._parent.prototype;
}

this.prototype.getIndex = function(){
	var request = require('request');
	var cheerio = require('cheerio');
	var index = null;

	if(this._config["index-type"] !== "github"){
		return this._parent.getIndex();
	}

	request(this.location, function(err, response, body){
		if(err) return;
		if(response !== 200) return;

		var $ = cheerio.load(body);
		var readme = $('#readme');
		if(readme) index = readme.html();
	});

	return index;
};

this.prototype.getHomepage = function(){
	return this.location;
};

function getFiles(directory){
	var fileSystem = require('fs');
	var fileList = [];

	var conf = defaultConfig;

	fileSystem.readFile("folder.hsfin", readConfig, function(err, data){
		if(err) return;

		conf = cherryPick(JSON.parse(data), defaultConfig);
	});

	var folder = new Folder(directory, conf);

	if(!folder.isAccessible()) return;

	fileSystem.readdir(directory, function(err, files){
		files.forEach(function(v){
			if(v.endsWith(".hsinf")) fileList.push(getFile(v, fileSystem));
		});
	});
}

function getFile(file, fs){

}

function getFolderName(url){
	return '.' + url.split("?").splice(0, 1);
}

function cherryPick(array1, array2){
	array2.forEach(function f(v, k){
		if(!array1.hasOwnProperty(k)){
			array1[k] = v;
		}
	});

	return array1;
}

module.exports = router;
