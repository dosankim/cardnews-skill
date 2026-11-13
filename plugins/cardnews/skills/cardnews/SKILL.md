---
name: cardnews
description: >
  사람이 고른 주제 하나로 한국어 인스타그램 카드뉴스 10장(1080×1350), 캡션, X 글, 나레이션 대본, 9:16 릴스를 만든다.
  뉴스, 방법, 목록, 비교, 이야기, 데이터, 공간 어디든 된다. 주제에 맞는 룩(색과 글꼴 한 벌)을 고르고, 판형을 번갈아 쓴다.
  Use when the user asks for Instagram card news, 카드뉴스, a carousel, 릴스, or a Korean social post about one chosen topic.
---

# 카드뉴스

사람이 주제를 고르면, 그 주제 하나만 인스타 카드뉴스 한 편으로 만든다. 분야를 가리지 않는다. 뉴스를 시간마다 자동으로 찾아 올리지 않는다. 카드와 릴스 모두 HTML/CSS로 그린다. 카드는 헤드리스 크로미움으로 찍고, 릴스는 같은 HTML을 HyperFrames로 굽는다. 생성형 이미지로 글자를 그리지 않는다.

디자인은 세 층이다. 자세한 값은 [references/design.md](references/design.md).

- **룩** 색과 글꼴 한 벌. `press`(신문), `swiss`(포스터), `hanji`(한지), `night`(야간), `pop`(원색). 주제를 보고 고른다.
- **표지** A(사진과 큰 제목), B(제목 아래 액자 사진), C(글자와 세 줄 목록).
- **판형** 2–10장의 구성 18가지. 바로 앞 장과 같은 판형을 쓰지 않고, 10장에 5종 이상.

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

node, ffmpeg, ffprobe, yt-dlp, Playwright Chromium, HyperFrames, 글꼴을 확인한다. 맥은 Homebrew, 윈도우는 winget(없으면 Chocolatey)으로 없는 것만 넣는다. 카드와 클립은 node 20, 릴스 모션은 node 22부터 돈다. `C:\...` 경로는 Git Bash 스크립트가 `/c/...`로 바꿔 쓴다.

## 2. 채널이 비어 있으면 묻는다

한 번에 하나씩만.

1. 카드에 넣을 채널 이름과 인스타그램 핸들
2. 주로 다룰 분야. 없어도 된다.
3. 피하고 싶은 분위기
4. 결과 폴더
5. 이번 편 주제. 없으면 여기서 멈추고 주제를 받는다. 전시 편은 아래 3번에서 지금 열린 전시를 골라 제안할 수 있다. 사람이 고르기 전에는 만들지 않는다.

답은 `~/.cardnews/config.json`에 저장한다. 핸들이 없으면 `@your_channel`로 두고 그 사실을 적는다.

## 3. 자료를 찾는 순서

한 편은 한 주제다. `kind`는 `news`, `howto`, `list`, `comparison`, `story`, `data`, `place` 중 하나. 구조는 [references/structures.md](references/structures.md).

그림이 없어도 된다. 문장, 숫자, 순서, 체크, 비교, 연표, 차트, 인용은 사진 없이 그린다. 차트의 숫자는 확인된 값이거나, 제안이면 카드와 기획서에 제안이라고 적는다.

1. 사람이 준 주제만 다룬다. 날짜, 숫자, 요금, 인용은 1차 자료에서 확인한다. 기관 페이지, 논문, 제품 문서, 공개 데이터. 확인하지 못한 것은 `기획서.md`에만 적고 카드에는 사실처럼 쓰지 않는다.
2. 그림은 이 순서로 찾는다. 공식 미디어 키트, 사람이 준 사진, CC·위키미디어·Unsplash, 공식 영상의 한 구간, 그래도 없으면 글자 판형.
3. 영상이 있으면 얼굴과 박힌 자막을 빼고 7–9초만 자른다.
   - 받기: `bash scripts/fetch-media.sh section "URL" src/clip.mp4 시작초 끝초`
   - 프레임: `bash scripts/extract-frames.sh src/clip.mp4 build/frames 0.5`
   - 자르기: `bash scripts/cut-clip.sh src/clip.mp4 card.mp4 시작초 8 0.5 0.15 0.84`
4. 공식 영상이 없고 사진이 있으면 `video`를 비운다. 렌더가 사진 칸 안에서만 느린 카메라 무브를 넣고 `영상메모.txt`에 적는다. 글은 움직이지 않는다.
5. 출처는 장마다 `credit` 한 줄. 아래 띠에 들어간다. 기관 자료를 쓰면 올리기 전에 허락을 받으라고 말한다. 올리거나 예약하지는 않는다.

공간 편만 더한다. 지금 열린 전시 중 이야기가 되는 것을 제안할 수 있다. 기간, 시간, 휴관, 요금은 그 기관 페이지에서 확인한다.

## 4. 디자인을 정한다

글을 쓰기 전에 세 가지를 정해 `기획서.md`에 한 줄씩 적는다.

1. **룩.** 주제의 성격으로 고른다. 사실과 해설은 `press`, 따라 하는 방법과 비교는 `swiss`, 공간과 문화는 `hanji`, 기술과 제품은 `night`, 가벼운 목록은 `pop`. 같은 갈래가 이어지면 `node scripts/next-theme.mjs --look 갈래`가 다음 룩을 준다. 채널 색이 있으면 `accent`에 `#RRGGBB`로 넣는다. 고르기 어려우면 `--preview-looks`로 다섯 룩을 그려 놓고 본다.
2. **표지.** 좋은 사진이 있으면 A나 B, 없으면 C. `node scripts/next-theme.mjs`가 A → B → C로 돌린다.
3. **한 장에 큰 것 하나.** 장마다 가장 크게 보일 것을 하나만 정한다. 제목이거나, 숫자거나, 사진이다. 나머지는 그것을 받친다.

