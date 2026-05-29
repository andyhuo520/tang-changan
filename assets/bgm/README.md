# 背景音乐 (BGM) · 古风曲

游戏右下角的 BGM 控制 pill 会自动播放此目录下的曲目，循环切换。

## 默认曲目

| 文件 | 曲目 | 来源 | 授权 |
|---|---|---|---|
| `guqin-lost-tao.mp3` | 古琴 · 平沙落雁 (Teals Descending Upon The Level Sand) | Lo Ka Ping / Arbiter Records (archive.org · Lost Sounds of the Tao) | **CC BY-NC-SA 3.0** — 非商业 + 必须署名 + 相同方式共享 |
| `guzheng-bamboo-zen.mp3` | 古筝 · 竹笛禅意 (Guzheng & Bamboo Flute Zen) | archive.org · Folksoundomy (前 4 分钟) | 无明确授权 — 仅作内部开发演示使用 |

## 如何换曲

想换成你自己的古风曲只需要两步：

1. 把任意 `.mp3` 文件放进 `han-diorama/assets/bgm/`
2. 改 `scene.js` 里 `bootTangBGM` IIFE 顶部的 `PLAYLIST` 数组，加一行：

```js
const PLAYLIST = [
  { src: 'assets/bgm/你的文件.mp3', title: '显示标题', meta: '副标 / 作者' },
  // ...
];
```

## 推荐音乐源（CC0 / Pixabay License / Public Domain）

| 源 | 适用 |
|---|---|
| https://pixabay.com/music/search/guzheng/ | 古筝、古琴、竹笛、二胡，免费可商用 |
| https://archive.org (search: chinese classical, CC license) | 历史录音，常为公共领域 |
| https://freemusicarchive.org | CC BY / CC0，需注意各曲单独授权 |
| https://incompetech.com | Kevin MacLeod，CC BY，多类型 |
| https://www.silkqin.com/06hear.htm | 古琴学者亲自重建录音，个人/教育用途 |

## 制作建议

- 时长 3-6 分钟 · 96kbps mono mp3 (~2-3 MB)
- 头尾各 0.5-1s 淡入淡出，避免循环时"啪"一声
- 音量已归一化（建议响度 ~ -23 LUFS），保持各曲音量平稳

转码命令：

```bash
ffmpeg -i input.mp3 -t 240 -ac 1 -ab 96k -ar 44100 \
  -af "afade=t=in:st=0:d=1,afade=t=out:st=235:d=5" \
  output.mp3
```

## URL 调试

| 参数 | 作用 |
|---|---|
| `?nobgm=1` | 完全关闭 BGM |
| `?bgm=0` ~ `?bgm=100` | 启动时设置音量 |
| `?bgm=skip` | 启动后立即跳到下一首 |

## Hook 行为

- 玩家进入游戏 (`startGame`) → BGM 自动播放
- 玩家打开语音 panel (周引之 / 智机使 / 苏阮卿等) → BGM 自动 duck 到 12%
- 关闭语音 panel → BGM 恢复原音量
- 玩家偏好（静音 / 音量）会存到 localStorage，下次自动恢复
