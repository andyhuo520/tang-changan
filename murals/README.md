# 壁画素材目录

把你想挂在大殿 / 大雁塔 / 曲江亭里的壁画图片丢进这个目录。

## 命名约定

按展厅 ID 命名，每个 panel 一张图。文件名格式：

```
{galleryId}_{panel_index}.{jpg|png|webp}
```

例如：

```
hanyuan_0.jpg     # 含元殿 · 万邦来朝图
hanyuan_1.jpg     # 含元殿 · 元日大朝
hanyuan_2.jpg     # 含元殿 · 受降图
hanyuan_3.jpg     # 含元殿 · 凤翔丹墀
xuanzheng_0.jpg
xuanzheng_1.jpg
...
pagoda_0.jpg      # 大雁塔 · 玄奘取经图
pagoda_1.jpg      # 大雁塔 · 译经场
...
```

## 当前展厅列表

| galleryId  | panel 数 | 内容 |
| ---------- | -------- | --- |
| hanyuan    | 4 | 万邦来朝图 / 元日大朝 / 受降图 / 凤翔丹墀 |
| xuanzheng  | 4 | 常朝图 / 紫绯朝服 / 中书省草制 / 御史台 |
| zichen     | 3 | 入阁仪 / 夜对 / 后宫 |
| pagoda     | 4 | 玄奘取经图 / 译经场 / 雁塔题名 / 佛祖说法 |
| qujiang    | 3 | 丽人行 / 曲江流饮 / 杏园探花 |

## 推荐规格

- 比例 **3 : 4 (竖版)**，1024 × 1365 起，最大 2048 × 2730
- 格式 JPG / PNG / WEBP
- 色彩偏暖色调，与展厅墙体相协调
- 文件大小 < 800 KB（避免加载卡顿）

## 接入方法

放入图片后，**告诉 AI**："我已经把图片放到 `murals/hanyuan_0.jpg` 等位置了"，AI 会在 `scene.js` 的 `GALLERIES` 配置中为对应 panel 加上 `imageUrl: './murals/hanyuan_0.jpg'`。

如果你不想等 AI，自己手动改也可以：

```js
// scene.js 找到 GALLERIES.hanyuan.panels
panels: [
  { title: '万邦来朝图', caption: '...', tint: 0xd1a050, imageUrl: './murals/hanyuan_0.jpg' },
  ...
]
```

加了 `imageUrl` 就会自动替换程序化占位纹理。
