Module: hooks
==================

The hooks module acts as meta-package for commonly used middleware for use
with your [transport adapter](rpc.md).

Hooks are registered using the transport adapter's `before()` and `after()`
methods:

```js
var blacklist = [];
var transport = kademlia.transports.UDP(contact);

transport.before('receive', kademlia.hooks.blacklist(blacklist));
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
transport.before('receive', kademlia.hooks.protocol(protocol));

// now we can use the protocol extensions
transport.send(contact, kademlia.Message({
  method: 'ECHO',
  params: { text: 'Hello!' }
}), function(err, response) {
  console.log(response.result.text); // Hello!
});
```
