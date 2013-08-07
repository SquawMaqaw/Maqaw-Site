
/**
 * Module dependencies
 */

var express = require('express');
var passport = require('passport');
var env = process.env.NODE_ENV || 'development';
var config = require('./config/config')[env];
var mongoose = require('mongoose');
var fs = require('fs');

require('express-namespace');

mongoose.connect(config.db);

// Bootstrap models
fs.readdirSync(__dirname + '/app/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/app/models/' + file)
})

// Bootstrap passport config
require('./config/passport')(passport, config)

var app = express();

//
// serving minified javascript files //
//
app.use('/cdn', express.static(__dirname + '/public/cdn'));

// Bootstrap application settings
require('./config/express')(app, config, passport);

// Bootstrap routes
require('./config/routes')(app, passport);

// Utility functions
require('./app/util');

// Start the app by listening on <port>
var port = process.env.PORT || 3001

// Start Websockets and Express app
//app.listen(port)
var io = require('socket.io').listen(app.listen(port));

console.log('Express app started on port '+port)

// Websockets
var ws = require('./app/ws');
ws.initWS(io);

// Expose app
module.exports = app
