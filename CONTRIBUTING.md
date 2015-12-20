Contributing
============

[![Stories in Ready](https://badge.waffle.io/gordonwritescode/kad.svg?label=ready&title=Ready)](http://waffle.io/gordonwritescode/kad)

This document outlines general patterns and and conventions for contributing
to the project. **For in-depth documentation on Kad, see the [`doc/`](doc/)
directory.**

Coding Style
------------

Kad adheres to
[Felix's Node.js Style Guide](https://github.com/felixge/node-style-guide).

Conventions
-----------

As you may have noticed, Kad takes a very OOP approach, making use of the
prototype chain to abstract shared behaviors and extend things that are often
different between projects. A good example of this is how
[transports](doc/transports) inherit from [`kad.RPC`](doc/rpc.md) so that a
[`Node`](doc/node.md) and it's [`Router`](doc/router.md) can communicate with
peers using any transport layer.

This design is central to Kad's architecture and should be followed when adding
new features.

New classes are placed in the `lib/` directory and should be constructed so
that they can be created with or *without* the `new` keyword. This is as simple
as adding a condition to the first line of your constructor function:

```js
function MyClass(options) {
  if (!(this instanceof MyClass)) {
    return new MyClass(options);
  }
  // write class definition here...
}
```

You should also make the best use of [JSDoc](http://usejsdoc.org/) comments as
shown throughout the source code.

Test Coverage
-------------

At the time of writing, Kad has almost complete code coverage (>95%) through
it's test suite. It is important to never decrease coverage, so be sure to
include tests for any new code.

You can run the coverage report with:

```
npm run coverage
```

Linting
-------

To help maintain consistent expectations for code quality and enforcing these
conventions, there is an included `.jshintrc` file. Most editors support using
this to alert you of offending code in real time but, if your editor does not,
you can run the linter with:

```
npm run linter
```

Alternatively, the linter will run as part of the test suite as well, which can
be executed with:

```
npm test
```

---

Have fun and be excellent!
