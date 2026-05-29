/**
 * Brand Plaza · 天枢府 · AI 品牌独立坊
 *
 * 一座独立的"坊": 朱雀大街东侧 (世界坐标 100, 65), 120×100m 坊墙围合.
 *   西门 (大牌坊) 正对朱雀大街, 北门次要.
 *   坊内中央广场 + 七座唐风殿宇 (3 北殿面南 / Agora featured 居中朝西 / 3 南殿面北).
 *   朱雀大街 (x=0, z=65) 立一座指路碑大牌坊: "天枢府 → AI 品牌街".
 *
 * 玩家流程:
 *   ① 朱雀大街看到 "天枢府 →" 大牌坊 → 知道东侧有"AI 七坊"
 *   ② WASD 往东走 → 看到坊墙 + 西门 (一座大牌坊 + 两侧守城兽)
 *   ③ 入坊 → 中央广场, 7 座殿宇一目了然, Agora 居中最显眼
 *   ④ 走到任一殿前 → "F 入殿" → 进 FPS gallery 模式, 内部:
 *      · Logo 墙 (北), 介绍墙 (东), 镇馆三宝墙 (西), 讲席 (南门前)
 *      · Agora 馆额外加"实时声波"展品
 *   ⑤ 靠近讲席 + E → 智机使 (brand_docent persona) 开讲
 *
 * 自定义品牌: 沿坊外南墙横向排开 (z = +65 之外, x 递增).
 *
 * 公开 API:
 *   install({ scene, gameState })  — 创建坊体 + interiors, 注册 doors / galleries
 *   getDoors() / getGalleryDefs()  — scene.js GALLERY_DOORS / GALLERIES 合并源
 *   beginEnter(id) / beginExit(id) — gallery 进出钩子
 *   gotoBrand(id)                  — 统一传送入口
 *   openCustomBrandModal()         — 自定义品牌创建
 *   refreshAll()                   — 自定义品牌变动后重建几何
 */

import * as THREE from 'three';
import { allBrands, addCustomBrand, removeCustomBrand, loadCustomBrands } from '../content/brand-data.js?v=20260528-bgm-classical';
import { tangHall, courtyardWall, paifang, PALETTE } from '../hero/_shared.js';

/* ───────── 每馆专属"智机使"音色映射 ─────────
 * 后端在 tang-voice-agent/server/src/personas/ 下为 9 个馆各注册了一个 brand_X persona,
 * 各自配置不同的 MiniMax 中文音色 (News_Anchor / Gentle_Senior / ... ).
 * 用户自定义馆 fallback 到通用 brand_docent.
 *
 * 改这张表前请同步改后端 personas/__init__.py.
 */
const BRAND_VOICE_PERSONAS = Object.freeze({
  agora:     { personaId: 'brand_agora',    displayName: '智机使 · 声派',   subtitle: '声网 Agora 馆 · 实时音视频派' },
  anthropic: { personaId: 'brand_claude',   displayName: '智机使 · 翰派',   subtitle: 'Claude · Anthropic 馆 · 长卷长上下文派' },
  openai:    { personaId: 'brand_openai',   displayName: '智机使 · 元派',   subtitle: 'OpenAI 馆 · 开门人' },
  chatgpt:   { personaId: 'brand_chatgpt',  displayName: '智机使 · 万民派', subtitle: 'ChatGPT 馆 · 亿人对话产品' },
  deepseek:  { personaId: 'brand_deepseek', displayName: '智机使 · 玄铁派', subtitle: 'DeepSeek 深度求索 馆 · 开源工程派' },
  minimax:   { personaId: 'brand_minimax',  displayName: '智机使 · 海螺派', subtitle: 'MiniMax 馆 · 多模态派' },
  kimi:      { personaId: 'brand_kimi',     displayName: '智机使 · 月暗派', subtitle: 'Kimi · 月之暗面 馆 · 长文本派' },
  qwen:      { personaId: 'brand_qwen',     displayName: '智机使 · 千问派', subtitle: 'Qwen · 通义千问 馆 · 全尺寸开源派' },
  zhipu:     { personaId: 'brand_zhipu',    displayName: '智机使 · 清谱派', subtitle: '智谱 · ChatGLM 馆 · 清华系国产基模' },
});
const BRAND_VOICE_FALLBACK = Object.freeze({
  personaId: 'brand_docent',
  displayName: '智机使',
  subtitle: '天枢府特使 · AI 品牌街讲席',
});

/** 给 scene.js 用 — 拿到某品牌对应的语音 persona 配置 (含自定义品牌兜底) */
export function personaForBrand(brandOrId) {
  const id = (typeof brandOrId === 'string') ? brandOrId : (brandOrId && brandOrId.id);
  if (id && BRAND_VOICE_PERSONAS[id]) return BRAND_VOICE_PERSONAS[id];
  return BRAND_VOICE_FALLBACK;
}

/* ───────── 天枢府坊布局 (世界坐标) ─────────
 *
 * 重要: 1 world unit ≈ 10m. 主城地基 BoxGeometry(120, _, 160), 中心 (0,_,-23)
 *   → 主城地表覆盖 x∈[-60,+60], z∈[-103,+57]. 任何超出此范围的坐标 = 飘在虚空里.
 * 现把天枢府嵌入主城东侧中段, 严格站在地表内. 50×40u 中等坊位 (跟战场/驼商队同量级).
 *
 * 9 馆 3×3 网格 + Agora 居中, 8 馆"门朝中央" (径向布局, 走到中央能一眼看全 8 个正门).
 */
const WARD_CENTER = new THREE.Vector3(38, 0, 5);
const WARD_W = 50;             // 东西宽
const WARD_D = 40;             // 南北深
const WARD_WALL_H = 3.5;
const WARD_GATE_WIDTH_W = 6;   // 西门宽 (主门, 朝向朱雀大街方向)
const WARD_GATE_WIDTH_N = 5;   // 北门宽 (次要)

// 朱雀大街指路碑 (放在朱雀大街东侧, 指向坊西门. 距坊约 26u)
const SUZAKU_SIGN_POS = new THREE.Vector3(8, 0, WARD_CENTER.z);

// 馆相对坊中心的坐标 + 门朝向 (face: 0=+z南, π=-z北, π/2=+x东, -π/2=-x西).
// 3×3 网格, 每馆门"朝中央" — 玩家站在 Agora 周围能一眼看到所有正门.
// dx: -13/0/+13   dz: -11/0/+11
const HALL_LAYOUTS = {
  // N 排 z=-11, 门朝南 (+z) 面向中央
  openai:    { dx: -13, dz: -11, face: 0 },
  anthropic: { dx:   0, dz: -11, face: 0 },
  deepseek:  { dx:  13, dz: -11, face: 0 },
  // 中排 z=0: Qwen 朝东, Agora 朝西(正对西门), Zhipu 朝西
  qwen:      { dx: -13, dz:   0, face:  Math.PI / 2 },   // 门朝 +x (面向中央)
  agora:     { dx:   0, dz:   0, face: -Math.PI / 2 },   // 门朝 -x (正对西门入口)
  zhipu:     { dx:  13, dz:   0, face: -Math.PI / 2 },   // 门朝 -x (面向中央)
  // S 排 z=+11, 门朝北 (-z) 面向中央
  minimax:   { dx: -13, dz:  11, face: Math.PI },
  kimi:      { dx:   0, dz:  11, face: Math.PI },
  chatgpt:   { dx:  13, dz:  11, face: Math.PI },
};

// 殿宇尺寸 (50×40u 坊位里要塞 9 馆 → 中等紧凑)
const HALL_W = 7, HALL_D = 5, HALL_H = 3.5;            // 普通殿 ≈ 70×50×35m
const HALL_W_F = 9, HALL_D_F = 6.5, HALL_H_F = 4.5;    // featured (Agora) ≈ 90×65×45m

// 远岛室内 (传送进去的 gallery FPS 模式空间) — 保持原坐标, 与 DiyHall (-700,500) 错开
const INTERIOR_BASE       = new THREE.Vector3(-1200, 500, 0);
const INTERIOR_SPACING_X  = 40;
const ROOM_HALF           = 8;   // 16x16m
const ROOM_H              = 6;
const ROOM_H_FEATURED     = 8;
const ROOM_HALF_FEATURED  = 11;  // Agora 大馆 22x22m

