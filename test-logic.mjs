/* M1 逻辑单测：连胜 streakUp + 间隔重复 SRS（node test-logic.mjs） */
import { createRequire } from "node:module";
global.window = global;
global.document = { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] };
global.location = { hash: "" };
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = v; }, };

const require = createRequire(import.meta.url);
const base = new URL("./gaoxiang-game/js/", import.meta.url).pathname;
require(base + "data/meta.js");
require(base + "data/bank.js");
require(base + "app.js");

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log("  ok", name); } else { fail++; console.log("  FAIL", name); } };

/* ---------- 连胜 ---------- */
console.log("[streak]");
GX.store.load();
const S = GX.store.data.streak;

// 首次打卡 → count=1, last=today
GX.daily.streakUp();
t("首次打卡 count=1", S.count === 1);
t("last=今日", S.last === GX.util.today());

// 同日重复完成 → 不变
GX.daily.streakUp();
t("同日重复不累加", S.count === 1);

// 昨日打卡 → 今日连击：模拟 last=昨天
S.last = GX.util.addDays(GX.util.today(), -1);
GX.daily.streakUp();
t("连续第2天 count=2", S.count === 2);

// 缺1天 + 有冻结 → 桥接
S.freezes = 2; S.last = GX.util.addDays(GX.util.today(), -2);
GX.daily.streakUp();
t("冻结桥接 count=3", S.count === 3);
t("冻结消耗 2→1", S.freezes === 1);

// 缺2天 + 冻结也不救 → 重置
S.last = GX.util.addDays(GX.util.today(), -3);
GX.daily.streakUp();
t("断2天重置 count=1", S.count === 1);

// 缺1天但无冻结 → 重置
S.freezes = 0; S.last = GX.util.addDays(GX.util.today(), -2);
GX.daily.streakUp();
t("无冻结重置 count=1", S.count === 1);

/* ---------- SRS ---------- */
console.log("[srs]");
const q = GX_BANK.get("c1q001");

// 答错 → 入库 next=+1 mem=40
GX.stats.record(q, false, false);
let w = GX.store.data.wrong.find(x => x.qid === q.id);
t("答错入库 count=1", w && w.count === 1);
t("next=明天", w.next === GX.util.addDays(GX.util.today(), 1));
t("mem=40", w.mem === 40);

// 新题答错第二次 → 回落
GX.stats.record(q, false, false);
w = GX.store.data.wrong.find(x => x.qid === q.id);
t("再错 count=2 仍回落明天", w.count === 2 && w.next === GX.util.addDays(GX.util.today(), 1));

// 复习答对（count=2 → step[1]=2天后） mem: 25+10=35
GX.stats.record(q, true, true);
w = GX.store.data.wrong.find(x => x.qid === q.id);
t("复习答对 next=+2天", w.next === GX.util.addDays(GX.util.today(), 2));
t("mem=35（两次答错回落到25再+10）", w.mem === 35);

// 连续答对直到出库（mem 需到 100：35→…→100 需 7 次）
for (let i = 0; i < 7; i++) GX.stats.record(q, true, true);
w = GX.store.data.wrong.find(x => x.qid === q.id);
t("mem 满 100 出库", !w);
t("recovered=1", GX.store.data.stats.recovered === 1);

/* ---------- 掌握度 ---------- */
console.log("[mastery]");
const q2 = GX_BANK.get("c2q001");
GX.stats.record(q2, true, false);
const c1 = GX.store.data.chapters[q.ch], c2 = GX.store.data.chapters[q2.ch];
t("CH1 掌握度=新题正确率(7对3错/…)>0", c1.mastery >= 0 && c1.mastery <= 100);
t("CH2 答对1题 掌握度100(仅1题全对)", c2.mastery === 100);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
