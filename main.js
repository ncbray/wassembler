define(
  ['base', 'v8/backend'],
  function(base, wasm_backend_v8) {

  var setupUI = function(code, parse) {
    setText("code", code);

    var button = document.getElementById("eval");
    button.onclick = function() {
      parse(getText("code"));
    };
    button.onclick();
  };

  var getText = function(pane) {
    return document.getElementById(pane).value;
  };

  var setText = function(pane, text) {
    document.getElementById(pane).value = text;
  };

  var appendText = function(pane, text) {
    document.getElementById(pane).value += text;
  };

  var externs = {
    hook: function() {
      appendText("terminal", "hook called.\n");
    },
    printI32: function(value) {
      appendText("terminal", "printI32: " + value + "\n");
    },
    printF32: function(value) {
      appendText("terminal", "printF32: " + value + "\n");
    },
    printF64: function(value) {
      appendText("terminal", "printF64: " + value + "\n");
    },
  };

  var exampleFile = "example.wasm";

  var parser;

  var status = new base.Status(function(message) {
    appendText("terminal", message + "\n");
  });

  var reevaluate = function(text) {
    // Clear the outputs.
    setText("ast", "");
    setText("generated", "");
    setText("terminal", "");

    status = new base.Status(function(message) {
      appendText("terminal", message + "\n");
    });

    var reportAST = function(ast) {
      setText("ast", JSON.stringify(ast, null, "  "));
    };

    var reportSrc = function(src) {
      setText("generated", src);
    };

    var module = base.frontend(exampleFile, text, parser, status, reportAST);
    if (status.num_errors > 0) {
      return null;
    }

    var compiled = base.astToCompiledJS(module, status, reportSrc);
    if (status.num_errors > 0) {
      return null;
    }

    // Bind the module.
    try {
      instance = compiled(externs);
    } catch (e) {
      appendText("terminal", "running main...\n\n");
      return;
    }

    // Run main.
    appendText("terminal", "running main...\n\n");
    try {
      var result = instance.main();
    } catch (e) {
      appendText("terminal", "\nruntime error: " + e.message);
      return;
    }
    appendText("terminal", "\nresult: " + result);

    // Generate binary encoding
    var buffer = wasm_backend_v8.generate(module);
    console.log(new Uint8Array(buffer));
    console.log(buffer.byteLength);
  };

  var run = function() {
    Promise.all([
      base.getURL("wasm.pegjs"),
      base.getURL(exampleFile)
    ]).then(function(values) {
      status.setFilename("wasm.pegjs");
      parser = base.createParser(values[0], status);
      status.setFilename("");
      if (status.num_errors > 0) {
	return;
      }

      var code = values[1];
      setupUI(code, reevaluate);
    }, function(err){
      setText("code", err);
    });
  };

    return {run: run};
});
