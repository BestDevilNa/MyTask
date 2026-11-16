/* M3 数据自检：24 章题库完整性 + BOSS 判定 + 解锁双通道 + 题库导入 + 错题分型
   运行：node test-m3-data.mjs */
import { createRequire } from "node:module";

global.window = global;
const stubEl = () => ({
  innerHTML: "", style: {}, textContent: "", value: "",
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {}, getAttribute() { return null; }, remove() {},
  appendChild() {}, click() {}, focus() {}
});
global.document = {
  addEventListener: () => {},
  getElementById: () => stubEl(),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => stubEl(),
  body: stubEl()
};
global.location = { hash: "" };
global.scrollTo = () => {};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };

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
require(base + "games/boss.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

/* ---------- 题库 24 章 ---------- */
console.log("[bank 24 chapters]");
const B = window.GX_BANK;
const ids = new Set();
let total = 0, bankOk = true;
for (let ch = 1; ch <= 24; ch++) {
  const list = B.byChapter(ch);
  if (list.length < 30) { bankOk = false; console.log("  ch" + ch + " only " + list.length); }
  list.forEach(q => {
    total++;
    if (ids.has(q.id)) bankOk = false;
    ids.add(q.id);
    if (q.opts.length !== 4 || q.ans < 0 || q.ans > 3 || !q.exp || !q.q || q.ch !== ch || q.type !== "single") bankOk = false;
  });
}
t("ch1-24 每章 ≥30 题，共 " + total + " 题", bankOk);
t("id 全局唯一（" + ids.size + "）", ids.size === total);
t("24 章全部 enabled", GX_META.chapters.filter(c => c.enabled).length === 24);

/* ---------- 术语 24 章 ---------- */
console.log("[terms 24 chapters]");
let termOk = true;
for (let ch = 1; ch <= 24; ch++) {
  const c = GX_TERMS.chapters[ch];
  if (!c || c.pairs.length < 8) { termOk = false; console.log("  ch" + ch + " pairs=" + (c ? c.pairs.length : 0)); }
}
t("ch1-24 每章 ≥8 对术语", termOk);
t("cardById 可查", !!GX_ITTO.cardById("itto101"));
t("flowById 可查", !!GX_CHAIN.flowById("fl01"));

/* ---------- 存档 & 每日任务 ---------- */
console.log("[daily v3]");
GX.store.load();
GX.store.data.daily = { date: "", done: {}, completed: false, required: [] };
GX.daily.ensure();
const req = GX.store.data.daily.required;
t("任务单升级 v3", GX.store.data.daily.v === 3);
t("monster 必含", req.includes("monster"));
t("轮换 2 款小游戏", ["itto", "match", "chain"].filter(k => req.includes(k)).length === 2);
t("含 BOSS 挑战", req.includes("boss"));
t("完成 ≥3 项即打卡", (GX.daily.done("monster"), GX.daily.done(req[1]), GX.daily.done(req[2]), GX.store.data.daily.completed === true));

/* ---------- 解锁双通道 ---------- */
console.log("[unlock dual path]");
GX.store.reset();
GX.store.load();
t("CH.1-3 直接开放", GX.mapUnlocked(1) && GX.mapUnlocked(3));
t("CH.4 默认锁定", GX.mapUnlocked(4) === false);
/* 通道①：BOSS 通关 */
GX.store.data.chapters[3] = { newC: 1, newOk: 1, revC: 0, revOk: 0, mastery: 10, bossCleared: true };
t("前章 BOSS 通关 → CH.4 解锁", GX.mapUnlocked(4) === true);
t("CH.5 仍锁定（CH.4 未通关）", GX.mapUnlocked(5) === false);
/* 通道②：掌握度 ≥60% */
GX.store.data.chapters[4] = { newC: 3, newOk: 2, revC: 0, revOk: 0, mastery: 67 };
t("前章掌握度 67% → CH.5 解锁", GX.mapUnlocked(5) === true);

/* ---------- BOSS 判定 ---------- */
console.log("[boss]");
t("BOSS 常量：30 题 / 25 分钟 / 及格 60%", GX.games.boss.TOTAL === 30 && GX.games.boss.LIMIT === 1500 && GX.games.boss.PASS === 60);
const st = GX.store.data.chapters[1] || (GX.store.data.chapters[1] = { newC: 0, newOk: 0, revC: 0, revOk: 0, mastery: 50 });
st.mastery = 50;
/* idx = 已答题数（result 用 idx 作正确率分母） */
GX.games.boss.state = { ch: 1, qs: [], idx: 20, left: 100, correct: 18, wrong: 2, answered: false, over: false, timerId: null };
GX.games.boss.result();
const c1 = GX.store.data.chapters[1];
t("及格 60% → bossCleared = true", c1.bossCleared === true);
t("首次通关掌握度 +10（50→60）", c1.mastery === 60);
t("通关解锁 CH.2", GX.mapUnlocked(2) === true);
t("BOSS 战绩已记录", GX.store.data.stats.games.boss && GX.store.data.stats.games.boss.plays === 1);

/* 二次通关不重复加成 */
st.mastery = 60;
GX.games.boss.state = { ch: 1, qs: [], idx: 20, left: 100, correct: 20, wrong: 0, answered: false, over: false, timerId: null };
GX.games.boss.result();
t("二次通关不再加成（保持 60）", GX.store.data.chapters[1].mastery === 60);

/* 未及格 */
st.bossCleared = false; st.mastery = 30;
GX.games.boss.state = { ch: 1, qs: [], idx: 10, left: 10, correct: 5, wrong: 5, answered: false, over: false, timerId: null };
GX.games.boss.result();
t("未及格 → 不设 bossCleared", GX.store.data.chapters[1].bossCleared !== true);

/* 提前交卷：即使已答题目全对（正确率 100%）也不算通关 */
GX.store.data.chapters[3] = { newC: 0, newOk: 0, revC: 0, revOk: 0, mastery: 30 };
GX.games.boss.state = { ch: 3, qs: [], idx: 5, left: 1400, correct: 5, wrong: 0, quit: true, answered: false, over: false, timerId: null };
GX.games.boss.result();
t("提前交卷 → 不算通关", GX.store.data.chapters[3].bossCleared !== true);
t("提前交卷 → 不解锁下一街区", GX.mapUnlocked(4) === false);

/* ---------- 游戏战绩 ---------- */
console.log("[records]");
GX.store.reset();
GX.store.load();
GX.stats.recordGame("monster", "B");
GX.stats.recordGame("monster", "A");
GX.stats.recordGame("monster", "F");
const gm = GX.store.data.stats.games.monster;
t("战绩局数累计 = 3", gm.plays === 3);
t("最佳评级保留最高（A）", gm.best === "A");

/* ---------- 题库导入 ---------- */
console.log("[custom bank]");
GX.store.reset();
const before = GX_BANK.byChapter(1).length;
const res = GX.importCustomBank([
  { ch: 1, q: "导入测试题：以下哪项正确？", opts: ["A项", "B项", "C项", "D项"], ans: 2, exp: "导入题解析" },
  { ch: 99, q: "非法章节", opts: ["a", "b", "c", "d"], ans: 0, exp: "x" },
  { ch: 2, q: "选项不足", opts: ["a", "b"], ans: 0, exp: "x" },
  { ch: 2, q: "缺解析", opts: ["a", "b", "c", "d"], ans: 0 }
]);
t("合法题导入 1 道", res.added === 1);
t("非法题跳过 3 道", res.skipped === 3);
t("ch1 题量 +1", GX_BANK.byChapter(1).length === before + 1);
t("导入题可被 get 取到", !!GX_BANK.get(GX_BANK.byChapter(1).slice(-1)[0].id));
t("自定义题计数 = 1", GX.customBankCount() === 1);
/* 重复导入同 id 应跳过 */
const res2 = GX.importCustomBank([
  { id: GX_BANK.byChapter(1).slice(-1)[0].id, ch: 1, q: "重复 id", opts: ["a", "b", "c", "d"], ans: 0, exp: "x" }
]);
t("重复 id 被跳过", res2.added === 0 && res2.skipped === 1);
/* 清除后内置题保留 */
const cleared = GX.clearCustomBank();
t("清除返回数量 1", cleared === 1);
t("清除后 ch1 恢复原题量", GX_BANK.byChapter(1).length === before);
t("清除后内置题仍可取", !!GX_BANK.get("c1q001"));

/* ---------- 错题分型 ---------- */
console.log("[wrong typing]");
GX.store.reset();
GX.store.load();
GX.stats.recordRaw(7, false, "itto201", "itto");
GX.stats.recordRaw(16, false, "fl01", "chain");
GX.stats.recordRaw(1, false, "c1q001", "single");
t("错题本共 3 条", GX.store.data.wrong.length === 3);
const types = GX.store.data.wrong.map(w => w.type).sort().join(",");
t("类型标记为 itto/chain/single", types === "chain,itto,single");
t("错项 mem 初始 40", GX.store.data.wrong.every(w => w.mem === 40));
/* 清扫模式：答对推进周期 */
const w0 = GX.store.data.wrong.find(w => w.qid === "itto201");
w0.next = "2000-01-01";
GX.srs.onCorrect("itto201");
const w0b = GX.store.data.wrong.find(w => w.qid === "itto201");
t("答对后记忆度 +10", w0b && w0b.mem === 50);
t("答对后 next 推后", w0b.next > GX.util.today());
/* dueList 只认到期 */
GX.store.data.wrong.forEach(w => { w.next = "2000-01-01"; });
t("到期队列含全部 3 条", GX.srs.dueList().length === 3);

/* ---------- 游戏注册表 ---------- */
console.log("[registry]");
t("注册表 5 款全部可玩", GX.gameList.length === 5 && GX.gameList.every(g => g.entry && !g.locked));
t("boss 已注册入口", GX.gameList[4].entry === "GX.games.boss.picker()");
t("五款游戏模块均已加载", !!(GX.games.monster && GX.games.itto && GX.games.match && GX.games.chain && GX.games.boss));

/* ---------- 恢复 ---------- */
GX.store.reset();
console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
