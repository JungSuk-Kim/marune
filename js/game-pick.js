/* 체리 따기: 구멍에서 올라오는 체리 잡기 */
(function(){
  const { S, pc, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const SECONDS = 30, NORMAL = S.mascot || 6, GOLD = S.goldMascot || 12;
  const stage = $("stage");
  $("best").textContent = K.bestText("pick");

  const holes = [];
  for(let i = 0; i < 9; i++){
    const b = document.createElement("button");
    b.type = "button"; b.className = "hole"; b.setAttribute("aria-label", "구멍 " + (i + 1));
    b.innerHTML = '<span class="back"></span><span class="clip">' + pc(NORMAL) + '</span><span class="front"></span>';
    b.addEventListener("pointerdown", e => { e.preventDefault(); hit(i); });
    b.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); hit(i); } });
    $("pond").appendChild(b);
    holes.push({ el: b, img: b.querySelector(".pc"), up: false, gold: false, timer: null });
  }
  const game = { on: false, score: 0, left: SECONDS, tick: null, spawn: null, combo: 0, lastHit: 0 };

  function popOne(){
    if(!game.on) return;
    const free = holes.filter(h => !h.up);
    if(free.length){
      const h = free[Math.floor(Math.random() * free.length)];
      h.up = true; h.gold = Math.random() < 0.14;
      h.el.classList.remove("hit");
      h.img.src = pcSrc(h.gold ? GOLD : NORMAL);
      h.el.classList.add("up");
      h.timer = setTimeout(() => down(h), h.gold ? 650 : 850 + Math.random() * 350);
    }
    game.spawn = setTimeout(popOne, Math.max(360, 800 - (SECONDS - game.left) * 14));
  }
  function down(h){ h.up = false; h.el.classList.remove("up"); clearTimeout(h.timer); }
  function hit(i){
    if(!game.on) return;
    const h = holes[i], p = K.at(stage, h.el);
    if(!h.up){
      game.combo = 0; K.shake(h.el);
      K.pop(stage, p.x, p.y - 10, "놓쳤다", "miss");
      return;
    }
    const now = performance.now();
    game.combo = now - game.lastHit < 1000 ? game.combo + 1 : 1;
    game.lastHit = now;
    const pts = (h.gold ? 3 : 1) + (game.combo >= 5 ? 1 : 0);
    game.score += pts; $("score").textContent = game.score;
    h.up = false; clearTimeout(h.timer);
    h.el.classList.add("hit");
    K.pop(stage, p.x, p.y - 20, "+" + pts, h.gold ? "gold" : "");
    K.burst(stage, p.x, p.y - 4, h.gold ? ["#ffd166", "#f7a8c4", "#fff1b8"] : null, h.gold ? 14 : 9);
    if(game.combo >= 3) setTimeout(() => K.pop(stage, p.x, p.y - 52, game.combo + " 콤보", "combo"), 90);
    setTimeout(() => h.el.classList.remove("up", "hit"), 240);
  }
  function setTimer(){
    $("time").textContent = game.left;
    $("timebar").style.transition = "width 1s linear";
    $("timebar").style.width = (game.left / SECONDS * 100) + "%";
    $("timebar").parentElement.classList.toggle("low", game.left <= 5);
  }
  function start(){
    $("overlay").hidden = true;
    game.score = 0; game.left = SECONDS; game.combo = 0;
    $("score").textContent = 0; $("time").textContent = SECONDS;
    $("timebar").style.transition = "none"; $("timebar").style.width = "100%";
    $("timebar").parentElement.classList.remove("low");
    K.countdown(stage, () => {
      game.on = true;
      game.tick = setInterval(() => { game.left--; setTimer(); if(game.left <= 0) end(); }, 1000);
      setTimer();
      popOne();
    });
  }
  function end(){
    game.on = false; clearInterval(game.tick); clearTimeout(game.spawn);
    holes.forEach(h => { down(h); h.el.classList.remove("hit"); });
    const isBest = K.submit("pick", game.score);
    $("best").textContent = K.bestText("pick");
    const stars = game.score >= 40 ? 3 : game.score >= 25 ? 2 : game.score >= 12 ? 1 : 0;
    K.result({
      icon: pcSrc(stars === 3 ? GOLD : NORMAL),
      title: game.score + "점",
      text: stars === 3 ? "체리 따기 달인이에요!" : stars === 2 ? "손이 꽤 빨라요. 조금만 더!" : stars === 1 ? "좋아요. 콤보를 이어 보세요." : "체리가 너무 빨랐나 봐요. 한 판 더!",
      stars, best: isBest && game.score > 0
    });
  }
  $("startBtn").addEventListener("click", start);
})();
