var exec = require('child_process').exec;

/**
 * Process shortcut return values
 *
 * Accepts input of the forms:
 *
 *  false, null, undefined, 0 (success)
 *  true, 1 (error)
 *  exitCode (integer, specific error)
 *  [ exitCode, data ] (integer exitCode + object to return)
 *  
 * 
 */
exports.returnMeta = function (status, meta) {
  var code = 0;
  meta = meta || {};

  if (typeof status == 'number') {
    status = number > 0;
    code = number;
  }
  else if (typeof status == 'boolean') {
    code = +status;
  }
  else {
    status = false;
  }
  
  meta.status = status;
  meta.code = code;

  return meta;
};

exports.composePath = function (name, path) {
  if (path != '' && path !== undefined && path !== null) {
    name = path.replace(/\/$/, '') +'/'+ name;
  };
  return name;
};

/**
 * Generator for decorator to track asynchronous tasks.
 *
 * Allows you to execute a complicated dynamic callback hierarchy and
 * call a handler when all marked callbacks have finished.
 *
 * @param done
 *   Callback to call when all callbacks are done.
 * @param ...
 *   Additional arguments for the done callback.
 *
 * @return function queue (callback)
 *   Decorator for a callback to track.
 *
 */
exports.whenDone = function (done) {
  // Initialize closure variable.
  var count = 0,
  // Store additional arguments.
      done_args = [].slice.call(arguments, 1);
  return function (callback) {
    // Register new task.
    count++;
    // Decorate callback with exit-checker.
    return function () {
      callback && callback.apply(this, arguments);
      if (--count == 0) {
        done.apply(this, done_args);
      }
    }
  }
}

/**
 * Execute a function asynchronously.
 */
exports.async = function (func) {
  var that = this,
      args = [].slice.call(arguments, 1);
  setTimeout(function () { func.apply(that, args); }, 0);
}

/**
 * Make an asynchronously executed callback.
 */
exports.asyncCallback = function (func) {
  var that = this,
      args = [].slice.call(arguments, 1);
  return function () {
    setTimeout(function () { func.apply(that, args); }, 0);
  };
}

/**
 * Extend object with getter/setter support.
 */
exports.extend = function (a,b) {
    for ( var i in b ) {
        var g = b.__lookupGetter__(i), s = b.__lookupSetter__(i);
       
        if ( g || s ) {
            if ( g )
                a.__defineGetter__(i, g);
            if ( s )
                a.__defineSetter__(i, s);
         } else
             a[i] = b[i];
    }
    return a;
}

/**
 * Expand a local file path.
 */
exports.expandPath = function (path, callback) {
  if (path[0] == '~') {
    if (path.length == 1 || path[1] == '/') {
      return callback(process.env.HOME + path.substring(1));
    }
    else {
      // TODO: support ~user syntax. Need getpwnam bindings to work across BSD/Linux.
    }
  }
  return callback(path);
}


/**
 * JSON pretty printer.
 */
