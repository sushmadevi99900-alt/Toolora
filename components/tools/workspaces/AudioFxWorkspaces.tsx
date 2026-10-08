"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Calc, Err, FilePick, Note, asTool, req, useCopied } from "../kits/kits";
import { AudioPick, downloadWav, useAudioFile } from "./AudioWorkspaces";
import {
  applyEffect,
  applyGain,
  balanceLR,
  bufferInfo,
  decodeAudioFile,
  downloadBlob,
  encodeWav,
  formatBytes,
  formatTime,
  monoToStereo,
  normalizeBuffer,
  pcmSizeBytes,
  removeSilence,
  spectrum,
  stereoToMono,
} from "@/lib/audio/engine";

export const audiofxRegistry: Record<string, React.ComponentType> = {
  "audio-volume-booster": asTool(<BoosterTool />),
  "audio-volume-normalizer": asTool(<NormalizerTool />),
  "audio-silence-remover": asTool(<SilenceRemoveTool />),
  "audio-balance": asTool(<BalanceTool />),
  "audio-gain-controller": asTool(<GainTool />),
  "audio-equalizer": asTool(<EqTool />),
  "bass-booster": asTool(<BassTool />),
  "treble-booster": asTool(<TrebleTool />),
  "audio-noise-gate": asTool(<GateTool />),
  "audio-compressor": asTool(<CompressorTool />),
  "audio-limiter": asTool(<LimiterTool />),
  "audio-reverb": asTool(<ReverbTool />),
  "audio-delay": asTool(<DelayTool />),
  "audio-echo": asTool(<EchoTool />),
  "audio-distortion": asTool(<DistortionTool />),
  "audio-bitrate-calculator": asTool(<BitrateTool />),
  "audio-sample-rate-calculator": asTool(<RateCalcTool />),
  "audio-file-size-calculator": asTool(<SizeCalcTool />),
  "wav-information-viewer": asTool(<WavInfoTool />),
  "wav-converter": asTool(<WavConvertTool />),
  "pcm-audio-inspector": asTool(<PcmTool />),
  "audio-frequency-analyzer": asTool(<FreqTool />),
  "fft-spectrum-analyzer": asTool(<SpectrumTool />),
  "spectrogram-viewer": asTool(<SpectrogramTool />),
  "voice-recorder": asTool(<VoiceRecorderTool />),
  "audio-recorder-timer": asTool(<RecorderTimerTool />),
  "audio-recording-download": asTool(<TakesTool />),
  "audio-recording-format-selector": asTool(<FormatProbeTool />),
  "audio-channel-converter": asTool(<ChannelConvertTool />),
  "audio-sample-rate-inspector": asTool(<RateInspectTool />),
  "stereo-to-mono": asTool(<ToMonoTool />),
  "mono-to-stereo": asTool(<ToStereoTool />),
};

/* ---------- one-click transforms ---------- */

function OneClick({ slug, run, note }: { slug: string; run: (b: AudioBuffer) => AudioBuffer | Promise<AudioBuffer>; note?: string }) {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);

  const go = async () => {
    if (!buffer) return;
    setWorking(true);
    setMsg("");
    try {
      const out = await run(buffer);
      downloadWav(out, `${fileName.replace(/\.[^.]+$/, "")}-${slug}`);
      setMsg("Processed — WAV downloaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void go()} disabled={working}>{working ? "Processing…" : "Process & download WAV"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {note && <Note>{note}</Note>}
        </>
      )}
    </div>
  );
}

function BoosterTool() {
  const [db, setDb] = useState("6");
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="bo-db">Boost (dB, 1–24)</FieldLabel>
        <Input id="bo-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      <BoostInner db={Number(db) || 0} />
    </div>
  );
}

function BoostInner({ db }: { db: number }) {
  const [valid, setValid] = useState(true);
  useEffect(() => {
    setValid(Number.isFinite(db) && db >= 1 && db <= 24);
  }, [db]);
  if (!valid) return <Err message="Boost must be 1–24 dB." />;
  const gain = Math.pow(10, db / 20);
  return <OneClick slug={`boost${db}db`} run={(b) => applyGain(b, gain)} note={`+${db} dB with hard clipping protection.`} />;
}

function NormalizerTool() {
  const [target, setTarget] = useState("99");
  const t = Math.min(100, Math.max(50, Number(target) || 99)) / 100;
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="no-t">Target peak % (50–100)</FieldLabel>
        <Input id="no-t" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <OneClick slug="normalized" run={(b) => normalizeBuffer(b, t)} note={`Scales the loudest peak to ${(t * 100).toFixed(0)}% of full scale.`} />
    </div>
  );
}

