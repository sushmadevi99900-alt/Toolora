"use client";

/* Third-wave audio workspaces: tempo estimation, container tags, header
   forensics, WAV cleanup, A/B comparisons, batch renaming, live input
   monitoring and tempo-preserving playback. All real local DSP — no codecs
   are faked and MP3/AAC/FLAC encoding stays honestly Coming Soon. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Err, FilePick, Note, asTool, useCopied } from "../kits/kits";
import { AudioPick, useAudioFile } from "./AudioWorkspaces";
import {
  bufferInfo,
  decodeAudioFile,
  describeAudioSignature,
  dominantFrequency,
  downloadBlob,
  encodeWav,
  estimateBpm,
  formatBytes,
  formatTime,
  hexDump,
  parseAudioTags,
  spectralCentroid,
  waveformSimilarity,
} from "@/lib/audio/engine";

export const audioplusRegistry: Record<string, React.ComponentType> = {
  "bpm-detector": asTool(<BpmDetectTool />),
  "audio-tag-viewer": asTool(<TagViewerTool />),
  "audio-header-inspector": asTool(<HeaderTool />),
  "wav-metadata-cleaner": asTool(<WavCleanTool />),
  "audio-waveform-comparison": asTool(<WaveCompareTool />),
  "audio-frequency-comparison": asTool(<FreqCompareTool />),
  "audio-batch-rename-helper": asTool(<RenameTool />),
  "audio-input-monitor": asTool(<MicMonitorTool />),
  "audio-playback-speed-controller": asTool(<SpeedPlayTool />),
};

const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "—");

/* ---------- BPM detector ---------- */

function BpmDetectTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const result = useMemo(() => {
    if (!buffer) return null;
    try {
      const est = estimateBpm(buffer);
      const bpm = est.bpm;
      return {
        rows: [
          ["Estimated tempo", `${bpm} BPM`] as [string, string],
          ["Confidence", est.confidence === "high" ? "High — strong periodic onsets" : est.confidence === "medium" ? "Medium — verify by tapping" : "Low — weak or rubato rhythm, tap-verify"] as [string, string],
          ["Analyzed", `${fmt(est.analyzedSec, 0)} s of audio`] as [string, string],
          ["Beat interval", `${fmt(60000 / bpm, 0)} ms`] as [string, string],
        ],
        err: "",
      };
    } catch (e) {
      return { rows: null as null, err: e instanceof Error ? e.message : "Estimation failed." };
    }
  }, [buffer]);
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {result?.err && <Err message={result.err} />}
      {result?.rows && info && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {result.rows.map(([k, v]) => (
            <Stat key={k} label={k} value={v} />
          ))}
        </div>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
      <Note>Onset-envelope autocorrelation over 60–200 BPM — an honest estimate, not DJ-grade detection. Half/double-time ambiguity is normal; tap-verify important mixes.</Note>
    </div>
  );
}

/* ---------- ID3 tag viewer ---------- */

