# 大唐长安 · 3D 模型集成指南

把你自己的 **GLB / GLTF / USDZ** 模型丢到这里, 系统会自动接管, 替换原有的程序化角色, 并让它们能 **动起来** (idle / walk / talk 三态自动切换)。

> **状态 ✅ 管线已打通**
> 玩家角色、5 个语音 NPC、画廊女讲席 (苏阮卿) 都**已经预接管**——只要你在 `MODEL_REGISTRY` 里给它们注册了 GLB, 下次刷新就自动用; 也可以直接把 `.glb` 拖到游戏窗口, 在弹出的衣冠柜里选要套给谁。

---

## 🎮 0. 最爽的导入姿势 — 拖一下就换装 (无需写代码)

> **打开页面 → 右上角找到 👘 按钮 → 进衣冠柜**, 也可以**把 `.glb` 直接拖到游戏窗口任意地方**, 中央会出现一个虚线大框「松手以载入 3D 模型」, 松手后衣冠柜自动弹出, 选要套给哪个角色 (主角 / 李白 / 杜甫 / 王维 / 周引之 / 陈忠武 / 苏阮卿) → 一秒换皮。

| 操作 | 结果 |
|---|---|
| 把 `.glb` / `.gltf` / `.usdz` 拖进窗口 | 全屏出现"松手以载入"虚线框 → 松手 → 衣冠柜弹出, 上方显示"已接收 xxx.glb" → 选角色 → 立刻换装 |
| 右上角点 **👘** | 衣冠柜浮窗打开/关闭; 每个角色一张卡, "上传 GLB" 弹文件选择器, "↺" 还原默认 |
| 套上 `http(s)://` 模型 | 自动写入 `localStorage`, 刷新页面**仍在身上**, 不必重套 |
| 套上拖进来的本地文件 (blob: URL) | 当前会话内有效; 不会持久化 (blob 跨刷新会失效) |
| 说话时角色自动摆手 (talk 动画) | 语音 agent 一开口, 对应人物的 GLB 自动切到 talk clip (前提: GLB 里有 idle/walk/talk 任一动画) |

**实战例子: 给苏阮卿换个真人模型**
1. 从 Mixamo 下载一个唐装女性角色 + 4 段动画 (Idle / Walking / Talking / Standing Greeting), 合并导出 `.glb`
2. 打开 <http://localhost:8088>, 拖 `.glb` 到窗口
3. 衣冠柜里点"苏阮卿"那一栏的「套用此 GLB」
4. **进画廊** (含元殿 / 万邦奇画苑 / 鞍马图苑 / 紫宸殿之一), 她会以新形象出现并讲画。 你跟她说话时她会自动摆手 talk。

> 不进画廊她不会被实例化, 衣冠柜会提示"找不到苏阮卿 — 先进画廊召出讲席"。 这是正确行为, 不是 bug。

---

## TL;DR — 最短路径

1. 准备一个 **`.glb`** 文件 (推荐) 放到 `models/characters/libai.glb`
2. 在 `scene.js` 顶部加一行注册 (或者直接在浏览器 console 里跑):

   ```js
   MODEL_REGISTRY['libai'] = {
     url: 'models/characters/libai.glb',
     targetHeight: 1.75,
   };
   ```
3. 刷新浏览器, 李白的程序化"火柴人"就自动换成你的 GLB 模型了
4. 如果 GLB 里带动画 (clip 名包含 `idle` / `walk` / `talk` 之一), 系统会自动循环 idle, 走路切到 walk, 对话切到 talk

**实时切换 (不刷新)**: 在 console 里:
```js
MODEL_REGISTRY['libai'] = { url: '....glb', targetHeight: 1.75 };
const libai = namedNpcs.find(n => n.userData.personaId === 'libai');
await attachGlbToNpc(libai, 'libai');
```

---

## 1. 格式选择 — GLB vs USD / USDZ

