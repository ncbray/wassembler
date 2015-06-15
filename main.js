var demo = {};

(function(exports) {

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

  var getURL = function(url) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.onload = function() {
	if (req.status == 200) {
	  resolve(req.response);
	} else {
	  reject(Error("getURL " + url + " - reponse " + req.status));
	}
      };
      req.onerror = function() {
	reject(Error("getURL " + url + " - network error"));
      };
      req.open("get", url);
      req.send();
    });
  };

  var syntaxError = function(prefix, e) {
    return new Error(prefix + " " + e.line + ":" + e.column + " - " + e.message);
  };

  var createParser = function(url) {
    return new Promise(function(resolve, reject) {
      getURL(url).then(function(grammar) {
	try {
	  var parser = PEG.buildParser(grammar);
	} catch (e) {
	  console.log(e);
	  reject(syntaxError(url, e));
	}
	resolve(parser);	
      }, function(err) {
	reject(err);
      });
    });
  };

  var parse = function(parser, text) {
    return new Promise(function(resolve, reject) {
      try {
	resolve(parser.parse(text));
      } catch (e) {
	reject(syntaxError("code", e));
      }
    });
  };

  var externs = {
    hook: function() {
      appendText("terminal", "hook called.\n");
    },
    printI32: function(value) {
      appendText("terminal", "printI32: " + value + "\n");
    },
  };

  var parser;

  var reevaluate = function(text) {
    // Clear the outputs.
    setText("ast", "");
    setText("generated", "");
    setText("terminal", "");

    parse(parser, text).then(function(parsed) {
      setText("ast", JSON.stringify(parsed, null, "  "));

      var module = semantic.processModule(parsed);

      var src = backend_js.generate(module);
      setText("generated", src);

      // Compile the module without binding it.
      try {
	var compiled = eval(src);
      } catch (e) {
	appendText("terminal", "compile error: " + e.message);
	return;
      }

      // Bind the module.
      try {
	instance = compiled(externs);
      } catch (e) {
	appendText("terminal", "binding error: " + e.message);
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
      var buffer = backend_v8.generate(module);
      console.log(new Uint8Array(buffer));
      console.log(buffer.byteLength);
    }, function(err) {
      setText("ast", err);
    });
  };

  exports.run = function() {
    Promise.all([
      createParser("wasm.pegjs"),
      getURL("example.wasm")
    ]).then(function(values) {
      parser = values[0];
      var code = values[1];
      setupUI(code, reevaluate);
    }, function(err){
      setText("code", err);
    });
  };
})(demo);
