var system = {};

// Memory
var top = 0;
system.setTop = function(ptr) {
  top = ptr;
};
system.alloc = function(amt) {
  var temp = top;
  top += amt;
  return temp;
};

// Math
system.sqrtF32 = function(value) {
  return Math.fround(Math.sqrt(value));
};
system.sqrtF64 = function(value) {
  return Math.sqrt(value);
};
system.sinF32 = function(value) {
  return Math.fround(Math.sin(value));
};
system.sinF64 = function(value) {
  return Math.sin(value);
};
system.cosF32 = function(value) {
  return Math.fround(Math.cos(value));
};
system.cosF64 = function(value) {
  return Math.cos(value);
};
