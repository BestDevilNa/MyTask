/* ============================================================
 * 高项电竞社 · 应用框架（app.js）
 * 路由 | 存档 | 每日任务 | 连胜+冻结 | 间隔重复 | 掌握度 | 页面
 * ============================================================ */
window.GX = window.GX || {};

/* ---------------- 工具 ---------------- */
GX.util = {
  today: function () { return this.fmt(new Date()); },
  fmt: function (d) {
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  },
  addDays: function (dateStr, n) {
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return this.fmt(d);
  },
  diffDays: function (a, b) {  // b - a，天數
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  },
  shuffle: function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  },
  esc: function (s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
};

/* ---------------- 存档 ---------------- */
GX.store = {
  KEY: "gaoxiang_save",
  data: null,

  defaults: function () {
    return {
      version: 1,
      settings: { examDate: "2027-05-22" },
      streak: { count: 0, last: "", freezes: 2, freezeMonth: GX.util.today().slice(0, 7) },
      daily: { date: "", done: {}, completed: false, required: [] },
      chapters: {},            // {ch:{newC,newOk,revC,revOk,mastery,bossCleared}}
      wrong: [],               // [{qid,count,next,mem,type}]
      stats: { answered: 0, correct: 0, recovered: 0, games: {} }
    };
  },

  load: function () {
    var raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { }
    this.data = raw ? JSON.parse(raw) : this.defaults();
    /* 兼容字段补全 */
    var def = this.defaults();
    for (var k in def) if (this.data[k] === undefined) this.data[k] = def[k];
    this.data.stats = Object.assign({}, def.stats, this.data.stats || {});
    this.data.stats.games = this.data.stats.games || {};
    this.data.settings = Object.assign({}, def.settings, this.data.settings || {});
    this.data.streak = Object.assign({}, def.streak, this.data.streak || {});
  },

  save: function () {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {
      GX.ui.toast("存档失败：浏览器存储不可用", "o");
    }
  },

  reset: function () {
    this.data = this.defaults();
    this.save();
  }
};

/* ---------------- 间隔重复 & 统计 ---------------- */
GX.srs = {
  /* 答错：入库/回落 */
  onWrong: function (qid) {
    var d = GX.store.data;
    var w = null;
    for (var i = 0; i < d.wrong.length; i++) if (d.wrong[i].qid === qid) { w = d.wrong[i]; break; }
    if (!w) {
      w = { qid: qid, count: 1, next: GX.util.addDays(GX.util.today(), 1), mem: 40 };
      d.wrong.push(w);
    } else {
      w.count++;
      w.next = GX.util.addDays(GX.util.today(), 1);
      w.mem = Math.max(20, w.mem - 15);
    }
  },

  /* 复习答对：推进周期；记忆度满出库 */
  onCorrect: function (qid) {
    var d = GX.store.data;
    var steps = GX_META.srsSteps;         // [1,2,4,7,15]
    for (var i = 0; i < d.wrong.length; i++) {
      var w = d.wrong[i];
      if (w.qid !== qid) continue;
      var idx = Math.min(w.count, steps.length) - 1;
      w.next = GX.util.addDays(GX.util.today(), steps[idx]);
      w.mem = Math.min(100, w.mem + 10);
      if (w.mem >= 100) {
        d.wrong.splice(i, 1);
        d.stats.recovered++;
      }
      return;
    }
  },

  dueList: function () {
    var t = GX.util.today();
    return GX.store.data.wrong.filter(function (w) { return w.next <= t; });
  }
};

