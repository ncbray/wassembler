define([], function() {
  var CodeWriter = function() {
    this.margins = [];
    this.margin = "";
    this.output = "";
    this.dirty = false;
  };

  CodeWriter.prototype.getOutput = function() {
    return this.output;
  };

  CodeWriter.prototype.out = function(text) {
    if (typeof text != "string") {
      throw Error(text);
    }
    if (!this.dirty) {
      this.output += this.margin;
      this.dirty = true;
    }
    this.output += text;
    return this;
  };

  CodeWriter.prototype.eol = function() {
    this.output += "\n";
    this.dirty = false;
    return this;
  };

  CodeWriter.prototype.indent = function() {
    this.margins.push(this.margin);
    this.margin += "  ";
    return this;
  };

  CodeWriter.prototype.dedent = function() {
    this.margin = this.margins.pop();
    return this;
  };

  var checkRange = function(value, min, max) {
    if (value < min || value > max) throw value;
  }

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
    checkRange(data, -0x80, 0x7f);
    this.data.setInt8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.u8 = function(data) {
    checkRange(data, 0x0, 0xff);
    this.data.setUint8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.i16 = function(data) {
    checkRange(data, -0x8000, 0x7fff);
    this.data.setInt16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.u16 = function(data) {
    checkRange(data, 0x0, 0xffff);
    this.data.setUint16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.i32 = function(data) {
    checkRange(data, -0x80000000, 0x7fffffff);
    this.data.setInt32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.u32 = function(data) {
    checkRange(data, 0x0, 0xffffffff);
    this.data.setUint32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.f32 = function(data) {
    this.data.setFloat32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.f64 = function(data) {
    this.data.setFloat64(this.pos, data, true);
    this.pos += 8;
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

  BinaryWriter.prototype.utf8 = function(s) {
    var size = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c > 127) {
	// HACK real no unicode support, yet.
	throw c;
      }
      this.u8(c);
      size += 1;
    }
    return size;
  };

  return {
    CodeWriter: CodeWriter,
    BinaryWriter: BinaryWriter,
  };
});