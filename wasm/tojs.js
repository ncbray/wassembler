define(["js/ast", "wasm/typeinfo"], function(jast, typeinfo) {
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

  var typeToArrayName = {};
  for (var i = 0; i < views.length; i++) {
    var view = views[i];
    typeToArrayName[view.type] = view.array_name;
  }

  var JSTranslator = function(use_shared_memory) {
    this.use_shared_memory = use_shared_memory;
  };

  JSTranslator.prototype.localName = function(local) {
    return local.name;
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
	name: this.localName(expr.local),
      });
    case "GetTls":
      return jast.GetName({
	name: this.tlsName(expr.tls),
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
      case "i32":
	switch (expr.op) {
	case "*":
	  translated = jast.Call({
	    expr: jast.GetName({
	      name: "imul",
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
    case "Loop":
      result.push(jast.While({
	cond: jast.GetName({name: "true"}),
	body: this.processBlock(stmt.body, []),
      }));
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

  JSTranslator.prototype.systemWrapper = function(module, system, use_shared_memory, generated) {
    var body = [];

    // The asm(ish) code.
    body.push(jast.VarDecl({
      name: "module",
      expr: generated,
    }));

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

    // JS System functions.
    body.push(jast.VarDecl({
      name: "threading_supported",
      expr: jast.ConstNum({value: use_shared_memory | 0}),
    }));
    body.push(jast.InjectSource({
      source: system,
    }));


    // Initialize memory.
    body = body.concat(this.initMemory(module));
    body.push(jast.Call({
      expr: jast.GetAttr({
	expr: jast.GetName({
	  name: "system",
	}),
	attr: "setTop",
      }),
      args: [
	jast.ConstNum({value: module.top}),
      ],
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
      name: "wrapped_foreign",
      expr: jast.CreateObject({
	args: wrapped_foreign,
      }),
    }));

    // Create an instance.
    body.push(jast.VarDecl({
      name: "instance",
      expr: jast.Call({
	expr: jast.GetName({name: "module"}),
	args: [
	  jast.GetName({name: "stdlib"}),
	  jast.GetName({name: "wrapped_foreign"}),
	  jast.GetName({name: "buffer"}),
	],
      }),
    }));


    // Export non-asm utility functions to JS.
    body.push(jast.Assign({
      target: jast.GetAttr({
	expr: jast.GetName({
	  name: "instance",
	}),
	attr: "_copyOut",
      }),
      value: jast.FunctionExpr({
	params: ["srcOff", "size", "dst", "dstOff"],
	body: [
	  jast.Call({
	    expr: jast.GetAttr({
	      expr: jast.New({
		expr: jast.GetName({
		  name: "Uint8Array",
		}),
		args: [
		  jast.GetName({name: "dst"}),
		  jast.GetName({name: "dstOff"}),
		  jast.GetName({name: "size"}),
		],
	      }),
	      attr: "set",
	    }),
	    args: [
	      jast.New({
		expr: jast.GetName({
		  name: this.arrayViewName("Uint8Array"),
		}),
		args: [
		  jast.GetName({name: "buffer"}),
		  jast.GetName({name: "srcOff"}),
		  jast.GetName({name: "size"}),
		],
	      }),
	    ],
	  }),
	],
      }),
    }));

    // Return the instance.
    body.push(jast.Return({
      expr: jast.GetName({name: "instance"}),
    }));

    return jast.FunctionExpr({
      params: ["foreign"],
      body: body,
    });
  };

  JSTranslator.prototype.initMemory = function(module) {
    var body = [];

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
    return body;
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

    body.push(jast.VarDecl({
      name: "fround",
      expr: jast.GetAttr({
	expr: jast.GetAttr({
	  expr: jast.GetName({
	    name: "stdlib",
	  }),
	  attr: "Math",
	}),
	attr: "fround",
      }),
    }));

    body.push(jast.VarDecl({
      name: "imul",
      expr: jast.GetAttr({
	expr: jast.GetAttr({
	  expr: jast.GetName({
	    name: "stdlib",
	  }),
	  attr: "Math",
	}),
	attr: "imul",
      }),
    }));

    // Foreign functions.
    for (var i = 0; i < module.externs.length; i++) {
      var extern = module.externs[i];
      body.push(jast.VarDecl({
	name: extern.name.text,
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
	name: v.name.text,
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
      params: ["stdlib", "foreign", "buffer"],
      body: body,
    });
  };

  var translate = function(module, system, use_shared_memory) {
    var translator = new JSTranslator(use_shared_memory);
    return translator.systemWrapper(module, system, use_shared_memory, translator.processModule(module));
  };

  return {
    translate: translate,
  };
});
