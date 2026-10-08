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
