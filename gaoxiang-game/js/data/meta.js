/* ============================================================
 * 高项电竞社 · 数据定义
 * meta.js —— 章节框架与全局元信息
 * 说明：章节名按《信息系统项目管理师教程（第4版）》体系整理，
 *       4 章及以后的名称可在 M2 扩充题库时按教材目录校准。
 * ============================================================ */
window.GX_META = {
  app: { name: "高项电竞社", version: "M1" },

  /* 分部：章节分组 */
  parts: [
    { id: "it",   name: "信息技术街区" },
    { id: "pm",   name: "项目管理街区" },
    { id: "spec", name: "专项管理街区" },
    { id: "law",  name: "法规素养街区" }
  ],

  /* 24 章框架；bank 有题目的章节才可游玩 */
  chapters: [
    { id: 1,  part: "it",   name: "信息化与信息系统",  enabled: true  },
    { id: 2,  part: "it",   name: "现代基础设施与新技术", enabled: true  },
    { id: 3,  part: "it",   name: "信息系统安全",       enabled: true  },
    { id: 4,  part: "it",   name: "软件工程",           enabled: true  },
    { id: 5,  part: "pm",   name: "项目管理概论",       enabled: true  },
    { id: 6,  part: "pm",   name: "项目整体管理",       enabled: true  },
    { id: 7,  part: "pm",   name: "项目范围管理",       enabled: true  },
    { id: 8,  part: "pm",   name: "项目进度管理",       enabled: true  },
    { id: 9,  part: "pm",   name: "项目成本管理",       enabled: true  },
    { id: 10, part: "pm",   name: "项目质量管理",       enabled: true  },
    { id: 11, part: "pm",   name: "项目资源管理",       enabled: false },
    { id: 12, part: "pm",   name: "项目沟通管理",       enabled: false },
    { id: 13, part: "pm",   name: "项目干系人管理",     enabled: false },
    { id: 14, part: "pm",   name: "项目风险管理",       enabled: false },
    { id: 15, part: "pm",   name: "项目采购管理",       enabled: false },
    { id: 16, part: "spec", name: "项目变更管理",       enabled: false },
    { id: 17, part: "spec", name: "项目配置管理",       enabled: false },
    { id: 18, part: "spec", name: "信息系统文档管理",   enabled: false },
    { id: 19, part: "spec", name: "组织级项目管理",     enabled: false },
    { id: 20, part: "spec", name: "项目集与项目组合",   enabled: false },
    { id: 21, part: "law",  name: "法律法规",           enabled: false },
    { id: 22, part: "law",  name: "标准规范",           enabled: false },
    { id: 23, part: "law",  name: "职业道德",           enabled: false },
    { id: 24, part: "law",  name: "前沿与补充专题",     enabled: false }
  ],

  /* 间隔重复周期（天） */
  srsSteps: [1, 2, 4, 7, 15],

  /* 连胜冻结：每月配额 */
  freezePerMonth: 2,

  /* 每日任务（M2：monster + review + itto/match/chain 轮换 2 款，完成 ≥3 项打卡） */
  dailyGames: [
    { key: "monster", name: "考点歼灭" },
    { key: "review",  name: "错题清扫" },
    { key: "itto",    name: "ITTO 分拣" },
    { key: "match",   name: "术语配对" },
    { key: "chain",   name: "流程接龙" },
    { key: "boss",    name: "街区 BOSS 战", locked: "M3" }
  ]
};
