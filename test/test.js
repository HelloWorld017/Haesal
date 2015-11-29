var request = require('supertest')
	,app = require('../app');

describe('JSON test', function() {
	var server;

	before(function() {
		server = app.listen(3000);
	});

	after(function() {
		server.close();
	});

	describe('Testing Github', function() {
		it('Checking JSON Value', function() {
			request(app)
				.get('/Github/')
				.expect(200)
				.end(function(err){
					if (err) return done(err);
					done();
				});
		});
	});
});
