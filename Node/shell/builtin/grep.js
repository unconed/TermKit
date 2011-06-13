var view = require('view/view'),
    reader = require('shell/reader'),
    parseArgs = require('misc').parseArgs;

exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);

  var args = parseArgs(tokens),
      options = args.options;

  var negative = options.v,
      matchKeys = options.k;
  
  if (!args.values.length) {
    out.print("Usage: grep [-v] [-k] <pattern> [file] ...");
    exit(false);
  }
  
  var pattern = args.values.shift(),
      files = args.values;
  
  var json, tail = '';
  
  // In-place grepper
  function grep(object, value, force) {
    var i;
    
    if (object.constructor == String || object.constructor == Number) {
      // Match strings.
      return ((!matchKeys || force) && (negative ^ !!(''+object).match(value))) ? object : null;
    }
    if (object.constructor == Array) {
      // Keep only non-null items after grep.
      object = object.map(function (key) {
        return grep(key, value);
      }).filter(function (x) { return x !== null; });

      // Prune empties.
      return object.length ? object : null;
    }
    
    var out = {};
    for (i in object) {
      var item;
      if (matchKeys) {
        // Pass keys through grep.
        item = (grep(i, value, true) !== null) ? object[i] : null
      }
      else {
        // Pass values through grep.
        item = grep(object[i], value);
      }
      
      // Keep non-null items.
      if (item !== null) {
        out[i] = item;
      }
    }

    // Prune empties.
    if (JSON.stringify(out) == '{}') {
      return null;
    }
    return out;
  }

  // Buffered mime reader handler.
  var handler = {
    
    /**
     * Pipe open, headers found.
     */
    begin: function (headers) {

      var type = headers.get('Content-Type'),
          buffered = false;

      switch (type) {
        default:
        case 'text/plain':
          json = false;
          break;

        case 'application/json':
          buffered = json = true;
          break;
      }

      // Remove content-length, output rest.
      headers.set('Content-Length', null);
      pipes.dataOut.write(headers.generate());
      
      return buffered;
    },

    /**
     * Pipe data.
     */
    data: function (data) {

      if (json) {
        // Process whole json object (buffered).
        data = JSON.parse(data.toString('utf-8'));
      }
      else {
        // Process line by line (unbuffered chunks).
        data = (tail + data).toString('utf-8').split("\n");
        tail = data.pop();
      }

      // Filter values recursively.
      data = grep(data, pattern);
      
      if (json) {
        // Serialize
        data = JSON.stringify(data);
      }
      else {
        // Join lines.
        data = data.join("\n");
      }
      
      // Pipe out.
      pipes.dataOut.write(data);
    },
    
    /**
     * Pipe closed.
     */
    end: function (exit) {
      if (tail) {
        // Last dangling line.
        data = grep([tail], pattern);
        if (data !== null) {
          pipes.dataOut.write(data);
        }
      }

      // Quit.
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
