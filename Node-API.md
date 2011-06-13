# How to write a builtin.js-style TermKit command.

## Main

* Make a .js file that exports a `main` function:

```
exports.main = function (tokens, pipes, exit, environment) {

  exit(true); // Success
  exit(false); // Error
  exit(true, { ... }); // Success with meta data.
  exit(-1); // Success with warnings
};
```

There is no plug-in system yet, so you'll have to:

* Place it in Node/shell/builtin/.
* Add your command to the list in `Node/shell/builtin/builtin.js`.

### Arguments

`tokens` is an array of strings representing the arguments including the executable itself, i.e. classic 'argv'.
 e.g. [ 'echo', 'Hello world!' ].
 
`pipes` is an object with the 5 TermKit pipes: Data In/Out, View In/Out, and Error Out.

`exit` is a function to call when ending the process. This call can be nested inside asynchronous closures. Pass `true` for success, `false` for error, -1 for success with warnings. You can pass out additional meta-data in the second argument, though this is currently not used for anything.

`environment` is a read-only object with name-value pairs containing the execution environment.

## Pipes 

The 5 pipes are:

* `dataIn`, `dataOut` correspond to classic stdIn / stdOut. Treat them as a Readable/Writeable stream.
* `errorOut` corresponds to classic stdError. Treat it as a Writeable stream.
* `viewIn` is an event emitter that fires 'message' events.
* `viewOut` is a function that can be called to invoke a method in the front-end view.

However, Data In/Out come with one caveat. The streams are prefixed with MIME headers.

When generating output, always write the MIME headers once at the beginning of the stream. Only a Content-Type is required, but you are encouraged to provide useful metadata, preferably re-using common web standards like Content-Disposition.

This is made easy with the built-in meta module. Here is e.g. `echo.js`:

```
var meta = require('shell/meta');

exports.main = function (tokens, pipes, exit) {

  // Prepare text.
  tokens.shift();
  var data = tokens.join(' ');

  // Write headers.
  var headers = new meta.headers();
  headers.set({
    'Content-Type': [ 'text/plain', { charset: 'utf-8' } ],
    'Content-Length': data.length,
  });
  pipes.dataOut.write(headers.generate());

  // Write data.
  pipes.dataOut.write(data);

  exit(true);
};
```

Meta.headers has a nice getter/setter API for manipulating MIME fields and their parameters:

```
// Single setters
set(key, value)
set(key, param, value)

// Combined value/param setter.
set(key, [ value, { param: value, param: value } ])

// Multi-value setter.
set(key, [ value, value, value ])
set(key, [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ])

// Generic hash syntax.
set({
  key: value,
  key: [ value, { param: value }],
  key: [ value, value, value ],
  key: [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ],
})

// Getterrs
get('key');
get('key', 'parameter');
```

To handle headers on dataIn, you can use the built-in `reader.js`. To use it, create a handler object with a begin, data and end method. The reader will invoke each method as needed.

```
var handler = { ... };

// Attach reader to dataIn pipe.
var pipe = new reader.dataReader(pipes.dataIn,
  function (headers) {
    // Inspect headers, return appropriate handler
    return handler;
  },
  function () {
    // Pipe was closed
    exit(true);
  });
```

Reader.js has two modes. It can do unbuffered I/O, where data is streamed in immediately. In this case, the begin and end handlers will each fire once, and the data handler will be fired any number of times between them (or not at all).

The other mode is buffered I/O. In this case, all the data is buffered first, and only then sent to the handler. The begin, data and end handlers will each fire once in sequence.

The handler should follow the following template:

```
var handler = {
  
  /**
   * Pipe open, headers found.
   */
  begin: function (headers) {
    // Inspect headers (meta.js headers object)
    // Decide on buffered vs unbuffered operation.
  
    return true; // Buffered stream.
    return false; // Unbuffered stream.
  },

  /**
   * Pipe data.
   */
  data: function (data) {
    // Process data (Buffer)
  },
  
  /**
   * Pipe closed.
   */
  end: function (exit) {
    // Cleanup.
  
    // Quit.
    exit();
  },
};
```

If you wish to provide informational or interactive output, you must interface with viewIn / viewOut. To make this easier, you can use `view.js`.

```
var out = new view.bridge(pipes.viewOut);

// Print hello world.
out.print('Hello world');

// 'Print' a progressbar with ID 'progress', value 0% and range 0-100%.
var progressBar = view.progress('progress', 0, 0, 100);
out.print(progressBar);

// Change progress bar to 50%.
out.update('progress', { value: 50 });

// Create an empty list with ID 'list' and print it.
var list = view.list('list');
out.print(list);

// Add two images to the list 'list'.
var item;
item = view.image(null, 'http://example.com/image1.png');
out.add('list', item);
item = view.image(null, 'http://example.com/image2.png');
out.add('list', item);
```

See view/view.js for a full list of available widgets. The current set is incomplete.

