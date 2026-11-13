/**
 * 릴스. 카드와 같은 룩(색, 글꼴)으로 9:16 장면을 HTML로 짓고 HyperFrames로 굽는다.
 * 카드 PNG를 세로 화면에 붙이지 않는다. 장면마다 세로 화면에 맞게 다시 짠다.
 *
 * 장면 종류
 *   title  큰 글자만
 *   photo  위에 사진, 아래에 글
 *   stat   숫자가 굴러 올라옴
 *   list   제목과 줄 서너 개
 *   outro  저장 안내
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIT_FN, coverStyle, fontCss, fontDir } from "./lib/html.mjs";
import { escapeHtml, rich, surfaceFor } from "./lib/layouts.mjs";
import { surfaceVars } from "./lib/looks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
const GSAP = path.join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js");
const FPS = 30;
const OVERLAP = 0.6;

export function hyperframesAvailable() {
  return fs.existsSync(CLI) && fs.existsSync(GSAP) && Number(process.versions.node.split(".")[0]) >= 22;
}

/** 음악에서 박자 자리를 찾는다. 장면 길이를 가까운 박자에 맞출 때 쓴다. */
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

const PHOTO_LAYOUTS = new Set(["bottom", "top", "split", "inset", "side", "breather", "grid", "cover"]);
const LIST_LAYOUTS = new Set(["steps", "checklist", "timeline", "info", "compare", "chart", "tips"]);

function rowsOf(slide) {
  const text = (item) => (typeof item === "string" ? item : item.k || item.title || item.label || item.text || "");
  if (slide.layout === "timeline") return (slide.events || []).map((ev) => ({ n: ev.when || ev.k || "", t: ev.text || ev.v || "" }));
  if (slide.layout === "info") return (slide.facts || []).map((f) => ({ n: "", t: `${f.label} ${String(f.value).split("\n")[0]}` }));
  if (slide.layout === "chart") return (slide.bars || []).map((b) => ({ n: String(b.value), t: b.label }));
  if (slide.layout === "compare") return ((slide.columns || [])[1]?.points || []).map((p, i) => ({ n: String(i + 1), t: p }));
  if (slide.layout === "steps") return (slide.steps || slide.items || []).map((s, i) => ({ n: String(i + 1), t: text(s) }));
  return (slide.items || slide.tips || []).map((s) => ({ n: "", t: text(s) }));
}

