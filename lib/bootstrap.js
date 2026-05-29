/**
 * Bootstrap module — Phase 1 framework world for Tang Chang'an v2.
 *
 * Strangler-fig migration: legacy scene.js stays intact and v2 world is added
 * as a sibling group on the same Three.js scene. When v2 is active, legacy
 * village group is hidden.
 *
 * URL params:
 *   ?world=new            — activate v2 (and reframe camera to whole city)
 *   ?world=overlay        — activate v2 but keep legacy camera framing
 *   ?world=keepv1         — show both legacy + v2 (debug)
 *   ?grid                 — show ward grid lines
 *   ?wards                — show grid + ward id labels
 *   ?lod=L0|L1|L2|HIDDEN  — force LOD level
 *   ?focus=region-daming  — fly to a specific ward on boot
 *   ?era=kaiyuan          — start with a specific era
 */

import * as THREE from 'three';
import { GRID, buildDebugGrid, worldBounds } from './world/grid.js';
import { LODManager } from './world/lod.js';
import { wardRegistry } from './world/ward-registry.js';
import { buildStreetsAndWalls } from './world/streets.js';
import { buildProceduralWard } from './procedural/ward-l1.js?v=20260527-frustum-cull-1';
import { installTourUI, getActiveEra } from './world/tour-ui.js?v=20260526-v5';
import { installDiegeticUI } from './world/diegetic-ui.js?v=20260527-v38';
import { installAtmosphere } from './world/atmosphere.js?v=20260526-v22';
import { buildAtelierProp, openAtelier, closeAtelier } from './world/atelier.js?v=20260526-v31';
import { snapPolaroid, showPolaroidDrawer } from './ui/polaroid.js?v=20260526-v31';
import { installVoiceHud } from './ui/voice-hud.js?v=20260527-v38';
import { installVoiceIntent } from './ui/voice-intent.js?v=20260528-bgm-classical';
import { installOnboardingHints } from './ui/onboarding-hints.js?v=20260528-bgm-classical';
import { openGalleryHall, closeGalleryHall } from './world/gallery-hall.js?v=20260526-v37';

// All hero modules
import * as DamingPalace from './hero/daming-palace.js';
import * as TaijiPalace  from './hero/taiji-palace.js';
import * as XingqingPalace from './hero/xingqing-palace.js';
import * as Huangcheng  from './hero/huangcheng-officespark.js';
import * as EastMarket  from './hero/east-market.js';
import * as WestMarket  from './hero/west-market.js';
import * as QujiangPark from './hero/qujiang-furongyuan.js';
import * as JinchangWard from './hero/jinchang.js';
import * as PingkangWard from './hero/pingkang.js';
import * as ChongrenWard from './hero/chongren.js';
import * as WubenWard from './hero/wuben-guozijian.js';

const HERO_BUILDERS = {
  [DamingPalace.id]:   DamingPalace.build,
  [TaijiPalace.id]:    TaijiPalace.build,
  [XingqingPalace.id]: XingqingPalace.build,
  [Huangcheng.id]:     Huangcheng.build,
  [EastMarket.id]:     EastMarket.build,
  [WestMarket.id]:     WestMarket.build,
  [QujiangPark.id]:    QujiangPark.build,
  [JinchangWard.id]:   JinchangWard.build,
  [PingkangWard.id]:   PingkangWard.build,
  [ChongrenWard.id]:   ChongrenWard.build,
  [WubenWard.id]:      WubenWard.build,
};

const params = new URLSearchParams(window.location.search);
const ENABLED = params.has('world') || params.has('worldskel');
const WORLD_MODE = params.get('world') || 'new'; // 'new' | 'overlay' | 'keepv1'
const SHOW_DEBUG_GRID = params.has('grid') || params.has('wards');
const FORCE_LOD = params.get('lod');
const FOCUS_ID = params.get('focus');
const INIT_ERA = params.get('era');
const FIT_CAMERA = WORLD_MODE !== 'overlay';
const HIDE_V1 = WORLD_MODE === 'new';

