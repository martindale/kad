/**
* @module kademlia/constants
*/

'use strict';

var ms = require('ms');

/**
* Protocol constants
* #exports
* @see http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html#constants
*/
module.exports = Object.freeze({
  ALPHA: 3,
  B: 160,
  K: 20,
  T_EXPIRE: ms('86400s'),
  T_REFRESH: ms('3600s'),
  T_REPLICATE: ms('3600s'),
  T_REPUBLISH: ms('86400s'),
  MESSAGE_TYPES: [
    'PING',
    'PONG',
    'STORE',
    'FIND_NODE',
    'FIND_VALUE'
  ]
});
