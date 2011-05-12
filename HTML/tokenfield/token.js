(function ($) {
  
var tf = termkit.tokenField;

/**
 * Represents a single token in the field.
 */
tf.token = function (type, contents, style) {
  this.$element = this.$markup();

  this.locked = false;
  this.type = type;
  this.contents = contents;
  this.style = style;
  this.container = null;
  this.flags = {};

  this.allowEmpty = false;
};

///////////////////////////////////////////////////////////////////////////////

tf.token.prototype = {

  // Return active markup for this token.
  $markup: function () {
    var $token = $('<span>').data('controller', this);
    var that = this;
    return $token;
  },

  // Pass-through length of contents
  get length() {
    return this.contents.length;
  },
  
  // Type/class
  get type() { return this._type; },
  set type(type) {
    this._type = type || 'unknown';
    this.updateElement();
  },

  // Style
  get style() { return this._style; },
  set style(style) {
    this._style = style || '';
    this.updateElement();
  },

  // Text of contents
  get contents() { return this._contents; },
  set contents(contents) {
    this._oldContents = this._contents;
    this._contents = contents || '';
    this.updateElement();
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {
    this.$element.data('controller', this);
    this.$element.attr('class', 'token token-' + this.type);
    if (this._style) {
      this.$element.addClass('style-' + this._style);
    }
    if (!this.locked) {
      this.$element.html('<span class="contents">'+ escapeText(this.contents) +'</span>');
    }
  },

  // Transmute this token into a different type/class in-place to maintain focus/state.
  transmute: function (token, force) {
    if (force || this.contents == token.contents) {
      this.constructor = token.constructor;
      this.type = token.type;
      this.style = token.style;
      this.allowEmpty = token.allowEmpty;
      this.__proto__ = token.__proto__;
      return true;
    }
  },
  
  // Use triggers to respond to a creation or change event.
  // @return Array of replacement tokens for this token (optional).
  checkTriggers: function (selection, event) {
    var token = this, t = tf.token.triggers;

    // Apply type 
    var update, triggers = [].concat(t[this.type] || [], t['*'] || []);
    $.each(triggers, function () {
      var match, changes = '';
      // If this token's contents are being edited, capture individual changes as they come in.
      if (event && event.charCode && (token == selection.anchor.token)) {
        var o = selection.anchor.offset;
        changes = token.contents.substring(o - 1, o);
      }
      // Check keycode constraints
      if (this.keys && this.keys.length) {
        if (!event || !event.keyCode || ($.inArray(event.keyCode, this.keys) < 0)) {
          return;
        }
      }
      // Check charcode constraints
      if (this.chars && this.chars.length) {
        if (!event || !event.charCode || ($.inArray(event.charCode, this.chars) < 0)) {
          return;
        }
      }
      // Check contents contraints
      if (this.contents && (match = this.contents.exec(token.contents))) {
        update = this.callback.call(token, match.index + match[0].length, event);
        if (update) {
          return false;
        }
      }
      // Check changes contraints
      if (this.changes && (match = this.changes.exec(changes))) {
        update = this.callback.call(token, selection.anchor.offset, event);
        if (update) {
          return false;
        }
      }
    });
    // Return array of replacement tokens.
    if (update) {
      return update;
    }
    return false;
  },

  // Apply self-consistency checks when changing.
  checkSelf: function () {
    return false;
  },
  
  // Convert to debug string.
  toString: function () {
    return '['+ this.contents + '(' + this.type +')]';
  },

  // Convert token to executable command format.
  toCommand: function () {
    return this.contents;
  },
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Blank token.
 */
tf.tokenEmpty = function () {
  tf.token.call(this, 'empty', '');
};

/**
 * Make token empty.
 */
tf.tokenEmpty.triggerEmpty = function (offset, event) {
  return [new tf.tokenEmpty()];
};

tf.tokenEmpty.prototype = $.extend(new tf.token(), {});

///////////////////////////////////////////////////////////////////////////////

/**
 * Pipe token.
 */
tf.tokenPipe = function () {
  tf.token.call(this, 'pipe', '');
  this.allowEmpty = true;
};

/**
 * Make token a pipe.
 */
tf.tokenPipe.triggerPipe = function (offset, event) {
  if (this.contents.length > 1) {
    var parts = this.contents.split('|'),
        prefix = parts[0],
        suffix = parts[1];
    
    return [
      new (this.constructor)(prefix, this.style),
      new tf.tokenPipe(),
      new (this.constructor)(suffix)];
  }
  return [new tf.tokenPipe(), new tf.tokenEmpty()];
};

tf.tokenPipe.prototype = $.extend(new tf.token(), {

  updateElement: function () {
    tf.token.prototype.updateElement.apply(this, arguments);
    this.$element.html('<span class="contents"> </span>');
  },

  toCommand: function () {
    return '|';
  },
  
  checkSelf: function () {
//    console.log('pipe checkSelf', arguments);
  },
  
});

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing plain text.
 */
tf.tokenPlain = function (contents, style) {
  tf.token.call(this, 'plain', contents, style);
};

tf.tokenPlain.prototype = $.extend(new tf.token(), {});

/**
 * When autocompleted, ensure type constraints are still valid.
 */
tf.tokenPlain.triggerComplete = function (offset, event) {
  
  var out = [],
      test = this.contents;

  // Split trailing space.
  if (/ $/(test)) {
    test = test.substring(0, test.length - 1);
    out.push(new tf.tokenEmpty());
  }

  // Special characters must be quoted.
  var type = /[ "'\\]/(test) ? tf.tokenQuoted : tf.tokenPlain;
  out.unshift(new type(test, this.style));

  return out;
};

/**
 * Tokens with characters should become plain.
 */
tf.tokenPlain.triggerCharacter = function (offset, event) {
  return [new tf.tokenPlain(this.contents, this.style)];
};

/**
 * Spaces inside plain tokens are not allowed, split up.
 */
tf.tokenPlain.splitSpace = function (offset, event) {
  var before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);
  return [
    new tf.tokenPlain(before, this.style),
    new tf.tokenPlain(after)
  ];
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing quoted text.
 */
tf.tokenQuoted = function (contents, style) {
  tf.token.call(this, 'quoted', contents, style);
  this.allowEmpty = true;
};

tf.tokenQuoted.prototype = $.extend(new tf.token(), {

  /**
   * Apply self-consistency checks.
   */ 
  checkSelf: function (selection, event) {
    // When backspacing from empty quoted token into another, remove ourselves.
    // Required due to allowEmpty == true.
    if (event.keyCode == 8 && this.contents == '' && selection.anchor.token != this) {
      return [];
    }
  },

});

/**
 * When autocompleted, split off trailing space.
 */
tf.tokenQuoted.triggerComplete = function (offset, event) {
  
  var out = [],
      test = this.contents;

  // Split trailing space.
  if (/ $/(test)) {
    test = test.substring(0, test.length - 1);
    out.push(new tf.tokenEmpty());
  }
  
  out.unshift(new tf.tokenQuoted(test, this.style));

  return out;
};

/**
 * Start a double-tap escape.
 */
tf.tokenQuoted.setEscape = function () {
  tf.tokenQuoted.escapeWaiting = true;
};

/**
 * Remove state for double-tap escape.
 */
tf.tokenQuoted.resetEscape = function () {
  tf.tokenQuoted.timer && clearTimeout(tf.tokenQuoted.timer);
  tf.tokenQuoted.timer = setTimeout(function () {
    tf.tokenQuoted.escapeWaiting = false;
  }, 1500);
};

/**
 * Process a lone quote character in a plain token.
 */
tf.tokenQuoted.triggerQuote = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  if (before != '') {
    out.push(new tf.tokenPlain(before));
  }
  out.push(new tf.tokenQuoted(after, this.style));

  tf.tokenQuoted.setEscape();

  return out;
};

/**
 * Unquote out of a quoted token.
 */
tf.tokenQuoted.triggerUnquote = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  // Split off parts.
  if (before != '' || after == '') {
    out.push(new tf.tokenQuoted(before, this.style));
  }
  if (after != '') {
    out.push(new tf.tokenQuoted(after));
  }
  else {
    out.push(new tf.tokenEmpty());
  }
  
  // Could be a double-tap escape.
  tf.tokenQuoted.setEscape();

  return out;
};

/**
 * Check for double-tap escape.
 */
tf.tokenQuoted.triggerEscape = function (offset, event) {
  // If we typed a lone quote.
  if (offset == 1 && tf.tokenQuoted.escapeWaiting) {
    // Add contents to previous token.
    var prev = this.container.prev(this);
    prev.contents = prev.contents + this.contents;
    tf.tokenQuoted.resetEscape();
    
    // Remove ourselves.
    return [];
  }
}

/**
 * Reset escape flag after modifications.
 */
tf.tokenQuoted.triggerResetEscape = function (offset, event) {
  tf.tokenQuoted.resetEscape();
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing a regex.
 */
tf.tokenRegex = function (contents, style) {
  tf.token.call(this, 'regex', contents, style);
  this.allowEmpty = true;
};

tf.tokenRegex.resetEscape = function () {
  tf.tokenRegex.timer && clearTimeout(tf.tokenRegex.timer);
  tf.tokenRegex.timer = setTimeout(function () {
    tf.tokenRegex.escapeWaiting = false;
  }, 1000);
};

tf.tokenRegex.setEscape = function () {
  tf.tokenRegex.escapeWaiting = true;
  tf.tokenRegex.resetEscape();
};

tf.tokenRegex.triggerRegex = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  if (before != '') {
    out.push(new tf.tokenPlain(before));
  }
  out.push(new tf.tokenRegex(after));

  tf.tokenRegex.setEscape();

  return out;
};

tf.tokenRegex.triggerUnregex = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  if (before != '' || after == '') {
    out.push(new tf.tokenRegex(before));
  }
  if (after != '') {
    out.push(new tf.tokenRegex(after));
  }
  else {
    out.push(new tf.tokenEmpty());
  }
  
  tf.tokenRegex.setEscape();
  
  return out;
};


tf.tokenRegex.triggerEscape = function (offset, event) {
  if (offset == 1 && tf.tokenRegex.escapeWaiting) {
    var prev = this.container.prev(this);
    prev.contents = prev.contents + this.contents;
    tf.tokenRegex.resetEscape();
    return [];
  }
}

tf.tokenRegex.triggerResetEscape = function (offset, event) {
  tf.tokenRegex.resetEscape();
}

tf.tokenRegex.prototype = $.extend(new tf.token(), {

  checkSelf: function (selection, event) {
  },

});

///////////////////////////////////////////////////////////////////////////////

tf.token.triggers = {
  '*': [
    { changes: /./, callback: tf.tokenQuoted.triggerResetEscape },
//    { changes: /./, callback: tf.tokenRegex.triggerResetEscape },
  ],
  'empty': [
    { contents: /^["']/, callback: tf.tokenQuoted.triggerEscape },
    { contents: /["']/,  callback: tf.tokenQuoted.triggerQuote },
//    { contents: /^[\/]/, callback: tf.tokenRegex.triggerEscape },
//    { contents: /[\/]/,  callback: tf.tokenRegex.triggerRegex },
    { contents: /./,     callback: tf.tokenPlain.triggerCharacter },
    { contents: / /,     callback: tf.tokenPlain.triggerEmpty },
    { contents: /\|/,    callback: tf.tokenPipe.triggerPipe },
  ],
  'plain': [
    { contents: / /,     callback: tf.tokenPlain.triggerComplete, keys: [ 9, 13 ] },
    { contents: /^ ?$/,  callback: tf.tokenEmpty.triggerEmpty },
    { changes: / /,      callback: tf.tokenPlain.splitSpace },
    { changes: /["']/,   callback: tf.tokenQuoted.triggerQuote },
//    { changes: /[\/]/,   callback: tf.tokenRegex.triggerRegex },
    { changes: /\|/,     callback: tf.tokenPipe.triggerPipe },
  ],
  'quoted': [
    { contents: / $/,    callback: tf.tokenQuoted.triggerComplete, keys: [ 9, 13 ] },
    { changes: /["']/,   callback: tf.tokenQuoted.triggerEscape },
    { changes: /["']/,   callback: tf.tokenQuoted.triggerUnquote },
  ],
/*  'regex': [
    { changes: /[\/]/,   callback: tf.tokenRegex.triggerEscape },
    { changes: /[\/]/,   callback: tf.tokenRegex.triggerUnregex },
  ],*/
};


})(jQuery);
