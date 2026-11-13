#!/usr/bin/env node
/**
 * Print the next cover theme and remember it.
 *   node scripts/next-theme.mjs          # print and advance
 *   node scripts/next-theme.mjs --peek   # print only
 *   node scripts/next-theme.mjs --set paper
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listThemes } from "./lib/html.mjs";

const themes = listThemes();
const file = path.join(os.homedir(), ".cardnews", "state.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { next: 0 };
let next = Number(state.next) || 0;

const setAt = process.argv.indexOf("--set");
if (setAt !== -1) {
  const name = process.argv[setAt + 1];
  const index = themes.indexOf(name);
  if (index === -1) {
    console.error(`theme must be one of ${themes.join(", ")}`);
    process.exit(1);
  }
  next = index;
}

const theme = themes[next % themes.length];
console.log(theme);
if (!process.argv.includes("--peek")) {
  state.next = (next + 1) % themes.length;
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
