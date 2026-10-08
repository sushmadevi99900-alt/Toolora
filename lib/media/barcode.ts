/* Dependency-free 1D barcode engine: Code39, Code128-B, EAN-13/UPC-A/ISBN.
   Patterns below are the published symbology tables. Renders to canvas. */

const C39: Record<string, string> = {
  "0": "101001101101", "1": "110100001011", "2": "101100001011", "3": "110110000101",
  "4": "101001101011", "5": "110100110101", "6": "101100110101", "7": "101001001011",
  "8": "110100100101", "9": "101100100101", A: "110101001011", B: "101101001011",
  C: "110110100101", D: "101011001011", E: "110101100101", F: "101101100101",
  G: "101010011011", H: "110101001101", I: "101101001101", J: "101011001101",
  K: "110101010011", L: "101101010011", M: "110110101001", N: "101011010011",
  O: "110101101001", P: "101101101001", Q: "101010110011", R: "110101011001",
  S: "101101011001", T: "101011011001", U: "110010101011", V: "100110101011",
  W: "110011010101", X: "100101101011", Y: "110010110101", Z: "100110110101",
  "-": "100101011011", ".": "110010101101", " ": "100110101101", "*": "100101101101",
  $: "100100100101", "/": "100100101001", "+": "100101001001", "%": "101001001001",
};

// Code128 patterns for values 0..102 + start A/B/C + stop (each 6 elements of widths).
const C128: string[] = (
  "212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212," +
  "112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131," +
  "311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321," +
  "112313,132113,132311,211313,231113,231311,112133,112331,132131,113133,113331,133113," +
  "133311,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111," +
  "314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114," +
  "122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212," +
  "114241,412212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341," +
  "131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112"
).split(",");

const C128_START_B = 104;

function widthsToBits(widths: string, narrow: number): string {
  let bits = "";
  let black = true;
  for (const ch of widths) {
    const w = (parseInt(ch, 10) || 1) * narrow;
    bits += (black ? "1" : "0").repeat(w);
    black = !black;
  }
  return bits;
}

export function encodeCode39(text: string): { bits: string; label: string } {
  const clean = text.toUpperCase().trim();
  if (!clean) throw new Error("Enter text to encode.");
  if (clean.length > 40) throw new Error("Code39 is limited to 40 characters here.");
  for (const ch of clean) {
    if (!C39[ch]) throw new Error(`Code39 cannot encode “${ch}”. Use A–Z, 0–9 and - . space $ / + %.`);
  }
  const seq = `*${clean}*`;
  let bits = "";
  for (let i = 0; i < seq.length; i++) {
    bits += C39[seq[i] as string];
    if (i < seq.length - 1) bits += "0";
  }
  return { bits, label: clean };
}

export function encodeCode128(text: string): { bits: string; label: string } {
  if (!text) throw new Error("Enter text to encode.");
  if (text.length > 60) throw new Error("Code128 text is limited to 60 characters here.");
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error("Code128-B here supports printable ASCII (32–126) only.");
  }
  const codes = [C128_START_B];
  for (const ch of text) codes.push(ch.charCodeAt(0) - 32);
  let checksum = C128_START_B;
  for (let i = 1; i < codes.length; i++) checksum += (codes[i] as number) * i;
  codes.push(checksum % 103, 106);
  let bits = "";
  for (const c of codes) bits += widthsToBits(C128[c as number] as string, 1);
  bits += "11";
  return { bits, label: text };
}

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLL", "LGLGGL", "LGGLGL"];

export function ean13Checksum(d12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(d12[i] as string, 10);
    if (!Number.isInteger(d)) throw new Error("EAN-13 needs 12 digits.");
    sum += d * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

export function encodeEan13(digits: string, label?: string): { bits: string; label: string } {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 12 && d.length !== 13) throw new Error("Enter the first 12 digits (check digit is computed).");
  const d12 = d.slice(0, 12);
  const check = d.length === 13 ? parseInt(d[12] as string, 10) : ean13Checksum(d12);
  if (d.length === 13 && check !== ean13Checksum(d12)) throw new Error(`Check digit should be ${ean13Checksum(d12)}.`);
  const full = d12 + check;
  const parity = EAN_PARITY[parseInt(full[0] as string, 10)] as string;
  let bits = "101";
  for (let i = 1; i <= 6; i++) {
    const table = parity[i - 1] === "L" ? EAN_L : EAN_G;
    bits += table[parseInt(full[i] as string, 10)];
  }
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += EAN_R[parseInt(full[i] as string, 10)];
  bits += "101";
  return { bits, label: label ?? full };
}

export function isbn13Check(d12: string): number {
  return ean13Checksum(d12);
}

export function validateIsbn(input: string): { valid: boolean; kind: string; message: string } {
  const d = input.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (d.length === 13) {
    if (!/^97[89]/.test(d)) return { valid: false, kind: "ISBN-13", message: "ISBN-13 must start with 978 or 979." };
    const ok = ean13Checksum(d.slice(0, 12)) === parseInt(d[12] as string, 10);
    return { valid: ok, kind: "ISBN-13", message: ok ? `${d} is a valid ISBN-13.` : `${d} has an invalid check digit.` };
  }
  if (d.length === 10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const ch = d[i] as string;
      const v = ch === "X" ? 10 : parseInt(ch, 10);
      if (!Number.isInteger(v) || (ch === "X" && i !== 9)) return { valid: false, kind: "ISBN-10", message: "Invalid ISBN-10 characters." };
      sum += v * (10 - i);
    }
    const ok = sum % 11 === 0;
    return { valid: ok, kind: "ISBN-10", message: ok ? `${d} is a valid ISBN-10.` : `${d} has an invalid check digit.` };
  }
  return { valid: false, kind: "unknown", message: "Enter 10 or 13 digits." };
}

/** Draw 1-bit pattern to canvas with quiet zones + human-readable label. */
export function drawBarcode(
  canvas: HTMLCanvasElement,
  bits: string,
  label: string,
  unit = 2,
  height = 90,
): void {
  const quiet = 10 * unit;
  const w = bits.length * unit + quiet * 2;
  const h = height + 28;
  const ratio = Math.min(3, Math.max(1, Math.floor(1200 / w)));
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas is not available.");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#000000";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") g.fillRect((quiet + i * unit) * ratio, 0, unit * ratio, height * ratio);
  }
  g.fillStyle = "#000000";
  g.font = `${14 * ratio}px monospace`;
  g.textAlign = "center";
  g.fillText(label, canvas.width / 2, (height + 20) * ratio);
  canvas.style.width = "100%";
  canvas.style.height = "auto";
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render barcode image."))), "image/png");
  });
}
