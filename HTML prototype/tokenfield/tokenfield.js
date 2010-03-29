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
termkit.tokenField = function (field) {
  var self = this;
  var $field = this.$field = $(this.field = field);
  
  this.tokenList = new termkit.tokenField.tokenList(this.$field, function (t) { self.refreshToken(t); });
  this.caret = new termkit.tokenField.caret(this.tokenList);
  this.selection = new termkit.tokenField.selection(this.tokenList);
  
  // Set field event handlers.
  $field.mousedown(function (e) { self.fieldMouseDown(e); });
  
};

termkit.tokenField.prototype = {
  fieldMouseDown: function (event) {
    var $target = $(event.target);
    if ($target.is('.termkitTokenField')) {

      this.caret.remove();
    
      var token = new termkit.tokenField.tokenEmpty();

      this.tokenList.add(token);
      this.tokenList.refreshField(this.$field);

      this.selection.anchor = { token: token };
      this.caret.moveTo(this.selection);
    
    }
    event.stopPropagation();
    event.preventDefault();
  },

  refreshToken: function (token) {
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

      this.selection.anchor = { token: this.tokenList.tokens[index], offset: this.selection.anchor.offset };
      this.caret.moveTo(this.selection);
    }
  },
};

})(jQuery);
