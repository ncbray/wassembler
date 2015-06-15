var backend_js = {};

(function(exports) {
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
      var lcl = this.func.locals[expr.index];
      this.writer.out(lcl.name);
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
      this.writer.out(this.m.externs[expr.func].name);
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

  JSGenerator.prototype.generateStmt = function(expr) {
    switch (expr.type) {
    case "if":
      this.writer.out("if (");
      this.generateExpr(expr.cond);
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
    default:
      this.generateExpr(expr);
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

    this.writer.out("function ").out(func.name).out("(");
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
      this.beginTypeCoerce(func.locals[i].ltype);
      this.writer.out(lcl.name);
      this.endTypeCoerce(func.locals[i].ltype);
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
      this.writer.out("var ").out(extern.name).out(" = imports.").out(extern.name).out(";").eol();
    };

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

  exports.generate = function(module) {
    var gen = new JSGenerator(module);
    gen.generateModule(module);
    return gen.writer.output;
  };

})(backend_js);
