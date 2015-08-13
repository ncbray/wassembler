if (!this.WASM) {
  throw "You need to patch v8 to support WASM.";
}

// Minimal require.js polyfill for d8.
var cache = {};
var resolving = null;

function resolve(name) {
  if (name in cache) {
    return cache[name];
  }
  cache[name] = {};
  resolving = name;
  load(name + ".js");
  return cache[name];
}

function define(deps, module) {
  var name = resolving;
  var resolved = [];
  for (var i = 0; i < deps.length; i++) {
    resolved.push(resolve(deps[i]));
  }
  var result = module.apply(module, resolved);
  cache[name] = result;
}

load("third_party/peg-0.8.0.js");

// Run the assembler.
var base = resolve("base");
var desugar = resolve("wasm/desugar");
var wasm_backend_v8 = resolve("v8/backend");

var sources = {
  grammar: read("wasm.pegjs"),
  systemWASM: read("d8_system.wasm"),
  systemJS: read("system.js"),
};
