# 제작

처음에는 `bash scripts/setup.sh`. 없는 것만 설치한다.

## 사진과 영상

전시·공간은 이 순서다. 뉴스·제품은 공식 글과 공식 이미지로 같은 규칙을 줄여 쓴다.

1. 공식 페이지에서 기간, 장소, 시간, 휴관, 요금을 확인한다. 미확인은 기획서에만 둔다.
2. 기관 유튜브나 홈페이지 영상에서 티저, 전경, 투어, 타임랩스를 찾는다.
3. `fetch-media.sh section`으로 그 구간만 받는다. `extract-frames.sh`로 0.25–0.5초마다 프레임을 뽑고 얼굴을 뺀다. 박힌 자막은 `cut-clip.sh`의 zoom 0.84, cropy 0.15로 숨긴다.
4. 공식 영상이 없으면 보도 사진에 느린 카메라. `영상메모.txt`가 생긴다.
5. 장마다 오른쪽 아래 `credit`. 게시 전 홍보팀 허락을 권한다.

클립 규격: H.264, yuv420p, 1080×1350, `setsar=1`, 30fps, 7–9초, 무음. `cut-clip.sh`와 렌더가 ffprobe로 SAR 1:1을 본다.

## 슬라이드 영상

ffmpeg. H.264, yuv420p, 1080×1350, `setsar=1`, 30fps, 7–9초, 무음. 렌더가 ffprobe로 크기와 SAR 1:1을 확인한다. 글자 PNG는 영상 위에 고정되고, 사진만 움직인다.

## 릴스

1080×1920, 약 20–30초, H.264, yuv420p, SAR 1:1. 하드 컷. 각 비트 안에서 줌 또는 팬. 자막은 왼쪽 아래, 인스타 버튼과 하단 UI를 피한다.

`episode.json`의 `reel.beats`:

```json
{ "slide": 1, "seconds": 3.2, "motion": "zoom-in", "lines": ["첫째 줄", "둘째 줄"] }
```

`slide`는 1부터. `lines`는 두 줄까지. 비트를 비우면 제목으로 8개 안쪽을 만든다.

음악은 기본 없음. 사용자가 파일을 주면 `--audio 파일`. 나레이션 음성은 `--narration-audio 파일` 또는 `--tts`. 둘 다 주면 나레이션이 앞이고 음악은 작게 섞인다.

## episode.json

경로는 `episode.json`이 있는 폴더 기준이다.

```json
{
  "title": "경복궁",
  "place": "서울",
  "kind": "space",
  "cover": "A",
  "header": "GYEONGBOKGUNG — SEOUL",
  "channel": "공간노트",
  "handle": "@your_channel",
  "outputDir": ".",
  "slides": [],
  "reel": { "beats": [] }
}
```

완성본은 슬라이드 10장이다. 시안은 `--allow-short`.

예시 한 편: 저장소 `examples/01.경복궁_서울/`.

## 의존성

node 20+, ffmpeg, ffprobe, Playwright Chromium. yt-dlp는 영상을 받을 때만. edge-tts는 `--tts`일 때만.

`bash scripts/setup.sh` 후 `bash scripts/check-deps.sh`.
