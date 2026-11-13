import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FONTS = path.join(ROOT, "assets/fonts");
const GRAIN = path.join(ROOT, "assets/grain.png");

const JADE = "#8FE8D6";
const DEEP = "#0f7f6e";
const INK = "#0b0c0f";
const HANJI = "#efe9dd";
const HANJI_INK = "#16181c";

export function listThemes() {
  return ["A", "B", "C"];
}

function fileUrl(abs) {
  return pathToFileURL(abs).href;
}

function fontCss() {
  const face = (family, weight, file) =>
    `@font-face{font-family:${family};font-weight:${weight};font-style:normal;font-display:block;src:url("${fileUrl(path.join(FONTS, file))}") format("woff2")}`;
  return [
    face("P", 300, "Pretendard-Light.woff2"),
    face("P", 400, "Pretendard-Regular.woff2"),
    face("P", 500, "Pretendard-Medium.woff2"),
    face("P", 600, "Pretendard-SemiBold.woff2"),
    face("P", 700, "Pretendard-Bold.woff2"),
    face("P", 800, "Pretendard-ExtraBold.woff2"),
    face("P", 900, "Pretendard-Black.woff2"),
    face("'Noto Serif CJK KR'", 700, "noto-serif-kr-korean-700-normal.woff2"),
  ].join("\n");
}

const BASE = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:transparent;overflow:hidden}
body{font-family:P,'Noto Sans CJK KR',sans-serif;color:#fff;-webkit-font-smoothing:antialiased;word-break:keep-all}
.page{position:absolute;inset:0}
.mesh{position:absolute;inset:0;opacity:.07;background:
 repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 9px),repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 9px)}
.top{position:absolute;left:64px;right:64px;top:56px;display:flex;justify-content:space-between;align-items:center;
 font-weight:600;font-size:19px;letter-spacing:.22em;color:rgba(255,255,255,.78)}
.top .idx{color:${JADE};letter-spacing:.12em}
.credit{position:absolute;right:64px;bottom:44px;font-size:16px;color:rgba(255,255,255,.5);letter-spacing:.02em;max-width:70%;text-align:right}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:${INK}}
`;

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** {{word}} becomes a highlight. Newlines become <br>. */
export function rich(text, mode) {
  const raw = String(text ?? "");
  const parts = raw.split(/(\{\{[\s\S]*?\}\})/g);
  return parts
    .map((part) => {
      const mark = part.match(/^\{\{([\s\S]*)\}\}$/);
      if (!mark) return escapeHtml(part).replace(/\n/g, "<br>");
      const inner = escapeHtml(mark[1]).replace(/\n/g, "<br>");
      if (mode === "em") return `<em>${inner}</em>`;
      return `<span class="hl">${inner}</span>`;
    })
    .join("");
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

function page(extraCss, inner, { width = 1080, height = 1350 } = {}) {
  const sized =
    width === 1080 && height === 1350
      ? BASE
      : BASE.replace("height:1350px", `height:${height}px`).replace("width:1080px", `width:${width}px`);
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>${fontCss()}${sized}</style><style>${extraCss}</style></head><body><div class="page">${inner}</div></body></html>`;
}

function topbar(header, index, total) {
  const label = String(index).padStart(2, "0");
  const of = total ? `${label} / ${String(total).padStart(2, "0")}` : label;
  return `<div class="top"><span>${escapeHtml(header || "")}</span><span class="idx">${of}</span></div>`;
}

function bgImg(image, position) {
  if (!image) return "";
  const pos = escapeHtml(position || "center center");
  return `<img class="bg" alt="" src="${fileUrl(image)}" style="object-position:${pos}">`;
}

function contentCss() {
  return `.gt{position:absolute;left:0;right:0;top:0;height:260px;background:linear-gradient(rgba(0,0,0,.55),transparent)}
.gb{position:absolute;left:0;right:0;bottom:0;height:720px;background:linear-gradient(transparent,rgba(8,9,11,.62) 38%,rgba(8,9,11,.9))}
.box{position:absolute;left:64px;right:64px;bottom:104px}
.rule{width:52px;height:4px;background:${JADE};margin-bottom:22px}
.label{font-weight:600;font-size:23px;color:${JADE};margin-bottom:18px;letter-spacing:.01em;line-height:1.4}
.title{font-weight:800;font-size:54px;line-height:1.24;letter-spacing:-.025em;margin-bottom:24px}
.body{font-weight:400;font-size:28.5px;line-height:1.62;color:rgba(255,255,255,.86);letter-spacing:-.01em}`;
}

