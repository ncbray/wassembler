define(["wasm/ast", "wasm/typeinfo"], function(wast, typeinfo) {

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
    case "ConstI32":
      this.setExprType(expr, "i32");
      expr.etype = "i32";
      break;
    case "ConstF32":
      this.setExprType(expr, "f32");
      break;
    case "ConstF64":
      this.setExprType(expr, "f64");
      break;
    case "GetName":
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
	  case "Function":
	    expr = wast.GetFunction({index: ref.index});
	    break;
          case "Extern":
	    expr = wast.GetExtern({index: ref.index});
	    break;
          case "MemoryDecl":
	    expr = wast.ConstI32({
	      value: ref.ptr
	    });
	    this.setExprType(expr, "i32");
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
    case "SetName":
      var name = expr.name.text;
      var ref = this.localScope[name];
      if (ref !== undefined) {
	expr = wast.SetLocal({
	  index: ref.index,
	  value: this.processExpr(expr.value)
	});
	this.setExprType(expr, "void");
	break;
      } else {
	this.error("cannot assign to name - " + name, expr.name.pos);
      }
      break;
    case "Load":
      expr.address = this.processExpr(expr.address);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "Store":
      expr.address = this.processExpr(expr.address);
      expr.value = this.processExpr(expr.value);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "BinaryOp":
      expr.left = this.processExpr(expr.left);
      expr.right = this.processExpr(expr.right);
      if (!this.dead) {
	if (expr.left.etype != expr.right.etype) {
	  this.error("binary op type error - " + expr.left.etype + expr.op + expr.right.etype + " = ???");
	}
	switch (expr.op) {
	case "<":
	case "<=":
	case ">":
	case ">=":
	case "==":
	case "!=":
	  this.setExprType(expr, "i32");
	  break;
	default:
	  this.setExprType(expr, expr.left.etype);
	}
      }
      break;
    case "Call":
      expr.expr = this.processExpr(expr.expr);
      if (!this.dead) {
	switch (expr.expr.type) {
	case "GetFunction":
	  expr = wast.CallDirect({
	    func: expr.expr.index,
	    args: expr.args,
	  });
	  break;
	case "GetExtern":
	  expr = wast.CallExternal({
	    func: expr.expr.index,
	    args: expr.args,
	  });
	  break;
	default:
	  console.log(expr);
	  throw expr.expr;
	}
      }

      // Process arguments
      for (var i = 0; i < expr.args.length; i++) {
	expr.args[i] = this.processExpr(expr.args[i]);
      }

      if (!this.dead) {
	switch (expr.type) {
	case "CallDirect":
	  var target = this.module.funcs[expr.func];

	  if (expr.args.length != target.params.length) {
	    this.error("argument count mismatch - got " + expr.args.length + ", but expected " + target.params.length);
	  }

	  this.setExprType(expr, target.returnType);

	  if (!this.dead) {
	    for (var i = 0; i < expr.args.length; i++) {
	      var arg = expr.args[i];
	      if (arg.etype != target.params[i].ptype) {
		this.error("arg " + i + " - got " + arg.etype + ", but expected " + target.params[i].ptype);
	      }
	    }
	  }
	  break;
	case "CallExternal":
	  var target = this.module.externs[expr.func];

	  if (expr.args.length != target.args.length) {
	    this.error("argument count mismatch - got " + expr.args.length + ", but expected " + target.args.length);
	  }

	  this.setExprType(expr, target.returnType);

	  if (!this.dead) {
	    for (var i = 0; i < expr.args.length; i++) {
	      var arg = expr.args[i];
	      if (arg.etype != target.args[i]) {
		this.error("arg " + i + " - got " + arg.etype + ", but expected " + target.args[i]);
	      }
	    }
	  }
	  break;
	default:
	  console.log(expr);
	  throw expr;
	}
      }
      break;
    case "Return":
      var actual = "void";
      if (expr.expr) {
	expr.expr = this.processExpr(expr.expr);
	actual = expr.expr.etype;
      }
      if (!this.dead && actual != this.func.returnType) {
	this.error("return type mismatch - " + actual + " vs. " + this.func.returnType);
      }
      this.setExprType(expr, "void");
      break;
    case "If":
      expr.cond = this.processExpr(expr.cond);
      if (!this.dead && expr.cond.etype != "i32") {
	this.error("condition type mismatch - " + expr.cond.etype + " vs. i32");
      }

      expr.t = this.processBlock(expr.t);
      if (expr.f != null) {
	expr.f = this.processBlock(expr.f);
      }
      this.setExprType(expr, "void");
      break;
    case "While":
      expr.cond = this.processExpr(expr.cond);
      if (!this.dead && expr.cond.etype != "i32") {
	this.error("condition type mismatch - " + expr.cond.etype + " vs. i32");
      }
      expr.body = this.processBlock(expr.body);
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
    case "i8":
    case "i16":
    case "i32":
    case "f32":
    case "f64":
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

    if (name in this.localScope) {
      this.error("attemped to redeclare " + name);
      return -1;
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

  SemanticPass.prototype.processStmt = function(node, block) {
    switch (node.type) {
    case "VarDecl":
      var t = this.processType(node.vtype);
      var index = this.createLocal(node.name.text, t);
      if (node.value) {
	node = wast.SetLocal({
	  index: index,
	  value: this.processExpr(node.value),
	});
	this.setExprType(node, "void");
	block.push(node);
      }
      break;
    default:
      block.push(this.processExpr(node));
    }
  };

  SemanticPass.prototype.processBlock = function(block) {
    if (block === null) {
      return block;
    }
    var old_dead = this.dead;
    var out = []
    for (var i in block) {
      this.processStmt(block[i], out);
    }
    this.dead = this.dead || old_dead;
    return out;
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
    for (var i = 0; i < module.externs.length; i++) {
      var e = module.externs[i];
      e.index = i;
      this.registerInModule(e.name, e);
      this.processExternSig(e);
    }
    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      func.index = i;
      this.registerInModule(func.name, func);
      this.processFuncSig(func);
    }

    // Zero is null, so don't use that.
    var ptr = 8;
    for (var i in module.memory) {
      var mem = module.memory[i];
      mem.mtype = this.processType(mem.mtype);

      var size = typeinfo.sizeOf(mem.mtype);

      // Align
      if (ptr % size != 0) {
	ptr += size - ptr % size;
      }

      // Allocate
      mem.ptr = ptr;
      ptr += size;

      this.registerInModule(mem.name, mem);
    }
  };

  SemanticPass.prototype.processModule = function(module) {
    if (module.type != "ParsedModule") {
      console.log(module);
      throw module.type;
    }

    // Bucket the declarations.
    var externs = [];
    var funcs = [];
    var memory = [];
    for (var i in module.decls) {
      var decl = module.decls[i];
      switch (decl.type) {
      case "Function":
	funcs.push(decl);
	break;
      case "Extern":
	externs.push(decl);
	break;
      case "MemoryDecl":
	memory.push(decl);
	break;
      default:
	console.log(decl);
	throw decl.type;
      }
    }

    module = wast.Module({
      externs: externs,
      funcs: funcs,
      memory: memory,
    });

    this.module = module;
    this.indexModule(module);
    if (!this.dead) {
      for (var i in module.funcs) {
	this.processFunction(module.funcs[i]);
      }
    }
    return module;
  };

  var processModule = function(module, status) {
    var semantic = new SemanticPass(status);
    return semantic.processModule(module);
  };

  return {
    processModule: processModule,
  };

});
