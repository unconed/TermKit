exports.shellCommands = {
  'cd': function (tokens, invoke, exit) {
    if (tokens.length != 2) {
      return exit(true);
    }
    var path = tokens[1];

    try {
      process.chdir(path);
    }
    catch (error) {
      return exit(true);
    }

    this.sync(invoke);
    exit(false);
  },
};

    /*
    // Resolve relative paths.
    if (path[0] != '/') {
      path = process.cwd() + '/' + path;
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
*/