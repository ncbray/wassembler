define([], function() {
  var makeASTBuilder = function(config) {
    var exports = {};
    for (var i in config) {
      var decl = config[i];
      if (decl.name in exports) {
	throw Error("Attempted to redefine " + decl.name);
      }

      decl.fieldIndex = {};
      for (var i in decl.fields) {
	var field = decl.fields[i];
	if (field.name in decl.fieldIndex) {
	  throw Error("Attempted to redefine " + decl.name + "." + field.name);
	}
	decl.fieldIndex[field.name] = field;
      }

      exports[decl.name] = (function(decl) {
        return function(args){
	  for (var name in args) {
	    if (!(name in decl.fieldIndex)) {
	      throw Error("Unknown AST field: " + decl.name + "." + name);
	    }
	  }
	  var node = {type: decl.name};
	  for (var i in decl.fields) {
	    var field = decl.fields[i];
	    if (!(field.name in args)) {
	      throw Error("Required AST field: " + decl.name + "." + field.name);
	    }
	    var value = args[field.name];
	    if (value === undefined) {
	      throw Error("Undefined AST field: " + decl.name + "." + field.name);
	    }
	    node[field.name] = value;
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