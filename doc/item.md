Class: Item(key, value, publisher[, timestamp])
===============================================

Storage model for DHT items, which is serialized to JSON before being passed to
the [storage adapter](storage.md). Properties include:

* `key` - lookup key string
* `value` - the item value (mixed type)
* `publisher` - the string `nodeID` of the original publisher
* `time` - unix timestamp of original publication
