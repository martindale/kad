Module: middleware
==================

The middleware module acts as meta-package for commonly used middleware for use
with your [transport adapter](rpc.md).

Middleware is registered using the transport adapter's `use()` method:

```js
var blacklist = [];
var transport = kademlia.transports.UDP(contact);

transport.use(kademlia.middleware.blacklist(blacklist));
```

## whitelist(whitelist)

Accepts an array of `nodeID`s to allow communication with.

## blacklist(blacklist)

Accepts an array of `nodeID`s to prevent communication with.
