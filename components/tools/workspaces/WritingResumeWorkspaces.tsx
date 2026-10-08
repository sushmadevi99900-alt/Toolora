"use client";

import { useState } from "react";
import { Button } from "../../ui/Button";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Err, Gen, Note, RefTable, TextOp, asTool, useCopied } from "../kits/kits";
import { randomInt } from "@/lib/engine/crypto";
import { downloadTextFile } from "@/lib/engine/formatters";

export const writingresumeRegistry: Record<string, React.ComponentType> = {
  "text-summarizer": asTool(<SummarizerTool />),
  "grammar-helper": asTool(<GrammarTool />),
  "sentence-rewriter": asTool(<SentenceVariatorTool />),
  "paragraph-formatter": asTool(<ParagraphTool />),
  "email-formatter": asTool(<EmailTool />),
  "email-signature-generator": asTool(<SignatureGenTool />),
  "cover-letter-generator": asTool(<CoverLetterTool />),
  "formal-letter-generator": asTool(<FormalLetterTool />),
  "thank-you-generator": asTool(<ThankYouTool />),
  "apology-generator": asTool(<ApologyTool />),
  "announcement-generator": asTool(<AnnounceTool />),
  "bio-generator": asTool(<BioGenTool />),
  "introduction-generator": asTool(<IntroTool />),
  "headline-generator": asTool(<HeadlineTool />),
  "cta-generator": asTool(<CtaTool />),
  "sentence-counter": asTool(<SentenceCounterTool />),
  "filler-word-checker": asTool(<FillerTool />),
  "resume-builder": asTool(<ResumeBuilderTool />),
  "resume-formatter": asTool(<ResumeFormatTool />),
  "resume-text-cleaner": asTool(<ResumeCleanTool />),
  "resume-word-counter": asTool(<ResumeCountTool />),
  "resume-pdf-generator": asTool(<ResumePdfTool />),
  "resume-cover-builder": asTool(<ResumeCoverTool />),
  "job-application-tracker": asTool(<JobTrackerTool />),
  "interview-question-generator": asTool(<InterviewTool />),
  "skills-list-generator": asTool(<SkillsTool />),
  "professional-summary-generator": asTool(<SummaryTool />),
  "action-verb-finder": asTool(<VerbFinderTool />),
  "reference-list-generator": asTool(<ReferenceTool />),
};

const TPL = "(Template-based draft assembled on-device — edit to taste. No AI involved.)";

function sentencesOf(t: string): string[] {
  return (t.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) ?? [t.trim()]).map((s) => s.trim()).filter(Boolean);
}

/* ---------- writing ---------- */

