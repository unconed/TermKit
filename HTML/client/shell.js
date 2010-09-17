(function ($) {

var tc = termkit.client;

/**
 * NodeKit shell representation.
 */
tc.shell = function (client, environment) {
  var self = this;
  
  this.environment = environment;
  this.client = client;
};

tc.shell.prototype = {

};

})();

