# 제작

처음에는 `bash scripts/setup.sh`. 없는 것만 설치한다.

## 사진과 영상

전시·공간은 이 순서다. 뉴스·제품은 공식 글과 공식 이미지로 같은 규칙을 줄여 쓴다.

1. 공식 페이지에서 기간, 장소, 시간, 휴관, 요금을 확인한다. 미확인은 기획서에만 둔다.
2. 기관 유튜브나 홈페이지 영상에서 티저, 전경, 투어, 타임랩스를 찾는다.
3. `fetch-media.sh section`으로 그 구간만 받는다. `extract-frames.sh`로 0.25–0.5초마다 프레임을 뽑고 얼굴을 뺀다. 박힌 자막은 `cut-clip.sh`의 zoom 0.84, cropy 0.15로 숨긴다.
4. 공식 영상이 없으면 보도 사진에 느린 카메라. `영상메모.txt`가 생긴다.
5. 장마다 `credit` 한 줄. 아래 띠에 들어간다. 게시 전 홍보팀 허락을 권한다.

클립 규격: H.264, yuv420p, 1080×1350, `setsar=1`, 30fps, 7–9초, 무음. `cut-clip.sh`와 렌더가 ffprobe로 SAR 1:1을 본다.

## 슬라이드 영상

ffmpeg. H.264, yuv420p, 1080×1350, `setsar=1`, 30fps, 7–9초, 무음. 렌더가 ffprobe로 크기와 SAR 1:1을 확인한다.

사진 칸이 하나인 장은 그 칸 크기로 사진 영상을 만들어 칸 자리에 깔고, 칸만 비운 카드 PNG를 위에 얹는다. 그래서 사진만 움직이고 글과 바탕은 그대로다. 사진 칸이 없거나 둘 이상인 장은 정지 클립이다.

## 릴스

1080×1920, 약 20–30초, H.264, yuv420p, 30fps. HyperFrames(`hyperframes@0.9.41`, Apache-2.0)가 굽는다. 렌더가 임시 폴더에 `index.html`, 글꼴, 사진, GSAP을 모으고 `hyperframes render --strict`를 부른다. 맥 M 시리즈에서 25초 영상이 20초 안쪽에 나온다.

- node 22 이상이 필요하다. 없으면 카드를 세로 화면에 이어 붙인 릴스로 넘어간다(`--ffmpeg-reel`과 같다).
- 브라우저는 Playwright가 받아 둔 헤드리스 셸을 같이 쓴다. 없으면 HyperFrames가 자기 것을 `~/.cache/hyperframes`에 받는다(약 200MB).
- 사용 통계 전송은 끄고 부른다(`HYPERFRAMES_NO_TELEMETRY=1`).
- 큰 글자 크기는 글꼴이 읽힌 뒤에야 잴 수 있어서, 굽기 전에 한 번 열어 재고 그 값을 HTML에 적어 넣는다.
- `--keep-reel`을 주면 결과 폴더의 `reel-src/`에 프로젝트가 남는다. 그 폴더에서 `npx hyperframes preview`로 열어 보고 `index.html`을 고친 뒤 `npx hyperframes render . -o ../reel.mp4`로 다시 구울 수 있다.

`episode.json`의 `reel.beats`:

```json
{ "slide": 1, "seconds": 3.2, "lines": ["첫째 줄", "둘째 줄"] }
```

| 키 | 뜻 |
|---|---|
| `slide` | 1부터. 그 장의 판형, 사진, 면을 가져온다 |
| `seconds` | 장면 길이. 2.4–4초 |
| `lines` | 화면에 크게 나올 글. 두 줄, 길어도 세 줄. 한 줄은 열 글자 안쪽. `{{단어}}` 가능 |
| `count`, `countUnit` | 굴러 올라올 숫자와 단위. 주면 숫자 장면이 된다 |
| `type` | `photo` `title` `stat` `list` `outro` 중 하나로 고정 |
| `kicker`, `body`, `surface` | 그 장면에서만 바꿀 때 |

비트를 비우면 앞의 여덟 장으로 만든다. 첫 장면은 처음부터 글이 보인다. 릴스 표지로 그대로 쓸 수 있게 하려는 것이다. 마지막 장면은 2초 넘게 둔다.

음악은 기본 없음. 사용자가 파일을 주면 `--audio 파일`이고, 박자가 분명하면 장면 길이를 가까운 박에 맞춘다. 나레이션 음성은 `--narration-audio 파일` 또는 `--tts`. 둘 다 주면 나레이션이 앞이고 음악은 작게 섞인다.

## episode.json

경로는 `episode.json`이 있는 폴더 기준이다.

```json
{
  "title": "경복궁",
  "place": "서울",
  "kind": "space",
  "look": "hanji",
  "cover": "A",
  "channel": "공간노트",
  "handle": "@your_channel",
  "outputDir": ".",
  "slides": [],
  "reel": { "beats": [] }
}
```

`look`은 `press` `swiss` `hanji` `night` `pop`. `accent`에 `#RRGGBB`를 주면 포인트색만 바뀐다. `channel`과 `handle`은 아래 띠에 들어간다.

완성본은 슬라이드 10장이다. 시안은 `--allow-short`.

## 검수

렌더는 장마다 화면을 재고 문제를 `! 03장: …`으로 찍는다.

| 메시지 | 고치는 법 |
|---|---|
| 제목이 길어서 가장 작은 크기로도 넘쳐요 | 줄을 나누거나 문장을 줄인다 |
| 칸이 넘쳐요 / 글이 화면 밖으로 나가요 | 항목을 줄이거나 문장을 줄인다 |
| 글자가 너무 작아요 | 항목 수를 줄인다 |
| 화면의 N%가 비어 있어요 | 본문을 더하거나, 재료가 맞는 다른 판형으로 바꾼다 |
| 사진 칸이 너무 작아요 | 그 장의 글을 줄인다 |

예시 한 편: 저장소 `examples/01.경복궁_서울/`.

## 의존성

node 20+(릴스 모션은 22+), ffmpeg, ffprobe, Playwright Chromium, HyperFrames, GSAP. yt-dlp는 영상을 받을 때만. edge-tts는 `--tts`일 때만.

`bash scripts/setup.sh` 후 `bash scripts/check-deps.sh`.