function htmlContent(slide, ctx, withPhoto) {
  const inner = `${withPhoto ? bgImg(slide.image, slide.imagePosition) : ""}
<div class="gt"></div><div class="gb"></div>${topbar(ctx.header, ctx.index, ctx.total)}
<div class="box"><div class="rule"></div><div class="label">${escapeHtml(slide.kicker || slide.label || "")}</div>
<div class="title">${rich(slide.title, "plain")}</div>
<div class="body">${rich(slide.body || "", "plain")}</div></div>
<div class="credit">${escapeHtml(slide.credit || ctx.credit || "")}</div>`;
  return page(contentCss(), inner);
}

function htmlInfo(slide, ctx, withPhoto) {
  const css = `.veil{position:absolute;inset:0;background:rgba(8,9,11,.58)}
.gt{position:absolute;left:0;right:0;top:0;height:260px;background:linear-gradient(rgba(0,0,0,.4),transparent)}
.box{position:absolute;left:64px;right:64px;top:168px}
.rule{width:52px;height:4px;background:${JADE};margin-bottom:22px}
.label{font-weight:600;font-size:23px;color:${JADE};margin-bottom:16px;letter-spacing:.18em}
.title{font-weight:800;font-size:60px;letter-spacing:-.03em;margin-bottom:48px}
.row{display:flex;border-top:1px solid rgba(255,255,255,.22);padding:26px 0}
.row:last-child{border-bottom:1px solid rgba(255,255,255,.22)}
.k{width:168px;flex:none;font-weight:600;font-size:26px;color:${JADE};padding-top:3px}
.v{font-weight:500;font-size:31px;line-height:1.5;letter-spacing:-.015em}
.sm{font-size:24px;font-weight:400;color:rgba(255,255,255,.72)}`;
  const rows = (slide.facts || [])
    .map((fact) => {
      const value = rich(String(fact.value ?? "").replace(/\\n/g, "\n"), "plain");
      return `<div class="row"><div class="k">${escapeHtml(fact.label)}</div><div class="v">${value}</div></div>`;
    })
    .join("");
  const inner = `${withPhoto ? bgImg(slide.image, slide.imagePosition) : ""}
<div class="veil"></div><div class="mesh" style="opacity:.04"></div><div class="gt"></div>
${topbar(ctx.header, ctx.index, ctx.total)}
<div class="box"><div class="rule"></div><div class="label">${escapeHtml(slide.kicker || "VISIT INFO")}</div>
<div class="title">${escapeHtml(slide.title || "관람 정보")}</div>${rows}</div>
<div class="credit">${escapeHtml(slide.credit || ctx.credit || "")}</div>`;
  return page(css, inner);
}

function tipPairs(slide) {
  const tips = slide.tips || [];
  return tips.map((tip) => {
    if (typeof tip === "string") return { k: tip, v: "" };
    return { k: tip.k || tip.title || tip.label || "", v: tip.v || tip.text || tip.value || "" };
  });
}

function htmlTips(slide, ctx, withPhoto) {
  const css = `.veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,11,.86) 0,rgba(8,9,11,.7) 60%,rgba(8,9,11,.45))}
.box{position:absolute;left:64px;right:64px;top:168px}
.rule{width:52px;height:4px;background:${JADE};margin-bottom:22px}
.label{font-weight:600;font-size:23px;color:${JADE};margin-bottom:16px;letter-spacing:.18em}
.price{display:flex;align-items:baseline;gap:20px;margin-bottom:36px}
.price b{font-weight:900;font-size:112px;letter-spacing:-.04em;line-height:1}
.price span{font-size:28px;color:rgba(255,255,255,.75);font-weight:500}
.tip{border-top:1px solid rgba(255,255,255,.22);padding:18px 0}
.tk{font-weight:700;font-size:30px;margin-bottom:6px}
.tv{font-weight:400;font-size:26px;color:rgba(255,255,255,.8);line-height:1.45}
.cta{position:absolute;left:64px;right:64px;bottom:96px;display:flex;justify-content:space-between;align-items:center;
 border:2px solid ${JADE};border-radius:999px;padding:22px 34px;font-weight:700;font-size:30px}
.cta i{font-style:normal;color:${JADE};font-weight:600;font-size:24px;letter-spacing:.06em}`;
  const price = slide.price
    ? `<div class="price"><b>${escapeHtml(slide.price)}</b><span>${escapeHtml(slide.priceNote || "")}</span></div>`
    : "";
  const tips = tipPairs(slide)
    .map(
      (tip) =>
        `<div class="tip"><div class="tk">${escapeHtml(tip.k)}</div>${tip.v ? `<div class="tv">${escapeHtml(tip.v)}</div>` : ""}</div>`,
    )
    .join("");
  const cta = slide.cta === false
    ? ""
    : `<div class="cta"><span>${escapeHtml(slide.cta || "저장해 두고 나중에 봐요")}</span><i>${escapeHtml(slide.ctaMark || "SAVE ↗")}</i></div>`;
  const inner = `${withPhoto ? bgImg(slide.image, slide.imagePosition) : ""}
<div class="veil"></div>${topbar(ctx.header, ctx.index, ctx.total)}
<div class="box"><div class="rule"></div><div class="label">${escapeHtml(slide.kicker || "TICKET & TIP")}</div>
${price}${tips}</div>${cta}
<div class="credit">${escapeHtml(slide.credit || ctx.credit || "")}</div>`;
  return page(css, inner);
}

