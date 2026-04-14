(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.UniversalRDF = {}));
})(this, (function(exports2) {
  "use strict";
  var buffer = {};
  var base64Js = {};
  var hasRequiredBase64Js;
  function requireBase64Js() {
    if (hasRequiredBase64Js) return base64Js;
    hasRequiredBase64Js = 1;
    base64Js.byteLength = byteLength;
    base64Js.toByteArray = toByteArray;
    base64Js.fromByteArray = fromByteArray;
    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
    var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i];
      revLookup[code.charCodeAt(i)] = i;
    }
    revLookup["-".charCodeAt(0)] = 62;
    revLookup["_".charCodeAt(0)] = 63;
    function getLens(b64) {
      var len2 = b64.length;
      if (len2 % 4 > 0) {
        throw new Error("Invalid string. Length must be a multiple of 4");
      }
      var validLen = b64.indexOf("=");
      if (validLen === -1) validLen = len2;
      var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
      return [validLen, placeHoldersLen];
    }
    function byteLength(b64) {
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function _byteLength(b64, validLen, placeHoldersLen) {
      return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
    }
    function toByteArray(b64) {
      var tmp;
      var lens = getLens(b64);
      var validLen = lens[0];
      var placeHoldersLen = lens[1];
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
      var curByte = 0;
      var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
      var i2;
      for (i2 = 0; i2 < len2; i2 += 4) {
        tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
        arr[curByte++] = tmp >> 16 & 255;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 2) {
        tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
        arr[curByte++] = tmp & 255;
      }
      if (placeHoldersLen === 1) {
        tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
        arr[curByte++] = tmp >> 8 & 255;
        arr[curByte++] = tmp & 255;
      }
      return arr;
    }
    function tripletToBase64(num) {
      return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
    }
    function encodeChunk(uint8, start, end) {
      var tmp;
      var output = [];
      for (var i2 = start; i2 < end; i2 += 3) {
        tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
        output.push(tripletToBase64(tmp));
      }
      return output.join("");
    }
    function fromByteArray(uint8) {
      var tmp;
      var len2 = uint8.length;
      var extraBytes = len2 % 3;
      var parts = [];
      var maxChunkLength = 16383;
      for (var i2 = 0, len22 = len2 - extraBytes; i2 < len22; i2 += maxChunkLength) {
        parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
      }
      if (extraBytes === 1) {
        tmp = uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
        );
      } else if (extraBytes === 2) {
        tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
        parts.push(
          lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
        );
      }
      return parts.join("");
    }
    return base64Js;
  }
  var ieee754 = {};
  var hasRequiredIeee754;
  function requireIeee754() {
    if (hasRequiredIeee754) return ieee754;
    hasRequiredIeee754 = 1;
    ieee754.read = function(buffer2, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? nBytes - 1 : 0;
      var d = isLE ? -1 : 1;
      var s = buffer2[offset + i];
      i += d;
      e = s & (1 << -nBits) - 1;
      s >>= -nBits;
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer2[offset + i], i += d, nBits -= 8) {
      }
      m = e & (1 << -nBits) - 1;
      e >>= -nBits;
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer2[offset + i], i += d, nBits -= 8) {
      }
      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : (s ? -1 : 1) * Infinity;
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
    };
    ieee754.write = function(buffer2, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
      var i = isLE ? 0 : nBytes - 1;
      var d = isLE ? 1 : -1;
      var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
      value = Math.abs(value);
      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }
        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }
      for (; mLen >= 8; buffer2[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
      }
      e = e << mLen | m;
      eLen += mLen;
      for (; eLen > 0; buffer2[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
      }
      buffer2[offset + i - d] |= s * 128;
    };
    return ieee754;
  }
  var hasRequiredBuffer;
  function requireBuffer() {
    if (hasRequiredBuffer) return buffer;
    hasRequiredBuffer = 1;
    (function(exports$1) {
      const base64 = requireBase64Js();
      const ieee7542 = requireIeee754();
      const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
      exports$1.Buffer = Buffer2;
      exports$1.SlowBuffer = SlowBuffer;
      exports$1.INSPECT_MAX_BYTES = 50;
      const K_MAX_LENGTH = 2147483647;
      exports$1.kMaxLength = K_MAX_LENGTH;
      Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
      if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
        );
      }
      function typedArraySupport() {
        try {
          const arr = new Uint8Array(1);
          const proto = { foo: function() {
            return 42;
          } };
          Object.setPrototypeOf(proto, Uint8Array.prototype);
          Object.setPrototypeOf(arr, proto);
          return arr.foo() === 42;
        } catch (e) {
          return false;
        }
      }
      Object.defineProperty(Buffer2.prototype, "parent", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.buffer;
        }
      });
      Object.defineProperty(Buffer2.prototype, "offset", {
        enumerable: true,
        get: function() {
          if (!Buffer2.isBuffer(this)) return void 0;
          return this.byteOffset;
        }
      });
      function createBuffer(length) {
        if (length > K_MAX_LENGTH) {
          throw new RangeError('The value "' + length + '" is invalid for option "size"');
        }
        const buf = new Uint8Array(length);
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function Buffer2(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          if (typeof encodingOrOffset === "string") {
            throw new TypeError(
              'The "string" argument must be of type string. Received type number'
            );
          }
          return allocUnsafe(arg);
        }
        return from(arg, encodingOrOffset, length);
      }
      Buffer2.poolSize = 8192;
      function from(value, encodingOrOffset, length) {
        if (typeof value === "string") {
          return fromString(value, encodingOrOffset);
        }
        if (ArrayBuffer.isView(value)) {
          return fromArrayView(value);
        }
        if (value == null) {
          throw new TypeError(
            "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
          );
        }
        if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
          return fromArrayBuffer(value, encodingOrOffset, length);
        }
        if (typeof value === "number") {
          throw new TypeError(
            'The "value" argument must not be of type number. Received type number'
          );
        }
        const valueOf = value.valueOf && value.valueOf();
        if (valueOf != null && valueOf !== value) {
          return Buffer2.from(valueOf, encodingOrOffset, length);
        }
        const b = fromObject(value);
        if (b) return b;
        if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
          return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
        }
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
        );
      }
      Buffer2.from = function(value, encodingOrOffset, length) {
        return from(value, encodingOrOffset, length);
      };
      Object.setPrototypeOf(Buffer2.prototype, Uint8Array.prototype);
      Object.setPrototypeOf(Buffer2, Uint8Array);
      function assertSize(size) {
        if (typeof size !== "number") {
          throw new TypeError('"size" argument must be of type number');
        } else if (size < 0) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
      }
      function alloc(size, fill, encoding) {
        assertSize(size);
        if (size <= 0) {
          return createBuffer(size);
        }
        if (fill !== void 0) {
          return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
      }
      Buffer2.alloc = function(size, fill, encoding) {
        return alloc(size, fill, encoding);
      };
      function allocUnsafe(size) {
        assertSize(size);
        return createBuffer(size < 0 ? 0 : checked(size) | 0);
      }
      Buffer2.allocUnsafe = function(size) {
        return allocUnsafe(size);
      };
      Buffer2.allocUnsafeSlow = function(size) {
        return allocUnsafe(size);
      };
      function fromString(string, encoding) {
        if (typeof encoding !== "string" || encoding === "") {
          encoding = "utf8";
        }
        if (!Buffer2.isEncoding(encoding)) {
          throw new TypeError("Unknown encoding: " + encoding);
        }
        const length = byteLength(string, encoding) | 0;
        let buf = createBuffer(length);
        const actual = buf.write(string, encoding);
        if (actual !== length) {
          buf = buf.slice(0, actual);
        }
        return buf;
      }
      function fromArrayLike(array) {
        const length = array.length < 0 ? 0 : checked(array.length) | 0;
        const buf = createBuffer(length);
        for (let i = 0; i < length; i += 1) {
          buf[i] = array[i] & 255;
        }
        return buf;
      }
      function fromArrayView(arrayView) {
        if (isInstance(arrayView, Uint8Array)) {
          const copy = new Uint8Array(arrayView);
          return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
        }
        return fromArrayLike(arrayView);
      }
      function fromArrayBuffer(array, byteOffset, length) {
        if (byteOffset < 0 || array.byteLength < byteOffset) {
          throw new RangeError('"offset" is outside of buffer bounds');
        }
        if (array.byteLength < byteOffset + (length || 0)) {
          throw new RangeError('"length" is outside of buffer bounds');
        }
        let buf;
        if (byteOffset === void 0 && length === void 0) {
          buf = new Uint8Array(array);
        } else if (length === void 0) {
          buf = new Uint8Array(array, byteOffset);
        } else {
          buf = new Uint8Array(array, byteOffset, length);
        }
        Object.setPrototypeOf(buf, Buffer2.prototype);
        return buf;
      }
      function fromObject(obj) {
        if (Buffer2.isBuffer(obj)) {
          const len = checked(obj.length) | 0;
          const buf = createBuffer(len);
          if (buf.length === 0) {
            return buf;
          }
          obj.copy(buf, 0, 0, len);
          return buf;
        }
        if (obj.length !== void 0) {
          if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
            return createBuffer(0);
          }
          return fromArrayLike(obj);
        }
        if (obj.type === "Buffer" && Array.isArray(obj.data)) {
          return fromArrayLike(obj.data);
        }
      }
      function checked(length) {
        if (length >= K_MAX_LENGTH) {
          throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
        }
        return length | 0;
      }
      function SlowBuffer(length) {
        if (+length != length) {
          length = 0;
        }
        return Buffer2.alloc(+length);
      }
      Buffer2.isBuffer = function isBuffer(b) {
        return b != null && b._isBuffer === true && b !== Buffer2.prototype;
      };
      Buffer2.compare = function compare(a, b) {
        if (isInstance(a, Uint8Array)) a = Buffer2.from(a, a.offset, a.byteLength);
        if (isInstance(b, Uint8Array)) b = Buffer2.from(b, b.offset, b.byteLength);
        if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
          );
        }
        if (a === b) return 0;
        let x = a.length;
        let y = b.length;
        for (let i = 0, len = Math.min(x, y); i < len; ++i) {
          if (a[i] !== b[i]) {
            x = a[i];
            y = b[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      Buffer2.isEncoding = function isEncoding(encoding) {
        switch (String(encoding).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      };
      Buffer2.concat = function concat(list, length) {
        if (!Array.isArray(list)) {
          throw new TypeError('"list" argument must be an Array of Buffers');
        }
        if (list.length === 0) {
          return Buffer2.alloc(0);
        }
        let i;
        if (length === void 0) {
          length = 0;
          for (i = 0; i < list.length; ++i) {
            length += list[i].length;
          }
        }
        const buffer2 = Buffer2.allocUnsafe(length);
        let pos = 0;
        for (i = 0; i < list.length; ++i) {
          let buf = list[i];
          if (isInstance(buf, Uint8Array)) {
            if (pos + buf.length > buffer2.length) {
              if (!Buffer2.isBuffer(buf)) buf = Buffer2.from(buf);
              buf.copy(buffer2, pos);
            } else {
              Uint8Array.prototype.set.call(
                buffer2,
                buf,
                pos
              );
            }
          } else if (!Buffer2.isBuffer(buf)) {
            throw new TypeError('"list" argument must be an Array of Buffers');
          } else {
            buf.copy(buffer2, pos);
          }
          pos += buf.length;
        }
        return buffer2;
      };
      function byteLength(string, encoding) {
        if (Buffer2.isBuffer(string)) {
          return string.length;
        }
        if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
          return string.byteLength;
        }
        if (typeof string !== "string") {
          throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
          );
        }
        const len = string.length;
        const mustMatch = arguments.length > 2 && arguments[2] === true;
        if (!mustMatch && len === 0) return 0;
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "ascii":
            case "latin1":
            case "binary":
              return len;
            case "utf8":
            case "utf-8":
              return utf8ToBytes(string).length;
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return len * 2;
            case "hex":
              return len >>> 1;
            case "base64":
              return base64ToBytes(string).length;
            default:
              if (loweredCase) {
                return mustMatch ? -1 : utf8ToBytes(string).length;
              }
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.byteLength = byteLength;
      function slowToString(encoding, start, end) {
        let loweredCase = false;
        if (start === void 0 || start < 0) {
          start = 0;
        }
        if (start > this.length) {
          return "";
        }
        if (end === void 0 || end > this.length) {
          end = this.length;
        }
        if (end <= 0) {
          return "";
        }
        end >>>= 0;
        start >>>= 0;
        if (end <= start) {
          return "";
        }
        if (!encoding) encoding = "utf8";
        while (true) {
          switch (encoding) {
            case "hex":
              return hexSlice(this, start, end);
            case "utf8":
            case "utf-8":
              return utf8Slice(this, start, end);
            case "ascii":
              return asciiSlice(this, start, end);
            case "latin1":
            case "binary":
              return latin1Slice(this, start, end);
            case "base64":
              return base64Slice(this, start, end);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return utf16leSlice(this, start, end);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = (encoding + "").toLowerCase();
              loweredCase = true;
          }
        }
      }
      Buffer2.prototype._isBuffer = true;
      function swap(b, n, m) {
        const i = b[n];
        b[n] = b[m];
        b[m] = i;
      }
      Buffer2.prototype.swap16 = function swap16() {
        const len = this.length;
        if (len % 2 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        }
        for (let i = 0; i < len; i += 2) {
          swap(this, i, i + 1);
        }
        return this;
      };
      Buffer2.prototype.swap32 = function swap32() {
        const len = this.length;
        if (len % 4 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        }
        for (let i = 0; i < len; i += 4) {
          swap(this, i, i + 3);
          swap(this, i + 1, i + 2);
        }
        return this;
      };
      Buffer2.prototype.swap64 = function swap64() {
        const len = this.length;
        if (len % 8 !== 0) {
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        }
        for (let i = 0; i < len; i += 8) {
          swap(this, i, i + 7);
          swap(this, i + 1, i + 6);
          swap(this, i + 2, i + 5);
          swap(this, i + 3, i + 4);
        }
        return this;
      };
      Buffer2.prototype.toString = function toString() {
        const length = this.length;
        if (length === 0) return "";
        if (arguments.length === 0) return utf8Slice(this, 0, length);
        return slowToString.apply(this, arguments);
      };
      Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
      Buffer2.prototype.equals = function equals(b) {
        if (!Buffer2.isBuffer(b)) throw new TypeError("Argument must be a Buffer");
        if (this === b) return true;
        return Buffer2.compare(this, b) === 0;
      };
      Buffer2.prototype.inspect = function inspect2() {
        let str = "";
        const max = exports$1.INSPECT_MAX_BYTES;
        str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
        if (this.length > max) str += " ... ";
        return "<Buffer " + str + ">";
      };
      if (customInspectSymbol) {
        Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
      }
      Buffer2.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
        if (isInstance(target, Uint8Array)) {
          target = Buffer2.from(target, target.offset, target.byteLength);
        }
        if (!Buffer2.isBuffer(target)) {
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
          );
        }
        if (start === void 0) {
          start = 0;
        }
        if (end === void 0) {
          end = target ? target.length : 0;
        }
        if (thisStart === void 0) {
          thisStart = 0;
        }
        if (thisEnd === void 0) {
          thisEnd = this.length;
        }
        if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
          throw new RangeError("out of range index");
        }
        if (thisStart >= thisEnd && start >= end) {
          return 0;
        }
        if (thisStart >= thisEnd) {
          return -1;
        }
        if (start >= end) {
          return 1;
        }
        start >>>= 0;
        end >>>= 0;
        thisStart >>>= 0;
        thisEnd >>>= 0;
        if (this === target) return 0;
        let x = thisEnd - thisStart;
        let y = end - start;
        const len = Math.min(x, y);
        const thisCopy = this.slice(thisStart, thisEnd);
        const targetCopy = target.slice(start, end);
        for (let i = 0; i < len; ++i) {
          if (thisCopy[i] !== targetCopy[i]) {
            x = thisCopy[i];
            y = targetCopy[i];
            break;
          }
        }
        if (x < y) return -1;
        if (y < x) return 1;
        return 0;
      };
      function bidirectionalIndexOf(buffer2, val, byteOffset, encoding, dir) {
        if (buffer2.length === 0) return -1;
        if (typeof byteOffset === "string") {
          encoding = byteOffset;
          byteOffset = 0;
        } else if (byteOffset > 2147483647) {
          byteOffset = 2147483647;
        } else if (byteOffset < -2147483648) {
          byteOffset = -2147483648;
        }
        byteOffset = +byteOffset;
        if (numberIsNaN(byteOffset)) {
          byteOffset = dir ? 0 : buffer2.length - 1;
        }
        if (byteOffset < 0) byteOffset = buffer2.length + byteOffset;
        if (byteOffset >= buffer2.length) {
          if (dir) return -1;
          else byteOffset = buffer2.length - 1;
        } else if (byteOffset < 0) {
          if (dir) byteOffset = 0;
          else return -1;
        }
        if (typeof val === "string") {
          val = Buffer2.from(val, encoding);
        }
        if (Buffer2.isBuffer(val)) {
          if (val.length === 0) {
            return -1;
          }
          return arrayIndexOf(buffer2, val, byteOffset, encoding, dir);
        } else if (typeof val === "number") {
          val = val & 255;
          if (typeof Uint8Array.prototype.indexOf === "function") {
            if (dir) {
              return Uint8Array.prototype.indexOf.call(buffer2, val, byteOffset);
            } else {
              return Uint8Array.prototype.lastIndexOf.call(buffer2, val, byteOffset);
            }
          }
          return arrayIndexOf(buffer2, [val], byteOffset, encoding, dir);
        }
        throw new TypeError("val must be string, number or Buffer");
      }
      function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
        let indexSize = 1;
        let arrLength = arr.length;
        let valLength = val.length;
        if (encoding !== void 0) {
          encoding = String(encoding).toLowerCase();
          if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
            if (arr.length < 2 || val.length < 2) {
              return -1;
            }
            indexSize = 2;
            arrLength /= 2;
            valLength /= 2;
            byteOffset /= 2;
          }
        }
        function read(buf, i2) {
          if (indexSize === 1) {
            return buf[i2];
          } else {
            return buf.readUInt16BE(i2 * indexSize);
          }
        }
        let i;
        if (dir) {
          let foundIndex = -1;
          for (i = byteOffset; i < arrLength; i++) {
            if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
              if (foundIndex === -1) foundIndex = i;
              if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
            } else {
              if (foundIndex !== -1) i -= i - foundIndex;
              foundIndex = -1;
            }
          }
        } else {
          if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
          for (i = byteOffset; i >= 0; i--) {
            let found = true;
            for (let j = 0; j < valLength; j++) {
              if (read(arr, i + j) !== read(val, j)) {
                found = false;
                break;
              }
            }
            if (found) return i;
          }
        }
        return -1;
      }
      Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
        return this.indexOf(val, byteOffset, encoding) !== -1;
      };
      Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
      };
      Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
        return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
      };
      function hexWrite(buf, string, offset, length) {
        offset = Number(offset) || 0;
        const remaining = buf.length - offset;
        if (!length) {
          length = remaining;
        } else {
          length = Number(length);
          if (length > remaining) {
            length = remaining;
          }
        }
        const strLen = string.length;
        if (length > strLen / 2) {
          length = strLen / 2;
        }
        let i;
        for (i = 0; i < length; ++i) {
          const parsed = parseInt(string.substr(i * 2, 2), 16);
          if (numberIsNaN(parsed)) return i;
          buf[offset + i] = parsed;
        }
        return i;
      }
      function utf8Write(buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
      }
      function asciiWrite(buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length);
      }
      function base64Write(buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length);
      }
      function ucs2Write(buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
      }
      Buffer2.prototype.write = function write(string, offset, length, encoding) {
        if (offset === void 0) {
          encoding = "utf8";
          length = this.length;
          offset = 0;
        } else if (length === void 0 && typeof offset === "string") {
          encoding = offset;
          length = this.length;
          offset = 0;
        } else if (isFinite(offset)) {
          offset = offset >>> 0;
          if (isFinite(length)) {
            length = length >>> 0;
            if (encoding === void 0) encoding = "utf8";
          } else {
            encoding = length;
            length = void 0;
          }
        } else {
          throw new Error(
            "Buffer.write(string, encoding, offset[, length]) is no longer supported"
          );
        }
        const remaining = this.length - offset;
        if (length === void 0 || length > remaining) length = remaining;
        if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
          throw new RangeError("Attempt to write outside buffer bounds");
        }
        if (!encoding) encoding = "utf8";
        let loweredCase = false;
        for (; ; ) {
          switch (encoding) {
            case "hex":
              return hexWrite(this, string, offset, length);
            case "utf8":
            case "utf-8":
              return utf8Write(this, string, offset, length);
            case "ascii":
            case "latin1":
            case "binary":
              return asciiWrite(this, string, offset, length);
            case "base64":
              return base64Write(this, string, offset, length);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return ucs2Write(this, string, offset, length);
            default:
              if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
              encoding = ("" + encoding).toLowerCase();
              loweredCase = true;
          }
        }
      };
      Buffer2.prototype.toJSON = function toJSON() {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0)
        };
      };
      function base64Slice(buf, start, end) {
        if (start === 0 && end === buf.length) {
          return base64.fromByteArray(buf);
        } else {
          return base64.fromByteArray(buf.slice(start, end));
        }
      }
      function utf8Slice(buf, start, end) {
        end = Math.min(buf.length, end);
        const res = [];
        let i = start;
        while (i < end) {
          const firstByte = buf[i];
          let codePoint = null;
          let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
          if (i + bytesPerSequence <= end) {
            let secondByte, thirdByte, fourthByte, tempCodePoint;
            switch (bytesPerSequence) {
              case 1:
                if (firstByte < 128) {
                  codePoint = firstByte;
                }
                break;
              case 2:
                secondByte = buf[i + 1];
                if ((secondByte & 192) === 128) {
                  tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
                  if (tempCodePoint > 127) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 3:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
                  if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                    codePoint = tempCodePoint;
                  }
                }
                break;
              case 4:
                secondByte = buf[i + 1];
                thirdByte = buf[i + 2];
                fourthByte = buf[i + 3];
                if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
                  tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
                  if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                    codePoint = tempCodePoint;
                  }
                }
            }
          }
          if (codePoint === null) {
            codePoint = 65533;
            bytesPerSequence = 1;
          } else if (codePoint > 65535) {
            codePoint -= 65536;
            res.push(codePoint >>> 10 & 1023 | 55296);
            codePoint = 56320 | codePoint & 1023;
          }
          res.push(codePoint);
          i += bytesPerSequence;
        }
        return decodeCodePointsArray(res);
      }
      const MAX_ARGUMENTS_LENGTH = 4096;
      function decodeCodePointsArray(codePoints) {
        const len = codePoints.length;
        if (len <= MAX_ARGUMENTS_LENGTH) {
          return String.fromCharCode.apply(String, codePoints);
        }
        let res = "";
        let i = 0;
        while (i < len) {
          res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
          );
        }
        return res;
      }
      function asciiSlice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i] & 127);
        }
        return ret;
      }
      function latin1Slice(buf, start, end) {
        let ret = "";
        end = Math.min(buf.length, end);
        for (let i = start; i < end; ++i) {
          ret += String.fromCharCode(buf[i]);
        }
        return ret;
      }
      function hexSlice(buf, start, end) {
        const len = buf.length;
        if (!start || start < 0) start = 0;
        if (!end || end < 0 || end > len) end = len;
        let out = "";
        for (let i = start; i < end; ++i) {
          out += hexSliceLookupTable[buf[i]];
        }
        return out;
      }
      function utf16leSlice(buf, start, end) {
        const bytes = buf.slice(start, end);
        let res = "";
        for (let i = 0; i < bytes.length - 1; i += 2) {
          res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
        }
        return res;
      }
      Buffer2.prototype.slice = function slice(start, end) {
        const len = this.length;
        start = ~~start;
        end = end === void 0 ? len : ~~end;
        if (start < 0) {
          start += len;
          if (start < 0) start = 0;
        } else if (start > len) {
          start = len;
        }
        if (end < 0) {
          end += len;
          if (end < 0) end = 0;
        } else if (end > len) {
          end = len;
        }
        if (end < start) end = start;
        const newBuf = this.subarray(start, end);
        Object.setPrototypeOf(newBuf, Buffer2.prototype);
        return newBuf;
      };
      function checkOffset(offset, ext, length) {
        if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
        if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
      }
      Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          checkOffset(offset, byteLength2, this.length);
        }
        let val = this[offset + --byteLength2];
        let mul = 1;
        while (byteLength2 > 0 && (mul *= 256)) {
          val += this[offset + --byteLength2] * mul;
        }
        return val;
      };
      Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        return this[offset];
      };
      Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] | this[offset + 1] << 8;
      };
      Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        return this[offset] << 8 | this[offset + 1];
      };
      Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
      };
      Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
      };
      Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
        const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
        return BigInt(lo) + (BigInt(hi) << BigInt(32));
      });
      Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
        return (BigInt(hi) << BigInt(32)) + BigInt(lo);
      });
      Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let val = this[offset];
        let mul = 1;
        let i = 0;
        while (++i < byteLength2 && (mul *= 256)) {
          val += this[offset + i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) checkOffset(offset, byteLength2, this.length);
        let i = byteLength2;
        let mul = 1;
        let val = this[offset + --i];
        while (i > 0 && (mul *= 256)) {
          val += this[offset + --i] * mul;
        }
        mul *= 128;
        if (val >= mul) val -= Math.pow(2, 8 * byteLength2);
        return val;
      };
      Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 1, this.length);
        if (!(this[offset] & 128)) return this[offset];
        return (255 - this[offset] + 1) * -1;
      };
      Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset] | this[offset + 1] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 2, this.length);
        const val = this[offset + 1] | this[offset] << 8;
        return val & 32768 ? val | 4294901760 : val;
      };
      Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
      };
      Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
      };
      Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
        return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
      });
      Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
        offset = offset >>> 0;
        validateNumber(offset, "offset");
        const first = this[offset];
        const last = this[offset + 7];
        if (first === void 0 || last === void 0) {
          boundsError(offset, this.length - 8);
        }
        const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
        return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
      });
      Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee7542.read(this, offset, true, 23, 4);
      };
      Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 4, this.length);
        return ieee7542.read(this, offset, false, 23, 4);
      };
      Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee7542.read(this, offset, true, 52, 8);
      };
      Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
        offset = offset >>> 0;
        if (!noAssert) checkOffset(offset, 8, this.length);
        return ieee7542.read(this, offset, false, 52, 8);
      };
      function checkInt(buf, value, offset, ext, max, min) {
        if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
      }
      Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let mul = 1;
        let i = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        byteLength2 = byteLength2 >>> 0;
        if (!noAssert) {
          const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
          checkInt(this, value, offset, byteLength2, maxBytes, 0);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          this[offset + i] = value / mul & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset + 3] = value >>> 24;
        this[offset + 2] = value >>> 16;
        this[offset + 1] = value >>> 8;
        this[offset] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      function wrtBigUInt64LE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        lo = lo >> 8;
        buf[offset++] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        hi = hi >> 8;
        buf[offset++] = hi;
        return offset;
      }
      function wrtBigUInt64BE(buf, value, offset, min, max) {
        checkIntBI(value, min, max, buf, offset, 7);
        let lo = Number(value & BigInt(4294967295));
        buf[offset + 7] = lo;
        lo = lo >> 8;
        buf[offset + 6] = lo;
        lo = lo >> 8;
        buf[offset + 5] = lo;
        lo = lo >> 8;
        buf[offset + 4] = lo;
        let hi = Number(value >> BigInt(32) & BigInt(4294967295));
        buf[offset + 3] = hi;
        hi = hi >> 8;
        buf[offset + 2] = hi;
        hi = hi >> 8;
        buf[offset + 1] = hi;
        hi = hi >> 8;
        buf[offset] = hi;
        return offset + 8;
      }
      Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
      });
      Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = 0;
        let mul = 1;
        let sub = 0;
        this[offset] = value & 255;
        while (++i < byteLength2 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          const limit = Math.pow(2, 8 * byteLength2 - 1);
          checkInt(this, value, offset, byteLength2, limit - 1, -limit);
        }
        let i = byteLength2 - 1;
        let mul = 1;
        let sub = 0;
        this[offset + i] = value & 255;
        while (--i >= 0 && (mul *= 256)) {
          if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
            sub = 1;
          }
          this[offset + i] = (value / mul >> 0) - sub & 255;
        }
        return offset + byteLength2;
      };
      Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
        if (value < 0) value = 255 + value + 1;
        this[offset] = value & 255;
        return offset + 1;
      };
      Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        return offset + 2;
      };
      Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
        this[offset] = value >>> 8;
        this[offset + 1] = value & 255;
        return offset + 2;
      };
      Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        this[offset] = value & 255;
        this[offset + 1] = value >>> 8;
        this[offset + 2] = value >>> 16;
        this[offset + 3] = value >>> 24;
        return offset + 4;
      };
      Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
        if (value < 0) value = 4294967295 + value + 1;
        this[offset] = value >>> 24;
        this[offset + 1] = value >>> 16;
        this[offset + 2] = value >>> 8;
        this[offset + 3] = value & 255;
        return offset + 4;
      };
      Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
        return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
        return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      });
      function checkIEEE754(buf, value, offset, ext, max, min) {
        if (offset + ext > buf.length) throw new RangeError("Index out of range");
        if (offset < 0) throw new RangeError("Index out of range");
      }
      function writeFloat(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 4);
        }
        ieee7542.write(buf, value, offset, littleEndian, 23, 4);
        return offset + 4;
      }
      Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert);
      };
      function writeDouble(buf, value, offset, littleEndian, noAssert) {
        value = +value;
        offset = offset >>> 0;
        if (!noAssert) {
          checkIEEE754(buf, value, offset, 8);
        }
        ieee7542.write(buf, value, offset, littleEndian, 52, 8);
        return offset + 8;
      }
      Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert);
      };
      Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert);
      };
      Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
        if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;
        if (targetStart < 0) {
          throw new RangeError("targetStart out of bounds");
        }
        if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
        if (end < 0) throw new RangeError("sourceEnd out of bounds");
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start) {
          end = target.length - targetStart + start;
        }
        const len = end - start;
        if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
          this.copyWithin(targetStart, start, end);
        } else {
          Uint8Array.prototype.set.call(
            target,
            this.subarray(start, end),
            targetStart
          );
        }
        return len;
      };
      Buffer2.prototype.fill = function fill(val, start, end, encoding) {
        if (typeof val === "string") {
          if (typeof start === "string") {
            encoding = start;
            start = 0;
            end = this.length;
          } else if (typeof end === "string") {
            encoding = end;
            end = this.length;
          }
          if (encoding !== void 0 && typeof encoding !== "string") {
            throw new TypeError("encoding must be a string");
          }
          if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
            throw new TypeError("Unknown encoding: " + encoding);
          }
          if (val.length === 1) {
            const code = val.charCodeAt(0);
            if (encoding === "utf8" && code < 128 || encoding === "latin1") {
              val = code;
            }
          }
        } else if (typeof val === "number") {
          val = val & 255;
        } else if (typeof val === "boolean") {
          val = Number(val);
        }
        if (start < 0 || this.length < start || this.length < end) {
          throw new RangeError("Out of range index");
        }
        if (end <= start) {
          return this;
        }
        start = start >>> 0;
        end = end === void 0 ? this.length : end >>> 0;
        if (!val) val = 0;
        let i;
        if (typeof val === "number") {
          for (i = start; i < end; ++i) {
            this[i] = val;
          }
        } else {
          const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
          const len = bytes.length;
          if (len === 0) {
            throw new TypeError('The value "' + val + '" is invalid for argument "value"');
          }
          for (i = 0; i < end - start; ++i) {
            this[i + start] = bytes[i % len];
          }
        }
        return this;
      };
      const errors2 = {};
      function E(sym, getMessage, Base) {
        errors2[sym] = class NodeError extends Base {
          constructor() {
            super();
            Object.defineProperty(this, "message", {
              value: getMessage.apply(this, arguments),
              writable: true,
              configurable: true
            });
            this.name = `${this.name} [${sym}]`;
            this.stack;
            delete this.name;
          }
          get code() {
            return sym;
          }
          set code(value) {
            Object.defineProperty(this, "code", {
              configurable: true,
              enumerable: true,
              value,
              writable: true
            });
          }
          toString() {
            return `${this.name} [${sym}]: ${this.message}`;
          }
        };
      }
      E(
        "ERR_BUFFER_OUT_OF_BOUNDS",
        function(name) {
          if (name) {
            return `${name} is outside of buffer bounds`;
          }
          return "Attempt to access memory outside buffer bounds";
        },
        RangeError
      );
      E(
        "ERR_INVALID_ARG_TYPE",
        function(name, actual) {
          return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
        },
        TypeError
      );
      E(
        "ERR_OUT_OF_RANGE",
        function(str, range, input) {
          let msg = `The value of "${str}" is out of range.`;
          let received = input;
          if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
            received = addNumericalSeparator(String(input));
          } else if (typeof input === "bigint") {
            received = String(input);
            if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
              received = addNumericalSeparator(received);
            }
            received += "n";
          }
          msg += ` It must be ${range}. Received ${received}`;
          return msg;
        },
        RangeError
      );
      function addNumericalSeparator(val) {
        let res = "";
        let i = val.length;
        const start = val[0] === "-" ? 1 : 0;
        for (; i >= start + 4; i -= 3) {
          res = `_${val.slice(i - 3, i)}${res}`;
        }
        return `${val.slice(0, i)}${res}`;
      }
      function checkBounds(buf, offset, byteLength2) {
        validateNumber(offset, "offset");
        if (buf[offset] === void 0 || buf[offset + byteLength2] === void 0) {
          boundsError(offset, buf.length - (byteLength2 + 1));
        }
      }
      function checkIntBI(value, min, max, buf, offset, byteLength2) {
        if (value > max || value < min) {
          const n = typeof min === "bigint" ? "n" : "";
          let range;
          {
            if (min === 0 || min === BigInt(0)) {
              range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
            } else {
              range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ${(byteLength2 + 1) * 8 - 1}${n}`;
            }
          }
          throw new errors2.ERR_OUT_OF_RANGE("value", range, value);
        }
        checkBounds(buf, offset, byteLength2);
      }
      function validateNumber(value, name) {
        if (typeof value !== "number") {
          throw new errors2.ERR_INVALID_ARG_TYPE(name, "number", value);
        }
      }
      function boundsError(value, length, type) {
        if (Math.floor(value) !== value) {
          validateNumber(value, type);
          throw new errors2.ERR_OUT_OF_RANGE("offset", "an integer", value);
        }
        if (length < 0) {
          throw new errors2.ERR_BUFFER_OUT_OF_BOUNDS();
        }
        throw new errors2.ERR_OUT_OF_RANGE(
          "offset",
          `>= ${0} and <= ${length}`,
          value
        );
      }
      const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
      function base64clean(str) {
        str = str.split("=")[0];
        str = str.trim().replace(INVALID_BASE64_RE, "");
        if (str.length < 2) return "";
        while (str.length % 4 !== 0) {
          str = str + "=";
        }
        return str;
      }
      function utf8ToBytes(string, units) {
        units = units || Infinity;
        let codePoint;
        const length = string.length;
        let leadSurrogate = null;
        const bytes = [];
        for (let i = 0; i < length; ++i) {
          codePoint = string.charCodeAt(i);
          if (codePoint > 55295 && codePoint < 57344) {
            if (!leadSurrogate) {
              if (codePoint > 56319) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              } else if (i + 1 === length) {
                if ((units -= 3) > -1) bytes.push(239, 191, 189);
                continue;
              }
              leadSurrogate = codePoint;
              continue;
            }
            if (codePoint < 56320) {
              if ((units -= 3) > -1) bytes.push(239, 191, 189);
              leadSurrogate = codePoint;
              continue;
            }
            codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
          } else if (leadSurrogate) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
          }
          leadSurrogate = null;
          if (codePoint < 128) {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
          } else if (codePoint < 2048) {
            if ((units -= 2) < 0) break;
            bytes.push(
              codePoint >> 6 | 192,
              codePoint & 63 | 128
            );
          } else if (codePoint < 65536) {
            if ((units -= 3) < 0) break;
            bytes.push(
              codePoint >> 12 | 224,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else if (codePoint < 1114112) {
            if ((units -= 4) < 0) break;
            bytes.push(
              codePoint >> 18 | 240,
              codePoint >> 12 & 63 | 128,
              codePoint >> 6 & 63 | 128,
              codePoint & 63 | 128
            );
          } else {
            throw new Error("Invalid code point");
          }
        }
        return bytes;
      }
      function asciiToBytes(str) {
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          byteArray.push(str.charCodeAt(i) & 255);
        }
        return byteArray;
      }
      function utf16leToBytes(str, units) {
        let c, hi, lo;
        const byteArray = [];
        for (let i = 0; i < str.length; ++i) {
          if ((units -= 2) < 0) break;
          c = str.charCodeAt(i);
          hi = c >> 8;
          lo = c % 256;
          byteArray.push(lo);
          byteArray.push(hi);
        }
        return byteArray;
      }
      function base64ToBytes(str) {
        return base64.toByteArray(base64clean(str));
      }
      function blitBuffer(src, dst, offset, length) {
        let i;
        for (i = 0; i < length; ++i) {
          if (i + offset >= dst.length || i >= src.length) break;
          dst[i + offset] = src[i];
        }
        return i;
      }
      function isInstance(obj, type) {
        return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
      }
      function numberIsNaN(obj) {
        return obj !== obj;
      }
      const hexSliceLookupTable = (function() {
        const alphabet = "0123456789abcdef";
        const table = new Array(256);
        for (let i = 0; i < 16; ++i) {
          const i16 = i * 16;
          for (let j = 0; j < 16; ++j) {
            table[i16 + j] = alphabet[i] + alphabet[j];
          }
        }
        return table;
      })();
      function defineBigIntMethod(fn) {
        return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
      }
      function BufferBigIntNotDefined() {
        throw new Error("BigInt not supported");
      }
    })(buffer);
    return buffer;
  }
  var bufferExports = requireBuffer();
  const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#", XSD = "http://www.w3.org/2001/XMLSchema#", SWAP = "http://www.w3.org/2000/10/swap/";
  const namespaces = {
    xsd: {
      decimal: `${XSD}decimal`,
      boolean: `${XSD}boolean`,
      double: `${XSD}double`,
      integer: `${XSD}integer`,
      string: `${XSD}string`
    },
    rdf: {
      type: `${RDF}type`,
      nil: `${RDF}nil`,
      first: `${RDF}first`,
      rest: `${RDF}rest`,
      langString: `${RDF}langString`,
      dirLangString: `${RDF}dirLangString`,
      reifies: `${RDF}reifies`
    },
    owl: {
      sameAs: "http://www.w3.org/2002/07/owl#sameAs"
    },
    r: {
      forSome: `${SWAP}reify#forSome`,
      forAll: `${SWAP}reify#forAll`
    },
    log: {
      implies: `${SWAP}log#implies`,
      isImpliedBy: `${SWAP}log#isImpliedBy`
    }
  };
  const { xsd: xsd$2 } = namespaces;
  const escapeSequence = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\([^])/g;
  const escapeReplacements = {
    "\\": "\\",
    "'": "'",
    '"': '"',
    "n": "\n",
    "r": "\r",
    "t": "	",
    "f": "\f",
    "b": "\b",
    "_": "_",
    "~": "~",
    ".": ".",
    "-": "-",
    "!": "!",
    "$": "$",
    "&": "&",
    "(": "(",
    ")": ")",
    "*": "*",
    "+": "+",
    ",": ",",
    ";": ";",
    "=": "=",
    "/": "/",
    "?": "?",
    "#": "#",
    "@": "@",
    "%": "%"
  };
  const illegalIriChars = /[\x00-\x20<>\\"\{\}\|\^\`]/;
  const lineModeRegExps = {
    _iri: true,
    _unescapedIri: true,
    _simpleQuotedString: true,
    _langcode: true,
    _dircode: true,
    _blank: true,
    _newline: true,
    _comment: true,
    _whitespace: true,
    _endOfFile: true
  };
  const invalidRegExp = /$0^/;
  class N3Lexer {
    constructor(options) {
      this._iri = /^<((?:[^ <>{}\\]|\\[uU])+)>[ \t]*/;
      this._unescapedIri = /^<([^\x00-\x20<>\\"\{\}\|\^\`]*)>[ \t]*/;
      this._simpleQuotedString = /^"([^"\\\r\n]*)"(?=[^"])/;
      this._simpleApostropheString = /^'([^'\\\r\n]*)'(?=[^'])/;
      this._langcode = /^@([a-z]+(?:-[a-z0-9]+)*)(?=[^a-z0-9])/i;
      this._dircode = /^--(ltr)|(rtl)/;
      this._prefix = /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:(?=[#\s<])/;
      this._prefixed = /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:((?:(?:[0-:A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])(?:(?:[\.\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])*(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~]))?)?)(?:[ \t]+|(?=\.?[,;!\^\s#()\[\]\{\}"'<>]))/;
      this._variable = /^\?(?:(?:[A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?=[.,;!\^\s#()\[\]\{\}"'<>])/;
      this._blank = /^_:((?:[0-9A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?:[ \t]+|(?=\.?[,;:\s#()\[\]\{\}"'<>]))/;
      this._number = /^[\-+]?(?:(\d+\.\d*|\.?\d+)[eE][\-+]?|\d*(\.)?)\d+(?=\.?[,;:\s#()\[\]\{\}"'<>])/;
      this._boolean = /^(?:true|false)(?=[.,;\s#()\[\]\{\}"'<>])/;
      this._atKeyword = /^@[a-z]+(?=[\s#<:])/i;
      this._keyword = /^(?:PREFIX|BASE|VERSION|GRAPH)(?=[\s#<])/i;
      this._shortPredicates = /^a(?=[\s#()\[\]\{\}"'<>])/;
      this._newline = /^[ \t]*(?:#[^\n\r]*)?(?:\r\n|\n|\r)[ \t]*/;
      this._comment = /#([^\n\r]*)/;
      this._whitespace = /^[ \t]+/;
      this._endOfFile = /^(?:#[^\n\r]*)?$/;
      options = options || {};
      this._isImpliedBy = options.isImpliedBy;
      if (this._lineMode = !!options.lineMode) {
        this._n3Mode = false;
        for (const key in this) {
          if (!(key in lineModeRegExps) && this[key] instanceof RegExp)
            this[key] = invalidRegExp;
        }
      } else {
        this._n3Mode = options.n3 !== false;
      }
      this.comments = !!options.comments;
      this._literalClosingPos = 0;
    }
    // ## Private methods
    // ### `_tokenizeToEnd` tokenizes as for as possible, emitting tokens through the callback
    _tokenizeToEnd(callback, inputFinished) {
      let input = this._input;
      let currentLineLength = input.length;
      while (true) {
        let whiteSpaceMatch, comment;
        while (whiteSpaceMatch = this._newline.exec(input)) {
          if (this.comments && (comment = this._comment.exec(whiteSpaceMatch[0])))
            emitToken("comment", comment[1], "", this._line, whiteSpaceMatch[0].length);
          input = input.substr(whiteSpaceMatch[0].length, input.length);
          currentLineLength = input.length;
          this._line++;
        }
        if (!whiteSpaceMatch && (whiteSpaceMatch = this._whitespace.exec(input)))
          input = input.substr(whiteSpaceMatch[0].length, input.length);
        if (this._endOfFile.test(input)) {
          if (inputFinished) {
            if (this.comments && (comment = this._comment.exec(input)))
              emitToken("comment", comment[1], "", this._line, input.length);
            input = null;
            emitToken("eof", "", "", this._line, 0);
          }
          return this._input = input;
        }
        const line = this._line, firstChar = input[0];
        let type = "", value = "", prefix = "", match = null, matchLength = 0, inconclusive = false;
        switch (firstChar) {
          case "^":
            if (input.length < 3)
              break;
            else if (input[1] === "^") {
              this._previousMarker = "^^";
              input = input.substr(2);
              if (input[0] !== "<") {
                inconclusive = true;
                break;
              }
            } else {
              if (this._n3Mode) {
                matchLength = 1;
                type = "^";
              }
              break;
            }
          // Fall through in case the type is an IRI
          case "<":
            if (match = this._unescapedIri.exec(input))
              type = "IRI", value = match[1];
            else if (match = this._iri.exec(input)) {
              value = this._unescape(match[1]);
              if (value === null || illegalIriChars.test(value))
                return reportSyntaxError(this);
              type = "IRI";
            } else if (input.length > 2 && input[1] === "<" && input[2] === "(")
              type = "<<(", matchLength = 3;
            else if (!this._lineMode && input.length > (inputFinished ? 1 : 2) && input[1] === "<")
              type = "<<", matchLength = 2;
            else if (this._n3Mode && input.length > 1 && input[1] === "=") {
              matchLength = 2;
              if (this._isImpliedBy) type = "abbreviation", value = "<";
              else type = "inverse", value = ">";
            }
            break;
          case ">":
            if (input.length > 1 && input[1] === ">")
              type = ">>", matchLength = 2;
            break;
          case "_":
            if ((match = this._blank.exec(input)) || inputFinished && (match = this._blank.exec(`${input} `)))
              type = "blank", prefix = "_", value = match[1];
            break;
          case '"':
            if (match = this._simpleQuotedString.exec(input))
              value = match[1];
            else {
              ({ value, matchLength } = this._parseLiteral(input));
              if (value === null)
                return reportSyntaxError(this);
            }
            if (match !== null || matchLength !== 0) {
              type = "literal";
              this._literalClosingPos = 0;
            }
            break;
          case "'":
            if (!this._lineMode) {
              if (match = this._simpleApostropheString.exec(input))
                value = match[1];
              else {
                ({ value, matchLength } = this._parseLiteral(input));
                if (value === null)
                  return reportSyntaxError(this);
              }
              if (match !== null || matchLength !== 0) {
                type = "literal";
                this._literalClosingPos = 0;
              }
            }
            break;
          case "?":
            if (this._n3Mode && (match = this._variable.exec(input)))
              type = "var", value = match[0];
            break;
          case "@":
            if (this._previousMarker === "literal" && (match = this._langcode.exec(input)) && match[1] !== "version")
              type = "langcode", value = match[1];
            else if (match = this._atKeyword.exec(input))
              type = match[0];
            break;
          case ".":
            if (input.length === 1 ? inputFinished : input[1] < "0" || input[1] > "9") {
              type = ".";
              matchLength = 1;
              break;
            }
          // Fall through to numerical case (could be a decimal dot)
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
          case "+":
          case "-":
            if (input[1] === "-") {
              if (this._previousMarker === "langcode" && (match = this._dircode.exec(input)))
                type = "dircode", matchLength = 2, value = match[1] || match[2], matchLength = value.length + 2;
              break;
            }
            if (match = this._number.exec(input) || inputFinished && (match = this._number.exec(`${input} `))) {
              type = "literal", value = match[0];
              prefix = typeof match[1] === "string" ? xsd$2.double : typeof match[2] === "string" ? xsd$2.decimal : xsd$2.integer;
            }
            break;
          case "B":
          case "b":
          case "p":
          case "P":
          case "G":
          case "g":
          case "V":
          case "v":
            if (match = this._keyword.exec(input))
              type = match[0].toUpperCase();
            else
              inconclusive = true;
            break;
          case "f":
          case "t":
            if (match = this._boolean.exec(input))
              type = "literal", value = match[0], prefix = xsd$2.boolean;
            else
              inconclusive = true;
            break;
          case "a":
            if (match = this._shortPredicates.exec(input))
              type = "abbreviation", value = "a";
            else
              inconclusive = true;
            break;
          case "=":
            if (this._n3Mode && input.length > 1) {
              type = "abbreviation";
              if (input[1] !== ">")
                matchLength = 1, value = "=";
              else
                matchLength = 2, value = ">";
            }
            break;
          case "!":
            if (!this._n3Mode)
              break;
          case ")":
            if (!inputFinished && (input.length === 1 || input.length === 2 && input[1] === ">")) {
              break;
            }
            if (input.length > 2 && input[1] === ">" && input[2] === ">") {
              type = ")>>", matchLength = 3;
              break;
            }
          case ",":
          case ";":
          case "[":
          case "]":
          case "(":
          case "}":
          case "~":
            if (!this._lineMode) {
              matchLength = 1;
              type = firstChar;
            }
            break;
          case "{":
            if (!this._lineMode && input.length >= 2) {
              if (input[1] === "|")
                type = "{|", matchLength = 2;
              else
                type = firstChar, matchLength = 1;
            }
            break;
          case "|":
            if (input.length >= 2 && input[1] === "}")
              type = "|}", matchLength = 2;
            break;
          default:
            inconclusive = true;
        }
        if (inconclusive) {
          if ((this._previousMarker === "@prefix" || this._previousMarker === "PREFIX") && (match = this._prefix.exec(input)))
            type = "prefix", value = match[1] || "";
          else if ((match = this._prefixed.exec(input)) || inputFinished && (match = this._prefixed.exec(`${input} `)))
            type = "prefixed", prefix = match[1] || "", value = this._unescape(match[2]);
        }
        if (this._previousMarker === "^^") {
          switch (type) {
            case "prefixed":
              type = "type";
              break;
            case "IRI":
              type = "typeIRI";
              break;
            default:
              type = "";
          }
        }
        if (!type) {
          if (inputFinished || !/^'''|^"""/.test(input) && /\n|\r/.test(input))
            return reportSyntaxError(this);
          else
            return this._input = input;
        }
        const length = matchLength || match[0].length;
        const token = emitToken(type, value, prefix, line, length);
        this.previousToken = token;
        this._previousMarker = type;
        input = input.substr(length, input.length);
      }
      function emitToken(type, value, prefix, line, length) {
        const start = input ? currentLineLength - input.length : currentLineLength;
        const end = start + length;
        const token = { type, value, prefix, line, start, end };
        callback(null, token);
        return token;
      }
      function reportSyntaxError(self2) {
        callback(self2._syntaxError(/^\S*/.exec(input)[0]));
      }
    }
    // ### `_unescape` replaces N3 escape codes by their corresponding characters
    _unescape(item) {
      let invalid = false;
      const replaced = item.replace(escapeSequence, (sequence, unicode4, unicode8, escapedChar) => {
        if (typeof unicode4 === "string")
          return String.fromCharCode(Number.parseInt(unicode4, 16));
        if (typeof unicode8 === "string") {
          let charCode = Number.parseInt(unicode8, 16);
          return charCode <= 65535 ? String.fromCharCode(Number.parseInt(unicode8, 16)) : String.fromCharCode(55296 + ((charCode -= 65536) >> 10), 56320 + (charCode & 1023));
        }
        if (escapedChar in escapeReplacements)
          return escapeReplacements[escapedChar];
        invalid = true;
        return "";
      });
      return invalid ? null : replaced;
    }
    // ### `_parseLiteral` parses a literal into an unescaped value
    _parseLiteral(input) {
      if (input.length >= 3) {
        const opening = input.match(/^(?:"""|"|'''|'|)/)[0];
        const openingLength = opening.length;
        let closingPos = Math.max(this._literalClosingPos, openingLength);
        while ((closingPos = input.indexOf(opening, closingPos)) > 0) {
          let backslashCount = 0;
          while (input[closingPos - backslashCount - 1] === "\\")
            backslashCount++;
          if (backslashCount % 2 === 0) {
            const raw = input.substring(openingLength, closingPos);
            const lines = raw.split(/\r\n|\r|\n/).length - 1;
            const matchLength = closingPos + openingLength;
            if (openingLength === 1 && lines !== 0 || openingLength === 3 && this._lineMode)
              break;
            this._line += lines;
            return { value: this._unescape(raw), matchLength };
          }
          closingPos++;
        }
        this._literalClosingPos = input.length - openingLength + 1;
      }
      return { value: "", matchLength: 0 };
    }
    // ### `_syntaxError` creates a syntax error for the given issue
    _syntaxError(issue) {
      this._input = null;
      const err = new Error(`Unexpected "${issue}" on line ${this._line}.`);
      err.context = {
        token: void 0,
        line: this._line,
        previousToken: this.previousToken
      };
      return err;
    }
    // ### Strips off any starting UTF BOM mark.
    _readStartingBom(input) {
      return input.startsWith("\uFEFF") ? input.substr(1) : input;
    }
    // ## Public methods
    // ### `tokenize` starts the transformation of an N3 document into an array of tokens.
    // The input can be a string or a stream.
    tokenize(input, callback) {
      this._line = 1;
      if (typeof input === "string") {
        this._input = this._readStartingBom(input);
        if (typeof callback === "function")
          queueMicrotask(() => this._tokenizeToEnd(callback, true));
        else {
          const tokens = [];
          let error;
          this._tokenizeToEnd((e, t) => e ? error = e : tokens.push(t), true);
          if (error) throw error;
          return tokens;
        }
      } else {
        this._pendingBuffer = null;
        if (typeof input.setEncoding === "function")
          input.setEncoding("utf8");
        input.on("data", (data) => {
          if (this._input !== null && data.length !== 0) {
            if (this._pendingBuffer) {
              data = bufferExports.Buffer.concat([this._pendingBuffer, data]);
              this._pendingBuffer = null;
            }
            if (data[data.length - 1] & 128) {
              this._pendingBuffer = data;
            } else {
              if (typeof this._input === "undefined")
                this._input = this._readStartingBom(typeof data === "string" ? data : data.toString());
              else
                this._input += data;
              this._tokenizeToEnd(callback, false);
            }
          }
        });
        input.on("end", () => {
          if (typeof this._input === "string")
            this._tokenizeToEnd(callback, true);
        });
        input.on("error", callback);
      }
    }
  }
  const { rdf: rdf$1, xsd: xsd$1 } = namespaces;
  let DEFAULTGRAPH$1;
  let _blankNodeCounter = 0;
  const DataFactory$1 = {
    namedNode,
    blankNode,
    variable,
    literal,
    defaultGraph,
    quad,
    triple: quad,
    fromTerm,
    fromQuad
  };
  class Term {
    constructor(id) {
      this.id = id;
    }
    // ### The value of this term
    get value() {
      return this.id;
    }
    // ### Returns whether this object represents the same term as the other
    equals(other) {
      if (other instanceof Term)
        return this.id === other.id;
      return !!other && this.termType === other.termType && this.value === other.value;
    }
    // ### Implement hashCode for Immutable.js, since we implement `equals`
    // https://immutable-js.com/docs/v4.0.0/ValueObject/#hashCode()
    hashCode() {
      return 0;
    }
    // ### Returns a plain object representation of this term
    toJSON() {
      return {
        termType: this.termType,
        value: this.value
      };
    }
  }
  let NamedNode$1 = class NamedNode extends Term {
    // ### The term type of this term
    get termType() {
      return "NamedNode";
    }
  };
  let Literal$1 = class Literal2 extends Term {
    // ### The term type of this term
    get termType() {
      return "Literal";
    }
    // ### The text value of this literal
    get value() {
      return this.id.substring(1, this.id.lastIndexOf('"'));
    }
    // ### The language of this literal
    get language() {
      const id = this.id;
      let atPos = id.lastIndexOf('"') + 1;
      const dirPos = id.lastIndexOf("--");
      return atPos < id.length && id[atPos++] === "@" ? (dirPos > atPos ? id.substr(0, dirPos) : id).substr(atPos).toLowerCase() : "";
    }
    // ### The direction of this literal
    get direction() {
      const id = this.id;
      const endPos = id.lastIndexOf('"');
      const dirPos = id.lastIndexOf("--");
      return dirPos > endPos && dirPos + 2 < id.length ? id.substr(dirPos + 2).toLowerCase() : "";
    }
    // ### The datatype IRI of this literal
    get datatype() {
      return new NamedNode$1(this.datatypeString);
    }
    // ### The datatype string of this literal
    get datatypeString() {
      const id = this.id, dtPos = id.lastIndexOf('"') + 1;
      const char = dtPos < id.length ? id[dtPos] : "";
      return char === "^" ? id.substr(dtPos + 2) : (
        // If "@" follows, return rdf:langString or rdf:dirLangString; xsd:string otherwise
        char !== "@" ? xsd$1.string : id.indexOf("--", dtPos) > 0 ? rdf$1.dirLangString : rdf$1.langString
      );
    }
    // ### Returns whether this object represents the same term as the other
    equals(other) {
      if (other instanceof Literal2)
        return this.id === other.id;
      return !!other && !!other.datatype && this.termType === other.termType && this.value === other.value && this.language === other.language && (this.direction === other.direction || this.direction === "" && !other.direction) && this.datatype.value === other.datatype.value;
    }
    toJSON() {
      return {
        termType: this.termType,
        value: this.value,
        language: this.language,
        direction: this.direction,
        datatype: { termType: "NamedNode", value: this.datatypeString }
      };
    }
  };
  let BlankNode$1 = class BlankNode extends Term {
    constructor(name) {
      super(`_:${name}`);
    }
    // ### The term type of this term
    get termType() {
      return "BlankNode";
    }
    // ### The name of this blank node
    get value() {
      return this.id.substr(2);
    }
  };
  let Variable$1 = class Variable extends Term {
    constructor(name) {
      super(`?${name}`);
    }
    // ### The term type of this term
    get termType() {
      return "Variable";
    }
    // ### The name of this variable
    get value() {
      return this.id.substr(1);
    }
  };
  let DefaultGraph$1 = class DefaultGraph extends Term {
    constructor() {
      super("");
      return DEFAULTGRAPH$1 || this;
    }
    // ### The term type of this term
    get termType() {
      return "DefaultGraph";
    }
    // ### Returns whether this object represents the same term as the other
    equals(other) {
      return this === other || !!other && this.termType === other.termType;
    }
  };
  DEFAULTGRAPH$1 = new DefaultGraph$1();
  let Quad$1 = class Quad extends Term {
    constructor(subject, predicate, object, graph) {
      super("");
      this._subject = subject;
      this._predicate = predicate;
      this._object = object;
      this._graph = graph || DEFAULTGRAPH$1;
    }
    // ### The term type of this term
    get termType() {
      return "Quad";
    }
    get subject() {
      return this._subject;
    }
    get predicate() {
      return this._predicate;
    }
    get object() {
      return this._object;
    }
    get graph() {
      return this._graph;
    }
    // ### Returns a plain object representation of this quad
    toJSON() {
      return {
        termType: this.termType,
        subject: this._subject.toJSON(),
        predicate: this._predicate.toJSON(),
        object: this._object.toJSON(),
        graph: this._graph.toJSON()
      };
    }
    // ### Returns whether this object represents the same quad as the other
    equals(other) {
      return !!other && this._subject.equals(other.subject) && this._predicate.equals(other.predicate) && this._object.equals(other.object) && this._graph.equals(other.graph);
    }
  };
  function namedNode(iri) {
    return new NamedNode$1(iri);
  }
  function blankNode(name) {
    return new BlankNode$1(name || `n3-${_blankNodeCounter++}`);
  }
  function literal(value, languageOrDataType) {
    if (typeof languageOrDataType === "string")
      return new Literal$1(`"${value}"@${languageOrDataType.toLowerCase()}`);
    if (languageOrDataType !== void 0 && !("termType" in languageOrDataType)) {
      return new Literal$1(`"${value}"@${languageOrDataType.language.toLowerCase()}${languageOrDataType.direction ? `--${languageOrDataType.direction.toLowerCase()}` : ""}`);
    }
    let datatype = languageOrDataType ? languageOrDataType.value : "";
    if (datatype === "") {
      if (typeof value === "boolean")
        datatype = xsd$1.boolean;
      else if (typeof value === "number") {
        if (Number.isFinite(value))
          datatype = Number.isInteger(value) ? xsd$1.integer : xsd$1.double;
        else {
          datatype = xsd$1.double;
          if (!Number.isNaN(value))
            value = value > 0 ? "INF" : "-INF";
        }
      }
    }
    return datatype === "" || datatype === xsd$1.string ? new Literal$1(`"${value}"`) : new Literal$1(`"${value}"^^${datatype}`);
  }
  function variable(name) {
    return new Variable$1(name);
  }
  function defaultGraph() {
    return DEFAULTGRAPH$1;
  }
  function quad(subject, predicate, object, graph) {
    return new Quad$1(subject, predicate, object, graph);
  }
  function fromTerm(term) {
    if (term instanceof Term)
      return term;
    switch (term.termType) {
      case "NamedNode":
        return namedNode(term.value);
      case "BlankNode":
        return blankNode(term.value);
      case "Variable":
        return variable(term.value);
      case "DefaultGraph":
        return DEFAULTGRAPH$1;
      case "Literal":
        return literal(term.value, term.language || term.datatype);
      case "Quad":
        return fromQuad(term);
      default:
        throw new Error(`Unexpected termType: ${term.termType}`);
    }
  }
  function fromQuad(inQuad) {
    if (inQuad instanceof Quad$1)
      return inQuad;
    if (inQuad.termType !== "Quad")
      throw new Error(`Unexpected termType: ${inQuad.termType}`);
    return quad(fromTerm(inQuad.subject), fromTerm(inQuad.predicate), fromTerm(inQuad.object), fromTerm(inQuad.graph));
  }
  let blankNodePrefix = 0;
  class N3Parser {
    constructor(options) {
      this._contextStack = [];
      this._graph = null;
      options = options || {};
      this._setBase(options.baseIRI);
      options.factory && initDataFactory(this, options.factory);
      const format = typeof options.format === "string" ? options.format.match(/\w*$/)[0].toLowerCase() : "", isTurtle = /turtle/.test(format), isTriG = /trig/.test(format), isNTriples = /triple/.test(format), isNQuads = /quad/.test(format), isN3 = this._n3Mode = /n3/.test(format), isLineMode = isNTriples || isNQuads;
      if (!(this._supportsNamedGraphs = !(isTurtle || isN3)))
        this._readPredicateOrNamedGraph = this._readPredicate;
      this._supportsQuads = !(isTurtle || isTriG || isNTriples || isN3);
      this._isImpliedBy = options.isImpliedBy;
      if (isLineMode)
        this._resolveRelativeIRI = (iri) => {
          return null;
        };
      this._blankNodePrefix = typeof options.blankNodePrefix !== "string" ? "" : options.blankNodePrefix.replace(/^(?!_:)/, "_:");
      this._lexer = options.lexer || new N3Lexer({ lineMode: isLineMode, n3: isN3, isImpliedBy: this._isImpliedBy });
      this._explicitQuantifiers = !!options.explicitQuantifiers;
      this._parseUnsupportedVersions = !!options.parseUnsupportedVersions;
      this._version = options.version;
    }
    // ## Static class methods
    // ### `_resetBlankNodePrefix` restarts blank node prefix identification
    static _resetBlankNodePrefix() {
      blankNodePrefix = 0;
    }
    // ## Private methods
    // ### `_setBase` sets the base IRI to resolve relative IRIs
    _setBase(baseIRI) {
      if (!baseIRI) {
        this._base = "";
        this._basePath = "";
      } else {
        const fragmentPos = baseIRI.indexOf("#");
        if (fragmentPos >= 0)
          baseIRI = baseIRI.substr(0, fragmentPos);
        this._base = baseIRI;
        this._basePath = baseIRI.indexOf("/") < 0 ? baseIRI : baseIRI.replace(/[^\/?]*(?:\?.*)?$/, "");
        baseIRI = baseIRI.match(/^(?:([a-z][a-z0-9+.-]*:))?(?:\/\/[^\/]*)?/i);
        this._baseRoot = baseIRI[0];
        this._baseScheme = baseIRI[1];
      }
    }
    // ### `_saveContext` stores the current parsing context
    // when entering a new scope (list, blank node, formula)
    _saveContext(type, graph, subject, predicate, object) {
      const n3Mode = this._n3Mode;
      this._contextStack.push({
        type,
        subject,
        predicate,
        object,
        graph,
        inverse: n3Mode ? this._inversePredicate : false,
        blankPrefix: n3Mode ? this._prefixes._ : "",
        quantified: n3Mode ? this._quantified : null
      });
      if (n3Mode) {
        this._inversePredicate = false;
        this._prefixes._ = this._graph ? `${this._graph.value}.` : ".";
        this._quantified = Object.create(this._quantified);
      }
    }
    // ### `_restoreContext` restores the parent context
    // when leaving a scope (list, blank node, formula)
    _restoreContext(type, token) {
      const context = this._contextStack.pop();
      if (!context || context.type !== type)
        return this._error(`Unexpected ${token.type}`, token);
      this._subject = context.subject;
      this._predicate = context.predicate;
      this._object = context.object;
      this._graph = context.graph;
      if (this._n3Mode) {
        this._inversePredicate = context.inverse;
        this._prefixes._ = context.blankPrefix;
        this._quantified = context.quantified;
      }
    }
    // ### `_readBeforeTopContext` is called once only at the start of parsing.
    _readBeforeTopContext(token) {
      if (this._version && !this._isValidVersion(this._version))
        return this._error(`Detected unsupported version as media type parameter: "${this._version}"`, token);
      return this._readInTopContext(token);
    }
    // ### `_readInTopContext` reads a token when in the top context
    _readInTopContext(token) {
      switch (token.type) {
        // If an EOF token arrives in the top context, signal that we're done
        case "eof":
          if (this._graph !== null)
            return this._error("Unclosed graph", token);
          delete this._prefixes._;
          return this._callback(null, null, this._prefixes);
        // It could be a prefix declaration
        case "PREFIX":
          this._sparqlStyle = true;
        case "@prefix":
          return this._readPrefix;
        // It could be a base declaration
        case "BASE":
          this._sparqlStyle = true;
        case "@base":
          return this._readBaseIRI;
        // It could be a version declaration
        case "VERSION":
          this._sparqlStyle = true;
        case "@version":
          return this._readVersion;
        // It could be a graph
        case "{":
          if (this._supportsNamedGraphs) {
            this._graph = "";
            this._subject = null;
            return this._readSubject;
          }
        case "GRAPH":
          if (this._supportsNamedGraphs)
            return this._readNamedGraphLabel;
        // Otherwise, the next token must be a subject
        default:
          return this._readSubject(token);
      }
    }
    // ### `_readEntity` reads an IRI, prefixed name, blank node, or variable
    _readEntity(token, quantifier) {
      let value;
      switch (token.type) {
        // Read a relative or absolute IRI
        case "IRI":
        case "typeIRI":
          const iri = this._resolveIRI(token.value);
          if (iri === null)
            return this._error("Invalid IRI", token);
          value = this._factory.namedNode(iri);
          break;
        // Read a prefixed name
        case "type":
        case "prefixed":
          const prefix = this._prefixes[token.prefix];
          if (prefix === void 0)
            return this._error(`Undefined prefix "${token.prefix}:"`, token);
          value = this._factory.namedNode(prefix + token.value);
          break;
        // Read a blank node
        case "blank":
          value = this._factory.blankNode(this._prefixes[token.prefix] + token.value);
          break;
        // Read a variable
        case "var":
          value = this._factory.variable(token.value.substr(1));
          break;
        // Everything else is not an entity
        default:
          return this._error(`Expected entity but got ${token.type}`, token);
      }
      if (!quantifier && this._n3Mode && value.id in this._quantified)
        value = this._quantified[value.id];
      return value;
    }
    // ### `_readSubject` reads a quad's subject
    _readSubject(token) {
      this._predicate = null;
      switch (token.type) {
        case "[":
          this._saveContext(
            "blank",
            this._graph,
            this._subject = this._factory.blankNode(),
            null,
            null
          );
          return this._readBlankNodeHead;
        case "(":
          const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
          if (parent.type === "<<") {
            return this._error("Unexpected list in reified triple", token);
          }
          this._saveContext("list", this._graph, this.RDF_NIL, null, null);
          this._subject = null;
          return this._readListItem;
        case "{":
          if (!this._n3Mode)
            return this._error("Unexpected graph", token);
          this._saveContext(
            "formula",
            this._graph,
            this._graph = this._factory.blankNode(),
            null,
            null
          );
          return this._readSubject;
        case "}":
          return this._readPunctuation(token);
        case "@forSome":
          if (!this._n3Mode)
            return this._error('Unexpected "@forSome"', token);
          this._subject = null;
          this._predicate = this.N3_FORSOME;
          this._quantifier = "blankNode";
          return this._readQuantifierList;
        case "@forAll":
          if (!this._n3Mode)
            return this._error('Unexpected "@forAll"', token);
          this._subject = null;
          this._predicate = this.N3_FORALL;
          this._quantifier = "variable";
          return this._readQuantifierList;
        case "literal":
          if (!this._n3Mode)
            return this._error("Unexpected literal", token);
          if (token.prefix.length === 0) {
            this._literalValue = token.value;
            return this._completeSubjectLiteral;
          } else
            this._subject = this._factory.literal(token.value, this._factory.namedNode(token.prefix));
          break;
        case "<<(":
          if (!this._n3Mode)
            return this._error("Disallowed triple term as subject", token);
          this._saveContext("<<(", this._graph, null, null, null);
          this._graph = null;
          return this._readSubject;
        case "<<":
          this._saveContext("<<", this._graph, null, null, null);
          this._graph = null;
          return this._readSubject;
        default:
          if ((this._subject = this._readEntity(token)) === void 0)
            return;
          if (this._n3Mode)
            return this._getPathReader(this._readPredicateOrNamedGraph);
      }
      return this._readPredicateOrNamedGraph;
    }
    // ### `_readPredicate` reads a quad's predicate
    _readPredicate(token) {
      const type = token.type;
      switch (type) {
        case "inverse":
          this._inversePredicate = true;
        case "abbreviation":
          this._predicate = this.ABBREVIATIONS[token.value];
          break;
        case ".":
        case "]":
        case "}":
        case "|}":
          if (this._predicate === null)
            return this._error(`Unexpected ${type}`, token);
          this._subject = null;
          return type === "]" ? this._readBlankNodeTail(token) : this._readPunctuation(token);
        case ";":
          return this._predicate !== null ? this._readPredicate : this._error("Expected predicate but got ;", token);
        case "[":
          if (this._n3Mode) {
            this._saveContext(
              "blank",
              this._graph,
              this._subject,
              this._subject = this._factory.blankNode(),
              null
            );
            return this._readBlankNodeHead;
          }
        case "blank":
          if (!this._n3Mode)
            return this._error("Disallowed blank node as predicate", token);
        default:
          if ((this._predicate = this._readEntity(token)) === void 0)
            return;
      }
      this._validAnnotation = true;
      return this._readObject;
    }
    // ### `_readObject` reads a quad's object
    _readObject(token) {
      switch (token.type) {
        case "literal":
          if (token.prefix.length === 0) {
            this._literalValue = token.value;
            return this._readDataTypeOrLang;
          } else
            this._object = this._factory.literal(token.value, this._factory.namedNode(token.prefix));
          break;
        case "[":
          this._saveContext(
            "blank",
            this._graph,
            this._subject,
            this._predicate,
            this._subject = this._factory.blankNode()
          );
          return this._readBlankNodeHead;
        case "(":
          const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
          if (parent.type === "<<") {
            return this._error("Unexpected list in reified triple", token);
          }
          this._saveContext("list", this._graph, this._subject, this._predicate, this.RDF_NIL);
          this._subject = null;
          return this._readListItem;
        case "{":
          if (!this._n3Mode)
            return this._error("Unexpected graph", token);
          this._saveContext(
            "formula",
            this._graph,
            this._subject,
            this._predicate,
            this._graph = this._factory.blankNode()
          );
          return this._readSubject;
        case "<<(":
          this._saveContext("<<(", this._graph, this._subject, this._predicate, null);
          this._graph = null;
          return this._readSubject;
        case "<<":
          this._saveContext("<<", this._graph, this._subject, this._predicate, null);
          this._graph = null;
          return this._readSubject;
        default:
          if ((this._object = this._readEntity(token)) === void 0)
            return;
          if (this._n3Mode)
            return this._getPathReader(this._getContextEndReader());
      }
      return this._getContextEndReader();
    }
    // ### `_readPredicateOrNamedGraph` reads a quad's predicate, or a named graph
    _readPredicateOrNamedGraph(token) {
      return token.type === "{" ? this._readGraph(token) : this._readPredicate(token);
    }
    // ### `_readGraph` reads a graph
    _readGraph(token) {
      if (token.type !== "{")
        return this._error(`Expected graph but got ${token.type}`, token);
      this._graph = this._subject, this._subject = null;
      return this._readSubject;
    }
    // ### `_readBlankNodeHead` reads the head of a blank node
    _readBlankNodeHead(token) {
      if (token.type === "]") {
        this._subject = null;
        return this._readBlankNodeTail(token);
      } else {
        const stack = this._contextStack, parentParent = stack.length > 1 && stack[stack.length - 2];
        if (parentParent.type === "<<") {
          return this._error("Unexpected compound blank node expression in reified triple", token);
        }
        this._predicate = null;
        return this._readPredicate(token);
      }
    }
    // ### `_readBlankNodeTail` reads the end of a blank node
    _readBlankNodeTail(token) {
      if (token.type !== "]")
        return this._readBlankNodePunctuation(token);
      if (this._subject !== null)
        this._emit(this._subject, this._predicate, this._object, this._graph);
      const empty = this._predicate === null;
      this._restoreContext("blank", token);
      if (this._object !== null)
        return this._getContextEndReader();
      else if (this._predicate !== null)
        return this._readObject;
      else
        return empty ? this._readPredicateOrNamedGraph : this._readPredicateAfterBlank;
    }
    // ### `_readPredicateAfterBlank` reads a predicate after an anonymous blank node
    _readPredicateAfterBlank(token) {
      switch (token.type) {
        case ".":
        case "}":
          this._subject = null;
          return this._readPunctuation(token);
        default:
          return this._readPredicate(token);
      }
    }
    // ### `_readListItem` reads items from a list
    _readListItem(token) {
      let item = null, list = null, next = this._readListItem;
      const previousList = this._subject, stack = this._contextStack, parent = stack[stack.length - 1];
      switch (token.type) {
        case "[":
          this._saveContext(
            "blank",
            this._graph,
            list = this._factory.blankNode(),
            this.RDF_FIRST,
            this._subject = item = this._factory.blankNode()
          );
          next = this._readBlankNodeHead;
          break;
        case "(":
          this._saveContext(
            "list",
            this._graph,
            list = this._factory.blankNode(),
            this.RDF_FIRST,
            this.RDF_NIL
          );
          this._subject = null;
          break;
        case ")":
          this._restoreContext("list", token);
          if (stack.length !== 0 && stack[stack.length - 1].type === "list")
            this._emit(this._subject, this._predicate, this._object, this._graph);
          if (this._predicate === null) {
            next = this._readPredicate;
            if (this._subject === this.RDF_NIL)
              return next;
          } else {
            next = this._getContextEndReader();
            if (this._object === this.RDF_NIL)
              return next;
          }
          list = this.RDF_NIL;
          break;
        case "literal":
          if (token.prefix.length === 0) {
            this._literalValue = token.value;
            next = this._readListItemDataTypeOrLang;
          } else {
            item = this._factory.literal(token.value, this._factory.namedNode(token.prefix));
            next = this._getContextEndReader();
          }
          break;
        case "{":
          if (!this._n3Mode)
            return this._error("Unexpected graph", token);
          this._saveContext(
            "formula",
            this._graph,
            this._subject,
            this._predicate,
            this._graph = this._factory.blankNode()
          );
          return this._readSubject;
        case "<<":
          this._saveContext("<<", this._graph, null, null, null);
          this._graph = null;
          next = this._readSubject;
          break;
        default:
          if ((item = this._readEntity(token)) === void 0)
            return;
      }
      if (list === null)
        this._subject = list = this._factory.blankNode();
      if (token.type === "<<")
        stack[stack.length - 1].subject = this._subject;
      if (previousList === null) {
        if (parent.predicate === null)
          parent.subject = list;
        else
          parent.object = list;
      } else {
        this._emit(previousList, this.RDF_REST, list, this._graph);
      }
      if (item !== null) {
        if (this._n3Mode && (token.type === "IRI" || token.type === "prefixed")) {
          this._saveContext("item", this._graph, list, this.RDF_FIRST, item);
          this._subject = item, this._predicate = null;
          return this._getPathReader(this._readListItem);
        }
        this._emit(list, this.RDF_FIRST, item, this._graph);
      }
      return next;
    }
    // ### `_readDataTypeOrLang` reads an _optional_ datatype or language
    _readDataTypeOrLang(token) {
      return this._completeObjectLiteral(token, false);
    }
    // ### `_readListItemDataTypeOrLang` reads an _optional_ datatype or language in a list
    _readListItemDataTypeOrLang(token) {
      return this._completeObjectLiteral(token, true);
    }
    // ### `_completeLiteral` completes a literal with an optional datatype or language
    _completeLiteral(token, component) {
      let literal2 = this._factory.literal(this._literalValue);
      let readCb;
      switch (token.type) {
        // Create a datatyped literal
        case "type":
        case "typeIRI":
          const datatype = this._readEntity(token);
          if (datatype === void 0) return;
          if (datatype.value === namespaces.rdf.langString || datatype.value === namespaces.rdf.dirLangString) {
            return this._error("Detected illegal (directional) languaged-tagged string with explicit datatype", token);
          }
          literal2 = this._factory.literal(this._literalValue, datatype);
          token = null;
          break;
        // Create a language-tagged string
        case "langcode":
          if (token.value.split("-").some((t) => t.length > 8))
            return this._error("Detected language tag with subtag longer than 8 characters", token);
          literal2 = this._factory.literal(this._literalValue, token.value);
          this._literalLanguage = token.value;
          token = null;
          readCb = this._readDirCode.bind(this, component);
          break;
      }
      return { token, literal: literal2, readCb };
    }
    _readDirCode(component, listItem, token) {
      if (token.type === "dircode") {
        const term = this._factory.literal(this._literalValue, { language: this._literalLanguage, direction: token.value });
        if (component === "subject")
          this._subject = term;
        else
          this._object = term;
        this._literalLanguage = void 0;
        token = null;
      }
      if (component === "subject")
        return token === null ? this._readPredicateOrNamedGraph : this._readPredicateOrNamedGraph(token);
      return this._completeObjectLiteralPost(token, listItem);
    }
    // Completes a literal in subject position
    _completeSubjectLiteral(token) {
      const completed = this._completeLiteral(token, "subject");
      this._subject = completed.literal;
      if (completed.readCb)
        return completed.readCb.bind(this, false);
      return this._readPredicateOrNamedGraph;
    }
    // Completes a literal in object position
    _completeObjectLiteral(token, listItem) {
      const completed = this._completeLiteral(token, "object");
      if (!completed)
        return;
      this._object = completed.literal;
      if (completed.readCb)
        return completed.readCb.bind(this, listItem);
      return this._completeObjectLiteralPost(completed.token, listItem);
    }
    _completeObjectLiteralPost(token, listItem) {
      if (listItem)
        this._emit(this._subject, this.RDF_FIRST, this._object, this._graph);
      if (token === null)
        return this._getContextEndReader();
      else {
        this._readCallback = this._getContextEndReader();
        return this._readCallback(token);
      }
    }
    // ### `_readFormulaTail` reads the end of a formula
    _readFormulaTail(token) {
      if (token.type !== "}")
        return this._readPunctuation(token);
      if (this._subject !== null)
        this._emit(this._subject, this._predicate, this._object, this._graph);
      this._restoreContext("formula", token);
      return this._object === null ? this._readPredicate : this._getContextEndReader();
    }
    // ### `_readPunctuation` reads punctuation between quads or quad parts
    _readPunctuation(token) {
      let next, graph = this._graph, startingAnnotation = false;
      const subject = this._subject, inversePredicate = this._inversePredicate;
      switch (token.type) {
        // A closing brace ends a graph
        case "}":
          if (this._graph === null)
            return this._error("Unexpected graph closing", token);
          if (this._n3Mode)
            return this._readFormulaTail(token);
          this._graph = null;
        // A dot just ends the statement, without sharing anything with the next
        case ".":
          this._subject = null;
          this._tripleTerm = null;
          next = this._contextStack.length ? this._readSubject : this._readInTopContext;
          if (inversePredicate) this._inversePredicate = false;
          break;
        // Semicolon means the subject is shared; predicate and object are different
        case ";":
          next = this._readPredicate;
          break;
        // Comma means both the subject and predicate are shared; the object is different
        case ",":
          next = this._readObject;
          break;
        // ~ is allowed in the annotation syntax
        case "~":
          next = this._readReifierInAnnotation;
          startingAnnotation = true;
          break;
        // {| means that the current triple is annotated with predicate-object pairs.
        case "{|":
          this._subject = this._readTripleTerm();
          this._validAnnotation = false;
          startingAnnotation = true;
          next = this._readPredicate;
          break;
        // |} means that the current reified triple in annotation syntax is finalized.
        case "|}":
          if (!this._annotation)
            return this._error("Unexpected annotation syntax closing", token);
          if (!this._validAnnotation)
            return this._error("Annotation block can not be empty", token);
          this._subject = null;
          this._annotation = false;
          next = this._readPunctuation;
          break;
        default:
          if (this._supportsQuads && this._graph === null && (graph = this._readEntity(token)) !== void 0) {
            next = this._readQuadPunctuation;
            break;
          }
          return this._error(`Expected punctuation to follow "${this._object.id}"`, token);
      }
      if (subject !== null && (!startingAnnotation || startingAnnotation && !this._annotation)) {
        const predicate = this._predicate, object = this._object;
        if (!inversePredicate)
          this._emit(subject, predicate, object, graph);
        else
          this._emit(object, predicate, subject, graph);
      }
      if (startingAnnotation) {
        this._annotation = true;
      }
      return next;
    }
    // ### `_readBlankNodePunctuation` reads punctuation in a blank node
    _readBlankNodePunctuation(token) {
      let next;
      switch (token.type) {
        // Semicolon means the subject is shared; predicate and object are different
        case ";":
          next = this._readPredicate;
          break;
        // Comma means both the subject and predicate are shared; the object is different
        case ",":
          next = this._readObject;
          break;
        default:
          return this._error(`Expected punctuation to follow "${this._object.id}"`, token);
      }
      this._emit(this._subject, this._predicate, this._object, this._graph);
      return next;
    }
    // ### `_readQuadPunctuation` reads punctuation after a quad
    _readQuadPunctuation(token) {
      if (token.type !== ".")
        return this._error("Expected dot to follow quad", token);
      return this._readInTopContext;
    }
    // ### `_readPrefix` reads the prefix of a prefix declaration
    _readPrefix(token) {
      if (token.type !== "prefix")
        return this._error("Expected prefix to follow @prefix", token);
      this._prefix = token.value;
      return this._readPrefixIRI;
    }
    // ### `_readPrefixIRI` reads the IRI of a prefix declaration
    _readPrefixIRI(token) {
      if (token.type !== "IRI")
        return this._error(`Expected IRI to follow prefix "${this._prefix}:"`, token);
      const prefixNode = this._readEntity(token);
      this._prefixes[this._prefix] = prefixNode.value;
      this._prefixCallback(this._prefix, prefixNode);
      return this._readDeclarationPunctuation;
    }
    // ### `_readBaseIRI` reads the IRI of a base declaration
    _readBaseIRI(token) {
      const iri = token.type === "IRI" && this._resolveIRI(token.value);
      if (!iri)
        return this._error("Expected valid IRI to follow base declaration", token);
      this._setBase(iri);
      return this._readDeclarationPunctuation;
    }
    // ### `_isValidVersion` checks if the given version is valid for this parser to handle.
    _isValidVersion(version) {
      return this._parseUnsupportedVersions || N3Parser.SUPPORTED_VERSIONS.includes(version);
    }
    // ### `_readVersion` reads version string declaration
    _readVersion(token) {
      if (token.type !== "literal")
        return this._error("Expected literal to follow version declaration", token);
      if (token.end - token.start !== token.value.length + 2)
        return this._error("Version declarations must use single quotes", token);
      this._versionCallback(token.value);
      if (!this._isValidVersion(token.value))
        return this._error(`Detected unsupported version: "${token.value}"`, token);
      return this._readDeclarationPunctuation;
    }
    // ### `_readNamedGraphLabel` reads the label of a named graph
    _readNamedGraphLabel(token) {
      switch (token.type) {
        case "IRI":
        case "blank":
        case "prefixed":
          return this._readSubject(token), this._readGraph;
        case "[":
          return this._readNamedGraphBlankLabel;
        default:
          return this._error("Invalid graph label", token);
      }
    }
    // ### `_readNamedGraphLabel` reads a blank node label of a named graph
    _readNamedGraphBlankLabel(token) {
      if (token.type !== "]")
        return this._error("Invalid graph label", token);
      this._subject = this._factory.blankNode();
      return this._readGraph;
    }
    // ### `_readDeclarationPunctuation` reads the punctuation of a declaration
    _readDeclarationPunctuation(token) {
      if (this._sparqlStyle) {
        this._sparqlStyle = false;
        return this._readInTopContext(token);
      }
      if (token.type !== ".")
        return this._error("Expected declaration to end with a dot", token);
      return this._readInTopContext;
    }
    // Reads a list of quantified symbols from a @forSome or @forAll statement
    _readQuantifierList(token) {
      let entity;
      switch (token.type) {
        case "IRI":
        case "prefixed":
          if ((entity = this._readEntity(token, true)) !== void 0)
            break;
        default:
          return this._error(`Unexpected ${token.type}`, token);
      }
      if (!this._explicitQuantifiers)
        this._quantified[entity.id] = this._factory[this._quantifier](this._factory.blankNode().value);
      else {
        if (this._subject === null)
          this._emit(
            this._graph || this.DEFAULTGRAPH,
            this._predicate,
            this._subject = this._factory.blankNode(),
            this.QUANTIFIERS_GRAPH
          );
        else
          this._emit(
            this._subject,
            this.RDF_REST,
            this._subject = this._factory.blankNode(),
            this.QUANTIFIERS_GRAPH
          );
        this._emit(this._subject, this.RDF_FIRST, entity, this.QUANTIFIERS_GRAPH);
      }
      return this._readQuantifierPunctuation;
    }
    // Reads punctuation from a @forSome or @forAll statement
    _readQuantifierPunctuation(token) {
      if (token.type === ",")
        return this._readQuantifierList;
      else {
        if (this._explicitQuantifiers) {
          this._emit(this._subject, this.RDF_REST, this.RDF_NIL, this.QUANTIFIERS_GRAPH);
          this._subject = null;
        }
        this._readCallback = this._getContextEndReader();
        return this._readCallback(token);
      }
    }
    // ### `_getPathReader` reads a potential path and then resumes with the given function
    _getPathReader(afterPath) {
      this._afterPath = afterPath;
      return this._readPath;
    }
    // ### `_readPath` reads a potential path
    _readPath(token) {
      switch (token.type) {
        // Forward path
        case "!":
          return this._readForwardPath;
        // Backward path
        case "^":
          return this._readBackwardPath;
        // Not a path; resume reading where we left off
        default:
          const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
          if (parent && parent.type === "item") {
            const item = this._subject;
            this._restoreContext("item", token);
            this._emit(this._subject, this.RDF_FIRST, item, this._graph);
          }
          return this._afterPath(token);
      }
    }
    // ### `_readForwardPath` reads a '!' path
    _readForwardPath(token) {
      let subject, predicate;
      const object = this._factory.blankNode();
      if ((predicate = this._readEntity(token)) === void 0)
        return;
      if (this._predicate === null)
        subject = this._subject, this._subject = object;
      else
        subject = this._object, this._object = object;
      this._emit(subject, predicate, object, this._graph);
      return this._readPath;
    }
    // ### `_readBackwardPath` reads a '^' path
    _readBackwardPath(token) {
      const subject = this._factory.blankNode();
      let predicate, object;
      if ((predicate = this._readEntity(token)) === void 0)
        return;
      if (this._predicate === null)
        object = this._subject, this._subject = subject;
      else
        object = this._object, this._object = subject;
      this._emit(subject, predicate, object, this._graph);
      return this._readPath;
    }
    // ### `_readTripleTermTail` reads the end of a triple term
    _readTripleTermTail(token) {
      if (token.type !== ")>>")
        return this._error(`Expected )>> but got ${token.type}`, token);
      const quad2 = this._factory.quad(
        this._subject,
        this._predicate,
        this._object,
        this._graph || this.DEFAULTGRAPH
      );
      this._restoreContext("<<(", token);
      if (this._subject === null) {
        this._subject = quad2;
        return this._readPredicate;
      } else {
        this._object = quad2;
        return this._getContextEndReader();
      }
    }
    // ### `_readReifiedTripleTailOrReifier` reads a reifier or the end of a nested reified triple
    _readReifiedTripleTailOrReifier(token) {
      if (token.type === "~") {
        return this._readReifier;
      }
      return this._readReifiedTripleTail(token);
    }
    // ### `_readReifiedTripleTail` reads the end of a nested reified triple
    _readReifiedTripleTail(token) {
      if (token.type !== ">>")
        return this._error(`Expected >> but got ${token.type}`, token);
      this._tripleTerm = null;
      const reifier = this._readTripleTerm();
      this._restoreContext("<<", token);
      const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
      if (parent && parent.type === "list") {
        this._emit(this._subject, this.RDF_FIRST, reifier, this._graph);
        return this._getContextEndReader();
      } else if (this._subject === null) {
        this._subject = reifier;
        return this._readPredicateOrReifierTripleEnd;
      } else {
        this._object = reifier;
        return this._getContextEndReader();
      }
    }
    _readPredicateOrReifierTripleEnd(token) {
      if (token.type === ".") {
        this._subject = null;
        return this._readPunctuation(token);
      }
      return this._readPredicate(token);
    }
    // ### `_readReifier` reads the triple term identifier after a tilde when in a reifying triple.
    _readReifier(token) {
      this._reifier = this._readEntity(token);
      return this._readReifiedTripleTail;
    }
    // ### `_readReifier` reads the optional triple term identifier after a tilde when in annotation syntax.
    _readReifierInAnnotation(token) {
      if (token.type === "IRI" || token.type === "typeIRI" || token.type === "type" || token.type === "prefixed" || token.type === "blank" || token.type === "var") {
        this._reifier = this._readEntity(token);
        return this._readPunctuation;
      }
      this._readTripleTerm();
      this._subject = null;
      return this._readPunctuation(token);
    }
    _readTripleTerm() {
      const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
      const parentGraph = parent ? parent.graph : void 0;
      const reifier = this._reifier || this._factory.blankNode();
      this._reifier = null;
      this._tripleTerm = this._tripleTerm || this._factory.quad(this._subject, this._predicate, this._object);
      this._emit(reifier, this.RDF_REIFIES, this._tripleTerm, parentGraph || this.DEFAULTGRAPH);
      return reifier;
    }
    // ### `_getContextEndReader` gets the next reader function at the end of a context
    _getContextEndReader() {
      const contextStack = this._contextStack;
      if (!contextStack.length)
        return this._readPunctuation;
      switch (contextStack[contextStack.length - 1].type) {
        case "blank":
          return this._readBlankNodeTail;
        case "list":
          return this._readListItem;
        case "formula":
          return this._readFormulaTail;
        case "<<(":
          return this._readTripleTermTail;
        case "<<":
          return this._readReifiedTripleTailOrReifier;
      }
    }
    // ### `_emit` sends a quad through the callback
    _emit(subject, predicate, object, graph) {
      this._callback(null, this._factory.quad(subject, predicate, object, graph || this.DEFAULTGRAPH));
    }
    // ### `_error` emits an error message through the callback
    _error(message, token) {
      const err = new Error(`${message} on line ${token.line}.`);
      err.context = {
        token,
        line: token.line,
        previousToken: this._lexer.previousToken
      };
      this._callback(err);
      this._callback = noop;
    }
    // ### `_resolveIRI` resolves an IRI against the base path
    _resolveIRI(iri) {
      return /^[a-z][a-z0-9+.-]*:/i.test(iri) ? iri : this._resolveRelativeIRI(iri);
    }
    // ### `_resolveRelativeIRI` resolves an IRI against the base path,
    // assuming that a base path has been set and that the IRI is indeed relative
    _resolveRelativeIRI(iri) {
      if (!iri.length)
        return this._base;
      switch (iri[0]) {
        // Resolve relative fragment IRIs against the base IRI
        case "#":
          return this._base + iri;
        // Resolve relative query string IRIs by replacing the query string
        case "?":
          return this._base.replace(/(?:\?.*)?$/, iri);
        // Resolve root-relative IRIs at the root of the base IRI
        case "/":
          return (iri[1] === "/" ? this._baseScheme : this._baseRoot) + this._removeDotSegments(iri);
        // Resolve all other IRIs at the base IRI's path
        default:
          return /^[^/:]*:/.test(iri) ? null : this._removeDotSegments(this._basePath + iri);
      }
    }
    // ### `_removeDotSegments` resolves './' and '../' path segments in an IRI as per RFC3986
    _removeDotSegments(iri) {
      if (!/(^|\/)\.\.?($|[/#?])/.test(iri))
        return iri;
      const length = iri.length;
      let result = "", i = -1, pathStart = -1, segmentStart = 0, next = "/";
      while (i < length) {
        switch (next) {
          // The path starts with the first slash after the authority
          case ":":
            if (pathStart < 0) {
              if (iri[++i] === "/" && iri[++i] === "/")
                while ((pathStart = i + 1) < length && iri[pathStart] !== "/")
                  i = pathStart;
            }
            break;
          // Don't modify a query string or fragment
          case "?":
          case "#":
            i = length;
            break;
          // Handle '/.' or '/..' path segments
          case "/":
            if (iri[i + 1] === ".") {
              next = iri[++i + 1];
              switch (next) {
                // Remove a '/.' segment
                case "/":
                  result += iri.substring(segmentStart, i - 1);
                  segmentStart = i + 1;
                  break;
                // Remove a trailing '/.' segment
                case void 0:
                case "?":
                case "#":
                  return result + iri.substring(segmentStart, i) + iri.substr(i + 1);
                // Remove a '/..' segment
                case ".":
                  next = iri[++i + 1];
                  if (next === void 0 || next === "/" || next === "?" || next === "#") {
                    result += iri.substring(segmentStart, i - 2);
                    if ((segmentStart = result.lastIndexOf("/")) >= pathStart)
                      result = result.substr(0, segmentStart);
                    if (next !== "/")
                      return `${result}/${iri.substr(i + 1)}`;
                    segmentStart = i + 1;
                  }
              }
            }
        }
        next = iri[++i];
      }
      return result + iri.substring(segmentStart);
    }
    // ## Public methods
    // ### `parse` parses the N3 input and emits each parsed quad through the onQuad callback.
    parse(input, quadCallback, prefixCallback, versionCallback) {
      let onQuad, onPrefix, onComment, onVersion;
      if (quadCallback && (quadCallback.onQuad || quadCallback.onPrefix || quadCallback.onComment || quadCallback.onVersion)) {
        onQuad = quadCallback.onQuad;
        onPrefix = quadCallback.onPrefix;
        onComment = quadCallback.onComment;
        onVersion = quadCallback.onVersion;
      } else {
        onQuad = quadCallback;
        onPrefix = prefixCallback;
        onVersion = versionCallback;
      }
      this._readCallback = this._readBeforeTopContext;
      this._sparqlStyle = false;
      this._prefixes = /* @__PURE__ */ Object.create(null);
      this._prefixes._ = this._blankNodePrefix ? this._blankNodePrefix.substr(2) : `b${blankNodePrefix++}_`;
      this._prefixCallback = onPrefix || noop;
      this._versionCallback = onVersion || noop;
      this._inversePredicate = false;
      this._quantified = /* @__PURE__ */ Object.create(null);
      if (!onQuad) {
        const quads = [];
        let error;
        this._callback = (e, t) => {
          e ? error = e : t && quads.push(t);
        };
        this._lexer.tokenize(input).every((token) => {
          return this._readCallback = this._readCallback(token);
        });
        if (error) throw error;
        return quads;
      }
      let processNextToken = (error, token) => {
        if (error !== null)
          this._callback(error), this._callback = noop;
        else if (this._readCallback)
          this._readCallback = this._readCallback(token);
      };
      if (onComment) {
        this._lexer.comments = true;
        processNextToken = (error, token) => {
          if (error !== null)
            this._callback(error), this._callback = noop;
          else if (this._readCallback) {
            if (token.type === "comment")
              onComment(token.value);
            else
              this._readCallback = this._readCallback(token);
          }
        };
      }
      this._callback = onQuad;
      this._lexer.tokenize(input, processNextToken);
    }
  }
  function noop() {
  }
  function initDataFactory(parser, factory) {
    parser._factory = factory;
    parser.DEFAULTGRAPH = factory.defaultGraph();
    parser.RDF_FIRST = factory.namedNode(namespaces.rdf.first);
    parser.RDF_REST = factory.namedNode(namespaces.rdf.rest);
    parser.RDF_NIL = factory.namedNode(namespaces.rdf.nil);
    parser.RDF_REIFIES = factory.namedNode(namespaces.rdf.reifies);
    parser.N3_FORALL = factory.namedNode(namespaces.r.forAll);
    parser.N3_FORSOME = factory.namedNode(namespaces.r.forSome);
    parser.ABBREVIATIONS = {
      "a": factory.namedNode(namespaces.rdf.type),
      "=": factory.namedNode(namespaces.owl.sameAs),
      ">": factory.namedNode(namespaces.log.implies),
      "<": factory.namedNode(namespaces.log.isImpliedBy)
    };
    parser.QUANTIFIERS_GRAPH = factory.namedNode("urn:n3:quantifiers");
  }
  N3Parser.SUPPORTED_VERSIONS = [
    "1.2",
    "1.2-basic",
    "1.1"
  ];
  initDataFactory(N3Parser.prototype, DataFactory$1);
  function isDefaultGraph(term) {
    return !!term && term.termType === "DefaultGraph";
  }
  function escapeRegex(regex) {
    return regex.replace(/[\]\/\(\)\*\+\?\.\\\$]/g, "\\$&");
  }
  const BASE_UNSUPPORTED = /^:?[^:?#]*(?:[?#]|$)|^file:|^[^:]*:\/*[^?#]+?\/(?:\.\.?(?:\/|$)|\/)/i;
  const SUFFIX_SUPPORTED = /^(?:(?:[^/?#]{3,}|\.?[^/?#.]\.?)(?:\/[^/?#]{3,}|\.?[^/?#.]\.?)*\/?)?(?:[?#]|$)/;
  const CURRENT = "./";
  const PARENT = "../";
  const QUERY = "?";
  const FRAGMENT = "#";
  class BaseIRI {
    constructor(base) {
      this.base = base;
      this._baseLength = 0;
      this._baseMatcher = null;
      this._pathReplacements = new Array(base.length + 1);
    }
    static supports(base) {
      return !BASE_UNSUPPORTED.test(base);
    }
    _getBaseMatcher() {
      if (this._baseMatcher)
        return this._baseMatcher;
      if (!BaseIRI.supports(this.base))
        return this._baseMatcher = /.^/;
      const scheme = /^[^:]*:\/*/.exec(this.base)[0];
      const regexHead = ["^", escapeRegex(scheme)];
      const regexTail = [];
      const segments = [], segmenter = /[^/?#]*([/?#])/y;
      let segment, query = 0, fragment = 0, last = segmenter.lastIndex = scheme.length;
      while (!query && !fragment && (segment = segmenter.exec(this.base))) {
        if (segment[1] === FRAGMENT)
          fragment = segmenter.lastIndex - 1;
        else {
          regexHead.push(escapeRegex(segment[0]), "(?:");
          regexTail.push(")?");
          if (segment[1] !== QUERY)
            segments.push(last = segmenter.lastIndex);
          else {
            query = last = segmenter.lastIndex;
            fragment = this.base.indexOf(FRAGMENT, query);
            this._pathReplacements[query] = QUERY;
          }
        }
      }
      for (let i = 0; i < segments.length; i++)
        this._pathReplacements[segments[i]] = PARENT.repeat(segments.length - i - 1);
      this._pathReplacements[segments[segments.length - 1]] = CURRENT;
      this._baseLength = fragment > 0 ? fragment : this.base.length;
      regexHead.push(
        escapeRegex(this.base.substring(last, this._baseLength)),
        query ? "(?:#|$)" : "(?:[?#]|$)"
      );
      return this._baseMatcher = new RegExp([...regexHead, ...regexTail].join(""));
    }
    toRelative(iri) {
      const match = this._getBaseMatcher().exec(iri);
      if (!match)
        return iri;
      const length = match[0].length;
      if (length === this._baseLength && length === iri.length)
        return "";
      const parentPath = this._pathReplacements[length];
      if (parentPath) {
        const suffix = iri.substring(length);
        if (parentPath !== QUERY && !SUFFIX_SUPPORTED.test(suffix))
          return iri;
        if (parentPath === CURRENT && /^[^?#]/.test(suffix))
          return suffix;
        return parentPath + suffix;
      }
      return iri.substring(length - 1);
    }
  }
  const DEFAULTGRAPH = DataFactory$1.defaultGraph();
  const { rdf, xsd } = namespaces;
  const escape = /["\\\t\n\r\b\f\u0000-\u0019\ud800-\udbff]/, escapeAll = /["\\\t\n\r\b\f\u0000-\u0019]|[\ud800-\udbff][\udc00-\udfff]/g, escapedCharacters = {
    "\\": "\\\\",
    '"': '\\"',
    "	": "\\t",
    "\n": "\\n",
    "\r": "\\r",
    "\b": "\\b",
    "\f": "\\f"
  };
  class SerializedTerm extends Term {
    // Pretty-printed nodes are not equal to any other node
    // (e.g., [] does not equal [])
    equals(other) {
      return other === this;
    }
  }
  class N3Writer {
    constructor(outputStream, options) {
      this._prefixRegex = /$0^/;
      if (outputStream && typeof outputStream.write !== "function")
        options = outputStream, outputStream = null;
      options = options || {};
      this._lists = options.lists;
      if (!outputStream) {
        let output = "";
        this._outputStream = {
          write(chunk, encoding, done) {
            output += chunk;
            done && done();
          },
          end: (done) => {
            done && done(null, output);
          }
        };
        this._endStream = true;
      } else {
        this._outputStream = outputStream;
        this._endStream = options.end === void 0 ? true : !!options.end;
      }
      this._subject = null;
      if (!/triple|quad/i.test(options.format)) {
        this._lineMode = false;
        this._graph = DEFAULTGRAPH;
        this._prefixIRIs = /* @__PURE__ */ Object.create(null);
        options.prefixes && this.addPrefixes(options.prefixes);
        if (options.baseIRI) {
          this._baseIri = new BaseIRI(options.baseIRI);
        }
      } else {
        this._lineMode = true;
        this._writeQuad = this._writeQuadLine;
      }
    }
    // ## Private methods
    // ### Whether the current graph is the default graph
    get _inDefaultGraph() {
      return DEFAULTGRAPH.equals(this._graph);
    }
    // ### `_write` writes the argument to the output stream
    _write(string, callback) {
      this._outputStream.write(string, "utf8", callback);
    }
    // ### `_writeQuad` writes the quad to the output stream
    _writeQuad(subject, predicate, object, graph, done) {
      try {
        if (!graph.equals(this._graph)) {
          this._write((this._subject === null ? "" : this._inDefaultGraph ? ".\n" : "\n}\n") + (DEFAULTGRAPH.equals(graph) ? "" : `${this._encodeIriOrBlank(graph)} {
`));
          this._graph = graph;
          this._subject = null;
        }
        if (subject.equals(this._subject)) {
          if (predicate.equals(this._predicate))
            this._write(`, ${this._encodeObject(object)}`, done);
          else
            this._write(`;
    ${this._encodePredicate(this._predicate = predicate)} ${this._encodeObject(object)}`, done);
        } else
          this._write(`${(this._subject === null ? "" : ".\n") + this._encodeSubject(this._subject = subject)} ${this._encodePredicate(this._predicate = predicate)} ${this._encodeObject(object)}`, done);
      } catch (error) {
        done && done(error);
      }
    }
    // ### `_writeQuadLine` writes the quad to the output stream as a single line
    _writeQuadLine(subject, predicate, object, graph, done) {
      delete this._prefixMatch;
      this._write(this.quadToString(subject, predicate, object, graph), done);
    }
    // ### `quadToString` serializes a quad as a string
    quadToString(subject, predicate, object, graph) {
      return `${this._encodeSubject(subject)} ${this._encodeIriOrBlank(predicate)} ${this._encodeObject(object)}${graph && graph.value ? ` ${this._encodeIriOrBlank(graph)} .
` : " .\n"}`;
    }
    // ### `quadsToString` serializes an array of quads as a string
    quadsToString(quads) {
      let quadsString = "";
      for (const quad2 of quads)
        quadsString += this.quadToString(quad2.subject, quad2.predicate, quad2.object, quad2.graph);
      return quadsString;
    }
    // ### `_encodeSubject` represents a subject
    _encodeSubject(entity) {
      return entity.termType === "Quad" ? this._encodeQuad(entity) : this._encodeIriOrBlank(entity);
    }
    // ### `_encodeIriOrBlank` represents an IRI or blank node
    _encodeIriOrBlank(entity) {
      if (entity.termType !== "NamedNode") {
        if (this._lists && entity.value in this._lists)
          entity = this.list(this._lists[entity.value]);
        return "id" in entity ? entity.id : `_:${entity.value}`;
      }
      let iri = entity.value;
      if (this._baseIri) {
        iri = this._baseIri.toRelative(iri);
      }
      if (escape.test(iri))
        iri = iri.replace(escapeAll, characterReplacer);
      const prefixMatch = this._prefixRegex.exec(iri);
      return !prefixMatch ? `<${iri}>` : !prefixMatch[1] ? iri : this._prefixIRIs[prefixMatch[1]] + prefixMatch[2];
    }
    // ### `_encodeLiteral` represents a literal
    _encodeLiteral(literal2) {
      let value = literal2.value;
      if (escape.test(value))
        value = value.replace(escapeAll, characterReplacer);
      const direction = literal2.direction ? `--${literal2.direction}` : "";
      if (literal2.language)
        return `"${value}"@${literal2.language}${direction}`;
      if (this._lineMode) {
        if (literal2.datatype.value === xsd.string)
          return `"${value}"`;
      } else {
        switch (literal2.datatype.value) {
          case xsd.string:
            return `"${value}"`;
          case xsd.boolean:
            if (value === "true" || value === "false")
              return value;
            break;
          case xsd.integer:
            if (/^[+-]?\d+$/.test(value))
              return value;
            break;
          case xsd.decimal:
            if (/^[+-]?\d*\.\d+$/.test(value))
              return value;
            break;
          case xsd.double:
            if (/^[+-]?(?:\d+\.\d*|\.?\d+)[eE][+-]?\d+$/.test(value))
              return value;
            break;
        }
      }
      return `"${value}"^^${this._encodeIriOrBlank(literal2.datatype)}`;
    }
    // ### `_encodePredicate` represents a predicate
    _encodePredicate(predicate) {
      return predicate.value === rdf.type ? "a" : this._encodeIriOrBlank(predicate);
    }
    // ### `_encodeObject` represents an object
    _encodeObject(object) {
      switch (object.termType) {
        case "Quad":
          return this._encodeQuad(object);
        case "Literal":
          return this._encodeLiteral(object);
        default:
          return this._encodeIriOrBlank(object);
      }
    }
    // ### `_encodeQuad` encodes an RDF-star quad
    _encodeQuad({ subject, predicate, object, graph }) {
      return `<<(${this._encodeSubject(subject)} ${this._encodePredicate(predicate)} ${this._encodeObject(object)}${isDefaultGraph(graph) ? "" : ` ${this._encodeIriOrBlank(graph)}`})>>`;
    }
    // ### `_blockedWrite` replaces `_write` after the writer has been closed
    _blockedWrite() {
      throw new Error("Cannot write because the writer has been closed.");
    }
    // ### `addQuad` adds the quad to the output stream
    addQuad(subject, predicate, object, graph, done) {
      if (object === void 0)
        this._writeQuad(subject.subject, subject.predicate, subject.object, subject.graph, predicate);
      else if (typeof graph === "function")
        this._writeQuad(subject, predicate, object, DEFAULTGRAPH, graph);
      else
        this._writeQuad(subject, predicate, object, graph || DEFAULTGRAPH, done);
    }
    // ### `addQuads` adds the quads to the output stream
    addQuads(quads) {
      for (let i = 0; i < quads.length; i++)
        this.addQuad(quads[i]);
    }
    // ### `addPrefix` adds the prefix to the output stream
    addPrefix(prefix, iri, done) {
      const prefixes = {};
      prefixes[prefix] = iri;
      this.addPrefixes(prefixes, done);
    }
    // ### `addPrefixes` adds the prefixes to the output stream
    addPrefixes(prefixes, done) {
      if (!this._prefixIRIs)
        return done && done();
      let hasPrefixes = false;
      for (let prefix in prefixes) {
        let iri = prefixes[prefix];
        if (typeof iri !== "string")
          iri = iri.value;
        hasPrefixes = true;
        if (this._subject !== null) {
          this._write(this._inDefaultGraph ? ".\n" : "\n}\n");
          this._subject = null, this._graph = "";
        }
        this._prefixIRIs[iri] = prefix += ":";
        this._write(`@prefix ${prefix} <${iri}>.
`);
      }
      if (hasPrefixes) {
        let IRIlist = "", prefixList = "";
        for (const prefixIRI in this._prefixIRIs) {
          IRIlist += IRIlist ? `|${prefixIRI}` : prefixIRI;
          prefixList += (prefixList ? "|" : "") + this._prefixIRIs[prefixIRI];
        }
        IRIlist = escapeRegex(IRIlist);
        this._prefixRegex = new RegExp(`^(?:${prefixList})[^/]*$|^(${IRIlist})([_a-zA-Z0-9][\\-_a-zA-Z0-9]*)$`);
      }
      this._write(hasPrefixes ? "\n" : "", done);
    }
    // ### `blank` creates a blank node with the given content
    blank(predicate, object) {
      let children = predicate, child, length;
      if (predicate === void 0)
        children = [];
      else if (predicate.termType)
        children = [{ predicate, object }];
      else if (!("length" in predicate))
        children = [predicate];
      switch (length = children.length) {
        // Generate an empty blank node
        case 0:
          return new SerializedTerm("[]");
        // Generate a non-nested one-triple blank node
        case 1:
          child = children[0];
          if (!(child.object instanceof SerializedTerm))
            return new SerializedTerm(`[ ${this._encodePredicate(child.predicate)} ${this._encodeObject(child.object)} ]`);
        // Generate a multi-triple or nested blank node
        default:
          let contents = "[";
          for (let i = 0; i < length; i++) {
            child = children[i];
            if (child.predicate.equals(predicate))
              contents += `, ${this._encodeObject(child.object)}`;
            else {
              contents += `${(i ? ";\n  " : "\n  ") + this._encodePredicate(child.predicate)} ${this._encodeObject(child.object)}`;
              predicate = child.predicate;
            }
          }
          return new SerializedTerm(`${contents}
]`);
      }
    }
    // ### `list` creates a list node with the given content
    list(elements) {
      const length = elements && elements.length || 0, contents = new Array(length);
      for (let i = 0; i < length; i++)
        contents[i] = this._encodeObject(elements[i]);
      return new SerializedTerm(`(${contents.join(" ")})`);
    }
    // ### `end` signals the end of the output stream
    end(done) {
      if (this._subject !== null) {
        this._write(this._inDefaultGraph ? ".\n" : "\n}\n");
        this._subject = null;
      }
      this._write = this._blockedWrite;
      let singleDone = done && ((error, result) => {
        singleDone = null, done(error, result);
      });
      if (this._endStream) {
        try {
          return this._outputStream.end(singleDone);
        } catch (error) {
        }
      }
      singleDone && singleDone();
    }
  }
  function characterReplacer(character) {
    let result = escapedCharacters[character];
    if (result === void 0) {
      if (character.length === 1) {
        result = character.charCodeAt(0).toString(16);
        result = "\\u0000".substr(0, 6 - result.length) + result;
      } else {
        result = ((character.charCodeAt(0) - 55296) * 1024 + character.charCodeAt(1) + 9216).toString(16);
        result = "\\U00000000".substr(0, 10 - result.length) + result;
      }
    }
    return result;
  }
  var browser$2 = { exports: {} };
  var stream = { exports: {} };
  var primordials;
  var hasRequiredPrimordials;
  function requirePrimordials() {
    if (hasRequiredPrimordials) return primordials;
    hasRequiredPrimordials = 1;
    class AggregateError extends Error {
      constructor(errors2) {
        if (!Array.isArray(errors2)) {
          throw new TypeError(`Expected input to be an Array, got ${typeof errors2}`);
        }
        let message = "";
        for (let i = 0; i < errors2.length; i++) {
          message += `    ${errors2[i].stack}
`;
        }
        super(message);
        this.name = "AggregateError";
        this.errors = errors2;
      }
    }
    primordials = {
      AggregateError,
      ArrayIsArray(self2) {
        return Array.isArray(self2);
      },
      ArrayPrototypeIncludes(self2, el) {
        return self2.includes(el);
      },
      ArrayPrototypeIndexOf(self2, el) {
        return self2.indexOf(el);
      },
      ArrayPrototypeJoin(self2, sep) {
        return self2.join(sep);
      },
      ArrayPrototypeMap(self2, fn) {
        return self2.map(fn);
      },
      ArrayPrototypePop(self2, el) {
        return self2.pop(el);
      },
      ArrayPrototypePush(self2, el) {
        return self2.push(el);
      },
      ArrayPrototypeSlice(self2, start, end) {
        return self2.slice(start, end);
      },
      Error,
      FunctionPrototypeCall(fn, thisArgs, ...args) {
        return fn.call(thisArgs, ...args);
      },
      FunctionPrototypeSymbolHasInstance(self2, instance) {
        return Function.prototype[Symbol.hasInstance].call(self2, instance);
      },
      MathFloor: Math.floor,
      Number,
      NumberIsInteger: Number.isInteger,
      NumberIsNaN: Number.isNaN,
      NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
      NumberParseInt: Number.parseInt,
      ObjectDefineProperties(self2, props) {
        return Object.defineProperties(self2, props);
      },
      ObjectDefineProperty(self2, name, prop) {
        return Object.defineProperty(self2, name, prop);
      },
      ObjectGetOwnPropertyDescriptor(self2, name) {
        return Object.getOwnPropertyDescriptor(self2, name);
      },
      ObjectKeys(obj) {
        return Object.keys(obj);
      },
      ObjectSetPrototypeOf(target, proto) {
        return Object.setPrototypeOf(target, proto);
      },
      Promise,
      PromisePrototypeCatch(self2, fn) {
        return self2.catch(fn);
      },
      PromisePrototypeThen(self2, thenFn, catchFn) {
        return self2.then(thenFn, catchFn);
      },
      PromiseReject(err) {
        return Promise.reject(err);
      },
      PromiseResolve(val) {
        return Promise.resolve(val);
      },
      ReflectApply: Reflect.apply,
      RegExpPrototypeTest(self2, value) {
        return self2.test(value);
      },
      SafeSet: Set,
      String,
      StringPrototypeSlice(self2, start, end) {
        return self2.slice(start, end);
      },
      StringPrototypeToLowerCase(self2) {
        return self2.toLowerCase();
      },
      StringPrototypeToUpperCase(self2) {
        return self2.toUpperCase();
      },
      StringPrototypeTrim(self2) {
        return self2.trim();
      },
      Symbol,
      SymbolFor: Symbol.for,
      SymbolAsyncIterator: Symbol.asyncIterator,
      SymbolHasInstance: Symbol.hasInstance,
      SymbolIterator: Symbol.iterator,
      SymbolDispose: Symbol.dispose || /* @__PURE__ */ Symbol("Symbol.dispose"),
      SymbolAsyncDispose: Symbol.asyncDispose || /* @__PURE__ */ Symbol("Symbol.asyncDispose"),
      TypedArrayPrototypeSet(self2, buf, len) {
        return self2.set(buf, len);
      },
      Boolean,
      Uint8Array
    };
    return primordials;
  }
  var util = { exports: {} };
  var inspect;
  var hasRequiredInspect;
  function requireInspect() {
    if (hasRequiredInspect) return inspect;
    hasRequiredInspect = 1;
    inspect = {
      format(format, ...args) {
        return format.replace(/%([sdifj])/g, function(...[_unused, type]) {
          const replacement = args.shift();
          if (type === "f") {
            return replacement.toFixed(6);
          } else if (type === "j") {
            return JSON.stringify(replacement);
          } else if (type === "s" && typeof replacement === "object") {
            const ctor = replacement.constructor !== Object ? replacement.constructor.name : "";
            return `${ctor} {}`.trim();
          } else {
            return replacement.toString();
          }
        });
      },
      inspect(value) {
        switch (typeof value) {
          case "string":
            if (value.includes("'")) {
              if (!value.includes('"')) {
                return `"${value}"`;
              } else if (!value.includes("`") && !value.includes("${")) {
                return `\`${value}\``;
              }
            }
            return `'${value}'`;
          case "number":
            if (isNaN(value)) {
              return "NaN";
            } else if (Object.is(value, -0)) {
              return String(value);
            }
            return value;
          case "bigint":
            return `${String(value)}n`;
          case "boolean":
          case "undefined":
            return String(value);
          case "object":
            return "{}";
        }
      }
    };
    return inspect;
  }
  var errors;
  var hasRequiredErrors;
  function requireErrors() {
    if (hasRequiredErrors) return errors;
    hasRequiredErrors = 1;
    const { format, inspect: inspect2 } = requireInspect();
    const { AggregateError: CustomAggregateError } = requirePrimordials();
    const AggregateError = globalThis.AggregateError || CustomAggregateError;
    const kIsNodeError = /* @__PURE__ */ Symbol("kIsNodeError");
    const kTypes = [
      "string",
      "function",
      "number",
      "object",
      // Accept 'Function' and 'Object' as alternative to the lower cased version.
      "Function",
      "Object",
      "boolean",
      "bigint",
      "symbol"
    ];
    const classRegExp = /^([A-Z][a-z0-9]*)+$/;
    const nodeInternalPrefix = "__node_internal_";
    const codes = {};
    function assert(value, message) {
      if (!value) {
        throw new codes.ERR_INTERNAL_ASSERTION(message);
      }
    }
    function addNumericalSeparator(val) {
      let res = "";
      let i = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`;
    }
    function getMessage(key, msg, args) {
      if (typeof msg === "function") {
        assert(
          msg.length <= args.length,
          // Default options do not count.
          `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`
        );
        return msg(...args);
      }
      const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
      assert(
        expectedLength === args.length,
        `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`
      );
      if (args.length === 0) {
        return msg;
      }
      return format(msg, ...args);
    }
    function E(code, message, Base) {
      if (!Base) {
        Base = Error;
      }
      class NodeError extends Base {
        constructor(...args) {
          super(getMessage(code, message, args));
        }
        toString() {
          return `${this.name} [${code}]: ${this.message}`;
        }
      }
      Object.defineProperties(NodeError.prototype, {
        name: {
          value: Base.name,
          writable: true,
          enumerable: false,
          configurable: true
        },
        toString: {
          value() {
            return `${this.name} [${code}]: ${this.message}`;
          },
          writable: true,
          enumerable: false,
          configurable: true
        }
      });
      NodeError.prototype.code = code;
      NodeError.prototype[kIsNodeError] = true;
      codes[code] = NodeError;
    }
    function hideStackFrames(fn) {
      const hidden = nodeInternalPrefix + fn.name;
      Object.defineProperty(fn, "name", {
        value: hidden
      });
      return fn;
    }
    function aggregateTwoErrors(innerError, outerError) {
      if (innerError && outerError && innerError !== outerError) {
        if (Array.isArray(outerError.errors)) {
          outerError.errors.push(innerError);
          return outerError;
        }
        const err = new AggregateError([outerError, innerError], outerError.message);
        err.code = outerError.code;
        return err;
      }
      return innerError || outerError;
    }
    class AbortError extends Error {
      constructor(message = "The operation was aborted", options = void 0) {
        if (options !== void 0 && typeof options !== "object") {
          throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
        }
        super(message, options);
        this.code = "ABORT_ERR";
        this.name = "AbortError";
      }
    }
    E("ERR_ASSERTION", "%s", Error);
    E(
      "ERR_INVALID_ARG_TYPE",
      (name, expected, actual) => {
        assert(typeof name === "string", "'name' must be a string");
        if (!Array.isArray(expected)) {
          expected = [expected];
        }
        let msg = "The ";
        if (name.endsWith(" argument")) {
          msg += `${name} `;
        } else {
          msg += `"${name}" ${name.includes(".") ? "property" : "argument"} `;
        }
        msg += "must be ";
        const types = [];
        const instances = [];
        const other = [];
        for (const value of expected) {
          assert(typeof value === "string", "All expected entries have to be of type string");
          if (kTypes.includes(value)) {
            types.push(value.toLowerCase());
          } else if (classRegExp.test(value)) {
            instances.push(value);
          } else {
            assert(value !== "object", 'The value "object" should be written as "Object"');
            other.push(value);
          }
        }
        if (instances.length > 0) {
          const pos = types.indexOf("object");
          if (pos !== -1) {
            types.splice(types, pos, 1);
            instances.push("Object");
          }
        }
        if (types.length > 0) {
          switch (types.length) {
            case 1:
              msg += `of type ${types[0]}`;
              break;
            case 2:
              msg += `one of type ${types[0]} or ${types[1]}`;
              break;
            default: {
              const last = types.pop();
              msg += `one of type ${types.join(", ")}, or ${last}`;
            }
          }
          if (instances.length > 0 || other.length > 0) {
            msg += " or ";
          }
        }
        if (instances.length > 0) {
          switch (instances.length) {
            case 1:
              msg += `an instance of ${instances[0]}`;
              break;
            case 2:
              msg += `an instance of ${instances[0]} or ${instances[1]}`;
              break;
            default: {
              const last = instances.pop();
              msg += `an instance of ${instances.join(", ")}, or ${last}`;
            }
          }
          if (other.length > 0) {
            msg += " or ";
          }
        }
        switch (other.length) {
          case 0:
            break;
          case 1:
            if (other[0].toLowerCase() !== other[0]) {
              msg += "an ";
            }
            msg += `${other[0]}`;
            break;
          case 2:
            msg += `one of ${other[0]} or ${other[1]}`;
            break;
          default: {
            const last = other.pop();
            msg += `one of ${other.join(", ")}, or ${last}`;
          }
        }
        if (actual == null) {
          msg += `. Received ${actual}`;
        } else if (typeof actual === "function" && actual.name) {
          msg += `. Received function ${actual.name}`;
        } else if (typeof actual === "object") {
          var _actual$constructor;
          if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== void 0 && _actual$constructor.name) {
            msg += `. Received an instance of ${actual.constructor.name}`;
          } else {
            const inspected = inspect2(actual, {
              depth: -1
            });
            msg += `. Received ${inspected}`;
          }
        } else {
          let inspected = inspect2(actual, {
            colors: false
          });
          if (inspected.length > 25) {
            inspected = `${inspected.slice(0, 25)}...`;
          }
          msg += `. Received type ${typeof actual} (${inspected})`;
        }
        return msg;
      },
      TypeError
    );
    E(
      "ERR_INVALID_ARG_VALUE",
      (name, value, reason = "is invalid") => {
        let inspected = inspect2(value);
        if (inspected.length > 128) {
          inspected = inspected.slice(0, 128) + "...";
        }
        const type = name.includes(".") ? "property" : "argument";
        return `The ${type} '${name}' ${reason}. Received ${inspected}`;
      },
      TypeError
    );
    E(
      "ERR_INVALID_RETURN_VALUE",
      (input, name, value) => {
        var _value$constructor;
        const type = value !== null && value !== void 0 && (_value$constructor = value.constructor) !== null && _value$constructor !== void 0 && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`;
        return `Expected ${input} to be returned from the "${name}" function but got ${type}.`;
      },
      TypeError
    );
    E(
      "ERR_MISSING_ARGS",
      (...args) => {
        assert(args.length > 0, "At least one arg needs to be specified");
        let msg;
        const len = args.length;
        args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(" or ");
        switch (len) {
          case 1:
            msg += `The ${args[0]} argument`;
            break;
          case 2:
            msg += `The ${args[0]} and ${args[1]} arguments`;
            break;
          default:
            {
              const last = args.pop();
              msg += `The ${args.join(", ")}, and ${last} arguments`;
            }
            break;
        }
        return `${msg} must be specified`;
      },
      TypeError
    );
    E(
      "ERR_OUT_OF_RANGE",
      (str, range, input) => {
        assert(range, 'Missing "range" argument');
        let received;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          const limit = BigInt(2) ** BigInt(32);
          if (input > limit || input < -limit) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        } else {
          received = inspect2(input);
        }
        return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
      },
      RangeError
    );
    E("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
    E("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
    E("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
    E("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
    E("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
    E("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
    E("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
    E("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
    E("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
    E("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
    E("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
    errors = {
      AbortError,
      aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
      hideStackFrames,
      codes
    };
    return errors;
  }
  var browser$1 = { exports: {} };
  var hasRequiredBrowser$2;
  function requireBrowser$2() {
    if (hasRequiredBrowser$2) return browser$1.exports;
    hasRequiredBrowser$2 = 1;
    const { AbortController, AbortSignal } = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : (
      /* otherwise */
      void 0
    );
    browser$1.exports = AbortController;
    browser$1.exports.AbortSignal = AbortSignal;
    browser$1.exports.default = AbortController;
    return browser$1.exports;
  }
  var events = { exports: {} };
  var hasRequiredEvents;
  function requireEvents() {
    if (hasRequiredEvents) return events.exports;
    hasRequiredEvents = 1;
    var R = typeof Reflect === "object" ? Reflect : null;
    var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
      return Function.prototype.apply.call(target, receiver, args);
    };
    var ReflectOwnKeys;
    if (R && typeof R.ownKeys === "function") {
      ReflectOwnKeys = R.ownKeys;
    } else if (Object.getOwnPropertySymbols) {
      ReflectOwnKeys = function ReflectOwnKeys2(target) {
        return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
      };
    } else {
      ReflectOwnKeys = function ReflectOwnKeys2(target) {
        return Object.getOwnPropertyNames(target);
      };
    }
    function ProcessEmitWarning(warning) {
      if (console && console.warn) console.warn(warning);
    }
    var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
      return value !== value;
    };
    function EventEmitter() {
      EventEmitter.init.call(this);
    }
    events.exports = EventEmitter;
    events.exports.once = once;
    EventEmitter.EventEmitter = EventEmitter;
    EventEmitter.prototype._events = void 0;
    EventEmitter.prototype._eventsCount = 0;
    EventEmitter.prototype._maxListeners = void 0;
    var defaultMaxListeners = 10;
    function checkListener(listener) {
      if (typeof listener !== "function") {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }
    }
    Object.defineProperty(EventEmitter, "defaultMaxListeners", {
      enumerable: true,
      get: function() {
        return defaultMaxListeners;
      },
      set: function(arg) {
        if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
          throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
        }
        defaultMaxListeners = arg;
      }
    });
    EventEmitter.init = function() {
      if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
      }
      this._maxListeners = this._maxListeners || void 0;
    };
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
        throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
      }
      this._maxListeners = n;
      return this;
    };
    function _getMaxListeners(that) {
      if (that._maxListeners === void 0)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }
    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return _getMaxListeners(this);
    };
    EventEmitter.prototype.emit = function emit(type) {
      var args = [];
      for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
      var doError = type === "error";
      var events2 = this._events;
      if (events2 !== void 0)
        doError = doError && events2.error === void 0;
      else if (!doError)
        return false;
      if (doError) {
        var er;
        if (args.length > 0)
          er = args[0];
        if (er instanceof Error) {
          throw er;
        }
        var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
        err.context = er;
        throw err;
      }
      var handler = events2[type];
      if (handler === void 0)
        return false;
      if (typeof handler === "function") {
        ReflectApply(handler, this, args);
      } else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          ReflectApply(listeners[i], this, args);
      }
      return true;
    };
    function _addListener(target, type, listener, prepend) {
      var m;
      var events2;
      var existing;
      checkListener(listener);
      events2 = target._events;
      if (events2 === void 0) {
        events2 = target._events = /* @__PURE__ */ Object.create(null);
        target._eventsCount = 0;
      } else {
        if (events2.newListener !== void 0) {
          target.emit(
            "newListener",
            type,
            listener.listener ? listener.listener : listener
          );
          events2 = target._events;
        }
        existing = events2[type];
      }
      if (existing === void 0) {
        existing = events2[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === "function") {
          existing = events2[type] = prepend ? [listener, existing] : [existing, listener];
        } else if (prepend) {
          existing.unshift(listener);
        } else {
          existing.push(listener);
        }
        m = _getMaxListeners(target);
        if (m > 0 && existing.length > m && !existing.warned) {
          existing.warned = true;
          var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
          w.name = "MaxListenersExceededWarning";
          w.emitter = target;
          w.type = type;
          w.count = existing.length;
          ProcessEmitWarning(w);
        }
      }
      return target;
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };
    EventEmitter.prototype.on = EventEmitter.prototype.addListener;
    EventEmitter.prototype.prependListener = function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };
    function onceWrapper() {
      if (!this.fired) {
        this.target.removeListener(this.type, this.wrapFn);
        this.fired = true;
        if (arguments.length === 0)
          return this.listener.call(this.target);
        return this.listener.apply(this.target, arguments);
      }
    }
    function _onceWrap(target, type, listener) {
      var state2 = { fired: false, wrapFn: void 0, target, type, listener };
      var wrapped = onceWrapper.bind(state2);
      wrapped.listener = listener;
      state2.wrapFn = wrapped;
      return wrapped;
    }
    EventEmitter.prototype.once = function once2(type, listener) {
      checkListener(listener);
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };
    EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };
    EventEmitter.prototype.removeListener = function removeListener(type, listener) {
      var list, events2, position, i, originalListener;
      checkListener(listener);
      events2 = this._events;
      if (events2 === void 0)
        return this;
      list = events2[type];
      if (list === void 0)
        return this;
      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = /* @__PURE__ */ Object.create(null);
        else {
          delete events2[type];
          if (events2.removeListener)
            this.emit("removeListener", type, list.listener || listener);
        }
      } else if (typeof list !== "function") {
        position = -1;
        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }
        if (position < 0)
          return this;
        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }
        if (list.length === 1)
          events2[type] = list[0];
        if (events2.removeListener !== void 0)
          this.emit("removeListener", type, originalListener || listener);
      }
      return this;
    };
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
      var listeners, events2, i;
      events2 = this._events;
      if (events2 === void 0)
        return this;
      if (events2.removeListener === void 0) {
        if (arguments.length === 0) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        } else if (events2[type] !== void 0) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else
            delete events2[type];
        }
        return this;
      }
      if (arguments.length === 0) {
        var keys = Object.keys(events2);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === "removeListener") continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners("removeListener");
        this._events = /* @__PURE__ */ Object.create(null);
        this._eventsCount = 0;
        return this;
      }
      listeners = events2[type];
      if (typeof listeners === "function") {
        this.removeListener(type, listeners);
      } else if (listeners !== void 0) {
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }
      return this;
    };
    function _listeners(target, type, unwrap) {
      var events2 = target._events;
      if (events2 === void 0)
        return [];
      var evlistener = events2[type];
      if (evlistener === void 0)
        return [];
      if (typeof evlistener === "function")
        return unwrap ? [evlistener.listener || evlistener] : [evlistener];
      return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
    }
    EventEmitter.prototype.listeners = function listeners(type) {
      return _listeners(this, type, true);
    };
    EventEmitter.prototype.rawListeners = function rawListeners(type) {
      return _listeners(this, type, false);
    };
    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === "function") {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };
    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events2 = this._events;
      if (events2 !== void 0) {
        var evlistener = events2[type];
        if (typeof evlistener === "function") {
          return 1;
        } else if (evlistener !== void 0) {
          return evlistener.length;
        }
      }
      return 0;
    }
    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
    };
    function arrayClone(arr, n) {
      var copy = new Array(n);
      for (var i = 0; i < n; ++i)
        copy[i] = arr[i];
      return copy;
    }
    function spliceOne(list, index) {
      for (; index + 1 < list.length; index++)
        list[index] = list[index + 1];
      list.pop();
    }
    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }
    function once(emitter, name) {
      return new Promise(function(resolve, reject) {
        function errorListener(err) {
          emitter.removeListener(name, resolver);
          reject(err);
        }
        function resolver() {
          if (typeof emitter.removeListener === "function") {
            emitter.removeListener("error", errorListener);
          }
          resolve([].slice.call(arguments));
        }
        eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
        if (name !== "error") {
          addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
        }
      });
    }
    function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
      if (typeof emitter.on === "function") {
        eventTargetAgnosticAddListener(emitter, "error", handler, flags);
      }
    }
    function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
      if (typeof emitter.on === "function") {
        if (flags.once) {
          emitter.once(name, listener);
        } else {
          emitter.on(name, listener);
        }
      } else if (typeof emitter.addEventListener === "function") {
        emitter.addEventListener(name, function wrapListener(arg) {
          if (flags.once) {
            emitter.removeEventListener(name, wrapListener);
          }
          listener(arg);
        });
      } else {
        throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
      }
    }
    return events.exports;
  }
  var hasRequiredUtil$3;
  function requireUtil$3() {
    if (hasRequiredUtil$3) return util.exports;
    hasRequiredUtil$3 = 1;
    (function(module2) {
      const bufferModule = requireBuffer();
      const { format, inspect: inspect2 } = requireInspect();
      const {
        codes: { ERR_INVALID_ARG_TYPE }
      } = requireErrors();
      const { kResistStopPropagation, AggregateError, SymbolDispose } = requirePrimordials();
      const AbortSignal = globalThis.AbortSignal || requireBrowser$2().AbortSignal;
      const AbortController = globalThis.AbortController || requireBrowser$2().AbortController;
      const AsyncFunction = Object.getPrototypeOf(async function() {
      }).constructor;
      const Blob = globalThis.Blob || bufferModule.Blob;
      const isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
        return b instanceof Blob;
      } : function isBlob3(b) {
        return false;
      };
      const validateAbortSignal = (signal, name) => {
        if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
          throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
        }
      };
      const validateFunction = (value, name) => {
        if (typeof value !== "function") {
          throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
        }
      };
      module2.exports = {
        AggregateError,
        kEmptyObject: Object.freeze({}),
        once(callback) {
          let called = false;
          return function(...args) {
            if (called) {
              return;
            }
            called = true;
            callback.apply(this, args);
          };
        },
        createDeferredPromise: function() {
          let resolve;
          let reject;
          const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });
          return {
            promise,
            resolve,
            reject
          };
        },
        promisify(fn) {
          return new Promise((resolve, reject) => {
            fn((err, ...args) => {
              if (err) {
                return reject(err);
              }
              return resolve(...args);
            });
          });
        },
        debuglog() {
          return function() {
          };
        },
        format,
        inspect: inspect2,
        types: {
          isAsyncFunction(fn) {
            return fn instanceof AsyncFunction;
          },
          isArrayBufferView(arr) {
            return ArrayBuffer.isView(arr);
          }
        },
        isBlob,
        deprecate(fn, message) {
          return fn;
        },
        addAbortListener: requireEvents().addAbortListener || function addAbortListener(signal, listener) {
          if (signal === void 0) {
            throw new ERR_INVALID_ARG_TYPE("signal", "AbortSignal", signal);
          }
          validateAbortSignal(signal, "signal");
          validateFunction(listener, "listener");
          let removeEventListener;
          if (signal.aborted) {
            queueMicrotask(() => listener());
          } else {
            signal.addEventListener("abort", listener, {
              __proto__: null,
              once: true,
              [kResistStopPropagation]: true
            });
            removeEventListener = () => {
              signal.removeEventListener("abort", listener);
            };
          }
          return {
            __proto__: null,
            [SymbolDispose]() {
              var _removeEventListener;
              (_removeEventListener = removeEventListener) === null || _removeEventListener === void 0 ? void 0 : _removeEventListener();
            }
          };
        },
        AbortSignalAny: AbortSignal.any || function AbortSignalAny(signals) {
          if (signals.length === 1) {
            return signals[0];
          }
          const ac = new AbortController();
          const abort = () => ac.abort();
          signals.forEach((signal) => {
            validateAbortSignal(signal, "signals");
            signal.addEventListener("abort", abort, {
              once: true
            });
          });
          ac.signal.addEventListener(
            "abort",
            () => {
              signals.forEach((signal) => signal.removeEventListener("abort", abort));
            },
            {
              once: true
            }
          );
          return ac.signal;
        }
      };
      module2.exports.promisify.custom = /* @__PURE__ */ Symbol.for("nodejs.util.promisify.custom");
    })(util);
    return util.exports;
  }
  var operators = {};
  var validators;
  var hasRequiredValidators;
  function requireValidators() {
    if (hasRequiredValidators) return validators;
    hasRequiredValidators = 1;
    const {
      ArrayIsArray,
      ArrayPrototypeIncludes,
      ArrayPrototypeJoin,
      ArrayPrototypeMap,
      NumberIsInteger,
      NumberIsNaN,
      NumberMAX_SAFE_INTEGER,
      NumberMIN_SAFE_INTEGER,
      NumberParseInt,
      ObjectPrototypeHasOwnProperty,
      RegExpPrototypeExec,
      String: String2,
      StringPrototypeToUpperCase,
      StringPrototypeTrim
    } = requirePrimordials();
    const {
      hideStackFrames,
      codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL }
    } = requireErrors();
    const { normalizeEncoding } = requireUtil$3();
    const { isAsyncFunction, isArrayBufferView } = requireUtil$3().types;
    const signals = {};
    function isInt32(value) {
      return value === (value | 0);
    }
    function isUint32(value) {
      return value === value >>> 0;
    }
    const octalReg = /^[0-7]+$/;
    const modeDesc = "must be a 32-bit unsigned integer or an octal string";
    function parseFileMode(value, name, def) {
      if (typeof value === "undefined") {
        value = def;
      }
      if (typeof value === "string") {
        if (RegExpPrototypeExec(octalReg, value) === null) {
          throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc);
        }
        value = NumberParseInt(value, 8);
      }
      validateUint32(value, name);
      return value;
    }
    const validateInteger = hideStackFrames((value, name, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
      if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      if (!NumberIsInteger(value)) throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    });
    const validateInt32 = hideStackFrames((value, name, min = -2147483648, max = 2147483647) => {
      if (typeof value !== "number") {
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      }
      if (!NumberIsInteger(value)) {
        throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      }
      if (value < min || value > max) {
        throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
      }
    });
    const validateUint32 = hideStackFrames((value, name, positive = false) => {
      if (typeof value !== "number") {
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      }
      if (!NumberIsInteger(value)) {
        throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      }
      const min = positive ? 1 : 0;
      const max = 4294967295;
      if (value < min || value > max) {
        throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
      }
    });
    function validateString(value, name) {
      if (typeof value !== "string") throw new ERR_INVALID_ARG_TYPE(name, "string", value);
    }
    function validateNumber(value, name, min = void 0, max) {
      if (typeof value !== "number") throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      if (min != null && value < min || max != null && value > max || (min != null || max != null) && NumberIsNaN(value)) {
        throw new ERR_OUT_OF_RANGE(
          name,
          `${min != null ? `>= ${min}` : ""}${min != null && max != null ? " && " : ""}${max != null ? `<= ${max}` : ""}`,
          value
        );
      }
    }
    const validateOneOf = hideStackFrames((value, name, oneOf) => {
      if (!ArrayPrototypeIncludes(oneOf, value)) {
        const allowed = ArrayPrototypeJoin(
          ArrayPrototypeMap(oneOf, (v) => typeof v === "string" ? `'${v}'` : String2(v)),
          ", "
        );
        const reason = "must be one of: " + allowed;
        throw new ERR_INVALID_ARG_VALUE(name, value, reason);
      }
    });
    function validateBoolean(value, name) {
      if (typeof value !== "boolean") throw new ERR_INVALID_ARG_TYPE(name, "boolean", value);
    }
    function getOwnPropertyValueOrDefault(options, key, defaultValue) {
      return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
    }
    const validateObject = hideStackFrames((value, name, options = null) => {
      const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
      const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
      const nullable = getOwnPropertyValueOrDefault(options, "nullable", false);
      if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
        throw new ERR_INVALID_ARG_TYPE(name, "Object", value);
      }
    });
    const validateDictionary = hideStackFrames((value, name) => {
      if (value != null && typeof value !== "object" && typeof value !== "function") {
        throw new ERR_INVALID_ARG_TYPE(name, "a dictionary", value);
      }
    });
    const validateArray = hideStackFrames((value, name, minLength = 0) => {
      if (!ArrayIsArray(value)) {
        throw new ERR_INVALID_ARG_TYPE(name, "Array", value);
      }
      if (value.length < minLength) {
        const reason = `must be longer than ${minLength}`;
        throw new ERR_INVALID_ARG_VALUE(name, value, reason);
      }
    });
    function validateStringArray(value, name) {
      validateArray(value, name);
      for (let i = 0; i < value.length; i++) {
        validateString(value[i], `${name}[${i}]`);
      }
    }
    function validateBooleanArray(value, name) {
      validateArray(value, name);
      for (let i = 0; i < value.length; i++) {
        validateBoolean(value[i], `${name}[${i}]`);
      }
    }
    function validateAbortSignalArray(value, name) {
      validateArray(value, name);
      for (let i = 0; i < value.length; i++) {
        const signal = value[i];
        const indexedName = `${name}[${i}]`;
        if (signal == null) {
          throw new ERR_INVALID_ARG_TYPE(indexedName, "AbortSignal", signal);
        }
        validateAbortSignal(signal, indexedName);
      }
    }
    function validateSignalName(signal, name = "signal") {
      validateString(signal, name);
      if (signals[signal] === void 0) {
        if (signals[StringPrototypeToUpperCase(signal)] !== void 0) {
          throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
        }
        throw new ERR_UNKNOWN_SIGNAL(signal);
      }
    }
    const validateBuffer = hideStackFrames((buffer2, name = "buffer") => {
      if (!isArrayBufferView(buffer2)) {
        throw new ERR_INVALID_ARG_TYPE(name, ["Buffer", "TypedArray", "DataView"], buffer2);
      }
    });
    function validateEncoding(data, encoding) {
      const normalizedEncoding = normalizeEncoding(encoding);
      const length = data.length;
      if (normalizedEncoding === "hex" && length % 2 !== 0) {
        throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
      }
    }
    function validatePort(port, name = "Port", allowZero = true) {
      if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) {
        throw new ERR_SOCKET_BAD_PORT(name, port, allowZero);
      }
      return port | 0;
    }
    const validateAbortSignal = hideStackFrames((signal, name) => {
      if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
        throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
      }
    });
    const validateFunction = hideStackFrames((value, name) => {
      if (typeof value !== "function") throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
    });
    const validatePlainFunction = hideStackFrames((value, name) => {
      if (typeof value !== "function" || isAsyncFunction(value)) throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
    });
    const validateUndefined = hideStackFrames((value, name) => {
      if (value !== void 0) throw new ERR_INVALID_ARG_TYPE(name, "undefined", value);
    });
    function validateUnion(value, name, union) {
      if (!ArrayPrototypeIncludes(union, value)) {
        throw new ERR_INVALID_ARG_TYPE(name, `('${ArrayPrototypeJoin(union, "|")}')`, value);
      }
    }
    const linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
    function validateLinkHeaderFormat(value, name) {
      if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) {
        throw new ERR_INVALID_ARG_VALUE(
          name,
          value,
          'must be an array or string of format "</styles.css>; rel=preload; as=style"'
        );
      }
    }
    function validateLinkHeaderValue(hints) {
      if (typeof hints === "string") {
        validateLinkHeaderFormat(hints, "hints");
        return hints;
      } else if (ArrayIsArray(hints)) {
        const hintsLength = hints.length;
        let result = "";
        if (hintsLength === 0) {
          return result;
        }
        for (let i = 0; i < hintsLength; i++) {
          const link2 = hints[i];
          validateLinkHeaderFormat(link2, "hints");
          result += link2;
          if (i !== hintsLength - 1) {
            result += ", ";
          }
        }
        return result;
      }
      throw new ERR_INVALID_ARG_VALUE(
        "hints",
        hints,
        'must be an array or string of format "</styles.css>; rel=preload; as=style"'
      );
    }
    validators = {
      isInt32,
      isUint32,
      parseFileMode,
      validateArray,
      validateStringArray,
      validateBooleanArray,
      validateAbortSignalArray,
      validateBoolean,
      validateBuffer,
      validateDictionary,
      validateEncoding,
      validateFunction,
      validateInt32,
      validateInteger,
      validateNumber,
      validateObject,
      validateOneOf,
      validatePlainFunction,
      validatePort,
      validateSignalName,
      validateString,
      validateUint32,
      validateUndefined,
      validateUnion,
      validateAbortSignal,
      validateLinkHeaderValue
    };
    return validators;
  }
  var endOfStream = { exports: {} };
  var browser = { exports: {} };
  var hasRequiredBrowser$1;
  function requireBrowser$1() {
    if (hasRequiredBrowser$1) return browser.exports;
    hasRequiredBrowser$1 = 1;
    var process = browser.exports = {};
    var cachedSetTimeout;
    var cachedClearTimeout;
    function defaultSetTimout() {
      throw new Error("setTimeout has not been defined");
    }
    function defaultClearTimeout() {
      throw new Error("clearTimeout has not been defined");
    }
    (function() {
      try {
        if (typeof setTimeout === "function") {
          cachedSetTimeout = setTimeout;
        } else {
          cachedSetTimeout = defaultSetTimout;
        }
      } catch (e) {
        cachedSetTimeout = defaultSetTimout;
      }
      try {
        if (typeof clearTimeout === "function") {
          cachedClearTimeout = clearTimeout;
        } else {
          cachedClearTimeout = defaultClearTimeout;
        }
      } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
      }
    })();
    function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
        return setTimeout(fun, 0);
      }
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
      }
      try {
        return cachedSetTimeout(fun, 0);
      } catch (e) {
        try {
          return cachedSetTimeout.call(null, fun, 0);
        } catch (e2) {
          return cachedSetTimeout.call(this, fun, 0);
        }
      }
    }
    function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
        return clearTimeout(marker);
      }
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
      }
      try {
        return cachedClearTimeout(marker);
      } catch (e) {
        try {
          return cachedClearTimeout.call(null, marker);
        } catch (e2) {
          return cachedClearTimeout.call(this, marker);
        }
      }
    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;
    function cleanUpNextTick() {
      if (!draining || !currentQueue) {
        return;
      }
      draining = false;
      if (currentQueue.length) {
        queue = currentQueue.concat(queue);
      } else {
        queueIndex = -1;
      }
      if (queue.length) {
        drainQueue();
      }
    }
    function drainQueue() {
      if (draining) {
        return;
      }
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;
      var len = queue.length;
      while (len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
          if (currentQueue) {
            currentQueue[queueIndex].run();
          }
        }
        queueIndex = -1;
        len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
    }
    process.nextTick = function(fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
          args[i - 1] = arguments[i];
        }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
      }
    };
    function Item(fun, array) {
      this.fun = fun;
      this.array = array;
    }
    Item.prototype.run = function() {
      this.fun.apply(null, this.array);
    };
    process.title = "browser";
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = "";
    process.versions = {};
    function noop2() {
    }
    process.on = noop2;
    process.addListener = noop2;
    process.once = noop2;
    process.off = noop2;
    process.removeListener = noop2;
    process.removeAllListeners = noop2;
    process.emit = noop2;
    process.prependListener = noop2;
    process.prependOnceListener = noop2;
    process.listeners = function(name) {
      return [];
    };
    process.binding = function(name) {
      throw new Error("process.binding is not supported");
    };
    process.cwd = function() {
      return "/";
    };
    process.chdir = function(dir) {
      throw new Error("process.chdir is not supported");
    };
    process.umask = function() {
      return 0;
    };
    return browser.exports;
  }
  var utils;
  var hasRequiredUtils;
  function requireUtils() {
    if (hasRequiredUtils) return utils;
    hasRequiredUtils = 1;
    const { SymbolAsyncIterator, SymbolIterator, SymbolFor } = requirePrimordials();
    const kIsDestroyed = SymbolFor("nodejs.stream.destroyed");
    const kIsErrored = SymbolFor("nodejs.stream.errored");
    const kIsReadable = SymbolFor("nodejs.stream.readable");
    const kIsWritable = SymbolFor("nodejs.stream.writable");
    const kIsDisturbed = SymbolFor("nodejs.stream.disturbed");
    const kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
    const kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
    function isReadableNodeStream(obj, strict = false) {
      var _obj$_readableState;
      return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === void 0 ? void 0 : _obj$_readableState.readable) !== false) && // Duplex
      (!obj._writableState || obj._readableState));
    }
    function isWritableNodeStream(obj) {
      var _obj$_writableState;
      return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === void 0 ? void 0 : _obj$_writableState.writable) !== false));
    }
    function isDuplexNodeStream(obj) {
      return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
    }
    function isNodeStream(obj) {
      return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
    }
    function isReadableStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
    }
    function isWritableStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
    }
    function isTransformStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
    }
    function isWebStream(obj) {
      return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
    }
    function isIterable(obj, isAsync) {
      if (obj == null) return false;
      if (isAsync === true) return typeof obj[SymbolAsyncIterator] === "function";
      if (isAsync === false) return typeof obj[SymbolIterator] === "function";
      return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
    }
    function isDestroyed(stream2) {
      if (!isNodeStream(stream2)) return null;
      const wState = stream2._writableState;
      const rState = stream2._readableState;
      const state2 = wState || rState;
      return !!(stream2.destroyed || stream2[kIsDestroyed] || state2 !== null && state2 !== void 0 && state2.destroyed);
    }
    function isWritableEnded(stream2) {
      if (!isWritableNodeStream(stream2)) return null;
      if (stream2.writableEnded === true) return true;
      const wState = stream2._writableState;
      if (wState !== null && wState !== void 0 && wState.errored) return false;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.ended) !== "boolean") return null;
      return wState.ended;
    }
    function isWritableFinished(stream2, strict) {
      if (!isWritableNodeStream(stream2)) return null;
      if (stream2.writableFinished === true) return true;
      const wState = stream2._writableState;
      if (wState !== null && wState !== void 0 && wState.errored) return false;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.finished) !== "boolean") return null;
      return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
    }
    function isReadableEnded(stream2) {
      if (!isReadableNodeStream(stream2)) return null;
      if (stream2.readableEnded === true) return true;
      const rState = stream2._readableState;
      if (!rState || rState.errored) return false;
      if (typeof (rState === null || rState === void 0 ? void 0 : rState.ended) !== "boolean") return null;
      return rState.ended;
    }
    function isReadableFinished(stream2, strict) {
      if (!isReadableNodeStream(stream2)) return null;
      const rState = stream2._readableState;
      if (rState !== null && rState !== void 0 && rState.errored) return false;
      if (typeof (rState === null || rState === void 0 ? void 0 : rState.endEmitted) !== "boolean") return null;
      return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
    }
    function isReadable(stream2) {
      if (stream2 && stream2[kIsReadable] != null) return stream2[kIsReadable];
      if (typeof (stream2 === null || stream2 === void 0 ? void 0 : stream2.readable) !== "boolean") return null;
      if (isDestroyed(stream2)) return false;
      return isReadableNodeStream(stream2) && stream2.readable && !isReadableFinished(stream2);
    }
    function isWritable(stream2) {
      if (stream2 && stream2[kIsWritable] != null) return stream2[kIsWritable];
      if (typeof (stream2 === null || stream2 === void 0 ? void 0 : stream2.writable) !== "boolean") return null;
      if (isDestroyed(stream2)) return false;
      return isWritableNodeStream(stream2) && stream2.writable && !isWritableEnded(stream2);
    }
    function isFinished(stream2, opts) {
      if (!isNodeStream(stream2)) {
        return null;
      }
      if (isDestroyed(stream2)) {
        return true;
      }
      if ((opts === null || opts === void 0 ? void 0 : opts.readable) !== false && isReadable(stream2)) {
        return false;
      }
      if ((opts === null || opts === void 0 ? void 0 : opts.writable) !== false && isWritable(stream2)) {
        return false;
      }
      return true;
    }
    function isWritableErrored(stream2) {
      var _stream$_writableStat, _stream$_writableStat2;
      if (!isNodeStream(stream2)) {
        return null;
      }
      if (stream2.writableErrored) {
        return stream2.writableErrored;
      }
      return (_stream$_writableStat = (_stream$_writableStat2 = stream2._writableState) === null || _stream$_writableStat2 === void 0 ? void 0 : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== void 0 ? _stream$_writableStat : null;
    }
    function isReadableErrored(stream2) {
      var _stream$_readableStat, _stream$_readableStat2;
      if (!isNodeStream(stream2)) {
        return null;
      }
      if (stream2.readableErrored) {
        return stream2.readableErrored;
      }
      return (_stream$_readableStat = (_stream$_readableStat2 = stream2._readableState) === null || _stream$_readableStat2 === void 0 ? void 0 : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== void 0 ? _stream$_readableStat : null;
    }
    function isClosed(stream2) {
      if (!isNodeStream(stream2)) {
        return null;
      }
      if (typeof stream2.closed === "boolean") {
        return stream2.closed;
      }
      const wState = stream2._writableState;
      const rState = stream2._readableState;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.closed) === "boolean" || typeof (rState === null || rState === void 0 ? void 0 : rState.closed) === "boolean") {
        return (wState === null || wState === void 0 ? void 0 : wState.closed) || (rState === null || rState === void 0 ? void 0 : rState.closed);
      }
      if (typeof stream2._closed === "boolean" && isOutgoingMessage(stream2)) {
        return stream2._closed;
      }
      return null;
    }
    function isOutgoingMessage(stream2) {
      return typeof stream2._closed === "boolean" && typeof stream2._defaultKeepAlive === "boolean" && typeof stream2._removedConnection === "boolean" && typeof stream2._removedContLen === "boolean";
    }
    function isServerResponse(stream2) {
      return typeof stream2._sent100 === "boolean" && isOutgoingMessage(stream2);
    }
    function isServerRequest(stream2) {
      var _stream$req;
      return typeof stream2._consuming === "boolean" && typeof stream2._dumped === "boolean" && ((_stream$req = stream2.req) === null || _stream$req === void 0 ? void 0 : _stream$req.upgradeOrConnect) === void 0;
    }
    function willEmitClose(stream2) {
      if (!isNodeStream(stream2)) return null;
      const wState = stream2._writableState;
      const rState = stream2._readableState;
      const state2 = wState || rState;
      return !state2 && isServerResponse(stream2) || !!(state2 && state2.autoDestroy && state2.emitClose && state2.closed === false);
    }
    function isDisturbed(stream2) {
      var _stream$kIsDisturbed;
      return !!(stream2 && ((_stream$kIsDisturbed = stream2[kIsDisturbed]) !== null && _stream$kIsDisturbed !== void 0 ? _stream$kIsDisturbed : stream2.readableDidRead || stream2.readableAborted));
    }
    function isErrored(stream2) {
      var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
      return !!(stream2 && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream2[kIsErrored]) !== null && _stream$kIsErrored !== void 0 ? _stream$kIsErrored : stream2.readableErrored) !== null && _ref5 !== void 0 ? _ref5 : stream2.writableErrored) !== null && _ref4 !== void 0 ? _ref4 : (_stream$_readableStat3 = stream2._readableState) === null || _stream$_readableStat3 === void 0 ? void 0 : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== void 0 ? _ref3 : (_stream$_writableStat3 = stream2._writableState) === null || _stream$_writableStat3 === void 0 ? void 0 : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== void 0 ? _ref2 : (_stream$_readableStat4 = stream2._readableState) === null || _stream$_readableStat4 === void 0 ? void 0 : _stream$_readableStat4.errored) !== null && _ref !== void 0 ? _ref : (_stream$_writableStat4 = stream2._writableState) === null || _stream$_writableStat4 === void 0 ? void 0 : _stream$_writableStat4.errored));
    }
    utils = {
      isDestroyed,
      kIsDestroyed,
      isDisturbed,
      kIsDisturbed,
      isErrored,
      kIsErrored,
      isReadable,
      kIsReadable,
      kIsClosedPromise,
      kControllerErrorFunction,
      kIsWritable,
      isClosed,
      isDuplexNodeStream,
      isFinished,
      isIterable,
      isReadableNodeStream,
      isReadableStream,
      isReadableEnded,
      isReadableFinished,
      isReadableErrored,
      isNodeStream,
      isWebStream,
      isWritable,
      isWritableNodeStream,
      isWritableStream,
      isWritableEnded,
      isWritableFinished,
      isWritableErrored,
      isServerRequest,
      isServerResponse,
      willEmitClose,
      isTransformStream
    };
    return utils;
  }
  var hasRequiredEndOfStream;
  function requireEndOfStream() {
    if (hasRequiredEndOfStream) return endOfStream.exports;
    hasRequiredEndOfStream = 1;
    const process = requireBrowser$1();
    const { AbortError, codes } = requireErrors();
    const { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes;
    const { kEmptyObject, once } = requireUtil$3();
    const { validateAbortSignal, validateFunction, validateObject, validateBoolean } = requireValidators();
    const { Promise: Promise2, PromisePrototypeThen, SymbolDispose } = requirePrimordials();
    const {
      isClosed,
      isReadable,
      isReadableNodeStream,
      isReadableStream,
      isReadableFinished,
      isReadableErrored,
      isWritable,
      isWritableNodeStream,
      isWritableStream,
      isWritableFinished,
      isWritableErrored,
      isNodeStream,
      willEmitClose: _willEmitClose,
      kIsClosedPromise
    } = requireUtils();
    let addAbortListener;
    function isRequest(stream2) {
      return stream2.setHeader && typeof stream2.abort === "function";
    }
    const nop = () => {
    };
    function eos(stream2, options, callback) {
      var _options$readable, _options$writable;
      if (arguments.length === 2) {
        callback = options;
        options = kEmptyObject;
      } else if (options == null) {
        options = kEmptyObject;
      } else {
        validateObject(options, "options");
      }
      validateFunction(callback, "callback");
      validateAbortSignal(options.signal, "options.signal");
      callback = once(callback);
      if (isReadableStream(stream2) || isWritableStream(stream2)) {
        return eosWeb(stream2, options, callback);
      }
      if (!isNodeStream(stream2)) {
        throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream2);
      }
      const readable2 = (_options$readable = options.readable) !== null && _options$readable !== void 0 ? _options$readable : isReadableNodeStream(stream2);
      const writable2 = (_options$writable = options.writable) !== null && _options$writable !== void 0 ? _options$writable : isWritableNodeStream(stream2);
      const wState = stream2._writableState;
      const rState = stream2._readableState;
      const onlegacyfinish = () => {
        if (!stream2.writable) {
          onfinish();
        }
      };
      let willEmitClose = _willEmitClose(stream2) && isReadableNodeStream(stream2) === readable2 && isWritableNodeStream(stream2) === writable2;
      let writableFinished = isWritableFinished(stream2, false);
      const onfinish = () => {
        writableFinished = true;
        if (stream2.destroyed) {
          willEmitClose = false;
        }
        if (willEmitClose && (!stream2.readable || readable2)) {
          return;
        }
        if (!readable2 || readableFinished) {
          callback.call(stream2);
        }
      };
      let readableFinished = isReadableFinished(stream2, false);
      const onend = () => {
        readableFinished = true;
        if (stream2.destroyed) {
          willEmitClose = false;
        }
        if (willEmitClose && (!stream2.writable || writable2)) {
          return;
        }
        if (!writable2 || writableFinished) {
          callback.call(stream2);
        }
      };
      const onerror = (err) => {
        callback.call(stream2, err);
      };
      let closed = isClosed(stream2);
      const onclose = () => {
        closed = true;
        const errored = isWritableErrored(stream2) || isReadableErrored(stream2);
        if (errored && typeof errored !== "boolean") {
          return callback.call(stream2, errored);
        }
        if (readable2 && !readableFinished && isReadableNodeStream(stream2, true)) {
          if (!isReadableFinished(stream2, false)) return callback.call(stream2, new ERR_STREAM_PREMATURE_CLOSE());
        }
        if (writable2 && !writableFinished) {
          if (!isWritableFinished(stream2, false)) return callback.call(stream2, new ERR_STREAM_PREMATURE_CLOSE());
        }
        callback.call(stream2);
      };
      const onclosed = () => {
        closed = true;
        const errored = isWritableErrored(stream2) || isReadableErrored(stream2);
        if (errored && typeof errored !== "boolean") {
          return callback.call(stream2, errored);
        }
        callback.call(stream2);
      };
      const onrequest = () => {
        stream2.req.on("finish", onfinish);
      };
      if (isRequest(stream2)) {
        stream2.on("complete", onfinish);
        if (!willEmitClose) {
          stream2.on("abort", onclose);
        }
        if (stream2.req) {
          onrequest();
        } else {
          stream2.on("request", onrequest);
        }
      } else if (writable2 && !wState) {
        stream2.on("end", onlegacyfinish);
        stream2.on("close", onlegacyfinish);
      }
      if (!willEmitClose && typeof stream2.aborted === "boolean") {
        stream2.on("aborted", onclose);
      }
      stream2.on("end", onend);
      stream2.on("finish", onfinish);
      if (options.error !== false) {
        stream2.on("error", onerror);
      }
      stream2.on("close", onclose);
      if (closed) {
        process.nextTick(onclose);
      } else if (wState !== null && wState !== void 0 && wState.errorEmitted || rState !== null && rState !== void 0 && rState.errorEmitted) {
        if (!willEmitClose) {
          process.nextTick(onclosed);
        }
      } else if (!readable2 && (!willEmitClose || isReadable(stream2)) && (writableFinished || isWritable(stream2) === false)) {
        process.nextTick(onclosed);
      } else if (!writable2 && (!willEmitClose || isWritable(stream2)) && (readableFinished || isReadable(stream2) === false)) {
        process.nextTick(onclosed);
      } else if (rState && stream2.req && stream2.aborted) {
        process.nextTick(onclosed);
      }
      const cleanup = () => {
        callback = nop;
        stream2.removeListener("aborted", onclose);
        stream2.removeListener("complete", onfinish);
        stream2.removeListener("abort", onclose);
        stream2.removeListener("request", onrequest);
        if (stream2.req) stream2.req.removeListener("finish", onfinish);
        stream2.removeListener("end", onlegacyfinish);
        stream2.removeListener("close", onlegacyfinish);
        stream2.removeListener("finish", onfinish);
        stream2.removeListener("end", onend);
        stream2.removeListener("error", onerror);
        stream2.removeListener("close", onclose);
      };
      if (options.signal && !closed) {
        const abort = () => {
          const endCallback = callback;
          cleanup();
          endCallback.call(
            stream2,
            new AbortError(void 0, {
              cause: options.signal.reason
            })
          );
        };
        if (options.signal.aborted) {
          process.nextTick(abort);
        } else {
          addAbortListener = addAbortListener || requireUtil$3().addAbortListener;
          const disposable = addAbortListener(options.signal, abort);
          const originalCallback = callback;
          callback = once((...args) => {
            disposable[SymbolDispose]();
            originalCallback.apply(stream2, args);
          });
        }
      }
      return cleanup;
    }
    function eosWeb(stream2, options, callback) {
      let isAborted = false;
      let abort = nop;
      if (options.signal) {
        abort = () => {
          isAborted = true;
          callback.call(
            stream2,
            new AbortError(void 0, {
              cause: options.signal.reason
            })
          );
        };
        if (options.signal.aborted) {
          process.nextTick(abort);
        } else {
          addAbortListener = addAbortListener || requireUtil$3().addAbortListener;
          const disposable = addAbortListener(options.signal, abort);
          const originalCallback = callback;
          callback = once((...args) => {
            disposable[SymbolDispose]();
            originalCallback.apply(stream2, args);
          });
        }
      }
      const resolverFn = (...args) => {
        if (!isAborted) {
          process.nextTick(() => callback.apply(stream2, args));
        }
      };
      PromisePrototypeThen(stream2[kIsClosedPromise].promise, resolverFn, resolverFn);
      return nop;
    }
    function finished(stream2, opts) {
      var _opts;
      let autoCleanup = false;
      if (opts === null) {
        opts = kEmptyObject;
      }
      if ((_opts = opts) !== null && _opts !== void 0 && _opts.cleanup) {
        validateBoolean(opts.cleanup, "cleanup");
        autoCleanup = opts.cleanup;
      }
      return new Promise2((resolve, reject) => {
        const cleanup = eos(stream2, opts, (err) => {
          if (autoCleanup) {
            cleanup();
          }
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    endOfStream.exports = eos;
    endOfStream.exports.finished = finished;
    return endOfStream.exports;
  }
  var destroy_1;
  var hasRequiredDestroy;
  function requireDestroy() {
    if (hasRequiredDestroy) return destroy_1;
    hasRequiredDestroy = 1;
    const process = requireBrowser$1();
    const {
      aggregateTwoErrors,
      codes: { ERR_MULTIPLE_CALLBACK },
      AbortError
    } = requireErrors();
    const { Symbol: Symbol2 } = requirePrimordials();
    const { kIsDestroyed, isDestroyed, isFinished, isServerRequest } = requireUtils();
    const kDestroy = Symbol2("kDestroy");
    const kConstruct = Symbol2("kConstruct");
    function checkError(err, w, r) {
      if (err) {
        err.stack;
        if (w && !w.errored) {
          w.errored = err;
        }
        if (r && !r.errored) {
          r.errored = err;
        }
      }
    }
    function destroy(err, cb) {
      const r = this._readableState;
      const w = this._writableState;
      const s = w || r;
      if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
        if (typeof cb === "function") {
          cb();
        }
        return this;
      }
      checkError(err, w, r);
      if (w) {
        w.destroyed = true;
      }
      if (r) {
        r.destroyed = true;
      }
      if (!s.constructed) {
        this.once(kDestroy, function(er) {
          _destroy(this, aggregateTwoErrors(er, err), cb);
        });
      } else {
        _destroy(this, err, cb);
      }
      return this;
    }
    function _destroy(self2, err, cb) {
      let called = false;
      function onDestroy(err2) {
        if (called) {
          return;
        }
        called = true;
        const r = self2._readableState;
        const w = self2._writableState;
        checkError(err2, w, r);
        if (w) {
          w.closed = true;
        }
        if (r) {
          r.closed = true;
        }
        if (typeof cb === "function") {
          cb(err2);
        }
        if (err2) {
          process.nextTick(emitErrorCloseNT, self2, err2);
        } else {
          process.nextTick(emitCloseNT, self2);
        }
      }
      try {
        self2._destroy(err || null, onDestroy);
      } catch (err2) {
        onDestroy(err2);
      }
    }
    function emitErrorCloseNT(self2, err) {
      emitErrorNT(self2, err);
      emitCloseNT(self2);
    }
    function emitCloseNT(self2) {
      const r = self2._readableState;
      const w = self2._writableState;
      if (w) {
        w.closeEmitted = true;
      }
      if (r) {
        r.closeEmitted = true;
      }
      if (w !== null && w !== void 0 && w.emitClose || r !== null && r !== void 0 && r.emitClose) {
        self2.emit("close");
      }
    }
    function emitErrorNT(self2, err) {
      const r = self2._readableState;
      const w = self2._writableState;
      if (w !== null && w !== void 0 && w.errorEmitted || r !== null && r !== void 0 && r.errorEmitted) {
        return;
      }
      if (w) {
        w.errorEmitted = true;
      }
      if (r) {
        r.errorEmitted = true;
      }
      self2.emit("error", err);
    }
    function undestroy() {
      const r = this._readableState;
      const w = this._writableState;
      if (r) {
        r.constructed = true;
        r.closed = false;
        r.closeEmitted = false;
        r.destroyed = false;
        r.errored = null;
        r.errorEmitted = false;
        r.reading = false;
        r.ended = r.readable === false;
        r.endEmitted = r.readable === false;
      }
      if (w) {
        w.constructed = true;
        w.destroyed = false;
        w.closed = false;
        w.closeEmitted = false;
        w.errored = null;
        w.errorEmitted = false;
        w.finalCalled = false;
        w.prefinished = false;
        w.ended = w.writable === false;
        w.ending = w.writable === false;
        w.finished = w.writable === false;
      }
    }
    function errorOrDestroy(stream2, err, sync) {
      const r = stream2._readableState;
      const w = stream2._writableState;
      if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
        return this;
      }
      if (r !== null && r !== void 0 && r.autoDestroy || w !== null && w !== void 0 && w.autoDestroy)
        stream2.destroy(err);
      else if (err) {
        err.stack;
        if (w && !w.errored) {
          w.errored = err;
        }
        if (r && !r.errored) {
          r.errored = err;
        }
        if (sync) {
          process.nextTick(emitErrorNT, stream2, err);
        } else {
          emitErrorNT(stream2, err);
        }
      }
    }
    function construct(stream2, cb) {
      if (typeof stream2._construct !== "function") {
        return;
      }
      const r = stream2._readableState;
      const w = stream2._writableState;
      if (r) {
        r.constructed = false;
      }
      if (w) {
        w.constructed = false;
      }
      stream2.once(kConstruct, cb);
      if (stream2.listenerCount(kConstruct) > 1) {
        return;
      }
      process.nextTick(constructNT, stream2);
    }
    function constructNT(stream2) {
      let called = false;
      function onConstruct(err) {
        if (called) {
          errorOrDestroy(stream2, err !== null && err !== void 0 ? err : new ERR_MULTIPLE_CALLBACK());
          return;
        }
        called = true;
        const r = stream2._readableState;
        const w = stream2._writableState;
        const s = w || r;
        if (r) {
          r.constructed = true;
        }
        if (w) {
          w.constructed = true;
        }
        if (s.destroyed) {
          stream2.emit(kDestroy, err);
        } else if (err) {
          errorOrDestroy(stream2, err, true);
        } else {
          process.nextTick(emitConstructNT, stream2);
        }
      }
      try {
        stream2._construct((err) => {
          process.nextTick(onConstruct, err);
        });
      } catch (err) {
        process.nextTick(onConstruct, err);
      }
    }
    function emitConstructNT(stream2) {
      stream2.emit(kConstruct);
    }
    function isRequest(stream2) {
      return (stream2 === null || stream2 === void 0 ? void 0 : stream2.setHeader) && typeof stream2.abort === "function";
    }
    function emitCloseLegacy(stream2) {
      stream2.emit("close");
    }
    function emitErrorCloseLegacy(stream2, err) {
      stream2.emit("error", err);
      process.nextTick(emitCloseLegacy, stream2);
    }
    function destroyer(stream2, err) {
      if (!stream2 || isDestroyed(stream2)) {
        return;
      }
      if (!err && !isFinished(stream2)) {
        err = new AbortError();
      }
      if (isServerRequest(stream2)) {
        stream2.socket = null;
        stream2.destroy(err);
      } else if (isRequest(stream2)) {
        stream2.abort();
      } else if (isRequest(stream2.req)) {
        stream2.req.abort();
      } else if (typeof stream2.destroy === "function") {
        stream2.destroy(err);
      } else if (typeof stream2.close === "function") {
        stream2.close();
      } else if (err) {
        process.nextTick(emitErrorCloseLegacy, stream2, err);
      } else {
        process.nextTick(emitCloseLegacy, stream2);
      }
      if (!stream2.destroyed) {
        stream2[kIsDestroyed] = true;
      }
    }
    destroy_1 = {
      construct,
      destroyer,
      destroy,
      undestroy,
      errorOrDestroy
    };
    return destroy_1;
  }
  var legacy;
  var hasRequiredLegacy;
  function requireLegacy() {
    if (hasRequiredLegacy) return legacy;
    hasRequiredLegacy = 1;
    const { ArrayIsArray, ObjectSetPrototypeOf } = requirePrimordials();
    const { EventEmitter: EE } = requireEvents();
    function Stream(opts) {
      EE.call(this, opts);
    }
    ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
    ObjectSetPrototypeOf(Stream, EE);
    Stream.prototype.pipe = function(dest, options) {
      const source = this;
      function ondata(chunk) {
        if (dest.writable && dest.write(chunk) === false && source.pause) {
          source.pause();
        }
      }
      source.on("data", ondata);
      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }
      dest.on("drain", ondrain);
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on("end", onend);
        source.on("close", onclose);
      }
      let didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;
        dest.end();
      }
      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;
        if (typeof dest.destroy === "function") dest.destroy();
      }
      function onerror(er) {
        cleanup();
        if (EE.listenerCount(this, "error") === 0) {
          this.emit("error", er);
        }
      }
      prependListener(source, "error", onerror);
      prependListener(dest, "error", onerror);
      function cleanup() {
        source.removeListener("data", ondata);
        dest.removeListener("drain", ondrain);
        source.removeListener("end", onend);
        source.removeListener("close", onclose);
        source.removeListener("error", onerror);
        dest.removeListener("error", onerror);
        source.removeListener("end", cleanup);
        source.removeListener("close", cleanup);
        dest.removeListener("close", cleanup);
      }
      source.on("end", cleanup);
      source.on("close", cleanup);
      dest.on("close", cleanup);
      dest.emit("pipe", source);
      return dest;
    };
    function prependListener(emitter, event, fn) {
      if (typeof emitter.prependListener === "function") return emitter.prependListener(event, fn);
      if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);
      else if (ArrayIsArray(emitter._events[event])) emitter._events[event].unshift(fn);
      else emitter._events[event] = [fn, emitter._events[event]];
    }
    legacy = {
      Stream,
      prependListener
    };
    return legacy;
  }
  var addAbortSignal = { exports: {} };
  var hasRequiredAddAbortSignal;
  function requireAddAbortSignal() {
    if (hasRequiredAddAbortSignal) return addAbortSignal.exports;
    hasRequiredAddAbortSignal = 1;
    (function(module2) {
      const { SymbolDispose } = requirePrimordials();
      const { AbortError, codes } = requireErrors();
      const { isNodeStream, isWebStream, kControllerErrorFunction } = requireUtils();
      const eos = requireEndOfStream();
      const { ERR_INVALID_ARG_TYPE } = codes;
      let addAbortListener;
      const validateAbortSignal = (signal, name) => {
        if (typeof signal !== "object" || !("aborted" in signal)) {
          throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
        }
      };
      module2.exports.addAbortSignal = function addAbortSignal2(signal, stream2) {
        validateAbortSignal(signal, "signal");
        if (!isNodeStream(stream2) && !isWebStream(stream2)) {
          throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream2);
        }
        return module2.exports.addAbortSignalNoValidate(signal, stream2);
      };
      module2.exports.addAbortSignalNoValidate = function(signal, stream2) {
        if (typeof signal !== "object" || !("aborted" in signal)) {
          return stream2;
        }
        const onAbort = isNodeStream(stream2) ? () => {
          stream2.destroy(
            new AbortError(void 0, {
              cause: signal.reason
            })
          );
        } : () => {
          stream2[kControllerErrorFunction](
            new AbortError(void 0, {
              cause: signal.reason
            })
          );
        };
        if (signal.aborted) {
          onAbort();
        } else {
          addAbortListener = addAbortListener || requireUtil$3().addAbortListener;
          const disposable = addAbortListener(signal, onAbort);
          eos(stream2, disposable[SymbolDispose]);
        }
        return stream2;
      };
    })(addAbortSignal);
    return addAbortSignal.exports;
  }
  var buffer_list;
  var hasRequiredBuffer_list;
  function requireBuffer_list() {
    if (hasRequiredBuffer_list) return buffer_list;
    hasRequiredBuffer_list = 1;
    const { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array: Uint8Array2 } = requirePrimordials();
    const { Buffer: Buffer2 } = requireBuffer();
    const { inspect: inspect2 } = requireUtil$3();
    buffer_list = class BufferList {
      constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      push(v) {
        const entry = {
          data: v,
          next: null
        };
        if (this.length > 0) this.tail.next = entry;
        else this.head = entry;
        this.tail = entry;
        ++this.length;
      }
      unshift(v) {
        const entry = {
          data: v,
          next: this.head
        };
        if (this.length === 0) this.tail = entry;
        this.head = entry;
        ++this.length;
      }
      shift() {
        if (this.length === 0) return;
        const ret = this.head.data;
        if (this.length === 1) this.head = this.tail = null;
        else this.head = this.head.next;
        --this.length;
        return ret;
      }
      clear() {
        this.head = this.tail = null;
        this.length = 0;
      }
      join(s) {
        if (this.length === 0) return "";
        let p = this.head;
        let ret = "" + p.data;
        while ((p = p.next) !== null) ret += s + p.data;
        return ret;
      }
      concat(n) {
        if (this.length === 0) return Buffer2.alloc(0);
        const ret = Buffer2.allocUnsafe(n >>> 0);
        let p = this.head;
        let i = 0;
        while (p) {
          TypedArrayPrototypeSet(ret, p.data, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      }
      // Consumes a specified amount of bytes or characters from the buffered data.
      consume(n, hasStrings) {
        const data = this.head.data;
        if (n < data.length) {
          const slice = data.slice(0, n);
          this.head.data = data.slice(n);
          return slice;
        }
        if (n === data.length) {
          return this.shift();
        }
        return hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      first() {
        return this.head.data;
      }
      *[SymbolIterator]() {
        for (let p = this.head; p; p = p.next) {
          yield p.data;
        }
      }
      // Consumes a specified amount of characters from the buffered data.
      _getString(n) {
        let ret = "";
        let p = this.head;
        let c = 0;
        do {
          const str = p.data;
          if (n > str.length) {
            ret += str;
            n -= str.length;
          } else {
            if (n === str.length) {
              ret += str;
              ++c;
              if (p.next) this.head = p.next;
              else this.head = this.tail = null;
            } else {
              ret += StringPrototypeSlice(str, 0, n);
              this.head = p;
              p.data = StringPrototypeSlice(str, n);
            }
            break;
          }
          ++c;
        } while ((p = p.next) !== null);
        this.length -= c;
        return ret;
      }
      // Consumes a specified amount of bytes from the buffered data.
      _getBuffer(n) {
        const ret = Buffer2.allocUnsafe(n);
        const retLen = n;
        let p = this.head;
        let c = 0;
        do {
          const buf = p.data;
          if (n > buf.length) {
            TypedArrayPrototypeSet(ret, buf, retLen - n);
            n -= buf.length;
          } else {
            if (n === buf.length) {
              TypedArrayPrototypeSet(ret, buf, retLen - n);
              ++c;
              if (p.next) this.head = p.next;
              else this.head = this.tail = null;
            } else {
              TypedArrayPrototypeSet(ret, new Uint8Array2(buf.buffer, buf.byteOffset, n), retLen - n);
              this.head = p;
              p.data = buf.slice(n);
            }
            break;
          }
          ++c;
        } while ((p = p.next) !== null);
        this.length -= c;
        return ret;
      }
      // Make sure the linked list only shows the minimal necessary information.
      [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")](_, options) {
        return inspect2(this, {
          ...options,
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: false
        });
      }
    };
    return buffer_list;
  }
  var state;
  var hasRequiredState;
  function requireState() {
    if (hasRequiredState) return state;
    hasRequiredState = 1;
    const { MathFloor, NumberIsInteger } = requirePrimordials();
    const { validateInteger } = requireValidators();
    const { ERR_INVALID_ARG_VALUE } = requireErrors().codes;
    let defaultHighWaterMarkBytes = 16 * 1024;
    let defaultHighWaterMarkObjectMode = 16;
    function highWaterMarkFrom(options, isDuplex, duplexKey) {
      return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
    }
    function getDefaultHighWaterMark(objectMode) {
      return objectMode ? defaultHighWaterMarkObjectMode : defaultHighWaterMarkBytes;
    }
    function setDefaultHighWaterMark(objectMode, value) {
      validateInteger(value, "value", 0);
      if (objectMode) {
        defaultHighWaterMarkObjectMode = value;
      } else {
        defaultHighWaterMarkBytes = value;
      }
    }
    function getHighWaterMark(state2, options, duplexKey, isDuplex) {
      const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
      if (hwm != null) {
        if (!NumberIsInteger(hwm) || hwm < 0) {
          const name = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
          throw new ERR_INVALID_ARG_VALUE(name, hwm);
        }
        return MathFloor(hwm);
      }
      return getDefaultHighWaterMark(state2.objectMode);
    }
    state = {
      getHighWaterMark,
      getDefaultHighWaterMark,
      setDefaultHighWaterMark
    };
    return state;
  }
  var string_decoder = {};
  var safeBuffer = { exports: {} };
  var hasRequiredSafeBuffer;
  function requireSafeBuffer() {
    if (hasRequiredSafeBuffer) return safeBuffer.exports;
    hasRequiredSafeBuffer = 1;
    (function(module2, exports$1) {
      var buffer2 = requireBuffer();
      var Buffer2 = buffer2.Buffer;
      function copyProps(src, dst) {
        for (var key in src) {
          dst[key] = src[key];
        }
      }
      if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
        module2.exports = buffer2;
      } else {
        copyProps(buffer2, exports$1);
        exports$1.Buffer = SafeBuffer;
      }
      function SafeBuffer(arg, encodingOrOffset, length) {
        return Buffer2(arg, encodingOrOffset, length);
      }
      SafeBuffer.prototype = Object.create(Buffer2.prototype);
      copyProps(Buffer2, SafeBuffer);
      SafeBuffer.from = function(arg, encodingOrOffset, length) {
        if (typeof arg === "number") {
          throw new TypeError("Argument must not be a number");
        }
        return Buffer2(arg, encodingOrOffset, length);
      };
      SafeBuffer.alloc = function(size, fill, encoding) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        var buf = Buffer2(size);
        if (fill !== void 0) {
          if (typeof encoding === "string") {
            buf.fill(fill, encoding);
          } else {
            buf.fill(fill);
          }
        } else {
          buf.fill(0);
        }
        return buf;
      };
      SafeBuffer.allocUnsafe = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return Buffer2(size);
      };
      SafeBuffer.allocUnsafeSlow = function(size) {
        if (typeof size !== "number") {
          throw new TypeError("Argument must be a number");
        }
        return buffer2.SlowBuffer(size);
      };
    })(safeBuffer, safeBuffer.exports);
    return safeBuffer.exports;
  }
  var hasRequiredString_decoder;
  function requireString_decoder() {
    if (hasRequiredString_decoder) return string_decoder;
    hasRequiredString_decoder = 1;
    var Buffer2 = requireSafeBuffer().Buffer;
    var isEncoding = Buffer2.isEncoding || function(encoding) {
      encoding = "" + encoding;
      switch (encoding && encoding.toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
        case "raw":
          return true;
        default:
          return false;
      }
    };
    function _normalizeEncoding(enc) {
      if (!enc) return "utf8";
      var retried;
      while (true) {
        switch (enc) {
          case "utf8":
          case "utf-8":
            return "utf8";
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return "utf16le";
          case "latin1":
          case "binary":
            return "latin1";
          case "base64":
          case "ascii":
          case "hex":
            return enc;
          default:
            if (retried) return;
            enc = ("" + enc).toLowerCase();
            retried = true;
        }
      }
    }
    function normalizeEncoding(enc) {
      var nenc = _normalizeEncoding(enc);
      if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc))) throw new Error("Unknown encoding: " + enc);
      return nenc || enc;
    }
    string_decoder.StringDecoder = StringDecoder;
    function StringDecoder(encoding) {
      this.encoding = normalizeEncoding(encoding);
      var nb;
      switch (this.encoding) {
        case "utf16le":
          this.text = utf16Text;
          this.end = utf16End;
          nb = 4;
          break;
        case "utf8":
          this.fillLast = utf8FillLast;
          nb = 4;
          break;
        case "base64":
          this.text = base64Text;
          this.end = base64End;
          nb = 3;
          break;
        default:
          this.write = simpleWrite;
          this.end = simpleEnd;
          return;
      }
      this.lastNeed = 0;
      this.lastTotal = 0;
      this.lastChar = Buffer2.allocUnsafe(nb);
    }
    StringDecoder.prototype.write = function(buf) {
      if (buf.length === 0) return "";
      var r;
      var i;
      if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === void 0) return "";
        i = this.lastNeed;
        this.lastNeed = 0;
      } else {
        i = 0;
      }
      if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
      return r || "";
    };
    StringDecoder.prototype.end = utf8End;
    StringDecoder.prototype.text = utf8Text;
    StringDecoder.prototype.fillLast = function(buf) {
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
      this.lastNeed -= buf.length;
    };
    function utf8CheckByte(byte) {
      if (byte <= 127) return 0;
      else if (byte >> 5 === 6) return 2;
      else if (byte >> 4 === 14) return 3;
      else if (byte >> 3 === 30) return 4;
      return byte >> 6 === 2 ? -1 : -2;
    }
    function utf8CheckIncomplete(self2, buf, i) {
      var j = buf.length - 1;
      if (j < i) return 0;
      var nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) self2.lastNeed = nb - 1;
        return nb;
      }
      if (--j < i || nb === -2) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) self2.lastNeed = nb - 2;
        return nb;
      }
      if (--j < i || nb === -2) return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) {
          if (nb === 2) nb = 0;
          else self2.lastNeed = nb - 3;
        }
        return nb;
      }
      return 0;
    }
    function utf8CheckExtraBytes(self2, buf, p) {
      if ((buf[0] & 192) !== 128) {
        self2.lastNeed = 0;
        return "�";
      }
      if (self2.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 192) !== 128) {
          self2.lastNeed = 1;
          return "�";
        }
        if (self2.lastNeed > 2 && buf.length > 2) {
          if ((buf[2] & 192) !== 128) {
            self2.lastNeed = 2;
            return "�";
          }
        }
      }
    }
    function utf8FillLast(buf) {
      var p = this.lastTotal - this.lastNeed;
      var r = utf8CheckExtraBytes(this, buf);
      if (r !== void 0) return r;
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, p, 0, buf.length);
      this.lastNeed -= buf.length;
    }
    function utf8Text(buf, i) {
      var total = utf8CheckIncomplete(this, buf, i);
      if (!this.lastNeed) return buf.toString("utf8", i);
      this.lastTotal = total;
      var end = buf.length - (total - this.lastNeed);
      buf.copy(this.lastChar, 0, end);
      return buf.toString("utf8", i, end);
    }
    function utf8End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) return r + "�";
      return r;
    }
    function utf16Text(buf, i) {
      if ((buf.length - i) % 2 === 0) {
        var r = buf.toString("utf16le", i);
        if (r) {
          var c = r.charCodeAt(r.length - 1);
          if (c >= 55296 && c <= 56319) {
            this.lastNeed = 2;
            this.lastTotal = 4;
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
            return r.slice(0, -1);
          }
        }
        return r;
      }
      this.lastNeed = 1;
      this.lastTotal = 2;
      this.lastChar[0] = buf[buf.length - 1];
      return buf.toString("utf16le", i, buf.length - 1);
    }
    function utf16End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) {
        var end = this.lastTotal - this.lastNeed;
        return r + this.lastChar.toString("utf16le", 0, end);
      }
      return r;
    }
    function base64Text(buf, i) {
      var n = (buf.length - i) % 3;
      if (n === 0) return buf.toString("base64", i);
      this.lastNeed = 3 - n;
      this.lastTotal = 3;
      if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
      } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
      }
      return buf.toString("base64", i, buf.length - n);
    }
    function base64End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
      return r;
    }
    function simpleWrite(buf) {
      return buf.toString(this.encoding);
    }
    function simpleEnd(buf) {
      return buf && buf.length ? this.write(buf) : "";
    }
    return string_decoder;
  }
  var from_1;
  var hasRequiredFrom;
  function requireFrom() {
    if (hasRequiredFrom) return from_1;
    hasRequiredFrom = 1;
    const process = requireBrowser$1();
    const { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = requirePrimordials();
    const { Buffer: Buffer2 } = requireBuffer();
    const { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = requireErrors().codes;
    function from(Readable, iterable, opts) {
      let iterator;
      if (typeof iterable === "string" || iterable instanceof Buffer2) {
        return new Readable({
          objectMode: true,
          ...opts,
          read() {
            this.push(iterable);
            this.push(null);
          }
        });
      }
      let isAsync;
      if (iterable && iterable[SymbolAsyncIterator]) {
        isAsync = true;
        iterator = iterable[SymbolAsyncIterator]();
      } else if (iterable && iterable[SymbolIterator]) {
        isAsync = false;
        iterator = iterable[SymbolIterator]();
      } else {
        throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
      }
      const readable2 = new Readable({
        objectMode: true,
        highWaterMark: 1,
        // TODO(ronag): What options should be allowed?
        ...opts
      });
      let reading = false;
      readable2._read = function() {
        if (!reading) {
          reading = true;
          next();
        }
      };
      readable2._destroy = function(error, cb) {
        PromisePrototypeThen(
          close(error),
          () => process.nextTick(cb, error),
          // nextTick is here in case cb throws
          (e) => process.nextTick(cb, e || error)
        );
      };
      async function close(error) {
        const hadError = error !== void 0 && error !== null;
        const hasThrow = typeof iterator.throw === "function";
        if (hadError && hasThrow) {
          const { value, done } = await iterator.throw(error);
          await value;
          if (done) {
            return;
          }
        }
        if (typeof iterator.return === "function") {
          const { value } = await iterator.return();
          await value;
        }
      }
      async function next() {
        for (; ; ) {
          try {
            const { value, done } = isAsync ? await iterator.next() : iterator.next();
            if (done) {
              readable2.push(null);
            } else {
              const res = value && typeof value.then === "function" ? await value : value;
              if (res === null) {
                reading = false;
                throw new ERR_STREAM_NULL_VALUES();
              } else if (readable2.push(res)) {
                continue;
              } else {
                reading = false;
              }
            }
          } catch (err) {
            readable2.destroy(err);
          }
          break;
        }
      }
      return readable2;
    }
    from_1 = from;
    return from_1;
  }
  var readable;
  var hasRequiredReadable;
  function requireReadable() {
    if (hasRequiredReadable) return readable;
    hasRequiredReadable = 1;
    const process = requireBrowser$1();
    const {
      ArrayPrototypeIndexOf,
      NumberIsInteger,
      NumberIsNaN,
      NumberParseInt,
      ObjectDefineProperties,
      ObjectKeys,
      ObjectSetPrototypeOf,
      Promise: Promise2,
      SafeSet,
      SymbolAsyncDispose,
      SymbolAsyncIterator,
      Symbol: Symbol2
    } = requirePrimordials();
    readable = Readable;
    Readable.ReadableState = ReadableState;
    const { EventEmitter: EE } = requireEvents();
    const { Stream, prependListener } = requireLegacy();
    const { Buffer: Buffer2 } = requireBuffer();
    const { addAbortSignal: addAbortSignal2 } = requireAddAbortSignal();
    const eos = requireEndOfStream();
    let debug = requireUtil$3().debuglog("stream", (fn) => {
      debug = fn;
    });
    const BufferList = requireBuffer_list();
    const destroyImpl = requireDestroy();
    const { getHighWaterMark, getDefaultHighWaterMark } = requireState();
    const {
      aggregateTwoErrors,
      codes: {
        ERR_INVALID_ARG_TYPE,
        ERR_METHOD_NOT_IMPLEMENTED,
        ERR_OUT_OF_RANGE,
        ERR_STREAM_PUSH_AFTER_EOF,
        ERR_STREAM_UNSHIFT_AFTER_END_EVENT
      },
      AbortError
    } = requireErrors();
    const { validateObject } = requireValidators();
    const kPaused = Symbol2("kPaused");
    const { StringDecoder } = requireString_decoder();
    const from = requireFrom();
    ObjectSetPrototypeOf(Readable.prototype, Stream.prototype);
    ObjectSetPrototypeOf(Readable, Stream);
    const nop = () => {
    };
    const { errorOrDestroy } = destroyImpl;
    const kObjectMode = 1 << 0;
    const kEnded = 1 << 1;
    const kEndEmitted = 1 << 2;
    const kReading = 1 << 3;
    const kConstructed = 1 << 4;
    const kSync = 1 << 5;
    const kNeedReadable = 1 << 6;
    const kEmittedReadable = 1 << 7;
    const kReadableListening = 1 << 8;
    const kResumeScheduled = 1 << 9;
    const kErrorEmitted = 1 << 10;
    const kEmitClose = 1 << 11;
    const kAutoDestroy = 1 << 12;
    const kDestroyed = 1 << 13;
    const kClosed = 1 << 14;
    const kCloseEmitted = 1 << 15;
    const kMultiAwaitDrain = 1 << 16;
    const kReadingMore = 1 << 17;
    const kDataEmitted = 1 << 18;
    function makeBitMapDescriptor(bit) {
      return {
        enumerable: false,
        get() {
          return (this.state & bit) !== 0;
        },
        set(value) {
          if (value) this.state |= bit;
          else this.state &= ~bit;
        }
      };
    }
    ObjectDefineProperties(ReadableState.prototype, {
      objectMode: makeBitMapDescriptor(kObjectMode),
      ended: makeBitMapDescriptor(kEnded),
      endEmitted: makeBitMapDescriptor(kEndEmitted),
      reading: makeBitMapDescriptor(kReading),
      // Stream is still being constructed and cannot be
      // destroyed until construction finished or failed.
      // Async construction is opt in, therefore we start as
      // constructed.
      constructed: makeBitMapDescriptor(kConstructed),
      // A flag to be able to tell if the event 'readable'/'data' is emitted
      // immediately, or on a later tick.  We set this to true at first, because
      // any actions that shouldn't happen until "later" should generally also
      // not happen before the first read call.
      sync: makeBitMapDescriptor(kSync),
      // Whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      needReadable: makeBitMapDescriptor(kNeedReadable),
      emittedReadable: makeBitMapDescriptor(kEmittedReadable),
      readableListening: makeBitMapDescriptor(kReadableListening),
      resumeScheduled: makeBitMapDescriptor(kResumeScheduled),
      // True if the error was already emitted and should not be thrown again.
      errorEmitted: makeBitMapDescriptor(kErrorEmitted),
      emitClose: makeBitMapDescriptor(kEmitClose),
      autoDestroy: makeBitMapDescriptor(kAutoDestroy),
      // Has it been destroyed.
      destroyed: makeBitMapDescriptor(kDestroyed),
      // Indicates whether the stream has finished destroying.
      closed: makeBitMapDescriptor(kClosed),
      // True if close has been emitted or would have been emitted
      // depending on emitClose.
      closeEmitted: makeBitMapDescriptor(kCloseEmitted),
      multiAwaitDrain: makeBitMapDescriptor(kMultiAwaitDrain),
      // If true, a maybeReadMore has been scheduled.
      readingMore: makeBitMapDescriptor(kReadingMore),
      dataEmitted: makeBitMapDescriptor(kDataEmitted)
    });
    function ReadableState(options, stream2, isDuplex) {
      if (typeof isDuplex !== "boolean") isDuplex = stream2 instanceof requireDuplex();
      this.state = kEmitClose | kAutoDestroy | kConstructed | kSync;
      if (options && options.objectMode) this.state |= kObjectMode;
      if (isDuplex && options && options.readableObjectMode) this.state |= kObjectMode;
      this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = [];
      this.flowing = null;
      this[kPaused] = null;
      if (options && options.emitClose === false) this.state &= ~kEmitClose;
      if (options && options.autoDestroy === false) this.state &= ~kAutoDestroy;
      this.errored = null;
      this.defaultEncoding = options && options.defaultEncoding || "utf8";
      this.awaitDrainWriters = null;
      this.decoder = null;
      this.encoding = null;
      if (options && options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      if (!(this instanceof Readable)) return new Readable(options);
      const isDuplex = this instanceof requireDuplex();
      this._readableState = new ReadableState(options, this, isDuplex);
      if (options) {
        if (typeof options.read === "function") this._read = options.read;
        if (typeof options.destroy === "function") this._destroy = options.destroy;
        if (typeof options.construct === "function") this._construct = options.construct;
        if (options.signal && !isDuplex) addAbortSignal2(options.signal, this);
      }
      Stream.call(this, options);
      destroyImpl.construct(this, () => {
        if (this._readableState.needReadable) {
          maybeReadMore(this, this._readableState);
        }
      });
    }
    Readable.prototype.destroy = destroyImpl.destroy;
    Readable.prototype._undestroy = destroyImpl.undestroy;
    Readable.prototype._destroy = function(err, cb) {
      cb(err);
    };
    Readable.prototype[EE.captureRejectionSymbol] = function(err) {
      this.destroy(err);
    };
    Readable.prototype[SymbolAsyncDispose] = function() {
      let error;
      if (!this.destroyed) {
        error = this.readableEnded ? null : new AbortError();
        this.destroy(error);
      }
      return new Promise2((resolve, reject) => eos(this, (err) => err && err !== error ? reject(err) : resolve(null)));
    };
    Readable.prototype.push = function(chunk, encoding) {
      return readableAddChunk(this, chunk, encoding, false);
    };
    Readable.prototype.unshift = function(chunk, encoding) {
      return readableAddChunk(this, chunk, encoding, true);
    };
    function readableAddChunk(stream2, chunk, encoding, addToFront) {
      debug("readableAddChunk", chunk);
      const state2 = stream2._readableState;
      let err;
      if ((state2.state & kObjectMode) === 0) {
        if (typeof chunk === "string") {
          encoding = encoding || state2.defaultEncoding;
          if (state2.encoding !== encoding) {
            if (addToFront && state2.encoding) {
              chunk = Buffer2.from(chunk, encoding).toString(state2.encoding);
            } else {
              chunk = Buffer2.from(chunk, encoding);
              encoding = "";
            }
          }
        } else if (chunk instanceof Buffer2) {
          encoding = "";
        } else if (Stream._isUint8Array(chunk)) {
          chunk = Stream._uint8ArrayToBuffer(chunk);
          encoding = "";
        } else if (chunk != null) {
          err = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
        }
      }
      if (err) {
        errorOrDestroy(stream2, err);
      } else if (chunk === null) {
        state2.state &= ~kReading;
        onEofChunk(stream2, state2);
      } else if ((state2.state & kObjectMode) !== 0 || chunk && chunk.length > 0) {
        if (addToFront) {
          if ((state2.state & kEndEmitted) !== 0) errorOrDestroy(stream2, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
          else if (state2.destroyed || state2.errored) return false;
          else addChunk(stream2, state2, chunk, true);
        } else if (state2.ended) {
          errorOrDestroy(stream2, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state2.destroyed || state2.errored) {
          return false;
        } else {
          state2.state &= ~kReading;
          if (state2.decoder && !encoding) {
            chunk = state2.decoder.write(chunk);
            if (state2.objectMode || chunk.length !== 0) addChunk(stream2, state2, chunk, false);
            else maybeReadMore(stream2, state2);
          } else {
            addChunk(stream2, state2, chunk, false);
          }
        }
      } else if (!addToFront) {
        state2.state &= ~kReading;
        maybeReadMore(stream2, state2);
      }
      return !state2.ended && (state2.length < state2.highWaterMark || state2.length === 0);
    }
    function addChunk(stream2, state2, chunk, addToFront) {
      if (state2.flowing && state2.length === 0 && !state2.sync && stream2.listenerCount("data") > 0) {
        if ((state2.state & kMultiAwaitDrain) !== 0) {
          state2.awaitDrainWriters.clear();
        } else {
          state2.awaitDrainWriters = null;
        }
        state2.dataEmitted = true;
        stream2.emit("data", chunk);
      } else {
        state2.length += state2.objectMode ? 1 : chunk.length;
        if (addToFront) state2.buffer.unshift(chunk);
        else state2.buffer.push(chunk);
        if ((state2.state & kNeedReadable) !== 0) emitReadable(stream2);
      }
      maybeReadMore(stream2, state2);
    }
    Readable.prototype.isPaused = function() {
      const state2 = this._readableState;
      return state2[kPaused] === true || state2.flowing === false;
    };
    Readable.prototype.setEncoding = function(enc) {
      const decoder = new StringDecoder(enc);
      this._readableState.decoder = decoder;
      this._readableState.encoding = this._readableState.decoder.encoding;
      const buffer2 = this._readableState.buffer;
      let content = "";
      for (const data of buffer2) {
        content += decoder.write(data);
      }
      buffer2.clear();
      if (content !== "") buffer2.push(content);
      this._readableState.length = content.length;
      return this;
    };
    const MAX_HWM = 1073741824;
    function computeNewHighWaterMark(n) {
      if (n > MAX_HWM) {
        throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
      } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state2) {
      if (n <= 0 || state2.length === 0 && state2.ended) return 0;
      if ((state2.state & kObjectMode) !== 0) return 1;
      if (NumberIsNaN(n)) {
        if (state2.flowing && state2.length) return state2.buffer.first().length;
        return state2.length;
      }
      if (n <= state2.length) return n;
      return state2.ended ? state2.length : 0;
    }
    Readable.prototype.read = function(n) {
      debug("read", n);
      if (n === void 0) {
        n = NaN;
      } else if (!NumberIsInteger(n)) {
        n = NumberParseInt(n, 10);
      }
      const state2 = this._readableState;
      const nOrig = n;
      if (n > state2.highWaterMark) state2.highWaterMark = computeNewHighWaterMark(n);
      if (n !== 0) state2.state &= ~kEmittedReadable;
      if (n === 0 && state2.needReadable && ((state2.highWaterMark !== 0 ? state2.length >= state2.highWaterMark : state2.length > 0) || state2.ended)) {
        debug("read: emitReadable", state2.length, state2.ended);
        if (state2.length === 0 && state2.ended) endReadable(this);
        else emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state2);
      if (n === 0 && state2.ended) {
        if (state2.length === 0) endReadable(this);
        return null;
      }
      let doRead = (state2.state & kNeedReadable) !== 0;
      debug("need readable", doRead);
      if (state2.length === 0 || state2.length - n < state2.highWaterMark) {
        doRead = true;
        debug("length less than watermark", doRead);
      }
      if (state2.ended || state2.reading || state2.destroyed || state2.errored || !state2.constructed) {
        doRead = false;
        debug("reading, ended or constructing", doRead);
      } else if (doRead) {
        debug("do read");
        state2.state |= kReading | kSync;
        if (state2.length === 0) state2.state |= kNeedReadable;
        try {
          this._read(state2.highWaterMark);
        } catch (err) {
          errorOrDestroy(this, err);
        }
        state2.state &= ~kSync;
        if (!state2.reading) n = howMuchToRead(nOrig, state2);
      }
      let ret;
      if (n > 0) ret = fromList(n, state2);
      else ret = null;
      if (ret === null) {
        state2.needReadable = state2.length <= state2.highWaterMark;
        n = 0;
      } else {
        state2.length -= n;
        if (state2.multiAwaitDrain) {
          state2.awaitDrainWriters.clear();
        } else {
          state2.awaitDrainWriters = null;
        }
      }
      if (state2.length === 0) {
        if (!state2.ended) state2.needReadable = true;
        if (nOrig !== n && state2.ended) endReadable(this);
      }
      if (ret !== null && !state2.errorEmitted && !state2.closeEmitted) {
        state2.dataEmitted = true;
        this.emit("data", ret);
      }
      return ret;
    };
    function onEofChunk(stream2, state2) {
      debug("onEofChunk");
      if (state2.ended) return;
      if (state2.decoder) {
        const chunk = state2.decoder.end();
        if (chunk && chunk.length) {
          state2.buffer.push(chunk);
          state2.length += state2.objectMode ? 1 : chunk.length;
        }
      }
      state2.ended = true;
      if (state2.sync) {
        emitReadable(stream2);
      } else {
        state2.needReadable = false;
        state2.emittedReadable = true;
        emitReadable_(stream2);
      }
    }
    function emitReadable(stream2) {
      const state2 = stream2._readableState;
      debug("emitReadable", state2.needReadable, state2.emittedReadable);
      state2.needReadable = false;
      if (!state2.emittedReadable) {
        debug("emitReadable", state2.flowing);
        state2.emittedReadable = true;
        process.nextTick(emitReadable_, stream2);
      }
    }
    function emitReadable_(stream2) {
      const state2 = stream2._readableState;
      debug("emitReadable_", state2.destroyed, state2.length, state2.ended);
      if (!state2.destroyed && !state2.errored && (state2.length || state2.ended)) {
        stream2.emit("readable");
        state2.emittedReadable = false;
      }
      state2.needReadable = !state2.flowing && !state2.ended && state2.length <= state2.highWaterMark;
      flow(stream2);
    }
    function maybeReadMore(stream2, state2) {
      if (!state2.readingMore && state2.constructed) {
        state2.readingMore = true;
        process.nextTick(maybeReadMore_, stream2, state2);
      }
    }
    function maybeReadMore_(stream2, state2) {
      while (!state2.reading && !state2.ended && (state2.length < state2.highWaterMark || state2.flowing && state2.length === 0)) {
        const len = state2.length;
        debug("maybeReadMore read 0");
        stream2.read(0);
        if (len === state2.length)
          break;
      }
      state2.readingMore = false;
    }
    Readable.prototype._read = function(n) {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
    };
    Readable.prototype.pipe = function(dest, pipeOpts) {
      const src = this;
      const state2 = this._readableState;
      if (state2.pipes.length === 1) {
        if (!state2.multiAwaitDrain) {
          state2.multiAwaitDrain = true;
          state2.awaitDrainWriters = new SafeSet(state2.awaitDrainWriters ? [state2.awaitDrainWriters] : []);
        }
      }
      state2.pipes.push(dest);
      debug("pipe count=%d opts=%j", state2.pipes.length, pipeOpts);
      const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
      const endFn = doEnd ? onend : unpipe;
      if (state2.endEmitted) process.nextTick(endFn);
      else src.once("end", endFn);
      dest.on("unpipe", onunpipe);
      function onunpipe(readable2, unpipeInfo) {
        debug("onunpipe");
        if (readable2 === src) {
          if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
            unpipeInfo.hasUnpiped = true;
            cleanup();
          }
        }
      }
      function onend() {
        debug("onend");
        dest.end();
      }
      let ondrain;
      let cleanedUp = false;
      function cleanup() {
        debug("cleanup");
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        if (ondrain) {
          dest.removeListener("drain", ondrain);
        }
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (ondrain && state2.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain)) ondrain();
      }
      function pause() {
        if (!cleanedUp) {
          if (state2.pipes.length === 1 && state2.pipes[0] === dest) {
            debug("false write response, pause", 0);
            state2.awaitDrainWriters = dest;
            state2.multiAwaitDrain = false;
          } else if (state2.pipes.length > 1 && state2.pipes.includes(dest)) {
            debug("false write response, pause", state2.awaitDrainWriters.size);
            state2.awaitDrainWriters.add(dest);
          }
          src.pause();
        }
        if (!ondrain) {
          ondrain = pipeOnDrain(src, dest);
          dest.on("drain", ondrain);
        }
      }
      src.on("data", ondata);
      function ondata(chunk) {
        debug("ondata");
        const ret = dest.write(chunk);
        debug("dest.write", ret);
        if (ret === false) {
          pause();
        }
      }
      function onerror(er) {
        debug("onerror", er);
        unpipe();
        dest.removeListener("error", onerror);
        if (dest.listenerCount("error") === 0) {
          const s = dest._writableState || dest._readableState;
          if (s && !s.errorEmitted) {
            errorOrDestroy(dest, er);
          } else {
            dest.emit("error", er);
          }
        }
      }
      prependListener(dest, "error", onerror);
      function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
      }
      dest.once("close", onclose);
      function onfinish() {
        debug("onfinish");
        dest.removeListener("close", onclose);
        unpipe();
      }
      dest.once("finish", onfinish);
      function unpipe() {
        debug("unpipe");
        src.unpipe(dest);
      }
      dest.emit("pipe", src);
      if (dest.writableNeedDrain === true) {
        pause();
      } else if (!state2.flowing) {
        debug("pipe resume");
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src, dest) {
      return function pipeOnDrainFunctionResult() {
        const state2 = src._readableState;
        if (state2.awaitDrainWriters === dest) {
          debug("pipeOnDrain", 1);
          state2.awaitDrainWriters = null;
        } else if (state2.multiAwaitDrain) {
          debug("pipeOnDrain", state2.awaitDrainWriters.size);
          state2.awaitDrainWriters.delete(dest);
        }
        if ((!state2.awaitDrainWriters || state2.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
          src.resume();
        }
      };
    }
    Readable.prototype.unpipe = function(dest) {
      const state2 = this._readableState;
      const unpipeInfo = {
        hasUnpiped: false
      };
      if (state2.pipes.length === 0) return this;
      if (!dest) {
        const dests = state2.pipes;
        state2.pipes = [];
        this.pause();
        for (let i = 0; i < dests.length; i++)
          dests[i].emit("unpipe", this, {
            hasUnpiped: false
          });
        return this;
      }
      const index = ArrayPrototypeIndexOf(state2.pipes, dest);
      if (index === -1) return this;
      state2.pipes.splice(index, 1);
      if (state2.pipes.length === 0) this.pause();
      dest.emit("unpipe", this, unpipeInfo);
      return this;
    };
    Readable.prototype.on = function(ev, fn) {
      const res = Stream.prototype.on.call(this, ev, fn);
      const state2 = this._readableState;
      if (ev === "data") {
        state2.readableListening = this.listenerCount("readable") > 0;
        if (state2.flowing !== false) this.resume();
      } else if (ev === "readable") {
        if (!state2.endEmitted && !state2.readableListening) {
          state2.readableListening = state2.needReadable = true;
          state2.flowing = false;
          state2.emittedReadable = false;
          debug("on readable", state2.length, state2.reading);
          if (state2.length) {
            emitReadable(this);
          } else if (!state2.reading) {
            process.nextTick(nReadingNextTick, this);
          }
        }
      }
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    Readable.prototype.removeListener = function(ev, fn) {
      const res = Stream.prototype.removeListener.call(this, ev, fn);
      if (ev === "readable") {
        process.nextTick(updateReadableListening, this);
      }
      return res;
    };
    Readable.prototype.off = Readable.prototype.removeListener;
    Readable.prototype.removeAllListeners = function(ev) {
      const res = Stream.prototype.removeAllListeners.apply(this, arguments);
      if (ev === "readable" || ev === void 0) {
        process.nextTick(updateReadableListening, this);
      }
      return res;
    };
    function updateReadableListening(self2) {
      const state2 = self2._readableState;
      state2.readableListening = self2.listenerCount("readable") > 0;
      if (state2.resumeScheduled && state2[kPaused] === false) {
        state2.flowing = true;
      } else if (self2.listenerCount("data") > 0) {
        self2.resume();
      } else if (!state2.readableListening) {
        state2.flowing = null;
      }
    }
    function nReadingNextTick(self2) {
      debug("readable nexttick read 0");
      self2.read(0);
    }
    Readable.prototype.resume = function() {
      const state2 = this._readableState;
      if (!state2.flowing) {
        debug("resume");
        state2.flowing = !state2.readableListening;
        resume(this, state2);
      }
      state2[kPaused] = false;
      return this;
    };
    function resume(stream2, state2) {
      if (!state2.resumeScheduled) {
        state2.resumeScheduled = true;
        process.nextTick(resume_, stream2, state2);
      }
    }
    function resume_(stream2, state2) {
      debug("resume", state2.reading);
      if (!state2.reading) {
        stream2.read(0);
      }
      state2.resumeScheduled = false;
      stream2.emit("resume");
      flow(stream2);
      if (state2.flowing && !state2.reading) stream2.read(0);
    }
    Readable.prototype.pause = function() {
      debug("call pause flowing=%j", this._readableState.flowing);
      if (this._readableState.flowing !== false) {
        debug("pause");
        this._readableState.flowing = false;
        this.emit("pause");
      }
      this._readableState[kPaused] = true;
      return this;
    };
    function flow(stream2) {
      const state2 = stream2._readableState;
      debug("flow", state2.flowing);
      while (state2.flowing && stream2.read() !== null) ;
    }
    Readable.prototype.wrap = function(stream2) {
      let paused = false;
      stream2.on("data", (chunk) => {
        if (!this.push(chunk) && stream2.pause) {
          paused = true;
          stream2.pause();
        }
      });
      stream2.on("end", () => {
        this.push(null);
      });
      stream2.on("error", (err) => {
        errorOrDestroy(this, err);
      });
      stream2.on("close", () => {
        this.destroy();
      });
      stream2.on("destroy", () => {
        this.destroy();
      });
      this._read = () => {
        if (paused && stream2.resume) {
          paused = false;
          stream2.resume();
        }
      };
      const streamKeys = ObjectKeys(stream2);
      for (let j = 1; j < streamKeys.length; j++) {
        const i = streamKeys[j];
        if (this[i] === void 0 && typeof stream2[i] === "function") {
          this[i] = stream2[i].bind(stream2);
        }
      }
      return this;
    };
    Readable.prototype[SymbolAsyncIterator] = function() {
      return streamToAsyncIterator(this);
    };
    Readable.prototype.iterator = function(options) {
      if (options !== void 0) {
        validateObject(options, "options");
      }
      return streamToAsyncIterator(this, options);
    };
    function streamToAsyncIterator(stream2, options) {
      if (typeof stream2.read !== "function") {
        stream2 = Readable.wrap(stream2, {
          objectMode: true
        });
      }
      const iter = createAsyncIterator(stream2, options);
      iter.stream = stream2;
      return iter;
    }
    async function* createAsyncIterator(stream2, options) {
      let callback = nop;
      function next(resolve) {
        if (this === stream2) {
          callback();
          callback = nop;
        } else {
          callback = resolve;
        }
      }
      stream2.on("readable", next);
      let error;
      const cleanup = eos(
        stream2,
        {
          writable: false
        },
        (err) => {
          error = err ? aggregateTwoErrors(error, err) : null;
          callback();
          callback = nop;
        }
      );
      try {
        while (true) {
          const chunk = stream2.destroyed ? null : stream2.read();
          if (chunk !== null) {
            yield chunk;
          } else if (error) {
            throw error;
          } else if (error === null) {
            return;
          } else {
            await new Promise2(next);
          }
        }
      } catch (err) {
        error = aggregateTwoErrors(error, err);
        throw error;
      } finally {
        if ((error || (options === null || options === void 0 ? void 0 : options.destroyOnReturn) !== false) && (error === void 0 || stream2._readableState.autoDestroy)) {
          destroyImpl.destroyer(stream2, null);
        } else {
          stream2.off("readable", next);
          cleanup();
        }
      }
    }
    ObjectDefineProperties(Readable.prototype, {
      readable: {
        __proto__: null,
        get() {
          const r = this._readableState;
          return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
        },
        set(val) {
          if (this._readableState) {
            this._readableState.readable = !!val;
          }
        }
      },
      readableDidRead: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.dataEmitted;
        }
      },
      readableAborted: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return !!(this._readableState.readable !== false && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
        }
      },
      readableHighWaterMark: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.highWaterMark;
        }
      },
      readableBuffer: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState && this._readableState.buffer;
        }
      },
      readableFlowing: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.flowing;
        },
        set: function(state2) {
          if (this._readableState) {
            this._readableState.flowing = state2;
          }
        }
      },
      readableLength: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState.length;
        }
      },
      readableObjectMode: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.objectMode : false;
        }
      },
      readableEncoding: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.encoding : null;
        }
      },
      errored: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.errored : null;
        }
      },
      closed: {
        __proto__: null,
        get() {
          return this._readableState ? this._readableState.closed : false;
        }
      },
      destroyed: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.destroyed : false;
        },
        set(value) {
          if (!this._readableState) {
            return;
          }
          this._readableState.destroyed = value;
        }
      },
      readableEnded: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.endEmitted : false;
        }
      }
    });
    ObjectDefineProperties(ReadableState.prototype, {
      // Legacy getter for `pipesCount`.
      pipesCount: {
        __proto__: null,
        get() {
          return this.pipes.length;
        }
      },
      // Legacy property for `paused`.
      paused: {
        __proto__: null,
        get() {
          return this[kPaused] !== false;
        },
        set(value) {
          this[kPaused] = !!value;
        }
      }
    });
    Readable._fromList = fromList;
    function fromList(n, state2) {
      if (state2.length === 0) return null;
      let ret;
      if (state2.objectMode) ret = state2.buffer.shift();
      else if (!n || n >= state2.length) {
        if (state2.decoder) ret = state2.buffer.join("");
        else if (state2.buffer.length === 1) ret = state2.buffer.first();
        else ret = state2.buffer.concat(state2.length);
        state2.buffer.clear();
      } else {
        ret = state2.buffer.consume(n, state2.decoder);
      }
      return ret;
    }
    function endReadable(stream2) {
      const state2 = stream2._readableState;
      debug("endReadable", state2.endEmitted);
      if (!state2.endEmitted) {
        state2.ended = true;
        process.nextTick(endReadableNT, state2, stream2);
      }
    }
    function endReadableNT(state2, stream2) {
      debug("endReadableNT", state2.endEmitted, state2.length);
      if (!state2.errored && !state2.closeEmitted && !state2.endEmitted && state2.length === 0) {
        state2.endEmitted = true;
        stream2.emit("end");
        if (stream2.writable && stream2.allowHalfOpen === false) {
          process.nextTick(endWritableNT, stream2);
        } else if (state2.autoDestroy) {
          const wState = stream2._writableState;
          const autoDestroy = !wState || wState.autoDestroy && // We don't expect the writable to ever 'finish'
          // if writable is explicitly set to false.
          (wState.finished || wState.writable === false);
          if (autoDestroy) {
            stream2.destroy();
          }
        }
      }
    }
    function endWritableNT(stream2) {
      const writable2 = stream2.writable && !stream2.writableEnded && !stream2.destroyed;
      if (writable2) {
        stream2.end();
      }
    }
    Readable.from = function(iterable, opts) {
      return from(Readable, iterable, opts);
    };
    let webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0) webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Readable.fromWeb = function(readableStream, options) {
      return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
    };
    Readable.toWeb = function(streamReadable, options) {
      return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
    };
    Readable.wrap = function(src, options) {
      var _ref, _src$readableObjectMo;
      return new Readable({
        objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== void 0 ? _src$readableObjectMo : src.objectMode) !== null && _ref !== void 0 ? _ref : true,
        ...options,
        destroy(err, callback) {
          destroyImpl.destroyer(src, err);
          callback(err);
        }
      }).wrap(src);
    };
    return readable;
  }
  var writable;
  var hasRequiredWritable;
  function requireWritable() {
    if (hasRequiredWritable) return writable;
    hasRequiredWritable = 1;
    const process = requireBrowser$1();
    const {
      ArrayPrototypeSlice,
      Error: Error2,
      FunctionPrototypeSymbolHasInstance,
      ObjectDefineProperty,
      ObjectDefineProperties,
      ObjectSetPrototypeOf,
      StringPrototypeToLowerCase,
      Symbol: Symbol2,
      SymbolHasInstance
    } = requirePrimordials();
    writable = Writable;
    Writable.WritableState = WritableState;
    const { EventEmitter: EE } = requireEvents();
    const Stream = requireLegacy().Stream;
    const { Buffer: Buffer2 } = requireBuffer();
    const destroyImpl = requireDestroy();
    const { addAbortSignal: addAbortSignal2 } = requireAddAbortSignal();
    const { getHighWaterMark, getDefaultHighWaterMark } = requireState();
    const {
      ERR_INVALID_ARG_TYPE,
      ERR_METHOD_NOT_IMPLEMENTED,
      ERR_MULTIPLE_CALLBACK,
      ERR_STREAM_CANNOT_PIPE,
      ERR_STREAM_DESTROYED,
      ERR_STREAM_ALREADY_FINISHED,
      ERR_STREAM_NULL_VALUES,
      ERR_STREAM_WRITE_AFTER_END,
      ERR_UNKNOWN_ENCODING
    } = requireErrors().codes;
    const { errorOrDestroy } = destroyImpl;
    ObjectSetPrototypeOf(Writable.prototype, Stream.prototype);
    ObjectSetPrototypeOf(Writable, Stream);
    function nop() {
    }
    const kOnFinished = Symbol2("kOnFinished");
    function WritableState(options, stream2, isDuplex) {
      if (typeof isDuplex !== "boolean") isDuplex = stream2 instanceof requireDuplex();
      this.objectMode = !!(options && options.objectMode);
      if (isDuplex) this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
      this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      this.finalCalled = false;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      this.destroyed = false;
      const noDecode = !!(options && options.decodeStrings === false);
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options && options.defaultEncoding || "utf8";
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = onwrite.bind(void 0, stream2);
      this.writecb = null;
      this.writelen = 0;
      this.afterWriteTickInfo = null;
      resetBuffer(this);
      this.pendingcb = 0;
      this.constructed = true;
      this.prefinished = false;
      this.errorEmitted = false;
      this.emitClose = !options || options.emitClose !== false;
      this.autoDestroy = !options || options.autoDestroy !== false;
      this.errored = null;
      this.closed = false;
      this.closeEmitted = false;
      this[kOnFinished] = [];
    }
    function resetBuffer(state2) {
      state2.buffered = [];
      state2.bufferedIndex = 0;
      state2.allBuffers = true;
      state2.allNoop = true;
    }
    WritableState.prototype.getBuffer = function getBuffer() {
      return ArrayPrototypeSlice(this.buffered, this.bufferedIndex);
    };
    ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
      __proto__: null,
      get() {
        return this.buffered.length - this.bufferedIndex;
      }
    });
    function Writable(options) {
      const isDuplex = this instanceof requireDuplex();
      if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this)) return new Writable(options);
      this._writableState = new WritableState(options, this, isDuplex);
      if (options) {
        if (typeof options.write === "function") this._write = options.write;
        if (typeof options.writev === "function") this._writev = options.writev;
        if (typeof options.destroy === "function") this._destroy = options.destroy;
        if (typeof options.final === "function") this._final = options.final;
        if (typeof options.construct === "function") this._construct = options.construct;
        if (options.signal) addAbortSignal2(options.signal, this);
      }
      Stream.call(this, options);
      destroyImpl.construct(this, () => {
        const state2 = this._writableState;
        if (!state2.writing) {
          clearBuffer(this, state2);
        }
        finishMaybe(this, state2);
      });
    }
    ObjectDefineProperty(Writable, SymbolHasInstance, {
      __proto__: null,
      value: function(object) {
        if (FunctionPrototypeSymbolHasInstance(this, object)) return true;
        if (this !== Writable) return false;
        return object && object._writableState instanceof WritableState;
      }
    });
    Writable.prototype.pipe = function() {
      errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
    };
    function _write(stream2, chunk, encoding, cb) {
      const state2 = stream2._writableState;
      if (typeof encoding === "function") {
        cb = encoding;
        encoding = state2.defaultEncoding;
      } else {
        if (!encoding) encoding = state2.defaultEncoding;
        else if (encoding !== "buffer" && !Buffer2.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
        if (typeof cb !== "function") cb = nop;
      }
      if (chunk === null) {
        throw new ERR_STREAM_NULL_VALUES();
      } else if (!state2.objectMode) {
        if (typeof chunk === "string") {
          if (state2.decodeStrings !== false) {
            chunk = Buffer2.from(chunk, encoding);
            encoding = "buffer";
          }
        } else if (chunk instanceof Buffer2) {
          encoding = "buffer";
        } else if (Stream._isUint8Array(chunk)) {
          chunk = Stream._uint8ArrayToBuffer(chunk);
          encoding = "buffer";
        } else {
          throw new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
        }
      }
      let err;
      if (state2.ending) {
        err = new ERR_STREAM_WRITE_AFTER_END();
      } else if (state2.destroyed) {
        err = new ERR_STREAM_DESTROYED("write");
      }
      if (err) {
        process.nextTick(cb, err);
        errorOrDestroy(stream2, err, true);
        return err;
      }
      state2.pendingcb++;
      return writeOrBuffer(stream2, state2, chunk, encoding, cb);
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      return _write(this, chunk, encoding, cb) === true;
    };
    Writable.prototype.cork = function() {
      this._writableState.corked++;
    };
    Writable.prototype.uncork = function() {
      const state2 = this._writableState;
      if (state2.corked) {
        state2.corked--;
        if (!state2.writing) clearBuffer(this, state2);
      }
    };
    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      if (typeof encoding === "string") encoding = StringPrototypeToLowerCase(encoding);
      if (!Buffer2.isEncoding(encoding)) throw new ERR_UNKNOWN_ENCODING(encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };
    function writeOrBuffer(stream2, state2, chunk, encoding, callback) {
      const len = state2.objectMode ? 1 : chunk.length;
      state2.length += len;
      const ret = state2.length < state2.highWaterMark;
      if (!ret) state2.needDrain = true;
      if (state2.writing || state2.corked || state2.errored || !state2.constructed) {
        state2.buffered.push({
          chunk,
          encoding,
          callback
        });
        if (state2.allBuffers && encoding !== "buffer") {
          state2.allBuffers = false;
        }
        if (state2.allNoop && callback !== nop) {
          state2.allNoop = false;
        }
      } else {
        state2.writelen = len;
        state2.writecb = callback;
        state2.writing = true;
        state2.sync = true;
        stream2._write(chunk, encoding, state2.onwrite);
        state2.sync = false;
      }
      return ret && !state2.errored && !state2.destroyed;
    }
    function doWrite(stream2, state2, writev, len, chunk, encoding, cb) {
      state2.writelen = len;
      state2.writecb = cb;
      state2.writing = true;
      state2.sync = true;
      if (state2.destroyed) state2.onwrite(new ERR_STREAM_DESTROYED("write"));
      else if (writev) stream2._writev(chunk, state2.onwrite);
      else stream2._write(chunk, encoding, state2.onwrite);
      state2.sync = false;
    }
    function onwriteError(stream2, state2, er, cb) {
      --state2.pendingcb;
      cb(er);
      errorBuffer(state2);
      errorOrDestroy(stream2, er);
    }
    function onwrite(stream2, er) {
      const state2 = stream2._writableState;
      const sync = state2.sync;
      const cb = state2.writecb;
      if (typeof cb !== "function") {
        errorOrDestroy(stream2, new ERR_MULTIPLE_CALLBACK());
        return;
      }
      state2.writing = false;
      state2.writecb = null;
      state2.length -= state2.writelen;
      state2.writelen = 0;
      if (er) {
        er.stack;
        if (!state2.errored) {
          state2.errored = er;
        }
        if (stream2._readableState && !stream2._readableState.errored) {
          stream2._readableState.errored = er;
        }
        if (sync) {
          process.nextTick(onwriteError, stream2, state2, er, cb);
        } else {
          onwriteError(stream2, state2, er, cb);
        }
      } else {
        if (state2.buffered.length > state2.bufferedIndex) {
          clearBuffer(stream2, state2);
        }
        if (sync) {
          if (state2.afterWriteTickInfo !== null && state2.afterWriteTickInfo.cb === cb) {
            state2.afterWriteTickInfo.count++;
          } else {
            state2.afterWriteTickInfo = {
              count: 1,
              cb,
              stream: stream2,
              state: state2
            };
            process.nextTick(afterWriteTick, state2.afterWriteTickInfo);
          }
        } else {
          afterWrite(stream2, state2, 1, cb);
        }
      }
    }
    function afterWriteTick({ stream: stream2, state: state2, count, cb }) {
      state2.afterWriteTickInfo = null;
      return afterWrite(stream2, state2, count, cb);
    }
    function afterWrite(stream2, state2, count, cb) {
      const needDrain = !state2.ending && !stream2.destroyed && state2.length === 0 && state2.needDrain;
      if (needDrain) {
        state2.needDrain = false;
        stream2.emit("drain");
      }
      while (count-- > 0) {
        state2.pendingcb--;
        cb();
      }
      if (state2.destroyed) {
        errorBuffer(state2);
      }
      finishMaybe(stream2, state2);
    }
    function errorBuffer(state2) {
      if (state2.writing) {
        return;
      }
      for (let n = state2.bufferedIndex; n < state2.buffered.length; ++n) {
        var _state$errored;
        const { chunk, callback } = state2.buffered[n];
        const len = state2.objectMode ? 1 : chunk.length;
        state2.length -= len;
        callback(
          (_state$errored = state2.errored) !== null && _state$errored !== void 0 ? _state$errored : new ERR_STREAM_DESTROYED("write")
        );
      }
      const onfinishCallbacks = state2[kOnFinished].splice(0);
      for (let i = 0; i < onfinishCallbacks.length; i++) {
        var _state$errored2;
        onfinishCallbacks[i](
          (_state$errored2 = state2.errored) !== null && _state$errored2 !== void 0 ? _state$errored2 : new ERR_STREAM_DESTROYED("end")
        );
      }
      resetBuffer(state2);
    }
    function clearBuffer(stream2, state2) {
      if (state2.corked || state2.bufferProcessing || state2.destroyed || !state2.constructed) {
        return;
      }
      const { buffered, bufferedIndex, objectMode } = state2;
      const bufferedLength = buffered.length - bufferedIndex;
      if (!bufferedLength) {
        return;
      }
      let i = bufferedIndex;
      state2.bufferProcessing = true;
      if (bufferedLength > 1 && stream2._writev) {
        state2.pendingcb -= bufferedLength - 1;
        const callback = state2.allNoop ? nop : (err) => {
          for (let n = i; n < buffered.length; ++n) {
            buffered[n].callback(err);
          }
        };
        const chunks = state2.allNoop && i === 0 ? buffered : ArrayPrototypeSlice(buffered, i);
        chunks.allBuffers = state2.allBuffers;
        doWrite(stream2, state2, true, state2.length, chunks, "", callback);
        resetBuffer(state2);
      } else {
        do {
          const { chunk, encoding, callback } = buffered[i];
          buffered[i++] = null;
          const len = objectMode ? 1 : chunk.length;
          doWrite(stream2, state2, false, len, chunk, encoding, callback);
        } while (i < buffered.length && !state2.writing);
        if (i === buffered.length) {
          resetBuffer(state2);
        } else if (i > 256) {
          buffered.splice(0, i);
          state2.bufferedIndex = 0;
        } else {
          state2.bufferedIndex = i;
        }
      }
      state2.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      if (this._writev) {
        this._writev(
          [
            {
              chunk,
              encoding
            }
          ],
          cb
        );
      } else {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
      }
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      const state2 = this._writableState;
      if (typeof chunk === "function") {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      let err;
      if (chunk !== null && chunk !== void 0) {
        const ret = _write(this, chunk, encoding);
        if (ret instanceof Error2) {
          err = ret;
        }
      }
      if (state2.corked) {
        state2.corked = 1;
        this.uncork();
      }
      if (err) ;
      else if (!state2.errored && !state2.ending) {
        state2.ending = true;
        finishMaybe(this, state2, true);
        state2.ended = true;
      } else if (state2.finished) {
        err = new ERR_STREAM_ALREADY_FINISHED("end");
      } else if (state2.destroyed) {
        err = new ERR_STREAM_DESTROYED("end");
      }
      if (typeof cb === "function") {
        if (err || state2.finished) {
          process.nextTick(cb, err);
        } else {
          state2[kOnFinished].push(cb);
        }
      }
      return this;
    };
    function needFinish(state2) {
      return state2.ending && !state2.destroyed && state2.constructed && state2.length === 0 && !state2.errored && state2.buffered.length === 0 && !state2.finished && !state2.writing && !state2.errorEmitted && !state2.closeEmitted;
    }
    function callFinal(stream2, state2) {
      let called = false;
      function onFinish(err) {
        if (called) {
          errorOrDestroy(stream2, err !== null && err !== void 0 ? err : ERR_MULTIPLE_CALLBACK());
          return;
        }
        called = true;
        state2.pendingcb--;
        if (err) {
          const onfinishCallbacks = state2[kOnFinished].splice(0);
          for (let i = 0; i < onfinishCallbacks.length; i++) {
            onfinishCallbacks[i](err);
          }
          errorOrDestroy(stream2, err, state2.sync);
        } else if (needFinish(state2)) {
          state2.prefinished = true;
          stream2.emit("prefinish");
          state2.pendingcb++;
          process.nextTick(finish, stream2, state2);
        }
      }
      state2.sync = true;
      state2.pendingcb++;
      try {
        stream2._final(onFinish);
      } catch (err) {
        onFinish(err);
      }
      state2.sync = false;
    }
    function prefinish(stream2, state2) {
      if (!state2.prefinished && !state2.finalCalled) {
        if (typeof stream2._final === "function" && !state2.destroyed) {
          state2.finalCalled = true;
          callFinal(stream2, state2);
        } else {
          state2.prefinished = true;
          stream2.emit("prefinish");
        }
      }
    }
    function finishMaybe(stream2, state2, sync) {
      if (needFinish(state2)) {
        prefinish(stream2, state2);
        if (state2.pendingcb === 0) {
          if (sync) {
            state2.pendingcb++;
            process.nextTick(
              (stream3, state3) => {
                if (needFinish(state3)) {
                  finish(stream3, state3);
                } else {
                  state3.pendingcb--;
                }
              },
              stream2,
              state2
            );
          } else if (needFinish(state2)) {
            state2.pendingcb++;
            finish(stream2, state2);
          }
        }
      }
    }
    function finish(stream2, state2) {
      state2.pendingcb--;
      state2.finished = true;
      const onfinishCallbacks = state2[kOnFinished].splice(0);
      for (let i = 0; i < onfinishCallbacks.length; i++) {
        onfinishCallbacks[i]();
      }
      stream2.emit("finish");
      if (state2.autoDestroy) {
        const rState = stream2._readableState;
        const autoDestroy = !rState || rState.autoDestroy && // We don't expect the readable to ever 'end'
        // if readable is explicitly set to false.
        (rState.endEmitted || rState.readable === false);
        if (autoDestroy) {
          stream2.destroy();
        }
      }
    }
    ObjectDefineProperties(Writable.prototype, {
      closed: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.closed : false;
        }
      },
      destroyed: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.destroyed : false;
        },
        set(value) {
          if (this._writableState) {
            this._writableState.destroyed = value;
          }
        }
      },
      writable: {
        __proto__: null,
        get() {
          const w = this._writableState;
          return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
        },
        set(val) {
          if (this._writableState) {
            this._writableState.writable = !!val;
          }
        }
      },
      writableFinished: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.finished : false;
        }
      },
      writableObjectMode: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.objectMode : false;
        }
      },
      writableBuffer: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.getBuffer();
        }
      },
      writableEnded: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.ending : false;
        }
      },
      writableNeedDrain: {
        __proto__: null,
        get() {
          const wState = this._writableState;
          if (!wState) return false;
          return !wState.destroyed && !wState.ending && wState.needDrain;
        }
      },
      writableHighWaterMark: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.highWaterMark;
        }
      },
      writableCorked: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.corked : 0;
        }
      },
      writableLength: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.length;
        }
      },
      errored: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._writableState ? this._writableState.errored : null;
        }
      },
      writableAborted: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return !!(this._writableState.writable !== false && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
        }
      }
    });
    const destroy = destroyImpl.destroy;
    Writable.prototype.destroy = function(err, cb) {
      const state2 = this._writableState;
      if (!state2.destroyed && (state2.bufferedIndex < state2.buffered.length || state2[kOnFinished].length)) {
        process.nextTick(errorBuffer, state2);
      }
      destroy.call(this, err, cb);
      return this;
    };
    Writable.prototype._undestroy = destroyImpl.undestroy;
    Writable.prototype._destroy = function(err, cb) {
      cb(err);
    };
    Writable.prototype[EE.captureRejectionSymbol] = function(err) {
      this.destroy(err);
    };
    let webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0) webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Writable.fromWeb = function(writableStream, options) {
      return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
    };
    Writable.toWeb = function(streamWritable) {
      return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
    };
    return writable;
  }
  var duplexify;
  var hasRequiredDuplexify;
  function requireDuplexify() {
    if (hasRequiredDuplexify) return duplexify;
    hasRequiredDuplexify = 1;
    const process = requireBrowser$1();
    const bufferModule = requireBuffer();
    const {
      isReadable,
      isWritable,
      isIterable,
      isNodeStream,
      isReadableNodeStream,
      isWritableNodeStream,
      isDuplexNodeStream,
      isReadableStream,
      isWritableStream
    } = requireUtils();
    const eos = requireEndOfStream();
    const {
      AbortError,
      codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE }
    } = requireErrors();
    const { destroyer } = requireDestroy();
    const Duplex = requireDuplex();
    const Readable = requireReadable();
    const Writable = requireWritable();
    const { createDeferredPromise } = requireUtil$3();
    const from = requireFrom();
    const Blob = globalThis.Blob || bufferModule.Blob;
    const isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
      return b instanceof Blob;
    } : function isBlob3(b) {
      return false;
    };
    const AbortController = globalThis.AbortController || requireBrowser$2().AbortController;
    const { FunctionPrototypeCall } = requirePrimordials();
    class Duplexify extends Duplex {
      constructor(options) {
        super(options);
        if ((options === null || options === void 0 ? void 0 : options.readable) === false) {
          this._readableState.readable = false;
          this._readableState.ended = true;
          this._readableState.endEmitted = true;
        }
        if ((options === null || options === void 0 ? void 0 : options.writable) === false) {
          this._writableState.writable = false;
          this._writableState.ending = true;
          this._writableState.ended = true;
          this._writableState.finished = true;
        }
      }
    }
    duplexify = function duplexify2(body, name) {
      if (isDuplexNodeStream(body)) {
        return body;
      }
      if (isReadableNodeStream(body)) {
        return _duplexify({
          readable: body
        });
      }
      if (isWritableNodeStream(body)) {
        return _duplexify({
          writable: body
        });
      }
      if (isNodeStream(body)) {
        return _duplexify({
          writable: false,
          readable: false
        });
      }
      if (isReadableStream(body)) {
        return _duplexify({
          readable: Readable.fromWeb(body)
        });
      }
      if (isWritableStream(body)) {
        return _duplexify({
          writable: Writable.fromWeb(body)
        });
      }
      if (typeof body === "function") {
        const { value, write, final, destroy } = fromAsyncGen(body);
        if (isIterable(value)) {
          return from(Duplexify, value, {
            // TODO (ronag): highWaterMark?
            objectMode: true,
            write,
            final,
            destroy
          });
        }
        const then2 = value === null || value === void 0 ? void 0 : value.then;
        if (typeof then2 === "function") {
          let d;
          const promise = FunctionPrototypeCall(
            then2,
            value,
            (val) => {
              if (val != null) {
                throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
              }
            },
            (err) => {
              destroyer(d, err);
            }
          );
          return d = new Duplexify({
            // TODO (ronag): highWaterMark?
            objectMode: true,
            readable: false,
            write,
            final(cb) {
              final(async () => {
                try {
                  await promise;
                  process.nextTick(cb, null);
                } catch (err) {
                  process.nextTick(cb, err);
                }
              });
            },
            destroy
          });
        }
        throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name, value);
      }
      if (isBlob(body)) {
        return duplexify2(body.arrayBuffer());
      }
      if (isIterable(body)) {
        return from(Duplexify, body, {
          // TODO (ronag): highWaterMark?
          objectMode: true,
          writable: false
        });
      }
      if (isReadableStream(body === null || body === void 0 ? void 0 : body.readable) && isWritableStream(body === null || body === void 0 ? void 0 : body.writable)) {
        return Duplexify.fromWeb(body);
      }
      if (typeof (body === null || body === void 0 ? void 0 : body.writable) === "object" || typeof (body === null || body === void 0 ? void 0 : body.readable) === "object") {
        const readable2 = body !== null && body !== void 0 && body.readable ? isReadableNodeStream(body === null || body === void 0 ? void 0 : body.readable) ? body === null || body === void 0 ? void 0 : body.readable : duplexify2(body.readable) : void 0;
        const writable2 = body !== null && body !== void 0 && body.writable ? isWritableNodeStream(body === null || body === void 0 ? void 0 : body.writable) ? body === null || body === void 0 ? void 0 : body.writable : duplexify2(body.writable) : void 0;
        return _duplexify({
          readable: readable2,
          writable: writable2
        });
      }
      const then = body === null || body === void 0 ? void 0 : body.then;
      if (typeof then === "function") {
        let d;
        FunctionPrototypeCall(
          then,
          body,
          (val) => {
            if (val != null) {
              d.push(val);
            }
            d.push(null);
          },
          (err) => {
            destroyer(d, err);
          }
        );
        return d = new Duplexify({
          objectMode: true,
          writable: false,
          read() {
          }
        });
      }
      throw new ERR_INVALID_ARG_TYPE(
        name,
        [
          "Blob",
          "ReadableStream",
          "WritableStream",
          "Stream",
          "Iterable",
          "AsyncIterable",
          "Function",
          "{ readable, writable } pair",
          "Promise"
        ],
        body
      );
    };
    function fromAsyncGen(fn) {
      let { promise, resolve } = createDeferredPromise();
      const ac = new AbortController();
      const signal = ac.signal;
      const value = fn(
        (async function* () {
          while (true) {
            const _promise = promise;
            promise = null;
            const { chunk, done, cb } = await _promise;
            process.nextTick(cb);
            if (done) return;
            if (signal.aborted)
              throw new AbortError(void 0, {
                cause: signal.reason
              });
            ({ promise, resolve } = createDeferredPromise());
            yield chunk;
          }
        })(),
        {
          signal
        }
      );
      return {
        value,
        write(chunk, encoding, cb) {
          const _resolve = resolve;
          resolve = null;
          _resolve({
            chunk,
            done: false,
            cb
          });
        },
        final(cb) {
          const _resolve = resolve;
          resolve = null;
          _resolve({
            done: true,
            cb
          });
        },
        destroy(err, cb) {
          ac.abort();
          cb(err);
        }
      };
    }
    function _duplexify(pair) {
      const r = pair.readable && typeof pair.readable.read !== "function" ? Readable.wrap(pair.readable) : pair.readable;
      const w = pair.writable;
      let readable2 = !!isReadable(r);
      let writable2 = !!isWritable(w);
      let ondrain;
      let onfinish;
      let onreadable;
      let onclose;
      let d;
      function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
          cb(err);
        } else if (err) {
          d.destroy(err);
        }
      }
      d = new Duplexify({
        // TODO (ronag): highWaterMark?
        readableObjectMode: !!(r !== null && r !== void 0 && r.readableObjectMode),
        writableObjectMode: !!(w !== null && w !== void 0 && w.writableObjectMode),
        readable: readable2,
        writable: writable2
      });
      if (writable2) {
        eos(w, (err) => {
          writable2 = false;
          if (err) {
            destroyer(r, err);
          }
          onfinished(err);
        });
        d._write = function(chunk, encoding, callback) {
          if (w.write(chunk, encoding)) {
            callback();
          } else {
            ondrain = callback;
          }
        };
        d._final = function(callback) {
          w.end();
          onfinish = callback;
        };
        w.on("drain", function() {
          if (ondrain) {
            const cb = ondrain;
            ondrain = null;
            cb();
          }
        });
        w.on("finish", function() {
          if (onfinish) {
            const cb = onfinish;
            onfinish = null;
            cb();
          }
        });
      }
      if (readable2) {
        eos(r, (err) => {
          readable2 = false;
          if (err) {
            destroyer(r, err);
          }
          onfinished(err);
        });
        r.on("readable", function() {
          if (onreadable) {
            const cb = onreadable;
            onreadable = null;
            cb();
          }
        });
        r.on("end", function() {
          d.push(null);
        });
        d._read = function() {
          while (true) {
            const buf = r.read();
            if (buf === null) {
              onreadable = d._read;
              return;
            }
            if (!d.push(buf)) {
              return;
            }
          }
        };
      }
      d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
          err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
          callback(err);
        } else {
          onclose = callback;
          destroyer(w, err);
          destroyer(r, err);
        }
      };
      return d;
    }
    return duplexify;
  }
  var duplex;
  var hasRequiredDuplex;
  function requireDuplex() {
    if (hasRequiredDuplex) return duplex;
    hasRequiredDuplex = 1;
    const {
      ObjectDefineProperties,
      ObjectGetOwnPropertyDescriptor,
      ObjectKeys,
      ObjectSetPrototypeOf
    } = requirePrimordials();
    duplex = Duplex;
    const Readable = requireReadable();
    const Writable = requireWritable();
    ObjectSetPrototypeOf(Duplex.prototype, Readable.prototype);
    ObjectSetPrototypeOf(Duplex, Readable);
    {
      const keys = ObjectKeys(Writable.prototype);
      for (let i = 0; i < keys.length; i++) {
        const method = keys[i];
        if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
      }
    }
    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      if (options) {
        this.allowHalfOpen = options.allowHalfOpen !== false;
        if (options.readable === false) {
          this._readableState.readable = false;
          this._readableState.ended = true;
          this._readableState.endEmitted = true;
        }
        if (options.writable === false) {
          this._writableState.writable = false;
          this._writableState.ending = true;
          this._writableState.ended = true;
          this._writableState.finished = true;
        }
      } else {
        this.allowHalfOpen = true;
      }
    }
    ObjectDefineProperties(Duplex.prototype, {
      writable: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writable")
      },
      writableHighWaterMark: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark")
      },
      writableObjectMode: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableObjectMode")
      },
      writableBuffer: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableBuffer")
      },
      writableLength: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableLength")
      },
      writableFinished: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableFinished")
      },
      writableCorked: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableCorked")
      },
      writableEnded: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableEnded")
      },
      writableNeedDrain: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain")
      },
      destroyed: {
        __proto__: null,
        get() {
          if (this._readableState === void 0 || this._writableState === void 0) {
            return false;
          }
          return this._readableState.destroyed && this._writableState.destroyed;
        },
        set(value) {
          if (this._readableState && this._writableState) {
            this._readableState.destroyed = value;
            this._writableState.destroyed = value;
          }
        }
      }
    });
    let webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0) webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Duplex.fromWeb = function(pair, options) {
      return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
    };
    Duplex.toWeb = function(duplex2) {
      return lazyWebStreams().newReadableWritablePairFromDuplex(duplex2);
    };
    let duplexify2;
    Duplex.from = function(body) {
      if (!duplexify2) {
        duplexify2 = requireDuplexify();
      }
      return duplexify2(body, "body");
    };
    return duplex;
  }
  var transform;
  var hasRequiredTransform;
  function requireTransform() {
    if (hasRequiredTransform) return transform;
    hasRequiredTransform = 1;
    const { ObjectSetPrototypeOf, Symbol: Symbol2 } = requirePrimordials();
    transform = Transform;
    const { ERR_METHOD_NOT_IMPLEMENTED } = requireErrors().codes;
    const Duplex = requireDuplex();
    const { getHighWaterMark } = requireState();
    ObjectSetPrototypeOf(Transform.prototype, Duplex.prototype);
    ObjectSetPrototypeOf(Transform, Duplex);
    const kCallback = Symbol2("kCallback");
    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);
      const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
      if (readableHighWaterMark === 0) {
        options = {
          ...options,
          highWaterMark: null,
          readableHighWaterMark,
          // TODO (ronag): 0 is not optimal since we have
          // a "bug" where we check needDrain before calling _write and not after.
          // Refs: https://github.com/nodejs/node/pull/32887
          // Refs: https://github.com/nodejs/node/pull/35941
          writableHighWaterMark: options.writableHighWaterMark || 0
        };
      }
      Duplex.call(this, options);
      this._readableState.sync = false;
      this[kCallback] = null;
      if (options) {
        if (typeof options.transform === "function") this._transform = options.transform;
        if (typeof options.flush === "function") this._flush = options.flush;
      }
      this.on("prefinish", prefinish);
    }
    function final(cb) {
      if (typeof this._flush === "function" && !this.destroyed) {
        this._flush((er, data) => {
          if (er) {
            if (cb) {
              cb(er);
            } else {
              this.destroy(er);
            }
            return;
          }
          if (data != null) {
            this.push(data);
          }
          this.push(null);
          if (cb) {
            cb();
          }
        });
      } else {
        this.push(null);
        if (cb) {
          cb();
        }
      }
    }
    function prefinish() {
      if (this._final !== final) {
        final.call(this);
      }
    }
    Transform.prototype._final = final;
    Transform.prototype._transform = function(chunk, encoding, callback) {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
    };
    Transform.prototype._write = function(chunk, encoding, callback) {
      const rState = this._readableState;
      const wState = this._writableState;
      const length = rState.length;
      this._transform(chunk, encoding, (err, val) => {
        if (err) {
          callback(err);
          return;
        }
        if (val != null) {
          this.push(val);
        }
        if (wState.ended || // Backwards compat.
        length === rState.length || // Backwards compat.
        rState.length < rState.highWaterMark) {
          callback();
        } else {
          this[kCallback] = callback;
        }
      });
    };
    Transform.prototype._read = function() {
      if (this[kCallback]) {
        const callback = this[kCallback];
        this[kCallback] = null;
        callback();
      }
    };
    return transform;
  }
  var passthrough;
  var hasRequiredPassthrough;
  function requirePassthrough() {
    if (hasRequiredPassthrough) return passthrough;
    hasRequiredPassthrough = 1;
    const { ObjectSetPrototypeOf } = requirePrimordials();
    passthrough = PassThrough;
    const Transform = requireTransform();
    ObjectSetPrototypeOf(PassThrough.prototype, Transform.prototype);
    ObjectSetPrototypeOf(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);
      Transform.call(this, options);
    }
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
    return passthrough;
  }
  var pipeline_1;
  var hasRequiredPipeline;
  function requirePipeline() {
    if (hasRequiredPipeline) return pipeline_1;
    hasRequiredPipeline = 1;
    const process = requireBrowser$1();
    const { ArrayIsArray, Promise: Promise2, SymbolAsyncIterator, SymbolDispose } = requirePrimordials();
    const eos = requireEndOfStream();
    const { once } = requireUtil$3();
    const destroyImpl = requireDestroy();
    const Duplex = requireDuplex();
    const {
      aggregateTwoErrors,
      codes: {
        ERR_INVALID_ARG_TYPE,
        ERR_INVALID_RETURN_VALUE,
        ERR_MISSING_ARGS,
        ERR_STREAM_DESTROYED,
        ERR_STREAM_PREMATURE_CLOSE
      },
      AbortError
    } = requireErrors();
    const { validateFunction, validateAbortSignal } = requireValidators();
    const {
      isIterable,
      isReadable,
      isReadableNodeStream,
      isNodeStream,
      isTransformStream,
      isWebStream,
      isReadableStream,
      isReadableFinished
    } = requireUtils();
    const AbortController = globalThis.AbortController || requireBrowser$2().AbortController;
    let PassThrough;
    let Readable;
    let addAbortListener;
    function destroyer(stream2, reading, writing) {
      let finished = false;
      stream2.on("close", () => {
        finished = true;
      });
      const cleanup = eos(
        stream2,
        {
          readable: reading,
          writable: writing
        },
        (err) => {
          finished = !err;
        }
      );
      return {
        destroy: (err) => {
          if (finished) return;
          finished = true;
          destroyImpl.destroyer(stream2, err || new ERR_STREAM_DESTROYED("pipe"));
        },
        cleanup
      };
    }
    function popCallback(streams) {
      validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
      return streams.pop();
    }
    function makeAsyncIterable(val) {
      if (isIterable(val)) {
        return val;
      } else if (isReadableNodeStream(val)) {
        return fromReadable(val);
      }
      throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable"], val);
    }
    async function* fromReadable(val) {
      if (!Readable) {
        Readable = requireReadable();
      }
      yield* Readable.prototype[SymbolAsyncIterator].call(val);
    }
    async function pumpToNode(iterable, writable2, finish, { end }) {
      let error;
      let onresolve = null;
      const resume = (err) => {
        if (err) {
          error = err;
        }
        if (onresolve) {
          const callback = onresolve;
          onresolve = null;
          callback();
        }
      };
      const wait = () => new Promise2((resolve, reject) => {
        if (error) {
          reject(error);
        } else {
          onresolve = () => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          };
        }
      });
      writable2.on("drain", resume);
      const cleanup = eos(
        writable2,
        {
          readable: false
        },
        resume
      );
      try {
        if (writable2.writableNeedDrain) {
          await wait();
        }
        for await (const chunk of iterable) {
          if (!writable2.write(chunk)) {
            await wait();
          }
        }
        if (end) {
          writable2.end();
          await wait();
        }
        finish();
      } catch (err) {
        finish(error !== err ? aggregateTwoErrors(error, err) : err);
      } finally {
        cleanup();
        writable2.off("drain", resume);
      }
    }
    async function pumpToWeb(readable2, writable2, finish, { end }) {
      if (isTransformStream(writable2)) {
        writable2 = writable2.writable;
      }
      const writer = writable2.getWriter();
      try {
        for await (const chunk of readable2) {
          await writer.ready;
          writer.write(chunk).catch(() => {
          });
        }
        await writer.ready;
        if (end) {
          await writer.close();
        }
        finish();
      } catch (err) {
        try {
          await writer.abort(err);
          finish(err);
        } catch (err2) {
          finish(err2);
        }
      }
    }
    function pipeline(...streams) {
      return pipelineImpl(streams, once(popCallback(streams)));
    }
    function pipelineImpl(streams, callback, opts) {
      if (streams.length === 1 && ArrayIsArray(streams[0])) {
        streams = streams[0];
      }
      if (streams.length < 2) {
        throw new ERR_MISSING_ARGS("streams");
      }
      const ac = new AbortController();
      const signal = ac.signal;
      const outerSignal = opts === null || opts === void 0 ? void 0 : opts.signal;
      const lastStreamCleanup = [];
      validateAbortSignal(outerSignal, "options.signal");
      function abort() {
        finishImpl(new AbortError());
      }
      addAbortListener = addAbortListener || requireUtil$3().addAbortListener;
      let disposable;
      if (outerSignal) {
        disposable = addAbortListener(outerSignal, abort);
      }
      let error;
      let value;
      const destroys = [];
      let finishCount = 0;
      function finish(err) {
        finishImpl(err, --finishCount === 0);
      }
      function finishImpl(err, final) {
        var _disposable;
        if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
          error = err;
        }
        if (!error && !final) {
          return;
        }
        while (destroys.length) {
          destroys.shift()(error);
        }
        (_disposable = disposable) === null || _disposable === void 0 ? void 0 : _disposable[SymbolDispose]();
        ac.abort();
        if (final) {
          if (!error) {
            lastStreamCleanup.forEach((fn) => fn());
          }
          process.nextTick(callback, error, value);
        }
      }
      let ret;
      for (let i = 0; i < streams.length; i++) {
        const stream2 = streams[i];
        const reading = i < streams.length - 1;
        const writing = i > 0;
        const end = reading || (opts === null || opts === void 0 ? void 0 : opts.end) !== false;
        const isLastStream = i === streams.length - 1;
        if (isNodeStream(stream2)) {
          let onError2 = function(err) {
            if (err && err.name !== "AbortError" && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
              finish(err);
            }
          };
          if (end) {
            const { destroy, cleanup } = destroyer(stream2, reading, writing);
            destroys.push(destroy);
            if (isReadable(stream2) && isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          }
          stream2.on("error", onError2);
          if (isReadable(stream2) && isLastStream) {
            lastStreamCleanup.push(() => {
              stream2.removeListener("error", onError2);
            });
          }
        }
        if (i === 0) {
          if (typeof stream2 === "function") {
            ret = stream2({
              signal
            });
            if (!isIterable(ret)) {
              throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
            }
          } else if (isIterable(stream2) || isReadableNodeStream(stream2) || isTransformStream(stream2)) {
            ret = stream2;
          } else {
            ret = Duplex.from(stream2);
          }
        } else if (typeof stream2 === "function") {
          if (isTransformStream(ret)) {
            var _ret;
            ret = makeAsyncIterable((_ret = ret) === null || _ret === void 0 ? void 0 : _ret.readable);
          } else {
            ret = makeAsyncIterable(ret);
          }
          ret = stream2(ret, {
            signal
          });
          if (reading) {
            if (!isIterable(ret, true)) {
              throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i - 1}]`, ret);
            }
          } else {
            var _ret2;
            if (!PassThrough) {
              PassThrough = requirePassthrough();
            }
            const pt = new PassThrough({
              objectMode: true
            });
            const then = (_ret2 = ret) === null || _ret2 === void 0 ? void 0 : _ret2.then;
            if (typeof then === "function") {
              finishCount++;
              then.call(
                ret,
                (val) => {
                  value = val;
                  if (val != null) {
                    pt.write(val);
                  }
                  if (end) {
                    pt.end();
                  }
                  process.nextTick(finish);
                },
                (err) => {
                  pt.destroy(err);
                  process.nextTick(finish, err);
                }
              );
            } else if (isIterable(ret, true)) {
              finishCount++;
              pumpToNode(ret, pt, finish, {
                end
              });
            } else if (isReadableStream(ret) || isTransformStream(ret)) {
              const toRead = ret.readable || ret;
              finishCount++;
              pumpToNode(toRead, pt, finish, {
                end
              });
            } else {
              throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
            }
            ret = pt;
            const { destroy, cleanup } = destroyer(ret, false, true);
            destroys.push(destroy);
            if (isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          }
        } else if (isNodeStream(stream2)) {
          if (isReadableNodeStream(ret)) {
            finishCount += 2;
            const cleanup = pipe(ret, stream2, finish, {
              end
            });
            if (isReadable(stream2) && isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          } else if (isTransformStream(ret) || isReadableStream(ret)) {
            const toRead = ret.readable || ret;
            finishCount++;
            pumpToNode(toRead, stream2, finish, {
              end
            });
          } else if (isIterable(ret)) {
            finishCount++;
            pumpToNode(ret, stream2, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_ARG_TYPE(
              "val",
              ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
              ret
            );
          }
          ret = stream2;
        } else if (isWebStream(stream2)) {
          if (isReadableNodeStream(ret)) {
            finishCount++;
            pumpToWeb(makeAsyncIterable(ret), stream2, finish, {
              end
            });
          } else if (isReadableStream(ret) || isIterable(ret)) {
            finishCount++;
            pumpToWeb(ret, stream2, finish, {
              end
            });
          } else if (isTransformStream(ret)) {
            finishCount++;
            pumpToWeb(ret.readable, stream2, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_ARG_TYPE(
              "val",
              ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
              ret
            );
          }
          ret = stream2;
        } else {
          ret = Duplex.from(stream2);
        }
      }
      if (signal !== null && signal !== void 0 && signal.aborted || outerSignal !== null && outerSignal !== void 0 && outerSignal.aborted) {
        process.nextTick(abort);
      }
      return ret;
    }
    function pipe(src, dst, finish, { end }) {
      let ended = false;
      dst.on("close", () => {
        if (!ended) {
          finish(new ERR_STREAM_PREMATURE_CLOSE());
        }
      });
      src.pipe(dst, {
        end: false
      });
      if (end) {
        let endFn2 = function() {
          ended = true;
          dst.end();
        };
        if (isReadableFinished(src)) {
          process.nextTick(endFn2);
        } else {
          src.once("end", endFn2);
        }
      } else {
        finish();
      }
      eos(
        src,
        {
          readable: true,
          writable: false
        },
        (err) => {
          const rState = src._readableState;
          if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
            src.once("end", finish).once("error", finish);
          } else {
            finish(err);
          }
        }
      );
      return eos(
        dst,
        {
          readable: false,
          writable: true
        },
        finish
      );
    }
    pipeline_1 = {
      pipelineImpl,
      pipeline
    };
    return pipeline_1;
  }
  var compose;
  var hasRequiredCompose;
  function requireCompose() {
    if (hasRequiredCompose) return compose;
    hasRequiredCompose = 1;
    const { pipeline } = requirePipeline();
    const Duplex = requireDuplex();
    const { destroyer } = requireDestroy();
    const {
      isNodeStream,
      isReadable,
      isWritable,
      isWebStream,
      isTransformStream,
      isWritableStream,
      isReadableStream
    } = requireUtils();
    const {
      AbortError,
      codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS }
    } = requireErrors();
    const eos = requireEndOfStream();
    compose = function compose2(...streams) {
      if (streams.length === 0) {
        throw new ERR_MISSING_ARGS("streams");
      }
      if (streams.length === 1) {
        return Duplex.from(streams[0]);
      }
      const orgStreams = [...streams];
      if (typeof streams[0] === "function") {
        streams[0] = Duplex.from(streams[0]);
      }
      if (typeof streams[streams.length - 1] === "function") {
        const idx = streams.length - 1;
        streams[idx] = Duplex.from(streams[idx]);
      }
      for (let n = 0; n < streams.length; ++n) {
        if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) {
          continue;
        }
        if (n < streams.length - 1 && !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))) {
          throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
        }
        if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) {
          throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
        }
      }
      let ondrain;
      let onfinish;
      let onreadable;
      let onclose;
      let d;
      function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
          cb(err);
        } else if (err) {
          d.destroy(err);
        } else if (!readable2 && !writable2) {
          d.destroy();
        }
      }
      const head = streams[0];
      const tail = pipeline(streams, onfinished);
      const writable2 = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
      const readable2 = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
      d = new Duplex({
        // TODO (ronag): highWaterMark?
        writableObjectMode: !!(head !== null && head !== void 0 && head.writableObjectMode),
        readableObjectMode: !!(tail !== null && tail !== void 0 && tail.readableObjectMode),
        writable: writable2,
        readable: readable2
      });
      if (writable2) {
        if (isNodeStream(head)) {
          d._write = function(chunk, encoding, callback) {
            if (head.write(chunk, encoding)) {
              callback();
            } else {
              ondrain = callback;
            }
          };
          d._final = function(callback) {
            head.end();
            onfinish = callback;
          };
          head.on("drain", function() {
            if (ondrain) {
              const cb = ondrain;
              ondrain = null;
              cb();
            }
          });
        } else if (isWebStream(head)) {
          const writable3 = isTransformStream(head) ? head.writable : head;
          const writer = writable3.getWriter();
          d._write = async function(chunk, encoding, callback) {
            try {
              await writer.ready;
              writer.write(chunk).catch(() => {
              });
              callback();
            } catch (err) {
              callback(err);
            }
          };
          d._final = async function(callback) {
            try {
              await writer.ready;
              writer.close().catch(() => {
              });
              onfinish = callback;
            } catch (err) {
              callback(err);
            }
          };
        }
        const toRead = isTransformStream(tail) ? tail.readable : tail;
        eos(toRead, () => {
          if (onfinish) {
            const cb = onfinish;
            onfinish = null;
            cb();
          }
        });
      }
      if (readable2) {
        if (isNodeStream(tail)) {
          tail.on("readable", function() {
            if (onreadable) {
              const cb = onreadable;
              onreadable = null;
              cb();
            }
          });
          tail.on("end", function() {
            d.push(null);
          });
          d._read = function() {
            while (true) {
              const buf = tail.read();
              if (buf === null) {
                onreadable = d._read;
                return;
              }
              if (!d.push(buf)) {
                return;
              }
            }
          };
        } else if (isWebStream(tail)) {
          const readable3 = isTransformStream(tail) ? tail.readable : tail;
          const reader = readable3.getReader();
          d._read = async function() {
            while (true) {
              try {
                const { value, done } = await reader.read();
                if (!d.push(value)) {
                  return;
                }
                if (done) {
                  d.push(null);
                  return;
                }
              } catch {
                return;
              }
            }
          };
        }
      }
      d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
          err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
          callback(err);
        } else {
          onclose = callback;
          if (isNodeStream(tail)) {
            destroyer(tail, err);
          }
        }
      };
      return d;
    };
    return compose;
  }
  var hasRequiredOperators;
  function requireOperators() {
    if (hasRequiredOperators) return operators;
    hasRequiredOperators = 1;
    const AbortController = globalThis.AbortController || requireBrowser$2().AbortController;
    const {
      codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE },
      AbortError
    } = requireErrors();
    const { validateAbortSignal, validateInteger, validateObject } = requireValidators();
    const kWeakHandler = requirePrimordials().Symbol("kWeak");
    const kResistStopPropagation = requirePrimordials().Symbol("kResistStopPropagation");
    const { finished } = requireEndOfStream();
    const staticCompose = requireCompose();
    const { addAbortSignalNoValidate } = requireAddAbortSignal();
    const { isWritable, isNodeStream } = requireUtils();
    const { deprecate } = requireUtil$3();
    const {
      ArrayPrototypePush,
      Boolean: Boolean2,
      MathFloor,
      Number: Number2,
      NumberIsNaN,
      Promise: Promise2,
      PromiseReject,
      PromiseResolve,
      PromisePrototypeThen,
      Symbol: Symbol2
    } = requirePrimordials();
    const kEmpty = Symbol2("kEmpty");
    const kEof = Symbol2("kEof");
    function compose2(stream2, options) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      if (isNodeStream(stream2) && !isWritable(stream2)) {
        throw new ERR_INVALID_ARG_VALUE("stream", stream2, "must be writable");
      }
      const composedStream = staticCompose(this, stream2);
      if (options !== null && options !== void 0 && options.signal) {
        addAbortSignalNoValidate(options.signal, composedStream);
      }
      return composedStream;
    }
    function map(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      let concurrency = 1;
      if ((options === null || options === void 0 ? void 0 : options.concurrency) != null) {
        concurrency = MathFloor(options.concurrency);
      }
      let highWaterMark = concurrency - 1;
      if ((options === null || options === void 0 ? void 0 : options.highWaterMark) != null) {
        highWaterMark = MathFloor(options.highWaterMark);
      }
      validateInteger(concurrency, "options.concurrency", 1);
      validateInteger(highWaterMark, "options.highWaterMark", 0);
      highWaterMark += concurrency;
      return (async function* map2() {
        const signal = requireUtil$3().AbortSignalAny(
          [options === null || options === void 0 ? void 0 : options.signal].filter(Boolean2)
        );
        const stream2 = this;
        const queue = [];
        const signalOpt = {
          signal
        };
        let next;
        let resume;
        let done = false;
        let cnt = 0;
        function onCatch() {
          done = true;
          afterItemProcessed();
        }
        function afterItemProcessed() {
          cnt -= 1;
          maybeResume();
        }
        function maybeResume() {
          if (resume && !done && cnt < concurrency && queue.length < highWaterMark) {
            resume();
            resume = null;
          }
        }
        async function pump() {
          try {
            for await (let val of stream2) {
              if (done) {
                return;
              }
              if (signal.aborted) {
                throw new AbortError();
              }
              try {
                val = fn(val, signalOpt);
                if (val === kEmpty) {
                  continue;
                }
                val = PromiseResolve(val);
              } catch (err) {
                val = PromiseReject(err);
              }
              cnt += 1;
              PromisePrototypeThen(val, afterItemProcessed, onCatch);
              queue.push(val);
              if (next) {
                next();
                next = null;
              }
              if (!done && (queue.length >= highWaterMark || cnt >= concurrency)) {
                await new Promise2((resolve) => {
                  resume = resolve;
                });
              }
            }
            queue.push(kEof);
          } catch (err) {
            const val = PromiseReject(err);
            PromisePrototypeThen(val, afterItemProcessed, onCatch);
            queue.push(val);
          } finally {
            done = true;
            if (next) {
              next();
              next = null;
            }
          }
        }
        pump();
        try {
          while (true) {
            while (queue.length > 0) {
              const val = await queue[0];
              if (val === kEof) {
                return;
              }
              if (signal.aborted) {
                throw new AbortError();
              }
              if (val !== kEmpty) {
                yield val;
              }
              queue.shift();
              maybeResume();
            }
            await new Promise2((resolve) => {
              next = resolve;
            });
          }
        } finally {
          done = true;
          if (resume) {
            resume();
            resume = null;
          }
        }
      }).call(this);
    }
    function asIndexedPairs(options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      return (async function* asIndexedPairs2() {
        let index = 0;
        for await (const val of this) {
          var _options$signal;
          if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) {
            throw new AbortError({
              cause: options.signal.reason
            });
          }
          yield [index++, val];
        }
      }).call(this);
    }
    async function some(fn, options = void 0) {
      for await (const unused of filter.call(this, fn, options)) {
        return true;
      }
      return false;
    }
    async function every(fn, options = void 0) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      return !await some.call(
        this,
        async (...args) => {
          return !await fn(...args);
        },
        options
      );
    }
    async function find(fn, options) {
      for await (const result of filter.call(this, fn, options)) {
        return result;
      }
      return void 0;
    }
    async function forEach(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      async function forEachFn(value, options2) {
        await fn(value, options2);
        return kEmpty;
      }
      for await (const unused of map.call(this, forEachFn, options)) ;
    }
    function filter(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      async function filterFn(value, options2) {
        if (await fn(value, options2)) {
          return value;
        }
        return kEmpty;
      }
      return map.call(this, filterFn, options);
    }
    class ReduceAwareErrMissingArgs extends ERR_MISSING_ARGS {
      constructor() {
        super("reduce");
        this.message = "Reduce of an empty stream requires an initial value";
      }
    }
    async function reduce(reducer, initialValue, options) {
      var _options$signal2;
      if (typeof reducer !== "function") {
        throw new ERR_INVALID_ARG_TYPE("reducer", ["Function", "AsyncFunction"], reducer);
      }
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      let hasInitialValue = arguments.length > 1;
      if (options !== null && options !== void 0 && (_options$signal2 = options.signal) !== null && _options$signal2 !== void 0 && _options$signal2.aborted) {
        const err = new AbortError(void 0, {
          cause: options.signal.reason
        });
        this.once("error", () => {
        });
        await finished(this.destroy(err));
        throw err;
      }
      const ac = new AbortController();
      const signal = ac.signal;
      if (options !== null && options !== void 0 && options.signal) {
        const opts = {
          once: true,
          [kWeakHandler]: this,
          [kResistStopPropagation]: true
        };
        options.signal.addEventListener("abort", () => ac.abort(), opts);
      }
      let gotAnyItemFromStream = false;
      try {
        for await (const value of this) {
          var _options$signal3;
          gotAnyItemFromStream = true;
          if (options !== null && options !== void 0 && (_options$signal3 = options.signal) !== null && _options$signal3 !== void 0 && _options$signal3.aborted) {
            throw new AbortError();
          }
          if (!hasInitialValue) {
            initialValue = value;
            hasInitialValue = true;
          } else {
            initialValue = await reducer(initialValue, value, {
              signal
            });
          }
        }
        if (!gotAnyItemFromStream && !hasInitialValue) {
          throw new ReduceAwareErrMissingArgs();
        }
      } finally {
        ac.abort();
      }
      return initialValue;
    }
    async function toArray(options) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      const result = [];
      for await (const val of this) {
        var _options$signal4;
        if (options !== null && options !== void 0 && (_options$signal4 = options.signal) !== null && _options$signal4 !== void 0 && _options$signal4.aborted) {
          throw new AbortError(void 0, {
            cause: options.signal.reason
          });
        }
        ArrayPrototypePush(result, val);
      }
      return result;
    }
    function flatMap(fn, options) {
      const values = map.call(this, fn, options);
      return (async function* flatMap2() {
        for await (const val of values) {
          yield* val;
        }
      }).call(this);
    }
    function toIntegerOrInfinity(number) {
      number = Number2(number);
      if (NumberIsNaN(number)) {
        return 0;
      }
      if (number < 0) {
        throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
      }
      return number;
    }
    function drop(number, options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      number = toIntegerOrInfinity(number);
      return (async function* drop2() {
        var _options$signal5;
        if (options !== null && options !== void 0 && (_options$signal5 = options.signal) !== null && _options$signal5 !== void 0 && _options$signal5.aborted) {
          throw new AbortError();
        }
        for await (const val of this) {
          var _options$signal6;
          if (options !== null && options !== void 0 && (_options$signal6 = options.signal) !== null && _options$signal6 !== void 0 && _options$signal6.aborted) {
            throw new AbortError();
          }
          if (number-- <= 0) {
            yield val;
          }
        }
      }).call(this);
    }
    function take(number, options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      number = toIntegerOrInfinity(number);
      return (async function* take2() {
        var _options$signal7;
        if (options !== null && options !== void 0 && (_options$signal7 = options.signal) !== null && _options$signal7 !== void 0 && _options$signal7.aborted) {
          throw new AbortError();
        }
        for await (const val of this) {
          var _options$signal8;
          if (options !== null && options !== void 0 && (_options$signal8 = options.signal) !== null && _options$signal8 !== void 0 && _options$signal8.aborted) {
            throw new AbortError();
          }
          if (number-- > 0) {
            yield val;
          }
          if (number <= 0) {
            return;
          }
        }
      }).call(this);
    }
    operators.streamReturningOperators = {
      asIndexedPairs: deprecate(asIndexedPairs, "readable.asIndexedPairs will be removed in a future version."),
      drop,
      filter,
      flatMap,
      map,
      take,
      compose: compose2
    };
    operators.promiseReturningOperators = {
      every,
      forEach,
      reduce,
      toArray,
      some,
      find
    };
    return operators;
  }
  var promises;
  var hasRequiredPromises;
  function requirePromises() {
    if (hasRequiredPromises) return promises;
    hasRequiredPromises = 1;
    const { ArrayPrototypePop, Promise: Promise2 } = requirePrimordials();
    const { isIterable, isNodeStream, isWebStream } = requireUtils();
    const { pipelineImpl: pl } = requirePipeline();
    const { finished } = requireEndOfStream();
    requireStream();
    function pipeline(...streams) {
      return new Promise2((resolve, reject) => {
        let signal;
        let end;
        const lastArg = streams[streams.length - 1];
        if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
          const options = ArrayPrototypePop(streams);
          signal = options.signal;
          end = options.end;
        }
        pl(
          streams,
          (err, value) => {
            if (err) {
              reject(err);
            } else {
              resolve(value);
            }
          },
          {
            signal,
            end
          }
        );
      });
    }
    promises = {
      finished,
      pipeline
    };
    return promises;
  }
  var hasRequiredStream;
  function requireStream() {
    if (hasRequiredStream) return stream.exports;
    hasRequiredStream = 1;
    const { Buffer: Buffer2 } = requireBuffer();
    const { ObjectDefineProperty, ObjectKeys, ReflectApply } = requirePrimordials();
    const {
      promisify: { custom: customPromisify }
    } = requireUtil$3();
    const { streamReturningOperators, promiseReturningOperators } = requireOperators();
    const {
      codes: { ERR_ILLEGAL_CONSTRUCTOR }
    } = requireErrors();
    const compose2 = requireCompose();
    const { setDefaultHighWaterMark, getDefaultHighWaterMark } = requireState();
    const { pipeline } = requirePipeline();
    const { destroyer } = requireDestroy();
    const eos = requireEndOfStream();
    const promises2 = requirePromises();
    const utils2 = requireUtils();
    const Stream = stream.exports = requireLegacy().Stream;
    Stream.isDestroyed = utils2.isDestroyed;
    Stream.isDisturbed = utils2.isDisturbed;
    Stream.isErrored = utils2.isErrored;
    Stream.isReadable = utils2.isReadable;
    Stream.isWritable = utils2.isWritable;
    Stream.Readable = requireReadable();
    for (const key of ObjectKeys(streamReturningOperators)) {
      let fn = function(...args) {
        if (new.target) {
          throw ERR_ILLEGAL_CONSTRUCTOR();
        }
        return Stream.Readable.from(ReflectApply(op, this, args));
      };
      const op = streamReturningOperators[key];
      ObjectDefineProperty(fn, "name", {
        __proto__: null,
        value: op.name
      });
      ObjectDefineProperty(fn, "length", {
        __proto__: null,
        value: op.length
      });
      ObjectDefineProperty(Stream.Readable.prototype, key, {
        __proto__: null,
        value: fn,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    for (const key of ObjectKeys(promiseReturningOperators)) {
      let fn = function(...args) {
        if (new.target) {
          throw ERR_ILLEGAL_CONSTRUCTOR();
        }
        return ReflectApply(op, this, args);
      };
      const op = promiseReturningOperators[key];
      ObjectDefineProperty(fn, "name", {
        __proto__: null,
        value: op.name
      });
      ObjectDefineProperty(fn, "length", {
        __proto__: null,
        value: op.length
      });
      ObjectDefineProperty(Stream.Readable.prototype, key, {
        __proto__: null,
        value: fn,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    Stream.Writable = requireWritable();
    Stream.Duplex = requireDuplex();
    Stream.Transform = requireTransform();
    Stream.PassThrough = requirePassthrough();
    Stream.pipeline = pipeline;
    const { addAbortSignal: addAbortSignal2 } = requireAddAbortSignal();
    Stream.addAbortSignal = addAbortSignal2;
    Stream.finished = eos;
    Stream.destroy = destroyer;
    Stream.compose = compose2;
    Stream.setDefaultHighWaterMark = setDefaultHighWaterMark;
    Stream.getDefaultHighWaterMark = getDefaultHighWaterMark;
    ObjectDefineProperty(Stream, "promises", {
      __proto__: null,
      configurable: true,
      enumerable: true,
      get() {
        return promises2;
      }
    });
    ObjectDefineProperty(pipeline, customPromisify, {
      __proto__: null,
      enumerable: true,
      get() {
        return promises2.pipeline;
      }
    });
    ObjectDefineProperty(eos, customPromisify, {
      __proto__: null,
      enumerable: true,
      get() {
        return promises2.finished;
      }
    });
    Stream.Stream = Stream;
    Stream._isUint8Array = function isUint8Array(value) {
      return value instanceof Uint8Array;
    };
    Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    };
    return stream.exports;
  }
  var hasRequiredBrowser;
  function requireBrowser() {
    if (hasRequiredBrowser) return browser$2.exports;
    hasRequiredBrowser = 1;
    (function(module2) {
      const CustomStream = requireStream();
      const promises2 = requirePromises();
      const originalDestroy = CustomStream.Readable.destroy;
      module2.exports = CustomStream.Readable;
      module2.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
      module2.exports._isUint8Array = CustomStream._isUint8Array;
      module2.exports.isDisturbed = CustomStream.isDisturbed;
      module2.exports.isErrored = CustomStream.isErrored;
      module2.exports.isReadable = CustomStream.isReadable;
      module2.exports.Readable = CustomStream.Readable;
      module2.exports.Writable = CustomStream.Writable;
      module2.exports.Duplex = CustomStream.Duplex;
      module2.exports.Transform = CustomStream.Transform;
      module2.exports.PassThrough = CustomStream.PassThrough;
      module2.exports.addAbortSignal = CustomStream.addAbortSignal;
      module2.exports.finished = CustomStream.finished;
      module2.exports.destroy = CustomStream.destroy;
      module2.exports.destroy = originalDestroy;
      module2.exports.pipeline = CustomStream.pipeline;
      module2.exports.compose = CustomStream.compose;
      Object.defineProperty(CustomStream, "promises", {
        configurable: true,
        enumerable: true,
        get() {
          return promises2;
        }
      });
      module2.exports.Stream = CustomStream.Stream;
      module2.exports.default = module2.exports;
    })(browser$2);
    return browser$2.exports;
  }
  var rdfxmlStreamingParser = {};
  var RdfXmlParser = {};
  var relativeToAbsoluteIri = {};
  var Resolve = {};
  var hasRequiredResolve;
  function requireResolve() {
    if (hasRequiredResolve) return Resolve;
    hasRequiredResolve = 1;
    Object.defineProperty(Resolve, "__esModule", { value: true });
    Resolve.removeDotSegmentsOfPath = Resolve.removeDotSegments = Resolve.resolve = void 0;
    function resolve(relativeIRI, baseIRI) {
      baseIRI = baseIRI || "";
      const baseFragmentPos = baseIRI.indexOf("#");
      if (baseFragmentPos > 0) {
        baseIRI = baseIRI.substr(0, baseFragmentPos);
      }
      if (!relativeIRI.length) {
        if (baseIRI.indexOf(":") < 0) {
          throw new Error(`Found invalid baseIRI '${baseIRI}' for value '${relativeIRI}'`);
        }
        return baseIRI;
      }
      if (relativeIRI.startsWith("?")) {
        const baseQueryPos = baseIRI.indexOf("?");
        if (baseQueryPos > 0) {
          baseIRI = baseIRI.substr(0, baseQueryPos);
        }
        return baseIRI + relativeIRI;
      }
      if (relativeIRI.startsWith("#")) {
        return baseIRI + relativeIRI;
      }
      if (!baseIRI.length) {
        const relativeColonPos = relativeIRI.indexOf(":");
        if (relativeColonPos < 0) {
          throw new Error(`Found invalid relative IRI '${relativeIRI}' for a missing baseIRI`);
        }
        return removeDotSegmentsOfPath(relativeIRI, relativeColonPos);
      }
      const valueColonPos = relativeIRI.indexOf(":");
      if (valueColonPos >= 0) {
        const valueSlashPos = relativeIRI.indexOf("/");
        if (valueSlashPos < 0 || valueColonPos < valueSlashPos) {
          return removeDotSegmentsOfPath(relativeIRI, valueColonPos);
        }
      }
      const baseColonPos = baseIRI.indexOf(":");
      if (baseColonPos < 0) {
        throw new Error(`Found invalid baseIRI '${baseIRI}' for value '${relativeIRI}'`);
      }
      const baseIRIScheme = baseIRI.substr(0, baseColonPos + 1);
      if (relativeIRI.indexOf("//") === 0) {
        return baseIRIScheme + removeDotSegmentsOfPath(relativeIRI, valueColonPos);
      }
      let baseSlashAfterColonPos;
      if (baseIRI.indexOf("//", baseColonPos) === baseColonPos + 1) {
        baseSlashAfterColonPos = baseIRI.indexOf("/", baseColonPos + 3);
        if (baseSlashAfterColonPos < 0) {
          if (baseIRI.length > baseColonPos + 3) {
            return baseIRI + "/" + removeDotSegmentsOfPath(relativeIRI, valueColonPos);
          } else {
            return baseIRIScheme + removeDotSegmentsOfPath(relativeIRI, valueColonPos);
          }
        }
      } else {
        baseSlashAfterColonPos = baseIRI.indexOf("/", baseColonPos + 1);
        if (baseSlashAfterColonPos < 0) {
          return baseIRIScheme + removeDotSegmentsOfPath(relativeIRI, valueColonPos);
        }
      }
      if (relativeIRI.indexOf("/") === 0) {
        return baseIRI.substr(0, baseSlashAfterColonPos) + removeDotSegments(relativeIRI);
      }
      let baseIRIPath = baseIRI.substr(baseSlashAfterColonPos);
      const baseIRILastSlashPos = baseIRIPath.lastIndexOf("/");
      if (baseIRILastSlashPos >= 0 && baseIRILastSlashPos < baseIRIPath.length - 1) {
        baseIRIPath = baseIRIPath.substr(0, baseIRILastSlashPos + 1);
        if (relativeIRI[0] === "." && relativeIRI[1] !== "." && relativeIRI[1] !== "/" && relativeIRI[2]) {
          relativeIRI = relativeIRI.substr(1);
        }
      }
      relativeIRI = baseIRIPath + relativeIRI;
      relativeIRI = removeDotSegments(relativeIRI);
      return baseIRI.substr(0, baseSlashAfterColonPos) + relativeIRI;
    }
    Resolve.resolve = resolve;
    function removeDotSegments(path) {
      const segmentBuffers = [];
      let i = 0;
      while (i < path.length) {
        switch (path[i]) {
          case "/":
            if (path[i + 1] === ".") {
              if (path[i + 2] === ".") {
                if (!isCharacterAllowedAfterRelativePathSegment(path[i + 3])) {
                  segmentBuffers.push([]);
                  i++;
                  break;
                }
                segmentBuffers.pop();
                if (!path[i + 3]) {
                  segmentBuffers.push([]);
                }
                i += 3;
              } else {
                if (!isCharacterAllowedAfterRelativePathSegment(path[i + 2])) {
                  segmentBuffers.push([]);
                  i++;
                  break;
                }
                if (!path[i + 2]) {
                  segmentBuffers.push([]);
                }
                i += 2;
              }
            } else {
              segmentBuffers.push([]);
              i++;
            }
            break;
          case "#":
          case "?":
            if (!segmentBuffers.length) {
              segmentBuffers.push([]);
            }
            segmentBuffers[segmentBuffers.length - 1].push(path.substr(i));
            i = path.length;
            break;
          default:
            if (!segmentBuffers.length) {
              segmentBuffers.push([]);
            }
            segmentBuffers[segmentBuffers.length - 1].push(path[i]);
            i++;
            break;
        }
      }
      return "/" + segmentBuffers.map((buffer2) => buffer2.join("")).join("/");
    }
    Resolve.removeDotSegments = removeDotSegments;
    function removeDotSegmentsOfPath(iri, colonPosition) {
      let searchOffset = colonPosition + 1;
      if (colonPosition >= 0) {
        if (iri[colonPosition + 1] === "/" && iri[colonPosition + 2] === "/") {
          searchOffset = colonPosition + 3;
        }
      } else {
        if (iri[0] === "/" && iri[1] === "/") {
          searchOffset = 2;
        }
      }
      const pathSeparator = iri.indexOf("/", searchOffset);
      if (pathSeparator < 0) {
        return iri;
      }
      const base = iri.substr(0, pathSeparator);
      const path = iri.substr(pathSeparator);
      return base + removeDotSegments(path);
    }
    Resolve.removeDotSegmentsOfPath = removeDotSegmentsOfPath;
    function isCharacterAllowedAfterRelativePathSegment(character) {
      return !character || character === "#" || character === "?" || character === "/";
    }
    return Resolve;
  }
  var hasRequiredRelativeToAbsoluteIri;
  function requireRelativeToAbsoluteIri() {
    if (hasRequiredRelativeToAbsoluteIri) return relativeToAbsoluteIri;
    hasRequiredRelativeToAbsoluteIri = 1;
    (function(exports$1) {
      var __createBinding = relativeToAbsoluteIri && relativeToAbsoluteIri.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = relativeToAbsoluteIri && relativeToAbsoluteIri.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(requireResolve(), exports$1);
    })(relativeToAbsoluteIri);
    return relativeToAbsoluteIri;
  }
  var saxes = {};
  var ed5 = {};
  var hasRequiredEd5;
  function requireEd5() {
    if (hasRequiredEd5) return ed5;
    hasRequiredEd5 = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.CHAR = "	\n\r -퟿-�𐀀-􏿿";
      exports$1.S = " 	\r\n";
      exports$1.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
      exports$1.NAME_CHAR = "-" + exports$1.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
      exports$1.CHAR_RE = new RegExp("^[" + exports$1.CHAR + "]$", "u");
      exports$1.S_RE = new RegExp("^[" + exports$1.S + "]+$", "u");
      exports$1.NAME_START_CHAR_RE = new RegExp("^[" + exports$1.NAME_START_CHAR + "]$", "u");
      exports$1.NAME_CHAR_RE = new RegExp("^[" + exports$1.NAME_CHAR + "]$", "u");
      exports$1.NAME_RE = new RegExp("^[" + exports$1.NAME_START_CHAR + "][" + exports$1.NAME_CHAR + "]*$", "u");
      exports$1.NMTOKEN_RE = new RegExp("^[" + exports$1.NAME_CHAR + "]+$", "u");
      var TAB = 9;
      var NL = 10;
      var CR = 13;
      var SPACE = 32;
      exports$1.S_LIST = [SPACE, NL, CR, TAB];
      function isChar(c) {
        return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
      }
      exports$1.isChar = isChar;
      function isS(c) {
        return c === SPACE || c === NL || c === CR || c === TAB;
      }
      exports$1.isS = isS;
      function isNameStartChar(c) {
        return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
      }
      exports$1.isNameStartChar = isNameStartChar;
      function isNameChar(c) {
        return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
      }
      exports$1.isNameChar = isNameChar;
    })(ed5);
    return ed5;
  }
  var ed2 = {};
  var hasRequiredEd2;
  function requireEd2() {
    if (hasRequiredEd2) return ed2;
    hasRequiredEd2 = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.CHAR = "-퟿-�𐀀-􏿿";
      exports$1.RESTRICTED_CHAR = "-\b\v\f---";
      exports$1.S = " 	\r\n";
      exports$1.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
      exports$1.NAME_CHAR = "-" + exports$1.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
      exports$1.CHAR_RE = new RegExp("^[" + exports$1.CHAR + "]$", "u");
      exports$1.RESTRICTED_CHAR_RE = new RegExp("^[" + exports$1.RESTRICTED_CHAR + "]$", "u");
      exports$1.S_RE = new RegExp("^[" + exports$1.S + "]+$", "u");
      exports$1.NAME_START_CHAR_RE = new RegExp("^[" + exports$1.NAME_START_CHAR + "]$", "u");
      exports$1.NAME_CHAR_RE = new RegExp("^[" + exports$1.NAME_CHAR + "]$", "u");
      exports$1.NAME_RE = new RegExp("^[" + exports$1.NAME_START_CHAR + "][" + exports$1.NAME_CHAR + "]*$", "u");
      exports$1.NMTOKEN_RE = new RegExp("^[" + exports$1.NAME_CHAR + "]+$", "u");
      var TAB = 9;
      var NL = 10;
      var CR = 13;
      var SPACE = 32;
      exports$1.S_LIST = [SPACE, NL, CR, TAB];
      function isChar(c) {
        return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
      }
      exports$1.isChar = isChar;
      function isRestrictedChar(c) {
        return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
      }
      exports$1.isRestrictedChar = isRestrictedChar;
      function isCharAndNotRestricted(c) {
        return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
      }
      exports$1.isCharAndNotRestricted = isCharAndNotRestricted;
      function isS(c) {
        return c === SPACE || c === NL || c === CR || c === TAB;
      }
      exports$1.isS = isS;
      function isNameStartChar(c) {
        return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
      }
      exports$1.isNameStartChar = isNameStartChar;
      function isNameChar(c) {
        return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
      }
      exports$1.isNameChar = isNameChar;
    })(ed2);
    return ed2;
  }
  var ed3 = {};
  var hasRequiredEd3;
  function requireEd3() {
    if (hasRequiredEd3) return ed3;
    hasRequiredEd3 = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.NC_NAME_START_CHAR = "A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
      exports$1.NC_NAME_CHAR = "-" + exports$1.NC_NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
      exports$1.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports$1.NC_NAME_START_CHAR + "]$", "u");
      exports$1.NC_NAME_CHAR_RE = new RegExp("^[" + exports$1.NC_NAME_CHAR + "]$", "u");
      exports$1.NC_NAME_RE = new RegExp("^[" + exports$1.NC_NAME_START_CHAR + "][" + exports$1.NC_NAME_CHAR + "]*$", "u");
      function isNCNameStartChar(c) {
        return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
      }
      exports$1.isNCNameStartChar = isNCNameStartChar;
      function isNCNameChar(c) {
        return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
      }
      exports$1.isNCNameChar = isNCNameChar;
    })(ed3);
    return ed3;
  }
  var hasRequiredSaxes;
  function requireSaxes() {
    if (hasRequiredSaxes) return saxes;
    hasRequiredSaxes = 1;
    Object.defineProperty(saxes, "__esModule", { value: true });
    saxes.SaxesParser = saxes.EVENTS = void 0;
    const ed52 = requireEd5();
    const ed22 = requireEd2();
    const NSed3 = requireEd3();
    var isS = ed52.isS;
    var isChar10 = ed52.isChar;
    var isNameStartChar = ed52.isNameStartChar;
    var isNameChar = ed52.isNameChar;
    var S_LIST = ed52.S_LIST;
    var NAME_RE = ed52.NAME_RE;
    var isChar11 = ed22.isChar;
    var isNCNameStartChar = NSed3.isNCNameStartChar;
    var isNCNameChar = NSed3.isNCNameChar;
    var NC_NAME_RE = NSed3.NC_NAME_RE;
    const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
    const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
    const rootNS = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      xml: XML_NAMESPACE,
      xmlns: XMLNS_NAMESPACE
    };
    const XML_ENTITIES = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    };
    const EOC = -1;
    const NL_LIKE = -2;
    const S_BEGIN = 0;
    const S_BEGIN_WHITESPACE = 1;
    const S_DOCTYPE = 2;
    const S_DOCTYPE_QUOTE = 3;
    const S_DTD = 4;
    const S_DTD_QUOTED = 5;
    const S_DTD_OPEN_WAKA = 6;
    const S_DTD_OPEN_WAKA_BANG = 7;
    const S_DTD_COMMENT = 8;
    const S_DTD_COMMENT_ENDING = 9;
    const S_DTD_COMMENT_ENDED = 10;
    const S_DTD_PI = 11;
    const S_DTD_PI_ENDING = 12;
    const S_TEXT = 13;
    const S_ENTITY = 14;
    const S_OPEN_WAKA = 15;
    const S_OPEN_WAKA_BANG = 16;
    const S_COMMENT = 17;
    const S_COMMENT_ENDING = 18;
    const S_COMMENT_ENDED = 19;
    const S_CDATA = 20;
    const S_CDATA_ENDING = 21;
    const S_CDATA_ENDING_2 = 22;
    const S_PI_FIRST_CHAR = 23;
    const S_PI_REST = 24;
    const S_PI_BODY = 25;
    const S_PI_ENDING = 26;
    const S_XML_DECL_NAME_START = 27;
    const S_XML_DECL_NAME = 28;
    const S_XML_DECL_EQ = 29;
    const S_XML_DECL_VALUE_START = 30;
    const S_XML_DECL_VALUE = 31;
    const S_XML_DECL_SEPARATOR = 32;
    const S_XML_DECL_ENDING = 33;
    const S_OPEN_TAG = 34;
    const S_OPEN_TAG_SLASH = 35;
    const S_ATTRIB = 36;
    const S_ATTRIB_NAME = 37;
    const S_ATTRIB_NAME_SAW_WHITE = 38;
    const S_ATTRIB_VALUE = 39;
    const S_ATTRIB_VALUE_QUOTED = 40;
    const S_ATTRIB_VALUE_CLOSED = 41;
    const S_ATTRIB_VALUE_UNQUOTED = 42;
    const S_CLOSE_TAG = 43;
    const S_CLOSE_TAG_SAW_WHITE = 44;
    const TAB = 9;
    const NL = 10;
    const CR = 13;
    const SPACE = 32;
    const BANG = 33;
    const DQUOTE = 34;
    const AMP = 38;
    const SQUOTE = 39;
    const MINUS = 45;
    const FORWARD_SLASH = 47;
    const SEMICOLON = 59;
    const LESS = 60;
    const EQUAL = 61;
    const GREATER = 62;
    const QUESTION = 63;
    const OPEN_BRACKET = 91;
    const CLOSE_BRACKET = 93;
    const NEL = 133;
    const LS = 8232;
    const isQuote = (c) => c === DQUOTE || c === SQUOTE;
    const QUOTES = [DQUOTE, SQUOTE];
    const DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
    const DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
    const XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
    const ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
    function nsPairCheck(parser, prefix, uri) {
      switch (prefix) {
        case "xml":
          if (uri !== XML_NAMESPACE) {
            parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
          }
          break;
        case "xmlns":
          if (uri !== XMLNS_NAMESPACE) {
            parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
          }
          break;
      }
      switch (uri) {
        case XMLNS_NAMESPACE:
          parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
          break;
        case XML_NAMESPACE:
          switch (prefix) {
            case "xml":
              break;
            case "":
              parser.fail(`the default namespace may not be set to ${uri}.`);
              break;
            default:
              parser.fail("may not assign the xml namespace to another prefix.");
          }
          break;
      }
    }
    function nsMappingCheck(parser, mapping) {
      for (const local of Object.keys(mapping)) {
        nsPairCheck(parser, local, mapping[local]);
      }
    }
    const isNCName = (name) => NC_NAME_RE.test(name);
    const isName = (name) => NAME_RE.test(name);
    const FORBIDDEN_START = 0;
    const FORBIDDEN_BRACKET = 1;
    const FORBIDDEN_BRACKET_BRACKET = 2;
    saxes.EVENTS = [
      "xmldecl",
      "text",
      "processinginstruction",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "cdata",
      "error",
      "end",
      "ready"
    ];
    const EVENT_NAME_TO_HANDLER_NAME = {
      xmldecl: "xmldeclHandler",
      text: "textHandler",
      processinginstruction: "piHandler",
      doctype: "doctypeHandler",
      comment: "commentHandler",
      opentagstart: "openTagStartHandler",
      attribute: "attributeHandler",
      opentag: "openTagHandler",
      closetag: "closeTagHandler",
      cdata: "cdataHandler",
      error: "errorHandler",
      end: "endHandler",
      ready: "readyHandler"
    };
    class SaxesParser {
      /**
       * Indicates whether or not the parser is closed. If ``true``, wait for
       * the ``ready`` event to write again.
       */
      get closed() {
        return this._closed;
      }
      /**
       * @param opt The parser options.
       */
      constructor(opt) {
        this.opt = opt !== null && opt !== void 0 ? opt : {};
        this.fragmentOpt = !!this.opt.fragment;
        const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
        this.trackPosition = this.opt.position !== false;
        this.fileName = this.opt.fileName;
        if (xmlnsOpt) {
          this.nameStartCheck = isNCNameStartChar;
          this.nameCheck = isNCNameChar;
          this.isName = isNCName;
          this.processAttribs = this.processAttribsNS;
          this.pushAttrib = this.pushAttribNS;
          this.ns = Object.assign({ __proto__: null }, rootNS);
          const additional = this.opt.additionalNamespaces;
          if (additional != null) {
            nsMappingCheck(this, additional);
            Object.assign(this.ns, additional);
          }
        } else {
          this.nameStartCheck = isNameStartChar;
          this.nameCheck = isNameChar;
          this.isName = isName;
          this.processAttribs = this.processAttribsPlain;
          this.pushAttrib = this.pushAttribPlain;
        }
        this.stateTable = [
          /* eslint-disable @typescript-eslint/unbound-method */
          this.sBegin,
          this.sBeginWhitespace,
          this.sDoctype,
          this.sDoctypeQuote,
          this.sDTD,
          this.sDTDQuoted,
          this.sDTDOpenWaka,
          this.sDTDOpenWakaBang,
          this.sDTDComment,
          this.sDTDCommentEnding,
          this.sDTDCommentEnded,
          this.sDTDPI,
          this.sDTDPIEnding,
          this.sText,
          this.sEntity,
          this.sOpenWaka,
          this.sOpenWakaBang,
          this.sComment,
          this.sCommentEnding,
          this.sCommentEnded,
          this.sCData,
          this.sCDataEnding,
          this.sCDataEnding2,
          this.sPIFirstChar,
          this.sPIRest,
          this.sPIBody,
          this.sPIEnding,
          this.sXMLDeclNameStart,
          this.sXMLDeclName,
          this.sXMLDeclEq,
          this.sXMLDeclValueStart,
          this.sXMLDeclValue,
          this.sXMLDeclSeparator,
          this.sXMLDeclEnding,
          this.sOpenTag,
          this.sOpenTagSlash,
          this.sAttrib,
          this.sAttribName,
          this.sAttribNameSawWhite,
          this.sAttribValue,
          this.sAttribValueQuoted,
          this.sAttribValueClosed,
          this.sAttribValueUnquoted,
          this.sCloseTag,
          this.sCloseTagSawWhite
          /* eslint-enable @typescript-eslint/unbound-method */
        ];
        this._init();
      }
      _init() {
        var _a;
        this.openWakaBang = "";
        this.text = "";
        this.name = "";
        this.piTarget = "";
        this.entity = "";
        this.q = null;
        this.tags = [];
        this.tag = null;
        this.topNS = null;
        this.chunk = "";
        this.chunkPosition = 0;
        this.i = 0;
        this.prevI = 0;
        this.carriedFromPrevious = void 0;
        this.forbiddenState = FORBIDDEN_START;
        this.attribList = [];
        const { fragmentOpt } = this;
        this.state = fragmentOpt ? S_TEXT : S_BEGIN;
        this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
        this.xmlDeclPossible = !fragmentOpt;
        this.xmlDeclExpects = ["version"];
        this.entityReturnState = void 0;
        let { defaultXMLVersion } = this.opt;
        if (defaultXMLVersion === void 0) {
          if (this.opt.forceXMLVersion === true) {
            throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
          }
          defaultXMLVersion = "1.0";
        }
        this.setXMLVersion(defaultXMLVersion);
        this.positionAtNewLine = 0;
        this.doctype = false;
        this._closed = false;
        this.xmlDecl = {
          version: void 0,
          encoding: void 0,
          standalone: void 0
        };
        this.line = 1;
        this.column = 0;
        this.ENTITIES = Object.create(XML_ENTITIES);
        (_a = this.readyHandler) === null || _a === void 0 ? void 0 : _a.call(this);
      }
      /**
       * The stream position the parser is currently looking at. This field is
       * zero-based.
       *
       * This field is not based on counting Unicode characters but is to be
       * interpreted as a plain index into a JavaScript string.
       */
      get position() {
        return this.chunkPosition + this.i;
      }
      /**
       * The column number of the next character to be read by the parser.  *
       * This field is zero-based. (The first column in a line is 0.)
       *
       * This field reports the index at which the next character would be in the
       * line if the line were represented as a JavaScript string.  Note that this
       * *can* be different to a count based on the number of *Unicode characters*
       * due to how JavaScript handles astral plane characters.
       *
       * See [[column]] for a number that corresponds to a count of Unicode
       * characters.
       */
      get columnIndex() {
        return this.position - this.positionAtNewLine;
      }
      /**
       * Set an event listener on an event. The parser supports one handler per
       * event type. If you try to set an event handler over an existing handler,
       * the old handler is silently overwritten.
       *
       * @param name The event to listen to.
       *
       * @param handler The handler to set.
       */
      on(name, handler) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
      }
      /**
       * Unset an event handler.
       *
       * @parma name The event to stop listening to.
       */
      off(name) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
      }
      /**
       * Make an error object. The error object will have a message that contains
       * the ``fileName`` option passed at the creation of the parser. If position
       * tracking was turned on, it will also have line and column number
       * information.
       *
       * @param message The message describing the error to report.
       *
       * @returns An error object with a properly formatted message.
       */
      makeError(message) {
        var _a;
        let msg = (_a = this.fileName) !== null && _a !== void 0 ? _a : "";
        if (this.trackPosition) {
          if (msg.length > 0) {
            msg += ":";
          }
          msg += `${this.line}:${this.column}`;
        }
        if (msg.length > 0) {
          msg += ": ";
        }
        return new Error(msg + message);
      }
      /**
       * Report a parsing error. This method is made public so that client code may
       * check for issues that are outside the scope of this project and can report
       * errors.
       *
       * @param message The error to report.
       *
       * @returns this
       */
      fail(message) {
        const err = this.makeError(message);
        const handler = this.errorHandler;
        if (handler === void 0) {
          throw err;
        } else {
          handler(err);
        }
        return this;
      }
      /**
       * Write a XML data to the parser.
       *
       * @param chunk The XML data to write.
       *
       * @returns this
       */
      // We do need object for the type here. Yes, it often causes problems
      // but not in this case.
      write(chunk) {
        if (this.closed) {
          return this.fail("cannot write after close; assign an onready handler.");
        }
        let end = false;
        if (chunk === null) {
          end = true;
          chunk = "";
        } else if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        if (this.carriedFromPrevious !== void 0) {
          chunk = `${this.carriedFromPrevious}${chunk}`;
          this.carriedFromPrevious = void 0;
        }
        let limit = chunk.length;
        const lastCode = chunk.charCodeAt(limit - 1);
        if (!end && // A trailing CR or surrogate must be carried over to the next
        // chunk.
        (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
          this.carriedFromPrevious = chunk[limit - 1];
          limit--;
          chunk = chunk.slice(0, limit);
        }
        const { stateTable } = this;
        this.chunk = chunk;
        this.i = 0;
        while (this.i < limit) {
          stateTable[this.state].call(this);
        }
        this.chunkPosition += limit;
        return end ? this.end() : this;
      }
      /**
       * Close the current stream. Perform final well-formedness checks and reset
       * the parser tstate.
       *
       * @returns this
       */
      close() {
        return this.write(null);
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.0.
       *
       * @returns The character read.
       */
      getCode10() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code >= SPACE || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR:
              if (chunk.charCodeAt(i + 1) === NL) {
                this.i = i + 2;
              }
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.1.
       *
       * @returns {number} The character read.
       */
      getCode11() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR: {
              const next = chunk.charCodeAt(i + 1);
              if (next === NL || next === NEL) {
                this.i = i + 2;
              }
            }
            /* yes, fall through */
            case NEL:
            // 0x85
            case LS:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Like ``getCode`` but with the return value normalized so that ``NL`` is
       * returned for ``NL_LIKE``.
       */
      getCodeNorm() {
        const c = this.getCode();
        return c === NL_LIKE ? NL : c;
      }
      unget() {
        this.i = this.prevI;
        this.column--;
      }
      /**
       * Capture characters into a buffer until encountering one of a set of
       * characters.
       *
       * @param chars An array of codepoints. Encountering a character in the array
       * ends the capture. (``chars`` may safely contain ``NL``.)
       *
       * @return The character code that made the capture end, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureTo(chars) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          const c = this.getCode();
          const isNLLike = c === NL_LIKE;
          const final = isNLLike ? NL : c;
          if (final === EOC || chars.includes(final)) {
            this.text += chunk.slice(start, this.prevI);
            return final;
          }
          if (isNLLike) {
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
          }
        }
      }
      /**
       * Capture characters into a buffer until encountering a character.
       *
       * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
       * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
       *
       * @return ``true`` if we ran into the character. Otherwise, we ran into the
       * end of the current chunk.
       */
      captureToChar(char) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          let c = this.getCode();
          switch (c) {
            case NL_LIKE:
              this.text += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              c = NL;
              break;
            case EOC:
              this.text += chunk.slice(start);
              return false;
          }
          if (c === char) {
            this.text += chunk.slice(start, this.prevI);
            return true;
          }
        }
      }
      /**
       * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
       * this parser.
       *
       * @return The character code that made the test fail, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureNameChars() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCode();
          if (c === EOC) {
            this.name += chunk.slice(start);
            return EOC;
          }
          if (!isNameChar(c)) {
            this.name += chunk.slice(start, this.prevI);
            return c === NL_LIKE ? NL : c;
          }
        }
      }
      /**
       * Skip white spaces.
       *
       * @return The character that ended the skip, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      skipSpaces() {
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC || !isS(c)) {
            return c;
          }
        }
      }
      setXMLVersion(version) {
        this.currentXMLVersion = version;
        if (version === "1.0") {
          this.isChar = isChar10;
          this.getCode = this.getCode10;
        } else {
          this.isChar = isChar11;
          this.getCode = this.getCode11;
        }
      }
      // STATE ENGINE METHODS
      // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
      // to be sure never to come back to this state later.
      sBegin() {
        if (this.chunk.charCodeAt(0) === 65279) {
          this.i++;
          this.column++;
        }
        this.state = S_BEGIN_WHITESPACE;
      }
      sBeginWhitespace() {
        const iBefore = this.i;
        const c = this.skipSpaces();
        if (this.prevI !== iBefore) {
          this.xmlDeclPossible = false;
        }
        switch (c) {
          case LESS:
            this.state = S_OPEN_WAKA;
            if (this.text.length !== 0) {
              throw new Error("no-empty text at start");
            }
            break;
          case EOC:
            break;
          default:
            this.unget();
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
      sDoctype() {
        var _a;
        const c = this.captureTo(DOCTYPE_TERMINATOR);
        switch (c) {
          case GREATER: {
            (_a = this.doctypeHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            this.doctype = true;
            break;
          }
          case EOC:
            break;
          default:
            this.text += String.fromCodePoint(c);
            if (c === OPEN_BRACKET) {
              this.state = S_DTD;
            } else if (isQuote(c)) {
              this.state = S_DOCTYPE_QUOTE;
              this.q = c;
            }
        }
      }
      sDoctypeQuote() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.q = null;
          this.state = S_DOCTYPE;
        }
      }
      sDTD() {
        const c = this.captureTo(DTD_TERMINATOR);
        if (c === EOC) {
          return;
        }
        this.text += String.fromCodePoint(c);
        if (c === CLOSE_BRACKET) {
          this.state = S_DOCTYPE;
        } else if (c === LESS) {
          this.state = S_DTD_OPEN_WAKA;
        } else if (isQuote(c)) {
          this.state = S_DTD_QUOTED;
          this.q = c;
        }
      }
      sDTDQuoted() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.state = S_DTD;
          this.q = null;
        }
      }
      sDTDOpenWaka() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        switch (c) {
          case BANG:
            this.state = S_DTD_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            break;
          case QUESTION:
            this.state = S_DTD_PI;
            break;
          default:
            this.state = S_DTD;
        }
      }
      sDTDOpenWakaBang() {
        const char = String.fromCodePoint(this.getCodeNorm());
        const owb = this.openWakaBang += char;
        this.text += char;
        if (owb !== "-") {
          this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
          this.openWakaBang = "";
        }
      }
      sDTDComment() {
        if (this.captureToChar(MINUS)) {
          this.text += "-";
          this.state = S_DTD_COMMENT_ENDING;
        }
      }
      sDTDCommentEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
      }
      sDTDCommentEnded() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        } else {
          this.fail("malformed comment.");
          this.state = S_DTD_COMMENT;
        }
      }
      sDTDPI() {
        if (this.captureToChar(QUESTION)) {
          this.text += "?";
          this.state = S_DTD_PI_ENDING;
        }
      }
      sDTDPIEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        }
      }
      sText() {
        if (this.tags.length !== 0) {
          this.handleTextInRoot();
        } else {
          this.handleTextOutsideRoot();
        }
      }
      sEntity() {
        let { i: start } = this;
        const { chunk } = this;
        loop:
          while (true) {
            switch (this.getCode()) {
              case NL_LIKE:
                this.entity += `${chunk.slice(start, this.prevI)}
`;
                start = this.i;
                break;
              case SEMICOLON: {
                const { entityReturnState } = this;
                const entity = this.entity + chunk.slice(start, this.prevI);
                this.state = entityReturnState;
                let parsed;
                if (entity === "") {
                  this.fail("empty entity name.");
                  parsed = "&;";
                } else {
                  parsed = this.parseEntity(entity);
                  this.entity = "";
                }
                if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                  this.text += parsed;
                }
                break loop;
              }
              case EOC:
                this.entity += chunk.slice(start);
                break loop;
            }
          }
      }
      sOpenWaka() {
        const c = this.getCode();
        if (isNameStartChar(c)) {
          this.state = S_OPEN_TAG;
          this.unget();
          this.xmlDeclPossible = false;
        } else {
          switch (c) {
            case FORWARD_SLASH:
              this.state = S_CLOSE_TAG;
              this.xmlDeclPossible = false;
              break;
            case BANG:
              this.state = S_OPEN_WAKA_BANG;
              this.openWakaBang = "";
              this.xmlDeclPossible = false;
              break;
            case QUESTION:
              this.state = S_PI_FIRST_CHAR;
              break;
            default:
              this.fail("disallowed character in tag name");
              this.state = S_TEXT;
              this.xmlDeclPossible = false;
          }
        }
      }
      sOpenWakaBang() {
        this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
        switch (this.openWakaBang) {
          case "[CDATA[":
            if (!this.sawRoot && !this.reportedTextBeforeRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextBeforeRoot = true;
            }
            if (this.closedRoot && !this.reportedTextAfterRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextAfterRoot = true;
            }
            this.state = S_CDATA;
            this.openWakaBang = "";
            break;
          case "--":
            this.state = S_COMMENT;
            this.openWakaBang = "";
            break;
          case "DOCTYPE":
            this.state = S_DOCTYPE;
            if (this.doctype || this.sawRoot) {
              this.fail("inappropriately located doctype declaration.");
            }
            this.openWakaBang = "";
            break;
          default:
            if (this.openWakaBang.length >= 7) {
              this.fail("incorrect syntax.");
            }
        }
      }
      sComment() {
        if (this.captureToChar(MINUS)) {
          this.state = S_COMMENT_ENDING;
        }
      }
      sCommentEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === MINUS) {
          this.state = S_COMMENT_ENDED;
          (_a = this.commentHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
          this.text = "";
        } else {
          this.text += `-${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        }
      }
      sCommentEnded() {
        const c = this.getCodeNorm();
        if (c !== GREATER) {
          this.fail("malformed comment.");
          this.text += `--${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        } else {
          this.state = S_TEXT;
        }
      }
      sCData() {
        if (this.captureToChar(CLOSE_BRACKET)) {
          this.state = S_CDATA_ENDING;
        }
      }
      sCDataEnding() {
        const c = this.getCodeNorm();
        if (c === CLOSE_BRACKET) {
          this.state = S_CDATA_ENDING_2;
        } else {
          this.text += `]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
        }
      }
      sCDataEnding2() {
        var _a;
        const c = this.getCodeNorm();
        switch (c) {
          case GREATER: {
            (_a = this.cdataHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            break;
          }
          case CLOSE_BRACKET:
            this.text += "]";
            break;
          default:
            this.text += `]]${String.fromCodePoint(c)}`;
            this.state = S_CDATA;
        }
      }
      // We need this separate state to check the first character fo the pi target
      // with this.nameStartCheck which allows less characters than this.nameCheck.
      sPIFirstChar() {
        const c = this.getCodeNorm();
        if (this.nameStartCheck(c)) {
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        } else if (c === QUESTION || isS(c)) {
          this.fail("processing instruction without a target.");
          this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
        } else {
          this.fail("disallowed character in processing instruction name.");
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        }
      }
      sPIRest() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC) {
            this.piTarget += chunk.slice(start);
            return;
          }
          if (!this.nameCheck(c)) {
            this.piTarget += chunk.slice(start, this.prevI);
            const isQuestion = c === QUESTION;
            if (isQuestion || isS(c)) {
              if (this.piTarget === "xml") {
                if (!this.xmlDeclPossible) {
                  this.fail("an XML declaration must be at the start of the document.");
                }
                this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
              } else {
                this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
              }
            } else {
              this.fail("disallowed character in processing instruction name.");
              this.piTarget += String.fromCodePoint(c);
            }
            break;
          }
        }
      }
      sPIBody() {
        if (this.text.length === 0) {
          const c = this.getCodeNorm();
          if (c === QUESTION) {
            this.state = S_PI_ENDING;
          } else if (!isS(c)) {
            this.text = String.fromCodePoint(c);
          }
        } else if (this.captureToChar(QUESTION)) {
          this.state = S_PI_ENDING;
        }
      }
      sPIEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          const { piTarget } = this;
          if (piTarget.toLowerCase() === "xml") {
            this.fail("the XML declaration must appear at the start of the document.");
          }
          (_a = this.piHandler) === null || _a === void 0 ? void 0 : _a.call(this, {
            target: piTarget,
            body: this.text
          });
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else if (c === QUESTION) {
          this.text += "?";
        } else {
          this.text += `?${String.fromCodePoint(c)}`;
          this.state = S_PI_BODY;
        }
        this.xmlDeclPossible = false;
      }
      sXMLDeclNameStart() {
        const c = this.skipSpaces();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (c !== EOC) {
          this.state = S_XML_DECL_NAME;
          this.name = String.fromCodePoint(c);
        }
      }
      sXMLDeclName() {
        const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.name += this.text;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (!(isS(c) || c === EQUAL)) {
          return;
        }
        this.name += this.text;
        this.text = "";
        if (!this.xmlDeclExpects.includes(this.name)) {
          switch (this.name.length) {
            case 0:
              this.fail("did not expect any more name/value pairs.");
              break;
            case 1:
              this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
              break;
            default:
              this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
          }
        }
        this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
      }
      sXMLDeclEq() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (c !== EQUAL) {
          this.fail("value required.");
        }
        this.state = S_XML_DECL_VALUE_START;
      }
      sXMLDeclValueStart() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (!isQuote(c)) {
          this.fail("value must be quoted.");
          this.q = SPACE;
        } else {
          this.q = c;
        }
        this.state = S_XML_DECL_VALUE;
      }
      sXMLDeclValue() {
        const c = this.captureTo([this.q, QUESTION]);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (c === EOC) {
          return;
        }
        const value = this.text;
        this.text = "";
        switch (this.name) {
          case "version": {
            this.xmlDeclExpects = ["encoding", "standalone"];
            const version = value;
            this.xmlDecl.version = version;
            if (!/^1\.[0-9]+$/.test(version)) {
              this.fail("version number must match /^1\\.[0-9]+$/.");
            } else if (!this.opt.forceXMLVersion) {
              this.setXMLVersion(version);
            }
            break;
          }
          case "encoding":
            if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
              this.fail("encoding value must match 	/^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
            }
            this.xmlDeclExpects = ["standalone"];
            this.xmlDecl.encoding = value;
            break;
          case "standalone":
            if (value !== "yes" && value !== "no") {
              this.fail('standalone value must match "yes" or "no".');
            }
            this.xmlDeclExpects = [];
            this.xmlDecl.standalone = value;
            break;
        }
        this.name = "";
        this.state = S_XML_DECL_SEPARATOR;
      }
      sXMLDeclSeparator() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (!isS(c)) {
          this.fail("whitespace required.");
          this.unget();
        }
        this.state = S_XML_DECL_NAME_START;
      }
      sXMLDeclEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          if (this.piTarget !== "xml") {
            this.fail("processing instructions are not allowed before root.");
          } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
            this.fail("XML declaration must contain a version.");
          }
          (_a = this.xmldeclHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.xmlDecl);
          this.name = "";
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else {
          this.fail("The character ? is disallowed anywhere in XML declarations.");
        }
        this.xmlDeclPossible = false;
      }
      sOpenTag() {
        var _a;
        const c = this.captureNameChars();
        if (c === EOC) {
          return;
        }
        const tag = this.tag = {
          name: this.name,
          attributes: /* @__PURE__ */ Object.create(null)
        };
        this.name = "";
        if (this.xmlnsOpt) {
          this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
        }
        (_a = this.openTagStartHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        this.sawRoot = true;
        if (!this.fragmentOpt && this.closedRoot) {
          this.fail("documents may contain only one root.");
        }
        switch (c) {
          case GREATER:
            this.openTag();
            break;
          case FORWARD_SLASH:
            this.state = S_OPEN_TAG_SLASH;
            break;
          default:
            if (!isS(c)) {
              this.fail("disallowed character in tag name.");
            }
            this.state = S_ATTRIB;
        }
      }
      sOpenTagSlash() {
        if (this.getCode() === GREATER) {
          this.openSelfClosingTag();
        } else {
          this.fail("forward-slash in opening tag not followed by >.");
          this.state = S_ATTRIB;
        }
      }
      sAttrib() {
        const c = this.skipSpaces();
        if (c === EOC) {
          return;
        }
        if (isNameStartChar(c)) {
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribName() {
        const c = this.captureNameChars();
        if (c === EQUAL) {
          this.state = S_ATTRIB_VALUE;
        } else if (isS(c)) {
          this.state = S_ATTRIB_NAME_SAW_WHITE;
        } else if (c === GREATER) {
          this.fail("attribute without value.");
          this.pushAttrib(this.name, this.name);
          this.name = this.text = "";
          this.openTag();
        } else if (c !== EOC) {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribNameSawWhite() {
        const c = this.skipSpaces();
        switch (c) {
          case EOC:
            return;
          case EQUAL:
            this.state = S_ATTRIB_VALUE;
            break;
          default:
            this.fail("attribute without value.");
            this.text = "";
            this.name = "";
            if (c === GREATER) {
              this.openTag();
            } else if (isNameStartChar(c)) {
              this.unget();
              this.state = S_ATTRIB_NAME;
            } else {
              this.fail("disallowed character in attribute name.");
              this.state = S_ATTRIB;
            }
        }
      }
      sAttribValue() {
        const c = this.getCodeNorm();
        if (isQuote(c)) {
          this.q = c;
          this.state = S_ATTRIB_VALUE_QUOTED;
        } else if (!isS(c)) {
          this.fail("unquoted attribute value.");
          this.state = S_ATTRIB_VALUE_UNQUOTED;
          this.unget();
        }
      }
      sAttribValueQuoted() {
        const { q, chunk } = this;
        let { i: start } = this;
        while (true) {
          switch (this.getCode()) {
            case q:
              this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
              this.name = this.text = "";
              this.q = null;
              this.state = S_ATTRIB_VALUE_CLOSED;
              return;
            case AMP:
              this.text += chunk.slice(start, this.prevI);
              this.state = S_ENTITY;
              this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
              return;
            case NL:
            case NL_LIKE:
            case TAB:
              this.text += `${chunk.slice(start, this.prevI)} `;
              start = this.i;
              break;
            case LESS:
              this.text += chunk.slice(start, this.prevI);
              this.fail("disallowed character.");
              return;
            case EOC:
              this.text += chunk.slice(start);
              return;
          }
        }
      }
      sAttribValueClosed() {
        const c = this.getCodeNorm();
        if (isS(c)) {
          this.state = S_ATTRIB;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else if (isNameStartChar(c)) {
          this.fail("no whitespace between attributes.");
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribValueUnquoted() {
        const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
        switch (c) {
          case AMP:
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
            break;
          case LESS:
            this.fail("disallowed character.");
            break;
          case EOC:
            break;
          default:
            if (this.text.includes("]]>")) {
              this.fail('the string "]]>" is disallowed in char data.');
            }
            this.pushAttrib(this.name, this.text);
            this.name = this.text = "";
            if (c === GREATER) {
              this.openTag();
            } else {
              this.state = S_ATTRIB;
            }
        }
      }
      sCloseTag() {
        const c = this.captureNameChars();
        if (c === GREATER) {
          this.closeTag();
        } else if (isS(c)) {
          this.state = S_CLOSE_TAG_SAW_WHITE;
        } else if (c !== EOC) {
          this.fail("disallowed character in closing tag.");
        }
      }
      sCloseTagSawWhite() {
        switch (this.skipSpaces()) {
          case GREATER:
            this.closeTag();
            break;
          case EOC:
            break;
          default:
            this.fail("disallowed character in closing tag.");
        }
      }
      // END OF STATE ENGINE METHODS
      handleTextInRoot() {
        let { i: start, forbiddenState } = this;
        const { chunk, textHandler: handler } = this;
        scanLoop:
          while (true) {
            switch (this.getCode()) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              case CLOSE_BRACKET:
                switch (forbiddenState) {
                  case FORBIDDEN_START:
                    forbiddenState = FORBIDDEN_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET:
                    forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET_BRACKET:
                    break;
                  default:
                    throw new Error("impossible state");
                }
                break;
              case GREATER:
                if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                  this.fail('the string "]]>" is disallowed in char data.');
                }
                forbiddenState = FORBIDDEN_START;
                break;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                forbiddenState = FORBIDDEN_START;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break scanLoop;
              default:
                forbiddenState = FORBIDDEN_START;
            }
          }
        this.forbiddenState = forbiddenState;
      }
      handleTextOutsideRoot() {
        let { i: start } = this;
        const { chunk, textHandler: handler } = this;
        let nonSpace = false;
        outRootLoop:
          while (true) {
            const code = this.getCode();
            switch (code) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                break outRootLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                nonSpace = true;
                break outRootLoop;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break outRootLoop;
              default:
                if (!isS(code)) {
                  nonSpace = true;
                }
            }
          }
        if (!nonSpace) {
          return;
        }
        if (!this.sawRoot && !this.reportedTextBeforeRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextBeforeRoot = true;
        }
        if (this.closedRoot && !this.reportedTextAfterRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextAfterRoot = true;
        }
      }
      pushAttribNS(name, value) {
        var _a;
        const { prefix, local } = this.qname(name);
        const attr = { name, prefix, local, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
        if (prefix === "xmlns") {
          const trimmed = value.trim();
          if (this.currentXMLVersion === "1.0" && trimmed === "") {
            this.fail("invalid attempt to undefine prefix in XML 1.0");
          }
          this.topNS[local] = trimmed;
          nsPairCheck(this, local, trimmed);
        } else if (name === "xmlns") {
          const trimmed = value.trim();
          this.topNS[""] = trimmed;
          nsPairCheck(this, "", trimmed);
        }
      }
      pushAttribPlain(name, value) {
        var _a;
        const attr = { name, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
      }
      /**
       * End parsing. This performs final well-formedness checks and resets the
       * parser to a clean state.
       *
       * @returns this
       */
      end() {
        var _a, _b;
        if (!this.sawRoot) {
          this.fail("document must contain a root element.");
        }
        const { tags } = this;
        while (tags.length > 0) {
          const tag = tags.pop();
          this.fail(`unclosed tag: ${tag.name}`);
        }
        if (this.state !== S_BEGIN && this.state !== S_TEXT) {
          this.fail("unexpected end.");
        }
        const { text } = this;
        if (text.length !== 0) {
          (_a = this.textHandler) === null || _a === void 0 ? void 0 : _a.call(this, text);
          this.text = "";
        }
        this._closed = true;
        (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
        this._init();
        return this;
      }
      /**
       * Resolve a namespace prefix.
       *
       * @param prefix The prefix to resolve.
       *
       * @returns The namespace URI or ``undefined`` if the prefix is not defined.
       */
      resolve(prefix) {
        var _a, _b;
        let uri = this.topNS[prefix];
        if (uri !== void 0) {
          return uri;
        }
        const { tags } = this;
        for (let index = tags.length - 1; index >= 0; index--) {
          uri = tags[index].ns[prefix];
          if (uri !== void 0) {
            return uri;
          }
        }
        uri = this.ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
        return (_b = (_a = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a, prefix);
      }
      /**
       * Parse a qname into its prefix and local name parts.
       *
       * @param name The name to parse
       *
       * @returns
       */
      qname(name) {
        const colon = name.indexOf(":");
        if (colon === -1) {
          return { prefix: "", local: name };
        }
        const local = name.slice(colon + 1);
        const prefix = name.slice(0, colon);
        if (prefix === "" || local === "" || local.includes(":")) {
          this.fail(`malformed name: ${name}.`);
        }
        return { prefix, local };
      }
      processAttribsNS() {
        var _a;
        const { attribList } = this;
        const tag = this.tag;
        {
          const { prefix, local } = this.qname(tag.name);
          tag.prefix = prefix;
          tag.local = local;
          const uri = tag.uri = (_a = this.resolve(prefix)) !== null && _a !== void 0 ? _a : "";
          if (prefix !== "") {
            if (prefix === "xmlns") {
              this.fail('tags may not have "xmlns" as prefix.');
            }
            if (uri === "") {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              tag.uri = prefix;
            }
          }
        }
        if (attribList.length === 0) {
          return;
        }
        const { attributes } = tag;
        const seen = /* @__PURE__ */ new Set();
        for (const attr of attribList) {
          const { name, prefix, local } = attr;
          let uri;
          let eqname;
          if (prefix === "") {
            uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
            eqname = name;
          } else {
            uri = this.resolve(prefix);
            if (uri === void 0) {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              uri = prefix;
            }
            eqname = `{${uri}}${local}`;
          }
          if (seen.has(eqname)) {
            this.fail(`duplicate attribute: ${eqname}.`);
          }
          seen.add(eqname);
          attr.uri = uri;
          attributes[name] = attr;
        }
        this.attribList = [];
      }
      processAttribsPlain() {
        const { attribList } = this;
        const attributes = this.tag.attributes;
        for (const { name, value } of attribList) {
          if (attributes[name] !== void 0) {
            this.fail(`duplicate attribute: ${name}.`);
          }
          attributes[name] = value;
        }
        this.attribList = [];
      }
      /**
       * Handle a complete open tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onopentag``.
       */
      openTag() {
        var _a;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = false;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        tags.push(tag);
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete self-closing tag. This parser code calls this once it has
       * seen the whole tag. This method checks for well-formeness and then emits
       * ``onopentag`` and ``onclosetag``.
       */
      openSelfClosingTag() {
        var _a, _b, _c;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = true;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag);
        const top = this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null;
        if (top === null) {
          this.closedRoot = true;
        }
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete close tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onclosetag``.
       */
      closeTag() {
        const { tags, name } = this;
        this.state = S_TEXT;
        this.name = "";
        if (name === "") {
          this.fail("weird empty close tag.");
          this.text += "</>";
          return;
        }
        const handler = this.closeTagHandler;
        let l = tags.length;
        while (l-- > 0) {
          const tag = this.tag = tags.pop();
          this.topNS = tag.ns;
          handler === null || handler === void 0 ? void 0 : handler(tag);
          if (tag.name === name) {
            break;
          }
          this.fail("unexpected close tag.");
        }
        if (l === 0) {
          this.closedRoot = true;
        } else if (l < 0) {
          this.fail(`unmatched closing tag: ${name}.`);
          this.text += `</${name}>`;
        }
      }
      /**
       * Resolves an entity. Makes any necessary well-formedness checks.
       *
       * @param entity The entity to resolve.
       *
       * @returns The parsed entity.
       */
      parseEntity(entity) {
        if (entity[0] !== "#") {
          const defined = this.ENTITIES[entity];
          if (defined !== void 0) {
            return defined;
          }
          this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
          return `&${entity};`;
        }
        let num = NaN;
        if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
          num = parseInt(entity.slice(2), 16);
        } else if (/^#[0-9]+$/.test(entity)) {
          num = parseInt(entity.slice(1), 10);
        }
        if (!this.isChar(num)) {
          this.fail("malformed character entity.");
          return `&${entity};`;
        }
        return String.fromCodePoint(num);
      }
    }
    saxes.SaxesParser = SaxesParser;
    return saxes;
  }
  var ParseError = {};
  var hasRequiredParseError;
  function requireParseError() {
    if (hasRequiredParseError) return ParseError;
    hasRequiredParseError = 1;
    Object.defineProperty(ParseError, "__esModule", { value: true });
    ParseError.ParseError = void 0;
    let ParseError$1 = class ParseError extends Error {
      constructor(parser, message) {
        const saxParser = parser.saxParser;
        super(parser.trackPosition ? `Line ${saxParser.line} column ${saxParser.column + 1}: ${message}` : message);
      }
    };
    ParseError.ParseError = ParseError$1;
    return ParseError;
  }
  var rdfDataFactory = {};
  var BlankNode = {};
  var hasRequiredBlankNode;
  function requireBlankNode() {
    if (hasRequiredBlankNode) return BlankNode;
    hasRequiredBlankNode = 1;
    Object.defineProperty(BlankNode, "__esModule", { value: true });
    BlankNode.BlankNode = void 0;
    let BlankNode$12 = class BlankNode {
      constructor(value) {
        this.termType = "BlankNode";
        this.value = value;
      }
      equals(other) {
        return !!other && other.termType === "BlankNode" && other.value === this.value;
      }
    };
    BlankNode.BlankNode = BlankNode$12;
    return BlankNode;
  }
  var DataFactory = {};
  var DefaultGraph = {};
  var hasRequiredDefaultGraph;
  function requireDefaultGraph() {
    if (hasRequiredDefaultGraph) return DefaultGraph;
    hasRequiredDefaultGraph = 1;
    Object.defineProperty(DefaultGraph, "__esModule", { value: true });
    DefaultGraph.DefaultGraph = void 0;
    let DefaultGraph$12 = class DefaultGraph {
      constructor() {
        this.termType = "DefaultGraph";
        this.value = "";
      }
      equals(other) {
        return !!other && other.termType === "DefaultGraph";
      }
    };
    DefaultGraph.DefaultGraph = DefaultGraph$12;
    DefaultGraph$12.INSTANCE = new DefaultGraph$12();
    return DefaultGraph;
  }
  var Literal = {};
  var NamedNode = {};
  var hasRequiredNamedNode;
  function requireNamedNode() {
    if (hasRequiredNamedNode) return NamedNode;
    hasRequiredNamedNode = 1;
    Object.defineProperty(NamedNode, "__esModule", { value: true });
    NamedNode.NamedNode = void 0;
    let NamedNode$12 = class NamedNode {
      constructor(value) {
        this.termType = "NamedNode";
        this.value = value;
      }
      equals(other) {
        return !!other && other.termType === "NamedNode" && other.value === this.value;
      }
    };
    NamedNode.NamedNode = NamedNode$12;
    return NamedNode;
  }
  var hasRequiredLiteral;
  function requireLiteral() {
    if (hasRequiredLiteral) return Literal;
    hasRequiredLiteral = 1;
    Object.defineProperty(Literal, "__esModule", { value: true });
    Literal.Literal = void 0;
    const NamedNode_1 = requireNamedNode();
    let Literal$12 = class Literal2 {
      constructor(value, languageOrDatatype) {
        this.termType = "Literal";
        this.value = value;
        if (typeof languageOrDatatype === "string") {
          this.language = languageOrDatatype;
          this.datatype = Literal2.RDF_LANGUAGE_STRING;
          this.direction = "";
        } else if (languageOrDatatype) {
          if ("termType" in languageOrDatatype) {
            this.language = "";
            this.datatype = languageOrDatatype;
            this.direction = "";
          } else {
            this.language = languageOrDatatype.language;
            this.datatype = languageOrDatatype.direction ? Literal2.RDF_DIRECTIONAL_LANGUAGE_STRING : Literal2.RDF_LANGUAGE_STRING;
            this.direction = languageOrDatatype.direction || "";
          }
        } else {
          this.language = "";
          this.datatype = Literal2.XSD_STRING;
          this.direction = "";
        }
      }
      equals(other) {
        return !!other && other.termType === "Literal" && other.value === this.value && other.language === this.language && (other.direction === this.direction || !other.direction && this.direction === "") && this.datatype.equals(other.datatype);
      }
    };
    Literal.Literal = Literal$12;
    Literal$12.RDF_LANGUAGE_STRING = new NamedNode_1.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString");
    Literal$12.RDF_DIRECTIONAL_LANGUAGE_STRING = new NamedNode_1.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#dirLangString");
    Literal$12.XSD_STRING = new NamedNode_1.NamedNode("http://www.w3.org/2001/XMLSchema#string");
    return Literal;
  }
  var Quad = {};
  var hasRequiredQuad;
  function requireQuad() {
    if (hasRequiredQuad) return Quad;
    hasRequiredQuad = 1;
    Object.defineProperty(Quad, "__esModule", { value: true });
    Quad.Quad = void 0;
    let Quad$12 = class Quad {
      constructor(subject, predicate, object, graph) {
        this.termType = "Quad";
        this.value = "";
        this.subject = subject;
        this.predicate = predicate;
        this.object = object;
        this.graph = graph;
      }
      equals(other) {
        return !!other && (other.termType === "Quad" || !other.termType) && this.subject.equals(other.subject) && this.predicate.equals(other.predicate) && this.object.equals(other.object) && this.graph.equals(other.graph);
      }
    };
    Quad.Quad = Quad$12;
    return Quad;
  }
  var Variable = {};
  var hasRequiredVariable;
  function requireVariable() {
    if (hasRequiredVariable) return Variable;
    hasRequiredVariable = 1;
    Object.defineProperty(Variable, "__esModule", { value: true });
    Variable.Variable = void 0;
    let Variable$12 = class Variable {
      constructor(value) {
        this.termType = "Variable";
        this.value = value;
      }
      equals(other) {
        return !!other && other.termType === "Variable" && other.value === this.value;
      }
    };
    Variable.Variable = Variable$12;
    return Variable;
  }
  var hasRequiredDataFactory;
  function requireDataFactory() {
    if (hasRequiredDataFactory) return DataFactory;
    hasRequiredDataFactory = 1;
    Object.defineProperty(DataFactory, "__esModule", { value: true });
    DataFactory.DataFactory = void 0;
    const BlankNode_1 = requireBlankNode();
    const DefaultGraph_1 = requireDefaultGraph();
    const Literal_1 = requireLiteral();
    const NamedNode_1 = requireNamedNode();
    const Quad_1 = requireQuad();
    const Variable_1 = requireVariable();
    let dataFactoryCounter = 0;
    let DataFactory$12 = class DataFactory {
      constructor(options) {
        this.blankNodeCounter = 0;
        options = options || {};
        this.blankNodePrefix = options.blankNodePrefix || `df_${dataFactoryCounter++}_`;
      }
      /**
       * @param value The IRI for the named node.
       * @return A new instance of NamedNode.
       * @see NamedNode
       */
      namedNode(value) {
        return new NamedNode_1.NamedNode(value);
      }
      /**
       * @param value The optional blank node identifier.
       * @return A new instance of BlankNode.
       *         If the `value` parameter is undefined a new identifier
       *         for the blank node is generated for each call.
       * @see BlankNode
       */
      blankNode(value) {
        return new BlankNode_1.BlankNode(value || `${this.blankNodePrefix}${this.blankNodeCounter++}`);
      }
      /**
       * @param value              The literal value.
       * @param languageOrDatatype The optional language, datatype, or directional language.
       *                           If `languageOrDatatype` is a NamedNode,
       *                           then it is used for the value of `NamedNode.datatype`.
       *                           If `languageOrDatatype` is a NamedNode, it is used for the value
       *                           of `NamedNode.language`.
       *                           Otherwise, it is used as a directional language,
       *                           from which the language is set to `languageOrDatatype.language`
       *                           and the direction to `languageOrDatatype.direction`.
       * @return A new instance of Literal.
       * @see Literal
       */
      literal(value, languageOrDatatype) {
        return new Literal_1.Literal(value, languageOrDatatype);
      }
      /**
       * This method is optional.
       * @param value The variable name
       * @return A new instance of Variable.
       * @see Variable
       */
      variable(value) {
        return new Variable_1.Variable(value);
      }
      /**
       * @return An instance of DefaultGraph.
       */
      defaultGraph() {
        return DefaultGraph_1.DefaultGraph.INSTANCE;
      }
      /**
       * @param subject   The quad subject term.
       * @param predicate The quad predicate term.
       * @param object    The quad object term.
       * @param graph     The quad graph term.
       * @return A new instance of Quad.
       * @see Quad
       */
      quad(subject, predicate, object, graph) {
        return new Quad_1.Quad(subject, predicate, object, graph || this.defaultGraph());
      }
      /**
       * Create a deep copy of the given term using this data factory.
       * @param original An RDF term.
       * @return A deep copy of the given term.
       */
      fromTerm(original) {
        switch (original.termType) {
          case "NamedNode":
            return this.namedNode(original.value);
          case "BlankNode":
            return this.blankNode(original.value);
          case "Literal":
            if (original.language) {
              return this.literal(original.value, original.language);
            }
            if (!original.datatype.equals(Literal_1.Literal.XSD_STRING)) {
              return this.literal(original.value, this.fromTerm(original.datatype));
            }
            return this.literal(original.value);
          case "Variable":
            return this.variable(original.value);
          case "DefaultGraph":
            return this.defaultGraph();
          case "Quad":
            return this.quad(this.fromTerm(original.subject), this.fromTerm(original.predicate), this.fromTerm(original.object), this.fromTerm(original.graph));
        }
      }
      /**
       * Create a deep copy of the given quad using this data factory.
       * @param original An RDF quad.
       * @return A deep copy of the given quad.
       */
      fromQuad(original) {
        return this.fromTerm(original);
      }
      /**
       * Reset the internal blank node counter.
       */
      resetBlankNodeCounter() {
        this.blankNodeCounter = 0;
      }
    };
    DataFactory.DataFactory = DataFactory$12;
    return DataFactory;
  }
  var hasRequiredRdfDataFactory;
  function requireRdfDataFactory() {
    if (hasRequiredRdfDataFactory) return rdfDataFactory;
    hasRequiredRdfDataFactory = 1;
    (function(exports$1) {
      var __createBinding = rdfDataFactory && rdfDataFactory.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = rdfDataFactory && rdfDataFactory.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(requireBlankNode(), exports$1);
      __exportStar(requireDataFactory(), exports$1);
      __exportStar(requireDefaultGraph(), exports$1);
      __exportStar(requireLiteral(), exports$1);
      __exportStar(requireNamedNode(), exports$1);
      __exportStar(requireQuad(), exports$1);
      __exportStar(requireVariable(), exports$1);
    })(rdfDataFactory);
    return rdfDataFactory;
  }
  var validateIri = {};
  var Validate = {};
  var hasRequiredValidate;
  function requireValidate() {
    if (hasRequiredValidate) return Validate;
    hasRequiredValidate = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.validateIri = exports$1.IriValidationStrategy = void 0;
      function buildAbsoluteIriRfc3987Regex() {
        const sub_delims_raw = `!$&'()*+,;=`;
        const sub_delims = `[${sub_delims_raw}]`;
        const pct_encoded = `%[a-fA-F0-9]{2}`;
        const dec_octet = "([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])";
        const ipv4address = `${dec_octet}\\.${dec_octet}\\.${dec_octet}\\.${dec_octet}`;
        const h16 = `[a-fA-F0-9]{1,4}`;
        const ls32 = `(${h16}:${h16}|${ipv4address})`;
        const ipv6address = `((${h16}:){6}${ls32}|::(${h16}:){5}${ls32}|(${h16})?::(${h16}:){4}${ls32}|((${h16}:){0,1}${h16})?::(${h16}:){3}${ls32}|((${h16}:){0,2}${h16})?::(${h16}:){2}${ls32}|((${h16}:){0,3}${h16})?::${h16}:${ls32}|((${h16}:){0,4}${h16})?::${ls32}|((${h16}:){0,5}${h16})?::${h16}|((${h16}:){0,6}${h16})?::)`;
        const ipvfuture = `v[a-fA-F0-9]+\\.(${sub_delims}|${sub_delims}|":)+`;
        const ip_literal = `\\[(${ipv6address}|${ipvfuture})\\]`;
        const port = `[0-9]*`;
        const scheme = `[a-zA-Z][a-zA-Z0-9+\\-.]*`;
        const iprivate_raw = `-󰀀-󿿽􀀀-􏿽`;
        const iprivate = `[${iprivate_raw}]`;
        const ucschar_raw = ` -퟿豈-﷏ﷰ-￯𐀀-🿽𠀀-𯿽𰀀-𿿽񀀀-񏿽񐀀-񟿽񠀀-񯿽񰀀-񿿽򀀀-򏿽򐀀-򟿽򠀀-򯿽򰀀-򿿽󀀀-󏿽󐀀-󟿽󡀀-󯿽`;
        const iunreserved_raw = `a-zA-Z0-9\\-._~${ucschar_raw}`;
        const iunreserved = `[${iunreserved_raw}]`;
        const ipchar = `(${iunreserved}|${pct_encoded}|${sub_delims}|[:@])*`;
        const ifragment = `(${ipchar}|[\\/?])*`;
        const iquery = `(${ipchar}|${iprivate}|[\\/?])*`;
        const isegment_nz = `(${ipchar})+`;
        const isegment = `(${ipchar})*`;
        const ipath_empty = "";
        const ipath_rootless = `${isegment_nz}(\\/${isegment})*`;
        const ipath_absolute = `\\/(${isegment_nz}(\\/${isegment})*)?`;
        const ipath_abempty = `(\\/${isegment})*`;
        const ireg_name = `(${iunreserved}|${pct_encoded}|${sub_delims})*`;
        const ihost = `(${ip_literal}|${ipv4address}|${ireg_name})`;
        const iuserinfo = `(${iunreserved}|${pct_encoded}|${sub_delims}|:)*`;
        const iauthority = `(${iuserinfo}@)?${ihost}(:${port})?`;
        const ihier_part = `(\\/\\/${iauthority}${ipath_abempty}|${ipath_absolute}|${ipath_rootless}|${ipath_empty})`;
        const iri = `^${scheme}:${ihier_part}(\\?${iquery})?(#${ifragment})?$`;
        return new RegExp(iri, "u");
      }
      const STRICT_IRI_REGEX = buildAbsoluteIriRfc3987Regex();
      const PRAGMATIC_IRI_REGEX = /^[A-Za-z][\d+-.A-Za-z]*:[^\u0000-\u0020"<>\\^`{|}]*$/u;
      var IriValidationStrategy;
      (function(IriValidationStrategy2) {
        IriValidationStrategy2["Strict"] = "strict";
        IriValidationStrategy2["Pragmatic"] = "pragmatic";
        IriValidationStrategy2["None"] = "none";
      })(IriValidationStrategy = exports$1.IriValidationStrategy || (exports$1.IriValidationStrategy = {}));
      function validateIri2(iri, strategy = IriValidationStrategy.Strict) {
        switch (strategy) {
          case IriValidationStrategy.Strict:
            return STRICT_IRI_REGEX.test(iri) ? void 0 : new Error(`Invalid IRI according to RFC 3987: '${iri}'`);
          case IriValidationStrategy.Pragmatic:
            return PRAGMATIC_IRI_REGEX.test(iri) ? void 0 : new Error(`Invalid IRI according to RDF Turtle: '${iri}'`);
          case IriValidationStrategy.None:
            return void 0;
          default:
            return new Error(`Not supported validation strategy "${strategy}"`);
        }
      }
      exports$1.validateIri = validateIri2;
    })(Validate);
    return Validate;
  }
  var hasRequiredValidateIri;
  function requireValidateIri() {
    if (hasRequiredValidateIri) return validateIri;
    hasRequiredValidateIri = 1;
    (function(exports$1) {
      var __createBinding = validateIri && validateIri.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = validateIri && validateIri.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(requireValidate(), exports$1);
    })(validateIri);
    return validateIri;
  }
  var hasRequiredRdfXmlParser;
  function requireRdfXmlParser() {
    if (hasRequiredRdfXmlParser) return RdfXmlParser;
    hasRequiredRdfXmlParser = 1;
    Object.defineProperty(RdfXmlParser, "__esModule", { value: true });
    RdfXmlParser.ParseType = RdfXmlParser.RdfXmlParser = void 0;
    const relative_to_absolute_iri_1 = requireRelativeToAbsoluteIri();
    const saxes_1 = requireSaxes();
    const readable_stream_1 = requireBrowser();
    const ParseError_1 = /* @__PURE__ */ requireParseError();
    const rdf_data_factory_1 = requireRdfDataFactory();
    const validate_iri_1 = requireValidateIri();
    let RdfXmlParser$1 = class RdfXmlParser2 extends readable_stream_1.Transform {
      constructor(args) {
        super({ readableObjectMode: true });
        this.activeTagStack = [];
        this.nodeIds = {};
        if (args) {
          Object.assign(this, args);
          this.options = args;
        }
        if (!this.dataFactory) {
          this.dataFactory = new rdf_data_factory_1.DataFactory();
        }
        if (!this.baseIRI) {
          this.baseIRI = "";
        }
        if (!this.defaultGraph) {
          this.defaultGraph = this.dataFactory.defaultGraph();
        }
        if (this.validateUri !== false) {
          this.validateUri = true;
        }
        if (!this.iriValidationStrategy) {
          this.iriValidationStrategy = this.validateUri ? validate_iri_1.IriValidationStrategy.Pragmatic : validate_iri_1.IriValidationStrategy.None;
        }
        this.parseUnsupportedVersions = !!(args === null || args === void 0 ? void 0 : args.parseUnsupportedVersions);
        this.version = args === null || args === void 0 ? void 0 : args.version;
        this.saxParser = new saxes_1.SaxesParser({ xmlns: true, position: this.trackPosition });
        this.attachSaxListeners();
      }
      /**
       * Parses the given text stream into a quad stream.
       * @param {NodeJS.EventEmitter} stream A text stream.
       * @return {RDF.Stream} A quad stream.
       */
      import(stream2) {
        const output = new readable_stream_1.PassThrough({ readableObjectMode: true });
        stream2.on("error", (error) => parsed.emit("error", error));
        stream2.on("data", (data) => output.push(data));
        stream2.on("end", () => output.push(null));
        const parsed = output.pipe(new RdfXmlParser2(this.options));
        return parsed;
      }
      _transform(chunk, encoding, callback) {
        if (this.version) {
          const version = this.version;
          this.version = void 0;
          if (!this.isValidVersion(version)) {
            return callback(this.newParseError(`Detected unsupported version as media type parameter: ${version}`));
          }
        }
        try {
          this.saxParser.write(chunk);
        } catch (e) {
          return callback(e);
        }
        callback();
      }
      /**
       * Create a new parse error instance.
       * @param {string} message An error message.
       * @return {Error} An error instance.
       */
      newParseError(message) {
        return new ParseError_1.ParseError(this, message);
      }
      /**
       * Convert the given value to a IRI by taking into account the baseIRI.
       *
       * This will follow the RDF/XML spec for converting values with baseIRIs to a IRI.
       *
       * @param {string} value The value to convert to an IRI.
       * @param {IActiveTag} activeTag The active tag.
       * @return {NamedNode} an IRI.
       */
      valueToUri(value, activeTag) {
        return this.uriToNamedNode((0, relative_to_absolute_iri_1.resolve)(value, activeTag.baseIRI));
      }
      /**
       * Convert the given value URI string to a named node.
       *
       * This throw an error if the URI is invalid.
       *
       * @param {string} uri A URI string.
       * @return {NamedNode} a named node.
       */
      uriToNamedNode(uri) {
        const uriValidationResult = (0, validate_iri_1.validateIri)(uri, this.iriValidationStrategy);
        if (uriValidationResult instanceof Error) {
          throw this.newParseError(uriValidationResult.message);
        }
        return this.dataFactory.namedNode(uri);
      }
      /**
       * Validate the given value as an NCName: https://www.w3.org/TR/xml-names/#NT-NCName
       * If it is invalid, an error will thrown emitted.
       * @param {string} value A value.
       */
      validateNcname(value) {
        if (!RdfXmlParser2.NCNAME_MATCHER.test(value)) {
          throw this.newParseError(`Not a valid NCName: ${value}`);
        }
      }
      /**
       * Create a new literal term.
       * @param value The literal value.
       * @param activeTag The active tag.
       */
      createLiteral(value, activeTag) {
        return this.dataFactory.literal(value, activeTag.datatype ? activeTag.datatype : activeTag.language ? { language: activeTag.language, direction: activeTag.rdfVersion ? activeTag.direction : void 0 } : void 0);
      }
      /**
       * If the given version is valid for this parser to handle.
       * @param version A version string.
       */
      isValidVersion(version) {
        return this.parseUnsupportedVersions || RdfXmlParser2.SUPPORTED_VERSIONS.includes(version);
      }
      attachSaxListeners() {
        this.saxParser.on("error", (error) => this.emit("error", error));
        this.saxParser.on("opentag", this.onTag.bind(this));
        this.saxParser.on("text", this.onText.bind(this));
        this.saxParser.on("cdata", this.onText.bind(this));
        this.saxParser.on("closetag", this.onCloseTag.bind(this));
        this.saxParser.on("doctype", this.onDoctype.bind(this));
      }
      /**
       * Handle the given tag.
       * @param {SaxesTagNS} tag A SAX tag.
       */
      onTag(tag) {
        const parentTag = this.activeTagStack.length ? this.activeTagStack[this.activeTagStack.length - 1] : null;
        let currentParseType = ParseType.RESOURCE;
        if (parentTag) {
          parentTag.hadChildren = true;
          currentParseType = parentTag.childrenParseType;
        }
        if (parentTag && parentTag.childrenStringTags) {
          const tagName = tag.name;
          let attributes = "";
          for (const { key, value } of parentTag.namespaces || []) {
            attributes += ` ${key}="${value}"`;
          }
          for (const attributeKey in tag.attributes) {
            attributes += ` ${attributeKey}="${tag.attributes[attributeKey].value}"`;
          }
          const tagContents = `${tagName}${attributes}`;
          const tagString = `<${tagContents}>`;
          parentTag.childrenStringTags.push(tagString);
          const stringActiveTag = { childrenStringTags: parentTag.childrenStringTags };
          stringActiveTag.childrenStringEmitClosingTag = `</${tagName}>`;
          this.activeTagStack.push(stringActiveTag);
          return;
        }
        const activeTag = {};
        if (parentTag) {
          activeTag.language = parentTag.language;
          activeTag.direction = parentTag.direction;
          activeTag.baseIRI = parentTag.baseIRI;
          activeTag.childrenTripleTerms = parentTag.childrenTripleTerms;
          activeTag.rdfVersion = parentTag.rdfVersion;
        } else {
          activeTag.baseIRI = this.baseIRI;
        }
        this.activeTagStack.push(activeTag);
        if (currentParseType === ParseType.RESOURCE) {
          this.onTagResource(tag, activeTag, parentTag, !parentTag);
        } else {
          this.onTagProperty(tag, activeTag, parentTag);
        }
        for (const attributeKey in tag.attributes) {
          const attribute = tag.attributes[attributeKey];
          if (attribute.prefix === "xmlns") {
            if (!activeTag.namespaces) {
              activeTag.namespaces = [];
            }
            activeTag.namespaces.push({ key: `${attribute.prefix}:${attribute.local}`, value: attribute.value });
          }
        }
        if (parentTag && parentTag.namespaces) {
          activeTag.namespaces = [...activeTag.namespaces || [], ...parentTag.namespaces];
        }
      }
      /**
       * Handle the given node element in resource-mode.
       * @param {SaxesTagNS} tag A SAX tag.
       * @param {IActiveTag} activeTag The currently active tag.
       * @param {IActiveTag} parentTag The parent tag or null.
       * @param {boolean} rootTag If we are currently processing the root tag.
       */
      onTagResource(tag, activeTag, parentTag, rootTag) {
        activeTag.childrenParseType = ParseType.PROPERTY;
        let typedNode = true;
        if (tag.uri === RdfXmlParser2.RDF) {
          if (!rootTag && RdfXmlParser2.FORBIDDEN_NODE_ELEMENTS.indexOf(tag.local) >= 0) {
            throw this.newParseError(`Illegal node element name: ${tag.local}`);
          }
          switch (tag.local) {
            case "RDF":
              activeTag.childrenParseType = ParseType.RESOURCE;
            case "Description":
              typedNode = false;
          }
        }
        const predicates = [];
        const objects = [];
        let activeSubjectValue = null;
        let claimSubjectNodeId = false;
        let subjectValueBlank = false;
        let explicitType = null;
        for (const attributeKey in tag.attributes) {
          const attribute = tag.attributes[attributeKey];
          if (attribute.uri === RdfXmlParser2.RDF && attribute.local === "version") {
            this.setVersion(activeTag, attribute.value);
            continue;
          } else if (parentTag && attribute.uri === RdfXmlParser2.RDF) {
            switch (attribute.local) {
              case "about":
                if (activeSubjectValue) {
                  throw this.newParseError(`Only one of rdf:about, rdf:nodeID and rdf:ID can be present, while ${attribute.value} and ${activeSubjectValue} where found.`);
                }
                activeSubjectValue = attribute.value;
                continue;
              case "ID":
                if (activeSubjectValue) {
                  throw this.newParseError(`Only one of rdf:about, rdf:nodeID and rdf:ID can be present, while ${attribute.value} and ${activeSubjectValue} where found.`);
                }
                this.validateNcname(attribute.value);
                activeSubjectValue = "#" + attribute.value;
                claimSubjectNodeId = true;
                continue;
              case "nodeID":
                if (activeSubjectValue) {
                  throw this.newParseError(`Only one of rdf:about, rdf:nodeID and rdf:ID can be present, while ${attribute.value} and ${activeSubjectValue} where found.`);
                }
                this.validateNcname(attribute.value);
                activeSubjectValue = attribute.value;
                subjectValueBlank = true;
                continue;
              case "bagID":
                throw this.newParseError(`rdf:bagID is not supported.`);
              case "type":
                explicitType = attribute.value;
                continue;
              case "aboutEach":
                throw this.newParseError(`rdf:aboutEach is not supported.`);
              case "aboutEachPrefix":
                throw this.newParseError(`rdf:aboutEachPrefix is not supported.`);
              case "li":
                throw this.newParseError(`rdf:li on node elements are not supported.`);
            }
          } else if (attribute.uri === RdfXmlParser2.XML) {
            if (attribute.local === "lang") {
              activeTag.language = attribute.value === "" ? null : attribute.value.toLowerCase();
              continue;
            } else if (attribute.local === "base") {
              activeTag.baseIRI = (0, relative_to_absolute_iri_1.resolve)(attribute.value, activeTag.baseIRI);
              continue;
            }
          } else if (attribute.uri === RdfXmlParser2.ITS && attribute.local === "dir") {
            this.setDirection(activeTag, attribute.value);
            continue;
          }
          if (attribute.prefix !== "xml" && attribute.prefix !== "xmlns" && (attribute.prefix !== "" || attribute.local !== "xmlns") && attribute.uri) {
            predicates.push(this.uriToNamedNode(attribute.uri + attribute.local));
            objects.push(attribute.value);
          }
        }
        if (activeSubjectValue !== null) {
          activeTag.subject = subjectValueBlank ? this.dataFactory.blankNode(activeSubjectValue) : this.valueToUri(activeSubjectValue, activeTag);
          if (claimSubjectNodeId) {
            this.claimNodeId(activeTag.subject);
          }
        }
        if (!activeTag.subject) {
          activeTag.subject = this.dataFactory.blankNode();
        }
        if (typedNode) {
          const type = this.uriToNamedNode(tag.uri + tag.local);
          this.emitTriple(activeTag.subject, this.dataFactory.namedNode(RdfXmlParser2.RDF + "type"), type, parentTag ? parentTag.reifiedStatementId : null, activeTag.childrenTripleTerms, activeTag.reifier);
        }
        if (parentTag) {
          if (parentTag.predicate) {
            if (parentTag.childrenCollectionSubject) {
              const linkTerm = this.dataFactory.blankNode();
              const restTerm = this.dataFactory.namedNode(RdfXmlParser2.RDF + "rest");
              const isRestTerm = parentTag.childrenCollectionPredicate.equals(restTerm);
              this.emitTriple(parentTag.childrenCollectionSubject, parentTag.childrenCollectionPredicate, linkTerm, isRestTerm ? null : parentTag.reifiedStatementId, parentTag.childrenTripleTerms, isRestTerm ? null : parentTag.reifier);
              this.emitTriple(linkTerm, this.dataFactory.namedNode(RdfXmlParser2.RDF + "first"), activeTag.subject, null, activeTag.childrenTripleTerms);
              parentTag.childrenCollectionSubject = linkTerm;
              parentTag.childrenCollectionPredicate = restTerm;
            } else {
              if (!parentTag.childrenTagsToTripleTerms) {
                this.emitTriple(parentTag.subject, parentTag.predicate, activeTag.subject, parentTag.reifiedStatementId, parentTag.childrenTripleTerms, parentTag.reifier);
                parentTag.predicateEmitted = true;
              }
              for (let i = 0; i < parentTag.predicateSubPredicates.length; i++) {
                this.emitTriple(activeTag.subject, parentTag.predicateSubPredicates[i], parentTag.predicateSubObjects[i], null, parentTag.childrenTripleTerms, parentTag.reifier);
              }
              parentTag.predicateSubPredicates = [];
              parentTag.predicateSubObjects = [];
            }
          }
          for (let i = 0; i < predicates.length; i++) {
            const object = this.createLiteral(objects[i], activeTag);
            this.emitTriple(activeTag.subject, predicates[i], object, parentTag.reifiedStatementId, parentTag.childrenTripleTerms, parentTag.reifier);
          }
          if (explicitType) {
            this.emitTriple(activeTag.subject, this.dataFactory.namedNode(RdfXmlParser2.RDF + "type"), this.uriToNamedNode(explicitType), null, activeTag.childrenTripleTerms, activeTag.reifier);
          }
        }
      }
      /**
       * Handle the given property element in property-mode.
       * @param {SaxesTagNS} tag A SAX tag.
       * @param {IActiveTag} activeTag The currently active tag.
       * @param {IActiveTag} parentTag The parent tag or null.
       */
      onTagProperty(tag, activeTag, parentTag) {
        activeTag.childrenParseType = ParseType.RESOURCE;
        activeTag.subject = parentTag.subject;
        if (tag.uri === RdfXmlParser2.RDF && tag.local === "li") {
          if (!parentTag.listItemCounter) {
            parentTag.listItemCounter = 1;
          }
          activeTag.predicate = this.uriToNamedNode(tag.uri + "_" + parentTag.listItemCounter++);
        } else {
          activeTag.predicate = this.uriToNamedNode(tag.uri + tag.local);
        }
        if (tag.uri === RdfXmlParser2.RDF && RdfXmlParser2.FORBIDDEN_PROPERTY_ELEMENTS.indexOf(tag.local) >= 0) {
          throw this.newParseError(`Illegal property element name: ${tag.local}`);
        }
        activeTag.predicateSubPredicates = [];
        activeTag.predicateSubObjects = [];
        let parseType = false;
        let attributedProperty = false;
        let activeSubSubjectValue = null;
        let subSubjectValueBlank = true;
        const predicates = [];
        const objects = [];
        for (const propertyAttributeKey in tag.attributes) {
          const propertyAttribute = tag.attributes[propertyAttributeKey];
          if (propertyAttribute.uri === RdfXmlParser2.RDF && propertyAttribute.local === "version") {
            this.setVersion(activeTag, propertyAttribute.value);
            continue;
          } else if (propertyAttribute.uri === RdfXmlParser2.RDF) {
            switch (propertyAttribute.local) {
              case "resource":
                if (activeSubSubjectValue) {
                  throw this.newParseError(`Found both rdf:resource (${propertyAttribute.value}) and rdf:nodeID (${activeSubSubjectValue}).`);
                }
                if (parseType) {
                  throw this.newParseError(`rdf:parseType is not allowed on property elements with rdf:resource (${propertyAttribute.value})`);
                }
                activeTag.hadChildren = true;
                activeSubSubjectValue = propertyAttribute.value;
                subSubjectValueBlank = false;
                continue;
              case "datatype":
                if (attributedProperty) {
                  throw this.newParseError(`Found both non-rdf:* property attributes and rdf:datatype (${propertyAttribute.value}).`);
                }
                if (parseType) {
                  throw this.newParseError(`rdf:parseType is not allowed on property elements with rdf:datatype (${propertyAttribute.value})`);
                }
                activeTag.datatype = this.valueToUri(propertyAttribute.value, activeTag);
                continue;
              case "nodeID":
                if (attributedProperty) {
                  throw this.newParseError(`Found both non-rdf:* property attributes and rdf:nodeID (${propertyAttribute.value}).`);
                }
                if (activeTag.hadChildren) {
                  throw this.newParseError(`Found both rdf:resource and rdf:nodeID (${propertyAttribute.value}).`);
                }
                if (parseType) {
                  throw this.newParseError(`rdf:parseType is not allowed on property elements with rdf:nodeID (${propertyAttribute.value})`);
                }
                this.validateNcname(propertyAttribute.value);
                activeTag.hadChildren = true;
                activeSubSubjectValue = propertyAttribute.value;
                subSubjectValueBlank = true;
                continue;
              case "bagID":
                throw this.newParseError(`rdf:bagID is not supported.`);
              case "parseType":
                if (attributedProperty) {
                  throw this.newParseError(`rdf:parseType is not allowed when non-rdf:* property attributes are present`);
                }
                if (activeTag.datatype) {
                  throw this.newParseError(`rdf:parseType is not allowed on property elements with rdf:datatype (${activeTag.datatype.value})`);
                }
                if (activeSubSubjectValue) {
                  throw this.newParseError(`rdf:parseType is not allowed on property elements with rdf:nodeID or rdf:resource (${activeSubSubjectValue})`);
                }
                if (propertyAttribute.value === "Resource") {
                  parseType = true;
                  activeTag.childrenParseType = ParseType.PROPERTY;
                  const nestedBNode = this.dataFactory.blankNode();
                  this.emitTriple(activeTag.subject, activeTag.predicate, nestedBNode, activeTag.reifiedStatementId, activeTag.childrenTripleTerms, activeTag.reifier);
                  activeTag.subject = nestedBNode;
                  activeTag.predicate = null;
                } else if (propertyAttribute.value === "Collection") {
                  parseType = true;
                  activeTag.hadChildren = true;
                  activeTag.childrenCollectionSubject = activeTag.subject;
                  activeTag.childrenCollectionPredicate = activeTag.predicate;
                  subSubjectValueBlank = false;
                } else if (propertyAttribute.value === "Literal") {
                  parseType = true;
                  activeTag.childrenTagsToString = true;
                  activeTag.childrenStringTags = [];
                } else if (propertyAttribute.value === "Triple") {
                  parseType = true;
                  activeTag.childrenTagsToTripleTerms = true;
                  activeTag.childrenTripleTerms = [];
                }
                continue;
              case "ID":
                this.validateNcname(propertyAttribute.value);
                activeTag.reifiedStatementId = this.valueToUri("#" + propertyAttribute.value, activeTag);
                this.claimNodeId(activeTag.reifiedStatementId);
                continue;
              case "annotation":
                activeTag.reifier = this.dataFactory.namedNode(propertyAttribute.value);
                continue;
              case "annotationNodeID":
                activeTag.reifier = this.dataFactory.blankNode(propertyAttribute.value);
                continue;
            }
          } else if (propertyAttribute.uri === RdfXmlParser2.XML && propertyAttribute.local === "lang") {
            activeTag.language = propertyAttribute.value === "" ? null : propertyAttribute.value.toLowerCase();
            continue;
          } else if (propertyAttribute.uri === RdfXmlParser2.ITS && propertyAttribute.local === "dir") {
            this.setDirection(activeTag, propertyAttribute.value);
            continue;
          } else if (propertyAttribute.uri === RdfXmlParser2.ITS && propertyAttribute.local === "version") {
            continue;
          }
          if (propertyAttribute.prefix !== "xml" && propertyAttribute.prefix !== "xmlns" && (propertyAttribute.prefix !== "" || propertyAttribute.local !== "xmlns") && propertyAttribute.uri) {
            if (parseType || activeTag.datatype) {
              throw this.newParseError(`Found illegal rdf:* properties on property element with attribute: ${propertyAttribute.value}`);
            }
            activeTag.hadChildren = true;
            attributedProperty = true;
            predicates.push(this.uriToNamedNode(propertyAttribute.uri + propertyAttribute.local));
            objects.push(this.createLiteral(propertyAttribute.value, activeTag));
          }
        }
        if (activeSubSubjectValue !== null) {
          const subjectParent = activeTag.subject;
          activeTag.subject = subSubjectValueBlank ? this.dataFactory.blankNode(activeSubSubjectValue) : this.valueToUri(activeSubSubjectValue, activeTag);
          this.emitTriple(subjectParent, activeTag.predicate, activeTag.subject, activeTag.reifiedStatementId, activeTag.childrenTripleTerms, activeTag.reifier);
          for (let i = 0; i < predicates.length; i++) {
            this.emitTriple(activeTag.subject, predicates[i], objects[i], null, activeTag.childrenTripleTerms, activeTag.reifier);
          }
          activeTag.predicateEmitted = true;
        } else if (subSubjectValueBlank) {
          activeTag.predicateSubPredicates = predicates;
          activeTag.predicateSubObjects = objects;
          activeTag.predicateEmitted = false;
        }
      }
      /**
       * Emit the given triple to the stream.
       * @param {Term} subject A subject term.
       * @param {Term} predicate A predicate term.
       * @param {Term} object An object term.
       * @param {Term} statementId An optional resource that identifies the triple.
       *                           If truthy, then the given triple will also be emitted reified.
       * @param childrenTripleTerms An optional array to push quads into instead of emitting them.
       * @param reifier The reifier to emit this triple under.
       */
      emitTriple(subject, predicate, object, statementId, childrenTripleTerms, reifier) {
        const quad2 = this.dataFactory.quad(subject, predicate, object, this.defaultGraph);
        if (childrenTripleTerms) {
          childrenTripleTerms.push(quad2);
        } else {
          this.push(quad2);
        }
        if (reifier) {
          this.push(this.dataFactory.quad(reifier, this.dataFactory.namedNode(RdfXmlParser2.RDF + "reifies"), quad2));
        }
        if (statementId) {
          this.push(this.dataFactory.quad(statementId, this.dataFactory.namedNode(RdfXmlParser2.RDF + "type"), this.dataFactory.namedNode(RdfXmlParser2.RDF + "Statement"), this.defaultGraph));
          this.push(this.dataFactory.quad(statementId, this.dataFactory.namedNode(RdfXmlParser2.RDF + "subject"), subject, this.defaultGraph));
          this.push(this.dataFactory.quad(statementId, this.dataFactory.namedNode(RdfXmlParser2.RDF + "predicate"), predicate, this.defaultGraph));
          this.push(this.dataFactory.quad(statementId, this.dataFactory.namedNode(RdfXmlParser2.RDF + "object"), object, this.defaultGraph));
        }
      }
      /**
       * Register the given term as a node ID.
       * If one was already registered, this will emit an error.
       *
       * This is used to check duplicate occurrences of rdf:ID in scope of the baseIRI.
       * @param {Term} term An RDF term.
       */
      claimNodeId(term) {
        if (!this.allowDuplicateRdfIds) {
          if (this.nodeIds[term.value]) {
            throw this.newParseError(`Found multiple occurrences of rdf:ID='${term.value}'.`);
          }
          this.nodeIds[term.value] = true;
        }
      }
      /**
       * Handle the given text string.
       * @param {string} text A parsed text string.
       */
      onText(text) {
        const activeTag = this.activeTagStack.length ? this.activeTagStack[this.activeTagStack.length - 1] : null;
        if (activeTag) {
          if (activeTag.childrenStringTags) {
            activeTag.childrenStringTags.push(text);
          } else if (activeTag.predicate) {
            activeTag.text = text;
          }
        }
      }
      /**
       * Handle the closing of the last tag.
       */
      onCloseTag() {
        const poppedTag = this.activeTagStack.pop();
        const parentTag = this.activeTagStack.length ? this.activeTagStack[this.activeTagStack.length - 1] : null;
        if (poppedTag.childrenStringEmitClosingTag) {
          poppedTag.childrenStringTags.push(poppedTag.childrenStringEmitClosingTag);
        }
        if (poppedTag.childrenTagsToString) {
          poppedTag.datatype = this.dataFactory.namedNode(RdfXmlParser2.RDF + "XMLLiteral");
          poppedTag.text = poppedTag.childrenStringTags.join("");
          poppedTag.hadChildren = false;
        }
        if (poppedTag.childrenTagsToTripleTerms && poppedTag.predicate && poppedTag.rdfVersion) {
          if (poppedTag.childrenTripleTerms.length !== 1) {
            throw this.newParseError(`Expected exactly one triple term in rdf:parseType="Triple" but got ${poppedTag.childrenTripleTerms.length}`);
          }
          for (const tripleTerm of poppedTag.childrenTripleTerms) {
            this.emitTriple(poppedTag.subject, poppedTag.predicate, tripleTerm, null, parentTag.childrenTripleTerms, parentTag.reifier);
          }
          poppedTag.predicateEmitted = true;
        }
        if (poppedTag.childrenCollectionSubject) {
          this.emitTriple(poppedTag.childrenCollectionSubject, poppedTag.childrenCollectionPredicate, this.dataFactory.namedNode(RdfXmlParser2.RDF + "nil"), null, poppedTag.childrenTripleTerms);
        } else if (poppedTag.predicate) {
          if (!poppedTag.hadChildren && poppedTag.childrenParseType !== ParseType.PROPERTY) {
            this.emitTriple(poppedTag.subject, poppedTag.predicate, this.createLiteral(poppedTag.text || "", poppedTag), poppedTag.reifiedStatementId, poppedTag.childrenTripleTerms, poppedTag.reifier);
          } else if (!poppedTag.predicateEmitted) {
            const subject = this.dataFactory.blankNode();
            this.emitTriple(poppedTag.subject, poppedTag.predicate, subject, poppedTag.reifiedStatementId, poppedTag.childrenTripleTerms, poppedTag.reifier);
            for (let i = 0; i < poppedTag.predicateSubPredicates.length; i++) {
              this.emitTriple(subject, poppedTag.predicateSubPredicates[i], poppedTag.predicateSubObjects[i], null, poppedTag.childrenTripleTerms);
            }
          }
        }
      }
      /**
       * Fetch local DOCTYPE ENTITY's and make the parser recognise them.
       * @param {string} doctype The read doctype.
       */
      onDoctype(doctype) {
        doctype.replace(/<!ENTITY\s+([^\s]+)\s+["']([^"']+)["']\s*>/g, (match, prefix, uri) => {
          this.saxParser.ENTITIES[prefix] = uri;
          return "";
        });
      }
      setDirection(activeTag, value) {
        if (value) {
          if (value !== "ltr" && value !== "rtl") {
            throw this.newParseError(`Base directions must either be 'ltr' or 'rtl', while '${value}' was found.`);
          }
          activeTag.direction = value;
        } else {
          delete activeTag.direction;
        }
      }
      setVersion(activeTag, version) {
        activeTag.rdfVersion = version;
        this.emit("version", version);
        if (!this.isValidVersion(version)) {
          throw this.newParseError(`Detected unsupported version: ${version}`);
        }
      }
    };
    RdfXmlParser.RdfXmlParser = RdfXmlParser$1;
    RdfXmlParser$1.MIME_TYPE = "application/rdf+xml";
    RdfXmlParser$1.RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    RdfXmlParser$1.XML = "http://www.w3.org/XML/1998/namespace";
    RdfXmlParser$1.ITS = "http://www.w3.org/2005/11/its";
    RdfXmlParser$1.FORBIDDEN_NODE_ELEMENTS = [
      "RDF",
      "ID",
      "about",
      "bagID",
      "parseType",
      "resource",
      "nodeID",
      "li",
      "aboutEach",
      "aboutEachPrefix"
    ];
    RdfXmlParser$1.FORBIDDEN_PROPERTY_ELEMENTS = [
      "Description",
      "RDF",
      "ID",
      "about",
      "bagID",
      "parseType",
      "resource",
      "nodeID",
      "aboutEach",
      "aboutEachPrefix"
    ];
    RdfXmlParser$1.NCNAME_MATCHER = /^([A-Za-z\xC0-\xD6\xD8-\xF6\u{F8}-\u{2FF}\u{370}-\u{37D}\u{37F}-\u{1FFF}\u{200C}-\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}_])([A-Za-z\xC0-\xD6\xD8-\xF6\u{F8}-\u{2FF}\u{370}-\u{37D}\u{37F}-\u{1FFF}\u{200C}-\u{200D}\u{2070}-\u{218F}\u{2C00}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}_\-.0-9#xB7\u{0300}-\u{036F}\u{203F}-\u{2040}])*$/u;
    RdfXmlParser$1.SUPPORTED_VERSIONS = [
      "1.2",
      "1.2-basic",
      "1.1"
    ];
    var ParseType;
    (function(ParseType2) {
      ParseType2[ParseType2["RESOURCE"] = 0] = "RESOURCE";
      ParseType2[ParseType2["PROPERTY"] = 1] = "PROPERTY";
    })(ParseType || (RdfXmlParser.ParseType = ParseType = {}));
    return RdfXmlParser;
  }
  var hasRequiredRdfxmlStreamingParser;
  function requireRdfxmlStreamingParser() {
    if (hasRequiredRdfxmlStreamingParser) return rdfxmlStreamingParser;
    hasRequiredRdfxmlStreamingParser = 1;
    (function(exports$1) {
      var __createBinding = rdfxmlStreamingParser && rdfxmlStreamingParser.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = rdfxmlStreamingParser && rdfxmlStreamingParser.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(/* @__PURE__ */ requireRdfXmlParser(), exports$1);
    })(rdfxmlStreamingParser);
    return rdfxmlStreamingParser;
  }
  var rdfxmlStreamingParserExports = /* @__PURE__ */ requireRdfxmlStreamingParser();
  var jsonldStreamingParser = {};
  var JsonLdParser = {};
  var jsonparse;
  var hasRequiredJsonparse;
  function requireJsonparse() {
    if (hasRequiredJsonparse) return jsonparse;
    hasRequiredJsonparse = 1;
    var { Buffer: Buffer2 } = requireBuffer();
    var C = {};
    var LEFT_BRACE = C.LEFT_BRACE = 1;
    var RIGHT_BRACE = C.RIGHT_BRACE = 2;
    var LEFT_BRACKET = C.LEFT_BRACKET = 3;
    var RIGHT_BRACKET = C.RIGHT_BRACKET = 4;
    var COLON = C.COLON = 5;
    var COMMA = C.COMMA = 6;
    var TRUE = C.TRUE = 7;
    var FALSE = C.FALSE = 8;
    var NULL = C.NULL = 9;
    var STRING = C.STRING = 10;
    var NUMBER = C.NUMBER = 11;
    var START = C.START = 17;
    var STOP = C.STOP = 18;
    var TRUE1 = C.TRUE1 = 33;
    var TRUE2 = C.TRUE2 = 34;
    var TRUE3 = C.TRUE3 = 35;
    var FALSE1 = C.FALSE1 = 49;
    var FALSE2 = C.FALSE2 = 50;
    var FALSE3 = C.FALSE3 = 51;
    var FALSE4 = C.FALSE4 = 52;
    var NULL1 = C.NULL1 = 65;
    var NULL2 = C.NULL2 = 66;
    var NULL3 = C.NULL3 = 67;
    var NUMBER1 = C.NUMBER1 = 81;
    var NUMBER3 = C.NUMBER3 = 83;
    var STRING1 = C.STRING1 = 97;
    var STRING2 = C.STRING2 = 98;
    var STRING3 = C.STRING3 = 99;
    var STRING4 = C.STRING4 = 100;
    var STRING5 = C.STRING5 = 101;
    var STRING6 = C.STRING6 = 102;
    var VALUE = C.VALUE = 113;
    var KEY = C.KEY = 114;
    var OBJECT = C.OBJECT = 129;
    var ARRAY = C.ARRAY = 130;
    var BACK_SLASH = "\\".charCodeAt(0);
    var FORWARD_SLASH = "/".charCodeAt(0);
    var BACKSPACE = "\b".charCodeAt(0);
    var FORM_FEED = "\f".charCodeAt(0);
    var NEWLINE = "\n".charCodeAt(0);
    var CARRIAGE_RETURN = "\r".charCodeAt(0);
    var TAB = "	".charCodeAt(0);
    var STRING_BUFFER_SIZE = 64 * 1024;
    function alloc(size) {
      return Buffer2.alloc ? Buffer2.alloc(size) : new Buffer2(size);
    }
    function Parser() {
      this.tState = START;
      this.value = void 0;
      this.string = void 0;
      this.stringBuffer = alloc(STRING_BUFFER_SIZE);
      this.stringBufferOffset = 0;
      this.unicode = void 0;
      this.highSurrogate = void 0;
      this.key = void 0;
      this.mode = void 0;
      this.stack = [];
      this.state = VALUE;
      this.bytes_remaining = 0;
      this.bytes_in_sequence = 0;
      this.temp_buffs = { "2": alloc(2), "3": alloc(3), "4": alloc(4) };
      this.offset = -1;
    }
    Parser.toknam = function(code) {
      var keys = Object.keys(C);
      for (var i = 0, l = keys.length; i < l; i++) {
        var key = keys[i];
        if (C[key] === code) {
          return key;
        }
      }
      return code && "0x" + code.toString(16);
    };
    var proto = Parser.prototype;
    proto.onError = function(err) {
      throw err;
    };
    proto.charError = function(buffer2, i) {
      this.tState = STOP;
      this.onError(new Error("Unexpected " + JSON.stringify(String.fromCharCode(buffer2[i])) + " at position " + i + " in state " + Parser.toknam(this.tState)));
    };
    proto.appendStringChar = function(char) {
      if (this.stringBufferOffset >= STRING_BUFFER_SIZE) {
        this.string += this.stringBuffer.toString("utf8");
        this.stringBufferOffset = 0;
      }
      this.stringBuffer[this.stringBufferOffset++] = char;
    };
    proto.appendStringBuf = function(buf, start, end) {
      var size = buf.length;
      if (typeof start === "number") {
        if (typeof end === "number") {
          if (end < 0) {
            size = buf.length - start + end;
          } else {
            size = end - start;
          }
        } else {
          size = buf.length - start;
        }
      }
      if (size < 0) {
        size = 0;
      }
      if (this.stringBufferOffset + size > STRING_BUFFER_SIZE) {
        this.string += this.stringBuffer.toString("utf8", 0, this.stringBufferOffset);
        this.stringBufferOffset = 0;
      }
      buf.copy(this.stringBuffer, this.stringBufferOffset, start, end);
      this.stringBufferOffset += size;
    };
    proto.write = function(buffer2) {
      if (typeof buffer2 === "string") buffer2 = new Buffer2(buffer2);
      var n;
      for (var i = 0, l = buffer2.length; i < l; i++) {
        if (this.tState === START) {
          n = buffer2[i];
          this.offset++;
          if (n === 123) {
            this.onToken(LEFT_BRACE, "{");
          } else if (n === 125) {
            this.onToken(RIGHT_BRACE, "}");
          } else if (n === 91) {
            this.onToken(LEFT_BRACKET, "[");
          } else if (n === 93) {
            this.onToken(RIGHT_BRACKET, "]");
          } else if (n === 58) {
            this.onToken(COLON, ":");
          } else if (n === 44) {
            this.onToken(COMMA, ",");
          } else if (n === 116) {
            this.tState = TRUE1;
          } else if (n === 102) {
            this.tState = FALSE1;
          } else if (n === 110) {
            this.tState = NULL1;
          } else if (n === 34) {
            this.string = "";
            this.stringBufferOffset = 0;
            this.tState = STRING1;
          } else if (n === 45) {
            this.string = "-";
            this.tState = NUMBER1;
          } else {
            if (n >= 48 && n < 64) {
              this.string = String.fromCharCode(n);
              this.tState = NUMBER3;
            } else if (n === 32 || n === 9 || n === 10 || n === 13) ;
            else {
              return this.charError(buffer2, i);
            }
          }
        } else if (this.tState === STRING1) {
          n = buffer2[i];
          if (this.bytes_remaining > 0) {
            for (var j = 0; j < this.bytes_remaining; j++) {
              this.temp_buffs[this.bytes_in_sequence][this.bytes_in_sequence - this.bytes_remaining + j] = buffer2[j];
            }
            this.appendStringBuf(this.temp_buffs[this.bytes_in_sequence]);
            this.bytes_in_sequence = this.bytes_remaining = 0;
            i = i + j - 1;
          } else if (this.bytes_remaining === 0 && n >= 128) {
            if (n <= 193 || n > 244) {
              return this.onError(new Error("Invalid UTF-8 character at position " + i + " in state " + Parser.toknam(this.tState)));
            }
            if (n >= 194 && n <= 223) this.bytes_in_sequence = 2;
            if (n >= 224 && n <= 239) this.bytes_in_sequence = 3;
            if (n >= 240 && n <= 244) this.bytes_in_sequence = 4;
            if (this.bytes_in_sequence + i > buffer2.length) {
              for (var k = 0; k <= buffer2.length - 1 - i; k++) {
                this.temp_buffs[this.bytes_in_sequence][k] = buffer2[i + k];
              }
              this.bytes_remaining = i + this.bytes_in_sequence - buffer2.length;
              i = buffer2.length - 1;
            } else {
              this.appendStringBuf(buffer2, i, i + this.bytes_in_sequence);
              i = i + this.bytes_in_sequence - 1;
            }
          } else if (n === 34) {
            this.tState = START;
            this.string += this.stringBuffer.toString("utf8", 0, this.stringBufferOffset);
            this.stringBufferOffset = 0;
            this.onToken(STRING, this.string);
            this.offset += Buffer2.byteLength(this.string, "utf8") + 1;
            this.string = void 0;
          } else if (n === 92) {
            this.tState = STRING2;
          } else if (n >= 32) {
            this.appendStringChar(n);
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === STRING2) {
          n = buffer2[i];
          if (n === 34) {
            this.appendStringChar(n);
            this.tState = STRING1;
          } else if (n === 92) {
            this.appendStringChar(BACK_SLASH);
            this.tState = STRING1;
          } else if (n === 47) {
            this.appendStringChar(FORWARD_SLASH);
            this.tState = STRING1;
          } else if (n === 98) {
            this.appendStringChar(BACKSPACE);
            this.tState = STRING1;
          } else if (n === 102) {
            this.appendStringChar(FORM_FEED);
            this.tState = STRING1;
          } else if (n === 110) {
            this.appendStringChar(NEWLINE);
            this.tState = STRING1;
          } else if (n === 114) {
            this.appendStringChar(CARRIAGE_RETURN);
            this.tState = STRING1;
          } else if (n === 116) {
            this.appendStringChar(TAB);
            this.tState = STRING1;
          } else if (n === 117) {
            this.unicode = "";
            this.tState = STRING3;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === STRING3 || this.tState === STRING4 || this.tState === STRING5 || this.tState === STRING6) {
          n = buffer2[i];
          if (n >= 48 && n < 64 || n > 64 && n <= 70 || n > 96 && n <= 102) {
            this.unicode += String.fromCharCode(n);
            if (this.tState++ === STRING6) {
              var intVal = parseInt(this.unicode, 16);
              this.unicode = void 0;
              if (this.highSurrogate !== void 0 && intVal >= 56320 && intVal < 57343 + 1) {
                this.appendStringBuf(new Buffer2(String.fromCharCode(this.highSurrogate, intVal)));
                this.highSurrogate = void 0;
              } else if (this.highSurrogate === void 0 && intVal >= 55296 && intVal < 56319 + 1) {
                this.highSurrogate = intVal;
              } else {
                if (this.highSurrogate !== void 0) {
                  this.appendStringBuf(new Buffer2(String.fromCharCode(this.highSurrogate)));
                  this.highSurrogate = void 0;
                }
                this.appendStringBuf(new Buffer2(String.fromCharCode(intVal)));
              }
              this.tState = STRING1;
            }
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === NUMBER1 || this.tState === NUMBER3) {
          n = buffer2[i];
          switch (n) {
            case 48:
            // 0
            case 49:
            // 1
            case 50:
            // 2
            case 51:
            // 3
            case 52:
            // 4
            case 53:
            // 5
            case 54:
            // 6
            case 55:
            // 7
            case 56:
            // 8
            case 57:
            // 9
            case 46:
            // .
            case 101:
            // e
            case 69:
            // E
            case 43:
            // +
            case 45:
              this.string += String.fromCharCode(n);
              this.tState = NUMBER3;
              break;
            default:
              this.tState = START;
              var error = this.numberReviver(this.string, buffer2, i);
              if (error) {
                return error;
              }
              this.offset += this.string.length - 1;
              this.string = void 0;
              i--;
              break;
          }
        } else if (this.tState === TRUE1) {
          if (buffer2[i] === 114) {
            this.tState = TRUE2;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === TRUE2) {
          if (buffer2[i] === 117) {
            this.tState = TRUE3;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === TRUE3) {
          if (buffer2[i] === 101) {
            this.tState = START;
            this.onToken(TRUE, true);
            this.offset += 3;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === FALSE1) {
          if (buffer2[i] === 97) {
            this.tState = FALSE2;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === FALSE2) {
          if (buffer2[i] === 108) {
            this.tState = FALSE3;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === FALSE3) {
          if (buffer2[i] === 115) {
            this.tState = FALSE4;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === FALSE4) {
          if (buffer2[i] === 101) {
            this.tState = START;
            this.onToken(FALSE, false);
            this.offset += 4;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === NULL1) {
          if (buffer2[i] === 117) {
            this.tState = NULL2;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === NULL2) {
          if (buffer2[i] === 108) {
            this.tState = NULL3;
          } else {
            return this.charError(buffer2, i);
          }
        } else if (this.tState === NULL3) {
          if (buffer2[i] === 108) {
            this.tState = START;
            this.onToken(NULL, null);
            this.offset += 3;
          } else {
            return this.charError(buffer2, i);
          }
        }
      }
    };
    proto.onToken = function(token, value) {
    };
    proto.parseError = function(token, value) {
      this.tState = STOP;
      this.onError(new Error("Unexpected " + Parser.toknam(token) + (value ? "(" + JSON.stringify(value) + ")" : "") + " in state " + Parser.toknam(this.state)));
    };
    proto.push = function() {
      this.stack.push({ value: this.value, key: this.key, mode: this.mode });
    };
    proto.pop = function() {
      var value = this.value;
      var parent = this.stack.pop();
      this.value = parent.value;
      this.key = parent.key;
      this.mode = parent.mode;
      this.emit(value);
      if (!this.mode) {
        this.state = VALUE;
      }
    };
    proto.emit = function(value) {
      if (this.mode) {
        this.state = COMMA;
      }
      this.onValue(value);
    };
    proto.onValue = function(value) {
    };
    proto.onToken = function(token, value) {
      if (this.state === VALUE) {
        if (token === STRING || token === NUMBER || token === TRUE || token === FALSE || token === NULL) {
          if (this.value) {
            this.value[this.key] = value;
          }
          this.emit(value);
        } else if (token === LEFT_BRACE) {
          this.push();
          if (this.value) {
            this.value = this.value[this.key] = {};
          } else {
            this.value = {};
          }
          this.key = void 0;
          this.state = KEY;
          this.mode = OBJECT;
        } else if (token === LEFT_BRACKET) {
          this.push();
          if (this.value) {
            this.value = this.value[this.key] = [];
          } else {
            this.value = [];
          }
          this.key = 0;
          this.mode = ARRAY;
          this.state = VALUE;
        } else if (token === RIGHT_BRACE) {
          if (this.mode === OBJECT) {
            this.pop();
          } else {
            return this.parseError(token, value);
          }
        } else if (token === RIGHT_BRACKET) {
          if (this.mode === ARRAY) {
            this.pop();
          } else {
            return this.parseError(token, value);
          }
        } else {
          return this.parseError(token, value);
        }
      } else if (this.state === KEY) {
        if (token === STRING) {
          this.key = value;
          this.state = COLON;
        } else if (token === RIGHT_BRACE) {
          this.pop();
        } else {
          return this.parseError(token, value);
        }
      } else if (this.state === COLON) {
        if (token === COLON) {
          this.state = VALUE;
        } else {
          return this.parseError(token, value);
        }
      } else if (this.state === COMMA) {
        if (token === COMMA) {
          if (this.mode === ARRAY) {
            this.key++;
            this.state = VALUE;
          } else if (this.mode === OBJECT) {
            this.state = KEY;
          }
        } else if (token === RIGHT_BRACKET && this.mode === ARRAY || token === RIGHT_BRACE && this.mode === OBJECT) {
          this.pop();
        } else {
          return this.parseError(token, value);
        }
      } else {
        return this.parseError(token, value);
      }
    };
    proto.numberReviver = function(text, buffer2, i) {
      var result = Number(text);
      if (isNaN(result)) {
        return this.charError(buffer2, i);
      }
      if (text.match(/[0-9]+/) == text && result.toString() != text) {
        this.onToken(STRING, text);
      } else {
        this.onToken(NUMBER, result);
      }
    };
    Parser.C = C;
    jsonparse = Parser;
    return jsonparse;
  }
  var jsonldContextParser = {};
  var ContextParser = {};
  var ErrorCoded = {};
  var hasRequiredErrorCoded;
  function requireErrorCoded() {
    if (hasRequiredErrorCoded) return ErrorCoded;
    hasRequiredErrorCoded = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.ERROR_CODES = exports$1.ErrorCoded = void 0;
      class ErrorCoded2 extends Error {
        /* istanbul ignore next */
        constructor(message, code) {
          super(message);
          this.code = code;
        }
      }
      exports$1.ErrorCoded = ErrorCoded2;
      (function(ERROR_CODES) {
        ERROR_CODES["COLLIDING_KEYWORDS"] = "colliding keywords";
        ERROR_CODES["CONFLICTING_INDEXES"] = "conflicting indexes";
        ERROR_CODES["CYCLIC_IRI_MAPPING"] = "cyclic IRI mapping";
        ERROR_CODES["INVALID_ID_VALUE"] = "invalid @id value";
        ERROR_CODES["INVALID_INDEX_VALUE"] = "invalid @index value";
        ERROR_CODES["INVALID_NEST_VALUE"] = "invalid @nest value";
        ERROR_CODES["INVALID_PREFIX_VALUE"] = "invalid @prefix value";
        ERROR_CODES["INVALID_PROPAGATE_VALUE"] = "invalid @propagate value";
        ERROR_CODES["INVALID_REVERSE_VALUE"] = "invalid @reverse value";
        ERROR_CODES["INVALID_IMPORT_VALUE"] = "invalid @import value";
        ERROR_CODES["INVALID_VERSION_VALUE"] = "invalid @version value";
        ERROR_CODES["INVALID_BASE_IRI"] = "invalid base IRI";
        ERROR_CODES["INVALID_CONTAINER_MAPPING"] = "invalid container mapping";
        ERROR_CODES["INVALID_CONTEXT_ENTRY"] = "invalid context entry";
        ERROR_CODES["INVALID_CONTEXT_NULLIFICATION"] = "invalid context nullification";
        ERROR_CODES["INVALID_DEFAULT_LANGUAGE"] = "invalid default language";
        ERROR_CODES["INVALID_INCLUDED_VALUE"] = "invalid @included value";
        ERROR_CODES["INVALID_IRI_MAPPING"] = "invalid IRI mapping";
        ERROR_CODES["INVALID_JSON_LITERAL"] = "invalid JSON literal";
        ERROR_CODES["INVALID_KEYWORD_ALIAS"] = "invalid keyword alias";
        ERROR_CODES["INVALID_LANGUAGE_MAP_VALUE"] = "invalid language map value";
        ERROR_CODES["INVALID_LANGUAGE_MAPPING"] = "invalid language mapping";
        ERROR_CODES["INVALID_LANGUAGE_TAGGED_STRING"] = "invalid language-tagged string";
        ERROR_CODES["INVALID_LANGUAGE_TAGGED_VALUE"] = "invalid language-tagged value";
        ERROR_CODES["INVALID_LOCAL_CONTEXT"] = "invalid local context";
        ERROR_CODES["INVALID_REMOTE_CONTEXT"] = "invalid remote context";
        ERROR_CODES["INVALID_REVERSE_PROPERTY"] = "invalid reverse property";
        ERROR_CODES["INVALID_REVERSE_PROPERTY_MAP"] = "invalid reverse property map";
        ERROR_CODES["INVALID_REVERSE_PROPERTY_VALUE"] = "invalid reverse property value";
        ERROR_CODES["INVALID_SCOPED_CONTEXT"] = "invalid scoped context";
        ERROR_CODES["INVALID_SCRIPT_ELEMENT"] = "invalid script element";
        ERROR_CODES["INVALID_SET_OR_LIST_OBJECT"] = "invalid set or list object";
        ERROR_CODES["INVALID_TERM_DEFINITION"] = "invalid term definition";
        ERROR_CODES["INVALID_TYPE_MAPPING"] = "invalid type mapping";
        ERROR_CODES["INVALID_TYPE_VALUE"] = "invalid type value";
        ERROR_CODES["INVALID_TYPED_VALUE"] = "invalid typed value";
        ERROR_CODES["INVALID_VALUE_OBJECT"] = "invalid value object";
        ERROR_CODES["INVALID_VALUE_OBJECT_VALUE"] = "invalid value object value";
        ERROR_CODES["INVALID_VOCAB_MAPPING"] = "invalid vocab mapping";
        ERROR_CODES["IRI_CONFUSED_WITH_PREFIX"] = "IRI confused with prefix";
        ERROR_CODES["KEYWORD_REDEFINITION"] = "keyword redefinition";
        ERROR_CODES["LOADING_DOCUMENT_FAILED"] = "loading document failed";
        ERROR_CODES["LOADING_REMOTE_CONTEXT_FAILED"] = "loading remote context failed";
        ERROR_CODES["MULTIPLE_CONTEXT_LINK_HEADERS"] = "multiple context link headers";
        ERROR_CODES["PROCESSING_MODE_CONFLICT"] = "processing mode conflict";
        ERROR_CODES["PROTECTED_TERM_REDEFINITION"] = "protected term redefinition";
        ERROR_CODES["CONTEXT_OVERFLOW"] = "context overflow";
        ERROR_CODES["INVALID_BASE_DIRECTION"] = "invalid base direction";
        ERROR_CODES["RECURSIVE_CONTEXT_INCLUSION"] = "recursive context inclusion";
        ERROR_CODES["INVALID_STREAMING_KEY_ORDER"] = "invalid streaming key order";
        ERROR_CODES["INVALID_EMBEDDED_NODE"] = "invalid embedded node";
        ERROR_CODES["INVALID_ANNOTATION"] = "invalid annotation";
      })(exports$1.ERROR_CODES || (exports$1.ERROR_CODES = {}));
    })(ErrorCoded);
    return ErrorCoded;
  }
  var FetchDocumentLoader = {};
  var link;
  var hasRequiredLink;
  function requireLink() {
    if (hasRequiredLink) return link;
    hasRequiredLink = 1;
    var COMPATIBLE_ENCODING_PATTERN = /^utf-?8|ascii|utf-?16-?le|ucs-?2|base-?64|latin-?1$/i;
    var WS_TRIM_PATTERN = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
    var WS_CHAR_PATTERN = /\s|\uFEFF|\xA0/;
    var WS_FOLD_PATTERN = /\r?\n[\x20\x09]+/g;
    var DELIMITER_PATTERN = /[;,"]/;
    var WS_DELIMITER_PATTERN = /[;,"]|\s/;
    var TOKEN_PATTERN = /^[!#$%&'*+\-\.^_`|~\da-zA-Z]+$/;
    var STATE = {
      IDLE: 1 << 0,
      URI: 1 << 1,
      ATTR: 1 << 2
    };
    function trim(value) {
      return value.replace(WS_TRIM_PATTERN, "");
    }
    function hasWhitespace(value) {
      return WS_CHAR_PATTERN.test(value);
    }
    function skipWhitespace(value, offset) {
      while (hasWhitespace(value[offset])) {
        offset++;
      }
      return offset;
    }
    function needsQuotes(value) {
      return WS_DELIMITER_PATTERN.test(value) || !TOKEN_PATTERN.test(value);
    }
    function shallowCompareObjects(object1, object2) {
      return Object.keys(object1).length === Object.keys(object2).length && Object.keys(object1).every(
        (key) => key in object2 && object1[key] === object2[key]
      );
    }
    class Link {
      /**
       * Link
       * @constructor
       * @param {String} [value]
       * @returns {Link}
       */
      constructor(value) {
        this.refs = [];
        if (value) {
          this.parse(value);
        }
      }
      /**
       * Get refs with given relation type
       * @param {String} value
       * @returns {Array<Object>}
       */
      rel(value) {
        var links = [];
        var type = value.toLowerCase();
        for (var i = 0; i < this.refs.length; i++) {
          if (typeof this.refs[i].rel === "string" && this.refs[i].rel.toLowerCase() === type) {
            links.push(this.refs[i]);
          }
        }
        return links;
      }
      /**
       * Get refs where given attribute has a given value
       * @param {String} attr
       * @param {String} value
       * @returns {Array<Object>}
       */
      get(attr, value) {
        attr = attr.toLowerCase();
        value = value.toLowerCase();
        var links = [];
        for (var i = 0; i < this.refs.length; i++) {
          if (typeof this.refs[i][attr] === "string" && this.refs[i][attr].toLowerCase() === value) {
            links.push(this.refs[i]);
          }
        }
        return links;
      }
      /** Sets a reference. */
      set(link2) {
        this.refs.push(link2);
        return this;
      }
      /**
       * Sets a reference if a reference with similar properties isn’t already set.
       */
      setUnique(link2) {
        if (!this.refs.some((ref) => shallowCompareObjects(ref, link2))) {
          this.refs.push(link2);
        }
        return this;
      }
      has(attr, value) {
        attr = attr.toLowerCase();
        value = value.toLowerCase();
        for (var i = 0; i < this.refs.length; i++) {
          if (typeof this.refs[i][attr] === "string" && this.refs[i][attr].toLowerCase() === value) {
            return true;
          }
        }
        return false;
      }
      parse(value, offset) {
        offset = offset || 0;
        value = offset ? value.slice(offset) : value;
        value = trim(value).replace(WS_FOLD_PATTERN, "");
        var state2 = STATE.IDLE;
        var length = value.length;
        var offset = 0;
        var ref = null;
        while (offset < length) {
          if (state2 === STATE.IDLE) {
            if (hasWhitespace(value[offset])) {
              offset++;
              continue;
            } else if (value[offset] === "<") {
              if (ref != null) {
                ref.rel != null ? this.refs.push(...Link.expandRelations(ref)) : this.refs.push(ref);
              }
              var end = value.indexOf(">", offset);
              if (end === -1) throw new Error("Expected end of URI delimiter at offset " + offset);
              ref = { uri: value.slice(offset + 1, end) };
              offset = end;
              state2 = STATE.URI;
            } else {
              throw new Error('Unexpected character "' + value[offset] + '" at offset ' + offset);
            }
            offset++;
          } else if (state2 === STATE.URI) {
            if (hasWhitespace(value[offset])) {
              offset++;
              continue;
            } else if (value[offset] === ";") {
              state2 = STATE.ATTR;
              offset++;
            } else if (value[offset] === ",") {
              state2 = STATE.IDLE;
              offset++;
            } else {
              throw new Error('Unexpected character "' + value[offset] + '" at offset ' + offset);
            }
          } else if (state2 === STATE.ATTR) {
            if (value[offset] === ";" || hasWhitespace(value[offset])) {
              offset++;
              continue;
            }
            var end = value.indexOf("=", offset);
            if (end === -1) end = value.indexOf(";", offset);
            if (end === -1) end = value.length;
            var attr = trim(value.slice(offset, end)).toLowerCase();
            var attrValue = "";
            offset = end + 1;
            offset = skipWhitespace(value, offset);
            if (value[offset] === '"') {
              offset++;
              while (offset < length) {
                if (value[offset] === '"') {
                  offset++;
                  break;
                }
                if (value[offset] === "\\") {
                  offset++;
                }
                attrValue += value[offset];
                offset++;
              }
            } else {
              var end = offset + 1;
              while (!DELIMITER_PATTERN.test(value[end]) && end < length) {
                end++;
              }
              attrValue = value.slice(offset, end);
              offset = end;
            }
            if (ref[attr] && Link.isSingleOccurenceAttr(attr)) ;
            else if (attr[attr.length - 1] === "*") {
              ref[attr] = Link.parseExtendedValue(attrValue);
            } else {
              attrValue = attr === "type" ? attrValue.toLowerCase() : attrValue;
              if (ref[attr] != null) {
                if (Array.isArray(ref[attr])) {
                  ref[attr].push(attrValue);
                } else {
                  ref[attr] = [ref[attr], attrValue];
                }
              } else {
                ref[attr] = attrValue;
              }
            }
            switch (value[offset]) {
              case ",":
                state2 = STATE.IDLE;
                break;
              case ";":
                state2 = STATE.ATTR;
                break;
            }
            offset++;
          } else {
            throw new Error('Unknown parser state "' + state2 + '"');
          }
        }
        if (ref != null) {
          ref.rel != null ? this.refs.push(...Link.expandRelations(ref)) : this.refs.push(ref);
        }
        ref = null;
        return this;
      }
      toString() {
        var refs = [];
        var link2 = "";
        var ref = null;
        for (var i = 0; i < this.refs.length; i++) {
          ref = this.refs[i];
          link2 = Object.keys(this.refs[i]).reduce(function(link3, attr) {
            if (attr === "uri") return link3;
            return link3 + "; " + Link.formatAttribute(attr, ref[attr]);
          }, "<" + ref.uri + ">");
          refs.push(link2);
        }
        return refs.join(", ");
      }
    }
    Link.isCompatibleEncoding = function(value) {
      return COMPATIBLE_ENCODING_PATTERN.test(value);
    };
    Link.parse = function(value, offset) {
      return new Link().parse(value, offset);
    };
    Link.isSingleOccurenceAttr = function(attr) {
      return attr === "rel" || attr === "type" || attr === "media" || attr === "title" || attr === "title*";
    };
    Link.isTokenAttr = function(attr) {
      return attr === "rel" || attr === "type" || attr === "anchor";
    };
    Link.escapeQuotes = function(value) {
      return value.replace(/"/g, '\\"');
    };
    Link.expandRelations = function(ref) {
      var rels = ref.rel.split(" ");
      return rels.map(function(rel) {
        var value = Object.assign({}, ref);
        value.rel = rel;
        return value;
      });
    };
    Link.parseExtendedValue = function(value) {
      var parts = /([^']+)?(?:'([^']*)')?(.+)/.exec(value);
      return {
        language: parts[2].toLowerCase(),
        encoding: Link.isCompatibleEncoding(parts[1]) ? null : parts[1].toLowerCase(),
        value: Link.isCompatibleEncoding(parts[1]) ? decodeURIComponent(parts[3]) : parts[3]
      };
    };
    Link.formatExtendedAttribute = function(attr, data) {
      var encoding = (data.encoding || "utf-8").toUpperCase();
      var language = data.language || "en";
      var encodedValue = "";
      if (Buffer.isBuffer(data.value) && Link.isCompatibleEncoding(encoding)) {
        encodedValue = data.value.toString(encoding);
      } else if (Buffer.isBuffer(data.value)) {
        encodedValue = data.value.toString("hex").replace(/[0-9a-f]{2}/gi, "%$1");
      } else {
        encodedValue = encodeURIComponent(data.value);
      }
      return attr + "=" + encoding + "'" + language + "'" + encodedValue;
    };
    Link.formatAttribute = function(attr, value) {
      if (Array.isArray(value)) {
        return value.map((item) => {
          return Link.formatAttribute(attr, item);
        }).join("; ");
      }
      if (attr[attr.length - 1] === "*" || typeof value !== "string") {
        return Link.formatExtendedAttribute(attr, value);
      }
      if (Link.isTokenAttr(attr)) {
        value = needsQuotes(value) ? '"' + Link.escapeQuotes(value) + '"' : Link.escapeQuotes(value);
      } else if (needsQuotes(value)) {
        value = encodeURIComponent(value);
        value = value.replace(/%20/g, " ").replace(/%2C/g, ",").replace(/%3B/g, ";");
        value = '"' + value + '"';
      }
      return attr + "=" + value;
    };
    link = Link;
    return link;
  }
  var hasRequiredFetchDocumentLoader;
  function requireFetchDocumentLoader() {
    if (hasRequiredFetchDocumentLoader) return FetchDocumentLoader;
    hasRequiredFetchDocumentLoader = 1;
    Object.defineProperty(FetchDocumentLoader, "__esModule", { value: true });
    FetchDocumentLoader.FetchDocumentLoader = void 0;
    const ErrorCoded_1 = /* @__PURE__ */ requireErrorCoded();
    const http_link_header_1 = requireLink();
    const relative_to_absolute_iri_1 = requireRelativeToAbsoluteIri();
    let FetchDocumentLoader$1 = class FetchDocumentLoader {
      constructor(fetcher) {
        this.fetcher = fetcher;
      }
      async load(url) {
        const response = await (this.fetcher || fetch)(url, { headers: new Headers({ accept: "application/ld+json" }) });
        if (response.ok && response.headers) {
          let mediaType = response.headers.get("Content-Type");
          if (mediaType) {
            const colonPos = mediaType.indexOf(";");
            if (colonPos > 0) {
              mediaType = mediaType.substr(0, colonPos);
            }
          }
          if (mediaType === "application/ld+json") {
            return await response.json();
          } else {
            if (response.headers.has("Link")) {
              let alternateUrl;
              response.headers.forEach((value, key) => {
                if (key === "link") {
                  const linkHeader = (0, http_link_header_1.parse)(value);
                  for (const link2 of linkHeader.get("type", "application/ld+json")) {
                    if (link2.rel === "alternate") {
                      if (alternateUrl) {
                        throw new Error("Multiple JSON-LD alternate links were found on " + url);
                      }
                      alternateUrl = (0, relative_to_absolute_iri_1.resolve)(link2.uri, url);
                    }
                  }
                }
              });
              if (alternateUrl) {
                return this.load(alternateUrl);
              }
            }
            throw new ErrorCoded_1.ErrorCoded(`Unsupported JSON-LD media type ${mediaType}`, ErrorCoded_1.ERROR_CODES.LOADING_DOCUMENT_FAILED);
          }
        } else {
          throw new Error(response.statusText || `Status code: ${response.status}`);
        }
      }
    };
    FetchDocumentLoader.FetchDocumentLoader = FetchDocumentLoader$1;
    return FetchDocumentLoader;
  }
  var JsonLdContextNormalized = {};
  var Util$2 = {};
  var hasRequiredUtil$2;
  function requireUtil$2() {
    if (hasRequiredUtil$2) return Util$2;
    hasRequiredUtil$2 = 1;
    Object.defineProperty(Util$2, "__esModule", { value: true });
    Util$2.Util = void 0;
    class Util2 {
      /**
       * Check if the given term is a valid compact IRI.
       * Otherwise, it may be an IRI.
       * @param {string} term A term.
       * @return {boolean} If it is a compact IRI.
       */
      static isCompactIri(term) {
        return term.indexOf(":") > 0 && !(term && term[0] === "#");
      }
      /**
       * Get the prefix from the given term.
       * @see https://json-ld.org/spec/latest/json-ld/#compact-iris
       * @param {string} term A term that is an URL or a prefixed URL.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @return {string} The prefix or null.
       */
      static getPrefix(term, context) {
        if (term && term[0] === "#") {
          return null;
        }
        const separatorPos = term.indexOf(":");
        if (separatorPos >= 0) {
          if (term.length > separatorPos + 1 && term.charAt(separatorPos + 1) === "/" && term.charAt(separatorPos + 2) === "/") {
            return null;
          }
          const prefix = term.substr(0, separatorPos);
          if (prefix === "_") {
            return null;
          }
          if (context[prefix]) {
            return prefix;
          }
        }
        return null;
      }
      /**
       * From a given context entry value, get the string value, or the @id field.
       * @param contextValue A value for a term in a context.
       * @return {string} The id value, or null.
       */
      static getContextValueId(contextValue) {
        if (contextValue === null || typeof contextValue === "string") {
          return contextValue;
        }
        const id = contextValue["@id"];
        return id ? id : null;
      }
      /**
       * Check if the given simple term definition (string-based value of a context term)
       * should be considered a prefix.
       * @param value A simple term definition value.
       * @param options Options that define the way how expansion must be done.
       */
      static isSimpleTermDefinitionPrefix(value, options) {
        return !Util2.isPotentialKeyword(value) && (options.allowPrefixNonGenDelims || typeof value === "string" && (value[0] === "_" || Util2.isPrefixIriEndingWithGenDelim(value)));
      }
      /**
       * Check if the given keyword is of the keyword format "@"1*ALPHA.
       * @param {string} keyword A potential keyword.
       * @return {boolean} If the given keyword is of the keyword format.
       */
      static isPotentialKeyword(keyword) {
        return typeof keyword === "string" && Util2.KEYWORD_REGEX.test(keyword);
      }
      /**
       * Check if the given prefix ends with a gen-delim character.
       * @param {string} prefixIri A prefix IRI.
       * @return {boolean} If the given prefix IRI is valid.
       */
      static isPrefixIriEndingWithGenDelim(prefixIri) {
        return Util2.ENDS_WITH_GEN_DELIM.test(prefixIri);
      }
      /**
       * Check if the given context value can be a prefix value.
       * @param value A context value.
       * @return {boolean} If it can be a prefix value.
       */
      static isPrefixValue(value) {
        return value && (typeof value === "string" || value && typeof value === "object");
      }
      /**
       * Check if the given IRI is valid.
       * @param {string} iri A potential IRI.
       * @return {boolean} If the given IRI is valid.
       */
      static isValidIri(iri) {
        return Boolean(iri && Util2.IRI_REGEX.test(iri));
      }
      /**
       * Check if the given IRI is valid, this includes the possibility of being a relative IRI.
       * @param {string} iri A potential IRI.
       * @return {boolean} If the given IRI is valid.
       */
      static isValidIriWeak(iri) {
        return !!iri && iri[0] !== ":" && Util2.IRI_REGEX_WEAK.test(iri);
      }
      /**
       * Check if the given keyword is a defined according to the JSON-LD specification.
       * @param {string} keyword A potential keyword.
       * @return {boolean} If the given keyword is valid.
       */
      static isValidKeyword(keyword) {
        return Util2.VALID_KEYWORDS[keyword];
      }
      /**
       * Check if the given term is protected in the context.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {string} key A context term.
       * @return {boolean} If the given term has an @protected flag.
       */
      static isTermProtected(context, key) {
        const value = context[key];
        return !(typeof value === "string") && value && value["@protected"];
      }
      /**
       * Check if the given context has at least one protected term.
       * @param context A context.
       * @return If the context has a protected term.
       */
      static hasProtectedTerms(context) {
        for (const key of Object.keys(context)) {
          if (Util2.isTermProtected(context, key)) {
            return true;
          }
        }
        return false;
      }
      /**
       * Check if the given key is an internal reserved keyword.
       * @param key A context key.
       */
      static isReservedInternalKeyword(key) {
        return key.startsWith("@__");
      }
      /**
       * Check if two objects are deepEqual to on another.
       * @param object1 The first object to test.
       * @param object2 The second object to test.
       */
      static deepEqual(object1, object2) {
        const objKeys1 = Object.keys(object1);
        const objKeys2 = Object.keys(object2);
        if (objKeys1.length !== objKeys2.length)
          return false;
        return objKeys1.every((key) => {
          const value1 = object1[key];
          const value2 = object2[key];
          return value1 === value2 || value1 !== null && value2 !== null && typeof value1 === "object" && typeof value2 === "object" && this.deepEqual(value1, value2);
        });
      }
    }
    Util2.IRI_REGEX = /^([A-Za-z][A-Za-z0-9+-.]*|_):[^ "<>{}|\\\[\]`#]*(#[^#]*)?$/;
    Util2.IRI_REGEX_WEAK = /(?::[^:])|\//;
    Util2.KEYWORD_REGEX = /^@[a-z]+$/i;
    Util2.ENDS_WITH_GEN_DELIM = /[:/?#\[\]@]$/;
    Util2.REGEX_LANGUAGE_TAG = /^[a-zA-Z]+(-[a-zA-Z0-9]+)*$/;
    Util2.REGEX_DIRECTION_TAG = /^(ltr)|(rtl)$/;
    Util2.VALID_KEYWORDS = {
      "@annotation": true,
      "@base": true,
      "@container": true,
      "@context": true,
      "@direction": true,
      "@graph": true,
      "@id": true,
      "@import": true,
      "@included": true,
      "@index": true,
      "@json": true,
      "@language": true,
      "@list": true,
      "@nest": true,
      "@none": true,
      "@prefix": true,
      "@propagate": true,
      "@protected": true,
      "@reverse": true,
      "@set": true,
      "@type": true,
      "@value": true,
      "@version": true,
      "@vocab": true
    };
    Util2.EXPAND_KEYS_BLACKLIST = [
      "@base",
      "@vocab",
      "@language",
      "@version",
      "@direction"
    ];
    Util2.ALIAS_DOMAIN_BLACKLIST = [
      "@container",
      "@graph",
      "@id",
      "@index",
      "@list",
      "@nest",
      "@none",
      "@prefix",
      "@reverse",
      "@set",
      "@type",
      "@value",
      "@version"
    ];
    Util2.ALIAS_RANGE_BLACKLIST = [
      "@context",
      "@preserve"
    ];
    Util2.CONTAINERS = [
      "@list",
      "@set",
      "@index",
      "@language",
      "@graph",
      "@id",
      "@type"
    ];
    Util2.CONTAINERS_1_0 = [
      "@list",
      "@set",
      "@index"
    ];
    Util$2.Util = Util2;
    return Util$2;
  }
  var hasRequiredJsonLdContextNormalized;
  function requireJsonLdContextNormalized() {
    if (hasRequiredJsonLdContextNormalized) return JsonLdContextNormalized;
    hasRequiredJsonLdContextNormalized = 1;
    (function(exports$1) {
      Object.defineProperty(exports$1, "__esModule", { value: true });
      exports$1.defaultExpandOptions = exports$1.JsonLdContextNormalized = void 0;
      const relative_to_absolute_iri_1 = requireRelativeToAbsoluteIri();
      const ErrorCoded_1 = /* @__PURE__ */ requireErrorCoded();
      const Util_1 = /* @__PURE__ */ requireUtil$2();
      class JsonLdContextNormalized2 {
        constructor(contextRaw) {
          this.contextRaw = contextRaw;
        }
        /**
         * @return The raw inner context.
         */
        getContextRaw() {
          return this.contextRaw;
        }
        /**
         * Expand the term or prefix of the given term if it has one,
         * otherwise return the term as-is.
         *
         * This will try to expand the IRI as much as possible.
         *
         * Iff in vocab-mode, then other references to other terms in the context can be used,
         * such as to `myTerm`:
         * ```
         * {
         *   "myTerm": "http://example.org/myLongTerm"
         * }
         * ```
         *
         * @param {string} term A term that is an URL or a prefixed URL.
         * @param {boolean} expandVocab If the term is a predicate or type and should be expanded based on @vocab,
         *                              otherwise it is considered a regular term that is expanded based on @base.
         * @param {IExpandOptions} options Options that define the way how expansion must be done.
         * @return {string} The expanded term, the term as-is, or null if it was explicitly disabled in the context.
         * @throws If the term is aliased to an invalid value (not a string, IRI or keyword).
         */
        expandTerm(term, expandVocab, options = exports$1.defaultExpandOptions) {
          const contextValue = this.contextRaw[term];
          if (contextValue === null || contextValue && contextValue["@id"] === null) {
            return null;
          }
          let validIriMapping = true;
          if (contextValue && expandVocab) {
            const value = Util_1.Util.getContextValueId(contextValue);
            if (value && value !== term) {
              if (typeof value !== "string" || !Util_1.Util.isValidIri(value) && !Util_1.Util.isValidKeyword(value)) {
                if (!Util_1.Util.isPotentialKeyword(value)) {
                  validIriMapping = false;
                }
              } else {
                return value;
              }
            }
          }
          const prefix = Util_1.Util.getPrefix(term, this.contextRaw);
          const vocab = this.contextRaw["@vocab"];
          const vocabRelative = (!!vocab || vocab === "") && vocab.indexOf(":") < 0;
          const base = this.contextRaw["@base"];
          const potentialKeyword = Util_1.Util.isPotentialKeyword(term);
          if (prefix) {
            const contextPrefixValue = this.contextRaw[prefix];
            const value = Util_1.Util.getContextValueId(contextPrefixValue);
            if (value) {
              if (typeof contextPrefixValue === "string" || !options.allowPrefixForcing) {
                if (!Util_1.Util.isSimpleTermDefinitionPrefix(value, options)) {
                  return term;
                }
              } else {
                if (value[0] !== "_" && !potentialKeyword && !contextPrefixValue["@prefix"] && !(term in this.contextRaw)) {
                  return term;
                }
              }
              return value + term.substr(prefix.length + 1);
            }
          } else if (expandVocab && (vocab || vocab === "" || options.allowVocabRelativeToBase && (base && vocabRelative)) && !potentialKeyword && !Util_1.Util.isCompactIri(term)) {
            if (vocabRelative) {
              if (options.allowVocabRelativeToBase) {
                return (vocab || base ? (0, relative_to_absolute_iri_1.resolve)(vocab, base) : "") + term;
              } else {
                throw new ErrorCoded_1.ErrorCoded(`Relative vocab expansion for term '${term}' with vocab '${vocab}' is not allowed.`, ErrorCoded_1.ERROR_CODES.INVALID_VOCAB_MAPPING);
              }
            } else {
              return vocab + term;
            }
          } else if (!expandVocab && base && !potentialKeyword && !Util_1.Util.isCompactIri(term)) {
            return (0, relative_to_absolute_iri_1.resolve)(term, base);
          }
          if (validIriMapping) {
            return term;
          } else {
            throw new ErrorCoded_1.ErrorCoded(`Invalid IRI mapping found for context entry '${term}': '${JSON.stringify(contextValue)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
          }
        }
        /**
         * Compact the given term using @base, @vocab, an aliased term, or a prefixed term.
         *
         * This will try to compact the IRI as much as possible.
         *
         * @param {string} iri An IRI to compact.
         * @param {boolean} vocab If the term is a predicate or type and should be compacted based on @vocab,
         *                        otherwise it is considered a regular term that is compacted based on @base.
         * @return {string} The compacted term or the IRI as-is.
         */
        compactIri(iri, vocab) {
          if (vocab && this.contextRaw["@vocab"] && iri.startsWith(this.contextRaw["@vocab"])) {
            return iri.substr(this.contextRaw["@vocab"].length);
          }
          if (!vocab && this.contextRaw["@base"] && iri.startsWith(this.contextRaw["@base"])) {
            return iri.substr(this.contextRaw["@base"].length);
          }
          const shortestPrefixing = { prefix: "", suffix: iri };
          for (const key in this.contextRaw) {
            const value = this.contextRaw[key];
            if (value && !Util_1.Util.isPotentialKeyword(key)) {
              const contextIri = Util_1.Util.getContextValueId(value);
              if (iri.startsWith(contextIri)) {
                const suffix = iri.substr(contextIri.length);
                if (!suffix) {
                  if (vocab) {
                    return key;
                  }
                } else if (suffix.length < shortestPrefixing.suffix.length) {
                  shortestPrefixing.prefix = key;
                  shortestPrefixing.suffix = suffix;
                }
              }
            }
          }
          if (shortestPrefixing.prefix) {
            return shortestPrefixing.prefix + ":" + shortestPrefixing.suffix;
          }
          return iri;
        }
      }
      exports$1.JsonLdContextNormalized = JsonLdContextNormalized2;
      exports$1.defaultExpandOptions = {
        allowPrefixForcing: true,
        allowPrefixNonGenDelims: false,
        allowVocabRelativeToBase: true
      };
    })(JsonLdContextNormalized);
    return JsonLdContextNormalized;
  }
  var hasRequiredContextParser;
  function requireContextParser() {
    if (hasRequiredContextParser) return ContextParser;
    hasRequiredContextParser = 1;
    Object.defineProperty(ContextParser, "__esModule", { value: true });
    ContextParser.ContextParser = void 0;
    const relative_to_absolute_iri_1 = requireRelativeToAbsoluteIri();
    const ErrorCoded_1 = /* @__PURE__ */ requireErrorCoded();
    const FetchDocumentLoader_1 = /* @__PURE__ */ requireFetchDocumentLoader();
    const JsonLdContextNormalized_1 = /* @__PURE__ */ requireJsonLdContextNormalized();
    const Util_1 = /* @__PURE__ */ requireUtil$2();
    let ContextParser$1 = class ContextParser2 {
      constructor(options) {
        options = options || {};
        this.documentLoader = options.documentLoader || new FetchDocumentLoader_1.FetchDocumentLoader();
        this.documentCache = {};
        this.validateContext = !options.skipValidation;
        this.expandContentTypeToBase = !!options.expandContentTypeToBase;
        this.remoteContextsDepthLimit = options.remoteContextsDepthLimit || 32;
        this.redirectSchemaOrgHttps = "redirectSchemaOrgHttps" in options ? !!options.redirectSchemaOrgHttps : true;
      }
      /**
       * Validate the given @language value.
       * An error will be thrown if it is invalid.
       * @param value An @language value.
       * @param {boolean} strictRange If the string value should be strictly checked against a regex.
       * @param {string} errorCode The error code to emit on errors.
       * @return {boolean} If validation passed.
       *                   Can only be false if strictRange is false and the string value did not pass the regex.
       */
      static validateLanguage(value, strictRange, errorCode) {
        if (typeof value !== "string") {
          throw new ErrorCoded_1.ErrorCoded(`The value of an '@language' must be a string, got '${JSON.stringify(value)}'`, errorCode);
        }
        if (!Util_1.Util.REGEX_LANGUAGE_TAG.test(value)) {
          if (strictRange) {
            throw new ErrorCoded_1.ErrorCoded(`The value of an '@language' must be a valid language tag, got '${JSON.stringify(value)}'`, errorCode);
          } else {
            return false;
          }
        }
        return true;
      }
      /**
       * Validate the given @direction value.
       * An error will be thrown if it is invalid.
       * @param value An @direction value.
       * @param {boolean} strictValues If the string value should be strictly checked against a regex.
       * @return {boolean} If validation passed.
       *                   Can only be false if strictRange is false and the string value did not pass the regex.
       */
      static validateDirection(value, strictValues) {
        if (typeof value !== "string") {
          throw new ErrorCoded_1.ErrorCoded(`The value of an '@direction' must be a string, got '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_BASE_DIRECTION);
        }
        if (!Util_1.Util.REGEX_DIRECTION_TAG.test(value)) {
          if (strictValues) {
            throw new ErrorCoded_1.ErrorCoded(`The value of an '@direction' must be 'ltr' or 'rtl', got '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_BASE_DIRECTION);
          } else {
            return false;
          }
        }
        return true;
      }
      /**
       * Add an @id term for all @reverse terms.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @return {IJsonLdContextNormalizedRaw} The mutated input context.
       */
      idifyReverseTerms(context) {
        for (const key of Object.keys(context)) {
          let value = context[key];
          if (value && typeof value === "object") {
            if (value["@reverse"] && !value["@id"]) {
              if (typeof value["@reverse"] !== "string" || Util_1.Util.isValidKeyword(value["@reverse"])) {
                throw new ErrorCoded_1.ErrorCoded(`Invalid @reverse value, must be absolute IRI or blank node: '${value["@reverse"]}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
              }
              value = context[key] = Object.assign(Object.assign({}, value), { "@id": value["@reverse"] });
              value["@id"] = value["@reverse"];
              if (Util_1.Util.isPotentialKeyword(value["@reverse"])) {
                delete value["@reverse"];
              } else {
                value["@reverse"] = true;
              }
            }
          }
        }
        return context;
      }
      /**
       * Expand all prefixed terms in the given context.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {boolean} expandContentTypeToBase If @type inside the context may be expanded
       *                                          via @base if @vocab is set to null.
       * @param {string[]} keys Optional set of keys from the context to expand. If left undefined, all
       * keys in the context will be expanded.
       */
      expandPrefixedTerms(context, expandContentTypeToBase, keys) {
        const contextRaw = context.getContextRaw();
        for (const key of keys || Object.keys(contextRaw)) {
          if (Util_1.Util.EXPAND_KEYS_BLACKLIST.indexOf(key) < 0 && !Util_1.Util.isReservedInternalKeyword(key)) {
            const keyValue = contextRaw[key];
            if (Util_1.Util.isPotentialKeyword(key) && Util_1.Util.ALIAS_DOMAIN_BLACKLIST.indexOf(key) >= 0) {
              if (key !== "@type" || typeof contextRaw[key] === "object" && !(contextRaw[key]["@protected"] || contextRaw[key]["@container"] === "@set")) {
                throw new ErrorCoded_1.ErrorCoded(`Keywords can not be aliased to something else.
Tried mapping ${key} to ${JSON.stringify(keyValue)}`, ErrorCoded_1.ERROR_CODES.KEYWORD_REDEFINITION);
              }
            }
            if (Util_1.Util.ALIAS_RANGE_BLACKLIST.indexOf(Util_1.Util.getContextValueId(keyValue)) >= 0) {
              throw new ErrorCoded_1.ErrorCoded(`Aliasing to certain keywords is not allowed.
Tried mapping ${key} to ${JSON.stringify(keyValue)}`, ErrorCoded_1.ERROR_CODES.INVALID_KEYWORD_ALIAS);
            }
            if (keyValue && Util_1.Util.isPotentialKeyword(Util_1.Util.getContextValueId(keyValue)) && keyValue["@prefix"] === true) {
              throw new ErrorCoded_1.ErrorCoded(`Tried to use keyword aliases as prefix: '${key}': '${JSON.stringify(keyValue)}'`, ErrorCoded_1.ERROR_CODES.INVALID_TERM_DEFINITION);
            }
            while (Util_1.Util.isPrefixValue(contextRaw[key])) {
              const value = contextRaw[key];
              let changed = false;
              if (typeof value === "string") {
                contextRaw[key] = context.expandTerm(value, true);
                changed = changed || value !== contextRaw[key];
              } else {
                const id = value["@id"];
                const type = value["@type"];
                const canAddIdEntry = !("@prefix" in value) || Util_1.Util.isValidIri(key);
                if ("@id" in value) {
                  if (id !== void 0 && id !== null && typeof id === "string") {
                    contextRaw[key] = Object.assign(Object.assign({}, contextRaw[key]), { "@id": context.expandTerm(id, true) });
                    changed = changed || id !== contextRaw[key]["@id"];
                  }
                } else if (!Util_1.Util.isPotentialKeyword(key) && canAddIdEntry) {
                  const newId = context.expandTerm(key, true);
                  if (newId !== key) {
                    contextRaw[key] = Object.assign(Object.assign({}, contextRaw[key]), { "@id": newId });
                    changed = true;
                  }
                }
                if (type && typeof type === "string" && type !== "@vocab" && (!value["@container"] || !value["@container"]["@type"]) && canAddIdEntry) {
                  let expandedType = context.expandTerm(type, true);
                  if (expandContentTypeToBase && type === expandedType) {
                    expandedType = context.expandTerm(type, false);
                  }
                  if (expandedType !== type) {
                    changed = true;
                    contextRaw[key] = Object.assign(Object.assign({}, contextRaw[key]), { "@type": expandedType });
                  }
                }
              }
              if (!changed) {
                break;
              }
            }
          }
        }
      }
      /**
       * Normalize the @language entries in the given context to lowercase.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {IParseOptions} parseOptions The parsing options.
       */
      normalize(context, { processingMode, normalizeLanguageTags }) {
        if (normalizeLanguageTags || processingMode === 1) {
          for (const key of Object.keys(context)) {
            if (key === "@language" && typeof context[key] === "string") {
              context[key] = context[key].toLowerCase();
            } else {
              const value = context[key];
              if (value && typeof value === "object") {
                if (typeof value["@language"] === "string") {
                  const lowercase = value["@language"].toLowerCase();
                  if (lowercase !== value["@language"]) {
                    context[key] = Object.assign(Object.assign({}, value), { "@language": lowercase });
                  }
                }
              }
            }
          }
        }
      }
      /**
       * Convert all @container strings and array values to hash-based values.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       */
      containersToHash(context) {
        for (const key of Object.keys(context)) {
          const value = context[key];
          if (value && typeof value === "object") {
            if (typeof value["@container"] === "string") {
              context[key] = Object.assign(Object.assign({}, value), { "@container": { [value["@container"]]: true } });
            } else if (Array.isArray(value["@container"])) {
              const newValue = {};
              for (const containerValue of value["@container"]) {
                newValue[containerValue] = true;
              }
              context[key] = Object.assign(Object.assign({}, value), { "@container": newValue });
            }
          }
        }
      }
      /**
       * Normalize and apply context-level @protected terms onto each term separately.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {number} processingMode The processing mode.
       */
      applyScopedProtected(context, { processingMode }, expandOptions) {
        if (processingMode && processingMode >= 1.1) {
          if (context["@protected"]) {
            for (const key of Object.keys(context)) {
              if (Util_1.Util.isReservedInternalKeyword(key)) {
                continue;
              }
              if (!Util_1.Util.isPotentialKeyword(key) && !Util_1.Util.isTermProtected(context, key)) {
                const value = context[key];
                if (value && typeof value === "object") {
                  if (!("@protected" in context[key])) {
                    context[key] = Object.assign(Object.assign({}, context[key]), { "@protected": true });
                  }
                } else {
                  context[key] = {
                    "@id": value,
                    "@protected": true
                  };
                  if (Util_1.Util.isSimpleTermDefinitionPrefix(value, expandOptions)) {
                    context[key] = Object.assign(Object.assign({}, context[key]), { "@prefix": true });
                  }
                }
              }
            }
            delete context["@protected"];
          }
        }
      }
      /**
       * Check if the given context inheritance does not contain any overrides of protected terms.
       * @param {IJsonLdContextNormalizedRaw} contextBefore The context that may contain some protected terms.
       * @param {IJsonLdContextNormalizedRaw} contextAfter A new context that is being applied on the first one.
       * @param {IExpandOptions} expandOptions Options that are needed for any expansions during this validation.
       * @param {string[]} keys Optional set of keys from the context to validate. If left undefined, all
       * keys defined in contextAfter will be checked.
       */
      validateKeywordRedefinitions(contextBefore, contextAfter, expandOptions, keys) {
        for (const key of keys !== null && keys !== void 0 ? keys : Object.keys(contextAfter)) {
          if (Util_1.Util.isTermProtected(contextBefore, key)) {
            if (typeof contextAfter[key] === "string") {
              contextAfter[key] = { "@id": contextAfter[key], "@protected": true };
            } else {
              contextAfter[key] = Object.assign(Object.assign({}, contextAfter[key]), { "@protected": true });
            }
            if (!Util_1.Util.deepEqual(contextBefore[key], contextAfter[key])) {
              throw new ErrorCoded_1.ErrorCoded(`Attempted to override the protected keyword ${key} from ${JSON.stringify(Util_1.Util.getContextValueId(contextBefore[key]))} to ${JSON.stringify(Util_1.Util.getContextValueId(contextAfter[key]))}`, ErrorCoded_1.ERROR_CODES.PROTECTED_TERM_REDEFINITION);
            }
          }
        }
      }
      /**
       * Validate the entries of the given context.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {IParseOptions} options The parse options.
       */
      validate(context, { processingMode }) {
        for (const key of Object.keys(context)) {
          if (Util_1.Util.isReservedInternalKeyword(key)) {
            continue;
          }
          if (key === "") {
            throw new ErrorCoded_1.ErrorCoded(`The empty term is not allowed, got: '${key}': '${JSON.stringify(context[key])}'`, ErrorCoded_1.ERROR_CODES.INVALID_TERM_DEFINITION);
          }
          const value = context[key];
          const valueType = typeof value;
          if (Util_1.Util.isPotentialKeyword(key)) {
            switch (key.substr(1)) {
              case "vocab":
                if (value !== null && valueType !== "string") {
                  throw new ErrorCoded_1.ErrorCoded(`Found an invalid @vocab IRI: ${value}`, ErrorCoded_1.ERROR_CODES.INVALID_VOCAB_MAPPING);
                }
                break;
              case "base":
                if (value !== null && valueType !== "string") {
                  throw new ErrorCoded_1.ErrorCoded(`Found an invalid @base IRI: ${context[key]}`, ErrorCoded_1.ERROR_CODES.INVALID_BASE_IRI);
                }
                break;
              case "language":
                if (value !== null) {
                  ContextParser2.validateLanguage(value, true, ErrorCoded_1.ERROR_CODES.INVALID_DEFAULT_LANGUAGE);
                }
                break;
              case "version":
                if (value !== null && valueType !== "number") {
                  throw new ErrorCoded_1.ErrorCoded(`Found an invalid @version number: ${value}`, ErrorCoded_1.ERROR_CODES.INVALID_VERSION_VALUE);
                }
                break;
              case "direction":
                if (value !== null) {
                  ContextParser2.validateDirection(value, true);
                }
                break;
              case "propagate":
                if (processingMode === 1) {
                  throw new ErrorCoded_1.ErrorCoded(`Found an illegal @propagate keyword: ${value}`, ErrorCoded_1.ERROR_CODES.INVALID_CONTEXT_ENTRY);
                }
                if (value !== null && valueType !== "boolean") {
                  throw new ErrorCoded_1.ErrorCoded(`Found an invalid @propagate value: ${value}`, ErrorCoded_1.ERROR_CODES.INVALID_PROPAGATE_VALUE);
                }
                break;
            }
            if (Util_1.Util.isValidKeyword(key) && Util_1.Util.isValidKeyword(Util_1.Util.getContextValueId(value))) {
              throw new ErrorCoded_1.ErrorCoded(`Illegal keyword alias in term value, found: '${key}': '${Util_1.Util.getContextValueId(value)}'`, ErrorCoded_1.ERROR_CODES.KEYWORD_REDEFINITION);
            }
            continue;
          }
          if (value !== null) {
            switch (valueType) {
              case "string":
                if (Util_1.Util.getPrefix(value, context) === key) {
                  throw new ErrorCoded_1.ErrorCoded(`Detected cyclical IRI mapping in context entry: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.CYCLIC_IRI_MAPPING);
                }
                if (Util_1.Util.isValidIriWeak(key)) {
                  if (value === "@type") {
                    throw new ErrorCoded_1.ErrorCoded(`IRIs can not be mapped to @type, found: '${key}': '${value}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                  } else if (Util_1.Util.isValidIri(value) && value !== new JsonLdContextNormalized_1.JsonLdContextNormalized(context).expandTerm(key)) {
                    throw new ErrorCoded_1.ErrorCoded(`IRIs can not be mapped to other IRIs, found: '${key}': '${value}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                  }
                }
                break;
              case "object":
                if (!Util_1.Util.isCompactIri(key) && !("@id" in value) && (value["@type"] === "@id" ? !context["@base"] : !context["@vocab"])) {
                  throw new ErrorCoded_1.ErrorCoded(`Missing @id in context entry: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                }
                for (const objectKey of Object.keys(value)) {
                  const objectValue = value[objectKey];
                  if (!objectValue) {
                    continue;
                  }
                  switch (objectKey) {
                    case "@id":
                      if (Util_1.Util.isValidKeyword(objectValue) && objectValue !== "@type" && objectValue !== "@id" && objectValue !== "@graph" && objectValue !== "@nest") {
                        throw new ErrorCoded_1.ErrorCoded(`Illegal keyword alias in term value, found: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                      }
                      if (Util_1.Util.isValidIriWeak(key)) {
                        if (objectValue === "@type") {
                          throw new ErrorCoded_1.ErrorCoded(`IRIs can not be mapped to @type, found: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                        } else if (Util_1.Util.isValidIri(objectValue) && objectValue !== new JsonLdContextNormalized_1.JsonLdContextNormalized(context).expandTerm(key)) {
                          throw new ErrorCoded_1.ErrorCoded(`IRIs can not be mapped to other IRIs, found: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                        }
                      }
                      if (typeof objectValue !== "string") {
                        throw new ErrorCoded_1.ErrorCoded(`Detected non-string @id in context entry: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_IRI_MAPPING);
                      }
                      if (Util_1.Util.getPrefix(objectValue, context) === key) {
                        throw new ErrorCoded_1.ErrorCoded(`Detected cyclical IRI mapping in context entry: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.CYCLIC_IRI_MAPPING);
                      }
                      break;
                    case "@type":
                      if (value["@container"] === "@type" && objectValue !== "@id" && objectValue !== "@vocab") {
                        throw new ErrorCoded_1.ErrorCoded(`@container: @type only allows @type: @id or @vocab, but got: '${key}': '${objectValue}'`, ErrorCoded_1.ERROR_CODES.INVALID_TYPE_MAPPING);
                      }
                      if (typeof objectValue !== "string") {
                        throw new ErrorCoded_1.ErrorCoded(`The value of an '@type' must be a string, got '${JSON.stringify(valueType)}'`, ErrorCoded_1.ERROR_CODES.INVALID_TYPE_MAPPING);
                      }
                      if (objectValue !== "@id" && objectValue !== "@vocab" && (processingMode === 1 || objectValue !== "@json") && (processingMode === 1 || objectValue !== "@none") && (objectValue[0] === "_" || !Util_1.Util.isValidIri(objectValue))) {
                        throw new ErrorCoded_1.ErrorCoded(`A context @type must be an absolute IRI, found: '${key}': '${objectValue}'`, ErrorCoded_1.ERROR_CODES.INVALID_TYPE_MAPPING);
                      }
                      break;
                    case "@reverse":
                      if (typeof objectValue === "string" && value["@id"] && value["@id"] !== objectValue) {
                        throw new ErrorCoded_1.ErrorCoded(`Found non-matching @id and @reverse term values in '${key}':'${objectValue}' and '${value["@id"]}'`, ErrorCoded_1.ERROR_CODES.INVALID_REVERSE_PROPERTY);
                      }
                      if ("@nest" in value) {
                        throw new ErrorCoded_1.ErrorCoded(`@nest is not allowed in the reverse property '${key}'`, ErrorCoded_1.ERROR_CODES.INVALID_REVERSE_PROPERTY);
                      }
                      break;
                    case "@container":
                      if (processingMode === 1) {
                        if (Object.keys(objectValue).length > 1 || Util_1.Util.CONTAINERS_1_0.indexOf(Object.keys(objectValue)[0]) < 0) {
                          throw new ErrorCoded_1.ErrorCoded(`Invalid term @container for '${key}' ('${Object.keys(objectValue)}') in 1.0, must be only one of ${Util_1.Util.CONTAINERS_1_0.join(", ")}`, ErrorCoded_1.ERROR_CODES.INVALID_CONTAINER_MAPPING);
                        }
                      }
                      for (const containerValue of Object.keys(objectValue)) {
                        if (containerValue === "@list" && value["@reverse"]) {
                          throw new ErrorCoded_1.ErrorCoded(`Term value can not be @container: @list and @reverse at the same time on '${key}'`, ErrorCoded_1.ERROR_CODES.INVALID_REVERSE_PROPERTY);
                        }
                        if (Util_1.Util.CONTAINERS.indexOf(containerValue) < 0) {
                          throw new ErrorCoded_1.ErrorCoded(`Invalid term @container for '${key}' ('${containerValue}'), must be one of ${Util_1.Util.CONTAINERS.join(", ")}`, ErrorCoded_1.ERROR_CODES.INVALID_CONTAINER_MAPPING);
                        }
                      }
                      break;
                    case "@language":
                      ContextParser2.validateLanguage(objectValue, true, ErrorCoded_1.ERROR_CODES.INVALID_LANGUAGE_MAPPING);
                      break;
                    case "@direction":
                      ContextParser2.validateDirection(objectValue, true);
                      break;
                    case "@prefix":
                      if (objectValue !== null && typeof objectValue !== "boolean") {
                        throw new ErrorCoded_1.ErrorCoded(`Found an invalid term @prefix boolean in: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_PREFIX_VALUE);
                      }
                      if (!("@id" in value) && !Util_1.Util.isValidIri(key)) {
                        throw new ErrorCoded_1.ErrorCoded(`Invalid @prefix definition for '${key}' ('${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_TERM_DEFINITION);
                      }
                      break;
                    case "@index":
                      if (processingMode === 1 || !value["@container"] || !value["@container"]["@index"]) {
                        throw new ErrorCoded_1.ErrorCoded(`Attempt to add illegal key to value object: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_TERM_DEFINITION);
                      }
                      break;
                    case "@nest":
                      if (Util_1.Util.isPotentialKeyword(objectValue) && objectValue !== "@nest") {
                        throw new ErrorCoded_1.ErrorCoded(`Found an invalid term @nest value in: '${key}': '${JSON.stringify(value)}'`, ErrorCoded_1.ERROR_CODES.INVALID_NEST_VALUE);
                      }
                  }
                }
                break;
              default:
                throw new ErrorCoded_1.ErrorCoded(`Found an invalid term value: '${key}': '${value}'`, ErrorCoded_1.ERROR_CODES.INVALID_TERM_DEFINITION);
            }
          }
        }
      }
      /**
       * Apply the @base context entry to the given context under certain circumstances.
       * @param context A context.
       * @param options Parsing options.
       * @param inheritFromParent If the @base value from the parent context can be inherited.
       * @return The given context.
       */
      applyBaseEntry(context, options, inheritFromParent) {
        if (typeof context === "string") {
          return context;
        }
        if (inheritFromParent && !("@base" in context) && options.parentContext && typeof options.parentContext === "object" && "@base" in options.parentContext) {
          context["@base"] = options.parentContext["@base"];
          if (options.parentContext["@__baseDocument"]) {
            context["@__baseDocument"] = true;
          }
        }
        if (options.baseIRI && !options.external) {
          if (!("@base" in context)) {
            context["@base"] = options.baseIRI;
            context["@__baseDocument"] = true;
          } else if (context["@base"] !== null && typeof context["@base"] === "string" && !Util_1.Util.isValidIri(context["@base"])) {
            context["@base"] = (0, relative_to_absolute_iri_1.resolve)(context["@base"], options.parentContext && options.parentContext["@base"] || options.baseIRI);
          }
        }
        return context;
      }
      /**
       * Resolve relative context IRIs, or return full IRIs as-is.
       * @param {string} contextIri A context IRI.
       * @param {string} baseIRI A base IRI.
       * @return {string} The normalized context IRI.
       */
      normalizeContextIri(contextIri, baseIRI) {
        if (!Util_1.Util.isValidIri(contextIri)) {
          try {
            contextIri = (0, relative_to_absolute_iri_1.resolve)(contextIri, baseIRI);
          } catch (_a) {
            throw new Error(`Invalid context IRI: ${contextIri}`);
          }
        }
        if (this.redirectSchemaOrgHttps && contextIri.startsWith("http://schema.org")) {
          contextIri = "https://schema.org/";
        }
        return contextIri;
      }
      /**
       * Parse scoped contexts in the given context.
       * @param {IJsonLdContextNormalizedRaw} context A context.
       * @param {IParseOptions} options Parsing options.
       * @return {IJsonLdContextNormalizedRaw} The mutated input context.
       * @param {string[]} keys Optional set of keys from the context to parseInnerContexts of. If left undefined, all
       * keys in the context will be iterated over.
       */
      async parseInnerContexts(context, options, keys) {
        for (const key of keys !== null && keys !== void 0 ? keys : Object.keys(context)) {
          const value = context[key];
          if (value && typeof value === "object") {
            if ("@context" in value && value["@context"] !== null && !options.ignoreScopedContexts) {
              if (this.validateContext) {
                try {
                  const parentContext = Object.assign(Object.assign({}, context), { [key]: Object.assign({}, context[key]) });
                  delete parentContext[key]["@context"];
                  await this.parse(value["@context"], Object.assign(Object.assign({}, options), { external: false, parentContext, ignoreProtection: true, ignoreRemoteScopedContexts: true, ignoreScopedContexts: true }));
                } catch (e) {
                  throw new ErrorCoded_1.ErrorCoded(e.message, ErrorCoded_1.ERROR_CODES.INVALID_SCOPED_CONTEXT);
                }
              }
              context[key] = Object.assign(Object.assign({}, value), { "@context": (await this.parse(value["@context"], Object.assign(Object.assign({}, options), { external: false, minimalProcessing: true, ignoreRemoteScopedContexts: true, parentContext: context }))).getContextRaw() });
            }
          }
        }
        return context;
      }
      async parse(context, options = {}, internalOptions = {}) {
        const { baseIRI, parentContext, external, processingMode = ContextParser2.DEFAULT_PROCESSING_MODE, normalizeLanguageTags, ignoreProtection, minimalProcessing } = options;
        const remoteContexts = options.remoteContexts || {};
        if (Object.keys(remoteContexts).length >= this.remoteContextsDepthLimit) {
          throw new ErrorCoded_1.ErrorCoded("Detected an overflow in remote context inclusions: " + Object.keys(remoteContexts), ErrorCoded_1.ERROR_CODES.CONTEXT_OVERFLOW);
        }
        if (context === null || context === void 0) {
          if (!ignoreProtection && parentContext && Util_1.Util.hasProtectedTerms(parentContext)) {
            throw new ErrorCoded_1.ErrorCoded("Illegal context nullification when terms are protected", ErrorCoded_1.ERROR_CODES.INVALID_CONTEXT_NULLIFICATION);
          }
          return new JsonLdContextNormalized_1.JsonLdContextNormalized(this.applyBaseEntry({}, options, false));
        } else if (typeof context === "string") {
          const contextIri = this.normalizeContextIri(context, baseIRI);
          const overriddenLoad = this.getOverriddenLoad(contextIri, options);
          if (overriddenLoad) {
            return new JsonLdContextNormalized_1.JsonLdContextNormalized(overriddenLoad);
          }
          const parsedStringContext = await this.parse(await this.load(contextIri), Object.assign(Object.assign({}, options), { baseIRI: contextIri, external: true, remoteContexts: Object.assign(Object.assign({}, remoteContexts), { [contextIri]: true }) }));
          this.applyBaseEntry(parsedStringContext.getContextRaw(), options, true);
          return parsedStringContext;
        } else if (Array.isArray(context)) {
          const contextIris = [];
          const contexts = await Promise.all(context.map((subContext, i) => {
            if (typeof subContext === "string") {
              const contextIri = this.normalizeContextIri(subContext, baseIRI);
              contextIris[i] = contextIri;
              const overriddenLoad = this.getOverriddenLoad(contextIri, options);
              if (overriddenLoad) {
                return overriddenLoad;
              }
              return this.load(contextIri);
            } else {
              return subContext;
            }
          }));
          if (minimalProcessing) {
            return new JsonLdContextNormalized_1.JsonLdContextNormalized(contexts);
          }
          const reducedContexts = await contexts.reduce((accContextPromise, contextEntry, i) => accContextPromise.then((accContext) => this.parse(
            contextEntry,
            Object.assign(Object.assign({}, options), { baseIRI: contextIris[i] || options.baseIRI, external: !!contextIris[i] || options.external, parentContext: accContext.getContextRaw(), remoteContexts: contextIris[i] ? Object.assign(Object.assign({}, remoteContexts), { [contextIris[i]]: true }) : remoteContexts }),
            // @ts-expect-error: This third argument causes a type error because we have hidden it from consumers
            {
              skipValidation: i < contexts.length - 1
            }
          )), Promise.resolve(new JsonLdContextNormalized_1.JsonLdContextNormalized(parentContext || {})));
          this.applyBaseEntry(reducedContexts.getContextRaw(), options, true);
          return reducedContexts;
        } else if (typeof context === "object") {
          if ("@context" in context) {
            if (options === null || options === void 0 ? void 0 : options.disallowDirectlyNestedContext) {
              throw new ErrorCoded_1.ErrorCoded(`Keywords can not be aliased to something else.
Tried mapping @context to ${JSON.stringify(context["@context"])}`, ErrorCoded_1.ERROR_CODES.KEYWORD_REDEFINITION);
            }
            return await this.parse(context["@context"], options);
          }
          context = Object.assign({}, context);
          if (external) {
            delete context["@base"];
          }
          this.applyBaseEntry(context, options, true);
          this.containersToHash(context);
          if (minimalProcessing) {
            return new JsonLdContextNormalized_1.JsonLdContextNormalized(context);
          }
          let importContext = {};
          if ("@import" in context) {
            if (processingMode >= 1.1) {
              if (typeof context["@import"] !== "string") {
                throw new ErrorCoded_1.ErrorCoded("An @import value must be a string, but got " + typeof context["@import"], ErrorCoded_1.ERROR_CODES.INVALID_IMPORT_VALUE);
              }
              importContext = await this.loadImportContext(this.normalizeContextIri(context["@import"], baseIRI));
              delete context["@import"];
            } else {
              throw new ErrorCoded_1.ErrorCoded("Context importing is not supported in JSON-LD 1.0", ErrorCoded_1.ERROR_CODES.INVALID_CONTEXT_ENTRY);
            }
          }
          this.applyScopedProtected(importContext, { processingMode }, JsonLdContextNormalized_1.defaultExpandOptions);
          const newContext = Object.assign(importContext, context);
          this.idifyReverseTerms(newContext);
          this.normalize(newContext, { processingMode, normalizeLanguageTags });
          this.applyScopedProtected(newContext, { processingMode }, JsonLdContextNormalized_1.defaultExpandOptions);
          const keys = Object.keys(newContext);
          const overlappingKeys = [];
          if (typeof parentContext === "object") {
            for (const key in parentContext) {
              if (key in newContext) {
                overlappingKeys.push(key);
              } else {
                newContext[key] = parentContext[key];
              }
            }
          }
          await this.parseInnerContexts(newContext, options, keys);
          const newContextWrapped = new JsonLdContextNormalized_1.JsonLdContextNormalized(newContext);
          if ((newContext && newContext["@version"] || ContextParser2.DEFAULT_PROCESSING_MODE) >= 1.1 && (context["@vocab"] && typeof context["@vocab"] === "string" || context["@vocab"] === "")) {
            if (parentContext && "@vocab" in parentContext && context["@vocab"].indexOf(":") < 0) {
              newContext["@vocab"] = parentContext["@vocab"] + context["@vocab"];
            } else if (Util_1.Util.isCompactIri(context["@vocab"]) || context["@vocab"] in newContext) {
              newContext["@vocab"] = newContextWrapped.expandTerm(context["@vocab"], true);
            }
          }
          this.expandPrefixedTerms(newContextWrapped, this.expandContentTypeToBase, keys);
          if (!ignoreProtection && parentContext && processingMode >= 1.1) {
            this.validateKeywordRedefinitions(parentContext, newContext, JsonLdContextNormalized_1.defaultExpandOptions, overlappingKeys);
          }
          if (this.validateContext && !internalOptions.skipValidation) {
            this.validate(newContext, { processingMode });
          }
          return newContextWrapped;
        } else {
          throw new ErrorCoded_1.ErrorCoded(`Tried parsing a context that is not a string, array or object, but got ${context}`, ErrorCoded_1.ERROR_CODES.INVALID_LOCAL_CONTEXT);
        }
      }
      /**
       * Fetch the given URL as a raw JSON-LD context.
       * @param url An URL.
       * @return A promise resolving to a raw JSON-LD context.
       */
      async load(url) {
        const cached = this.documentCache[url];
        if (cached) {
          return cached;
        }
        let document;
        try {
          document = await this.documentLoader.load(url);
        } catch (e) {
          throw new ErrorCoded_1.ErrorCoded(`Failed to load remote context ${url}: ${e.message}`, ErrorCoded_1.ERROR_CODES.LOADING_REMOTE_CONTEXT_FAILED);
        }
        if (!("@context" in document)) {
          throw new ErrorCoded_1.ErrorCoded(`Missing @context in remote context at ${url}`, ErrorCoded_1.ERROR_CODES.INVALID_REMOTE_CONTEXT);
        }
        return this.documentCache[url] = document["@context"];
      }
      /**
       * Override the given context that may be loaded.
       *
       * This will check whether or not the url is recursively being loaded.
       * @param url An URL.
       * @param options Parsing options.
       * @return An overridden context, or null.
       *         Optionally an error can be thrown if a cyclic context is detected.
       */
      getOverriddenLoad(url, options) {
        if (url in (options.remoteContexts || {})) {
          if (options.ignoreRemoteScopedContexts) {
            return url;
          } else {
            throw new ErrorCoded_1.ErrorCoded("Detected a cyclic context inclusion of " + url, ErrorCoded_1.ERROR_CODES.RECURSIVE_CONTEXT_INCLUSION);
          }
        }
        return null;
      }
      /**
       * Load an @import'ed context.
       * @param importContextIri The full URI of an @import value.
       */
      async loadImportContext(importContextIri) {
        let importContext = await this.load(importContextIri);
        if (typeof importContext !== "object" || Array.isArray(importContext)) {
          throw new ErrorCoded_1.ErrorCoded("An imported context must be a single object: " + importContextIri, ErrorCoded_1.ERROR_CODES.INVALID_REMOTE_CONTEXT);
        }
        if ("@import" in importContext) {
          throw new ErrorCoded_1.ErrorCoded("An imported context can not import another context: " + importContextIri, ErrorCoded_1.ERROR_CODES.INVALID_CONTEXT_ENTRY);
        }
        importContext = Object.assign({}, importContext);
        this.containersToHash(importContext);
        return importContext;
      }
    };
    ContextParser$1.DEFAULT_PROCESSING_MODE = 1.1;
    ContextParser.ContextParser = ContextParser$1;
    return ContextParser;
  }
  var IDocumentLoader = {};
  var hasRequiredIDocumentLoader;
  function requireIDocumentLoader() {
    if (hasRequiredIDocumentLoader) return IDocumentLoader;
    hasRequiredIDocumentLoader = 1;
    Object.defineProperty(IDocumentLoader, "__esModule", { value: true });
    return IDocumentLoader;
  }
  var JsonLdContext = {};
  var hasRequiredJsonLdContext;
  function requireJsonLdContext() {
    if (hasRequiredJsonLdContext) return JsonLdContext;
    hasRequiredJsonLdContext = 1;
    Object.defineProperty(JsonLdContext, "__esModule", { value: true });
    return JsonLdContext;
  }
  var hasRequiredJsonldContextParser;
  function requireJsonldContextParser() {
    if (hasRequiredJsonldContextParser) return jsonldContextParser;
    hasRequiredJsonldContextParser = 1;
    (function(exports$1) {
      var __createBinding = jsonldContextParser && jsonldContextParser.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = jsonldContextParser && jsonldContextParser.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(/* @__PURE__ */ requireContextParser(), exports$1);
      __exportStar(/* @__PURE__ */ requireErrorCoded(), exports$1);
      __exportStar(/* @__PURE__ */ requireFetchDocumentLoader(), exports$1);
      __exportStar(/* @__PURE__ */ requireIDocumentLoader(), exports$1);
      __exportStar(/* @__PURE__ */ requireJsonLdContext(), exports$1);
      __exportStar(/* @__PURE__ */ requireJsonLdContextNormalized(), exports$1);
      __exportStar(/* @__PURE__ */ requireUtil$2(), exports$1);
    })(jsonldContextParser);
    return jsonldContextParser;
  }
  var EntryHandlerArrayValue = {};
  var Util$1 = {};
  var EntryHandlerContainer = {};
  var ContainerHandlerIdentifier = {};
  var hasRequiredContainerHandlerIdentifier;
  function requireContainerHandlerIdentifier() {
    if (hasRequiredContainerHandlerIdentifier) return ContainerHandlerIdentifier;
    hasRequiredContainerHandlerIdentifier = 1;
    Object.defineProperty(ContainerHandlerIdentifier, "__esModule", { value: true });
    ContainerHandlerIdentifier.ContainerHandlerIdentifier = void 0;
    let ContainerHandlerIdentifier$1 = class ContainerHandlerIdentifier {
      canCombineWithGraph() {
        return true;
      }
      async handle(containers, parsingContext, util2, keys, value, depth) {
        let id;
        if (parsingContext.emittedStack[depth + 1] && parsingContext.idStack[depth + 1]) {
          id = parsingContext.idStack[depth + 1][0];
        } else {
          const keyUnaliased = await util2.getContainerKey(keys[depth], keys, depth);
          const maybeId = keyUnaliased !== null ? await util2.resourceToTerm(await parsingContext.getContext(keys), keys[depth]) : util2.dataFactory.blankNode();
          if (!maybeId) {
            parsingContext.emittedStack[depth] = false;
            return;
          }
          id = maybeId;
          parsingContext.idStack[depth + 1] = [id];
        }
        let ids = parsingContext.idStack[depth];
        if (!ids) {
          ids = parsingContext.idStack[depth] = [];
        }
        if (!ids.some((term) => term.equals(id))) {
          ids.push(id);
        }
        if (!await parsingContext.handlePendingContainerFlushBuffers()) {
          parsingContext.emittedStack[depth] = false;
        }
      }
    };
    ContainerHandlerIdentifier.ContainerHandlerIdentifier = ContainerHandlerIdentifier$1;
    return ContainerHandlerIdentifier;
  }
  var ContainerHandlerIndex = {};
  var EntryHandlerPredicate = {};
  var hasRequiredEntryHandlerPredicate;
  function requireEntryHandlerPredicate() {
    if (hasRequiredEntryHandlerPredicate) return EntryHandlerPredicate;
    hasRequiredEntryHandlerPredicate = 1;
    Object.defineProperty(EntryHandlerPredicate, "__esModule", { value: true });
    EntryHandlerPredicate.EntryHandlerPredicate = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    let EntryHandlerPredicate$1 = class EntryHandlerPredicate2 {
      /**
       * Handle the given predicate-object by either emitting it,
       * or by placing it in the appropriate stack for later emission when no @graph and/or @id has been defined.
       * @param {ParsingContext} parsingContext A parsing context.
       * @param {Util} util A utility instance.
       * @param {any[]} keys A stack of keys.
       * @param {number} depth The current depth.
       * @param {Term} predicate The predicate.
       * @param {Term} object The object.
       * @param {boolean} reverse If the property is reversed.
       * @param {boolean} isEmbedded If the property exists in an embedded node as direct child.
       * @param {boolean} isAnnotation If the property exists in an annotation object.
       * @return {Promise<void>} A promise resolving when handling is done.
       */
      static async handlePredicateObject(parsingContext, util2, keys, depth, predicate, object, reverse, isEmbedded, isAnnotation) {
        const depthProperties = await util2.getPropertiesDepth(keys, depth);
        const depthOffsetGraph = await util2.getDepthOffsetGraph(depth, keys);
        const depthPropertiesGraph = depth - depthOffsetGraph;
        const subjects = parsingContext.idStack[depthProperties];
        if (subjects && !isAnnotation) {
          for (const subject of subjects) {
            const atGraph = depthOffsetGraph >= 0;
            if (atGraph) {
              const graphs = parsingContext.idStack[depthPropertiesGraph - 1];
              if (graphs) {
                for (const graph of graphs) {
                  util2.emitQuadChecked(depth, subject, predicate, object, graph, reverse, isEmbedded);
                }
              } else {
                if (reverse) {
                  util2.validateReverseSubject(object);
                  parsingContext.getUnidentifiedGraphBufferSafe(depthPropertiesGraph - 1).push({ subject: object, predicate, object: subject, isEmbedded });
                } else {
                  parsingContext.getUnidentifiedGraphBufferSafe(depthPropertiesGraph - 1).push({ subject, predicate, object, isEmbedded });
                }
              }
            } else {
              const graph = await util2.getGraphContainerValue(keys, depthProperties);
              util2.emitQuadChecked(depth, subject, predicate, object, graph, reverse, isEmbedded);
            }
          }
        } else {
          if (reverse) {
            util2.validateReverseSubject(object);
          }
          if (isAnnotation) {
            if (parsingContext.rdfstar) {
              if (parsingContext.idStack[depth]) {
                parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal @id inside an annotation: ${parsingContext.idStack[depth][0].value}`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
              }
              for (let i = 0; i < depth; i++) {
                if (await util2.unaliasKeyword(keys[i], keys, i) === "@id") {
                  parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal annotation inside an embedded node`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
                }
              }
              const annotationsBuffer = parsingContext.getAnnotationsBufferSafe(depthProperties);
              const newAnnotation = { predicate, object, reverse, nestedAnnotations: [], depth: depthProperties };
              annotationsBuffer.push(newAnnotation);
              for (let i = annotationsBuffer.length - 2; i >= 0; i--) {
                const existingAnnotation = annotationsBuffer[i];
                if (existingAnnotation.depth > depthProperties) {
                  newAnnotation.nestedAnnotations.push(existingAnnotation);
                  annotationsBuffer.splice(i, 1);
                }
              }
            }
          } else {
            parsingContext.getUnidentifiedValueBufferSafe(depthProperties).push({ predicate, object, reverse, isEmbedded });
          }
        }
      }
      isPropertyHandler() {
        return true;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        const key = keys[depth];
        if (key) {
          const context = await parsingContext.getContext(keys);
          if (!parsingContext.jsonLiteralStack[depth] && await util2.predicateToTerm(context, keys[depth])) {
            if (Util_1.Util.getContextValueType(context, key) === "@json") {
              parsingContext.jsonLiteralStack[depth + 1] = true;
            }
            return true;
          }
        }
        return false;
      }
      async test(parsingContext, util2, key, keys, depth) {
        return keys[depth];
      }
      async handle(parsingContext, util2, key, keys, value, depth, testResult) {
        const keyOriginal = keys[depth];
        const context = await parsingContext.getContext(keys);
        const predicate = await util2.predicateToTerm(context, key);
        if (predicate) {
          const objects = await util2.valueToTerm(context, key, value, depth, keys);
          if (objects.length) {
            for (let object of objects) {
              let parentKey = await util2.unaliasKeywordParent(keys, depth);
              const reverse = Util_1.Util.isPropertyReverse(context, keyOriginal, parentKey);
              let parentDepthOffset = 0;
              while (parentKey === "@reverse" || typeof parentKey === "number") {
                if (typeof parentKey === "number") {
                  parentDepthOffset++;
                } else {
                  depth--;
                }
                parentKey = await util2.unaliasKeywordParent(keys, depth - parentDepthOffset);
              }
              const isEmbedded = Util_1.Util.isPropertyInEmbeddedNode(parentKey);
              util2.validateReverseInEmbeddedNode(key, reverse, isEmbedded);
              const isAnnotation = Util_1.Util.isPropertyInAnnotationObject(parentKey);
              if (value) {
                const listValueContainer = "@list" in Util_1.Util.getContextValueContainer(context, key);
                if (listValueContainer || value["@list"]) {
                  if ((listValueContainer && !Array.isArray(value) && !value["@list"] || value["@list"] && !Array.isArray(value["@list"])) && object !== util2.rdfNil) {
                    const listPointer = util2.dataFactory.blankNode();
                    parsingContext.emitQuad(depth, util2.dataFactory.quad(listPointer, util2.rdfRest, util2.rdfNil, util2.getDefaultGraph()));
                    parsingContext.emitQuad(depth, util2.dataFactory.quad(listPointer, util2.rdfFirst, object, util2.getDefaultGraph()));
                    object = listPointer;
                  }
                  if (reverse && !parsingContext.allowSubjectList) {
                    throw new jsonld_context_parser_1.ErrorCoded(`Found illegal list value in subject position at ${key}`, jsonld_context_parser_1.ERROR_CODES.INVALID_REVERSE_PROPERTY_VALUE);
                  }
                }
              }
              await EntryHandlerPredicate2.handlePredicateObject(parsingContext, util2, keys, depth, predicate, object, reverse, isEmbedded, isAnnotation);
            }
          }
        }
      }
    };
    EntryHandlerPredicate.EntryHandlerPredicate = EntryHandlerPredicate$1;
    return EntryHandlerPredicate;
  }
  var hasRequiredContainerHandlerIndex;
  function requireContainerHandlerIndex() {
    if (hasRequiredContainerHandlerIndex) return ContainerHandlerIndex;
    hasRequiredContainerHandlerIndex = 1;
    Object.defineProperty(ContainerHandlerIndex, "__esModule", { value: true });
    ContainerHandlerIndex.ContainerHandlerIndex = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const EntryHandlerPredicate_1 = /* @__PURE__ */ requireEntryHandlerPredicate();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    let ContainerHandlerIndex$1 = class ContainerHandlerIndex {
      canCombineWithGraph() {
        return true;
      }
      async handle(containers, parsingContext, util2, keys, value, depth) {
        if (!Array.isArray(value)) {
          const graphContainer = "@graph" in containers;
          const context = await parsingContext.getContext(keys);
          const indexKey = keys[depth - 1];
          const indexPropertyRaw = Util_1.Util.getContextValueIndex(context, indexKey);
          if (indexPropertyRaw) {
            if (jsonld_context_parser_1.Util.isPotentialKeyword(indexPropertyRaw)) {
              throw new jsonld_context_parser_1.ErrorCoded(`Keywords can not be used as @index value, got: ${indexPropertyRaw}`, jsonld_context_parser_1.ERROR_CODES.INVALID_TERM_DEFINITION);
            }
            if (typeof indexPropertyRaw !== "string") {
              throw new jsonld_context_parser_1.ErrorCoded(`@index values must be strings, got: ${indexPropertyRaw}`, jsonld_context_parser_1.ERROR_CODES.INVALID_TERM_DEFINITION);
            }
            if (typeof value !== "object") {
              if (Util_1.Util.getContextValueType(context, indexKey) !== "@id") {
                throw new jsonld_context_parser_1.ErrorCoded(`Property-based index containers require nodes as values or strings with @type: @id, but got: ${value}`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT);
              }
              const id = util2.resourceToTerm(context, value);
              if (id) {
                parsingContext.idStack[depth + 1] = [id];
              }
            }
            const indexProperty = util2.createVocabOrBaseTerm(context, indexPropertyRaw);
            if (indexProperty) {
              const indexValues = await util2.valueToTerm(context, indexPropertyRaw, await util2.getContainerKey(keys[depth], keys, depth), depth, keys);
              if (graphContainer) {
                const graphId = await util2.getGraphContainerValue(keys, depth + 1);
                for (const indexValue of indexValues) {
                  parsingContext.emitQuad(depth, util2.dataFactory.quad(graphId, indexProperty, indexValue, util2.getDefaultGraph()));
                }
              } else {
                for (const indexValue of indexValues) {
                  await EntryHandlerPredicate_1.EntryHandlerPredicate.handlePredicateObject(parsingContext, util2, keys, depth + 1, indexProperty, indexValue, false, false, false);
                }
              }
            }
          }
          const depthOffset = graphContainer ? 2 : 1;
          await parsingContext.newOnValueJob(keys.slice(0, keys.length - depthOffset), value, depth - depthOffset, true);
          await parsingContext.handlePendingContainerFlushBuffers();
        }
        parsingContext.emittedStack[depth] = false;
      }
    };
    ContainerHandlerIndex.ContainerHandlerIndex = ContainerHandlerIndex$1;
    return ContainerHandlerIndex;
  }
  var ContainerHandlerLanguage = {};
  var hasRequiredContainerHandlerLanguage;
  function requireContainerHandlerLanguage() {
    if (hasRequiredContainerHandlerLanguage) return ContainerHandlerLanguage;
    hasRequiredContainerHandlerLanguage = 1;
    Object.defineProperty(ContainerHandlerLanguage, "__esModule", { value: true });
    ContainerHandlerLanguage.ContainerHandlerLanguage = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    let ContainerHandlerLanguage$1 = class ContainerHandlerLanguage {
      canCombineWithGraph() {
        return false;
      }
      async handle(containers, parsingContext, util2, keys, value, depth) {
        const language = await util2.getContainerKey(keys[depth], keys, depth);
        if (Array.isArray(value)) {
          value = value.map((subValue) => ({ "@value": subValue, "@language": language }));
        } else {
          if (typeof value !== "string") {
            throw new jsonld_context_parser_1.ErrorCoded(`Got invalid language map value, got '${JSON.stringify(value)}', but expected string`, jsonld_context_parser_1.ERROR_CODES.INVALID_LANGUAGE_MAP_VALUE);
          }
          value = { "@value": value, "@language": language };
        }
        await parsingContext.newOnValueJob(keys.slice(0, keys.length - 1), value, depth - 1, true);
        parsingContext.emittedStack[depth] = false;
      }
    };
    ContainerHandlerLanguage.ContainerHandlerLanguage = ContainerHandlerLanguage$1;
    return ContainerHandlerLanguage;
  }
  var ContainerHandlerType = {};
  var hasRequiredContainerHandlerType;
  function requireContainerHandlerType() {
    if (hasRequiredContainerHandlerType) return ContainerHandlerType;
    hasRequiredContainerHandlerType = 1;
    Object.defineProperty(ContainerHandlerType, "__esModule", { value: true });
    ContainerHandlerType.ContainerHandlerType = void 0;
    const EntryHandlerPredicate_1 = /* @__PURE__ */ requireEntryHandlerPredicate();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    let ContainerHandlerType$1 = class ContainerHandlerType {
      canCombineWithGraph() {
        return false;
      }
      async handle(containers, parsingContext, util2, keys, value, depth) {
        if (!Array.isArray(value)) {
          if (typeof value === "string") {
            const context = await parsingContext.getContext(keys);
            const containerTypeType = Util_1.Util.getContextValueType(context, keys[depth - 1]);
            const id = containerTypeType === "@vocab" ? await util2.createVocabOrBaseTerm(context, value) : await util2.resourceToTerm(context, value);
            if (id) {
              const subValue = { "@id": id.termType === "NamedNode" ? id.value : value };
              await parsingContext.newOnValueJob(keys.slice(0, keys.length - 1), subValue, depth - 1, true);
              parsingContext.idStack[depth + 1] = [id];
            }
          } else {
            const entryHasIdentifier = !!parsingContext.idStack[depth + 1];
            if (!entryHasIdentifier) {
              delete parsingContext.idStack[depth];
            }
            await parsingContext.newOnValueJob(keys.slice(0, keys.length - 1), value, depth - 1, true);
            if (!entryHasIdentifier) {
              parsingContext.idStack[depth + 1] = parsingContext.idStack[depth];
            }
          }
          const keyOriginal = await util2.getContainerKey(keys[depth], keys, depth);
          const type = keyOriginal !== null ? util2.createVocabOrBaseTerm(await parsingContext.getContext(keys), keyOriginal) : null;
          if (type) {
            await EntryHandlerPredicate_1.EntryHandlerPredicate.handlePredicateObject(parsingContext, util2, keys, depth + 1, util2.rdfType, type, false, false, false);
          }
          await parsingContext.handlePendingContainerFlushBuffers();
        }
        parsingContext.emittedStack[depth] = false;
      }
    };
    ContainerHandlerType.ContainerHandlerType = ContainerHandlerType$1;
    return ContainerHandlerType;
  }
  var hasRequiredEntryHandlerContainer;
  function requireEntryHandlerContainer() {
    if (hasRequiredEntryHandlerContainer) return EntryHandlerContainer;
    hasRequiredEntryHandlerContainer = 1;
    Object.defineProperty(EntryHandlerContainer, "__esModule", { value: true });
    EntryHandlerContainer.EntryHandlerContainer = void 0;
    const ContainerHandlerIdentifier_1 = /* @__PURE__ */ requireContainerHandlerIdentifier();
    const ContainerHandlerIndex_1 = /* @__PURE__ */ requireContainerHandlerIndex();
    const ContainerHandlerLanguage_1 = /* @__PURE__ */ requireContainerHandlerLanguage();
    const ContainerHandlerType_1 = /* @__PURE__ */ requireContainerHandlerType();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    let EntryHandlerContainer$1 = class EntryHandlerContainer2 {
      /**
       * Check fit the given container is a simple @graph container.
       * Concretely, it will check if no @index or @id is active as well.
       * @param containers A container hash.
       */
      static isSimpleGraphContainer(containers) {
        return "@graph" in containers && ("@set" in containers && Object.keys(containers).length === 2 || Object.keys(containers).length === 1);
      }
      /**
       * Check fit the given container is a complex @graph container.
       * Concretely, it will check if @index or @id is active as well next to @graph.
       * @param containers A container hash.
       */
      static isComplexGraphContainer(containers) {
        return "@graph" in containers && ("@set" in containers && Object.keys(containers).length > 2 || !("@set" in containers) && Object.keys(containers).length > 1);
      }
      /**
       * Create an graph container index that can be used for identifying a graph term inside the graphContainerTermStack.
       * @param containers The applicable containers.
       * @param depth The container depth.
       * @param keys The array of keys.
       * @return The graph index.
       */
      static getContainerGraphIndex(containers, depth, keys) {
        let isSimpleGraphContainer = EntryHandlerContainer2.isSimpleGraphContainer(containers);
        let index = "";
        for (let i = depth; i < keys.length; i++) {
          if (!isSimpleGraphContainer || typeof keys[i] === "number") {
            index += ":" + keys[i];
          }
          if (!isSimpleGraphContainer && typeof keys[i] !== "number") {
            isSimpleGraphContainer = true;
          }
        }
        return index;
      }
      /**
       * Return the applicable container type at the given depth.
       *
       * This will ignore any arrays in the key chain.
       *
       * @param {ParsingContext} parsingContext A parsing context.
       * @param {any[]} keys The array of keys.
       * @param {number} depth The current depth.
       * @return {Promise<{ containers: {[typeName: string]: boolean}, depth: number, fallback: boolean }>}
       *          All applicable containers for the given depth,
       *          the `depth` of the container root (can change when arrays are in the key chain),
       *          and the `fallback` flag that indicates if the default container type was returned
       *            (i.e., no dedicated container type is defined).
       */
      static async getContainerHandler(parsingContext, keys, depth) {
        const fallback = {
          containers: { "@set": true },
          depth,
          fallback: true
        };
        let checkGraphContainer = false;
        const context = await parsingContext.getContext(keys, 2);
        for (let i = depth - 1; i >= 0; i--) {
          if (typeof keys[i] !== "number") {
            const containersSelf = Util_1.Util.getContextValue(context, "@container", keys[i], false);
            if (containersSelf && EntryHandlerContainer2.isSimpleGraphContainer(containersSelf)) {
              return {
                containers: containersSelf,
                depth: i + 1,
                fallback: false
              };
            }
            const containersParent = Util_1.Util.getContextValue(context, "@container", keys[i - 1], false);
            if (!containersParent) {
              if (checkGraphContainer) {
                return fallback;
              }
              checkGraphContainer = true;
            } else {
              const graphContainer = "@graph" in containersParent;
              for (const containerHandleName in EntryHandlerContainer2.CONTAINER_HANDLERS) {
                if (containersParent[containerHandleName]) {
                  if (graphContainer) {
                    if (EntryHandlerContainer2.CONTAINER_HANDLERS[containerHandleName].canCombineWithGraph()) {
                      return {
                        containers: containersParent,
                        depth: i,
                        fallback: false
                      };
                    } else {
                      return fallback;
                    }
                  } else {
                    if (checkGraphContainer) {
                      return fallback;
                    } else {
                      return {
                        containers: containersParent,
                        depth: i,
                        fallback: false
                      };
                    }
                  }
                }
              }
              return fallback;
            }
          }
        }
        return fallback;
      }
      /**
       * Check if we are handling a value at the given depth
       * that is part of something that should be handled as a container,
       * AND if this container should be buffered, so that it can be handled by a dedicated container handler.
       *
       * For instance, any container with @graph will NOT be buffered.
       *
       * This will ignore any arrays in the key chain.
       *
       * @param {ParsingContext} parsingContext A parsing context.
       * @param {any[]} keys The array of keys.
       * @param {number} depth The current depth.
       * @return {Promise<boolean>} If we are in the scope of a container handler.
       */
      static async isBufferableContainerHandler(parsingContext, keys, depth) {
        const handler = await EntryHandlerContainer2.getContainerHandler(parsingContext, keys, depth);
        return !handler.fallback && !("@graph" in handler.containers);
      }
      isPropertyHandler() {
        return false;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        return !!await this.test(parsingContext, util2, null, keys, depth);
      }
      async test(parsingContext, util2, key, keys, depth) {
        const containers = Util_1.Util.getContextValueContainer(await parsingContext.getContext(keys, 2), keys[depth - 1]);
        for (const containerName in EntryHandlerContainer2.CONTAINER_HANDLERS) {
          if (containers[containerName]) {
            return {
              containers,
              handler: EntryHandlerContainer2.CONTAINER_HANDLERS[containerName]
            };
          }
        }
        return null;
      }
      async handle(parsingContext, util2, key, keys, value, depth, testResult) {
        return testResult.handler.handle(testResult.containers, parsingContext, util2, keys, value, depth);
      }
    };
    EntryHandlerContainer.EntryHandlerContainer = EntryHandlerContainer$1;
    EntryHandlerContainer$1.CONTAINER_HANDLERS = {
      "@id": new ContainerHandlerIdentifier_1.ContainerHandlerIdentifier(),
      "@index": new ContainerHandlerIndex_1.ContainerHandlerIndex(),
      "@language": new ContainerHandlerLanguage_1.ContainerHandlerLanguage(),
      "@type": new ContainerHandlerType_1.ContainerHandlerType()
    };
    return EntryHandlerContainer;
  }
  var canonicalize;
  var hasRequiredCanonicalize;
  function requireCanonicalize() {
    if (hasRequiredCanonicalize) return canonicalize;
    hasRequiredCanonicalize = 1;
    canonicalize = function serialize(object) {
      if (object === null || typeof object !== "object" || object.toJSON != null) {
        return JSON.stringify(object);
      }
      if (Array.isArray(object)) {
        return "[" + object.reduce((t, cv, ci) => {
          const comma = ci === 0 ? "" : ",";
          const value = cv === void 0 || typeof cv === "symbol" ? null : cv;
          return t + comma + serialize(value);
        }, "") + "]";
      }
      return "{" + Object.keys(object).sort().reduce((t, cv, ci) => {
        if (object[cv] === void 0 || typeof object[cv] === "symbol") {
          return t;
        }
        const comma = t.length === 0 ? "" : ",";
        return t + comma + serialize(cv) + ":" + serialize(object[cv]);
      }, "") + "}";
    };
    return canonicalize;
  }
  var hasRequiredUtil$1;
  function requireUtil$1() {
    if (hasRequiredUtil$1) return Util$1;
    hasRequiredUtil$1 = 1;
    Object.defineProperty(Util$1, "__esModule", { value: true });
    Util$1.Util = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const rdf_data_factory_1 = requireRdfDataFactory();
    const EntryHandlerContainer_1 = /* @__PURE__ */ requireEntryHandlerContainer();
    const canonicalizeJson = requireCanonicalize();
    class Util2 {
      constructor(options) {
        this.parsingContext = options.parsingContext;
        this.dataFactory = options.dataFactory || new rdf_data_factory_1.DataFactory();
        this.rdfFirst = this.dataFactory.namedNode(Util2.RDF + "first");
        this.rdfRest = this.dataFactory.namedNode(Util2.RDF + "rest");
        this.rdfNil = this.dataFactory.namedNode(Util2.RDF + "nil");
        this.rdfType = this.dataFactory.namedNode(Util2.RDF + "type");
        this.rdfJson = this.dataFactory.namedNode(Util2.RDF + "JSON");
      }
      /**
       * Helper function to get the value of a context entry,
       * or fallback to a certain value.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} contextKey A pre-defined JSON-LD key in context entries.
       * @param {string} key A context entry key.
       * @param {string} fallback A fallback value for when the given contextKey
       *                          could not be found in the value with the given key.
       * @return {string} The value of the given contextKey in the entry behind key in the given context,
       *                  or the given fallback value.
       */
      static getContextValue(context, contextKey, key, fallback) {
        const entry = context.getContextRaw()[key];
        if (!entry) {
          return fallback;
        }
        const type = entry[contextKey];
        return type === void 0 ? fallback : type;
      }
      /**
       * Get the container type of the given key in the context.
       *
       * Should any context-scoping bugs should occur related to this in the future,
       * it may be required to increase the offset from the depth at which the context is retrieved by one (to 2).
       * This is because containers act 2 levels deep.
       *
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {string} The container type.
       */
      static getContextValueContainer(context, key) {
        return Util2.getContextValue(context, "@container", key, { "@set": true });
      }
      /**
       * Get the value type of the given key in the context.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {string} The node type.
       */
      static getContextValueType(context, key) {
        const valueType = Util2.getContextValue(context, "@type", key, null);
        if (valueType === "@none") {
          return null;
        }
        return valueType;
      }
      /**
       * Get the language of the given key in the context.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {string} The node type.
       */
      static getContextValueLanguage(context, key) {
        return Util2.getContextValue(context, "@language", key, context.getContextRaw()["@language"] || null);
      }
      /**
       * Get the direction of the given key in the context.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {string} The node type.
       */
      static getContextValueDirection(context, key) {
        return Util2.getContextValue(context, "@direction", key, context.getContextRaw()["@direction"] || null);
      }
      /**
       * Check if the given key in the context is a reversed property.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {boolean} If the context value has a @reverse key.
       */
      static isContextValueReverse(context, key) {
        return !!Util2.getContextValue(context, "@reverse", key, null);
      }
      /**
       * Get the @index of the given key in the context.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key A context entry key.
       * @return {string} The index.
       */
      static getContextValueIndex(context, key) {
        return Util2.getContextValue(context, "@index", key, context.getContextRaw()["@index"] || null);
      }
      /**
       * Check if the given key refers to a reversed property.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key The property key.
       * @param {string} parentKey The parent key.
       * @return {boolean} If the property must be reversed.
       */
      static isPropertyReverse(context, key, parentKey) {
        return parentKey === "@reverse" !== Util2.isContextValueReverse(context, key);
      }
      /**
       * Check if the given key exists inside an embedded node as direct child.
       * @param {string} parentKey The parent key.
       * @return {boolean} If the property is embedded.
       */
      static isPropertyInEmbeddedNode(parentKey) {
        return parentKey === "@id";
      }
      /**
       * Check if the given key exists inside an annotation object as direct child.
       * @param {string} parentKey The parent key.
       * @return {boolean} If the property is an annotation.
       */
      static isPropertyInAnnotationObject(parentKey) {
        return parentKey === "@annotation";
      }
      /**
       * Check if the given IRI is valid.
       * @param {string} iri A potential IRI.
       * @return {boolean} If the given IRI is valid.
       */
      static isValidIri(iri) {
        return iri !== null && jsonld_context_parser_1.Util.isValidIri(iri);
      }
      /**
       * Check if the given first array (needle) is a prefix of the given second array (haystack).
       * @param needle An array to check if it is a prefix.
       * @param haystack An array to look in.
       */
      static isPrefixArray(needle, haystack) {
        if (needle.length > haystack.length) {
          return false;
        }
        for (let i = 0; i < needle.length; i++) {
          if (needle[i] !== haystack[i]) {
            return false;
          }
        }
        return true;
      }
      /**
       * Make sure that @id-@index pairs are equal over all array values.
       * Reject otherwise.
       * @param {any[]} value An array value.
       * @return {Promise<void>} A promise rejecting if conflicts are present.
       */
      async validateValueIndexes(value) {
        if (this.parsingContext.validateValueIndexes) {
          const indexHashes = {};
          for (const entry of value) {
            if (entry && typeof entry === "object") {
              const id = entry["@id"];
              const index = entry["@index"];
              if (id && index) {
                const existingIndexValue = indexHashes[id];
                if (existingIndexValue && existingIndexValue !== index) {
                  throw new jsonld_context_parser_1.ErrorCoded(`Conflicting @index value for ${id}`, jsonld_context_parser_1.ERROR_CODES.CONFLICTING_INDEXES);
                }
                indexHashes[id] = index;
              }
            }
          }
        }
      }
      /**
       * Convert a given JSON value to an RDF term.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key The current JSON key.
       * @param value A JSON value.
       * @param {number} depth The depth the value is at.
       * @param {string[]} keys The path of keys.
       * @return {Promise<RDF.Term[]>} An RDF term array.
       */
      async valueToTerm(context, key, value, depth, keys) {
        if (Util2.getContextValueType(context, key) === "@json") {
          return [this.dataFactory.literal(this.valueToJsonString(value), this.rdfJson)];
        }
        const type = typeof value;
        switch (type) {
          case "object":
            if (value === null || value === void 0) {
              return [];
            }
            if (Array.isArray(value)) {
              if ("@list" in Util2.getContextValueContainer(context, key)) {
                if (value.length === 0) {
                  return [this.rdfNil];
                } else {
                  return this.parsingContext.idStack[depth + 1] || [];
                }
              }
              await this.validateValueIndexes(value);
              return [];
            }
            context = await this.getContextSelfOrPropertyScoped(context, key);
            if ("@context" in value) {
              context = await this.parsingContext.parseContext(value["@context"], (await this.parsingContext.getContext(keys, 0)).getContextRaw());
            }
            value = await this.unaliasKeywords(value, keys, depth, context);
            if ("@value" in value) {
              let val;
              let valueLanguage;
              let valueDirection;
              let valueType;
              let valueIndex;
              for (key in value) {
                const subValue = value[key];
                switch (key) {
                  case "@value":
                    val = subValue;
                    break;
                  case "@language":
                    valueLanguage = subValue;
                    break;
                  case "@direction":
                    valueDirection = subValue;
                    break;
                  case "@type":
                    valueType = subValue;
                    break;
                  case "@index":
                    valueIndex = subValue;
                    break;
                  case "@annotation":
                    break;
                  default:
                    if (key.startsWith("@")) {
                      throw new jsonld_context_parser_1.ErrorCoded(`Unknown value entry '${key}' in @value: ${JSON.stringify(value)}`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT);
                    }
                }
              }
              if (await this.unaliasKeyword(valueType, keys, depth, true, context) === "@json") {
                return [this.dataFactory.literal(this.valueToJsonString(val), this.rdfJson)];
              }
              if (val === null) {
                return [];
              }
              if (typeof val === "object") {
                throw new jsonld_context_parser_1.ErrorCoded(`The value of an '@value' can not be an object, got '${JSON.stringify(val)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT_VALUE);
              }
              if (this.parsingContext.validateValueIndexes && valueIndex && typeof valueIndex !== "string") {
                throw new jsonld_context_parser_1.ErrorCoded(`The value of an '@index' must be a string, got '${JSON.stringify(valueIndex)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_INDEX_VALUE);
              }
              if (valueLanguage) {
                if (typeof val !== "string") {
                  throw new jsonld_context_parser_1.ErrorCoded(`When an '@language' is set, the value of '@value' must be a string, got '${JSON.stringify(val)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_LANGUAGE_TAGGED_VALUE);
                }
                if (!jsonld_context_parser_1.ContextParser.validateLanguage(valueLanguage, this.parsingContext.strictValues, jsonld_context_parser_1.ERROR_CODES.INVALID_LANGUAGE_TAGGED_STRING)) {
                  return [];
                }
                if (this.parsingContext.normalizeLanguageTags || this.parsingContext.activeProcessingMode === 1) {
                  valueLanguage = valueLanguage.toLowerCase();
                }
              }
              if (valueDirection) {
                if (typeof val !== "string") {
                  throw new Error(`When an '@direction' is set, the value of '@value' must be a string, got '${JSON.stringify(val)}'`);
                }
                if (!jsonld_context_parser_1.ContextParser.validateDirection(valueDirection, this.parsingContext.strictValues)) {
                  return [];
                }
              }
              if (valueLanguage && valueDirection) {
                if (valueType) {
                  throw new jsonld_context_parser_1.ErrorCoded(`Can not have '@language', '@direction' and '@type' in a value: '${JSON.stringify(value)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT);
                }
                return this.nullableTermToArray(this.createLanguageDirectionLiteral(depth, val, valueLanguage, valueDirection));
              } else if (valueLanguage) {
                if (valueType) {
                  throw new jsonld_context_parser_1.ErrorCoded(`Can not have both '@language' and '@type' in a value: '${JSON.stringify(value)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT);
                }
                return [this.dataFactory.literal(val, valueLanguage)];
              } else if (valueDirection) {
                if (valueType) {
                  throw new jsonld_context_parser_1.ErrorCoded(`Can not have both '@direction' and '@type' in a value: '${JSON.stringify(value)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_VALUE_OBJECT);
                }
                return this.nullableTermToArray(this.createLanguageDirectionLiteral(depth, val, valueLanguage, valueDirection));
              } else if (valueType) {
                if (typeof valueType !== "string") {
                  throw new jsonld_context_parser_1.ErrorCoded(`The value of an '@type' must be a string, got '${JSON.stringify(valueType)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_TYPED_VALUE);
                }
                const typeTerm = this.createVocabOrBaseTerm(context, valueType);
                if (!typeTerm) {
                  throw new jsonld_context_parser_1.ErrorCoded(`Invalid '@type' value, got '${JSON.stringify(valueType)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_TYPED_VALUE);
                }
                if (typeTerm.termType !== "NamedNode") {
                  throw new jsonld_context_parser_1.ErrorCoded(`Illegal value type (${typeTerm.termType}): ${valueType}`, jsonld_context_parser_1.ERROR_CODES.INVALID_TYPED_VALUE);
                }
                return [this.dataFactory.literal(val, typeTerm)];
              }
              return await this.valueToTerm(new jsonld_context_parser_1.JsonLdContextNormalized({}), key, val, depth, keys);
            } else if ("@set" in value) {
              if (Object.keys(value).length > 1) {
                throw new jsonld_context_parser_1.ErrorCoded(`Found illegal neighbouring entries next to @set for key: '${key}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_SET_OR_LIST_OBJECT);
              }
              return [];
            } else if ("@list" in value) {
              if (Object.keys(value).length > 1) {
                throw new jsonld_context_parser_1.ErrorCoded(`Found illegal neighbouring entries next to @list for key: '${key}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_SET_OR_LIST_OBJECT);
              }
              const listValue = value["@list"];
              if (Array.isArray(listValue)) {
                if (listValue.length === 0) {
                  return [this.rdfNil];
                } else {
                  return this.parsingContext.idStack[depth + 1] || [];
                }
              } else {
                return await this.valueToTerm(await this.parsingContext.getContext(keys), key, listValue, depth - 1, keys.slice(0, -1));
              }
            } else if ("@reverse" in value && typeof value["@reverse"] === "boolean") {
              return [];
            } else if ("@graph" in Util2.getContextValueContainer(await this.parsingContext.getContext(keys), key)) {
              const graphContainerEntries = this.parsingContext.graphContainerTermStack[depth + 1];
              return graphContainerEntries ? Object.values(graphContainerEntries) : [this.dataFactory.blankNode()];
            } else if ("@id" in value) {
              if (Object.keys(value).length > 1) {
                context = await this.parsingContext.getContext(keys, 0);
              }
              if ("@context" in value) {
                context = await this.parsingContext.parseContext(value["@context"], context.getContextRaw());
              }
              if (value["@type"] === "@vocab") {
                return this.nullableTermToArray(this.createVocabOrBaseTerm(context, value["@id"]));
              } else {
                const valueId = value["@id"];
                let valueTerm;
                if (typeof valueId === "object") {
                  if (this.parsingContext.rdfstar) {
                    valueTerm = this.parsingContext.idStack[depth + 1][0];
                  } else {
                    throw new jsonld_context_parser_1.ErrorCoded(`Found illegal @id '${value}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_ID_VALUE);
                  }
                } else {
                  valueTerm = this.resourceToTerm(context, valueId);
                }
                return this.nullableTermToArray(valueTerm);
              }
            } else {
              if (this.parsingContext.emittedStack[depth + 1] || value && typeof value === "object" && Object.keys(value).length === 0) {
                return this.parsingContext.idStack[depth + 1] || (this.parsingContext.idStack[depth + 1] = [this.dataFactory.blankNode()]);
              } else {
                return [];
              }
            }
          case "string":
            return this.nullableTermToArray(this.stringValueToTerm(depth, await this.getContextSelfOrPropertyScoped(context, key), key, value, null));
          case "boolean":
            return this.nullableTermToArray(this.stringValueToTerm(depth, await this.getContextSelfOrPropertyScoped(context, key), key, Boolean(value).toString(), this.dataFactory.namedNode(Util2.XSD_BOOLEAN)));
          case "number":
            return this.nullableTermToArray(this.stringValueToTerm(depth, await this.getContextSelfOrPropertyScoped(context, key), key, value, this.dataFactory.namedNode(value % 1 === 0 && value < 1e21 ? Util2.XSD_INTEGER : Util2.XSD_DOUBLE)));
          default:
            this.parsingContext.emitError(new Error(`Could not determine the RDF type of a ${type}`));
            return [];
        }
      }
      /**
       * If the context defines a property-scoped context for the given key,
       * that context will be returned.
       * Otherwise, the given context will be returned as-is.
       *
       * This should be used for valueToTerm cases that are not objects.
       * @param context A context.
       * @param key A JSON key.
       */
      async getContextSelfOrPropertyScoped(context, key) {
        const contextKeyEntry = context.getContextRaw()[key];
        if (contextKeyEntry && typeof contextKeyEntry === "object" && "@context" in contextKeyEntry) {
          context = await this.parsingContext.parseContext(contextKeyEntry, context.getContextRaw(), true, true);
        }
        return context;
      }
      /**
       * If the given term is null, return an empty array, otherwise return an array with the single given term.
       * @param term A term.
       */
      nullableTermToArray(term) {
        return term ? [term] : [];
      }
      /**
       * Convert a given JSON key to an RDF predicate term,
       * based on @vocab.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param key A JSON key.
       * @return {RDF.NamedNode} An RDF named node.
       */
      predicateToTerm(context, key) {
        const expanded = context.expandTerm(key, true, this.parsingContext.getExpandOptions());
        if (!expanded) {
          return null;
        }
        if (expanded[0] === "_" && expanded[1] === ":") {
          if (this.parsingContext.produceGeneralizedRdf) {
            return this.dataFactory.blankNode(expanded.substr(2));
          } else {
            return null;
          }
        }
        if (Util2.isValidIri(expanded)) {
          return this.dataFactory.namedNode(expanded);
        } else {
          if (expanded && this.parsingContext.strictValues) {
            this.parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Invalid predicate IRI: ${expanded}`, jsonld_context_parser_1.ERROR_CODES.INVALID_IRI_MAPPING));
          } else {
            return null;
          }
        }
        return null;
      }
      /**
       * Convert a given JSON key to an RDF resource term or blank node,
       * based on @base.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param key A JSON key.
       * @return {RDF.NamedNode} An RDF named node or null.
       */
      resourceToTerm(context, key) {
        if (key.startsWith("_:")) {
          return this.dataFactory.blankNode(key.substr(2));
        }
        const iri = context.expandTerm(key, false, this.parsingContext.getExpandOptions());
        if (!Util2.isValidIri(iri)) {
          if (iri && this.parsingContext.strictValues) {
            this.parsingContext.emitError(new Error(`Invalid resource IRI: ${iri}`));
          } else {
            return null;
          }
        }
        return this.dataFactory.namedNode(iri);
      }
      /**
       * Convert a given JSON key to an RDF resource term.
       * It will do this based on the @vocab,
       * and fallback to @base.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param key A JSON key.
       * @return {RDF.NamedNode} An RDF named node or null.
       */
      createVocabOrBaseTerm(context, key) {
        if (key.startsWith("_:")) {
          return this.dataFactory.blankNode(key.substr(2));
        }
        const expandOptions = this.parsingContext.getExpandOptions();
        let expanded = context.expandTerm(key, true, expandOptions);
        if (expanded === key) {
          expanded = context.expandTerm(key, false, expandOptions);
        }
        if (!Util2.isValidIri(expanded)) {
          if (expanded && this.parsingContext.strictValues && !expanded.startsWith("@")) {
            this.parsingContext.emitError(new Error(`Invalid term IRI: ${expanded}`));
          } else {
            return null;
          }
        }
        return this.dataFactory.namedNode(expanded);
      }
      /**
       * Ensure that the given value becomes a string.
       * @param {string | number} value A string or number.
       * @param {NamedNode} datatype The intended datatype.
       * @return {string} The returned string.
       */
      intToString(value, datatype) {
        if (typeof value === "number") {
          if (Number.isFinite(value)) {
            const isInteger = value % 1 === 0;
            if (isInteger && (!datatype || datatype.value !== Util2.XSD_DOUBLE)) {
              return Number(value).toString();
            } else {
              return value.toExponential(15).replace(/(\d)0*e\+?/, "$1E");
            }
          } else {
            return value > 0 ? "INF" : "-INF";
          }
        } else {
          return value;
        }
      }
      /**
       * Convert a given JSON string value to an RDF term.
       * @param {number} depth The current stack depth.
       * @param {JsonLdContextNormalized} context A JSON-LD context.
       * @param {string} key The current JSON key.
       * @param {string} value A JSON value.
       * @param {NamedNode} defaultDatatype The default datatype for the given value.
       * @return {RDF.Term} An RDF term or null.
       */
      stringValueToTerm(depth, context, key, value, defaultDatatype) {
        const contextType = Util2.getContextValueType(context, key);
        if (contextType) {
          if (contextType === "@id") {
            if (!defaultDatatype) {
              return this.resourceToTerm(context, this.intToString(value, defaultDatatype));
            }
          } else if (contextType === "@vocab") {
            if (!defaultDatatype) {
              return this.createVocabOrBaseTerm(context, this.intToString(value, defaultDatatype));
            }
          } else {
            defaultDatatype = this.dataFactory.namedNode(contextType);
          }
        }
        if (!defaultDatatype) {
          const contextLanguage = Util2.getContextValueLanguage(context, key);
          const contextDirection = Util2.getContextValueDirection(context, key);
          if (contextDirection && this.parsingContext.rdfDirection !== "disabled") {
            return this.createLanguageDirectionLiteral(depth, this.intToString(value, defaultDatatype), contextLanguage, contextDirection);
          } else {
            return this.dataFactory.literal(this.intToString(value, defaultDatatype), contextLanguage);
          }
        }
        return this.dataFactory.literal(this.intToString(value, defaultDatatype), defaultDatatype);
      }
      /**
       * Create a literal for the given value with the given language and direction.
       * Auxiliary quads may be emitted.
       * @param {number} depth The current stack depth.
       * @param {string} value A string value.
       * @param {string} language A language tag.
       * @param {string} direction A direction.
       * @return {Term} An RDF term.
       */
      createLanguageDirectionLiteral(depth, value, language, direction) {
        if (this.parsingContext.rdfDirection === "i18n-datatype") {
          if (!language) {
            language = "";
          }
          return this.dataFactory.literal(value, this.dataFactory.namedNode(`https://www.w3.org/ns/i18n#${language}_${direction}`));
        } else if (this.parsingContext.rdfDirection === "compound-literal") {
          const valueNode = this.dataFactory.blankNode();
          const graph = this.getDefaultGraph();
          this.parsingContext.emitQuad(depth, this.dataFactory.quad(valueNode, this.dataFactory.namedNode(Util2.RDF + "value"), this.dataFactory.literal(value), graph));
          if (language) {
            this.parsingContext.emitQuad(depth, this.dataFactory.quad(valueNode, this.dataFactory.namedNode(Util2.RDF + "language"), this.dataFactory.literal(language), graph));
          }
          this.parsingContext.emitQuad(depth, this.dataFactory.quad(valueNode, this.dataFactory.namedNode(Util2.RDF + "direction"), this.dataFactory.literal(direction), graph));
          return valueNode;
        } else {
          return this.dataFactory.literal(value, { language: language || "", direction });
        }
      }
      /**
       * Stringify the given JSON object to a canonical JSON string.
       * @param value Any valid JSON value.
       * @return {string} A canonical JSON string.
       */
      valueToJsonString(value) {
        return canonicalizeJson(value);
      }
      /**
       * If the key is not a keyword, try to check if it is an alias for a keyword,
       * and if so, un-alias it.
       * @param {string} key A key, can be falsy.
       * @param {string[]} keys The path of keys.
       * @param {number} depth The depth to
       * @param {boolean} disableCache If the cache should be disabled
       * @param {JsonLdContextNormalized} context A context to unalias with,
       *                                           will fallback to retrieving the context for the given keys.
       * @return {Promise<string>} A promise resolving to the key itself, or another key.
       */
      async unaliasKeyword(key, keys, depth, disableCache, context) {
        if (Number.isInteger(key)) {
          return key;
        }
        if (!disableCache) {
          const cachedUnaliasedKeyword = this.parsingContext.unaliasedKeywordCacheStack[depth];
          if (cachedUnaliasedKeyword) {
            return cachedUnaliasedKeyword;
          }
        }
        if (!jsonld_context_parser_1.Util.isPotentialKeyword(key)) {
          context = context || await this.parsingContext.getContext(keys);
          let unliased = context.getContextRaw()[key];
          if (unliased && typeof unliased === "object") {
            unliased = unliased["@id"];
          }
          if (jsonld_context_parser_1.Util.isValidKeyword(unliased)) {
            key = unliased;
          }
        }
        return disableCache ? key : this.parsingContext.unaliasedKeywordCacheStack[depth] = key;
      }
      /**
       * Unalias the keyword of the parent.
       * This adds a safety check if no parent exist.
       * @param {any[]} keys A stack of keys.
       * @param {number} depth The current depth.
       * @return {Promise<any>} A promise resolving to the parent key, or another key.
       */
      async unaliasKeywordParent(keys, depth) {
        return await this.unaliasKeyword(depth > 0 && keys[depth - 1], keys, depth - 1);
      }
      /**
       * Un-alias all keywords in the given hash.
       * @param {{[p: string]: any}} hash A hash object.
       * @param {string[]} keys The path of keys.
       * @param {number} depth The depth.
       * @param {JsonLdContextNormalized} context A context to unalias with,
       *                                           will fallback to retrieving the context for the given keys.
       * @return {Promise<{[p: string]: any}>} A promise resolving to the new hash.
       */
      async unaliasKeywords(hash, keys, depth, context) {
        const newHash = {};
        for (const key in hash) {
          newHash[await this.unaliasKeyword(key, keys, depth + 1, true, context)] = hash[key];
        }
        return newHash;
      }
      /**
       * Check if we are processing a literal (including JSON literals) at the given depth.
       * This will also check higher levels,
       * because if a parent is a literal,
       * then the deeper levels are definitely a literal as well.
       * @param {any[]} keys The keys.
       * @param {number} depth The depth.
       * @return {boolean} If we are processing a literal.
       */
      async isLiteral(keys, depth) {
        for (let i = depth; i >= 0; i--) {
          if (await this.unaliasKeyword(keys[i], keys, i) === "@annotation") {
            return false;
          }
          if (this.parsingContext.literalStack[i] || this.parsingContext.jsonLiteralStack[i]) {
            return true;
          }
        }
        return false;
      }
      /**
       * Check how many parents should be skipped for checking the @graph for the given node.
       *
       * @param {number} depth The depth of the node.
       * @param {any[]} keys An array of keys.
       * @return {number} The graph depth offset.
       */
      async getDepthOffsetGraph(depth, keys) {
        for (let i = depth - 1; i > 0; i--) {
          if (await this.unaliasKeyword(keys[i], keys, i) === "@graph") {
            const containers = (await EntryHandlerContainer_1.EntryHandlerContainer.getContainerHandler(this.parsingContext, keys, i)).containers;
            if (EntryHandlerContainer_1.EntryHandlerContainer.isComplexGraphContainer(containers)) {
              return -1;
            }
            return depth - i - 1;
          }
        }
        return -1;
      }
      /**
       * Check if the given subject is of a valid type.
       * This should be called when applying @reverse'd properties.
       * @param {Term} subject A subject.
       */
      validateReverseSubject(subject) {
        if (subject.termType === "Literal") {
          throw new jsonld_context_parser_1.ErrorCoded(`Found illegal literal in subject position: ${subject.value}`, jsonld_context_parser_1.ERROR_CODES.INVALID_REVERSE_PROPERTY_VALUE);
        }
      }
      /**
       * Get the default graph.
       * @return {Term} An RDF term.
       */
      getDefaultGraph() {
        return this.parsingContext.defaultGraph || this.dataFactory.defaultGraph();
      }
      /**
       * Get the current graph, while taking into account a graph that can be defined via @container: @graph.
       * If not within a graph container, the default graph will be returned.
       * @param keys The current keys.
       * @param depth The current depth.
       */
      async getGraphContainerValue(keys, depth) {
        let graph = this.getDefaultGraph();
        const { containers, depth: depthContainer } = await EntryHandlerContainer_1.EntryHandlerContainer.getContainerHandler(this.parsingContext, keys, depth);
        if ("@graph" in containers) {
          const graphContainerIndex = EntryHandlerContainer_1.EntryHandlerContainer.getContainerGraphIndex(containers, depthContainer, keys);
          const entry = this.parsingContext.graphContainerTermStack[depthContainer];
          graph = entry ? entry[graphContainerIndex] : null;
          if (!graph) {
            let graphId = null;
            if ("@id" in containers) {
              const keyUnaliased = await this.getContainerKey(keys[depthContainer], keys, depthContainer);
              if (keyUnaliased !== null) {
                graphId = await this.resourceToTerm(await this.parsingContext.getContext(keys), keyUnaliased);
              }
            }
            if (!graphId) {
              graphId = this.dataFactory.blankNode();
            }
            if (!this.parsingContext.graphContainerTermStack[depthContainer]) {
              this.parsingContext.graphContainerTermStack[depthContainer] = {};
            }
            graph = this.parsingContext.graphContainerTermStack[depthContainer][graphContainerIndex] = graphId;
          }
        }
        return graph;
      }
      /**
       * Get the properties depth for retrieving properties.
       *
       * Typically, the properties depth will be identical to the given depth.
       *
       * The following exceptions apply:
       * * When the parent is @reverse, the depth is decremented by one.
       * * When @nest parents are found, the depth is decremented by the number of @nest parents.
       * If in combination with the exceptions above an intermediary array is discovered,
       * the depth is also decremented by this number of arrays.
       *
       * @param keys The current key chain.
       * @param depth The current depth.
       */
      async getPropertiesDepth(keys, depth) {
        let lastValidDepth = depth;
        for (let i = depth - 1; i > 0; i--) {
          if (typeof keys[i] !== "number") {
            const parentKey = await this.unaliasKeyword(keys[i], keys, i);
            if (parentKey === "@reverse") {
              return i;
            } else if (parentKey === "@nest") {
              lastValidDepth = i;
            } else {
              return lastValidDepth;
            }
          }
        }
        return lastValidDepth;
      }
      /**
       * Get the key for the current container entry.
       * @param key A key, can be falsy.
       * @param keys The key chain.
       * @param depth The current depth to get the key from.
       * @return Promise resolving to the key.
       *         Null will be returned for @none entries, with aliasing taken into account.
       */
      async getContainerKey(key, keys, depth) {
        const keyUnaliased = await this.unaliasKeyword(key, keys, depth);
        return keyUnaliased === "@none" ? null : keyUnaliased;
      }
      /**
       * Check if no reverse properties are present in embedded nodes.
       * @param key The current key.
       * @param reverse If a reverse property is active.
       * @param isEmbedded If we're in an embedded node.
       */
      validateReverseInEmbeddedNode(key, reverse, isEmbedded) {
        if (isEmbedded && reverse && !this.parsingContext.rdfstarReverseInEmbedded) {
          throw new jsonld_context_parser_1.ErrorCoded(`Illegal reverse property in embedded node in ${key}`, jsonld_context_parser_1.ERROR_CODES.INVALID_EMBEDDED_NODE);
        }
      }
      /**
       * Emit a quad, with checks.
       * @param depth The current depth.
       * @param subject S
       * @param predicate P
       * @param object O
       * @param graph G
       * @param reverse If a reverse property is active.
       * @param isEmbedded If we're in an embedded node.
       */
      emitQuadChecked(depth, subject, predicate, object, graph, reverse, isEmbedded) {
        let quad2;
        if (reverse) {
          this.validateReverseSubject(object);
          quad2 = this.dataFactory.quad(object, predicate, subject, graph);
        } else {
          quad2 = this.dataFactory.quad(subject, predicate, object, graph);
        }
        if (isEmbedded) {
          if (quad2.graph.termType !== "DefaultGraph") {
            quad2 = this.dataFactory.quad(quad2.subject, quad2.predicate, quad2.object);
          }
          if (this.parsingContext.idStack[depth - 1]) {
            throw new jsonld_context_parser_1.ErrorCoded(`Illegal multiple properties in an embedded node`, jsonld_context_parser_1.ERROR_CODES.INVALID_EMBEDDED_NODE);
          }
          this.parsingContext.idStack[depth - 1] = [quad2];
        } else {
          this.parsingContext.emitQuad(depth, quad2);
        }
        const annotationsBuffer = this.parsingContext.annotationsBuffer[depth];
        if (annotationsBuffer) {
          for (const annotation of annotationsBuffer) {
            this.emitAnnotation(depth, quad2, annotation);
          }
          delete this.parsingContext.annotationsBuffer[depth];
        }
      }
      // This is a separate function to enable recursion
      emitAnnotation(depth, quad2, annotation) {
        let annotationQuad;
        if (annotation.reverse) {
          this.validateReverseSubject(annotation.object);
          annotationQuad = this.dataFactory.quad(annotation.object, annotation.predicate, quad2);
        } else {
          annotationQuad = this.dataFactory.quad(quad2, annotation.predicate, annotation.object);
        }
        this.parsingContext.emitQuad(depth, annotationQuad);
        for (const nestedAnnotation of annotation.nestedAnnotations) {
          this.emitAnnotation(depth, annotationQuad, nestedAnnotation);
        }
      }
    }
    Util$1.Util = Util2;
    Util2.XSD = "http://www.w3.org/2001/XMLSchema#";
    Util2.XSD_BOOLEAN = Util2.XSD + "boolean";
    Util2.XSD_INTEGER = Util2.XSD + "integer";
    Util2.XSD_DOUBLE = Util2.XSD + "double";
    Util2.RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    return Util$1;
  }
  var hasRequiredEntryHandlerArrayValue;
  function requireEntryHandlerArrayValue() {
    if (hasRequiredEntryHandlerArrayValue) return EntryHandlerArrayValue;
    hasRequiredEntryHandlerArrayValue = 1;
    Object.defineProperty(EntryHandlerArrayValue, "__esModule", { value: true });
    EntryHandlerArrayValue.EntryHandlerArrayValue = void 0;
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    let EntryHandlerArrayValue$1 = class EntryHandlerArrayValue {
      isPropertyHandler() {
        return false;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        return this.test(parsingContext, util2, null, keys, depth);
      }
      async test(parsingContext, util2, key, keys, depth) {
        return typeof keys[depth] === "number";
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        let parentKey = await util2.unaliasKeywordParent(keys, depth);
        if (parentKey === "@list") {
          let listRootKey = null;
          let listRootDepth = 0;
          for (let i = depth - 2; i > 0; i--) {
            const keyOption = keys[i];
            if (typeof keyOption === "string" || typeof keyOption === "number") {
              listRootDepth = i;
              listRootKey = keyOption;
              break;
            }
          }
          if (listRootKey !== null) {
            const values = await util2.valueToTerm(await parsingContext.getContext(keys), listRootKey, value, depth, keys);
            for (const object of values) {
              await this.handleListElement(parsingContext, util2, object, value, depth, keys.slice(0, listRootDepth), listRootDepth);
            }
            if (values.length === 0) {
              await this.handleListElement(parsingContext, util2, null, value, depth, keys.slice(0, listRootDepth), listRootDepth);
            }
          }
        } else if (parentKey === "@set") {
          await parsingContext.newOnValueJob(keys.slice(0, -2), value, depth - 2, false);
        } else if (parentKey !== void 0 && parentKey !== "@type") {
          for (let i = depth - 1; i > 0; i--) {
            if (typeof keys[i] !== "number") {
              parentKey = await util2.unaliasKeyword(keys[i], keys, i);
              break;
            }
          }
          const parentContext = await parsingContext.getContext(keys.slice(0, -1));
          if ("@list" in Util_1.Util.getContextValueContainer(parentContext, parentKey)) {
            parsingContext.emittedStack[depth + 1] = true;
            const values = await util2.valueToTerm(await parsingContext.getContext(keys), parentKey, value, depth, keys);
            for (const object of values) {
              await this.handleListElement(parsingContext, util2, object, value, depth, keys.slice(0, -1), depth - 1);
            }
            if (values.length === 0) {
              await this.handleListElement(parsingContext, util2, null, value, depth, keys.slice(0, -1), depth - 1);
            }
          } else {
            parsingContext.shiftStack(depth, 1);
            await parsingContext.newOnValueJob(keys.slice(0, -1), value, depth - 1, false);
            parsingContext.contextTree.removeContext(keys.slice(0, -1));
          }
        }
      }
      async handleListElement(parsingContext, util2, value, valueOriginal, depth, listRootKeys, listRootDepth) {
        let listPointer = parsingContext.listPointerStack[depth];
        if (valueOriginal !== null && (await util2.unaliasKeywords(valueOriginal, listRootKeys, depth))["@value"] !== null) {
          if (!listPointer || !listPointer.value) {
            const linkTerm = util2.dataFactory.blankNode();
            listPointer = { value: linkTerm, listRootDepth, listId: linkTerm };
          } else {
            const newLinkTerm = util2.dataFactory.blankNode();
            parsingContext.emitQuad(depth, util2.dataFactory.quad(listPointer.value, util2.rdfRest, newLinkTerm, util2.getDefaultGraph()));
            listPointer.value = newLinkTerm;
          }
          if (value) {
            parsingContext.emitQuad(depth, util2.dataFactory.quad(listPointer.value, util2.rdfFirst, value, util2.getDefaultGraph()));
          }
        } else {
          if (!listPointer) {
            listPointer = { listRootDepth, listId: util2.rdfNil };
          }
        }
        parsingContext.listPointerStack[depth] = listPointer;
        if (parsingContext.rdfstar && parsingContext.annotationsBuffer[depth]) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal annotation inside a list`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
        }
      }
    };
    EntryHandlerArrayValue.EntryHandlerArrayValue = EntryHandlerArrayValue$1;
    return EntryHandlerArrayValue;
  }
  var EntryHandlerInvalidFallback = {};
  var hasRequiredEntryHandlerInvalidFallback;
  function requireEntryHandlerInvalidFallback() {
    if (hasRequiredEntryHandlerInvalidFallback) return EntryHandlerInvalidFallback;
    hasRequiredEntryHandlerInvalidFallback = 1;
    Object.defineProperty(EntryHandlerInvalidFallback, "__esModule", { value: true });
    EntryHandlerInvalidFallback.EntryHandlerInvalidFallback = void 0;
    let EntryHandlerInvalidFallback$1 = class EntryHandlerInvalidFallback {
      isPropertyHandler() {
        return false;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        return false;
      }
      async test(parsingContext, util2, key, keys, depth) {
        return true;
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        parsingContext.emittedStack[depth] = false;
      }
    };
    EntryHandlerInvalidFallback.EntryHandlerInvalidFallback = EntryHandlerInvalidFallback$1;
    return EntryHandlerInvalidFallback;
  }
  var EntryHandlerKeywordContext = {};
  var EntryHandlerKeyword = {};
  var hasRequiredEntryHandlerKeyword;
  function requireEntryHandlerKeyword() {
    if (hasRequiredEntryHandlerKeyword) return EntryHandlerKeyword;
    hasRequiredEntryHandlerKeyword = 1;
    Object.defineProperty(EntryHandlerKeyword, "__esModule", { value: true });
    EntryHandlerKeyword.EntryHandlerKeyword = void 0;
    let EntryHandlerKeyword$1 = class EntryHandlerKeyword {
      constructor(keyword) {
        this.keyword = keyword;
      }
      isPropertyHandler() {
        return false;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        return false;
      }
      async test(parsingContext, util2, key, keys, depth) {
        return key === this.keyword;
      }
    };
    EntryHandlerKeyword.EntryHandlerKeyword = EntryHandlerKeyword$1;
    return EntryHandlerKeyword;
  }
  var hasRequiredEntryHandlerKeywordContext;
  function requireEntryHandlerKeywordContext() {
    if (hasRequiredEntryHandlerKeywordContext) return EntryHandlerKeywordContext;
    hasRequiredEntryHandlerKeywordContext = 1;
    Object.defineProperty(EntryHandlerKeywordContext, "__esModule", { value: true });
    EntryHandlerKeywordContext.EntryHandlerKeywordContext = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordContext$1 = class EntryHandlerKeywordContext extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@context");
      }
      isStackProcessor() {
        return false;
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        if (parsingContext.streamingProfile && (parsingContext.processingStack[depth] || parsingContext.processingType[depth] || parsingContext.idStack[depth] !== void 0)) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded("Found an out-of-order context, while streaming is enabled.(disable `streamingProfile`)", jsonld_context_parser_1.ERROR_CODES.INVALID_STREAMING_KEY_ORDER));
        }
        const parentContext = parsingContext.getContext(keys);
        const context = parsingContext.parseContext(value, (await parentContext).getContextRaw());
        parsingContext.contextTree.setContext(keys.slice(0, -1), context);
        parsingContext.emitContext(value);
        await parsingContext.validateContext(await context);
      }
    };
    EntryHandlerKeywordContext.EntryHandlerKeywordContext = EntryHandlerKeywordContext$1;
    return EntryHandlerKeywordContext;
  }
  var EntryHandlerKeywordGraph = {};
  var hasRequiredEntryHandlerKeywordGraph;
  function requireEntryHandlerKeywordGraph() {
    if (hasRequiredEntryHandlerKeywordGraph) return EntryHandlerKeywordGraph;
    hasRequiredEntryHandlerKeywordGraph = 1;
    Object.defineProperty(EntryHandlerKeywordGraph, "__esModule", { value: true });
    EntryHandlerKeywordGraph.EntryHandlerKeywordGraph = void 0;
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordGraph$1 = class EntryHandlerKeywordGraph extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@graph");
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        parsingContext.graphStack[depth + 1] = true;
      }
    };
    EntryHandlerKeywordGraph.EntryHandlerKeywordGraph = EntryHandlerKeywordGraph$1;
    return EntryHandlerKeywordGraph;
  }
  var EntryHandlerKeywordId = {};
  var hasRequiredEntryHandlerKeywordId;
  function requireEntryHandlerKeywordId() {
    if (hasRequiredEntryHandlerKeywordId) return EntryHandlerKeywordId;
    hasRequiredEntryHandlerKeywordId = 1;
    Object.defineProperty(EntryHandlerKeywordId, "__esModule", { value: true });
    EntryHandlerKeywordId.EntryHandlerKeywordId = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordId$1 = class EntryHandlerKeywordId extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@id");
      }
      isStackProcessor() {
        return false;
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        if (typeof value !== "string") {
          if (parsingContext.rdfstar && typeof value === "object") {
            const valueKeys = Object.keys(value);
            if (valueKeys.length === 1 && valueKeys[0] === "@id") {
              parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Invalid embedded node without property with @id ${value["@id"]}`, jsonld_context_parser_1.ERROR_CODES.INVALID_EMBEDDED_NODE));
            }
          } else {
            parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found illegal @id '${value}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_ID_VALUE));
          }
          return;
        }
        const depthProperties = await util2.getPropertiesDepth(keys, depth);
        if (parsingContext.idStack[depthProperties] !== void 0) {
          if (parsingContext.idStack[depthProperties][0].listHead) {
            parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found illegal neighbouring entries next to @list for key: '${keys[depth - 1]}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_SET_OR_LIST_OBJECT));
          } else {
            parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found duplicate @ids '${parsingContext.idStack[depthProperties][0].value}' and '${value}'`, jsonld_context_parser_1.ERROR_CODES.COLLIDING_KEYWORDS));
          }
        }
        if (parsingContext.rdfstar && parsingContext.annotationsBuffer[depth]) {
          for (const annotation of parsingContext.annotationsBuffer[depth]) {
            if (annotation.depth === depth) {
              parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal @id inside an annotation: ${value}`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
            }
          }
        }
        parsingContext.idStack[depthProperties] = util2.nullableTermToArray(await util2.resourceToTerm(await parsingContext.getContext(keys), value));
      }
    };
    EntryHandlerKeywordId.EntryHandlerKeywordId = EntryHandlerKeywordId$1;
    return EntryHandlerKeywordId;
  }
  var EntryHandlerKeywordIncluded = {};
  var hasRequiredEntryHandlerKeywordIncluded;
  function requireEntryHandlerKeywordIncluded() {
    if (hasRequiredEntryHandlerKeywordIncluded) return EntryHandlerKeywordIncluded;
    hasRequiredEntryHandlerKeywordIncluded = 1;
    Object.defineProperty(EntryHandlerKeywordIncluded, "__esModule", { value: true });
    EntryHandlerKeywordIncluded.EntryHandlerKeywordIncluded = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordIncluded$1 = class EntryHandlerKeywordIncluded extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@included");
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        if (typeof value !== "object") {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found illegal @included '${value}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_INCLUDED_VALUE));
        }
        const valueUnliased = await util2.unaliasKeywords(value, keys, depth, await parsingContext.getContext(keys));
        if ("@value" in valueUnliased) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal @included @value node '${JSON.stringify(value)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_INCLUDED_VALUE));
        }
        if ("@list" in valueUnliased) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an illegal @included @list node '${JSON.stringify(value)}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_INCLUDED_VALUE));
        }
        parsingContext.emittedStack[depth] = false;
      }
    };
    EntryHandlerKeywordIncluded.EntryHandlerKeywordIncluded = EntryHandlerKeywordIncluded$1;
    return EntryHandlerKeywordIncluded;
  }
  var EntryHandlerKeywordNest = {};
  var hasRequiredEntryHandlerKeywordNest;
  function requireEntryHandlerKeywordNest() {
    if (hasRequiredEntryHandlerKeywordNest) return EntryHandlerKeywordNest;
    hasRequiredEntryHandlerKeywordNest = 1;
    Object.defineProperty(EntryHandlerKeywordNest, "__esModule", { value: true });
    EntryHandlerKeywordNest.EntryHandlerKeywordNest = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordNest$1 = class EntryHandlerKeywordNest extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@nest");
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        if (typeof value !== "object") {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found invalid @nest entry for '${key}': '${value}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_NEST_VALUE));
        }
        if ("@value" in await util2.unaliasKeywords(value, keys, depth, await parsingContext.getContext(keys))) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found an invalid @value node for '${key}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_NEST_VALUE));
        }
        parsingContext.emittedStack[depth] = false;
      }
    };
    EntryHandlerKeywordNest.EntryHandlerKeywordNest = EntryHandlerKeywordNest$1;
    return EntryHandlerKeywordNest;
  }
  var EntryHandlerKeywordType = {};
  var hasRequiredEntryHandlerKeywordType;
  function requireEntryHandlerKeywordType() {
    if (hasRequiredEntryHandlerKeywordType) return EntryHandlerKeywordType;
    hasRequiredEntryHandlerKeywordType = 1;
    Object.defineProperty(EntryHandlerKeywordType, "__esModule", { value: true });
    EntryHandlerKeywordType.EntryHandlerKeywordType = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    const EntryHandlerPredicate_1 = /* @__PURE__ */ requireEntryHandlerPredicate();
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordType$1 = class EntryHandlerKeywordType extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@type");
      }
      isStackProcessor() {
        return false;
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        const keyOriginal = keys[depth];
        const context = await parsingContext.getContext(keys);
        const predicate = util2.rdfType;
        const parentKey = await util2.unaliasKeywordParent(keys, depth);
        const reverse = Util_1.Util.isPropertyReverse(context, keyOriginal, parentKey);
        const isEmbedded = Util_1.Util.isPropertyInEmbeddedNode(parentKey);
        util2.validateReverseInEmbeddedNode(key, reverse, isEmbedded);
        const isAnnotation = Util_1.Util.isPropertyInAnnotationObject(parentKey);
        const elements = Array.isArray(value) ? value : [value];
        for (const element of elements) {
          if (typeof element !== "string") {
            parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found illegal @type '${element}'`, jsonld_context_parser_1.ERROR_CODES.INVALID_TYPE_VALUE));
          }
          const type = util2.createVocabOrBaseTerm(context, element);
          if (type) {
            await EntryHandlerPredicate_1.EntryHandlerPredicate.handlePredicateObject(parsingContext, util2, keys, depth, predicate, type, reverse, isEmbedded, isAnnotation);
          }
        }
        let scopedContext = Promise.resolve(context);
        let hasTypedScopedContext = false;
        for (const element of elements.sort()) {
          const typeContext = Util_1.Util.getContextValue(context, "@context", element, null);
          if (typeContext) {
            hasTypedScopedContext = true;
            scopedContext = scopedContext.then((c) => parsingContext.parseContext(typeContext, c.getContextRaw()));
          }
        }
        if (parsingContext.streamingProfile && (hasTypedScopedContext || !parsingContext.streamingProfileAllowOutOfOrderPlainType) && (parsingContext.processingStack[depth] || parsingContext.idStack[depth])) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded("Found an out-of-order type-scoped context, while streaming is enabled.(disable `streamingProfile`)", jsonld_context_parser_1.ERROR_CODES.INVALID_STREAMING_KEY_ORDER));
        }
        if (hasTypedScopedContext) {
          scopedContext = scopedContext.then((c) => {
            if (c.getContextRaw()["@propagate"] !== true) {
              return new jsonld_context_parser_1.JsonLdContextNormalized(Object.assign(Object.assign({}, c.getContextRaw()), { "@propagate": false, "@__propagateFallback": context.getContextRaw() }));
            }
            return c;
          });
          parsingContext.contextTree.setContext(keys.slice(0, keys.length - 1), scopedContext);
        }
        parsingContext.processingType[depth] = true;
      }
    };
    EntryHandlerKeywordType.EntryHandlerKeywordType = EntryHandlerKeywordType$1;
    return EntryHandlerKeywordType;
  }
  var EntryHandlerKeywordUnknownFallback = {};
  var hasRequiredEntryHandlerKeywordUnknownFallback;
  function requireEntryHandlerKeywordUnknownFallback() {
    if (hasRequiredEntryHandlerKeywordUnknownFallback) return EntryHandlerKeywordUnknownFallback;
    hasRequiredEntryHandlerKeywordUnknownFallback = 1;
    Object.defineProperty(EntryHandlerKeywordUnknownFallback, "__esModule", { value: true });
    EntryHandlerKeywordUnknownFallback.EntryHandlerKeywordUnknownFallback = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    let EntryHandlerKeywordUnknownFallback$1 = class EntryHandlerKeywordUnknownFallback2 {
      isPropertyHandler() {
        return false;
      }
      isStackProcessor() {
        return true;
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        const key = await util2.unaliasKeyword(keys[depth], keys, depth);
        if (jsonld_context_parser_1.Util.isPotentialKeyword(key)) {
          if (!inProperty) {
            if (key === "@list") {
              return false;
            }
          }
          return true;
        }
        return false;
      }
      async test(parsingContext, util2, key, keys, depth) {
        return jsonld_context_parser_1.Util.isPotentialKeyword(key);
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        const keywordType = EntryHandlerKeywordUnknownFallback2.VALID_KEYWORDS_TYPES[key];
        if (keywordType !== void 0) {
          if (keywordType && typeof value !== keywordType.type) {
            parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Invalid value type for '${key}' with value '${value}'`, keywordType.errorCode));
          }
        } else if (parsingContext.strictValues) {
          parsingContext.emitError(new Error(`Unknown keyword '${key}' with value '${value}'`));
        }
        parsingContext.emittedStack[depth] = false;
      }
    };
    EntryHandlerKeywordUnknownFallback.EntryHandlerKeywordUnknownFallback = EntryHandlerKeywordUnknownFallback$1;
    EntryHandlerKeywordUnknownFallback$1.VALID_KEYWORDS_TYPES = {
      "@index": { type: "string", errorCode: jsonld_context_parser_1.ERROR_CODES.INVALID_INDEX_VALUE },
      "@list": null,
      "@reverse": { type: "object", errorCode: jsonld_context_parser_1.ERROR_CODES.INVALID_REVERSE_VALUE },
      "@set": null,
      "@value": null
    };
    return EntryHandlerKeywordUnknownFallback;
  }
  var EntryHandlerKeywordValue = {};
  var hasRequiredEntryHandlerKeywordValue;
  function requireEntryHandlerKeywordValue() {
    if (hasRequiredEntryHandlerKeywordValue) return EntryHandlerKeywordValue;
    hasRequiredEntryHandlerKeywordValue = 1;
    Object.defineProperty(EntryHandlerKeywordValue, "__esModule", { value: true });
    EntryHandlerKeywordValue.EntryHandlerKeywordValue = void 0;
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    let EntryHandlerKeywordValue$1 = class EntryHandlerKeywordValue extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@value");
      }
      async validate(parsingContext, util2, keys, depth, inProperty) {
        const key = keys[depth];
        if (key && !parsingContext.literalStack[depth] && await this.test(parsingContext, util2, key, keys, depth)) {
          parsingContext.literalStack[depth] = true;
        }
        return super.validate(parsingContext, util2, keys, depth, inProperty);
      }
      async test(parsingContext, util2, key, keys, depth) {
        return await util2.unaliasKeyword(keys[depth], keys.slice(0, keys.length - 1), depth - 1, true) === "@value";
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        parsingContext.literalStack[depth] = true;
        delete parsingContext.unidentifiedValuesBuffer[depth];
        delete parsingContext.unidentifiedGraphsBuffer[depth];
        parsingContext.emittedStack[depth] = false;
      }
    };
    EntryHandlerKeywordValue.EntryHandlerKeywordValue = EntryHandlerKeywordValue$1;
    return EntryHandlerKeywordValue;
  }
  var ParsingContext = {};
  var ContextTree = {};
  var hasRequiredContextTree;
  function requireContextTree() {
    if (hasRequiredContextTree) return ContextTree;
    hasRequiredContextTree = 1;
    Object.defineProperty(ContextTree, "__esModule", { value: true });
    ContextTree.ContextTree = void 0;
    let ContextTree$1 = class ContextTree2 {
      constructor() {
        this.subTrees = {};
      }
      getContext(keys) {
        if (keys.length > 0) {
          const [head, ...tail] = keys;
          const subTree = this.subTrees[head];
          if (subTree) {
            const subContext = subTree.getContext(tail);
            if (subContext) {
              return subContext.then(({ context, depth }) => ({ context, depth: depth + 1 }));
            }
          }
        }
        return this.context ? this.context.then((context) => ({ context, depth: 0 })) : null;
      }
      setContext(keys, context) {
        if (keys.length === 0) {
          this.context = context;
        } else {
          const [head, ...tail] = keys;
          let subTree = this.subTrees[head];
          if (!subTree) {
            subTree = this.subTrees[head] = new ContextTree2();
          }
          subTree.setContext(tail, context);
        }
      }
      removeContext(path) {
        this.setContext(path, null);
      }
    };
    ContextTree.ContextTree = ContextTree$1;
    return ContextTree;
  }
  var hasRequiredParsingContext;
  function requireParsingContext() {
    if (hasRequiredParsingContext) return ParsingContext;
    hasRequiredParsingContext = 1;
    Object.defineProperty(ParsingContext, "__esModule", { value: true });
    ParsingContext.ParsingContext = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const ErrorCoded_1 = /* @__PURE__ */ requireErrorCoded();
    const ContextTree_1 = /* @__PURE__ */ requireContextTree();
    const JsonLdParser_1 = /* @__PURE__ */ requireJsonLdParser();
    let ParsingContext$1 = class ParsingContext2 {
      constructor(options) {
        this.contextParser = new jsonld_context_parser_1.ContextParser({ documentLoader: options.documentLoader, skipValidation: options.skipContextValidation });
        this.streamingProfile = !!options.streamingProfile;
        this.baseIRI = options.baseIRI;
        this.produceGeneralizedRdf = !!options.produceGeneralizedRdf;
        this.allowSubjectList = !!options.allowSubjectList;
        this.processingMode = options.processingMode || JsonLdParser_1.JsonLdParser.DEFAULT_PROCESSING_MODE;
        this.strictValues = !!options.strictValues;
        this.validateValueIndexes = !!options.validateValueIndexes;
        this.defaultGraph = options.defaultGraph;
        this.rdfDirection = options.rdfDirection;
        this.normalizeLanguageTags = options.normalizeLanguageTags;
        this.streamingProfileAllowOutOfOrderPlainType = options.streamingProfileAllowOutOfOrderPlainType;
        this.rdfstar = options.rdfstar !== false;
        this.rdfstarReverseInEmbedded = options.rdfstarReverseInEmbedded;
        this.topLevelProperties = false;
        this.activeProcessingMode = parseFloat(this.processingMode);
        this.processingStack = [];
        this.processingType = [];
        this.emittedStack = [];
        this.idStack = [];
        this.graphStack = [];
        this.graphContainerTermStack = [];
        this.listPointerStack = [];
        this.contextTree = new ContextTree_1.ContextTree();
        this.literalStack = [];
        this.validationStack = [];
        this.unaliasedKeywordCacheStack = [];
        this.jsonLiteralStack = [];
        this.unidentifiedValuesBuffer = [];
        this.unidentifiedGraphsBuffer = [];
        this.annotationsBuffer = [];
        this.pendingContainerFlushBuffers = [];
        this.parser = options.parser;
        if (options.context) {
          this.rootContext = this.parseContext(options.context, void 0, void 0, true);
          this.rootContext.then((context) => this.validateContext(context));
        } else {
          this.rootContext = Promise.resolve(new jsonld_context_parser_1.JsonLdContextNormalized(this.baseIRI ? { "@base": this.baseIRI, "@__baseDocument": true } : {}));
        }
      }
      /**
       * Parse the given context with the configured options.
       * @param {JsonLdContext} context A context to parse.
       * @param {JsonLdContextNormalized} parentContext An optional parent context.
       * @param {boolean} ignoreProtection If @protected term checks should be ignored.
       * @param {boolean} allowDirectlyNestedContext If @context entries should be allowed. Useful for scoped context.
       * @return {Promise<JsonLdContextNormalized>} A promise resolving to the parsed context.
       */
      async parseContext(context, parentContext, ignoreProtection, allowDirectlyNestedContext) {
        return this.contextParser.parse(context, {
          baseIRI: this.baseIRI,
          ignoreProtection,
          normalizeLanguageTags: this.normalizeLanguageTags,
          parentContext,
          processingMode: this.activeProcessingMode,
          disallowDirectlyNestedContext: !allowDirectlyNestedContext
        });
      }
      /**
       * Check if the given context is valid.
       * If not, an error will be thrown.
       * @param {JsonLdContextNormalized} context A context.
       */
      validateContext(context) {
        const activeVersion = context.getContextRaw()["@version"];
        if (activeVersion) {
          if (this.activeProcessingMode && activeVersion > this.activeProcessingMode) {
            throw new ErrorCoded_1.ErrorCoded(`Unsupported JSON-LD version '${activeVersion}' under active processing mode ${this.activeProcessingMode}.`, ErrorCoded_1.ERROR_CODES.PROCESSING_MODE_CONFLICT);
          } else {
            if (this.activeProcessingMode && activeVersion < this.activeProcessingMode) {
              throw new ErrorCoded_1.ErrorCoded(`Invalid JSON-LD version ${activeVersion} under active processing mode ${this.activeProcessingMode}.`, ErrorCoded_1.ERROR_CODES.INVALID_VERSION_VALUE);
            }
            this.activeProcessingMode = activeVersion;
          }
        }
      }
      /**
       * Get the context at the given path.
       * @param {keys} keys The path of keys to get the context at.
       * @param {number} offset The path offset, defaults to 1.
       * @return {Promise<JsonLdContextNormalized>} A promise resolving to a context.
       */
      async getContext(keys, offset = 1) {
        const keysOriginal = keys;
        while (typeof keys[keys.length - 1] === "number") {
          keys = keys.slice(0, keys.length - 1);
        }
        if (offset) {
          keys = keys.slice(0, -offset);
        }
        const contextData = await this.getContextPropagationAware(keys);
        const context = contextData.context;
        let contextRaw = context.getContextRaw();
        for (let i = contextData.depth; i < keysOriginal.length - offset; i++) {
          const key = keysOriginal[i];
          const contextKeyEntry = contextRaw[key];
          if (contextKeyEntry && typeof contextKeyEntry === "object" && "@context" in contextKeyEntry) {
            const scopedContext = (await this.parseContext(contextKeyEntry, contextRaw, true, true)).getContextRaw();
            const propagate = !(key in scopedContext) || scopedContext[key]["@context"]["@propagate"];
            if (propagate !== false || i === keysOriginal.length - 1 - offset) {
              contextRaw = Object.assign({}, scopedContext);
              delete contextRaw["@propagate"];
              contextRaw[key] = Object.assign({}, contextRaw[key]);
              if ("@id" in contextKeyEntry) {
                contextRaw[key]["@id"] = contextKeyEntry["@id"];
              }
              delete contextRaw[key]["@context"];
              if (propagate !== false) {
                this.contextTree.setContext(keysOriginal.slice(0, i + offset), Promise.resolve(new jsonld_context_parser_1.JsonLdContextNormalized(contextRaw)));
              }
            }
          }
        }
        return new jsonld_context_parser_1.JsonLdContextNormalized(contextRaw);
      }
      /**
       * Get the context at the given path.
       * Non-propagating contexts will be skipped,
       * unless the context at that exact depth is retrieved.
       *
       * This ONLY takes into account context propagation logic,
       * so this should usually not be called directly,
       * call {@link #getContext} instead.
       *
       * @param keys The path of keys to get the context at.
       * @return {Promise<{ context: JsonLdContextNormalized, depth: number }>} A context and its depth.
       */
      async getContextPropagationAware(keys) {
        const originalDepth = keys.length;
        let contextData = null;
        let hasApplicablePropertyScopedContext;
        do {
          hasApplicablePropertyScopedContext = false;
          if (contextData && "@__propagateFallback" in contextData.context.getContextRaw()) {
            contextData.context = new jsonld_context_parser_1.JsonLdContextNormalized(contextData.context.getContextRaw()["@__propagateFallback"]);
          } else {
            if (contextData) {
              keys = keys.slice(0, contextData.depth - 1);
            }
            contextData = await this.contextTree.getContext(keys) || { context: await this.rootContext, depth: 0 };
          }
          const lastKey = keys[keys.length - 1];
          if (lastKey in contextData.context.getContextRaw()) {
            const lastKeyValue = contextData.context.getContextRaw()[lastKey];
            if (lastKeyValue && typeof lastKeyValue === "object" && "@context" in lastKeyValue) {
              hasApplicablePropertyScopedContext = true;
            }
          }
        } while (contextData.depth > 0 && contextData.context.getContextRaw()["@propagate"] === false && contextData.depth !== originalDepth && !hasApplicablePropertyScopedContext);
        if (contextData.depth === 0 && contextData.context.getContextRaw()["@propagate"] === false && contextData.depth !== originalDepth) {
          contextData.context = new jsonld_context_parser_1.JsonLdContextNormalized({});
        }
        return contextData;
      }
      /**
       * Start a new job for parsing the given value.
       * @param {any[]} keys The stack of keys.
       * @param value The value to parse.
       * @param {number} depth The depth to parse at.
       * @param {boolean} lastDepthCheck If the lastDepth check should be done for buffer draining.
       * @return {Promise<void>} A promise resolving when the job is done.
       */
      async newOnValueJob(keys, value, depth, lastDepthCheck) {
        await this.parser.newOnValueJob(keys, value, depth, lastDepthCheck);
      }
      /**
       * Flush the pending container flush buffers
       * @return {boolean} If any pending buffers were flushed.
       */
      async handlePendingContainerFlushBuffers() {
        if (this.pendingContainerFlushBuffers.length > 0) {
          for (const pendingFlushBuffer of this.pendingContainerFlushBuffers) {
            await this.parser.flushBuffer(pendingFlushBuffer.depth, pendingFlushBuffer.keys);
            this.parser.flushStacks(pendingFlushBuffer.depth);
          }
          this.pendingContainerFlushBuffers.splice(0, this.pendingContainerFlushBuffers.length);
          return true;
        } else {
          return false;
        }
      }
      /**
       * Emit the given quad into the output stream.
       * @param {number} depth The depth the quad was generated at.
       * @param {Quad} quad A quad to emit.
       */
      emitQuad(depth, quad2) {
        if (depth === 1) {
          this.topLevelProperties = true;
        }
        this.parser.push(quad2);
      }
      /**
       * Emit the given error into the output stream.
       * @param {Error} error An error to emit.
       */
      emitError(error) {
        this.parser.emit("error", error);
      }
      /**
       * Emit the given context into the output stream under the 'context' event.
       * @param {JsonLdContext} context A context to emit.
       */
      emitContext(context) {
        this.parser.emit("context", context);
      }
      /**
       * Safely get or create the depth value of {@link ParsingContext.unidentifiedValuesBuffer}.
       * @param {number} depth A depth.
       * @return {{predicate: Term; object: Term; reverse: boolean}[]} An element of
       *                                                               {@link ParsingContext.unidentifiedValuesBuffer}.
       */
      getUnidentifiedValueBufferSafe(depth) {
        let buffer2 = this.unidentifiedValuesBuffer[depth];
        if (!buffer2) {
          buffer2 = [];
          this.unidentifiedValuesBuffer[depth] = buffer2;
        }
        return buffer2;
      }
      /**
       * Safely get or create the depth value of {@link ParsingContext.unidentifiedGraphsBuffer}.
       * @param {number} depth A depth.
       * @return {{predicate: Term; object: Term; reverse: boolean}[]} An element of
       *                                                               {@link ParsingContext.unidentifiedGraphsBuffer}.
       */
      getUnidentifiedGraphBufferSafe(depth) {
        let buffer2 = this.unidentifiedGraphsBuffer[depth];
        if (!buffer2) {
          buffer2 = [];
          this.unidentifiedGraphsBuffer[depth] = buffer2;
        }
        return buffer2;
      }
      /**
       * Safely get or create the depth value of {@link ParsingContext.annotationsBuffer}.
       * @param {number} depth A depth.
       * @return {} An element of {@link ParsingContext.annotationsBuffer}.
       */
      getAnnotationsBufferSafe(depth) {
        let buffer2 = this.annotationsBuffer[depth];
        if (!buffer2) {
          buffer2 = [];
          this.annotationsBuffer[depth] = buffer2;
        }
        return buffer2;
      }
      /**
       * @return IExpandOptions The expand options for the active processing mode.
       */
      getExpandOptions() {
        return ParsingContext2.EXPAND_OPTIONS[this.activeProcessingMode];
      }
      /**
       * Shift the stack at the given offset to the given depth.
       *
       * This will override anything in the stack at `depth`,
       * and this will remove anything at `depth + depthOffset`
       *
       * @param depth The target depth.
       * @param depthOffset The origin depth, relative to `depth`.
       */
      shiftStack(depth, depthOffset) {
        const deeperIdStack = this.idStack[depth + depthOffset];
        if (deeperIdStack) {
          this.idStack[depth] = deeperIdStack;
          this.emittedStack[depth] = true;
          delete this.idStack[depth + depthOffset];
        }
        if (this.pendingContainerFlushBuffers.length) {
          for (const buffer2 of this.pendingContainerFlushBuffers) {
            if (buffer2.depth >= depth + depthOffset) {
              buffer2.depth -= depthOffset;
              buffer2.keys.splice(depth, depthOffset);
            }
          }
        }
        if (this.unidentifiedValuesBuffer[depth + depthOffset]) {
          this.unidentifiedValuesBuffer[depth] = this.unidentifiedValuesBuffer[depth + depthOffset];
          delete this.unidentifiedValuesBuffer[depth + depthOffset];
        }
        if (this.annotationsBuffer[depth + depthOffset - 1]) {
          if (!this.annotationsBuffer[depth - 1]) {
            this.annotationsBuffer[depth - 1] = [];
          }
          this.annotationsBuffer[depth - 1] = [
            ...this.annotationsBuffer[depth - 1],
            ...this.annotationsBuffer[depth + depthOffset - 1]
          ];
          delete this.annotationsBuffer[depth + depthOffset - 1];
        }
      }
    };
    ParsingContext.ParsingContext = ParsingContext$1;
    ParsingContext$1.EXPAND_OPTIONS = {
      1: {
        allowPrefixForcing: false,
        allowPrefixNonGenDelims: false,
        allowVocabRelativeToBase: false
      },
      1.1: {
        allowPrefixForcing: true,
        allowPrefixNonGenDelims: false,
        allowVocabRelativeToBase: true
      }
    };
    return ParsingContext;
  }
  var EntryHandlerKeywordAnnotation = {};
  var hasRequiredEntryHandlerKeywordAnnotation;
  function requireEntryHandlerKeywordAnnotation() {
    if (hasRequiredEntryHandlerKeywordAnnotation) return EntryHandlerKeywordAnnotation;
    hasRequiredEntryHandlerKeywordAnnotation = 1;
    Object.defineProperty(EntryHandlerKeywordAnnotation, "__esModule", { value: true });
    EntryHandlerKeywordAnnotation.EntryHandlerKeywordAnnotation = void 0;
    const EntryHandlerKeyword_1 = /* @__PURE__ */ requireEntryHandlerKeyword();
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    let EntryHandlerKeywordAnnotation$1 = class EntryHandlerKeywordAnnotation extends EntryHandlerKeyword_1.EntryHandlerKeyword {
      constructor() {
        super("@annotation");
      }
      async handle(parsingContext, util2, key, keys, value, depth) {
        if (typeof value === "string" || typeof value === "object" && value["@value"]) {
          parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Found illegal annotation value: ${JSON.stringify(value)}`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
        }
      }
    };
    EntryHandlerKeywordAnnotation.EntryHandlerKeywordAnnotation = EntryHandlerKeywordAnnotation$1;
    return EntryHandlerKeywordAnnotation;
  }
  var hasRequiredJsonLdParser;
  function requireJsonLdParser() {
    if (hasRequiredJsonLdParser) return JsonLdParser;
    hasRequiredJsonLdParser = 1;
    Object.defineProperty(JsonLdParser, "__esModule", { value: true });
    JsonLdParser.JsonLdParser = void 0;
    const Parser = requireJsonparse();
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const readable_stream_1 = requireBrowser();
    const EntryHandlerArrayValue_1 = /* @__PURE__ */ requireEntryHandlerArrayValue();
    const EntryHandlerContainer_1 = /* @__PURE__ */ requireEntryHandlerContainer();
    const EntryHandlerInvalidFallback_1 = /* @__PURE__ */ requireEntryHandlerInvalidFallback();
    const EntryHandlerPredicate_1 = /* @__PURE__ */ requireEntryHandlerPredicate();
    const EntryHandlerKeywordContext_1 = /* @__PURE__ */ requireEntryHandlerKeywordContext();
    const EntryHandlerKeywordGraph_1 = /* @__PURE__ */ requireEntryHandlerKeywordGraph();
    const EntryHandlerKeywordId_1 = /* @__PURE__ */ requireEntryHandlerKeywordId();
    const EntryHandlerKeywordIncluded_1 = /* @__PURE__ */ requireEntryHandlerKeywordIncluded();
    const EntryHandlerKeywordNest_1 = /* @__PURE__ */ requireEntryHandlerKeywordNest();
    const EntryHandlerKeywordType_1 = /* @__PURE__ */ requireEntryHandlerKeywordType();
    const EntryHandlerKeywordUnknownFallback_1 = /* @__PURE__ */ requireEntryHandlerKeywordUnknownFallback();
    const EntryHandlerKeywordValue_1 = /* @__PURE__ */ requireEntryHandlerKeywordValue();
    const ParsingContext_1 = /* @__PURE__ */ requireParsingContext();
    const Util_1 = /* @__PURE__ */ requireUtil$1();
    const http_link_header_1 = requireLink();
    const EntryHandlerKeywordAnnotation_1 = /* @__PURE__ */ requireEntryHandlerKeywordAnnotation();
    let JsonLdParser$1 = class JsonLdParser2 extends readable_stream_1.Transform {
      constructor(options) {
        super({ readableObjectMode: true });
        options = options || {};
        this.options = options;
        this.parsingContext = new ParsingContext_1.ParsingContext(Object.assign({ parser: this }, options));
        this.util = new Util_1.Util({ dataFactory: options.dataFactory, parsingContext: this.parsingContext });
        this.jsonParser = new Parser();
        this.contextJobs = [];
        this.typeJobs = [];
        this.contextAwaitingJobs = [];
        this.lastDepth = 0;
        this.lastKeys = [];
        this.lastOnValueJob = Promise.resolve();
        this.attachJsonParserListeners();
        this.on("end", () => {
          if (typeof this.jsonParser.mode !== "undefined") {
            this.emit("error", new Error("Unclosed document"));
          }
        });
      }
      /**
       * Construct a JsonLdParser from the given HTTP response.
       *
       * This will throw an error if no valid JSON response is received
       * (application/ld+json, application/json, or something+json).
       *
       * For raw JSON responses, exactly one link header pointing to a JSON-LD context is required.
       *
       * This method is not responsible for handling redirects.
       *
       * @param baseIRI The URI of the received response.
       * @param mediaType The received content type.
       * @param headers Optional HTTP headers.
       * @param options Optional parser options.
       */
      static fromHttpResponse(baseIRI, mediaType, headers, options) {
        let context;
        let wellKnownMediaTypes = ["application/activity+json"];
        if (options && options.wellKnownMediaTypes) {
          wellKnownMediaTypes = options.wellKnownMediaTypes;
        }
        if (mediaType !== "application/ld+json" && !wellKnownMediaTypes.includes(mediaType)) {
          if (mediaType !== "application/json" && !mediaType.endsWith("+json")) {
            throw new jsonld_context_parser_1.ErrorCoded(`Unsupported JSON-LD media type ${mediaType}`, jsonld_context_parser_1.ERROR_CODES.LOADING_DOCUMENT_FAILED);
          }
          if (headers && headers.has("Link")) {
            headers.forEach((value, key) => {
              if (key === "link") {
                const linkHeader = (0, http_link_header_1.parse)(value);
                for (const link2 of linkHeader.get("rel", "http://www.w3.org/ns/json-ld#context")) {
                  if (context) {
                    throw new jsonld_context_parser_1.ErrorCoded("Multiple JSON-LD context link headers were found on " + baseIRI, jsonld_context_parser_1.ERROR_CODES.MULTIPLE_CONTEXT_LINK_HEADERS);
                  }
                  context = link2.uri;
                }
              }
            });
          }
          if (!context && !(options === null || options === void 0 ? void 0 : options.ignoreMissingContextLinkHeader)) {
            throw new jsonld_context_parser_1.ErrorCoded(`Missing context link header for media type ${mediaType} on ${baseIRI}`, jsonld_context_parser_1.ERROR_CODES.LOADING_DOCUMENT_FAILED);
          }
        }
        let streamingProfile;
        if (headers && headers.has("Content-Type")) {
          const contentType = headers.get("Content-Type");
          const match = /; *profile=([^"]*)/.exec(contentType);
          if (match && match[1] === "http://www.w3.org/ns/json-ld#streaming") {
            streamingProfile = true;
          }
        }
        return new JsonLdParser2(Object.assign({
          baseIRI,
          context,
          streamingProfile
        }, options ? options : {}));
      }
      /**
       * Parses the given text stream into a quad stream.
       * @param {NodeJS.EventEmitter} stream A text stream.
       * @return {RDF.Stream} A quad stream.
       */
      import(stream2) {
        if ("pipe" in stream2) {
          stream2.on("error", (error) => parsed.emit("error", error));
          const parsed = stream2.pipe(new JsonLdParser2(this.options));
          return parsed;
        } else {
          const output = new readable_stream_1.PassThrough({ readableObjectMode: true });
          stream2.on("error", (error) => parsed.emit("error", error));
          stream2.on("data", (data) => output.push(data));
          stream2.on("end", () => output.push(null));
          const parsed = output.pipe(new JsonLdParser2(this.options));
          return parsed;
        }
      }
      _transform(chunk, encoding, callback) {
        this.jsonParser.write(chunk);
        this.lastOnValueJob.then(() => callback(), (error) => callback(error));
      }
      /**
       * Start a new job for parsing the given value.
       *
       * This will let the first valid {@link IEntryHandler} handle the entry.
       *
       * @param {any[]} keys The stack of keys.
       * @param value The value to parse.
       * @param {number} depth The depth to parse at.
       * @param {boolean} lastDepthCheck If the lastDepth check should be done for buffer draining.
       * @return {Promise<void>} A promise resolving when the job is done.
       */
      async newOnValueJob(keys, value, depth, lastDepthCheck) {
        let flushStacks = true;
        if (lastDepthCheck && depth < this.lastDepth) {
          const listPointer = this.parsingContext.listPointerStack[this.lastDepth];
          if (listPointer) {
            if (listPointer.value) {
              this.push(this.util.dataFactory.quad(listPointer.value, this.util.rdfRest, this.util.rdfNil, this.util.getDefaultGraph()));
            }
            listPointer.listId.listHead = true;
            this.parsingContext.idStack[listPointer.listRootDepth + 1] = [listPointer.listId];
            this.parsingContext.listPointerStack.splice(this.lastDepth, 1);
          }
          if (await EntryHandlerContainer_1.EntryHandlerContainer.isBufferableContainerHandler(this.parsingContext, this.lastKeys, this.lastDepth)) {
            this.parsingContext.pendingContainerFlushBuffers.push({ depth: this.lastDepth, keys: this.lastKeys.slice(0, this.lastKeys.length) });
            flushStacks = false;
          } else {
            await this.flushBuffer(this.lastDepth, this.lastKeys);
          }
        }
        const key = await this.util.unaliasKeyword(keys[depth], keys, depth);
        const parentKey = await this.util.unaliasKeywordParent(keys, depth);
        this.parsingContext.emittedStack[depth] = true;
        let handleKey = true;
        if (jsonld_context_parser_1.Util.isValidKeyword(key) && parentKey === "@reverse" && key !== "@context") {
          this.emit("error", new jsonld_context_parser_1.ErrorCoded(`Found the @id '${value}' inside an @reverse property`, jsonld_context_parser_1.ERROR_CODES.INVALID_REVERSE_PROPERTY_MAP));
        }
        let inProperty = false;
        if (this.parsingContext.validationStack.length > 1) {
          inProperty = this.parsingContext.validationStack[this.parsingContext.validationStack.length - 1].property;
        }
        for (let i = Math.max(1, this.parsingContext.validationStack.length - 1); i < keys.length - 1; i++) {
          const validationResult = this.parsingContext.validationStack[i] || (this.parsingContext.validationStack[i] = await this.validateKey(keys.slice(0, i + 1), i, inProperty));
          if (!validationResult.valid) {
            this.parsingContext.emittedStack[depth] = false;
            handleKey = false;
            break;
          } else if (!inProperty && validationResult.property) {
            inProperty = true;
          }
        }
        if (await this.util.isLiteral(keys, depth)) {
          handleKey = false;
        }
        if (handleKey) {
          for (const entryHandler of JsonLdParser2.ENTRY_HANDLERS) {
            const testResult = await entryHandler.test(this.parsingContext, this.util, key, keys, depth);
            if (testResult) {
              await entryHandler.handle(this.parsingContext, this.util, key, keys, value, depth, testResult);
              if (entryHandler.isStackProcessor()) {
                this.parsingContext.processingStack[depth] = true;
              }
              break;
            }
          }
        }
        if (depth === 0 && Array.isArray(value)) {
          await this.util.validateValueIndexes(value);
        }
        if (flushStacks && depth < this.lastDepth) {
          this.flushStacks(this.lastDepth);
        }
        this.lastDepth = depth;
        this.lastKeys = keys;
        this.parsingContext.unaliasedKeywordCacheStack.splice(depth - 1);
      }
      /**
       * Flush the processing stacks at the given depth.
       * @param {number} depth A depth.
       */
      flushStacks(depth) {
        this.parsingContext.processingStack.splice(depth, 1);
        this.parsingContext.processingType.splice(depth, 1);
        this.parsingContext.emittedStack.splice(depth, 1);
        this.parsingContext.idStack.splice(depth, 1);
        this.parsingContext.graphStack.splice(depth + 1, 1);
        this.parsingContext.graphContainerTermStack.splice(depth, 1);
        this.parsingContext.jsonLiteralStack.splice(depth, 1);
        this.parsingContext.validationStack.splice(depth - 1, 2);
        this.parsingContext.literalStack.splice(depth, this.parsingContext.literalStack.length - depth);
        this.parsingContext.annotationsBuffer.splice(depth, 1);
      }
      /**
       * Flush buffers for the given depth.
       *
       * This should be called after the last entry at a given depth was processed.
       *
       * @param {number} depth A depth.
       * @param {any[]} keys A stack of keys.
       * @return {Promise<void>} A promise resolving if flushing is done.
       */
      async flushBuffer(depth, keys) {
        let subjects = this.parsingContext.idStack[depth];
        const subjectsWasDefined = !!subjects;
        if (!subjectsWasDefined) {
          subjects = this.parsingContext.idStack[depth] = [this.util.dataFactory.blankNode()];
        }
        const valueBuffer = this.parsingContext.unidentifiedValuesBuffer[depth];
        if (valueBuffer) {
          for (const subject of subjects) {
            const depthOffsetGraph = await this.util.getDepthOffsetGraph(depth, keys);
            const graphs = this.parsingContext.graphStack[depth] || depthOffsetGraph >= 0 ? this.parsingContext.idStack[depth - depthOffsetGraph - 1] : [await this.util.getGraphContainerValue(keys, depth)];
            if (graphs) {
              for (const graph of graphs) {
                this.parsingContext.emittedStack[depth] = true;
                for (const bufferedValue of valueBuffer) {
                  this.util.emitQuadChecked(depth, subject, bufferedValue.predicate, bufferedValue.object, graph, bufferedValue.reverse, bufferedValue.isEmbedded);
                }
              }
            } else {
              const subGraphBuffer = this.parsingContext.getUnidentifiedGraphBufferSafe(depth - await this.util.getDepthOffsetGraph(depth, keys) - 1);
              for (const bufferedValue of valueBuffer) {
                if (bufferedValue.reverse) {
                  subGraphBuffer.push({
                    object: subject,
                    predicate: bufferedValue.predicate,
                    subject: bufferedValue.object,
                    isEmbedded: bufferedValue.isEmbedded
                  });
                } else {
                  subGraphBuffer.push({
                    object: bufferedValue.object,
                    predicate: bufferedValue.predicate,
                    subject,
                    isEmbedded: bufferedValue.isEmbedded
                  });
                }
              }
            }
          }
          this.parsingContext.unidentifiedValuesBuffer.splice(depth, 1);
          this.parsingContext.literalStack.splice(depth, 1);
          this.parsingContext.jsonLiteralStack.splice(depth, 1);
        }
        const graphBuffer = this.parsingContext.unidentifiedGraphsBuffer[depth];
        if (graphBuffer) {
          for (const subject of subjects) {
            const graph = depth === 1 && subject.termType === "BlankNode" && !this.parsingContext.topLevelProperties ? this.util.getDefaultGraph() : subject;
            this.parsingContext.emittedStack[depth] = true;
            for (const bufferedValue of graphBuffer) {
              this.parsingContext.emitQuad(depth, this.util.dataFactory.quad(bufferedValue.subject, bufferedValue.predicate, bufferedValue.object, graph));
            }
          }
          this.parsingContext.unidentifiedGraphsBuffer.splice(depth, 1);
        }
        const annotationsBuffer = this.parsingContext.annotationsBuffer[depth];
        if (annotationsBuffer) {
          if (annotationsBuffer.length > 0 && depth === 1) {
            this.parsingContext.emitError(new jsonld_context_parser_1.ErrorCoded(`Annotations can not be made on top-level nodes`, jsonld_context_parser_1.ERROR_CODES.INVALID_ANNOTATION));
          }
          const annotationsBufferParent = this.parsingContext.getAnnotationsBufferSafe(depth - 1);
          for (const annotation of annotationsBuffer) {
            annotationsBufferParent.push(annotation);
          }
          delete this.parsingContext.annotationsBuffer[depth];
        }
      }
      /**
       * Check if at least one {@link IEntryHandler} validates the entry to true.
       * @param {any[]} keys A stack of keys.
       * @param {number} depth A depth.
       * @param {boolean} inProperty If the current depth is part of a valid property node.
       * @return {Promise<{ valid: boolean, property: boolean }>} A promise resolving to true or false.
       */
      async validateKey(keys, depth, inProperty) {
        for (const entryHandler of JsonLdParser2.ENTRY_HANDLERS) {
          if (await entryHandler.validate(this.parsingContext, this.util, keys, depth, inProperty)) {
            return { valid: true, property: inProperty || entryHandler.isPropertyHandler() };
          }
        }
        return { valid: false, property: false };
      }
      /**
       * Attach all required listeners to the JSON parser.
       *
       * This should only be called once.
       */
      attachJsonParserListeners() {
        this.jsonParser.onValue = (value) => {
          const depth = this.jsonParser.stack.length;
          const keys = new Array(depth + 1).fill(0).map((v, i) => {
            return i === depth ? this.jsonParser.key : this.jsonParser.stack[i].key;
          });
          if (!this.isParsingContextInner(depth)) {
            const valueJobCb = () => this.newOnValueJob(keys, value, depth, true);
            if (!this.parsingContext.streamingProfile && !this.parsingContext.contextTree.getContext(keys.slice(0, -1))) {
              if (keys[depth] === "@context") {
                let jobs = this.contextJobs[depth];
                if (!jobs) {
                  jobs = this.contextJobs[depth] = [];
                }
                jobs.push(valueJobCb);
              } else {
                this.contextAwaitingJobs.push({ job: valueJobCb, keys, depth });
              }
            } else {
              this.lastOnValueJob = this.lastOnValueJob.then(valueJobCb);
            }
            if (!this.parsingContext.streamingProfile && depth === 0) {
              this.lastOnValueJob = this.lastOnValueJob.then(() => this.executeBufferedJobs());
            }
          }
        };
        this.jsonParser.onError = (error) => {
          this.emit("error", error);
        };
      }
      /**
       * Check if the parser is currently parsing an element that is part of an @context entry.
       * @param {number} depth A depth.
       * @return {boolean} A boolean.
       */
      isParsingContextInner(depth) {
        for (let i = depth; i > 0; i--) {
          if (this.jsonParser.stack[i - 1].key === "@context") {
            return true;
          }
        }
        return false;
      }
      /**
       * Execute all buffered jobs.
       * @return {Promise<void>} A promise resolving if all jobs are finished.
       */
      async executeBufferedJobs() {
        for (const jobs of this.contextJobs) {
          if (jobs) {
            for (const job of jobs) {
              await job();
            }
          }
        }
        this.parsingContext.unaliasedKeywordCacheStack.splice(0);
        const contextAwaitingJobs = [];
        for (const job of this.contextAwaitingJobs) {
          if (await this.util.unaliasKeyword(job.keys[job.depth], job.keys, job.depth, true) === "@type" || typeof job.keys[job.depth] === "number" && await this.util.unaliasKeyword(job.keys[job.depth - 1], job.keys, job.depth - 1, true) === "@type") {
            this.typeJobs.push({ job: job.job, keys: job.keys.slice(0, job.keys.length - 1) });
          } else {
            contextAwaitingJobs.push(job);
          }
        }
        for (const job of contextAwaitingJobs) {
          if (this.typeJobs.length > 0) {
            const applicableTypeJobs = [];
            const applicableTypeJobIds = [];
            for (let i = 0; i < this.typeJobs.length; i++) {
              const typeJob = this.typeJobs[i];
              if (Util_1.Util.isPrefixArray(typeJob.keys, job.keys)) {
                applicableTypeJobs.push(typeJob);
                applicableTypeJobIds.push(i);
              }
            }
            const sortedTypeJobs = applicableTypeJobs.sort((job1, job2) => job1.keys.length - job2.keys.length);
            for (const typeJob of sortedTypeJobs) {
              await typeJob.job();
            }
            const sortedApplicableTypeJobIds = applicableTypeJobIds.sort().reverse();
            for (const jobId of sortedApplicableTypeJobIds) {
              this.typeJobs.splice(jobId, 1);
            }
          }
          await job.job();
        }
      }
    };
    JsonLdParser.JsonLdParser = JsonLdParser$1;
    JsonLdParser$1.DEFAULT_PROCESSING_MODE = "1.1";
    JsonLdParser$1.ENTRY_HANDLERS = [
      new EntryHandlerArrayValue_1.EntryHandlerArrayValue(),
      new EntryHandlerKeywordContext_1.EntryHandlerKeywordContext(),
      new EntryHandlerKeywordId_1.EntryHandlerKeywordId(),
      new EntryHandlerKeywordIncluded_1.EntryHandlerKeywordIncluded(),
      new EntryHandlerKeywordGraph_1.EntryHandlerKeywordGraph(),
      new EntryHandlerKeywordNest_1.EntryHandlerKeywordNest(),
      new EntryHandlerKeywordType_1.EntryHandlerKeywordType(),
      new EntryHandlerKeywordValue_1.EntryHandlerKeywordValue(),
      new EntryHandlerKeywordAnnotation_1.EntryHandlerKeywordAnnotation(),
      new EntryHandlerContainer_1.EntryHandlerContainer(),
      new EntryHandlerKeywordUnknownFallback_1.EntryHandlerKeywordUnknownFallback(),
      new EntryHandlerPredicate_1.EntryHandlerPredicate(),
      new EntryHandlerInvalidFallback_1.EntryHandlerInvalidFallback()
    ];
    return JsonLdParser;
  }
  var hasRequiredJsonldStreamingParser;
  function requireJsonldStreamingParser() {
    if (hasRequiredJsonldStreamingParser) return jsonldStreamingParser;
    hasRequiredJsonldStreamingParser = 1;
    (function(exports$1) {
      var __createBinding = jsonldStreamingParser && jsonldStreamingParser.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = jsonldStreamingParser && jsonldStreamingParser.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(/* @__PURE__ */ requireJsonLdParser(), exports$1);
    })(jsonldStreamingParser);
    return jsonldStreamingParser;
  }
  var jsonldStreamingParserExports = /* @__PURE__ */ requireJsonldStreamingParser();
  class UniversalParser {
    /**
     * Parses RDF content in various formats and invokes the callback for each quad.
     * Use this in Workers to keep the UI thread responsive during large imports.
     * 
     * @param content - Raw string content to parse.
     * @param format - Format identifier.
     * @param onQuad - Callback invoked for every successfully parsed Quad.
     * @param options - Parser configuration (baseIRI, prefixes).
     * @returns List of named graphs discovered during the parsing process.
     */
    async parse(content, format, onQuad, options = {}) {
      if (!onQuad || typeof onQuad !== "function") {
        throw new Error('UniversalParser: "onQuad" callback is required and must be a function.');
      }
      const observedGraphs = /* @__PURE__ */ new Set();
      const wrapper = (quad2) => {
        if (quad2.graph && quad2.graph.value) {
          observedGraphs.add(quad2.graph.value);
        }
        onQuad(quad2);
      };
      if (format === "RDF/XML") {
        const cleaned = content.replace(/rdf:datatype=["']http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#langString["']/g, "");
        await this.parseStream(new rdfxmlStreamingParserExports.RdfXmlParser({ baseIRI: options.baseIRI }), cleaned, wrapper, options);
      } else if (format === "JSON-LD") {
        await this.parseStream(new jsonldStreamingParserExports.JsonLdParser({ baseIRI: options.baseIRI }), content, wrapper, options);
      } else {
        await this.parseWithN3(content, format, wrapper, options);
      }
      return { graphs: Array.from(observedGraphs) };
    }
    async parseWithN3(content, format, onQuad, options) {
      const parser = new N3Parser({ format, baseIRI: options.baseIRI, rdfStar: true });
      return new Promise((resolve, reject) => {
        parser.parse(content, (error, quad2, prefixes) => {
          if (error) reject(error);
          else if (quad2) onQuad(quad2);
          else {
            if (prefixes && options.onPrefix) {
              for (const [prefix, iri] of Object.entries(prefixes)) {
                const iriStr = typeof iri === "string" ? iri : iri.value;
                options.onPrefix(prefix, iriStr);
              }
            }
            resolve();
          }
        });
      });
    }
    async parseStream(parser, content, onQuad, options) {
      return new Promise((resolve, reject) => {
        parser.on("data", onQuad);
        parser.on("error", reject);
        parser.on("end", resolve);
        if (options.onPrefix) {
          parser.on("prefix", (prefix, iri) => options.onPrefix(prefix, typeof iri === "object" ? iri.value : iri));
        }
        parser.write(content);
        parser.end();
      });
    }
  }
  var jsonldStreamingSerializer = {};
  var JsonLdSerializer = {};
  var SeparatorType = {};
  var hasRequiredSeparatorType;
  function requireSeparatorType() {
    if (hasRequiredSeparatorType) return SeparatorType;
    hasRequiredSeparatorType = 1;
    Object.defineProperty(SeparatorType, "__esModule", { value: true });
    SeparatorType.SeparatorType = void 0;
    let SeparatorType$1 = class SeparatorType {
      constructor(label) {
        this.label = label;
      }
    };
    SeparatorType.SeparatorType = SeparatorType$1;
    SeparatorType$1.COMMA = new SeparatorType$1(",");
    SeparatorType$1.OBJECT_START = new SeparatorType$1("{");
    SeparatorType$1.OBJECT_END = new SeparatorType$1("}");
    SeparatorType$1.OBJECT_END_COMMA = new SeparatorType$1("},");
    SeparatorType$1.ARRAY_START = new SeparatorType$1("[");
    SeparatorType$1.ARRAY_END = new SeparatorType$1("]");
    SeparatorType$1.ARRAY_END_COMMA = new SeparatorType$1("],");
    SeparatorType$1.GRAPH_FIELD_NONCOMPACT = new SeparatorType$1('"@graph": [');
    SeparatorType$1.GRAPH_FIELD_COMPACT = new SeparatorType$1('"@graph":[');
    SeparatorType$1.CONTEXT_FIELD = new SeparatorType$1('"@context":');
    return SeparatorType;
  }
  var Util = {};
  var hasRequiredUtil;
  function requireUtil() {
    if (hasRequiredUtil) return Util;
    hasRequiredUtil = 1;
    Object.defineProperty(Util, "__esModule", { value: true });
    Util.Util = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    let Util$12 = class Util2 {
      /**
       * Convert an RDF term to a JSON value.
       * @param {Term} term An RDF term.
       * @param {JsonLdContextNormalized} context The context.
       * @param {ITermToValueOptions} options Conversion options.
       * @return {any} A JSON value.
       */
      static termToValue(term, context, options = {
        compactIds: false,
        useNativeTypes: false
      }) {
        switch (term.termType) {
          case "NamedNode":
            const compacted = context.compactIri(term.value, options.vocab);
            return options.compactIds ? compacted : { "@id": compacted };
          case "DefaultGraph":
            return options.compactIds ? term.value : { "@id": term.value };
          case "BlankNode":
            const id = `_:${term.value}`;
            return options.compactIds ? id : { "@id": id };
          case "Literal":
            if (term.datatype.value === Util2.RDF_JSON) {
              let parsedJson;
              try {
                parsedJson = JSON.parse(term.value);
              } catch (e) {
                throw new jsonld_context_parser_1.ErrorCoded("Invalid JSON literal: " + e.message, jsonld_context_parser_1.ERROR_CODES.INVALID_JSON_LITERAL);
              }
              return {
                "@value": parsedJson,
                "@type": "@json"
              };
            }
            if (options.rdfDirection === "i18n-datatype" && term.datatype.value.startsWith(Util2.I18N)) {
              const [language, direction] = term.datatype.value.substr(Util2.I18N.length, term.datatype.value.length).split("_");
              return Object.assign(Object.assign({ "@value": term.value }, language ? { "@language": language } : {}), direction ? { "@direction": direction } : {});
            }
            const stringType = term.datatype.value === Util2.XSD_STRING;
            const rawValue = {
              "@value": !stringType && options.useNativeTypes ? Util2.stringToNativeType(term.value, term.datatype.value) : term.value
            };
            if (term.language) {
              return Object.assign(Object.assign({}, rawValue), { "@language": term.language });
            } else if (!stringType && typeof rawValue["@value"] === "string") {
              return Object.assign(Object.assign({}, rawValue), { "@type": term.datatype.value });
            } else {
              return rawValue;
            }
        }
      }
      /**
       * Convert a string term to a native type.
       * If no conversion is possible, the original string will be returned.
       * @param {string} value An RDF term's string value.
       * @param {string} type
       * @return {any}
       */
      static stringToNativeType(value, type) {
        if (type.startsWith(Util2.XSD)) {
          const xsdType = type.substr(Util2.XSD.length);
          switch (xsdType) {
            case "boolean":
              if (value === "true") {
                return true;
              } else if (value === "false") {
                return false;
              }
              throw new Error(`Invalid xsd:boolean value '${value}'`);
            case "integer":
            case "number":
            case "int":
            case "byte":
            case "long":
              const parsedInt = parseInt(value, 10);
              if (isNaN(parsedInt)) {
                throw new Error(`Invalid xsd:integer value '${value}'`);
              }
              return parsedInt;
            case "float":
            case "double":
              const parsedFloat = parseFloat(value);
              if (isNaN(parsedFloat)) {
                throw new Error(`Invalid xsd:float value '${value}'`);
              }
              return parsedFloat;
          }
        }
        return value;
      }
    };
    Util.Util = Util$12;
    Util$12.XSD = "http://www.w3.org/2001/XMLSchema#";
    Util$12.XSD_STRING = Util$12.XSD + "string";
    Util$12.RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    Util$12.RDF_TYPE = Util$12.RDF + "type";
    Util$12.RDF_JSON = Util$12.RDF + "JSON";
    Util$12.I18N = "https://www.w3.org/ns/i18n#";
    return Util;
  }
  var hasRequiredJsonLdSerializer;
  function requireJsonLdSerializer() {
    if (hasRequiredJsonLdSerializer) return JsonLdSerializer;
    hasRequiredJsonLdSerializer = 1;
    Object.defineProperty(JsonLdSerializer, "__esModule", { value: true });
    JsonLdSerializer.JsonLdSerializer = void 0;
    const jsonld_context_parser_1 = /* @__PURE__ */ requireJsonldContextParser();
    const SeparatorType_1 = /* @__PURE__ */ requireSeparatorType();
    const Util_1 = /* @__PURE__ */ requireUtil();
    const readable_stream_1 = requireBrowser();
    let JsonLdSerializer$1 = class JsonLdSerializer2 extends readable_stream_1.Transform {
      constructor(options = {}) {
        super({ objectMode: true });
        this.indentation = 0;
        this.options = options;
        if (this.options.baseIRI && !this.options.context) {
          this.options.context = { "@base": this.options.baseIRI };
        }
        if (this.options.context) {
          this.originalContext = this.options.context;
          this.context = new jsonld_context_parser_1.ContextParser().parse(this.options.context, { baseIRI: this.options.baseIRI });
        } else {
          this.context = Promise.resolve(new jsonld_context_parser_1.JsonLdContextNormalized({}));
        }
      }
      /**
       * Parses the given text stream into a quad stream.
       * @param {NodeJS.EventEmitter} stream A text stream.
       * @return {NodeJS.EventEmitter} A quad stream.
       */
      import(stream2) {
        const output = new readable_stream_1.PassThrough({ objectMode: true });
        stream2.on("error", (error) => parsed.emit("error", error));
        stream2.on("data", (data) => output.push(data));
        stream2.on("end", () => output.push(null));
        const parsed = output.pipe(new JsonLdSerializer2(this.options));
        return parsed;
      }
      /**
       * Transforms a quad into the text stream.
       * @param {Quad} quad An RDF quad.
       * @param {string} encoding An (ignored) encoding.
       * @param {module:stream.internal.TransformCallback} callback Callback that is invoked when the transformation is done
       * @private
       */
      _transform(quad2, encoding, callback) {
        this.context.then((context) => {
          this.transformQuad(quad2, context);
          callback();
        }).catch(callback);
      }
      /**
       * Construct a list in an RDF.Term object that can be used
       * inside a quad's object to write into the serializer
       * as a list using the @list keyword.
       * @param {RDF.Quad_Object[]} values A list of values, can be empty.
       * @return {RDF.Quad_Object} A term that should be used in the object position of the quad that is written to the serializer.
       */
      async list(values) {
        const context = await this.context;
        return {
          "@list": values.map((value) => Util_1.Util.termToValue(value, context, this.options))
        };
      }
      /**
       * Called when the incoming stream is closed.
       * @param {module:stream.internal.TransformCallback} callback Callback that is invoked when the flushing is done.
       * @private
       */
      _flush(callback) {
        if (!this.opened) {
          this.pushDocumentStart();
        }
        if (this.lastPredicate) {
          this.endPredicate();
        }
        if (this.lastSubject) {
          this.endSubject();
        }
        if (this.lastGraph && this.lastGraph.termType !== "DefaultGraph") {
          this.endGraph();
        }
        this.endDocument();
        return callback(null, null);
      }
      /**
       * Transforms a quad into the text stream.
       * @param {Quad} quad An RDF quad.
       * @param {JsonLdContextNormalized} context A context for compacting.
       */
      transformQuad(quad2, context) {
        if (!this.opened) {
          this.pushDocumentStart();
        }
        const lastGraphMatchesSubject = this.lastGraph && this.lastGraph.termType !== "DefaultGraph" && this.lastGraph.equals(quad2.subject);
        if (!lastGraphMatchesSubject && (!this.lastGraph || !quad2.graph.equals(this.lastGraph))) {
          let lastSubjectMatchesGraph = quad2.graph.termType !== "DefaultGraph" && this.lastSubject && this.lastSubject.equals(quad2.graph);
          if (this.lastGraph) {
            if (this.lastGraph.termType !== "DefaultGraph") {
              this.endPredicate();
              this.endSubject();
              this.endGraph(true);
              lastSubjectMatchesGraph = false;
            } else {
              if (!lastSubjectMatchesGraph) {
                this.endPredicate();
                this.endSubject(true);
              } else {
                this.endPredicate(true);
                this.lastSubject = null;
              }
            }
          }
          if (quad2.graph.termType !== "DefaultGraph") {
            if (!lastSubjectMatchesGraph) {
              this.pushId(quad2.graph, true, context);
            }
            this.pushSeparator(this.options.space ? SeparatorType_1.SeparatorType.GRAPH_FIELD_NONCOMPACT : SeparatorType_1.SeparatorType.GRAPH_FIELD_COMPACT);
            this.indentation++;
          }
          this.lastGraph = quad2.graph;
        }
        if (!this.lastSubject || !quad2.subject.equals(this.lastSubject)) {
          if (lastGraphMatchesSubject) {
            this.endPredicate();
            this.endSubject();
            this.indentation--;
            this.pushSeparator(SeparatorType_1.SeparatorType.ARRAY_END_COMMA);
            this.lastGraph = quad2.graph;
          } else {
            if (this.lastSubject) {
              this.endPredicate();
              this.endSubject(true);
            }
            this.pushId(quad2.subject, true, context);
          }
          this.lastSubject = quad2.subject;
        }
        if (!this.lastPredicate || !quad2.predicate.equals(this.lastPredicate)) {
          if (this.lastPredicate) {
            this.endPredicate(true);
          }
          this.pushPredicate(quad2.predicate, context);
        }
        this.pushObject(quad2.object, context);
      }
      pushDocumentStart() {
        this.opened = true;
        if (this.originalContext && !this.options.excludeContext) {
          this.pushSeparator(SeparatorType_1.SeparatorType.OBJECT_START);
          this.indentation++;
          this.pushSeparator(SeparatorType_1.SeparatorType.CONTEXT_FIELD);
          this.pushIndented(JSON.stringify(this.originalContext, null, this.options.space) + ",");
          this.pushSeparator(this.options.space ? SeparatorType_1.SeparatorType.GRAPH_FIELD_NONCOMPACT : SeparatorType_1.SeparatorType.GRAPH_FIELD_COMPACT);
          this.indentation++;
        } else {
          this.pushSeparator(SeparatorType_1.SeparatorType.ARRAY_START);
          this.indentation++;
        }
      }
      /**
       * Push the given term as an @id field.
       * @param {Term} term An RDF term.
       * @param startOnNewLine If `{` should start on a new line
       * @param {JsonLdContextNormalized} context The context.
       */
      pushId(term, startOnNewLine, context) {
        if (term.termType === "Quad") {
          this.pushNestedQuad(term, true, context);
        } else {
          const subjectValue = term.termType === "BlankNode" ? "_:" + term.value : context.compactIri(term.value, false);
          if (startOnNewLine) {
            this.pushSeparator(SeparatorType_1.SeparatorType.OBJECT_START);
          } else {
            this.push(SeparatorType_1.SeparatorType.OBJECT_START.label);
            if (this.options.space) {
              this.push("\n");
            }
          }
          this.indentation++;
          this.pushIndented(this.options.space ? `"@id": "${subjectValue}",` : `"@id":"${subjectValue}",`);
        }
      }
      /**
       * Push the given predicate field.
       * @param {Term} predicate An RDF term.
       * @param {JsonLdContextNormalized} context The context.
       */
      pushPredicate(predicate, context) {
        let property = predicate.value;
        if (!this.options.useRdfType && property === Util_1.Util.RDF_TYPE) {
          property = "@type";
          this.objectOptions = Object.assign(Object.assign({}, this.options), { compactIds: true, vocab: true });
        }
        const compactedProperty = context.compactIri(property, true);
        this.pushIndented(this.options.space ? `"${compactedProperty}": [` : `"${compactedProperty}":[`);
        this.indentation++;
        this.lastPredicate = predicate;
      }
      /**
       * Push the given object value.
       * @param {Term} object An RDF term.
       * @param {JsonLdContextNormalized} context The context.
       */
      pushObject(object, context) {
        if (!this.hadObjectForPredicate) {
          this.hadObjectForPredicate = true;
        } else {
          this.pushSeparator(SeparatorType_1.SeparatorType.COMMA);
        }
        if (object.termType === "Quad") {
          const lastLastSubject = this.lastSubject;
          const lastLastPredicate = this.lastPredicate;
          this.hadObjectForPredicate = false;
          this.pushNestedQuad(object, false, context);
          this.endSubject(false);
          this.hadObjectForPredicate = true;
          this.lastPredicate = lastLastPredicate;
          this.lastSubject = lastLastSubject;
          return;
        }
        let value;
        try {
          if (object["@list"]) {
            value = object;
          } else {
            value = Util_1.Util.termToValue(object, context, this.objectOptions || this.options);
          }
        } catch (e) {
          return this.emit("error", e);
        }
        this.pushIndented(JSON.stringify(value, null, this.options.space));
      }
      pushNestedQuad(nestedQuad, commaAfterSubject, context) {
        this.pushSeparator(SeparatorType_1.SeparatorType.OBJECT_START);
        this.indentation++;
        this.pushIndented(this.options.space ? `"@id": ` : `"@id":`, false);
        if (nestedQuad.graph.termType !== "DefaultGraph") {
          this.emit("error", new Error(`Found a nested quad with the non-default graph: ${nestedQuad.graph.value}`));
        }
        this.pushId(nestedQuad.subject, false, context);
        this.pushPredicate(nestedQuad.predicate, context);
        this.pushObject(nestedQuad.object, context);
        this.endPredicate(false);
        this.endSubject(commaAfterSubject);
      }
      endDocument() {
        this.opened = false;
        if (this.originalContext && !this.options.excludeContext) {
          this.indentation--;
          this.pushSeparator(SeparatorType_1.SeparatorType.ARRAY_END);
          this.indentation--;
          this.pushSeparator(SeparatorType_1.SeparatorType.OBJECT_END);
        } else {
          this.indentation--;
          this.pushSeparator(SeparatorType_1.SeparatorType.ARRAY_END);
        }
      }
      /**
       * Push the end of a predicate and reset the buffers.
       * @param {boolean} comma If a comma should be appended.
       */
      endPredicate(comma) {
        this.indentation--;
        this.pushSeparator(comma ? SeparatorType_1.SeparatorType.ARRAY_END_COMMA : SeparatorType_1.SeparatorType.ARRAY_END);
        this.hadObjectForPredicate = false;
        this.objectOptions = null;
        this.lastPredicate = null;
      }
      /**
       * Push the end of a subject and reset the buffers.
       * @param {boolean} comma If a comma should be appended.
       */
      endSubject(comma) {
        this.indentation--;
        this.pushSeparator(comma ? SeparatorType_1.SeparatorType.OBJECT_END_COMMA : SeparatorType_1.SeparatorType.OBJECT_END);
        this.lastSubject = null;
      }
      /**
       * Push the end of a graph and reset the buffers.
       * @param {boolean} comma If a comma should be appended.
       */
      endGraph(comma) {
        this.indentation--;
        this.pushSeparator(SeparatorType_1.SeparatorType.ARRAY_END);
        this.indentation--;
        this.pushSeparator(comma ? SeparatorType_1.SeparatorType.OBJECT_END_COMMA : SeparatorType_1.SeparatorType.OBJECT_END);
        this.lastGraph = null;
      }
      /**
       * Puh the given separator.
       * @param {SeparatorType} type A type of separator.
       */
      pushSeparator(type) {
        this.pushIndented(type.label);
      }
      /**
       * An indentation-aware variant of {@link #push}.
       * All strings that are pushed here will be prefixed by {@link #indentation} amount of spaces.
       * @param {string} data A string.
       * @param pushNewLine If a newline should be pushed afterwards.
       */
      pushIndented(data, pushNewLine = true) {
        const prefix = this.getIndentPrefix();
        const lines = data.split("\n").map((line) => prefix + line).join("\n");
        this.push(lines);
        if (this.options.space && pushNewLine) {
          this.push("\n");
        }
      }
      /**
       * @return {string} Get the current indentation prefix based on {@link #indentation}.
       */
      getIndentPrefix() {
        return this.options.space ? this.options.space.repeat(this.indentation) : "";
      }
    };
    JsonLdSerializer.JsonLdSerializer = JsonLdSerializer$1;
    return JsonLdSerializer;
  }
  var hasRequiredJsonldStreamingSerializer;
  function requireJsonldStreamingSerializer() {
    if (hasRequiredJsonldStreamingSerializer) return jsonldStreamingSerializer;
    hasRequiredJsonldStreamingSerializer = 1;
    (function(exports$1) {
      var __createBinding = jsonldStreamingSerializer && jsonldStreamingSerializer.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __exportStar = jsonldStreamingSerializer && jsonldStreamingSerializer.__exportStar || function(m, exports$12) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
      };
      Object.defineProperty(exports$1, "__esModule", { value: true });
      __exportStar(/* @__PURE__ */ requireJsonLdSerializer(), exports$1);
      __exportStar(/* @__PURE__ */ requireUtil(), exports$1);
    })(jsonldStreamingSerializer);
    return jsonldStreamingSerializer;
  }
  var jsonldStreamingSerializerExports = /* @__PURE__ */ requireJsonldStreamingSerializer();
  class UniversalSerializer {
    /**
     * Serializes an array or iterator of Quads into a string.
     * The input quads must be standard RDF/JS objects (subject, predicate, object, graph).
     * 
     * @param quads - Iterable of RDF/JS Quads.
     * @param options - Serialization settings including format, baseIRI and prefixes.
     * @returns Promise resolving to the serialized string.
     */
    async serialize(quads, options = {}) {
      const format = options.format || "Turtle";
      if (format === "JSON-LD") {
        return this.serializeJsonLd(quads, options);
      }
      if (format === "RDF/XML") {
        return this.serializeRdfXml(quads, options);
      }
      const writerOptions = {
        format,
        prefixes: options.prefixes
      };
      if (options.baseIRI) {
        writerOptions.baseIRI = options.baseIRI;
      }
      const writer = new N3Writer(writerOptions);
      for (const quad2 of quads) {
        writer.addQuad(quad2);
      }
      return new Promise((resolve, reject) => {
        writer.end((error, result) => {
          if (error) {
            reject(error);
          } else {
            let finalOutput = result;
            if (options.baseIRI && (format === "Turtle" || format === "TriG")) {
              if (!finalOutput.trim().startsWith("@base")) {
                finalOutput = `@base <${options.baseIRI}> .
${finalOutput}`;
              }
            }
            resolve(finalOutput);
          }
        });
      });
    }
    serializeJsonLd(quads, _options) {
      return new Promise((resolve, reject) => {
        const serializer = new jsonldStreamingSerializerExports.JsonLdSerializer({ space: "  " });
        let output = "";
        serializer.on("data", (chunk) => output += chunk);
        serializer.on("error", (err) => reject(err));
        serializer.on("end", () => resolve(output));
        for (const quad2 of quads) {
          serializer.write(quad2);
        }
        serializer.end();
      });
    }
    serializeRdfXml(_quads, _options) {
      return Promise.reject(new Error("RDF/XML Serializer is not currently available in this build."));
    }
  }
  class QuadLoader {
    constructor(store, factory) {
      this.store = store;
      this.factory = factory;
      this.parser = new UniversalParser();
    }
    parser;
    /**
     * Loads RDF content into the store with advanced orchestration.
     */
    async load(content, options) {
      let tripleCount = 0;
      const format = options.format === "universal" ? this.detectFormat(options.filename) : options.format || "Turtle";
      const toInternal = (term) => {
        if (term.termType === "Triple") {
          const s = toInternal(term.subject);
          const p = toInternal(term.predicate);
          const o = toInternal(term.object);
          return this.factory.triple(s, p, o);
        }
        if (term.termType === "Literal") {
          return this.factory.literal(term.value, term.datatype?.value, term.language);
        }
        if (term.termType === "BlankNode") {
          return this.factory.blankNode(term.value);
        }
        return this.factory.namedNode(term.value);
      };
      const result = await this.parser.parse(content, format, (quad2) => {
        tripleCount++;
        const originalGraph = quad2.graph ? typeof quad2.graph === "string" ? quad2.graph : quad2.graph.value : null;
        const targetGraphURI = options.graphRewriter ? options.graphRewriter(originalGraph) : originalGraph;
        const s = toInternal(quad2.subject);
        const p = toInternal(quad2.predicate);
        const o = toInternal(quad2.object);
        const g = targetGraphURI ? this.factory.namedNode(targetGraphURI) : this.factory.defaultGraph?.() || 0n;
        this.store.add(s, p, o, g);
      }, {
        onPrefix: options.onPrefix,
        onBase: options.onBase
      });
      return {
        triples: tripleCount,
        graphs: result.graphs
      };
    }
    detectFormat(filename) {
      const ext = filename.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "ttl":
          return "Turtle";
        case "nt":
          return "N-Triples";
        case "nq":
          return "N-Quads";
        case "trig":
          return "TriG";
        case "rdf":
        case "owl":
        case "xml":
          return "RDF/XML";
        case "jsonld":
        case "json":
          return "JSON-LD";
        default:
          return "Turtle";
      }
    }
  }
  exports2.DataFactory = DataFactory$1;
  exports2.QuadLoader = QuadLoader;
  exports2.UniversalParser = UniversalParser;
  exports2.UniversalSerializer = UniversalSerializer;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
}));
