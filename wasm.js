var wasm = {};

(function(exports) {

  exports.ConstI32 = function(args) {
    return {
      type: "const_i32",
      value: args.value
    };
  };

  exports.ConstF32 = function(args) {
    return {
      type: "const_f32",
      value: args.value
    };
  };

  exports.GetLocal = function(args) {
    return {
      type: "getlocal",
      index: args.index
    };
  };

  exports.BinaryOp = function(args) {
    return {
      type: "binop",
      left: args.left,
      op: args.op, right:
      args.right
    };
  };

  exports.CallDirect = function(args) {
    return {
      type: "calldirect",
      func: args.func,
      args: args.args
    };
  };

  exports.CallExternal = function(args) {
    return {
      type: "callexternal",
      func: args.func,
      args: args.args
    };
  };

  exports.Return = function(args) {
    return {
      type: "return",
      expr: args.expr
    };
  };

  exports.Function = function(args) {
    return {
      type: "function",
      name: args.name,
      argCount: args.argCount,
      exportFunc: args.exportFunc,
      locals: args.locals,
      returnType: args.returnType,
      body: args.body
    };
  };

  exports.Extern = function(args) {
    return {
      type: "extern",
      args: args.args,
      returnType: args.returnType
    };
  };

  exports.Module = function(args) {
    return {
      type: "module",
      externs: args.externs,
      funcs: args.funcs,
    };
  };


  var SemanticPass = function() {
  };

  SemanticPass.prototype.processExpr = function(expr) {
    switch(expr.type) {
    case "const_i32":
      expr.etype = "i32";
      return expr.etype;
    case "const_f32":
      expr.etype = "f32";
      return expr.etype;
    case "getlocal":
      expr.etype = this.func.locals[expr.index];
      return expr.etype;
    case "binop":
      var lt = this.processExpr(expr.left);
      var rt = this.processExpr(expr.right);
      if (lt != rt) {
	console.log(expr, lt, rt);
	throw expr;
      }
      expr.etype = lt;
      return expr.etype;
    case "calldirect":
      var target = this.module.funcs[expr.func];
      if (expr.args.length != target.argCount) {
	console.log(target);
	throw expr.args.length;
      }
      for (var i = 0; i < expr.args.length; i++) {
	var arg = expr.args[i];
	this.processExpr(arg);
	if (arg.etype != target.locals[i]) {
	  console.log(i, arg.etype, target.locals[i]);
	  throw expr;
	}
      }
      expr.etype = target.returnType;
      return expr.etype;
    case "callexternal":
      var target = this.module.externs[expr.func];
      if (expr.args.length != target.args.length) {
	console.log(target);
	throw expr.args.length;
      }
      for (var i = 0; i < expr.args.length; i++) {
	var arg = expr.args[i];
	this.processExpr(arg);
	if (arg.etype != target.args[i]) {
	  console.log(i, arg.etype, target.args[i]);
	  throw expr;
	}
      }
      expr.etype = target.returnType;
      return expr.etype;
    case "return":
      this.processExpr(expr.expr);
      return "void";
    default:
      throw expr.type;
    }
  };

  SemanticPass.prototype.processFunction = function(func) {
    this.func = func;
    for (var i in func.body) {
      this.processExpr(func.body[i]);
    }
  };

  SemanticPass.prototype.processModule = function(module) {
    this.module = module;
    for (var i in module.funcs) {
      this.processFunction(module.funcs[i]);
    }
  };


  var CodeWriter = function() {
    this.margins = [];
    this.margin = "";
    this.output = "";
    this.dirty = false;
  };

  CodeWriter.prototype.out = function(text) {
    if (!this.dirty) {
      this.output += this.margin;
      this.dirty = true;
    }
    this.output += text;
    return this;
  };

  CodeWriter.prototype.eol = function() {
    this.output += "\n";
    this.dirty = false;
    return this;
  };

  CodeWriter.prototype.indent = function() {
    this.margins.push(this.margin);
    this.margin += "  ";
    return this;
  };

  CodeWriter.prototype.dedent = function() {
    this.margin = this.margins.pop();
    return this;
  };

  var JSGenerator = function(m) {
    this.m = m;
    this.writer = new CodeWriter();
  };

  JSGenerator.prototype.beginTypeCoerce = function(etype) {
    switch (etype) {
    case "i32":
      this.writer.out("(");
      break;
    case "f32":
      this.writer.out("Math.fround(");
      break;    
    case "void":
      break;
    default:
      throw etype;
    }
  };

  JSGenerator.prototype.endTypeCoerce = function(etype) {
    switch (etype) {
    case "i32":
      this.writer.out("|0)");
      break;
    case "f32":
      this.writer.out(")");
      break;
    case "void":
      break;
    default:
      throw etype;
    }
  };


  JSGenerator.prototype.generateLocalName = function(index) {
    this.writer.out("l").out(index);
  };

  // TODO precedence.
  JSGenerator.prototype.generateExpr = function(expr) {
    switch (expr.type) {
    case "const_i32":
      this.writer.out(expr.value);
      break;
    case "const_f32":
      this.beginTypeCoerce(expr.etype);
      this.writer.out(expr.value);
      this.endTypeCoerce(expr.etype);
      break;
    case "getlocal":
      this.generateLocalName(expr.index);
      break;
    case "binop":
      this.beginTypeCoerce(expr.etype);
      this.writer.out("(");
      this.generateExpr(expr.left);
      this.writer.out(" ").out(expr.op).out(" ");
      this.generateExpr(expr.right);
      this.writer.out(")");
      this.endTypeCoerce(expr.etype);
      break;
    case "callexternal":
      this.beginTypeCoerce(expr.etype);
      this.writer.out("imports[").out(expr.func).out("]");
      this.writer.out("(");
      for (var i in expr.args) {
	if (i != 0) {
	  this.writer.out(", ")
	}
	this.generateExpr(expr.args[i]);
      }
      this.writer.out(")");
      this.endTypeCoerce(expr.etype);
      break;
    case "calldirect":
      this.beginTypeCoerce(expr.etype);
      this.writer.out(this.m.funcs[expr.func].name);
      this.writer.out("(");
      for (var i in expr.args) {
	if (i != 0) {
	  this.writer.out(", ")
	}
	this.generateExpr(expr.args[i]);
      }
      this.writer.out(")");
      this.endTypeCoerce(expr.etype);
      break;
    case "return":
      this.writer.out("return ");
      this.generateExpr(expr.expr);
      break;
    default:
      console.log(expr);
      throw expr.type;
    };
  };

  JSGenerator.prototype.generateBlock = function(block) {
    for (var i in block) {
      this.generateExpr(block[i]);
      this.writer.out(";").eol();
    }
  };

  JSGenerator.prototype.generateFunc = function(func) {
    this.writer.out("function ").out(func.name).out("(");
    for (var i = 0; i < func.argCount; i++) {
      if (i != 0) {
	this.writer.out(", ");
      }
      this.generateLocalName(i);
    }
    this.writer.out(") {").eol();
    this.writer.indent();

    for (var i = 0; i < func.argCount; i++) {
      this.generateLocalName(i);
      this.writer.out(" = ");
      this.beginTypeCoerce(func.locals[i]);
      this.generateLocalName(i);
      this.endTypeCoerce(func.locals[i]);
      this.writer.out(";").eol();
    }

    for (var i = func.argCount; i < func.locals.length; i++) {
      this.writer.out("var ");
      this.generateLocalName(i);
      this.writer.out(" = 0;").eol();
      // TODO initialize to the correct type of zero.
    }

    this.generateBlock(func.body);
    this.writer.dedent();
    this.writer.out("}").eol();
  };

  JSGenerator.prototype.generateModule = function(module) {
    this.writer.out("(function(imports) {").eol().indent();
    for (var i in module.funcs) {
      this.generateFunc(module.funcs[i]);
    };
    this.writer.out("return {").eol().indent();
    for (var i in module.funcs) {
      var func = module.funcs[i];
      if (!func.exportFunc) continue;
      this.writer.out(func.name).out(": ").out(func.name).out(",").eol();
    };
    this.writer.dedent().out("};").eol();
    this.writer.dedent().out("})");
  };

  exports.GenerateJS = function(module) {
    var semantic = new SemanticPass();
    semantic.processModule(module);

    var gen = new JSGenerator(module);
    gen.generateModule(module);
    return gen.writer.output;
  };

})(wasm);
