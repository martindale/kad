/**
 * @module kad/middleware/blacklist
 */

'use strict';

var assert = require('assert');

/**
 * Factory for blacklist middleware
 * #exports
 * @param {array} blacklist - array of nodeID's to ban
 */
module.exports = function BlacklistFactory(blacklist) {
  assert(Array.isArray(blacklist), 'Invalid blacklist supplied');

  return function blacklister(message, contact, next) {
    if (blacklist.indexOf(contact.nodeID) !== -1) {
      return next(new Error('Contact is in the blacklist'));
    }

    next();
  };
};
