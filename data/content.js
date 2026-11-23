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

/* 시그: category 는 "갠방" 또는 "엑셀". image 에 그림 경로를 넣으면 그 그림이,
   비워 두면 icon 번호의 퍼스나콘이 나옵니다 */
window.SIGS = {
  sample: true,
  categories: ["갠방", "엑셀"],
  items: [
    { count: 100,  name: "체리 인사",   desc: "손 흔들며 인사",        category: "갠방", icon: 6,  image: "" },
    { count: 300,  name: "새싹 댄스",   desc: "짧은 춤 리액션",        category: "갠방", icon: 2,  image: "" },
    { count: 500,  name: "꽃받침",      desc: "꽃받침 애교",           category: "갠방", icon: 3,  image: "" },
    { count: 1000, name: "쌍둥이 체리", desc: "노래 한 소절",          category: "갠방", icon: 7,  image: "" },
    { count: 2000, name: "케이크 타임", desc: "풀버전 리액션",         category: "엑셀", icon: 10, image: "" },
    { count: 3000, name: "파르페",      desc: "댄스 풀버전",           category: "엑셀", icon: 11, image: "" },
    { count: 5000, name: "체리 선데",   desc: "스페셜 리액션",         category: "엑셀", icon: 12, image: "" }
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
