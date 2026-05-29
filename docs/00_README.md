# 大唐长安·重构方案文档索引

> 当前阶段: **Phase 0 — 设计共识**
> 这是一次主重构, 把现有"一亩三分地"的 120×160 单体场景, 扩为有据可考的 1000×1000 唐长安网格世界。

## 文档清单

| # | 文件 | 用途 |
| --- | --- | --- |
| 00 | `00_README.md` | (本文件) 总入口 |
| 01 | `01_大唐长安·总体规划方案.md` | 给文旅局看的整体设计 — 历史依据、八大功能区、全城 ASCII 地图、108 坊清单、视觉规范、文旅价值、路线图 |
| 02 | `02_技术重构方案.md` | 给开发看的架构 — 坐标系、LOD 三层、模块边界、strangler-fig 迁移计划、性能预算、debug hooks |
| 03 | `03_ward.schema.json` | Ward Manifest JSON Schema (Draft 2020-12) |

## 框架代码骨架 (已可独立运行)

```
han-diorama/
├── lib/
│   ├── world/
│   │   ├── grid.js              ✅ 坐标系 + 网格 + 调试网格
│   │   ├── lod.js               ✅ 三层 LOD 管理器
│   │   ├── ward-registry.js     ✅ 数据驱动 manifest 注册
│   │   └── streets.js           ✅ 朱雀大街 + 12 大街 + 城墙 4 城门
│   ├── procedural/
│   │   └── ward-l1.js           ✅ L1 程序坊模板
│   └── bootstrap.js             ✅ 新世界入口 (URL `?world=new` 启用)
└── data/wards/
    ├── _index.json              ✅ ward 总索引
    ├── _schema.json             见 docs/03
    ├── region-daming.json       ✅ 大明宫
    ├── region-taiji.json        ✅ 太极宫
    ├── region-huangcheng.json   ✅ 皇城官署区
    ├── region-east-market.json  ✅ 东市
    ├── region-west-market.json  ✅ 西市
    ├── region-qujiang.json      ✅ 曲江/芙蓉园
    ├── region-xingqing.json     ✅ 兴庆宫
    ├── ward-pingkang.json       ✅ 平康坊
    ├── ward-chongren.json       ✅ 崇仁坊
    ├── ward-jinchang.json       ✅ 进昌坊 (大雁塔)
    ├── ward-xinchang.json       ✅ 新昌坊 (青龙寺)
    ├── ward-yankang.json        ✅ 延康坊 (西明寺)
    ├── ward-chongye.json        ✅ 崇业坊 (玄都观)
    ├── ward-yongxing.json       ✅ 永兴坊 (美食)
    ├── ward-xiuzhen.json        ✅ 修真坊 (太医署)
    ├── ward-wuben.json          ✅ 务本坊 (国子监)
    ├── ward-huaiyuan.json       ✅ 怀远坊 (景教/波斯邸)
    ├── ward-xuanyang.json       ✅ 宣阳坊 (姚宋宅第)
    └── ward-zhaoguo.json        ✅ 昭国坊 (白居易宅)
```

## 启动方式 (Preview)

新框架与旧 `scene.js` 并存, 默认不激活, 不影响现状任何游戏功能:

```bash
cd han-diorama
python3 -m http.server 8000
```

打开:

| URL | 看到什么 |
| --- | --- |
| `http://localhost:8000/` | **现状** (与之前一模一样) |
| `http://localhost:8000/?world=new` | 旧场景 + 新世界容器叠加(框架地基已激活) |
| `http://localhost:8000/?world=new&grid=1` | 加显网格线 |
| `http://localhost:8000/?world=new&wards=1` | 加显网格 + 每个 ward id 标签 |
| `http://localhost:8000/?world=new&lod=L1` | 强制 L1 模式查看程序坊 |

> 注: `index.html` 还**未引入** `lib/bootstrap.js` — Phase 1 启动时再加。
> 现在只是框架代码就绪、空跑无副作用。

## 关键决策点 — 等用户确认

详见 `01_大唐长安·总体规划方案.md §11`。简版:

1. **世界尺寸**: 1000×1000 u (1:10 实际) 还是 700×700 u?
2. **L1 程序坊**是否需要可入内? (影响工作量倍)
3. **文旅局合作**: 演示 demo 还是准生产?
4. **优先 Hero 坊** 3 个: 默认建议 **大明宫 / 西市 / 进昌坊大雁塔**
5. **路线选择**: 先 Phase 1 框架重构, 还是先 Phase 3 直接造新 hero?

---

## 当前可被审阅的内容

- ✅ 总体规划方案文档 (供文旅 / 历史顾问 / 决策者审阅)
- ✅ 技术重构方案文档 (供开发审阅)
- ✅ Ward JSON Schema (供数据校验)
- ✅ 13 个 hero region manifest (供史学家校对)
- ✅ 框架代码骨架 (语法通过, 待集成)

## 未做 (等用户拍板后再做)

- ❌ 在 `index.html` 引入 `lib/bootstrap.js`
- ❌ 各 hero 模块的 build 函数 (`lib/hero/*.js`) — 13 个待实现
- ❌ 96 个 L1 程序坊 manifest (按需批量生成)
- ❌ 现有 23 个 zone 的迁移
- ❌ 文旅交互层 (导览/原典面板/科举闯关)

---

## 一句话总结

> "已经把骨架、坐标系、数据 schema、13 个核心坊的考据清单全部就位。下一步**只**需要你 (1) 在决策点上拍板, (2) 选定从哪一期切入, 就可以无缝开始实质重构, **现有功能不会断**。"
