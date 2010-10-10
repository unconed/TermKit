var shell = require("shell/shell");
var returnObject = require('util').returnObject;

/**
 * Processes incoming messages on a connection, routes them to active sessions.
 */
exports.router = function (server, connection) {
  this.connection = connection;
  this.sessions = {};
  this.nextId = 1;
  
  console.log('router running');

  var self = this;
  connection.on('message', function (data) {
    console.log('router message '+ data);
    self.receive(data);
  });
  connection.on('disconnect', function () {
    console.log('router disconnected');
  });
};

exports.router.prototype = {
  receive: function (data) {
    // Parse incoming message.
    var message = JSON.parse(data);
    if (message && message.length) {
      var sessionId = message[0],
          sequence = message[1],
          method = message[2],
          args = message[3],
          self = this;

      // Verify arguments.
      if (typeof sequence == 'number') {
        // Locate handler for method and execute.
        if (exports.handlers[method]) {
          // Look up session.
          var session = sessionId && this.getSession(sessionId),
              returned = false;
            // Define convenient exit callback.
              exit = function (value, object) {
                if (!returned) {
                  if (object) {
                    value = [value, object];
                  }
                  self.send('return', sequence, returnObject(value));
                  returned = true;
                }
              };
          // Invoke method.
          exports.handlers[method].call(this, session, sequence, args, exit);
        }
      }
    }
  },
  
  send: function (sessionId, sequence, method, args) {
    var json = JSON.stringify([ sessionId, sequence, method, args ]);
    console.log('sending '+json);
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
  'session.open.shell': function (session, sequence, args, exit) {
    var session = new shell.shell(sequence, args, exit, this);
    this.addSession(session);
  },
  
  'session.close': function (session, sequence, args, exit) {
    if (session) {
      session.close();
      this.removeSession(session);
      exit(false);
    }
    else {
      exit(true);
    }
  },
  
  'shell.run': function (session, sequence, args, exit) {
    session.run(sequence, args, exit);
    // async exit
  },
};
