var env = process.env.NODE_ENV || 'development';

module.exports = require('object-merge')(require('./config.' + env), require('./config.custom.js'));
