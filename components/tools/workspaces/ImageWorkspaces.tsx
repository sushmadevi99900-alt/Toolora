"use client";

/**
 * Image tool workspaces — all processing runs on-device via canvas.
 * Files are never uploaded anywhere.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Input } from "../../ui/Input";
import { copyText, downloadTextFile } from "@/lib/engine/formatters";
import {
  ACCEPTED_IMAGE_MIMES,
  baseName,
  canvasToBlob,
  downloadBlob,
  drawCover,
  extForMime,
  formatBytes,
  loadImageFile,
  makeCanvas,
  parseImageMeta,
  revokeImage,
  rgbToHex,
  rgbToHsl,
  type ImageMeta,
  type LoadedImage,
} from "@/lib/engine/images";

/* ---------- shared ---------- */

function useImageFile(onReplace?: (img: LoadedImage | null) => void) {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pick = useCallback(
    async (file: File | null) => {
      setError("");
      if (!file) return;
      revokeImage(image);
      onReplace?.(null);
      setBusy(true);
      try {
        const loaded = await loadImageFile(file);
        setImage(loaded);
        setRawFile(file);
        onReplace?.(loaded);
      } catch (e) {
        setImage(null);
        setRawFile(null);
        setError(e instanceof Error ? e.message : "Could not read that image.");
      } finally {
        setBusy(false);
      }
    },
    [image, onReplace],
  );
  useEffect(() => () => revokeImage(image), [image]);
  const reset = useCallback(() => {
    revokeImage(image);
    setImage(null);
    setRawFile(null);
    setError("");
    onReplace?.(null);
  }, [image, onReplace]);
  return { image, rawFile, error, busy, pick, reset };
}

function FileBar({ onPick, busy }: { onPick: (f: File | null) => void; busy: boolean }) {
  return (
    <div>
      <FieldLabel htmlFor="img-file">Choose an image (JPG, PNG or WebP · max 25 MB)</FieldLabel>
      <Input
        id="img-file"
        type="file"
        accept={ACCEPTED_IMAGE_MIMES.join(",")}
        disabled={busy}
        onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl bg-danger-600/10 px-4 py-3 text-sm font-medium text-danger-600">
      {message}
    </p>
  );
}

function FileStats({ image, extra }: { image: LoadedImage; extra?: { label: string; value: string }[] }) {
  return (
    <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat value={`${image.width}×${image.height}`} label="Dimensions" />
      <Stat value={formatBytes(image.fileSize)} label="Original size" />
      <Stat value={image.mimeType.replace("image/", "").toUpperCase()} label="Format" />
      {(extra ?? []).map((s) => (
        <Stat key={s.label} value={s.value} label={s.label} />
      ))}
    </div>
  );
}

/* ---------- compressor ---------- */

