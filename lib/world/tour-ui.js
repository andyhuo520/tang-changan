/**
 * Tour UI — overlay for v2 city tour experience.
 *
 * Provides:
 *   • Minimap (top-right) — 1:1000 city plan + camera position dot
 *   • Compass (top-right under minimap)
 *   • Ward picker (top-left button → drawer) — jump to any of 19 hero wards
 *   • Era switcher (top-center) — 5 eras with palette/atmosphere swap
 *   • Camera-mode toggle (orbit / drone / first-person)
 *   • City overview button (fits whole 9.7km × 8.6km)
 *   • Loading status / fps
 *
 * All UI lives in a single <div id="tour-ui"> appended to body.
 * Inactive when bootstrap doesn't activate (no DOM created).
 */

import * as THREE from 'three';
import { GRID, worldBounds, wardToWorld } from './grid.js';

const COLORS = {
  bg:        'rgba(15,11,7,0.94)',
  panel:     'rgba(28,22,15,0.92)',
  border:    '#4a3a24',
  gold:      '#c8a45e',
  goldDim:   '#a08043',
  goldBright:'#e8c46c',
  ink:       '#f0e4c8',
  inkDim:    '#a89070',
  red:       '#a8332f',
  shadow:    'rgba(0,0,0,0.55)',
};

const ERAS = [
  { id: 'zhenguan', label: '贞观', year: '627-649', emperor: '太宗',  palette: 'austere'  },
  { id: 'yonghui',  label: '永徽', year: '650-655', emperor: '高宗',  palette: 'tradition' },
  { id: 'kaiyuan',  label: '开元', year: '713-741', emperor: '玄宗',  palette: 'glorious'  },
  { id: 'tianbao',  label: '天宝', year: '742-756', emperor: '玄宗末', palette: 'sunset'   },
  { id: 'yuanhe',   label: '元和', year: '806-820', emperor: '宪宗',  palette: 'restored' },
];

// 时代调色 — 只用作"点击时代按钮时的轻度氛围切换", 不在 init 时自动 apply
// (默认 era=null 让 legacy scene.js 的光照原样生效, 不再强行覆盖成蜡黄泛白)
// 数值在不破坏 legacy 曝光的前提下做微调, 不再把 sun 拉到 0.95
const ERA_ATMOSPHERE = {
  zhenguan:  { sky: 0xbfd0d8, fog: [0xc8d4dc, 800, 3200],  sunIntensity: 0.55, hemiIntensity: 0.35, ambient: 0xffffff },
  yonghui:   { sky: 0xc4d4dc, fog: [0xccd6dd, 800, 3200],  sunIntensity: 0.58, hemiIntensity: 0.38, ambient: 0xffffff },
  kaiyuan:   { sky: 0xcad9df, fog: [0xd0dbe0, 900, 3400],  sunIntensity: 0.60, hemiIntensity: 0.40, ambient: 0xfff8e6 },
  tianbao:   { sky: 0xd8c8a8, fog: [0xd8c8a8, 700, 2800],  sunIntensity: 0.62, hemiIntensity: 0.38, ambient: 0xffe6c2 },
  yuanhe:    { sky: 0xb8b8a8, fog: [0xb8b8a8, 700, 2900],  sunIntensity: 0.48, hemiIntensity: 0.30, ambient: 0xeeeadd },
};

let activeEra = null;  // 默认不预设时代; 只在用户点按钮时才接管

