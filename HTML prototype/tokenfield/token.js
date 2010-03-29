(function ($) {

/**
 * Represents a single token in the field.
 */
termkit.tokenField.token = function (type, contents) {
  this.$element = this.$markup;

  this.locked = false;
  this.type = type;
  this.contents = contents;

  this.allowEmpty = false;
};

termkit.tokenField.token.prototype = {
  get $markup() {
    var $token = $('<span>').data('token', this);
    var self = this;
    $token//. bind events
    return $token;
  },

  get type() { return this._type; },
  set type(type) {
    type = type || 'unknown';
    this._type = type;
    this.update();
  },

  get contents() { return this._contents; },
  set contents(contents) {
    contents = contents || '';
    this._contents = contents;
    this.update();
  },
  
  update: function () {
    this.$element.attr('class', 'token token-' + this.type);
    if (!this.locked) {
      this.$element.html(escapeText(this.contents));
    }
  },

  transmute: function (token) {
    if (this.contents == token.contents) {
      this.constructor = token.constructor;
      this.evolve = token.evolve;
      this.type = token.type;
      this.allowEmpty = token.allowEmpty;
      return true;
    }
  },
  
  evolve: function () {
    return false;
  },
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Blank token.
 */
termkit.tokenField.tokenEmpty = function () {
  termkit.tokenField.token.call(this, 'empty', '');
};

termkit.tokenField.tokenEmpty.prototype = $.extend(new termkit.tokenField.token(), {

  evolve: function (selection) {
    if (this.contents.length == 0) return false;
    if ((this.contents[0] == '"') || (this.contents[0] == "'")) {
      selection.anchorOffset--;
      return new termkit.tokenField.tokenQuoted(this.contents);
    }
    else {
      return new termkit.tokenField.tokenPlain(this.contents);
    }
    return this.prototype.evolve();
  },
  
});

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing plain text.
 */
termkit.tokenField.tokenPlain = function (contents) {
  termkit.tokenField.token.call(this, 'plain', contents);
};

termkit.tokenField.tokenPlain.prototype = $.extend(new termkit.tokenField.token(), {

  evolve: function () {
    if (this.contents.length == 0) {
      return new termkit.tokenField.tokenEmpty();
    }
    var split = this.contents.replace(/^\s+/, '').split(/\s+/);
    if (split.length > 1) {
      var update = [];
      $.each(split, function () {
        update.push(new termkit.tokenField[this.length ? 'tokenPlain' : 'tokenEmpty'](this));
      });
      return update;
    }
    return false;
  },

});

///////////////////////////////////////////////////////////////////////////////

/**
 * Token containing quoted text.
 */
termkit.tokenField.tokenQuoted = function (contents) {
  termkit.tokenField.token.call(this, 'quoted', contents.substring(1));
  this.allowEmpty = true;
};

termkit.tokenField.tokenQuoted.prototype = $.extend(new termkit.tokenField.token(), {

  evolve: function () {
    return false;
  },

});

})(jQuery);
