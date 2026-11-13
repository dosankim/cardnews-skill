#!/usr/bin/env bash
# extract-frames.sh 와 같다. 얼굴 검사용.
#   inspect-frames.sh 영상.mp4 출력폴더 [간격초=0.5] [시작초] [길이초]
exec "$(cd "$(dirname "$0")" && pwd)/extract-frames.sh" "$@"
