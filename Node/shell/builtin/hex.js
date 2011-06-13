var view = require('view/view'),
    reader = require('shell/reader'),
    parseArgs = require('misc').parseArgs;

exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);

  var args = parseArgs(tokens),
      options = args.options,
      files = args.values;

  // Buffered mime reader handler.
  var handler = {
    
    /**
     * Pipe open, headers found.
     */
    begin: function (headers) {
      // Override content-type, output rest.
      headers.set('Content-Type', [ 'application/octet-stream', { schema: 'termkit.hex' } ]);
      pipes.dataOut.write(headers.generate());
    },

    /**
     * Pipe data.
     */
    data: function (data) {
      // Pipe out.
      pipes.dataOut.write(data);
    },
    
    /**
     * Pipe closed.
     */
    end: function (exit) {
      // Quit immediately.
      exit();
    },
  };
  
  // Reader callbacks
  var errors = 0;
  // Open
  function readerOpen() {
    return handler;
  };
  // Close
  function readerClose() {
    exit(errors == 0);
  };
  // Error
  function readerError(error) {
    errors++;
    out.print(error);
  };

  // Spawn appropriate reader.
  if (files.length) {
    // Spawn files reader.
    var pipe = new reader.filesReader(files, readerOpen, readerClose, readerError);
  }
  else {  
    // Spawn data reader.
    var pipe = new reader.dataReader(pipes.dataIn, readerOpen, readerClose, readerError);
  }
};
