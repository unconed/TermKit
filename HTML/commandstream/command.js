(function ($) {
  
var cs = termkit.commandStream;

/**
 * Represents a single command in the stream.
 */
cs.command = function () {
  this.$element = this.$markup();

  this.context = new cs.commandContext();
  this.collapsed = true;
  this.state = cs.command.STATE_WAITING;
};

cs.command.STATE_WAITING = 0;
cs.command.STATE_RUNNING = 1;
cs.command.STATE_DONE = 1;

///////////////////////////////////////////////////////////////////////////////

cs.command.prototype = {
  // Return active markup for this command.
  $markup: function () {
    var self = this;
    var $command = $('<div class="command">').data('controller', this);

    this.tokenField = new termkit.tokenField();
    this.tokenField.onChange = function (e, t) { self.checkTriggers(e, t); }
    this.tokenField.onSubmit = function (e, t) { self.submitCommand(e, t); }

    $command.append(this.tokenField.$element);

    return $command;
  },

  // Update the element.
  updateElement: function () {
    this.$element.data('controller', this);
  },
  
  // Execute command.
  submitCommand: function (event, tokens) {
    alert(tokens);
  },

  // Use triggers to respond to a creation or change event.
  // @return Array of replacement commands for this command (optional).
  checkTriggers: function (event, tokens) {

    // No triggers for no tokens.
    if (tokens.length == 0) return;

    var command = this, t = cs.command.triggers;
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
cs.commandExecutable = function () {
  cs.command.call(this, 'empty', '');
};

cs.commandExecutable.triggerExecutable = function (offset, event, tokens) {
  var token = tokens[offset];
  if (!token.flags.commandExecutable) {
    token.flags.commandExecutable = true;
    token.autocomplete = cs.commandExecutable.autocompleteExecutable;
  }
};

cs.commandExecutable.autocompleteExecutable = function (offset, event, tokens) {
  return ['foo', 'bar', '.txt'];
};

cs.commandExecutable.prototype = $.extend(new cs.command(), {});

///////////////////////////////////////////////////////////////////////////////

cs.command.triggers = [
  { // path match, environment var match, ... ?
    anchor: '^',
    0: /[a-zA-Z0-9_-]+/,
    callback: cs.commandExecutable.triggerExecutable,
  },
  /*
  '*': [
    { changes: /./, callback: cs.commandQuoted.triggerResetQuote },
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
