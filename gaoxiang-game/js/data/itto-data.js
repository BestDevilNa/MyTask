/* ============================================================
 * 高项电竞社 · ITTO 专项数据（M2）
 * itto-data.js —— window.GX_ITTO
 * 卡片结构：{ id, process, card, cat }
 *   cat: input 输入 | tool 工具与技术 | output 输出
 * 知识域对齐《教程（第4版）》十大知识域（PMBOK 第 6 版体系）
 * ch 映射：整合6 范围7 进度8 成本9 质量10 资源11 沟通12 干系人13 风险14 采购15
 * ============================================================ */
window.GX_ITTO = {
  version: 1,

  domains: [

  /* ---------- 整合管理（ch6） ---------- */
  { key: "it", name: "整合管理", ch: 6, cards: [
    { id:"itto101", process:"制定项目章程",   card:"商业论证",           cat:"input"  },
    { id:"itto102", process:"制定项目章程",   card:"专家判断",           cat:"tool"   },
    { id:"itto103", process:"制定项目章程",   card:"项目章程",           cat:"output" },
    { id:"itto104", process:"制定项目管理计划", card:"项目章程",           cat:"input"  },
    { id:"itto105", process:"制定项目管理计划", card:"标杆对照",           cat:"tool"   },
    { id:"itto106", process:"制定项目管理计划", card:"项目管理计划",       cat:"output" },
    { id:"itto107", process:"指导与管理项目工作", card:"项目管理计划",       cat:"input"  },
    { id:"itto108", process:"指导与管理项目工作", card:"可交付成果",         cat:"output" },
    { id:"itto109", process:"管理项目知识",   card:"知识管理",           cat:"tool"   },
    { id:"itto110", process:"管理项目知识",   card:"经验教训登记册",       cat:"output" },
    { id:"itto111", process:"监控项目工作",   card:"工作绩效报告",         cat:"output" },
    { id:"itto112", process:"实施整体变更控制", card:"变更控制工具",        cat:"tool"   },
    { id:"itto113", process:"实施整体变更控制", card:"批准的变更请求",      cat:"output" },
    { id:"itto114", process:"结束项目或阶段", card:"验收的可交付成果",     cat:"input"  },
    { id:"itto115", process:"结束项目或阶段", card:"最终报告",             cat:"output" }
  ]},

  /* ---------- 范围管理（ch7） ---------- */
  { key: "sc", name: "范围管理", ch: 7, cards: [
    { id:"itto201", process:"规划范围管理", card:"范围管理计划",       cat:"output" },
    { id:"itto202", process:"收集需求",     card:"引导（引导式研讨会）", cat:"tool"   },
    { id:"itto203", process:"收集需求",     card:"需求文件",           cat:"output" },
    { id:"itto204", process:"收集需求",     card:"需求跟踪矩阵",       cat:"output" },
    { id:"itto205", process:"定义范围",     card:"需求文件",           cat:"input"  },
    { id:"itto206", process:"定义范围",     card:"项目范围说明书",     cat:"output" },
    { id:"itto207", process:"创建 WBS",     card:"项目范围说明书",     cat:"input"  },
    { id:"itto208", process:"创建 WBS",     card:"分解",               cat:"tool"   },
    { id:"itto209", process:"创建 WBS",     card:"范围基准",           cat:"output" },
    { id:"itto210", process:"确认范围",     card:"核实的可交付成果",   cat:"input"  },
    { id:"itto211", process:"确认范围",     card:"验收的可交付成果",   cat:"output" },
    { id:"itto212", process:"控制范围",     card:"偏差分析",           cat:"tool"   },
    { id:"itto213", process:"控制范围",     card:"工作绩效信息",       cat:"output" }
  ]},

  /* ---------- 进度管理（ch8） ---------- */
  { key: "sd", name: "进度管理", ch: 8, cards: [
    { id:"itto301", process:"定义活动",       card:"活动清单",           cat:"output" },
    { id:"itto302", process:"排列活动顺序",   card:"前导图法（PDM）",     cat:"tool"   },
    { id:"itto303", process:"排列活动顺序",   card:"项目进度网络图",     cat:"output" },
    { id:"itto304", process:"估算持续时间",   card:"三点估算",           cat:"tool"   },
    { id:"itto305", process:"估算持续时间",   card:"持续时间估算",       cat:"output" },
    { id:"itto306", process:"制定进度计划",   card:"关键路径法",         cat:"tool"   },
    { id:"itto307", process:"制定进度计划",   card:"资源优化（平衡/平滑）", cat:"tool" },
    { id:"itto308", process:"制定进度计划",   card:"进度基准",           cat:"output" },
    { id:"itto309", process:"控制进度",       card:"挣值分析",           cat:"tool"   },
    { id:"itto310", process:"控制进度",       card:"进度预测",           cat:"output" },
    { id:"itto311", process:"控制进度",       card:"迭代燃尽图",         cat:"tool"   }
  ]},

  /* ---------- 成本管理（ch9） ---------- */
  { key: "co", name: "成本管理", ch: 9, cards: [
    { id:"itto401", process:"规划成本管理", card:"成本管理计划",   cat:"output" },
    { id:"itto402", process:"估算成本",     card:"类比估算",       cat:"tool"   },
    { id:"itto403", process:"估算成本",     card:"自下而上估算",   cat:"tool"   },
    { id:"itto404", process:"估算成本",     card:"成本估算",       cat:"output" },
    { id:"itto405", process:"估算成本",     card:"风险登记册",     cat:"input"  },
    { id:"itto406", process:"制定预算",     card:"成本汇总",       cat:"tool"   },
    { id:"itto407", process:"制定预算",     card:"成本基准",       cat:"output" },
    { id:"itto408", process:"制定预算",     card:"管理储备",       cat:"input"  },
    { id:"itto409", process:"控制成本",     card:"挣值分析",       cat:"tool"   },
    { id:"itto410", process:"控制成本",     card:"完工尚需绩效指数（TCPI）", cat:"tool" },
    { id:"itto411", process:"控制成本",     card:"成本预测",       cat:"output" },
    { id:"itto412", process:"控制成本",     card:"储备分析",       cat:"tool"   }
  ]},

  /* ---------- 质量管理（ch10） ---------- */
  { key: "qu", name: "质量管理", ch: 10, cards: [
    { id:"itto501", process:"规划质量管理", card:"质量成本（COQ）",    cat:"tool"   },
    { id:"itto502", process:"规划质量管理", card:"标杆对照",           cat:"tool"   },
    { id:"itto503", process:"规划质量管理", card:"质量管理计划",       cat:"output" },
    { id:"itto504", process:"规划质量管理", card:"质量测量指标",       cat:"output" },
    { id:"itto505", process:"管理质量",     card:"质量审计",           cat:"tool"   },
    { id:"itto506", process:"管理质量",     card:"因果图",             cat:"tool"   },
    { id:"itto507", process:"管理质量",     card:"质量报告",           cat:"output" },
    { id:"itto508", process:"管理质量",     card:"测试与评估文件",     cat:"output" },
    { id:"itto509", process:"控制质量",     card:"核查表",             cat:"tool"   },
    { id:"itto510", process:"控制质量",     card:"控制图",             cat:"tool"   },
    { id:"itto511", process:"控制质量",     card:"核实的可交付成果",   cat:"output" },
    { id:"itto512", process:"控制质量",     card:"质量控制测量结果",   cat:"output" }
  ]},

  /* ---------- 资源管理（ch11） ---------- */
  { key: "re", name: "资源管理", ch: 11, cards: [
    { id:"itto601", process:"规划资源管理", card:"组织图和职位描述", cat:"tool"   },
    { id:"itto602", process:"规划资源管理", card:"资源管理计划",     cat:"output" },
    { id:"itto603", process:"规划资源管理", card:"团队章程",         cat:"output" },
    { id:"itto604", process:"估算活动资源", card:"资源需求",         cat:"output" },
    { id:"itto605", process:"估算活动资源", card:"物质资源分解结构", cat:"output" },
    { id:"itto606", process:"获取资源",     card:"预分派",           cat:"tool"   },
    { id:"itto607", process:"获取资源",     card:"虚拟团队",         cat:"tool"   },
    { id:"itto608", process:"获取资源",     card:"项目团队派工单",   cat:"output" },
    { id:"itto609", process:"建设团队",     card:"集中办公",         cat:"tool"   },
    { id:"itto610", process:"建设团队",     card:"认可与奖励",       cat:"tool"   },
    { id:"itto611", process:"建设团队",     card:"团队绩效评价",     cat:"output" },
    { id:"itto612", process:"管理团队",     card:"冲突管理",         cat:"tool"   },
    { id:"itto613", process:"控制资源",     card:"绩效审查",         cat:"tool"   },
    { id:"itto614", process:"控制资源",     card:"工作绩效信息",     cat:"output" }
  ]},

  /* ---------- 沟通管理（ch12） ---------- */
  { key: "cm", name: "沟通管理", ch: 12, cards: [
    { id:"itto701", process:"规划沟通管理", card:"沟通需求分析",     cat:"tool"   },
    { id:"itto702", process:"规划沟通管理", card:"沟通技术",         cat:"tool"   },
    { id:"itto703", process:"规划沟通管理", card:"沟通管理计划",     cat:"output" },
    { id:"itto704", process:"管理沟通",     card:"工作绩效报告",     cat:"input"  },
    { id:"itto705", process:"管理沟通",     card:"项目报告发布",     cat:"tool"   },
    { id:"itto706", process:"管理沟通",     card:"项目沟通记录",     cat:"output" },
    { id:"itto707", process:"监督沟通",     card:"观察和交谈",       cat:"tool"   },
    { id:"itto708", process:"监督沟通",     card:"项目管理信息系统", cat:"tool"   },
    { id:"itto709", process:"监督沟通",     card:"工作绩效信息",     cat:"output" },
    { id:"itto710", process:"规划沟通管理", card:"沟通风格评估",     cat:"tool"   }
  ]},

  /* ---------- 干系人管理（ch13） ---------- */
  { key: "st", name: "干系人管理", ch: 13, cards: [
    { id:"itto801", process:"识别干系人",     card:"项目章程",             cat:"input"  },
    { id:"itto802", process:"识别干系人",     card:"干系人分析（权力利益方格）", cat:"tool" },
    { id:"itto803", process:"识别干系人",     card:"干系人登记册",         cat:"output" },
    { id:"itto804", process:"规划干系人参与", card:"干系人参与度评估矩阵", cat:"tool"   },
    { id:"itto805", process:"规划干系人参与", card:"干系人参与计划",       cat:"output" },
    { id:"itto806", process:"管理干系人参与", card:"沟通技能（反馈）",     cat:"tool"   },
    { id:"itto807", process:"管理干系人参与", card:"变更请求",             cat:"output" },
    { id:"itto808", process:"监督干系人参与", card:"根本原因分析",         cat:"tool"   },
    { id:"itto809", process:"监督干系人参与", card:"工作绩效信息",         cat:"output" },
    { id:"itto810", process:"识别干系人",     card:"问卷和调查",           cat:"tool"   }
  ]},

  /* ---------- 风险管理（ch14） ---------- */
  { key: "ri", name: "风险管理", ch: 14, cards: [
    { id:"itto901", process:"规划风险管理",   card:"风险管理计划",     cat:"output" },
    { id:"itto902", process:"识别风险",       card:"头脑风暴",         cat:"tool"   },
    { id:"itto903", process:"识别风险",       card:"核对单（核对单分析）", cat:"tool" },
    { id:"itto904", process:"识别风险",       card:"风险登记册",       cat:"output" },
    { id:"itto905", process:"定性风险分析",   card:"概率和影响评估",   cat:"tool"   },
    { id:"itto906", process:"定性风险分析",   card:"概率影响矩阵",     cat:"tool"   },
    { id:"itto907", process:"定性风险分析",   card:"风险报告",         cat:"output" },
    { id:"itto908", process:"定量风险分析",   card:"蒙特卡洛分析",     cat:"tool"   },
    { id:"itto909", process:"定量风险分析",   card:"决策树（预期货币价值 EMV）", cat:"tool" },
    { id:"itto910", process:"规划风险应对",   card:"应急计划",         cat:"output" },
    { id:"itto911", process:"实施风险应对",   card:"问题日志",         cat:"output" },
    { id:"itto912", process:"监督风险",       card:"风险审计",         cat:"tool"   },
    { id:"itto913", process:"监督风险",       card:"工作绩效信息",     cat:"output" },
    { id:"itto914", process:"识别风险",       card:"SWOT 分析",        cat:"tool"   }
  ]},

  /* ---------- 采购管理（ch15） ---------- */
  { key: "pu", name: "采购管理", ch: 15, cards: [
    { id:"ittoa01", process:"规划采购管理", card:"自制或外购分析",     cat:"tool"   },
    { id:"ittoa02", process:"规划采购管理", card:"供方选择标准",       cat:"tool"   },
    { id:"ittoa03", process:"规划采购管理", card:"采购管理计划",       cat:"output" },
    { id:"ittoa04", process:"规划采购管理", card:"采购工作说明书（SOW）", cat:"output" },
    { id:"ittoa05", process:"规划采购管理", card:"采购策略",           cat:"output" },
    { id:"ittoa06", process:"实施采购",     card:"广告",               cat:"tool"   },
    { id:"ittoa07", process:"实施采购",     card:"投标人会议",         cat:"tool"   },
    { id:"ittoa08", process:"实施采购",     card:"选中的卖方",         cat:"output" },
    { id:"ittoa09", process:"实施采购",     card:"协议（合同）",       cat:"output" },
    { id:"ittoa10", process:"控制采购",     card:"协议（合同）",       cat:"input"  },
    { id:"ittoa11", process:"控制采购",     card:"检查",               cat:"tool"   },
    { id:"ittoa12", process:"控制采购",     card:"审计",               cat:"tool"   },
    { id:"ittoa13", process:"控制采购",     card:"采购关闭",           cat:"output" }
  ]}
  ],

  /* 按知识域 key 取卡片集 */
  byDomain: function (key) {
    for (var i = 0; i < this.domains.length; i++)
      if (this.domains[i].key === key) return this.domains[i];
    return null;
  },

  /* 混合模式：从全部知识域抽样组牌 */
  mix: function (n) {
    var all = [];
    this.domains.forEach(function (d) { all = all.concat(d.cards); });
    GX.util.shuffle(all);
    return all.slice(0, n || 20);
  }
};
