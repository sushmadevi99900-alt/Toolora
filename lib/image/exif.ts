/* Minimal JPEG EXIF reader: extracts common tags locally. Returns [] when
   no EXIF segment exists. Never uploads anything. */

export interface ExifTag {
  tag: string;
  value: string;
}

const IFD0_NAMES: Record<number, string> = {
  0x010f: "Camera make",
  0x0110: "Camera model",
  0x0112: "Orientation",
  0x0131: "Software",
  0x0132: "Modified",
  0x013b: "Artist",
  0x8298: "Copyright",
  0x8769: "EXIF data offset",
  0x8825: "GPS data offset",
};

const EXIF_NAMES: Record<number, string> = {
  0x829a: "Exposure time",
  0x829d: "F-number",
  0x8822: "Exposure program",
  0x8827: "ISO speed",
  0x9000: "EXIF version",
  0x9003: "Taken (original)",
  0x9004: "Taken (digitized)",
  0x9201: "Shutter speed",
  0x9202: "Aperture",
  0x9204: "Exposure bias",
  0x9207: "Metering mode",
  0x9208: "Light source",
  0x9209: "Flash",
  0x920a: "Focal length",
  0xa002: "Pixel width",
  0xa003: "Pixel height",
};

const ORIENTATIONS: Record<number, string> = {
  1: "Normal",
  2: "Mirror horizontal",
  3: "Rotate 180°",
  4: "Mirror vertical",
  5: "Mirror horizontal + rotate 270°",
  6: "Rotate 90°",
  7: "Mirror horizontal + rotate 90°",
  8: "Rotate 270°",
};

function ascii(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length && bytes[i] !== 0; i++) s += String.fromCharCode(bytes[i] as number);
  return s.trim();
}

function rational(dv: DataView, off: number, le: boolean, signed: boolean): string {
  const n = signed ? dv.getInt32(off, le) : dv.getUint32(off, le);
  const d = signed ? dv.getInt32(off + 4, le) : dv.getUint32(off + 4, le);
  if (d === 0) return String(n);
  const v = n / d;
  return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function readExif(jpeg: Uint8Array): ExifTag[] {
  const tags: ExifTag[] = [];
  try {
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return [];
    let p = 2;
    while (p + 4 < jpeg.length) {
      if (jpeg[p] !== 0xff) break;
      const marker = jpeg[p + 1] as number;
      const len = (jpeg[p + 2] as number) * 256 + (jpeg[p + 3] as number);
      if (marker === 0xe1 && len > 14) {
        const head = ascii(jpeg.subarray(p + 4, p + 10));
        if (head === "Exif") {
          parseTiff(jpeg, p + 10, tags);
          break;
        }
      }
      if (marker === 0xda || marker === 0xd9) break; // start of scan
      p += 2 + len;
    }
  } catch {
    return tags;
  }
  return tags.slice(0, 60);
}

function parseTiff(jpeg: Uint8Array, base: number, tags: ExifTag[]) {
  const dv = new DataView(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength);
  const le = jpeg[base] === 0x49 && jpeg[base + 1] === 0x49;
  const be = jpeg[base] === 0x4d && jpeg[base + 1] === 0x4d;
  if (!le && !be) return;
  const get16 = (o: number) => (le ? dv.getUint16(o, true) : dv.getUint16(o, false));
  const get32 = (o: number) => (le ? dv.getUint32(o, true) : dv.getUint32(o, false));
  if (get16(base + 2) !== 42) return;

  const readValue = (type: number, count: number, valOff: number, tiffBase: number): string => {
    const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    const unit = sizes[type] ?? 1;
    const total = unit * count;
    const at = total <= 4 ? valOff : tiffBase + get32(valOff);
    if (type === 2) return ascii(jpeg.subarray(at, at + Math.min(count, 256)));
    if (type === 3 && count === 1) {
      const v = le ? dv.getUint16(at, true) : dv.getUint16(at, false);
      return String(v);
    }
    if ((type === 4 || type === 9) && count === 1) {
      return String(type === 4 ? get32(at) : dv.getInt32(at, le));
    }
    if ((type === 5 || type === 10) && count >= 1) {
      return rational(dv, at, le, type === 10);
    }
    if (type === 1 && count === 1) return String(jpeg[at]);
    return `${count} value${count === 1 ? "" : "s"}`;
  };

  const readIfd = (ifdOff: number, names: Record<number, string>, depth: number) => {
    if (depth > 2 || ifdOff <= 0) return;
    const abs = base + ifdOff;
    if (abs + 2 > jpeg.length) return;
    const count = get16(abs);
    if (count > 200) return;
    for (let i = 0; i < count; i++) {
      const e = abs + 2 + i * 12;
      if (e + 12 > jpeg.length) break;
      const tag = get16(e);
      const type = get16(e + 2);
      const num = get32(e + 4);
      const val = readValue(type, num, e + 8, base);
      if (tag === 0x8769 || tag === 0x8825) {
        readIfd(get32(e + 8) > 100000 ? 0 : (parseInt(val, 10) || 0), tag === 0x8769 ? EXIF_NAMES : {}, depth + 1);
        continue;
      }
      const label = names[tag];
      if (!label) continue;
      let display = val;
      if (tag === 0x0112) display = ORIENTATIONS[parseInt(val, 10)] ?? val;
      if (tag === 0x9209) display = val === "0" ? "No flash" : val === "1" ? "Flash fired" : `Flash (${val})`;
      tags.push({ tag: label, value: display });
    }
  };

  readIfd(get32(base + 4), IFD0_NAMES, 0);
}
