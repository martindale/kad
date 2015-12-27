Class: RPC(contact[, options])
==============================

The base class for all transports; used by the included `kad.transports.UDP`,
`kad.transports.TCP`, and `kad.transports.HTTP`.

It accepts an instance of [`kad.Contact`](contact.md) and an optional options
dictionary to configure it's behavior:

* `replyto` - _optional_: a `Contact` to provide other nodes to communicate back if different public address information
* `logger` - _optional_: a custom `Logger`

## rpc.send(contact, message[, callback])

Sends the `Message` to the `Contact` and fires the callback when a response is
received or with an `err` if the request times out.

This method wraps the child class's (commonly referred to as the "transport
adapter") `_send()` method, using it to actually send the message.

## rpc.receive(buffer)

Called by the subclassed transport implementation when a message is ready to
be handled.

## rpc.before(event, hook)

Registers a middleware function to perform custom behavior before the specified
event occurs. See [hooks](hooks.md).

## rpc.after(event, hook)

Registers a middleware function to perform custom behavior after the specified
event occurs. See [hooks](hooks.md).

## rpc.close()

Closes the underlying transport by calling the child class's `_close()` method.

---

## Hooks

The `kademlia.RPC` class exposes a [hooks](hooks.md) interface for
processing messages and implementing custom behaviors.

Hooks are executed in the order they are registered. Calling `next(err)` will
exit the middleware stack and prevent Kad from handling the message. *You
should always define an `error` handler, otherwise `RPC` will throw*.

### Events

The `kademlia.RPC` class triggers hooks for the following events:

* `serialize`
  * `before` handler receives `(message, next)`
  * `after` handler receives nothing
* `deserialize`
  * `before` handler receives `(buffer, next)`
  * `after` handler receives nothing
* `send`
  * `before` handler receives `(buffer, contact, next)`
  * `after` handler receives nothing
* `receive`
  * `before` handler receives `(message, contact, next)`
  * `after` handler receives nothing
* `open`
  * `before` handler receives `(next)`
  * `after` handler receives nothing
* `close`
  * `before` handler receives `(next)`
  * `after` handler receives nothing

### Example: Simple Blacklist Hook

```js
// array of blacklisted nodeID's
var blacklist = [];
// use a logger to print when a blacklisted node talks
var logger = kademlia.Logger(3);
// the transport adapter we will pass to our `Node`
var transport = kademlia.transports.UDP(contact, options);

// register a middleware function to check blacklist
transport.before('receive', function(message, contact, next) {
  // exit middleware stack if contact is blacklisted
  if (blacklist.indexOf(contact.nodeID) !== -1) {
    return next(new Error('Message dropped from blacklisted contact'));
  }
  // otherwise pass on
  next();
});

// handle errors from RPC
transport.on('error', function(err) {
  logger.warn('RPC error raised, reason: %s', err.message);
});
```

### Request/Response Handling

The middleware stack gets applied to both requests **and** responses. If you
need your middleware to only apply to one or the other, use the
[`Message`](message.md) module to check the type of message:

```js
var Message = kademlia.Message;

// only apply this middleware to requests
transport.before('receive', function(message, contact, next) {
  // return early and move to next middleware if this is not a request
  if (!Message.isRequest(message)) {
    return next();
  }
  // otherwise do fancy middleware stuff ...
});
```

## API for Transport Implementors

The primary focus for Kad's design was to create a simple, sane, minimally
configured setup while allowing for maximum flexibility when it comes to
building applications on or around it. This is why all of the communication
logic is abstracted. Kad does not care how your nodes talk to one another, you
simply provide it with the information that *your* transport adapter needs to
communicate with peers and it will handle the rest.

When building a custom transport, there are a few simple steps:

1. Implement a custom [`kad.Contact`](contact.md)
3. Inherit your transport from `kademlia.RPC`
4. Implement `_open`, `_send`, and `_close` methods

A `Contact` contains the information your transport adapter needs to talk to
other peers. A `Transport` defines how those peers communicate.

### Example: Simple UDP Transport

```js
var kademlia = require('kademlia');
var inherits = require('util').inherits;
var dgram = require('dgram');

// Define your Transport as a constructor function
function UDPTransport(contact, options) {
  var self = this;

  // Make sure that it can be instantiated without the `new` keyword
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  // Call `kademlia.RPC` to setup bindings
  kademlia.RPC.call(this, contact, options);
}

// Inherit for `kademlia.RPC`
inherits(UDPTransport, kademlia.RPC);

// Implement `_open` method to start server
UDPTransport.prototype._open = function() {
  // Create a UDP socket object
  this._socket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
  }, function(messageBuffer) {
    // Call RPC.receive when ready for Kad to handle message
    self.receive(messageBuffer);
  });

  // Start listening for UDP messages on the supplied address and port
  this._socket.bind(contact.port, contact.address);
};

// Implement `_send` method to deliver a message
UDPTransport.prototype._send = function(data, contact) {
  this._socket.send(data, 0, data.length, contact.port, contact.address);
};

// Implement `_close` method to cleanup
UDPTransport.prototype._close = function() {
  this._socket.close();
};
```
