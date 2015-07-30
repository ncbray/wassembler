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
    if (typeof value != "number" || value < min || value > max) throw Error(value + "?");
  }

  var BinaryWriter = function() {
    this.data = new DataView(new ArrayBuffer(1024));
    this.pos = 0;
  };

  BinaryWriter.prototype.expect = function(size) {
    var n = this.data.buffer.byteLength;
    if (this.pos + size <= n) return;
    while (this.pos + size > n) {
      n *= 2;
    }
    // Reallocate
    var replace = new DataView(new ArrayBuffer(n));
    // Copy
    new Uint8Array(replace.buffer).set(new Uint8Array(this.data.buffer));
    // Replace
    this.data = replace;
  };

  BinaryWriter.prototype.getOutput = function() {
    return this.data.buffer.slice(0, this.pos);
  };

  BinaryWriter.prototype.i8 = function(data) {
    checkRange(data, -0x80, 0x7f);
    this.expect(1);
    this.data.setInt8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.u8 = function(data) {
    checkRange(data, 0x0, 0xff);
    this.expect(1);
    this.data.setUint8(this.pos, data, true);
    this.pos += 1;
  };

  BinaryWriter.prototype.i16 = function(data) {
    checkRange(data, -0x8000, 0x7fff);
    this.expect(2);
    this.data.setInt16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.u16 = function(data) {
    checkRange(data, 0x0, 0xffff);
    this.expect(2);
    this.data.setUint16(this.pos, data, true);
    this.pos += 2;
  };

  BinaryWriter.prototype.i32 = function(data) {
    checkRange(data, -0x80000000, 0x7fffffff);
    this.expect(4);
    this.data.setInt32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.u32 = function(data) {
    checkRange(data, 0x0, 0xffffffff);
    this.expect(4);
    this.data.setUint32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.i64 = function(data) {
    checkRange(data, -0x8000000000000, 0x7ffffffffffff); // Approximate i64
    this.expect(8);
    this.data.setInt32(this.pos, data|0, true);
    this.data.setInt32(this.pos + 4, (data/0x100000000)|0, true);
    this.pos += 8;
  };

  BinaryWriter.prototype.u64 = function(data) {
    checkRange(data, 0x0, 0xfffffffffffff); // Approximate i64
    this.expect(8);
    this.data.setInt32(this.pos, data|0, true);
    this.data.setInt32(this.pos + 4, (data/0x100000000)|0, true);
    this.pos += 8;
  };

  BinaryWriter.prototype.f32 = function(data) {
    this.expect(4);
    this.data.setFloat32(this.pos, data, true);
    this.pos += 4;
  };

  BinaryWriter.prototype.f64 = function(data) {
    this.expect(8);
    this.data.setFloat64(this.pos, data, true);
    this.pos += 8;
  };

  BinaryWriter.prototype.zeros = function(count) {
    checkRange(count, 0x0, 0xffffffff);
    this.expect(count);
    this.pos += count;
  };

  BinaryWriter.prototype.allocU32 = function() {
    this.expect(4);
    var temp = this.pos;
    this.pos += 4;
    return temp;
  };

  BinaryWriter.prototype.patchU32 = function(pos, data) {
    checkRange(pos, 0x0, 0xffffffff);
    checkRange(data, 0x0, 0xffffffff);
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