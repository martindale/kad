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

## protocol(spec)

Takes an object where methods define extensions to the protocol and routes
messages whose `method` match to the defined handler.

This allows you to extend the protocol with your own rules:

```js
// create your transport adapter
var transport = kademlia.transports.UDP(options);

// define your protocol extensions
var protocol = {
  ECHO: function(params, callback) {
    if (!params.text) {
      return callback(new Error('No text to echo'));
    }

    callback(null, { text: params.text });
  }
};

// register the middleware
transport.use(kademlia.middleware.protocol(protocol));

// now we can use the protocol extensions
transport.send(contact, kademlia.Message({
  method: 'ECHO',
  params: { text: 'Hello!' }
}), function(err, response) {
  console.log(response.result.text); // Hello!
});
```
