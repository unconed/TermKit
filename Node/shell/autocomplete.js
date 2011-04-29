var fs = require('fs'),
    builtin = require('shell/builtin');

/*

[X] shell.autocomplete commands
[ ] shell.autocomplete filesystem paths
[ ] commandView.command -> set handler & invoke
[ ] re-usable token icon set, accessed by namespaced class
  termkit-file       paper
  termkit-directory  folder
  termkit-command    gear

*/

exports.autocomplete = function () {
  this.keys = {};
};

exports.autocomplete.prototype = {
  
  process: function (cwd, tokens, offset, callback) {
    var prefix = tokens[offset];
    
    if (offset == 0) {
      var matches = this.builtin(prefix);
      this.filesystem(cwd, prefix, { executable: true }, function (m) {
        matches = matches.concat(m);
        matches.sort();
        callback(matches);
      });
    }
    else {
      this.filesystem(cwd, prefix, {  }, function (matches) {
        callback(matches);
      });
    }
    
  },
  
  builtin: function (prefix) {
    var matches = [];
    for (i in builtin.shellCommands) {
      if (prefix == '' || i.indexOf(prefix) === 0) {
        matches.push(i);
      }
    }
    matches.sort();
    return matches;
  },
  
  filesystem: function (path, prefix, options, callback) {
    var sticky = '';
    path = path || process.cwd();
    prefix = prefix || '';
    
    if (prefix[0] == '/') {
      prefix = prefix.substring(1);
      sticky = '/';
      path = '/';
    }
    else if (prefix.indexOf('/') != -1) {
      var split = prefix.split(/\//);
      path += '/' + split[0];
      prefix = split[1];
      sticky = split[0] + '/';
    }
    
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }
    
    options = extend({
      type: '*',
    }, options || {});
    
    var matches = [],
        track = whenDone(function () {
      matches.sort();
      callback(matches);
    });
    
    fs.readdir(path, track(function (err, files) {
      if (!err) {
        for (i in files) (function (file) {
          if (prefix == '' || file.indexOf(prefix) === 0) {
            matches.push(sticky + file);
          }
        })(files[i]);
      }
    }));
    
  },
  // matches: { string: { label: '...', icon: '...' }}
  
  // command
  // - builtin
  // - fs executables $path
  // - fs executables ./ foo/
  
  // argument: file
  // - fs path
  
  // argument: -flag
  // - command-spec built-in: [ cat ], flags: { -f: ..., -g: ... }
  // - command-spec man: [ git, checkout ], flags: { -f: ..., -g: ... }
  
  // argument: --parameter value
  // - command-spec built-in: [ cat ], params: { --foo: ... }
  // - command-spec man: [ cat ], params: { --foo: ... }
  
  add: function (category, string) {
    if (!this.keys[category]) {
      this.keys[category] = {};
    }
    if (!this.keys[category][string]) {
      this.keys[category][string] = true;
    }
  },
  
  complete: function (category, prefix, callback) {
    var matches = [];
    for (i in this.keys[category]) {
      if (i.indexOf(prefix) === 0) {
        matches.push(i);
      }
    }

    matches.sort();
    callback(matches);
  }
  
};
