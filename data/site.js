/* ─────────────────────────────────────────────
   사이트 기본 설정
   이 파일만 고치면 이름·링크·대표 이미지가 바뀝니다.
   다른 스트리머용으로 만들 때도 이 파일과 assets 폴더의 그림만 바꾸면 됩니다.
   ───────────────────────────────────────────── */
window.SITE = {
  siteName: "마루네",            // 한글 사이트 이름
  wordmark: "마루네",          // 상단과 메인에 크게 나오는 이름
  streamer: "마루º",               // 스트리머 닉네임
  tagline: "씨앗에서 체리 선데까지, 마루와 함께 자라는 곳",

  // 링크: 비워 두면("") 해당 버튼이 숨겨집니다
  soopId: "mang0707",             // SOOP 방송국 아이디
  channelUrl: "https://www.sooplive.com/station/mang0707",   // SOOP 방송국 주소
  youtubeUrl: "",                  // 유튜브 채널 주소
  instagramUrl: "",                // 인스타그램 주소
  giftInfo: "",                    // 선물 보내는 곳 안내 문구 (비우면 버튼 숨김)

  // 메인 큰 그림: 방송 중 / 방송 꺼졌을 때
  heroLive: "assets/hero-photo.jpg",
  heroOff: "assets/hero-photo.jpg",
  heroPosition: "center 14%",      // 사진에서 보여줄 위치 (가로 세로). 세로 숫자가 작을수록 위쪽
  heroTint: "#efe6f6",             // 사진 옆으로 번지는 배경색
  // 픽셀아트 장면을 다시 쓰려면: assets/hero-live.jpg (낮), assets/hero-off.jpg (밤)

  // ── 게시판 ──
  // Supabase 프로젝트를 만든 뒤 두 값을 넣으면 실제 게시판이 됩니다. 비워 두면 체험 모드로 동작합니다.
  supabaseUrl: "",                 // 예) https://abcdefgh.supabase.co
  supabaseAnonKey: "",             // Supabase 설정 > API 의 anon public 키 (공개해도 되는 키)
  loginProviders: ["kakao", "google"],
  // write: 누가 글을 쓸 수 있는지. member = 로그인한 누구나, streamer = 스트리머와 운영자, admin = 운영자만
  boards: [
    { id: "notice", label: "공지사항",    write: "admin" },
    { id: "free",   label: "자유게시판",  write: "member" },
    { id: "diary",  label: "마루 일기장", write: "streamer" },
    { id: "soop",   label: "방송국 글",   external: true }   // SOOP 방송국 글을 자동으로 보여주는 칸 (여기서 쓰지 않음)
  ],

  // 상단·하단 로고 그림 (손그림 체리)
  logo: "assets/logo.svg",

  // 게임에 쓰는 대표 퍼스나콘 번호 (assets/p01~p12.png)
  mascot: 6,
  goldMascot: 12,

  // 구독 퍼스나콘 12단계 이름과 개월 수 (label은 화면에 작게 표시)
  persona: [
    { name: "씨앗",          label: "1개월" },
    { name: "새싹",          label: "2개월" },
    { name: "꽃",            label: "3개월" },
    { name: "풋체리",        label: "4개월" },
    { name: "주황 체리",     label: "5개월" },
    { name: "분홍 체리",     label: "6개월" },
    { name: "쌍둥이 체리",   label: "7개월" },
    { name: "리본 체리",     label: "8개월" },
    { name: "체리 아이스크림", label: "9개월" },
    { name: "체리 케이크",   label: "10개월" },
    { name: "체리 파르페",   label: "11개월" },
    { name: "체리 선데",     label: "12개월" }
  ]
};
