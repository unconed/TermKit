var mime = require('mime');

function isObject(x) {
  return typeof x == 'object';
}

function isString(x) {
  return (isObject(x) || typeof x == 'string') && x.constructor == ''.constructor;
}

function isArray(x) {
  return isObject(x) && x.constructor == [].constructor;
}

// Flatten multi-line strings.
function join(string) {
  return (''+string).replace(/[\r\n] ?/g, ' ');
}

// Quoted string
function quote(string) {
  if (/[\u0080-\uFFFF]/(string)) {
    // Do RFC2047 mime encoded tokens.
  }
  if (/[ ()<>@,;:\\"\/\[\]?=]/(string)) {
    return '"' + string.replace(/([\\"])/g, '\\$1') + '"';
  }
  return string;
}


exports.headers = function () {
  this.fields = {};
  this.params = {};
  
  // Parsing hints.
  this.hints = {
    'Content-Type':        { params: true },
    'Content-Disposition': { params: true },
    'Accept':              { multi: true, params: true },
    'Accept-Encoding':     { multi: true, params: true },
    'Accept-Charset':      { multi: true, params: true },
    'Accept-Language':     { multi: true, params: true },
  };
}

exports.headers.prototype = {
  
  hint: function (key, args) {
    this.hints[key] = args;
  },
  
  all: function (key) {
    return [ this.fields[key], this.params[key] ];
  },
  
  get: function (key, param) {
    if (typeof this.fields[key] != 'undefined') {
      if (param) {
        return this.params[key][param];
      }
      return this.fields[key];
    }
  },

  set: function (keyObject, paramValue, value) {
    var i, j;
    /*
    // Single setters
    set(key, value)
    set(key, param, value)

    // Combined value/param setter.
    set(key, [ value, { param: value, param: value } ])

    // Multi-value setter.
    set(key, [ value, value, value ])
    set(key, [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ])

    // Generic hash syntax.
    set({
      key: value,
      key: [ value, { param: value }],
      key: [ value, value, value ],
      key: [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ],
    })
    */
    
    // Set single key.
    if (isString(keyObject)) {
      
      // Advanced syntax,
      if (isArray(paramValue)) {
        // Ignore empties.
        if (paramValue.length == 0) return;
        
        // Check type of last element.
        if (isArray(paramValue[paramValue.length - 1])) {
          // Array of arrays [ [ 'value', { params } ], [ 'value', { params } ] ].
          // Multi-value field
          this.fields[keyObject] = [];
          this.params[keyObject] = {};

          for (i in paramValue) {
            var set = paramValue[i];
            // Verify format.
            if (isString(set[0])) {
              // Insert field value.
              this.fields[keyObject].push(set[0]);

              // Insert field parameters.
              if (set.length == 2 && isObject(set[1])) {
                var k = this.fields[keyObject].length - 1;
                for (j in set[1]) {
                  // Ensure array of parameter values.
                  if (!isArray(this.params[keyObject][j])) {
                    this.params[keyObject][j] = [];
                  }
                  // Insert param value in set at matching offset k.
                  this.params[keyObject][j][k] = set[1][j];
                }
              }
            }
          }
        }
        else if (isString(paramValue[paramValue.length - 1])) {
          // Array [ value, value, value ]       
          // Multi value field without params.
          this.fields[keyObject] = [];
          this.params[keyObject] = {};
          for (i in paramValue) {
            this.fields[keyObject].push(paramValue[i]);
          }
        }
        else if (paramValue.length == 2 && isObject(paramValue[1])) {
          // Array [ value, { params } ] 
          // Single value field with params.
          this.set(keyObject, paramValue[0]);
          for (i in paramValue[1]) {
            this.set(keyObject, i, paramValue[1][i]);
          }
        }
      }
      // Set field parameter.
      else if (value) {
        if (this.fields[keyObject]) {
          if (!isObject(this.params[keyObject])) {
            this.params[keyObject] = {};
          }
          this.params[keyObject][paramValue] = value;
        }        
      }
      // Set normal value.
      else {
        this.fields[keyObject] = paramValue;
        this.params[keyObject] = {};
      }
    }
    // Short-hand: pass in a single hash.
    else {
      for (i in keyObject) {
        this.set(i, keyObject[i]);
      }
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
    headers = headers.toString().split(/\r\n\r\n/);
    headers = headers[0];

    // Parse out fields (RFC 822).
    var field;

    while (field = /^([^:\x00-\x20]+): +(([^\r\n]|(?:\r\n[ \t]))+)(\r\n|$)/(headers)) {

      // Undo line folding.
      var string = field[2].replace(/\r\n[ \t]/g, ''),
          key = field[1];

      // Hints for field parsing.
      var spec = this.hints[key] || {};
      
      if (spec.multi) {
        // Parse out multiple fields.
        var tokens = string.split(/,[ \t]*/g), that = this,
            parsed = tokens.map(function (token) { return that.parseValue(token, spec.params) });
        this.set(key, parsed);
      }
      else {
        // Parse out single field.
        this.set(key, this.parseValue(string, spec.params));
      }

      headers = headers.substring(field[0].length);
    };
  },

  /**
   * Parse out field params (RFC 822).
   */
  parseValue: function (string, params) {
    function unquote(string) {
      return string.replace(/"([^"\\]|\\.)+"/g, function (string) {
        string = string.replace(/\\(.)/g, '$1');
        return string.substring(1, string.length - 1);
      });      
    }

    function unliteral(string) {
      return string.replace(/\[([^\[\]\\]|\\.)+\]/g, function (string) {
        string = string.replace(/\\(.)/g, '$1');
        return string.substring(1, string.length - 1);
      });      
    }
    
    if (params) {
      var value = null,
          params = {},
          stack = [],
          work = string;
          
      function munch() {
        stack = stack.join('');

        var match;
        if (match = /([^=]+)=(.+)/(stack)) {
          params[match[1]] = match[2];
        }
        else if (stack.length) {
          if (value) {
            value += stack;
          }
          else {
            value = stack;
          }
        }

        key = null;
        stack = [];
      }
      
      while (work.length) {
        // Find RFC 822 token types.
        var patterns = {
              whitespace: /^[ \t]+/,
              quoted: /^"([^"]|\\")*"/,
              literal: /^\[([^\[\]\\\r]|\\.)*\]/,
              atom: /^[^\(\)<>@,;:\\".\[\] \x00-\x1F]+/,
              delimiter: /^[\(\)<>@,;:\\".\[\]]/,
            },
            which = null,
            match;
        for (i in patterns) {
          if (match = patterns[i](work)) {
            which = i;
            break;
          }
        }

        var token = match ? match[0] : 'work';
        
        // Check for comments.
        if (token == '(') {
          // Comments are recursive. Can't regexp in JS.
          // Remove everything but unescaped parentheses so we can count them.
          var parens = work.replace(/([^\(\)\\]|\\.)+/g, ''),
              depth = 0;

          for (i = 0; i < parens.length; ++i) {
            depth += parens[i] == '(' ? 1 : -1;
            if (depth == 0) {
              // Balanced pairs found.
              which = 'comment';
              // Extract up to the i-th unescaped parenthesis.
              token = new RegExp("([^\(\)]*[()]){" + (i + 1) + "}")(work)[0];
              break;
            }
          }
        }

        // Handle token.
        switch (which) {
          case 'atom':
            stack.push(token);
            break;
          
          case 'quoted':
            stack.push(unquote(token));
            break;
            
          case 'literal':
            stack.push(unliteral(token));
          
          case 'delimiter':
            switch (token) {
              case ';':
                munch();
                break;

              default:
                stack.push(token);
                break;
            }
            break;
          
          case 'whitespace':
            if (stack.length) {
              stack.push(token);
            }
            break;
            
          case 'comment':
            stack.push(token);
            break;
          
          default:
            return [ string, {} ];
        }

        work = work.substring(token.length);
      }

      if (stack.length) {
        munch();
      }

      return [ value, params ];
    }
    else {
      return unquote(string);
    }
  },
  
  /**
   * Generate MIME-formatted headers.
   */
  generate: function () {
    var out = [];
    for (var key in this.fields) {
      var items = [],
          prefix = key + ': ',
          value = this.fields[key];
      
      if (!isArray(value)) {
        value = [ value ];
      }
      for (var i in value) {
        var item = this.escape(value[i]);
        for (var j in this.params[key]) {
          var param = this.params[key][j];
          if (!isArray(param)) {
            param = [ param ];
          }
          if (typeof param[i] != 'undefined') {
            item += '; ' + this.param(j, param[i]);
          }
        } 
        items.push(item); 
      }

      out.push(key + ': ' + items.join(', '));
    } 
    return out.join("\r\n") + "\r\n\r\n";
  },

  /**
   * Escape a parameter for output.
   */
  param: function (key, value) {
    // Parameter value (RFC 2231.. ugh)
    if (/[\u0080-\uFFFF]/(value)) {
      var encoded = encodeURIComponent(value);
      var safe = quote(value.replace(/[\u0080-\uFFFF]/g, ''));
      return quote(key + '*') + '="' + encodeURIComponent(value) + '";' + quote(key) + '=' + quote(safe);
    }
    return quote(key) + '=' + quote(value);
  },

  /**
   * Escape a value for output.
   */
  escape: function (string) {
    return quote(join(string));
  },

};

exports.sniff = function (file, data) {
  var parts = file.split('.'),
      extension = parts.pop();

  if (mime.types[extension]) {
    return mime.types[extension];
  }

  if (/[^\u0001-\uFFFF]/('' + data)) {
    return 'application/octet-stream';
  }

  return 'text/plain';
};
