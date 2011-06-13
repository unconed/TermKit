var mime = require('mime');

// Is x an object?
function isObject(x) {
  return typeof x == 'object';
}

// Is x a string?
function isString(x) {
  return (isObject(x) || typeof x == 'string') && x.constructor == ''.constructor;
}

// Is x an array?
function isArray(x) {
  return isObject(x) && x.constructor == [].constructor;
}

// Flatten multi-line strings.
function join(string) {
  return (''+string).replace(/[\r\n] ?/g, ' ');
}

// Quote a string
function quote(string) {
  if (/[\u0080-\uFFFF]/(string)) {
    // TODO: RFC2047 mime encoded tokens.
  }
  if (/[ ()<>@,;:\\"\[\]?=]/(string)) {
    return '"' + string.replace(/([\\"])/g, '\\$1') + '"';
  }
  return string;
}

/**
 * Container for header key/values + parameters.
 *
 * Can parse from and generate to MIME format.
 */
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
  
  /**
   * Set header parsing hint.
   */
  hint: function (key, args) {
    this.hints[key] = args;
  },
  
  /**
   * Return all values + parameters for a key.
   */
  all: function (key) {
    return [ this.fields[key], this.params[key] ];
  },
  
  /**
   * Get one value or parameter.
   */
  get: function (key, param) {
    if (typeof this.fields[key] != 'undefined') {
      if (param) {
        return this.params[key][param];
      }
      return this.fields[key];
    }
  },

  /**
   * Set one or more values and/or parameters.
   *
   * -- Single setters
   * set(key, value)
   * set(key, param, value)
   * 
   * -- Combined value/param setter.
   * set(key, [ value, { param: value, param: value } ])
   * 
   * -- Multi-value setter.
   * set(key, [ value, value, value ])
   * set(key, [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ])
   * 
   * -- Generic hash syntax.
   * set({
   *   key: value,
   *   key: [ value, { param: value }],
   *   key: [ value, value, value ],
   *   key: [ [ value, { param: value, param: value } ], [ value, { param: value, param: value } ] ],
   * })
   */
  set: function (keyObject, paramValue, value, raw) {
    var i, j;
    
    // Raw set to parse individual value from other source.
    if (raw) {
      var spec = this.hints[keyObject] || {};
      this.set(keyObject, this.parseValue(paramValue, spec.params));
      return;
    }
    
    // Remove key.
    if (isString(keyObject) && (typeof paramValue == 'undefined' || paramValue === null)) {
      delete this.fields[keyObject];
      delete this.params[keyObject];
      return;
    }
    
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

/**
 * Mime type detection.
 */
exports.sniff = function (file, data) {
  var type = mime.lookup(file),
      utf8 = true,
      binary = false,
      ansi = false;

  // Detect valid UTF-8.
  // Ignore trailing error due to possible truncation.
  var attempt = data.toString('utf-8').replace(/�$/, ''), error = attempt.indexOf('�');
  if (error != -1) {
    utf8 = false;
  }

  // Detect binary data.
  if (/[\u0000]/(attempt)) {
    binary = true;
  }

  // Detect ansi color codes.
  if (/[\u001b\[[0-9]+m/(attempt)) {
    ansi = true;
    if (type == 'application/octet-stream' || type == 'text/plain') {
      type = [ 'application/octet-stream', { schema: 'termkit.unix' }];
    }
  }

  // Plain text.
  if (utf8 || !binary) {
    return [ type, { charset: 'utf-8' } ];
  }

  // Specific binary type.
  if (type != 'application/octet-stream') {
    return type;
  }

  // If data contains random binary data, then a significant part will be invalid / non-printable.
  // Use hex-view.
  if (!ansi && attempt.replace(/[^\n\r\t\u0020-\uFFFC]/g, '').length < .8 * data.length) {
    return [ type, { schema: 'termkit.hex' } ];
  }
  
  // Fallback, escaped binary text output.
  return type;
};

/**
 * Default type for type classes.
 */
exports.base = function (type) {
  var map = {
    'application/javascript': 'text',
    'application/x-perl': 'text',
    'application/x-php': 'text',
  };
  
  if (map[type]) {
    type = map[type];
  }
  
  return exports.default(type) || 'application/octet-stream';
}

/**
 * Default type for type classes.
 */
exports.default = function (type) {
  type = type.split('/')[0];
  return {
    'text': 'text/plain',
  }[type];
};

/**
 * List of mime types with composable content.
 */
exports.composable = function () {
  return {
    'application/json': 'text/plain',
    'application/javascript': true,
    'application/x-perl': true,
    'application/x-php': true,
    'text/css': true,
    'text/csv': true,
    'text/javascript': true,
    'text/html': true,
    'text/plain': true,
    'text/x-actionscript': true,
    'text/x-applescript': true,
    'text/x-c': true,
    'text/x-c++': true,
    'text/x-csharpsrc': true,
    'text/x-diff': true,
    'text/x-erlang': true,
    'text/x-groovy': true,
    'text/x-java-source': true,
    'text/x-python': true,
    'text/x-ruby': true,
    'text/x-sass': true,
    'text/x-scala': true,
    'text/x-shellscript': true,
    'text/x-sql': true,
  };
};

/**
 * Additional mime types for node-mime.
 */
mime.define({
  'text/x-applescript': ['applescript'],
  'text/x-actionscript': ['actionscript'],
  'text/x-shellscript': ['sh'],
  'text/x-c': ['c','h'],
  'text/x-c++': ['cpp', 'hpp', 'cc', 'hh', 'cxx', 'hxx'],
  'text/x-csharpsrc': ['cs'],
  'text/css': ['css'],
  'text/x-diff': ['diff', 'patch'],
  'text/x-erlang': ['erl', 'hrl'],
  'text/x-groovy': ['groovy'],
  'application/x-perl': ['pl', 'perl'],
  'application/x-php': ['php','phps'],
  'text/x-python': ['py', 'python'],
  'text/x-ruby': ['rb','ruby'],
  'text/x-sass': ['sass', 'scss'],
  'text/x-scala': ['scala'],
  'text/x-sql': ['sql'],
  'text/xml': ['xml'],
});
