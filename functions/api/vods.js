/* 방송국 캐치·클립: SOOP 방송국 VOD 목록을 읽어 옵니다.
   /api/vods?type=catch|clip&page=1&size=12
   전체 이용가이고 유료가 아닌 영상만 돌려줍니다. Cloudflare 환경 변수 SOOP_ID 를 넣으면 그 아이디가 우선합니다. */
const DEFAULT_SOOP_ID = "mang0707";

function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}
const https = u => !u ? "" : String(u).replace(/^\/\//, "https://").replace(/^http:\/\//, "https://");

export function mapVod(v, type){
  const u = v.ucc || {}, c = v.count || {};
  return {
    id: v.titleNo,
    type,
    title: String(v.titleName || "").replace(/^\[(캐치|클립)\]\s*/, ""),
    author: v.userNick || "",
    thumb: https(u.thumb),
    vthumb: https(u.catchInfo && u.catchInfo.thumb),
    duration: Math.round((u.totalFileDuration || 0) / 1000),
    date: v.regDate || "",
    views: c.readCnt || 0,
    likes: c.likeCnt || 0,
    url: "https://vod.sooplive.com/player/" + v.titleNo + (type === "catch" ? "/catch" : "")
  };
}

export async function onRequestGet({ env, request }){
  const id = (env.SOOP_ID || DEFAULT_SOOP_ID).trim();
  if(!/^[a-zA-Z0-9_]{2,30}$/.test(id)) return json({ ok: false, reason: "방송국 아이디 없음" });
  const u = new URL(request.url);
  const type = u.searchParams.get("type") === "catch" ? "catch" : "clip";
  const page = Math.max(1, Math.min(200, parseInt(u.searchParams.get("page"), 10) || 1));
  const size = Math.max(1, Math.min(20, parseInt(u.searchParams.get("size"), 10) || 12));
  /* SOOP 은 한 번에 20·60개 단위로만 주므로 20개씩 받아 필요한 만큼 자름 */
  const per = 20;
  const start = (page - 1) * size, srcPage = Math.floor(start / per) + 1, offset = start % per;
  const api = n => "https://api-channel.sooplive.com/v1.3/channel/" + id + "/vod/" + type
    + "?startDate=&endDate=&keyword=&orderBy=reg_date&perPage=" + per + "&page=" + n + "&field=title,contents,user_nick,user_id";
  const headers = { "user-agent": "Mozilla/5.0", "accept": "application/json", "origin": "https://www.sooplive.com", "referer": "https://www.sooplive.com/station/" + id + "/vod/" + type };
  try{
    const get = async n => {
      const r = await fetch(api(n), { headers, cf: { cacheTtl: 300, cacheEverything: true } });
      if(!r.ok) throw new Error("SOOP 응답 " + r.status);
      return r.json();
    };
    const d = await get(srcPage);
    let list = Array.isArray(d.contents) ? d.contents : [];
    const meta = d.meta || {};
    if(offset + size > per && srcPage < (meta.totalPages || 1)){
      const d2 = await get(srcPage + 1);
      list = list.concat(Array.isArray(d2.contents) ? d2.contents : []);
    }
    const items = list.slice(offset, offset + size)
      .filter(v => v && v.ucc && !v.ucc.paidPpv && !(v.ucc.grade > 0) && v.ucc.flag === "SUCCEED")
      .map(v => mapVod(v, type));
    const total = meta.totalItems || items.length;
    return json({ ok: true, type, items, total, page, lastPage: Math.max(1, Math.ceil(total / size)) }, 300);
  }catch(e){
    return json({ ok: false, reason: e.message || "SOOP 응답 없음" }, 60);
  }
}
