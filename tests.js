define(["base", "wasm/desugar", "v8/backend"], function(base, desugar, wasm_backend_v8) {
  var parser = null;

  var create = function(text, assert) {
    var status = new base.Status(function(message) { assert.ok(false, message); });

    var ast = base.frontend("test", text, parser, status);
    assert.notEqual(ast, null, "frontend");

    var module = base.astToCompiledJS(ast, status);
    assert.notEqual(module, null, "backend");

    // Smoke test the V8 backend.
    ast = desugar.process(ast, {simple_loops: true, canonicalize: true});
    wasm_backend_v8.generate(ast);

    return module({});
  };


  QUnit.module("numeric types");

  QUnit.test("simple i32", function(assert) {
    var m = create("export func main() i32 {return 11;}", assert);
    assert.equal(m.main(), 11);
  });

  QUnit.test("simple f32", function(assert) {
    var m = create("export func main() f32 {return 11.5f;}", assert);
    assert.equal(m.main(), 11.5);
  });

  QUnit.test("add i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a + b;}", assert);
    assert.equal(m.main(13, 2), 15);
    assert.equal(m.main(13, -2), 11);
  });

  QUnit.test("mul i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a * b;}", assert);
    assert.equal(m.main(13, 2), 26);
    assert.equal(m.main(13, -2), -26);

    // These will fail if the multiplication is implemented as f64 * f64.
    assert.equal(m.main(0x7fffffff, 0x7fffffff), 1);
    assert.equal(m.main(0x7fffffff, -0x7fffffff), -1);
    assert.equal(m.main(-0x7fffffff, 0x7fffffff), -1);
    assert.equal(m.main(-0x7fffffff, -0x7fffffff), 1);
  });

  QUnit.test("divide i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a / b;}", assert);
    assert.equal(m.main(13, 2), 6);
    assert.equal(m.main(13, -2), -6);
  });

  QUnit.test("lt i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a < b;}", assert);
    assert.equal(m.main(13, 2), 0);
    assert.equal(m.main(5, 5), 0);
    assert.equal(m.main(2, 13), 1);
  });

  QUnit.test("le i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a <= b;}", assert);
    assert.equal(m.main(13, 2), 0);
    assert.equal(m.main(5, 5), 1);
    assert.equal(m.main(2, 13), 1);
  });

  QUnit.test("gt i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a > b;}", assert);
    assert.equal(m.main(13, 2), 1);
    assert.equal(m.main(5, 5), 0);
    assert.equal(m.main(2, 13), 0);
  });

  QUnit.test("ge i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a >= b;}", assert);
    assert.equal(m.main(13, 2), 1);
    assert.equal(m.main(5, 5), 1);
    assert.equal(m.main(2, 13), 0);
  });

  QUnit.test("eq i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a == b;}", assert);
    assert.equal(m.main(13, 2), 0);
    assert.equal(m.main(5, 5), 1);
    assert.equal(m.main(2, 13), 0);
  });

  QUnit.test("ne i32", function(assert) {
    var m = create("export func main(a i32, b i32) i32 {return a != b;}", assert);
    assert.equal(m.main(13, 2), 1);
    assert.equal(m.main(5, 5), 0);
    assert.equal(m.main(2, 13), 1);
  });


  QUnit.test("add f32", function(assert) {
    var m = create("export func main(a f32, b f32) f32 {return a + b;}", assert);
    assert.equal(m.main(13, 2.1), Math.fround(15.1));
    assert.equal(m.main(13, -2.1), Math.fround(10.9));
  });

  QUnit.test("divide f32", function(assert) {
    var m = create("export func main(a f32, b f32) f32 {return a / b;}", assert);
    assert.equal(m.main(13, 2.1), Math.fround(13/2.1));
    assert.equal(m.main(13, -2.1), Math.fround(13/-2.1));
  });

  QUnit.test("lt f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a < b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7, 7.3), 1);
  });

  QUnit.test("le f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a <= b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 1);
  });

  QUnit.test("gt f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a > b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("ge f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a >= b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("eq f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a == b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("ne f32", function(assert) {
    var m = create("export func main(a f32, b f32) i32 {return a != b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7.1, 7.3), 1);
  });

  QUnit.test("add f64", function(assert) {
    var m = create("export func main(a f64, b f64) f64 {return a + b;}", assert);
    assert.equal(m.main(13, 2.1), 15.1);
    assert.equal(m.main(13, -2.1),10.9);
  });

  QUnit.test("divide f64", function(assert) {
    var m = create("export func main(a f64, b f64) f64 {return a / b;}", assert);
    assert.equal(m.main(13, 2.1), 13/2.1);
    assert.equal(m.main(13, -2.1), 13/-2.1);
  });

  QUnit.test("lt f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a < b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7, 7.3), 1);
  });

  QUnit.test("le f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a <= b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 1);
  });

  QUnit.test("gt f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a > b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("ge f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a >= b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("eq f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a == b;}", assert);
    assert.equal(m.main(7.3, 7.1), 0);
    assert.equal(m.main(7.2, 7.2), 1);
    assert.equal(m.main(7.1, 7.3), 0);
  });

  QUnit.test("ne f64", function(assert) {
    var m = create("export func main(a f64, b f64) i32 {return a != b;}", assert);
    assert.equal(m.main(7.3, 7.1), 1);
    assert.equal(m.main(7.2, 7.2), 0);
    assert.equal(m.main(7.1, 7.3), 1);
  });


  QUnit.module("variables");

  QUnit.test("default", function(assert) {
    var m = create("export func main() i32 {var foo i32; return foo;}", assert);
    assert.equal(m.main(), 0);
  });

  QUnit.test("init", function(assert) {
    var m = create("export func main(n i32) i32 {var foo i32 = n * 2; return foo * 3;}", assert);
    assert.equal(m.main(5), 30);
  });

  QUnit.test("assign", function(assert) {
    var m = create("export func main(n i32) i32 {var foo i32 = n; foo = foo * 2; return foo * 3;}", assert);
    assert.equal(m.main(5), 30);
  });

  QUnit.module("memory");

  QUnit.test("i32", function(assert) {
    var m = create("memory temp i32; export func main(n i32) i32 {storeI32(temp, n); return loadI32(temp);}", assert);
    assert.equal(m.main(7), 7);
  });

  QUnit.test("f32", function(assert) {
    var m = create("memory temp f32; export func main(n f32) f32 {storeF32(temp, n); return loadF32(temp);}", assert);
    assert.equal(m.main(7.5), 7.5);
  });

  QUnit.test("f64", function(assert) {
    var m = create("memory temp f64; export func main(n f64) f64 {storeF64(temp, n); return loadF64(temp);}", assert);
    assert.equal(m.main(7.5), 7.5);
  });

  QUnit.module("loops");

  QUnit.test("is_prime", function(assert) {
    var m = create("export func is_prime(n i32) i32 {if (n % 2 == 0) {return 0;} var d i32 = 3; while(d < n) { if (n % d == 0) {return 0;} d = d + 2;} return 1;}", assert);
    assert.equal(m.is_prime(2), 0);
    assert.equal(m.is_prime(3), 1);
    assert.equal(m.is_prime(4), 0);
    assert.equal(m.is_prime(5), 1);
    assert.equal(m.is_prime(6), 0);
    assert.equal(m.is_prime(7), 1);
    assert.equal(m.is_prime(8), 0);
    assert.equal(m.is_prime(9), 0);
    assert.equal(m.is_prime(97), 1);
  });


  QUnit.module("function calls");

  QUnit.test("factorial", function(assert) {
    var m = create("export func fact(n i32) i32 {if (n <= 1) {return 1;} else {return n * fact(n - 1);}}", assert);
    assert.equal(m.fact(0), 1);
    assert.equal(m.fact(3), 3*2);
    assert.equal(m.fact(10), 10*9*8*7*6*5*4*3*2);
  });


  QUnit.test("exports", function(assert) {
    var m = create("func foo(n f32) f32 {return n * 3.5f;} export func bar(n f32) f32 {return foo(n);}", assert);
    assert.notOk("foo" in m);
    assert.ok("bar" in m);
    assert.equal(m.bar(11), 38.5);
  });


  var run = function() {
    base.getURL("wasm.pegjs").then(function(text) {
      var status = new base.Status(function(message) { throw message; });
      parser = base.createParser(text, status);
      QUnit.start();
    });
  };

  return {
    run: run,
  };
});