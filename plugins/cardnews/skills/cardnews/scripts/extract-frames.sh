#!/usr/bin/env bash
# 얼굴 검수용 프레임과 컨택트 시트.
#   extract-frames.sh 영상.mp4 출력폴더 [간격초] [시작초] [길이초]
# 간격 기본 0.5초. 0.25도 된다. 사람 얼굴(작가·관람객)이 보이면 그 구간은 버린다.
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd)/env.sh"
src="$(cardnews_to_unix "${1:-}")"
out="$(cardnews_to_unix "${2:-}")"
every="${3:-0.5}"
start="${4:-0}"
dur="${5:-}"
if [ -z "$src" ] || [ -z "$out" ]; then
  echo "usage: extract-frames.sh video.mp4 out-dir [interval-seconds] [start] [duration]"
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg가 없어요. bash scripts/setup.sh"
  exit 1
fi
mkdir -p "$out/frames"
rm -f "$out/frames/"*.jpg
args=(-y -ss "$start")
if [ -n "$dur" ]; then args+=(-t "$dur"); fi
# fps=1/0.5 → 2fps, fps=1/0.25 → 4fps
ffmpeg "${args[@]}" -i "$src" -vf "fps=1/$every,scale=480:-2" -q:v 4 "$out/frames/frame-%04d.jpg"
count="$(find "$out/frames" -name 'frame-*.jpg' | wc -l | tr -d ' ')"
if [ "$count" -eq 0 ]; then
  echo "프레임이 없어요."
  exit 1
fi
# 컨택트 시트. 열이 많으면 10열.
cols=10
if [ "$count" -lt 10 ]; then cols="$count"; fi
ffmpeg -y -framerate 1 -i "$out/frames/frame-%04d.jpg" \
  -vf "scale=240:300:force_original_aspect_ratio=increase,crop=240:300,tile=${cols}x$(( (count + cols - 1) / cols ))" \
  -frames:v 1 -q:v 3 "$out/contact.jpg" 2>/dev/null || \
ffmpeg -y -framerate 1 -i "$out/frames/frame-%04d.jpg" \
  -filter_complex "scale=240:300:force_original_aspect_ratio=increase,crop=240:300,tile=${cols}x$(( (count + cols - 1) / cols ))" \
  -frames:v 1 -q:v 3 "$out/contact.jpg"
echo "프레임 ${count}장 (${every}초 간격) → $out/frames"
echo "시트 → $out/contact.jpg"
echo "사람 얼굴이 보이면 그 구간은 쓰지 않아요. 작품 속 인형은 얼굴이 아니에요."
