# 원우 & 혜림 모바일 청첩장 (엽서 · 숲 초록)

정적 사이트(HTML/CSS/JS)라 **GitHub Pages**에 그대로 올리면 됩니다. (참석 응답 기능은 요청에 따라 뺐어요.)

## 파일 구조
| 파일 | 역할 |
|---|---|
| `invitation-data.js` | **날짜·장소·문구·메모·드레스코드·마지막 문구·사진 경로·RSVP 주소·지도 링크를 모두 여기서 수정** |
| `index.html` / `styles.css` / `app.js` | 화면 · 디자인 · 동작 |
| `invite-maker.html` | 초대할 분 이름을 넣어 **개인용 링크 만들기** (`index.html?to=이름`) |
| `assets/` | 약도(`directions-map.jpg`), 홀 사진(`venue.webp`), 공유 미리보기(`og-image.jpg`), `photos/`(사진 넣는 곳) |
| `tools/` | `check-data.mjs`(공유 전 점검) · `set-site-url.mjs`(공유 주소 설정)  |

## 실행(미리보기)
```
cd wedding-postcard
python3 -m http.server 8080      # 그리고 휴대폰/PC 브라우저에서 http://localhost:8080
```
파일을 더블클릭(file://)해도 대부분 보이지만, 폰트·클립보드는 http(s) 에서 정상 동작합니다.

## 내용 수정
- 모든 문구/날짜/장소: `invitation-data.js` (대괄호 `[ ]` 문구는 자리표시자)
- **사진**: `assets/photos/` 에 파일(세로형 4:5 권장)을 넣고 `invitation-data.js`의 `photos.notes[n].src` 에 경로 입력 (비워 두면 빈 사진). 정확히 10장이면 하트 모양(위 2·4·3·1줄)으로 쌓이고, 다른 장수는 하트 곡선 위에 균등 배치돼요(8~14장 권장). 순서는 왼쪽 위부터 줄 단위예요.
- **링크 미리보기 제목/설명**은 `index.html` `<head>`의 `og:`/`twitter:` 메타태그에도 있어서 같이 고쳐야 해요(크롤러가 JS를 실행하지 않음). 그 뒤 `node tools/check-data.mjs` 로 일치 여부 확인.
- 배포 주소 설정: `node tools/set-site-url.mjs https://songej1997.github.io/저장소이름/` (og:image 는 절대주소여야 미리보기가 떠요)

## 개인 초대 링크
`invite-maker.html` 에서 이름 입력 → 링크 복사/공유. 링크는 `…/index.html?to=김민지` 형태이고 편지에 "김민지, you're invited" 로 표시되며, 참석 응답 이름 칸에도 미리 채워져요. 이름 없는 링크로 들어오면 편지 아래에 이름 입력칸이 보여요.

## 연락처 · 계좌
- `invitation-data.js` 의 `contacts`(신랑·신부·혼주 전화번호)와 `accounts`(계좌) 를 채우면 됩니다. 전화번호가 비어 있으면 눌러도 걸리지 않고 "등록되지 않았어요" 안내만 떠요.
- 계좌는 버건디 버전에서 옮겨 왔고, `000-…` 로 된 칸은 자리표시자입니다.

## 공유 전 확인
`node tools/check-data.mjs` 가 남은 할 일을 알려줍니다. 지도 버튼은 **실제 폰에서 3개 모두 눌러** 올바른 장소가 뜨는지 꼭 확인하세요.

## 글씨체
제목/라벨은 Playfair Display, 한글은 Noto Serif KR (버건디 버전과 동일 계열). 손글씨체(Gaegu)로 되돌리려면 `index.html` 의 Google Fonts 링크에 `family=Gaegu:wght@400;700` 를 추가하고 `styles.css` 의 `--hand` 맨 앞을 `'Gaegu'` 로 바꾸세요.
