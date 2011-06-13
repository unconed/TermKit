var EventEmitter = require("events").EventEmitter,
    outputFormatter = require('shell/formatter').formatter;
    spawn = require('child_process').spawn,
    view = require('view/view'),
    meta = require('shell/meta'),
    builtin = require('shell/builtin/builtin'),
    async = require('misc').async,
    whenDone = require('misc').whenDone,
    returnObject = require('misc').returnObject,

    outputViewCounter = 1;

/**
 * Represents a remote view for a command.
 */
exports.outputView = function (processor) {
  var id = this.id = outputViewCounter++;

  // Generate 'view in' emitter for this view.
  // Fires 'message' events on pipes.viewIn.
  this.emitter = new EventEmitter();
  this.emit = function (message) {
    this.emitter.emit('message', message.method, message.args);
  };

  // Generate 'view out' invoke method pipes.viewOut(), locked to one view.
  this.invoke = function (method, args) {
    args = args || {};
    args.view = id;
    processor.notify(method, args);
  };
};

/**
 * A pipeline of commands.
 */
exports.commandList = function (processor, tokens, exit, rel) {
  if (tokens[0].constructor != [].constructor) {
    tokens = [tokens];
  }

  // Allocate n + 1 views.
  var views = [], n = tokens.length;
  for (var i = 0; i <= n; ++i) {
    view = new exports.outputView(processor);
    views.push(view);
  }

  // Allocate view streams on client side.
  processor.notify('view.open', {
    rel: rel,
    views: views.map(function (view) {
      // Attach view's emitter to viewstream.
      processor.attach(view);
      return view.id;
    }),
  });

  // Track exit of processes.
  var returns = [],
      track = whenDone(function () {
        // Detach all views.
        processor.notify('view.close', {
          views: views.map(function (view) {
            // Detach view's emitter from viewstream.
            processor.detach(view);
            return view.id;
          }),
        });

        // Return the last exit info to the shell.
        exit.apply(null, returns);
      });

  // Create command units.
  var that = this,
      environment = processor.environment();
  this.units = tokens.map(function (command, i) {
    // Track exit invocation.
    var exit = track(function (success, object) {
      // Save output from last command.
      if (i == n - 1) {
        returns = [ success, object ];
      }
    });
    return exports.commandFactory(command, views[i].emitter, views[i].invoke, exit, environment);
  });
  
  // Spawn and link together.
  var last, i;
  for (i in this.units) (function (unit) {
    if (last && unit) {
      last.link(unit);
    }
    last = unit;
  })(this.units[i]);
  
  // Add output formatter at the end.
  this.formatter = new outputFormatter(last, views[n].invoke, track(function () { }));
};

exports.commandList.prototype = {
  go: function () {
    // Begin processing.
    for (var i in this.units) (function (unit) {
      unit.go();
    })(this.units[i]);
  },
};

/**
 * Command unit factory.
 */
exports.commandFactory = function (command, emitter, invoke, exit, environment) {
  var unit;
  try {
    // Try built-in.
    unit = new exports.commandUnit.builtinCommand(command, emitter, invoke, exit, environment);
    unit.spawn();
  }
  catch (e) {
    try {
      // Try native command.
      unit = new exports.commandUnit.unixCommand(command, emitter, invoke, exit, environment);
      unit.spawn();
    }
    catch (e) {
      // Execute null.js fallback.
      unit = new exports.commandUnit.builtinCommand(command, emitter, invoke, exit, environment);
      unit.override = 'null';
      unit.spawn();
    }
  }
  
  return unit;
};

/**
 * A single command in a pipeline.
 */
exports.commandUnit = function (command, emitter, invoke, exit, environment) {
  this.command = command;
  this.emitter = emitter;
  this.invoke = invoke;
  this.exit = exit;
  this.environment = environment;
};

exports.commandUnit.prototype = {

  spawn: function () {
    this.process = {
      stdin: new EventEmitter(),
      stdout: new EventEmitter(),
    };  
  },
  
  go: function () { },
  
  link: function (to) {
    var that = this;
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
exports.commandUnit.builtinCommand = function (command, emitter, invoke, exit, environment) {
  exports.commandUnit.apply(this, arguments);
}

exports.commandUnit.builtinCommand.prototype = new exports.commandUnit();

exports.commandUnit.builtinCommand.prototype.spawn = function () {
  var that = this,
      prefix = this.override || this.command[0];

  // Look up command.
  if (!builtin.commands[prefix]) {
    throw "Unknown command '"+ prefix +"'";
  }

  // Load handler.
  try {
    this.handler = require('builtin/' + prefix);
  } catch (e) {
    throw "Error loading handler '"+ prefix +"': " + e;
  }
  
  // Make fake process.
  var fake    = new EventEmitter();
  fake.stdin  = new EventEmitter();
  fake.stdout = new EventEmitter();
  fake.stderr = new EventEmitter();

  // Helper for converting strings to buffers.
  function buffer(data) {
    if (data.constructor != Buffer) {
      data = new Buffer(data, 'utf8');
    }
    return data;
  }

  // Set up fake stdin.
  fake.stdin.write = function (data) {
    fake.stdin.emit('data', buffer(data));
  };
  fake.stdin.end = function () {
    fake.stdin.emit('end');
    fake.stdin = null;
  };

  // Set up fake stdout.
  fake.stdout.write = function (data) {
    fake.stdout.emit('data', buffer(data));
  };
  fake.stdout.end = function () {
    fake.stdout.emit('end');
    fake.stdout = null;
  };

  // Set up fake stderr.
  fake.stderr.write = function (data) {
    fake.stderr.emit('data', buffer(data));
  };
  fake.stderr.end = function () {
  };
  
  this.process = fake;
};

exports.commandUnit.builtinCommand.prototype.go = function () {
  var that = this;
  
  var pipes = {
    dataIn: this.process.stdin,
    dataOut: this.process.stdout,
    errorOut: this.process.stderr,
    viewIn: this.emitter,
    viewOut: this.invoke,
  };

  // Wrap exit handler to allow fake process to emit an exit event.
  var exit = function (success, object) {
    // Close dangling pipes.
    that.process.stdout && that.process.stdout.emit('end');

    // Notify of exit and send back return code.
    that.process.emit('exit', !success);
    that.exit(success, object);
  };
  
  async(function () {
    that.handler.main.call(that, that.command, pipes, exit, this.environment);
  });
};

/**
 * UNIX command.
 */
exports.commandUnit.unixCommand = function (command, emitter, invoke, exit, environment) {
  exports.commandUnit.apply(this, arguments);
}

exports.commandUnit.unixCommand.prototype = new exports.commandUnit();

exports.commandUnit.unixCommand.prototype.spawn = function () {
  var that = this,
      command = this.command,
      prefix = (this.prefix = command.shift());

  this.process = spawn(prefix, command);

  this.process.on('exit', function (code) {
    that.exit(!code, { code: code });
  });
};

exports.commandUnit.unixCommand.prototype.go = function () {

  // Add MIME headers to raw output from process.
  var headers = new meta.headers();
  headers.set('Content-Type', [ 'application/octet-stream', { schema: 'termkit.unix' } ]);
  this.process.stdout.emit('data', headers.generate());

};


