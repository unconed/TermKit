var command = require('shell/command'),
    returnMeta = require('misc').returnMeta;

// Set up worker command processor.
var workerProcessor = exports.processor = function (inStream, outStream) {
  // Set up stream callbacks.
  var that = this;
  inStream.on('data', function (data) { that.data(data); });
  inStream.on('end', function () { });
  this.outStream = outStream;
  
  this.buffer = '';
  
  // Event emitters for callbacks.
  this.emitters = {};
};

exports.processor.prototype = {
  // Process zero-delimited framing.
  data: function (data) {
    this.buffer += data;
    while (this.buffer.indexOf("\u0000") >= 0) {
      var chunk = this.buffer.split("\u0000").shift();
      this.receive(chunk);
      this.buffer = this.buffer.substring(chunk.length + 1);
    }
  },

  // Reply with message.
  send: function (message) {
    var data = JSON.stringify(message);
    this.outStream.write(data + "\u0000");
  },
  
  // Parse JSON command.
  receive: function (data) {
    try {
      var message = JSON.parse(data);
      if (typeof message == 'object') {
        var that = this,
            exit, returned;
            
        // Find handler.
        var handler = workerProcessor.handlers[message.method];

        // Create callbacks for query answers.
        if (typeof message.query == 'number') {
          // Define convenient exit callback.
          exit = function (success, object, meta) {
            
            if (!returned) {
              meta = meta || {};
              meta.success = success;

              meta.answer = message.query;
              meta.args = object;

              that.send(meta);
              returned = true;
            }
          };

        }

        if (typeof message.answer == 'number') {
          // unsupported. worker can't make queries.
          return;
        }

        handler && handler.call(this, message.args, exit);
      }
    }
    catch (e) {
    }
  },
  
  // Invoke an asynchronous method.
  notify: function (method, args) {
    var message = {
      method: method,
      args: args,
    };
    this.send(message);
  },
  
  // Return the environment.
  environment: function () {
    return {
      cwd: process.cwd(),
      home: process.env.HOME,
      user: process.env.USER,
      uid: process.getuid(),
      gid: process.getgid(),
      path: process.env.PATH.split(':'),
      manPath: process.env.MANPATH,
      defaultShell: process.env.SHELL,
    };
  },
};

workerProcessor.handlers = {

  "shell.environment": function (args, exit) {
    exit(true, this.environment());
  },
  
  "shell.run": function (args, exit) {
    var that = this,
        tokens = args.tokens,
        ref = args.ref;

    var shellExit = function (success, object, meta) {
      meta = meta || {};
      meta.environment = that.environment();
      exit(success, object, meta);
    };

    var list = new command.commandList(this, tokens, shellExit, ref);
    list.go();
  },

};
