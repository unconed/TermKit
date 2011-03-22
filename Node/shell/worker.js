require.paths.unshift('.');
require.paths.unshift('..');
require.paths.unshift('shell');

var builtin = require('builtin'),
    returnObject = require('misc').returnObject,
    spawn = require('child_process').spawn,
    view = require('view/view');

// Set up worker command processor.
var workerProcessor = function (commandStream, returnStream) {
  // Set up stream callbacks.
  var that = this;
  commandStream.on('data', function (data) { that.data(data); });
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
        var that = this;

        if (typeof message.sequence == 'number') {
          if (workerProcessor.handlers[message.method]) {
            // Define convenient invocation callback.
            var invoke = function (method, args) {
              that.send(message.sequence, method, args);
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
    var list = new commandList(tokens, invoke, exit);
    list.go();
  },
};

/**
 * A pipeline of commands.
 */
var commandList = function (tokens, invoke, exit) {
  if (tokens[0].constructor != [].constructor) {
    tokens = [tokens];
  }

  // Make invocation callbacks

  // Spawn command units.
  var that = this;
  this.units = tokens.map(function (command) { return new commandUnit(command, invoke); });
  
  // Link together pipes.
  var last, i;
  for (i in units) (function (unit) {
    if (last && unit) {
      last.link(unit);
    }
    last = unit;
  })(units[i]);
  
  // Add output formatter at the end.
  this.formatter = new outputFormatter(last, invoke, exit);

};

commandList.prototype = {
  go: function () {
    // Begin processing.
    for (i in this.units) (function (unit) {
      unit.go();
    })(units[i]);
  },
};

/**
 * A single command in a pipeline.
 */
var commandUnit = function (command, invoke) {
  this.command = command;
  this.invoke = invoke;

  this.spawn();
};

commandUnit.prototype = {

  spawn: function () {},
  go: function () {},
  
  link: function (to) {
    // Link this stdout to next stdin (data stream).
    this.process.stdout.on('data', function (data) {
      to.process.stdin.write(data);
    });
    this.process.on('exit', function () {
      to.process.stdin.end();
    });
  },
};

/**
 * Built-in command.
 */
commandUnit.builtinCommand = function (command, invoke) {
  commandUnit.apply(this, arguments);
}

commandUnit.builtinCommand.prototype = new commandUnit();
commandUnit.builtinCommand.prototype.spawn = function () {
  var that = this,
      prefix = this.command[0];
  
  if (this.handler = builtin.shellCommands[prefix]) {
    
    var process = {
      stdin: new EventEmitter(),
      stdout: new EventEmitter(),
    };

    // Set up fake stdin.
    process.stdin.write = function (data) {
      process.stdin.emit('data', data);
    };
    process.stdin.end = function () {
      
    };
  
    // Set up fake stdout.
    process.stdout.write = function (data) {
      process.stdout.emit('data', data);
    };
    
    this.process = process;
  }
  else {
    throw "No such built-in command '" + prefix
  }
};

commandUnit.builtinCommand.prototype.go = function () {
  var that = this;
  async(function () {
    that.handler.call(that, that.command, that.invoke);
  });
};

/**
 * UNIX command.
 */
commandUnit.unixCommand = function (command, invoke) {
  commandUnit.apply(this, arguments);
}

commandUnit.unixCommand.prototype = new commandUnit();

commandUnit.unixCommand.prototype.spawn = function () {
  var command = this.command,
      prefix = command.shift();
  this.process = spawn(prefix, command);
};

commandUnit.unixCommand.prototype.go = function () {
  // Add MIME headers to raw output from process (fake output).
  this.process.stdout.write('Content-Type: application/octet-stream\r\n\r\n');
};


/**
 * Output formatter.
 * Takes stdout from processing pipeline and turns it into visible view output.
 */
var outputFormatter = function (tail, invoke, exit) {
  var that = this;
  this.identified = false;
  this.buffer = '';
  this.headers = {};
  this.invoke = invoke;

  tail.process.stdout.on('data', function (data) {
    that.data(data);
  });
  tail.on('exit', function (code, signal) {
    this.invoke = function () {};
    // todo: pass on signal
    exit(code);
  });
};

outputFormatter.prototype = {

  parseHeaders: function (headers) {
    headers = headers.toString();
    do {
      var field = /^([^:]+): +([^\r\n]+|(?:\r\n )+)/(headers);
      this.headers[field[1]] = field[2].replace(/\r\n /g, '');
    } while (field.length);

    var out = new view.bridge(this.invoke);
    out.print('outputFormatter headers '+ JSON.stringify(this.headers));
  },
  
  // Parse MIME headers for stream
  data: function (data) {
    this.buffer += data;
    
    if (!this.identified) {
      while (this.buffer.indexOf("\r\n\r\n") >= 0) {
        var chunk = this.buffer.split("\r\n\r\n").shift();
        this.parseHeaders(chunk);
        this.buffer = this.buffer.substring(chunk.length + 1);
      }
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
var that = this,
    socketPath = '/tmp/termkit-worker-' + Math.floor(Math.random() * 1000000) +'.socket';
var socketStream = net.createServer(function (stream) {
  that.socketStream = stream;
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