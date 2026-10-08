"use client";

/**
 * PDF tool workspaces. All processing runs on-device (pdf-lib + pdf.js);
 * files are never uploaded anywhere.
 */
import { useCallback, useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { copyText, downloadTextFile } from "@/lib/engine/formatters";
import { pickChars, randomInt } from "@/lib/engine/crypto";
import {
  baseName,
  downloadBytes,
  formatBytes,
  getPdfJs,
  loadImageBytes,
  loadPdfBytes,
  parsePageRanges,
} from "@/lib/engine/pdf";

/* ---------- shared ---------- */

function usePdfFile(onReplace?: (bytes: Uint8Array | null) => void) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useCallback(async (file: File | null) => {
    setError("");
    if (!file) return;
    onReplace?.(null);
    setBusy(true);
    try {
      const b = await loadPdfBytes(file);
      setBytes(b);
      setFileName(file.name || "document.pdf");
      onReplace?.(b);
    } catch (e) {
      setBytes(null);
      setFileName("");
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
    } finally {
      setBusy(false);
    }
  }, [onReplace]);
  const reset = useCallback(() => {
    setBytes(null);
    setFileName("");
    setError("");
    onReplace?.(null);
  }, [onReplace]);
  return { bytes, fileName, error, busy, pick, reset };
}

function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-danger-600/10 px-4 py-3 text-sm font-medium text-danger-600">
      {message}
    </p>
  );
}

