#!/usr/bin/env node
/**
 * 다음 표지(A/B/C)와 다음 룩을 알려 주고 기억한다. 같은 모양이 연달아 나오지 않게 돌린다.
 *   node scripts/next-theme.mjs               다음 표지. 출력하고 넘긴다
 *   node scripts/next-theme.mjs --peek        보기만
 *   node scripts/next-theme.mjs --set B       표지를 정한다
 *   node scripts/next-theme.mjs --look howto  그 갈래의 다음 룩. 출력하고 넘긴다
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listThemes } from "./lib/html.mjs";
import { normalizeKind } from "./lib/layouts.mjs";
import { LOOKS_BY_KIND } from "./lib/looks.mjs";

const file = path.join(os.homedir(), ".cardnews", "state.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { next: 0 };
const peek = process.argv.includes("--peek");
const save = () => {
  if (!peek) fs.writeFileSync(file, JSON.stringify(state, null, 2));
};

const lookAt = process.argv.indexOf("--look");
if (lookAt !== -1) {
  const kind = normalizeKind(process.argv[lookAt + 1]);
  const list = LOOKS_BY_KIND[kind] || ["press"];
  state.looks = state.looks || {};
  const at = Number(state.looks[kind]) || 0;
  console.log(list[at % list.length]);
  state.looks[kind] = (at + 1) % list.length;
  save();
  process.exit(0);
}

const themes = listThemes();
let next = Number(state.next) || 0;
const setAt = process.argv.indexOf("--set");
if (setAt !== -1) {
  const index = themes.indexOf(String(process.argv[setAt + 1] || "").toUpperCase());
  if (index === -1) {
    console.error(`cover must be one of ${themes.join(", ")}`);
    process.exit(1);
  }
  next = index;
}
console.log(themes[next % themes.length]);
state.next = (next + 1) % themes.length;
save();
