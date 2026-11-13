---
name: cardnews
description: >
  사람이 고른 주제 하나로 한국어 인스타그램 카드뉴스 10장(1080×1350), 캡션, X 글, 나레이션 대본, 9:16 릴스를 만든다.
  뉴스, 방법, 목록, 비교, 이야기, 데이터, 공간 어디든 된다. 판형을 번갈아 쓴다.
  Use when the user asks for Instagram card news, 카드뉴스, a carousel, 릴스, or a Korean social post about one chosen topic.
---

# 카드뉴스

사람이 주제를 고르면, 그 주제 하나만 인스타 카드뉴스 한 편으로 만든다. 분야를 가리지 않는다. 뉴스를 시간마다 자동으로 찾아 올리지 않는다. 글자는 HTML/CSS로 그리고 헤드리스 크로미움으로 렌더한다. 생성형 이미지로 글자를 그리지 않는다.

색과 글자는 같다. 배경 `#0b0c0f`, 글자 흰색, 포인트 제이드 `#8FE8D6`, 한지 `#efe9dd`. 표지는 A / B / C. 2–10장은 판형을 바꾼다. 바로 앞 장과 같은 판형을 쓰지 않고, 10장에 5종 이상, 빽빽한 장과 한산한 장을 번갈아 둔다. 슬라이드 `layout`이 기본 순서보다 우선한다. [references/design.md](references/design.md).

## 1. 먼저 설치를 확인한다

편을 만들기 전에, 스킬 폴더에서 한 번 실행한다. 이미 있는 도구는 건너뛴다.

맥·리눅스·Git Bash:

```bash
bash scripts/setup.sh
```

윈도우 PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

이게 node, ffmpeg, ffprobe, yt-dlp, Playwright Chromium, Pretendard, 커버 B용 Noto Serif KR을 확인한다. 맥은 Homebrew, 윈도우는 winget(없으면 Chocolatey)으로 없는 것만 넣는다. 글꼴은 스킬 안의 woff2가 없으면 받는다. `C:\...` 경로는 Git Bash 스크립트가 `/c/...`로 바꿔 쓴다. 렌더(`node scripts/render-episode.mjs`)는 경로를 인자로만 넘기고, 릴스를 이을 때 드라이브 문자를 이스케이프한다.

## 2. 채널이 비어 있으면 묻는다

한 번에 하나씩만.

1. 카드에 넣을 채널 이름과 인스타그램 핸들
2. 주로 다룰 분야. 없어도 된다.
3. 피하고 싶은 분위기
4. 결과 폴더
5. 이번 편 주제. 없으면 여기서 멈추고 주제를 받는다. 전시 편은 아래 1번에서 지금 열린 전시를 골라 제안할 수 있다. 사람이 고르기 전에는 만들지 않는다.

답은 `~/.cardnews/config.json`에 저장한다. 핸들이 없으면 `@your_channel`로 두고 그 사실을 적는다.

## 3. 자료를 찾는 순서

한 편은 한 주제다. `kind`는 `news`, `howto`, `list`, `comparison`, `story`, `data`, `place` 중 하나. 구조는 [references/structures.md](references/structures.md).

그림이 없어도 된다. 문장, 숫자, 순서, 체크, 비교, 연표, 차트, 인용, 한지 판형은 사진 없이 그린다. 차트의 숫자는 확인된 값이거나, 제안이면 카드와 기획서에 제안이라고 적는다.

### 자료

1. 사람이 준 주제만 다룬다. 날짜, 숫자, 요금, 인용은 1차 자료에서 확인한다. 기관 페이지, 논문, 제품 문서, 공개 데이터. 확인하지 못한 것은 `기획서.md`에만 적고 카드에는 사실처럼 쓰지 않는다.
2. 그림은 이 순서로 찾는다. 공식 미디어 키트, 사람이 준 사진, CC·위키미디어·Unsplash, 공식 영상의 한 구간, 그래도 없으면 글자 판형.
3. 영상이 있으면 얼굴과 박힌 자막을 빼고 7–9초만 자른다.
   - 받기: `bash scripts/fetch-media.sh section "URL" src/clip.mp4 시작초 끝초`
   - 프레임: `bash scripts/extract-frames.sh src/clip.mp4 build/frames 0.5`
   - 자르기: `bash scripts/cut-clip.sh src/clip.mp4 card.mp4 시작초 8 0.5 0.15 0.84`
   - H.264, yuv420p, 1080×1350, `setsar=1`, 무음. 스크립트가 SAR 1:1을 확인한다.