function sceneType(slide, beat, last) {
  if (beat.type) return beat.type;
  if (beat.count != null && beat.count !== "") return "stat";
  if (last && (slide.layout === "tips" || slide.role === "tips" || slide.role === "cta")) return "outro";
  if (slide.layout === "stat") return "stat";
  if (PHOTO_LAYOUTS.has(slide.layout) && (slide.image || (slide.images || []).length)) return "photo";
  if (LIST_LAYOUTS.has(slide.layout) && rowsOf(slide).length) return "list";
  return "title";
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:P,sans-serif;-webkit-font-smoothing:antialiased;word-break:keep-all}
#root{position:relative;width:1080px;height:1920px;overflow:hidden}
.scene{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden}
.pan{position:absolute;left:0;top:0;width:1080px;height:1920px;background:var(--bg);color:var(--fg)}
.who{position:absolute;left:72px;top:196px;font-size:30px;font-weight:700;letter-spacing:-.01em;z-index:3;white-space:nowrap}
.who i{font-style:normal;font-weight:500;color:var(--muted);margin-left:14px}
.in{position:absolute;left:72px;right:120px;top:280px;bottom:450px;display:flex;flex-direction:column}
.grow{flex:1 1 0;min-height:0;display:flex;flex-direction:column}
.end{justify-content:flex-end}
.mid{justify-content:center}
.fit{width:100%}
.fi{display:inline-block}
.lines{font-family:var(--f-display);font-weight:var(--w-display);letter-spacing:var(--tr-display);line-height:var(--lh-display)}
.ln{display:block;overflow:hidden;white-space:nowrap;padding:.09em 0;margin:-.09em 0}
.lx{display:inline-block}
.hl{color:var(--accent)}
.sub{flex:none;font-size:42px;font-weight:700;letter-spacing:-.02em;margin-bottom:22px;color:var(--accent)}
.shot{position:absolute;left:0;top:0;width:1080px;height:1040px;overflow:hidden;background:var(--panel)}
.shot img{width:100%;height:100%;object-fit:cover;display:block}
.T-photo .in{top:1040px;padding-top:64px}
.T-photo .who{left:56px;top:180px;background:var(--bg);padding:12px 18px}
.tagk{position:absolute;left:72px;top:1006px;background:var(--fg);color:var(--bg);font-size:36px;font-weight:700;padding:14px 24px;z-index:2;letter-spacing:-.02em;white-space:nowrap}
.num{font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);line-height:.9;white-space:nowrap}
.num .fi{white-space:nowrap}
.dg{display:inline-block;height:.9em;overflow:hidden;vertical-align:bottom}
.ds{display:block}
.ds i{display:block;height:.9em;line-height:.9em;font-style:normal}
.unit{font-family:P,sans-serif;font-weight:800;font-size:.2em;letter-spacing:-.04em;margin-left:.06em;color:var(--accent)}
.T-stat .lines{margin-top:36px}
.rws{flex:1 1 0;min-height:0;display:flex;flex-direction:column;margin-top:56px}
.rw{flex:1 1 0;min-height:0;max-height:236px;border-top:var(--rule) solid var(--line);overflow:hidden}
.rw:first-child{border-top-color:var(--fg)}
.rwi{display:flex;align-items:center;gap:30px;height:100%;font-size:70px;font-weight:700;letter-spacing:-.04em;white-space:nowrap}
.rwi b{font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);font-size:96px;color:var(--accent);min-width:76px}
.bd{flex:none;margin-top:44px;font-size:46px;line-height:1.5;font-weight:500;letter-spacing:-.02em;color:var(--soft)}
.hd{flex:none}
.bm{flex:none;width:92px;height:124px;background:var(--accent);clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%);margin-bottom:56px}
.hand{flex:none;margin-top:44px;font-size:40px;font-weight:600;color:var(--muted)}
`;

function linesHtml(lines, id, { max, min, sub = "", maxh = 0 }) {
  const rows = lines
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => `<span class="ln"><span class="lx ${id}-lx">${rich(line)}</span></span>`)
    .join("");
  return `${sub}<div class="lines fit" data-fit data-max="${max}" data-min="${min}"${maxh ? ` data-maxh="${maxh}"` : ""}><span class="fi">${rows}</span></div>`;
}

/** 숫자는 자리마다 굴러 올라온다. */
function odometer(value, unit, id) {
  const raw = String(value ?? "");
  const m = raw.match(/^([\d.,]+)(.*)$/);
  const digits = m ? m[1] : raw;
  const tail = `${m ? m[2] : ""}${unit ? ` ${unit}` : ""}`.trim();
  const cells = [...digits]
    .map((ch) => {
      if (!/\d/.test(ch)) return escapeHtml(ch);
      const d = Number(ch);
      const seq = Array.from({ length: 10 }, (_, i) => (d + 1 + i) % 10);
      return `<span class="dg"><span class="ds ${id}-ds">${seq.map((n) => `<i>${n}</i>`).join("")}</span></span>`;
    })
    .join("");
  return `<div class="num fit" data-fit data-max="620" data-min="140"><span class="fi">${cells}${tail ? `<span class="unit">${escapeHtml(tail)}</span>` : ""}</span></div>`;
}

function buildScenes({ episode, look, beats, imageName }) {
  const slides = episode.slides || [];
  const who = escapeHtml(episode.channel || episode.header || "");
  const hand = episode.handle ? `<i>${escapeHtml(episode.handle)}</i>` : "";
  let cursor = 0;
  return beats.map((beat, i) => {
    const slide = slides[(beat.slide || 1) - 1] || {};
    const last = i === beats.length - 1;
    const type = sceneType(slide, beat, last);
    const cover = coverStyle(slide, episode);
    let surface = beat.surface || surfaceFor(slide, slide.layout, cover);
    if (type === "photo") surface = "base";
    if (type === "outro" && !beat.surface) surface = "field";
    const id = `s${i}`;
    const seconds = Number(beat.seconds || 3);
    const lines = (beat.lines && beat.lines.length ? beat.lines : String(slide.title || "").split("\n")).map((l) => String(l).trim()).filter(Boolean);
    const kicker = beat.kicker ?? slide.kicker ?? slide.kick ?? slide.label ?? "";
    let body = "";
    if (type === "photo") {
      const src = imageName(slide.image || (slide.images || [])[0]);
      body = `<div class="shot"><img id="${id}-img" alt="" src="${src}" style="object-position:${escapeHtml(slide.imagePosition || "center")}"></div>${kicker ? `<div class="tagk" id="${id}-tag">${escapeHtml(kicker)}</div>` : ""}
