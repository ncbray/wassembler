var semantic = {};

(function(exports) {

  var SemanticPass = function() {
  };

  SemanticPass.prototype.processExpr = function(expr) {
    switch(expr.type) {
    case "const_i32":
      expr.etype = "i32";
      return expr;
    case "const_f32":
      expr.etype = "f32";
      return expr;
    case "getname":
      var ref = this.localScope[expr.name];
      if (ref !== undefined) {
	var lcl = wast.GetLocal({index: ref.index});
	lcl.etype = ref.ltype;
	return lcl;
      }

      var ref = this.moduleScope[expr.name];
      if (ref !== undefined) {
	switch(ref.type) {
	case "function":
	  return wast.GetFunction({index: ref.index});
        case "extern":
	  return wast.GetExtern({index: ref.index});
	default:
	  throw ref;
	}
      }

      throw expr;
    case "getlocal":
      expr.etype = this.func.locals[expr.index];
      return expr;
    case "binop":
      expr.left = this.processExpr(expr.left);
      expr.right = this.processExpr(expr.right);
      if (expr.left.etype != expr.right.etype) {
	console.log(expr);
	throw expr;
      }
      expr.etype = expr.left.etype;
      return expr;
    case "call":
      expr.expr = this.processExpr(expr.expr);
      switch (expr.expr.type) {
      case "getfunction":
	expr = wast.CallDirect({
	  func: expr.expr.index,
	  args: expr.args,
	});
	break;
      case "getextern":
	expr = wast.CallExternal({
	  func: expr.expr.index,
	  args: expr.args,
	});
	break;
      default:
	throw expr.expr;
      }
      return this.processExpr(expr)
    case "calldirect":
      var target = this.module.funcs[expr.func];
      if (expr.args.length != target.params.length) {
	console.log(target);
	throw expr.args.length;
      }
      for (var i = 0; i < expr.args.length; i++) {
	var arg = expr.args[i];
	arg = this.processExpr(arg);
	expr.args[i] = arg;
	if (arg.etype != target.locals[i].ltype) {
	  console.log(i, arg.etype, target.locals[i]);
	  throw expr;
	}
      }
      expr.etype = target.returnType;
      return expr;
    case "callexternal":
      var target = this.module.externs[expr.func];
      if (expr.args.length != target.args.length) {
	console.log(target);
	throw expr.args.length;
      }
      for (var i = 0; i < expr.args.length; i++) {
	var arg = expr.args[i];
	arg = this.processExpr(arg);
	expr.args[i] = arg;
	if (arg.etype != target.args[i]) {
	  console.log(i, arg.etype, target.args[i]);
	  throw expr;
	}
      }
      expr.etype = target.returnType;
      return expr;
    case "return":
      expr.expr = this.processExpr(expr.expr);
      expr.etype = "void";
      return expr;
    case "if":
      expr.cond = this.processExpr(expr.cond);
      expr.t = this.processBlock(expr.t);
      expr.f = this.processBlock(expr.f);
      expr.etype = "void";
      return expr;
    default:
      console.log(expr);
      throw expr;
    }
  };

  SemanticPass.prototype.createLocal = function(name, type) {
    var lcl = wast.Local({
      name: name,
      ltype: type,
      index: this.func.locals.length
    });
    this.func.locals.push(lcl);
    this.localScope[name] = lcl;
    return lcl.index;
  };

  SemanticPass.prototype.processBlock = function(block) {
    if (block === null) {
      return block;
    }
    for (var i in block) {
      block[i] = this.processExpr(block[i]);
    }
    return block;
  };

  SemanticPass.prototype.processFunction = function(func) {
    this.func = func;
    this.localScope = {};

    for (var i in func.params) {
      var p = func.params[i];
      p.index = this.createLocal(p.name, p.ptype);
    }
    func.body = this.processBlock(func.body);
  };

  SemanticPass.prototype.processModule = function(module) {
    this.module = module;

    // Index
    this.moduleScope = {};
    for (var i in module.externs) {
      var e = module.externs[i];
      e.index = i;
      this.moduleScope[e.name] = e;
    }
    for (var i in module.funcs) {
      var func = module.funcs[i];
      func.index = i;
      this.moduleScope[func.name] = func;
    }

    // Process
    for (var i in module.funcs) {
      this.processFunction(module.funcs[i]);
    }

    return module;
  };

  exports.processModule = function(module) {
    var semantic = new SemanticPass();
    return semantic.processModule(module);
  };

})(semantic);
