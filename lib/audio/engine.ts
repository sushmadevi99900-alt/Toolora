/* Reusable browser audio engine: decode, analyse, transform, export.
   Everything runs locally with Web Audio APIs. No uploads. */

export interface AudioInfo {
  durationSec: number;
  sampleRate: number;
  channels: number;
  samples: number;
  peak: number;
  rms: number;
}

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const ab = await file.arrayBuffer();
  // decodeAudioData detaches the buffer; copy first.
  const copy = ab.slice(0);
  return await ctx().decodeAudioData(copy);
}

export function bufferInfo(buf: AudioBuffer): AudioInfo {
  let peak = 0;
  let sum = 0;
  let total = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i += 7) {
      const v = Math.abs(d[i] as number);
      if (v > peak) peak = v;
      sum += (d[i] as number) * (d[i] as number);
      total++;
    }
  }
  return {
    durationSec: buf.duration,
    sampleRate: buf.sampleRate,
    channels: buf.numberOfChannels,
    samples: buf.length,
    peak,
    rms: total ? Math.sqrt(sum / total) : 0,
  };
}

export function cloneBuffer(buf: AudioBuffer): AudioBuffer {
  const out = new AudioBuffer({
    length: buf.length,
    sampleRate: buf.sampleRate,
    numberOfChannels: buf.numberOfChannels,
  });
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.copyToChannel(buf.getChannelData(c), c);
  }
  return out;
}

export function applyGain(buf: AudioBuffer, gain: number): AudioBuffer {
  const out = cloneBuffer(buf);
  for (let c = 0; c < out.numberOfChannels; c++) {
    const d = out.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = Math.max(-1, Math.min(1, (d[i] as number) * gain));
  }
  return out;
}

export function applyFade(buf: AudioBuffer, fadeInSec: number, fadeOutSec: number): AudioBuffer {
  const out = cloneBuffer(buf);
  const sr = out.sampleRate;
  const inN = Math.min(out.length, Math.floor(fadeInSec * sr));
  const outN = Math.min(out.length, Math.floor(fadeOutSec * sr));
  for (let c = 0; c < out.numberOfChannels; c++) {
    const d = out.getChannelData(c);
    for (let i = 0; i < inN; i++) d[i] = (d[i] as number) * (i / Math.max(1, inN));
    for (let i = 0; i < outN; i++) {
      const idx = out.length - 1 - i;
      d[idx] = (d[idx] as number) * (i / Math.max(1, outN));
    }
  }
  return out;
}

export function normalizeBuffer(buf: AudioBuffer, targetPeak = 0.99): AudioBuffer {
  const info = bufferInfo(buf);
  if (info.peak < 1e-6) return cloneBuffer(buf);
  return applyGain(buf, targetPeak / info.peak);
}

export function reverseBuffer(buf: AudioBuffer): AudioBuffer {
  const out = cloneBuffer(buf);
  for (let c = 0; c < out.numberOfChannels; c++) {
    out.getChannelData(c).reverse();
  }
  return out;
}

export function trimBuffer(buf: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sr = buf.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(buf.length, Math.floor(endSec * sr));
  if (end <= start) throw new Error("End time must be after start time.");
  const out = new AudioBuffer({ length: end - start, sampleRate: sr, numberOfChannels: buf.numberOfChannels });
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.copyToChannel(buf.getChannelData(c).subarray(start, end), c);
  }
  return out;
}

/** Speed change via resampling (also shifts pitch — reported honestly in UI). */
export async function changeSpeed(buf: AudioBuffer, rate: number): Promise<AudioBuffer> {
  if (!(rate > 0.1 && rate < 8)) throw new Error("Rate must be between 0.1× and 8×.");
  const offline = new OfflineAudioContext(
    buf.numberOfChannels,
    Math.max(1, Math.floor(buf.length / rate)),
    buf.sampleRate,
  );
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

/** Naïve independent pitch shift via resample + duration restore (phase-vocoder-free). */
export async function changePitch(buf: AudioBuffer, semitones: number): Promise<AudioBuffer> {
  if (!(semitones >= -12 && semitones <= 12)) throw new Error("Pitch shift is limited to ±12 semitones.");
  const rate = Math.pow(2, semitones / 12);
  const sped = await changeSpeed(buf, rate);
  // Restore original duration by resampling back (simple linear interpolation).
  const out = new AudioBuffer({ length: buf.length, sampleRate: buf.sampleRate, numberOfChannels: buf.numberOfChannels });
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = sped.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < dst.length; i++) {
      const pos = (i * (src.length - 1)) / Math.max(1, dst.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.min(src.length - 1, lo + 1);
      const f = pos - lo;
      dst[i] = (src[lo] as number) * (1 - f) + (src[hi] as number) * f;
    }
  }
  return out;
}

export function stereoToMono(buf: AudioBuffer): AudioBuffer {
  if (buf.numberOfChannels === 1) return cloneBuffer(buf);
  const out = new AudioBuffer({ length: buf.length, sampleRate: buf.sampleRate, numberOfChannels: 1 });
  const dst = out.getChannelData(0);
  const chans: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) chans.push(buf.getChannelData(c));
  for (let i = 0; i < dst.length; i++) {
    let s = 0;
    for (const ch of chans) s += ch[i] as number;
    dst[i] = s / chans.length;
  }
  return out;
}

