/**
 * On-device PDF engine. pdf-lib handles structure work; pdf.js renders
 * pages and extracts text. Nothing is uploaded — files stay in the browser.
 */

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

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

/** Validate a PDF upload and return its bytes. Throws user-facing messages. */
export async function loadPdfBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length > MAX_PDF_BYTES) {
    throw new Error(`PDF is too large (${formatBytes(bytes.length)}). Maximum is 50 MB.`);
  }
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("That file is not a valid PDF (missing %PDF header).");
  }
  return bytes;
}

export async function loadImageBytes(file: File): Promise<{ bytes: Uint8Array; mime: string }> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`Image is too large (${formatBytes(file.size)}). Maximum is 25 MB.`);
  const buf = await file.arrayBuffer();
  return { bytes: new Uint8Array(buf), mime: file.type };
}

export function downloadBytes(data: Uint8Array | Blob, filename: string, mime: string) {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: mime });
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
  const clean = name.split(/[\\/]/).pop() ?? name;
  const i = clean.lastIndexOf(".");
  return (i > 0 ? clean.slice(0, i) : clean).replace(/[^\w\-()[\] ]+/g, "").trim() || "document";
}

let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** Lazy pdf.js with same-origin worker (copied to public/ by postinstall). */
export function getPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((m) => {
      try {
        m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      } catch {
        /* ignore */
      }
      return m;
    });
  }
  return pdfJsPromise;
}

/**
 * Parse "1,3-5,8" (1-based) into zero-based page indices.
 * Throws a user-facing message on invalid input.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const out: number[] = [];
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one page or range, e.g. 1,3-5.");
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) throw new Error(`Invalid page selection: “${part}”. Use numbers like 1,3-5.`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (lo < 1 || hi > pageCount) throw new Error(`Pages must be between 1 and ${pageCount}.`);
    for (let p = lo; p <= hi; p += 1) {
      if (!out.includes(p - 1)) out.push(p - 1);
    }
  }
  return out.sort((x, y) => x - y);
}