const KEY_REGIONS = [
  { id: 'region-daming',       label: '大明宫',     hint: '正衙·含元殿', district: 'D1' },
  { id: 'region-taiji',        label: '太极宫',     hint: '初唐皇宫',    district: 'D1' },
  { id: 'region-xingqing',     label: '兴庆宫',     hint: '玄宗别宫',    district: 'D1' },
  { id: 'region-huangcheng',   label: '皇城',       hint: '三省六部',    district: 'D2' },
  { id: 'region-east-market',  label: '东市',       hint: '文房绫罗',    district: 'D3' },
  { id: 'region-west-market',  label: '西市',       hint: '胡商集珍',    district: 'D3' },
  { id: 'region-qujiang',      label: '曲江·芙蓉园', hint: '皇家园林',    district: 'D7' },
  { id: 'ward-pingkang',       label: '平康坊',     hint: '北里风月',    district: 'D4' },
  { id: 'ward-chongren',       label: '崇仁坊',     hint: '进士群居',    district: 'D4' },
  { id: 'ward-jinchang',       label: '晋昌坊·大雁塔', hint: '玄奘译场',  district: 'D6' },
  { id: 'ward-xinchang',       label: '新昌坊·青龙寺', hint: '空海求法',  district: 'D6' },
  { id: 'ward-yankang',        label: '延康坊·西明寺', hint: '玄奘晚年', district: 'D6' },
  { id: 'ward-chongye',        label: '崇业坊·玄都观', hint: '刘禹锡桃花', district: 'D8' },
  { id: 'ward-yongxing',       label: '永兴坊',     hint: '风味食肆',    district: 'D5' },
  { id: 'ward-xiuzhen',        label: '修真坊·太医署', hint: '医学殿堂', district: 'D5' },
  { id: 'ward-wuben',          label: '务本坊·国子监', hint: '儒林之宗', district: 'D5' },
  { id: 'ward-huaiyuan',       label: '怀远坊·景教祆教', hint: '波斯邸', district: 'D8' },
  { id: 'ward-xuanyang',       label: '宣阳坊',     hint: '姚崇宋璟宅',  district: 'D4' },
  { id: 'ward-zhaoguo',        label: '昭国坊',     hint: '白居易宅',    district: 'D4' },
];

const DISTRICT_COLOR = {
  D1: '#a8332f',
  D2: '#4a5670',
  D3: '#9a6b3e',
  D4: '#5b3b6e',
  D5: '#b96e3f',
  D6: '#6d6b4a',
  D7: '#70875a',
  D8: '#4a8e9e',
};

export function installTourUI({ scene, camera, controls, world } = {}) {
  if (document.getElementById('tour-ui')) return;
  scene = scene || window.scene;
  camera = camera || window.camera;
  controls = controls || window.controls;
  world = world || window.world;

  // 关 v1 HTML 浮层, 让 v2 视野干净
  document.body.classList.add('v2-active');

  injectStyles();
  const root = document.createElement('div');
  root.id = 'tour-ui';
  root.innerHTML = layoutHTML();
  document.body.appendChild(root);

  wireMinimap(root, camera);
  wireWardPicker(root, world);
  wireEraSwitcher(root, scene);
  wireCameraTools(root, camera, controls, world);
  wireHud(root, camera, world);

  // 注意:不在 install 时自动 applyEra, 保留 legacy scene.js 的光照
  // 只有当用户点击 era-btn (或 setEra) 时才修改场景氛围

  console.info('[TourUI] installed');
  return {
    setEra: (id) => applyEra(scene, id),
    goto: (id) => world?.goto?.(id),
    overview: () => world?.fitCity?.(),
  };
}

