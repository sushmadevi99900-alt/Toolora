"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Calc, Err, FilePick, Note, asTool, req } from "../kits/kits";
import {
  applyFade,
  balanceLR,
  bufferInfo,
  changePitch,
  changeSpeed,
  cloneBuffer,
  decodeAudioFile,
  detectSilence,
  downloadBlob,
  encodeWav,
  formatBytes,
  formatTime,
  monoToStereo,
  normalizeBuffer,
  removeSilence,
  reverseBuffer,
  applyGain,
  spectrum,
  stereoToMono,
  trimBuffer,
  waveformPeaks,
  type AudioInfo,
} from "@/lib/audio/engine";

export const audioRegistry: Record<string, React.ComponentType> = {
  "audio-player": asTool(<PlayerTool />),
  "audio-file-information": asTool(<InfoTool />),
  "audio-metadata-viewer": asTool(<MetadataTool />),
  "audio-duration-checker": asTool(<DurationTool />),
  "audio-volume-analyzer": asTool(<VolumeAnalyzerTool />),
  "audio-waveform-viewer": asTool(<WaveformTool />),
  "audio-trim-tool": asTool(<TrimTool />),
  "audio-cut-tool": asTool(<CutTool />),
  "audio-fade-in": asTool(<FadeTool dir="in" />),
  "audio-fade-out": asTool(<FadeTool dir="out" />),
  "audio-speed-changer": asTool(<SpeedTool />),
  "audio-pitch-changer": asTool(<PitchTool />),
  "audio-reverse": asTool(<ReverseTool />),
  "audio-loop-maker": asTool(<LoopTool />),
  "audio-channel-viewer": asTool(<ChannelViewerTool />),
  "audio-silence-detector": asTool(<SilenceDetectTool />),
  "audio-waveform-exporter": asTool(<WaveformExportTool />),
  "audio-blob-inspector": asTool(<BlobInspectorTool />),
  "audio-mime-detector": asTool(<AudioMimeTool />),
  "audio-joiner": asTool(<JoinerTool />),
};

/* ---------- shared ---------- */

export function useAudioFile() {
  const [fileName, setFileName] = useState("");
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [info, setInfo] = useState<AudioInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      const buf = await decodeAudioFile(f);
      if (buf.duration > 3600) throw new Error("Audio longer than 1 hour is not supported here.");
      setBuffer(buf);
      setInfo(bufferInfo(buf));
      setFileName(f.name);
    } catch (e) {
      setBuffer(null);
      setInfo(null);
      setError(e instanceof Error ? e.message : "Could not decode that audio file.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBuffer(null);
    setInfo(null);
    setFileName("");
    setError("");
  };

  return { fileName, buffer, info, error, busy, pick, reset };
}

export function AudioPick({ onPick, busy }: { onPick: (f: File[]) => void; busy: boolean }) {
  return <FilePick accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.weba" maxMB={200} onFiles={onPick} label={busy ? "Decoding…" : "Choose audio"} />;
}

export function downloadWav(buf: AudioBuffer, name: string) {
  downloadBlob(encodeWav(buf), name.endsWith(".wav") ? name : `${name}.wav`);
}

function InfoGrid({ info }: { info: AudioInfo }) {
  return (
    <div aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label="Duration" value={formatTime(info.durationSec)} />
      <Stat label="Sample rate" value={`${(info.sampleRate / 1000).toFixed(1)} kHz`} />
      <Stat label="Channels" value={info.channels === 1 ? "Mono" : info.channels === 2 ? "Stereo" : String(info.channels)} />
      <Stat label="Peak" value={`${(20 * Math.log10(Math.max(1e-6, info.peak))).toFixed(1)} dB`} />
      <Stat label="RMS" value={`${(20 * Math.log10(Math.max(1e-6, info.rms))).toFixed(1)} dB`} />
      <Stat label="Samples" value={info.samples.toLocaleString()} />
    </div>
  );
}

