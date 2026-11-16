/* M1 战斗流程单测：题池长度 < 10 的清扫局不得崩溃（node test-battle.mjs） */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

global.window = global;
global.scrollTo = () => {};
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
  createElement: () => stubEl(),
  body: stubEl()
};
global.location = { hash: "" };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; } };

const base = new URL("./gaoxiang-game/js/", import.meta.url).pathname;
require(base + "data/meta.js");
require(base + "data/bank.js");
require(base + "games/monster.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

const M = GX.games.monster;

/* 构造一个"只有 2 题到期"的清扫局，走完整流程 */
function buildReview(n) {
  GX.store.load();
  GX.store.data.wrong = [];
  for (let i = 0; i < n; i++) {
    const q = GX_BANK.byChapter(1)[i];
    GX.store.data.wrong.push({ qid: q.id, count: 1, next: "2020-01-01", mem: 40 });
  }
  GX.store.save();
  M.run({ mode: "review" });
  return M.state;
}

console.log("[review 局：题池 < 10]");

/* 2 题局 */
let s = buildReview(2);
t("题池长度=2", s.qs.length === 2);
t("怪物HP按题量缩放(2*4=8)", s.monMax === 8);
t("monMax 字段存在", s.monMax > 0);

/* 逐题作答直到结束，模拟 battle() 的结束判定 */
let idx = 0, crashed = null;
try {
  while (idx < 10) {
    if (idx >= s.qs.length || s.playerHP <= 0 || s.monHP <= 0) break;
    const q = s.qs[idx];
    const right = q.ans === 0;                  // 固定答对
    GX.stats.record(q, right, true);
    s.combo++; s.correct++;
    s.monHP = Math.max(0, s.monHP - (2 + (s.combo >= 3 ? 1 : 0)));
    idx++;
  }
} catch (e) { crashed = e; }
t("2题局作答不崩溃", crashed === null);
t("2题局走到末尾 idx=2", idx === 2);
t("结束后 monHP>0（未提前死）", s.monHP > 0);

/* 结算页可渲染（result() 内部会调 GX.ui.view / toast） */
let html = null;
const origView = GX.ui.view;
GX.ui.view = (h) => { html = h; };
let resultErr = null;
try { M.result(); } catch (e) { resultErr = e; }
GX.ui.view = origView;
t("result() 不抛错", resultErr === null);
t("结算页渲染出评级", html && html.indexOf('class="grade') >= 0);
t("结算页含正确率", html && html.indexOf("正确率") >= 0);

/* 5 题局 */
console.log("[review 局：5 题]");
s = buildReview(5);
t("5题局 怪物HP=14 (min(14, 20))", s.monMax === 14);
idx = 0; crashed = null;
try {
  while (idx < 10) {
    if (idx >= s.qs.length || s.playerHP <= 0 || s.monHP <= 0) break;
    const q = s.qs[idx];
    GX.stats.record(q, q.ans === 0, true);
    s.combo++; s.correct++;
    s.monHP = Math.max(0, s.monHP - (2 + (s.combo >= 3 ? 1 : 0)));
    idx++;
  }
} catch (e) { crashed = e; }
t("5题局作答不崩溃", crashed === null);
t("5题局走完5题", idx === 5);

/* 普通局满 10 题：怪物 30 HP 足以打完 */
console.log("[normal 局：10 题]");
GX.store.load();
M.run({ chapter: 1 });
s = M.state;
t("普通局题池=10", s.qs.length === 10);
t("普通局怪物HP=30", s.monMax === 30);
idx = 0; crashed = null;
try {
  while (idx < 10) {
    if (idx >= s.qs.length || s.playerHP <= 0 || s.monHP <= 0) break;
    const q = s.qs[idx];
    GX.stats.record(q, q.ans === 0, false);
    s.combo++; s.correct++;
    s.monHP = Math.max(0, s.monHP - (2 + (s.combo >= 3 ? 1 : 0)));
    idx++;
  }
} catch (e) { crashed = e; }
t("10题局不崩溃", crashed === null);
t("10题局答满10题", idx === 10);
t("10题全对怪物剩2HP", s.monHP === 2);

/* 路由：未知 hash 重定向；游戏页不占用 hash */
console.log("[router]");
let redirected = null;
let currentHash = "#/game-monster";
Object.defineProperty(global.location, "hash", {
  get() { return currentHash; },
  set(v) { redirected = v; currentHash = v; },
  configurable: true
});
GX.router.render();
t("旧游戏页 hash 重定向到 #arcade", redirected === "#arcade");

/* 游戏页不得自行改 hash（否则会触发 hashchange 弹回游戏厅） */
GX.store.load();
const hashBefore = currentHash;
M.run({ chapter: 1 });
t("run() 不修改 hash", currentHash === hashBefore);
t("run() 后进入战斗状态", M.state && M.state.qs.length === 10);

/* 从战斗视图退出应回到首页并清空状态 */
M.exit();
t("exit() 清空对局状态", M.state === null);
t("exit() 回到 #today", currentHash === "#today");

/* 战斗页点导航：中断对局并重绘（hash 不变时也要生效） */
console.log("[navGo]");
GX.store.load();
M.run({ chapter: 1 });
t("run() 后 inGame=true", M.inGame === true);
currentHash = "#arcade";
let navRendered = 0;
const origRender = GX.router.render;
GX.router.render = function () { navRendered++; return origRender.call(GX.router); };
const fakeA = { getAttribute: () => "#arcade" };
const r = GX.navGo(fakeA);
GX.router.render = origRender;
t("navGo 同 hash 返回 false 并重绘", r === false && navRendered === 1);
t("navGo 中断对局", M.state === null && M.inGame === false);

/* 章节选择页 / 结算页不应被当作战斗视图 */
M.run({ chapter: 1 });
M.picker();
t("章节选择页 inGame=false", M.inGame === false);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
