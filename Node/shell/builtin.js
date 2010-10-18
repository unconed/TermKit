var fs = require('fs'),
    view = require('view/view'),
    composePath = require('util').composePath,
    whenDone = require('util').whenDone;

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
    var queue = whenDone(function () { exit(errors != 0); });

    // Process arguments.
    for (var i in items) (function (i, path) {

      // Stat the requested files / directories.
      fs.stat(path, queue(function (error, stats) {
        
        // Iterate valid directories.
        if (stats && stats.isDirectory()) {

          // Prepare output.
          out.print(view.itemList('files' + i));

          // Scan contents of found directories.
          fs.readdir(path, queue(function (error, files) {
            if (!error) {

              var children = [];
              files.sort(function (a, b) { return a.toLowerCase() > b.toLowerCase(); });
              for (var j in files) (function (j, child) {

                // Stat each child.
                fs.stat(composePath(child, path), queue(function (error, stats) {
                  if (!error) {

                    out.add('files' + i, j, view.file(child, path, stats));

                  }
                })); // fs.stat
              })(j, files[j]); // for j in files
            } // !error
          })); // fs.readdir
        } // if isDirectory
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
