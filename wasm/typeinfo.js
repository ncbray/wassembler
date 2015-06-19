define([], function() {
  var sizeOf = function(t) {
    switch (t) {
    case "i8":
      return 1;
    case "i16":
      return 2;
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