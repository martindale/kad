/**
 * @example kad/minimal
 */

'use strict';

var kademlia = require('..');

// setup a kademlia DHT in less than 10 lines of code
var dht = kademlia.Node({
  transport: kademlia.transports.HTTP(
    kademlia.contacts.AddressPortContact({
      address: 'localhost',
      port: 3050
    })
  ),
  storage: kademlia.storage.FS(
    require('os').tmpdir() + '/kad-example'
  )
});

// party on, garth
dht.connect({ address: '<ip_address>', port: 3050 });
