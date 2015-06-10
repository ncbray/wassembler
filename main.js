var demo = {};

(function(exports) {
  exports.run = function() {
    var m = wasm.Module({
      funcs: [
	wasm.Function({
	  name: "foo",
	  args: [],
	  body: [
	    wasm.Return({
	      expr: wasm.BinaryOp({
		left: wasm.Const({value: 2}),
		op: "-",
		right: wasm.Const({value: 3}),
	      }),
	    }),
	  ],
	}),
      ],
    });
    var src = wasm.GenerateJS(m);
    var compiled = eval(src);
    console.log(compiled);
    console.log(compiled.foo());
  };
})(demo);
