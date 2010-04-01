(function ($) {

var tf = termkit.tokenField;

/**
 * Manages the list of tokens.
 */
tf.tokenList = function ($field) {
  this.$field = $field;
  this.tokens = [];
};

tf.tokenList.prototype = {
  // Simple debug output.
  debug: function () {
    $('#debug').empty();
    $.each(this.tokens, function (index) {
      $('#debug').append('<div>'+ index +': '+ this +'" (' + this.locked +')');
    });
  },

  // Add a new token at the given index (optional).
  add: function (token, index) {
    token.tokenList = this;

    if (arguments.length < 2 || index == -1) {
      this.tokens.push(token);
    }
    else {
      this.tokens.splice(index, 0, token);
    }
  },

  // Remove the given token.
  remove: function (token) {
    var index = this.indexOf(token);
    //$('#debug').append('<div>list remove ' + token +' @ '+ index);
    if (index < 0) return;
    this.tokens.splice(index, 1);
  
    token.tokenList = null;
  },

  // Replace the given token with the replacement token(s).
  replace: function (token, tokens) {
    var index = this.indexOf(token), self = this;
    //$('#debug').append('<div>list replace ' + token +' @ '+ index);
    this.remove(index);
    // Allow both single token and array.
    $.each($.isArray(tokens) && tokens || [tokens], function () {
      self.add(this, index++);
    });
  },

  // Find index of given token in list.
  indexOf: function (token) {
    return (typeof token == 'number') ? token : $.inArray(token, this.tokens);
  },

  // Next iterator.
  next: function (token) {
    return this.tokens[this.indexOf(token) + 1];
  },

  // Previous iterator.
  prev: function (token) {
    return this.tokens[this.indexOf(token) - 1];
  },

  // Refresh the given field by re-inserting all token elements.
  refreshField: function () {
    var $field = this.$field.empty();
    $.each(this.tokens, function () {
      this.update();
      $field.append(this.$element);
    });
  },
};

})(jQuery);