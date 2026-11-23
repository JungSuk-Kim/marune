/* 게시판 저장소
   data/site.js 에 supabaseUrl 과 supabaseAnonKey 가 있으면 실제 데이터베이스(Supabase)를 쓰고,
   비어 있으면 "체험 모드"로 이 브라우저 안에만 저장합니다. 화면 코드는 두 경우를 구분하지 않습니다. */
(function(){
  const { S, store } = window.CM;
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try{ fn(api.user()); }catch(e){} });
  const SIZE = 15;
  const clean = (s, max) => String(s == null ? "" : s).trim().slice(0, max);

  /* ───────── 체험 모드 ───────── */
  function demoBackend(){
    const now = Date.now(), H = 3600000;
    const seed = {
      seq: 9, cseq: 4,
      posts: [
        { id: 1, category: "notice", title: "마루네 게시판을 열었어요", body: "공지사항, 자유게시판, 마루 일기장이 있어요.\n서로 존중하는 말로 써 주세요. 욕설과 광고 글은 삭제돼요.", author: "운영자", role: "admin", uid: "admin", createdAt: now - 80 * H, views: 142, likes: 9 },
        { id: 2, category: "notice", title: "게시판 이용 규칙", body: "1. 다른 사람을 비난하는 글은 쓰지 않아요.\n2. 개인정보를 올리지 않아요.\n3. 같은 글을 반복해서 올리지 않아요.", author: "운영자", role: "admin", uid: "admin", createdAt: now - 78 * H, views: 96, likes: 4 },
        { id: 3, category: "diary", title: "오늘 방송 끝! 다들 고마워요", body: "오늘도 와 줘서 고마워요.\n내일은 조금 일찍 켤게요.", author: S.streamer || "스트리머", role: "streamer", uid: "streamer", createdAt: now - 30 * H, views: 211, likes: 27 },
        { id: 4, category: "free", title: "체리 2048 황금 체리 만든 사람 있나요", body: "10단계 케이크까지는 갔는데 그다음이 안 돼요.", author: "새벽체리", role: "member", uid: "u1", createdAt: now - 26 * H, views: 34, likes: 3 },
        { id: 5, category: "free", title: "어제 방송 노래 제목 아시는 분", body: "중간에 부른 발라드 제목이 궁금해요.", author: "분홍우산", role: "member", uid: "u2", createdAt: now - 20 * H, views: 18, likes: 1 },
        { id: 6, category: "diary", title: "이번 주 일정 올렸어요", body: "메인 화면 일정표를 확인해 주세요.\n목요일은 쉬어요.", author: S.streamer || "스트리머", role: "streamer", uid: "streamer", createdAt: now - 9 * H, views: 88, likes: 12 },
        { id: 7, category: "free", title: "체리 계단 62칸 찍었습니다", body: "방향 바꾸기가 연속으로 나오면 정신없네요.", author: "번개손", role: "member", uid: "u3", createdAt: now - 5 * H, views: 21, likes: 5 },
        { id: 8, category: "free", title: "오늘 방송 몇 시인가요", body: "퇴근하고 바로 들어가려고요.", author: "체리1호", role: "member", uid: "u4", createdAt: now - 2 * H, views: 9, likes: 0 }
      ],
      comments: [
        { id: 1, postId: 4, body: "저는 9단계가 최고예요", author: "분홍우산", role: "member", uid: "u2", createdAt: now - 25 * H },
        { id: 2, postId: 3, body: "오늘도 재밌었어요", author: "체리1호", role: "member", uid: "u4", createdAt: now - 29 * H },
        { id: 3, postId: 8, body: "일정표에는 저녁 8시로 나와 있어요", author: "새벽체리", role: "member", uid: "u1", createdAt: now - 1 * H }
      ],
      likes: []
    };
    let db = store.get("board-demo", null) || seed;
    const save = () => store.set("board-demo", db);
    let me = store.get("board-demo-user", null);
    const count = id => db.comments.filter(c => c.postId === id).length;
    const view = p => ({ id: p.id, category: p.category, title: p.title, author: p.author, authorRole: p.role, mine: !!me && me.id === p.uid,
      createdAt: p.createdAt, views: p.views, likes: p.likes, comments: count(p.id) });
    return {
      mode: "demo",
      init: async () => {},
      user: () => me,
      signIn: async kind => {
        me = kind === "admin" ? { id: "admin", nickname: "운영자", role: "admin" }
          : kind === "streamer" ? { id: "streamer", nickname: S.streamer || "스트리머", role: "streamer" }
          : { id: "demo", nickname: "체리손님", role: "member" };
        store.set("board-demo-user", me); emit();
      },
      signOut: async () => { me = null; store.set("board-demo-user", null); emit(); },
      setNickname: async n => { me.nickname = n; store.set("board-demo-user", me); emit(); },
      list: async ({ cat, q, sort, page, size }) => {
        let a = db.posts.filter(p => (!cat || p.category === cat) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));
        const key = sort === "views" ? "views" : sort === "likes" ? "likes" : "createdAt";
        a.sort((x, y) => y[key] - x[key] || y.createdAt - x.createdAt);
        const n = size || SIZE, start = ((page || 1) - 1) * n;
        return { items: a.slice(start, start + n).map(view), total: a.length };
      },
      get: async id => {
        const p = db.posts.find(x => x.id === id); if(!p) return null;
        p.views++; save();
        return Object.assign(view(p), { body: p.body, liked: !!me && db.likes.some(l => l.postId === id && l.uid === me.id) });
      },
      create: async ({ category, title, body }) => {
        const p = { id: db.seq++, category, title, body, author: me.nickname, role: me.role, uid: me.id, createdAt: Date.now(), views: 0, likes: 0 };
        db.posts.push(p); save(); return p.id;
      },
      remove: async id => { db.posts = db.posts.filter(p => p.id !== id); db.comments = db.comments.filter(c => c.postId !== id); save(); },
      comments: async id => db.comments.filter(c => c.postId === id).sort((a, b) => a.createdAt - b.createdAt)
        .map(c => ({ id: c.id, body: c.body, author: c.author, authorRole: c.role, createdAt: c.createdAt, mine: !!me && me.id === c.uid })),
      addComment: async (id, body) => { db.comments.push({ id: db.cseq++, postId: id, body, author: me.nickname, role: me.role, uid: me.id, createdAt: Date.now() }); save(); },
      removeComment: async cid => { db.comments = db.comments.filter(c => c.id !== cid); save(); },
      toggleLike: async id => {
        const p = db.posts.find(x => x.id === id), i = db.likes.findIndex(l => l.postId === id && l.uid === me.id);
        if(i >= 0){ db.likes.splice(i, 1); p.likes = Math.max(0, p.likes - 1); } else { db.likes.push({ postId: id, uid: me.id }); p.likes++; }
        save(); return { liked: i < 0, likes: p.likes };
      }
    };
  }

  /* ───────── Supabase ───────── */
  function supabaseBackend(){
    let sb = null, me = null;
    const AUTHOR = "author:profiles!posts_author_id_fkey(nickname,role)";
    const row = p => ({ id: p.id, category: p.category, title: p.title, author: (p.author && p.author.nickname) || "알 수 없음", authorRole: (p.author && p.author.role) || "member",
      mine: !!me && me.id === p.author_id, createdAt: Date.parse(p.created_at), views: p.views, likes: p.like_count, comments: p.comment_count });
    const check = r => { if(r.error) throw new Error(r.error.message || "요청을 처리하지 못했어요"); return r; };
    async function loadProfile(){
      const { data } = await sb.auth.getSession();
      const session = data && data.session;
      if(!session){ me = null; return; }
      const r = await sb.from("profiles").select("id,nickname,role").eq("id", session.user.id).maybeSingle();
      me = r.data || { id: session.user.id, nickname: "새 체리", role: "member" };
    }
    return {
      mode: "supabase",
      init: () => new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
        s.onload = async () => {
          try{
            sb = window.supabase.createClient(S.supabaseUrl, S.supabaseAnonKey);
            await loadProfile();
            /* 콜백 안에서 바로 다른 요청을 기다리면 멈출 수 있어 한 박자 늦춰 처리 */
            sb.auth.onAuthStateChange(() => { setTimeout(() => loadProfile().then(emit), 0); });
            resolve();
          }catch(e){ reject(e); }
        };
        s.onerror = () => reject(new Error("게시판 서버에 연결하지 못했어요"));
        document.head.appendChild(s);
      }),
      user: () => me,
      signIn: async provider => { check(await sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.href } })); },
      signOut: async () => { await sb.auth.signOut(); me = null; emit(); },
      setNickname: async n => { check(await sb.from("profiles").update({ nickname: n }).eq("id", me.id)); me.nickname = n; emit(); },
      list: async ({ cat, q, sort, page, size }) => {
        const n = size || SIZE, start = ((page || 1) - 1) * n;
        let query = sb.from("posts").select("id,category,title,author_id,created_at,views,like_count,comment_count," + AUTHOR, { count: "exact" });
        if(cat) query = query.eq("category", cat);
        if(q) query = query.ilike("title", "%" + q.replace(/[%_\\]/g, m => "\\" + m) + "%");
        const col = sort === "views" ? "views" : sort === "likes" ? "like_count" : "created_at";
        query = query.order(col, { ascending: false });
        if(col !== "created_at") query = query.order("created_at", { ascending: false });
        const r = check(await query.range(start, start + n - 1));
        return { items: (r.data || []).map(row), total: r.count || 0 };
      },
      get: async id => {
        const r = await sb.from("posts").select("id,category,title,body,author_id,created_at,views,like_count,comment_count," + AUTHOR).eq("id", id).maybeSingle();
        if(r.error || !r.data) return null;
        sb.rpc("increment_view", { pid: id }).then(() => {}, () => {});
        let liked = false;
        if(me){ const l = await sb.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", me.id).maybeSingle(); liked = !!l.data; }
        return Object.assign(row(r.data), { body: r.data.body, liked });
      },
      create: async ({ category, title, body }) => {
        const r = check(await sb.from("posts").insert({ category, title, body, author_id: me.id }).select("id").single());
        return r.data.id;
      },
      remove: async id => { check(await sb.from("posts").delete().eq("id", id)); },
      comments: async id => {
        const r = check(await sb.from("comments").select("id,body,created_at,author_id,author:profiles!comments_author_id_fkey(nickname,role)").eq("post_id", id).order("created_at", { ascending: true }));
        return (r.data || []).map(c => ({ id: c.id, body: c.body, author: (c.author && c.author.nickname) || "알 수 없음", authorRole: (c.author && c.author.role) || "member",
          createdAt: Date.parse(c.created_at), mine: !!me && me.id === c.author_id }));
      },
      addComment: async (id, body) => { check(await sb.from("comments").insert({ post_id: id, body, author_id: me.id })); },
      removeComment: async cid => { check(await sb.from("comments").delete().eq("id", cid)); },
      toggleLike: async id => {
        const l = await sb.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", me.id).maybeSingle();
        if(l.data) check(await sb.from("post_likes").delete().eq("post_id", id).eq("user_id", me.id));
        else check(await sb.from("post_likes").insert({ post_id: id, user_id: me.id }));
        const p = await sb.from("posts").select("like_count").eq("id", id).maybeSingle();
        return { liked: !l.data, likes: (p.data && p.data.like_count) || 0 };
      }
    };
  }

  const configured = !!(S.supabaseUrl && S.supabaseAnonKey);
  const be = configured ? supabaseBackend() : demoBackend();
  const BOARDS = S.boards || [];
  const api = {
    mode: be.mode,
    pageSize: SIZE,
    boards: BOARDS,
    label: id => (BOARDS.find(b => b.id === id) || {}).label || id,
    user: () => be.user(),
    onAuth: fn => listeners.push(fn),
    /* 이 게시판에 글을 쓸 수 있는지: write 값이 member 면 로그인한 누구나, streamer 면 스트리머·운영자, admin 이면 운영자만 */
    canWrite(cat){
      const u = be.user(), b = BOARDS.find(x => x.id === cat);
      if(!u || !b || b.external) return false;
      if(u.role === "admin") return true;
      if(b.write === "member") return true;
      return b.write === "streamer" && u.role === "streamer";
    },
    canDelete: item => { const u = be.user(); return !!u && (item.mine || u.role === "admin"); },
    signIn: p => be.signIn(p),
    signOut: () => be.signOut(),
    setNickname: n => {
      n = clean(n, 16);
      if(n.length < 2) return Promise.reject(new Error("닉네임은 2~16자로 써 주세요"));
      return be.setNickname(n);
    },
    list: o => be.list(o || {}),
    get: id => be.get(Number(id)),
    create: o => {
      const title = clean(o.title, 100), body = clean(o.body, 5000);
      if(!title) return Promise.reject(new Error("제목을 써 주세요"));
      if(!body) return Promise.reject(new Error("내용을 써 주세요"));
      if(!api.canWrite(o.category)) return Promise.reject(new Error("이 게시판에는 글을 쓸 수 없어요"));
      return be.create({ category: o.category, title, body });
    },
    remove: id => be.remove(Number(id)),
    comments: id => be.comments(Number(id)),
    addComment: (id, body) => {
      body = clean(body, 500);
      if(!body) return Promise.reject(new Error("댓글 내용을 써 주세요"));
      if(!be.user()) return Promise.reject(new Error("로그인한 뒤 쓸 수 있어요"));
      return be.addComment(Number(id), body);
    },
    removeComment: cid => be.removeComment(Number(cid)),
    toggleLike: id => be.user() ? be.toggleLike(Number(id)) : Promise.reject(new Error("로그인한 뒤 추천할 수 있어요"))
  };
  api.ready = be.init().catch(e => { api.error = e.message; });
  window.BoardStore = api;
})();
