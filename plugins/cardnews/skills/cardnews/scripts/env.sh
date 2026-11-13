#!/usr/bin/env bash
# 다른 스크립트가 맨 위에서 불러 쓴다: . "$(dirname "$0")/env.sh"
# 윈도우(Git Bash)에서 winget이나 이 스킬이 방금 깐 프로그램이 지금 창에서도 보이게 PATH 앞에 붙인다.
# 맥·리눅스에서는 ~/.local/bin 만 더한다.

cardnews_add_path() {
  local d="$1"
  [ -n "$d" ] && [ -d "$d" ] || return 0
  case ":$PATH:" in *":$d:"*) ;; *) PATH="$d:$PATH" ;; esac
}

cardnews_is_windows() {
  case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) return 0 ;; *) return 1 ;; esac
}

cardnews_add_path "$HOME/.local/bin"

if cardnews_is_windows; then
  if command -v cygpath >/dev/null 2>&1; then
    _la="$(cygpath -u "${LOCALAPPDATA:-$USERPROFILE/AppData/Local}" 2>/dev/null)"
    _pf="$(cygpath -u "${ProgramFiles:-C:\\Program Files}" 2>/dev/null)"
  else
    _la="$HOME/AppData/Local"
    _pf="/c/Program Files"
  fi
  cardnews_add_path "$_pf/nodejs"
  cardnews_add_path "$_la/Microsoft/WinGet/Links"
  # winget의 Gyan.FFmpeg는 Packages 아래 ffmpeg-*/bin 에 풀린다.
  for _b in "$_la"/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin; do
    cardnews_add_path "$_b"
  done
  unset _la _pf _b
fi
export PATH
