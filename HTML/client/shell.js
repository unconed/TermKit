(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment, exit) {
  var self = this;
  
  this.client = client;
  this.environment = environment;

  this.client.invoke('session.open.shell', { }, function (data, code, status, sessionId) {
    self.sessionId = sessionId;
    exit();
  }, this.hook());
};

tc.shell.prototype = {
  
  hook: function (handlers) {
    var self = this;
    handlers = handlers || [];
    handlers['shell'] = function (m,a) { self.shellHandler(m, a); };
    return handlers;
  },
  
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

