/* 방송 도구: 룰렛 · 추첨 · 주사위. 방송 화면에 띄워 놓고 쓰는 용도 */
(function(){
  const { store, toast } = window.CM;
  const $ = id => document.getElementById(id);
  const lines = el => el.value.split("\n").map(s => s.trim()).filter(Boolean);

  /* ── 룰렛 ── */
  const COLORS = ["#f6a5ba", "#fdd9a8", "#bfe3c9", "#c9bdf2", "#a9d3f5", "#fbe38e", "#f3b6d6", "#b9e6e0"];
  const cv = $("wheel"), ctx = cv.getContext("2d");
  const wheelInput = $("wheelItems");
  wheelInput.value = store.get("tool-wheel", "치킨\n피자\n벌칙 면제\n노래 한 곡\n애교 한 번\n꽝");
  let angle = 0, spinning = false;
  function drawWheel(){
    const items = lines(wheelInput), n = items.length, R = cv.width / 2;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if(!n){ ctx.fillStyle = "#f1dfe5"; ctx.beginPath(); ctx.arc(R, R, R - 4, 0, Math.PI * 2); ctx.fill(); return; }
    const step = Math.PI * 2 / n;
    items.forEach((t, i) => {
      const a0 = -Math.PI / 2 + i * step;
      ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 4, a0, a0 + step); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(R, R); ctx.rotate(a0 + step / 2);
      ctx.fillStyle = "#3a1f2b"; ctx.font = "600 " + Math.max(13, Math.min(22, 200 / n + 8)) + "px Pretendard, sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(t.length > 9 ? t.slice(0, 8) + "…" : t, R - 22, 0);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(R, R, 26, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.strokeStyle = "#f1dfe5"; ctx.lineWidth = 2; ctx.stroke();
  }
  wheelInput.addEventListener("input", () => { store.set("tool-wheel", wheelInput.value); drawWheel(); });
  $("spinBtn").addEventListener("click", () => {
    const items = lines(wheelInput);
    if(items.length < 2) return toast("항목을 두 개 이상 적어 주세요");
    if(spinning) return;
    spinning = true; $("wheelResult").textContent = "";
    const pick = Math.floor(Math.random() * items.length), step = 360 / items.length;
    /* 고른 칸의 가운데가 위쪽 바늘에 오도록 회전 */
    const target = 360 - (pick * step + step / 2) + (Math.random() - 0.5) * step * 0.7;
    angle = Math.ceil(angle / 360) * 360 + 360 * 5 + target;
    cv.style.transform = "rotate(" + angle + "deg)";
    const done = () => { spinning = false; $("wheelResult").textContent = items[pick]; };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(done, reduce ? 50 : 4300);
  });
  drawWheel();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);

  /* ── 추첨 ── */
  const drawInput = $("drawNames");
  drawInput.value = store.get("tool-draw", "");
  drawInput.addEventListener("input", () => store.set("tool-draw", drawInput.value));
  $("drawBtn").addEventListener("click", () => {
    const names = Array.from(new Set(lines(drawInput)));
    const n = Math.max(1, Math.min(Number($("drawCount").value) || 1, 20));
    if(!names.length) return toast("이름을 한 줄에 하나씩 적어 주세요");
    if(n > names.length) return toast("뽑을 사람 수가 이름 수보다 많아요");
    for(let i = names.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
    $("drawInfo").textContent = names.length + "명 중 " + n + "명";
    $("drawResult").innerHTML = "";
    names.slice(0, n).forEach(name => { const s = document.createElement("span"); s.textContent = name; $("drawResult").appendChild(s); });
  });

  /* ── 주사위 ── */
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function die(v){ let h = '<div class="die roll" aria-label="주사위 ' + v + '">'; for(let i = 0; i < 9; i++) h += '<i' + (PIPS[v].includes(i) ? ' class="on"' : "") + '></i>'; return h + '</div>'; }
  function roll(){
    const n = Number($("diceCount").value) || 1, vals = [];
    for(let i = 0; i < n; i++) vals.push(1 + Math.floor(Math.random() * 6));
    $("dice").innerHTML = vals.map(die).join("");
    $("diceResult").innerHTML = vals.reduce((a, b) => a + b, 0) + (n > 1 ? '<small>' + vals.join(" + ") + '</small>' : "");
  }
  $("rollBtn").addEventListener("click", roll);
  $("dice").innerHTML = die(6);
  window.__tools = { lines };
})();
