/* 방송 도구: 룰렛 · 추첨(로또) · 주사위 · 사다리. 방송 화면에 띄워 놓고 쓰는 용도 */
(function(){
  const { S, store, toast, asset } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const reduce = K.reduced;
  const lines = s => s.split("\n").map(x => x.trim()).filter(Boolean);

  /* ───────── 룰렛 ───────── */
  const COLORS = ["#f9b4cb", "#ffd8a8", "#bfe6cb", "#cdbff5", "#aed6f7", "#ffe48f", "#f6bddf", "#b9e9e2"];
  const TEXT = ["#8a2149", "#7a4a12", "#23613d", "#4b3a91", "#1f5687", "#6b5400", "#7c2b62", "#1f5f57"];
  const cv = $("wheel"), ctx = cv.getContext("2d"), R = cv.width / 2;
  let items = lines(store.get("tool-wheel", "치킨\n피자\n벌칙 면제\n노래 한 곡\n애교 한 번\n꽝"));
  let angle = 0, spinning = false;
  const logo = new Image(); logo.src = asset(S.logo || "assets/logo.svg");
  logo.onload = () => drawWheel();

  function save(){ store.set("tool-wheel", items.join("\n")); }
  function drawWheel(){
    const n = items.length;
    ctx.clearRect(0, 0, cv.width, cv.height);
    /* 바깥 테두리 */
    ctx.beginPath(); ctx.arc(R, R, R - 6, 0, Math.PI * 2); ctx.fillStyle = "#e4487e"; ctx.fill();
    ctx.beginPath(); ctx.arc(R, R, R - 30, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    /* 전구 */
    const bulbs = 24;
    for(let i = 0; i < bulbs; i++){
      const a = i / bulbs * Math.PI * 2;
      ctx.beginPath(); ctx.arc(R + Math.cos(a) * (R - 18), R + Math.sin(a) * (R - 18), 6, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#ffe9a8" : "#fff"; ctx.fill();
    }
    const inner = R - 38;
    if(!n){
      ctx.beginPath(); ctx.arc(R, R, inner, 0, Math.PI * 2); ctx.fillStyle = "#f4eff9"; ctx.fill();
    } else {
      const step = Math.PI * 2 / n;
      items.forEach((t, i) => {
        const a0 = -Math.PI / 2 + i * step, mid = a0 + step / 2;
        ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, inner, a0, a0 + step); ctx.closePath();
        ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.stroke();
        /* 글자: 바깥쪽에서 안쪽으로, 왼쪽 칸도 뒤집히지 않게 */
        const size = Math.max(18, Math.min(36, 300 / n + 10));
        ctx.save(); ctx.translate(R, R); ctx.rotate(mid);
        const flip = Math.cos(mid) < -0.001;
        ctx.fillStyle = TEXT[i % TEXT.length];
        ctx.font = "700 " + size + "px Pretendard, sans-serif";
        ctx.textBaseline = "middle";
        const label = t.length > 8 ? t.slice(0, 7) + "…" : t;
        if(flip){ ctx.rotate(Math.PI); ctx.textAlign = "left"; ctx.fillText(label, -(inner - 26), 0); }
        else { ctx.textAlign = "right"; ctx.fillText(label, inner - 26, 0); }
        ctx.restore();
      });
    }
    /* 가운데 */
    ctx.beginPath(); ctx.arc(R, R, 70, 0, Math.PI * 2); ctx.fillStyle = "rgba(42,35,64,.08)"; ctx.fill();
  }
  function renderChips(){
    $("wheelChips").innerHTML = items.map((t, i) =>
      '<span class="chip-item" style="--c:' + COLORS[i % COLORS.length] + '">' + t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
      + '<button type="button" data-del="' + i + '" aria-label="' + t.replace(/"/g, "") + ' 지우기">×</button></span>').join("")
      || '<span class="sec-sub">항목을 두 개 이상 넣어 주세요</span>';
    $("wheelCount").textContent = items.length + "칸";
  }
  $("wheelChips").addEventListener("click", e => {
    const b = e.target.closest("[data-del]"); if(!b || spinning) return;
    items.splice(Number(b.dataset.del), 1); save(); renderChips(); drawWheel();
  });
  $("wheelForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("wheelInput").value.trim();
    if(!v || spinning) return;
    if(items.length >= 16) return toast("항목은 16개까지 넣을 수 있어요");
    items.push(v.slice(0, 20)); $("wheelInput").value = ""; save(); renderChips(); drawWheel();
  });
  function spin(){
    if(items.length < 2) return toast("항목을 두 개 이상 넣어 주세요");
    if(spinning) return;
    spinning = true; $("wheelResult").hidden = true; $("spinBtn").disabled = true;
    const pick = Math.floor(Math.random() * items.length), step = 360 / items.length;
    const target = 360 - (pick * step + step / 2) + (Math.random() - 0.5) * step * 0.7;
    angle = Math.ceil(angle / 360) * 360 + 360 * 6 + target;
    cv.style.transform = "rotate(" + angle + "deg)";
    setTimeout(() => {
      spinning = false; $("spinBtn").disabled = false;
      $("wheelResultText").textContent = items[pick];
      $("wheelResult").hidden = false;
      K.confetti($("wheelStage"));
    }, reduce ? 50 : 4600);
  }
  $("spinBtn").addEventListener("click", spin);
  $("wheelAgain").addEventListener("click", spin);
  renderChips(); drawWheel();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);

  /* ───────── 추첨 ───────── */
  const drawInput = $("drawNames");
  let drawN = 1, drawing = false;
  drawInput.value = store.get("tool-draw", "");
  const uniq = () => Array.from(new Set(lines(drawInput.value)));
  const info = () => { const n = uniq().length; $("drawInfo").textContent = n ? n + "명" : ""; };
  drawInput.addEventListener("input", () => { store.set("tool-draw", drawInput.value); info(); });
  info();
  function seg(id, set){
    $(id).addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      $(id).querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      set(Number(b.dataset.n));
    });
  }
  seg("drawSeg", n => { drawN = n; });
  /* 로또 추첨기: 유리 통 안에서 공이 섞이다가 하나씩 굴러 나옴 */
  const LC = $("lotto"), lx = LC.getContext("2d");
  const BALL = ["#f9b4cb", "#ffd8a8", "#bfe6cb", "#cdbff5", "#aed6f7", "#ffe48f", "#f6bddf", "#b9e9e2"];
  const BALL_INK = ["#8a2149", "#7a4a12", "#23613d", "#4b3a91", "#1f5687", "#6b5400", "#7c2b62", "#1f5f57"];
  const CX = 320, CY = 215, DR = 182, OUT = { x: 320, y: 492 };
  let balls = [], mixing = 0, shown = null, lastT = 0;
  const short = s => Array.from(s).slice(0, 2).join("");
  function makeBalls(){
    const names = uniq(), n = Math.min(Math.max(names.length, 0), 44) || 18;
    const r = n > 30 ? 17 : n > 16 ? 20 : 24;
    const pick = names.length > n ? names.slice().sort(() => Math.random() - .5).slice(0, n) : names;
    balls = Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2, d = Math.random() * (DR - r - 10);
      return { x: CX + Math.cos(a) * d * .6, y: CY + 60 + Math.sin(a) * d * .4, vx: 0, vy: 0, r, c: i % BALL.length,
        label: pick[i] ? short(pick[i]) : String(i + 1) };
    });
  }
  function physics(dt){
    const g = 1500, lim = DR - 6;
    balls.forEach(b => {
      b.vy += g * dt;
      if(mixing > 0){ /* 바람: 아래쪽 공을 세게 띄워 섞음 */
        const low = (b.y - CY) / DR;
        b.vx += (Math.random() - .5) * 9000 * dt;
        b.vy -= (2600 + 3400 * Math.max(0, low)) * Math.random() * dt * 1.6;
      } else if(Math.random() < .02){ b.vx += (Math.random() - .5) * 120; b.vy -= Math.random() * 160; }
      const sp = Math.hypot(b.vx, b.vy); if(sp > 1500){ b.vx *= 1500 / sp; b.vy *= 1500 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy), m = lim - b.r;
      if(d > m){
        const nx = dx / d, ny = dy / d; b.x = CX + nx * m; b.y = CY + ny * m;
        const vn = b.vx * nx + b.vy * ny; if(vn > 0){ b.vx -= 1.75 * vn * nx; b.vy -= 1.75 * vn * ny; b.vx *= .985; }
      }
    });
    for(let i = 0; i < balls.length; i++) for(let j = i + 1; j < balls.length; j++){
      const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = a.r + b.r;
      if(d < m){
        const nx = dx / d, ny = dy / d, o = (m - d) / 2;
        a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if(rv < 0){ const k = -.9 * rv; a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny; }
      }
    }
  }
  function ball(x, y, r, c, label, big){
    const gr = lx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    gr.addColorStop(0, "#fff"); gr.addColorStop(.35, BALL[c]); gr.addColorStop(1, shade(BALL[c]));
    lx.fillStyle = gr; lx.beginPath(); lx.arc(x, y, r, 0, Math.PI * 2); lx.fill();
    lx.fillStyle = "rgba(255,255,255,.92)"; lx.beginPath(); lx.arc(x, y, r * (big ? .78 : .56), 0, Math.PI * 2); lx.fill();
    lx.fillStyle = BALL_INK[c]; lx.textAlign = "center"; lx.textBaseline = "middle";
    let fs = big ? 30 : r * .62;
    lx.font = "700 " + fs + "px " + (big ? "Gaegu, Pretendard, sans-serif" : "Pretendard, sans-serif");
    const max = r * (big ? 1.4 : 1);
    while(lx.measureText(label).width > max && fs > 10){ fs -= 1; lx.font = "700 " + fs + "px " + (big ? "Gaegu, Pretendard, sans-serif" : "Pretendard, sans-serif"); }
    lx.fillText(label, x, y + (big ? 2 : 1));
  }
  function shade(hex){ const n = parseInt(hex.slice(1), 16); const f = v => Math.round(v * .78); return "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")"; }
  function render(){
    lx.clearRect(0, 0, LC.width, LC.height);
    /* 받침대 */
    lx.fillStyle = "#efe7f6";
    lx.beginPath(); lx.moveTo(CX - 70, CY + DR - 20); lx.lineTo(CX + 70, CY + DR - 20); lx.lineTo(CX + 150, 548); lx.lineTo(CX - 150, 548); lx.closePath(); lx.fill();
    lx.fillStyle = "#fff"; lx.beginPath(); lx.ellipse(OUT.x, OUT.y + 40, 70, 12, 0, 0, Math.PI * 2); lx.fill();
    /* 배출구 */
    lx.fillStyle = "#e4dcef"; lx.fillRect(CX - 22, CY + DR - 8, 44, 42);
    /* 통 */
    lx.fillStyle = "rgba(255,255,255,.55)"; lx.beginPath(); lx.arc(CX, CY, DR, 0, Math.PI * 2); lx.fill();
    balls.forEach(b => { if(!b.out) ball(b.x, b.y, b.r, b.c, b.label); });
    lx.lineWidth = 8; lx.strokeStyle = "#e4487e"; lx.beginPath(); lx.arc(CX, CY, DR, 0, Math.PI * 2); lx.stroke();
    lx.lineWidth = 3; lx.strokeStyle = "rgba(255,255,255,.9)"; lx.beginPath(); lx.arc(CX, CY, DR - 22, Math.PI * 1.1, Math.PI * 1.45); lx.stroke();
    lx.fillStyle = "#e4487e"; lx.beginPath(); lx.arc(CX, CY - DR, 12, 0, Math.PI * 2); lx.fill();
    if(shown) ball(shown.x, shown.y, shown.r, shown.c, shown.label, shown.r > 34);
    else if(!drawing){ lx.fillStyle = "#b3a9c4"; lx.font = "700 22px Gaegu, Pretendard, sans-serif"; lx.textAlign = "center"; lx.fillText("누가 뽑힐까요?", OUT.x, OUT.y + 4); }
  }
  function loop(t){
    const dt = Math.min(.033, (t - (lastT || t)) / 1000); lastT = t;
    if(LC.offsetParent !== null){
      mixing = Math.max(0, mixing - dt);
      physics(dt / 2); physics(dt / 2); render();
    }
    requestAnimationFrame(loop);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function tween(ms, fn){ return new Promise(done => { const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / ms); fn(k); if(k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }); }
  const ease = k => 1 - Math.pow(1 - k, 3);
  let rebuildT;
  drawInput.addEventListener("input", () => { clearTimeout(rebuildT); rebuildT = setTimeout(() => { if(!drawing){ shown = null; makeBalls(); } }, 400); });

  $("drawBtn").addEventListener("click", async () => {
    if(drawing) return;
    const names = uniq();
    if(!names.length) return toast("참여자 닉네임을 넣어 주세요");
    if(drawN > names.length) return toast("뽑을 사람 수가 참여자보다 많아요");
    for(let i = names.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    const win = names.slice(0, drawN);
    drawing = true; shown = null; $("drawResult").innerHTML = ""; $("drawBtn").disabled = true;
    makeBalls();
    mixing = reduce ? .2 : 1.8; await wait(reduce ? 200 : 1800);
    for(let w = 0; w < win.length; w++){
      if(w > 0 && !reduce){ mixing = .7; await wait(700); }
      const left = balls.filter(b => !b.out);
      const b = left.reduce((best, x) => (x.y > best.y ? x : best), left[0]); /* 맨 아래 공이 빠져나감 */
      b.out = true;
      const s = { x: b.x, y: b.y, r: b.r, c: b.c, label: b.label };
      shown = s;
      const neck = { x: CX, y: CY + DR + 14 };
      await tween(reduce ? 1 : 380, k => { const e = ease(k); s.x = b.x + (neck.x - b.x) * e; s.y = b.y + (neck.y - b.y) * e; });
      s.label = win[w];
      await tween(reduce ? 1 : 520, k => { const e = ease(k); s.y = neck.y + (OUT.y - neck.y) * e; s.r = b.r + (52 - b.r) * e; });
      const st = $("lottoStage"), rc = LC.getBoundingClientRect(), sr = st.getBoundingClientRect(), sc = rc.width / LC.width;
      K.burst(st, rc.left - sr.left + OUT.x * sc, rc.top - sr.top + OUT.y * sc, [BALL[s.c], "#ffd166", "#e4487e"], 14);
      const tag = document.createElement("span"); tag.style.setProperty("--c", BALL[s.c]); tag.style.setProperty("--ci", BALL_INK[s.c]);
      tag.textContent = win[w]; $("drawResult").appendChild(tag);
      if(w < win.length - 1) await wait(reduce ? 50 : 900);
    }
    if(win.length > 1) K.confetti($("lottoStage"));
    drawing = false; $("drawBtn").disabled = false;
  });
  makeBalls(); requestAnimationFrame(loop);

  /* ───────── 주사위 ───────── */
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  let diceN = 1, rolling = false;
  function face(v, cls){ let h = '<div class="die' + (cls ? " " + cls : "") + '" aria-label="주사위 ' + v + '">'; for(let i = 0; i < 9; i++) h += '<i' + (PIPS[v].includes(i) ? ' class="on' + (v === 1 ? " one" : "") + '"' : "") + '></i>'; return h + '</div>'; }
  const rnd = () => 1 + Math.floor(Math.random() * 6);
  function show(vals, cls){ $("dice").innerHTML = vals.map(v => face(v, cls)).join(""); }
  seg("diceSeg", n => { diceN = n; if(!rolling){ show(Array.from({ length: n }, () => 6)); $("diceTotal").textContent = ""; $("diceSum").textContent = ""; } });
  $("rollBtn").addEventListener("click", () => {
    if(rolling) return;
    rolling = true; $("diceTotal").textContent = ""; $("diceSum").textContent = "";
    const final = Array.from({ length: diceN }, rnd);
    let t = 0;
    const tick = () => {
      t++;
      if(t < (reduce ? 1 : 12)){ show(final.map(() => rnd()), "rolling"); setTimeout(tick, 55 + t * 8); return; }
      show(final, "land");
      const total = final.reduce((a, b) => a + b, 0);
      $("diceTotal").textContent = total;
      $("diceSum").textContent = diceN > 1 ? final.join(" + ") : "";
      rolling = false;
    };
    tick();
  });
  show([6]);
  window.__tools = { lines };
})();

