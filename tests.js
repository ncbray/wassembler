define(["base"], function(base) {
  var parser = null;

  var create = function(text, assert) {
    var status = new base.Status(function(message) { assert.ok(false, message); });

    var ast = base.frontend("test", text, parser, status);
    assert.notEqual(ast, null, "frontend");

    var module = base.astToCompiledJS(ast, status);
    assert.notEqual(module, null, "backend");

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

  QUnit.test("divide f32", function(assert) {
    var m = create("export func main(a f32, b f32) f32 {return a / b;}", assert);
    assert.equal(m.main(13, 2.1), Math.fround(13/2.1));
    assert.equal(m.main(13, -2.1), Math.fround(13/-2.1));
  });

  QUnit.test("divide f64", function(assert) {
    var m = create("export func main(a f64, b f64) f64 {return a / b;}", assert);
    assert.equal(m.main(13, 2.1), 13/2.1);
    assert.equal(m.main(13, -2.1), 13/-2.1);
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

  QUnit.module("function calls");

  QUnit.test("factorial", function(assert) {
    var m = create("export func fact(n i32) i32 {if (n <= 1) {return 1;} else {return n * fact(n - 1);}}", assert);
    assert.equal(m.fact(0), 1);
    assert.equal(m.fact(3), 3*2);
    assert.equal(m.fact(10), 10*9*8*7*6*5*4*3*2);
  });


  QUnit.test("exports", function(assert) {
    var m = create("func foo(n f32) i32 {return n * 3.5f;} export func bar(n f32) f32 {return foo(n);}", assert);
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