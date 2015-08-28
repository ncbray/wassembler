define(["wasm/traverse"], function(traverse) {
  var FindLive = function() {
  };

  FindLive.prototype.markLiveFunc = function(func) {
    if (!this.liveFunc[func.index]) {
      this.liveFunc[func.index] = true;
      this.pending.push(func);
    }
  };

  FindLive.prototype.markLiveExtern = function(func) {
    if (!this.liveExtern[func.index]) {
      this.liveExtern[func.index] = true;
    }
  };

  FindLive.prototype.processExprPost = function(node) {
    switch(node.type) {
    case "GetFunction":
      this.markLiveFunc(node.func);
      break;
    case "GetExtern":
      this.markLiveExtern(node.func);
      break;
    case "CallDirect":
      this.markLiveFunc(node.func);
      break;
    case "CallExternal":
      this.markLiveExtern(node.func);
      break;
    }
    return node;
  };

  FindLive.prototype.processStmtPost = function(node, out) {
    out.push(this.processExprPost(node));
  };

  FindLive.prototype.run = function(module) {
    this.liveFunc = [];
    for (var i = 0; i < module.funcs.length; i++) {
      this.liveFunc.push(false);
    }
    this.liveExtern = [];
    for (var i = 0; i < module.externs.length; i++) {
      this.liveExtern.push(false);
    }

    this.pending = [];

    // Exports are always live.
    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      if (func.exportFunc) {
        this.markLiveFunc(func);
      }
    }

    // Iterate until we've found everything that is live.
    while (this.pending.length) {
      this.traverse.processFunc(this.pending.shift());
    }

    // Keep only the live funcs.
    var culledFuncs = [];
    for (var i = 0; i < module.funcs.length; i++) {
      if (this.liveFunc[i]) {
        var func = module.funcs[i];
        func.index = culledFuncs.length;
        culledFuncs.push(func);
      }
    }
    module.funcs = culledFuncs;

    // Keep only the live externs.
    var culledExterns = [];
    for (var i = 0; i < module.externs.length; i++) {
      if (this.liveExtern[i]) {
        var func = module.externs[i];
        func.index = culledExterns.length;
        culledExterns.push(func);
      }
    }
    module.externs = culledExterns;
  }

  var process = function(module) {
    var finder = new FindLive();
    finder.traverse = new traverse.TopDownBottomUp(finder);
    finder.run(module);
    return module;
  };

  return {process: process};
});