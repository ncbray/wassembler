define([], function() {
  var sizeOf = function(t) {
    switch (t) {
    case "i32":
      return 4;
    default:
      throw Error(t);
    }
  };

  return {
    sizeOf: sizeOf,
  };
});