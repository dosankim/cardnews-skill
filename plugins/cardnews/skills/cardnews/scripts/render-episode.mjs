#!/usr/bin/env node
/**
 * Render one episode.json into 1080×1350 slides, optional 4:5 clips, and a 9:16 reel.
 *
 *   node scripts/render-episode.mjs episode.json
 *   node scripts/render-episode.mjs episode.json --stills-only
 *   node scripts/render-episode.mjs episode.json --no-reel --crf 23
 *   node scripts/render-episode.mjs episode.json --audio bed.m4a
 *   node scripts/render-episode.mjs episode.json --tts
 *   node scripts/render-episode.mjs episode.json --preview-themes
 *   node scripts/render-episode.mjs episode.json --preview-looks
 *   node scripts/render-episode.mjs episode.json --look swiss
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  applyLayouts,
  buildSlideHtml,
  listThemes,
  lookFor,
  slideKind,
  validateEpisode,
} from "./lib/html.mjs";
import { LOOKS, contrast, resolveLook } from "./lib/looks.mjs";
import {
  assertFrame,
  composeWindow,
  concatVideos,
  cutVideo,
  have,
  holdStill,
  mixAudio,
  padCard,
  photoMotion,
} from "./lib/ffmpeg.mjs";
import { hyperframesAvailable, renderHyperframesReel } from "./render-reel.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function usage() {
  console.log(`usage: node scripts/render-episode.mjs <episode.json> [--look press|swiss|hanji|night|pop] [--stills-only] [--no-reel] [--reel-only] [--preview-themes] [--preview-looks] [--draft] [--ffmpeg-reel] [--crf 19] [--preset fast] [--audio file] [--tts] [--allow-short]`);
}

async function renderContact(page, items, output) {
  const cells = items
    .map((item, i) => {
      const file = item.file || item;
      const name = path.basename(item.label || file);
      const kind = item.kind || (name.endsWith(".mp4") ? "VIDEO" : "STILL");
      return `<figure><img src="${pathToFileURL(file).href}" alt=""><figcaption>${String(i + 1).padStart(2, "0")}  ${kind}  ${name.replace(/&/g, "&amp;")}</figcaption></figure>`;
    })
    .join("");
  const cols = 5;
  const rows = Math.ceil(items.length / cols);
  const tw = 432;
  const th = 540;
  const pad = 24;
  const width = cols * tw + (cols + 1) * pad;
  const height = rows * (th + 56) + (rows + 1) * pad;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0} body{width:${width}px;height:${height}px;background:#121316;overflow:hidden}
    .grid{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:${pad}px;padding:${pad}px}
    img{width:${tw}px;height:${th}px;object-fit:cover;display:block;background:#000}
    figcaption{color:#b9b6ad;font-weight:600;font-size:20px;letter-spacing:-.01em;padding-top:12px;font-family:sans-serif}
  </style></head><body><div class="grid">${cells}</div></body></html>`;
  await shoot(page, html, output, { width, height });
}

let htmlSeq = 0;

async function shoot(page, html, file, { width, height, omitBackground }) {
  const tmp = path.join(os.tmpdir(), `cardnews-${process.pid}-${htmlSeq += 1}.html`);
  fs.writeFileSync(tmp, html);
  try {
    await page.setViewportSize({ width, height });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const report = await page
      .waitForFunction(() => window.__report, null, { timeout: 4000 })
      .then((handle) => handle.jsonValue())
      .catch(() => ({ issues: [], wins: [] }));
    await page.screenshot({
      path: file,
      type: "png",
      omitBackground: Boolean(omitBackground),
      clip: { x: 0, y: 0, width, height },
    });
    return report;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function writeText(dir, name, text) {
  if (typeof text !== "string" || !text.trim()) return;
  const file = path.join(dir, name);
  const body = text.endsWith("\n") ? text : `${text}\n`;
  fs.writeFileSync(file, body);
  return file;
}

function slideMotion(slide, index) {
  if (slide.motion) return slide.motion;
  return ["zoom-in", "pan-right", "zoom-out", "pan-up", "pan-left", "pan-down"][index % 6];
}

function autoBeats(slides) {
  const picked = slides.slice(0, 8);
  const seconds = picked.length >= 8 ? 3.25 : 3.4;
  return picked.map((slide, i) => {
    const lines = String(slide.title || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);
    return { slide: i + 1, lines, seconds };
  });
}

function slideBase(index, slide) {
  const kind = slideKind(slide.role);
  const slug = slide.slug || (kind === "cover" ? "cover" : kind);
  return `${String(index).padStart(2, "0")}_${slug}`;
}

function report(index, issues) {
  for (const issue of issues || []) console.warn(`  ! ${String(index).padStart(2, "0")}장: ${issue}`);
  return (issues || []).length;
}

async function renderThemes(page, episode, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const slide = { ...episode.slides[0], role: "cover", layout: "cover", image: absImage(episode, episode.slides[0]) };
  const total = episode.slides.length;
  for (const cover of listThemes()) {
    const variant = slide.variants?.[cover] || {};
    const html = buildSlideHtml({
      slide: { ...slide, ...variant, cover },
      episode,
      index: 1,
      total,
      mode: "still",
    });
    const file = path.join(outDir, `cover_${cover}.png`);
    const result = await shoot(page, html, file, { width: 1080, height: 1350 });
    report(1, result.issues);
    assertFrame(file, 1080, 1350);
    console.log(`cover ${cover} → ${file}`);
  }
}

/** 표지 한 장을 룩마다 그린다. 룩을 고를 때 본다. */
async function renderLooks(page, episode, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const total = episode.slides.length;
  const picks = [0, Math.min(2, total - 1), Math.min(3, total - 1)];
  for (const look of Object.keys(LOOKS)) {
    for (const i of [...new Set(picks)]) {
      const slide = { ...episode.slides[i], image: absImage(episode, episode.slides[i]), images: (episode.slides[i].images || []).map((item) => absMedia(episode, item)) };
      const html = buildSlideHtml({ slide, episode: { ...episode, look }, index: i + 1, total, mode: "still" });
      const file = path.join(outDir, `${look}_${String(i + 1).padStart(2, "0")}.png`);
      await shoot(page, html, file, { width: 1080, height: 1350 });
    }
    console.log(`look ${look} (${LOOKS[look].label}) → ${outDir}`);
  }
}

