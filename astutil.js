define([], function() {
  var makeASTBuilder = function(config) {
    var exports = {};
    for (var i in config) {
      var decl = config[i];
      exports[decl.name] = (function(decl) {
        return function(args){
	  var node = {type: decl.type};
	  for (var i in decl.fields) {
	    var field = decl.fields[i];
	    if (!(field.name in args)) {
	      throw Error("Required AST field: " + decl.name + "." + field.name)
	    }
	    node[field.name] = args[field.name];
	  }
	  return node;
        }
      })(decl);
    }
    return exports;
  };
  return {
    makeASTBuilder: makeASTBuilder,
  };
});