function SummarizerTool() {
  return (
    <Gen
      fields={[
        { key: "text", label: "Text to summarize", type: "textarea", required: true },
        {
          key: "n", label: "Summary sentences", type: "select",
          options: ["2", "3", "4", "5"].map((n) => ({ value: n, label: n })),
        },
      ]}
      generate={(v) => {
        const sents = sentencesOf(v.text ?? "");
        if (sents.length < 3) return { error: "Paste at least 3 sentences." };
        const freq = new Map<string, number>();
        for (const s of sents) {
          for (const w of s.toLowerCase().match(/[a-z0-9']+/g) ?? []) {
            if (w.length > 3) freq.set(w, (freq.get(w) ?? 0) + 1);
          }
        }
        const scored = sents.map((s, i) => {
          const words = s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
          const score = words.reduce((n, w) => n + (freq.get(w) ?? 0), 0) / Math.max(1, words.length);
          return { s, i, score };
        });
        const n = Math.min(sents.length - 1, Number(v.n) || 3);
        const top = scored.sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.i - b.i);
        return `${top.map((t) => t.s).join(" ")}\n\n(Extractive summary: top ${n} of ${sents.length} sentences by word frequency. Not AI.)`;
      }}
      fileName="summary.txt"
      button="Summarize"
    />
  );
}

const GRAMMAR_RULES: [RegExp, string][] = [
  [/\s{2,}/g, "Double spaces"],
  [/\b(\w+)\s+\1\b/gi, "Repeated word"],
  [/\ba\s+[aeiou]/gi, "“a” before a vowel — usually “an”"],
  [/\ban\s+[^aeiou\s]/gi, "“an” before a consonant — usually “a”"],
  [/\btheir\s+is\b/gi, "“their is” — probably “there is”"],
  [/\bthere\s+car\b/gi, "Check there/their/they're"],
  [/\byour\s+welcome\b/gi, "“your welcome” — probably “you're welcome”"],
  [/\bcould\s+of\b/gi, "“could of” — write “could have”"],
  [/\bthen\s+he\s+went\b/gi, "Check then/than"],
  [/\.{4,}/g, "Too many dots"],
  [/\?{2,}|\!{2,}/g, "Multiple ! or ? marks"],
  [/\bi\b/g, "Lowercase “i” — capitalize “I”"],
];

function GrammarTool() {
  return (
    <TextOp
      placeholder="Paste text for basic checks…"
      button="Check writing"
      process={(t) => {
        const hits: string[] = [];
        for (const [re, msg] of GRAMMAR_RULES) {
          const m = t.match(re);
          if (m) hits.push(`${msg} (${m.length}×)`);
        }
        const sents = sentencesOf(t);
        const long = sents.filter((s) => s.split(/\s+/).length > 30).length;
        if (long > 0) hits.push(`${long} very long sentence(s) — consider splitting`);
        const report = hits.length === 0
          ? "No issues found by these basic checks. (This is not a full grammar engine — proofread important work.)"
          : `Found ${hits.length} kind(s) of issue:\n• ${hits.join("\n• ")}`;
        return { output: report, stats: [["Checks run", String(GRAMMAR_RULES.length + 1)], ["Issues", String(hits.length)]] };
      }}
    />
  );
}

const FILLERS = ["very", "really", "just", "quite", "actually", "basically", "literally", "stuff", "things", "a lot", "in order to", "due to the fact that", "at the end of the day"];

function SentenceVariatorTool() {
  return (
    <TextOp
      placeholder="Paste sentences to vary…"
      button="Make variants"
      process={(t) => {
        const sents = sentencesOf(t);
        if (sents.length === 0) return { error: "Enter at least one sentence." };
        const variants: string[] = [];
        for (const s of sents.slice(0, 20)) {
          variants.push(`• Original: ${s}`);
          let trimmed = s;
          for (const f of FILLERS) {
            trimmed = trimmed.replace(new RegExp(`\\b${f}\\b\\s*`, "gi"), "");
          }
          trimmed = trimmed.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
          if (trimmed && trimmed !== s) variants.push(`• Tighter: ${trimmed}`);
          if (s.split(/\s+/).length > 22) {
            const mid = s.search(/, (and|but|which|who|where|when) /i);
            if (mid > 10) variants.push(`• Split: ${s.slice(0, mid)}. ${s.slice(mid + 2, mid + 3).toUpperCase()}${s.slice(mid + 3)}`);
          }
        }
        return { output: `${variants.join("\n")}\n\n(Deterministic transforms: filler trims + long-sentence splits. Real edits, no AI.)`, stats: [["Sentences", String(Math.min(20, sents.length))]] };
      }}
    />
  );
}

function ParagraphTool() {
  return (
    <Gen
      fields={[
        { key: "text", label: "Wall of text", type: "textarea", required: true },
        { key: "w", label: "Wrap width (0 = paragraphs only)", type: "number", def: "0" },
      ]}
      generate={(v) => {
        const raw = (v.text ?? "").replace(/[ \t]+/g, " ").trim();
        if (!raw) return { error: "Enter some text." };
        const paras = raw.split(/\n\s*\n/).flatMap((p) => {
          // Split on sentence runs into paragraphs of ~3 sentences.
          const s = sentencesOf(p);
          const out: string[] = [];
          for (let i = 0; i < s.length; i += 3) out.push(s.slice(i, i + 3).join(" "));
          return out.length ? out : [p];
        });
        const w = Math.floor(Number(v.w) || 0);
        const wrap = (p: string): string => {
          if (w < 20) return p;
          const words = p.split(" ");
          const lines: string[] = [];
          let cur = "";
          for (const word of words) {
            if ((cur + " " + word).trim().length > w) {
              lines.push(cur.trim());
              cur = word;
            } else cur += " " + word;
          }
          if (cur.trim()) lines.push(cur.trim());
          return lines.join("\n");
        };
        return paras.map(wrap).join("\n\n");
      }}
      fileName="paragraphs.txt"
      button="Format paragraphs"
    />
  );
}

function EmailTool() {
  return (
    <Gen
      fields={[
        { key: "to", label: "To (name)", type: "text", required: true },
        { key: "subject", label: "Subject", type: "text", required: true },
        { key: "body", label: "Main points (one per line)", type: "textarea", required: true },
        { key: "from", label: "Your name", type: "text", required: true },
      ]}
      generate={(v) => {
        const points = (v.body ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (points.length === 0) return { error: "Add at least one main point." };
        const body = points.length === 1 ? points[0] : points.map((p) => `• ${p}`).join("\n");
        return `To: ${v.to}\nSubject: ${v.subject}\n\nHi ${v.to},\n\n${body}\n\nBest regards,\n${v.from}`;
      }}
      fileName="email.txt"
      button="Format email"
    />
  );
}

function SignatureGenTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Full name", type: "text", required: true },
        { key: "role", label: "Role", type: "text" },
        { key: "phone", label: "Phone", type: "text" },
        { key: "site", label: "Website", type: "text" },
      ]}
      generate={(v) => {
        const lines = [v.name?.trim(), v.role?.trim(), v.phone?.trim(), v.site?.trim()].filter(Boolean);
        const text = lines.join("\n");
        const html = `<div>\n  <strong>${v.name?.trim() ?? ""}</strong>${v.role?.trim() ? `<br />${v.role.trim()}` : ""}${v.phone?.trim() ? `<br />${v.phone.trim()}` : ""}${v.site?.trim() ? `<br /><a href="${v.site.trim()}">${v.site.trim()}</a>` : ""}\n</div>`;
        return `--- PLAIN TEXT ---\n${text}\n\n--- HTML ---\n${html}`;
      }}
      fileName="signature.txt"
      button="Generate signature"
    />
  );
}