/* ───────── 模块状态 ───────── */

let _installed   = false;
let _scene       = null;
let _gameState   = null;
let _root        = null;      // 所有 exterior 的容器 (便于 refresh)
let _interiorRoot = null;     // 所有 interior 的容器
const _byId      = {};        // id → { brand, def, doorPos, exteriorGroup, interiorGroup, dockerStation }
let _currentDocker = null;    // 当前最近的讲解员站点 (供 E 触发)
const _wallLogoCanvases = {}; // id → canvas (logo wall, 用户自定义有 logo 图像时更新)

/* ───────── 工具 ───────── */

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

/** 把 0xRRGGBB → "rgb(r,g,b)" */
function rgbStr(c, a = 1) {
  const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}

/** 计算品牌 i 的内部中心 (远岛 gallery 室内). */
function brandInterior(i) {
  return new THREE.Vector3(
    INTERIOR_BASE.x + i * INTERIOR_SPACING_X,
    INTERIOR_BASE.y,
    INTERIOR_BASE.z,
  );
}

/** 给定 brand id 取布局; 找不到则按"自定义品牌"分配到南墙外横向递增 i. */
function layoutFor(brand, customIndex) {
  if (HALL_LAYOUTS[brand.id]) return HALL_LAYOUTS[brand.id];
  // 自定义品牌: 坊外南墙以南 6u, 沿 x 方向横向铺开 (每 9u 一座, 居中).
  const n = customIndex;
  return {
    dx: (n - 1) * 9,
    dz: WARD_D / 2 + 6,
    face: Math.PI,  // 门朝北, 玩家从坊内可看到
    isCustomExt: true,
  };
}

/** 把局部 (dx,dz) + face 转成世界坐标的门口位置 (殿前 3m 处). */
function doorWorldFor(layout, depth) {
  const offset = depth / 2 + 3.2;
  const localFront = new THREE.Vector3(0, 0, offset).applyAxisAngle(
    new THREE.Vector3(0, 1, 0), layout.face,
  );
  return new THREE.Vector3(
    WARD_CENTER.x + layout.dx + localFront.x,
    0.05,
    WARD_CENTER.z + layout.dz + localFront.z,
  );
}

/* ───────── 牌坊 · CanvasTexture ───────── */

function makeBrandPlaqueTex(brand) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 320;
  const ctx = c.getContext('2d');

  // 朱漆底, 自带描金边
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, rgbStr(brand.accent, 0.96));
  grad.addColorStop(1, 'rgba(20,8,4,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // 内框
  ctx.strokeStyle = hex(brand.gold);
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, c.width - 40, c.height - 40);

  // 中文大字
  ctx.fillStyle = brand.latinColor;
  ctx.font = 'bold 90px "Noto Serif SC","STKaiti","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = brand.latinColor;
  ctx.shadowBlur = 26;
  ctx.fillText(brand.brand, c.width / 2, 110);
  ctx.shadowBlur = 0;

  // Latin
  ctx.font = '700 56px "Inter","Helvetica Neue",sans-serif';
  ctx.fillStyle = hex(brand.gold);
  ctx.fillText(brand.latin, c.width / 2, 190);

  // tagline
  ctx.font = '24px "STKaiti","Songti SC",serif';
  ctx.fillStyle = 'rgba(245, 218, 144, 0.9)';
  ctx.fillText(brand.tagline || '', c.width / 2, 248);

  // featured 角标
  if (brand.featured) {
    ctx.fillStyle = hex(brand.gold);
    ctx.fillRect(c.width - 200, 26, 174, 38);
    ctx.fillStyle = '#1a0a06';
    ctx.font = 'bold 22px "Inter",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FEATURED · 镇街', c.width - 113, 51);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLogoOnPlaqueTex(brand) {
  /** 大尺寸 Logo 牌, 用作展馆内主墙的"招牌". */
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d');

  // 锦缎纹理底
  const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, rgbStr(brand.accent, 1));
  grad.addColorStop(1, 'rgba(30, 16, 10, 1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // 浅纹格 (锦缎)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < c.width; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, c.height); ctx.stroke();
  }
  for (let j = 0; j < c.height; j += 32) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(c.width, j); ctx.stroke();
  }

  // 描金双框
  ctx.strokeStyle = hex(brand.gold);
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, c.width - 60, c.height - 60);
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, c.width - 96, c.height - 96);

  // 上方中文牌名
  ctx.fillStyle = brand.latinColor;
  ctx.font = 'bold 92px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = brand.latinColor;
  ctx.shadowBlur = 22;
  ctx.fillText(brand.brand, c.width / 2, 156);

  // Latin 巨大
  ctx.shadowBlur = 28;
  ctx.font = '900 200px "Inter","Helvetica Neue",sans-serif';
  ctx.fillStyle = brand.latinColor;
  ctx.fillText(brand.latin, c.width / 2, 410);
  ctx.shadowBlur = 0;

  // 下方副标
  ctx.fillStyle = hex(brand.gold);
  ctx.font = 'italic 36px "STKaiti",serif';
  ctx.fillText(brand.tagline || '', c.width / 2, 506);

  // 印鉴
  ctx.fillStyle = hex(brand.gold);
  ctx.fillRect(c.width / 2 - 55, 560, 110, 110);
  ctx.fillStyle = '#1a0a06';
  ctx.font = 'bold 28px "STKaiti",serif';
  ctx.fillText('長安·智机', c.width / 2, 600);
  ctx.fillText('CHANG-AN', c.width / 2, 640);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, canvas: c };
}

function paintLogoOnTopOf(canvas, tex, src) {
  /** 把真品牌 logo 覆盖到 Latin-巨大-字 区域上.
   * src 可以是 file URL ('assets/brand-logos/agora.png') 或 dataURL.
   * tex 是包住 canvas 的 CanvasTexture; 图片异步加载完成后 tex.needsUpdate = true.
   */
  if (!src) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  // 同域文件 + dataURL 都不需要 crossOrigin; 加上保险也不报错
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const w = 540, h = 360;
    const x = (canvas.width - w) / 2;
    const y = 270;
    // 先盖掉原 latin 字
    ctx.fillStyle = 'rgba(20, 10, 6, 0.92)';
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
    const r = Math.min(w / img.width, h / img.height);
    const dw = img.width * r, dh = img.height * r;
    ctx.drawImage(img, (canvas.width - dw) / 2, y + (h - dh) / 2, dw, dh);
    if (tex) tex.needsUpdate = true;
  };
  img.onerror = (e) => console.warn('[brand-plaza] logo image load failed', src, e);
  img.src = src;
}

// 向后兼容: 老 API 名 (只接 canvas + dataUrl) — 仅供回收 callers
function paintCustomLogoOnTopOf(canvas, dataUrl) {
  paintLogoOnTopOf(canvas, null, dataUrl);
}

