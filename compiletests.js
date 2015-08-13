define(["astutil"], function(astutil) {
  var testDefinitions = [];
  var currentModule = null;

  var compiletest = astutil.makeASTBuilder([
    {
      name: "compiletest",
      fields: [
	{name: "name"},
	{name: "source"},
	{name: "verify"},
	{name: "js", defaultValue: true},
	{name: "v8", defaultValue: true},
      ],
    },
  ]).compiletest;

  var module = function(name) {
    currentModule = {name: name, tests: []};
    testDefinitions.push(currentModule);
  };

  var test = function(args) {
    currentModule.tests.push(compiletest(args));
  };


  module("i8");

  test({
    name: "simple i8",
    source: "export func main() i8 {return i8(11);}",
    verify: function(m, assert) {
      assert.equal(m.main(), 11);
    },
  });

  test({
    name: "add i8",
    source: "export func main(a i8, b i8) i8 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7f, 0x7f), -2);
    },
  });

  module("i16");

  test({
    name: "simple i16",
    source: "export func main() i16 {return i16(11);}",
    verify: function(m, assert) {
      assert.equal(m.main(), 11);
    },
  });

  test({
    name: "add i16",
    source: "export func main(a i16, b i16) i16 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7fff, 0x7fff), -2)
      assert.equal(m.main(0x7fff, 1), -0x8000);
    },
  });

  module("i32");

  test({
    name: "simple i32",
    source: "export func main() i32 {return 11;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 11);
    },
  });

  test({
    name: "simple hex i32",
    source: "export func main() i32 {return 0x123456;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 1193046);
    },
  });

  test({
    name: "negate i32",
    source: "export func main(n i32) i32 {return -n;}",
    verify: function(m, assert) {
      assert.equal(m.main(11), -11);
      assert.equal(m.main(-7), 7);
    },
  });

  test({
    name: "add i32",
    source: "export func main(a i32, b i32) i32 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      assert.equal(m.main(0x7fffffff, 0x7fffffff), -2);
    },
  });

  test({
    name: "mul i32",
    source: "export func main(a i32, b i32) i32 {return a * b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 26);
      assert.equal(m.main(13, -2), -26);

      // These will fail if the multiplication is implemented as f64 * f64.
      assert.equal(m.main(0x7fffffff, 0x7fffffff), 1);
      assert.equal(m.main(0x7fffffff, -0x7fffffff), -1);
      assert.equal(m.main(-0x7fffffff, 0x7fffffff), -1);
      assert.equal(m.main(-0x7fffffff, -0x7fffffff), 1);
    },
  });

  test({
    name: "divide i32",
    source: "export func main(a i32, b i32) i32 {return a / b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 6);
      assert.equal(m.main(13, -2), -6);
    },
  });

  test({
    name: "lt i32",
    source: "export func main(a i32, b i32) i32 {return a < b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "le i32",
    source: "export func main(a i32, b i32) i32 {return a <= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "gt i32",
    source: "export func main(a i32, b i32) i32 {return a > b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "ge i32",
    source: "export func main(a i32, b i32) i32 {return a >= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "eq i32",
    source: "export func main(a i32, b i32) i32 {return a == b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "not eq i32",
    source: "export func main(a i32, b i32) i32 {return !(a == b);}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "ne i32",
    source: "export func main(a i32, b i32) i32 {return a != b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "not ne i32",
    source: "export func main(a i32, b i32) i32 {return !(a != b);}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "not i32",
    source: "export func main(n i32) i32 {return !n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 1);
      assert.equal(m.main(1), 0);
      assert.equal(m.main(2), 0);
      assert.equal(m.main(-1), 0);
    },
  });

  test({
    name: "not not i32",
    source: "export func main(n i32) i32 {return !!n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 0);
      assert.equal(m.main(1), 1);
      assert.equal(m.main(2), 1);
      assert.equal(m.main(-1), 1);
    },
  });

  module("i64");

  test({
    name: "simple i64",
    source: "export func main() i64 {return i64(11);}",
    verify: function(m, assert) {
      assert.equal(m.main(), 11);
    },
  });

  test({
    name: "simple hex i64",
    source: "export func main() i64 {return i64(0x12345678) * i64(0x10000) + i64(0x9abc);}",
    verify: function(m, assert) {
      assert.equal(m.main(), 20015998343868);
    },
  });

  test({
    name: "add i64",
    source: "export func main(a i64, b i64) i64 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 15);
      assert.equal(m.main(13, -2), 11);
      // TODO overflow behavior.
    },
  });

  test({
    name: "mul i64",
    source: "export func main(a i64, b i64) i64 {return a * b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 0x100000000), 0xd00000000);
      assert.equal(m.main(13, -2), -26);
      // TODO overflow behavior.
    },
  });

  test({
    name: "divide i64",
    source: "export func main(a i64, b i64) i64 {return a / b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 6);
      assert.equal(m.main(13, -2), -6);
    },
  });

  test({
    name: "lt i64",
    source: "export func main(a i64, b i64) i64 {return a < b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "le i64",
    source: "export func main(a i64, b i64) i64 {return a <= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "gt i64",
    source: "export func main(a i64, b i64) i64 {return a > b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "ge i64",
    source: "export func main(a i64, b i64) i64 {return a >= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "eq i64",
    source: "export func main(a i64, b i64) i64 {return a == b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "not eq i64",
    source: "export func main(a i64, b i64) i64 {return !(a == b);}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "ne i64",
    source: "export func main(a i64, b i64) i64 {return a != b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 1);
      assert.equal(m.main(5, 5), 0);
      assert.equal(m.main(2, 13), 1);
    },
  });

  test({
    name: "not ne i64",
    source: "export func main(a i64, b i64) i64 {return !(a != b);}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2), 0);
      assert.equal(m.main(5, 5), 1);
      assert.equal(m.main(2, 13), 0);
    },
  });

  test({
    name: "not i64",
    source: "export func main(n i64) i64 {return !n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 1);
      assert.equal(m.main(1), 0);
      assert.equal(m.main(2), 0);
      assert.equal(m.main(-1), 0);
    },
  });

  test({
    name: "not not i64",
    source: "export func main(n i64) i64 {return !!n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 0);
      assert.equal(m.main(1), 1);
      assert.equal(m.main(2), 1);
      assert.equal(m.main(-1), 1);
    },
  });

  module("f32");

  test({
    name: "simple f32",
    source: "export func main() f32 {return 11.5f;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 11.5);
    },
  });

  test({
    name: "negate f32",
    source: "export func main(n f32) f32 {return -n;}",
    verify: function(m, assert) {
      assert.equal(m.main(11.1), Math.fround(-11.1));
      assert.equal(m.main(-7.5), Math.fround(7.5));
    },
  });

  test({
    name: "add f32",
    source: "export func main(a f32, b f32) f32 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2.1), Math.fround(15.1));
      assert.equal(m.main(13, -2.1), Math.fround(10.9));
    },
  });

  test({
    name: "divide f32",
    source: "export func main(a f32, b f32) f32 {return a / b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2.1), Math.fround(13/2.1));
      assert.equal(m.main(13, -2.1), Math.fround(13/-2.1));
    },
  });

  test({
    name: "lt f32",
    source: "export func main(a f32, b f32) i32 {return a < b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7, 7.3), 1);
    },
  });

  test({
    name: "le f32",
    source: "export func main(a f32, b f32) i32 {return a <= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 1);
    },
  });

  test({
    name: "gt f32",
    source: "export func main(a f32, b f32) i32 {return a > b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "ge f32",
    source: "export func main(a f32, b f32) i32 {return a >= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "eq f32",
    source: "export func main(a f32, b f32) i32 {return a == b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "ne f32",
    source: "export func main(a f32, b f32) i32 {return a != b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7.1, 7.3), 1);
    },
  });

  test({
    name: "not f32",
    source: "export func main(n f32) i32 {return !n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 1);
      assert.equal(m.main(0.1), 0);
      assert.equal(m.main(2.3), 0);
      assert.equal(m.main(-1.7), 0);
    },
  });

  test({
    name: "not not f32",
    source: "export func main(n f32) i32 {return !!n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 0);
      assert.equal(m.main(0.1), 1);
      assert.equal(m.main(2.3), 1);
      assert.equal(m.main(-1.7), 1);
    },
  });

  test({
    name: "min f32",
    source: "export func main(a f32, b f32) f32 {return minF32(a, b);}",
    verify: function(m, assert) {
      assert.equal(m.main(1.1, 2.3), Math.fround(1.1));
      assert.equal(m.main(-1.1, 2.3), Math.fround(-1.1));
      assert.equal(m.main(1.1, -2.3), Math.fround(-2.3));
      assert.equal(m.main(-1.1, -2.3), Math.fround(-2.3));
    },
  });

  test({
    name: "max f32",
    source: "export func main(a f32, b f32) f32 {return maxF32(a, b);}",
    verify: function(m, assert) {
      assert.equal(m.main(1.1, 2.3), Math.fround(2.3));
      assert.equal(m.main(-1.1, 2.3), Math.fround(2.3));
      assert.equal(m.main(1.1, -2.3), Math.fround(1.1));
      assert.equal(m.main(-1.1, -2.3), Math.fround(-1.1));
    },
  });

  test({
    name: "sqrt f32",
    source: "export func main(n f32) f32 {return sqrtF32(n);}",
    verify: function(m, assert) {
      assert.equal(m.main(100), 10);
      assert.equal(m.main(2), Math.fround(Math.sqrt(2)));
      assert.equal(0, 0);
      assert.ok(isNaN(m.main(-1)));
    },
  });

  module("f64");

  test({
    name: "negate f64",
    source: "export func main(n f64) f64 {return -n;}",
    verify: function(m, assert) {
      assert.equal(m.main(11.1), -11.1);
      assert.equal(m.main(-7.5), 7.5);
    },
  });

  test({
    name: "add f64",
    source: "export func main(a f64, b f64) f64 {return a + b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2.1), 15.1);
      assert.equal(m.main(13, -2.1),10.9);
    },
  });

  test({
    name: "divide f64",
    source: "export func main(a f64, b f64) f64 {return a / b;}",
    verify: function(m, assert) {
      assert.equal(m.main(13, 2.1), 13/2.1);
      assert.equal(m.main(13, -2.1), 13/-2.1);
    },
  });

  test({
    name: "lt f64",
    source: "export func main(a f64, b f64) i32 {return a < b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7, 7.3), 1);
    },
  });

  test({
    name: "le f64",
    source: "export func main(a f64, b f64) i32 {return a <= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 1);
    },
  });

  test({
    name: "gt f64",
    source: "export func main(a f64, b f64) i32 {return a > b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "ge f64",
    source: "export func main(a f64, b f64) i32 {return a >= b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "eq f64",
    source: "export func main(a f64, b f64) i32 {return a == b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 0);
      assert.equal(m.main(7.2, 7.2), 1);
      assert.equal(m.main(7.1, 7.3), 0);
    },
  });

  test({
    name: "ne f64",
    source: "export func main(a f64, b f64) i32 {return a != b;}",
    verify: function(m, assert) {
      assert.equal(m.main(7.3, 7.1), 1);
      assert.equal(m.main(7.2, 7.2), 0);
      assert.equal(m.main(7.1, 7.3), 1);
    },
  });

  test({
    name: "not f64",
    source: "export func main(n f64) i32 {return !n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 1);
      assert.equal(m.main(0.1), 0);
      assert.equal(m.main(2.3), 0);
      assert.equal(m.main(-1.7), 0);
    },
  });

  test({
    name: "not not f64",
    source: "export func main(n f64) i32 {return !!n;}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 0);
      assert.equal(m.main(0.1), 1);
      assert.equal(m.main(2.3), 1);
      assert.equal(m.main(-1.7), 1);
    },
  });

  test({
    name: "min f64",
    source: "export func main(a f64, b f64) f64 {return minF64(a, b);}",
    verify: function(m, assert) {
      assert.equal(m.main(1.1, 2.3), 1.1);
      assert.equal(m.main(-1.1, 2.3), -1.1);
      assert.equal(m.main(1.1, -2.3), -2.3);
      assert.equal(m.main(-1.1, -2.3), -2.3);
    },
  });

  test({
    name: "max f64",
    source: "export func main(a f64, b f64) f64 {return maxF64(a, b);}",
    verify: function(m, assert) {
      assert.equal(m.main(1.1, 2.3), 2.3);
      assert.equal(m.main(-1.1, 2.3), 2.3);
      assert.equal(m.main(1.1, -2.3), 1.1);
      assert.equal(m.main(-1.1, -2.3), -1.1);
    },
  });

  test({
    name: "sqrt f64",
    source: "export func main(n f64) f64 {return sqrtF64(n);}",
    verify: function(m, assert) {
      assert.equal(m.main(100), 10);
      assert.equal(m.main(2), Math.sqrt(2));
      assert.equal(0, 0);
      assert.ok(isNaN(m.main(-1)));
    },
  });

  module("variables");

  test({
    name: "default",
    source: "export func main() i32 {var foo i32; return foo;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 0);
    },
  });

  test({
    name: "init",
    source: "export func main(n i32) i32 {var foo i32 = n * 2; return foo * 3;}",
    verify: function(m, assert) {
      assert.equal(m.main(5), 30);
    },
  });

  test({
    name: "assign",
    source: "export func main(n i32) i32 {var foo i32 = n; foo = foo * 2; return foo * 3;}",
    verify: function(m, assert) {
      assert.equal(m.main(5), 30);
    },
  });

  module("coercion");

  test({
    name: "i32 to i8",
    source: "export func main(n i32) i8 {return i8(n);}",
    verify: function(m, assert) {
      assert.equal(m.main(7), 7);
      assert.equal(m.main(-7), -7);
      assert.equal(m.main(128), -128);
    },
  });

  test({
    name: "i32 to f32",
    source: "export func amt(a i32, b i32) f32 {return f32(a) / f32(b);}",
    verify: function(m, assert) {
      assert.equal(m.amt(3, 15), Math.fround(0.2));
    },
  });

  test({
    name: "i32 to f64",
    source: "export func amt(a i32, b i32) f64 {return f64(a) / f64(b);}",
    verify: function(m, assert) {
      assert.equal(m.amt(3, 15), 0.2);
    },
  });

  test({
    name: "f32 to i8",
    source: "export func trunc(n f32) i8 {return i8(n);}",
    verify: function(m, assert) {
      assert.equal(m.trunc(-7.1), -7);
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
      assert.equal(m.trunc(256.1), 0);
      assert.equal(m.trunc(255.1), -1);
    },
  });

  test({
    name: "f32 to i32",
    source: "export func trunc(n f32) i32 {return i32(n);}",
    verify: function(m, assert) {
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
    },
  });

  test({
    name: "f32 to f64",
    source: "export func widen(n f32) f64 {return f64(n);}",
    verify: function(m, assert) {
      assert.equal(m.widen(0.1), Math.fround(0.1));
    },
  });

  test({
    name: "f64 to i32",
    source: "export func trunc(n f64) i32 {return i32(n);}",
    verify: function(m, assert) {
      assert.equal(m.trunc(7.1), 7);
      assert.equal(m.trunc(6.9), 6);
    },
  });

  test({
    name: "f64 to f32",
    source: "export func narrow(n f64) f32 {return f32(n);}",
    verify: function(m, assert) {
      assert.equal(m.narrow(0.1), Math.fround(0.1));
    },
  });

  module("memory");

  test({
    name: "i8",
    source: "memory {align 1; temp: zero 1;} export func main(n i8) i8 {storeI32(temp, n); return loadI8(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7), 7);
    },
  });

  test({
    name: "i8 init",
    source: "memory {align 1; table: hex 1234567890abcdef;} export func main(n i32) i8 {return loadI8(table + n);}",
    verify: function(m, assert) {
      assert.equal(m.main(0), 0x12);
      assert.equal(m.main(1), 0x34);
      assert.equal(m.main(2), 0x56);
      assert.equal(m.main(3), 0x78);
      assert.equal(m.main(4), 0x90 << 24 >> 24);
      assert.equal(m.main(5), 0xab << 24 >> 24);
      assert.equal(m.main(6), 0xcd << 24 >> 24);
      assert.equal(m.main(7), 0xef << 24 >> 24);
    },
  });

  test({
    name: "i8 string",
    source: 'memory {pre: string "foobar"; table: string "hello, \\"world\\""; post: string "bazbiz";} export func main(n i32) i8 {return loadI8(table + n);}',
    verify: function(m, assert) {
      var s = 'hello, "world"';
      for (var i = 0; i < s.length; i++) {
      assert.equal(m.main(i), s.charCodeAt(i));
      }
      assert.equal(m.main(s.length), 0);
    },
  });

  test({
    name: "i16",
    source: "memory {align 2; temp: zero 2;} export func main(n i16) i16 {storeI16(temp, n); return loadI16(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7), 7);
    },
  });

  test({
    name: "i32",
    source: "memory {align 4; temp: zero 4;} export func main(n i32) i32 {storeI32(temp, n); return loadI32(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7), 7);
    },
  });

  test({
    name: "f32",
    source: "memory {align 4; temp: zero 4;} export func main(n f32) f32 {storeF32(temp, n); return loadF32(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7.5), 7.5);
    },
  });

  test({
    name: "f64",
    source: "memory {align 8; temp: zero 8;} export func main(n f64) f64 {storeF64(temp, n); return loadF64(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7.5), 7.5);
    },
  });

  module("loops");

  test({
    name: "is_prime",
    source: "export func is_prime(n i32) i32 {if (n % 2 == 0) {return 0;} var d i32 = 3; while(d < n) { if (n % d == 0) {return 0;} d = d + 2;} return 1;}",
    verify: function(m, assert) {
      assert.equal(m.is_prime(2), 0);
      assert.equal(m.is_prime(3), 1);
      assert.equal(m.is_prime(4), 0);
      assert.equal(m.is_prime(5), 1);
      assert.equal(m.is_prime(6), 0);
      assert.equal(m.is_prime(7), 1);
      assert.equal(m.is_prime(8), 0);
      assert.equal(m.is_prime(9), 0);
      assert.equal(m.is_prime(97), 1);
    },
  });

  test({
    name: "double loop",
    source: "export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1;} value = value * (j + 1); j = j + 1;} return value;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 443884500);
    },
  });

  test({
    name: "double loop inner break",
    source: "export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1; if (i >= 5) {break inner;}} value = value * (j + 1); j = j + 1;} return value;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 98641000);
    },
  });

  test({
    name: "double loop outer break",
    source: "export func main() i32 {var j i32 = 0; var value i32 = 0; outer: while (j < 10) {var i i32 = 0; inner: while (i < 10) {value = value + i; i = i + 1; if (i >= 5) {break outer;}} value = value * (j + 1); j = j + 1;} return value;}",
    verify: function(m, assert) {
      assert.equal(m.main(), 10);
    },
  });

  module("function calls");

  test({
    name: "explicit void return",
    source: "export func main() void {return;}",
    verify: function(m, assert) {
      assert.equal(m.main(), undefined);
    },
  });

  test({
    name: "implicit void return",
    source: "export func main() void {}",
    verify: function(m, assert) {
      assert.equal(m.main(), undefined);
    },
  });

  test({
    name: "factorial",
    source: "export func fact(n i32) i32 {if (n <= 1) {return 1;} else {return n * fact(n - 1);}}",
    verify: function(m, assert) {
      assert.equal(m.fact(0), 1);
      assert.equal(m.fact(3), 3*2);
      assert.equal(m.fact(10), 10*9*8*7*6*5*4*3*2);
    },
  });

  test({
    name: "bitpack",
    source: "export func main(r i32, g i32, b i32, a i32) i32 {return (a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255);}",
    verify: function(m, assert) {
      assert.equal(m.main(0xff, 0xff, 0xff, 0xff)>>>0, 0xffffffff);
      assert.equal(m.main(0x112, 0x734, 0x656, 0x378)>>>0, 0x78563412);
    },
  });

  test({
    name: "imports",
    source: "import func addI8(i8, i8) i8;  export func main() i8 {return addI8(i8(120), i8(100));}",
    verify: function(m, assert) {
      assert.equal(m.main(), -36);
    },
  });

  test({
    name: "exports",
    source: "func foo(n f32) f32 {return n * 3.5f;} export func bar(n f32) f32 {return foo(n);}",
    verify: function(m, assert) {
      assert.notOk("foo" in m);
      assert.ok("bar" in m);
      assert.equal(m.bar(11), 38.5);
    },
  });

  test({
    name: "indirect",
    source: "func foo(n f32) f32 {return n * 3.5f;} export func bar(n f32) f32 {var f i32 = foo; return (f32)f32(f)(n);}",
    verify: function(m, assert) {
      assert.notOk("foo" in m);
      assert.ok("bar" in m);
      assert.equal(m.bar(11), 38.5);
    },
  });

  module("tls");

  test({
    name: "simple",
    source: "tls temp i32; export func main(n i32) i32 {temp = n; temp = temp + 1; return temp;}",
    verify: function(m, assert) {
      assert.equal(m.main(11), 12);
      assert.equal(m.main(-2), -1);
    },
    v8: false,
  });

  module("atomics");

  test({
    name: "load store i32",
    source: "memory {tempA: zero 4; tempB: zero 4;} export func main(a i32, b i32) i32 {atomicStoreI32(tempA, a); atomicStoreI32(tempB, b); return atomicLoadI32(tempA) - atomicLoadI32(tempB);}",
    verify: function(m, assert) {
      assert.equal(m.main(11, 4), 7);
      assert.equal(m.main(-10, 3), -13);
    },
  });

  test({
    name: "cmpxchg i32",
    source: "memory {temp: zero 4;} export func main(n i32) i32 {atomicStoreI32(temp, 7); var actual i32 = atomicCompareExchangeI32(temp, n, 11); return actual * atomicLoadI32(temp);}",
    verify: function(m, assert) {
      assert.equal(m.main(7), 77);
      assert.equal(m.main(11), 49);
    },
  });

  return {
    testDefinitions: testDefinitions,
  };
});