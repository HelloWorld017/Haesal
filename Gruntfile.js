/*
* Project-Haesal 0.0.1 by Khinenw
* Copyright 2015-2015 Khinenw
* Licensed under the GPL-3.0 license
*/

module.exports = function(grunt) {

	require('grunt-timer')(grunt, { scope: 'devDependencies' });
	require('load-grunt-tasks')(grunt, { scope: 'devDependencies' });

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		banner: '/*!\n' +
				' * Project-Haesal <%= pkg.version %> by <%= pkg.author %>\n' +
				' * Copyright 2015-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
				' * Licensed under the <%= pkg.license %> license\n' +
				' */\n',
			
		clean: {
			dist: 'dist',
			docs: 'docs/dist'
		},
		
		watch: {
			files: "less/*.less",
			tasks: ["less"]
		},
		less: {
			compileCore: {
				options: {
					strictMath: true,
					sourceMap: true,
					outputSourceFiles: true,
					sourceMapURL: '<%= pkg.name %>.css.map',
					sourceMapFilename: 'public/resources/css/<%= pkg.name %>.css.map'
				},
				
				src: "less/<%= pkg.name %>.less",
				dest: "public/resources/css/<%= pkg.name %>.css"
			}
		},
		
		autoprefixer: {
			options: {
				browsers: [
					'Android >= 4',
					'Chrome >= 20',
					'Firefox >= 24',
					'Explorer >= 9',
					'iOS >= 6',
					'Opera >= 16',
					'Safari >= 6'
				]
			},
			dist: {
				options: {
					map: true
				},
				src: 'public/resources/css/<%= pkg.name %>.css'
			}
		},
		
		csslint: {
			options: {
				csslintrc: 'less/.csslintrc'
			},
			dist: [ 'public/resources/css/<%= pkg.name %>.css']
		},
		
		cssmin: {
			options: {
				compatibility: 'ie9',
				keepSpecialComments: '*',
				advanced: false
			},
			minifyCore: {
				src: 'public/resources/css/<%= pkg.name %>.css',
				dest: 'public/resources/css/<%= pkg.name %>.min.css'
			}
		},

		csscomb: {
			options: {
				config: 'less/.csscomb.json'
			},
			dist: {
				expand: true,
				cwd: 'public/resources/css',
				src: ['*.css', '!*.min.css'],
				dest: 'public/resources/css'
			}
		},
		
		jshint: {
		  files: ['Gruntfile.js', 'src/*.js'],
		  options: {
			globals: {
			  jQuery: true
			}
		  }
		},

		concat: {
			options: {
				banner: '<%= banner %>',
				stripBanners: false
			},
			dist: {
				src: [
					'src/*.js'
				],
				dest: 'public/resources/js/<%= pkg.name %>.js'
			}
		},

		uglify: {
				options: {
				preserveComments: 'some'
			},
			dist: {
				src: '<%= concat.dist.dest %>',
				dest: 'public/resources/js/<%= pkg.name %>.min.js'
			}
		}
	});
	
	grunt.registerTask('default', ['watch']);
	grunt.registerTask('dist-css', ['less', 'autoprefixer', 'csslint', 'csscomb', 'cssmin']);
	grunt.registerTask('dist-js', ['concat', 'uglify']);
	grunt.registerTask('dist', 'dist-css', 'dist-js');
	
};