<div class="in" id="${id}-in"><div class="grow">${linesHtml(lines, id, { max: 150, min: 60 })}</div></div>`;
    } else if (type === "stat") {
      const value = beat.count != null && beat.count !== "" ? beat.count : slide.stat;
      const unit = beat.countUnit || slide.unit || "";
      body = `<div class="in" id="${id}-in"><div class="grow end">${odometer(value, unit, id)}</div><div class="lines" style="font-size:96px">${lines.slice(0, 2).map((line) => `<span class="ln"><span class="lx ${id}-lx">${rich(line)}</span></span>`).join("")}</div></div>`;
    } else if (type === "list") {
      const rows = rowsOf(slide)
        .slice(0, 4)
        .map((row) => `<div class="rw"><div class="rwi ${id}-rw">${row.n ? `<b>${escapeHtml(row.n)}</b>` : ""}<span>${rich(row.t)}</span></div></div>`)
        .join("");
      body = `<div class="in" id="${id}-in"><div class="hd">${linesHtml(lines, id, { max: 170, min: 64, maxh: 360 })}</div><div class="rws">${rows}</div></div>`;
    } else if (type === "outro") {
      body = `<div class="in" id="${id}-in"><div class="grow end"><div class="bm" id="${id}-bm"></div>${linesHtml(lines, id, { max: 230, min: 72 })}</div>${episode.handle ? `<div class="hand">${escapeHtml(episode.handle)}</div>` : ""}</div>`;
    } else {
      const sub = kicker ? `<div class="sub" id="${id}-sub">${escapeHtml(kicker)}</div>` : "";
      const para = beat.body ?? (lines.length <= 2 ? slide.body : "");
      body = `<div class="in" id="${id}-in"><div class="grow mid">${linesHtml(lines, id, { max: 300, min: 72, sub })}${para ? `<div class="bd" id="${id}-bd">${rich(para)}</div>` : ""}</div></div>`;
    }
    const scene = { id, type, surface, start: cursor, seconds, last, bg: look.surfaces[surface].bg };
    scene.html = `<section id="${id}" class="clip scene T-${type}" data-start="${cursor.toFixed(3)}" data-duration="${(seconds + (last ? 0 : OVERLAP)).toFixed(3)}" data-track-index="${i % 2}" style="z-index:${i + 1}">
