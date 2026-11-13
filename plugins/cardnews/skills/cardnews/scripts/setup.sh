#!/usr/bin/env bash
# 없는 것만 설치한다. 이미 있으면 건너뛴다.
# 맥은 Homebrew. 윈도우(Git Bash)는 winget. 리눅스는 apt가 비밀번호 없이 될 때만 ffmpeg를 넣고, 아니면 명령만 알려 준다.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
. "$ROOT/scripts/env.sh"
FAIL=0

say() { printf '%s\n' "$*"; }

have() {
  command -v "$1" >/dev/null 2>&1 && return 0
  [ -x "$HOME/.local/bin/$1" ] && return 0
  [ -x "$HOME/.local/bin/$1.exe" ] && return 0
  return 1
}
WIN=0
cardnews_is_windows && WIN=1
# 윈도우: winget으로 넣고, 이 창에서도 보이게 PATH를 다시 맞춘다.
winget_install() {
  local id="$1"
  if ! have winget; then
    say "  없음  winget — Microsoft Store에서 '앱 설치 관리자(App Installer)'를 설치한 뒤 다시 실행해요"
    return 1
  fi
  say "  설치  winget install $id (관리자 확인 창이 뜨면 '예')"
  winget install -e --id "$id" --silent --accept-source-agreements --accept-package-agreements || return 1
  . "$ROOT/scripts/env.sh"
  hash -r
  return 0
}
bin_of() {
  if command -v "$1" >/dev/null 2>&1; then
    command -v "$1"
  else
    printf '%s\n' "$HOME/.local/bin/$1"
  fi
}

OS="$(uname -s)"
say "카드뉴스 준비 ($(uname -s))"
say "폴더: $ROOT"
say ""

if have node; then
  ver="$(node -p "process.versions.node")"
  major="${ver%%.*}"
  if [ "$major" -ge 20 ]; then
    say "  있음  node $ver"
  else
    say "  오래됨  node $ver — 20 이상이 필요해요"
    FAIL=1
  fi
else
  if [ "$OS" = "Darwin" ] && have brew; then
    say "  설치  node (brew install node)"
    brew install node || FAIL=1
  elif [ "$WIN" -eq 1 ]; then
    if winget_install OpenJS.NodeJS.LTS && have node; then
      say "  됨    node $(node -p "process.versions.node")"
    else
      say "  없음  node — https://nodejs.org 에서 LTS를 설치한 뒤 Claude Code를 다시 켜고 실행해요"
      FAIL=1
    fi
  else
    say "  없음  node — https://nodejs.org 에서 20 이상을 설치한 뒤 다시 실행해요"
    FAIL=1
  fi
fi

install_formula() {
  local bin="$1"
  local formula="$2"
  local why="$3"
  if have "$bin"; then
    local line
    line="$("$bin" --version 2>&1 | head -n 1)"
    say "  있음  $bin — $line"
    return 0
  fi
  if [ "$OS" = "Darwin" ] && have brew; then
    say "  설치  brew install $formula"
    if brew install "$formula"; then
      say "  됨    $bin"
      return 0
    fi
    say "  실패  brew install $formula"
    FAIL=1
    return 1
  fi
  if [ "$WIN" -eq 1 ] && [ -n "${4:-}" ]; then
    if winget_install "$4" && have "$bin"; then
      say "  됨    $bin"
      return 0
    fi
  fi
  if [ "$OS" = "Linux" ] && have sudo && sudo -n true 2>/dev/null && have apt-get; then
    say "  설치  sudo apt-get install -y $formula"
    if sudo apt-get update -qq && sudo apt-get install -y "$formula"; then
      say "  됨    $bin"
      return 0
    fi
  fi
  say "  없음  $bin — $why"
  FAIL=1
  return 1
}

install_formula ffmpeg ffmpeg "맥: brew install ffmpeg / 윈도우: winget install Gyan.FFmpeg" Gyan.FFmpeg
if have ffmpeg && ! have ffprobe; then
  say "  없음  ffprobe — ffmpeg와 같이 와요. brew install ffmpeg 를 다시 실행해요"
  FAIL=1
