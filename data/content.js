/* ─────────────────────────────────────────────
   사이트 내용 (일정·공약·시그·자료실)
   방송 내용이 바뀔 때 이 파일만 고치면 됩니다.
   sample: true 가 붙은 묶음은 화면에 "예시" 표시가 나옵니다.
   실제 내용으로 바꾼 뒤 sample: false 로 고치세요.
   ───────────────────────────────────────────── */

/* 이번 주 방송 일정: 월~일 순서. 쉬는 날은 rest: true */
window.SCHEDULE = {
  sample: true,
  days: [
    { day: "월", title: "휴방", time: "", rest: true },
    { day: "화", title: "저녁 수다 방송", time: "20:00" },
    { day: "수", title: "게임 같이 하는 날", time: "20:00" },
    { day: "목", title: "휴방", time: "", rest: true },
    { day: "금", title: "노래 신청곡", time: "21:00" },
    { day: "토", title: "시청자 참여 콘텐츠", time: "19:00" },
    { day: "일", title: "한 주 마무리 수다", time: "20:00" }
  ]
};

/* 공약: now/goal 로 진행률 표시. 끝난 공약은 done: true */
window.PROMISES = {
  sample: true,
  items: [
    { title: "애청자 1만 명 달성하면 노래 커버 영상", now: 8420, goal: 10000, unit: "명", note: "달성하면 일주일 안에 올려요" },
    { title: "구독자 300명 달성하면 24시간 방송", now: 214, goal: 300, unit: "명", note: "" },
    { title: "요리 방송", now: 1, goal: 1, unit: "회", done: true, note: "10월 공약 · 완료" }
  ]
};

/* 도전미션: 방송 중 들어온 SOOP 도전미션을 적어 두는 곳이에요.
   status 는 "진행중", "성공", "실패" 중 하나. balloons 는 걸린 별풍선 개수, by 는 요청한 사람(비우면 "마루º"가 만든 미션),
   date 는 "2026-11-24" 형식. 새 미션은 맨 위에 추가하면 돼요. */
window.MISSIONS = {
  sample: true,
  items: [
    { title: "노래 3곡 연속 고음 성공하기", balloons: 3000, by: "체리부자", status: "진행중", date: "2026-11-23" },
    { title: "게임 1판 안 죽고 클리어", balloons: 1500, by: "새벽체리", status: "성공", date: "2026-11-22" },
    { title: "애교 10초 버티기", balloons: 1000, by: "분홍우산", status: "성공", date: "2026-11-21" },
    { title: "매운 라면 국물까지 다 먹기", balloons: 2000, by: "번개손", status: "실패", date: "2026-11-20" }
  ]
};

/* 시그: category 는 "갠방" 또는 "엑셀". image 에 그림 경로를 넣으면 그 그림이,
   비워 두면 icon 번호의 퍼스나콘이 나옵니다 */
window.SIGS = {
  sample: false,
  /* 마루º SOOP 방송국 '알려드립니다' 공지에서 모은 목록 (2026-06-06 「채플단 공약 & 자신 있는 시그」, 2026-08-17·08-25 「하고싶은 시그!」).
     개수가 바뀐 시그가 있어요(예: 1010 Wait → 푸른산호초). 최신 목록이 나오면 '최근' 묶음을 바꿔 주세요. */
  note: "SOOP 방송국 공지 기준이에요. 시그 개수는 방송에서 바뀔 수 있어요.",
  categories: ["최근 (8월)", "이전 (6월)"],
  items: [
    { count: 1010, name: "푸른산호초", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 1, image: "" },
    { count: 1070, name: "스트로베리", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 2, image: "" },
    { count: 1154, name: "나루토", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 3, image: "" },
    { count: 1178, name: "체온", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 4, image: "" },
    { count: 1222, name: "TT", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 5, image: "" },
    { count: 1313, name: "웨이백홈", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 6, image: "" },
    { count: 1555, name: "BAD", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 7, image: "" },
    { count: 1617, name: "위플래쉬", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 8, image: "" },
    { count: 3000, name: "MVP", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 9, image: "" },
    { count: 3388, name: "하이스트 (전반전)", desc: "8월 공지 · 자신있는 시그", category: "최근 (8월)", icon: 10, image: "" },
    { count: 1010, name: "Wait", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 5, image: "" },
    { count: 1020, name: "Holy Moly", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 6, image: "" },
    { count: 1030, name: "EDM", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 7, image: "" },
    { count: 1050, name: "POSE!", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 8, image: "" },
    { count: 1060, name: "Tap and Bye", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 9, image: "" },
    { count: 1240, name: "캐치캐치", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 10, image: "" },
    { count: 1470, name: "체온", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 11, image: "" },
    { count: 1777, name: "나루토", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 12, image: "" },
    { count: 1950, name: "overdrive", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 1, image: "" },
    { count: 1999, name: "외모췤", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 2, image: "" },
    { count: 2000, name: "자기야 화풀어", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 3, image: "" },
    { count: 2050, name: "핑크레이디", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 4, image: "" },
    { count: 2100, name: "개구리", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 5, image: "" },
    { count: 3000, name: "sax", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 6, image: "" },
    { count: 3400, name: "개포동의 눈물", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 7, image: "" },
    { count: 4800, name: "루니솔라", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 8, image: "" },
    { count: 5000, name: "호텔파티", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 9, image: "" },
    { count: 8000, name: "계엄령", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 10, image: "" },
    { count: 10000, name: "gravity", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 11, image: "" },
    { count: 10004, name: "뷰티풀", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 12, image: "" },
    { count: 25000, name: "런 투 더 스카이", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 1, image: "" },
    { count: 30000, name: "오케스트라", desc: "6월 공지 · 자신 있는 시그", category: "이전 (6월)", icon: 2, image: "" }
  ]
};

/* 자료실: category 별로 묶여 탭이 됩니다.
   image: 그림 경로 (assets/gallery/파일이름.jpg)
   youtube: 유튜브 영상 ID (주소 v= 뒤 11글자). 넣으면 누를 때 유튜브로 이동 */
window.ARCHIVE = {
  sample: true,
  categories: ["프로필", "짤", "영상"],
  items: [
    { title: "방송 배너 자리",         category: "프로필", icon: 7,  image: "", youtube: "", date: "" },
    { title: "웃긴 순간 모음",         category: "짤",     icon: 3,  image: "", youtube: "", date: "" },
    { title: "오늘의 표정",            category: "짤",     icon: 5,  image: "", youtube: "", date: "" },
    { title: "움짤 자리",              category: "짤",     icon: 4,  image: "", youtube: "", date: "" },
    { title: "첫 방송 하이라이트",     category: "영상",   icon: 10, image: "", youtube: "", date: "" },
    { title: "신청곡 메들리 다시보기", category: "영상",   icon: 11, image: "", youtube: "", date: "" },
    { title: "시청자 참여 게임 명장면", category: "영상",  icon: 12, image: "", youtube: "", date: "" }
  ]
};