| 格式 | 推荐度 | 说明 |
|---|---|---|
| **GLB** | ✅ **强推荐** | Three.js 一等公民。压缩好、加载快、动画/材质/骨骼/morph 全支持 |
| **GLTF + .bin + textures** | ✅ 可用 | GLB 的"未打包"版本; 拷贝时记得三件套一起带 |
| **USDZ** | ⚠️ 静态可用 | 主要用于 Apple AR Quick Look; Three.js 的 `USDZLoader` 是**实验性**的, 只支持**静态几何 + 基础贴图**, **不读动画 / 骨骼 / morph**。AR/iOS 项目里凑合用, 在我们这里基本只能做静态道具 (亭阁、雕像、家具) |
| **USD / USDA / USDC** | ❌ 不支持 | Three.js 没有 native loader, 必须**先转 GLB**, 见下面"USD → GLB 工作流" |
| FBX / OBJ / DAE | ❌ 不要 | 旧格式, 体积大, 没有 PBR; 建议先在 Blender / Maya 里导出成 GLB |

**为什么 GLB 是 web 3D 的事实标准:**
- 单一二进制文件 (textures + geometry + animations 全打包)
- ~100× 比 FBX 小
- 加载延迟低 (一次 HTTP 请求)
- 原生支持 PBR / morphTargets / skinned mesh
- Khronos 官方背书的开放标准

### 1.1 USD → GLB 工作流 (你有 .usd / .usda / .usdc / .usdz 时)

**路径 A: Blender (推荐, 桌面)**
1. Blender ≥ 4.0 (已内置 USD importer + glTF exporter)
2. `File → Import → Universal Scene Description (.usd...)` — 选你的 USD 文件
3. 在 Outliner 里检查 armature / mesh / animation tracks 都进来了
4. `File → Export → glTF 2.0 (.glb)`
   - **Format**: glTF Binary (.glb)
   - **Include**: ✅ Selected Objects (只选你要的)
   - **Transform**: ✅ +Y Up
   - **Geometry**: ✅ Apply Modifiers, ✅ UVs, ✅ Normals
   - **Animation**: ✅ Animation, ✅ Skinning, ✅ Limit to Playing Actions = OFF
   - **Animation → Bake Animation**: 30 fps, "Group by NLA Track" 打开
5. 把生成的 `.glb` 丢到 `han-diorama/models/characters/` 即可

**路径 B: `usdcat` + `gltf-transform` (CLI, 适合 CI/批处理)**
```bash
# 1) 装 Pixar USD 工具集 (一次性)
brew install usd                 # macOS
# 或 pip install usd-core         # Python wheels

# 2) 装 gltf-transform CLI
npm i -g @gltf-transform/cli

# 3) USD → USDA (人类可读, 方便检查) → GLB
usdcat input.usd -o input.usda            # 调试用, 看一下结构对不对
usdcat input.usd -o intermediate.glb \
    --usdz-resolve-search-paths           # 内嵌贴图到一个文件里
# (注意: usdcat 不原生输出 glb, 你需要走 Blender 或下面的 omniverse 工具)
```

**路径 C: NVIDIA Omniverse `usd2gltf` (CLI, 最忠实)**
- 下载 https://github.com/NVIDIA-Omniverse/usd2gltf
- `usd2gltf input.usd -o output.glb --embed-textures` — 保留材质 + 骨骼 + 动画
- 是 USD → glTF 转换里支持度最高的开源工具

**路径 D: Reality Composer / Reality Converter (macOS, GUI)**
- 打开 `.usdz`, `File → Export → glTF`
- 苹果出品, 对 USDZ 支持完整, 但只在 macOS 上

> **强烈建议**: 自己人工跑一次 USD → GLB → 在 Three.js viewer (比如 [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com)) 里预览一下动画对不对, 再丢进 `han-diorama/models/`。 早 5 分钟检查比晚 1 小时调试值。

---

## 2. 哪里能拿到免费的 GLB / 角色?

### A. **Khronos glTF Sample Models** — 测试用旗舰 (CC-BY)
- 网址: <https://github.com/KhronosGroup/glTF-Sample-Models>
- 直接 CDN 加载 (CORS 已开放):
  ```
  https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/<NAME>/glTF-Binary/<NAME>.glb
  ```
- 推荐角色: `Fox`, `CesiumMan`, `BrainStem`, `RiggedFigure`, `RiggedSimple`, `CesiumMilkTruck`
- **优势**: 全部经 Khronos 官方测试, 是验证 GLB 管线兼容性的"黄金标准"

