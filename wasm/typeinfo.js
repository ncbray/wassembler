define([], function() {
  var sizeOf = function(t) {
    switch (t) {
    case "i32":
      return 4;
    case "f32":
      return 4;
    case "f64":
      return 8;
    default:
      throw Error(t);
    }
  };

  return {
    sizeOf: sizeOf,
  };
});