function makeInfoTex(brand) {
  /** 介绍卡: 一段 blurb */
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#f4e8c8');
  grad.addColorStop(1, '#e1cd9a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#a8732a'; ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, c.width - 80, c.height - 80);

  // 标题
  ctx.fillStyle = '#3a1810';
  ctx.font = 'bold 64px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'center';
  ctx.fillText('品 鑒 · ' + brand.brand, c.width / 2, 100);

  ctx.fillStyle = '#7a4a1c';
  ctx.font = 'italic 28px "STKaiti",serif';
  ctx.fillText(brand.tagline || '', c.width / 2, 144);

  // blurb 主体
  ctx.fillStyle = '#2c1810';
  ctx.font = '30px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, brand.blurb || '（未录入介绍）', c.width - 200, 30 * 1.45);
  let y = 220;
  for (const line of lines.slice(0, 9)) {
    ctx.fillText(line, 100, y);
    y += 30 * 1.45;
  }

  // 底栏 footer
  ctx.fillStyle = '#a8732a';
  ctx.font = '20px "STKaiti",serif';
  ctx.textAlign = 'right';
  ctx.fillText('長安智机藏 · ' + new Date().getFullYear(), c.width - 80, c.height - 60);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHighlightsTex(brand) {
  /** 镇馆三/五宝: 列表卡 */
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#1a0e08');
  grad.addColorStop(1, '#0c0703');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = hex(brand.gold); ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, c.width - 80, c.height - 80);

  ctx.fillStyle = hex(brand.gold);
  ctx.font = 'bold 64px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'center';
  ctx.fillText('鎮 館 之 寶', c.width / 2, 100);

  ctx.font = '24px "STKaiti",serif';
  ctx.fillStyle = brand.latinColor;
  ctx.fillText('HIGHLIGHTS · ' + brand.latin, c.width / 2, 142);

  // highlight 列表
  const list = brand.highlights || [];
  ctx.font = '32px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'left';
  let y = 220;
  list.slice(0, 6).forEach((h, i) => {
    // 朱印序号
    ctx.fillStyle = rgbStr(brand.accent, 1);
    ctx.fillRect(100, y - 30, 44, 44);
    ctx.fillStyle = brand.latinColor;
    ctx.font = 'bold 24px "Inter",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1).padStart(2, '0'), 122, y - 4);
    // 正文
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f5e0a8';
    ctx.font = '30px "Noto Serif SC","STKaiti",serif';
    ctx.fillText(h, 168, y);
    y += 64;
  });

  // 描金底栏
  ctx.fillStyle = hex(brand.gold);
  ctx.font = '20px "STKaiti",serif';
  ctx.textAlign = 'right';
  ctx.fillText('靠近講席 · 按 E · 與 智機使 對話', c.width - 80, c.height - 60);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDockerLabelTex(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a0a06';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d4a554'; ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 56px "Noto Serif SC","STKaiti",serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrapText(ctx, text, maxWidth, _lineHeight) {
  // 简单按字符宽度换行 (中英文混排)
  const out = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth) {
      out.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

/* ───────── 殿宇 (复用 _shared.tangHall + 品牌牌匾) ───────── */

/* ───────── 品牌 logo 纹理共享缓存 + 立柱构建 ─────────
 *
 * 目标: 给每座殿门口立一根高大、可识别、稍带"古今穿越感"的 logo 柱.
 * 视觉构成 (从下到上):
 *   ① 石底座 (BoxGeometry 灰岩) + 雕花石框
 *   ② 红漆方柱 (Tang lacquer red, BoxGeometry)
 *   ③ 双面 logo 板 (真品牌 PNG + DoubleSide, 两侧都能看)
 *       · 板后再叠一层 emissive brand color 平面 — Bloom 加持 → 背光
 *       · 板四周薄金属包边 (BoxGeometry, brand.gold)
 *   ④ 唐风塔尖收顶 (Cone + 上下两层圆顶)
 * 整柱缓慢 Y 轴自转 (onBeforeRender 中按时间旋转 logo 板, 柱身不转)
 *
 * 用 SharedTextureLoader 防止 9 个馆各加载一次 logo PNG → 不必要的 IO/解码.
 */
const _textureLoader = new THREE.TextureLoader();
const _logoTextureCache = new Map();   // logoUrl → THREE.Texture

function getLogoTexture(logoUrl) {
  if (!logoUrl) return null;
  if (_logoTextureCache.has(logoUrl)) return _logoTextureCache.get(logoUrl);
  const tex = _textureLoader.load(logoUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  _logoTextureCache.set(logoUrl, tex);
  return tex;
}

/**
 * Logo 立柱. 返回 group, +z 为正面 (面向门厅方向).
 * 调用方负责 position + rotation.
 *
 * 整柱高 ~4u (= 40m), 略高于坊墙 3.5u 但低于馆顶, 不喧宾夺主.
 * brand: 数据条目 (含 logoUrl, brandColor, gold, accent).
 * featured: Agora 用, 体量放大 1.25x (但因 Agora 自己已是大殿, 立柱实际不在它前面).
 */
function buildLogoMonolith(brand, featured = false) {
  const g = new THREE.Group();
  g.name = `LogoMonolith:${brand.id}`;
  g.userData.brandId = brand.id;

  const scale = featured ? 1.25 : 0.55;       // 大幅缩小到与新馆尺寸匹配

  // ① 石底座 (灰岩, 厚 0.4u)
  const baseW = 2.8 * scale;
  const baseD = 1.4 * scale;
  const baseH = 0.4;
  const baseMat = new THREE.MeshLambertMaterial({ color: 0x6c6357 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), baseMat);
  base.position.y = baseH / 2;
  g.add(base);
  // 石底座上的雕花线 (两层薄盖板, 描金)
  for (const yOff of [baseH * 0.92, baseH * 0.08]) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(baseW * 1.04, 0.05, baseD * 1.04),
      new THREE.MeshLambertMaterial({ color: brand.gold || 0xd4a554, emissive: 0x2a1d08 }),
    );
    cap.position.y = yOff;
    g.add(cap);
  }

  // ② 红漆方柱
  const colW = 0.9 * scale;
  const colD = 0.7 * scale;
  const colH = 2.2 * scale;
  const colMat = new THREE.MeshLambertMaterial({
    color: brand.accent || 0xa8332f, emissive: 0x2a0a05, emissiveIntensity: 0.3,
  });
  const col = new THREE.Mesh(new THREE.BoxGeometry(colW, colH, colD), colMat);
  col.position.y = baseH + colH / 2;
  g.add(col);

  // ③ logo 板 — 双面真 logo
  const plateY = baseH + colH + 1.2 * scale;
  const plateSize = 2.0 * scale;
  const logoTex = getLogoTexture(brand.logoUrl);

  // logo 板群 — 让它自转, 这样玩家任意角度都能看见
  const plateGroup = new THREE.Group();
  plateGroup.name = `LogoPlate:${brand.id}`;
  plateGroup.position.y = plateY;
  plateGroup.userData.spinPlate = true;
  // 缓慢自转的回调 (在 onBeforeRender 里读时间)
  plateGroup.onBeforeRender = (function () {
    const t0 = performance.now();
    return function (renderer, scene, camera) {
      const t = (performance.now() - t0) * 0.0004;   // ~14s/turn
      plateGroup.rotation.y = t;
    };
  })();

  // 双面 logo plate
  const plateMat = new THREE.MeshBasicMaterial({
    map: logoTex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,           // 透明边沿不破坏后面物体的深度
  });
  if (!logoTex) {
    // fallback: 缺图就直接挂 latin 大字
    plateMat.map = makeBrandPlaqueTex(brand);
  }
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(plateSize, plateSize),
    plateMat,
  );
  plateGroup.add(plate);

  // 背景发光板 (略大, 品牌主色 emissive, 接 Bloom)
  const glowMat = new THREE.MeshBasicMaterial({
    color: brand.brandColor || brand.accent || 0xfff0c0,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(plateSize * 1.14, plateSize * 1.14),
    glowMat,
  );
  glow.position.z = -0.04;
  glow.renderOrder = -1;
  plateGroup.add(glow);

  // 金属包边 (4 条薄 box)
  const frameMat = new THREE.MeshLambertMaterial({
    color: brand.gold || 0xd4a554, emissive: 0x3a2810, emissiveIntensity: 0.6,
  });
  const fT = 0.08;
  const fH = plateSize + fT * 2;
  // 上下
  for (const sy of [-1, 1]) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(fH, fT, fT),
      frameMat,
    );
    bar.position.set(0, sy * (plateSize / 2 + fT / 2), 0);
    plateGroup.add(bar);
  }
  // 左右
  for (const sx of [-1, 1]) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(fT, plateSize, fT),
      frameMat,
    );
    bar.position.set(sx * (plateSize / 2 + fT / 2), 0, 0);
    plateGroup.add(bar);
  }
  // 4 个角的金钉
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(fT * 1.5, 10, 8),
      frameMat,
    );
    knob.position.set(sx * (plateSize / 2 + fT / 2), sy * (plateSize / 2 + fT / 2), 0);
    plateGroup.add(knob);
  }

  g.add(plateGroup);

  // ④ 唐风塔尖收顶
  const finialY = baseH + colH + plateSize + 1.1 * scale;
  const finialBase = new THREE.Mesh(
    new THREE.BoxGeometry(colW * 1.4, 0.16, colD * 1.4),
    frameMat,
  );
  finialBase.position.y = finialY - 0.5;
  g.add(finialBase);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(colW * 0.85, 0.9 * scale, 8),
    new THREE.MeshLambertMaterial({
      color: brand.accent || 0xa8332f, emissive: 0x3a0e08, emissiveIntensity: 0.4,
    }),
  );
  cone.position.y = finialY;
  g.add(cone);
  // 顶尖宝珠
  const pearl = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10),
    new THREE.MeshLambertMaterial({
      color: brand.gold || 0xd4a554, emissive: 0xffd680, emissiveIntensity: 0.8,
    }),
  );
  pearl.position.y = finialY + 0.7 * scale;
  g.add(pearl);

  // 一盏专属暖光 (照亮 logo 板, 黄昏感)
  const spot = new THREE.PointLight(
    brand.brandColor || brand.accent || 0xffd29a,
    featured ? 1.6 : 1.0,
    16,
    1.5,
  );
  spot.position.set(0, plateY, 1.5);
  g.add(spot);

  return g;
}

