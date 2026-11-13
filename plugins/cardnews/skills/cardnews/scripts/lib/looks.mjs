/**
 * 룩. 색, 글꼴, 선 굵기를 한 벌로 묶는다. 판형은 이 값만 읽는다.
 *
 * 한 룩에 면이 셋 있다.
 *   base   대부분의 장
 *   alt    뒤집은 면. 한 편에 한두 장
 *   field  포인트색이 바탕이 되는 면. 한 편에 한 장
 *
 * 포인트색은 한 장에 한 가지 일만 한다. 숫자거나, 강조 단어거나, 버튼이거나.
 */

const FONT_FILES = [
  ["P", 300, "Pretendard-Light.woff2"],
  ["P", 400, "Pretendard-Regular.woff2"],
  ["P", 500, "Pretendard-Medium.woff2"],
  ["P", 600, "Pretendard-SemiBold.woff2"],
  ["P", 700, "Pretendard-Bold.woff2"],
  ["P", 800, "Pretendard-ExtraBold.woff2"],
  ["P", 900, "Pretendard-Black.woff2"],
  ["NS", 700, "noto-serif-kr-korean-700-normal.woff2"],
  ["NS", 900, "noto-serif-kr-korean-900-normal.woff2"],
  ["GB", 700, "gowun-batang-korean-700-normal.woff2"],
  ["BH", 400, "black-han-sans-korean-400-normal.woff2"],
  ["IS", 400, "instrument-serif-latin-400-normal.woff2"],
  ["AN", 400, "anton-latin-400-normal.woff2"],
  ["BS", 900, "big-shoulders-display-latin-900-normal.woff2"],
  ["PM", 500, "ibm-plex-mono-latin-500-normal.woff2"],
];

export function fontFiles() {
  return FONT_FILES.map(([family, weight, file]) => ({ family, weight, file }));
}

export const LOOKS = {
  press: {
    label: "신문",
    fits: "뉴스, 해설, 이야기",
    display: { family: "NS,P,serif", weight: 900, tracking: "-0.04em", leading: 1.16 },
    num: { family: "IS,NS,serif", weight: 400, tracking: "-0.03em" },
    rule: 2,
    surfaces: {
      base: { bg: "#F2EFE8", fg: "#17150F", accent: "#D23B1C", onAccent: "#FFF7EE", panel: "#E5E0D4" },
      alt: { bg: "#17150F", fg: "#F2EFE8", accent: "#FF6B47", onAccent: "#17150F", panel: "#2A2720" },
      field: { bg: "#D23B1C", fg: "#FFF7EE", accent: "#17150F", onAccent: "#FFF7EE", panel: "#BC3115" },
    },
  },
  swiss: {
    label: "포스터",
    fits: "방법, 목록, 비교, 데이터",
    display: { family: "P,sans-serif", weight: 900, tracking: "-0.05em", leading: 1.06 },
    num: { family: "AN,P,sans-serif", weight: 400, tracking: "-0.01em" },
    rule: 4,
    surfaces: {
      base: { bg: "#F1F1EE", fg: "#0D0D0D", accent: "#0A47FF", onAccent: "#FFFFFF", panel: "#E2E2DD" },
      alt: { bg: "#0D0D0D", fg: "#F1F1EE", accent: "#4D79FF", onAccent: "#0D0D0D", panel: "#232323" },
      field: { bg: "#0A47FF", fg: "#FFFFFF", accent: "#0D0D0D", onAccent: "#FFFFFF", panel: "#0638D6" },
    },
  },
  hanji: {
    label: "한지",
    fits: "공간, 전시, 문화, 산문",
    display: { family: "GB,NS,serif", weight: 700, tracking: "-0.035em", leading: 1.24 },
    num: { family: "IS,GB,serif", weight: 400, tracking: "-0.03em" },
    rule: 1.5,
    surfaces: {
      base: { bg: "#EFE9DD", fg: "#1B1A17", accent: "#0F6B5C", onAccent: "#F6F1E6", panel: "#E2DACA" },
      alt: { bg: "#1D2623", fg: "#EFE9DD", accent: "#8FD9C4", onAccent: "#1D2623", panel: "#2B3733" },
      field: { bg: "#0F6B5C", fg: "#F6F1E6", accent: "#12201C", onAccent: "#F6F1E6", panel: "#0B5A4D" },
    },
  },
  night: {
    label: "야간",
    fits: "기술, 제품, 밤의 공간",
    display: { family: "P,sans-serif", weight: 800, tracking: "-0.045em", leading: 1.1 },
    num: { family: "BS,P,sans-serif", weight: 900, tracking: "-0.01em" },
    rule: 2,
    surfaces: {
      base: { bg: "#0B0B0C", fg: "#F2F0EA", accent: "#8FE8D6", onAccent: "#0B0B0C", panel: "#1D1D20" },
      alt: { bg: "#F2F0EA", fg: "#0B0B0C", accent: "#0F7F6E", onAccent: "#F2F0EA", panel: "#E2DFD6" },
      field: { bg: "#8FE8D6", fg: "#0B0B0C", accent: "#0B0B0C", onAccent: "#8FE8D6", panel: "#79D8C4" },
    },
  },
  pop: {
    label: "원색",
    fits: "가벼운 목록, 유행, 생활",
    display: { family: "BH,P,sans-serif", weight: 400, tracking: "-0.015em", leading: 1.12 },
    num: { family: "AN,BH,sans-serif", weight: 400, tracking: "0" },
    rule: 5,
    surfaces: {
      base: { bg: "#FFDB2E", fg: "#111111", accent: "#111111", onAccent: "#FFDB2E", panel: "#F2CB12" },
      alt: { bg: "#111111", fg: "#FFDB2E", accent: "#FFFFFF", onAccent: "#111111", panel: "#262626" },
      field: { bg: "#FBF8EF", fg: "#111111", accent: "#F0431C", onAccent: "#FFFFFF", panel: "#ECE7D8" },
    },
  },
};

