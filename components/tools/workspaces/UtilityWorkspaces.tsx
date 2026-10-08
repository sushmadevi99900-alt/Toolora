"use client";

/**
 * Utility workspaces: coin flip, dice, stopwatch, countdown, text-to-speech.
 * All run fully on-device.
 */
import { useEffect, useRef, useState } from "react";
import { Stat } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { randomInt } from "@/lib/engine/crypto";

/* ---------- coin flip ---------- */

export function CoinFlipTool() {
  const [result, setResult] = useState<"Heads" | "Tails" | null>(null);
  const [flips, setFlips] = useState(0);
  const [heads, setHeads] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const flip = () => {
    if (spinning) return;
    setSpinning(true);
    const finalResult = randomInt(0, 1).value === 0 ? "Heads" : "Tails";
    // Brief suspense animation, then the cryptographically random result.
    const started = Date.now();
    const tick = () => {
      setResult(randomInt(0, 1).value === 0 ? "Heads" : "Tails");
      if (Date.now() - started < 600) {
        timer.current = window.setTimeout(tick, 90);
      } else {
        setResult(finalResult);
        setFlips((f) => f + 1);
        if (finalResult === "Heads") setHeads((h) => h + 1);
        setSpinning(false);
      }
    };
    tick();
  };

  return (
    <div className="text-center">
      <div
        aria-live="polite"
        className={`mx-auto grid h-36 w-36 place-items-center rounded-full border-4 text-2xl font-extrabold ${spinning ? "animate-spin border-brand-300 text-brand-400" : "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"}`}
        style={{ animationDuration: spinning ? "0.5s" : undefined }}
      >
        {result ? (result === "Heads" ? "H" : "T") : "?"}
      </div>
      <p aria-live="polite" className="mt-3 text-xl font-extrabold">{result ?? "Tap flip to start"}</p>
      <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-3">
        <Stat value={String(flips)} label="Flips" />
        <Stat value={flips ? `${Math.round((heads / flips) * 100)}%` : "—"} label="Heads rate" />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <Button type="button" onClick={flip} disabled={spinning} size="lg">{spinning ? "Flipping…" : "Flip coin"}</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setResult(null);
            setFlips(0);
            setHeads(0);
          }}
        >
          Reset
        </Button>
      </div>
      <p className="mt-2 text-xs text-(--muted)">Uses cryptographic randomness on your device.</p>
    </div>
  );
}

/* ---------- dice roller ---------- */

export function DiceRollerTool() {
  const [count, setCount] = useState("2");
  const [sides, setSides] = useState("6");
  const [rolls, setRolls] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([]);

  const roll = () => {
    const c = Math.max(1, Math.min(20, Number(count) || 1));
    const s = Math.max(2, Math.min(100, Number(sides) || 6));
    const next = Array.from({ length: c }, () => randomInt(1, s).value);
    setRolls(next);
    setHistory((h) => [next, ...h].slice(0, 10));
  };

  const total = rolls.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="dice-count">Dice (1–20)</FieldLabel>
          <Input id="dice-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} className="font-mono" />
        </div>
        <div>
          <FieldLabel htmlFor="dice-sides">Sides (2–100)</FieldLabel>
          <Input id="dice-sides" type="number" min={2} max={100} value={sides} onChange={(e) => setSides(e.target.value)} className="font-mono" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {[4, 6, 8, 10, 12, 20].map((s) => (
          <Button key={s} type="button" variant={Number(sides) === s ? "primary" : "secondary"} onClick={() => setSides(String(s))}>
            d{s}
          </Button>
        ))}
      </div>
      <div className="mt-4"><Button type="button" onClick={roll} size="lg">Roll</Button></div>
      {rolls.length > 0 && (
        <div aria-live="polite" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {rolls.map((r, i) => (
              <span key={i} className="grid h-14 w-14 place-items-center rounded-xl bg-(--surface-2) text-xl font-extrabold tabular-nums">
                {r}
              </span>
            ))}
          </div>
          <p className="mt-2 text-lg font-extrabold">Total: <span className="tabular-nums">{total}</span></p>
        </div>
      )}
      {history.length > 1 && (
        <p className="mt-3 text-sm text-(--muted)">Recent: {history.slice(1, 6).map((h) => `[${h.join(", ")}]`).join("  ")}</p>
      )}
    </div>
  );
}

