(function ($) {
  
var cv = termkit.commandView;

/**
 * Represents a single command in the view.
 */
cv.command = function () {
  this.$element = this.$markup();
  this.$sigil = this.$element.find('.sigil');

  this.context = new cv.commandContext();
  this.collapsed = true;
  this.state = cv.command.STATE_WAITING;
  
  // Refresh markup.
  this.updateElement();
};

cv.command.STATE_WAITING = 0;
cv.command.STATE_RUNNING = 1;
cv.command.STATE_SUCCESS = 2;
cv.command.STATE_ERROR   = 3;

///////////////////////////////////////////////////////////////////////////////

cv.command.prototype = {
  // Return active markup for this command.
  $markup: function () {
    var self = this;
    var $command = $('<div class="command"><span class="sigil"></span>').data('controller', this);

    // Add tokenfield for command input.
    this.tokenField = new termkit.tokenField();
    this.tokenField.onChange = function (e, t) { self.checkTriggers(e, t); }
    this.tokenField.onSubmit = function (e, t) { self.submitCommand(e, t); }
    
    this.progressIndicator = new termkit.progressIndicator();

    $command.append(this.tokenField.$element);
    $command.append(this.progressIndicator.$element);

    this.progressIndicator.$element.hide();
    
    return $command;
  },

  // State
  get state() { return this._state; },
  set state(state) {
    this._state = state || cv.command.STATE_WAITING;
    this.updateElement();
  },

  // Collapsed
  get collapsed() { return this._collapsed; },
  set collapsed(collapsed) {
    this._collapsed = collapsed;
    this.updateElement();
  },
  
  // Update the element.
  updateElement: function () {
    this.$element.data('controller', this);
    this.$sigil.html(this.collapsed ? '▶' : '▼');
    this.progressIndicator.$element[(this.state == cv.command.STATE_RUNNING) ? 'show' : 'hide']();
  },
  
  // Execute command.
  submitCommand: function (event, tokens) {
    this.state = cv.command.STATE_RUNNING;
    this.collapsed = false;
  },

  // Use triggers to respond to a creation or change event.
  // @return Array of replacement commands for this command (optional).
  checkTriggers: function (event, tokens) {

    // No triggers for no tokens.
    if (tokens.length == 0) return;

    var command = this, t = cv.command.triggers;
    $.each(t, function () {
      var trigger = this;

      // Count how many regexps there are.
      var n;
      for (n = 0; trigger.hasOwnProperty(n); ++n);
      if (n < 1) return;
      
      //console.log('match '+ n);
      var match;

      // Match the multi-regexp on the tokens starting at [index].
      function matchAt(index) {
        for (var i = 0; i < n; ++i) {
          if (!trigger[i].test(tokens[index + i].contents)) {
            return false;
          }
        }
        match = index;
        return true;
      }
      
      function callback() {
        trigger.callback.call(command, match, event, tokens);
      }

      // Test anchors.
      switch (this.anchor) {
        case '^':
          matchAt(0) && callback();
          break;
        
        case '$':
          matchAt(tokens.length - n) && callback();
          break;
        
        case '^$':
          (tokens.length == n) && matchAt(0) && callback();
          break;
        
        default:
          for (var j = 0; j <= tokens.length - n; ++j) {
            matchAt(j) && callback();
          }
          break;
      }
    });
  },

  toString: function () {
    return '['+ this.tokenField.tokenList.tokens +']';
  },
};

///////////////////////////////////////////////////////////////////////////////

/**
 * Basic command.
 */
cv.commandExecutable = function () {
  cv.command.call(this, 'empty', '');
};

cv.commandExecutable.triggerExecutable = function (offset, event, tokens) {
  var token = tokens[offset];
  if (!token.flags.commandExecutable) {
    token.flags.commandExecutable = true;
    token.autocomplete = cv.commandExecutable.autocompleteExecutable;
  }
};

cv.commandExecutable.autocompleteExecutable = function (offset, event, tokens) {
  return ['foo', 'bar', '.txt'];
};

cv.commandExecutable.prototype = $.extend(new cv.command(), {});

///////////////////////////////////////////////////////////////////////////////

cv.command.triggers = [
  { // path match, environment var match, ... ?
    anchor: '^',
    0: /[a-zA-Z0-9_-]+/,
    callback: cv.commandExecutable.triggerExecutable,
  },
  /*
  '*': [
    { changes: /./, callback: cv.commandQuoted.triggerResetQuote },
  ],
  'empty': [
    { contents: /^["']/, callback: tf.commandQuoted.triggerRequote },
    { contents: /["']/,  callback: tf.commandQuoted.triggerQuote },
    { contents: /./,     callback: tf.commandPlain.triggerCharacter },
    { contents: / /,     callback: tf.commandPlain.triggerEmpty },
  ],
  'plain': [
    { contents: /^ ?$/,   callback: tf.commandEmpty.triggerEmpty },
    { changes: / /,    callback: tf.commandPlain.splitSpace },
    { changes: /["']/, callback: tf.commandQuoted.triggerQuote },
  ],
  'quoted': [
    { changes: /["']/, callback: tf.commandQuoted.triggerRequote },
    { changes: /["']/, callback: tf.commandQuoted.triggerUnquote },
  ],
  */
];


})(jQuery);
