/**
 * Atelier · 丹青閣 — DIY 创作区
 *
 * 在 diegetic 鸟瞰广场之外, 留一座单独的小院, 是用户的 "私人画室":
 *   - 6 个空画框 — 用户可上传 / AI 生成 / 语音生图 填满
 *   - 一张工作台 — 进入工坊面板 (HTML overlay)
 *   - 三只丹青缸 — 颜色按 era 调色
 *
 * 三种创作路径 (都会写到 GALLERY 数据 + 同步到 3D 画框):
 *   1. 上传图片  ← <input type=file>
 *   2. 文字生图  ← 调用 OpenAI Images API (备用 mock)
 *   3. 语音生图  ← 召唤 docent persona, 接收 transcript 后再走 #2
 *
 * Polaroid (拍立得) 由 lib/ui/polaroid.js 实现, atelier 顶部有一个 "拍立得" 按钮.
 *
 * 公开:
 *   buildAtelierProp({ parent, registerClickable })  - 3D 入口 (一个石坊)
 *   openAtelier()  - 打开 HTML 操作面板
 *   closeAtelier()
 *   addArtwork({ src, title, mode, prompt })  - 给画框塞东西
 *   listArtworks()
 */

import * as THREE from 'three';
import { worldBounds } from './grid.js';
import { snapPolaroid } from '../ui/polaroid.js?v=20260526-v30';

/* ─── 画作存储 (localStorage 持久) ─── */
const STORAGE_KEY = 'han.atelier.artworks.v1';
const FRAMES_COUNT = 6;

function loadArtworks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}
function saveArtworks(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-FRAMES_COUNT)));
  } catch (e) {
    console.warn('[Atelier] saveArtworks failed (quota?)', e);
  }
}

let artworks = loadArtworks();
let atelierGroup = null;
const frameMeshes = [];   // 索引 0..5 → 3D 画框 mesh
let frameOverlay = null;  // HTML overlay 引用

