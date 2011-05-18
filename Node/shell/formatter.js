var fs = require('fs'),
    meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async,
    extend = require('misc').extend,
    JSONPretty = require('misc').JSONPretty,
    composePath = require('misc').composePath,
    objectKeys = require('misc').objectKeys,
    reader = require('reader'),
    escapeBinary = require('misc').escapeBinary;

/**
 * Error logger.
 */
exports.logger = function (unit, viewOut) {

  var out = new view.bridge(viewOut);

  // Link up to stderr of process.
  unit.process.stderr.on('data', function (data) {
    var binary = escapeBinary(data);
    this.out.add(null, view.code(null, binary, 'text/plain'));
  });

};

/**
 * Output formatter.
 * Takes stdout from processing pipeline and turns it into visible view output.
 */
exports.formatter = function (tail, viewOut, exit) {
  var that = this;

  this.out = new view.bridge(viewOut);

  // Start reading the output.
  this.reader = new reader.reader(tail.process.stdout, function (headers) {
    // Construct appropriate plugin for this type.
    return that.plugin = exports.factory(headers, that.out);
  }, function () {
    exit(true);
  });

};

/**
 * Factory for output plugins.
 */
exports.factory = function (headers, out) {
  var max = 0, selected;

  // Find plug-in with highest reported specificity.
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
  return new exports.plugins.fallback(headers, out);
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
  begin: function (headers) { },
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
 * Fallback plug in (output headers).
 */
exports.plugins.fallback = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.fallback.supports = function (headers) {
  return false;
};

exports.plugins.fallback.prototype = extend(new exports.plugin(), {
  begin: function (headers) {
    this.out.add(null, view.code('output', headers.generate(), 'text/plain'));
  },
});

/**
 * Text formatter.
 */
exports.plugins.text = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.text.prototype = extend(new exports.plugin(), {

  begin: function () {
//    this.out.add(null, view.code('output', this.headers.generate(), 'text/plain'));
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
 * PDF formatter.
 */
exports.plugins.pdf = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.pdf.prototype = extend(new exports.plugin(), {

  begin: function () {
//    this.out.add(null, view.code('output', this.headers.generate(), 'text/plain'));
    this.out.add(null, view.html('output'));
    
    // Buffered.
    return true;
  },

  data: function (data) {
    
    // We wrap the HTML in an iframe for isolation.
    var url = 'data:application/pdf;base64,' + data.toString('base64');
        html = '<iframe class="termkitLimitHeight" src="'+ url +'"></iframe>';
    
    this.out.update('output', { contents: html }, true);
  },

});

exports.plugins.pdf.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^application\/pdf/(type)) * 2;
}

/**
 * HTML formatter.
 */
exports.plugins.html = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.html.prototype = extend(new exports.plugin(), {

  begin: function () {
//    this.out.add(null, view.code('output', this.headers.generate(), 'text/plain'));
    this.out.add(null, view.html('output'));
    
    // Buffered.
    return true;
  },

  data: function (data) {
    
    // We wrap the HTML in an iframe for isolation.
    var url = 'data:text/html;base64,' + data.toString('base64');
        html = '<iframe class="termkitLimitHeight" src="'+ url +'"></iframe>';
    
    this.out.update('output', { contents: html }, true);
  },

});

exports.plugins.html.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^text\/html/(type)) * 2;
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
//    this.out.add(null, view.code('output', this.headers.generate(), 'text/plain'));
    this.out.add(null, view.code('output', '', this.headers.get('Content-Type')));

    // Buffered output.
    return true;
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
    'text/javascript': true,
    'text/x-applescript': true,
    'text/x-actionscript': true,
    'text/x-shellscript': true,
    'text/x-c': true,
    'text/x-c++': true,
    'text/x-csharpsrc': true,
    'text/css': true,
    'text/x-diff': true,
    'text/x-erlang': true,
    'text/x-groovy': true,
    'text/x-java-source': true,
    'application/json': true,
    'application/javascript': true,
    'application/x-perl': true,
    'application/x-php': true,
    'text/x-python': true,
    'text/x-ruby': true,
    'text/x-sass': true,
    'text/x-scala': true,
    'text/x-sql': true,
    'text/xml': true,
  };
  return !!supported[type] * 2;
}

/**
 * Image formatter.
 */
exports.plugins.image = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.image.prototype = extend(new exports.plugin(), {

  begin: function (headers) {
    // Buffered output.
    return true;
  },

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
    var track = this.track = whenDone(function () {
      for (i in output) {
        // Output one directory listing at a time.
        if (output[i].length) {
          that.out.print(view.list(i, output[i]));
        }
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
            output[i][j] = view.file(null, file, path, stats);
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

    // Ping tracker in case of empty data.
    this.track()();
  },

});

exports.plugins.files.supports = function (headers) {
  var type = headers.get('Content-Type'),
      schema = headers.get('Content-Type', 'schema');
  return !!(/^application\/json$/(type) && (schema == 'termkit.files')) * 3;
};

/**
 * Binary formatter.
 */
exports.plugins.binary = function (headers, out) {
  // Inherit.
  exports.plugin.apply(this, arguments);
};

exports.plugins.binary.prototype = extend(new exports.plugin(), {

  begin: function () {
    this.out.add(null, view.code('output', this.headers.generate(), 'text/plain'));
    this.out.add(null, view.code('output', '', 'text/plain'));
  },

  data: function (data) {
    var binary = escapeBinary(data);
    this.out.update('output', { contents: binary }, true);
  },

});

exports.plugins.binary.supports = function (headers) {
  var type = headers.get('Content-Type');
  return !!(/^application\/octet-stream/(type)) * 1;
}

