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

  // Parse out directory references to list.
  var items = [];
  if (tokens.length <= 1) {
    items.push(process.cwd());
  }
  else {
    for (i in tokens) if (i > 0) {
      items.push(tokens[i]);
    }
  }
  
  //application/json; schema=termkit.files

  // Prepare async job tracker.
  var errors = 0;
  var output = [];
  var track = whenDone(function () {
    for (i in output) {
      // Output one directory listing at a time.
      out.print(view.list(i, output[i]));
    }
    exit(errors == 0);
  }); // whenDone

  // Process arguments (list of paths).
  for (var i in items) (function (i, path) {

    output[i] = [];

    // Expand path
    expandPath(path, track(function (path) {
      // Stat the requested files / directories.
      fs.stat(path, track(function (error, stats) {

        // Iterate valid directories.
        if (stats && stats.isDirectory()) {

          // Scan contents of found directories.
          fs.readdir(path, track(function (error, files) {
            if (!error) {

              var children = [];
              files.sort(function (a, b) { 
                return a.toLowerCase().localeCompare(b.toLowerCase());
              });

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
    })); // expandPath

  })(i, items[i]); // for i in items

};