"use client";

import { useRef, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Err, FilePick, Note, asTool } from "../kits/kits";
import { baseName, downloadBytes, formatBytes, getPdfJs, loadPdfBytes, parsePageRanges } from "@/lib/engine/pdf";

export const pdfplusRegistry: Record<string, React.ComponentType> = {
  "pdf-page-reorder": asTool(<PageReorderTool />),
  "pdf-page-deleter": asTool(<PageDeleterTool />),
  "pdf-metadata-editor": asTool(<MetadataEditorTool />),
  "pdf-page-numberer": asTool(<PageNumbererTool />),
  "pdf-watermark": asTool(<WatermarkTool />),
  "pdf-header-footer": asTool(<HeaderFooterTool />),
  "images-to-pdf": asTool(<ImagesToPdfPlusTool />),
  "pdf-form-filler": asTool(<FormFillerTool />),
  "pdf-signature-pad": asTool(<SignaturePadTool />),
  "pdf-bookmark-viewer": asTool(<BookmarkViewerTool />),
  "pdf-font-inspector": asTool(<FontInspectorTool />),
  "pdf-dimensions-checker": asTool(<DimensionsTool />),
  "pdf-version-checker": asTool(<VersionCheckerTool />),
  "pdfa-info-checker": asTool(<PdfaInfoTool />),
  "pdf-image-extractor": asTool(<ImageExtractorTool />),
  "pdf-blank-page-remover": asTool(<BlankPageTool />),
  "pdf-duplicate-detector": asTool(<DuplicateDetectorTool />),
  "pdf-size-checker": asTool(<SizeCheckerTool />),
};

/* ---------- shared ---------- */

function usePdfFile() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      const b = await loadPdfBytes(f);
      // Validate: must load as a PDF.
      await PDFDocument.load(b);
      setBytes(b);
      setFileName(f.name);
    } catch {
      setBytes(null);
      setError("That file could not be read as a PDF.");
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setBytes(null);
    setFileName("");
    setError("");
  };
  return { bytes, fileName, error, busy, pick, reset };
}

/** Save, re-load to prove validity, then download. Returns byte size. */
async function saveValid(doc: PDFDocument, name: string): Promise<number> {
  const data = await doc.save({ useObjectStreams: true });
  await PDFDocument.load(data); // throws if invalid
  downloadBytes(data, name, "application/pdf");
  return data.byteLength;
}

function PdfPick({ onPick, busy }: { onPick: (f: File[]) => void; busy: boolean }) {
  return <FilePick accept="application/pdf,.pdf" maxMB={50} onFiles={onPick} label={busy ? "Reading…" : "Choose PDF"} />;
}

/* ---------- 1. reorder ---------- */

function PageReorderTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [order, setOrder] = useState("");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [pages, setPages] = useState(0);

  const load = async (files: File[]) => {
    await pick(files);
    setMsg("");
  };

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const src = await PDFDocument.load(bytes);
      const n = src.getPageCount();
      setPages(n);
      const idx = parsePageRanges(order, n);
      if (idx.length === 0) throw new Error("Enter page numbers like “3,1,2” or ranges like “1-3”.");
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, idx);
      for (const p of copied) out.addPage(p);
      const size = await saveValid(out, `${baseName(fileName)}-reordered.pdf`);
      setMsg(`Saved ${idx.length} pages (${formatBytes(size)}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reorder failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void load(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <FieldLabel htmlFor="pp-order">New page order (1-based)</FieldLabel>
            <Input id="pp-order" value={order} placeholder="e.g. 3,1,2 or 2-4,1" onChange={(e) => setOrder(e.target.value)} />
            {pages > 0 && <p className="mt-1 text-xs text-(--muted)">This PDF has {pages} pages.</p>}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Reorder & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 2. deleter ---------- */

function PageDeleterTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [ranges, setRanges] = useState("");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const src = await PDFDocument.load(bytes);
      const n = src.getPageCount();
      const del = new Set(parsePageRanges(ranges, n));
      if (del.size === 0) throw new Error("Enter pages to delete, e.g. “2” or “4-6”.");
      if (del.size >= n) throw new Error("Deleting every page would leave an empty PDF.");
      const keep = Array.from({ length: n }, (_, i) => i).filter((i) => !del.has(i));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, keep);
      for (const p of copied) out.addPage(p);
      const size = await saveValid(out, `${baseName(fileName)}-trimmed.pdf`);
      setMsg(`Deleted ${del.size} page(s); kept ${keep.length} (${formatBytes(size)}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <FieldLabel htmlFor="pp-del">Pages to delete</FieldLabel>
            <Input id="pp-del" value={ranges} placeholder="e.g. 2 or 4-6,9" onChange={(e) => setRanges(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Delete & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 3. metadata editor ---------- */

function MetadataEditorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [current, setCurrent] = useState<{ title?: string; author?: string; subject?: string; keywords?: string } | null>(null);

  const load = async (files: File[]) => {
    await pick(files);
    setMsg("");
    setCurrent(null);
  };

  const read = async () => {
    if (!bytes) return;
    const doc = await PDFDocument.load(bytes);
    setCurrent({ title: doc.getTitle(), author: doc.getAuthor(), subject: doc.getSubject(), keywords: doc.getKeywords() });
    if (!title && doc.getTitle()) setTitle(doc.getTitle() ?? "");
    if (!author && doc.getAuthor()) setAuthor(doc.getAuthor() ?? "");
  };

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const doc = await PDFDocument.load(bytes);
      if (title.trim()) doc.setTitle(title.trim());
      if (author.trim()) doc.setAuthor(author.trim());
      if (subject.trim()) doc.setSubject(subject.trim());
      doc.setKeywords(keywords.split(",").map((k) => k.trim()).filter(Boolean));
      await saveValid(doc, `${baseName(fileName)}-meta.pdf`);
      setMsg("Metadata saved and downloaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void load(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => void read()}>Read current metadata</Button>
          </div>
          {current && (
            <dl className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-(--border) p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-(--muted)">Title</dt><dd className="font-semibold">{current.title || "—"}</dd></div>
              <div><dt className="text-(--muted)">Author</dt><dd className="font-semibold">{current.author || "—"}</dd></div>
              <div><dt className="text-(--muted)">Subject</dt><dd className="font-semibold">{current.subject || "—"}</dd></div>
              <div><dt className="text-(--muted)">Keywords</dt><dd className="font-semibold">{current.keywords || "—"}</dd></div>
            </dl>
          )}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><FieldLabel htmlFor="pm-t">Title</FieldLabel><Input id="pm-t" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><FieldLabel htmlFor="pm-a">Author</FieldLabel><Input id="pm-a" value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
            <div><FieldLabel htmlFor="pm-s">Subject</FieldLabel><Input id="pm-s" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><FieldLabel htmlFor="pm-k">Keywords (comma separated)</FieldLabel><Input id="pm-k" value={keywords} onChange={(e) => setKeywords(e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Saving…" : "Save & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- stamping helper ---------- */

async function stampAll(
  bytes: Uint8Array,
  fileName: string,
  suffix: string,
  draw: (page: { w: number; h: number }, drawText: (text: string, x: number, y: number, size: number, opacity: number) => void, pageNum: number, pageCount: number) => void,
): Promise<string> {
  const { StandardFonts } = await import("pdf-lib");
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, src.getPages().map((_, i) => i));
  const font = await out.embedFont(StandardFonts.Helvetica);
  copied.forEach((p, i) => {
    const { width: w, height: h } = p.getSize();
    draw({ w, h }, (text, x, y, size, opacity) => {
      p.drawText(text, { x, y, size, font, color: rgb(0.25, 0.25, 0.28), opacity });
    }, i + 1, copied.length);
    out.addPage(p);
  });
  const size = await saveValid(out, `${baseName(fileName)}-${suffix}.pdf`);
  return `Saved ${copied.length} pages (${formatBytes(size)}).`;
}

/* ---------- 4. page numberer ---------- */

function PageNumbererTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [format, setFormat] = useState("Page {n} of {m}");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const out = await stampAll(bytes, fileName, "numbered", ({ w }, drawText, n, m) => {
        const text = format.replace("{n}", String(n)).replace("{m}", String(m));
        drawText(text, w / 2 - text.length * 2.2, 24, 10, 0.9);
      });
      setMsg(out);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Numbering failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <FieldLabel htmlFor="pn-f">Footer format (use {"{n}"} and {"{m}"})</FieldLabel>
            <Input id="pn-f" value={format} onChange={(e) => setFormat(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Number & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 5. watermark ---------- */

function WatermarkTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [text, setText] = useState("DRAFT");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes || !text.trim()) {
      setMsg("Enter watermark text.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const out = await stampAll(bytes, fileName, "watermarked", ({ w, h }, drawText) => {
        drawText(text.trim().toUpperCase(), w / 2 - text.trim().length * 7, h / 2, 28, 0.18);
      });
      setMsg(out);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Watermark failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <FieldLabel htmlFor="wm-t">Watermark text</FieldLabel>
            <Input id="wm-t" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Watermark & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 6. header/footer ---------- */

function HeaderFooterTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [header, setHeader] = useState("");
  const [footer, setFooter] = useState("");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes || (!header.trim() && !footer.trim())) {
      setMsg("Enter a header, a footer, or both.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const out = await stampAll(bytes, fileName, "headed", ({ w, h }, drawText) => {
        if (header.trim()) drawText(header.trim(), 36, h - 30, 10, 0.9);
        if (footer.trim()) drawText(footer.trim(), 36, 24, 10, 0.9);
      });
      setMsg(out);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Stamping failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><FieldLabel htmlFor="hf-h">Header</FieldLabel><Input id="hf-h" value={header} onChange={(e) => setHeader(e.target.value)} /></div>
            <div><FieldLabel htmlFor="hf-f">Footer</FieldLabel><Input id="hf-f" value={footer} onChange={(e) => setFooter(e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Stamp & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 7. images to pdf ---------- */

function ImagesToPdfPlusTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (files.length === 0) {
      setMsg("Choose at least one image.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const { PDFDocument: Doc } = await import("pdf-lib");
      const out = await Doc.create();
      for (const f of files.slice(0, 100)) {
        if (!/^image\/(jpeg|png)$/.test(f.type)) throw new Error(`“${f.name}” is not a JPG or PNG.`);
        const buf = new Uint8Array(await f.arrayBuffer());
        const img = f.type === "image/png" ? await out.embedPng(buf) : await out.embedJpg(buf);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const size = await saveValid(out, "images.pdf");
      setMsg(`Combined ${Math.min(files.length, 100)} images (${formatBytes(size)}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FilePick accept="image/jpeg,image/png" multiple maxMB={50} onFiles={setFiles} label="Choose JPG/PNG images" />
      {files.length > 0 && <p role="status" className="mt-2 text-sm text-(--muted)">{files.length} image(s), one PDF page each.</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Combine & download"}</Button>
        <Button type="button" variant="ghost" onClick={() => { setFiles([]); setMsg(""); }}>Clear</Button>
      </div>
      {msg && <Note>{msg}</Note>}
    </div>
  );
}

/* ---------- 8. form filler ---------- */

function FormFillerTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [fields, setFields] = useState<string[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const load = async (files: File[]) => {
    await pick(files);
    setFields([]);
    setVals({});
    setMsg("");
  };

  const inspect = async () => {
    if (!bytes) return;
    try {
      const doc = await PDFDocument.load(bytes);
      const names = doc.getForm().getFields().filter((f) => f.constructor.name === "PDFTextField").map((f) => f.getName());
      if (names.length === 0) {
        setMsg("This PDF has no fillable text fields.");
        return;
      }
      setFields(names);
      setMsg(`Found ${names.length} text field(s).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Inspection failed.");
    }
  };

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      for (const n of fields) {
        try {
          form.getTextField(n).setText(vals[n] ?? "");
        } catch {
          /* field type changed — skip */
        }
      }
      form.flatten();
      await saveValid(doc, `${baseName(fileName)}-filled.pdf`);
      setMsg("Form filled, flattened and downloaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fill failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void load(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => void inspect()}>List text fields</Button>
          </div>
          {fields.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((n) => (
                <div key={n}>
                  <FieldLabel htmlFor={`ff-${n}`}>{n}</FieldLabel>
                  <Input id={`ff-${n}`} value={vals[n] ?? ""} onChange={(e) => setVals((p) => ({ ...p, [n]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working || fields.length === 0}>{working ? "Working…" : "Fill & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 9. signature pad ---------- */

function SignaturePadTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [page, setPage] = useState("1");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const load = async (files: File[]) => {
    await pick(files);
    setMsg("");
  };

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  const run = async () => {
    if (!bytes) return;
    const c = canvasRef.current;
    if (!c) return;
    const blank = document.createElement("canvas");
    blank.width = c.width;
    blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      setMsg("Draw your signature first.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const src = await PDFDocument.load(bytes);
      const n = src.getPageCount();
      setPageCount(n);
      const p = Math.min(n, Math.max(1, Number(page) || 1));
      const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
        c.toBlob((b) => {
          if (!b) reject(new Error("Could not read signature."));
          else b.arrayBuffer().then((a) => resolve(new Uint8Array(a))).catch(reject);
        }, "image/png");
      });
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, src.getPages().map((_, i) => i));
      const img = await out.embedPng(pngBytes);
      const target = copied[p - 1] as (typeof copied)[number];
      const { width: w } = target.getSize();
      const sw = Math.min(220, w - 72);
      const sh = (sw * img.height) / img.width;
      target.drawImage(img, { x: 36, y: 36, width: sw, height: sh });
      for (const pg of copied) out.addPage(pg);
      await saveValid(out, `${baseName(fileName)}-signed.pdf`);
      setMsg(`Signature stamped on page ${p}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Signing failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void load(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <FieldLabel htmlFor="sig-pad">Draw signature below</FieldLabel>
            <canvas
              id="sig-pad"
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none rounded-xl border border-(--border) bg-white"
              onPointerDown={(e) => {
                drawing.current = true;
                (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                const p = pos(e);
                const g = canvasRef.current?.getContext("2d");
                if (g && p) {
                  g.strokeStyle = "#0f172a";
                  g.lineWidth = 3;
                  g.lineCap = "round";
                  g.beginPath();
                  g.moveTo(p.x, p.y);
                }
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const p = pos(e);
                canvasRef.current?.getContext("2d")?.lineTo(p?.x ?? 0, p?.y ?? 0);
                canvasRef.current?.getContext("2d")?.stroke();
              }}
              onPointerUp={() => {
                drawing.current = false;
              }}
            />
          </div>
          <div className="mt-3 grid max-w-[220px] grid-cols-1 gap-4">
            <div>
              <FieldLabel htmlFor="sig-page">Page number{pageCount > 0 && ` (1–${pageCount})`}</FieldLabel>
              <Input id="sig-page" inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Working…" : "Stamp & download"}</Button>
            <Button type="button" variant="secondary" onClick={clear}>Clear pad</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- 10. bookmarks ---------- */

interface OutlineNode {
  title: string;
  depth: number;
}

function BookmarkViewerTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [items, setItems] = useState<OutlineNode[] | null>(null);
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    setItems(null);
    try {
      const pdfjs = await getPdfJs();
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const outline = (await doc.getOutline()) as { title: string; items: unknown[] }[] | null;
      if (!outline || outline.length === 0) {
        setMsg(`“${fileName}” has no bookmarks.`);
        return;
      }
      const flat: OutlineNode[] = [];
      const walk = (nodes: { title: string; items: unknown[] }[], depth: number) => {
        for (const n of nodes.slice(0, 500)) {
          flat.push({ title: String(n.title ?? "(untitled)").slice(0, 200), depth: Math.min(depth, 5) });
          if (Array.isArray(n.items) && n.items.length > 0) {
            walk(n.items as { title: string; items: unknown[] }[], depth + 1);
          }
        }
      };
      walk(outline, 0);
      setItems(flat);
      setMsg(`${flat.length} bookmark(s) found.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reading bookmarks failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Reading…" : "Show bookmarks"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {items && (
            <ul className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {items.map((it, i) => (
                <li key={i} className="px-4 py-2 text-sm text-(--foreground)" style={{ paddingLeft: `${1 + it.depth * 1.25}rem` }}>
                  {it.title}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- 11. font inspector ---------- */

function FontInspectorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    setRows(null);
    try {
      const pdfjs = await getPdfJs();
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const out: [string, string][] = [];
      const limit = Math.min(doc.numPages, 200);
      for (let p = 1; p <= limit; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const fonts = new Set<string>();
        for (const it of tc.items as { fontName?: string }[]) {
          if (it.fontName) fonts.add(it.fontName);
        }
        out.push([`Page ${p}`, fonts.size > 0 ? [...fonts].join(", ") : "no text fonts detected"]);
      }
      setRows(out);
      setMsg(`Checked ${out.length} page(s) of “${fileName}”.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Inspection failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Reading…" : "Inspect fonts"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {rows && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="text-right font-mono text-xs text-(--foreground)">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- 12-14. dimensions / version / pdfa ---------- */

function DimensionsTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");

  const run = async () => {
    if (!bytes) return;
    try {
      const doc = await PDFDocument.load(bytes);
      const out = doc.getPages().map((p, i) => {
        const { width, height } = p.getSize();
        return [`Page ${i + 1}`, `${Math.round(width)} × ${Math.round(height)} pt (${(width * 0.3528).toFixed(1)} × ${(height * 0.3528).toFixed(1)} mm)`] as [string, string];
      });
      setRows(out);
      setMsg(`${out.length} page(s) in “${fileName}”.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reading failed.");
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Show dimensions</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {rows && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="font-semibold tabular-nums text-(--foreground)">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function VersionCheckerTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [ver, setVer] = useState<string | null>(null);

  const run = async () => {
    if (!bytes) return;
    const head = new TextDecoder().decode(bytes.subarray(0, 8));
    const m = /^%PDF-(\d\.\d)/.exec(head);
    setVer(m ? m[1] as string : null);
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Read version</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {ver !== null && (
            <div aria-live="polite" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="PDF version" value={ver} />
                <Stat label="File size" value={formatBytes(bytes?.byteLength ?? 0)} />
              </div>
              <Note>Read from the file's %PDF header bytes — not guessed from the extension.</Note>
            </div>
          )}
          {ver === null && bytes && <Note>Could not find a %PDF version header — the file may be corrupt.</Note>}
        </>
      )}
    </div>
  );
}

function PdfaInfoTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [rows, setRows] = useState<[string, string][] | null>(null);

  const run = async () => {
    if (!bytes) return;
    try {
      const doc = await PDFDocument.load(bytes);
      const head = new TextDecoder().decode(bytes.subarray(0, 8));
      const vm = /^%PDF-(\d\.\d)/.exec(head);
      const raw = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 200000)));
      const hasXmp = /xmpmeta|dc:format="application\/pdf"|pdfaid:part/i.test(raw);
      const producers = doc.getProducer() || "—";
      setRows([
        ["PDF version", vm ? (vm[1] as string) : "unknown"],
        ["XMP metadata present", hasXmp ? "Yes" : "No"],
        ["Producer", producers],
        ["Page count", String(doc.getPageCount())],
        ["Encrypted", "No (loaded without password)"],
      ]);
    } catch {
      setRows([["Status", "Could not parse — file may be encrypted or corrupt."]]);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Check indicators</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {rows && (
            <>
              <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <dt className="text-(--muted)">{k}</dt>
                    <dd className="font-semibold text-(--foreground)">{v}</dd>
                  </div>
                ))}
              </dl>
              <Note>Indicators only — this is not a formal PDF/A compliance certification.</Note>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- 15. image extractor (page renders) ---------- */

function ImageExtractorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [imgs, setImgs] = useState<{ page: number; url: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    setImgs([]);
    try {
      const pdfjs = await getPdfJs();
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const out: { page: number; url: string }[] = [];
      const limit = Math.min(doc.numPages, 50);
      for (let p = 1; p <= limit; p++) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const url = canvas.toDataURL("image/png");
        out.push({ page: p, url });
      }
      setImgs(out);
      setMsg(`Rendered ${out.length} page(s) as PNG.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Rendering failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Rendering…" : "Export pages as PNG"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {imgs.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imgs.map((im) => (
                <li key={im.page} className="rounded-xl border border-(--border) p-2 text-center">
                  <img src={im.url} alt={`Page ${im.page}`} className="mx-auto max-h-40 rounded" />
                  <a href={im.url} download={`${baseName(fileName)}-p${im.page}.png`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                    Page {im.page} PNG
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- text-based tools ---------- */

async function pageTexts(bytes: Uint8Array, limit = 500): Promise<string[]> {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out: string[] = [];
  const n = Math.min(doc.numPages, limit);
  for (let p = 1; p <= n; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    out.push((tc.items as { str?: string }[]).map((it) => it.str ?? "").join(" "));
  }
  return out;
}

function BlankPageTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    try {
      const texts = await pageTexts(bytes);
      const keep = texts.map((t, i) => (t.replace(/\s/g, "").length > 0 ? i : -1)).filter((i) => i >= 0);
      if (keep.length === 0) throw new Error("Every page looks blank — nothing to keep.");
      if (keep.length === texts.length) {
        setMsg(`No blank pages found (checked ${texts.length}).`);
        return;
      }
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, keep);
      for (const p of copied) out.addPage(p);
      const size = await saveValid(out, `${baseName(fileName)}-noblanks.pdf`);
      setMsg(`Removed ${texts.length - keep.length} blank page(s); kept ${keep.length} (${formatBytes(size)}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Cleaning failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Scanning…" : "Remove blanks & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          <Note>“Blank” means no extractable text. Scanned-image pages count as non-blank only if they contain text.</Note>
        </>
      )}
    </div>
  );
}

function DuplicateDetectorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [msg, setMsg] = useState("");
  const [groups, setGroups] = useState<number[][] | null>(null);
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setMsg("");
    setGroups(null);
    try {
      const texts = await pageTexts(bytes);
      const seen = new Map<string, number[]>();
      texts.forEach((t, i) => {
        const key = t.replace(/\s+/g, " ").trim().slice(0, 4000);
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key)?.push(i + 1);
      });
      const dups = [...seen.values()].filter((g) => g.length > 1);
      setGroups(dups);
      setMsg(dups.length === 0 ? `No duplicates in ${texts.length} page(s).` : `Found ${dups.length} duplicate group(s).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Scanning…" : "Find duplicates"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {groups && groups.length > 0 && (
            <ul className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {groups.map((g, i) => (
                <li key={i} className="px-4 py-2 text-sm">Pages {g.join(", ")} look identical</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function SizeCheckerTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!bytes) return;
    setWorking(true);
    setRows(null);
    try {
      const doc = await PDFDocument.load(bytes);
      const texts = await pageTexts(bytes);
      const chars = texts.reduce((n, t) => n + t.length, 0);
      const n = doc.getPageCount();
      setRows([
        ["Pages", String(n)],
        ["File size", formatBytes(bytes.byteLength)],
        ["Per page (avg)", formatBytes(Math.round(bytes.byteLength / Math.max(1, n)))],
        ["Extractable text", `${chars.toLocaleString()} characters`],
      ]);
      setMsg(`Checked “${fileName}”.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Checking…" : "Check size"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {rows && (
            <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3">
              {rows.map(([k, v]) => (
                <Stat key={k} label={k} value={v} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