function letterFields(): { key: string; label: string; type: "text" | "textarea"; required?: boolean }[] {
  return [
    { key: "from", label: "Your name", type: "text", required: true },
    { key: "to", label: "Recipient", type: "text", required: true },
    { key: "subject", label: "Subject", type: "text", required: true },
    { key: "body", label: "Main points (one per line)", type: "textarea", required: true },
  ];
}

function CoverLetterTool() {
  return (
    <Gen
      fields={[
        ...letterFields(),
        { key: "role", label: "Role applied for", type: "text", required: true },
        { key: "company", label: "Company", type: "text", required: true },
      ]}
      generate={(v) => {
        const points = (v.body ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (points.length === 0) return { error: "Add at least one point about yourself." };
        return [
          `Dear ${v.to},`, "",
          `I am writing to apply for the ${v.role} position at ${v.company}.`,
          "",
          ...points.map((p) => `${p}`),
          "",
          `Thank you for your consideration. I would welcome the chance to discuss how I can contribute to ${v.company}.`,
          "",
          `Sincerely,`,
          `${v.from}`,
          "",
          `(${TPL})`,
        ].join("\n");
      }}
      fileName="cover-letter.txt"
      button="Draft cover letter"
    />
  );
}

function FormalLetterTool() {
  return (
    <Gen
      fields={[...letterFields(), { key: "date", label: "Date", type: "text", def: new Date().toLocaleDateString() }]}
      generate={(v) => {
        const points = (v.body ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (points.length === 0) return { error: "Add the letter body." };
        return [
          `${v.from}`, `${v.date}`, "",
          `To: ${v.to}`, `Subject: ${v.subject}`, "",
          `Dear ${v.to},`, "",
          ...points, "",
          `Yours faithfully,`, `${v.from}`, "",
          `(${TPL})`,
        ].join("\n");
      }}
      fileName="formal-letter.txt"
      button="Draft letter"
    />
  );
}

function ThankYouTool() {
  const OCCASIONS = ["Interview", "Gift", "Help & support", "Business meeting", "Hospitality"];
  return (
    <Gen
      fields={[
        {
          key: "occ", label: "Occasion", type: "select",
          options: OCCASIONS.map((o) => ({ value: o, label: o })),
        },
        { key: "who", label: "Thank whom", type: "text", required: true },
        { key: "detail", label: "Specific detail to mention", type: "text", required: true },
        { key: "from", label: "Your name", type: "text", required: true },
      ]}
      generate={(v) => {
        const openers: Record<string, string> = {
          Interview: `Thank you for taking the time to speak with me. I especially appreciated ${v.detail}.`,
          Gift: `Thank you so much for ${v.detail}. It was thoughtful and I love it.`,
          "Help & support": `Thank you for your help with ${v.detail}. I couldn't have done it without you.`,
          "Business meeting": `Thank you for the productive conversation about ${v.detail}.`,
          Hospitality: `Thank you for your wonderful hospitality — especially ${v.detail}.`,
        };
        return [`Dear ${v.who},`, "", openers[v.occ ?? ""] ?? `Thank you for ${v.detail}.`, "", "With gratitude,", `${v.from}`, "", `(${TPL})`].join("\n");
      }}
      fileName="thank-you.txt"
      button="Draft note"
    />
  );
}

function ApologyTool() {
  return (
    <Gen
      fields={[
        { key: "who", label: "Apologize to", type: "text", required: true },
        { key: "what", label: "What happened", type: "text", required: true },
        { key: "fix", label: "How you'll make it right", type: "text", required: true },
        { key: "from", label: "Your name", type: "text", required: true },
      ]}
      generate={(v) => [
        `Dear ${v.who},`, "",
        `I sincerely apologize for ${v.what}. I take full responsibility — there is no excuse.`,
        "",
        `To make it right, I will: ${v.fix}.`,
        "",
        `I value our relationship and hope to rebuild your trust.`,
        "",
        `Sincerely,`, `${v.from}`, "",
        `(${TPL})`,
      ].join("\n")}
      fileName="apology.txt"
      button="Draft apology"
    />
  );
}

function AnnounceTool() {
  return (
    <Gen
      fields={[
        { key: "what", label: "What is announced", type: "text", required: true },
        { key: "when", label: "When", type: "text", required: true },
        { key: "where", label: "Where / how to join", type: "text" },
        { key: "detail", label: "Key detail", type: "textarea", required: true },
      ]}
      generate={(v) => [
        `📢 ANNOUNCEMENT: ${v.what}`, "",
        `When: ${v.when}`,
        ...((v.where ?? "").trim() ? [`Where: ${v.where}`] : []),
        "",
        `${v.detail}`,
        "",
        `(${TPL})`,
      ].join("\n")}
      fileName="announcement.txt"
      button="Draft announcement"
    />
  );
}

function BioGenTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "role", label: "Role", type: "text", required: true },
        { key: "years", label: "Years of experience", type: "number", def: "5" },
        { key: "field", label: "Field / industry", type: "text" },
        { key: "person", label: "Person", type: "select", options: [{ value: "3rd", label: "Third person" }, { value: "1st", label: "First person" }] },
      ]}
      generate={(v) => {
        const yrs = Math.max(0, Math.floor(Number(v.years) || 0));
        const field = (v.field ?? "").trim() ? ` in ${(v.field ?? "").trim()}` : "";
        const first = `${v.name} is a ${v.role} with ${yrs} years of experience${field}.`;
        const one = v.person === "1st"
          ? `I'm ${v.name}, a ${v.role} with ${yrs} years of experience${field}.`
          : first;
        const short = v.person === "1st"
          ? `${v.role} · ${yrs}y exp${field}`
          : `${v.name} — ${v.role} (${yrs}y${field})`;
        return `LONG:\n${one}\n\nSHORT:\n${short}\n\n(${TPL})`;
      }}
      fileName="bio.txt"
      button="Draft bio"
    />
  );
}

