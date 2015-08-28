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

var testCount = 0;
var jsTestPass = 0;
var jsTestFail = 0;
var v8TestPass = 0;
var v8TestFail = 0;

function makeAssert() {
  var assert = {
    equal: function(a, b) {
      if (a != b) {
        print ("        " + a + " != " + b);
        assert.num_errors += 1;
      }
    },
    ok: function(value) {
      if (!value) {
        print ("        " + "not ok");
        assert.num_errors += 1;
      }
    },
    notOk: function(value) {
      if (value) {
        print ("        " + "ok");
        assert.num_errors += 1;
      }
    },
    num_errors: 0,
  };
  return assert;
}

function runTest(test) {
  testCount += 1;
  var status = new base.Status(function(message) {
    print(message);
  });

  print("    common");
  var ast = base.frontend(sources.systemWASM, "test", test.source, parser, status);
  if (status.num_errors > 0) {
    haltTest();
  }
  ast = desugar.process(ast);

  if (test.js) {
    print("    JS");

    var moduleJS = base.astToCompiledJS(ast, sources.systemJS, {}, status);
    if (status.num_errors > 0) {
      haltTest();
    }

    var instanceJS = moduleJS(externs);
    var assert = makeAssert();
    test.verify(instanceJS, assert);
    if (assert.num_errors > 0) {
      jsTestFail += 1;
    } else {
      jsTestPass += 1;
    }
  }

  if (test.v8_encode) {
    print("    V8 encode");
    var buffer = wasm_backend_v8.generate(ast);
    if (test.v8_run) {
      print("    V8 run");
      WASM.verifyModule(buffer);
      var instanceV8 = WASM.instantiateModule(buffer, externs);
      var assert = makeAssert();
      test.verify(instanceV8, assert);
      if (assert.num_errors > 0) {
        v8TestFail += 1;
      } else {
        v8TestPass += 1;
      }
    }
  }
}

function main() {
  for (var m = 0; m < compiletests.testDefinitions.length; m++) {
    var module = compiletests.testDefinitions[m];
    for (var t = 0; t < module.tests.length; t++) {
      var test = module.tests[t];
      print(module.name + " / " + test.name);
      runTest(test);
    }
  }

  print();
  print(testCount, "tests");
  print("JS", jsTestPass, "pass,", jsTestFail, "fail");
  print("V8", v8TestPass, "pass,", v8TestFail, "fail");
}

main()
