/* 방송국 글: SOOP 방송국 게시판에 스트리머가 올린 글을 읽어 옵니다.
   /api/notices?page=1&size=15
   전체 공개 글만 보입니다. Cloudflare 환경 변수 SOOP_ID 를 넣으면 그 아이디가 우선합니다. */
const DEFAULT_SOOP_ID = "mang0707";
const HOSTS = ["https://chapi.sooplive.com", "https://chapi.sooplive.co.kr"];

function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}
const plain = s => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export function mapPost(b, id){
  const c = b.count || {};
  return {
    id: b.title_no,
    title: plain(b.title_name),
    text: plain((b.content && (b.content.summary || b.content.text_content)) || "").slice(0, 140),
    board: plain(b.display && b.display.bbs_name),
    date: b.reg_date || "",
    notice: !!b.notice_yn,
    views: c.read_cnt || 0,
    comments: c.comment_cnt || 0,
    likes: c.like_cnt || 0,
    photos: b.photo_cnt || 0,
    author: b.user_nick || "",
    url: "https://www.sooplive.com/station/" + id + "/post/" + b.title_no
  };
}

export async function onRequestGet({ env, request }){
  const id = (env.SOOP_ID || DEFAULT_SOOP_ID).trim();
  if(!/^[a-zA-Z0-9_]{2,30}$/.test(id)) return json({ ok: false, reason: "방송국 아이디 없음" });
  const u = new URL(request.url);
  const page = Math.max(1, Math.min(500, parseInt(u.searchParams.get("page"), 10) || 1));
  const size = Math.max(1, Math.min(30, parseInt(u.searchParams.get("size"), 10) || 15));
  /* SOOP은 한 번에 최소 10개를 주므로, 적게 요청하면 10개를 받아 앞에서 자름 */
  const per = Math.max(10, size);
  const qs = "per_page=" + per + "&page=" + page + "&field=title%2Ccontents&keyword=&type=all&order_by=reg_date&board_number=";
  for(const host of HOSTS){
    try{
      const r = await fetch(host + "/api/" + id + "/board/?" + qs, {
        headers: { "user-agent": "Mozilla/5.0", "accept": "application/json" },
        cf: { cacheTtl: 180, cacheEverything: true }
      });
      if(!r.ok) continue;
      const d = await r.json();
      /* 스트리머 본인이 쓴 글만 */
      const items = (Array.isArray(d.data) ? d.data : []).filter(b => b && b.user_id === id).slice(0, size).map(b => mapPost(b, id));
      const meta = d.meta || {};
      return json({ ok: true, items, total: meta.total || items.length, page: meta.current_page || page, lastPage: meta.last_page || 1 }, 180);
    }catch(e){ /* 다음 주소 시도 */ }
  }
  return json({ ok: false, reason: "SOOP 응답 없음" }, 60);
}
