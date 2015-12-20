Class: RPC(contact[, options])
==============================

The base class for all transports; used by the included `kad.transports.UDP`,
`kad.transports.TCP`, and `kad.transports.HTTP`.

It accepts an instance of [`kad.Contact`](contact.md) and an optional options
dictionary to configure it's behavior:

* `replyto` - _optional_:
* `logger` - _optional_:

## rpc.send(contact, message[, callback])

Sends the `Message` to the `Contact` and fires the callback when a response is
received or with an `err` if the request times out.

This method wraps the child class's (commonly referred to as the "transport
adapter") `_send()` method, using it to actually send the message.

## rpc.close()

Closes the underlying transport by calling the child class's `_close()` method.

---

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
4. Implement `_createContact`, `_send`, and `_close` methods

A `Contact` contains the information your transport adapter needs to talk to
other peers. A `Transport` defines how those peers communicate.

### Example: Simple UDP Transport

```js
var kademlia = require('kademlia');
var inherits = require('util').inherits;
var dgram = require('dgram');

// Define your Transport as a constructor function
function UDPTransport(contact, options) {

  // Make sure that it can be instantiated without the `new` keyword
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  // Call `kademlia.RPC` to setup bindings
  kademlia.RPC.call(this, contact, options);

  // Create a UDP socket object
  this._socket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
  }, this._handleMessage.bind(this));

  // Start listening for UDP messages on the supplied address and port
  this._socket.bind(contact.port, contact.address);
  
}

// Inherit for `kademlia.RPC`
inherits(UDPTransport, kademlia.RPC);

// Implement `_createContact` method
UDPTransport.prototype._createContact = function(options) {
  return new kademlia.contacts.AddressPortContact(options);
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
