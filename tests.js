define(["base", "wasm/desugar", "v8/backend"], function(base, desugar, wasm_backend_v8) {
  var parser = null;

  var externs = {
    addI8: function(a, b) {
      return (a + b) << 24 >> 24;
    },
  };

  var createNormal = function(text, assert) {
    var status = new base.Status(function(message) { assert.ok(false, message); });

    var ast = base.frontend("test", text, parser, status);
    assert.notEqual(ast, null, "frontend");

    ast = desugar.process(ast);

    var module = base.astToCompiledJS(ast, status);
    assert.notEqual(module, null, "backend");

    // Smoke test the V8 backend.
    wasm_backend_v8.generate(ast);

    return module(externs);
  };

  var defineTests = function(mode_name, create) {

    QUnit.module(mode_name + " basic i8");

    QUnit.test("simple i8", function(assert) {
      var m = create("export func main() i8 {return i8(11);}", assert);
      assert.equal(m.main(), 11);
    });

    QUnit.test("add i8", function(assert) {
      var m = create("export func main(a i8, b i8) i8 {return a + b;}", assert);
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7f, 0x7f), -2);
    });

    QUnit.module(mode_name + " basic i16");

    QUnit.test("simple i16", function(assert) {
      var m = create("export func main() i16 {return i16(11);}", assert);
      assert.equal(m.main(), 11);
    });

    QUnit.test("add i16", function(assert) {
      var m = create("export func main(a i16, b i16) i16 {return a + b;}", assert);
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7fff, 0x7fff), -2);
    });

    QUnit.module(mode_name + " basic i32");

    QUnit.test("simple i32", function(assert) {
      var m = create("export func main() i32 {return 11;}", assert);
      assert.equal(m.main(), 11);
    });

    QUnit.test("add i32", function(assert) {
      var m = create("export func main(a i32, b i32) i32 {return a + b;}", assert);
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7fffffff, 0x7fffffff), -2);
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

    QUnit.test("eq i32", function(assert) {
      var m = create("export func main(a i32, b i32) i32 {return !(a == b);}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("ne i32", function(assert) {
      var m = create("export func main(a i32, b i32) i32 {return a != b;}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("not ne i32", function(assert) {
      var m = create("export func main(a i32, b i32) i32 {return !(a != b);}", assert);
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    });

    QUnit.test("not i32", function(assert) {
      var m = create("export func main(n i32) i32 {return !n;}", assert);
      assert.equal(m.main(0), 1);
      assert.equal(m.main(1), 0);
      assert.equal(m.main(2), 0);
      assert.equal(m.main(-1), 0);
    });

    QUnit.test("not not i32", function(assert) {
      var m = create("export func main(n i32) i32 {return !!n;}", assert);
      assert.equal(m.main(0), 0);
      assert.equal(m.main(1), 1);
      assert.equal(m.main(2), 1);
      assert.equal(m.main(-1), 1);
    });

    QUnit.module(mode_name + " basic f32");

    QUnit.test("simple f32", function(assert) {
      var m = create("export func main() f32 {return 11.5f;}", assert);
      assert.equal(m.main(), 11.5);
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

    QUnit.module(mode_name + " basic f64");

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


    QUnit.module(mode_name + " variables");

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


    QUnit.module(mode_name + " coercion");

    QUnit.test("i32 to i8", function(assert) {
      var m = create("export func main(n i32) i8 {return i8(n);}", assert);
      assert.equal(m.main(7), 7);
      assert.equal(m.main(-7), -7);
      assert.equal(m.main(128), -128);
    });

    QUnit.test("i32 to f32", function(assert) {
      var m = create("export func amt(a i32, b i32) f32 {return f32(a) / f32(b);}", assert);
      assert.equal(m.amt(3, 15), Math.fround(0.2));
    });

    QUnit.test("i32 to f64", function(assert) {
      var m = create("export func amt(a i32, b i32) f64 {return f64(a) / f64(b);}", assert);
      assert.equal(m.amt(3, 15), 0.2);
    });

    QUnit.test("f32 to i8", function(assert) {
      var m = create("export func trunc(n f32) i8 {return i8(n);}", assert);
      assert.equal(m.trunc(-7.1), -7);
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
      assert.equal(m.trunc(256.1), 0);
      assert.equal(m.trunc(255.1), -1);
    });

    QUnit.test("f32 to i32", function(assert) {
      var m = create("export func trunc(n f32) i32 {return i32(n);}", assert);
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
    });

    QUnit.test("f32 to f64", function(assert) {
      var m = create("export func widen(n f32) f64 {return f64(n);}", assert);
      assert.equal(m.widen(0.1), Math.fround(0.1));
    });

    QUnit.test("f64 to i32", function(assert) {
      var m = create("export func trunc(n f64) i32 {return i32(n);}", assert);
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
    });

    QUnit.test("f64 to f32", function(assert) {
      var m = create("export func narrow(n f64) f32 {return f32(n);}", assert);
      assert.equal(m.narrow(0.1), Math.fround(0.1));
    });


    QUnit.module(mode_name + " memory");

    QUnit.test("i8", function(assert) {
      var m = create("memory temp 1 align 1; export func main(n i8) i8 {storeI32(temp, n); return loadI8(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("i16", function(assert) {
      var m = create("memory temp 2 align 2; export func main(n i16) i16 {storeI16(temp, n); return loadI16(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("i32", function(assert) {
      var m = create("memory temp 4 align 4; export func main(n i32) i32 {storeI32(temp, n); return loadI32(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("f32", function(assert) {
      var m = create("memory temp 4 align 4; export func main(n f32) f32 {storeF32(temp, n); return loadF32(temp);}", assert);
      assert.equal(m.main(7.5), 7.5);
    });

    QUnit.test("f64", function(assert) {
      var m = create("memory temp 8 align 8; export func main(n f64) f64 {storeF64(temp, n); return loadF64(temp);}", assert);
      assert.equal(m.main(7.5), 7.5);
    });

    QUnit.module(mode_name + " loops");

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


    QUnit.module(mode_name + " function calls");

    QUnit.test("void return", function(assert) {
      var m = create("export func main() void {return;}", assert);
      assert.equal(m.main(), undefined);

      var m = create("export func main() void {}", assert);
      assert.equal(m.main(), undefined);
    });

    QUnit.test("factorial", function(assert) {
      var m = create("export func fact(n i32) i32 {if (n <= 1) {return 1;} else {return n * fact(n - 1);}}", assert);
      assert.equal(m.fact(0), 1);
      assert.equal(m.fact(3), 3*2);
      assert.equal(m.fact(10), 10*9*8*7*6*5*4*3*2);
    });

    QUnit.test("bitpack", function(assert) {
      var m = create("export func main(r i32, g i32, b i32, a i32) i32 {return (a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255);}", assert);
      assert.equal(m.main(0xff, 0xff, 0xff, 0xff)>>>0, 0xffffffff);
      assert.equal(m.main(0x112, 0x734, 0x656, 0x378)>>>0, 0x78563412);
    });

    QUnit.test("imports", function(assert) {
      var m = create("import func addI8(i8, i8) i8;  export func main() i8 {return addI8(i8(120), i8(100));}", assert);
      assert.equal(m.main(), -36);
    });

    QUnit.test("exports", function(assert) {
      var m = create("func foo(n f32) f32 {return n * 3.5f;} export func bar(n f32) f32 {return foo(n);}", assert);
      assert.notOk("foo" in m);
      assert.ok("bar" in m);
      assert.equal(m.bar(11), 38.5);
    });
  };

  defineTests("polyfill", createNormal);

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