function IntroTool() {
  return (
    <Gen
      fields={[
        { key: "topic", label: "Topic", type: "text", required: true },
        {
          key: "angle", label: "Opening angle", type: "select",
          options: ["Question", "Surprising fact frame", "Problem statement", "Story frame"].map((a) => ({ value: a, label: a })),
        },
      ]}
      generate={(v) => {
        const t = (v.topic ?? "").trim();
        const frames: Record<string, string> = {
          Question: `What does ${t} really mean for you? This introduction frames the question and outlines what follows.`,
          "Surprising fact frame": `${t} affects more people than most realize. This piece unpacks why it matters and what to do about it.`,
          "Problem statement": `${t} is harder than it looks. Here is the problem, why common fixes fail, and a clearer path forward.`,
          "Story frame": `It started with a simple question about ${t}. What followed changed how I think about it — here is the story.`,
        };
        return `${frames[v.angle ?? ""] ?? frames.Question}\n\n(Opening paragraph template filled with your topic — continue in your own words. ${TPL})`;
      }}
      fileName="introduction.txt"
      button="Draft introduction"
    />
  );
}

function HeadlineTool() {
  return (
    <Gen
      fields={[{ key: "topic", label: "Topic", type: "text", required: true }]}
      generate={(v) => {
        const t = (v.topic ?? "").trim();
        const heads = [
          `The Beginner's Guide to ${t}`,
          `10 Things Nobody Tells You About ${t}`,
          `How to Get Started With ${t} Today`,
          `${t}: Mistakes to Avoid`,
          `Why ${t} Matters More Than Ever`,
          `The Ultimate ${t} Checklist`,
        ];
        return heads.map((h) => `${h}  [${h.length} chars]`).join("\n") + `\n\n(${TPL})`;
      }}
      fileName="headlines.txt"
      button="Generate headlines"
    />
  );
}

function CtaTool() {
  const TONES = ["Direct", "Friendly", "Urgent"];
  return (
    <Gen
      fields={[
        { key: "action", label: "Desired action", type: "text", required: true, placeholder: "e.g. start free trial" },
        { key: "benefit", label: "Benefit", type: "text", required: true, placeholder: "e.g. save 5 hours a week" },
      ]}
      generate={(v) => {
        const a = (v.action ?? "").trim();
        const b = (v.benefit ?? "").trim();
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const out = [
          `[Direct] ${cap(a)} — ${b}.`,
          `[Friendly] Ready to ${a}? ${cap(b)} 🙂`,
          `[Urgent] Don't wait — ${a} today and ${b}!`,
        ];
        void TONES;
        return out.join("\n") + `\n\n(${TPL})`;
      }}
      fileName="ctas.txt"
      button="Generate CTAs"
    />
  );
}

function SentenceCounterTool() {
  return (
    <TextOp
      placeholder="Paste text…"
      button="Count sentences"
      process={(t) => {
        const s = sentencesOf(t);
        if (s.length === 0) return { error: "No sentences found." };
        const lens = s.map((x) => x.split(/\s+/).length);
        return {
          output: `Sentences: ${s.length}\nAverage: ${(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1)} words\nLongest: ${Math.max(...lens)} words — “${s[lens.indexOf(Math.max(...lens))] as string}”`,
          stats: [["Sentences", String(s.length)], ["Avg words", (lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1)]],
        };
      }}
    />
  );
}

const FILLER_LIST = ["very", "really", "just", "quite", "actually", "basically", "literally", "stuff", "things", "a lot", "very unique", "in order to", "due to the fact", "at this point", "needless to say"];

