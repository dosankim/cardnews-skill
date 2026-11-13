/**
 * 판형. 색과 글꼴은 looks.mjs 의 변수만 읽는다.
 *
 * 규칙 몇 가지를 코드로 지킨다.
 * - 한 장은 위에서 아래까지 찬다. 목록은 줄이 남는 높이를 나눠 갖고, 큰 제목은 상자에 맞게 커진다.
 * - 사진 위에 글을 얹지 않는다. 글은 바탕색 위에, 사진은 창(.win) 안에.
 * - 포인트색은 한 장에 한 가지 일.
 */

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** {{단어}} 는 강조. 줄바꿈은 <br>. */
export function rich(text) {
  const parts = String(text ?? "").replace(/\\n/g, "\n").split(/(\{\{[\s\S]*?\}\})/g);
  return parts
    .map((part) => {
      const mark = part.match(/^\{\{([\s\S]*)\}\}$/);
      if (!mark) return escapeHtml(part).replace(/\n/g, "<br>");
      return `<span class="hl">${escapeHtml(mark[1]).replace(/\n/g, "<br>")}</span>`;
    })
    .join("");
}

export const LAYOUTS = [
  "bottom",
  "top",
  "split",
  "inset",
  "statement",
  "stat",
  "grid",
  "steps",
  "checklist",
  "compare",
  "timeline",
  "chart",
  "pullquote",
  "side",
  "breather",
  "hanji",
  "info",
  "tips",
  "cover",
];

const DENSE = new Set(["split", "grid", "steps", "checklist", "compare", "timeline", "chart", "info", "tips", "inset"]);

export function density(layout) {
  return DENSE.has(layout) ? "dense" : "airy";
}

export const SEQUENCES = {
  place: ["cover", "split", "breather", "timeline", "bottom", "grid", "pullquote", "checklist", "statement", "tips"],
  news: ["cover", "statement", "stat", "bottom", "compare", "chart", "checklist", "pullquote", "timeline", "tips"],
  howto: ["cover", "compare", "statement", "steps", "stat", "checklist", "pullquote", "chart", "hanji", "tips"],
  list: ["cover", "stat", "steps", "grid", "inset", "breather", "checklist", "compare", "pullquote", "tips"],
  comparison: ["cover", "compare", "split", "stat", "bottom", "chart", "checklist", "pullquote", "timeline", "tips"],
  story: ["cover", "pullquote", "bottom", "timeline", "inset", "statement", "side", "breather", "hanji", "tips"],
  data: ["cover", "stat", "chart", "compare", "statement", "timeline", "checklist", "split", "pullquote", "tips"],
};

const KIND = {
  space: "place",
  place: "place",
  exhibition: "place",
  news: "news",
  explainer: "news",
  howto: "howto",
  "how-to": "howto",
  tips: "howto",
  list: "list",
  comparison: "comparison",
  compare: "comparison",
  story: "story",
  profile: "story",
  data: "data",
  trend: "data",
};

export function normalizeKind(kind) {
  return KIND[String(kind || "").toLowerCase()] || "news";
}

const PHOTO = new Set(["bottom", "top", "split", "inset", "grid", "side", "breather"]);

export function needsPhoto(layout) {
  return PHOTO.has(layout);
}

/** 그 판형이 그려지려면 슬라이드에 있어야 하는 것. */
function fits(layout, slide) {
  const has = (key) => Array.isArray(slide[key]) && slide[key].length > 0;
  switch (layout) {
    case "grid":
      return has("images") && slide.images.length >= 2;
    case "bottom":
    case "top":
    case "split":
    case "inset":
    case "side":
    case "breather":
      return Boolean(slide.image || slide.video);
    case "stat":
      return slide.stat != null && slide.stat !== "";
    case "steps":
      return has("steps") || has("items");
    case "checklist":
      return has("items") || has("tips");
    case "compare":
      return has("columns") && slide.columns.length >= 2;
    case "timeline":
      return has("events");
    case "chart":
      return has("bars");
    case "info":
      return has("facts");
    case "tips":
      return has("tips") || Boolean(slide.price);
    default:
      return true;
  }
}

