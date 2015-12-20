Class: Router(options)
======================

Represents a routing table of known `Contact`s; used by `Node`. Accepts an
options dictionary to configure it's behavior:

* `transport` - _required_: an instance of [`RPC`](rpc.md)
* `logger` - _optional_: a [`Logger`](logger.md) instance
* `validator` - _optional_: a validator function; see [`Node`](node.md)

## router.lookup(type, key, callback)

Walk the routing table iteratively searching for a `type` of `NODE` or `VALUE`
at the given `key`.

## router.refreshBucketsBeyondClosest(contacts, callback)

Refreshes the buckets farther than the closest known `contacts`.

## router.refreshBucket(index, callback)

Refreshes the `Bucket` at the given index.

## router.findValue(key, callback)

Search contacts for the value at the given `key`.

## router.findNode(key, callback)

Search contacts for nodes close to the given `key`.

## router.updateContact(contact, callback)

Update the `Contact`s status in the appropriate `Bucket`.

## router.getNearestContacts(key, limit, nodeID)

Returns the known `Contacts` closest to the given `key`, limited to `limit`,
and excluding `nodeID` (which is usually us).