/* ───────── 사다리타기 ───────── */
(function(){
  const { store, toast, esc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const cv = $("ladder"); if(!cv) return;
  const ctx = cv.getContext("2d");
  const COLORS = ["#e4487e", "#3b8fd9", "#2f9c6c", "#e08a1e", "#8b5cf6", "#d9467a", "#16a3a3", "#c2410c"];
  const LEVELS = 11;
  const lines = s => s.split("\n").map(x => x.trim()).filter(Boolean);
  let names, results, rungs, traced, anim = null;

  function load(){
    const s = store.get("tool-ladder", null) || { names: ["참가자 1", "참가자 2", "참가자 3", "참가자 4"], results: ["당첨", "꽝", "꽝", "꽝"] };
    setData(s.names, s.results);
  }
  function setData(n, r){
    names = n.slice(0, 8);
    results = names.map((_, i) => (r[i] || "꽝"));
    store.set("tool-ladder", { names, results });
    $("ladderNames").value = names.join("\n");
    $("ladderResults").value = results.join("\n");
  }
  /* 가로줄: rungs[level][gap] = true. 이웃한 칸에 연달아 놓지 않고, 칸마다 최소 하나 */
  function build(){
    const n = names.length, G = Math.max(0, n - 1);
    rungs = Array.from({ length: LEVELS }, () => new Array(G).fill(false));
    const free = (k, g) => !rungs[k][g] && !(g > 0 && rungs[k][g - 1]) && !(g < G - 1 && rungs[k][g + 1]);
    /* 칸마다 3~5개를 고르게 섞어서 배치 (앞 칸에만 몰리지 않게 순서를 섞음) */
    const want = Array.from({ length: G }, () => 3 + Math.floor(Math.random() * 3));
    const order = [];
    for(let g = 0; g < G; g++) for(let i = 0; i < want[g]; i++) order.push(g);
    for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach(g => {
      const ks = Array.from({ length: LEVELS }, (_, k) => k).sort(() => Math.random() - .5);
      const k = ks.find(k => free(k, g));
      if(k !== undefined) rungs[k][g] = true;
    });
    traced = {};
    if(anim){ cancelAnimationFrame(anim); anim = null; }
    renderRows(); draw(); summary();
  }
  /* 좌표 */
  const PAD = 70, TOP = 10, BOT = 10;
  const colX = i => names.length === 1 ? cv.width / 2 : PAD + i * (cv.width - PAD * 2) / (names.length - 1);
  const levY = k => TOP + (k + 0.5) * (cv.height - TOP - BOT) / LEVELS;
  function path(start){
    let c = start;
    const pts = [[colX(c), 0]];
    for(let k = 0; k < LEVELS; k++){
      const y = levY(k);
      if(rungs[k][c]){ pts.push([colX(c), y], [colX(c + 1), y]); c++; }
      else if(c > 0 && rungs[k][c - 1]){ pts.push([colX(c), y], [colX(c - 1), y]); c--; }
    }
    pts.push([colX(c), cv.height]);
    return { pts, end: c };
  }
  function draw(partial){
    const n = names.length;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#e4dcef"; ctx.lineWidth = 6;
    for(let i = 0; i < n; i++){ ctx.beginPath(); ctx.moveTo(colX(i), 0); ctx.lineTo(colX(i), cv.height); ctx.stroke(); }
    for(let k = 0; k < LEVELS; k++) for(let g = 0; g < n - 1; g++) if(rungs[k][g]){
      ctx.beginPath(); ctx.moveTo(colX(g), levY(k)); ctx.lineTo(colX(g + 1), levY(k)); ctx.stroke();
    }
    const strokeTrace = (pts, color, upto) => {
      ctx.strokeStyle = color; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      let left = upto;
      for(let i = 1; i < pts.length && left > 0; i++){
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], len = Math.hypot(x1 - x0, y1 - y0);
        if(left >= len){ ctx.lineTo(x1, y1); left -= len; }
        else { ctx.lineTo(x0 + (x1 - x0) * left / len, y0 + (y1 - y0) * left / len); left = 0; }
      }
      ctx.stroke();
      return left;
    };
    Object.keys(traced).forEach(s => { const t = traced[s]; strokeTrace(t.pts, COLORS[s % COLORS.length], Infinity); });
    if(partial){
      strokeTrace(partial.pts, COLORS[partial.start % COLORS.length], partial.len);
      const p = pointAt(partial.pts, partial.len);
      ctx.fillStyle = COLORS[partial.start % COLORS.length];
      ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p[0], p[1], 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function totalLen(pts){ let s = 0; for(let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  function pointAt(pts, d){
    for(let i = 1; i < pts.length; i++){
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], len = Math.hypot(x1 - x0, y1 - y0);
      if(d <= len) return [x0 + (x1 - x0) * d / len, y0 + (y1 - y0) * d / len];
      d -= len;
    }
    return pts[pts.length - 1];
  }
  function renderRows(){
    const n = names.length;
    const pos = i => (colX(i) / cv.width * 100) + "%";
    $("ladderTop").innerHTML = names.map((nm, i) =>
      '<button type="button" class="ladder-name" data-i="' + i + '" style="left:' + pos(i) + ';--c:' + COLORS[i % COLORS.length] + '">' + esc(nm) + '</button>').join("");
    $("ladderBottom").innerHTML = results.map((r, i) => {
      const owner = Object.keys(traced).find(s => traced[s].end === i);
      return '<span class="ladder-result' + (owner !== undefined ? " open" : "") + '" data-i="' + i + '" style="left:' + pos(i) + (owner !== undefined ? ';--c:' + COLORS[owner % COLORS.length] : "") + '">'
        + (owner !== undefined ? esc(r) : "?") + '</span>';
    }).join("");
    $("ladderStage").style.setProperty("--cols", n);
  }
  function summary(){
    const keys = Object.keys(traced).map(Number).sort((a, b) => a - b);
    $("ladderSummary").innerHTML = keys.map(s => '<span style="--c:' + COLORS[s % COLORS.length] + '"><b>' + esc(names[s]) + '</b> → ' + esc(results[traced[s].end]) + '</span>').join("");
  }
  function trace(start, fast){
    return new Promise(done => {
      if(traced[start]) return done();
      if(anim){ return done(); }
      const p = path(start), L = totalLen(p.pts);
      const speed = fast || K.reduced ? 2600 : 900; /* 초당 픽셀 */
      let t0 = null;
      const step = ts => {
        if(t0 === null) t0 = ts;
        const len = Math.min(L, (ts - t0) / 1000 * speed);
        draw({ pts: p.pts, len, start });
        if(len < L){ anim = requestAnimationFrame(step); return; }
        anim = null;
        traced[start] = { pts: p.pts, end: p.end };
        draw(); renderRows(); summary();
        const cell = $("ladderBottom").querySelector('[data-i="' + p.end + '"]');
        if(cell && !fast){ const st = $("ladderCard"), a = st.getBoundingClientRect(), b = cell.getBoundingClientRect();
          K.burst(st, b.left - a.left + b.width / 2, b.top - a.top + b.height / 2, [COLORS[start % COLORS.length], "#ffd166", "#fff1b8"], 10); }
        done();
      };
      anim = requestAnimationFrame(step);
    });
  }
  $("ladderTop").addEventListener("click", e => { const b = e.target.closest(".ladder-name"); if(b) trace(Number(b.dataset.i)); });
  $("ladderAll").addEventListener("click", async () => {
    for(let i = 0; i < names.length; i++){ if(!traced[i]) await trace(i, true); }
  });
  $("ladderNew").addEventListener("click", build);
  $("ladderApply").addEventListener("click", () => {
    const n = Array.from(new Set(lines($("ladderNames").value)));
    if(n.length < 2) return toast("참가자를 두 명 이상 적어 주세요");
    if(n.length > 8) return toast("참가자는 8명까지예요");
    setData(n, lines($("ladderResults").value));
    build();
    $("ladderCard").querySelector("details").open = false;
    toast("새 사다리를 만들었어요");
  });
  window.__ladder = { path: s => path(s).end, names: () => names.slice(), results: () => results.slice() };
  load(); build();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw());
})();

/* ───────── 도구 탭 ───────── */
(function(){
  const tabs = document.getElementById("toolTabs"); if(!tabs) return;
  const { store } = window.CM;
  const names = ["wheel", "draw", "dice", "ladder"];
  function show(name, push){
    if(!names.includes(name)) name = "wheel";
    tabs.querySelectorAll("[data-tool]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tool === name)));
    document.querySelectorAll(".tool-panel").forEach(p => { p.hidden = p.dataset.panel !== name; });
    store.set("tool-tab", name);
    if(push) history.replaceState(null, "", "#" + name);
    window.dispatchEvent(new Event("resize"));
  }
  tabs.addEventListener("click", e => { const b = e.target.closest("[data-tool]"); if(b) show(b.dataset.tool, true); });
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || store.get("tool-tab", "wheel"));
})();
