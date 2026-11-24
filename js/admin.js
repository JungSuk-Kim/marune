/* 운영자 화면 (admin.html): 신고 · 회원 · 글과 댓글 · 도전미션 · 공약 · 영상 용량
   권한은 데이터베이스(supabase/admin.sql)가 다시 확인하므로, 이 화면을 열어도 운영자가 아니면 아무것도 바꿀 수 없어요. */
(function(){
  const { esc, url, toast } = window.CM;
  const B = window.BoardStore;
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const day = ts => { const d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const time = ts => { const d = new Date(ts); return day(ts) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const ROLE = { member: "회원", streamer: "스트리머", admin: "운영자" };
  const PROV = { kakao: "카카오", google: "구글", email: "이메일" };
  const plain = s => { const d = document.createElement("div"); d.innerHTML = String(s || "").replace(/^<!--rich-->/, ""); return (d.textContent || "").replace(/\s+/g, " ").trim(); };
  const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + "MB";
  let sb = null;
  const ok = r => { if(r.error) throw new Error(r.error.message); return r.data; };
  const fail = e => toast(e.message || "처리하지 못했어요");

  function gate(){
    const u = B.user();
    if(B.mode === "demo"){ $("adminGate").innerHTML = '<p class="empty">체험 모드에서는 운영자 화면을 쓸 수 없어요. data/site.js 에 Supabase 설정을 넣어 주세요.</p>'; return false; }
    if(!u){ $("adminGate").innerHTML = '<p class="empty">운영자 계정으로 로그인해 주세요.</p>'; return false; }
    if(u.role !== "admin"){ $("adminGate").innerHTML = '<p class="empty">운영자만 볼 수 있는 화면이에요.</p>'; return false; }
    $("adminGate").innerHTML = ""; return true;
  }

  /* ── 탭 ── */
  const TABS = { reports: loadReports, members: loadMembers, content: loadContent, missions: loadMissions, promises: loadPromises, videos: loadVideos };
  let current = (location.hash || "").slice(1);
  if(!TABS[current]) current = "reports";
  function show(name){
    current = name;
    document.querySelectorAll("#adminTabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    document.querySelectorAll(".admin-panel").forEach(p => p.hidden = p.id !== "p-" + name);
    history.replaceState(null, "", "#" + name);
    TABS[name]().catch(fail);
  }
  $("adminTabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if(b) show(b.dataset.tab); });

  /* ── 신고 ── */
  let repFilter = "open";
  async function loadReports(){
    const el = $("reportList");
    el.innerHTML = '<p class="empty">불러오는 중…</p>';
    const rs = ok(await sb.from("reports").select("*").eq("status", repFilter).order("created_at", { ascending: false }).limit(100));
    const openN = ok(await sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open").then(r => ({ data: r.count, error: r.error })));
    $("repCount").textContent = openN ? openN + "건" : "";
    $("tabRepN").textContent = openN || "";
    if(!rs.length){ el.innerHTML = '<p class="empty">' + (repFilter === "open" ? "확인할 신고가 없어요" : "처리한 신고가 없어요") + '</p>'; return; }
    const pids = [...new Set(rs.filter(r => r.target_type === "post").map(r => r.target_id))];
    const cids = [...new Set(rs.filter(r => r.target_type === "comment").map(r => r.target_id))];
    const posts = pids.length ? ok(await sb.from("posts").select("id,title,body,author_id,author:profiles!posts_author_id_fkey(nickname,banned)").in("id", pids)) : [];
    const coms = cids.length ? ok(await sb.from("comments").select("id,body,author_id,author:profiles!comments_author_id_fkey(nickname,banned)").in("id", cids)) : [];
    const rids = [...new Set(rs.map(r => r.reporter_id))];
    const reps = ok(await sb.from("profiles").select("id,nickname").in("id", rids));
    const T = {}; posts.forEach(p => T["post" + p.id] = { text: p.title, more: plain(p.body).slice(0, 120), author: p.author, aid: p.author_id, body: p.body });
    coms.forEach(c => T["comment" + c.id] = { text: c.body, author: c.author, aid: c.author_id });
    const nick = id => (reps.find(p => p.id === id) || {}).nickname || "알 수 없음";
    el.innerHTML = rs.map(r => {
      const t = T[r.target_type + r.target_id];
      return '<div class="adm-row rep"><div class="adm-main">'
        + '<div class="adm-top"><span class="cat ' + (r.target_type === "post" ? "free" : "diary") + '">' + (r.target_type === "post" ? "글" : "댓글") + '</span><b>' + esc(r.reason) + '</b><span class="sec-sub num">' + time(r.created_at) + ' · 신고한 사람 ' + esc(nick(r.reporter_id)) + '</span></div>'
        + (t ? '<p class="adm-quote"><a href="' + url("post.html?id=" + r.post_id) + '" target="_blank" rel="noopener">' + esc(t.text) + '</a>' + (t.more ? '<br><small>' + esc(t.more) + '</small>' : "") + '</p>'
             + '<p class="sec-sub">작성자 <b>' + esc((t.author && t.author.nickname) || "알 수 없음") + '</b>' + (t.author && t.author.banned ? ' <span class="role-badge">정지됨</span>' : "") + '</p>'
           : '<p class="sec-sub">이미 삭제된 ' + (r.target_type === "post" ? "글" : "댓글") + '이에요</p>')
        + '</div><div class="adm-acts">'
        + (t ? '<button type="button" class="btn light" data-act="del" data-id="' + r.id + '">' + (r.target_type === "post" ? "글" : "댓글") + ' 삭제</button>' : "")
        + (t && t.author && !t.author.banned ? '<button type="button" class="btn light" data-act="ban" data-id="' + r.id + '">작성자 정지</button>' : "")
        + (r.status === "open" ? '<button type="button" class="btn" data-act="done" data-id="' + r.id + '">처리 완료</button>' : '<button type="button" class="text-btn" data-act="reopen" data-id="' + r.id + '">다시 열기</button>')
        + '</div></div>';
    }).join("");
    el.onclick = async e => {
      const b = e.target.closest("[data-act]"); if(!b) return;
      const r = rs.find(x => x.id === Number(b.dataset.id)), t = T[r.target_type + r.target_id];
      b.disabled = true;
      try{
        if(b.dataset.act === "del"){
          if(!confirmIn(b, "정말 지울까요?")) return;
          if(r.target_type === "post"){ await B.remove(r.target_id); await B.removeMedia(t.body); }
          else ok(await sb.from("comments").delete().eq("id", r.target_id));
          ok(await sb.from("reports").update({ status: "done" }).eq("target_type", r.target_type).eq("target_id", r.target_id));
          toast("지웠어요");
        }
        if(b.dataset.act === "ban"){
          if(!confirmIn(b, "정지할까요?")) return;
          ok(await sb.rpc("admin_set_banned", { target: t.aid, value: true }));
          toast("작성자를 정지했어요. 글·댓글을 더 쓸 수 없어요");
        }
        if(b.dataset.act === "done") ok(await sb.from("reports").update({ status: "done" }).eq("id", r.id));
        if(b.dataset.act === "reopen") ok(await sb.from("reports").update({ status: "open" }).eq("id", r.id));
        loadReports().catch(fail);
      }catch(err){ fail(err); b.disabled = false; }
    };
  }
  /* 지우기·정지처럼 되돌리기 어려운 버튼은 한 번 더 누르게 */
  function confirmIn(b, msg){
    if(b.dataset.sure){ return true; }
    b.dataset.sure = "1"; b.dataset.orig = b.textContent; b.textContent = msg; b.disabled = false; b.classList.add("cherry");
    setTimeout(() => { if(b.isConnected){ delete b.dataset.sure; b.textContent = b.dataset.orig; b.classList.remove("cherry"); } }, 4000);
    return false;
  }
  $("repSeg").addEventListener("click", e => {
    const b = e.target.closest("[data-s]"); if(!b) return;
    repFilter = b.dataset.s;
    $("repSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    loadReports().catch(fail);
  });

  /* ── 회원 ── */
  let members = [];
  async function loadMembers(){
    members = ok(await sb.rpc("admin_members")) || [];
    drawMembers();
  }
  function drawMembers(){
    const q = $("memQ").value.trim().toLowerCase();
    const list = members.filter(m => !q || (m.nickname || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q));
    $("memCount").textContent = "전체 " + members.length + "명" + (q ? " · 찾은 " + list.length + "명" : "");
    const me = B.user().id;
    $("memberList").innerHTML = list.length ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>닉네임</th><th>로그인</th><th>가입일</th><th>최근 접속</th><th>글/댓글</th><th>역할</th><th>상태</th></tr></thead><tbody>'
      + list.map(m => '<tr' + (m.banned ? ' class="banned"' : "") + '><td><b>' + esc(m.nickname) + '</b>' + (m.id === me ? ' <span class="sec-sub">(나)</span>' : "") + '<br><small class="sec-sub">' + esc(m.email || "이메일 없음") + '</small></td>'
        + '<td>' + esc(PROV[m.provider] || m.provider || "") + '</td><td class="num">' + day(m.created_at) + '</td><td class="num">' + (m.last_sign_in_at ? day(m.last_sign_in_at) : "-") + '</td>'
        + '<td class="num">' + m.posts + ' / ' + m.comments + '</td>'
        + '<td><select class="field" data-role="' + m.id + '"' + (m.id === me ? " disabled" : "") + '>' + Object.keys(ROLE).map(k => '<option value="' + k + '"' + (k === m.role ? " selected" : "") + '>' + ROLE[k] + '</option>').join("") + '</select></td>'
        + '<td>' + (m.id === me ? "" : '<button type="button" class="btn light" data-ban="' + m.id + '" data-v="' + (!m.banned) + '">' + (m.banned ? "정지 풀기" : "정지") + '</button>') + '</td></tr>').join("")
      + '</tbody></table></div>' : '<p class="empty">회원이 없어요</p>';
  }
  $("memQ").addEventListener("input", drawMembers);
  $("memberList").addEventListener("change", e => {
    const s = e.target.closest("[data-role]"); if(!s) return;
    const m = members.find(x => x.id === s.dataset.role);
    sb.rpc("admin_set_role", { target: m.id, new_role: s.value }).then(ok)
      .then(() => { m.role = s.value; toast(m.nickname + " 님을 " + ROLE[s.value] + "(으)로 바꿨어요"); })
      .catch(err => { s.value = m.role; fail(err); });
  });
  $("memberList").addEventListener("click", e => {
    const b = e.target.closest("[data-ban]"); if(!b) return;
    const v = b.dataset.v === "true";
    if(v && !confirmIn(b, "정지할까요?")) return;
    b.disabled = true;
    sb.rpc("admin_set_banned", { target: b.dataset.ban, value: v }).then(ok).then(() => { toast(v ? "정지했어요" : "정지를 풀었어요"); return loadMembers(); }).catch(err => { fail(err); b.disabled = false; });
  });

  /* ── 글·댓글 ── */
  async function loadContent(){
    const ps = ok(await sb.from("posts").select("id,category,title,body,created_at,comment_count,author:profiles!posts_author_id_fkey(nickname)").order("created_at", { ascending: false }).limit(30));
    const cs = ok(await sb.from("comments").select("id,post_id,body,created_at,author:profiles!comments_author_id_fkey(nickname)").order("created_at", { ascending: false }).limit(30));
    $("postAdmin").innerHTML = ps.length ? ps.map(p => '<div class="adm-row"><div class="adm-main"><div class="adm-top"><span class="cat ' + esc(p.category) + '">' + esc(B.label(p.category)) + '</span>'
      + '<a href="' + url("post.html?id=" + p.id) + '" target="_blank" rel="noopener"><b>' + esc(p.title) + '</b></a></div><p class="sec-sub">' + esc((p.author && p.author.nickname) || "알 수 없음") + ' · <span class="num">' + time(p.created_at) + '</span> · 댓글 ' + p.comment_count + '</p></div>'
      + '<div class="adm-acts"><a class="btn light" href="' + url("write.html?edit=" + p.id) + '">수정</a><button type="button" class="btn light" data-dp="' + p.id + '">삭제</button></div></div>').join("") : '<p class="empty">글이 없어요</p>';
    $("commentAdmin").innerHTML = cs.length ? cs.map(c => '<div class="adm-row"><div class="adm-main"><p>' + esc(c.body) + '</p><p class="sec-sub">' + esc((c.author && c.author.nickname) || "알 수 없음") + ' · <span class="num">' + time(c.created_at) + '</span> · <a href="' + url("post.html?id=" + c.post_id) + '" target="_blank" rel="noopener">글 보기</a></p></div>'
      + '<div class="adm-acts"><button type="button" class="btn light" data-dc="' + c.id + '">삭제</button></div></div>').join("") : '<p class="empty">댓글이 없어요</p>';
    $("p-content").onclick = async e => {
      const b = e.target.closest("[data-dp], [data-dc]"); if(!b) return;
      if(!confirmIn(b, "정말 지울까요?")) return;
      b.disabled = true;
      try{
        if(b.dataset.dp){ const p = ps.find(x => x.id === Number(b.dataset.dp)); await B.remove(p.id); await B.removeMedia(p.body); }
        else ok(await sb.from("comments").delete().eq("id", Number(b.dataset.dc)));
        toast("지웠어요"); loadContent().catch(fail);
      }catch(err){ fail(err); b.disabled = false; }
    };
  }

  /* ── 도전미션 ── */
  const STATUS = ["진행중", "성공", "실패"];
  async function loadMissions(){
    const ms = ok(await sb.from("missions").select("*").order("day", { ascending: false }).order("id", { ascending: false }).limit(200));
    $("missionAdmin").innerHTML = ms.length ? ms.map(m => '<div class="adm-row" data-id="' + m.id + '"><div class="adm-main"><div class="adm-top"><b>' + esc(m.title) + '</b></div>'
      + '<p class="sec-sub num">' + esc(m.day) + ' · ⭐ ' + Number(m.balloons).toLocaleString() + '개' + (m.requester ? ' · ' + esc(m.requester) + ' 님' : "") + '</p></div>'
      + '<div class="adm-acts"><select class="field" data-ms>' + STATUS.map(s => '<option' + (s === m.status ? " selected" : "") + '>' + s + '</option>').join("") + '</select><button type="button" class="btn light" data-mdel>삭제</button></div></div>').join("")
      : '<p class="empty">아직 적은 도전미션이 없어요. 하나라도 적으면 공약현황 페이지에 예시 대신 이 목록이 보여요.</p>';
  }
  $("missionForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, row = { title: f.mTitle.value.trim(), balloons: Number(f.mBalloons.value) || 0, requester: f.mBy.value.trim(), status: f.mStatus.value, day: f.mDay.value || day(Date.now()) };
    if(!row.title) return toast("미션 내용을 써 주세요");
    sb.from("missions").insert(row).then(ok).then(() => { f.mTitle.value = ""; f.mBalloons.value = ""; f.mBy.value = ""; toast("추가했어요"); return loadMissions(); }).catch(fail);
  });
  $("missionAdmin").addEventListener("change", e => {
    const s = e.target.closest("[data-ms]"); if(!s) return;
    sb.from("missions").update({ status: s.value }).eq("id", Number(s.closest("[data-id]").dataset.id)).then(ok).then(() => toast("바꿨어요")).catch(fail);
  });
  $("missionAdmin").addEventListener("click", e => {
    const b = e.target.closest("[data-mdel]"); if(!b) return;
    if(!confirmIn(b, "지울까요?")) return;
    sb.from("missions").delete().eq("id", Number(b.closest("[data-id]").dataset.id)).then(ok).then(loadMissions).catch(fail);
  });

  /* ── 공약 ── */
  async function loadPromises(){
    const ps = ok(await sb.from("promises").select("*").order("sort").order("id"));
    $("promiseAdmin").innerHTML = ps.length ? ps.map(p => '<div class="adm-row" data-id="' + p.id + '"><div class="adm-main"><div class="adm-top"><b>' + esc(p.title) + '</b>' + (p.done ? ' <span class="role-badge">완료</span>' : "") + '</div>'
      + (p.note ? '<p class="sec-sub">' + esc(p.note) + '</p>' : "") + '</div>'
      + '<div class="adm-acts"><input class="field num" type="number" min="0" value="' + p.now_value + '" data-now style="width:96px"><span class="sec-sub num">/ ' + p.goal.toLocaleString() + esc(p.unit) + '</span>'
      + '<button type="button" class="btn light" data-done>' + (p.done ? "진행 중으로" : "완료") + '</button><button type="button" class="btn light" data-pdel>삭제</button></div></div>').join("")
      : '<p class="empty">아직 적은 공약이 없어요. 하나라도 적으면 공약현황 페이지에 예시 대신 이 목록이 보여요.</p>';
    $("promiseAdmin").onchange = e => {
      const i = e.target.closest("[data-now]"); if(!i) return;
      sb.from("promises").update({ now_value: Number(i.value) || 0 }).eq("id", Number(i.closest("[data-id]").dataset.id)).then(ok).then(() => toast("숫자를 바꿨어요")).catch(fail);
    };
    $("promiseAdmin").onclick = e => {
      const row = e.target.closest("[data-id]"); if(!row) return;
      const p = ps.find(x => x.id === Number(row.dataset.id));
      if(e.target.closest("[data-done]")) sb.from("promises").update({ done: !p.done }).eq("id", p.id).then(ok).then(loadPromises).catch(fail);
      const d = e.target.closest("[data-pdel]");
      if(d && confirmIn(d, "지울까요?")) sb.from("promises").delete().eq("id", p.id).then(ok).then(loadPromises).catch(fail);
    };
  }
  $("promiseForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target, row = { title: f.pTitle.value.trim(), now_value: Number(f.pNow.value) || 0, goal: Math.max(1, Number(f.pGoal.value) || 1), unit: f.pUnit.value.trim(), note: f.pNote.value.trim(), sort: Date.now() % 2147483647 };
    if(!row.title) return toast("공약 내용을 써 주세요");
    sb.from("promises").insert(row).then(ok).then(() => { ["pTitle", "pNow", "pGoal", "pUnit", "pNote"].forEach(k => f[k].value = ""); toast("추가했어요"); return loadPromises(); }).catch(fail);
  });

  /* ── 영상 용량 ── */
  async function loadVideos(){
    const t = await B.token();
    const r = await fetch(url("api/video?usage=1"), { headers: { authorization: "Bearer " + t } });
    const d = await r.json().catch(() => null);
    if(!d || !d.ok) throw new Error((d && d.reason) || "영상 사용량을 불러오지 못했어요");
    const pct = Math.min(100, d.used / d.maxTotal * 100), mpct = Math.min(100, d.monthUploads / d.perMonth * 100);
    $("videoUsage").innerHTML = '<div class="adm-usage"><div><div class="p-top"><b>저장 공간</b><span class="num">' + mb(d.used) + ' / ' + mb(d.maxTotal) + ' · ' + pct.toFixed(1) + '%</span></div><div class="bar"><i style="width:' + pct + '%"></i></div>'
      + '<p class="p-note">무료 10GB 중 9GB에서 새 영상 올리기를 멈춰요. 영상 ' + d.count + '개</p></div>'
      + '<div><div class="p-top"><b>이번 달 올린 영상</b><span class="num">' + d.monthUploads + ' / ' + d.perMonth + '개</span></div><div class="bar"><i style="width:' + mpct + '%"></i></div>'
      + '<p class="p-note">한 개 ' + mb(d.maxSize) + ', 한 사람 하루 ' + d.perUserDay + '개까지. 다음 달 1일에 다시 0부터 세요</p></div></div>';
    $("videoFiles").innerHTML = d.files.length ? '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>파일</th><th>크기</th><th>올린 날</th><th></th></tr></thead><tbody>'
      + d.files.map(f => '<tr><td><a href="/v/' + esc(f.key) + '" target="_blank" rel="noopener" class="num">' + esc(f.key.split("/")[1]) + '</a></td><td class="num">' + mb(f.size) + '</td><td class="num">' + time(f.uploaded) + '</td>'
        + '<td><button type="button" class="btn light" data-vk="' + esc(f.key) + '">삭제</button></td></tr>').join("") + '</tbody></table></div>'
      : '<p class="empty">올라온 영상이 없어요</p>';
    $("videoFiles").onclick = async e => {
      const b = e.target.closest("[data-vk]"); if(!b) return;
      if(!confirmIn(b, "지울까요? 글 속 영상도 사라져요")) return;
      b.disabled = true;
      const x = await fetch(url("api/video?key=" + encodeURIComponent(b.dataset.vk)), { method: "DELETE", headers: { authorization: "Bearer " + t } }).catch(() => null);
      if(x && x.ok){ toast("지웠어요"); loadVideos().catch(fail); } else { toast("지우지 못했어요"); b.disabled = false; }
    };
  }

  B.ready.then(() => {
    const start = () => {
      const can = gate();
      $("adminBody").hidden = !can;
      if(!can) return;
      sb = B.client();
      $("mDay").value = day(Date.now());
      show(current);
    };
    B.onAuth(start);
    start();
  });
})();
