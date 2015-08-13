define(["base", "wasm/desugar", "v8/backend"], function(base, desugar, wasm_backend_v8) {
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
      assert.equal(m.main(0x7fff, 0x7fff), -2)
      assert.equal(m.main(0x7fff, 1), -0x8000);
    });

    QUnit.module(mode_name + " basic i32");

    QUnit.test("simple i32", function(assert) {
      var m = create("export func main() i32 {return 11;}", assert);
      assert.equal(m.main(), 11);
    });

    QUnit.test("simple hex", function(assert) {
      var m = create("export func main() i32 {return 0x123456;}", assert);
      assert.equal(m.main(), 1193046);
    });

    QUnit.test("negate i32", function(assert) {
      var m = create("export func main(n i32) i32 {return -n;}", assert);
      assert.equal(m.main(11), -11);
      assert.equal(m.main(-7), 7);
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

    QUnit.test("not eq i32", function(assert) {
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

    QUnit.module(mode_name + " basic i64");

    QUnit.test("simple i64", function(assert) {
      var m = create("export func main() i64 {return i64(11);}", assert);
      assert.equal(m.main(), 11);
    });

    QUnit.test("simple hex", function(assert) {
      // TODO i64 constants.
      var m = create("export func main() i64 {return i64(0x12345678) * i64(0x10000) + i64(0x9abc);}", assert);
      assert.equal(m.main(), 20015998343868);
    });

    QUnit.test("add i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a + b;}", assert);
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      // TODO overflow behavior.
    });

    QUnit.test("mul i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a * b;}", assert);
      assert.equal(m.main(13, 0x100000000), 0xd00000000);
      assert.equal(m.main(13, -2), -26);
      // TODO overflow behavior.
    });

    QUnit.test("divide i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a / b;}", assert);
      assert.equal(m.main(13, 2), 6);
      assert.equal(m.main(13, -2), -6);
    });

    QUnit.test("lt i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a < b;}", assert);
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("le i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a <= b;}", assert);
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("gt i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a > b;}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 0);
    });

    QUnit.test("ge i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a >= b;}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    });

    QUnit.test("eq i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a == b;}", assert);
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    });

    QUnit.test("not eq i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return !(a == b);}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("ne i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return a != b;}", assert);
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    });

    QUnit.test("not ne i64", function(assert) {
      var m = create("export func main(a i64, b i64) i64 {return !(a != b);}", assert);
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    });

    QUnit.test("not i64", function(assert) {
      var m = create("export func main(n i64) i64 {return !n;}", assert);
      assert.equal(m.main(0), 1);
      assert.equal(m.main(1), 0);
      assert.equal(m.main(2), 0);
      assert.equal(m.main(-1), 0);
    });

    QUnit.test("not not i64", function(assert) {
      var m = create("export func main(n i64) i64 {return !!n;}", assert);
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

    QUnit.test("negate f32", function(assert) {
      var m = create("export func main(n f32) f32 {return -n;}", assert);
      assert.equal(m.main(11.1), Math.fround(-11.1));
      assert.equal(m.main(-7.5), Math.fround(7.5));
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

    QUnit.test("not f32", function(assert) {
      var m = create("export func main(n f32) i32 {return !n;}", assert);
      assert.equal(m.main(0), 1);
      assert.equal(m.main(0.1), 0);
      assert.equal(m.main(2.3), 0);
      assert.equal(m.main(-1.7), 0);
    });

    QUnit.test("not not f32", function(assert) {
      var m = create("export func main(n f32) i32 {return !!n;}", assert);
      assert.equal(m.main(0), 0);
      assert.equal(m.main(0.1), 1);
      assert.equal(m.main(2.3), 1);
      assert.equal(m.main(-1.7), 1);
    });

    QUnit.test("min f32", function(assert) {
      var m = create("export func main(a f32, b f32) f32 {return minF32(a, b);}", assert);
      assert.equal(m.main(1.1, 2.3), Math.fround(1.1));
      assert.equal(m.main(-1.1, 2.3), Math.fround(-1.1));
      assert.equal(m.main(1.1, -2.3), Math.fround(-2.3));
      assert.equal(m.main(-1.1, -2.3), Math.fround(-2.3));
    });

    QUnit.test("max f32", function(assert) {
      var m = create("export func main(a f32, b f32) f32 {return maxF32(a, b);}", assert);
      assert.equal(m.main(1.1, 2.3), Math.fround(2.3));
      assert.equal(m.main(-1.1, 2.3), Math.fround(2.3));
      assert.equal(m.main(1.1, -2.3), Math.fround(1.1));
      assert.equal(m.main(-1.1, -2.3), Math.fround(-1.1));
    });

    QUnit.test("sqrt f32", function(assert) {
      var m = create("export func main(n f32) f32 {return sqrtF32(n);}", assert);
      assert.equal(m.main(100), 10);
      assert.equal(m.main(2), Math.fround(Math.sqrt(2)));
      assert.equal(0, 0);
      assert.ok(isNaN(m.main(-1)));
    });


    QUnit.module(mode_name + " basic f64");

    QUnit.test("negate f64", function(assert) {
      var m = create("export func main(n f64) f64 {return -n;}", assert);
      assert.equal(m.main(11.1), -11.1);
      assert.equal(m.main(-7.5), 7.5);
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

    QUnit.test("not f64", function(assert) {
      var m = create("export func main(n f64) i32 {return !n;}", assert);
      assert.equal(m.main(0), 1);
      assert.equal(m.main(0.1), 0);
      assert.equal(m.main(2.3), 0);
      assert.equal(m.main(-1.7), 0);
    });

    QUnit.test("not not f64", function(assert) {
      var m = create("export func main(n f64) i32 {return !!n;}", assert);
      assert.equal(m.main(0), 0);
      assert.equal(m.main(0.1), 1);
      assert.equal(m.main(2.3), 1);
      assert.equal(m.main(-1.7), 1);
    });

    QUnit.test("min f64", function(assert) {
      var m = create("export func main(a f64, b f64) f64 {return minF64(a, b);}", assert);
      assert.equal(m.main(1.1, 2.3), 1.1);
      assert.equal(m.main(-1.1, 2.3), -1.1);
      assert.equal(m.main(1.1, -2.3), -2.3);
      assert.equal(m.main(-1.1, -2.3), -2.3);
    });

    QUnit.test("max f64", function(assert) {
      var m = create("export func main(a f64, b f64) f64 {return maxF64(a, b);}", assert);
      assert.equal(m.main(1.1, 2.3), 2.3);
      assert.equal(m.main(-1.1, 2.3), 2.3);
      assert.equal(m.main(1.1, -2.3), 1.1);
      assert.equal(m.main(-1.1, -2.3), -1.1);
    });

    QUnit.test("sqrt f64", function(assert) {
      var m = create("export func main(n f64) f64 {return sqrtF64(n);}", assert);
      assert.equal(m.main(100), 10);
      assert.equal(m.main(2), Math.sqrt(2));
      assert.equal(0, 0);
      assert.ok(isNaN(m.main(-1)));
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
      var m = create("memory {align 1; temp: zero 1;} export func main(n i8) i8 {storeI32(temp, n); return loadI8(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("i8 init", function(assert) {
      var m = create("memory {align 1; table: hex 1234567890abcdef;} export func main(n i32) i8 {return loadI8(table + n);}", assert);
      assert.equal(m.main(0), 0x12);
      assert.equal(m.main(1), 0x34);
      assert.equal(m.main(2), 0x56);
      assert.equal(m.main(3), 0x78);
      assert.equal(m.main(4), 0x90 << 24 >> 24);
      assert.equal(m.main(5), 0xab << 24 >> 24);
      assert.equal(m.main(6), 0xcd << 24 >> 24);
      assert.equal(m.main(7), 0xef << 24 >> 24);
    });

    QUnit.test("i8 string", function(assert) {
      var m = create('memory {pre: string "foobar"; table: string "hello, \\"world\\""; post: string "bazbiz";} export func main(n i32) i8 {return loadI8(table + n);}', assert);
      var s = 'hello, "world"';
      for (var i = 0; i < s.length; i++) {
        assert.equal(m.main(i), s.charCodeAt(i));
      }
      assert.equal(m.main(s.length), 0);
    });

    QUnit.test("i16", function(assert) {
      var m = create("memory {align 2; temp: zero 2;} export func main(n i16) i16 {storeI16(temp, n); return loadI16(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("i32", function(assert) {
      var m = create("memory {align 4; temp: zero 4;} export func main(n i32) i32 {storeI32(temp, n); return loadI32(temp);}", assert);
      assert.equal(m.main(7), 7);
    });

    QUnit.test("f32", function(assert) {
      var m = create("memory {align 4; temp: zero 4;} export func main(n f32) f32 {storeF32(temp, n); return loadF32(temp);}", assert);
      assert.equal(m.main(7.5), 7.5);
    });

    QUnit.test("f64", function(assert) {
      var m = create("memory {align 8; temp: zero 8;} export func main(n f64) f64 {storeF64(temp, n); return loadF64(temp);}", assert);
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

    QUnit.test("double loop", function(assert) {
      var m = create("export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1;} value = value * (j + 1); j = j + 1;} return value;}", assert);
      assert.equal(m.main(), 443884500);
    });

    QUnit.test("double loop inner break", function(assert) {
      var m = create("export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1; if (i >= 5) {break inner;}} value = value * (j + 1); j = j + 1;} return value;}", assert);
      assert.equal(m.main(), 98641000);
    });

    QUnit.test("double loop outer break", function(assert) {
      var m = create("export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1; if (i >= 5) {break outer;}} value = value * (j + 1); j = j + 1;} return value;}", assert);
      assert.equal(m.main(), 10);
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

    QUnit.test("indirect", function(assert) {
      var m = create("func foo(n f32) f32 {return n * 3.5f;} export func bar(n f32) f32 {var f i32 = foo; return (f32)f32(f)(n);}", assert);
      assert.notOk("foo" in m);
      assert.ok("bar" in m);
      assert.equal(m.bar(11), 38.5);
    });

    QUnit.module(mode_name + " tls");

    QUnit.test("simple", function(assert) {
      // HACK suppress the v8 backend.
      var m = create("tls temp i32; export func main(n i32) i32 {temp = n; temp = temp + 1; return temp;}", assert, true);
      assert.equal(m.main(11), 12);
      assert.equal(m.main(-2), -1);
    });

    QUnit.module(mode_name + " atomics");

    QUnit.test("load store i32", function(assert) {
      var m = create("memory {tempA: zero 4; tempB: zero 4;} export func main(a i32, b i32) i32 {atomicStoreI32(tempA, a); atomicStoreI32(tempB, b); return atomicLoadI32(tempA) - atomicLoadI32(tempB);}", assert);
      assert.equal(m.main(11, 4), 7);
      assert.equal(m.main(-10, 3), -13);
    });

    QUnit.test("cmpxchg i32", function(assert) {
      var m = create("memory {temp: zero 4;} export func main(n i32) i32 {atomicStoreI32(temp, 7); var actual i32 = atomicCompareExchangeI32(temp, n, 11); return actual * atomicLoadI32(temp);}", assert);
      assert.equal(m.main(7), 77);
      assert.equal(m.main(11), 49);
    });
  };

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