function SilenceRemoveTool() {
  const [db, setDb] = useState("-45");
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="sr-db">Threshold (dB)</FieldLabel>
        <Input id="sr-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      <OneClick
        slug="desilenced"
        run={(b) => removeSilence(b, Number(db) || -45, 0.3, 0.1)}
        note="Removes silences ≥0.3 s, keeping a 0.1 s pad each side for natural flow."
      />
    </div>
  );
}

function ToMonoTool() {
  return <OneClick slug="mono" run={(b) => stereoToMono(b)} note="Both channels averaged into one true-mono channel." />;
}

function ToStereoTool() {
  return <OneClick slug="stereo" run={(b) => monoToStereo(b)} note="Mono duplicated to left and right (dual mono)." />;
}

function ChannelConvertTool() {
  const [mode, setMode] = useState("mono");
  return (
    <div>
      <div className="max-w-[260px]">
        <FieldLabel htmlFor="cc-m">Convert to</FieldLabel>
        <select id="cc-m" value={mode} onChange={(e) => setMode(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px]">
          <option value="mono">Mono</option>
          <option value="stereo">Stereo (dual mono)</option>
        </select>
      </div>
      <OneClick slug={mode} run={(b) => (mode === "mono" ? stereoToMono(b) : monoToStereo(b))} />
    </div>
  );
}

function BalanceTool() {
  const [bal, setBal] = useState("0");
  const v = Math.max(-1, Math.min(1, Number(bal) || 0));
  return (
    <div>
      <div className="max-w-[260px]">
        <FieldLabel htmlFor="ba-v">Balance (−1 left … +1 right)</FieldLabel>
        <Input id="ba-v" inputMode="decimal" value={bal} onChange={(e) => setBal(e.target.value)} />
      </div>
      <OneClick slug="balanced" run={(b) => balanceLR(b, v)} />
    </div>
  );
}

function GainTool() {
  const [db, setDb] = useState("0");
  const v = Number(db);
  const ok = Number.isFinite(v) && v >= -24 && v <= 24;
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="ga-db">Gain (dB, −24…+24)</FieldLabel>
        <Input id="ga-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      {!ok && <Err message="Gain must be between −24 and +24 dB." />}
      {ok && <OneClick slug={`gain${v}db`} run={(b) => applyGain(b, Math.pow(10, v / 20))} note={v > 12 ? "High gain may clip — peaks are hard-limited at full scale." : undefined} />}
    </div>
  );
}

/* ---------- EQ ---------- */

async function eqRender(buf: AudioBuffer, bass: number, mid: number, treble: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
  const src = off.createBufferSource();
  src.buffer = buf;
  const low = off.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 200;
  low.gain.value = bass;
  const m = off.createBiquadFilter();
  m.type = "peaking";
  m.frequency.value = 1000;
  m.Q.value = 1;
  m.gain.value = mid;
  const hi = off.createBiquadFilter();
  hi.type = "highshelf";
  hi.frequency.value = 4000;
  hi.gain.value = treble;
  src.connect(low);
  low.connect(m);
  m.connect(hi);
  hi.connect(off.destination);
  src.start(0);
  return await off.startRendering();
}

function EqTool() {
  const [bass, setBass] = useState("0");
  const [mid, setMid] = useState("0");
  const [treble, setTreble] = useState("0");
  const clamp = (s: string) => Math.max(-15, Math.min(15, Number(s) || 0));
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {[["Bass (200 Hz)", bass, setBass], ["Mid (1 kHz)", mid, setMid], ["Treble (4 kHz)", treble, setTreble]].map(([label, val, set]) => (
          <div key={label as string}>
            <FieldLabel htmlFor={`eq-${label}`}>{label as string} dB</FieldLabel>
            <Input id={`eq-${label}`} inputMode="decimal" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} />
          </div>
        ))}
      </div>
      <OneClick slug="eq" run={(b) => eqRender(b, clamp(bass), clamp(mid), clamp(treble))} note="True biquad filters rendered offline — what you set is what you get." />
    </div>
  );
}

function BassTool() {
  const [db, setDb] = useState("6");
  const v = Math.max(0, Math.min(18, Number(db) || 0));
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="bb-db">Bass boost (dB, 0–18)</FieldLabel>
        <Input id="bb-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      <OneClick slug="bass" run={(b) => applyEffect(b, "bass", v)} note="200 Hz low-shelf filter." />
    </div>
  );
}

function TrebleTool() {
  const [db, setDb] = useState("6");
  const v = Math.max(0, Math.min(18, Number(db) || 0));
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="tb-db">Treble boost (dB, 0–18)</FieldLabel>
        <Input id="tb-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      <OneClick slug="treble" run={(b) => applyEffect(b, "treble", v)} note="4 kHz high-shelf filter." />
    </div>
  );
}

