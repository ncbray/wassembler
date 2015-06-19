define(["wasm/ast"], function(wast) {

  var Desugar = function(config) {
    this.config = config;
  };

  Desugar.prototype.processStmt = function(node, out) {
    switch (node.type) {
    case "While":
      if (this.config.simple_loops) {
	// TODO BoolNot
	var body = [wast.If({
	  cond: node.cond,
	  t: [],
	  f: [wast.Break({}),]
	})];
	body = body.concat(node.body);
	out.push(wast.Loop({
	  body: body,
	}));
      } else {
	out.push(node);
      }
      break;
    default:
      out.push(node);
    }
  };

  Desugar.prototype.processBlock = function(block) {
    var out = [];
    for (var i = 0; i < block.length; i++) {
      this.processStmt(block[i], out);
    }
    return out;
  };

  Desugar.prototype.processFunc = function(func) {
    func.body = this.processBlock(func.body);
    return func;
  };

  Desugar.prototype.processModule = function(module) {
    for (var i = 0; i < module.funcs.length; i++) {
      module.funcs[i] = this.processFunc(module.funcs[i]);
    }
    return module;
  };

  var process = function(module, config) {
    var desugar = new Desugar(config);
    module = desugar.processModule(module);
    return module;
  };

  return {
    process: process,
  };
});