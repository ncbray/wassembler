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

  var Desugar = function(config) {
    this.config = config;
  };

  Desugar.prototype.not = function(expr) {
    expr = wast.PrefixOp({
      op: "!",
      expr: expr,
    });
    expr.etype = "i32";
    expr = this.processExpr(expr);
    return expr
  };

  Desugar.prototype.processExpr = function(node) {
    switch (node.type) {
    case "Coerce":
      if (this.config.simplify_types) {
	var simplified = this.simplifyType(node.mtype);
	if (simplified == node.expr.etype) {
	  node.expr.etype = node.mtype;
	  node = node.expr;
	} else {
	  node.mtype = simplified;
	}
      }
      break;
    case "PrefixOp":
      switch(node.op) {
      case "!":
	switch (node.expr.type) {
	case "BinaryOp":
	  var op = invertedOps[node.expr.op];
	  if (op !== undefined) {
	    node.expr.op = op;
	    return this.processExpr(node.expr);
	  }
	  break;
	}
	break;
      }
      break;
    case "BinaryOp":
      if (this.config.canonicalize) {
	switch (node.op) {
	case ">":
	case ">=":
	case "!=":
	  node.op = invertedOps[node.op]
	  node = wast.PrefixOp({
	    op: "!",
	    expr: node,
	  });
	  node.etype = "i32";
	  // Must immedately return to avoid resimplifications.
	  return node;
	}
      }
    }
    if (this.config.simplify_types) {
      switch(node.etype) {
      case "i8":
	node.etype = "i32";
	node = wast.BinaryOp({
	  left: wast.BinaryOp({
	    left: node,
	    op: "<<",
	    right: wast.ConstI32({
	      value: 24
	    }),
	  }),
	  op: ">>",
	  right: wast.ConstI32({
	    value: 24
	  }),
	});
	node.etype = "i32";
	node.left.etype = "i32";
	node.left.right.etype = "i32";
	node.right.etype = "i32";
	break;
      case "i16":
	node.etype = "i32";
	node = wast.BinaryOp({
	  left: wast.BinaryOp({
	    left: node,
	    op: "<<",
	    right: wast.ConstI32({
	      value: 16
	    }),
	  }),
	  op: ">>",
	  right: wast.ConstI32({
	    value: 16
	  }),
	});
	node.etype = "i32";
	node.left.etype = "i32";
	node.left.right.etype = "i32";
	node.right.etype = "i32";
	break;
      }
    }
    return node;
  };

  Desugar.prototype.processStmt = function(node, out) {
    switch (node.type) {
    case "While":
      if (this.config.simple_loops) {
	var body = [wast.If({
	  cond: this.not(node.cond),
	  t: [wast.Break({})],
	  f: null
	})];
	body = body.concat(node.body);
	node = wast.Loop({
	  body: body,
	});
      }
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
    if (this.config.simplify_types) {
      for (var i = 0; i < node.params.length; i++) {
	node.params[i].ptype = this.simplifyType(node.params[i].ptype);
      }
      for (var i = 0; i < node.locals.length; i++) {
	node.locals[i].ltype = this.simplifyType(node.locals[i].ltype);
      }
      node.returnType = this.simplifyType(node.returnType);
    }
    return node;
  };

  Desugar.prototype.processExtern = function(node) {
    if (this.config.simplify_types) {
      for (var i = 0; i < node.args.length; i++) {
	node.args[i] = this.simplifyType(node.args[i]);
      }
      node.returnType = this.simplifyType(node.returnType);
    }
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