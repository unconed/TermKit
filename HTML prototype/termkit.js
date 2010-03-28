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
    
    var token = termkit.inputManager.tokenFactory();

    this.tokenList.add(token);
    this.tokenList.refreshField(this.$field);

    this.selection.anchor(token);
    this.caret.moveTo(this.selection);
    
  }
  event.stopPropagation();
  event.preventDefault();
};

termkit.inputManager.prototype.refreshToken = function (token) {
  $('body').append('<div>refreshToken '+ token.type + ' '+token.contents);
  var update = token.transmute();
  if (update) {
    var index = this.tokenList.indexOf(token);

    this.caret.remove();;

    this.tokenList.replace(token, update);
    this.tokenList.refreshField();

    this.selection.anchor(this.tokenList.tokens[index], this.selection.anchorOffset);
    this.caret.moveTo(this.selection);
  }
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.tokenList = function ($field, onChange) {
  this.$field = $field;
  this.tokens = [];
  this.onChange = onChange || (function () {});
};

termkit.inputManager.tokenList.prototype.debug = function () {
  $.each(this.tokens, function (index) {
    $('body').append('<div>'+ index +': '+ this.type +' "' + this.contents +'"');
  });
};

termkit.inputManager.tokenList.prototype.add = function (token, index) {
  $('body').append('<div>list add '+ token +' @ '+ index);
  token.parent = this;

  if (arguments.length < 2) {
    this.tokens.push(token);
  }
  else {
    this.tokens.splice(index, 0, token);
  }
  this.debug();
};

termkit.inputManager.tokenList.prototype.remove = function (token) {
  var index = this.indexOf(token);
  $('body').append('<div>list remove ' + token +' @ '+ index);
  if (index < 0) return;
  this.tokens.splice(index, 1);
  
  token.parent = null;
  this.debug();
};

termkit.inputManager.tokenList.prototype.replace = function (token, tokens) {
  var index = this.indexOf(token), self = this;
  $('body').append('<div>list replace ' + token +' @ '+ index);
  this.remove(index);
  $.each($.isArray(tokens) && tokens || [tokens], function () {
    self.add(this, index++);
  });
};

termkit.inputManager.tokenList.prototype.indexOf = function (token) {
  return (typeof token == 'number') ? token : $.inArray(token, this.tokens);
};

termkit.inputManager.tokenList.prototype.refreshField = function () {
  var $field = this.$field.empty();
  $.each(this.tokens, function () {
    $field.append(this.$element);
  });
};

///////////////////////////////////////////////////////////////////////////////

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
    // Ensure caret is cleanly removed from its existing position.
    this.remove();
  
    // Examine target token.
    this.selection = selection;
    this.token = selection.anchorToken;
    var $token = this.token.$element;
    var textNode = $token[0].childNodes[0];

    // Prevent token object from updating itself.
    this.token.locked = true;

    if ($token.is(':empty') || (textNode.length >= selection.anchorOffset)) {
      // Append caret at the end of the token.
      $token.append(this.$element);
      this.prefix = $token.text();
    }
    else {
      // Split the text node at the given offset.
      var newNode = textNode.splitText(selection.anchorOffset);
      $(textNode).after(this.$element);
      this.prefix = $(textNode).text();
      this.suffix = $(newNode).text();
    }
  
    this.$input.focus();
  },
  
  remove: function () {
    // Detach caret.
    this.$element.detach();

    if (!this.token) return;

    // Let token update itself.
    this.token.locked = false;

    // Update token with new combined text value.
    var value = this.prefix + this.$measure.text() + this.suffix;
    if (value != '') {
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
    this.$measure.text(this.$input.val());
    this.$input.css('width', this.$measure.width() + 20);
    this.token.contents = this.prefix + this.$input.val() + this.suffix;
    this.tokenList.onChange(this.token);
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

termkit.inputManager.tokenFactory = function (contents) {
  if ((contents || '').length == 0) {
    return new termkit.inputManager.tokenEmpty();
  }

  var sigil = contents.substring(0, 1);
  switch (sigil) {
    case '"':
    case "'":
      return new termkit.inputManager.tokenQuoted(contents);
    default:
      return new termkit.inputManager.token(contents);
  }
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.token = function (type, contents) {
  this.$element = this.$markup;

  this.locked = false;
  this.type = type;
  this.contents = contents;
  this.parent = null;
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
    if (!this.locked) {
      this.$element.attr('class', 'token token-' + this.type);
      this.$element.text(this.contents);
    }
  },
  
  transmute: function () {
    return false;
  },
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.tokenPlain = function (contents) {
  termkit.inputManager.token.call(this, 'plain', contents);
};

termkit.inputManager.tokenPlain.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenPlain.prototype.transmute = function () {
  if (this.contents.length == 0) {
    return new termkit.inputManager.tokenEmpty();
  }
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.tokenQuoted = function (contents) {
  termkit.inputManager.token.call(this, 'quoted', contents.substring(1));
};

termkit.inputManager.tokenQuoted.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenQuoted.prototype.transmute = function () {
  return false;
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.tokenEmpty = function () {
  termkit.inputManager.token.call(this, 'empty', '');
};

termkit.inputManager.tokenEmpty.prototype = new termkit.inputManager.token();

termkit.inputManager.tokenEmpty.prototype.transmute = function () {
  if (this.contents.length == 0) return false;
  if ((this.contents == '"') || (this.contents == "'")) {
    return new termkit.inputManager.tokenQuoted(this.contents);
  }
  else {
    return new termkit.inputManager.tokenPlain(this.contents);
  }
  return this.prototype.transmute();
};

///////////////////////////////////////////////////////////////////////////////


})(jQuery);
