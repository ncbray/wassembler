define(["base", "wasm/desugar", "v8/backend", "compiletests"], function(base, desugar, wasm_backend_v8, compiletests) {
  var parser = null;
  var systemJSSrc = null;
  var systemWASMSrc = null;

  var externs = {
    addI8: function(a, b) {
      return (a + b) << 24 >> 24;
    },
  };

  var createNormal = function(text, assert, suppress_v8) {
    var status = new base.Status(function(message) { assert.ok(false, message); });

    var ast = base.frontend(systemWASMSrc, "test", text, parser, status);
    assert.notEqual(ast, null, "frontend");

    ast = desugar.process(ast);

    var module = base.astToCompiledJS(ast, systemJSSrc, {}, status);
    assert.notEqual(module, null, "backend");

    if (!suppress_v8) {
      // Smoke test the V8 backend.
      wasm_backend_v8.generate(ast);
    }

    return module(externs);
  };

  var defineTests = function(mode_name, create) {
    for (var m = 0; m < compiletests.testDefinitions.length; m++) {
      var module = compiletests.testDefinitions[m];
      QUnit.module(mode_name + " " + module.name);
      for (var t = 0; t < module.tests.length; t++) {
	var test = module.tests[t];
	(function(test) {
	  QUnit.test(test.name, function(assert) {
	    var m = create(test.source, assert, !test.v8);
	    test.verify(m, assert);
	  });
	})(test);
      }
    }
  }

  defineTests("polyfill", createNormal);

  var run = function() {
    Promise.all([
      base.getURL("wasm.pegjs"),
      base.getURL("system.js"),
      base.getURL("system.wasm"),
    ]).then(function(values) {
      var status = new base.Status(function(message) { throw message; });
      parser = base.createParser(values[0], status);
      systemJSSrc = values[1];
      systemWASMSrc = values[2];
      QUnit.start();
    });
  };

  return {
    run: run,
  };
});