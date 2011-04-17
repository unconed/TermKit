var mime = require('mime');

exports.headers = function () {
  this.fields = {};
}

exports.headers.prototype = {
  
  get: function (key) {
    return this.fields[key];
  },
  
  set: function (object, value) {
    if (object.constructor != ''.constructor) {
      for (i in object) {
        this.fields[i] = object[i];
      }
    }
    else {
      this.fields[object] = value;
    }
  },

  /**
   * Parse headers from a MIME stream.
   */
  parse: function (headers) {

    // Join array if specified.
    if (headers.constructor == [].constructor) {
      headers = headers.join('\r\n');
    }

    // Strip-off possible tail.
    headers = headers.toString().split('\r\n\r\n');
    headers = headers[0];

    // Parse out fields.
    var field;
    while (field = /^([^:]+): +([^\r\n]+|(?:\r\n )+)(\r\n|$)/(headers)) {
      // Collapse soft breaks
      string = field[2].replace(/\r\n /g, '');
      
      // Undo quoting.
      string = string.replace(/"([^"]|\\")+"/g, function (string) {
        string = string.replace(/\\(.)/g, '$1');
        return string.substring(1, string.length - 1);
      });
      
      this.fields[field[1]] = string;
      headers = headers.substring(field[0].length);
    };
  },

  /**
   * Generate MIME-formatted headers.
   */
  generate: function () {
    var out = [];
    for (key in this.fields) {
      out.push(key +': '+ this.escape(this.fields[key]));
    } 
    return out.join("\r\n") + "\r\n\r\n";
  },

  /**
   * Escape a type for output.
   */
  escape: function escape(object) {
    
    // Flatten multi-line strings.
    function join(string) {
      return string.replace(/[\r\n] ?/g, '');
    }

    // Quoted string
    function quote(string) {
      if (/[\u0080-\uFFFF]/(string)) {
        // Do RFC2047 mime encoded tokens.
      }
      if (/[ ()<>@,;:\\"\/\[\]?=]/(string)) {
        return '"' + string.replace(/[\\"]/g, '\\$0') + '"';
      }
      return string;
    }
    
    // Parameter value (RFC 2231.. ugh)
    function param(key, string) {
      if (/[\u0080-\uFFFF]/(string)) {
        var encoded = encodeURIComponent(string);
        var safe = quote(string.replace(/[\u0080-\uFFFF]/g, ''));
        return key + '*="' + encodeURIComponent(string) + '";' + key + '=' + safe;
      }
      return key + '=' + quote(string);
    }
    
    // Flatten arrays
    if (object.constructor == [].constructor) {
      var out = [];
      for (i in object) {
        out.push(escape(object[i]));
      }
      return out.join(' ');
    }
    
    // Output strings safely.
    if (object.constructor == ''.constructor) {
      return quote(join(object));
    }
    
    // Output objects as mime parameter value lists.
    if (typeof object == 'object') {
      var params = [];
      for (i in object) {
        if (object[i] === true) {
          params.push(i);
        }
        else {
          params.push(param(i, object[i]));
        }
      }
      return params.join(';');
    }

    return '' + object;
  },
  
};

exports.sniff = function (file) {
  var parts = file.split('.'),
      extension = parts.pop();

  return mime.types[extension] || 'application/octet-stream';
};