/**
 * 一座品牌殿宇 (唐风大殿). 返回 group, 默认 +z 为大门方向.
 * 调用方负责 .position.set + .rotation.y = face.
 */
function buildHall(brand, isFeatured) {
  const g = new THREE.Group();
  g.name = `BrandHall:${brand.id}`;
  g.userData.brandId = brand.id;

  const w = isFeatured ? HALL_W_F : HALL_W;
  const d = isFeatured ? HALL_D_F : HALL_D;
  const h = isFeatured ? HALL_H_F : HALL_H;

  // 唐风大殿 (来自 _shared) — 朱柱 / 屋瓦 / 三级阶 / 鸱吻
  const hall = tangHall({
    w, d, h,
    columns: isFeatured ? 7 : 5,
    tile: isFeatured ? PALETTE.tileImperialGreen : PALETTE.tileImperial,
    ridgeOrn: true,
    raisedBase: isFeatured ? 1.4 : 1.0,
  });
  g.add(hall);

  // 大殿正面: 双面品牌牌匾, 悬于斗拱下檐口
  const plaqueTex = makeBrandPlaqueTex(brand);
  const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true });
  const plaqueW = Math.min(w * 0.55, isFeatured ? 9 : 6);
  const plaqueH = isFeatured ? 2.0 : 1.4;
  const plaqueY = (isFeatured ? 1.4 : 1.0) + h + 0.6;  // base + cols + 一点檐口高
  const plaqueZ = d / 2 + 0.15;                          // 紧贴正面檐下
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(plaqueW, plaqueH),
    plaqueMat,
  );
  plaque.position.set(0, plaqueY, plaqueZ);
  g.add(plaque);

  // 朱漆门扉 (两扇, 中间一道缝隙暗示可入)
  const doorMat = new THREE.MeshLambertMaterial({
    color: brand.accent, emissive: brand.accent, emissiveIntensity: 0.15,
  });
  const baseH = isFeatured ? 1.4 : 1.0;
  const doorW = Math.min(w * 0.22, 2.6);
  const doorH = Math.min(h * 0.7, 3.4);
  for (const sx of [-1, 1]) {
    const dr = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.18),
      doorMat,
    );
    dr.position.set(sx * (doorW / 2 + 0.04), baseH + doorH / 2, d / 2 - 0.4);
    g.add(dr);
    // 门钉 (descript)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const nail = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 6, 6),
          new THREE.MeshLambertMaterial({ color: brand.gold, emissive: 0x4a3210 }),
        );
        nail.position.set(
          sx * (doorW / 2 + 0.04) + (col - 0.5) * doorW * 0.5,
          baseH + (row + 0.5) * doorH / 3,
          d / 2 - 0.3,
        );
        g.add(nail);
      }
    }
  }

  // 廊前悬挂宫灯一对
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xffd29a, emissive: 0xffc878, emissiveIntensity: 0.7,
  });
  for (const sx of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      lampMat,
    );
    lamp.position.set(sx * (w * 0.32), baseH + h * 0.55, d / 2 + 0.1);
    g.add(lamp);
  }

  // "F 入殿" 浮匾 (距殿门 1.6u, 始终朝向相机)
  const hintTex = makeDockerLabelTex(`F · 入 ${brand.brand}`);
  const hint = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.6),
    new THREE.MeshBasicMaterial({ map: hintTex, transparent: true, depthTest: false }),
  );
  hint.position.set(0, 1.2, d / 2 + 1.6);
  hint.renderOrder = 8;
  hint.onBeforeRender = function (renderer, scene, cam) {
    hint.lookAt(cam.position.x, hint.position.y, cam.position.z);
  };
  g.add(hint);

  // 地面引导光圈
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.6, 32),
    new THREE.MeshBasicMaterial({
      color: brand.accent,
      transparent: true,
      opacity: isFeatured ? 0.55 : 0.35,
      side: THREE.DoubleSide,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.04, d / 2 + 1.6);
  g.add(glow);

  // 殿前暖光 (PointLight, 黄昏感)
  const accentLight = new THREE.PointLight(brand.accent, isFeatured ? 1.6 : 1.0, 22, 1.6);
  accentLight.position.set(0, baseH + h * 0.7, d / 2 + 1.2);
  g.add(accentLight);

  // ★ 殿门前立 logo 立柱 (除 Agora 中央大殿外 — Agora 自身已大且居中, 不挂柱避免挡视线).
  // 玩家从远处就能"哦, 这是 X 馆!" 然后再走过去推门入殿.
  // 8 馆门朝中央, 立柱也在馆门前方 → 8 根立柱形成"中央广场环柱"自然 wayfinding 圈.
  if (!isFeatured) {
    const monolith = buildLogoMonolith(brand, false);
    monolith.position.set(0, 0, d / 2 + 2.2);   // 紧贴 F 提示 (d/2+1.6), 与新坊尺寸匹配
    g.add(monolith);
  }

  return g;
}

/* ───────── 朱雀大街指路大牌坊 ───────── */

function buildSuzakuSignpost() {
  const g = new THREE.Group();
  g.name = 'SuzakuBrandSignpost';

  // 主牌坊 (paifang, 朝东西向, 标题"天枢府"双面可见, 缩到中等)
  const sign = paifang({ w: 5, h: 4, text: '天 枢 府 · AI' });
  // 牌坊默认正面朝 +z, 我们要让玩家从朱雀大街南北行走时看到匾额 → 牌坊东西向(正面朝 +x)
  sign.rotation.y = -Math.PI / 2;
  g.add(sign);

  // 顶部增加一条副标长匾 (双面)
  const subTex = (() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 196;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#1a0e08');
    grad.addColorStop(1, '#0c0703');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#d4a554'; ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, c.width - 32, c.height - 32);
    ctx.fillStyle = '#f5d68b';
    ctx.font = 'bold 56px "Noto Serif SC","STKaiti",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AI 七坊 · 走向东庑', c.width / 2, 70);
    ctx.fillStyle = '#d4a554';
    ctx.font = '32px "STKaiti",serif';
    ctx.fillText('CLAUDE · GPT · DeepSeek · Kimi · MiniMax · Agora★', c.width / 2, 130);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  for (const sx of [1, -1]) {
    const sub = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.75),
      new THREE.MeshBasicMaterial({ map: subTex, transparent: true, side: THREE.DoubleSide }),
    );
    sub.position.set(sx * 0.55, 1.8, 0);
    sub.rotation.y = Math.PI / 2 * sx;
    g.add(sub);
  }

  // 一个向东的箭头石碑 (扁石牌, 红漆刻字)
  const arrow = new THREE.Group();
  const stoneMat = new THREE.MeshLambertMaterial({ color: PALETTE.stoneBase });
  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 1.0), stoneMat);
  stele.position.y = 0.8;
  arrow.add(stele);
  // 刻字红漆
  const arrowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 384;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#bba588'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#a8332f'; ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, c.width - 24, c.height - 24);
    ctx.fillStyle = '#a8332f';
    ctx.font = 'bold 56px "Noto Serif SC","STKaiti",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('天', 128, 90);
    ctx.fillText('枢', 128, 160);
    ctx.fillText('府', 128, 230);
    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = '#3a1810';
    ctx.fillText('→', 128, 320);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.4),
    new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true }),
  );
  face.position.set(0.21, 0.8, 0);
  face.rotation.y = Math.PI / 2;
  arrow.add(face);
  const face2 = face.clone();
  face2.position.x = -0.21; face2.rotation.y = -Math.PI / 2;
  arrow.add(face2);
  arrow.position.set(1.6, 0, 0);
  g.add(arrow);

  // 地面光带, 一路指引到坊西门 (坊在 x=38, 距 sign 30u)
  for (let i = 1; i <= 8; i++) {
    const r = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.25),
      new THREE.MeshBasicMaterial({
        color: 0xd4a554, transparent: true, opacity: 0.45 - i * 0.045, side: THREE.DoubleSide,
      }),
    );
    r.rotation.x = -Math.PI / 2;
    r.position.set(3 + i * 3.2, 0.06, 0);
    g.add(r);
  }

  g.position.copy(SUZAKU_SIGN_POS);
  return g;
}

