var fs = require('fs'), net = require('net');

var spawn = require('child_process').spawn,
    exec = require('child_process').exec;

var config = require('../config').getConfig();

/**
 * Interface to shell worker.
 *
 * Spawns worker.js and sends messages to it.
 */
exports.shell = function (args, router) {

  this.router = router;
  this.buffer = "";

  // Get user
  var user = args.user || process.env.USER;
  var that = this;
  
  // Extract location of source.
  var p, path = process.argv[1].split('/');
  path[path.length - 1] = 'shell/worker.js';
  path = path.join('/');
  
  // Determine user identity.
  if (user == process.env.USER) {
    // Spawn regular worker.
    p = this.process = spawn('node', [ path ], {
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
    });

    // Bind stdout receiver.
    p && p.stdout.on('data', function (data) { that.receive(data); });

    // Bind stderr receiver.
    p && p.stderr.on('data', function (data) { that.error(data); });
  }
  else {
    throw "Error spawning worker.js.";
  }
  
  // Sync up configuration.
  this.sync();
  config.on('change', function () { that.sync(); });
};

exports.shell.prototype = {
  // Send configuration to worker.
  sync: function () {
    this.send(null, 'shell.config', config.get());
  },
  
  // Dispatch message from router to worker.
  dispatch: function (query, method, args, exit) {
    this.send(query, method, args);
  },

  // Close worker.
  close: function () {
    this.process.stdin.end();
  },
  
  // Send query to worker.
  send: function (query, method, args) {
    var json = JSON.stringify({ query: query, method: method, args: args });
    this.process.stdin.write(json + "\u0000");
  },
  
  // Log error.
  error: function (data) {
    console.log('worker: ', data.toString());
  },
  
  // Receive message from worker.
  receive: function (data) {
    this.buffer += data;
    while (this.buffer.indexOf("\u0000") >= 0) {
      // Cut off chunk.
      var chunk = this.buffer.split("\u0000").shift();
      this.buffer = this.buffer.substring(chunk.length + 1);

      // Parse message.
      var message = JSON.parse(chunk);

      // Intercept config changes.
      if (message.method == 'shell.config') {
        config.replace(message.args);
        return;
      }

      // Lock message to this session and forward.
      message.session = this.id;
      this.router.forward(message);
    }
  }
};

