var semantic = {};

(function(exports) {

  var SemanticPass = function(status) {
    this.status = status;
  };

  SemanticPass.prototype.error = function(message, pos) {
    this.status.error(message, pos);
    this.dead = true;
  };

  SemanticPass.prototype.setExprType = function(expr, t) {
    if(typeof t != "string") {
      console.log(Error(t));
      throw t;
    }
    expr.etype = t;
  };

  SemanticPass.prototype.processExpr = function(expr) {
    var old_dead = this.dead;
    this.dead = false;

    switch(expr.type) {
    case "const_i32":
      this.setExprType(expr, "i32");
      expr.etype = "i32";
      break;
    case "const_f32":
      this.setExprType(expr, "f32");
      break;
    case "getname":
      var name = expr.name.text;
      var ref = this.localScope[name];
      if (ref !== undefined) {
	var expr = wast.GetLocal({index: ref.index});
	this.setExprType(expr, ref.ltype);
	break;
      } else {
	var ref = this.moduleScope[name];
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
	} else {
	  this.error("cannot resolve name - " + name, expr.name.pos);
	}
      }
      break;
    case "load":
      expr.address = this.processExpr(expr.address);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "store":
      expr.address = this.processExpr(expr.address);
      expr.value = this.processExpr(expr.value);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "binop":
      expr.left = this.processExpr(expr.left);
      expr.right = this.processExpr(expr.right);
      if (!this.dead) {
	if (expr.left.etype != expr.right.etype) {
	  this.error("binary op type error - " + expr.left.etype + expr.op + expr.right.etype + " = ???");
	}
	this.setExprType(expr, expr.left.etype);
      }
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
	    this.error("argument count mismatch");
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
	  this.setExprType(expr, target.returnType);
	  break;
	case "callexternal":
	  var target = this.module.externs[expr.func];
	  if (expr.args.length != target.args.length) {
	    this.error("argument count mismatch");
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
	  this.setExprType(expr, target.returnType);
	  break;
	default:
	  console.log(expr);
	  throw expr;
	}
      }
      break;
    case "return":
      expr.expr = this.processExpr(expr.expr);
      this.setExprType(expr, "void");
      break;
    case "if":
      expr.cond = this.processExpr(expr.cond);
      expr.t = this.processBlock(expr.t);
      expr.f = this.processBlock(expr.f);
      this.setExprType(expr, "void");
      break;
    default:
      console.log(expr);
      throw expr;
    }

    this.dead = this.dead || old_dead;
    return expr;
  };

  SemanticPass.prototype.processType = function(type) {
    var t = type.text;
    switch (t) {
    case "i32":
    case "void":
      break;
    default:
      this.error("unknown type - " + type.text, type.pos);
    }
    return t;
  };

  SemanticPass.prototype.createLocal = function(name, type) {
    if (typeof name !== "string") {
      throw Error(name);
    }
    if (typeof type !== "string") {
      throw Error(type);
    }

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
      p.index = this.createLocal(p.name.text, p.ptype);
    }
    func.body = this.processBlock(func.body);
  };

  SemanticPass.prototype.processExternSig = function(extern) {
    for (var i in extern.args) {
      extern.args[i] = this.processType(extern.args[i]);
    }
    extern.returnType = this.processType(extern.returnType);
  };

  SemanticPass.prototype.processFuncSig = function(func) {
    for (var i in func.params) {
      var p = func.params[i];
      p.ptype = this.processType(p.ptype);
    }
    func.returnType = this.processType(func.returnType);
  };

  SemanticPass.prototype.registerInModule = function(name, decl) {
    if (name.text in this.moduleScope) {
      this.error("attempted to redefine name - " + name.text, name.pos);
    } else {
      this.moduleScope[name.text] = decl;
    }
  };

  SemanticPass.prototype.indexModule = function(module) {
    this.moduleScope = {};
    for (var i in module.externs) {
      var e = module.externs[i];
      e.index = i;
      this.registerInModule(e.name, e);
      this.processExternSig(e);
    }
    for (var i in module.funcs) {
      var func = module.funcs[i];
      func.index = i;
      this.registerInModule(func.name, func);
      this.processFuncSig(func);
    }
  };

  SemanticPass.prototype.processModule = function(module) {
    this.module = module;
    this.indexModule(module);
    if (!this.dead) {
      for (var i in module.funcs) {
	this.processFunction(module.funcs[i]);
      }
    }
    return module;
  };

  exports.processModule = function(module, status) {
    var semantic = new SemanticPass(status);
    return semantic.processModule(module);
  };

})(semantic);
