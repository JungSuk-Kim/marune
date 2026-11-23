/* 방송 도구: 룰렛 · 추첨 · 주사위. 방송 화면에 띄워 놓고 쓰는 용도 */
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
  $("drawBtn").addEventListener("click", () => {
    if(drawing) return;
    const names = uniq();
    if(!names.length) return toast("참여자 닉네임을 넣어 주세요");
    if(drawN > names.length) return toast("뽑을 사람 수가 참여자보다 많아요");
    for(let i = names.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    const win = names.slice(0, drawN);
    drawing = true; $("drawResult").innerHTML = ""; $("drawSlot").classList.add("rolling");
    let t = 0;
    const tick = () => {
      $("drawSlotText").textContent = names[Math.floor(Math.random() * names.length)];
      t += 1;
      if(t < (reduce ? 1 : 22)) setTimeout(tick, 40 + t * 6);
      else {
        $("drawSlot").classList.remove("rolling");
        $("drawSlotText").textContent = win.length === 1 ? win[0] : win.length + "명 당첨!";
        win.forEach((name, i) => setTimeout(() => {
          const s = document.createElement("span"); s.textContent = name; $("drawResult").appendChild(s);
        }, i * 160));
        const r = $("drawSlot").getBoundingClientRect(), st = $("drawSlot").parentElement.getBoundingClientRect();
        K.burst($("drawSlot").parentElement, r.left - st.left + r.width / 2, r.top - st.top + r.height / 2, null, 14);
        drawing = false;
      }
    };
    tick();
  });

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
