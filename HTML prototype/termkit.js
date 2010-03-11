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
  
  this.tokens = [];
  this.caret = new termkit.inputManager.caret();
  
  // Set field event handlers.
  $field.mousedown(function (e) { self.fieldMouseDown(e); });
  
};

termkit.inputManager.prototype.fieldMouseDown = function (event) {
  var $target = $(event.target);
  if ($target.is('.termkitTokenField')) {
    this.caret.insertInto($target);
  }
  event.stopPropagation();
  event.preventDefault();
};

termkit.inputManager.prototype.focus = function ($token) {
  if (this.focused && this.focused == ($token || this.$field)) return;
  this.focused = $token || this.$field;

  this.$field.addClass('focused');
  this.removeCaret();
  this.insertCaret($token);

  this.debug();
};

termkit.inputManager.prototype.blur = function () {
  if (!this.focused) return;
  this.focused = false;

  this.$field.removeClass('focused');
  this.removeCaret();
  
  this.debug();
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.caret = function () {
  this.$caret = this.getElement();
  this.$input = this.$caret.find('input');
  this.$measure = this.$caret.find('.measure');
};

termkit.inputManager.caret.prototype.getElement = function () {
  var $caret = $('<span id="caret"><input /><span class="measure"></span></span>');
  var self = this;
  $caret.find('input')
    .keydown(function (e) { self.onKeyDown(e); })
    .keypress(function (e) { self.onKeyPress(e); })
    .blur(function (e) { self.onBlur(); });
  return $caret;
};

termkit.inputManager.caret.prototype.insertInto = function (element) {
  this.remove();
  $(element).append(this.$caret);
  this.$input.focus();
};

termkit.inputManager.caret.prototype.remove = function () {
  this.$caret.detach();
};

termkit.inputManager.caret.prototype.onKeyDown = function (event) {

};

termkit.inputManager.caret.prototype.onKeyPress = function (event) {
  async.call(this, function () {
    this.$measure.text(this.$input.val());
  });
};

termkit.inputManager.caret.prototype.onBlur = function (element) {
  this.remove();
};

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.tokenFactory = function (contents) {
  var sigil = contents.substring(0, 1);
  switch (sigil) {
    case '"':
    case "'":
      return new termkit.inputManager.tokenQuoted(contents);
    default:
      return new termkit.inputManager.token(contents);
  }
}

///////////////////////////////////////////////////////////////////////////////

termkit.inputManager.token = function (contents) {
  this.type = 'unknown';
  this.contents = contents;
};

termkit.inputManager.token.prototype.getElement = function () {
  var $token = $('<span>').addClass('token-'+ this.type).text(this.contents);
  var self = this;
  $token//.bind events;
  return $token;
};

termkit.inputManager.tokenQuoted = function (contents) {
  this.type = 'quoted';
  this.contents = contents.substring(1);
};

termkit.inputManager.tokenQuoted.prototype = new termkit.inputManager.token();



///////////////////////////////////////////////////////////////////////////////


})(jQuery);