/* ─── 3D 入口 prop ─── */
export function buildAtelierProp({ parent, registerClickable }) {
  const g = new THREE.Group();
  g.name = 'AtelierPortal';
  g.userData.kind = 'atelier-portal';

  const b = worldBounds();
  // 放在沙盘的东侧, 与 voice-bell (西) 对称, 与 ding (z+50) 错开
  const x = 270, z = b.maxZ + 100;

  /* 1) 石基 */
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(36, 4, 28),
    new THREE.MeshLambertMaterial({ color: 0xb3a07a }),
  );
  base.position.set(x, 2, z);
  base.userData.kind = 'atelier-portal';
  g.add(base);

  /* 2) 朱漆方坊 (小, 一柱顶, 标"丹青閣") */
  const POSTS = [-13, 13];
  for (const dx of POSTS) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.8, 30, 10),
      new THREE.MeshLambertMaterial({ color: 0xa8332f, emissive: 0x3a1010, emissiveIntensity: 0.25 }),
    );
    post.position.set(x + dx, 19, z);
    post.userData.kind = 'atelier-portal';
    g.add(post);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2.5, 4.5),
      new THREE.MeshLambertMaterial({ color: 0xd4a554, emissive: 0x4a3210, emissiveIntensity: 0.4 }),
    );
    cap.position.set(x + dx, 35, z);
    cap.userData.kind = 'atelier-portal';
    g.add(cap);
  }
  // 横梁
  for (const [yOff, w, color] of [
    [0,   28, 0xa8332f],
    [4,   28, 0xd4a554],
    [8,   30, 0xa8332f],
  ]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2, 3),
      new THREE.MeshLambertMaterial({ color, emissive: 0x3a1010, emissiveIntensity: 0.25 }),
    );
    beam.position.set(x, 34 + yOff, z);
    beam.userData.kind = 'atelier-portal';
    g.add(beam);
  }

  /* 3) 中央"丹青閣"大匾 */
  const titleTex = makePlaqueTex('丹 青 閣', '提筆即成 · 自寫一幅');
  const titlePlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 7),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, depthWrite: false }),
  );
  titlePlaque.position.set(x, 25, z + 0.5);
  titlePlaque.userData.kind = 'atelier-portal';
  g.add(titlePlaque);

  /* 4) 6 个画框立在基座两侧 - 这是预览的 3D 画框 */
  const FRAME_POSITIONS = [
    { x: x - 22, z: z + 18, rotY: 0 },
    { x: x + 22, z: z + 18, rotY: 0 },
    { x: x - 22, z: z - 6, rotY: Math.PI },
    { x: x + 22, z: z - 6, rotY: Math.PI },
    { x: x,      z: z + 24, rotY: 0 },
    { x: x,      z: z - 12, rotY: Math.PI },
  ];
  frameMeshes.length = 0;
  FRAME_POSITIONS.forEach((p, i) => {
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(1, 12, 1),
      new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),
    );
    stand.position.set(p.x, 6, p.z);
    stand.userData.kind = 'atelier-portal';
    g.add(stand);

    // 框
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(10, 8, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x4a3220 }),
    );
    frame.position.set(p.x, 14, p.z);
    frame.rotation.y = p.rotY;
    frame.userData.kind = 'atelier-portal';
    frame.userData.frameIndex = i;
    g.add(frame);

    // 画面 (默认 = 空白宣纸)
    const blankTex = makeBlankTex();
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 7),
      new THREE.MeshBasicMaterial({ map: blankTex, transparent: false }),
    );
    art.position.set(
      p.x + Math.sin(p.rotY) * 0.35,
      14,
      p.z + Math.cos(p.rotY) * 0.35,
    );
    art.rotation.y = p.rotY;
    art.userData.kind = 'atelier-portal';
    art.userData.isAtelierArt = true;
    art.userData.frameIndex = i;
    g.add(art);
    frameMeshes.push({ frame, art });
  });

  /* 5) 工作台 (一张矮石桌 + 朱漆笔筒) */
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.6, 5),
    new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
  );
  desk.position.set(x, 5, z);
  desk.userData.kind = 'atelier-portal';
  g.add(desk);
  const inkstone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.8, 0.6, 12),
    new THREE.MeshLambertMaterial({ color: 0x1a1410 }),
  );
  inkstone.position.set(x - 3, 6, z);
  g.add(inkstone);
  const brushHolder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8),
    new THREE.MeshLambertMaterial({ color: 0xa8332f, emissive: 0x3a1010, emissiveIntensity: 0.3 }),
  );
  brushHolder.position.set(x + 3, 7, z);
  g.add(brushHolder);
  // 三支毛笔
  for (let i = 0; i < 3; i++) {
    const brush = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6),
      new THREE.MeshLambertMaterial({ color: 0xd4a554 }),
    );
    brush.position.set(x + 3 + (i - 1) * 0.18, 8.5, z + (i - 1) * 0.1);
    g.add(brush);
  }

  /* 6) 召唤光柱 (微闪) */
  const beacon = new THREE.Mesh(
    new THREE.RingGeometry(2, 14, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf2d68b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beacon.position.set(x, 4.2, z);
  beacon.rotation.x = -Math.PI / 2;
  g.add(beacon);

  /* 7) 鸟瞰头牌 sprite */
  const headSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeBigHeadTex('🖌 丹青閣', '提筆即成 · 自寫一幅'), transparent: true, depthTest: false }),
  );
  headSprite.position.set(x, 52, z);
  headSprite.scale.set(56, 14, 1);
  headSprite.renderOrder = 998;
  headSprite.userData.kind = 'atelier-portal';
  g.add(headSprite);

  /* 8) 局部暖色 PointLight, 让画框透光易识 */
  const warmLight = new THREE.PointLight(0xf2d68b, 1.6, 110, 1.5);
  warmLight.position.set(x, 28, z);
  g.add(warmLight);

  registerClickable(g, { id: 'atelier-portal' });
  parent.add(g);
  atelierGroup = g;

  /* 同步初始 artworks 到画框 */
  refreshFrameTextures();

  return { group: g };
}