/** 재료를 보고 판형을 고른다. 순서표가 맞지 않을 때 쓴다. */
function infer(slide, index) {
  const order = ["stat", "steps", "compare", "timeline", "chart", "info", "tips", "checklist", "grid"];
  for (const name of order) {
    if (name === "checklist" && !Array.isArray(slide.items)) continue;
    if (fits(name, slide)) return name;
  }
  if (slide.image || slide.video) return ["bottom", "top", "inset", "split"][index % 4];
  if (slide.by) return "pullquote";
  return slide.body ? ["hanji", "statement"][index % 2] : "statement";
}

export function applyLayouts(episode) {
  const seq = SEQUENCES[normalizeKind(episode.kind)] || SEQUENCES.news;
  const locked = episode.slides.map((slide) => Boolean(slide.layout));
  episode.slides.forEach((slide, i) => {
    if (slide.role === "cover") {
      slide.layout = "cover";
      return;
    }
    if (slide.layout) return;
    if (slide.role === "info" && fits("info", slide)) slide.layout = "info";
    else if ((slide.role === "tips" || slide.role === "cta") && fits("tips", slide)) slide.layout = "tips";
    else {
      const pick = seq[i] && seq[i] !== "cover" ? seq[i] : "bottom";
      slide.layout = fits(pick, slide) ? pick : infer(slide, i);
    }
  });
  for (let i = 1; i < episode.slides.length; i += 1) {
    if (locked[i]) continue;
    const here = episode.slides[i];
    if (here.layout !== episode.slides[i - 1].layout) continue;
    const opposite = density(episode.slides[i - 1].layout) === "dense" ? "airy" : "dense";
    const alt = LAYOUTS.find((name) => name !== "cover" && name !== here.layout && density(name) === opposite && fits(name, here) && (!PHOTO.has(name) || here.image));
    if (alt) here.layout = alt;
  }
  return episode;
}

/** 판형마다 기본으로 쓰는 면. slide.surface 가 있으면 그 값이 이긴다. */
const SURFACE = {
  statement: "field",
  pullquote: "alt",
};

export function surfaceFor(slide, layout, cover) {
  const asked = String(slide.surface || "").toLowerCase();
  if (["base", "alt", "field"].includes(asked)) return asked;
  if (layout === "cover") return cover === "C" ? "alt" : "base";
  return SURFACE[layout] || "base";
}

