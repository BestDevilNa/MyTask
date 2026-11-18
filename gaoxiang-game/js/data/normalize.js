/* ============================================================
 * 高项电竞社 · 题库归一化（normalize.js）
 * 1) 溯源补全：按章回填 src（内置老题无 src，ext 新题自带更精确出处）
 * 2) 答案位置平衡：按章内序数把正确项轮转到 0/1/2/3 四个位置，
 *    使 A/B/C/D 各占约 25%，避免"答案总是 A"的观感。
 *    轮转保持同一题在多次加载间结果一致（确定性，非随机）。
 * ============================================================ */
(function () {
  if (!window.GX_BANK) return;

  /* 章级溯源默认值（细化出处见 docs/superpowers/specs/2026-11-18-bank-source-map.md） */
  var SRC_BY_CH = {
    1: "S1 1-2", 2: "S1 1.2/2.2", 3: "S1 2.1.4/5.4", 4: "S1 5.1-5.3",
    5: "S1 6", 6: "S1 7-8", 7: "S1 9", 8: "S1 10", 9: "S1 11", 10: "S1 12",
    11: "S1 13", 12: "S1 14", 13: "S1 15", 14: "S1 16", 15: "S1 17",
    16: "S1 19", 17: "S1 19", 18: "S1 4.2/5.1", 19: "S1 21-23",
    20: "S1 20", 21: "S1 24", 22: "S1 24", 23: "S1 职业道德", 24: "S2"
  };

  var total = 0;
  /* 顺序依赖题：题干或解析中提到选项先后顺序，轮转会破坏语义，跳过 */
  var ORDER_DEP = /依次|顺序为|正确的顺序|第一|第二|第三|前三项|以上都|以上不|其余都|其余三|其它三|其他三/;

  for (var ch in GX_BANK.chapters) {
    var list = GX_BANK.chapters[ch];
    if (!Array.isArray(list)) continue;
    var n = list.length;
    for (var i = 0; i < n; i++) {
      var q = list[i];
      total++;

      /* 溯源补全 */
      if (!q.src) q.src = SRC_BY_CH[ch] || ("S1 CH." + ch);

      /* 答案位置平衡：把正确项移到第 i%4 位 */
      if (q.type === "single" && Array.isArray(q.opts) && q.opts.length === 4 &&
          typeof q.ans === "number" && q.ans >= 0 && q.ans <= 3) {
        var text = String(q.q) + String(q.exp);
        var target = i % 4;
        if (q.ans !== target && !ORDER_DEP.test(text)) {
          var shift = (q.ans - target + 4) % 4;
          q.opts = q.opts.slice(shift).concat(q.opts.slice(0, shift));
          q.ans = target;
        }
      }
    }
  }

  GX_BANK.total = total;
})();
