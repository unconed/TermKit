(function ($) {

var tf = termkit.tokenField;

/**
 * Manages the list of tokens.
 */
tf.tokenList = function ($field, onChange) {
  this.$field = $field;
  this.tokens = [];
  this.onChange = onChange || (function () {});
};

tf.tokenList.prototype = {
  debug: function () {
    $.each(this.tokens, function (index) {
      $('#debug').append('<div>'+ index +': '+ this.type +' "' + this.contents +'" (' + this.locked +')');
    });
  },

  add: function (token, index) {
    //$('#debug').append('<div>list add '+ token +' @ '+ index);
    token.tokenList = this;

    if (arguments.length < 2 || index == -1) {
      this.tokens.push(token);
    }
    else {
      this.tokens.splice(index, 0, token);
    }
  },

  remove: function (token) {
    var index = this.indexOf(token);
    //$('#debug').append('<div>list remove ' + token +' @ '+ index);
    if (index < 0) return;
    this.tokens.splice(index, 1);
  
    token.tokenList = null;
  },

  replace: function (token, tokens) {
    var index = this.indexOf(token), self = this;
    //$('#debug').append('<div>list replace ' + token +' @ '+ index);
    this.remove(index);
    $.each($.isArray(tokens) && tokens || [tokens], function () {
      self.add(this, index++);
    });
  },

  indexOf: function (token) {
    return (typeof token == 'number') ? token : $.inArray(token, this.tokens);
  },

  next: function (token) {
    return this.tokens[this.indexOf(token) + 1];
  },

  prev: function (token) {
    return this.tokens[this.indexOf(token) - 1];
  },

  refreshField: function () {
    var $field = this.$field.empty();
    $.each(this.tokens, function () {
      $field.append(this.$element);
    });
  },
};

})(jQuery);