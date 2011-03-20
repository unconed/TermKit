var fs = require('fs'), net = require('net');

var spawn = require('child_process').spawn,
    exec = require('child_process').exec;

exports.shell = function (sequence, args, exit, router) {

  this.router = router;
  this.buffer = "";

  var user = args.user || process.env.USER;
  var self = this;
  
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
    p && p.stdout.on('data', function (data) { self.receive(data); });

    // Initalize worker.
    this.send(sequence, 'init', args);
  }
  else {
    // Report error.
    exit(true);
  }
};

exports.shell.prototype = {
  run: function (sequence, args) {
    this.send(sequence, 'run', args);
  },
  
  close: function () {
    this.process.stdin.close();
  },
  
  send: function (sequence, method, args) {
    var json = JSON.stringify({ sequence: sequence, method: method, args: args });
    console.log('shell sending '+json);
    this.process.stdin.write(json + "\u0000");
  },
  
  receive: function (data) {
    this.buffer += data;
    while (this.buffer.indexOf("\u0000") >= 0) {
      var chunk = this.buffer.split("\u0000").shift();
      var message = JSON.parse(chunk);

      console.log('shell receiving '+chunk);
      this.router.send(this.id, message.sequence, message.method, message.args);
      this.buffer = this.buffer.substring(chunk.length + 1);
    }
  }
};