GX.stats = {
  record: function (q, right, isReview) {
    var d = GX.store.data;
    d.stats.answered++;
    if (right) d.stats.correct++;

    var c = d.chapters[q.ch] || (d.chapters[q.ch] = { newC: 0, newOk: 0, revC: 0, revOk: 0, mastery: 0 });
    if (isReview) { c.revC++; if (right) c.revOk++; }
    else { c.newC++; if (right) c.newOk++; }

    if (right) { if (isReview) GX.srs.onCorrect(q.id); }
    else GX.srs.onWrong(q.id);

    /* 掌握度 = 新题70% + 复习30% */
    var m;
    if (c.newC + c.revC === 0) m = 0;
    else if (c.revC === 0) m = c.newOk / c.newC;
    else m = 0.7 * (c.newOk / c.newC) + 0.3 * (c.revOk / c.revC);
    c.mastery = Math.round(m * 100);

    GX.store.save();
  },

  /* 小游戏（itto/match/chain）判定：计全局与章节掌握度，不进错题本
     qid 存在时按题型入错题本（供分题型清扫） */
  recordRaw: function (ch, right, qid, type) {
    var d = GX.store.data;
    d.stats.answered++;
    if (right) d.stats.correct++;

    var c = d.chapters[ch] || (d.chapters[ch] = { newC: 0, newOk: 0, revC: 0, revOk: 0, mastery: 0 });
    c.newC++;
    if (right) c.newOk++;

    var m = (c.revC === 0) ? c.newOk / c.newC : 0.7 * (c.newOk / c.newC) + 0.3 * (c.revOk / c.revC);
    c.mastery = Math.round(m * 100);

    /* 错项入库：单选走既有 SRS；ITTO/流程错项也进错题本（带 type 标记） */
    if (qid) {
      if (right) GX.srs.onCorrect(qid);
      else {
        var w = null;
        for (var i = 0; i < d.wrong.length; i++) if (d.wrong[i].qid === qid) { w = d.wrong[i]; break; }
        if (!w) {
          w = { qid: qid, count: 1, next: GX.util.addDays(GX.util.today(), 1), mem: 40, type: type || "single" };
          d.wrong.push(w);
        } else {
          w.count++;
          w.next = GX.util.addDays(GX.util.today(), 1);
          w.mem = Math.max(20, w.mem - 15);
        }
      }
    }
    GX.store.save();
  },

  /* 游戏战绩：{key:{plays,best}}，best 取最高评级 */
  recordGame: function (key, grade) {
    var g = GX.store.data.stats.games;
    var cur = g[key] || (g[key] = { plays: 0, best: "" });
    cur.plays++;
    var rank = { "S": 4, "A": 3, "B": 2, "F": 1 };
    if (!cur.best || (rank[grade] || 0) > (rank[cur.best] || 0)) cur.best = grade;
  }
};

/* ---------------- 每日任务 & 连胜 ---------------- */
GX.daily = {
  /* 新的一天（或旧版任务单升级）：计算当日必做项
     M3 规则：monster 必含 + itto/match/chain 按日轮换 2 款 + 到期错题清扫 + BOSS 挑战 */
  ensure: function () {
    var d = GX.store.data, t = GX.util.today();
    if (d.daily.date === t && d.daily.v === 3) return;
    var rot = [["itto", "match"], ["match", "chain"], ["chain", "itto"]];
    var dn = Math.floor(new Date(t + "T00:00:00").getTime() / 86400000);
    var required = ["monster"].concat(rot[dn % 3]);
    if (GX.srs.dueList().length > 0) required.push("review");
    /* BOSS 挑战：取已解锁且未通关的最小章节 */
    var bossCh = 0;
    for (var i = 0; i < GX_META.chapters.length; i++) {
      var c = GX_META.chapters[i];
      if (!c.enabled || !GX_BANK.byChapter(c.id).length) continue;
      if (!GX.mapUnlocked(c.id)) continue;
      var st = d.chapters[c.id];
      if (st && st.bossCleared) continue;
      bossCh = c.id;
      break;
    }
    if (bossCh) required.push("boss");
    var keepDone = (d.daily.date === t) ? (d.daily.done || {}) : {};
    var wasDone = (d.daily.date === t) ? d.daily.completed : false;
    d.daily = { v: 3, date: t, done: keepDone, completed: wasDone, required: required };
    GX.store.save();
  },

  done: function (key) {
    var d = GX.store.data;
    d.daily.done[key] = true;
    if (!d.daily.completed) {
      var n = d.daily.required.filter(function (r) { return d.daily.done[r]; }).length;
      if (n >= 3) {                       /* M2：完成 ≥3 项即打卡 */
        d.daily.completed = true;
        this.streakUp();
        GX.ui.toast("完成 " + n + " 项，今日打卡！STREAK ×" + d.streak.count);
      }
    }
    GX.store.save();
  },

  /* 打卡成功时推进连胜（冻结可桥接 1 天缺口） */
  streakUp: function () {
    var d = GX.store.data, s = d.streak, t = GX.util.today();
    /* 自然月补给冻结 */
    var mon = t.slice(0, 7);
    if (s.freezeMonth !== mon) { s.freezeMonth = mon; s.freezes = GX_META.freezePerMonth; }

    var gap = s.last ? GX.util.diffDays(s.last, t) : 1;   /* 首次打卡按 gap=1 处理 */
    if (s.last && gap === 0) return;                       /* 今日已计数 */
    if (gap === 1) s.count++;
    else if (gap === 2 && s.freezes > 0) { s.freezes--; s.count++; }  /* 冻结桥接1天 */
    else s.count = 1;
    s.last = t;
  }
};

