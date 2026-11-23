/* 짝 맞추기: 12개 퍼스나콘 중 8개를 골라 16장 */
(function(){
  const { pc, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  let cards, open, lock, moves, found;

  function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function reset(){
    const kinds = shuffle([1,2,3,4,5,6,7,8,9,10,11,12]).slice(0, 8);
    cards = shuffle(kinds.concat(kinds)).map(k => ({ k, open: false, done: false }));
    open = []; lock = false; moves = 0; found = 0;
    $("overlay").hidden = true; $("moves").textContent = 0;
    $("best").textContent = K.bestText("match");
    $("memo").innerHTML = cards.map((c, i) =>
      '<button type="button" class="mcard" data-i="' + i + '" aria-label="카드 ' + (i + 1) + '">' + pc(c.k) + '</button>').join("");
  }
  function el(i){ return $("memo").children[i]; }
  function flip(i){
    const c = cards[i];
    if(lock || c.open || c.done) return;
    c.open = true; el(i).classList.add("open"); open.push(i);
    if(open.length < 2) return;
    moves++; $("moves").textContent = moves;
    const [a, b] = open; open = [];
    if(cards[a].k === cards[b].k){
      [a, b].forEach(x => { cards[x].done = true; el(x).classList.add("done"); el(x).classList.remove("open"); });
      found++;
      if(found === 8) finish();
    } else {
      lock = true;
      setTimeout(() => { [a, b].forEach(x => { cards[x].open = false; el(x).classList.remove("open"); }); lock = false; }, 700);
    }
  }
  function finish(){
    const isBest = K.submit("match", moves);
    $("best").textContent = K.bestText("match");
    $("ovIcon").src = pcSrc(12);
    $("ovTitle").textContent = moves + "번 만에 완성" + (isBest ? " · 최고 기록" : "");
    $("ovText").textContent = "8쌍을 모두 찾았어요.";
    setTimeout(() => { $("overlay").hidden = false; }, 400);
  }
  $("memo").addEventListener("click", e => { const b = e.target.closest(".mcard"); if(b) flip(Number(b.dataset.i)); });
  $("resetBtn").addEventListener("click", reset);
  $("againBtn").addEventListener("click", reset);
  window.__match = { peek: () => cards.map(c => c.k) };
  reset();
})();
