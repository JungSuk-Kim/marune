/* 게시판 화면: 목록(board.html) · 글 보기(post.html) · 글쓰기(write.html) */
(function(){
  const { S, esc, url, ico, toast } = window.CM;
  const B = window.BoardStore;
  const page = document.body.dataset.view;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  const pad = n => String(n).padStart(2, "0");
  function when(ts){
    const d = new Date(ts), now = new Date();
    if(d.toDateString() === now.toDateString()) return pad(d.getHours()) + ":" + pad(d.getMinutes());
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  const badge = role => role === "admin" ? '<span class="role-badge">운영자</span>' : role === "streamer" ? '<span class="role-badge">스트리머</span>' : "";
  const catChip = c => '<span class="cat ' + esc(c) + '">' + esc(B.label(c)) + '</span>';

  /* ── SOOP 방송국 글 (서버 함수 /api/notices) ── */
  const soopTime = s => Date.parse(String(s).replace(" ", "T") + "+09:00") || 0;
  function fetchSoop(page, size){
    if(!location.protocol.startsWith("http")) return Promise.resolve(null);
    return fetch(url("api/notices?page=" + page + "&size=" + size), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(d => d && d.ok ? d : null).catch(() => null);
  }
  const soopRow = (n, pinned) => '<a class="post-row soop-row' + (pinned ? " pinned" : "") + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">'
    + '<span class="cat soop">방송국</span>'
    + '<span class="t">' + esc(n.title) + (n.comments ? '<small class="num">[' + n.comments + ']</small>' : "") + '<span class="sub">' + esc(n.board) + '</span></span>'
    + '<span class="who">' + esc(n.author || S.streamer) + badge("streamer") + '</span>'
    + '<span class="when num">' + when(soopTime(n.date)) + '</span><span class="n num">' + n.views + '</span><span class="n num">' + n.likes + '</span></a>';

  /* ── 창 ── */
  function modal(html, onReady){
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    const close = () => back.remove();
    back.addEventListener("click", e => { if(e.target === back || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", function esc1(e){ if(e.key === "Escape"){ close(); document.removeEventListener("keydown", esc1); } });
    document.body.appendChild(back);
    if(onReady) onReady(back, close);
    const f = back.querySelector("button, input"); if(f) f.focus();
  }
  function loginModal(){
    if(B.mode === "demo"){
      modal('<h3>체험 로그인</h3><p>지금은 체험 모드예요. 쓴 글은 이 기기에만 저장돼요. 역할을 골라 게시판을 써 볼 수 있어요.</p>'
        + '<button type="button" class="btn" data-role="member">팬으로 체험</button>'
        + '<button type="button" class="btn light" data-role="streamer">' + esc(S.streamer) + '(스트리머)로 체험</button>'
        + '<button type="button" class="btn light" data-role="admin">운영자로 체험</button>'
        + '<button type="button" class="text-btn" data-close style="justify-content:center">닫기</button>',
        (el, close) => el.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => B.signIn(b.dataset.role).then(close))));
      return;
    }
    const names = { kakao: "카카오로 로그인", google: "구글로 로그인" };
    modal('<h3>로그인</h3><p>글과 댓글을 쓰려면 로그인이 필요해요. 처음 로그인하면 자동으로 가입돼요.</p>'
      + (S.loginProviders || ["kakao", "google"]).map(p => '<button type="button" class="btn ' + (p === "kakao" ? "kakao" : "light") + '" data-p="' + esc(p) + '">' + esc(names[p] || p) + '</button>').join("")
      + '<button type="button" class="text-btn" data-close style="justify-content:center">닫기</button>',
      el => el.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => B.signIn(b.dataset.p).catch(e => toast(e.message)))));
  }
  function nickModal(){
    const u = B.user();
    modal('<h3>닉네임 바꾸기</h3><p>게시판에 표시되는 이름이에요. 2~16자.</p>'
      + '<input class="field" id="nickInput" maxlength="16" value="' + esc(u.nickname) + '" aria-label="닉네임">'
      + '<button type="button" class="btn" id="nickSave">저장</button>'
      + '<button type="button" class="text-btn" data-close style="justify-content:center">닫기</button>',
      (el, close) => el.querySelector("#nickSave").addEventListener("click", () =>
        B.setNickname(el.querySelector("#nickInput").value).then(() => { toast("닉네임을 바꿨어요"); close(); }).catch(e => toast(e.message))));
  }
  function renderAuth(){
    const slot = $("authSlot"); if(!slot) return;
    const u = B.user();
    slot.innerHTML = u
      ? '<span><b>' + esc(u.nickname) + '</b>' + badge(u.role) + ' 님</span><button type="button" class="text-btn" id="nickBtn">닉네임 변경</button><button type="button" class="text-btn" id="outBtn">로그아웃</button>'
      : '<button type="button" class="btn light" id="inBtn">로그인</button>';
    if(u){ $("nickBtn").addEventListener("click", nickModal); $("outBtn").addEventListener("click", () => B.signOut()); }
    else $("inBtn").addEventListener("click", loginModal);
  }
  function demoNote(){
    const el = $("demoNote"); if(!el) return;
    if(B.error){ el.hidden = false; el.textContent = "게시판 서버에 연결하지 못했어요. 잠시 뒤 다시 열어 주세요."; return; }
    el.hidden = B.mode !== "demo";
  }

  /* ───────── 목록 ───────── */
  function initList(){
    const st = { cat: params.get("cat") || null, q: "", sort: "new", page: 1 };
    const tabs = $("tabs");
    tabs.innerHTML = '<button type="button" data-cat="">전체</button>' + B.boards.map(b => '<button type="button" data-cat="' + esc(b.id) + '">' + esc(b.label) + '</button>').join("");
    const isSoop = () => !!(B.boards.find(b => b.id === st.cat) || {}).external;
    const markTabs = () => tabs.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", (b.dataset.cat || null) === st.cat));
    tabs.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; st.cat = b.dataset.cat || null; st.page = 1; st.q = ""; $("q").value = ""; markTabs(); load(); });
    $("searchForm").addEventListener("submit", e => { e.preventDefault(); st.q = $("q").value.trim(); st.page = 1; load(); });
    $("sort").addEventListener("change", e => { st.sort = e.target.value; st.page = 1; load(); });
    $("writeBtn").addEventListener("click", () => {
      if(!B.user()) return loginModal();
      location.href = url("write.html" + (st.cat ? "?cat=" + encodeURIComponent(st.cat) : ""));
    });
    const rowHtml = (p, pinned) => '<a class="post-row' + (pinned ? " pinned" : "") + '" href="' + url("post.html?id=" + p.id) + '">'
      + catChip(p.category)
      + '<span class="t">' + esc(p.title) + (p.comments ? '<small class="num">[' + p.comments + ']</small>' : "") + '</span>'
      + '<span class="who">' + esc(p.author) + badge(p.authorRole) + '</span>'
      + '<span class="when num">' + when(p.createdAt) + '</span><span class="n num">' + p.views + '</span><span class="n num">' + p.likes + '</span></a>';
    const HEAD = '<div class="post-row head"><span>게시판</span><span>제목</span><span>작성자</span><span>작성일</span><span class="n">조회</span><span class="n">추천</span></div>';
    async function load(){
      $("list").innerHTML = '<p class="empty">불러오는 중…</p>';
      const soop = isSoop();
      $("searchForm").hidden = soop;
      $("writeBtn").hidden = soop;
      try{
        let pages;
        if(soop){
          const d = await fetchSoop(st.page, B.pageSize);
          if(!d){
            $("list").innerHTML = '<p class="empty">' + (location.protocol.startsWith("http") ? "방송국 글을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요." : "사이트를 배포한 뒤에 " + esc(S.streamer) + " 방송국 글이 여기에 보여요.") + '</p>';
            $("total").textContent = ""; $("pager").innerHTML = ""; return;
          }
          $("list").innerHTML = HEAD + (d.items.length ? d.items.map(n => soopRow(n, false)).join("") : '<p class="empty">방송국 글이 없어요</p>');
          $("total").textContent = "총 " + d.total + "개 · SOOP 방송국";
          pages = Math.max(1, d.lastPage || 1);
        } else {
          const plain = !st.cat && !st.q && st.page === 1 && st.sort === "new";
          const [res, pins, sp] = await Promise.all([
            B.list(st),
            plain ? B.list({ cat: "notice", size: 3, page: 1 }) : Promise.resolve({ items: [] }),
            plain ? fetchSoop(1, 3) : Promise.resolve(null)
          ]);
          const pinIds = new Set(pins.items.map(p => p.id));
          const body = pins.items.map(p => rowHtml(p, true)).join("")
            + (sp ? sp.items.map(n => soopRow(n, true)).join("") : "")
            + res.items.filter(p => !pinIds.has(p.id)).map(p => rowHtml(p, false)).join("");
          $("list").innerHTML = HEAD + (body || '<p class="empty">' + (st.q ? "검색 결과가 없어요" : "아직 글이 없어요. 첫 글을 써 보세요") + '</p>');
          $("total").textContent = "총 " + res.total + "개";
          pages = Math.max(1, Math.ceil(res.total / B.pageSize));
        }
        let html = '<button type="button" data-p="' + (st.page - 1) + '"' + (st.page <= 1 ? " disabled" : "") + '>이전</button>';
        const from = Math.max(1, Math.min(st.page - 2, pages - 4)), to = Math.min(pages, from + 4);
        for(let i = from; i <= to; i++) html += '<button type="button" data-p="' + i + '"' + (i === st.page ? ' aria-current="page"' : "") + '>' + i + '</button>';
        html += '<button type="button" data-p="' + (st.page + 1) + '"' + (st.page >= pages ? " disabled" : "") + '>다음</button>';
        $("pager").innerHTML = pages > 1 ? html : "";
      }catch(e){ $("list").innerHTML = '<p class="empty">글을 불러오지 못했어요. ' + esc(e.message) + '</p>'; }
    }
    $("pager").addEventListener("click", e => { const b = e.target.closest("button"); if(!b || b.disabled) return; st.page = Number(b.dataset.p); load(); window.scrollTo({ top: 0 }); });
    markTabs(); load();
  }

  /* ───────── 본문 꾸미기: 사진 · 링크 · 링크 미리보기 ───────── */
  const IMG_LINE = /^!\[[^\]]*\]\(([^)\s]+)\)$/;
  const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,!?)\]}]/g;
  const linkify = s => {
    let out = "", last = 0;
    s.replace(URL_RE, (m, i) => { out += esc(s.slice(last, i)) + '<a href="' + esc(m) + '" target="_blank" rel="noopener nofollow ugc">' + esc(m) + '</a>'; last = i + m.length; return m; });
    return out + esc(s.slice(last));
  };
  /* 서식 있는 글: 걸러진 HTML + 글 속 주소 자동 링크 + 한 줄짜리 링크 미리보기 */
  function renderRich(body){
    const box = document.createElement("div");
    box.innerHTML = RichText.sanitize(body.slice(RichText.MARK.length));
    const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), ts = [];
    while(w.nextNode()) if(!w.currentNode.parentNode.closest("a") && URL_RE.test(w.currentNode.data)) ts.push(w.currentNode);
    URL_RE.lastIndex = 0;
    ts.forEach(t => { const span = document.createElement("span"); span.innerHTML = linkify(t.data); t.replaceWith(...span.childNodes); });
    let n = 0;
    box.querySelectorAll("div, p").forEach(el => {
      if(n >= 5 || el.querySelector("img, div, p")) return;
      const t = el.textContent.trim();
      if(/^https?:\/\/\S+$/.test(t)){ n++; el.outerHTML = '<div class="lp" data-url="' + esc(t) + '"><a href="' + esc(t) + '" target="_blank" rel="noopener nofollow ugc">' + esc(t) + '</a></div>'; }
    });
    return box.innerHTML;
  }
  function renderBody(text, withMedia){
    if(withMedia && RichText.isRich(text)) return renderRich(text);
    const lines = String(text || "").split("\n"), html = [];
    let previews = 0;
    lines.forEach((raw, i) => {
      const t = raw.trim(), im = withMedia && t.match(IMG_LINE);
      if(im && B.isOwnImage(im[1])){
        html.push('<a class="pb-img" href="' + esc(im[1]) + '" target="_blank" rel="noopener"><img src="' + esc(im[1]) + '" alt="첨부 사진" loading="lazy"></a>');
        return;
      }
      if(withMedia && previews < 5 && /^https?:\/\/\S+$/.test(t)){
        previews++;
        html.push('<div class="lp" data-url="' + esc(t) + '"><a href="' + esc(t) + '" target="_blank" rel="noopener nofollow ugc">' + esc(t) + '</a></div>');
        return;
      }
      html.push(linkify(raw) + (i < lines.length - 1 ? "<br>" : ""));
    });
    return html.join("");
  }
  const ogCache = {};
  function fetchOg(u){
    if(ogCache[u]) return ogCache[u];
    let saved = null; try{ saved = JSON.parse(sessionStorage.getItem("og:" + u)); }catch(e){}
    if(saved) return (ogCache[u] = Promise.resolve(saved));
    if(!location.protocol.startsWith("http")) return Promise.resolve(null);
    return (ogCache[u] = fetch(url("api/og?url=" + encodeURIComponent(u))).then(r => r.ok ? r.json() : null).then(d => {
      if(d && d.ok){ try{ sessionStorage.setItem("og:" + u, JSON.stringify(d)); }catch(e){} return d; }
      return null;
    }).catch(() => null));
  }
  /* 글 안에서 바로 재생: 유튜브 · SOOP 다시보기/클립/캐치 */
  function embedFor(u){
    let t; try{ t = new URL(u); }catch(e){ return null; }
    const host = t.hostname.replace(/^(www|m)\./, "");
    let id = null, tall = false;
    if(host === "youtu.be") id = t.pathname.slice(1).split("/")[0];
    else if(host === "youtube.com" || host === "music.youtube.com"){
      const m = t.pathname.match(/^\/(shorts|live|embed)\/([\w-]{6,})/);
      if(m){ id = m[2]; tall = m[1] === "shorts"; } else id = t.searchParams.get("v");
    }
    if(id && /^[\w-]{6,20}$/.test(id)){
      const start = parseInt(t.searchParams.get("t") || t.searchParams.get("start") || "0", 10) || 0;
      return { src: "https://www.youtube-nocookie.com/embed/" + id + (start ? "?start=" + start : ""), tall };
    }
    if(/^vod\.sooplive\.(com|co\.kr)$/.test(t.hostname)){
      const no = (t.pathname.match(/^\/player\/(\d+)/) || [])[1];
      if(no) return { src: "https://vod.sooplive.com/player/" + no + "/embed?showChat=false&autoPlay=false&mutePlay=false", tall: /\/catch/.test(t.pathname) };
    }
    return null;
  }
  function fillPreviews(root){
    root.querySelectorAll(".lp[data-url]").forEach(el => {
      const u = el.dataset.url, em = embedFor(u);
      if(em){
        el.className = "lp-video" + (em.tall ? " tall" : "");
        el.innerHTML = '<iframe src="' + esc(em.src) + '" title="영상" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
          + '<a class="lp-src" href="' + esc(u) + '" target="_blank" rel="noopener nofollow ugc">원본에서 보기 ↗</a>';
        return;
      }
      fetchOg(u).then(d => {
        if(!d || !(d.title || d.image)) return;
        el.innerHTML = '<a class="lp-card' + (d.image ? "" : " no-img") + '" href="' + esc(u) + '" target="_blank" rel="noopener nofollow ugc">'
          + (d.image ? '<span class="lp-img"><img src="' + esc(d.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>' : "")
          + '<span class="lp-text"><b>' + esc(d.title || u) + '</b>' + (d.description ? '<small>' + esc(d.description) + '</small>' : "")
          + '<em>' + esc(d.site || new URL(u).hostname) + '</em></span></a>';
      });
    });
  }

  /* ───────── 글 보기 ───────── */
  function initPost(){
    const id = Number(params.get("id"));
    async function load(){
      let p;
      try{ p = await B.get(id); }catch(e){ p = null; }
      if(p && RichText.isRich(p.body)) await RichText.ready().catch(() => {});
      if(!p){ $("post").innerHTML = '<p class="empty">없는 글이거나 삭제된 글이에요.</p><p style="text-align:center"><a class="btn light" href="' + url("board.html") + '">목록으로</a></p>'; $("commentBox").hidden = true; return; }
      document.title = p.title + " | " + S.siteName;
      $("post").innerHTML = '<div class="post-head">' + catChip(p.category) + '<h1>' + esc(p.title) + '</h1>'
        + '<div class="post-meta"><span>' + esc(p.author) + badge(p.authorRole) + '</span><span class="num">' + when(p.createdAt) + '</span><span class="num">조회 ' + p.views + '</span></div></div>'
        + '<div class="post-body' + (RichText.isRich(p.body) ? " rich" : "") + '">' + renderBody(p.body, true) + '</div>'
        + '<div class="post-actions"><button type="button" class="btn light like-btn" id="likeBtn" aria-pressed="' + p.liked + '">추천 <b class="num" id="likeN">' + p.likes + '</b></button>'
        + '<a class="btn light" href="' + url("board.html") + '">목록</a>'
        + (B.canDelete(p) ? '<button type="button" class="btn light" id="delBtn">삭제</button>' : "") + '</div>';
      $("likeBtn").addEventListener("click", () => {
        if(!B.user()) return loginModal();
        B.toggleLike(id).then(r => { $("likeBtn").setAttribute("aria-pressed", r.liked); $("likeN").textContent = r.likes; }).catch(e => toast(e.message));
      });
      fillPreviews($("post"));
      const del = $("delBtn");
      if(del) del.addEventListener("click", () => modal('<h3>글을 삭제할까요?</h3><p>삭제하면 되돌릴 수 없어요.</p><button type="button" class="btn cherry" id="yes">삭제</button><button type="button" class="btn light" data-close>취소</button>',
        el => el.querySelector("#yes").addEventListener("click", () => B.remove(id).then(() => { location.href = url("board.html"); }).catch(e => toast(e.message)))));
      loadComments();
    }
    async function loadComments(){
      try{
        const list = await B.comments(id);
        $("commentCount").textContent = list.length;
        $("comments").innerHTML = list.length ? list.map(c => '<div class="comment"><div class="c-top"><b>' + esc(c.author) + '</b>' + badge(c.authorRole) + '<span class="num">' + when(c.createdAt) + '</span>'
          + (B.canDelete(c) ? '<button type="button" class="text-btn" data-del="' + c.id + '">삭제</button>' : "") + '</div><p>' + renderBody(c.body, false) + '</p></div>').join("")
          : '<p class="empty">첫 댓글을 남겨 보세요</p>';
      }catch(e){ $("comments").innerHTML = '<p class="empty">댓글을 불러오지 못했어요</p>'; }
      const u = B.user();
      $("commentInput").placeholder = u ? "댓글을 써 주세요" : "로그인한 뒤 댓글을 쓸 수 있어요";
    }
    $("comments").addEventListener("click", e => { const b = e.target.closest("[data-del]"); if(b) B.removeComment(b.dataset.del).then(loadComments).catch(err => toast(err.message)); });
    $("commentForm").addEventListener("submit", e => {
      e.preventDefault();
      if(!B.user()) return loginModal();
      B.addComment(id, $("commentInput").value).then(() => { $("commentInput").value = ""; loadComments(); }).catch(err => toast(err.message));
    });
    B.onAuth(load);
    load();
  }

  /* ───────── 글쓰기 ───────── */
  function initWrite(){
    let toBody = () => $("body").value;
    function render(){
      const u = B.user();
      const allowed = B.boards.filter(b => B.canWrite(b.id));
      $("needLogin").hidden = !!u;
      $("writeForm").hidden = !u;
      if(!u) return;
      const want = params.get("cat");
      $("cat").innerHTML = allowed.map(b => '<option value="' + esc(b.id) + '"' + (b.id === want ? " selected" : "") + '>' + esc(b.label) + '</option>').join("");
    }
    $("loginHere").addEventListener("click", loginModal);
    /* 본문 편집기: 글·사진·서식을 함께. 저장할 때는 걸러진 HTML 로 보냄 (앞에 <!--rich--> 표시) */
    const ed = $("body"), MAX_IMG = 10, MAX_LEN = 30000;
    RichText.ready().catch(err => toast(err.message));
    try{ document.execCommand("defaultParagraphSeparator", false, "div"); }catch(e){}
    let lastRange = null;
    const keepRange = () => { const s = getSelection(); if(s.rangeCount && ed.contains(s.anchorNode)) lastRange = s.getRangeAt(0).cloneRange(); };
    ["keyup", "mouseup", "input", "focus"].forEach(t => ed.addEventListener(t, keepRange));
    document.addEventListener("selectionchange", keepRange);
    const restore = () => { ed.focus(); if(lastRange){ const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); } };
    const imgCount = () => ed.querySelectorAll(".ed-img, img").length;
    const emptyCheck = () => ed.classList.toggle("has", !!(ed.textContent.trim() || ed.querySelector("img, .ed-img")));
    const exec = (cmd, val, css) => { restore(); document.execCommand("styleWithCSS", false, !!css); document.execCommand(cmd, false, val); keepRange(); emptyCheck(); syncBar(); };

    /* ── 서식 도구 ── */
    const bar = $("rtBar");
    const hdr = document.querySelector("header.site");
    const stick = () => { bar.style.top = (hdr ? hdr.offsetHeight : 0) + "px"; };
    stick(); addEventListener("resize", stick);
    bar.addEventListener("mousedown", e => { if(e.target.closest("button")) e.preventDefault(); });   /* 눌러도 선택 영역 유지 */
    bar.addEventListener("click", e => { const b = e.target.closest("[data-cmd]"); if(b) exec(b.dataset.cmd, null, false); });
    /* 크기·글꼴: execCommand 가 만든 font 태그를 우리 값으로 바꿈 */
    function wrapWith(cmd, marker, apply){
      exec(cmd, marker, false);
      const made = [];
      ed.querySelectorAll(cmd === "fontSize" ? 'font[size="7"]' : 'font[face="' + marker + '"]').forEach(f => {
        const sp = document.createElement("span"); apply(sp); while(f.firstChild) sp.appendChild(f.firstChild); f.replaceWith(sp); made.push(sp);
        /* 안쪽에 남은 같은 종류 스타일은 지워서 새 값이 보이게 */
        sp.querySelectorAll("span").forEach(x => { if(cmd === "fontSize") x.style.fontSize = ""; else x.style.fontFamily = ""; if(!x.getAttribute("style")) x.replaceWith(...x.childNodes); });
      });
      /* 바뀐 글자를 다시 선택해 두어 이어서 색·굵게 등을 줄 수 있게 */
      if(made.length){
        const r = document.createRange(); r.setStartBefore(made[0]); r.setEndAfter(made[made.length - 1]);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      keepRange();
    }
    $("rtSize").addEventListener("change", e => { const v = e.target.value; if(v) wrapWith("fontSize", "7", sp => sp.style.fontSize = v); e.target.value = ""; });
    $("rtFont").addEventListener("change", e => {
      const k = e.target.value;
      wrapWith("fontName", "marune-font", sp => { if(k) sp.style.fontFamily = RichText.FONTS[k]; });
      ed.querySelectorAll("span:not([style])").forEach(x => x.replaceWith(...x.childNodes));
      e.target.value = "";
    });
    /* 색 고르기 */
    const COLORS = ["#2a2340", "#6b6480", "#e4487e", "#ff6b6b", "#ff9f43", "#f5b700", "#2f9c6c", "#16a3a3", "#3b8fd9", "#8b5cf6", "#c2410c", "#ffffff"];
    const HILITE = ["#fff1a8", "#ffd6e5", "#d8f5e3", "#dbeafe", "#ede4ff", "#ffe2cc"];
    function palette(btnId, palId, barId, list, cmd){
      const pal = $(palId);
      pal.innerHTML = list.map(c => '<button type="button" data-c="' + c + '" style="background:' + c + '" title="' + c + '"></button>').join("")
        + (cmd === "hiliteColor" ? '<button type="button" data-c="transparent" class="none" title="없애기">✕</button>' : "")
        + '<label class="rt-custom" title="직접 고르기">＋<input type="color"></label>';
      $(btnId).addEventListener("mousedown", e => e.preventDefault());
      $(btnId).addEventListener("click", () => { document.querySelectorAll(".rt-pal").forEach(p => { if(p !== pal) p.hidden = true; }); pal.hidden = !pal.hidden; });
      pal.addEventListener("mousedown", e => { if(!e.target.closest("label")) e.preventDefault(); });
      const apply = c => { exec(cmd, c, true); if(c !== "transparent") $(barId).style.background = c; pal.hidden = true; };
      pal.addEventListener("click", e => { const b = e.target.closest("[data-c]"); if(b) apply(b.dataset.c); });
      pal.querySelector("input").addEventListener("change", e => apply(e.target.value));
    }
    palette("rtColorBtn", "rtColorPal", "rtColorBar", COLORS, "foreColor");
    palette("rtHiBtn", "rtHiPal", "rtHiBar", HILITE, "hiliteColor");
    document.addEventListener("click", e => { if(!e.target.closest(".rt-pick")) document.querySelectorAll(".rt-pal").forEach(p => p.hidden = true); });
    function syncBar(){
      bar.querySelectorAll("[data-cmd]").forEach(b => { let on = false; try{ on = document.queryCommandState(b.dataset.cmd); }catch(e){} b.classList.toggle("on", on); });
    }
    document.addEventListener("selectionchange", () => { if(document.activeElement === ed) syncBar(); });

    /* ── 사진 ── */
    async function shrink(file){
      if(file.type === "image/gif" && file.size <= 3 * 1024 * 1024) return file;
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, "image/webp", .85));
      if(!blob || blob.type !== "image/webp") return new Promise(r => c.toBlob(r, "image/jpeg", .85));
      return blob;
    }
    function placeNode(node){
      let r = lastRange && ed.contains(lastRange.startContainer) ? lastRange : null;
      if(!r){ r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); }
      r.deleteContents(); r.insertNode(node);
      let next = node.nextSibling;
      if(!next || next.nodeName !== "DIV"){ next = document.createElement("div"); next.appendChild(document.createElement("br")); node.after(next); }
      const nr = document.createRange(); nr.setStart(next, 0); nr.collapse(true);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(nr); lastRange = nr.cloneRange();
    }
    function makeFigure(src){
      const f = document.createElement("figure");
      f.className = "ed-img"; f.contentEditable = "false"; f.dataset.src = src;
      f.innerHTML = '<img src="' + esc(src) + '" alt="첨부 사진"><button type="button" class="ed-x" aria-label="사진 빼기">×</button>';
      return f;
    }
    function placeholder(){ const f = document.createElement("figure"); f.className = "ed-img loading"; f.contentEditable = "false"; f.innerHTML = '<span>사진 올리는 중…</span>'; return f; }
    async function addImages(files){
      files = Array.from(files || []).filter(f => /^image\//.test(f.type));
      if(!files.length) return;
      if(ed.querySelectorAll(".ed-img").length + files.length > MAX_IMG) return toast("사진은 한 글에 " + MAX_IMG + "장까지 넣을 수 있어요");
      $("submitBtn").disabled = true;
      for(const file of files){
        const ph = placeholder(); placeNode(ph);
        try{
          const blob = await shrink(file);
          if(blob.size > 3 * 1024 * 1024){ toast("사진이 너무 커요 (3MB까지)"); ph.remove(); continue; }
          const src = await B.uploadImage(blob);
          ph.replaceWith(makeFigure(src));
        }catch(err){ ph.remove(); toast(err.message || "사진을 올리지 못했어요"); }
      }
      $("submitBtn").disabled = false; emptyCheck();
    }
    ed.addEventListener("click", e => { const x = e.target.closest(".ed-x"); if(x){ x.closest(".ed-img").remove(); emptyCheck(); } });
    $("imgBtn").addEventListener("click", () => { keepRange(); $("imgInput").click(); });
    $("imgInput").addEventListener("change", e => { addImages(e.target.files); e.target.value = ""; });

    /* ── 붙여 넣기: 서식 그대로 (걸러서) ── */
    ed.addEventListener("paste", async e => {
      const cd = e.clipboardData; if(!cd) return;
      const files = Array.from(cd.files || []), html = cd.getData("text/html"), text = cd.getData("text/plain");
      e.preventDefault();
      if(files.some(f => /^image\//.test(f.type)) && !html) return addImages(files);
      if(html){
        try{
          await RichText.ready();
          const clean = RichText.sanitize(html.replace(/<!--[\s\S]*?-->/g, ""), { paste: true });
          restore(); document.execCommand("insertHTML", false, clean || "");
          if(/<img/i.test(html) && !/<img/i.test(clean)) toast("붙여 넣은 사진 중 일부는 넣을 수 없어서 뺐어요. 사진은 📷 사진으로 올려 주세요");
        }catch(err){ document.execCommand("insertText", false, text); }
      }else document.execCommand("insertText", false, text);
      keepRange(); emptyCheck();
    });
    ed.addEventListener("dragover", e => { if(e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault(); });
    ed.addEventListener("drop", e => { if(e.dataTransfer && e.dataTransfer.files.length){ e.preventDefault(); addImages(e.dataTransfer.files); } });

    /* ── 저장 형식 ── */
    toBody = () => {
      const c = ed.cloneNode(true);
      c.querySelectorAll(".ed-img.loading").forEach(x => x.remove());
      c.querySelectorAll(".ed-img").forEach(f => { const img = document.createElement("img"); img.src = f.dataset.src; img.alt = "사진"; const d = document.createElement("div"); d.appendChild(img); f.replaceWith(d); });
      if(!c.textContent.trim() && !c.querySelector("img")) return "";
      const html = RichText.sanitize(c.innerHTML).replace(/(<div><br><\/div>\s*){3,}/g, "<div><br></div><div><br></div>");
      const out = RichText.MARK + html;
      if(out.length > MAX_LEN){ toast("글이 너무 길어요. 서식이 많은 글은 조금 나눠서 올려 주세요"); return null; }
      return out;
    };
    ed.addEventListener("input", emptyCheck);
    $("writeForm").addEventListener("submit", e => {
      e.preventDefault();
      const btn = $("submitBtn"); btn.disabled = true;
      const body = toBody();
      if(body === null){ btn.disabled = false; return; }
      B.create({ category: $("cat").value, title: $("title").value, body })
        .then(id => { location.href = url("post.html?id=" + id); })
        .catch(err => { toast(err.message); btn.disabled = false; });
    });
    B.onAuth(render);
    render();
  }

  B.ready.then(() => {
    demoNote(); renderAuth(); B.onAuth(renderAuth);
    if(page === "list") initList();
    if(page === "post") initPost();
    if(page === "write") initWrite();
  });
})();
