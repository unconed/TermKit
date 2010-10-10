var fs = require('fs'),
    view = require('view/view'),
    composePath = require('util').composePath;

exports.shellCommands = {

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
      out.print(error);
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
      for (i in tokens) if (i) {
        items.push(tokens[i]);
      }
    }
    
    var units = 0, error = 0;

    // Helper to check exit condition.
    function track(callback) {
      units++;
      return function (a, b) {
        callback(a, b);
        if (--units == 0) {
          exit(error != 0);
        }
      };
    }

    // Process arguments.
    for (var i in items) (function (i, path) {

      // Stat the requested files / directories.
      fs.stat(path, track(function (err, stats) {
        
        // Count errors.
        error += ~~err;
        
        // Iterate valid directories.
        if (stats && stats.isDirectory()) {

          // Prepare output.
          out.print(view.itemList('files' + i));

          // Scan contents of found directories.
          fs.readdir(path, track(function (err, files) {
            if (!err) {

              var children = [];
              for (var j in files) (function (j, child) {

                // Stat each child.
                fs.stat(composePath(child, path), track(function (err, stats) {
                  if (!err) {

                    out.add('files' + i, j, view.file(child, path, stats));

                  }
                })); // fs.stat
              })(j, files[j]); // for j in files
            } // !err
          })); // fs.readdir
        } // if isDirectory
      })); // fs.stat
    })(i, items[i]); // for i in items

  },

};
