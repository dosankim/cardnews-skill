import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CSS, applyLayouts, buildLayout, needsPhoto, surfaceFor } from "./layouts.mjs";
import { LOOKS, LOOK_NAMES, LOOKS_BY_KIND, fontFiles, resolveLook, surfaceVars } from "./looks.mjs";
import { normalizeKind } from "./layouts.mjs";

export { applyLayouts, needsPhoto };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FONTS = path.join(ROOT, "assets/fonts");

export function listThemes() {
  return ["A", "B", "C"];
}

export function fileUrl(abs) {
  return pathToFileURL(abs).href;
}

/** base 가 있으면 그 폴더 기준 상대 주소로 쓴다. 릴스 프로젝트가 글꼴을 복사해 갈 때 쓴다. */
export function fontCss(base) {
  return fontFiles()
    .filter(({ file }) => fs.existsSync(path.join(FONTS, file)))
    .map(({ family, weight, file }) => {
      const src = base ? `${base}/${file}` : fileUrl(path.join(FONTS, file));
      return `@font-face{font-family:${family};font-weight:${weight};font-style:normal;font-display:block;src:url("${src}") format("woff2")}`;
    })
    .join("\n");
}

export function fontDir() {
  return FONTS;
}

export function slideKind(role) {
  if (role === "cover") return "cover";
  if (role === "info") return "info";
  if (role === "tips" || role === "cta") return "tips";
  return "content";
}

export function coverStyle(slide, episode) {
  return String(slide.cover || episode?.cover || "A").toUpperCase();
}

/** episode.look 이 없으면 갈래의 첫 룩. */
export function lookFor(episode) {
  const asked = String(episode?.look || "").toLowerCase();
  if (LOOKS[asked]) return asked;
  const kind = normalizeKind(episode?.kind);
  return (LOOKS_BY_KIND[kind] || ["press"])[0];
}

/** data-fit 글자를 상자에 맞게 키운다. 화면 안에서 돈다. 릴스도 같은 함수를 쓴다. */
export const FIT_FN = `
function __fit() {
  const issues = [];
  for (const el of document.querySelectorAll("[data-fit]")) {
    const box = el.parentElement;
    const inner = el.firstElementChild;
    const max = Number(el.dataset.max);
    const min = Number(el.dataset.min);
    const cs = getComputedStyle(box);
    const W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const fixed = Number(el.dataset.maxh) || 0;
    const ok = (size) => {
      el.style.fontSize = size + "px";
      const r = inner.getBoundingClientRect();
      const H = fixed || box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - [...box.children].filter((c) => c !== el).reduce((s, c) => s + c.offsetHeight, 0);
      return r.width <= W + 1 && inner.scrollWidth <= inner.clientWidth + 1 && r.height <= H + 1;
    };
    if (ok(max)) continue;
    let lo = min;
    let hi = max;
    if (!ok(min)) {
      issues.push("제목이 길어서 가장 작은 크기로도 넘쳐요: " + inner.textContent.slice(0, 16));
      continue;
    }
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (ok(mid)) lo = mid; else hi = mid;
    }
    ok(lo);
  }
  return issues;
}
`;