/* ---------- dynamics ---------- */

function GateTool() {
  const [db, setDb] = useState("-40");
  const thr = Math.pow(10, (Number(db) || -40) / 20);
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="gt-db">Gate threshold (dB)</FieldLabel>
        <Input id="gt-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
      </div>
      <OneClick
        slug="gated"
        run={(b) => {
          const out = new AudioBuffer({ length: b.length, sampleRate: b.sampleRate, numberOfChannels: b.numberOfChannels });
          const attack = Math.floor(b.sampleRate * 0.005);
          const release = Math.floor(b.sampleRate * 0.05);
          for (let c = 0; c < b.numberOfChannels; c++) {
            const src = b.getChannelData(c);
            const dst = out.getChannelData(c);
            let gain = 1;
            for (let i = 0; i < src.length; i++) {
              const loud = Math.abs(src[i] as number) > thr;
              const speed = loud ? attack : release;
              const target = loud ? 1 : 0;
              gain += (target - gain) * (1 / Math.max(1, speed));
              dst[i] = (src[i] as number) * gain;
            }
          }
          return out;
        }}
        note="Basic downward gate with 5 ms attack / 50 ms release — tames hiss between phrases."
      />
    </div>
  );
}

function CompressorTool() {
  const [ratio, setRatio] = useState("4");
  const r = Math.max(1, Math.min(20, Number(ratio) || 4));
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="cp-r">Ratio (1–20)</FieldLabel>
        <Input id="cp-r" inputMode="decimal" value={ratio} onChange={(e) => setRatio(e.target.value)} />
      </div>
      <OneClick slug="compressed" run={(b) => applyEffect(b, "compressor", r)} note="Threshold −18 dB with soft knee — evens out speech and mixes." />
    </div>
  );
}

function LimiterTool() {
  const [ceil, setCeil] = useState("-1");
  const c = Math.max(-12, Math.min(0, Number(ceil) || -1));
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="li-c">Ceiling (dB, −12…0)</FieldLabel>
        <Input id="li-c" inputMode="decimal" value={ceil} onChange={(e) => setCeil(e.target.value)} />
      </div>
      <OneClick
        slug="limited"
        run={async (b) => {
          const comp = await applyEffect(b, "compressor", 20);
          return applyGain(comp, Math.pow(10, c / 20) / Math.max(1e-6, bufferInfo(comp).peak));
        }}
        note={`High-ratio limiting with peaks capped at ${c} dBFS.`}
      />
    </div>
  );
}

/* ---------- space / color ---------- */

async function reverbRender(buf: AudioBuffer, seconds: number, wet: number): Promise<AudioBuffer> {
  const off = new OfflineAudioContext(buf.numberOfChannels, buf.length + Math.floor(seconds * buf.sampleRate), buf.sampleRate);
  const src = off.createBufferSource();
  src.buffer = buf;
  const conv = off.createConvolver();
  const len = Math.floor(seconds * buf.sampleRate);
  const imp = off.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
  for (let c = 0; c < imp.numberOfChannels; c++) {
    const d = imp.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
  }
  conv.buffer = imp;
  const dry = off.createGain();
  dry.gain.value = 1;
  const wetG = off.createGain();
  wetG.gain.value = wet;
  src.connect(dry);
  dry.connect(off.destination);
  src.connect(conv);
  conv.connect(wetG);
  wetG.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();
  // Trim back to original length + tail cap.
  const keep = Math.min(rendered.length, buf.length + Math.floor(1.5 * buf.sampleRate));
  const out = new AudioBuffer({ length: keep, sampleRate: buf.sampleRate, numberOfChannels: buf.numberOfChannels });
  for (let c = 0; c < out.numberOfChannels; c++) out.copyToChannel(rendered.getChannelData(c).subarray(0, keep), c);
  return out;
}

