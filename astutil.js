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

  var index = function(keynames, table, rowfilter) {
    var finalkeyname = keynames.pop();
    var out = {};
    for (var i = 0; i < table.length; i++) {
      var row = table[i];
      var current = out;
      for (var j = 0; j < keynames.length; j++) {
	var key = row[keynames[j]];
	if (!(key in current)) {
	  current[key] = {};
	}
	current = current[key];
      }
      var key = row[finalkeyname];
      if (current[key] === undefined) {
	if (rowfilter) {
	  row = rowfilter(row);
	}
	current[key] = row;
      } else {
	console.log(out);
	throw Error("tried to redefine " + key + " @" + i);
      }
    }
    return out;
  };

  return {
    makeASTBuilder: makeASTBuilder,
    index: index,
  };
});