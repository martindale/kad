Class: Node(options)
====================

The class for creating a DHT node; the primary interface to Kad.

It accepts an `options` dictionary to configure it's behavior:

* `storage` - _required_: the storage adapter of your choice; see [Storage](storage.md).
* `transport` - _required_: instance of the transport adapter to be used; see [RPC](rpc.md).
* `router` - _optional_: a custom router to use; see [`Router`](router.md); one is created by default.
* `validator` - _optional_: function for validating key/value pairs; see [Validation](#validation).
* `logger` - _optional_: logger object to use; see [`Logger`](logger.md).

> Note that custom transport adapters may require other configuration options
> to be passed in.

## node.connect(contact[, callback])

Adds the contact to the routing table and performs an iterative `FIND_NODE` to
build out the routing table. Executes the callback on the first successful
connection.

## node.get(key[, callback])

Fetches the value stored in the DHT by the supplied key by performing an
iterative `FIND_VALUE` until it is resolved. Executes the callback when the
value is found or passes back an `err` if it times out.

## node.put(key, value[, callback])

Stores the value in the DHT by the supplied key by performing an `STORE` at the
3 known nodes closest to the key. Executes the callback when the value is
stored or passes back an `err` if it times out.

---

## Validation

Optionally you might want to run Kad with key-value validation. One use case of
this might be content-addressable storage, where the key is the hash of the
value. Another use case is verifying cryptographic signatures, where the key
represents the public portion of the key pair used to sign the value.

### Example: Content Addressable Validation

```js
var kademlia = require('kad');
var crypto = require('crypto');

function validator(key, value, callback) {
  callback(key === crypto.createHash('sha256').update(value).digest('hex'));
}

var dht = new kademlia.Node({
  validator: validator,
  // ...
});
```