if (ENABLED) {
  if (window.scene && window.camera) {
    initNewWorld();
  } else {
    window.addEventListener('legacy-scene-ready', initNewWorld, { once: true });
    setTimeout(() => {
      if (!window.__newWorldStarted && window.scene && window.camera) {
        console.warn('[NewWorld] legacy event timed out; booting anyway');
        initNewWorld();
      }
    }, 1500);
  }
}

function fitCameraToCity(camera) {
  // "全城" 模式 - 把整个城 + 南入口广场都装进去
  const b = worldBounds();
  const w = b.maxX - b.minX;
  const plazaExtra = 280;
  const d = (b.maxZ - b.minZ) + plazaExtra * 2;

  if (camera.isOrthographicCamera) {
    const frustumH = camera.top - camera.bottom || 64;
    const frustumW = camera.right - camera.left || 64;
    const targetH = Math.max(d, w * (frustumH / frustumW)) * 1.06;
    camera.zoom = Math.max(0.02, frustumH / targetH);
    camera.near = 0.1;
    camera.far = Math.max(camera.far, 5000);
    camera.position.set(520, 720, 620);
    camera.lookAt(0, 0, 0);
    if (window.controls?.target) window.controls.target.set(0, 0, 0);
    camera.updateProjectionMatrix();
  } else {
    camera.far = Math.max(camera.far, 5000);
    camera.position.set(w * 0.6, w * 0.7, d * 0.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  window.controls?.update?.();
}

/**
 * 初始视角 — 把相机定位在南入口, 让 diegetic UI (匾/沙盘/鼎) 显眼,
 * 同时朱雀门和城里第一层坊作为背景出现在画面上方.
 */
function fitInitialView(camera) {
  const b = worldBounds();
  // 进城牌坊 z=b.maxZ+140 (南), era 匾 b.maxZ+25, 沙盘 b.maxZ+70, 鼎 b.maxZ+50
  // 把 focusZ 放在牌坊和铜匾中间, 让 4 大 prop 都在屏幕舒适区
  const focusZ = b.maxZ + 90;

  if (camera.isOrthographicCamera) {
    const frustumH = camera.top - camera.bottom || 64;
    // 视野高度 380 — 整个广场全在视野
    const targetH = 380;
    camera.zoom = Math.max(0.02, frustumH / targetH);
    camera.near = 0.1;
    camera.far = Math.max(camera.far, 5000);
    // 更陡的俯视 (高度 400, 后退 120): 让屏幕 X≈世界 X, 屏幕 Y≈世界 Z 反向
    // gate 在 z=b.maxZ+140 = focusZ+50, era 在 z=b.maxZ+25 = focusZ-65
    // 这样 gate 在屏幕下方 ~25%, era 在屏幕上方 ~30%
    camera.position.set(0, 400, focusZ + 120);
    camera.lookAt(0, 10, focusZ);
    if (window.controls?.target) window.controls.target.set(0, 10, focusZ);
    camera.updateProjectionMatrix();
  } else {
    camera.far = Math.max(camera.far, 5000);
    camera.position.set(0, 360, focusZ + 140);
    camera.lookAt(0, 10, focusZ);
    camera.updateProjectionMatrix();
  }
  window.controls?.update?.();
}

function districtPalette(district) {
  return {
    D1: 0xa8332f,  // 宫城/大明宫 — 朱砂红
    D2: 0x4a5670,  // 皇城 — 黛瓦青
    D3: 0x9a6b3e,  // 市坊 — 砖瓦褐
    D4: 0x5b3b6e,  // 文士/北里 — 紫缎
    D5: 0xb96e3f,  // 学府/医道 — 朱漆
    D6: 0x6d6b4a,  // 寺观 — 山黄
    D7: 0x70875a,  // 园林 — 茜草
    D8: 0x4a8e9e,  // 外教/西部 — 群青
    OUT: 0x6e5a3e,
  }[district] || 0x6e5a3e;
}

function buildHeroPlaceholder(manifest, center) {
  const g = new THREE.Group();
  g.name = manifest.id + '-placeholder';

  const w = manifest.size?.w || GRID.wardSize;
  const d = manifest.size?.d || GRID.wardSize;
  const palette = districtPalette(manifest.district);
  const baseMat = new THREE.MeshLambertMaterial({ color: palette });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 5, d * 0.94), baseMat);
  base.position.set(center.x, 2.5, center.z);
  base.receiveShadow = true; base.castShadow = true;
  g.add(base);

  // gable roof
  const ridge = new THREE.Mesh(
    new THREE.ConeGeometry(Math.min(w, d) * 0.28, 9, 4),
    new THREE.MeshLambertMaterial({ color: 0xc99a3a }),
  );
  ridge.position.set(center.x, 9.5, center.z);
  ridge.rotation.y = Math.PI / 4;
  ridge.castShadow = true;
  g.add(ridge);

  // ward wall (low)
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x8e6e45 });
  const wallH = 2.2; const wallT = 0.5;
  const sides = [
    [w, wallT, 0, -d / 2],
    [w, wallT, 0,  d / 2],
    [wallT, d, -w / 2, 0],
    [wallT, d,  w / 2, 0],
  ];
  for (const [ww, dd, ox, oz] of sides) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wallH, dd), wallMat);
    wall.position.set(center.x + ox, wallH / 2, center.z + oz);
    g.add(wall);
  }

  // floating name label
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,15,8,0.88)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#c8a45e';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#c8a45e';
  ctx.font = 'bold 52px "Noto Serif SC", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(manifest.name?.zh || manifest.id, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.position.set(center.x, 18, center.z);
  sprite.scale.set(30, 7.5, 1);
  sprite.renderOrder = 999;
  g.add(sprite);

  return g;
}

