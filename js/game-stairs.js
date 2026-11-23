/* 체리 계단: 다음 계단이 지금 방향이면 오르기, 반대면 방향 바꾸기 */
(function(){
  const { S, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const stage = $("stage");
  const cv = $("cv"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, STEP_W = 70, STEP_H = 46, SPR = 64;
  const img = new Image(); img.src = pcSrc(S.mascot || 6);
  $("best").textContent = K.bestText("stairs");

  /* 구름: 화면 높이 기준 위치 */
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W, y: i * 180 + Math.random() * 60, s: .7 + Math.random() * .7 }));
  let cols, pos, dir, time, on = false, camX = 0, camY = 0, last = 0, raf = 0, hop = 0, trail = [];

  function extend(){
    while(cols.length < pos + 22){
      const n = cols.length, prev = cols[n - 1], prevDir = n > 1 ? prev - cols[n - 2] : 1;
      let d = Math.random() < 0.62 ? prevDir : -prevDir;
      if(prev + d > 6) d = -1;
      if(prev + d < -6) d = 1;
      cols.push(prev + d);
    }
  }
  function reset(){
    cols = [0]; pos = 0; time = 100; trail = [];
    extend(); dir = cols[1] - cols[0];
    camX = 0; camY = 0; hop = 0;
    $("score").textContent = 0;
    $("timebar").style.width = "100%"; $("timebar").parentElement.classList.remove("low");
    draw();
  }
  function start(){
    $("overlay").hidden = true; reset();
    K.countdown(stage, () => {
      on = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    });
  }
  function step(turn){
    if(!on) return;
    if(turn) dir = -dir;
    if(cols[pos + 1] !== cols[pos] + dir){ return end("계단이 없는 쪽으로 갔어요."); }
    trail.push({ k: pos, t: 1 });
    pos++; hop = 1; time = Math.min(100, time + 7); extend();
    $("score").textContent = pos;
    if(pos % 25 === 0){ const r = cv.getBoundingClientRect(); K.pop(stage, r.width / 2, r.height * .3, pos + "칸 돌파!", "combo"); }
  }
  function end(why){
    on = false; cancelAnimationFrame(raf); draw();
    K.shake(cv);
    const isBest = K.submit("stairs", pos);
    $("best").textContent = K.bestText("stairs");
    const stars = pos >= 80 ? 3 : pos >= 40 ? 2 : pos >= 15 ? 1 : 0;
    setTimeout(() => K.result({ icon: img.src, title: pos + "칸", text: why, stars, best: isBest && pos > 0, again: "다시 오르기" }), 350);
  }
  function loop(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    time -= dt * (14 + Math.min(26, pos * 0.22));
    $("timebar").style.width = Math.max(0, time) + "%";
    $("timebar").parentElement.classList.toggle("low", time < 25);
    if(time <= 0){ time = 0; return end("시간이 다 됐어요."); }
    camX += (cols[pos] - camX) * Math.min(1, dt * 12);
    camY += (pos - camY) * Math.min(1, dt * 12);
    hop = Math.max(0, hop - dt * 7);
    trail.forEach(p => p.t -= dt * 2.5); trail = trail.filter(p => p.t > 0);
    draw();
    if(on) raf = requestAnimationFrame(loop);
  }
  function rr(x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function cloud(x, y, s){
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2); ctx.arc(x + 24 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 50 * s, y, 20 * s, 0, Math.PI * 2); ctx.rect(x, y, 50 * s, 20 * s);
    ctx.fill();
  }
  function draw(){
    /* 하늘: 높이 오를수록 노을빛 → 밤빛 */
    const h = Math.min(1, camY / 150);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, h < .5 ? "#cfe3fb" : "#cdbdf2"); g.addColorStop(1, h < .5 ? "#fde4ee" : "#f6d3e6");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    clouds.forEach(c => {
      const y = ((c.y + camY * 9) % (H + 200)) - 100, x = ((c.x - camX * 12) % (W + 160) + W + 160) % (W + 160) - 80;
      cloud(x, y, c.s);
    });
    const baseX = W / 2, baseY = H * 0.7;
    for(let k = Math.max(0, pos - 6); k < Math.min(cols.length, pos + 13); k++){
      const x = baseX + (cols[k] - camX) * STEP_W - STEP_W / 2;
      const y = baseY - (k - camY) * STEP_H;
      const next = k === pos + 1;
      /* 옆면 */
      ctx.fillStyle = k < pos ? "#e2cfe0" : "#d9c6ef";
      rr(x + 4, y + 6, STEP_W - 8, 18, 8); ctx.fill();
      /* 윗면 */
      ctx.fillStyle = k < pos ? "#f6e9f2" : next ? "#ffe3ee" : "#ffffff";
      rr(x + 4, y, STEP_W - 8, 15, 8); ctx.fill();
      if(next){ ctx.strokeStyle = "#e4487e"; ctx.lineWidth = 2.5; rr(x + 4, y, STEP_W - 8, 15, 8); ctx.stroke(); }
      if(k > 0 && k % 10 === 0){
        ctx.fillStyle = "#9a93ad"; ctx.font = "700 12px Pretendard, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(k, x + STEP_W / 2, y + 36);
      }
    }
    /* 발자국 반짝이 */
    trail.forEach(p => {
      const x = baseX + (cols[p.k] - camX) * STEP_W, y = baseY - (p.k - camY) * STEP_H;
      ctx.fillStyle = "rgba(255,209,102," + p.t + ")";
      ctx.beginPath(); ctx.arc(x - 14, y - 6 - (1 - p.t) * 12, 4 * p.t, 0, Math.PI * 2); ctx.arc(x + 14, y - 4 - (1 - p.t) * 16, 3 * p.t, 0, Math.PI * 2); ctx.fill();
    });
    const px = baseX + (cols[pos] - camX) * STEP_W, py = baseY - (pos - camY) * STEP_H;
    /* 그림자 */
    ctx.fillStyle = "rgba(42,35,64,.12)";
    ctx.beginPath(); ctx.ellipse(px, py + 2, 20 - hop * 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    if(img.complete && img.naturalWidth){
      ctx.save(); ctx.translate(px, py - SPR + 6 - Math.sin(hop * Math.PI) * 14); ctx.scale(dir, 1);
      ctx.drawImage(img, -SPR / 2, 0, SPR, SPR); ctx.restore();
    }
    /* 방향 표시 */
    ctx.fillStyle = "#e4487e"; ctx.beginPath();
    const ax = px + dir * 42, ay = py - SPR / 2;
    ctx.moveTo(ax + dir * 10, ay); ctx.lineTo(ax - dir * 2, ay - 9); ctx.lineTo(ax - dir * 2, ay + 9); ctx.closePath(); ctx.fill();
    /* 위쪽 큰 숫자 */
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "800 54px Pretendard, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(pos, W / 2, 76);
  }
  img.onload = () => { if(!on) draw(); };
  const press = (id, turn) => {
    $(id).addEventListener("pointerdown", e => { e.preventDefault(); step(turn); });
    $(id).addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); step(turn); } });
  };
  press("goBtn", false); press("turnBtn", true);
  document.addEventListener("keydown", e => {
    if(!on) return;
    if(e.key === "ArrowRight" || e.key === " " || e.key === "ArrowUp"){ e.preventDefault(); step(false); }
    if(e.key === "ArrowLeft"){ e.preventDefault(); step(true); }
  });
  $("startBtn").addEventListener("click", start);
  window.__stairs = { next: () => (cols[pos + 1] === cols[pos] + dir ? "go" : "turn"), step, state: () => ({ pos, on }) };
  reset();
})();
