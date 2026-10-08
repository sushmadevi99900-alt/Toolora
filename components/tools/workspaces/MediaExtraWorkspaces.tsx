"use client";

/**
 * MediaExtra workspaces — image / svg / color / archive tools.
 * Everything runs on-device (canvas, deflate, string ops). No uploads.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { copyText, downloadTextFile } from "@/lib/engine/formatters";
import {
  baseName,
  canvasToBlob,
  downloadBlob,
  drawCover,
  extForMime,
  formatBytes,
  makeCanvas,
  parseImageMeta,
} from "@/lib/engine/images";
import { readExif } from "@/lib/image/exif";
import { gunzipText, gzipText, zipCreate, zipExtract } from "@/lib/archive/zip";
import {
  Calc,
  Err,
  FilePick,
  Gen,
  Note,
  RefTable,
  TextOp,
  useCopied,
  type Field,
} from "../kits/kits";

export const mediaextraRegistry: Record<string, React.ComponentType> = {
  "image-converter": ImageConverterTool,
  "webp-to-jpg": WebpToJpgTool,
  "webp-to-png": WebpToPngTool,
  "gif-to-jpg": GifToJpgTool,
  "gif-to-png": GifToPngTool,
  "image-grayscale": ImageGrayscaleTool,
  "image-sharpen": ImageSharpenTool,
  "image-brightness": ImageBrightnessTool,
  "image-contrast": ImageContrastTool,
  "image-saturation": ImageSaturationTool,
  "image-hue-rotate": ImageHueRotateTool,
  "image-exposure": ImageExposureTool,
  "image-invert": ImageInvertTool,
  "image-pixelate": ImagePixelateTool,
  "image-rounded-corners": ImageRoundedCornersTool,
  "image-border-maker": ImageBorderMakerTool,
  "image-watermark": ImageWatermarkTool,
  "image-text-overlay": ImageTextOverlayTool,
  "meme-generator": MemeGeneratorTool,
  "image-collage-maker": ImageCollageMakerTool,
  "contact-sheet-maker": ContactSheetMakerTool,
  "image-data-uri-generator": ImageDataUriGeneratorTool,
  "dominant-color-finder": DominantColorFinderTool,
  "palette-extractor": PaletteExtractorTool,
  "aspect-ratio-tool": AspectRatioTool,
  "image-dimensions-checker": ImageDimensionsCheckerTool,
  "image-dpi-calculator": ImageDpiCalculatorTool,
  "file-size-estimator": FileSizeEstimatorTool,
  "favicon-generator": FaviconGeneratorTool,
  "app-icon-generator": AppIconGeneratorTool,
  "social-image-resizer": SocialImageResizerTool,
  "passport-photo-cropper": PassportPhotoCropperTool,
  "profile-picture-maker": ProfilePictureMakerTool,
  "thumbnail-maker": ThumbnailMakerTool,
  "screenshot-cropper": ScreenshotCropperTool,
  "photo-exif-viewer": PhotoExifViewerTool,
  "svg-viewer": SvgViewerTool,
  "svg-formatter": SvgFormatterTool,
  "svg-minifier": SvgMinifierTool,
  "svg-optimizer": SvgOptimizerTool,
  "svg-to-data-uri": SvgToDataUriTool,
  "data-uri-to-svg": DataUriToSvgTool,
  "svg-color-replacer": SvgColorReplacerTool,
  "svg-dimension-extractor": SvgDimensionExtractorTool,
  "svg-path-viewer": SvgPathViewerTool,
  "svg-to-png": SvgToPngTool,
  "color-picker-pro": ColorPickerProTool,
  "hex-to-rgb": HexToRgbTool,
  "rgb-to-hex": RgbToHexTool,
  "hex-to-hsl": HexToHslTool,
  "hsl-to-hex": HslToHexTool,
  "rgb-to-hsl": RgbToHslTool,
  "hsl-to-rgb": HslToRgbTool,
  "cmyk-converter": CmykConverterTool,
  "hsv-converter": HsvConverterTool,
  "color-contrast-checker": ColorContrastCheckerTool,
  "color-palette-generator": ColorPaletteGeneratorTool,
  "gradient-generator": GradientGeneratorTool,
  "css-shadow-generator": CssShadowGeneratorTool,
  "css-border-generator": CssBorderGeneratorTool,
  "css-radius-generator": CssRadiusGeneratorTool,
  "css-transform-generator": CssTransformGeneratorTool,
  "css-animation-generator": CssAnimationGeneratorTool,
  "css-button-generator": CssButtonGeneratorTool,
  "text-gradient-generator": TextGradientGeneratorTool,
  "color-mixer": ColorMixerTool,
  "gzip-compressor": GzipCompressorTool,
  "gzip-decompressor": GzipDecompressorTool,
  "zip-creator": ZipCreatorTool,
  "zip-extractor": ZipExtractorTool,
  "text-compressor": TextCompressorTool,
  "text-decompressor": TextDecompressorTool,
  "file-compression-calculator": FileCompressionCalculatorTool,
  "archive-inspector": ArchiveInspectorTool,
  "filename-batch-renamer": FilenameBatchRenamerTool,
};

/* ================= shared image engine ================= */

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_MP = 25_000_000;
const STD_ACCEPT = "image/jpeg,image/png,image/webp";
const GIF_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

interface MX {
  img: HTMLImageElement;
  url: string;
  w: number;
  h: number;
  name: string;
  size: number;
  mime: string;
}

async function decodeImg(file: File, extra: string[] = []): Promise<MX> {
  const ok = ["image/jpeg", "image/png", "image/webp", ...extra];
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (!ok.includes(file.type)) throw new Error(`“${file.type || "unknown type"}” is not supported here.`);
  if (file.size > MAX_BYTES) throw new Error(`Image is too large (${formatBytes(file.size)}). Maximum is 25 MB.`);
  if (file.size === 0) throw new Error("That file appears to be empty.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Could not decode that image. It may be corrupt."));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("Could not decode that image. It may be corrupt.");
    if (w * h > MAX_MP)
      throw new Error(`Image is too large (${((w * h) / 1e6).toFixed(1)} MP). Maximum is 25 megapixels.`);
    return { img, url, w, h, name: file.name || "image", size: file.size, mime: file.type };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function useMX() {
  const [cur, setCur] = useState<MX | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => {
    if (cur) URL.revokeObjectURL(cur.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);
  const pick = async (f: File | null, extra: string[] = []) => {
    setError("");
    if (!f) return;
    if (cur) URL.revokeObjectURL(cur.url);
    setCur(null);
    setBusy(true);
    try {
      setCur(await decodeImg(f, extra));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    if (cur) URL.revokeObjectURL(cur.url);
    setCur(null);
    setError("");
  };
  return { cur, error, busy, pick, reset };
}

function ImgBar({
  busy, accept, onFile, id, label,
}: {
  busy: boolean; accept: string; onFile: (f: File | null) => void; id: string; label?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label ?? "Choose an image (JPG, PNG or WebP · max 25 MB)"}</FieldLabel>
      <Input
        id={id}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function PImg({ src, alt, cls }: { src: string; alt: string; cls?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cls ?? "mt-2 max-h-96 rounded-xl border border-(--border)"} />;
}

function MxStats({ cur, extra }: { cur: MX; extra?: { label: string; value: string }[] }) {
  return (
    <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat value={`${cur.w}×${cur.h}`} label="Dimensions" />
      <Stat value={formatBytes(cur.size)} label="Original size" />
      <Stat value={cur.mime.replace("image/", "").toUpperCase()} label="Format" />
      {(extra ?? []).map((s) => (
        <Stat key={s.label} value={s.value} label={s.label} />
      ))}
    </div>
  );
}

function useResultUrl() {
  const [url, setUrl] = useState("");
  const [bytes, setBytes] = useState(0);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  const replace = (blob: Blob) => {
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(blob));
    setBytes(blob.size);
  };
  const clear = () => {
    if (url) URL.revokeObjectURL(url);
    setUrl("");
    setBytes(0);
  };
  return { url, bytes, replace, clear };
}

async function renderDownload(
  cur: MX,
  draw: (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) => void,
  w: number,
  h: number,
  mime: string,
  quality: number | undefined,
  filename: string,
  replace: (b: Blob) => void,
): Promise<void> {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }
  draw(ctx, c);
  const blob = await canvasToBlob(c, mime, quality);
  replace(blob);
  downloadBlob(blob, filename);
}

function OutBlock({
  url, bytes, label, onNew,
}: {
  url: string; bytes: number; label: string; onNew: () => void;
}) {
  const [copied, copy] = useCopied();
  if (!url) return null;
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={formatBytes(bytes)} label="Result size" />
      </div>
      <PImg src={url} alt={label} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={() => copy(url)}>
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button type="button" variant="ghost" onClick={onNew}>New image</Button>
      </div>
      <Note>Your download has already started. Use “Copy link” only for temporary sharing on this device.</Note>
    </div>
  );
}

/* ================= generic converter (any → jpg/png/webp) ================= */

