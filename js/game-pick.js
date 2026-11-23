/* 체리 따기 */
(function(){
  const { S, pc, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const SECONDS = 30, NORMAL = S.mascot || 6, GOLD = S.goldMascot || 12;
  $("ovIcon").src = pcSrc(NORMAL);
  $("best").textContent = K.bestText("pick");

  const holes = [];
  for(let i = 0; i < 9; i++){
    const b = document.createElement("button");
    b.type = "button"; b.className = "hole"; b.setAttribute("aria-label", "칸 " + (i + 1));
    b.innerHTML = pc(NORMAL) + '<span class="plus"></span>';
    b.addEventListener("pointerdown", () => hit(i));
    b.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); hit(i); } });
    $("pond").appendChild(b);
    holes.push({ el: b, up: false, gold: false, timer: null });
  }
  const game = { on: false, score: 0, left: SECONDS, tick: null, spawn: null };

  function popOne(){
    if(!game.on) return;
    const free = holes.filter(h => !h.up);
    if(free.length){
      const h = free[Math.floor(Math.random() * free.length)];
      h.up = true; h.gold = Math.random() < 0.15;
      h.el.classList.remove("hit");
      h.el.querySelector(".pc").src = pcSrc(h.gold ? GOLD : NORMAL);
      h.el.classList.add("up");
      h.timer = setTimeout(() => down(h), h.gold ? 650 : 850 + Math.random() * 350);
    }
    game.spawn = setTimeout(popOne, Math.max(380, 820 - (SECONDS - game.left) * 14));
  }
  function down(h){ h.up = false; h.el.classList.remove("up"); clearTimeout(h.timer); }
  function hit(i){
    const h = holes[i];
    if(!game.on || !h.up) return;
    const pts = h.gold ? 3 : 1;
    game.score += pts; $("score").textContent = game.score;
    h.up = false; clearTimeout(h.timer);
    h.el.querySelector(".plus").textContent = "+" + pts;
    h.el.classList.add("hit");
    setTimeout(() => h.el.classList.remove("up", "hit"), 260);
  }
  function start(){
    game.on = true; game.score = 0; game.left = SECONDS;
    $("score").textContent = 0; $("time").textContent = SECONDS;
    $("overlay").hidden = true;
    game.tick = setInterval(() => { game.left--; $("time").textContent = game.left; if(game.left <= 0) end(); }, 1000);
    popOne();
  }
  function end(){
    game.on = false; clearInterval(game.tick); clearTimeout(game.spawn);
    holes.forEach(h => { down(h); h.el.classList.remove("hit"); });
    const isBest = K.submit("pick", game.score);
    $("best").textContent = K.bestText("pick");
    $("ovTitle").textContent = game.score + "점" + (isBest ? " · 최고 기록" : "");
    $("ovText").textContent = game.score > 0 ? "한 판 더 하면 더 잘할 수 있어요." : "체리가 너무 빨리 숨었나 봐요. 한 판 더 해볼까요?";
    $("startBtn").textContent = "한 판 더";
    $("overlay").hidden = false;
  }
  $("startBtn").addEventListener("click", start);
})();