/* ---------------- UI 基础 ---------------- */
GX.ui = {
  view: function (html) { document.getElementById("view").innerHTML = html; window.scrollTo(0, 0); },
  /* 跳转：hash 相同也强制重绘（游戏页不走 hash，需显式 render） */
  go: function (hash) {
    if (location.hash === hash) { GX.router.render(); return; }
    location.hash = hash;
  },
  nav: function (active) {
    var links = document.querySelectorAll(".nav a");
    for (var i = 0; i < links.length; i++) links[i].classList.toggle("on", links[i].getAttribute("href") === active);
  },
  /* 三段式分区标题（实测 .section-nav：中文 + 英文 + Impact 序号） */
  secNav: function (cn, en, num, dark) {
    return '<div class="sec-nav' + (dark ? " on-dark" : "") + '">'
      + '<div class="sec-nav-label">' + cn + '</div>'
      + '<div class="sec-nav-en">' + en + '</div>'
      + '<div class="sec-nav-num">' + num + '</div>'
      + '</div>';
  },
  /* 顶栏连胜数字同步 */
  syncTop: function () {
    var el = document.getElementById("streakNum");
    if (el) el.textContent = GX.store.data.streak.count;
  },
  toast: function (msg, cls) {
    var el = document.createElement("div");
    el.className = "toast" + (cls ? " " + cls : "");
    el.innerHTML = "<span>" + GX.util.esc(msg) + "</span>";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2000);
  }
};

/* ---------------- 自定义题库（M3） ---------------- */
/* 导入题目存 localStorage 独立键，启动时合并入 GX_BANK；内置题库文件不被修改 */
GX.CUSTOM_BANK_KEY = "gaoxiang_bank_custom";

GX.loadCustomBank = function () {
  var raw = null;
  try { raw = localStorage.getItem(this.CUSTOM_BANK_KEY); } catch (e) { }
  if (!raw) return [];
  try {
    var arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
};

GX.saveCustomBank = function (arr) {
  try { localStorage.setItem(this.CUSTOM_BANK_KEY, JSON.stringify(arr)); }
  catch (e) { GX.ui.toast("题库保存失败：浏览器存储不可用", "o"); }
};

GX.customBankCount = function () {
  return this.loadCustomBank().length;
};

/* 校验并合并导入题目；id 冲突或非法项跳过 */
GX.importCustomBank = function (arr) {
  var existing = this.loadCustomBank();
  var added = 0, skipped = 0;
  var seen = {};
  existing.forEach(function (q) { seen[q.id] = true; });
  var builtinIds = {};
  for (var ch in GX_BANK.chapters) {
    GX_BANK.chapters[ch].forEach(function (q) { builtinIds[q.id] = true; });
  }

  arr.forEach(function (q, i) {
    if (!q || typeof q !== "object") { skipped++; return; }
    if (typeof q.ch !== "number" || q.ch < 1 || q.ch > 24) { skipped++; return; }
    if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4) { skipped++; return; }
    if (typeof q.ans !== "number" || q.ans < 0 || q.ans > 3) { skipped++; return; }
    if (!q.exp) { skipped++; return; }

    var id = q.id || ("u" + q.ch + "q" + (i + 1) + "_" + Math.random().toString(36).slice(2, 6));
    if (seen[id] || builtinIds[id]) { skipped++; return; }
    seen[id] = true;

    var item = {
      id: id, ch: q.ch, type: "single",
      diff: q.diff || 2,
      tags: Array.isArray(q.tags) ? q.tags : ["导入"],
      q: String(q.q), opts: q.opts.map(String), ans: q.ans, exp: String(q.exp)
    };
    existing.push(item);
    added++;
  });

  this.saveCustomBank(existing);
  this.mergeCustomBank();
  return { added: added, skipped: skipped };
};

/* 把自定义题合并进当前会话的 GX_BANK（先快照内置题，再按快照重建，避免误删内置题） */
GX.mergeCustomBank = function () {
  if (!this._builtinChapters) {
    this._builtinChapters = {};
    for (var ch in GX_BANK.chapters) this._builtinChapters[ch] = GX_BANK.chapters[ch].slice();
  }
  /* 还原为纯内置题库 */
  for (var c2 in GX_BANK.chapters) delete GX_BANK.chapters[c2];
  for (var c3 in this._builtinChapters) GX_BANK.chapters[c3] = this._builtinChapters[c3].slice();

  var custom = this.loadCustomBank();
  custom.forEach(function (q) {
    if (!GX_BANK.chapters[q.ch]) GX_BANK.chapters[q.ch] = [];
    GX_BANK.chapters[q.ch].push(q);
  });
  return custom.length;
};

GX.clearCustomBank = function () {
  var n = this.loadCustomBank().length;
  try { localStorage.removeItem(this.CUSTOM_BANK_KEY); } catch (e) { }
  this.mergeCustomBank();
  return n;
};

