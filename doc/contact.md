Class: Contact(options)
=======================

The base class from which custom contacts inherit; used by the included
`AddressPortContact`. Nodes provide each other with contact information which
indicates how others should communicate with them.

## contact.seen()

Updates the `lastSeen` property to the current UNIX time. Used by the `Router`
for organizing the routing table.

---

## API for Contact Implementors

Creating a custom contact is very simple. You need only to:

1. Define a constructor function that accepts a dictionary
2. Inherit from `kademlia.Contact`
3. Implement `_createNodeID`
4. Call super class at bottom of your constructor

### Example: Address/Port Contact

```js
var kademlia = require('kad');
var inherits = require('util').inherits;
var utils = require('../utils');

// Define you constructor function
function AddressPortContact(options) {
  // Make sure the `new` keyword is not required
  if (!(this instanceof AddressPortContact)) {
    return new AddressPortContact(options);
  }

  // Store relevant contact information
  this.address = options.address;
  this.port = options.port;

  // Call super class to setup bindings
  kademlia.Contact.call(this, options);
}

// Inherit from `kademlia.Contact`
inherits(AddressPortContact, kademlia.Contact);

// Implement `_createNodeID` for super class to use
AddressPortContact.prototype._createNodeID = function() {
  return utils.createID(this.address + ':' + this.port);
};
```
