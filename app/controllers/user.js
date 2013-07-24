
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

/*
exports.login = passport.authenticate('local', {
    successRedirect: '/users/account',
    failureRedirect: '/users/register',
    failureFlash: 'Incorrect email or password'
  });
*/
exports.login = function(req, res, next) {
  console.log(req.headers.accept);
  passport.authenticate('local', function(err, user, info) {
    res.header('Access-Control-Allow-Origin', '*');
    if (err) return next(err);
    if (!user) {
      console.log("Cannot find user");
      res.writeHead(401, { 'Content-type': 'application/json' });
      return res.json({ error: 'Email or password was incorrect' });
    }
    console.log("Going to login the user");
    req.logIn(user, function(err) {
      console.log("inside of the login func");
      if (err) return next(err);
      //res.writeHead(200, { 'Content-type': 'application/json' });
      return res.json({ success: 'You successfully logged in' });
    });
  })(req, res, next);
};

exports.index = function(req, res, next) {
  res.render('account/index', { key: 'sup' });
};
