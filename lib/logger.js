/**
* @module kad/logger
*/

'use strict';

var colors = require('colors/safe');

/**
* Handles logging to console
* @constructor
*/
function Logger(level) {
  if (!(this instanceof Logger)) {
    return new Logger(level);
  }

  this.level = level || 0;
  this.types = {
    debug: {
      level: 4,
      color: colors.magenta
    },
    info: {
      level: 3,
      color: colors.blue
    },
    warn: {
      level: 2,
      color: colors.yellow
    },
    error: {
      level: 1,
      color: colors.red
    }
  };

  this._bindLogTypes();
}

/**
* Sets up log types as instance methods
* #_bindLogTypes
*/
Logger.prototype._bindLogTypes = function() {
  var self = this;

  Object.keys(this.types).forEach(function(type) {
    self[type] = function() {
      if (self.level >= self.types[type].level) {
        var prefix = self.types[type].color('{' + type + '}');
        var args = Array.prototype.slice.call(arguments);

        args[0] = prefix + ' ' + args[0];

        console.log.apply(console, args);
      }
    }
  });
};

module.exports = Logger;
