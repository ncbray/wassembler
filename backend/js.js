define([], function() {
  var CodeWriter = function() {
    this.margins = [];
    this.margin = "";
    this.output = "";
    this.dirty = false;
  };

  CodeWriter.prototype.out = function(text) {
    if (typeof text != "string") {
      throw Error(text);
    }
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

  var binOpPrec = {
    "*": 14,
    "/": 14,
    "%": 14,
    "+": 13,
    "-": 13,
    "<<": 12,
    ">>": 12,
    ">>>": 12,
    "<": 11,
    "<=": 11,
    ">": 11,
    ">=": 11,
    "==": 10,
    "!=": 10,
    "===": 10,
    "!==": 10,
    "&": 9,
    "^": 8,
    "|": 7,
  };

  var JSGenerator = function(m) {
    this.m = m;
    this.writer = new CodeWriter();
  };

  JSGenerator.prototype.beginTypeCoerce = function(etype, rawP, coercedP, contextP, doCoerce) {
    if (!doCoerce) {
      if (rawP < contextP) {
	this.writer.out("(");
      }
      return;
    }
    if (coercedP < contextP) {
      this.writer.out("(");
    }
    if (rawP < coercedP) {
      this.writer.out("(");
    }

    switch (etype) {
    case "i32":
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

  JSGenerator.prototype.endTypeCoerce = function(etype, rawP, coercedP, contextP, doCoerce) {
    if (!doCoerce) {
      if (rawP < contextP) {
	this.writer.out(")");
      }
      return;
    }

    if (rawP < coercedP) {
      this.writer.out(")");
    }

    switch (etype) {
    case "i32":
      this.writer.out(" | 0");
      break;
    case "f32":
      this.writer.out(")");
      break;
    case "void":
      break;
    default:
      throw etype;
    }

    if (coercedP < contextP) {
      this.writer.out(")");
    }
  };

  var coerceNeeded = function(expr) {
    if (expr.etype == "void") {
      return false;
    }
    switch(expr.type) {
    case "getlocal":
    case "const_i32":
    case "const_f32":
    case "load":
    case "store":
      return false;
    default:
      return true;
    }
  };

  var rawPrec = function(expr) {
    switch (expr.type) {
    case "getlocal":
    case "const_i32":
    case "const_f32":
      return 19;
    case "calldirect":
    case "callexternal":
      return 17;
    case "binop":
      return binOpPrec[expr.op];
    case "load":
      return 18;
    case "store":
      return 3;
    default:
      console.log(expr);
      throw expr;
    }
  };

  var coercedPrec = function(expr) {
    switch (expr.etype) {
    case "i32":
      return binOpPrec["|"];
    case "f32":    
      return 17;
    case "void":
      return 17;
    default:
      throw expr.etype;
    };
  };

  var memInfo = {
    "i32": {heapName: "I32", shift: 2},
  };

  // TODO precedence.
  JSGenerator.prototype.generateExpr = function(expr, contextP) {
    var rawP = rawPrec(expr);
    var coercedP = coercedPrec(expr);
    var doCoerce = coerceNeeded(expr);

    this.beginTypeCoerce(expr.etype, rawP, coercedP, contextP, doCoerce);

    switch (expr.type) {
    case "const_i32":
      this.writer.out(expr.value.toString());
      break;
    case "const_f32":
      this.writer.out(expr.value.toString());
      break;
    case "getlocal":
      var lcl = this.func.locals[expr.index];
      this.writer.out(lcl.name);
      break;
    case "load":
      var info = memInfo[expr.mtype];
      this.writer.out(info.heapName).out("[(");
      this.generateExpr(expr.address, 0);
      this.writer.out(")>>" + info.shift + "]");
      break;

    case "store":
      var info = memInfo[expr.mtype];
      this.writer.out(info.heapName).out("[(");
      this.generateExpr(expr.address, 0);
      this.writer.out(")>>" + info.shift + "] = ");
      this.generateExpr(expr.value);
      break;

    case "binop":
      var opPrec = binOpPrec[expr.op];
      if (opPrec === undefined) {
	throw expr.op;
      }
      this.generateExpr(expr.left, opPrec);
      this.writer.out(" ").out(expr.op).out(" ");
      this.generateExpr(expr.right, opPrec + 1);
      break;
    case "callexternal":
      this.writer.out(this.m.externs[expr.func].name.text);
      this.writer.out("(");
      for (var i in expr.args) {
	if (i != 0) {
	  this.writer.out(", ")
	}
	this.generateExpr(expr.args[i], 0);
      }
      this.writer.out(")");
      break;
    case "calldirect":
      this.writer.out(this.m.funcs[expr.func].name.text);
      this.writer.out("(");
      for (var i in expr.args) {
	if (i != 0) {
	  this.writer.out(", ")
	}
	this.generateExpr(expr.args[i], 0);
      }
      this.writer.out(")");
      break;
    default:
      console.log(expr);
      throw expr.type;
    };

    this.endTypeCoerce(expr.etype, rawP, coercedP, contextP, doCoerce);
  };

  JSGenerator.prototype.generateStmt = function(expr) {
    switch (expr.type) {
    case "if":
      this.writer.out("if (");
      this.generateExpr(expr.cond, 0);
      this.writer.out(") {").eol();
      this.writer.indent();
      this.generateBlock(expr.t);
      this.writer.dedent();
      if (expr.f) {
	this.writer.out("} else {").eol();
	this.writer.indent();
	this.generateBlock(expr.f);
	this.writer.dedent();
      }
      this.writer.out("}").eol();
      break;
    case "return":
      this.writer.out("return ");
      this.generateExpr(expr.expr, 0);
      this.writer.out(";").eol();
      break;
    default:
      this.generateExpr(expr, 0);
      this.writer.out(";").eol();
    };
  };


  JSGenerator.prototype.generateBlock = function(block) {
    for (var i in block) {
      this.generateStmt(block[i]);
    }
  };

  JSGenerator.prototype.generateFunc = function(func) {
    this.func = func;

    this.writer.out("function ").out(func.name.text).out("(");
    for (var i = 0; i < func.params.length; i++) {
      var lcl = func.locals[func.params[i].index];
      if (i != 0) {
	this.writer.out(", ");
      }
      this.writer.out(lcl.name);
    }
    this.writer.out(") {").eol();
    this.writer.indent();

    // HACK assumes params come first.
    for (var i = 0; i < func.params.length; i++) {
      var lcl = func.locals[i];
      this.writer.out(lcl.name).out(" = ");
      this.beginTypeCoerce(func.locals[i].ltype, 19, 19, 0, true);
      this.writer.out(lcl.name);
      this.endTypeCoerce(func.locals[i].ltype, 19, 19, 0, true);
      this.writer.out(";").eol();
    }

    for (var i = func.params.length; i < func.locals.length; i++) {
      this.writer.out("var ").out(lcl.name).out(" = 0;").eol();
      // TODO initialize to the correct type of zero.
    }

    this.generateBlock(func.body);
    this.writer.dedent();
    this.writer.out("}").eol();
  };

  JSGenerator.prototype.generateModule = function(module) {
    this.writer.out("(function(imports) {").eol().indent();
    for (var i in module.externs) {
      var extern = module.externs[i];
      var name = extern.name.text;
      this.writer.out("var ").out(name).out(" = imports.").out(name).out(";").eol();
    };

    this.writer.eol();

    this.writer.out("var MEM = new ArrayBuffer(4096);").eol();
    this.writer.out("var I32 = new Int32Array(MEM);").eol();

    this.writer.eol();


    for (var i in module.funcs) {
      this.generateFunc(module.funcs[i]);
    };

    this.writer.eol();

    this.writer.out("return {").eol().indent();
    for (var i in module.funcs) {
      var func = module.funcs[i];
      if (!func.exportFunc) continue;
      var name = func.name.text;
      this.writer.out(name).out(": ").out(name).out(",").eol();
    };
    this.writer.dedent().out("};").eol();
    this.writer.dedent().out("})");
  };

  var generate = function(module) {
    var gen = new JSGenerator(module);
    gen.generateModule(module);
    return gen.writer.output;
  };

  return {generate: generate};
});