function injectStyles() {
  if (document.getElementById('tour-ui-style')) return;
  const s = document.createElement('style');
  s.id = 'tour-ui-style';
  s.textContent = `
/* Hide legacy v1 chrome when v2 is active. v1 still renders in 3D for now,
   but its HTML overlays are removed so the tourist view is clean. */
body.v2-active .top-bar,
body.v2-active .enter-game-cta,
body.v2-active .enter-game-nudge,
body.v2-active .scene-title,
body.v2-active .mode-pill,
body.v2-active .scene-rail,
body.v2-active .hud:not(#tour-ui .hud),
body.v2-active .time-control,
body.v2-active .weather-picker,
body.v2-active .season-picker,
body.v2-active .left-sidebar,
body.v2-active aside,
body.v2-active .freeze-tag,
body.v2-active .progress-chip,
body.v2-active .narration,
body.v2-active #sidebarToggle,
body.v2-active #voicePanel,
body.v2-active #portraitPanel,
body.v2-active #gameHudOverlay,
body.v2-active #playerHud,
body.v2-active #inventoryHud,
body.v2-active #shopHud,
body.v2-active #questHud,
body.v2-active #sceneCardModal,
body.v2-active #gamesModal,
body.v2-active #toastStack {
  display: none !important;
}
body.v2-active .stage::before, body.v2-active .stage::after { display: none !important; }
body.v2-active { background: #0e0a06; }
body.v2-active canvas#stage, body.v2-active main.stage canvas {
  z-index: 1 !important;
}

#tour-ui {
  position: fixed; inset: 0; pointer-events: none; z-index: 100;
  font-family: 'Noto Serif SC', '宋体', serif;
  color: ${COLORS.ink}; user-select: none;
}
#tour-ui .panel { pointer-events: auto; }
#tour-ui .panel button { font-family: inherit; cursor: pointer; }

/* Top-center: Era switcher */
#tour-ui .era-bar {
  position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 0; background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 28px; padding: 4px; box-shadow: 0 4px 16px ${COLORS.shadow};
}
#tour-ui .era-btn {
  background: transparent; border: none; padding: 8px 16px;
  color: ${COLORS.inkDim}; font-size: 13px; letter-spacing: 2px;
  border-radius: 22px; transition: all .18s ease;
}
#tour-ui .era-btn .yr { display: block; font-size: 9px; letter-spacing: 1px; opacity: .65; margin-top: 1px; }
#tour-ui .era-btn:hover { color: ${COLORS.gold}; background: rgba(200,164,94,0.08); }
#tour-ui .era-btn.active {
  color: #1a120a; background: linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldBright});
  font-weight: 600; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.18);
}

/* Top-right: Minimap + compass + tools */
#tour-ui .right-rail {
  position: absolute; top: 18px; right: 18px; display: flex; flex-direction: column; gap: 10px;
  align-items: flex-end;
}
#tour-ui .minimap-wrap {
  background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 10px; padding: 8px; box-shadow: 0 4px 16px ${COLORS.shadow};
}
#tour-ui .minimap-title {
  font-size: 9px; letter-spacing: 3px; color: ${COLORS.goldDim};
  text-align: center; margin-bottom: 4px;
}
#tour-ui .minimap-canvas {
  display: block; image-rendering: pixelated;
  border: 1px solid ${COLORS.border}; border-radius: 4px;
  background: #1a140c; cursor: crosshair;
}
#tour-ui .minimap-legend {
  font-size: 9px; color: ${COLORS.inkDim};
  margin-top: 4px; display: flex; justify-content: space-between;
}
#tour-ui .tool-row {
  display: flex; gap: 6px; background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 10px; padding: 6px; box-shadow: 0 4px 12px ${COLORS.shadow};
}
#tour-ui .tool-btn {
  background: transparent; border: 1px solid transparent; padding: 6px 10px;
  color: ${COLORS.ink}; font-size: 11px; border-radius: 6px;
  letter-spacing: 1.5px; min-width: 40px;
}
#tour-ui .tool-btn:hover { background: rgba(200,164,94,0.1); border-color: ${COLORS.border}; }
#tour-ui .tool-btn.active { background: rgba(200,164,94,0.18); border-color: ${COLORS.gold}; color: ${COLORS.goldBright}; }

/* Left-side: Ward picker trigger */
#tour-ui .picker-trigger {
  position: absolute; top: 80px; left: 18px;
  background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 10px; padding: 10px 14px; color: ${COLORS.gold};
  font-size: 12px; letter-spacing: 2px; box-shadow: 0 4px 16px ${COLORS.shadow};
}
#tour-ui .picker-trigger:hover { background: rgba(200,164,94,0.12); color: ${COLORS.goldBright}; }

/* Left-side drawer */
#tour-ui .picker-drawer {
  position: absolute; top: 130px; left: 18px;
  width: 320px; max-height: calc(100vh - 160px); overflow-y: auto;
  background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 12px; padding: 14px; box-shadow: 0 4px 24px ${COLORS.shadow};
  opacity: 0; transform: translateX(-20px); transition: all .22s ease;
  display: none;
}
#tour-ui .picker-drawer.open { opacity: 1; transform: none; display: block; }
#tour-ui .picker-drawer h3 {
  margin: 0 0 8px 0; font-size: 14px; letter-spacing: 4px; color: ${COLORS.gold};
  border-bottom: 1px solid ${COLORS.border}; padding-bottom: 8px;
}
#tour-ui .picker-drawer .sub {
  font-size: 10px; color: ${COLORS.inkDim}; letter-spacing: 1px; margin-bottom: 10px;
}
#tour-ui .ward-card {
  display: grid; grid-template-columns: 8px 1fr auto; gap: 8px; align-items: center;
  padding: 8px 10px; margin-bottom: 6px; cursor: pointer;
  background: rgba(0,0,0,0.18); border: 1px solid transparent; border-radius: 6px;
  transition: all .14s ease;
}
#tour-ui .ward-card:hover { background: rgba(200,164,94,0.1); border-color: ${COLORS.border}; }
#tour-ui .ward-card .pip { width: 8px; height: 28px; border-radius: 3px; }
#tour-ui .ward-card .lbl { font-size: 13px; color: ${COLORS.ink}; letter-spacing: 1px; }
#tour-ui .ward-card .hint { font-size: 10px; color: ${COLORS.inkDim}; margin-top: 2px; }
#tour-ui .ward-card .arrow { color: ${COLORS.gold}; font-size: 13px; opacity: .7; }

/* Bottom-left: HUD info */
#tour-ui .hud {
  position: absolute; bottom: 18px; left: 18px;
  background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 10px; padding: 8px 14px; color: ${COLORS.inkDim};
  font-size: 11px; letter-spacing: 1px; box-shadow: 0 4px 12px ${COLORS.shadow};
  font-family: 'JetBrains Mono', 'Menlo', monospace;
  display: flex; gap: 18px;
}
#tour-ui .hud b { color: ${COLORS.goldBright}; font-weight: normal; }

/* Bottom-center: Help hint */
#tour-ui .help {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  background: ${COLORS.panel}; border: 1px solid ${COLORS.border};
  border-radius: 28px; padding: 6px 18px; color: ${COLORS.inkDim};
  font-size: 11px; letter-spacing: 2px; box-shadow: 0 4px 12px ${COLORS.shadow};
}
#tour-ui .help kbd {
  display: inline-block; padding: 1px 6px; margin: 0 2px;
  background: rgba(200,164,94,0.18); border: 1px solid ${COLORS.border};
  border-radius: 4px; font-size: 10px; color: ${COLORS.gold};
  font-family: 'JetBrains Mono', monospace;
}

/* Scrollbar within drawer */
#tour-ui .picker-drawer::-webkit-scrollbar { width: 6px; }
#tour-ui .picker-drawer::-webkit-scrollbar-thumb {
  background: ${COLORS.border}; border-radius: 3px;
}
  `;
  document.head.appendChild(s);
}

