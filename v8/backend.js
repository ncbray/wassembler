define(["compilerutil", "wasm/ast"], function(compilerutil, wast) {
  var types = {
    "void": 0,
    "i32": 1,
    "f32": 2,
    "f64": 3,
  };

  var mem_types = {
    "i8": 0,
    "u8": 1,
    "i16": 2,
    "u16": 3,
    "i32": 4,
    "u32": 5,
    "f32": 6,
    "f64": 7,
  };

  var ops = {
    setlocal: {bytecode: 0x01},

    setheap: {bytecode: 0x03},
    if1: {bytecode: 0x04},
    if2: {bytecode: 0x05},
    block: {bytecode: 0x06},
    loop: {bytecode: 0x09},
    break_: {bytecode: 0x0b},
    ret: {bytecode: 0x0c},

    i8const: {bytecode: 0x10},
    i32const: {bytecode: 0x11},
    f64const: {bytecode: 0x12},
    f32const: {bytecode: 0x13},

    getlocal: {bytecode: 0x14},

    getheap: {bytecode: 0x16},
    callfunc: {bytecode: 0x17},

    not: {bytecode: 0x1b},

    i32add: {bytecode: 0x20},
    i32sub: {bytecode: 0x21},
    i32mul: {bytecode: 0x22},
    i32div: {bytecode: 0x23},
    u32div: {bytecode: 0x24},
    i32mod: {bytecode: 0x25},
    u32mod: {bytecode: 0x26},

    i32and: {bytecode: 0x27},
    i32ior: {bytecode: 0x28},
    i32xor: {bytecode: 0x29},

    i32shl: {bytecode: 0x2a},
    i32shr: {bytecode: 0x2b},
    i32sar: {bytecode: 0x2c},

    i32eq: {bytecode: 0x2d},
    i32lt: {bytecode: 0x2e},
    i32le: {bytecode: 0x2f},
    u32lt: {bytecode: 0x30},
    u32le: {bytecode: 0x31},

    f64add: {bytecode: 0x40},
    f64sub: {bytecode: 0x41},
    f64mul: {bytecode: 0x42},
    f64div: {bytecode: 0x43},
    f64mod: {bytecode: 0x44},

    f64eq: {bytecode: 0x45},
    f64lt: {bytecode: 0x46},
    f64le: {bytecode: 0x47},

    f32add: {bytecode: 0x50},
    f32sub: {bytecode: 0x51},
    f32mul: {bytecode: 0x52},
    f32div: {bytecode: 0x53},
    f32mod: {bytecode: 0x54},

    f32eq: {bytecode: 0x55},
    f32lt: {bytecode: 0x56},
    f32le: {bytecode: 0x57},

    i32fromf32: {bytecode: 0x60},
    i32fromf64: {bytecode: 0x61},
    u32fromf32: {bytecode: 0x62},
    u32fromf64: {bytecode: 0x63},
    f64fromi32: {bytecode: 0x64},
    f64fromu32: {bytecode: 0x65},
    f64fromf32: {bytecode: 0x66},
    f32fromi32: {bytecode: 0x67},
    f32fromu32: {bytecode: 0x68},
    f32fromf64: {bytecode: 0x69},
  };

  var binOpMap = {
    "i32": {
      "+": ops.i32add,
      "-": ops.i32sub,
      "*": ops.i32mul,
      "/": ops.i32div,
      "%": ops.i32div,

      "&": ops.i32and,
      "|": ops.i32ior,
      "^": ops.i32xor,

      "<<": ops.i32shl,
      ">>>": ops.i32shr,
      ">>": ops.i32sar,

      "==": ops.i32eq,
      "<": ops.i32lt,
      "<=": ops.i32le,
    },

    "f32": {
      "+": ops.f32add,
      "-": ops.f32sub,
      "*": ops.f32mul,
      "/": ops.f32div,
      "%": ops.f32div,
      "==": ops.f32eq,
      "<": ops.f32lt,
      "<=": ops.f32le,
    },

    "f64": {
      "+": ops.f64add,
      "-": ops.f64sub,
      "*": ops.f64mul,
      "/": ops.f64div,
      "%": ops.f64div,
      "==": ops.f64eq,
      "<": ops.f64lt,
      "<=": ops.f64le,
    },
  };

  var BinaryGenerator = function() {
    this.writer = new compilerutil.BinaryWriter();
  };

  BinaryGenerator.prototype.generateLocalRef = function(index) {
    this.writer.u8(this.func.locals[index].remappedIndex);
  };

  BinaryGenerator.prototype.generateFuncRef = function(index) {
    this.writer.u8(this.funcID[index]);
  };

  BinaryGenerator.prototype.generateExternRef = function(index) {
    this.writer.u8(this.externID[index]);
  };

  BinaryGenerator.prototype.generateExpr = function(expr) {
    switch (expr.type) {
    case "ConstI32":
      this.writer.u8(ops.i32const.bytecode);
      this.writer.i32(expr.value);
      break;
    case "ConstF32":
      this.writer.u8(ops.f32const.bytecode);
      this.writer.f32(expr.value);
      break;
    case "ConstF64":
      this.writer.u8(ops.f64const.bytecode);
      this.writer.f64(expr.value);
      break;
    case "GetLocal":
      this.writer.u8(ops.getlocal.bytecode);
      this.generateLocalRef(expr.index);
      break;
    case "Load":
      this.writer.u8(ops.getheap.bytecode);
      this.generateMemType(expr.mtype);
      this.generateExpr(expr.address);
      break;
    case "Store":
      this.writer.u8(ops.setheap.bytecode);
      this.generateMemType(expr.mtype);
      this.generateExpr(expr.address);
      this.generateExpr(expr.value);
      break;
    case "Coerce":
      var src = expr.expr.etype;
      var dst = expr.mtype;
      switch (dst) {
      case "i8":
	switch (src) {
	case "i32":
	  this.generateExpr(expr.expr); // HACK
	  break;
	default:
	  throw Error(dst + "<=" + src);
	}
	break;
      case "i16":
	switch (src) {
	case "i32":
	  this.generateExpr(expr.expr); // HACK
	  break;
	default:
	  throw Error(dst + "<=" + src);
	}
	break;
      case "i32":
	switch (src) {
	case "f32":
	  this.writer.u8(ops.i32fromf32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	case "f64":
	  this.writer.u8(ops.i32fromf64.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	default:
	  throw Error(dst + "<=" + src);
	}
	break;
      case "f32":
	switch (src) {
	case "i32":
	  this.writer.u8(ops.f32fromi32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	case "f64":
	  this.writer.u8(ops.f32fromf64.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	default:
	  throw Error(dst + "<=" + src);
	}
	break;
      case "f64":
	switch (src) {
	case "i32":
	  this.writer.u8(ops.f64fromi32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	case "f32":
	  this.writer.u8(ops.f64fromf32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	default:
	  throw Error(dst + "<=" + src);
	}
	break;
      default:
	throw Error(dst + "<=" + src);
      }
      break;

    case "PrefixOp":
      switch (expr.op) {
      case "!":
	this.writer.u8(ops.not.bytecode);
	this.generateExpr(expr.expr);
	break;
      default:
	console.log(expr);
	throw Error(expr.op);
      }
      break;
    case "BinaryOp":
      if (!(expr.etype in binOpMap)) throw Error(expr.etype);
      var map = binOpMap[expr.etype];
      if (!(expr.op in map)) throw Error(expr.op);
      var op = map[expr.op];

      this.writer.u8(op.bytecode);
      this.generateExpr(expr.left);
      this.generateExpr(expr.right);
      break;
    case "CallExternal":
      this.writer.u8(ops.callfunc.bytecode);
      this.generateExternRef(expr.func);
      // Number of arguments infered from target signature.
      for (var i in expr.args) {
	this.generateExpr(expr.args[i]);
      }
      break;
    case "CallDirect":
      this.writer.u8(ops.callfunc.bytecode);
      this.generateFuncRef(expr.func);
      // Number of arguments infered from target signature.
      for (var i in expr.args) {
	this.generateExpr(expr.args[i]);
      }
      break;
    case "Return":
      // Count infered from the function signature.
      this.writer.u8(ops.getlocal.bytecode);
      if (expr.expr) {
	this.generateExpr(expr.expr);
      }
      break;
      break;
    case "Break":
      this.writer.u8(ops.getlocal.break_);
      this.writer.u8(0);
      break;
    default:
      console.log(expr);
      throw expr.type;
    };
  };

  BinaryGenerator.prototype.generateStmt = function(expr) {
    switch (expr.type) {
    case "If":
      if (expr.f) {
	this.writer.u8(ops.if2.bytecode);
	this.generateExpr(expr.cond);
	this.generateBlock(expr.t);
	this.generateBlock(expr.f);
      } else {
	this.writer.u8(ops.if1.bytecode);
	this.generateExpr(expr.cond);
	this.generateBlock(expr.t);
      }
      break;
    case "Loop":
      this.writer.u8(ops.loop.bytecode);
      this.generateBlock(expr.body);
      break;
    case "SetLocal":
      this.writer.u8(ops.setlocal.bytecode);
      this.generateLocalRef(expr.index);
      this.generateExpr(expr.value);
      break;
    default:
      this.generateExpr(expr);
    };
  };

  BinaryGenerator.prototype.generateBlock = function(block) {
    this.writer.u8(ops.block.bytecode);
    this.writer.u8(block.length);
    for (var i in block) {
      this.generateStmt(block[i]);
    };
  };

  BinaryGenerator.prototype.generateFunc = function(func) {
    this.func = func;
    this.generateBlock(func.body);
  };

  BinaryGenerator.prototype.generateType = function(t) {
    if (!(t in types)) {
      throw Error(t);
    }
    this.writer.u8(types[t]);
  };

  BinaryGenerator.prototype.generateMemType = function(t) {
    if (!(t in mem_types)) {
      throw Error(t);
    }
    this.writer.u8(mem_types[t]);
  };


  BinaryGenerator.prototype.generateSignature = function(argTypes, returnType) {
    this.writer.u8(argTypes.length);
    for (var i in argTypes) {
      this.generateType(argTypes[i]);
    }
    this.generateType(returnType);
  };

  BinaryGenerator.prototype.generateStringRef = function(value) {
    if (typeof value !== "string") {
      throw Error(value);
    }
    if (!(value in this.strings)) {
      this.strings[value] = [];
    }
    this.strings[value].push(this.writer.allocU32());
  };

  BinaryGenerator.prototype.generateStringTable = function() {
    for (var s in this.strings) {
      var refs = this.strings[s];
      for (var i = 0; i < refs.length; i++) {
	this.writer.patchU32(refs[i], this.writer.pos);
      }
      var sizePos = this.writer.allocU32();
      var size = this.writer.utf8(s);
      this.writer.u8(0); // Null terminate to be paranoid.
      this.writer.patchU32(sizePos, size);
    }
  };

  BinaryGenerator.prototype.generateModule = function(module) {
    this.module = module;

    this.strings = {};

    this.writer.u8(module.funcs.length);

    var funcBegin = {};
    var funcEnd = {};

    var uid = 0;

    this.externID = {};
    this.funcID = {};

    for (var i in module.externs) {
      var extern = module.externs[i];
      this.externID[i] = uid;
      uid += 1;

      // TODO function name.
      this.generateSignature(extern.args, extern.returnType);

      this.generateStringRef(extern.name.text);

      this.writer.u32(0); // No offset
      this.writer.u32(0); // No offset

      this.writer.u16(0); // No i32
      this.writer.u16(0); // No f32
      this.writer.u16(0); // No f64

      this.writer.u8(0);
      this.writer.u8(1); // Not an extern.
    };

    for (var i in module.funcs) {
      var func = module.funcs[i];

      // Bucket locals by type.
      var i32Locals = [];
      var f32Locals = [];
      var f64Locals = [];
      for (var i in func.locals) {
	var l = func.locals[i];
	switch (l.ltype) {
	case "i32":
	  i32Locals.push(l);
	  break;
	case "f32":
	  f32Locals.push(l);
	  break;
	case "f64":
	  f64Locals.push(l);
	  break;
	default:
	  console.log(l);
	  throw l.ltype;
	}
      }

      // Recalculate index, when bucked by types.
      var localIndex = 0;
      for (var i in i32Locals) {
	i32Locals[i].remappedIndex = localIndex;
	localIndex += 1;
      }
      for (var i in f32Locals) {
	f32Locals[i].remappedIndex = localIndex;
	localIndex += 1;
      }
      for (var i in f64Locals) {
	f64Locals[i].remappedIndex = localIndex;
	localIndex += 1;
      }

      this.funcID[i] = uid;
      uid += 1;

      var argTypes = [];
      for(var j in func.params) {
	argTypes.push(func.params[j].ptype);
      }
      this.generateSignature(argTypes, func.returnType);

      this.generateStringRef(func.name.text);

      funcBegin[i] = this.writer.allocU32();
      funcEnd[i] = this.writer.allocU32();

      this.writer.u16(i32Locals.length);
      this.writer.u16(f32Locals.length);
      this.writer.u16(f64Locals.length);

      this.writer.u8(func.exportFunc);
      this.writer.u8(0); // Not an extern.
    };

    for (var i in module.funcs) {
      this.writer.patchU32(funcBegin[i], this.writer.pos);
      this.generateFunc(module.funcs[i]);
      this.writer.patchU32(funcEnd[i], this.writer.pos);
    };

    this.generateStringTable();
  };

  var generate = function(module) {
    var gen = new BinaryGenerator();
    gen.generateModule(module);
    return gen.writer.getOutput();
  };

  return {generate: generate};
});
