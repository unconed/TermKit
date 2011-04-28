(function ($) {

/**
 * Controller for output view.
 */
var ov = termkit.outputView = function () {
  var that = this;

  this.$element = this.$markup();
  
  this.factory = new ov.outputFactory();
};

ov.prototype = {
  
  // Return active markup for this widget.
  $markup: function () {
    var $outputView = $('<div class="termkitOutputView"><div class="isolate"></div></div>').data('controller', this);
    var that = this;
    
    this.tree = new ov.outputNode({});
    $outputView.find('.isolate').append(this.tree.$element);

    return $outputView;
  },
  
  // Remove this element.
  remove: function () {
    this.$element.remove();
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
  
  // Handler for view.* invocations.
  dispatch: function (method, args) {
    var target = this.tree.getNode(args.target);
    var nodes = args.objects && this.factory.tree(args.objects);

    if (!target) return;

    switch (method) {
      case 'view.add':
        target.add(nodes, args.offset);
        break;

      case 'view.remove':
        target.remove();
        break;

      case 'view.replace':
        target.replace(nodes);
        break;

      case 'view.update':
        target.update(args.properties, args.append);
        break;
    }

    this.updateElement();
  },
  
  // Notify back-end of callback event.
  notify: function (method, args) {
    this._callback && this._callback(method, args);
  },
  
  // Adopt new callback for sending back view events.
  callback: function (callback) {
    this._callback = callback;
  },

};

///////////////////////////////////////////////////////////////////////////////

})(jQuery);