/* ─── HTML 工坊面板 (overlay) ─── */
function installAtelierOverlay() {
  if (document.getElementById('atelier-overlay')) return;

  const wrap = document.createElement('div');
  wrap.id = 'atelier-overlay';
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:99995; display:none;
    background:radial-gradient(circle at center, rgba(20,12,6,.86), rgba(0,0,0,.95));
    backdrop-filter:blur(8px);
    color:#f5d68b; font-family:"Noto Serif SC","Songti SC",serif;
    overflow:auto;
  `;

  const style = document.createElement('style');
  style.textContent = `
    #atelier-overlay { animation: at-fade .35s ease; }
    @keyframes at-fade { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
    #atelier-overlay .at-bar {
      position:sticky; top:0; padding:16px 24px;
      display:flex; align-items:center; gap:18px; justify-content:space-between;
      background:linear-gradient(180deg,rgba(20,12,6,.96),rgba(20,12,6,.7));
      border-bottom:1px solid #4a3624;
      z-index:2;
    }
    #atelier-overlay .at-title {
      font-size:28px; font-weight:600; letter-spacing:.22em;
      text-shadow:0 0 24px rgba(212,165,84,.35);
    }
    #atelier-overlay .at-sub { color:#9a8060; font-size:12px; letter-spacing:.25em; }
    #atelier-overlay .at-close {
      width:42px; height:42px; border-radius:50%;
      border:1.5px solid #d4a554; background:#2a1a10;
      color:#f5d68b; font-size:22px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:transform .15s, background .15s;
    }
    #atelier-overlay .at-close:hover { transform:rotate(90deg); background:#3a2018; }

    #atelier-overlay .at-grid {
      display:grid; grid-template-columns: 360px 1fr; gap:24px;
      padding:24px;
      max-width:1400px; margin:0 auto;
    }
    @media (max-width:900px) {
      #atelier-overlay .at-grid { grid-template-columns: 1fr; }
    }

    #atelier-overlay .at-card {
      background:linear-gradient(180deg,#2a1a10ee,#0e0805ee);
      border:1.5px solid #4a3624;
      border-radius:14px; padding:18px 18px 14px;
    }
    #atelier-overlay .at-card h3 {
      margin:0 0 8px; font-size:18px; letter-spacing:.14em;
      color:#f5d68b; font-weight:600;
    }
    #atelier-overlay .at-card p { color:#c5a878; font-size:13px; line-height:1.55; margin:0 0 12px; }
    #atelier-overlay .at-action {
      width:100%; padding:11px 18px;
      border:1.5px solid #d4a554; border-radius:8px;
      background:linear-gradient(180deg,#3a2418,#1a0e08);
      color:#f5d68b; font-family:inherit; font-size:14px; font-weight:600;
      letter-spacing:.1em; cursor:pointer; text-align:center;
      transition:transform .15s, box-shadow .15s, border-color .15s;
      margin-bottom:8px;
    }
    #atelier-overlay .at-action:hover {
      transform:translateY(-1px);
      box-shadow:0 8px 18px rgba(0,0,0,.65), 0 0 0 2px rgba(212,165,84,.25);
      border-color:#f5d68b;
    }
    #atelier-overlay .at-input {
      width:100%; box-sizing:border-box; padding:10px 12px;
      background:#1a0e08; border:1px solid #4a3624; border-radius:6px;
      color:#f5d68b; font-family:inherit; font-size:13px;
      margin-bottom:8px;
    }
    #atelier-overlay .at-input:focus { outline:none; border-color:#d4a554; }
    #atelier-overlay textarea.at-input { min-height:80px; resize:vertical; }

    #atelier-overlay .at-frames {
      display:grid; grid-template-columns: repeat(3, 1fr); gap:18px;
    }
    #atelier-overlay .at-frame {
      aspect-ratio: 4/3;
      background:linear-gradient(180deg,#3a2418,#1a0e08);
      border:6px solid #4a3220;
      border-radius:6px; padding:0;
      position:relative; overflow:hidden;
      cursor:pointer;
      box-shadow:0 8px 24px rgba(0,0,0,.55), inset 0 0 0 1px #d4a554;
      transition:transform .18s, box-shadow .18s;
    }
    #atelier-overlay .at-frame:hover { transform:translateY(-3px); box-shadow:0 18px 36px rgba(0,0,0,.7), inset 0 0 0 1px #f5d68b; }
    #atelier-overlay .at-frame img {
      width:100%; height:100%; object-fit:cover; display:block;
    }
    #atelier-overlay .at-frame .at-fcap {
      position:absolute; bottom:0; left:0; right:0; padding:6px 10px;
      background:linear-gradient(0deg,rgba(0,0,0,.75),transparent);
      color:#f5d68b; font-size:11px; letter-spacing:.1em;
    }
    #atelier-overlay .at-frame.empty {
      display:flex; align-items:center; justify-content:center;
      color:#6a5a3e; font-size:32px;
      background:repeating-linear-gradient(45deg,#1a0e08,#1a0e08 6px,#221a10 6px,#221a10 12px);
    }
    #atelier-overlay .at-toast {
      position:fixed; top:84px; left:50%; transform:translateX(-50%);
      padding:9px 18px; background:#3a2418; color:#f5d68b;
      border:1px solid #d4a554; border-radius:24px;
      letter-spacing:.1em; font-size:13px;
      z-index:3; opacity:0; transition:opacity .25s, transform .25s;
    }
    #atelier-overlay .at-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  `;
  document.head.appendChild(style);

  wrap.innerHTML = `
    <div class="at-bar">
      <div>
        <div class="at-title">丹 青 閣 · ATELIER</div>
        <div class="at-sub">UPLOAD / GENERATE / SNAPSHOT — 自寫一幅, 與AI共創</div>
      </div>
      <button class="at-close" id="atelier-close" type="button" aria-label="关闭">×</button>
    </div>
    <div class="at-grid">
      <div>
        <div class="at-card">
          <h3>① 上傳你的圖</h3>
          <p>從相冊選一張畫, 它將同步出現在右側畫框 + 3D 場景的丹青閣裡.</p>
          <input type="file" id="atelier-upload" accept="image/*" style="display:none">
          <button class="at-action" id="atelier-btn-upload">📂 選取本地圖片</button>
        </div>

        <div class="at-card" style="margin-top:14px;">
          <h3>② 文字生圖 (AI)</h3>
          <p>描述你想看到的長安景象, AI 為你生成一幅畫. 範例: "夕陽下的曲江池, 一隻白鶴掠水"</p>
          <textarea class="at-input" id="atelier-prompt" placeholder="夕陽 · 曲江池 · 白鶴掠水 · 唐風"></textarea>
          <button class="at-action" id="atelier-btn-generate">🖌 提筆生圖</button>
        </div>

        <div class="at-card" style="margin-top:14px;">
          <h3>③ 語音生圖</h3>
          <p>召喚畫學博士 苏阮卿. 對她說你想畫的場景, 她會聽寫並為你生圖.</p>
          <button class="at-action" id="atelier-btn-voice">🔔 召喚 苏阮卿 語音對話</button>
        </div>

        <div class="at-card" style="margin-top:14px;">
          <h3>④ 拍立得留念</h3>
          <p>把當前場景做一張拍立得 · 自動印上今日日期 · 可下載/收藏.</p>
          <button class="at-action" id="atelier-btn-polaroid">📸 拍立得</button>
        </div>
      </div>

      <div>
        <h3 style="margin:4px 0 14px; letter-spacing:.16em;">畫廊 · 6 个画框</h3>
        <div class="at-frames" id="atelier-frames"></div>
      </div>
    </div>

    <div class="at-toast" id="atelier-toast"></div>
  `;
  document.body.appendChild(wrap);

  /* 绑定行为 */
  document.getElementById('atelier-close').onclick = closeAtelier;

  // 上传
  const fileInput = document.getElementById('atelier-upload');
  document.getElementById('atelier-btn-upload').onclick = () => fileInput.click();
  fileInput.onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      atelierToast('请选图片文件');
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    addArtwork({ src: dataUrl, title: f.name.replace(/\.[^.]+$/, ''), mode: 'upload' });
    atelierToast('✅ 已上墙');
  };

  // 文字生图
  document.getElementById('atelier-btn-generate').onclick = async () => {
    const prompt = document.getElementById('atelier-prompt').value.trim();
    if (!prompt) { atelierToast('先写几个字'); return; }
    atelierToast('AI 提筆中…');
    try {
      const dataUrl = await aiGenerateImage(prompt);
      addArtwork({ src: dataUrl, title: prompt.slice(0, 18), mode: 'ai', prompt });
      atelierToast('🖌 已完成');
    } catch (e) {
      atelierToast('生图失败: ' + e.message);
    }
  };

  // 语音生图
  document.getElementById('atelier-btn-voice').onclick = () => {
    if (typeof window.openVoicePanel === 'function') {
      window.openVoicePanel({
        userData: {
          personaId: 'docent',
          displayName: '苏阮卿 · 画学博士',
          subtitle: '你说你想画什么',
        },
      });
      atelierToast('🔔 召唤完成 · 直接说"画一幅..."');
    } else {
      atelierToast('语音系统未就绪');
    }
  };

  // 拍立得
  document.getElementById('atelier-btn-polaroid').onclick = () => {
    snapPolaroid();
    atelierToast('📸 拍立得已生成 (左下角)');
  };

  // 渲染初始画框
  renderFrames();

  frameOverlay = wrap;

  // Esc 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.style.display !== 'none') {
      e.stopPropagation();
      closeAtelier();
    }
  }, true);
}

