var createSystem = function(buffer, srcURL) {
  var system = {};

  // Intrinstics.

  // Math
  system.powF32 = function(base, exponent) {
    return Math.fround(Math.pow(base, exponent));
  };
  system.sinF32 = function(value) {
    return Math.fround(Math.sin(value));
  };
  system.cosF32 = function(value) {
    return Math.fround(Math.cos(value));
  };
  system.powF64 = function(base, exponent) {
    return Math.pow(base, exponent);
  };
  system.sinF64 = function(value) {
    return Math.sin(value);
  };
  system.cosF64 = function(value) {
    return Math.cos(value);
  };

  system.threadingSupported = function() {
    return threading_supported;
  };

  // Atomics.
  if (threading_supported) {
    var I32 = new SharedInt32Array(buffer);
    var a = Atomics;
  } else {
    var I32 = new Int32Array(buffer);
    // Polyfill
    var a = {
      load: function(view, addr) {
        return view[addr];
      },
      store: function(view, addr, value) {
        view[addr] = value;
      },
      compareExchange: function(view, addr, expected, value) {
        var actual = view[addr];
        if (actual === expected) {
          view[addr] = value;
        }
        return actual;
      },
    };
  }

  system.atomicLoadI32 = function(addr) {
    return a.load(I32, addr >> 2);
  };

  system.atomicStoreI32 = function(addr, value) {
    a.store(I32, addr >> 2, value);
  };

  system.atomicCompareExchangeI32 = function(addr, expected, value) {
    return a.compareExchange(I32, addr >> 2, expected, value);
  };

  // Libc-like stuff.

  var is_main_thread = false;
  system.initMainThread = function() {
    is_main_thread = true;
  };

  // Threading
  if (threading_supported) {
    system.threadCreate = function(f, context) {
      var worker = new Worker(srcURL);
      worker.postMessage({buffer: buffer, f: f, context: context}, [buffer]);
    };
  }

  system.consoleI32 = function(value) {
    console.log(value);
  };

  system.consoleString = function(ptr, size) {
    var buffer = new ArrayBuffer(size);
    instance._copyOut(ptr, size, buffer);
    var values = new Uint8Array(buffer);
    var s = "";
    // TODO UTF8 support.
    for (var i = 0; i < values.length; i++) {
      s += String.fromCharCode(values[i]);
    }
    console.log(s);
  };

  return system;
};

var augmentInstance = function(instance, buffer) {
  if (threading_supported) {
    instance._copyOut = function(srcOff, size, dst, dstOff) {
      var end = srcOff + size;
      if (end < srcOff || srcOff > buffer.byteLength || srcOff < 0 || end > buffer.byteLength || end < 0) {
        throw Error("Range [" + srcOff + ", " + end + ") is out of bounds. [0, " + buffer.byteLength + ")");
      }
      new Uint8Array(dst, dstOff, size).set(new SharedUint8Array(buffer, srcOff, size));
    };
  } else {
    instance._copyOut = function(srcOff, size, dst, dstOff) {
      var end = srcOff + size;
      if (end < srcOff || srcOff > buffer.byteLength || srcOff < 0 || end > buffer.byteLength || end < 0) {
        throw Error("Range [" + srcOff + ", " + end + ") is out of bounds. [0, " + buffer.byteLength + ")");
      }
      new Uint8Array(dst, dstOff, size).set(new Uint8Array(buffer, srcOff, size));
    };
  }
};

var instance;

var is_browser = typeof window === 'object';
var is_worker = typeof importScripts === 'function';

if (!is_worker) {
  return function(foreign, srcURL) {
    var buffer = createMemory();
    var system = createSystem(buffer, srcURL);
    var wrapped_foreign = wrap_foreign(system, foreign);
    instance = module(stdlib, wrapped_foreign, buffer);
    augmentInstance(instance, buffer);
    system.initMainThread();
    return instance;
  }
} else {
  var init = function(evt) {
    self.removeEventListener("message", init, false);

    var buffer = evt.data.buffer;

    // HACK
    var foreign = {};
    var srcURL = null;

    var system = createSystem(buffer, srcURL);
    var wrapped_foreign = wrap_foreign(system, foreign);
    instance = module(stdlib, wrapped_foreign, buffer);
    augmentInstance(instance, buffer);
    if (instance.threadStart) {
      instance.threadStart(evt.data.f, evt.data.context);
    }
    self.close();
  };
  self.addEventListener("message", init, false);
}
