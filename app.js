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
	routes(req, function(data){
		if(typeof data === "number"){
			if(isJSON){
				res.json([]);
				return;
			}
			res.statusCode = data;
			res.render(data.toString(10));
			return;
		}

		if(isJSON){
			res.json(data);
			return;
		}
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

if(config.block.block_unreachable_files) app.use(function(req, res, next){
	var url = req.originalUrl;

	var mm = new manyMatch(config.block.whitelist);
	if(mm.match(req.originalUrl)){
		next();
		return;
	}

	req.originalUrl = req.originalUrl.split('/').filter(function(v, index, array){
		return (index !== (array.length - 1));
	}).join('/');

	routes(req, function(data){
		req.originalUrl = url;
		var isValid = false;

		data.list.forEach(function(v){
			if(v.isFile()){
				if(v.getDownloadURL() === req.originalUrl){
					isValid = true;
				}
			}
		});

		if(isValid){
			next();
			return;
		}

		res.statusCode = 404;
		res.render('404');
	});
});

//app.use(express.static(path.join(__dirname, 'public')));
//if((process.env.NODE_ENV || 'development') === 'development') app.use(express.static(path.join(__dirname, 'test')));
app.use(express.static(path.join(__dirname, config.main_directory)));
if(config.main_directory !== config.resources_directory) app.use(express.static(path.join(__dirname, config.resources_directory)));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
			res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;