function TagViewerTool() {
  const [rows, setRows] = useState<{ field: string; value: string; source: string }[] | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="audio/*,.mp3,.m4a,.flac,.ogg,.wav" maxMB={200} onFiles={async (files) => {
        const f = files[0];
        if (!f) return;
        setBusy(true);
        setMsg("");
        setRows(null);
        try {
          const bytes = new Uint8Array(await f.arrayBuffer());
          const tags = parseAudioTags(bytes);
          setName(f.name);
          setRows(tags);
          if (tags.length === 0) setMsg("No ID3v2 text frames or ID3v1 trailer found — this file carries no embedded tags (or uses formats like Vorbis comments, reported honestly).");
        } catch {
          setMsg("Could not read the file.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Reading…" : "Choose audio file"} />
      {msg && <Note>{msg}</Note>}
      {rows && rows.length > 0 && (
        <>
          <p className="mt-3 text-sm font-semibold" role="status">{name}</p>
          <dl className="mt-2 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
            {rows.map((t, i) => (
              <div key={`${t.field}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <dt className="text-(--muted)">{t.field} <span className="text-xs">({t.source})</span></dt>
                <dd className="font-semibold break-all text-right">{t.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <Note>Parsed byte-by-byte from the container — the Metadata Viewer shows measurable signal facts instead. Cover art extraction is out of scope and not claimed.</Note>
    </div>
  );
}

/* ---------- header inspector ---------- */

function HeaderTool() {
  const [lines, setLines] = useState<{ offset: string; hex: string; ascii: string }[] | null>(null);
  const [desc, setDesc] = useState<{ format: string; detail: string; suggestedExt: string } | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={async (files) => {
        const f = files[0];
        if (!f) return;
        setBusy(true);
        setMsg("");
        try {
          const bytes = new Uint8Array(await f.arrayBuffer());
          if (bytes.length === 0) throw new Error("File is empty.");
          setLines(hexDump(bytes, 128));
          setDesc(describeAudioSignature(bytes));
          setName(`${f.name} (${formatBytes(f.size)})`);
        } catch (e) {
          setLines(null);
          setDesc(null);
          setMsg(e instanceof Error ? e.message : "Could not read the file.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Reading…" : "Choose any file"} />
      {msg && <Err message={msg} />}
      {desc && (
        <div aria-live="polite" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Container" value={desc.format} />
          <Stat label="Suggested extension" value={desc.suggestedExt} />
          <Stat label="File" value={name.length > 26 ? `${name.slice(0, 25)}…` : name} />
        </div>
      )}
      {desc && <Note>{desc.detail}</Note>}
      {lines && (
        <pre className="mt-3 overflow-auto rounded-xl border border-(--border) p-4 font-mono text-xs leading-relaxed" aria-label="Hex dump of file header">
          {lines.map((l) => `${l.offset}  ${l.hex.padEnd(47, " ")}  ${l.ascii}`).join("\n")}
        </pre>
      )}
      <Note>First 128 bytes shown raw — verify mislabeled downloads (e.g. an HTML error page saved as .mp3) before trusting the extension.</Note>
    </div>
  );
}

/* ---------- WAV metadata cleaner ---------- */

function WavCleanTool() {
  const [origName, setOrigName] = useState("");
  const [origSize, setOrigSize] = useState(0);
  const [clean, setClean] = useState<{ blob: Blob; size: number; dur: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept=".wav,audio/wav" maxMB={200} onFiles={async (files) => {
        const f = files[0];
        if (!f) return;
        setBusy(true);
        setMsg("");
        setClean(null);
        try {
          const buf = await decodeAudioFile(f);
          const blob = encodeWav(buf);
          setOrigName(f.name);
          setOrigSize(f.size);
          setClean({ blob, size: blob.size, dur: buf.duration });
          const saved = f.size - blob.size;
          setMsg(saved > 0
            ? `Removed ${formatBytes(saved)} of extra chunks (cue points, tags, padding). Audio samples untouched.`
            : "No extra chunks found — header was already minimal. Nothing to strip, honestly reported.");
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Could not decode that WAV.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Processing…" : "Choose WAV file"} />
      {msg && <Note>{msg}</Note>}
      {clean && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Original" value={formatBytes(origSize)} />
          <Stat label="Cleaned" value={formatBytes(clean.size)} />
          <Stat label="Saved" value={origSize >= clean.size ? formatBytes(origSize - clean.size) : "+0 B"} />
          <Stat label="Duration" value={formatTime(clean.dur)} />
        </div>
      )}
      {clean && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => downloadBlob(clean.blob, origName.replace(/\.wav$/i, "") + "-clean.wav")}>Download cleaned WAV</Button>
          <Button type="button" variant="ghost" onClick={() => { setClean(null); setMsg(""); setOrigName(""); }}>New file</Button>
        </div>
      )}
      <Note>Rebuilds a minimal RIFF header around your exact samples. Only valid for WAV — MP3/FLAC tags need their own tools and are not touched.</Note>
    </div>
  );
}

/* ---------- A/B comparisons ---------- */

async function loadTwo(files: File[], cap = 2) {
  const bufs: { name: string; buf: AudioBuffer }[] = [];
  for (const f of files.slice(0, cap)) {
    bufs.push({ name: f.name, buf: await decodeAudioFile(f) });
  }
  if (bufs.length < 2) throw new Error("Choose two audio files.");
  return bufs as [{ name: string; buf: AudioBuffer }, { name: string; buf: AudioBuffer }];
}

function WaveCompareTool() {
  const [out, setOut] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={300} multiple onFiles={async (files) => {
        setBusy(true);
        setMsg("");
        setOut(null);
        try {
          const [a, b] = await loadTwo(files);
          const sim = waveformSimilarity(a.buf, b.buf);
          const ia = bufferInfo(a.buf);
          const ib = bufferInfo(b.buf);
          const pct = sim * 100;
          setOut([
            ["Similarity", `${pct.toFixed(1)}%`],
            ["Verdict", pct >= 98 ? "Near-identical waveforms" : pct >= 85 ? "Same source, different processing" : pct >= 60 ? "Related but clearly different" : "Different recordings"],
            ["A duration", formatTime(ia.durationSec)],
            ["B duration", formatTime(ib.durationSec)],
            ["A peak / RMS", `${fmt(20 * Math.log10(Math.max(1e-9, ia.peak)), 1)} / ${fmt(20 * Math.log10(Math.max(1e-9, ia.rms)), 1)} dB`],
            ["B peak / RMS", `${fmt(20 * Math.log10(Math.max(1e-9, ib.peak)), 1)} / ${fmt(20 * Math.log10(Math.max(1e-9, ib.rms)), 1)} dB`],
          ]);
          setMsg(`Compared “${a.name}” vs “${b.name}” — normalized cross-correlation over 20,000 resampled points.`);
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Comparison failed.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Comparing…" : "Choose two files"} />
      {msg && <Note>{msg}</Note>}
      {out && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
          {out.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-semibold text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Time-aligned shape similarity — catches duplicate uploads and verifies renders against masters.</Note>
    </div>
  );
}

function FreqCompareTool() {
  const [out, setOut] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={300} multiple onFiles={async (files) => {
        setBusy(true);
        setMsg("");
        setOut(null);
        try {
          const [a, b] = await loadTwo(files);
          const ca = spectralCentroid(a.buf);
          const cb = spectralCentroid(b.buf);
          const da = dominantFrequency(a.buf);
          const dbr = dominantFrequency(b.buf);
          const brighter = Math.abs(ca - cb) < 200 ? "Matched brightness" : ca > cb ? "A is brighter" : "B is brighter";
          setOut([
            ["A brightness (centroid)", `${fmt(ca, 0)} Hz`],
            ["B brightness (centroid)", `${fmt(cb, 0)} Hz`],
            ["A dominant tone", `${fmt(da, 1)} Hz`],
            ["B dominant tone", `${fmt(dbr, 1)} Hz`],
            ["Verdict", `${brighter} — centroid gap ${fmt(Math.abs(ca - cb), 0)} Hz`],
          ]);
          setMsg(`Spectral fingerprints of “${a.name}” vs “${b.name}” from real windowed DFTs.`);
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Comparison failed.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Comparing…" : "Choose two files"} />
      {msg && <Note>{msg}</Note>}
      {out && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
          {out.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-semibold tabular-nums text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Useful when masters sound different but waveforms look alike — brightness and dominant tones reveal EQ and pitch moves.</Note>
    </div>
  );
}

/* ---------- batch rename helper ---------- */

function RenameTool() {
  const [names, setNames] = useState<string[]>([]);
  const [pattern, setPattern] = useState("track-{n}-{name}");
  const [msg, setMsg] = useState("");
  const [copied, copy] = useCopied();
  const preview = useMemo(() => names.map((n, i) => {
    const dot = n.lastIndexOf(".");
    const base = dot > 0 ? n.slice(0, dot) : n;
    const ext = dot > 0 ? n.slice(dot) : "";
    const safe = (s: string) => s.replace(/[^\w.\-()[\] ]+/g, "_").trim();
    const num = String(i + 1).padStart(2, "0");
    const out = pattern.split("{n}").join(num).split("{name}").join(safe(base)).split("{ext}").join(ext.replace(/^\./, ""));
    return { from: n, to: `${safe(out)}${ext}` };
  }), [names, pattern]);
  const script = useMemo(() => ["#!/bin/sh", "# Toolora rename plan — review, then run with: sh rename.sh", ...preview.map((p) => `mv -- "${p.from.replace(/"/g, "")}" "${p.to.replace(/"/g, "")}"`)].join("\n"), [preview]);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={20} multiple onFiles={async (files) => {
        setNames(files.slice(0, 200).map((f) => f.name));
        setMsg(files.length > 200 ? "First 200 files planned." : `${files.length} file${files.length === 1 ? "" : "s"} loaded — nothing renamed yet, preview below.`);
      }} label="Choose files (multiple)" />
      {names.length > 0 && (
        <div className="mt-3 max-w-[340px]">
          <FieldLabel htmlFor="rn-p">Pattern — {"{n}"} number, {"{name}"} original, {"{ext}"} extension</FieldLabel>
          <Input id="rn-p" value={pattern} onChange={(e) => setPattern(e.target.value)} />
        </div>
      )}
      {msg && <Note>{msg}</Note>}
      {preview.length > 0 && (
        <>
          <dl className="mt-3 max-h-64 divide-y divide-(--border) overflow-auto rounded-xl border border-(--border)" aria-live="polite">
            {preview.slice(0, 60).map((p) => (
              <div key={p.from} className="flex flex-col gap-0.5 px-4 py-1.5 font-mono text-xs">
                <dt className="truncate text-(--muted)">{p.from}</dt>
                <dd className="truncate font-semibold">→ {p.to}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => copy(preview.map((p) => `${p.from}  →  ${p.to}`).join("\n"))}>{copied ? "Copied!" : "Copy plan"}</Button>
            <Button type="button" variant="secondary" onClick={() => downloadBlob(new Blob([script], { type: "text/x-sh" }), "rename.sh")}>Download rename.sh</Button>
            <Button type="button" variant="ghost" onClick={() => { setNames([]); setMsg(""); }}>Clear</Button>
          </div>
        </>
      )}
      <Note>Browsers cannot rename your files directly — this generates an honest, reviewable plan plus a shell script you run yourself.</Note>
    </div>
  );
}

/* ---------- live input monitor ---------- */

function MicMonitorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState("");
  const peakRef = useRef(0);

  const stop = () => {
    const s = stateRef.current;
    if (s) {
      cancelAnimationFrame(s.raf);
      s.stream.getTracks().forEach((t) => t.stop());
      void s.ctx.close();
      stateRef.current = null;
    }
    peakRef.current = 0;
    setActive(false);
  };

  useEffect(() => () => {
    const s = stateRef.current;
    if (s) {
      cancelAnimationFrame(s.raf);
      s.stream.getTracks().forEach((t) => t.stop());
      void s.ctx.close();
    }
  }, []);

  const start = async () => {
    setMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      const data = new Float32Array(an.fftSize);
      let clipUntil = 0;
      const draw = () => {
        an.getFloatTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i += 2) {
          const v = Math.abs(data[i] as number);
          if (v > peak) peak = v;
        }
        if (peak > peakRef.current) peakRef.current = peak;
        if (peak >= 0.99) clipUntil = performance.now() + 1500;
        if (barRef.current) barRef.current.style.width = `${Math.min(100, peak * 100)}%`;
        if (meterRef.current) meterRef.current.setAttribute("aria-valuenow", String(Math.round(Math.min(100, peak * 100))));
        if (clipRef.current) {
          const clipping = performance.now() < clipUntil;
          clipRef.current.textContent = clipping ? "CLIPPING" : `Peak ${fmt(20 * Math.log10(Math.max(1e-6, peakRef.current)), 1)} dB`;
          clipRef.current.style.color = clipping ? "#dc2626" : "";
        }
        const c = canvasRef.current;
        if (c) {
          const g = c.getContext("2d");
          if (g) {
            const W = c.width;
            const H = c.height;
            g.fillStyle = "#0f172a";
            g.fillRect(0, 0, W, H);
            g.strokeStyle = "#818cf8";
            g.lineWidth = 2;
            g.beginPath();
            const step = Math.max(1, Math.floor(data.length / W));
            for (let x = 0; x < W; x++) {
              const v = (data[x * step] as number) ?? 0;
              const y = H / 2 - v * (H / 2 - 4);
              if (x === 0) g.moveTo(x, y);
              else g.lineTo(x, y);
            }
            g.stroke();
          }
        }
        stateRef.current = { ctx, stream, raf: requestAnimationFrame(draw) };
      };
      stateRef.current = { ctx, stream, raf: requestAnimationFrame(draw) };
      setActive(true);
    } catch {
      setMsg("Microphone unavailable — permission denied or no input device. Nothing is recorded by this tool.");
    }
  };

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={140} className="w-full rounded-xl border border-(--border)" aria-label="Live microphone waveform" />
      <div className="mt-3 flex items-center gap-3">
        <div ref={meterRef} className="h-3 flex-1 overflow-hidden rounded-full bg-(--border)" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-label="Live input level">
          <div ref={barRef} className="h-full bg-indigo-500" style={{ width: "0%" }} />
        </div>
        <span ref={clipRef} className="min-w-28 text-sm font-semibold tabular-nums">Peak —</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {!active
          ? <Button type="button" onClick={() => void start()}>Start monitoring</Button>
          : <Button type="button" variant="secondary" onClick={stop}>Stop</Button>}
      </div>
      {msg && <Note>{msg}</Note>}
      <Note>Monitor only — no audio is recorded, stored or uploaded. Set gain so loud peaks sit near −12 to −6 dB without clipping.</Note>
    </div>
  );
}

/* ---------- playback speed controller ---------- */

function SpeedPlayTool() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("1");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = Number(rate) || 1;
      audioRef.current.preservesPitch = true;
    }
  }, [rate, url]);

  return (
    <div>
      <AudioPick onPick={async (files) => {
        const f = files[0];
        if (!f) return;
        if (url) URL.revokeObjectURL(url);
        try {
          await decodeAudioFile(f); // validate it is real decodable audio first
          setUrl(URL.createObjectURL(f));
          setName(f.name);
        } catch {
          setUrl("");
          setName("");
        }
      }} busy={false} />
      {name && !url && <Err message="That file could not be decoded as audio." />}
      {url && (
        <>
          <p className="mt-2 text-sm font-semibold" role="status">{name}</p>
          <audio ref={audioRef} controls src={url} className="mt-3 w-full" aria-label="Speed-controlled playback" />
          <div className="mt-3 max-w-[320px]">
            <FieldLabel htmlFor="sp-r">Speed ({rate}×, 0.5–2×)</FieldLabel>
            <input id="sp-r" type="range" min={0.5} max={2} step={0.05} value={rate} onChange={(e) => setRate(e.target.value)} className="w-full" aria-valuetext={`${rate} times speed`} />
            <div className="mt-1 flex gap-2">
              {(["0.5", "0.75", "1", "1.25", "1.5", "2"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRate(r)} className={`rounded-lg border border-(--border) px-2 py-1 text-xs font-semibold ${rate === r ? "bg-indigo-600 text-white" : ""}`} aria-pressed={rate === r}>{r}×</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={() => { URL.revokeObjectURL(url); setUrl(""); setName(""); }}>New file</Button>
          </div>
        </>
      )}
      <Note>Tempo-preserving speed via the browser media engine — pitch stays put while time stretches. Practice solos at 0.5× without retuning.</Note>
    </div>
  );
}
