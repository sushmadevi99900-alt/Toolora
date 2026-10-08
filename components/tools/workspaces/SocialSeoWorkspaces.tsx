"use client";

import { useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Stat } from "../../ui/Card";
import { FieldLabel, Input, Textarea } from "../../ui/Input";
import { Calc, Err, FilePick, Gen, Note, TextOp, asTool, req, useCopied } from "../kits/kits";
import { randomInt } from "@/lib/engine/crypto";

export const socialseoRegistry: Record<string, React.ComponentType> = {
  "instagram-caption-generator": asTool(<InstaCaptionTool />),
  "youtube-title-generator": asTool(<YtTitleTool />),
  "youtube-description-formatter": asTool(<YtDescTool />),
  "hashtag-generator": asTool(<HashtagTool />),
  "social-bio-generator": asTool(<BioTool />),
  "twitter-counter": asTool(<TwitterCounterTool />),
  "instagram-counter": asTool(<InstaCounterTool />),
  "youtube-counter": asTool(<YtCounterTool />),
  "tiktok-counter": asTool(<TiktokCounterTool />),
  "youtube-thumbnail-checker": asTool(<ThumbCheckerTool />),
  "emoji-picker": asTool(<EmojiPickerTool />),
  "emoji-text-decorator": asTool(<EmojiDecorTool />),
  "content-idea-generator": asTool(<IdeaTool />),
  "social-username-checker": asTool(<UsernameTool />),
  "caption-line-breaker": asTool(<LineBreakTool />),
  "giveaway-winner-picker": asTool(<GiveawayTool />),
  "video-timestamp-formatter": asTool(<TimestampFmtTool />),
  "quote-text-formatter": asTool(<QuoteFmtTool />),
  "follow-link-generator": asTool(<FollowLinkTool />),
  "engagement-rate-calculator": asTool(<EngagementTool />),
  "meta-title-generator": asTool(<MetaTitleTool />),
  "meta-description-generator": asTool(<MetaDescTool />),
  "keyword-density-checker": asTool(<DensityTool />),
  "keyword-counter": asTool(<KeywordCountTool />),
  "seo-slug-generator": asTool(<SeoSlugTool />),
  "robots-txt-generator": asTool(<RobotsTool />),
  "sitemap-xml-generator": asTool(<SitemapXmlTool />),
  "canonical-url-generator": asTool(<CanonicalTool />),
  "open-graph-generator": asTool(<OgTool />),
  "twitter-card-generator": asTool(<TwitterCardTool />),
  "schema-markup-generator": asTool(<SchemaTool />),
  "faq-schema-generator": asTool(<FaqSchemaTool />),
  "article-schema-generator": asTool(<ArticleSchemaTool />),
  "product-schema-generator": asTool(<ProductSchemaTool />),
  "breadcrumb-schema-generator": asTool(<CrumbSchemaTool />),
  "website-schema-generator": asTool(<SiteSchemaTool />),
  "seo-heading-analyzer": asTool(<HeadingTool />),
  "url-seo-analyzer": asTool(<UrlSeoTool />),
  "readability-checker": asTool(<ReadabilityTool />),
  "serp-preview-generator": asTool(<SerpTool />),
  "alt-text-generator": asTool(<AltTextTool />),
};

const TPL_NOTE = "Template-based draft assembled on your device — edit to taste. No AI involved.";

/* ---------- social drafters ---------- */