export function ImageCompressorTool() {
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<"auto" | "image/jpeg" | "image/webp">("auto");
  const [result, setResult] = useState<{ url: string; size: number; mime: string } | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [working, setWorking] = useState(false);
  const clearResult = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setResultBlob(null);
  }, []);
  const { image, error, busy, pick, reset } = useImageFile(() => clearResult());

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const compress = async () => {
    if (!image) return;
    setWorking(true);
    try {
      const maxSide = 2560;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const w = Math.round(image.width * scale);
      const h = Math.round(image.height * scale);
      const c = makeCanvas(w, h);
      const ctx = c.getContext("2d")!;
      if (format !== "auto" || image.mimeType === "image/png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(image.img, 0, 0, w, h);
      let mime = format === "auto" ? (image.mimeType === "image/png" ? "image/png" : "image/jpeg") : format;
      let blob = await canvasToBlob(c, mime, mime === "image/png" ? undefined : quality / 100);
      if (blob.type !== mime && mime === "image/png") {
        blob = await canvasToBlob(c, "image/jpeg", quality / 100);
        mime = "image/jpeg";
      }
      if (result) URL.revokeObjectURL(result.url);
      setResult({ url: URL.createObjectURL(blob), size: blob.size, mime: blob.type || mime });
      setResultBlob(blob);
    } catch {
      setResult(null);
    } finally {
      setWorking(false);
    }
  };

  const savedSize = result?.size ?? 0;
  const ratio = image && savedSize ? Math.max(0, Math.round((1 - savedSize / image.fileSize) * 100)) : 0;

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <FileStats
            image={image}
            extra={
              savedSize
                ? [
                    { label: "Compressed", value: formatBytes(savedSize) },
                    { label: "Saved", value: `${ratio}%` },
                  ]
                : []
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="cmp-quality">Quality: {quality}%</FieldLabel>
              <input
                id="cmp-quality"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => { setQuality(Number(e.target.value)); clearResult(); }}
                className="min-h-[44px] w-full accent-brand-600"
              />
            </div>
            <div>
              <FieldLabel htmlFor="cmp-format">Output format</FieldLabel>
              <select
                id="cmp-format"
                value={format}
                onChange={(e) => { setFormat(e.target.value as typeof format); clearResult(); }}
                className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]"
              >
                <option value="auto">Auto (match source)</option>
                <option value="image/jpeg">JPEG (smallest)</option>
                <option value="image/webp">WebP (modern)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void compress()} disabled={working}>
              {working ? "Compressing…" : result ? "Re-compress" : "Compress"}
            </Button>
            {result && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => resultBlob && downloadBlob(resultBlob, `${baseName(image.fileName)}-compressed.${extForMime(result.mime)}`)}
              >
                Download ({formatBytes(result.size)})
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
          {result && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="Compressed preview" className="mt-2 max-h-80 rounded-xl border border-(--border)" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- resizer ---------- */

const RESIZE_PRESETS = [
  { label: "Small web (640px)", w: 640, h: 0 },
  { label: "Full HD (1920px)", w: 1920, h: 0 },
  { label: "Square post (1080×1080)", w: 1080, h: 1080 },
  { label: "Story (1080×1920)", w: 1080, h: 1920 },
  { label: "Blog banner (1200×628)", w: 1200, h: 628 },
  { label: "Avatar (256×256)", w: 256, h: 256 },
];

export function ImageResizerTool() {
  const [mode, setMode] = useState<"pixels" | "percent">("pixels");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [pct, setPct] = useState("50");
  const [lock, setLock] = useState(true);
  const [formError, setFormError] = useState("");
  const { image, error, busy, pick, reset } = useImageFile((loaded) => {
    setW(loaded ? String(loaded.width) : "");
    setH(loaded ? String(loaded.height) : "");
    setFormError("");
  });

  const onW = (v: string) => {
    setW(v);
    if (lock && image) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) setH(String(Math.max(1, Math.round((n / image.width) * image.height))));
    }
  };
  const onH = (v: string) => {
    setH(v);
    if (lock && image) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) setW(String(Math.max(1, Math.round((n / image.height) * image.width))));
    }
  };

  const dims = (): [number, number] | null => {
    if (!image) return null;
    if (mode === "percent") {
      const p = Number(pct);
      if (!Number.isFinite(p) || p < 1 || p > 1000) return null;
      return [Math.max(1, Math.round((image.width * p) / 100)), Math.max(1, Math.round((image.height * p) / 100))];
    }
    const nw = Number(w);
    const nh = Number(h);
    if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw < 1 || nh < 1 || nw > 12000 || nh > 12000) return null;
    return [Math.round(nw), Math.round(nh)];
  };

  const target = dims();
  const upscaling = !!target && !!image && (target[0] > image.width || target[1] > image.height);

  const resize = async () => {
    const t = dims();
    if (!image || !t) {
      setFormError("Enter valid dimensions (1–12000px, or 1–1000%).");
      return;
    }
    setFormError("");
    const c = makeCanvas(t[0], t[1]);
    c.getContext("2d")!.drawImage(image.img, 0, 0, t[0], t[1]);
    const blob = await canvasToBlob(c, "image/png");
    downloadBlob(blob, `${baseName(image.fileName)}-${t[0]}x${t[1]}.png`);
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <FileStats image={image} extra={target ? [{ label: "Output", value: `${target[0]}×${target[1]}` }] : []} />
          <div className="mt-4 flex gap-2" role="group" aria-label="Resize mode">
            {(["pixels", "percent"] as const).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "primary" : "secondary"} onClick={() => setMode(m)}>
                {m === "pixels" ? "Exact pixels" : "Percentage"}
              </Button>
            ))}
          </div>
          {mode === "pixels" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="rsz-w">Width (px)</FieldLabel>
                <Input id="rsz-w" type="number" min={1} max={12000} value={w} onChange={(e) => onW(e.target.value)} className="font-mono" />
              </div>
              <div>
                <FieldLabel htmlFor="rsz-h">Height (px)</FieldLabel>
                <Input id="rsz-h" type="number" min={1} max={12000} value={h} onChange={(e) => onH(e.target.value)} className="font-mono" />
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <FieldLabel htmlFor="rsz-pct">Scale: {pct}%</FieldLabel>
              <input id="rsz-pct" type="range" min={1} max={1000} value={pct} onChange={(e) => setPct(e.target.value)} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          )}
          <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="h-5 w-5 accent-brand-600" />
            Lock aspect ratio
          </label>
          <div className="mt-2">
            <p className="text-sm font-semibold text-(--muted)">Presets</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {RESIZE_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setMode("pixels");
                    if (p.h === 0 && image) {
                      setW(String(p.w));
                      setH(String(Math.max(1, Math.round((p.w / image.width) * image.height))));
                    } else {
                      setW(String(p.w));
                      setH(String(p.h));
                    }
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          {upscaling && (
            <p role="note" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Upscaling beyond the original size can soften details.
            </p>
          )}
          <Err message={formError} />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void resize()}>Resize & download</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- cropper ---------- */

