(function ($) {
  
var tf = termkit.tokenField;

/**
 * Represents a single token in the field.
 */
tf.token = function (type, contents) {
  this.$element = this.$markup;

  this.locked = false;
  this.type = type;
  this.contents = contents;
  this.tokenList = null;

  this.allowEmpty = false;
};

tf.token.prototype = {
  get $markup() {
    var $token = $('<span>').data('token', this);
    var self = this;
    $token//. bind events
    return $token;
  },

  get type() { return this._type; },
  set type(type) {
    type = type || 'unknown';
    this._type = type;
    this.update();
  },

  get contents() { return this._contents; },
  set contents(contents) {
    contents = contents || '';
    this._contents = contents;
    this.update();
  },
  
  update: function () {
    this.$element.attr('class', 'token token-' + this.type);
    if (!this.locked) {
      this.$element.html(escapeText(this.contents));
    }
  },

  transmute: function (token) {
    if (this.contents == token.contents) {
      this.constructor = token.constructor;
      this.evolve = token.evolve;
      this.type = token.type;
      this.allowEmpty = token.allowEmpty;
      return true;
    }
  },
  
  munge: function (selection, event) {
    var token = this, t = tf.token.triggers;
    if (t[this.type]) {
      var update, triggers = [].concat(t[this.type], t['*']);
      $.each(triggers, function () {
        var match, changes = '';
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
        // If this token is being edited, capture individual changes
        if (event && event.charCode && (token == selection.anchor.token)) {
          var o = selection.anchor.offset;
          changes = token.contents.substring(o - 1, o);
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
      if (update) {
        return update;
      }
    }
    return false;
  },

  evolve: function () {
    return false;
  },
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Blank token.
 */
tf.tokenEmpty = function () {
  tf.token.call(this, 'empty', '');
};

tf.tokenEmpty.triggerEmpty = function (selection, event) {
  return [new tf.tokenEmpty()];
};

tf.tokenEmpty.prototype = $.extend(new tf.token(), {});

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing plain text.
 */
tf.tokenPlain = function (contents) {
  tf.token.call(this, 'plain', contents);
};

tf.tokenPlain.triggerCharacter = function (offset, event) {
  return [new tf.tokenPlain(this.contents)];
};

tf.tokenPlain.splitSpace = function (offset, event) {
  var before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);
  return [
    new tf.tokenPlain(before),
    new tf.tokenPlain(after)
  ];
};

tf.tokenPlain.prototype = $.extend(new tf.token(), {});

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing quoted text.
 */
tf.tokenQuoted = function (contents) {
  tf.token.call(this, 'quoted', contents);
  this.allowEmpty = true;
};

tf.tokenQuoted.triggerQuote = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  if (before != '') {
    out.push(new tf.tokenPlain(before));
  }
  out.push(new tf.tokenQuoted(after));

  return out;
};

tf.tokenQuoted.triggerRequote = function (offset, event) {
  if (offset == 1 && tf.tokenQuoted.requoteWaiting) {
    var prev = this.tokenList.prev(this);
    prev.contents = prev.contents + this.contents;
    tf.tokenQuoted.requoteWaiting = false;
    return [];
  }
}

tf.tokenQuoted.triggerResetQuote = function (offset, event) {
  tf.tokenQuoted.requoteWaiting = false;
}

tf.tokenQuoted.triggerUnquote = function (offset, event) {
  
  var out = [],
      before = this.contents.substring(0, offset - 1),
      after = this.contents.substring(offset);

  if (before != '' || after == '') {
    out.push(new tf.tokenQuoted(before));
  }
  if (after != '') {
    out.push(new tf.tokenQuoted(after));
  }
  else {
    out.push(new tf.tokenEmpty());
  }
  
  tf.tokenQuoted.requoteWaiting = true;

  return out;
};

tf.tokenQuoted.prototype = $.extend(new tf.token(), {

  evolve: function (selection, event) {
  },

});

///////////////////////////////////////////////////////////////////////////////

tf.token.triggers = {
  '*': [
    { changes: /./, callback: tf.tokenQuoted.triggerResetQuote },
  ],
  'empty': [
    { contents: /^["']/, callback: tf.tokenQuoted.triggerRequote },
    { contents: /["']/,  callback: tf.tokenQuoted.triggerQuote },
    { contents: /./,     callback: tf.tokenPlain.triggerCharacter },
    { contents: / /,     callback: tf.tokenPlain.triggerEmpty },
  ],
  'plain': [
    { contents: /^ ?$/,   callback: tf.tokenEmpty.triggerEmpty },
    { changes: / /,    callback: tf.tokenPlain.splitSpace },
    { changes: /["']/, callback: tf.tokenQuoted.triggerQuote },
  ],
  'quoted': [
    { changes: /["']/, callback: tf.tokenQuoted.triggerRequote },
    { changes: /["']/, callback: tf.tokenQuoted.triggerUnquote },
  ],
};

})(jQuery);