function ConvertTool({
  id, accept, acceptTypes, label, formats, def, qualityDef, note, fileNote,
}: {
  id: string;
  accept: string;
  acceptTypes: string[];
  label: string;
  formats: { mime: string; tag: string }[];
  def: string;
  qualityDef?: number;
  note?: string;
  fileNote?: string;
}) {
  const { cur, error, busy, pick, reset } = useMX();
  const [out, setOut] = useState(def);
  const [quality, setQuality] = useState(qualityDef ?? 90);
  const [bg, setBg] = useState("#ffffff");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();

  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      const q = out === "image/png" ? undefined : quality / 100;
      await renderDownload(
        cur,
        (ctx, c) => {
          if (out === "image/jpeg") {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, c.width, c.height);
          }
          ctx.drawImage(cur.img, 0, 0, c.width, c.height);
        },
        cur.w,
        cur.h,
        out,
        q,
        `${baseName(cur.name)}.${extForMime(out)}`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Conversion failed.");
    }
  };

  return (
    <div>
      <ImgBar busy={busy} accept={accept} onFile={(f) => void pick(f, acceptTypes)} id={id} label={label} />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`${id}-fmt`}>Output format</FieldLabel>
              <select
                id={`${id}-fmt`}
                value={out}
                onChange={(e) => setOut(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)"
              >
                {formats.map((f) => (
                  <option key={f.mime} value={f.mime}>{f.tag}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-q`}>Quality: {quality}%</FieldLabel>
              <input id={`${id}-q`} type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          </div>
          {out === "image/jpeg" && (
            <div className="mt-3">
              <FieldLabel htmlFor={`${id}-bg`}>Background for transparency</FieldLabel>
              <Input id={`${id}-bg`} type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-[44px] cursor-pointer p-1" />
            </div>
          )}
          {note && <Note>{note}</Note>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Convert &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          {fileNote && <p className="mt-2 text-sm text-(--muted)">{fileNote}</p>}
          <OutBlock url={res.url} bytes={res.bytes} label="Converted preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageConverterTool() {
  return (
    <ConvertTool
      id="mx-conv"
      accept={GIF_ACCEPT}
      acceptTypes={["image/gif"]}
      label="Choose an image (JPG, PNG, WebP or GIF · max 25 MB)"
      formats={[
        { mime: "image/jpeg", tag: "JPG" },
        { mime: "image/png", tag: "PNG" },
        { mime: "image/webp", tag: "WebP" },
      ]}
      def="image/jpeg"
      note="GIF and PNG transparency is flattened onto the background colour when exporting JPG."
    />
  );
}

export function WebpToJpgTool() {
  return (
    <ConvertTool
      id="mx-w2j"
      accept={STD_ACCEPT}
      acceptTypes={[]}
      label="Choose a WebP image (max 25 MB)"
      formats={[{ mime: "image/jpeg", tag: "JPG" }]}
      def="image/jpeg"
    />
  );
}

export function WebpToPngTool() {
  return (
    <ConvertTool
      id="mx-w2p"
      accept={STD_ACCEPT}
      acceptTypes={[]}
      label="Choose a WebP image (max 25 MB)"
      formats={[{ mime: "image/png", tag: "PNG (keeps transparency)" }]}
      def="image/png"
    />
  );
}

export function GifToJpgTool() {
  return (
    <ConvertTool
      id="mx-g2j"
      accept="image/gif"
      acceptTypes={["image/gif"]}
      label="Choose a GIF image (max 25 MB)"
      formats={[{ mime: "image/jpeg", tag: "JPG" }]}
      def="image/jpeg"
      note="Animated GIFs export the first frame as a still image."
    />
  );
}

export function GifToPngTool() {
  return (
    <ConvertTool
      id="mx-g2p"
      accept="image/gif"
      acceptTypes={["image/gif"]}
      label="Choose a GIF image (max 25 MB)"
      formats={[{ mime: "image/png", tag: "PNG (keeps transparency)" }]}
      def="image/png"
      note="Animated GIFs export the first frame as a still image."
    />
  );
}

/* ================= generic CSS-filter tool ================= */

function FilterTool({
  id, label, min, max, defV, unit, toFilter, note, pngOut,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  defV: number;
  unit: string;
  toFilter: (v: number) => string;
  note?: string;
  pngOut?: boolean;
}) {
  const { cur, error, busy, pick, reset } = useMX();
  const [v, setV] = useState(defV);
  const [out, setOut] = useState(pngOut ? "image/png" : "image/jpeg");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();

  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      await renderDownload(
        cur,
        (ctx, c) => {
          ctx.filter = toFilter(v);
          ctx.drawImage(cur.img, 0, 0, c.width, c.height);
          ctx.filter = "none";
        },
        cur.w,
        cur.h,
        out,
        out === "image/png" ? undefined : 0.92,
        `${baseName(cur.name)}-edited.${extForMime(out)}`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Processing failed.");
    }
  };

  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id={id} />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor={`${id}-v`}>{label}: {v}{unit}</FieldLabel>
              <input id={`${id}-v`} type="range" min={min} max={max} value={v} onChange={(e) => setV(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-fmt`}>Output format</FieldLabel>
              <select id={`${id}-fmt`} value={out} onChange={(e) => setOut(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
          </div>
          {note && <Note>{note}</Note>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Apply &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Edited preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageGrayscaleTool() {
  return <FilterTool id="mx-gray" label="Grayscale" min={0} max={100} defV={100} unit="%" toFilter={(v) => `grayscale(${v}%)`} />;
}

export function ImageBrightnessTool() {
  return <FilterTool id="mx-bri" label="Brightness" min={20} max={200} defV={120} unit="%" toFilter={(v) => `brightness(${v}%)`} note="100% keeps the original brightness." />;
}

export function ImageContrastTool() {
  return <FilterTool id="mx-con" label="Contrast" min={0} max={200} defV={130} unit="%" toFilter={(v) => `contrast(${v}%)`} note="100% keeps the original contrast." />;
}

export function ImageSaturationTool() {
  return <FilterTool id="mx-sat" label="Saturation" min={0} max={200} defV={140} unit="%" toFilter={(v) => `saturate(${v}%)`} note="100% keeps the original colours; 0% is fully muted." />;
}

export function ImageHueRotateTool() {
  return <FilterTool id="mx-hue" label="Hue shift" min={0} max={360} defV={90} unit="°" toFilter={(v) => `hue-rotate(${v}deg)`} />;
}

export function ImageInvertTool() {
  return <FilterTool id="mx-inv" label="Inversion" min={0} max={100} defV={100} unit="%" toFilter={(v) => `invert(${v}%)`} />;
}

export function ImageExposureTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [b, setB] = useState(115);
  const [c, setC] = useState(115);
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      await renderDownload(
        cur,
        (ctx, cc) => {
          ctx.filter = `brightness(${b}%) contrast(${c}%)`;
          ctx.drawImage(cur.img, 0, 0, cc.width, cc.height);
          ctx.filter = "none";
        },
        cur.w, cur.h, "image/jpeg", 0.92,
        `${baseName(cur.name)}-exposure.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-exp" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mx-exp-b">Brightness: {b}%</FieldLabel>
              <input id="mx-exp-b" type="range" min={20} max={200} value={b} onChange={(e) => setB(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
            <div>
              <FieldLabel htmlFor="mx-exp-c">Contrast: {c}%</FieldLabel>
              <input id="mx-exp-c" type="range" min={20} max={200} value={c} onChange={(e) => setC(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          </div>
          <Note>Exposure here means a combined brightness + contrast adjustment — two honest, clearly labelled sliders.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Apply &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Exposure preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageSharpenTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [strength, setStrength] = useState(50);
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      const k = strength / 100;
      const c = makeCanvas(cur.w, cur.h);
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.drawImage(cur.img, 0, 0, c.width, c.height);
      if (k > 0) {
        const src = ctx.getImageData(0, 0, c.width, c.height);
        const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
        const out = ctx.createImageData(c.width, c.height);
        const s = src.data;
        const d = out.data;
        const W = c.width;
        const H = c.height;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            for (let ch = 0; ch < 3; ch++) {
              let acc = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const px = Math.min(W - 1, Math.max(0, x + kx));
                  const py = Math.min(H - 1, Math.max(0, y + ky));
                  acc += s[(py * W + px) * 4 + ch]! * kernel[(ky + 1) * 3 + (kx + 1)]!;
                }
              }
              d[(y * W + x) * 4 + ch] = Math.max(0, Math.min(255, Math.round(acc)));
            }
            d[(y * W + x) * 4 + 3] = s[(y * W + x) * 4 + 3]!;
          }
        }
        ctx.putImageData(out, 0, 0);
      }
      const blob = await canvasToBlob(c, "image/jpeg", 0.92);
      res.replace(blob);
      downloadBlob(blob, `${baseName(cur.name)}-sharpened.jpg`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Sharpening failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-sharp" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4">
            <FieldLabel htmlFor="mx-sharp-s">Strength: {strength}%</FieldLabel>
            <input id="mx-sharp-s" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
          </div>
          <Note>A real 3×3 convolution kernel sharpens actual pixel detail — not a fake contrast boost.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Sharpen &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Sharpened preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImagePixelateTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [block, setBlock] = useState("16");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      const bs = Math.max(2, Number(block) || 16);
      const small = makeCanvas(Math.max(1, Math.round(cur.w / bs)), Math.max(1, Math.round(cur.h / bs)));
      const sctx = small.getContext("2d");
      if (!sctx) throw new Error("Canvas is not available in this browser.");
      sctx.drawImage(cur.img, 0, 0, small.width, small.height);
      const c = makeCanvas(cur.w, cur.h);
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, c.width, c.height);
      const blob = await canvasToBlob(c, "image/jpeg", 0.92);
      res.replace(blob);
      downloadBlob(blob, `${baseName(cur.name)}-pixelated.jpg`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Pixelation failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-pix" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4">
            <FieldLabel htmlFor="mx-pix-b">Block size</FieldLabel>
            <select id="mx-pix-b" value={block} onChange={(e) => setBlock(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
              {["4", "8", "12", "16", "24", "32", "48"].map((b) => (
                <option key={b} value={b}>{b} px blocks</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Pixelate &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Pixelated preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageRoundedCornersTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [radius, setRadius] = useState(60);
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      const r = Math.min(Math.min(cur.w, cur.h) / 2, radius);
      const c = makeCanvas(cur.w, cur.h);
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.arcTo(cur.w, 0, cur.w, cur.h, r);
      ctx.arcTo(cur.w, cur.h, 0, cur.h, r);
      ctx.arcTo(0, cur.h, 0, 0, r);
      ctx.arcTo(0, 0, cur.w, 0, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(cur.img, 0, 0, c.width, c.height);
      const blob = await canvasToBlob(c, "image/png");
      res.replace(blob);
      downloadBlob(blob, `${baseName(cur.name)}-rounded.png`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-round" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4">
            <FieldLabel htmlFor="mx-round-r">Corner radius: {radius} px</FieldLabel>
            <input id="mx-round-r" type="range" min={0} max={400} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
          </div>
          <Note>Exports as transparent PNG so the rounded shape sits cleanly on any background.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Round &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Rounded preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageBorderMakerTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [width, setWidth] = useState("24");
  const [color, setColor] = useState("#111111");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    const bw = Math.max(0, Math.min(200, Math.floor(Number(width) || 0)));
    try {
      await renderDownload(
        cur,
        (ctx, c) => {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(cur.img, bw, bw, cur.w, cur.h);
        },
        cur.w + bw * 2, cur.h + bw * 2, "image/jpeg", 0.92,
        `${baseName(cur.name)}-bordered.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-border" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mx-border-w">Border width (px)</FieldLabel>
              <Input id="mx-border-w" inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="mx-border-c">Border colour</FieldLabel>
              <Input id="mx-border-c" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[44px] cursor-pointer p-1" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Add border &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Bordered preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

const POSITIONS = [
  { v: "tl", l: "Top left" }, { v: "tc", l: "Top center" }, { v: "tr", l: "Top right" },
  { v: "ml", l: "Middle left" }, { v: "mc", l: "Center" }, { v: "mr", l: "Middle right" },
  { v: "bl", l: "Bottom left" }, { v: "bc", l: "Bottom center" }, { v: "br", l: "Bottom right" },
];

function posXY(p: string, w: number, h: number, pad: number): { x: number; y: number; align: CanvasTextAlign; base: CanvasTextBaseline } {
  const col = p[1];
  const row = p[0];
  return {
    x: col === "l" ? pad : col === "r" ? w - pad : w / 2,
    y: row === "t" ? pad : row === "b" ? h - pad : h / 2,
    align: col === "l" ? "left" : col === "r" ? "right" : "center",
    base: row === "t" ? "top" : row === "b" ? "bottom" : "middle",
  };
}

export function ImageWatermarkTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [text, setText] = useState("© My Studio");
  const [pos, setPos] = useState("br");
  const [opacity, setOpacity] = useState(60);
  const [size, setSize] = useState(36);
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    if (!text.trim()) {
      setRunError("Enter watermark text first.");
      return;
    }
    try {
      await renderDownload(
        cur,
        (ctx, c) => {
          ctx.drawImage(cur.img, 0, 0, c.width, c.height);
          const fs = Math.max(12, Math.round((size / 1000) * Math.max(c.width, c.height)));
          ctx.font = `600 ${fs}px system-ui, sans-serif`;
          const { x, y, align, base } = posXY(pos, c.width, c.height, fs * 0.6);
          ctx.textAlign = align;
          ctx.textBaseline = base;
          ctx.globalAlpha = Math.min(1, Math.max(0.05, opacity / 100));
          ctx.lineWidth = Math.max(1, fs / 12);
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.strokeText(text, x, y);
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.fillText(text, x, y);
          ctx.globalAlpha = 1;
        },
        cur.w, cur.h, "image/jpeg", 0.92,
        `${baseName(cur.name)}-watermarked.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Watermarking failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-wm" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mx-wm-t">Watermark text</FieldLabel>
              <Input id="mx-wm-t" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="mx-wm-p">Position</FieldLabel>
              <select id="mx-wm-p" value={pos} onChange={(e) => setPos(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
                {POSITIONS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="mx-wm-o">Opacity: {opacity}%</FieldLabel>
              <input id="mx-wm-o" type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
            <div>
              <FieldLabel htmlFor="mx-wm-s">Text size: {size}</FieldLabel>
              <input id="mx-wm-s" type="range" min={12} max={120} value={size} onChange={(e) => setSize(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Watermark &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Watermarked preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ImageTextOverlayTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [text, setText] = useState("Hello world");
  const [pos, setPos] = useState("bc");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(48);
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    if (!text.trim()) {
      setRunError("Enter overlay text first.");
      return;
    }
    try {
      await renderDownload(
        cur,
        (ctx, c) => {
          ctx.drawImage(cur.img, 0, 0, c.width, c.height);
          const fs = Math.max(12, Math.round((size / 1000) * Math.max(c.width, c.height)));
          ctx.font = `700 ${fs}px system-ui, sans-serif`;
          const { x, y, align, base } = posXY(pos, c.width, c.height, fs * 0.7);
          ctx.textAlign = align;
          ctx.textBaseline = base;
          ctx.lineWidth = Math.max(1, fs / 10);
          ctx.strokeStyle = "rgba(0,0,0,0.85)";
          ctx.strokeText(text, x, y);
          ctx.fillStyle = color;
          ctx.fillText(text, x, y);
        },
        cur.w, cur.h, "image/jpeg", 0.92,
        `${baseName(cur.name)}-captioned.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Overlay failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-txt" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mx-txt-t">Overlay text</FieldLabel>
              <Input id="mx-txt-t" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="mx-txt-p">Position</FieldLabel>
              <select id="mx-txt-p" value={pos} onChange={(e) => setPos(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
                <option value="tc">Top</option>
                <option value="mc">Center</option>
                <option value="bc">Bottom</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="mx-txt-c">Text colour</FieldLabel>
              <Input id="mx-txt-c" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[44px] cursor-pointer p-1" />
            </div>
            <div>
              <FieldLabel htmlFor="mx-txt-s">Font size: {size}</FieldLabel>
              <input id="mx-txt-s" type="range" min={16} max={160} value={size} onChange={(e) => setSize(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Add text &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Captioned preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

function drawMemeLine(ctx: CanvasRenderingContext2D, line: string, x: number, y: number, base: CanvasTextBaseline, maxW: number) {
  ctx.textAlign = "center";
  ctx.textBaseline = base;
  ctx.lineJoin = "round";
  const t = line.toUpperCase();
  ctx.strokeText(t, x, y, maxW);
  ctx.fillText(t, x, y, maxW);
}

export function MemeGeneratorTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [top, setTop] = useState("TOP TEXT");
  const [bottom, setBottom] = useState("BOTTOM TEXT");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      await renderDownload(
        cur,
        (ctx, c) => {
          ctx.drawImage(cur.img, 0, 0, c.width, c.height);
          const fs = Math.max(20, Math.round(c.width / 12));
          ctx.font = `900 ${fs}px Impact, Haettenschweiler, "Arial Black", sans-serif`;
          ctx.lineWidth = Math.max(2, fs / 10);
          ctx.strokeStyle = "black";
          ctx.fillStyle = "white";
          const pad = fs * 0.5;
          if (top.trim()) drawMemeLine(ctx, top, c.width / 2, pad, "top", c.width - pad * 2);
          if (bottom.trim()) drawMemeLine(ctx, bottom, c.width / 2, c.height - pad, "bottom", c.width - pad * 2);
        },
        cur.w, cur.h, "image/jpeg", 0.92,
        `${baseName(cur.name)}-meme.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Meme generation failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-meme" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mx-meme-t">Top text</FieldLabel>
              <Input id="mx-meme-t" value={top} onChange={(e) => setTop(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="mx-meme-b">Bottom text</FieldLabel>
              <Input id="mx-meme-b" value={bottom} onChange={(e) => setBottom(e.target.value)} />
            </div>
          </div>
          <Note>Classic Impact-style captions: bold white fill with black outline, baked into the pixels.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Make meme &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Meme preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

async function decodeMany(files: File[]): Promise<MX[]> {
  const out: MX[] = [];
  try {
    for (const f of files) {
      out.push(await decodeImg(f));
    }
    return out;
  } catch (e) {
    for (const m of out) URL.revokeObjectURL(m.url);
    throw e;
  }
}

export function ImageCollageMakerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const res = useResultUrl();
  const run = async () => {
    setError("");
    if (files.length < 2 || files.length > 4) {
      setError("Choose 2 to 4 images.");
      return;
    }
    setBusy(true);
    let loaded: MX[] = [];
    try {
      loaded = await decodeMany(files);
      const cols = files.length === 2 ? 2 : 2;
      const rows = files.length <= 2 ? 1 : 2;
      const cell = 800;
      const gap = 8;
      const c = makeCanvas(cols * cell + gap * (cols + 1), rows * cell + gap * (rows + 1));
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      loaded.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gap + col * (cell + gap);
        const y = gap + row * (cell + gap);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cell, cell);
        ctx.clip();
        const s = Math.max(cell / m.w, cell / m.h);
        const dw = m.w * s;
        const dh = m.h * s;
        ctx.drawImage(m.img, x + (cell - dw) / 2, y + (cell - dh) / 2, dw, dh);
        ctx.restore();
      });
      const blob = await canvasToBlob(c, "image/jpeg", 0.9);
      res.replace(blob);
      downloadBlob(blob, "collage.jpg");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collage failed.");
    } finally {
      for (const m of loaded) URL.revokeObjectURL(m.url);
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept={STD_ACCEPT} multiple maxMB={25} label="Choose 2–4 images" onFiles={setFiles} />
      {files.length > 0 && <p className="mt-2 text-sm text-(--muted)" role="status">{files.length} image(s) selected.</p>}
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Building…" : "Build collage & download"}</Button>
      </div>
      {res.url && <PImg src={res.url} alt="Collage preview" />}
      {res.url && <p className="mt-2 text-sm text-(--muted)">Result: {formatBytes(res.bytes)}. Your download has already started.</p>}
    </div>
  );
}

export function ContactSheetMakerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const res = useResultUrl();
  const run = async () => {
    setError("");
    if (files.length < 1 || files.length > 9) {
      setError("Choose 1 to 9 images.");
      return;
    }
    setBusy(true);
    let loaded: MX[] = [];
    try {
      loaded = await decodeMany(files);
      const cols = 3;
      const rows = Math.ceil(loaded.length / cols);
      const cellW = 400;
      const cellH = 300;
      const labelH = 30;
      const gap = 10;
      const c = makeCanvas(cols * cellW + gap * (cols + 1), rows * (cellH + labelH) + gap * (rows + 1));
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, 0, c.width, c.height);
      loaded.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gap + col * (cellW + gap);
        const y = gap + row * (cellH + labelH + gap);
        const s = Math.min(cellW / m.w, cellH / m.h);
        const dw = m.w * s;
        const dh = m.h * s;
        ctx.fillStyle = "#111827";
        ctx.fillRect(x, y, cellW, cellH);
        ctx.drawImage(m.img, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
        ctx.fillStyle = "#f9fafb";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const label = m.name.length > 42 ? `${m.name.slice(0, 39)}…` : m.name;
        ctx.fillText(label, x + 6, y + cellH + labelH / 2, cellW - 12);
      });
      const blob = await canvasToBlob(c, "image/jpeg", 0.88);
      res.replace(blob);
      downloadBlob(blob, "contact-sheet.jpg");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Contact sheet failed.");
    } finally {
      for (const m of loaded) URL.revokeObjectURL(m.url);
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept={STD_ACCEPT} multiple maxMB={25} label="Choose up to 9 images" onFiles={setFiles} />
      {files.length > 0 && <p className="mt-2 text-sm text-(--muted)" role="status">{files.length} image(s) selected.</p>}
      <Note>Unlike a plain collage, every photo here is captioned with its file name in a 3-column proof grid.</Note>
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Building…" : "Build contact sheet & download"}</Button>
      </div>
      {res.url && <PImg src={res.url} alt="Contact sheet preview" />}
      {res.url && <p className="mt-2 text-sm text-(--muted)">Result: {formatBytes(res.bytes)}. Your download has already started.</p>}
    </div>
  );
}

export function ImageDataUriGeneratorTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [uri, setUri] = useState("");
  const [copied, copy] = useCopied();
  const onPick = (f: File | null) => {
    setUri("");
    if (!f) return;
    if (f.size > MAX_BYTES) {
      void pick(f);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUri(String(reader.result ?? ""));
    reader.onerror = () => setUri("");
    reader.readAsDataURL(f);
    void pick(f);
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={onPick} id="mx-duri" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} extra={uri ? [{ label: "Encoded", value: formatBytes(uri.length) }] : []} />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => copy(uri)} disabled={!uri}>{copied ? "Copied!" : "Copy data URI"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile(`${baseName(cur.name)}.txt`, uri, "text/plain")} disabled={!uri}>Download .txt</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setUri(""); }}>New image</Button>
          </div>
          {uri && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-semibold">Data URI</span>
              <textarea value={uri} readOnly rows={6} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all" aria-live="polite" />
            </label>
          )}
        </>
      )}
    </div>
  );
}

function samplePixels(cur: MX, maxSide: number): { data: Uint8ClampedArray; n: number } {
  const s = Math.min(1, maxSide / Math.max(cur.w, cur.h));
  const c = makeCanvas(Math.max(1, Math.round(cur.w * s)), Math.max(1, Math.round(cur.h * s)));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(cur.img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  return { data: d, n: c.width * c.height };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const mx = Math.max(rn, gn, bn);
  const mn = Math.min(rn, gn, bn);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, Math.round(l * 100)];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = 0;
  if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function DominantColorFinderTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [found, setFound] = useState<{ hex: string; rgb: string; hsl: string } | null>(null);
  const [runError, setRunError] = useState("");
  const [copied, copy] = useCopied();
  const run = () => {
    if (!cur) return;
    setRunError("");
    try {
      const { data, n } = samplePixels(cur, 120);
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < n; i++) {
        r += data[i * 4]!;
        g += data[i * 4 + 1]!;
        b += data[i * 4 + 2]!;
      }
      const rr = Math.round(r / n);
      const gg = Math.round(g / n);
      const bb = Math.round(b / n);
      const [h, s, l] = toHsl(rr, gg, bb);
      setFound({ hex: toHex(rr, gg, bb), rgb: `rgb(${rr}, ${gg}, ${bb})`, hsl: `hsl(${h}, ${s}%, ${l}%)` });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Analysis failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => { setFound(null); void pick(f); }} id="mx-dom" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-3">
            <Button type="button" onClick={run}>Find dominant colour</Button>
          </div>
          <Err message={runError} />
          {found && (
            <div aria-live="polite" className="mt-4">
              <div className="h-24 w-full rounded-xl border border-(--border)" style={{ backgroundColor: found.hex }} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat value={found.hex} label="HEX" />
                <Stat value={found.rgb} label="RGB" />
                <Stat value={found.hsl} label="HSL" />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => copy(found.hex)}>{copied ? "Copied!" : "Copy HEX"}</Button>
                <Button type="button" variant="ghost" onClick={() => { reset(); setFound(null); }}>New image</Button>
              </div>
              <Note>True average of the decoded pixels — not a guess from the thumbnail.</Note>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PaletteExtractorTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [swatches, setSwatches] = useState<string[]>([]);
  const [runError, setRunError] = useState("");
  const [copied, copy] = useCopied();
  const run = () => {
    if (!cur) return;
    setRunError("");
    try {
      const { data, n } = samplePixels(cur, 120);
      const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
      for (let i = 0; i < n; i += 2) {
        const r = data[i * 4]!;
        const g = data[i * 4 + 1]!;
        const b = data[i * 4 + 2]!;
        const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
        const e = buckets.get(key);
        if (e) {
          e.r += r;
          e.g += g;
          e.b += b;
          e.n += 1;
        } else buckets.set(key, { r, g, b, n: 1 });
      }
      const top = [...buckets.values()].sort((a, b2) => b2.n - a.n).slice(0, 6);
      setSwatches(top.map((t) => toHex(t.r / t.n, t.g / t.n, t.b / t.n)));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Extraction failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => { setSwatches([]); void pick(f); }} id="mx-pal" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-3">
            <Button type="button" onClick={run}>Extract 6-colour palette</Button>
          </div>
          <Err message={runError} />
          {swatches.length > 0 && (
            <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {swatches.map((s) => (
                <button key={s} type="button" onClick={() => copy(s)} className="overflow-hidden rounded-xl border border-(--border) text-left" title={`Copy ${s}`}>
                  <span className="block h-16 w-full" style={{ backgroundColor: s }} />
                  <span className="block px-3 py-2 font-mono text-sm font-semibold">{copied ? "Copied!" : s}</span>
                </button>
              ))}
            </div>
          )}
          {swatches.length > 0 && (
            <div className="mt-3">
              <Button type="button" variant="ghost" onClick={() => { reset(); setSwatches([]); }}>New image</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

const COMMON_RATIOS: [number, string][] = [
  [16 / 9, "16:9 (widescreen)"],
  [9 / 16, "9:16 (vertical video)"],
  [4 / 3, "4:3 (classic)"],
  [3 / 2, "3:2 (photo)"],
  [1, "1:1 (square)"],
  [21 / 9, "21:9 (ultrawide)"],
  [3 / 4, "3:4 (portrait)"],
  [2 / 3, "2:3 (portrait photo)"],
  [7 / 9, "7:9 (passport 35×45)"],
];

export function AspectRatioTool() {
  return (
    <Calc
      button="Simplify ratio"
      fields={[
        { key: "w", label: "Width (px)", type: "number", required: true, def: "1920" },
        { key: "h", label: "Height (px)", type: "number", required: true, def: "1080" },
      ]}
      compute={(v) => {
        const w = Number((v.w ?? "").replace(/,/g, ""));
        const h = Number((v.h ?? "").replace(/,/g, ""));
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
          return { error: "Enter positive width and height values." };
        const g = gcd(w, h);
        const sw = Math.round(w / g);
        const sh = Math.round(h / g);
        const dec = w / h;
        const match = COMMON_RATIOS.find(([r]) => Math.abs(r - dec) / Math.max(r, dec) < 0.005);
        return {
          rows: [
            ["Simplified ratio", `${sw}:${sh}`],
            ["Decimal", String(Number(dec.toPrecision(6)))],
            ["Common name", match ? match[1] : "Custom ratio"],
            ["Orientation", w > h ? "Landscape" : w < h ? "Portrait" : "Square"],
          ],
        };
      }}
    />
  );
}

export function ImageDimensionsCheckerTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [meta, setMeta] = useState("");
  const onPick = async (f: File | null) => {
    setMeta("");
    if (!f) return;
    try {
      const buf = await f.slice(0, 64 * 1024).arrayBuffer();
      const m = parseImageMeta(buf, f.type || "image/jpeg");
      setMeta(`${m.format}${m.colorType ? ` · ${m.colorType}` : ""}${m.bitDepth ? ` · ${m.bitDepth}-bit` : ""}`);
    } catch {
      setMeta("");
    }
    void pick(f);
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void onPick(f)} id="mx-dim" />
      <Err message={error} />
      {cur && (
        <>
          <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={`${cur.w}×${cur.h}`} label="Pixels (W×H)" />
            <Stat value={`${((cur.w * cur.h) / 1e6).toFixed(2)} MP`} label="Megapixels" />
            <Stat value={formatBytes(cur.size)} label="File size" />
            <Stat value={meta || cur.mime.replace("image/", "").toUpperCase()} label="Format" />
          </div>
          <PImg src={cur.url} alt="Checked image" />
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={() => { reset(); setMeta(""); }}>New image</Button>
          </div>
        </>
      )}
    </div>
  );
}

export function ImageDpiCalculatorTool() {
  return (
    <Calc
      button="Calculate DPI"
      fields={[
        { key: "pw", label: "Pixel width", type: "number", required: true, def: "3000" },
        { key: "ph", label: "Pixel height", type: "number", required: true, def: "2000" },
        { key: "iw", label: "Print width (in)", type: "number", required: true, def: "10" },
        { key: "ih", label: "Print height (in)", type: "number", required: true, def: "8" },
      ]}
      compute={(v) => {
        const pw = Number(v.pw);
        const ph = Number(v.ph);
        const iw = Number(v.iw);
        const ih = Number(v.ih);
        if (![pw, ph, iw, ih].every((n) => Number.isFinite(n) && n > 0))
          return { error: "Enter positive numbers for all four fields." };
        const dx = pw / iw;
        const dy = ph / ih;
        const verdict = Math.min(dx, dy) >= 300 ? "Excellent print quality" : Math.min(dx, dy) >= 150 ? "Good print quality" : "May look soft in print";
        return {
          rows: [
            ["Horizontal DPI", dx.toFixed(1)],
            ["Vertical DPI", dy.toFixed(1)],
            ["Verdict", verdict],
          ],
          note: "300 DPI is the professional print standard; 150 DPI is fine for posters viewed at a distance.",
        };
      }}
    />
  );
}

export function FileSizeEstimatorTool() {
  return (
    <Calc
      button="Estimate size"
      fields={[
        { key: "w", label: "Width (px)", type: "number", required: true, def: "1920" },
        { key: "h", label: "Height (px)", type: "number", required: true, def: "1080" },
        {
          key: "bpp", label: "Bits per pixel", type: "select",
          options: [
            { value: "24", label: "24-bit true colour (RGB)" },
            { value: "32", label: "32-bit with alpha (RGBA)" },
            { value: "8", label: "8-bit (grayscale / indexed)" },
            { value: "1", label: "1-bit (mono)" },
          ],
        },
      ]}
      compute={(v) => {
        const w = Number(v.w);
        const h = Number(v.h);
        const bpp = Number(v.bpp ?? 24);
        if (![w, h].every((n) => Number.isFinite(n) && n > 0 && n <= 100000))
          return { error: "Enter realistic positive dimensions." };
        const bytes = Math.ceil((w * h * bpp) / 8);
        return {
          rows: [
            ["Raw size", formatBytes(bytes)],
            ["Exact bytes", bytes.toLocaleString()],
            ["Megapixels", `${((w * h) / 1e6).toFixed(2)} MP`],
          ],
          note: "Uncompressed bitmap size — real JPG/PNG files are much smaller thanks to compression.",
        };
      }}
    />
  );
}

async function renderSizes(cur: MX, sizes: number[], prefix: string): Promise<{ size: number; url: string; name: string }[]> {
  const out: { size: number; url: string; name: string }[] = [];
  for (const s of sizes) {
    const c = makeCanvas(s, s);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    drawCover(ctx, cur.img, cur.w, cur.h, 1, 0, 0);
    const blob = await canvasToBlob(c, "image/png");
    out.push({ size: s, url: URL.createObjectURL(blob), name: `${prefix}-${s}.png` });
  }
  return out;
}

export function FaviconGeneratorTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [icons, setIcons] = useState<{ size: number; url: string; name: string }[]>([]);
  const [runError, setRunError] = useState("");
  useEffect(() => () => {
    for (const i of icons) URL.revokeObjectURL(i.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icons]);
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      for (const i of icons) URL.revokeObjectURL(i.url);
      setIcons(await renderSizes(cur, [16, 32, 48, 180], "favicon"));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Generation failed.");
    }
  };
  const dl = async (icon: { url: string; name: string }) => {
    const blob = await (await fetch(icon.url)).blob();
    downloadBlob(blob, icon.name);
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => { for (const i of icons) URL.revokeObjectURL(i.url); setIcons([]); void pick(f); }} id="mx-fav" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <Note>Square logos work best — the image is centre cover-cropped to a square at each size.</Note>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Generate icon set</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
          <Err message={runError} />
          {icons.length > 0 && (
            <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {icons.map((icon) => (
                <div key={icon.size} className="rounded-xl border border-(--border) p-3 text-center">
                  <PImg src={icon.url} alt={`${icon.size}px favicon`} cls="mx-auto h-16 w-16 rounded-lg border border-(--border) object-contain" />
                  <p className="mt-2 text-sm font-bold">{icon.size}×{icon.size}</p>
                  <Button type="button" variant="secondary" onClick={() => void dl(icon)} className="mt-2">Download</Button>
                </div>
              ))}
            </div>
          )}
          {icons.length > 0 && <Note>Each size downloads individually — no zip needed.</Note>}
        </>
      )}
    </div>
  );
}

export function AppIconGeneratorTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [icons, setIcons] = useState<{ size: number; url: string; name: string }[]>([]);
  const [runError, setRunError] = useState("");
  useEffect(() => () => {
    for (const i of icons) URL.revokeObjectURL(i.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icons]);
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      for (const i of icons) URL.revokeObjectURL(i.url);
      setIcons(await renderSizes(cur, [192, 512], "icon"));
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Generation failed.");
    }
  };
  const dl = async (icon: { url: string; name: string }) => {
    const blob = await (await fetch(icon.url)).blob();
    downloadBlob(blob, icon.name);
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => { for (const i of icons) URL.revokeObjectURL(i.url); setIcons([]); void pick(f); }} id="mx-app" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <Note>Generates the 192 px and 512 px maskable-ready PNGs that installable web apps require.</Note>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Generate app icons</Button>
            <Button type="button" variant="ghost" onClick={reset}>New image</Button>
          </div>
          <Err message={runError} />
          {icons.length > 0 && (
            <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {icons.map((icon) => (
                <div key={icon.size} className="rounded-xl border border-(--border) p-3 text-center">
                  <PImg src={icon.url} alt={`${icon.size}px app icon`} cls="mx-auto h-24 w-24 rounded-2xl border border-(--border) object-contain" />
                  <p className="mt-2 text-sm font-bold">{icon.size}×{icon.size} PNG</p>
                  <Button type="button" variant="secondary" onClick={() => void dl(icon)} className="mt-2">Download</Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SOCIAL_PRESETS = [
  { v: "1200x630", l: "Open Graph 1200×630", w: 1200, h: 630 },
  { v: "1200x600", l: "Twitter card 1200×600", w: 1200, h: 600 },
  { v: "1080x1080", l: "Instagram square 1080×1080", w: 1080, h: 1080 },
];

export function SocialImageResizerTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [preset, setPreset] = useState("1200x630");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    const p = SOCIAL_PRESETS.find((x) => x.v === preset) ?? SOCIAL_PRESETS[0]!;
    try {
      await renderDownload(
        cur,
        (ctx) => drawCover(ctx, cur.img, cur.w, cur.h, 1, 0, 0),
        p.w, p.h, "image/jpeg", 0.9,
        `${baseName(cur.name)}-${p.v}.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Resize failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-soc" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4">
            <FieldLabel htmlFor="mx-soc-p">Preset</FieldLabel>
            <select id="mx-soc-p" value={preset} onChange={(e) => setPreset(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
              {SOCIAL_PRESETS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>
          <Note>Centre cover-crop — the image fills the frame with nothing stretched.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Resize &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Social size preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function PassportPhotoCropperTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    try {
      await renderDownload(
        cur,
        (ctx) => drawCover(ctx, cur.img, cur.w, cur.h, 1, 0, 0),
        413, 531, "image/jpeg", 0.92,
        `${baseName(cur.name)}-passport-35x45.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Crop failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-pass" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <Note>Centre-crops to the 35×45 mm (7:9) ratio and exports at 413×531 px — sharp enough for a 300 DPI print.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Crop &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Passport photo preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ProfilePictureMakerTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [size, setSize] = useState("512");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    const s = Number(size) || 512;
    try {
      const c = makeCanvas(s, s);
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, cur.img, cur.w, cur.h, 1, 0, 0);
      const blob = await canvasToBlob(c, "image/png");
      res.replace(blob);
      downloadBlob(blob, `${baseName(cur.name)}-avatar-${s}.png`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Avatar creation failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-prof" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4 flex items-center gap-4">
            <PImg src={cur.url} alt="Circle crop preview" cls="h-32 w-32 rounded-full border border-(--border) object-cover" />
            <div className="flex-1">
              <FieldLabel htmlFor="mx-prof-s">Export size</FieldLabel>
              <select id="mx-prof-s" value={size} onChange={(e) => setSize(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
                <option value="256">256×256</option>
                <option value="512">512×512</option>
              </select>
            </div>
          </div>
          <Note>The circle preview shows exactly what followers see; the PNG keeps transparent corners for any background.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Make avatar &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Avatar preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ThumbnailMakerTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [maxDim, setMaxDim] = useState("300");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    const m = Number(maxDim) || 300;
    try {
      const s = Math.min(1, m / Math.max(cur.w, cur.h));
      const w = Math.max(1, Math.round(cur.w * s));
      const h = Math.max(1, Math.round(cur.h * s));
      await renderDownload(
        cur,
        (ctx, c) => ctx.drawImage(cur.img, 0, 0, c.width, c.height),
        w, h, "image/jpeg", 0.88,
        `${baseName(cur.name)}-thumb-${w}x${h}.jpg`,
        res.replace,
      );
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Thumbnail failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-thumb" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <div className="mt-4">
            <FieldLabel htmlFor="mx-thumb-m">Max dimension</FieldLabel>
            <select id="mx-thumb-m" value={maxDim} onChange={(e) => setMaxDim(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
              <option value="150">150 px (tiny)</option>
              <option value="300">300 px (small)</option>
              <option value="640">640 px (medium)</option>
            </select>
          </div>
          <Note>Aspect ratio is always preserved — the longest side becomes the preset size.</Note>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Make thumbnail &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Thumbnail preview" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function ScreenshotCropperTool() {
  const { cur, error, busy, pick, reset } = useMX();
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [w, setW] = useState("800");
  const [h, setH] = useState("600");
  const [runError, setRunError] = useState("");
  const res = useResultUrl();
  const run = async () => {
    if (!cur) return;
    setRunError("");
    const cx = Math.max(0, Math.min(cur.w - 1, Math.floor(Number(x) || 0)));
    const cy = Math.max(0, Math.min(cur.h - 1, Math.floor(Number(y) || 0)));
    const cw = Math.max(1, Math.min(cur.w - cx, Math.floor(Number(w) || 0)));
    const ch = Math.max(1, Math.min(cur.h - cy, Math.floor(Number(h) || 0)));
    if (cw <= 0 || ch <= 0) {
      setRunError("That crop box falls outside the image. Adjust the values.");
      return;
    }
    try {
      const c = makeCanvas(cw, ch);
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.drawImage(cur.img, cx, cy, cw, ch, 0, 0, cw, ch);
      const blob = await canvasToBlob(c, "image/png");
      res.replace(blob);
      downloadBlob(blob, `${baseName(cur.name)}-crop-${cw}x${ch}.png`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Crop failed.");
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void pick(f)} id="mx-shot" />
      <Err message={error} />
      {cur && (
        <>
          <MxStats cur={cur} />
          <PImg src={cur.url} alt="Screenshot source" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[{ id: "mx-shot-x", l: "Left (x)", v: x, s: setX }, { id: "mx-shot-y", l: "Top (y)", v: y, s: setY }, { id: "mx-shot-w", l: "Width", v: w, s: setW }, { id: "mx-shot-h", l: "Height", v: h, s: setH }].map((f) => (
              <div key={f.id}>
                <FieldLabel htmlFor={f.id}>{f.l}</FieldLabel>
                <Input id={f.id} inputMode="numeric" value={f.v} onChange={(e) => f.s(e.target.value)} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-(--muted)">Values are clamped to the {cur.w}×{cur.h} image bounds.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()}>Crop region &amp; download</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); res.clear(); }}>New image</Button>
          </div>
          <Err message={runError} />
          <OutBlock url={res.url} bytes={res.bytes} label="Cropped region" onNew={() => { reset(); res.clear(); }} />
        </>
      )}
    </div>
  );
}

export function PhotoExifViewerTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const onPick = async (f: File | null) => {
    setError("");
    setRows(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const tags = readExif(new Uint8Array(buf));
      setName(f.name);
      setRows(tags.map((t) => [t.tag, t.value] as [string, string]));
    } catch {
      setError("Could not read that file.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <ImgBar busy={busy} accept={STD_ACCEPT} onFile={(f) => void onPick(f)} id="mx-exif" label="Choose a photo, ideally JPEG (max 25 MB)" />
      <Err message={error} />
      {rows !== null && rows.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold" role="status">{rows.length} EXIF tag(s) found in {name}</p>
          <RefTable columns={["Tag", "Value"]} rows={rows} />
        </div>
      )}
      {rows !== null && rows.length === 0 && (
        <div className="mt-4">
          <Note>No EXIF found in {name || "this file"} — it has no embedded camera metadata (common for PNGs, WebP and stripped photos).</Note>
        </div>
      )}
    </div>
  );
}

/* ================= SVG ================= */

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function assertSvg(text: string): string {
  const t = text.trim();
  if (!t) throw new Error("Paste SVG markup first.");
  if (t.length > 500_000) throw new Error("SVG is too large (max 500 KB of markup).");
  if (!/<svg[\s>]/i.test(t)) throw new Error("That does not look like SVG — markup must contain an <svg> element.");
  return t;
}

function prettySvg(src: string): string {
  const t = assertSvg(src);
  const tokens = t.replace(/>([\s\S]*?)</g, ">\n$1\n<").split("\n").map((s) => s.trim()).filter(Boolean);
  let depth = 0;
  const lines: string[] = [];
  for (const tok of tokens) {
    if (/^<\//.test(tok)) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${tok}`);
    if (/^<[^!?/][^>]*[^/]>$/.test(tok) && !/^<(path|circle|rect|line|polyline|polygon|ellipse|stop|use|image|br|hr|meta|link)[\s>/]/i.test(tok)) depth += 1;
  }
  return lines.join("\n");
}

function minifySvg(src: string): string {
  const t = assertSvg(src);
  return t
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*=\s*/g, "=")
    .trim();
}

function optimizeSvg(src: string): { output: string; stats: [string, string][] } {
  const before = assertSvg(src);
  let out = minifySvg(before);
  out = out.replace(/-?\d+\.\d+/g, (m) => {
    const n = Number(m);
    if (!Number.isFinite(n)) return m;
    const r = Math.round(n * 100) / 100;
    return String(r);
  });
  const saved = before.length - out.length;
  const pct = before.length > 0 ? (saved / before.length) * 100 : 0;
  return {
    output: out,
    stats: [
      ["Before", formatBytes(before.length)],
      ["After", formatBytes(out.length)],
      ["Saved", `${pct.toFixed(1)}%`],
    ],
  };
}

export function SvgViewerTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [uri, setUri] = useState("");
  const [dims, setDims] = useState("");
  const run = () => {
    setError("");
    setUri("");
    setDims("");
    try {
      const t = assertSvg(input);
      setUri(svgDataUri(t));
      const w = /width\s*=\s*"([^"]+)"/i.exec(t)?.[1] ?? "?";
      const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(t)?.[1] ?? "none";
      setDims(`width ${w} · viewBox ${vb}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid SVG.");
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-svgv">SVG markup</FieldLabel>
      <textarea id="mx-svgv" value={input} onChange={(e) => setInput(e.target.value)} rows={8} placeholder="<svg …>…</svg>" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
      <Err message={error} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Preview SVG</Button>
        <Button type="button" variant="secondary" onClick={() => { setInput(""); setUri(""); setDims(""); setError(""); }}>Clear</Button>
      </div>
      {uri && (
        <div aria-live="polite" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat value={dims || "—"} label="Detected size" />
            <Stat value={formatBytes(input.length)} label="Markup size" />
          </div>
          <div className="mt-3 rounded-xl border border-(--border) bg-white p-4">
            <PImg src={uri} alt="SVG preview" cls="max-h-80" />
          </div>
          <Note>Previewed through a sandboxed image element — scripts inside SVG can never execute.</Note>
        </div>
      )}
    </div>
  );
}

export function SvgFormatterTool() {
  return (
    <TextOp
      placeholder="<svg …>…</svg>"
      button="Format SVG"
      outLabel="Formatted SVG"
      fileName="formatted.svg"
      process={(t) => {
        try {
          return { output: prettySvg(t), stats: [["Lines", prettySvg(t).split("\n").length.toLocaleString()] as [string, string]] };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid SVG." };
        }
      }}
    />
  );
}

export function SvgMinifierTool() {
  return (
    <TextOp
      placeholder="<svg …>…</svg>"
      button="Minify SVG"
      outLabel="Minified SVG"
      fileName="minified.svg"
      process={(t) => {
        try {
          const out = minifySvg(t);
          const saved = t.length > 0 ? ((t.length - out.length) / t.length) * 100 : 0;
          return { output: out, stats: [["Before", formatBytes(t.length)], ["After", formatBytes(out.length)], ["Saved", `${saved.toFixed(1)}%`]] };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid SVG." };
        }
      }}
    />
  );
}

export function SvgOptimizerTool() {
  return (
    <TextOp
      placeholder="<svg …>…</svg>"
      button="Optimize SVG"
      outLabel="Optimized SVG"
      fileName="optimized.svg"
      process={(t) => {
        try {
          return optimizeSvg(t);
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid SVG." };
        }
      }}
    />
  );
}

export function SvgToDataUriTool() {
  return (
    <TextOp
      placeholder="<svg …>…</svg>"
      button="Encode to data URI"
      outLabel="Data URI"
      fileName="svg-data-uri.txt"
      process={(t) => {
        try {
          const clean = minifySvg(t);
          const uri = svgDataUri(clean);
          return { output: uri, stats: [["SVG", formatBytes(clean.length)], ["URI", formatBytes(uri.length)]] };
        } catch (e) {
          return { error: e instanceof Error ? e.message : "Invalid SVG." };
        }
      }}
    />
  );
}

export function DataUriToSvgTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [svg, setSvg] = useState("");
  const [uri, setUri] = useState("");
  const run = () => {
    setError("");
    setSvg("");
    setUri("");
    const raw = input.trim();
    if (!raw) {
      setError("Paste a data URI first.");
      return;
    }
    try {
      const m = /^data:image\/svg\+xml(;base64)?,([\s\S]*)$/i.exec(raw);
      if (!m) throw new Error("That is not an SVG data URI (expected data:image/svg+xml,…).");
      const decoded = m[1]
        ? (() => {
            const bin = atob(m[2]!.replace(/\s+/g, ""));
            const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
            return new TextDecoder().decode(bytes);
          })()
        : decodeURIComponent(m[2]!);
      const clean = assertSvg(decoded);
      setSvg(clean);
      setUri(svgDataUri(clean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decode that data URI.");
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-d2s">SVG data URI</FieldLabel>
      <textarea id="mx-d2s" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="data:image/svg+xml,…" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all" />
      <Err message={error} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Decode &amp; preview</Button>
        <Button type="button" variant="secondary" onClick={() => { setInput(""); setSvg(""); setUri(""); setError(""); }}>Clear</Button>
      </div>
      {svg && (
        <div aria-live="polite" className="mt-4">
          <div className="rounded-xl border border-(--border) bg-white p-4">
            <PImg src={uri} alt="Decoded SVG preview" cls="max-h-80" />
          </div>
          <FieldLabel htmlFor="mx-d2s-out">Decoded markup</FieldLabel>
          <textarea id="mx-d2s-out" value={svg} readOnly rows={8} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("decoded.svg", svg, "image/svg+xml")}>Download .svg</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SvgColorReplacerTool() {
  const [input, setInput] = useState("");
  const [find, setFind] = useState("#000000");
  const [replace, setReplace] = useState("#e11d48");
  const [error, setError] = useState("");
  const [out, setOut] = useState("");
  const [count, setCount] = useState(0);
  const [uri, setUri] = useState("");
  const run = () => {
    setError("");
    setOut("");
    setUri("");
    setCount(0);
    try {
      const t = assertSvg(input);
      if (!/^#[0-9a-f]{6}$/i.test(find.trim()) || !/^#[0-9a-f]{6}$/i.test(replace.trim()))
        throw new Error("Enter two valid 6-digit HEX colours.");
      const needle = find.trim().toLowerCase();
      const matches = t.toLowerCase().split(needle).length - 1;
      if (matches === 0) throw new Error(`Colour ${find} was not found in this SVG.`);
      const re = new RegExp(needle.replace("#", "#"), "gi");
      const next = t.replace(re, replace.trim());
      setOut(next);
      setCount(matches);
      setUri(svgDataUri(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Replace failed.");
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-scr">SVG markup</FieldLabel>
      <textarea id="mx-scr" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="<svg …>…</svg>" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="mx-scr-f">Find colour</FieldLabel>
          <Input id="mx-scr-f" type="color" value={/^#[0-9a-f]{6}$/i.test(find) ? find : "#000000"} onChange={(e) => setFind(e.target.value)} className="h-[44px] cursor-pointer p-1" />
        </div>
        <div>
          <FieldLabel htmlFor="mx-scr-r">Replace with</FieldLabel>
          <Input id="mx-scr-r" type="color" value={/^#[0-9a-f]{6}$/i.test(replace) ? replace : "#e11d48"} onChange={(e) => setReplace(e.target.value)} className="h-[44px] cursor-pointer p-1" />
        </div>
      </div>
      <Err message={error} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Replace colour</Button>
        <Button type="button" variant="secondary" onClick={() => { setInput(""); setOut(""); setUri(""); setError(""); }}>Clear</Button>
      </div>
      {out && (
        <div aria-live="polite" className="mt-4">
          <Stat value={String(count)} label="Replacements" />
          <div className="mt-3 rounded-xl border border-(--border) bg-white p-4">
            <PImg src={uri} alt="Recoloured SVG preview" cls="max-h-80" />
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("recoloured.svg", out, "image/svg+xml")}>Download .svg</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SvgDimensionExtractorTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const run = () => {
    setError("");
    setRows(null);
    try {
      const t = assertSvg(input);
      const width = /<svg[^>]*\swidth\s*=\s*"([^"]+)"/i.exec(t)?.[1] ?? "not set";
      const height = /<svg[^>]*\sheight\s*=\s*"([^"]+)"/i.exec(t)?.[1] ?? "not set";
      const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(t)?.[1] ?? "not set";
      let aspect = "—";
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite) && parts[2]! > 0 && parts[3]! > 0) {
        const g = gcd(parts[2]!, parts[3]!);
        aspect = `${Math.round(parts[2]! / g)}:${Math.round(parts[3]! / g)} (${(parts[2]! / parts[3]!).toFixed(3)})`;
      }
      setRows([["Width", width], ["Height", height], ["viewBox", vb], ["Aspect ratio", aspect]]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid SVG.");
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-sdim">SVG markup</FieldLabel>
      <textarea id="mx-sdim" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="<svg …>…</svg>" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={run}>Extract dimensions</Button>
      </div>
      {rows && (
        <div className="mt-4">
          <RefTable columns={["Property", "Value"]} rows={rows} />
        </div>
      )}
    </div>
  );
}

export function SvgPathViewerTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [total, setTotal] = useState(0);
  const run = () => {
    setError("");
    setRows(null);
    try {
      const t = assertSvg(input);
      const matches = [...t.matchAll(/<path[^>]*\sd\s*=\s*"([^"]*)"/gi)];
      if (matches.length === 0) throw new Error("No <path> elements with a d attribute were found.");
      setTotal(matches.length);
      setRows(matches.slice(0, 50).map((m, i) => [`Path ${i + 1}`, `${(m[1] ?? "").length} chars`] as [string, string]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid SVG.");
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-spath">SVG markup</FieldLabel>
      <textarea id="mx-spath" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="<svg …>…</svg>" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={run}>List paths</Button>
      </div>
      {rows && (
        <div className="mt-4">
          <Stat value={String(total)} label="Path count" />
          <div className="mt-3">
            <RefTable columns={["Path", "Data length"]} rows={rows} />
          </div>
          {total > 50 && <Note>Showing the first 50 of {total} paths.</Note>}
        </div>
      )}
    </div>
  );
}

export function SvgToPngTool() {
  const [input, setInput] = useState("");
  const [scale, setScale] = useState("2");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const res = useResultUrl();
  const run = async () => {
    setError("");
    setBusy(true);
    try {
      const t = assertSvg(input);
      const s = Math.max(1, Math.min(4, Number(scale) || 1));
      const uri = svgDataUri(t);
      const img = await new Promise<HTMLImageElement>((ok, fail) => {
        const el = new Image();
        el.onload = () => ok(el);
        el.onerror = () => fail(new Error("Could not rasterize that SVG."));
        el.src = uri;
      });
      const w = img.naturalWidth || 512;
      const h = img.naturalHeight || 512;
      if (w * h * s * s > MAX_MP) throw new Error("Rendered output would exceed 25 megapixels. Choose a smaller scale.");
      const c = makeCanvas(Math.round(w * s), Math.round(h * s));
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await canvasToBlob(c, "image/png");
      res.replace(blob);
      downloadBlob(blob, `vector-${c.width}x${c.height}.png`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasterization failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-s2p">SVG markup</FieldLabel>
      <textarea id="mx-s2p" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="<svg …>…</svg>" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" />
      <div className="mt-3">
        <FieldLabel htmlFor="mx-s2p-s">Render scale</FieldLabel>
        <select id="mx-s2p-s" value={scale} onChange={(e) => setScale(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
          <option value="1">1× (native size)</option>
          <option value="2">2× (retina)</option>
          <option value="4">4× (print)</option>
        </select>
      </div>
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Rendering…" : "Render PNG & download"}</Button>
      </div>
      {res.url && (
        <div aria-live="polite" className="mt-4">
          <PImg src={res.url} alt="Rasterized SVG" />
          <p className="mt-2 text-sm text-(--muted)">Result: {formatBytes(res.bytes)}. Your download has already started.</p>
        </div>
      )}
    </div>
  );
}

/* ================= COLOR ================= */

function hx2rgb(h: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(h.trim());
  if (!m) return null;
  let s = m[1]!;
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.min(1, Math.max(0, s / 100));
  const ll = Math.min(1, Math.max(0, l / 100));
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return [v, v, v];
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const f = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [Math.round(f(hh + 1 / 3) * 255), Math.round(f(hh) * 255), Math.round(f(hh - 1 / 3) * 255)];
}

function rgb2cmyk(r: number, g: number, b: number): [number, number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return [0, 0, 0, 100];
  const c = ((1 - rn - k) / (1 - k)) * 100;
  const m = ((1 - gn - k) / (1 - k)) * 100;
  const y = ((1 - bn - k) / (1 - k)) * 100;
  return [Math.round(c), Math.round(m), Math.round(y), Math.round(k * 100)];
}

function cmyk2rgb(c: number, m: number, y: number, k: number): [number, number, number] {
  const cc = c / 100;
  const mm = m / 100;
  const yy = y / 100;
  const kk = k / 100;
  return [
    Math.round(255 * (1 - cc) * (1 - kk)),
    Math.round(255 * (1 - mm) * (1 - kk)),
    Math.round(255 * (1 - yy) * (1 - kk)),
  ];
}

function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const mx = Math.max(rn, gn, bn);
  const mn = Math.min(rn, gn, bn);
  const d = mx - mn;
  let h = 0;
  if (d !== 0) {
    if (mx === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (mx === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round((mx === 0 ? 0 : d / mx) * 100), Math.round(mx * 100)];
}

function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 60;
  const ss = Math.min(1, Math.max(0, s / 100));
  const vv = Math.min(1, Math.max(0, v / 100));
  const c = vv * ss;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = vv - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function relLum(r: number, g: number, b: number): number {
  const f = (v: number): number => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function shiftHue(hex: string, deg: number): string {
  const rgb = hx2rgb(hex);
  if (!rgb) return hex;
  const [h, s, l] = toHsl(rgb[0], rgb[1], rgb[2]);
  const [r, g, b] = hsl2rgb(h + deg, s, l);
  return toHex(r, g, b);
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, copy] = useCopied();
  return (
    <Button type="button" variant="secondary" onClick={() => copy(text)}>
      {copied ? "Copied!" : (label ?? "Copy")}
    </Button>
  );
}

function SwatchRow({ colors }: { colors: { hex: string; label?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-live="polite">
      {colors.map((c) => (
        <Swatch key={`${c.hex}-${c.label ?? ""}`} hex={c.hex} label={c.label} />
      ))}
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label?: string }) {
  const [copied, copy] = useCopied();
  return (
    <button type="button" onClick={() => copy(hex)} className="overflow-hidden rounded-xl border border-(--border) text-left" title={`Copy ${hex}`}>
      <span className="block h-16 w-full" style={{ backgroundColor: hex }} />
      <span className="block px-3 py-2">
        <span className="block font-mono text-sm font-bold">{copied ? "Copied!" : hex}</span>
        {label && <span className="block text-xs text-(--muted)">{label}</span>}
      </span>
    </button>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-[44px] w-16 shrink-0 cursor-pointer p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} hex value`} className="font-mono" />
      </div>
    </div>
  );
}

export function ColorPickerProTool() {
  const [color, setColor] = useState("#6366f1");
  const rgb = hx2rgb(color) ?? [99, 102, 241];
  const [h, s, l] = toHsl(rgb[0], rgb[1], rgb[2]);
  const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const hslStr = `hsl(${h}, ${s}%, ${l}%)`;
  return (
    <div>
      <ColorField id="mx-cpp" label="Pick a colour" value={color} onChange={setColor} />
      <div className="mt-4 h-28 w-full rounded-2xl border border-(--border)" style={{ backgroundColor: color }} aria-live="polite" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat value={color.toUpperCase()} label="HEX" />
        <Stat value={rgbStr} label="RGB" />
        <Stat value={hslStr} label="HSL" />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <CopyBtn text={color} label="Copy HEX" />
        <CopyBtn text={rgbStr} label="Copy RGB" />
        <CopyBtn text={hslStr} label="Copy HSL" />
      </div>
    </div>
  );
}

export function HexToRgbTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "hex", label: "HEX colour (#rrggbb)", type: "text", def: "#6366f1", required: true }]}
      compute={(v) => {
        const rgb = hx2rgb(v.hex ?? "");
        if (!rgb) return { error: "Enter a valid 3- or 6-digit HEX colour, e.g. #6366f1." };
        return { rows: [["Red", String(rgb[0])], ["Green", String(rgb[1])], ["Blue", String(rgb[2])], ["CSS", `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`]] };
      }}
    />
  );
}

export function RgbToHexTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "r", label: "Red (0–255)", type: "number", def: "99", required: true },
        { key: "g", label: "Green (0–255)", type: "number", def: "102", required: true },
        { key: "b", label: "Blue (0–255)", type: "number", def: "241", required: true },
      ]}
      compute={(v) => {
        const r = Number(v.r);
        const g = Number(v.g);
        const b = Number(v.b);
        if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255))
          return { error: "Each channel must be a number from 0 to 255." };
        return { rows: [["HEX", toHex(r, g, b).toUpperCase()], ["CSS", toHex(r, g, b)]] };
      }}
    />
  );
}

export function HexToHslTool() {
  return (
    <Calc
      button="Convert"
      fields={[{ key: "hex", label: "HEX colour (#rrggbb)", type: "text", def: "#6366f1", required: true }]}
      compute={(v) => {
        const rgb = hx2rgb(v.hex ?? "");
        if (!rgb) return { error: "Enter a valid 3- or 6-digit HEX colour, e.g. #6366f1." };
        const [h, s, l] = toHsl(rgb[0], rgb[1], rgb[2]);
        return { rows: [["Hue", `${h}°`], ["Saturation", `${s}%`], ["Lightness", `${l}%`], ["CSS", `hsl(${h}, ${s}%, ${l}%)`]] };
      }}
    />
  );
}

export function HslToHexTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "h", label: "Hue (0–360)", type: "number", def: "239", required: true },
        { key: "s", label: "Saturation (0–100)", type: "number", def: "84", required: true },
        { key: "l", label: "Lightness (0–100)", type: "number", def: "67", required: true },
      ]}
      compute={(v) => {
        const h = Number(v.h);
        const s = Number(v.s);
        const l = Number(v.l);
        if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l) || s < 0 || s > 100 || l < 0 || l > 100)
          return { error: "Hue can be any number; saturation and lightness must be 0–100." };
        const [r, g, b] = hsl2rgb(h, s, l);
        return { rows: [["HEX", toHex(r, g, b).toUpperCase()], ["RGB", `rgb(${r}, ${g}, ${b})`]] };
      }}
    />
  );
}

