var view = require('view/view'),
    reader = require('shell/reader'),
    parseArgs = require('misc').parseArgs;

exports.main = function (tokens, pipes, exit) {
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
  
  if (files.length) {
    // TODO file grep
    out.print("File grep unsupported.");
    return exit(false);
  }
  else {
    out.print("Stdin grep");

    var json, tail = '';
    
    // In-place grepper
    function grep(object, value) {
      if (object.constructor == String || object.constructor == Number) {
        return (negative ^ !!(''+object).match(value)) ? object : null;
      }
      if (object.constructor == Array) {
        return object.map(function (key) {
          return grep(key, value);
        }).filter(function (x) { return x !== null; });
      }
      for (i in object) {
        var item;
        if (matchKeys) {
          item = (grep(i, value) !== null) ? object[i] : null
        }
        else {
          item = grep(object[i], value);
        }
        
        if (!!item) {
          object[i] = item;
        }
        else {
          delete object[i];
        }
      }
      return object;
    }

    // Buffered mime reader handler.
    var handler = {
      
      /**
       * Pipe open, headers found.
       */
      begin: function (headers) {

        var type = headers.get('Content-Type');
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
        headers.set('Content-Length');
        pipes.dataOut.write(headers.generate());
      },

      /**
       * Pipe data (buffered or unbuffered)
       */
      data: function (data) {

        if (json) {
          // Process whole json object.
          data = JSON.parse(data.toString('utf-8'));
        }
        else {
          // Process line by line.
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
      end: function () {
        if (tail) {
          // Last dangling line.
          data = grep([tail], pattern);
          pipes.dataOut.write(data);
        }
      },
    };
    
    // Stdin grep.
    var pipe = new reader.reader(pipes.dataIn,
      function () { return handler; },
      function () {
        exit(true);
      });
    
  }
};
