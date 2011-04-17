var fs = require('fs'),
    view = require('view/view'),
    composePath = require('misc').composePath,
    whenDone = require('misc').whenDone,
    EventEmitter = require('events').EventEmitter,
    async = require('misc').async,
    meta = require('shell/meta');

exports.shellCommands = {

  'cat': function (tokens, pipes, exit) {
    var out = new view.bridge(pipes.viewOut);
    var chunkSize = 4096;

    // "cat <file> [file ...]" syntax.
    if (tokens.length < 2) {
      out.print('Usage: cat <file> [file] ...');
      return exit(false);
    }
    
    var errors = 0,
        track = whenDone(function () {
          exit(errors == 0);
        });
    
    for (i in tokens) if (i > 0) (function (file) {
      fs.stat(file, track(function (err, stats) {
        if (err) {
          errors++;
          out.print("No such file (" + file + ")");
          return;
        }
        fs.open(file, 'r', track(function (err, fd) {
          if (err) {
            errors++;
            out.print("Unable to open file (" + file + ")");
            return;
          }
          
          var position = 0, buffer = new Buffer(chunkSize);

          (function read() {
            fs.read(fd, buffer, 0, chunkSize, position, track(function (err, bytesRead) {
              if (err) {
                errors++;
                out.print("Error reading file (" + file + ")");
                return;
              }

              if (position == 0) {
                var headers = new meta.headers();
                headers.set({
                  'Content-Type': meta.sniff(file, buffer),
                  'Content-Length': stats.size,
                  'Content-Disposition': {
                    attachment: true,
                    filename: file,
                  },
                });

                pipes.dataOut.write(headers.generate());
              }

              pipes.dataOut.write(buffer.slice(0, bytesRead));
              position += bytesRead;

              if (position < stats.size) {
                read();
              }
            }));
          })();
        }));
      }));
    })(tokens[i]);
    
    
  },

  'echo': function (tokens, pipes, exit) {
    var out = new view.bridge(pipes.viewOut);

    tokens.shift();
    out.print(tokens.join(' '));

    exit(true);
  },

  'pwd': function (tokens, pipes, exit) {
    var out = new view.bridge(pipes.viewOut);

    var cwd = process.cwd();
    out.print('Working Directory: ' + cwd);
    
    exit(true);
  },

  'cd': function (tokens, pipes, exit) {

    var out = new view.bridge(pipes.viewOut);
    
    // Validate syntax.
    if (tokens.length > 2) {
      out.print('Usage: cd [dir]');
      return exit(false);
    }
    var path = tokens[1] || process.env.HOME;

    // Try to change working dir.
    try {
      process.chdir(path);
    }
    catch (error) {
      out.print(error.message + ' (' + path + ')');
      return exit(false);
    }

    exit(true);
  },

  'ls': function (tokens, pipes, exit) {
    
    var out = new view.bridge(pipes.viewOut);

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
      exit(errors == 0);
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
              files.sort(function (a, b) { 
                return a.localeCompare(b);
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
    })(i, items[i]); // for i in items

  },

};
