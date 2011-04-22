var meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async,
    extend = require('misc').extend;
    
/**
 * Output formatter.
 * Takes stdout from processing pipeline and turns it into visible view output.
 */
exports.formatter = function (tail, viewOut, exit) {
  var that = this;

  this.out = new view.bridge(viewOut);

  // Header sniffing.
  this.identified = false;
  this.lookahead = '';
  this.headers = null;

  // Output buffering.
  this.buffer = null;
  this.chunks = [];
  this.length = 0;
  this.offset = 0;

  // Link up to dataOut of last process.
  tail.process.stdout.on('data', function (data) {
    that.data(data);
  });
  
  // Track process state.
  tail.process.on('exit', function () {
    
    if (this.plugin) {
      // Send all buffered output to plug-in in one chunk.
      if (this.plugin.buffered) {
        process.stderr.write('flushing ' + this.length +" @ "+ this.offset +"\n");

        this.buffer = new Buffer(this.length);
        
        // Join chunks.
        for (i in this.chunks) {
          var data = this.chunks[i];
          data.copy(this.buffer, this.offset, 0, data.length)
          this.offset += data.length;
        }
        
        this.plugin.data(this.buffer);
      }
      this.plugin.end();
    }
    
    exit();
  });

};

exports.formatter.prototype = {

  parse: function (headers) {
    this.headers = new meta.headers();
    this.headers.parse(headers);
    for (i in this.headers.fields) {
      process.stderr.write('Header  ' + i +': ' + this.headers.fields[i] +"\n");
    }
  },
  
  // Parse MIME headers for stream
  data: function (data) {
    
    if (!this.identified) {
      // Swallow data until we encounter the MIME header delimiter.
      this.lookahead += data.toString('ascii');
      if (this.lookahead.indexOf("\r\n\r\n") != -1) {
        
        // Parse headers.
        var chunk = this.lookahead.split("\r\n\r\n").shift();
        this.parse(chunk);

        // Create output plug-in.
        this.identified = true;
        this.plugin = exports.factory(this.headers, this.out);
        this.plugin.begin();

        // See if size is known ahead of time.
        var length = this.headers.get('Content-Length');
        if (typeof length != 'undefined') {
          // Allocate large buffer.
          this.length = length;
          this.buffer = new Buffer(length);
        }

        process.stderr.write('allocated ' + this.length+"\n");
        
        // Emit left-over data.
        var end = chunk.length + 4;
        if (end < data.length) {
          this.data(data.slice(end));
        }
      }
    }
    else {
      // Send output to plugin.
      if (this.plugin.buffered) {
        // Collect output.
        if (this.buffer) {
          process.stderr.write('buffered, known size ' + this.length+", data size " + data.length +"\n");

          // Append chunk to buffer.
          data.copy(this.buffer, this.offset, 0, data.length);
          this.offset += data.length;
        }
        else {

          process.stderr.write('buffered, mystery size ' + this.length+", data size " + data.length +"\n");

          // Size not known. Push chunk onto array to grow indefinitely.
          this.chunks.push(data);

          // Count size for final buffer.
          this.length += data.length;
        }
      }
      else {
        process.stderr.write('stream, packet size ' + data.length+"\n");
        // Stream out data.
        this.plugin.data(data);
      }
    }
  },
};

/**
 * Factory for output plugins.
 */
exports.factory = function (headers, out) {
  for (i in exports.plugins) {
    var supports = exports.plugins[i].supports;
    if (supports && supports(headers)) {
      process.stderr.write('selected plugin ' + i + "\n\n");
      return new exports.plugins[i](headers, out);
    }
  }
  return new exports.plugin();
};

/**
 * Plug in base class.
 */
exports.plugin = function (headers, out) {
  this.headers = headers;
  this.out = out;
};

exports.plugin.supports = function (headers) {
  return false;
};

exports.plugin.prototype = {
  begin: function () { },
  data: function (data) { },
  end: function () { },
};

/**
 * List of plugins
 * TODO: make modular.
 */
exports.plugins = { };

/**
 * Text formatter.
 */
exports.plugins.text = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.text.prototype = extend(new exports.plugin(), {
  
  begin: function () {
    this.out.add(null, view.text('output'));
  },
  
  data: function (data) {
    this.out.update('output', { contents: '' + data.toString('utf-8') }, true);
  },
  
});

exports.plugins.text.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^text\//(type));
}

/**
 * Code formatter.
 */
exports.plugins.code = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.code.prototype = extend(new exports.plugins.text(), {
  
  begin: function () {
    this.out.add(null, view.code('output', '', this.headers.get('Content-Type')));
  },
  
});

exports.plugins.code.supports = function (headers) {
  var type = headers.get('Content-Type');
  var supported = {
    'application/javascript': true,
  };
  return !!supported[type];
}

/**
 * Image formatter.
 */
exports.plugins.image = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
  
  this.buffered = true;
};

exports.plugins.image.prototype = extend(new exports.plugin(), {
  
  begin: function () {
  },
  
  data: function (data) {
    var url = 'data:' + this.headers.get('Content-Type') + ';base64,' + data.toString('base64');
    this.out.add(null, view.image('image', url));
  },
  
});

exports.plugins.image.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^image\//(type));
}