/* ───────── 坊体 (坊墙 + 西门 + 角楼 + 中央广场) ───────── */

function buildCompoundShell() {
  const g = new THREE.Group();
  g.name = 'BrandWardShell';

  // 坊墙 (西+北开门, 复用 _shared.courtyardWall)
  const wall = courtyardWall({
    w: WARD_W, d: WARD_D, h: WARD_WALL_H, t: 1.4,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'W', width: WARD_GATE_WIDTH_W },
      { side: 'N', width: WARD_GATE_WIDTH_N },
    ],
  });
  g.add(wall);

  // 西门外 大牌坊 (玩家从朱雀大街靠近时先看到)
  const westGate = paifang({ w: 6, h: 4, text: '天 枢 府' });
  // 牌坊正面 +z, 转到南北向 → 朝东 (+x) - 但站在坊西门外, 让正面朝西 (-x) 给外面人看
  westGate.rotation.y = Math.PI / 2;
  westGate.position.set(-WARD_W / 2 - 2.4, 0, 0);
  g.add(westGate);

  // 西门两侧 一对石狮 (按比例缩小)
  const lionMat = new THREE.MeshLambertMaterial({ color: PALETTE.stoneBase });
  for (const sz of [-1, 1]) {
    const lion = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), lionMat);
    pedestal.position.y = 0.45;
    lion.add(pedestal);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x86735c }),
    );
    body.position.y = 1.1;
    lion.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x86735c }),
    );
    head.position.set(0, 1.5, 0.25);
    lion.add(head);
    lion.position.set(-WARD_W / 2 - 1.0, 0, sz * (WARD_GATE_WIDTH_W / 2 + 1.2));
    g.add(lion);
  }

  // 角楼 ×4 (城防感)
  const towerBaseMat = new THREE.MeshLambertMaterial({ color: PALETTE.wallBrick });
  const towerRoofMat = new THREE.MeshLambertMaterial({ color: PALETTE.tileGrey });
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) {
    const tower = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, WARD_WALL_H + 1.2, 2.4), towerBaseMat,
    );
    base.position.y = (WARD_WALL_H + 1.2) / 2;
    tower.add(base);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 1.4, 4),
      towerRoofMat,
    );
    roof.position.y = WARD_WALL_H + 1.2 + 0.7;
    roof.rotation.y = Math.PI / 4;
    tower.add(roof);
    tower.position.set(cx * (WARD_W / 2 - 0.5), 0, cz * (WARD_D / 2 - 0.5));
    g.add(tower);
  }

  // 坊整体台基: 0.3u 厚石台, 铺满坊内部 (留 1.4u 给坊墙厚度)
  // 给所有殿宇一个抬高 0.3u 的稳固基座, 馆/立柱不会再"飘"在地面外.
  const plazaW = WARD_W - 2.8;
  const plazaD = WARD_D - 2.8;
  const plazaH = 0.30;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(plazaW, plazaH, plazaD),
    new THREE.MeshLambertMaterial({ color: 0x6a5a44 }),
  );
  plinth.position.y = plazaH / 2;
  g.add(plinth);

  // 台面: 描金大方砖纹理
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(plazaW, plazaD),
    new THREE.MeshLambertMaterial({ color: 0x5a4e3c }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = plazaH + 0.005;
  g.add(plaza);

  // 中央 6×6 暗朱色焦点砖 (Agora 馆下面)
  const focusTile = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3826 }),
  );
  focusTile.rotation.x = -Math.PI / 2;
  focusTile.position.y = plazaH + 0.012;
  g.add(focusTile);

  // 描金圆环 (Agora 大殿正西门前 1.5u 处, 暗示玩家"对准这里向 Agora 走")
  const cgRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.7, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd4a554, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    }),
  );
  cgRing.rotation.x = -Math.PI / 2;
  cgRing.position.set(-7, plazaH + 0.02, 0);  // Agora 西门外 (Agora 在 dx=0, 朝-x, 门口在 -d/2-1 ≈ -4 + plate)
  g.add(cgRing);

  // 四角放路灯 (按坊缩到 22×17 范围)
  const lampGlowMat = new THREE.MeshLambertMaterial({
    color: 0xffd29a, emissive: 0xffc878, emissiveIntensity: 0.9,
  });
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) {
    const poleMat = new THREE.MeshLambertMaterial({ color: PALETTE.column });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.10, 3.4, 8),
      poleMat,
    );
    pole.position.set(cx * 21, 1.7, cz * 16);
    g.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 14, 10),
      lampGlowMat,
    );
    lamp.position.set(cx * 21, 3.5, cz * 16);
    g.add(lamp);
    const pl = new THREE.PointLight(0xffc878, 0.55, 12, 1.6);
    pl.position.set(cx * 21, 3.5, cz * 16);
    g.add(pl);
  }

  // 北部地刻"天枢府 · AI" (缩小到与新坊匹配)
  const aiCanvas = document.createElement('canvas');
  aiCanvas.width = 1024; aiCanvas.height = 256;
  {
    const ctx = aiCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, aiCanvas.width, aiCanvas.height);
    ctx.fillStyle = '#d4a554';
    ctx.globalAlpha = 0.85;
    ctx.font = 'bold 200px "Inter","Helvetica Neue",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('天 枢 府  ·  AI', aiCanvas.width / 2, aiCanvas.height / 2);
  }
  const aiTex = new THREE.CanvasTexture(aiCanvas);
  aiTex.colorSpace = THREE.SRGBColorSpace;
  const aiPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.4),
    new THREE.MeshBasicMaterial({ map: aiTex, transparent: true }),
  );
  aiPlate.rotation.x = -Math.PI / 2;
  aiPlate.position.set(0, plazaH + 0.03, -17);  // 北边坊墙内侧地刻
  g.add(aiPlate);

  g.position.copy(WARD_CENTER);
  return g;
}

/* ───────── 展馆内部 ───────── */

