Class: Logger(verbosity[, prefix])
==========================

Kad, by default, prints log messages to the console using pretty-printed status
messages. There are different types of messages indicating the nature or
severity, `error`, `warn`, `info`, `debug`. You can tell Kad which of these
messages types you want to see by passing a `kademlia.Logger` with option from
0 - 4.

* 0 - silent
* 1 - errors only
* 2 - warnings and errors
* 3 - info, warnings, and errors
* 4 - debug mode (everything)

Additionally you can pass a `prefix` to replace "kad" in the logger output.

## logger.debug(message[, data])

Use liberally, used for verbose debugging messages.

## logger.info(message[, data])

Prints general information to the console.

## logger.warn(message[, data])

Used for when a non-fatal error has occurred.

## logger.error(message[, data])

Something fatal has happened.

---

## Custom Loggers

This class can be substituted anywhere in Kad for another object that
implements the same interface.