export function RgbToHslTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "r", label: "Red (0–255)", type: "number", def: "99", required: true },
        { key: "g", label: "Green (0–255)", type: "number", def: "102", required: true },
        { key: "b", label: "Blue (0–255)", type: "number", def: "241", required: true },
      ]}
      compute={(v) => {
        const r = Number(v.r);
        const g = Number(v.g);
        const b = Number(v.b);
        if (![r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255))
          return { error: "Each channel must be a number from 0 to 255." };
        const [h, s, l] = toHsl(r, g, b);
        return { rows: [["Hue", `${h}°`], ["Saturation", `${s}%`], ["Lightness", `${l}%`]] };
      }}
    />
  );
}

export function HslToRgbTool() {
  return (
    <Calc
      button="Convert"
      fields={[
        { key: "h", label: "Hue (0–360)", type: "number", def: "239", required: true },
        { key: "s", label: "Saturation (0–100)", type: "number", def: "84", required: true },
        { key: "l", label: "Lightness (0–100)", type: "number", def: "67", required: true },
      ]}
      compute={(v) => {
        const h = Number(v.h);
        const s = Number(v.s);
        const l = Number(v.l);
        if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l) || s < 0 || s > 100 || l < 0 || l > 100)
          return { error: "Hue can be any number; saturation and lightness must be 0–100." };
        const [r, g, b] = hsl2rgb(h, s, l);
        return { rows: [["Red", String(r)], ["Green", String(g)], ["Blue", String(b)], ["HEX", toHex(r, g, b).toUpperCase()]] };
      }}
    />
  );
}

