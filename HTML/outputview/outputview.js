(function ($) {

/**
 * Controller for output view.
 */
var ov = termkit.outputView = function () {
  var self = this;

  this.$element = this.$markup();
  
  this.factory = new ov.outputFactory();
};

ov.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputView = $('<div class="termkitOutputView"><div class="isolate"></div></div>').data('controller', this);
    var self = this;
    
    this.root = new ov.outputNode();
    $outputView.find('.isolate').append(this.root.$element);

    return $outputView;
  },

  // Update the element's markup in response to internal changes.
  updateElement: function () {

    // Ensure the caret is in view.
    if (this.$element) {
      var offset = this.$element.offset();
      var bottom = offset.top + this.$element.height() + 32 + 10;
      var edge = $('body').scrollTop() + $('html').height();
      if (bottom > edge) {
        $('body').scrollTop($('body').scrollTop() + (bottom - edge));
      }
    }

  },
  
  // Construct a tree of view objects.
  construct: function construct(objects) {
    var self = this;
    return oneOrMany(objects).map(function (node) { return self.factory.construct(node); });
  },
  
  // Handler for view.* invocations.
  viewHandler: function (method, args) {
    switch (method) {
      case 'view.add':
        var target = this.root.getNode(args.target);
        var nodes = this.construct(args.objects);
        target.add(nodes);
        this.updateElement();
        break;

      case 'view.remove':
        var target = this.root.getNode(args.target);
        if (target.parent) {
          target.parent.remove(target);
        }
        this.updateElement();
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