const CROP_RATIOS = [
  { label: "Free", w: 0, h: 0 },
  { label: "Square 1:1", w: 1, h: 1 },
  { label: "Portrait 4:5", w: 4, h: 5 },
  { label: "Story 9:16", w: 9, h: 16 },
  { label: "Wide 16:9", w: 16, h: 9 },
  { label: "Photo 3:2", w: 3, h: 2 },
];

export function ImageCropperTool() {
  const { image, error, busy, pick, reset } = useImageFile();
  const [ratio, setRatio] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const r = CROP_RATIOS[ratio]!;

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !image) return;
    const scale = zoom / 100;
    canvas.width = 600;
    canvas.height = r.w === 0 ? Math.round((600 * image.height) / image.width) : Math.round((600 * r.h) / r.w);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCover(ctx, image.img, image.width, image.height, scale, ox / 100, oy / 100);
  }, [image, r.w, r.h, ratio, zoom, ox, oy]);

  const crop = async () => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, `${baseName(image?.fileName ?? "image")}-crop.png`);
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Crop ratio">
            {CROP_RATIOS.map((c, i) => (
              <Button key={c.label} type="button" variant={i === ratio ? "primary" : "secondary"} onClick={() => setRatio(i)}>
                {c.label}
              </Button>
            ))}
          </div>
          <canvas ref={previewRef} className="mt-4 max-h-96 w-full rounded-xl border border-(--border) object-contain" aria-label="Crop preview" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="crp-zoom">Zoom: {zoom}%</FieldLabel>
              <input id="crp-zoom" type="range" min={100} max={300} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
            <div>
              <FieldLabel htmlFor="crp-ox">Position X: {ox}%</FieldLabel>
              <input id="crp-ox" type="range" min={-50} max={50} value={ox} onChange={(e) => setOx(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
            <div>
              <FieldLabel htmlFor="crp-oy">Position Y: {oy}%</FieldLabel>
              <input id="crp-oy" type="range" min={-50} max={50} value={oy} onChange={(e) => setOy(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void crop()}>Crop & download</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- format converters ---------- */

function ConvertCore({ from, to, quality, bg, settingsKey }: { from: string; to: "image/png" | "image/jpeg" | "image/webp"; quality?: number; bg?: string; settingsKey: string }) {
  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [builtKey, setBuiltKey] = useState("");
  const clearOut = useCallback(() => {
    setOutUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setOutSize(0);
    setBlob(null);
  }, []);
  const { image, error, busy, pick, reset } = useImageFile(() => clearOut());

  const convert = async () => {
    if (!image) return;
    const c = makeCanvas(image.width, image.height);
    const ctx = c.getContext("2d")!;
    if (to === "image/jpeg" || (to === "image/webp" && bg)) {
      ctx.fillStyle = bg ?? "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(image.img, 0, 0);
    let b = await canvasToBlob(c, to, to === "image/png" ? undefined : (quality ?? 92) / 100);
    if (!b.type) throw new Error("Your browser could not encode that format.");
    if (b.type !== to && to !== "image/png") {
      // Fallback when the encoder is unsupported (older browsers).
      b = await canvasToBlob(c, "image/png");
    }
    if (outUrl) URL.revokeObjectURL(outUrl);
    setOutUrl(URL.createObjectURL(b));
    setOutSize(b.size);
    setBlob(b);
    setBuiltKey(settingsKey);
  };

  useEffect(() => () => {
    if (outUrl) URL.revokeObjectURL(outUrl);
  }, [outUrl]);

  const stale = !!blob && builtKey !== settingsKey;

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <FileStats image={image} extra={outSize && !stale ? [{ label: "Converted", value: formatBytes(outSize) }] : []} />
          {stale && (
            <p role="note" className="mt-2 text-sm text-(--muted)">Settings changed — convert again for the new output.</p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void convert().catch(() => {})}>Convert {from} → {extForMime(to).toUpperCase()}</Button>
            {blob && !stale && (
              <Button type="button" variant="secondary" onClick={() => downloadBlob(blob, `${baseName(image.fileName)}.${extForMime(blob.type || to)}`)}>
                Download ({formatBytes(outSize)})
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => reset()}>New image</Button>
          </div>
          {outUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={outUrl} alt="Converted preview" className="mt-4 max-h-80 rounded-xl border border-(--border)" />
          )}
        </>
      )}
    </div>
  );
}

export function JpgToPngTool() { return <ConvertCore from="JPG" to="image/png" settingsKey="png" />; }

export function PngToJpgTool() {
  const [quality, setQuality] = useState(90);
  const [bg, setBg] = useState("#ffffff");
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="pj-q">Quality: {quality}%</FieldLabel>
          <input id="pj-q" type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
        </div>
        <div>
          <FieldLabel htmlFor="pj-bg">Background for transparency</FieldLabel>
          <Input id="pj-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-[44px] cursor-pointer p-1" />
        </div>
      </div>
      <p className="mt-2 text-sm text-(--muted)">JPG has no transparency — transparent areas become this colour.</p>
      <div className="mt-3"><ConvertCore from="PNG" to="image/jpeg" quality={quality} bg={bg} settingsKey={`jpg-${quality}-${bg}`} /></div>
    </div>
  );
}

export function WebpConverterTool() {
  const [to, setTo] = useState<"image/jpeg" | "image/png">("image/jpeg");
  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Output format">
        {(["image/jpeg", "image/png"] as const).map((m) => (
          <Button key={m} type="button" variant={to === m ? "primary" : "secondary"} onClick={() => setTo(m)}>
            {extForMime(m).toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="mt-3"><ConvertCore from="WebP" to={to} quality={92} bg="#ffffff" settingsKey={to} /></div>
    </div>
  );
}

export function ImageToWebpTool() {
  const [quality, setQuality] = useState(85);
  return (
    <div>
      <FieldLabel htmlFor="w-q">Quality: {quality}%</FieldLabel>
      <input id="w-q" type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
      <p className="mt-1 text-sm text-(--muted)">WebP is typically 25–35% smaller than JPEG at similar visual quality.</p>
      <div className="mt-3"><ConvertCore from="image" to="image/webp" quality={quality} settingsKey={`webp-${quality}`} /></div>
    </div>
  );
}

/* ---------- base64 ---------- */

export function ImageToBase64Tool() {
  const [uri, setUri] = useState("");
  const [copied, setCopied] = useState(false);
  const { image, rawFile, error, busy, pick, reset } = useImageFile(() => {
    setUri("");
    setCopied(false);
  });

  useEffect(() => {
    if (!rawFile) return;
    const reader = new FileReader();
    reader.onload = () => setUri(String(reader.result ?? ""));
    reader.onerror = () => setUri("");
    reader.readAsDataURL(rawFile);
  }, [rawFile]);

  const copy = async () => {
    if (uri && (await copyText(uri))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <FileStats image={image} extra={uri ? [{ label: "Encoded", value: formatBytes(uri.length) }] : []} />
          <p className="mt-3 text-sm text-(--muted)">Best for tiny icons and single-file demos — large images make very long strings.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => void copy()} disabled={!uri}>{copied ? "Copied ✓" : "Copy data URI"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile(`${baseName(image.fileName)}.txt`, uri, "text/plain")} disabled={!uri}>Download .txt</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-sm font-semibold">Data URI</span>
            <textarea value={uri} readOnly rows={6} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all" aria-live="polite" />
          </label>
        </>
      )}
    </div>
  );
}

export function Base64ToImageTool() {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState("");
  const [mime, setMime] = useState("");
  const [error, setError] = useState("");

  const decode = () => {
    setError("");
    setPreview("");
    const clean = raw.trim();
    if (!clean) {
      setError("Paste a Base64 string or data URI first.");
      return;
    }
    try {
      let dataUrl = clean;
      if (!clean.startsWith("data:")) dataUrl = `data:image/png;base64,${clean.replace(/\s+/g, "")}`;
      const m = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
      if (!m || m[2] !== ";base64") throw new Error("bad");
      const type = m[1] || "image/png";
      if (!type.startsWith("image/")) throw new Error("not an image data URI");
      const bin = atob(m[3]!.replace(/\s+/g, ""));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type });
      setMime(type);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("That is not a valid Base64 image. Check the string and try again.");
    }
  };

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const download = async () => {
    if (!preview) return;
    const blob = await (await fetch(preview)).blob();
    downloadBlob(blob, `decoded-image.${extForMime(mime || "image/png")}`);
  };

  return (
    <div>
      <FieldLabel htmlFor="b64i-input">Base64 string or data URI</FieldLabel>
      <textarea
        id="b64i-input"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
        placeholder="data:image/png;base64,iVBORw0KGgo…"
        className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all"
      />
      <Err message={error} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={decode}>Preview image</Button>
        {preview && <Button type="button" variant="secondary" onClick={() => void download()}>Download</Button>}
      </div>
      {preview && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={preview} alt="Decoded preview" className="mt-4 max-h-96 rounded-xl border border-(--border)" />
      )}
    </div>
  );
}

