
/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    passport = require('passport'),
    passportOptions = {
      failureFlash: 'Invalid email or password.',
      failureRedirect: '/login'
    };

// controllers
var home = require('home'),
    user = require('user');



/**
 * Expose
 */

module.exports = function (app, passport) {

  app.get('/', home.index);

  app.get('/inside', home.inside);

  app.post('/register', user.register);

  app.post('/login', user.login);

}
