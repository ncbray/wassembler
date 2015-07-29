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
    if1: {bytecode: 0x01},
    if2: {bytecode: 0x02},
    block: {bytecode: 0x03},

    loop: {bytecode: 0x06},
    continue_: {bytecode: 0x07},
    break_: {bytecode: 0x08},
    return_: {bytecode: 0x09},

    i8const: {bytecode: 0x10},
    i32const: {bytecode: 0x11},
    i64const: {bytecode: 0x12},
    f64const: {bytecode: 0x13},
    f32const: {bytecode: 0x14},

    getlocal: {bytecode: 0x15},
    setlocal: {bytecode: 0x16},

    getglobal: {bytecode: 0x17},
    setglobal: {bytecode: 0x18},

    callfunc: {bytecode: 0x19},
    callindirect: {bytecode: 0x1a},

    // TODO rework memory operations to match prototype.
    getheap: {bytecode: 0x20},
    setheap: {bytecode: 0x30},

    i32add: {bytecode: 0x40},
    i32sub: {bytecode: 0x41},
    i32mul: {bytecode: 0x42},
    i32div: {bytecode: 0x43},
    u32div: {bytecode: 0x44},
    i32mod: {bytecode: 0x45},
    u32mod: {bytecode: 0x46},
    i32and: {bytecode: 0x47},
    i32ior: {bytecode: 0x48},
    i32xor: {bytecode: 0x49},
    i32shl: {bytecode: 0x4a},
    i32shr: {bytecode: 0x4b},
    i32sar: {bytecode: 0x4c},
    i32eq: {bytecode: 0x4d},
    i32lt: {bytecode: 0x4e},
    i32le: {bytecode: 0x4f},
    u32lt: {bytecode: 0x50},
    u32le: {bytecode: 0x51},

    // TODO i32 greater than.

    not: {bytecode: 0x59},

    f32add: {bytecode: 0x73},
    f32sub: {bytecode: 0x74},
    f32mul: {bytecode: 0x75},
    f32div: {bytecode: 0x76},

    f32eq: {bytecode: 0x81},
    f32lt: {bytecode: 0x82},
    f32le: {bytecode: 0x83},

    // TODO f32 greater than.

    f64add: {bytecode: 0x86},
    f64sub: {bytecode: 0x87},
    f64mul: {bytecode: 0x88},
    f64div: {bytecode: 0x89},

    f64eq: {bytecode: 0x94},
    f64lt: {bytecode: 0x95},
    f64le: {bytecode: 0x96},

    // TODO f64 greater than.

    i32fromf32: {bytecode: 0x99},
    i32fromf64: {bytecode: 0x9a},

    f32fromi32: {bytecode: 0xa4},
    f32fromu32: {bytecode: 0xa5},
    f32fromf64: {bytecode: 0xa8},

    f64fromi32: {bytecode: 0xaa},
    f64fromu32: {bytecode: 0xab},
    f64fromf32: {bytecode: 0xae},
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
      "==": ops.f32eq,
      "<": ops.f32lt,
      "<=": ops.f32le,
    },

    "f64": {
      "+": ops.f64add,
      "-": ops.f64sub,
      "*": ops.f64mul,
      "/": ops.f64div,
      "==": ops.f64eq,
      "<": ops.f64lt,
      "<=": ops.f64le,
    },
  };

  var BinaryGenerator = function() {
    this.writer = new compilerutil.BinaryWriter();
  };

  BinaryGenerator.prototype.generateLocalRef = function(local) {
    this.writer.u8(local.remappedIndex);
  };

  BinaryGenerator.prototype.generateFuncRef = function(func) {
    this.writer.u8(this.funcID[func.index]);
  };

  BinaryGenerator.prototype.generateExternRef = function(func) {
    this.writer.u8(this.externID[func.index]);
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
      this.generateLocalRef(expr.local);
      break;
    case "GetTls":
      throw Error("TLS not supported in V8 backend.");
    case "GetFunction":
      this.writer.u8(ops.i32const.bytecode);
      this.writer.i32(this.funcID[expr.func.index]);
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
    case "CallIndirect":
      this.writer.u8(ops.callindirect.bytecode);
      var ft = expr.ftype;
      // TODO is there a better way to determine the signature of the function?
      this.generateSignature(ft.paramTypes, ft.returnType);
      this.generateExpr(expr.expr);
      // Number of arguments infered from target signature.
      for (var i in expr.args) {
	this.generateExpr(expr.args[i]);
      }
      break;
    case "Return":
      // Count infered from the function signature.
      this.writer.u8(ops.return_.bytecode);
      if (expr.expr) {
	this.generateExpr(expr.expr);
      }
      break;
    case "Break":
      this.writer.u8(ops.break_.bytecode);
      this.writer.u8(0);
      break;
    default:
      console.log(expr);
      throw Error(expr.type);
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
      this.generateLocalRef(expr.local);
      this.generateExpr(expr.value);
      break;
    case "SetTls":
      throw Error("TLS not supported in V8 backend.");
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
      var ft = extern.ftype;
      this.externID[i] = uid;
      uid += 1;

      this.generateSignature(ft.paramTypes, ft.returnType);
      this.generateStringRef(extern.name.text);

      this.writer.u32(0); // No offset
      this.writer.u32(0); // No offset

      this.writer.u16(0); // No i32
      this.writer.u16(0); // No f32
      this.writer.u16(0); // No f64

      this.writer.u8(0);
      this.writer.u8(1); // Not an extern.
    };

    for (var f = 0; f < module.funcs.length; f++) {
      var func = module.funcs[f];

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

      this.funcID[f] = uid;
      uid += 1;

      var argTypes = [];
      for(var j in func.params) {
	argTypes.push(func.params[j].ptype);
      }
      this.generateSignature(argTypes, func.returnType);

      this.generateStringRef(func.name.text);

      funcBegin[f] = this.writer.allocU32();
      funcEnd[f] = this.writer.allocU32();

      this.writer.u16(i32Locals.length);
      this.writer.u16(f32Locals.length);
      this.writer.u16(f64Locals.length);

      this.writer.u8(func.exportFunc | 0);
      this.writer.u8(0); // Not an extern.
    };

    for (var f in module.funcs) {
      this.writer.patchU32(funcBegin[f], this.writer.pos);
      this.generateFunc(module.funcs[f]);
      this.writer.patchU32(funcEnd[f], this.writer.pos);
    };

    this.generateStringTable();
  };

  var generate = function(module) {
    var gen = new BinaryGenerator();
    gen.generateModule(module);
    return gen.writer.getOutput();
  };

  var generateFuncs = function(module) {
    var table = {};
    for (var f in module.funcs) {
      var func = module.funcs[f];
      var gen = new BinaryGenerator();
      gen.generateFunc(func);
      table[func.name.text] = gen.writer.getOutput();
    }
    return table;
  };

  return {
    generate: generate,
    generateFuncs: generateFuncs,
  };
});
