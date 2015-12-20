/**
 * @module kad/middleware/whitelist
 */

'use strict';

var assert = require('assert');

/**
 * Factory for whitelist middleware
 * #exports
 */
module.exports = function WhitelistFactory(whitelist) {
  assert(Array.isArray(whitelist), 'Invalid whitelist supplied');

  return function(message, contact, next) {
    if (whitelist.indexOf(contact.nodeID) === -1) {
      return next(new Error('Contact is not in the whitelist'));
    }

    next();
  };
};
