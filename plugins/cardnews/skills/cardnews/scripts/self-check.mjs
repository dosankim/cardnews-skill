#!/usr/bin/env node
/**
 * Renders a two-slide fixture and checks size, codec, and SAR.
 * Does not need network or sample photos.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "render-episode.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cardnews-check-"));
const image = path.join(dir, "swatch.jpg");
const episode = path.join(dir, "episode.json");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status || 1);
  }
  return result.stdout;
}

run("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=0x234056:s=1600x2000",
  "-frames:v",
  "1",
  image,
]);

const slide = (n, role, title) => ({
  role,
  kicker: "점검",
  title,
  body: "글자가 그려지는지만 확인해요.",
  image: "swatch.jpg",
  credit: "색면",
  seconds: 7,
  ...(role === "info"
    ? { facts: [{ label: "항목", value: "값" }] }
    : {}),
});

fs.writeFileSync(
  episode,
  JSON.stringify(
    {
      theme: "gallery",
      channel: "점검",
      handle: "@check",
      outputDir: ".",
      plan: "점검용 기획서",
      slides: [slide(1, "cover", "표지\n한 줄"), slide(2, "info", "정보")],
      reel: { beats: [] },
    },
    null,
    2,
  ),
);

run(process.execPath, [script, episode, "--allow-short", "--no-reel", "--crf", "32"]);

for (const name of ["01_cover.png", "02_info.png", "01_cover.mp4", "02_info.mp4", "contact_sheet.png", "기획서.md", "영상메모.txt"]) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    console.error("missing", file);
    process.exit(1);
  }
}

const probe = run("ffprobe", [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-show_entries",
  "stream=width,height,sample_aspect_ratio,codec_name,pix_fmt",
  "-of",
  "json",
  path.join(dir, "01_cover.mp4"),
]);
const stream = JSON.parse(probe).streams[0];
if (stream.width !== 1080 || stream.height !== 1350 || stream.sample_aspect_ratio !== "1:1" || stream.codec_name !== "h264" || stream.pix_fmt !== "yuv420p") {
  console.error("clip probe failed", stream);
  process.exit(1);
}

console.log("self-check ok", dir);
