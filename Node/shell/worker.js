require.paths.unshift('.');
require.paths.unshift('shell');

var builtin = require('builtin'),
    returnObject = require('util').returnObject;
    
// Set up worker command processor.
var workerProcessor = function (commandStream, returnStream) {
  // Set up stream callbacks.
  var self = this;
  commandStream.on('data', function (data) { self.data(data); });
  commandStream.on('end', function () { });
  this.returnStream = returnStream;
  
  this.buffer = '';
};

workerProcessor.prototype = {
  // Zero-delimited framing.
  data: function (data) {
    this.buffer += data;
    while (this.buffer.indexOf("\u0000") >= 0) {
      var chunk = this.buffer.split("\u0000").shift();
      this.receive(chunk);
      this.buffer = this.buffer.substring(chunk.length + 1);
    }
  },
  
  // Parse JSON command.
  receive: function (data) {
    try {
      var message = JSON.parse(data);
      if (message && message.sequence && message.method && message.args) {
        var self = this;

        if (typeof message.sequence == 'number') {
          if (workerProcessor.handlers[message.method]) {
            // Define convenient invocation callback.
            var invoke = function (method, args) {
              self.send(message.sequence, method, args);
            };
            // Define convenient exit callback.
            var returned = false;
            var exit = function (value, object) {
              if (!returned) {
                invoke('return', returnObject(value, object));
                returned = true;
              }
            };
            // Invoke handler.
            workerProcessor.handlers[message.method].call(this, message.args, invoke, exit);
          }
        }
      }
    }
    catch (e) {
    }
  },
  
  // Reply with method call.
  send: function (sequence, method, args) {
    var data = JSON.stringify({ sequence: sequence, method: method, args: args });
    this.returnStream.write(data + "\u0000");
  },
  
  // Sync up environment variables.
  sync: function (invoke) {
    var environment = {
      cwd: process.cwd(),
      home: process.env.HOME,
      user: process.env.USER,
      uid: process.getuid(),
      gid: process.getgid(),
      path: process.env.PATH.split(':'),
      manPath: process.env.MANPATH,
      defaultShell: process.env.SHELL,
    };
    invoke('shell.environment', environment);
  },
};

workerProcessor.handlers = {
  "init": function (args, invoke, exit) {
    this.sync(invoke);
    exit(false);
  },
  "run": function (args, invoke, exit) {
    var tokens = args.tokens;

    var lead = tokens[0], handler;
    if (handler = builtin.shellCommands[lead]) {
      handler.call(this, tokens, invoke, exit);
    }
    else {
      // TODO: Replace with viewstream stderr equivalent
      exit(true);
    }
  },
};

// Set up streams.
var commandStream = process.openStdin(),
    returnStream = process.stdout;

var p = new workerProcessor(commandStream, returnStream);




/*
SYNC
invoke('shell.environment', this.environment);
*/

/*
RUN

*/

/*
var fs = require('fs');

if (process.argc < 3) {
  return;
}

// Set up additional in/out stream.
var self = this,
    socketPath = '/tmp/termkit-worker-' + Math.floor(Math.random() * 1000000) +'.socket';
var socketStream = net.createServer(function (stream) {
  self.socketStream = stream;
});
socketStream.listen(socketPath)

// Set up worker configuration.
var config = {
  socketPath: socketPath,
  environment: env,
};

var config = JSON.parse(process.argv[2]);

var commandStream = fs.createReadStream(config.socketPath, {
  'flags': 'r',
  'encoding': null,
  'mode': 0666,
  'bufferSize': 4 * 1024,
});

var viewStream = fs.createWriteStream(config.socketPath, {
  'flags': 'w',
  'encoding': null,
  'mode': 0666,
  'bufferSize': 4 * 1024,
});

console.log('commandStream ' + commandStream);
console.log('viewStream ' + viewStream);
//
//

*/