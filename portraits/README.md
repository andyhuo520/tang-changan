# 角色肖像视频 · 资产规范

对话窗口左侧的 **AI 形象面板** 会从这里读取每个角色的视频。 目前 UI 已经接好——只要按下面的命名约定把文件放进对应目录, 刷新页面就会自动播放。

文件没放? 不会破图——面板会落到「水墨占位卡」(角色名 + 单字大字), 也很好看。

---

## 1. 文件约定 (按优先级查找)

每个角色一个目录, 期待最多 3 个文件:

| 路径 | 类型 | 用途 | 必需? |
|---|---|---|---|
| `portraits/<personaId>/intro.mp4`    | 视频 + 音频 | 人物面板打开时**有声播放一次**, 作为出场开场 | 可选 |
| `portraits/<personaId>/idle.mp4`     | 视频 (循环) | AI **静默** 时播放, 默认平静的呼吸/微表情/转头 | 强烈建议 |
| `portraits/<personaId>/talking.mp4`  | 视频 (循环) | AI **说话** 时播放, 嘴在动 / 手势 / 眉眼有变 | 可选 (没有就一直 idle) |
| `portraits/<personaId>/idle.jpg`     | 静态图     | 视频加载失败的兜底, 也作为视频未加载好时的首帧 | 推荐 |
| `portraits/<personaId>/idle.png`     | 静态图     | 如果你给的是 PNG, 系统会在 `idle.jpg` 不存在时自动尝试它 | 可选 |

**没有任何文件时**: 落到 CSS/SVG 占位卡——一个圆框 + 大字 (`诗`/`画`/`武` 等) + 角色名。 永不破图。

### 核心语音 `personaId` 与对应角色

| personaId | 角色名     | 关键词 (用于生图 prompt)                                  | 占位单字 |
|---|---|---|---|
| `libai`      | 李太白 (诗仙) | 飘逸潇洒, 醉酒持杯, 长髯, 唐代文士袍, 月色             | `诗`   |
| `dufu`       | 杜子美 (诗圣) | 沉郁忧国, 中年风霜感, 麻布长衫, 微皱眉                 | `诗`   |
| `wangwei`    | 王摩诘 (诗佛) | 禅意, 清瘦书生, 素衣, 半开眼帘, 旁有山水/竹            | `禅`   |
| `tour_guide` | 周引之 (引路使) | 唐代女导引, 温润有礼, 团扇/绢卷在手, 高髻簪花         | `引`   |
| `gate_guard` | 陈忠武 (校尉) | 唐代铠甲城卫, 络腮胡, 长戟/腰刀, 朱雀门下             | `武`   |
| `docent`     | 苏阮卿 (画学博士) | 唐代女画师, 笔架旁, 端庄, 衣带飘飘, 殿堂背景        | `画`   |
| `brand_docent` | 智机使 | 天枢府未来使节, 古今 AI 讲席, 半古半科幻 | `智` |
| `brand_agora` | 智机使 · Agora 馆 | Agora 馆, 实时音视频, 声波纹样, 青蓝科技光 | `A` |
| `brand_claude` | 智机使 · 翰派 | Claude 馆, 翰林长卷, 紫金色, 长上下文 | `翰` |
| `brand_openai` | 智机使 · 元派 | OpenAI 馆, 白黑科技纹章, 开门人 | `元` |
| `brand_chatgpt` | 智机使 · 万民派 | ChatGPT 馆, 万民问答, 绿色光纹 | `问` |
| `brand_deepseek` | 智机使 · 玄铁派 | DeepSeek 馆, 玄铁工程派, 深蓝冷光 | `玄` |
| `brand_minimax` | 智机使 · 海螺派 | MiniMax 馆, 多模态, 海螺声纹, 暖橙光 | `海` |
| `brand_kimi` | 智机使 · 月暗派 | Kimi 馆, 月色长文本, 银蓝夜光 | `月` |
| `brand_qwen` | 智机使 · 千问派 | Qwen 馆, 千问万卷, 青绿科技纹 | `千` |
| `brand_zhipu` | 智机使 · 清谱派 | 智谱馆, 清华学府, 紫蓝谱系 | `谱` |

---

## 2. 视频规格建议

| 项 | 推荐值 | 说明 |
|---|---|---|
| 时长 | **3-6 秒**, 循环无缝 | 太长占内存, 太短循环明显 |
| 分辨率 | **720×900 (4:5) 或 1080×1080 (1:1)** | 面板内部约 320×400, object-fit: cover, 太大浪费, 太小糊 |
| 编码 | **H.264 (MP4)** 优先, VP9 (WebM) 次之 | Safari 偏爱 H.264 |
| 帧率 | **24-30 fps** | 视频不是动作戏, 24fps 足够 |
| 码率 | **800kb - 2Mbps** | 6 段一起 ≈ 5-15 MB |
| 音频 | `intro.mp4` 可保留; `idle.mp4/talking.mp4` 建议删掉 | 开场用原视频音效, 实时对话阶段避免和 Agora TTS 抢声 |
| `idle.mp4` 内容 | 平静呼吸 + 偶尔眨眼 + 头微动 | 不要嘴动!! 否则跟 AI 没说话时不一致 |
| `talking.mp4` 内容 | 嘴在动 + 手势 + 偶尔点头 | 不必对口型 (Agora TTS 内容不固定), 节奏感即可 |

