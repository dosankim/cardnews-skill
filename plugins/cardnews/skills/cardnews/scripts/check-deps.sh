#!/usr/bin/env bash
# Report whether this machine can render card news.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
. "$ROOT/scripts/env.sh"
ok=0
warn=0

need() {
  local bin="$1"
  local why="$2"
  if command -v "$bin" >/dev/null 2>&1; then
    printf '  ok   %s — %s\n' "$bin" "$("$bin" --version 2>&1 | head -n 1)"
  else
    printf '  missing  %s — %s\n' "$bin" "$why"
    ok=1
  fi
}

echo "카드뉴스 렌더에 필요한 것들"
echo "skill: $ROOT"
echo

if command -v node >/dev/null 2>&1; then
  ver="$(node -p "process.versions.node")"
  major="${ver%%.*}"
  if [ "$major" -ge 20 ]; then
    printf '  ok   node %s\n' "$ver"
  else
    printf '  missing  node %s — 20 이상이 필요해요\n' "$ver"
    ok=1
  fi
else
  printf '  missing  node — bash scripts/setup.sh 를 실행하거나 https://nodejs.org 에서 20 이상을 설치해요\n'
  ok=1
fi

need ffmpeg "영상 자르기, 켄 번스, 릴스"
need ffprobe "해상도와 SAR 1:1 확인"

if command -v yt-dlp >/dev/null 2>&1; then
  printf '  ok   yt-dlp — %s\n' "$(yt-dlp --version 2>/dev/null | head -n 1)"
else
  printf '  warn yt-dlp 없음 — 공식 유튜브 영상을 받을 때만 필요해요. pip 또는 brew로 설치.\n'
  warn=1
fi

if [ -d "$ROOT/node_modules/playwright" ]; then
  printf '  ok   playwright 패키지\n'
else
  printf '  missing  playwright — 스킬 폴더에서 npm install\n'
  ok=1
fi

font="$ROOT/assets/fonts/Pretendard-Regular.woff2"
serif="$ROOT/assets/fonts/noto-serif-kr-korean-700-normal.woff2"
if [ -f "$font" ] && [ -f "$serif" ]; then
  printf '  ok   Pretendard, Noto Serif KR\n'
else
  printf '  missing  글꼴 파일 — assets/fonts 를 확인해요\n'
  ok=1
fi

if [ -d "$ROOT/node_modules/playwright" ]; then
  if (cd "$ROOT" && node --input-type=module -e "import { chromium } from 'playwright'; const b = await chromium.launch(); await b.close();") >/dev/null 2>&1; then
    printf '  ok   chromium 실행\n'
  else
    printf '  missing  chromium — npx playwright install chromium\n'
    ok=1
  fi
fi

echo
if [ "$ok" -ne 0 ]; then
  echo "아직 렌더할 수 없어요. 스킬 폴더에서 bash scripts/setup.sh 를 실행해요."
  exit 1
fi
if [ "$warn" -ne 0 ]; then
  echo "스틸과 릴스는 만들 수 있어요. 공식 영상을 받으려면 yt-dlp를 설치해요."
else
  echo "준비됐어요."
fi
exit 0
