/* 체리 2048: 같은 단계 두 개가 만나면 다음 단계. 12단계(체리 선데)가 목표 */
(function(){
  const { S, pc, pcSrc, toast } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const N = 4, MAX = 12, stage = $("stage");
  const names = (S.persona || []).map(p => p.name);
  /* 단계별 타일 색 */
  const COLORS = ["#fbf1e6", "#eaf6e0", "#fde6ef", "#fff3c4", "#ffe2cc", "#ffd7e3", "#ffcadc", "#fbc9e6", "#f1d6f6", "#e4dafb", "#dbe6fd", "#ffe08a"];
  let grid, score, over, won, fresh, merged, started = false;

  function empty(){ const a = []; for(let i = 0; i < N * N; i++) if(!grid[i]) a.push(i); return a; }
  function spawn(){
    const e = empty(); if(!e.length) return;
    const i = e[Math.floor(Math.random() * e.length)];
    grid[i] = Math.random() < 0.9 ? 1 : 2; fresh.add(i);
  }
  function reset(){
    grid = new Array(N * N).fill(0); score = 0; over = false; won = false;
    fresh = new Set(); merged = new Set();
    spawn(); spawn(); render();
  }
  function slide(line){
    const v = line.filter(x => x), out = [], hit = [];
    let gain = 0;
    for(let i = 0; i < v.length; i++){
      if(v[i] === v[i + 1] && v[i] < MAX){ out.push(v[i] + 1); hit.push(out.length - 1); gain += Math.pow(2, v[i] + 1); i++; }
      else out.push(v[i]);
    }
    while(out.length < N) out.push(0);
    return { out, gain, hit };
  }
  function lineIdx(dir, k){
    const a = [];
    for(let j = 0; j < N; j++){
      if(dir === "left")  a.push(k * N + j);
      if(dir === "right") a.push(k * N + (N - 1 - j));
      if(dir === "up")    a.push(j * N + k);
      if(dir === "down")  a.push((N - 1 - j) * N + k);
    }
    return a;
  }
  function canMove(){
    if(empty().length) return true;
    for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){
      const v = grid[r * N + c];
      if(v >= MAX) continue;
      if(c < N - 1 && grid[r * N + c + 1] === v) return true;
      if(r < N - 1 && grid[(r + 1) * N + c] === v) return true;
    }
    return false;
  }
  function move(dir){
    if(over || !started) return;
    let moved = false, gain = 0; fresh = new Set(); merged = new Set();
    const before = Math.max.apply(null, grid);
    for(let k = 0; k < N; k++){
      const idx = lineIdx(dir, k), res = slide(idx.map(i => grid[i]));
      idx.forEach((i, j) => { if(grid[i] !== res.out[j]) moved = true; grid[i] = res.out[j]; });
      res.hit.forEach(j => merged.add(idx[j]));
      gain += res.gain;
    }
    if(!moved) return;
    score += gain;
    spawn();
    render();
    /* 합쳐진 칸에 효과 */
    const cells = $("board").children;
    merged.forEach(i => { const p = K.at(stage, cells[i]); K.burst(stage, p.x, p.y, null, 7); });
    if(gain){ const p = K.at(stage, $("board")); K.pop(stage, p.x, 18, "+" + gain, gain >= 256 ? "gold" : ""); }
    const top = Math.max.apply(null, grid);
    if(top > before && top >= 5) toast((names[top - 1] || "") + " 등장!");
    if(!won && top >= MAX){ won = true; K.confetti(stage); toast("체리 선데 완성! 계속 할 수 있어요"); }
    if(!canMove()){ over = true; setTimeout(finish, 350); }
  }
  function finish(){
    const isBest = K.submit("2048", score);
    $("best").textContent = K.bestText("2048");
    const top = Math.max.apply(null, grid);
    const stars = top >= 10 ? 3 : top >= 8 ? 2 : top >= 6 ? 1 : 0;
    K.result({
      icon: pcSrc(top), title: score + "점",
      text: (names[top - 1] || "") + "까지 키웠어요. 더 움직일 칸이 없어요.",
      stars, best: isBest
    });
  }
  function render(){
    const top = Math.max.apply(null, grid);
    $("board").innerHTML = grid.map((v, i) =>
      '<div class="cell' + (v ? " filled" : "") + (fresh.has(i) ? " new" : "") + (merged.has(i) ? " merged" : "") + (v && v === top && top >= 4 ? " top" : "") + '"'
      + (v ? ' style="--c:' + COLORS[v - 1] + '"' : "") + '>'
      + (v ? pc(v) + '<span class="lv num">' + v + '</span>' : "") + '</div>').join("");
    $("score").textContent = score;
    $("best").textContent = K.bestText("2048");
    $("top").textContent = names[top - 1] || "";
  }

  const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
  document.addEventListener("keydown", e => { if(KEYS[e.key] && started){ e.preventDefault(); move(KEYS[e.key]); } });
  let sx = 0, sy = 0, down = false;
  stage.addEventListener("pointerdown", e => { down = true; sx = e.clientX; sy = e.clientY; });
  window.addEventListener("pointerup", e => {
    if(!down) return; down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if(Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  function begin(){ started = true; $("overlay").hidden = true; reset(); }
  $("resetBtn").addEventListener("click", begin);
  $("startBtn").addEventListener("click", begin);
  $("best").textContent = K.bestText("2048");
  window.__g2048 = { move, state: () => ({ grid: grid.slice(), score, over }) };
  reset();
})();
