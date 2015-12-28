var fs = require('fs');
var async = require('async');

function load(callback){
	libFs.readdir(path, function(err, files){
		if(err){
			callback(err);
			return;
		}

		var plugins = {};

		async.each(files, function(v, cb){
			require('./' + v)(function(handler, plugin){
				plugins[handler] = plugin;
				cb();
			});
		}, function(){
			callback(undefined, plugins);
		});
	});
}

module.exports = load;
