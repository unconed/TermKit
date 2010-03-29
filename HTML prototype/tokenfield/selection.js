(function ($) {

var tf = termkit.tokenField;

/**
 * Represents a selection inside the token-field.
 */
tf.selection = function (tokenList) {
  this.tokenList = tokenList;
  this._anchor = { token: null, offset: 0 };
  this._focus = { token: null, offset: 0 };
};

tf.selection.prototype = {

  get anchor() { return this._anchor; },
  set anchor(point) {
    this._focus.token = this._anchor.token = point.token || null;
    this._focus.offset = this._anchor.offset = point.offset || 0;
  },

  get focus() { return this._focus; },
  set focus(point) {
    this._focus.token = point.token || this._anchor.token;
    this._focus.offset = point.offset || this._anchor.offset;
  },

  checkBounds: function (point) {
    var token = point.token, offset = point.offset;
    while (token && (offset > token.contents.length)) {
      var next = this.tokenList.next(token);
      if (next) {
        offset -= token.contents.length + 1;
        token = next;
      }
      else {
        offset = token.contents.length;
      }
    };

    while (token && (offset < 0)) {
      var prev = this.tokenList.prev(token);
      if (prev) {
        offset += prev.contents.length + 1;
        token = prev;
      }
      else {
        offset = 0;
      }
    };

    return { token: token, offset: offset };
  },

  validate: function () {
    this.anchor = this.checkBounds(this.anchor);
    this.focus = this.checkBounds(this.focus);
  },
};

})(jQuery);