export const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden;background:transparent}
body{font-family:P,'Apple SD Gothic Neo','Noto Sans CJK KR',sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;word-break:keep-all;overflow-wrap:break-word;line-break:strict}
ul{list-style:none}
.page{position:absolute;inset:0;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;isolation:isolate}
.stage{flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding:76px 72px 52px;position:relative}
.strip{flex:none;height:96px;margin:0 72px;display:flex;align-items:center;gap:20px;border-top:var(--rule) solid var(--fg);font-size:26px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.strip.head{border-top:0;border-bottom:var(--rule) solid var(--fg)}
.strip .hand{font-weight:500;color:var(--muted)}
.strip .cred{margin-left:auto;font-size:21px;font-weight:400;color:var(--muted);overflow:hidden;text-overflow:ellipsis;max-width:520px;letter-spacing:0}
.strip .folio{font-family:var(--f-num);font-weight:var(--w-num);font-size:38px;line-height:1;letter-spacing:0;padding-left:8px}
.strip .folio i{font-style:normal;color:var(--muted)}
.kicker{font-size:32px;font-weight:700;line-height:1.3;letter-spacing:-.015em}
.kicker.a{color:var(--accent)}
.h{font-family:var(--f-display);font-weight:var(--w-display);letter-spacing:var(--tr-display);line-height:var(--lh-display);text-wrap:balance}
.body{font-size:40px;line-height:1.55;font-weight:400;letter-spacing:-.015em;color:var(--soft);text-wrap:pretty}
.hl{color:var(--accent)}
.grow{flex:1 1 0;min-height:0;min-width:0;display:flex;flex-direction:column}
.grow.end{justify-content:flex-end}
.grow.mid{justify-content:center}
.fit{width:100%}
.fi{display:inline-block;max-width:100%}
.fit[data-pre] .fi{white-space:pre;max-width:none;text-wrap:nowrap}
.win{position:relative;overflow:hidden;background:var(--panel)}
.win img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.overlay .page{background:transparent}
.overlay .win{background:transparent;z-index:-1;overflow:visible;box-shadow:0 0 0 3000px var(--bg)}
.tag{position:absolute;z-index:2;background:var(--fg);color:var(--bg);font-size:30px;font-weight:700;padding:13px 22px;line-height:1.25;letter-spacing:-.015em;max-width:800px}

.hd{flex:none;padding-bottom:44px}
.hd .kicker{margin-bottom:14px}
.hd .h{font-size:84px}
.hd .body{margin-top:20px;font-size:34px;line-height:1.5}

.rows{flex:1 1 0;min-height:0;display:flex;flex-direction:column;--k:1}
.rows[data-n="1"],.rows[data-n="2"]{--k:1.3}
.rows[data-n="3"]{--k:1.2}
.rows[data-n="4"]{--k:1.08}
.rows[data-n="5"]{--k:.94}
.rows[data-n="6"]{--k:.82}
.row{flex:1 1 0;min-height:0;display:flex;align-items:center;gap:calc(34px*var(--k));border-top:var(--rule) solid var(--line)}
.rows .row:first-child{border-top-color:var(--fg)}
.row .n{flex:none;min-width:calc(112px*var(--k));font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);font-size:calc(118px*var(--k));line-height:.9;color:var(--accent)}
.row .tk{font-size:calc(58px*var(--k));font-weight:800;letter-spacing:-.035em;line-height:1.22}
.row .tv{font-size:calc(38px*var(--k));line-height:1.4;color:var(--soft);margin-top:calc(8px*var(--k));letter-spacing:-.015em}
.row .cb{flex:none;width:calc(54px*var(--k));height:calc(54px*var(--k));border:calc(5px*var(--k)) solid var(--fg)}
.row .ci{font-size:calc(56px*var(--k));font-weight:700;letter-spacing:-.035em;line-height:1.25}
.row .when{flex:none;min-width:270px;font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);font-size:calc(104px*var(--k));line-height:1.25;white-space:nowrap}
.row .when.ko{font-family:var(--f-display);font-weight:var(--w-display);letter-spacing:var(--tr-display);font-size:calc(60px*var(--k))}
.row.now .when{color:var(--accent)}
.row .what{font-size:calc(46px*var(--k));font-weight:500;line-height:1.38;letter-spacing:-.022em}
.row .k{flex:none;width:190px;font-size:calc(32px*var(--k));font-weight:600;color:var(--muted)}
.row .v{font-size:calc(54px*var(--k));font-weight:600;line-height:1.3;letter-spacing:-.03em}

.pans{flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:14px}
.pan{flex:1 1 0;min-height:0;padding:38px 44px 40px;background:var(--panel);display:flex;flex-direction:column;justify-content:space-between}
.pan{--k:1}
.pan[data-n="4"]{--k:.82}
.pan[data-n="1"],.pan[data-n="2"]{--k:1.16}
.pan .pt{font-size:34px;font-weight:700;color:var(--muted)}
.pan li{font-size:calc(62px*var(--k));font-weight:700;line-height:1.3;letter-spacing:-.04em;color:var(--muted)}
.pan.b{background:var(--accent)}
.pan.b .pt{color:var(--on-accent)}
.pan.b li{color:var(--on-accent);font-weight:800}

.bars{flex:1 1 0;min-height:0;display:flex;flex-direction:column;justify-content:space-between;border-top:var(--rule) solid var(--fg);padding-top:28px}
.br .lab{font-size:40px;font-weight:700;letter-spacing:-.025em;margin-bottom:8px}
.br .ln{display:flex;align-items:center;gap:22px}
.br .bar{height:66px;background:var(--fg);min-width:8px}
.br.max .bar{background:var(--accent)}
.br .val{font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);font-size:76px;line-height:1.3;margin:-12px 0}
.bars[data-n="5"] .bar,.bars[data-n="6"] .bar{height:48px}
.bars[data-n="5"] .val,.bars[data-n="6"] .val{font-size:58px}

.num{font-family:var(--f-num);font-weight:var(--w-num);letter-spacing:var(--tr-num);line-height:.88}
.num .fi{white-space:nowrap}
.unit{font-family:P,sans-serif;font-weight:800;font-size:.17em;letter-spacing:-.04em;margin-left:.07em;color:var(--accent)}
.L-stat .h{font-size:78px;margin-top:28px}
.L-stat .body{margin-top:18px}

.L-statement .kicker{margin-bottom:8px}
.L-statement .body{margin-top:36px;font-size:44px}
.L-hanji .kicker{margin-bottom:22px}
.L-hanji .body{flex:none;font-size:44px;padding-top:34px;border-top:var(--rule) solid var(--fg)}


