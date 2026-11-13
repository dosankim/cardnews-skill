/**
 * Layout library. Tokens stay the same (jade, ink, Pretendard, 64px, grain).
 * Each name is a different composition.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rich(text, mode) {
  const parts = String(text ?? "").split(/(\{\{[\s\S]*?\}\})/g);
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

export function needsPhoto(layout) {
  return ["bottom", "top", "split", "inset", "grid", "side", "breather", "cover"].includes(layout);
}

export function isComposed(layout) {
  return !["bottom", "breather", "cover"].includes(layout);
}

function linesOf(slide, key) {
  const value = slide[key];
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? { k: item, v: "" } : item));
  }
  return [];
}

export function applyLayouts(episode) {
  const seq = SEQUENCES[normalizeKind(episode.kind)] || SEQUENCES.news;
  const locked = episode.slides.map((slide) => Boolean(slide.layout));
  episode.slides.forEach((slide, i) => {
    if (slide.role === "cover") {
      slide.layout = "cover";
      return;
    }
    if (!slide.layout) {
      const pick = seq[i] && seq[i] !== "cover" ? seq[i] : "bottom";
      slide.layout = pick;
    }
  });
  for (let i = 1; i < episode.slides.length; i += 1) {
    if (locked[i]) continue;
    if (episode.slides[i].layout !== episode.slides[i - 1].layout) continue;
    const opposite = density(episode.slides[i - 1].layout) === "dense" ? "airy" : "dense";
    const alt = LAYOUTS.find(
      (name) => name !== "cover" && name !== episode.slides[i].layout && density(name) === opposite,
    );
    if (alt) episode.slides[i].layout = alt;
  }
  return episode;
}

const INK = "#0b0c0f";
const JADE = "#8FE8D6";
const DEEP = "#0f7f6e";
const HANJI = "#efe9dd";
const HANJI_INK = "#16181c";

function chrome(ctx) {
  const n = String(ctx.index).padStart(2, "0");
  const of = ctx.total ? `${n} / ${String(ctx.total).padStart(2, "0")}` : n;
  return `<div class="top"><span>${escapeHtml(ctx.header || "")}</span><span class="idx">${of}</span></div>`;
}

function credit(slide, ctx) {
  const text = slide.credit || ctx.credit || "";
  if (!text) return "";
  return `<div class="credit">${escapeHtml(text)}</div>`;
}

export function layoutCss(name) {
  const shared = `.rule{width:52px;height:4px;background:${JADE};margin-bottom:22px}
.kicker{font-weight:600;font-size:23px;color:${JADE};letter-spacing:.08em;margin-bottom:16px}
.title{font-weight:800;font-size:54px;line-height:1.24;letter-spacing:-.025em}
.body{font-weight:400;font-size:28.5px;line-height:1.62;color:rgba(255,255,255,.86)}`;
  if (name === "top") {
    return `${shared}
.band{position:absolute;left:0;right:0;top:0;height:46%;background:${INK};padding:140px 64px 0}
.photo{position:absolute;left:0;right:0;bottom:0;height:54%;object-fit:cover;width:100%}`;
  }
  if (name === "split") {
    return `${shared}
.panel{position:absolute;left:0;top:0;bottom:0;width:50%;background:${INK};padding:150px 48px 80px 64px}
.panel .top{left:28px;right:20px;font-size:16px}
.panel .idx{white-space:nowrap}
.photo{position:absolute;right:0;top:0;bottom:0;width:50%;object-fit:cover;height:100%}`;
  }
  if (name === "inset") {
    return `${shared}
.field{position:absolute;inset:0;background:${HANJI}}
.frame{position:absolute;left:64px;right:64px;top:220px;height:760px;background:${INK} center/cover no-repeat}
.cap{position:absolute;left:64px;right:64px;bottom:90px;color:${HANJI_INK}}
.cap .kicker{color:${DEEP}}
.cap .title{font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:42px;color:${HANJI_INK}}
.cap .body{color:rgba(22,24,28,.78);font-size:26px}
.top{color:rgba(22,24,28,.72)}
.top .idx{color:${DEEP}}
.credit{color:rgba(22,24,28,.55)}`;
  }
  if (name === "statement") {
    return `${shared}
.mid{position:absolute;left:64px;right:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.mid .title{font-weight:900;font-size:78px;line-height:1.18;letter-spacing:-.04em}
.mid .body{margin-top:28px;font-size:30px}`;
  }
  if (name === "stat") {
    return `${shared}
.mid{position:absolute;left:64px;right:64px;top:180px}
.num{font-weight:900;font-size:220px;line-height:.9;letter-spacing:-.06em}
.unit{font-weight:700;font-size:40px;color:${JADE};margin-top:8px}
.mid .title{margin-top:36px}
.mid .body{margin-top:18px}`;
  }
  if (name === "grid") {
    return `.g{position:absolute;left:0;right:0;top:108px;bottom:110px;display:grid;gap:10px;padding:0 28px;background:${INK}}
.g.n2{grid-template-columns:1fr 1fr}
.g.n3{grid-template-columns:1.2fr 1fr;grid-template-rows:1fr 1fr}
.g img{width:100%;height:100%;object-fit:cover}
.g.n3 img:first-child{grid-row:1/3}
.cap{position:absolute;left:0;right:0;bottom:0;height:110px;display:flex;align-items:center;padding:0 36px;padding-right:300px;font-weight:700;font-size:32px;background:${INK}}
.credit{bottom:40px;max-width:280px;text-align:right}`;
  }
  if (name === "steps") {
    return `${shared}
.list{position:absolute;left:64px;right:64px;top:168px}
.step{display:grid;grid-template-columns:84px 1fr;gap:18px;padding:18px 0;border-top:1px solid rgba(255,255,255,.18)}
.n{font-weight:900;font-size:40px;color:${JADE}}
.tk{font-weight:800;font-size:32px;line-height:1.3}
.tv{font-weight:400;font-size:24px;color:rgba(255,255,255,.78);margin-top:6px}`;
  }
  if (name === "checklist") {
    return `${shared}
.list{position:absolute;left:64px;right:64px;top:200px}
.item{display:flex;gap:18px;align-items:flex-start;padding:16px 0;border-top:1px solid rgba(255,255,255,.18);font-weight:700;font-size:32px;line-height:1.35}
.box{width:28px;height:28px;margin-top:6px;border:3px solid ${JADE};flex:none}`;
  }
  if (name === "compare") {
    return `${shared}
.cols{position:absolute;left:40px;right:40px;top:300px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.col{padding:36px 28px;background:#1c1f26;min-height:720px}
.col.b{background:${JADE};color:${INK}}
.col h3{font-size:28px;font-weight:800;margin-bottom:18px}
.col li{font-size:26px;line-height:1.4;font-weight:500;margin:0 0 14px;list-style:none}
.col.b h3,.col.b li{color:${INK}}`;
  }
  if (name === "timeline") {
    return `${shared}
.list{position:absolute;left:64px;right:64px;top:190px}
.ev{display:grid;grid-template-columns:200px 1fr;gap:20px;padding:22px 0;border-top:1px solid rgba(255,255,255,.2)}
.when{font-weight:800;font-size:28px;color:${JADE}}
.what{font-weight:500;font-size:28px;line-height:1.4}`;
  }
  if (name === "chart") {
    return `${shared}
.bars{position:absolute;left:64px;right:64px;top:400px}
.row{display:grid;grid-template-columns:160px 1fr 64px;gap:14px;align-items:center;margin:0 0 22px}
.lab{font-weight:700;font-size:24px}
.track{height:44px;background:rgba(255,255,255,.12)}
.fill{height:100%;background:${JADE}}
.val{font-weight:800;font-size:22px;text-align:right}`;
  }
  if (name === "pullquote") {
    return `.field{position:absolute;inset:0;background:${HANJI}}
.q{position:absolute;left:72px;right:72px;top:220px;color:${HANJI_INK};font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:64px;line-height:1.35;letter-spacing:-.03em}
.q em{font-style:normal;color:${DEEP}}
.by{position:absolute;left:72px;bottom:120px;color:${HANJI_INK};font-weight:600;font-size:24px}
.mark{position:absolute;left:72px;top:140px;font-family:'Noto Serif CJK KR',serif;font-size:120px;line-height:1;color:${DEEP}}
.top{color:rgba(22,24,28,.72)}
.top .idx{color:${DEEP}}
.credit{color:rgba(22,24,28,.55)}`;
  }
  if (name === "side") {
    return `.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rail{position:absolute;left:0;top:0;bottom:0;width:150px;background:rgba(11,12,15,.82);display:flex;align-items:center;justify-content:center}
.rail span{writing-mode:vertical-rl;font-weight:800;font-size:36px;letter-spacing:.12em;line-height:1.3}`;
  }
  if (name === "breather") {
    return `.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.tag{position:absolute;left:64px;bottom:72px;font-weight:600;font-size:22px;letter-spacing:.14em;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.5)}`;
  }
  if (name === "hanji") {
    return `.field{position:absolute;inset:0;background:${HANJI}}
.inner{position:absolute;left:72px;right:72px;top:180px;color:${HANJI_INK}}
.kicker{font-weight:600;font-size:22px;color:${DEEP};letter-spacing:.12em;margin-bottom:20px}
.title{font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:68px;line-height:1.25;letter-spacing:-.03em}
.body{margin-top:28px;font-size:30px;line-height:1.6;font-weight:400}
.top{color:rgba(22,24,28,.72)}
.top .idx{color:${DEEP}}
.credit{color:rgba(22,24,28,.55)}`;
  }
  return shared;
}

export function layoutInner(name, slide, ctx) {
  const title = rich(slide.title || "", name === "pullquote" || name === "hanji" || name === "inset" ? "em" : "plain");
  const body = rich(slide.body || "", "plain");
  const kicker = escapeHtml(slide.kicker || slide.label || "");
  if (name === "top") {
    return `<div class="band">${chrome(ctx)}<div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div>
<img class="photo" alt="" src="${slide.image ? ctx.fileUrl(slide.image) : ""}" style="object-position:${escapeHtml(slide.imagePosition || "center")}">${credit(slide, ctx)}`;
  }
  if (name === "split") {
    return `<div class="panel">${chrome(ctx)}<div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div>
<img class="photo" alt="" src="${slide.image ? ctx.fileUrl(slide.image) : ""}" style="object-position:${escapeHtml(slide.imagePosition || "center")}">${credit(slide, ctx)}`;
  }
  if (name === "inset") {
    const src = slide.image ? ctx.fileUrl(slide.image) : "";
    return `<div class="field"></div>${chrome(ctx)}<div class="frame" style="background-image:url('${src}')"></div>
<div class="cap"><div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div>${credit(slide, ctx)}`;
  }
  if (name === "statement") {
    return `<div class="mid">${chrome(ctx)}<div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div>${credit(slide, ctx)}`;
  }
  if (name === "stat") {
    return `<div class="mid">${chrome(ctx)}<div class="kicker">${kicker}</div><div class="num">${escapeHtml(slide.stat || "")}</div><div class="unit">${escapeHtml(slide.unit || "")}</div><div class="title">${title}</div><div class="body">${body}</div></div>${credit(slide, ctx)}`;
  }
  if (name === "grid") {
    const imgs = (slide.images || []).slice(0, 3);
    const cls = imgs.length >= 3 ? "n3" : "n2";
    const tags = imgs.map((src) => `<img alt="" src="${ctx.fileUrl(src)}">`).join("");
    return `${chrome(ctx)}<div class="g ${cls}">${tags}</div><div class="cap">${title}</div>${credit(slide, ctx)}`;
  }
  if (name === "steps") {
    const steps = linesOf(slide, "steps").concat(linesOf(slide, "items"));
    const rows = steps
      .slice(0, 5)
      .map((step, i) => {
        const k = step.k || step.title || step;
        const v = step.v || step.text || "";
        return `<div class="step"><div class="n">${String(i + 1).padStart(2, "0")}</div><div><div class="tk">${escapeHtml(k)}</div>${v ? `<div class="tv">${escapeHtml(v)}</div>` : ""}</div></div>`;
      })
      .join("");
    return `${chrome(ctx)}<div class="list"><div class="kicker">${kicker}</div><div class="title" style="margin-bottom:24px">${title}</div>${rows}</div>${credit(slide, ctx)}`;
  }
  if (name === "checklist") {
    const items = (slide.items || slide.tips || []).slice(0, 6);
    const rows = items
      .map((item) => {
        const text = typeof item === "string" ? item : item.k || item.title || item.label || "";
        return `<div class="item"><span class="box"></span><span>${escapeHtml(text)}</span></div>`;
      })
      .join("");
    return `${chrome(ctx)}<div class="list"><div class="kicker">${kicker}</div><div class="title" style="margin-bottom:20px">${title}</div>${rows}</div>${credit(slide, ctx)}`;
  }
  if (name === "compare") {
    const cols = (slide.columns || []).slice(0, 2);
    const html = cols
      .map((col, i) => {
        const points = (col.points || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("");
        return `<div class="col ${i === 1 ? "b" : ""}"><h3>${escapeHtml(col.title || "")}</h3><ul>${points}</ul></div>`;
      })
      .join("");
    return `${chrome(ctx)}<div style="position:absolute;left:64px;top:140px" class="kicker">${kicker}</div><div class="title" style="position:absolute;left:64px;right:64px;top:168px">${title}</div><div class="cols" style="top:280px">${html}</div>${credit(slide, ctx)}`;
  }
  if (name === "timeline") {
    const events = slide.events || [];
    const rows = events
      .slice(0, 5)
      .map(
        (ev) =>
          `<div class="ev"><div class="when">${escapeHtml(ev.when || ev.k || "")}</div><div class="what">${escapeHtml(ev.text || ev.v || "")}</div></div>`,
      )
      .join("");
    return `${chrome(ctx)}<div class="list"><div class="kicker">${kicker}</div><div class="title" style="margin-bottom:20px">${title}</div>${rows}</div>${credit(slide, ctx)}`;
  }
  if (name === "chart") {
    const bars = slide.bars || [];
    const max = Math.max(...bars.map((b) => Number(b.value) || 0), 1);
    const rows = bars
      .slice(0, 6)
      .map((bar) => {
        const pct = Math.round(((Number(bar.value) || 0) / max) * 100);
        return `<div class="row"><div class="lab">${escapeHtml(bar.label)}</div><div class="track"><div class="fill" style="width:${pct}%"></div></div><div class="val">${escapeHtml(String(bar.value))}</div></div>`;
      })
      .join("");
    return `${chrome(ctx)}<div style="position:absolute;left:64px;top:140px"><div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div><div class="bars">${rows}</div>${credit(slide, ctx)}`;
  }
  if (name === "pullquote") {
    return `<div class="field"></div><div class="mark">“</div><div class="q">${title}</div><div class="by">${escapeHtml(slide.by || slide.kicker || "")}</div>${chrome(ctx)}${credit(slide, ctx)}`;
  }
  if (name === "side") {
    return `<img class="photo" alt="" src="${slide.image ? ctx.fileUrl(slide.image) : ""}" style="object-position:${escapeHtml(slide.imagePosition || "center")}"><div class="rail"><span>${escapeHtml(slide.title || "")}</span></div>${chrome(ctx)}${credit(slide, ctx)}`;
  }
  if (name === "breather") {
    return `<img class="photo" alt="" src="${slide.image ? ctx.fileUrl(slide.image) : ""}" style="object-position:${escapeHtml(slide.imagePosition || "center")}">${chrome(ctx)}<div class="tag">${kicker}</div>${credit(slide, ctx)}`;
  }
  if (name === "hanji") {
    return `<div class="field"></div>${chrome(ctx)}<div class="inner"><div class="kicker">${kicker}</div><div class="title">${title}</div><div class="body">${body}</div></div>${credit(slide, ctx)}`;
  }
  return "";
}
