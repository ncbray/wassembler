var demo = {};

(function(exports) {

  var setupUI = function(parse) {
    var code = document.getElementById("code");
    code.value = "import hook() void;\nimport printI32(i32) void;\n\nfunc bar() i32 {\n  printI32(123);\n  return 3;\n}\n\nexport func main() i32 {\n  //comment\n  hook();\n  return (11 - 7) * bar();\n}";

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

  var externs = {
    hook: function() {
      appendTerminal("hook called.\n");
    },
    printI32: function(value) {
      appendTerminal("printI32: " + value + "\n");
    },
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
	  instance = compiled(externs);

	  // Run main.
	  appendTerminal("running main...\n\n");
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
  };
})(demo);