function ReverbTool() {
  const [room, setRoom] = useState("1.2");
  const [mix, setMix] = useState("35");
  const s = Math.max(0.3, Math.min(4, Number(room) || 1.2));
  const w = Math.max(0, Math.min(80, Number(mix) || 35)) / 100;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="rv-s">Room size (s, 0.3–4)</FieldLabel>
          <Input id="rv-s" inputMode="decimal" value={room} onChange={(e) => setRoom(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="rv-m">Wet mix % (0–80)</FieldLabel>
          <Input id="rv-m" inputMode="decimal" value={mix} onChange={(e) => setMix(e.target.value)} />
        </div>
      </div>
      <OneClick slug="reverb" run={(b) => reverbRender(b, s, w)} note="Algorithmic impulse reverb generated in-browser — no samples, no uploads." />
    </div>
  );
}

async function echoRender(buf: AudioBuffer, delaySec: number, feedback: number, single: boolean): Promise<AudioBuffer> {
  const tail = single ? delaySec : delaySec * 4;
  const off = new OfflineAudioContext(buf.numberOfChannels, buf.length + Math.floor(tail * buf.sampleRate), buf.sampleRate);
  const src = off.createBufferSource();
  src.buffer = buf;
  const delay = off.createDelay(4);
  delay.delayTime.value = delaySec;
  const fb = off.createGain();
  fb.gain.value = single ? 0 : feedback;
  const wet = off.createGain();
  wet.gain.value = 0.45;
  src.connect(off.destination);
  src.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(off.destination);
  src.start(0);
  return await off.startRendering();
}

function DelayTool() {
  const [ms, setMs] = useState("180");
  const d = Math.max(30, Math.min(1000, Number(ms) || 180)) / 1000;
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="dl-ms">Delay (ms, 30–1000)</FieldLabel>
        <Input id="dl-ms" inputMode="decimal" value={ms} onChange={(e) => setMs(e.target.value)} />
      </div>
      <OneClick slug="delay" run={(b) => echoRender(b, d, 0, true)} note="One clean repeat — classic slapback." />
    </div>
  );
}

function EchoTool() {
  const [ms, setMs] = useState("280");
  const [fb, setFb] = useState("45");
  const d = Math.max(50, Math.min(1500, Number(ms) || 280)) / 1000;
  const f = Math.max(0, Math.min(85, Number(fb) || 45)) / 100;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="ec-ms">Delay (ms)</FieldLabel>
          <Input id="ec-ms" inputMode="decimal" value={ms} onChange={(e) => setMs(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="ec-fb">Feedback % (0–85)</FieldLabel>
          <Input id="ec-fb" inputMode="decimal" value={fb} onChange={(e) => setFb(e.target.value)} />
        </div>
      </div>
      <OneClick slug="echo" run={(b) => echoRender(b, d, f, false)} note="Decaying repeats rendered offline." />
    </div>
  );
}

function DistortionTool() {
  const [drive, setDrive] = useState("12");
  const k = Math.max(1, Math.min(60, Number(drive) || 12));
  return (
    <div>
      <div className="max-w-[220px]">
        <FieldLabel htmlFor="di-k">Drive (1–60)</FieldLabel>
        <Input id="di-k" inputMode="decimal" value={drive} onChange={(e) => setDrive(e.target.value)} />
      </div>
      <OneClick slug="distorted" run={(b) => applyEffect(b, "distortion", k)} note="tanh waveshaper — gentle warmth at low values, heavy drive at high." />
    </div>
  );
}

/* ---------- calculators ---------- */

function BitrateTool() {
  return (
    <Calc
      button="Calculate bitrate"
      fields={[
        { key: "size", label: "File size (MB)", type: "number", required: true },
        { key: "dur", label: "Duration (seconds)", type: "number", required: true },
      ]}
      compute={(v) => {
        const size = req(v, "size", "File size");
        if (typeof size !== "number") return size;
        const dur = req(v, "dur", "Duration");
        if (typeof dur !== "number") return dur;
        if (size <= 0 || dur <= 0) return { error: "Both values must be positive." };
        const kbps = ((size * 8 * 1024) / dur).toFixed(1);
        const verdict = Number(kbps) >= 256 ? "High quality" : Number(kbps) >= 128 ? "Good quality" : "Low quality / voice-grade";
        return { rows: [["Average bitrate", `${kbps} kbps`], ["Verdict", verdict]], note: "Bitrate = size × 8 ÷ seconds. Container overhead is negligible." };
      }}
    />
  );
}

function RateCalcTool() {
  return (
    <Calc
      button="Calculate"
      fields={[
        { key: "samples", label: "Sample count", type: "number", required: true },
        { key: "secs", label: "Duration (seconds)", type: "number", required: true },
      ]}
      compute={(v) => {
        const n = req(v, "samples", "Samples");
        if (typeof n !== "number") return n;
        const s = req(v, "secs", "Duration");
        if (typeof s !== "number") return s;
        if (n <= 0 || s <= 0) return { error: "Both values must be positive." };
        const rate = n / s;
        const std = [8000, 11025, 22050, 44100, 48000, 96000].reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), 44100);
        return { rows: [["Sample rate", `${rate.toFixed(2)} Hz`], ["Nearest standard", `${std} Hz`]], note: "Rate = samples ÷ seconds." };
      }}
    />
  );
}

