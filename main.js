define(
  ["base", "wasm/desugar", "v8/backend"],
  function(base, desugar, wasm_backend_v8) {

  var setupUI = function(code, parse) {
    setText("code", code);

    var reeval = function() {
      parse(getText("code"));
    };

    document.getElementById("eval").onclick = reeval;
    document.getElementById("show").onclick = updateVisibility;
    updateVisibility();
    reeval();
  };

  var updateVisibility = function() {
    var display = "none";
    if (document.getElementById("show").checked) {
      display = "inline-block";
    }
    document.getElementById("intermediate").style.display = display;
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

  var instance;

  var makeExterns = function() {
    var c = document.getElementById("canvas");
    var w = c.width;
    var h = c.height;
    var ctx = c.getContext("2d");
    var imageData = ctx.getImageData(0, 0, w, h);
    var dataI32 = new Int32Array(imageData.data.buffer);
    var dataI8 = new Int8Array(imageData.data.buffer);

    return {
      sqrtF32: function(value) {
	return Math.fround(Math.sqrt(value));
      },
      sqrtF64: function(value) {
	return Math.sqrt(value);
      },
      sinF32: function(value) {
	return Math.fround(Math.sin(value));
      },
      sinF64: function(value) {
	return Math.sin(value);
      },
      cosF32: function(value) {
	return Math.fround(Math.cos(value));
      },
      cosF64: function(value) {
	return Math.cos(value);
      },
      flipBuffer: function(ptr) {
	instance._copyOut(ptr, c.width * c.height * 4, dataI8);
	ctx.putImageData(imageData, 0, 0);
      },
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
  };

  //var exampleFile = "demos/example.wasm";
  var exampleFile = "demos/draw.wasm";

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

    module = desugar.process(module);

    var compiled = base.astToCompiledJS(module, status, reportSrc);
    if (status.num_errors > 0) {
      return null;
    }

    // Bind the module.
    try {
      instance = compiled(makeExterns());
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
