var view = require('view/view'),
    whenDone = require('misc').whenDone,
    meta = require('shell/meta'),
    http = require('http'),
    url = require('url');
    
exports.main = function (tokens, pipes, exit, environment) {
  var out = new view.bridge(pipes.viewOut);
  var chunkSize = 16384;

  // "get <url>" syntax.
  if (tokens.length < 2) {
    out.print('Usage: get <url>');
    return exit(false);
  }
  if (tokens.length > 2) {
    out.print('Multiple input urls not supported yet.');
    return exit(false);
  }
  
  var errors = 0,
      track = whenDone(function () {
        exit(errors == 0);
      });
  
  for (i in tokens) if (i > 0) (function (token) {

    // Parse URL
    var parsed = url.parse(token);
    var path = parsed.pathname;
    if (parsed.query) {
      path += '?' + parsed.query;
    }

    // HTTP GET
    var options = {
      host: parsed.host,
      port: parsed.port || 80,
      path: path,
    };
    var request = http.get(options), received = 0, length = 0;
    request.on('response', function (res) {
      var headers = res.headers;
      process.stderr.write('headers '+ JSON.stringify(res.headers) + "\n\n");
      
      length = headers['content-length'];
      if (length !== null) {
        progress = length > 16 * 1024; // yes, this is arbitrary
        if (progress) {
          out.print(view.progress('progress', 0, 0, length));
        }
      }
      
      var mime = new meta.headers();
      for (i in headers) {
        var key = i.replace(/(^|-)(.)/g, function (x,a,b) { return a + b.toUpperCase(); });
        mime.set(key, headers[i].toString('utf8'), null, true);
      }
      
      // Write headers straight through.
      pipes.dataOut.write(mime.generate());
      
      res.on('data', function (data) {
        // Track progress.
        received += data.length;
        progress && out.update('progress', { value: received });
        
        // Pipe out.
        pipes.dataOut.write(data);
      });

      res.on('end', function () {
        process.stderr.write('received ' + received + ' length ' + length);
        out.remove('progress');
        exit(true);
      });
    });

    request.on('error', function () {
      out.remove('progress');
      exit(false);
    });
    
    
  })(tokens[i]); // for i in tokens
};
