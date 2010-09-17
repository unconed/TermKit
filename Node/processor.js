var shell = require("shell");

/**
 * Processes incoming messages on a connection and sends replies.
 */
exports.router = function (server, connection) {
  this.connection = connection;
  this.sessions = {};
  this.nextId = 1;
  
  this.handlers = {
    'session.open': function () { }
  };

  console.log('processor running');

  var self = this;
  connection.on('message', function (data) {
    console.log('processor message '+ data);
    self.message(data);
  });
  connection.on('disconnect', function () {
    console.log('processor disconnected');
  });
};

exports.router.prototype = {
  message: function (data) {
    // Parse incoming message.
    var message = JSON.parse(data);
    if (message && message.length) {
      var method = message[0],
          sequence = message[1],
          args = message[2];

      // Verify arguments.
      if (typeof message[1] == 'number') {
        // Locate handler for method and execute.
        if (exports.handlers[method]) {
          // Create callback for sending reply messages.
          var self = this,
              invoke = function (method, args) { self.send(method, sequence, args); };

          // Execute method.
          var out = exports.handlers[method].call(this, args, invoke);

          // Process shortcut return values
          if (typeof out == 'object') {
            out = { status: 'ok', code: 0, data: out };
          }
          if (out === true) {
            out = { status: 'ok', code: 0 };
          }
          if (out === false) {
            out = { status: 'error', code: 1 };
          }
          if (typeof out == 'number') {
            out = { status: !out ? 'ok' : 'error', code: out };
          }

          // Return run status.
          invoke('return', sequence, out);
        }
      }
    }
  },
  
  send: function (method, sequence, args) {
    var json = JSON.stringify([ method, sequence, args ]);
    this.connection.send(json);
  },
  
  getSession: function (id) {
    for (i in this.sessions) {
      if (i == id) return this.sessions[id];
    }
  },
  
  addSession: function (session) {
    var id = session.id = this.nextId++;
    this.sessions[id] = session;
  },

  removeSession: function (session) {
    delete this.sessions[session.id];
  },
};

/**
 * Method handlers.
 */
exports.handlers = {
  'session.open.shell': function (args, invoke) {
    var session = new shell.shell(this);
    this.addSession(session);
    
    return { sessionId: session.id };
  },
  
  'session.close': function (args, invoke) {
    var session = this.getSession(args[id]);
    if (session) {
      session.close();
      this.removeSession();
      return true;
    }
    return false;
  },
};