function SizeCalcTool() {
  return (
    <Calc
      button="Calculate size"
      fields={[
        { key: "rate", label: "Sample rate (Hz)", type: "number", def: "44100", required: true },
        {
          key: "ch", label: "Channels", type: "select",
          options: [{ value: "1", label: "Mono" }, { value: "2", label: "Stereo" }],
        },
        {
          key: "bits", label: "Bit depth", type: "select",
          options: [{ value: "16", label: "16-bit" }, { value: "24", label: "24-bit" }, { value: "32", label: "32-bit float" }],
        },
        { key: "dur", label: "Duration (seconds)", type: "number", def: "60", required: true },
      ]}
      compute={(v) => {
        const rate = req(v, "rate", "Rate");
        if (typeof rate !== "number") return rate;
        const dur = req(v, "dur", "Duration");
        if (typeof dur !== "number") return dur;
        if (rate <= 0 || dur <= 0) return { error: "Rate and duration must be positive." };
        const bytes = pcmSizeBytes(rate, Number(v.ch), Number(v.bits), dur);
        const perMin = pcmSizeBytes(rate, Number(v.ch), Number(v.bits), 60);
        return { rows: [["File size", formatBytes(bytes)], ["Per minute", formatBytes(perMin)]], note: "Uncompressed PCM: rate × channels × bytes × seconds (+44 B header)." };
      }}
    />
  );
}

/* ---------- WAV ---------- */

function readWavHeader(bytes: Uint8Array): [string, string][] | { error: string } {
  if (bytes.length < 44) return { error: "Too small to be a WAV file." };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (o: number, n: number): string => {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(dv.getUint8(o + i));
    return s;
  };
  if (str(0, 4) !== "RIFF" || str(8, 4) !== "WAVE") return { error: "No RIFF/WAVE header — not a WAV file." };
  // Walk chunks to find fmt + data (handles extra chunks like LIST/bext).
  let p = 12;
  let fmt: { audio: number; ch: number; rate: number; bits: number } | null = null;
  let dataLen = 0;
  while (p + 8 <= bytes.length) {
    const id = str(p, 4);
    const len = dv.getUint32(p + 4, true);
    if (id === "fmt " && len >= 16) {
      fmt = { audio: dv.getUint16(p + 8, true), ch: dv.getUint16(p + 10, true), rate: dv.getUint32(p + 12, true), bits: dv.getUint16(p + 22, true) };
    } else if (id === "data") {
      dataLen = len;
    }
    p += 8 + len + (len % 2);
    if (p > bytes.length) break;
    if (fmt && dataLen > 0 && p > 5000) break;
  }
  if (!fmt) return { error: "No format chunk found." };
  const names: Record<number, string> = { 1: "PCM", 3: "IEEE float", 6: "A-law", 7: "µ-law" };
  const dur = fmt.rate > 0 && fmt.ch > 0 ? dataLen / (fmt.rate * fmt.ch * (fmt.bits / 8)) : 0;
  return [
    ["Format", names[fmt.audio] ?? `code ${fmt.audio}`],
    ["Channels", fmt.ch === 1 ? "1 (mono)" : `${fmt.ch}`],
    ["Sample rate", `${fmt.rate} Hz`],
    ["Bit depth", `${fmt.bits}-bit`],
    ["Data size", formatBytes(dataLen)],
    ["Duration", `${dur.toFixed(2)} s`],
  ];
}

function WavInfoTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");
  return (
    <div>
      <FilePick accept=".wav,audio/wav" maxMB={200} onFiles={async (f) => {
        setError("");
        try {
          const buf = new Uint8Array(await (f[0] as File).arrayBuffer());
          const r = readWavHeader(buf);
          if (Array.isArray(r)) setRows(r);
          else {
            setRows(null);
            setError(r.error);
          }
        } catch {
          setRows(null);
          setError("Could not read the file.");
        }
      }} label="Choose WAV file" />
      <Err message={error} />
      {rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Parsed byte-by-byte from the RIFF header — never guessed.</Note>
    </div>
  );
}

function WavConvertTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [msg, setMsg] = useState("");
  const run = () => {
    if (!buffer) return;
    downloadWav(buffer, fileName.replace(/\.[^.]+$/, ""));
    setMsg("Lossless 16-bit WAV downloaded. (MP3/AAC/FLAC encoding needs extra codecs — not faked here.)");
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run}>Convert to WAV</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
    </div>
  );
}

function PcmTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [rows, setRows] = useState<[string, string][] | null>(null);

  const onPick = async (files: File[]) => {
    setRows(null);
    await pick(files);
  };

  useEffect(() => {
    if (!buffer) return;
    const ch = buffer.getChannelData(0);
    let min = 1;
    let max = -1;
    let sum = 0;
    let clip = 0;
    const step = Math.max(1, Math.floor(ch.length / 200000));
    let n = 0;
    for (let i = 0; i < ch.length; i += step) {
      const v = ch[i] as number;
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      if (Math.abs(v) >= 0.999) clip++;
      n++;
    }
    const dc = sum / Math.max(1, n);
    setRows([
      ["Min sample", min.toFixed(6)],
      ["Max sample", max.toFixed(6)],
      ["DC offset", `${dc.toFixed(6)}${Math.abs(dc) > 0.01 ? " — audible offset, consider high-pass" : " — negligible"}`],
      ["Clipped samples", `${clip.toLocaleString()} of ~${n.toLocaleString()} checked`],
    ]);
  }, [buffer]);

  return (
    <div>
      <AudioPick onPick={(f) => void onPick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}

/* ---------- spectrum ---------- */

function FreqTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [at, setAt] = useState("1");
  const [working, setWorking] = useState(false);

  const run = () => {
    if (!buffer) return;
    setWorking(true);
    window.setTimeout(() => {
      try {
        const bins = spectrum(buffer, Number(at) || 1, 4096);
        const sorted = [...bins].sort((a, b) => b.mag - a.mag).slice(0, 5);
        const top = sorted[0];
        setRows([
          ["Dominant", top ? `${top.freq.toFixed(1)} Hz` : "—"],
          ...sorted.slice(1).map((b, i) => [`Peak ${i + 2}`, `${b.freq.toFixed(1)} Hz`] as [string, string]),
          ["Analyzed at", `${Number(at) || 1}s (Hann window)`],
        ]);
      } finally {
        setWorking(false);
      }
    }, 30);
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <div className="mt-3 max-w-[220px]">
            <FieldLabel htmlFor="fq-at">Analyze at (seconds)</FieldLabel>
            <Input id="fq-at" inputMode="decimal" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={run} disabled={working}>{working ? "Analyzing…" : "Analyze frequencies"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          {rows && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function SpectrumTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!buffer || !ref.current) return;
    const bins = spectrum(buffer, 1, 2048).filter((b) => b.freq >= 20 && b.freq <= 20000);
    const max = Math.max(1e-9, ...bins.map((b) => b.mag));
    const c = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 600 * dpr;
    c.height = 220 * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    const dark = document.documentElement.classList.contains("dark");
    g.fillStyle = dark ? "#111a2e" : "#f1f5f9";
    g.fillRect(0, 0, c.width, c.height);
    // Log-frequency axis.
    const lo = Math.log10(20);
    const hi = Math.log10(20000);
    g.fillStyle = "#4f46e5";
    for (const b of bins) {
      const x = ((Math.log10(b.freq) - lo) / (hi - lo)) * c.width;
      const h = (Math.log10(1 + (b.mag / max) * 999) / 3) * c.height * 0.92;
      g.fillRect(x, c.height - h, Math.max(1, c.width / bins.length), h);
    }
    g.fillStyle = dark ? "#a7b4cc" : "#475569";
    g.font = `${10 * dpr}px sans-serif`;
    for (const f of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
      const x = ((Math.log10(f) - lo) / (hi - lo)) * c.width;
      g.fillText(f >= 1000 ? `${f / 1000}k` : String(f), x - 8, c.height - 4);
    }
  }, [buffer]);

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <canvas ref={ref} className="mt-3 w-full rounded-xl border border-(--border)" aria-label="Frequency spectrum" />
          <Note>Log-scale magnitude spectrum (Hann-windowed DFT at 1 s). Peak heights are relative.</Note>
          <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>
        </>
      )}
    </div>
  );
}

function SpectrogramTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const ref = useRef<HTMLCanvasElement>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!buffer || !ref.current) return;
    setWorking(true);
    const id = window.setTimeout(() => {
      try {
        const c = ref.current;
        if (!c || !buffer) return;
        const ch = buffer.getChannelData(0);
        const cols = 220;
        const rows = 96;
        const N = 1024;
        const hop = Math.max(1, Math.floor((ch.length - N) / cols));
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = cols * dpr * 2;
        c.height = rows * dpr * 2;
        const g = c.getContext("2d");
        if (!g) return;
        const px = c.width / cols;
        const py = c.height / rows;
        for (let col = 0; col < cols; col++) {
          const start = col * hop;
          for (let r = 0; r < rows; r++) {
            const k = 2 + Math.floor((r / rows) * 200);
            let re = 0;
            let im = 0;
            for (let i = 0; i < N; i += 4) {
              const idx = (start + i) % ch.length;
              const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
              const s = (ch[idx] as number) * w;
              const a = (2 * Math.PI * k * i) / N;
              re += s * Math.cos(a);
              im -= s * Math.sin(a);
            }
            const mag = Math.sqrt(re * re + im * im) / N;
            const v = Math.min(1, Math.log10(1 + mag * 400) / 2);
            const hue = 230 - v * 230;
            g.fillStyle = v < 0.03 ? "#0b1220" : `hsl(${hue},85%,${20 + v * 35}%)`;
            g.fillRect(col * px, c.height - (r + 1) * py, px + 0.5, py + 0.5);
          }
        }
      } finally {
        setWorking(false);
      }
    }, 40);
    return () => window.clearTimeout(id);
  }, [buffer]);

  const download = () => {
    const c = ref.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "spectrogram.png";
    a.click();
  };

  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <canvas ref={ref} className="mt-3 w-full rounded-xl border border-(--border)" aria-label="Spectrogram" />
          {working && <Note>Rendering spectrogram… (long files take a few seconds)</Note>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={download}>Download PNG</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
          <Note>Low frequencies at the bottom. Files over ~3 minutes are analyzed from the start.</Note>
        </>
      )}
    </div>
  );
}

