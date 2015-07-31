define(["astutil"], function(astutil) {
  var binaryOpList = [
    "add",
    "sub",
    "mul",
    "div",
    "sdiv",
    "udiv",
    "srem",
    "urem",
    "and",
    "ior",
    "xor",
    "shl",
    "shr",
    "sar",
    "eq",
    "ne", // TODO eliminate this operation in the semantic pass?
    "lt",
    "le",
    "slt",
    "sle",
    "ult",
    "ule",
    "gt",
    "ge",
    "sgt",
    "sge",
    "ugt",
    "uge",
  ];

  // Eventually op names may map to enums, but for now keep them as strings.
  var binaryOps = {};
  for (var i = 0; i < binaryOpList.length; i++) {
    var op = binaryOpList[i];
    binaryOps[op] = op;
  }

  var binaryOpTable = [];
  var classifyBinaryOp = {};

  var classify = function(decl, left, right, result) {
    binaryOpTable.push({optype: left, op: decl.op, right: right, result: result, text: decl.text});
  };

  var classifySimple = function(table, types) {
    for (var i = 0; i < table.length; i++) {
      var decl = table[i];
      for (var j = 0; j < types.length; j++) {
	var t = types[j];
	classify(decl, t, t, t);
      }
    }
  };

  var classifyFixedResult = function(table, types, result) {
    for (var i = 0; i < table.length; i++) {
      var decl = table[i];
      for (var j = 0; j < types.length; j++) {
	var t = types[j];
	classify(decl, t, t, result);
      }
    }
  };

  // Declare facts about binary operators.
  var arithmeticOps = [
    {op: binaryOps.add, text: "+"},
    {op: binaryOps.sub, text: "-"},
    {op: binaryOps.mul, text: "*"},
  ];

  var floatArithmeticOps = [
    {op: binaryOps.div, text: "/"},
  ];

  // TODO signed vs unsigned.
  var intArithmeticOps = [
    {op: binaryOps.sdiv, text: "/"},
    {op: binaryOps.srem, text: "%"},
  ];

  var bitOps = [
    {op: binaryOps.and, text: "&"},
    {op: binaryOps.ior, text: "|"},
    {op: binaryOps.xor, text: "^"},
  ];

  var shiftOps = [
    {op: binaryOps.shl, text: "<<"},
    {op: binaryOps.shr, text: ">>"},
    {op: binaryOps.sar, text: ">>>"},
  ];

  var compareOps = [
    {op: binaryOps.eq, text: "=="},
    {op: binaryOps.ne, text: "!="},
  ];

  var floatCompareOps = [
    {op: binaryOps.lt, text: "<"},
    {op: binaryOps.le, text: "<="},
    {op: binaryOps.gt, text: ">"},
    {op: binaryOps.ge, text: ">="},
  ];

  // TODO signed vs. unsigned.
  var intCompareOps = [
    {op: binaryOps.slt, text: "<"},
    {op: binaryOps.sle, text: "<="},
    {op: binaryOps.sgt, text: ">"},
    {op: binaryOps.sge, text: ">="},
  ];

  // Derive lookup tables from the declarations.
  var arithmeticTypes = ["i8", "i16", "i32", "i64", "f32", "f64"];
  var intTypes = ["i8", "i16", "i32", "i64"];
  var smallIntTypes = ["i8", "i16", "i32"];
  var floatTypes = ["f32", "f64"];

  classifySimple(arithmeticOps, arithmeticTypes);
  classifySimple(floatArithmeticOps, floatTypes);
  classifySimple(intArithmeticOps, intTypes);
  classifySimple(bitOps, intTypes);
  classifySimple(shiftOps, intTypes);

  classifyFixedResult(compareOps, floatTypes, "i32");
  classifyFixedResult(floatCompareOps, floatTypes, "i32");

  classifyFixedResult(compareOps, smallIntTypes, "i32");
  classifyFixedResult(intCompareOps, smallIntTypes, "i32");

  classifyFixedResult(compareOps, ["i64"], "i64");
  classifyFixedResult(intCompareOps, ["i64"], "i64");

  var classifyBinaryOp = astutil.index(["text", "optype"], binaryOpTable);

  var compareOpLut = {
    eq: true,
    ne: true,
    lt: true,
    le: true,
    slt: true,
    sle: true,
    ult: true,
    ule: true,
    gt: true,
    ge: true,
    sgt: true,
    sge: true,
    ugt: true,
    uge: true,
  };

  var isCompareOp = function(op) {
    return op in compareOpLut;
  };

  var unary = astutil.makeASTBuilder([
    {
      name: "unary",
      fields: [
	{name: "optype"},
	{name: "op"},
	{name: "result"},
	{name: "prefix", defaultValue: null},
	{name: "intrinsicName", defaultValue: null},
      ],
    },
  ]).unary;

  var unaryOpTable = [
    unary({optype: "i32", op: "boolnot", result: "i32", prefix: "!"}),
    unary({optype: "i64", op: "boolnot", result: "i64", prefix: "!"}),
    unary({optype: "f32", op: "boolnot", result: "i32", prefix: "!"}),
    unary({optype: "f64", op: "boolnot", result: "i32", prefix: "!"}),
    unary({optype: "f32", op: "sqrt", result: "f32", intrinsicName: "sqrtF32"}),
    unary({optype: "f64", op: "sqrt", result: "f64", intrinsicName: "sqrtF64"}),
  ];

  var classifyPrefixOp = astutil.index(["prefix", "optype"], unaryOpTable);
  var classifyUnaryIntrinsic = astutil.index(["intrinsicName"], unaryOpTable);

  return {
    classifyPrefixOp: classifyPrefixOp,
    classifyUnaryIntrinsic: classifyUnaryIntrinsic,
    binaryOps: binaryOps,
    classifyBinaryOp: classifyBinaryOp,
    isCompareOp: isCompareOp,
  };
});