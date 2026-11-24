/* 게시판 영상 올리기·지우기 (Cloudflare R2, 바인딩 이름 VIDEOS)
   - 올리기: POST /api/video  (본문 = 영상 파일, Authorization: Bearer <Supabase 로그인 토큰>)
   - 지우기: DELETE /api/video?key=<회원id>/<파일>  (올린 사람 또는 운영자)
   무료 사용량을 넘지 않게:
   - 한 개 50MB, 회원 1명당 하루 5개
   - 저장 공간 전체 9GB 에서 멈춤 (R2 무료 10GB)
   - 한 달 업로드 1,000개에서 멈춤 (쓰기 작업 무료 100만 회 대비 아주 여유 있게) */
const SUPABASE_URL = "https://biguxhozbstwgjhayuvz.supabase.co";
const SUPABASE_KEY = "sb_publishable_HjJu4VSEbbfmmwKDRlNBbw_SuqVRTgf"; /* 공개용 키 */
const MAX_SIZE = 50 * 1024 * 1024;
const MAX_TOTAL = 9 * 1024 * 1024 * 1024;
const PER_USER_DAY = 5;
const PER_MONTH = 1000;
const TYPES = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (msg, status) => json({ ok: false, reason: msg }, status || 400);

async function whoami(request, env){
  const auth = request.headers.get("authorization") || "";
  if(!/^Bearer\s+\S+$/.test(auth)) return null;
  const url = env.SUPABASE_URL || SUPABASE_URL, key = env.SUPABASE_KEY || SUPABASE_KEY;
  const r = await fetch(url + "/auth/v1/user", { headers: { apikey: key, authorization: auth } });
  if(!r.ok) return null;
  const u = await r.json();
  if(!u || !u.id) return null;
  let role = "member";
  try{
    const p = await fetch(url + "/rest/v1/profiles?select=role&id=eq." + u.id, { headers: { apikey: key, authorization: auth } });
    const rows = p.ok ? await p.json() : [];
    if(rows[0] && rows[0].role) role = rows[0].role;
  }catch(e){}
  return { id: u.id, role };
}

function sniff(buf){
  const b = new Uint8Array(buf, 0, Math.min(16, buf.byteLength));
  const s = String.fromCharCode(...b.slice(4, 8));
  if(s === "ftyp") return true;                                     /* mp4 / mov */
  return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3; /* webm */
}

async function listAll(bucket, prefix){
  const out = []; let cursor;
  do{ const r = await bucket.list({ prefix, cursor, limit: 1000 }); out.push(...r.objects); cursor = r.truncated ? r.cursor : null; }while(cursor);
  return out;
}

export async function onRequestPost({ request, env }){
  const B = env.VIDEOS; if(!B) return fail("영상 저장소가 연결되지 않았어요", 503);
  const me = await whoami(request, env); if(!me) return fail("로그인한 뒤 영상을 올릴 수 있어요", 401);
  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if(!TYPES[type]) return fail("mp4, webm, mov 영상만 올릴 수 있어요", 415);
  const len = Number(request.headers.get("content-length") || 0);
  if(len > MAX_SIZE) return fail("영상은 50MB까지 올릴 수 있어요", 413);

  const now = new Date(), day = now.toISOString().slice(0, 10).replace(/-/g, ""), month = day.slice(0, 6);
  /* 한 달 업로드 수 */
  const metaKey = "_meta/" + month + ".json";
  const metaObj = await B.get(metaKey);
  const meta = metaObj ? await metaObj.json() : { uploads: 0 };
  if(meta.uploads >= PER_MONTH) return fail("이번 달 영상 올리기 한도에 닿았어요. 다음 달에 다시 올려 주세요", 429);
  /* 회원별 하루 개수 */
  const mine = await listAll(B, me.id + "/" + day + "-");
  if(mine.length >= PER_USER_DAY) return fail("영상은 하루 " + PER_USER_DAY + "개까지 올릴 수 있어요", 429);
  /* 전체 저장 공간 */
  const all = (await listAll(B, "")).filter(o => !o.key.startsWith("_meta/"));
  const used = all.reduce((a, o) => a + o.size, 0);

  const buf = await request.arrayBuffer();
  if(buf.byteLength > MAX_SIZE) return fail("영상은 50MB까지 올릴 수 있어요", 413);
  if(buf.byteLength < 1000 || !sniff(buf)) return fail("영상 파일이 아니에요", 415);
  if(used + buf.byteLength > MAX_TOTAL) return fail("영상 저장 공간이 다 찼어요. 운영자에게 알려 주세요", 507);

  const key = me.id + "/" + day + "-" + crypto.randomUUID().slice(0, 8) + "." + TYPES[type];
  await B.put(key, buf, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  meta.uploads++;
  await B.put(metaKey, JSON.stringify(meta), { httpMetadata: { contentType: "application/json" } });
  return json({ ok: true, key, src: "/v/" + key, size: buf.byteLength, usedMB: Math.round((used + buf.byteLength) / 1048576) });
}

export async function onRequestDelete({ request, env }){
  const B = env.VIDEOS; if(!B) return fail("영상 저장소가 연결되지 않았어요", 503);
  const me = await whoami(request, env); if(!me) return fail("로그인이 필요해요", 401);
  const key = new URL(request.url).searchParams.get("key") || "";
  if(!/^[0-9a-f-]{36}\/\d{8}-[0-9a-f]{8}\.(mp4|webm|mov)$/.test(key)) return fail("잘못된 영상이에요");
  if(!key.startsWith(me.id + "/") && me.role !== "admin") return fail("지울 권한이 없어요", 403);
  await B.delete(key);
  return json({ ok: true });
}

/* 운영자용 사용량: GET /api/video?usage=1 */
export async function onRequestGet({ request, env }){
  const B = env.VIDEOS; if(!B) return fail("영상 저장소가 연결되지 않았어요", 503);
  const me = await whoami(request, env); if(!me || me.role !== "admin") return fail("운영자만 볼 수 있어요", 403);
  const month = new Date().toISOString().slice(0, 7).replace("-", "");
  const metaObj = await B.get("_meta/" + month + ".json");
  const meta = metaObj ? await metaObj.json() : { uploads: 0 };
  const all = (await listAll(B, "")).filter(o => !o.key.startsWith("_meta/"));
  const used = all.reduce((a, o) => a + o.size, 0);
  const files = all.sort((a, b) => b.uploaded - a.uploaded).slice(0, 100)
    .map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded }));
  return json({ ok: true, used, count: all.length, maxTotal: MAX_TOTAL, monthUploads: meta.uploads, perMonth: PER_MONTH, perUserDay: PER_USER_DAY, maxSize: MAX_SIZE, files });
}