function renderFrames() {
  const grid = document.getElementById('atelier-frames');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < FRAMES_COUNT; i++) {
    const aw = artworks[i];
    const frame = document.createElement('div');
    frame.className = 'at-frame' + (aw ? '' : ' empty');
    frame.dataset.idx = i;
    if (aw) {
      frame.innerHTML = `
        <img src="${aw.src}" alt="${aw.title || ''}">
        <div class="at-fcap">${aw.title || ''} · ${aw.mode === 'upload' ? '我上傳' : aw.mode === 'ai' ? 'AI生成' : aw.mode === 'voice' ? '语音' : ''}</div>
      `;
    } else {
      frame.textContent = '空';
    }
    grid.appendChild(frame);
  }
}

function atelierToast(text) {
  const t = document.getElementById('atelier-toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(atelierToast._t);
  atelierToast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ─── API ─── */

export function openAtelier() {
  installAtelierOverlay();
  const wrap = document.getElementById('atelier-overlay');
  if (wrap) wrap.style.display = 'block';
  renderFrames();
}
export function closeAtelier() {
  const wrap = document.getElementById('atelier-overlay');
  if (wrap) wrap.style.display = 'none';
}

export function addArtwork({ src, title, mode, prompt }) {
  const aw = { src, title, mode, prompt, date: new Date().toISOString() };
  // 滚动队列, 最多保留 FRAMES_COUNT 张
  artworks = [aw, ...artworks].slice(0, FRAMES_COUNT);
  saveArtworks(artworks);
  renderFrames();
  refreshFrameTextures();
  // 通知 polaroid 系统 (可选)
  window.dispatchEvent(new CustomEvent('han-atelier-artwork-added', { detail: aw }));
}

export function listArtworks() { return artworks.slice(); }

/* ─── 同步 3D 画框纹理 ─── */
function refreshFrameTextures() {
  frameMeshes.forEach((fm, i) => {
    const aw = artworks[i];
    if (!aw) return;
    // 加载图片 → CanvasTexture
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 384;
      const ctx = c.getContext('2d');
      // 裱:浅米底
      ctx.fillStyle = '#f0e2c4';
      ctx.fillRect(0, 0, c.width, c.height);
      // 主图 (object-fit cover)
      const ar = img.width / img.height;
      const carr = c.width / c.height;
      let dx = 0, dy = 0, dw = c.width, dh = c.height;
      if (ar > carr) {
        dw = c.height * ar;
        dx = (c.width - dw) / 2;
      } else {
        dh = c.width / ar;
        dy = (c.height - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      // 标题条
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, c.height - 32, c.width, 32);
      ctx.fillStyle = '#f5d68b';
      ctx.font = 'bold 22px "Noto Serif SC", serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(aw.title || '無題', 12, c.height - 16);
      const tex = new THREE.CanvasTexture(c);
      fm.art.material.map?.dispose?.();
      fm.art.material.map = tex;
      fm.art.material.needsUpdate = true;
    };
    img.onerror = () => {};
    img.src = aw.src;
  });
}

/* ─── helpers ─── */

function makeBigHeadTex(headline, sub) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(60,30,16,.95)');
  grad.addColorStop(1, 'rgba(20,10,6,.95)');
  ctx.fillStyle = grad;
  const r = 28;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(c.width - r, 0);
  ctx.arcTo(c.width, 0, c.width, r, r);
  ctx.lineTo(c.width, c.height - r);
  ctx.arcTo(c.width, c.height, c.width - r, c.height, r);
  ctx.lineTo(r, c.height);
  ctx.arcTo(0, c.height, 0, c.height - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 86px "Noto Serif SC","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f5d68b'; ctx.shadowBlur = 22;
  ctx.fillText(headline, c.width / 2, 92);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c5a878';
  ctx.font = '38px "Noto Serif SC",serif';
  ctx.fillText(sub, c.width / 2, 180);
  return new THREE.CanvasTexture(c);
}

function makePlaqueTex(text, sub) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#5a2018');
  grad.addColorStop(1, '#1a0810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 92px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 - 22);
  if (sub) {
    ctx.font = '24px "Noto Serif SC", serif';
    ctx.fillStyle = '#c5a878';
    ctx.fillText(sub, c.width / 2, c.height / 2 + 56);
  }
  return new THREE.CanvasTexture(c);
}

function makeBlankTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f0e2c4';
  ctx.fillRect(0, 0, c.width, c.height);
  // 浅纹理
  ctx.fillStyle = 'rgba(184,140,80,.04)';
  for (let i = 0; i < 80; i++) {
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  ctx.fillStyle = '#8a6a4a';
  ctx.font = 'italic 28px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('待筆', c.width / 2, c.height / 2);
  return new THREE.CanvasTexture(c);
}

function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

/* ─── AI 生图 ─── */
/**
 * 优先调用真实 endpoint (window.HAN_IMAGE_GEN_URL), 否则使用 stub:
 *   - 用 canvas 画一张唐风占位画 (颜色由 prompt hash 决定)
 *   - 返回 dataURL
 */
async function aiGenerateImage(prompt) {
  const endpoint = window.HAN_IMAGE_GEN_URL || null;
  if (endpoint) {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style: 'tang-dynasty-painting' }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (j.dataUrl) return j.dataUrl;
    if (j.url) return j.url;
    throw new Error('endpoint returned no image');
  }
  // ─ stub: 唐风纸本 + 朱漆题字 ─
  return await stubTangPainting(prompt);
}

async function stubTangPainting(prompt) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 576;
  const ctx = c.getContext('2d');
  // 纸本米黄
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#f4e8c8');
  grad.addColorStop(1, '#d4b888');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // hash → 主色
  let h = 0;
  for (const ch of prompt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const accent = `hsl(${hue}, 55%, 35%)`;
  const ink   = `hsl(${(hue + 180) % 360}, 30%, 18%)`;

  // 远山
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, c.height * 0.55);
  for (let x = 0; x < c.width; x += 30) {
    const y = c.height * 0.55 - (Math.sin(x * 0.012 + hue) * 60 + Math.random() * 30);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(c.width, c.height);
  ctx.lineTo(0, c.height);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 中景树丛
  ctx.fillStyle = ink;
  for (let i = 0; i < 12; i++) {
    const tx = (i / 12) * c.width + Math.sin(i + hue) * 20;
    const ty = c.height * 0.62 + Math.cos(i + hue) * 10;
    ctx.beginPath();
    ctx.arc(tx, ty, 16 + Math.random() * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(tx - 1, ty, 2, 26);
  }

  // 前景水波
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.2;
  for (let y = c.height * 0.78; y < c.height; y += 18) {
    ctx.beginPath();
    for (let x = 0; x < c.width; x += 8) {
      const yy = y + Math.sin(x * 0.06 + y * 0.1) * 3;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 落款 (右下朱印)
  ctx.fillStyle = '#a8332f';
  ctx.fillRect(c.width - 84, c.height - 84, 56, 56);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 18px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('丹', c.width - 56, c.height - 56);
  ctx.fillText('青', c.width - 56, c.height - 36);

  // 题字 (左上一行短)
  ctx.fillStyle = '#3a2418';
  ctx.font = 'italic 30px "Noto Serif SC", serif';
  ctx.textAlign = 'left';
  ctx.fillText(prompt.slice(0, 12), 40, 50);

  return c.toDataURL('image/png');
}
