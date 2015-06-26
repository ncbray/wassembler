define(["wasm/ast"], function(wast) {

  var BottomUp = function(visitor) {
    this.visitor = visitor;
  };

  BottomUp.prototype.processExpr = function(node) {
    switch (node.type) {
    case "GetLocal":
    case "ConstI32":
    case "ConstF32":
    case "ConstF64":
      break;
    case "BinaryOp":
      node.left = this.processExpr(node.left);
      node.right = this.processExpr(node.right);
      break;
    case "PrefixOp":
      node.expr = this.processExpr(node.expr);
      break;
    case "Store":
      node.address = this.processExpr(node.address);
      node.value = this.processExpr(node.value);
      break;
    case "Load":
      node.address = this.processExpr(node.address);
      break;
    case "Coerce":
      node.expr = this.processExpr(node.expr);
      break;
    case "CallDirect":
    case "CallExternal":
      for (var i = 0; i < node.args.length; i++) {
	node.args[i] = this.processExpr(node.args[i]);
      }
      break;
    default:
      console.log(node);
      throw Error(node.type);
    }
    return this.visitor.processExpr(node);
  }

  BottomUp.prototype.processStmt = function(node, out) {
    switch (node.type) {
    case "SetLocal":
      node.value = this.processExpr(node.value);
      break;
    case "Return":
      if (node.expr) {
	node.expr = this.processExpr(node.expr);
      }
      break;
    case "Break":
      break;
    case "If":
      node.cond = this.processExpr(node.cond);
      node.t = this.processBlock(node.t);
      if (node.f) {
	node.f = this.processBlock(node.f);
      }
      break;
    case "While":
      node.cond = this.processExpr(node.cond);
      node.body = this.processBlock(node.body);
      break;
    default:
      node = this.processExpr(node);
    }
    this.visitor.processStmt(node, out);
  };

  BottomUp.prototype.processBlock = function(block) {
    var out = [];
    for (var i = 0; i < block.length; i++) {
      this.processStmt(block[i], out);
    }
    return out;
  };

  BottomUp.prototype.processFunc = function(func) {
    func.body = this.processBlock(func.body);
    func = this.visitor.processFunc(func);
    return func;
  };

  BottomUp.prototype.processModule = function(module) {
    for (var i = 0; i < module.externs.length; i++) {
      module.externs[i] = this.visitor.processExtern(module.externs[i]);
    }
    for (var i = 0; i < module.funcs.length; i++) {
      module.funcs[i] = this.processFunc(module.funcs[i]);
    }
    return module;
  };

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
    return node;
  };

  Desugar.prototype.processExtern = function(node) {
    for (var i = 0; i < node.args.length; i++) {
      node.args[i] = this.simplifyType(node.args[i]);
    }
    node.returnType = this.simplifyType(node.returnType);
    return node;
  };

  var process = function(module, config) {
    var desugar = new BottomUp(new Desugar(config));
    module = desugar.processModule(module);
    return module;
  };

  return {
    process: process,
  };
});