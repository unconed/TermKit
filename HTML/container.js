(function ($) {

/**
 * Unique collection of objects that refer to their container.
 * (uniqueness not really enforced)
 */
var cc = termkit.container = function () {
  this.collection = [];
};

cc.prototype = {

  get contents() {
    return [].concat(this.collection);
  },

  // Pass-through length of array
  get length() {
    return this.collection.length;
  },
  
  // Add a new object at the given index (optional).
  add: function (collection, index) {
    var that = this;

    // Prepare splice call.
    if (arguments.length < 2 || index == -1) {
      index = this.collection.length;
    }
    var args = [ index, 0 ].concat(collection);

    // Allow both single object and array.
    $.each(oneOrMany(collection), function () {
      this.container = that;
    });
    
    // Add elements.
    [].splice.apply(this.collection, args);
  },

  // Remove the given object.
  remove: function (collection) {
    var that = this;

    // Allow both single object and array.
    $.each(oneOrMany(collection), function () {
      var index = that.indexOf(this);
      if (index < 0) return;
      
      var object = that.collection[index];
      object.container = null;
      
      that.collection.splice(index, 1);
    });
  },

  // Replace the given object with the replacement object(s).
  replace: function (object, collection) {
    var index = this.indexOf(object);
    this.remove(object);
    this.add(collection, index);
  },

  // Find index of given object in list.
  indexOf: function (object) {
    return (typeof object == 'number') ? object : $.inArray(object, this.collection);
  },

  // Next iterator.
  next: function (object) {
    return this.collection[this.indexOf(object) + 1];
  },

  // Previous iterator.
  prev: function (object) {
    return this.collection[this.indexOf(object) - 1];
  },

};

})(jQuery);