elif have ffprobe; then
  say "  있음  ffprobe"
fi

if ! have yt-dlp && [ "$OS" = "Darwin" ] && have brew; then
  say "  설치  brew install yt-dlp"
  brew install yt-dlp || true
fi
if have yt-dlp; then
  say "  있음  yt-dlp — $("$(bin_of yt-dlp)" --version 2>/dev/null | head -n 1)"
else
  mkdir -p "$HOME/.local/bin"
  ytname="yt-dlp"
  [ "$WIN" -eq 1 ] && ytname="yt-dlp.exe"
  say "  설치  yt-dlp → ~/.local/bin/$ytname"
  if curl -fsSL -o "$HOME/.local/bin/$ytname" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$ytname"; then
    chmod +x "$HOME/.local/bin/$ytname"
    say "  됨    yt-dlp — $("$HOME/.local/bin/$ytname" --version 2>/dev/null | head -n 1)"
    say "  안내  ~/.local/bin 을 PATH에 넣으면 다음 터미널에서도 yt-dlp가 보여요"
  else
    say "  없음  yt-dlp — 맥: brew install yt-dlp"
    FAIL=1
  fi
fi

FONT_DIR="$ROOT/assets/fonts"
mkdir -p "$FONT_DIR"
fetch_font() {
  local file="$1"
  local url="$2"
  if [ -s "$FONT_DIR/$file" ]; then
    return 0
  fi
  say "  받기  $file"
  if curl -fL --retry 3 -o "$FONT_DIR/$file" "$url"; then
    return 0
  fi
  say "  실패  $file"
  FAIL=1
  return 1
}
need_font=0
for f in Pretendard-Light.woff2 Pretendard-Regular.woff2 Pretendard-Medium.woff2 Pretendard-SemiBold.woff2 Pretendard-Bold.woff2 Pretendard-ExtraBold.woff2 Pretendard-Black.woff2 noto-serif-kr-korean-700-normal.woff2; do
  if [ ! -s "$FONT_DIR/$f" ]; then need_font=1; fi
done
if [ "$need_font" -eq 0 ]; then
  say "  있음  Pretendard, Noto Serif KR (커버 B)"
else
  base="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2"
  for w in Light Regular Medium SemiBold Bold ExtraBold Black; do
    fetch_font "Pretendard-${w}.woff2" "$base/Pretendard-${w}.woff2"
  done
  fetch_font "noto-serif-kr-korean-700-normal.woff2" \
    "https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-kr@5.2.8/files/noto-serif-kr-korean-700-normal.woff2"
  if [ ! -s "$FONT_DIR/OFL-Pretendard.txt" ]; then
    fetch_font "OFL-Pretendard.txt" "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/LICENSE" || true
  fi
  say "  됨    글꼴은 스킬 폴더에 있어요. 렌더는 이 파일을 써요."
fi

if [ -d "$ROOT/node_modules/playwright" ]; then
  say "  있음  playwright 패키지"
else
  if have npm; then
    say "  설치  npm install (playwright)"
    npm install || FAIL=1
  else
    say "  없음  npm"
    FAIL=1
  fi
fi

if [ -d "$ROOT/node_modules/playwright" ] && have node; then
  if (cd "$ROOT" && node --input-type=module -e "import { chromium } from 'playwright'; const b = await chromium.launch(); await b.close();") >/dev/null 2>&1; then
    say "  있음  헤드리스 Chromium"
  else
    say "  설치  npx playwright install chromium"
    if (cd "$ROOT" && npx playwright install chromium); then
      say "  됨    헤드리스 Chromium"
    else
      say "  실패  Chromium. 리눅스면 안내되는 시스템 라이브러리도 필요할 수 있어요: npx playwright install-deps chromium"
      FAIL=1
    fi
  fi
fi

say ""
if [ "$FAIL" -ne 0 ]; then
  say "아직 비어 있는 항목이 있어요. 위 안내를 처리한 뒤 이 스크립트를 다시 실행해요."
  exit 1
fi
say "준비됐어요. 한 번 더 실행해도 이미 있는 것은 건너뛰어요."
exit 0
