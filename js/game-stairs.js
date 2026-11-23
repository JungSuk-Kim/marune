/* 체리 계단: 다음 계단이 지금 방향이면 오르기, 반대면 방향 바꿔 오르기 */
(function(){
  const { S, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, STEP_W = 64, STEP_H = 44, SPR = 54;
  const img = new Image(); img.src = pcSrc(S.mascot || 6);
  $("ovIcon").src = img.src;
  $("best").textContent = K.bestText("stairs");

  let cols, pos, dir, time, on = false, camX = 0, camY = 0, last = 0, raf = 0;

  function extend(){
    while(cols.length < pos + 20){
      const n = cols.length, prev = cols[n - 1], prevDir = n > 1 ? prev - cols[n - 2] : 1;
      let d = Math.random() < 0.62 ? prevDir : -prevDir;
      if(prev + d > 6) d = -1;
      if(prev + d < -6) d = 1;
      cols.push(prev + d);
    }
  }
  function reset(){
    cols = [0]; pos = 0; dir = 1; time = 100;
    extend(); dir = cols[1] - cols[0];
    camX = 0; camY = 0;
    $("score").textContent = 0; $("timebar").style.width = "100%";
    draw();
  }
  function start(){
    reset(); on = true; $("overlay").hidden = true;
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function step(turn){
    if(!on) return;
    if(turn) dir = -dir;
    if(cols[pos + 1] !== cols[pos] + dir){ return end("계단이 없는 쪽으로 갔어요."); }
    pos++; time = Math.min(100, time + 7); extend();
    $("score").textContent = pos;
  }
  function end(why){
    on = false; cancelAnimationFrame(raf);
    const isBest = K.submit("stairs", pos);
    $("best").textContent = K.bestText("stairs");
    $("ovTitle").textContent = pos + "칸" + (isBest ? " · 최고 기록" : "");
    $("ovText").textContent = why;
    $("startBtn").textContent = "다시 오르기";
    $("overlay").hidden = false;
    draw();
  }
  function loop(now){
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    time -= dt * (14 + Math.min(26, pos * 0.22));
    $("timebar").style.width = Math.max(0, time) + "%";
    if(time <= 0){ time = 0; return end("시간이 다 됐어요."); }
    camX += (cols[pos] - camX) * Math.min(1, dt * 12);
    camY += (pos - camY) * Math.min(1, dt * 12);
    draw();
    if(on) raf = requestAnimationFrame(loop);
  }
  function rr(x, y, w, h, r){
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function draw(){
    ctx.clearRect(0, 0, W, H);
    const baseX = W / 2, baseY = H * 0.68;
    for(let k = Math.max(0, pos - 5); k < Math.min(cols.length, pos + 12); k++){
      const x = baseX + (cols[k] - camX) * STEP_W - STEP_W / 2;
      const y = baseY - (k - camY) * STEP_H;
      ctx.fillStyle = k === pos ? "#ffffff" : (k < pos ? "#f3e3e8" : "#ffffff");
      ctx.strokeStyle = k === pos + 1 ? "#d23c60" : "#efdfe3"; ctx.lineWidth = k === pos + 1 ? 2 : 1;
      rr(x + 3, y, STEP_W - 6, 14, 7); ctx.fill(); ctx.stroke();
    }
    const px = baseX + (cols[pos] - camX) * STEP_W, py = baseY - (pos - camY) * STEP_H;
    ctx.imageSmoothingEnabled = false;
    if(img.complete && img.naturalWidth){
      ctx.save(); ctx.translate(px, py - SPR + 4); ctx.scale(dir, 1);
      ctx.drawImage(img, -SPR / 2, 0, SPR, SPR); ctx.restore();
    }
    ctx.fillStyle = "#ab98a0"; ctx.font = "600 12px Pretendard, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(dir > 0 ? "지금 방향 →" : "← 지금 방향", px, py + 34);
  }
  img.onload = () => { if(!on) draw(); };
  $("goBtn").addEventListener("pointerdown", e => { e.preventDefault(); step(false); });
  $("turnBtn").addEventListener("pointerdown", e => { e.preventDefault(); step(true); });
  $("goBtn").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); step(false); } });
  $("turnBtn").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); step(true); } });
  document.addEventListener("keydown", e => {
    if(!on) return;
    if(e.key === "ArrowRight" || e.key === " "){ e.preventDefault(); step(false); }
    if(e.key === "ArrowLeft"){ e.preventDefault(); step(true); }
  });
  $("startBtn").addEventListener("click", start);
  window.__stairs = { next: () => (cols[pos + 1] === cols[pos] + dir ? "go" : "turn"), step, state: () => ({ pos, on }) };
  reset();
})();
