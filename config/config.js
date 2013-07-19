
/*!
 * Module dependencies.
 */

var path = require('path')
var rootPath = path.resolve(__dirname + '../..')

/**
 * Expose config
 */

module.exports = {
  development: {
    root: rootPath,
    db: 'mongodb://localhost/maqaw-site'
  },
  test: {
    root: rootPath,
    db: 'mongodb://localhost/maqaw-site'
  },
  staging: {
    root: rootPath,
    db: 'mongodb://localhost/maqaw-site'
  },
  production: {
    root: rootPath,
    db: 'mongodb://localhost/maqaw-site'
  }
}
