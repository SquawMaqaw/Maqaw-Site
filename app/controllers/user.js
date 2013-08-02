
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
    return res.json(400, { error: 'Enter your company\'s name' });
    //return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Enter in a company name' });
  }

  if (!email) {
    return res.json(400, { error: 'Enter your email address' });
    //return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Enter your email address' });
  }

  if (password != passwordConfirmation) {
    return res.json(400, { error: 'The password and the password confirmation did not match'});
    //return res.render('account/register', { title: 'Register for a beta account', error: 'Error: Passwords did not match.' });
  }

  var user = new User({ email: email, company: company });
  user.hashed_password = User.hash(password);

  user.save(function(err) {
    if (err) {
      res.format({
        'application/json': function() {
          return res.send(400, { error: 'Registration failure' });
        },
        default: function() {
          return res.redirect('/users/register');
        }
      });
      //return res.send(500, "Registration failure");
    }
      res.format({
        'application/json': function() {
          return res.send(200, { success: 'Registration successful', key: user._id, name: user.company });
        },
        default: function() {
          return res.redirect('/users/account');
        }
      });
      //return res.redirect('/users/account')
  });
};

exports.login = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    res.header('Access-Control-Allow-Origin', '*');
    console.log("inside of the login function");

    var id = req.body.user ? req.body.user.id : "undefined";
    var key = req.body.user ? req.body.user.key : "undefined";

    if (err) return next(err);
    if (!user) {
      /*
      res.writeHead(401, { 'Content-type': 'application/json' });
      return res.json({ error: 'Email or password was incorrect' });
      */
      res.format({
        'application/json': function() {
          return res.send(400, { error: 'Email or password was incorrect' });
        },
        default: function() {
          return res.redirect('/users/login');
        }
      });
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      res.format({
        'application/json': function() {
          return res.send(200, { success: 'Login successful', key: user._id, name: user.company });
        },
        default: function() {
          return res.redirect('/users/account');
        }
      });
    });
  })(req, res, next);
};

exports.index = function(req, res, next) {
  res.render('account/index', { key: req.user._id, name: req.user.company });
}