function FillerTool() {
  return (
    <TextOp
      placeholder="Paste writing to scan for filler…"
      button="Find fillers"
      process={(t) => {
        const low = ` ${t.toLowerCase()} `;
        const hits = FILLER_LIST.map((f) => ({ f, c: low.split(` ${f} `).length - 1 + low.split(` ${f},`).length - 1 + low.split(` ${f}.`).length - 1 }))
          .filter((h) => h.c > 0)
          .sort((a, b) => b.c - a.c);
        const words = t.trim().split(/\s+/).length;
        const total = hits.reduce((n, h) => n + h.c, 0);
        if (hits.length === 0) return { output: "No filler words from the checklist found. Nice and tight.", stats: [["Words", String(words)]] };
        return {
          output: hits.map((h) => `“${h.f}”: ${h.c}×`).join("\n"),
          stats: [["Filler hits", String(total)], ["Density", `${((total / Math.max(1, words)) * 100).toFixed(2)}%`], ["Words", String(words)]],
        };
      }}
    />
  );
}

/* ---------- resume ---------- */

function ResumeBuilderTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Full name", type: "text", required: true },
        { key: "title", label: "Target title", type: "text", required: true },
        { key: "email", label: "Email", type: "text" },
        { key: "phone", label: "Phone", type: "text" },
        { key: "summary", label: "Summary (1–2 lines)", type: "textarea" },
        { key: "exp", label: "Experience (one per line: role @ company, years)", type: "textarea" },
        { key: "edu", label: "Education (one per line)", type: "textarea" },
        { key: "skills", label: "Skills (comma separated)", type: "textarea" },
      ]}
      generate={(v) => {
        const L: string[] = [(v.name ?? "").trim().toUpperCase(), (v.title ?? "").trim(), ""];
        const contact = [v.email, v.phone].map((x) => (x ?? "").trim()).filter(Boolean).join(" · ");
        if (contact) L.push(contact, "");
        if ((v.summary ?? "").trim()) L.push("SUMMARY", (v.summary ?? "").trim(), "");
        const exp = (v.exp ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (exp.length > 0) L.push("EXPERIENCE", ...exp.map((e) => `• ${e}`), "");
        const edu = (v.edu ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
        if (edu.length > 0) L.push("EDUCATION", ...edu.map((e) => `• ${e}`), "");
        const skills = (v.skills ?? "").split(",").map((x) => x.trim()).filter(Boolean);
        if (skills.length > 0) L.push("SKILLS", skills.join(" · "));
        return L.join("\n");
      }}
      fileName="resume.txt"
      button="Build resume"
    />
  );
}

function ResumeFormatTool() {
  return (
    <TextOp
      placeholder="Paste resume text to normalise…"
      button="Format resume"
      fileName="resume-formatted.txt"
      process={(t) => {
        const lines = t.split("\n").map((l) => l.trimEnd());
        const out: string[] = [];
        for (const l of lines) {
          if (/^[-*•]\s*/.test(l)) out.push(`• ${l.replace(/^[-*•]\s*/, "").trim()}`);
          else if (/^\d+[.)]\s*/.test(l)) out.push(`• ${l.replace(/^\d+[.)]\s*/, "").trim()}`);
          else out.push(l.replace(/[ \t]{2,}/g, " "));
        }
        const collapsed = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        // Normalise common date shapes: 01/2020 -> Jan 2020
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const fixed = collapsed.replace(/\b(0?[1-9]|1[0-2])\/(\d{4})\b/g, (_, m, y) => `${months[Number(m) - 1]} ${y}`);
        return { output: fixed, stats: [["Lines", String(fixed.split("\n").length)]] };
      }}
    />
  );
}

function ResumeCleanTool() {
  return (
    <TextOp
      placeholder="Paste a resume copied from a table/PDF…"
      button="Clean text"
      fileName="resume-clean.txt"
      process={(t) => {
        let out = t.replace(/\|/g, " ").replace(/�/g, "").replace(/[ \t]+/g, " ");
        out = out.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).join("\n");
        out = out.replace(/\n{3,}/g, "\n\n").trim();
        if (!out) return { error: "Nothing left after cleaning." };
        return { output: out, stats: [["Lines kept", String(out.split("\n").length)]] };
      }}
    />
  );
}

const ACTION_VERBS = "achieved,improved,led,launched,built,designed,delivered,implemented,automated,reduced,increased,negotiated,mentored,optimized,created,managed,coordinated,developed,streamlined,resolved,trained,analyzed,grew,shipped,owned,drove,scaled,founded,pioneered,accelerated".split(",");

function ResumeCountTool() {
  return (
    <TextOp
      placeholder="Paste resume text…"
      button="Analyze resume"
      process={(t) => {
        const words = t.trim() ? t.trim().split(/\s+/).length : 0;
        if (words === 0) return { error: "Paste resume text first." };
        const low = t.toLowerCase();
        const hits = ACTION_VERBS.filter((vb) => new RegExp(`\\b${vb}\\w*\\b`).test(low));
        const pages = words / 500;
        return {
          output: [
            `Words: ${words} (≈ ${pages.toFixed(1)} pages)`,
            `Action verbs found (${hits.length}): ${hits.join(", ") || "none — add some"}`,
            words > 800 ? "Long for most roles — trim toward one page per 10 years." : "Length looks reasonable.",
          ].join("\n"),
          stats: [["Words", String(words)], ["Action verbs", String(hits.length)]],
        };
      }}
    />
  );
}

