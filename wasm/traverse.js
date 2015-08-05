define([], function() {
  var TopDownBottomUp = function(visitor) {
    this.visitor = visitor;
  };

  TopDownBottomUp.prototype.processExpr = function(node) {
    if (this.visitor.processExprPre) {
      node = this.visitor.processExprPre(node);
    }
    switch (node.type) {
    case "GetLocal":
    case "GetFunction":
    case "GetExtern":
    case "GetTls":
    case "ConstI32":
    case "ConstI64":
    case "ConstF32":
    case "ConstF64":
      break;
    case "PrefixOp":
      node.expr = this.processExpr(node.expr);
      break;
    case "InfixOp":
      node.left = this.processExpr(node.left);
      node.right = this.processExpr(node.right);
      break;
    case "UnaryOp":
      node.expr = this.processExpr(node.expr);
      break;
    case "BinaryOp":
      node.left = this.processExpr(node.left);
      node.right = this.processExpr(node.right);
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
    case "CallIndirect":
      node.expr = this.processExpr(node.expr);
      for (var i = 0; i < node.args.length; i++) {
	node.args[i] = this.processExpr(node.args[i]);
      }
      break;
    default:
      console.log(node);
      throw Error(node.type);
    }
    if (this.visitor.processExprPost) {
      node = this.visitor.processExprPost(node);
    }
    return node;
  }

  TopDownBottomUp.prototype.processStmt = function(node, out) {
    var temp = [];
    if (this.visitor.processStmtPre) {
      this.visitor.processStmtPre(node, temp);
    } else {
      temp.push(node);
    }

    for (var i = 0; i < temp.length; i++) {
      node = temp[i];
      switch (node.type) {
      case "SetLocal":
      case "SetTls":
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
      case "Loop":
	node.body = this.processBlock(node.body);
	break;
      default:
	node = this.processExpr(node);
      }
      if (this.visitor.processStmtPost) {
	this.visitor.processStmtPost(node, out);
      } else {
	out.push(node);
      }
    }
  };

  TopDownBottomUp.prototype.processBlock = function(block) {
    var out = [];
    for (var i = 0; i < block.length; i++) {
      this.processStmt(block[i], out);
    }
    return out;
  };

  TopDownBottomUp.prototype.processFunc = function(func) {
    if (this.visitor.processFuncPre) {
      this.visitor.processFuncPre(func);
    }
    func.body = this.processBlock(func.body);
    if (this.visitor.processFuncPost) {
      this.visitor.processFuncPost(func);
    }
  };

  TopDownBottomUp.prototype.processModule = function(module) {
    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      if (this.visitor.processExtern) {
	this.visitor.processExtern(extern);
      }
    }
    for (var i = 0; i < module.funcs.length; i++) {
      this.processFunc(module.funcs[i]);
    }
  };

  return {TopDownBottomUp: TopDownBottomUp};
});