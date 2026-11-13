/**
 * Remotion reel. Falls back to the caller when the package or the render fails.
 * HyperFrames is not called: the kinetic timeline (stagger, count-up, overlaps) is Remotion.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "remotion", "public");
const FPS = 30;
const TRANSITION_FRAMES = 12;

const PRESETS = new Set(["editorial", "kinetic", "push", "tally"]);

export function remotionAvailable() {
  return fs.existsSync(path.join(ROOT, "node_modules", "remotion")) && fs.existsSync(path.join(ROOT, "node_modules", "@remotion", "cli"));
}

export function presetFor(episode) {
  const chosen = episode.reel?.preset;
  if (PRESETS.has(chosen)) return chosen;
  const kind = String(episode.kind || "").toLowerCase();
  if (kind === "data" || kind === "trend") return "tally";
  if (kind === "howto" || kind === "news" || kind === "explainer" || kind === "list") return "kinetic";
  if (kind === "story" || kind === "comparison" || kind === "compare") return "push";
  return "editorial";
}

function copyFonts() {
  const from = path.join(ROOT, "assets", "fonts");
  const to = path.join(PUBLIC, "fonts");
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (!name.endsWith(".woff2")) continue;
    const dest = path.join(to, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(from, name), dest);
  }
}

function slideFile(outDir, index, slide) {
  const slug = slide.slug || (slide.role === "cover" ? "cover" : slide.role || "slide");
  return path.join(outDir, `${String(index).padStart(2, "0")}_${slug}.png`);
}

export function detectBeats(file) {
  if (!file || !fs.existsSync(file)) return [];
  const result = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-t", "45", "-ac", "1", "-ar", "8000", "-af", "highpass=f=80,lowpass=f=250", "-f", "f32le", "pipe:1"],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.status !== 0 || !result.stdout?.length) return [];
  const samples = new Float32Array(result.stdout.buffer, result.stdout.byteOffset, Math.floor(result.stdout.length / 4));
  const win = 800;
  const energies = [];
  for (let i = 0; i + win < samples.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win; j += 1) sum += samples[i + j] * samples[i + j];
    energies.push(Math.sqrt(sum / win));
  }
  if (!energies.length) return [];
  const mean = energies.reduce((sum, value) => sum + value, 0) / energies.length;
  const beats = [];
  for (let i = 1; i < energies.length - 1; i += 1) {
    if (energies[i] > mean * 1.45 && energies[i] >= energies[i - 1] && energies[i] > energies[i + 1]) {
      const time = (i * win) / 8000;
      if (!beats.length || time - beats[beats.length - 1] > 0.42) beats.push(time);
    }
  }
  return beats;
}

function snapBeats(beats, marks) {
  if (!marks.length) return beats;
  let cursor = 0;
  return beats.map((beat) => {
    const end = cursor + Number(beat.seconds || 3.2);
    let snapped = end;
    let best = 0.28;
    for (const mark of marks) {
      const distance = Math.abs(mark - end);
      if (distance < best) {
        best = distance;
        snapped = mark;
      }
    }
    let seconds = snapped - cursor;
    if (seconds < 2.2 || seconds > 4.4) seconds = Number(beat.seconds || 3.2);
    cursor += seconds;
    return { ...beat, seconds: Math.round(seconds * 10) / 10 };
  });
}

function buildProps({ episode, outDir, audio, narration }) {
  const preset = presetFor(episode);
  const slides = episode.slides || [];
  let beats = episode.reel?.beats?.length
    ? episode.reel.beats
    : slides.slice(0, 8).map((slide, i) => ({
        slide: i + 1,
        seconds: 3,
        lines: [slide.title || slide.kicker || ""].flat().join(" ").split("\n").slice(0, 2),
      }));
  if (audio) beats = snapBeats(beats, detectBeats(audio));
  copyFonts();
  const slideDir = path.join(PUBLIC, "slides");
  fs.mkdirSync(slideDir, { recursive: true });
  const audioDir = path.join(PUBLIC, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const prepared = beats.map((beat, i) => {
    const index = beat.slide || 1;
    const slide = slides[index - 1] || {};
    const png = slideFile(outDir, index, slide);
    let image = "";
    if (fs.existsSync(png)) {
      const name = `${String(i + 1).padStart(2, "0")}.png`;
      fs.copyFileSync(png, path.join(slideDir, name));
      image = `slides/${name}`;
    }
    const frames = Math.max(48, Math.round(Number(beat.seconds || 3.2) * FPS));
    return {
      frames,
      image,
      lines: beat.lines || [],
      kicker: slide.kicker || slide.kick || slide.label || "",
      motion: beat.motion || (i % 2 === 0 ? "zoom-in" : "pan-up"),
      count: (() => {
        const raw = beat.count ?? slide.stat;
        if (raw == null || raw === "") return undefined;
        const value = Number(raw);
        return Number.isFinite(value) ? value : undefined;
      })(),
      countUnit: beat.countUnit || slide.unit || "",
    };
  });
  const transition = prepared.length > 1 ? TRANSITION_FRAMES : 0;
  const durationInFrames = prepared.reduce((sum, beat) => sum + beat.frames, 0) - transition * Math.max(0, prepared.length - 1);
  let music = "";
  let voice = "";
  if (audio && fs.existsSync(audio)) {
    fs.copyFileSync(audio, path.join(audioDir, "bed" + path.extname(audio)));
    music = `audio/bed${path.extname(audio)}`;
  }
  if (narration && fs.existsSync(narration)) {
    fs.copyFileSync(narration, path.join(audioDir, "voice" + path.extname(narration)));
    voice = `audio/voice${path.extname(narration)}`;
  }
  return {
    preset,
    channel: episode.header || episode.channel || "",
    beats: prepared,
    durationInFrames,
    music,
    narration: voice,
  };
}

export function renderRemotionReel({ episode, outDir, crf = 28, audio, narration }) {
  if (!remotionAvailable()) {
    throw new Error("remotion is not installed");
  }
  const props = buildProps({ episode, outDir, audio, narration });
  const propsPath = path.join(outDir, ".reel-props.json");
  const output = path.join(outDir, "reel.mp4");
  fs.writeFileSync(propsPath, JSON.stringify(props));
  const cli = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "render",
      "remotion/index.jsx",
      "CardReel",
      output,
      `--props=${propsPath}`,
      `--crf=${crf}`,
      "--codec=h264",
      "--pixel-format=yuv420p",
      "--concurrency=2",
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  fs.rmSync(propsPath, { force: true });
  if (result.status !== 0) {
    throw new Error(`${result.stderr || result.stdout || "remotion render failed"}`.slice(-2500));
  }
  return output;
}
