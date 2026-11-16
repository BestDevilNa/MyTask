/* ============================================================
 * 高项电竞社 · 训练模块 —— 案例分析（case）
 * 规则（V2-M1）：
 *   找错 / 措施：采分点自评（勾选数 / 总数）
 *   计算：数值输入 + 容差判定（全对 100，否则 0）
 *   可选 AI 批改主观题（默认关闭，失败降级自评）
 *   案例得分 = 各题均值，写入 stats.case
 * ============================================================ */
window.GX = window.GX || {};
GX.games = GX.games || {};

GX.games.case = {
  state: null,

  /* ---------- 选择页 ---------- */
  picker: function () {
    this.abort();
    var st = GX.store.data.stats.case || { attempts: 0, best: 0 };
    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("案例分析", "Case Study", "06")
      + '<div class="watermark">Case</div>'
      + '<p class="muted" style="margin-bottom:16px">找错 / 措施 / 计算三类题。主观题按采分点自评，计算题自动判定；配置 AI 后可批改主观题作答。</p>'
      + '<div class="panel" style="margin-bottom:16px"><div class="row">'
      + '<span class="block-tag">Records</span>'
      + '<span class="tagline">已练 ' + st.attempts + ' 次 · 最佳 ' + st.best + '%</span>'
      + '</div></div>'
      + '<div class="stack">';

    GX_CASE.domains.forEach(function (d) {
      var cs = GX_CASE.byDomain(d.key);
      if (!cs.length) return;
      html += '<div class="panel">'
        + '<div class="row"><span class="block-tag">' + GX.util.esc(d.name) + '</span>'
        + '<span class="tagline">CH.' + d.ch + ' · ' + cs.length + ' 案例</span></div>';
      cs.forEach(function (c) {
        html += '<div class="row" style="margin-top:12px;align-items:flex-start">'
          + '<div style="flex:1"><div style="font-size:14.5px;font-weight:700;line-height:1.4">' + GX.util.esc(c.title) + '</div>'
          + '<div class="tagline" style="margin-top:4px">' + c.questions.length + ' 题 · '
          + (c.questions.some(function (q) { return q.type === "calc"; }) ? "含计算" : "主观题") + '</div></div>'
          + '<button class="btn primary sm" onclick="GX.games.case.play(\'' + c.id + '\')">开始</button>'
          + '</div>';
      });
      html += '</div>';
    });

    html += '</div></div></div>';
    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 开始案例 ---------- */
  play: function (id) {
    var c = GX_CASE.get(id);
    if (!c) { GX.ui.toast("案例不存在", "o"); return; }
    this.state = { c: c, idx: 0, scores: [], picked: [], text: "", aiResult: null, aiBusy: false };
    this.renderQuestion();
  },

  /* ---------- 单题渲染 ---------- */
  renderQuestion: function () {
    var s = this.state;
    if (!s) return;
    if (s.idx >= s.c.questions.length) { this.result(); return; }

    var c = s.c, q = c.questions[s.idx];
    var typeName = { find: "找错", measure: "措施", calc: "计算" }[q.type] || q.type;
    var domain = null;
    GX_CASE.domains.forEach(function (d) { if (d.key === c.domain) domain = d; });

    var html = '<div class="page"><div class="wrap">'
      + GX.ui.secNav("案例 · " + c.title, "Case Study", String(s.idx + 1).padStart(2, "0"))
      + '<div class="watermark">Case</div>'

      + '<div class="row" style="margin-bottom:12px">'
      + '<span class="block-tag">' + (domain ? GX.util.esc(domain.name) : "案例") + '</span>'
      + '<span class="tagline">CH.' + c.ch + ' · Question ' + (s.idx + 1) + ' / ' + c.questions.length + '</span>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:14px">'
      + '<div class="row" style="margin-bottom:8px"><span class="tagline">案例背景</span>'
      + '<span class="tag grey">' + GX.util.esc(c.title) + '</span></div>'
      + '<div class="case-bg">' + GX.util.esc(c.bg) + '</div>'
      + '</div>'

      + '<div class="panel" style="margin-bottom:14px">'
      + '<div class="row" style="margin-bottom:10px">'
      + '<span class="tag ember">' + typeName + '</span>'
      + '<span class="tagline">Question ' + String(s.idx + 1).padStart(2, "0") + '</span></div>'
      + '<div class="q-card"><span class="qno">' + (s.idx + 1) + '.</span>' + GX.util.esc(q.q) + '</div>'
      + '<div style="margin-top:14px">' + this.answerArea(q) + '</div>'
      + '</div>'

      + '<div id="caseBox"></div>'
      + '</div></div>';

    GX.ui.view(html);
    GX.ui.nav("");
  },

  /* ---------- 作答区 ---------- */
  answerArea: function (q) {
    if (q.type === "calc") {
      var arr = Array.isArray(q.answer) ? q.answer : [q.answer];
      var rows = arr.map(function (a, i) {
        return '<div class="case-calc-row">'
          + '<span class="tagline" style="min-width:52px">' + GX.util.esc(a.label || ("空" + (i + 1))) + '</span>'
          + '<input type="text" id="calc' + i + '" placeholder="输入数值" inputmode="decimal">'
          + (a.unit ? '<span class="tagline">' + GX.util.esc(a.unit) + '</span>' : '')
          + '</div>';
      }).join("");
      return rows
        + '<div style="text-align:right;margin-top:6px">'
        + '<button class="btn primary" onclick="GX.games.case.checkCalc()">判定</button></div>';
    }
    return '<textarea id="caseInput" class="case-input" rows="6" placeholder="写下你的作答要点…"></textarea>'
      + '<div style="text-align:right;margin-top:10px">'
      + '<button class="btn primary" onclick="GX.games.case.reveal()">提交答案，展开采分点</button></div>';
  },

  /* ---------- 主观题：展开采分点自评 ---------- */
  reveal: function () {
    var s = this.state;
    if (!s) return;
    var ta = document.getElementById("caseInput");
    s.text = ta ? ta.value : "";
    s.picked = [];
    s.aiResult = null;

    var q = s.c.questions[s.idx];
    var box = document.getElementById("caseBox");
    if (!box) return;

    var list = q.points.map(function (p, i) {
      return '<label class="case-point">'
        + '<input type="checkbox" data-i="' + i + '" onchange="GX.games.case.pick(' + i + ', this.checked)">'
        + '<span>' + GX.util.esc(p) + '</span></label>';
    }).join("");

    box.innerHTML = '<div class="panel">'
      + '<div class="row" style="margin-bottom:10px"><span class="tagline">采分点自评</span>'
      + '<span class="tag grey">勾选你已覆盖的点</span></div>'
      + '<div class="case-points">' + list + '</div>'
      + '<div class="row" style="margin-top:14px;gap:10px;flex-wrap:wrap;justify-content:flex-end">'
      + (GX.ai && GX.ai.ready() ? '<button class="btn" onclick="GX.games.case.gradeAI()">AI 批改</button>' : '')
      + '<button class="btn primary" onclick="GX.games.case.selfScore()">提交自评</button>'
      + '</div><div id="aiBox" style="margin-top:12px"></div></div>';
  },

  pick: function (i, on) {
    var s = this.state;
    if (!s) return;
    s.picked[i] = !!on;
  },

  /* ---------- 主观题：自评得分 ---------- */
  selfScore: function () {
    var s = this.state;
    if (!s) return;
    var q = s.c.questions[s.idx];
    var picked = 0;
    (s.picked || []).forEach(function (v) { if (v) picked++; });
    var score = q.points.length ? Math.round(picked / q.points.length * 100) : 0;
    s.scores[s.idx] = score;
    this.showAnswer(score);
  },

  /* ---------- 计算题判定 ---------- */
  checkCalc: function () {
    var s = this.state;
    if (!s) return;
    var q = s.c.questions[s.idx];
    var arr = Array.isArray(q.answer) ? q.answer : [q.answer];
    var allRight = true;
    var rows = arr.map(function (a, i) {
      var el = document.getElementById("calc" + i);
      var v = el ? parseFloat(el.value) : NaN;
      var tol = (typeof a.tol === "number") ? a.tol : 0.01;
      var ok = isFinite(v) && Math.abs(v - a.value) <= tol;
      if (!ok) allRight = false;
      return '<div class="row" style="font-size:13px;margin-bottom:6px">'
        + '<span style="flex:1">' + GX.util.esc(a.label || ("空" + (i + 1))) + '</span>'
        + '<span class="tag ' + (ok ? "solid" : "ember") + '">'
        + (ok ? "✓ 正确" : "✗ 应为 " + a.value) + '</span></div>';
    }).join("");

    var score = allRight ? 100 : 0;
    s.scores[s.idx] = score;

    var box = document.getElementById("caseBox");
    if (!box) return;
    var steps = (q.steps || []).map(function (t) {
      return '<div class="case-step">' + GX.util.esc(t) + '</div>';
    }).join("");
    box.innerHTML = '<div class="panel">'
      + '<div class="row" style="margin-bottom:10px"><span class="block-tag">本题 ' + score + ' 分</span>'
      + '<span class="tag ' + (allRight ? "solid" : "ember") + '">' + (allRight ? "全部正确" : "未全对") + '</span></div>'
      + rows
      + (steps ? '<div class="divider"></div><div class="tagline" style="margin-bottom:6px">计算过程</div>' + steps : "")
      + (q.exp ? '<div class="exp-box" style="margin-top:12px"><b>解析</b> ' + GX.util.esc(q.exp) + '</div>' : "")
      + '<div style="text-align:right;margin-top:14px">'
      + '<button class="btn primary" onclick="GX.games.case.next()">'
      + (s.idx + 1 >= s.c.questions.length ? "查看结算 ▼" : "下一题 ▼") + '</button></div></div>';
  },

  /* ---------- 主观题：展示答案与得分 ---------- */
  showAnswer: function (score) {
    var s = this.state;
    if (!s) return;
    var q = s.c.questions[s.idx];
    var box = document.getElementById("caseBox");
    if (!box) return;

    var pts = q.points.map(function (p, i) {
      var ok = !!(s.picked && s.picked[i]);
      return '<div class="case-point">'
        + '<span class="case-mark ' + (ok ? "on" : "") + '">' + (ok ? "✓" : "○") + '</span>'
        + '<span>' + GX.util.esc(p) + '</span></div>';
    }).join("");

    box.innerHTML = '<div class="panel">'
      + '<div class="row" style="margin-bottom:10px"><span class="block-tag">本题 ' + score + ' 分</span>'
      + '<span class="tagline">已覆盖 ' + (s.picked || []).filter(Boolean).length + ' / ' + q.points.length + ' 个采分点</span></div>'
      + '<div class="case-points">' + pts + '</div>'
      + (this.aiHtml(s.aiResult))
      + '<div class="divider"></div>'
      + '<div class="tagline" style="margin-bottom:6px">参考答案</div>'
      + '<div class="case-answer">' + GX.util.esc(q.answer || "") + '</div>'
      + (q.exp ? '<div class="exp-box" style="margin-top:12px"><b>解析</b> ' + GX.util.esc(q.exp) + '</div>' : "")
      + '<div style="text-align:right;margin-top:14px">'
      + '<button class="btn primary" onclick="GX.games.case.next()">'
      + (s.idx + 1 >= s.c.questions.length ? "查看结算 ▼" : "下一题 ▼") + '</button></div></div>';
  },

  /* ---------- AI 批改 ---------- */
  gradeAI: function () {
    var s = this.state;
    if (!s || s.aiBusy) return;
    var q = s.c.questions[s.idx];
    var aiBox = document.getElementById("aiBox");
    s.aiBusy = true;
    if (aiBox) aiBox.innerHTML = '<p class="muted">AI 批改中…（失败会自动降级为自评）</p>';

    var self = this;
    GX.ai.grade({
      bg: s.c.bg, q: q.q, points: q.points, answer: q.answer, user: s.text || ""
    }).then(function (r) {
      s.aiBusy = false;
      if (!r) {
        if (aiBox) aiBox.innerHTML = '<p class="muted">AI 批改失败，请直接用采分点自评。</p>';
        return;
      }
      s.aiResult = r;
      s.scores[s.idx] = r.score;
      if (aiBox) aiBox.innerHTML = self.aiHtml(r);
      GX.ui.toast("AI 批改完成：" + r.score + " 分");
    });
  },

  aiHtml: function (r) {
    if (!r) return "";
    var hit = (r.hit || []).map(function (t) { return '<span class="tag solid">' + GX.util.esc(t) + '</span>'; }).join(" ");
    var miss = (r.miss || []).map(function (t) { return '<span class="tag ember">' + GX.util.esc(t) + '</span>'; }).join(" ");
    return '<div class="ai-box" style="margin-top:12px">'
      + '<div class="row" style="margin-bottom:8px"><span class="block-tag">AI ' + r.score + ' 分</span>'
      + '<span class="tagline">仅供参考</span></div>'
      + (hit ? '<div style="margin-bottom:6px">已覆盖 ' + hit + '</div>' : "")
      + (miss ? '<div style="margin-bottom:6px">缺失 ' + miss + '</div>' : "")
      + (r.advice ? '<div class="tagline" style="line-height:1.7">' + GX.util.esc(r.advice) + '</div>' : "")
      + '</div>';
  },

  /* ---------- 下一题 / 结算 ---------- */
  next: function () {
    var s = this.state;
    if (!s) return;
    s.idx++;
    s.picked = [];
    s.text = "";
    s.aiResult = null;
    if (s.idx >= s.c.questions.length) this.result();
    else this.renderQuestion();
  },

  abort: function () { this.state = null; },

  exit: function () {
    this.abort();
    GX.ui.go("#arcade");
  },

  result: function () {
    var s = this.state;
    if (!s) return;
    var c = s.c;
    var n = c.questions.length;
    var total = 0;
    for (var i = 0; i < n; i++) total += (s.scores[i] || 0);
    var score = Math.round(total / n);

    var d = GX.store.data;
    d.stats.case = d.stats.case || { attempts: 0, best: 0 };
    d.stats.case.attempts++;
    if (score > d.stats.case.best) d.stats.case.best = score;
    GX.store.save();

    var grade = score >= 85 ? "S" : score >= 70 ? "A" : score >= 60 ? "B" : "F";
    var msg = {
      S: "采分点覆盖完整，答题结构清晰",
      A: "主要采分点已命中，注意补足细节",
      B: "勉强及格，回到案例背景重新梳理",
      F: "失分较多，先看参考答案与解析"
    }[grade];

    var lines = c.questions.map(function (q, idx) {
      return '<div class="row" style="font-size:13px;margin-bottom:6px">'
        + '<span style="flex:1">Q' + (idx + 1) + ' · ' + (q.type === "calc" ? "计算" : q.type === "find" ? "找错" : "措施") + '</span>'
        + '<span class="tag ' + ((s.scores[idx] || 0) >= 60 ? "solid" : "ember") + '">' + (s.scores[idx] || 0) + ' 分</span></div>';
    }).join("");

    this.state = null;

    GX.ui.view(
      '<div class="page"><div class="wrap">'
      + GX.ui.secNav("案例结算", "Result", grade)
      + '<div class="watermark">Result</div>'
      + '<div class="battle-stage" style="margin-bottom:16px;text-align:center">'
      + '<div class="skew-block r"></div><div class="skew-block l"></div>'
      + '<div class="grade ' + (grade === "F" ? "b" : grade === "S" ? "s" : "a") + '" style="position:relative;z-index:1">' + grade + '</div>'
      + '<p style="margin-top:12px;font-size:14px;position:relative;z-index:1">' + msg + '</p>'
      + '<div class="divider" style="border-top-color:rgba(255,255,255,.14);margin:16px 0"></div>'
      + '<div class="grid2" style="text-align:center;position:relative;z-index:1">'
      + '<div><div class="tagline" style="color:rgba(255,255,255,.55)">案例得分</div>'
      + '<div style="font-family:var(--font-num);font-size:30px;line-height:1.1;color:var(--zzz-yellow)">' + score + '%</div></div>'
      + '<div><div class="tagline" style="color:rgba(255,255,255,.55)">历史最佳</div>'
      + '<div style="font-family:var(--font-num);font-size:24px;line-height:1.3;color:#fff">' + d.stats.case.best + '%</div></div>'
      + '</div></div>'
      + '<div class="panel" style="margin-bottom:16px">'
      + '<div class="row" style="margin-bottom:12px"><span class="block-tag">' + GX.util.esc(c.title) + '</span>'
      + '<span class="tagline">CH.' + c.ch + '</span></div>'
      + lines
      + '</div>'
      + '<div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">'
      + '<button class="btn" onclick="GX.games.case.play(\'' + c.id + '\')">重做本案例</button>'
      + '<button class="btn" onclick="GX.games.case.picker()">返回案例列表</button>'
      + '<button class="btn primary" onclick="GX.games.case.exit()">回游戏厅</button>'
      + '</div>'
      + '</div></div>'
    );
    GX.ui.nav("");
    GX.ui.toast(score >= 60 ? "案例完成：+" + score + "%" : "案例完成：" + score + "%（未及格）");
  }
};
