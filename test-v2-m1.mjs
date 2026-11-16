/* V2-M1 案例分析单测（node test-v2-m1.mjs） */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

global.window = global;
global.scrollTo = () => {};
const stubEl = () => ({
  innerHTML: "", value: "", style: {}, textContent: "",
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {}, getAttribute() { return null; }, remove() {},
  appendChild() {}, click() {}, focus() {}
});
const els = {};
const el = (id) => { if (!els[id]) els[id] = stubEl(); return els[id]; };
global.document = {
  addEventListener: () => {},
  getElementById: el,
  querySelectorAll: () => [],
  createElement: () => stubEl(),
  body: stubEl()
};
global.location = { hash: "#case" };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, removeItem(k) { delete this._s[k]; } };

const base = new URL("./gaoxiang-game/js/", import.meta.url).pathname;
require(base + "data/meta.js");
require(base + "data/bank.js");
require(base + "data/itto-data.js");
require(base + "data/terms-data.js");
require(base + "data/case-data.js");
require(base + "games/monster.js");
require(base + "games/itto.js");
require(base + "games/match.js");
require(base + "games/chain.js");
require(base + "games/boss.js");
require(base + "games/case.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

const C = GX_CASE;
const CObj = GX.games.case;

console.log("[数据]");
t("案例数 ≥20", C.cases.length >= 20);
t("领域数 =10", C.domains.length === 10);
const per = {};
C.cases.forEach(c => { per[c.domain] = (per[c.domain] || 0) + 1; });
t("每领域 ≥2 个案例", C.domains.every(d => (per[d.key] || 0) >= 2));
const ids = C.cases.map(c => c.id);
t("案例 id 唯一", new Set(ids).size === ids.length);
t("案例 ch 合法且与领域一致", C.cases.every(c => {
  const d = C.domains.find(x => x.key === c.domain);
  return d && c.ch === d.ch && c.ch >= 1 && c.ch <= 24;
}));
t("每个案例 2-3 题", C.cases.every(c => c.questions.length >= 2 && c.questions.length <= 3));
const qids = [];
C.cases.forEach(c => c.questions.forEach(q => qids.push(q.id)));
t("题目 id 唯一", new Set(qids).size === qids.length);
t("题型合法", C.cases.every(c => c.questions.every(q => ["find", "measure", "calc"].includes(q.type))));
t("主观题有 3-5 个采分点", C.cases.every(c => c.questions.filter(q => q.type !== "calc")
  .every(q => Array.isArray(q.points) && q.points.length >= 3 && q.points.length <= 5)));
const calcQs = [];
C.cases.forEach(c => c.questions.forEach(q => { if (q.type === "calc") calcQs.push(q); }));
t("计算题 ≥4", calcQs.length >= 4);
t("计算题答案结构合法", calcQs.every(q => {
  const arr = Array.isArray(q.answer) ? q.answer : [q.answer];
  return arr.every(a => a && typeof a.value === "number" && isFinite(a.value));
}));
t("byDomain 返回所属案例", C.byDomain("scope").every(c => c.domain === "scope"));
t("get 命中与未命中", C.get(C.cases[0].id) === C.cases[0] && C.get("nope") === null);

console.log("[计算判定]");
const calcCase = C.cases.find(c => c.questions.some(q => q.type === "calc"));
const calcIdx = calcCase.questions.findIndex(q => q.type === "calc");
const calcQ = calcCase.questions[calcIdx];
const calcArr = Array.isArray(calcQ.answer) ? calcQ.answer : [calcQ.answer];

CObj.play(calcCase.id);
CObj.state.idx = calcIdx;
els.calc0 && (els.calc0.value = "");
calcArr.forEach((a, i) => { el("calc" + i).value = String(a.value); });
CObj.checkCalc();
t("计算题全对得 100", CObj.state.scores[calcIdx] === 100);

CObj.play(calcCase.id);
CObj.state.idx = calcIdx;
calcArr.forEach((a, i) => { el("calc" + i).value = String(a.value + (a.tol || 0.01) * 10); });
CObj.checkCalc();
t("计算题超容差得 0", CObj.state.scores[calcIdx] === 0);

CObj.play(calcCase.id);
CObj.state.idx = calcIdx;
calcArr.forEach((a, i) => { el("calc" + i).value = String(a.value + (a.tol || 0.01) / 2); });
CObj.checkCalc();
t("计算题容差内得 100", CObj.state.scores[calcIdx] === 100);

console.log("[主观题自评]");
const subjCase = C.cases.find(c => c.questions.some(q => q.type !== "calc"));
const subjIdx = subjCase.questions.findIndex(q => q.type !== "calc");
const subjQ = subjCase.questions[subjIdx];
CObj.play(subjCase.id);
CObj.state.idx = subjIdx;
CObj.state.picked = [];
CObj.state.picked[0] = true;
CObj.selfScore();
t("自评 1 个点得分正确", CObj.state.scores[subjIdx] === Math.round(1 / subjQ.points.length * 100));
CObj.state.picked = subjQ.points.map(() => true);
CObj.selfScore();
t("自评全选得 100", CObj.state.scores[subjIdx] === 100);

console.log("[结算与存档]");
GX.store.load();
CObj.play(calcCase.id);
CObj.state.scores = CObj.state.c.questions.map(() => 100);
CObj.result();
t("attempts +1", GX.store.data.stats.case.attempts === 1);
t("best = 100", GX.store.data.stats.case.best === 100);

CObj.play(calcCase.id);
CObj.state.scores = CObj.state.c.questions.map(() => 40);
CObj.result();
t("低分不覆盖 best", GX.store.data.stats.case.best === 100 && GX.store.data.stats.case.attempts === 2);
t("结算后清空对局", CObj.state === null);

console.log("[AI 批改]");
let called = 0;
global.fetch = () => { called++; return Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: '{"score":80,"hit":["覆盖点"],"miss":["缺失点"],"advice":"补充细节"}' } }] }) }); };
GX.ai.clear();
t("未配置 ready=false", GX.ai.ready() === false);
const noCfg = await GX.ai.grade({ bg: "", q: "", points: [], answer: "", user: "" });
t("未配置不请求且返回 null", noCfg === null && called === 0);