.qm{flex:none;font-family:NS,serif;font-weight:900;font-size:260px;line-height:.82;height:150px;color:var(--accent)}
.by{flex:none;font-size:32px;font-weight:600;padding-top:30px;margin-top:44px;border-top:var(--rule) solid var(--fg);letter-spacing:-.015em}

.price{flex:none;display:flex;align-items:baseline;gap:22px;padding-bottom:34px}
.price b{font-family:var(--f-num);font-weight:var(--w-num);font-size:190px;line-height:.9;letter-spacing:var(--tr-num)}
.price b .unit{font-size:.36em;color:inherit}
.price span{font-size:32px;font-weight:600;color:var(--muted)}
.cta{flex:none;margin-top:30px;background:var(--accent);color:var(--on-accent);padding:34px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;font-size:44px;font-weight:800;letter-spacing:-.035em;line-height:1.25}
.bm{flex:none;width:34px;height:46px;background:var(--on-accent);clip-path:polygon(0 0,100% 0,100% 100%,50% 74%,0 100%)}

.L-bottom .win,.L-top .win,.L-breather .win{flex:1 1 0;min-height:0}
.txt{flex:none;padding:42px 72px 44px}
.txt .kicker{margin-bottom:12px}
.txt .h{font-size:74px}
.txt .body{margin-top:18px;font-size:36px;line-height:1.5}
.L-top .txt{padding-top:48px}

.L-split .stage,.L-side .stage{padding:0;flex-direction:row}
.L-split .col{flex:1 1 0;min-width:0;padding:76px 44px 52px 72px;display:flex;flex-direction:column}
.L-split .win{flex:none;width:452px}
.L-split .kicker{margin-bottom:18px}
.L-split .body{flex:none;font-size:34px;line-height:1.5;margin-top:28px}

.L-inset .stage{padding:0}
.L-inset .win{flex:1 1 0;min-height:0;margin:72px 0 0 72px}
.L-inset .txt{padding:34px 72px 40px}
.L-inset .txt .h{font-size:62px}
.L-inset .txt .body{font-size:34px;margin-top:12px}

.L-grid .stage{padding:0}
.gridw{flex:1 1 0;min-height:0;display:grid;gap:12px}
.gridw.n2{grid-template-columns:1fr 1fr}
.gridw.n3{grid-template-columns:1.25fr 1fr;grid-template-rows:1fr 1fr}
.gridw.n3 .win:first-child{grid-row:1/3}
.L-grid .txt .h{font-size:60px}

.rail{flex:none;width:204px;display:flex;justify-content:center;padding-top:76px}
.rail span{writing-mode:vertical-rl;font-family:var(--f-display);font-weight:var(--w-display);font-size:78px;line-height:1.18;letter-spacing:.02em}
.L-side .win{flex:1 1 0;min-width:0}

.L-breather .stage{padding:0}
.L-breather .tag{left:72px;bottom:44px;font-size:34px}

