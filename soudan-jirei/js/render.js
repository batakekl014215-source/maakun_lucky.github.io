/* data/cases.js（window.CASES）から、ページを描画する。
   - 相談文・返信文は consultBubbles / replyBubbles を 1メッセージ=1吹き出しで並べる
   - 長い会話は「続きを読む」で開閉
   - 右端のインジケーターは、スクロール位置に合わせて現在のジャンルを強調 */
(function () {
  "use strict";
  var data = window.CASES;
  if (!data) return;

  var COLLAPSE_MAX = 360;   // css の .is-collapsed の max-height と同じ値（px）

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function timeOf(base, plus) {
    var t = base + plus;
    return pad(Math.floor(t / 60) % 24) + ":" + pad(t % 60);
  }

  // ---- ヘッダー系 ----
  document.getElementById("intro-text").textContent = data.meta.intro;
  document.getElementById("footer-message").textContent = data.meta.footerMessage;
  if (data.meta.title) document.title = data.meta.title;

  // ---- ジャンル・カード ----
  var host = document.getElementById("genres");
  var caseIndex = 0;
  var cards = [];

  data.genres.forEach(function (g) {
    var sec = el("section", "genre");
    sec.id = g.anchorId;
    sec.setAttribute("aria-labelledby", g.anchorId + "-title");

    var band = el("div", "band");
    var h2 = el("h2", "band__title", g.relationHeading);
    h2.id = g.anchorId + "-title";
    band.appendChild(h2);
    sec.appendChild(band);

    g.cases.forEach(function (c) {
      sec.appendChild(buildCard(c, caseIndex++));
    });
    host.appendChild(sec);
  });

  function buildCard(c, idx) {
    var card = el("article", "card");
    card.setAttribute("aria-label", c.situation || c.typeName);
    card.appendChild(el("h3", "card__head", c.headcopy.primary));

    var chat = el("div", "chat");
    var date = el("div", "chat__date");
    date.appendChild(el("span", null, "今日"));
    chat.appendChild(date);

    var body = el("div", "chat__body");
    var base = 19 * 60 + 12 + idx * 17;           // 表示用の時刻（19:12 から17分刻み）
    var consult = [(c.consultBubbles || [c.consult]).join("\n\n")];   // 相談文は1つの吹き出しにまとめる
    var reply = c.replyBubbles || [c.reply];

    // 相談（右・緑）。最後の吹き出しの左下に「既読」と時刻
    consult.forEach(function (t, i) {
      var row = el("div", "row row--me");
      if (i === consult.length - 1) {
        var m = el("div", "meta");
        m.setAttribute("aria-hidden", "true");
        m.appendChild(el("div", null, "既読"));
        m.appendChild(el("div", null, timeOf(base, 0)));
        row.appendChild(m);
      }
      var b = el("div", "bubble bubble--me" + (i === 0 ? " has-tail" : ""), t);
      row.appendChild(b);
      body.appendChild(row);
    });

    // 返信（左・白）。最初だけアイコンとしっぽ、最後の右下に時刻
    reply.forEach(function (t, i) {
      var row = el("div", "row row--them" + (i === 0 ? " is-gap" : ""));
      if (i === 0) {
        var av = el("div", "avatar", "ま");
        av.setAttribute("aria-hidden", "true");
        row.appendChild(av);
      } else {
        row.appendChild(el("div", "avatar-gap"));
      }
      row.appendChild(el("div", "bubble bubble--them" + (i === 0 ? " has-tail" : ""), t));
      if (i === reply.length - 1) {
        var m2 = el("div", "meta", timeOf(base, 6));
        m2.setAttribute("aria-hidden", "true");
        row.appendChild(m2);
      }
      body.appendChild(row);
    });

    chat.appendChild(body);
    card.appendChild(chat);

    var btn = el("button", "more", "続きを読む");
    btn.type = "button";
    btn.setAttribute("aria-expanded", "false");
    btn.hidden = true;
    btn.addEventListener("click", function () {
      var open = body.classList.toggle("is-collapsed") === false;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "閉じる" : "続きを読む";
      if (!open) {
        var top = card.getBoundingClientRect().top;
        if (top < 0) window.scrollBy({ top: top - 12, behavior: "auto" });
      }
    });
    card.appendChild(btn);
    card._body = body; card._btn = btn;
    cards.push(card);
    return card;
  }

  // 折りたたみが必要な会話にだけ、ボタンを出す
  function setupCollapse() {
    cards.forEach(function (card) {
      var body = card._body, btn = card._btn;
      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) { btn.hidden = false; return; }
      body.classList.remove("is-collapsed");
      var needs = body.scrollHeight > COLLAPSE_MAX + 40;
      if (needs) { body.classList.add("is-collapsed"); btn.hidden = false; }
      else { btn.hidden = true; }
    });
  }
  setupCollapse();
  window.addEventListener("load", setupCollapse);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setupCollapse);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(setupCollapse, 150); });

  // ---- 右端のインジケーター ----
  var nav = document.getElementById("indicator");
  var tabs = data.genres.map(function (g) {
    var a = el("a");
    a.href = "#" + g.anchorId;
    a.setAttribute("aria-label", g.relationHeading);
    a.dataset.id = g.anchorId;
    a.dataset.label = g.indicatorLabel || "";
    nav.appendChild(a);
    return a;
  });
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    e.preventDefault();
    var t = document.getElementById(a.dataset.id);
    if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  });
  var currentId = null, labelTimer;
  function setCurrent(id) {
    if (id === currentId) return;
    var firstTime = currentId === null;
    currentId = id;
    tabs.forEach(function (a) {
      if (a.dataset.id === id) {
        a.setAttribute("aria-current", "true");
        if (!firstTime || nav.classList.contains("is-visible")) {
          a.classList.add("show-label");
          clearTimeout(labelTimer);
          labelTimer = setTimeout(function () { a.classList.remove("show-label"); }, 1500);
        }
      } else {
        a.removeAttribute("aria-current");
        a.classList.remove("show-label");
      }
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setCurrent(en.target.id); });
    }, { rootMargin: "-40% 0px -50% 0px" });
    document.querySelectorAll(".genre").forEach(function (s) { io.observe(s); });
  }
  var first = document.querySelector(".genre");
  var ticking = false;
  function updateVisible() {
    ticking = false;
    var show = first && first.getBoundingClientRect().top < window.innerHeight * 0.6;
    nav.classList.toggle("is-visible", !!show);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateVisible); }
  }, { passive: true });
  updateVisible();
})();
