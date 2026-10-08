import type { ToolDefinition } from "@/types/tool";
import { AV, define } from "./_helpers";

const A = "audio";

/* Third-wave audio tools: tempo estimation, container tags, header
   forensics, WAV cleanup, A/B comparisons, batch renaming, live input
   monitoring and tempo-preserving playback. All fully implemented locally. */
export const audioplusTools: ToolDefinition[] = [
  define({
    id: "bpm-detector", slug: "bpm-detector", name: "BPM Detector",
    shortDescription: "Estimate tempo from any audio file.",
    longDescription: "Analyze rhythmic onsets with autocorrelation over 60–200 BPM to estimate tempo with an honest confidence rating — verify important mixes by tapping.",
    category: A, icon: "clock", ...AV, isPopular: false, isNew: true,
    keywords: ["bpm detector", "detect tempo", "find bpm", "tempo finder"],
    aliases: ["detect-bpm", "tempo-detector", "auto-bpm"],
  }),
  define({
    id: "audio-tag-viewer", slug: "audio-tag-viewer", name: "Audio Tag Viewer",
    shortDescription: "Read embedded ID3 title, artist and album tags.",
    longDescription: "Parse ID3v2 text frames and the ID3v1 trailer byte-by-byte to show the real embedded title, artist, album, year and genre — or honestly report that a file has none.",
    category: A, icon: "binary", ...AV, isPopular: false, isNew: true,
    keywords: ["id3 viewer", "mp3 tags", "audio tags", "read metadata tags"],
    aliases: ["id3-reader", "mp3-tag-viewer", "show-id3"],
  }),
  define({
    id: "audio-header-inspector", slug: "audio-header-inspector", name: "Audio Header Inspector",
    shortDescription: "Hex dump plus container verdict for any file.",
    longDescription: "See the first 128 bytes as a hex dump with a signature-based container verdict and suggested extension — catch mislabeled downloads before trusting them.",
    category: A, icon: "binary", ...AV, isPopular: false, isNew: true,
    keywords: ["audio header", "hex dump audio", "file signature", "check audio format"],
    aliases: ["header-inspector", "audio-hex-viewer", "format-verifier"],
  }),
  define({
    id: "wav-metadata-cleaner", slug: "wav-metadata-cleaner", name: "WAV Metadata Cleaner",
    shortDescription: "Strip extra chunks, keep samples identical.",
    longDescription: "Rebuild a minimal WAV header around your exact samples, removing cue points, tags and padding — with bytes saved honestly reported, or a clean bill of health.",
    category: A, icon: "binary", ...AV, isPopular: false, isNew: true,
    keywords: ["wav cleaner", "strip wav metadata", "remove wav chunks", "clean wav header"],
    aliases: ["clean-wav", "wav-stripper", "wav-chunk-remover"],
  }),
  define({
    id: "audio-waveform-comparison", slug: "audio-waveform-comparison", name: "Audio Waveform Comparison",
    shortDescription: "Similarity score between two recordings.",
    longDescription: "Compare two files with normalized cross-correlation over 20,000 resampled points — catch duplicate uploads and verify renders against masters.",
    category: A, icon: "check", ...AV, isPopular: false, isNew: true,
    keywords: ["compare waveforms", "audio similarity", "duplicate audio finder", "verify render"],
    aliases: ["waveform-compare", "audio-similarity", "same-audio-check"],
  }),
  define({
    id: "audio-frequency-comparison", slug: "audio-frequency-comparison", name: "Audio Frequency Comparison",
    shortDescription: "Brightness and dominant tones, A vs B.",
    longDescription: "Compare spectral centroid brightness and dominant frequencies from real DFTs — reveal EQ and pitch moves when waveforms look alike.",
    category: A, icon: "check", ...AV, isPopular: false, isNew: true,
    keywords: ["compare frequency", "spectral comparison", "brightness compare", "eq comparison"],
    aliases: ["frequency-compare", "spectral-compare", "ab-frequency"],
  }),
  define({
    id: "audio-batch-rename-helper", slug: "audio-batch-rename-helper", name: "Audio Batch Rename Helper",
    shortDescription: "Numbered rename plans plus a shell script.",
    longDescription: "Preview {n}/{name}/{ext} rename patterns across up to 200 tracks, copy the plan, or download a reviewable rename.sh — browsers cannot rename files directly, honestly stated.",
    category: A, icon: "spark", ...AV, isPopular: false, isNew: true,
    keywords: ["batch rename audio", "rename tracks", "number music files", "rename plan"],
    aliases: ["rename-tracks", "batch-renamer", "number-tracks"],
  }),
  define({
    id: "audio-input-monitor", slug: "audio-input-monitor", name: "Audio Input Monitor",
    shortDescription: "Live mic waveform and level, no recording.",
    longDescription: "Watch your microphone with a live waveform, level bar, peak readout and clipping alarm — set gain before recording. Nothing is recorded, stored or uploaded.",
    category: A, icon: "spark", ...AV, isPopular: false, isNew: true,
    keywords: ["mic monitor", "input level", "mic test", "check microphone", "live waveform"],
    aliases: ["mic-tester", "monitor-microphone", "input-level-meter"],
  }),
  define({
    id: "audio-playback-speed-controller", slug: "audio-playback-speed-controller", name: "Audio Playback Speed Controller",
    shortDescription: "Half-speed practice without pitch change.",
    longDescription: "Play any decodable audio at 0.5×–2× with tempo-preserving pitch correction from the browser media engine — practice solos at half speed without retuning.",
    category: A, icon: "clock", ...AV, isPopular: false, isNew: true,
    keywords: ["playback speed", "slow down audio", "half speed", "speed up playback"],
    aliases: ["slow-down-audio", "half-speed-player", "playback-rate"],
  }),
];