/** 넘친 글, 너무 작은 글, 빈 화면을 찾아 window.__report 에 적는다. */
const FIT = `${FIT_FN}
(async () => {
  await document.fonts.ready;
  const issues = __fit();
  const page = document.querySelector(".page");
  const PW = page.clientWidth;
  const PH = page.clientHeight;
  const seen = new Set();
  let top = PH;
  let bottom = 0;
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (el.closest(".qm")) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    if (!r.width) continue;
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    const label = node.textContent.trim().slice(0, 14);
    if ((r.left < 20 || r.right > PW - 20 || r.top < 8 || r.bottom > PH - 8) && !seen.has(el)) {
      seen.add(el);
      issues.push("글이 화면 밖으로 나가요: " + label);
    }
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 20.5 && !seen.has(el)) {
      seen.add(el);
      issues.push("글자가 너무 작아요(" + Math.round(size) + "px): " + label);
    }
  }
  for (const el of page.querySelectorAll(".stage,.row,.pan,.col,.txt,.ttl,.hdb,.rail,.rows,.pans,.strip > span:not(.folio)")) {
    if (el.scrollHeight > el.clientHeight + 3 || el.scrollWidth > el.clientWidth + 3) {
      const text = (el.textContent || "").trim().slice(0, 14);
      issues.push("칸이 넘쳐요: " + text);
    }
  }
  const wins = [...page.querySelectorAll("[data-win]")].map((el) => {
    const r = el.getBoundingClientRect();
    top = Math.min(top, r.top);
    bottom = Math.max(bottom, r.bottom);
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  });
  for (const w of wins) {
    if (w.h < 300 || w.w < 300) issues.push("사진 칸이 너무 작아요(" + w.w + "×" + w.h + "). 글을 줄이세요.");
  }
  const used = (bottom - top) / PH;
  if (used < 0.62) issues.push("화면의 " + Math.round((1 - used) * 100) + "%가 비어 있어요.");
  window.__report = { issues: [...new Set(issues)], wins };
})();
`;

export function pageHtml({ cls, inner, vars, mode = "still", width = 1080, height = 1350, extraCss = "" }) {
  const sized = width === 1080 && height === 1350 ? "" : `html,body{width:${width}px;height:${height}px}`;
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>${fontCss()}${CSS}${sized}${extraCss}</style></head><body class="${mode === "overlay" ? "overlay" : ""}"><div class="page ${cls}" style="${vars}">${inner}</div><script>${FIT}</script></body></html>`;
}

export function buildSlideHtml({ slide, episode, index, total, mode }) {
  const kind = slideKind(slide.role);
  const cover = coverStyle(slide, episode);
  const layout = slide.layout || (kind === "cover" ? "cover" : kind === "info" ? "info" : kind === "tips" ? "tips" : "bottom");
  const look = resolveLook(lookFor(episode), episode.accent);
  const surface = surfaceFor(slide, layout, cover);
  const ctx = {
    header: episode.header || "",
    channel: episode.channel || episode.header || "",
    handle: episode.handle || "",
    credit: episode.credit || "",
    index,
    total,
    fileUrl,
    mode,
    cover,
  };
  const { cls, inner } = buildLayout(layout, slide, ctx);
  return pageHtml({ cls, inner, vars: surfaceVars(look, surface), mode });
}

export function validateEpisode(episode) {
  const errors = [];
  if (!episode?.slides?.length) errors.push("slides is empty");
  if (episode.look && !LOOKS[String(episode.look).toLowerCase()]) {
    errors.push(`look must be one of ${LOOK_NAMES.join(", ")}`);
  }
  for (const [i, slide] of (episode.slides || []).entries()) {
    const n = i + 1;
    const layout = slide.layout || (slide.role === "cover" ? "cover" : "bottom");
    if (needsPhoto(layout) && !slide.image && !slide.video && !(slide.images && slide.images.length)) {
      errors.push(`slide ${n} (${layout}) needs image, images, or video`);
    }
    if (layout === "grid" && (slide.images || []).length < 2) {
      errors.push(`slide ${n} (grid) needs two or three images`);
    }
    if (!["info", "tips", "breather"].includes(layout) && !slide.title && !slide.stat) {
      errors.push(`slide ${n} needs a title`);
    }
    const cover = String(slide.cover || episode.cover || "A").toUpperCase();
    if (slide.role === "cover" && !["A", "B", "C"].includes(cover)) {
      errors.push(`slide ${n} cover must be A, B, or C`);
    }
  }
  if ((episode.slides || []).length !== 10) {
    errors.push(`a finished episode has 10 slides, got ${(episode.slides || []).length}`);
  }
  return errors;
}
