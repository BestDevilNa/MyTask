/* ============================================================
 * 高项电竞社 · 游戏模块 —— 术语配对（match）
 * 规则（M2）：
 *   选章节 → 抽 8 对「术语↔定义」布 4×4 翻牌
 *   翻开两张：配对成功消除 | 配对失败翻回，计一步
 *   全部配对即通关；配对/失配计入该章掌握度（不入错题本）
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.match = {
  PAIRS: 8,       /* 每局配对数（4×4 = 16 张牌） */

  /* ---------- 入口：章节选择 ---------- */
  picker: function () {
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("术语配对", "Term Match", "03")
      + '<div class="watermark">Match</div>'
      + '<p class="muted" style="margin-bottom:16px">翻牌找出 8 对「术语 ↔ 定义」。配错会翻回重来，考验你的记忆网格。</p>'
      + '<div class="stack">';

    GX_META.chapters.forEach(function (c) {
      if (!c.enabled) return;
      var n = GX_TERMS.chapters[c.id] ? GX_TERMS.chapters[c.id].pairs.length : 0;
      if (!n) return;
      html += '<div class="panel"><div class="row">'
        + '<div><div style="font-size:15.5px;font-weight:700">CH.' + c.id + ' ' + c.name + '</div>'
        + '<div class="tagline" style="margin-top:4px">' + n + ' 对术语 · 每局抽 ' + this.PAIRS + ' 对</div></div>'
        + '<button class="btn primary" onclick="GX.games.match.run(' + c.id + ')">开始</button>'
        + '</div></div>';
    }, this);

    html += '</div></div></div>';
    this.abort();
    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 开始一局 ---------- */
  run: function (ch) {
    var pairs = GX_TERMS.byChapter(ch, this.PAIRS);
    var cards = [];
    pairs.forEach(function (p, pid) {
      cards.push({ txt: p[0], pid: pid });
      cards.push({ txt: p[1], pid: pid });
    });
    GX.util.shuffle(cards);

    this.state = {
      ch: ch, cards: cards, pairs: pairs.length,
      opened: [], matched: 0, moves: 0,
      lock: false, t: 0, timerId: null, over: false
    };
    this.board();

    var self = this;
    this.state.timerId = setInterval(function () {
      var s = self.state;
      if (!s || s.over) return;
      s.t++;
      var el = document.getElementById("matchTime");
      if (el) el.textContent = s.t + "s";
    }, 1000);
  },

  /* ---------- 牌桌 ---------- */
  board: function () {
    var s = this.state;
    var chName = GX_META.chapters[s.ch - 1] ? GX_META.chapters[s.ch - 1].name : "";

    var grid = s.cards.map(function (c, i) {
      return '<button class="flip" data-i="' + i + '" onclick="GX.games.match.flip(' + i + ')">'
        + '<span class="flip-inner">'
        + '<span class="face front">GX</span>'
        + '<span class="face back">' + GX.util.esc(c.txt) + '</span>'
        + '</span></button>';
    }).join("");

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("术语配对", "Term Match", String(s.matched + 1).padStart(2, "0"))
      + '<div class="watermark">Match</div>'

      + '<div class="row" style="margin-bottom:12px">'
      + '<span class="block-tag">CH.' + s.ch + ' ' + chName + '</span>'
      + '<span class="tagline">已配对 ' + s.matched + ' / ' + s.pairs + ' · 步数 <b id="matchMoves" style="color:var(--zzz-ink)">' + s.moves + '</b> · 用时 <span id="matchTime" style="color:var(--zzz-ink)">' + s.t + 's</span></span>'
      + '</div>'

      + '<div class="flip-grid">' + grid + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
  },

  /* ---------- 翻牌 ---------- */
  flip: function (i) {
    var s = this.state;
    if (!s || s.over || s.lock) return;
    var el = document.querySelector('.flip[data-i="' + i + '"]');
    if (!el || el.classList.contains("matched") || el.classList.contains("open")) return;

    el.classList.add("open");
    s.opened.push(i);
    if (s.opened.length < 2) return;

    /* 第二张：判定 */
    s.moves++;
    var mv = document.getElementById("matchMoves");
    if (mv) mv.textContent = s.moves;

    var a = s.cards[s.opened[0]], b = s.cards[s.opened[1]];
    var self = this;

    if (a.pid === b.pid) {
      /* 配对成功：消除 */
      GX.stats.recordRaw(s.ch, true);
      s.opened.forEach(function (k) {
        var e = document.querySelector('.flip[data-i="' + k + '"]');
        if (e) { e.classList.remove("open"); e.classList.add("matched"); }
      });
      s.matched++;
      s.opened = [];
      if (s.matched >= s.pairs) setTimeout(function () { self.result(); }, 450);
    } else {
      /* 配对失败：翻回 */
      GX.stats.recordRaw(s.ch, false);
      s.lock = true;
      setTimeout(function () {
        s.opened.forEach(function (k) {
          var e = document.querySelector('.flip[data-i="' + k + '"]');
          if (e) e.classList.remove("open");
        });
        s.opened = [];
        s.lock = false;
      }, 700);
    }
  },

  /* ---------- 中断（导航离开时） ---------- */
  abort: function () {
    if (this.state && this.state.timerId) clearInterval(this.state.timerId);
    this.state = null;
  },

  exit: function () {
    this.abort();
    GX.ui.go("#today");
  },

  /* ---------- 结算 ---------- */
  result: function () {
    var s = this.state;
    if (!s || s.over) return;
    s.over = true;
    clearInterval(s.timerId);

    var acc = Math.min(100, Math.round(s.pairs / Math.max(1, s.moves) * 100));
    var grade = s.moves <= 10 ? "S" : s.moves <= 13 ? "A" : s.moves <= 18 ? "B" : "F";
    var msg = {
      S: "记忆网格全通，术语刻进脑子里了",
      A: "几乎全记住了，个别对子再看看",
      B: "翻了不少次，回街区复习一遍",
      F: "牌桌迷雾重重……去考点歼灭里补课"
    }[grade];

    GX.daily.done("match");
    GX.store.save();
    GX.ui.syncTop();

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline" style="color:rgba(255,255,255,.55)">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "#FFFFFF") + '">' + val + '</div></div>';
    };

    var chName = GX_META.chapters[s.ch - 1] ? "CH." + s.ch + " " + GX_META.chapters[s.ch - 1].name : "CH." + s.ch;

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("配对结算", "Result", grade)
      + '<div class="watermark">Result</div>'

      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + stat("配对效率", acc + "%", true)
      + stat("配对数", s.pairs, true)
      + stat("总步数", s.moves, false)
      + stat("用时", s.t + "s", false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row"><span class="tagline">Match</span><span class="tag">' + chName + '</span></div>'
      + '</div>'

      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + '<button class="btn" onclick="GX.games.match.run(' + s.ch + ')">本章再来</button>'
      + '<button class="btn" onclick="GX.games.match.picker()">换章节</button>'
      + '<button class="btn primary" onclick="GX.games.match.exit()">回首页</button>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
    GX.ui.toast(grade === "S" ? "S 级通关！" : "结算完成");
  }
};
