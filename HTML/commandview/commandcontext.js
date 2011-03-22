(function ($) {
  
var cv = termkit.commandView;

/**
 * Represents the system context for a command.
 */
cv.commandContext = function (shell) {
  this.$element = this.$markup();
  
  this.$path = this.$element.find('.path');
  this.$user = this.$element.find('.user');

  this.shell = shell;

  this.path = shell.environment.cwd;
  this.user = shell.environment.user;
};

cv.commandContext.prototype = {
  // Return active markup for this command.
  $markup: function () {
    var that = this;
    var $command = $('<div class="termkitCommandContext"><div class="path"></div><div class="user"></div></div>').data('controller', this);
    return $command;
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {
    this.$element.data('controller', this);

    var path = escapeText(this.path || '').split('/');
    path.shift();
    this.$path.html('<span>' + path.join('</span><span>') + '</span>');
    this.$user.html(escapeText(this.user || ''));
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