var env = process.env.NODE_ENV || 'development';

module.exports = cherryPick(require('./config.' + env), require('./config.custom.js'));


function cherryPick(baseArray, overridingArray){
	var finalArray = {};

	Object.keys(baseArray).forEach(function(v){
		finalArray[v] = baseArray[v];
	});

	Object.keys(overridingArray).forEach(function(v){
		finalArray[v] = overridingArray[v];
	});

	return finalArray;
}
