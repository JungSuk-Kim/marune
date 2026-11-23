/* 짝 맞추기: 12개 퍼스나콘 중 8개를 골라 16장 */
(function(){
  const { pc, pcSrc } = window.CM, K = window.GameKit;
  const $ = id => document.getElementById(id);
  const stage = $("stage");
  let cards, open, lock, moves, found, started = false;

  function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function deal(){
    const kinds = shuffle([1,2,3,4,5,6,7,8,9,10,11,12]).slice(0, 8);
    cards = shuffle(kinds.concat(kinds)).map(k => ({ k, open: false, done: false }));
    open = []; lock = false; moves = 0; found = 0;
    $("moves").textContent = 0; $("found").textContent = "0/8";
    $("best").textContent = K.bestText("match");
    $("memo").innerHTML = cards.map((c, i) =>
      '<button type="button" class="mcard" data-i="' + i + '" aria-label="카드 ' + (i + 1) + '"><span class="inner"><span class="face back"></span><span class="face front">' + pc(c.k) + '</span></span></button>').join("");
  }
  function el(i){ return $("memo").children[i]; }
  function flip(i){
    const c = cards[i];
    if(!started || lock || c.open || c.done) return;
    c.open = true; el(i).classList.add("open"); open.push(i);
    if(open.length < 2) return;
    moves++; $("moves").textContent = moves;
    const [a, b] = open; open = [];
    if(cards[a].k === cards[b].k){
      [a, b].forEach(x => { cards[x].done = true; el(x).classList.add("done"); el(x).classList.remove("open"); });
      found++; $("found").textContent = found + "/8";
      setTimeout(() => [a, b].forEach(x => { const p = K.at(stage, el(x)); K.burst(stage, p.x, p.y, ["#9fd9b8", "#ffd166", "#f7a8c4"], 8); }), 320);
      const p = K.at(stage, el(b)); setTimeout(() => K.pop(stage, p.x, p.y - 30, "짝!", "combo"), 320);
      if(found === 8) setTimeout(finish, 700);
    } else {
      lock = true;
      setTimeout(() => { [a, b].forEach(x => el(x).classList.add("wrong")); }, 350);
      setTimeout(() => { [a, b].forEach(x => { cards[x].open = false; el(x).classList.remove("open", "wrong"); }); lock = false; }, 900);
    }
  }
  function finish(){
    const isBest = K.submit("match", moves);
    $("best").textContent = K.bestText("match");
    const stars = moves <= 12 ? 3 : moves <= 18 ? 2 : 1;
    K.result({
      icon: pcSrc(12), title: moves + "번 만에 완성",
      text: stars === 3 ? "기억력이 대단해요!" : stars === 2 ? "8쌍을 모두 찾았어요." : "다 찾았어요. 다음엔 더 적게 뒤집어 봐요.",
      stars, best: isBest
    });
  }
  function begin(){ started = true; $("overlay").hidden = true; deal(); }
  $("memo").addEventListener("click", e => { const b = e.target.closest(".mcard"); if(b) flip(Number(b.dataset.i)); });
  $("resetBtn").addEventListener("click", begin);
  $("startBtn").addEventListener("click", begin);
  window.__match = { peek: () => cards.map(c => c.k) };
  deal();
})();
