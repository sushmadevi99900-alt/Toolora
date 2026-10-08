"use client";

/* Second-generation audio workspaces: synthesis, filters, spatial, editing,
   calculators and batch analysis. Every tool performs real DSP locally —
   WAV synthesis/encoding, OfflineAudioContext filters, sample math. No
   MP3/AAC/FLAC encoding is faked; those remain honestly Coming Soon. */

import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input } from "../../ui/Input";
import { Calc, Err, FilePick, Note, asTool, req } from "../kits/kits";
import { AudioPick, downloadWav, useAudioFile } from "./AudioWorkspaces";
import {
  applyAdsrToTone,
  applyBiquad,
  applyStereoPan,
  applyStereoWidth,
  bufferInfo,
  channelBalance,
  crestFactorDb,
  crossfadeBuffers,
  decodeAudioFile,
  decodePcmRaw,
  detectPeakEvents,
  downloadBlob,
  encodePcmRaw,
  encodeWav,
  extractChannel,
  formatBytes,
  formatTime,
  frequencyHistogram,
  mergeToStereo,
  splitBuffer,
  synthesizeBeeps,
  synthesizeMetronome,
  synthesizePinkNoise,
  synthesizeSilence,
  synthesizeWave,
  synthesizeWhiteNoise,
  type BiquadKind,
  type WaveKind,
} from "@/lib/audio/engine";

export const audiogenRegistry: Record<string, React.ComponentType> = {
  "sine-wave-generator": asTool(<SynthTool kind="sine" label="Sine Wave" />),
  "square-wave-generator": asTool(<SynthTool kind="square" label="Square Wave" />),
  "triangle-wave-generator": asTool(<SynthTool kind="triangle" label="Triangle Wave" />),
  "sawtooth-wave-generator": asTool(<SynthTool kind="sawtooth" label="Sawtooth Wave" />),
  "white-noise-generator": asTool(<NoiseTool kind="white" />),
  "pink-noise-generator": asTool(<NoiseTool kind="pink" />),
  "frequency-tone-generator": asTool(<ToneTool />),
  "audio-beep-generator": asTool(<BeepTool />),
  "audio-metronome": asTool(<MetronomeTool />),
  "wav-silence-generator": asTool(<SilenceGenTool />),
  "audio-adsr-generator": asTool(<AdsrTool />),
  "low-pass-filter": asTool(<FilterTool kind="lowpass" label="Low-Pass Filter" hint="Keeps lows, removes highs above the cutoff." />),
  "high-pass-filter": asTool(<FilterTool kind="highpass" label="High-Pass Filter" hint="Keeps highs, removes lows below the cutoff." />),
  "band-pass-filter": asTool(<FilterTool kind="bandpass" label="Band-Pass Filter" hint="Keeps a band around the center frequency." />),
  "notch-filter": asTool(<FilterTool kind="notch" label="Notch Filter" hint="Cuts a narrow band — e.g. 50/60 Hz mains hum." />),
  "audio-panner": asTool(<PanTool />),
  "stereo-width-controller": asTool(<WidthTool />),
  "audio-crossfade": asTool(<CrossfadeTool />),
  "audio-splitter": asTool(<SplitterTool />),
  "audio-channel-extractor": asTool(<ChannelExtractTool />),
  "audio-channel-merger": asTool(<ChannelMergeTool />),
  "audio-envelope-generator": asTool(<EnvelopeTool />),
  "bpm-calculator": asTool(<BpmTool />),
  "bpm-from-duration": asTool(<BpmFromIntervalTool />),
  "audio-duration-from-bpm": asTool(<DurationFromBpmTool />),
  "audio-gain-calculator": asTool(<GainCalcTool />),
  "dynamic-range-calculator": asTool(<DynamicRangeTool />),
  "snr-calculator": asTool(<SnrTool />),
  "audio-playlist-duration-calculator": asTool(<PlaylistDurationTool />),
  "audio-loop-duration-calculator": asTool(<LoopDurationTool />),
  "audio-segment-duration-calculator": asTool(<SegmentDurationTool />),
  "audio-fade-duration-calculator": asTool(<FadeDurationTool />),
  "audio-crossfade-duration-calculator": asTool(<XfadeDurationTool />),
  "audio-peak-detector": asTool(<PeakDetectTool />),
  "audio-channel-balance-analyzer": asTool(<BalanceAnalyzeTool />),
  "audio-frequency-histogram": asTool(<HistTool />),
  "audio-sample-viewer": asTool(<SampleViewTool />),
  "audio-metadata-exporter": asTool(<MetaExportTool />),
  "audio-file-comparison": asTool(<CompareTool />),
  "audio-batch-analyzer": asTool(<BatchTool />),
  "audio-playlist-generator": asTool(<PlaylistTool />),
  "pcm-to-wav": asTool(<PcmToWavTool />),
  "wav-to-pcm": asTool(<WavToPcmTool />),
};

/* ---------- generated-audio preview + download ---------- */

