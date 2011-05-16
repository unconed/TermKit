var fs = require('fs'),
    builtin = require('shell/builtin/builtin');

/*

[X] shell.autocomplete commands
[X] shell.autocomplete filesystem paths
[X] commandView.command -> set handler & invoke
[ ] re-usable token icon set, accessed by namespaced class
  termkit-file       paper
  termkit-directory  folder
  termkit-command    gear

*/

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


exports.autocomplete = function () {
  this.keys = {};
};

exports.autocomplete.prototype = {
  
  /**
   * Return autocompletion for given command context.
   */
  process: function (cwd, paths, tokens, offset, callback, ignoreCase) {
    var prefix = tokens[offset],
        matches = [],
        that = this;

    // Track asynchronous matches.
    var track = whenDone(function () {
      matches.sort(function (a, b) {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });
      var last = '', i = 0, n = matches.length;
      for (;i < n; ++i) {
        var label = matches[i].label;
        if (last == label) {
          matches.splice(i, 1);
          n--;
          i--;
        }
        last = label;
      }
      callback(matches);
    });
        
    if (offset == 0) {
      // Match built-in commands.
      var matches = this.builtin(prefix, ignoreCase);

      // Scan current dir for executables.
      this.filesystem(cwd, prefix, { ignoreCase: ignoreCase, executable: true }, track(function (files) {
        matches = matches.concat(files);
      }));

      // Scan search paths for executables.
      for (i in paths) (function (path) {
        that.filesystem(path, prefix, { ignoreCase: ignoreCase, executable: true }, track(function (files) {
          matches = matches.concat(files);
        }));
      })(paths[i]);      
    }
    else {
      // Scan current dir for files.
      this.filesystem(cwd, prefix, { ignoreCase: ignoreCase }, track(function (files) {
        matches = files;
      }));      
    }
    
  },
  
  /**
   * Complete built-in commands.
   */
  builtin: function (prefix, ignoreCase) {
    var matches = [];
    if (ignoreCase) {
      prefix = prefix.toLowerCase();
    }
    for (i in builtin.commands) {
      var key = i;
      if (ignoreCase) {
        key = key.toLowerCase();
      }
      if (prefix == '' || key.indexOf(prefix) === 0) {
        matches.push(exports.autocomplete.match(i, i + ' ', 'command'));
      }
    }
    matches.sort();
    return matches;
  },
  
  /**
   * Complete filesystem matches.
   */
  filesystem: function (path, prefix, options, callback) {
    var label = '';

    // Trailing slashes.
    function trail(path) {
      if (!(/\/$/(path))) {
        path += '/';
      }
      return path;
    }

    // Normalize context.
    path = trail(path || process.cwd());
    prefix = prefix || '';
    
    // Root-relative.
    if (prefix[0] == '/') {
      prefix = prefix.substring(1);
      label = '/';
      path = '/';
    }

    // Home-dir relative.
    if (prefix.substring(0,2) == '~/') {
      prefix = prefix.substring(2);
      label = '~/';
      path = trail(process.env.HOME);
    }
    
    // Subdirectories.
    if (prefix.indexOf('/') != -1) {
      var split = prefix.split(/\//g);
      prefix = split.pop();
      head = split.join('/') + '/';
      path += head;
      label += head;
    }
    
    // Shorthand syntax for callback.
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }
    
    // Set options.
    options = extend({
      type: '*',
      ignoreCase: false,
    }, options || {});
    
    // Completion callback.
    var matches = [],
        track = whenDone(function () {
      callback(matches);
    });
    
    // Case handling.
    if (options.ignoreCase) {
      prefix = prefix.toLowerCase();
    }

    // Scan directory.
    fs.readdir(path, track(function (err, files) {
      if (!err) {
        for (i in files) (function (file) {
          
          // Case handling.
          var key = file;
          if (options.ignoreCase) {
            key = key.toLowerCase();
          }
          
          // Prefix match.
          if (prefix == '' || key.indexOf(prefix) === 0) {
            
            // Prepare values.
            var value = label + file,
                ref = path + file;
                
            // Stat the file.
            fs.stat(ref, track(function (error, stats) {
              if (error) return;
              
              // Get correct type and suffix.
              var type = 'file',
                  suffix = ' ';

              if (stats.isDirectory()) {
                type = 'folder';
                suffix = '/';
              }
              else if (stats.isFile() && (stats.mode & 0111)) {
                type = 'command';
              }
              
              // Apply filters.
              var include = true
              if (options.executable) {
                include = type == 'command';
              }
              
              include && matches.push(exports.autocomplete.match(value, value + suffix, type));
            }));
          }
        })(files[i]);
      }
    }));
    
  },
};

exports.autocomplete.match = function (label, value, type) {
  return {
    label: label,
    value: value,
    type: type,
  };
};