.L-coverA .win{flex:1 1 0;min-height:0}
.L-coverA .ttl{flex:none;position:relative;padding:52px 72px 40px}
.L-coverA .ttl.solo{flex:1 1 0;min-height:0;display:flex;flex-direction:column;padding-top:76px}
.L-coverA .tag{left:72px;top:0;transform:translateY(-50%)}
.L-coverA .kicker{margin-bottom:10px;font-size:36px}
.L-coverB .hdb{flex:none;padding:46px 72px 50px}
.L-coverB .kicker{margin-bottom:14px}
.L-coverB .ww{flex:1 1 0;min-height:0;position:relative;margin-left:72px}
.L-coverB .ww .win{position:absolute;inset:0}
.L-coverB .tag{left:32px;top:0;transform:translateY(-50%)}
.L-coverC .kicker{font-size:38px}
.L-coverC .list{flex:none;margin-top:44px}
.L-coverC .li{display:flex;align-items:center;gap:26px;height:104px;border-top:var(--rule) solid var(--line);font-size:44px;font-weight:700;letter-spacing:-.035em}
.L-coverC .li:first-child{border-top-color:var(--fg)}
.L-coverC .li b{font-family:var(--f-num);font-weight:var(--w-num);font-size:58px;letter-spacing:var(--tr-num);color:var(--accent);min-width:74px}
`;

function strip(ctx, slide, { head = false, cred } = {}) {
  const n = String(ctx.index).padStart(2, "0");
  const total = ctx.total ? `<i> / ${String(ctx.total).padStart(2, "0")}</i>` : "";
  const who = escapeHtml(ctx.channel || ctx.header || "");
  const hand = ctx.handle && ctx.handle !== who ? `<span class="hand">${escapeHtml(ctx.handle)}</span>` : "";
  const credit = cred ?? slide.credit ?? ctx.credit ?? "";
  return `<div class="strip${head ? " head" : ""}"><span>${who}</span>${hand}<span class="cred">${escapeHtml(credit)}</span><span class="folio">${n}${total}</span></div>`;
}

function win(src, position, ctx) {
  const img = src && ctx.mode !== "overlay"
    ? `<img alt="" src="${ctx.fileUrl(src)}" style="object-position:${escapeHtml(position || "center")}">`
    : "";
  return `<div class="win" data-win>${img}</div>`;
}

/** 상자에 맞게 커지는 글. 줄바꿈을 직접 넣었으면 그 줄을 지킨다. */
function fit(text, { max, min, cls = "h", html } = {}) {
  const raw = String(text ?? "");
  const pre = /\n|\\n/.test(raw) ? " data-pre" : "";
  return `<div class="fit ${cls}" data-fit data-max="${max}" data-min="${min}"${pre}><span class="fi">${html ?? rich(raw)}</span></div>`;
}

/** 숫자와 단위를 나눈다. "3,000원" → 3,000 + 원 */
function numHtml(value, unit) {
  const raw = String(value ?? "");
  const m = raw.match(/^([\d.,+\-–~×x%/: ]*\d[\d.,%]*)(.*)$/);
  const digits = m ? m[1] : raw;
  const tail = `${m ? m[2] : ""}${unit ? ` ${unit}` : ""}`.trim();
  return `${escapeHtml(digits)}${tail ? `<span class="unit">${escapeHtml(tail)}</span>` : ""}`;
}

function kick(text, accent) {
  if (!text) return "";
  return `<div class="kicker${accent ? " a" : ""}">${escapeHtml(text)}</div>`;
}

function pairs(list) {
  return (list || []).map((item) => {
    if (typeof item === "string") return { k: item, v: "" };
    return {
      k: item.k || item.title || item.label || item.when || "",
      v: item.v || item.text || item.value || "",
    };
  });
}

function head(slide, { accentKicker = false } = {}) {
  const body = slide.body ? `<div class="body">${rich(slide.body)}</div>` : "";
  return `<div class="hd">${kick(slide.kicker || slide.label, accentKicker)}<div class="h">${rich(slide.title || "")}</div>${body}</div>`;
}

const BUILD = {
  bottom(slide, ctx) {
    return `${win(slide.image, slide.imagePosition, ctx)}
