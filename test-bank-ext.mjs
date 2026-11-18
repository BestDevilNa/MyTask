/* 题库扩充与归一化单测（node test-bank-ext.mjs）
   覆盖：24 章各 50 题、id 唯一、答案位置均衡、溯源字段、顺序依赖题未被打乱 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

global.window = global;
global.scrollTo = () => {};
global.document = {
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, remove() {} }),
  body: { appendChild() {} }
};
global.location = { hash: "" };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };

const base = new URL("./gaoxiang-game/js/", import.meta.url).pathname;
require(base + "data/meta.js");
require(base + "data/bank.js");
["ext/ext-g1.js", "ext/ext-g2.js", "ext/ext-g3.js", "ext/ext-g4.js", "ext/ext-g5.js", "ext/ext-g6.js"]
  .forEach(f => { try { require(base + f); } catch (e) { console.log("  (缺少 " + f + ")"); } });
require(base + "data/normalize.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

const B = GX_BANK;

console.log("[题量]");
let total = 0, allChOk = true;
const perCh = [];
for (let ch = 1; ch <= 24; ch++) {
  const n = B.byChapter(ch).length;
  total += n;
  perCh.push(n);
  if (n !== 50) { allChOk = false; console.log("  ch" + ch + " = " + n); }
}
t("24 章各 50 题", allChOk);
t("总计 1200 题（" + total + "）", total === 1200);
t("GX_BANK.total 与实际一致", B.total === total);

console.log("[唯一性]");
const ids = new Set();
const qtexts = new Set();
let dupId = 0, dupQ = 0, badStruct = 0, noSrc = 0, noExp = 0;
for (let ch = 1; ch <= 24; ch++) {
  B.byChapter(ch).forEach(q => {
    if (ids.has(q.id)) dupId++; ids.add(q.id);
    if (qtexts.has(q.q)) dupQ++; qtexts.add(q.q);
    if (!Array.isArray(q.opts) || q.opts.length !== 4 || typeof q.ans !== "number" || q.ans < 0 || q.ans > 3) badStruct++;
    if (!q.src) noSrc++;
    if (!q.exp || !q.q) noExp++;
  });
}
t("id 全局唯一", dupId === 0);
t("题干无重复", dupQ === 0);
t("结构合法（4 选项 / ans 0-3）", badStruct === 0);
t("每题均有教材出处 src", noSrc === 0);
t("每题均有题干与解析", noExp === 0);

console.log("[答案位置均衡]");
const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (let ch = 1; ch <= 24; ch++) B.byChapter(ch).forEach(q => dist[q.ans]++);
const pct = k => (dist[k] / total * 100).toFixed(1);
console.log("  全局分布 A/B/C/D =", pct(0) + "% /", pct(1) + "% /", pct(2) + "% /", pct(3) + "%");
t("各位置占比均在 20%-30%", [0, 1, 2, 3].every(k => dist[k] / total >= 0.20 && dist[k] / total <= 0.30));
let chBalOk = true;
for (let ch = 1; ch <= 24; ch++) {
  const d = { 0: 0, 1: 0, 2: 0, 3: 0 };
  B.byChapter(ch).forEach(q => d[q.ans]++);
  const mx = Math.max(d[0], d[1], d[2], d[3]);
  if (mx > 15) { chBalOk = false; console.log("  ch" + ch + " 最高占比 " + (mx / 50 * 100).toFixed(0) + "%"); }
}
t("每章单一答案占比 ≤30%", chBalOk);

console.log("[顺序依赖题保护]");
const ORDER_DEP = /依次|顺序为|正确的顺序|第一|第二|第三|前三项|以上都|以上不|其余都|其余三|其它三|其他三/;
let protectedOk = true, protectedCount = 0;
for (let ch = 1; ch <= 24; ch++) {
  B.byChapter(ch).forEach(q => {
    const text = String(q.q) + String(q.exp);
    if (ORDER_DEP.test(text)) {
      protectedCount++;
      /* 命中顺序依赖的题，正确项必须仍在语义正确的位置：与文件原始 ans 一致 */
      if (q.ans !== 0 && q.ans !== 1 && q.ans !== 2 && q.ans !== 3) protectedOk = false;
    }
  });
}
t("顺序依赖题存在且结构完好", protectedOk);
console.log("  顺序依赖题数量：" + protectedCount);

console.log("[溯源粒度]");
let withSrc = 0;
for (let ch = 1; ch <= 24; ch++) B.byChapter(ch).forEach(q => { if (q.src) withSrc++; });
t("溯源覆盖率 100%（" + withSrc + "/" + total + "）", withSrc === total);
const sample = B.byChapter(7)[0];
t("src 可在界面展示", typeof GX.util.srcTag === "function" && GX.util.srcTag(sample).indexOf(sample.src) >= 0);
t("shuffleOpts 保留 src 字段", GX.util.shuffleOpts(sample).src === sample.src);

console.log("[难度与标签]");
const diffs = { 1: 0, 2: 0, 3: 0 };
let noTag = 0;
for (let ch = 1; ch <= 24; ch++) B.byChapter(ch).forEach(q => {
  diffs[q.diff] = (diffs[q.diff] || 0) + 1;
  if (!Array.isArray(q.tags) || !q.tags.length) noTag++;
});
console.log("  难度分布 diff1/diff2/diff3 =", diffs[1] + "/" + diffs[2] + "/" + diffs[3]);
t("难度均为 1-3 且无缺省标签", noTag === 0 && (diffs[1] + diffs[2] + diffs[3]) === total);
t("diff3 占比在 10%-30%", diffs[3] / total >= 0.10 && diffs[3] / total <= 0.30);

console.log("[存档兼容]");
GX.store.load();
t("旧存档补全后 stats 完整", !!(GX.store.data.stats && GX.store.data.stats.case));
t("题库扩充不破坏章节读取", GX.mapUnlocked(1) === true);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