function buildInterior(brand, i) {
  const g = new THREE.Group();
  g.name = `BrandInterior:${brand.id}`;
  g.position.copy(brandInterior(i));

  const featured = !!brand.featured;
  const H = featured ? ROOM_H_FEATURED : ROOM_H;
  const R = featured ? ROOM_HALF_FEATURED : ROOM_HALF;

  // 地板 (深木 + 中央朱色地砖)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshLambertMaterial({ color: 0x4a2e1c }),
  );
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);
  const centerTile = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 1.0, R * 1.0),
    new THREE.MeshLambertMaterial({ color: brand.accent }),
  );
  centerTile.rotation.x = -Math.PI / 2;
  centerTile.position.y = 0.005;
  centerTile.material.opacity = 0.32;
  centerTile.material.transparent = true;
  g.add(centerTile);

  // 天花
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshLambertMaterial({ color: 0x2a1f16, side: THREE.BackSide }),
  );
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  // ── 北墙: Logo 主墙 ──
  const logoBuilt = makeLogoOnPlaqueTex(brand);
  _wallLogoCanvases[brand.id] = logoBuilt.canvas;
  // 优先用 built-in brand.logoUrl, 没有再 fallback 用户上传的 logoDataUrl
  const logoSrc = brand.logoUrl || brand.logoDataUrl;
  if (logoSrc) paintLogoOnTopOf(logoBuilt.canvas, logoBuilt.tex, logoSrc);
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: logoBuilt.tex, side: THREE.DoubleSide }),
  );
  northWall.position.set(0, H / 2, -R + 0.02);
  g.add(northWall);
  // Logo 墙下方一块小匾 (品牌中文 + Latin)
  const subPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 0.9, 0.7),
    new THREE.MeshBasicMaterial({ map: makeDockerLabelTex(brand.brand), transparent: true }),
  );
  subPlaque.position.set(0, 0.6, -R + 0.06);
  g.add(subPlaque);

  // ── 东墙: 品鉴介绍 ──
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: makeInfoTex(brand), side: THREE.DoubleSide }),
  );
  eastWall.position.set(R - 0.02, H / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  g.add(eastWall);

  // ── 西墙: 镇馆之宝 ──
  const westWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: makeHighlightsTex(brand), side: THREE.DoubleSide }),
  );
  westWall.position.set(-R + 0.02, H / 2, 0);
  westWall.rotation.y = Math.PI / 2;
  g.add(westWall);

  // ── 南墙: 入口墙 (素色 + 出门提示) ──
  const southWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshLambertMaterial({ color: 0x6a4a30 }),
  );
  southWall.position.set(0, H / 2, R - 0.02);
  southWall.rotation.y = Math.PI;
  g.add(southWall);
  // 出口提示
  const exitHint = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 0.7, 0.45),
    new THREE.MeshBasicMaterial({ map: makeDockerLabelTex('F · 出馆'), transparent: true }),
  );
  exitHint.position.set(0, 0.8, R - 0.07);
  exitHint.rotation.y = Math.PI;
  g.add(exitHint);

  // ── 中央 "智机使" 讲席站点 ──
  const dockerPos = new THREE.Vector3(0, 0, R * 0.45);    // 朝向北墙的位置
  // 朱漆讲席
  const lectern = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.1, 0.7),
    new THREE.MeshLambertMaterial({
      color: brand.accent, emissive: brand.accent, emissiveIntensity: 0.2,
    }),
  );
  lectern.position.set(dockerPos.x, 0.55, dockerPos.z);
  g.add(lectern);
  // 讲席台面 (描金)
  const lecternTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.78),
    new THREE.MeshLambertMaterial({ color: brand.gold, emissive: 0x4a3210, emissiveIntensity: 0.5 }),
  );
  lecternTop.position.set(dockerPos.x, 1.14, dockerPos.z);
  g.add(lecternTop);
  // 浮空名牌 "智机使"
  const dockerNameTex = makeDockerLabelTex('智 機 使');
  const dockerName = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 0.4),
    new THREE.MeshBasicMaterial({ map: dockerNameTex, transparent: true, depthTest: false }),
  );
  dockerName.position.set(dockerPos.x, 2.0, dockerPos.z);
  dockerName.renderOrder = 9;
  dockerName.onBeforeRender = (renderer, scene, cam) => {
    dockerName.lookAt(cam.position.x, dockerName.position.y, cam.position.z);
  };
  g.add(dockerName);
  // 站点光圈
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.15, 24),
    new THREE.MeshBasicMaterial({
      color: brand.gold, transparent: true, opacity: 0.65, side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(dockerPos.x, 0.02, dockerPos.z);
  g.add(ring);

  // ── 室内灯光 ──
  const central = new THREE.PointLight(0xffe0b0, 1.4, R * 4, 1.4);
  central.position.set(0, H - 0.6, 0);
  g.add(central);
  const accent = new THREE.PointLight(brand.accent, 0.9, R * 3, 1.6);
  accent.position.set(0, H * 0.45, -R * 0.5);
  g.add(accent);

  // ── Agora featured 特殊展品: 实时声波 ──
  if (brand.id === 'agora') {
    g.add(buildAgoraSoundwave(brand));
  }

  // 把世界坐标的 docker station 算出来 (interior.position 已 setPosition)
  const dockerWorld = dockerPos.clone().add(brandInterior(i));

  return { group: g, dockerWorld };
}

function buildAgoraSoundwave(brand) {
  /** 在中心地砖上方放一个旋转金环 + 6 个上下浮动柱 (模拟实时音频波形) */
  const ring = new THREE.Group();
  ring.name = 'AgoraSoundwave';

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.12, 12, 64),
    new THREE.MeshBasicMaterial({
      color: brand.gold,
      transparent: true, opacity: 0.7,
    }),
  );
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 0.9;
  ring.add(torus);

  // 6 根脉冲柱
  const barMat = new THREE.MeshBasicMaterial({
    color: brand.accent, transparent: true, opacity: 0.9,
  });
  const bars = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1, 0.18), barMat);
    bar.position.set(Math.cos(a) * 1.8, 0.5, Math.sin(a) * 1.8);
    ring.add(bar);
    bars.push({ bar, a });
  }

  // 中心宝珠 (会随说话脉动)
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 24),
    new THREE.MeshBasicMaterial({
      color: brand.gold,
      transparent: true, opacity: 0.85,
    }),
  );
  orb.position.y = 0.9;
  ring.add(orb);

  // tick: 在内部 onBeforeRender 用全局动画刷波形
  ring.onBeforeRender = function () {
    const t = performance.now() / 1000;
    const speaking = !!window.voiceAiSpeaking;
    torus.rotation.z = t * 0.4;
    for (const { bar, a } of bars) {
      const phase = Math.sin(t * (speaking ? 8 : 1.6) + a * 4);
      const sy = speaking ? 0.4 + Math.abs(phase) * 1.6 : 0.4 + (phase + 1) * 0.25;
      bar.scale.y = sy;
      bar.position.y = sy / 2;
    }
    const pulse = speaking ? 1 + Math.sin(t * 12) * 0.2 : 1 + Math.sin(t * 2) * 0.06;
    orb.scale.setScalar(pulse);
  };

  return ring;
}

/* ───────── HTML modal · 自定义品牌 ───────── */

function ensureModalCss() {
  if (document.getElementById('brand-plaza-css')) return;
  const css = document.createElement('style');
  css.id = 'brand-plaza-css';
  css.textContent = `
    .bp-modal-bg {
      position: fixed; inset: 0; z-index: 99990;
      background: rgba(15, 9, 4, 0.78);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Noto Serif SC','Songti SC','STKaiti',serif;
    }
    .bp-card {
      width: min(520px, 94vw);
      background: linear-gradient(180deg, #f5e8c8 0%, #ddc89a 100%);
      border: 2px solid #a8732a; border-radius: 4px;
      padding: 24px 28px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.4);
      color: #2c1810;
      max-height: 90vh; overflow-y: auto;
    }
    .bp-card h3 { margin: 0 0 6px; font-size: 22px; color: #6a2a1a; letter-spacing: 0.18em; }
    .bp-card .bp-sub { font-size: 11px; color: #6a4a2a; opacity: 0.8;
      letter-spacing: 0.18em; margin-bottom: 14px; }
    .bp-card label { display: block; font-size: 12px; color: #6a4a2a;
      letter-spacing: .14em; margin: 10px 0 4px; }
    .bp-card input[type=text], .bp-card textarea, .bp-card input[type=file] {
      width: 100%; box-sizing: border-box; padding: 10px 12px;
      background: rgba(255,255,255,0.6);
      border: 1px solid #a8732a; color: #2c1810;
      font-family: inherit; font-size: 14px; border-radius: 3px;
    }
    .bp-card textarea { min-height: 70px; resize: vertical; }
    .bp-row { display: flex; gap: 8px; margin-top: 14px; }
    .bp-btn { padding: 10px 16px; cursor: pointer;
      background: linear-gradient(180deg, #8a4a1c, #5a2a0c);
      color: #f5d890; border: 1px solid #d4a554;
      font-family: inherit; letter-spacing: 0.16em;
      border-radius: 3px; font-size: 13px;
    }
    .bp-btn.ghost { background: transparent; color: #6a4a2a; border-color: #a8732a; }
    .bp-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .bp-status { font-size: 12px; color: #6a4a2a; margin-top: 10px;
      letter-spacing: 0.12em; min-height: 1.2em; }
    .bp-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .bp-list-item { display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; background: rgba(168,115,42,0.1); border: 1px solid rgba(168,115,42,0.3);
      border-radius: 3px; font-size: 13px;
    }
    .bp-list-item .bp-del { background: transparent; border: none; color: #8a2818;
      cursor: pointer; font-size: 12px; letter-spacing: .1em;
    }
    .bp-list-item .bp-del:hover { text-decoration: underline; }
  `;
  document.head.appendChild(css);
}

