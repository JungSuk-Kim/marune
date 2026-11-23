/* 체리 2048: 같은 단계 두 개가 만나면 다음 단계. 12단계(황금 체리)가 목표 */
(function(){
  const { S, pc, pcSrc, toast } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const N = 4, MAX = 12;
  const names = (S.persona || []).map(p => p.name);
  let grid, score, over, won, fresh, merged;

  function empty(){ const a = []; for(let i = 0; i < N * N; i++) if(!grid[i]) a.push(i); return a; }
  function spawn(){
    const e = empty(); if(!e.length) return;
    const i = e[Math.floor(Math.random() * e.length)];
    grid[i] = Math.random() < 0.9 ? 1 : 2; fresh.add(i);
  }
  function reset(){
    grid = new Array(N * N).fill(0); score = 0; over = false; won = false;
    fresh = new Set(); merged = new Set();
    spawn(); spawn(); $("overlay").hidden = true; render();
  }
  /* 한 줄을 앞으로 밀기: [값들] → {줄, 얻은 점수, 합쳐진 자리} */
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
    if(over) return;
    let moved = false; fresh = new Set(); merged = new Set();
    for(let k = 0; k < N; k++){
      const idx = lineIdx(dir, k), res = slide(idx.map(i => grid[i]));
      idx.forEach((i, j) => { if(grid[i] !== res.out[j]) moved = true; grid[i] = res.out[j]; });
      res.hit.forEach(j => merged.add(idx[j]));
      score += res.gain;
    }
    if(!moved) return;
    spawn();
    if(!won && grid.some(v => v >= MAX)){ won = true; toast("황금 체리 완성! 계속 할 수 있어요"); }
    if(!canMove()){ over = true; finish(); }
    render();
  }
  function finish(){
    const isBest = K.submit("2048", score);
    const top = Math.max.apply(null, grid);
    $("ovIcon").src = pcSrc(top);
    $("ovTitle").textContent = score + "점" + (isBest ? " · 최고 기록" : "");
    $("ovText").textContent = (names[top - 1] || "") + "까지 키웠어요. 더 움직일 칸이 없어요.";
    $("overlay").hidden = false;
  }
  function render(){
    $("board").innerHTML = grid.map((v, i) =>
      '<div class="cell' + (v ? " filled" : "") + (fresh.has(i) ? " new" : "") + (merged.has(i) ? " merged" : "") + '">'
      + (v ? pc(v) + '<span class="lv num">' + v + '</span>' : "") + '</div>').join("");
    $("score").textContent = score;
    $("best").textContent = K.bestText("2048");
    $("top").textContent = names[Math.max.apply(null, grid) - 1] || "";
  }

  const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
  document.addEventListener("keydown", e => { if(KEYS[e.key]){ e.preventDefault(); move(KEYS[e.key]); } });
  let sx = 0, sy = 0, down = false;
  const board = $("board");
  board.addEventListener("pointerdown", e => { down = true; sx = e.clientX; sy = e.clientY; });
  window.addEventListener("pointerup", e => {
    if(!down) return; down = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if(Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  $("resetBtn").addEventListener("click", reset);
  $("againBtn").addEventListener("click", reset);
  window.__g2048 = { move, state: () => ({ grid: grid.slice(), score, over }) };
  reset();
})();