无缝循环小技巧 (用 ffmpeg):
```bash
# 把一段视频做成无缝循环 (头尾各取 0.5s 做交叉淡化)
ffmpeg -i input.mp4 \
  -vf "split[a][b]; [a]trim=0:5,setpts=PTS-STARTPTS[v1]; [b]trim=4.5:5,setpts=PTS-STARTPTS,fade=t=out:st=0:d=0.5,fade=t=in:st=0:d=0.5[v2]; [v1][v2]concat=n=2:v=1:a=0" \
  -an -c:v libx264 -crf 23 -preset slow -movflags +faststart idle.mp4
```

或者最简洁: 拍一段 6 秒, 用 [Topaz Video AI / Hedra]() 的 loop 选项, 或在 Premiere 里手动 crossfade 头尾。

---

## 3. 用什么工具生成 (水墨漫画 / 半写实风)

你选了 **水墨漫画 / 半写实** 风格, 推荐这套两段式流水线:

### 第一段: 出肖像图 (single still)

| 工具 | 价格 | 风格匹配 |
|---|---|---|
| **Midjourney v6** | $10/月起 | ⭐ 半写实最稳, 加 `--style raw --stylize 150` 抑制过艺术 |
| **Flux.1 [pro]** (Replicate / fal.ai) | ~$0.05/图 | 水墨/插画风强 |
| **Ideogram v2 / v3** | 免费有限额 | 写实控制好, 中文/古典审美友好 |
| **GPT Image / Nano Banana** | 你已经有 | 节奏快, 可迭代 |

**Prompt 模板** (以李白为例, 你可以照着改其他角色):
```
肖像, 中国唐代诗人李白, 半身像, 4:5 竖构图,
飘逸的白色长袍, 黑色长发与长须, 微醉的眼神略向远方,
左手提酒壶, 右手执卷,
水墨漫画风格 + 半写实, 似郑问 / 张旭明 / 寺田克也,
柔和侧光, 暖灰色背景, 留白, 印章一枚 红色,
平静呼吸状态, 嘴微闭 --ar 4:5 --style raw --stylize 150 --v 6
```

每个角色出 1 张满意的, 保存为 `<personaId>/idle.jpg` 或 `<personaId>/idle.png` (作为静态 fallback)。

### 第二段: 图生视频 (动起来)

| 工具 | 价格 | 强项 |
|---|---|---|
| **Kling 1.5 / 2.0** (kling.ai) | 免费配额 + 订阅 | ⭐ 国画/汉服风格中文场景最稳, idle 微动表现极好 |
| **Hedra Character-1** (hedra.com) | $0.03-0.10/秒 | 自动加自然呼吸/眨眼, 是最适合"做出 idle / talking 两个版本"的工具 |
| **Runway Gen-3 Alpha**       | $0.05-0.10/秒 | 风格控制好 |
| **Luma Dream Machine**        | 免费+订阅      | 速度快, 镜头动得多, idle 可能不够"稳" |
| **Sora** (OpenAI)             | 已开放          | 质量顶级, 但偏写实, 控制半写实风格要多 prompt |

**Hedra 工作流** (推荐, 因为它分得清 idle 和 talking):
1. 上传上一步出的肖像 PNG
2. 不上传音频 → 生成 5 秒 idle (角色只呼吸/眨眼) → 存为 `idle.mp4`
3. 上传一段 5 秒中文 TTS 音频 (或随便录一段读诗) → 生成 talking 视频 → 删掉音轨 (`ffmpeg -i out.mp4 -an -c:v copy talking.mp4`) → 存为 `talking.mp4`

**Kling 工作流** (无需 audio):
1. 同上, 上传肖像
2. idle prompt: `subtle breathing, slow blink, gentle head sway, mouth closed, 5 seconds, looping`
3. talking prompt: `gentle speech, soft mouth movement, occasional nod, natural gestures, 5 seconds, looping`

---

## 4. 最低成本起步: 1 个角色 5 分钟

如果你只是想看看效果:

```bash
# 拿一张 (任意) 唐人肖像 png, 放到这里, 把 idle.mp4 暂时省了
cp ~/Downloads/libai_portrait.png han-diorama/portraits/libai/idle.png
```

刷新浏览器, 跟李白对话——左侧会显示这张静态图。 等你之后真的生成了视频, 再丢 `idle.mp4` / `talking.mp4` 进去即可, 没动 UI / 没动代码。

---

## 5. 测试: 用任意一段公共测试视频跑通管线

不想现在生图, 想先验证 UI 切换是否工作? 用 Khronos 或者随便一段 sample mp4 (本仓库不内置):

```bash
# 任意一段公开视频 (例如 W3C 的 sample) 都可以
curl -L https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4 \
  -o han-diorama/portraits/libai/idle.mp4
```

然后游戏内跟李白说话——左侧会循环播放兔子。 看到了说明管线打通, 之后你再换成真正的肖像视频。

---

## 6. 我已经准备好了, 接下来呢?

直接把文件丢到对应目录, **不需要改任何代码**:

```
portraits/
  libai/
    idle.mp4       ← 必有
    talking.mp4    ← 可选
    idle.jpg       ← 推荐, 视频加载完前显示
  dufu/
    ...
```

刷新页面, 进城后跟人说话——左侧自动出场。

