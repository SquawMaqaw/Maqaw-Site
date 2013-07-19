
/*!
 * Module dependencies
 */

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;



/**
 * User schema
 */

var UserSchema = new Schema({
  email: { type: String, default: '', required: true, index: { unique: true }},
  company: { type: String, default: '' },
  hashed_password: { type: String, default: '', required: true },
})

/**
 * User plugin
 */

UserSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});

UserSchema.statics.hash = function(password) {
  var salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};


UserSchema.methods.authenticate = function(password) {
  return bcrypt.compareSync(password, this.hashed_password);
};

/**
 * Methods
 */

UserSchema.method({

})

/**
 * Statics
 */

UserSchema.static({

})

/**
 * Register
 */

mongoose.model('User', UserSchema)
