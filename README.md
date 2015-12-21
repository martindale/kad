Kad
===

[![Build Status](https://travis-ci.org/gordonwritescode/kad.svg?branch=master)](https://travis-ci.org/gordonwritescode/kad)
[![Coverage Status](https://coveralls.io/repos/gordonwritescode/kad/badge.svg)](https://coveralls.io/r/gordonwritescode/kad)

Extensible implementation of the
[Kademlia](http://www.scs.stanford.edu/~dm/home/papers/kpos.pdf) distributed
hash table for Node.js and the browser.

## Quick Start

**For complete documentation on using and extending Kad,
[read the documentation](doc/).**

```bash
npm install kad@1.1.0-beta.2
```

Create your node, plug in your storage adapter, join the network, and party!

```js
var kademlia = require('kad');

var seed = {
  address: '127.0.0.1',
  port: 1338
};

var dht = new kademlia.Node({
  transport: kademlia.transports.UDP({
    address: '127.0.0.1', port: 1337
  }),
  storage: kademlia.storage.FS('path/to/datadir')
});

dht.connect(seed, function(err) {
  // dht.get(key, callback);
  // dht.put(key, value, callback);
});
```

You can build Kad for the browser by running:

```
npm run browser-bundle
```

> This will output to `dist/kad.browser.js` and will bind to `window` when
> loaded in your web application.

## Transports

Kad ships with support for UDP, TCP, and HTTP transports. To explicitly define
the transport to use, set the `transport` option to the appropriate value. See
the documentation on [`kad.RPC`](doc/rpc.md) and [`kad.Contact`](doc/contact.md)
for more information.

```js
var dht = new kademlia.Node({
  // ...
  transport: kademlia.transports.TCP(contact, options)
});
```

### Community Transport Adapters

* [WebRTC](https://github.com/omphalos/kad-webrtc)

## Persistence

Kad does not make assumptions about how your nodes will store their data,
instead relying on you to implement a storage adapter of your choice. This is
as simple as providing `get(key, callback)`, `put(key, value, callback)`,
`del(key, callback)`, and `createReadStream()` methods.

This works well with [levelup](https://github.com/rvagg/node-levelup), but you
could conceivably implement any storage layer you like provided you expose the
interface described above. Some adapters have already been contributed by the
community, listed below.

### Community Storage Adapters

* [Local Storage](https://github.com/omphalos/kad-localstorage)
* [MongoDB](https://github.com/niahmiah/kad-mongo)
* [File System](https://github.com/gordonwritescode/kad-fs)

## NAT Traversal and Hole Punching

If your program runs on a user's personal computer, it's very likely that you
will need to forward a port on their router so peers can communicate when
behind a firewall. This is easy to do, using Indutny's
[node-nat-upnp](https://github.com/indutny/node-nat-upnp) module.

You'll want to do this *before* instantiating the Kademlia node.

```js
var dht, nat = require('nat-upnp').createClient();

nat.portMapping({ public: 65535, private: 65535, ttl: 0 }, function(err) {
  nat.externalIp(function(err, ip) {
    dht = kad.Node(options);
  });
});
```

## Projects Using Kad

* [BYRD](https://gitlab.com/counterpoint/byrd)
* [Kad-REST](https://github.com/niahmiah/kad-rest)
* [Muttr](https://gitlab.com/muttr/libmuttr)

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