function absImage(episode, slide) {
  if (!slide.image) return "";
  return path.resolve(path.dirname(episode._file), slide.image);
}

function absMedia(episode, value) {
  if (!value) return "";
  return path.resolve(path.dirname(episode._file), value);
}

function even(n) {
  const v = Math.max(2, Math.round(n));
  return v % 2 ? v + 1 : v;
}

async function main() {
  const valued = new Set(["--crf", "--preset", "--audio", "--narration-audio", "--look"]);
  const args = process.argv.slice(2);
  let jsonPath;
  for (let i = 0; i < args.length; i += 1) {
    if (valued.has(args[i])) {
      i += 1;
      continue;
    }
    if (args[i].startsWith("--")) continue;
    jsonPath = args[i];
    break;
  }
  if (!jsonPath) {
    usage();
    process.exit(1);
  }
  const episodePath = path.resolve(jsonPath);
  const episode = JSON.parse(fs.readFileSync(episodePath, "utf8"));
  episode._file = episodePath;
  if (argValue("--look")) episode.look = argValue("--look");
  applyLayouts(episode);
  const strict = !hasFlag("--allow-short");
  const preview = hasFlag("--preview-themes");
  const previewLooks = hasFlag("--preview-looks");
  const errors = validateEpisode(episode).filter((error) => {
    if (!error.startsWith("a finished episode")) return true;
    return strict && !preview && !previewLooks;
  });
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  const baseDir = path.dirname(episodePath);
  const outDir = path.resolve(baseDir, episode.outputDir || ".");
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cardnews-"));
  const crf = Number(argValue("--crf") || 19);
  const preset = argValue("--preset") || "fast";
  const total = episode.slides.length;
  const stillsOnly = hasFlag("--stills-only");
  const lookId = lookFor(episode);
  const look = resolveLook(lookId, episode.accent);
  console.log(`look ${lookId} (${LOOKS[lookId].label})`);
  if (episode.accent) {
    const ratio = contrast(look.surfaces.base.accent, look.surfaces.base.bg);
    if (ratio < 3) console.warn(`  ! accent ${episode.accent} 는 이 룩의 바탕과 명도 차이가 작아요(${ratio.toFixed(1)}:1). 3:1 이상인 색을 고르세요.`);
  }

  if (!have("ffmpeg") || !have("ffprobe")) {
    throw new Error("ffmpeg and ffprobe are required. run scripts/setup.sh");
  }

  const reelOnly = hasFlag("--reel-only");
  const browser = reelOnly ? null : await chromium.launch({ headless: true });
  let browserClosed = false;
  const page = browser
    ? await browser.newPage({
        viewport: { width: 1080, height: 1350 },
        deviceScaleFactor: 1,
      })
    : null;

  try {
    if (preview) {
      await renderThemes(page, episode, path.join(outDir, "theme-previews"));
      return;
    }
    if (previewLooks) {
      await renderLooks(page, episode, path.join(outDir, "look-previews"));
      return;
    }

    const motions = [];
    let problems = 0;
    for (let i = 0; i < episode.slides.length; i += 1) {
      const slide = episode.slides[i];
      const index = i + 1;
      const image = absImage(episode, slide);
      const video = absMedia(episode, slide.video);
      if (image && !fs.existsSync(image)) throw new Error(`missing image for slide ${index}: ${image}`);
      if (video && !fs.existsSync(video)) throw new Error(`missing video for slide ${index}: ${video}`);
      const prepared = {
        ...slide,
        image,
        images: (slide.images || []).map((item) => absMedia(episode, item)),
      };
      const baseName = slideBase(index, prepared);
      const png = path.join(outDir, `${baseName}.png`);
      if (reelOnly) {
        if (!fs.existsSync(png)) throw new Error(`--reel-only needs ${png}`);
        continue;
      }
      const still = await shoot(
        page,
        buildSlideHtml({ slide: prepared, episode, index, total, mode: "still" }),
        png,
        { width: 1080, height: 1350 },
      );
      assertFrame(png, 1080, 1350);
      console.log(`still ${index} ${slide.layout} → ${path.relative(process.cwd(), png)}`);
      problems += report(index, still.issues);

      if (stillsOnly) continue;

      const seconds = Number(slide.seconds || 8);
      if (seconds < 7 || seconds > 9) {
        console.warn(`slide ${index} is ${seconds}s. carousel clips should be 7–9s.`);
      }
      const mp4 = path.join(outDir, `${baseName}.mp4`);
      const windows = still.wins || [];
      const moving = windows.length === 1 && (image || video);
      if (!moving) {
        holdStill({ image: png, output: mp4, seconds, crf, preset });
        motions.push({ index, name: baseName, motion: "still" });
      } else {
        // 사진 창만 비운 PNG를 위에 얹고, 그 창 크기로 만든 영상을 아래에 깐다.
        const overlay = path.join(work, `overlay-${index}.png`);
        await shoot(
          page,
          buildSlideHtml({ slide: prepared, episode, index, total, mode: "overlay" }),
          overlay,
          { width: 1080, height: 1350, omitBackground: true },
        );
        const rect = windows[0];
        const w = even(rect.w);
        const h = even(rect.h);
        const base = path.join(work, `base-${index}.mp4`);
        const motion = slideMotion(slide, i);
        if (video) {
          cutVideo({ input: video, output: base, width: w, height: h, seconds, start: slide.videoStart || 0, crf });
        } else {
          photoMotion({ input: image, output: base, width: w, height: h, seconds, motion, crf });
          motions.push({ index, name: baseName, motion });
        }
        composeWindow({ video: base, png: overlay, output: mp4, x: rect.x, y: rect.y, seconds, crf, preset });
      }
      const info = assertFrame(mp4, 1080, 1350);
      console.log(`clip ${index} ${info.duration.toFixed(2)}s SAR ${info.sar}`);
    }

    if (motions.length && !stillsOnly) {
      const note = path.join(outDir, "영상메모.txt");
      const lines = [
        "공식 영상이 없는 장은 스틸 사진에 느린 카메라 무브를 넣었어요. 글은 움직이지 않아요.",
        ...motions.map((item) => `- ${item.name}: ${item.motion === "still" ? "정지" : `느린 카메라 (${item.motion})`}`),
        "",
      ];
      fs.writeFileSync(note, lines.join("\n"));
    }

    const sheet = path.join(outDir, "contact_sheet.png");
    if (page) await renderContact(
      page,
      episode.slides.map((slide, i) => {
        const base = path.join(outDir, slideBase(i + 1, slide));
        const videoFile = `${base}.mp4`;
        return {
          file: `${base}.png`,
          label: path.basename(fs.existsSync(videoFile) && !stillsOnly ? videoFile : `${base}.png`),
          kind: slide.layout || "",
        };
      }),
      sheet,
    );
    if (page) console.log(`contact → ${path.relative(process.cwd(), sheet)}`);
    if (problems) {
      console.warn(`\n검수에서 ${problems}건이 걸렸어요. 위 줄을 보고 문장을 줄이거나 판형을 바꾼 뒤 다시 그리세요.`);
    }

    writeText(outDir, "기획서.md", episode.plan);
    writeText(outDir, "게시글문구.txt", episode.caption);
    writeText(outDir, "X글.txt", episode.xPost);
    writeText(outDir, "나레이션대본.txt", episode.narration);

    if (!stillsOnly && !hasFlag("--no-reel")) {
      if (browser && !browserClosed) {
        await browser.close();
        browserClosed = true;
      }
      const audio = argValue("--audio");
      let narrationAudio = argValue("--narration-audio");
      if (hasFlag("--tts")) {
        narrationAudio = await synthesizeNarration(outDir, episode.narration || "");
      }
      let done = false;
      if (!hasFlag("--ffmpeg-reel") && hyperframesAvailable()) {
        try {
          const reel = await renderHyperframesReel({ episode, outDir, look, audio, narration: narrationAudio, draft: hasFlag("--draft"), keep: hasFlag("--keep-reel") });
          const info = assertFrame(reel, 1080, 1920);
          console.log(`reel ${info.duration.toFixed(2)}s ${(info.size / 1e6).toFixed(2)}MB → ${reel}`);
          if (info.duration < 18 || info.duration > 32) console.warn(`reel is ${info.duration.toFixed(1)}s. aim for about 20–30s.`);
          done = true;
        } catch (error) {
          console.warn(`HyperFrames 릴스를 못 그렸어요. 카드만 이어 붙인 릴스로 넘겨요.\n${error.message}`);
        }
      } else if (!hasFlag("--ffmpeg-reel")) {
        console.warn("HyperFrames가 없어요. 카드만 이어 붙인 릴스로 만들어요. bash scripts/setup.sh");
      }
      if (!done) {
        const beats = episode.reel?.beats?.length ? episode.reel.beats : autoBeats(episode.slides);
        const pad = look.surfaces.base.bg.replace("#", "0x");
        const parts = [];
        beats.forEach((beat, i) => {
          const slide = episode.slides[(beat.slide || 1) - 1];
          if (!slide) throw new Error(`reel beat ${i + 1} points at missing slide ${beat.slide}`);
          const cardPng = path.join(outDir, `${slideBase(beat.slide || 1, slide)}.png`);
          const part = path.join(work, `reel-part-${i}.mp4`);
          padCard({ image: cardPng, output: part, seconds: Number(beat.seconds || 3.2), crf, preset, color: pad });
          parts.push(part);
        });
        const reel = path.join(outDir, "reel.mp4");
        concatVideos({ files: parts, output: reel });
        if (audio || narrationAudio) {
          const mixed = path.join(work, "reel-audio.mp4");
          if (audio && narrationAudio) mixAudio({ video: reel, audio: narrationAudio, output: mixed, duck: audio });
          else mixAudio({ video: reel, audio: audio || narrationAudio, output: mixed });
          fs.copyFileSync(mixed, reel);
        }
        const info = assertFrame(reel, 1080, 1920);
        console.log(`reel (ffmpeg) ${info.duration.toFixed(2)}s ${(info.size / 1e6).toFixed(2)}MB → ${reel}`);
      }
    }
  } finally {
    if (browser && !browserClosed) await browser.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function synthesizeNarration(outDir, text) {
  if (!text.trim()) throw new Error("--tts needs narration text in the episode");
  if (!have("edge-tts")) {
    throw new Error("TTS is off unless edge-tts is installed. Install edge-tts, or pass --narration-audio. Default renders stay silent.");
  }
  const voice = process.env.CARDNEWS_TTS_VOICE || "ko-KR-SunHiNeural";
  const out = path.join(outDir, "나레이션.mp3");
  const result = spawnSync("edge-tts", ["--voice", voice, "--text", text, "--write-media", out], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`edge-tts failed\n${result.stderr || result.stdout}`);
  }
  console.log(`tts → ${out} (${voice}). narration is opt-in.`);
  return out;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
