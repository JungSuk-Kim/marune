/* 서식 있는 글: 붙여 넣은 글과 저장된 글을 안전하게 거르는 도구.
   1) DOMPurify 로 위험한 태그·속성(스크립트, 이벤트 등)을 지우고
   2) 남은 스타일 중 글꼴·크기·색·굵기·기울임·밑줄·정렬만 남깁니다. */
(function(){
  const MARK = "<!--rich-->";
  const PURIFY = "https://cdn.jsdelivr.net/npm/dompurify@3.5.0/dist/purify.min.js";
  let loading = null;
  const ready = () => window.DOMPurify ? Promise.resolve() : (loading = loading || new Promise((ok, no) => {
    const s = document.createElement("script"); s.src = PURIFY; s.onload = ok; s.onerror = () => no(new Error("서식 도구를 불러오지 못했어요"));
    document.head.appendChild(s);
  }));

  const FONTS = {
    gothic: "Pretendard, sans-serif",
    hand: "Gaegu, cursive",
    serif: "'Nanum Myeongjo', 'Noto Serif KR', serif"
  };
  function fontKey(v){
    v = String(v || "").toLowerCase();
    if(/gaegu|손글씨|cursive/.test(v)) return "hand";
    if(/myeongjo|명조|batang|바탕|serif/.test(v) && !/sans-serif/.test(v.replace(/'nanum myeongjo'.*/, ""))) return "serif";
    if(/pretendard|gothic|고딕|sans/.test(v)) return "gothic";
    return "";
  }
  const KW = { "xx-small": 11, "x-small": 12, "small": 13, "medium": 15, "large": 18, "x-large": 24, "xx-large": 30, "xxx-large": 36 };
  function size(v){
    v = String(v || "").trim().toLowerCase();
    let m;
    if((m = v.match(/^([\d.]+)px$/))) return Math.round(Math.min(48, Math.max(10, +m[1]))) + "px";
    if((m = v.match(/^([\d.]+)pt$/))) return Math.round(Math.min(48, Math.max(10, +m[1] * 4 / 3))) + "px";
    if(KW[v]) return KW[v] + "px";
    return null;
  }
  const color = v => /^(initial|inherit|unset|revert|currentcolor|transparent)$/i.test(String(v).trim()) ? null : /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)|[a-z]{3,20})$/i.test(String(v).trim()) ? String(v).trim() : null;

  function cleanStyle(el){
    const s = el.style, keep = [];
    const c = s.color && color(s.color); if(c) keep.push("color:" + c);
    const bg = s.backgroundColor && color(s.backgroundColor);
    if(bg && !/^(transparent|rgba\(0, 0, 0, 0\)|white|#fff|#ffffff|rgb\(255, 255, 255\))$/i.test(bg)) keep.push("background-color:" + bg);
    const fs = s.fontSize && size(s.fontSize); if(fs) keep.push("font-size:" + fs);
    const fw = s.fontWeight; if(fw && (/bold/.test(fw) || +fw >= 600)) keep.push("font-weight:700");
    if(s.fontStyle === "italic") keep.push("font-style:italic");
    const td = (s.textDecorationLine || s.textDecoration || "");
    const deco = ["underline", "line-through"].filter(x => td.includes(x)); if(deco.length) keep.push("text-decoration:" + deco.join(" "));
    if(/^(left|center|right|justify)$/.test(s.textAlign)) keep.push("text-align:" + s.textAlign);
    const fk = s.fontFamily && fontKey(s.fontFamily); if(fk) keep.push("font-family:" + FONTS[fk]);
    el.removeAttribute("style");
    if(keep.length) el.setAttribute("style", keep.join(";"));
  }

  const TAGS = ["p", "div", "br", "span", "b", "strong", "i", "em", "u", "s", "strike", "del", "font", "h1", "h2", "h3", "h4", "ul", "ol", "li",
    "blockquote", "a", "img", "hr", "table", "thead", "tbody", "tr", "td", "th", "sub", "sup", "mark", "pre", "code", "video"];
  const ATTR = ["href", "src", "alt", "style", "color", "face", "size", "align", "colspan", "rowspan", "controls", "preload", "playsinline"];

  /* html 문자열 → 걸러진 html 문자열 */
  function sanitize(html, opts){
    opts = opts || {};
    const frag = window.DOMPurify.sanitize(String(html || ""), { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ATTR, ALLOW_DATA_ATTR: false, RETURN_DOM_FRAGMENT: true });
    const box = document.createElement("div"); box.appendChild(frag);
    if(opts.paste){ /* 다른 곳의 HTML 줄바꿈 공백 정리 */
      const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); const ts = []; while(w.nextNode()) ts.push(w.currentNode);
      ts.forEach(t => { if(!t.parentNode.closest("pre")) t.data = t.data.replace(/\s*\n\s*/g, " "); });
    }
    box.querySelectorAll("*").forEach(el => {
      const tag = el.tagName.toLowerCase();
      if(el.hasAttribute("align")){ const a = el.getAttribute("align").toLowerCase(); if(/^(left|center|right|justify)$/.test(a)) el.style.textAlign = a; el.removeAttribute("align"); }
      if(tag === "font"){
        const span = document.createElement("span");
        if(el.getAttribute("color")) span.style.color = el.getAttribute("color");
        if(el.getAttribute("face")) span.style.fontFamily = el.getAttribute("face");
        if(el.style.cssText) span.style.cssText += ";" + el.style.cssText;
        while(el.firstChild) span.appendChild(el.firstChild);
        el.replaceWith(span); cleanStyle(span); return;
      }
      ["color", "face", "size"].forEach(a => el.removeAttribute(a));
      cleanStyle(el);
      if(tag === "a"){
        const h = el.getAttribute("href") || "";
        if(!/^(https?:|mailto:)/i.test(h)){ el.replaceWith(...el.childNodes); return; }
        el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener nofollow ugc");
      }
      if(tag === "video"){ /* 이 사이트에 올린 영상(/v/...)만 */
        const src = el.getAttribute("src") || "";
        if(!/^\/v\/[0-9a-f-]{36}\/\d{8}-[0-9a-f]{8}\.(mp4|webm|mov)$/.test(src)){ el.remove(); return; }
        [...el.attributes].forEach(a => { if(a.name !== "src") el.removeAttribute(a.name); });
        el.setAttribute("controls", ""); el.setAttribute("preload", "metadata"); el.setAttribute("playsinline", "");
        el.innerHTML = "";
        return;
      }
      if(tag === "img"){
        const src = el.getAttribute("src") || "";
        if(!/^https:\/\//i.test(src) && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(src)){ el.remove(); return; }
        el.setAttribute("loading", "lazy"); el.setAttribute("referrerpolicy", "no-referrer");
        if(!el.getAttribute("alt")) el.setAttribute("alt", "사진");
      }
    });
    /* 아무 스타일 없는 span 은 벗겨 냄 */
    box.querySelectorAll("span:not([style])").forEach(s => s.replaceWith(...s.childNodes));
    return box.innerHTML;
  }

  const isRich = body => String(body || "").startsWith(MARK);
  window.RichText = { MARK, ready, sanitize, isRich, FONTS, size };
})();