function GeneratedAudio({ buffer, fileName }: { buffer: AudioBuffer; fileName: string }) {
  const url = useMemo(() => URL.createObjectURL(encodeWav(buffer)), [buffer]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="mt-3 rounded-xl border border-(--border) p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Duration" value={formatTime(buffer.duration)} />
        <Stat label="Sample rate" value={`${(buffer.sampleRate / 1000).toFixed(1)} kHz`} />
        <Stat label="Channels" value={buffer.numberOfChannels === 1 ? "Mono" : "Stereo"} />
        <Stat label="Size" value={formatBytes(buffer.length * buffer.numberOfChannels * 2 + 44)} />
      </div>
      {url && (
        <audio controls src={url} className="mt-3 w-full" aria-label="Preview generated audio" />
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => downloadWav(buffer, fileName)}>Download WAV</Button>
      </div>
    </div>
  );
}

/* ---------- synthesis tools ---------- */

function SynthTool({ kind, label }: { kind: WaveKind; label: string }) {
  const [freq, setFreq] = useState("440");
  const [secs, setSecs] = useState("3");
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    const f = Number(freq);
    const s = Number(secs);
    try {
      setBuf(synthesizeWave(kind, f, s));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="max-w-[240px]">
          <FieldLabel htmlFor={`sy-f-${kind}`}>Frequency (Hz, 20–20000)</FieldLabel>
          <Input id={`sy-f-${kind}`} inputMode="decimal" value={freq} onChange={(e) => setFreq(e.target.value)} />
        </div>
        <div className="max-w-[240px]">
          <FieldLabel htmlFor={`sy-s-${kind}`}>Duration (seconds, max 600)</FieldLabel>
          <Input id={`sy-s-${kind}`} inputMode="decimal" value={secs} onChange={(e) => setSecs(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate {label}</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`${kind}-${freq}hz-${secs}s`} />}
      <Note>Pure {label.toLowerCase()} synthesized sample-by-sample with click-free edges. Downloaded as lossless 16-bit WAV.</Note>
    </div>
  );
}

function NoiseTool({ kind }: { kind: "white" | "pink" }) {
  const [secs, setSecs] = useState("3");
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    try {
      setBuf(kind === "white" ? synthesizeWhiteNoise(Number(secs)) : synthesizePinkNoise(Number(secs)));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="max-w-[240px]">
        <FieldLabel htmlFor={`nz-s-${kind}`}>Duration (seconds, max 600)</FieldLabel>
        <Input id={`nz-s-${kind}`} inputMode="decimal" value={secs} onChange={(e) => setSecs(e.target.value)} />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate {kind === "white" ? "White" : "Pink"} Noise</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`${kind}-noise-${secs}s`} />}
      <Note>{kind === "white" ? "Equal energy per Hz — harsh hiss, for testing and effects." : "Equal energy per octave (Paul Kellet filter) — softer, natural-sounding noise."} Deterministic and reproducible.</Note>
    </div>
  );
}

function ToneTool() {
  return (
    <GenTone
      render={(vals) => {
        const f = Number(vals.freq);
        const s = Number(vals.secs);
        const kind = (vals.wave || "sine") as WaveKind;
        const buf = synthesizeWave(kind, f, s);
        return { buffer: buf, name: `tone-${f}hz-${s}s` };
      }}
    />
  );
}

