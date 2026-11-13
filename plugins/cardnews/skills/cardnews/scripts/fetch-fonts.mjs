#!/usr/bin/env node
/**
 * 없는 글꼴만 받는다. 모두 OFL-1.1. 저장소에는 이미 들어 있어서 보통은 아무것도 받지 않는다.
 *   node scripts/fetch-fonts.mjs          없는 것 받기
 *   node scripts/fetch-fonts.mjs --check  있는지만 보기
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fontFiles } from "./lib/looks.mjs";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "fonts");
const CDN = "https://cdn.jsdelivr.net/npm";
const PACKAGES = {
  "noto-serif-kr": "5.3.1",
  "gowun-batang": "5.3.0",
  "black-han-sans": "5.3.0",
  "instrument-serif": "5.3.0",
  anton: "5.3.0",
  "big-shoulders-display": "5.3.0",
  "ibm-plex-mono": "5.3.0",
};

function urlFor(file) {
  if (file.startsWith("Pretendard-")) return `${CDN}/pretendard@1.3.9/dist/web/static/woff2/${file}`;
  const name = Object.keys(PACKAGES).find((pkg) => file.startsWith(`${pkg}-`));
  if (!name) return "";
  return `${CDN}/@fontsource/${name}@${PACKAGES[name]}/files/${file}`;
}

const check = process.argv.includes("--check");
fs.mkdirSync(DIR, { recursive: true });
let failed = 0;
let fetched = 0;
for (const { file } of fontFiles()) {
  const dest = path.join(DIR, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
  if (check) {
    console.log(`  없음  ${file}`);
    failed += 1;
    continue;
  }
  const url = urlFor(file);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`  받음  ${file}`);
    fetched += 1;
  } catch (error) {
    console.log(`  실패  ${file} (${error.message})`);
    failed += 1;
  }
}
if (!failed && !fetched) console.log(`  있음  글꼴 ${fontFiles().length}개 (Pretendard, Noto Serif KR, 고운바탕, 검은고딕, 숫자용 라틴 4종)`);
if (!failed && fetched) console.log("  됨    글꼴은 스킬 폴더에 있어요. 렌더는 이 파일을 써요.");
process.exit(failed ? 1 : 0);
