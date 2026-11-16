/* ============================================================
 * 高项电竞社 · 游戏模块 —— 流程接龙（chain）
 * 规则（M2）：
 *   随机一条核心流程 → 步骤乱序入池
 *   按正确顺序点击步骤接入轨道 | 错序闪红并计错（不前进）
 *   全部接完即通关；零失误计入对应章节掌握度（不入错题本）
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.chain = {

  /* ---------- 开始一局（随机流程） ---------- */
  start: function () {
    this.play(GX_CHAIN.pick(), "normal");
  },

  /* ---------- 错题清扫：重接到期流程错项 ---------- */
  runReview: function () {
    var today = GX.util.today();
    var due = GX.store.data.wrong.filter(function (w) {
      return (w.type || "single") === "chain" && w.next <= today;
    });
    var flows = [];
    due.forEach(function (w) {
      var f = GX_CHAIN.flowById(w.qid);
      if (f) flows.push(f);
    });
    if (!flows.length) { GX.ui.toast("没有到期的流程错题", "o"); return; }
    this.play(flows[0], "review");
  },

  /* ---------- 通用开局 ---------- */
  play: function (flow, mode) {
    var pool = flow.steps.map(function (txt, i) { return { txt: txt, orig: i, done: false }; });
    GX.util.shuffle(pool);

    this.state = {
      flow: flow, pool: pool, mode: mode || "normal",
      next: 0, wrong: 0, t: 0,
      timerId: null, over: false
    };
    this.board();

    var self = this;
    this.state.timerId = setInterval(function () {
      var s = self.state;
      if (!s || s.over) return;
      s.t++;
      var el = document.getElementById("chainTime");
      if (el) el.textContent = s.t + "s";
    }, 1000);
  },

  /* ---------- 接龙界面 ---------- */
  board: function () {
    var s = this.state;
    if (!s || s.over) return;
    var total = s.flow.steps.length;

    /* 轨道：已接入的步骤 + 空槽 */
    var track = "";
    for (var i = 0; i < total; i++) {
      if (i < s.next) {
        track += '<div class="chain-slot"><span class="slot-idx">' + String(i + 1).padStart(2, "0") + '</span>'
          + '<span>' + GX.util.esc(s.flow.steps[i]) + '</span></div>';
      } else {
        track += '<div class="chain-empty">第 ' + (i + 1) + ' 步 · 等待接入</div>';
      }
    }

    /* 步骤池：未接入的乱序步骤 */
    var pool = s.pool.map(function (p, i) {
      if (p.done) return "";
      return '<button class="chain-step" id="step' + i + '" onclick="GX.games.chain.pick(' + i + ')">' + GX.util.esc(p.txt) + '</button>';
    }).join("");

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("流程接龙", "Process Chain", String(s.next + 1).padStart(2, "0"))
      + '<div class="watermark">Chain</div>'

      + '<div class="row" style="margin-bottom:12px">'
      + '<span class="block-tag">' + s.flow.name + '</span>'
      + '<span class="tagline">CH.' + s.flow.ch + ' · 失误 <b id="chainWrong" style="color:var(--zzz-ember)">' + s.wrong + '</b> · 用时 <span id="chainTime" style="color:var(--zzz-ink)">' + s.t + 's</span></span>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:12px"><span class="tagline">Track · 接龙轨道</span>'
      + '<span class="tag grey">' + s.next + ' / ' + total + '</span></div>'
      + '<div class="chain-track">' + track + '</div>'
      + '</div>'

      + '<div class="panel">'
      + '<div class="row" style="margin-bottom:12px"><span class="tagline">Pool · 步骤池（按正确顺序点击）</span></div>'
      + '<div class="chain-pool">' + pool + '</div>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
  },

  /* ---------- 点击步骤 ---------- */
  pick: function (i) {
    var s = this.state;
    if (!s || s.over || s.pool[i].done) return;

    if (s.pool[i].orig === s.next) {
      /* 接对了：入轨 */
      s.pool[i].done = true;
      s.next++;
      this.board();
      if (s.next >= s.flow.steps.length) {
        var self = this;
        setTimeout(function () { self.result(); }, 350);
      }
    } else {
      /* 接错了：闪红重置当前步，计一次失误 */
      s.wrong++;
      var w = document.getElementById("chainWrong");
      if (w) w.textContent = s.wrong;
      var el = document.getElementById("step" + i);
      if (el) {
        el.classList.remove("wrong");
        void el.offsetWidth;          /* 重置动画 */
        el.classList.add("wrong");
      }
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

    /* 零失误记为掌握度正确，否则记一次失误；流程错项入错题本 */
    GX.stats.recordRaw(s.flow.ch, s.wrong === 0, s.wrong === 0 ? null : s.flow.id, "chain");
    /* 清扫模式：一次接对即推进记忆度周期 */
    if (s.mode === "review" && s.wrong === 0) GX.srs.onCorrect(s.flow.id);

    var grade = s.wrong === 0 ? "S" : s.wrong <= 2 ? "A" : s.wrong <= 5 ? "B" : "F";
    var msg = {
      S: "一气呵成，流程烂熟于心！",
      A: "顺序基本掌握，细节再抠一抠",
      B: "框架有了，关键节点常混淆",
      F: "接得七零八落……先回考点歼灭学流程"
    }[grade];

    GX.daily.done(s.mode === "review" ? "review" : "chain");
    GX.stats.recordGame("chain", grade);
    GX.store.save();
    GX.ui.syncTop();

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline" style="color:rgba(255,255,255,.55)">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "#FFFFFF") + '">' + val + '</div></div>';
    };

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("接龙结算", "Result", grade)
      + '<div class="watermark">Result</div>'

      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + stat("流程步数", s.flow.steps.length, false)
      + stat("失误次数", "×" + s.wrong, true)
      + stat("用时", s.t + "s", false)
      + stat("所属章节", "CH." + s.flow.ch, false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row"><span class="tagline">Chain</span><span class="tag">' + s.flow.name + '</span></div>'
      + '</div>'

      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + '<button class="btn primary" onclick="GX.games.chain.start()">换一条流程</button>'
      + '<button class="btn" onclick="GX.games.chain.exit()">回首页</button>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
    GX.ui.toast(grade === "S" ? "S 级通关！" : "结算完成");
  }
};
