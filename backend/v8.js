var backend_v8 = {};

(function(exports) {

  var BinaryWriter = function() {
    this.data = new DataView(new ArrayBuffer(1024*1024));
    this.pos = 0;
  };

  BinaryWriter.prototype.remember = function() {
    return new BinaryWriter();
  };

  BinaryWriter.prototype.getOutput = function() {
    return this.data.buffer.slice(0, this.pos);
  };

  BinaryWriter.prototype.i8 = function(data) {
    this.data.setInt8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.u8 = function(data) {
    this.data.setUint8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.i16 = function(data) {
    this.data.setInt16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.u16 = function(data) {
    this.data.setUint16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.i32 = function(data) {
    this.data.setInt32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.u32 = function(data) {
    this.data.setUint32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.allocU32 = function() {
    var temp = this.pos;
    this.pos += 4;
    return temp;
  };

  BinaryWriter.prototype.patchU32 = function(pos, data) {
    this.data.setUint32(pos, data, true);
    return this;
  };

  var types = {
    "void": 0,
    "i32": 1,
    "f32": 2,
    "f64": 3,
  };

  var ops = {
    setheap: {bytecode: 0x03},
    if1: {bytecode: 0x04},
    if2: {bytecode: 0x05},
    block: {bytecode: 0x06},
    ret: {bytecode: 0x0c},

    i32const: {bytecode: 0x11},
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

    i32lt: {bytecode: 0x2e},
    i32le: {bytecode: 0x2f},
    u32lt: {bytecode: 0x30},
    u32le: {bytecode: 0x31},
  };

  var BinaryGenerator = function() {
    this.writer = new BinaryWriter();
  };

  BinaryGenerator.prototype.generateLocalRef = function(index) {
    // HACK we'll likely need to renumber.
    this.writer.u8(index);
  };

  BinaryGenerator.prototype.generateFuncRef = function(index) {
    this.writer.u8(this.funcID[index]);
  };

  BinaryGenerator.prototype.generateExternRef = function(index) {
    this.writer.u8(this.externID[index]);
  };

  BinaryGenerator.prototype.generateExpr = function(expr) {
    switch (expr.type) {
    case "const_i32":
      this.writer.u8(ops.i32const.bytecode);
      this.writer.i32(expr.value);
      break;
    case "getlocal":
      this.writer.u8(ops.getlocal.bytecode);
      this.generateLocalRef(expr.index);
      break;
    case "load":
      this.writer.u8(ops.getheap.bytecode);
      this.generateType(expr.mtype);
      this.generateExpr(expr.address);
      break;
    case "store":
      this.writer.u8(ops.setheap.bytecode);
      this.generateType(expr.mtype);
      this.generateExpr(expr.address);
      this.generateExpr(expr.value);
      break;
    case "binop":
      // TODO support other data types.
      if (expr.etype != "i32") throw expr;

      switch (expr.op) {
      case "+":
	this.writer.u8(ops.i32add.bytecode);
	break;
      case "-":
	this.writer.u8(ops.i32sub.bytecode);
	break;
      case "*":
	this.writer.u8(ops.i32mul.bytecode);
	break;
      case "/":
	this.writer.u8(ops.i32div.bytecode);
	break;
      case "<=":
	this.writer.u8(ops.i32le.bytecode);
	break;
      case "<":
	this.writer.u8(ops.i32lt.bytecode);
	break;
      default:
	console.log(expr);
	throw(expr.op);
      }
      this.generateExpr(expr.left);
      this.generateExpr(expr.right);
      break;
    case "callexternal":
      this.writer.u8(ops.callfunc.bytecode);
      this.generateExternRef(expr.func);
      // Number of arguments infered from target signature.
      for (var i in expr.args) {
	this.generateExpr(expr.args[i]);
      }
      break;
    case "calldirect":
      this.writer.u8(ops.callfunc.bytecode);
      this.generateFuncRef(expr.func);
      // Number of arguments infered from target signature.
      for (var i in expr.args) {
	this.generateExpr(expr.args[i]);
      }
      break;
    case "return":
      // Count infered from the function signature.
      this.writer.u8(ops.getlocal.bytecode);
      if (expr.expr) {
	this.generateExpr(expr.expr);
      }
      break;
    default:
      console.log(expr);
      throw expr.type;
    };
  };

  BinaryGenerator.prototype.generateStmt = function(expr) {
    switch (expr.type) {
    case "if":
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
    this.writer.u8(types[t]);
  };

  BinaryGenerator.prototype.generateSignature = function(argTypes, returnType) {
    this.writer.u8(argTypes.length);
    for (var i in argTypes) {
      this.generateType(argTypes[i]);
    }
    this.generateType(returnType);
  };

  BinaryGenerator.prototype.generateModule = function(module) {
    this.module = module;

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

      this.funcID[i] = uid;
      uid += 1;

      // TODO function name.
      var argTypes = [];
      for(var j in func.params) {
	argTypes.push(func.params[j].ptype);
      }
      this.generateSignature(argTypes, func.returnType);
      funcBegin[i] = this.writer.allocU32();
      funcEnd[i] = this.writer.allocU32();

      // HACK assme all locals are i32.
      this.writer.u16(func.locals.length);
      this.writer.u16(0); // No f32
      this.writer.u16(0); // No f64

      this.writer.u8(func.exportFunc);
      this.writer.u8(0); // Not an extern.
    };

    for (var i in module.funcs) {
      this.writer.patchU32(funcBegin[i], this.writer.pos);
      this.generateFunc(module.funcs[i]);
      this.writer.patchU32(funcEnd[i], this.writer.pos);
    };
  };

  exports.generate = function(module) {
    var gen = new BinaryGenerator();
    gen.generateModule(module);
    return gen.writer.getOutput();
  };

})(backend_v8);