/* ---------- stopwatch ---------- */

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export function StopwatchTool() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const baseRef = useRef(0);
  const rafRef = useRef(0);

  const handleTick = () => {
    // eslint-disable-next-line react-hooks/purity -- rAF tick callback, not render: reading the clock here is intentional.
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(handleTick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
    rafRef.current = requestAnimationFrame(handleTick);
  };
  const stop = () => {
    baseRef.current = elapsed;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
  };
  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsed(0);
    baseRef.current = 0;
    setLaps([]);
  };
  const lap = () => setLaps((l) => [elapsed, ...l].slice(0, 20));

  return (
    <div className="text-center">
      <p aria-live="off" className="font-mono text-5xl font-extrabold tabular-nums sm:text-6xl">{fmtMs(elapsed)}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {running
          ? <Button type="button" onClick={stop} size="lg">Stop</Button>
          : <Button type="button" onClick={start} size="lg">{elapsed > 0 ? "Resume" : "Start"}</Button>}
        <Button type="button" variant="secondary" onClick={lap} disabled={!running && elapsed === 0}>Lap</Button>
        <Button type="button" variant="ghost" onClick={reset}>Reset</Button>
      </div>
      {laps.length > 0 && (
        <ol className="mx-auto mt-4 max-w-xs space-y-1 text-left" aria-live="polite">
          {laps.map((l, i) => (
            <li key={`${l}-${i}`} className="flex justify-between rounded-lg bg-(--surface-2) px-3 py-1.5 font-mono text-sm tabular-nums">
              <span>Lap {laps.length - i}</span><span>{fmtMs(l)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------- countdown ---------- */

function fmtLeft(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.ceil(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function CountdownTimerTool() {
  const [mins, setMins] = useState("5");
  const [secs, setSecs] = useState("0");
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const endRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const clear = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = () => {
    clear();
    setDone(false);
    const total = (Math.max(0, Number(mins) || 0) * 60 + Math.max(0, Math.min(59, Number(secs) || 0))) * 1000;
    if (total <= 0) return;
    endRef.current = Date.now() + total;
    setLeft(total);
    timerRef.current = window.setInterval(() => {
      const remain = endRef.current - Date.now();
      if (remain <= 0) {
        clear();
        setLeft(0);
        setDone(true);
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
          osc.onended = () => void ctx.close();
        } catch {
          /* silent where audio is unavailable */
        }
      } else {
        setLeft(remain);
      }
    }, 250);
  };

  return (
    <div className="text-center">
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
        <div className="text-left">
          <FieldLabel htmlFor="cd-min">Minutes</FieldLabel>
          <Input id="cd-min" type="number" min={0} max={599} value={mins} onChange={(e) => setMins(e.target.value)} className="font-mono" />
        </div>
        <div className="text-left">
          <FieldLabel htmlFor="cd-sec">Seconds</FieldLabel>
          <Input id="cd-sec" type="number" min={0} max={59} value={secs} onChange={(e) => setSecs(e.target.value)} className="font-mono" />
        </div>
      </div>
      <p aria-live="off" className="mt-4 font-mono text-5xl font-extrabold tabular-nums sm:text-6xl">
        {left === null ? fmtLeft((Number(mins) * 60 + Number(secs)) * 1000) : fmtLeft(left)}
      </p>
      {done && <p role="alert" className="mt-2 text-lg font-extrabold text-emerald-600">Time&apos;s up! ✓</p>}
      <div className="mt-4 flex justify-center gap-2">
        <Button type="button" onClick={start} size="lg">Start</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clear();
            setLeft(null);
            setDone(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

/* ---------- text to speech ---------- */

export function TextToSpeechTool() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
      if (!voice && vs.length > 0) setVoice(vs[0]!.voiceURI);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const speak = () => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 2000));
    const v = voices.find((x) => x.voiceURI === voice);
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  if (!supported) {
    return <p role="status" className="text-[15px] text-(--muted)">Sorry — your browser does not support speech synthesis.</p>;
  }

  const words = text.trim() ? (text.trim().match(/\S+/g) ?? []).length : 0;

  return (
    <div>
      <FieldLabel htmlFor="tts-text">Text to read aloud ({words} words)</FieldLabel>
      <Textarea id="tts-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Type or paste text, then press Speak…" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="tts-voice">Voice</FieldLabel>
          <select id="tts-voice" value={voice} onChange={(e) => setVoice(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="tts-rate">Speed: {rate.toFixed(1)}×</FieldLabel>
          <input id="tts-rate" type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
        </div>
        <div>
          <FieldLabel htmlFor="tts-pitch">Pitch: {pitch.toFixed(1)}</FieldLabel>
          <input id="tts-pitch" type="range" min={0.5} max={2} step={0.1} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="min-h-[44px] w-full accent-brand-600" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {speaking
          ? <Button type="button" onClick={stop} size="lg">Stop</Button>
          : <Button type="button" onClick={speak} disabled={!text.trim()} size="lg">Speak</Button>}
      </div>
      <p className="mt-2 text-xs text-(--muted)">Reads up to 2000 characters using your device&apos;s built-in voices. Nothing is uploaded.</p>
    </div>
  );
}
