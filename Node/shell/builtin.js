var fs = require('fs'),
    view = require('view/view'),
    composePath = require('util').composePath;

exports.shellCommands = {

  'cd': function (tokens, invoke, exit) {
    
    // Restrict to simple "cd <dir>" syntax.
    if (tokens.length != 2) {
      return exit(true);
    }
    var path = tokens[1];

    // Try to change working dir.
    try {
      process.chdir(path);
    }
    catch (error) {
      return exit(true);
    }

    // Sync up environment variables.
    this.sync(invoke);
    exit(false);
  },

  'ls': function (tokens, invoke, exit) {
    
    var out = new view.bridge(invoke);

    out.print('hello world');
    exit();
    return;
    
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
    
    var units = items.length;
    var i, error = 0;

    // Helper to check exit condition
    function end() {
      // If all done, return error code.
      if (--units == 0) {
        exit(error != 0);
      }
    }
    
    // Process arguments.
    for (var i in items) (function (i, path) {

      // Stat the requested files / directories.
      fs.stat(path, function (err, stats) {
        if (!err && stats.isDirectory()) {

          // Prepare output.
          out.print(view.blockList('files' + i));

          // Scan contents of found directories.
          fs.readdir(path, function (err, files) {
            if (!err) {
              var children = [];
              for (var j in files) (function (j, child) {

                // Stat each child.
                fs.stat(composePath(child, path), function (err, stats) {
                  if (!err) {

                    v.add('files' + i, j, view.fileReference(child, path, stats));

                  }
                  else {
                    // Child stat failed.
                    error++;
                  }
                  end();

                });
              })(i, files[i]);
              
            }
            else {
              // Readdir failed.
              error++;
            }
            end();
          });

        }
        else {
          // Stat failed and/or not a valid directory.
          error++;
          end();
        }
      });
    })(i, items[i]);
  },

};