function htmlCoverA(slide, ctx, withPhoto) {
  const css = `.g{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0,rgba(0,0,0,0) 30%,rgba(0,0,0,.28) 48%,rgba(6,7,9,.9) 100%)}
.chip{position:absolute;left:64px;top:60px;border:2px solid #fff;border-radius:999px;padding:11px 22px;font-weight:700;font-size:24px;letter-spacing:-.01em;background:rgba(0,0,0,.25)}
.handle{position:absolute;right:64px;top:70px;font-weight:600;font-size:20px;color:rgba(255,255,255,.7);letter-spacing:.04em}
.kick{position:absolute;left:64px;bottom:770px;font-weight:800;font-size:32px;color:${INK};background:#fff;padding:8px 16px;letter-spacing:-.01em}
.big{position:absolute;left:56px;bottom:206px;font-weight:900;font-size:176px;line-height:.98;letter-spacing:-.065em;text-shadow:0 6px 40px rgba(0,0,0,.35)}
.big .hl{display:inline-block;background:${JADE};color:${INK};padding:0 18px 8px 14px;margin-left:-6px;transform:rotate(-2deg)}
.meta{position:absolute;left:64px;right:64px;bottom:70px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid rgba(255,255,255,.8);padding-top:20px;font-weight:600;font-size:25px}
.meta .r{color:${JADE}}`;
  const inner = `${withPhoto ? bgImg(slide.image, slide.imagePosition) : ""}
<div class="mesh" style="opacity:.06"></div><div class="g"></div>
<div class="chip">${escapeHtml(slide.chip || "")}</div>
<div class="handle">${escapeHtml(ctx.handle || "")}</div>
<div class="kick">${escapeHtml(slide.kick || slide.kicker || "")}</div>
<div class="big">${rich(slide.title, "hl")}</div>
<div class="meta"><span>${escapeHtml(slide.metaLeft || "")}</span><span class="r">${escapeHtml(slide.metaRight || "")}</span></div>`;
  return page(css, inner);
}

function htmlCoverB(slide, ctx) {
  const photo = slide.image ? fileUrl(slide.image) : "";
  const grain = fileUrl(GRAIN);
  const css = `body{background:${HANJI}}
.paper{position:absolute;inset:0;background:${HANJI}}
.grain{position:absolute;inset:0;opacity:.35;background-image:url('${grain}');background-size:cover;mix-blend-mode:multiply}
.head{position:absolute;left:64px;right:64px;top:64px;color:${HANJI_INK};font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:74px;line-height:1.22;letter-spacing:-.035em}
.head em{font-style:normal;color:${DEEP}}
.photo{position:absolute;left:64px;right:64px;top:300px;height:720px;background:${INK} url('${photo}') ${escapeHtml(slide.imagePosition || "center")} / cover no-repeat}
.meta{position:absolute;left:64px;right:64px;bottom:74px;display:flex;justify-content:space-between;color:${HANJI_INK};font-weight:600;font-size:24px}
.tag{position:absolute;left:84px;top:1000px;transform:translateY(-100%);background:${HANJI_INK};color:${HANJI};font-weight:700;font-size:22px;padding:10px 18px;letter-spacing:.04em}
.handle{position:absolute;right:64px;top:1040px;color:rgba(22,24,28,.6);font-weight:600;font-size:20px}`;
  const inner = `<div class="paper"></div><div class="photo"></div>
<div class="tag">${escapeHtml(slide.tag || ctx.header || "")}</div>
<div class="head">${rich(slide.title, "em")}</div>
<div class="handle">${escapeHtml(ctx.handle || "")}</div>
<div class="meta"><span>${escapeHtml(slide.metaLeft || "")}</span><span>${escapeHtml(slide.metaRight || "")}</span></div>`;
  return page(css, inner);
}

