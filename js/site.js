/* 모든 페이지가 함께 쓰는 코드: 헤더·푸터, 아이콘, 저장, 작은 도구들 */
(function(){
  const ROOT = new URL("../", document.currentScript.src).href;
  const S = window.SITE || {};
  const page = document.body.dataset.page || "";

  /* ── 도구 ── */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const url = p => ROOT + p;
  const ver = (window.SITE && window.SITE.assetVersion) ? "?v=" + window.SITE.assetVersion : "";
  const pcSrc = n => url("assets/p" + String(n).padStart(2, "0") + ".png") + ver;
  const pc = (n, cls) => '<img class="pc ' + (cls || "") + '" src="' + pcSrc(n) + '" alt="">';
  const ico = name => '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const asset = p => /^(https?:)?\/\//.test(p) ? p : url(p) + ver;
  const store = {
    get(k, d){ try{ const v = localStorage.getItem("cherry:" + k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem("cherry:" + k, JSON.stringify(v)); }catch(e){} }
  };
  let toastTimer;
  function toast(msg){
    let t = document.getElementById("toast");
    if(!t){ t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const sampleChip = flag => flag ? '<span class="chip">예시</span>' : "";

  /* ── 아이콘 ── */
  const sprite = document.createElement("div");
  sprite.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
    + '<symbol id="i-arrow" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></symbol>'
    + '<symbol id="i-cal" viewBox="0 0 16 16"><rect x="2.5" y="3.5" width="11" height="10" rx="2"/><path d="M2.500 6.500h11M5.500 2v3M10.500 2v3"/></symbol>'
    + '<symbol id="i-gift" viewBox="0 0 16 16"><rect x="2.5" y="6.5" width="11" height="7" rx="1.5"/><path d="M2 6.500h12M8 6.500v7M8 6.500C6 6.500 4.800 5.400 5.200 4.200 5.700 2.800 8 3.600 8 6.500zM8 6.500c2 0 3.200-1.100 2.800-2.300C10.300 2.800 8 3.600 8 6.500z"/></symbol>'
    + '<symbol id="i-flag" viewBox="0 0 16 16"><path d="M4 14V2.500M4 3h7.500l-1.800 2.700L11.500 8.500H4"/></symbol>'
    + '<symbol id="i-game" viewBox="0 0 16 16"><rect x="1.5" y="4.5" width="13" height="7.5" rx="3.5"/><path d="M5 7v2.500M3.800 8.200h2.400M10.300 7.600h.1M12 9h.1"/></symbol>'
    + '<symbol id="i-play" viewBox="0 0 16 16"><path d="M5 3.200v9.600L13 8z"/></symbol>'
    + '<symbol id="i-star" viewBox="0 0 16 16"><path d="M8 2.200l1.800 3.700 4 .6-2.900 2.800.7 4L8 11.400l-3.600 1.900.7-4L2.200 6.500l4-.6z"/></symbol>'
    + '<symbol id="i-image" viewBox="0 0 16 16"><rect x="2.5" y="3" width="11" height="10" rx="2"/><path d="M2.500 10.500l3-3 2.500 2.500 1.500-1.500 4 4"/><circle cx="10.500" cy="6" r="1"/></symbol>'
    + '<symbol id="i-chat" viewBox="0 0 16 16"><path d="M2.500 4.500a2 2 0 012-2h7a2 2 0 012 2v4.500a2 2 0 01-2 2H7l-3 2.500v-2.500a2 2 0 01-1.500-2z"/></symbol>'
    + '<symbol id="i-mega" viewBox="0 0 16 16"><path d="M2.500 6.500v3h2l5 3v-9l-5 3zM12 6.200a2.500 2.500 0 010 3.600M5 9.500l.800 3.500"/></symbol>'
    + '<symbol id="i-reset" viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.500-3.600M3 2.500v2.500h2.500"/></symbol>'
    + '<symbol id="i-turn" viewBox="0 0 16 16"><path d="M5 3L2 6l3 3M2 6h8a4 4 0 0 1 0 8H8"/></symbol>'
    + '<symbol id="i-up" viewBox="0 0 16 16"><path d="M8 13V3M4 7l4-4 4 4"/></symbol>'
    + '<symbol id="i-ext" viewBox="0 0 16 16"><path d="M9 3h4v4M13 3L7.500 8.500M11 9.500V12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h2.500"/></symbol>'
    + '</svg>';
  document.body.prepend(sprite.firstChild);

  const logo = S.logo ? '<img class="logo" src="' + esc(asset(S.logo)) + '" alt="">' : pc(S.mascot || 6);

  /* ── 헤더 ── */
  const NAV = [
    { id: "board",   label: "게시판",   href: "board.html" },
    { id: "sig",     label: "시그",     href: "sig.html" },
    { id: "archive", label: "자료실",   href: "archive.html" },
    { id: "promise", label: "공약현황", href: "promise.html" },
    { id: "play",    label: "놀이터",   href: "play.html" },
    { id: "tools",   label: "방송 도구", href: "tools.html" }
  ];
  if(S.songbookUrl) NAV.splice(2, 0, { id: "songbook", label: "노래책", href: S.songbookUrl, ext: true });
  const link = (n, extra) => '<a href="' + (n.ext ? esc(n.href) + '" target="_blank" rel="noopener' : url(n.href)) + '"' + (n.id === page ? ' aria-current="page"' : "") + (extra || "") + '>' + n.label + '</a>';
  const half = Math.ceil(NAV.length / 2);
  const header = document.createElement("header");
  header.className = "site";
  header.innerHTML = '<div class="wrap head-row">'
    + '<nav class="main left" aria-label="주 메뉴">' + NAV.slice(0, half).map(n => link(n)).join("")
    + NAV.slice(half).map(n => link(n, ' class="only-narrow"')).join("") + '</nav>'
    + '<a class="wordmark" href="' + url("index.html") + '" aria-label="' + esc(S.siteName) + ' 처음으로">' + logo + '<span>' + esc(S.wordmark) + '</span></a>'
    + '<div class="head-right"><nav class="main" aria-label="주 메뉴 계속">' + NAV.slice(half).map(n => link(n)).join("") + '</nav>'
    + (S.channelUrl ? '<a class="btn" href="' + esc(S.channelUrl) + '" target="_blank" rel="noopener">방송국 가기</a>' : '<span></span>')
    + '</div></div>';
  const slotH = document.getElementById("site-header");
  if(slotH) slotH.replaceWith(header);

  /* ── 푸터 ── */
  const footer = document.createElement("footer");
  footer.className = "site";
  const ext = [
    S.channelUrl && '<a href="' + esc(S.channelUrl) + '" target="_blank" rel="noopener">SOOP 방송국</a>',
    S.youtubeUrl && '<a href="' + esc(S.youtubeUrl) + '" target="_blank" rel="noopener">YouTube</a>',
    S.instagramUrl && '<a href="' + esc(S.instagramUrl) + '" target="_blank" rel="noopener">Instagram</a>',
    S.songbookUrl && '<a href="' + esc(S.songbookUrl) + '" target="_blank" rel="noopener">노래책</a>'
  ].filter(Boolean).join("");
  footer.innerHTML = '<div class="wrap"><div>'
    + '<div class="wordmark">' + logo + '<span>' + esc(S.wordmark) + '</span></div>'
    + '<p>© ' + new Date().getFullYear() + ' ' + esc(S.siteName) + ' · Made for ' + esc(S.streamer) + '</p></div>'
    + '<div class="foot-links">' + ext
    + '<a href="' + url("privacy.html") + '">개인정보처리방침</a><a href="' + url("terms.html") + '">이용약관</a></div></div>';
  const slotF = document.getElementById("site-footer");
  if(slotF) slotF.replaceWith(footer);

  /* 설정값을 글자로 넣는 자리 */
  document.querySelectorAll("[data-cfg]").forEach(el => { el.textContent = S[el.dataset.cfg] || ""; });

  /* ── SOOP 캐치·클립 (서버 함수 /api/vods) ── */
  const dur = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  function vodCard(v){
    const catchType = v.type === "catch";
    const img = catchType ? (v.vthumb || v.thumb) : v.thumb;
    return '<a class="card vod' + (catchType ? " catch" : "") + '" href="' + esc(v.url) + '" target="_blank" rel="noopener">'
      + '<div class="thumb" style="background-image:url(&quot;' + esc(img) + '&quot;)"><span class="kind">' + (catchType ? "캐치" : "클립") + '</span>'
      + '<span class="len num">' + dur(v.duration || 0) + '</span></div>'
      + '<div class="c-text"><span class="t2">' + esc(v.title) + '</span><small>' + esc(v.author) + ' · 조회 ' + Number(v.views || 0).toLocaleString() + '</small></div></a>';
  }
  function fetchVods(type, page, size){
    if(!location.protocol.startsWith("http")) return Promise.resolve(null);
    return fetch(url("api/vods?type=" + type + "&page=" + page + "&size=" + size), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(d => d && d.ok ? d : null).catch(() => null);
  }

  window.CM = { ROOT, S, esc, url, pc, pcSrc, ico, asset, store, toast, sampleChip, vodCard, fetchVods };
})();