/* ---------- recorders ---------- */

interface Take {
  url: string;
  blob: Blob;
  secs: number;
  at: string;
}

function useRecorder() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<{ ctx: AudioContext; an: AnalyserNode } | null>(null);
  const startRef = useRef(0);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (analyserRef.current) {
      void analyserRef.current.ctx.close();
      analyserRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => {
    try {
      mrRef.current?.state !== "inactive" && mrRef.current?.stop();
    } catch {
      /* ignore */
    }
    stopTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = () => {
    setElapsed((Date.now() - startRef.current) / 1000);
    const an = analyserRef.current?.an;
    if (an) {
      const arr = new Uint8Array(an.fftSize);
      an.getByteTimeDomainData(arr);
      let peak = 0;
      for (const v of arr) {
        const d = Math.abs((v as number) - 128) / 128;
        if (d > peak) peak = d;
      }
      setLevel(peak);
    }
  };

  const start = async (mime?: string) => {
    setError("");
    if (typeof MediaRecorder === "undefined") {
      setError("Recording is not supported in this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const opts = mime ? { mimeType: mime } : undefined;
      const mr = opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setTakes((p) => [...p, { url, blob, secs: (Date.now() - startRef.current) / 1000, at: new Date().toLocaleTimeString() }]);
        stopTracks();
        setRecording(false);
        setPaused(false);
      };
      // Level meter.
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        src.connect(an);
        analyserRef.current = { ctx, an };
      } catch {
        /* meter optional */
      }
      startRef.current = Date.now();
      mr.start(250);
      setElapsed(0);
      setLevel(0);
      setRecording(true);
      setPaused(false);
      timerRef.current = window.setInterval(tick, 200);
      return true;
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow access in the browser prompt and try again."
          : "Could not start recording — no microphone found or access blocked.",
      );
      stopTracks();
      return false;
    }
  };

  const pauseToggle = () => {
    const mr = mrRef.current;
    if (!mr) return;
    try {
      if (mr.state === "recording") {
        mr.pause();
        setPaused(true);
      } else if (mr.state === "paused") {
        mr.resume();
        setPaused(false);
      }
    } catch {
      /* ignore */
    }
  };

  const stop = () => {
    try {
      mrRef.current?.state !== "inactive" && mrRef.current?.stop();
    } catch {
      setRecording(false);
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearTakes = () => {
    takes.forEach((t) => URL.revokeObjectURL(t.url));
    setTakes([]);
  };

  return { takes, recording, paused, elapsed, error, level, start, stop, pauseToggle, clearTakes };
}

function RecorderButtons({ r, allowPause = true }: { r: ReturnType<typeof useRecorder>; allowPause?: boolean }) {
  const mm = Math.floor(r.elapsed / 60);
  const ss = Math.floor(r.elapsed % 60);
  return (
    <div>
      <div aria-live="polite" className="rounded-2xl bg-(--surface-2) px-5 py-4 text-center">
        <p className="text-4xl font-extrabold tabular-nums">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </p>
        <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-(--border)" role="meter" aria-valuenow={Math.round(r.level * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Input level">
          <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, r.level * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-(--muted)">{r.recording ? (r.paused ? "Paused" : "Recording…") : "Idle"}</p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {!r.recording ? (
          <Button type="button" onClick={() => void r.start()}>Start recording</Button>
        ) : (
          <>
            {allowPause && (
              <Button type="button" variant="secondary" onClick={r.pauseToggle}>{r.paused ? "Resume" : "Pause"}</Button>
            )}
            <Button type="button" onClick={r.stop}>Stop & keep take</Button>
          </>
        )}
      </div>
      <Err message={r.error} />
    </div>
  );
}

