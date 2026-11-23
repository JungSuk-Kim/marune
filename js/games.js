/* 놀이터 게임 목록과 게임 공통 도구 */
window.GAMES = [
  { id: "pick",   name: "체리 따기",   desc: "30초 동안 튀어나오는 체리 잡기",        href: "games/pick.html",   icon: 6,  unit: "점" },
  { id: "2048",   name: "체리 2048",   desc: "같은 단계끼리 합쳐 체리 선데 만들기",   href: "games/2048.html",   icon: 12, unit: "점" },
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
    return b === null ? "-" : b + (g.unit || "");
  },
  reduced: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,

  /* ── 효과 ── */
  /* el 기준 위치 (stage 안의 좌표) */
  at(stage, el){
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  },
  pop(stage, x, y, text, cls){
    const s = document.createElement("span");
    s.className = "fx-pop" + (cls ? " " + cls : "");
    s.textContent = text; s.style.left = x + "px"; s.style.top = y + "px";
    stage.appendChild(s); setTimeout(() => s.remove(), 800);
  },
  burst(stage, x, y, colors, n){
    if(this.reduced) return;
    colors = colors || ["#f48fb5", "#ffd166", "#b9e3c6", "#c9b8f5"];
    for(let i = 0; i < (n || 10); i++){
      const d = document.createElement("span"), a = Math.PI * 2 * i / (n || 10) + Math.random() * .5, r = 28 + Math.random() * 26;
      d.className = "fx-dot"; d.style.left = x + "px"; d.style.top = y + "px";
      d.style.background = colors[i % colors.length];
      d.style.setProperty("--dx", Math.cos(a) * r + "px"); d.style.setProperty("--dy", Math.sin(a) * r + "px");
      stage.appendChild(d); setTimeout(() => d.remove(), 650);
    }
  },
  confetti(stage){
    if(this.reduced) return;
    const colors = ["#f48fb5", "#ffd166", "#9fd9b8", "#b9a6f2", "#8fc7f2", "#ff9e7a"];
    for(let i = 0; i < 46; i++){
      const c = document.createElement("span");
      c.className = "fx-conf";
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.setProperty("--dx", (Math.random() - .5) * 120 + "px");
      c.style.setProperty("--rot", (Math.random() * 900 - 450) + "deg");
      c.style.animationDelay = Math.random() * .35 + "s";
      c.style.animationDuration = 1.3 + Math.random() * .8 + "s";
      stage.appendChild(c); setTimeout(() => c.remove(), 2600);
    }
  },
  shake(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); },
  /* 3, 2, 1 */
  countdown(stage, done){
    if(this.reduced){ done(); return; }
    const c = document.createElement("div"); c.className = "countdown"; stage.appendChild(c);
    const seq = ["3", "2", "1", "시작!"]; let i = 0;
    const next = () => {
      if(i >= seq.length){ c.remove(); done(); return; }
      c.innerHTML = '<span>' + seq[i] + '</span>'; i++;
      setTimeout(next, i === seq.length ? 450 : 600);
    };
    next();
  },
  /* 결과 창 채우기 */
  result(o){
    const $ = id => document.getElementById(id);
    if(o.icon) $("ovIcon").src = o.icon;
    $("ovTitle").textContent = o.title;
    $("ovText").textContent = o.text || "";
    const st = $("stars");
    st.innerHTML = [0, 1, 2].map(i => '<span class="' + (i < o.stars ? "on" : "") + '" style="animation-delay:' + (.15 + i * .15) + 's">★</span>').join("");
    st.hidden = false;
    $("bestBadge").hidden = !o.best;
    $("startBtn").textContent = o.again || "다시 하기";
    $("otherBtn").hidden = false;
    $("overlay").hidden = false;
    if(o.best) this.confetti($("stage"));
  }
};