function layoutHTML() {
  const eraBtns = ERAS.map((e) => `
    <button class="era-btn ${e.id === activeEra ? 'active' : ''}" data-era="${e.id}">
      ${e.label}<span class="yr">${e.year}</span>
    </button>
  `).join('');

  const wardCards = KEY_REGIONS.map((w) => `
    <div class="ward-card" data-ward="${w.id}">
      <div class="pip" style="background:${DISTRICT_COLOR[w.district] || '#888'}"></div>
      <div>
        <div class="lbl">${w.label}</div>
        <div class="hint">${w.hint}</div>
      </div>
      <div class="arrow">→</div>
    </div>
  `).join('');

  return `
    <div class="panel era-bar">${eraBtns}</div>

    <div class="panel picker-trigger" id="picker-trigger">☰ 长安 · 十九景</div>

    <div class="panel picker-drawer" id="picker-drawer">
      <h3>长安 · 十九景</h3>
      <div class="sub">点击坊名，飞抵其上。</div>
      ${wardCards}
    </div>

    <div class="right-rail">
      <div class="panel minimap-wrap">
        <div class="minimap-title">长 安 城 平 面 图</div>
        <canvas class="minimap-canvas" width="240" height="216"></canvas>
        <div class="minimap-legend"><span>9.7km × 8.6km</span><span>1:1000</span></div>
      </div>
      <div class="panel tool-row">
        <button class="tool-btn" id="tool-overview" title="全城俯瞰">全城</button>
        <button class="tool-btn active" id="tool-orbit" title="环绕">环绕</button>
        <button class="tool-btn" id="tool-drone" title="无人机飞行">无人机</button>
      </div>
    </div>

    <div class="panel hud" id="hud">
      <div>坊 <b id="hud-ward">—</b></div>
      <div>纬 <b id="hud-x">0</b></div>
      <div>经 <b id="hud-z">0</b></div>
      <div>距 <b id="hud-zoom">1.0</b></div>
    </div>

    <div class="panel help">
      <kbd>WASD</kbd>或<kbd>方向键</kbd> 移动 · <kbd>滚轮</kbd> 缩放 · 点击 <span style="color:${COLORS.gold}">坊</span> 速达
    </div>
  `;
}

