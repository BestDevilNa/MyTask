/* ============================================================
 * 高项电竞社 · 游戏模块 —— ITTO 分拣（itto）
 * 规则（M2）：
 *   60 秒限时 | 卡片归入 输入 / 工具与技术 / 输出 三栏
 *   分拣正确 → 下一张 | 分拣错误 → 扣 5 秒，卡片排到队尾再现
 *   计入对应知识域章节掌握度（不入错题本）
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.itto = {
  TIME: 60,        /* 限时（秒） */
  PENALTY: 5,      /* 错拣扣时（秒） */
  CAT_NAME: { input: "输入", tool: "工具与技术", output: "输出" },

  /* ---------- 入口：知识域选择 ---------- */
  picker: function () {
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("ITTO 分拣", "ITTO Sorter", "02")
      + '<div class="watermark">ITTO</div>'
      + '<p class="muted" style="margin-bottom:16px">60 秒内把卡片分入「输入 / 工具与技术 / 输出」。错拣扣 5 秒，卡片会排到队尾再次出现。</p>'
      + '<div class="stack">'

      + '<div class="panel"><div class="row">'
      + '<div><div style="font-size:15.5px;font-weight:700">混合挑战</div>'
      + '<div class="tagline" style="margin-top:4px">全部知识域随机抽卡</div></div>'
      + '<button class="btn primary" onclick="GX.games.itto.run(\'mix\')">开始</button>'
      + '</div></div>';

    GX_ITTO.domains.forEach(function (d) {
      html += '<div class="panel"><div class="row">'
        + '<div><div style="font-size:15.5px;font-weight:700">' + d.name + '</div>'
        + '<div class="tagline" style="margin-top:4px">CH.' + d.ch + ' · ' + d.cards.length + ' 张卡</div></div>'
        + '<button class="btn primary" onclick="GX.games.itto.run(\'' + d.key + '\')">开始</button>'
        + '</div></div>';
    });

    html += '</div></div></div>';
    this.abort();
    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 开始一局 ---------- */
  run: function (key) {
    var deck = [];
    if (key === "mix") {
      /* 混合：每个知识域抽 2 张 */
      GX_ITTO.domains.forEach(function (d) {
        var two = d.cards.slice();
        GX.util.shuffle(two);
        two.slice(0, 2).forEach(function (c) { deck.push({ c: c, ch: d.ch }); });
      });
    } else {
      var d = GX_ITTO.byDomain(key);
      if (!d) return;
      deck = d.cards.map(function (c) { return { c: c, ch: d.ch }; });
    }
    GX.util.shuffle(deck);

    this.state = {
      deck: deck, idx: 0,
      left: this.TIME, right: 0, wrong: 0,
      binCnt: { input: 0, tool: 0, output: 0 },
      domainName: key === "mix" ? "混合挑战" : GX_ITTO.byDomain(key).name,
      timerId: null, over: false
    };
    this.battle();
    var self = this;
    this.state.timerId = setInterval(function () { self.tick(); }, 100);
  },

  /* ---------- 倒计时 ---------- */
  tick: function () {
    var s = this.state;
    if (!s || s.over) return;
    s.left = Math.max(0, s.left - 0.1);
    var bar = document.getElementById("ittoBar");
    var num = document.getElementById("ittoNum");
    var wrap = document.getElementById("ittoBarWrap");
    if (num) num.textContent = s.left.toFixed(1) + "s";
    if (bar) bar.style.width = (s.left / this.TIME * 100) + "%";
    if (wrap) wrap.classList.toggle("ember", s.left < 10);
    if (s.left <= 0) this.result();
  },

  /* ---------- 分拣界面 ---------- */
  battle: function () {
    var s = this.state;
    if (!s || s.over) return;
    if (s.idx >= s.deck.length) { this.result(); return; }
    var item = s.deck[s.idx];

    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("ITTO 分拣", "ITTO Sorter", String(s.right + s.wrong + 1).padStart(2, "0"))
      + '<div class="watermark">Sort</div>'

      + '<div class="row" style="margin-bottom:12px">'
      + '<span class="block-tag">' + s.domainName + '</span>'
      + '<span class="tagline">✓ ' + s.right + ' · ✗ ' + s.wrong + '</span>'
      + '</div>'

      + '<div class="timer-wrap" id="ittoBarWrap">'
      + '<div class="timer-bar"><i id="ittoBar" style="width:' + (s.left / this.TIME * 100) + '%"></i></div>'
      + '<span class="timer-num" id="ittoNum">' + s.left.toFixed(1) + 's</span></div>'

      + '<div class="sort-card" id="sortCard">'
      + '<div class="card-name">' + GX.util.esc(item.c.card) + '</div>'
      + '<div class="card-proc">所属过程 · ' + GX.util.esc(item.c.process) + '</div>'
      + '</div>'

      + '<div class="bins">'
      + '<button class="bin" id="binInput" onclick="GX.games.itto.sort(\'input\')"><span class="bin-name">输入</span><span class="bin-en">Input</span><span class="bin-count" id="cntInput">' + s.binCnt.input + '</span></button>'
      + '<button class="bin" id="binTool" onclick="GX.games.itto.sort(\'tool\')"><span class="bin-name">工具与技术</span><span class="bin-en">Tool</span><span class="bin-count" id="cntTool">' + s.binCnt.tool + '</span></button>'
      + '<button class="bin" id="binOutput" onclick="GX.games.itto.sort(\'output\')"><span class="bin-name">输出</span><span class="bin-en">Output</span><span class="bin-count" id="cntOutput">' + s.binCnt.output + '</span></button>'
      + '</div>'

      + '<p class="muted" style="margin-top:14px">这张卡片属于该过程的哪一类？点对应分拣槽。</p>'
      + '</div></div>';

    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 分拣判定 ---------- */
  sort: function (cat) {
    var s = this.state;
    if (!s || s.over || s.idx >= s.deck.length) return;
    var item = s.deck[s.idx];
    var right = (item.c.cat === cat);

    GX.stats.recordRaw(item.ch, right);

    var card = document.getElementById("sortCard");
    var bin = document.getElementById("bin" + cat.charAt(0).toUpperCase() + cat.slice(1));

    if (right) {
      s.right++;
      s.binCnt[cat]++;
      s.idx++;
      if (card) card.classList.add("hit");
      if (bin) bin.classList.add("ok");
    } else {
      s.wrong++;
      s.left = Math.max(0, s.left - this.PENALTY);
      s.deck.push(item);          /* 错卡排到队尾，稍后再战 */
      s.idx++;
      if (card) card.classList.add("miss");
      if (bin) bin.classList.add("no");
      GX.ui.toast("−" + this.PENALTY + "s！正确分类：" + this.CAT_NAME[item.c.cat], "o");
    }

    var self = this;
    setTimeout(function () {
      if (!self.state || self.state.over) return;
      self.battle();
    }, 300);
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

    var total = s.right + s.wrong;
    var acc = total ? Math.round(s.right / total * 100) : 0;
    var finished = s.idx >= s.deck.length;
    var grade = finished && s.wrong === 0 ? "S" : acc >= 80 ? "A" : acc >= 60 ? "B" : "F";
    var msg = {
      S: "全部分拣无误，ITTO 通透！",
      A: "手感在线，个别卡片再刷一遍",
      B: "勉强及格，回街区补补 ITTO",
      F: "分类混乱……去考点歼灭里补课"
    }[grade];

    GX.daily.done("itto");
    GX.store.save();
    GX.ui.syncTop();

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline" style="color:rgba(255,255,255,.55)">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "#FFFFFF") + '">' + val + '</div></div>';
    };

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("分拣结算", "Result", grade)
      + '<div class="watermark">Result</div>'

      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + stat("正确率", acc + "%", true)
      + stat("分拣正确", s.right, true)
      + stat("错拣扣时", "×" + s.wrong, false)
      + stat("剩余时间", s.left.toFixed(1) + "s", false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row"><span class="tagline">Sort</span><span class="tag">' + s.domainName + '</span></div>'
      + '</div>'

      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + '<button class="btn" onclick="GX.games.itto.picker()">再来一局</button>'
      + '<button class="btn primary" onclick="GX.games.itto.exit()">回首页</button>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
    GX.ui.toast(grade === "S" ? "S 级通关！" : "结算完成");
  }
};
