var fs = require('fs'),
    meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async,
    extend = require('misc').extend,
    JSONPretty = require('misc').JSONPretty,
    composePath = require('misc').composePath;
   

var debug;
debug = process.stderr.write;
debug = console.log
 
/**
 * Data reader for termkit-style stdI/O.
 *
 * Waits for mime headers, parses them, then calls begin() to construct
 * an appropriate stream/data handler.
 *
 * Calls exit when the pipe closes.
 */
exports.reader = function (dataIn, begin, exit) {
  var that = this;

  this.dataIn = dataIn;
  this.begin = begin;
  this.exit = exit;

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

exports.reader.prototype = {
  
  done: function () {
    
    // No data.
    if (!this.handler) {
      return this.exit();
    }

    // Send all buffered output to plug-in in one chunk.
    if (this.buffered) {

      if (!this.buffer) {
        this.buffer = new Buffer(that.length);

        // Join chunks.
        for (i in this.chunks) {
          var data = this.chunks[i];

          data.copy(this.buffer, this.offset, 0, data.length)
          this.offset += data.length;
        }
      }

      this.handler.data(this.buffer);
    }

    this.handler.end(this.exit);

  },
  
  parse: function (headers) {
    this.headers = new meta.headers();
    this.headers.parse(headers);
    for (i in this.headers.fields) {
//      debug('Header  ' + i +': ' + this.headers.fields[i] +"\n");
    }
  },
  
  // Parse MIME headers for stream
  data: function (data) {
//    debug('CHUNK ' + data + "\n\n");
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
        this.buffered = this.handler.begin(this.headers);

        // See if size is known ahead of time.
        var length = this.length = parseInt(this.headers.get('Content-Length'));
        if (this.buffered && !isNaN(length)) {
          // Allocate large buffer.
          this.buffer = new Buffer(length);
          //debug('allocated ' + this.length+" got " + this.buffer.length + "\n");
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
      if (this.buffered) {
        // Collect output.
        if (this.buffer) {
          //debug('buffered, known size ' + this.length+", data size " + data.length +"\n");

          // Append chunk to buffer.
          data.copy(this.buffer, this.offset, 0, data.length);
          this.offset += data.length;
        }
        else {

          //debug('buffered, mystery size ' + this.length+", data size " + data.length +"\n");

          // Size not known. Push chunk onto array to grow indefinitely.
          this.chunks.push(data);

          // Count size for final buffer.
          this.length += data.length;
        }
      }
      else {
        //debug('stream, packet size ' + data.length+"\n");
        // Stream out data.
        this.handler.data(data);
      }
    }
  },
};