/* ─────────────────────────── Minimap ─────────────────────────── */
function wireMinimap(root, camera) {
  const canvas = root.querySelector('.minimap-canvas');
  const ctx = canvas.getContext('2d');
  const bounds = worldBounds();
  const worldW = bounds.maxX - bounds.minX;
  const worldD = bounds.maxZ - bounds.minZ;
  const mapW = canvas.width;
  const mapH = canvas.height;

  // Static layer: city plan
  function drawStatic() {
    ctx.fillStyle = '#1a140c';
    ctx.fillRect(0, 0, mapW, mapH);

    // wards as colored cells
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const { x, z } = wardToWorld(r, c);
        const px = ((x - bounds.minX) / worldW) * mapW;
        const py = ((z - bounds.minZ) / worldD) * mapH;
        const cellW = (GRID.wardSize / worldW) * mapW;
        const cellH = (GRID.wardSize / worldD) * mapH;
        const isCenter = c === GRID.centerCol;
        ctx.fillStyle = isCenter ? '#3a3024' : '#262019';
        ctx.fillRect(px - cellW / 2, py - cellH / 2, cellW, cellH);
      }
    }

    // hero wards
    for (const w of KEY_REGIONS) {
      const reg = window.world?.registry?.get?.(w.id);
      if (!reg || !reg.grid) continue;
      const center = window.world?.registry?.centerOf?.(w.id);
      if (!center) continue;
      const px = ((center.x - bounds.minX) / worldW) * mapW;
      const py = ((center.z - bounds.minZ) / worldD) * mapH;
      ctx.fillStyle = DISTRICT_COLOR[w.district] || '#888';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Suzaku Ave
    ctx.fillStyle = '#c8a45e';
    const zhuqueX = ((0 - bounds.minX) / worldW) * mapW;
    ctx.fillRect(zhuqueX - 0.8, 0, 1.6, mapH);

    // outer wall border
    ctx.strokeStyle = '#7a6240';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.5, mapW - 1, mapH - 1);
  }
  drawStatic();

  // Dynamic layer: camera dot
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = mapW; dotCanvas.height = mapH;
  dotCanvas.style.cssText = `position:absolute; top:0; left:0; pointer-events:none;`;
  canvas.parentElement.style.position = 'relative';
  canvas.parentElement.appendChild(dotCanvas);
  const dotCtx = dotCanvas.getContext('2d');

  function drawDot() {
    dotCtx.clearRect(0, 0, mapW, mapH);
    if (!camera) return;
    const px = ((camera.position.x - bounds.minX) / worldW) * mapW;
    const py = ((camera.position.z - bounds.minZ) / worldD) * mapH;
    if (isNaN(px) || isNaN(py)) return;

    // camera frustum direction triangle
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const angle = Math.atan2(dir.x, dir.z);
    dotCtx.save();
    dotCtx.translate(px, py);
    dotCtx.rotate(angle);
    dotCtx.fillStyle = 'rgba(232,196,108,0.45)';
    dotCtx.beginPath();
    dotCtx.moveTo(0, 0);
    dotCtx.lineTo(-8, 20);
    dotCtx.lineTo(8, 20);
    dotCtx.closePath();
    dotCtx.fill();
    dotCtx.restore();

    // position pip
    dotCtx.fillStyle = '#ffd97a';
    dotCtx.beginPath();
    dotCtx.arc(px, py, 4, 0, Math.PI * 2);
    dotCtx.fill();
    dotCtx.strokeStyle = '#1a140c';
    dotCtx.lineWidth = 1;
    dotCtx.stroke();
  }

  setInterval(drawDot, 100);

  // Click-to-fly on minimap
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const wx = bounds.minX + (px / mapW) * worldW;
    const wz = bounds.minZ + (py / mapH) * worldD;
    if (window.world?.flyTo) window.world.flyTo({ x: wx, z: wz });
    else if (window.camera && window.controls) {
      window.camera.position.set(wx + 50, 70, wz + 50);
      window.controls.target?.set(wx, 0, wz);
      window.controls.update?.();
    }
  });
}

/* ─────────────────────────── Ward picker ─────────────────────────── */
function wireWardPicker(root, world) {
  const trig = root.querySelector('#picker-trigger');
  const drawer = root.querySelector('#picker-drawer');
  let open = false;
  trig.addEventListener('click', () => {
    open = !open;
    drawer.classList.toggle('open', open);
  });
  drawer.querySelectorAll('.ward-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-ward');
      world?.goto?.(id);
      open = false;
      drawer.classList.remove('open');
    });
  });
  // close drawer on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { open = false; drawer.classList.remove('open'); }
  });
}

/* ─────────────────────────── Era switcher ─────────────────────────── */
function wireEraSwitcher(root, scene) {
  root.querySelectorAll('.era-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-era');
      root.querySelectorAll('.era-btn').forEach((b) => b.classList.toggle('active', b === btn));
      applyEra(scene, id);
    });
  });
}