function TakesList({ takes, onClear }: { takes: Take[]; onClear: () => void }) {
  if (takes.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-bold">Takes this session ({takes.length})</p>
      <ul className="mt-2 space-y-2">
        {takes.map((t, i) => (
          <li key={i} className="flex items-center gap-2 rounded-xl border border-(--border) px-3 py-2 text-sm">
            <span className="flex-1 tabular-nums">Take {i + 1} · {formatTime(t.secs)} · {formatBytes(t.blob.size)} · {t.at}</span>
            <audio src={t.url} controls preload="none" className="h-9 max-w-[180px]" />
            <a
              href={t.url}
              download={`take-${i + 1}.${(t.blob.type.split("/")[1] ?? "webm").split(";")[0]}`}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Save
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <Button type="button" variant="ghost" onClick={onClear}>Discard takes</Button>
      </div>
    </div>
  );
}

function VoiceRecorderTool() {
  const r = useRecorder();
  return (
    <div>
      <RecorderButtons r={r} />
      <TakesList takes={r.takes} onClear={r.clearTakes} />
      <Note>Microphone permission is requested normally by the browser. Takes stay in this session — save the ones you need.</Note>
    </div>
  );
}

function RecorderTimerTool() {
  const r = useRecorder();
  const [limit, setLimit] = useState("60");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed || !r.recording) return;
    const s = Math.max(5, Math.min(3600, Number(limit) || 60));
    if (r.elapsed >= s) {
      r.stop();
      setArmed(false);
    }
  }, [r, armed, limit]);

  return (
    <div>
      <div className="mb-3 max-w-[220px]">
        <FieldLabel htmlFor="rt-s">Auto-stop after (seconds)</FieldLabel>
        <Input id="rt-s" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </div>
      {!r.recording ? (
        <Button type="button" onClick={() => { setArmed(true); void r.start(); }}>Start timed recording</Button>
      ) : (
        <RecorderButtons r={r} allowPause={false} />
      )}
      {armed && r.recording && <Note>Will stop automatically at {limit} s.</Note>}
      <TakesList takes={r.takes} onClear={r.clearTakes} />
    </div>
  );
}

function TakesTool() {
  const r = useRecorder();
  const [copied, copy] = useCopied();
  return (
    <div>
      {!r.recording ? (
        <Button type="button" onClick={() => void r.start()}>Record a take</Button>
      ) : (
        <RecorderButtons r={r} />
      )}
      <TakesList takes={r.takes} onClear={r.clearTakes} />
      {r.takes.length > 0 && (
        <div className="mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => copy(r.takes.map((t, i) => `Take ${i + 1}: ${formatTime(t.secs)}, ${formatBytes(t.blob.size)}, ${t.blob.type}`).join("\n"))}
          >
            {copied ? "Copied!" : "Copy take list"}
          </Button>
        </div>
      )}
      <Note>Session-only storage — takes vanish when you leave the page. Save what matters.</Note>
    </div>
  );
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
];

function FormatProbeTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      setRows([["Support", "MediaRecorder unavailable in this browser"]]);
      return;
    }
    setRows(MIME_CANDIDATES.map((m) => {
      let ok = false;
      try {
        ok = MediaRecorder.isTypeSupported(m);
      } catch {
        ok = false;
      }
      return [m, ok ? "Supported ✓" : "Not supported"] as [string, string];
    }));
  }, []);
  return (
    <div>
      {rows && (
        <dl className="divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="font-mono text-xs">{k}</dt>
              <dd className={v.startsWith("Supported") ? "font-semibold text-emerald-600" : "text-(--muted)"}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Recommendation: prefer the first supported entry — opus in WebM gives the best quality per byte. Convert to WAV anytime with the WAV Converter.</Note>
    </div>
  );
}

/* ---------- rate inspector ---------- */

function RateInspectTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [device, setDevice] = useState<number | null>(null);

  const onPick = async (files: File[]) => {
    await pick(files);
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      setDevice(ctx.sampleRate);
      void ctx.close();
    } catch {
      setDevice(null);
    }
  };

  return (
    <div>
      <AudioPick onPick={(f) => void onPick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3">
          <Stat label="File rate" value={`${info.sampleRate} Hz`} />
          <Stat label="Device rate" value={device ? `${device} Hz` : "unknown"} />
        </div>
      )}
      {buffer && info && device && (
        <Note>
          {device === info.sampleRate
            ? "Rates match — playback needs no resampling."
            : `Playback resamples ${info.sampleRate} → ${device} Hz automatically (inaudible for quality audio).`}
        </Note>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
    </div>
  );
}
