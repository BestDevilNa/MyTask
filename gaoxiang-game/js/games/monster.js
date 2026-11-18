/* ============================================================
 * 高项电竞社 · 游戏模块 —— 考点歼灭（monster）
 * 战斗规则（M1）：
 *   10 题一局 | 怪物 HP 20 | 玩家 HP 5
 *   答对：怪物 HP-2（连击≥3 追加-1）| 答错：玩家 HP-1、连击清零
 *   玩家 HP=0 提前结算
 * 支持 mode:"review"（错题清扫）：题目来自错题本到期队列
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.monster = {

  /* 怪物 HP：普通局 10 题满打约 22-30 点伤害，故设 30；
     连击 ≥3 后每题 -3，10 题全对 = 2+2+3+3+2+3+3+2+3+3 = 26，可打完不提前死。
     错题清扫局题量少，怪物更弱（14），提高紧张感。 */
  MON_HP: 30,
  MON_HP_REVIEW: 14,
  PLAYER_HP: 5,
  ROUND: 10,

  /* ---------- 入口：章节选择 ---------- */
  picker: function () {
    var meta = GX_META;
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("考点歼灭", "Concept Hunter", "01")
      + '<div class="watermark">Hunter</div>'
      + '<p class="muted" style="margin-bottom:16px">选择街区章节，10 题一局。答对攻击怪物，连击 ×3 追加伤害；答错自己掉血。</p>'
      + '<div class="stack">';

    meta.chapters.forEach(function (c) {
      if (!c.enabled) return;
      if (!GX.mapUnlocked(c.id)) {
        html += '<div class="panel" style="opacity:.55">'
          + '<div class="row"><div><div style="font-size:15.5px;font-weight:700">CH.' + c.id + ' ' + c.name + '</div>'
          + '<div class="tagline" style="margin-top:4px">CH.' + (c.id - 1) + ' 掌握度 ≥60% 后解锁</div></div>'
          + '<span class="lock-mask">Locked</span></div></div>';
        return;
      }
      var n = GX_BANK.byChapter(c.id).length;
      var m = GX.store.data.chapters[c.id] ? GX.store.data.chapters[c.id].mastery : 0;
      html += '<div class="panel">'
        + '<div class="row">'
        + '<div><div style="font-size:15.5px;font-weight:700">CH.' + c.id + ' ' + c.name + '</div>'
        + '<div class="tagline" style="margin-top:4px">' + n + ' 题库 · 掌握度 ' + m + '%</div></div>'
        + '<button class="btn primary" onclick="GX.games.monster.run({chapter:' + c.id + '})">开始</button>'
        + '</div>'
        + '<div class="hp" style="margin-top:12px"><i style="width:' + m + '%"></i></div>'
        + '</div>';
    });

    html += '</div></div></div>';
    this.state = null;     /* 章节选择页：旧对局状态丢弃 */
    this.inGame = false;   /* 非战斗视图 */
    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 开始一局 ---------- */
  run: function (opt) {
    var mode = opt.mode || "normal";
    var qs = [];

    if (mode === "review") {
      var today = GX.util.today();
      var due = GX.store.data.wrong.filter(function (w) { return w.next <= today; });
      qs = due.map(function (w) { return GX_BANK.get(w.qid); })
        .filter(function (q) { return !!q; });   /* 过滤 ITTO/流程题（只在对应小游戏清扫） */
      GX.util.shuffle(qs);
      qs = qs.slice(0, this.ROUND);
      if (!qs.length) { GX.ui.toast("没有到期错题，先去打新题吧", "o"); return; }
    } else {
      var pool = GX_BANK.byChapter(opt.chapter).slice();
      GX.util.shuffle(pool);
      qs = pool.slice(0, this.ROUND);
    }

    /* 选项乱序（内置题库答案多集中在 A） */
    qs = qs.map(function (q) { return GX.util.shuffleOpts(q); });

    var monMax = mode === "review"
      ? Math.max(8, Math.min(this.MON_HP_REVIEW, qs.length * 4))
      : this.MON_HP;

    this.state = {
      mode: mode, chapter: opt.chapter || 0,
      qs: qs, idx: 0,
      monHP: monMax, monMax: monMax, playerHP: this.PLAYER_HP,
      combo: 0, maxCombo: 0, wrong: 0, correct: 0,
      answered: false
    };

    /* 游戏页不占用 hash：直接渲染，避免 hashchange 与路由互相触发 */
    this.inGame = true;   /* 战斗视图进行中 */
    this.battle();
  },

  /* ---------- 战斗界面 ---------- */
  battle: function () {
    var s = this.state;
    /* 结束判定用实际题池长度（错题清扫局题量可能 < 10） */
    if (s.idx >= s.qs.length || s.playerHP <= 0 || s.monHP <= 0) { this.result(); return; }

    var q = s.qs[s.idx];
    var monName = s.mode === "review"
      ? "错题幽灵"
      : "CH." + s.chapter + " 街区守卫";

    var hp = function (v, max) { return Math.max(0, Math.round(v / max * 100)); };

    var html = '<div class="page"><div class="wrap">'

      + GX.ui.secNav(s.mode === "review" ? "错题清扫" : "歼灭战", s.mode === "review" ? "Retry" : "Battle", String(s.idx + 1).padStart(2, "0"))
      + '<div class="watermark">Battle</div>'

      + '<div class="row" style="margin-bottom:16px">'
      + '<span class="block-tag">' + (s.mode === "review" ? "Retry Station" : "CH." + s.chapter + " 歼灭战") + '</span>'
      + '<span class="combo" id="comboTag">Combo ×' + s.combo + '</span>'
      + '</div>'

      /* 怪物舞台：黑色 KV 块 */
      + '<div class="battle-stage" style="margin-bottom:14px">'
      + '<div class="skew-block r"></div>'
      + '<div class="row" style="position:relative;z-index:1">'
      + '<span class="monster-face" id="monFace">'
      + '<svg viewBox="0 0 48 48" width="46" height="46" aria-label="守卫"><path d="M24 3 L43 24 L24 45 L5 24 Z" fill="none" stroke="#D8FA00" stroke-width="3"/><path d="M24 13 L34 24 L24 35 L14 24 Z" fill="#D8FA00"/><path d="M5 24 L0 19 M43 24 L48 19 M24 45 L24 48" stroke="#D8FA00" stroke-width="3" stroke-linecap="round"/></svg>'
      + '</span>'
      + '<div style="flex:1;margin-left:14px">'
      + '<div style="font-size:14px;font-weight:700;color:#fff">' + monName + ' Lv.' + (s.mode === "review" ? 9 : s.chapter) + '</div>'
      + '<div class="hp dark" style="margin-top:8px"><i id="monHP" style="width:' + hp(s.monHP, s.monMax) + '%"></i></div>'
      + '<div class="tagline" style="margin-top:6px;color:rgba(255,255,255,.5)">Monster HP</div>'
      + '</div></div>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:14px 0 12px"></div>'
      + '<div class="row" style="position:relative;z-index:1">'
      + '<span class="tagline" style="color:rgba(255,255,255,.55)">Player HP</span>'
      + '<span class="tagline" id="pHPtxt" style="color:var(--zzz-yellow)">' + s.playerHP + ' / ' + this.PLAYER_HP + '</span>'
      + '</div>'
      + '<div class="hp dark" style="margin-top:6px"><i id="pHP" style="width:' + hp(s.playerHP, this.PLAYER_HP) + '%"></i></div>'
      + '</div>'

      /* 题目 */
      + '<div class="panel" style="margin-bottom:14px">'
      + '<div class="row" style="margin-bottom:10px">'
      + '<span class="tagline">Question ' + String(s.idx + 1).padStart(2, "0") + ' / ' + s.qs.length + '</span>'
      + '<span class="tag grey">' + (q.tags && q.tags[0] ? q.tags[0] : "综合") + '</span>'
      + '</div>'
      + '<div class="q-card"><span class="qno">' + (s.idx + 1) + '.</span>' + q.q + '</div>'
      + '</div>'

      /* 选项 */
      + '<div class="opts" id="optBox">';

    for (var i = 0; i < 4; i++) {
      html += '<button class="opt" data-i="' + i + '" onclick="GX.games.monster.answer(' + i + ')">'
        + '<span class="optkey">' + "ABCD"[i] + '</span><span>' + q.opts[i] + '</span></button>';
    }

    html += '</div>'
      + '<div id="expBox" style="margin-top:14px"></div>'
      + '</div></div>';

    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 作答 ---------- */
  answer: function (i) {
    var s = this.state;
    if (s.answered) return;
    s.answered = true;

    var q = s.qs[s.idx];
    var right = (i === q.ans);

    /* 记录统计与错题本 */
    GX.stats.record(q, right, s.mode === "review");

    var opts = document.querySelectorAll("#optBox .opt");
    for (var k = 0; k < opts.length; k++) {
      opts[k].setAttribute("disabled", "disabled");
      if (k === q.ans) opts[k].classList.add("on");
      else if (k === i) opts[k].classList.add("off");
    }

    var dmg = 0;
    if (right) {
      s.combo++; s.correct++;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      dmg = 2 + (s.combo >= 3 ? 1 : 0);
      s.monHP = Math.max(0, s.monHP - dmg);
      var face = document.getElementById("monFace");
      if (face) face.classList.add("hit");
      var comboTag = document.getElementById("comboTag");
      if (comboTag) { comboTag.textContent = "Combo ×" + s.combo; comboTag.classList.add("pulse"); }
    } else {
      s.combo = 0; s.wrong++;
      s.playerHP = Math.max(0, s.playerHP - 1);
      var comboTag2 = document.getElementById("comboTag");
      if (comboTag2) comboTag2.textContent = "Combo ×0";
    }

    setTimeout(function () {
      var m = document.getElementById("monHP");
      if (m) m.style.width = Math.max(0, Math.round(s.monHP / s.monMax * 100)) + "%";
      var p = document.getElementById("pHP");
      if (p) p.style.width = Math.max(0, Math.round(s.playerHP / GX.games.monster.PLAYER_HP * 100)) + "%";
      var pt = document.getElementById("pHPtxt");
      if (pt) pt.textContent = s.playerHP + " / " + GX.games.monster.PLAYER_HP;

      document.getElementById("expBox").innerHTML =
        '<div class="exp-box' + (right ? "" : " wrong") + '">'
        + '<b>' + (right ? "✓ 命中！伤害 -" + dmg : "✗ 被反噬，HP -1") + '</b>'
        + (right ? "" : '<br>正确答案：<b>' + "ABCD"[q.ans] + ". " + q.opts[q.ans] + '</b>')
        + '<br><b>解析</b> ' + q.exp + GX.util.srcTag(q) + '</div>'
        + '<div style="text-align:right;margin-top:12px"><button class="btn primary" onclick="GX.games.monster.next()">'
        + (s.idx + 1 >= s.qs.length || s.playerHP <= 0 || s.monHP <= 0 ? "结算 ▼" : "下一题 ▼")
        + '</button></div>';
    }, 260);
  },

  /* ---------- 下一题 ---------- */
  next: function () {
    var s = this.state;
    s.answered = false;
    s.idx++;
    this.battle();
  },

  /* ---------- 中断对局（导航离开 / 退出） ---------- */
  abort: function () {
    this.state = null;
    this.inGame = false;
  },

  /* ---------- 退出对局 ---------- */
  exit: function () {
    this.abort();
    GX.ui.go("#today");
  },

  /* ---------- 结算 ---------- */
  result: function () {
    var s = this.state;
    /* 实际答题数（提前结束时应以已答题数为分母） */
    var answered = Math.max(1, Math.min(s.idx, s.qs.length));
    var acc = Math.round(s.correct / answered * 100);
    var grade = (s.playerHP <= 0 && s.correct < answered) ? "F"
              : s.wrong === 0 ? "S"
              : acc >= 80 ? "A"
              : acc >= 60 ? "B" : "F";
    var msg = {
      S: "完胜！街区守卫被彻底歼灭",
      A: "漂亮！小怪兽掉了几颗牙",
      B: "险胜，错题已进回收站，回去补刀",
      F: "被守卫反杀……去错题回收站雪耻"
    }[grade];

    /* 每日任务打卡 */
    if (s.mode === "review") GX.daily.done("review");
    else GX.daily.done("monster");
    GX.stats.recordGame("monster", grade);
    GX.store.save();
    GX.ui.syncTop();

    var chName = s.mode === "review"
      ? "错题清扫"
      : "CH." + s.chapter + " " + (GX_META.chapters[s.chapter - 1] ? GX_META.chapters[s.chapter - 1].name : "");

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline" style="color:rgba(255,255,255,.55)">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "#FFFFFF") + '">' + val + '</div></div>';
    };

    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("战斗结算", "Result", grade)
      + '<div class="watermark">Result</div>'

      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + stat("正确率", acc + "%", true)
      + stat("最高连击", "×" + s.maxCombo, true)
      + stat("答对", s.correct, false)
      + stat("错题", s.wrong, false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row"><span class="tagline">Battle</span><span class="tag">' + chName + '</span></div>'
      + '</div>'

      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + (s.wrong > 0 ? '<button class="btn ember" onclick="GX.games.monster.run({mode:\'review\'})">错题清扫</button>' : "")
      + (s.mode !== "normal" ? '' : '<button class="btn" onclick="GX.games.monster.picker()">再来一局</button>')
      + '<button class="btn primary" onclick="GX.games.monster.exit()">回首页</button>'
      + '</div>'
      + '</div></div>';

    GX.ui.view(html);
    GX.ui.nav("");
    GX.ui.toast(grade === "S" ? "S 级通关！" : "结算完成");
    this.inGame = false;   /* 结算页，非战斗视图 */
  }
};
