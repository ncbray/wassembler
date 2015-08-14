define(["astutil", "compilerutil", "wasm/ast", "wasm/opinfo"], function(astutil, compilerutil, wast, opinfo) {
  var types = {
    "void": 0,
    "i32": 1,
    "i64": 2,
    "f32": 3,
    "f64": 4,
  };

  var mem_types = {
    "i8": 0,
    "u8": 1,
    "i16": 2,
    "u16": 3,
    "i32": 4,
    "u32": 5,
    "i64": 6,
    "u64": 7,
    "f32": 8,
    "f64": 9,
  };

  var localTypeForMemType = {
    "i8": "i32",
    "i16": "i32",
    "i32": "i32",
    "i64": "i64",
    "f32": "f32",
    "f64": "f64",
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

    i32fromf32: {bytecode: 0x99},
    i32fromf64: {bytecode: 0x9a},

    i32fromi64: {bytecode: 0x9d},

    i64fromf32: {bytecode: 0x9e},
    i64fromf64: {bytecode: 0x9f},

    i64fromi32: {bytecode: 0xa2},


    f32fromi32: {bytecode: 0xa4},
    f32fromu32: {bytecode: 0xa5},
    f32fromi64: {bytecode: 0xa6},
    f32fromu64: {bytecode: 0xa7},
    f32fromf64: {bytecode: 0xa8},

    f64fromi32: {bytecode: 0xaa},
    f64fromu32: {bytecode: 0xab},
    f64fromi64: {bytecode: 0xac},
    f64fromu64: {bytecode: 0xad},
    f64fromf32: {bytecode: 0xae},
  };

  var unaryOpEncodingTable = [
    {optype: "i32", op: "boolnot", bytecode: 0x59},
    {optype: "f32", op: "neg", bytecode: 0x7a},
    {optype: "f32", op: "sqrt", bytecode: 0x80},
    {optype: "f64", op: "neg", bytecode: 0x8d},
    {optype: "f64", op: "sqrt", bytecode: 0x93},
  ];

  var binaryOpEncodingTable = [
    {optype: "i32", op: opinfo.binaryOps.add, bytecode: 0x40},
    {optype: "i32", op: opinfo.binaryOps.sub, bytecode: 0x41},
    {optype: "i32", op: opinfo.binaryOps.mul, bytecode: 0x42},
    {optype: "i32", op: opinfo.binaryOps.sdiv, bytecode: 0x43},
    {optype: "i32", op: opinfo.binaryOps.udiv, bytecode: 0x44},
    {optype: "i32", op: opinfo.binaryOps.srem, bytecode: 0x45},
    {optype: "i32", op: opinfo.binaryOps.urem, bytecode: 0x46},
    {optype: "i32", op: opinfo.binaryOps.and, bytecode: 0x47},
    {optype: "i32", op: opinfo.binaryOps.ior, bytecode: 0x48},
    {optype: "i32", op: opinfo.binaryOps.xor, bytecode: 0x49},
    {optype: "i32", op: opinfo.binaryOps.shl, bytecode: 0x4a},
    {optype: "i32", op: opinfo.binaryOps.shr, bytecode: 0x4b},
    {optype: "i32", op: opinfo.binaryOps.sar, bytecode: 0x4c},
    {optype: "i32", op: opinfo.binaryOps.eq, bytecode: 0x4d},
    {optype: "i32", op: opinfo.binaryOps.slt, bytecode: 0x4e},
    {optype: "i32", op: opinfo.binaryOps.sle, bytecode: 0x4f},
    {optype: "i32", op: opinfo.binaryOps.ult, bytecode: 0x50},
    {optype: "i32", op: opinfo.binaryOps.ule, bytecode: 0x51},
    {optype: "i32", op: opinfo.binaryOps.sgt, bytecode: 0x52},
    {optype: "i32", op: opinfo.binaryOps.sge, bytecode: 0x53},
    {optype: "i32", op: opinfo.binaryOps.ugt, bytecode: 0x54},
    {optype: "i32", op: opinfo.binaryOps.uge, bytecode: 0x55},

    {optype: "i64", op: opinfo.binaryOps.add, bytecode: 0x5a},
    {optype: "i64", op: opinfo.binaryOps.sub, bytecode: 0x5b},
    {optype: "i64", op: opinfo.binaryOps.mul, bytecode: 0x5c},
    {optype: "i64", op: opinfo.binaryOps.sdiv, bytecode: 0x5d},
    {optype: "i64", op: opinfo.binaryOps.udiv, bytecode: 0x5e},
    {optype: "i64", op: opinfo.binaryOps.srem, bytecode: 0x5f},
    {optype: "i64", op: opinfo.binaryOps.urem, bytecode: 0x60},
    {optype: "i64", op: opinfo.binaryOps.and, bytecode: 0x61},
    {optype: "i64", op: opinfo.binaryOps.ior, bytecode: 0x62},
    {optype: "i64", op: opinfo.binaryOps.xor, bytecode: 0x63},
    {optype: "i64", op: opinfo.binaryOps.shl, bytecode: 0x64},
    {optype: "i64", op: opinfo.binaryOps.shr, bytecode: 0x65},
    {optype: "i64", op: opinfo.binaryOps.sar, bytecode: 0x66},
    {optype: "i64", op: opinfo.binaryOps.eq, bytecode: 0x67},
    {optype: "i64", op: opinfo.binaryOps.slt, bytecode: 0x68},
    {optype: "i64", op: opinfo.binaryOps.sle, bytecode: 0x69},
    {optype: "i64", op: opinfo.binaryOps.ult, bytecode: 0x6a},
    {optype: "i64", op: opinfo.binaryOps.ule, bytecode: 0x6b},
    {optype: "i64", op: opinfo.binaryOps.sgt, bytecode: 0x6c},
    {optype: "i64", op: opinfo.binaryOps.sge, bytecode: 0x6d},
    {optype: "i64", op: opinfo.binaryOps.ugt, bytecode: 0x6e},
    {optype: "i64", op: opinfo.binaryOps.uge, bytecode: 0x6f},

    {optype: "f32", op: opinfo.binaryOps.add, bytecode: 0x73},
    {optype: "f32", op: opinfo.binaryOps.sub, bytecode: 0x74},
    {optype: "f32", op: opinfo.binaryOps.mul, bytecode: 0x75},
    {optype: "f32", op: opinfo.binaryOps.div, bytecode: 0x76},
    {optype: "f32", op: opinfo.binaryOps.min, bytecode: 0x77},
    {optype: "f32", op: opinfo.binaryOps.max, bytecode: 0x78},

    {optype: "f32", op: opinfo.binaryOps.eq, bytecode: 0x81},
    {optype: "f32", op: opinfo.binaryOps.lt, bytecode: 0x82},
    {optype: "f32", op: opinfo.binaryOps.le, bytecode: 0x83},
    {optype: "f32", op: opinfo.binaryOps.gt, bytecode: 0x84},
    {optype: "f32", op: opinfo.binaryOps.ge, bytecode: 0x85},

    {optype: "f64", op: opinfo.binaryOps.add, bytecode: 0x86},
    {optype: "f64", op: opinfo.binaryOps.sub, bytecode: 0x87},
    {optype: "f64", op: opinfo.binaryOps.mul, bytecode: 0x88},
    {optype: "f64", op: opinfo.binaryOps.div, bytecode: 0x89},
    {optype: "f64", op: opinfo.binaryOps.min, bytecode: 0x8a},
    {optype: "f64", op: opinfo.binaryOps.max, bytecode: 0x8b},

    {optype: "f64", op: opinfo.binaryOps.eq, bytecode: 0x94},
    {optype: "f64", op: opinfo.binaryOps.lt, bytecode: 0x95},
    {optype: "f64", op: opinfo.binaryOps.le, bytecode: 0x96},
    {optype: "f64", op: opinfo.binaryOps.gt, bytecode: 0x97},
    {optype: "f64", op: opinfo.binaryOps.ge, bytecode: 0x98},
  ];

  var unaryOpMap = astutil.index(["optype", "op"], unaryOpEncodingTable);
  var binOpMap = astutil.index(["optype", "op"], binaryOpEncodingTable);


  var loadOpEncodingTable = [
    {resulttype: "i32", addrtype: "i32", bytecode: 0x20},
    {resulttype: "i64", addrtype: "i32", bytecode: 0x21},
    {resulttype: "f32", addrtype: "i32", bytecode: 0x22},
    {resulttype: "f64", addrtype: "i32", bytecode: 0x23},
    {resulttype: "i32", addrtype: "i64", bytecode: 0x24},
    {resulttype: "i64", addrtype: "i64", bytecode: 0x25},
    {resulttype: "f32", addrtype: "i64", bytecode: 0x26},
    {resulttype: "f64", addrtype: "i64", bytecode: 0x27},
  ];

  var storeOpEncodingTable = [
    {resulttype: "i32", addrtype: "i32", bytecode: 0x30},
    {resulttype: "i64", addrtype: "i32", bytecode: 0x31},
    {resulttype: "f32", addrtype: "i32", bytecode: 0x32},
    {resulttype: "f64", addrtype: "i32", bytecode: 0x33},
    {resulttype: "i32", addrtype: "i64", bytecode: 0x34},
    {resulttype: "i64", addrtype: "i64", bytecode: 0x35},
    {resulttype: "f32", addrtype: "i64", bytecode: 0x36},
    {resulttype: "f64", addrtype: "i64", bytecode: 0x37},
  ];


  var loadOpMap = astutil.index(["addrtype", "resulttype"], loadOpEncodingTable);
  var storeOpMap = astutil.index(["addrtype", "resulttype"], storeOpEncodingTable);

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
      if (-128 <= expr.value && expr.value <= 127) {
	// A more compact encoding for smaller numbers.
        this.writer.u8(ops.i8const.bytecode);
        this.writer.u8(expr.value);
      } else {
        this.writer.u8(ops.i32const.bytecode);
        this.writer.i32(expr.value);
      }
      break;
    case "ConstI64":
      this.writer.u8(ops.i64const.bytecode);
      this.writer.i64(expr.value);
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
      var decl = loadOpMap["i32"][localTypeForMemType[expr.mtype]];
      this.writer.u8(decl.bytecode);
      this.generateMemType(expr.mtype);
      this.generateExpr(expr.address);
      break;
    case "Store":
      var decl = storeOpMap["i32"][localTypeForMemType[expr.mtype]];
      this.writer.u8(decl.bytecode);
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
	case "i64":
	  this.writer.u8(ops.i32fromi64.bytecode);
	  this.generateExpr(expr.expr);
	  break;
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
      case "i64":
	switch (src) {
	case "i32":
	  this.writer.u8(ops.i64fromi32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	case "f32":
	  this.writer.u8(ops.i64fromf32.bytecode);
	  this.generateExpr(expr.expr);
	  break;
	case "f64":
	  this.writer.u8(ops.i64fromf64.bytecode);
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
	case "i64":
	  this.writer.u8(ops.f32fromi64.bytecode);
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
	case "i64":
	  this.writer.u8(ops.f64fromi64.bytecode);
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
    case "UnaryOp":
      if (!(expr.optype in unaryOpMap)) throw Error(expr.optype);
      var map = unaryOpMap[expr.optype];
      if (!(expr.op in map)) throw Error(expr.optype + "." + expr.op);
      var op = map[expr.op];
      this.writer.u8(op.bytecode);
      this.generateExpr(expr.expr);
      break;
    case "BinaryOp":
      if (!(expr.optype in binOpMap)) throw Error(expr.optype);
      var map = binOpMap[expr.optype];
      if (!(expr.op in map)) throw Error(expr.optype + "." + expr.op);
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
      this.writer.u8(expr.depth);
      break;
    default:
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
      this.generateBlock(expr.body, true); // Loops have an implicit block, do not output a bytecode.
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

  BinaryGenerator.prototype.generateBlock = function(block, supress_bytecode) {
    if (!supress_bytecode) {
      this.writer.u8(ops.block.bytecode);
    }
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
    //if (returnType == "void") {
    //  this.writer.u8(0);
    //} else {
    //  this.writer.u8(1);
    //  this.generateType(returnType);
    //}

    this.writer.u8(argTypes.length);
    this.generateType(returnType);
    for (var i in argTypes) {
      this.generateType(argTypes[i]);
    }
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
      var size = this.writer.utf8(s);
      this.writer.u8(0); // Null terminate strings.
    }
  };

  BinaryGenerator.prototype.generateModule = function(module) {
    this.module = module;

    this.strings = {};

    // Header
    var num_address_space_bits = Math.ceil(Math.log2(module.config.memory.fixed));
    this.writer.u8(num_address_space_bits);
    this.writer.u8(0);  // Don't export memory.
    this.writer.u16(0); // No globals.
    this.writer.u16(module.funcs.length);
    this.writer.u16(module.memory.length);

    var funcBegin = {};
    var funcEnd = {};
    var dataBegin = {};

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
      this.writer.u16(0); // No i64
      this.writer.u16(0); // No f32
      this.writer.u16(0); // No f64

      this.writer.u8(0);
      this.writer.u8(1); // Not an extern.
    };

    for (var f = 0; f < module.funcs.length; f++) {
      var func = module.funcs[f];

      var localIndex = 0;

      // Parameters are assigned the first indexes.
      for(var p = 0; p < func.params.length; p++) {
	var param = func.params[p];
	var l = param.local;
	l.param = true;
	l.remappedIndex = localIndex;
	localIndex += 1;
      }

      // Bucket locals by type.
      var i32Locals = [];
      var i64Locals = [];
      var f32Locals = [];
      var f64Locals = [];
      for (var i in func.locals) {
	var l = func.locals[i];
	// Parameters are not considered locals.
	if (l.param) continue;

	switch (l.ltype) {
	case "i32":
	  i32Locals.push(l);
	  break;
	case "i64":
	  i64Locals.push(l);
	  break;
	case "f32":
	  f32Locals.push(l);
	  break;
	case "f64":
	  f64Locals.push(l);
	  break;
	default:
	  throw Error(l.ltype);
	}
      }

      // Recalculate index, when bucked by types.
      for (var i in i32Locals) {
	i32Locals[i].remappedIndex = localIndex;
	localIndex += 1;
      }
      for (var i in i64Locals) {
	i64Locals[i].remappedIndex = localIndex;
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
      this.writer.u16(i64Locals.length);
      this.writer.u16(f32Locals.length);
      this.writer.u16(f64Locals.length);

      this.writer.u8(func.exportFunc | 0);
      this.writer.u8(0); // Not an extern.
    };

    for (var m in module.memory) {
      var mem = module.memory[m];
      this.writer.u32(mem.ptr);
      dataBegin[mem.ptr] = this.writer.allocU32();
      this.writer.u32(mem.buffer.byteLength);
      this.writer.u8(1);
    }

    for (var f in module.funcs) {
      this.writer.patchU32(funcBegin[f], this.writer.pos);
      this.generateFunc(module.funcs[f]);
      this.writer.patchU32(funcEnd[f], this.writer.pos);
    };

    for (var m in module.memory) {
      var mem = module.memory[m];
      this.writer.patchU32(dataBegin[mem.ptr], this.writer.pos);
      this.writer.bytes(mem.buffer);
    }

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
