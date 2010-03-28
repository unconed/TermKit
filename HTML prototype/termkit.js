var termkit = {};

(function ($) {
  
///////////////////////////////////////////////////////////////////////////////

function async_callback(func) {
  return function () { 
    var self = this;
    var args = arguments;
    setTimeout(function () { func.apply(self, args); }, 0);
  };
}

function async(func) {
  var self = this;
  setTimeout(function () { func.call(self); }, 0);
}

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

///////////////////////////////////////////////////////////////////////////////

$.fn.termkitTokenField = function (options) {
  var $container = this;

  // Don't process same field twice.
  if ($container.is('.termkitTokenField')) return;
  $container.addClass('termkitTokenField');  

  // Parse options.
  var defaults = {
  };
  options = $.extend(options, defaults);

  // Create input manager for field.
  var input = new termkit.inputManager($container[0]);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Input manager for token-based field.
 */
termkit.inputManager = function (field) {
  var self = this;
  var $field = this.$field = $(this.field = field);
  
  this.tokenList = new termkit.inputManager.tokenList(this.$field, function (t) { self.refreshToken(t); });
  this.caret = new termkit.inputManager.caret(this.tokenList);
  this.selection = new termkit.inputManager.selection();
  
  // Set field event handlers.
  $field.mousedown(function (e) { self.fieldMouseDown(e); });
  
};

termkit.inputManager.prototype.fieldMouseDown = function (event) {
  var $target = $(event.target);
  if ($target.is('.termkitTokenField')) {

    this.caret.remove();;
    
    var token = new termkit.inputManager.tokenEmpty();

    this.tokenList.add(token);
    this.tokenList.refreshField(this.$field);

    this.selection.anchor(token);
    this.caret.moveTo(this.selection);
    
  }
  event.stopPropagation();
  event.preventDefault();
};

termkit.inputManager.prototype.refreshToken = function (token) {
  var update = token.evolve(this.selection);
  if (update) {
    // Allow both single replacement token as well as array of tokens.
    if (update.length === undefined) update = [update];

    // Try to transmute token in place if possible to retain native caret/editing state.
    if (update.length == 1) {
      if (token.transmute(update[0])) {
        return;
      }
    }

    // Replace with new token(s).
    var index = this.tokenList.indexOf(token);

    this.caret.remove();

    this.tokenList.replace(token, update);
    this.tokenList.refreshField();

    this.selection.anchor(this.tokenList.tokens[index], this.selection.anchorOffset);
    this.caret.moveTo(this.selection);
  }
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Manages the list of tokens.
 */
termkit.inputManager.tokenList = function ($field, onChange) {
  this.$field = $field;
  this.tokens = [];
  this.onChange = onChange || (function () {});
};

termkit.inputManager.tokenList.prototype.debug = function () {
  $.each(this.tokens, function (index) {
    $('body').append('<div>'+ index +': '+ this.type +' "' + this.contents +'" (' + this.locked +')');
  });
};

termkit.inputManager.tokenList.prototype.add = function (token, index) {
  //$('body').append('<div>list add '+ token +' @ '+ index);
  token.parent = this;

  if (arguments.length < 2 || index == -1) {
    this.tokens.push(token);
  }
  else {
    this.tokens.splice(index, 0, token);
  }
};

termkit.inputManager.tokenList.prototype.remove = function (token) {
  var index = this.indexOf(token);
  //$('body').append('<div>list remove ' + token +' @ '+ index);
  if (index < 0) return;
  this.tokens.splice(index, 1);
  
  token.parent = null;
};

termkit.inputManager.tokenList.prototype.replace = function (token, tokens) {
  var index = this.indexOf(token), self = this;
  //$('body').append('<div>list replace ' + token +' @ '+ index);
  this.remove(index);
  $.each($.isArray(tokens) && tokens || [tokens], function () {
    self.add(this, index++);
  });
};

termkit.inputManager.tokenList.prototype.indexOf = function (token) {
  return (typeof token == 'number') ? token : $.inArray(token, this.tokens);
};

termkit.inputManager.tokenList.prototype.next = function (token) {
  return this.tokens[this.indexOf(token) + 1];
};

termkit.inputManager.tokenList.prototype.prev = function (token) {
  return this.tokens[this.indexOf(token) - 1];
};

termkit.inputManager.tokenList.prototype.refreshField = function () {
  var $field = this.$field.empty();
  $.each(this.tokens, function () {
    $field.append(this.$element);
  });
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Represents a selection inside the token-field.
 */
termkit.inputManager.selection = function () {
  this.anchorToken = null;
  this.anchorOffset = 0;
  this.focusToken = null;
  this.focusOffset = 0;
};

termkit.inputManager.selection.prototype.anchor = function (token, offset) {
  this.focusToken = this.anchorToken = token || null;
  this.focusOffset = this.anchorOffset = offset || 0;
};

termkit.inputManager.selection.prototype.focus = function (token, offset) {
  this.focusToken = token || this.anchorToken;
  this.focusOffset = offset || this.anchorOffset;
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Emulates a caret inside a token using an invisible ad-hoc textfield.
 */
termkit.inputManager.caret = function (tokenList) {
  this.tokenList = tokenList;
  
  this.$element = this.$markup;
  this.$input = this.$element.find('input');
  this.$measure = this.$element.find('.measure');
  
  this.token = null;
  this.selection = null;
  
  this.prefix = this.suffix = '';
};

termkit.inputManager.caret.prototype = {
  get $markup() {
    var $caret = $('<span id="caret"><input /><span class="measure"></span></span>');
    var self = this;
    $caret.find('input')
      .keydown(function (e) { self.onKeyDown(e); })
      .keypress(function (e) { self.onKeyPress(e); })
      .blur(function (e) { self.onBlur(); });
    return $caret;
  },

  moveTo: function (selection) {
    $('body').append('<div>moving to token ' + selection.anchorToken + ' @ ' + selection.anchorOffset);
    
    // Ensure caret is cleanly removed from its existing position.
    this.remove();

    this.tokenList.debug();
  
    // Examine target token.
    this.selection = selection;
    var token = selection.anchorToken;
    var $token = token.$element;
    var text = token.contents;

    if (text.length < selection.anchorOffset) {
      // Out-of-bounds, move to next token.
      var next = this.tokenList.next(token);
      if (next) {
        selection.anchor(next, selection.anchorOffset - text.length - 1);
        return this.moveTo(selection);
      }
      else {
        return;
      }
    }
    else if (text == '' || (text.length == selection.anchorOffset)) {
      // TODO: boudns checking should be done by selection obj validation
      // Append caret at the end of the token.
      $token.append(this.$element);
      this.prefix = text;
    }
    else {
      // Inside bounds, split text node and insert caret.
      this.prefix = text.substring(0, selection.anchorOffset);
      this.suffix = text.substring(selection.anchorOffset);
      
      // should call token.update() and split resulting textnode instead 
      
      // Split the text node at the given offset.
      this.token.$element
        .empty()
        .append(this.prefix)
        .append(this.$element)
        .append(this.suffix);
    }

    // Prevent token object from updating itself.
    this.token = token;
    this.token.locked = true;

    // Focus caret.
    this.$input.focus();
  },
  
  remove: function () {
    // Detach caret elements from document.
    this.$element.detach();

    if (!this.token) return;

    // Let token update itself.
    this.token.locked = false;

    // Update token with new combined text value.
    var value = this.prefix + this.$measure.text() + this.suffix;
    if ((value != '') || this.token.allowEmpty) {
      this.token.contents = value;
    }
    else {
      this.tokenList.remove(this.token);
      this.tokenList.refreshField();
    }

    // Reset caret state.
    this.$measure.html('');
    this.$input.val('');
    this.prefix = this.suffix = '';
    this.token = null;
    this.selection = null;
  },

  onBlur: function (element) {
    this.remove();
  },

  onKeyPress: function (event) {
//    async.call(this, function () {
//      this.updateContents();
//    });
  },

  updateContents: function () {
    this.selection.anchorOffset = this.$input[0].selectionStart + this.prefix.length;
    
    var old = this.token;
    this.token.contents = this.prefix + this.$input.val() + this.suffix;

    // Needs to be async, otherwise DOM weirdness occurs??
    async.call(this, function () {
      this.tokenList.onChange(this.token);
    });

    if (old == this.token) {
      this.$measure.text(this.$input.val());
      this.$input.css('width', this.$measure.width() + 20);
    }
  },
  
  
};

termkit.inputManager.caret.prototype.onKeyDown = function (event) {
  async.call(this, function () {
    this.updateContents();
  });
};

termkit.inputManager.caret.prototype.reset = function () {
  // find caret offset inside textfield
  // calculate length of prefix
  // remove caret
  // insert caret at given pos
};

$(document).ready(function () {

  function mark(object, id) {
    $.each(object, function (index) {
      if ($.isFunction(this)) {
        var old = object[index];
        object[index] = function () {
          async($('body').append('<div>'+ id +'.' + index +' - ' +' '+ arguments));
          return old.apply(this, arguments);
        };
      }
    });
  }
  
//  mark(termkit.inputManager.token, 'inputManager.token');
//  mark(termkit.inputManager.token.prototype, 'inputManager.token');
});

///////////////////////////////////////////////////////////////////////////////

/**
 * Represents a single token in the field.
 */
termkit.inputManager.token = function (type, contents) {
  this.$element = this.$markup;

  this.locked = false;
  this.type = type;
  this.contents = contents;

  this.allowEmpty = false;
};

termkit.inputManager.token.prototype = {
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
  
  evolve: function () {
    return false;
  },
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Blank token.
 */
termkit.inputManager.tokenEmpty = function () {
  termkit.inputManager.token.call(this, 'empty', '');
};

termkit.inputManager.tokenEmpty.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenEmpty.prototype.evolve = function (selection) {
  if (this.contents.length == 0) return false;
  if ((this.contents[0] == '"') || (this.contents[0] == "'")) {
    selection.anchorOffset--;
    return new termkit.inputManager.tokenQuoted(this.contents);
  }
  else {
    return new termkit.inputManager.tokenPlain(this.contents);
  }
  return this.prototype.evolve();
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing plain text.
 */
termkit.inputManager.tokenPlain = function (contents) {
  termkit.inputManager.token.call(this, 'plain', contents);
};

termkit.inputManager.tokenPlain.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenPlain.prototype.evolve = function () {
  if (this.contents.length == 0) {
    return new termkit.inputManager.tokenEmpty();
  }
  var split = this.contents.split(/\s/);
  if (split.length > 1) {
    var update = [];
    $.each(split, function () {
      update.push(new termkit.inputManager[this.length ? 'tokenPlain' : 'tokenEmpty'](this));
    });
    return update;
  }
  return false;
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing quoted text.
 */
termkit.inputManager.tokenQuoted = function (contents) {
  termkit.inputManager.token.call(this, 'quoted', contents.substring(1));
  this.allowEmpty = true;
};

termkit.inputManager.tokenQuoted.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenQuoted.prototype.evolve = function () {
  return false;
};

termkit.inputManager.tokenQuoted.prototype.allowEmpty = function () {
  return true;
};

///////////////////////////////////////////////////////////////////////////////


})(jQuery);
