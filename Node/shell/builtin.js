var fs = require('fs'),
    view = require('view/view'),
    composePath = require('misc').composePath,
    whenDone = require('misc').whenDone,
    EventEmitter = require('events').EventEmitter,
    async = require('misc').async;

exports.shellCommands = {
/*
  'cat': function (tokens, invoke, exit) {

    // "cat <file> [file ...]" syntax.
    if (tokens.length < 2) {
      out.print('Usage: cat <file> ...');
      return exit(true);
    }
    
  },
*/

  'cd': function (tokens, invoke, exit) {

    var out = new view.bridge(invoke);
    
    // Restrict to simple "cd <dir>" syntax.
    if (tokens.length != 2) {
      out.print('Usage: cd <dir>');
      return exit(true);
    }
    var path = tokens[1];

    // Try to change working dir.
    try {
      process.chdir(path);
    }
    catch (error) {
      out.print(error.message);
      return exit(true);
    }

    // Sync up environment variables.
    this.sync(invoke);
    exit(false);
  },

  'ls': function (tokens, invoke, exit) {
    
    var out = new view.bridge(invoke);

    // Parse out items to list.
    var items = [];
    if (tokens.length <= 1) {
      items.push(process.cwd());
    }
    else {
      for (i in tokens) if (i > 0) {
        items.push(tokens[i]);
      }
    }

    // Prepare async job tracker.
    var errors = 0;
    var output = [];
    var track = whenDone(function () {
      for (i in output) {
        // Output one directory listing at a time.
        out.print(view.list(i, output[i]));
      }
      exit(errors != 0);
    });

    // Process arguments (list of paths).
    for (var i in items) (function (i, path) {

      output[i] = [];

      // Stat the requested files / directories.
      fs.stat(path, track(function (error, stats) {
        
        // Iterate valid directories.
        if (stats && stats.isDirectory()) {

          // Scan contents of found directories.
          fs.readdir(path, track(function (error, files) {
            if (!error) {

              var children = [];
              files.sort(function (a, b) { return a.toLowerCase() > b.toLowerCase(); });
              for (var j in files) (function (j, child) {

                // Stat each child.
                fs.stat(composePath(child, path), track(function (error, stats) {
                  if (!error) {
                    output[i][j] = view.file(child, path, stats);
                  }
                })); // fs.stat
              })(j, files[j]); // for j in files
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
    })(i, items[i]); // for i in items

  },

};
