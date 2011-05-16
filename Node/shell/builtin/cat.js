var fs = require('fs'),
    view = require('view/view'),
    whenDone = require('misc').whenDone,
    meta = require('shell/meta'),
    expandPath = require('misc').expandPath;

exports.main = function (tokens, pipes, exit) {
  var out = new view.bridge(pipes.viewOut);
  var chunkSize = 16384;

  // "cat <file> [file ...]" syntax.
  if (tokens.length < 2) {
    out.print('Usage: cat <file> [file] ...');
    return exit(false);
  }
  if (tokens.length > 2) {
    out.print('Multiple input files not supported yet.');
    return exit(false);
  }
  
  var errors = 0,
      track = whenDone(function () {
        exit(errors == 0);
      });
  
  for (i in tokens) if (i > 0) (function (file) {
    expandPath(file, track(function (file) {
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

          var position = 0;

          (function read() {
            var buffer = new Buffer(chunkSize);
            fs.read(fd, buffer, 0, chunkSize, position, track(function (err, bytesRead) {
              if (err) {
                errors++;
                out.print("Error reading file (" + file + ")");
                return;
              }

              var slice = buffer.slice(0, bytesRead);

              if (position == 0) {
                var headers = new meta.headers(),
                    keys = file.split('/');
                headers.set({
                  'Content-Type': meta.sniff(file, slice),
                  'Content-Length': stats.size,
                  'Content-Disposition': [ 'attachment', { 'filename': keys.pop() } ],
                });

                pipes.dataOut.write(headers.generate());
              }

              pipes.dataOut.write(slice);
              position += bytesRead;

              if (position < stats.size) {
                read();
              }
            })); // fs.read
          })(); // read
        })); // fs.open
      })); // fs.stat
    })); // expandPath
  })(tokens[i]); // for i in tokens
};