function InstaCaptionTool() {
  return (
    <Gen
      fields={[
        { key: "topic", label: "Post topic", type: "text", required: true, placeholder: "e.g. weekend hike" },
        { key: "kw", label: "Keywords (comma separated)", type: "text", placeholder: "mountains, sunrise" },
        {
          key: "tone", label: "Tone", type: "select",
          options: [{ value: "Friendly", label: "Friendly" }, { value: "Funny", label: "Funny" }, { value: "Minimal", label: "Minimal" }, { value: "Inspiring", label: "Inspiring" }],
        },
      ]}
      generate={(v) => {
        const topic = v.topic?.trim() ?? "";
        const kws = (v.kw ?? "").split(",").map((k) => k.trim().replace(/^#/, "")).filter(Boolean);
        const tags = kws.map((k) => `#${k.replace(/\s+/g, "")}`).join(" ");
        const caps = [
          `${v.tone} moments: ${topic} ✨\n\n${tags}`,
          `POV: ${topic} 🌿\n\nSave this for later!\n\n${tags}`,
          `${topic} — ${v.tone.toLowerCase()} edition 💛\n\n${tags}`,
        ];
        return `${caps.join("\n\n---\n\n")}\n\n(${TPL_NOTE})`;
      }}
      fileName="captions.txt"
      button="Draft captions"
    />
  );
}

function YtTitleTool() {
  return (
    <Gen
      fields={[
        { key: "topic", label: "Video topic", type: "text", required: true },
        { key: "kw", label: "Main keyword", type: "text", required: true },
      ]}
      generate={(v) => {
        const t = v.topic?.trim() ?? "";
        const k = v.kw?.trim() ?? "";
        const ideas = [
          `${k}: The Complete Beginner's Guide (${t})`,
          `I Tried ${t} for 30 Days — Here's What Happened`,
          `${k} in 2026: Everything You Need to Know`,
          `How to Master ${t} (Step by Step)`,
          `7 ${k} Mistakes Beginners Always Make`,
        ];
        const lines = ideas.map((s) => `${s}  [${s.length}/100 chars]`);
        return `${lines.join("\n")}\n\n(${TPL_NOTE} Keep titles under 100 characters.)`;
      }}
      fileName="youtube-titles.txt"
      button="Generate titles"
    />
  );
}

function YtDescTool() {
  return (
    <Gen
      fields={[
        { key: "title", label: "Video title", type: "text", required: true },
        { key: "summary", label: "One-line summary", type: "textarea", required: true },
        { key: "links", label: "Links (one per line: label | url)", type: "textarea" },
        { key: "chapters", label: "Chapters (one per line: mm:ss title)", type: "textarea" },
      ]}
      generate={(v) => {
        const links = (v.links ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
          const [label, url] = l.split("|").map((x) => x.trim());
          return url ? `${label || url}: ${url}` : l;
        });
        const parts = [v.title?.trim(), "", v.summary?.trim(), ""];
        if ((v.chapters ?? "").trim()) parts.push("CHAPTERS:", (v.chapters ?? "").trim(), "");
        if (links.length > 0) parts.push("LINKS:", ...links);
        return parts.join("\n");
      }}
      fileName="youtube-description.txt"
      button="Format description"
    />
  );
}

function HashtagTool() {
  return (
    <Gen
      fields={[
        { key: "kw", label: "Keywords (comma separated)", type: "text", required: true },
        { key: "place", label: "Location/niche (optional)", type: "text" },
      ]}
      generate={(v) => {
        const kws = (v.kw ?? "").split(",").map((k) => k.trim().replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean).slice(0, 6);
        if (kws.length === 0) return { error: "Enter at least one keyword." };
        const exact = kws.map((k) => `#${k}`);
        const niche = kws.map((k) => `#${k}tips`).concat(kws.map((k) => `#${k}love`));
        const broad = ["#instagood", "#photooftheday", "#love", "#trending", "#viral", "#explore"].slice(0, 6);
        const loc = (v.place ?? "").trim() ? [`#${(v.place ?? "").trim().replace(/\s+/g, "")}`, `#visit${(v.place ?? "").trim().replace(/\s+/g, "")}`] : [];
        return [
          `Exact (${exact.length}):`, exact.join(" "), "",
          `Niche (${niche.length}):`, niche.join(" "), "",
          `Broad (${broad.length}):`, broad.join(" "),
          ...(loc.length ? ["", `Location (${loc.length}):`, loc.join(" ")] : []),
          "", "(Rule-based sets assembled on-device — mix ~5 exact + 10 niche + 5 broad per post.)",
        ].join("\n");
      }}
      fileName="hashtags.txt"
      button="Generate hashtags"
    />
  );
}

function BioTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Name / brand", type: "text", required: true },
        { key: "role", label: "What you do", type: "text", required: true },
        { key: "link", label: "Link text", type: "text" },
        { key: "emoji", label: "Include emoji", type: "checkbox", def: "1" },
      ]}
      generate={(v) => {
        const e = v.emoji === "1";
        const bio150 = `${e ? "✨ " : ""}${v.name} | ${v.role}${v.link?.trim() ? `\n👇 ${v.link.trim()}` : ""}`;
        const lines = [
          `Instagram (150 chars max):`, bio150.slice(0, 150), `[${bio150.length}/150]`, "",
          `X/Twitter (160 chars max):`, `${v.name} — ${v.role}${v.link?.trim() ? ` · ${v.link.trim()}` : ""}`.slice(0, 160), "",
          `TikTok (80 chars max):`, `${v.role} | ${v.name}`.slice(0, 80), "",
          `LinkedIn headline (220 chars max):`, `${v.role} at ${v.name}${v.link?.trim() ? ` · ${v.link.trim()}` : ""}`.slice(0, 220), "",
          `(${TPL_NOTE})`,
        ];
        return lines.join("\n");
      }}
      fileName="bio.txt"
      button="Draft bios"
    />
  );
}

/* ---------- counters ---------- */

function CounterShell({ limit, extra, children }: { limit: number; children?: React.ReactNode; extra?: (text: string) => [string, string][] }) {
  const [text, setText] = useState("");
  const [copied, copy] = useCopied();
  const stats: [string, string][] = [
    ["Characters", `${text.length.toLocaleString()} / ${limit}`],
    ["Remaining", String(Math.max(0, limit - text.length))],
    ["Words", String(text.trim() ? text.trim().split(/\s+/).length : 0)],
    ...(extra ? extra(text) : []),
  ];
  const over = text.length > limit;
  return (
    <div>
      <FieldLabel htmlFor="cs-counter">Text</FieldLabel>
      <Textarea id="cs-counter" value={text} placeholder="Type or paste…" onChange={(e) => setText(e.target.value)} />
      <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, val]) => (
          <div key={k} className="rounded-xl bg-(--surface-2) px-4 py-3 text-center">
            <div className="text-xl font-extrabold tabular-nums">{val}</div>
            <div className="mt-0.5 text-xs font-medium text-(--muted)">{k}</div>
          </div>
        ))}
      </div>
      {over && <p role="alert" className="mt-2 text-sm font-semibold text-danger-600">Over the limit by {text.length - limit} characters.</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="secondary" onClick={() => copy(text)}>{copied ? "Copied!" : "Copy text"}</Button>
        <Button type="button" variant="ghost" onClick={() => setText("")}>Clear</Button>
      </div>
      {children}
    </div>
  );
}

