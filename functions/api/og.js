/* 링크 미리보기: 게시판 글에 쓴 링크의 제목·설명·대표 이미지를 읽어 옵니다.
   /api/og?url=https://...
   공개된 웹 주소만 읽고(내부 주소·IP 주소는 거절), 앞부분 512KB만 읽습니다. 결과는 하루 동안 저장해 둡니다. */
const MAX = 512 * 1024;

function json(body, maxAge){
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + (maxAge || 0) }
  });
}
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = s => String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if(e[0] === "#"){ const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""; }
  return ENT[e.toLowerCase()] ?? m;
}).replace(/\s+/g, " ").trim();
const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;

function okHost(h){
  h = h.toLowerCase();
  if(!h.includes(".") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return false;
  if(/^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return false; /* IP 주소 */
  return true;
}

function parse(html, base){
  const meta = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for(const t of tags){
    const attr = k => { const m = t.match(new RegExp("\\b" + k + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i")); return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null; };
    const key = (attr("property") || attr("name") || "").toLowerCase(), val = attr("content");
    if(key && val != null && !(key in meta)) meta[key] = decode(val);
  }
  const title = meta["og:title"] || meta["twitter:title"] || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description = meta["og:description"] || meta["twitter:description"] || meta["description"] || "";
  let image = meta["og:image:secure_url"] || meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] || meta["twitter:image:src"] || "";
  try{ image = image ? new URL(image, base).toString() : ""; }catch(e){ image = ""; }
  if(image && !/^https?:\/\//.test(image)) image = "";
  if(image.startsWith("http://")) image = "https://" + image.slice(7);
  return {
    title: clip(title, 120),
    description: clip(description, 200),
    image,
    site: clip(meta["og:site_name"] || new URL(base).hostname.replace(/^www\./, ""), 40)
  };
}

const https = u => !u ? "" : String(u).replace(/^\/\//, "https://").replace(/^http:\/\//, "https://");
const UA = { "user-agent": "Mozilla/5.0", "accept": "application/json" };

/* 일반 페이지로는 제목이 안 나오는 사이트(유튜브·SOOP)는 각자 공개 정보에서 읽음 */
async function special(t){
  const h = t.hostname.replace(/^(www|m)\./, "");
  if(h === "youtube.com" || h === "youtu.be" || h === "music.youtube.com"){
    const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(t.toString()), { headers: UA });
    if(!r.ok) return null;
    const d = await r.json();
    return { title: clip(decode(d.title), 120), description: d.author_name ? clip(decode(d.author_name), 80) : "", image: https(d.thumbnail_url), site: "YouTube" };
  }
  if(/^vod\.sooplive\.(com|co\.kr)$/.test(t.hostname)){
    const no = (t.pathname.match(/\/player\/(\d+)/) || [])[1];
    if(!no) return null;
    const r = await fetch("https://api.m.sooplive.com/station/video/a/view", {
      method: "POST", headers: Object.assign({ "content-type": "application/x-www-form-urlencoded", "origin": "https://vod.sooplive.com", "referer": "https://vod.sooplive.com/" }, UA),
      body: "nTitleNo=" + no + "&nApiLevel=10&nPlaylistIdx=0"
    });
    const d = r.ok ? (await r.json()).data : null;
    if(!d || !(d.full_title || d.title)) return null;
    return { title: clip(decode(String(d.full_title || d.title).replace(/^\[(클립|캐치|다시보기)\]\s*/, "")), 120), description: d.writer_nick ? clip(decode(d.writer_nick), 60) : "", image: https(d.thumb), site: "SOOP" };
  }
  const st = h.match(/^(?:sooplive\.(?:com|co\.kr))$/) && (t.pathname.match(/^\/station\/([a-zA-Z0-9_]{2,30})/) || [])[1]
    || /^(ch|play|bj)\.sooplive\.(com|co\.kr)$/.test(t.hostname) && (t.pathname.match(/^\/([a-zA-Z0-9_]{2,30})/) || [])[1];
  if(st){
    const r = await fetch("https://chapi.sooplive.com/api/" + st + "/station", { headers: UA });
    const d = r.ok ? await r.json() : null;
    if(!d || !d.station) return null;
    const live = d.broad ? "방송 중 · " + decode(d.broad.broad_title || "") : decode((d.station.display || {}).profile_text || "");
    return { title: clip(decode(d.station.station_name || d.station.user_nick || st) + " 방송국", 120), description: clip(live, 160), image: https(d.profile_image), site: "SOOP" };
  }
  return null;
}

export async function onRequestGet({ request, waitUntil }){
  const q = new URL(request.url).searchParams.get("url") || "";
  let target;
  try{ target = new URL(q); }catch(e){ return json({ ok: false, reason: "주소가 올바르지 않아요" }); }
  if(!/^https?:$/.test(target.protocol) || !okHost(target.hostname) || target.username || target.password) return json({ ok: false, reason: "읽을 수 없는 주소예요" });
  if(target.port && !["80", "443"].includes(target.port)) return json({ ok: false, reason: "읽을 수 없는 주소예요" });

  const cache = caches.default, key = new Request("https://og-cache.marune/" + encodeURIComponent(target.toString()));
  const hit = await cache.match(key);
  if(hit) return hit;

  let out;
  try{ const s = await special(target); if(s) out = Object.assign({ ok: true, url: target.toString() }, s); }catch(e){}
  if(!out) try{
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(target.toString(), {
      signal: ctl.signal, redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; MaruneLinkPreview/1.0; +https://marune-6vb.pages.dev)", "accept": "text/html,application/xhtml+xml", "accept-language": "ko,en;q=0.8" }
    });
    const final = new URL(r.url || target.toString());
    if(!r.ok || !okHost(final.hostname)){ clearTimeout(timer); out = { ok: false, reason: "페이지를 열지 못했어요" }; }
    else if(!/text\/html|application\/xhtml/i.test(r.headers.get("content-type") || "")){ clearTimeout(timer); out = { ok: false, reason: "웹 페이지가 아니에요" }; }
    else{
      const reader = r.body.getReader(), chunks = []; let size = 0;
      while(size < MAX){ const { done, value } = await reader.read(); if(done) break; chunks.push(value); size += value.length; if(new TextDecoder().decode(value).includes("</head>")) break; }
      try{ reader.cancel(); }catch(e){}
      clearTimeout(timer);
      const buf = new Uint8Array(Math.min(size, MAX)); let off = 0;
      for(const c of chunks){ if(off >= buf.length) break; buf.set(c.subarray(0, buf.length - off), off); off += c.length; }
      const cs = ((r.headers.get("content-type") || "").match(/charset=([\w-]+)/i) || [])[1] || "utf-8";
      let html; try{ html = new TextDecoder(cs).decode(buf); }catch(e){ html = new TextDecoder().decode(buf); }
      out = Object.assign({ ok: true, url: final.toString() }, parse(html, final.toString()));
    }
  }catch(e){ out = { ok: false, reason: "페이지를 열지 못했어요" }; }

  const res = json(out, out.ok ? 86400 : 600);
  waitUntil(cache.put(key, res.clone()));
  return res;
}
