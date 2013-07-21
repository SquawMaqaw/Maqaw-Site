
/*!
 * Module dependencies.
 */

var mongoose = require('mongoose'),
    passport = require('passport'),
    User = mongoose.model('User');

exports.register = function (req, res) {
  var email = req.body.email,
      password = req.body.password;

  var user = new User({ email: email });
  var hashed_password = User.hash(password);
  user.hashed_password = hashed_password;

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

exports.index = function(req, res, next) {
  console.log(req.user);
  res.render('account/index', { key: 'sup' });
}