function htmlCoverC(slide, ctx, withPhoto) {
  const css = `.g{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,7,9,.78),rgba(6,7,9,.25) 45%,rgba(6,7,9,.9))}
.k{position:absolute;left:64px;top:64px;font-weight:800;font-size:30px;color:${JADE};letter-spacing:-.01em}
.handle{position:absolute;right:64px;top:72px;font-weight:600;font-size:20px;color:rgba(255,255,255,.7)}
.h{position:absolute;left:60px;top:140px;font-weight:900;font-size:128px;line-height:1.02;letter-spacing:-.06em}
.h .hl{color:${JADE};background:none;padding:0;margin:0;transform:none;display:inline}
.list{position:absolute;left:64px;bottom:150px;display:flex;flex-direction:column;gap:14px}
.list div{display:inline-flex;align-self:flex-start;background:rgba(255,255,255,.94);color:${INK};font-weight:800;font-size:32px;padding:12px 22px;border-radius:10px}
.list div b{color:${DEEP};margin-right:12px}
.meta{position:absolute;left:64px;right:64px;bottom:70px;display:flex;justify-content:space-between;font-weight:600;font-size:24px;color:rgba(255,255,255,.85)}`;
  const items = (slide.items || [])
    .slice(0, 3)
    .map((item, i) => `<div><b>${String(i + 1).padStart(2, "0")}</b>${escapeHtml(item)}</div>`)
    .join("");
  const inner = `${withPhoto ? bgImg(slide.image, slide.imagePosition) : ""}
<div class="mesh" style="opacity:.05"></div><div class="g"></div>
<div class="k">${escapeHtml(slide.kick || slide.kicker || "")}</div>
<div class="handle">${escapeHtml(ctx.handle || "")}</div>
<div class="h">${rich(slide.title, "hl")}</div>
<div class="list">${items}</div>
<div class="meta"><span>${escapeHtml(slide.metaLeft || "")}</span><span>${escapeHtml(slide.metaRight || "")}</span></div>`;
  return page(css, inner);
}

export function buildSlideHtml({ slide, episode, index, total, mode }) {
  const kind = slideKind(slide.role);
  const cover = coverStyle(slide, episode);
  const withPhoto = mode !== "overlay";
  const ctx = {
    header: episode.header || episode.channel || "",
    handle: episode.handle || "",
    credit: episode.credit || "",
    index,
    total,
  };
  if (kind === "cover" && cover === "B") return htmlCoverB(slide, ctx);
  if (kind === "cover" && cover === "C") return htmlCoverC(slide, ctx, withPhoto);
  if (kind === "cover") return htmlCoverA(slide, ctx, withPhoto);
  if (kind === "info") return htmlInfo(slide, ctx, withPhoto);
  if (kind === "tips") return htmlTips(slide, ctx, withPhoto);
  return htmlContent(slide, ctx, withPhoto);
}

export function isOpaqueCover(slide, episode) {
  return slideKind(slide.role) === "cover" && coverStyle(slide, episode) === "B";
}

export function buildReelHtml({ channel, lines }) {
  const text = (lines || []).filter(Boolean).slice(0, 2).join("\n");
  const css = `html,body{width:1080px;height:1920px}
.gt{position:absolute;left:0;right:0;top:0;height:280px;background:linear-gradient(rgba(0,0,0,.45),transparent)}
.gb{position:absolute;left:0;right:0;bottom:0;height:860px;background:linear-gradient(transparent,rgba(8,9,11,.5) 36%,rgba(8,9,11,.9))}
.top{top:148px;font-size:22px}
.box{position:absolute;left:64px;right:140px;bottom:460px}
.rule{width:52px;height:4px;background:${JADE};margin-bottom:22px}
.caption{font-weight:800;font-size:60px;line-height:1.24;letter-spacing:-.03em;white-space:pre-line}`;
  const inner = `<div class="gt"></div><div class="gb"></div><div class="mesh" style="opacity:.05"></div>
<div class="top"><span>${escapeHtml(channel || "")}</span></div>
<div class="box"><div class="rule"></div><div class="caption">${escapeHtml(text)}</div></div>`;
  return page(css, inner, { width: 1080, height: 1920 });
}

export function validateEpisode(episode) {
  const errors = [];
  if (!episode?.slides?.length) errors.push("slides is empty");
  for (const [i, slide] of (episode.slides || []).entries()) {
    const n = i + 1;
    if (!slide.image && !slide.video) errors.push(`slide ${n} needs image or video`);
    if (slideKind(slide.role) !== "info" && slideKind(slide.role) !== "tips" && !slide.title) {
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

export function grainFile() {
  return fs.existsSync(GRAIN) ? GRAIN : "";
}