function applyEra(scene, eraId) {
  activeEra = eraId;
  const a = ERA_ATMOSPHERE[eraId] || ERA_ATMOSPHERE.kaiyuan;
  if (!scene) scene = window.scene;
  if (!scene) return;
  scene.background = new THREE.Color(a.sky);
  if (scene.fog) {
    scene.fog.color = new THREE.Color(a.fog[0]);
    scene.fog.near = a.fog[1];
    scene.fog.far = a.fog[2];
  } else {
    scene.fog = new THREE.Fog(a.fog[0], a.fog[1], a.fog[2]);
  }
  scene.traverse((obj) => {
    if (obj.isDirectionalLight) {
      obj.intensity = a.sunIntensity;
      obj.color = new THREE.Color(a.ambient);
    }
    if (obj.isHemisphereLight) {
      obj.intensity = a.hemiIntensity;
    }
  });
  window.dispatchEvent(new CustomEvent('chang-an-era', { detail: { era: eraId } }));
}

export function getActiveEra() { return activeEra; }

/* ─────────────────────────── Camera tools ─────────────────────────── */
function wireCameraTools(root, camera, controls, world) {
  root.querySelector('#tool-overview').addEventListener('click', () => {
    world?.fitCity?.();
    setActive(root, 'tool-overview');
  });
  root.querySelector('#tool-orbit').addEventListener('click', () => {
    if (controls) {
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
    }
    setActive(root, 'tool-orbit');
  });
  root.querySelector('#tool-drone').addEventListener('click', () => {
    setActive(root, 'tool-drone');
    enableDroneMode(camera, controls);
  });
}

function setActive(root, id) {
  root.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('active', b.id === id));
}

/** Drone-style mode: WASD to fly above the city. */
function enableDroneMode(camera, controls) {
  if (window.__droneActive) return;
  window.__droneActive = true;
  const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
  const onKey = (down) => (ev) => {
    const k = ev.key.toLowerCase();
    if (k === 'w' || ev.key === 'ArrowUp') keys.w = down;
    if (k === 's' || ev.key === 'ArrowDown') keys.s = down;
    if (k === 'a' || ev.key === 'ArrowLeft') keys.a = down;
    if (k === 'd' || ev.key === 'ArrowRight') keys.d = down;
    if (k === 'q') keys.q = down;
    if (k === 'e') keys.e = down;
  };
  document.addEventListener('keydown', onKey(true));
  document.addEventListener('keyup', onKey(false));

  const speed = 4; // units per frame (~40m/s simulation)
  function tick() {
    if (!window.__droneActive) return;
    if (keys.w) { camera.position.z -= speed; controls?.target && (controls.target.z -= speed); }
    if (keys.s) { camera.position.z += speed; controls?.target && (controls.target.z += speed); }
    if (keys.a) { camera.position.x -= speed; controls?.target && (controls.target.x -= speed); }
    if (keys.d) { camera.position.x += speed; controls?.target && (controls.target.x += speed); }
    if (keys.q) { camera.position.y += speed * 0.5; }
    if (keys.e) { camera.position.y = Math.max(8, camera.position.y - speed * 0.5); }
    controls?.update?.();
    requestAnimationFrame(tick);
  }
  tick();
}

/* ─────────────────────────── HUD ─────────────────────────── */
function wireHud(root, camera, world) {
  const wardEl = root.querySelector('#hud-ward');
  const xEl = root.querySelector('#hud-x');
  const zEl = root.querySelector('#hud-z');
  const zoomEl = root.querySelector('#hud-zoom');
  setInterval(() => {
    if (!camera) return;
    xEl.textContent = camera.position.x.toFixed(0);
    zEl.textContent = camera.position.z.toFixed(0);
    zoomEl.textContent = (camera.zoom || 1).toFixed(2);
    try {
      const { worldToWard } = window.world?.registry || {};
      // try inferring ward
      const r = window.world?.registry;
      if (r) {
        let best = null, bestD = Infinity;
        for (const id of r.manifests.keys()) {
          const c = r.centerOf(id);
          if (!c) continue;
          const dx = c.x - camera.position.x;
          const dz = c.z - camera.position.z;
          const d = Math.hypot(dx, dz);
          if (d < bestD && d < 80) { bestD = d; best = id; }
        }
        if (best) {
          const m = r.get(best);
          wardEl.textContent = m?.name?.zh || best;
        } else {
          wardEl.textContent = '城中';
        }
      }
    } catch (_) { /* ignore */ }
  }, 200);
}
