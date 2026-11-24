/* 게시판 영상 보기: /v/<회원id>/<파일>  (R2 → 브라우저, 구간 재생 지원)
   브라우저가 1년 동안 저장해 두어 같은 영상을 다시 볼 때는 R2 를 읽지 않아요. */
export async function onRequestGet({ request, env, params }){
  const B = env.VIDEOS; if(!B) return new Response("영상 저장소가 연결되지 않았어요", { status: 503 });
  const key = (params.path || []).join("/");
  if(!/^[0-9a-f-]{36}\/\d{8}-[0-9a-f]{8}\.(mp4|webm|mov)$/.test(key)) return new Response("없는 영상이에요", { status: 404 });
  const range = request.headers.get("range");
  const obj = await B.get(key, range ? { range: request.headers } : {});
  if(!obj) return new Response("없는 영상이에요", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("cache-control", "public, max-age=31536000, immutable");
  h.set("x-content-type-options", "nosniff");
  if(range && obj.range){
    const off = obj.range.offset || 0, len = obj.range.length != null ? obj.range.length : obj.size - off;
    h.set("content-range", "bytes " + off + "-" + (off + len - 1) + "/" + obj.size);
    h.set("content-length", String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(obj.body, { headers: h });
}
