(function ($) {
  
var cs = termkit.commandStream;

/**
 * Represents the system context for a command.
 */
cs.commandContext = function () {
  this.$element = this.$markup();
  
  this.$path = this.$element.find('.path');
  this.$user = this.$element.find('.user');

  this.path = '/';
  this.user = null;
};

cs.commandContext.prototype = {
  // Return active markup for this command.
  $markup: function () {
    var self = this;
    var $command = $('<div class="commandContext"><div class="path"></div><div class="user"></div></div>').data('controller', this);
    return $command;
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {
    this.$element.data('controller', this);
    this.$path.html(escapeText(this.path));
    this.$user.html(escapeText(this.user));
  },
  
  set path(path) {
    this._path = path;
    this.updateElement();
  },
  get path() {
    return this._path;
  },

  set user(user) {
    this._user = user;
    this.updateElement();
  },
  get user() {
    return this._user;
  },
};

})(jQuery);