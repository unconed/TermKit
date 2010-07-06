(function ($) {

$.fn.termkitTokenField = function (options) {
  var $container = this;

  // Don't process same field twice.
  if ($container.is('.termkitTokenField')) return;

  // Parse options.
  var defaults = {
  };
  options = $.extend({}, defaults, options);

  // Create input manager for field.
  var input = new termkit.tokenField($container[0]);
  $container.append(input.$element);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Input manager for token-based field.
 */
var tf = termkit.tokenField = function () {
  var self = this;

  this.$element = this.$markup();  
  
  this.tokenList = new tf.tokenList();
  this.caret = new tf.caret(this.tokenList);
  this.selection = new tf.selection(this.tokenList);
  
  // Track editing inside tokens using the caret.
  this.caret.onchange = function (token, event) { self.updateToken(token, event); };
  
  // Provide external events.
  this.onchange = function () {};
  
  // Set field event handlers.
  this.$element.mousedown(function (event) { self.fieldMouseDown(event); });
  
  // Refresh markup.
  this.updateElement();
};

tf.prototype = {
  
  // Return active markup for this field.
  $markup: function () {
    var $token = $('<div class="termkitTokenField">').data('controller', this);
    var self = this;
    return $token;
  },

  // Return contents.
  getContents: function () {
    return [].concat(this.tokenList.tokens);
  },
  
  // Respond to mouse clicks.
  fieldMouseDown: function (event) {
    var $target = $(event.target);

    // Clicking in the empty area.
    if ($target.is('.termkitTokenField')) {

      // Clean-up edit state, apply lingering edits.
      this.caret.remove();

      // Create new empty token.
      var token = new tf.tokenEmpty();
      this.tokenList.add(token);
      this.updateElement();

      // Move caret into it.
      this.selection.anchor = { token: token };
      this.caret.moveTo(this.selection);
    
    }
    
    // Clicking on the caret's input field (in proxy).
    if ($target.is('.measure')) {
      // Target the underlying token.
      $target = $(event.target = $target.parents('span.token')[0]);
    }
    
    // Clicking on a token.
    if ($target.is('.token, .measure')) {

      // Clean-up edit state, apply lingering edits.
      this.caret.remove();

      // Place the caret on the clicked location.
      var token = $target.data('controller');
      this.selection.anchor = tf.selection.fromEvent(event);
      this.caret.moveTo(this.selection);
    }

    event.stopPropagation();
    event.preventDefault();
    
  },

  // Refresh the field by re-inserting all token elements.
  updateElement: function () {
    var $element = this.$element.empty();
    $.each(this.tokenList.tokens, function () {
      this.updateElement();
      $element.append(this.$element);
    });
  },

  // Refresh the given token in response to input.
  updateToken: function (token, event) {
    
    // Check own rules.
    var update = token.checkSelf(this.selection, event);
    if (!update) {
      // Check triggers.
      update = token.checkTriggers(this.selection, event);
    }
    
    // Insert replacement tokens if given.
    if (update) {
      // Allow both single replacement token as well as array of tokens.
      if (update.length === undefined) update = [update];

      // Try to transmute token in place if possible to retain native caret/editing state.
      if (update.length == 1) {
        if (token.transmute(update[0])) {
          this.updateToken(token, event);
          return;
        }
      }

      // Clean-up edit state, apply lingering edits.
      this.caret.remove();

      // Replace with new token(s).
      var index = this.tokenList.indexOf(token);
      this.tokenList.replace(token, update);
      this.updateElement();

      // Make sure caret ends up somewhere sensible.
      var prev;
      // Does this token still exist?
      if (update.length) {
        // Inside replacement token at same offset.
        this.selection.anchor = { token: this.tokenList.tokens[index], offset: this.selection.anchor.offset };
        this.caret.moveTo(this.selection, event);
      }
      else {
        // At the end of the previous token.
        if (prev = this.tokenList.tokens[index - 1]) {
          this.selection.anchor = { token: prev, offset: prev.contents.length };
          this.caret.moveTo(this.selection, event);
        }
      } 

      // Recurse processing rules to newly created tokens, if any.
      var self = this;
      $.each(update, function () {
        self.updateToken(this, event);
      });
    }

    // Don't keep lingering empties around.
    if (token.type == 'empty' && this.selection.anchor.token != token) {
      this.tokenList.remove(token);
    }
    
    this.onchange.call(token, event, this.getContents());
  },
};

})(jQuery);
