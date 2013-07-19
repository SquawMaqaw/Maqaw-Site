
/*!
 * Module dependencies.
 */
exports.index = function (req, res) {
  res.render('home');
};

exports.inside = function(req, res) {
  if (!req.user) return res.send(401, "Not allowed in");
  
  res.send('You win ' + req.user.email);
};
