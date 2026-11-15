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
      chapters: {},            // {ch:{newC,newOk,revC,revOk,mastery}}
      wrong: [],               // [{qid,count,next,mem}]
      stats: { answered: 0, correct: 0, recovered: 0 }
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
  }
};

/* ---------------- 每日任务 & 连胜 ---------------- */
GX.daily = {
  /* 新的一天：重置任务、计算当日必做项 */
  ensure: function () {
    var d = GX.store.data, t = GX.util.today();
    if (d.daily.date === t) return;
    var required = ["monster"];
    if (GX.srs.dueList().length > 0) required.push("review");
    d.daily = { date: t, done: {}, completed: false, required: required };
    GX.store.save();
  },

  done: function (key) {
    var d = GX.store.data;
    d.daily.done[key] = true;
    if (!d.daily.completed) {
      var all = d.daily.required.every(function (r) { return d.daily.done[r]; });
      if (all) {
        d.daily.completed = true;
        this.streakUp();
        GX.ui.toast("今日任务全部完成！STREAK ×" + d.streak.count);
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

/* ---------------- 导航点击 ---------------- */
/* 战斗页不占用 hash，点导航时 hash 可能不变，需显式中断对局并重绘 */
GX.navGo = function (a) {
  var href = a.getAttribute("href");
  /* 中断进行中的对局 */
  if (GX.games.monster && GX.games.monster.state) {
    GX.games.monster.state = null;
    GX.games.monster.inGame = false;
  }
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

    var taskRow = function (key, name, done, locked) {
      var cls = locked ? "chip locked" : (done ? "chip on" : "chip");
      var state = locked ? '<span class="lock-mask">M2 上线</span>'
                 : done ? '<span class="chip-state">✓ 已完成</span>'
                 : '<span class="chip-state">待挑战</span>';
      var act = "";
      if (!locked) {
        if (key === "monster") act = 'onclick="GX.games.monster.picker()"';
        if (key === "review") act = 'onclick="GX.games.monster.run({mode:\'review\'})"';
      }
      return '<div class="' + cls + '" ' + act + '>' + name + state + '</div>';
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
      + taskRow("monster", "考点歼灭", d.daily.done.monster, false)
      + (due > 0 ? taskRow("review", "错题清扫 ×" + due, d.daily.done.review, false) : "")
      + taskRow("itto", "ITTO 分拣", false, true)
      + taskRow("match", "术语配对", false, true)
      + '</div>'
      + (d.daily.completed
          ? '<p class="muted" style="margin-top:12px;color:var(--zzz-ink)">✓ 今日已打卡，连胜延续中</p>'
          : '<p class="muted" style="margin-top:12px">完成全部可完成任务即打卡（连胜冻结余 ' + d.streak.freezes + ' 张）</p>')
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
    var game = function (name, en, desc, runnable, cls) {
      return '<div class="panel" style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
        + '<div><div style="font-size:16px;font-weight:700;line-height:1.3">' + name + '</div>'
        + '<div class="tagline" style="margin-top:4px">' + en + '</div>'
        + '<div class="muted" style="margin-top:5px">' + desc + '</div></div>'
        + (runnable ? '<button class="btn primary" onclick="GX.games.monster.picker()">开始</button>'
                    : '<span class="lock-mask">' + cls + ' 上线</span>')
        + '</div>';
    };
    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("游戏厅", "Arcade", "02")
      + '<div class="watermark">Arcade</div>'
      + '<div class="stack">'
      + game("考点歼灭", "Concept Hunter", "全题型 · 连击 COMBO", true, "")
      + game("ITTO 分拣", "ITTO Sorter", "限时 60s · 三栏分拣", false, "M2")
      + game("术语配对", "Term Match", "翻牌 · 记忆强化", false, "M2")
      + game("流程接龙", "Process Chain", "排序 · 变更/风险流程", false, "M3")
      + game("街区 BOSS 战", "Block Boss", "30 题限时 · 通关解锁", false, "M3")
      + '</div></div></div>'
    );
    GX.ui.nav("#arcade");
  },

  /* ---------- 街区（章节地图） ---------- */
  map: function () {
    var d = GX.store.data;
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("街区地图", "Block Map", "03")
      + '<div class="watermark">Map</div>'
      + '<p class="muted" style="margin-bottom:16px">M1 开放 CH.1-3 街区，后续章节随题库扩充解锁。</p><div class="stack">';

    GX_META.parts.forEach(function (p, pi) {
      var chs = GX_META.chapters.filter(function (c) { return c.part === p.id; });
      html += '<div class="panel">'
        + '<div class="row" style="margin-bottom:14px">'
        + '<span class="block-tag">' + p.name + '</span>'
        + '<span class="tagline">Part ' + String(pi + 1).padStart(2, "0") + '</span></div>';

      chs.forEach(function (c) {
        var st = d.chapters[c.id];
        var m = st ? st.mastery : 0;
        var playable = c.enabled && GX_BANK.byChapter(c.id).length > 0;
        html += '<div style="margin-bottom:14px">'
          + '<div class="row" style="font-size:13.5px;margin-bottom:6px">'
          + '<span style="' + (playable ? "" : "opacity:.45") + '">CH.' + c.id + ' ' + c.name + '</span>'
          + (playable
              ? '<button class="btn sm" onclick="GX.games.monster.run({chapter:' + c.id + '})">挑战</button>'
              : '<span class="lock-mask">题库 M2</span>')
          + '</div>'
          + (playable || m > 0 ? '<div class="hp"><i style="width:' + m + '%"></i></div>' : "")
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

    var list = d.wrong.slice().sort(function (a, b) { return a.next < b.next ? -1 : 1; });
    var rows = list.map(function (w) {
      var q = GX_BANK.get(w.qid);
      if (!q) return "";
      var dueNow = w.next <= GX.util.today();
      return '<div class="panel">'
        + '<div class="row" style="font-size:13px;margin-bottom:6px;align-items:flex-start">'
        + '<span style="font-weight:700;flex:1">' + GX.util.esc(q.q).slice(0, 38) + (q.q.length > 38 ? "…" : "") + '</span>'
        + '<span class="tag ' + (dueNow ? "ember" : "grey") + '">'
        + (dueNow ? "DUE 今日" : w.next.slice(5)) + '</span></div>'
        + '<div class="tagline">CH.' + q.ch + ' ' + (GX_META.chapters[q.ch - 1] ? GX_META.chapters[q.ch - 1].name : "") + ' · 错 ' + w.count + ' 次 · 记忆度 ' + w.mem + '%</div>'
        + '<div class="hp" style="margin-top:8px"><i style="width:' + w.mem + '%"></i></div>'
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

      + '<div class="stack">'
      + (list.length ? rows : '<p class="muted">错题本是空的，先去打怪攒点库存</p>')
      + '</div></div></div>'
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
      + '<div class="row" style="margin-bottom:14px"><span class="block-tag">Settings</span><span class="tagline">设置</span></div>'
      + '<div class="row"><span style="font-size:13.5px">考试日期</span>'
      + '<input type="date" value="' + d.settings.examDate + '" onchange="GX.pages.setExam(this.value)"></div>'
      + '<div class="divider"></div>'
      + '<div class="row"><span style="font-size:13.5px">连胜冻结余额</span>'
      + '<span style="font-family:var(--font-num);font-size:17px">' + d.streak.freezes + ' / ' + GX_META.freezePerMonth + '</span></div>'
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
      + '<p class="muted" style="text-align:center">高项电竞社 M1 · 信息系统项目管理师备考 · 2027 上半年</p>'
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
    /* 离开游戏视图时清空对局状态（游戏页不走 hash，由自身渲染） */
    if (GX.games.monster && GX.games.monster.state) {
      if (page !== "arcade" || !GX.games.monster.inGame) {
        GX.games.monster.state = null;
        GX.games.monster.inGame = false;
      }
    }
    GX.daily.ensure();
    GX.pages[page]();
    GX.ui.syncTop();
  }
};

/* ---------------- 启动 ---------------- */
GX.init = function () {
  GX.store.load();
  GX.daily.ensure();
  window.addEventListener("hashchange", function () { GX.router.render(); });
  if (!location.hash) location.hash = "#today";
  GX.router.render();
};

document.addEventListener("DOMContentLoaded", GX.init);