export function monoToStereo(buf: AudioBuffer): AudioBuffer {
  if (buf.numberOfChannels >= 2) return cloneBuffer(buf);
  const out = new AudioBuffer({ length: buf.length, sampleRate: buf.sampleRate, numberOfChannels: 2 });
  const src = buf.getChannelData(0);
  out.copyToChannel(src, 0);
  out.copyToChannel(src, 1);
  return out;
}

export function balanceLR(buf: AudioBuffer, balance: number): AudioBuffer {
  // balance -1 (full left) .. +1 (full right)
  const stereo = buf.numberOfChannels >= 2 ? cloneBuffer(buf) : monoToStereo(buf);
  const left = stereo.getChannelData(0);
  const right = stereo.getChannelData(1);
  const lg = balance <= 0 ? 1 : 1 - balance;
  const rg = balance >= 0 ? 1 : 1 + balance;
  for (let i = 0; i < stereo.length; i++) {
    left[i] = (left[i] as number) * lg;
    right[i] = (right[i] as number) * rg;
  }
  return stereo;
}

export interface SilenceRegion {
  start: number;
  end: number;
}

export function detectSilence(buf: AudioBuffer, thresholdDb = -45, minSec = 0.5): SilenceRegion[] {
  const threshold = Math.pow(10, thresholdDb / 20);
  const sr = buf.sampleRate;
  const mono = buf.numberOfChannels === 1 ? buf.getChannelData(0) : null;
  const ch0 = mono ?? buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
  const win = Math.floor(sr * 0.05);
  const regions: SilenceRegion[] = [];
  let start: number | null = null;
  for (let i = 0; i < buf.length; i += win) {
    let peak = 0;
    const end = Math.min(buf.length, i + win);
    for (let j = i; j < end; j += 4) {
      const v = Math.max(Math.abs(ch0[j] as number), Math.abs(ch1[j] as number));
      if (v > peak) peak = v;
    }
    if (peak < threshold) {
      if (start === null) start = i / sr;
    } else if (start !== null) {
      const e = i / sr;
      if (e - start >= minSec) regions.push({ start, end: e });
      start = null;
    }
  }
  if (start !== null && buf.duration - start >= minSec) regions.push({ start, end: buf.duration });
  return regions;
}

export function removeSilence(buf: AudioBuffer, thresholdDb = -45, minSec = 0.3, padSec = 0.1): AudioBuffer {
  const regions = detectSilence(buf, thresholdDb, minSec);
  if (regions.length === 0) return cloneBuffer(buf);
  const sr = buf.sampleRate;
  const keep: [number, number][] = [];
  let cursor = 0;
  for (const r of regions) {
    const rs = Math.max(0, Math.floor((r.start - padSec) * sr));
    const re = Math.min(buf.length, Math.floor((r.end + padSec) * sr));
    if (rs > cursor) keep.push([cursor, rs]);
    cursor = Math.max(cursor, re);
  }
  if (cursor < buf.length) keep.push([cursor, buf.length]);
  if (keep.length === 0) throw new Error("The whole file is silence at this threshold.");
  const total = keep.reduce((n, [a, b]) => n + (b - a), 0);
  const out = new AudioBuffer({ length: total, sampleRate: sr, numberOfChannels: buf.numberOfChannels });
  let off = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c);
    const dst = out.getChannelData(c);
    for (const [a, b] of keep) {
      dst.set(src.subarray(a, b), off);
      if (c === 0) off += b - a;
    }
  }
  return out;
}

/** Downsampled peak waveform for canvas rendering. */
export function waveformPeaks(buf: AudioBuffer, columns = 240): number[] {
  const ch = buf.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / columns));
  const peaks: number[] = [];
  for (let i = 0; i < ch.length; i += step) {
    let p = 0;
    const end = Math.min(ch.length, i + step);
    for (let j = i; j < end; j += Math.max(1, Math.floor(step / 32))) {
      const v = Math.abs(ch[j] as number);
      if (v > p) p = v;
    }
    peaks.push(Math.min(1, p));
  }
  return peaks;
}

/** Small DFT spectrum (for analysers). Returns magnitudes for bins 0..n/2. */
export function spectrum(buf: AudioBuffer, seconds = 1, n = 2048): { freq: number; mag: number }[] {
  const ch = buf.getChannelData(0);
  const start = Math.min(ch.length - 1, Math.floor(seconds * buf.sampleRate));
  const N = Math.min(n, 4096);
  const out: { freq: number; mag: number }[] = [];
  for (let k = 0; k < N / 2; k += 4) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const idx = (start + i) % ch.length;
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N); // Hann
      const s = (ch[idx] as number) * w;
      const a = (2 * Math.PI * k * i) / N;
      re += s * Math.cos(a);
      im -= s * Math.sin(a);
    }
    out.push({ freq: (k * buf.sampleRate) / N, mag: Math.sqrt(re * re + im * im) / N });
  }
  return out;
}

