load("d8_common.js");


var status = new base.Status(function(message) {
  throw Error(message);
});
var parser = base.createParser(sources.grammar, status);


var compiletests = resolve("compiletests");

function haltTest() {
  throw Error("halt test");
}

var externs = {
  addI8: function(a, b) {
    return (a + b) << 24 >> 24;
  },
};

function runTest(testmodule, test) {
  var status = new base.Status(function(message) {
    print(message);
  });

  print(testmodule.name + " / " + test.name);
  print("    common");
  var ast = base.frontend(sources.systemWASM, "test", test.source, parser, status);
  if (status.num_errors > 0) {
    haltTest();
  }
  ast = desugar.process(ast);

  var assert = {
    equal: function(a, b) {
      if (a != b) {
	print (a + " != " + b);
	assert.num_errors += 1;
      }
    },
    ok: function(value) {
      if (!value) {
	print ("not ok");
	assert.num_errors += 1;
      }
    },
    notOk: function(value) {
      if (value) {
	print ("ok");
	assert.num_errors += 1;
      }
    },
    num_errors: 0,
  };

  if (test.js) {
    print("    JS");

    var moduleJS = base.astToCompiledJS(ast, sources.systemJS, {}, status);
    if (status.num_errors > 0) {
      haltTest();
    }

    var instanceJS = moduleJS(externs);
    test.verify(instanceJS, assert);
    if (assert.num_errors > 0) {
      haltTest();
    }
  }

  if (test.v8) {
    print("    V8");
    var buffer = wasm_backend_v8.generate(ast);
    WASM.verifyModule(buffer);
    //var instanceV8 = WASM.instantiateModule(buffer);
  }
}

function main() {
  for (var m = 0; m < compiletests.testDefinitions.length; m++) {
    var module = compiletests.testDefinitions[m];
    for (var t = 0; t < module.tests.length; t++) {
      var test = module.tests[t];
      runTest(module, test);
    }
  }
}

main()