<div class="txt">${kick(slide.kicker || slide.label, true)}<div class="h">${rich(slide.title)}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  top(slide, ctx) {
    return `${strip(ctx, slide, { head: true })}
<div class="txt">${kick(slide.kicker || slide.label, true)}<div class="h">${rich(slide.title)}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${win(slide.image, slide.imagePosition, ctx)}`;
  },
  split(slide, ctx) {
    return `<div class="stage"><div class="col">${kick(slide.kicker || slide.label, true)}<div class="grow">${fit(String(slide.title || "").replace(/\\n|\n/g, " "), { max: 112, min: 50 })}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${win(slide.image, slide.imagePosition, ctx)}</div>${strip(ctx, slide)}`;
  },
  inset(slide, ctx) {
    return `<div class="stage">${win(slide.image, slide.imagePosition, ctx)}<div class="txt">${kick(slide.kicker || slide.label, true)}<div class="h">${rich(slide.title)}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div></div>${strip(ctx, slide)}`;
  },
  grid(slide, ctx) {
    const imgs = (slide.images || []).slice(0, 3);
    const cls = imgs.length >= 3 ? "n3" : "n2";
    return `<div class="stage"><div class="gridw ${cls}">${imgs.map((src) => win(src, "center", ctx)).join("")}</div><div class="txt">${kick(slide.kicker || slide.label, true)}<div class="h">${rich(slide.title)}</div></div></div>${strip(ctx, slide)}`;
  },
  side(slide, ctx) {
    return `<div class="stage"><div class="rail"><span>${rich(slide.title)}</span></div>${win(slide.image, slide.imagePosition, ctx)}</div>${strip(ctx, slide)}`;
  },
  breather(slide, ctx) {
    const label = slide.kicker || slide.label || slide.title || "";
    return `<div class="stage">${win(slide.image, slide.imagePosition, ctx)}${label ? `<div class="tag">${escapeHtml(label)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  statement(slide, ctx) {
    return `<div class="stage">${kick(slide.kicker || slide.label)}<div class="grow end">${fit(slide.title, { max: 330, min: 76 })}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  hanji(slide, ctx) {
    return `<div class="stage">${kick(slide.kicker || slide.label, true)}<div class="grow">${fit(slide.title, { max: 250, min: 68 })}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  stat(slide, ctx) {
    return `<div class="stage">${kick(slide.kicker || slide.label)}<div class="grow mid">${fit("", { max: 640, min: 150, cls: "num", html: numHtml(slide.stat, slide.unit) })}</div><div class="h">${rich(slide.title)}</div>${slide.body ? `<div class="body">${rich(slide.body)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  steps(slide, ctx) {
    const steps = pairs(slide.steps).concat(slide.steps ? [] : pairs(slide.items)).slice(0, 6);
    const rows = steps
      .map((step, i) => `<div class="row"><div class="n">${i + 1}</div><div><div class="tk">${rich(step.k)}</div>${step.v ? `<div class="tv">${rich(step.v)}</div>` : ""}</div></div>`)
      .join("");
    return `<div class="stage">${head(slide)}<div class="rows" data-n="${steps.length}">${rows}</div></div>${strip(ctx, slide)}`;
  },
  checklist(slide, ctx) {
    const items = pairs(slide.items || slide.tips).slice(0, 6);
    const rows = items.map((item) => `<div class="row"><span class="cb"></span><span class="ci">${rich(item.k)}</span></div>`).join("");
    return `<div class="stage">${head(slide, { accentKicker: true })}<div class="rows" data-n="${items.length}">${rows}</div></div>${strip(ctx, slide)}`;
  },
  compare(slide, ctx) {
    const cols = (slide.columns || []).slice(0, 2);
    const html = cols
      .map((col, i) => {
        const points = (col.points || []).slice(0, 4).map((p) => `<li>${rich(p)}</li>`).join("");
        return `<div class="pan${i === 1 ? " b" : ""}" data-n="${(col.points || []).slice(0, 4).length}"><div class="pt">${escapeHtml(col.title || "")}</div><ul>${points}</ul></div>`;
      })
      .join("");
    return `<div class="stage">${head(slide)}<div class="pans">${html}</div></div>${strip(ctx, slide)}`;
  },
  timeline(slide, ctx) {
    const events = (slide.events || []).slice(0, 6);
    const rows = events
      .map((ev, i) => {
        const when = String(ev.when || ev.k || "");
        const ko = /[가-힣]/.test(when) ? " ko" : "";
        return `<div class="row${i === events.length - 1 ? " now" : ""}"><div class="when${ko}">${escapeHtml(when)}</div><div class="what">${rich(ev.text || ev.v || "")}</div></div>`;
      })
      .join("");
    return `<div class="stage">${head(slide)}<div class="rows" data-n="${events.length}">${rows}</div></div>${strip(ctx, slide)}`;
  },
  chart(slide, ctx) {
    const bars = (slide.bars || []).slice(0, 6);
    const values = bars.map((b) => Number(b.value) || 0);
    const max = Math.max(...values, 1);
    const top = values.indexOf(Math.max(...values));
    const rows = bars
      .map((bar, i) => {
        const frac = (Number(bar.value) || 0) / max;
        const shown = `${bar.value}${bar.unit || slide.unit || ""}`;
        return `<div class="br${i === top ? " max" : ""}"><div class="lab">${escapeHtml(bar.label)}</div><div class="ln"><div class="bar" style="width:calc((100% - 190px)*${frac.toFixed(4)})"></div><div class="val">${numHtml(shown)}</div></div></div>`;
      })
      .join("");
    return `<div class="stage">${head(slide)}<div class="bars" data-n="${bars.length}">${rows}</div></div>${strip(ctx, slide)}`;
  },
  pullquote(slide, ctx) {
    return `<div class="stage"><div class="qm">“</div><div class="grow mid">${fit(slide.title, { max: 150, min: 62 })}</div>${slide.by || slide.kicker ? `<div class="by">${escapeHtml(slide.by || slide.kicker)}</div>` : ""}</div>${strip(ctx, slide)}`;
  },
  info(slide, ctx) {
    const facts = (slide.facts || []).slice(0, 6);
    const rows = facts
      .map((fact) => `<div class="row"><div class="k">${escapeHtml(fact.label)}</div><div class="v">${rich(fact.value)}</div></div>`)
      .join("");
    const titled = { ...slide, title: slide.title || "정보" };
    return `<div class="stage">${head(titled, { accentKicker: true })}<div class="rows" data-n="${facts.length}">${rows}</div></div>${strip(ctx, slide)}`;
  },
  tips(slide, ctx) {
    const tips = pairs(slide.tips).slice(0, 5);
    const price = slide.price
      ? `<div class="price"><b>${numHtml(slide.price)}</b><span>${escapeHtml(slide.priceNote || "")}</span></div>`
      : "";
    const header = price
      ? `${kick(slide.kicker || slide.label)}${price}`
      : head({ ...slide, title: slide.title || "저장해 두세요", body: "" });
    const rows = tips
      .map((tip) => `<div class="row"><div><div class="tk">${rich(tip.k)}</div>${tip.v ? `<div class="tv">${rich(tip.v)}</div>` : ""}</div></div>`)
      .join("");
    const cta = slide.cta === false
      ? ""
      : `<div class="cta"><span>${escapeHtml(slide.cta || "저장해 두고 나중에 봐요")}</span><i class="bm"></i></div>`;
    return `<div class="stage">${header}<div class="rows" data-n="${Math.max(tips.length, 3)}">${rows}</div>${cta}</div>${strip(ctx, slide)}`;
  },
};

const COVERS = {
  A(slide, ctx) {
    const meta = [slide.metaLeft, slide.metaRight].filter(Boolean).join(" · ");
    const kicker = kick(slide.kick || slide.kicker, true);
    if (!slide.image) {
      return `<div class="ttl solo">${kick(slide.chip)}<div class="grow end">${kicker}${fit(slide.title, { max: 300, min: 96 })}</div></div>${strip(ctx, slide, { cred: meta })}`;
    }
    return `${win(slide.image, slide.imagePosition, ctx)}
<div class="ttl">${slide.chip ? `<div class="tag">${escapeHtml(slide.chip)}</div>` : ""}${kicker}${fit(slide.title, { max: 230, min: 92 }).replace("data-fit", 'data-fit data-maxh="560"')}</div>${strip(ctx, slide, { cred: meta })}`;
  },
  B(slide, ctx) {
    const meta = [slide.metaLeft, slide.metaRight].filter(Boolean).join(" · ");
    const tag = slide.tag || slide.chip || "";
    return `${strip(ctx, slide, { head: true, cred: meta })}
<div class="hdb">${kick(slide.kick || slide.kicker, true)}${fit(slide.title, { max: 150, min: 64 }).replace("data-fit", 'data-fit data-maxh="420"')}</div>
<div class="ww">${win(slide.image, slide.imagePosition, ctx)}${tag ? `<div class="tag">${escapeHtml(tag)}</div>` : ""}</div>`;
  },
  C(slide, ctx) {
    const meta = [slide.metaLeft, slide.metaRight].filter(Boolean).join(" · ");
    const items = (slide.items || []).slice(0, 3).map((item, i) => `<div class="li"><b>${i + 1}</b><span>${rich(item)}</span></div>`).join("");
    return `<div class="stage">${kick(slide.kick || slide.kicker)}<div class="grow end">${fit(slide.title, { max: 280, min: 96 })}</div>${items ? `<div class="list">${items}</div>` : ""}</div>${strip(ctx, slide, { cred: meta })}`;
  },
};

export function buildLayout(layout, slide, ctx) {
  if (layout === "cover") {
    const cover = COVERS[ctx.cover] ? ctx.cover : "A";
    const usable = cover === "B" && !slide.image ? "A" : cover;
    return { cls: `L-cover${usable}`, inner: COVERS[usable](slide, ctx) };
  }
  const build = BUILD[layout] || BUILD.statement;
  return { cls: `L-${BUILD[layout] ? layout : "statement"}`, inner: build(slide, ctx) };
}
