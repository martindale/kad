/**
* @module kad/utils
*/

'use strict';

var assert = require('assert');
var crypto = require('crypto');
var constants = require('./constants');

/**
* Validate a key
* #isValidKey
*/
exports.isValidKey = function(key) {
  return !!key && key.length === constants.B / 4;
};

/**
* Create a valid ID from the given string
* #createID
* @param {string} data
*/
exports.createID = function(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
};

/**
* Convert a key to a buffer
* #hexToBuffer
* @param {string} hexString
*/
exports.hexToBuffer = function(hexString) {
  var buf = new Buffer(constants.K)

  buf.write(hexString, 0, 'hex');

  return buf;
}

/**
* Calculate the distance between two keys
* #getDistance
* @param {string} id1
* @param {string} id2
*/
exports.getDistance = function(id1, id2) {
  var distance = new Buffer(constants.K);
  var id1Buf = exports.hexToBuffer(id1);
  var id2Buf = exports.hexToBuffer(id2);

  for(var i = 0; i < constants.K; ++i) {
    distance[i] = id1Buf[i] ^ id2Buf[i];
  }

  return distance;
};

/**
* Compare two buffers for sorting
* #compareKeys
* @param {buffer} b1
* @param {buffer} b2
*/
exports.compareKeys = function(b1, b2) {
  assert.equal(b1.length, b2.length);

  for (var i = 0; i < b1.length; ++i) {
    if (b1[i] !== b2[i]) {
      if (b1[i] < b2[i]) {
        return -1;
      } else {
        return 1;
      }
    }
  }

  return 0;
};

/**
* Calculate the index of the bucket that key would belong to
* #getBucketIndex
* @param {string} id1
* @param {string} id2
*/
exports.getBucketIndex = function(id1, id2) {
  var distance = exports.getDistance(id1, id2);
  var bucketNum = constants.B;

  for (var i = 0; i < distance.length; i++) {
    if (distance[i] === 0) {
      bucketNum -= 8;
      continue;
    }

    for (var j = 0; j < 8; j++) {
      if (distance[i] & (0x80 >> j)) {
        return --bucketNum;
      } else {
        bucketNum--;
      }
    }
  }

  return bucketNum;
};