let _modalEl = null;
function closeBrandModal() {
  if (_modalEl) {
    if (_modalEl._escHandler) document.removeEventListener('keydown', _modalEl._escHandler, true);
    _modalEl.remove();
    _modalEl = null;
  }
}

export function openCustomBrandModal() {
  ensureModalCss();
  closeBrandModal();
  const wrap = document.createElement('div');
  wrap.className = 'bp-modal-bg';

  const listHtml = loadCustomBrands().map((b) =>
    `<div class="bp-list-item">
      <span><b>${escapeHtml(b.brand)}</b> · ${escapeHtml(b.latin)}</span>
      <button class="bp-del" data-id="${b.id}">移除</button>
    </div>`
  ).join('') || '<div class="bp-sub">— 还没有自定义品牌 —</div>';

  wrap.innerHTML = `<div class="bp-card">
    <h3>建造你的品牌馆</h3>
    <div class="bp-sub">BUILD A BRAND PAVILION · 牌坊与展馆 30 秒生成</div>

    <label>中文牌名 (≤30 字)</label>
    <input type="text" id="bp-brand" placeholder="如: 通义千问">

    <label>Latin 拉丁字 (大字, ≤16)</label>
    <input type="text" id="bp-latin" placeholder="如: Qwen">

    <label>一行 Tagline (≤40)</label>
    <input type="text" id="bp-tag" placeholder="如: 阿里 · 多模态大模型">

    <label>Logo 图 (PNG/SVG/JPG, 可选)</label>
    <input type="file" id="bp-logo" accept="image/*">

    <label>一段简介 (90-300 字)</label>
    <textarea id="bp-blurb" placeholder="一段介绍, 进展馆时会喂给智机使做开场."></textarea>

    <div class="bp-row">
      <button class="bp-btn" id="bp-create">建造馆 · 跳到馆门</button>
      <button class="bp-btn ghost" id="bp-cancel">取消 · Esc</button>
    </div>
    <div class="bp-status" id="bp-status"></div>

    <label style="margin-top:18px;">已建造的自定义馆</label>
    <div class="bp-list" id="bp-list">${listHtml}</div>
  </div>`;
  document.body.appendChild(wrap);
  _modalEl = wrap;

  const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeBrandModal(); } };
  document.addEventListener('keydown', esc, true);
  wrap._escHandler = esc;
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeBrandModal(); });

  wrap.querySelector('#bp-cancel').onclick = closeBrandModal;
  wrap.querySelector('#bp-create').onclick = async () => {
    const brand = wrap.querySelector('#bp-brand').value.trim();
    const latin = wrap.querySelector('#bp-latin').value.trim();
    const tag   = wrap.querySelector('#bp-tag').value.trim();
    const blurb = wrap.querySelector('#bp-blurb').value.trim();
    const file  = wrap.querySelector('#bp-logo').files?.[0];
    const status = wrap.querySelector('#bp-status');
    if (!brand && !latin) { status.textContent = '至少填一个名字'; return; }
    status.textContent = '建造中…';
    try {
      const logoDataUrl = file ? await fileToDataUrl(file) : null;
      const added = addCustomBrand({
        brand, latin, tagline: tag, blurb, logoDataUrl,
      });
      refreshAll();
      status.textContent = '✅ 已建造 · 传送中';
      setTimeout(() => {
        closeBrandModal();
        gotoBrand(added.id);
      }, 700);
    } catch (e) {
      status.textContent = '失败: ' + e.message;
    }
  };
  wrap.querySelectorAll('.bp-del').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      removeCustomBrand(id);
      closeBrandModal();
      refreshAll();
      openCustomBrandModal();
    };
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

/* ───────── 公共入口 ───────── */

/** 内部 build all 函数: 建/重建 整个天枢府坊 + 所有殿宇 + 远岛 interiors. */
function buildAll() {
  if (!_root) {
    _root = new THREE.Group(); _root.name = 'BrandPlazaExteriors';
    _scene.add(_root);
  }
  if (!_interiorRoot) {
    _interiorRoot = new THREE.Group(); _interiorRoot.name = 'BrandPlazaInteriors';
    _scene.add(_interiorRoot);
  }

  // 清空重建
  for (const child of [..._root.children]) _root.remove(child);
  for (const child of [..._interiorRoot.children]) _interiorRoot.remove(child);
  for (const k of Object.keys(_byId)) delete _byId[k];

  // ① 坊体 (墙 + 西门牌坊 + 角楼 + 中央广场)
  const shell = buildCompoundShell();
  _root.add(shell);

  // ② 朱雀大街指路大牌坊
  const signpost = buildSuzakuSignpost();
  _root.add(signpost);

  // ③ 殿宇 (7 内置 + 自定义)
  const brands = allBrands();
  let customIdx = 0;
  brands.forEach((brand, i) => {
    const isFeatured = !!brand.featured;
    const layout = brand.custom
      ? layoutFor(brand, customIdx++)
      : (HALL_LAYOUTS[brand.id] || layoutFor(brand, customIdx++));

    // 单座殿宇 (本地坐标), 加到坊壳里 → 自动跟着坊整体偏移
    // 抬高 0.30m → 站在 buildCompoundShell 铺的整片台基 plinth 顶上, 馆 + logo 立柱都不会再"飘空"
    const hall = buildHall(brand, isFeatured);
    hall.position.set(layout.dx, 0.30, layout.dz);
    hall.rotation.y = layout.face;
    shell.add(hall);

    // 室内 (远岛 floating room)
    const { group: interior, dockerWorld } = buildInterior(brand, i);
    _interiorRoot.add(interior);

    // 计算殿门世界坐标 (玩家走到这里出现 'F 入殿')
    const depth = isFeatured ? HALL_D_F : HALL_D;
    const doorWorld = doorWorldFor(layout, depth);

    _byId[brand.id] = {
      brand,
      i,
      doorPos: doorWorld,
      interiorCenter: brandInterior(i),
      dockerWorld,
      exteriorGroup: hall,
      interiorGroup: interior,
      layout,
    };
  });
}

export function install({ scene, gameState }) {
  if (_installed) return;
  _scene = scene; _gameState = gameState;
  buildAll();
  // 自定义品牌变动时重建
  window.addEventListener('han-brand-added',   () => refreshAll());
  window.addEventListener('han-brand-removed', () => refreshAll());
  // 暴露 modal 给全局 (?action=brand 等深链)
  if (typeof window !== 'undefined') {
    window.openCustomBrandModal = openCustomBrandModal;
    // URL deep link: ?action=brand 或 ?action=brand:xxx
    const params = new URLSearchParams(window.location.search);
    const act = params.get('action') || '';
    if (act === 'brand' || act === 'brands') {
      setTimeout(() => openCustomBrandModal(), 800);
    } else if (act.startsWith('brand:')) {
      const bid = act.slice(6);
      setTimeout(() => gotoBrand(bid), 800);
    }
  }
  // HUD 一个小小的"建馆"浮钮 (默认右下, 不挡 polaroid)
  installHudButton();
  _installed = true;
  console.info(
    '[BrandPlaza] 天枢府 installed at',
    `(${WARD_CENTER.x}, ${WARD_CENTER.z})`,
    `· ${WARD_W}×${WARD_D}m · brands=`,
    Object.keys(_byId),
  );
}

function installHudButton() {
  if (document.getElementById('bp-hud-btn')) return;
  const css = document.createElement('style');
  css.textContent = `
    #bp-hud-btn {
      position: fixed; right: 18px; bottom: 88px; z-index: 99980;
      padding: 8px 14px; border-radius: 22px;
      background: linear-gradient(180deg, rgba(168,51,47,0.95), rgba(80,18,12,0.95));
      color: #f5d68b; border: 1.5px solid #d4a554;
      font-family: "Noto Serif SC","STKaiti",serif;
      font-size: 12px; letter-spacing: .18em;
      cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,.5);
      transition: transform .15s, box-shadow .15s;
      display: flex; align-items: center; gap: 6px;
    }
    #bp-hud-btn:hover { transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(0,0,0,.7), 0 0 12px rgba(212,165,84,.4); }
    #bp-hud-btn .bp-dot { width: 6px; height: 6px; border-radius: 50%;
      background: #ffc878; box-shadow: 0 0 8px #ffc878; }
  `;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.id = 'bp-hud-btn';
  btn.type = 'button';
  btn.innerHTML = `<span class="bp-dot"></span>🪧 建你的品牌馆`;
  btn.title = '建造一座新的 AI 品牌展馆 (上传 Logo / 文字介绍)';
  btn.onclick = openCustomBrandModal;
  document.body.appendChild(btn);
}

