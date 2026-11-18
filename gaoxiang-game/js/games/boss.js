/* ============================================================
 * 高项电竞社 · 游戏模块 —— 街区 BOSS 战（boss）
 * 规则（M3）：
 *   每章 30 题 · 总限时 25 分钟 · 及格线 60%
 *   通关（≥60%）→ chapters[ch].bossCleared = true、掌握度 +10（封顶 100）
 *   通关解锁下一街区（M3 起为主路径）
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.boss = {
  TOTAL: 30,        /* 题目数 */
  LIMIT: 25 * 60,   /* 总限时（秒）= 25 分钟 */
  PASS: 60,         /* 及格线（%） */

  /* ---------- 入口：可挑战的章节列表 ---------- */
  picker: function () {
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("街区 BOSS 战", "Block Boss", "05")
      + '<div class="watermark">BOSS</div>'
      + '<p class="muted" style="margin-bottom:16px">每章 30 题、限时 25 分钟，及格线 60%。通关后解锁下一街区，并提升本章掌握度。</p>'
      + '<div class="stack">';

    var any = false;
    GX_META.chapters.forEach(function (c) {
      if (!c.enabled) return;
      var n = GX_BANK.byChapter(c.id).length;
      if (!n) return;
      var st = GX.store.data.chapters[c.id];
      var cleared = st && st.bossCleared;
      var mastery = st ? st.mastery : 0;
      if (GX.mapUnlocked(c.id)) any = true;
      html += '<div class="panel"><div class="row">'
        + '<div><div style="font-size:15.5px;font-weight:700">CH.' + c.id + ' ' + c.name
        + (cleared ? ' <span class="tag solid">CLEARED</span>' : '') + '</div>'
        + '<div class="tagline" style="margin-top:4px">' + n + ' 题 · 掌握度 ' + mastery + '%'
        + (cleared ? ' · 已通关' : '') + '</div></div>'
        + (GX.mapUnlocked(c.id)
            ? '<button class="btn primary" onclick="GX.games.boss.run(' + c.id + ')">挑战</button>'
            : '<span class="lock-mask">CH.' + (c.id - 1) + ' 未通关</span>')
        + '</div></div>';
    });

    if (!any) html += '<p class="muted">暂无已解锁街区，先去考点歼灭提升掌握度。</p>';

    html += '</div></div></div>';
    this.abort();
    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 开始挑战 ---------- */
  run: function (ch) {
    if (!GX.mapUnlocked(ch)) { GX.ui.toast("该街区尚未解锁", "o"); return; }
    var pool = GX_BANK.byChapter(ch).slice();
    GX.util.shuffle(pool);
    var qs = pool.slice(0, this.TOTAL).map(function (q) { return GX.util.shuffleOpts(q); });

    this.state = {
      ch: ch, qs: qs, idx: 0,
      left: this.LIMIT, correct: 0, wrong: 0,
      answered: false, over: false, timerId: null
    };
    this.battle();

    var self = this;
    this.state.timerId = setInterval(function () { self.tick(); }, 1000);
  },

  /* ---------- 倒计时 ---------- */
  tick: function () {
    var s = this.state;
    if (!s || s.over) return;
    s.left--;
    var num = document.getElementById("bossNum");
    if (num) num.textContent = this.mmss(s.left);
    var bar = document.getElementById("bossBar");
    if (bar) bar.style.width = Math.max(0, s.left / this.LIMIT * 100) + "%";
    var wrap = document.getElementById("bossBarWrap");
    if (wrap) wrap.classList.toggle("ember", s.left < 300);
    if (s.left <= 0) this.result();
  },

  mmss: function (sec) {
    var m = Math.floor(Math.max(0, sec) / 60), s = Math.max(0, sec) % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  },

  /* ---------- 战斗界面 ---------- */
  battle: function () {
    var s = this.state;
    if (!s || s.over) return;
    if (s.idx >= s.qs.length) { this.result(); return; }
    var q = s.qs[s.idx];
    var chName = GX_META.chapters[s.ch - 1] ? GX_META.chapters[s.ch - 1].name : "";
    var pct = Math.round(s.idx / s.qs.length * 100);

    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("BOSS 战", "Block Boss", String(s.idx + 1).padStart(2, "0"))
      + '<div class="watermark">BOSS</div>'

      + '<div class="row" style="margin-bottom:12px">'
      + '<span class="block-tag">CH.' + s.ch + ' ' + chName + '</span>'
      + '<span class="combo" id="bossAcc">✓ ' + s.correct + ' · ✗ ' + s.wrong + '</span>'
      + '</div>'

      /* 倒计时 + 进度 */
      + '<div class="timer-wrap" id="bossBarWrap">'
      + '<div class="timer-bar"><i id="bossBar" style="width:' + (s.left / this.LIMIT * 100) + '%"></i></div>'
      + '<span class="timer-num" id="bossNum">' + this.mmss(s.left) + '</span></div>'
      + '<div class="hp" style="margin-bottom:14px"><i style="width:' + pct + '%"></i></div>'

      /* 题目 */
      + '<div class="panel" style="margin-bottom:14px">'
      + '<div class="row" style="margin-bottom:10px">'
      + '<span class="tagline">Question ' + String(s.idx + 1).padStart(2, "0") + ' / ' + s.qs.length + '</span>'
      + '<span class="tag grey">及格 ' + this.PASS + '%</span>'
      + '</div>'
      + '<div class="q-card"><span class="qno">' + (s.idx + 1) + '.</span>' + q.q + '</div>'
      + '</div>'

      /* 选项 */
      + '<div class="opts" id="optBox">';
    for (var i = 0; i < 4; i++) {
      html += '<button class="opt" data-i="' + i + '" onclick="GX.games.boss.answer(' + i + ')">'
        + '<span class="optkey">' + "ABCD"[i] + '</span><span>' + q.opts[i] + '</span></button>';
    }
    html += '</div>'
      + '<div id="expBox" style="margin-top:14px"></div>'
      + '<div style="text-align:right;margin-top:12px">'
      + '<button class="btn" onclick="GX.games.boss.finish()">提前交卷</button>'
      + '</div>'
      + '</div></div>';

    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 作答 ---------- */
  answer: function (i) {
    var s = this.state;
    if (!s || s.over || s.answered) return;
    s.answered = true;

    var q = s.qs[s.idx];
    var right = (i === q.ans);
    GX.stats.record(q, right, false);   /* Boss 题不计为复习题 */

    var opts = document.querySelectorAll("#optBox .opt");
    for (var k = 0; k < opts.length; k++) {
      opts[k].setAttribute("disabled", "disabled");
      if (k === q.ans) opts[k].classList.add("on");
      else if (k === i) opts[k].classList.add("off");
    }
    if (right) s.correct++; else s.wrong++;

    var acc = document.getElementById("bossAcc");
    if (acc) acc.textContent = "✓ " + s.correct + " · ✗ " + s.wrong;

    var self = this;
    setTimeout(function () {
      document.getElementById("expBox").innerHTML =
        '<div class="exp-box' + (right ? "" : " wrong") + '">'
        + '<b>' + (right ? "✓ 命中" : "✗ 答错") + '</b>'
        + (right ? "" : '<br>正确答案：<b>' + "ABCD"[q.ans] + ". " + q.opts[q.ans] + '</b>')
        + '<br><b>解析</b> ' + q.exp + GX.util.srcTag(q) + '</div>'
        + '<div style="text-align:right;margin-top:12px"><button class="btn primary" onclick="GX.games.boss.next()">'
        + (s.idx + 1 >= s.qs.length ? "结算 ▼" : "下一题 ▼")
        + '</button></div>';
    }, 200);
  },

  next: function () {
    var s = this.state;
    if (!s || s.over) return;
    s.answered = false;
    s.idx++;
    if (s.idx >= s.qs.length) this.result();
    else this.battle();
  },

  /* ---------- 提前交卷 ---------- */
  finish: function () {
    var s = this.state;
    if (!s || s.over) return;
    if (s.idx === 0) { GX.ui.toast("还没开始答题", "o"); return; }
    s.quit = true;          /* 提前交卷：本次不算通关 */
    this.result();
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

    var answered = s.idx;
    var acc = answered ? Math.round(s.correct / answered * 100) : 0;
    var quit = !!s.quit;                       /* 提前交卷 */
    var passed = !quit && acc >= this.PASS;    /* 提前交卷一律不算通关 */
    var grade = quit ? "F" : (acc >= 90 ? "S" : acc >= 80 ? "A" : acc >= this.PASS ? "B" : "F");
    var msg = quit
      ? "提前交卷，本次挑战不计通关"
      : {
        S: "完美压制！街区彻底肃清",
        A: "漂亮一战，守卫已被击退",
        B: "险胜过关，街区已解锁",
        F: "被守卫挡了回来……去错题本补刀"
      }[grade];

    /* 通关：记录 bossCleared + 掌握度加成（仅首次） */
    var d = GX.store.data;
    var c = d.chapters[s.ch] || (d.chapters[s.ch] = { newC: 0, newOk: 0, revC: 0, revOk: 0, mastery: 0 });
    var firstClear = !c.bossCleared;
    if (passed) {
      c.bossCleared = true;
      if (firstClear) c.mastery = Math.min(100, c.mastery + 10);
    }

    /* 战绩记录 */
    GX.stats.recordGame("boss", grade);
    GX.daily.done("boss");
    GX.store.save();
    GX.ui.syncTop();

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline" style="color:rgba(255,255,255,.55)">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "#FFFFFF") + '">' + val + '</div></div>';
    };

    var chName = GX_META.chapters[s.ch - 1] ? "CH." + s.ch + " " + GX_META.chapters[s.ch - 1].name : "CH." + s.ch;
    var nextCh = s.ch + 1;
    var nextOpen = passed && nextCh <= 24 && GX_META.chapters[nextCh - 1] && GX_META.chapters[nextCh - 1].enabled;

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("BOSS 结算", "Result", grade)
      + '<div class="watermark">Result</div>'

      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + stat("正确率", acc + "%", true)
      + stat("答对", s.correct, true)
      + stat("答错", s.wrong, false)
      + stat("用时", this.mmss(this.LIMIT - s.left), false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row"><span class="tagline">Boss</span><span class="tag">' + chName + '</span></div>'
      + '<div class="row" style="margin-top:10px"><span class="tagline">掌握度</span>'
      + '<span style="font-family:var(--font-num);font-size:16px">' + c.mastery + '%'
      + (passed && firstClear ? ' <span class="tag solid">+10 BOSS</span>' : '') + '</span></div>'
      + (nextOpen ? '<p class="muted" style="margin-top:10px;color:var(--zzz-ink)">✓ CH.' + nextCh + ' 街区已解锁</p>' : "")
      + '</div>'

      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + '<button class="btn" onclick="GX.games.boss.picker()">返回 BOSS 列表</button>'
      + '<button class="btn primary" onclick="GX.games.boss.exit()">回首页</button>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
    GX.ui.toast(passed ? "BOSS 通关！" : (quit ? "提前交卷，本次不算通关" : "未达及格线"));
  }
};
