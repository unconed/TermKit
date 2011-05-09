var fs = require('fs'),
    meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async,
    extend = require('misc').extend,
    JSONPretty = require('misc').JSONPretty,
    composePath = require('misc').composePath;
    
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

    if (that.plugin) {
      // Send all buffered output to plug-in in one chunk.
      if (that.plugin.buffered) {
        //process.stderr.write('flushing ' + that.length +" @ "+ that.offset +"\n");

        if (!that.buffer) {
          that.buffer = new Buffer(that.length);

          // Join chunks.
          for (i in that.chunks) {
            var data = that.chunks[i];
            //process.stderr.write("chunk "+ i +" at "+ that.offset +" - " + data.length + "\n");
            data.copy(that.buffer, that.offset, 0, data.length)
            that.offset += data.length;
          }
        }
        
        that.plugin.data(that.buffer);
      }

      that.plugin.end(exit);
    }
    else {
      exit();
    }
  });

};

exports.formatter.prototype = {

  parse: function (headers) {
    this.headers = new meta.headers();
    this.headers.parse(headers);
    for (i in this.headers.fields) {
      //process.stderr.write('Header  ' + i +': ' + this.headers.fields[i] +"\n");
    }
  },
  
  // Parse MIME headers for stream
  data: function (data) {
//    process.stderr.write('CHUNK ' + data + "\n\n");
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
        var length = this.length = parseInt(this.headers.get('Content-Length'));
        if (this.plugin.buffered && !isNaN(length)) {
          // Allocate large buffer.
          this.buffer = new Buffer(length);
          //process.stderr.write('allocated ' + this.length+" got " + this.buffer.length + "\n");
        }
        else {
          this.length = 0;
        }

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
          //process.stderr.write('buffered, known size ' + this.length+", data size " + data.length +"\n");

          // Append chunk to buffer.
          data.copy(this.buffer, this.offset, 0, data.length);
          this.offset += data.length;
        }
        else {

          //process.stderr.write('buffered, mystery size ' + this.length+", data size " + data.length +"\n");

          // Size not known. Push chunk onto array to grow indefinitely.
          this.chunks.push(data);

          // Count size for final buffer.
          this.length += data.length;
        }
      }
      else {
        //process.stderr.write('stream, packet size ' + data.length+"\n");
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
  var max = 0, selected;

  for (i in exports.plugins) {
    var supports = exports.plugins[i].supports;
    if (supports && (level = supports(headers))) {
      if (level >= max) {
        selected = i;
        max = level;
      }
    }
  }
  if (selected) {
    return new exports.plugins[selected](headers, out);
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
  end: function (exit) {
    exit(true);
  },
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
  return !!(/^text\//(type)) * 1;
}

/**
 * Code formatter.
 */
exports.plugins.code = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);

  this.buffered = true;
};

exports.plugins.code.prototype = extend(new exports.plugins.text(), {
  
  begin: function () {
    this.out.add(null, view.code('output', '', this.headers.get('Content-Type')));
  },

  data: function (data) {
    data = data.toString('utf-8');
    if (this.headers.get('Content-Type') == 'application/json') {
      data = JSONPretty(data);
    }
    this.out.update('output', { contents: data }, true);
  },
  
});

exports.plugins.code.supports = function (headers) {
  var type = headers.get('Content-Type');
  var supported = {
    'application/json': true,
    'application/javascript': true,
  };
  return !!supported[type] * 2;
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
  
  data: function (data) {
    var url = 'data:' + this.headers.get('Content-Type') + ';base64,' + data.toString('base64');
    this.out.add(null, view.image('image', url));
  },
  
});

exports.plugins.image.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^image\//(type)) * 1;
};

/**
 * JSON formatter.
 */
exports.plugins.json = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
  
  this.buffered = true;
};

exports.plugins.json.prototype = extend(new exports.plugin(), {
});

exports.plugins.json.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^application\/json$/(type)) * 1;
};

/**
 * File listing formatter.
 *
 * JSON schema: termkit.files
 * {
 *   "/path/to/dir": [
 *      "file1",
 *      "file2",
 *      "file3"
 *   ],
 *   "/path/to/dir": [
 *      "file1",
 *      "file2",
 *      "file3"
 *   ]
 * }
 */
exports.plugins.files = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
  
  this.buffered = true;
  
  process.stderr.write(headers.generate());
};

exports.plugins.files.prototype = extend(new exports.plugin(), {

  data: function (data) {
    var that = this,
        output = [],
        errors = 0;

    // Parse JSON (termkit.files).
    data = JSON.parse(data);
    
    // Job tracker.
    var track = whenDone(function () {
      for (i in output) {
        // Output one directory listing at a time.
        that.out.print(view.list(i, output[i]));
      }

      that.exit(errors == 0);
    });
    
    // Iterate over each list.
    var set = 0, j;
    for (key in data) (function (files, path) {

      // Prepare files.
      for (j in files) (function (file, i, j) {

        // Stat each file.
        fs.stat(composePath(file, path), track(function (error, stats) {
          if (!error) {
            output[i][j] = view.file(file, path, stats);
          }
          else {
            errors++;
          }
        })); // fs.stat
      })(files[j], set, j); // for j in files

      // Prepare array.
      output[set++] = [];

    })(data[key], key); // for key in data
  },

  end: function (exit) {
    this.exit = exit;
  },

});

exports.plugins.files.supports = function (headers) {
  var type = headers.get('Content-Type'),
      schema = headers.get('Content-Type', 'schema');
  return !!(/^application\/json$/(type) && (schema == 'termkit.files')) * 3;
};
