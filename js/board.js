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
  const badge = role => role === "admin" ? '<span class="role-badge">운영자</span>' : role === "streamer" ? '<span class="role-badge">' + esc(S.streamer) + '</span>' : "";
  const catChip = c => '<span class="cat ' + esc(c) + '">' + esc(B.label(c)) + '</span>';

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
    async function load(){
      $("list").innerHTML = '<p class="empty">불러오는 중…</p>';
      try{
        const plain = !st.cat && !st.q && st.page === 1 && st.sort === "new";
        const [res, pins] = await Promise.all([
          B.list(st),
          plain ? B.list({ cat: "notice", size: 3, page: 1 }) : Promise.resolve({ items: [] })
        ]);
        const pinIds = new Set(pins.items.map(p => p.id));
        const body = pins.items.map(p => rowHtml(p, true)).join("") + res.items.filter(p => !pinIds.has(p.id)).map(p => rowHtml(p, false)).join("");
        $("list").innerHTML = '<div class="post-row head"><span>게시판</span><span>제목</span><span>작성자</span><span>작성일</span><span class="n">조회</span><span class="n">추천</span></div>'
          + (body || '<p class="empty">' + (st.q ? "검색 결과가 없어요" : "아직 글이 없어요. 첫 글을 써 보세요") + '</p>');
        $("total").textContent = "총 " + res.total + "개";
        const pages = Math.max(1, Math.ceil(res.total / B.pageSize));
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

  /* ───────── 글 보기 ───────── */
  function initPost(){
    const id = Number(params.get("id"));
    async function load(){
      let p;
      try{ p = await B.get(id); }catch(e){ p = null; }
      if(!p){ $("post").innerHTML = '<p class="empty">없는 글이거나 삭제된 글이에요.</p><p style="text-align:center"><a class="btn light" href="' + url("board.html") + '">목록으로</a></p>'; $("commentBox").hidden = true; return; }
      document.title = p.title + " | " + S.siteName;
      $("post").innerHTML = '<div class="post-head">' + catChip(p.category) + '<h1>' + esc(p.title) + '</h1>'
        + '<div class="post-meta"><span>' + esc(p.author) + badge(p.authorRole) + '</span><span class="num">' + when(p.createdAt) + '</span><span class="num">조회 ' + p.views + '</span></div></div>'
        + '<div class="post-body">' + esc(p.body) + '</div>'
        + '<div class="post-actions"><button type="button" class="btn light like-btn" id="likeBtn" aria-pressed="' + p.liked + '">추천 <b class="num" id="likeN">' + p.likes + '</b></button>'
        + '<a class="btn light" href="' + url("board.html") + '">목록</a>'
        + (B.canDelete(p) ? '<button type="button" class="btn light" id="delBtn">삭제</button>' : "") + '</div>';
      $("likeBtn").addEventListener("click", () => {
        if(!B.user()) return loginModal();
        B.toggleLike(id).then(r => { $("likeBtn").setAttribute("aria-pressed", r.liked); $("likeN").textContent = r.likes; }).catch(e => toast(e.message));
      });
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
          + (B.canDelete(c) ? '<button type="button" class="text-btn" data-del="' + c.id + '">삭제</button>' : "") + '</div><p>' + esc(c.body) + '</p></div>').join("")
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
    $("writeForm").addEventListener("submit", e => {
      e.preventDefault();
      const btn = $("submitBtn"); btn.disabled = true;
      B.create({ category: $("cat").value, title: $("title").value, body: $("body").value })
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
