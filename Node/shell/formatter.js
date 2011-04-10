/**
 * Output formatter.
 * Takes stdout from processing pipeline and turns it into visible view output.
 */
exports.formatter = function (tail, invoke) {
  var that = this;
  this.identified = false;
  this.buffer = '';
  this.headers = {};
  this.invoke = invoke;

  tail.process.stdout.on('data', function (data) {
    that.data(data);
  });
};

exports.formatter.prototype = {

  parseHeaders: function (headers) {
    headers = headers.toString();
    do {
      var field = /^([^:]+): +([^\r\n]+|(?:\r\n )+)/(headers);
      this.headers[field[1]] = field[2].replace(/\r\n /g, '');
    } while (field.length);

    var out = new view.bridge(this.invoke);
    out.print('outputFormatter headers '+ JSON.stringify(this.headers));
  },
  
  // Parse MIME headers for stream
  data: function (data) {
    this.buffer += data;
    
    if (!this.identified) {
      while (this.buffer.indexOf("\r\n\r\n") >= 0) {
        var chunk = this.buffer.split("\r\n\r\n").shift();
        this.parseHeaders(chunk);
        this.buffer = this.buffer.substring(chunk.length + 1);
      }
    }
  },
};
