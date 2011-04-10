var fs = require('fs'), net = require('net');

var spawn = require('child_process').spawn,
    exec = require('child_process').exec;

exports.shell = function (args, router) {

  this.router = router;
  this.buffer = "";

  var user = args.user || process.env.USER;
  var that = this;
  
  // Extract location of source.
  var p, path = process.argv[1].split('/');
  path[path.length - 1] = 'shell/worker.js';
  path = path.join('/');
  
  // Determine user identity.
  if (user == process.env.USER) {
    console.log('spawning shell worker: ' + path);

    // Spawn regular worker.
    p = this.process = spawn('/usr/local/bin/node', [ path ], {
      cwd: process.cwd(),
    });
  }
  else {
    // Spawn sudo worker.
    console.log('sudo not implemented');
  }

  if (p) {
    // Bind exit.
    p.on('exit', function (code) {
      console.log('shell worker exited with code ' + code);
    });

    // Bind receiver.
    p && p.stdout.on('data', function (data) { that.receive(data); });

    // Bind receiver.
    p && p.stderr.on('data', function (data) { that.error(data); });
  }
  else {
    throw "Error spawning worker.js.";
  }
};

exports.shell.prototype = {
  dispatch: function (query, method, args, exit) {
    this.send(query, method, args);
  },

  close: function () {
    this.process.stdin.end();
  },
  
  send: function (query, method, args) {
    var json = JSON.stringify({ query: query, method: method, args: args });
    console.log('shell sending '+json);
    this.process.stdin.write(json + "\u0000");
  },
  
  error: function (data) {
    console.log('worker error', data.toString());
  },
  
  receive: function (data) {
    this.buffer += data;
    while (this.buffer.indexOf("\u0000") >= 0) {
      // Cut off chunk.
      var chunk = this.buffer.split("\u0000").shift();
      this.buffer = this.buffer.substring(chunk.length + 1);

      // Parse message.
      console.log('shell receiving '+chunk);
      var message = JSON.parse(chunk);

      // Lock message to this session and forward.
      message.session = this.id;
      this.router.forward(message);
    }
  }
};

