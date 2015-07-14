define(["wasm/ast", "wasm/traverse"], function(wast, traverse) {

  var invertedOps = {
    ">": "<=",
    ">=": "<",
    "<": ">=",
    "<=": ">",
    "!=": "==",
    "==": "!=",
  };

  var simplified_type = {
    "i8": "i32",
    "i16": "i32",
  };

  var naturallyBool = function(node) {
    if (node.etype != "i32") return false;
    switch (node.type) {
    case "ConstI32":
      return node.value === 0 || node.value === 1;
    case "PrefixOp":
      return node.op == "!";
    case "BinaryOp":
      return node.op in invertedOps; // HACK to idenfity compares.
    default:
      return false;
    }
  };

  var peelBoolNot = function(node) {
    if (node.expr.type == "PrefixOp" && node.expr.op == "!" && naturallyBool(node.expr.expr)) {
      return node.expr.expr;
    }
    return node;
  };

  var Desugar = function() {
  };

  Desugar.prototype.not = function(expr) {
    expr = wast.PrefixOp({
      op: "!",
      expr: expr,
      pos: null,
    });
    expr.etype = "i32";
    return peelBoolNot(expr);
  };

  Desugar.prototype.constI32 = function(value) {
    var node = wast.ConstI32({
      value: value,
      pos: null,
    });
    node.etype = "i32";
    return node;
  };

  Desugar.prototype.constF32 = function(value) {
    var node = wast.ConstF32({
      value: value,
      pos: null,
    });
    node.etype = "f32";
    return node;
  };

  Desugar.prototype.constF64 = function(value) {
    var node = wast.ConstF64({
      value: value,
      pos: null,
    });
    node.etype = "f64";
    return node;
  };

  Desugar.prototype.processExpr = function(node) {
    switch (node.type) {
    case "Coerce":
      var simplified = this.simplifyType(node.mtype);
      if (simplified == node.expr.etype) {
	node.expr.etype = node.mtype;
	node = node.expr;
      } else {
	node.mtype = simplified;
      }
      break;
    case "PrefixOp":
      switch(node.op) {
      case "!":
	// No floating point "not" operation, lower into a compare.
	if (node.expr.etype == "f32") {
	  node = wast.BinaryOp({
	    left: node.expr,
	    op: "==",
	    right: this.constF32(0.0),
	  });
	  node.etype = "i32";
	} else if (node.expr.etype == "f64") {
	  node = wast.BinaryOp({
	    left: node.expr,
	    op: "==",
	    right: this.constF64(0.0),
	  });
	  node.etype = "i32";
	} else {
          node = peelBoolNot(node);
        }
      break;
      }
    case "BinaryOp":
      switch (node.op) {
      case ">":
      case ">=":
      case "!=":
	node.op = invertedOps[node.op]
	node = this.not(node);
      }
    }
    switch(node.etype) {
    case "i8":
      node.etype = "i32";
      node = wast.BinaryOp({
	left: wast.BinaryOp({
	  left: node,
	  op: "<<",
	  right: this.constI32(24),
	}),
	op: ">>",
	right: this.constI32(24),
      });
      node.etype = "i32";
      node.left.etype = "i32";
      break;
    case "i16":
      node.etype = "i32";
      node = wast.BinaryOp({
	left: wast.BinaryOp({
	  left: node,
	  op: "<<",
	  right: this.constI32(16),
	}),
	op: ">>",
	right: this.constI32(16),
      });
      node.etype = "i32";
      node.left.etype = "i32";
      break;
    }
    return node;
  };

  Desugar.prototype.processStmt = function(node, out) {
    switch (node.type) {
    case "While":
      var body = [wast.If({
	cond: this.not(node.cond),
	t: [wast.Break({pos: null})],
	f: null,
	pos: null,
      })];
      body = body.concat(node.body);
      node = wast.Loop({
	body: body,
      });
      break;
    }
    out.push(node);
  };

  Desugar.prototype.simplifyType = function(t) {
    if (typeof t !== "string") {
      throw Error(t);
    }
    if (t in simplified_type) {
      return simplified_type[t];
    }
    return t;
  };

  Desugar.prototype.processFunc = function(node) {
    for (var i = 0; i < node.params.length; i++) {
      node.params[i].ptype = this.simplifyType(node.params[i].ptype);
    }
    for (var i = 0; i < node.locals.length; i++) {
      node.locals[i].ltype = this.simplifyType(node.locals[i].ltype);
    }
    node.returnType = this.simplifyType(node.returnType);
  };

  Desugar.prototype.simplifyFuncType = function(node) {
    for (var i = 0; i < node.paramTypes.length; i++) {
      node.paramTypes[i] = this.simplifyType(node.paramTypes[i]);
    }
    node.returnType = this.simplifyType(node.returnType);
    return node;
  };

  Desugar.prototype.processExtern = function(node) {
    node.ftype = this.simplifyFuncType(node.ftype);
  };

  var process = function(module, config) {
    var desugar = new traverse.BottomUp(new Desugar(config));
    desugar.processModule(module);
    return module;
  };

  return {
    process: process,
  };
});