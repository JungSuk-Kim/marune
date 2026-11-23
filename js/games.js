/* 놀이터 게임 목록과 게임 공통 도구 */
window.GAMES = [
  { id: "pick",   name: "체리 따기",   desc: "30초 동안 튀어나오는 체리 잡기",        href: "games/pick.html",   icon: 6,  unit: "점" },
  { id: "2048",   name: "체리 2048",   desc: "같은 단계끼리 합쳐 황금 체리 만들기",   href: "games/2048.html",   icon: 12, unit: "점" },
  { id: "match",  name: "짝 맞추기",   desc: "같은 퍼스나콘 두 장 찾기",              href: "games/match.html",  icon: 3,  unit: "번", lowerIsBetter: true },
  { id: "stairs", name: "체리 계단",   desc: "방향을 맞춰 계단 끝까지 오르기",        href: "games/stairs.html", icon: 7,  unit: "칸" }
];

window.GameKit = {
  best(id){ return window.CM.store.get("best:" + id, null); },
  /* 새 기록이면 저장하고 true */
  submit(id, score){
    const g = window.GAMES.find(x => x.id === id) || {};
    const prev = this.best(id);
    const better = prev === null || (g.lowerIsBetter ? score < prev : score > prev);
    if(better && (g.lowerIsBetter || score > 0)){ window.CM.store.set("best:" + id, score); return true; }
    return false;
  },
  bestText(id){
    const g = window.GAMES.find(x => x.id === id) || {};
    const b = this.best(id);
    return b === null ? "기록 없음" : b + (g.unit || "");
  }
};
