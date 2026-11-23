/* 방송 도구: 룰렛 · 추첨(로또) · 주사위 · 사다리. 방송 화면에 띄워 놓고 쓰는 용도 */
(function(){
  const { S, store, toast, asset, esc } = window.CM, K = window.GameKit;
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
  let drawMode = store.get("tool-draw-mode", "num");
  const maxN = () => Math.max(2, Math.min(100, Math.round(Number($("drawMax").value) || 45)));
  /* 지금 방식의 추첨 대상: 번호 목록과(닉네임 방식이면) 이름 */
  const pool = () => drawMode === "num" ? { nums: Array.from({ length: maxN() }, (_, i) => i + 1), names: null }
    : (n => ({ nums: n.map((_, i) => i + 1), names: n }))(uniq());
  const info = () => { const n = pool().nums.length; $("drawInfo").textContent = n ? (drawMode === "num" ? "공 " + n + "개" : n + "명") : ""; };
  drawInput.addEventListener("input", () => { store.set("tool-draw", drawInput.value); info(); });
  $("drawMax").value = store.get("tool-draw-max", 45);
  function setMode(m){
    drawMode = m; store.set("tool-draw-mode", m);
    $("drawMode").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
    $("drawNumBox").hidden = m !== "num"; drawInput.hidden = m === "num";
    info(); if(typeof makeBalls === "function" && !drawing) makeBalls();
  }
  $("drawMode").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if(b) setMode(b.dataset.m); });
  function seg(id, set){
    $(id).addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      $(id).querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      set(Number(b.dataset.n));
    });
  }
  seg("drawSeg", n => { drawN = n; });
  /* 로또 추첨기: 무대 위 유리 구슬통. 공이 섞이다가 위쪽 관으로 빨려 올라가 오른쪽 레일에 쌓임 */
  const LC = $("lotto"), lx = LC.getContext("2d");
  const GROUP = [["#ffc928", "#b47d00"], ["#5ab8f0", "#1d6fa3"], ["#ff6b6b", "#b3262f"], ["#a9a7b8", "#5c5a6e"], ["#9fd34a", "#4f7d13"]];
  const colOf = num => GROUP[Math.floor((num - 1) / 10) % 5];
  const CX = 280, CY = 318, DR = 210, TB = 22; let BR = 22;
  const RAILX = 648, RAILTOP = 92, RAILBOT = 566;
  const TUBE = [[CX, CY - DR + 6], [CX, 40], [RAILX - 30, 40], [RAILX, 70], [RAILX, RAILBOT]];
  let balls = [], rail = [], mixing = 0, lspin = 0, moving = null, lastT = 0;
  function makeBalls(){
    const P = pool();
    const nums = P.nums.length ? P.nums : Array.from({ length: 30 }, (_, i) => i + 1);
    BR = nums.length > 70 ? 15 : nums.length > 45 ? 18 : 22;
    balls = nums.map(num => {
      const a = Math.random() * Math.PI, d = Math.random() * (DR - BR - 30);
      return { x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d * .9 + 20, vx: 0, vy: 0, num };
    });
    rail = []; moving = null;
  }
  function physics(dt){
    const g = 1600, m = DR - 8 - BR;
    for(const b of balls){
      b.vy += g * dt;
      if(mixing > 0){
        const low = Math.max(0, (b.y - CY) / DR);
        b.vx += (Math.random() - .5) * 11000 * dt + (b.y > CY ? -(b.x - CX) * 8 * dt : 0) * 60;
        b.vy -= (1800 + 5200 * low) * Math.random() * dt * 1.8;
      } else if(Math.random() < .015){ b.vx += (Math.random() - .5) * 90; b.vy -= Math.random() * 120; }
      const sp = Math.hypot(b.vx, b.vy); if(sp > 1700){ b.vx *= 1700 / sp; b.vy *= 1700 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dx = b.x - CX, dy = b.y - CY, d = Math.hypot(dx, dy);
      if(d > m){
        const nx = dx / d, ny = dy / d; b.x = CX + nx * m; b.y = CY + ny * m;
        const vn = b.vx * nx + b.vy * ny; if(vn > 0){ b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.vx *= .99; }
      }
    }
    for(let i = 0; i < balls.length; i++) for(let j = i + 1; j < balls.length; j++){
      const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if(d2 < 4 * BR * BR){
        const d = Math.sqrt(d2) || .01, nx = dx / d, ny = dy / d, o = (2 * BR - d) / 2;
        a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if(rv < 0){ const k = -.92 * rv; a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny; }
      }
    }
  }
  function ball(x, y, r, num){
    const [c, d] = colOf(num);
    lx.save();
    lx.shadowColor = "rgba(0,0,0,.35)"; lx.shadowBlur = r * .5; lx.shadowOffsetY = r * .18;
    const g = lx.createRadialGradient(x - r * .38, y - r * .42, r * .05, x, y, r * 1.05);
    g.addColorStop(0, "#ffffff"); g.addColorStop(.18, c); g.addColorStop(.85, d); g.addColorStop(1, d);
    lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, Math.PI * 2); lx.fill();
    lx.restore();
    lx.fillStyle = "#fff"; lx.beginPath(); lx.arc(x, y + r * .02, r * .56, 0, Math.PI * 2); lx.fill();
    lx.fillStyle = d; lx.textAlign = "center"; lx.textBaseline = "middle";
    lx.font = "800 " + Math.round(r * (num > 99 ? .5 : .66)) + "px Pretendard, sans-serif";
    lx.fillText(String(num), x, y + r * .06);
    lx.fillStyle = "rgba(255,255,255,.75)"; lx.beginPath(); lx.ellipse(x - r * .42, y - r * .5, r * .2, r * .12, -.6, 0, Math.PI * 2); lx.fill();
  }
  const chrome = (x0, x1) => { const g = lx.createLinearGradient(x0, 0, x1, 0);
    [[0, "#6f6a86"], [.22, "#f7f5fb"], [.45, "#9d98b3"], [.7, "#e9e6f2"], [1, "#5d5874"]].forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  function tubePath(){ lx.beginPath(); lx.moveTo(TUBE[0][0], TUBE[0][1]); lx.lineTo(CX, 70); lx.arcTo(CX, 40, CX + 30, 40, 30); lx.arcTo(RAILX, 40, RAILX, 70, 30); lx.lineTo(RAILX, RAILBOT); }
  function render(){
    const W = LC.width, H = LC.height;
    lx.clearRect(0, 0, W, H);
    /* 관 (구슬통 위에서 오른쪽 레일까지) */
    lx.lineCap = "round"; lx.lineJoin = "round";
    tubePath(); lx.strokeStyle = "rgba(255,255,255,.26)"; lx.lineWidth = TB * 2 + 14; lx.stroke();
    lx.save(); lx.globalCompositeOperation = "destination-out"; tubePath(); lx.lineWidth = TB * 2 + 8; lx.stroke(); lx.restore();
    tubePath(); lx.strokeStyle = "rgba(255,255,255,.07)"; lx.lineWidth = TB * 2 + 8; lx.stroke();
    tubePath(); lx.strokeStyle = "rgba(255,255,255,.35)"; lx.lineWidth = 2; lx.setLineDash([]); lx.save(); lx.translate(-BR + 2, 0); lx.restore();
    /* 레일 받침 */
    lx.fillStyle = chrome(RAILX - 40, RAILX + 40); roundRect(RAILX - 40, RAILBOT + 18, 80, 16, 8); lx.fill();
    /* 받침대 */
    lx.fillStyle = chrome(CX - 46, CX + 46); lx.fillRect(CX - 34, CY + DR - 14, 68, 70);
    lx.fillStyle = chrome(CX - 150, CX + 150); lx.beginPath(); lx.ellipse(CX, H - 20, 150, 16, 0, 0, Math.PI * 2); lx.fill();
    lx.fillStyle = chrome(CX - 90, CX + 90); lx.beginPath(); lx.moveTo(CX - 40, CY + DR + 40); lx.lineTo(CX + 40, CY + DR + 40); lx.lineTo(CX + 120, H - 22); lx.lineTo(CX - 120, H - 22); lx.closePath(); lx.fill();
    /* 유리통 뒷면 */
    const bg = lx.createRadialGradient(CX - 70, CY - 90, 20, CX, CY, DR);
    bg.addColorStop(0, "rgba(255,255,255,.16)"); bg.addColorStop(.7, "rgba(255,255,255,.05)"); bg.addColorStop(1, "rgba(190,170,255,.22)");
    lx.fillStyle = bg; lx.beginPath(); lx.arc(CX, CY, DR, 0, Math.PI * 2); lx.fill();
    /* 회전 날개 */
    lx.save(); lx.translate(CX, CY + DR - 46); lx.rotate(lspin);
    lx.fillStyle = chrome(-60, 60);
    for(let k = 0; k < 3; k++){ lx.rotate(Math.PI * 2 / 3); roundRect(-6, -58, 12, 58, 6); lx.fill(); }
    lx.restore();
    lx.fillStyle = chrome(CX - 16, CX + 16); lx.beginPath(); lx.arc(CX, CY + DR - 46, 14, 0, Math.PI * 2); lx.fill();
    /* 공 */
    for(const b of balls) ball(b.x, b.y, BR, b.num);
    /* 유리통 앞면 */
    lx.lineWidth = 4; lx.strokeStyle = "rgba(255,255,255,.55)"; lx.beginPath(); lx.arc(CX, CY, DR, 0, Math.PI * 2); lx.stroke();
    const rim = lx.createRadialGradient(CX, CY, DR - 34, CX, CY, DR);
    rim.addColorStop(0, "rgba(255,255,255,0)"); rim.addColorStop(1, "rgba(255,255,255,.2)");
    lx.fillStyle = rim; lx.beginPath(); lx.arc(CX, CY, DR, 0, Math.PI * 2); lx.fill();
    lx.save(); lx.translate(CX - DR * .45, CY - DR * .5); lx.rotate(-.75);
    const hl = lx.createLinearGradient(0, -40, 0, 40); hl.addColorStop(0, "rgba(255,255,255,.5)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    lx.fillStyle = hl; lx.beginPath(); lx.ellipse(0, 0, 78, 30, 0, 0, Math.PI * 2); lx.fill(); lx.restore();
    lx.strokeStyle = "rgba(255,255,255,.35)"; lx.lineWidth = 5; lx.beginPath(); lx.arc(CX, CY, DR - 16, .15, .75); lx.stroke();
    /* 위·아래 크롬 고리 */
    lx.fillStyle = chrome(CX - 44, CX + 44); roundRect(CX - 40, CY - DR - 10, 80, 22, 8); lx.fill();
    lx.fillStyle = chrome(CX - 54, CX + 54); roundRect(CX - 50, CY + DR - 14, 100, 24, 10); lx.fill();
    /* 레일에 쌓인 공 */
    rail.forEach(r => ball(RAILX, r.y, TB, r.num));
    if(moving) ball(moving.x, moving.y, moving.r, moving.num);
  }
  function roundRect(x, y, w, h, r){ lx.beginPath(); lx.moveTo(x + r, y); lx.arcTo(x + w, y, x + w, y + h, r); lx.arcTo(x + w, y + h, x, y + h, r); lx.arcTo(x, y + h, x, y, r); lx.arcTo(x, y, x + w, y, r); lx.closePath(); }
  function loop(t){
    const dt = Math.min(.033, (t - (lastT || t)) / 1000); lastT = t;
    if(LC.offsetParent !== null){
      mixing = Math.max(0, mixing - dt);
      lspin += dt * (mixing > 0 ? 14 : .6);
      physics(dt / 3); physics(dt / 3); physics(dt / 3); render();
    }
    requestAnimationFrame(loop);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function tween(ms, fn){ return new Promise(done => { const t0 = performance.now(); const f = now => { const k = ms <= 1 ? 1 : Math.min(1, (now - t0) / ms); fn(k); if(k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }); }
  /* 폴리라인 위를 일정한 속도로 이동 */
  function along(pts, speed, onStep){
    const segs = []; let total = 0;
    for(let i = 1; i < pts.length; i++){ const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
    return tween(total / speed * 1000, k => {
      let d = k * k * (3 - 2 * k) * total;
      for(let i = 0; i < segs.length; i++){
        if(d <= segs[i] || i === segs.length - 1){ const f = Math.min(1, d / segs[i]); onStep(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f); return; }
        d -= segs[i];
      }
    });
  }
  const reveal = $("lottoReveal");
  function showReveal(num, name){
    const [c, d] = colOf(num);
    reveal.innerHTML = '<div class="lr-card"><span class="lball" style="--c:' + c + ';--d:' + d + '"><b>' + num + '</b></span>' + (name ? '<span class="lr-name">' + esc(name) + '</span>' : '') + '</div>';
    reveal.classList.add("on");
  }
  let rebuildT;
  drawInput.addEventListener("input", () => { clearTimeout(rebuildT); rebuildT = setTimeout(() => { if(!drawing) makeBalls(); }, 400); });

  $("drawBtn").addEventListener("click", async () => {
    if(drawing) return;
    const P = pool(), names = P.names;
    if(!P.nums.length) return toast("참여자 닉네임을 넣어 주세요");
    if(drawN > P.nums.length) return toast(names ? "뽑을 사람 수가 참여자보다 많아요" : "공 개수보다 많이 뽑을 수 없어요");
    const idx = P.nums.map((_, i) => i);
    for(let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const win = idx.slice(0, drawN);
    drawing = true; $("drawResult").innerHTML = ""; $("drawBtn").disabled = true; reveal.classList.remove("on");
    makeBalls();
    mixing = reduce ? .2 : 2.2; await wait(reduce ? 200 : 2200);
    for(let w = 0; w < win.length; w++){
      if(w > 0 && !reduce){ mixing = .9; await wait(900); }
      const num = win[w] + 1;
      /* 관 입구에 가장 가까운 공을 당첨 번호로 */
      const top = [CX, CY - DR + 30];
      let b = balls.find(x => x.num === num);
      if(!b){ b = balls.reduce((best, x) => Math.hypot(x.x - top[0], x.y - top[1]) < Math.hypot(best.x - top[0], best.y - top[1]) ? x : best, balls[0]); b.num = num; }
      balls = balls.filter(x => x !== b);
      moving = { x: b.x, y: b.y, num, r: BR };
      const slotY = RAILBOT - TB - 4 - rail.length * (TB * 2 + 6), r0 = BR;
      await along([[b.x, b.y], [CX, CY - DR + 10], [CX, 70], [CX + 9, 49], [CX + 30, 40], [RAILX - 30, 40], [RAILX - 9, 49], [RAILX, 70], [RAILX, slotY]], reduce ? 6000 : 1500, (x, y) => { moving.x = x; moving.y = y; moving.r = Math.min(TB, moving.r + .25); });
      rail.push({ num, y: slotY }); moving = null;
      const st = $("lottoStage"), rc = LC.getBoundingClientRect(), sr = st.getBoundingClientRect(), sc = rc.width / LC.width;
      K.burst(st, rc.left - sr.left + RAILX * sc, rc.top - sr.top + slotY * sc, [colOf(num)[0], "#ffd166", "#fff"], 12);
      showReveal(num, names ? names[win[w]] : null);
      const [c, d] = colOf(num);
      const tag = document.createElement("span"); tag.style.setProperty("--c", c); tag.style.setProperty("--d", d);
      tag.innerHTML = '<i>' + num + '</i>' + (names ? esc(names[win[w]]) : num + "번"); $("drawResult").appendChild(tag);
      await wait(reduce ? 300 : 1500);
      if(w < win.length - 1) reveal.classList.remove("on");
    }
    if(win.length > 1) K.confetti($("lottoStage"));
    drawing = false; $("drawBtn").disabled = false;
  });
  reveal.addEventListener("click", () => reveal.classList.remove("on"));
  const applyMax = () => { const v = maxN(); $("drawMax").value = v; store.set("tool-draw-max", v); info(); if(!drawing) makeBalls(); };
  $("drawMax").addEventListener("change", applyMax);
  $("drawQuick").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(b){ $("drawMax").value = b.dataset.v; applyMax(); } });
  setMode(drawMode); requestAnimationFrame(loop);

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

/* ───────── 추억의 뽑기 (문방구 종이 뽑기판) ───────── */
(function(){
  const { store, toast, esc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const grid = $("ppGrid"); if(!grid) return;
  const RANK = ["#ffc928", "#ff86ad", "#6cc3f5", "#9fd34a", "#c3a4f5", "#ffa45c"];
  const PAPER = ["#ffd9e6", "#fff0b3", "#d4f2e4", "#dfe9ff", "#ffe2cc", "#eadcff"];
  const LOSE = ["꽝", "꽝! 다음 기회에", "아쉽다, 꽝", "꽝… 한 번 더?", "꽝이에요"];
  const DEF = { items: [{ name: "애교 한 번", count: 1 }, { name: "노래 신청권", count: 2 }, { name: "칭찬 한마디", count: 3 }, { name: "닉네임 불러주기", count: 5 }], size: 50 };
  let st = store.get("tool-ppopgi", null), busy = false;
  const parse = text => text.split("\n").map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*?)\s*[xX×*]\s*(\d+)\s*$/);
    return m ? { name: m[1].trim() || "상품", count: Math.max(1, Math.min(99, Number(m[2]))) } : { name: s, count: 1 };
  }).slice(0, 6);
  function deal(items, size){
    const total = items.reduce((a, b) => a + b.count, 0);
    if(total > size) return toast("상품 개수가 뽑기 장수보다 많아요"), false;
    const prizes = [];
    items.forEach((it, i) => { for(let k = 0; k < it.count; k++) prizes.push(i); });
    while(prizes.length < size) prizes.push(-1);
    for(let i = prizes.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [prizes[i], prizes[j]] = [prizes[j], prizes[i]]; }
    st = { v: 2, items, size, t: prizes.map(p => ({ p, o: 0, c: Math.floor(Math.random() * PAPER.length), r: Math.round((Math.random() - .5) * 8) })) };
    save(); return true;
  }
  const save = () => store.set("tool-ppopgi", st);
  const left = i => st.items[i].count - st.t.filter(x => x.o && x.p === i).length;
  function render(){
    $("ppPrizes").innerHTML = st.items.map((it, i) => {
      const l = left(i);
      return '<li class="' + (l ? "" : "gone") + '" style="--c:' + RANK[i] + '"><b>' + (i + 1) + '등</b><span>' + esc(it.name) + '</span><em>' + l + '/' + it.count + '</em></li>';
    }).join("");
    const rest = st.t.filter(x => !x.o).length;
    $("ppLeft").textContent = rest ? "남은 뽑기 " + rest + "장 · 한 장씩 뜯어 보세요" : "다 뜯었어요! 새 판을 깔아 주세요";
    grid.style.setProperty("--cols", st.size >= 100 ? 10 : st.size >= 50 ? 10 : 6);
    grid.innerHTML = st.t.map((x, i) => x.o
      ? '<span class="pp-t torn' + (x.p >= 0 ? " win" : "") + '" style="--c:' + (x.p >= 0 ? RANK[x.p] : "#cfc8da") + '">' + (x.p >= 0 ? (x.p + 1) + "등" : "꽝") + '</span>'
      : '<button type="button" class="pp-t" data-i="' + i + '" style="--c:' + PAPER[x.c] + ';--r:' + x.r + 'deg" aria-label="' + (i + 1) + '번 뽑기"><span>' + (i + 1) + '</span></button>').join("");
    $("ppItems").value = st.items.map(it => it.name + " x " + it.count).join("\n");
    $("ppSize").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.n) === st.size)));
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  grid.addEventListener("click", async e => {
    const b = e.target.closest(".pp-t[data-i]"); if(!b || busy) return;
    busy = true;
    const i = Number(b.dataset.i), x = st.t[i];
    b.classList.add("rip");
    await wait(K.reduced ? 0 : 260);
    x.o = 1; if(x.p < 0) x.m = LOSE[Math.floor(Math.random() * LOSE.length)];
    save(); render();
    const win = x.p >= 0, ov = $("ppOpen");
    ov.innerHTML = '<div class="pp-paper' + (win ? " win" : "") + '" style="--c:' + PAPER[x.c] + ';--rc:' + (win ? RANK[x.p] : "#8d86a0") + '">'
      + '<div class="pp-in"><small>' + (i + 1) + '번</small>' + (win ? '<b>' + (x.p + 1) + '등</b><em>' + esc(st.items[x.p].name) + '</em>' : '<b class="lose">' + esc(x.m) + '</b>') + '</div>'
      + '<i class="flap l"></i><i class="flap r"></i></div><p class="pp-hint">화면을 누르면 닫혀요</p>';
    ov.classList.add("on");
    await wait(K.reduced ? 50 : 750);
    ov.querySelector(".pp-paper").classList.add("open");
    await wait(K.reduced ? 50 : 650);
    if(win){
      const bd = $("ppBoard"), a = bd.getBoundingClientRect(), p = ov.querySelector(".pp-paper").getBoundingClientRect();
      K.burst(bd, p.left - a.left + p.width / 2, p.top - a.top + p.height / 2, [RANK[x.p], "#ffd166", "#fff"], 18);
      if(x.p === 0) K.confetti(bd);
    }
    if(!st.t.some(t => !t.o)) toast("뽑기판을 다 뜯었어요!");
    busy = false;
  });
  $("ppOpen").addEventListener("click", () => { if(!busy) $("ppOpen").classList.remove("on"); });
  $("ppNew").addEventListener("click", () => { if(busy) return; if(deal(st.items, st.size)){ $("ppOpen").classList.remove("on"); render(); toast("새 뽑기판을 깔았어요"); } });
  $("ppSize").addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; $("ppSize").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  $("ppApply").addEventListener("click", () => {
    const items = parse($("ppItems").value);
    if(!items.length) return toast("상품을 한 개 이상 적어 주세요");
    const sel = $("ppSize").querySelector('[aria-pressed="true"]'), size = sel ? Number(sel.dataset.n) : st.size;
    if(deal(items, size)){ $("ppCard").querySelector("details").open = false; $("ppOpen").classList.remove("on"); render(); toast("새 뽑기판을 깔았어요"); }
  });
  if(!st || !st.t || st.v !== 2) deal(DEF.items, DEF.size);
  render();
  window.__pp = () => st;
})();

/* ───────── 도구 탭 ───────── */
(function(){
  const tabs = document.getElementById("toolTabs"); if(!tabs) return;
  const { store } = window.CM;
  const names = ["wheel", "draw", "dice", "ladder", "ppopgi"];
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
