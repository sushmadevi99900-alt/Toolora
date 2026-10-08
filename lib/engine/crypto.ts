/**
 * Crypto-grade randomness for generator tools.
 * Uses Web Crypto when available, Math.random fallback otherwise
 * (flagged via `secure: false` so UIs can say so honestly).
 */

export function randomInt(min: number, max: number): { value: number; secure: boolean } {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  const span = hi - lo + 1;
  if (span <= 0) return { value: lo, secure: false };
  try {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
      const range = 0xffffffff;
      const limit = range - (range % span);
      const buf = new Uint32Array(1);
      let x = 0;
      do {
        cryptoObj.getRandomValues(buf);
        x = buf[0];
      } while (x >= limit);
      return { value: lo + (x % span), secure: true };
    }
  } catch {
    /* fall through */
  }
  return { value: lo + Math.floor(Math.random() * span), secure: false };
}

export function randomBytes(length: number): { bytes: Uint8Array; secure: boolean } {
  const bytes = new Uint8Array(length);
  try {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(bytes);
      return { bytes, secure: true };
    }
  } catch {
    /* fall through */
  }
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return { bytes, secure: false };
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC-4122 v4 UUID using crypto randomness. */
export function generateUuid(): string {
  const { bytes } = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function randomToken(byteLength: number, format: "hex" | "base64" | "base64url" = "hex"): string {
  const { bytes } = randomBytes(byteLength);
  if (format === "hex") return bytesToHex(bytes);
  if (format === "base64") return bytesToBase64(bytes);
  return bytesToBase64Url(bytes);
}

export function pickChars(pool: string, length: number): string {
  if (!pool || length <= 0) return "";
  let out = "";
  for (let i = 0; i < length; i++) out += pool[randomInt(0, pool.length - 1).value];
  return out;
}

/**
 * MD5 hex digest (pure JS, UTF-8 input). Offered for legacy checksum
 * compatibility only — never for passwords or security decisions.
 */
export function md5Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const origLen = bytes.length;
  const withOne = origLen + 1;
  const padLen = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + padLen + 8;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[origLen] = 0x80;
  const bitLen = origLen * 8;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, bitLen >>> 0, true);
  dv.setUint32(total - 4, Math.floor(bitLen / 0x100000000), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
  const add = (...ns: number[]) => ns.reduce((x, y) => (x + y) >>> 0, 0);

  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ];

  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) M[i] = dv.getUint32(off + i * 4, true);
    let A = a;
    let B = b;
    let C = c;
    let D = d;
    for (let i = 0; i < 64; i += 1) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = add(F, A, K[i]!, M[g]!);
      A = D;
      D = C;
      C = B;
      B = add(B, rotl(F, S[i]!));
    }
    a = add(a, A);
    b = add(b, B);
    c = add(c, C);
    d = add(d, D);
  }

  const word = (x: number) =>
    [x & 0xff, (x >>> 8) & 0xff, (x >>> 16) & 0xff, (x >>> 24) & 0xff]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  return word(a) + word(b) + word(c) + word(d);
}

export { B64URL };