export function CmykConverterTool() {
  const [dir, setDir] = useState("to-cmyk");
  const [rgb, setRgb] = useState<[string, string, string]>(["99", "102", "241"]);
  const [cmyk, setCmyk] = useState<[string, string, string, string]>(["59", "58", "0", "5"]);
  if (dir === "to-cmyk") {
    const r = Number(rgb[0]);
    const g = Number(rgb[1]);
    const b = Number(rgb[2]);
    const ok = [r, g, b].every((n) => Number.isFinite(n) && n >= 0 && n <= 255);
    const [c, m, y, k] = ok ? rgb2cmyk(r, g, b) : [0, 0, 0, 0];
    const hex = ok ? toHex(r, g, b) : "#000000";
    return (
      <div>
        <div className="mb-4">
          <FieldLabel htmlFor="mx-cmyk-d">Direction</FieldLabel>
          <select id="mx-cmyk-d" value={dir} onChange={(e) => setDir(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            <option value="to-cmyk">RGB → CMYK</option>
            <option value="to-rgb">CMYK → RGB</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["Red", "Green", "Blue"] as const).map((l, i) => (
            <div key={l}>
              <FieldLabel htmlFor={`mx-cmyk-${i}`}>{l} (0–255)</FieldLabel>
              <Input id={`mx-cmyk-${i}`} inputMode="numeric" value={rgb[i]!} onChange={(e) => setRgb((p) => { const n: [string, string, string] = [...p]; n[i] = e.target.value as string; return n; })} />
            </div>
          ))}
        </div>
        {!ok && <Err message="Each RGB channel must be 0–255." />}
        {ok && (
          <div aria-live="polite" className="mt-4">
            <div className="h-16 w-full rounded-xl border border-(--border)" style={{ backgroundColor: hex }} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={`${c}%`} label="Cyan" />
              <Stat value={`${m}%`} label="Magenta" />
              <Stat value={`${y}%`} label="Yellow" />
              <Stat value={`${k}%`} label="Black" />
            </div>
            <div className="mt-3"><CopyBtn text={`cmyk(${c}%, ${m}%, ${y}%, ${k}%)`} label="Copy CMYK" /></div>
          </div>
        )}
      </div>
    );
  }
  const c = Number(cmyk[0]);
  const m = Number(cmyk[1]);
  const y = Number(cmyk[2]);
  const k = Number(cmyk[3]);
  const ok = [c, m, y, k].every((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  const [r, g, b] = ok ? cmyk2rgb(c, m, y, k) : [0, 0, 0];
  const hex = ok ? toHex(r, g, b) : "#000000";
  return (
    <div>
      <div className="mb-4">
        <FieldLabel htmlFor="mx-cmyk-d2">Direction</FieldLabel>
        <select id="mx-cmyk-d2" value={dir} onChange={(e) => setDir(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
          <option value="to-cmyk">RGB → CMYK</option>
          <option value="to-rgb">CMYK → RGB</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["Cyan", "Magenta", "Yellow", "Black"] as const).map((l, i) => (
          <div key={l}>
            <FieldLabel htmlFor={`mx-cmyk2-${i}`}>{l} (0–100)</FieldLabel>
            <Input id={`mx-cmyk2-${i}`} inputMode="numeric" value={cmyk[i]!} onChange={(e) => setCmyk((p) => { const n: [string, string, string, string] = [...p]; n[i] = e.target.value as string; return n; })} />
          </div>
        ))}
      </div>
      {!ok && <Err message="Each CMYK value must be 0–100." />}
      {ok && (
        <div aria-live="polite" className="mt-4">
          <div className="h-16 w-full rounded-xl border border-(--border)" style={{ backgroundColor: hex }} />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat value={`rgb(${r}, ${g}, ${b})`} label="RGB" />
            <Stat value={hex.toUpperCase()} label="HEX" />
          </div>
          <div className="mt-3"><CopyBtn text={hex} label="Copy HEX" /></div>
        </div>
      )}
    </div>
  );
}

export function HsvConverterTool() {
  const [dir, setDir] = useState("to-hsv");
  const [hex, setHex] = useState("#6366f1");
  const [hsv, setHsv] = useState<[string, string, string]>(["239", "59", "95"]);
  return (
    <div>
      <div className="mb-4">
        <FieldLabel htmlFor="mx-hsv-d">Direction</FieldLabel>
        <select id="mx-hsv-d" value={dir} onChange={(e) => setDir(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
          <option value="to-hsv">HEX/RGB → HSV</option>
          <option value="to-rgb">HSV → HEX/RGB</option>
        </select>
      </div>
      {dir === "to-hsv" ? (
        <>
          <ColorField id="mx-hsv-c" label="Colour" value={hex} onChange={setHex} />
          {(() => {
            const rgb = hx2rgb(hex);
            if (!rgb) return <Err message="Enter a valid HEX colour." />;
            const [h, s, v] = rgb2hsv(rgb[0], rgb[1], rgb[2]);
            return (
              <div aria-live="polite" className="mt-4">
                <div className="h-16 w-full rounded-xl border border-(--border)" style={{ backgroundColor: toHex(rgb[0], rgb[1], rgb[2]) }} />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat value={`${h}°`} label="Hue" />
                  <Stat value={`${s}%`} label="Saturation" />
                  <Stat value={`${v}%`} label="Value" />
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["Hue (0–360)", "Saturation (0–100)", "Value (0–100)"] as const).map((l, i) => (
              <div key={l}>
                <FieldLabel htmlFor={`mx-hsv-${i}`}>{l}</FieldLabel>
                <Input id={`mx-hsv-${i}`} inputMode="numeric" value={hsv[i]!} onChange={(e) => setHsv((p) => { const n: [string, string, string] = [...p]; n[i] = e.target.value as string; return n; })} />
              </div>
            ))}
          </div>
          {(() => {
            const h = Number(hsv[0]);
            const s = Number(hsv[1]);
            const v = Number(hsv[2]);
            if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(v) || s < 0 || s > 100 || v < 0 || v > 100)
              return <Err message="Hue can be any number; saturation and value must be 0–100." />;
            const [r, g, b] = hsv2rgb(h, s, v);
            const hx = toHex(r, g, b);
            return (
              <div aria-live="polite" className="mt-4">
                <div className="h-16 w-full rounded-xl border border-(--border)" style={{ backgroundColor: hx }} />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat value={`rgb(${r}, ${g}, ${b})`} label="RGB" />
                  <Stat value={hx.toUpperCase()} label="HEX" />
                </div>
                <div className="mt-3"><CopyBtn text={hx} label="Copy HEX" /></div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

export function ColorContrastCheckerTool() {
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const f = hx2rgb(fg) ?? [17, 17, 17];
  const b = hx2rgb(bg) ?? [255, 255, 255];
  const ratio = (Math.max(relLum(f[0], f[1], f[2]), relLum(b[0], b[1], b[2])) + 0.05) / (Math.min(relLum(f[0], f[1], f[2]), relLum(b[0], b[1], b[2])) + 0.05);
  const aa = ratio >= 4.5 ? "Pass" : "Fail";
  const aaLarge = ratio >= 3 ? "Pass" : "Fail";
  const aaa = ratio >= 7 ? "Pass" : "Fail";
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField id="mx-cc-f" label="Text colour" value={fg} onChange={setFg} />
        <ColorField id="mx-cc-b" label="Background colour" value={bg} onChange={setBg} />
      </div>
      <div className="mt-4 rounded-2xl border border-(--border) p-5 text-center" style={{ backgroundColor: bg }} aria-live="polite">
        <p className="text-2xl font-extrabold" style={{ color: fg }}>The quick brown fox</p>
        <p className="mt-1 text-sm font-semibold" style={{ color: fg }}>Live preview at {ratio.toFixed(2)}:1</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={`${ratio.toFixed(2)}:1`} label="Contrast ratio" />
        <Stat value={aa} label="AA normal (4.5)" />
        <Stat value={aaLarge} label="AA large (3.0)" />
        <Stat value={aaa} label="AAA (7.0)" />
      </div>
      <Note>Real WCAG 2 relative-luminance math — the same formula auditors use.</Note>
    </div>
  );
}

export function ColorPaletteGeneratorTool() {
  const [seed, setSeed] = useState("#6366f1");
  const [mode, setMode] = useState("analogous");
  const valid = hx2rgb(seed) !== null;
  const colors = valid
    ? mode === "analogous"
      ? [shiftHue(seed, -30), seed.toLowerCase(), shiftHue(seed, 30)].map((hex, i) => ({ hex, label: ["Warm", "Seed", "Cool"][i]! }))
      : mode === "complementary"
        ? [{ hex: seed.toLowerCase(), label: "Seed" }, { hex: shiftHue(seed, 180), label: "Complement" }]
        : [{ hex: seed.toLowerCase(), label: "Seed" }, { hex: shiftHue(seed, 120), label: "+120°" }, { hex: shiftHue(seed, 240), label: "+240°" }]
    : [];
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField id="mx-pg-s" label="Seed colour" value={seed} onChange={setSeed} />
        <div>
          <FieldLabel htmlFor="mx-pg-m">Harmony</FieldLabel>
          <select id="mx-pg-m" value={mode} onChange={(e) => setMode(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            <option value="analogous">Analogous (±30°)</option>
            <option value="complementary">Complementary (180°)</option>
            <option value="triadic">Triadic (120°)</option>
          </select>
        </div>
      </div>
      {!valid && <Err message="Enter a valid HEX colour." />}
      {valid && (
        <div className="mt-4">
          <SwatchRow colors={colors} />
        </div>
      )}
    </div>
  );
}

export function GradientGeneratorTool() {
  return (
    <Gen
      button="Build gradient"
      fileName="gradient.css"
      mime="text/css"
      outLabel="CSS gradient"
      fields={[
        { key: "a", label: "First colour", type: "color", def: "#6366f1" },
        { key: "b", label: "Second colour", type: "color", def: "#ec4899" },
        { key: "angle", label: "Angle (degrees)", type: "number", def: "135" },
      ]}
      generate={(v) => {
        if (!hx2rgb(v.a ?? "") || !hx2rgb(v.b ?? "")) return { error: "Pick two valid colours." };
        const ang = Number(v.angle ?? 135);
        if (!Number.isFinite(ang)) return { error: "Enter a valid angle." };
        return `background: linear-gradient(${ang}deg, ${v.a}, ${v.b});`;
      }}
    />
  );
}

function LivePreview({ css, children }: { css: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-(--surface-2) p-8 text-center" aria-live="polite">
      <div style={css} className="mx-auto inline-block">{children}</div>
    </div>
  );
}

export function CssShadowGeneratorTool() {
  const [x, setX] = useState("0");
  const [y, setY] = useState("12");
  const [blur, setBlur] = useState("28");
  const [spread, setSpread] = useState("0");
  const [color, setColor] = useState("#11111155");
  const css = `box-shadow: ${Number(x) || 0}px ${Number(y) || 0}px ${Math.max(0, Number(blur) || 0)}px ${Number(spread) || 0}px ${color};`;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["X offset", x, setX, "mx-sh-x"], ["Y offset", y, setY, "mx-sh-y"], ["Blur", blur, setBlur, "mx-sh-b"], ["Spread", spread, setSpread, "mx-sh-s"]].map(([l, v, s, id]) => (
          <div key={id as string}>
            <FieldLabel htmlFor={id as string}>{l as string} (px)</FieldLabel>
            <Input id={id as string} inputMode="numeric" value={v as string} onChange={(e) => (s as (v: string) => void)(e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ColorField id="mx-sh-c" label="Shadow colour" value={color} onChange={setColor} />
      </div>
      <div className="mt-4">
        <LivePreview css={{ boxShadow: `${Number(x) || 0}px ${Number(y) || 0}px ${Math.max(0, Number(blur) || 0)}px ${Number(spread) || 0}px ${color}`, backgroundColor: "#fff", borderRadius: 16, padding: "28px 44px", fontWeight: 800 }}>Preview</LivePreview>
      </div>
      <p className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
      <div className="mt-3"><CopyBtn text={css} label="Copy CSS" /></div>
    </div>
  );
}

export function CssBorderGeneratorTool() {
  const [w, setW] = useState("3");
  const [style, setStyle] = useState("solid");
  const [color, setColor] = useState("#6366f1");
  const [radius, setRadius] = useState("12");
  const css = `border: ${Math.max(0, Number(w) || 0)}px ${style} ${color}; border-radius: ${Math.max(0, Number(radius) || 0)}px;`;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="mx-bd-w">Width (px)</FieldLabel>
          <Input id="mx-bd-w" inputMode="numeric" value={w} onChange={(e) => setW(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="mx-bd-s">Style</FieldLabel>
          <select id="mx-bd-s" value={style} onChange={(e) => setStyle(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            {["solid", "dashed", "dotted", "double", "groove"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ColorField id="mx-bd-c" label="Border colour" value={color} onChange={setColor} />
        <div>
          <FieldLabel htmlFor="mx-bd-r">Radius (px)</FieldLabel>
          <Input id="mx-bd-r" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <LivePreview css={{ border: `${Math.max(0, Number(w) || 0)}px ${style} ${/^#[0-9a-f]{6}$/i.test(color) ? color : "#6366f1"}`, borderRadius: Math.max(0, Number(radius) || 0), padding: "24px 48px", fontWeight: 700 }}>Bordered box</LivePreview>
      </div>
      <p className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
      <div className="mt-3"><CopyBtn text={css} label="Copy CSS" /></div>
    </div>
  );
}

export function CssRadiusGeneratorTool() {
  const [tl, setTl] = useState("24");
  const [tr, setTr] = useState("8");
  const [br, setBr] = useState("24");
  const [bl, setBl] = useState("8");
  const css = `border-radius: ${[tl, tr, br, bl].map((v) => `${Math.max(0, Number(v) || 0)}px`).join(" ")};`;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["Top left", tl, setTl, "mx-r-tl"], ["Top right", tr, setTr, "mx-r-tr"], ["Bottom right", br, setBr, "mx-r-br"], ["Bottom left", bl, setBl, "mx-r-bl"]].map(([l, v, s, id]) => (
          <div key={id as string}>
            <FieldLabel htmlFor={id as string}>{l as string}: {v as string}px</FieldLabel>
            <input id={id as string} type="range" min={0} max={120} value={Number(v) || 0} onChange={(e) => (s as (v: string) => void)(e.target.value)} className="min-h-[44px] w-full accent-brand-600" />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <LivePreview css={{ borderRadius: `${[tl, tr, br, bl].map((v) => `${Math.max(0, Number(v) || 0)}px`).join(" ")}`, backgroundColor: "#6366f1", color: "#fff", padding: "28px 48px", fontWeight: 800 }}>Morph me</LivePreview>
      </div>
      <p className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
      <div className="mt-3"><CopyBtn text={css} label="Copy CSS" /></div>
    </div>
  );
}

export function CssTransformGeneratorTool() {
  const [rot, setRot] = useState("12");
  const [sx, setSx] = useState("1.1");
  const [sy, setSy] = useState("1.1");
  const [tx, setTx] = useState("8");
  const [ty, setTy] = useState("-6");
  const css = `transform: rotate(${Number(rot) || 0}deg) scale(${Number(sx) || 1}, ${Number(sy) || 1}) translate(${Number(tx) || 0}px, ${Number(ty) || 0}px);`;
  const live = `rotate(${Number(rot) || 0}deg) scale(${Number(sx) || 1}, ${Number(sy) || 1}) translate(${Number(tx) || 0}px, ${Number(ty) || 0}px)`;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[["Rotate (deg)", rot, setRot, "mx-t-r"], ["Scale X", sx, setSx, "mx-t-sx"], ["Scale Y", sy, setSy, "mx-t-sy"], ["Translate X (px)", tx, setTx, "mx-t-tx"], ["Translate Y (px)", ty, setTy, "mx-t-ty"]].map(([l, v, s, id]) => (
          <div key={id as string}>
            <FieldLabel htmlFor={id as string}>{l as string}</FieldLabel>
            <Input id={id as string} inputMode="decimal" value={v as string} onChange={(e) => (s as (v: string) => void)(e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <LivePreview css={{ transform: live, backgroundColor: "#10b981", color: "#fff", borderRadius: 12, padding: "24px 44px", fontWeight: 800 }}>Transform me</LivePreview>
      </div>
      <p className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
      <div className="mt-3"><CopyBtn text={css} label="Copy CSS" /></div>
    </div>
  );
}

export function CssAnimationGeneratorTool() {
  return (
    <Gen
      button="Build animation"
      fileName="animation.css"
      mime="text/css"
      outLabel="CSS animation"
      fields={[
        {
          key: "kind", label: "Preset", type: "select",
          options: [
            { value: "fade", label: "Fade in" },
            { value: "slide", label: "Slide up" },
            { value: "bounce", label: "Bounce" },
          ],
        },
        { key: "dur", label: "Duration (seconds)", type: "number", def: "1.2" },
      ]}
      generate={(v) => {
        const dur = Number(v.dur ?? 1.2);
        if (!Number.isFinite(dur) || dur <= 0 || dur > 60) return { error: "Enter a duration between 0.1 and 60 seconds." };
        const kind = v.kind ?? "fade";
        const frames =
          kind === "fade"
            ? `@keyframes toolora-fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}`
            : kind === "slide"
              ? `@keyframes toolora-slide {\n  from { opacity: 0; transform: translateY(24px); }\n  to { opacity: 1; transform: translateY(0); }\n}`
              : `@keyframes toolora-bounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-18px); }\n}`;
        return `${frames}\n\n.animated {\n  animation: toolora-${kind} ${dur}s ease-in-out infinite;\n}`;
      }}
    />
  );
}

export function CssButtonGeneratorTool() {
  const [pad, setPad] = useState("14");
  const [radius, setRadius] = useState("12");
  const [bgc, setBgc] = useState("#6366f1");
  const [fgc, setFgc] = useState("#ffffff");
  const [fs, setFs] = useState("16");
  const css = `.btn {\n  padding: ${Math.max(0, Number(pad) || 0)}px 28px;\n  border-radius: ${Math.max(0, Number(radius) || 0)}px;\n  background: ${bgc};\n  color: ${fgc};\n  font-size: ${Math.max(8, Number(fs) || 16)}px;\n  font-weight: 700;\n  border: none;\n  cursor: pointer;\n}\n\n.btn:hover {\n  filter: brightness(1.1);\n}`;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="mx-btn-p">Padding (px)</FieldLabel>
          <Input id="mx-btn-p" inputMode="numeric" value={pad} onChange={(e) => setPad(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="mx-btn-r">Radius (px)</FieldLabel>
          <Input id="mx-btn-r" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="mx-btn-f">Font size (px)</FieldLabel>
          <Input id="mx-btn-f" inputMode="numeric" value={fs} onChange={(e) => setFs(e.target.value)} />
        </div>
        <ColorField id="mx-btn-b" label="Background" value={bgc} onChange={setBgc} />
        <ColorField id="mx-btn-t" label="Text colour" value={fgc} onChange={setFgc} />
      </div>
      <div className="mt-4 rounded-2xl border border-(--border) bg-(--surface-2) p-8 text-center" aria-live="polite">
        <button
          type="button"
          style={{
            padding: `${Math.max(0, Number(pad) || 0)}px 28px`,
            borderRadius: Math.max(0, Number(radius) || 0),
            background: /^#[0-9a-f]{6}$/i.test(bgc) ? bgc : "#6366f1",
            color: /^#[0-9a-f]{6}$/i.test(fgc) ? fgc : "#ffffff",
            fontSize: Math.max(8, Number(fs) || 16),
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Get started
        </button>
      </div>
      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <CopyBtn text={css} label="Copy CSS" />
        <Button type="button" variant="secondary" onClick={() => downloadTextFile("button.css", css, "text/css")}>Download .css</Button>
      </div>
    </div>
  );
}

export function TextGradientGeneratorTool() {
  const [a, setA] = useState("#6366f1");
  const [b, setB] = useState("#ec4899");
  const [angle, setAngle] = useState("90");
  const ok = hx2rgb(a) !== null && hx2rgb(b) !== null;
  const ang = Number(angle);
  const css = `background: linear-gradient(${Number.isFinite(ang) ? ang : 90}deg, ${a}, ${b});\n-webkit-background-clip: text;\nbackground-clip: text;\ncolor: transparent;`;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ColorField id="mx-tg-a" label="First colour" value={a} onChange={setA} />
        <ColorField id="mx-tg-b" label="Second colour" value={b} onChange={setB} />
        <div>
          <FieldLabel htmlFor="mx-tg-g">Angle (degrees)</FieldLabel>
          <Input id="mx-tg-g" inputMode="numeric" value={angle} onChange={(e) => setAngle(e.target.value)} />
        </div>
      </div>
      {!ok && <Err message="Pick two valid colours." />}
      {ok && (
        <>
          <div className="mt-4 rounded-2xl border border-(--border) bg-(--surface-2) p-8 text-center" aria-live="polite">
            <span
              className="text-4xl font-black tracking-tight"
              style={{ background: `linear-gradient(${Number.isFinite(ang) ? ang : 90}deg, ${a}, ${b})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              Gradient headline
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap rounded-xl bg-(--surface-2) px-4 py-3 font-mono text-sm" aria-live="polite">{css}</p>
          <div className="mt-3"><CopyBtn text={css} label="Copy CSS" /></div>
        </>
      )}
    </div>
  );
}

export function ColorMixerTool() {
  const [a, setA] = useState("#6366f1");
  const [b, setB] = useState("#ec4899");
  const [w, setW] = useState(50);
  const ra = hx2rgb(a);
  const rb = hx2rgb(b);
  const ok = ra !== null && rb !== null;
  const t = w / 100;
  const mixed = ok
    ? toHex(ra![0] * (1 - t) + rb![0] * t, ra![1] * (1 - t) + rb![1] * t, ra![2] * (1 - t) + rb![2] * t)
    : "#000000";
  const [mh, ms, ml] = ok ? toHsl(...hx2rgb(mixed)! as [number, number, number]) : [0, 0, 0];
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ColorField id="mx-mx-a" label="First colour" value={a} onChange={setA} />
        <ColorField id="mx-mx-b" label="Second colour" value={b} onChange={setB} />
      </div>
      <div className="mt-4">
        <FieldLabel htmlFor="mx-mx-w">Mix: {100 - w}% first / {w}% second</FieldLabel>
        <input id="mx-mx-w" type="range" min={0} max={100} value={w} onChange={(e) => setW(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
      </div>
      {!ok && <Err message="Enter two valid HEX colours." />}
      {ok && (
        <div aria-live="polite" className="mt-4">
          <div className="h-20 w-full rounded-xl border border-(--border)" style={{ backgroundColor: mixed }} />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat value={mixed.toUpperCase()} label="Mixed HEX" />
            <Stat value={`rgb(${hx2rgb(mixed)![0]}, ${hx2rgb(mixed)![1]}, ${hx2rgb(mixed)![2]})`} label="Mixed RGB" />
            <Stat value={`hsl(${mh}, ${ms}%, ${ml}%)`} label="Mixed HSL" />
          </div>
          <div className="mt-3"><CopyBtn text={mixed} label="Copy mixed HEX" /></div>
        </div>
      )}
    </div>
  );
}

/* ================= ARCHIVE ================= */

async function readBytes(f: File): Promise<Uint8Array> {
  return new Uint8Array(await f.arrayBuffer());
}

export function GzipCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<[string, string][] | null>(null);
  const run = async () => {
    setError("");
    setStats(null);
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File is too large (max 50 MB).");
      return;
    }
    setBusy(true);
    try {
      const { bytes, base64 } = await gzipText(await file.text().catch(async () => {
        const b = await readBytes(file);
        return new TextDecoder("latin1").decode(b);
      }));
      void base64;
      const blob = new Blob([bytes as BlobPart], { type: "application/gzip" });
      downloadBlob(blob, `${file.name}.gz`);
      const ratio = file.size > 0 ? ((bytes.length / file.size) * 100).toFixed(1) : "0";
      setStats([["Original", formatBytes(file.size)], ["Compressed", formatBytes(bytes.length)], ["Ratio", `${ratio}%`]]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept="*/*" maxMB={50} label="Choose any file" onFiles={(fs) => { setFile(fs[0] ?? null); setStats(null); }} />
      {file && <p className="mt-2 text-sm text-(--muted)" role="status">{file.name} · {formatBytes(file.size)}</p>}
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Compressing…" : "Compress to .gz & download"}</Button>
      </div>
      {stats && (
        <div aria-live="polite" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
        </div>
      )}
      {stats && <Note>Your .gz download has already started — real gzip encoding, done locally.</Note>}
    </div>
  );
}

export function GzipDecompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const run = async () => {
    setError("");
    setPreview("");
    if (!file) {
      setError("Choose a .gz file first.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await readBytes(file);
      const text = await gunzipText(bytes);
      setPreview(text.slice(0, 4000));
      downloadBlob(new Blob([text], { type: "text/plain" }), file.name.replace(/\.gz$/i, "") || "decompressed.txt");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decompress that file.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept=".gz,.gzip,application/gzip" maxMB={50} label="Choose a .gz file" onFiles={(fs) => { setFile(fs[0] ?? null); setPreview(""); }} />
      {file && <p className="mt-2 text-sm text-(--muted)" role="status">{file.name} · {formatBytes(file.size)}</p>}
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Decompressing…" : "Decompress & download"}</Button>
      </div>
      {preview && (
        <div className="mt-4">
          <FieldLabel htmlFor="mx-gzd-p">Text preview (first 4,000 chars)</FieldLabel>
          <textarea id="mx-gzd-p" value={preview} readOnly rows={8} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs" aria-live="polite" />
          <Note>Your restored file has already downloaded.</Note>
        </div>
      )}
    </div>
  );
}

export function ZipCreatorTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const run = async () => {
    setError("");
    setDone("");
    if (files.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    if (files.length > 100) {
      setError("Too many files (max 100).");
      return;
    }
    setBusy(true);
    try {
      const payload: { name: string; data: Uint8Array }[] = [];
      for (const f of files) {
        if (f.size > 100 * 1024 * 1024) throw new Error(`“${f.name}” exceeds the 100 MB per-file limit.`);
        payload.push({ name: f.name || "file", data: await readBytes(f) });
      }
      const zip = await zipCreate(payload);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), "toolora-archive.zip");
      setDone(`Packed ${payload.length} file(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ZIP creation failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept="*/*" multiple maxMB={100} label="Choose files to zip" onFiles={setFiles} />
      {files.length > 0 && <p className="mt-2 text-sm text-(--muted)" role="status">{files.length} file(s) selected.</p>}
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Packing…" : "Create .zip & download"}</Button>
      </div>
      {done && <Note>{done} Your download has already started — a genuine deflated archive.</Note>}
    </div>
  );
}

export function ZipExtractorTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [blobs, setBlobs] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => () => {
    for (const b of blobs) URL.revokeObjectURL(b.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobs]);
  const onPick = async (f: File | null) => {
    setError("");
    setRows(null);
    for (const b of blobs) URL.revokeObjectURL(b.url);
    setBlobs([]);
    if (!f) return;
    if (!/\.zip$/i.test(f.name) && f.type !== "application/zip") {
      setError("Choose a .zip file.");
      return;
    }
    setBusy(true);
    try {
      const entries = await zipExtract(await readBytes(f));
      if (entries.length === 0) throw new Error("Archive contains no files.");
      setRows(entries.map((e) => [e.name, `${formatBytes(e.size)} · ${e.method}`] as [string, string]));
      setBlobs(entries.map((e) => {
        const blob = new Blob([e.data as BlobPart]);
        return { name: e.name.split("/").pop() || "file", url: URL.createObjectURL(blob) };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that archive.");
    } finally {
      setBusy(false);
    }
  };
  const dl = async (b: { name: string; url: string }) => {
    const blob = await (await fetch(b.url)).blob();
    downloadBlob(blob, b.name);
  };
  return (
    <div>
      <FilePick accept=".zip,application/zip" maxMB={100} label="Choose a .zip file" onFiles={(fs) => void onPick(fs[0] ?? null)} />
      <Err message={error} />
      {busy && <Note>Extracting…</Note>}
      {rows && (
        <div className="mt-4">
          <RefTable columns={["Entry", "Size · method"]} rows={rows} />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {blobs.map((b) => (
              <Button key={b.url} type="button" variant="secondary" onClick={() => void dl(b)}>Download {b.name}</Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TextCompressorTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ b64: string; stats: [string, string][] } | null>(null);
  const [copied, copy] = useCopied();
  const run = async () => {
    setError("");
    setOut(null);
    if (!input.trim()) {
      setError("Enter some text first.");
      return;
    }
    if (input.length > 1_000_000) {
      setError("Text is too large (max 1,000,000 chars).");
      return;
    }
    setBusy(true);
    try {
      const { bytes, base64 } = await gzipText(input);
      const saved = input.length > 0 ? (((input.length - bytes.length) / input.length) * 100).toFixed(1) : "0";
      setOut({ b64: base64, stats: [["Original", formatBytes(new TextEncoder().encode(input).length)], ["Compressed", formatBytes(bytes.length)], ["Saved", `${saved}%`]] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-tc">Text to compress</FieldLabel>
      <textarea id="mx-tc" value={input} onChange={(e) => setInput(e.target.value)} rows={6} placeholder="Paste or type text…" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-[15px]" />
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Compressing…" : "Compress to base64"}</Button>
      </div>
      {out && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {out.stats.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
          </div>
          <FieldLabel htmlFor="mx-tc-o">Compressed base64</FieldLabel>
          <textarea id="mx-tc-o" value={out.b64} readOnly rows={5} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all" aria-live="polite" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => copy(out.b64)}>{copied ? "Copied!" : "Copy"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("compressed.txt", out.b64, "text/plain")}>Download .txt</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TextDecompressorTool() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const [copied, copy] = useCopied();
  const run = async () => {
    setError("");
    setOut("");
    if (!input.trim()) {
      setError("Paste a gzipped base64 string first.");
      return;
    }
    setBusy(true);
    try {
      setOut(await gunzipText(input.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decompress that string.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FieldLabel htmlFor="mx-td">Gzipped base64</FieldLabel>
      <textarea id="mx-td" value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder="H4sIAAAA…" className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 font-mono text-xs break-all" />
      <Err message={error} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={busy}>{busy ? "Decompressing…" : "Decompress"}</Button>
      </div>
      {out && (
        <div className="mt-4">
          <FieldLabel htmlFor="mx-td-o">Restored text</FieldLabel>
          <textarea id="mx-td-o" value={out} readOnly rows={8} className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-[15px]" aria-live="polite" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => void copyText(out).then((ok) => { if (ok) copy(out); })}>{copied ? "Copied!" : "Copy"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadTextFile("restored.txt", out, "text/plain")}>Download .txt</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FileCompressionCalculatorTool() {
  return (
    <Calc
      button="Calculate savings"
      fields={[
        { key: "orig", label: "Original size (KB)", type: "number", required: true, def: "5000" },
        { key: "comp", label: "Compressed size (KB)", type: "number", required: true, def: "1200" },
      ]}
      compute={(v) => {
        const orig = Number(v.orig);
        const comp = Number(v.comp);
        if (!Number.isFinite(orig) || !Number.isFinite(comp) || orig <= 0 || comp < 0)
          return { error: "Enter a positive original size and a non-negative compressed size." };
        if (comp > orig) return { error: "Compressed size is larger than the original — nothing was saved." };
        const ratio = orig / Math.max(comp, 0.000001);
        const saved = ((orig - comp) / orig) * 100;
        return {
          rows: [
            ["Compression ratio", `${ratio.toFixed(2)}:1`],
            ["Space saved", `${saved.toFixed(1)}%`],
            ["Bytes reclaimed", formatBytes((orig - comp) * 1024)],
          ],
        };
      }}
    />
  );
}

export function ArchiveInspectorTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [summary, setSummary] = useState<[string, string][]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const onPick = async (f: File | null) => {
    setError("");
    setRows(null);
    setSummary([]);
    if (!f) return;
    setBusy(true);
    try {
      const entries = await zipExtract(await readBytes(f));
      if (entries.length === 0) throw new Error("Archive contains no files.");
      const total = entries.reduce((n, e) => n + e.size, 0);
      const packed = entries.reduce((n, e) => n + e.compressedSize, 0);
      setRows(entries.map((e) => [e.name, `${formatBytes(e.size)} → ${formatBytes(e.compressedSize)} · ${e.method}`] as [string, string]));
      setSummary([["Entries", String(entries.length)], ["Total size", formatBytes(total)], ["Packed size", formatBytes(packed)]]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that archive.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <FilePick accept=".zip,application/zip" maxMB={100} label="Choose a .zip file" onFiles={(fs) => void onPick(fs[0] ?? null)} />
      <Err message={error} />
      {busy && <Note>Inspecting…</Note>}
      {rows && (
        <div className="mt-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
          </div>
          <RefTable columns={["Entry", "Unpacked → packed · method"]} rows={rows} />
          <Note>Read-only inspection — nothing is extracted or modified.</Note>
        </div>
      )}
    </div>
  );
}

function applyRename(name: string, mode: string, prefix: string, suffix: string, find: string, repl: string, index: number): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  if (mode === "prefix") return `${prefix}${stem}${ext}`;
  if (mode === "suffix") return `${stem}${suffix}${ext}`;
  if (mode === "replace") {
    if (!find) return name;
    return `${stem.split(find).join(repl)}${ext}`;
  }
  return `${stem}-${index + 1}${ext}`;
}

export function FilenameBatchRenamerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState("prefix");
  const [prefix, setPrefix] = useState("photo-");
  const [suffix, setSuffix] = useState("-final");
  const [find, setFind] = useState(" ");
  const [repl, setRepl] = useState("-");
  const [error, setError] = useState("");
  const renamed = files.map((f, i) => ({ from: f.name, to: applyRename(f.name, mode, prefix, suffix, find, repl, i) }));
  const dupes = new Set(renamed.map((r) => r.to));
  const run = async (f: File, to: string) => {
    setError("");
    try {
      const buf = await f.arrayBuffer();
      downloadBlob(new Blob([buf]), to || f.name);
    } catch {
      setError(`Could not download “${f.name}”.`);
    }
  };
  return (
    <div>
      <FilePick accept="*/*" multiple maxMB={100} label="Choose files to rename" onFiles={setFiles} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="mx-rn-m">Rule</FieldLabel>
          <select id="mx-rn-m" value={mode} onChange={(e) => setMode(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            <option value="prefix">Add prefix</option>
            <option value="suffix">Add suffix</option>
            <option value="replace">Find &amp; replace</option>
            <option value="number">Number sequence</option>
          </select>
        </div>
        {mode === "prefix" && (
          <div>
            <FieldLabel htmlFor="mx-rn-p">Prefix</FieldLabel>
            <Input id="mx-rn-p" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
        )}
        {mode === "suffix" && (
          <div>
            <FieldLabel htmlFor="mx-rn-s">Suffix</FieldLabel>
            <Input id="mx-rn-s" value={suffix} onChange={(e) => setSuffix(e.target.value)} />
          </div>
        )}
        {mode === "replace" && (
          <>
            <div>
              <FieldLabel htmlFor="mx-rn-f">Find</FieldLabel>
              <Input id="mx-rn-f" value={find} onChange={(e) => setFind(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="mx-rn-r">Replace with</FieldLabel>
              <Input id="mx-rn-r" value={repl} onChange={(e) => setRepl(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <Note>Browsers cannot rename files in place — each renamed file downloads as an individual copy.</Note>
      <Err message={error} />
      {files.length > 0 && (
        <div className="mt-4">
          {dupes.size < renamed.length && <Err message="Two files would get the same name — adjust your rule." />}
          <RefTable columns={["Original", "New name"]} rows={renamed.map((r) => [r.from, r.to])} />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((f, i) => (
              <Button key={`${f.name}-${i}`} type="button" variant="secondary" onClick={() => void run(f, renamed[i]?.to ?? f.name)}>
                Download {renamed[i]?.to ?? f.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
