define(["compilerutil"], function(compilerutil) {
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

  var exprPrec = function(expr) {
    switch(expr.type) {
    case "FunctionExpr":
    case "GetName":
    case "ConstNum":
    case "CreateArray":
      return 19;
    case "CreateObject":
      return 19;
    case "GetIndex":
    case "GetAttr":
    case "New":
      return 18;
    case "BinaryOp":
      return binOpPrec[expr.op];
    case "PrefixOp":
      return 15;
    case "Call":
      return 17;
    case "Assign":
      return 3;
    default:
      console.log(expr);
      throw expr.type;
    }
  };

  var JSGenerator = function() {
    this.writer = new compilerutil.CodeWriter();
  };

  JSGenerator.prototype.generateExpr = function(expr, contextPrec) {
    var prec = exprPrec(expr);

    if (prec < contextPrec) {
      this.writer.out("(");
    }

    switch(expr.type) {
    case "ConstNum":
      this.writer.out(expr.value.toString());
      break;
    case "GetName":
      this.writer.out(expr.name);
      break;
    case "GetAttr":
      this.generateExpr(expr.expr, prec);
      this.writer.out(".").out(expr.attr);
      break;
    case "PrefixOp":
      this.writer.out(expr.op);
      this.generateExpr(expr.expr, prec);
      break;
    case "BinaryOp":
      this.generateExpr(expr.left, prec);
      this.writer.out(" ").out(expr.op).out(" ");
      this.generateExpr(expr.right, prec + 1);
      break;
    case "Call":
      this.generateExpr(expr.expr, prec);
      this.writer.out("(");
      for (var i = 0; i < expr.args.length; i++) {
	if (i != 0) {
	  this.writer.out(", ");
	}
	this.generateExpr(expr.args[i], 0);
      }
      this.writer.out(")");
      break;
    case "New":
      this.writer.out("new ");
      this.generateExpr(expr.expr, prec);
      this.writer.out("(");
      for (var i = 0; i < expr.args.length; i++) {
	if (i != 0) {
	  this.writer.out(", ");
	}
	this.generateExpr(expr.args[i], 0);
      }
      this.writer.out(")");
      break;
    case "GetIndex":
      this.generateExpr(expr.expr, prec);
      this.writer.out("[");
      this.generateExpr(expr.index, 0);
      this.writer.out("]");
      // TODO coerce return type
      break;
    case "Assign":
      this.generateExpr(expr.target, prec + 1);
      this.writer.out(" = ");
      this.generateExpr(expr.value, prec);
      break;
    case "FunctionExpr":
      this.writer.out("function(");
      for (var i = 0; i < expr.params.length; i++) {
	if (i != 0) {
	  this.writer.out(", ");
	}
	this.writer.out(expr.params[i]);
      }
      this.writer.out(") {").eol().indent();
      this.generateBlock(expr.body);
      this.writer.dedent().out("}");
      break;
    case "CreateArray":
      this.writer.out("[").eol().indent();
      for (var i = 0; i < expr.args.length; i++) {
	if (i != 0) {
	  this.writer.out(",").eol();
	}
	var arg = expr.args[i];
	this.generateExpr(arg, 0);
      }
      this.writer.eol();
      this.writer.dedent().out("]");
      break;
    case "CreateObject":
      this.writer.out("{").eol().indent();
      for (var i = 0; i < expr.args.length; i++) {
	if (i != 0) {
	  this.writer.out(",").eol();
	}
	var arg = expr.args[i];
	this.writer.out(arg.key).out(": ");
	this.generateExpr(arg.value, 0);
      }
      this.writer.eol();
      this.writer.dedent().out("}");
      break;
    default:
      console.log(expr);
      throw expr.type;
    }

    if (prec < contextPrec) {
      this.writer.out(")");
    }
  };

  JSGenerator.prototype.generateStmt = function(stmt) {
    switch (stmt.type) {
    case "VarDecl":
      this.writer.out("var ").out(stmt.name);
      if (stmt.expr) {
	this.writer.out(" = ");
	this.generateExpr(stmt.expr, 0);
      }
      this.writer.out(";").eol();
      break;
    case "Return":
      this.writer.out("return");
      if (stmt.expr) {
	this.writer.out(" ");
	this.generateExpr(stmt.expr, 0);
      }
      this.writer.out(";").eol();
      break;
    case "Label":
      this.writer.out(stmt.name).out(": ");
      this.generateStmt(stmt.stmt);
      break;
    case "Break":
      this.writer.out("break ").out(stmt.name);
      this.writer.out(";").eol();
      break;
    case "If":
      this.writer.out("if (");
      this.generateExpr(stmt.cond, 0);
      this.writer.out(") {").eol();
      this.writer.indent();
      this.generateBlock(stmt.t);
      this.writer.dedent();
      if (stmt.f) {
	this.writer.out("} else {").eol();
	this.writer.indent();
	this.generateBlock(stmt.f);
	this.writer.dedent();
      }
      this.writer.out("}").eol();
      break;
    case "While":
      this.writer.out("while (");
      this.generateExpr(stmt.cond, 0);
      this.writer.out(") {").eol();
      this.writer.indent();
      this.generateBlock(stmt.body);
      this.writer.dedent();
      this.writer.out("}").eol();
      break;
    case "InjectSource":
      var lines = stmt.source.split("\n");
      while (lines.length && lines[lines.length - 1] == "") {
	lines.pop();
      }
      for (var i = 0; i < lines.length; i++) {
	if (lines[i]) {
          this.writer.out(lines[i]);
        }
        this.writer.eol();
      }
      break;
    default:
      this.generateExpr(stmt, 0);
      this.writer.out(";").eol();
    }
  };

  JSGenerator.prototype.generateBlock = function(block) {
      for (var i = 0; i < block.length; i++) {
	this.generateStmt(block[i]);
      }
  };

  var generateExpr = function(expr) {
    var gen = new JSGenerator();
    gen.writer.out("(");
    gen.generateExpr(expr, 0);
    gen.writer.out(")");
    return gen.writer.getOutput();
  };

  return {
    generateExpr: generateExpr,
  };
});