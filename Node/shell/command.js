var EventEmitter = require("events").EventEmitter,
    outputFormatter = require('shell/formatter').formatter;
    spawn = require('child_process').spawn,
    builtin = require('shell/builtin'),
    view = require('view/view'),

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
    args.stream = id;
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
  processor.notify('stream.open', {
    rel: rel,
    streams: views.map(function (v) { return v.id; }),
  });

  // Track exit of processes.
  var returns = [],
      track = whenDone(function () {
        // Detach all views.
        processor.notify('stream.close', {
          streams: views.map(function (v) { return v.id; }),
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
  this.formatter = new outputFormatter(last, views[n].invoke);
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
    throw "No such built-in command '" + prefix;
  }
};

exports.commandUnit.builtinCommand.prototype.go = function () {
  var that = this;
  async(function () {
    that.handler.call(that, that.command, that.emitter, that.invoke, that.exit);
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
  this.process.stdout.write('Content-Type: application/octet-stream\r\n');
  this.process.stdout.write('X-Command: '+ prefix + '\r\n');
  this.process.stdout.write('X-Arguments: '+ mimify(command) + '\r\n\r\n');

  function mimify(object) {
    function escape(string) {
      return string.replace(/[\\"]/g, '\\$0');
    }
    
    if (object.constructor == [].constructor) {
      var out = [];
      for (i in object) {
        out.push(mimify(object[i]));
      }
      return out.join(' ');
    }
    
    if (object.constructor == ''.constructor) {
      return '"' + escape(object) +'"';
    }

    return '' + object;
  }
};


