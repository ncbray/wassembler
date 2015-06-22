define(["js/ast", "wasm/typeinfo"], function(jast, typeinfo) {
  var arrayNames = {
    'i8': 'I8',
    'i16': 'I16',
    'i32': 'I32',
    'f32': 'F32',
    'f64': 'F64',
  };

  var JSTranslator = function() {
  };

  JSTranslator.prototype.localName = function(index) {
    return this.func.locals[index].name;
  };

  JSTranslator.prototype.funcName = function(index) {
    return this.module.funcs[index].name.text;
  };

  JSTranslator.prototype.externName = function(index) {
    return this.module.externs[index].name.text;
  };

  JSTranslator.prototype.implicitType = function(expr) {
    switch (expr.type) {
    case "Call":
    case "GetName":
      return "?";
    case "ConstNum":
      return "f64";
    case "BinaryOp":
      switch (expr.op) {
      case "+":
      case "-":
      case "*":
      case "/":
      case "%":
	return "f64";
      case "<":
      case "<=":
      case ">":
      case ">=":
      case "==":
      case "!=":
	return "bool";
      case "&":
      case "^":
      case "|":
      case ">>":
      case "<<":
	return "i32";
      default:
	console.log(expr);
	throw Error(expr.op);
      }
    case "PrefixOp":
      switch (expr.op) {
      case "!":
	return "bool";
      default:
	console.log(expr);
	throw Error(expr.op);
      }
    default:
      console.log(expr);
      throw Error(expr.type);
    }
  }

  JSTranslator.prototype.coerce = function(expr, type) {
    if (this.implicitType(expr) == type) {
      return expr;
    }
    switch (type) {
    case "i8":
      return jast.BinaryOp({
	left: jast.BinaryOp({
	  left: expr,
	  op: "<<",
	  right: jast.ConstNum({
	    value: 24
	  }),
	}),
	op: ">>",
	right: jast.ConstNum({
	  value: 24
	}),
      });
    case "i16":
      return jast.BinaryOp({
	left: jast.BinaryOp({
	  left: expr,
	  op: "<<",
	  right: jast.ConstNum({
	    value: 16
	  }),
	}),
	op: ">>",
	right: jast.ConstNum({
	  value: 16
	}),
      });
    case "i32":
      return jast.BinaryOp({
	left: expr,
	op: "|",
	right: jast.ConstNum({
	  value: 0
	}),
      });
    case "f32":
      return jast.Call({
	expr: jast.GetAttr({
	  expr: jast.GetName({
	    name: "Math",
	  }),
	  attr: "fround",
	}),
	args: [
	  expr,
	],
      });
    case "f64":
      return jast.PrefixOp({
	op: "+",
	expr: expr,
      });
    default:
      console.log(expr);
      throw type;
    }
}

  JSTranslator.prototype.processExpr = function(expr) {
    switch(expr.type) {
    case "ConstI32":
      return jast.ConstNum({
	value: expr.value,
      });
    case "ConstF32":
      return jast.ConstNum({
	value: expr.value,
      });
    case "ConstF64":
      return jast.ConstNum({
	value: expr.value,
      });
    case "GetLocal":
      return jast.GetName({
	name: this.localName(expr.index),
      });
    case "Load":
      if (!(expr.mtype in arrayNames)) throw Error(expr.mtype);

      var shift = Math.log2(typeinfo.sizeOf(expr.mtype));

      return jast.GetIndex({
	expr: jast.GetName({
	  name: arrayNames[expr.mtype],
	}),
	index: jast.BinaryOp({
	  left: this.processExpr(expr.address),
	  op: ">>",
	  right: jast.ConstNum({value: shift}),
	}),
      });
    case "Store":
      if (!(expr.mtype in arrayNames)) throw Error(expr.mtype);

      var shift = Math.log2(typeinfo.sizeOf(expr.mtype));

      return jast.Assign({
	target: jast.GetIndex({
	  expr: jast.GetName({
	    name: arrayNames[expr.mtype],
	  }),
	  index: jast.BinaryOp({
	    left: this.processExpr(expr.address),
	    op: ">>",
	    right: jast.ConstNum({value: shift}),
	  }),
	}),
	value: this.processExpr(expr.value),
      });
    case "PrefixOp":
      // The default
      var translated = jast.PrefixOp({
	op: expr.op,
	expr: this.processExpr(expr.expr),
      });
      var needs_coerce = true;
      if (needs_coerce) {
	  translated = this.coerce(translated, expr.etype);
      }
      return translated;
    case "Coerce":
      return this.coerce(this.processExpr(expr.expr), expr.mtype);
    case "BinaryOp":
      // The default
      var translated = jast.BinaryOp({
	left: this.processExpr(expr.left),
	op: expr.op,
	right: this.processExpr(expr.right),
      });
      var needs_coerce = true;

      switch (expr.etype) {
      case "i8":
      case "i16":
	break;
      case "i32":
	switch (expr.op) {
	case "*":
	  translated = jast.Call({
	    expr: jast.GetAttr({
	      expr: jast.GetName({
		name: "Math",
	      }),
	      attr: "imul",
	    }),
	    args: [
	      this.processExpr(expr.left),
	      this.processExpr(expr.right),
	    ],
	  });
	  needs_coerce = expr.etype != "i32";
	  break;
	}
	break;
      case "f32":
	break;
      case "f64":
	needs_coerce = false;
	break;
      default:
	console.log(expr);
	throw expr.etype;
      }
      if (needs_coerce) {
	  translated = this.coerce(translated, expr.etype);
      }
      return translated;
    case "CallDirect":
      var args = [];
      for (var i = 0; i < expr.args.length; i++) {
	args.push(this.processExpr(expr.args[i]));
      }
      return jast.Call({
	expr: jast.GetName({name: this.funcName(expr.func)}),
	args: args,
      });
    case "CallExternal":
      var args = [];
      for (var i = 0; i < expr.args.length; i++) {
	args.push(this.processExpr(expr.args[i]));
      }
      return jast.Call({
	expr: jast.GetName({name: this.externName(expr.func)}),
	args: args,
      });
    default:
      console.log(expr);
      throw expr.type;
    }
  };

  JSTranslator.prototype.processStmt = function(stmt, result) {
    switch(stmt.type) {
    case "If":
      result.push(jast.If({
	cond: this.processExpr(stmt.cond),
	t: this.processBlock(stmt.t, []),
	f: stmt.f ? this.processBlock(stmt.f, []) : null,
      }));
      break;
    case "While":
      result.push(jast.While({
	cond: this.processExpr(stmt.cond),
	body: this.processBlock(stmt.body, []),
      }));
      break;
    case "Loop":
      result.push(jast.While({
	cond: jast.GetName({name: "true"}),
	body: this.processBlock(stmt.body, []),
      }));
      break;
    case "SetLocal":
      result.push(jast.Assign({
	target: jast.GetName({
	  name: this.localName(stmt.index),
	}),
	value: this.processExpr(stmt.value),
      }));
      break;
    case "Return":
      result.push(jast.Return({
	expr: stmt.expr ? this.processExpr(stmt.expr) : null,
      }));
      break;
    case "Break":
      result.push(jast.Break({}));
      break;
    default:
      result.push(this.processExpr(stmt));
    }
    return result;
  };

  JSTranslator.prototype.processBlock = function(block, result) {
    for (var i = 0; i < block.length; i++) {
      this.processStmt(block[i], result);
    }
    return result;
  };

  JSTranslator.prototype.zeroValue = function(t) {
    switch (t) {
    case "i32":
    case "f32":
    case "f64":
      return this.coerce(jast.ConstNum({value: 0}), t);
    default:
      throw Error(t);
    }
  };

  JSTranslator.prototype.processFunc = function(func) {
    this.func = func;

    var params = [];
    var body = [];
    for (var i = 0; i < func.params.length; i++){
      var p = func.params[i];
      var name = p.name.text;
      params.push(name);
      body.push(jast.VarDecl({
	name: name,
	expr: this.coerce(jast.GetName({name: name}), p.ptype),
      }));
    }

    // HACK?
    for (var i = func.params.length; i < func.locals.length; i++) {
      var lcl = func.locals[i];
      body.push(jast.VarDecl({
	name: lcl.name,
	expr: this.zeroValue(lcl.ltype),
      }));
    }

    this.processBlock(func.body, body);

    return jast.VarDecl({
      name: func.name.text,
      expr: jast.FunctionExpr({
	params: params,
	body: body,
      }),
    });
  }

  JSTranslator.prototype.processModule = function(module) {
    this.module = module;

    var body = [];
    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      body.push(jast.VarDecl({
	name: extern.name.text,
	expr: jast.GetAttr({
	  expr: jast.GetName({
	    name: "imports",
	  }),
	  attr: extern.name.text,
	}),
      }));
    }

    body.push(jast.VarDecl({
      name: "buffer",
      expr: jast.New({
	expr: jast.GetName({
	  name: "ArrayBuffer",
	}),
	args: [
	  jast.ConstNum({value: 4096}),
	],
      }),
    }));

    body.push(jast.VarDecl({
      name: arrayNames["i8"],
      expr: jast.New({
	expr: jast.GetName({
	  name: "Int8Array",
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    body.push(jast.VarDecl({
      name: arrayNames["i16"],
      expr: jast.New({
	expr: jast.GetName({
	  name: "Int16Array",
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    body.push(jast.VarDecl({
      name: arrayNames["i32"],
      expr: jast.New({
	expr: jast.GetName({
	  name: "Int32Array",
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    body.push(jast.VarDecl({
      name: arrayNames["f32"],
      expr: jast.New({
	expr: jast.GetName({
	  name: "Float32Array",
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    body.push(jast.VarDecl({
      name: arrayNames["f64"],
      expr: jast.New({
	expr: jast.GetName({
	  name: "Float64Array",
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    var exports = [];

    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      body.push(this.processFunc(func));
      if (func.exportFunc) {
	exports.push(jast.KeyValue({
	  key: func.name.text,
	  value: jast.GetName({
	    name: func.name.text,
	  }),
	}));
      }
    }

    body.push(jast.Return({
      expr: jast.CreateObject({
	args: exports,
      }),
    }));

    return jast.FunctionExpr({
      params: ["imports"],
      body: body,
    });
  };

  var translate = function(module) {
    var translator = new JSTranslator();
    return translator.processModule(module);
  };

  return {
    translate: translate,
  };
});
