
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


// Make sure user's logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/users/login');
}

module.exports = function (app, passport) {

  app.get('/', home.index);

  app.get('/users/register', function(req, res) {
    res.render('account/register', { title: 'Register for a beta account' });
  });

  app.post('/register', user.register);


  app.get('/users/login', function(req, res) {
    res.render('account/login', { title: 'Login to your account', messages: req.flash('info') });
  });

  app.post('/login', user.login);

  app.get('/users/account', user.index);

}
