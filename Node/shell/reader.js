var fs = require('fs'),
    meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async,
    extend = require('misc').extend,
    JSONPretty = require('misc').JSONPretty,
    composePath = require('misc').composePath,
    expandPath = require('misc').expandPath;

// Is x an object?
function isObject(x) {
  return typeof x == 'object';
}

// Is x an array?
function isArray(x) {
  return isObject(x) && x.constructor == [].constructor;
}

/**
 * Data reader for termkit-style dataIn.
 *
 * Waits for mime headers, parses them, then calls begin() to construct
 * an appropriate stream/data handler.
 *
 * Supports buffered and unbuffered input.
 *
 * Calls exit when the pipe closes.
 */
exports.dataReader = function (dataIn, begin, exit, error) {
  var that = this;

  this.dataIn = dataIn;
  this.begin = begin || (function () {});
  this.exit = exit || (function () {});
  this.error = error || (function () {});

  // Header sniffing.
  this.identified = false;
  this.lookahead = '';
  this.headers = null;

  // Output buffering.
  this.buffered = false;
  this.buffer = null;
  this.chunks = [];
  this.length = 0;
  this.offset = 0;

  // Link up to dataOut of last process.
  dataIn.on('data', function (data) {
    that.data(data);
  });

  // Finish processing when pipe closes.
  dataIn.on('end', function () {
    that.done();
  });
};

