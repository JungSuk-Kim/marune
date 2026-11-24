/* 글 보기 주소(/post?id=N)를 카톡·SNS에 공유하면 그 글의 제목·첫 줄·첫 사진이 미리보기로 나오게
   post.html 을 그대로 내보내면서 머리말(og 태그)만 바꿔 줍니다. 글을 못 찾으면 원래 화면 그대로. */
const SUPABASE_URL = "https://biguxhozbstwgjhayuvz.supabase.co";
const SUPABASE_KEY = "sb_publishable_HjJu4VSEbbfmmwKDRlNBbw_SuqVRTgf"; /* 공개용 키 */
const LABEL = { notice: "공지사항", free: "자유게시판", diary: "마루 일기장" };

function plain(body){
  return String(body || "").replace(/^<!--rich-->/, "")
    .replace(/<(br|\/div|\/p|\/li)[^>]*>/gi, " ").replace(/<[^>]+>/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/https?:\/\/\S+/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
function firstImage(body){
  const m = String(body || "").match(/<img[^>]+src="(https:[^"]+)"/i) || String(body || "").match(/!\[[^\]]*\]\((https:[^)\s]+)\)/);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

export async function onRequestGet(ctx){
  const { request, env } = ctx;
  const res = await env.ASSETS.fetch(request);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if(!res.ok || !Number.isInteger(id) || id <= 0) return res;
  let post = null;
  try{
    const cache = caches.default, key = new Request("https://marune-cache/post-og/" + id);
    const hit = await cache.match(key);
    if(hit) post = await hit.json();
    else{
      const r = await fetch(SUPABASE_URL + "/rest/v1/posts?select=title,body,category&id=eq." + id, { headers: { apikey: SUPABASE_KEY } });
      const rows = r.ok ? await r.json() : [];
      post = rows[0] ? { title: rows[0].title, desc: plain(rows[0].body).slice(0, 110), img: firstImage(rows[0].body), cat: rows[0].category } : null;
      if(post) ctx.waitUntil(cache.put(key, new Response(JSON.stringify(post), { headers: { "cache-control": "max-age=300" } })));
    }
  }catch(e){ post = null; }
  if(!post) return res;
  const title = post.title + " | 마루네";
  const desc = (LABEL[post.cat] ? "[" + LABEL[post.cat] + "] " : "") + (post.desc || "마루네 게시판 글");
  const set = (v) => ({ element(el){ el.setAttribute("content", v); } });
  let out = new HTMLRewriter()
    .on("title", { element(el){ el.setInnerContent(title); } })
    .on('meta[name="description"]', set(desc))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:type"]', set("article"))
    .on('meta[property="og:url"]', set(new URL(request.url).origin + "/post?id=" + id));
  if(post.img){
    out = out.on('meta[property="og:image"]', set(post.img))
      .on('meta[property="og:image:width"]', { element(el){ el.remove(); } })
      .on('meta[property="og:image:height"]', { element(el){ el.remove(); } });
  }
  const h = new Headers(res.headers); h.set("cache-control", "no-cache");
  return new Response(out.transform(res).body, { status: res.status, headers: h });
}
