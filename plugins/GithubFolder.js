const ACCESSIBILITY_NO = 0;

const FOLDER_TYPE_GITHUB = "github";
const INDEX_TYPE_GITHUB = "github";
const FILE_TYPE_REMOTE = 1;

const GITHUB_API_BASE = "https://api.github.com/repos/";
const GITHUB_URL_BASE = "https://github.com/";

var libAsync = require('async');
var libCheerio = require('cheerio');
var libRequest = require('request');

var config = require('../config');
var index = require('../routes/index.js');

var Folder = index.Folder;
var File = index.File;
var FileList = index.FileList;

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
	var location = this.getLocation();
	var projectName = this.author + "/" + this.project;
	var indexPostfix = "";
	if(config.github.add_link){
		indexPostfix = '<a href="' + location + '" target="_blank"><span class="fa fa-github" style="font-size: 2em"></span></a>'
	}

	var indexPlaceholder = '<h1>' + projectName + '</h1>' + indexPostfix;

	if(this.config["index-type"] !== INDEX_TYPE_GITHUB){
		this.__parent.getIndex(function(v){
			if(config.github.add_link){
				v += indexPostfix;
			}

			callback(v);
		});

		return;
	}

	libRequest(this.location + "/blob/master/README.md", function(err, response, body){
		if(err || (response.statusCode !== 200)){
			callback(indexPlaceholder);
			return;
		}

		var $ = libCheerio.load(body);
		var readme = $('#readme');
		if(readme){
			callback(readme.html() + indexPostfix);
			return;
		}

		callback(indexPlaceholder);
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

module.exports = function(callback){
	callback(FOLDER_TYPE_GITHUB, GithubFolder);
}
