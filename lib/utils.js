/**
* @module kad/utils
*/

'use strict';

var assert = require('assert');
var constants = require('./constants');

/**
* Validate a key
* #isValidKey
*/
exports.isValidKey = function(key) {
  return !!key && key.length === constants.B / 4;
};
