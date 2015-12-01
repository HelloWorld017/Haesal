var request = require('supertest'),
	app = require('../app'),
	should = require('should');

describe('Testing Haesal', function() {
	var server;

	before(function() {
		server = app.listen(3000);
	});

	after(function() {
		server.close();
	});

	describe('Testing Github', function() {
		it('Checking HTTP Status Code', function(done) {
			request(app)
				.get('/Github/')
				.expect(200)
				.end(function(err){
					should.not.exist(err);
					done();
				});
		});

		//Could not test result because of Github releases may differ.
	});

	describe('Testing List', function(){
		it('Checking HTTP Status Code', function(done){
			request(app)
				.get('/List/')
				.expect(200)
				.end(function(err){
					should.not.exist(err);
					done();
				});
		});

		it('Checking JSON Value', function(done){
			request(app)
				.get('/List/?json=true')
				.expect(200)
				.end(function(err){
					should.not.exist(err);
					should.strictEqual(res, JSON.stringify({
						"name":"List",
						"path":["test","List"],
						"list":[
							{
								"name":"List1",
								"files":[
									{
										"name":"foo.hsfin",
										"config":{
											"download":"test\\List\\List1\\foo.hsfin\\foo.hsfin"
										}
									},
									{
										"name":"foo.txt",
										"config":{
											"download":"test\\List\\List1\\foo.txt\\foo.txt"
										}
									}
								]
							},
							{
								"name":"List2",
								"files":[
									{
										"name":"foo.hsfin",
										"config":{
											"download":"test\\List\\List2\\foo.hsfin\\foo.hsfin"
										}
									},
									{
										"name":"foo.txt",
										"config":{
											"download":"test\\List\\List2\\foo.txt\\foo.txt"
										}
									}
								]
							}
						]
					}));
				})
		});
	});

	describe('Testing Local', function(){
		describe('Testing Local with accessibility 0 (No)', function(){
			it('Checking HTTP Status Code', function(done){
				request(app)
					.get('/LocalNo/')
					.expect(403)
					.end(function(err){
						should.not.exist(err);
						done();
					});
			});
		});

		describe('Testing Local with accessibility 1 (Partially)', function(){
			it('Checking HTTP Status Code', function(done){
				request(app)
					.get('/LocalPartially/')
					.expect(200)
					.end(function(err){
						should.not.exist(err);
						done();
					});
			});

			it('Checking JSON Value', function(done){
				request(app)
					.get('/LocalPartially/?json=true')
					.expect(200)
					.end(function(err, res){
						should.not.exist(err);
						should.strictEqual(res, JSON.stringify({
							"name":"LocalPartially",
							"path":["test","LocalPartially"],
							"list":[
								{
									"name":"foo.txt",
									"config":{
										"download":"\\downloads\\Test\\foo.txt"
									}
								}
							]
						}));
					});
			});
		});

		describe('Testing Local with accessibility 2 (Yes)', function(){
			it('Checking HTTP Status Code', function(done){
				request(app)
					.get('/LocalYes/')
					.expect(200)
					.end(function(err){
						should.not.exist(err);
						done();
					});
			});

			it('Checking JSON Value', function(done){
				request(app)
					.get('/LocalYes/?json=true')
					.expect(200)
					.end(function(err, res){
						should.not.exist(err);
						should.strictEqual(res, JSON.stringify({
							"name":"LocalYes",
							"path":["test","LocalYes"],
							"list":[
								{
									"name":"foo.hsfin",
									"config":{
										"download":"test\\LocalYes\\foo.hsfin"
									}
								},
								{
									"name":"foo.txt",
									"config":{
										"download":"test\\LocalYes\\foo.txt"
									}
								}
							]
						}));
						done();
					});
			});
		});

		describe('Testing Local with accessibility 3 (Negative Partially)', function(){
			it('Checking HTTP Status Code', function(done){
				request(app)
					.get('/LocalNPartially/')
					.expect(200)
					.end(function(err, res){
						should.not.exist(err);
						done();
					});
			});

			it('Checking JSON Value', function(done){
				request(app)
					.get('/LocalNPartially/?json=true')
					.expect(200)
					.end(function(err, res){
						should.not.exist(err);
						should.strictEqual(res, JSON.stringify({
							"name":"LocalNPartially",
							"path":["test","LocalNPartially"],
							"list":[
								{
									"name":"bar.txt",
									"config":{
										"download":"test\\LocalNPartially\\bar.txt"
									}
								},
								{
									"name":"index-test.md",
									"config":{
										"download":"test\\LocalNPartially\\index-test.md"
									}
								}
							]
						}));
						done();
					});
			});
		});
	});
});