4. 공식 영상이 없고 사진이 있으면, `video`를 비운다. 렌더가 느린 카메라 무브를 넣고 `영상메모.txt`에 적는다. 글자 판형은 완성된 카드를 그대로 클립으로 쓴다.
5. 오른쪽 아래에 출처 한 줄 (`credit`). 기관 자료를 쓰면 올리기 전에 허락을 받으라고 말한다. 올리거나 예약하지는 않는다.

공간 편만 더한다. 지금 열린 전시 중 이야기가 되는 것을 제안할 수 있다. 기간, 시간, 휴관, 요금은 그 기관 페이지에서 확인한다. 사람이 고르기 전에는 만들지 않는다.

## 4. 만들고 눈으로 확인한다

표지는 `node scripts/next-theme.mjs`로 A → B → C. 사람이 고르면 그걸로 한다. 문구에 `{{단어}}`를 넣으면 그 단어만 제이드(또는 커버 B의 녹청)로 올라간다.

```bash
node scripts/render-episode.mjs /절대경로/episode.json
```

`contact_sheet.png`와 PNG를 직접 본다. 글자가 사진을 가리면 문장을 줄이거나 `imagePosition`을 고치고 다시 그린다.

릴스는 Remotion이다. `reel.preset`은 `editorial`(마스크, 크로스페이드), `kinetic`(단어가 나오고 제이드 상자가 그려짐), `push`(장면이 밀림), `tally`(숫자 카운트, 와이프) 중 하나. 없으면 갈래로 고른다. 비트에 `count`를 주면 그 숫자까지 올라간다. 음악은 `--audio`, 나레이션과 같이 주면 음악이 작아진다. Remotion이 없으면 ffmpeg 릴스로 넘긴다.

## 결과물

- `01_cover.png` / `01_cover.mp4` 처럼 번호_이름. 10장. 1080×1350. 클립은 7–9초(기본 8초), 무음
- `reel.mp4` — 1080×1920, 약 20–30초, 같은 제이드 오버레이, 음악 없음
- `contact_sheet.png`
- `기획서.md` `게시글문구.txt` `X글.txt` `나레이션대본.txt`
- 스틸로 움직임을 만든 장이 있으면 `영상메모.txt`

## 명령

스킬 폴더에서 실행한다. `~/.claude/skills/cardnews`로 복사해도 이 폴더가 기준이다.

| 명령 | 하는 일 |
|---|---|
| `bash scripts/setup.sh` | 없는 도구·글꼴만 설치 |
| `bash scripts/fetch-media.sh section URL out.mp4 시작 끝` | 공식 영상 구간 |
| `bash scripts/extract-frames.sh 영상 폴더 0.5` | 0.5초마다 프레임과 시트 |
| `bash scripts/cut-clip.sh 입력 출력 시작 8` | 7–9초 카드 클립, SAR 확인 |
| `node scripts/render-episode.mjs episode.json` | 글자 오버레이, 스틸, Remotion 릴스 |
| `node scripts/render-episode.mjs episode.json --ffmpeg-reel` | 릴스만 ffmpeg로 |
| `node scripts/render-episode.mjs episode.json --reel-only` | 있는 스틸로 릴스만 다시 |
| `node scripts/render-episode.mjs episode.json --preview-themes --stills-only` | 표지 A B C |
| `node scripts/render-episode.mjs episode.json --audio 파일` | 사용자가 준 음악만 |
| `node scripts/render-episode.mjs episode.json --tts` | 나레이션. 기본은 꺼져 있음 |
| `node scripts/next-theme.mjs` | 다음 표지 A/B/C |

`--tts`는 `edge-tts`가 있을 때만이다. 없으면 이유를 말하고 소리 없는 영상으로 넘기지 않는다.

자세한 규격은 [references/pipeline.md](references/pipeline.md). 문장 규칙은 [references/copy.md](references/copy.md).

## 하지 않는 것

- 확인하지 않은 숫자, 날짜, 요금, 링크를 카드에 단정하지 않는다.
- 얼굴이 보이는 컷, 출처가 불명확한 사진을 쓰지 않는다.
- 밝은 흰 플래시, 라임, 주황 플래시 전환을 쓰지 않는다.
- 인스타에 올리거나 예약하지 않는다.
