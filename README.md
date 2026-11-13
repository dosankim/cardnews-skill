# 카드뉴스

주제를 하나 정하면 인스타 카드뉴스 10장(4:5), 캡션, X 글, 나레이션, 릴스(9:16)를 만드는 Claude Code 스킬이에요.

디자인은 전시·공간 카드뉴스의 샘플을 따라요. 배경은 거의 검고, 포인트는 제이드(`#8FE8D6`)예요. 표지만 세 가지(A 큰 글자, B 한지, C 체크리스트) 중에서 돌아가고, 2–10장은 같은 글자 체계예요. 글자는 HTML로 그려요. 그림으로 글자를 만들지 않아요.

## 설치

저장소를 받은 다음, 스킬 폴더에서 준비 스크립트를 먼저 실행해요. 이미 있는 프로그램은 건너뛰어요.

```bash
mkdir -p ~/.claude/skills
cp -R plugins/cardnews/skills/cardnews ~/.claude/skills/cardnews
cd ~/.claude/skills/cardnews
bash scripts/setup.sh
```

맥에서는 Homebrew로 없는 것만 넣어요.

- `brew install ffmpeg` (ffprobe 포함)
- `brew install yt-dlp`
- Playwright로 헤드리스 Chromium
- Pretendard, 커버 B용 Noto Serif KR (스킬 폴더의 글꼴 파일)

Node 20이 없으면 맥에서는 `brew install node`를 시도해요. 리눅스는 ffmpeg·yt-dlp가 없고 sudo가 비밀번호 없이 될 때만 apt로 넣고, 아니면 필요한 명령을 한글로 알려 줘요. 한 번 더 실행해도 안전해요.

## 플러그인으로 설치

이 저장소 루트에 마켓 목록이 있어요.

```bash
claude plugin marketplace add dosankim/cardnews-skill
claude plugin install cardnews@cardnews
```

받은 폴더에서 바로 시험할 때는:

```bash
claude --plugin-dir ./plugins/cardnews
```

설치 뒤 Claude에게 "이 주제로 카드뉴스 만들어 줘"라고 하면 스킬이 붙어요. `/cardnews:cardnews`로 직접 부를 수도 있어요.

## 한 편 만들기

주제는 사람이 정해요. 전시 편은 지금 열린 곳을 제안할 수 있지만, 고르기 전에는 만들지 않아요. 자료는 기관 공식 페이지에서 확인하고, 공식 유튜브에서 필요한 구간만 받아요. 얼굴이 보이는 컷은 빼요.

스킬 폴더에서, 렌더 전에 `bash scripts/setup.sh` 를 한 번 돌려요.

```bash
bash scripts/check-deps.sh
node scripts/render-episode.mjs /경로/episode.json
```

`episode.json`에 문장, 사진 경로, 커버(A/B/C)를 적어요. 예시는 `examples/01.경복궁_서울/`이에요.

결과 폴더:

- `01_….png`, `01_….mp4` … 10장. 영상은 약 8초, 소리 없음
- `reel.mp4` 세로 영상. 음악 없음
- `contact_sheet.png`
- `기획서.md` `게시글문구.txt` `X글.txt` `나레이션대본.txt`

표지 세 장을 보려면:

```bash
node scripts/render-episode.mjs episode.json --preview-themes --stills-only
```

소리는 기본으로 안 넣어요. 음악 파일이 있으면 `--audio 파일`. 나레이션 목소리는 `--tts`인데, `edge-tts`가 설치돼 있을 때만 동작해요.

## 샘플

`examples/01.경복궁_서울`은 2026-11-13 궁능유적본부 안내로 만든 경복궁 편이에요. 사진은 위키미디어 공용과 문화재청 공개 사진이에요. 궁에서 받은 영상은 없어요. 그래서 스틸에 천천히 줌을 넣었고, 그 사실을 `영상메모.txt`에 적어요.

## 알아둘 점

- 시간, 요금, 휴관은 공식 페이지에서 다시 확인한 뒤에 카드에 써요.
- 사람 얼굴이 보이는 컷은 쓰지 않아요.
- 기관 영상을 올리는 건 게시 전에 홍보팀 허락을 받는 게 좋아요.
- 인스타에 올리거나 예약하는 기능은 없어요.
- 글꼴은 Pretendard(SIL OFL)와 Noto Serif KR(커버 B, SIL OFL)이에요.