/* ---------- colour picker ---------- */

export function ImageColorPickerTool() {
  const { image, error, busy, pick, reset } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<{ hex: string; rgb: string; hsl: string } | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const maxW = 640;
    const scale = Math.min(1, maxW / image.width);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")!.drawImage(image.img, 0, 0, canvas.width, canvas.height);
  }, [image]);

  const sample = (clientX: number, clientY: number, hover = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    // Zoom preview (3x around cursor)
    const zc = zoomRef.current;
    if (zc) {
      const z = 48;
      const s = 9;
      zc.width = z;
      zc.height = z;
      const zctx = zc.getContext("2d")!;
      zctx.imageSmoothingEnabled = false;
      zctx.clearRect(0, 0, z, z);
      zctx.drawImage(canvas, x - 4, y - 4, s, s, 0, 0, z, z);
      zctx.strokeStyle = "#fff";
      zctx.strokeRect(z / 2 - 3, z / 2 - 3, 6, 6);
    }
    if (hover) return;
    const [r, g, b] = Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
    const hex = rgbToHex(r!, g!, b!);
    const [h, s, l] = rgbToHsl(r!, g!, b!);
    setColor({ hex, rgb: `rgb(${r}, ${g}, ${b})`, hsl: `hsl(${h}, ${s}%, ${l}%)` });
    setPalette((p) => (p.includes(hex) ? p : [hex, ...p].slice(0, 12)));
  };

  const copy = async (t: string) => {
    if (await copyText(t)) {
      setCopied(t);
      window.setTimeout(() => setCopied(""), 2000);
    }
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <canvas
              ref={canvasRef}
              className="max-h-96 w-full cursor-crosshair touch-none rounded-xl border border-(--border)"
              onClick={(e) => sample(e.clientX, e.clientY)}
              onMouseMove={(e) => sample(e.clientX, e.clientY, true)}
              aria-label="Click the image to pick a colour"
            />
            <div className="shrink-0">
              <p className="text-sm font-semibold text-(--muted)">Zoom</p>
              <canvas ref={zoomRef} width={48} height={48} className="mt-1 h-24 w-24 rounded-xl border border-(--border)" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-sm text-(--muted)">Click (or tap) any pixel to sample its exact colour.</p>
          {color && (
            <div aria-live="polite" className="mt-3 flex flex-wrap items-center gap-2">
              <span className="h-11 w-11 rounded-xl border border-(--border)" style={{ background: color.hex }} aria-hidden="true" />
              {([["HEX", color.hex], ["RGB", color.rgb], ["HSL", color.hsl]] as const).map(([label, v]) => (
                <Button key={label} type="button" variant="secondary" onClick={() => void copy(v)}>
                  {copied === v ? "Copied ✓" : `${label}: ${v}`}
                </Button>
              ))}
            </div>
          )}
          {palette.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-(--muted)">Palette history</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => void copy(c)}
                    title={`Copy ${c}`}
                    aria-label={`Copy ${c}`}
                    className="h-11 w-11 cursor-pointer rounded-xl border border-(--border)"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New image</Button></div>
        </>
      )}
    </div>
  );
}