/** Apply a simple offline effect chain. Supported: bass, treble, reverb-ish (feedback delay), distortion. */
export async function applyEffect(
  buf: AudioBuffer,
  kind: "bass" | "treble" | "echo" | "distortion" | "compressor",
  amount: number,
): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
  const src = offline.createBufferSource();
  src.buffer = buf;
  let head: AudioNode = src;
  if (kind === "bass" || kind === "treble") {
    const f = offline.createBiquadFilter();
    f.type = kind === "bass" ? "lowshelf" : "highshelf";
    f.frequency.value = kind === "bass" ? 200 : 4000;
    f.gain.value = Math.max(-24, Math.min(24, amount));
    head.connect(f);
    head = f;
  } else if (kind === "echo") {
    const delay = offline.createDelay(2);
    delay.delayTime.value = 0.28;
    const fb = offline.createGain();
    fb.gain.value = Math.max(0, Math.min(0.85, amount));
    const wet = offline.createGain();
    wet.gain.value = 0.5;
    head.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(offline.destination);
  } else if (kind === "distortion") {
    const ws = offline.createWaveShaper();
    const k = Math.max(1, Math.min(100, amount));
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 512) - 1;
      curve[i] = Math.tanh(k * x);
    }
    ws.curve = curve;
    head.connect(ws);
    head = ws;
  } else {
    const comp = offline.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = Math.max(1, Math.min(20, amount));
    head.connect(comp);
    head = comp;
  }
  head.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

function floatTo16(dst: DataView, offset: number, ch: Float32Array) {
  for (let i = 0; i < ch.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, ch[i] as number));
    dst.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