<div class="pan" id="${id}-pan" style="${surfaceVars(look, surface)}"><div class="who">${who}${type === "photo" ? "" : hand}</div>${body}</div></section>`;
    cursor += seconds;
    return scene;
  });
}

/** 움직임. 한 편에 전환은 두 가지만 쓴다. 면이 바뀌면 덮고, 같으면 밀어낸다. */
function timeline(scenes) {
  const out = ['window.__timelines = window.__timelines || {};', "const tl = gsap.timeline({ paused: true });"];
  const t = (n) => Number(n.toFixed(3));
  scenes.forEach((scene, i) => {
    const { id, start, seconds } = scene;
    const prev = scenes[i - 1];
    let textAt = start + 0.12;
    if (i === 0) {
      out.push(`tl.fromTo("#${id}-in",{scale:1.07},{scale:1,duration:1.1,ease:"expo.out",transformOrigin:"0% 100%"},0);`);
      textAt = null;
    } else if (prev.bg !== scene.bg) {
      out.push(`tl.fromTo("#${id}-pan",{yPercent:100},{yPercent:0,duration:0.6,ease:"expo.out"},${t(start)});`);
      textAt = start + 0.24;
    } else {
      out.push(`tl.fromTo("#${prev.id}-in",{x:0},{x:-120,duration:0.3,ease:"power4.in"},${t(start - 0.3)});`);
      out.push(`tl.fromTo("#${prev.id}-in",{opacity:1},{opacity:0,duration:0.18,ease:"none"},${t(start - 0.18)});`);
      out.push(`tl.fromTo("#${id}-in",{x:120,opacity:0.35},{x:0,opacity:1,duration:0.45,ease:"power4.out"},${t(start)});`);
      textAt = start + 0.06;
    }
    if (textAt != null) {
      out.push(`tl.fromTo(".${id}-lx",{yPercent:112},{yPercent:0,duration:0.6,ease:"expo.out",stagger:0.09},${t(textAt)});`);
      if (scene.type === "title") {
        out.push(`if(document.getElementById("${id}-sub"))tl.fromTo("#${id}-sub",{y:24,opacity:0},{y:0,opacity:1,duration:0.4,ease:"power4.out"},${t(textAt)});`);
        out.push(`if(document.getElementById("${id}-bd"))tl.fromTo("#${id}-bd",{y:30,opacity:0},{y:0,opacity:1,duration:0.5,ease:"power4.out"},${t(textAt + 0.35)});`);
      }
    }
    if (scene.type === "photo") {
      const [from, to] = i % 2 === 0 ? [1.12, 1.02] : [1.02, 1.12];
      out.push(`tl.fromTo("#${id}-img",{scale:${from}},{scale:${to},duration:${t(seconds + OVERLAP)},ease:"none"},${t(start)});`);
      if (i > 0) out.push(`if(document.getElementById("${id}-tag"))tl.fromTo("#${id}-tag",{x:-40,opacity:0},{x:0,opacity:1,duration:0.4,ease:"power4.out"},${t(start + 0.3)});`);
    }
    if (scene.type === "stat") {
      out.push(`tl.fromTo(".${id}-ds",{yPercent:0},{yPercent:-90,duration:1.0,ease:"expo.out",stagger:0.07},${t(start + (i === 0 ? 0 : 0.2))});`);
    }
    if (scene.type === "list") {
      out.push(`tl.fromTo(".${id}-rw",{yPercent:100},{yPercent:0,duration:0.5,ease:"expo.out",stagger:0.08},${t((textAt ?? start) + 0.3)});`);
    }
    if (scene.type === "outro") {
      out.push(`tl.fromTo("#${id}-bm",{scaleY:0},{scaleY:1,duration:0.5,ease:"back.out(1.5)",transformOrigin:"50% 0%"},${t((textAt ?? start) + 0.35)});`);
    }
  });
  out.push('window.__timelines["reel"] = tl;');
  return out.join("\n");
}

function html({ scenes, total, look, sizes, audio, measure = false }) {
  let n = 0;
  const body = scenes
    .map((scene) => scene.html)
    .join("\n")
    .replace(/data-fit /g, () => {
      const size = sizes?.[n];
      n += 1;
      return size ? `style="font-size:${size}" data-fit ` : "data-fit ";
    });
  const bg = look.surfaces.base.bg;
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=1080, height=1920">
<script src="vendor/gsap.min.js"></script>
<style>${fontCss("assets/fonts")}
${CSS}
html,body,#root{background:${bg}}</style></head><body>
<div id="root" data-composition-id="reel" data-start="0" data-duration="${total.toFixed(3)}" data-width="1080" data-height="1920" data-fps="${FPS}">
${body}
${audio}
</div>
${measure ? "" : `<script>\n${timeline(scenes)}\n</script>`}</body></html>`;
}

/** 플레이라이트가 이미 받아 둔 헤드리스 셸이 있으면 그걸 쓴다. 없으면 HyperFrames가 자기 것을 받는다. */
function findHeadlessShell() {
  if (process.env.HYPERFRAMES_BROWSER_PATH) return process.env.HYPERFRAMES_BROWSER_PATH;
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "ms-playwright") : "",
  ].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((name) => name.startsWith("chromium_headless_shell-")).sort().reverse();
    for (const dir of dirs) {
      const base = path.join(root, dir);
      for (const sub of fs.readdirSync(base)) {
        for (const bin of ["chrome-headless-shell", "chrome-headless-shell.exe", "headless_shell"]) {
          const file = path.join(base, sub, bin);
          if (fs.existsSync(file)) return file;
        }
      }
    }
  }
  return "";
}

