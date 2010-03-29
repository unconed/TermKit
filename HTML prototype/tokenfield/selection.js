(function ($) {

/**
 * Represents a selection inside the token-field.
 */
termkit.tokenField.selection = function () {
  this.anchorToken = null;
  this.anchorOffset = 0;
  this.focusToken = null;
  this.focusOffset = 0;
};

termkit.tokenField.selection.prototype = {

  anchor: function (token, offset) {
    this.focusToken = this.anchorToken = token || null;
    this.focusOffset = this.anchorOffset = offset || 0;
  },

  focus: function (token, offset) {
    this.focusToken = token || this.anchorToken;
    this.focusOffset = offset || this.anchorOffset;
  },

};

})(jQuery);
