(function ($) {

var tf = termkit.tokenField;

/**
 * Autocomplete selection bubble for use with a token.
 */
tf.autocomplete = function (caret) {
  this.caret = caret;
  
  this.$element = this.$markup;
  this.items = ['foo', 'bar', '.txt'];
  this.prefix = '';
};

tf.autocomplete.prototype = {
  get $markup() {
    var $popup = $('<span id="autocomplete"><span class="stretch"><span class="fill"></span><span class="lines"></span></span>');
    var self = this;
    $popup;/*.find('input')
      .keydown(function (e) { self.onKeyDown(e); })
      .keypress(function (e) { self.onKeyPress(e); })
      .blur(function (e) { self.onBlur(); });*/
    return $popup;
  },

  attach: function () {
    // Clean up.
    this.remove();
    
    // Attach bubble.
    this.caret.$element.before(this.$element);
    
    // Extract prefix for autocompletion.
    var a = this.caret.selection.anchor;
    this.prefix = a.token.contents.substring(0, a.offset);
  
    // Sync state.
    this.updateContents();
  },
  
  remove: function () {
    // Detach caret elements from document.
    this.$element.detach();

  },

  onBlur: function (element) {
    this.remove();
  },

  updateContents: function () {
    var prefix = this.prefix, $e = this.$element.find('.lines');
    $e.empty();
    $.each(this.items, function () {
      $e.append($('<span>').addClass("line").html('<span class="prefix">' + escapeText(prefix) +'</span><span>'+ escapeText(this) +'</span>'));
    });
    if (this.items.length == 0) {
      $e.append($('<span>').addClass("line").text(prefix));
      $e.append('<br>');
    };
  },
  
  onKeyDown: function (event) {
    // Intercept special keys
    switch (event.keyCode) {
      case 37: // Left arrow
        break;
      case 39: // Right arrow
        break;
    };
    
    this.keyCode = event.keyCode;
    this.charCode = 0;
    
    async.call(this, function () {
//      this.updateContents(event);
    });
  },

  onKeyPress: function (event) {
    this.charCode = event.charCode;
  },

  reset: function () {
    // find caret offset inside textfield
    // calculate length of prefix
    // remove caret
    // insert caret at given pos
  },
  
};

})(jQuery);