export async function renderHyperframesReel({ episode, outDir, look, audio, narration, draft = false, keep = false, crf = 21 }) {
  if (!hyperframesAvailable()) throw new Error("hyperframes is not installed (node 22+ 필요)");
  const slides = episode.slides || [];
  let beats = episode.reel?.beats?.length
    ? episode.reel.beats
    : slides.slice(0, 8).map((slide, i) => ({ slide: i + 1, seconds: 3 }));
  if (audio) beats = snapBeats(beats, detectBeats(audio));

  const project = keep ? path.join(outDir, "reel-src") : fs.mkdtempSync(path.join(os.tmpdir(), "cardnews-reel-"));
  fs.rmSync(project, { recursive: true, force: true });
  for (const dir of ["assets/fonts", "assets/img", "assets/audio", "vendor"]) fs.mkdirSync(path.join(project, dir), { recursive: true });
  fs.copyFileSync(GSAP, path.join(project, "vendor", "gsap.min.js"));
  for (const name of fs.readdirSync(fontDir())) {
    if (name.endsWith(".woff2")) fs.copyFileSync(path.join(fontDir(), name), path.join(project, "assets", "fonts", name));
  }
  const base = path.dirname(episode._file || path.join(outDir, "episode.json"));
  const copied = new Map();
  const imageName = (value) => {
    if (!value) return "";
    const abs = path.resolve(base, value);
    if (!copied.has(abs)) {
      const name = `${String(copied.size + 1).padStart(2, "0")}${path.extname(abs).toLowerCase() || ".jpg"}`;
      fs.copyFileSync(abs, path.join(project, "assets", "img", name));
      copied.set(abs, `assets/img/${name}`);
    }
    return copied.get(abs);
  };

  const scenes = buildScenes({ episode, look, beats, imageName });
  const total = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const tracks = [];
  if (audio && fs.existsSync(audio)) {
    const name = `bed${path.extname(audio)}`;
    fs.copyFileSync(audio, path.join(project, "assets", "audio", name));
    tracks.push(`<audio id="music" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="8" data-volume="${narration ? 0.2 : 0.85}" data-fade-out="0.8" src="assets/audio/${name}"></audio>`);
  }
  if (narration && fs.existsSync(narration)) {
    const name = `voice${path.extname(narration)}`;
    fs.copyFileSync(narration, path.join(project, "assets", "audio", name));
    tracks.push(`<audio id="voice" data-start="0" data-duration="${total.toFixed(3)}" data-track-index="9" data-volume="1" src="assets/audio/${name}"></audio>`);
  }
  const audioHtml = tracks.join("\n");
  const index = path.join(project, "index.html");

  // 글자 크기는 글꼴이 다 읽힌 뒤에야 잴 수 있다. 한 번 열어서 재고, 그 값을 박아 넣는다.
  fs.writeFileSync(index, html({ scenes, total, look, audio: audioHtml, measure: true }));
  const { chromium } = await import("playwright");
  const { pathToFileURL } = await import("node:url");
  const browser = await chromium.launch({ headless: true });
  let sizes = [];
  let issues = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(index).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: FIT_FN });
    issues = await page.evaluate(() => {
      for (const el of document.querySelectorAll(".scene")) el.style.visibility = "visible";
      return window.__fit();
    });
    sizes = await page.evaluate(() => [...document.querySelectorAll("[data-fit]")].map((el) => el.style.fontSize || ""));
  } finally {
    await browser.close();
  }
  for (const issue of issues) console.warn(`  ! 릴스: ${issue}`);
  fs.writeFileSync(index, html({ scenes, total, look, sizes, audio: audioHtml }));

  const output = path.join(outDir, "reel.mp4");
  const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", DO_NOT_TRACK: "1" };
  const shell = findHeadlessShell();
  if (shell) env.HYPERFRAMES_BROWSER_PATH = shell;
  const args = [CLI, "render", project, "--strict", "--quiet", "--fps", String(FPS), "-o", output];
  if (draft) args.push("--quality", "draft");
  else args.push("--crf", String(crf));
  const result = spawnSync(process.execPath, args, { cwd: project, env, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (!keep) fs.rmSync(project, { recursive: true, force: true });
  if (result.status !== 0 || !fs.existsSync(output)) {
    throw new Error(`${result.stderr || ""}\n${result.stdout || ""}`.trim().slice(-2500) || "hyperframes render failed");
  }
  if (keep) console.log(`reel 원본 → ${project} (npx hyperframes preview 로 열어 고칠 수 있어요)`);
  return output;
}