function ResumePdfTool() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const run = async () => {
    setError("");
    if (!text.trim()) {
      setError("Paste or type your resume text first.");
      return;
    }
    setWorking(true);
    try {
      const { PDFDocument, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const lines = text.replace(/\t/g, "  ").split("\n").slice(0, 120);
      let page = doc.addPage([595, 842]);
      let y = 800;
      const draw = (str: string, isHead: boolean) => {
        const f = isHead ? bold : font;
        const size = isHead ? 11 : 10;
        const words = str.split(" ");
        let line = "";
        const flush = (ln: string) => {
          if (y < 50) {
            page = doc.addPage([595, 842]);
            y = 800;
          }
          page.drawText(ln.slice(0, 110), { x: 50, y, size, font: f });
          y -= size + 5;
        };
        for (const w of words) {
          if ((line + " " + w).length > 95) {
            flush(line);
            line = w;
          } else line += (line ? " " : "") + w;
        }
        if (line) flush(line);
      };
      let first = true;
      for (const ln of lines) {
        const t = ln.trim();
        if (!t) {
          y -= 6;
          continue;
        }
        const isHead = first || /^[A-Z][A-Z \-/&]{3,}$/.test(t);
        draw(t, isHead);
        first = false;
      }
      const data = await doc.save();
      await PDFDocument.load(data);
      const blob = new Blob([data as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF generation failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <FieldLabel htmlFor="rp-in">Resume text (use ALL-CAPS lines for headings)</FieldLabel>
      <Textarea id="rp-in" value={text} placeholder="JANE DOE&#10;Product Designer&#10;&#10;EXPERIENCE&#10;• …" onChange={(e) => setText(e.target.value)} />
      <div className="mt-3">
        <Button type="button" onClick={() => void run()} disabled={working}>{working ? "Building…" : "Generate PDF"}</Button>
      </div>
      <Err message={error} />
      <Note>Single-column, ATS-friendly layout generated locally with real PDF bytes.</Note>
    </div>
  );
}

function ResumeCoverTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Your name", type: "text", required: true },
        { key: "role", label: "Role", type: "text", required: true },
        { key: "company", label: "Company", type: "text", required: true },
        { key: "points", label: "Top 3 fit points (one per line)", type: "textarea", required: true },
      ]}
      generate={(v) => {
        const pts = (v.points ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 5);
        if (pts.length === 0) return { error: "Add at least one fit point." };
        return [
          `Dear ${v.company} hiring team,`, "",
          `I am excited to apply for the ${v.role} role. A quick snapshot of my fit:`,
          "",
          ...pts.map((p) => `• ${p}`),
          "",
          `Thank you for your time — I would love to discuss this further.`,
          "",
          `Best,`, `${v.name}`, "",
          `(${TPL})`,
        ].join("\n");
      }}
      fileName="cover-letter.txt"
      button="Draft cover letter"
    />
  );
}

interface JobApp {
  company: string;
  role: string;
  status: string;
  date: string;
}

const KEY = "toolora-job-tracker";
const STATUSES = ["Applied", "Screening", "Interview", "Offer", "Rejected", "On hold"];