function TwitterCounterTool() {
  const [text, setText] = useState("");
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 280) {
    let cut = rest.lastIndexOf(" ", 280);
    if (cut < 100) cut = 280;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest || chunks.length === 0) chunks.push(rest);
  return (
    <div>
      <CounterShell limit={280} />
      <div className="mt-4">
        <FieldLabel htmlFor="tw-thread">Thread splitter (paste long text)</FieldLabel>
        <Textarea id="tw-thread" value={text} placeholder="Paste a long post to split into 280-char posts…" onChange={(e) => setText(e.target.value)} />
        <p role="status" className="mt-2 text-sm text-(--muted)">Splits into {chunks.filter(Boolean).length} post(s) at word boundaries.</p>
        {chunks.filter(Boolean).length > 1 && (
          <ol className="mt-2 space-y-2">
            {chunks.filter(Boolean).map((c, i) => (
              <li key={i} className="rounded-xl border border-(--border) px-3 py-2 text-sm">
                <span className="font-bold text-brand-700 dark:text-brand-300">{i + 1}/{chunks.filter(Boolean).length} </span>
                {c} <span className="text-(--muted)">({c.length})</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function InstaCounterTool() {
  return (
    <CounterShell
      limit={2200}
      extra={(t) => [
        ["Hashtags", String((t.match(/#[\p{L}\d_]+/gu) ?? []).length)],
        ["Mentions", String((t.match(/@[\p{L}\d_.]+/gu) ?? []).length)],
      ]}
    />
  );
}

function YtCounterTool() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div>
      <FieldLabel htmlFor="yt-t">Title (limit 100)</FieldLabel>
      <Input id="yt-t" value={title} onChange={(e) => setTitle(e.target.value)} />
      <p role="status" className={title.length > 100 ? "mt-1 text-sm font-semibold text-danger-600" : "mt-1 text-sm text-(--muted)"}>
        {title.length}/100{title.length > 60 && title.length <= 100 ? " — long titles get cut off in search" : ""}
      </p>
      <div className="mt-3">
        <FieldLabel htmlFor="yt-d">Description (limit 5000)</FieldLabel>
        <Textarea id="yt-d" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <p role="status" className="mt-1 text-sm text-(--muted)">{desc.length.toLocaleString()}/5000</p>
      </div>
    </div>
  );
}

function TiktokCounterTool() {
  const [cap, setCap] = useState("");
  const [bio, setBio] = useState("");
  return (
    <div>
      <FieldLabel htmlFor="tt-c">Caption (limit 2200)</FieldLabel>
      <Textarea id="tt-c" value={cap} onChange={(e) => setCap(e.target.value)} />
      <p role="status" className="mt-1 text-sm text-(--muted)">{cap.length.toLocaleString()}/2200 · hashtags: {(cap.match(/#[\p{L}\d_]+/gu) ?? []).length}</p>
      <div className="mt-3">
        <FieldLabel htmlFor="tt-b">Bio (limit 80)</FieldLabel>
        <Input id="tt-b" value={bio} onChange={(e) => setBio(e.target.value)} />
        <p role="status" className={bio.length > 80 ? "mt-1 text-sm font-semibold text-danger-600" : "mt-1 text-sm text-(--muted)"}>{bio.length}/80</p>
      </div>
      <Note>Limits labelled per TikTok's published caption (2200) and bio (80) limits.</Note>
    </div>
  );
}

function ThumbCheckerTool() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");

  return (
    <div>
      <FilePick accept="image/*" maxMB={10} onFiles={async (f) => {
        setError("");
        const file = f[0] as File;
        const url = URL.createObjectURL(file);
        try {
          const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const el = new Image();
            el.onload = () => {
              if (!el.naturalWidth || !el.naturalHeight) reject(new Error("decode"));
              else resolve({ width: el.naturalWidth, height: el.naturalHeight });
            };
            el.onerror = () => reject(new Error("decode"));
            el.src = url;
          });
          const okDim = dims.width === 1280 && dims.height === 720;
          setRows([
            ["Dimensions", `${dims.width} × ${dims.height}`],
            ["Required", "1280 × 720"],
            ["Dimensions OK", okDim ? "Yes" : "No — resize to exactly 1280×720"],
            ["File size", `${(file.size / 1048576).toFixed(2)} MB`],
            ["Under 2 MB", file.size <= 2 * 1048576 ? "Yes" : "No — compress first"],
            ["Format", file.type || "unknown"],
          ]);
        } catch {
          setRows(null);
          setError("Could not read that image.");
        } finally {
          URL.revokeObjectURL(url);
        }
      }} label="Choose thumbnail image" />
      <Err message={error} />
      {rows && (
        <dl className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <dt className="text-(--muted)">{k}</dt>
              <dd className="font-semibold text-(--foreground)">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ---------- misc social ---------- */

const EMOJI = "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😷 🤒 🤕 🤢 🤮 🤧 🥴 😵 🤠 🥴 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💫 🔥 🎉 🎊 🎈 🎁 🏆 🥇 👍 👏 🙏 💪 👊 ✌️ 🤝 👀 💯 ✅ ❌ ➡️ ⬅️ ⬆️ ⬇️ ↗️ 🎵 🎶 📸 📷 🎥 🎬 🌍 🌎 🌏 🌙 ☀️ ⛅ 🌈 ☕ 🍕 🍔 🍩 🍦 ⚽ 🏀 🏈 ⚾ 🎾 🏊 🚴 🏋️ ✈️ 🚗 🏠 💡 📚 🎓 💼 📈 📉 🕐 ⏰ 📅 🗓️ 🔔 📢 💬".split(" ");

function EmojiPickerTool() {
  const [q, setQ] = useState("");
  const [copied, copy] = useCopied();
  const names: Record<string, string> = { "❤️": "heart", "🔥": "fire", "🎉": "party", "✨": "sparkles", "👍": "thumbs up", "🙏": "pray", "😂": "laugh", "😍": "love", "🤔": "think", "👏": "clap", "💪": "muscle", "🎵": "music", "📸": "camera", "🌍": "earth", "☕": "coffee", "✈️": "plane", "🎓": "graduation", "💡": "idea", "⏰": "alarm", "🏆": "trophy", "💯": "100", "✅": "check" };
  const list = q.trim() ? EMOJI.filter((e) => (names[e] ?? "").includes(q.trim().toLowerCase())) : EMOJI;
  return (
    <div>
      <FieldLabel htmlFor="em-q">Search (e.g. heart, fire, music)</FieldLabel>
      <Input id="em-q" value={q} placeholder="Search…" onChange={(e) => setQ(e.target.value)} />
      <p role="status" className="mt-2 text-xs text-(--muted)">{copied ? "Copied!" : `${list.length} emoji — tap to copy`}</p>
      <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-10" role="list">
        {list.slice(0, 200).map((e, i) => (
          <button key={i} type="button" role="listitem" aria-label={`Copy ${names[e] ?? "emoji"}`} onClick={() => copy(e)} className="grid min-h-[44px] place-items-center rounded-lg text-2xl hover:bg-(--surface-2)">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmojiDecorTool() {
  return (
    <Gen
      fields={[
        { key: "text", label: "Your text", type: "text", required: true },
        {
          key: "style", label: "Style", type: "select",
          options: [{ value: "frame", label: "✨ Frame" }, { value: "bullets", label: "👉 Bullets" }, { value: "divider", label: "Divider lines" }],
        },
      ]}
      generate={(v) => {
        const t = v.text?.trim() ?? "";
        if (v.style === "bullets") return t.split("\n").map((l) => `👉 ${l.trim()}`).join("\n");
        if (v.style === "divider") return `✦ ───────── ✦\n${t}\n✦ ───────── ✦`;
        const w = Math.max(...t.split("\n").map((l) => l.length));
        const top = `✨${"･".repeat(Math.min(30, w + 2))}✨`;
        return [top, ...t.split("\n").map((l) => `💫 ${l}`), top].join("\n");
      }}
      fileName="decorated.txt"
      button="Decorate"
    />
  );
}

function IdeaTool() {
  const FORMATS = ["Tutorial", "Listicle", "Behind the scenes", "Myth-busting", "Before/after", "Q&A", "Challenge", "Review", "Storytime", "Tips roundup"];
  return (
    <Gen
      fields={[{ key: "niche", label: "Your niche", type: "text", required: true, placeholder: "e.g. home baking" }]}
      generate={(v) => {
        const n = v.niche?.trim() ?? "";
        const ideas = FORMATS.map((f, i) => `${i + 1}. [${f}] ${n}: ${ideaSeed(f, n)}`);
        return `${ideas.join("\n")}\n\n(Deterministic templates filled with your niche — edit to taste. No AI.)`;
      }}
      fileName="content-ideas.txt"
      button="Generate ideas"
    />
  );
}

function ideaSeed(format: string, niche: string): string {
  const seeds: Record<string, string> = {
    Tutorial: `teach one ${niche} skill in under 60 seconds`,
    Listicle: `5 ${niche} mistakes I wish I knew earlier`,
    "Behind the scenes": `show your real ${niche} process, mess included`,
    "Myth-busting": `3 ${niche} myths everyone believes`,
    "Before/after": `my ${niche} setup: day 1 vs day 100`,
    "Q&A": `answer your most-asked ${niche} question`,
    Challenge: `try a 7-day ${niche} challenge`,
    Review: `honest review of a popular ${niche} tool`,
    Storytime: `how I started with ${niche} (and failed first)`,
    "Tips roundup": `10 ${niche} tips for busy beginners`,
  };
  return seeds[format] ?? `a fresh ${niche} post`;
}

const HANDLE_RULES: Record<string, { len: string; chars: string }> = {
  Instagram: { len: "≤ 30 chars", chars: "letters, numbers, periods, underscores" },
  X: { len: "4–15 chars", chars: "letters, numbers, underscores" },
  TikTok: { len: "2–24 chars", chars: "letters, numbers, underscores, periods" },
  YouTube: { len: "3–30 chars", chars: "letters, numbers and most symbols" },
};

function UsernameTool() {
  return (
    <Calc
      button="Validate handle"
      fields={[{ key: "h", label: "Desired handle (without @)", type: "text", required: true, placeholder: "e.g. toolora_fan" }]}
      compute={(v) => {
        const h = (v.h ?? "").trim().replace(/^@/, "");
        const rows: [string, string][] = [];
        rows.push(["Instagram", /^[a-zA-Z0-9._]{1,30}$/.test(h) ? "Valid format" : "Invalid (letters/numbers/./_, ≤30)"]);
        rows.push(["X (Twitter)", /^[a-zA-Z0-9_]{4,15}$/.test(h) ? "Valid format" : "Invalid (letters/numbers/_, 4–15)"]);
        rows.push(["TikTok", /^[a-zA-Z0-9._]{2,24}$/.test(h) ? "Valid format" : "Invalid (letters/numbers/./_, 2–24)"]);
        rows.push(["YouTube", h.length >= 3 && h.length <= 30 ? "Valid length" : "Invalid (3–30 chars)"]);
        return { rows, note: "Format rules only — availability must be checked on each platform." };
      }}
    />
  );
}

function LineBreakTool() {
  return (
    <TextOp
      placeholder="Paste a caption that collapses into one block…"
      button="Fix line breaks"
      process={(t) => {
        const paras = t.split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
        if (paras.length === 0) return { error: "Enter text with paragraphs to fix." };
        // Zero-width-safe spacing apps respect: keep blank lines, no trailing spaces.
        return { output: paras.join("\n\n"), stats: [["Paragraphs", String(paras.length)]] };
      }}
    />
  );
}

function GiveawayTool() {
  const [list, setList] = useState("");
  const [count, setCount] = useState("1");
  const [allowDupes, setAllowDupes] = useState(false);
  const [winners, setWinners] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const run = () => {
    setError("");
    const names = list.split("\n").map((x) => x.trim()).filter(Boolean);
    if (names.length < 2) {
      setError("Enter at least 2 entrants (one per line).");
      return;
    }
    const n = Math.min(names.length, Math.max(1, Number(count) || 1));
    const pool = [...names];
    const picks: string[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const idx = randomInt(0, pool.length - 1).value;
      picks.push(pool[idx] as string);
      if (!allowDupes) pool.splice(idx, 1);
    }
    setWinners(picks);
  };

  return (
    <div>
      <FieldLabel htmlFor="gw-in">Entrants (one per line)</FieldLabel>
      <Textarea id="gw-in" value={list} placeholder={"ana\nben\ncara"} onChange={(e) => setList(e.target.value)} />
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="gw-n">Winners to pick</FieldLabel>
          <Input id="gw-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
        <label className="flex items-end gap-2 pb-3 text-sm font-medium">
          <input type="checkbox" checked={allowDupes} onChange={(e) => setAllowDupes(e.target.checked)} className="h-5 w-5 accent-indigo-600" />
          Allow repeat wins
        </label>
      </div>
      <div className="mt-3">
        <Button type="button" onClick={run}>Pick winner(s)</Button>
      </div>
      <Err message={error} />
      {winners && (
        <div aria-live="polite" className="mt-3 rounded-2xl bg-(--surface-2) px-5 py-4">
          <p className="text-sm text-(--muted)">Winner{winners.length === 1 ? "" : "s"} (crypto-random draw):</p>
          {winners.map((w, i) => (
            <p key={i} className="text-2xl font-extrabold">🎉 {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function TimestampFmtTool() {
  return (
    <TextOp
      placeholder={"intro 0:00\nmain part 2:35\noutro 12:05"}
      button="Format timestamps"
      process={(t) => {
        const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
        for (const l of lines) {
          if (!/(\d{1,3}):(\d{2})(?::(\d{2}))?\s+.+/.test(l)) {
            return { error: `Could not parse: “${l.slice(0, 50)}”. Use “mm:ss title”.` };
          }
        }
        const fixed = lines.map((l) => {
          const m = /(\d{1,3}):(\d{2})(?::(\d{2}))?\s+(.+)/.exec(l) as RegExpExecArray;
          const ts = m[3] ? `${m[1]}:${m[2]}:${m[3]}` : `${m[1]}:${m[2]}`;
          return `${ts} ${m[4]}`;
        });
        return { output: fixed.join("\n"), stats: [["Chapters", String(fixed.length)]] };
      }}
    />
  );
}

function QuoteFmtTool() {
  return (
    <Gen
      fields={[
        { key: "q", label: "Quote", type: "textarea", required: true },
        { key: "by", label: "Attribution", type: "text" },
        { key: "w", label: "Line width", type: "number", def: "32" },
      ]}
      generate={(v) => {
        const w = Math.min(60, Math.max(15, Number(v.w) || 32));
        const words = (v.q ?? "").trim().split(/\s+/);
        const lines: string[] = [];
        let cur = "";
        for (const word of words) {
          if ((cur + " " + word).trim().length > w) {
            lines.push(cur.trim());
            cur = word;
          } else cur += " " + word;
        }
        if (cur.trim()) lines.push(cur.trim());
        const body = lines.map((l) => `“${l}”`).join("\n");
        return `${body}\n— ${v.by?.trim() || "Unknown"}`;
      }}
      fileName="quote.txt"
      button="Format quote"
    />
  );
}

const PLATFORMS = [
  ["Instagram", "https://instagram.com/"],
  ["TikTok", "https://tiktok.com/@"],
  ["X (Twitter)", "https://x.com/"],
  ["YouTube", "https://youtube.com/@"],
  ["Facebook", "https://facebook.com/"],
  ["LinkedIn", "https://linkedin.com/in/"],
  ["GitHub", "https://github.com/"],
  ["Twitch", "https://twitch.tv/"],
];

function FollowLinkTool() {
  return (
    <Gen
      fields={[{ key: "h", label: "Your handle (without @)", type: "text", required: true }]}
      generate={(v) => {
        const h = (v.h ?? "").trim().replace(/^@/, "");
        if (!h) return { error: "Enter a handle." };
        return PLATFORMS.map(([p, base]) => `${p}: ${base}${h}`).join("\n");
      }}
      fileName="profile-links.txt"
      button="Build links"
    />
  );
}

function EngagementTool() {
  return (
    <Calc
      button="Calculate rate"
      fields={[
        { key: "likes", label: "Likes", type: "number", def: "0" },
        { key: "comments", label: "Comments", type: "number", def: "0" },
        { key: "shares", label: "Shares/saves", type: "number", def: "0" },
        { key: "followers", label: "Followers", type: "number", required: true },
      ]}
      compute={(v) => {
        const likes = Number(v.likes) || 0;
        const comments = Number(v.comments) || 0;
        const shares = Number(v.shares) || 0;
        const f = req(v, "followers", "Followers");
        if (typeof f !== "number") return f;
        if (f <= 0) return { error: "Followers must be above zero." };
        const rate = ((likes + comments + shares) / f) * 100;
        const verdict = rate >= 5 ? "Excellent" : rate >= 2 ? "Good" : rate >= 1 ? "Average" : "Low";
        return {
          rows: [
            ["Engagement rate", `${rate.toFixed(2)}%`],
            ["Total interactions", Math.round(likes + comments + shares).toLocaleString()],
            ["Verdict", verdict],
          ],
          note: "Rate = (likes + comments + shares) ÷ followers × 100.",
        };
      }}
    />
  );
}

/* ---------- SEO generators ---------- */

function MetaTitleTool() {
  return (
    <Gen
      fields={[
        { key: "topic", label: "Page topic", type: "text", required: true },
        { key: "brand", label: "Brand suffix", type: "text", def: "Toolora" },
        { key: "kw", label: "Primary keyword", type: "text", required: true },
      ]}
      generate={(v) => {
        const cands = [
          `${v.kw} — ${v.topic} | ${v.brand}`,
          `${v.topic} (${v.kw}) | ${v.brand}`,
          `${v.kw}: ${v.topic} Guide | ${v.brand}`,
        ];
        return cands.map((c) => `${c}  [${c.length} chars${c.length > 60 ? " — TOO LONG, trim to ≤60" : " ✓"}]`).join("\n");
      }}
      fileName="meta-titles.txt"
      button="Generate titles"
    />
  );
}

function MetaDescTool() {
  return (
    <Gen
      fields={[
        { key: "topic", label: "Page topic", type: "text", required: true },
        { key: "benefit", label: "Key benefit", type: "text", required: true },
      ]}
      generate={(v) => {
        const d = `${v.topic}: ${v.benefit} Free, fast and mobile-friendly.`;
        const alt = `Learn ${v.topic} the easy way — ${v.benefit.toLowerCase()} No sign-up needed.`;
        return [d, alt].map((c) => `${c}  [${c.length} chars${c.length > 160 ? " — TOO LONG, trim to ~160" : " ✓"}]`).join("\n");
      }}
      fileName="meta-descriptions.txt"
      button="Generate descriptions"
    />
  );
}

function DensityTool() {
  const [text, setText] = useState("");
  const [kw, setKw] = useState("");
  const [out, setOut] = useState<[string, string][] | null>(null);
  const [error, setError] = useState("");

  const run = () => {
    setError("");
    const words = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
    if (words.length < 20) {
      setError("Paste at least 20 words for a meaningful density.");
      return;
    }
    const k = kw.trim().toLowerCase();
    if (!k) {
      setError("Enter a focus keyword.");
      return;
    }
    const hits = words.filter((w) => w === k).length;
    const pct = (hits / words.length) * 100;
    const verdict = pct === 0 ? "Missing — add it naturally" : pct < 0.5 ? "Low" : pct <= 2.5 ? "Healthy range" : "High — risk of stuffing";
    setOut([["Words", String(words.length)], [`“${k}” count`, String(hits)], ["Density", `${pct.toFixed(2)}%`], ["Verdict", verdict]]);
  };

  return (
    <div>
      <FieldLabel htmlFor="kd-t">Your text</FieldLabel>
      <Textarea id="kd-t" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3">
        <FieldLabel htmlFor="kd-k">Focus keyword (single word)</FieldLabel>
        <Input id="kd-k" value={kw} onChange={(e) => setKw(e.target.value)} />
      </div>
      <div className="mt-3">
        <Button type="button" onClick={run}>Check density</Button>
      </div>
      <Err message={error} />
      {out && (
        <div aria-live="polite" className="mt-3 grid grid-cols-2 gap-3">
          {out.map(([k, val]) => (
            <Stat key={k} label={k} value={val} />
          ))}
        </div>
      )}
    </div>
  );
}

function KeywordCountTool() {
  return (
    <TextOp
      placeholder="Paste text to count word frequency…"
      button="Count keywords"
      process={(t) => {
        const words = t.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [];
        if (words.length === 0) return { error: "No words found." };
        const stop = new Set("the,a,an,and,or,of,to,in,on,for,with,is,are,was,were,it,this,that,as,at,by,be,from".split(","));
        const freq = new Map<string, number>();
        for (const w of words) {
          if (!stop.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
        }
        const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
        return {
          output: top.map(([w, c]) => `${w}: ${c} (${((c / words.length) * 100).toFixed(2)}%)`).join("\n"),
          stats: [["Total words", String(words.length)], ["Unique (no stopwords)", String(freq.size)]],
        };
      }}
    />
  );
}

function SeoSlugTool() {
  return (
    <TextOp
      placeholder="Paste a headline…"
      button="Make slug"
      process={(t) => {
        const slug = t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
        if (!slug) return { error: "Nothing slug-safe in that headline." };
        const stop = ["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with"].filter((w) => slug.split("-").includes(w));
        return {
          output: slug,
          stats: [
            ["Length", `${slug.length} chars${slug.length > 60 ? " (long — consider trimming)" : ""}`],
            ["Stop words", stop.length ? stop.join(", ") : "none"],
          ],
        };
      }}
    />
  );
}

function RobotsTool() {
  return (
    <Gen
      fields={[
        { key: "allow", label: "Allow paths (one per line)", type: "textarea", def: "/" },
        { key: "disallow", label: "Disallow paths (one per line)", type: "textarea", def: "/search\n/api/" },
        { key: "sitemap", label: "Sitemap URL", type: "text", def: "https://example.com/sitemap.xml" },
      ]}
      generate={(v) => {
        const lines = ["User-agent: *"];
        for (const a of (v.allow ?? "").split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(`Allow: ${a}`);
        for (const d of (v.disallow ?? "").split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(`Disallow: ${d}`);
        if ((v.sitemap ?? "").trim()) lines.push("", `Sitemap: ${(v.sitemap ?? "").trim()}`);
        return lines.join("\n");
      }}
      fileName="robots.txt"
      button="Generate robots.txt"
    />
  );
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function SitemapXmlTool() {
  return (
    <Gen
      fields={[
        { key: "urls", label: "URLs (one per line)", type: "textarea", required: true },
        {
          key: "freq", label: "Change frequency", type: "select",
          options: ["daily", "weekly", "monthly"].map((f) => ({ value: f, label: f })),
        },
      ]}
      generate={(v) => {
        const urls = (v.urls ?? "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 5000);
        if (urls.length === 0) return { error: "Enter at least one URL." };
        for (const u of urls) {
          if (!/^https?:\/\//.test(u)) return { error: `Not a URL: “${u.slice(0, 60)}”.` };
        }
        const today = new Date().toISOString().slice(0, 10);
        const body = urls.map((u) => `  <url>\n    <loc>${escXml(u)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${v.freq}</changefreq>\n  </url>`).join("\n");
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
      }}
      fileName="sitemap.xml"
      mime="application/xml"
      button="Build sitemap"
    />
  );
}

function CanonicalTool() {
  return (
    <TextOp
      placeholder="Paste a page URL…"
      button="Normalise"
      process={(t) => {
        let u: URL;
        try {
          u = new URL(t.trim());
        } catch {
          return { error: "Enter a valid absolute URL." };
        }
        u.hash = "";
        const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
        let stripped = 0;
        for (const d of drop) {
          if (u.searchParams.has(d)) {
            stripped++;
            u.searchParams.delete(d);
          }
        }
        const clean = u.toString();
        return { output: `<link rel="canonical" href="${clean}" />`, stats: [["Tracking params stripped", String(stripped)]] };
      }}
    />
  );
}

function OgTool() {
  return (
    <Gen
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "desc", label: "Description", type: "textarea", required: true },
        { key: "url", label: "Canonical URL", type: "text", required: true },
        { key: "img", label: "Image URL", type: "text" },
        { key: "site", label: "Site name", type: "text" },
      ]}
      generate={(v) => {
        if (!/^https?:\/\//.test(v.url?.trim() ?? "")) return { error: "Canonical URL must be absolute." };
        return [
          `<meta property="og:type" content="website" />`,
          `<meta property="og:title" content="${escXml(v.title?.trim() ?? "")}" />`,
          `<meta property="og:description" content="${escXml(v.desc?.trim() ?? "")}" />`,
          `<meta property="og:url" content="${escXml(v.url?.trim() ?? "")}" />`,
          ...(v.img?.trim() ? [`<meta property="og:image" content="${escXml(v.img.trim())}" />`] : []),
          ...(v.site?.trim() ? [`<meta property="og:site_name" content="${escXml(v.site.trim())}" />`] : []),
        ].join("\n");
      }}
      fileName="open-graph.html"
      mime="text/html"
      button="Generate OG tags"
    />
  );
}

function TwitterCardTool() {
  return (
    <Gen
      fields={[
        { key: "title", label: "Title (≤70 chars)", type: "text", required: true },
        { key: "desc", label: "Description (≤200 chars)", type: "textarea", required: true },
        { key: "img", label: "Image URL", type: "text" },
        { key: "site", label: "@site handle", type: "text" },
      ]}
      generate={(v) => {
        const lines = [
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${escXml(v.title?.trim() ?? "")}" />`,
          `<meta name="twitter:description" content="${escXml(v.desc?.trim() ?? "")}" />`,
        ];
        if ((v.img ?? "").trim()) lines.push(`<meta name="twitter:image" content="${escXml((v.img ?? "").trim())}" />`);
        if ((v.site ?? "").trim()) lines.push(`<meta name="twitter:site" content="${escXml((v.site ?? "").trim())}" />`);
        const warn = (v.title?.length ?? 0) > 70 || (v.desc?.length ?? 0) > 200 ? "\n<!-- Warning: title should be ≤70 chars, description ≤200 chars -->" : "";
        return lines.join("\n") + warn;
      }}
      fileName="twitter-card.html"
      mime="text/html"
      button="Generate card tags"
    />
  );
}

function jsonGen(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function validJsonLd(obj: unknown): string | { error: string } {
  try {
    return jsonGen({ "@context": "https://schema.org", ...(obj as Record<string, unknown>) });
  } catch {
    return { error: "Could not build JSON-LD." };
  }
}

function SchemaTool() {
  return (
    <Gen
      fields={[
        {
          key: "type", label: "Schema type", type: "select",
          options: ["Organization", "LocalBusiness", "Product", "FAQPage"].map((t) => ({ value: t, label: t })),
        },
        { key: "name", label: "Name", type: "text", required: true },
        { key: "desc", label: "Description", type: "textarea", required: true },
        { key: "url", label: "URL", type: "text" },
      ]}
      generate={(v) => {
        const base: Record<string, unknown> = { "@type": v.type, name: v.name?.trim(), description: v.desc?.trim() };
        if ((v.url ?? "").trim()) base.url = (v.url ?? "").trim();
        if (v.type === "FAQPage") base.mainEntity = [{ "@type": "Question", name: "Your question?", acceptedAnswer: { "@type": "Answer", text: "Your answer." } }];
        return validJsonLd(base);
      }}
      fileName="schema.json"
      mime="application/ld+json"
      button="Generate schema"
    />
  );
}

function FaqSchemaTool() {
  return (
    <Gen
      fields={[{ key: "qa", label: "Q&A pairs (one per line: question | answer)", type: "textarea", required: true }]}
      generate={(v) => {
        const pairs = (v.qa ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30);
        if (pairs.length === 0) return { error: "Enter at least one question | answer line." };
        const mainEntity = [];
        for (const p of pairs) {
          const [q, a] = p.split("|").map((x) => x.trim());
          if (!q || !a) return { error: `Each line needs “question | answer” — problem: “${p.slice(0, 60)}”.` };
          mainEntity.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } });
        }
        return validJsonLd({ "@type": "FAQPage", mainEntity });
      }}
      fileName="faq-schema.json"
      mime="application/ld+json"
      button="Generate FAQ schema"
    />
  );
}

function ArticleSchemaTool() {
  return (
    <Gen
      fields={[
        { key: "headline", label: "Headline", type: "text", required: true },
        { key: "author", label: "Author", type: "text", required: true },
        { key: "date", label: "Publish date", type: "date", required: true },
        { key: "desc", label: "Description", type: "textarea" },
      ]}
      generate={(v) => validJsonLd({
        "@type": "Article",
        headline: v.headline?.trim(),
        author: { "@type": "Person", name: v.author?.trim() },
        datePublished: v.date,
        description: v.desc?.trim() || undefined,
      })}
      fileName="article-schema.json"
      mime="application/ld+json"
      button="Generate Article schema"
    />
  );
}

function ProductSchemaTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Product name", type: "text", required: true },
        { key: "price", label: "Price", type: "number", required: true },
        { key: "cur", label: "Currency", type: "text", def: "USD" },
        { key: "avail", label: "Availability", type: "select", options: [{ value: "InStock", label: "In stock" }, { value: "OutOfStock", label: "Out of stock" }] },
        { key: "rating", label: "Rating 1–5 (optional)", type: "number" },
      ]}
      generate={(v) => {
        const price = Number(v.price);
        if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
        const offer: Record<string, unknown> = { "@type": "Offer", priceCurrency: (v.cur ?? "USD").trim() || "USD", price: price.toFixed(2), availability: `https://schema.org/${v.avail}` };
        const obj: Record<string, unknown> = { "@type": "Product", name: v.name?.trim(), offers: offer };
        const r = Number(v.rating);
        if (v.rating?.trim() && Number.isFinite(r) && r >= 1 && r <= 5) {
          obj.aggregateRating = { "@type": "AggregateRating", ratingValue: r.toFixed(1), reviewCount: 1 };
        }
        return validJsonLd(obj);
      }}
      fileName="product-schema.json"
      mime="application/ld+json"
      button="Generate Product schema"
    />
  );
}

function CrumbSchemaTool() {
  return (
    <Gen
      fields={[{ key: "trail", label: "Trail (one per line: name | /path)", type: "textarea", required: true }]}
      generate={(v) => {
        const items = (v.trail ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 10);
        if (items.length === 0) return { error: "Enter at least one trail item." };
        const list = [];
        for (let i = 0; i < items.length; i++) {
          const [name, path] = (items[i] as string).split("|").map((x) => x.trim());
          if (!name || !path) return { error: `Each line needs “name | /path” — problem: “${(items[i] as string).slice(0, 60)}”.` };
          list.push({ "@type": "ListItem", position: i + 1, name, item: path });
        }
        return validJsonLd({ "@type": "BreadcrumbList", itemListElement: list });
      }}
      fileName="breadcrumb-schema.json"
      mime="application/ld+json"
      button="Generate breadcrumb schema"
    />
  );
}

function SiteSchemaTool() {
  return (
    <Gen
      fields={[
        { key: "name", label: "Site name", type: "text", required: true },
        { key: "url", label: "Site URL", type: "text", required: true },
        { key: "search", label: "Search URL template (optional, use {q})", type: "text" },
      ]}
      generate={(v) => {
        if (!/^https?:\/\//.test(v.url?.trim() ?? "")) return { error: "Site URL must be absolute." };
        const obj: Record<string, unknown> = { "@type": "WebSite", name: v.name?.trim(), url: (v.url ?? "").trim() };
        if ((v.search ?? "").trim()) {
          obj.potentialAction = { "@type": "SearchAction", target: (v.search ?? "").trim(), "query-input": "required name=search_term_string" };
        }
        return validJsonLd(obj);
      }}
      fileName="website-schema.json"
      mime="application/ld+json"
      button="Generate WebSite schema"
    />
  );
}

function HeadingTool() {
  return (
    <TextOp
      placeholder="Paste HTML to outline its headings…"
      button="Analyze headings"
      process={(t) => {
        const heads = [...t.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].slice(0, 200).map((m) => ({
          level: Number(m[1]),
          text: (m[2] ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 120),
        }));
        if (heads.length === 0) return { error: "No H1–H6 headings found." };
        const warns: string[] = [];
        const h1s = heads.filter((h) => h.level === 1);
        if (h1s.length === 0) warns.push("No H1 — every page needs exactly one.");
        if (h1s.length > 1) warns.push(`${h1s.length} H1s — keep exactly one.`);
        for (let i = 1; i < heads.length; i++) {
          if ((heads[i] as { level: number }).level > (heads[i - 1] as { level: number }).level + 1) {
            warns.push(`Skipped level before “${(heads[i] as { text: string }).text.slice(0, 40)}”.`);
            break;
          }
        }
        const outline = heads.map((h) => `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}`).join("\n");
        return {
          output: `${outline}\n\n${warns.length ? "WARNINGS:\n• " + warns.join("\n• ") : "Structure looks clean: one H1, no skipped levels."}`,
          stats: [["Headings", String(heads.length)], ["Issues", String(warns.length)]],
        };
      }}
    />
  );
}

const STOP_WORDS = ["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are"];

function UrlSeoTool() {
  return (
    <TextOp
      placeholder="Paste a page URL…"
      button="Analyze URL"
      process={(t) => {
        let u: URL;
        try {
          u = new URL(t.trim());
        } catch {
          return { error: "Enter a valid absolute URL." };
        }
        const slug = u.pathname.replace(/\/$/, "").split("/").pop() ?? "";
        const verdicts: string[] = [];
        if (!slug) verdicts.push("Homepage — nothing to check.");
        else {
          if (slug.length > 60) verdicts.push(`Long slug (${slug.length} chars) — trim under ~60.`);
          if (/_/.test(slug)) verdicts.push("Underscores found — prefer hyphens.");
          if (/[A-Z]/.test(slug)) verdicts.push("Uppercase found — use lowercase.");
          const stops = STOP_WORDS.filter((w) => slug.toLowerCase().split("-").includes(w));
          if (stops.length > 0) verdicts.push(`Stop words (${stops.join(", ")}) — consider removing.`);
          if (/\d{4,}/.test(slug)) verdicts.push("Long number string — IDs in URLs are unfriendly.");
          if (verdicts.length === 0) verdicts.push("Clean slug: short, lowercase, hyphenated.");
        }
        return { output: `Slug: ${slug || "(homepage)"}\nLength: ${slug.length} chars\n\n${verdicts.map((x) => `• ${x}`).join("\n")}`, stats: [["Slug length", String(slug.length)]] };
      }}
    />
  );
}

function flesch(text: string): { ease: number; grade: number; words: number; sentences: number; syllables: number } {
  const words = text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const syl = (w: string): number => {
    const m = w.replace(/[^a-z]/g, "").replace(/e$/, "");
    const v = m.match(/[aeiouy]+/g);
    return Math.max(1, v ? v.length : 1);
  };
  const syllables = words.reduce((n, w) => n + syl(w), 0);
  const wps = words.length / sentences;
  const spw = syllables / Math.max(1, words.length);
  return {
    ease: 206.835 - 1.015 * wps - 84.6 * spw,
    grade: 0.39 * wps + 11.8 * spw - 15.59,
    words: words.length,
    sentences,
    syllables,
  };
}

function ReadabilityTool() {
  return (
    <TextOp
      placeholder="Paste at least a paragraph…"
      button="Check readability"
      process={(t) => {
        const r = flesch(t);
        if (r.words < 30) return { error: "Paste at least ~30 words for a meaningful score." };
        const level = r.ease >= 70 ? "Fairly easy" : r.ease >= 50 ? "Standard" : r.ease >= 30 ? "Difficult" : "Very difficult";
        return {
          output: [
            `Flesch Reading Ease: ${r.ease.toFixed(1)} (${level})`,
            `Flesch-Kincaid grade: ${r.grade.toFixed(1)} (≈ US grade level)`,
            `Words: ${r.words} · Sentences: ${r.sentences} · Avg length: ${(r.words / r.sentences).toFixed(1)} words`,
          ].join("\n"),
          stats: [["Ease", r.ease.toFixed(0)], ["Grade", r.grade.toFixed(1)], ["Words", String(r.words)]],
        };
      }}
    />
  );
}

function SerpTool() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <FieldLabel htmlFor="serp-t">Title</FieldLabel>
          <Input id="serp-t" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="serp-u">URL</FieldLabel>
          <Input id="serp-u" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="serp-d">Description</FieldLabel>
          <Textarea id="serp-d" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-(--border) p-4" aria-live="polite">
        <p className="text-xs text-(--muted)">{url || "example.com/page"}</p>
        <p className="text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{title.slice(0, 70) || "Your title here"}</p>
        <p className="text-sm text-(--muted)">{desc.slice(0, 160) || "Your description preview…"}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="Title" value={`${title.length}/60`} />
        <Stat label="Description" value={`${desc.length}/160`} />
      </div>
      {(title.length > 60 || desc.length > 160) && (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger-600">Over the display limit — Google will cut it off.</p>
      )}
    </div>
  );
}

function AltTextTool() {
  return (
    <Gen
      fields={[
        { key: "subject", label: "What the image shows", type: "text", required: true, placeholder: "e.g. golden retriever puppy in a park" },
        { key: "context", label: "Page context (optional)", type: "text" },
      ]}
      generate={(v) => {
        const s = (v.subject ?? "").trim();
        const c = (v.context ?? "").trim();
        const alts = [
          s.charAt(0).toUpperCase() + s.slice(1),
          `${s.charAt(0).toUpperCase() + s.slice(1)}${c ? ` — ${c}` : ""}`,
          `Photo: ${s.toLowerCase()}`,
        ];
        return alts.map((a) => `${a}  [${a.length} chars${a.length > 125 ? " — long, trim under ~125" : " ✓"}]`).join("\n") + `\n\n(${TPL_NOTE})`;
      }}
      fileName="alt-text.txt"
      button="Draft alt text"
    />
  );
}