function fillProceduralWardManifests() {
  const heroSlots = new Set();
  for (const m of wardRegistry.query()) {
    if (m.grid) heroSlots.add(`r${m.grid.row}c${m.grid.col}`);
  }
  const templates = [
    'residential', 'mixed', 'residential', 'mixed',
    'temple-small', 'market-fringe', 'office', 'residential', 'garden',
  ];
  let added = 0;
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      if (c === GRID.centerCol) continue;
      const key = `r${r}c${c}`;
      if (heroSlots.has(key)) continue;
      const id = `ward-${key}`;
      const idx = ((r * 7 + c * 3) % templates.length + templates.length) % templates.length;
      wardRegistry.register({
        id,
        type: 'proc',
        name: { zh: `${r}行${c}列里坊` },
        grid: { row: r, col: c },
        build: {
          template: templates[idx],
          density: r < 6 ? 'high' : (r < 10 ? 'medium' : 'low'),
        },
      });
      added++;
    }
  }
  console.info(`[NewWorld] filled ${added} procedural wards`);
}

export async function initNewWorld() {
  if (window.__newWorldStarted) return;
  window.__newWorldStarted = true;
  const scene = window.scene;
  const camera = window.camera;
  if (!scene || !camera) {
    console.warn('[NewWorld] window.scene / window.camera not ready');
    return;
  }
  console.info('[NewWorld] booting Tang Chang\'an v2…');

  // 1) Hide legacy v1 content (default mode)
  if (HIDE_V1) {
    const v1 = window.village;
    if (v1) {
      v1.visible = false;
      console.info('[NewWorld] legacy village hidden');
    }
    // 正常清晰显示: 不再安装黄昏雾、尘埃、泛光遮罩这一套氛围层。
    scene.fog = null;
    scene.background = new THREE.Color(0x86afd4);
    if (window.renderer) window.renderer.toneMappingExposure = 1.0;
  }

  // 2) v2 world root
  const worldRoot = new THREE.Group();
  worldRoot.name = 'V2WorldRoot';
  scene.add(worldRoot);

  worldRoot.add(buildStreetsAndWalls());

  if (SHOW_DEBUG_GRID) {
    worldRoot.add(buildDebugGrid({ labels: params.has('wards') }));
  }

  // 3) Camera + lighting (large-scale)
  if (FIT_CAMERA) {
    if (window.controls) {
      window.controls.target.set(0, 0, 0);
      window.controls.minZoom = 0.002;
      window.controls.maxZoom = 12;
      window.controls.enablePan = true;
      window.controls.minPolarAngle = 0;
      window.controls.maxPolarAngle = Math.PI * 0.49;
    }
    // 默认走"南入口广场" 视角让 diegetic UI 显眼;
    // 点铜鼎"全城" 才会调用 fitCameraToCity 把整个城装进去
    fitInitialView(camera);
    if (window.controls) window.controls.update();
    // 保留 legacy scene.js 的天空/雾/光照, v2 不再覆盖
  }

  // 4) LOD manager
  const lodMgr = new LODManager(scene, camera);
  const { LOD_THRESHOLDS } = await import('./world/lod.js');
  LOD_THRESHOLDS.l0Max = 180;
  LOD_THRESHOLDS.l1Max = 700;
  LOD_THRESHOLDS.l2Max = 2200;
  if (FORCE_LOD) lodMgr.forceLOD(FORCE_LOD);

  // 5) Load manifests
  try {
    await wardRegistry.loadFromManifestDir('data/wards');
  } catch (e) {
    console.warn('[NewWorld] manifest dir load failed', e);
  }

  fillProceduralWardManifests();

  // 6) Build / register all regions
  const heroLabels = new THREE.Group();
  heroLabels.name = 'HeroLabels';
  worldRoot.add(heroLabels);

  for (const m of wardRegistry.query()) {
    const center = wardRegistry.centerOf(m.id);
    if (!center) continue;

    const heroBuilder = m.type !== 'proc' ? HERO_BUILDERS[m.id] : null;
    const hasHero = !!heroBuilder;

    // For wards without dedicated builder, add a placeholder badge so user sees something
    if (m.type !== 'proc' && !hasHero) {
      heroLabels.add(buildHeroPlaceholder(m, center));
    }

    const safeBuilder = () => {
      if (m.type === 'proc') {
        try {
          const g = buildProceduralWard(m);
          g.position.set(center.x, 0, center.z);
          return g;
        } catch (e) { console.warn('[Hero] proc build fail', m.id, e); return null; }
      }
      if (hasHero) {
        try {
          const g = heroBuilder({ manifest: m, center });
          const elev = (m.elevation || 0);
          g.position.set(center.x, elev, center.z);
          return g;
        } catch (e) { console.warn('[Hero] build fail', m.id, e); return null; }
      }
      return null;
    };

    lodMgr.register({
      id: m.id,
      center,
      build: { L1: safeBuilder, L0: safeBuilder },
    });
  }

  // 7) world API
  window.world = {
    root: worldRoot,
    registry: wardRegistry,
    lod: lodMgr,
    list: () => Array.from(wardRegistry.manifests.keys()),
    query: (...args) => wardRegistry.query(...args),
    get: (id) => wardRegistry.get(id),
    centerOf: (id) => wardRegistry.centerOf(id),
    goto: (id) => {
      const c = wardRegistry.centerOf(id);
      if (!c) return console.warn('no such region', id);
      const m = wardRegistry.get(id);
      const sz = Math.max(m?.size?.w || 60, m?.size?.d || 60);
      const offset = sz * 0.8;
      camera.position.set(c.x + offset, sz * 0.9, c.z + offset);
      camera.lookAt(c.x, 0, c.z);
      window.controls?.target?.set(c.x, 0, c.z);
      if (camera.isOrthographicCamera) {
        // zoom to fit ward
        camera.zoom = Math.max(camera.zoom, (camera.top - camera.bottom) / (sz * 1.6));
        camera.updateProjectionMatrix();
      }
      window.controls?.update?.();
      // also notify tour-ui
      window.dispatchEvent(new CustomEvent('chang-an-goto', { detail: { id } }));
    },
    flyTo: ({ x, z }) => {
      camera.position.set(x + 30, 50, z + 30);
      camera.lookAt(x, 0, z);
      window.controls?.target?.set(x, 0, z);
      window.controls?.update?.();
    },
    fitCity: () => fitCameraToCity(camera),
    fitInitial: () => fitInitialView(camera),
    forceLOD: (lvl) => lodMgr.forceLOD(lvl),
    stats: () => lodMgr.stats(),
  };

  // 退游戏 → 回鸟瞰: 重置相机 + 重新隐藏 v1
  window.addEventListener('han-diorama-back-to-overview', () => {
    fitInitialView(camera);
    if (window.village) window.village.visible = false;
    if (window.scene) {
      if (window.scene.fog) { window.scene.fog = null; }
      window.scene.background = new THREE.Color(0x2a1f15);
    }
  });

  // 8) Wire LOD update loop
  function tick() {
    lodMgr.update();
    requestAnimationFrame(tick);
  }
  tick();

  // 9) Install Diegetic UI (3D in-scene controls — 朱雀门匾 / 青铜舆图 / 铜鼎)
  //    替代旧的 HTML 浮窗 TourUI. 想回到 HTML 浮窗模式: 加 ?uimode=html
  try {
    const uiMode = params.get('uimode') || 'diegetic';
    if (uiMode === 'html') {
      installTourUI({ scene, camera, controls: window.controls, world: window.world });
    } else {
      // 保持 v1 HTML chrome 隐藏, 同时也不再装 v2 HTML tour-ui
      document.body.classList.add('v2-active');
      const dUI = installDiegeticUI({
        scene, camera, renderer: window.renderer,
        controls: window.controls, world: window.world,
      });
      window.diegeticUI = dUI;
      // 安装常驻语音 HUD + 暴露 API
      installVoiceHud();
      installVoiceIntent();
      installOnboardingHints();
      window.openAtelier = openAtelier;
      window.closeAtelier = closeAtelier;
      window.snapPolaroid = snapPolaroid;
      window.showPolaroidDrawer = showPolaroidDrawer;
      window.openGalleryHall = openGalleryHall;
      window.closeGalleryHall = closeGalleryHall;
      // URL ?action=atelier|polaroid|voice — 一键深链, 便于测试 + 分享
      setTimeout(() => {
        const action = params.get('action');
        // 注: ?action=atelier 现在跳到 丹青館 厅堂 (走 WASD 进入), 不再开 overlay
        if (action === 'atelier' || action === 'diyhall') {
          if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
            window.DiyHall.gotoDiyHall();
          } else {
            openAtelier();
          }
        } else if (action === 'polaroid') snapPolaroid({ label: '長安遊' });
        else if (action === 'gallery') openGalleryHall();
        else if (action && action.startsWith('gallery:')) openGalleryHall({ galleryId: action.slice(8) });
        else if (action === 'voice') {
          import('./world/voice-bell.js?v=20260526-v31').then(m => m.showPersonaRing()).catch(() => {});
        }
      }, 600);
    }
  } catch (e) {
    console.warn('[NewWorld] failed to install UI', e);
  }

  if (INIT_ERA) {
    setTimeout(() => {
      // Try diegetic first; fall back to tour-ui html button
      if (window.diegeticUI?.setEra) {
        window.diegeticUI.setEra(INIT_ERA);
      } else {
        const btn = document.querySelector(`#tour-ui .era-btn[data-era="${INIT_ERA}"]`);
        btn?.click();
      }
    }, 250);
  }

  if (FOCUS_ID) {
    setTimeout(() => window.world.goto(FOCUS_ID), 300);
  }

  console.info('[NewWorld] ready. Wards:', wardRegistry.manifests.size,
    '| Heroes implemented:', Object.keys(HERO_BUILDERS).length);
  console.info('       try: window.world.list() / world.goto(id) / world.stats()');
}