GX.ai.save({ baseURL: "https://api.example.com/v1/", model: "m", apiKey: "sk-test-123" });
t("配置后 ready=true", GX.ai.ready() === true);
const r = await GX.ai.grade({ bg: "背景", q: "问题", points: ["a"], answer: "答案", user: "作答" });
t("AI 返回解析正确", r && r.score === 80 && r.hit[0] === "覆盖点" && r.miss[0] === "缺失点");
t("AI 请求已发出", called === 1);
t("主存档不含密钥", JSON.stringify(GX.store.data).indexOf("sk-test-123") < 0);

global.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
const r2 = await GX.ai.grade({ bg: "", q: "", points: [], answer: "", user: "" });
t("接口非 2xx 返回 null", r2 === null);

global.fetch = () => Promise.reject(new Error("network"));
const r3 = await GX.ai.grade({ bg: "", q: "", points: [], answer: "", user: "" });
t("网络异常返回 null", r3 === null);

console.log("[入口与路由]");
t("路由含 #case", GX.router.routes["#case"] === "case");
t("pages.case 存在", typeof GX.pages.case === "function");
t("gameList 仍为 5 项", GX.gameList.length === 5);
t("case 已注册", !!GX.games.case && typeof GX.games.case.picker === "function");

let html = "";
const origView = GX.ui.view;
GX.ui.view = (h) => { html = h; };
let arcadeErr = null;
try { GX.pages.arcade(); } catch (e) { arcadeErr = e; }
t("游戏厅渲染不抛错", arcadeErr === null);
t("游戏厅含案例分析入口", html.indexOf("案例分析") >= 0 && html.indexOf("#case") >= 0);

CObj.picker();
t("案例列表含十大领域", html.indexOf("范围管理") >= 0 && html.indexOf("干系人管理") >= 0);
GX.ui.view = origView;

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
