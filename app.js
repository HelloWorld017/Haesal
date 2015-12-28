var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var manyMatch = require('manymatch');

var config = require('./config');
var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');

var router = express.Router();
router.get('*', function(req, res){
	var isJSON = (req.query.hasOwnProperty("json") && req.query.json === "true");
	routes.getList(req, function(data){
		if(typeof data === "number"){
			if(isJSON){
				res.json([]);
				return;
			}

			var errorInfo = getErrorInfo(data);
			errorInfo.config = config;

			res.statusCode = data;
			res.render('error', errorInfo);
			return;
		}

		if(isJSON){
			res.json(data);
			return;
		}

		data.config = config;
		res.render('index', data);
	});
});

app.use(/.*\/$/, router);

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

if(config.block.block_unreachable_files){
	//No use for auto sep because web access url is always /

	var mm = new manyMatch(config.block.whitelist);

	app.use(function(req, res, next){
		var url = req.originalUrl;

		if(mm.match(req.originalUrl)){
			next();
			return;
		}

		req.originalUrl = req.originalUrl.split('/').filter(function(v, index, array){
			return (index !== (array.length - 1));
		}).join('/');

		routes.getList(req, function(data){
			var isJSON = (req.query.hasOwnProperty("json") && req.query.json === "true");

			if(typeof data === "number"){
				if(isJSON){
					res.json([]);
					return;
				}

				var errorInfo = getErrorInfo(data);
				errorInfo.config = config;

				res.statusCode = data;
				res.render(error, errorInfo);
				return;
			}

			req.originalUrl = url;
			var isValid = false;

			data.list.forEach(function(v){
				if(v.isFile()){
					if(v.getDownloadURL() === req.originalUrl) isValid = true;
				}
			});

			if(isValid){
				next();
				return;
			}

			var code = 404;

			if(config.block.ignore)code = 404;
			else code = 403;

			res.statusCode = code;

			if(isJSON){
				res.json([]);
			}

			var errorData = getErrorInfo(code);
			errorData.config = config;

			res.render('error', errorData);
		});
	});
}

app.use(express.static(path.join(__dirname, config.main_directory)));
if(config.main_directory !== config.resources_directory) app.use(express.static(path.join(__dirname, config.resources_directory)));

// catch 404 and forward to error handler
app.use(function(req, res, next){
	var err = new Error();
	err.status = 404;
	next(err);
});

app.use(function(err, req, res, next) {
	err.status = err.status || 500;

	var errorData = getErrorInfo(err.status);
	errorData.config = config;

	if(err.status === 500 && err.message) errorData.description = err.message;

	res.statusCode = err.status;
	res.render('error', errorData);
});

function getErrorInfo(errorno){
	var description = "No description given.";
	var masthead = "No masthead given.";

	if(config.errors.hasOwnProperty(errorno + "-masthead")) masthead = config.errors[errorno + "-masthead"];
	if(config.errors.hasOwnProperty(errorno + "-description")) description = config.errors[errorno + "-description"];

	return {
		errorno: errorno,
		masthead: masthead,
		description: description
	};
}

module.exports = app;
