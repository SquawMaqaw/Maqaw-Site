
/*!
 * Module dependencies.
 */
var connectEnsureLogin = require('connect-ensure-login');


exports.index = function (req, res) {
  res.render('home', {
    title: 'Node Express Mongoose Boilerplate'
  })
}

exports.inside = connectEnsureLogin.ensureLoggedIn('/'), function(req, res) {
  console.log(req.user);
  res.send('You win ' + req.user.email);
  /*
  res.render('home/inside', {
    title: 'You are too cool'
  });
  */
}