/** 重建所有几何 (自定义品牌变动后) — 同时通知 scene.js 更新 doors / galleries */
export function refreshAll() {
  if (!_installed) return;
  buildAll();
  // 通知 scene.js 更新 GALLERY_DOORS / GALLERIES (由 scene.js 端监听)
  window.dispatchEvent(new CustomEvent('han-brand-plaza-changed', {
    detail: { doors: getDoors(), defs: getGalleryDefs() },
  }));
}

/** 给 scene.js GALLERY_DOORS 用 */
export function getDoors() {
  return Object.values(_byId).map(({ brand, doorPos }) => ({
    id: brand.id,
    pos: doorPos.clone(),
    label: brand.brand,
    isBrandPavilion: true,
  }));
}

/** 给 scene.js GALLERIES 用 */
export function getGalleryDefs() {
  const out = {};
  for (const { brand, i, interiorCenter } of Object.values(_byId)) {
    out[brand.id] = {
      title: brand.brand,
      center: interiorCenter.clone(),
      halfSize: brand.featured ? ROOM_HALF_FEATURED : ROOM_HALF,
      isBrandPavilion: true,
      brandId: brand.id,
    };
  }
  return out;
}

/** scene.js enterGallery(id) 调 — 切换语音面板, 投递 [场景提示] */
export function beginEnter(id) {
  const item = _byId[id];
  if (!item) return;
  const brand = item.brand;
  const voice = personaForBrand(brand);
  _currentDocker = null;

  // 1) 立刻打开当前品牌的专属"智机使·X 派"语音面板 (iframe 暖机 ~4-5s)
  if (typeof window.openBrandDocentPanel === 'function') {
    window.openBrandDocentPanel(voice);
  } else if (typeof window.openDocentPanel === 'function') {
    window.openDocentPanel();
  }
  // 2) 4.5s 后再投递 [场景提示] (等 ConvoAI agent join channel)
  const cue = brandCue(brand);
  setTimeout(() => {
    if (typeof window.emitBrandDocentContext === 'function') {
      window.emitBrandDocentContext('brand:' + id, cue, { debounceMs: 800, personaId: voice.personaId });
    } else if (typeof window.emitDocentContext === 'function') {
      window.emitDocentContext('brand:' + id, cue, { debounceMs: 800 });
    }
  }, 4500);
}

export function beginExit(id) {
  _currentDocker = null;
}

function brandCue(brand) {
  // 拼一段塞给 docent 的 [场景提示]
  const highlights = (brand.highlights || []).slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('  ');
  return (
    `[场景提示] 你现在不是讲画的苏阮卿, 而是"智机使" — 长安的未来使节, 通晓古今 AI. ` +
    `客人推门进了"${brand.brand}"展馆${brand.featured ? '(本街镇馆 featured)' : ''}. ` +
    `这是该派系的简介: ${brand.blurb || '(暂缺)'} ` +
    `镇馆三/五宝: ${highlights || '(暂缺)'} ` +
    brand.personaCue + ' ' +
    `请你用 90-130 字一段连贯欢迎辞, 不换行、不列点, ` +
    `先一句招呼 + 一句把品牌核心讲透 + 一句点出"鎮館之寶可移步细看" + 收一句"客有何想问的". ` +
    `允许保持一点唐人风骨, 但术语 (model / tokens / RTC / TTS / ConvoAI / MoE 等) 用中英混搭直说, 不要硬翻.`
  );
}

/** 给当前最近的讲解员站点上贴 prompt (动画循环里调) */
export function tickDocker(playerWorldPos) {
  if (!_installed || !_gameState || _gameState.viewMode !== 'gallery') return;
  const galleryId = _gameState.galleryId;
  const item = _byId[galleryId];
  if (!item) { _currentDocker = null; return; }
  const dx = item.dockerWorld.x - playerWorldPos.x;
  const dz = item.dockerWorld.z - playerWorldPos.z;
  const d = Math.hypot(dx, dz);
  _currentDocker = (d < 2.5) ? item : null;

  const prompt = document.getElementById('doorPrompt');
  if (!prompt) return;
  if (_currentDocker) {
    prompt.innerHTML = `<span class="kbd">E</span> 问 <b>智機使</b>`;
    prompt.classList.add('show');
  } else {
    // 不要无脑 .remove('show'), 让 scene.js 别的 prompt 系统接手
    if (prompt.innerHTML.indexOf('智機使') >= 0) prompt.classList.remove('show');
  }
}

export function isDockerActive() { return !!_currentDocker; }

/** E 触发 (玩家在站点 + 已是 gallery 模式) — 强行重新投递 cue, 让讲解员马上开口 */
export function interactDocker() {
  if (!_currentDocker) return false;
  const brand = _currentDocker.brand;
  const voice = personaForBrand(brand);
  if (typeof window.openBrandDocentPanel === 'function') {
    window.openBrandDocentPanel(voice);
  } else if (typeof window.openDocentPanel === 'function') {
    window.openDocentPanel();
  }
  const cue =
    `[场景提示] 客人主动靠近讲席问你 (智机使) — 重述 "${brand.brand}" 最有意思的一两件镇馆之宝, ` +
    `30-50 字一段, 然后反问 "客欲细听何件".`;
  if (typeof window.emitBrandDocentContext === 'function') {
    window.emitBrandDocentContext('brand:' + brand.id + ':ask', cue, { debounceMs: 500, personaId: voice.personaId });
  } else if (typeof window.emitDocentContext === 'function') {
    window.emitDocentContext('brand:' + brand.id + ':ask', cue, { debounceMs: 500 });
  }
  return true;
}

/** 统一传送入口: WASD 已开 → 传送到牌坊下; 没开 → 触发 CTA + pending */
let _pendingTeleport = null;

export function gotoBrand(id) {
  const item = _byId[id];
  if (!item) {
    if (typeof window.showGameToast === 'function') window.showGameToast('没找到 ' + id + ' 馆', 2500);
    return false;
  }
  if (window.gameState && window.gameState.active) {
    // 把玩家放到殿门正前 (距门 0.5m, 玩家正面朝殿门方向)
    // doorPos 已经在殿门前 3.2m, 我们把玩家放在 doorPos 再往前 0.5m, 朝向殿门即可.
    const layout = item.layout || HALL_LAYOUTS[id] || { face: 0 };
    // 殿门朝向 face: 玩家应面朝相反方向 (面对殿门).
    const playerFacing = layout.face + Math.PI;
    window.gameState.pos.set(item.doorPos.x, 0.05, item.doorPos.z);
    window.gameState.facing = playerFacing;
    if (window.gameState.player) window.gameState.player.position.copy(window.gameState.pos);
    if (typeof window.showGameToast === 'function') {
      window.showGameToast(`已至 ${item.brand.brand} 殿前 · 按 F 入殿`, 3000);
    }
    return true;
  }
  // 没开游戏: 等开
  _pendingTeleport = id;
  const cta =
    document.querySelector('.enter-game-cta') ||
    document.getElementById('enter-game-cta') ||
    document.getElementById('gameBtn');
  if (cta) {
    cta.click();
    if (typeof window.showGameToast === 'function') {
      window.showGameToast(`选好角色后将自动前往 ${item.brand.brand} 馆`, 4500);
    }
    return true;
  }
  return false;
}

export function consumePendingTeleport() {
  if (!_pendingTeleport) return false;
  const id = _pendingTeleport;
  _pendingTeleport = null;
  setTimeout(() => gotoBrand(id), 800);
  return true;
}

/* ───────── debug api ───────── */
export function _debug() {
  return { ids: Object.keys(_byId), doors: getDoors() };
}