exports.JSONPretty = function (data) {
  // Normalize to compact JSON.
  if (typeof data == 'string') {
    data = JSON.parse(data);
  }
  data = JSON.stringify(data);
  
  // Add spaces around operators and quotes.
  data = data.replace(/("[^"]*"|'[^']*')?([\[{:,}\]](?!\s))/g, '$1$2 ');
  data = data.replace(/(\S)([\]}])/g, '$1 $2');

  // Add linebreaks around element/list separators.
  data = data.replace(/[ \n\t]+([\]}])/g, " $1");
  data = data.replace(/ ([\]}])/g, "\n$1");
  data = data.replace(/(("[^"]*"|'[^']*')?[\[{,])[ \n\t]+/g, "$1 ");
  data = data.replace(/(("[^"]*"|'[^']*')?[\[{,] )/g, "$1\n");

  // Indent
  var m = [],
      indent = 0,
      data = data.split("\n");
  
  for (i in data) (function (line) {
    // Count closing chars.
    indent -= (m = line.match(/[\]}]/g)) && m.length;

    // Two spaced indent.
    line = Array(indent + 1).join('  ') + line;

    // Count opening chars.
    indent += (m = line.match(/[\[{]/g)) && m.length;
    data[i] = line;
  })(data[i]);
  
  return data.join("\n");
}

/**
 * Parse command arguments.
 *
 * -x -> options[x] = true
 * --foo -> options[foo] = true
 * --foo bar -> options[foo] = 'bar'
 */
exports.parseArgs = function (tokens) {
  var options = {},
      values = [],
      n = tokens.length,
      i = 1, m;

  for (; i < n; ++i) (function (token) {
    if (m = /^-([A-Za-z0-9_])$/(tokens[i])) {
      options[m[1]] = true;
    }
    else if (m = /^-([A-Za-z0-9_][A-Za-z0-9_-]*)$/(tokens[i])) {
      var flags = m[1].split(''), j;
      for (j in flags) {
        options[flags[j]] = true;
      }
    }
    else if (m = /^--([A-Za-z0-9_-]+)$/(tokens[i])) {
      if (typeof tokens[i + 1] != 'undefined' && tokens[i + 1][0] != '-') {
        ++i;
        options[m[1]] = tokens[i];
      }
      else {
        options[m[1]] = true;
      }
    }
    else {
      values.push(tokens[i]);
    }
  })(tokens[i]);
  
  return { values: values, options: options };
}

/**
 * Return array of object keys.
 */
exports.objectKeys = function (object) {
  var keys = [];
  for (i in object) keys.push(i);
  return keys;
}

/**
 * Escape binary data for display as HTML.
 */
exports.escapeBinary = function (data) {
  if (typeof data != 'string') {
    data = data.toString('utf-8');
  }
  var binary = data, n = binary.length, i = 0;

  // Escape non-printables
  binary = binary.replace(/([\u0000-\u001F\u0080-\u009F])/g, function (x, char) {
    if (/[^\r\n\t]/(char)) {
      var num = char.charCodeAt(0).toString(16);
      while (num.length < 4) num = '0' + num;
      return '\\u' + num;
    }
    return char;
  });

  return binary;
}

/**
 * Escape textual Unix data for display as HTML.
 */
exports.escapeUnixText = function (data) {
  if (typeof data != 'string') {
    data = data.toString('utf-8');
  }
  var binary = data, n = binary.length, i = 0;

  // Escape HTML characters.
  binary = binary.replace(/[<&]/g, function (x) {
    return { '<': '&lt;', '&': '&amp;' }[x];
  });

  // ANSI state.
  var bold = false,
      italic = false,
      underline = false,
      blink = false,
      strike = false,
      invert = false,
      fg = 0,
      bg = 0;

  // Handle ANSI escapes.
  binary = binary.replace(/\u001b\[([0-9]+(?:;[0-9]+)*)?([A-Za-z])/g, function (x, codes, command) {
    // Remove non-color codes.
    if (command != 'm') return '';
    
    codes = codes.split(';');
    
    // Replace each code with a closing and opening span.
    function span() {
      var out = '</span>';
      var styles = [];
      
      if (bold) styles.push('font-weight: bold');
      if (italic) styles.push('font-variant: italic');
      
      var deco = [];
      if (blink) deco.push('blink');
      if (underline) deco.push('underline');
      if (strike) styles.push('line-through');
      if (deco.length) styles.push('text-decoration: ' + deco.join(' '));
      
      var color = invert ? bg : fg + (bold ? 'b' : ''),
          background = invert ? fg : bg;
      
      var klass = [ 'termkitAnsiFg' + color, 'termkitAnsiBg' + background ];
      
      out += '<span class="'+ klass.join(' ') +'" style="' + styles.join(';') + '">';

      return out;
    }
    
    // Supported codes.
    for (i in codes) {
//      process.stderr.write('code ' +  + "\n");
      switch (parseInt(codes[i], 10)) {
        case 0:
          bold = italic = underline = blink = strike = bright = invert = false;
          fg = bg = 0;
          break;
        
        case 1:
          bold = true;
          break;
        
        case 3:
          italic = true;
          break;
          
        case 4:
          underline = true;
          break;
        
        case 5:
          blink = true;
          break;
        
        case 7:
          invert = true;
          break;
        
        case 9:
          strike = true;
          break;
        
        case 21:
          bold = false;
          break;
        
        case 23:
          italic = false;
          break;
        
        case 24:
          underline = false;
          break;
        
        case 25:
          blink = false;
          break;
        
        case 27:
          invert = false;
          break;
        
        case 29:
          strike = false;
          break;
        
        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
          fg = codes[i] - 30;
          break;

        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          bg = codes[i] - 40;
          break;

      }

      return span();
    }
  });
  binary = '<span>'+ binary +'</span>';

  // Handle antique bold/italic escapes used by grotty -c.
  binary = binary
    .replace(/_\u0008(.)\u0008\1/g, function (x, char) {
      return '<b><i>' + char + '</i></b>';
    })
    .replace(/(.)\u0008\1/g, function (x, char) {
      return '<b>' + char + '</b>';
    })
    .replace(/_\u0008(.)/g, function (x, char) {
      return '<i>' + char + '</i>';
    });

  return exports.escapeBinary(binary);
}
