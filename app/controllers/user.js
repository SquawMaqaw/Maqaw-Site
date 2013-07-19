
/*!
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    passport = require('passport'),
    User = mongoose.model('User');

exports.register = function (req, res) {
  var email = req.body.email,
      password = req.body.password;

  var user = new User({ email: email, hashed_password: password});
  user.save(function(err) {
    if (err) {
      res.send(500, "Registration failure");
    }
      res.send("Registration successful");
  });
};

exports.login = passport.authenticate('local', {
    successRedirect: '/inside',
    failureRedirect: '/',
  });