/* ---------- metadata viewer + exif remover ---------- */

function MetaTable({ meta, image }: { meta: ImageMeta | null; image: LoadedImage }) {
  const rows: [string, string][] = [
    ["File name", image.fileName],
    ["File size", formatBytes(image.fileSize)],
    ["Format", meta?.format ?? image.mimeType],
    ["Dimensions", `${image.width} × ${image.height}px`],
  ];
  if (meta?.make || meta?.model) rows.push(["Camera", [meta.make, meta.model].filter(Boolean).join(" ")]);
  if (meta?.dateTime) rows.push(["Taken", meta.dateTime]);
  if (meta?.exposureTime) rows.push(["Exposure", meta.exposureTime]);
  if (meta?.fNumber) rows.push(["Aperture", meta.fNumber]);
  if (meta?.iso) rows.push(["ISO", meta.iso]);
  if (meta?.colorType) rows.push(["Colour", `${meta.colorType}${meta.bitDepth ? ` · ${meta.bitDepth}-bit` : ""}`]);
  rows.push(["GPS location", meta?.hasGps ? "Present — remove before sharing!" : "Not found"]);
  return (
    <dl className="mt-4 overflow-hidden rounded-xl border border-(--border)">
      {rows.map(([k, v], i) => (
        <div key={k} className={`grid grid-cols-[140px_1fr] gap-2 px-4 py-2.5 text-sm ${i % 2 ? "bg-(--surface-2)/60" : ""}`}>
          <dt className="font-semibold text-(--muted)">{k}</dt>
          <dd className="font-medium break-all">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ImageMetadataViewerTool() {
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const { image, rawFile, error, busy, pick, reset } = useImageFile(() => setMeta(null));

  useEffect(() => {
    if (!rawFile || !image) return;
    let live = true;
    void rawFile.arrayBuffer().then((buf) => {
      if (live) setMeta(parseImageMeta(buf, image.mimeType));
    });
    return () => {
      live = false;
    };
  }, [rawFile, image]);

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          {meta?.hasGps && (
            <p role="note" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              This photo embeds GPS location data. Consider stripping it before publishing.
            </p>
          )}
          <MetaTable meta={meta} image={image} />
          <div className="mt-4"><Button type="button" variant="ghost" onClick={reset}>New image</Button></div>
        </>
      )}
    </div>
  );
}

export function ExifDataRemoverTool() {
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [cleaned, setCleaned] = useState<{ url: string; size: number } | null>(null);
  const { image, rawFile, error, busy, pick, reset } = useImageFile(() => {
    setMeta(null);
    setCleaned((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  });

  useEffect(() => {
    if (!rawFile || !image) return;
    let live = true;
    void rawFile.arrayBuffer().then((buf) => {
      if (live) setMeta(parseImageMeta(buf, image.mimeType));
    });
    return () => {
      live = false;
    };
  }, [rawFile, image]);
  useEffect(() => () => {
    if (cleaned) URL.revokeObjectURL(cleaned.url);
  }, [cleaned]);

  const clean = async () => {
    if (!image) return;
    // Re-encoding through canvas drops ALL metadata (EXIF, GPS, thumbnails).
    const c = makeCanvas(image.width, image.height);
    c.getContext("2d")!.drawImage(image.img, 0, 0);
    const blob = await canvasToBlob(c, "image/jpeg", 0.92);
    if (cleaned) URL.revokeObjectURL(cleaned.url);
    setCleaned({ url: URL.createObjectURL(blob), size: blob.size });
  };

  const tagsFound = meta ? [meta.make && "camera", meta.dateTime && "timestamp", meta.hasGps && "GPS", meta.exposureTime && "exposure"].filter(Boolean).length : 0;

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <MetaTable meta={meta} image={image} />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void clean()}>Remove metadata</Button>
            {cleaned && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  fetch(cleaned.url)
                    .then((r) => r.blob())
                    .then((b) => downloadBlob(b, `${baseName(image.fileName)}-clean.jpg`))
                }
              >
                Download clean copy ({formatBytes(cleaned.size)})
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
          {cleaned && (
            <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Removed {tagsFound > 0 ? `${tagsFound} metadata group${tagsFound > 1 ? "s" : ""}` : "all embedded metadata"} by re-encoding pixels. The downloaded copy has no EXIF or GPS data.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- blur ---------- */

export function ImageBlurTool() {
  const { image, error, busy, pick, reset } = useImageFile();
  const [strength, setStrength] = useState(12);
  const [mode, setMode] = useState<"brush" | "full" | "pixelate">("brush");
  const mainRef = useRef<HTMLCanvasElement>(null);
  const blurredRef = useRef<HTMLCanvasElement | null>(null);
  const painting = useRef(false);

  const paint = useCallback(() => {
    const main = mainRef.current;
    if (!main || !image) return;
    const scale = Math.min(1, 900 / Math.max(image.width, image.height));
    main.width = Math.round(image.width * scale);
    main.height = Math.round(image.height * scale);
    const ctx = main.getContext("2d")!;
    ctx.drawImage(image.img, 0, 0, main.width, main.height);
    if (mode === "full") {
      ctx.filter = `blur(${strength}px)`;
      ctx.drawImage(image.img, 0, 0, main.width, main.height);
      ctx.filter = "none";
    } else {
      // Offscreen blurred copy used as the brush source.
      const b = makeCanvas(main.width, main.height);
      const bctx = b.getContext("2d")!;
      bctx.filter = mode === "pixelate" ? "none" : `blur(${strength}px)`;
      bctx.drawImage(image.img, 0, 0, b.width, b.height);
      blurredRef.current = b;
    }
  }, [image, mode, strength]);

  useEffect(() => {
    paint();
  }, [paint]);

  const dab = (clientX: number, clientY: number) => {
    const main = mainRef.current;
    const b = blurredRef.current;
    if (!main || !b || mode === "full") return;
    const rect = main.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * main.width;
    const y = ((clientY - rect.top) / rect.height) * main.height;
    const ctx = main.getContext("2d")!;
    const r = Math.max(12, main.width / 18);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (mode === "pixelate") {
      const px = Math.max(6, Math.round(r / 4));
      const tmp = makeCanvas(px, px);
      const tctx = tmp.getContext("2d")!;
      tctx.drawImage(main, x - r, y - r, r * 2, r * 2, 0, 0, px, px);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, px, px, x - r, y - r, r * 2, r * 2);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.drawImage(b, x - r, y - r, r * 2, r * 2, x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  };

  const download = async () => {
    const main = mainRef.current;
    if (!main) return;
    const blob = await canvasToBlob(main, "image/png");
    downloadBlob(blob, `${baseName(image?.fileName ?? "image")}-blurred.png`);
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Blur mode">
            {(["brush", "full", "pixelate"] as const).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "primary" : "secondary"} onClick={() => setMode(m)}>
                {m === "brush" ? "Brush blur" : m === "full" ? "Blur whole image" : "Pixelate brush"}
              </Button>
            ))}
          </div>
          {mode !== "pixelate" && (
            <div className="mt-2">
              <FieldLabel htmlFor="blur-s">Strength: {strength}px</FieldLabel>
              <input id="blur-s" type="range" min={2} max={40} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          )}
          <canvas
            ref={mainRef}
            className="mt-3 max-h-[480px] w-full touch-none rounded-xl border border-(--border)"
            style={{ cursor: mode === "full" ? "default" : "crosshair" }}
            onPointerDown={(e) => {
              if (mode === "full") return;
              painting.current = true;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              dab(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (painting.current) dab(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              painting.current = false;
            }}
            aria-label={mode === "full" ? "Blurred image" : "Paint over sensitive areas to blur them"}
          />
          <p className="mt-2 text-sm text-(--muted)">
            {mode === "full" ? "The whole image is blurred." : "Drag over faces, plates or private details. Blur is baked into the download — keep your original safe."}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void download()}>Download blurred copy</Button>
            <Button type="button" variant="secondary" onClick={paint}>Reset edits</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- rotate + flip ---------- */

export function ImageRotateTool() {
  const { image, error, busy, pick, reset } = useImageFile();
  const [angle, setAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !image) return;
    const rad = ((angle % 360) * Math.PI) / 180;
    const w = Math.abs(image.width * Math.cos(rad)) + Math.abs(image.height * Math.sin(rad));
    const h = Math.abs(image.width * Math.sin(rad)) + Math.abs(image.height * Math.cos(rad));
    const scale = Math.min(1, 640 / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale((flipH ? -1 : 1) * scale, (flipV ? -1 : 1) * scale);
    ctx.drawImage(image.img, -image.width / 2, -image.height / 2);
  }, [image, angle, flipH, flipV]);

  const download = async () => {
    if (!image) return;
    const rad = ((angle % 360) * Math.PI) / 180;
    const w = Math.abs(image.width * Math.cos(rad)) + Math.abs(image.height * Math.sin(rad));
    const h = Math.abs(image.width * Math.sin(rad)) + Math.abs(image.height * Math.cos(rad));
    const c = makeCanvas(w, h);
    const ctx = c.getContext("2d")!;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(image.img, -image.width / 2, -image.height / 2);
    const blob = await canvasToBlob(c, "image/png");
    downloadBlob(blob, `${baseName(image.fileName)}-rotated.png`);
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setAngle((a) => (a - 90 + 360) % 360)}>⟲ 90°</Button>
            <Button type="button" variant="secondary" onClick={() => setAngle((a) => (a + 90) % 360)}>90° ⟳</Button>
            <Button type="button" variant={flipH ? "primary" : "secondary"} onClick={() => setFlipH((v) => !v)}>Flip H</Button>
            <Button type="button" variant={flipV ? "primary" : "secondary"} onClick={() => setFlipV((v) => !v)}>Flip V</Button>
          </div>
          <div className="mt-3">
            <FieldLabel htmlFor="rot-a">Fine-tune angle: {angle}°</FieldLabel>
            <input id="rot-a" type="range" min={0} max={359} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
          </div>
          <canvas ref={previewRef} className="mt-3 max-h-96 w-full rounded-xl border border-(--border) object-contain" aria-label="Rotation preview" />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void download()}>Download rotated</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}

export function ImageFlipTool() {
  const [dir, setDir] = useState<"h" | "v">("h");
  const [preview, setPreview] = useState("");
  const renderPreview = useCallback((img: LoadedImage | null, d: "h" | "v") => {
    if (!img) {
      setPreview("");
      return;
    }
    const c = makeCanvas(img.width, img.height);
    const ctx = c.getContext("2d")!;
    if (d === "h") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, c.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(img.img, 0, 0);
    setPreview(c.toDataURL("image/png"));
  }, []);
  const { image, error, busy, pick, reset } = useImageFile((loaded) => renderPreview(loaded, dir));

  const changeDir = (d: "h" | "v") => {
    setDir(d);
    renderPreview(image, d);
  };

  const download = async () => {
    if (!image) return;
    const c = makeCanvas(image.width, image.height);
    const ctx = c.getContext("2d")!;
    if (dir === "h") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, c.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(image.img, 0, 0);
    downloadBlob(await canvasToBlob(c, "image/png"), `${baseName(image.fileName)}-flipped.png`);
  };

  return (
    <div>
      <FileBar onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {image && (
        <>
          <div className="mt-3 flex gap-2" role="group" aria-label="Flip direction">
            <Button type="button" variant={dir === "h" ? "primary" : "secondary"} onClick={() => changeDir("h")}>Horizontal</Button>
            <Button type="button" variant={dir === "v" ? "primary" : "secondary"} onClick={() => changeDir("v")}>Vertical</Button>
          </div>
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Flipped preview" className="mt-4 max-h-96 rounded-xl border border-(--border)" />
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void download()}>Download flipped</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}
