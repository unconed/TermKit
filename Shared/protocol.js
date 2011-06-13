var debug = false;
if (typeof exports == 'undefined') {
  exports = termkit;
  debug = false;
}

exports.protocol = function (connection, handler, autoconnect) {
  
  this.connection = connection;
  this.handler = handler;
  this.version = '1';

  this.callbacks = {};
  this.counter = 1;

  this.agreed = false;
  
  var that = this;
  connection.on('connect', function () {
    that.handshake();
  }); 
  connection.on('message', function (data) {
    that.receive(data);
  });
  connection.on('disconnect', function () {
    that.handler.disconnect && that.handler.disconnect();
  });
  
  autoconnect && this.handshake();
};

exports.protocol.prototype = {
  
  handshake: function () {
    this.notify(null, null, {
      termkit: this.version,
      timestamp: +new Date(),
    });
  },
  
  process: function (message) {

    // Version check.
    if (!this.agreed) {
      if (message.termkit == this.version) {
        this.agreed = true;
      }
      else {
        this.connection.disconnect();
      }
      return;
    }

    // Query is being made.
    // or Simple notification.
    if (typeof message.method == 'string') {
      this.handler && this.handler.dispatch(message);
    }
    
    // An answer to a query.
    else if (typeof message.answer == 'number') {
      var callback = this.callbacks[message.answer];
      if (callback) {
        delete this.callbacks[message.answer];
        callback && callback(message);
      }
    }
  },
  
  query: function (method, args, meta, callback) {
    meta = meta || {};
    meta.query = this.counter++;
    
    this.callbacks[meta.query] = callback;
    this.notify(method, args, meta);
  },
  
  answer: function (query, args, meta) {
    meta = meta || {};
    meta.answer = query;

    this.notify(null, args, meta);
  },
  
  notify: function (method, args, meta) {
    meta = meta || {};
    
    if (method) {
      meta.method = method;
    }
    if (args) {
      meta.args = args;
    }

    this.send(meta);
  },
  
  send: function (message) {
    if (typeof message == 'object') {
      if (debug) {
        var out = ['sending'];
        message.method && out.push(message.method);
        message.args && out.push(message.args);
        out.push(message);
        console.log.apply(console, out);
      }
      this.connection.send(message);
    }
  },
  
  receive: function (message) {
    if (typeof message == 'object') {
      if (debug) {
        var out = ['receiving'];
        message.method && out.push(message.method);
        message.args && out.push(message.args);
        out.push(message);
        console.log.apply(console, out);

        if (message.args && message.args.objects) {
          for (i in message.args.objects) {
            console.log('object', message.args.objects[i]);
          }
        }
      }
      this.process(message);
    }
  },
  
};
