/* Minimal browser ZIP engine: create + extract archives with stored or
   deflated entries using CompressionStream/DecompressionStream. No uploads. */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
  size: number;
  compressedSize: number;
  method: "stored" | "deflated";
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ (data[i] as number)) & 0xff] as number ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function streamPipe(
  data: Uint8Array,
  fmt: "gzip" | "deflate-raw",
  mode: "compress" | "decompress",
): Promise<Uint8Array> {
  const cs = mode === "compress" ? new CompressionStream(fmt) : new DecompressionStream(fmt);
  const src = new Blob([data as BlobPart]).stream().pipeThrough(cs);
  const ab = await new Response(src).arrayBuffer();
  return new Uint8Array(ab);
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function view(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

/** Create a .zip from files. Uses deflate; falls back to stored on failure. */
export async function zipCreate(files: { name: string; data: Uint8Array }[]): Promise<Uint8Array> {
  if (files.length === 0) throw new Error("Add at least one file.");
  if (files.length > 500) throw new Error("Too many files (max 500).");
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const clean = f.name.replace(/^\/+/, "").slice(0, 255) || "file";
    if (clean.endsWith("/")) throw new Error(`Invalid file name: ${clean}`);
    const nameBytes = enc(clean);
    let method = 8;
    let comp = await streamPipe(f.data, "deflate-raw", "compress");
    if (comp.byteLength >= f.data.length) {
      method = 0;
      comp = f.data;
    }
    const crc = crc32(f.data);
    const lh = new Uint8Array(30);
    const lv = view(lh);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, method, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, comp.byteLength, true);
    lv.setUint32(22, f.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    chunks.push(lh, nameBytes, comp);

    const ch = new Uint8Array(46);
    const cv = view(ch);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, comp.byteLength, true);
    cv.setUint32(24, f.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    for (let i = 30; i < 46; i++) cv.setUint8(i, 0);
    cv.setUint32(42, offset, true);
    central.push(ch, nameBytes);
    offset += 30 + nameBytes.length + comp.byteLength;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = view(end);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of [...chunks, ...central, end]) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

/** Extract readable entries from a .zip (stored + deflated). */
export async function zipExtract(data: Uint8Array): Promise<ZipEntry[]> {
  const dv = view(data);
  // Find end-of-central-directory.
  let eocd = -1;
  for (let i = data.length - 22; i >= 0 && i >= data.length - 22 - 65558; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a readable .zip archive (end record missing).");
  const count = dv.getUint16(eocd + 10, true);
  let centralOff = dv.getUint32(eocd + 16, true);
  if (count <= 0 || count > 2000) throw new Error("Archive entry count looks invalid.");
  const entries: ZipEntry[] = [];
  let p = centralOff;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Archive central directory is corrupt.");
    const method = dv.getUint16(p + 10, true);
    const crc = dv.getUint32(p + 16, true);
    const compSize = dv.getUint32(p + 20, true);
    const size = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const rawName = data.subarray(p + 46, p + 46 + nameLen);
    const name = new TextDecoder().decode(rawName);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue; // directory
    if (size > 200 * 1024 * 1024) throw new Error(`Entry too large: ${name}`);
    if (dv.getUint32(localOff, true) !== 0x04034b50) throw new Error("Archive local header is corrupt.");
    const ln = dv.getUint16(localOff + 26, true);
    const le = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + ln + le;
    const comp = data.subarray(dataStart, dataStart + compSize);
    let raw: Uint8Array;
    if (method === 0) raw = comp.slice();
    else if (method === 8) raw = await streamPipe(comp, "deflate-raw", "decompress");
    else throw new Error(`Unsupported compression method (${method}) in ${name}.`);
    if (crc32(raw) !== crc) throw new Error(`Checksum mismatch in ${name} — archive may be corrupt.`);
    entries.push({ name, data: raw, size, compressedSize: compSize, method: method === 0 ? "stored" : "deflated" });
    if (entries.length > 1000) throw new Error("Too many entries to list safely.");
  }
  return entries;
}

/** GZIP a UTF-8 string; returns bytes + base64. */
export async function gzipText(text: string): Promise<{ bytes: Uint8Array; base64: string }> {
  const bytes = await streamPipe(enc(text), "gzip", "compress");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return { bytes, base64: btoa(bin) };
}

/** Decompress gzip/deflate bytes or base64 back to text. */
export async function gunzipText(input: Uint8Array | string): Promise<string> {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    const bin = atob(input.trim());
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else bytes = input;
  for (const fmt of ["gzip", "deflate-raw"] as const) {
    try {
      const out = await streamPipe(bytes, fmt, "decompress");
      return new TextDecoder().decode(out);
    } catch {
      /* try next format */
    }
  }
  throw new Error("Could not decompress: not gzip/deflate data or base64 of it.");
}
