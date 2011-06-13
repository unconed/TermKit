var fs = require('fs'),
    view = require('view/view'),
    whenDone = require('misc').whenDone,
    meta = require('shell/meta'),
    reader = require('shell/reader');
    
exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);

  // "cat <file> [file ...]" syntax.
  tokens.shift();
  if (tokens.length < 1) {
    out.print('Usage: cat <file> [file] ...');
    return exit(false);
  }

  var files = tokens;
  
  // Reader handler
  var progress, position;
  var handler = {
    /**
     * Files have been opened, unified headers available.
     */
    begin: function (headers) {
      
      // See if we need a progress bar.
      var size = headers.get('Content-Length');
      progress = size > 1024 * 1024; // yes, this is arbitrary
      if (progress) {
        position = 0;
        out.print(view.progress('progress', 0, 0, size));
      }
      
      // Forward headers.
      pipes.dataOut.write(headers.generate());
      process.stderr.write(headers.generate());
      // Unbuffered operation.
      return false;
    },

    /**
     * Data coming in.
     */
    data: function (data) {
      // Pipe through.
      pipes.dataOut.write(data);

      // Progress bar.
      if (progress) {
        position += data.length;
        out.update('progress', { value: position });
      }
    },
    
    /**
     * Done reading.
     */
    end: function (exit) {
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

  // Spawn multiple files reader.
  // Handles type coercion, file naming, etc.
  var errors = 0,
      pipe = new reader.filesReader(files, readerOpen, readerClose, readerError);
};