exports.dataReader.prototype = {
  
  /**
   * Parse headers string into headers object.
   */
  parse: function (headers) {
    this.headers = new meta.headers();
    this.headers.parse(headers);
  },
  
  /**
   * Read stream, find MIME headers.
   */
  data: function (data) {
    if (!this.identified) {
      // Swallow data until we encounter the MIME header delimiter.
      this.lookahead += data.toString('ascii');
      if (this.lookahead.indexOf("\r\n\r\n") != -1) {
        
        // Parse headers.
        var chunk = this.lookahead.split("\r\n\r\n").shift();
        this.parse(chunk);

        // Notify context of headers, receive handler.
        this.identified = true;
        this.handler = this.begin(this.headers);
        this.buffered = this.handler.begin && this.handler.begin(this.headers);

        // See if size is known ahead of time.
        var length = this.length = parseInt(this.headers.get('Content-Length'));
        if (this.buffered && !isNaN(length)) {
          // Allocate large buffer.
          this.buffer = new Buffer(length);
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
      // Send output to handler.
      if (this.buffered) {
        // Collect output.
        if (this.buffer) {
          // Append chunk to buffer.
          data.copy(this.buffer, this.offset, 0, data.length);
          this.offset += data.length;
        }
        else {
          // Size not known. Push chunk onto array to grow indefinitely.
          this.chunks.push(data);

          // Count size for final buffer.
          this.length += data.length;
        }
      }
      else {
        // Stream out data.
        this.handler.data && this.handler.data(data);
      }
    }
  },

  /**
   * Finish reading.
   */
  done: function () {
    
    // No data.
    if (!this.handler) {
      return this.exit();
    }

    // Send all buffered output to handler in one chunk.
    if (this.buffered) {

      if (!this.buffer) {
        this.buffer = new Buffer(this.length);

        // Join chunks.
        for (i in this.chunks) {
          var data = this.chunks[i];

          data.copy(this.buffer, this.offset, 0, data.length)
          this.offset += data.length;
        }
      }

      this.handler.data && this.handler.data(this.buffer);
    }

    this.handler.end && this.handler.end(this.exit);

  },
  
};

/**
 * File reader for termkit-style dataIn.
 *
 * Generates mime headers, then calls begin() to construct
 * an appropriate stream/data handler.
 *
 * Supports buffered and unbuffered input.
 *
 * Calls exit when the file has been read.
 */
exports.fileReader = function (file, begin, exit, error) {
  var that = this;

  this.file = file;
  this.begin = begin || (function () {});
  this.exit = exit || (function () {});
  this.error = error || (function () {});

  // Begin reading.
  this.open();
};

exports.fileReader.prototype = {
  
  /**
   * Open file, determine type, begin reading.
   */
  open: function () {

    var that = this,
        chunkSize = 16384,
        errors = 0,
        track = whenDone(function () {
          that.done();
        });

    expandPath(this.file, track(function (file) {
      fs.stat(file, track(function (err, stats) {
        if (err) {
          errors++;
          that.error("No such file (" + that.file + ")");
          return;
        }
        fs.open(file, 'r', track(function (err, fd) {
          if (err) {
            errors++;
            that.error("Unable to open file (" + that.file + ")");
            return;
          }
        
          var position = 0;
          (function read() {
            var buffer = new Buffer(chunkSize);
            fs.read(fd, buffer, 0, chunkSize, position, track(function (err, bytesRead) {
              if (err) {
                errors++;
                that.error("Error reading file (" + that.file + ")");
                return;
              }

              var slice = buffer.slice(0, bytesRead);

              // Determine headers from first slice.
              if (position == 0) {
                var headers = new meta.headers(),
                    keys = file.split('/');
                headers.set({
                  'Content-Type': meta.sniff(file, slice),
                  'Content-Length': stats.size,
                  'Content-Disposition': [ 'attachment', { 'filename': keys.pop() } ],
                });

                // Get handler and begin processing.
                that.handler = that.begin(headers);
                that.buffered = that.handler.begin && that.handler.begin(headers);              
              }
            
              // If buffered, read file and return.
              if (that.buffered) {
                that.buffer = new Buffer(stats.size);
              
                fs.read(fd, that.buffer, 0, stats.size, 0, track(function (err, bytesRead) {
                  var slice = buffer.slice(0, bytesRead);
                  that.data(slice);
                }));
                return;
              }
            
              // Process slice.
              that.data(slice);
              position += bytesRead;

              if (position < stats.size) {
                read();
              }
            })); // fs.read
          })(); // read
        })); // fs.open
      })); // fs.stat
    })); // expandPath
  },
  
  /**
   * Send data to handler.
   */
  data: function (data) {
    this.handler.data && this.handler.data(data);
  },

  /**
   * Finish reading.
   */
  done: function () {
    
    // No data.
    if (!this.handler) {
      return this.exit();
    }

    this.handler.end && this.handler.end(this.exit);

  },
  
};


/**
 * Multiple files reader for termkit-style dataIn.
 *
 * Generates mime headers, then calls begin() to construct
 * an appropriate stream/data handler.
 *
 * Supports buffered and unbuffered input.
 *
 * Calls exit when the file has been read.
 */
exports.filesReader = function (files, begin, exit, error) {
  var that = this;

  this.files = files;
  this.begin = begin || (function () {});
  this.exit = exit || (function () {});
  this.error = error || (function () {});
  
  this.offset = 0;
  this.buffer = null;

  this.open();
};

exports.filesReader.prototype = {
  
  /**
   * Open files, determine output type, begin reading.
   */
  open: function () {

    var that = this,
        chunkSize = 16384,
        errors = 0,
        size = 0,
        types = [],
        track = whenDone(function () {
          // Done inspecting files.
          if (errors > 0) {
            that.done();
          }
          else {
            that.process(that.files, types, size);
          }
        });

    // Identify the content-type of all the files
    for (var i in this.files) (function (file) {

      fs.stat(file, track(function (err, stats) {
        if (err) {
          errors++;
          that.error("No such file (" + file + ")");
          return;
        }
        
        size += stats.size;
        
        // Read beginning of file for sniffing.
        fs.open(file, 'r', track(function (err, fd) {
          if (err) {
            errors++;
            that.error("Unable to open file (" + file + ")");
            return;
          }

          var buffer = new Buffer(chunkSize);
          fs.read(fd, buffer, 0, chunkSize, 0, track(function (err, bytesRead) {
            if (err) {
              errors++;
              that.error("Error reading file (" + file + ")");
              return;
            }

            var slice = buffer.slice(0, bytesRead);

            // Determine content-type from slice.
            var type = meta.sniff(file, slice);
            types.push(type);
          })); // fs.read
        })); // fs.open
      })); // fs.stat
      
    })(this.files[i]);
    
    // Ensure tracker completes without files.
    if (this.files.length == 0) {
      that.done();
    }
  },
  
  /**
   * Determine common mime type for files.
   */
  type: function (types) {
    
    // Single type.
    if (types.length == 1) {
      return types[0];
    }
    
    // Merge multiple types.
    var merged = {}, hasParams = false;
    for (var i in types) {
      // Process params.
      if (isArray(types[i])) {
        var params = types[i][1];
        
        // Only merge identical params.
        for (var j in params) {
          if (merged[j] === null) continue;
          if (merged[j] != params[j]) {
            merged[j] = null;
          }
          merged[j] = params[j];
        }

        // Strip params for merge.
        types[i] = types[i][0];
      }
    }
    // Check if there are params.
    for (var j in merged) {
      hasParams = true;
      break;
    }
    
    function commonPrefix(types) {
      // Sort types, inspect first/last strings.
      types.sort();
      var first = types[0],
          last = types[types.length - 1],
          n = Math.min(first.length, last.length),
          match = '';

      // Find common prefix.
      while (n > 0) {
        last = last.substring(0, n--);
        if (first.indexOf(last) == 0) {
          match = last;
          break;
        }
      }
      
      return match;
    }
    
    var type = 'application/octed-stream';
    
    prefix = commonPrefix(types);
    if (!(/^[^\/]+\/[^\/]+$/(prefix))) {
      // If we only matched a type category (e.g. text/),
      // coerce types to their base.
      types = types.map(function (type) {
        return meta.base(type);
      });
      prefix = commonPrefix(types);
      
      if (!(/^[^\/]+\/[^\/]+$/(prefix))) {
        // Replace with generic type.
        type = meta.default(prefix) || 'application/octet-stream';
      }
      else {
        type = prefix;
      }
    }
    else {
      // Only return a unified type for content types which can be composed safely.
      var composable = meta.composable();
      if (composable[prefix]) {
        if (typeof composable[prefix] == 'string') {
          type = composable[prefix];
        }
        else {
          type = prefix;
        }
      }
    }
    
    // Return with or without merged params.
    return hasParams ? [ type, merged ] : type;
  },
  
  /**
   * Begin reading files.
   */
  process: function (files, types, size) {
    var that = this;

    // Find common mime-type prefix.
    var type = this.type(types);

    // Build headers
    var headers = new meta.headers();
    headers.set('Content-Type', type);
    headers.set('Content-Length', size);
    if (files.length == 1) {
      var keys = files[0].split('/');
      headers.set('Content-Disposition', [ 'attachment', { 'filename': keys.pop() } ]);
    }

    // Get handler and begin processing.
    this.handler = this.begin(headers);
    this.buffered = this.handler.begin && this.handler.begin(headers);

    // If buffered, create buffer of appropriate size.
    if (this.buffered) {
      this.buffer = new Buffer(size);
    }
    
    // File reader pass-through handler.
    var handler = {
      // Already determined mime type.
      // Always use unbuffed filereader, so we only buffer once for all files.
      begin: function () { return false; },
      data: function (data) { that.data(data) },
      end: function (exit) { exit(); },
    };

    // Helper: Process a single file.
    function read(file, complete) {
      var reader = new exports.fileReader(file, function (headers) {
        return handler;
      }, function () {
        complete();
      }, function (error) {
        that.error(error);
      });
    }
    
    // Process all files in sequence, asynchronously.
    var files = files.slice();
    (function nextFile() {
      if (files.length) {
        var file = files.shift();
        read(file, nextFile);
      }
      else {
        that.done();
      }
    })();

  },

  /**
   * Send data to handler.
   */
  data: function (data) {

    // Send output to plugin.
    if (this.buffered) {
      // Append chunk to buffer.
      data.copy(this.buffer, this.offset, 0, data.length);
      this.offset += data.length;
    }
    else {
      // Stream out data.
      this.handler.data && this.handler.data(data);
    }
  },

  /**
   * Finish reading.
   */
  done: function () {
    
    // No data.
    if (!this.handler) {
      return this.exit();
    }

    // Send all buffered output to handler in one chunk.
    if (this.buffered) {
      this.handler.data && this.handler.data(this.buffer);
    }

    this.handler.end && this.handler.end(this.exit);
  },
  
};