문장은 [references/copy.md](references/copy.md)를 따른다. 제목 줄바꿈은 `\n`으로 직접 넣는다. 큰 제목은 그 줄에 맞춰 화면 폭까지 커진다. 한 줄이 짧을수록 글자가 커진다. `{{단어}}`는 포인트색이 되는데, 한 장에 한 번만 쓴다.

## 5. 만들고 눈으로 확인한다

```bash
node scripts/render-episode.mjs /절대경로/episode.json --stills-only
```

렌더가 장마다 검수한 결과를 `! 03장: …`으로 알려 준다. 글이 넘친다, 글자가 20px보다 작다, 화면이 38% 넘게 비었다, 사진 칸이 너무 작다. 한 줄이라도 나오면 문장을 줄이거나 판형을 바꾸고 다시 그린다. 경고를 남긴 채 넘기지 않는다.

경고가 없어도 `contact_sheet.png`와 PNG를 직접 연다. 한 장씩 이렇게 본다.

1. 작게 봤을 때 눈이 먼저 가는 곳이 그 장의 요점인가.
2. 10장을 나란히 놓았을 때 같은 구조가 연달아 나오는가. 나오면 `layout`이나 `surface`를 바꾼다.
3. 사진에서 잘린 것이 주제인가. 그러면 `imagePosition`을 고친다.
4. 채널 이름을 다른 계정으로 바꿔도 통하는 문장인가. 그러면 다시 쓴다.

고친 뒤 영상까지 굽는다.

```bash
node scripts/render-episode.mjs /절대경로/episode.json
```

릴스는 카드를 붙여 넣지 않고 세로 화면에 맞게 다시 짠다. 사진 장면, 큰 글자, 굴러 올라오는 숫자, 줄 목록, 저장 안내. `reel.beats`에 장과 두 줄 문구를 적는다. 릴스 프레임도 몇 장 뽑아 본다. `--keep-reel`을 주면 `reel-src/`에 HTML이 남고, 거기서 `npx hyperframes preview`로 열어 고칠 수 있다. 음악은 `--audio`, 나레이션과 같이 주면 음악이 작아진다.

## 결과물

- `01_cover.png` / `01_cover.mp4` 처럼 번호_이름. 10장. 1080×1350. 클립은 7–9초(기본 8초), 무음
- `reel.mp4` — 1080×1920, 약 20–30초, 음악 없음
- `contact_sheet.png`
- `기획서.md` `게시글문구.txt` `X글.txt` `나레이션대본.txt`
- 스틸로 움직임을 만든 장이 있으면 `영상메모.txt`

## 명령

스킬 폴더에서 실행한다. `~/.claude/skills/cardnews`로 복사해도 이 폴더가 기준이다.

| 명령 | 하는 일 |
|---|---|
| `bash scripts/setup.sh` | 없는 도구·글꼴만 설치 |
| `node scripts/render-episode.mjs episode.json` | 카드, 클립, 릴스 |
| `… --stills-only` | 카드 PNG와 검수만 |
| `… --look swiss` | 룩을 바꿔 그려 본다 |
| `… --preview-looks` | 표지와 두 장을 다섯 룩으로 |
| `… --preview-themes` | 표지 A B C |
| `… --reel-only` | 있는 카드로 릴스만 다시 |
| `… --keep-reel` | 릴스 HTML을 `reel-src/`에 남긴다 |
| `… --draft` | 릴스를 빠르게, 낮은 화질로 |
| `… --ffmpeg-reel` | HyperFrames 없이 카드만 이어 붙인 릴스 |
| `… --audio 파일` | 사용자가 준 음악 |
| `… --tts` | 나레이션. 기본은 꺼져 있음 |
| `node scripts/next-theme.mjs` | 다음 표지 A/B/C |
| `node scripts/next-theme.mjs --look howto` | 그 갈래의 다음 룩 |
| `bash scripts/fetch-media.sh section URL out.mp4 시작 끝` | 공식 영상 구간 |
| `bash scripts/extract-frames.sh 영상 폴더 0.5` | 0.5초마다 프레임과 시트 |
| `bash scripts/cut-clip.sh 입력 출력 시작 8` | 7–9초 카드 클립, SAR 확인 |

`--tts`는 `edge-tts`가 있을 때만이다. 없으면 이유를 말하고 소리 없는 영상으로 넘기지 않는다.

자세한 규격은 [references/pipeline.md](references/pipeline.md).

## 하지 않는 것

- 확인하지 않은 숫자, 날짜, 요금, 링크를 카드에 단정하지 않는다.
- 얼굴이 보이는 컷, 출처가 불명확한 사진을 쓰지 않는다.
- 사진 위에 글을 얹지 않는다. 그라데이션으로 사진을 어둡게 덮지 않는다.
- 자간을 벌린 영어 대문자 라벨, 알약 모양 칩, 기울인 형광 상자, 격자 무늬, 노이즈 질감을 쓰지 않는다.
- 밝은 흰 플래시 전환, 튀는 이징, 모든 요소가 똑같이 떠오르는 모션을 쓰지 않는다.
- 인스타에 올리거나 예약하지 않는다.
