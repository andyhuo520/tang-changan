# GitHub 部署指南

## 仓库内容

本仓库为 **大唐长安 · 智机府** 前端（`han-diorama`）：纯静态 Three.js 游戏，可通过 **GitHub Pages** 直接访问。

实时语音需单独部署 `tang-voice-agent`（见下文「语音子项目」）。

## 一、首次推送到 GitHub

### 1. 登录 GitHub CLI（本机只需一次）

```bash
gh auth login
```

按提示选择 GitHub.com → HTTPS → 浏览器登录。

### 2. 创建远程仓库并推送

在 `han-diorama` 目录执行：

```bash
cd /path/to/han-diorama

# 创建公开仓库（可改仓库名）
gh repo create tang-changan --public --source=. --remote=origin --push
```

若仓库已在 GitHub 上创建，只需关联并推送：

```bash
git remote add origin https://github.com/<你的用户名>/tang-changan.git
git branch -M main
git push -u origin main
```

### 3. 启用 GitHub Pages

推送后，在仓库 **Settings → Pages** 中确认：

- **Source**: GitHub Actions（由 `.github/workflows/deploy-pages.yml` 自动部署）
- 部署完成后访问：`https://<用户名>.github.io/tang-changan/`

（若仓库名不是 `tang-changan`，将 URL 中的路径换成你的仓库名。）

## 二、本地预览（与线上一致）

```bash
cd han-diorama
python3 -m http.server 8126
```

浏览器打开：`http://localhost:8126/index.html`

## 三、线上启用实时语音

GitHub Pages **只能托管静态文件**，不能跑 `tang-voice-agent` 后端。需要：

1. 将 `tang-voice-agent` 的 **前端** 部署到 Vercel / Cloudflare Pages 等（例如 `https://voice.example.com`）
2. 将 **FastAPI 后端** 部署到可公网访问的服务器（Railway、Fly.io、自有 VPS 等）
3. 在打开游戏时通过 URL 参数注入语音前端地址，例如：

```
https://<用户名>.github.io/tang-changan/index.html?world=new&voiceOrigin=https://voice.example.com
```

或在 `index.html` 中设置：

```html
<script>window.TANG_VOICE_ORIGIN = 'https://voice.example.com';</script>
```

（需在 `scene.js` 加载前定义。）

## 四、更新发布

```bash
git add -A
git commit -m "描述本次改动"
git push
```

推送 `main` 分支后，GitHub Actions 会自动重新部署 Pages。

## 五、常见问题

| 问题 | 处理 |
|------|------|
| 页面空白 / 模块加载失败 | 确认用 **HTTPS** 的 Pages URL 访问；不要用 `file://` 打开 |
| 语音面板连不上 | 检查 `TANG_VOICE_ORIGIN` 是否指向已部署的语音前端，且后端 CORS 允许该域名 |
| 资源 404 | 仓库需包含 `assets/`、`portraits/`、`murals/`；大文件勿超过 GitHub 单文件 100MB 限制 |
