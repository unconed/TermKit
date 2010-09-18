var fs = require('fs');

var spawn = require('child_process').spawn,
    exec = require('child_process').exec;

exports.shell = function (server, connection) {
  //for (i in process.env) console.log(i + ' = '+process.env[i]);
  this.environment = {
    sessionId: 0,
    cwd: process.env.HOME,
    home: process.env.HOME,
    user: process.env.USER,
    uid: process.getuid(),
    gid: process.getgid(),
    path: process.env.PATH.split(':'),
    manPath: process.env.MANPATH,
    defaultShell: process.env.SHELL,
  };

  this.worker = new exports.shell.worker(this.environment);
};

exports.shell.prototype = {
  
  get id() {
    return this.environment.sessionId;
  },
  set id(id) {
    this.environment.sessionId = id;
  },
  
  get cwd() {
    return this.environment.cwd;
  },
  set cwd(cwd) {
    this.environment.cwd = cwd;
  },

  run: function (args, invoke, exit) {
    var tokens = args.tokens;
    console.log('shell.run: ' + tokens.join(' '));
    
    var lead = tokens[0], handler;
    if (handler = exports.shell.commands[lead]) {
      handler.call(this, tokens, invoke, exit);
    }
    else {
      // TODO: Replace with viewstream stderr equivalent
      exit(true);
    }
  },
  
  sync: function (invoke) {
    invoke('shell.environment', this.environment);
  },
};

exports.shell.commands = {
  'cd': function (tokens, invoke, exit) {
    if (tokens.length != 2) {
      return exit(true);
    }
    var path = tokens[1], self = this;

    // Resolve relative paths.
    if (path[0] != '/') {
      path = this.cwd + '/' + path;
    }

    // Fetch absolute path.
    fs.realpath(path, function (err, path) {
      console.log('realpath', path);
      if (err) {
        return exit(true);
      }
        
      // See if path exists.
      fs.stat(path, function (err, stats) {
        console.log('stat', stats);
        if (!err && stats.isDirectory()) {
          self.cwd = path;
          self.sync(invoke);
          exit();
        }
        else {
          exit(true);
        }
      });
    });
  },
};

exports.shell.worker = function (env) {
  // Extract location of source.
  var path = process.argv[1].split('/');
  path[path.length - 1 ] = 'shell/worker.js';
  path = path.join('/');

  if (env.user == process.env.USER) {
    // Spawn regular worker.
    spawn('node', [ path ], { cwd: process.cwd() });
  }
  else {
    // Spawn sudo worker.
    
  }
};

/*
stats.isFile()
stats.isDirectory()
stats.isBlockDevice()
stats.isCharacterDevice()
stats.isSymbolicLink() (only valid with fs.lstat())
stats.isFIFO()
stats.isSocket()
*/