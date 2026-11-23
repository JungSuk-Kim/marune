/* 메인 화면 */
(function(){
  const { S, esc, url, pc, ico, asset, sampleChip, toast } = window.CM;
  const $ = id => document.getElementById(id);

  /* ── 히어로 ── */
  const art = $("heroArt");
  const setArt = live => {
    $("hero").classList.toggle("off", !live);
    art.style.backgroundImage = 'url("' + asset(live ? S.heroLive : S.heroOff) + '")';
    if(S.heroPosition) art.style.backgroundPosition = S.heroPosition;
    if(S.heroTint) $("hero").style.setProperty("--hero-tint", S.heroTint);
  };
  setArt(true);
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
  function renderVideos(list, auto, sample){
    /* 예시 영상만 있을 때는 칸을 숨김 (유튜브가 연결되거나 실제 영상을 넣으면 나타남) */
    if(!list.length || sample){ $("videoBand").hidden = true; return; }
    $("videoBand").hidden = false;
    $("videoChips").innerHTML = (auto ? '<span class="chip">자동 업데이트</span>' : "") + sampleChip(sample);
    $("videos").innerHTML = list.slice(0, 4).map(videoCard).join("");
  }
  const A = window.ARCHIVE || { items: [] };
  renderVideos(A.items.filter(x => x.category === "영상"), false, A.sample);
  if(location.protocol.startsWith("http")){
    getJSON("api/youtube").then(d => {
      if(d && d.ok && d.items && d.items.length){
        renderVideos(d.items.map(x => ({ title: x.title, youtube: x.id, date: ago(x.published) })), true, false);
      }
    });
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
  const SC = window.SCHEDULE || { days: [] };
  const todayIdx = (new Date().getDay() + 6) % 7;
  $("schedChip").innerHTML = sampleChip(SC.sample);
  $("sched").innerHTML = SC.days.length ? SC.days.map((s, i) =>
    '<div class="row' + (i === todayIdx ? " today" : "") + (s.rest ? " rest" : "") + '"><span class="day">' + esc(s.day) + '</span><span class="what">' + esc(s.title)
    + (i === todayIdx ? ' <span class="chip">오늘</span>' : "") + '</span><time class="num">' + esc(s.time) + '</time></div>').join("")
    : '<p class="empty">등록된 일정이 없어요</p>';

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