/** Encode AudioBuffer as 16-bit PCM WAV. MP3/AAC/FLAC are NOT faked — WAV only. */
export function encodeWav(buf: AudioBuffer): Blob {
  const nCh = Math.min(2, buf.numberOfChannels);
  const dataLen = buf.length * nCh * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const v = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nCh, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * nCh * 2, true);
  v.setUint16(32, nCh * 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, dataLen, true);
  if (nCh === 1) {
    floatTo16(v, 44, buf.getChannelData(0));
  } else {
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
    let off = 44;
    for (let i = 0; i < buf.length; i++, off += 4) {
      const sl = Math.max(-1, Math.min(1, l[i] as number));
      const sr = Math.max(-1, Math.min(1, r[i] as number));
      v.setInt16(off, sl < 0 ? sl * 0x8000 : sl * 0x7fff, true);
      v.setInt16(off + 2, sr < 0 ? sr * 0x8000 : sr * 0x7fff, true);
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[u]}`;
}

/** Estimate audio file size for PCM: rate × channels × bytesPerSample × seconds. */
export function pcmSizeBytes(sampleRate: number, channels: number, bits: number, seconds: number): number {
  return Math.floor(sampleRate * channels * (bits / 8) * seconds);
}

/* ---------- synthesis (all real sample math, exported as WAV) ---------- */

export type WaveKind = "sine" | "square" | "triangle" | "sawtooth";

export function synthesizeWave(
  kind: WaveKind,
  freqHz: number,
  seconds: number,
  sampleRate = 44100,
  volume = 0.8,
): AudioBuffer {
  if (!Number.isFinite(freqHz) || freqHz < 20 || freqHz > 20000) throw new Error("Frequency must be 20–20000 Hz.");
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error("Duration must be 0–600 seconds.");
  const len = Math.floor(seconds * sampleRate);
  const buf = new AudioBuffer({ length: len, sampleRate, numberOfChannels: 1 });
  const d = buf.getChannelData(0);
  const v = Math.max(0.01, Math.min(1, volume));
  for (let i = 0; i < len; i++) {
    const ph = ((i * freqHz) / sampleRate) % 1;
    let s: number;
    if (kind === "sine") s = Math.sin(2 * Math.PI * ph);
    else if (kind === "square") s = ph < 0.5 ? 1 : -1;
    else if (kind === "triangle") s = 4 * Math.abs(ph - 0.5) - 1;
    else s = 2 * ph - 1;
    // 5 ms edge fades to avoid clicks
    const edge = Math.min(1, i / (sampleRate * 0.005), (len - 1 - i) / (sampleRate * 0.005));
    d[i] = s * v * Math.max(0, edge);
  }
  return buf;
}

export function synthesizeWhiteNoise(seconds: number, sampleRate = 44100, volume = 0.5): AudioBuffer {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error("Duration must be 0–600 seconds.");
  const len = Math.floor(seconds * sampleRate);
  const buf = new AudioBuffer({ length: len, sampleRate, numberOfChannels: 1 });
  const d = buf.getChannelData(0);
  const v = Math.max(0.01, Math.min(1, volume));
  let seed = 123456789;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff; // deterministic LCG — reproducible noise
    d[i] = ((seed / 0x3fffffff) - 1) * v;
  }
  return buf;
}

export function synthesizePinkNoise(seconds: number, sampleRate = 44100, volume = 0.5): AudioBuffer {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600) throw new Error("Duration must be 0–600 seconds.");
  const len = Math.floor(seconds * sampleRate);
  const buf = new AudioBuffer({ length: len, sampleRate, numberOfChannels: 1 });
  const d = buf.getChannelData(0);
  const v = Math.max(0.01, Math.min(1, volume));
  // Paul Kellet's refined pink-noise filter — real 1/f approximation.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };
  for (let i = 0; i < len; i++) {
    const w = rnd();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
    d[i] = Math.max(-1, Math.min(1, pink * 3)) * v;
  }
  return buf;
}

export function synthesizeSilence(seconds: number, sampleRate = 44100, channels = 1): AudioBuffer {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error("Duration must be 0–3600 seconds.");
  const ch = Math.min(2, Math.max(1, Math.floor(channels)));
  return new AudioBuffer({ length: Math.floor(seconds * sampleRate), sampleRate, numberOfChannels: ch });
}

export interface BeepPattern {
  freqHz: number;
  beepMs: number;
  gapMs: number;
  count: number;
}

export function synthesizeBeeps(p: BeepPattern, sampleRate = 44100): AudioBuffer {
  const { freqHz, beepMs, gapMs, count } = p;
  if (count < 1 || count > 500) throw new Error("Count must be 1–500.");
  if (beepMs < 20 || beepMs > 5000 || gapMs < 0 || gapMs > 10000) throw new Error("Beep/gap lengths out of range.");
  const beepN = Math.floor((beepMs / 1000) * sampleRate);
  const gapN = Math.floor((gapMs / 1000) * sampleRate);
  const total = count * beepN + (count - 1) * gapN;
  const buf = new AudioBuffer({ length: total, sampleRate, numberOfChannels: 1 });
  const d = buf.getChannelData(0);
  const fade = Math.floor(sampleRate * 0.005);
  for (let b = 0; b < count; b++) {
    const off = b * (beepN + gapN);
    for (let i = 0; i < beepN; i++) {
      const env = Math.min(1, i / Math.max(1, fade), (beepN - 1 - i) / Math.max(1, fade));
      d[off + i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate) * 0.8 * Math.max(0, env);
    }
  }
  return buf;
}

export function synthesizeMetronome(bpm: number, beats: number, sampleRate = 44100): AudioBuffer {
  if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300) throw new Error("BPM must be 20–300.");
  if (!Number.isFinite(beats) || beats < 1 || beats > 1000) throw new Error("Beats must be 1–1000.");
  const interval = 60 / bpm;
  const total = Math.ceil(beats * interval * sampleRate) + sampleRate;
  const buf = new AudioBuffer({ length: total, sampleRate, numberOfChannels: 1 });
  const d = buf.getChannelData(0);
  const click = (at: number, freq: number) => {
    const n = Math.floor(0.06 * sampleRate);
    for (let i = 0; i < n && at + i < total; i++) {
      const env = Math.exp(-i / (sampleRate * 0.008));
      d[at + i] += Math.sin((2 * Math.PI * freq * i) / sampleRate) * env * 0.9;
    }
  };
  for (let b = 0; b < beats; b++) click(Math.floor(b * interval * sampleRate), b % 4 === 0 ? 1760 : 880);
  return buf;
}

export interface Adsr {
  attackSec: number;
  decaySec: number;
  sustainLevel: number;
  releaseSec: number;
}

export function applyAdsrToTone(freqHz: number, seconds: number, adsr: Adsr, sampleRate = 44100): AudioBuffer {
  const buf = synthesizeWave("sine", freqHz, seconds, sampleRate, 1);
  const d = buf.getChannelData(0);
  const { attackSec, decaySec, sustainLevel, releaseSec } = adsr;
  if ([attackSec, decaySec, releaseSec].some((v) => !Number.isFinite(v) || v < 0 || v > 60)) {
    throw new Error("ADSR times must be 0–60 s.");
  }
  if (!Number.isFinite(sustainLevel) || sustainLevel < 0 || sustainLevel > 1) throw new Error("Sustain must be 0–1.");
  const a = Math.floor(attackSec * sampleRate);
  const dc = Math.floor(decaySec * sampleRate);
  const r = Math.floor(releaseSec * sampleRate);
  const n = d.length;
  for (let i = 0; i < n; i++) {
    let env: number;
    if (i < a) env = a === 0 ? 1 : i / a;
    else if (i < a + dc) env = dc === 0 ? sustainLevel : 1 - (1 - sustainLevel) * ((i - a) / dc);
    else if (i < n - r) env = sustainLevel;
    else env = r === 0 ? 0 : sustainLevel * Math.max(0, (n - 1 - i) / r);
    d[i] = (d[i] as number) * env * 0.8;
  }
  return buf;
}

/* ---------- filters / spatial (real OfflineAudioContext DSP) ---------- */

export type BiquadKind = "lowpass" | "highpass" | "bandpass" | "notch";

export async function applyBiquad(
  buf: AudioBuffer,
  kind: BiquadKind,
  freqHz: number,
  q = 0.9,
): Promise<AudioBuffer> {
  if (!Number.isFinite(freqHz) || freqHz < 20 || freqHz > 20000) throw new Error("Cutoff must be 20–20000 Hz.");
  if (!Number.isFinite(q) || q <= 0 || q > 20) throw new Error("Q must be 0–20.");
  const offline = new OfflineAudioContext(buf.numberOfChannels, buf.length, buf.sampleRate);
  const src = offline.createBufferSource();
  src.buffer = buf;
  const f = offline.createBiquadFilter();
  f.type = kind;
  f.frequency.value = freqHz;
  f.Q.value = q;
  src.connect(f);
  f.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

export async function applyStereoPan(buf: AudioBuffer, pan: number): Promise<AudioBuffer> {
  if (!Number.isFinite(pan) || pan < -1 || pan > 1) throw new Error("Pan must be −1…+1.");
  const offline = new OfflineAudioContext(2, buf.length, buf.sampleRate);
  const src = offline.createBufferSource();
  src.buffer = buf;
  const p = offline.createStereoPanner();
  p.pan.value = pan;
  src.connect(p);
  p.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

/** Mid/side width: 0 = mono, 1 = original, 2 = extra wide. Real sample math. */
export function applyStereoWidth(buf: AudioBuffer, width: number): AudioBuffer {
  if (!Number.isFinite(width) || width < 0 || width > 2) throw new Error("Width must be 0–2.");
  const stereo = buf.numberOfChannels >= 2 ? cloneBuffer(buf) : monoToStereo(buf);
  const l = stereo.getChannelData(0);
  const r = stereo.getChannelData(1);
  for (let i = 0; i < stereo.length; i++) {
    const li = l[i] as number;
    const ri = r[i] as number;
    const mid = (li + ri) / 2;
    const sideL = li - mid;
    const sideR = ri - mid;
    l[i] = Math.max(-1, Math.min(1, mid + sideL * width));
    r[i] = Math.max(-1, Math.min(1, mid + sideR * width));
  }
  return stereo;
}

/* ---------- edit helpers ---------- */

export function crossfadeBuffers(a: AudioBuffer, b: AudioBuffer, fadeSec: number): AudioBuffer {
  if (fadeSec < 0 || fadeSec > 60) throw new Error("Crossfade must be 0–60 s.");
  const sr = a.sampleRate;
  if (b.sampleRate !== sr) throw new Error("Both files must share the same sample rate for a sample-accurate crossfade.");
  const fadeN = Math.min(a.length, b.length, Math.floor(fadeSec * sr));
  const ch = Math.max(a.numberOfChannels, b.numberOfChannels);
  const get = (buf: AudioBuffer, c: number) =>
    buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
  const out = new AudioBuffer({ length: a.length + b.length - fadeN, sampleRate: sr, numberOfChannels: ch });
  for (let c = 0; c < ch; c++) {
    const dst = out.getChannelData(c);
    const ad = get(a, c);
    const bd = get(b, c);
    dst.set(ad.subarray(0, a.length - fadeN), 0);
    for (let i = 0; i < fadeN; i++) {
      const t = fadeN <= 1 ? 1 : i / (fadeN - 1);
      dst[a.length - fadeN + i] = ad[a.length - fadeN + i] as number * (1 - t) + (bd[i] as number) * t;
    }
    dst.set(bd.subarray(fadeN), a.length);
  }
  return out;
}

export function splitBuffer(buf: AudioBuffer, parts: number): AudioBuffer[] {
  if (!Number.isInteger(parts) || parts < 2 || parts > 32) throw new Error("Split into 2–32 parts.");
  const out: AudioBuffer[] = [];
  const per = Math.floor(buf.length / parts);
  for (let p = 0; p < parts; p++) {
    const start = p * per;
    const end = p === parts - 1 ? buf.length : (p + 1) * per;
    const seg = new AudioBuffer({ length: end - start, sampleRate: buf.sampleRate, numberOfChannels: buf.numberOfChannels });
    for (let c = 0; c < buf.numberOfChannels; c++) seg.copyToChannel(buf.getChannelData(c).subarray(start, end), c);
    out.push(seg);
  }
  return out;
}

export function extractChannel(buf: AudioBuffer, channel: number): AudioBuffer {
  if (!Number.isInteger(channel) || channel < 0 || channel >= buf.numberOfChannels) {
    throw new Error(`Channel must be 0–${buf.numberOfChannels - 1}.`);
  }
  const out = new AudioBuffer({ length: buf.length, sampleRate: buf.sampleRate, numberOfChannels: 1 });
  out.copyToChannel(buf.getChannelData(channel), 0);
  return out;
}

export function mergeToStereo(a: AudioBuffer, b: AudioBuffer): AudioBuffer {
  if (a.sampleRate !== b.sampleRate) throw new Error("Both files must share the same sample rate.");
  const len = Math.max(a.length, b.length);
  const out = new AudioBuffer({ length: len, sampleRate: a.sampleRate, numberOfChannels: 2 });
  const l = out.getChannelData(0);
  const r = out.getChannelData(1);
  l.set(a.getChannelData(0).subarray(0, Math.min(len, a.length)), 0);
  r.set(b.getChannelData(0).subarray(0, Math.min(len, b.length)), 0);
  return out;
}

/* ---------- measurement helpers ---------- */

export interface PeakEvent {
  timeSec: number;
  value: number;
}

export function detectPeakEvents(buf: AudioBuffer, thresholdDb = -6, limit = 50): PeakEvent[] {
  const thr = Math.pow(10, thresholdDb / 20);
  const ch = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const out: PeakEvent[] = [];
  const minGap = Math.floor(sr * 0.1);
  let last = -minGap;
  for (let i = 0; i < ch.length && out.length < limit; i++) {
    if (Math.abs(ch[i] as number) >= thr && i - last >= minGap) {
      out.push({ timeSec: i / sr, value: ch[i] as number });
      last = i;
    }
  }
  return out;
}

export function channelBalance(buf: AudioBuffer): { leftRms: number; rightRms: number; ratioDb: number } {
  const rms = (d: Float32Array) => {
    let s = 0;
    const step = Math.max(1, Math.floor(d.length / 200000));
    let n = 0;
    for (let i = 0; i < d.length; i += step) {
      s += (d[i] as number) * (d[i] as number);
      n++;
    }
    return Math.sqrt(s / Math.max(1, n));
  };
  const l = rms(buf.getChannelData(0));
  const r = buf.numberOfChannels > 1 ? rms(buf.getChannelData(1)) : l;
  return { leftRms: l, rightRms: r, ratioDb: 20 * Math.log10(Math.max(1e-9, l) / Math.max(1e-9, r)) };
}

export function frequencyHistogram(buf: AudioBuffer, bands = 12): { label: string; energy: number }[] {
  const spec = spectrum(buf, Math.min(5, buf.duration / 2), 4096);
  const edges = [0, 100, 250, 500, 1000, 2000, 4000, 6000, 8000, 10000, 12000, 15000, 22050];
  const out = [];
  for (let b = 0; b < Math.min(bands, edges.length - 1); b++) {
    let e = 0;
    for (const s of spec) {
      if (s.freq >= (edges[b] as number) && s.freq < (edges[b + 1] as number)) e += s.mag * s.mag;
    }
    out.push({ label: `${edges[b]}–${edges[b + 1]} Hz`, energy: e });
  }
  const max = Math.max(1e-12, ...out.map((o) => o.energy));
  return out.map((o) => ({ ...o, energy: o.energy / max }));
}

export function crestFactorDb(buf: AudioBuffer): number {
  const info = bufferInfo(buf);
  if (info.rms < 1e-9) throw new Error("Audio is silent — dynamic range is undefined.");
  return 20 * Math.log10(Math.max(1e-9, info.peak) / info.rms);
}

/* ---------- raw PCM import/export (honest, format-explicit) ---------- */

export function encodePcmRaw(buf: AudioBuffer, bits: 8 | 16 = 16): Blob {
  const ch = buf.getChannelData(0);
  if (bits === 16) {
    const ab = new ArrayBuffer(ch.length * 2);
    const v = new DataView(ab);
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i] as number));
      v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([ab], { type: "application/octet-stream" });
  }
  const ab = new ArrayBuffer(ch.length);
  const v = new DataView(ab);
  for (let i = 0; i < ch.length; i++) v.setUint8(i, Math.round(((ch[i] as number) * 0.5 + 0.5) * 255));
  return new Blob([ab], { type: "application/octet-stream" });
}

export async function decodePcmRaw(
  file: File | Blob,
  sampleRate: number,
  channels: 1 | 2,
  bits: 8 | 16,
): Promise<AudioBuffer> {
  if (!Number.isFinite(sampleRate) || sampleRate < 3000 || sampleRate > 192000) {
    throw new Error("Sample rate must be 3000–192000 Hz.");
  }
  const ab = await file.arrayBuffer();
  const v = new DataView(ab);
  const bytesPer = bits / 8;
  const frames = Math.floor(ab.byteLength / (bytesPer * channels));
  if (frames < 1) throw new Error("File has no complete PCM frames with these settings.");
  if (frames > sampleRate * 3600) throw new Error("Decoded audio would exceed 1 hour.");
  const buf = new AudioBuffer({ length: frames, sampleRate, numberOfChannels: channels });
  for (let c = 0; c < channels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < frames; i++) {
      const off = (i * channels + c) * bytesPer;
      d[i] = bits === 16 ? v.getInt16(off, true) / 0x8000 : v.getUint8(off) / 127.5 - 1;
    }
  }
  return buf;
}

/* ---------- tempo estimation (honest approximation, not a claim of DJ-grade detection) ---------- */

export interface BpmEstimate {
  bpm: number;
  confidence: "high" | "medium" | "low";
  analyzedSec: number;
}

/** Estimate tempo via an energy-flux onset envelope + autocorrelation over 60–200 BPM. */
export function estimateBpm(buf: AudioBuffer): BpmEstimate {
  const sr = buf.sampleRate;
  const ch = buf.getChannelData(0);
  const hop = Math.floor(sr * 0.02); // 20 ms frames
  const frames = Math.min(Math.floor(ch.length / hop), 60 * 50); // ≤60 s
  if (frames < 100) throw new Error("Audio is too short for tempo estimation (need a few seconds).");
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const start = f * hop;
    const step = Math.max(1, Math.floor(hop / 64));
    for (let i = start; i < start + hop && i < ch.length; i += step) {
      const v = ch[i] as number;
      s += v * v;
    }
    energy[f] = s;
  }
  // Half-wave-rectified flux = onset envelope.
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) flux[f] = Math.max(0, (energy[f] as number) - (energy[f - 1] as number));
  const mean = flux.reduce((a, b) => a + b, 0) / frames;
  if (mean < 1e-9) throw new Error("No rhythmic onsets found — this may be ambient, noise or silence.");
  const fps = 50; // 20 ms hops
  let bestLag = 0;
  let bestScore = -Infinity;
  const scores = new Map<number, number>();
  for (let bpm = 60; bpm <= 200; bpm++) {
    const lag = Math.round((60 / bpm) * fps);
    let score = 0;
    for (let f = 0; f + lag < frames; f += 1) score += (flux[f] as number) * (flux[f + lag] as number);
    score /= frames - lag;
    scores.set(bpm, score);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  const bestBpm = Math.round((60 / bestLag) * fps);
  // Confidence: how much the winner beats the median candidate.
  const vals = [...scores.values()].sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)] as number;
  const ratio = bestScore / Math.max(1e-12, median);
  return {
    bpm: bestBpm,
    confidence: ratio > 4 ? "high" : ratio > 2 ? "medium" : "low",
    analyzedSec: (frames * hop) / sr,
  };
}

/* ---------- container tag parsing (bytes, not guesses) ---------- */

export interface AudioTag {
  field: string;
  value: string;
  source: string;
}

const ID3V2_NAMES: Record<string, string> = {
  TIT2: "Title",
  TPE1: "Artist",
  TALB: "Album",
  TYER: "Year",
  TDRC: "Recording date",
  TCON: "Genre",
  TRCK: "Track",
  TPOS: "Disc",
  TCOM: "Composer",
  TPE2: "Album artist",
  TLEN: "Length (ms)",
  TBPM: "BPM tag",
};

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

function decodeId3Text(data: Uint8Array): string {
  if (data.length === 0) return "";
  const enc = data[0] as number;
  const body = data.subarray(1);
  try {
    if (enc === 1 || enc === 2) {
      const le = enc === 1; // UTF-16 with BOM treated as LE when BOM missing
      const u16: number[] = [];
      for (let i = 0; i + 1 < body.length; i += 2) {
        u16.push((body[i] as number) | ((body[i + 1] as number) << 8));
      }
      void le;
      return String.fromCharCode(...u16).replace(/\0+$/g, "").trim();
    }
    if (enc === 3) return new TextDecoder("utf-8").decode(body).replace(/\0+$/g, "").trim();
    return latin1(body).replace(/\0+$/g, "").trim();
  } catch {
    return latin1(body).replace(/\0+$/g, "").trim();
  }
}

/** Parse ID3v2 text frames (v2.3/v2.4) and the ID3v1 trailer from raw bytes. */
export function parseAudioTags(bytes: Uint8Array): AudioTag[] {
  const tags: AudioTag[] = [];
  // ID3v2 header at offset 0.
  if (bytes.length > 10 && latin1(bytes.subarray(0, 3)) === "ID3") {
    const ver = bytes[3] as number;
    const syncSafe = (o: number) =>
      ((bytes[o] as number) << 21) | ((bytes[o + 1] as number) << 14) | ((bytes[o + 2] as number) << 7) | (bytes[o + 3] as number);
    const tagSize = syncSafe(6);
    let p = 10;
    const end = Math.min(bytes.length, 10 + tagSize);
    let guard = 0;
    while (p + 10 <= end && guard++ < 500) {
      const id = latin1(bytes.subarray(p, p + 4));
      if (/^\0+$/.test(id)) break;
      let size: number;
      if (ver >= 4) {
        size = ((bytes[p + 4] as number) << 21) | ((bytes[p + 5] as number) << 14) | ((bytes[p + 6] as number) << 7) | (bytes[p + 7] as number);
      } else {
        size = ((bytes[p + 4] as number) << 24) | ((bytes[p + 5] as number) << 16) | ((bytes[p + 6] as number) << 8) | (bytes[p + 7] as number);
      }
      if (!/^[A-Z0-9]{4}$/.test(id) || size <= 0 || p + 10 + size > end) {
        if (!/^[A-Z0-9]{4}$/.test(id)) break;
        p += 10 + Math.max(0, size);
        continue;
      }
      if (id.startsWith("T") && id !== "TXXX") {
        const text = decodeId3Text(bytes.subarray(p + 10, p + 10 + size));
        if (text) tags.push({ field: ID3V2_NAMES[id] ?? id, value: text, source: `ID3v2.${ver}` });
      }
      p += 10 + size;
    }
  }
  // ID3v1 trailer: last 128 bytes starting with "TAG".
  if (bytes.length >= 128) {
    const tail = bytes.subarray(bytes.length - 128);
    if (latin1(tail.subarray(0, 3)) === "TAG" && tags.length === 0) {
      const str = (o: number, n: number) => latin1(tail.subarray(o, o + n)).replace(/\0+$/g, "").trim();
      const pairs: [string, string][] = [
        ["Title", str(3, 30)],
        ["Artist", str(33, 30)],
        ["Album", str(63, 30)],
        ["Year", str(93, 4)],
      ];
      for (const [field, value] of pairs) {
        if (value) tags.push({ field, value, source: "ID3v1" });
      }
      const genreIdx = tail[127] as number;
      const GENRES = ["Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental", "Acid", "House", "Game", "Sound Clip", "Podcast", "Audiobook", "Rock & Roll"];
      if (genreIdx < GENRES.length) tags.push({ field: "Genre", value: GENRES[genreIdx] as string, source: "ID3v1" });
    }
  }
  return tags;
}

/* ---------- header inspection ---------- */

export interface HeaderLine {
  offset: string;
  hex: string;
  ascii: string;
}

export function hexDump(bytes: Uint8Array, length = 128): HeaderLine[] {
  const n = Math.min(bytes.length, Math.max(16, Math.min(512, length)));
  const lines: HeaderLine[] = [];
  for (let o = 0; o < n; o += 16) {
    const slice = bytes.subarray(o, Math.min(n, o + 16));
    const hex = [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = [...slice].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·")).join("");
    lines.push({ offset: `0x${o.toString(16).padStart(4, "0")}`, hex, ascii });
  }
  return lines;
}

export function describeAudioSignature(bytes: Uint8Array): { format: string; detail: string; suggestedExt: string } {
  const head = bytes.subarray(0, 12);
  const str = (o: number, n: number) => latin1(head.subarray(o, Math.min(head.length, o + n)));
  if (str(0, 4) === "RIFF" && str(8, 4) === "WAVE") {
    const fmt = bytes.length >= 24 ? new DataView(bytes.buffer.slice(0, 24)).getUint16(20, true) : 0;
    return { format: "WAV (RIFF)", detail: `Format tag ${fmt} (1 = PCM, 3 = float). Parse full fields with the WAV Information Viewer.`, suggestedExt: ".wav" };
  }
  if (str(0, 3) === "ID3" || (head[0] === 0xff && ((head[1] as number) & 0xe0) === 0xe0)) {
    return { format: "MP3", detail: bytes[0] === 0x49 ? "ID3v2 tag present at offset 0 — audio frames follow the tag." : "Raw MPEG frame sync at offset 0 (no ID3v2 header).", suggestedExt: ".mp3" };
  }
  if (str(0, 4) === "OggS") return { format: "Ogg", detail: "Ogg page capture pattern at offset 0 — contains Vorbis, Opus or FLAC packets.", suggestedExt: ".ogg/.opus" };
  if (str(0, 4) === "fLaC") return { format: "FLAC", detail: "Native FLAC signature — lossless frames follow the metadata blocks.", suggestedExt: ".flac" };
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
    const brand = str(8, 4);
    return { format: "MP4/M4A", detail: `ISO BMFF ftyp box, major brand "${brand}" — audio in mdat (often AAC/ALAC).`, suggestedExt: ".m4a" };
  }
  if (str(0, 4) === "RIFF" && str(8, 4) !== "WAVE") {
    return { format: `RIFF (${str(8, 4) || "unknown"})`, detail: "RIFF container but not WAVE — e.g. AVI video with audio.", suggestedExt: ".avi" };
  }
  if (str(0, 4) === "FORM") return { format: "AIFF", detail: "Apple IFF container — uncompressed or compressed samples.", suggestedExt: ".aiff" };
  if (str(0, 3) === "TAG") return { format: "MP3 (ID3v1-style head)", detail: "Unusual: TAG marker at offset 0. The file may be truncated or mislabeled.", suggestedExt: ".mp3" };
  return { format: "Unknown", detail: "No recognized audio signature in the first 12 bytes — try the WAV Information Viewer or MIME detector for a second opinion.", suggestedExt: "unknown" };
}

/* ---------- comparative DSP ---------- */

/** Normalized zero-lag cross-correlation after resampling to equal length. */
export function waveformSimilarity(a: AudioBuffer, b: AudioBuffer): number {
  const da = a.getChannelData(0);
  const db = b.getChannelData(0);
  const n = 20000;
  const sample = (d: Float32Array, len: number, i: number) => {
    const pos = (i * (len - 1)) / Math.max(1, n - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(len - 1, lo + 1);
    const f = pos - lo;
    return ((d[lo] as number) ?? 0) * (1 - f) + ((d[hi] as number) ?? 0) * f;
  };
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = sample(da, da.length, i);
    const y = sample(db, db.length, i);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na < 1e-12 || nb < 1e-12) return 0; // one side silent
  return Math.max(0, Math.min(1, dot / Math.sqrt(na * nb)));
}

export function spectralCentroid(buf: AudioBuffer): number {
  const spec = spectrum(buf, Math.min(5, buf.duration / 2), 4096);
  let num = 0;
  let den = 0;
  for (const s of spec) {
    const e = s.mag * s.mag;
    num += s.freq * e;
    den += e;
  }
  return den < 1e-18 ? 0 : num / den;
}

export function dominantFrequency(buf: AudioBuffer): number {
  const spec = spectrum(buf, Math.min(5, buf.duration / 2), 4096);
  let best = 0;
  let bestMag = -Infinity;
  for (const s of spec) {
    if (s.freq < 30) continue; // ignore DC/rumble bin
    if (s.mag > bestMag) {
      bestMag = s.mag;
      best = s.freq;
    }
  }
  return best;
}
