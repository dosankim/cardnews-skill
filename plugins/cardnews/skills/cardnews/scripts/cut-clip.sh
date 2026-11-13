#!/usr/bin/env bash
# 공식 영상을 카드 한 장 길이로 자른다.
#   cut-clip.sh 입력.mp4 출력.mp4 시작초 길이초 [cropx] [zoomy] [zoom]
# 길이초는 7–9.
# cropx, zoomy 는 0~1. zoom 이 1보다 작으면 확대라서, 화면에 박힌 자막을 자를 때 쓴다.
# 예: 아래 자막을 숨기려면 zoom 0.84, zoomy 0.15
# 결과: H.264, yuv420p, 1080x1350, setsar=1, 무음. ffprobe로 SAR 1:1을 확인한다.
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/env.sh"
in="${1:-}"
out="${2:-}"
start="${3:-}"
dur="${4:-8}"
cx="${5:-0.5}"
cy="${6:-0.5}"
zoom="${7:-1}"
if [ -z "$in" ] || [ -z "$out" ] || [ -z "$start" ]; then
  echo "usage: cut-clip.sh input.mp4 output.mp4 start-seconds [duration 7-9] [cropx] [cropy] [zoom]"
  exit 1
fi
awk -v d="$dur" 'BEGIN{ if (d+0 < 7 || d+0 > 9) exit 1 }' || {
  echo "길이는 7–9초예요. 받은 값: $dur"
  exit 1
}
mkdir -p "$(dirname "$out")"
# 4:5 크롭 후 1080x1350. zoom<1 이면 더 타이트하게.
vf="crop=trunc(ih*${zoom}*4/5/2)*2:trunc(ih*${zoom}/2)*2:(iw-trunc(ih*${zoom}*4/5/2)*2)*${cx}:(ih-trunc(ih*${zoom}/2)*2)*${cy},scale=1080:1350:flags=lanczos,fps=30,setsar=1,format=yuv420p"
ffmpeg -y -ss "$start" -i "$in" -t "$dur" -vf "$vf" -an \
  -c:v libx264 -preset fast -crf 19 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "$out"
codec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$out")"
pix="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$out")"
wh="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$out")"
sar="$(ffprobe -v error -select_streams v:0 -show_entries stream=sample_aspect_ratio -of csv=p=0 "$out")"
echo "probe ${codec} ${wh} ${pix} SAR ${sar:-1:1}"
if [ "$codec" = "h264" ] && [ "$wh" = "1080,1350" ] && [ "$pix" = "yuv420p" ] && { [ "$sar" = "1:1" ] || [ -z "$sar" ] || [ "$sar" = "N/A" ]; }; then
  echo "됨 $out"
else
  echo "규격이 달라요"
  exit 1
fi
