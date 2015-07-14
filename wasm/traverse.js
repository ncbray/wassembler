define([], function() {
  var BottomUp = function(visitor) {
    this.visitor = visitor;
  };

  BottomUp.prototype.processExpr = function(node) {
    switch (node.type) {
    case "GetLocal":
    case "GetFunction":
    case "GetExtern":
    case "GetTls":
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
    return this.visitor.processExpr(node);
  }

  BottomUp.prototype.processStmt = function(node, out) {
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
    this.visitor.processFunc(func);
  };

  BottomUp.prototype.processModule = function(module) {
    for (var i = 0; i < module.externs.length; i++) {
      this.visitor.processExtern(module.externs[i]);
    }
    for (var i = 0; i < module.funcs.length; i++) {
      this.processFunc(module.funcs[i]);
    }
  };

  return {BottomUp: BottomUp};
});