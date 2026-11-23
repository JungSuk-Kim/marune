# 마루네 (마루º 팬 커뮤니티)

서버나 빌드 과정 없이 파일 그대로 올리면 되는 정적 사이트입니다.
방송 상태와 유튜브 영상만 Cloudflare Pages의 서버 함수(`functions/`)를 씁니다.

## 폴더 구성

| 위치 | 내용 |
|---|---|
| `data/site.js` | 사이트 이름, 스트리머 이름, 방송국·유튜브·인스타 주소, 대표 그림, 퍼스나콘 단계 이름 |
| `data/content.js` | 방송 일정, 공약, 시그, 자료실 내용 |
| `assets/` | 퍼스나콘(p01~p12.png), 메인 그림(hero-live.jpg, hero-off.jpg), 글꼴 |
| `css/site.css` | 디자인. 색은 맨 위 `:root` 값만 바꾸면 전체가 바뀜 |
| `js/` | 화면 동작과 게임 |
| `functions/api/` | 방송 상태(live.js), 방송국 최신 글(notices.js), 유튜브 최신 영상(youtube.js) |
| `supabase/schema.sql` | 게시판 데이터베이스 설계와 권한 규칙 |
| `index.html` 등 | 메인, 게시판(board·post·write), 시그(sig), 자료실(archive), 공약현황(promise), 놀이터(play), 게임 4개(games/), 방송 도구(tools) |

## 내용 바꾸는 법

1. `data/content.js`를 메모장으로 열어 일정·공약·시그·자료를 고칩니다.
2. 실제 내용으로 바꾼 묶음은 `sample: true`를 `sample: false`로 고칩니다. 화면의 "예시" 표시가 사라집니다.
3. 사진은 `assets/gallery/` 폴더에 넣고 `image: "assets/gallery/파일이름.jpg"`처럼 적습니다.
4. 유튜브 영상은 주소의 `v=` 뒤 11글자를 `youtube: "..."`에 적습니다.
5. 저장한 뒤 GitHub에 올리면 1~2분 안에 사이트에 반영됩니다.

## 내 컴퓨터에서 미리 보기

`index.html`을 더블클릭하면 열립니다. 방송 상태와 유튜브 자동 목록은 배포한 뒤에만 동작합니다.

## 배포 (Cloudflare Pages, 무료)

1. GitHub 저장소에 이 폴더 전체를 올립니다.
2. Cloudflare 대시보드 > Workers & Pages > Pages > "Git에 연결"에서 저장소를 고릅니다.
3. 빌드 설정: 프레임워크 "없음", 빌드 명령 비움, 출력 폴더 `/`.
4. 설정 > 환경 변수에 아래 값을 넣고 다시 배포합니다.
   - `YOUTUBE_CHANNEL_ID`: `UC`로 시작하는 유튜브 채널 ID
   - `SOOP_ID`: 넣지 않아도 됩니다. 방송국 아이디(`mang0707`)가 `functions/api/live.js`, `notices.js`, `data/site.js`에 적혀 있습니다. 아이디가 바뀌면 세 곳을 고치거나 이 변수로 덮어씁니다.
5. 사용자 지정 도메인에서 구입한 도메인을 연결합니다.

## 게시판 켜기 (Supabase, 무료 구간)

설정 전에는 게시판이 "체험 모드"로 동작합니다. 글이 방문자 기기에만 저장되고 다른 사람에게 보이지 않습니다.
실제 게시판으로 바꾸는 순서:

1. supabase.com 에서 프로젝트를 만듭니다 (지역은 Seoul 권장).
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여 넣고 실행합니다.
3. Authentication > Providers 에서 Kakao, Google 을 켭니다.
   - 카카오: developers.kakao.com 에서 앱을 만들고 REST API 키와 Client Secret 을 Supabase 에 넣습니다. 카카오 쪽 Redirect URI 에는 Supabase 가 보여주는 콜백 주소를 넣습니다.
   - 구글: Google Cloud Console 에서 OAuth 클라이언트를 만들고 같은 방식으로 넣습니다.
4. Authentication > URL Configuration 의 Site URL 과 Redirect URLs 에 사이트 주소를 넣습니다.
5. Settings > API 의 Project URL 과 anon public 키를 `data/site.js` 의 `supabaseUrl`, `supabaseAnonKey` 에 넣습니다. anon 키는 공개해도 되는 키입니다. service_role 키는 절대 넣지 마세요.
6. 사이트에 한 번 로그인한 뒤 SQL Editor 에서 운영자와 스트리머를 지정합니다.
   ```sql
   update public.profiles set role = 'admin' where nickname = '내닉네임';
   update public.profiles set role = 'streamer' where nickname = '마루닉네임';
   ```

게시판 규칙 (데이터베이스에서 강제됩니다):

- 공지사항은 운영자만, 일기장은 스트리머와 운영자만, 자유게시판은 로그인한 누구나 씁니다.
- 삭제는 본인 글과 댓글만 가능하고, 운영자는 모두 삭제할 수 있습니다.
- 글은 30초, 댓글은 5초에 한 번만 쓸 수 있습니다 (도배 방지).
- 글과 댓글은 글자만 저장됩니다. 사진 첨부는 아직 없습니다.

SOOP 로그인을 쓰려면 SOOP 개발자 등록이 필요합니다. 등록되면 `loginProviders` 에 추가하는 방식으로 붙일 수 있게 로그인 창을 분리해 두었습니다.

## 다른 스트리머용으로 바꿀 때

`data/site.js`, `data/content.js`, `assets/`의 그림, `css/site.css`의 `:root` 색 값만 바꾸면 됩니다.

## 알아둘 점

- 미니게임 최고 기록은 방문자 브라우저에만 저장됩니다.
- 방송 상태와 방송국 최신 글은 SOOP의 공개 방송국 정보를 읽습니다(2026년 11월 응답 형식 기준). SOOP이 주소나 형식을 바꾸면 "채널 바로가기"만 표시되며, 그때 `functions/api/live.js`를 고쳐야 합니다.
- 글꼴 Pretendard는 SIL Open Font License로 배포됩니다.
