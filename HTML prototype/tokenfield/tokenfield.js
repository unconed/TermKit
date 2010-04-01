(function ($) {

$.fn.termkitTokenField = function (options) {
  var $container = this;

  // Don't process same field twice.
  if ($container.is('.termkitTokenField')) return;
  $container.addClass('termkitTokenField');  

  // Parse options.
  var defaults = {
  };
  options = $.extend({}, defaults, options);

  // Create input manager for field.
  var input = new termkit.tokenField($container[0]);
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Input manager for token-based field.
 */
var tf = termkit.tokenField = function (field) {
  var self = this;
  var $field = this.$field = $(this.field = field);
  
  this.tokenList = new tf.tokenList(this.$field);
  this.caret = new tf.caret(this.tokenList);
  this.selection = new tf.selection(this.tokenList);
  
  // Set caret token onchange handler.
  this.caret.onchange = function (a,b) { self.refreshToken(a,b); };
  
  // Set field event handlers.
  $field.mousedown(function (e) { self.fieldMouseDown(e); });
  
};

tf.prototype = {
  
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
      this.tokenList.refreshField(this.$field);

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

      // Place the caret on the clicked location.
      var token = $target.data('token');
      this.selection.anchor = tf.selection.fromEvent(event);
      this.caret.moveTo(this.selection);

    }
    
    event.stopPropagation();
    event.preventDefault();
  },

  // Refresh the given token in response to input.
  refreshToken: function (token, event) {
    
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
          this.refreshToken(token, event);
          return;
        }
      }

      // Clean-up edit state, apply lingering edits.
      this.caret.remove();

      // Replace with new token(s).
      var index = this.tokenList.indexOf(token);
      this.tokenList.replace(token, update);
      this.tokenList.refreshField();

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
        self.refreshToken(this, event);
      });
    }

    // Don't keep lingering empties around.
    if (token.type == 'empty' && this.selection.anchor.token != token) {
      this.tokenList.remove(token);
    }
  },
};

})(jQuery);
