define(
  ["base", "wasm/desugar", "v8/backend"],
  function(base, desugar, wasm_backend_v8) {

  var queryDefaults = {
    file: "draw.wasm",
  };

  var parseQuery = function(defaults) {
    var raw = document.location.search.substring(1);
    var parts = raw.split("&");
    var query = {};
    for (var key in defaults) {
      query[key] = defaults[key];
    }
    for (var i = 0; i < parts.length; i++) {
      var keyvalue = parts[i].split("=");
      var key = decodeURIComponent(keyvalue[0]);
      var value = decodeURIComponent(keyvalue[1]);
      query[key] = value;
    }
    return query;
  };

  var sanitizeFileName = function(filename) {
    var parts = filename.split(".");
    var ext = parts.pop();
    var base = parts.join("_");
    base = base.replace(/\W+/g, '_');
    ext = ext.replace(/\W+/g, '_');
    if (base) {
      return base + "." + ext;
    } else {
      return ext;
    }
  };

  var setupUI = function(code, parse) {
    setText("code", code);

    var reeval = function() {
      parse(getText("code"));
    };

    document.getElementById("animate").onclick = pumpAnimation;
    document.getElementById("eval").onclick = reeval;
    document.getElementById("show").onclick = updateVisibility;
    document.getElementById("native").onclick = reeval;
    document.getElementById("shared_memory").onclick = reeval;

    document.getElementById("native").disabled = window.WASM === undefined;
    document.getElementById("shared_memory").disabled = window.SharedArrayBuffer === undefined;

    updateVisibility();
    reeval();
  };

  var last = 0;

  var pumpPending = false;
  var pumpAnimationWrapper = function() {
    pumpPending = false;
    pumpAnimation();
  }
  var pumpAnimation = function() {
    if (!pumpPending && document.getElementById("animate").checked && instance && instance.frame !== undefined) {
      if (last == 0) {
	last = Date.now();
      }
      var current = Date.now();
      var dt = (current - last) / 1000;
      last = current;
      instance.frame(dt);
      pumpPending = true;
      requestAnimationFrame(pumpAnimationWrapper);
    } else {
      last = 0;
    }
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

  var systemJSSrc;
  var systemWASMSrc;
  var instance = null;
  var srcURL = null;

  var makeExterns = function() {
    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
    var imageData = ctx.getImageData(0, 0, c.width, c.height);

    var externs = {
      flipBuffer: function(ptr) {
	var out = imageData.data.buffer;
	externs._instance._copyOut(ptr, out.byteLength, out, 0);
	ctx.putImageData(imageData, 0, 0);
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

      powF32: function(base, exponent) {
	return Math.fround(Math.pow(base, exponent));
      },
      sinF32: function(value) {
	return Math.fround(Math.sin(value));
      },
      cosF32: function(value) {
	return Math.fround(Math.cos(value));
      },
      powF64: function(base, exponent) {
	return Math.pow(base, exponent);
      },
      sinF64: function(value) {
	return Math.sin(value);
      },
      cosF64: function(value) {
	return Math.cos(value);
      },
    };
    return externs;
  };

  var exampleFile = null;

  var parser;

  var status = new base.Status(function(message) {
    appendText("terminal", message + "\n");
  });

  var reevaluate = function(text) {
    console.log("Re-evaluating.");
    var start = performance.now();
    // Clear the outputs.
    setText("ast", "");
    setText("generated", "");
    setText("terminal", "");

    instance = null;
    if (srcURL) {
      URL.revokeObjectURL(srcURL);
      srcURL = null;
    }

    status = new base.Status(function(message) {
      appendText("terminal", message + "\n");
    });

    var reportAST = function(ast) {
      //setText("ast", JSON.stringify(ast, null, "  "));
    };

    var reportSrc = function(src) {
      setText("generated", src);
    };

    var substart = performance.now();
    var module = base.frontend(systemWASMSrc, exampleFile, text, parser, status, reportAST);
    if (status.num_errors > 0) {
      return null;
    }

    module = desugar.process(module);
    console.log("front end", performance.now() - substart);


    var config = {
      //use_native: false,
      use_native: document.getElementById("native").checked,
      use_shared_memory: document.getElementById("shared_memory").checked,
    };

    var substart = performance.now();
    var src = base.astToJSSrc(module, systemJSSrc, config);
    console.log("gen JS", performance.now() - substart);

    if (reportSrc) reportSrc(src);

    var substart = performance.now();
    var compiled = base.evalJSSrc(src, status);
    if (status.num_errors > 0) {
      return null;
    }
    console.log("eval JS", performance.now() - substart);

    // Generate binary encoding
    var substart = performance.now();
    var buffer = wasm_backend_v8.generate(module);
    //console.log(new Uint8Array(buffer));
    //console.log(buffer.byteLength);
    console.log("gen v8", performance.now() - substart);

    var externs = makeExterns();

    console.log("total compile time", performance.now() - start);

    if (config.use_native) {
      var start = performance.now();
      instance = WASM.instantiateModule(buffer, externs);
      console.log("instantiate time", performance.now() - start);

      instance._copyOut = function(srcOff, size, dst, dstOff) {
	var buffer = instance.memory;
	var end = srcOff + size;
	if (end < srcOff || srcOff > buffer.byteLength || srcOff < 0 || end > buffer.byteLength || end < 0) {
	  throw Error("Range [" + srcOff + ", " + end + ") is out of bounds. [0, " + buffer.byteLength + ")");
	}
	new Uint8Array(dst, dstOff, size).set(new Uint8Array(buffer, srcOff, size));
      };
    } else {
      if (config.use_shared_memory) {
	srcURL = URL.createObjectURL(new Blob([src], {type: 'text/javascript'}));
      }

      // Bind the module.
      try {
	var start = performance.now();
	instance = compiled(externs, srcURL);
        console.log("instantiate time", performance.now() - start);
      } catch (e) {
	appendText("terminal", "binding failed - " + e.message);
	return;
      }
    }
    externs._instance = instance;

    // Run main.
    appendText("terminal", "running main...\n\n");
    try {
      var start = performance.now();
      var result = instance.main();
      console.log("main time", performance.now() - start);
    } catch (e) {
      appendText("terminal", "\nruntime error: " + e.message);
      return;
    }
    appendText("terminal", "\nresult: " + result);

    pumpAnimation();
  };

  var run = function() {
    var query = parseQuery(queryDefaults);
    exampleFile = "demos/" + sanitizeFileName(query.file);

    Promise.all([
      base.getURL("wasm.pegjs"),
      base.getURL(exampleFile),
      base.getURL("system.js"),
      base.getURL("system.wasm"),
    ]).then(function(values) {
      status.setFilename("wasm.pegjs");
      parser = base.createParser(values[0], status);
      status.setFilename("");
      if (status.num_errors > 0) {
	return;
      }

      var code = values[1];
      systemJSSrc = values[2];
      systemWASMSrc = values[3];
      setupUI(code, reevaluate);
    }, function(err){
      setText("code", err);
    });
  };

    return {run: run};
});
