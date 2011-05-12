(function ($) {

var tf = termkit.tokenField;

/**
 * Autocomplete selection popup for use with a token.
 */
tf.autocomplete = function (caret) {
  this.caret = caret;
  
  this.$element = this.$markup();
  this.items = [];
  this.prefix = '';
  this.selected = 0;
  this.token = null;
  this.last = null;
  this.animateTarget = 0;
};

tf.autocomplete.prototype = {
  $markup: function () {
    var $popup = $('<span class="autocomplete"><span class="stretch"><span class="fill"></span><span class="lines"></span></span>').data('controller', this);
    var that = this;
    $popup;/*.find('input')
      .keydown(function (e) { that.onKeyDown(e); })
      .keypress(function (e) { that.onKeyPress(e); })
      .blur(function (e) { that.onBlur(); });*/
    return $popup;
  },

  attach: function () {
    // Clean up.
    this.remove();

    if (this.caret.selection == null) return;
    
    // Attach bubble.
    this.caret.$element.before(this.$element);
    
    // Extract prefix for autocompletion.
    this.token = this.caret.selection.anchor.token;
    this.prefix = this.token.contents.substring(0, this.caret.selection.anchor.offset);
    this.handler = this.token.autocomplete;
    
    // Sync state.
    this.updateContents();
  },
  
  remove: function () {
    // Detach caret elements from document.
    this.$element.detach();
    this.items = [];
    this.prefix = '';
    this.selected = 0;
    this.token = null;
    this.animateTarget = 0;
    
    // Reset caret position.
    //this.caret.$element.find('input').css('marginTop', 0);
    this.$element.css('marginTop', 0);
    this.caret && this.caret.$input.removeClass()
  },

  onBlur: function (element) {
    this.remove();
  },

  updateContents: function (event, local) {
    var that = this,
        tl = this.caret.tokenList,
        token = this.caret.selection.anchor.token;

    // Check if it's appropriate to display suggestions.
    // TODO

    var $e = this.$element.find('.lines');

    // Update state.
    function updateState() {
      // Highlight active line, if any,
      if (that.items.length) {
        // Remove token badge.
        that.token.style = '';

        // Insert lines into box.
        var prefix = that.prefix;
        $e.empty();
        $.each(that.items, function () {
          $e.append($('<span>').addClass("line").addClass("style-" + this.type).html('<span class="prefix">' + escapeText(prefix) +'</span><span>'+ escapeText(this.label.substring(prefix.length)) +'</span>'));
        });
        $e.show();

        that.selected = (that.selected + that.items.length) % that.items.length;
        var $line = $($e.find('.line')[that.selected]);

        // Move caret element to active line.
        var offsetY = -$line.addClass('active').position().top;
        //this.caret.$element.find('input').css('marginTop', offsetY);
        that.$element.stop().css({
            marginTop: that.animateTarget,
          })
          .animate({ 'marginTop': offsetY }, {
            duration: 40 + Math.max(Math.abs(offsetY - that.animateTarget) / 10, 0),
            queue: false,
          });
        that.animateTarget = offsetY;
        
        // Style caret to match line.
        that.caret && that.caret.$input.removeClass().addClass('style-' + that.items[that.selected].type);
      }
      else {
        $e.empty().hide();
      }

      // No matches, remove..
      if (that.items.length == 0) {
        that.token.style = '';
        that.remove();
      }
      // Instant-apply single item popup if it matches what was typed.
      else if (that.items.length == 1 && that.items[0].label == prefix) {
        that.onComplete(event || {}, true);
      }
    }

    // Get list of suggestions.
    if (!local && this.handler && this.token) {
      $e.hide();
      var last = token.contents;
      this.handler.call(this, tl.indexOf(token), event, tl.contents, function (items) {
        if (last != token.contents) return;
        
        that.items = items || [];

        updateState();
      });
    }
    else {
      updateState();
    }
  },
  
  onComplete: function (event, local) {
    if (this.token && this.selected < this.items.length) {
      event.charCode = 10; // LF \n

      var item = this.items[this.selected];

      this.token.style = item.type;
      !local && this.caret.setContents(item.value, event);
      this.remove();
    }
  },
  
  onKeyDown: function (event) {
    var attached = this.token && this.items.length,
        local = false;

    if (!this.token) return;

    // Intercept special keys
    switch (event.keyCode) {
      case 13: // Enter
        this.onComplete(event);
        break;
      case 9: // Tab
        this.onComplete(event);
        event.preventDefault();
        event.stopPropagation();
        if (attached) return false;
        break;
      case 8: // Backspace
      case 27: // Escape
        this.remove();
        event.preventDefault();
        event.stopPropagation();
        return false;
        break;
      case 37: // Left arrow
        break;
      case 39: // Right arrow
        break;
      case 38: // Up arrow
        this.selected--;
        event.preventDefault();
        event.stopPropagation();
        local = true;
        break;
      case 40: // Down arrow
        this.selected++;
        event.preventDefault();
        event.stopPropagation();
        local = true;
        break;
      
      case 16:
      case 17:
      case 18:
      case 91:
        return;
    };

    this.keyCode = event.keyCode;
    this.charCode = 0;
    
    async.call(this, function () {
      this.updateContents(event, local);
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
