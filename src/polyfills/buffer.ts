import { Buffer } from 'buffer';

const globalWithBuffer = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
};

if (!globalWithBuffer.Buffer) {
  globalWithBuffer.Buffer = Buffer;
}

// Some packages refer to global.Buffer specifically.
const globalObject = global as typeof globalThis & {
  Buffer?: typeof Buffer;
};

if (!globalObject.Buffer) {
  globalObject.Buffer = Buffer;
}

// Anchor/web3 code can rely on Buffer.prototype.subarray in RN.
if (!Buffer.prototype.subarray) {
  Buffer.prototype.subarray = function (begin: number, end?: number) {
    const result = Uint8Array.prototype.slice.call(this, begin, end);
    Object.setPrototypeOf(result, Buffer.prototype);
    return result;
  };
}

export { Buffer };
