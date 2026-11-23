/* 방송국 최신 글: SOOP 방송국에 스트리머가 올린 최근 글을 읽어 옵니다.
   전체 공개 글만 보입니다. */
/* 방송국 아이디. Cloudflare 환경 변수 SOOP_ID 를 넣으면 그 값이 우선합니다. */
const DEFAULT_SOOP_ID = "mang0707";
const HOSTS = ["https://chapi.sooplive.com", "https://chapi.sooplive.co.kr"];

function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}
const plain = s => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export async function onRequestGet({ env }){
  const id = (env.SOOP_ID || DEFAULT_SOOP_ID).trim();
  if(!/^[a-zA-Z0-9_]{2,30}$/.test(id)) return json({ ok: false, reason: "SOOP_ID 없음" });
  for(const host of HOSTS){
    try{
      const r = await fetch(host + "/api/" + id + "/home", {
        headers: { "user-agent": "Mozilla/5.0", "accept": "application/json" },
        cf: { cacheTtl: 300, cacheEverything: true }
      });
      if(!r.ok) continue;
      const d = await r.json();
      const items = (Array.isArray(d.boards) ? d.boards : [])
        .filter(b => b && b.user_id === id)
        .slice(0, 6)
        .map(b => ({
          id: b.title_no,
          title: plain(b.title_name),
          text: plain(b.content).slice(0, 140),
          date: b.reg_date || "",
          notice: !!b.is_notice,
          views: (b.count && b.count.read_cnt) || 0,
          comments: (b.count && b.count.comment_cnt) || 0,
          url: "https://www.sooplive.com/station/" + id + "/post/" + b.title_no
        }));
      return json({ ok: true, items }, 300);
    }catch(e){ /* 다음 주소 시도 */ }
  }
  return json({ ok: false, reason: "SOOP 응답 없음" }, 60);
}