### A.5. **three.js example models** — 经典演示资源 (CC0)
- 直接 CDN: `https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/<NAME>.glb`
- 强推: `Soldier.glb` (Idle/Walk/Run 三段动画, 卫兵首选), `RobotExpressive/RobotExpressive.glb` (12 段表情动画, 玩 NPC 表演最爽), `Horse.glb`, `Xbot.glb`, `Michelle.glb`

### B. **Apple Reality Composer Pro Content Library** — 免费 USD 资产 (开发者用)
- 在 Mac 上装 Reality Composer Pro (Xcode 自带), 工具栏 **+** 按钮打开 **Content Library**
- 数百个免费 USDZ 资产 (家具 / 自然 / AR 道具 / 角色), 全部商用许可
- Three.js 不能直接读 USD/USDZ 动画, 需要先在 Blender 里转 GLB (见 §1.1 USD → GLB 工作流)
- 配合 **OpenUSD** (Pixar 开源, Apple 主推): <https://openusd.org>
- Apple 在 2024-2026 持续发布相关 3D AI 模型: [ml-cubifyanything](https://github.com/apple/ml-cubifyanything), [ml-hugs](https://github.com/apple/ml-hugs) (人像 3DGS), [ml-direct2.5](https://github.com/apple/ml-direct2.5) (文生 3D), [Matrix3D](https://machinelearning.apple.com/research/large-photogrammetry-model) (相机姿态 + 深度), **SHARP** (单图重建 3DGS 场景). 这些是"生成 3D"工具, 不是现成模型库, 但对自制资产很有用

### C. **Poly Pizza** — Quaternius / Kenney 等的 CC0 索引 (无注册)
- 网址: <https://poly.pizza> · 全部 CC0, 商用免费
- 强推 character 包:
  - **[Adventurer](https://poly.pizza/m/5EGWBMpuXq)** by Quaternius (低多边形冒险者, 主角原型)
  - **[Casual Character](https://poly.pizza/m/kZ3DmIoGip)** (休闲款 NPC)
  - **[Ultimate Modular Men Pack](https://poly.pizza/bundle/Ultimate-Modular-Men-Pack-ZiH8muWqwQ)** — 11 角色 + 24 动画 + 可换装组件, 一包搞定 8 个 NPC

### D. **Kenney.nl** — 像素 + 低多边形 CC0 (无注册)
- 网址: <https://kenney.nl/assets>
- 整理得非常好, 全 CC0; 街景道具 / 自然 / 角色都有

### E. **Mixamo (Adobe)** — 免费 + 角色 + 海量动画 (强推)
- 网址: <https://www.mixamo.com>
- 上传你的角色 (FBX/OBJ) → 自动绑骨 → 选动画 (idle / walk / talk / dance ...) → 下载 GLB
- 关键: **每次只能下载一段动画**, 但所有动画用的是**同一根骨架** — 用脚本 (或 [Blender + Mixamo Combine](https://github.com/enziop/mixamo_converter)) 把多段动画合并到一个 GLB 即可

### F. **Sketchfab** — 真人扫描 + 唐风专题
- 网址: <https://sketchfab.com/3d-models?features=downloadable&licenses=322a749bcfa841b3a3859e6acd9d5158>
- 过滤建议: License = **CC0 / CC-BY** + Downloadable + Format ≥ glTF
- 关键词: `tang dynasty hanfu`, `chinese warrior`, `hanfu lady`, `chinese mythology`, `samurai`, `stylized asian character`
- 下载需要免费 Sketchfab 账号 (他们的 download API 强制 OAuth)
- 拿到 `.glb` 后直接拖进游戏窗口, 不需要 console / 不需要改代码

### G. **Ready Player Me** — 一键生成定制 avatar
- 网址: <https://readyplayer.me>
- 设计完一个角色, 直接下载 GLB (可选不同 LOD)

### H. **AI 生成** (实验性)
- [Meshy](https://www.meshy.ai), [Tripo](https://www.tripo3d.ai) — 文生 3D
- Apple [SHARP](https://innovationessence.com/apple-releases-open-source-sharp-ai-model-that-turns-single-photo-into-3d-scene/) — 单图重建 3DGS 场景 (开源)
- 当前质量比手工模型差一档, 但小角色 + 静态道具勉强能用

---

## 3. 动画来源 — 让角色"动起来"

### 路径 A: GLB 自带动画 (最简单)
找 [Khronos `BrainStem`](https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/BrainStem) — 一个 GLB 里就内置了 walk + idle 多段 clip。
我们的 `loadCharacter()` 加载后, 调用 `char.play('idle')` 即可。

### 路径 B: Mixamo 工作流 (推荐 — 给 Sketchfab 模型加动画)

```
[Sketchfab GLB 角色 (无动画)]  →  转 FBX (Blender)  →  上传 Mixamo
       ↓                                                   ↓
                                    选 idle / walk / talk 动画
                                                           ↓
                                    每段单独下载 FBX (with skin)
                                                           ↓
                                    Blender 导入 → 合并 NLA Action
                                                           ↓
                                    Export GLB (Include: Animations + All Actions)
       ↓
[最终 GLB: 角色 + 多段动画]
```

操作要点:
- Mixamo 下载时 **勾选 "With Skin"** (第一次), 之后的动画可选 "Without Skin"
- Blender 导出 GLB 时:
  - Format: glTF Binary (.glb)
  - Animation: ✅ Animation, ✅ Limit to Playing Actions = OFF, ✅ Group by NLA Track
- Animation clip 命名建议: `idle`, `walk`, `talk` — 这样 `MODEL_REGISTRY` 不用配 `animationMap`

### 路径 C: 自己写动画
- Blender / Maya / 3ds Max 都行
- 导出 GLB 时确保骨架名 + clip 名一致
- 关键: 动画必须挂在 **scene 根节点**, 不要挂在嵌套子物体上 (`GLTFLoader` 才能识别)

---

## 4. `MODEL_REGISTRY` 完整字段说明

`scene.js` 顶部已经 `import` 了 `MODEL_REGISTRY`, 给它加项即可:

```js
// 比如让李白用你下载的 GLB:
MODEL_REGISTRY['libai'] = {
  url: 'models/characters/libai.glb',  // 相对 index.html 的路径
  targetHeight: 1.75,                  // 米; 系统会自动等比缩放到这个高度
  yOffset: 0,                          // 上下微调 (有些模型轴心在脚, 有些在腰)
  animationMap: {                      // (可选) GLB 自带的 clip 名 ≠ idle/walk/talk 时映射
    idle: 'idle_breathing_01',         // GLB 里这个 clip 用作 idle
    walk: 'walking_loop',
    talk: 'talking_gesture',
  },
};
```

| 字段 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `url` | ✅ | — | GLB / GLTF / USDZ 文件路径 |
| `targetHeight` | | `1.7` | 缩放后的角色身高 (米) |
| `yOffset` | | `0` | 加载后 y 方向微调; 角色"陷地里"就 `+0.05`, "悬在空中"就 `-0.05` |
| `animationMap` | | 自动模糊匹配 | GLB 里 clip 名跟 idle/walk/talk 不一致时手动映射 |

---

## 5. 当前已支持的 personaId (写到 MODEL_REGISTRY 里就能接管)

| personaId | 中文名 | 用途 | 场景 |
|---|---|---|---|
| `libai` | 李太白 | 诗仙 / 飞花令对诗 | 曲江画舫 |
| `dufu` | 杜子美 | 诗圣 / 忆苦讲诗 | 成都浣花溪茅屋 |
| `wangwei` | 王摩诘 | 诗佛 / 诗画对题 | 蓝田辋川别业 |
| `tour_guide` | 周引之 | 引路使 / 长安导览 | 朱雀大街起点 |
| `gate_guard` | 陈忠武 | 朱雀门守城校尉 | 朱雀门 |
| `docent` | 苏阮卿 | 画学博士 / 万邦讲席 | 进入任一画廊时自动出现 |
| `player` | (主角) | 玩家自定义 | 玩家创建角色后, 用 `MODEL_REGISTRY['player']` 接管 |

写法二选一:
- **按 personaId**: 注册 `MODEL_REGISTRY['libai']`, 李白个人专用
- **按职业 preset**: 玩家创建角色时选了"诗人 / 武将 / 商人 / ..." preset, 想给每种职业不同模型 → 注册 `MODEL_REGISTRY['poet']`, `MODEL_REGISTRY['warrior']`, ... 没找到对应 preset 时 fallback 到 `MODEL_REGISTRY['player']`

**没注册的依然用程序化模型, 不会报错**。

---

## 6. 动画状态机 — 系统在背后帮你做的事

每帧, `animate()` 会扫一遍所有 GLB 角色, 根据下面四个条件自动切动画状态 (优先级从上到下):

| 条件 | 状态 | 触发的 clip |
|---|---|---|
| **语音 agent 正在说话** + 该角色 personaId 与 voice panel 当前 persona 一致 | **talk** | `talk` / 或模糊匹配 `talking`, `gesture`, ... |
| 在跟玩家对话 (dialogActive + 最近 NPC) | **talk** | 同上 |
| `userData._lastSpeed > 0.05` (路径行人 / 玩家在移动) | **walk** | `walk` / 或 `walking`, `run`, ... |
| 其他 (默认) | **idle** | `idle` / 或第一个 clip |

> **语音 → talk 是 Phase B 的核心彩蛋**: 当你跟苏阮卿 / 周引之 / 李白用 Agora 语音对话时, 她们的 GLB 化身会**跟着语调说话, 摆手, 摆头**, 不再是"语音传声筒 + 静态木桩"。 触发机制: voice-agent iframe 通过 `postMessage({source:'tang-voice-agent', type:'state', state:'talking'})` 投递状态, scene.js 把它翻译成 `window.voiceAiSpeaking=true`, animate loop 拿这个 flag + persona 匹配自动切 talk clip。 失败保险: 30 秒没收到 "talk 结束" 信号会强制切回 idle, 不会卡住挥手。

---

## 🗨️ 0.5. 头顶字幕气泡 — Phase C (NPC 真正"开口说话")

不只是动画 + 语音, **NPC 在说什么会以唐风卷轴飘在头顶**, 即使戴耳机听不清、即使背景音乐压住了语音、即使在嘈杂环境, 你都能"读到"对方在讲什么。

| 阶段 | 触发 | 表现 |
|---|---|---|
| 流式中 | iframe 持续投递 `type:'transcript', status:'in_progress'` | 卷轴打开, 文字流式累加, 末尾跳动一个金色光点 |
| 结束 | iframe 投递 `status:'end'` 或 `status:'final'` | 光点消失, 8 秒后卷轴优雅淡出 |
| 卡住 | partial 卡住 18 秒没新内容 | 自动淡出, 防止"挥之不去"的残影 |
| 切场 | 苏阮卿换展厅 re-spawn | 旧化身上的卷轴随同被 GC, 新化身从零开始 |

**视觉规格**: 1024×384 canvas → 3.6×1.35 世界单位的 sprite, 在 nameplate (2.5) 上方约 1 米 (3.55)。 最多显示 4 行, 单卷轴 70 字; 超长流式时只展示最近的 70 字 (前面用 `…` 缩略)。

**QA 调试**:
- 浏览器 URL 加 `?overhead-demo=1` → 4 秒后给 5 个语音 NPC 各飘一段诗, 之后每 12 秒重发一轮
- console 任意时刻跑 `demoOverhead('libai', '飞流直下三千尺')` 立刻飘一条
- 检查当前飘了几个: `OVERHEAD_SUBS.size`

**只画 AI, 不画用户**: iframe 投递的 transcript 同时含用户语音转写和 AI 回复, 我们在 scene.js 用 `data.isAgent === false` 过滤掉用户 — 否则玩家会看到"自己脑袋上飘着自己刚说的话", 体验差。

切换时自动 **crossfade 0.2-0.3 秒**, 不会跳帧。

想手动控制? 直接调:
```js
const char = window.glbCharacters.find(c => c.npcGroup.userData.personaId === 'libai').char;
char.play('dance', 0.5);  // 假设你的 GLB 里有个 dance clip
```

---

## 7. 常见问题

**Q: 模型加载完是黑色的?**
A: GLB 里没有 PBR 材质或 lights 配置不对。简单办法: 在 Blender 里给每个 Material 设 `Base Color`, 重新导出。

**Q: 模型被切掉一半 (only torso visible)?**
A: `targetHeight` 跟实际不匹配, 试试改成 `2.5` 或 `1.0`。也可能 `yOffset` 不对 — 模型脚下不在 0 而在 -1。

**Q: 加载后转头/手臂奇怪?**
A: 骨架命名不规范 (常见于 Sketchfab 的人体扫描)。建议先过一遍 Mixamo (它会自动重命名为标准骨架)。

**Q: USDZ 没动画?**
A: 这是 Three.js USDZLoader 的限制, **不是 bug**。USDZ 动画支持很烂, 转 GLB 吧。

**Q: 想要更大/更小, 但 targetHeight 调过了?**
A: `targetHeight` 决定绝对大小, 调它就行。如果想给同一个角色多档大小 (比如儒生坐着 vs 站着), 在 `loadCharacter()` 调用前用 `MODEL_REGISTRY[id].targetHeight = ...` 即可。

**Q: 程序化模型的铭牌(名牌)还在么?**
A: 在。系统只隐藏程序化的 **几何 mesh**, nameplate / halo / 互动判定 都保留 — GLB 不会破坏现有的对话系统。

**Q: 怎么验证 GLB 能否被加载?**
A: 打开浏览器 DevTools console, 看是否有:
```
[modelLoader] ✓ GLB 已加载: libai ← models/characters/libai.glb
```
如果是 ✗ 就检查路径 / 文件格式 / CORS。

**Q: 我要做一个移动的 GLB NPC (不属于 named NPC)?**
A: 调 `await loadCharacter('libai')`, 把返回的 `char.group` 加到场景里, 配 walker 路径就行。`updateAnimMixers()` 自动每帧推进它的动画。

---

## 8. 一份"开箱即用"的验证模型 — 已经在跑了

打开浏览器, 加载 `index.html` 后**几秒内**你就能看到一只 🦊 出现在朱雀大街东侧 (世界坐标 `(8, 0, 6)`), 绕着一个 r=3m 的圆圈漫步。 这是 [Khronos `Fox.glb`](https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/Fox), CC-BY 4.0, 自带 `Survey` / `Walk` / `Run` 三段动画。

旁边还立了一块木牌写着 **"GLB · 此狐为远客 · Khronos Fox · CC-BY 4.0"** —— 是给你的视觉确认: 管线在工作。

在浏览器 console 里, 你应该看到:

```
[modelLoader] ✓ GLB Demo Fox 已落地 — 朱雀大街东侧 (8, 0, 6)
```

**关掉 demo**: 把 `scene.js` 里 `// === GLB DEMO ===` 那一整段 `(async () => { ... })()` 注释掉, 刷新即可。

---

## 9. 进阶: 实时加载 (玩家自定义 / Drag-Drop)

`attachGlbToNpc` 和 `glbCharacters` 都已经挂在 `window` 上, 用 console 就能跑:

```js
// 把任意 GLB URL 挂到李白身上 (不刷新页面)
MODEL_REGISTRY['libai'] = { url: 'https://...你的.glb', targetHeight: 1.75 };
const libai = namedNpcs.find(n => n.userData.personaId === 'libai');
await attachGlbToNpc(libai, 'libai');
```

**Drag-Drop 上传 (做成 UI)**:

```js
input.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const blobUrl = URL.createObjectURL(file);
  MODEL_REGISTRY['libai'] = { url: blobUrl, targetHeight: 1.75 };
  const libai = namedNpcs.find(n => n.userData.personaId === 'libai');
  await attachGlbToNpc(libai, 'libai');
});
```

**查看当前活跃的所有 GLB**:

```js
console.table(glbCharacters.map(e => ({
  persona: e.npc.userData?.personaId,
  pos: [e.npc.position.x, e.npc.position.z].map(v => v.toFixed(1)).join(','),
  clips: Object.keys(e.char.actions).join(' | '),
})));
```

---

## 10. 文件夹约定

```
models/
├── README.md           ← 本文档
├── characters/         ← 人形角色
│   ├── libai.glb
│   ├── dufu.glb
│   └── ...
└── props/              ← 道具 / 建筑碎件
    ├── lantern.glb
    └── ...
```

不强制, 自己怎么舒服怎么放。`MODEL_REGISTRY` 用的是相对路径 (相对 `index.html`), 你想塞 `assets/3d/libai/v2.glb` 也行。

---

技术问题在 console 里看 `[modelLoader] ...` 开头的日志, 通常已经说清楚是路径问题、CORS、还是动画 clip 找不到。
