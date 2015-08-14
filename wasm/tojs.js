define(["js/ast", "wasm/traverse", "wasm/typeinfo", "wasm/opinfo", "astutil"], function(jast, traverse, typeinfo, opinfo, astutil) {

  var TranslatorAnalysis = function() {
    this.breakStack = [];
    this.labelUID = 0;
  }

  TranslatorAnalysis.prototype.processStmtPre = function(stmt, out) {
    switch (stmt.type) {
    case "If":
    case "Loop":
      this.breakStack.push(stmt);
      break;
    case "Break":
      // Figure out what statement this break targets, and generate a label if it doesn't already exist.
      var target = this.breakStack[this.breakStack.length - stmt.depth - 1];
      if (!target.generatedLabel) {
	target.generatedLabel = "label" + this.labelUID;
	this.labelUID += 1;
      }
      stmt.generatedLabel = target.generatedLabel;
    }
    out.push(stmt);
  }

  TranslatorAnalysis.prototype.processStmtPost = function(stmt, out) {
    switch (stmt.type) {
    case "If":
    case "Loop":
      this.breakStack.pop();
      break;
    }
    out.push(stmt);
  }


  var views = [
    {
      type: "u8",
      array_type: "Uint8Array",
      array_name: "U8",
    },
    {
      type: "i8",
      array_type: "Int8Array",
      array_name: "I8",
    },
    {
      type: "u16",
      array_type: "Uint16Array",
      array_name: "U16",
    },
    {
      type: "i16",
      array_type: "Int16Array",
      array_name: "I16",
    },
    {
      type: "u32",
      array_type: "Uint32Array",
      array_name: "U32",
    },
    {
      type: "i32",
      array_type: "Int32Array",
      array_name: "I32",
    },
    {
      type: "f32",
      array_type: "Float32Array",
      array_name: "F32"
    },
    {
      type: "f64",
      array_type: "Float64Array",
      array_name: "F64",
    },
  ];

  var typeToArrayName = astutil.index(["type"], views, undefined, function(row) { return row.array_name });

  var JSTranslator = function(use_shared_memory) {
    this.use_shared_memory = use_shared_memory;
  };

  JSTranslator.prototype.localName = function(local) {
    return "$" + local.name;
  };

  JSTranslator.prototype.funcName = function(func) {
    return func.name.text;
  };

  JSTranslator.prototype.externName = function(func) {
    return func.name.text;
  };

  JSTranslator.prototype.tlsName = function(tls) {
    return tls.name.text;
  };

  JSTranslator.prototype.arrayViewName = function(name) {
    if (this.use_shared_memory) {
      name = "Shared" + name;
    }
    return name;
  }

  var binOpResult = {
    "+": "f64",
    "-": "f64",
    "*": "f64",
    "/": "f64",
    "%": "f64",
    "==": "bool",
    "!=": "bool",
    "<": "bool",
    "<=": "bool",
    ">": "bool",
    ">=": "bool",
    "&": "i32",
    "^": "i32",
    "|": "i32",
    "<<": "i32",
    ">>": "i32",
    ">>>": "u32",
  };

  var wasmToJSInfixOp = astutil.index(["wasmop"], [
    {wasmop: opinfo.binaryOps.add, jsop: "+"},
    {wasmop: opinfo.binaryOps.sub, jsop: "-"},
    {wasmop: opinfo.binaryOps.mul, jsop: "*"},
    {wasmop: opinfo.binaryOps.div, jsop: "/"},
    {wasmop: opinfo.binaryOps.sdiv, jsop: "/"},
    {wasmop: opinfo.binaryOps.srem, jsop: "%"},
    {wasmop: opinfo.binaryOps.and, jsop: "&"},
    {wasmop: opinfo.binaryOps.ior, jsop: "|"},
    {wasmop: opinfo.binaryOps.xor, jsop: "^"},
    {wasmop: opinfo.binaryOps.shl, jsop: "<<"},
    {wasmop: opinfo.binaryOps.sar, jsop: ">>"},
    {wasmop: opinfo.binaryOps.shr, jsop: ">>>"},
    {wasmop: opinfo.binaryOps.eq, jsop: "=="},
    {wasmop: opinfo.binaryOps.ne, jsop: "!="},
    {wasmop: opinfo.binaryOps.lt, jsop: "<"},
    {wasmop: opinfo.binaryOps.le, jsop: "<="},
    {wasmop: opinfo.binaryOps.slt, jsop: "<"},
    {wasmop: opinfo.binaryOps.sle, jsop: "<="},
    {wasmop: opinfo.binaryOps.gt, jsop: ">"},
    {wasmop: opinfo.binaryOps.ge, jsop: ">="},
    {wasmop: opinfo.binaryOps.sgt, jsop: ">"},
    {wasmop: opinfo.binaryOps.sge, jsop: ">="},
  ]);

  var prefixOpResult = {
    "!": "bool",
  };

  var wasmToJSPrefixOp = astutil.index(["wasmop"], [
    {wasmop: "boolnot", jsop: "!"},
    {wasmop: "neg", jsop: "-"},
  ]);

  JSTranslator.prototype.defaultTranslateBinaryOp = function(optype, op, left, right, resultType) {
    var jsOp = wasmToJSInfixOp[op].jsop;
    var actualType = binOpResult[jsOp];
    var out = jast.BinaryOp({
      left: left,
      op: jsOp,
      right: right,
    });
    return this.coerce(out, actualType, resultType);
  };

  JSTranslator.prototype.implicitType = function(expr) {
    switch (expr.type) {
    case "Call":
    case "GetName":
      return "?";
    case "ConstNum":
      return "f64";
    case "BinaryOp":
      var result = binOpResult[expr.op];
      if (result === undefined) {
	throw Error(expr.op);
      }
      return result;
    case "PrefixOp":
      switch (expr.op) {
      case "!":
	return "bool";
      default:
	throw Error(expr.op);
      }
    default:
      throw Error(expr.type);
    }
  }

  JSTranslator.prototype.implicitCoerce = function(expr, desiredType){
    var actualType = this.implicitType(expr);
    return this.coerce(expr, actualType, desiredType);
  }

  JSTranslator.prototype.coerce = function(expr, actualType, desiredType){
    if (actualType == desiredType) {
      return expr;
    }
    switch (desiredType) {
    case "i32":
      return jast.BinaryOp({
	left: expr,
	op: "|",
	right: jast.ConstNum({
	  value: 0
	}),
      });
    case "i64":
      // HACK i64 operations are just double operations that are truncated.
      return jast.Call({
	expr: jast.GetName({
	  name: "trunc",
	}),
	args: [
	  expr,
	],
      });
    case "f32":
      return jast.Call({
	expr: jast.GetName({
	  name: "fround",
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
      throw Error(type);
    }
  }

  JSTranslator.prototype.processExpr = function(expr) {
    switch(expr.type) {
    case "ConstI32":
      return jast.ConstNum({
	value: expr.value,
      });
    case "ConstI64":
      // HACK this is imprecise.
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
	name: this.localName(expr.local),
      });
    case "GetTls":
      return jast.GetName({
	name: this.tlsName(expr.tls),
      });
    case "GetFunction":
      return jast.ConstNum({
	value: expr.func.funcPtr,
      });
    case "Load":
      if (!(expr.mtype in typeToArrayName)) throw Error(expr.mtype);

      var shift = Math.log2(typeinfo.sizeOf(expr.mtype));

      return jast.GetIndex({
	expr: jast.GetName({
	  name: typeToArrayName[expr.mtype],
	}),
	index: jast.BinaryOp({
	  left: this.processExpr(expr.address),
	  op: ">>",
	  right: jast.ConstNum({value: shift}),
	}),
      });
    case "Store":
      if (!(expr.mtype in typeToArrayName)) throw Error(expr.mtype);

      var shift = Math.log2(typeinfo.sizeOf(expr.mtype));

      return jast.Assign({
	target: jast.GetIndex({
	  expr: jast.GetName({
	    name: typeToArrayName[expr.mtype],
	  }),
	  index: jast.BinaryOp({
	    left: this.processExpr(expr.address),
	    op: ">>",
	    right: jast.ConstNum({value: shift}),
	  }),
	}),
	value: this.processExpr(expr.value),
      });
    case "UnaryOp":
      var child = this.processExpr(expr.expr);
      switch (expr.op) {
      case "sqrt":
	var actualType = "f64";
	var resultType = expr.etype;
	var out = jast.Call({
	  expr: jast.GetName({
	    name: "sqrt",
	  }),
	  args: [
	    child,
	  ],
	});
	break;
      default:
	var jsOp = wasmToJSPrefixOp[expr.op].jsop;
	var actualType = binOpResult[jsOp];
	var resultType = expr.etype;
	var out = jast.PrefixOp({
	  op: jsOp,
	  expr: child,
	});
      }
      return this.coerce(out, actualType, resultType);
    case "Coerce":
      return this.implicitCoerce(this.processExpr(expr.expr), expr.mtype);
    case "BinaryOp":
      var left = this.processExpr(expr.left);
      var right = this.processExpr(expr.right);

      // Special cases
      switch (expr.op) {
      case "mul":
	switch (expr.optype) {
	case "i32":
	  return jast.Call({
	    expr: jast.GetName({
	      name: "imul",
	    }),
	    args: [
	      left,
	      right,
	    ],
	  });
	}
	break;
      case "min":
	return this.coerce(jast.Call({
	  expr: jast.GetName({
	    name: "min",
	  }),
	  args: [
	    left,
	    right,
	  ],
	}), "f64", expr.etype);
      case "max":
	return this.coerce(jast.Call({
	  expr: jast.GetName({
	    name: "max",
	  }),
	  args: [
	    left,
	    right,
	  ],
	}), "f64", expr.etype);
      case ">>":
      case ">>>":
      case "<<":
      case "|":
      case "&":
      case "^":
	switch (expr.optype) {
	case "i64":
	  throw Error(expr.op + " not yet supported for i64");

	}
	break;
      }

      // The default
      return this.defaultTranslateBinaryOp(expr.optype, expr.op, left, right, expr.etype);
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
    case "CallIndirect":
      var index = this.processExpr(expr.expr);
      var args = [];
      for (var i = 0; i < expr.args.length; i++) {
	args.push(this.processExpr(expr.args[i]));
      }
      return jast.Call({
	expr:  jast.GetIndex({
	  expr: jast.GetName({name: "ftable"}),
	  index: index,
	}),
	args: args,
      });
    default:
      console.log(expr);
      throw Error(expr.type);
    }
  };

  JSTranslator.prototype.addLabel = function(stmt, result) {
    if (stmt.generatedLabel) {
      result = jast.Label({name: stmt.generatedLabel, stmt: result});
    }
    return result;
  };

  JSTranslator.prototype.processStmt = function(stmt, result) {
    switch(stmt.type) {
    case "If":
      result.push(this.addLabel(stmt, jast.If({
	cond: this.processExpr(stmt.cond),
	t: this.processBlock(stmt.t, []),
	f: stmt.f ? this.processBlock(stmt.f, []) : null,
      })));
      break;
    case "Loop":
      result.push(this.addLabel(stmt, jast.While({
	cond: jast.GetName({name: "true"}),
	body: this.processBlock(stmt.body, []),
      })));
      break;
    case "SetLocal":
      result.push(jast.Assign({
	target: jast.GetName({
	  name: this.localName(stmt.local),
	}),
	value: this.processExpr(stmt.value),
      }));
      break;
    case "SetTls":
      result.push(jast.Assign({
	target: jast.GetName({
	  name: this.tlsName(stmt.tls),
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
      result.push(jast.Break({
        name: stmt.generatedLabel,
      }));
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
      return this.coerce(jast.ConstNum({value: 0}), "f64", t);
    default:
      throw Error(t);
    }
  };

  JSTranslator.prototype.processFunc = function(func) {
    this.func = func;

    var analysis = new traverse.TopDownBottomUp(new TranslatorAnalysis());
    analysis.processFunc(func);


    var params = [];
    var body = [];
    for (var i = 0; i < func.params.length; i++){
      var p = func.params[i];
      var name = this.localName(p.local);
      params.push(name);
      body.push(jast.VarDecl({
	name: name,
	expr: this.coerce(jast.GetName({name: name}), "?", p.ptype),
      }));
    }

    // HACK?
    for (var i = func.params.length; i < func.locals.length; i++) {
      var lcl = func.locals[i];
      body.push(jast.VarDecl({
	name: this.localName(lcl),
	expr: this.zeroValue(lcl.ltype),
      }));
    }

    this.processBlock(func.body, body);

    return jast.VarDecl({
      name: this.funcName(func),
      expr: jast.FunctionExpr({
	params: params,
	body: body,
      }),
    });
  }

  JSTranslator.prototype.systemWrapper = function(module, system, use_shared_memory, generated) {
    var body = [];

    // The asm(ish) code.
    body.push(jast.VarDecl({
      name: "module",
      expr: generated,
    }));

    // Derive stdlib names.
    var stdlibNames = [
      "Math",
    ];
    for (var i = 0; i < views.length; i++) {
      stdlibNames.push(this.arrayViewName(views[i].array_type));
    }

    // Create stdlib structure.
    var stdlib = [];
    for (var i = 0; i < stdlibNames.length; i++) {
      var name = stdlibNames[i];
      stdlib.push(jast.KeyValue({
	key: name,
	value: jast.GetName({name: name}),
      }));
    }
    body.push(jast.VarDecl({
      name: "stdlib",
      expr: jast.CreateObject({
	args: stdlib
      }),
    }));

    // Initialize memory.
    body = body.concat(this.initMemory(module));

    // Determine the names of system functions.
    var system_externs = {};
    for (var i = 0; i < module.system_externs.length; i++) {
      system_externs[module.system_externs[i]] = true;
    }

    // Foreign dictionary rewriting.
    var wrapped_foreign = [];
    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      var wrapper;

      if (extern.name.text in system_externs) {
	wrapper = jast.GetAttr({
	  expr: jast.GetName({
	    name: "system",
	  }),
	  attr: extern.name.text,
	});
      } else {
	wrapper = jast.FunctionExpr({
	  params: [],
	  body: [
	    jast.Return({
	      expr: jast.Call({
		expr: jast.GetAttr({
		  expr: jast.GetAttr({
		    expr: jast.GetName({
		      name: "foreign",
		    }),
		    attr: extern.name.text,
		  }),
		  attr: "apply",
		}),
		args: [
		  jast.GetName({name: "instance"}),
		  jast.GetName({name: "arguments"}),
		],
	      }),
	    }),
	  ],
	});
      }

      wrapped_foreign.push(jast.KeyValue({
	key: extern.name.text,
	value: wrapper,
      }));
    }
    body.push(jast.VarDecl({
      name: "wrap_foreign",
      expr: jast.FunctionExpr({
	params: ["system", "foreign"],
	body: [
	  jast.Return({
	    expr: jast.CreateObject({
	      args: wrapped_foreign,
	    }),
	  }),
	],
      }),
    }));

    // JS System functions.
    body.push(jast.VarDecl({
      name: "threading_supported",
      expr: jast.ConstNum({value: use_shared_memory | 0}),
    }));
    body.push(jast.InjectSource({
      source: system,
    }));

    return jast.FunctionExpr({
      params: [],
      body: body,
    });
  };

  JSTranslator.prototype.initMemory = function(module) {
    var body = [];

    // Create memory.
    body.push(jast.VarDecl({
      name: "buffer",
      expr: jast.New({
	expr: jast.GetName({
	  name: this.arrayViewName("ArrayBuffer"),
	}),
	args: [
	  jast.ConstNum({value: module.config.memory.fixed}),
	],
      }),
    }));

    // View for initializing memory.
    body.push(jast.VarDecl({
      name: "U8",
      expr: jast.New({
	expr: jast.GetName({
	  name: this.arrayViewName("Uint8Array"),
	}),
	args: [
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));

    // Initialize memory.
    for (var i = 0; i < module.memory.length; i++) {
      var memory = module.memory[i];
      var u8 = new Uint8Array(memory.buffer);
      for(var o = 0; o < u8.byteLength; o++) {
	if (u8[o] == 0) continue;

	body.push(jast.Assign({
	  target: jast.GetIndex({
	    expr: jast.GetName({
	      name: "U8",
	    }),
	    index: jast.ConstNum({value: memory.ptr + o}),
	  }),
	  value: jast.ConstNum({value: u8[o]}),
	}));
      }
    }

    body.push(jast.Return({
      expr: jast.GetName({
	name: "buffer",
      }),
    }));


    return [
      jast.VarDecl({
	name: "initial_top",
	expr: jast.ConstNum({value: module.top}),
      }),
      jast.VarDecl({
	name: "createMemory",
	expr: jast.FunctionExpr({
	  params: [],
	  body: body,
	}),
      }),
    ];
  };

  JSTranslator.prototype.calcFuncInfo = function(module) {
    var funcPtr = 0;
    var funcTable = [];

    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      extern.funcPtr = funcPtr;
      funcPtr += 1;

      funcTable.push(jast.GetName({
	name: this.externName(extern),
      }));
    }

    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      func.funcPtr = funcPtr;
      funcPtr += 1;

      funcTable.push(jast.GetName({
	name: this.funcName(func),
      }));
    }

    this.funcTable = funcTable;
  };

  JSTranslator.prototype.processModule = function(module) {
    this.module = module;

    var body = [];

    for (var i = 0; i < views.length; i++) {
      var view = views[i];
      body.push(jast.VarDecl({
	name: view.array_name,
	expr: jast.New({
	  expr: jast.GetAttr({
	    expr: jast.GetName({
	      name: "stdlib",
	    }),
	    attr: this.arrayViewName(view.array_type),
	  }),
	  args: [
	    jast.GetName({name: "buffer"}),
	  ],
	}),
      }));
    }

    var mathImports = ["fround", "imul", "trunc", "min", "max", "sqrt"];

    for (var i = 0; i < mathImports.length; i++) {
      var name = mathImports[i];
      body.push(jast.VarDecl({
	name: name,
	expr: jast.GetAttr({
	  expr: jast.GetAttr({
	    expr: jast.GetName({
	      name: "stdlib",
	    }),
	    attr: "Math",
	  }),
	  attr: name,
	}),
      }));
    }

    // Foreign functions.
    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      body.push(jast.VarDecl({
	name: this.externName(extern),
	expr: jast.GetAttr({
	  expr: jast.GetName({
	    name: "foreign",
	  }),
	  attr: extern.name.text,
	}),
      }));
    }

    // Thread local storage (globals).
    for (var i = 0; i < module.tls.length; i++) {
      var v = module.tls[i];
      body.push(jast.VarDecl({
	name: this.tlsName(v),
	expr: jast.ConstNum({value: 0}), // TODO type coercion.
      }));
    }

    var exports = [];

    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      body.push(this.processFunc(func));
      if (func.exportFunc) {
	exports.push(jast.KeyValue({
	  key: func.name.text,
	  value: jast.GetName({
	    name: this.funcName(func),
	  }),
	}));
      }
    }

    // Indirect function call table.
    body.push(jast.VarDecl({
      name: "ftable",
      expr: jast.CreateArray({
	args: this.funcTable,
      }),
    }));

    body.push(jast.Return({
      expr: jast.CreateObject({
	args: exports,
      }),
    }));

    return jast.FunctionExpr({
      params: ["stdlib", "foreign", "buffer"],
      body: body,
    });
  };

  var translate = function(module, system, use_shared_memory) {
    var translator = new JSTranslator(use_shared_memory);
    translator.calcFuncInfo(module);
    return translator.systemWrapper(module, system, use_shared_memory, translator.processModule(module));
  };

  return {
    translate: translate,
  };
});
