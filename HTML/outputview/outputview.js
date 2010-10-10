(function ($) {

/**
 * Controller for output view.
 */
var ov = termkit.outputView = function () {
  var self = this;

  this.$element = this.$markup();

};

ov.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputView = $('<div class="termkitOutputView"><div class="isolate"></div></div>').data('controller', this);
    var self = this;
    
    this.root = new ov.outputNode();
    $outputView.find('> div.isolate').append(this.root.$element);

    return $outputView;
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {
    
  },
  
  // Hook into the given set of handlers.
  hook: function (handlers) {
    var self = this;
    handlers = handlers || [];
    handlers['view'] = function (m,a) { self.viewHandler(m, a); };
    return handlers;
  },
  
  // Handler for view.* invocations.
  viewHandler: function (method, args) {
    switch (method) {
      case 'view.add':
        var target = this.root.getNode(args.target);
        var nodes = oneOrMany(args.contents).map(function (node) { return new ov.outputNode(node); });
        target.add(nodes, args.offset);
        break;

      case 'view.remove':
        var target = this.root.getNode(args.target);
        if (args.offset) {
          target.remove(offset);
        }
        else if (target.parent) {
          target.parent.remove(target);
        }
        break;

      case 'view.replace':
      case 'view.update':
        break;
    }
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);



/**
 * Add view object.
add: function (target, offset) {
  var args = this.target(target, offset);
  args.contents = exports.prepareOutput(arguments[arguments.length - 1]);
  this.invoke('view.add', args);
},

/**
 * Remove view object.
remove: function (target, offset) {
  var args = this.target(target, offset);
  this.invoke('view.remove', args);
},

/**
 * Replace view object.
replace: function (target, offset) {
  var args = this.target(target, offset);
  args.contents = exports.prepareOutput(arguments[arguments.length - 1]);
  this.invoke('view.replace', args);
},

/**
 * Update view object.
update: function (target, offset) {
  var args = this.target(target, offset);
  args.properties = arguments[arguments.length - 1];
  this.invoke('view.update', args);
},

*/
