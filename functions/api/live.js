/* 방송 상태: SOOP 방송국 공개 정보를 대신 읽어 옵니다.
   SOOP 쪽 응답이 바뀌면 { ok:false } 를 돌려주고, 화면은 "채널 바로가기"만 보여줍니다. */
/* 방송국 아이디. Cloudflare 환경 변수 SOOP_ID 를 넣으면 그 값이 우선합니다. */
const DEFAULT_SOOP_ID = "mang0707";
const HOSTS = ["https://chapi.sooplive.com", "https://chapi.sooplive.co.kr"];

function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}

export async function onRequestGet({ env }){
  const id = (env.SOOP_ID || DEFAULT_SOOP_ID).trim();
  if(!/^[a-zA-Z0-9_]{2,30}$/.test(id)) return json({ ok: false, reason: "SOOP_ID 없음" });
  for(const host of HOSTS){
    try{
      const r = await fetch(host + "/api/" + id + "/station", {
        headers: { "user-agent": "Mozilla/5.0", "accept": "application/json" },
        cf: { cacheTtl: 45, cacheEverything: true }
      });
      if(!r.ok) continue;
      const d = await r.json();
      const b = d && d.broad;
      return json({
        ok: true,
        live: !!b,
        title: b ? String(b.broad_title || "") : "",
        viewers: b ? Number(b.current_sum_viewer || 0) : 0,
        /* 라이브 썸네일: 비밀번호·연령제한 방송은 보여주지 않음 */
        thumb: b && b.broad_no && !Number(b.is_password) && b.is_password !== true && Number(b.broad_grade || 0) < 19
          ? "https://liveimg.sooplive.com/m/" + Number(b.broad_no) : "",
        watchUrl: b && b.broad_no ? "https://play.sooplive.com/" + id + "/" + Number(b.broad_no) : ""
      }, 45);
    }catch(e){ /* 다음 주소 시도 */ }
  }
  return json({ ok: false, reason: "SOOP 응답 없음" }, 30);
}
