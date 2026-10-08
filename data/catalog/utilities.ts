import type { ToolDefinition } from "@/types/tool";

type Draft = Omit<ToolDefinition, "seoTitle" | "seoDescription"> &
  Partial<Pick<ToolDefinition, "seoTitle" | "seoDescription">>;

function define(draft: Draft): ToolDefinition {
  return {
    ...draft,
    seoTitle: draft.seoTitle ?? `${draft.name} — Free Online Tool | Toolora`,
    seoDescription: draft.seoDescription ?? `${draft.name}: ${draft.shortDescription} Free, fast and mobile-friendly.`,
  };
}

export const utilityTools: ToolDefinition[] = [
  define({
    id: "coin-flip", slug: "coin-flip", name: "Coin Flip",
    shortDescription: "Heads or tails — settle it fairly.",
    longDescription: "Flip a virtual coin with fair 50/50 randomness and a running heads/tails tally for streaks and decisions.",
    category: "utilities", icon: "dice", status: "available", isFree: true, isPopular: false, isNew: true,
    seoTitle: "Coin Flip — Heads or Tails Online Free | Toolora",
    seoDescription: "Flip a coin online free. Fair heads-or-tails with tally — settle decisions instantly.",
    keywords: ["coin flip", "heads or tails", "flip a coin"],
    howToUse: ["Click flip.", "Read heads or tails.", "Track the tally."],
    features: ["Fair 50/50", "Tally tracker", "Streak display"],
    faq: [{ question: "Is it fair?", answer: "Yes — crypto-random with equal probability." }],
    relatedTools: ["dice-roller", "random-number-generator"],
  }),
  define({
    id: "dice-roller", slug: "dice-roller", name: "Dice Roller",
    shortDescription: "Roll d4–d100 dice for games and decisions.",
    longDescription: "Roll one or many polyhedral dice (d4, d6, d8, d10, d12, d20, d100) with totals, history and modifiers for tabletop games.",
    category: "utilities", icon: "dice", status: "available", isFree: true, isPopular: false, isNew: true,
    seoTitle: "Dice Roller — Roll d4–d100 Online Free | Toolora",
    seoDescription: "Roll dice online free: d4 to d100 with totals, modifiers and history for tabletop games.",
    keywords: ["dice roller", "roll dice", "d20 roller", "virtual dice"],
    howToUse: ["Pick dice type.", "Roll.", "Add modifiers."],
    features: ["d4–d100", "Multi-dice + modifiers", "Roll history"],
    faq: [{ question: "Can I roll with advantage?", answer: "Roll 2d20 and keep the higher — modifiers handle the rest." }],
    relatedTools: ["coin-flip", "random-number-generator"],
  }),
  define({
    id: "stopwatch", slug: "stopwatch", name: "Stopwatch",
    shortDescription: "Precision stopwatch with laps.",
    longDescription: "A clean, keyboard-friendly stopwatch with millisecond precision, lap splitting and total tracking for workouts and sprints.",
    category: "utilities", icon: "clock", status: "available", isFree: true, isPopular: false, isNew: true,
    seoTitle: "Stopwatch — Precision Timer with Laps Free | Toolora",
    seoDescription: "Free online stopwatch with millisecond precision and lap splits. Keyboard-friendly for workouts.",
    keywords: ["stopwatch", "online stopwatch", "lap timer"],
    howToUse: ["Press start.", "Split laps as needed.", "Stop and reset."],
    features: ["Millisecond precision", "Lap splits", "Spacebar control"],
    faq: [{ question: "Does it run in background?", answer: "Timing uses wall-clock deltas, so brief tab switches stay accurate." }],
    relatedTools: ["countdown-timer", "time-duration"],
  }),
  define({
    id: "countdown-timer", slug: "countdown-timer", name: "Countdown Timer",
    shortDescription: "Focus countdowns with finish alert.",
    longDescription: "Set any duration for Pomodoro sessions, cooking and workouts — with progress ring, pause/resume and an audible finish alert.",
    category: "utilities", icon: "clock", status: "available", isFree: true, isPopular: false, isNew: true,
    seoTitle: "Countdown Timer — Focus & Pomodoro Free | Toolora",
    seoDescription: "Free countdown timer: Pomodoro focus sessions, presets, pause/resume and finish alert.",
    keywords: ["countdown timer", "pomodoro timer", "online timer"],
    howToUse: ["Set minutes.", "Start the countdown.", "Pause or reset anytime."],
    features: ["Quick presets", "Pause/resume", "Finish alert"],
    faq: [{ question: "Pomodoro presets?", answer: "Yes — 25/5 and 50/10 presets plus fully custom durations." }],
    relatedTools: ["stopwatch", "time-converter"],
  }),
  define({
    id: "text-to-speech", slug: "text-to-speech", name: "Text to Speech Reader",
    shortDescription: "Hear any text read aloud naturally.",
    longDescription: "Listen to articles and notes with your device's built-in voices — rate, pitch and voice controls included. Everything runs via on-device speech APIs.",
    category: "utilities", icon: "text", status: "available", isFree: true, isPopular: true, isNew: true,
    seoTitle: "Text to Speech — Read Text Aloud Free | Toolora",
    seoDescription: "Free text-to-speech reader: hear any text aloud with voice, rate and pitch controls. Private and instant.",
    keywords: ["text to speech", "tts", "read text aloud"],
    howToUse: ["Paste text.", "Pick a voice.", "Press play."],
    features: ["Device voices", "Rate + pitch control", "Pause/resume"],
    faq: [{ question: "Is my text uploaded?", answer: "No — synthesis uses your device's built-in speech engine." }],
    relatedTools: ["reading-time", "word-counter"],
  }),
];
