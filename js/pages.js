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
    $("sampleChip").innerHTML = sampleChip(D.sample) + (D.note ? '<span class="sec-sub">' + esc(D.note) + '</span>' : "");
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
    /* 예시(sample: true) 상태의 자료는 실제 사이트에 보이지 않게 함 */
    const own = D.sample ? [] : D.items;
    const ownCats = (D.categories || []).filter(c => own.some(x => x.category === c));
    const AUTO = { "유튜브": "yt", "캐치": "catch", "클립": "clip" };
    const live = location.protocol.startsWith("http");
    const TINTS = ["#fbe3e9", "#fdebd6", "#e2f1e6", "#ece6f8"];
    const list = $("list"), more = $("moreBtn"), sortBox = $("vodSort");
    let vodState = null, vodSort = window.CM.store.get("vod-sort", "latest");
    const markSort = () => sortBox.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.s === vodSort)));
    markSort();
    sortBox.addEventListener("click", e => {
      const b = e.target.closest("[data-s]"); if(!b || b.dataset.s === vodSort) return;
      vodSort = b.dataset.s; window.CM.store.set("vod-sort", vodSort); markSort();
      if(vodState) loadVods(vodState.type, 1);
    });

    function ownCard(v, i){
      const thumb = v.image ? asset(v.image) : (v.youtube ? "https://i.ytimg.com/vi/" + encodeURIComponent(v.youtube) + "/mqdefault.jpg" : "");
      const style = thumb ? 'background-image:url(&quot;' + esc(thumb) + '&quot;)' : "background-color:" + TINTS[i % 4];
      const inner = '<div class="thumb" style="' + style + '"><span class="kind">' + esc(v.category) + '</span>' + (thumb ? "" : pc(v.icon || 6))
        + (v.youtube ? '<span class="play"><svg class="ico"><use href="#i-play"/></svg></span>' : "") + '</div>'
        + '<div class="c-text">' + esc(v.title) + '<small>' + esc(v.date || "") + '</small></div>';
      if(v.youtube) return '<a class="card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.youtube) + '" target="_blank" rel="noopener">' + inner + '</a>';
      if(v.image) return '<a class="card" href="' + esc(asset(v.image)) + '" target="_blank" rel="noopener">' + inner + '</a>';
      return '<div class="card">' + inner + '</div>';
    }
    const ytCard = x => '<a class="card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(x.id) + '" target="_blank" rel="noopener">'
      + '<div class="thumb" style="background-image:url(&quot;https://i.ytimg.com/vi/' + encodeURIComponent(x.id) + '/mqdefault.jpg&quot;)"><span class="kind">유튜브</span><span class="play"><svg class="ico"><use href="#i-play"/></svg></span></div>'
      + '<div class="c-text"><span class="t2">' + esc(x.title) + '</span><small>' + esc(String(x.published || "").slice(0, 10)) + '</small></div></a>';
    const getYT = () => live ? fetch(url("api/youtube"), { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => d && d.ok ? d : null).catch(() => null) : Promise.resolve(null);
    const offline = what => '<p class="empty">' + (live ? what + "을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." : "사이트를 배포한 뒤에 " + esc(S.streamer) + " " + what + "이 여기에 보여요.") + '</p>';

    /* 전체: 종류별 최신 몇 개씩 */
    async function showAll(){
      list.className = "mix"; more.hidden = true;
      $("sampleChip").innerHTML = live ? '<span class="chip leaf">자동 업데이트</span>' : "";
      list.innerHTML = '<p class="empty">불러오는 중…</p>';
      const [yt, ca, cl] = await Promise.all([getYT(), fetchVods("catch", 1, 6), fetchVods("clip", 1, 4)]);
      const sec = (title, count, tab, cls, cards) => cards ? '<section class="mix-sec"><div class="mix-head"><h3>' + title + (count ? ' <span class="sec-sub num">' + count + '개</span>' : "") + '</h3>'
        + '<button type="button" class="text-btn" data-tab="' + tab + '">더 보기 ' + ico("arrow") + '</button></div><div class="cards ' + cls + '">' + cards + '</div></section>' : "";
      const html = sec("올린 자료", own.length, ownCats[0] || "", "", own.slice(0, 4).map(ownCard).join(""))
        + sec("캐치", ca && ca.total, "캐치", "catch-grid", ca && ca.items.slice(0, 6).map(vodCard).join(""))
        + sec("클립", cl && cl.total, "클립", "", cl && cl.items.slice(0, 4).map(vodCard).join(""))
        + sec("유튜브", 0, "유튜브", "", yt && yt.items.slice(0, 4).map(ytCard).join(""));
      list.innerHTML = html || offline("방송국 영상");
    }
    list.addEventListener("click", e => {
      const b = e.target.closest("[data-tab]"); if(!b) return;
      const t = [...$("tabs").querySelectorAll("button")].find(x => x.textContent === b.dataset.tab);
      if(t){ t.click(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });

    /* 캐치·클립: 12개씩, 더 보기 */
    async function loadVods(type, page){
      list.className = "cards" + (type === "catch" ? " catch-grid" : "");
      if(page === 1) list.innerHTML = '<p class="empty">불러오는 중…</p>';
      more.disabled = true;
      const d = await fetchVods(type, page, 12, vodSort);
      if(page === 1) list.innerHTML = "";
      if(!d){ list.innerHTML = offline("방송국 " + (type === "catch" ? "캐치" : "클립") + " 영상"); more.hidden = true; return; }
      list.insertAdjacentHTML("beforeend", d.items.map(vodCard).join("") || (page === 1 ? '<p class="empty">영상이 없어요</p>' : ""));
      $("sampleChip").innerHTML = '<span class="chip leaf">SOOP 자동 · ' + d.total + '개</span>';
      vodState = { type, page };
      more.hidden = page >= d.lastPage; more.disabled = false;
    }
    more.addEventListener("click", () => { if(vodState) loadVods(vodState.type, vodState.page + 1); });

    async function showYT(){
      list.className = "cards"; more.hidden = true; list.innerHTML = '<p class="empty">불러오는 중…</p>';
      const d = await getYT();
      $("sampleChip").innerHTML = d ? '<span class="chip leaf">유튜브 자동</span>' : "";
      list.innerHTML = d ? (d.items.map(ytCard).join("") || '<p class="empty">영상이 없어요</p>') : offline("유튜브 영상");
    }

    tabs($("tabs"), ownCats.concat(Object.keys(AUTO)), cat => {
      vodState = null; sortBox.hidden = !(AUTO[cat] === "catch" || AUTO[cat] === "clip");
      if(!cat) return showAll();
      if(AUTO[cat] === "yt") return showYT();
      if(AUTO[cat]) return loadVods(AUTO[cat], 1);
      list.className = "cards"; more.hidden = true; $("sampleChip").innerHTML = "";
      const items = own.filter(x => x.category === cat);
      list.innerHTML = items.length ? items.map(ownCard).join("") : '<p class="empty">등록된 자료가 없어요</p>';
    });
  }

  /* ── 공약현황 ── */
  if(page === "promise"){
   const draw = () => {
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

    /* 도전미션 */
    const M = window.MISSIONS || { items: [] };
    $("missionChip").innerHTML = sampleChip(M.sample);
    const ST = { "진행중": "ing", "성공": "ok", "실패": "fail" };
    const okSum = M.items.filter(m => m.status === "성공").reduce((a, m) => a + (Number(m.balloons) || 0), 0);
    $("missionSum").textContent = M.items.length ? "성공 " + M.items.filter(m => m.status === "성공").length + "건 · 성공 별풍선 " + okSum.toLocaleString() + "개" : "";
    const mcard = m => '<article class="mission ' + (ST[m.status] || "ing") + '"><div class="m-top"><span class="m-badge">' + esc(m.status === "진행중" ? "진행 중" : m.status || "진행 중") + '</span>'
      + '<span class="m-date num">' + esc(m.date || "") + '</span></div><h3>' + esc(m.title) + '</h3>'
      + '<div class="m-foot"><span class="m-star num">⭐ ' + Number(m.balloons || 0).toLocaleString() + '개</span><span class="m-by">' + esc(m.by ? m.by + " 님 요청" : S.streamer + " 미션") + '</span></div></article>';
    const showM = f => {
      const items = f ? M.items.filter(m => m.status === f) : M.items;
      $("missionList").innerHTML = items.length ? items.map(mcard).join("") : '<p class="empty">' + (f ? f + " 미션이 없어요" : "아직 적어 둔 도전미션이 없어요") + '</p>';
    };
    const mt = $("missionTabs");
    mt.innerHTML = ["전체", "진행중", "성공", "실패"].map((t, i) => '<button type="button" data-f="' + (i ? t : "") + '" aria-pressed="' + (i ? "false" : "true") + '">' + (t === "진행중" ? "진행 중" : t)
      + (i ? ' <span class="num">' + M.items.filter(m => m.status === t).length + '</span>' : "") + '</button>').join("");
    mt.onclick = e => { const b = e.target.closest("button"); if(!b) return; mt.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); showM(b.dataset.f); };
    showM("");
   };
    draw();
    /* 운영자 화면에서 적은 공약·도전미션이 있으면 그것을 보여줌 (없으면 data/content.js 내용) */
    if(S.supabaseUrl && S.supabaseAnonKey){
      const get = t => fetch(S.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + t, { headers: { apikey: S.supabaseAnonKey } }).then(r => r.ok ? r.json() : null).catch(() => null);
      Promise.all([get("promises?select=*&order=sort.asc,id.asc"), get("missions?select=*&order=day.desc,id.desc&limit=200")]).then(([ps, ms]) => {
        let changed = false;
        if(ps && ps.length){ window.PROMISES = { sample: false, items: ps.map(p => ({ title: p.title, now: p.now_value, goal: p.goal, unit: p.unit, note: p.note, done: p.done })) }; changed = true; }
        if(ms && ms.length){ window.MISSIONS = { sample: false, items: ms.map(m => ({ title: m.title, balloons: m.balloons, by: m.requester, status: m.status, date: m.day })) }; changed = true; }
        if(changed) draw();
      });
    }
  }

  /* ── 놀이터 목록 ── */
  if(page === "play"){
    $("list").innerHTML = window.GAMES.map(g =>
      '<a class="game-card" href="' + url(g.href) + '"><div class="g-art">' + pc(g.icon) + '</div>'
      + '<b>' + esc(g.name) + '</b><p>' + esc(g.desc) + '</p>'
      + '<div class="g-foot"><span>내 최고 기록 <b class="num" style="display:inline;font-size:11px;color:var(--ink)">' + esc(window.GameKit.bestText(g.id)) + '</b></span>' + ico("arrow") + '</div></a>').join("");
  }
})();
