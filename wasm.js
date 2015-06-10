var wasm = {};

(function(exports) {

  exports.Const = function(args) {
    return {type: "const", value: args.value};
  };

  exports.BinaryOp = function(args) {
    return {type: "binop", left: args.left, op: args.op, right: args.right};
  };

  exports.Return = function(args) {
    return {type: "return", expr: args.expr};
  };

  exports.Function = function(args) {
    return {type: "function", name: args.name, args: args.args, body: args.body};
  };

  exports.Module = function(args) {
    return {type: "module", funcs: args.funcs};
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

  // TODO precedence.
  var generateExpr = function(expr, writer) {
    switch (expr.type) {
    case "const":
      writer.out(expr.value);
      break;
    case "binop":
      generateExpr(expr.left, writer);
      writer.out(" ").out(expr.op).out(" ");
      generateExpr(expr.right, writer);
      break;
    case "return":
      writer.out("return ");
      generateExpr(expr.expr, writer);
      break;
    default:
      console.log(expr);
      throw expr.type;
    };
  };

  var generateBlock = function(block, writer) {
    for (var i in block) {
      generateExpr(block[i], writer);
      writer.out(";").eol();
    }
  };

  var generateFunc = function(func, writer) {
    writer.out("function ").out(func.name).out("() {").eol();
    writer.indent();
    generateBlock(func.body, writer);
    writer.dedent();
    writer.out("}").eol();
  };

  exports.GenerateJS = function(module) {
    var writer = new CodeWriter();
    writer.out("(function() {").eol().indent();
    for (var i in module.funcs) {
      generateFunc(module.funcs[i], writer);
    };
    writer.out("return {").eol().indent();
     for (var i in module.funcs) {
       var func = module.funcs[i];
       writer.out(func.name).out(": ").out(func.name).out(",").eol();
    };
    writer.dedent().out("};").eol();
    writer.dedent().out("})()");
    return writer.output;    
  };

})(wasm);