function GenTone({ render }: { render: (vals: Record<string, string>) => { buffer: AudioBuffer; name: string } }) {
  const [freq, setFreq] = useState("880");
  const [secs, setSecs] = useState("2");
  const [wave, setWave] = useState<WaveKind>("sine");
  const [error, setError] = useState("");
  const [out, setOut] = useState<{ buffer: AudioBuffer; name: string } | null>(null);
  const run = () => {
    setError("");
    try {
      setOut(render({ freq, secs, wave }));
    } catch (e) {
      setOut(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="tn-f">Frequency (Hz)</FieldLabel>
          <Input id="tn-f" inputMode="decimal" value={freq} onChange={(e) => setFreq(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tn-s">Duration (seconds)</FieldLabel>
          <Input id="tn-s" inputMode="decimal" value={secs} onChange={(e) => setSecs(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="tn-w">Waveform</FieldLabel>
          <select id="tn-w" value={wave} onChange={(e) => setWave(e.target.value as WaveKind)} className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-4 text-[15px] text-(--foreground)">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate Tone</Button>
        {out && <Button type="button" variant="ghost" onClick={() => setOut(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {out && <GeneratedAudio buffer={out.buffer} fileName={out.name} />}
    </div>
  );
}

function BeepTool() {
  const [freq, setFreq] = useState("1000");
  const [beepMs, setBeepMs] = useState("200");
  const [gapMs, setGapMs] = useState("200");
  const [count, setCount] = useState("3");
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    try {
      setBuf(synthesizeBeeps({ freqHz: Number(freq), beepMs: Number(beepMs), gapMs: Number(gapMs), count: Math.floor(Number(count)) }));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <FieldLabel htmlFor="bp-f">Frequency (Hz)</FieldLabel>
          <Input id="bp-f" inputMode="decimal" value={freq} onChange={(e) => setFreq(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="bp-b">Beep (ms)</FieldLabel>
          <Input id="bp-b" inputMode="decimal" value={beepMs} onChange={(e) => setBeepMs(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="bp-g">Gap (ms)</FieldLabel>
          <Input id="bp-g" inputMode="decimal" value={gapMs} onChange={(e) => setGapMs(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="bp-c">Count (1–500)</FieldLabel>
          <Input id="bp-c" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate Beeps</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`beeps-${count}x`} />}
      <Note>Alerts, timers and test signals with click-free 5 ms edges.</Note>
    </div>
  );
}

function MetronomeTool() {
  const [bpm, setBpm] = useState("120");
  const [beats, setBeats] = useState("16");
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    try {
      setBuf(synthesizeMetronome(Number(bpm), Math.floor(Number(beats))));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="max-w-[240px]">
          <FieldLabel htmlFor="mt-b">Tempo (BPM, 20–300)</FieldLabel>
          <Input id="mt-b" inputMode="decimal" value={bpm} onChange={(e) => setBpm(e.target.value)} />
        </div>
        <div className="max-w-[240px]">
          <FieldLabel htmlFor="mt-n">Beats (1–1000)</FieldLabel>
          <Input id="mt-n" inputMode="numeric" value={beats} onChange={(e) => setBeats(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate Click Track</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`metronome-${bpm}bpm`} />}
      <Note>Accented downbeat every 4 clicks (1760 Hz vs 880 Hz), sample-accurate timing.</Note>
    </div>
  );
}

function SilenceGenTool() {
  const [secs, setSecs] = useState("5");
  const [stereo, setStereo] = useState(false);
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    try {
      setBuf(synthesizeSilence(Number(secs), 44100, stereo ? 2 : 1));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="max-w-[240px]">
          <FieldLabel htmlFor="sg-s">Duration (seconds)</FieldLabel>
          <Input id="sg-s" inputMode="decimal" value={secs} onChange={(e) => setSecs(e.target.value)} />
        </div>
        <label htmlFor="sg-st" className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] font-medium">
          <input id="sg-st" type="checkbox" checked={stereo} onChange={(e) => setStereo(e.target.checked)} className="h-5 w-5" />
          Stereo file
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate Silence</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`silence-${secs}s`} />}
      <Note>Bit-perfect digital silence — for padding podcasts, videos and test beds.</Note>
    </div>
  );
}

function AdsrTool() {
  const [freq, setFreq] = useState("440");
  const [secs, setSecs] = useState("3");
  const [a, setA] = useState("0.1");
  const [d, setD] = useState("0.2");
  const [s, setS] = useState("0.7");
  const [r, setR] = useState("0.4");
  const [error, setError] = useState("");
  const [buf, setBuf] = useState<AudioBuffer | null>(null);
  const run = () => {
    setError("");
    try {
      setBuf(applyAdsrToTone(Number(freq), Number(secs), { attackSec: Number(a), decaySec: Number(d), sustainLevel: Number(s), releaseSec: Number(r) }));
    } catch (e) {
      setBuf(null);
      setError(e instanceof Error ? e.message : "Synthesis failed.");
    }
  };
  const ids = ["ad-f", "ad-s", "ad-a", "ad-d", "ad-u", "ad-r"];
  const vals: [string, React.Dispatch<React.SetStateAction<string>>][] = [[freq, setFreq], [secs, setSecs], [a, setA], [d, setD], [s, setS], [r, setR]];
  const labels = ["Tone (Hz)", "Duration (s)", "Attack (s)", "Decay (s)", "Sustain (0–1)", "Release (s)"];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {vals.map(([v, set], i) => (
          <div key={ids[i]}>
            <FieldLabel htmlFor={ids[i] as string}>{labels[i]}</FieldLabel>
            <Input id={ids[i]} inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={run}>Generate ADSR Tone</Button>
        {buf && <Button type="button" variant="ghost" onClick={() => setBuf(null)}>Clear</Button>}
      </div>
      <Err message={error} />
      {buf && <GeneratedAudio buffer={buf} fileName={`adsr-${freq}hz`} />}
      <Note>Classic synth envelope applied to a sine tone — hear exactly what each stage does.</Note>
    </div>
  );
}

/* ---------- filter / spatial tools ---------- */

function FilterTool({ kind, label, hint }: { kind: BiquadKind; label: string; hint: string }) {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [freq, setFreq] = useState(kind === "notch" ? "60" : kind === "lowpass" ? "4000" : "200");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const go = async () => {
    if (!buffer) return;
    setWorking(true);
    setMsg("");
    setOut(null);
    try {
      const r = await applyBiquad(buffer, kind, Number(freq));
      setOut(r);
      setMsg(`${label} applied at ${freq} Hz.`);
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
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor={`fi-${kind}`}>Frequency (Hz, 20–20000)</FieldLabel>
            <Input id={`fi-${kind}`} inputMode="decimal" value={freq} onChange={(e) => setFreq(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void go()} disabled={working}>{working ? "Processing…" : `Apply ${label}`}</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOut(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {out && <GeneratedAudio buffer={out} fileName={`${fileName.replace(/\.[^.]+$/, "")}-${kind}-${freq}hz`} />}
        </>
      )}
      <Note>{hint} Real biquad filter rendered offline — download the filtered WAV.</Note>
    </div>
  );
}

function PanTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [pan, setPan] = useState("0");
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const go = async () => {
    if (!buffer) return;
    setWorking(true);
    setMsg("");
    setOut(null);
    try {
      const r = await applyStereoPan(buffer, Number(pan));
      setOut(r);
      setMsg(`Panned to ${Number(pan) < 0 ? "left" : Number(pan) > 0 ? "right" : "center"}.`);
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
          <div className="mt-3 max-w-[320px]">
            <FieldLabel htmlFor="pn-v">Pan (−1 left … +1 right)</FieldLabel>
            <input id="pn-v" type="range" min={-1} max={1} step={0.05} value={pan} onChange={(e) => setPan(e.target.value)} className="w-full" aria-valuetext={pan} />
            <p className="mt-1 text-sm tabular-nums">Value: {pan}</p>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => void go()} disabled={working}>{working ? "Processing…" : "Apply Pan"}</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOut(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {out && <GeneratedAudio buffer={out} fileName={`${fileName.replace(/\.[^.]+$/, "")}-pan${pan}`} />}
        </>
      )}
      <Note>Equal-power stereo panner — the browser&apos;s real StereoPannerNode, rendered to WAV.</Note>
    </div>
  );
}

function WidthTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [w, setW] = useState("1");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const go = () => {
    if (!buffer) return;
    setMsg("");
    try {
      setOut(applyStereoWidth(buffer, Number(w)));
      setMsg(Number(w) === 0 ? "Folded to mono." : Number(w) < 1 ? "Stereo narrowed." : "Stereo widened.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 max-w-[320px]">
            <FieldLabel htmlFor="wd-v">Width (0 mono … 1 normal … 2 wide)</FieldLabel>
            <input id="wd-v" type="range" min={0} max={2} step={0.05} value={w} onChange={(e) => setW(e.target.value)} className="w-full" aria-valuetext={w} />
            <p className="mt-1 text-sm tabular-nums">Value: {w}</p>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Apply Width</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOut(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {out && <GeneratedAudio buffer={out} fileName={`${fileName.replace(/\.[^.]+$/, "")}-width${w}`} />}
        </>
      )}
      <Note>True mid/side processing on your samples — 0 collapses to mono, 2 exaggerates the sides.</Note>
    </div>
  );
}

/* ---------- edit tools ---------- */

function CrossfadeTool() {
  const [aName, setAName] = useState("");
  const [bName, setBName] = useState("");
  const [aBuf, setABuf] = useState<AudioBuffer | null>(null);
  const [bBuf, setBBuf] = useState<AudioBuffer | null>(null);
  const [fade, setFade] = useState("3");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const load = (slot: "a" | "b") => async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setBusy(true);
    setMsg("");
    try {
      const buf = await decodeAudioFile(f);
      if (slot === "a") {
        setABuf(buf);
        setAName(f.name);
      } else {
        setBBuf(buf);
        setBName(f.name);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not decode that file.");
    } finally {
      setBusy(false);
    }
  };
  const go = () => {
    if (!aBuf || !bBuf) return;
    setMsg("");
    try {
      setOut(crossfadeBuffers(aBuf, bBuf, Number(fade)));
      setMsg(`Joined with a ${fade}s linear crossfade. Total: ${formatTime(aBuf.duration + bBuf.duration - Math.min(Number(fade), aBuf.duration, bBuf.duration))}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="xf-a">First track {aName && `— ${aName}`}</FieldLabel>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("a")(f)} label={busy ? "Decoding…" : "Choose first track"} />
        </div>
        <div>
          <FieldLabel htmlFor="xf-b">Second track {bName && `— ${bName}`}</FieldLabel>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("b")(f)} label={busy ? "Decoding…" : "Choose second track"} />
        </div>
      </div>
      {aBuf && bBuf && (
        <>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="xf-f">Crossfade (seconds, 0–60)</FieldLabel>
            <Input id="xf-f" inputMode="decimal" value={fade} onChange={(e) => setFade(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Crossfade & download</Button>
            <Button type="button" variant="ghost" onClick={() => { setABuf(null); setBBuf(null); setOut(null); setMsg(""); setAName(""); setBName(""); }}>Reset</Button>
          </div>
        </>
      )}
      {msg && <Note>{msg}</Note>}
      {out && <GeneratedAudio buffer={out} fileName="crossfaded" />}
      <Note>Both tracks must share a sample rate (reported honestly if not). Equal-gain linear crossfade, exported as WAV.</Note>
    </div>
  );
}

function SplitterTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [parts, setParts] = useState("2");
  const [msg, setMsg] = useState("");
  const go = () => {
    if (!buffer) return;
    setMsg("");
    try {
      const segs = splitBuffer(buffer, Math.floor(Number(parts)));
      segs.forEach((s, i) => downloadWav(s, `${fileName.replace(/\.[^.]+$/, "")}-part${i + 1}of${segs.length}`));
      setMsg(`Split into ${segs.length} WAV files — check your downloads.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="sp-n">Parts (2–32)</FieldLabel>
            <Input id="sp-n" inputMode="numeric" value={parts} onChange={(e) => setParts(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Split & download all</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
      <Note>Equal-length segments (the last part absorbs any remainder). Each downloads as its own WAV.</Note>
    </div>
  );
}

function ChannelExtractTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const [ch, setCh] = useState("0");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const go = () => {
    if (!buffer) return;
    setMsg("");
    try {
      const r = extractChannel(buffer, Math.floor(Number(ch)));
      setOut(r);
      setMsg(`Channel ${ch} extracted as mono.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <p className="mt-3 text-sm">File has {info.channels} channel{info.channels === 1 ? "" : "s"}.</p>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="ce-c">Channel index (0–{info.channels - 1})</FieldLabel>
            <Input id="ce-c" inputMode="numeric" value={ch} onChange={(e) => setCh(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Extract channel</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOut(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {out && <GeneratedAudio buffer={out} fileName={`${fileName.replace(/\.[^.]+$/, "")}-ch${ch}`} />}
        </>
      )}
    </div>
  );
}

function ChannelMergeTool() {
  const [aBuf, setABuf] = useState<AudioBuffer | null>(null);
  const [bBuf, setBBuf] = useState<AudioBuffer | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const load = (slot: "a" | "b") => async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setBusy(true);
    setMsg("");
    try {
      const buf = await decodeAudioFile(f);
      if (slot === "a") setABuf(buf);
      else setBBuf(buf);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not decode that file.");
    } finally {
      setBusy(false);
    }
  };
  const go = () => {
    if (!aBuf || !bBuf) return;
    setMsg("");
    try {
      const r = mergeToStereo(aBuf, bBuf);
      setOut(r);
      setMsg("Merged: first file → left, second file → right.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">Left channel source</p>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("a")(f)} label={busy ? "Decoding…" : "Choose left file"} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Right channel source</p>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("b")(f)} label={busy ? "Decoding…" : "Choose right file"} />
        </div>
      </div>
      {aBuf && bBuf && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={go}>Merge to stereo</Button>
          <Button type="button" variant="ghost" onClick={() => { setABuf(null); setBBuf(null); setOut(null); setMsg(""); }}>Reset</Button>
        </div>
      )}
      {msg && <Note>{msg}</Note>}
      {out && <GeneratedAudio buffer={out} fileName="merged-stereo" />}
      <Note>Only the first channel of each file is used; the shorter file is zero-padded. Same sample rate required.</Note>
    </div>
  );
}

function EnvelopeTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [a, setA] = useState("0.5");
  const [r, setR] = useState("1");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState<AudioBuffer | null>(null);
  const go = () => {
    if (!buffer) return;
    setMsg("");
    try {
      const fadeA = Math.max(0, Number(a));
      const fadeR = Math.max(0, Number(r));
      const len = buffer.length;
      const sr = buffer.sampleRate;
      const aN = Math.min(len, Math.floor(fadeA * sr));
      const rN = Math.min(len, Math.floor(fadeR * sr));
      const shaped = new AudioBuffer({ length: len, sampleRate: sr, numberOfChannels: buffer.numberOfChannels });
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const src = buffer.getChannelData(c);
        const dst = shaped.getChannelData(c);
        for (let i = 0; i < len; i++) {
          const up = aN === 0 ? 1 : Math.min(1, i / Math.max(1, aN));
          const down = rN === 0 ? 1 : Math.min(1, (len - 1 - i) / Math.max(1, rN));
          dst[i] = (src[i] as number) * Math.min(up, down);
        }
      }
      setOut(shaped);
      setMsg(`Envelope applied: ${fadeA}s attack, ${fadeR}s release.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Processing failed.");
    }
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="max-w-[240px]">
              <FieldLabel htmlFor="ev-a">Fade in (seconds)</FieldLabel>
              <Input id="ev-a" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
            </div>
            <div className="max-w-[240px]">
              <FieldLabel htmlFor="ev-r">Fade out (seconds)</FieldLabel>
              <Input id="ev-r" inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Apply envelope</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setOut(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {out && <GeneratedAudio buffer={out} fileName={`${fileName.replace(/\.[^.]+$/, "")}-envelope`} />}
        </>
      )}
      <Note>Custom attack/release envelope over the full file — linear ramps computed per sample.</Note>
    </div>
  );
}

/* ---------- calculators ---------- */

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

function BpmTool() {
  return (
    <Calc
      fields={[
        { key: "beats", label: "Beats counted", type: "number", def: "16", required: true, min: 1 },
        { key: "secs", label: "Time for those beats (seconds)", type: "number", def: "8", required: true, min: 0 },
      ]}
      compute={(v) => {
        const beats = req(v, "beats", "Beats counted");
        const secs = req(v, "secs", "Time");
        if (typeof beats !== "number" || typeof secs !== "number") return beats as { error: string };
        if (typeof secs !== "number" || secs <= 0) return { error: "Time must be greater than zero." };
        if (beats <= 0) return { error: "Beats must be greater than zero." };
        const bpm = (beats / secs) * 60;
        if (bpm < 20 || bpm > 400) return { rows: [["Tempo", `${fmt(bpm, 1)} BPM`]], note: "That is outside typical musical tempo (20–400 BPM) — double-check your count." };
        return { rows: [["Tempo", `${fmt(bpm, 1)} BPM`], ["Beat interval", `${fmt(60000 / bpm, 0)} ms`], ["Bars (4/4)", fmt(beats / 4, 2)]], note: "Tap or count beats against a stopwatch, then enter the totals." };
      }}
    />
  );
}

function BpmFromIntervalTool() {
  return (
    <Calc
      fields={[
        { key: "ms", label: "One beat interval (milliseconds)", type: "number", def: "500", required: true, min: 0 },
      ]}
      compute={(v) => {
        const ms = req(v, "ms", "Beat interval");
        if (typeof ms !== "number") return ms;
        if (ms <= 0) return { error: "Interval must be greater than zero." };
        const bpm = 60000 / ms;
        return { rows: [["Tempo", `${fmt(bpm, 2)} BPM`], ["Beats per minute", fmt(bpm, 1)], ["Beats per hour", fmt(bpm * 60, 0)]], note: "Measure a single beat gap (e.g. with a stopwatch lap) to get BPM instantly." };
      }}
    />
  );
}

function DurationFromBpmTool() {
  return (
    <Calc
      fields={[
        { key: "bpm", label: "Tempo (BPM)", type: "number", def: "120", required: true, min: 0 },
        { key: "beats", label: "Number of beats", type: "number", def: "64", required: true, min: 0 },
      ]}
      compute={(v) => {
        const bpm = req(v, "bpm", "Tempo");
        const beats = req(v, "beats", "Beats");
        if (typeof bpm !== "number" || typeof beats !== "number") return bpm as { error: string };
        if (typeof beats !== "number") return beats;
        if (bpm <= 0 || beats < 0) return { error: "BPM must be positive and beats non-negative." };
        const secs = (beats / bpm) * 60;
        return { rows: [["Duration", `${fmt(secs, 2)} s (${formatTime(secs)})`], ["Bars (4/4)", fmt(beats / 4, 2)], ["Milliseconds", fmt(secs * 1000, 0)]], note: "Handy for loops, intros and click-track planning." };
      }}
    />
  );
}

function GainCalcTool() {
  return (
    <Calc
      fields={[
        { key: "db", label: "Gain (dB, use negative to attenuate)", type: "number", def: "6", required: true },
      ]}
      compute={(v) => {
        const db = req(v, "db", "Gain");
        if (typeof db !== "number") return db;
        if (db < -96 || db > 96) return { error: "Gain must be between −96 and +96 dB." };
        const ratio = Math.pow(10, db / 20);
        return { rows: [["Linear ratio", `×${fmt(ratio, 4)}`], ["Power ratio", `×${fmt(ratio * ratio, 4)}`], [db >= 0 ? "Boost" : "Cut", `${fmt(Math.abs(db), 1)} dB`]], note: "+6 dB ≈ double amplitude; +10 dB ≈ double perceived loudness." };
      }}
    />
  );
}

function DynamicRangeTool() {
  const { buffer, error, busy, pick, reset } = useAudioFile();
  const result: { rows: [string, string][] | null; msg: string } = useMemo(() => {
    if (!buffer) return { rows: null, msg: "" };
    try {
      const info = bufferInfo(buffer);
      const crest = crestFactorDb(buffer);
      return {
        rows: [
          ["Peak", `${fmt(20 * Math.log10(Math.max(1e-9, info.peak)), 1)} dBFS`],
          ["RMS", `${fmt(20 * Math.log10(Math.max(1e-9, info.rms)), 1)} dBFS`],
          ["Crest factor", `${fmt(crest, 1)} dB`],
          ["Verdict", crest < 6 ? "Heavily compressed" : crest < 12 ? "Modern, punchy mix" : crest < 20 ? "Dynamic recording" : "Very dynamic — check quiet passages"],
        ],
        msg: "",
      };
    } catch (e) {
      return { rows: null, msg: e instanceof Error ? e.message : "Analysis failed." };
    }
  }, [buffer]);
  const { rows, msg } = result;
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {msg && <Err message={msg} />}
      {rows && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map(([k, val]) => (
            <Stat key={k} label={k} value={val} />
          ))}
        </div>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
      <Note>Crest factor (peak ÷ RMS) measured from your real samples — the standard dynamics summary.</Note>
    </div>
  );
}

function SnrTool() {
  return (
    <Calc
      fields={[
        { key: "sig", label: "Signal level (dB)", type: "number", def: "-12", required: true },
        { key: "noise", label: "Noise floor (dB)", type: "number", def: "-60", required: true },
      ]}
      compute={(v) => {
        const sig = req(v, "sig", "Signal level");
        const noise = req(v, "noise", "Noise floor");
        if (typeof sig !== "number" || typeof noise !== "number") return sig as { error: string };
        if (typeof noise !== "number") return noise;
        const snr = sig - noise;
        return { rows: [["SNR", `${fmt(snr, 1)} dB`], ["Quality", snr >= 60 ? "Excellent" : snr >= 40 ? "Good" : snr >= 20 ? "Acceptable" : "Poor — denoise or re-record"]], note: "Measure both with the Volume Analyzer, then subtract: SNR = signal − noise floor." };
      }}
    />
  );
}

function PlaylistDurationTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={500} multiple onFiles={async (files) => {
        setBusy(true);
        setMsg("");
        setRows(null);
        try {
          let total = 0;
          const lines: [string, string][] = [];
          for (const f of files.slice(0, 100)) {
            const buf = await decodeAudioFile(f);
            total += buf.duration;
            lines.push([f.name, formatTime(buf.duration)]);
          }
          setRows([...lines.slice(0, 12), ["TOTAL", `${formatTime(total)} (${fmt(total, 1)} s)`] as [string, string]]);
          if (files.length > 100) setMsg("First 100 files summed (browser safety cap).");
        } catch (e) {
          setMsg(e instanceof Error ? e.message : "Could not decode a file — skipping is not silent: remove it and retry.");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Decoding…" : "Choose tracks (multiple)"} />
      {msg && <Note>{msg}</Note>}
      {rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, val]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="truncate text-(--muted)">{k}</dt>
              <dd className="font-semibold tabular-nums">{val}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Each file is actually decoded — true durations, not header guesses.</Note>
    </div>
  );
}

function LoopDurationTool() {
  return (
    <Calc
      fields={[
        { key: "bpm", label: "Tempo (BPM)", type: "number", def: "120", required: true, min: 0 },
        { key: "beats", label: "Loop length (beats)", type: "number", def: "8", required: true, min: 0 },
        { key: "loops", label: "Repeats", type: "number", def: "4", required: true, min: 0 },
      ]}
      compute={(v) => {
        const bpm = req(v, "bpm", "Tempo");
        const beats = req(v, "beats", "Loop length");
        const loops = req(v, "loops", "Repeats");
        if (typeof bpm !== "number" || typeof beats !== "number" || typeof loops !== "number") return bpm as { error: string };
        if (bpm <= 0 || beats <= 0 || loops <= 0) return { error: "All values must be positive." };
        const one = (beats / bpm) * 60;
        const total = one * loops;
        return { rows: [["One loop", `${fmt(one, 2)} s`], ["Total", `${fmt(total, 2)} s (${formatTime(total)})`]], note: "For practice loops and ambient beds." };
      }}
    />
  );
}

function SegmentDurationTool() {
  return (
    <Calc
      fields={[
        { key: "rate", label: "Sample rate (Hz)", type: "number", def: "44100", required: true, min: 0 },
        { key: "samples", label: "Sample count", type: "number", def: "441000", required: true, min: 0 },
      ]}
      compute={(v) => {
        const rate = req(v, "rate", "Sample rate");
        const samples = req(v, "samples", "Sample count");
        if (typeof rate !== "number" || typeof samples !== "number") return rate as { error: string };
        if (rate <= 0 || samples < 0) return { error: "Rate must be positive, samples non-negative." };
        const secs = samples / rate;
        return { rows: [["Duration", `${fmt(secs, 3)} s (${formatTime(secs)})`], ["Milliseconds", fmt(secs * 1000, 1)], ["At 44.1 kHz", `${fmt(samples / 44100, 3)} s`]], note: "Convert between sample counts and time for precise editing." };
      }}
    />
  );
}

function FadeDurationTool() {
  return (
    <Calc
      fields={[
        { key: "dur", label: "Track duration (seconds)", type: "number", def: "180", required: true, min: 0 },
        { key: "pct", label: "Fade length (% of track)", type: "number", def: "5", required: true, min: 0 },
        { key: "rate", label: "Sample rate (Hz)", type: "number", def: "44100", required: true, min: 0 },
      ]}
      compute={(v) => {
        const dur = req(v, "dur", "Track duration");
        const pct = req(v, "pct", "Fade length");
        const rate = req(v, "rate", "Sample rate");
        if (typeof dur !== "number" || typeof pct !== "number" || typeof rate !== "number") return dur as { error: string };
        if (dur <= 0 || rate <= 0 || pct < 0 || pct > 50) return { error: "Check ranges: duration > 0, fade 0–50%." };
        const fadeSec = (dur * pct) / 100;
        return { rows: [["Fade length", `${fmt(fadeSec, 2)} s`], ["Fade samples", fmt(fadeSec * rate, 0)], ["Starts at", formatTime(dur - fadeSec)]], note: "Fades over 50% would overlap — capped honestly." };
      }}
    />
  );
}

function XfadeDurationTool() {
  return (
    <Calc
      fields={[
        { key: "a", label: "Track A (seconds)", type: "number", def: "180", required: true, min: 0 },
        { key: "b", label: "Track B (seconds)", type: "number", def: "200", required: true, min: 0 },
        { key: "x", label: "Overlap (seconds)", type: "number", def: "5", required: true, min: 0 },
      ]}
      compute={(v) => {
        const a = req(v, "a", "Track A");
        const b = req(v, "b", "Track B");
        const x = req(v, "x", "Overlap");
        if (typeof a !== "number" || typeof b !== "number" || typeof x !== "number") return a as { error: string };
        if (a <= 0 || b <= 0 || x < 0) return { error: "Durations must be positive, overlap non-negative." };
        if (x >= Math.min(a, b)) return { error: "Overlap must be shorter than both tracks." };
        const total = a + b - x;
        return { rows: [["Combined", `${fmt(total, 2)} s (${formatTime(total)})`], ["Overlap share", `${fmt((x / total) * 100, 1)}%`]], note: "Matches the math used by the Audio Crossfade tool." };
      }}
    />
  );
}

/* ---------- analyzers / file utilities ---------- */

function PeakDetectTool() {
  const { buffer, error, busy, pick, reset } = useAudioFile();
  const [db, setDb] = useState("-6");
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const go = () => {
    if (!buffer) return;
    try {
      const peaks = detectPeakEvents(buffer, Number(db));
      if (peaks.length === 0) {
        setRows(null);
        setMsg(`No peaks above ${db} dB.`);
        return;
      }
      setRows(peaks.slice(0, 20).map((p, i) => [`Peak ${i + 1}`, `${formatTime(p.timeSec)} (${fmt(20 * Math.log10(Math.max(1e-9, Math.abs(p.value))), 1)} dB)`]));
      setMsg(peaks.length > 20 ? `Showing first 20 of ${peaks.length}.` : `${peaks.length} peak${peaks.length === 1 ? "" : "s"} found.`);
    } catch (e) {
      setRows(null);
      setMsg(e instanceof Error ? e.message : "Analysis failed.");
    }
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="pd-db">Threshold (dBFS)</FieldLabel>
            <Input id="pd-db" inputMode="decimal" value={db} onChange={(e) => setDb(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Find peaks</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setRows(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {rows && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {rows.map(([k, val]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="font-semibold tabular-nums">{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function BalanceAnalyzeTool() {
  const { buffer, error, busy, pick, reset } = useAudioFile();
  const rows: [string, string][] | null = useMemo(() => {
    if (!buffer || buffer.numberOfChannels < 2) return null;
    const b = channelBalance(buffer);
    return [
      ["Left RMS", `${fmt(20 * Math.log10(Math.max(1e-9, b.leftRms)), 1)} dB`],
      ["Right RMS", `${fmt(20 * Math.log10(Math.max(1e-9, b.rightRms)), 1)} dB`],
      ["L/R difference", `${fmt(Math.abs(b.ratioDb), 2)} dB ${b.ratioDb > 0.5 ? "(left louder)" : b.ratioDb < -0.5 ? "(right louder)" : "(balanced)"}`],
    ];
  }, [buffer]);
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && buffer.numberOfChannels < 2 && <Note>This file is mono — balance analysis needs stereo.</Note>}
      {rows && (
        <div aria-live="polite" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rows.map(([k, val]) => (
            <Stat key={k} label={k} value={val} />
          ))}
        </div>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
      <Note>Per-channel RMS energy from your real samples — spot lopsided mixes fast.</Note>
    </div>
  );
}

function HistTool() {
  const { buffer, error, busy, pick, reset } = useAudioFile();
  const rows: { label: string; energy: number }[] | null = useMemo(() => {
    if (!buffer) return null;
    try {
      return frequencyHistogram(buffer);
    } catch {
      return null;
    }
  }, [buffer]);
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {rows && (
        <div aria-live="polite" className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-xs"><span>{r.label}</span><span className="tabular-nums">{Math.round(r.energy * 100)}%</span></div>
              <div className="h-2 rounded-full bg-(--border)"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(1, r.energy * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      {buffer && <div className="mt-3"><Button type="button" variant="ghost" onClick={reset}>New file</Button></div>}
      <Note>Real windowed-DFT energy per band, normalized to the strongest — see where your sound lives.</Note>
    </div>
  );
}

function SampleViewTool() {
  const { buffer, info, error, busy, pick, reset } = useAudioFile();
  const [at, setAt] = useState("0");
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const go = () => {
    if (!buffer) return;
    const t = Number(at);
    if (!Number.isFinite(t) || t < 0 || t > buffer.duration) {
      setRows(null);
      setMsg(`Time must be 0–${fmt(buffer.duration, 2)} s.`);
      return;
    }
    const idx = Math.floor(t * buffer.sampleRate);
    const out: [string, string][] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      const line: string[] = [];
      for (let k = -2; k <= 2; k++) {
        const v = d[idx + k];
        line.push(v === undefined ? "—" : v.toFixed(6));
      }
      out.push([`Ch ${c} @ ${fmt(t, 3)}s`, line.join("  ")]);
    }
    setRows(out);
    setMsg(`Sample #${idx.toLocaleString()} of ${buffer.length.toLocaleString()} — 5 samples around the cursor.`);
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && info && (
        <>
          <p className="mt-3 text-sm">{formatTime(info.durationSec)} · {(info.sampleRate / 1000).toFixed(1)} kHz · {info.channels === 1 ? "Mono" : "Stereo"}</p>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="sv-t">Time (seconds)</FieldLabel>
            <Input id="sv-t" inputMode="decimal" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Inspect samples</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setRows(null); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
          {rows && (
            <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
              {rows.map(([k, val]) => (
                <div key={k} className="flex flex-col gap-1 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-(--muted)">{k}</dt>
                  <dd className="font-mono text-xs">{val}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function MetaExportTool() {
  const { fileName, buffer, info, error, busy, pick, reset } = useAudioFile();
  const json: string = useMemo(() => {
    if (!buffer || !info) return "";
    try {
      const crest = crestFactorDb(buffer);
      return JSON.stringify({
        file: fileName,
        durationSec: Number(info.durationSec.toFixed(3)),
        sampleRate: info.sampleRate,
        channels: info.channels,
        samples: info.samples,
        peakDbFs: Number((20 * Math.log10(Math.max(1e-9, info.peak))).toFixed(2)),
        rmsDbFs: Number((20 * Math.log10(Math.max(1e-9, info.rms))).toFixed(2)),
        crestFactorDb: Number(crest.toFixed(2)),
        exportedBy: "Toolora (local analysis)",
      }, null, 2);
    } catch {
      return "";
    }
  }, [buffer, info, fileName]);
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {json && (
        <>
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-(--border) p-4 font-mono text-xs" aria-live="polite">{json}</pre>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={() => downloadBlob(new Blob([json], { type: "application/json" }), `${fileName.replace(/\.[^.]+$/, "")}-audio-metadata.json`)}>Download JSON</Button>
            <Button type="button" variant="ghost" onClick={reset}>New file</Button>
          </div>
        </>
      )}
      <Note>Measured values only — container tags (ID3 etc.) are not rewritten, honestly stated.</Note>
    </div>
  );
}

function CompareTool() {
  const [aInfo, setAInfo] = useState<{ name: string; dur: number; peak: number; rms: number; sr: number; ch: number } | null>(null);
  const [bInfo, setBInfo] = useState<{ name: string; dur: number; peak: number; rms: number; sr: number; ch: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = (slot: "a" | "b") => async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setBusy(true);
    setMsg("");
    try {
      const buf = await decodeAudioFile(f);
      const info = bufferInfo(buf);
      const row = { name: f.name, dur: info.durationSec, peak: info.peak, rms: info.rms, sr: info.sampleRate, ch: info.channels };
      if (slot === "a") setAInfo(row);
      else setBInfo(row);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not decode that file.");
    } finally {
      setBusy(false);
    }
  };
  const db = (v: number) => fmt(20 * Math.log10(Math.max(1e-9, v)), 1);
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium">File A</p>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("a")(f)} label={busy ? "Decoding…" : "Choose file A"} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">File B</p>
          <FilePick accept="audio/*" maxMB={200} onFiles={(f) => void load("b")(f)} label={busy ? "Decoding…" : "Choose file B"} />
        </div>
      </div>
      {msg && <Note>{msg}</Note>}
      {aInfo && bInfo && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
          {[
            ["Duration", formatTime(aInfo.dur), formatTime(bInfo.dur)],
            ["Sample rate", `${aInfo.sr} Hz`, `${bInfo.sr} Hz`],
            ["Channels", String(aInfo.ch), String(bInfo.ch)],
            ["Peak", `${db(aInfo.peak)} dB`, `${db(bInfo.peak)} dB`],
            ["RMS", `${db(aInfo.rms)} dB`, `${db(bInfo.rms)} dB`],
            ["Louder by", "—", `${fmt(Math.abs(20 * Math.log10(Math.max(1e-9, aInfo.rms) / Math.max(1e-9, bInfo.rms))), 1)} dB (${aInfo.rms >= bInfo.rms ? "A" : "B"} louder)`],
          ].map(([k, va, vb]) => (
            <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="truncate font-semibold" title={aInfo.name}>{va}</dd>
              <dd className="truncate font-semibold" title={bInfo.name}>{vb}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Both files decoded and measured — durations, formats and loudness compared side by side.</Note>
    </div>
  );
}

function BatchTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <FilePick accept="audio/*" maxMB={500} multiple onFiles={async (files) => {
        setBusy(true);
        setMsg("");
        setRows(null);
        try {
          const out: [string, string][] = [];
          for (const f of files.slice(0, 100)) {
            try {
              const buf = await decodeAudioFile(f);
              const info = bufferInfo(buf);
              out.push([f.name, `${formatTime(info.durationSec)} · ${(info.sampleRate / 1000).toFixed(1)}kHz · ${info.channels}ch · ${fmt(20 * Math.log10(Math.max(1e-9, info.peak)), 0)}dBpk`]);
            } catch {
              out.push([f.name, "undecodable in this browser"]);
            }
          }
          setRows(out);
          if (files.length > 100) setMsg("First 100 files analyzed (browser safety cap).");
        } finally {
          setBusy(false);
        }
      }} label={busy ? "Analyzing…" : "Choose files (multiple)"} />
      {msg && <Note>{msg}</Note>}
      {rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)" aria-live="polite">
          {rows.map(([k, val]) => (
            <div key={k} className="flex flex-col gap-1 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <dt className="truncate text-(--muted)">{k}</dt>
              <dd className="font-mono text-xs">{val}</dd>
            </div>
          ))}
        </dl>
      )}
      <Note>Failures are reported per file — never silently skipped or faked.</Note>
    </div>
  );
}

function PlaylistTool() {
  const [names, setNames] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("Toolora Playlist");
  const m3u = names.length > 0 ? `#EXTM3U — ${title}\n${names.map((n) => `#EXTINF:-1,${n}\n${n}`).join("\n")}\n` : "";
  return (
    <div>
      <div className="max-w-[320px]">
        <FieldLabel htmlFor="pl-t">Playlist title</FieldLabel>
        <Input id="pl-t" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="mt-3">
        <FilePick accept="audio/*" maxMB={20} multiple onFiles={async (files) => {
          setNames(files.slice(0, 200).map((f) => f.name));
          setMsg(files.length > 200 ? "First 200 files listed." : `${files.length} track${files.length === 1 ? "" : "s"} listed — order kept as selected.`);
        }} label="Choose tracks (multiple)" />
      </div>
      {msg && <Note>{msg}</Note>}
      {m3u && (
        <>
          <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-(--border) p-4 font-mono text-xs" aria-live="polite">{m3u}</pre>
          <div className="mt-3">
            <Button type="button" onClick={() => downloadBlob(new Blob([m3u], { type: "audio/x-mpegurl" }), "playlist.m3u")}>Download .m3u</Button>
          </div>
        </>
      )}
      <Note>A real M3U playlist referencing your filenames — reorder by re-selecting in order.</Note>
    </div>
  );
}

function PcmToWavTool() {
  const [rate, setRate] = useState("44100");
  const [ch, setCh] = useState("1");
  const [bits, setBits] = useState("16");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<AudioBuffer | null>(null);
  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <FieldLabel htmlFor="pw-r">Sample rate</FieldLabel>
          <Input id="pw-r" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="pw-c">Channels (1–2)</FieldLabel>
          <Input id="pw-c" inputMode="numeric" value={ch} onChange={(e) => setCh(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="pw-b">Bits (8/16)</FieldLabel>
          <Input id="pw-b" inputMode="numeric" value={bits} onChange={(e) => setBits(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <FilePick accept=".pcm,.raw,audio/*" maxMB={200} onFiles={async (files) => {
          const f = files[0];
          if (!f) return;
          setBusy(true);
          setMsg("");
          setOut(null);
          try {
            const c = Number(ch) === 2 ? 2 : 1;
            const b = Number(bits) === 8 ? 8 : 16;
            setOut(await decodePcmRaw(f, Number(rate), c as 1 | 2, b as 8 | 16));
            setMsg(`Decoded as ${rate} Hz · ${c}ch · ${b}-bit.`);
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Decode failed — check the format settings.");
          } finally {
            setBusy(false);
          }
        }} label={busy ? "Decoding…" : "Choose raw PCM file"} />
      </div>
      {msg && <Note>{msg}</Note>}
      {out && <GeneratedAudio buffer={out} fileName="from-pcm" />}
      <Note>Headerless PCM needs explicit format — wrong settings sound like static, so verify the preview.</Note>
    </div>
  );
}

function WavToPcmTool() {
  const { fileName, buffer, error, busy, pick, reset } = useAudioFile();
  const [bits, setBits] = useState("16");
  const [msg, setMsg] = useState("");
  const go = () => {
    if (!buffer) return;
    const b = Number(bits) === 8 ? 8 : 16;
    downloadBlob(encodePcmRaw(buffer, b as 8 | 16), `${fileName.replace(/\.[^.]+$/, "")}-${buffer.sampleRate}hz-${buffer.numberOfChannels}ch-${b}bit.pcm`);
    setMsg(`Exported raw ${b}-bit PCM (mono mix-down of channel 0, no header). Settings needed to re-import: ${buffer.sampleRate} Hz · 1ch · ${b}-bit.`);
  };
  return (
    <div>
      <AudioPick onPick={(f) => void pick(f)} busy={busy} />
      <Err message={error} />
      {buffer && (
        <>
          <div className="mt-3 max-w-[240px]">
            <FieldLabel htmlFor="wp-b">Bits (8/16)</FieldLabel>
            <Input id="wp-b" inputMode="numeric" value={bits} onChange={(e) => setBits(e.target.value)} />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={go}>Export raw PCM</Button>
            <Button type="button" variant="ghost" onClick={() => { reset(); setMsg(""); }}>New file</Button>
          </div>
          {msg && <Note>{msg}</Note>}
        </>
      )}
      <Note>Strips the WAV header to raw samples — for firmware, game engines and DSP pipelines.</Note>
    </div>
  );
}
