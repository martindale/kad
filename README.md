Kad
===

[![Build Status](https://travis-ci.org/gordonwritescode/kad.svg?branch=master)](https://travis-ci.org/gordonwritescode/kad)
[![Coverage Status](https://coveralls.io/repos/gordonwritescode/kad/badge.svg)](https://coveralls.io/r/gordonwritescode/kad)

Extensible implementation of the
[Kademlia](http://www.scs.stanford.edu/~dm/home/papers/kpos.pdf) distributed
hash table for Node.js and the browser.

## Getting Started

```bash
npm install kad@1.0.0-beta
```

Create your node, plug in your storage adapter, join the network, and party!

```js
var kademlia = require('kad');
var kadfs = require('kad-fs');

var seed = {
  address: 'some.remote.host',
  port: 65535
};

var dht = new kademlia.Node({
  address: '127.0.0.1',
  port: 65535,
  storage: kadfs('path/to/db')
});

dht.connect(seed, onConnect);

function onConnect() {
  dht.put('beep', 'boop', function(err) {
    dht.get('beep', function(err, value) {
      console.log(value); // 'boop'
    });
  });
}
```

> Note that you can build Kad for the browser with `npm run browser-bundle`,
> which will output to `dist/kad.browser.js` and will bind to `window` when
> loaded in your web application.

## Configuration

Below, we've included a complete list of all properties that can be passed to
`kad(options)`.

* **storage** - _required_: the storage adapter of your choice, see [Persistence](#persistence).
* **validate** - _optional_: function for validating key/value pairs, see [Validation](#validation).
* **transport** - _optional_: constructor function for the transport adapter to be used; defaults to `kad.transports.UDP`.
* **replyto** - _optional_: provide different addressing information to peers
* **logger** - _optional_: logger object to use; see [Logging](#logging).
* **address** - _optional_: hostname or IP address of this node; used by `UDP`, `TCP`, and `HTTP` transport adapters.
* **port** - _optional_: port to listen on; used by `UDP`, `TCP`, and `HTTP` transport adapters.

> Note that custom transport adapters may require other configuration options
> to be passed in.

## Transports

By default, Kad uses UDP to facilitate communication between nodes, however it
is possible to use a different transport. Kad ships with support for UDP, TCP,
and HTTP transports. To explicitly define the transport to use, set the
`transport` option to the appropriate value.

```js
var dht = new kademlia.Node({
  // ...
  transport: kademlia.transports.TCP // defaults to `kademlia.transports.UDP`
});
```

### Community Transport Adapters

* [WebRTC](https://github.com/omphalos/kad-webrtc)

### Custom Transport Adapters

The primary focus for Kad's design was to create a simple, sane, minimally
configured setup while allowing for maximum flexibility when it comes to
building applications on or around it. This is why all of the communication
logic is abstracted. Kad does not care how your nodes talk to one another, you
simply provide it with the information that *your* transport adapter needs to
communicate with peers and it will handle the rest.

When building a custom `Transport`, there are a few simple steps:

1. Define a contact constructor or use an existing one
2. Implement a `_createNodeID` method
3. Inherit your transport from `kademlia.RPC`
4. Implement `_createContact`, `_send`, and `_close` methods

A `Contact` contains the information your transport adapter needs to talk to
other peers. A `Transport` defines how those peers communicate. The best place
to start for learning how to implement a custom transport adapter is the
included `lib/transports/udp.js` and `lib/contacts/address-port-contact.js`.

### Contacts

Node provide each other with "contact" information which indicates how others
should communicate with them. By default, this information is automatically
provided based on the options provided to the transport adapter, like `address`
and `port`.

However, in some situations, the information provided to the transport adapter
is not the same information that other nodes need to communicate back. In these
cases you can provide a `replyto` option and provide the overrides needed.

For example, you may want to listen on all interfaces, but provide a domain
name to peers:

```js
var dht = new kademlia.Node({
  // ...
  address: '0.0.0.0',
  port: 443,
  replyto: {
    address: 'mydomain.tld',
    port: 443
  },
  // ...
});
```

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

## Validation

Optionally you might want to run Kad with key-value validation. One use case of
this might be content-addressable storage, where the key is the hash of the
value. Another use case is verifying cryptographic signatures, where the key
represents the public portion of the key pair used to sign the value.

In cases like these, you can pass a `validate` option:

```js
var dht = new kademlia.Node({
  // ...
  validate: function(key, value, callback) {
    callback(/* true or false */);
  }
});
```

## Logging

Kad, by default, prints log messages to the console using pretty-printed status
messages. There are different types of messages indicating the nature or
severity, `error`, `warn`, `info`, `debug`. You can tell Kad which of these
messages types you want to see by passing a `kademlia.Logger` with option from
0 - 4.

* 0 - silent
* 1 - errors only
* 2 - warnings and errors
* 3 - info, warnings, and errors
* 4 - debug mode (everything)

```js
var dht = new kademlia.Node({
  //...
  logger: kademlia.Logger(4)
});
```

You can use a custom logger by setting `options.logger` before creating your
`kademlia.Node`. A valid logger is any object that implements `debug`, `info`,
`warn`, and `error` methods.

## NAT Traversal and Hole Punching

If your program runs on a user's personal computer, it's very likely that you
will need to forward a port on their router so peers can communicate when
behind a firewall. This is easy to do, using Indutny's
[node-nat-upnp](https://github.com/indutny/node-nat-upnp) module.

You'll want to do this *before* instantiating the Kademlia node.

```js
var nat = require('nat-upnp').createClient();
var port = 65535;
var dht = null;

nat.portMapping({
  public: port,
  private: port,
  ttl: 0 // indefinite lease
}, function(err) {
  nat.externalIp(function(err, ip) {
    dht = kad.Node({ address: ip, port: port, /* ... */ });
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
