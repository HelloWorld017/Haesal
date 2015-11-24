var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('*', function(req, res){
	console.log(req.path);
	if(req.query.hasOwnProperty("json") && req.query.json === "true"){
		res.send(getFiles(req.path));
		return;
	}

	res.render('index', {title: 'Express'});
});

function getFiles(directory){

}

module.exports = router;
