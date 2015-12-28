var libAsync = require('async');
var Folder = require('../routes/index.js').Folder;

const FOLDER_TYPE_LIST = "list";

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

module.exports = function(callback){
	callback(FOLDER_TYPE_LIST, ListFolder);
};
