var meta = require('shell/meta');

exports.main = function (tokens, pipes, exit, environment) {

  // Prepare text.
  tokens.shift();
  var data = tokens.join(' ');

  // Write headers.
  var headers = new meta.headers();
  headers.set({
    'Content-Type': [ 'text/plain', { charset: 'utf-8' } ],
    'Content-Length': data.length,
  });
  pipes.dataOut.write(headers.generate());

  // Write data.
  pipes.dataOut.write(data);

  exit(true);
};

