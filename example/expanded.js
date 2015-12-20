/**
 * @example kad/expanded
 */

'use strict';

// import the kad package
var kademlia = require('..');

// setup your local "contact" information
var contact = new kademlia.contacts.AddressPortContact({
  address: 'localhost',
  port: 3050
});

// setup a verbose logger
var logger = new kademlia.Logger(4, 'kad-example');

// setup some key/value validation
var validator = function(key, value, callback) {
  callback(true);
};

// configure a transport adapter
var transport = new kademlia.transports.HTTP(contact, {
  logger: logger
});

// create a routing table for our node
var router = new kademlia.Router({
  transport: transport,
  validator: validator,
  logger: logger
});

// setup a storage adapter
var storage = kademlia.storage.FS(
  require('os').tmpdir() + '/kad-example'
);

// create a kademlia node to glue it all together
var node = new kademlia.Node({
  transport: transport,
  router: router,
  logger: logger,
  storage: storage,
  validator: validator
});

// connect to a known seed to enter the network
node.connect(new kademlia.contacts.AddressPortContact({
  address: '<ip_address>',
  port: 3050
}));