function PdfBar({ onPick, busy, multiple }: { onPick: (f: File | null) => void; busy: boolean; multiple?: boolean }) {
  return (
    <div>
      <FieldLabel htmlFor="pdf-file">Choose a PDF file (max 50 MB)</FieldLabel>
      <Input
        id="pdf-file"
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        disabled={busy}
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

async function pageCountOf(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const n = doc.getPageCount();
  return n;
}

/* ---------- compressor ---------- */

export function PdfCompressorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [result, setResult] = useState<{ size: number; data: Uint8Array } | null>(null);
  const [working, setWorking] = useState(false);

  const compress = async () => {
    if (!bytes) return;
    setWorking(true);
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const data = await doc.save({ useObjectStreams: true });
      setResult({ size: data.byteLength, data });
    } catch {
      setResult(null);
    } finally {
      setWorking(false);
    }
  };

  const saved = bytes && result ? Math.max(0, Math.round((1 - result.size / bytes.byteLength) * 100)) : 0;

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat value={formatBytes(bytes.byteLength)} label="Original" />
            <Stat value={result ? formatBytes(result.size) : "—"} label="Compressed" />
            <Stat value={result ? `${saved}%` : "—"} label="Saved" />
          </div>
          <p className="mt-2 text-sm text-(--muted)">
            Lossless re-save: removes dead objects and optimises structure. Image-heavy PDFs may shrink only slightly —
            reported sizes are always real.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void compress()} disabled={working}>{working ? "Compressing…" : "Compress"}</Button>
            {result && (
              <Button type="button" variant="secondary" onClick={() => downloadBytes(result.data, `${baseName(fileName)}-compressed.pdf`, "application/pdf")}>
                Download ({formatBytes(result.size)})
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => { reset(); setResult(null); }}>New file</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- merge ---------- */

interface MergeItem {
  id: number;
  name: string;
  bytes: Uint8Array;
}

export function MergePdfTool() {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [pages, setPages] = useState<Record<number, number>>({});

  const add = async (files: FileList | null) => {
    setError("");
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const bytes = await loadPdfBytes(f);
        const id = Date.now() + Math.random();
        setItems((prev) => [...prev, { id, name: f.name, bytes }]);
        void pageCountOf(bytes).then((n) => setPages((p) => ({ ...p, [id]: n }))).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not read ${f.name}.`);
      }
    }
  };

  const move = (id: number, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const merge = async () => {
    if (items.length < 2) {
      setError("Add at least two PDFs to merge.");
      return;
    }
    setWorking(true);
    try {
      const out = await PDFDocument.create();
      for (const item of items) {
        const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const copied = await out.copyPages(doc, doc.getPageIndices());
        copied.forEach((p) => out.addPage(p));
      }
      const data = await out.save();
      downloadBytes(data, "merged.pdf", "application/pdf");
    } catch {
      setError("Merge failed. One of the files may be encrypted or corrupt.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="merge-files">Choose PDF files (max 50 MB each)</FieldLabel>
      <Input id="merge-files" type="file" accept="application/pdf,.pdf" multiple onChange={(e) => void add(e.target.files)} />
      <Err message={error} />
      {items.length > 0 && (
        <ol className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-2 rounded-xl border border-(--border) px-3 py-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-2) text-sm font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {it.name}
                {pages[it.id] != null && <span className="ml-2 text-(--muted)">({pages[it.id]} pages)</span>}
              </span>
              <Button type="button" variant="ghost" onClick={() => move(it.id, -1)} aria-label={`Move ${it.name} up`} disabled={i === 0}>↑</Button>
              <Button type="button" variant="ghost" onClick={() => move(it.id, 1)} aria-label={`Move ${it.name} down`} disabled={i === items.length - 1}>↓</Button>
              <Button type="button" variant="ghost" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label={`Remove ${it.name}`}>✕</Button>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void merge()} disabled={working || items.length < 2}>
          {working ? "Merging…" : `Merge ${items.length} file${items.length === 1 ? "" : "s"}`}
        </Button>
        {items.length > 0 && <Button type="button" variant="ghost" onClick={() => setItems([])}>Clear all</Button>}
      </div>
    </div>
  );
}

/* ---------- split + extractor ---------- */

function ExtractCore({ pro }: { pro?: boolean }) {
  const [count, setCount] = useState(0);
  const [ranges, setRanges] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const [working, setWorking] = useState(false);
  const [outputs, setOutputs] = useState<{ label: string; data: Uint8Array }[]>([]);
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile(() => {
    setCount(0);
    setOutputs([]);
    setPicked([]);
  });

  useEffect(() => {
    if (!bytes) return;
    let live = true;
    void pageCountOf(bytes).then((n) => {
      if (live) setCount(n);
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [bytes]);

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort((a, b) => a - b)));

  const extract = async (indices: number[], label: string) => {
    if (!bytes) return;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const copied = await out.copyPages(doc, indices);
    copied.forEach((p) => out.addPage(p));
    const data = await out.save();
    setOutputs((o) => [...o, { label, data }]);
  };

  const runRanges = async () => {
    setFormError("");
    if (!bytes) return;
    try {
      const indices = parsePageRanges(ranges, count);
      setWorking(true);
      await extract(indices, `pages-${ranges.replace(/[^0-9\-,]/g, "")}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Invalid selection.");
    } finally {
      setWorking(false);
    }
  };

  const runPicked = async () => {
    if (!bytes || picked.length === 0) {
      setFormError("Tick at least one page.");
      return;
    }
    setFormError("");
    setWorking(true);
    try {
      await extract(picked, `${picked.length}-pages`);
    } catch {
      setFormError("Extraction failed. The file may be encrypted.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <p className="mt-3 text-sm font-semibold" aria-live="polite">Document has {count} page{count === 1 ? "" : "s"}. Your original is never modified.</p>
          <div className="mt-3">
            <FieldLabel htmlFor="split-ranges">Page ranges (e.g. 1-3, 5)</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="split-ranges" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3, 5" className="font-mono" />
              <Button type="button" variant="secondary" onClick={() => void runRanges()} disabled={working}>
                {working ? "Working…" : pro ? "Extract range" : "Split range"}
              </Button>
            </div>
          </div>
          {count > 0 && count <= 200 && (
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">Or tick individual pages</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: count }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={picked.includes(i)}
                    className={`min-h-[44px] min-w-[44px] cursor-pointer rounded-lg border px-2 font-mono text-sm font-bold ${picked.includes(i) ? "border-brand-600 bg-brand-600 text-white" : "border-(--border) bg-(--surface)"}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button type="button" variant="secondary" onClick={() => void runPicked()} disabled={working || picked.length === 0} className="mt-2">
                {working ? "Working…" : `Extract ${picked.length} page${picked.length === 1 ? "" : "s"}`}
              </Button>
            </fieldset>
          )}
          <Err message={formError} />
          {outputs.length > 0 && (
            <ul className="mt-4 space-y-2" aria-live="polite">
              {outputs.map((o, i) => (
                <li key={`${o.label}-${i}`} className="flex items-center justify-between gap-2 rounded-xl border border-(--border) px-3 py-2">
                  <span className="text-sm font-medium">Extracted {o.label} ({formatBytes(o.data.byteLength)})</span>
                  <Button type="button" variant="secondary" onClick={() => downloadBytes(o.data, `${baseName(fileName)}-${o.label}.pdf`, "application/pdf")}>
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4"><Button type="button" variant="ghost" onClick={() => { reset(); setOutputs([]); setPicked([]); }}>New file</Button></div>
        </>
      )}
    </div>
  );
}

export function SplitPdfTool() { return <ExtractCore />; }
export function PdfPageExtractorTool() { return <ExtractCore pro />; }

/* ---------- images to pdf ---------- */

function ImagesToPdf({ accept }: { accept: string }) {
  const [items, setItems] = useState<{ id: number; name: string; bytes: Uint8Array; mime: string }[]>([]);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const add = async (files: FileList | null) => {
    setError("");
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const { bytes, mime } = await loadImageBytes(f);
        setItems((p) => [...p, { id: Date.now() + Math.random(), name: f.name, bytes, mime }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not read ${f.name}.`);
      }
    }
  };

  const move = (id: number, dir: -1 | 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const build = async () => {
    if (items.length === 0) {
      setError("Add at least one image.");
      return;
    }
    setWorking(true);
    try {
      const out = await PDFDocument.create();
      const sizes = { a4: [595.28, 841.89] as const, letter: [612, 792] as const };
      for (const item of items) {
        const embedded = item.mime === "image/png" ? await out.embedPng(item.bytes) : await out.embedJpg(item.bytes);
        const iw = embedded.width;
        const ih = embedded.height;
        let pw = iw;
        let ph = ih;
        if (pageSize !== "fit") {
          const [sw, sh] = sizes[pageSize];
          const s = Math.min((sw - 72) / iw, (sh - 72) / ih);
          pw = sw;
          ph = sh;
          const dw = iw * s;
          const dh = ih * s;
          const page = out.addPage([pw, ph]);
          page.drawImage(embedded, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
          continue;
        }
        const page = out.addPage([pw, ph]);
        page.drawImage(embedded, { x: 0, y: 0, width: pw, height: ph });
      }
      const data = await out.save();
      downloadBytes(data, "images.pdf", "application/pdf");
    } catch {
      setError("Conversion failed. One of the images may be corrupt.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="imgpdf-files">Choose images (JPG/PNG/WebP → embedded as JPEG/PNG)</FieldLabel>
      <Input id="imgpdf-files" type="file" accept={accept} multiple onChange={(e) => void add(e.target.files)} />
      <Err message={error} />
      {items.length > 0 && (
        <ol className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-2 rounded-xl border border-(--border) px-3 py-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-(--surface-2) text-sm font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.name}</span>
              <Button type="button" variant="ghost" onClick={() => move(it.id, -1)} aria-label="Move up" disabled={i === 0}>↑</Button>
              <Button type="button" variant="ghost" onClick={() => move(it.id, 1)} aria-label="Move down" disabled={i === items.length - 1}>↓</Button>
              <Button type="button" variant="ghost" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label={`Remove ${it.name}`}>✕</Button>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3">
        <FieldLabel htmlFor="imgpdf-size">Page size</FieldLabel>
        <select id="imgpdf-size" value={pageSize} onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
          className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px] sm:w-64">
          <option value="fit">Fit to image</option>
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void build()} disabled={working || items.length === 0}>
          {working ? "Building…" : `Create PDF (${items.length})`}
        </Button>
        {items.length > 0 && <Button type="button" variant="ghost" onClick={() => setItems([])}>Clear</Button>}
      </div>
    </div>
  );
}

export function JpgToPdfTool() { return <ImagesToPdf accept="image/jpeg" />; }
export function PngToPdfTool() { return <ImagesToPdf accept="image/png" />; }

/* ---------- pdf to images ---------- */

function PdfToImages({ format, quality }: { format: "image/jpeg" | "image/png"; quality: number }) {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const [pages, setPages] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  useEffect(() => () => {
    pages.forEach((u) => URL.revokeObjectURL(u));
  }, [pages]);

  const render = async () => {
    if (!bytes) return;
    setWorking(true);
    setPages([]);
    try {
      const pdfjs = await getPdfJs();
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      const urls: string[] = [];
      const maxPages = Math.min(doc.numPages, 50);
      for (let i = 1; i <= maxPages; i += 1) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, format, quality));
        if (blob) urls.push(URL.createObjectURL(blob));
        page.cleanup();
      }
      setPages(urls);
    } catch {
      setPages([]);
    } finally {
      setWorking(false);
    }
  };

  const downloadPage = async (url: string, i: number) => {
    const blob = await (await fetch(url)).blob();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName(fileName)}-page-${i + 1}.${format === "image/jpeg" ? "jpg" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    void blob;
  };

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && (
        <>
          <div className="mt-4">
            <Button type="button" onClick={() => void render()} disabled={working}>
              {working ? "Rendering…" : "Convert pages to images"}
            </Button>
          </div>
          {pages.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-live="polite">
              {pages.map((u, i) => (
                <li key={u} className="overflow-hidden rounded-xl border border-(--border)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full bg-white object-contain" />
                  <Button type="button" variant="secondary" onClick={() => void downloadPage(u, i)} className="m-2 w-[calc(100%-1rem)]">
                    Page {i + 1}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

export function PdfToJpgTool() { return <PdfToImages format="image/jpeg" quality={0.85} />; }
export function PdfToPngTool() { return <PdfToImages format="image/png" quality={1} />; }

/* ---------- rotator ---------- */

export function PdfPageRotatorTool() {
  const [count, setCount] = useState(0);
  const [rots, setRots] = useState<number[]>([]);
  const [working, setWorking] = useState(false);
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile(() => {
    setCount(0);
    setRots([]);
  });

  useEffect(() => {
    if (!bytes) return;
    let live = true;
    void pageCountOf(bytes).then((n) => {
      if (live) {
        setCount(n);
        setRots(Array(n).fill(0));
      }
    }).catch(() => {});
    return () => {
      live = false;
    };
  }, [bytes]);

  const setRot = (i: number, deg: number) => setRots((r) => r.map((v, j) => (j === i ? (v + deg + 360) % 360 : v)));
  const rotateAll = (deg: number) => setRots((r) => r.map((v) => (v + deg + 360) % 360));

  const apply = async () => {
    if (!bytes) return;
    setWorking(true);
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      doc.getPages().forEach((p, i) => {
        const cur = p.getRotation().angle;
        p.setRotation({ type: "degrees", angle: (cur + (rots[i] ?? 0)) % 360 } as never);
      });
      const data = await doc.save();
      downloadBytes(data, `${baseName(fileName)}-rotated.pdf`, "application/pdf");
    } catch {
      /* encrypted */
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && count > 0 && (
        <>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => rotateAll(90)}>All +90°</Button>
            <Button type="button" variant="secondary" onClick={() => rotateAll(-90)}>All −90°</Button>
            <Button type="button" variant="ghost" onClick={() => setRots(Array(count).fill(0))}>Reset</Button>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-live="polite">
            {rots.map((r, i) => (
              <li key={i} className="rounded-xl border border-(--border) p-2 text-center">
                <p className="text-sm font-bold">Page {i + 1}</p>
                <p className="font-mono text-xs text-(--muted)" aria-live="polite">{r}°</p>
                <div className="mt-1 flex justify-center gap-1">
                  <Button type="button" variant="ghost" onClick={() => setRot(i, -90)} aria-label={`Rotate page ${i + 1} left`}>⟲</Button>
                  <Button type="button" variant="ghost" onClick={() => setRot(i, 90)} aria-label={`Rotate page ${i + 1} right`}>⟳</Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void apply()} disabled={working}>{working ? "Applying…" : "Apply & download"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- metadata + counter ---------- */

export function PdfMetadataViewerTool() {
  const [info, setInfo] = useState<[string, string][] | null>(null);
  const { bytes, error, busy, pick, reset } = usePdfFile(() => setInfo(null));

  useEffect(() => {
    if (!bytes) return;
    let live = true;
    void (async () => {
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const rows: [string, string][] = [
          ["Pages", String(doc.getPageCount())],
          ["Title", doc.getTitle() || "—"],
          ["Author", doc.getAuthor() || "—"],
          ["Subject", doc.getSubject() || "—"],
          ["Keywords", (doc.getKeywords() || "").split(" ").filter(Boolean).join(", ") || "—"],
          ["Creator", doc.getCreator() || "—"],
          ["Producer", doc.getProducer() || "—"],
          ["Created", doc.getCreationDate()?.toLocaleString() || "—"],
          ["Modified", doc.getModificationDate()?.toLocaleString() || "—"],
          ["File size", formatBytes(bytes.byteLength)],
        ];
        const p0 = doc.getPage(0)?.getSize();
        if (p0) rows.push(["First page size", `${Math.round(p0.width)} × ${Math.round(p0.height)} pt`]);
        if (live) setInfo(rows);
      } catch {
        if (live) setInfo([["Error", "Could not read metadata. The file may be encrypted."]]);
      }
    })();
    return () => {
      live = false;
    };
  }, [bytes]);

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {info && (
        <dl className="mt-4 overflow-hidden rounded-xl border border-(--border)" aria-live="polite">
          {info.map(([k, v], i) => (
            <div key={k} className={`grid grid-cols-[140px_1fr] gap-2 px-4 py-2.5 text-sm ${i % 2 ? "bg-(--surface-2)/60" : ""}`}>
              <dt className="font-semibold text-(--muted)">{k}</dt>
              <dd className="font-medium break-all">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {bytes && <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}

export function PdfPageCounterTool() {
  const [rows, setRows] = useState<{ pages: number; sizes: string } | null>(null);
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile(() => setRows(null));

  useEffect(() => {
    if (!bytes) return;
    let live = true;
    void (async () => {
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const n = doc.getPageCount();
        const uniq = new Map<string, number>();
        doc.getPages().forEach((p) => {
          const s = p.getSize();
          const key = `${Math.round(s.width)}×${Math.round(s.height)}`;
          uniq.set(key, (uniq.get(key) ?? 0) + 1);
        });
        if (live) {
          setRows({
            pages: n,
            sizes: [...uniq.entries()].map(([k, v]) => `${k} pt (${v})`).join(", "),
          });
        }
      } catch {
        if (live) setRows(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [bytes]);

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && rows && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat value={String(rows.pages)} label={`Pages in ${fileName || "PDF"}`} />
          <Stat value={rows.sizes || "—"} label="Page sizes (pt)" />
        </div>
      )}
      {bytes && <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}

/* ---------- password generator (for PDFs) ---------- */

const MEMORABLE_WORDS = ["river", "mango", "candle", "tiger", "cloud", "pepper", "harbor", "meadow", "comet", "ivory", "saffron", "cobalt", "willow", "ember", "falcon", "quartz"];

export function PdfPasswordGeneratorTool() {
  const [style, setStyle] = useState<"random" | "memorable">("random");
  const [length, setLength] = useState("16");
  const [pw, setPw] = useState(() => pickChars("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*", 16));
  const [copied, setCopied] = useState(false);

  const regen = () => {
    if (style === "memorable") {
      const words = Array.from({ length: 4 }, () => MEMORABLE_WORDS[randomInt(0, MEMORABLE_WORDS.length - 1).value]);
      const num = randomInt(10, 99).value;
      setPw(`${words.join("-")}-${num}`);
    } else {
      setPw(pickChars("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*", Math.max(8, Math.min(64, Number(length) || 16))));
    }
  };

  const copy = async () => {
    if (pw && (await copyText(pw))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Password style">
        <Button type="button" variant={style === "random" ? "primary" : "secondary"} onClick={() => setStyle("random")}>Random</Button>
        <Button type="button" variant={style === "memorable" ? "primary" : "secondary"} onClick={() => setStyle("memorable")}>Memorable</Button>
      </div>
      {style === "random" && (
        <div className="mt-3 max-w-xs">
          <FieldLabel htmlFor="pdfpw-len">Length (8–64)</FieldLabel>
          <Input id="pdfpw-len" type="number" min={8} max={64} value={length} onChange={(e) => setLength(e.target.value)} className="font-mono" />
        </div>
      )}
      <div className="mt-3">
        <FieldLabel htmlFor="pdfpw-out">Generated password</FieldLabel>
        <Textarea id="pdfpw-out" value={pw} readOnly rows={3} className="font-mono break-all" aria-live="polite" />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={regen}>Regenerate</Button>
        <Button type="button" variant="secondary" onClick={() => void copy()}>{copied ? "Copied ✓" : "Copy"}</Button>
      </div>
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        This creates the password only — apply it with your PDF software&apos;s encryption option. Never share protected passwords over insecure channels.
      </p>
    </div>
  );
}

/* ---------- text extraction ---------- */

function usePdfText(bytes: Uint8Array | null, fileKey: string) {
  const [state, setState] = useState<{ key: string; pages: string[] | null }>({ key: "", pages: null });
  useEffect(() => {
    if (!bytes || state.key === fileKey) return;
    let live = true;
    void (async () => {
      try {
        const pdfjs = await getPdfJs();
        const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const out: string[] = [];
        const maxPages = Math.min(doc.numPages, 200);
        for (let i = 1; i <= maxPages; i += 1) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          const lines: string[] = [];
          let lastY: number | null = null;
          for (const item of tc.items) {
            if ("str" in item) {
              const y = Array.isArray(item.transform) ? item.transform[5] : null;
              if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) lines.push("\n");
              lines.push(item.str);
              if (item.str) lines.push(" ");
              lastY = typeof y === "number" ? y : lastY;
            }
          }
          out.push(lines.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
          page.cleanup();
        }
        if (live) setState({ key: fileKey, pages: out });
      } catch {
        if (live) setState({ key: fileKey, pages: [] });
      }
    })();
    return () => {
      live = false;
    };
  }, [bytes, fileKey, state.key]);
  const pages = state.key === fileKey ? state.pages : null;
  return { pages, working: bytes !== null && pages === null };
}

export function PdfTextExtractorTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const { pages, working } = usePdfText(bytes, fileName);
  const [copied, setCopied] = useState(-1);

  const copyPage = async (text: string, i: number) => {
    if (await copyText(text)) {
      setCopied(i);
      window.setTimeout(() => setCopied(-1), 2000);
    }
  };

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && working && <p role="status" className="mt-3 text-sm text-(--muted)">Extracting text…</p>}
      {pages && pages.length === 0 && !working && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          No selectable text found. Scanned PDFs are images without text — OCR support is on the roadmap.
        </p>
      )}
      {pages && pages.length > 0 && (
        <div className="mt-4 space-y-4" aria-live="polite">
          {pages.map((t, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-bold">Page {i + 1}</p>
                <Button type="button" variant="ghost" onClick={() => void copyPage(t, i)} disabled={!t}>
                  {copied === i ? "Copied ✓" : "Copy page"}
                </Button>
              </div>
              <Textarea value={t} readOnly rows={6} className="text-sm" aria-label={`Extracted text page ${i + 1}`} />
            </div>
          ))}
        </div>
      )}
      {bytes && <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}

export function PdfToTextTool() {
  const { bytes, fileName, error, busy, pick, reset } = usePdfFile();
  const { pages, working } = usePdfText(bytes, fileName);
  const full = pages && pages.length > 0
    ? pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join("\n\n")
    : "";

  return (
    <div>
      <PdfBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {bytes && working && <p role="status" className="mt-3 text-sm text-(--muted)">Converting…</p>}
      {full && (
        <>
          <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3">
            <Stat value={String(pages!.length)} label="Pages converted" />
            <Stat value={formatBytes(full.length)} label="Text size" />
          </div>
          <Textarea value={full} readOnly rows={12} className="mt-3 text-sm" aria-label="Converted plain text" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => downloadTextFile(`${baseName(fileName)}.txt`, full, "text/plain")}>
              Download .txt
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- text to pdf ---------- */

export function TextToPdfTool() {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState("12");
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
  const [working, setWorking] = useState(false);

  const build = async () => {
    if (!text.trim()) return;
    setWorking(true);
    try {
      const { StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const size = Math.max(8, Math.min(24, Number(fontSize) || 12));
      const [pw, ph] = pageSize === "a4" ? [595.28, 841.89] : [612, 792];
      const margin = 56;
      const maxW = pw - margin * 2;
      const lineH = size * 1.45;
      const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
      const lines: string[] = [];
      const measure = (s: string) => font.widthOfTextAtSize(s, size);
      for (const para of paragraphs) {
        if (!para.trim()) {
          lines.push("");
          continue;
        }
        const words = para.split(/\s+/);
        let cur = "";
        for (const w of words) {
          const trial = cur ? `${cur} ${w}` : w;
          if (measure(trial) > maxW && cur) {
            lines.push(cur);
            cur = w;
          } else {
            cur = trial;
          }
        }
        lines.push(cur);
      }
      let page = doc.addPage([pw, ph]);
      let y = ph - margin;
      for (const line of lines) {
        if (y < margin + lineH) {
          page = doc.addPage([pw, ph]);
          y = ph - margin;
        }
        if (line) page.drawText(line, { x: margin, y: y - size, size, font });
        y -= lineH;
      }
      const data = await doc.save();
      downloadBytes(data, "document.pdf", "application/pdf");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="ttp-size">Font size</FieldLabel>
          <Input id="ttp-size" type="number" min={8} max={24} value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="font-mono" />
        </div>
        <div>
          <FieldLabel htmlFor="ttp-page">Page size</FieldLabel>
          <select id="ttp-page" value={pageSize} onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </div>
      </div>
      <div className="mt-3">
        <FieldLabel htmlFor="ttp-text">Your text</FieldLabel>
        <Textarea id="ttp-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste or type text to turn into a printable PDF…" />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={() => void build()} disabled={working || !text.trim()}>
          {working ? "Building…" : "Download PDF"}
        </Button>
      </div>
    </div>
  );
}
