(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment, success) {
  var that = this;
  
  this.client = client;
  this.environment = environment;
  this.session = null;
  
  this.counter = 1;

  this.query('session.open.shell', { }, function (message) {
    that.session = message.args.session;

    console.log('session', that);
    that.query('shell.environment', { }, function (message) {
      that.environment = message.args;
      success();
    });
    
  });

  this.client.register(that, function (message) { that.callback(message); });

};

tc.shell.prototype = {

  query: function (method, args, callback) {
    this.client.protocol.query(method, args, { session: this.session }, callback);
  },

  notify: function (method, args) {
    this.client.protocol.notify(method, args, { session: this.session });
  },
  
  // Handler for view.* invocations.
  callback: function (method, args) {
    console.log('viewstream', method, args);
    switch (method) {
      case 'view.allocate':
        break;
    }
  },
  
  run: function (tokens, exit) {
    var that = this,
        ref = this.counter++,
        callback = function (message) {
          if (message.environment) {
            that.environment = message.environment;
          }
          exit(message.success, message.args, message);
        };

    this.query('shell.run', {
      tokens: tokens,
      ref: ref,
    }, callback);
  },
};

})();

