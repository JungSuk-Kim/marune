/* 시그 · 자료실 · 공약현황 · 놀이터 목록 페이지 */
(function(){
  const { esc, url, pc, ico, asset, sampleChip, vodCard, fetchVods, S } = window.CM;
  const page = document.body.dataset.page;
  const $ = id => document.getElementById(id);

  /* 탭 만들기: 고르면 onPick(값) 호출. 첫 탭은 "전체" */
  function tabs(el, names, onPick){
    const all = ["전체"].concat(names);
    el.innerHTML = all.map((n, i) => '<button type="button" aria-pressed="' + (i === 0) + '">' + esc(n) + '</button>').join("");
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      el.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      onPick(b.textContent === "전체" ? null : b.textContent);
    });
    onPick(null);
  }

  /* ── 시그 ── */
  if(page === "sig"){
    const D = window.SIGS || { items: [], categories: [] };
    $("sampleChip").innerHTML = sampleChip(D.sample);
    const items = D.items.slice().sort((a, b) => a.count - b.count);
    tabs($("tabs"), D.categories || [], cat => {
      const list = items.filter(x => !cat || x.category === cat);
      $("list").innerHTML = list.length ? list.map(s =>
        '<article class="sig"><div class="sig-art"' + (s.image ? ' style="background-image:url(&quot;' + esc(asset(s.image)) + '&quot;)"' : "") + '>' + (s.image ? "" : pc(s.icon || 6)) + '</div>'
        + '<div class="sig-top"><span class="count num">' + Number(s.count).toLocaleString() + '<small>개</small></span><span class="chip">' + esc(s.category) + '</span></div>'
        + '<b>' + esc(s.name) + '</b><p>' + esc(s.desc || "") + '</p></article>').join("")
        : '<p class="empty">등록된 시그가 없어요</p>';
    });
  }

  /* ── 자료실 ── */
  if(page === "archive"){
    const D = window.ARCHIVE || { items: [], categories: [] };
    $("sampleChip").innerHTML = sampleChip(D.sample);
    const TINTS = ["#fbe3e9", "#fdebd6", "#e2f1e6", "#ece6f8"];
    const AUTO = { "캐치": "catch", "클립": "clip" };
    let vodState = null;
    async function loadVods(type, page){
      const more = $("moreBtn");
      if(page === 1){ $("list").innerHTML = '<p class="empty">불러오는 중…</p>'; }
      more.disabled = true;
      const d = await fetchVods(type, page, 12);
      if(page === 1) $("list").innerHTML = "";
      if(!d){
        $("list").innerHTML = '<p class="empty">' + (location.protocol.startsWith("http") ? "영상을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." : "사이트를 배포한 뒤에 " + esc(S.streamer) + " 방송국 " + (type === "catch" ? "캐치" : "클립") + " 영상이 여기에 보여요.") + '</p>';
        more.hidden = true; return;
      }
      $("list").insertAdjacentHTML("beforeend", d.items.map(vodCard).join("") || (page === 1 ? '<p class="empty">영상이 없어요</p>' : ""));
      $("sampleChip").innerHTML = '<span class="chip leaf">SOOP 자동 · ' + d.total + '개</span>';
      vodState = { type, page, last: d.lastPage };
      more.hidden = page >= d.lastPage; more.disabled = false;
    }
    $("moreBtn").addEventListener("click", () => { if(vodState) loadVods(vodState.type, vodState.page + 1); });
    tabs($("tabs"), (D.categories || []).concat(Object.keys(AUTO)), cat => {
      $("list").classList.toggle("catch-grid", cat === "캐치");
      if(AUTO[cat]) return loadVods(AUTO[cat], 1);
      vodState = null; $("moreBtn").hidden = true;
      $("sampleChip").innerHTML = sampleChip(D.sample);
      const list = D.items.filter(x => !cat || x.category === cat);
      $("list").innerHTML = list.length ? list.map((v, i) => {
        const thumb = v.image ? asset(v.image) : (v.youtube ? "https://i.ytimg.com/vi/" + encodeURIComponent(v.youtube) + "/mqdefault.jpg" : "");
        const style = thumb ? 'background-image:url(&quot;' + esc(thumb) + '&quot;)' : "background-color:" + TINTS[i % 4];
        const inner = '<div class="thumb" style="' + style + '"><span class="kind">' + esc(v.category) + '</span>' + (thumb ? "" : pc(v.icon || 6))
          + (v.youtube ? '<span class="play"><svg class="ico"><use href="#i-play"/></svg></span>' : "") + '</div>'
          + '<div class="c-text">' + esc(v.title) + '<small>' + esc(v.date || "") + '</small></div>';
        if(v.youtube) return '<a class="card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.youtube) + '" target="_blank" rel="noopener">' + inner + '</a>';
        if(v.image) return '<a class="card" href="' + esc(asset(v.image)) + '" target="_blank" rel="noopener">' + inner + '</a>';
        return '<div class="card">' + inner + '</div>';
      }).join("") : '<p class="empty">등록된 자료가 없어요</p>';
    });
  }

  /* ── 공약현황 ── */
  if(page === "promise"){
    const D = window.PROMISES || { items: [] };
    $("sampleChip").innerHTML = sampleChip(D.sample);
    const row = p => {
      const pct = Math.min(100, Math.round((p.now || 0) / (p.goal || 1) * 100));
      return '<div><div class="p-top"><span><b>' + esc(p.title) + '</b></span><span class="num">'
        + (p.done ? "달성 완료" : Number(p.now).toLocaleString() + " / " + Number(p.goal).toLocaleString() + esc(p.unit || "") + " · " + pct + "%") + '</span></div>'
        + '<div class="bar' + (p.done ? " done" : "") + '"><i style="width:' + pct + '%"></i></div>'
        + (p.note ? '<p class="p-note">' + esc(p.note) + '</p>' : "") + '</div>';
    };
    const open = D.items.filter(p => !p.done), done = D.items.filter(p => p.done);
    $("openList").innerHTML = open.length ? open.map(row).join("") : '<p class="empty">진행 중인 공약이 없어요</p>';
    $("doneList").innerHTML = done.length ? done.map(row).join("") : '<p class="empty">아직 완료한 공약이 없어요</p>';
    $("openCount").textContent = open.length + "건";
    $("doneCount").textContent = done.length + "건";
  }

  /* ── 놀이터 목록 ── */
  if(page === "play"){
    $("list").innerHTML = window.GAMES.map(g =>
      '<a class="game-card" href="' + url(g.href) + '"><div class="g-art">' + pc(g.icon) + '</div>'
      + '<b>' + esc(g.name) + '</b><p>' + esc(g.desc) + '</p>'
      + '<div class="g-foot"><span>내 최고 기록 <b class="num" style="display:inline;font-size:11px;color:var(--ink)">' + esc(window.GameKit.bestText(g.id)) + '</b></span>' + ico("arrow") + '</div></a>').join("");
  }
})();
