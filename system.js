var top = 0;
var system = {
  setTop: function(ptr) {
    top = ptr;
  },
  alloc: function(amt) {
    var temp = top;
    top += amt;
    return temp;
  },
};
