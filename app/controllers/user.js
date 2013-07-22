
/*!
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    passport = require('passport'),
    User = mongoose.model('User');

exports.register = function (req, res) {
  var email = req.body.email,
      password = req.body.password,
      passwordConfirmation = req.body.password_confirmation;

  if (password != passwordConfirmation) {
    res.render('account/register', { title: 'Register for a beta account', error: 'Error: Passwords did not match.'})
  }

  var user = new User({ email: email });
  var hashed_password = User.hash(password);
  user.hashed_password = hashed_password;

  user.save(function(err) {
    if (err) {
      res.send(500, "Registration failure");
    }
      res.redirect('/users/account')
  });
};

exports.login = passport.authenticate('local', {
    successRedirect: '/users/account',
    failureRedirect: '/users/register',
    failureFlash: 'Incorrect email or password'
  });

exports.index = function(req, res, next) {
  res.render('account/index', { key: 'sup' });
}
