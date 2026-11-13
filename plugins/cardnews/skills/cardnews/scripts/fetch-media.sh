#!/usr/bin/env bash
# 공식 이미지, 또는 필요한 구간만 고화질로 받는다.
#   fetch-media.sh image  URL  out.jpg
#   fetch-media.sh video  URL  out.mp4
#   fetch-media.sh section URL out.mp4 시작초 끝초
set -euo pipefail
kind="${1:-}"
url="${2:-}"
out="${3:-}"
start="${4:-}"
end="${5:-}"
if [ -z "$kind" ] || [ -z "$url" ] || [ -z "$out" ]; then
  echo "usage: fetch-media.sh image|video|section URL outfile [start end]"
  exit 1
fi
mkdir -p "$(dirname "$out")"
case "$kind" in
  image)
    curl -fL --retry 3 -A "cardnews-skill/0.1" -o "$out" "$url"
    ;;
  video|section)
    if ! command -v yt-dlp >/dev/null 2>&1; then
      echo "yt-dlp가 없어요. bash scripts/setup.sh"
      exit 1
    fi
    # 필요한 높이만. 2160까지 받고, 없으면 그 아래.
    fmt="bv*[height<=2160][ext=mp4]/bv*[height<=2160]/bv*[height<=1080]/b"
    if [ "$kind" = "section" ]; then
      if [ -z "$start" ] || [ -z "$end" ]; then
        echo "section 은 시작초와 끝초가 필요해요"
        exit 1
      fi
      yt-dlp -f "$fmt" --download-sections "*${start}-${end}" -o "$out" "$url"
    else
      yt-dlp -f "$fmt" -o "$out" "$url"
    fi
    ;;
  *)
    echo "kind 는 image, video, section 중 하나예요"
    exit 1
    ;;
esac
echo "저장 $out"
