
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

  app.get('/users/register', function(req, res) {
    res.render('account/register', { title: 'Register for a beta account' });
  });

  app.post('/register', user.register);


  app.get('/users/login', function(req, res) {
    res.render('account/login');
  });

  app.post('/login', user.login);

}
