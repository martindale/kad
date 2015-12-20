Class: Bucket()
===============

A bucket is a "column" of the routing table. It is an array-like object that
holds `Contact`s.

## bucket.getSize()

Returns the number of contacts in the bucket.

## bucket.getContactList()

Returns a shallow copy of the contacts.

## bucket.getContact(index)

Returns the `Contact` object at the given `index`.

## bucket.addContact(contact)

Adds the `Contact` to the bucket or, if it already exists, move it to it's new
index based on `contact.lastSeen`.

## bucket.removeContact(contact)

Removes the `Contact` from the bucket.

## bucket.hasContact(nodeID)

Returns a `Boolean` indicating if a `Contact` with the give `nodeID` is
contained in the bucket.

## bucket.indexOf(contact)

Returns the index of the given `Contact`.
