/* 유튜브 최신 영상: 채널의 공개 피드를 읽어 최근 영상 8개를 돌려줍니다.
   채널 ID 는 아래 DEFAULT_CHANNEL_ID 에 적혀 있습니다. */
function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}
const unescape = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/* 마루º 유튜브 채널 (@chaemaru0707). Cloudflare 환경 변수 YOUTUBE_CHANNEL_ID 를 넣으면 그 값이 우선합니다. */
const DEFAULT_CHANNEL_ID = "UCmGMhjEYUqmdkpbG64riM3w";

export async function onRequestGet({ env }){
  const id = (env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID).trim();
  if(!/^UC[a-zA-Z0-9_-]{22}$/.test(id)) return json({ ok: false, reason: "YOUTUBE_CHANNEL_ID 없음" });
  try{
    const r = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + id, { cf: { cacheTtl: 600, cacheEverything: true } });
    if(!r.ok) return json({ ok: false, reason: "유튜브 응답 " + r.status }, 60);
    const xml = await r.text();
    const items = [];
    const re = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while((m = re.exec(xml)) && items.length < 8){
      const e = m[1];
      const vid = (e.match(/<yt:videoId>([^<]+)</) || [])[1];
      const title = (e.match(/<title>([^<]*)</) || [])[1];
      const published = (e.match(/<published>([^<]+)</) || [])[1];
      if(vid) items.push({ id: vid, title: unescape(title || ""), published: published || "" });
    }
    return json({ ok: true, items }, 600);
  }catch(e){
    return json({ ok: false, reason: "유튜브 연결 실패" }, 60);
  }
}
