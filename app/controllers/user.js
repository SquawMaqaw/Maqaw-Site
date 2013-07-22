
/*!
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    passport = require('passport'),
    User = mongoose.model('User');

exports.register = function (req, res) {
  var company = req.body.company, 
      email = req.body.email,
      password = req.body.password,
      passwordConfirmation = req.body.password_confirmation;

  if (!company) {
    return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Enter in a company name' });
  }

  if (!email) {
    return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Enter your email address' });
  }

  if (password != passwordConfirmation) {
    return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Passwords did not match.' });
  }

  var user = new User({ email: email, company: company });
  var hashed_password = User.hash(password);
  user.hashed_password = hashed_password;

  user.save(function(err) {
    if (err) {
      return res.send(500, "Registration failure");
    }
      return res.redirect('/users/account')
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
