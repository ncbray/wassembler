load("d8_common.js");

function compile(filename) {
  var status = new base.Status(function(message) {
    print(message);
  });
  var parser = base.createParser(sources.grammar, status);

  var text = read(filename);

  var module = base.frontend(sources.systemWASM, filename, text, parser, status);
  if (status.num_errors > 0) {
    return null;
  }

  module = desugar.process(module);

  var compiled = base.astToCompiledJS(module, sources.systemJS, {}, status);
  if (status.num_errors > 0) {
    return null;
  }
  // Generate binary encoding
  var buffer = wasm_backend_v8.generate(module);
  print("bytes:", new Uint8Array(buffer));
  print("num bytes:", buffer.byteLength);
  print();

  // Instantiate
  var foreign = {};
  var instanceJS = compiled(foreign);
  var instanceV8 = WASM.instantiateModule(buffer);

  print("JS result:", instanceJS.main());
  print("V8 result:", instanceV8.main());
}

if (arguments.length != 1) {
  print("Usage: d8 d8_main.js -- file.wasm");
  // TODO exit code.
} else {
  var filename = arguments[0];
  compile(filename);
}
