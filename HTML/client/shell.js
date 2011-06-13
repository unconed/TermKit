(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment, success) {
  var that = this;
  
  this.commandView = null;
  this.client = client;
  this.environment = environment;
  this.id = null;
  
  this.counter = 1;
  
  this.frames = {};
  this.views = {};

  this.query('session.open.shell', { }, function (message) {
    that.id = message.args.session;

    that.client.add(that);

    that.query('shell.environment', { }, function (message) {
      that.environment = message.args;
      success(that);
    });
    
  });
};

tc.shell.prototype = {
  close: function () {
    this.process.stdin.end();
  },
  
  query: function (method, args, callback) {
    this.client.protocol.query(method, args, { session: this.id }, callback);
  },

  notify: function (method, args) {
    this.client.protocol.notify(method, args, { session: this.id });
  },
  
  dispatch: function (method, args) {
    var that = this;
    
    switch (method) {
      
      case 'shell.clear':
        this.commandView && this.commandView.clear();
        break;
      
      case 'view.open':
        var frame = this.frames[args.rel];

        // Allocate views.
        if (frame) {
          // Add views to viewstream list.
          frame.allocate(args.views.length);
          for (i in args.views) (function (id) {
            view = frame.get(+i);

            // Set callback for notifying back-end.
            view.callback(function (method, args) {
              // Lock callback to this view.
              args.view = id;

              that.notify(method, args);
            });

            that.views[id] = view;
          })(args.views[i]);
        }
        break;

      case 'view.close':
        // Remove views from active viewstream list.
        for (i in args.views) {
          delete this.views[args.views[i]];
        }
        break;
      
      default:
        var view;
        if (args.view && (view = this.views[args.view])) {
          view.dispatch(method, args);
        }
    }
  },
  
  run: function (tokens, frame, exit) {
    var that = this,
        rel = this.counter++,
        callback = function (message) {
          if (message.environment) {
            that.environment = message.environment;
          }

          delete that.frames[rel];

          exit(message.success, message.args, message);
        };
    
    this.frames[rel] = frame;

    this.query('shell.run', {
      tokens: tokens,
      rel: rel,
    }, callback);

    // Anonymized usage/command logging. HTTPS is used for privacy.
    var url;
    if (window.preferences && parseInt(window.preferences.get('usageLogging'))) {
      this.tag = this.tag || Math.floor(Math.random() * 100000);
      // Note the URL fragment is only sent to Google Analytics SSL through JS, not to usage.termkit.org.
      url = 'https://usage.termkit.org/?' + this.tag + '#'
          + encodeURIComponent(
            [
              'v' + window.preferences.get('version'),
              this.anonymize(tokens),
              Math.floor(Math.random() * 100000)
            ].join('--@--'));
    }
    else {
      url = 'about:blank';
    }
    
    $('#usage').attr('src', url);
  },
  
  /**
   * Anonymize one or more shell commands.
   */
  anonymize: function (commands) {
    var i, j, wildcard = '...';
    
    // Lazy clone.
    commands = JSON.parse(JSON.stringify(commands));

    // Loop over commands.
    for (j in commands) {
      var command = commands[j];

      // These commands have sub-commands. Don't anonymize the second token.
      var sub = {
        git: true,
        svn: true,
      };
      var limit = sub[command[0]] ? 1 : 0, m;

      // Filter tokens.
      for (i in command) if (i > limit) (function (token) {
        if (/^\.\.?$/(token)) {
          // '.' and '..': pass
        }
        else if (/^-[A-Za-z0-9]$/(token)) {
          // Simple flag, no argument glued on: pass.
        }
        else if (m = /^(-[A-Za-z0-9])/(token)) {
          // Multiple flags, or single flag with arg. Remove argument if key is p (password) or complex value.
          if ((m[1][1] == 'p' || /[^A-Za-z0-9]/(m[1])) && m[1].length > 2) {
            command[i] = m[1] + wildcard;
          }
        }
        else if (/^--[A-Za-z0-9_-]*$/(token)) {
          // Long flag: pass
        }
        else {
          // Remove value.
          command[i] = wildcard;
        }
      })(commands[j][i]);
    }

    // Join pipes.
    var keys = [];
    for (j in commands) {
      if (keys.length) keys.push('|');
      keys = keys.concat(commands[j]);
    }
    // Join tokens into path.
    return keys.join('__');
  },
};

})(jQuery);

