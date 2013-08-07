
/*!
 * Module dependencies.
 */

var mongoose = require('mongoose')
var LocalStrategy = require('passport-local').Strategy
var User = mongoose.model('User')

/**
 * Expose
 */

module.exports = function (passport, config) {
  // serialize sessions
  passport.serializeUser(function(user, done) {
    done(null, user._id)
  })

  passport.deserializeUser(function(id, done) {
    User.findOne({ _id: id }, function (err, user) {
      done(err, user)
    })
  })

  // use local strategy
  passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done) {
      var options = {
        criteria: { email: email }
      }
      User.findOne({ email: email }, function(err, user) {
        if (err) { return done(err) }
        if (!user) {
          return done(null, false, { message: 'Incorrect email' })
        }
        if (!user.authenticate(password)) {
          return done(null, false, { message: 'Incorrect password' })
        }

        return done(null, user);
      });
    }
  ))

}
