(function ($) {
  
var cv = termkit.commandView;

/**
 * Represents a single command in the view.
 */
cv.command = function (commandView, context) {
  this.$element = this.$markup();
  this.$sigil = this.$element.find('.sigil');

  this.commandView = commandView;
  this.context = context;
  this.collapsed = true;
  this.state = 'waiting';
  
  // Refresh markup.
  this.updateElement();
};

///////////////////////////////////////////////////////////////////////////////

cv.command.prototype = {
  // Return active markup for this command.
  $markup: function () {
    var that = this;
    var $command = $('<div class="termkitCommand"><span class="sigil"></span>').data('controller', this);

    // Create tokenfield for command input.
    this.tokenField = new termkit.tokenField();
    this.tokenField.onChange = function (e, t) { that.checkTriggers(e, t); }
    this.tokenField.onSubmit = function (e, t) { that.submitCommand(e, t); }
    
    // Create throbber.
    this.progressIndicator = new termkit.progressIndicator();

    // Create outputFrame hosting outputViews for command output.
    this.outputFrame = new termkit.outputView.outputFrame();

    $command.append(this.tokenField.$element);
    $command.append(this.progressIndicator.$element);
    $command.append(this.outputFrame.$element);

    this.progressIndicator.$element.hide();
    this.outputFrame.$element.hide();

    return $command;
  },

  // State
  get state() { return this._state; },
  set state(state) {
    this._state = state || 'waiting';
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
    var classes = [
      'termkitCommand',
      'command-'+ this.state,
      this.collapsed ? 'command-collapsed' : 'command-open'
    ];
    this.$element.data('controller', this).attr('class', classes.join(' '));

    var sigil = {
      'ok': '✔',
      'error': '✖',
      'warning': '⚠',
    }[this.state];
    this.$sigil.attr('class', 'sigil sigil-'+this.state).html(this.collapsed ? '▶' : sigil);

    this.progressIndicator.$element[(this.state == 'running') ? 'show' : 'hide']();

    this.outputFrame.$element[!this.collapsed ? 'show' : 'hide']();
  },
  
  // Execute tokenfield contents as command.
  submitCommand: function (event, tokens) {
    var that = this;
    this.state = 'running';
    this.collapsed = false;
    
    // Convert tokens into strings.
    var command = tokens.map(function (t) { return t.toCommand(); });

    // Execute in current context.
    this.context.shell.run(command, function (data, code, status) {
        // Set appropriate return state.
        that.state = {
          'ok': 'ok',
          'warning': 'warning',
          'error': 'error',
        }[status] || 'ok';
      
        // Open new command.
        async(function () {
          that.commandView.newCommand();
        });
      },
      // Send all output to outputFrame.
      this.outputFrame.hook()
    );
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
    var that = this;
    token.flags.commandExecutable = true;
    token.autocomplete = function () {
      return cv.commandExecutable.autocompleteExecutable.apply(that, arguments);
    };
  }
};

cv.commandExecutable.autocompleteExecutable = function (offset, event, tokens, callback) {
  var suggestions = [];
  callback(suggestions);
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
