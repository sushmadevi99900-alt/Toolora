"use client";

import { useMemo, useState } from "react";
import { Stat } from "../ui/Card";
import { Button } from "../ui/Button";
import { FieldLabel, Textarea } from "../ui/Input";
import { formatNumber } from "@/lib/utils";

function analyse(text: string) {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? (text.trim().match(/\S+/g) ?? []).length : 0;
  const sentences = (text.match(/[^.!?…\n]+[.!?…]+["”)'\]]*(\s|$)/g) ?? []).length;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length;
  const readingSeconds = Math.max(words > 0 ? Math.round((words / 200) * 60) : 0, words > 0 ? 1 : 0);
  return { characters, charactersNoSpaces, words, sentences, paragraphs, readingSeconds };
}

function readingLabel(totalSeconds: number): string {
  if (totalSeconds === 0) return "—";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}

/**
 * Word Counter — the Phase 1 reference tool.
 * Runs 100% locally; no network calls. Isolated so usage-tracking
 * hooks can wrap it later without touching the UI.
 */
export function WordCounterTool() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const stats = useMemo(() => analyse(text), [text]);

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="word-counter-input">Your text</FieldLabel>
      <Textarea
        id="word-counter-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here…"
        aria-describedby="word-counter-hint"
        rows={9}
      />
      <p id="word-counter-hint" className="mt-2 text-sm text-(--muted)">
        Counts update live. Your text never leaves this device.
      </p>

      <div aria-live="polite" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat value={formatNumber(stats.words)} label="Words" />
        <Stat value={formatNumber(stats.characters)} label="Characters" />
        <Stat value={formatNumber(stats.charactersNoSpaces)} label="No spaces" />
        <Stat value={formatNumber(stats.sentences)} label="Sentences" />
        <Stat value={formatNumber(stats.paragraphs)} label="Paragraphs" />
        <Stat value={readingLabel(stats.readingSeconds)} label="Reading time" />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={copy} disabled={!text} aria-live="polite">
          {copied ? "Copied ✓" : "Copy text"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setText("")} disabled={!text}>
          Clear
        </Button>
      </div>
    </div>
  );
}
