(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment, exit) {
  var that = this;
  
  this.client = client;
  this.environment = environment;

  this.client.invoke('session.open.shell', { }, function (data, code, status, sessionId) {
    that.sessionId = sessionId;
    exit();
  }, this.hook());
};

tc.shell.prototype = {
  
  // Hook into the given set of handlers.
  hook: function (handlers) {
    var that = this;
    handlers = handlers || {};
    handlers['shell'] = function (m,a) { that.shellHandler(m, a); };
    return handlers;
  },
  
  // Handler for view.* invocations.
  shellHandler: function (method, args) {
    switch (method) {
      case 'shell.environment':
        for (i in args) {
          this.environment[i] = args[i];
        }
        break;
    }
  },
  
  run: function (tokens, exit, handlers) {
    this.client.invoke('shell.run', {
      tokens: tokens,
    }, exit, this.hook(handlers), this.sessionId);
  },
};

})();

