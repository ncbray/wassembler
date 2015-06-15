var semantic = {};

(function(exports) {

  var SemanticPass = function(status) {
    this.status = status;
  };

  SemanticPass.prototype.error = function(message) {
    this.status.error(message);
    this.dead = true;
  };

  SemanticPass.prototype.processExpr = function(expr) {
    var old_dead = this.dead;
    this.dead = false;

    switch(expr.type) {
    case "const_i32":
      expr.etype = "i32";
      break;
    case "const_f32":
      expr.etype = "f32";
      break;
    case "getname":
      var ref = this.localScope[expr.name];
      if (ref !== undefined) {
	var lcl = wast.GetLocal({index: ref.index});
	lcl.etype = ref.ltype;
	expr = lcl;
	break;
      }

      var ref = this.moduleScope[expr.name];
      if (ref !== undefined) {
	switch(ref.type) {
	case "function":
	  expr = wast.GetFunction({index: ref.index});
	  break;
        case "extern":
	  expr = wast.GetExtern({index: ref.index});
	  break;
	default:
	  console.log(ref);
	  throw ref;
	}
	break;
      }
      this.error("cannot resolve name - " + expr.name);
      break;
    case "getlocal":
      expr.etype = this.func.locals[expr.index];
      break;
    case "binop":
      expr.left = this.processExpr(expr.left);
      expr.right = this.processExpr(expr.right);
      if (expr.left.etype != expr.right.etype) {
	this.error("binary op type error - " + expr.left.etype + expr.op + expr.right.etype + " = ???");
      }
      expr.etype = expr.left.etype;
      break;
    case "call":
      expr.expr = this.processExpr(expr.expr);
      if (!this.dead) {
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
	  console.log(expr.expr);
	  throw expr.expr;
	}
      }

      // Process arguments
      for (var i = 0; i < expr.args.length; i++) {
	expr.args[i] = this.processExpr(expr.args[i]);
      }

      if (!this.dead) {
	switch (expr.type) {
	case "calldirect":
	  var target = this.module.funcs[expr.func];
	  if (expr.args.length != target.params.length) {
	    console.log(target);
	    throw expr.args.length;
	  }
	  for (var i = 0; i < expr.args.length; i++) {
	    var arg = expr.args[i];
	    if (arg.etype != target.params[i].ptype) {
	      console.log(i, arg.etype, params[i].ptype);
	      throw expr;
	    }
	  }
	  expr.etype = target.returnType;
	  break;
	case "callexternal":
	  var target = this.module.externs[expr.func];
	  if (expr.args.length != target.args.length) {
	    console.log(target);
	    throw expr.args.length;
	  }
	  for (var i = 0; i < expr.args.length; i++) {
	    var arg = expr.args[i];
	    if (arg.etype != target.args[i]) {
	      console.log(i, arg.etype, target.args[i]);
	      throw expr;
	    }
	  }
	  expr.etype = target.returnType;
	  break;
	default:
	  console.log(expr);
	  throw expr;
	}
      }
      break;
    case "return":
      expr.expr = this.processExpr(expr.expr);
      expr.etype = "void";
      break;
    case "if":
      expr.cond = this.processExpr(expr.cond);
      expr.t = this.processBlock(expr.t);
      expr.f = this.processBlock(expr.f);
      expr.etype = "void";
      break;
    default:
      console.log(expr);
      throw expr;
    }

    this.dead = this.dead || old_dead;
    return expr;
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
    var old_dead = this.dead;
    for (var i in block) {
      block[i] = this.processExpr(block[i]);
    }
    this.dead = this.dead || old_dead;
    return block;
  };

  SemanticPass.prototype.processFunction = function(func) {
    this.func = func;
    this.localScope = {};

    this.dead = false;

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

  exports.processModule = function(module, status) {
    var semantic = new SemanticPass(status);
    return semantic.processModule(module);
  };

})(semantic);
