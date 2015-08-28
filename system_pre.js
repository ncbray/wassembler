if (threading_supported) {
  if (typeof SharedInt32Array === 'undefined') {
    var makeSharedTypedArrayCtor = function(ctor) {
      return function(arg) {
        if (typeof arg === 'number') {
          // Constructing a new SharedTypedArray of size arg.
          var sab = new SharedArrayBuffer(arg * ctor.BYTES_PER_ELEMENT);
          return new ctor(sab);
        } else {
          // Constructing an ArrayBufferView with a given buffer. Forward the
          // args through.
          var args = Array.prototype.slice.call(arguments);
          args.unshift(null);
          var bound_ctor = ctor.bind.apply(ctor, args);
          return new bound_ctor();
        }
      };
    };

    SharedInt8Array = makeSharedTypedArrayCtor(Int8Array);
    SharedUint8Array = makeSharedTypedArrayCtor(Uint8Array);
    SharedInt16Array = makeSharedTypedArrayCtor(Int16Array);
    SharedUint16Array = makeSharedTypedArrayCtor(Uint16Array);
    SharedInt32Array = makeSharedTypedArrayCtor(Int32Array);
    SharedUint32Array = makeSharedTypedArrayCtor(Uint32Array);
    SharedFloat32Array = makeSharedTypedArrayCtor(Float32Array);
    SharedFloat64Array = makeSharedTypedArrayCtor(Float64Array);
  }
}