function WaveCanvas({ buffer, height = 120 }: { buffer: AudioBuffer; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const peaks = waveformPeaks(buffer, 300);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 600 * dpr;
    c.height = height * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    const dark = document.documentElement.classList.contains("dark");
    g.fillStyle = dark ? "#111a2e" : "#f1f5f9";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#4f46e5";
    const bw = c.width / peaks.length;
    peaks.forEach((p, i) => {
      const h = Math.max(1, p * c.height * 0.92);
      g.fillRect(i * bw, (c.height - h) / 2, Math.max(1, bw - 0.5), h);
    });
    g.fillStyle = dark ? "#a7b4cc" : "#475569";
    g.font = `${10 * dpr}px sans-serif`;
    const dur = buffer.duration;
    for (let s = 0; s <= dur; s += Math.max(1, Math.round(dur / 6))) {
      const x = (s / dur) * c.width;
      g.fillText(formatTime(s), x + 3, c.height - 4);
    }
  }, [buffer, height]);
  return <canvas ref={ref} className="w-full rounded-xl border border-(--border)" style={{ height }} aria-label="Waveform" />;
}

/* ---------- player ---------- */

function PlayerTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [vol, setVol] = useState(80);
  const startRef = useRef(0);
  const offRef = useRef(0);
  const tickRef = useRef<number | null>(null);

  const stopTick = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  useEffect(() => () => {
    try {
      srcRef.current?.stop();
    } catch {
      /* ignore */
    }
    stopTick();
    void ctxRef.current?.close();
  }, []);

  useEffect(() => {
    setPlaying(false);
    setPos(0);
    offRef.current = 0;
  }, [buffer]);

  const ensureCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  };

  const play = (offset?: number) => {
    if (!buffer) return;
    const ctx = ensureCtx();
    try {
      srcRef.current?.stop();
    } catch {
      /* ignore */
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(gainRef.current as GainNode);
    const off = offset ?? offRef.current;
    startRef.current = ctx.currentTime - off;
    src.start(0, off % buffer.duration);
    src.onended = () => {
      setPlaying(false);
      stopTick();
    };
    srcRef.current = src;
    setPlaying(true);
    stopTick();
    tickRef.current = window.setInterval(() => {
      const p = ctx.currentTime - startRef.current;
      if (p >= buffer.duration) {
        setPos(0);
        offRef.current = 0;
        setPlaying(false);
        stopTick();
      } else setPos(p);
    }, 250);
  };

  const pause = () => {
    try {
      srcRef.current?.stop();
    } catch {
      /* ignore */
    }
    offRef.current = pos;
    setPlaying(false);
    stopTick();
  };

  const seek = (p: number) => {
    offRef.current = p;
    setPos(p);
    if (playing) play(p);
  };

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = (vol / 100) * (vol / 100);
  }, [vol]);

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <p className="mt-2 text-sm font-semibold" role="status">{fileName} · {formatTime(info.durationSec)}</p>
          <div className="mt-3">
            <FieldLabel htmlFor="ap-seek">Seek</FieldLabel>
            <input
              id="ap-seek" type="range" min={0} max={Math.max(1, info.durationSec)} step={0.1} value={Math.min(pos, info.durationSec)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full accent-indigo-600" aria-valuetext={`${formatTime(pos)} of ${formatTime(info.durationSec)}`}
            />
            <div className="flex justify-between text-xs text-(--muted) tabular-nums">
              <span>{formatTime(pos)}</span>
              <span>{formatTime(info.durationSec)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <FieldLabel htmlFor="ap-vol">Volume</FieldLabel>
            <input id="ap-vol" type="range" min={0} max={100} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="w-40 accent-indigo-600" />
            <span className="text-sm tabular-nums">{vol}%</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {playing
              ? <Button type="button" onClick={pause}>Pause</Button>
              : <Button type="button" onClick={() => play()}>Play</Button>}
            <Button type="button" variant="secondary" onClick={() => { pause(); offRef.current = 0; setPos(0); }}>Stop</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- info family ---------- */

function InfoTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <p className="mt-3 text-sm font-semibold" role="status">{fileName}</p>
          <div className="mt-3"><InfoGrid info={info} /></div>
          <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

function MetadataTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const [file, setFile] = useState<File | null>(null);

  const onPick = async (files: File[]) => {
    setFile(files[0] ?? null);
    await pick(files);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void onPick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && file && (
        <>
          <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
            {[
              ["File name", file.name],
              ["MIME type", file.type || "unknown"],
              ["File size", formatBytes(file.size)],
              ["Duration", `${formatTime(info.durationSec)} (${info.durationSec.toFixed(2)} s)`],
              ["Sample rate", `${info.sampleRate} Hz`],
              ["Channels", info.channels === 1 ? "1 (mono)" : `${info.channels}`],
              ["Total samples", info.samples.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <dt className="text-(--muted)">{k}</dt>
                <dd className="font-semibold break-all text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <Note>Container metadata (ID3 tags, cover art) is not decoded — only measurable file and signal facts are shown.</Note>
          <div className="mt-3"><Button type="button" variant="ghost" onClick={() => { reset(); setFile(null); }}>New file</Button></div>
        </>
      )}
    </div>
  );
}

function DurationTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <div aria-live="polite" className="mt-3 rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
          <p className="text-4xl font-extrabold tabular-nums">{formatTime(info.durationSec)}</p>
          <p className="mt-1 text-sm text-(--muted)">{info.durationSec.toFixed(2)} seconds · {info.sampleRate / 1000} kHz · {info.channels}ch</p>
        </div>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}

function VolumeAnalyzerTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  if (!buffer || !info) {
    return (
      <div>
        <AudioPick onPick={(f) => void pick(f)} busy={busy} />
        <Err message={error} />
      </div>
    );
  }
  const peakDb = 20 * Math.log10(Math.max(1e-6, info.peak));
  const verdict = info.peak >= 0.99 ? "Clipping risk — peaks hit full scale" : peakDb >= -6 ? "Healthy loud level" : peakDb >= -24 ? "Moderate — fine for speech" : "Quiet — consider boosting";
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      <div className="mt-3"><WaveCanvas buffer={buffer} /></div>
      <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Peak" value={`${peakDb.toFixed(1)} dB`} />
        <Stat label="RMS" value={`${(20 * Math.log10(Math.max(1e-6, info.rms))).toFixed(1)} dB`} />
      </div>
      <p role="status" className="mt-2 font-semibold">{verdict}</p>
      <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
    </div>
  );
}

function WaveformTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <p className="mt-2 text-sm text-(--muted)" role="status">{formatTime(info.durationSec)} · {info.sampleRate / 1000} kHz · {info.channels === 1 ? "mono" : "stereo"}</p>
          <div className="mt-2"><WaveCanvas buffer={buffer} height={140} /></div>
          <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

/* ---------- trim / cut / fade ---------- */

function TrimTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");

  const run = () => {
    if (!buffer) return;
    const s = Number(start);
    const e = end.trim() === "" ? buffer.duration : Number(end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e > buffer.duration + 0.001 || e - s < 0.05) {
      setMsg(`Use seconds within 0–${buffer.duration.toFixed(1)} with end at least 0.05 s after start.`);
      return;
    }
    try {
      const out = trimBuffer(buffer, s, Math.min(e, buffer.duration));
      downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-trimmed`);
      setMsg(`Trimmed ${formatTime(e - s)} → downloaded WAV.`);
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : "Trim failed.");
    }
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <div className="mt-2"><WaveCanvas buffer={buffer} /></div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="tr-s">Keep from (seconds)</FieldLabel>
              <Input id="tr-s" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="tr-e">Keep until (default: end)</FieldLabel>
              <Input id="tr-e" inputMode="decimal" value={end} placeholder={info.durationSec.toFixed(1)} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Trim & download WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

function CutTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState("");

  const run = () => {
    if (!buffer) return;
    const s = Number(start);
    const e = Number(end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e > buffer.duration || e - s < 0.05) {
      setMsg(`Cut region must sit inside 0–${buffer.duration.toFixed(1)} and be ≥0.05 s.`);
      return;
    }
    const sr = buffer.sampleRate;
    const a = trimBuffer(buffer, 0, s);
    const b = trimBuffer(buffer, e, buffer.duration);
    const out = new AudioBuffer({ length: a.length + b.length, sampleRate: sr, numberOfChannels: buffer.numberOfChannels });
    for (let c = 0; c < out.numberOfChannels; c++) {
      out.getChannelData(c).set(a.getChannelData(c), 0);
      out.getChannelData(c).set(b.getChannelData(c), a.length);
    }
    downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-cut`);
    setMsg(`Removed ${formatTime(e - s)} — joined WAV downloaded.`);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <div className="mt-2"><WaveCanvas buffer={buffer} /></div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="ct-s">Cut from (seconds)</FieldLabel>
              <Input id="ct-s" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="ct-e">Cut until (seconds)</FieldLabel>
              <Input id="ct-e" inputMode="decimal" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Cut & download WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

function FadeTool({ dir }: { dir: "in" | "out" }) {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [secs, setSecs] = useState("3");
  const [msg, setMsg] = useState("");

  const run = () => {
    if (!buffer) return;
    const n = Number(secs);
    if (!Number.isFinite(n) || n <= 0 || n > buffer.duration) {
      setMsg("Fade length must be within the file duration.");
      return;
    }
    const out = dir === "in" ? applyFade(buffer, n, 0) : applyFade(buffer, 0, n);
    downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-fade-${dir}`);
    setMsg(`Applied ${n} s fade-${dir} — WAV downloaded.`);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="max-w-[220px]">
            <FieldLabel htmlFor="fade-s">Fade length (seconds)</FieldLabel>
            <Input id="fade-s" inputMode="decimal" value={secs} onChange={(e) => setSecs(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Apply & download WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- speed / pitch / reverse / loop ---------- */

function SpeedTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [rate, setRate] = useState("1.25");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!buffer) return;
    const r = Number(rate);
    if (!Number.isFinite(r) || r < 0.5 || r > 2) {
      setMsg("Rate must be 0.5–2×.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const out = await changeSpeed(buffer, r);
      downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-${r}x`);
      setMsg(`${r}× applied — pitch shifts with speed (resampling). WAV downloaded.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Speed change failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="max-w-[220px]">
            <FieldLabel htmlFor="sp-r">Rate (0.5–2)</FieldLabel>
            <Input id="sp-r" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Rendering…" : "Apply & download WAV"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

function PitchTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [semi, setSemi] = useState("2");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (!buffer) return;
    const s = Number(semi);
    if (!Number.isInteger(s) || s < -12 || s > 12 || s === 0) {
      setMsg("Use whole semitones from −12 to +12 (not 0).");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const out = await changePitch(buffer, s);
      downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-pitch${s > 0 ? `+${s}` : s}`);
      setMsg(`${s > 0 ? "+" : ""}${s} semitones applied with a basic resample method — WAV downloaded.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Pitch shift failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="max-w-[220px]">
            <FieldLabel htmlFor="pi-s">Semitones (−12…+12)</FieldLabel>
            <Input id="pi-s" inputMode="numeric" value={semi} onChange={(e) => setSemi(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Rendering…" : "Apply & download WAV"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          <Note>Basic method: small shifts sound fine; large ones may warble. Studio-grade shifting is out of scope.</Note>
        </>
      )}
    </div>
  );
}

function ReverseTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [msg, setMsg] = useState("");

  const run = () => {
    if (!buffer) return;
    downloadWav(reverseBuffer(buffer), `${fileName.replace(/\.[^.]+$/, "")}-reversed`);
    setMsg("Reversed WAV downloaded.");
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Reverse & download WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

function LoopTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("");
  const [times, setTimes] = useState("4");
  const [msg, setMsg] = useState("");

  const run = () => {
    if (!buffer) return;
    const s = Number(start);
    const e = end.trim() === "" ? buffer.duration : Number(end);
    const n = Math.floor(Number(times));
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e > buffer.duration || e - s < 0.1) {
      setMsg("Choose a section ≥0.1 s inside the file.");
      return;
    }
    if (!Number.isInteger(n) || n < 2 || n > 32) {
      setMsg("Repeats must be 2–32.");
      return;
    }
    const seg = trimBuffer(buffer, s, e);
    const out = new AudioBuffer({ length: seg.length * n, sampleRate: buffer.sampleRate, numberOfChannels: buffer.numberOfChannels });
    for (let c = 0; c < out.numberOfChannels; c++) {
      const dst = out.getChannelData(c);
      const src = seg.getChannelData(c);
      for (let i = 0; i < n; i++) dst.set(src, i * seg.length);
    }
    downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-loopx${n}`);
    setMsg(`Looped ${n}× (${formatTime((e - s) * n)}) — WAV downloaded.`);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <FieldLabel htmlFor="lp-s">From (s)</FieldLabel>
              <Input id="lp-s" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="lp-e">Until (s)</FieldLabel>
              <Input id="lp-e" inputMode="decimal" value={end} placeholder={info.durationSec.toFixed(1)} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="lp-n">Repeats</FieldLabel>
              <Input id="lp-n" inputMode="numeric" value={times} onChange={(e) => setTimes(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Make loop & download WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

/* ---------- channels / silence ---------- */

function ChannelViewerTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [peaks, setPeaks] = useState<{ left: number[]; right: number[] | null } | null>(null);

  const onPick = async (files: File[]) => {
    setPeaks(null);
    await pick(files);
  };

  useEffect(() => {
    if (!buffer) return;
    const wp = (ch: Float32Array, cols: number): number[] => {
      const step = Math.max(1, Math.floor(ch.length / cols));
      const out: number[] = [];
      for (let i = 0; i < ch.length; i += step) {
        let p = 0;
        for (let j = i; j < Math.min(ch.length, i + step); j += 8) {
          const v = Math.abs(ch[j] as number);
          if (v > p) p = v;
        }
        out.push(Math.min(1, p));
      }
      return out;
    };
    setPeaks({
      left: wp(buffer.getChannelData(0), 200),
      right: buffer.numberOfChannels > 1 ? wp(buffer.getChannelData(1), 200) : null,
    });
  }, [buffer]);

  const Bar = ({ data, label }: { data: number[]; label: string }) => (
    <div>
      <p className="text-xs font-bold text-(--muted)">{label}</p>
      <div className="flex h-16 items-center gap-[1px] rounded-lg bg-(--surface-2) p-1" aria-hidden="true">
        {data.map((p, i) => (
          <div key={i} className="w-full bg-brand-600" style={{ height: `${Math.max(2, p * 100)}%` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <AudioPick onPick={(f) => void onPick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && peaks && (
        <>
          <div className="mt-3 space-y-3">
            <Bar data={peaks.left} label={info.channels > 1 ? "Left" : "Mono"} />
            {peaks.right && <Bar data={peaks.right} label="Right" />}
          </div>
          <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Channels" value={String(info.channels)} />
            <Stat label="Peak" value={`${(20 * Math.log10(Math.max(1e-6, info.peak))).toFixed(1)} dB`} />
          </div>
          <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

function SilenceDetectTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [db, setDb] = useState("-45");
  const [min, setMin] = useState("0.5");
  const [regions, setRegions] = useState<{ start: number; end: number }[] | null>(null);

  const run = () => {
    if (!buffer) return;
    const r = detectSilence(buffer, Number(db) || -45, Math.max(0.1, Number(min) || 0.5));
    setRegions(r);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="sd-db">Threshold (dB)</FieldLabel>
              <Input id="sd-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
            </div>
            <div>
              <FieldLabel htmlFor="sd-min">Min length (s)</FieldLabel>
              <Input id="sd-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" onClick={run}>Detect silence</Button>
          </div>
          {regions && (
            <>
              <p role="status" className="mt-3 text-sm font-semibold">
                {regions.length === 0 ? "No silence found at this threshold." : `${regions.length} silent region(s), ${formatTime(regions.reduce((n, r) => n + (r.end - r.start), 0))} total.`}
              </p>
              {regions.length > 0 && (
                <ul className="mt-2 divide-y divide-(--border) rounded-xl border border-(--border)">
                  {regions.slice(0, 50).map((r, i) => (
                    <li key={i} className="px-4 py-2 text-sm tabular-nums">
                      {formatTime(r.start)} → {formatTime(r.end)} ({(r.end - r.start).toFixed(1)} s)
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

/* ---------- misc analysis ---------- */

function WaveformExportTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!buffer || !ref.current) return;
    const c = ref.current;
    const peaks = waveformPeaks(buffer, 400);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 1200;
    c.height = 300 * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#4f46e5";
    const bw = c.width / peaks.length;
    peaks.forEach((p, i) => {
      const h = Math.max(2, p * c.height * 0.9);
      g.fillRect(i * bw, (c.height - h) / 2, Math.max(1, bw - 0.5), h);
    });
    g.fillStyle = "#0f172a";
    g.font = "24px sans-serif";
    g.fillText(`0:00`, 10, c.height - 12);
    const end = formatTime(buffer.duration);
    g.fillText(end, c.width - g.measureText(end).width - 10, c.height - 12);
  }, [buffer]);

  const download = () => {
    const c = ref.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "waveform.png";
    a.click();
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <canvas ref={ref} className="mt-3 w-full rounded-xl border border-(--border)" aria-label="Exportable waveform" />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={download}>Download PNG</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
        </>
      )}
    </div>
  );
}

function BlobInspectorTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={200} onFiles={async (f) => {
        const file = f[0];
        if (!file) return;
        try {
          const buf = await decodeAudioFile(file);
          setRows([
            ["Name", file.name],
            ["Blob size", formatBytes(file.size)],
            ["MIME", file.type || "unknown"],
            ["Duration", `${buf.duration.toFixed(2)} s`],
            ["Rate / channels", `${buf.sampleRate} Hz · ${buf.numberOfChannels}`],
          ]);
        } catch {
          setRows([["Name", file.name], ["Status", "Could not decode — unsupported or corrupt."]]);
        }
      }} label="Choose audio" />
      {rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-semibold break-all text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const AUDIO_MAGIC: [number[], string][] = [
  [[0x49, 0x44, 0x33], "MP3 (ID3 tag)"],
  [[0xff, 0xfb], "MP3 (frame sync)"],
  [[0x52, 0x49, 0x46, 0x46], "WAV / RIFF container"],
  [[0x66, 0x4c, 0x61, 0x43], "FLAC"],
  [[0x4f, 0x67, 0x67, 0x53], "OGG (Vorbis/Opus)"],
  [[0x1a, 0x45, 0xdf, 0xa3], "WebM / Matroska"],
];

function AudioMimeTool() {
  const [mime, setMime] = useState<string | null>(null);
  return (
    <div>
      <FilePick accept="*/*" maxMB={100} onFiles={async (f) => {
        const file = f[0];
        if (!file) return;
        const head = new Uint8Array((await file.arrayBuffer()).slice(0, 12));
        let found: string | null = null;
        for (const [sig, label] of AUDIO_MAGIC) {
          if (sig.every((b, i) => head[i] === b)) {
            found = label;
            break;
          }
        }
        if (!found && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) found = "MP4/M4A (ftyp)";
        setMime(found ?? "Unknown audio container");
      }} label="Choose audio file" />
      {mime && <div aria-live="polite" className="mt-3 rounded-xl bg-(--surface-2) px-4 py-3 font-semibold">{mime}</div>}
      <Note>Identified from magic bytes — the true container, not the extension.</Note>
    </div>
  );
}

/* ---------- joiner ---------- */

function JoinerTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    if (files.length < 2) {
      setMsg("Choose at least 2 audio files.");
      return;
    }
    setWorking(true);
    setMsg("");
    try {
      const bufs: AudioBuffer[] = [];
      for (const f of files.slice(0, 20)) bufs.push(await decodeAudioFile(f));
      const rate = bufs[0]?.sampleRate ?? 44100;
      const ch = Math.max(...bufs.map((b) => b.numberOfChannels));
      // Resample everything to the first file's rate/channels.
      const norm: AudioBuffer[] = [];
      for (const b of bufs) {
        if (b.sampleRate === rate && b.numberOfChannels === ch) {
          norm.push(b);
          continue;
        }
        const off = new OfflineAudioContext(ch, Math.ceil((b.length * rate) / b.sampleRate), rate);
        const src = off.createBufferSource();
        src.buffer = b;
        src.connect(off.destination);
        src.start(0);
        norm.push(await off.startRendering());
      }
      const total = norm.reduce((n, b) => n + b.length, 0);
      const out = new AudioBuffer({ length: total, sampleRate: rate, numberOfChannels: ch });
      let offset = 0;
      for (const b of norm) {
        for (let c = 0; c < ch; c++) {
          out.getChannelData(c).set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), offset);
        }
        offset += b.length;
      }
      downloadWav(out, "joined.wav");
      setMsg(`Joined ${norm.length} files (${formatTime(out.duration)}) — WAV downloaded. Resampled to ${rate / 1000} kHz.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Join failed — files may be corrupt.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FilePick accept="audio/*" multiple maxMB={200} onFiles={setFiles} label="Choose audio files (in order)" />
      {files.length > 0 && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {files.slice(0, 20).map((f) => (
            <li key={f.name + f.size}>{f.name}</li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Joining…" : "Join & download WAV"}</Button>
        <Button type="button" variant="ghost" onClick={() => { setFiles([]); setMsg(""); }}>Clear</Button>
      </div>
      {msg && <Note>{msg}</Note>}
    </div>
  );
}
