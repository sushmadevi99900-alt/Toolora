/**
 * On-device image engine. Everything runs locally on canvases —
 * no uploads, no servers. Used by all image workspaces.
 */

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface LoadedImage {
  img: HTMLImageElement;
  url: string;
  width: number;
  height: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

export function revokeImage(image: LoadedImage | null) {
  if (image) URL.revokeObjectURL(image.url);
}

/** Validate + decode an image file. Throws a user-facing message on failure. */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image. Choose a JPG, PNG or WebP file.");
  if (!ACCEPTED_IMAGE_MIMES.includes(file.type as (typeof ACCEPTED_IMAGE_MIMES)[number])) {
    throw new Error(`“${file.type || "unknown type"}” is not supported. Use JPG, PNG or WebP.`);
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`Image is too large (${formatBytes(file.size)}). Maximum is 25 MB.`);
  if (file.size === 0) throw new Error("That file appears to be empty.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode that image. It may be corrupt."));
      el.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("Could not decode that image. It may be corrupt.");
    return {
      img,
      url,
      width: img.naturalWidth,
      height: img.naturalHeight,
      fileName: file.name || "image",
      fileSize: file.size,
      mimeType: file.type,
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))),
      mime,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name || "image";
}

export function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "png";
}

/** Draw image covering the canvas (for crops). */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, scale: number, ox: number, oy: number) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const base = Math.max(cw / iw, ch / ih) * scale;
  const dw = iw * base;
  const dh = ih * base;
  const dx = (cw - dw) / 2 + ox * cw;
  const dy = (ch - dh) / 2 + oy * ch;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ---------------- EXIF / metadata ---------------- */

export interface ImageMeta {
  format: string;
  make?: string;
  model?: string;
  dateTime?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: string;
  hasGps: boolean;
  colorType?: string;
  bitDepth?: number;
}

function ascii(bytes: DataView, start: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i += 1) {
    const c = bytes.getUint8(start + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function parseExifSegment(view: DataView, segStart: number, segLen: number, meta: ImageMeta) {
  // segStart points at "Exif\0\0"
  const tiffStart = segStart + 6;
  const little = view.getUint16(tiffStart, false) === 0x4949;
  if (view.getUint16(tiffStart, false) !== 0x4949 && view.getUint16(tiffStart, false) !== 0x4d4d) return;
  const readU16 = (o: number) => view.getUint16(o, little);
  const readU32 = (o: number) => view.getUint32(o, little);
  if (readU16(tiffStart + 2) !== 42) return;
  const ifd0 = tiffStart + readU32(tiffStart + 4);
  const entries = readU16(ifd0);
  const valueOf = (entry: number): number | string | null => {
    const type = readU16(entry + 2);
    const count = readU32(entry + 4);
    const valOff = entry + 8;
    const dataOff = count * (type === 5 || type === 10 ? 8 : type === 3 || type === 8 ? 2 : type === 4 || type === 9 ? 4 : 1) > 4
      ? tiffStart + readU32(valOff)
      : valOff;
    if (type === 2) return ascii(view, dataOff, count); // ASCII
    if (type === 3 && count === 1) return view.getUint16(dataOff, little); // SHORT
    if (type === 4 && count === 1) return view.getUint32(dataOff, little); // LONG
    if (type === 5 && count === 1) {
      // RATIONAL
      const num = view.getUint32(dataOff, little);
      const den = view.getUint32(dataOff + 4, little) || 1;
      return num / den;
    }
    return null;
  };
  for (let i = 0; i < entries; i += 1) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > segStart + segLen) break;
    const tag = readU16(e);
    const v = valueOf(e);
    if (tag === 0x010f && typeof v === "string") meta.make = v.slice(0, 64);
    else if (tag === 0x0110 && typeof v === "string") meta.model = v.slice(0, 64);
    else if (tag === 0x0132 && typeof v === "string") meta.dateTime = v.slice(0, 32);
    else if (tag === 0x8825) meta.hasGps = true;
    else if (tag === 0x829a && typeof v === "number") meta.exposureTime = v >= 1 ? `${v}` : `1/${Math.round(1 / v)}`;
    else if (tag === 0x829d && typeof v === "number") meta.fNumber = `f/${v.toFixed(1)}`;
    else if (tag === 0x8827 && typeof v === "number") meta.iso = `${v}`;
  }
}

/** Read basic + EXIF metadata from raw bytes. Never throws. */
export function parseImageMeta(buf: ArrayBuffer, mime: string): ImageMeta {
  const meta: ImageMeta = { format: mime.replace("image/", "").toUpperCase(), hasGps: false };
  try {
    const view = new DataView(buf);
    if (mime === "image/jpeg") {
      if (view.getUint16(0, false) !== 0xffd8) return meta;
      let off = 2;
      while (off + 4 < view.byteLength) {
        if (view.getUint8(off) !== 0xff) break;
        const marker = view.getUint8(off + 1);
        const len = view.getUint16(off + 2, false);
        if (marker === 0xe1 && len > 8) {
          if (ascii(view, off + 4, 4) === "Exif") parseExifSegment(view, off + 4, len - 2, meta);
        }
        if (marker === 0xda || marker === 0xd9) break;
        off += 2 + len;
      }
    } else if (mime === "image/png") {
      if (view.byteLength > 33) {
        const ct = view.getUint8(25);
        meta.bitDepth = view.getUint8(24);
        meta.colorType = ["Grayscale", "", "Truecolor", "Indexed", "Grayscale+Alpha", "", "Truecolor+Alpha"][ct] ?? `type ${ct}`;
      }
    }
  } catch {
    /* best effort */
  }
  return meta;
}

/* ---------------- colour ---------------- */

export function rgbToHex(r: number, g: number, b: number): string {
  const hex = [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
