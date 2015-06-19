define(
  ["base", "wasm/desugar", "v8/backend"],
  function(base, desugar, wasm_backend_v8) {

  var setupUI = function(code, parse) {
    setText("code", code);

    var reeval = function() {
      parse(getText("code"), document.getElementById("desugar").checked);
    };

    document.getElementById("eval").onclick = reeval;
    document.getElementById("desugar").onclick = reeval;

    reeval();
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

  var reevaluate = function(text, early_desugar) {
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

    var doDesugar = function() {
      module = desugar.process(module, {simple_loops: true});
    }

    if (early_desugar) {
      doDesugar();
    }

    var compiled = base.astToCompiledJS(module, status, reportSrc);
    if (status.num_errors > 0) {
      return null;
    }

    // Bind the module.
    try {
      instance = compiled(externs);
    } catch (e) {
      appendText("terminal", "binding failed - " + e.message);
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

    if (!early_desugar) {
      doDesugar();
    }

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
