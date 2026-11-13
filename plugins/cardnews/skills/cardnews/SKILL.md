---
name: cardnews
description: >
  사람이 고른 주제 하나로 한국어 인스타그램 카드뉴스 10장(1080×1350), 캡션, X 글, 나레이션 대본, 9:16 릴스를 만든다.
  전시·공간·팝업·건축, 뉴스, 제품, 아이디어를 사진·영상 위주로 만들 때 쓴다.
  Use when the user asks for Instagram card news, 카드뉴스, a carousel, 릴스, or a Korean social post about one chosen topic.
---

# 카드뉴스

사람이 주제를 고르면, 그 주제 하나만 인스타 카드뉴스 한 편으로 만든다. 뉴스를 시간마다 자동으로 찾아 올리지 않는다. 글자는 HTML/CSS로 그리고 헤드리스 크로미움으로 렌더한다. 생성형 이미지로 글자를 그리지 않는다.

디자인은 전시 샘플을 따른다. 배경은 `#0b0c0f`, 글자는 흰색, 포인트는 제이드 `#8FE8D6`. 표지만 A(큰 글자) / B(한지, Noto Serif) / C(체크리스트) 중 하나이고, 2–10장은 같은 체계다. [references/design.md](references/design.md).

## 1. 먼저 설치를 확인한다

편을 만들기 전에, 스킬 폴더에서 한 번 실행한다. 이미 있는 도구는 건너뛴다.

```bash
bash scripts/setup.sh
```

이게 node, ffmpeg, ffprobe, yt-dlp, Playwright Chromium, Pretendard, 커버 B용 Noto Serif KR을 확인한다. 맥에서는 없는 것을 Homebrew로 넣는다 (`brew install ffmpeg`, `brew install yt-dlp`). 글꼴은 스킬 안의 woff2가 없으면 받는다.

## 2. 채널이 비어 있으면 묻는다

한 번에 하나씩만.

1. 카드에 넣을 채널 이름과 인스타그램 핸들
2. 주로 다룰 분야. 없어도 된다.
3. 피하고 싶은 분위기
4. 결과 폴더
5. 이번 편 주제. 없으면 여기서 멈추고 주제를 받는다. 전시 편은 아래 1번에서 지금 열린 전시를 골라 제안할 수 있다. 사람이 고르기 전에는 만들지 않는다.

답은 `~/.cardnews/config.json`에 저장한다. 핸들이 없으면 `@your_channel`로 두고 그 사실을 적는다.

## 3. 자료를 찾는 순서

한 편은 한 주제다. 갈래가 전시·공간·팝업·건축이면 `space`, 뉴스·제품·아이디어면 `explainer`. 구조는 [references/structures.md](references/structures.md).

### 전시·공간

1. 웹 검색으로 지금 열려 있고 이야기가 되는 전시를 고르거나, 사람이 준 주제를 쓴다. 기간, 장소, 시간, 휴관, 요금은 그 기관 공식 페이지에서 확인한다. 확인하지 못한 것은 `기획서.md`에만 적고, 카드에는 사실처럼 쓰지 않는다.
2. 기관 공식 유튜브, 또는 홈페이지에 박혀 있는 영상에서 티저, 전시 전경, 큐레이터 투어, 타임랩스를 찾는다.
3. 필요한 고화질 구간만 받는다. 프레임을 뽑아 얼굴을 빼고, 박힌 자막은 잘라 내고, 7–9초 클립을 만든다.
   - 받기: `bash scripts/fetch-media.sh section "URL" src/clip.mp4 시작초 끝초`
   - 프레임: `bash scripts/extract-frames.sh src/clip.mp4 build/frames 0.5` (0.25도 된다). 0.25–0.5초마다 한 장. 작가나 관람객 얼굴이 보이면 그 구간은 버린다. 시트는 `build/frames/contact.jpg`.
   - 자르기: `bash scripts/cut-clip.sh src/clip.mp4 card.mp4 시작초 8 0.5 0.15 0.84`
   - 길이는 7–9초. H.264, yuv420p, 1080×1350, `setsar=1`, 무음. 스크립트가 ffprobe로 SAR 1:1을 확인한다.
   - 화면에 자막이 박혀 있으면 `zoom`을 1보다 작게 (예: `0.84`) 하고 `cropy`를 `0.15`처럼 위로 둔다.
4. 공식 영상이 없으면 보도자료나 공식 사진에 느린 카메라 무브를 넣는다. `episode.json`에 `video`를 비우면 렌더가 그렇게 하고 `영상메모.txt`에 적는다. 사용자에게 말한다.
5. 모든 장 오른쪽 아래에 출처 한 줄을 넣는다 (`credit`). 기관 사진·영상을 쓰면, 올리기 전에 그 기관 홍보팀 허락을 받으라고 권한다. 올리거나 예약하지는 않는다.

### 뉴스·제품·아이디어

같은 순서의 짧은 버전이다.

1. 사람이 준 주제만 다룬다. 공식 글, 논문, 제품 페이지에서 숫자와 날짜를 확인한다. 확인 못한 것은 기획서에만 둔다.
2. 공식 계정이나 글에 붙은 영상·스크린샷을 찾는다. 재배포 조건이 불명확하면 쓰지 않는다.
3. 영상이 있으면 위와 같이 구간만 받고, 얼굴을 빼고, `cut-clip.sh`로 자른다.
4. 영상이 없으면 공식 스틸에 느린 카메라 무브를 넣고 그 사실을 말한다.
5. 오른쪽 아래 출처, 게시 전 허락 안내. 카드 구조만 explainer로 바꾼다. 룩은 같다.

## 4. 만들고 눈으로 확인한다

표지는 `node scripts/next-theme.mjs`로 A → B → C. 사람이 고르면 그걸로 한다. 문구에 `{{단어}}`를 넣으면 그 단어만 제이드(또는 커버 B의 녹청)로 올라간다.

```bash
node scripts/render-episode.mjs /절대경로/episode.json
```

`contact_sheet.png`와 PNG를 직접 본다. 글자가 사진을 가리면 문장을 줄이거나 `imagePosition`을 고치고 다시 그린다.

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
| `node scripts/render-episode.mjs episode.json` | 글자 오버레이, 스틸, 릴스 |
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
