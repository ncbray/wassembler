var demo = {};

(function(exports) {
  var createModuleAST = function() {
    return wasm.Module({
      externs: [
	wasm.Extern({
	  args: ["f32"],
	  returnType: "void",
	}),
      ],
      funcs: [
	wasm.Function({
	  name: "bar",
	  argCount: 1,
	  returnType: "i32",
	  exportFunc: false,
	  locals: [
	    "i32",
	    "i32",
	  ],
	  body: [
	    wasm.Return({
	      expr: wasm.BinaryOp({
		left: wasm.ConstI32({value: 7}),
		op: "+",
		right: wasm.GetLocal({index: 0}),
	      }),
	    }),
	  ],
	}),
	wasm.Function({
	  name: "main",
	  argCount: 0,
	  returnType: "i32",
	  exportFunc: true,
	  locals: [
	  ],
	  body: [
	    wasm.CallExternal({
	      func: 0,
	      args: [
		wasm.ConstF32({value: 7.1}),
	      ]
	    }),
	    wasm.Return({
	      expr: wasm.BinaryOp({
		left: wasm.BinaryOp({
		  left: wasm.ConstI32({value: 2}),
		  op: "-",
		  right: wasm.ConstI32({value: 3}),
		}),
		op: "*",
		right: wasm.CallDirect({
		  func: 0,
		  args: [
		    wasm.ConstI32({value: 5}),
		  ],
		}),
	      }),
	    }),
	  ],
	}),
      ],
    });
  };

  var setupUI = function(parse) {
    var code = document.getElementById("code");
    code.value = "func bar() void {\n}\n\nexport func main() i32 {\n  return 1;\n}";

    var button = document.getElementById("eval");
    button.onclick = function() {
      parse(code.value);
    };

    parse(code.value);
  };

  var setAST = function(text) {
    document.getElementById("ast").value = text;
  };

  var appendAST = function(text) {
    document.getElementById("ast").value += text;
  };

  var setGenerated = function(text) {
    document.getElementById("generated").value = text;
  };

  var appendGenerated = function(text) {
    document.getElementById("generated").value += text;
  };

  var setTerminal = function(text) {
    document.getElementById("terminal").value = text;
  };

  var appendTerminal = function(text) {
    document.getElementById("terminal").value += text;
  };


  var createParser = function() {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.onload = function() {
	var parser = PEG.buildParser(req.response);
	resolve(parser);
      };
      req.open("get", "wasm.pegjs");
      req.send();
    });
  };

  var parse = function(parser, text) {
    return new Promise(function(resolve, reject) {
      try {
	resolve(parser.parse(text));
      } catch (e) {
	reject("ERROR " + e.line + ":" + e.column + " - " + e.message);
      }
    });
  };

  var runDemo = function() {
    var m = createModuleAST();

    // AST => JS
    var src = wasm.GenerateJS(m);
    appendGenerated(src);

    // Compile the module without binding it.
    var compiled = eval(src);

    // Bind the module.
    instance = compiled([
      function(arg) { appendTerminal("got external call: " + arg + "\n"); },
    ]);

    // Run main.
    var result = instance.main();
    appendTerminal("\nresult: " + result);

    demo.m = compiled;
  };

  var parser;

  exports.run = function() {
    createParser().then(function(p) {
      parser = p;
      setupUI(function(text) {
	// Clear the outputs.
	setAST("");
	setGenerated("");
	setTerminal("");

	parse(parser, text).then(function(parsed) {
	  setAST(JSON.stringify(parsed, null, "  "));

	  var src = wasm.GenerateJS(parsed);
	  setGenerated(src);

	  // Compile the module without binding it.
	  var compiled = eval(src);

          // Bind the module.
	  instance = compiled([
	    function(arg) { appendTerminal("got external call: " + arg + "\n"); },
	  ]);

	  // Run main.
	  try {
	    var result = instance.main();
	  } catch (e) {
	    appendTerminal("\nruntime error: " + e.message);
	    return
	  }
	  appendTerminal("\nresult: " + result);
	}, function(err) {
	  setAST(err);
	});
      });
    });

    //runDemo();
  };
})(demo);
