/* 메인 화면 */
(function(){
  const { S, esc, url, pc, ico, asset, sampleChip, toast, vodCard, fetchVods } = window.CM;
  const $ = id => document.getElementById(id);

  /* ── 히어로 ── */
  const art = $("heroArt");
  const setArt = live => {
    $("hero").classList.toggle("off", !live);
    art.style.backgroundImage = 'url("' + asset(live ? S.heroLive : S.heroOff) + '")';
    if(S.heroPosition) art.style.backgroundPosition = S.heroPosition;
    if(S.heroTint) $("hero").style.setProperty("--hero-tint", S.heroTint);
    if(S.heroRatio) $("hero").style.setProperty("--hero-ratio", S.heroRatio);
  };
  setArt(true);
  $("heroSocial").innerHTML = window.CM.socialHtml();
  if(S.songbookUrl){ $("songBtn").href = S.songbookUrl; $("songBtn").hidden = false; }
  if(S.giftInfo){
    const b = $("giftBtn"); b.hidden = false;
    b.addEventListener("click", () => toast(S.giftInfo));
  }

  /* ── LIVE: 서버 함수(/api/live)가 있으면 실제 상태, 없으면 안내만 ── */
  const watch = $("watchBtn");
  if(S.channelUrl){ watch.href = S.channelUrl; } else { watch.hidden = true; }
  function renderLive(d){
    if(!d || !d.ok){
      $("liveDot").classList.add("idle");
      $("liveTitle").textContent = S.streamer + " 팬 커뮤니티";
      $("viewers").hidden = true;
      return;
    }
    setArt(d.live);
    $("liveDot").classList.toggle("idle", !d.live);
    $("livePill").classList.toggle("on", d.live);
    $("liveTitle").textContent = d.live ? "LIVE · " + (d.title || "지금 방송 중") : "지금은 방송 쉬는 중";
    $("viewers").hidden = !d.live || !d.viewers;
    $("viewers").textContent = Number(d.viewers || 0).toLocaleString() + "명";
    watch.firstChild.textContent = d.live ? "방송 보러가기" : "방송국 가기";
    if(d.live && d.watchUrl) watch.href = d.watchUrl;
    /* 라이브 썸네일: 1분마다 새 화면으로 */
    const lt = $("liveThumb"), show = !!(d.live && d.thumb);
    if(show){
      const img = $("liveImg"), src = d.thumb + "?" + Date.now();
      const pre = new Image();
      pre.onload = () => { img.src = src; lt.hidden = false; $("hero").classList.add("has-thumb"); };
      pre.onerror = () => { lt.hidden = true; $("hero").classList.remove("has-thumb"); };
      pre.src = src;
      lt.href = d.watchUrl || S.channelUrl || "#";
      $("liveImgViewers").textContent = d.viewers ? "👀 " + Number(d.viewers).toLocaleString() : "";
    } else { lt.hidden = true; $("hero").classList.remove("has-thumb"); }
  }
  renderLive(null);
  const getJSON = p => fetch(url(p), { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null);
  if(location.protocol.startsWith("http")){
    getJSON("api/live").then(renderLive);
    setInterval(() => getJSON("api/live").then(d => d && renderLive(d)), 60000);
  }

  /* ── 영상: 유튜브 자동(/api/youtube) → 없으면 자료실의 영상 ── */
  function ago(iso){
    const t = Date.parse(iso); if(!t) return "";
    const d = Math.floor((Date.now() - t) / 86400000);
    if(d < 1) return "오늘"; if(d < 7) return d + "일 전"; if(d < 30) return Math.floor(d / 7) + "주 전";
    return new Date(t).toLocaleDateString("ko-KR");
  }
  const TINTS = ["#fbe3e9", "#fdebd6", "#e2f1e6", "#ece6f8"];
  function videoCard(v, i){
    const thumb = v.youtube ? "https://i.ytimg.com/vi/" + encodeURIComponent(v.youtube) + "/mqdefault.jpg" : (v.image ? asset(v.image) : "");
    const style = thumb ? 'background-image:url(&quot;' + esc(thumb) + '&quot;)' : "background-color:" + TINTS[i % 4];
    const inner = '<div class="thumb" style="' + style + '">' + (thumb ? "" : pc(v.icon || 6))
      + '<span class="play"><svg class="ico"><use href="#i-play"/></svg></span></div>'
      + '<div class="c-text">' + esc(v.title) + '<small>' + esc(v.date || "") + '</small></div>';
    return v.youtube
      ? '<a class="card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.youtube) + '" target="_blank" rel="noopener">' + inner + '</a>'
      : '<a class="card" href="' + url("archive.html") + '">' + inner + '</a>';
  }
  /* 영상 칸: 유튜브 · 캐치 · 클립 탭. 배포 전(파일로 열 때)에는 칸을 숨김 */
  const V = { yt: null, hot: null, catch: null, clip: null };
  async function showVideos(kind){
    $("videoTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === kind));
    $("videos").classList.toggle("catch-grid", kind === "catch");
    if(!V[kind]){
      $("videos").innerHTML = '<p class="empty">불러오는 중…</p>';
      if(kind === "yt"){
        const d = await getJSON("api/youtube");
        V.yt = d && d.ok ? d.items.slice(0, 4).map(x => videoCard({ title: x.title, youtube: x.id, date: ago(x.published) }, 0)) : [];
      } else if(kind === "hot"){
        /* 인기: 캐치·클립을 조회수순으로 모아 많이 본 4개 (캐치도 가로 칸에 맞춰 보여줌) */
        const [c, l] = await Promise.all([fetchVods("catch", 1, 8, "views"), fetchVods("clip", 1, 8, "views")]);
        const all = [].concat(c ? c.items : [], l ? l.items : []).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
        V.hot = all.map(v => vodCard(v).replace('class="card vod catch"', 'class="card vod"'));
      } else {
        const d = await fetchVods(kind, 1, kind === "catch" ? 6 : 4);
        V[kind] = d ? d.items.map(vodCard) : [];
      }
    }
    $("videos").innerHTML = V[kind].join("") || '<p class="empty">아직 영상이 없어요</p>';
  }
  if(location.protocol.startsWith("http")){
    $("videoTabs").addEventListener("click", e => { const b = e.target.closest("button"); if(b) showVideos(b.dataset.v); });
    showVideos("yt");
  } else {
    $("videoBand").hidden = true;
  }

  /* ── 방송국 최신 글 (SOOP) + 게시판 최근 글 ── */
  const shortDate = v => { const t = typeof v === "number" ? v : Date.parse(String(v).replace(" ", "T")); if(!t) return ""; const d = new Date(t); return (d.getMonth() + 1) + "." + String(d.getDate()).padStart(2, "0"); };
  if(location.protocol.startsWith("http")){
    getJSON("api/notices?size=5").then(d => {
      if(!d || !d.ok || !d.items || !d.items.length) return;
      $("soopPanel").hidden = false;
      $("soopList").innerHTML = d.items.slice(0, 5).map(n =>
        '<a href="' + esc(n.url) + '" target="_blank" rel="noopener"><span class="cat soop">방송국</span><span class="t">' + esc(n.title)
        + (n.comments ? ' <small class="num" style="color:var(--cherry)">[' + n.comments + ']</small>' : "") + '</span><time class="num">' + shortDate(String(n.date).replace(" ", "T") + "+09:00") + '</time></a>').join("");
    });
  }
  const BS = window.BoardStore;
  if(BS){
    BS.ready.then(() => BS.list({ size: 5, page: 1 })).then(r => {
      $("boardList").innerHTML = r.items.length ? r.items.map(p =>
        '<a href="' + url("post.html?id=" + p.id) + '"><span class="cat ' + esc(p.category) + '">' + esc(BS.label(p.category)) + '</span><span class="t">' + esc(p.title)
        + (p.comments ? ' <small class="num" style="color:var(--cherry)">[' + p.comments + ']</small>' : "") + '</span><time class="num">' + shortDate(p.createdAt) + '</time></a>').join("")
        : '<p class="empty">아직 글이 없어요</p>';
    }).catch(() => { $("boardList").innerHTML = '<p class="empty">글을 불러오지 못했어요</p>'; });
  }

  /* ── 퍼스나콘 ── */
  $("persona").innerHTML = (S.persona || []).map((p, i) =>
    '<div>' + pc(i + 1) + '<span><b>' + esc(p.name) + '</b>' + esc(p.label) + '</span></div>').join("");

  /* ── 일정 ── */
  const todayIdx = (new Date().getDay() + 6) % 7;
  const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - todayIdx);
  const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function drawSchedule(){
    const SC = window.SCHEDULE || { days: [] };
    $("schedChip").innerHTML = sampleChip(SC.sample);
    /* 이번 주 날짜를 붙이고, special 에 적힌 날은 그 내용으로 바꿈 */
    const days = SC.days.map((s, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const sp = (SC.special || []).find(x => x.date === ymd(d));
      return Object.assign({}, s, sp ? { title: sp.title, time: sp.time || "", rest: !!sp.rest, special: true } : {}, { md: (d.getMonth() + 1) + "/" + d.getDate() });
    });
    $("sched").innerHTML = days.length ? days.map((s, i) =>
      '<div class="row' + (i === todayIdx ? " today" : "") + (s.rest ? " rest" : "") + (s.special ? " special" : "") + '"><span class="day">' + esc(s.day) + '<small class="num">' + esc(s.md) + '</small></span><span class="what">' + esc(s.title)
      + (i === todayIdx ? ' <span class="chip">오늘</span>' : "") + '</span><time class="num">' + esc(s.time) + '</time></div>').join("")
      : '<p class="empty">등록된 일정이 없어요</p>';
  }
  drawSchedule();
  /* 운영자·스트리머가 사이트에서 고친 일정이 있으면 그것을 씀 (없으면 data/content.js) */
  if(S.supabaseUrl && S.supabaseAnonKey){
    const get = t => fetch(S.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + t, { headers: { apikey: S.supabaseAnonKey } }).then(r => r.ok ? r.json() : null).catch(() => null);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    Promise.all([get("schedule_week?select=*&order=dow"), get("schedule_special?select=*&day=gte." + ymd(mon) + "&day=lte." + ymd(sun))]).then(([w, sp]) => {
      if(!w || w.length !== 7) return;
      const DN = ["월", "화", "수", "목", "금", "토", "일"];
      window.SCHEDULE = { sample: false, days: w.map(r => ({ day: DN[r.dow], title: r.title, time: r.time, rest: r.rest })),
        special: (sp || []).map(r => ({ date: r.day, title: r.title, time: r.time, rest: r.rest })) };
      drawSchedule();
    });
  }
  /* 운영자·스트리머에게 "수정" 링크 */
  if(window.BoardStore) window.BoardStore.ready.then(() => {
    const show = () => {
      const u = window.BoardStore.user(), can = !!u && (u.role === "admin" || u.role === "streamer");
      let a = document.getElementById("schedEdit");
      if(can && !a){ a = document.createElement("a"); a.id = "schedEdit"; a.className = "text-btn"; a.href = url("admin.html#schedule"); a.textContent = "수정"; $("schedChip").after(a); }
      if(!can && a) a.remove();
    };
    window.BoardStore.onAuth(show); show();
  });

  /* ── 공약 (진행 중인 것 3개까지) ── */
  const P = window.PROMISES || { items: [] };
  $("promiseChip").innerHTML = sampleChip(P.sample);
  const open = P.items.filter(p => !p.done).concat(P.items.filter(p => p.done)).slice(0, 3);
  $("promiseList").innerHTML = open.length ? open.map(p => {
    const pct = Math.min(100, Math.round((p.now || 0) / (p.goal || 1) * 100));
    return '<div><div class="p-top"><span>' + esc(p.title) + '</span><span class="num">'
      + (p.done ? "달성 완료" : Number(p.now).toLocaleString() + " / " + Number(p.goal).toLocaleString() + esc(p.unit || "")) + '</span></div>'
      + '<div class="bar' + (p.done ? " done" : "") + '"><i style="width:' + pct + '%"></i></div></div>';
  }).join("") : '<p class="empty">등록된 공약이 없어요</p>';

  /* ── 놀이터 목록 ── */
  $("gameList").innerHTML = (window.GAMES || []).map(g =>
    '<a class="game-tile" href="' + url(g.href) + '">' + pc(g.icon) + '<b>' + esc(g.name) + '</b></a>').join("");
})();