/* ---------------- 游戏注册表（M3） ---------------- */
/* 游戏厅/今日页统一从此渲染入口 */
GX.gameList = [
  { key: "monster", name: "考点歼灭",     en: "Concept Hunter", desc: "全题型 · 连击 COMBO",   entry: "GX.games.monster.picker()" },
  { key: "itto",    name: "ITTO 分拣",    en: "ITTO Sorter",    desc: "限时 60s · 三栏分拣",   entry: "GX.games.itto.picker()" },
  { key: "match",   name: "术语配对",     en: "Term Match",     desc: "翻牌 · 记忆强化",       entry: "GX.games.match.picker()" },
  { key: "chain",   name: "流程接龙",     en: "Process Chain",  desc: "排序 · 变更/风险流程",  entry: "GX.games.chain.start()" },
  { key: "boss",    name: "街区 BOSS 战", en: "Block Boss",     desc: "30 题限时 · 通关解锁",  entry: "GX.games.boss.picker()" }
];

/* 街区解锁（M3 双通道）：
   ① 前一街区 BOSS 已通关 → 直接解锁
   ② 前一街区掌握度 ≥60% → 解锁（兼容 M2 进度，作为补充路径） */
GX.mapUnlocked = function (ch) {
  if (ch <= 3) return true;
  var prev = GX.store.data.chapters[ch - 1];
  if (!prev) return false;
  return !!(prev.bossCleared || prev.mastery >= 60);
};

/* ---------------- 导航点击 ---------------- */
/* 游戏页不占用 hash，点导航时 hash 可能不变，需显式中断对局并重绘 */
GX.abortGames = function () {
  ["monster", "itto", "match", "chain", "boss"].forEach(function (k) {
    var g = GX.games[k];
    if (g && g.abort) g.abort();
  });
};

GX.navGo = function (a) {
  var href = a.getAttribute("href");
  GX.abortGames();
  if (location.hash === href) { GX.router.render(); return false; }
  return true;   /* 交由默认 <a> 跳转 */
};

/* ============================================================
 * 页面
 * ============================================================ */
