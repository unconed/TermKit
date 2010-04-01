(function ($) {

var tf = termkit.tokenField;

/**
 * Emulates a caret inside a token using an invisible ad-hoc textfield.
 */
tf.caret = function (tokenList) {
  this.tokenList = tokenList;
  
  this.$element = this.$markup;
  this.$input = this.$element.find('input');
  this.$measure = this.$element.find('.measure');
  
  this.token = null;
  this.selection = null;
  this.onchange = function () {};
  
  this.autocomplete = new tf.autocomplete(this);
  
  this.prefix = this.suffix = '';
};

tf.caret.prototype = {
  
  // Return active markup for implementing the caret.
  get $markup() {
    var $caret = $('<span id="caret"><input /><span class="measure"></span></span>');
    var self = this;
    $caret.find('input')
      .keydown(function (e) { self.onKeyDown(e); })
      .keypress(function (e) { self.onKeyPress(e); })
      .blur(function (e) { self.onBlur(); });
    return $caret;
  },

  // Insert the caret on the given selection.
  moveTo: function (selection, event) {

    // Make sure selection is within bounds.
    selection.validate();
    
    // Ensure caret is cleanly removed from its existing position.
    this.remove();

    this.tokenList.debug();
  
    // Examine target token.
    this.selection = selection;
    var token = selection.anchor.token;
    var $token = token.$element;
    var text = token.contents;

    if (text == '') {
      // Append caret at the end of the token.
      $token.append(this.$element);
      this.$input.focus();
    }
    else {
      // Fill-in existing token contents.
      this.$input.val(text);

      // Split the text node at the given offset.
      token.$element
        .empty()
        .append(this.prefix)
        .append(this.$element)
        .append(this.suffix);

      // Focus the input at the right offset.
      this.$input.focus();
      this.$input[0].selectionEnd = this.$input[0].selectionStart = selection.anchor.offset;
    }

    // Prevent token object from updating itself.
    this.token = token;
    this.token.locked = true;

    // Sync state.
    this.updateContents(event);
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

  updateContents: function (event) {
    // Contents might have changed, reset selection.
    if (!this.selection) return;
    this.selection.anchor.offset = this.$input[0].selectionStart + this.prefix.length;
    
    // Recompose contents from input.
    var old = this.token;
    var updated = this.prefix + this.$input.val() + this.suffix;

    // Check for changes and apply them.
    if (this.token.contents != updated) {
      this.autocomplete.remove();
      this.token.contents = updated;
      
      // Notify callers of event
      // (asynchronous to give the DOM time to finish event handling).
      async.call(this, function () {
        // Merge stored key/char codes in, effectively merging keydown/keypress info.
        event.keyCode = this.keyCode;
        event.charCode = this.charCode;
        this.onchange(this.token, event);
        
        // TODO: replace with real autocomplete
        var self = this;
        this.autocompleteTimer && clearTimeout(this.autocompleteTimer);
        this.autocompleteTimer = setTimeout(function () { this.autocompleteTimer = null; self.autocomplete.attach(); }, 1000);
      });
    }

    // Adapt the size of the measuring span to fit the text.
    this.$measure.text(this.$input.val());
    // Enlarge the input to make room for the next keystroke.
    this.$input.css('width', this.$measure.width() + this.$measure.height() + 1);
  },
  
  onKeyDown: function (event) {
    // Intercept special keys
    switch (event.keyCode) {
      case 37: // Left arrow
        if (this.selection.anchor.offset == 0) {
          async.call(this, function () {
            var selection = this.selection;
            selection.anchor.offset--;
            this.moveTo(selection, event);
          });
          return;
        }
        break;
      case 39: // Right arrow
        if (this.selection.anchor.offset == this.token.contents.length) {
          async.call(this, function () {
            var selection = this.selection;
            selection.anchor.offset++;
            this.moveTo(selection, event);
          });
          return;
        }
        break;
    };
    
    this.keyCode = event.keyCode;
    this.charCode = 0;
    
    // Contents might have changed.
    async.call(this, function () {
      this.updateContents(event);
    });
  },

  onKeyPress: function (event) {
    // Log character code for this keyboard input.
    // Used in delayed onkeydown handler.
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
