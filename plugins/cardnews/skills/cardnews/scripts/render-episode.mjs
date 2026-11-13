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
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  applyLayouts,
  buildReelHtml,
  buildSlideHtml,
  isOpaqueCover,
  listThemes,
  slideKind,
  validateEpisode,
} from "./lib/html.mjs";
import {
  assertFrame,
  concatVideos,
  cutVideo,
  grainStill,
  have,
  holdStill,
  mixAudio,
  overlayPng,
  padCard,
  photoMotion,
} from "./lib/ffmpeg.mjs";
import { remotionAvailable, renderRemotionReel } from "./render-reel.mjs";

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
  console.log(`usage: node scripts/render-episode.mjs <episode.json> [--stills-only] [--no-reel] [--preview-themes] [--crf 19] [--preset fast] [--audio file] [--tts] [--allow-short]`);
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
    figcaption{color:#8FE8D6;font-weight:700;font-size:22px;letter-spacing:-.02em;padding-top:12px;font-family:sans-serif}
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
    await page.screenshot({
      path: file,
      type: "png",
      omitBackground: Boolean(omitBackground),
      clip: { x: 0, y: 0, width, height },
    });
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

async function renderThemes(page, episode, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const slide = { ...episode.slides[0], role: "cover", image: absImage(episode, episode.slides[0]) };
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
    await shoot(page, html, file, { width: 1080, height: 1350 });
    const tmp = `${file}.grain.png`;
    grainStill({ input: file, output: tmp });
    fs.renameSync(tmp, file);
    assertPng(file);
    console.log(`cover ${cover} → ${file}`);
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

function assertPng(file) {
  const info = assertFrame(file, 1080, 1350);
  return info;
}

async function main() {
  const valued = new Set(["--crf", "--preset", "--audio", "--narration-audio"]);
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
  applyLayouts(episode);
  const strict = !hasFlag("--allow-short");
  const errors = validateEpisode(episode).filter((error) => {
    if (!error.startsWith("a finished episode")) return true;
    return strict && !hasFlag("--preview-themes");
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
  const channel = episode.header || episode.handle || episode.channel || "";
  const total = episode.slides.length;
  const stillsOnly = hasFlag("--stills-only");
  const preview = hasFlag("--preview-themes");

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

    const motions = [];
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
      const rawPng = path.join(work, `${baseName}-raw.png`);
      await shoot(
        page,
        buildSlideHtml({ slide: prepared, episode, index, total, mode: "still" }),
        rawPng,
        { width: 1080, height: 1350 },
      );
      grainStill({ input: rawPng, output: png });
      assertPng(png);
      console.log(`still ${index} → ${path.relative(process.cwd(), png)}`);

      if (stillsOnly) continue;

      const seconds = Number(slide.seconds || 8);
      if (seconds < 7 || seconds > 9) {
        console.warn(`slide ${index} is ${seconds}s. carousel clips should be 7–9s.`);
      }
      const mp4 = path.join(outDir, `${baseName}.mp4`);
      if (isOpaqueCover(prepared, episode) || (!image && !video)) {
        holdStill({ image: png, output: mp4, seconds, crf, preset });
        motions.push({ index, name: baseName, motion: "still" });
      } else {
        const overlay = path.join(work, `overlay-${index}.png`);
        await shoot(
          page,
          buildSlideHtml({ slide: prepared, episode, index, total, mode: "overlay" }),
          overlay,
          { width: 1080, height: 1350, omitBackground: true },
        );
        const base = path.join(work, `base-${index}.mp4`);
        const motion = slideMotion(slide, i);
        if (video) {
          cutVideo({
            input: video,
            output: base,
            width: 1080,
            height: 1350,
            seconds,
            start: slide.videoStart || 0,
            crf,
          });
        } else {
          photoMotion({
            input: image,
            output: base,
            width: 1080,
            height: 1350,
            seconds,
            motion,
            crf,
          });
          motions.push({ index, name: baseName, motion });
        }
        overlayPng({ video: base, png: overlay, output: mp4, crf, grain: true, preset });
      }
      const info = assertFrame(mp4, 1080, 1350);
      console.log(`clip ${index} ${info.duration.toFixed(2)}s SAR ${info.sar}`);
    }

    if (motions.length && !stillsOnly) {
      const note = path.join(outDir, "영상메모.txt");
      const lines = [
        "공식 영상이 없는 장은 공식(또는 사용 가능한) 스틸에 느린 카메라 무브를 넣었어요.",
        ...motions.map((item) => `- ${item.name}: ${item.motion === "still" ? "정지 표지" : `느린 카메라 (${item.motion})`}`),
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
          kind: fs.existsSync(videoFile) && !stillsOnly ? "VIDEO" : "STILL",
        };
      }),
      sheet,
    );
    if (page) console.log(`contact → ${path.relative(process.cwd(), sheet)}`);

    writeText(outDir, "기획서.md", episode.plan);
    writeText(outDir, "게시글문구.txt", episode.caption);
    writeText(outDir, "X글.txt", episode.xPost);
    writeText(outDir, "나레이션대본.txt", episode.narration);

    if (!stillsOnly && !hasFlag("--no-reel")) {
      const audio = argValue("--audio");
      let narrationAudio = argValue("--narration-audio");
      if (hasFlag("--tts")) {
        narrationAudio = await synthesizeNarration(outDir, episode.narration || "");
      }
      let usedRemotion = false;
      if (!hasFlag("--ffmpeg-reel") && remotionAvailable()) {
        if (browser && !browserClosed) {
          await browser.close();
          browserClosed = true;
        }
        try {
          const reel = renderRemotionReel({ episode, outDir, crf, audio, narration: narrationAudio });
          const info = assertFrame(reel, 1080, 1920);
          console.log(`reel remotion ${info.duration.toFixed(2)}s ${(info.size / 1e6).toFixed(2)}MB → ${reel}`);
          usedRemotion = true;
        } catch (error) {
          console.warn(`Remotion 릴스를 못 그렸어요. ffmpeg로 넘겨요.\n${error.message}`);
        }
      } else if (!hasFlag("--ffmpeg-reel")) {
        console.warn("Remotion이 없어요. ffmpeg 릴스로 만들어요. bash scripts/setup.sh");
      }
      if (usedRemotion) {
        /* motion reel already written */
      } else {
      const beats = episode.reel?.beats?.length ? episode.reel.beats : autoBeats(episode.slides);
      const parts = [];
      let cursor = 0;
      for (let i = 0; i < beats.length; i += 1) {
        const beat = beats[i];
        const slide = episode.slides[(beat.slide || 1) - 1];
        if (!slide) throw new Error(`reel beat ${i + 1} points at missing slide ${beat.slide}`);
        const seconds = Number(beat.seconds || 3.2);
        cursor += seconds;
        const cardPng = path.join(outDir, `${slideBase(beat.slide || 1, slide)}.png`);
        const reelBase = path.join(work, `reel-base-${i}.mp4`);
        padCard({
          image: cardPng,
          output: reelBase,
          seconds,
          crf,
          preset,
        });
        const reelOverlay = path.join(work, `reel-overlay-${i}.png`);
        if (!page) throw new Error("ffmpeg reel needs the browser. Re-run without --reel-only.");
        await page.setViewportSize({ width: 1080, height: 1920 });
        await shoot(
          page,
          buildReelHtml({
            channel,
            lines: beat.lines,
          }),
          reelOverlay,
          { width: 1080, height: 1920, omitBackground: true },
        );
        const part = path.join(work, `reel-part-${i}.mp4`);
        overlayPng({ video: reelBase, png: reelOverlay, output: part, crf });
        assertFrame(part, 1080, 1920);
        parts.push(part);
      }
      let reel = path.join(outDir, "reel.mp4");
      concatVideos({ files: parts, output: reel });
      if (audio || narrationAudio) {
        const mixed = path.join(work, "reel-audio.mp4");
        if (audio && narrationAudio) {
          mixAudio({ video: reel, audio: narrationAudio, output: mixed, duck: audio });
        } else {
          mixAudio({ video: reel, audio: audio || narrationAudio, output: mixed });
        }
        fs.copyFileSync(mixed, reel);
      }
      const info = assertFrame(reel, 1080, 1920);
      console.log(`reel ${info.duration.toFixed(2)}s ${(info.size / 1e6).toFixed(2)}MB → ${reel}`);
      if (cursor < 20 || cursor > 30) {
        console.warn(`reel is ${cursor.toFixed(1)}s. aim for about 20–30s.`);
      }
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
