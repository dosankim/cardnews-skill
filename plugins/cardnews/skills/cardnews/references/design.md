# 디자인

기본 룩은 전시·공간 봇이 만든 서도호 샘플이다. 숫자는 `build.py` / `covers.py`와 같다.

## 토큰

| 이름 | 값 |
|---|---|
| 배경 | `#0b0c0f` |
| 글자 | `#ffffff` |
| 제이드 | `#8FE8D6` |
| 깊은 녹청 | `#0f7f6e` |
| 커버 B 한지 | `#efe9dd` |
| 커버 B 글자 | `#16181c` |
| 옆 여백 | 64px |

글꼴은 Pretendard 300–900. 커버 B 제목만 Noto Serif CJK KR 700. 둘 다 OFL, `assets/fonts/`.

크기 (1080×1350):

- 상단 라벨 19 / 600 / 자간 .22em. 쪽수는 제이드
- 섹션 라벨 23 / 600 / 제이드
- 본문 제목 54 / 800 / 행간 1.24 / 자간 -.025em
- 본문 28.5 / 400 / 행간 1.62 / 흰색 86%
- 정보 키 26, 값 31
- 요금 숫자 112 / 900
- 팁 제목 30, 설명 26
- 저장 알약 30
- 크레딧 16 / 흰색 50% / 오른쪽 아래
- 커버 A 제목 176 / 900 / 자간 -.065em. 하이라이트는 제이드 상자, -2도
- 커버 B 제목 74
- 커버 C 제목 128

질감: 영상은 ffmpeg noise, 표지 A·C와 정보 장에는 9px 메시.

## 커버 A / B / C

에피소드 `cover` 또는 표지 슬라이드의 `cover`. 안쪽 장(2–10)은 항상 같은 잉크+제이드 시스템이다. 커버만 돌아간다.

`node scripts/next-theme.mjs` 는 A → B → C.

`{{단어}}` 가 하이라이트다. A·C는 제이드, B는 세리프의 녹청 `<em>`.

- A: 알약 칩, 흰 킥 라벨, 아주 큰 제목, 하단 메타
- B: 한지 전지, 위 세리프 질문, 가운데 인셋 사진, 검은 태그
- C: 제이드 킥, 큰 제목, 흰 체크 세 줄

제목 줄은 짧게. A는 한 줄에 다섯 글자를 넘기지 않는 편이 안전하다.

미리보기: `node scripts/render-episode.mjs episode.json --preview-themes --stills-only`

표지 슬라이드에 `variants.B`, `variants.C`를 두면 그 문구로 그린다.

## 안쪽 장

- content: 라벨, 제목, 본문. 사진은 풀블리드, 아래 그라데이션
- info: `VISIT INFO` 같은 라벨, 제목, `facts`
- tips: 선택 `price` + `priceNote`, `tips`는 `{k, v}`, 아래 알약 `cta`

`role`이 `story` / `section`이면 content, `cta`면 tips로 그린다.