export const LOOK_NAMES = Object.keys(LOOKS);

/** 갈래마다 어울리는 룩 순서. 편마다 하나씩 돌아간다. */
export const LOOKS_BY_KIND = {
  news: ["press", "swiss", "night"],
  howto: ["swiss", "pop", "press"],
  list: ["pop", "swiss", "press"],
  comparison: ["swiss", "press", "night"],
  story: ["press", "hanji", "night"],
  data: ["swiss", "night", "press"],
  place: ["hanji", "press", "night"],
};

export function lookName(episode) {
  const asked = String(episode?.look || "").toLowerCase();
  if (LOOKS[asked]) return asked;
  return null;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** episode.accent 가 있으면 base·alt 의 포인트색만 바꾼다. field 는 그 색이 바탕이 된다. */
export function resolveLook(name, accent) {
  const look = LOOKS[name] || LOOKS.press;
  if (!accent || !HEX.test(accent)) return look;
  const dark = luminance(accent) < 0.4;
  const on = dark ? "#FFFFFF" : "#0D0D0D";
  return {
    ...look,
    surfaces: {
      base: { ...look.surfaces.base, accent, onAccent: on },
      alt: { ...look.surfaces.alt, accent: dark ? lighten(accent, 0.38) : accent, onAccent: look.surfaces.alt.bg },
      field: { ...look.surfaces.field, bg: accent, fg: on, accent: on === "#FFFFFF" ? "#0D0D0D" : "#FFFFFF", onAccent: accent, panel: lighten(accent, dark ? 0.1 : -0.1) },
    },
  };
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function lighten(hex, amount) {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const out = rgb(hex).map((v) => Math.round(v + (target - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 면 하나를 CSS 변수로. */
export function surfaceVars(look, surface) {
  const s = look.surfaces[surface] || look.surfaces.base;
  return [
    `--bg:${s.bg}`,
    `--fg:${s.fg}`,
    `--accent:${s.accent}`,
    `--on-accent:${s.onAccent}`,
    `--panel:${s.panel}`,
    `--soft:color-mix(in srgb,${s.fg} 84%,${s.bg})`,
    `--muted:color-mix(in srgb,${s.fg} 60%,${s.bg})`,
    `--line:color-mix(in srgb,${s.fg} 20%,${s.bg})`,
    `--f-display:${look.display.family}`,
    `--w-display:${look.display.weight}`,
    `--tr-display:${look.display.tracking}`,
    `--lh-display:${look.display.leading}`,
    `--f-num:${look.num.family}`,
    `--w-num:${look.num.weight}`,
    `--tr-num:${look.num.tracking}`,
    `--rule:${look.rule}px`,
  ].join(";");
}
