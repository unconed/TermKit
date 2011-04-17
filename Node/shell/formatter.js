var meta = require('shell/meta'),
    view = require('view/view'),
    asyncCallback = require('misc').asyncCallback;
    async = require('misc').async;
    
/**
 * Output formatter.
 * Takes stdout from processing pipeline and turns it into visible view output.
 */
exports.formatter = function (tail, viewOut, exit) {
  var that = this;
  this.identified = false;
  this.buffer = '';
  this.meta = null;
  this.out = new view.bridge(viewOut);

  // Link up to dataOut of last process.
  tail.process.stdout.on('data', function (data) {
    that.data(data);
  });
  
  // Track process state.
  tail.process.on('exit', exit);

};

exports.formatter.prototype = {

  parseHeaders: function (headers) {
    this.meta = new meta.headers();
    this.meta.parse(headers);
    
    for (i in this.meta.fields) {
//      this.out.print(i +': '+ this.meta.fields[i]);
    }
  },
  
  // Parse MIME headers for stream
  data: function (data) {
    
    if (!this.identified) {
      this.buffer += data;
      while (this.buffer.indexOf("\r\n\r\n") != -1) {
        var chunk = this.buffer.split("\r\n\r\n").shift();
        this.parseHeaders(chunk);
        this.buffer = this.buffer.substring(chunk.length + 1);
        this.identified = true;

        this.out.add(null, view.raw('output'));
      }
    }
    else {
      switch (this.meta.get('Content-Type')) {
        case 'application/javascript':
        case 'application/json':
        case 'text/plain':
          this.out.update('output', { contents: '' + data }, true);
          break;
      }
    }
  },
};
