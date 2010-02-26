var termkit = {};

(function ($) {
  
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

termkit.inputManager = function (field) {
  var $field = this.$field = $(this.field = field);
  var input = this;
  
  // Set field event handlers.
  $field.mousedown(function (e) { input.fieldMouseDown(e); });
  
};

termkit.inputManager.prototype.fieldMouseDown = function (event) {
  var $target = $(event.target);
  if ($target.is('span.token')) {
    this.focus($target);
  }
  else if (!$target.is('span.measure')) {
    this.focus();
  }
  event.stopPropagation();
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


termkit.inputManager.prototype.getCaret = function ($token) {
  var $caret = $('<span class="caretWrapper" id="caret"><input class="caret" /><span class="measure"></span></span>');
  var input = this;
  $caret.find('input')
    .mousedown(function (e) { input.caretMouseDown(e); })
    .keydown(function (e) { input.caretKeyDown(e); })
    .blur(function (e) { input.blur(); });
  return $caret;
};

termkit.inputManager.prototype.insertCaret = function ($token) {
  var $caret = this.getCaret($token);
  if ($token) {
    var contents = $token.text();
    $caret.find('input').val(contents);
    $token.empty().append($caret);
  }
  else {
    this.$field.append($caret);
  }
  this.caretAutoSize();
  setTimeout(function () { $('#caret input').focus(); }, 0);
};

termkit.inputManager.prototype.removeCaret = function () {
  var $caret = $('#caret');
  var text = $caret.length && $caret.find('input').val();
  if (text != '') {
    if ($caret.parents('span.token').length == 0) {
      text = '<span class="token">'+ text +'</span>';
    }
    $caret.before(text);
  }
  $caret.remove();
};

termkit.inputManager.prototype.caretAutoSize = function () {
  var $caret = $('#caret'),
      $measure = $caret.find('span.measure'),
      $input = $caret.find('input.caret');
  $measure.text($input.val());
  $input.css('width', $measure.width() + 20);
};

termkit.inputManager.prototype.caretMouseDown = function (event) {
  event.stopPropagation();
};

termkit.inputManager.prototype.caretKeyDown = function (event) {
  var input = this;
  setTimeout(function () { input.caretAutoSize(); }, 0);
};

termkit.inputManager.prototype.debug = function () {
  $('#debug').text(this.$field.html());
};


})(jQuery);