function JobTrackerTool() {
  const [apps, setApps] = useState<JobApp[]>(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const p = raw ? (JSON.parse(raw) as JobApp[]) : [];
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  });
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(STATUSES[0] as string);
  const [filter, setFilter] = useState("All");
  const [copied, copy] = useCopied();

  const save = (next: JobApp[]) => {
    setApps(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const add = () => {
    if (!company.trim() || !role.trim()) return;
    save([...apps, { company: company.trim(), role: role.trim(), status, date: new Date().toISOString().slice(0, 10) }]);
    setCompany("");
    setRole("");
  };

  const shown = filter === "All" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <FieldLabel htmlFor="jt-c">Company</FieldLabel>
          <Input id="jt-c" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="jt-r">Role</FieldLabel>
          <Input id="jt-r" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="jt-s">Status</FieldLabel>
          <select id="jt-s" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={add}>Add application</Button>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" className="min-h-[44px] rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
          {["All", ...STATUSES].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <p role="status" className="mt-3 text-sm text-(--muted)">{shown.length} application(s) · stored only in your browser</p>
      {shown.length > 0 && (
        <>
          <ul className="mt-2 space-y-2">
            {shown.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-(--border) px-3 py-2 text-sm">
                <span className="flex-1"><strong>{a.company}</strong> — {a.role} <span className="text-(--muted)">({a.date})</span></span>
                <select
                  value={a.status}
                  aria-label={`Status for ${a.company}`}
                  onChange={(e) => save(apps.map((x, j) => (x === a ? { ...x, status: e.target.value } : x)))}
                  className="rounded-lg border border-(--border) bg-(--surface) px-2 py-1.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" aria-label={`Remove ${a.company}`} onClick={() => save(apps.filter((x) => x !== a))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-(--surface-2)">×</button>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => copy(shown.map((a) => `${a.company} | ${a.role} | ${a.status} | ${a.date}`).join("\n"))}>
              {copied ? "Copied!" : "Copy list"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const INTERVIEW_BANK: { cat: string; q: string }[] = [
  { cat: "General", q: "Tell me about yourself." },
  { cat: "General", q: "Why do you want this role?" },
  { cat: "General", q: "What are your greatest strengths?" },
  { cat: "General", q: "What is a weakness you're working on?" },
  { cat: "General", q: "Where do you see yourself in five years?" },
  { cat: "General", q: "Why are you leaving your current role?" },
  { cat: "General", q: "What do you know about our company?" },
  { cat: "General", q: "What motivates you at work?" },
  { cat: "Behavioral", q: "Describe a disagreement with a teammate and how you resolved it." },
  { cat: "Behavioral", q: "Tell me about a time you missed a deadline." },
  { cat: "Behavioral", q: "Give an example of leading without authority." },
  { cat: "Behavioral", q: "Describe your biggest professional failure and what you learned." },
  { cat: "Behavioral", q: "Tell me about a time you received tough feedback." },
  { cat: "Behavioral", q: "Describe a project you're proud of and your exact contribution." },
  { cat: "Behavioral", q: "How do you prioritize when everything is urgent?" },
  { cat: "Behavioral", q: "Tell me about a conflict with a manager." },
  { cat: "Role", q: "Walk me through your process on a typical task." },
  { cat: "Role", q: "Which tools do you use daily and why?" },
  { cat: "Role", q: "How do you measure success in your work?" },
  { cat: "Role", q: "Describe a hard technical decision you made." },
  { cat: "Role", q: "How do you learn a new skill quickly?" },
  { cat: "Role", q: "What would your first 90 days look like here?" },
  { cat: "Role", q: "How do you handle ambiguous requirements?" },
  { cat: "Role", q: "Explain a complex topic from your field simply." },
  { cat: "Situational", q: "You discover a critical bug hours before launch. What do you do?" },
  { cat: "Situational", q: "Two deadlines collide. How do you decide?" },
  { cat: "Situational", q: "A stakeholder rejects your proposal. Next steps?" },
  { cat: "Situational", q: "You inherit a messy project. Where do you start?" },
  { cat: "Situational", q: "A teammate isn't delivering. What do you do?" },
  { cat: "Situational", q: "How would you handle an angry client?" },
  { cat: "Closing", q: "What questions do you have for us?" },
  { cat: "Closing", q: "What salary range are you targeting?" },
  { cat: "Closing", q: "When could you start?" },
  { cat: "Closing", q: "Is there anything else we should know?" },
  { cat: "Closing", q: "Why should we hire you over other candidates?" },
  { cat: "General", q: "Describe your ideal work environment." },
  { cat: "Behavioral", q: "Tell me about a time you improved a process." },
  { cat: "Role", q: "What part of this role excites you most?" },
  { cat: "Situational", q: "You must cut scope to hit a date. How do you choose?" },
  { cat: "General", q: "What are you reading or learning right now?" },
];

function InterviewTool() {
  const [cat, setCat] = useState("All");
  const [current, setCurrent] = useState(INTERVIEW_BANK[0]);
  const [seen, setSeen] = useState(0);
  const [copied, copy] = useCopied();

  const draw = () => {
    const pool = cat === "All" ? INTERVIEW_BANK : INTERVIEW_BANK.filter((q) => q.cat === cat);
    const q = pool[randomInt(0, pool.length - 1).value] ?? INTERVIEW_BANK[0];
    setCurrent(q as { cat: string; q: string });
    setSeen((s) => s + 1);
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <FieldLabel htmlFor="iq-c">Category</FieldLabel>
          <select id="iq-c" value={cat} onChange={(e) => setCat(e.target.value)} className="min-h-[44px] rounded-xl border border-(--border) bg-(--surface) px-3 text-[15px]">
            {["All", "General", "Behavioral", "Role", "Situational", "Closing"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={draw}>New question</Button>
      </div>
      <div aria-live="polite" className="mt-4 rounded-2xl bg-(--surface-2) px-5 py-6 text-center">
        <p className="text-xs font-bold tracking-widest text-(--muted) uppercase">{current?.cat} · bank of {INTERVIEW_BANK.length}</p>
        <p className="mt-2 text-xl font-bold">“{current?.q}”</p>
        <p className="mt-2 text-xs text-(--muted)">Drawn {seen} time(s) this session · original practice bank</p>
      </div>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={() => copy(current?.q ?? "")}>{copied ? "Copied!" : "Copy question"}</Button>
      </div>
    </div>
  );
}

function SkillsTool() {
  return (
    <Gen
      fields={[
        { key: "role", label: "Role", type: "text", required: true },
        {
          key: "level", label: "Seniority", type: "select",
          options: ["Junior", "Mid-level", "Senior"].map((l) => ({ value: l, label: l })),
        },
      ]}
      generate={(v) => {
        const core = ["Communication", "Problem solving", "Time management", "Teamwork", "Attention to detail"];
        const mid = ["Mentoring", "Code review", "Technical writing", "Stakeholder updates"];
        const senior = ["System design", "Strategy", "Hiring & interviews", "Incident leadership"];
        const skills = [...core, ...(v.level !== "Junior" ? mid : []), ...(v.level === "Senior" ? senior : [])];
        return `SKILLS CHECKLIST — ${v.role} (${v.level})\n\n${skills.map((s) => `[ ] ${s}`).join("\n")}\n\n(Starter template — keep what fits the job ad. ${TPL})`;
      }}
      fileName="skills.txt"
      button="Generate checklist"
    />
  );
}

function SummaryTool() {
  return (
    <Gen
      fields={[
        { key: "years", label: "Years of experience", type: "number", def: "5", required: true },
        { key: "role", label: "Role", type: "text", required: true },
        { key: "strengths", label: "Top strengths (comma separated)", type: "text", required: true },
      ]}
      generate={(v) => {
        const yrs = Math.max(0, Math.floor(Number(v.years) || 0));
        const st = (v.strengths ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4).join(", ");
        return [
          `VARIANT 1:\n${v.role} with ${yrs} years of experience. Known for ${st}.`,
          ``,
          `VARIANT 2:\nResults-driven ${v.role} (${yrs}y) bringing ${st} to every team.`,
          ``,
          `VARIANT 3:\n${yrs} years as a ${v.role}; strengths include ${st}. Seeking roles where craft and impact matter.`,
          ``,
          `(${TPL})`,
        ].join("\n");
      }}
      fileName="summary.txt"
      button="Draft summaries"
    />
  );
}

const VERB_CATS: { cat: string; verbs: string[] }[] = [
  { cat: "Leadership", verbs: ["led", "mentored", "coordinated", "supervised", "directed", "championed", "delegated", "facilitated"] },
  { cat: "Building", verbs: ["built", "created", "designed", "developed", "launched", "established", "founded", "prototyped"] },
  { cat: "Improving", verbs: ["improved", "optimized", "streamlined", "automated", "reduced", "refactored", "upgraded", "accelerated"] },
  { cat: "Results", verbs: ["achieved", "delivered", "exceeded", "grew", "increased", "generated", "drove", "shipped"] },
  { cat: "Analysis", verbs: ["analyzed", "evaluated", "researched", "audited", "forecasted", "modeled", "diagnosed", "benchmarked"] },
  { cat: "Communication", verbs: ["presented", "negotiated", "advocated", "documented", "persuaded", "translated", "reported", "pitched"] },
];

function VerbFinderTool() {
  const [q, setQ] = useState("");
  const [copied, copy] = useCopied();
  const t = q.trim().toLowerCase();
  const cats = VERB_CATS.map(({ cat, verbs }) => ({ cat, verbs: verbs.filter((vb) => !t || vb.includes(t) || cat.toLowerCase().includes(t)) })).filter((c) => c.verbs.length > 0);
  const total = cats.reduce((n, c) => n + c.verbs.length, 0);
  return (
    <div>
      <FieldLabel htmlFor="vf-q">Search verbs</FieldLabel>
      <Input id="vf-q" value={q} placeholder="e.g. lead…" onChange={(e) => setQ(e.target.value)} />
      <p role="status" className="mt-2 text-xs text-(--muted)">{total} verbs{copied ? " — copied!" : ""}</p>
      <div className="mt-2 space-y-3">
        {cats.map(({ cat, verbs }) => (
          <div key={cat}>
            <p className="text-xs font-bold tracking-widest text-(--muted) uppercase">{cat}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {verbs.map((vb) => (
                <button key={vb} type="button" onClick={() => copy(vb)} className="min-h-[36px] rounded-lg border border-(--border) px-3 text-sm font-medium hover:bg-(--surface-2)">
                  {vb}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Your name", type: "text", required: true },
        { key: "refs", label: "References (one per line: name | title | contact)", type: "textarea", required: true },
      ]}
      generate={(v) => {
        const refs = (v.refs ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6);
        if (refs.length === 0) return { error: "Add at least one reference." };
        const out: string[] = [`PROFESSIONAL REFERENCES — ${(v.name ?? "").trim()}`, ""];
        for (const r of refs) {
          const [name, title, contact] = r.split("|").map((x) => x.trim());
          if (!name) return { error: `Each line needs at least a name — problem: “${r.slice(0, 50)}”.` };
          out.push(name);
          if (title) out.push(title);
          if (contact) out.push(contact);
          out.push("");
        }
        return out.join("\n");
      }}
      fileName="references.txt"
      button="Format references"
    />
  );
}
