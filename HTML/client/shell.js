(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment) {
  var self = this;
  
  this.client = client;
  this.environment = environment;
  
};

tc.shell.prototype = {
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
    var self = this;
    handlers['shell'] = function (m,a) { self.shellHandler(m, a); };
    
    this.client.invoke('shell.run', {
      tokens: tokens,
      sessionId: this.environment.sessionId,
    }, exit, handlers);
  },
};

})();

