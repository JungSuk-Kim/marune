# 마루네 (마루º 팬 커뮤니티)

- 빌드 없는 정적 사이트. Cloudflare Pages에 저장소 루트(`/`)를 그대로 배포한다.
- 사용자와는 항상 한국어로 대화한다.
- 이름·링크·게시판 설정: `data/site.js` / 일정·공약·시그·자료실: `data/content.js`
- 디자인 토큰: `css/site.css` 맨 위 `:root`
- 서버 함수: `functions/api/` (live, notices, youtube). SOOP 방송국 아이디는 `mang0707`.
- 게시판: `js/board-store.js` (Supabase 설정이 없으면 체험 모드), DB 설계와 권한은 `supabase/schema.sql`.
- HTML 페이지는 공통 틀(헤더·푸터는 `js/site.js`가 채움)을 쓴다. 새 페이지는 기존 페이지를 복사해 `data-page` 값과 본문만 바꾼다.
- 비밀 키(service_role 등)는 절대 저장소에 넣지 않는다. anon 키만 `data/site.js`에 둔다.