GX.pages = {

  /* ---------- 今日 ---------- */
  today: function () {
    GX.daily.ensure();
    var d = GX.store.data;
    var dd = GX.util.diffDays(GX.util.today(), d.settings.examDate);
    var due = GX.srs.dueList().length;

    var acts = {
      monster: 'onclick="GX.games.monster.picker()"',
      review:  'onclick="GX.games.monster.run({mode:\'review\'})"',
      itto:    'onclick="GX.games.itto.picker()"',
      match:   'onclick="GX.games.match.picker()"',
      chain:   'onclick="GX.games.chain.start()"',
      boss:    'onclick="GX.games.boss.picker()"'
    };
    var taskRow = function (key, done) {
      var names = { monster: "考点歼灭", itto: "ITTO 分拣", match: "术语配对", chain: "流程接龙", boss: "BOSS 挑战" };
      var name = key === "review" ? "错题清扫 ×" + due : names[key];
      return '<div class="' + (done ? "chip on" : "chip") + '" ' + (acts[key] || "") + '>'
        + name + (done ? '<span class="chip-state">✓ 已完成</span>' : '<span class="chip-state">待挑战</span>') + '</div>';
    };

    /* 掌握度摘要（取已作答章节） */
    var played = [];
    for (var ch in d.chapters) {
      var c = d.chapters[ch];
      if (c.newC + c.revC > 0) played.push({ ch: +ch, m: c.mastery });
    }
    played.sort(function (a, b) { return b.m - a.m; });
    var masteryHtml = played.length
      ? played.slice(0, 4).map(function (p) {
          var meta = GX_META.chapters[p.ch - 1] || { name: "CH." + p.ch };
          return '<div style="margin-bottom:12px"><div class="row" style="font-size:12.5px;margin-bottom:5px">'
            + '<span>CH.' + p.ch + ' ' + meta.name + '</span>'
            + '<span style="font-family:var(--font-num);font-size:16px;color:var(--zzz-ink)">' + p.m + '%</span></div>'
            + '<div class="hp"><i style="width:' + p.m + '%"></i></div></div>';
        }).join("")
      : '<p class="muted">还没有战绩，去游戏厅开一局吧</p>';

    var doneCount = d.daily.required.filter(function (r) { return d.daily.done[r]; }).length;

    GX.ui.view(
      '<div class="page">'
      + '<div class="wrap">'

      /* 分区标题：中文 + 英文 + Impact 序号 */
      + GX.ui.secNav("今日任务", "Daily Missions", "01")
      + '<div class="watermark">Today</div>'

      /* 倒计时（黑色 KV 块） */
      + '<div class="battle-stage" style="margin-bottom:18px">'
      + '<div class="skew-block r"></div>'
      + '<div class="tagline" style="color:rgba(255,255,255,.55);position:relative;z-index:1">D-DAY / 距 2027 上半年考试</div>'
      + '<div class="row" style="margin-top:8px;position:relative;z-index:1">'
      + '<span class="num-xl yellow">' + dd + '<small> 天</small></span>'
      + '<button class="btn primary" onclick="GX.ui.go(\'#arcade\')">出击 <span class="arrow">▼</span></button>'
      + '</div></div>'

      /* 今日任务 */
      + '<div class="panel" style="margin-bottom:18px">'
      + '<div class="row" style="margin-bottom:14px">'
      + '<span class="block-tag">Missions ' + doneCount + '/' + d.daily.required.length + '</span>'
      + '<span class="tagline">Daily Check-in</span></div>'
      + '<div class="grid2">'
      + d.daily.required.map(function (k) { return taskRow(k, !!d.daily.done[k]); }).join("")
      + '</div>'
      + (d.daily.completed
          ? '<p class="muted" style="margin-top:12px;color:var(--zzz-ink)">✓ 今日已打卡，连胜延续中</p>'
          : '<p class="muted" style="margin-top:12px">完成 ≥3 项即打卡（连胜冻结余 ' + d.streak.freezes + ' 张）</p>')
      + '</div>'

      /* 掌握度 */
      + '<div class="panel">'
      + '<div class="row" style="margin-bottom:14px">'
      + '<span class="block-tag">Mastery</span>'
      + '<span class="tagline">街区掌握度</span></div>'
      + masteryHtml
      + '</div>'

      + '</div></div>'
    );
    GX.ui.nav("#today");
  },

  /* ---------- 游戏厅 ---------- */
  arcade: function () {
    var cards = GX.gameList.map(function (g) {
      return '<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
        + '<div><div style="font-size:16px;font-weight:700;line-height:1.3">' + g.name + '</div>'
        + '<div class="tagline" style="margin-top:4px">' + g.en + '</div>'
        + '<div class="muted" style="margin-top:5px">' + g.desc + '</div></div>'
        + (g.locked
            ? '<span class="lock-mask">' + g.locked + ' 上线</span>'
            : '<button class="btn primary" onclick="' + g.entry + '">开始</button>')
        + '</div>';
    }).join("");

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("游戏厅", "Arcade", "02")
      + '<div class="watermark">Arcade</div>'
      + '<div class="stack">' + cards + '</div></div></div>'
    );
    GX.ui.nav("#arcade");
  },

  /* ---------- 街区（章节地图） ---------- */
  map: function () {
    var d = GX.store.data;
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("街区地图", "Block Map", "03")
      + '<div class="watermark">Map</div>'
      + '<p class="muted" style="margin-bottom:16px">通关前一街区 BOSS 战即可解锁下一街区（前章掌握度 ≥60% 亦可提前解锁）。</p><div class="stack">';

    GX_META.parts.forEach(function (p, pi) {
      var chs = GX_META.chapters.filter(function (c) { return c.part === p.id; });
      html += '<div class="panel">'
        + '<div class="row" style="margin-bottom:14px">'
        + '<span class="block-tag">' + p.name + '</span>'
        + '<span class="tagline">Part ' + String(pi + 1).padStart(2, "0") + '</span></div>';

      chs.forEach(function (c) {
        var st = d.chapters[c.id];
        var m = st ? st.mastery : 0;
        var cleared = st && st.bossCleared;
        var hasQ = c.enabled && GX_BANK.byChapter(c.id).length > 0;
        var unlocked = hasQ && GX.mapUnlocked(c.id);
        html += '<div style="margin-bottom:14px">'
          + '<div class="row" style="font-size:13.5px;margin-bottom:6px">'
          + '<span style="' + (unlocked ? "" : "opacity:.45") + '">CH.' + c.id + ' ' + c.name
          + (cleared ? ' <span class="tag solid">CLEARED</span>' : '') + '</span>'
          + (unlocked
              ? '<span style="display:flex;gap:6px;flex:none">'
                + '<button class="btn sm" onclick="GX.games.monster.run({chapter:' + c.id + '})">挑战</button>'
                + '<button class="btn sm" onclick="GX.games.boss.run(' + c.id + ')">BOSS</button></span>'
              : '<span class="lock-mask">' + (hasQ ? "CH." + (c.id - 1) + " 未通关" : "题库建设中") + '</span>')
          + '</div>'
          + (unlocked || m > 0 ? '<div class="hp"><i style="width:' + m + '%"></i></div>' : "")
          + '</div>';
      });

      html += '</div>';
    });

    html += '</div></div></div>';
    GX.ui.view(html);
    GX.ui.nav("#map");
  },

  /* ---------- 错题本 ---------- */
  wrong: function () {
    var d = GX.store.data;
    var due = GX.srs.dueList();

    /* 按题型分组：single 单选 / itto 卡片 / chain 流程 */
    var groups = { single: [], itto: [], chain: [] };
    d.wrong.slice().sort(function (a, b) { return a.next < b.next ? -1 : 1; }).forEach(function (w) {
      var t = w.type || "single";
      if (!groups[t]) groups[t] = w.qid.indexOf("fl") === 0 ? "chain" : (w.qid.indexOf("itto") === 0 ? "itto" : "single");
      groups[groups[t]].push(w);
    });

    var groupName = { single: "单选错题", itto: "ITTO 卡片", chain: "流程错题" };
    var groupTag = { single: "ember", itto: "grey", chain: "grey" };

    var sections = ["single", "itto", "chain"].map(function (t) {
      var arr = groups[t];
      if (!arr.length) return "";
      var dueN = arr.filter(function (w) { return w.next <= GX.util.today(); }).length;
      var rows = arr.map(function (w) {
        var q = GX_BANK.get(w.qid);
        var title, sub;
        if (t === "single" && q) {
          title = GX.util.esc(q.q).slice(0, 38) + (q.q.length > 38 ? "…" : "");
          sub = "CH." + q.ch + " " + (GX_META.chapters[q.ch - 1] ? GX_META.chapters[q.ch - 1].name : "") + " · 错 " + w.count + " 次 · 记忆度 " + w.mem + "%";
        } else if (t === "itto") {
          var card = GX_ITTO.cardById(w.qid);
          title = card ? GX.util.esc(card.card) : w.qid;
          sub = "所属过程 · " + (card ? GX.util.esc(card.process) : "?") + " · 错 " + w.count + " 次 · 记忆度 " + w.mem + "%";
        } else {
          var flow = GX_CHAIN.flowById(w.qid);
          title = flow ? GX.util.esc(flow.name) : w.qid;
          sub = "CH." + (flow ? flow.ch : "?") + " · 错 " + w.count + " 次 · 记忆度 " + w.mem + "%";
        }
        var dueNow = w.next <= GX.util.today();
        return '<div class="panel">'
          + '<div class="row" style="font-size:13px;margin-bottom:6px;align-items:flex-start">'
          + '<span style="font-weight:700;flex:1">' + title + '</span>'
          + '<span class="tag ' + (dueNow ? "ember" : "grey") + '">'
          + (dueNow ? "DUE 今日" : w.next.slice(5)) + '</span></div>'
          + '<div class="tagline">' + sub + '</div>'
          + '<div class="hp" style="margin-top:8px"><i style="width:' + w.mem + '%"></i></div>'
          + '</div>';
      }).join("");

      var btn = "";
      if (dueN > 0) {
        if (t === "single") btn = '<button class="btn ember" onclick="GX.games.monster.run({mode:\'review\'})">清扫 ' + dueN + ' 题</button>';
        else if (t === "itto") btn = '<button class="btn ember" onclick="GX.games.itto.runReview()">重分拣 ' + dueN + ' 卡</button>';
        else btn = '<button class="btn ember" onclick="GX.games.chain.runReview()">重接 ' + dueN + ' 条</button>';
      } else btn = '<span class="tag grey">暂无到期</span>';

      return '<div class="panel" style="margin-bottom:16px">'
        + '<div class="row" style="margin-bottom:12px">'
        + '<span class="block-tag">' + groupName[t] + '</span>'
        + '<span class="tag ' + groupTag[t] + '">' + arr.length + ' 题</span></div>'
        + '<div class="row" style="margin-bottom:12px">'
        + '<span class="tagline">在库 ' + arr.length + ' · 到期 ' + dueN + '</span>' + btn + '</div>'
        + '<div class="stack">' + rows + '</div>'
        + '</div>';
    }).join("");

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("错题回收站", "Retry Station", "04")
      + '<div class="watermark">Retry</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row">'
      + '<div><div style="font-size:15px;font-weight:700">' + due.length + ' 题到期</div>'
      + '<div class="tagline" style="margin-top:4px">在库 ' + d.wrong.length + ' 题 · 已回收 ' + d.stats.recovered + ' 题</div></div>'
      + (due.length ? '<button class="btn ember" onclick="GX.games.monster.run({mode:\'review\'})">开始清扫</button>'
                    : '<span class="tag grey">暂无到期</span>')
      + '</div></div>'

      + (sections || '<p class="muted">错题本是空的，先去打怪攒点库存</p>')
      + '</div></div>'
    );
    GX.ui.nav("#wrong");
  },

  /* ---------- 档案 ---------- */
  profile: function () {
    var d = GX.store.data;
    var acc = d.stats.answered ? Math.round(d.stats.correct / d.stats.answered * 100) : 0;
    var avg = 0, cnt = 0;
    for (var ch in d.chapters) { if (d.chapters[ch].newC + d.chapters[ch].revC > 0) { avg += d.chapters[ch].mastery; cnt++; } }
    avg = cnt ? Math.round(avg / cnt) : 0;

    var stat = function (label, val, yellow) {
      return '<div><div class="tagline">' + label + '</div>'
        + '<div style="font-family:var(--font-num);font-size:26px;line-height:1.1;color:'
        + (yellow ? "var(--zzz-yellow)" : "var(--zzz-ink)") + '">' + val + '</div></div>';
    };

    /* ---- 章节全景看板：按分部显示 24 章掌握度 + BOSS 角标 ---- */
    var board = GX_META.parts.map(function (p, pi) {
      var chs = GX_META.chapters.filter(function (c) { return c.part === p.id; });
      var cells = chs.map(function (c) {
        var st = d.chapters[c.id];
        var m = st ? st.mastery : 0;
        var cleared = st && st.bossCleared;
        var unlocked = GX.mapUnlocked(c.id);
        var bg = m >= 80 ? "var(--zzz-yellow)" : m >= 40 ? "rgba(216,250,0,.45)" : m > 0 ? "rgba(216,250,0,.2)" : "rgba(0,0,0,.06)";
        var fg = m >= 40 ? "var(--zzz-ink)" : "var(--zzz-grey)";
        return '<div class="board-cell" style="background:' + bg + ';color:' + fg + '" title="CH.' + c.id + ' ' + c.name + ' · 掌握度 ' + m + '%">'
          + '<span class="bc-no">' + c.id + '</span>'
          + '<span class="bc-pct">' + m + '%</span>'
          + (cleared ? '<span class="bc-flag">✓</span>' : (unlocked ? '' : '<span class="bc-lock">锁</span>'))
          + '</div>';
      }).join("");
      return '<div style="margin-bottom:14px">'
        + '<div class="row" style="margin-bottom:8px"><span class="block-tag">' + p.name + '</span>'
        + '<span class="tagline">Part ' + String(pi + 1).padStart(2, "0") + '</span></div>'
        + '<div class="board-grid">' + cells + '</div></div>';
    }).join("");

    /* ---- 游戏战绩 ---- */
    var gameNames = { monster: "考点歼灭", itto: "ITTO 分拣", match: "术语配对", chain: "流程接龙", boss: "BOSS 战" };
    var games = GX.gameList.map(function (g) {
      var rec = d.stats.games[g.key];
      var plays = rec ? rec.plays : 0;
      var best = rec && rec.best ? rec.best : "—";
      return '<div class="board-game">'
        + '<span class="bg-name">' + g.name + '</span>'
        + '<span class="bg-plays">' + plays + ' 局</span>'
        + '<span class="bg-best ' + (best !== "—" ? "on" : "") + '">' + best + '</span>'
        + '</div>';
    }).join("");

    /* ---- 自定义题库 ---- */
    var customCount = GX.customBankCount();

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("我的档案", "Profile", "05")
      + '<div class="watermark">Profile</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="grid2" style="text-align:center">'
      + stat("累计答题", d.stats.answered, false)
      + stat("正确率", acc + "%", true)
      + stat("当前连胜", "×" + d.streak.count, true)
      + stat("平均掌握度", avg + "%", false)
      + '</div></div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Board</span><span class="tagline">章节全景</span></div>'
      + board
      + '<div class="row" style="margin-top:6px;gap:12px;flex-wrap:wrap">'
      + '<span class="tagline">已通关 BOSS ' + Object.keys(d.chapters).filter(function (k) { return d.chapters[k].bossCleared; }).length + ' / 24</span>'
      + '</div>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Records</span><span class="tagline">游戏战绩</span></div>'
      + '<div class="board-games">' + games + '</div>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Settings</span><span class="tagline">设置</span></div>'
      + '<div class="row"><span style="font-size:13.5px">考试日期</span>'
      + '<input type="date" value="' + d.settings.examDate + '" onchange="GX.pages.setExam(this.value)"></div>'
      + '<div class="divider"></div>'
      + '<div class="row"><span style="font-size:13.5px">连胜冻结余额</span>'
      + '<span style="font-family:var(--font-num);font-size:17px">' + d.streak.freezes + ' / ' + GX_META.freezePerMonth + '</span></div>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Bank</span><span class="tagline">自定义题库</span></div>'
      + '<p class="muted" style="margin-bottom:12px">导入 JSON 格式的题目数组（字段：ch / q / opts[4] / ans / exp），导入后与内置题库合并使用。当前已导入 ' + customCount + ' 题。</p>'
      + '<div class="row" style="gap:10px;flex-wrap:wrap">'
      + '<button class="btn primary" onclick="document.getElementById(\'bankFile\').click()">导入题库</button>'
      + (customCount ? '<button class="btn" onclick="GX.pages.clearBank()">清除导入</button>' : '')
      + '</div>'
      + '<input type="file" id="bankFile" accept=".json" style="display:none" onchange="GX.pages.importBank(this)">'
      + '</div>'

      + '<div class="panel">'
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Data</span><span class="tagline">存档</span></div>'
      + '<p class="muted" style="margin-bottom:12px">进度保存在本浏览器。换设备或清缓存前，请先导出备份。</p>'
      + '<div class="row" style="gap:10px;flex-wrap:wrap">'
      + '<button class="btn primary" onclick="GX.pages.exportSave()">导出备份</button>'
      + '<button class="btn" onclick="document.getElementById(\'impFile\').click()">导入恢复</button>'
      + '<button class="btn ember" onclick="GX.pages.resetAll()">清空重来</button>'
      + '</div>'
      + '<input type="file" id="impFile" accept=".json" style="display:none" onchange="GX.pages.importSave(this)">'
      + '</div>'

      + '<div class="filmstrip" style="margin:22px 0 14px"></div>'
      + '<p class="muted" style="text-align:center">高项电竞社 M3 · 信息系统项目管理师备考 · 2027 上半年</p>'
      + '</div></div>'
    );
    GX.ui.nav("#profile");
  },

  setExam: function (v) {
    if (!v) return;
    GX.store.data.settings.examDate = v;
    GX.store.save();
    GX.ui.toast("考试日期已更新");
    GX.pages.today === null;
    GX.router.render();
  },

  exportSave: function () {
    var blob = new Blob([JSON.stringify(GX.store.data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gaoxiang-backup-" + GX.util.today() + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    GX.ui.toast("备份已导出");
  },

  importSave: function (input) {
    var f = input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var obj = JSON.parse(r.result);
        if (!obj || obj.version !== GX.store.data.version || !obj.settings) throw 0;
        GX.store.data = obj;
        GX.store.save();
        GX.ui.toast("存档已恢复");
        GX.router.render();
      } catch (e) { GX.ui.toast("文件不是有效的存档", "o"); }
      input.value = "";
    };
    r.readAsText(f);
  },

  resetAll: function () {
    if (!confirm("确定清空全部进度？此操作不可恢复（建议先导出备份）")) return;
    GX.store.reset();
    GX.ui.toast("已重置", "o");
    GX.router.render();
  },

  /* ---------- 题库导入 ---------- */
  importBank: function (input) {
    var f = input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var arr = null;
      try {
        var obj = JSON.parse(r.result);
        arr = Array.isArray(obj) ? obj : (obj && Array.isArray(obj.questions) ? obj.questions : null);
        if (!arr) throw 0;
      } catch (e) {
        GX.ui.toast("文件格式不正确：需为题目数组 JSON", "o");
        input.value = "";
        return;
      }
      var res = GX.importCustomBank(arr);
      if (res.added > 0) {
        GX.ui.toast("已导入 " + res.added + " 题（跳过 " + res.skipped + " 题）");
        GX.router.render();
      } else {
        GX.ui.toast("没有可导入的题目（跳过 " + res.skipped + " 题）", "o");
      }
      input.value = "";
    };
    r.readAsText(f);
  },

  clearBank: function () {
    if (!confirm("确定清除已导入的自定义题库？内置题库不受影响。")) return;
    var n = GX.clearCustomBank();
    GX.ui.toast("已清除 " + n + " 道导入题目");
    GX.router.render();
  }
};

/* ---------------- 路由 ---------------- */
GX.router = {
  routes: { "#today": "today", "#arcade": "arcade", "#map": "map", "#wrong": "wrong", "#profile": "profile" },
  render: function () {
    var h = location.hash || "#today";
    var page = this.routes[h];
    if (!page) {
      /* 未知 hash：游戏页旧链接回游戏厅，其余回首页，避免白屏 */
      location.hash = (h.indexOf("#/game-") === 0) ? "#arcade" : "#today";
      return;
    }
    /* 离开游戏视图时中断进行中的对局（游戏页不走 hash，由自身渲染） */
    GX.abortGames();
    GX.daily.ensure();
    GX.pages[page]();
    GX.ui.syncTop();
  }
};

/* ---------------- 启动 ---------------- */
GX.init = function () {
  GX.store.load();
  GX.mergeCustomBank();     /* 合并用户导入的自定义题库 */
  GX.daily.ensure();
  window.addEventListener("hashchange", function () { GX.router.render(); });
  if (!location.hash) location.hash = "#today";
  GX.router.render();
};

document.addEventListener("DOMContentLoaded", GX.init);
