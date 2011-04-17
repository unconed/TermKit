var EventEmitter = require("events").EventEmitter,
    outputFormatter = require('shell/formatter').formatter;
    spawn = require('child_process').spawn,
    builtin = require('shell/builtin'),
    view = require('view/view'),
    meta = require('shell/meta'),

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
  this.emitter = new EventEmitter();

  // Generate 'view out' invoke method locked to one view.
  this.invoke = function (method, args) {
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

    // Attach view's emitter to viewstream.
    processor.attach(view.id, view.emitter);
  }

  // Allocate view streams on client side.
  processor.notify('view.open', {
    rel: rel,
    views: views.map(function (v) { return v.id; }),
  });

  // Track exit of processes.
  var returns = [],
      track = whenDone(function () {
        // Detach all views.
        processor.notify('view.close', {
          views: views.map(function (v) { return v.id; }),
        });

        // Return the last exit info to the shell.
        exit.apply(null, returns);
      });

  // Create command units.
  var that = this;
  this.units = tokens.map(function (command, i) {
    // Track exit invocation.
    var exit = track(function (success, object) {
      // Save output from last command.
      if (i == n - 1) {
        returns = [ success, object ];
      }
    });
    return new exports.commandUnit.builtinCommand(command, views[i].emitter, views[i].invoke, exit);
  });
  
  // Spawn and link together.
  var last, i;
  for (i in this.units) (function (unit) {
    unit.spawn();
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
 * A single command in a pipeline.
 */
exports.commandUnit = function (command, emitter, invoke, exit) {
  this.command = command;
  this.emitter = emitter;
  this.invoke = invoke;
  this.exit = exit;
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
exports.commandUnit.builtinCommand = function (command, emitter, invoke, exit) {
  exports.commandUnit.apply(this, arguments);
}

exports.commandUnit.builtinCommand.prototype = new exports.commandUnit();

exports.commandUnit.builtinCommand.prototype.spawn = function () {
  var that = this,
      prefix = this.command[0];
  if (this.handler = builtin.shellCommands[prefix]) {
    
    // Make fake process.
    var fake    = new EventEmitter();
    fake.stdin  = new EventEmitter();
    fake.stdout = new EventEmitter();
    fake.stderr = new EventEmitter();

    // Set up fake stdin.
    fake.stdin.write = function (data) {
      fake.stdin.emit('data', data);
    };
    fake.stdin.end = function () {
    };
  
    // Set up fake stdout.
    fake.stdout.write = function (data) {
      fake.stdout.emit('data', data);
    };
    fake.stdout.end = function () {
    };

    // Set up fake stderr.
    fake.stderr.write = function (data) {
      fake.stderr.emit('data', data);
    };
    fake.stderr.end = function () {
    };
    
    this.process = fake;
  }
  else {
    throw "No such built-in command '" + prefix;
  }
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
    that.process.emit('exit', !success);
    that.exit(success, object);
  };
  
  async(function () {
    that.handler.call(that, that.command, pipes, exit);
  });
};

/**
 * UNIX command.
 */
exports.commandUnit.unixCommand = function (emitter, command, invoke, exit) {
  exports.commandUnit.apply(this, arguments);
}

exports.commandUnit.unixCommand.prototype = new exports.commandUnit();

exports.commandUnit.unixCommand.prototype.spawn = function () {
  var that = this,
      command = this.command,
      prefix = this.prefix = command.shift();

  this.process = spawn(prefix, command);

  this.process.on('exit', function (code) {
    that.exit(code);
  });
};

exports.commandUnit.unixCommand.prototype.go = function () {

  // Add MIME headers to raw output from process.
  var headers = new meta.headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('X-TermKit-Command', prefix);
  headers.set('X-TermKit-Arguments', command);
  this.process.stdout.write(headers.generate());

};


