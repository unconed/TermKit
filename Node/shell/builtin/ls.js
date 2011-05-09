var fs = require('fs'),
    view = require('view/view'),
    composePath = require('misc').composePath,
    whenDone = require('misc').whenDone,
    EventEmitter = require('events').EventEmitter,
    async = require('misc').async,
    meta = require('shell/meta'),
    expandPath = require('misc').expandPath;

exports.main = function (tokens, pipes, exit) {
  
  var out = new view.bridge(pipes.viewOut);
  
  var hidden = false;

  // Parse out directory references to list.
  var items = [];
  for (i in tokens) if (i > 0) {
    var m;
    if (m = /-([aA])/(tokens[i])) {
      switch (m[1]) {
        case 'a':
        case 'A':
          hidden = true;
          break;
        default:
          out.print('Unrecognized argument "'+ tokens[i] +'"');
          exit(false);
      }
    }
    else {
      items.push(tokens[i]);
    }
  }
  // Default to working directory.
  if (!items.length) {
    items.push(process.cwd());
  }

  // Prepare async job tracker.
  var errors = 0;
  var output = {};
  var track = whenDone(function () {
    
    // Format data.
    var data = JSON.stringify(output);
    
    // Prepare headers.
    var headers = new meta.headers();
    headers.set({
      'Content-Type': [ 'application/json', { schema: 'termkit.files' } ],
      'Content-Length': data.length,
    });

    // Output data.
    pipes.dataOut.write(headers.generate());
    pipes.dataOut.write(data);

    exit(errors == 0);
  }); // whenDone

  // Process arguments (list of paths).
  for (var i in items) (function (i, key) {

    output[key] = [];

    // Expand path
    expandPath(key, track(function (path) {
      // Stat the requested files / directories.
      fs.stat(path, track(function (error, stats) {

        // Iterate valid directories.
        if (stats && stats.isDirectory()) {

          // Scan contents of found directories.
          fs.readdir(path, track(function (error, files) {
            if (!error) {
              
              // Sort files.
              var children = [];
              files.sort(function (a, b) { 
                return a.toLowerCase().localeCompare(b.toLowerCase());
              });

              // Apply hidden filter.
              if (!hidden) {
                files = files.filter(function (file) { return file[0] != '.'; });
              }

              // Output files.
              output[key] = files;
            } // !error
          })); // fs.readdir
        } // isDirectory
        else {
          // Count errors.
          errors += +error;

          // Output message.
          out.print(error.message);
        }
      })); // fs.stat
    })); // expandPath

  })(i, items[i]); // for i in items

};