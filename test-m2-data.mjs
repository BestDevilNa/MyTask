/* M2 数据自检：题库/ITTO/术语/流程数据完整性 + 每日任务轮换 + 解锁逻辑
   运行：node test-m2-data.mjs */
import { createRequire } from "node:module";

global.window = global;
global.document = { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {} }, remove() {} }), body: { appendChild() {} } };
global.location = { hash: "" };
global.scrollTo = () => {};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } };

const require = createRequire(import.meta.url);
const base = new URL("./gaoxiang-game/js/", import.meta.url).pathname;
require(base + "data/meta.js");
require(base + "data/bank.js");
require(base + "data/itto-data.js");
require(base + "data/terms-data.js");
require(base + "games/monster.js");
require(base + "games/itto.js");
require(base + "games/match.js");
require(base + "games/chain.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

/* ---------- 题库 ---------- */
console.log("[bank]");
const B = window.GX_BANK;
const ids = new Set();
let total = 0, bankOk = true;
for (let ch = 1; ch <= 10; ch++) {
  const list = B.byChapter(ch);
  if (list.length < 30) { bankOk = false; console.log("  ch" + ch + " only " + list.length); }
  list.forEach(q => {
    total++;
    if (ids.has(q.id)) bankOk = false;
    ids.add(q.id);
    if (q.opts.length !== 4 || q.ans < 0 || q.ans > 3 || !q.exp || q.ch !== ch || q.type !== "single") bankOk = false;
  });
}
t("ch1-10 每章 ≥30 题，共 " + total + " 题", bankOk);
t("id 全局唯一（" + ids.size + "）", ids.size === total);
t("get() 可取 M2 新题", B.get("c10q030") && B.get("c4q001") && B.get("c8q013"));

/* ---------- ITTO ---------- */
console.log("[itto]");
const IT = window.GX_ITTO;
t("10 个知识域", IT.domains.length === 10);
const ittoIds = new Set();
let ittoOk = true, ittoTotal = 0;
IT.domains.forEach(d => {
  if (d.cards.length < 10) ittoOk = false;
  if (d.ch < 6 || d.ch > 15) ittoOk = false;
  d.cards.forEach(c => {
    ittoTotal++;
    if (ittoIds.has(c.id)) ittoOk = false;
    ittoIds.add(c.id);
    if (!["input", "tool", "output"].includes(c.cat)) ittoOk = false;
    if (!c.process || !c.card) ittoOk = false;
  });
});
t("每域 ≥10 卡，cat 合法，id 唯一（共 " + ittoTotal + " 张）", ittoOk);
t("byDomain 取域", IT.byDomain("ri").name === "风险管理");
t("mix 抽 20 张", IT.mix(20).length === 20);

/* ---------- 术语配对 ---------- */
console.log("[terms]");
const TM = window.GX_TERMS;
let termOk = true, termTotal = 0;
for (let ch = 1; ch <= 10; ch++) {
  const c = TM.chapters[ch];
  if (!c || c.pairs.length < 8) { termOk = false; console.log("  ch" + ch + " pairs=" + (c ? c.pairs.length : 0)); }
  if (c) { termTotal += c.pairs.length; c.pairs.forEach(p => { if (p.length !== 2 || !p[0] || !p[1]) termOk = false; }); }
}
t("ch1-10 每章 ≥8 对术语（共 " + termTotal + " 对）", termOk);
t("byChapter 抽 8 对", TM.byChapter(9, 8).length === 8);

/* ---------- 流程接龙 ---------- */
console.log("[chain]");
const CH = window.GX_CHAIN;
let chainOk = CH.flows.length >= 12;
const chainIds = new Set();
CH.flows.forEach(f => {
  if (chainIds.has(f.id)) chainOk = false;
  chainIds.add(f.id);
  if (!f.steps || f.steps.length < 4 || !f.name || !f.ch) chainOk = false;
});
t("≥12 条流程，每条 ≥4 步（共 " + CH.flows.length + " 条）", chainOk);
t("pick() 返回流程", !!CH.pick().steps);

/* ---------- 每日任务 M2 轮换 ---------- */
console.log("[daily]");
GX.store.load();
GX.store.data.daily = { date: "", done: {}, completed: false, required: [] };
GX.daily.ensure();
const req = GX.store.data.daily.required;
t("任务单升级 v2", GX.store.data.daily.v === 2);
t("monster 必含", req.includes("monster"));
t("轮换 2 款小游戏", ["itto", "match", "chain"].filter(k => req.includes(k)).length === 2);
t("review 按需出现（当前到期 " + GX.srs.dueList().length + "）",
  (GX.srs.dueList().length > 0) === req.includes("review"));

/* 完成 3 项 → 打卡 */
GX.daily.done("monster");
GX.daily.done(req[1]);
GX.daily.done(req[2]);
t("完成 3 项即打卡", GX.store.data.daily.completed === true && GX.store.data.streak.count >= 1);

/* ---------- 街区解锁 ---------- */
console.log("[unlock]");
t("CH.1-3 直接开放", GX.mapUnlocked(1) && GX.mapUnlocked(3));
t("CH.4 默认锁定（CH.3 掌握度不足）", GX.mapUnlocked(4) === false);
GX.stats.recordRaw(3, true);
GX.stats.recordRaw(3, true);
GX.stats.recordRaw(3, false);
t("CH.3 掌握度 67% → CH.4 解锁", GX.mapUnlocked(4) === true);
t("CH.5 仍锁定", GX.mapUnlocked(5) === false);

/* ---------- 游戏注册表 ---------- */
console.log("[registry]");
t("注册表 5 款（含 boss 锁 M3）", GX.gameList.length === 5 && GX.gameList[4].locked === "M3");
t("4 款可玩游戏均有入口", GX.gameList.slice(0, 4).every(g => g.entry && !g.locked));
t("三款新游戏模块已加载", !!(GX.games.itto && GX.games.match && GX.games.chain));

/* ---------- 恢复存档 ---------- */
GX.store.reset();

console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
