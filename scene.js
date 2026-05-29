import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// GLB / USDZ 模型加载 + 动画管线 (详见 models/README.md)
import {
  loadCharacter,
  updateAnimMixers,
  MODEL_REGISTRY,
  autoAnimateState,
} from './modelLoader.js';
// 丹青馆 — 大明宫边墙旁的 WASD-触发式 DIY 体验馆
import * as DiyHall from './lib/world/diy-hall.js?v=20260527-v1';
// AI 顶流品牌街 — 朱雀大街上的牌坊 + 远岛展馆
import * as BrandPlaza from './lib/world/brand-plaza.js?v=20260529-agora-rename';
if (typeof window !== 'undefined') {
  window.MODEL_REGISTRY = MODEL_REGISTRY;
  window.loadCharacter = loadCharacter;
  window.glbCharacters = [];   // [{ npc, char, demoMotion? }]
  window.DiyHall = DiyHall;
  window.BrandPlaza = BrandPlaza;
}

/* ============================================================
 *  汉乡 · Han Village Diorama
 *  Author: prototype
 *  Single file Three.js low-poly scene
 * ============================================================ */

/* ---------- Palette ---------- */
const C = {
  earth: 0xB8946A,        // 夯土墙
  earthDark: 0x7B5B36,    // 土地阴影
  ground: 0x8E6E45,       // 地面
  grass: 0x6F8B3F,        // 草地
  grassDark: 0x52682E,
  tile: 0x3B342B,         // 屋瓦
  tileDark: 0x2A2520,
  vermillion: 0xB23A2A,   // 朱红柱
  vermillionDark: 0x7E2A1E,
  bronze: 0x8B5A2B,       // 铜/旧木
  wood: 0x6E4E2E,
  woodLight: 0x9E7950,
  white: 0xEEE4D1,        // 白衣 / 麻布
  black: 0x2A2520,        // 黑漆
  water: 0x4A6B5C,
  flag: 0xC43A2A,
  flagYellow: 0xD4A01E,
  willow: 0x7A9847,
  willowDark: 0x52682E,
  trunk: 0x4A3520,
  stone: 0x8A8478,
  smoke: 0xC8BFB0,
};

/* ---------- Renderer / Scene / Camera ---------- */
const stage = document.querySelector('.stage');
function stageSize() {
  const w = stage.clientWidth || window.innerWidth - 360;
  const h = stage.clientHeight || window.innerHeight;
  return { w: Math.max(1, w), h: Math.max(1, h) };
}
const { w: initW, h: initH } = stageSize();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(initW, initH);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0908);
scene.fog = null;

// Orthographic diorama camera
const aspect = initW / initH;
const frustum = 64;
const camera = new THREE.OrthographicCamera(
  -frustum * aspect / 2, frustum * aspect / 2,
  frustum / 2, -frustum / 2, 0.1, 300
);
camera.position.set(48, 38, 48);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

if (typeof window !== 'undefined') {
  window.scene = scene;
  window.camera = camera;
  window.renderer = renderer;
  window.controls = controls;
  window.THREE = THREE;
  window.dispatchEvent(new CustomEvent('legacy-scene-ready'));
}
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minZoom = 0.5;
controls.maxZoom = 2.5;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.42;
controls.target.set(0, 1, -6);
camera.zoom = 0.92;
camera.updateProjectionMatrix();

/* ---------- Lights ---------- */
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffdfb0, 0x3a2d1e, 0.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1d0, 1.6);
sun.position.set(20, 30, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -100;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 180;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.04;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x6885a8, 0.25);
fill.position.set(-15, 10, -10);
scene.add(fill);

/* ---------- Materials ---------- */
const mats = {};
function mat(key, color, opts = {}) {
  mats[key] = new THREE.MeshLambertMaterial({ color, ...opts });
  return mats[key];
}
mat('earth', C.earth);
mat('earthDark', C.earthDark);
mat('ground', C.ground);
mat('grass', C.grass);
mat('grassDark', C.grassDark);
mat('tile', C.tile);
mat('tileDark', C.tileDark);
mat('vermillion', C.vermillion);
mat('vermillionDark', C.vermillionDark);
mat('bronze', C.bronze);
mat('wood', C.wood);
mat('woodLight', C.woodLight);
mat('white', C.white);
mat('black', C.black);
mat('water', C.water, { transparent: true, opacity: 0.85 });
mat('flag', C.flag);
mat('flagYellow', C.flagYellow);
mat('willow', C.willow);
mat('willowDark', C.willowDark);
mat('trunk', C.trunk);
mat('stone', C.stone);
mat('smoke', C.smoke, { transparent: true, opacity: 0.6 });
mat('lantern', 0xffb86b, { emissive: 0xffb86b, emissiveIntensity: 0 });

/* ---- Extended palette for crowds & outskirts ---- */
mat('silkPink', 0xC76B8A);
mat('silkBlue', 0x4670A0);
mat('silkGold', 0xD4A01E);
mat('silkGreen', 0x6B8E3D);
mat('silkPurple', 0x6A4884);
mat('bamboo', 0x82A04A);
mat('bambooDark', 0x506830);
mat('bambooStem', 0x9ABA68);
mat('rice', 0xCEB87A);
mat('paddy', 0x6E8B5A);
mat('paddyWater', 0x6A8276, { transparent: true, opacity: 0.7 });
mat('stream', 0x5A7A88, { transparent: true, opacity: 0.85 });
mat('camel', 0xC9A56C);
mat('camelDark', 0x9A7942);
mat('horseBay', 0x6A4530);
mat('horseBlack', 0x2A2018);
mat('horseWhite', 0xDCD2BC);
mat('skin', 0xD8B58A);
mat('iron', 0x4A4A52);
mat('ironDark', 0x2E2E36);
mat('armor', 0x6B6760);
mat('gold', 0xC8A45E, { emissive: 0xC8A45E, emissiveIntensity: 0.05 });
mat('jade', 0x6A9C7A);
mat('canvas', 0xC8B898);  // 帐篷
mat('canvasDark', 0x8C7C5C);
mat('charcoal', 0x1a1612);
mat('strawHat', 0xB8945A);
mat('blood', 0x5A2A2A);  // 战场旗
mat('peach', 0xE89BA8);  // 桃花
mat('petals', 0xF0C8D0, { transparent: true, opacity: 0.85 });
mat('beacon', 0xff7030, { emissive: 0xff5020, emissiveIntensity: 0 }); // 烽火
mat('roof', 0x3a4250);          // 唐代青瓦屋顶
mat('roofDark', 0x252a36);      // 屋脊深瓦
mat('roofGold', 0xc99a3a);      // 琉璃瓦顶 (皇家)

/* ---------- Geometry helpers ---------- */
function box(w, h, d, m, x = 0, y = 0, z = 0, rot = 0) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[m]);
  g.position.set(x, y + h / 2, z);
  g.rotation.y = rot;
  g.castShadow = true; g.receiveShadow = true;
  return g;
}
function cyl(r, h, m, segs = 8) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segs), mats[m]);
  g.castShadow = true; g.receiveShadow = true;
  return g;
}
function cone(r, h, m, segs = 6) {
  const g = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mats[m]);
  g.castShadow = true; g.receiveShadow = true;
  return g;
}

/* ============================================================
 *  Diorama Base — 大唐长安近郊版 (120×120，含河流、街道、田畔)
 * ============================================================ */
function makeBase() {
  const g = new THREE.Group();

  // 1. 顶层草地 — 主区域 (扩到 160 深以容三大殿群)
  const top = new THREE.Mesh(new THREE.BoxGeometry(120, 1.2, 160), mats.grass);
  top.position.set(0, -0.6, -23); top.receiveShadow = true;
  g.add(top);

  // 2. 中层土壁
  const side = new THREE.Mesh(new THREE.BoxGeometry(118, 3, 158), mats.earthDark);
  side.position.set(0, -2.6, -23); side.receiveShadow = true;
  g.add(side);

  // 3. 底层 (漂浮感)
  const bot = new THREE.Mesh(new THREE.BoxGeometry(112, 1.8, 150), mats.earth);
  bot.position.set(0, -5, -23);
  g.add(bot);

  // 3b. 大明宫三大殿北部金砖广场 (z=-50 ~ -100)
  const palacePlaza = new THREE.Mesh(new THREE.BoxGeometry(40, 0.08, 52), mats.stone);
  palacePlaza.position.set(0, 0.01, -75); palacePlaza.receiveShadow = true;
  g.add(palacePlaza);
  // 御道金砖 (中央 8 宽，贯通三殿)
  g.add(box(8, 0.06, 52, 'roofGold', 0, 0.10, -75));

  // 4. 北部战场区域用偏黄沙土色覆盖
  const battlefield = new THREE.Mesh(new THREE.BoxGeometry(60, 0.08, 18), mats.ground);
  battlefield.position.set(0, 0.01, -31); battlefield.receiveShadow = true;
  g.add(battlefield);
  for (let i = 0; i < 22; i++) {
    const w = 0.8 + Math.random() * 2;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, w), mats.earthDark);
    patch.position.set((Math.random() - 0.5) * 56, 0.04, -31 + (Math.random() - 0.5) * 16);
    patch.receiveShadow = true;
    g.add(patch);
  }

  // 5. 大雁塔基台 (东南区域单独抬起)
  const pagodaBase = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 20), mats.stone);
  pagodaBase.position.set(36, 0.18, 32); pagodaBase.receiveShadow = true;
  g.add(pagodaBase);

  // 6. 曲江池水面 (大水体, 西南区)
  const qujiang = new THREE.Mesh(new THREE.BoxGeometry(22, 0.12, 18), mats.stream);
  qujiang.position.set(-32, 0.04, 26); qujiang.receiveShadow = true;
  g.add(qujiang);
  // 池岸（石砌）
  g.add(box(24, 0.4, 0.6, 'stone', -32, 0.2, 16.5));
  g.add(box(24, 0.4, 0.6, 'stone', -32, 0.2, 35.5));
  g.add(box(0.6, 0.4, 19.2, 'stone', -43.5, 0.2, 26));
  g.add(box(0.6, 0.4, 19.2, 'stone', -20.5, 0.2, 26));
  // 池中倒影变化的浅色斑块
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(
      new THREE.BoxGeometry(2 + Math.random() * 3, 0.05, 2 + Math.random() * 3),
      mats.stream
    );
    r.material = mats.stream.clone();
    r.material.color = new THREE.Color(0x6fb1c4);
    r.position.set(-32 + (Math.random() - 0.5) * 18, 0.10, 26 + (Math.random() - 0.5) * 14);
    g.add(r);
  }

  // 7. 草丛斑块（散布全图）
  for (let i = 0; i < 56; i++) {
    const w = 1 + Math.random() * 2.5;
    const d = 1 + Math.random() * 2.5;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mats.grassDark);
    patch.position.set((Math.random() - 0.5) * 110, 0.02, -5 + (Math.random() - 0.5) * 110);
    patch.receiveShadow = true;
    g.add(patch);
  }

  // 8. 朱雀大街 — 南北贯通的官道 (扩长扩宽)
  g.add(box(4.2, 0.06, 110, 'stone', 0, 0.04, -5));
  // 街心分隔线 (唐代御道中分)
  g.add(box(0.2, 0.07, 100, 'earthDark', 0, 0.05, -5));
  // 东西副路
  g.add(box(110, 0.06, 3.2, 'stone', 0, 0.04, 0));
  // 通往东南大雁塔的支路
  g.add(box(2.4, 0.06, 26, 'stone', 14, 0.04, 18));
  // 通往西南曲江的支路
  g.add(box(2.4, 0.06, 26, 'stone', -14, 0.04, 18));

  // 9. 灞河 — 东侧贯穿南北的大河
  const baheRiver = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.10, 120), mats.stream);
  baheRiver.position.set(48, 0.05, -5); baheRiver.receiveShadow = true;
  g.add(baheRiver);
  // 灞河两岸石堤
  for (let z = -55; z <= 55; z += 3) {
    g.add(box(0.3, 0.18, 0.3, 'stone', 45.5, 0.07, z));
    g.add(box(0.3, 0.18, 0.3, 'stone', 50.5, 0.07, z));
  }

  // 10. 渭水 — 北部贯穿东西的支流
  const weiRiver = new THREE.Mesh(new THREE.BoxGeometry(60, 0.10, 3.5), mats.stream);
  weiRiver.position.set(-15, 0.05, -45); weiRiver.receiveShadow = true;
  g.add(weiRiver);

  // 11. 农场内东侧小溪（保留）
  const stream = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 30), mats.stream);
  stream.position.set(18, 0.05, 6);
  stream.receiveShadow = true;
  g.add(stream);
  for (let i = -14; i <= 14; i += 2) {
    g.add(box(0.3, 0.15, 0.3, 'stone', 17.2, 0.06, 6 + i));
    g.add(box(0.3, 0.15, 0.3, 'stone', 18.8, 0.06, 6 + i));
  }

  // 12. 田埂 (现有 + 扩展)
  for (let i = 0; i < 3; i++) {
    g.add(box(10, 0.06, 0.2, 'paddy', 25, 0.05, -8 + i * 5));
  }

  return g;
}
scene.add(makeBase());

/* ============================================================
 *  Han Architecture Modules
 * ============================================================ */

/**
 * 阙楼 (Que tower) — 汉代典型礼制门阙
 * 双柱式高台 + 母阙/子阙 + 重檐
 */
function makeQueTower(scale = 1) {
  const g = new THREE.Group();

  // base platform
  g.add(box(3, 0.5, 3, 'earth'));
  g.add(box(2.6, 0.15, 2.6, 'stone', 0, 0.5, 0));

  // main pillar (母阙)
  const mainCol = box(1.6, 4.5, 1.6, 'earth', 0, 0.65, 0);
  g.add(mainCol);

  // 朱红柱装饰 (vermillion vertical bands)
  g.add(box(0.18, 4.3, 0.05, 'vermillion', -0.62, 0.75, 0.83));
  g.add(box(0.18, 4.3, 0.05, 'vermillion', 0.62, 0.75, 0.83));
  g.add(box(0.18, 4.3, 0.05, 'vermillion', -0.62, 0.75, -0.83));
  g.add(box(0.18, 4.3, 0.05, 'vermillion', 0.62, 0.75, -0.83));

  // 子阙 (child gate, lower) - attached on +X side
  const child = box(1.0, 2.8, 1.0, 'earth', 1.4, 0.65, 0);
  g.add(child);
  // 朱红装饰
  g.add(box(0.12, 2.6, 0.04, 'vermillion', 1.04, 0.75, 0.52));
  g.add(box(0.12, 2.6, 0.04, 'vermillion', 1.76, 0.75, 0.52));

  // 上檐 (upper eave) on main tower
  const eave1 = box(2.4, 0.18, 2.4, 'tile', 0, 5.15, 0);
  g.add(eave1);
  // 屋顶 (pyramid roof)
  const roof = cone(1.6, 1.2, 'tile', 4);
  roof.position.set(0, 6.0, 0); roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // ridge ornament
  g.add(box(0.15, 0.4, 0.15, 'tileDark', 0, 6.8, 0));

  // 子阙屋顶
  const eave2 = box(1.6, 0.14, 1.6, 'tile', 1.4, 3.45, 0);
  g.add(eave2);
  const childRoof = cone(1.1, 0.9, 'tile', 4);
  childRoof.position.set(1.4, 4.05, 0); childRoof.rotation.y = Math.PI / 4;
  g.add(childRoof);

  // 中间装饰 (decorative bracket between eaves)
  g.add(box(2.2, 0.1, 2.2, 'woodLight', 0, 4.5, 0));

  g.scale.setScalar(scale);
  return g;
}

/**
 * 市楼 (Market watchtower) — 三层重檐高楼
 */
function makeMarketTower() {
  const g = new THREE.Group();

  // base platform
  g.add(box(4, 0.6, 4, 'stone'));

  // ground floor
  g.add(box(3.4, 2.0, 3.4, 'earth', 0, 0.6, 0));
  // doors on 4 sides (dark)
  g.add(box(0.8, 1.4, 0.05, 'black', 0, 1.0, 1.72));
  g.add(box(0.8, 1.4, 0.05, 'black', 0, 1.0, -1.72));
  // red columns
  g.add(box(0.2, 1.9, 0.2, 'vermillion', -1.5, 0.6, 1.5));
  g.add(box(0.2, 1.9, 0.2, 'vermillion', 1.5, 0.6, 1.5));
  g.add(box(0.2, 1.9, 0.2, 'vermillion', -1.5, 0.6, -1.5));
  g.add(box(0.2, 1.9, 0.2, 'vermillion', 1.5, 0.6, -1.5));

  // first eave
  g.add(box(4.4, 0.18, 4.4, 'tile', 0, 2.6, 0));

  // mid floor (smaller)
  g.add(box(2.6, 1.6, 2.6, 'earth', 0, 2.7, 0));
  // mid windows
  g.add(box(0.6, 0.6, 0.05, 'black', 0, 3.2, 1.32));
  g.add(box(0.6, 0.6, 0.05, 'black', 0, 3.2, -1.32));
  g.add(box(0.05, 0.6, 0.6, 'black', 1.32, 3.2, 0));
  g.add(box(0.05, 0.6, 0.6, 'black', -1.32, 3.2, 0));

  // second eave
  g.add(box(3.4, 0.14, 3.4, 'tile', 0, 4.3, 0));

  // top floor
  g.add(box(1.8, 1.3, 1.8, 'earth', 0, 4.4, 0));
  g.add(box(0.4, 0.6, 0.05, 'black', 0, 4.8, 0.92));
  g.add(box(0.4, 0.6, 0.05, 'black', 0, 4.8, -0.92));

  // top eave
  g.add(box(2.4, 0.12, 2.4, 'tile', 0, 5.8, 0));

  // pyramid roof
  const r = cone(1.5, 1.4, 'tile', 4);
  r.position.set(0, 6.5, 0); r.rotation.y = Math.PI / 4;
  g.add(r);
  // ridge
  g.add(box(0.15, 0.5, 0.15, 'tileDark', 0, 7.4, 0));
  // gold drum on top
  const drum = cyl(0.18, 0.4, 'flagYellow');
  drum.position.set(0, 7.7, 0); g.add(drum);

  return g;
}

/**
 * 院落 (Courtyard house) — 单层悬山顶
 */
function makeHouse(width = 4, depth = 3, color = 'earth') {
  const g = new THREE.Group();
  // base
  g.add(box(width, 0.2, depth, 'stone'));
  // walls
  g.add(box(width - 0.2, 1.8, depth - 0.2, color, 0, 0.2, 0));
  // door (front, +Z)
  g.add(box(0.7, 1.2, 0.05, 'black', 0, 0.8, (depth - 0.2) / 2 + 0.01));
  // small windows on sides
  g.add(box(0.05, 0.5, 0.5, 'black', (width - 0.2) / 2 + 0.01, 1.4, 0.6));
  g.add(box(0.05, 0.5, 0.5, 'black', (width - 0.2) / 2 + 0.01, 1.4, -0.6));
  // 悬山顶 (gable roof) — built as a triangular prism via boxes
  // ridge
  const ridge = box(width + 0.6, 0.1, 0.1, 'tileDark', 0, 2.6, 0);
  g.add(ridge);
  // tiled slopes (two boxes rotated)
  const slope1 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.12, depth * 0.75), mats.tile);
  slope1.position.set(0, 2.35, depth * 0.27);
  slope1.rotation.x = -Math.PI / 7;
  slope1.castShadow = true; slope1.receiveShadow = true;
  g.add(slope1);
  const slope2 = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.12, depth * 0.75), mats.tile);
  slope2.position.set(0, 2.35, -depth * 0.27);
  slope2.rotation.x = Math.PI / 7;
  slope2.castShadow = true; slope2.receiveShadow = true;
  g.add(slope2);
  // gable end triangles (faked with small boxes)
  g.add(box(0.05, 0.5, 0.5, 'earthDark', (width + 0.6) / 2 + 0.01, 2.3, 0));
  g.add(box(0.05, 0.5, 0.5, 'earthDark', -(width + 0.6) / 2 - 0.01, 2.3, 0));

  return g;
}

/**
 * 酒肆 (Tavern) — 民居 + 旗幌 banner
 */
function makeTavern() {
  const g = new THREE.Group();
  const house = makeHouse(3.6, 3, 'earth');
  g.add(house);
  // banner pole
  const pole = cyl(0.05, 4.2, 'wood'); pole.position.set(1.9, 2.1, 1.5);
  g.add(pole);
  // banner cloth (red, vertical)
  const banner = box(0.05, 1.4, 0.8, 'flag', 1.9, 3.4, 1.5);
  g.add(banner);
  // banner stripe yellow
  g.add(box(0.06, 1.0, 0.1, 'flagYellow', 1.94, 3.4, 1.5));
  // little 酒 mark (dark box)
  g.add(box(0.06, 0.2, 0.2, 'black', 1.94, 3.6, 1.5));
  // hanging lanterns
  const lantern = cyl(0.18, 0.3, 'lantern', 8);
  lantern.position.set(-1.5, 2.2, 1.7); g.add(lantern);
  lantern.userData.isLantern = true;
  return g;
}

/**
 * 铁匠铺 (Blacksmith) — 矮屋 + 烟囱 + 火光
 */
function makeBlacksmith() {
  const g = new THREE.Group();
  // small open shed
  g.add(box(3, 0.2, 2.4, 'stone'));
  g.add(box(2.8, 1.4, 2.2, 'earthDark', 0, 0.2, 0));
  // open front (dark)
  g.add(box(2.0, 1.0, 0.05, 'black', 0, 0.7, 1.12));
  // tiled roof
  const roof = box(3.2, 0.12, 2.6, 'tileDark', 0, 1.65, 0);
  roof.rotation.x = -Math.PI / 10;
  g.add(roof);
  // chimney
  g.add(box(0.4, 1.6, 0.4, 'earthDark', -0.8, 1.65, -0.6));
  g.add(box(0.5, 0.1, 0.5, 'black', -0.8, 2.45, -0.6));
  // anvil + forge glow
  const anvil = box(0.4, 0.3, 0.6, 'black', 0.6, 0.2, 0.4);
  g.add(anvil);
  const forge = cyl(0.25, 0.3, 'flag', 8);
  forge.position.set(-0.5, 0.35, 0.4);
  forge.material = mats.flag.clone();
  forge.material.emissive = new THREE.Color(0xff5a1a);
  forge.material.emissiveIntensity = 0.8;
  g.add(forge);
  // smoke plume (transparent boxes)
  const smokeGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = box(0.5 + i * 0.1, 0.4, 0.5 + i * 0.1, 'smoke', -0.8, 2.6 + i * 0.5, -0.6);
    s.material = mats.smoke.clone();
    s.material.opacity = 0.5 - i * 0.1;
    smokeGroup.add(s);
  }
  smokeGroup.userData.isSmoke = true;
  g.add(smokeGroup);
  return g;
}

/**
 * 水井 (Well) — 石井栏 + 辘轳
 */
function makeWell() {
  const g = new THREE.Group();
  // stone ring base
  const ring = cyl(0.7, 0.4, 'stone', 12);
  ring.position.y = 0.2; g.add(ring);
  // inner hole
  const hole = cyl(0.45, 0.42, 'black', 12);
  hole.position.y = 0.21; g.add(hole);
  // water at bottom
  const wat = cyl(0.42, 0.05, 'water', 12); wat.position.y = 0.05; g.add(wat);
  // 辘轳 frame (two posts + crossbar)
  g.add(box(0.1, 1.2, 0.1, 'wood', -0.5, 0.4, 0));
  g.add(box(0.1, 1.2, 0.1, 'wood', 0.5, 0.4, 0));
  // crossbar
  const cb = cyl(0.08, 1.2, 'wood', 6);
  cb.rotation.z = Math.PI / 2; cb.position.set(0, 1.5, 0);
  g.add(cb);
  // hanging rope
  g.add(box(0.04, 0.6, 0.04, 'black', 0, 1.1, 0));
  // bucket
  g.add(box(0.2, 0.2, 0.2, 'wood', 0, 0.8, 0));
  return g;
}

/**
 * 柳树 (Willow tree) — 主干 + 多层下垂枝叶
 */
function makeWillow(scale = 1) {
  const g = new THREE.Group();
  // trunk
  const trunk = cyl(0.15, 1.8, 'trunk', 6);
  trunk.position.y = 0.9; g.add(trunk);
  // layered drooping foliage (oblate boxes)
  for (let i = 0; i < 3; i++) {
    const r = 1.2 - i * 0.15;
    const foliage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 0),
      i % 2 === 0 ? mats.willow : mats.willowDark
    );
    foliage.position.y = 1.8 + i * 0.4;
    foliage.scale.y = 0.55;
    foliage.castShadow = true;
    g.add(foliage);
  }
  // drooping branches
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const br = box(0.05, 0.6, 0.05, 'willowDark',
      Math.cos(a) * 0.9, 1.6, Math.sin(a) * 0.9);
    br.rotation.z = Math.cos(a) * 0.3;
    g.add(br);
  }
  g.scale.setScalar(scale);
  return g;
}

/**
 * 松柏 (Pine) — cone style
 */
function makePine() {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 1.4, 'trunk', 6);
  trunk.position.y = 0.7; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const c = cone(0.9 - i * 0.18, 0.9, 'willowDark', 6);
    c.position.y = 1.3 + i * 0.55;
    g.add(c);
  }
  return g;
}

/**
 * 人物 (Person) — 头/身/腿三件式
 */
function makePerson(robe = 'white', cap = 'black') {
  const g = new THREE.Group();
  // legs
  g.add(box(0.12, 0.4, 0.18, 'black', 0, 0, 0));
  // robe (wide bottom)
  const robeMesh = box(0.5, 0.7, 0.4, robe, 0, 0.4, 0);
  g.add(robeMesh);
  // head
  const head = box(0.25, 0.25, 0.25, 'white', 0, 0.9, 0);
  g.add(head);
  // cap / 巾帻
  g.add(box(0.28, 0.1, 0.28, cap, 0, 1.07, 0));
  g.userData.baseY = 0;
  g.userData.idle = Math.random() * Math.PI * 2;
  return g;
}

/**
 * 牛车 (Ox cart) — 简化版
 */
function makeOxCart() {
  const g = new THREE.Group();
  // ox body
  g.add(box(1.2, 0.5, 0.5, 'wood', -0.8, 0.3, 0));
  // ox head
  g.add(box(0.4, 0.4, 0.4, 'wood', -1.6, 0.45, 0));
  // horns
  g.add(box(0.05, 0.2, 0.05, 'black', -1.7, 0.75, 0.15));
  g.add(box(0.05, 0.2, 0.05, 'black', -1.7, 0.75, -0.15));
  // cart body
  g.add(box(1.1, 0.4, 0.9, 'woodLight', 0.4, 0.4, 0));
  // wheels
  const wh1 = cyl(0.3, 0.08, 'wood', 10); wh1.rotation.x = Math.PI / 2;
  wh1.position.set(0.4, 0.3, 0.5); g.add(wh1);
  const wh2 = wh1.clone(); wh2.position.z = -0.5; g.add(wh2);
  // canopy (curved fabric)
  g.add(box(1.0, 0.05, 0.85, 'flag', 0.4, 0.65, 0));
  return g;
}

/* ============================================================
 *  Extended modules — 集市 / 农场 / 军营 / 商队 / 角色
 * ============================================================ */

/**
 * 市集摊位 (Market stall) — 四柱 + 彩色篷布 + 货物堆
 */
function makeMarketStall(awningMat = 'silkPink', goodsMat = 'wood') {
  const g = new THREE.Group();
  // 4 柱
  const ph = 1.6;
  [[-0.9, 0.5], [0.9, 0.5], [-0.9, -0.5], [0.9, -0.5]].forEach(([x, z]) => {
    g.add(box(0.08, ph, 0.08, 'wood', x, 0, z));
  });
  // 篷布
  const awning = box(2.2, 0.08, 1.4, awningMat, 0, ph + 0.1, 0);
  g.add(awning);
  // 摊台
  g.add(box(1.8, 0.08, 1.0, 'woodLight', 0, 0.6, 0));
  g.add(box(1.8, 0.6, 0.06, 'woodLight', 0, 0.3, -0.5));
  // 货物（小箱+陶罐）
  g.add(box(0.4, 0.3, 0.4, goodsMat, -0.5, 0.7, 0.1));
  g.add(box(0.4, 0.3, 0.4, goodsMat, 0.5, 0.7, 0.1));
  // 陶罐
  const jar = cyl(0.18, 0.35, 'earthDark', 8);
  jar.position.set(0, 0.85, 0.1); g.add(jar);
  // 篷布边垂下小布条
  g.add(box(0.1, 0.3, 0.06, awningMat, -1.0, ph + 0.0, 0.7));
  g.add(box(0.1, 0.3, 0.06, awningMat, 1.0, ph + 0.0, 0.7));
  return g;
}

/**
 * 望楼 / 烽燧 (Watchtower / Beacon tower)
 */
function makeWatchtower() {
  const g = new THREE.Group();
  // 高台基
  g.add(box(2.4, 0.3, 2.4, 'stone'));
  g.add(box(2.0, 4.0, 2.0, 'earth', 0, 0.3, 0));
  // 木格栅装饰
  g.add(box(0.08, 3.8, 0.08, 'wood', -1.05, 0.4, 1.05));
  g.add(box(0.08, 3.8, 0.08, 'wood', 1.05, 0.4, 1.05));
  g.add(box(0.08, 3.8, 0.08, 'wood', -1.05, 0.4, -1.05));
  g.add(box(0.08, 3.8, 0.08, 'wood', 1.05, 0.4, -1.05));
  // 顶层瞭望平台
  g.add(box(2.6, 0.2, 2.6, 'wood', 0, 4.4, 0));
  // 四角栏杆
  g.add(box(2.6, 0.6, 0.06, 'wood', 0, 4.7, 1.3));
  g.add(box(2.6, 0.6, 0.06, 'wood', 0, 4.7, -1.3));
  g.add(box(0.06, 0.6, 2.6, 'wood', 1.3, 4.7, 0));
  g.add(box(0.06, 0.6, 2.6, 'wood', -1.3, 4.7, 0));
  // 攒尖顶
  const roof = cone(1.8, 1.4, 'tile', 4);
  roof.position.set(0, 5.7, 0); roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // 烽火炉（顶上）
  const beacon = cyl(0.45, 0.5, 'beacon', 8);
  beacon.position.set(0, 4.7, 0);
  beacon.userData.isBeacon = true;
  g.add(beacon);
  return g;
}

/**
 * 汉军营帐 (Han army tent) — 圆锥布帐
 */
function makeArmyTent(canvasColor = 'canvas') {
  const g = new THREE.Group();
  // 帐底
  g.add(box(2.2, 0.1, 2.2, 'earthDark'));
  // 圆锥帐篷主体
  const tent = cone(1.3, 1.8, canvasColor, 8);
  tent.position.set(0, 1.0, 0);
  g.add(tent);
  // 帐顶细旗
  g.add(box(0.04, 0.6, 0.04, 'wood', 0, 2.0, 0));
  g.add(box(0.04, 0.25, 0.2, 'blood', 0.12, 2.2, 0));
  // 入口（黑暗矩形）
  g.add(box(0.4, 0.7, 0.04, 'black', 0, 0.45, 1.1));
  return g;
}

/**
 * 龙骨水车 (Han dragon-bone waterwheel) — 大轮 + 出水槽
 */
function makeWaterWheel() {
  const g = new THREE.Group();
  // 木架
  g.add(box(0.2, 2.4, 0.2, 'wood', -1.4, 0, 0));
  g.add(box(0.2, 2.4, 0.2, 'wood', 1.4, 0, 0));
  g.add(box(3.0, 0.2, 0.2, 'wood', 0, 2.4, 0));
  // 出水木槽
  g.add(box(4.5, 0.2, 0.5, 'woodLight', -3.0, 1.2, 0));
  g.add(box(4.5, 0.4, 0.06, 'wood', -3.0, 1.4, 0.3));
  g.add(box(4.5, 0.4, 0.06, 'wood', -3.0, 1.4, -0.3));
  // 轮（旋转 group）
  const wheel = new THREE.Group();
  // 主圆盘 (cylinder thin)
  const disc = cyl(1.6, 0.18, 'wood', 16);
  disc.rotation.z = Math.PI / 2;
  wheel.add(disc);
  // 内侧轮毂
  const hub = cyl(0.3, 0.32, 'woodLight', 8);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  // 叶片
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const blade = box(0.08, 0.6, 0.7, 'woodLight',
      Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0);
    blade.rotation.x = a;
    wheel.add(blade);
  }
  wheel.position.set(0, 1.4, 0);
  wheel.userData.isWaterWheel = true;
  g.add(wheel);
  // 水花
  const splash = box(0.6, 0.1, 0.6, 'paddyWater', 0, 0.15, 0);
  g.add(splash);
  return g;
}

/**
 * 稻田 (Rice paddy) — InstancedMesh rice plants on water
 */
function makeRicePaddy(width = 6, depth = 4, density = 30) {
  const g = new THREE.Group();
  // 田底 (水面)
  g.add(box(width, 0.1, depth, 'paddyWater', 0, 0, 0));
  // 田埂
  g.add(box(width + 0.2, 0.18, 0.18, 'paddy', 0, 0.05, depth / 2 + 0.1));
  g.add(box(width + 0.2, 0.18, 0.18, 'paddy', 0, 0.05, -depth / 2 - 0.1));
  g.add(box(0.18, 0.18, depth + 0.4, 'paddy', width / 2 + 0.1, 0.05, 0));
  g.add(box(0.18, 0.18, depth + 0.4, 'paddy', -width / 2 - 0.1, 0.05, 0));
  // 稻苗 (InstancedMesh)
  const stem = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 4);
  const im = new THREE.InstancedMesh(stem, mats.rice, density);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < density; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * (width - 0.8),
      0.18 + Math.random() * 0.05,
      (Math.random() - 0.5) * (depth - 0.8)
    );
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.scale.setScalar(0.8 + Math.random() * 0.4);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }
  im.castShadow = false; im.receiveShadow = true;
  if (typeof im.computeBoundingSphere === 'function') im.computeBoundingSphere();
  g.add(im);
  return g;
}

/**
 * 竹林 (Bamboo grove) — 直立细圆柱 + 顶端叶片
 */
function makeBambooGrove(count = 8) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const h = 2.5 + Math.random() * 1.8;
    const stem = cyl(0.08, h, 'bambooStem', 6);
    stem.position.set(
      (Math.random() - 0.5) * 2,
      h / 2,
      (Math.random() - 0.5) * 2
    );
    g.add(stem);
    // 叶簇
    for (let j = 1; j < 3; j++) {
      const leaf = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.35 + Math.random() * 0.15, 0),
        j % 2 === 0 ? mats.bamboo : mats.bambooDark
      );
      leaf.position.set(stem.position.x, h - 0.4 + j * 0.3, stem.position.z);
      leaf.scale.y = 0.4;
      g.add(leaf);
    }
  }
  return g;
}

/**
 * 桃花树 (Peach tree) — 树冠为粉色花朵
 */
function makePeachTree() {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 1.6, 'trunk', 6);
  trunk.position.y = 0.8; g.add(trunk);
  for (let i = 0; i < 2; i++) {
    const blossom = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85 - i * 0.1, 0),
      i === 0 ? mats.peach : mats.silkPink
    );
    blossom.position.y = 1.6 + i * 0.3;
    blossom.scale.y = 0.7;
    blossom.castShadow = true;
    g.add(blossom);
  }
  return g;
}

/**
 * 旗杆 (Flagpole) — 长杆 + 长条旗
 */
function makeFlagpole(flagMat = 'blood', flagText = '汉') {
  const g = new THREE.Group();
  const pole = cyl(0.06, 5.0, 'wood', 6);
  pole.position.y = 2.5; g.add(pole);
  // 顶端球
  const top = cyl(0.12, 0.18, 'gold', 8);
  top.position.y = 5.05; g.add(top);
  // 旗布
  const flag = box(0.04, 1.4, 1.4, flagMat, 0.04, 4.0, 0.74);
  flag.userData.isFlag = true;
  g.add(flag);
  // 旗上小黑字（用小方块意象表示）
  g.add(box(0.05, 0.5, 0.3, 'black', 0.06, 4.2, 0.74));
  return g;
}

/**
 * 食肆推车 (Food cart) — 双轮带篷
 */
function makeFoodCart() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.5, 0.8, 'woodLight', 0, 0.4, 0));
  // 顶篷
  g.add(box(1.5, 0.06, 0.9, 'silkGold', 0, 1.1, 0));
  // 两轮
  const w1 = cyl(0.28, 0.06, 'wood', 10); w1.rotation.x = Math.PI / 2;
  w1.position.set(0, 0.28, 0.45); g.add(w1);
  const w2 = w1.clone(); w2.position.z = -0.45; g.add(w2);
  // 推手
  g.add(box(0.08, 0.06, 1.0, 'wood', 0.78, 0.6, 0));
  // 货
  g.add(box(0.3, 0.25, 0.3, 'rice', -0.2, 0.78, 0));
  return g;
}

/**
 * 兵器架 (Weapon rack)
 */
function makeWeaponRack() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.06, 0.4, 'wood', 0, 0.03, 0));
  g.add(box(0.08, 1.2, 0.08, 'wood', -0.7, 0.6, 0));
  g.add(box(0.08, 1.2, 0.08, 'wood', 0.7, 0.6, 0));
  g.add(box(1.6, 0.06, 0.06, 'wood', 0, 1.2, 0));
  // 戟 (4 把)
  for (let i = 0; i < 4; i++) {
    const x = -0.6 + i * 0.4;
    g.add(box(0.04, 1.4, 0.04, 'iron', x, 0.7, 0));
    g.add(box(0.18, 0.14, 0.06, 'iron', x, 1.35, 0));
  }
  return g;
}

/**
 * 烽火台 (Beacon platform) — 矮土台 + 火堆
 */
function makeBeaconPlatform() {
  const g = new THREE.Group();
  g.add(box(1.8, 0.5, 1.8, 'stone'));
  g.add(box(1.4, 0.4, 1.4, 'earthDark', 0, 0.5, 0));
  const fire = cyl(0.35, 0.4, 'beacon', 6);
  fire.position.set(0, 0.9, 0);
  fire.userData.isBeacon = true;
  g.add(fire);
  // 干柴
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(box(0.6, 0.06, 0.06, 'wood', Math.cos(a) * 0.4, 0.78, Math.sin(a) * 0.4));
  }
  return g;
}

/**
 * 小石桥 (Small stone bridge)
 */
function makeBridge() {
  const g = new THREE.Group();
  g.add(box(2.0, 0.2, 2.4, 'stone', 0, 0.3, 0));
  // 桥栏
  g.add(box(2.0, 0.4, 0.08, 'stone', 0, 0.5, 1.16));
  g.add(box(2.0, 0.4, 0.08, 'stone', 0, 0.5, -1.16));
  return g;
}

/* ----------------------------------------------------------------
 *  Characters — 各类汉代人物
 * ---------------------------------------------------------------- */

/**
 * 通用人物构造 (Generic person builder)
 */
/* ----------------------------------------------------------------
 *  人物 V3 — 圆头·颈·宽肩·胶囊四肢·汉式下摆，按身份分发饰
 * ----------------------------------------------------------------
 *  坐标约定：足底 y=-0.2，头顶 y≈+1.15，全身贴近 1.4 米比例
 */

function buildPerson(opts = {}) {
  const robe   = opts.robe   || 'white';
  const cap    = opts.cap    || 'black';
  const hat    = opts.hat    || null;
  const tool   = opts.tool   || null;
  const skinM  = opts.skin   || 'skin';
  const scale  = opts.scale  || 1.0;
  const role   = opts.role   || 'civilian';   // civilian / soldier / lady / child / xiongnu / scholar
  const isShort = role === 'soldier' || role === 'xiongnu' || role === 'child';

  const g = new THREE.Group();
  const M = (n) => mats[n];

  /* === 下身 === */
  if (isShort) {
    // 短衣 (袍下摆较短)
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.28, 0.34, 12), M(robe));
    hem.position.y = -0.02; hem.castShadow = true; hem.receiveShadow = true;
    g.add(hem);
    // 战裤 / 胡裤
    const pant = role === 'xiongnu' ? 'horseBay' : (role === 'soldier' ? 'iron' : 'black');
    const legGeo = new THREE.CapsuleGeometry(0.055, 0.12, 4, 6);
    const legL = new THREE.Mesh(legGeo, M(pant));
    legL.position.set(-0.08, -0.13, 0); g.add(legL);
    const legR = new THREE.Mesh(legGeo, M(pant));
    legR.position.set(0.08, -0.13, 0); g.add(legR);
    // 靴
    const boot = new THREE.BoxGeometry(0.12, 0.07, 0.18);
    const bootL = new THREE.Mesh(boot, M('black'));
    bootL.position.set(-0.08, -0.23, 0.02); g.add(bootL);
    const bootR = new THREE.Mesh(boot, M('black'));
    bootR.position.set(0.08, -0.23, 0.02); g.add(bootR);
  } else {
    // 深衣下摆 (上窄下宽圆台)
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.40, 0.55, 14), M(robe));
    hem.position.y = 0.08; hem.castShadow = true; hem.receiveShadow = true;
    g.add(hem);
    // 下摆深色边
    const border = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.04, 14), M('black'));
    border.position.y = -0.18; g.add(border);
    // 中线 (上衣下连/直裾)
    if (role === 'scholar' || role === 'civilian') {
      g.add(box(0.04, 0.55, 0.02, 'black', 0, 0.08, 0.39));
    }
  }

  /* === 躯干 (上衣) === */
  const torsoY = isShort ? 0.55 : 0.58;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.26, 4, 8), M(robe));
  torso.position.y = torsoY; torso.castShadow = true;
  g.add(torso);

  // 交领 (汉式 V 形白领，从胸前到肩)
  const collar = box(0.16, 0.18, 0.02, 'white', 0, torsoY + 0.05, 0.14);
  g.add(collar);
  // 领黑边
  g.add(box(0.18, 0.04, 0.02, 'black', 0, torsoY + 0.14, 0.14));
  g.add(box(0.04, 0.18, 0.02, 'black', -0.07, torsoY + 0.05, 0.14));
  g.add(box(0.04, 0.18, 0.02, 'black', 0.07, torsoY + 0.05, 0.14));

  // 腰带
  const beltColor = role === 'soldier' ? 'iron' : (role === 'lady' ? 'silkGold' : 'gold');
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), M(beltColor));
  belt.position.y = torsoY - 0.18; g.add(belt);
  // 腰带扣
  g.add(box(0.07, 0.06, 0.02, 'gold', 0, torsoY - 0.18, 0.18));

  // 披帛 (女子专属，肩上飘带)
  if (role === 'lady') {
    const piboColor = opts.pibo || (Math.random() < 0.5 ? 'silkPink' : 'silkBlue');
    // 横披
    g.add(box(0.46, 0.04, 0.04, piboColor, 0, torsoY + 0.15, 0.13));
    // 后飘
    g.add(box(0.04, 0.55, 0.04, piboColor, 0.22, torsoY - 0.05, -0.18));
    g.add(box(0.04, 0.45, 0.04, piboColor, -0.22, torsoY - 0.1, -0.18));
  }

  /* === 双臂 === */
  const shoulderY = torsoY + 0.05;
  // 上臂 (宽袖)
  const armGeo = new THREE.CapsuleGeometry(role === 'lady' ? 0.10 : 0.08, 0.18, 4, 6);
  const armL = new THREE.Mesh(armGeo, M(robe));
  armL.position.set(-0.22, shoulderY - 0.12, 0); armL.castShadow = true; armL.rotation.z = 0.08;
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, M(robe));
  armR.position.set(0.22, shoulderY - 0.12, 0); armR.castShadow = true; armR.rotation.z = -0.08;
  g.add(armR);
  // 袖口黑边 (汉服宽袖收口)
  const cuffR = role === 'lady' ? 0.11 : 0.09;
  const cuffGeo = new THREE.CylinderGeometry(cuffR, cuffR, 0.04, 8);
  const cuffMeshL = new THREE.Mesh(cuffGeo, M('black'));
  cuffMeshL.position.set(-0.22, shoulderY - 0.25, 0); g.add(cuffMeshL);
  const cuffMeshR = new THREE.Mesh(cuffGeo, M('black'));
  cuffMeshR.position.set(0.22, shoulderY - 0.25, 0); g.add(cuffMeshR);
  // 下臂 + 手球 (露出皮肤)
  const foreGeo = new THREE.CapsuleGeometry(0.05, 0.12, 4, 6);
  const farmL = new THREE.Mesh(foreGeo, M(skinM));
  farmL.position.set(-0.22, shoulderY - 0.36, 0); g.add(farmL);
  const farmR = new THREE.Mesh(foreGeo, M(skinM));
  farmR.position.set(0.22, shoulderY - 0.36, 0); g.add(farmR);

  /* === 头 === */
  const headY = isShort ? 0.95 : 0.98;
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), M(skinM));
  head.position.y = headY; head.castShadow = true;
  g.add(head);
  // 颈
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.07, 8), M(skinM));
  neck.position.y = headY - 0.13; g.add(neck);
  // 五官
  const eyeGeo = new THREE.SphereGeometry(0.013, 4, 4);
  const eyeL = new THREE.Mesh(eyeGeo, M('black'));
  eyeL.position.set(-0.038, headY + 0.012, 0.105); g.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, M('black'));
  eyeR.position.set(0.038, headY + 0.012, 0.105); g.add(eyeR);
  // 嘴
  g.add(box(0.05, 0.012, 0.02, 'black', 0, headY - 0.04, 0.115));

  /* === 头饰 / 发型 === */
  let finalHat = hat;
  if (!finalHat) {
    if (role === 'lady') finalHat = 'bun';
    else if (role === 'child') finalHat = 'topknot';
    else if (role === 'scholar') finalHat = 'scholar';
  }
  applyHeadgear(g, finalHat, cap, headY);

  /* === 持物 === */
  if (tool) applyTool(g, tool, shoulderY);

  /* === 鳞甲 === */
  if (opts.armor) {
    // 三圈胸甲
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.07, 12), M('armor'));
      band.position.y = torsoY + 0.1 - i * 0.09;
      g.add(band);
      // 金边
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.166, 0.166, 0.008, 12), M('gold'));
      trim.position.y = torsoY + 0.14 - i * 0.09;
      g.add(trim);
    }
    // 双肩鳞甲 (扁平半球)
    const pauldGeo = new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const pauldL = new THREE.Mesh(pauldGeo, M('armor'));
    pauldL.position.set(-0.24, torsoY + 0.13, 0); pauldL.castShadow = true;
    g.add(pauldL);
    const pauldR = new THREE.Mesh(pauldGeo, M('armor'));
    pauldR.position.set(0.24, torsoY + 0.13, 0); pauldR.castShadow = true;
    g.add(pauldR);
    // 髀甲 (腰下垂片)
    g.add(box(0.34, 0.08, 0.03, 'armor', 0, torsoY - 0.27, 0.18));
    g.add(box(0.34, 0.08, 0.03, 'armor', 0, torsoY - 0.27, -0.18));
  }

  g.userData.idle = Math.random() * Math.PI * 2;
  g.userData.basePos = new THREE.Vector3();

  // 姿态变化 — bend (弯腰)/squat (蹲)/kneel (跪)/raise (举手)/dance (舞)
  const pose = opts.pose || null;
  if (pose === 'bend') {
    g.rotation.x = 0.5;
    g.position.y = -0.05;
  } else if (pose === 'squat') {
    g.scale.y = 0.7;
    g.position.y = -0.15;
  } else if (pose === 'kneel') {
    g.scale.y = 0.55;
    g.position.y = -0.2;
  } else if (pose === 'raise') {
    // 举右手向上
    armR.rotation.z = -1.4;
    armR.position.set(0.20, shoulderY + 0.05, 0);
    farmR.rotation.z = -1.4;
    farmR.position.set(0.30, shoulderY + 0.15, 0);
  } else if (pose === 'dance') {
    // 胡旋舞：双臂张开
    armL.rotation.z = 1.2; armR.rotation.z = -1.2;
    armL.position.set(-0.28, shoulderY + 0.05, 0);
    armR.position.set(0.28, shoulderY + 0.05, 0);
    farmL.rotation.z = 1.2; farmR.rotation.z = -1.2;
    farmL.position.set(-0.42, shoulderY + 0.12, 0);
    farmR.position.set(0.42, shoulderY + 0.12, 0);
    g.userData.isDancer = true;
  }

  g.scale.setScalar((g.scale.y !== 1 ? g.scale.y : 1) * scale);
  if (pose === 'squat' || pose === 'kneel') {
    g.scale.x = scale; g.scale.z = scale;  // 保持横向不缩
  }

  // 标记 NPC (用于点击对话)
  g.userData.npc = true;
  g.userData.npcRole = role;
  g.userData.npcRobe = robe;
  g.userData.npcId = (Math.random() * 1e9) | 0;
  g.traverse(c => { if (c.isMesh) c.userData.npcRoot = g; });

  return g;
}

/**
 * 头饰 / 发型 — 按身份分化
 */
function applyHeadgear(g, hat, cap, headY) {
  const M = (n) => mats[n];

  // 通用黑发盖 (顶 半球)
  const hairGeo = new THREE.SphereGeometry(0.122, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);

  if (hat === 'straw') {
    // 草笠 (扁圆锥+顶尖)
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.08, 10), M('strawHat'));
    c.position.y = headY + 0.12; c.castShadow = true; g.add(c);
    // 顶尖
    g.add(box(0.04, 0.04, 0.04, 'wood', 0, headY + 0.18, 0));
    // 系带
    g.add(box(0.02, 0.12, 0.02, 'black', 0.08, headY, 0));
  } else if (hat === 'iron') {
    // 武士铁盔 (半球+顶圈+红缨)
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      M('iron')
    );
    helm.position.y = headY + 0.01; helm.castShadow = true;
    g.add(helm);
    // 金圈
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.015, 4, 14), M('gold'));
    rim.position.y = headY + 0.01; rim.rotation.x = Math.PI / 2;
    g.add(rim);
    // 红缨柱
    const plumeBase = cyl(0.018, 0.04, 'iron', 6);
    plumeBase.position.y = headY + 0.16; g.add(plumeBase);
    // 红缨锥
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.14, 6), M('blood'));
    plume.position.y = headY + 0.26; g.add(plume);
    // 护颊 (两侧小垂片)
    g.add(box(0.04, 0.08, 0.04, 'iron', -0.12, headY - 0.04, 0));
    g.add(box(0.04, 0.08, 0.04, 'iron', 0.12, headY - 0.04, 0));
  } else if (hat === 'turban') {
    // 头巾 (Torus 环 + 顶盖)
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.038, 6, 14), M('silkBlue'));
    t.position.y = headY + 0.06; t.rotation.x = Math.PI / 2;
    g.add(t);
    // 头顶
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('silkBlue'));
    top.position.y = headY + 0.08; g.add(top);
  } else if (hat === 'xnFur') {
    // 匈奴尖顶毡帽
    const fur = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 10), M('wood'));
    fur.position.y = headY + 0.15; fur.castShadow = true;
    g.add(fur);
    // 帽檐毛皮
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), M('horseBay'));
    brim.position.y = headY + 0.04; g.add(brim);
  } else if (hat === 'scholar') {
    // 进贤冠 (方顶+后竖板)
    g.add(box(0.16, 0.10, 0.20, 'black', 0, headY + 0.13, 0));
    g.add(box(0.04, 0.18, 0.04, 'black', 0, headY + 0.18, -0.09));
    // 黑发盖
    const hair = new THREE.Mesh(hairGeo, M('black'));
    hair.position.y = headY + 0.01;
    g.add(hair);
  } else if (hat === 'bun') {
    // 高发髻 (女子)
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), M('black'));
    bun.position.y = headY + 0.16; bun.scale.y = 0.85;
    g.add(bun);
    // 簪 (斜插)
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.18, 6), M('gold'));
    pin.position.set(0.07, headY + 0.19, 0); pin.rotation.z = -0.7;
    g.add(pin);
    // 黑发
    const hair = new THREE.Mesh(hairGeo, M('black'));
    hair.position.y = headY + 0.01;
    g.add(hair);
    // 鬓发 (两侧垂髻)
    const sideL = cyl(0.025, 0.08, 'black', 6);
    sideL.position.set(-0.10, headY - 0.02, 0); g.add(sideL);
    const sideR = cyl(0.025, 0.08, 'black', 6);
    sideR.position.set(0.10, headY - 0.02, 0); g.add(sideR);
  } else if (hat === 'topknot') {
    // 总角 (儿童两小髻)
    const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M('black'));
    k1.position.set(-0.075, headY + 0.13, 0); g.add(k1);
    const k2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M('black'));
    k2.position.set(0.075, headY + 0.13, 0); g.add(k2);
    // 黑发盖
    const hair = new THREE.Mesh(hairGeo, M('black'));
    hair.position.y = headY + 0.01;
    g.add(hair);
  } else {
    // 默认: 平民黑发 + 介帻 (汉代百姓常戴的软帽)
    const hair = new THREE.Mesh(hairGeo, M('black'));
    hair.position.y = headY + 0.01;
    g.add(hair);
    if (cap && cap !== 'none') {
      // 介帻 (扁方形软冠)
      g.add(box(0.20, 0.08, 0.20, cap, 0, headY + 0.10, 0));
      // 帻顶 (略凸)
      g.add(box(0.16, 0.03, 0.16, cap, 0, headY + 0.15, 0));
    }
  }
}

/**
 * 手持工具 / 武器
 */
function applyTool(g, tool, shoulderY) {
  const M = (n) => mats[n];
  if (tool === 'halberd') {
    // 戟 — 杆 + 横刃 + 钩刺 + 红缨
    g.add(box(0.04, 1.5, 0.04, 'wood', 0.32, shoulderY + 0.4, 0));
    g.add(box(0.04, 0.06, 0.04, 'iron', 0.32, shoulderY + 1.18, 0));
    g.add(box(0.20, 0.18, 0.04, 'iron', 0.32, shoulderY + 1.05, 0));
    g.add(box(0.04, 0.22, 0.18, 'iron', 0.32, shoulderY + 1.05, 0.1));
    // 红缨
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.10, 6), M('blood'));
    tassel.position.set(0.32, shoulderY + 1.28, 0); g.add(tassel);
  } else if (tool === 'staff') {
    // 杖
    g.add(box(0.04, 1.25, 0.04, 'wood', 0.30, shoulderY + 0.2, 0));
    const knob = cyl(0.04, 0.06, 'gold', 8);
    knob.position.set(0.30, shoulderY + 0.85, 0); g.add(knob);
  } else if (tool === 'rake') {
    // 耙
    g.add(box(0.04, 1.15, 0.04, 'wood', 0.30, shoulderY + 0.1, 0));
    g.add(box(0.36, 0.06, 0.04, 'wood', 0.30, shoulderY + 0.65, 0));
    for (let i = -1; i <= 1; i++) {
      g.add(box(0.04, 0.16, 0.04, 'wood', 0.30 + i * 0.10, shoulderY + 0.55, 0));
    }
  } else if (tool === 'basket') {
    // 篮 (圆口)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.22, 10), M('strawHat'));
    b.position.set(0.28, shoulderY + 0.05, 0); b.castShadow = true;
    g.add(b);
    // 提把
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 10, Math.PI), M('wood'));
    handle.position.set(0.28, shoulderY + 0.17, 0); handle.rotation.x = Math.PI / 2;
    g.add(handle);
  } else if (tool === 'scroll') {
    // 简 / 卷 (横持)
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), M('woodLight'));
    s.position.set(0.28, shoulderY + 0.05, 0.05); s.rotation.x = Math.PI / 2;
    g.add(s);
  }
}

const makeSoldier   = (color = 'vermillion') => buildPerson({ robe: color, role: 'soldier', hat: 'iron', tool: 'halberd', armor: true });
const makeFarmer    = () => buildPerson({ robe: ['white', 'silkBlue', 'silkGreen'][Math.floor(Math.random() * 3)], hat: 'straw', tool: Math.random() < 0.5 ? 'rake' : 'basket' });
const makeMerchant  = () => buildPerson({ robe: ['silkBlue', 'silkGreen', 'silkPurple'][Math.floor(Math.random() * 3)], cap: 'black', tool: 'staff' });
const makeForeigner = () => buildPerson({ robe: 'silkPurple', skin: 'wood', hat: 'turban', tool: 'staff' });
const makeLady      = () => buildPerson({ robe: ['silkPink', 'silkBlue', 'silkGold'][Math.floor(Math.random() * 3)], role: 'lady', scale: 0.92 });
const makeScholar   = () => buildPerson({ robe: 'silkBlue', role: 'scholar', tool: 'scroll' });
const makeChild     = () => buildPerson({ robe: 'silkPink', role: 'child', scale: 0.62 });
const makeVendor    = () => buildPerson({ robe: 'silkGreen', cap: 'black', tool: 'basket' });

/**
 * 马 (Horse)
 */
function makeHorse(color = 'horseBay') {
  const g = new THREE.Group();
  // 身体
  g.add(box(1.4, 0.55, 0.45, color, 0, 0.8, 0));
  // 脖
  const neck = box(0.4, 0.7, 0.35, color, 0.65, 1.0, 0);
  neck.rotation.z = -0.5; g.add(neck);
  // 头
  g.add(box(0.45, 0.3, 0.3, color, 0.95, 1.25, 0));
  // 鬃 (颜色稍深)
  g.add(box(0.6, 0.1, 0.06, 'horseBlack', 0.5, 1.15, 0));
  // 尾
  g.add(box(0.15, 0.5, 0.06, 'horseBlack', -0.75, 0.85, 0));
  // 4 腿
  const leg = (x, z) => g.add(box(0.12, 0.6, 0.12, color, x, 0.3, z));
  leg(0.5, 0.18); leg(0.5, -0.18); leg(-0.5, 0.18); leg(-0.5, -0.18);
  return g;
}

/**
 * 骆驼 (Camel) — 双峰
 */
function makeCamel(loaded = false) {
  const g = new THREE.Group();
  // 身体
  g.add(box(1.6, 0.55, 0.5, 'camel', 0, 1.0, 0));
  // 双峰
  const h1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mats.camelDark);
  h1.position.set(0.3, 1.5, 0); h1.scale.set(1, 0.7, 0.9); g.add(h1);
  const h2 = h1.clone(); h2.position.x = -0.3; g.add(h2);
  // 脖
  const neck = box(0.4, 0.9, 0.35, 'camel', 0.75, 1.3, 0);
  neck.rotation.z = -0.4; g.add(neck);
  // 头
  g.add(box(0.4, 0.3, 0.32, 'camel', 1.05, 1.65, 0));
  // 4 长腿
  const leg = (x, z) => g.add(box(0.13, 0.85, 0.13, 'camel', x, 0.4, z));
  leg(0.55, 0.2); leg(0.55, -0.2); leg(-0.55, 0.2); leg(-0.55, -0.2);
  // 货 (silk bales)
  if (loaded) {
    g.add(box(0.55, 0.3, 0.55, 'silkBlue', 0.3, 1.85, 0.32));
    g.add(box(0.55, 0.3, 0.55, 'silkGold', -0.3, 1.85, 0.32));
    g.add(box(0.55, 0.3, 0.55, 'silkBlue', 0.3, 1.85, -0.32));
    g.add(box(0.55, 0.3, 0.55, 'silkGold', -0.3, 1.85, -0.32));
  }
  return g;
}

/**
 * 鸡 (Chicken)
 */
function makeChicken() {
  const g = new THREE.Group();
  g.add(box(0.22, 0.2, 0.18, 'white', 0, 0.15, 0));
  g.add(box(0.14, 0.16, 0.14, 'white', 0.12, 0.3, 0));
  g.add(box(0.04, 0.06, 0.04, 'flag', 0.16, 0.4, 0));  // 鸡冠
  g.add(box(0.06, 0.04, 0.04, 'flagYellow', 0.22, 0.32, 0));  // 喙
  return g;
}

/**
 * 犬 (Dog)
 */
function makeDog() {
  const g = new THREE.Group();
  g.add(box(0.4, 0.22, 0.16, 'wood', 0, 0.2, 0));
  g.add(box(0.16, 0.18, 0.14, 'wood', 0.22, 0.3, 0));
  g.add(box(0.04, 0.16, 0.04, 'wood', -0.2, 0.32, 0));  // 尾
  g.add(box(0.05, 0.15, 0.05, 'wood', 0.15, 0.05, 0.06));
  g.add(box(0.05, 0.15, 0.05, 'wood', 0.15, 0.05, -0.06));
  g.add(box(0.05, 0.15, 0.05, 'wood', -0.15, 0.05, 0.06));
  g.add(box(0.05, 0.15, 0.05, 'wood', -0.15, 0.05, -0.06));
  return g;
}

/* ----------------------------------------------------------------
 *  Battlefield Modules — 战场专属
 * ---------------------------------------------------------------- */

/**
 * 弩车 (Heavy crossbow cart / 大黄连弩)
 */
function makeCrossbowCart() {
  const g = new THREE.Group();
  // 车架
  g.add(box(2.0, 0.4, 1.2, 'wood', 0, 0.3, 0));
  // 两轮
  const w1 = cyl(0.4, 0.1, 'wood', 10); w1.rotation.x = Math.PI / 2;
  w1.position.set(0, 0.4, 0.7); g.add(w1);
  const w2 = w1.clone(); w2.position.z = -0.7; g.add(w2);
  // 弩座 (枢轴)
  g.add(box(0.8, 0.3, 0.6, 'woodLight', 0, 0.65, 0));
  // 弩臂 (横向)
  g.add(box(2.6, 0.06, 0.06, 'iron', 0, 0.9, 0.15));
  // 弦
  g.add(box(2.4, 0.04, 0.04, 'black', 0, 0.9, 0.05));
  // 长箭
  g.add(box(0.06, 0.06, 1.6, 'wood', 0, 0.9, -0.6));
  g.add(box(0.12, 0.12, 0.18, 'iron', 0, 0.9, -1.45));  // 箭头
  // 操作把手
  g.add(box(0.5, 0.06, 0.06, 'wood', 0, 0.75, 0.3));
  return g;
}

/**
 * 战鼓 (War drum) + 鼓架
 */
function makeWarDrum() {
  const g = new THREE.Group();
  // 鼓架
  g.add(box(0.1, 1.4, 0.1, 'wood', -0.6, 0, 0.3));
  g.add(box(0.1, 1.4, 0.1, 'wood', -0.6, 0, -0.3));
  g.add(box(0.1, 1.4, 0.1, 'wood', 0.6, 0, 0.3));
  g.add(box(0.1, 1.4, 0.1, 'wood', 0.6, 0, -0.3));
  // 鼓 (圆柱横置)
  const drum = cyl(0.5, 1.1, 'flag', 12);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, 0.9, 0);
  drum.userData.isDrum = true;
  g.add(drum);
  // 鼓面装饰
  const face1 = cyl(0.5, 0.04, 'silkGold', 12);
  face1.rotation.z = Math.PI / 2;
  face1.position.set(0.56, 0.9, 0); g.add(face1);
  const face2 = face1.clone(); face2.position.x = -0.56; g.add(face2);
  // 圆心黑点
  g.add(cyl(0.12, 0.05, 'black', 8)).rotation.z = Math.PI / 2;
  g.children[g.children.length - 1].position.set(0.6, 0.9, 0);
  return g;
}

/**
 * 帅帐 (General's tent) — 比普通帐篷大，红顶绣金
 */
function makeGeneralsTent() {
  const g = new THREE.Group();
  // 帐底
  g.add(box(3.4, 0.15, 3.4, 'earthDark'));
  // 主体 (圆锥)
  const tent = cone(2.0, 2.4, 'blood', 8);
  tent.position.set(0, 1.35, 0);
  g.add(tent);
  // 红顶金线
  const stripe = cyl(2.05, 0.06, 'silkGold', 8);
  stripe.position.set(0, 1.5, 0); g.add(stripe);
  // 顶旗杆
  g.add(box(0.04, 0.8, 0.04, 'wood', 0, 2.6, 0));
  // 顶旗
  g.add(box(0.04, 0.4, 0.3, 'silkGold', 0.16, 2.7, 0));
  // 入口
  g.add(box(0.6, 0.9, 0.04, 'black', 0, 0.6, 1.7));
  // 两侧旗
  g.add(box(0.06, 1.6, 0.06, 'wood', -1.9, 0, 1.7));
  g.add(box(0.06, 0.5, 0.4, 'blood', -1.86, 1.4, 1.7));
  g.add(box(0.06, 1.6, 0.06, 'wood', 1.9, 0, 1.7));
  g.add(box(0.06, 0.5, 0.4, 'blood', 1.94, 1.4, 1.7));
  return g;
}

/**
 * 骑兵 (Mounted rider) — 马 + 人
 */
function makeRider(opts = {}) {
  const g = new THREE.Group();
  const horseColor = opts.horse || 'horseBay';
  const horse = makeHorse(horseColor);
  g.add(horse);
  // 骑手
  const rider = buildPerson({
    robe: opts.robe || 'vermillion',
    hat: opts.hat || 'iron',
    armor: opts.armor !== false,
    tool: opts.tool || 'halberd',
    scale: 0.85,
  });
  rider.position.set(0, 0.9, 0);
  g.add(rider);
  return g;
}

/**
 * 匈奴战士 (Xiongnu warrior) — 皮帽+短马刀
 */
function makeXiongnu() {
  return buildPerson({
    robe: 'horseBay',
    cap: 'wood',
    hat: 'turban',
    tool: 'halberd',
    skin: 'wood',
  });
}

/**
 * 匈奴骑兵
 */
function makeXiongnuRider() {
  const g = new THREE.Group();
  const horse = makeHorse(Math.random() < 0.5 ? 'horseBay' : 'horseBlack');
  g.add(horse);
  const rider = buildPerson({
    robe: 'horseBay',
    hat: 'turban',
    tool: 'halberd',
    skin: 'wood',
    scale: 0.85,
  });
  rider.position.set(0, 0.9, 0);
  g.add(rider);
  return g;
}

/**
 * 匈奴穹庐 (Xiongnu yurt) — 圆顶毡帐
 */
function makeYurt() {
  const g = new THREE.Group();
  // 圆柱底
  const bottom = cyl(1.2, 1.2, 'canvasDark', 10);
  bottom.position.y = 0.6; g.add(bottom);
  // 圆顶
  const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), mats.canvasDark);
  dome.position.y = 1.2;
  dome.scale.y = 0.6;
  dome.castShadow = true;
  g.add(dome);
  // 顶部出烟孔
  g.add(cyl(0.18, 0.2, 'black', 6)).position.set(0, 1.85, 0);
  // 入口（黑色矩形）
  g.add(box(0.5, 0.7, 0.04, 'black', 0, 0.35, 1.21));
  return g;
}

/**
 * 烟尘 (Dust cloud) — 用于战马奔腾扬尘
 */
function makeDustCloud() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = mats.smoke.clone();
    m.color = new THREE.Color(0xc8a878);
    m.opacity = 0.4 - i * 0.1;
    const c = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.2, 0),
      m
    );
    c.position.set(
      (Math.random() - 0.5) * 0.6,
      0.2 + i * 0.2,
      (Math.random() - 0.5) * 0.6
    );
    c.scale.y = 0.6;
    g.add(c);
  }
  g.userData.isDust = true;
  return g;
}

/**
 * 倒下的兵 (Fallen soldier) — 表现战场惨烈
 */
function makeFallenSoldier(side = 'han') {
  const g = new THREE.Group();
  const color = side === 'han' ? 'vermillion' : 'horseBay';
  g.add(box(0.5, 0.18, 0.42, color, 0, 0.1, 0));
  g.add(box(0.25, 0.18, 0.25, side === 'han' ? 'iron' : 'wood', 0.34, 0.1, 0));
  // 抛出的兵器
  g.add(box(0.04, 0.04, 0.9, 'iron', 0.5, 0.05, -0.4));
  // 阵亡之旗 (横倒)
  if (Math.random() < 0.5) {
    const flag = box(1.2, 0.04, 0.4, side === 'han' ? 'blood' : 'horseBay', -0.6, 0.05, 0);
    flag.rotation.z = 0.1;
    g.add(flag);
  }
  return g;
}

/**
 * 大旗杆 (Battle banner) — 高大双面旗，会飘动
 */
function makeBattleBanner(color = 'blood', tall = true) {
  const g = new THREE.Group();
  const h = tall ? 6.5 : 4.5;
  const pole = cyl(0.08, h, 'wood', 6);
  pole.position.y = h / 2; g.add(pole);
  // 顶端枪尖
  const tip = cone(0.12, 0.4, 'iron', 6);
  tip.position.y = h + 0.15; g.add(tip);
  // 主旗
  const flag = box(0.05, 2.4, 1.8, color, 0.05, h - 1.5, 0.94);
  flag.userData.isFlag = true;
  g.add(flag);
  // 旗下流苏
  g.add(box(0.06, 0.6, 0.1, 'silkGold', 0.06, h - 2.9, 0.94));
  // 中央徽 (黑方块)
  g.add(box(0.06, 0.7, 0.5, 'black', 0.07, h - 1.5, 0.94));
  return g;
}

/* ----------------------------------------------------------------
 *  唐代地标模块 — 大雁塔 / 朱雀门 / 曲江画舫 / 石拱桥 / 筒车 / 飞檐
 * ---------------------------------------------------------------- */

/**
 * 飞檐 — 唐代建筑屋顶 (重檐+戗角+鸱吻)
 * 设计层次：底部反翘飞檐板 → 主屋顶四面坡 → 屋脊 + 鸱吻 + 翘角
 */
function makeTangRoof(w, d, h = 0.5, color = 'roof', withChiwen = true) {
  const g = new THREE.Group();
  // 1. 反翘飞檐板 (大于本体的薄板，4 角微抬起)
  const eave = box(w + 1.0, 0.08, d + 1.0, color, 0, 0, 0);
  g.add(eave);
  // 2. 第二层飞檐 (略小)
  g.add(box(w + 0.6, 0.10, d + 0.6, color, 0, 0.10, 0));
  // 3. 主屋顶 (四坡攒尖)
  const main = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.62, h, 4),
    mats[color]
  );
  main.rotation.y = Math.PI / 4;
  main.position.y = 0.15 + h / 2;
  main.castShadow = true;
  g.add(main);
  // 4. 中脊 (长方向)
  g.add(box(0.18, 0.10, d + 0.4, color, 0, 0.15 + h - 0.05, 0));
  // 5. 鸱吻 (屋脊两端兽吻)
  if (withChiwen) {
    const chiGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const chiMat = mats.gold;
    const chi1 = new THREE.Mesh(chiGeo, chiMat);
    chi1.position.set(0, 0.15 + h - 0.02, d / 2 + 0.2);
    chi1.scale.set(0.7, 1.2, 1.0);
    g.add(chi1);
    const chi2 = new THREE.Mesh(chiGeo, chiMat);
    chi2.position.set(0, 0.15 + h - 0.02, -(d / 2 + 0.2));
    chi2.scale.set(0.7, 1.2, 1.0);
    g.add(chi2);
  }
  // 6. 4 角翘角 (戗角向上微弯)
  const cornerOff = 0.4;
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const wedge = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.4, 4),
      mats[color]
    );
    wedge.rotation.z = sx * 0.4;
    wedge.rotation.x = -sz * 0.4;
    wedge.position.set(sx * (w / 2 + cornerOff), 0.15, sz * (d / 2 + cornerOff));
    g.add(wedge);
  });
  return g;
}

/**
 * 大雁塔 — 唐代七层方塔 (Tang Wild Goose Pagoda)
 */
function makeWildGoosePagoda() {
  const g = new THREE.Group();
  // 塔基 (高台)
  g.add(box(7.5, 0.4, 7.5, 'stone', 0, 0.2, 0));
  g.add(box(7.0, 0.3, 7.0, 'earthDark', 0, 0.55, 0));
  // 7 层塔身 (每层逐渐缩小)
  const levels = [
    { w: 5.6, h: 1.4 },   // 1
    { w: 5.1, h: 1.3 },   // 2
    { w: 4.6, h: 1.2 },   // 3
    { w: 4.1, h: 1.1 },   // 4
    { w: 3.6, h: 1.0 },   // 5
    { w: 3.1, h: 0.9 },   // 6
    { w: 2.6, h: 0.8 },   // 7
  ];
  let y = 0.7;
  levels.forEach((lv, i) => {
    // 塔身 (砖石色)
    const body = box(lv.w, lv.h, lv.w, 'stone', 0, y + lv.h / 2, 0);
    body.castShadow = true;
    g.add(body);
    // 拱门窗 (每面一个深色凹槽)
    const winColor = 'black';
    const wDepth = lv.w / 2 + 0.01;
    g.add(box(lv.w * 0.18, lv.h * 0.55, 0.02, winColor, 0, y + lv.h * 0.45, wDepth));
    g.add(box(lv.w * 0.18, lv.h * 0.55, 0.02, winColor, 0, y + lv.h * 0.45, -wDepth));
    g.add(box(0.02, lv.h * 0.55, lv.w * 0.18, winColor, wDepth, y + lv.h * 0.45, 0));
    g.add(box(0.02, lv.h * 0.55, lv.w * 0.18, winColor, -wDepth, y + lv.h * 0.45, 0));
    // 飞檐 (每层顶端)
    const eave = box(lv.w + 0.6, 0.10, lv.w + 0.6, 'roof', 0, y + lv.h + 0.05, 0);
    g.add(eave);
    // 椽柱 (每层下檐细线)
    const trim = box(lv.w + 0.4, 0.04, lv.w + 0.4, 'wood', 0, y + lv.h, 0);
    g.add(trim);
    // 4 角鸱吻
    if (i < 6) {
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mats.gold);
        tip.position.set(sx * (lv.w / 2 + 0.3), y + lv.h + 0.18, sz * (lv.w / 2 + 0.3));
        g.add(tip);
      });
    }
    y += lv.h + 0.10;
  });
  // 塔顶刹 (覆钵 + 相轮 + 宝珠)
  const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mats.gold);
  sphere1.position.y = y + 0.1; g.add(sphere1);
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.025, 0.04, 6, 16), mats.gold);
    r.position.y = y + 0.5 + i * 0.18; r.rotation.x = Math.PI / 2;
    g.add(r);
  }
  // 顶针
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.7, 8), mats.gold);
  needle.position.y = y + 1.7;
  g.add(needle);
  // 顶尖宝珠
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.gold);
  top.position.y = y + 2.1;
  g.add(top);
  return g;
}

/**
 * 大明宫含元殿 — 唐代皇家正殿 (高台 + 三重檐 + 龙尾道 + 东西阙)
 * 历史原型：11 间面阔、75 米宽、15 米高台、龙尾道前导
 */
function makeHanyuanHall() {
  const g = new THREE.Group();

  /* === 1. 三层高台 (台基) === */
  // 最底层 (最宽)
  g.add(box(26, 1.4, 16, 'stone', 0, 0, 0));
  // 中层
  const tier2 = box(22, 1.4, 13, 'stone', 0, 1.4, 0);
  g.add(tier2);
  // 最上层 (建筑基座)
  const tier3 = box(19, 1.4, 11, 'roofGold', 0, 2.8, 0);
  g.add(tier3);

  // 台基边缘金边 (玉栏石栏)
  for (let i = 0; i < 3; i++) {
    const W = [26, 22, 19][i];
    const D = [16, 13, 11][i];
    const Y = [1.4, 2.8, 4.2][i];
    // 4 边栏杆 (柱+横梁)
    for (const [edge, sign] of [['x', 1], ['x', -1]]) {
      for (let k = -W / 2 + 1; k <= W / 2 - 1; k += 2) {
        g.add(box(0.18, 0.4, 0.18, 'stone', k, Y, sign * D / 2));
      }
      g.add(box(W, 0.08, 0.1, 'stone', 0, Y + 0.25, sign * D / 2));
    }
    for (const sign of [1, -1]) {
      for (let k = -D / 2 + 1; k <= D / 2 - 1; k += 2) {
        g.add(box(0.18, 0.4, 0.18, 'stone', sign * W / 2, Y, k));
      }
      g.add(box(0.1, 0.08, D, 'stone', sign * W / 2, Y + 0.25, 0));
    }
  }

  // 龙凤丹墀 (中央正面台阶 + 浮雕)
  const dragonRamp = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.6, 5),
    mats.roofGold
  );
  dragonRamp.position.set(0, 0.3, 8.0);
  g.add(dragonRamp);
  // 龙纹 (简化为深色凹槽 + 金线)
  g.add(box(3.6, 0.05, 4.6, 'stone', 0, 0.6, 8.0));
  // 浮雕线条
  for (let i = 0; i < 4; i++) {
    g.add(box(0.05, 0.06, 4.4, 'roofGold', -1.4 + i * 0.93, 0.62, 8.0));
  }
  // 两侧台阶 (左右)
  for (const sx of [-1, 1]) {
    g.add(box(2.0, 0.4, 5, 'stone', sx * 3.5, 0.2, 8.0));
    // 阶梯条
    for (let i = 0; i < 5; i++) {
      g.add(box(2.0, 0.08, 0.9, 'stone', sx * 3.5, 0.4 + i * 0.06, 10.5 - i * 0.95));
    }
  }
  // 龙尾道上的栏杆柱
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      g.add(box(0.18, 0.5, 0.18, 'stone', sx * 4.6, 0.5, 10.5 - i * 1.3));
    }
  }

  /* === 2. 主殿建筑 (在 tier3 上面 y=4.2 起) === */
  const baseY = 4.2;
  // 殿身 (柱廊 + 殿墙)
  const hallW = 17, hallD = 9, hallH = 3.5;
  // 墙 (内殿，朱红柱)
  g.add(box(hallW, hallH, hallD, 'wood', 0, baseY + 0.2, 0));

  // 11 根明柱 (沿前廊，柱身朱红)
  for (let i = -5; i <= 5; i++) {
    const col = box(0.32, hallH + 0.2, 0.32, 'blood', i * 1.55, baseY + 0.1, hallD / 2 + 0.05);
    g.add(col);
    // 柱顶斗拱 (简化为方块)
    g.add(box(0.55, 0.18, 0.55, 'roofGold', i * 1.55, baseY + hallH + 0.2, hallD / 2 + 0.05));
  }
  // 后廊 5 柱
  for (let i = -2; i <= 2; i++) {
    const col = box(0.32, hallH + 0.2, 0.32, 'blood', i * 2.5, baseY + 0.1, -hallD / 2);
    g.add(col);
  }
  // 殿前匾额"含元殿"
  g.add(box(3.5, 0.9, 0.15, 'roofGold', 0, baseY + hallH - 0.2, hallD / 2 + 0.15));
  g.add(box(3.0, 0.7, 0.06, 'blood', 0, baseY + hallH - 0.2, hallD / 2 + 0.21));
  // 殿门 (开口)
  g.add(box(2.8, hallH * 0.7, 0.1, 'black', 0, baseY + hallH * 0.35, hallD / 2 + 0.10));
  // 门两侧朱漆柱 (大柱)
  g.add(box(0.45, hallH, 0.45, 'blood', -1.5, baseY + 0.1, hallD / 2 + 0.10));
  g.add(box(0.45, hallH, 0.45, 'blood', 1.5, baseY + 0.1, hallD / 2 + 0.10));

  /* === 3. 第一层飞檐 (最宽) === */
  const eave1 = makeTangRoof(hallW, hallD, 1.0, 'roofGold');
  eave1.position.y = baseY + hallH + 0.4;
  g.add(eave1);

  /* === 4. 第二层楼 (略小，殿身) === */
  const tier2Y = baseY + hallH + 2.0;
  g.add(box(hallW - 4, 2.4, hallD - 2, 'wood', 0, tier2Y, 0));
  // 二层柱
  for (let i = -3; i <= 3; i++) {
    g.add(box(0.22, 2.4, 0.22, 'blood', i * 2.0, tier2Y, (hallD - 2) / 2));
  }
  // 二层匾额
  g.add(box(2.0, 0.5, 0.1, 'roofGold', 0, tier2Y + 1.0, (hallD - 2) / 2 + 0.1));
  // 二层窗
  for (let i = -2; i <= 2; i += 2) {
    g.add(box(0.8, 0.6, 0.06, 'black', i * 1.5, tier2Y + 0.2, (hallD - 2) / 2 + 0.05));
  }
  // 二层飞檐
  const eave2 = makeTangRoof(hallW - 4, hallD - 2, 0.7, 'roofGold');
  eave2.position.y = tier2Y + 1.4;
  g.add(eave2);

  /* === 5. 第三层顶 (最小，攒尖) === */
  const tier3Y = tier2Y + 2.6;
  g.add(box(hallW - 9, 1.6, hallD - 4, 'wood', 0, tier3Y, 0));
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.18, 1.6, 0.18, 'blood', i * 1.5, tier3Y, (hallD - 4) / 2));
  }
  // 三层小窗
  g.add(box(0.5, 0.4, 0.06, 'black', 0, tier3Y, (hallD - 4) / 2 + 0.05));
  // 三层最终飞檐 (高耸)
  const eave3 = makeTangRoof(hallW - 9, hallD - 4, 0.9, 'roofGold');
  eave3.position.y = tier3Y + 0.95;
  g.add(eave3);

  // 屋顶宝顶 (镀金葫芦 + 顶针)
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mats.gold);
  top.position.y = tier3Y + 2.1; g.add(top);
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.8, 8), mats.gold);
  needle.position.y = tier3Y + 2.8; g.add(needle);

  return g;
}

/**
 * 宣政殿 — 唐代日常政务殿 (含元殿之后)
 * 历史原型：常朝之所、单层重檐、规模略小
 */
function makeXuanzhengHall() {
  const g = new THREE.Group();

  // 两层高台 (较含元殿降一阶)
  g.add(box(20, 1.2, 13, 'stone', 0, 0, 0));
  g.add(box(16, 1.2, 10, 'woodLight', 0, 1.2, 0));

  // 台基栏杆
  for (let i = 0; i < 2; i++) {
    const W = [20, 16][i];
    const D = [13, 10][i];
    const Y = [1.2, 2.4][i];
    for (const sign of [1, -1]) {
      for (let k = -W / 2 + 1; k <= W / 2 - 1; k += 2.5) {
        g.add(box(0.16, 0.35, 0.16, 'stone', k, Y, sign * D / 2));
      }
      g.add(box(W, 0.07, 0.1, 'stone', 0, Y + 0.22, sign * D / 2));
    }
  }

  // 中央台阶
  g.add(box(4, 0.5, 4, 'stone', 0, 0.25, 6.5));
  for (let i = 0; i < 4; i++) {
    g.add(box(3.6, 0.08, 0.85, 'stone', 0, 0.5 + i * 0.06, 7.8 - i * 0.85));
  }

  // 主殿 (单层重檐，较小)
  const hallW = 14, hallD = 7.5, hallH = 3.2;
  g.add(box(hallW, hallH, hallD, 'wood', 0, 2.4 + 0.1, 0));

  // 9 根明柱前廊
  for (let i = -4; i <= 4; i++) {
    const col = box(0.28, hallH + 0.2, 0.28, 'blood', i * 1.55, 2.5, hallD / 2 + 0.05);
    g.add(col);
    g.add(box(0.48, 0.15, 0.48, 'roofGold', i * 1.55, 2.5 + hallH + 0.15, hallD / 2 + 0.05));
  }
  // 后廊 4 柱
  for (let i = -1.5; i <= 1.5; i++) {
    g.add(box(0.28, hallH + 0.2, 0.28, 'blood', i * 2.2, 2.5, -hallD / 2));
  }

  // 殿前匾额 "宣政殿"
  g.add(box(3.0, 0.7, 0.12, 'roofGold', 0, 2.5 + hallH - 0.3, hallD / 2 + 0.15));
  g.add(box(2.6, 0.55, 0.05, 'blood', 0, 2.5 + hallH - 0.3, hallD / 2 + 0.21));
  // 殿门
  g.add(box(2.4, hallH * 0.7, 0.1, 'black', 0, 2.5 + hallH * 0.35, hallD / 2 + 0.10));
  g.add(box(0.4, hallH, 0.4, 'blood', -1.3, 2.5, hallD / 2 + 0.10));
  g.add(box(0.4, hallH, 0.4, 'blood', 1.3, 2.5, hallD / 2 + 0.10));

  // 第一层飞檐
  const eave1 = makeTangRoof(hallW, hallD, 0.9, 'roofGold');
  eave1.position.y = 2.5 + hallH + 0.3;
  g.add(eave1);

  // 第二层 (顶顶)
  g.add(box(hallW - 4, 2.0, hallD - 2, 'wood', 0, 2.5 + hallH + 1.8, 0));
  for (let i = -3; i <= 3; i++) {
    g.add(box(0.2, 2.0, 0.2, 'blood', i * 1.5, 2.5 + hallH + 1.8, (hallD - 2) / 2));
  }
  g.add(box(1.6, 0.4, 0.08, 'roofGold', 0, 2.5 + hallH + 2.8, (hallD - 2) / 2 + 0.1));

  // 二层飞檐
  const eave2 = makeTangRoof(hallW - 4, hallD - 2, 0.8, 'roofGold');
  eave2.position.y = 2.5 + hallH + 3.0;
  g.add(eave2);

  // 屋脊宝顶
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6), mats.gold);
  cap.position.y = 2.5 + hallH + 3.8; g.add(cap);
  const cn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 6), mats.gold);
  cn.position.y = 2.5 + hallH + 4.4; g.add(cn);

  return g;
}

/**
 * 紫宸殿 — 唐代内殿 (皇帝寝兴之所，常召近臣)
 * 比宣政殿更小、更私人化，但屋顶更精巧
 */
function makeZichenHall() {
  const g = new THREE.Group();

  // 单层高台
  g.add(box(15, 1.0, 10, 'stone', 0, 0, 0));
  g.add(box(12, 0.6, 8, 'woodLight', 0, 1.0, 0));

  // 台基栏杆
  const W = 12, D = 8;
  for (const sign of [1, -1]) {
    for (let k = -W / 2 + 1; k <= W / 2 - 1; k += 1.8) {
      g.add(box(0.14, 0.3, 0.14, 'stone', k, 1.6, sign * D / 2));
    }
    g.add(box(W, 0.06, 0.08, 'stone', 0, 1.85, sign * D / 2));
  }

  // 中央踏步
  g.add(box(3, 0.4, 3, 'stone', 0, 0.2, 5));
  for (let i = 0; i < 3; i++) {
    g.add(box(2.6, 0.06, 0.65, 'stone', 0, 0.4 + i * 0.05, 6 - i * 0.65));
  }

  // 主殿 (较小、私密)
  const hallW = 10, hallD = 6, hallH = 2.6;
  g.add(box(hallW, hallH, hallD, 'wood', 0, 1.6 + 0.1, 0));

  // 7 柱前廊
  for (let i = -3; i <= 3; i++) {
    const col = box(0.24, hallH + 0.15, 0.24, 'blood', i * 1.5, 1.7, hallD / 2 + 0.05);
    g.add(col);
    g.add(box(0.4, 0.12, 0.4, 'roofGold', i * 1.5, 1.7 + hallH + 0.12, hallD / 2 + 0.05));
  }

  // 匾额 "紫宸殿"
  g.add(box(2.4, 0.55, 0.1, 'roofGold', 0, 1.7 + hallH - 0.25, hallD / 2 + 0.15));
  g.add(box(2.0, 0.4, 0.05, 'blood', 0, 1.7 + hallH - 0.25, hallD / 2 + 0.20));
  // 殿门
  g.add(box(1.8, hallH * 0.7, 0.1, 'black', 0, 1.7 + hallH * 0.35, hallD / 2 + 0.08));

  // 窗格 (两侧)
  for (const sx of [-1, 1]) {
    g.add(box(1.4, 0.9, 0.06, 'silkGold', sx * 3.2, 1.7 + hallH * 0.4, hallD / 2 + 0.06));
    // 窗棂
    for (let i = -1; i <= 1; i++) {
      g.add(box(0.04, 0.9, 0.04, 'wood', sx * 3.2 + i * 0.45, 1.7 + hallH * 0.4, hallD / 2 + 0.10));
    }
  }

  // 飞檐 (单层但更高耸翘起)
  const eave = makeTangRoof(hallW, hallD, 1.1, 'roofGold');
  eave.position.y = 1.7 + hallH + 0.3;
  g.add(eave);

  // 屋脊吻 + 宝顶
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.gold);
  cap.position.y = 1.7 + hallH + 1.4; g.add(cap);
  const cn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), mats.gold);
  cn.position.y = 1.7 + hallH + 1.95; g.add(cn);

  return g;
}

/**
 * 翔鸾阁 / 栖凤阁 — 含元殿两侧的双阙
 */
function makePalaceTower(isLeft = true) {
  const g = new THREE.Group();
  // 阙基 (高台)
  g.add(box(5, 2, 5, 'stone', 0, 0, 0));
  g.add(box(4.4, 0.4, 4.4, 'roofGold', 0, 2.2, 0));
  // 阙身 (重檐两层)
  g.add(box(3.8, 2.2, 3.8, 'wood', 0, 3.5, 0));
  // 四角柱
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.add(box(0.2, 2.2, 0.2, 'blood', sx * 1.7, 3.5, sz * 1.7));
  }
  // 一层飞檐
  const e1 = makeTangRoof(3.8, 3.8, 0.5, 'roofGold');
  e1.position.y = 4.85;
  g.add(e1);
  // 二层楼
  g.add(box(2.6, 1.8, 2.6, 'wood', 0, 6.2, 0));
  // 二层飞檐 (攒尖)
  const e2 = makeTangRoof(2.6, 2.6, 0.7, 'roofGold');
  e2.position.y = 7.4;
  g.add(e2);
  // 顶宝瓶
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mats.gold);
  sphere.position.y = 8.2; g.add(sphere);
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 6), mats.gold);
  n.position.y = 8.65; g.add(n);
  // 旗杆
  const pole = box(0.06, 2.0, 0.06, 'wood', 0, 9.0, 0);
  g.add(pole);
  // 旗
  const flag = box(0.06, 0.6, 0.5, isLeft ? 'silkPurple' : 'silkGold', 0.3, 9.5, 0);
  flag.userData.isFlag = true;
  g.add(flag);
  return g;
}

/**
 * 朱雀门 — 唐长安南门城楼 (三门道 + 重檐城楼)
 */
function makeZhuqueGate() {
  const g = new THREE.Group();
  // 城墙底座 (左右两段)
  g.add(box(7, 4, 4, 'stone', -7, 2, 0));
  g.add(box(7, 4, 4, 'stone', 7, 2, 0));
  // 三门道之间的两个墩
  g.add(box(1.5, 4, 4, 'stone', -2, 2, 0));
  g.add(box(1.5, 4, 4, 'stone', 2, 2, 0));
  // 门洞顶部横梁 (压在门道上)
  g.add(box(20, 0.4, 4, 'wood', 0, 4.2, 0));
  // 三道门洞 (深色凹陷)
  g.add(box(2, 2.5, 0.4, 'black', -4.5, 1.25, 2.0));
  g.add(box(2, 2.5, 0.4, 'black', 0, 1.25, 2.0));
  g.add(box(2, 2.5, 0.4, 'black', 4.5, 1.25, 2.0));
  // 朱漆门扉
  g.add(box(2, 2.5, 0.1, 'blood', -4.5, 1.25, 2.05));
  g.add(box(2, 2.5, 0.1, 'blood', 0, 1.25, 2.05));
  g.add(box(2, 2.5, 0.1, 'blood', 4.5, 1.25, 2.05));
  // 门钉 (金钉九列)
  for (const x of [-4.5, 0, 4.5]) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 5; j++) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), mats.gold);
        stud.position.set(x + (i - 1) * 0.5, 0.5 + j * 0.5, 2.12);
        g.add(stud);
      }
    }
  }
  // 城楼基台 (城墙顶)
  g.add(box(20, 0.3, 4, 'stone', 0, 4.55, 0));
  // 城楼主体 (重檐木构)
  g.add(box(13, 2.5, 3.2, 'wood', 0, 5.95, 0));
  // 一层柱子 (8 根)
  for (let i = -3; i <= 3; i++) {
    g.add(box(0.15, 2.5, 0.15, 'wood', i * 1.8, 5.95, 1.55));
    g.add(box(0.15, 2.5, 0.15, 'wood', i * 1.8, 5.95, -1.55));
  }
  // 一层飞檐
  const eave1 = makeTangRoof(13, 3.2, 0.5, 'roof');
  eave1.position.y = 7.3;
  g.add(eave1);
  // 二层楼 (略小)
  g.add(box(10, 2.0, 2.6, 'wood', 0, 8.7, 0));
  // 二层飞檐
  const eave2 = makeTangRoof(10, 2.6, 0.5, 'roof');
  eave2.position.y = 9.85;
  g.add(eave2);
  // 城楼匾额"朱雀"
  g.add(box(2.0, 0.7, 0.06, 'gold', 0, 7.9, 1.32));
  g.add(box(1.8, 0.6, 0.04, 'blood', 0, 7.9, 1.36));
  // 城楼两端旗
  const flag1 = box(0.06, 3.5, 0.06, 'wood', -5, 11.8, 0);
  g.add(flag1);
  const f1 = box(0.06, 0.8, 0.6, 'silkGold', -4.7, 11.4, 0);
  f1.userData.isFlag = true;
  g.add(f1);
  const flag2 = box(0.06, 3.5, 0.06, 'wood', 5, 11.8, 0);
  g.add(flag2);
  const f2 = box(0.06, 0.8, 0.6, 'silkGold', 5.3, 11.4, 0);
  f2.userData.isFlag = true;
  g.add(f2);
  return g;
}

/**
 * 石拱桥 — 跨河单拱
 */
function makeArchBridge(length = 6) {
  const g = new THREE.Group();
  // 桥面板 (略拱)
  g.add(box(length, 0.18, 1.6, 'stone', 0, 0.7, 0));
  // 拱底 (实拱)
  for (let i = 0; i < 7; i++) {
    const t = (i / 6 - 0.5) * 2; // -1 to 1
    const y = 0.6 - Math.abs(t * t) * 0.4;
    g.add(box(length / 7 + 0.1, 0.06, 1.6, 'stone', t * (length / 2 - length / 14), y, 0));
  }
  // 桥栏 (两侧)
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * (length / 4.5);
    g.add(box(0.12, 0.5, 0.12, 'stone', x, 1.0, 0.7));
    g.add(box(0.12, 0.5, 0.12, 'stone', x, 1.0, -0.7));
  }
  // 顶部栏杆
  g.add(box(length, 0.06, 0.1, 'stone', 0, 1.22, 0.7));
  g.add(box(length, 0.06, 0.1, 'stone', 0, 1.22, -0.7));
  return g;
}

/**
 * 曲江画舫 — 唐代游船
 */
function makePleasureBoat() {
  const g = new THREE.Group();
  // 船身
  g.add(box(2.4, 0.18, 0.9, 'wood', 0, 0.18, 0));
  g.add(box(1.8, 0.2, 0.7, 'woodLight', 0, 0.30, 0));
  // 船头船尾上翘
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4), mats.wood);
  bow.rotation.z = Math.PI / 2;
  bow.position.set(1.3, 0.25, 0);
  g.add(bow);
  // 顶棚 (4 根柱+顶盖)
  for (const [x, z] of [[-0.5, 0.3], [-0.5, -0.3], [0.5, 0.3], [0.5, -0.3]]) {
    g.add(box(0.08, 0.5, 0.08, 'wood', x, 0.65, z));
  }
  // 顶盖 (唐式弧顶简化为飞檐)
  const roof = makeTangRoof(1.4, 1.0, 0.3, 'silkPurple', false);
  roof.position.y = 1.0;
  g.add(roof);
  return g;
}

/**
 * 曲江亭 — 池中水亭
 */
function makeQujiangPavilion() {
  const g = new THREE.Group();
  // 水中木桩
  for (const [x, z] of [[-1.2, 1.2], [-1.2, -1.2], [1.2, 1.2], [1.2, -1.2]]) {
    g.add(box(0.18, 1.0, 0.18, 'wood', x, 0.5, z));
  }
  // 亭台
  g.add(box(3.2, 0.2, 3.2, 'wood', 0, 1.1, 0));
  // 亭柱 (4 根)
  for (const [x, z] of [[-1.3, 1.3], [-1.3, -1.3], [1.3, 1.3], [1.3, -1.3]]) {
    g.add(box(0.12, 1.6, 0.12, 'blood', x, 1.95, z));
  }
  // 亭顶 (唐式飞檐)
  const roof = makeTangRoof(3.0, 3.0, 0.8, 'silkPurple');
  roof.position.y = 2.85;
  g.add(roof);
  // 中央桌椅
  g.add(box(0.6, 0.06, 0.6, 'woodLight', 0, 1.4, 0));
  for (const [x, z] of [[-0.3, 0.3], [-0.3, -0.3], [0.3, 0.3], [0.3, -0.3]]) {
    g.add(box(0.04, 0.2, 0.04, 'wood', x, 1.25, z));
  }
  return g;
}

/**
 * 筒车 — 唐代水力提水器 (大圆轮+水筒)
 */
function makeTubeWaterWheel() {
  const g = new THREE.Group();
  // 河中支架
  g.add(box(0.3, 1.6, 0.3, 'wood', -1.6, 0.8, 0));
  g.add(box(0.3, 1.6, 0.3, 'wood', 1.6, 0.8, 0));
  // 大轮
  const wheel = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(1.4, 0.08, 6, 24);
  const ring1 = new THREE.Mesh(ringGeo, mats.wood);
  ring1.rotation.y = Math.PI / 2;
  wheel.add(ring1);
  const ring2 = new THREE.Mesh(ringGeo, mats.wood);
  ring2.position.x = 0.6; ring2.rotation.y = Math.PI / 2;
  wheel.add(ring2);
  // 辐条
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = box(0.06, 2.8, 0.06, 'wood', 0, 0, 0);
    spoke.position.set(0.3, Math.sin(a) * 0.7, Math.cos(a) * 0.7);
    spoke.rotation.x = a;
    spoke.scale.y = 1;
    wheel.add(spoke);
  }
  // 水筒 (8 个，等间距挂在轮缘)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.4, 8), mats.wood);
    t.position.set(0.3, Math.sin(a) * 1.4, Math.cos(a) * 1.4);
    t.rotation.x = a;
    wheel.add(t);
  }
  wheel.position.set(0, 1.5, 0);
  wheel.userData.isWaterWheel = true;
  g.add(wheel);
  // 引水槽
  g.add(box(1.6, 0.08, 0.4, 'woodLight', 1.9, 2.4, 0));
  return g;
}

/**
 * 曲辕犁 — 唐代农具 (单牛拉)
 */
function makeCurvedPlough() {
  const g = new THREE.Group();
  // 犁柄
  const stick = box(0.06, 0.06, 1.2, 'wood', 0, 0.3, 0.6);
  stick.rotation.x = -0.3;
  g.add(stick);
  // 犁辕 (弯曲)
  const arch = box(0.08, 0.08, 0.8, 'wood', 0, 0.5, -0.4);
  arch.rotation.x = 0.4;
  g.add(arch);
  // 犁铲
  const blade = box(0.08, 0.06, 0.3, 'iron', 0, 0.10, 0.4);
  g.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), mats.iron);
  tip.rotation.x = -Math.PI / 2;
  tip.position.set(0, 0.10, 0.55);
  g.add(tip);
  return g;
}

/* ============================================================
 *  Scene Layout — 全景 (里坊 + 市集 + 农场 + 军营 + 战场 + 商队 + 大雁塔 + 曲江)
 * ============================================================ */
const village = new THREE.Group();
village.name = 'LegacyVillage';
scene.add(village);
if (typeof window !== 'undefined') window.village = village;

const interactives = [];  // for raycasting
const animatables = [];

// ---- 夯土坊墙 (perimeter walls) ----
function buildWalls() {
  const g = new THREE.Group();
  const w = 22, d = 16, h = 1.6, t = 0.5;
  // 4 walls with gates
  // North (back)
  g.add(box(w, h, t, 'earth', 0, 0, -d / 2));
  // South (front) - leave gap for gate at center
  g.add(box(w / 2 - 1.5, h, t, 'earth', -w / 4 - 0.75, 0, d / 2));
  g.add(box(w / 2 - 1.5, h, t, 'earth', w / 4 + 0.75, 0, d / 2));
  // East
  g.add(box(t, h, d, 'earth', w / 2, 0, 0));
  // West - leave gap
  g.add(box(t, h, d / 2 - 1, 'earth', -w / 2, 0, d / 4 + 0.5));
  g.add(box(t, h, d / 2 - 1, 'earth', -w / 2, 0, -d / 4 - 0.5));
  // 墙顶 tile coping (thin dark line)
  g.add(box(w + 0.1, 0.12, t + 0.1, 'tileDark', 0, h - 0.06, -d / 2));
  // ground inside (clay yellow path color)
  const inside = new THREE.Mesh(new THREE.BoxGeometry(w - t, 0.05, d - t), mats.ground);
  inside.position.y = 0.02; inside.receiveShadow = true;
  g.add(inside);
  // central cross paths
  g.add(box(w - t, 0.06, 1.6, 'stone', 0, 0.04, 0));
  g.add(box(1.6, 0.06, d - t, 'stone', 0, 0.04, 0));
  return g;
}
village.add(buildWalls());

// ---- 阙楼 (south gate towers) ----
const queL = makeQueTower(1.0); queL.position.set(-2, 0, 8);
const queR = makeQueTower(1.0); queR.position.set(2, 0, 8); queR.rotation.y = Math.PI;
village.add(queL); village.add(queR);

// ---- 市楼 (center watchtower) ----
const tower = makeMarketTower();
tower.position.set(0, 0, 0);
village.add(tower);

// ---- 民居院落 ----
const houses = [
  { x: -7, z: -5, w: 4, d: 3, rot: 0 },
  { x: -7, z: 1.5, w: 4, d: 3, rot: 0 },
  { x: 7, z: -5, w: 4, d: 3, rot: Math.PI },
  { x: 7, z: 1.5, w: 4, d: 3, rot: Math.PI },
  { x: -7, z: 4.5, w: 3, d: 2.4, rot: 0 },
  { x: 7, z: 4.5, w: 3, d: 2.4, rot: Math.PI },
];
houses.forEach(h => {
  const house = makeHouse(h.w, h.d, 'earth');
  house.position.set(h.x, 0, h.z);
  house.rotation.y = h.rot;
  village.add(house);
});

// ---- 酒肆 ----
const tavern = makeTavern();
tavern.position.set(-5, 0, -3.2);
village.add(tavern);

// ---- 铁匠铺 ----
const smithy = makeBlacksmith();
smithy.position.set(5.5, 0, -3.2);
village.add(smithy);
const smokeGrp = smithy.children.find(c => c.userData.isSmoke);
animatables.push({ type: 'smoke', obj: smokeGrp });

// ---- 水井 ----
const well = makeWell();
well.position.set(-3.5, 0, 4.5);
village.add(well);

// ---- 树木 ----
const trees = [
  [-9, 6.2], [9, 6.2], [-9, -7], [9, -7], [-3.5, 6.5], [3.5, 6.5],
  [-9.5, -1], [9.5, -1], [-9.5, 3], [9.5, 3]
];
trees.forEach(([x, z], i) => {
  const t = i % 3 === 0 ? makePine() : makeWillow(0.9 + Math.random() * 0.2);
  t.position.set(x, 0, z);
  t.rotation.y = Math.random() * Math.PI * 2;
  village.add(t);
});

// ---- 人物 (villagers) ----
const peopleData = [
  { x: -1, z: 3, robe: 'white', cap: 'black', walk: true },
  { x: 1.5, z: 4.5, robe: 'white', cap: 'black', walk: true },
  { x: -3, z: -1.5, robe: 'vermillion', cap: 'black' },
  { x: 4, z: -1.5, robe: 'white', cap: 'black' },
  { x: -5.5, z: -1, robe: 'white', cap: 'wood' },
  { x: 5.5, z: -1, robe: 'white', cap: 'wood', walk: true },
  { x: 0, z: -5, robe: 'flag', cap: 'black' },
  { x: -2.5, z: 6, robe: 'white', cap: 'black' },
];
peopleData.forEach(p => {
  const person = makePerson(p.robe, p.cap);
  person.position.set(p.x, 0.2, p.z);
  person.userData.walk = p.walk;
  person.userData.basePos = new THREE.Vector3(p.x, 0.2, p.z);
  village.add(person);
  animatables.push({ type: 'person', obj: person });
});

// ---- 牛车 ----
const cart = makeOxCart();
cart.position.set(-4, 0, 5.5);
cart.rotation.y = Math.PI / 4;
village.add(cart);

/* ----------------------------------------------------------------
 *  ZONE B — 南门外市集 (Market street, south of gate)
 * ---------------------------------------------------------------- */
const marketZone = new THREE.Group();
scene.add(marketZone);

// 市集大门牌坊
const archGate = new THREE.Group();
archGate.add(box(0.3, 4, 0.3, 'wood', -2.5, 0, 0));
archGate.add(box(0.3, 4, 0.3, 'wood', 2.5, 0, 0));
archGate.add(box(5.5, 0.5, 0.4, 'wood', 0, 4, 0));
archGate.add(box(5.0, 0.3, 0.5, 'flag', 0, 4.4, 0));
archGate.position.set(0, 0, 12);
marketZone.add(archGate);

// 摊位阵 (两侧排列)
const stallColors = ['silkPink', 'silkBlue', 'silkGold', 'silkGreen', 'silkPurple', 'flag'];
const stallGoods = ['wood', 'earthDark', 'rice', 'silkGold', 'tile', 'woodLight'];
const stalls = [];
for (let i = 0; i < 8; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const row = Math.floor(i / 2);
  const stall = makeMarketStall(stallColors[i % stallColors.length], stallGoods[i % stallGoods.length]);
  stall.position.set(side * 4.5, 0, 14 + row * 3);
  stall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  marketZone.add(stall);
  stalls.push(stall);
}

// 食肆推车 + 桃树 在街中
const foodCart = makeFoodCart();
foodCart.position.set(2, 0, 16); foodCart.rotation.y = -Math.PI / 4;
marketZone.add(foodCart);

const peach1 = makePeachTree(); peach1.position.set(-7.5, 0, 14); marketZone.add(peach1);
const peach2 = makePeachTree(); peach2.position.set(7.5, 0, 18); marketZone.add(peach2);
const peach3 = makePeachTree(); peach3.position.set(-7, 0, 20); marketZone.add(peach3);

// 市集人群 (车水马龙)
const marketWalkPaths = [
  [new THREE.Vector3(-1.5, 0.2, 11), new THREE.Vector3(-1.5, 0.2, 22), new THREE.Vector3(1.5, 0.2, 22), new THREE.Vector3(1.5, 0.2, 11)],
  [new THREE.Vector3(1.5, 0.2, 11), new THREE.Vector3(1.5, 0.2, 22), new THREE.Vector3(-1.5, 0.2, 22), new THREE.Vector3(-1.5, 0.2, 11)],
];
const walkers = [];

const marketPeople = [
  { make: makeMerchant, x: -3, z: 14 },
  { make: makeMerchant, x: 3, z: 17 },
  { make: makeLady, x: -3.2, z: 18 },
  { make: makeLady, x: 3.2, z: 20 },
  { make: makeChild, x: -2, z: 19 },
  { make: makeChild, x: 0.5, z: 17.5 },
  { make: makeVendor, x: -4.5, z: 14 },
  { make: makeVendor, x: 4.5, z: 14 },
  { make: makeVendor, x: -4.5, z: 17 },
  { make: makeVendor, x: 4.5, z: 17 },
  { make: makeVendor, x: -4.5, z: 20 },
  { make: makeVendor, x: 4.5, z: 20 },
  { make: makeScholar, x: -1, z: 13 },
  { make: makeScholar, x: 0, z: 21 },
];
marketPeople.forEach(p => {
  const m = p.make();
  m.position.set(p.x, 0.2, p.z);
  m.userData.basePos = new THREE.Vector3(p.x, 0.2, p.z);
  marketZone.add(m);
  animatables.push({ type: 'person', obj: m });
});

// 加 2 个走动的小孩 (path walker)
for (let i = 0; i < 2; i++) {
  const k = makeChild();
  const path = marketWalkPaths[i];
  k.position.copy(path[0]);
  walkers.push({ obj: k, path, t: 0, idx: 0, speed: 1.4 });
  marketZone.add(k);
}

// 鸡群 (在市集边)
for (let i = 0; i < 5; i++) {
  const c = makeChicken();
  c.position.set(-6 + Math.random() * 12, 0.05, 13 + Math.random() * 8);
  c.rotation.y = Math.random() * Math.PI * 2;
  c.userData.basePos = c.position.clone();
  c.userData.idle = Math.random() * Math.PI * 2;
  marketZone.add(c);
  animatables.push({ type: 'chicken', obj: c });
}

// 一只狗
const dog = makeDog(); dog.position.set(-1, 0, 19); marketZone.add(dog);
animatables.push({ type: 'dog', obj: dog });

/* ----------------------------------------------------------------
 *  ZONE C — 东侧农场 (Farm zone, east of village)
 * ---------------------------------------------------------------- */
const farmZone = new THREE.Group();
scene.add(farmZone);

// 4 块稻田（南北纵向排）
const paddyPositions = [
  { x: 24, z: -8, w: 7, d: 4 },
  { x: 24, z: -2, w: 7, d: 4 },
  { x: 24, z: 4, w: 7, d: 4 },
  { x: 24, z: 10, w: 7, d: 4 },
];
paddyPositions.forEach(p => {
  const paddy = makeRicePaddy(p.w, p.d, 40);
  paddy.position.set(p.x, 0, p.z);
  farmZone.add(paddy);
});

// 龙骨水车 (放在溪流边)
const wheel = makeWaterWheel();
wheel.position.set(20, 0, 0);
wheel.rotation.y = Math.PI / 2;
farmZone.add(wheel);
const waterWheelObj = wheel.children.find(c => c.userData.isWaterWheel);
animatables.push({ type: 'waterwheel', obj: waterWheelObj });

// 农夫工作中
const farmers = [
  { x: 24, z: -8 }, { x: 22, z: -2 }, { x: 26, z: 4 }, { x: 23, z: 10 },
  { x: 21, z: 6 }, { x: 27, z: -5 },
];
farmers.forEach(p => {
  const f = makeFarmer();
  f.position.set(p.x, 0.2, p.z);
  f.userData.basePos = new THREE.Vector3(p.x, 0.2, p.z);
  f.rotation.y = Math.random() * Math.PI * 2;
  // 让农夫前倾 (劳作姿态)
  f.rotation.x = 0.2;
  farmZone.add(f);
  animatables.push({ type: 'person', obj: f });
});

// 耕牛
const ox1 = new THREE.Group();
ox1.add(box(1.2, 0.5, 0.5, 'wood', 0, 0.3, 0));
ox1.add(box(0.4, 0.4, 0.4, 'wood', 0.8, 0.45, 0));
ox1.add(box(0.05, 0.2, 0.05, 'black', 0.9, 0.75, 0.15));
ox1.add(box(0.05, 0.2, 0.05, 'black', 0.9, 0.75, -0.15));
ox1.position.set(28, 0, 7);
ox1.rotation.y = -Math.PI / 6;
farmZone.add(ox1);

// 竹林
const bamboo1 = makeBambooGrove(6);
bamboo1.position.set(30, 0, -10);
farmZone.add(bamboo1);
const bamboo2 = makeBambooGrove(5);
bamboo2.position.set(30, 0, 13);
farmZone.add(bamboo2);

// 农舍 (小屋)
const farmHouse = makeHouse(3.2, 2.4, 'earth');
farmHouse.position.set(15, 0, -10);
farmZone.add(farmHouse);
// 桃树 在农舍旁
const peach4 = makePeachTree(); peach4.position.set(13, 0, -11); farmZone.add(peach4);
const peach5 = makePeachTree(); peach5.position.set(17, 0, -12); farmZone.add(peach5);

// 鸡和狗
for (let i = 0; i < 4; i++) {
  const c = makeChicken();
  c.position.set(14 + Math.random() * 4, 0.05, -8 + Math.random() * 4);
  c.rotation.y = Math.random() * Math.PI * 2;
  c.userData.basePos = c.position.clone();
  c.userData.idle = Math.random() * Math.PI * 2;
  farmZone.add(c);
  animatables.push({ type: 'chicken', obj: c });
}
const farmDog = makeDog(); farmDog.position.set(15, 0, -12); farmZone.add(farmDog);

/* ----------------------------------------------------------------
 *  ZONE D — 北侧军营 (Han army camp, north of wall)
 * ---------------------------------------------------------------- */
const campZone = new THREE.Group();
scene.add(campZone);

// 中央旗杆
const flagpole = makeFlagpole('blood');
flagpole.position.set(0, 0, -16);
campZone.add(flagpole);
const flagObj = flagpole.children.find(c => c.userData.isFlag);
animatables.push({ type: 'flag', obj: flagObj });

// 望楼
const watch = makeWatchtower();
watch.position.set(-8, 0, -20);
campZone.add(watch);
const beaconObj = watch.children.find(c => c.userData.isBeacon);
if (beaconObj) animatables.push({ type: 'beacon', obj: beaconObj });

// 烽火台
const beaconPlat = makeBeaconPlatform();
beaconPlat.position.set(8, 0, -20);
campZone.add(beaconPlat);
const beacon2 = beaconPlat.children.find(c => c.userData.isBeacon);
if (beacon2) animatables.push({ type: 'beacon', obj: beacon2 });

// 帐篷阵 (8 顶分列)
const tentPositions = [
  { x: -10, z: -14 }, { x: -7, z: -14 }, { x: -4, z: -14 }, { x: 4, z: -14 }, { x: 7, z: -14 }, { x: 10, z: -14 },
  { x: -6, z: -25 }, { x: 6, z: -25 },
];
tentPositions.forEach((p, i) => {
  const tent = makeArmyTent(i % 3 === 0 ? 'canvasDark' : 'canvas');
  tent.position.set(p.x, 0, p.z);
  campZone.add(tent);
});

// 兵器架
const rack1 = makeWeaponRack(); rack1.position.set(-2.5, 0, -17); campZone.add(rack1);
const rack2 = makeWeaponRack(); rack2.position.set(2.5, 0, -17); rack2.rotation.y = Math.PI; campZone.add(rack2);

// 拴马桩 + 4 匹马
for (let i = 0; i < 4; i++) {
  const post = box(0.1, 0.8, 0.1, 'wood', -12, 0, -10 + i * 2);
  campZone.add(post);
  const h = makeHorse(i % 2 === 0 ? 'horseBay' : 'horseBlack');
  h.position.set(-13.5, 0, -10 + i * 2);
  h.rotation.y = Math.PI / 2;
  campZone.add(h);
}

// 士兵 (站岗 + 操练 + 巡逻)
const sentries = [
  { x: -2, z: -10.5 },  // 北门外站岗
  { x: 2, z: -10.5 },
  { x: -8, z: -16 },
  { x: 8, z: -16 },
  { x: -4, z: -22 },
  { x: 4, z: -22 },
];
sentries.forEach(p => {
  const s = makeSoldier(Math.random() < 0.5 ? 'vermillion' : 'silkBlue');
  s.position.set(p.x, 0.2, p.z);
  s.userData.basePos = new THREE.Vector3(p.x, 0.2, p.z);
  campZone.add(s);
  animatables.push({ type: 'person', obj: s });
});

// 操练士兵 (站成两排)
for (let i = 0; i < 6; i++) {
  const s = makeSoldier('silkBlue');
  s.position.set(-5 + i * 2, 0.2, -19);
  s.rotation.y = Math.PI;
  s.userData.basePos = s.position.clone();
  campZone.add(s);
  animatables.push({ type: 'person', obj: s });
}

// 巡逻队 (4 人沿城北外墙走动)
const patrolPath = [
  new THREE.Vector3(-12, 0.2, -9),
  new THREE.Vector3(12, 0.2, -9),
  new THREE.Vector3(12, 0.2, -12),
  new THREE.Vector3(-12, 0.2, -12),
];
for (let i = 0; i < 4; i++) {
  const s = makeSoldier('vermillion');
  s.position.copy(patrolPath[0]);
  s.position.x += i * 1.5;
  campZone.add(s);
  walkers.push({ obj: s, path: patrolPath, t: i * 0.5, idx: 0, speed: 1.0 });
}

// 一面 汉军帅 大旗
const cmdFlag = makeFlagpole('silkGold');
cmdFlag.position.set(0, 0, -23);
campZone.add(cmdFlag);
animatables.push({ type: 'flag', obj: cmdFlag.children.find(c => c.userData.isFlag) });

/* ----------------------------------------------------------------
 *  ZONE D2 — 北部战场 (Battlefield, north of camp)
 * ---------------------------------------------------------------- */
const battleZone = new THREE.Group();
scene.add(battleZone);

// 帅帐 (居中后侧)
const generalsTent = makeGeneralsTent();
generalsTent.position.set(0, 0, -26);
battleZone.add(generalsTent);

// 战鼓 (帅帐两侧)
const drum1 = makeWarDrum();
drum1.position.set(-3.5, 0, -26);
battleZone.add(drum1);
animatables.push({ type: 'drum', obj: drum1.children.find(c => c.userData.isDrum) });

const drum2 = makeWarDrum();
drum2.position.set(3.5, 0, -26);
battleZone.add(drum2);
animatables.push({ type: 'drum', obj: drum2.children.find(c => c.userData.isDrum) });

// 帅帐前两面大旗
const heroFlag1 = makeBattleBanner('blood', true);
heroFlag1.position.set(-2.5, 0, -28);
battleZone.add(heroFlag1);
animatables.push({ type: 'flag', obj: heroFlag1.children.find(c => c.userData.isFlag) });

const heroFlag2 = makeBattleBanner('silkGold', true);
heroFlag2.position.set(2.5, 0, -28);
battleZone.add(heroFlag2);
animatables.push({ type: 'flag', obj: heroFlag2.children.find(c => c.userData.isFlag) });

// 弩车阵 (帅帐前)
const crossbow1 = makeCrossbowCart();
crossbow1.position.set(-7, 0, -28);
crossbow1.rotation.y = Math.PI;
battleZone.add(crossbow1);

const crossbow2 = makeCrossbowCart();
crossbow2.position.set(7, 0, -28);
crossbow2.rotation.y = Math.PI;
battleZone.add(crossbow2);

const crossbow3 = makeCrossbowCart();
crossbow3.position.set(0, 0, -30);
crossbow3.rotation.y = Math.PI;
battleZone.add(crossbow3);

// 弩车操手 (每车 2 人)
[[-7, -29], [-6, -29], [7, -29], [6, -29], [0, -31], [-1, -31]].forEach(([x, z]) => {
  const s = makeSoldier('silkBlue');
  s.position.set(x, 0.2, z);
  s.rotation.y = Math.PI;
  battleZone.add(s);
});

// 汉军步兵方阵 (4 × 4 = 16 人，列于弩车前方)
const phalanx = new THREE.Group();
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    const s = makeSoldier(row < 2 ? 'vermillion' : 'silkBlue');
    s.position.set(-3 + col * 2, 0.2, -32 - row * 1.6);
    s.rotation.y = Math.PI;  // 面向北 (向匈奴)
    s.userData.basePos = s.position.clone();
    s.userData.idle = Math.random() * Math.PI;
    phalanx.add(s);
    animatables.push({ type: 'person', obj: s });
  }
}
battleZone.add(phalanx);

// 方阵掌旗官 (两侧)
const phFlagL = makeBattleBanner('blood', false);
phFlagL.position.set(-5.5, 0, -33);
battleZone.add(phFlagL);
animatables.push({ type: 'flag', obj: phFlagL.children.find(c => c.userData.isFlag) });
const phFlagR = makeBattleBanner('vermillion', false);
phFlagR.position.set(5.5, 0, -33);
battleZone.add(phFlagR);
animatables.push({ type: 'flag', obj: phFlagR.children.find(c => c.userData.isFlag) });

// 汉军骑兵冲锋 (4 骑沿东西轴向北方推进，循环往复)
const chargePath = [
  new THREE.Vector3(-10, 0, -32),
  new THREE.Vector3(-10, 0, -37),
  new THREE.Vector3(10, 0, -37),
  new THREE.Vector3(10, 0, -32),
];
for (let i = 0; i < 4; i++) {
  const r = makeRider({ robe: 'vermillion', horse: i % 2 === 0 ? 'horseBay' : 'horseBlack' });
  battleZone.add(r);
  walkers.push({ obj: r, path: chargePath, t: i * 0.6, idx: 0, speed: 3.5, isCavalry: true });
  // 跟一团扬尘
  const dust = makeDustCloud();
  battleZone.add(dust);
  walkers.push({ obj: dust, path: chargePath, t: i * 0.6, idx: 0, speed: 3.5, isDust: true });
}

// 匈奴营帐 (远北端)
const yurts = [
  { x: -7, z: -38 }, { x: 0, z: -39 }, { x: 7, z: -38 },
];
yurts.forEach(p => {
  const y = makeYurt();
  y.position.set(p.x, 0, p.z);
  battleZone.add(y);
});

// 匈奴营出烟
yurts.forEach(p => {
  const sm = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const s = box(0.4 + i * 0.1, 0.3, 0.4 + i * 0.1, 'smoke', 0, 2 + i * 0.5, 0);
    s.material = mats.smoke.clone();
    s.material.opacity = 0.45 - i * 0.1;
    sm.add(s);
  }
  sm.position.set(p.x, 0, p.z);
  sm.userData.isSmoke = true;
  battleZone.add(sm);
  animatables.push({ type: 'smoke', obj: sm });
});

// 匈奴大旗 (中央)
const xnFlag = makeBattleBanner('horseBay', true);
xnFlag.position.set(0, 0, -42);
xnFlag.rotation.y = Math.PI;
battleZone.add(xnFlag);
animatables.push({ type: 'flag', obj: xnFlag.children.find(c => c.userData.isFlag) });

// 匈奴骑兵反击 (3 骑沿不同方向掠袭，路径在战线北侧)
const xnChargePath = [
  new THREE.Vector3(-12, 0, -36),
  new THREE.Vector3(-12, 0, -40),
  new THREE.Vector3(12, 0, -40),
  new THREE.Vector3(12, 0, -36),
];
for (let i = 0; i < 3; i++) {
  const r = makeXiongnuRider();
  battleZone.add(r);
  walkers.push({ obj: r, path: xnChargePath, t: i * 0.8, idx: 0, speed: 3.0, isCavalry: true });
  const dust = makeDustCloud();
  battleZone.add(dust);
  walkers.push({ obj: dust, path: xnChargePath, t: i * 0.8, idx: 0, speed: 3.0, isDust: true });
}

// 匈奴步兵 (营前固定 5 人)
const xnInfantry = [
  { x: -5, z: -40 }, { x: -3, z: -40.5 }, { x: 0, z: -41 }, { x: 3, z: -40.5 }, { x: 5, z: -40 },
];
xnInfantry.forEach(p => {
  const x = makeXiongnu();
  x.position.set(p.x, 0.2, p.z);
  x.rotation.y = 0;  // 面向南
  x.userData.basePos = x.position.clone();
  x.userData.idle = Math.random() * Math.PI;
  battleZone.add(x);
  animatables.push({ type: 'person', obj: x });
});

// 阵亡兵 (双方混杂在战线中间)
const fallenPositions = [
  { x: -8, z: -34, side: 'han', rot: 0.4 },
  { x: -2, z: -36, side: 'han', rot: -0.7 },
  { x: 4, z: -36, side: 'xn', rot: 1.2 },
  { x: 8, z: -34, side: 'xn', rot: -0.3 },
  { x: 0, z: -37, side: 'xn', rot: 2.0 },
];
fallenPositions.forEach(p => {
  const f = makeFallenSoldier(p.side);
  f.position.set(p.x, 0, p.z);
  f.rotation.y = p.rot;
  battleZone.add(f);
});

// 战场尘烟（弥漫感）
for (let i = 0; i < 6; i++) {
  const sm = new THREE.Group();
  for (let j = 0; j < 3; j++) {
    const s = box(0.8 + Math.random() * 0.4, 0.3, 0.8 + Math.random() * 0.4, 'smoke');
    s.material = mats.smoke.clone();
    s.material.color.setHex(0xb8a070);
    s.material.opacity = 0.25 - j * 0.05;
    s.position.set(0, 0.4 + j * 0.4, 0);
    sm.add(s);
  }
  sm.position.set(-10 + Math.random() * 20, 0, -34 + Math.random() * 6);
  sm.userData.isSmoke = true;
  battleZone.add(sm);
  animatables.push({ type: 'smoke', obj: sm });
}

/* ----------------------------------------------------------------
 *  ZONE E — 西侧驼商队 (Caravan, west of village)
 * ---------------------------------------------------------------- */
const caravanZone = new THREE.Group();
scene.add(caravanZone);

// 5 头骆驼成一列
const camelPath = [
  new THREE.Vector3(-32, 0, 8),
  new THREE.Vector3(-12, 0, 8),
  new THREE.Vector3(-12, 0, 4),
  new THREE.Vector3(-32, 0, 4),
];
for (let i = 0; i < 5; i++) {
  const c = makeCamel(i % 2 === 0);
  const startX = -28 + i * 2.5;
  c.position.set(startX, 0, 6);
  caravanZone.add(c);
  walkers.push({ obj: c, path: camelPath, t: i * 0.4, idx: 0, speed: 0.6, isCamel: true });
}

// 商队领队 (胡商)
const lead = makeForeigner();
lead.position.set(-30, 0.2, 6);
caravanZone.add(lead);
walkers.push({ obj: lead, path: camelPath, t: -0.3, idx: 0, speed: 0.6 });

// 商队护卫 (汉兵 2 人)
for (let i = 0; i < 2; i++) {
  const s = makeSoldier('vermillion');
  s.position.set(-22 + i * 4, 0.2, 9);
  caravanZone.add(s);
  walkers.push({ obj: s, path: camelPath, t: 0.2 + i * 0.3, idx: 0, speed: 0.6 });
}

// 路边货摊 (西门外集贸)
const westStall = makeMarketStall('silkPurple', 'silkGold');
westStall.position.set(-15, 0, 11);
caravanZone.add(westStall);
const westStall2 = makeMarketStall('silkBlue', 'earthDark');
westStall2.position.set(-15, 0, 0);
caravanZone.add(westStall2);

// 路边松林
const pineRow = [-26, -22, -20, -18, -16].map(x => {
  const p = makePine();
  p.position.set(x, 0, -2 - Math.random() * 2);
  return p;
});
pineRow.forEach(p => caravanZone.add(p));

// 西门外路过几个胡商旅人
for (let i = 0; i < 3; i++) {
  const f = makeForeigner();
  f.position.set(-20 - i * 2, 0.2, 1 + i * 0.5);
  f.userData.basePos = f.position.clone();
  caravanZone.add(f);
  animatables.push({ type: 'person', obj: f });
}

/* ----------------------------------------------------------------
 *  ZONE F — 村内补充人气 (Village densification)
 * ---------------------------------------------------------------- */
// 在村内市楼周围加更多活动人物
const villageExtras = [
  { make: makeScholar, x: -2, z: -5 },
  { make: makeScholar, x: 2, z: -5 },
  { make: makeLady, x: -3.5, z: 2 },
  { make: makeLady, x: 3.5, z: 2 },
  { make: makeChild, x: -1, z: 6 },
  { make: makeChild, x: 1, z: 6, walk: true },
  { make: makeMerchant, x: -5, z: 3.5 },
  { make: makeMerchant, x: 5, z: 3.5 },
  { make: makeVendor, x: 4, z: 5 },
  { make: makeVendor, x: -4, z: 5 },
];
villageExtras.forEach(p => {
  const m = p.make();
  m.position.set(p.x, 0.2, p.z);
  m.userData.basePos = new THREE.Vector3(p.x, 0.2, p.z);
  m.userData.walk = p.walk;
  village.add(m);
  animatables.push({ type: 'person', obj: m });
});

// 沿主路骑马的官吏 (从北到南穿过整个场景)
const horseRiderPath = [
  new THREE.Vector3(0, 0, -28),
  new THREE.Vector3(0, 0, 28),
];
const officialHorse = makeHorse('horseWhite');
officialHorse.position.set(0, 0, -25);
scene.add(officialHorse);
walkers.push({ obj: officialHorse, path: horseRiderPath, t: 0, idx: 0, speed: 2.5, loop: true });

// 鸟群 (8 只小鸟绕场景上空盘旋)
const birdsGroup = new THREE.Group();
const birdMat = new THREE.MeshBasicMaterial({ color: 0x202020 });
for (let i = 0; i < 8; i++) {
  const bird = new THREE.Group();
  // 简化 V 形鸟
  const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), birdMat);
  wing1.rotation.z = -0.3; bird.add(wing1);
  const wing2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.1), birdMat);
  wing2.rotation.z = 0.3; wing2.position.x = 0.5; bird.add(wing2);
  bird.position.set(
    (Math.random() - 0.5) * 40,
    16 + Math.random() * 4,
    (Math.random() - 0.5) * 30
  );
  bird.userData.angle = Math.random() * Math.PI * 2;
  bird.userData.radius = 18 + Math.random() * 8;
  bird.userData.height = 16 + Math.random() * 5;
  bird.userData.speed = 0.15 + Math.random() * 0.15;
  birdsGroup.add(bird);
}
scene.add(birdsGroup);
animatables.push({ type: 'birds', obj: birdsGroup });

// 落英 (Falling peach petals over market)
const petalGroup = new THREE.Group();
for (let i = 0; i < 40; i++) {
  const petal = box(0.12, 0.02, 0.08, 'petals');
  petal.material = mats.petals.clone();
  petal.position.set(
    (Math.random() - 0.5) * 18,
    Math.random() * 12,
    13 + Math.random() * 10
  );
  petal.userData.fallSpeed = 0.4 + Math.random() * 0.4;
  petal.userData.swayPhase = Math.random() * Math.PI * 2;
  petal.userData.swayAmp = 0.3 + Math.random() * 0.4;
  petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  petalGroup.add(petal);
}
scene.add(petalGroup);
animatables.push({ type: 'petals', obj: petalGroup });

/* ============================================================
 *  ZONE-E: 大雁塔 / 慈恩寺 (东南区)
 * ============================================================ */
const pagodaZone = new THREE.Group();
scene.add(pagodaZone);

// 大雁塔本体
const pagoda = makeWildGoosePagoda();
pagoda.position.set(36, 0, 32);
pagodaZone.add(pagoda);

// 塔基阶梯
pagodaZone.add(box(3.5, 0.15, 1.0, 'stone', 36, 0.32, 36.0));
pagodaZone.add(box(2.5, 0.12, 0.6, 'stone', 36, 0.48, 36.6));

// 寺前石狮 (左右两座)
const lion1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mats.stone);
lion1.position.set(33, 0.7, 37); lion1.scale.set(1.2, 0.9, 1.6);
lion1.castShadow = true;
pagodaZone.add(lion1);
pagodaZone.add(box(0.5, 0.3, 0.8, 'stone', 33, 0.3, 37));  // 狮基台
const lion2 = lion1.clone();
lion2.position.set(39, 0.7, 37);
pagodaZone.add(lion2);
pagodaZone.add(box(0.5, 0.3, 0.8, 'stone', 39, 0.3, 37));

// 寺前香炉
const incense = new THREE.Group();
incense.add(box(1.2, 0.4, 1.2, 'stone', 0, 0.2, 0));
incense.add(cyl(0.5, 0.6, 'wood', 8));
incense.children[1].position.y = 0.7;
incense.add(cyl(0.55, 0.15, 'gold', 8));
incense.children[2].position.y = 1.05;
// 三支香 (烟柱)
for (let i = 0; i < 3; i++) {
  incense.add(box(0.03, 0.4, 0.03, 'wood', -0.08 + i * 0.08, 1.3, 0));
  const sm = box(0.18 + i * 0.04, 0.3, 0.18 + i * 0.04, 'smoke', -0.08 + i * 0.08, 1.7 + i * 0.3, 0);
  sm.material = mats.smoke.clone();
  sm.material.opacity = 0.3 - i * 0.05;
  incense.add(sm);
}
incense.position.set(36, 0, 39);
incense.userData.isSmoke = true;
pagodaZone.add(incense);
animatables.push({ type: 'smoke', obj: incense });

// 寺前广场上的香客 / 僧侣
const pilgrims = [
  { x: 33.5, z: 38.5, role: 'civilian', robe: 'silkBlue' },
  { x: 34.5, z: 39, role: 'civilian', robe: 'white' },
  { x: 37.5, z: 38.8, role: 'lady', robe: 'silkPink' },
  { x: 38.5, z: 39.2, role: 'lady', robe: 'silkGold' },
  { x: 36, z: 40, role: 'civilian', robe: 'silkPurple' },  // 僧
  { x: 32, z: 39.5, role: 'civilian', robe: 'silkGreen' },
  { x: 40, z: 39.5, role: 'civilian', robe: 'silkBlue' },
  { x: 35, z: 41, role: 'child', robe: 'silkPink' },
];
pilgrims.forEach(p => {
  const opts = { role: p.role, robe: p.robe };
  if (p.role === 'civilian' && p.robe === 'silkPurple') {
    // 僧侣 (no cap, 光头)
    opts.cap = 'none';
  }
  const person = buildPerson(opts);
  person.position.set(p.x, 0.2, p.z);
  person.rotation.y = Math.PI + Math.random() * 0.5;  // 朝向塔
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  pagodaZone.add(person);
  animatables.push({ type: 'person', obj: person });
});

// 几座 慈恩寺 附属小殿 (塔的两翼)
const wing1 = box(4, 2, 3, 'stone', 28, 0, 32);
pagodaZone.add(wing1);
const wing1Roof = makeTangRoof(4, 3, 0.4, 'roof');
wing1Roof.position.set(28, 2.0, 32);
pagodaZone.add(wing1Roof);

const wing2 = box(4, 2, 3, 'stone', 44, 0, 32);
pagodaZone.add(wing2);
const wing2Roof = makeTangRoof(4, 3, 0.4, 'roof');
wing2Roof.position.set(44, 2.0, 32);
pagodaZone.add(wing2Roof);

// 塔周柏树
for (const [x, z] of [[30, 28], [42, 28], [30, 36], [42, 36], [28, 38], [44, 38]]) {
  const trunk = box(0.2, 1.6, 0.2, 'wood', x, 0, z);
  pagodaZone.add(trunk);
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 6), mats.willowDark);
  foliage.position.set(x, 2.4, z); foliage.castShadow = true;
  pagodaZone.add(foliage);
}

/* ============================================================
 *  ZONE-F: 曲江池 / 画舫游园 (西南区)
 * ============================================================ */
const qujiangZone = new THREE.Group();
scene.add(qujiangZone);

// 水中央亭
const qjPavilion = makeQujiangPavilion();
qjPavilion.position.set(-32, 0, 26);
qujiangZone.add(qjPavilion);

// 画舫 (2 艘漂在水面)
const boat1 = makePleasureBoat();
boat1.position.set(-37, 0.1, 22);
boat1.rotation.y = 0.3;
qujiangZone.add(boat1);
animatables.push({ type: 'boat', obj: boat1, phase: 0 });

const boat2 = makePleasureBoat();
boat2.position.set(-27, 0.1, 30);
boat2.rotation.y = -0.5;
qujiangZone.add(boat2);
animatables.push({ type: 'boat', obj: boat2, phase: Math.PI });

// 画舫上的游人
const boatPpl1 = buildPerson({ role: 'lady', robe: 'silkPink' });
boatPpl1.position.set(-37, 0.5, 22);
qujiangZone.add(boatPpl1);
const boatPpl2 = buildPerson({ role: 'civilian', robe: 'silkBlue' });
boatPpl2.position.set(-37.6, 0.5, 22.2);
qujiangZone.add(boatPpl2);
const boatPpl3 = buildPerson({ role: 'scholar', robe: 'silkPurple' });
boatPpl3.position.set(-27, 0.5, 30);
qujiangZone.add(boatPpl3);

// 池边垂柳 (4 株)
function makeWillow2(x, z) {
  const g = new THREE.Group();
  g.add(box(0.25, 2.2, 0.25, 'wood', 0, 0, 0));
  // 柳叶冠 (大球)
  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), mats.willow);
  top.position.y = 2.6; top.castShadow = true;
  g.add(top);
  // 垂枝 (12 道随机摆放细条)
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * 0.6;
    const s = box(0.02, 1.2 + Math.random() * 0.6, 0.02, 'willow', Math.cos(a) * r, 1.6, Math.sin(a) * r);
    g.add(s);
  }
  g.position.set(x, 0, z);
  return g;
}
[[-43, 17], [-22, 17], [-43, 35], [-22, 35], [-32, 16]].forEach(([x, z]) => {
  qujiangZone.add(makeWillow2(x, z));
});

// 池边游人 (赏景)
const qjPpl = [
  { x: -40, z: 14, role: 'lady', robe: 'silkBlue' },
  { x: -38, z: 14.5, role: 'civilian', robe: 'silkGreen' },
  { x: -36, z: 14, role: 'lady', robe: 'silkGold' },
  { x: -28, z: 36, role: 'scholar', robe: 'silkBlue' },
  { x: -26, z: 36, role: 'civilian', robe: 'silkPurple' },
  { x: -32, z: 38, role: 'lady', robe: 'silkPink' },
  { x: -42, z: 38, role: 'child', robe: 'silkPink' },
  { x: -40, z: 38, role: 'lady', robe: 'silkBlue' },
];
qjPpl.forEach(p => {
  const person = buildPerson({ role: p.role, robe: p.robe });
  person.position.set(p.x, 0.2, p.z);
  person.rotation.y = Math.atan2(-32 - p.x, 26 - p.z);  // 朝向池中央
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  qujiangZone.add(person);
  animatables.push({ type: 'person', obj: person });
});

/* ============================================================
 *  ZONE-G: 朱雀门城楼 (北部主入口)
 * ============================================================ */
const zhuqueZone = new THREE.Group();
scene.add(zhuqueZone);

const zhuqueGate = makeZhuqueGate();
zhuqueGate.position.set(0, 0, -46);
zhuqueZone.add(zhuqueGate);

// 城楼上的卫兵
for (let i = -2; i <= 2; i++) {
  if (i === 0) continue;
  const s = makeSoldier('vermillion');
  s.position.set(i * 3, 4.85, -44.5);
  s.rotation.y = Math.PI;
  zhuqueZone.add(s);
}

// 城门下出入行人 (3 个进城方向)
[
  { x: -4.5, z: -44, role: 'civilian', robe: 'silkBlue', dir: 0 },
  { x: 0, z: -44, role: 'merchant', robe: 'silkGreen', dir: 0, tool: 'staff' },
  { x: 4.5, z: -44, role: 'civilian', robe: 'silkPurple', dir: 0 },
  { x: -4.5, z: -42, role: 'lady', robe: 'silkPink', dir: Math.PI },
  { x: 0, z: -42, role: 'scholar', robe: 'silkBlue', dir: Math.PI, tool: 'scroll' },
  { x: 4.5, z: -42, role: 'civilian', robe: 'silkGreen', dir: Math.PI },
].forEach(p => {
  const person = buildPerson({ role: p.role, robe: p.robe, tool: p.tool });
  person.position.set(p.x, 0.2, p.z);
  person.rotation.y = p.dir;
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  zhuqueZone.add(person);
  animatables.push({ type: 'person', obj: person });
});

// 城楼旗飘
zhuqueGate.children.forEach(c => {
  if (c.userData && c.userData.isFlag) animatables.push({ type: 'flag', obj: c });
});

/* ============================================================
 *  ZONE-DM: 大明宫含元殿 (北部最远端、朱雀门之后)
 * ============================================================ */
const daminggongZone = new THREE.Group();
scene.add(daminggongZone);

// 主殿 (含元殿)
const hanyuan = makeHanyuanHall();
hanyuan.position.set(0, 0, -60);
daminggongZone.add(hanyuan);

// 双阙：翔鸾阁 (东) + 栖凤阁 (西)
const xianglUan = makePalaceTower(false);   // 东·翔鸾
xianglUan.position.set(14, 0, -52);
daminggongZone.add(xianglUan);
xianglUan.children.forEach(c => {
  if (c.userData && c.userData.isFlag) animatables.push({ type: 'flag', obj: c });
});

const qifeng = makePalaceTower(true);       // 西·栖凤
qifeng.position.set(-14, 0, -52);
daminggongZone.add(qifeng);
qifeng.children.forEach(c => {
  if (c.userData && c.userData.isFlag) animatables.push({ type: 'flag', obj: c });
});

// 殿前御林军 (列队 4×3)
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 4; col++) {
    const guard = buildPerson({
      role: 'soldier',
      robe: 'vermillion',
      hat: 'iron',
      armor: true,
      tool: 'halberd',
      scale: 0.95,
    });
    guard.position.set(-9 + col * 6, 0.2, -52 + row * 1.6);
    guard.rotation.y = 0;  // 朝南面向门外
    daminggongZone.add(guard);
  }
}

// 殿前 8 名朝臣 (按品阶分两列)
for (let i = 0; i < 4; i++) {
  const left = buildPerson({
    role: 'scholar',
    robe: 'silkPurple',
    cap: 'black',
    tool: 'scroll',
  });
  left.position.set(-5, 4.4, -57 - i * 0.9);
  daminggongZone.add(left);
  const right = buildPerson({
    role: 'scholar',
    robe: 'silkBlue',
    cap: 'black',
    tool: 'scroll',
  });
  right.position.set(5, 4.4, -57 - i * 0.9);
  daminggongZone.add(right);
}

// 御道两侧苍松 (柏树阵)
for (let i = 0; i < 6; i++) {
  const z = -48 - i * 4;
  for (const sx of [-1, 1]) {
    const trunk = box(0.2, 1.4, 0.2, 'wood', sx * 7, 0, z);
    daminggongZone.add(trunk);
    const fol = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 6), mats.willowDark);
    fol.position.set(sx * 7, 2.4, z); fol.castShadow = true;
    daminggongZone.add(fol);
  }
}

// 殿前石狮 (御道入口两座)
for (const sx of [-1, 1]) {
  const lion = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mats.stone);
  lion.position.set(sx * 4, 0.8, -50);
  lion.scale.set(1.4, 1.0, 1.8);
  lion.castShadow = true;
  daminggongZone.add(lion);
  daminggongZone.add(box(0.7, 0.4, 1.0, 'stone', sx * 4, 0.2, -50));
}

// 宣政殿 (含元殿之北 14 单位，规模略小)
const xuanzheng = makeXuanzhengHall();
xuanzheng.position.set(0, 0, -76);
daminggongZone.add(xuanzheng);

// 紫宸殿 (再北 12 单位，更小更私密)
const zichen = makeZichenHall();
zichen.position.set(0, 0, -89);
daminggongZone.add(zichen);

// 三殿之间连廊 (左右各一道高台廊)
for (const sx of [-1, 1]) {
  // 含元 → 宣政 连廊
  daminggongZone.add(box(2, 1.4, 12, 'stone', sx * 8, 0.7, -68));
  for (let z = -73; z <= -63; z += 2) {
    daminggongZone.add(box(0.18, 2.2, 0.18, 'blood', sx * 8, 1.4, z));
  }
  daminggongZone.add(box(2.4, 0.18, 12, 'roof', sx * 8, 2.6, -68));

  // 宣政 → 紫宸 连廊
  daminggongZone.add(box(1.6, 1.0, 10, 'stone', sx * 6, 0.5, -82));
  for (let z = -87; z <= -77; z += 2) {
    daminggongZone.add(box(0.16, 1.8, 0.16, 'blood', sx * 6, 1.1, z));
  }
  daminggongZone.add(box(2.0, 0.15, 10, 'roof', sx * 6, 2.1, -82));
}

// 宣政殿前朝臣 (8 人，分品阶站立)
for (let i = 0; i < 4; i++) {
  for (const sx of [-1, 1]) {
    const role = i < 2 ? 'silkPurple' : 'silkBlue';
    const adv = buildPerson({ role: 'scholar', robe: role, cap: 'black', tool: 'scroll' });
    adv.position.set(sx * 3, 2.5, -75 - i * 0.9);
    daminggongZone.add(adv);
  }
}

// 宣政殿前 4 名带刀侍卫
for (const sx of [-1, 1]) {
  for (let i = 0; i < 2; i++) {
    const guard = buildPerson({
      role: 'soldier', robe: 'vermillion', hat: 'iron', armor: true, tool: 'sword',
      scale: 0.92,
    });
    guard.position.set(sx * 9, 0.2, -70 - i * 2);
    daminggongZone.add(guard);
  }
}

// 紫宸殿前皇帝起居场景 (近臣 4 人，规模更小)
for (let i = 0; i < 2; i++) {
  for (const sx of [-1, 1]) {
    const advisor = buildPerson({
      role: 'scholar',
      robe: i === 0 ? 'silkPurple' : 'silkGold',
      cap: 'black',
      tool: i === 0 ? 'scroll' : null,
    });
    advisor.position.set(sx * 1.8, 1.7, -88 - i * 0.8);
    daminggongZone.add(advisor);
  }
}

// 紫宸殿前琴师 (内殿氛围)
const lutist = buildPerson({ role: 'lady', robe: 'silkPink', cap: 'none' });
lutist.position.set(2.5, 1.7, -90);
daminggongZone.add(lutist);

// 三殿后花园 — 几棵松柏 + 假山
for (let i = 0; i < 5; i++) {
  const x = (Math.random() - 0.5) * 14;
  const z = -95 - Math.random() * 8;
  daminggongZone.add(box(0.2, 1.2, 0.2, 'wood', x, 0, z));
  const fol = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 6), mats.willowDark);
  fol.position.set(x, 2.1, z); fol.castShadow = true;
  daminggongZone.add(fol);
}
// 假山石
for (let i = 0; i < 4; i++) {
  const x = -8 + i * 5;
  const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + Math.random() * 0.5, 0), mats.stone);
  stone.position.set(x, 0.5, -98);
  stone.castShadow = true;
  daminggongZone.add(stone);
}

// 殿前金顶大铜鼎 (祭祀)
const cauldron = new THREE.Group();
cauldron.add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 0.9, 12), mats.gold));
cauldron.children[0].position.y = 0.45;
// 鼎耳
const earGeo = new THREE.TorusGeometry(0.15, 0.04, 6, 12);
const earL = new THREE.Mesh(earGeo, mats.gold);
earL.position.set(-0.7, 0.7, 0); earL.rotation.y = Math.PI / 2;
cauldron.add(earL);
const earR = new THREE.Mesh(earGeo, mats.gold);
earR.position.set(0.7, 0.7, 0); earR.rotation.y = Math.PI / 2;
cauldron.add(earR);
// 鼎三足
for (let i = 0; i < 3; i++) {
  const ang = (i / 3) * Math.PI * 2;
  cauldron.add(box(0.08, 0.4, 0.08, 'gold', Math.cos(ang) * 0.4, 0, Math.sin(ang) * 0.4));
}
cauldron.position.set(0, 0, -50);
daminggongZone.add(cauldron);


// 城门外的迎送马队 (3 骑)
for (let i = 0; i < 3; i++) {
  const horse = makeHorse(['horseBay', 'horseBlack', 'horseWhite'][i]);
  horse.position.set(-8 + i * 8, 0, -52);
  horse.rotation.y = Math.PI;
  zhuqueZone.add(horse);
  const rider = buildPerson({ role: 'soldier', robe: 'vermillion', hat: 'iron', armor: true, tool: 'halberd', scale: 0.85 });
  rider.position.set(-8 + i * 8, 0.9, -52);
  rider.rotation.y = Math.PI;
  zhuqueZone.add(rider);
}

/* ============================================================
 *  ZONE-H: 灞河桥 + 渭水桥 (跨河石拱桥)
 * ============================================================ */
const bridgeZone = new THREE.Group();
scene.add(bridgeZone);

// 灞河上的主桥 (东西向)
const baheBridge = makeArchBridge(8);
baheBridge.position.set(48, 0, 6);
baheBridge.rotation.y = Math.PI / 2;
bridgeZone.add(baheBridge);

// 桥上行人 (商旅络绎)
const bridgePpl = [
  { offset: -2, role: 'merchant', robe: 'silkBlue', tool: 'staff' },
  { offset: -1, role: 'civilian', robe: 'silkGreen', tool: 'basket' },
  { offset: 0.5, role: 'lady', robe: 'silkPink' },
  { offset: 2, role: 'civilian', robe: 'silkPurple', tool: 'staff' },
];
bridgePpl.forEach(p => {
  const person = buildPerson({ role: p.role, robe: p.robe, tool: p.tool });
  person.position.set(48, 0.9, 6 + p.offset);
  person.rotation.y = p.offset > 0 ? 0 : Math.PI;
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  bridgeZone.add(person);
  animatables.push({ type: 'person', obj: person });
});

// 渭水上的小桥 (南北向)
const weiBridge = makeArchBridge(6);
weiBridge.position.set(-12, 0, -45);
bridgeZone.add(weiBridge);

/* ============================================================
 *  ZONE-I: 朱雀大街熙攘行人 (主干道盛世感)
 * ============================================================ */
const streetZone = new THREE.Group();
scene.add(streetZone);

// 大街上的行人 (沿南北主路 z=-40 to z=+40 散布 22 人)
// 这些人被标记为 isStreetWalker，宵禁时段隐藏 (22:00 - 5:00)
const curfewSubjects = [];
for (let i = 0; i < 22; i++) {
  const role = ['civilian', 'merchant', 'lady', 'scholar', 'civilian', 'child', 'foreigner'][Math.floor(Math.random() * 7)];
  const robe = ['silkBlue', 'silkGreen', 'silkPurple', 'silkPink', 'silkGold', 'white'][Math.floor(Math.random() * 6)];
  const tool = Math.random() < 0.3 ? ['staff', 'basket', 'scroll'][Math.floor(Math.random() * 3)] : null;
  const person = role === 'foreigner' ? makeForeigner() :
                 role === 'lady' ? makeLady() :
                 role === 'child' ? makeChild() :
                 role === 'scholar' ? makeScholar() :
                 role === 'merchant' ? makeMerchant() :
                 buildPerson({ robe, tool, cap: 'black' });
  const sideX = (Math.random() - 0.5) * 4;
  const z = -38 + Math.random() * 75;
  person.position.set(sideX, 0.2, z);
  person.rotation.y = Math.random() * Math.PI * 2;
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  person.userData.isStreetWalker = true;
  curfewSubjects.push(person);
  streetZone.add(person);
  animatables.push({ type: 'person', obj: person });
}

// 朱雀大街两侧坊墙灯笼 (~14 盏，夜间发光)
const curfewLanterns = [];
for (let zPos = -38; zPos <= 38; zPos += 5) {
  for (const sx of [-1, 1]) {
    // 灯柱
    const pole = box(0.12, 2.2, 0.12, 'wood', sx * 3.2, 0, zPos);
    streetZone.add(pole);
    // 灯罩 (含发光材质)
    const lanternMat = mats.lantern.clone();
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lanternMat);
    lantern.position.set(sx * 3.2, 2.3, zPos);
    lantern.userData.isStreetLantern = true;
    lantern.userData.baseEmissive = 0;
    streetZone.add(lantern);
    curfewLanterns.push(lantern);
    // 灯绳
    streetZone.add(box(0.02, 0.1, 0.02, 'black', sx * 3.2, 2.5, zPos));
  }
}

// 朱雀大街上行走的官吏马队
const officialPath = [
  new THREE.Vector3(2, 0, -38),
  new THREE.Vector3(2, 0, 40),
  new THREE.Vector3(-2, 0, 40),
  new THREE.Vector3(-2, 0, -38),
];
for (let i = 0; i < 3; i++) {
  const officialHorse = makeHorse(['horseBay', 'horseWhite', 'horseBlack'][i]);
  const officialRider = buildPerson({ robe: 'silkPurple', cap: 'black', tool: 'scroll', scale: 0.85 });
  const grp = new THREE.Group();
  grp.add(officialHorse);
  officialRider.position.y = 0.9;
  grp.add(officialRider);
  streetZone.add(grp);
  walkers.push({ obj: grp, path: officialPath, t: i * 6, idx: 0, speed: 0.8, isCamel: false });
}

/* ============================================================
 *  ZONE-J: 农场升级 — 筒车 + 曲辕犁 (东部 farm 区)
 * ============================================================ */
// 灞河边的筒车 (在河水中)
const tubeWheel = makeTubeWaterWheel();
tubeWheel.position.set(46, 0, 16);
tubeWheel.rotation.y = Math.PI / 2;
scene.add(tubeWheel);
// 提取出 wheel 子对象用于动画
tubeWheel.traverse(c => {
  if (c.userData && c.userData.isWaterWheel) {
    animatables.push({ type: 'waterwheel', obj: c });
  }
});

// 农场再加一片麦田 (在原有稻田北侧)
const wheatField = new THREE.Group();
wheatField.add(box(8, 0.04, 4, 'rice', 24, 0.06, -18));
// 麦穗 (instanced)
const wheatGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
const wheatInst = new THREE.InstancedMesh(wheatGeo, mats.rice, 80);
const wheatMat = new THREE.Matrix4();
let wi = 0;
for (let x = 0; x < 8; x++) {
  for (let z = 0; z < 4; z++) {
    if (wi < 80) {
      wheatMat.makeTranslation(20 + x + Math.random() * 0.3, 0.3, -20 + z + Math.random() * 0.3);
      wheatInst.setMatrixAt(wi++, wheatMat);
    }
  }
}
if (typeof wheatInst.computeBoundingSphere === 'function') wheatInst.computeBoundingSphere();
wheatField.add(wheatInst);
scene.add(wheatField);

// 曲辕犁 + 牛 (在麦田边的小路上)
const plough = makeCurvedPlough();
plough.position.set(22, 0, -15);
plough.rotation.y = Math.PI / 2;
scene.add(plough);

// 牛
const ox = box(1.0, 0.5, 0.4, 'wood', 21, 0.25, -15);
scene.add(ox);
scene.add(box(0.3, 0.4, 0.3, 'wood', 20.5, 0.5, -15));  // 牛头
// 牛角
scene.add(box(0.4, 0.04, 0.04, 'black', 20.5, 0.85, -15));
// 牛腿
[[0.3, -0.1], [0.3, 0.1], [-0.3, -0.1], [-0.3, 0.1]].forEach(([dx, dz]) => {
  scene.add(box(0.1, 0.3, 0.1, 'wood', 21 + dx, 0.15, -15 + dz));
});

// 农夫赶牛 (持鞭)
const ploughman = makeFarmer();
ploughman.position.set(22.5, 0.2, -15);
ploughman.rotation.y = Math.PI / 2;
scene.add(ploughman);

// 弯腰插秧的农夫 (4 人，散布在稻田中)
const stoopFarmers = [
  { x: 26, z: -7, pose: 'bend' },
  { x: 28, z: -4, pose: 'squat' },
  { x: 24, z: 4, pose: 'bend' },
  { x: 26, z: 10, pose: 'kneel' },
];
stoopFarmers.forEach(p => {
  const farmer = buildPerson({ role: 'civilian', robe: 'silkGreen', hat: 'straw', tool: 'rake', pose: p.pose });
  farmer.position.set(p.x, 0.2, p.z);
  farmer.rotation.y = Math.random() * Math.PI * 2;
  scene.add(farmer);
});

/* ============================================================
 *  ZONE-K: 西市 / 胡商区 (西侧靠近驼商商队)
 * ============================================================ */
const westMarketZone = new THREE.Group();
scene.add(westMarketZone);

// 西市围墙 (4 段)
const wmCenter = new THREE.Vector3(-22, 0, -3);
const wmSize = 12;
for (let i = -1; i <= 1; i += 2) {
  westMarketZone.add(box(wmSize, 1.6, 0.3, 'earth', wmCenter.x, 0, wmCenter.z + i * wmSize / 2));
  westMarketZone.add(box(0.3, 1.6, wmSize, 'earth', wmCenter.x + i * wmSize / 2, 0, wmCenter.z));
}
// 西市门牌坊 (东西两门)
function makeMarketGate(x, z, color) {
  const grp = new THREE.Group();
  grp.add(box(0.2, 2.6, 0.2, 'wood', -1.2, 0, 0));
  grp.add(box(0.2, 2.6, 0.2, 'wood', 1.2, 0, 0));
  grp.add(box(2.8, 0.3, 0.3, 'blood', 0, 2.6, 0));
  grp.add(box(2.2, 0.4, 0.1, 'gold', 0, 2.45, 0.15));
  // 牌坊飞檐
  const r = makeTangRoof(2.8, 1.0, 0.3, color || 'roof', false);
  r.position.y = 2.9;
  grp.add(r);
  grp.position.set(x, 0, z);
  return grp;
}
westMarketZone.add(makeMarketGate(-22, -9, 'roof'));
westMarketZone.add(makeMarketGate(-22, 3, 'roof'));

// 市内商铺 (8 个棚摊呈十字形排列)
const wmStallColors = ['silkPink', 'silkBlue', 'silkGold', 'silkGreen', 'silkPurple'];
const wmStallLayout = [
  [-26, -5], [-26, -1], [-26, 1],
  [-18, -5], [-18, -1], [-18, 1],
  [-22, -6.5], [-22, 1.5],
];
wmStallLayout.forEach((p, i) => {
  const c = wmStallColors[i % 5];
  // 棚顶
  westMarketZone.add(box(2.2, 0.06, 1.8, c, p[0], 1.6, p[1]));
  // 棚柱
  westMarketZone.add(box(0.08, 1.6, 0.08, 'wood', p[0] - 0.9, 0, p[1] - 0.7));
  westMarketZone.add(box(0.08, 1.6, 0.08, 'wood', p[0] + 0.9, 0, p[1] - 0.7));
  westMarketZone.add(box(0.08, 1.6, 0.08, 'wood', p[0] - 0.9, 0, p[1] + 0.7));
  westMarketZone.add(box(0.08, 1.6, 0.08, 'wood', p[0] + 0.9, 0, p[1] + 0.7));
  // 摊位货物
  westMarketZone.add(box(1.6, 0.5, 1.2, 'wood', p[0], 0, p[1]));
  westMarketZone.add(box(0.4, 0.2, 0.4, ['gold', 'silkGold', 'jade'][i % 3], p[0] - 0.4, 0.6, p[1]));
  westMarketZone.add(box(0.4, 0.2, 0.4, ['silkPink', 'silkBlue', 'rice'][i % 3], p[0] + 0.4, 0.6, p[1]));
  // 摊主 (小贩)
  const vendor = makeMerchant();
  vendor.position.set(p[0], 0.2, p[1] - 1.0);
  vendor.rotation.y = 0;
  westMarketZone.add(vendor);
  // 顾客 (1-2 人)
  if (i % 2 === 0) {
    const buyer = buildPerson({
      role: ['civilian', 'lady', 'foreigner'][i % 3],
      robe: ['silkBlue', 'silkPink', 'silkPurple'][i % 3]
    });
    buyer.position.set(p[0] + 0.3, 0.2, p[1] + 1.3);
    buyer.rotation.y = Math.PI;
    westMarketZone.add(buyer);
  }
});

// 西市中心：胡姬胡旋舞 (4 人围圈跳舞 + 围观人群)
const danceCenter = new THREE.Vector3(-22, 0, -3);
westMarketZone.add(box(3.0, 0.04, 3.0, 'stone', danceCenter.x, 0.02, danceCenter.z));  // 舞台石板
// 4 个胡姬 围圆周
for (let i = 0; i < 4; i++) {
  const ang = (i / 4) * Math.PI * 2;
  const dancer = buildPerson({
    role: 'lady',
    robe: ['silkPink', 'silkPurple', 'silkGold', 'silkBlue'][i],
    pibo: ['silkBlue', 'silkPink', 'silkGreen', 'silkGold'][i],
    skin: 'skin',
    pose: 'dance',
  });
  dancer.position.set(
    danceCenter.x + Math.cos(ang) * 0.9,
    0.2,
    danceCenter.z + Math.sin(ang) * 0.9
  );
  dancer.rotation.y = ang + Math.PI / 2;
  dancer.userData.danceAng = ang;
  dancer.userData.danceCenter = danceCenter.clone();
  westMarketZone.add(dancer);
  animatables.push({ type: 'dancer', obj: dancer });
}
// 围观人群 (8 人外圈)
for (let i = 0; i < 10; i++) {
  const ang = (i / 10) * Math.PI * 2;
  const onlooker = buildPerson({
    role: ['civilian', 'lady', 'foreigner', 'scholar'][i % 4],
    robe: ['silkBlue', 'silkGreen', 'silkPurple', 'white'][i % 4],
  });
  onlooker.position.set(
    danceCenter.x + Math.cos(ang) * 2.4,
    0.2,
    danceCenter.z + Math.sin(ang) * 2.4
  );
  onlooker.rotation.y = ang + Math.PI / 2 + Math.PI;  // 朝向圆心
  onlooker.userData.basePos = onlooker.position.clone();
  onlooker.userData.idle = Math.random() * Math.PI;
  westMarketZone.add(onlooker);
  animatables.push({ type: 'person', obj: onlooker });
}

// 西市鼓楼 (中央)
const wmDrum = new THREE.Group();
wmDrum.add(box(1.0, 1.5, 1.0, 'wood', 0, 0, 0));
wmDrum.add(makeTangRoof(1.6, 1.6, 0.3, 'roof', false));
wmDrum.children[1].position.y = 1.8;
wmDrum.position.set(-22, 0, 4);
westMarketZone.add(wmDrum);


/* ============================================================
 *  ZONE-L: 平康坊 夜市花灯 (东南, 38, -12)
 *  唐代教坊与夜市所在地; 此处用红灯笼阵 + 鼓楼 + 歌舞酒肆,
 *  与西市的胡商集市形成 "白日商货 vs 夜里声色" 的强对比.
 *  灯笼/篝火 emissive, 任何时段都自发光 → 远看就能识别为夜场.
 * ============================================================ */
const pingkangZone = new THREE.Group();
scene.add(pingkangZone);

const pkCenter = new THREE.Vector3(38, 0, -12);
const pkSize = 18;

// --- 坊墙: 四面夯土, 灰瓦顶, 缺口让人能从街道进入 ---
const pkWallMat   = new THREE.MeshLambertMaterial({ color: 0x6b4f36 });   // 偏暗的夜土
const pkWallCap   = new THREE.MeshLambertMaterial({ color: 0x2c2a26 });
for (const side of [-1, 1]) {
  // 南北两面 — 各留中央 4m 缺口
  const segLen = (pkSize - 4) / 2;
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(segLen, 1.8, 0.32), pkWallMat);
    w.position.set(pkCenter.x + s * (segLen / 2 + 2), 0.9, pkCenter.z + side * pkSize / 2);
    w.castShadow = true; w.receiveShadow = true;
    pingkangZone.add(w);
    const c = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.12, 0.42), pkWallCap);
    c.position.set(pkCenter.x + s * (segLen / 2 + 2), 1.86, pkCenter.z + side * pkSize / 2);
    pingkangZone.add(c);
  }
  // 东西两面 — 整段封闭
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.8, pkSize), pkWallMat);
  w.position.set(pkCenter.x + side * pkSize / 2, 0.9, pkCenter.z);
  w.castShadow = true; w.receiveShadow = true;
  pingkangZone.add(w);
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, pkSize), pkWallCap);
  c.position.set(pkCenter.x + side * pkSize / 2, 1.86, pkCenter.z);
  pingkangZone.add(c);
}

// --- 南门牌坊: 红柱 + 黑瓦 + "平康" 横匾 ---
function buildPingkangArch(x, z, facing = 0) {
  const g = new THREE.Group();
  // 双红柱
  for (const dx of [-1.6, 1.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.2, 12), mats.vermillion);
    post.position.set(dx, 1.6, 0); post.castShadow = true; g.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.55), mats.black);
    base.position.set(dx, 0.15, 0); g.add(base);
  }
  // 横梁 + 飞檐
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x8B2F22 }));
  beam.position.set(0, 3.2, 0); g.add(beam);
  const eave = makeTangRoof(4.6, 0.9, 0.32, 'roof', false);
  eave.position.y = 3.55; g.add(eave);
  // 横匾 — "平康坊"
  const c = document.createElement('canvas');
  c.width = 320; c.height = 100;
  const cx = c.getContext('2d');
  cx.fillStyle = '#1a0f0a'; cx.fillRect(0, 0, 320, 100);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 4; cx.strokeRect(6, 6, 308, 88);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 48px STKaiti, KaiTi, "Songti SC", serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('平 康 坊', 160, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plaque.position.set(0, 3.2, 0.22); g.add(plaque);
  const plaqueBack = plaque.clone(); plaqueBack.position.z = -0.22; plaqueBack.rotation.y = Math.PI;
  g.add(plaqueBack);
  // 大红灯笼 — 挂梁两侧
  const lanternMat = new THREE.MeshLambertMaterial({
    color: 0xff5a3a, emissive: 0xff3322, emissiveIntensity: 0.6,
  });
  for (const dx of [-1.4, 1.4]) {
    const lant = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.18, 4, 10), lanternMat);
    lant.position.set(dx, 2.5, 0);
    lant.userData.lantern = true;
    g.add(lant);
    // 灯穗
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.20, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd060 }));
    tail.position.set(dx, 2.12, 0); tail.rotation.x = Math.PI; g.add(tail);
    // 顶绳
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
      new THREE.MeshBasicMaterial({ color: 0x1a1610 }));
    rope.position.set(dx, 2.9, 0); g.add(rope);
  }
  g.position.set(x, 0, z); g.rotation.y = facing;
  return g;
}
pingkangZone.add(buildPingkangArch(pkCenter.x, pkCenter.z + pkSize / 2 + 0.5, 0));   // 南门
pingkangZone.add(buildPingkangArch(pkCenter.x, pkCenter.z - pkSize / 2 - 0.5, Math.PI)); // 北门

// --- 中央鼓楼 (双层 + 大鼓 + 顶灯笼) ---
const pkDrumTower = new THREE.Group();
// 基座
pkDrumTower.add(box(2.6, 0.4, 2.6, 'stone', 0, 0.2, 0));
// 一层木墙
const drumBaseMat = new THREE.MeshLambertMaterial({ color: 0x7a2a1a });
pkDrumTower.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.2), drumBaseMat).translateY(1.4));
// 一层柱 (4 红柱)
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 10), mats.vermillion);
  p.position.set(dx * 1.05, 1.5, dz * 1.05); pkDrumTower.add(p);
}
// 一层飞檐
const drumEave1 = makeTangRoof(2.8, 1.0, 0.32, 'roof', false);
drumEave1.position.y = 2.55; pkDrumTower.add(drumEave1);
// 二层鼓 (大红牛皮鼓)
const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.0, 16),
  new THREE.MeshLambertMaterial({ color: 0xc23a2a }));
drumBody.position.y = 3.4; pkDrumTower.add(drumBody);
// 鼓面 (浅黄牛皮)
const drumHead = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 16),
  new THREE.MeshLambertMaterial({ color: 0xd9b07a }));
drumHead.position.y = 3.93; pkDrumTower.add(drumHead);
// 鼓钉
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * Math.PI * 2;
  const stud = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mats.gold);
  stud.position.set(Math.cos(ang) * 0.71, 3.4, Math.sin(ang) * 0.71);
  pkDrumTower.add(stud);
}
// 二层飞檐
const drumEave2 = makeTangRoof(2.0, 0.7, 0.26, 'roof', false);
drumEave2.position.y = 4.3; pkDrumTower.add(drumEave2);
// 楼顶大灯笼
const topLanternMat = new THREE.MeshLambertMaterial({
  color: 0xff4422, emissive: 0xff2010, emissiveIntensity: 0.75,
});
const topLantern = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.32, 4, 12), topLanternMat);
topLantern.position.y = 5.05;
topLantern.userData.lantern = true;
pkDrumTower.add(topLantern);
// 楼顶点光源 (夜间最显眼的红光)
const drumLamp = new THREE.PointLight(0xff5530, 1.6, 16, 1.4);
drumLamp.position.set(0, 5.2, 0); pkDrumTower.add(drumLamp);
pkDrumTower.position.set(pkCenter.x, 0, pkCenter.z);
pingkangZone.add(pkDrumTower);

// --- 灯杆阵 (12 根, 围绕鼓楼内圈) — 每根挂 2 盏红灯笼 ---
const lampMat2 = new THREE.MeshLambertMaterial({
  color: 0xff6044, emissive: 0xff3020, emissiveIntensity: 0.55,
});
const lampTailMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });
const lampRopeMat = new THREE.MeshBasicMaterial({ color: 0x1a1610 });
const pkLanterns = [];   // 收集起来给 animate() 做轻微摇曳
for (let i = 0; i < 12; i++) {
  const ang = (i / 12) * Math.PI * 2;
  const r   = 4.4 + (i % 2) * 0.8;   // 内外两圈穿插
  const lx  = pkCenter.x + Math.cos(ang) * r;
  const lz  = pkCenter.z + Math.sin(ang) * r;
  // 木杆 (深褐)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x3a2418 }));
  pole.position.set(lx, 1.7, lz); pole.castShadow = true;
  pingkangZone.add(pole);
  // 横担
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05),
    new THREE.MeshLambertMaterial({ color: 0x3a2418 }));
  arm.position.set(lx, 3.3, lz); pingkangZone.add(arm);
  // 两盏灯笼 (轻微高低差)
  for (const dxOff of [-0.25, 0.25]) {
    const lant = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.13, 4, 10), lampMat2);
    lant.position.set(lx + dxOff, 2.7 + Math.random() * 0.15, lz);
    lant.userData.lantern = true;
    pingkangZone.add(lant);
    pkLanterns.push({ lant, basePhase: Math.random() * Math.PI * 2 });
    // 灯穗
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), lampTailMat);
    tail.position.set(lx + dxOff, 2.45, lz); tail.rotation.x = Math.PI;
    pingkangZone.add(tail);
    // 顶绳
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), lampRopeMat);
    rope.position.set(lx + dxOff, 3.05, lz); pingkangZone.add(rope);
  }
  // 给灯杆配一个小点光源 — 真夜里好看
  if (i % 3 === 0) {
    const pl = new THREE.PointLight(0xff6644, 0.8, 6, 1.5);
    pl.position.set(lx, 2.8, lz); pingkangZone.add(pl);
  }
}
// 暴露给 animate() 做晃灯动画
window._pkLanterns = pkLanterns;

// --- 中央篝火 (鼓楼前广场) — 用一个红橙发光体 + 余烬粒子 ---
const fireCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10),
  new THREE.MeshBasicMaterial({ color: 0xff6020 }));
fireCore.position.set(pkCenter.x + 3.6, 0.4, pkCenter.z - 0.3);
pingkangZone.add(fireCore);
const fireLamp = new THREE.PointLight(0xff7030, 1.4, 8, 1.5);
fireLamp.position.copy(fireCore.position); fireLamp.position.y += 0.2;
pingkangZone.add(fireLamp);
// 围石
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * Math.PI * 2;
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), mats.stone);
  st.position.set(
    fireCore.position.x + Math.cos(ang) * 0.6,
    0.11,
    fireCore.position.z + Math.sin(ang) * 0.6,
  );
  pingkangZone.add(st);
}

// --- 周边 4 座低矮坊舍 (酒肆、教坊、香肆、客栈) ---
function buildPkLowHouse(label, accent) {
  const g = new THREE.Group();
  // 主体 (4.4 × 2.6 × 3.4)
  g.add(box(4.4, 2.4, 3.4, 'earth', 0, 1.2, 0));
  // 屋顶 (灰瓦)
  const roof = makeTangRoof(5.0, 4.0, 0.35, 'roof', true);
  roof.position.y = 2.5; g.add(roof);
  // 红柱 4 根
  for (const [dx, dz] of [[-2.0, -1.6], [2.0, -1.6], [-2.0, 1.6], [2.0, 1.6]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 2.4, 8), mats.vermillion);
    p.position.set(dx, 1.2, dz); g.add(p);
  }
  // 门 (中央)
  g.add(box(1.0, 1.6, 0.06, 'wood', 0, 0.8, 1.74));
  g.add(box(0.06, 1.6, 0.06, 'black', -0.5, 0.8, 1.74));
  g.add(box(0.06, 1.6, 0.06, 'black',  0.5, 0.8, 1.74));
  // 门口左右各挂一灯笼
  for (const dx of [-0.85, 0.85]) {
    const lant = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.12, 4, 10), lampMat2);
    lant.position.set(dx, 1.95, 1.78); lant.userData.lantern = true; g.add(lant);
    pkLanterns.push({ lant, basePhase: Math.random() * Math.PI * 2 });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6), lampRopeMat);
    rope.position.set(dx, 2.25, 1.78); g.add(rope);
  }
  // 旗幌 (酒/歌/香/宿) — 头顶飘旗
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.3),
    new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide }));
  flag.position.set(1.95, 3.0, 0.0); flag.rotation.y = Math.PI / 2;
  g.add(flag);
  // 旗杆
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), mats.wood);
  flagPole.position.set(1.95, 3.0, -0.55); g.add(flagPole);
  // 招牌字 (canvas)
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const cx = c.getContext('2d');
  cx.fillStyle = accent === 0xc23a2a ? '#3a1a14' : '#241a14'; cx.fillRect(0, 0, 128, 256);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 88px STKaiti, KaiTi, serif';
  cx.textAlign = 'center'; cx.fillText(label, 64, 140);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(1.95, 2.55, 0.0); sign.rotation.y = Math.PI / 2;
  g.add(sign);
  return g;
}
// 角落 4 座坊舍 (相对鼓楼东南/西南/东北/西北)
const lowHouses = [
  { label: '酒', color: 0xc23a2a, dx:  6.0, dz:  6.0, ry: -Math.PI / 2 },
  { label: '歌', color: 0xa45298, dx: -6.0, dz:  6.0, ry:  Math.PI / 2 },
  { label: '香', color: 0xc99a3a, dx:  6.0, dz: -6.0, ry: -Math.PI / 2 },
  { label: '宿', color: 0x4670a0, dx: -6.0, dz: -6.0, ry:  Math.PI / 2 },
];
for (const h of lowHouses) {
  const house = buildPkLowHouse(h.label, h.color);
  house.position.set(pkCenter.x + h.dx, 0, pkCenter.z + h.dz);
  house.rotation.y = h.ry;
  pingkangZone.add(house);
}

// --- 平康坊 NPC (1 鼓师 + 1 胡琴 + 2 舞姬 + 3 围观 + 1 灯谜老者) ---

// 鼓师 (站在篝火旁, 双手举槌打鼓状)
const pkDrummer = buildPerson({
  robe: 'silkPurple', cap: 'black', role: 'civilian', pose: 'raise',
});
pkDrummer.position.set(pkCenter.x + 2.6, 0.2, pkCenter.z - 0.3);
pkDrummer.rotation.y = -Math.PI / 2;
pkDrummer.userData.basePos = pkDrummer.position.clone();
pkDrummer.userData.idle = Math.random() * Math.PI;
pkDrummer.userData.npcLabel = '鼓师';   // 给点击 NPC 的小弹窗用
pingkangZone.add(pkDrummer);
animatables.push({ type: 'person', obj: pkDrummer });

// 胡琴师 (盘坐在酒肆门口)
const pkHuqin = buildPerson({
  robe: 'silkBlue', cap: 'black', role: 'scholar', pose: 'kneel',
});
pkHuqin.position.set(pkCenter.x + 5.4, 0.2, pkCenter.z + 5.0);
pkHuqin.rotation.y = -Math.PI / 2 - 0.3;
pkHuqin.userData.basePos = pkHuqin.position.clone();
pkHuqin.userData.idle = Math.random() * Math.PI;
pingkangZone.add(pkHuqin);
animatables.push({ type: 'person', obj: pkHuqin });

// 2 舞姬 (在篝火和鼓楼之间, 用胡旋舞动画)
for (let i = 0; i < 2; i++) {
  const ang = (i / 2) * Math.PI * 2 + 0.3;
  const dancer = buildPerson({
    role: 'lady',
    robe: ['silkPink', 'silkGold'][i],
    pibo: ['silkGreen', 'silkBlue'][i],
    pose: 'dance',
  });
  const dx = pkCenter.x + 3.6 + Math.cos(ang) * 0.9;
  const dz = pkCenter.z - 0.3 + Math.sin(ang) * 0.9;
  dancer.position.set(dx, 0.2, dz);
  dancer.userData.danceAng = ang;
  dancer.userData.danceCenter = new THREE.Vector3(pkCenter.x + 3.6, 0, pkCenter.z - 0.3);
  pingkangZone.add(dancer);
  animatables.push({ type: 'dancer', obj: dancer });
}

// 3 围观 (站在外圈, 朝向篝火)
const pkOnlookerSpots = [
  { x: pkCenter.x + 5.6, z: pkCenter.z - 0.3, role: 'merchant', robe: 'silkGreen' },
  { x: pkCenter.x + 2.0, z: pkCenter.z + 2.4, role: 'scholar',  robe: 'white'      },
  { x: pkCenter.x + 5.0, z: pkCenter.z - 3.0, role: 'foreigner',robe: 'silkPurple' },
];
for (const sp of pkOnlookerSpots) {
  const p = buildPerson({ role: sp.role, robe: sp.robe });
  p.position.set(sp.x, 0.2, sp.z);
  // 朝向篝火
  p.rotation.y = Math.atan2(
    (pkCenter.x + 3.6) - sp.x,
    (pkCenter.z - 0.3) - sp.z,
  );
  p.userData.basePos = p.position.clone();
  p.userData.idle = Math.random() * Math.PI;
  pingkangZone.add(p);
  animatables.push({ type: 'person', obj: p });
}

// 灯谜老者 (站在南门内侧, 旁边一架灯笼台子) — 可触发 灯谜 mini
const pkRiddleElder = buildPerson({
  robe: 'silkGold', cap: 'black', role: 'scholar', tool: 'scroll', scale: 1.04,
});
pkRiddleElder.position.set(pkCenter.x - 4.5, 0.2, pkCenter.z + 6.5);
pkRiddleElder.rotation.y = -Math.PI;
pkRiddleElder.userData.basePos = pkRiddleElder.position.clone();
pkRiddleElder.userData.idle = Math.random() * Math.PI;
pkRiddleElder.userData.npcRole = 'elder';
pkRiddleElder.userData.specialMini = 'lanternRiddle';
pkRiddleElder.userData.npcLabel = '灯谜老者';
pkRiddleElder.userData.specialIntro = '老朽设了几道灯谜, 君若解得开, 自当奉酒一杯。';
pingkangZone.add(pkRiddleElder);
animatables.push({ type: 'person', obj: pkRiddleElder });
// 头顶小铭牌 (复用 makeNameplate 风格的简单 sprite, 提示这是个特殊 NPC)
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '灯谜老者', subtitle: '🏮 解谜得彩', nameColor: '#ffd066' });
    np.position.set(0, 2.4, 0);
    pkRiddleElder.add(np);
  } catch (e) {}
}

// 注册到 interactables — 让玩家点 NPC 时能识别 (与 namedNpcs 平行)
// 标准 NPC 点击交互由 raycast 走 g.userData.npc=true 即可, 已在 buildPerson 内置
// specialMini 在 dialog flow 内额外渲染按钮 (见后续 renderDialog 补丁)

/* ============================================================
 *  ZONE-M: 梨园 教坊 (南偏东, 15, 45)
 *  唐玄宗在禁苑梨园教坊设乐工三百, 此处用 圆台 + 胡旋舞姬 + 4 乐工
 *  与 平康坊夜市 形成 "民间夜场 vs 宫廷艺术" 的对比.
 *  圆台稍抬 0.3m + 围栏 + 角灯, 视觉上是个 "舞台", 不是市集.
 * ============================================================ */
const liyuanZone = new THREE.Group();
scene.add(liyuanZone);

const lyCenter = new THREE.Vector3(15, 0, 45);

// --- 圆形舞台 (半径 5m, 抬高 0.3m, 大理石质感) ---
const liyuanStage = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.3, 36),
  new THREE.MeshLambertMaterial({ color: 0xe8d8b8 }));   // 浅大理石
liyuanStage.position.set(lyCenter.x, 0.15, lyCenter.z);
liyuanStage.castShadow = true; liyuanStage.receiveShadow = true;
liyuanZone.add(liyuanStage);
// 台沿 — 深色描金
const liyuanStageEdge = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.08, 8, 36),
  new THREE.MeshLambertMaterial({
    color: 0xc99a3a, emissive: 0xc99a3a, emissiveIntensity: 0.1,
  }));
liyuanStageEdge.position.set(lyCenter.x, 0.3, lyCenter.z);
liyuanStageEdge.rotation.x = Math.PI / 2;
liyuanZone.add(liyuanStageEdge);
// 台中莲花纹 (canvas 贴在台面)
const lotusC = document.createElement('canvas');
lotusC.width = 256; lotusC.height = 256;
{
  const cx = lotusC.getContext('2d');
  cx.fillStyle = 'rgba(0,0,0,0)'; cx.clearRect(0, 0, 256, 256);
  cx.strokeStyle = '#a07840'; cx.lineWidth = 3;
  cx.translate(128, 128);
  for (let i = 0; i < 8; i++) {
    cx.beginPath();
    cx.ellipse(0, 0, 70, 30, (i / 8) * Math.PI * 2, 0, Math.PI * 2);
    cx.stroke();
  }
  cx.beginPath(); cx.arc(0, 0, 25, 0, Math.PI * 2); cx.stroke();
}
const lotusTex = new THREE.CanvasTexture(lotusC);
lotusTex.colorSpace = THREE.SRGBColorSpace;
const lotusMark = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 7.8),
  new THREE.MeshBasicMaterial({ map: lotusTex, transparent: true }));
lotusMark.rotation.x = -Math.PI / 2;
lotusMark.position.set(lyCenter.x, 0.305, lyCenter.z);
liyuanZone.add(lotusMark);

// --- 4 角白柱 (柱顶宫灯) ---
for (let i = 0; i < 4; i++) {
  const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const cx = lyCenter.x + Math.cos(ang) * 5.8;
  const cz = lyCenter.z + Math.sin(ang) * 5.8;
  // 柱基
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 12), mats.stone);
  base.position.set(cx, 0.09, cz); liyuanZone.add(base);
  // 主柱 — 白色
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 4.2, 14),
    new THREE.MeshLambertMaterial({ color: 0xf0e6cf }));
  pillar.position.set(cx, 2.28, cz); pillar.castShadow = true;
  liyuanZone.add(pillar);
  // 描金束腰
  for (const yy of [0.7, 4.0]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.06, 14), mats.gold);
    ring.position.set(cx, yy, cz); liyuanZone.add(ring);
  }
  // 柱顶白瓷宫灯 (六角形)
  const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 6),
    new THREE.MeshLambertMaterial({
      color: 0xfff0c4, emissive: 0xffe090, emissiveIntensity: 0.5,
    }));
  lant.position.set(cx, 4.6, cz); liyuanZone.add(lant);
  // 灯顶尖
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 6),
    new THREE.MeshLambertMaterial({ color: 0xc99a3a }));
  top.position.set(cx, 4.95, cz); liyuanZone.add(top);
  // 点光
  const pl = new THREE.PointLight(0xffd88c, 0.9, 7, 1.5);
  pl.position.set(cx, 4.5, cz); liyuanZone.add(pl);
}
// 柱间帷幔 (相邻柱间的半透明垂帘)
for (let i = 0; i < 4; i++) {
  const a1 = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const a2 = ((i + 1) / 4) * Math.PI * 2 + Math.PI / 4;
  const x1 = lyCenter.x + Math.cos(a1) * 5.8, z1 = lyCenter.z + Math.sin(a1) * 5.8;
  const x2 = lyCenter.x + Math.cos(a2) * 5.8, z2 = lyCenter.z + Math.sin(a2) * 5.8;
  const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const drape = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.85, 1.6),
    new THREE.MeshLambertMaterial({
      color: 0xc76b8a, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    }));
  drape.position.set(mx, 4.1, mz);
  drape.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
  liyuanZone.add(drape);
}

// --- 入口南牌坊 (玩家从北朝南走来的接驳点) ---
const lyArch = new THREE.Group();
for (const dx of [-1.8, 1.8]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 3.6, 12), mats.vermillion);
  post.position.set(dx, 1.8, 0); post.castShadow = true; lyArch.add(post);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), mats.black);
  base.position.set(dx, 0.15, 0); lyArch.add(base);
}
const lyBeam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 0.42),
  new THREE.MeshLambertMaterial({ color: 0xB23A2A }));
lyBeam.position.set(0, 3.65, 0); lyArch.add(lyBeam);
const lyEave = makeTangRoof(5.0, 1.0, 0.34, 'roof', false);
lyEave.position.y = 4.05; lyArch.add(lyEave);
{
  const c = document.createElement('canvas');
  c.width = 320; c.height = 100;
  const cx = c.getContext('2d');
  cx.fillStyle = '#1a0f0a'; cx.fillRect(0, 0, 320, 100);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 4; cx.strokeRect(6, 6, 308, 88);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 50px STKaiti, KaiTi, serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('梨 园', 160, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plaque.position.set(0, 3.55, 0.24); lyArch.add(plaque);
  const back = plaque.clone(); back.position.z = -0.24; back.rotation.y = Math.PI;
  lyArch.add(back);
}
lyArch.position.set(lyCenter.x, 0, lyCenter.z - 8);
liyuanZone.add(lyArch);

// --- 舞台旁两株梨树 (白花) ---
function makePearTree(x, z) {
  const g = new THREE.Group();
  // 树干
  g.add(box(0.3, 2.4, 0.3, 'trunk', 0, 1.2, 0));
  // 树冠 (5 块白绿色矮椭球)
  const crownMat = new THREE.MeshLambertMaterial({ color: 0xa8b88a });
  const blossomMat = new THREE.MeshLambertMaterial({ color: 0xf0e8d4 });
  for (let i = 0; i < 6; i++) {
    const r = 0.6 + Math.random() * 0.3;
    const cx2 = (Math.random() - 0.5) * 1.2;
    const cz2 = (Math.random() - 0.5) * 1.2;
    const cy  = 2.2 + Math.random() * 0.8;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), crownMat);
    crown.position.set(cx2, cy, cz2); g.add(crown);
    const blossom = new THREE.Mesh(new THREE.SphereGeometry(r * 0.95, 8, 6), blossomMat);
    blossom.position.set(cx2, cy + 0.05, cz2); blossom.scale.y = 0.5;
    g.add(blossom);
  }
  g.position.set(x, 0, z); return g;
}
liyuanZone.add(makePearTree(lyCenter.x - 8.5, lyCenter.z + 2));
liyuanZone.add(makePearTree(lyCenter.x + 8.5, lyCenter.z - 2));
liyuanZone.add(makePearTree(lyCenter.x - 9.0, lyCenter.z - 4));
liyuanZone.add(makePearTree(lyCenter.x + 9.0, lyCenter.z + 4));

// --- 梨园 NPC ---

// 主舞者 — 胡旋舞姬 (站台中央, 高速旋转 + 长袖飞舞)
const lyHuxuan = buildPerson({
  role: 'lady',
  robe: 'silkPink',
  pibo: 'silkGold',
  skin: 'skin',
  pose: 'dance',
  scale: 1.05,
});
lyHuxuan.position.set(lyCenter.x, 0.35, lyCenter.z);   // 站在抬高 0.3m 的台上
lyHuxuan.userData.danceAng = 0;
lyHuxuan.userData.danceCenter = new THREE.Vector3(lyCenter.x, 0.35, lyCenter.z);
// 复写 danceCenter 让她原地旋转, 不绕圆周走 — 通过把 radius 改 0
lyHuxuan.userData._fixedSpin = true;
liyuanZone.add(lyHuxuan);
animatables.push({ type: 'liyuanDancer', obj: lyHuxuan });

// 4 乐工 (鼓/笛/琵琶/排箫, 围坐台沿外侧)
const lyMusicians = [
  { role: 'scholar', robe: 'silkBlue',   pose: 'kneel', dx: -3.5, dz:  2.8, ry:  Math.PI * 0.25,  inst: '鼓' },
  { role: 'scholar', robe: 'silkPurple', pose: 'kneel', dx:  3.5, dz:  2.8, ry: -Math.PI * 0.25,  inst: '笛' },
  { role: 'scholar', robe: 'silkGreen',  pose: 'kneel', dx: -3.5, dz: -2.8, ry:  Math.PI * 0.75,  inst: '琵琶' },
  { role: 'scholar', robe: 'silkGold',   pose: 'kneel', dx:  3.5, dz: -2.8, ry: -Math.PI * 0.75,  inst: '排箫' },
];
for (const m of lyMusicians) {
  const p = buildPerson({ role: m.role, robe: m.robe, pose: m.pose });
  p.position.set(lyCenter.x + m.dx, 0.18, lyCenter.z + m.dz);
  p.rotation.y = m.ry;
  p.userData.basePos = p.position.clone();
  p.userData.idle = Math.random() * Math.PI;
  p.userData.npcLabel = `${m.inst}师`;
  p.userData.npcRole = 'musician';
  liyuanZone.add(p);
  animatables.push({ type: 'person', obj: p });
  // 乐器道具 (小巧, 放在乐工身前)
  const inst = new THREE.Group();
  if (m.inst === '鼓') {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.42, 14),
      new THREE.MeshLambertMaterial({ color: 0xc23a2a }));
    drum.position.y = 0.21; inst.add(drum);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 14),
      new THREE.MeshLambertMaterial({ color: 0xd9b07a }));
    head.position.y = 0.44; inst.add(head);
  } else if (m.inst === '笛') {
    const dz_ = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8),
      new THREE.MeshLambertMaterial({ color: 0xb78c52 }));
    dz_.rotation.z = Math.PI / 2; dz_.position.y = 0.35; inst.add(dz_);
  } else if (m.inst === '琵琶') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0x8a5a32 }));
    body.scale.y = 0.5; body.position.y = 0.3; inst.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x6e4222 }));
    neck.position.set(0, 0.5, 0); inst.add(neck);
  } else if (m.inst === '排箫') {
    for (let k = 0; k < 6; k++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3 - k * 0.03, 6),
        new THREE.MeshLambertMaterial({ color: 0xb78c52 }));
      tube.position.set(-0.12 + k * 0.045, 0.35 - k * 0.015, 0);
      inst.add(tube);
    }
  }
  inst.position.set(p.position.x + Math.sin(m.ry + Math.PI) * 0.4, 0, p.position.z + Math.cos(m.ry + Math.PI) * 0.4);
  liyuanZone.add(inst);
}

// 6 坐地听众 (台前圆弧, 朝向台中)
for (let i = 0; i < 6; i++) {
  const t = -0.6 + (i / 5) * 1.2;   // -0.6 ~ +0.6 弧度范围
  const ang = Math.PI + t;          // 主要在 stage 南侧
  const r = 8.5;
  const x = lyCenter.x + Math.cos(ang) * r;
  const z = lyCenter.z + Math.sin(ang) * r;
  const p = buildPerson({
    role:  ['scholar', 'lady', 'merchant', 'civilian', 'scholar', 'lady'][i],
    robe:  ['silkBlue', 'silkPink', 'silkGreen', 'white', 'silkGold', 'silkPurple'][i],
    pose:  'kneel',
  });
  p.position.set(x, 0.18, z);
  p.rotation.y = Math.atan2(lyCenter.x - x, lyCenter.z - z);
  p.userData.basePos = p.position.clone();
  p.userData.idle = Math.random() * Math.PI;
  liyuanZone.add(p);
  animatables.push({ type: 'person', obj: p });
}

// 梨园乐工领班 (站在台沿东侧, 可触发 节奏跟弹 mini)
const lyMaster = buildPerson({
  robe: 'silkPurple', cap: 'black', role: 'scholar', tool: 'staff', scale: 1.06,
});
lyMaster.position.set(lyCenter.x + 6.5, 0.2, lyCenter.z - 0.5);
lyMaster.rotation.y = -Math.PI / 2;
lyMaster.userData.basePos = lyMaster.position.clone();
lyMaster.userData.idle = Math.random() * Math.PI;
lyMaster.userData.npcRole = 'sage';   // sage 默认在 poetry 池里, 也允许 mini-game
lyMaster.userData.specialMini = 'rhythmTap';
lyMaster.userData.npcLabel = '梨园乐工';
lyMaster.userData.specialIntro = '某乃梨园乐工。听罢鼓点, 君可与某和拍一曲乎?';
liyuanZone.add(lyMaster);
animatables.push({ type: 'person', obj: lyMaster });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '梨园乐工', subtitle: '🥁 和拍得彩', nameColor: '#ffd0a0' });
    np.position.set(0, 2.4, 0);
    lyMaster.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-N: 东市 胡商集珍 (东侧 35, 5)
 *  与西市的胡商平民集市不同: 这是奢侈品市, 玉/锦/香/书/银/茶 — 高价货.
 *  视觉钩子: 高竹竿 阵列挂彩缎 (像彩色森林) + 各店铺独有道具 + 波斯邸银盘.
 *  色彩绝对压倒已有的低饱和木褐色街区.
 * ============================================================ */
const dongshiZone = new THREE.Group();
scene.add(dongshiZone);

const dsCenter = new THREE.Vector3(35, 0, 5);
const dsSize = 16;

// --- 坊墙: 4 段, 与西市同款的夯土色 + 缺口 ---
const dsWallMat = new THREE.MeshLambertMaterial({ color: 0x9c7c52 });
const dsWallCap = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
for (const side of [-1, 1]) {
  // 南北两面 — 中央 4m 缺口
  const segLen = (dsSize - 4) / 2;
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(segLen, 1.7, 0.3), dsWallMat);
    w.position.set(dsCenter.x + s * (segLen / 2 + 2), 0.85, dsCenter.z + side * dsSize / 2);
    w.castShadow = true; w.receiveShadow = true;
    dongshiZone.add(w);
    const c = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.12, 0.4), dsWallCap);
    c.position.set(dsCenter.x + s * (segLen / 2 + 2), 1.76, dsCenter.z + side * dsSize / 2);
    dongshiZone.add(c);
  }
  // 东西两面 — 中央 4m 缺口
  const segLenZ = (dsSize - 4) / 2;
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.7, segLenZ), dsWallMat);
    w.position.set(dsCenter.x + side * dsSize / 2, 0.85, dsCenter.z + s * (segLenZ / 2 + 2));
    w.castShadow = true; w.receiveShadow = true;
    dongshiZone.add(w);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, segLenZ), dsWallCap);
    c.position.set(dsCenter.x + side * dsSize / 2, 1.76, dsCenter.z + s * (segLenZ / 2 + 2));
    dongshiZone.add(c);
  }
}

// --- 西门牌坊 (主入口) — "东市" 横匾 ---
function buildDongshiArch(x, z, facing = 0) {
  const g = new THREE.Group();
  for (const dx of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 3.4, 12), mats.vermillion);
    post.position.set(dx, 1.7, 0); post.castShadow = true; g.add(post);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), mats.black);
    base.position.set(dx, 0.15, 0); g.add(base);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x7a3a20 }));
  beam.position.set(0, 3.45, 0); g.add(beam);
  const eave = makeTangRoof(5.0, 1.0, 0.34, 'roof', false);
  eave.position.y = 3.85; g.add(eave);
  // 匾
  const c = document.createElement('canvas');
  c.width = 320; c.height = 100;
  const cx = c.getContext('2d');
  cx.fillStyle = '#2a1a10'; cx.fillRect(0, 0, 320, 100);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 4; cx.strokeRect(6, 6, 308, 88);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 50px STKaiti, KaiTi, serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('东 市', 160, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  plaque.position.set(0, 3.35, 0.24); g.add(plaque);
  const back = plaque.clone(); back.position.z = -0.24; back.rotation.y = Math.PI;
  g.add(back);
  g.position.set(x, 0, z); g.rotation.y = facing;
  return g;
}
dongshiZone.add(buildDongshiArch(dsCenter.x - dsSize / 2 - 0.5, dsCenter.z, Math.PI / 2));   // 西门
dongshiZone.add(buildDongshiArch(dsCenter.x + dsSize / 2 + 0.5, dsCenter.z, -Math.PI / 2));  // 东门

// --- 8 个店铺布在围墙内沿 (玉/锦/香/书/银/茶/波斯邸/笔墨) ---
const dsShops = [
  { label: '玉', color: 0x6a9c7a, accent: 0xa0d8b0, dx: -5, dz: -5, item: 'jade' },     // 玉肆 — 翠色
  { label: '锦', color: 0xb3477e, accent: 0xd0a0c0, dx:  0, dz: -5, item: 'silk' },     // 锦肆 — 桃红
  { label: '香', color: 0xc99a3a, accent: 0xf0d090, dx:  5, dz: -5, item: 'incense' },  // 香肆 — 金黄
  { label: '书', color: 0x4670a0, accent: 0x80a0c8, dx: -5, dz:  0, item: 'book' },     // 书肆 — 深蓝
  { label: '波斯邸', color: 0x6a4884, accent: 0xa080c0, dx:  5, dz:  0, item: 'persian' }, // 波斯邸 — 紫
  { label: '银', color: 0x8a8a98, accent: 0xc0c0d0, dx: -5, dz:  5, item: 'silver' },   // 银肆 — 灰白
  { label: '茶', color: 0x5a7a48, accent: 0x90a878, dx:  0, dz:  5, item: 'tea' },      // 茶肆 — 苔绿
  { label: '笔墨', color: 0x3a2418, accent: 0x8a6a44, dx:  5, dz:  5, item: 'literati' }, // 笔墨 — 深褐
];
for (const sh of dsShops) {
  const px = dsCenter.x + sh.dx;
  const pz = dsCenter.z + sh.dz;
  // 棚 (彩色棚顶)
  const awningMat = new THREE.MeshLambertMaterial({ color: sh.color });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 2.2), awningMat);
  awning.position.set(px, 1.85, pz); dongshiZone.add(awning);
  // 4 角柱
  for (const [dx2, dz2] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.08), mats.wood);
    post.position.set(px + dx2, 0.92, pz + dz2); dongshiZone.add(post);
  }
  // 货案
  dongshiZone.add(box(2.0, 0.55, 1.4, 'wood', px, 0.28, pz));
  // 货物 (按店类型布置不同道具)
  if (sh.item === 'jade') {
    // 玉璧 + 玉璜 (绿玉环)
    for (let i = 0; i < 3; i++) {
      const bi = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 16),
        new THREE.MeshLambertMaterial({ color: sh.accent, emissive: sh.accent, emissiveIntensity: 0.15 }));
      bi.position.set(px - 0.6 + i * 0.6, 0.7, pz); bi.rotation.x = Math.PI / 2;
      dongshiZone.add(bi);
    }
  } else if (sh.item === 'silk') {
    // 卷锦 (3 卷不同色)
    const silks = [0xc76b8a, 0xd4a01e, 0x6a4884];
    for (let i = 0; i < 3; i++) {
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 10),
        new THREE.MeshLambertMaterial({ color: silks[i] }));
      roll.position.set(px - 0.6 + i * 0.6, 0.75, pz); roll.rotation.z = Math.PI / 2;
      dongshiZone.add(roll);
    }
  } else if (sh.item === 'incense') {
    // 香炉 (圆鼎 + 烟)
    const censer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.28, 12), mats.gold);
    censer.position.set(px, 0.75, pz); dongshiZone.add(censer);
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xe8e0d0, transparent: true, opacity: 0.35 }));
    smoke.position.set(px, 1.2, pz); dongshiZone.add(smoke);
    // 香木块
    for (let i = 0; i < 2; i++) {
      const log = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.12),
        new THREE.MeshLambertMaterial({ color: 0x8a5a32 }));
      log.position.set(px - 0.5 + i * 1.0, 0.62, pz + 0.4); dongshiZone.add(log);
    }
  } else if (sh.item === 'book') {
    // 卷轴堆 (3 卷)
    for (let i = 0; i < 4; i++) {
      const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }));
      scroll.position.set(px - 0.6 + i * 0.4, 0.65, pz);
      scroll.rotation.z = Math.PI / 2;
      dongshiZone.add(scroll);
      // 卷轴轴头
      const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 8), mats.wood);
      cap1.position.set(px - 0.6 + i * 0.4 - 0.25, 0.65, pz); cap1.rotation.z = Math.PI / 2;
      dongshiZone.add(cap1);
      const cap2 = cap1.clone(); cap2.position.x += 0.5; dongshiZone.add(cap2);
    }
  } else if (sh.item === 'persian') {
    // 波斯银盘 + 葡萄酒坛 + 葡萄
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.05, 16),
      new THREE.MeshLambertMaterial({
        color: 0xd8d8e0, emissive: 0xc8c8d0, emissiveIntensity: 0.18,
      }));
    tray.position.set(px - 0.5, 0.62, pz); dongshiZone.add(tray);
    // 银盘上葡萄
    for (let i = 0; i < 5; i++) {
      const grape = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x6a3884 }));
      grape.position.set(
        px - 0.5 + (Math.random() - 0.5) * 0.3,
        0.7 + Math.random() * 0.05,
        pz + (Math.random() - 0.5) * 0.3,
      );
      dongshiZone.add(grape);
    }
    // 酒坛 (双耳长瓶)
    const amphora = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.20, 0.55, 10),
      new THREE.MeshLambertMaterial({ color: 0x6a4222 }));
    amphora.position.set(px + 0.6, 0.85, pz); dongshiZone.add(amphora);
    // 双耳
    for (const dx2 of [-0.18, 0.18]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 4, 8),
        new THREE.MeshLambertMaterial({ color: 0x6a4222 }));
      handle.position.set(px + 0.6 + dx2, 0.96, pz); handle.rotation.y = Math.PI / 2;
      dongshiZone.add(handle);
    }
  } else if (sh.item === 'silver') {
    // 银锭 + 银盘
    for (let i = 0; i < 5; i++) {
      const ingot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14),
        new THREE.MeshLambertMaterial({
          color: 0xd0d0d8, emissive: 0xb8b8c0, emissiveIntensity: 0.18,
        }));
      ingot.position.set(
        px - 0.6 + (i % 3) * 0.6,
        0.62,
        pz - 0.3 + Math.floor(i / 3) * 0.6,
      );
      dongshiZone.add(ingot);
    }
  } else if (sh.item === 'tea') {
    // 茶饼 (圆饼堆)
    for (let i = 0; i < 3; i++) {
      const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16),
        new THREE.MeshLambertMaterial({ color: 0x5a3a18 }));
      cake.position.set(px - 0.5, 0.62 + i * 0.07, pz); dongshiZone.add(cake);
    }
    // 茶壶 (圆肚 + 嘴)
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0x9c7c52 }));
    pot.scale.y = 0.7; pot.position.set(px + 0.5, 0.74, pz); dongshiZone.add(pot);
  } else if (sh.item === 'literati') {
    // 笔架 (5 笔)
    for (let i = 0; i < 5; i++) {
      const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6),
        new THREE.MeshLambertMaterial({ color: 0x4a2a18 }));
      brush.position.set(px - 0.5 + i * 0.25, 0.78, pz);
      dongshiZone.add(brush);
      // 笔毫
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6),
        new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }));
      tip.position.set(px - 0.5 + i * 0.25, 0.65, pz);
      dongshiZone.add(tip);
    }
    // 砚台
    const inkstone = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    inkstone.position.set(px + 0.4, 0.62, pz + 0.4); dongshiZone.add(inkstone);
  }
  // 招牌竖匾 (在棚顶下方挂)
  const c = document.createElement('canvas');
  c.width = 100; c.height = 200;
  const cx = c.getContext('2d');
  cx.fillStyle = '#2a1a10'; cx.fillRect(0, 0, 100, 200);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 3; cx.strokeRect(4, 4, 92, 192);
  cx.fillStyle = '#f5d890'; cx.font = 'bold ' + (sh.label.length > 2 ? '36' : '64') + 'px STKaiti, KaiTi, serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  if (sh.label.length > 2) {
    sh.label.split('').forEach((ch, i) => cx.fillText(ch, 50, 50 + i * 50));
  } else {
    cx.fillText(sh.label, 50, 100);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.84),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(px, 1.4, pz - 1.05);
  dongshiZone.add(sign);
}

// --- 高竹竿阵 — 中央 8 根, 每根挂 3 块彩缎 (核心视觉 ── 像彩色丛林) ---
const silkColors = [
  0xc76b8a, // 粉
  0xd4a01e, // 金
  0x4670a0, // 蓝
  0x6a4884, // 紫
  0xb3477e, // 桃红
  0x6a9c7a, // 翠绿
];
for (let i = 0; i < 6; i++) {
  const ang = (i / 6) * Math.PI * 2;
  const r = 2.6;
  const px = dsCenter.x + Math.cos(ang) * r;
  const pz = dsCenter.z + Math.sin(ang) * r;
  // 竹竿 (黄绿色)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.4, 8), mats.bambooStem);
  pole.position.set(px, 2.2, pz); pole.castShadow = true; dongshiZone.add(pole);
  // 竹节 (深一些的环)
  for (let k = 0; k < 4; k++) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 8), mats.bamboo);
    ring.position.set(px, 0.5 + k * 1.0, pz); dongshiZone.add(ring);
  }
  // 3 块彩缎 (上中下, 不同色)
  for (let k = 0; k < 3; k++) {
    const c = silkColors[(i + k) % silkColors.length];
    const silk = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3),
      new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    silk.position.set(px, 3.6 - k * 1.0, pz);
    silk.rotation.y = ang + Math.PI / 2;
    silk.userData.silkSway = { base: ang + Math.PI / 2, phase: Math.random() * Math.PI * 2 };
    dongshiZone.add(silk);
  }
}

// --- 东市 NPC ---
// 1 玉器商 (玉肆前, 站立 + 持秤)
const dsJadeMerchant = buildPerson({
  robe: 'silkGreen', cap: 'black', role: 'merchant', tool: 'staff',
});
dsJadeMerchant.position.set(dsCenter.x - 5, 0.2, dsCenter.z - 3.6);
dsJadeMerchant.rotation.y = Math.PI;
dsJadeMerchant.userData.basePos = dsJadeMerchant.position.clone();
dsJadeMerchant.userData.idle = Math.random() * Math.PI;
dongshiZone.add(dsJadeMerchant);
animatables.push({ type: 'person', obj: dsJadeMerchant });

// 1 书生买卷 (书肆前)
const dsBookBuyer = buildPerson({ robe: 'white', role: 'scholar', tool: 'scroll' });
dsBookBuyer.position.set(dsCenter.x - 5, 0.2, dsCenter.z + 1.2);
dsBookBuyer.rotation.y = -Math.PI;
dsBookBuyer.userData.basePos = dsBookBuyer.position.clone();
dsBookBuyer.userData.idle = Math.random() * Math.PI;
dongshiZone.add(dsBookBuyer);
animatables.push({ type: 'person', obj: dsBookBuyer });

// 1 仕女选香 (香肆前)
const dsLadyIncense = buildPerson({ role: 'lady', robe: 'silkPink', pibo: 'silkGold' });
dsLadyIncense.position.set(dsCenter.x + 5, 0.2, dsCenter.z - 3.6);
dsLadyIncense.rotation.y = 0;
dsLadyIncense.userData.basePos = dsLadyIncense.position.clone();
dsLadyIncense.userData.idle = Math.random() * Math.PI;
dongshiZone.add(dsLadyIncense);
animatables.push({ type: 'person', obj: dsLadyIncense });

// 1 波斯商人 (波斯邸内)
const dsPersian = buildPerson({
  robe: 'silkPurple', skin: 'wood', hat: 'turban', tool: 'staff',
});
dsPersian.position.set(dsCenter.x + 5, 0.2, dsCenter.z - 1.2);
dsPersian.rotation.y = -Math.PI;
dsPersian.userData.basePos = dsPersian.position.clone();
dsPersian.userData.idle = Math.random() * Math.PI;
dsPersian.userData.npcRole = 'foreigner';
dongshiZone.add(dsPersian);
animatables.push({ type: 'person', obj: dsPersian });

// 1 路过仕女 (从西门走来)
const dsLadyWalk = buildPerson({ role: 'lady', robe: 'silkBlue', pibo: 'silkPink' });
dsLadyWalk.position.set(dsCenter.x - 2, 0.2, dsCenter.z - 1);
dsLadyWalk.userData.basePos = dsLadyWalk.position.clone();
dsLadyWalk.userData.idle = Math.random() * Math.PI;
dongshiZone.add(dsLadyWalk);
animatables.push({ type: 'person', obj: dsLadyWalk });

// 1 路过商贾 (从东门走来)
const dsMerchantWalk = buildPerson({ role: 'merchant', robe: 'silkPurple' });
dsMerchantWalk.position.set(dsCenter.x + 2, 0.2, dsCenter.z + 1);
dsMerchantWalk.userData.basePos = dsMerchantWalk.position.clone();
dsMerchantWalk.userData.idle = Math.random() * Math.PI;
dongshiZone.add(dsMerchantWalk);
animatables.push({ type: 'person', obj: dsMerchantWalk });

// 鉴宝商 (东市中央, 可触发 jade appraisal mini)
const dsAppraiser = buildPerson({
  robe: 'silkGold', cap: 'black', role: 'merchant', tool: 'staff', scale: 1.06,
});
dsAppraiser.position.set(dsCenter.x, 0.2, dsCenter.z - 1.6);
dsAppraiser.rotation.y = Math.PI;
dsAppraiser.userData.basePos = dsAppraiser.position.clone();
dsAppraiser.userData.idle = Math.random() * Math.PI;
dsAppraiser.userData.npcRole = 'merchant';
dsAppraiser.userData.specialMini = 'jadeAppraisal';
dsAppraiser.userData.npcLabel = '鉴宝商贾';
dsAppraiser.userData.specialIntro = '小可在东市鉴宝多年。三件玉璧, 真伪一辨, 君敢试乎?';
dongshiZone.add(dsAppraiser);
animatables.push({ type: 'person', obj: dsAppraiser });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '鉴宝商贾', subtitle: '💎 鉴真得彩', nameColor: '#7be0a0' });
    np.position.set(0, 2.4, 0);
    dsAppraiser.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-O: 染坊 织绣 (西南 -45, 30)
 *  开放式作坊 (无围墙感) — 主视觉是高竹架阵挂彩色丝绸像森林,
 *  染缸 + 织台 + 石臼围在丝绸森林中央. 与东市同样用色彩, 但密度更大、
 *  形态更"垂帘", 制造"色彩浪潮"的视觉强项, 与东市的"展柜阵"成对照.
 * ============================================================ */
const ranfangZone = new THREE.Group();
scene.add(ranfangZone);

const rfCenter = new THREE.Vector3(-45, 0, 30);

// --- 地面 (作坊石板) ---
const rfFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.04, 14),
  new THREE.MeshLambertMaterial({ color: 0x8e7e64 }));
rfFloor.position.set(rfCenter.x, 0.02, rfCenter.z);
rfFloor.receiveShadow = true;
ranfangZone.add(rfFloor);

// --- 高竹架阵 + 长长的彩色丝绸 (核心视觉钩子) ---
// 4 排, 每排 5 根竹竿, 每两根之间挂一条 2m 长的彩缎
const dyeSilkColors = [
  0xc23a2a, // 朱红
  0xd4a01e, // 杏黄
  0x4670a0, // 靛蓝
  0x6a4884, // 紫
  0x6a9c7a, // 翠
  0xe8a5a5, // 桃粉
  0xb8b8d0, // 月白
  0x3a5a3a, // 苍青
];
const swayingSilks = [];
for (let row = 0; row < 4; row++) {
  const rz = rfCenter.z - 5 + row * 3;
  // 5 根竖竿 + 横担 (用 2 根高竿撑起 3 段彩缎)
  // 改用 3 根撑 2 段, 简化 + 视觉更通透
  const xs = [-6, -2, 2, 6].map((x) => rfCenter.x + x);
  // 竖竿
  for (const x of xs) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), mats.bamboo);
    pole.position.set(x, 2.2, rz); pole.castShadow = true;
    ranfangZone.add(pole);
    // 节
    for (let k = 0; k < 4; k++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8), mats.bambooDark);
      ring.position.set(x, 0.5 + k * 1.0, rz); ranfangZone.add(ring);
    }
  }
  // 横担 + 彩缎 (相邻竿之间)
  for (let k = 0; k < xs.length - 1; k++) {
    const x1 = xs[k], x2 = xs[k + 1];
    const mx = (x1 + x2) / 2;
    const len = x2 - x1;
    // 横担 (竹色)
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), mats.bambooStem);
    bar.position.set(mx, 4.0, rz); bar.rotation.z = Math.PI / 2;
    ranfangZone.add(bar);
    // 彩缎 (从横担垂下 2.4m, 与下层略错开)
    const silkColor = dyeSilkColors[(row * 3 + k) % dyeSilkColors.length];
    const silk = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.85, 2.4),
      new THREE.MeshLambertMaterial({
        color: silkColor, side: THREE.DoubleSide,
        transparent: true, opacity: 0.92,
      }));
    silk.position.set(mx, 2.75, rz);
    silk.userData.silkSway = { basePhase: Math.random() * Math.PI * 2, baseY: 2.75, ampY: 0.05 };
    ranfangZone.add(silk);
    swayingSilks.push(silk);
    // 底部加深色镶边
    const trim = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.85, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x2a1a10, side: THREE.DoubleSide }));
    trim.position.set(mx, 1.5, rz + 0.01); ranfangZone.add(trim);
  }
}
window._rfSilks = swayingSilks;

// --- 4 染缸 (前侧, 不同颜色染料) ---
const dyeVats = [
  { dx: -5, dz: 4.8, color: 0xc23a2a, label: '朱' },
  { dx: -1.5, dz: 4.8, color: 0xd4a01e, label: '黄' },
  { dx:  2,   dz: 4.8, color: 0x4670a0, label: '蓝' },
  { dx:  5.5, dz: 4.8, color: 0x6a9c7a, label: '翠' },
];
for (const v of dyeVats) {
  const px = rfCenter.x + v.dx;
  const pz = rfCenter.z + v.dz;
  // 木桶外圈
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.8, 16),
    new THREE.MeshLambertMaterial({ color: 0x6e4222 }));
  barrel.position.set(px, 0.4, pz); barrel.castShadow = true;
  ranfangZone.add(barrel);
  // 桶箍
  for (const yy of [0.15, 0.65]) {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 16),
      new THREE.MeshLambertMaterial({ color: 0x4a2818 }));
    hoop.position.set(px, yy, pz); ranfangZone.add(hoop);
  }
  // 染液 (上表面)
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16),
    new THREE.MeshLambertMaterial({
      color: v.color, emissive: v.color, emissiveIntensity: 0.18,
      transparent: true, opacity: 0.92,
    }));
  liquid.position.set(px, 0.79, pz); ranfangZone.add(liquid);
  // 一段未染丝绸搭在桶沿
  const draped = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xe8e0c8, side: THREE.DoubleSide }));
  draped.position.set(px + 0.5, 0.55, pz + 0.4);
  draped.rotation.x = -0.3; draped.rotation.y = 0.4;
  ranfangZone.add(draped);
  // 染缸侧立小牌 (色名)
  const c = document.createElement('canvas');
  c.width = 80; c.height = 80;
  const cx = c.getContext('2d');
  cx.fillStyle = '#1a0e08'; cx.fillRect(0, 0, 80, 80);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 3; cx.strokeRect(4, 4, 72, 72);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 44px STKaiti, serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(v.label, 40, 44);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(px, 1.0, pz - 0.7); ranfangZone.add(sign);
}

// --- 织台 (后侧靠西边一座) ---
const loom = new THREE.Group();
// 框架
loom.add(box(2.4, 0.1, 1.2, 'wood', 0, 1.0, 0));   // 织面
loom.add(box(0.1, 1.1, 0.1, 'wood', -1.2, 0.55, -0.55));
loom.add(box(0.1, 1.1, 0.1, 'wood',  1.2, 0.55, -0.55));
loom.add(box(0.1, 1.1, 0.1, 'wood', -1.2, 0.55,  0.55));
loom.add(box(0.1, 1.1, 0.1, 'wood',  1.2, 0.55,  0.55));
// 经线 (绿 + 红)
for (let i = 0; i < 6; i++) {
  const yarn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6),
    new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xc23a2a : 0xd4a01e }));
  yarn.position.set(-1.0 + i * 0.4, 1.05, 0); yarn.rotation.x = Math.PI / 2;
  loom.add(yarn);
}
// 半成织品 (色块)
const woven = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6),
  new THREE.MeshLambertMaterial({
    color: 0xb3477e, side: THREE.DoubleSide,
  }));
woven.position.set(0, 1.06, 0.3); woven.rotation.x = -Math.PI / 2;
loom.add(woven);
loom.position.set(rfCenter.x - 5.5, 0, rfCenter.z - 6);
ranfangZone.add(loom);

// --- 石臼 (后侧靠东, 用于碾染料粉) ---
const mortar = new THREE.Group();
const mortarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 16), mats.stone);
mortarBase.position.y = 0.22; mortar.add(mortarBase);
const mortarHole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 16),
  new THREE.MeshLambertMaterial({ color: 0x3a2418 }));
mortarHole.position.y = 0.5; mortar.add(mortarHole);
// 染料粉 (紫色, 红色, 黄色)
const powderColors = [0x6a3884, 0xc23a2a, 0xd4a01e];
for (let i = 0; i < 3; i++) {
  const pow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshLambertMaterial({
      color: powderColors[i], emissive: powderColors[i], emissiveIntensity: 0.12,
    }));
  pow.scale.y = 0.4;
  pow.position.set(-0.18 + i * 0.18, 0.58, 0);
  mortar.add(pow);
}
// 杵 (木棒, 立在臼边)
const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 1.4, 8), mats.wood);
pestle.position.set(0.45, 0.7, 0); pestle.rotation.z = -0.3;
mortar.add(pestle);
mortar.position.set(rfCenter.x + 5.5, 0, rfCenter.z - 5.5);
ranfangZone.add(mortar);

// --- 染坊 NPC ---
// 2 染工 (在染缸边搅拌, pose: bend)
const dyer1 = buildPerson({
  robe: 'silkBlue', cap: 'black', role: 'civilian', pose: 'bend',
});
dyer1.position.set(rfCenter.x - 3.4, 0.25, rfCenter.z + 4.0);
dyer1.rotation.y = 0.2;
dyer1.userData.basePos = dyer1.position.clone();
dyer1.userData.idle = Math.random() * Math.PI;
ranfangZone.add(dyer1);
animatables.push({ type: 'person', obj: dyer1 });

const dyer2 = buildPerson({
  robe: 'white', cap: 'black', role: 'civilian', pose: 'bend',
});
dyer2.position.set(rfCenter.x + 3.6, 0.25, rfCenter.z + 4.0);
dyer2.rotation.y = -0.1;
dyer2.userData.basePos = dyer2.position.clone();
dyer2.userData.idle = Math.random() * Math.PI;
ranfangZone.add(dyer2);
animatables.push({ type: 'person', obj: dyer2 });

// 1 织女 (跪坐在织台前)
const weaver = buildPerson({ role: 'lady', robe: 'silkGreen', pibo: 'silkPink', pose: 'kneel' });
weaver.position.set(rfCenter.x - 5.5, 0.2, rfCenter.z - 4.6);
weaver.rotation.y = 0;
weaver.userData.basePos = weaver.position.clone();
weaver.userData.idle = Math.random() * Math.PI;
ranfangZone.add(weaver);
animatables.push({ type: 'person', obj: weaver });

// 1 晒丝童 (跑动在丝绸阵间, 小步)
const dyeChild = buildPerson({ role: 'child', robe: 'silkPink', scale: 0.62 });
dyeChild.position.set(rfCenter.x + 1.5, 0.2, rfCenter.z - 1.5);
dyeChild.userData.basePos = dyeChild.position.clone();
dyeChild.userData.idle = Math.random() * Math.PI;
ranfangZone.add(dyeChild);
animatables.push({ type: 'person', obj: dyeChild });

// 染坊师傅 (站在染缸阵前侧, 可触发 调色 mini)
const dyeMaster = buildPerson({
  robe: 'silkPurple', cap: 'black', role: 'merchant', tool: 'staff', scale: 1.05,
});
dyeMaster.position.set(rfCenter.x, 0.2, rfCenter.z + 6.4);
dyeMaster.rotation.y = -Math.PI;
dyeMaster.userData.basePos = dyeMaster.position.clone();
dyeMaster.userData.idle = Math.random() * Math.PI;
dyeMaster.userData.npcRole = 'craftsman';
dyeMaster.userData.specialMini = 'dyeMix';
dyeMaster.userData.npcLabel = '染坊师傅';
dyeMaster.userData.specialIntro = '某染坊四代相传。客官可愿与某调一色? 调对了 — 这匹绸子归你。';
ranfangZone.add(dyeMaster);
animatables.push({ type: 'person', obj: dyeMaster });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '染坊师傅', subtitle: '🎨 调色得绸', nameColor: '#b08aff' });
    np.position.set(0, 2.4, 0);
    dyeMaster.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-P: 演武校场 (Military Drill Ground) — 西北 (-32, -28)
 *  视觉强项: 5 排弓箭靶 + 校阅台 (高悬帅旗) + 长枪架 + 骑马武将 + 沙土圈道
 *  色彩: 沙黄/玄铁/朱红靶心/帅旗赤色 — 与文人区/商区形成 "武" 风强对比
 * ============================================================ */
const yanwuZone = new THREE.Group();
scene.add(yanwuZone);
const ywCenter = new THREE.Vector3(-32, 0, -28);
const ywSize = 14;

// 沙土地面 (用 strawHat 暖黄, 区别于周边绿地)
const ywGround = box(ywSize * 1.4, 0.04, ywSize, 'strawHat', ywCenter.x, 0.01, ywCenter.z);
ywGround.receiveShadow = true;
yanwuZone.add(ywGround);
// 外圈深色环 (校阅边界)
for (let i = 0; i < 24; i++) {
  const ang = (i / 24) * Math.PI * 2;
  const rr = ywSize * 0.78;
  const stone = box(0.45, 0.18, 0.45, 'stone',
    ywCenter.x + Math.cos(ang) * rr, 0.09, ywCenter.z + Math.sin(ang) * rr);
  yanwuZone.add(stone);
}

// 5 排弓箭靶 (东侧, 间距 2.6, 朝西)
const ywTargets = [];
for (let i = 0; i < 5; i++) {
  const tx = ywCenter.x + 5.5;
  const tz = ywCenter.z - 5.2 + i * 2.6;
  // 靶基台
  yanwuZone.add(box(0.5, 0.06, 0.5, 'wood', tx, 0.03, tz));
  // 靶杆
  yanwuZone.add(box(0.08, 1.4, 0.08, 'wood', tx, 0.7, tz));
  // 靶面 (3 圈靶: 外白/中蓝/中心红)
  const targetFace = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CircleGeometry(0.50, 18), new THREE.MeshLambertMaterial({ color: 0xf3e5c8 }));
  outer.rotation.y = Math.PI / 2; targetFace.add(outer);
  const mid = new THREE.Mesh(new THREE.CircleGeometry(0.32, 18), new THREE.MeshLambertMaterial({ color: 0x274a78 }));
  mid.rotation.y = Math.PI / 2; mid.position.x = 0.005; targetFace.add(mid);
  const bull = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshLambertMaterial({ color: 0xc23a2a }));
  bull.rotation.y = Math.PI / 2; bull.position.x = 0.01; targetFace.add(bull);
  targetFace.position.set(tx, 1.6, tz);
  yanwuZone.add(targetFace);
  ywTargets.push({ x: tx, z: tz });
}

// 校阅台 (西侧高台, 朱漆木亭 + 4 柱 + 帅旗)
const drillTower = new THREE.Group();
drillTower.add(box(2.8, 0.4, 2.2, 'stone', 0, 0.2, 0));
drillTower.add(box(2.6, 0.18, 2.0, 'wood', 0, 0.49, 0));
for (const [tx, tz] of [[-1.2, -0.95], [1.2, -0.95], [-1.2, 0.95], [1.2, 0.95]]) {
  drillTower.add(box(0.13, 2.1, 0.13, 'vermillion', tx, 1.63, tz));
}
const dtRoof = makeTangRoof(3.2, 2.8, 0.5, 'roof');
dtRoof.position.set(0, 2.85, 0); drillTower.add(dtRoof);
// 帅旗杆 + 帅旗 (大尺寸红旗)
drillTower.add(box(0.06, 2.6, 0.06, 'wood', 1.45, 4.05, 0));
const drillFlagCloth = box(0.04, 1.0, 0.85, 'vermillion', 1.85, 4.45, 0);
drillFlagCloth.userData.isFlag = true;
drillTower.add(drillFlagCloth);
animatables.push({ type: 'flag', obj: drillFlagCloth });
// 牌匾 "演武"
drillTower.add(box(1.6, 0.4, 0.08, 'roofGold', 0, 3.3, 1.05));
drillTower.position.set(ywCenter.x - 5, 0, ywCenter.z);
yanwuZone.add(drillTower);

// 长枪架 (2 组, 西北角)
for (let r = 0; r < 2; r++) {
  const rackX = ywCenter.x - 2.2 + r * 1.4;
  const rackZ = ywCenter.z + 5.2;
  yanwuZone.add(box(1.5, 0.06, 0.06, 'wood', rackX, 1.05, rackZ));
  yanwuZone.add(box(0.06, 1.1, 0.06, 'wood', rackX - 0.65, 0.55, rackZ));
  yanwuZone.add(box(0.06, 1.1, 0.06, 'wood', rackX + 0.65, 0.55, rackZ));
  for (let i = 0; i < 5; i++) {
    const spear = box(0.04, 2.1, 0.04, 'wood', rackX - 0.55 + i * 0.28, 1.0, rackZ);
    spear.rotation.x = -0.15;
    // 枪尖
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), mats.iron);
    tip.position.set(rackX - 0.55 + i * 0.28, 2.15, rackZ - 0.15);
    yanwuZone.add(spear);
    yanwuZone.add(tip);
  }
}

// 木栅 (北边一段, 校场内场屏障)
for (let i = 0; i < 5; i++) {
  yanwuZone.add(box(0.06, 0.9, 0.06, 'wood', ywCenter.x - 5 + i * 2, 0.45, ywCenter.z - 7));
}
yanwuZone.add(box(8, 0.06, 0.06, 'wood', ywCenter.x - 1, 0.9, ywCenter.z - 7));

// NPC: 3 弓箭手 (东向射靶, 持弓姿态)
[[-2.5, -3], [-2.5, -1], [-2.5, 1]].forEach(([dx, dz], idx) => {
  const archer = buildPerson({ role: 'soldier', robe: 'vermillion', hat: 'iron', armor: true });
  archer.position.set(ywCenter.x + dx, 0.2, ywCenter.z + dz);
  archer.rotation.y = Math.PI / 2;
  archer.userData.basePos = archer.position.clone();
  archer.userData.idle = Math.random() * Math.PI + idx * 0.7;
  archer.userData.npcRole = 'soldier';
  // 弓 (半 torus, 横挂胸前)
  const bowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.025, 4, 14, Math.PI * 1.05),
    mats.wood
  );
  bowRing.position.set(0.42, 1.3, 0);
  bowRing.rotation.x = Math.PI / 2;
  bowRing.rotation.y = -Math.PI / 2;
  archer.add(bowRing);
  // 弓弦
  const bowString = box(0.005, 0.62, 0.005, 'white', 0.42, 1.3, 0);
  archer.add(bowString);
  yanwuZone.add(archer);
  animatables.push({ type: 'person', obj: archer });
});

// NPC: 2 长枪兵 (校阅台两翼, 持戟)
[[-4.5, -2.5], [-4.5, 2.5]].forEach(([dx, dz]) => {
  const sp = buildPerson({ role: 'soldier', robe: 'vermillion', hat: 'iron', tool: 'halberd', armor: true });
  sp.position.set(ywCenter.x + dx, 0.2, ywCenter.z + dz);
  sp.rotation.y = 0;
  yanwuZone.add(sp);
});

// NPC: 骑马武将 (校阅台东南, 黑马 + 金甲)
const generalHorse = makeHorse('horseBlack');
generalHorse.position.set(ywCenter.x - 6.5, 0, ywCenter.z + 3.5);
generalHorse.rotation.y = Math.PI / 2;
yanwuZone.add(generalHorse);
const general = buildPerson({ role: 'soldier', robe: 'gold', hat: 'iron', armor: true, tool: 'halberd' });
general.position.set(ywCenter.x - 6.5, 0.95, ywCenter.z + 3.5);
general.rotation.y = Math.PI / 2;
general.userData.npcRole = 'soldier';
yanwuZone.add(general);

// 互动 NPC: 校尉教头 (校阅台前缘, 朝东监督射手)
const drillMaster = buildPerson({
  role: 'soldier', robe: 'silkPurple', hat: 'iron', armor: true, tool: 'halberd', scale: 1.05,
});
drillMaster.position.set(ywCenter.x - 1.5, 0.2, ywCenter.z + 0.5);
drillMaster.rotation.y = Math.PI / 2;
drillMaster.userData.basePos = drillMaster.position.clone();
drillMaster.userData.idle = Math.random() * Math.PI;
drillMaster.userData.npcRole = 'general';
drillMaster.userData.specialMini = 'archery';
drillMaster.userData.npcLabel = '校尉教头';
drillMaster.userData.specialIntro = '吾乃左金吾卫校尉。校场之上, 三矢中靶, 中心者赏帛。郎君, 可愿试一试?';
yanwuZone.add(drillMaster);
animatables.push({ type: 'person', obj: drillMaster });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '校尉教头', subtitle: '🏹 射艺得帛', nameColor: '#ffb466' });
    np.position.set(0, 2.4, 0);
    drillMaster.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-Q: 国子监 太学 (Imperial Academy) — 中北偏东 (15, -32)
 *  视觉强项: 大成殿 + 碑林 (12 经石碑两列) + 4 学子读书阵 + "国子监" 牌坊
 *  色彩: 青瓦白墙/金匾/朱漆柱 — 庄严古朴, 与商区/军区的喧闹形成 "文" 风强对比
 * ============================================================ */
const guozijianZone = new THREE.Group();
scene.add(guozijianZone);
const gzCenter = new THREE.Vector3(15, 0, -32);

// 院基 (青石板)
const gzFloor = box(14, 0.05, 11, 'stone', gzCenter.x, 0.025, gzCenter.z);
gzFloor.receiveShadow = true;
guozijianZone.add(gzFloor);

// 大成殿 (北侧, 朱柱 + 青瓦 + 金匾)
const dachengHall = new THREE.Group();
// 基座
dachengHall.add(box(7, 0.4, 4, 'stone', 0, 0.2, 0));
// 4 朱柱
for (const [tx, tz] of [[-2.8, -1.6], [2.8, -1.6], [-2.8, 1.6], [2.8, 1.6]]) {
  dachengHall.add(box(0.25, 2.6, 0.25, 'vermillion', tx, 1.7, tz));
}
// 墙 (后/侧)
dachengHall.add(box(6.4, 2.2, 0.18, 'white', 0, 1.5, -1.95));
dachengHall.add(box(0.18, 2.2, 3.2, 'white', -3.2, 1.5, 0));
dachengHall.add(box(0.18, 2.2, 3.2, 'white', 3.2, 1.5, 0));
// 屋顶
const dcRoof = makeTangRoof(7.6, 4.4, 0.65, 'roof');
dcRoof.position.set(0, 3.3, 0); dachengHall.add(dcRoof);
// 金匾 "大成殿"
const dcPlaque = box(2.4, 0.55, 0.08, 'roofGold', 0, 2.85, 1.7);
dachengHall.add(dcPlaque);
// 殿内 孔子像 (简化 — 高石像 + 金冠)
const kongStatue = new THREE.Group();
kongStatue.add(box(1.0, 1.6, 0.5, 'stone', 0, 0.8, 0));     // 身
const kongHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), mats.stone);
kongHead.position.y = 1.8; kongStatue.add(kongHead);
const kongCap = cyl(0.28, 0.18, 'gold', 10);
kongCap.position.y = 2.13; kongStatue.add(kongCap);
kongStatue.position.set(0, 0.4, -0.8);
dachengHall.add(kongStatue);
dachengHall.position.set(gzCenter.x, 0, gzCenter.z - 3);
guozijianZone.add(dachengHall);

// 碑林 (12 石碑, 两列 6 排)
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 2; c++) {
    const stx = gzCenter.x - 3.6 + c * 7.2;
    const stz = gzCenter.z + 0.6 + r * 0.7;
    // 碑基
    guozijianZone.add(box(0.6, 0.12, 0.4, 'stone', stx, 0.06, stz));
    // 碑体
    const stele = box(0.5, 1.4, 0.18, 'stone', stx, 0.82, stz);
    // 碑面深一点 (刻字阴影)
    stele.material = new THREE.MeshLambertMaterial({ color: 0x6e6a60 });
    guozijianZone.add(stele);
    // 碑首 (圆顶帽)
    const steleHead = cyl(0.22, 0.10, 'stone', 10);
    steleHead.position.set(stx, 1.62, stz);
    steleHead.rotation.x = Math.PI / 2;
    guozijianZone.add(steleHead);
  }
}

// 4 学子座 (大成殿前广场, 4 张矮几 + 蒲团)
const studentSpots = [
  [-3.0, 4.0], [-1.0, 4.0], [1.0, 4.0], [3.0, 4.0],
];
studentSpots.forEach(([dx, dz]) => {
  const sx = gzCenter.x + dx;
  const sz = gzCenter.z + dz;
  // 矮几
  guozijianZone.add(box(0.65, 0.06, 0.4, 'wood', sx, 0.35, sz));
  // 几腿
  for (const [lx, lz] of [[-0.25, -0.15], [0.25, -0.15], [-0.25, 0.15], [0.25, 0.15]]) {
    guozijianZone.add(box(0.04, 0.32, 0.04, 'wood', sx + lx, 0.16, sz + lz));
  }
  // 几上书卷 (横置)
  const scrollOnDesk = cyl(0.04, 0.32, 'woodLight', 8);
  scrollOnDesk.rotation.z = Math.PI / 2;
  scrollOnDesk.position.set(sx, 0.42, sz);
  guozijianZone.add(scrollOnDesk);
  // 蒲团
  const cushion = cyl(0.22, 0.10, 'silkGold', 10);
  cushion.position.set(sx, 0.05, sz + 0.5);
  guozijianZone.add(cushion);
  // 学子 (跪坐姿)
  const student = buildPerson({ role: 'scholar', robe: 'silkBlue', hat: 'scholar', tool: 'scroll', pose: 'kneel' });
  student.position.set(sx, 0.05, sz + 0.5);
  student.rotation.y = Math.PI;  // 朝大成殿
  student.userData.basePos = student.position.clone();
  student.userData.idle = Math.random() * Math.PI;
  student.userData.npcRole = 'scholar';
  guozijianZone.add(student);
  animatables.push({ type: 'person', obj: student });
});

// 监丞 (走动巡视, 拿戒尺 — 用 staff 代)
const supervisor = buildPerson({ role: 'scholar', robe: 'silkPurple', cap: 'black', tool: 'staff' });
supervisor.position.set(gzCenter.x + 4.5, 0.2, gzCenter.z + 4.5);
supervisor.rotation.y = -Math.PI / 2;
supervisor.userData.basePos = supervisor.position.clone();
supervisor.userData.idle = Math.random() * Math.PI;
supervisor.userData.npcRole = 'official';
guozijianZone.add(supervisor);
animatables.push({ type: 'person', obj: supervisor });

// 牌坊 (南侧入口, "国子监" 横额)
const gzArch = new THREE.Group();
gzArch.add(box(0.32, 4.5, 0.32, 'vermillion', -2.2, 2.25, 0));
gzArch.add(box(0.32, 4.5, 0.32, 'vermillion', 2.2, 2.25, 0));
gzArch.add(box(5.0, 0.5, 0.4, 'roof', 0, 4.55, 0));
gzArch.add(box(4.0, 0.55, 0.10, 'roofGold', 0, 4.2, 0.21));   // 金匾
const gzArchRoof = makeTangRoof(5.6, 1.0, 0.4, 'roofDark');
gzArchRoof.position.set(0, 5.05, 0); gzArch.add(gzArchRoof);
gzArch.position.set(gzCenter.x, 0, gzCenter.z + 5.3);
guozijianZone.add(gzArch);

// 互动 NPC: 大儒 (站在大成殿前, 朝南面对学子)
const greatScholar = buildPerson({
  role: 'scholar', robe: 'silkPurple', hat: 'scholar', tool: 'scroll', scale: 1.08,
});
greatScholar.position.set(gzCenter.x, 0.2, gzCenter.z + 1.2);
greatScholar.rotation.y = 0;
greatScholar.userData.basePos = greatScholar.position.clone();
greatScholar.userData.idle = Math.random() * Math.PI;
greatScholar.userData.npcRole = 'official';
greatScholar.userData.specialMini = 'classics';
greatScholar.userData.npcLabel = '太学大儒';
greatScholar.userData.specialIntro = '某虚膺国子监博士。郎君可愿与某论《诗》解《论语》? 三句之中, 接对者赠书一卷。';
guozijianZone.add(greatScholar);
animatables.push({ type: 'person', obj: greatScholar });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '太学大儒', subtitle: '📚 经义得书', nameColor: '#8ec0ff' });
    np.position.set(0, 2.5, 0);
    greatScholar.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-R: 马球场 (Polo Field / 击鞠) — 东北 (50, -25)
 *  视觉强项: 椭圆绿茵场 + 双木球门 + 看台 + 4 马奔驰 (左右队对抗)
 *  色彩: 嫩绿草坪/朱红队旗/翠绿队旗/木栏 — 与商区拥挤形成 "运动" 开阔感
 * ============================================================ */
const maqiuZone = new THREE.Group();
scene.add(maqiuZone);
const mqCenter = new THREE.Vector3(50, 0, -25);

// 椭圆场地 (草坪, 较亮一档区分四周)
const mqField = new THREE.Mesh(
  new THREE.CylinderGeometry(8.5, 8.5, 0.05, 32),
  new THREE.MeshLambertMaterial({ color: 0x86a050 })
);
mqField.scale.set(1.5, 1, 1);  // 拉成椭圆
mqField.position.set(mqCenter.x, 0.025, mqCenter.z);
mqField.receiveShadow = true;
maqiuZone.add(mqField);

// 球门 × 2 (东西两端, 木框 + 红绳网)
function makePoloGoal(color) {
  const g = new THREE.Group();
  g.add(box(0.18, 2.6, 0.18, 'wood', -1.0, 1.3, 0));
  g.add(box(0.18, 2.6, 0.18, 'wood', 1.0, 1.3, 0));
  g.add(box(2.2, 0.18, 0.18, 'wood', 0, 2.6, 0));
  // 网 (5 根斜线)
  for (let i = 0; i < 5; i++) {
    const wire = box(0.04, 0.04, 0.7, color, -0.8 + i * 0.4, 1.6, -0.35);
    wire.rotation.x = -0.4;
    g.add(wire);
  }
  // 队旗
  g.add(box(0.06, 0.8, 0.06, 'wood', 1.0, 3.3, 0));
  const flag = box(0.04, 0.5, 0.4, color, 1.25, 3.45, 0);
  flag.userData.isFlag = true;
  g.add(flag);
  animatables.push({ type: 'flag', obj: flag });
  return g;
}
const goalEast = makePoloGoal('vermillion');
goalEast.position.set(mqCenter.x + 12, 0, mqCenter.z);
goalEast.rotation.y = -Math.PI / 2;
maqiuZone.add(goalEast);
const goalWest = makePoloGoal('silkGreen');
goalWest.position.set(mqCenter.x - 12, 0, mqCenter.z);
goalWest.rotation.y = Math.PI / 2;
maqiuZone.add(goalWest);

// 看台 (北侧, 木台 + 木栏)
const standZone = new THREE.Group();
standZone.add(box(10, 0.4, 1.6, 'wood', 0, 0.2, 0));
for (let i = 0; i < 6; i++) {
  standZone.add(box(0.10, 0.7, 0.10, 'wood', -4.6 + i * 1.84, 0.75, -0.7));
}
standZone.add(box(10, 0.06, 0.06, 'wood', 0, 1.10, -0.7));
// 看台顶遮阳布
standZone.add(box(10, 0.05, 1.5, 'silkGold', 0, 2.2, 0));
standZone.add(box(0.10, 2.0, 0.10, 'wood', -4.6, 1.2, -0.7));
standZone.add(box(0.10, 2.0, 0.10, 'wood', 4.6, 1.2, -0.7));
standZone.position.set(mqCenter.x, 0, mqCenter.z - 7);
maqiuZone.add(standZone);

// 看台上 2 仕女 (坐姿, 用 kneel pose 替代)
[[-2.2, -0.2], [1.8, -0.2]].forEach(([dx, dz]) => {
  const lady = buildPerson({ role: 'lady', robe: dx < 0 ? 'silkPink' : 'silkGold', pose: 'kneel', scale: 0.92 });
  lady.position.set(mqCenter.x + dx, 0.42, mqCenter.z - 7 + dz);
  lady.rotation.y = 0;
  lady.userData.basePos = lady.position.clone();
  lady.userData.idle = Math.random() * Math.PI;
  lady.userData.npcRole = 'lady';
  maqiuZone.add(lady);
  animatables.push({ type: 'person', obj: lady });
});
// 看台中央 老者观赛
const standElder = buildPerson({ role: 'scholar', robe: 'silkPurple', hat: 'scholar', tool: 'scroll' });
standElder.position.set(mqCenter.x - 0.2, 0.42, mqCenter.z - 7 - 0.2);
standElder.rotation.y = 0;
standElder.userData.basePos = standElder.position.clone();
standElder.userData.idle = Math.random() * Math.PI;
standElder.userData.npcRole = 'elder';
maqiuZone.add(standElder);
animatables.push({ type: 'person', obj: standElder });

// 4 马球手 (2 队, 各 2 人, 骑马持杖)
const poloPlayers = [
  { dx: -6, dz: -1.5, team: 'vermillion', dir:  Math.PI / 2 },
  { dx: -3, dz:  1.5, team: 'vermillion', dir:  Math.PI / 2.5 },
  { dx:  3, dz: -1.5, team: 'silkGreen',  dir: -Math.PI / 2 },
  { dx:  6, dz:  1.5, team: 'silkGreen',  dir: -Math.PI / 2.5 },
];
poloPlayers.forEach(p => {
  // 马
  const horse = makeHorse(p.team === 'vermillion' ? 'horseBay' : 'horseWhite');
  horse.position.set(mqCenter.x + p.dx, 0, mqCenter.z + p.dz);
  horse.rotation.y = p.dir;
  maqiuZone.add(horse);
  // 骑手 (持球杖 = staff)
  const rider = buildPerson({
    role: 'soldier', robe: p.team, hat: 'scholar', armor: false, tool: 'staff', scale: 0.95,
  });
  rider.position.set(mqCenter.x + p.dx, 0.95, mqCenter.z + p.dz);
  rider.rotation.y = p.dir;
  rider.userData.npcRole = 'soldier';
  maqiuZone.add(rider);
});

// 球场中央木球 (亮色)
const poloBall = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 12, 8),
  new THREE.MeshLambertMaterial({ color: 0xf0e8c0 })
);
poloBall.position.set(mqCenter.x + 0.5, 0.18, mqCenter.z - 0.3);
poloBall.castShadow = true;
maqiuZone.add(poloBall);

// 司礼 (场边裁判, 站立观察)
const refStandPos = new THREE.Vector3(mqCenter.x, 0.2, mqCenter.z + 8);
const referee = buildPerson({ role: 'scholar', robe: 'silkBlue', cap: 'black', tool: 'scroll' });
referee.position.copy(refStandPos);
referee.rotation.y = Math.PI;
referee.userData.basePos = referee.position.clone();
referee.userData.idle = Math.random() * Math.PI;
referee.userData.npcRole = 'official';
maqiuZone.add(referee);
animatables.push({ type: 'person', obj: referee });

// 互动 NPC: 球场司礼官 (站场南边, 持卷宗)
const poloMaster = buildPerson({
  role: 'scholar', robe: 'silkGold', hat: 'scholar', cap: 'black', tool: 'scroll', scale: 1.05,
});
poloMaster.position.set(mqCenter.x + 2, 0.2, mqCenter.z + 8.2);
poloMaster.rotation.y = Math.PI;
poloMaster.userData.basePos = poloMaster.position.clone();
poloMaster.userData.idle = Math.random() * Math.PI;
poloMaster.userData.npcRole = 'official';
poloMaster.userData.specialMini = 'polo';
poloMaster.userData.npcLabel = '司礼官';
poloMaster.userData.specialIntro = '今日东西两队角艺。郎君若愿击鞠 — 我借你一马, 一矢入门便分彩头。';
maqiuZone.add(poloMaster);
animatables.push({ type: 'person', obj: poloMaster });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '司礼官', subtitle: '🐎 击鞠取胜', nameColor: '#f5d870' });
    np.position.set(0, 2.5, 0);
    poloMaster.add(np);
  } catch (e) {}
}

// 场北边小棚 (备马 + 马槽)
const stable = new THREE.Group();
stable.add(box(3.0, 0.06, 1.2, 'wood', 0, 0.03, 0));
for (const [px, pz] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) {
  stable.add(box(0.12, 1.6, 0.12, 'wood', px, 0.8, pz));
}
stable.add(box(3.2, 0.08, 1.4, 'roof', 0, 1.65, 0));
// 马槽
stable.add(box(2.0, 0.18, 0.4, 'wood', 0, 0.18, 0.4));
stable.position.set(mqCenter.x + 13, 0, mqCenter.z - 8);
maqiuZone.add(stable);
// 备用马
const sparHorse = makeHorse('horseBay');
sparHorse.position.set(mqCenter.x + 13, 0, mqCenter.z - 7);
sparHorse.rotation.y = -Math.PI / 2;
maqiuZone.add(sparHorse);


/* ============================================================
 *  ZONE-S: 玄都观 (Daoist Temple) — 南远端 (-15, 55)
 *  视觉强项: 八卦亭 + 太极石地 + 老君像 + 3 道士打坐 + 香炉烟柱
 *  色彩: 灰白石/玄黑卦/檀香烟/淡金道袍 — 与城区喧闹形成 "玄" 风强对比
 * ============================================================ */
const daoguanZone = new THREE.Group();
scene.add(daoguanZone);
const dgCenter = new THREE.Vector3(-15, 0, 55);

// 太极八卦地 (圆形石坪)
const dgFloor = new THREE.Mesh(
  new THREE.CylinderGeometry(6.0, 6.0, 0.05, 48),
  mats.stone
);
dgFloor.position.set(dgCenter.x, 0.025, dgCenter.z);
dgFloor.receiveShadow = true;
daoguanZone.add(dgFloor);
// 太极图 — 半黑半白圆 (用 2 个半月几何)
const taijiDark = new THREE.Mesh(
  new THREE.CircleGeometry(3.5, 24, 0, Math.PI),
  new THREE.MeshLambertMaterial({ color: 0x1a1612 })
);
taijiDark.rotation.x = -Math.PI / 2;
taijiDark.position.set(dgCenter.x, 0.055, dgCenter.z);
daoguanZone.add(taijiDark);
const taijiLight = new THREE.Mesh(
  new THREE.CircleGeometry(3.5, 24, Math.PI, Math.PI),
  new THREE.MeshLambertMaterial({ color: 0xe8e0c8 })
);
taijiLight.rotation.x = -Math.PI / 2;
taijiLight.position.set(dgCenter.x, 0.055, dgCenter.z);
daoguanZone.add(taijiLight);
// 太极眼 (大圆中嵌 2 小圆)
const eyeBlackOnLight = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 16),
  new THREE.MeshLambertMaterial({ color: 0x1a1612 })
);
eyeBlackOnLight.rotation.x = -Math.PI / 2;
eyeBlackOnLight.position.set(dgCenter.x, 0.058, dgCenter.z + 1.4);
daoguanZone.add(eyeBlackOnLight);
const eyeLightOnBlack = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 16),
  new THREE.MeshLambertMaterial({ color: 0xe8e0c8 })
);
eyeLightOnBlack.rotation.x = -Math.PI / 2;
eyeLightOnBlack.position.set(dgCenter.x, 0.058, dgCenter.z - 1.4);
daoguanZone.add(eyeLightOnBlack);

// 八卦亭 (8 柱 + 八角顶, 北侧)
const bagua = new THREE.Group();
const baguaRing = 3.0;
for (let i = 0; i < 8; i++) {
  const ang = (i / 8) * Math.PI * 2;
  bagua.add(box(0.18, 3.0, 0.18, 'wood',
    Math.cos(ang) * baguaRing, 1.5, Math.sin(ang) * baguaRing));
}
// 八角顶 (用 ConeGeometry 8 段)
const baguaRoof = new THREE.Mesh(
  new THREE.ConeGeometry(baguaRing + 0.5, 1.2, 8),
  mats.roof
);
baguaRoof.position.y = 3.6;
baguaRoof.castShadow = true;
bagua.add(baguaRoof);
// 顶端宝珠
const baguaPearl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.gold);
baguaPearl.position.y = 4.3; bagua.add(baguaPearl);
bagua.position.set(dgCenter.x, 0, dgCenter.z - 7.5);
daoguanZone.add(bagua);

// 八卦亭内 老君像 (中央, 高石像)
const laojun = new THREE.Group();
laojun.add(box(0.9, 2.0, 0.5, 'stone', 0, 1.0, 0));
const laojunHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mats.stone);
laojunHead.position.y = 2.2; laojun.add(laojunHead);
// 道冠
const laojunCap = cyl(0.20, 0.16, 'gold', 8);
laojunCap.position.y = 2.5; laojun.add(laojunCap);
// 拂尘
laojun.add(box(0.05, 0.7, 0.05, 'wood', 0.42, 1.2, 0));
laojun.add(box(0.10, 0.16, 0.10, 'white', 0.42, 0.85, 0));
laojun.position.set(dgCenter.x, 0, dgCenter.z - 7.5);
daoguanZone.add(laojun);

// 香炉 (太极图前)
const dgIncense = new THREE.Group();
dgIncense.add(box(1.4, 0.4, 1.4, 'stone', 0, 0.2, 0));
dgIncense.add(cyl(0.55, 0.8, 'iron', 8));
dgIncense.children[1].position.y = 0.8;
dgIncense.add(cyl(0.62, 0.10, 'gold', 8));
dgIncense.children[2].position.y = 1.25;
// 3 支香
for (let i = 0; i < 3; i++) {
  dgIncense.add(box(0.035, 0.5, 0.035, 'wood', -0.10 + i * 0.10, 1.55, 0));
  const sm = box(0.16 + i * 0.04, 0.32, 0.16 + i * 0.04, 'smoke', -0.10 + i * 0.10, 2.0 + i * 0.3, 0);
  sm.material = mats.smoke.clone();
  sm.material.opacity = 0.3 - i * 0.06;
  dgIncense.add(sm);
}
dgIncense.position.set(dgCenter.x, 0, dgCenter.z + 5.5);
dgIncense.userData.isSmoke = true;
daoguanZone.add(dgIncense);
animatables.push({ type: 'smoke', obj: dgIncense });

// 3 道士打坐 (太极图周围, kneel pose)
const daoists = [
  { dx: -3.6, dz:  0,    robe: 'silkBlue' },
  { dx:  3.6, dz:  0,    robe: 'silkPurple' },
  { dx:  0,   dz:  4.5,  robe: 'silkGreen' },
];
daoists.forEach(d => {
  const dao = buildPerson({ role: 'scholar', robe: d.robe, hat: 'scholar', pose: 'kneel', scale: 0.96 });
  dao.position.set(dgCenter.x + d.dx, 0.05, dgCenter.z + d.dz);
  dao.rotation.y = Math.atan2(-d.dx, -d.dz);  // 朝太极图中心
  dao.userData.basePos = dao.position.clone();
  dao.userData.idle = Math.random() * Math.PI;
  dao.userData.npcRole = 'daoist';
  daoguanZone.add(dao);
  animatables.push({ type: 'person', obj: dao });
});

// 围栏柏树 (4 株)
for (const [tx, tz] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) {
  const trunk = box(0.18, 1.6, 0.18, 'wood', dgCenter.x + tx, 0.8, dgCenter.z + tz);
  daoguanZone.add(trunk);
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 6), mats.willowDark);
  foliage.position.set(dgCenter.x + tx, 2.5, dgCenter.z + tz); foliage.castShadow = true;
  daoguanZone.add(foliage);
}

// 入口牌坊 (南侧, "玄都观" 横额)
const dgArch = new THREE.Group();
dgArch.add(box(0.28, 4.2, 0.28, 'wood', -2.0, 2.1, 0));
dgArch.add(box(0.28, 4.2, 0.28, 'wood', 2.0, 2.1, 0));
dgArch.add(box(4.6, 0.5, 0.35, 'roofDark', 0, 4.3, 0));
dgArch.add(box(3.6, 0.45, 0.10, 'gold', 0, 4.0, 0.20));  // 金匾
const dgArchRoof = makeTangRoof(5.2, 0.95, 0.35, 'roofDark');
dgArchRoof.position.set(0, 4.78, 0); dgArch.add(dgArchRoof);
dgArch.position.set(dgCenter.x, 0, dgCenter.z + 7.5);
daoguanZone.add(dgArch);

// 互动 NPC: 老道 (太极图东侧, 持拂尘 = staff)
const oldDao = buildPerson({
  role: 'scholar', robe: 'silkGold', hat: 'scholar', tool: 'staff', scale: 1.10,
});
oldDao.position.set(dgCenter.x + 1.5, 0.2, dgCenter.z + 3.2);
oldDao.rotation.y = -Math.PI / 2;
oldDao.userData.basePos = oldDao.position.clone();
oldDao.userData.idle = Math.random() * Math.PI;
oldDao.userData.npcRole = 'daoist';
oldDao.userData.specialMini = 'fortune';
oldDao.userData.npcLabel = '玄都老道';
oldDao.userData.specialIntro = '上清紫微宫主, 贫道在此设有签筒。来者皆有缘, 摇一签 — 上上至下下, 各有定数。';
daoguanZone.add(oldDao);
animatables.push({ type: 'person', obj: oldDao });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '玄都老道', subtitle: '🎴 抽签问运', nameColor: '#d8b8ff' });
    np.position.set(0, 2.5, 0);
    oldDao.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ROUND 4 · 拓展疆土 — 鸿胪寺 / 西明胡寺 / 太医署 / 司天监
 * ============================================================ */


/* ============================================================
 *  ZONE-T: 鸿胪寺 通译馆 (Foreign Embassy Court) — 远东 (52, 12)
 *  视觉强项: 朱红院墙 + 5 国使节 (吐蕃/新罗/日本/大食/波斯) + 通事 + 贡品架
 *  色彩: 朱红墙/金匾/各国服饰多彩 — 体现 "万国来朝" 的盛唐气象
 * ============================================================ */
const honglusiZone = new THREE.Group();
scene.add(honglusiZone);
const hlCenter = new THREE.Vector3(52, 0, 12);

// 院落 石砖地
const hlFloor = new THREE.Mesh(
  new THREE.BoxGeometry(18, 0.05, 14),
  mats.stone
);
hlFloor.position.set(hlCenter.x, 0.025, hlCenter.z);
hlFloor.receiveShadow = true;
honglusiZone.add(hlFloor);

// 朱红院墙 (三面: 东/北/西, 南敞开)
{
  const wallH = 2.4;
  // 北墙
  honglusiZone.add(box(18, wallH, 0.4, 'vermilion', hlCenter.x, wallH / 2, hlCenter.z - 7));
  honglusiZone.add(box(18.2, 0.5, 0.5, 'roofDark', hlCenter.x, wallH + 0.2, hlCenter.z - 7));  // 顶瓦
  // 东墙
  honglusiZone.add(box(0.4, wallH, 14, 'vermilion', hlCenter.x + 9, wallH / 2, hlCenter.z));
  honglusiZone.add(box(0.5, 0.5, 14, 'roofDark', hlCenter.x + 9, wallH + 0.2, hlCenter.z));
  // 西墙
  honglusiZone.add(box(0.4, wallH, 14, 'vermilion', hlCenter.x - 9, wallH / 2, hlCenter.z));
  honglusiZone.add(box(0.5, 0.5, 14, 'roofDark', hlCenter.x - 9, wallH + 0.2, hlCenter.z));
}

// 南门 牌坊 ("鸿胪寺")
const hlArch = new THREE.Group();
hlArch.add(box(0.32, 4.5, 0.32, 'wood', -3.2, 2.25, 0));
hlArch.add(box(0.32, 4.5, 0.32, 'wood', 3.2, 2.25, 0));
hlArch.add(box(7.2, 0.5, 0.4, 'roofDark', 0, 4.6, 0));
hlArch.add(box(5.6, 0.5, 0.12, 'gold', 0, 4.3, 0.22));  // 金匾
const hlArchRoof = makeTangRoof(7.6, 1.05, 0.4, 'roofDark');
hlArchRoof.position.set(0, 5.1, 0); hlArch.add(hlArchRoof);
// 门钉
for (let i = -2; i <= 2; i++) {
  hlArch.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    mats.gold
  )).position.set(i * 0.7, 4.3, 0.27);
}
hlArch.position.set(hlCenter.x, 0, hlCenter.z + 7);
honglusiZone.add(hlArch);

// 通译厅 (北侧主殿 简化)
{
  const hall = new THREE.Group();
  hall.add(box(8, 0.25, 5, 'stone', 0, 0.125, 0));    // 月台
  // 4 朱柱
  for (const [px, pz] of [[-3.4, -2.2], [-1.1, -2.2], [1.1, -2.2], [3.4, -2.2]]) {
    hall.add(box(0.32, 3.4, 0.32, 'vermilion', px, 1.7, pz));
  }
  // 白墙
  hall.add(box(7.5, 2.6, 0.18, 'white', 0, 1.55, -2.8));
  // 唐顶
  const hallRoof = makeTangRoof(9, 1.5, 5.6, 'roofDark');
  hallRoof.position.set(0, 3.7, -2.2); hall.add(hallRoof);
  // 金匾 "通译"
  hall.add(box(2.5, 0.4, 0.06, 'gold', 0, 3.3, -2.0));
  hall.position.set(hlCenter.x, 0, hlCenter.z - 4);
  honglusiZone.add(hall);
}

// 贡品架 (西侧, 摆 6 类异域贡品)
{
  const rack = new THREE.Group();
  rack.add(box(0.18, 1.4, 4.0, 'wood', 0, 0.7, 0));      // 立柱后板
  rack.add(box(2.0, 0.10, 4.0, 'wood', 0.9, 1.4, 0));    // 顶板
  // 3 层架板
  for (let i = 0; i < 3; i++) {
    rack.add(box(2.0, 0.06, 4.0, 'wood', 0.9, 0.45 + i * 0.45, 0));
  }
  // 6 件贡品 (3 层 x 2 个)
  const tributes = [
    { color: 'gold',      shape: 'box',  size: [0.4, 0.5, 0.4], desc: '吐蕃金器' },
    { color: 'silkPurple', shape: 'sphere', size: [0.22], desc: '大食琉璃球' },
    { color: 'silkBlue',  shape: 'box',  size: [0.55, 0.18, 0.35], desc: '日本漆器' },
    { color: 'silkRed',   shape: 'sphere', size: [0.18], desc: '波斯红宝石' },
    { color: 'white',     shape: 'box',  size: [0.30, 0.40, 0.30], desc: '新罗白瓷' },
    { color: 'jade',      shape: 'sphere', size: [0.20], desc: '于阗玉璧' },
  ];
  for (let i = 0; i < 6; i++) {
    const t = tributes[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    let m;
    if (t.shape === 'sphere') {
      m = new THREE.Mesh(new THREE.SphereGeometry(t.size[0], 10, 8), mats[t.color]);
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(...t.size), mats[t.color]);
    }
    m.position.set(0.9, 0.85 + row * 0.45, -1.4 + col * 2.6);
    m.castShadow = true;
    rack.add(m);
  }
  rack.position.set(hlCenter.x - 7.5, 0, hlCenter.z + 0.5);
  rack.rotation.y = Math.PI / 2;
  honglusiZone.add(rack);
}

// 5 国使节 (各按距离围绕院落 中心)
{
  const envoys = [
    // 吐蕃 (北山民, 毛裘大衣)
    { dx: -4.0, dz: -1.0, robe: 'horseBay',  hat: 'xnFur',    label: '吐蕃使', sub: '🏔 雪域来使' },
    // 新罗 (儒服, 高冠)
    { dx: -1.8, dz:  1.2, robe: 'silkBlue',  hat: 'scholar',  label: '新罗使', sub: '🌅 海东之邦' },
    // 日本 (白衣紫边)
    { dx:  0.6, dz:  1.6, robe: 'white',     hat: 'scholar',  label: '日本使', sub: '⛩ 日出之国' },
    // 大食 (头巾 长袍)
    { dx:  2.8, dz:  0.8, robe: 'silkGold',  hat: 'turban',   label: '大食使', sub: '🐪 黑衣大食' },
    // 波斯 (头巾 紫袍)
    { dx:  4.6, dz: -0.8, robe: 'silkPurple',hat: 'turban',   label: '波斯使', sub: '🔥 萨珊遗胄' },
  ];
  envoys.forEach((e, i) => {
    const np = buildPerson({ role: 'scholar', robe: e.robe, hat: e.hat, scale: 1.02 });
    np.position.set(hlCenter.x + e.dx, 0.2, hlCenter.z + e.dz);
    np.rotation.y = Math.atan2(-e.dx, -(e.dz + 4));  // 朝通译厅
    np.userData.basePos = np.position.clone();
    np.userData.idle = Math.random() * Math.PI;
    np.userData.npcRole = 'envoy';
    np.userData.npcLabel = e.label;
    honglusiZone.add(np);
    animatables.push({ type: 'person', obj: np });
  });
}

// 通事 (院中央, 朝向使节, 持 scroll 表案文)
const tongshi = buildPerson({
  role: 'scholar', robe: 'silkGreen', hat: 'scholar', tool: 'scroll', scale: 1.06,
});
tongshi.position.set(hlCenter.x, 0.2, hlCenter.z - 1.5);
tongshi.rotation.y = 0;  // 面向南方使节
tongshi.userData.basePos = tongshi.position.clone();
tongshi.userData.idle = Math.random() * Math.PI;
tongshi.userData.npcRole = 'official';
tongshi.userData.specialMini = 'tongyi';
tongshi.userData.npcLabel = '鸿胪寺卿';
tongshi.userData.specialIntro = '某领鸿胪寺, 掌外宾朝贡。郎君可愿试通译之艺? 五国使节, 五国话, 配对则赠通译牌一枚。';
honglusiZone.add(tongshi);
animatables.push({ type: 'person', obj: tongshi });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '鸿胪寺卿', subtitle: '🌐 通译番邦', nameColor: '#fcd87a' });
    np.position.set(0, 2.5, 0);
    tongshi.add(np);
  } catch (e) {}
}

// 院内 香炉 + 几案
honglusiZone.add(box(1.0, 0.6, 0.6, 'wood', hlCenter.x + 0.2, 0.3, hlCenter.z + 4.5));   // 几案
honglusiZone.add(box(0.18, 0.20, 0.30, 'gold', hlCenter.x + 0.2, 0.7, hlCenter.z + 4.5));// 案上印玺


/* ============================================================
 *  ZONE-U: 西明胡寺 (Foreign Religious Complex) — 西南远端 (-34, 18)
 *  视觉强项: 3 异域祠庙: 祆祠(波斯火坛) / 景教(大秦十字) / 摩尼(日月光殿)
 *  色彩: 朱红+金/白十字/紫蓝光辉 — 大唐多元宗教的开放气象
 * ============================================================ */
const huSiZone = new THREE.Group();
scene.add(huSiZone);
const hsCenter = new THREE.Vector3(-34, 0, 18);

// 共同地基 (大青砖)
const hsFloor = new THREE.Mesh(
  new THREE.BoxGeometry(20, 0.05, 8),
  mats.stone
);
hsFloor.position.set(hsCenter.x, 0.025, hsCenter.z);
hsFloor.receiveShadow = true;
huSiZone.add(hsFloor);

// === 1. 祆祠 (Zoroastrian, 西侧, 火坛永燃) ===
{
  const xian = new THREE.Group();
  // 方形主殿 (波斯风, 黄白条纹)
  xian.add(box(4, 3.2, 4, 'silkGold', 0, 1.6, 0));
  xian.add(box(4.4, 0.4, 4.4, 'silkRed', 0, 3.35, 0));   // 顶
  // 4 角立柱
  for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
    xian.add(box(0.22, 3.6, 0.22, 'silkPurple', px, 1.8, pz));
  }
  // 中央 火坛 (高方台 + 红橘火焰)
  xian.add(box(1.4, 0.8, 1.4, 'stone', 0, 0.4, 0));
  xian.add(cyl(0.55, 0.4, 'iron', 8));
  xian.children[xian.children.length - 1].position.y = 1.0;
  // 3 层燃烧火焰 (Cone + emissive)
  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.42 - i * 0.10, 0.55, 8),
      new THREE.MeshLambertMaterial({
        color: i === 0 ? 0xff6020 : (i === 1 ? 0xffa040 : 0xffe080),
        emissive: i === 0 ? 0xff4010 : (i === 1 ? 0xff8030 : 0xffd060),
        emissiveIntensity: 0.9 - i * 0.1,
        transparent: true,
        opacity: 0.92 - i * 0.12,
      })
    );
    flame.position.y = 1.5 + i * 0.42;
    flame.userData.isFlame = true;
    xian.add(flame);
  }
  // 火光照亮
  const fireLight = new THREE.PointLight(0xff7030, 1.4, 8);
  fireLight.position.y = 2.0;
  xian.add(fireLight);

  // 入口 拱门
  xian.add(box(0.18, 2.6, 1.4, 'silkGold', 0, 1.3, 2.0));
  xian.add(box(2.0, 0.18, 0.5, 'silkGold', 0, 2.5, 2.2));   // 拱门顶
  xian.position.set(hsCenter.x - 7.5, 0, hsCenter.z);
  huSiZone.add(xian);
}

// === 2. 大秦寺 (Nestorian Christian, 中央, 十字) ===
{
  const daqin = new THREE.Group();
  // 长方主殿 (白底高墙)
  daqin.add(box(3.6, 3.6, 5, 'white', 0, 1.8, 0));
  // 双坡顶
  const roof1 = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.2, 5.4),
    mats.roofDark
  );
  roof1.position.set(0, 3.7, 0);
  roof1.rotation.z = 0.18;
  daqin.add(roof1);
  const roof2 = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.2, 5.4),
    mats.roofDark
  );
  roof2.position.set(0, 3.7, 0);
  roof2.rotation.z = -0.18;
  daqin.add(roof2);
  // 顶部 大秦景教十字 (镶莲花 — 唐代特色)
  // 十字竖
  daqin.add(box(0.18, 1.2, 0.18, 'gold', 0, 4.6, 0));
  // 十字横
  daqin.add(box(0.8, 0.18, 0.18, 'gold', 0, 4.8, 0));
  // 十字底座 莲花 (唐代景教十字传统)
  daqin.add(cyl(0.35, 0.20, 'silkPink', 8));
  daqin.children[daqin.children.length - 1].position.y = 4.0;
  // 拱门
  daqin.add(box(0.18, 2.0, 1.2, 'wood', 0, 1.0, 2.5));
  daqin.add(box(1.5, 0.18, 0.4, 'wood', 0, 2.0, 2.6));
  // 圆窗 (玫瑰窗)
  const rose = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x6a90c0, emissive: 0x3050a0, emissiveIntensity: 0.4 })
  );
  rose.position.set(0, 2.5, 2.51);
  daqin.add(rose);
  daqin.position.set(hsCenter.x, 0, hsCenter.z);
  huSiZone.add(daqin);
}

// === 3. 摩尼寺 (Manichean, 东侧, 日月双光) ===
{
  const mani = new THREE.Group();
  // 圆形主殿 (Manichean 圆形殿堂)
  const round = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 2.8, 16),
    mats.silkPurple
  );
  round.position.y = 1.4;
  mani.add(round);
  // 圆顶 (半球)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.silkBlue
  );
  dome.position.y = 2.8;
  mani.add(dome);
  // 顶部 圆球 (日月光)
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xffeb70, emissive: 0xffcc40, emissiveIntensity: 0.85 })
  );
  sun.position.y = 5.4;
  mani.add(sun);
  // 月牙 (旁挂)
  const moon = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.45, 16, 1, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0xe0e8ff, emissive: 0x8090b0, emissiveIntensity: 0.4, side: THREE.DoubleSide })
  );
  moon.position.set(0.6, 5.0, 0); moon.rotation.x = Math.PI / 2;
  mani.add(moon);
  // 入口
  mani.add(box(0.18, 1.8, 1.0, 'silkPurple', 0, 0.9, 2.2));
  // 紫光照亮
  const purpleLight = new THREE.PointLight(0xa080ff, 0.9, 9);
  purpleLight.position.y = 3.5;
  mani.add(purpleLight);
  mani.position.set(hsCenter.x + 7.5, 0, hsCenter.z);
  huSiZone.add(mani);
}

// 3 异域信徒 (各祠 1 人 礼拜)
{
  // 祆教徒 (火坛旁 跪拜)
  const xianBeli = buildPerson({ role: 'scholar', robe: 'silkRed', hat: 'turban', pose: 'kneel', scale: 1.0 });
  xianBeli.position.set(hsCenter.x - 7.5, 0.2, hsCenter.z + 2.5);
  xianBeli.rotation.y = Math.PI;  // 面向火坛
  xianBeli.userData.basePos = xianBeli.position.clone();
  xianBeli.userData.idle = Math.random() * Math.PI;
  xianBeli.userData.npcRole = 'envoy';
  xianBeli.userData.npcLabel = '祆教徒';
  huSiZone.add(xianBeli);
  animatables.push({ type: 'person', obj: xianBeli });

  // 大秦景净 (互动 NPC, 大秦寺门口立)
  const jingjing = buildPerson({ role: 'scholar', robe: 'white', hat: 'scholar', tool: 'scroll', scale: 1.10 });
  jingjing.position.set(hsCenter.x + 1.2, 0.2, hsCenter.z + 3.8);
  jingjing.rotation.y = -0.4;
  jingjing.userData.basePos = jingjing.position.clone();
  jingjing.userData.idle = Math.random() * Math.PI;
  jingjing.userData.npcRole = 'monk';
  jingjing.userData.specialMini = 'yijing';
  jingjing.userData.npcLabel = '大秦景净';
  jingjing.userData.specialIntro = '贫僧大秦景净, 出身罗马、东来译经。某有十字莲花卷, 谁能识胡文者, 赠以景教经一卷。';
  huSiZone.add(jingjing);
  animatables.push({ type: 'person', obj: jingjing });
  if (typeof makeNameplate === 'function') {
    try {
      const np = makeNameplate({ displayName: '大秦景净', subtitle: '✝ 景教译师', nameColor: '#fff0d8' });
      np.position.set(0, 2.5, 0);
      jingjing.add(np);
    } catch (e) {}
  }

  // 摩尼僧 (圆殿门口 站)
  const maniMonk = buildPerson({ role: 'scholar', robe: 'silkPurple', hat: 'scholar', scale: 1.0 });
  maniMonk.position.set(hsCenter.x + 7.5, 0.2, hsCenter.z + 3.0);
  maniMonk.rotation.y = -0.2;
  maniMonk.userData.basePos = maniMonk.position.clone();
  maniMonk.userData.idle = Math.random() * Math.PI;
  maniMonk.userData.npcRole = 'monk';
  maniMonk.userData.npcLabel = '摩尼僧';
  huSiZone.add(maniMonk);
  animatables.push({ type: 'person', obj: maniMonk });
}


/* ============================================================
 *  ZONE-V: 太医署 (Imperial Medical Academy) — 中北偏东 (18, 14)
 *  视觉强项: 16 药圃 + 百子柜 (5 行 10 列) + 针灸铜人 + 药杵
 *  色彩: 木黄/药圃多彩花/铜人金色/白布幔 — "医道仁心" 的盛景
 * ============================================================ */
const taiyiZone = new THREE.Group();
scene.add(taiyiZone);
const tyCenter = new THREE.Vector3(18, 0, 14);

// 主厅 (木结构 简化)
{
  const hall = new THREE.Group();
  hall.add(box(8, 0.25, 4, 'stone', 0, 0.125, 0));
  // 木柱
  for (const [px, pz] of [[-3.4, -1.6], [3.4, -1.6], [-3.4, 1.6], [3.4, 1.6]]) {
    hall.add(box(0.25, 2.8, 0.25, 'wood', px, 1.4, pz));
  }
  // 白布幔后墙
  hall.add(box(7.6, 2.2, 0.10, 'white', 0, 1.35, -1.8));
  // 唐顶
  const roof = makeTangRoof(9, 1.3, 4.6, 'roofDark');
  roof.position.set(0, 3.0, 0); hall.add(roof);
  // 牌匾 "太医署"
  hall.add(box(2.0, 0.36, 0.06, 'gold', 0, 2.7, 1.8));
  hall.position.set(tyCenter.x, 0, tyCenter.z - 3);
  taiyiZone.add(hall);
}

// 百子柜 (后墙边 大药柜, 50 抽屉)
{
  const cabin = new THREE.Group();
  cabin.add(box(5.5, 2.2, 0.4, 'wood', 0, 1.1, 0));   // 主柜身
  // 50 抽屉 (5 行 x 10 列, 标记小铜把)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 10; c++) {
      // 抽屉边框
      cabin.add(box(0.50, 0.38, 0.04, 'wood', -2.5 + c * 0.55 + 0.275, 0.25 + r * 0.40, 0.22));
      // 把手
      cabin.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 4),
        mats.gold
      )).position.set(-2.5 + c * 0.55 + 0.275, 0.25 + r * 0.40, 0.27);
    }
  }
  cabin.position.set(tyCenter.x, 0, tyCenter.z - 4.6);
  taiyiZone.add(cabin);
}

// 针灸铜人 (大厅东侧, 站立铜色身体, 红点标穴位)
{
  const tongren = new THREE.Group();
  // 底座
  tongren.add(box(0.8, 0.2, 0.8, 'stone', 0, 0.1, 0));
  // 身体 (铜色)
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xb0825a, emissive: 0x603018, emissiveIntensity: 0.15 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.30, 1.4, 12), bodyMat);
  body.position.y = 1.0;
  tongren.add(body);
  // 头
  const tongrenHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), bodyMat);
  tongrenHead.position.y = 1.95;
  tongren.add(tongrenHead);
  // 手臂
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 8), bodyMat);
    arm.position.set(sx * 0.28, 1.2, 0);
    arm.rotation.z = sx * 0.2;
    tongren.add(arm);
  }
  // 24 红点穴位 (随机分布)
  const dotMat = new THREE.MeshLambertMaterial({ color: 0xff3040, emissive: 0xff1020, emissiveIntensity: 0.7 });
  const yPositions = [1.8, 1.6, 1.4, 1.2, 1.0, 0.8, 0.6];
  for (let i = 0; i < 18; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 4), dotMat);
    const ang = (i * 37) % 360 * Math.PI / 180;
    const ry = yPositions[i % yPositions.length];
    const rd = 0.18 + Math.random() * 0.05;
    dot.position.set(Math.cos(ang) * rd, ry, Math.sin(ang) * rd);
    tongren.add(dot);
  }
  tongren.position.set(tyCenter.x + 3.2, 0, tyCenter.z - 3);
  taiyiZone.add(tongren);
}

// 药杵 + 石臼 (大厅西侧)
{
  const mortar = new THREE.Group();
  mortar.add(box(0.7, 0.4, 0.7, 'wood', 0, 0.2, 0));
  mortar.add(cyl(0.30, 0.35, 'stone', 12));
  mortar.children[mortar.children.length - 1].position.y = 0.6;
  // 药杵
  mortar.add(box(0.07, 1.0, 0.07, 'wood', 0.06, 0.95, 0));
  mortar.position.set(tyCenter.x - 3.2, 0, tyCenter.z - 3);
  taiyiZone.add(mortar);
}

// 16 药圃 (大厅南侧, 4 x 4 网格, 各种颜色花)
{
  const herbColors = [
    'silkRed', 'silkPink', 'silkGreen', 'silkBlue',
    'silkPurple', 'gold', 'silkGold', 'jade',
    'white', 'silkRed', 'silkPink', 'silkGreen',
    'silkBlue', 'silkPurple', 'gold', 'jade',
  ];
  const herbNames = [
    '当归', '黄芪', '茯苓', '丹参',
    '人参', '麻黄', '甘草', '白术',
    '川芎', '白芍', '党参', '熟地',
    '芡实', '半夏', '柴胡', '陈皮',
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = tyCenter.x - 3.0 + c * 2.0;
      const z = tyCenter.z + 1.5 + r * 1.8;
      // 木边药圃
      const plot = new THREE.Group();
      plot.add(box(1.6, 0.10, 1.4, 'wood', 0, 0.05, 0));
      plot.add(box(1.7, 0.20, 0.08, 'wood', 0, 0.10, -0.7));  // 北沿
      plot.add(box(1.7, 0.20, 0.08, 'wood', 0, 0.10, 0.7));   // 南沿
      plot.add(box(0.08, 0.20, 1.5, 'wood', -0.85, 0.10, 0)); // 西沿
      plot.add(box(0.08, 0.20, 1.5, 'wood', 0.85, 0.10, 0));  // 东沿
      // 4 株药用花
      const colorIdx = r * 4 + c;
      const flowerMat = mats[herbColors[colorIdx]];
      for (let i = 0; i < 4; i++) {
        const fx = -0.5 + (i % 2) * 1.0;
        const fz = -0.4 + Math.floor(i / 2) * 0.8;
        plot.add(box(0.05, 0.25, 0.05, 'jade', fx, 0.27, fz));  // 茎
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), flowerMat);
        flower.position.set(fx, 0.45, fz);
        plot.add(flower);
      }
      plot.position.set(x, 0, z);
      taiyiZone.add(plot);
    }
  }
}

// 患者 2 人 (大厅前 长凳上 等候)
{
  const bench = box(1.6, 0.2, 0.4, 'wood', tyCenter.x - 2.5, 0.10, tyCenter.z + 0.2);
  taiyiZone.add(bench);
  const patient1 = buildPerson({ role: 'civilian', robe: 'horseBay', pose: 'kneel', scale: 0.96 });
  patient1.position.set(tyCenter.x - 2.8, 0.25, tyCenter.z + 0.2);
  patient1.userData.basePos = patient1.position.clone();
  patient1.userData.idle = Math.random() * Math.PI;
  patient1.userData.npcRole = 'civilian';
  patient1.userData.npcLabel = '病者';
  taiyiZone.add(patient1);
  animatables.push({ type: 'person', obj: patient1 });

  const patient2 = buildPerson({ role: 'civilian', robe: 'silkGreen', pose: 'kneel', scale: 0.96 });
  patient2.position.set(tyCenter.x - 2.0, 0.25, tyCenter.z + 0.2);
  patient2.userData.basePos = patient2.position.clone();
  patient2.userData.idle = Math.random() * Math.PI;
  patient2.userData.npcRole = 'civilian';
  patient2.userData.npcLabel = '老妇';
  taiyiZone.add(patient2);
  animatables.push({ type: 'person', obj: patient2 });
}

// 学医童 (药杵旁 bend)
{
  const yiTongzi = buildPerson({ role: 'child', robe: 'white', pose: 'bend', scale: 0.92 });
  yiTongzi.position.set(tyCenter.x - 3.0, 0.15, tyCenter.z - 2.4);
  yiTongzi.userData.basePos = yiTongzi.position.clone();
  yiTongzi.userData.idle = Math.random() * Math.PI;
  yiTongzi.userData.npcRole = 'civilian';
  yiTongzi.userData.npcLabel = '学医童';
  taiyiZone.add(yiTongzi);
  animatables.push({ type: 'person', obj: yiTongzi });
}

// 互动 NPC: 太医博士 (主厅前 立)
const taiyiBoshi = buildPerson({
  role: 'scholar', robe: 'silkGold', hat: 'scholar', tool: 'scroll', scale: 1.12,
});
taiyiBoshi.position.set(tyCenter.x + 0.5, 0.2, tyCenter.z - 1.5);
taiyiBoshi.rotation.y = 0;  // 面向南患者
taiyiBoshi.userData.basePos = taiyiBoshi.position.clone();
taiyiBoshi.userData.idle = Math.random() * Math.PI;
taiyiBoshi.userData.npcRole = 'official';
taiyiBoshi.userData.specialMini = 'wenzhen';
taiyiBoshi.userData.npcLabel = '太医博士';
taiyiBoshi.userData.specialIntro = '某领太医博士, 习扁鹊望闻问切之术。郎君若有意, 试为这案患者诊脉 — 配药得当, 赠灵丹一颗。';
taiyiZone.add(taiyiBoshi);
animatables.push({ type: 'person', obj: taiyiBoshi });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '太医博士', subtitle: '💊 望闻问切', nameColor: '#a0e0a0' });
    np.position.set(0, 2.5, 0);
    taiyiBoshi.add(np);
  } catch (e) {}
}


/* ============================================================
 *  ZONE-W: 司天监 观星台 (Astronomical Observatory) — 西北偏外 (-42, -8)
 *  视觉强项: 三层石高台 + 浑天仪 (大型铜环) + 漏壶 + 星图碑 + 4 天文官
 *  色彩: 灰青石/铜金浑仪/深蓝夜空感 — "上观天文" 的高科技氛围
 * ============================================================ */
const sitianZone = new THREE.Group();
scene.add(sitianZone);
const stCenter = new THREE.Vector3(-42, 0, -8);

// 三层石台 (大型 阶梯)
{
  const t1 = box(10, 0.5, 10, 'stone', stCenter.x, 0.25, stCenter.z);
  t1.receiveShadow = true; sitianZone.add(t1);
  const t2 = box(7.5, 0.5, 7.5, 'stone', stCenter.x, 0.75, stCenter.z);
  t2.receiveShadow = true; sitianZone.add(t2);
  const t3 = box(5, 0.5, 5, 'stone', stCenter.x, 1.25, stCenter.z);
  t3.receiveShadow = true; sitianZone.add(t3);
  // 阶梯 (南面)
  for (let i = 0; i < 5; i++) {
    sitianZone.add(box(2.5 - i * 0.4, 0.10, 0.4, 'stone',
      stCenter.x, 0.10 + i * 0.30, stCenter.z + 5.5 - i * 0.5));
  }
}

// 浑天仪 (大型铜色多环)
{
  const hun = new THREE.Group();
  const ringMat = new THREE.MeshLambertMaterial({
    color: 0xc09060, emissive: 0x604020, emissiveIntensity: 0.22
  });
  // 中心架 (子午环, 竖立)
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 32), ringMat);
  meridian.rotation.y = Math.PI / 2;
  hun.add(meridian);
  // 赤道环 (水平)
  const equator = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 32), ringMat);
  equator.rotation.x = Math.PI / 2;
  hun.add(equator);
  // 黄道环 (斜)
  const ecliptic = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 32), ringMat);
  ecliptic.rotation.x = Math.PI / 2;
  ecliptic.rotation.z = 0.4;
  hun.add(ecliptic);
  // 中心球 (代表地球)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x4080a0, emissive: 0x204060, emissiveIntensity: 0.3 }));
  hun.add(earth);
  // 4 支撑柱 (龙形 简化)
  for (const [px, pz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
    const pillar = box(0.20, 1.6, 0.20, 'wood', px, -0.8, pz);
    hun.add(pillar);
  }
  hun.position.set(stCenter.x, 3.0, stCenter.z);
  hun.userData.isArmillary = true;  // 动画用
  sitianZone.add(hun);
  animatables.push({ type: 'armillary', obj: hun });
}

// 漏壶 (3 层铜壶, 阶梯式滴漏)
{
  const lougu = new THREE.Group();
  const potMat = new THREE.MeshLambertMaterial({
    color: 0x988050, emissive: 0x402810, emissiveIntensity: 0.15
  });
  for (let i = 0; i < 3; i++) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4 - i * 0.05, 0.45 - i * 0.05, 0.7, 14),
      potMat
    );
    pot.position.y = 0.35 + (2 - i) * 0.6;
    lougu.add(pot);
    // 滴管
    if (i < 2) {
      lougu.add(box(0.04, 0.15, 0.04, 'wood', 0, 0.65 + (2 - i) * 0.6 - 0.3, 0.5));
    }
  }
  // 中央立柱 (timeline marker)
  lougu.add(box(0.05, 1.6, 0.05, 'wood', 0, 0.8, 0));
  // 顶 时辰刻度
  for (let i = 0; i < 12; i++) {
    const tick = box(0.10, 0.02, 0.02, 'gold', 0.06, 0.2 + i * 0.12, 0);
    lougu.add(tick);
  }
  lougu.position.set(stCenter.x + 3.5, 1.5, stCenter.z + 1.5);
  sitianZone.add(lougu);
}

// 星图碑 (北侧 大青石墙, CanvasTexture 星图)
{
  const starMapCanvas = document.createElement('canvas');
  starMapCanvas.width = 512; starMapCanvas.height = 384;
  const sctx = starMapCanvas.getContext('2d');
  // 深蓝夜空
  const grad = sctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#1a2a4a');
  grad.addColorStop(1, '#0a1424');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 512, 384);
  // 星辰
  sctx.fillStyle = '#ffffff';
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 384;
    const r = 1 + Math.random() * 2;
    sctx.beginPath();
    sctx.arc(x, y, r, 0, Math.PI * 2);
    sctx.fill();
  }
  // 8 紫微宫主星 (亮 + 连线)
  sctx.strokeStyle = '#fff080';
  sctx.lineWidth = 1.5;
  const stars = [[100, 80], [180, 60], [260, 100], [340, 80], [420, 130], [380, 200], [240, 220], [140, 180]];
  sctx.fillStyle = '#fff080';
  sctx.beginPath();
  stars.forEach(([x, y], i) => {
    sctx.fillRect(x - 3, y - 3, 6, 6);
    if (i > 0) sctx.lineTo(x, y); else sctx.moveTo(x, y);
  });
  sctx.stroke();
  // 28 宿名 (示意)
  sctx.fillStyle = '#fcd87a';
  sctx.font = 'bold 22px serif';
  sctx.fillText('紫微垣', 200, 280);
  sctx.font = '14px serif';
  sctx.fillText('北斗·北辰·三垣·二十八宿', 130, 320);

  const tex = new THREE.CanvasTexture(starMapCanvas);
  tex.anisotropy = 4;
  const stMat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x202040, emissiveIntensity: 0.4 });
  const stCarve = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 3.0), stMat);
  stCarve.position.set(stCenter.x - 3.5, 2.0, stCenter.z - 4.8);
  stCarve.rotation.y = 0.2;
  sitianZone.add(stCarve);
  // 石碑边框
  sitianZone.add(box(4.3, 3.3, 0.3, 'stone', stCenter.x - 3.5, 2.0, stCenter.z - 4.85));
}

// 4 天文官 (台周围)
{
  // 观星官 (高台上 仰望, 持 telescope tube)
  const guanxing = buildPerson({ role: 'scholar', robe: 'silkBlue', hat: 'scholar', tool: 'staff', scale: 1.04 });
  guanxing.position.set(stCenter.x + 2.0, 1.7, stCenter.z - 2.0);
  guanxing.rotation.y = 0.5;
  guanxing.userData.basePos = guanxing.position.clone();
  guanxing.userData.idle = Math.random() * Math.PI;
  guanxing.userData.npcRole = 'official';
  guanxing.userData.npcLabel = '观星官';
  sitianZone.add(guanxing);
  animatables.push({ type: 'person', obj: guanxing });

  // 记录官 (台下 bend, 持 scroll)
  const jilu = buildPerson({ role: 'scholar', robe: 'white', hat: 'scholar', tool: 'scroll', pose: 'bend', scale: 1.0 });
  jilu.position.set(stCenter.x - 2.5, 0.15, stCenter.z + 3.5);
  jilu.userData.basePos = jilu.position.clone();
  jilu.userData.idle = Math.random() * Math.PI;
  jilu.userData.npcRole = 'official';
  jilu.userData.npcLabel = '记录官';
  sitianZone.add(jilu);
  animatables.push({ type: 'person', obj: jilu });

  // 漏壶官 (漏壶旁 立)
  const lougugu = buildPerson({ role: 'scholar', robe: 'silkGreen', hat: 'scholar', scale: 0.98 });
  lougugu.position.set(stCenter.x + 4.0, 0.2, stCenter.z + 3.0);
  lougugu.rotation.y = -Math.PI / 2;
  lougugu.userData.basePos = lougugu.position.clone();
  lougugu.userData.idle = Math.random() * Math.PI;
  lougugu.userData.npcRole = 'official';
  lougugu.userData.npcLabel = '漏壶官';
  sitianZone.add(lougugu);
  animatables.push({ type: 'person', obj: lougugu });
}

// 互动 NPC: 司天少监 (台前正立)
const sitianjian = buildPerson({
  role: 'scholar', robe: 'silkPurple', hat: 'scholar', tool: 'scroll', scale: 1.14,
});
sitianjian.position.set(stCenter.x, 0.2, stCenter.z + 4.8);
sitianjian.rotation.y = 0;  // 朝向南方观星台
sitianjian.userData.basePos = sitianjian.position.clone();
sitianjian.userData.idle = Math.random() * Math.PI;
sitianjian.userData.npcRole = 'official';
sitianjian.userData.specialMini = 'guanxiang';
sitianjian.userData.npcLabel = '司天少监';
sitianjian.userData.specialIntro = '某乃司天少监 李淳风之徒。掌观象推卦, 二十八宿之分野, 天人感应之验。郎君可愿试推天象? 中三道, 赠天文图一卷。';
sitianZone.add(sitianjian);
animatables.push({ type: 'person', obj: sitianjian });
if (typeof makeNameplate === 'function') {
  try {
    const np = makeNameplate({ displayName: '司天少监', subtitle: '🔭 推卦观象', nameColor: '#a0c0ff' });
    np.position.set(0, 2.5, 0);
    sitianjian.add(np);
  } catch (e) {}
}

// 围栏松柏 (四角)
for (const [tx, tz] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) {
  sitianZone.add(box(0.18, 1.4, 0.18, 'wood', stCenter.x + tx, 0.7, stCenter.z + tz));
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.0, 6), mats.willowDark);
  foliage.position.set(stCenter.x + tx, 2.3, stCenter.z + tz);
  foliage.castShadow = true;
  sitianZone.add(foliage);
}


/* ============================================================
 *  Interactive Hotspots
 * ============================================================ */
const HOTSPOTS = [
  {
    id: 'que',
    title: '阙楼 · QUE TOWERS',
    body: '汉代礼制门阙。母阙居中、子阙副侧，重檐之制最早见于景帝阳陵。<br>"门旁双阙，所以表官位之尊。"',
    src: '《释名·释宫室》',
    pos: queL.position.clone().add(new THREE.Vector3(0, 6.5, 0)),
    target: queL,
  },
  {
    id: 'shi',
    title: '市楼 · MARKET TOWER',
    body: '坊市制度下的官府市楼。鼓声而开、击柝而闭，掌平价格、收市租。汉长安九市皆置令丞。',
    src: '《周礼·地官》《汉书·食货志》',
    pos: tower.position.clone().add(new THREE.Vector3(0, 7.5, 0)),
    target: tower,
  },
  {
    id: 'tavern',
    title: '酒肆 · TAVERN',
    body: '汉代酒肆挂"酒"字旗幌于门首，《史记·司马相如列传》载文君当垆卖酒。釀酒以麴、漉酒以筐。',
    src: '《史记·货殖列传》',
    pos: tavern.position.clone().add(new THREE.Vector3(0, 4.2, 0)),
    target: tavern,
  },
  {
    id: 'smithy',
    title: '铁匠铺 · BLACKSMITH',
    body: '汉武元狩四年盐铁专营。铁官分设郡国，置卒徒鼓铸。冶铁炉以水排（水力鼓风）增温，可铸百斤之器。',
    src: '《盐铁论》',
    pos: smithy.position.clone().add(new THREE.Vector3(0, 3.2, 0)),
    target: smithy,
  },
  {
    id: 'well',
    title: '水井 · WELL',
    body: '"凿井而饮，耕田而食"——汉乡聚落以井为中心，是公共生活枢纽。井栏以石、辘轳以木，绳系陶瓮汲水。',
    src: '《击壤歌》',
    pos: well.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
    target: well,
  },
  {
    id: 'market',
    title: '市集 · MARKET STREET',
    body: '南门外市肆云集，绢帛、陶器、米粟、果蔬陈列于摊。汉律：日中为市，过午则散；五日一会、十日一集。胡商汉贾、士庶工商，杂然相往。',
    src: '《盐铁论·力耕》',
    pos: archGate.position.clone().add(new THREE.Vector3(0, 5, 0)),
    target: archGate,
  },
  {
    id: 'wheel',
    title: '龙骨水车 · DRAGON-BONE PUMP',
    body: '汉代毕岚、毕公始作翻车（龙骨车），以木齿连环、踏踏汲水。一车日灌十亩，自此南方稻作可三熟。',
    src: '《后汉书·张让传》',
    pos: wheel.position.clone().add(new THREE.Vector3(0, 4, 0)),
    target: wheel,
  },
  {
    id: 'camp',
    title: '军营烽燧 · ARMY CAMP & BEACON',
    body: '汉武置河西四郡，列亭障烽燧逾万里。昼则燔燧、夜则举烽；五里一燧、十里一墩。匈奴入塞，三炬齐燃，长安可达。',
    src: '《居延汉简》',
    pos: watch.position.clone().add(new THREE.Vector3(0, 6.5, 0)),
    target: watch,
  },
  {
    id: 'caravan',
    title: '驼商队 · SILK ROAD CARAVAN',
    body: '张骞凿空，丝路始通。粟特、安息、大月氏胡商驱驼东来，载彩帛而归西。一峰双驼载织锦千匹，可换汉之黄金两镒。',
    src: '《史记·大宛列传》',
    pos: new THREE.Vector3(-22, 4, 6),
    target: caravanZone,
  },
  {
    id: 'battle',
    title: '边塞之战 · FRONTIER BATTLE',
    body: '元朔之役，卫青率三万骑出云中。汉军长戟方阵掎角，大黄连弩横扫，万钧战鼓振山岳。匈奴右贤王部凡数千骑，败走漠北。',
    src: '《汉书·卫青传》',
    pos: new THREE.Vector3(0, 5, -28),
    target: generalsTent,
  },
  {
    id: 'xiongnu',
    title: '突厥穹庐 · TURKIC YURTS',
    body: '突厥逐水草而居，骑射为生，控弦之士数十万。可汗号"伊利汗"。武德、贞观间，太宗、李靖、苏定方东西讨平之，所谓"<em>天可汗</em>"。',
    src: '《新唐书·突厥传》',
    pos: new THREE.Vector3(0, 4, -40),
    target: xnFlag,
  },
  {
    id: 'pagoda',
    title: '大雁塔 · WILD GOOSE PAGODA',
    body: '永徽三年（公元 652 年）僧玄奘自天竺归，请于慈恩寺西院建塔，以贮所携梵夹经像。初五层、后增九层，今存七层。砖石攒尖、四面拱窗，进士登科必登塔题名，称"雁塔题名"。',
    src: '《大慈恩寺三藏法师传》',
    pos: new THREE.Vector3(36, 8, 32),
    target: pagoda,
  },
  {
    id: 'qujiang',
    title: '曲江池 · QUJIANG POOL',
    body: '隋开皇三年（公元 583 年）开凿，唐代为皇室禁苑兼公共游园。上巳、重阳，士庶倾城游赏，画舫穿池。"曲江流饮"乃新科进士庆典，韩愈、白居易、杜甫皆有诗咏。',
    src: '《雍录·卷九》《长安志·卷十一》',
    pos: new THREE.Vector3(-32, 3, 26),
    target: qjPavilion,
  },
  {
    id: 'zhuque',
    title: '朱雀门 · ZHUQUE GATE',
    body: '唐长安皇城正南门，与南郊明德门、城内承天门同轴，构成长安南北中轴。门道三、城楼重檐两层，挂"龙"、"凤"二旗。九纵九横共八十一门钉，是九五至尊之征。',
    src: '《唐六典·卷七》',
    pos: new THREE.Vector3(0, 6, -46),
    target: zhuqueGate,
  },
  {
    id: 'hanyuan',
    title: '含元殿 · HANYUAN HALL',
    body: '大明宫正殿，龙朔三年（663）建成，高三十丈，下立龙尾道百余级。元日大朝、外蕃朝贡，皇帝御此受百官拜。"千官望长安、万国拜含元"——王维。',
    src: '《唐长安城考》《大明宫词》',
    pos: new THREE.Vector3(0, 12, -60),
    target: hanyuan,
  },
  {
    id: 'palaceTower',
    title: '翔鸾·栖凤双阙 · TWIN PHOENIX TOWERS',
    body: '含元殿两侧之双阙。东曰翔鸾、西曰栖凤，重檐高耸，形如展翼。"阙者宫门双阙也"——是为皇家威仪、外蕃来朝必经之地。',
    src: '《唐两京城坊考》',
    pos: new THREE.Vector3(14, 10, -52),
    target: xianglUan,
  },
  {
    id: 'xuanzheng',
    title: '宣政殿 · XUANZHENG HALL',
    body: '大明宫第二殿，"常朝"之所，每月朔望及一般政务皆于此处理。规模略减于含元，但形制清整。常朝官员皆穿绛红朝服、紫袍紫色印绶者为三品。',
    src: '《唐六典·尚书省》《通典·职官》',
    pos: new THREE.Vector3(0, 9, -76),
    target: xuanzheng,
  },
  {
    id: 'zichen',
    title: '紫宸殿 · ZICHEN HALL',
    body: '大明宫最北之内殿，皇帝寝兴召近臣议事之所。规模最小但最精巧，飞檐高耸如鹏翼。"紫宸召对"——非正式之内朝，可见私人体面。常有内史掌印、女官奏书、乐工弹琴。',
    src: '《资治通鉴》《新唐书·百官志》',
    pos: new THREE.Vector3(0, 7, -89),
    target: zichen,
  },
];

// register targets for raycasting (include all descendants)
HOTSPOTS.forEach(h => {
  h.target.traverse(c => {
    if (c.isMesh) {
      c.userData.hotspot = h.id;
      interactives.push(c);
    }
  });
});

/* ============================================================
 *  Day/Night System
 * ============================================================ */
const skyColors = {
  dawn:    { sky: 0x322940, light: 0xffb37a, ambient: 0x7a5e48, intensity: 1.0 },
  morning: { sky: 0x7fa6cf, light: 0xfff1d0, ambient: 0x8a9aa0, intensity: 1.8 },
  noon:    { sky: 0x93bfde, light: 0xfff8e8, ambient: 0x90a0aa, intensity: 2.1 },
  evening: { sky: 0x5a3a48, light: 0xff8a3a, ambient: 0x6a4838, intensity: 1.3 },
  night:   { sky: 0x141a30, light: 0x6080c0, ambient: 0x2a2a3a, intensity: 0.45 },
};
function lerpColor(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}
function getStateByHour(h) {
  // h: 0..24 (decimal)
  const stops = [
    [0, skyColors.night],
    [5, skyColors.night],
    [6.5, skyColors.dawn],
    [9, skyColors.morning],
    [12, skyColors.noon],
    [15, skyColors.morning],
    [17.5, skyColors.evening],
    [19.5, skyColors.dawn],
    [21, skyColors.night],
    [24, skyColors.night],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [h1, s1] = stops[i], [h2, s2] = stops[i + 1];
    if (h >= h1 && h <= h2) {
      const t = (h - h1) / (h2 - h1);
      return {
        sky: lerpColor(s1.sky, s2.sky, t),
        light: lerpColor(s1.light, s2.light, t),
        ambient: lerpColor(s1.ambient, s2.ambient, t),
        intensity: s1.intensity + (s2.intensity - s1.intensity) * t,
      };
    }
  }
  return skyColors.noon;
}

let currentHour = 10;
function applyHour(decH) {
  currentHour = decH;
  const s = getStateByHour(decH);
  scene.background = s.sky.clone();
  // 正常显示模式：默认不使用远景白雾。天气按钮需要雾时会临时创建。
  if (typeof currentWeather !== 'undefined' && currentWeather === 'clear') {
    scene.fog = null;
  }
  sun.color = s.light.clone();
  sun.intensity = s.intensity;
  ambient.color = s.ambient.clone();
  // sun position arc
  const ang = ((decH - 6) / 12) * Math.PI; // 6AM=0, 6PM=PI
  const sunR = 35;
  sun.position.set(
    Math.cos(ang) * sunR * 0.8,
    Math.max(2, Math.sin(ang) * sunR),
    18
  );
  // lantern emissive on at night
  const lanternOn = decH < 6 || decH > 18;
  mats.lantern.emissiveIntensity = lanternOn ? 1.2 : 0;

  // 里坊夜禁 (22:00 - 5:00) — 街上行人隐去 + 坊灯亮起
  const curfew = (decH >= 22 || decH < 5);
  if (typeof curfewSubjects !== 'undefined') {
    curfewSubjects.forEach(p => {
      p.visible = !curfew;
    });
  }
  // 坊灯 (路边灯笼) — 18:00 后渐亮, 06:00 后渐灭
  const streetLightOn = decH < 6 || decH > 18;
  if (typeof curfewLanterns !== 'undefined') {
    curfewLanterns.forEach(l => {
      // 单独 clone 的材质需要独立更新
      l.material.emissive.set(0xffb86b);
      l.material.emissiveIntensity = streetLightOn ? 1.5 : 0;
    });
  }
  // 宵禁状态指示 (DOM bug-tier 提示)
  const curfewBadge = document.getElementById('curfewBadge');
  if (curfewBadge) {
    curfewBadge.style.display = curfew ? 'flex' : 'none';
  }

  // 不再随时辰拉高曝光，避免画面泛白。
  renderer.toneMappingExposure = 1.0;

  // 整点钟声 / 鸡鸣 / 鼓声
  if (typeof checkHourSounds === 'function') checkHourSounds(decH);
}

/* ============================================================
 *  Audio — 合成音效 (Web Audio synth: 寺钟、报时鼓、鸡鸣、马蹄)
 * ============================================================ */
const audioState = {
  ctx: null,
  enabled: true,
  ambient: null,
  ambientGain: null,
  lastHour: -1,
};

function ensureAudioCtx() {
  if (audioState.ctx) return audioState.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioState.ctx = new AC();
  return audioState.ctx;
}

// 寺钟 (sine + lowpass + decay)
function playBell(freq = 220, dur = 2.8) {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const masterG = ctx.createGain();
  masterG.gain.setValueAtTime(0.0001, now);
  masterG.gain.exponentialRampToValueAtTime(0.5, now + 0.04);
  masterG.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  // 主音
  for (const [f, g, decay] of [
    [freq, 0.6, dur],
    [freq * 1.5, 0.25, dur * 0.7],
    [freq * 2.6, 0.12, dur * 0.4],
  ]) {
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(g, now + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    o.connect(og); og.connect(masterG);
    o.start(now); o.stop(now + decay + 0.1);
  }
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = freq * 6;
  masterG.connect(lp); lp.connect(ctx.destination);
}

// 大鼓 (报时鼓) — noise + envelope
function playDrum() {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 0.5;
  // 低频闷音
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(60, now + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(now); o.stop(now + dur);
  // 击打瞬间噪声
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const ng = ctx.createGain();
  ng.gain.value = 0.3;
  const hp = ctx.createBiquadFilter();
  hp.type = 'lowpass'; hp.frequency.value = 800;
  noise.connect(hp); hp.connect(ng); ng.connect(ctx.destination);
  noise.start(now);
}

// 鸡鸣 (frequency sweep + tremolo)
function playRooster() {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // 3 段尖叫上扬
  for (let k = 0; k < 3; k++) {
    const t0 = now + k * 0.2;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(440 + k * 100, t0);
    o.frequency.exponentialRampToValueAtTime(900 + k * 80, t0 + 0.08);
    o.frequency.exponentialRampToValueAtTime(550, t0 + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1600;
    o.connect(g); g.connect(lp); lp.connect(ctx.destination);
    o.start(t0); o.stop(t0 + 0.22);
  }
}

// 马蹄 (短促节奏)
function playHooves() {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let k = 0; k < 4; k++) {
    const t0 = now + k * 0.16;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 80 + Math.random() * 30;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.10);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + 0.12);
  }
}

// 切换场景轻铃声
function playChime() {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [f, t] of [[880, 0], [1320, 0.06], [1760, 0.12]]) {
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(0.10, now + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.6);
    o.connect(g); g.connect(ctx.destination);
    o.start(now + t); o.stop(now + t + 0.65);
  }
}

// 环境氛围底音 (低频持续 pad)
function startAmbient() {
  if (audioState.ambient) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const g = ctx.createGain();
  g.gain.value = audioState.enabled ? 0.025 : 0;
  // 两个低频 detune sine 营造空气感
  const o1 = ctx.createOscillator();
  o1.type = 'sine'; o1.frequency.value = 96;
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = 96.7;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 280;
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o1.start(); o2.start();
  audioState.ambient = [o1, o2];
  audioState.ambientGain = g;
}

function setMuted(muted) {
  audioState.enabled = !muted;
  if (audioState.ambientGain) {
    audioState.ambientGain.gain.value = muted ? 0 : 0.025;
  }
  const btn = document.getElementById('muteBtn');
  if (btn) btn.classList.toggle('muted', muted);
}

/* ============================================================
 *  Seasons — 春 / 夏 / 秋 / 冬 配色 + 粒子系统切换
 * ============================================================ */
const SEASONS = {
  spring: {
    label: '仲春 · 二月',  en: 'SPRING',
    grass: 0x7BA84C,  grassDark: 0x5A8038,
    willow: 0x82A04A, willowDark: 0x506830,
    bamboo: 0x82A04A, bambooDark: 0x506830,
    paddy: 0x6E8B5A,  paddyWater: 0x6A8276,
    petals: 'on',  leaves: 'off',  snow: 'off',  fireflies: 'off',
  },
  summer: {
    label: '盛夏 · 六月',  en: 'SUMMER',
    grass: 0x4F7E2C,  grassDark: 0x2F5618,
    willow: 0x5F8530, willowDark: 0x355820,
    bamboo: 0x6A9A3F, bambooDark: 0x3D5C20,
    paddy: 0x5A7A48,  paddyWater: 0x4E6A5E,
    petals: 'off', leaves: 'off',  snow: 'off',  fireflies: 'on',
  },
  autumn: {
    label: '秋深 · 九月',  en: 'AUTUMN',
    grass: 0x9A8C3A,  grassDark: 0x6B5C20,
    willow: 0xC9842A, willowDark: 0x8C5818,
    bamboo: 0xB89A2E, bambooDark: 0x7C6418,
    paddy: 0xB89832,  paddyWater: 0x807840,
    petals: 'off', leaves: 'on',   snow: 'off',  fireflies: 'off',
  },
  winter: {
    label: '严冬 · 腊月',  en: 'WINTER',
    grass: 0xC8CED2,  grassDark: 0x9A9F9F,
    willow: 0x7C6A4A, willowDark: 0x564838,
    bamboo: 0x90835A, bambooDark: 0x60543A,
    paddy: 0xBFC2BE,  paddyWater: 0x8E9590,
    petals: 'off', leaves: 'off',  snow: 'on',   fireflies: 'off',
  },
};

let currentSeason = 'spring';

// 雪花粒子 (惰性创建)
let snowGroup = null;
function ensureSnowGroup() {
  if (snowGroup) return snowGroup;
  snowGroup = new THREE.Group();
  for (let i = 0; i < 280; i++) {
    const f = box(0.08, 0.08, 0.08, 'white');
    f.position.set(
      (Math.random() - 0.5) * 110,
      Math.random() * 26,
      -5 + (Math.random() - 0.5) * 120
    );
    f.userData.fallSpeed = 0.6 + Math.random() * 0.8;
    f.userData.swayPhase = Math.random() * Math.PI * 2;
    f.userData.swayAmp = 0.6 + Math.random() * 0.6;
    snowGroup.add(f);
  }
  scene.add(snowGroup);
  animatables.push({ type: 'snow', obj: snowGroup });
  snowGroup.visible = false;
  return snowGroup;
}

// 落叶粒子 (惰性创建，秋季)
let leafGroup = null;
function ensureLeafGroup() {
  if (leafGroup) return leafGroup;
  leafGroup = new THREE.Group();
  for (let i = 0; i < 80; i++) {
    const colors = ['silkGold', 'silkPink', 'blood'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const l = box(0.14, 0.025, 0.10, c);
    l.position.set(
      (Math.random() - 0.5) * 100,
      Math.random() * 18,
      -5 + (Math.random() - 0.5) * 110
    );
    l.userData.fallSpeed = 0.3 + Math.random() * 0.4;
    l.userData.swayPhase = Math.random() * Math.PI * 2;
    l.userData.swayAmp = 0.4 + Math.random() * 0.5;
    l.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    leafGroup.add(l);
  }
  scene.add(leafGroup);
  animatables.push({ type: 'leaves', obj: leafGroup });
  leafGroup.visible = false;
  return leafGroup;
}

// 萤火虫 (夏夜)
let fireflyGroup = null;
function ensureFireflyGroup() {
  if (fireflyGroup) return fireflyGroup;
  fireflyGroup = new THREE.Group();
  for (let i = 0; i < 60; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xC8E07A })
    );
    f.position.set(
      (Math.random() - 0.5) * 80,
      0.3 + Math.random() * 3.0,
      -5 + (Math.random() - 0.5) * 80
    );
    f.userData.phase = Math.random() * Math.PI * 2;
    f.userData.driftSpeed = 0.3 + Math.random() * 0.3;
    f.userData.basePos = f.position.clone();
    fireflyGroup.add(f);
  }
  scene.add(fireflyGroup);
  animatables.push({ type: 'fireflies', obj: fireflyGroup });
  fireflyGroup.visible = false;
  return fireflyGroup;
}

/* ============================================================
 *  Historical Eras — 贞观 / 开元 / 天宝乱 / 天宝后
 *  切换可视化大唐百年史
 * ============================================================ */
const ERAS = {
  zhenguan: {
    name: '贞观之治',
    range: '627 — 649',
    emperor: '唐太宗 李世民',
    label: 'ZHENGUAN',
    summary: '"贞观之治" — 太宗任贤纳谏，府兵屯田，民生休养，开万邦来朝之始。突厥归化、薛延陀亡，吐蕃和亲。',
    tint: 0xffffff,
    skyMul: 1.0,
    militia: 1.6,  // 兵力倍率
    market: 0.8,
    moodTag: '玄武门后·四海初定',
  },
  kaiyuan: {
    name: '开元盛世',
    range: '713 — 741',
    emperor: '唐玄宗 李隆基',
    label: 'KAIYUAN',
    summary: '"开元盛世" — 玄宗以姚崇、宋璟为相，整顿吏治，扩漕运，置十节度。长安万邦集会，胡商穿梭，杜甫诗云："忆昔开元全盛日"。',
    tint: 0xffefcc,
    skyMul: 1.05,
    militia: 1.0,
    market: 1.4,
    moodTag: '诗酒繁华·万国衣冠',
  },
  tianbaowar: {
    name: '安史之乱',
    range: '755 — 763',
    emperor: '玄宗·肃宗·代宗',
    label: 'TIANBAO REBELLION',
    summary: '"渔阳鼙鼓动地来，惊破霓裳羽衣曲。" — 安禄山起兵范阳，连陷洛阳、潼关。玄宗仓皇幸蜀，马嵬坡赐死贵妃。肃宗灵武即位。',
    tint: 0xb55a3a,
    skyMul: 0.7,
    militia: 2.0,
    market: 0.3,
    moodTag: '渔阳鼙鼓·华清池冷',
  },
  posttianbao: {
    name: '天宝之后',
    range: '763 — 907',
    emperor: '代宗·德宗·宪宗·…',
    label: 'AFTER TIANBAO',
    summary: '"国破山河在，城春草木深" — 战乱平息但盛世不再，藩镇割据日甚，宦官专政、牛李党争交织。中和五年黄巢入长安，再无复盛。',
    tint: 0xc8c0b0,
    skyMul: 0.85,
    militia: 1.1,
    market: 0.6,
    moodTag: '藩镇割据·诗风转沉',
  },
};
let currentEra = 'kaiyuan';

function applyEra(name) {
  const era = ERAS[name];
  if (!era) return;
  currentEra = name;
  // 更新UI 横幅
  const banner = document.getElementById('eraBanner');
  if (banner) {
    banner.innerHTML =
      `<div class="era-tag">${era.label} · ${era.range}</div>` +
      `<div class="era-name">${era.name}</div>` +
      `<div class="era-emperor">${era.emperor}</div>` +
      `<div class="era-summary">${era.summary}</div>` +
      `<div class="era-mood">${era.moodTag}</div>`;
    banner.classList.add('show');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => banner.classList.remove('show'), 8000);
  }
  // 高亮当前 era 按钮
  document.querySelectorAll('.era-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.era === name);
  });
  // 整体 tint (修改环境光颜色)
  if (typeof ambient !== 'undefined') {
    const c = new THREE.Color(era.tint);
    ambient.color.lerp(c, 0.6);
  }
  // 按 NPC role 调整可见度 (商人/兵卒/侍女)
  collectAllNpcs();
  const byRole = {};
  for (const n of allNpcs) {
    const r = n.userData.npcRole || 'civilian';
    // 具名 NPC (李白/杜甫/王维/周引之/陈忠武) 不受朝代切换隐藏
    if (n.userData.personaId) {
      n.userData.eraHide = false;
      continue;
    }
    (byRole[r] = byRole[r] || []).push(n);
    // 重置 - 先全部可见，再分类隐藏
    n.userData.eraHide = false;
  }
  const apply = (role, mul) => {
    const list = byRole[role] || [];
    const limit = Math.min(list.length, Math.max(0, Math.floor(list.length * mul)));
    list.forEach((m, i) => { m.userData.eraHide = i >= limit; });
  };
  apply('merchant', era.market);
  apply('foreigner', era.market * 0.8);
  apply('soldier', era.militia);
  apply('lady', era.market * 0.9);
  // 应用 eraHide (curfew 仍可能进一步隐藏)
  for (const n of allNpcs) {
    n.visible = !n.userData.eraHide;
  }
  // 天宝乱期间烽火常燃 (将日期推为夜间触发)
  if (name === 'tianbaowar') {
    if (typeof beaconsAlwaysOn !== 'undefined') beaconsAlwaysOn.value = true;
  } else {
    if (typeof beaconsAlwaysOn !== 'undefined') beaconsAlwaysOn.value = false;
  }
  // 播放年代切换提示音
  if (typeof playChime === 'function') playChime();
  // 切换 era 时变动诗签 (天宝乱推荐杜甫)
  if (typeof poetryMode !== 'undefined' && poetryMode) {
    // 没有特殊处理，保留原诗
  }
}

// 烽火常燃标志 (天宝乱)
const beaconsAlwaysOn = { value: false };

/* ============================================================
 *  Weather — 雨 / 风沙 / 雾霸 (可独立切换)
 * ============================================================ */
let rainGroup = null, sandGroup = null;
let currentWeather = 'clear';
let weatherFogOrig = null;  // 保存原雾参数

function ensureRainGroup() {
  if (rainGroup) return rainGroup;
  rainGroup = new THREE.Group();
  // 雨滴 = 高瘦的方条
  for (let i = 0; i < 380; i++) {
    const r = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.5, 0.02),
      new THREE.MeshBasicMaterial({
        color: 0x9ab0c8, transparent: true, opacity: 0.55,
      }),
    );
    r.position.set(
      (Math.random() - 0.5) * 120,
      Math.random() * 30,
      -10 + (Math.random() - 0.5) * 130,
    );
    r.userData.fallSpeed = 14 + Math.random() * 8;
    r.userData.windDrift = (Math.random() - 0.5) * 0.3;
    rainGroup.add(r);
  }
  scene.add(rainGroup);
  animatables.push({ type: 'rain', obj: rainGroup });
  rainGroup.visible = false;
  return rainGroup;
}

function ensureSandGroup() {
  if (sandGroup) return sandGroup;
  sandGroup = new THREE.Group();
  // 沙尘 = 橙黄小粒，水平移动
  for (let i = 0; i < 240; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.10 + Math.random() * 0.08, 4, 3),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xc89a5a : (i % 3 === 1 ? 0xa87a40 : 0xd4a060),
        transparent: true, opacity: 0.6,
      }),
    );
    s.position.set(
      -70 - Math.random() * 30,
      0.2 + Math.random() * 14,
      -10 + (Math.random() - 0.5) * 120,
    );
    s.userData.driftSpeed = 14 + Math.random() * 10;
    s.userData.swayAmp = 0.4 + Math.random() * 0.5;
    s.userData.swayPhase = Math.random() * Math.PI * 2;
    sandGroup.add(s);
  }
  scene.add(sandGroup);
  animatables.push({ type: 'sand', obj: sandGroup });
  sandGroup.visible = false;
  return sandGroup;
}

// 风向状态 (xz 平面单位向量 + 强度) — 控制雨/沙/雪斜飘
const windState = { x: 0.3, z: 0.0, strength: 1.0, slowPhase: 0 };

// 闪电状态机
const lightningState = {
  flashTimer: 0,       // > 0 时屏幕白闪
  flashIntensity: 0,
  nextStrikeIn: 4 + Math.random() * 8,
  pendingThunder: -1,  // 距下次雷声秒数（光雷延迟）
};

function triggerLightning() {
  lightningState.flashTimer = 0.22;
  lightningState.flashIntensity = 0.55 + Math.random() * 0.35;
  lightningState.pendingThunder = 0.8 + Math.random() * 2.2;
  const o = document.getElementById('lightningOverlay');
  if (o) {
    o.style.opacity = lightningState.flashIntensity;
    clearTimeout(o._t);
    o._t = setTimeout(() => { o.style.opacity = 0; }, 220);
  }
}
function playThunder() {
  if (!audioState.enabled) return;
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = 1.8;
  // 低频持续轰鸣
  const sampleRate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sampleRate * dur, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.pow(1 - t, 1.2) * (1 + 0.4 * Math.sin(i * 0.02));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 240;
  const g = ctx.createGain();
  g.gain.value = 0.55;
  src.connect(lp); lp.connect(g); g.connect(ctx.destination);
  src.start(now);
}
function tickLightning(dt) {
  if (currentWeather !== 'rain') return;
  lightningState.nextStrikeIn -= dt;
  if (lightningState.nextStrikeIn <= 0) {
    triggerLightning();
    lightningState.nextStrikeIn = 6 + Math.random() * 14;
  }
  if (lightningState.pendingThunder > 0) {
    lightningState.pendingThunder -= dt;
    if (lightningState.pendingThunder <= 0) {
      playThunder();
      lightningState.pendingThunder = -1;
    }
  }
}

function setWeather(name) {
  if (!scene.fog) {
    scene.fog = new THREE.Fog(scene.background || 0x86afd4, 200, 450);
  }
  if (!weatherFogOrig) {
    weatherFogOrig = { color: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far };
  }
  // 重置
  if (rainGroup) rainGroup.visible = false;
  if (sandGroup) sandGroup.visible = false;
  if (name === 'clear') {
    scene.fog = null;
  } else {
    scene.fog.color.copy(weatherFogOrig.color);
    scene.fog.near = weatherFogOrig.near;
    scene.fog.far = weatherFogOrig.far;
  }
  // 应用
  currentWeather = name;
  // 每种天气分配风向
  if (name === 'rain') {
    ensureRainGroup().visible = true;
    if (!scene.fog) scene.fog = new THREE.Fog(0x556070, 80, 320);
    scene.fog.color.set(0x556070);
    scene.fog.near = 80; scene.fog.far = 320;
    windState.x = -0.6; windState.z = 0.3; windState.strength = 2.0;
    // 排闪电起始
    lightningState.nextStrikeIn = 3 + Math.random() * 8;
  } else if (name === 'sand') {
    ensureSandGroup().visible = true;
    if (!scene.fog) scene.fog = new THREE.Fog(0x8a6840, 30, 180);
    scene.fog.color.set(0x8a6840);
    scene.fog.near = 30; scene.fog.far = 180;
    windState.x = 1.4; windState.z = 0.15; windState.strength = 3.0;
  } else if (name === 'fog') {
    if (!scene.fog) scene.fog = new THREE.Fog(0xb8c0c8, 30, 220);
    scene.fog.color.set(0xb8c0c8);
    scene.fog.near = 30; scene.fog.far = 220;
    windState.x = 0.05; windState.z = 0.02; windState.strength = 0.4;
  } else {
    windState.x = 0.3; windState.z = 0; windState.strength = 1.0;
  }
  // UI
  document.querySelectorAll('.weather-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.weather === name);
  });
  const lab = document.getElementById('weatherText');
  if (lab) lab.textContent =
    ({ clear: '晴', rain: '雨', sand: '沙', fog: '雾' })[name] || '晴';
}

/* ============================================================
 *  Poetry — 唐诗节点 (按场景映射，可由 "诗" 按钮开启浮动诗签)
 * ============================================================ */
const POEMS = {
  0: {
    title: '《长安古意》',
    author: '卢照邻',
    lines: [
      '长安大道连狭斜，',
      '青牛白马七香车。',
      '玉辇纵横过主第，',
      '金鞭络绎向侯家。',
    ],
  },
  1: {
    title: '《和贾舍人早朝大明宫之作》',
    author: '王维',
    lines: [
      '九天阊阖开宫殿，',
      '万国衣冠拜冕旒。',
      '日色才临仙掌动，',
      '香烟欲傍衮龙浮。',
    ],
  },
  2: {
    title: '《与高适薛据登慈恩寺浮图》',
    author: '岑参',
    lines: [
      '塔势如涌出，孤高耸天宫。',
      '登临出世界，磴道盘虚空。',
      '突兀压神州，峥嵘如鬼工。',
      '四角碍白日，七层摩苍穹。',
    ],
  },
  3: {
    title: '《丽人行》',
    author: '杜甫',
    lines: [
      '三月三日天气新，',
      '长安水边多丽人。',
      '态浓意远淑且真，',
      '肌理细腻骨肉匀。',
    ],
  },
  4: {
    title: '《长安道》',
    author: '储光羲',
    lines: [
      '鸣鞭过酒肆，袨服游倡门。',
      '百万一时尽，含情无片言。',
      '即此竟长安，何处是长安。',
    ],
  },
  5: {
    title: '《观刈麦》（节选）',
    author: '白居易',
    lines: [
      '田家少闲月，五月人倍忙。',
      '夜来南风起，小麦覆陇黄。',
      '妇姑荷箪食，童稚携壶浆。',
      '相随饷田去，丁壮在南冈。',
    ],
  },
  6: {
    title: '《和贾至舍人早朝大明宫》',
    author: '杜甫',
    lines: [
      '五夜漏声催晓箭，',
      '九重春色醉仙桃。',
      '旌旗日暖龙蛇动，',
      '宫殿风微燕雀高。',
    ],
  },
  7: {
    title: '《从军行》（节选）',
    author: '王昌龄',
    lines: [
      '青海长云暗雪山，',
      '孤城遥望玉门关。',
      '黄沙百战穿金甲，',
      '不破楼兰终不还。',
    ],
  },
  8: {
    title: '《凉州词》',
    author: '王翰',
    lines: [
      '葡萄美酒夜光杯，',
      '欲饮琵琶马上催。',
      '醉卧沙场君莫笑，',
      '古来征战几人回？',
    ],
  },
};

let poetryMode = false;
function showPoem(idx) {
  const card = document.getElementById('poemCard');
  if (!card) return;
  const p = POEMS[idx];
  if (!p || !poetryMode) {
    card.classList.remove('show');
    return;
  }
  document.getElementById('poemTitle').textContent = p.title;
  document.getElementById('poemAuthor').textContent = '唐 · ' + p.author;
  document.getElementById('poemLines').innerHTML =
    p.lines.map(l => `<div>${l}</div>`).join('');
  card.classList.add('show');
}
function setPoetryMode(on) {
  poetryMode = on;
  const btn = document.getElementById('poemBtn');
  if (btn) btn.classList.toggle('active', on);
  if (!on) {
    const card = document.getElementById('poemCard');
    if (card) card.classList.remove('show');
  } else {
    // 立刻显示当前场景的诗
    const active = document.querySelector('#sceneRail button.active');
    if (active) showPoem(parseInt(active.dataset.scene, 10));
    else showPoem(0);
  }
}

function applySeason(name) {
  if (!SEASONS[name]) return;
  currentSeason = name;
  const S = SEASONS[name];
  // 更新材料颜色
  mats.grass.color.setHex(S.grass);
  mats.grassDark.color.setHex(S.grassDark);
  mats.willow.color.setHex(S.willow);
  mats.willowDark.color.setHex(S.willowDark);
  mats.bamboo.color.setHex(S.bamboo);
  mats.bambooDark.color.setHex(S.bambooDark);
  mats.paddy.color.setHex(S.paddy);
  mats.paddyWater.color.setHex(S.paddyWater);
  // 桃花粒子 (春季)
  if (petalGroup) petalGroup.visible = S.petals === 'on';
  // 落叶 (秋季)
  if (S.leaves === 'on') {
    ensureLeafGroup().visible = true;
  } else if (leafGroup) {
    leafGroup.visible = false;
  }
  // 雪 (冬季)
  if (S.snow === 'on') {
    ensureSnowGroup().visible = true;
  } else if (snowGroup) {
    snowGroup.visible = false;
  }
  // 萤火虫 (夏夜)
  if (S.fireflies === 'on') {
    ensureFireflyGroup();
  }

  // 更新 UI 季节标签
  const el = document.getElementById('seasonText');
  if (el) el.textContent = S.label;
  // 更新季节切换按钮高亮
  document.querySelectorAll('#seasonPicker .season-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.season === name);
  });
  // 切换音效
  if (typeof playChime === 'function') playChime();
}

// 整点报时 — 在 applyHour 内调用
function checkHourSounds(decH) {
  const h = Math.floor(decH);
  if (audioState.lastHour === h) return;
  // 第一次跳过
  if (audioState.lastHour !== -1) {
    if (h === 5) playRooster();           // 5 AM 鸡鸣 (开市)
    else if (h === 22) playDrum();        // 22:00 关坊鼓
    else if (h === 6 || h === 12 || h === 18) playBell(220 - h * 2, 2.4);  // 朝时大钟
  }
  audioState.lastHour = h;
}

/* ============================================================
 *  Postprocessing — Outline + Bloom
 * ============================================================ */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outline = new OutlinePass(
  new THREE.Vector2(initW, initH),
  scene, camera
);
outline.edgeStrength = 3;
outline.edgeGlow = 0.0;
outline.edgeThickness = 1.0;
outline.visibleEdgeColor.set(0xc8a45e);
outline.hiddenEdgeColor.set(0x000000);
composer.addPass(outline);

const bloom = new UnrealBloomPass(
  new THREE.Vector2(initW, initH),
  0.0, 0.0, 1.0
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ============================================================
 *  Interactions — raycast click & hover
 * ============================================================ */
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let hoveredId = null;

function pickAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(interactives, false);
  return hits[0]?.object?.userData?.hotspot ?? null;
}

// 调试用：暴露场景与相机供测试脚本访问
if (typeof window !== 'undefined') {
  window.__scene = scene;
  window.__camera = camera;
  window.__THREE = THREE;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  const id = pickAt(e.clientX, e.clientY);
  if (id !== hoveredId) {
    hoveredId = id;
    if (id) {
      const h = HOTSPOTS.find(x => x.id === id);
      outline.selectedObjects = [h.target];
      renderer.domElement.style.cursor = 'pointer';
    } else {
      outline.selectedObjects = [];
      renderer.domElement.style.cursor = 'default';
    }
  }
});

// 市井段子库 — 按身份分类
const NPC_LINES = {
  civilian: [
    '"长安米贵，居大不易！" —— 听说白侍郎初来时，顾况这么调他。',
    '"今日东市有西域来的葡萄、波斯枣，要不要去看看？"',
    '"我家三娘最近迷上王勃《滕王阁序》，整日念叨『落霞与孤鹜』。"',
    '"上元节灯山高百尺，今年再去金吾不禁夜。"',
    '"听说北里那间酒肆来了胡姬，弹琵琶倾国倾城。"',
    '"昨夜五更鼓后，又见流星过紫微，预兆何耶？"',
  ],
  merchant: [
    '"西州瓜，安息香，要不要看看？三十文一斤。"',
    '"我这件越窑青瓷，远销日本国，已是天宝旧物。"',
    '"昨从洛阳来，运河漕粮要到秋后才到。"',
    '"江南绿茶八贯一饼，长安城里只此一家。"',
    '"听说波斯王子已在金光门外候着了，咱们大唐果然万邦来朝。"',
    '"宫廷采办的金步摇，全长安就出我一家。"',
  ],
  lady: [
    '"今春流行高髻簪花，鬓边再贴个红色花钿。"',
    '"绣球花开了，三月三日要去曲江看春。"',
    '"姊姊新得一支金步摇，行起路来叮叮当当。"',
    '"教坊新排了《霓裳羽衣》，听说杨贵妃亲手编的。"',
    '"昨天去慈恩寺烧香，求大慈大悲观音。"',
    '"我家郎君明年要去考进士，但愿题在雁塔之上。"',
  ],
  scholar: [
    '"老夫近读《五经正义》，颇有所悟。"',
    '"杜工部诗如刀刻，李太白诗如风发，各有千秋。"',
    '"近日科举改制，五经之外又考时务策。"',
    '"诗赋为重，记问为辅，方是君子之学。"',
    '"长安比之洛阳，更近天威；洛阳比之长安，更近民情。"',
    '"《史记》读到《刺客列传》，每每废卷叹息。"',
  ],
  soldier: [
    '"北边突厥又南下，已聚兵于云中。"',
    '"听说安西节度使新到任，斩杀千余胡贼。"',
    '"军中粮饷迟发月余，弟兄们都怨。"',
    '"我父在战场，已三年未归，希望来春能见到。"',
    '"持戈百日，胜读十年书。男儿当如是。"',
    '"边塞月明夜，闻笛能让壮士落泪。"',
  ],
  child: [
    '"娘说今晚有元宵，要给我做羹汤！"',
    '"我捉到一只蝉，要不要给你看？"',
    '"先生说我读《千字文》最快，要奖我一块糖。"',
    '"那个胡人胡子真长，看着像狮子。"',
    '"将军，借我玩玩你的弓好不好？"',
    '"我长大要去考状元，雁塔题名！"',
  ],
  foreigner: [
    '"波斯来的，撒马尔罕长大，特来大唐求学。"',
    '"长安比拜占庭还大！这里的丝绸、瓷器，世上无双。"',
    '"我教你几句胡语？『萨拉姆』就是『你好』。"',
    '"我们粟特人世代经商，从撒马尔罕到长安，三年一回。"',
    '"白发葡萄美酒，要不要尝？产自高昌。"',
    '"骆驼是我们的兄弟，没了它，沙漠就过不去。"',
  ],
  xiongnu: [
    '"我汗祈大唐共饮一杯酒，万里不为远。"',
    '"草原天高，但天可汗的恩重于山。"',
    '"突厥健儿弯弓如月，能射百步白杨叶。"',
    '"我已归化大唐，长子在长安读书。"',
  ],
};
const NPC_FALLBACK = [
  '"客从远方来，遗我一书札……" 此人似在低语吟诗。',
  '此人神色匆匆，似有要事，不愿被打扰。',
  '"长安春色今已老，多谢恩光照旅人。" 路人朝你一拱手。',
];

function pickNpcAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  // 递归 raycast 整个 scene
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    let cur = h.object;
    while (cur) {
      if (cur.userData && cur.userData.npc) return cur;
      cur = cur.parent;
    }
  }
  return null;
}

function showNpcBubble(npc, clientX, clientY) {
  const lines = NPC_LINES[npc.userData.npcRole] || NPC_FALLBACK;
  const text = lines[Math.floor(Math.random() * lines.length)];
  const bubble = document.getElementById('npcBubble');
  if (!bubble) return;
  bubble.innerHTML =
    `<div class="npc-role">${roleLabel(npc.userData.npcRole)}</div>` +
    `<div class="npc-say">${text}</div>`;
  bubble.style.left = clientX + 'px';
  bubble.style.top  = (clientY - 24) + 'px';
  // 超长台词 (>32 字) 才允许换行, 否则保持单行整齐
  bubble.classList.toggle('long', (text || '').length > 32);
  bubble.classList.add('show');
  if (typeof playChime === 'function' && audioState.enabled) {
    // softer chime for NPC
  }
  clearTimeout(bubble._t);
  bubble._t = setTimeout(() => bubble.classList.remove('show'), 4200);
}
function roleLabel(role) {
  return ({
    civilian: '里坊·百姓', merchant: '市井·商贾', lady: '深闺·仕女',
    scholar: '士林·文士', soldier: '军中·兵卒', child: '孩童',
    foreigner: '西域·胡商', xiongnu: '北蕃·突厥',
    // Round 1 themed zones (Pingkang Ward, Liyuan Conservatory)
    elder: '坊间·长者', musician: '梨园·乐工', sage: '禁苑·教坊',
    // Round 2 themed zones (Dongshi appraiser shares 'merchant', Ranfang dyer uses 'craftsman')
    craftsman: '坊间·匠人',
    // Round 3 themed zones (演武校场 / 国子监 / 马球场 / 玄都观)
    general: '军中·校尉', official: '朝堂·官员', daoist: '玄都观·道士', monk: '禅林·法师',
    // Round 4 themed zones (鸿胪寺 / 西明胡寺 / 太医署 / 司天监)
    envoy: '番邦·使节',
  })[role] || '路人';
}

function pickAtWithDist(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(interactives, false);
  if (!hits[0]) return null;
  return { id: hits[0].object.userData.hotspot, dist: hits[0].distance };
}

/* ============================================================
 *  Named NPCs · 接入 Agora 语音对话的 5 个具名角色
 *  每个 NPC 头顶有 sprite 铭牌；点击触发右侧语音面板 (index.html)
 * ============================================================ */
const NAMED_NPCS = [
  {
    personaId: 'libai',
    displayName: '李太白',
    subtitle: '诗仙 · 飞花令',
    pos: [-30, 0.2, 22],
    facing: -0.6,
    build: () => buildPerson({
      robe: 'silkPurple', role: 'scholar', hat: 'scholar',
      tool: 'scroll', pose: 'raise', scale: 1.05,
    }),
    nameColor: '#d8b25a',
  },
  {
    personaId: 'dufu',
    displayName: '杜子美',
    subtitle: '诗圣 · 沉郁顿挫',
    pos: [-22, 0.2, 32],
    facing: -1.2,
    build: () => buildPerson({
      robe: 'wood', role: 'scholar', hat: 'scholar',
      tool: 'staff', pose: 'bend', scale: 0.98,
    }),
    nameColor: '#9a8060',
  },
  {
    personaId: 'wangwei',
    displayName: '王摩诘',
    subtitle: '诗佛 · 诗画对题',
    pos: [30, 0.2, 26],
    facing: 1.8,
    build: () => buildPerson({
      robe: 'white', role: 'scholar', hat: 'scholar',
      tool: 'scroll', scale: 1.0,
    }),
    nameColor: '#a8c8e8',
  },
  {
    personaId: 'tour_guide',
    displayName: '周引之',
    subtitle: '引路使 · 长安导览',
    pos: [2.5, 0.2, 14],
    facing: Math.PI,
    build: () => buildPerson({
      robe: 'silkBlue', role: 'scholar', hat: 'scholar',
      tool: 'scroll', scale: 1.0,
    }),
    nameColor: '#88c8a8',
  },
  {
    personaId: 'gate_guard',
    displayName: '陈忠武',
    subtitle: '朱雀门校尉',
    pos: [-3.5, 0.2, 34],
    facing: 0,
    build: () => buildPerson({
      robe: 'vermillion', role: 'soldier', hat: 'iron',
      tool: 'halberd', armor: true, scale: 1.08,
    }),
    nameColor: '#e08060',
  },
];

// 头顶铭牌 (Sprite + CanvasTexture，永远朝向相机)
function makeNameplate(spec) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 160);
  // 半透明深底
  ctx.fillStyle = 'rgba(20, 16, 12, 0.78)';
  roundRect(ctx, 20, 10, 472, 140, 24); ctx.fill();
  // 金边
  ctx.strokeStyle = spec.nameColor || '#d8b25a';
  ctx.lineWidth = 3;
  roundRect(ctx, 20, 10, 472, 140, 24); ctx.stroke();
  // 主名
  ctx.fillStyle = spec.nameColor || '#f5e2b2';
  ctx.font = 'bold 64px "Songti SC", "STSong", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(spec.displayName, 256, 60);
  // 副标
  ctx.fillStyle = 'rgba(220, 200, 170, 0.85)';
  ctx.font = '28px "PingFang SC", "Hiragino Sans GB", sans-serif';
  ctx.fillText(spec.subtitle, 256, 118);
  // 语音小图标
  ctx.fillStyle = spec.nameColor || '#d8b25a';
  ctx.font = '34px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🎙', 36, 60);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.7, 1);
  sprite.position.y = 2.5;
  sprite.renderOrder = 999;
  return sprite;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 落地光圈 (Cylinder thin disc + emissive ring) — 让玩家从远处也能看到具名 NPC
function makeNpcHalo(color = 0xd8b25a) {
  const g = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(0.55, 0.78, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.6,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(ring);
  // 内圈 (慢呼吸 — 在 animate loop 里调 scale)
  const innerGeo = new THREE.RingGeometry(0.18, 0.34, 24);
  const innerMat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.4,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.05;
  g.add(inner);
  g.userData.haloInner = inner;
  g.userData.haloRing  = ring;
  return g;
}

/* ============================================================
 *  Docent (Gallery female speaker) — 苏阮卿 / 万邦讲席
 *  画馆内为玩家解说真迹的专家女讲席。与街头"周引之"分工:
 *  - 周引之 = 户外随身导览 (常驻)
 *  - 苏阮卿 = 殿堂专家讲席 (玩家入展厅即上场)
 * ============================================================ */
function buildDocentLady() {
  // role:'lady' 自动带披帛、宽袖、silkGold 腰带; 配丁香色绫罗 + 蓝披帛
  const g = buildPerson({
    role: 'lady',
    robe: 'silkPurple',   // 紫罗大袖衫
    pibo: 'silkBlue',     // 蓝披帛飘举
    tool: 'scroll',       // 手里展卷, 暗示"画学博士"
    pose: 'raise',        // 抬手指画动作
    scale: 0.98,
  });
  // 高髻 (Tang lady 唐式望仙髻) — 头顶加一团黑发 + 一支金步摇
  const hairMat = mats.charcoal;
  const buns = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat,
  );
  cap.position.y = 1.12; cap.castShadow = true;
  buns.add(cap);
  // 双髻
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), hairMat);
  knot.position.set(0, 1.22, -0.03); buns.add(knot);
  const knot2 = knot.clone(); knot2.scale.setScalar(0.7);
  knot2.position.set(0.06, 1.27, -0.05); buns.add(knot2);
  // 金步摇 (Tang 金钗)
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6),
    mats.gold,
  );
  pin.position.set(-0.05, 1.24, 0); pin.rotation.z = 0.4;
  buns.add(pin);
  g.add(buns);
  return g;
}

function buildAmbientViewer(robeName, role) {
  // 静态观众 — 不带 personaId、不带 halo、不带 nameplate
  const g = buildPerson({
    robe: robeName || 'silkPink',
    role: role || 'lady',
    pibo: 'silkGold',
    scale: 0.92 + Math.random() * 0.08,
  });
  g.userData.npc = false;            // 不进 allNpcs, 不可点击
  g.userData.ambientViewer = true;   // 标记: 仅展厅装饰
  return g;
}

// 展厅 → 已部署的讲席 / 观众 缓存
const galleryDocents = {}; // gallery_id -> { docent, viewers: [...] }

// 在指定展厅内部署苏阮卿 + 2-3 个观众. 重复调用幂等.
function spawnGalleryDocent(galleryId) {
  if (galleryDocents[galleryId]) return galleryDocents[galleryId];
  const room = galleryRooms[galleryId];
  const def = GALLERIES[galleryId];
  if (!room || !def) return null;

  // 把讲席放在房间中心偏后 (-z 半径 * 0.55), 面朝房门方向 (+z = 入口侧)
  // 这样玩家进门一抬眼就能看见她, 她也"半侧身"对着真迹墙
  const R = room.halfSize;
  const docent = buildDocentLady();
  docent.position.set(
    room.center.x + R * 0.25,         // 偏右一点, 不挡正前方真迹视线
    room.center.y - 3,                // 房间地板比 center 低 H/2 = 3
    room.center.z - R * 0.45,         // 站在房间靠后 1/3 位置
  );
  docent.rotation.y = Math.PI * 0.85;  // 半侧身朝向入口
  docent.userData.npc = true;
  docent.userData.personaId = 'docent';
  docent.userData.displayName = '苏阮卿';
  docent.userData.subtitle = '画学博士 · 万邦讲席';
  docent.userData.basePos = docent.position.clone();
  docent.userData.baseRot = docent.rotation.y;
  docent.userData.idle = Math.random() * Math.PI;
  docent.userData.galleryId = galleryId;
  // 铭牌 + 光圈 (复用 NAMED_NPCS 的视觉语言)
  const plate = makeNameplate({
    displayName: '苏阮卿',
    subtitle: '画学博士 · 万邦讲席',
    nameColor: '#e8c890',
  });
  docent.add(plate);
  const halo = makeNpcHalo(0xe8c890);
  halo.position.copy(docent.position); halo.position.y = docent.position.y - 0.08;
  scene.add(halo);
  docent.userData.halo = halo;
  scene.add(docent);

  // 2-3 个无名观众 (女装为主, 偶尔一名儒生混入)
  const viewerCount = 2 + (def.panels && def.panels.filter(p => p.masterpiece).length ? 1 : 0);
  const robes = ['silkPink', 'silkBlue', 'silkGold', 'silkPurple'];
  const viewers = [];
  for (let i = 0; i < viewerCount; i++) {
    const robe = robes[Math.floor(Math.random() * robes.length)];
    const role = Math.random() < 0.8 ? 'lady' : 'scholar';
    const v = buildAmbientViewer(robe, role);
    // 随机散在房间内, 但远离讲席本人 (避免重叠) + 朝向最近的真迹墙
    const a = (i / viewerCount) * Math.PI * 2 + Math.PI;
    const r = R * (0.45 + Math.random() * 0.2);
    v.position.set(
      room.center.x + Math.sin(a) * r,
      room.center.y - 3,
      room.center.z + Math.cos(a) * r,
    );
    v.rotation.y = Math.atan2(
      room.center.x - v.position.x,
      room.center.z - v.position.z,
    ); // 望向房间中心
    v.userData.idle = Math.random() * Math.PI;
    scene.add(v);
    viewers.push(v);
  }

  // 收集到 allNpcs (虽然展厅模式不响应点击, 但 collectAllNpcs 重扫时不会漏掉)
  if (typeof collectAllNpcs === 'function') collectAllNpcs();

  galleryDocents[galleryId] = { docent, viewers };
  // 若用户已通过衣冠柜给 'docent' 装了 GLB, 这一刻自动套上
  if (typeof attachGlbToNpc === 'function' && typeof MODEL_REGISTRY !== 'undefined' && MODEL_REGISTRY['docent']) {
    attachGlbToNpc(docent, 'docent').catch(err =>
      console.warn('[modelLoader] ✗ docent GLB 接管失败:', err),
    );
  }
  return galleryDocents[galleryId];
}

const namedNpcs = [];
const namedZone = new THREE.Group();
scene.add(namedZone);
for (const spec of NAMED_NPCS) {
  const person = spec.build();
  person.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  person.rotation.y = spec.facing || 0;
  // 关键：覆盖 buildPerson 默认的 npcRole 标签，标记为可语音对话
  person.userData.personaId = spec.personaId;
  person.userData.displayName = spec.displayName;
  person.userData.subtitle = spec.subtitle;
  person.userData.basePos = person.position.clone();
  person.userData.idle = Math.random() * Math.PI;
  // 铭牌
  const plate = makeNameplate(spec);
  person.add(plate);
  // 光圈
  const halo = makeNpcHalo(parseInt((spec.nameColor || '#d8b25a').slice(1), 16));
  halo.position.set(spec.pos[0], 0, spec.pos[2]);
  namedZone.add(halo);
  person.userData.halo = halo;
  namedZone.add(person);
  namedNpcs.push(person);
}
if (typeof window !== 'undefined') window.namedNpcs = namedNpcs;

// ============================================================
// GLB / USDZ 角色接入 (核心管线)
//
// 给任一 NPC group 套上 GLB 模型: 隐藏程序化几何, 保留名牌/光环/对话系统
// 用户工作流: 拖一个 .glb 到游戏窗口, 在弹出的衣冠柜里选角色即可换皮
// 详见 models/README.md
// ============================================================
async function attachGlbToNpc(npc, idOrSpec) {
  if (!npc) return null;
  const char = await loadCharacter(idOrSpec);
  if (!char) return null;
  // 隐藏程序化几何 (但保留 nameplate / halo / userData)
  npc.traverse(o => {
    if (o.isMesh && !o.userData?.keepVisible && !o.userData?.nameplate) {
      o.visible = false;
    }
  });
  // 把 GLB 的 group 挂到 npc 下作为子节点
  char.group.position.set(0, 0, 0);
  npc.add(char.group);
  npc.userData.glbChar = char;
  const id = typeof idOrSpec === 'string' ? idOrSpec : (idOrSpec?.url || 'inline');
  console.log(`[modelLoader] ✓ GLB 已附着到 NPC: personaId=${npc.userData.personaId || '?'} ← ${id}`);
  window.glbCharacters.push({ npc, char });
  return char;
}
if (typeof window !== 'undefined') window.attachGlbToNpc = attachGlbToNpc;

// 任何 namedNpc 在 MODEL_REGISTRY 里已注册的, 自动用 GLB 接管
async function autoAttachRegisteredGlbs() {
  for (const npc of namedNpcs) {
    const pid = npc.userData.personaId;
    if (pid && MODEL_REGISTRY[pid]) {
      try { await attachGlbToNpc(npc, pid); }
      catch (err) { console.warn(`[modelLoader] ✗ ${pid} 接管失败:`, err); }
    }
  }
}
// 延迟一帧, 让其他系统先初始化完
setTimeout(autoAttachRegisteredGlbs, 100);

// ============================================================
// DRAG-AND-DROP GLB + 衣冠柜 (wardrobe) — 让 3D 导入像换衣服一样直接
// 工作流: 拖 .glb 到窗口 → 半透明全屏指引 → 松手 → 弹出选角面板 → 选 → 立刻换皮
// 或: 顶部右上角点 "👘" 按钮 → 打开衣冠柜 → 每个角色都有"上传 / 重置"按钮
// 持久化: 浏览器 localStorage 记得用户的换装, 刷新不丢
// ============================================================

const WARDROBE_SLOTS = [
  { id: 'player',     label: '主角',    role: '玩家角色',         height: 1.85 },
  { id: 'libai',      label: '李太白',  role: '诗仙 · 飞花对诗',  height: 1.75 },
  { id: 'dufu',       label: '杜子美',  role: '诗圣 · 忆苦讲诗',  height: 1.72 },
  { id: 'wangwei',    label: '王摩诘',  role: '诗佛 · 诗画对题',  height: 1.74 },
  { id: 'tour_guide', label: '周引之',  role: '引路使 · 长安导览', height: 1.76 },
  { id: 'gate_guard', label: '陈忠武',  role: '朱雀门守城校尉',   height: 1.84 },
  { id: 'docent',     label: '苏阮卿',  role: '画学博士 · 万邦讲席', height: 1.68 },
];


// === 持久化: 把用户换的装存到 localStorage ===
const WARDROBE_LS_KEY = 'tangChangan_wardrobe_v1';
function _persistWardrobe() {
  try {
    const saved = {};
    for (const s of WARDROBE_SLOTS) {
      const reg = MODEL_REGISTRY[s.id];
      // 保存 http(s) URL; blob URL 跨刷新无效故跳过
      if (reg && reg.url && /^https?:\/\//.test(reg.url)) {
        saved[s.id] = reg;
      }
    }
    localStorage.setItem(WARDROBE_LS_KEY, JSON.stringify(saved));
  } catch (e) { /* localStorage 不可用 */ }
}
function _restoreWardrobe() {
  try {
    const raw = localStorage.getItem(WARDROBE_LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const k of Object.keys(saved)) {
      MODEL_REGISTRY[k] = saved[k];
    }
    if (Object.keys(saved).length) {
      console.log('[wardrobe] 已从 localStorage 恢复', Object.keys(saved).length, '套装');
    }
  } catch (e) { /* ignore */ }
}
_restoreWardrobe();

// === 把 GLB 套到指定 slot (player / libai / dufu / ...) ===
async function applyToSlot(slotId, url, opts = {}) {
  if (!url) return false;
  const slotDef = WARDROBE_SLOTS.find(s => s.id === slotId);
  MODEL_REGISTRY[slotId] = {
    url,
    targetHeight: opts.targetHeight || slotDef?.height || 1.75,
    yOffset: opts.yOffset || 0,
    animationMap: opts.animationMap,
  };
  if (!url.startsWith('blob:')) _persistWardrobe();
  // 找目标 — player → gameState.player; docent → 在每个画廊里都可能有一个化身;
  // 其他 → namedNpcs (固定 5 居民) 里按 personaId 找
  const targets = [];
  if (slotId === 'player') {
    if (gameState && gameState.player) targets.push(gameState.player);
  } else if (slotId === 'docent') {
    // 当前所有已 spawn 的 gallery docent 都要换皮
    if (typeof galleryDocents !== 'undefined') {
      for (const k of Object.keys(galleryDocents)) {
        const d = galleryDocents[k]?.docent;
        if (d) targets.push(d);
      }
    }
  } else {
    const t = namedNpcs.find(n => n.userData.personaId === slotId);
    if (t) targets.push(t);
  }
  if (targets.length === 0) {
    showGameToast(`找不到 ${slotDef?.label || slotId} — ${slotId === 'docent' ? '先进画廊召出讲席' : '可能还没进入游戏'}`, 4000);
    return false;
  }
  let okCount = 0;
  for (const target of targets) {
    // 卸掉旧 GLB
    if (target.userData.glbChar) {
      target.userData.glbChar.dispose?.();
      target.userData.glbChar.group?.parent?.remove(target.userData.glbChar.group);
      window.glbCharacters = window.glbCharacters.filter(e => e.npc !== target);
      target.userData.glbChar = null;
      target.traverse(o => { if (o.isMesh) o.visible = true; });
    }
    // 重新 attach
    const char = await attachGlbToNpc(target, slotId);
    if (char) okCount++;
  }
  if (okCount > 0) {
    showGameToast(`✓ ${slotDef?.label || slotId} 已换装${targets.length > 1 ? ` (×${okCount})` : ''}`, 2500);
    return true;
  }
  showGameToast(`✗ 套用失败 (检查 console 报错)`, 4000);
  return false;
}

async function resetSlot(slotId) {
  const slotDef = WARDROBE_SLOTS.find(s => s.id === slotId);
  delete MODEL_REGISTRY[slotId];
  _persistWardrobe();
  const targets = [];
  if (slotId === 'player') {
    if (gameState && gameState.player) targets.push(gameState.player);
  } else if (slotId === 'docent') {
    if (typeof galleryDocents !== 'undefined') {
      for (const k of Object.keys(galleryDocents)) {
        const d = galleryDocents[k]?.docent;
        if (d) targets.push(d);
      }
    }
  } else {
    const t = namedNpcs.find(n => n.userData.personaId === slotId);
    if (t) targets.push(t);
  }
  for (const target of targets) {
    if (target.userData.glbChar) {
      target.userData.glbChar.dispose?.();
      target.userData.glbChar.group?.parent?.remove(target.userData.glbChar.group);
      window.glbCharacters = window.glbCharacters.filter(e => e.npc !== target);
      target.userData.glbChar = null;
      target.traverse(o => { if (o.isMesh) o.visible = true; });
    }
  }
  showGameToast(`↺ ${slotDef?.label || slotId} 已还原为默认`, 2500);
}

if (typeof window !== 'undefined') {
  window.applyToSlot = applyToSlot;
  window.resetSlot = resetSlot;
}

// === 衣冠柜 UI Panel ===

function openWardrobePanel(opts = {}) {
  let panel = document.getElementById('wardrobePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'wardrobePanel';
    panel.style.cssText = `
      position: fixed; top: 60px; right: 20px; z-index: 9998;
      width: 340px; max-height: 84vh; overflow-y: auto;
      background: rgba(28, 18, 8, 0.97);
      border: 1px solid #6a4226;
      border-radius: 12px;
      padding: 16px;
      font-family: STKaiti, KaiTi, "Songti SC", serif;
      color: #f5d890;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(panel);
  }
  panel.style.display = 'block';

  const slotsHtml = WARDROBE_SLOTS.map(slot => {
    const current = MODEL_REGISTRY[slot.id];
    const isLive = !!(window.glbCharacters || []).find(
      e => e.npc?.userData?.personaId === slot.id,
    );
    let modelName = '默认 (程序化)';
    let modelColor = '#9a8870';
    if (current?.url) {
      if (current.url.startsWith('blob:')) {
        modelName = '🔵 已上传 GLB';
        modelColor = '#d4a04a';
      } else {
        const tail = current.url.split('/').pop();
        modelName = '🌐 ' + tail.slice(0, 28) + (tail.length > 28 ? '…' : '');
        modelColor = '#d4a04a';
      }
    }
    const isPending = opts.pendingUrl;
    const applyLabel = isPending ? '套用此 GLB' : '上传 GLB';
    return `
      <div data-slot="${slot.id}" style="
        margin-bottom: 10px; padding: 10px 12px;
        background: rgba(255, 215, 144, 0.06);
        border: 1px solid ${isLive ? '#caa050' : '#3a2818'};
        border-radius: 8px;
      ">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <div style="font-size: 15px; font-weight: bold;">${slot.label}</div>
          <div style="font-size: 11px; opacity: 0.6;">${slot.role}</div>
        </div>
        <div style="font-size: 11px; margin-top: 4px; color: ${modelColor};">
          当前: ${modelName}
        </div>
        <div style="margin-top: 8px; display: flex; gap: 6px;">
          <button data-action="apply" data-slot="${slot.id}"
            style="flex:1; padding:5px 10px; border-radius:5px;
                   background:${isPending ? '#caa050' : 'rgba(202,160,80,0.7)'};
                   border:none; cursor:pointer; color:#1a0f08;
                   font-size:12px; font-family:inherit; font-weight:bold;">
            ${applyLabel}
          </button>
          <button data-action="reset" data-slot="${slot.id}"
            style="padding:5px 10px; border-radius:5px;
                   background:transparent; border:1px solid #5a3a22;
                   cursor:pointer; color:#f5d890; font-size:12px; font-family:inherit;">
            ↺
          </button>
        </div>
      </div>
    `;
  }).join('');

  const pendingHtml = opts.pendingUrl
    ? `<div style="padding: 12px; margin-bottom: 12px;
         background: rgba(212,160,74,0.18);
         border: 1px solid #caa050; border-radius: 8px;
         font-size: 13px;">
         📦 已接收: <b>${opts.pendingFile.name}</b>
         <span style="opacity:0.6; font-size:11px;">
           (${(opts.pendingFile.size / 1024 / 1024).toFixed(2)} MB)
         </span><br>
         <span style="opacity:0.75; font-size:11px;">点击下方"套用此 GLB"分发给某个角色 ↓</span>
       </div>`
    : `<div style="padding: 10px; margin-bottom: 12px;
         background: rgba(255,215,144,0.04);
         border: 1px dashed #5a3a22; border-radius: 8px;
         font-size: 12px; text-align: center; opacity: 0.8;">
         💡 拖 .glb / .gltf / .usdz 到窗口任意处<br>
         <span style="opacity:0.6; font-size:11px;">或点角色卡的"上传 GLB"</span>
       </div>`;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
      <div style="font-size: 18px; font-weight: bold;">👘 衣冠柜</div>
      <button id="wardrobeClose" style="background:none; border:none;
        color:#f5d890; font-size:22px; cursor:pointer; line-height:1;">×</button>
    </div>
    ${pendingHtml}
    ${slotsHtml}
    <div style="margin-top: 14px; padding-top: 10px;
      border-top: 1px solid #3a2818; font-size: 11px; opacity: 0.55; line-height: 1.5;">
      把自己的 <code>.glb</code> / <code>.gltf</code> / <code>.usdz</code> 文件拖进窗口即可换皮。
    </div>
  `;

  panel.querySelector('#wardrobeClose').onclick = () => {
    panel.style.display = 'none';
    if (opts.pendingUrl) URL.revokeObjectURL(opts.pendingUrl);
  };

  panel.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = async () => {
      const slot = btn.dataset.slot;
      const action = btn.dataset.action;
      if (action === 'apply') {
        if (opts.pendingUrl) {
          // 有待分发的文件 → 直接套
          await applyToSlot(slot, opts.pendingUrl);
          opts.pendingUrl = null;
          opts.pendingFile = null;
          openWardrobePanel(); // 刷新
        } else {
          // 没文件 → 弹文件选择器
          const inp = document.createElement('input');
          inp.type = 'file';
          inp.accept = '.glb,.gltf,.usdz';
          inp.onchange = async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            await applyToSlot(slot, URL.createObjectURL(f));
            openWardrobePanel(); // 刷新
          };
          inp.click();
        }
      } else if (action === 'reset') {
        await resetSlot(slot);
        openWardrobePanel(); // 刷新
      }
    };
  });
}
if (typeof window !== 'undefined') window.openWardrobePanel = openWardrobePanel;

// === 浮动入口按钮 (👘) 右上角 ===
(function buildWardrobeButton() {
  const btn = document.createElement('button');
  btn.id = 'wardrobeBtn';
  btn.title = '衣冠柜 — 给角色换 3D 模型';
  btn.textContent = '👘';
  btn.style.cssText = `
    position: fixed; top: 16px; right: 80px; z-index: 9997;
    width: 40px; height: 40px;
    border-radius: 20px;
    background: rgba(28, 18, 8, 0.85);
    border: 1px solid #6a4226;
    color: #f5d890;
    font-size: 20px;
    cursor: pointer;
    transition: transform 0.15s, background 0.2s;
    backdrop-filter: blur(6px);
  `;
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; btn.style.background = 'rgba(58, 38, 18, 0.95)'; };
  btn.onmouseleave = () => { btn.style.transform = 'scale(1.0)'; btn.style.background = 'rgba(28, 18, 8, 0.85)'; };
  btn.onclick = () => {
    const panel = document.getElementById('wardrobePanel');
    if (panel && panel.style.display !== 'none') {
      panel.style.display = 'none';
    } else {
      openWardrobePanel();
    }
  };
  document.body.appendChild(btn);
})();

// ============================================================
// 头顶字幕气泡 (overhead subtitle) — 让 NPC 真正"开口说话"
// 把 voice-agent iframe 流式投递的 transcript 渲染成飘在 NPC 头顶的唐风卷轴.
// 流式更新: 每次新 chunk 来就重画 canvas (texture.needsUpdate=true), 不重建 sprite.
// 自动隐藏: AI 说完 (status=end) 8 秒后淡出; 新 turn 来时立刻接管 (覆盖上一条).
// ============================================================

const OVERHEAD_SUBS = new Map();  // personaId -> { sprite, canvas, ctx, tex, target, currentTurn, lastUpdateAt, hideTimer }
const OVERHEAD_MAX_CHARS = 70;    // 单卷轴显示上限, 超过截前面 (聊天气泡看最近 70 字)
const OVERHEAD_FADE_AFTER_FINAL_MS = 8000;
const OVERHEAD_FADE_AFTER_STALE_MS = 18000;  // partial 卡住 18s 也清

function _findNpcByPersona(personaId) {
  // 先看 namedNpcs (5 居民)
  let t = (typeof namedNpcs !== 'undefined')
    ? namedNpcs.find(n => n.userData?.personaId === personaId)
    : null;
  if (t) return t;
  // docent: 找所有画廊里的化身, 用"离玩家最近"那个 (一般只会有一个 active)
  if (personaId === 'docent' && typeof galleryDocents !== 'undefined') {
    const cands = [];
    for (const k of Object.keys(galleryDocents)) {
      const d = galleryDocents[k]?.docent;
      if (d) cands.push(d);
    }
    if (cands.length === 1) return cands[0];
    if (cands.length > 1 && gameState?.player) {
      let best = null, bd = Infinity;
      const pp = gameState.player.position;
      for (const d of cands) {
        const dd = d.position.distanceToSquared(pp);
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    }
    return cands[0] || null;
  }
  return null;
}

function _wrapTextLines(ctx, text, maxWidth) {
  // 简易中文/英文混排断行: 中文按字断, 英文遇空格断
  const lines = [];
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function _ensureOverheadSprite(personaId, target) {
  let entry = OVERHEAD_SUBS.get(personaId);
  if (entry && entry.target === target && entry.sprite.parent === target) return entry;
  // 若 target 变了 (eg. docent 在另一展厅重 spawn), 拆掉旧的
  if (entry && entry.sprite && entry.sprite.parent) {
    entry.sprite.parent.remove(entry.sprite);
    entry.tex?.dispose();
    entry.sprite.material?.dispose();
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 0,
    depthTest: false, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.6, 1.35, 1);  // 比 nameplate 大, 字幕需要可读
  sprite.position.y = 3.55;        // 在 nameplate (2.5) 上方
  sprite.renderOrder = 1000;
  target.add(sprite);
  entry = {
    sprite, canvas, ctx, tex, target,
    currentTurn: null, lastUpdateAt: 0,
    hideTimer: null, targetOpacity: 0,
  };
  OVERHEAD_SUBS.set(personaId, entry);
  return entry;
}

function _redrawOverhead(entry, text, opts) {
  const { canvas, ctx, tex } = entry;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  // 卷轴底
  ctx.fillStyle = 'rgba(28, 18, 10, 0.88)';
  roundRect(ctx, 24, 24, W - 48, H - 48, 28); ctx.fill();
  // 金边
  ctx.strokeStyle = '#caa050';
  ctx.lineWidth = 4;
  roundRect(ctx, 24, 24, W - 48, H - 48, 28); ctx.stroke();
  // 双线内嵌
  ctx.strokeStyle = 'rgba(212, 160, 74, 0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 38, 38, W - 76, H - 76, 22); ctx.stroke();
  // 左上"对话"小印章 (汉字"言"的方印感)
  ctx.fillStyle = '#caa050';
  ctx.font = 'bold 38px "Songti SC", "STSong", serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('言', 54, 50);
  // 主体文字
  ctx.fillStyle = '#f5e2b2';
  ctx.font = '46px "Songti SC", "STSong", "Hiragino Sans GB", serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // 取最后 OVERHEAD_MAX_CHARS 字符 (流式增长时只看最近的)
  const shown = text.length > OVERHEAD_MAX_CHARS
    ? '…' + text.slice(-OVERHEAD_MAX_CHARS)
    : text;
  const lines = _wrapTextLines(ctx, shown, W - 200);  // 左缩进留印章
  // 至多 4 行, 超过的截掉前面
  const visibleLines = lines.slice(-4);
  const lineH = 60;
  const startY = H - 60 - visibleLines.length * lineH;
  for (let i = 0; i < visibleLines.length; i++) {
    ctx.fillText(visibleLines[i], 130, startY + i * lineH);
  }
  // 流式状态: 末尾画个跳动小光点
  if (!opts?.finalized) {
    const dotX = 130 + ctx.measureText(visibleLines[visibleLines.length - 1] || '').width + 10;
    const dotY = startY + (visibleLines.length - 1) * lineH + 30;
    const t = (Date.now() % 1000) / 1000;
    ctx.fillStyle = `rgba(212, 160, 74, ${0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI))})`;
    ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, Math.PI * 2); ctx.fill();
  }
  tex.needsUpdate = true;
}

function showOverheadSubtitle(personaId, text, opts) {
  if (!personaId || !text) return;
  const target = _findNpcByPersona(personaId);
  if (!target) return;  // NPC 不在场就静默丢弃
  const entry = _ensureOverheadSprite(personaId, target);
  // 新 turn → 重置, 老 turn → 流式更新同一条
  if (opts?.turn && entry.currentTurn !== opts.turn) {
    entry.currentTurn = opts.turn;
  }
  entry.lastUpdateAt = Date.now();
  _redrawOverhead(entry, text, opts);
  // 淡入
  entry.targetOpacity = 0.95;
  // 取消上次的 hideTimer
  if (entry.hideTimer) { clearTimeout(entry.hideTimer); entry.hideTimer = null; }
  // 排定淡出: finalized → 8s 后淡出; 否则 18s safety 清理
  const delay = opts?.finalized ? OVERHEAD_FADE_AFTER_FINAL_MS : OVERHEAD_FADE_AFTER_STALE_MS;
  entry.hideTimer = setTimeout(() => {
    entry.targetOpacity = 0;
  }, delay);
}

function _tickOverheadSubtitles(dt) {
  // 平滑插值 opacity → targetOpacity; 完全淡出后从场景拆掉以省内存
  for (const [pid, entry] of OVERHEAD_SUBS) {
    const cur = entry.sprite.material.opacity;
    const tgt = entry.targetOpacity;
    if (Math.abs(cur - tgt) > 0.005) {
      entry.sprite.material.opacity = THREE.MathUtils.lerp(cur, tgt, Math.min(1, dt * 4));
    }
    if (tgt === 0 && entry.sprite.material.opacity < 0.02) {
      if (entry.sprite.parent) entry.sprite.parent.remove(entry.sprite);
      entry.tex?.dispose();
      entry.sprite.material?.dispose();
      OVERHEAD_SUBS.delete(pid);
      continue;
    }
    // 流式中 → 每帧重画以让光点闪烁 (廉价: 同一 canvas, texture.needsUpdate)
    if (entry.targetOpacity > 0 && entry.currentTurn && Date.now() - entry.lastUpdateAt < 200) {
      // recently updated, skip extra redraw
    }
  }
}

if (typeof window !== 'undefined') {
  window.showOverheadSubtitle = showOverheadSubtitle;
  window.OVERHEAD_SUBS = OVERHEAD_SUBS;
  // 调试: 在 console 跑 demoOverhead('libai', '飞流直下三千尺, 疑是银河落九天')
  window.demoOverhead = (pid, txt) => showOverheadSubtitle(pid, txt, { finalized: true, turn: 'demo-' + Date.now() });
  // URL ?overhead-demo=1 → 4 秒后给 5 个语音 NPC 各飘一段诗, 之后每 12s 重发一轮
  // (QA 友好, 不必跑语音; 进游戏走到 NPC 跟前就能看到头顶卷轴)
  if (typeof window.location !== 'undefined'
      && (window.location.search.includes('overhead-demo')
          || window.location.hash.includes('overhead-demo'))) {
    const samples = {
      libai:      '床前明月光, 疑是地上霜。 举头望明月, 低头思故乡。',
      dufu:       '国破山河在, 城春草木深。 感时花溅泪, 恨别鸟惊心。',
      wangwei:    '空山新雨后, 天气晚来秋。 明月松间照, 清泉石上流。',
      tour_guide: '客从远来? 此乃朱雀大街, 北接皇城朱雀门, 南达明德门, 长安最壮观的中轴。',
      gate_guard: '止步! 朱雀门重地, 进城需亮过所; 若是求见达官, 须先到鸿胪寺递书。',
    };
    const round = () => {
      let i = 0;
      for (const pid of Object.keys(samples)) {
        setTimeout(() => {
          showOverheadSubtitle(pid, samples[pid], { finalized: true, turn: 'demo-' + pid + '-' + Date.now() });
        }, i++ * 300);
      }
    };
    setTimeout(() => {
      round();
      console.log('[overhead-demo] 已给 5 个 NPC 各飘一段诗 (每 12s 一轮, 持续中)');
      setInterval(round, 12000);
    }, 4000);
  }
}

// === 全屏 Drag-and-Drop overlay ===
(function setupGlbDragDrop() {
  let overlay = null;
  let dragDepth = 0;
  const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'glbDropOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(20, 10, 5, 0.78);
      display: none; align-items: center; justify-content: center;
      pointer-events: none;
      backdrop-filter: blur(8px);
      transition: opacity 0.18s;
    `;
    overlay.innerHTML = `
      <div style="
        border: 3px dashed #d4a04a;
        padding: 56px 88px; border-radius: 18px;
        text-align: center;
        font-family: STKaiti, KaiTi, serif;
        color: #f5d890;
        background: rgba(28, 18, 8, 0.55);
      ">
        <div style="font-size: 72px; margin-bottom: 12px;">⬇</div>
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 6px;">松手以载入 3D 模型</div>
        <div style="font-size: 13px; opacity: 0.65;">支持 .glb / .gltf / .usdz · 自动播放动画</div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  };
  document.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth++;
    e.preventDefault();
    const ov = ensureOverlay();
    ov.style.display = 'flex';
  });
  document.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  });
  document.addEventListener('dragleave', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0 && overlay) overlay.style.display = 'none';
  });
  document.addEventListener('drop', async (e) => {
    dragDepth = 0;
    if (overlay) overlay.style.display = 'none';
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['glb', 'gltf', 'usdz'].includes(ext)) {
      showGameToast(`不支持的格式: .${ext} — 请用 .glb / .gltf / .usdz`, 4000);
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    showGameToast(`📦 已接收 ${file.name} — 选个角色套上`, 2500);
    openWardrobePanel({ pendingFile: file, pendingUrl: blobUrl });
  });
})();


// 收集所有 NPC (运行时初始化一次)
const allNpcs = [];
const _tmpV = new THREE.Vector3();
function collectAllNpcs() {
  allNpcs.length = 0;
  scene.traverse(o => {
    if (o.userData && o.userData.npc) allNpcs.push(o);
  });
  if (typeof window !== 'undefined') window.allNpcs = allNpcs;
}
// 通过屏幕距离匹配 NPC (raycast 对小物体易 miss)
function pickNpcAtWithDist(clientX, clientY) {
  if (allNpcs.length === 0) collectAllNpcs();
  const rect = renderer.domElement.getBoundingClientRect();
  const cw = rect.width, ch = rect.height;
  let best = null, bestScore = Infinity;
  for (const npc of allNpcs) {
    if (!npc.visible) continue;
    npc.getWorldPosition(_tmpV);
    _tmpV.y += 0.5;  // 身体中部
    const v = _tmpV.clone().project(camera);
    if (v.z > 1 || v.z < -1) continue;
    const sx = (v.x * 0.5 + 0.5) * cw + rect.left;
    const sy = (-v.y * 0.5 + 0.5) * ch + rect.top;
    const dx = sx - clientX, dy = sy - clientY;
    const pxDist = Math.hypot(dx, dy);
    if (pxDist > 32) continue;  // 32 像素半径内
    // 综合距离 (像素距离 + 远处衰减)
    const worldDist = camera.position.distanceTo(_tmpV);
    const score = pxDist + worldDist * 0.01;
    if (score < bestScore) { bestScore = score; best = npc; }
  }
  if (!best) return null;
  best.getWorldPosition(_tmpV);
  return { npc: best, dist: camera.position.distanceTo(_tmpV) };
}

renderer.domElement.addEventListener('click', (e) => {
  // 在 FPS / Gallery 模式下，点击只用于 pointerlock，跳过 hotspot/NPC 拾取
  if (gameState.active && (gameState.viewMode === 'fps' || gameState.viewMode === 'gallery')) return;
  const hot = pickAtWithDist(e.clientX, e.clientY);
  const npcHit = pickNpcAtWithDist(e.clientX, e.clientY);
  // 比较距离 — NPC 优先 (因为它们更具体)
  let pickHot = false, pickNpc = false;
  if (hot && npcHit) {
    // 如果热点比 NPC 近 2 单位以上则取热点
    if (hot.dist + 2 < npcHit.dist) pickHot = true; else pickNpc = true;
  } else if (hot) pickHot = true;
  else if (npcHit) pickNpc = true;

  if (pickHot) {
    const id = hot.id;
    const h = HOTSPOTS.find(x => x.id === id);
    showTooltip(h, e.clientX, e.clientY);
    if (!visitedSpots.has(id)) {
      visitedSpots.add(id);
      updateProgress();
    }
    return;
  }
  if (pickNpc) {
    // 具名 NPC (李白/杜甫/王维/周引之/陈忠武) → 触发右侧语音面板
    if (npcHit.npc.userData && npcHit.npc.userData.personaId) {
      openVoicePanel(npcHit.npc);
      return;
    }
    showNpcBubble(npcHit.npc, e.clientX, e.clientY);
    return;
  }
  hideTooltip();
});

/* ============================================================
 *  Voice Panel — 嵌入 tang-voice-agent iframe (Agora ConvoAI)
 * ============================================================ */
const VOICE_AGENT_ORIGIN = (typeof window !== 'undefined' && window.TANG_VOICE_ORIGIN)
  || 'http://localhost:3000';
const voicePanelState = { open: false, personaId: null };

/* ============================================================
 *  Portrait Panel — 左侧 AI 形象视频窗
 *  约定:  portraits/<personaId>/intro.mp4     (开场有声, 播一次)
 *         portraits/<personaId>/idle.mp4      (默认静音循环)
 *         portraits/<personaId>/talking.mp4   (AI 说话时 crossfade 切上来)
 *         portraits/<personaId>/idle.jpg/png  (视频缺失时的静态 fallback)
 *  全缺失时落到 SVG/CSS 占位卡, 永远不破图.
 * ============================================================ */
const PORTRAIT_BASE = 'portraits';
const PORTRAIT_META = {
  libai:      { name: '李太白', sub: '诗仙 · 唐 · 长安',       glyph: '诗' },
  dufu:       { name: '杜子美', sub: '诗圣 · 唐 · 长安',       glyph: '诗' },
  wangwei:    { name: '王摩诘', sub: '诗佛 · 唐 · 长安',       glyph: '禅' },
  tour_guide: { name: '周引之', sub: '引路使 · 长安导览',      glyph: '引' },
  gate_guard: { name: '陈忠武', sub: '朱雀门校尉',             glyph: '武' },
  docent:     { name: '苏阮卿', sub: '画学博士 · 万邦讲席',    glyph: '画' },
  brand_docent:   { name: '智机使',        sub: '天枢府特使 · AI 品牌街讲席', glyph: '智' },
  brand_agora:    { name: '智机使 · Agora 馆', sub: '实时音视频 · ConvoAI', glyph: 'A' },
  brand_claude:   { name: '智机使 · 翰派', sub: 'Claude · Anthropic 馆 · 长卷长上下文派', glyph: '翰' },
  brand_openai:   { name: '智机使 · 元派', sub: 'OpenAI 馆 · 开门人', glyph: '元' },
  brand_chatgpt:  { name: '智机使 · 万民派', sub: 'ChatGPT 馆 · 亿人对话产品', glyph: '问' },
  brand_deepseek: { name: '智机使 · 玄铁派', sub: 'DeepSeek 深度求索馆 · 开源工程派', glyph: '玄' },
  brand_minimax:  { name: '智机使 · 海螺派', sub: 'MiniMax 馆 · 多模态派', glyph: '海' },
  brand_kimi:     { name: '智机使 · 月暗派', sub: 'Kimi · 月之暗面馆 · 长文本派', glyph: '月' },
  brand_qwen:     { name: '智机使 · 千问派', sub: 'Qwen · 通义千问馆 · 全尺寸开源派', glyph: '千' },
  brand_zhipu:    { name: '智机使 · 清谱派', sub: '智谱 · ChatGLM 馆 · 清华系国产基模', glyph: '谱' },
};
const portraitState = { personaId: null, talking: false, introPlaying: false };

function stopPortraitIntro() {
  const panel = document.getElementById('portraitPanel');
  const intro = document.getElementById('portraitVideoIntro');
  if (panel) panel.classList.remove('intro-playing');
  if (intro) {
    try { intro.pause(); } catch(e) {}
    intro.currentTime = 0;
  }
  portraitState.introPlaying = false;
}

function playPortraitIntro() {
  const panel = document.getElementById('portraitPanel');
  const intro = document.getElementById('portraitVideoIntro');
  if (!panel || !intro || intro.style.display === 'none' || !intro.src) return;

  intro.loop = false;
  intro.muted = false;
  intro.volume = 1;
  intro.currentTime = 0;
  panel.classList.add('intro-playing');
  portraitState.introPlaying = true;

  const onEnd = () => {
    intro.removeEventListener('ended', onEnd);
    panel.classList.remove('intro-playing');
    portraitState.introPlaying = false;
    const idle = document.getElementById('portraitVideoIdle');
    try { idle && idle.play(); } catch(e) {}
  };
  intro.addEventListener('ended', onEnd);

  const p = intro.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      // 浏览器可能阻止非用户手势触发的有声 autoplay；这时退回静音 idle，不破坏对话流程。
      intro.removeEventListener('ended', onEnd);
      panel.classList.remove('intro-playing');
      portraitState.introPlaying = false;
      if (typeof showGameToast === 'function') {
        showGameToast('浏览器拦截了开场有声播放 · 点击人物后可播放', 2200);
      }
    });
  }
}

function openPortraitPanel(personaId, opts) {
  const panel = document.getElementById('portraitPanel');
  if (!panel || !personaId) return;
  const meta = PORTRAIT_META[personaId] || { name: personaId, sub: '', glyph: '⛧' };
  const name  = (opts && opts.name)  || meta.name;
  const sub   = (opts && opts.sub)   || meta.sub;
  const glyph = (opts && opts.glyph) || meta.glyph;

  // header
  document.getElementById('portraitPanelName').textContent = name;
  document.getElementById('portraitPanelSub').textContent  = sub;
  // placeholder (永远在最底, 视频/fallback 失败时透出)
  document.getElementById('portraitPlaceholderGlyph').textContent = glyph;
  document.getElementById('portraitPlaceholderName').textContent  = name;
  document.getElementById('portraitPlaceholderRole').textContent  = sub;

  const idle = document.getElementById('portraitVideoIdle');
  const talk = document.getElementById('portraitVideoTalking');
  const intro = document.getElementById('portraitVideoIntro');
  const fb   = document.getElementById('portraitFallback');

  // 切换 persona → 重新装载视频; 同 persona 重开则不重装 (避免视频跳回 0s)
  if (portraitState.personaId !== personaId) {
    const introSrc = `${PORTRAIT_BASE}/${personaId}/intro.mp4`;
    const idleSrc = `${PORTRAIT_BASE}/${personaId}/idle.mp4`;
    const talkSrc = `${PORTRAIT_BASE}/${personaId}/talking.mp4`;
    const stillJpgSrc = `${PORTRAIT_BASE}/${personaId}/idle.jpg`;
    const stillPngSrc = `${PORTRAIT_BASE}/${personaId}/idle.png`;

    // 错误时静默隐藏 — 让下一层 (fallback img / placeholder) 显出来
    intro.onerror = () => { intro.style.display = 'none'; };
    idle.onerror = () => { idle.style.display = 'none'; };
    talk.onerror = () => { talk.style.display = 'none'; };
    fb.onerror   = () => {
      if (fb.dataset.retryPng !== '1') {
        fb.dataset.retryPng = '1';
        fb.src = stillPngSrc;
      } else {
        fb.style.display = 'none';
      }
    };

    intro.style.display = '';
    idle.style.display = '';
    talk.style.display = '';
    fb.style.display   = '';
    fb.dataset.retryPng = '';

    intro.src = introSrc;
    idle.src = idleSrc;
    talk.src = talkSrc;
    fb.src   = stillJpgSrc;
    intro.load();
    idle.load();
    talk.load();
    // muted autoplay 不需要用户手势, 但还是 try/catch 以防浏览器策略
    idle.play().catch(() => {});
  }

  portraitState.personaId = personaId;
  setPortraitTalking(false);
  panel.classList.add('show');
  if (!opts || opts.playIntro !== false) {
    // 轻微延迟: 先让 panel 滑入, 再播放开场有声视频。
    setTimeout(() => {
      if (portraitState.personaId === personaId && !portraitState.talking) playPortraitIntro();
    }, 180);
  }
}

function closePortraitPanel() {
  const panel = document.getElementById('portraitPanel');
  if (panel) {
    panel.classList.remove('show');
    panel.classList.remove('talking');
  }
  const idle = document.getElementById('portraitVideoIdle');
  const talk = document.getElementById('portraitVideoTalking');
  const intro = document.getElementById('portraitVideoIntro');
  try { idle && idle.pause(); } catch(e) {}
  try { talk && talk.pause(); } catch(e) {}
  try { intro && intro.pause(); } catch(e) {}
  portraitState.personaId = null;
  portraitState.talking = false;
  portraitState.introPlaying = false;
}

function setPortraitTalking(isTalking) {
  const panel = document.getElementById('portraitPanel');
  const idle  = document.getElementById('portraitVideoIdle');
  const talk  = document.getElementById('portraitVideoTalking');
  if (!panel || !idle || !talk) return;
  portraitState.talking = !!isTalking;

  // AI 开始说话时停止开场视频, 语音输出优先级最高。
  if (isTalking) stopPortraitIntro();

  // 没准备好就不切 — 避免没有 talking.mp4 时把 idle 切空, 落到占位卡
  const talkReady = talk.readyState >= 2 && !talk.error && talk.style.display !== 'none';
  if (isTalking && talkReady) {
    panel.classList.add('talking');
    try { talk.currentTime = 0; talk.play(); } catch(e) {}
  } else {
    panel.classList.remove('talking');
    try { idle.play(); } catch(e) {}
  }
}

if (typeof window !== 'undefined') {
  window.openPortraitPanel  = openPortraitPanel;
  window.closePortraitPanel = closePortraitPanel;
  window.setPortraitTalking = setPortraitTalking;

  // 调试钩子: ?previewPortrait=libai  → 加载完毕后自动弹左侧面板, 方便核查 CSS
  // ?previewPortrait=libai&previewTalking=1 → 同上, 但进 talking 状态
  try {
    const _qs = new URLSearchParams(window.location.search);
    const _pp = _qs.get('previewPortrait');
    if (_pp) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          openPortraitPanel(_pp);
          if (_qs.get('previewTalking') === '1') setPortraitTalking(true);
        }, 400);
      });
    }
    // 调试钩子: ?cam=pingkang | liyuan | dongshi | ranfang | overview  → 把 orbit 相机对准对应 zone
    // 仅在 dev 截图/核查时使用, 不影响正常游玩
    const _cam = _qs.get('cam');
    if (_cam) {
      const _applyCam = () => {
        try {
          if (_cam === 'pingkang') {
            controls.target.set(38, 1, -12);
            camera.position.set(58, 28, 8);
            camera.zoom = 1.7;
          } else if (_cam === 'liyuan') {
            controls.target.set(15, 1, 45);
            camera.position.set(35, 26, 65);
            camera.zoom = 1.7;
          } else if (_cam === 'dongshi') {
            // Round 2A · 东市胡商集珍 (35, 5)
            controls.target.set(35, 1, 5);
            camera.position.set(15, 26, 26);
            camera.zoom = 1.65;
          } else if (_cam === 'ranfang') {
            // Round 2B · 染坊织绣 (-45, 30) — 从东北俯瞰看彩缎森林 + 染缸
            controls.target.set(-45, 1, 30);
            camera.position.set(-28, 24, 48);
            camera.zoom = 1.6;
          } else if (_cam === 'yanwu') {
            // Round 3A · 演武校场 (-32, -28) — 从东南俯瞰, 看校阅台 + 5 弓箭靶
            controls.target.set(-32, 1, -28);
            camera.position.set(-12, 22, -8);
            camera.zoom = 1.6;
          } else if (_cam === 'guozijian') {
            // Round 3B · 国子监 (15, -32) — 从南俯瞰, 看大成殿 + 碑林 + 牌坊
            camera.position.set(15, 22, -10);
            controls.target.set(15, 1, -32);
            camera.zoom = 1.7;
          } else if (_cam === 'maqiu') {
            // Round 3C · 马球场 (50, -25) — 从南俯瞰, 看椭圆场 + 4 马 + 双门
            controls.target.set(50, 1, -25);
            camera.position.set(50, 24, -3);
            camera.zoom = 1.5;
          } else if (_cam === 'daoguan') {
            // Round 3D · 玄都观 (-15, 55) — 从东南俯瞰, 看八卦亭 + 太极图
            controls.target.set(-15, 1, 55);
            camera.position.set(5, 22, 72);
            camera.zoom = 1.65;
          } else if (_cam === 'honglu') {
            // Round 4A · 鸿胪寺 (52, 12) — 从南俯瞰, 看朱红院墙 + 通译厅 + 5 使节
            controls.target.set(52, 1, 12);
            camera.position.set(52, 22, 30);
            camera.zoom = 1.55;
          } else if (_cam === 'huji') {
            // Round 4B · 西明胡寺 (-34, 18) — 从南俯瞰, 看 3 异域祠庙 (祆/景/摩尼)
            controls.target.set(-34, 1.5, 18);
            camera.position.set(-34, 18, 32);
            camera.zoom = 1.5;
          } else if (_cam === 'taiyi') {
            // Round 4C · 太医署 (18, 14) — 从南俯瞰, 看药圃 + 主厅 + 百子柜
            controls.target.set(18, 1, 14);
            camera.position.set(18, 22, 28);
            camera.zoom = 1.55;
          } else if (_cam === 'sitian') {
            // Round 4D · 司天监 (-42, -8) — 从东南俯瞰, 看三层石台 + 浑天仪 + 漏壶
            controls.target.set(-42, 2, -8);
            camera.position.set(-26, 18, 8);
            camera.zoom = 1.55;
          } else if (_cam === 'overview') {
            controls.target.set(0, 1, 8);
            camera.position.set(60, 90, 110);
            camera.zoom = 0.45;
          }
          camera.updateProjectionMatrix();
          controls.update();
          console.log('[cam debug] applied:', _cam);
        } catch (e) { console.warn('[cam debug]', e); }
      };
      // 立即应用一次, 同时挂 load 兜底 (避免 OrbitControls 后续覆盖)
      setTimeout(_applyCam, 100);
      setTimeout(_applyCam, 800);
      setTimeout(_applyCam, 2000);
      if (document.readyState === 'complete') {
        setTimeout(_applyCam, 100);
      } else {
        window.addEventListener('load', () => setTimeout(_applyCam, 100));
      }
    }
  } catch (e) {}
}

function openVoicePanel(npc) {
  const panel = document.getElementById('voicePanel');
  const frame = document.getElementById('voiceFrame');
  const nameEl = document.getElementById('voicePanelName');
  const subEl  = document.getElementById('voicePanelSubtitle');
  if (!panel || !frame) {
    console.warn('[voice] panel DOM missing — index.html 未注入 #voicePanel');
    return;
  }
  // FPS 模式下需要释放指针锁定, 否则用户根本无法点击面板里的麦克风按钮
  if (typeof fpsControls !== 'undefined' && fpsControls && fpsControls.isLocked) {
    fpsControls.unlock();
  }
  const personaId = npc.userData.personaId;
  // 同一个 persona 已在面板里 → 仅高亮，不重建 iframe (避免打断对话)
  if (voicePanelState.open && voicePanelState.personaId === personaId) {
    panel.classList.add('flash');
    setTimeout(() => panel.classList.remove('flash'), 600);
    return;
  }
  if (nameEl) nameEl.textContent = npc.userData.displayName || personaId;
  if (subEl)  subEl.textContent  = npc.userData.subtitle || '';
  const url = `${VOICE_AGENT_ORIGIN}/?persona=${encodeURIComponent(personaId)}&autoStart=1&embed=1`;
  // 重要：每次切换 persona 都重建 iframe，保证旧 RTC/Agora 资源被销毁
  frame.src = url;
  panel.classList.add('show');
  voicePanelState.open = true;
  voicePanelState.personaId = personaId;
  // 左侧肖像面板同步出场, 复用 npc 的 displayName/subtitle 覆盖 PORTRAIT_META 默认值
  openPortraitPanel(personaId, {
    name: npc.userData.displayName,
    sub:  npc.userData.subtitle,
  });
  // 游戏模式中 → 启动对话取景, NPC 转身面向玩家
  beginDialogueFraming(npc);
}

function closeVoicePanel() {
  const panel = document.getElementById('voicePanel');
  const frame = document.getElementById('voiceFrame');
  if (panel) panel.classList.remove('show');
  if (frame) frame.src = 'about:blank';  // 销毁子页面 → 断开 RTC
  voicePanelState.open = false;
  voicePanelState.personaId = null;
  // 同步关闭左侧肖像
  closePortraitPanel();
  // 解除对话取景, 还原视角 + NPC 回到原姿
  endDialogueFraming();
}

/* ============================================================
 *  Dialogue Framing — 互动时让 NPC 面向玩家 + 镜头切到 3/4 取景
 * ============================================================ */
function beginDialogueFraming(npc) {
  if (!gameState.active || !npc) return;
  // FPS 下不抢镜，但 NPC 依然转身
  const inOrtho = gameState.viewMode === 'tps';
  gameState.dialogueFraming.active = inOrtho;
  gameState.dialogueFraming.npc = npc;
  gameState.dialogueFraming.savedCameraMode = gameState.cameraMode;
  gameState.dialogueFraming.savedNpcRot = npc.rotation.y;
  // 即便不在 ortho (FPS) 也至少让 NPC 转向
  if (gameState.player) {
    const np = npc.position, pp = gameState.pos;
    const targetRot = Math.atan2(pp.x - np.x, pp.z - np.z);
    gameState.dialogueFraming.npcTargetRot = targetRot;
  }
}

function endDialogueFraming() {
  if (!gameState.dialogueFraming.active && !gameState.dialogueFraming.npc) return;
  const f = gameState.dialogueFraming;
  // NPC 回到原朝向 (平滑过渡由 animate loop 处理)
  if (f.npc) f.npc.userData._restoreRot = f.savedNpcRot;
  // 还原 cameraMode (cameraOffset 由 computeDesiredCamera 重算)
  if (f.savedCameraMode && f.savedCameraMode !== gameState.cameraMode) {
    gameState.cameraMode = f.savedCameraMode;
    if (typeof window.updateViewModePicker === 'function') window.updateViewModePicker();
  }
  gameState.dialogueFraming.active = false;
  gameState.dialogueFraming.npc = null;
  gameState.dialogueFraming.savedCameraMode = null;
}

/* ============================================================
 *  P0 — Tour-Guide Always-On + Context Bridge
 *  P1 — Voice-Command Intent Receiver
 *  ============================================================
 *
 *  Architecture:
 *    parent (this file)  ──postMessage{source:'tang-host',type:'context'}──►  iframe
 *    iframe (app.tsx)    ──postMessage{source:'tang-voice-agent',type:'intent'}──►  parent
 *
 *  The tour-guide (周引之) is special: it's "ambient" — autostarted when the
 *  player enters Chang'an, holds its own iframe, listens to camera/district/
 *  gallery events, and folds them into next-turn responses via APPEND-priority
 *  sendText. Other NPC panels still go through the existing openVoicePanel
 *  + dialogueFraming pipeline.
 *
 *  Throttle: each context-kind has its own debounce so we don't spam the
 *  agent with redundant "you switched view" messages.
 */
const tourGuide = {
  iframeReady: false,
  lastEmit: {}, // kind -> timestamp
  lastViewMode: null,
  lastDistrict: null,
  lastNearbyMural: null,
  lastNearbyMuralAt: 0,
};

// 通用：向当前面板里的语音 agent 投递场景上下文 (debounce per persona+kind, 仅当
// 当前激活 persona 与 target 匹配时才发, 避免错投到别的角色)
function emitPersonaContext(targetPersona, kind, text, opts) {
  if (!voicePanelState.open || voicePanelState.personaId !== targetPersona) return;
  const frame = document.getElementById('voiceFrame');
  if (!frame || !frame.contentWindow) return;
  const fullKind = targetPersona + ':' + kind;
  const now = Date.now();
  const debounceMs = (opts && opts.debounceMs) || 5000;
  if (tourGuide.lastEmit[fullKind] && now - tourGuide.lastEmit[fullKind] < debounceMs) return;
  tourGuide.lastEmit[fullKind] = now;
  try {
    frame.contentWindow.postMessage(
      {
        source: 'tang-host',
        type: 'context',
        kind: opts && opts.interrupt ? 'interrupt' : 'stage',
        contextKind: fullKind,
        text,
      },
      VOICE_AGENT_ORIGIN,
    );
  } catch (err) {
    console.debug('[ctx] emit failed', err);
  }
}

function emitTourContext(kind, text, opts) {
  return emitPersonaContext('tour_guide', kind, text, opts);
}
function emitDocentContext(kind, text, opts) {
  return emitPersonaContext('docent', kind, text, opts);
}

function openAmbientTourGuide() {
  // 不抢镜、不强制对话框架——周引之是"随身导览"
  const panel = document.getElementById('voicePanel');
  const frame = document.getElementById('voiceFrame');
  const nameEl = document.getElementById('voicePanelName');
  const subEl  = document.getElementById('voicePanelSubtitle');
  if (!panel || !frame) return;
  if (voicePanelState.open && voicePanelState.personaId === 'tour_guide') return;
  if (nameEl) nameEl.textContent = '周引之';
  if (subEl)  subEl.textContent  = '引路使 · 长安导览（实时讲解）';
  frame.src = `${VOICE_AGENT_ORIGIN}/?persona=tour_guide&autoStart=1&embed=1`;
  panel.classList.add('show');
  voicePanelState.open = true;
  voicePanelState.personaId = 'tour_guide';
  openPortraitPanel('tour_guide');
  // 给 iframe 5s 暖机后再开始投递 context (避免 sendText 早于 agent ready)
  tourGuide.iframeReady = false;
  setTimeout(() => { tourGuide.iframeReady = true; }, 5000);
}

// 殿堂内的女讲席苏阮卿：玩家步入画馆即换上她, 与"周引之"互不抢话.
// 与 openAmbientTourGuide 同形, 不走 dialogueFraming (展厅是 FPS, 没有 ortho 取景).
function openDocentPanel(opts) {
  const panel = document.getElementById('voicePanel');
  const frame = document.getElementById('voiceFrame');
  const nameEl = document.getElementById('voicePanelName');
  const subEl  = document.getElementById('voicePanelSubtitle');
  if (!panel || !frame) return;
  if (voicePanelState.open && voicePanelState.personaId === 'docent') return;
  if (nameEl) nameEl.textContent = '苏阮卿';
  if (subEl)  subEl.textContent  = '画学博士 · 万邦讲席（殿内实时讲解）';
  frame.src = `${VOICE_AGENT_ORIGIN}/?persona=docent&autoStart=1&embed=1`;
  panel.classList.add('show');
  voicePanelState.open = true;
  voicePanelState.personaId = 'docent';
  openPortraitPanel('docent');
  // 清空 docent 自己的 debounce 历史 (上一次进展厅的记录不应卡住本次)
  if (tourGuide && tourGuide.lastEmit) {
    for (const k of Object.keys(tourGuide.lastEmit)) {
      if (k.indexOf('docent:') === 0) delete tourGuide.lastEmit[k];
    }
  }
}

// 朱雀大街 AI 品牌馆专用讲席"智机使".
// 每个馆有独立 persona (brand_agora / brand_claude / ... ) + 独立音色,
// 由 BrandPlaza.personaForBrand(brand) 决定; 不传或自定义馆 → brand_docent (兜底).
// 与 openDocentPanel 同形, 但加载不同的 persona (能讲未来 AI 派系而不是唐画).
function openBrandDocentPanel(voice) {
  const panel = document.getElementById('voicePanel');
  const frame = document.getElementById('voiceFrame');
  const nameEl = document.getElementById('voicePanelName');
  const subEl  = document.getElementById('voicePanelSubtitle');
  if (!panel || !frame) return;

  // 解析目标 persona — 接受 string (personaId) / { personaId, displayName, subtitle } / undefined
  let personaId = 'brand_docent';
  let displayName = '智机使';
  let subtitle = '天枢府特使 · AI 品牌街讲席';
  if (typeof voice === 'string') {
    personaId = voice;
  } else if (voice && typeof voice === 'object') {
    if (voice.personaId)   personaId   = voice.personaId;
    if (voice.displayName) displayName = voice.displayName;
    if (voice.subtitle)    subtitle    = voice.subtitle;
  }

  // 同馆点了第二次 — 不重载 iframe (避免打断当前对话 / 暖机)
  if (voicePanelState.open && voicePanelState.personaId === personaId) return;

  if (nameEl) nameEl.textContent = displayName;
  if (subEl)  subEl.textContent  = subtitle;
  frame.src = `${VOICE_AGENT_ORIGIN}/?persona=${encodeURIComponent(personaId)}&autoStart=1&embed=1`;
  panel.classList.add('show');
  voicePanelState.open = true;
  voicePanelState.personaId = personaId;
  // 左侧肖像也同步显示. 资源缺失时会落到 PORTRAIT_META 的姓名/身份占位卡.
  openPortraitPanel(personaId, {
    name: displayName,
    sub: subtitle,
  });
  // 清空所有 brand_* persona 的 debounce 历史, 让换馆后新 cue 立即生效
  if (tourGuide && tourGuide.lastEmit) {
    for (const k of Object.keys(tourGuide.lastEmit)) {
      if (k.indexOf('brand_') === 0) delete tourGuide.lastEmit[k];
    }
  }
}
// 给 BrandPlaza 用 (brand-plaza.js beginEnter 会调)
// opts.personaId — 指定路由到哪个品牌 persona (默认 brand_docent 兜底). 配合 openBrandDocentPanel 用.
function emitBrandDocentContext(kind, text, opts) {
  const personaId = (opts && opts.personaId) || 'brand_docent';
  return emitPersonaContext(personaId, kind, text, opts);
}

/* --- Waypoints & auto-walk -------------------------------------------- */
const WAYPOINTS = {
  '含元殿':   { x:  0,   z: -60 },
  '宣政殿':   { x:  0,   z: -76 },
  '紫宸殿':   { x:  0,   z: -89 },
  '大雁塔':   { x: 28,   z:  22 },
  '曲江':     { x: 28,   z:   6 },
  '东市':     { x: 27,   z:   5 },  // Round 2 — 西门入口, 顺势进入东市内部即可见高竹彩缎森林
  '西市':     { x:-42,   z:   2 },
  '朱雀大街': { x:  2.5, z:  14 },
  '平康坊':   { x: 38,   z: -12 },
  '梨园':     { x: 15,   z:  38 },  // 教坊圆台南门接驳点 (z=38, 比 lyCenter z=45 略北, 方便玩家走到前先看到牌坊)
  '染坊':     { x:-45,   z:  22 },  // Round 2 — 北侧入口, 正对染缸阵, 前望即可看到 4 排彩缎森林
  '演武校场': { x:-30,   z: -22 },  // Round 3 — 南侧入口, 正面看校阅台 + 5 弓箭靶
  '国子监':   { x: 15,   z: -27 },  // Round 3 — 南侧牌坊入口, 直对大成殿
  '马球场':   { x: 50,   z: -17 },  // Round 3 — 北侧入口 (靠看台), 玩家走入即见 4 马奔驰
  '玄都观':   { x:-15,   z:  62 },  // Round 3 — 南侧牌坊入口, 直对太极八卦地
  '鸿胪寺':   { x: 52,   z:  18 },  // Round 4 — 南门牌坊入口, 玩家入即对通译厅
  '西明胡寺': { x:-34,   z:  24 },  // Round 4 — 南侧 共同地基前, 看 3 异域祠庙
  '太医署':   { x: 18,   z:  20 },  // Round 4 — 南侧药圃入口, 直对主厅 + 百子柜
  '司天监':   { x:-42,   z:  -2 },  // Round 4 — 南侧 高台前, 抬头看浑天仪
};

function walkPlayerTo(target, opts) {
  if (!gameState.active || !gameState.player) return;
  let tx, tz, label;
  if (typeof target === 'string') {
    const wp = WAYPOINTS[target];
    if (!wp) return;
    tx = wp.x; tz = wp.z; label = target;
  } else if (target && typeof target.x === 'number') {
    tx = target.x; tz = target.z; label = (opts && opts.label) || '目的地';
  } else { return; }
  gameState.autoWalk = { x: tx, z: tz, label, startedAt: Date.now() };
  if (typeof showGameToast === 'function') showGameToast('自动前往 · ' + label, 1800);
}

function clearAutoWalk() { gameState.autoWalk = null; }

function walkPlayerToNpc(personaId) {
  if (typeof namedNpcs === 'undefined') return;
  const npc = namedNpcs.find((n) => n.userData && n.userData.personaId === personaId);
  if (!npc) return;
  // 停在 NPC 前 2.2m 处, 朝向 NPC
  walkPlayerTo({ x: npc.position.x, z: npc.position.z + 2.2 }, { label: npc.userData.displayName || personaId });
}

if (typeof window !== 'undefined') {
  window.openVoicePanel = openVoicePanel;
  window.closeVoicePanel = closeVoicePanel;
  window.openAmbientTourGuide = openAmbientTourGuide;
  window.openDocentPanel = openDocentPanel;
  window.openBrandDocentPanel = openBrandDocentPanel;
  window.emitTourContext = emitTourContext;
  window.emitDocentContext = emitDocentContext;
  window.emitBrandDocentContext = emitBrandDocentContext;
  window.emitPersonaContext = emitPersonaContext;
  window.spawnGalleryDocent = spawnGalleryDocent;
  window.walkPlayerTo = walkPlayerTo;
  window.walkPlayerToNpc = walkPlayerToNpc;
  // 监听 iframe 回传 (close + intent)
  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || data.source !== 'tang-voice-agent') return;
    if (data.type === 'closed') {
      closeVoicePanel();
      return;
    }
    if (data.type === 'intent') {
      const kind = data.kind;
      const payload = data.payload || {};
      if (kind === 'setView' && typeof window.setCameraView === 'function') {
        window.setCameraView(payload.mode);
      } else if (kind === 'walkTo') {
        walkPlayerTo(payload.place);
      } else if (kind === 'findNpc') {
        walkPlayerToNpc(payload.npc);
      }
      return;
    }
    // Phase B: 语音 → talk 动画联动
    // iframe 持续投递 visualizerState; 我们把 'talking' 翻译成 voiceAiSpeaking=true,
    // 让 animate() 里 GLB 自动切到 talk 动画 (周引之、苏阮卿、李白说话时会摆手)
    if (data.type === 'state' || data.type === 'speaking') {
      const isTalking =
        data.type === 'state'
          ? data.state === 'talking'
          : !!data.value;
      window.voiceAiSpeaking = isTalking;
      // 左侧肖像面板 crossfade 到 talking 视频
      if (typeof setPortraitTalking === 'function') setPortraitTalking(isTalking);
      // 失败保险: 30s 后强制关掉 talk, 避免 iframe 漏发结束信号导致角色一直摆手
      if (isTalking) {
        clearTimeout(window._voiceTalkSafetyOff);
        window._voiceTalkSafetyOff = setTimeout(() => {
          window.voiceAiSpeaking = false;
          if (typeof setPortraitTalking === 'function') setPortraitTalking(false);
        }, 30000);
      } else {
        clearTimeout(window._voiceTalkSafetyOff);
      }
      return;
    }
    // Phase C: 头顶字幕气泡 — 把 AI 正在说的话以唐风卷轴飘在 NPC 头顶
    if (data.type === 'transcript') {
      const text = (data.text || '').trim();
      if (!text) return;
      // 只画 AI 一方; user 自己的 transcript 不画 (玩家不需要看自己脑壳上飘字)
      if (data.isAgent === false) return;
      if (typeof showOverheadSubtitle === 'function') {
        showOverheadSubtitle(data.personaId, text, {
          finalized: data.status === 'end' || data.status === 'final',
          turn: data.turn,
        });
      }
      return;
    }
  });
}

const visitedSpots = new Set();

function showTooltip(h, x, y) {
  tooltip.innerHTML = `
    <h4>${h.title}</h4>
    <p>${h.body}</p>
    <div class="src">— ${h.src}</div>
  `;
  tooltip.style.left = x + 'px';
  tooltip.style.top = (y - 10) + 'px';
  tooltip.classList.add('show');
  freezeTag.classList.add('show');
}
function hideTooltip() {
  tooltip.classList.remove('show');
  freezeTag.classList.remove('show');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip();
});

const freezeTag = document.getElementById('freezeTag');

function updateProgress() {
  document.getElementById('progressText').textContent = `${visitedSpots.size} / ${HOTSPOTS.length}`;
}

/* ============================================================
 *  UI binding — time slider, scene rail, chapter nav, dialog
 * ============================================================ */
const timeSlider = document.getElementById('timeSlider');
const timeText = document.getElementById('timeText');
const hourText = document.getElementById('hourText');
const tempText = document.getElementById('tempText');

function formatTime(decH) {
  const h24 = Math.floor(decH);
  const m = Math.floor((decH - h24) * 60);
  const h12 = ((h24 + 11) % 12) + 1;
  const ap = h24 < 12 ? 'AM' : 'PM';
  return { ampm: `${h12}:${m.toString().padStart(2, '0')} ${ap}`, h24, m };
}
const shichen = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
function getShichen(decH) {
  // 子时 23-1, 丑 1-3 ... 每两小时
  const idx = Math.floor(((decH + 1) % 24) / 2);
  return shichen[idx] + '时';
}

function applyTimeUI(decH) {
  const t = formatTime(decH);
  timeText.textContent = t.ampm;
  hourText.textContent = `${getShichen(decH)} ${t.h24.toString().padStart(2, '0')}:${t.m.toString().padStart(2, '0')}`;
  // temp curve: 6=12C, 14=22C, 0=8C
  const temp = 14 + Math.sin((decH - 9) / 24 * Math.PI * 2) * 6;
  tempText.textContent = `${Math.round(temp)}°C · ${Math.round(temp * 9 / 5 + 32)}°F`;
}

let autoTime = false;
timeSlider.addEventListener('input', () => {
  autoTime = false;
  document.getElementById('toggleAuto').classList.remove('active');
  const decH = parseInt(timeSlider.value, 10) / 100;
  applyHour(decH);
  applyTimeUI(decH);
});

document.getElementById('toggleAuto').addEventListener('click', (e) => {
  autoTime = !autoTime;
  e.currentTarget.classList.toggle('active', autoTime);
});

// scene rail (placeholder — only scene 1 implemented in Phase 1)
document.querySelectorAll('#sceneRail button[data-scene]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#sceneRail button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const idx = parseInt(btn.dataset.scene, 10);
    showScene(idx);
  });
});

const SCENES = [
  { title: '朱雀大街', sub: 'THE GRAND ZHUQUE AVENUE',   mode: '盛世·长安',   view: 'overview' },
  { title: '大明宫',   sub: 'HANYUAN HALL · DAMING PALACE', mode: '皇家·含元殿', view: 'palace' },
  { title: '大雁塔',   sub: 'THE WILD GOOSE PAGODA',     mode: '梵宇·慈恩寺', view: 'pagoda' },
  { title: '曲江池',   sub: 'QUJIANG PLEASURE POOL',     mode: '游园·曲江',   view: 'qujiang' },
  { title: '东市',     sub: 'THE EASTERN MARKETPLACE',   mode: '坊市·东市',   view: 'market' },
  { title: '田畴',     sub: 'AGRICULTURE & IRRIGATION',  mode: '阡陌·渭原',   view: 'farm' },
  { title: '朱雀门',   sub: 'GATE OF THE VERMILLION BIRD', mode: '城阙·朱雀门', view: 'zhuque' },
  { title: '边塞',     sub: 'THE TANG FRONTIER',         mode: '边塞·云中',   view: 'battle' },
  { title: '驼商',     sub: 'SILK ROAD CARAVAN',         mode: '商队·西域',   view: 'caravan' },
];

const VIEWS = {
  overview: { pos: new THREE.Vector3(70, 60, 70),  target: new THREE.Vector3(0, 2, -5),   zoom: 0.62 },
  village:  { pos: new THREE.Vector3(26, 22, 26),  target: new THREE.Vector3(0, 1, 0),    zoom: 1.55 },
  market:   { pos: new THREE.Vector3(-12, 18, 36), target: new THREE.Vector3(0, 1, 17),   zoom: 1.4 },
  farm:     { pos: new THREE.Vector3(42, 20, 24),  target: new THREE.Vector3(22, 1, 2),   zoom: 1.35 },
  battle:   { pos: new THREE.Vector3(26, 24, -6),  target: new THREE.Vector3(0, 1, -32),  zoom: 1.15 },
  caravan:  { pos: new THREE.Vector3(-4, 20, 28),  target: new THREE.Vector3(-20, 1, 6),  zoom: 1.4 },
  pagoda:   { pos: new THREE.Vector3(56, 38, 50),  target: new THREE.Vector3(36, 4, 32),  zoom: 1.0 },
  qujiang:  { pos: new THREE.Vector3(-14, 24, 44), target: new THREE.Vector3(-32, 1, 26), zoom: 1.1 },
  zhuque:   { pos: new THREE.Vector3(22, 26, -28), target: new THREE.Vector3(0, 4, -46),  zoom: 1.0 },
  palace:   { pos: new THREE.Vector3(20, 34, -38), target: new THREE.Vector3(0, 6, -60),  zoom: 0.85 },
  palaceAxis: { pos: new THREE.Vector3(0, 40, -30), target: new THREE.Vector3(0, 4, -78), zoom: 0.75 },
  xuanzheng:  { pos: new THREE.Vector3(16, 22, -64), target: new THREE.Vector3(0, 4, -76), zoom: 1.05 },
  zichen:     { pos: new THREE.Vector3(14, 18, -78), target: new THREE.Vector3(0, 3, -89), zoom: 1.20 },
};

/* ---- Camera Tween System ---- */
const camTween = { active: false, t: 0, dur: 1.6, fromPos: null, fromTarget: null, fromZoom: 1, to: null };
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function flyTo(viewKey, duration = 1.6) {
  const v = VIEWS[viewKey];
  if (!v) return;
  camTween.active = true;
  camTween.t = 0;
  camTween.dur = duration;
  camTween.fromPos = camera.position.clone();
  camTween.fromTarget = controls.target.clone();
  camTween.fromZoom = camera.zoom;
  camTween.to = v;
  controls.enabled = false;  // 暂停人为控制
}
function tickCameraTween(dt) {
  if (!camTween.active) return;
  camTween.t += dt;
  const u = Math.min(1, camTween.t / camTween.dur);
  const e = easeInOut(u);
  camera.position.lerpVectors(camTween.fromPos, camTween.to.pos, e);
  controls.target.lerpVectors(camTween.fromTarget, camTween.to.target, e);
  camera.zoom = camTween.fromZoom + (camTween.to.zoom - camTween.fromZoom) * e;
  camera.updateProjectionMatrix();
  if (u >= 1) {
    camTween.active = false;
    if (!tourState.running) controls.enabled = true;
  }
}

/* ---- Banner ---- */
const sceneBanner = document.getElementById('sceneBanner');
const sceneBannerNum = document.getElementById('sceneBannerNum');
const sceneBannerTitle = document.getElementById('sceneBannerTitle');
const sceneBannerEn = document.getElementById('sceneBannerEn');
let bannerTimer = null;
function showBanner(idx, hold = 3500) {
  const s = SCENES[idx];
  sceneBannerNum.textContent = `${idx + 1} / ${SCENES.length}`;
  sceneBannerTitle.textContent = s.title;
  sceneBannerEn.textContent = s.sub;
  sceneBanner.classList.add('show');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => sceneBanner.classList.remove('show'), hold);
}

/* ---- Tour ---- */
const tourState = { running: false, idx: 0, holdTime: 0, holdDur: 4.5 };
const tourPill = document.getElementById('tourPill');
function startTour() {
  if (tourState.running) return;
  tourState.running = true;
  tourState.idx = 0;
  tourState.holdTime = 0;
  tourPill.classList.add('show');
  document.getElementById('tourBtn').classList.add('active');
  setActiveScene(0, true);
}
function stopTour() {
  tourState.running = false;
  tourPill.classList.remove('show');
  document.getElementById('tourBtn').classList.remove('active');
  controls.enabled = true;
}
function tickTour(dt) {
  if (!tourState.running) return;
  if (camTween.active) return;  // 等过场完成
  tourState.holdTime += dt;
  if (tourState.holdTime >= tourState.holdDur) {
    tourState.holdTime = 0;
    tourState.idx = (tourState.idx + 1) % SCENES.length;
    setActiveScene(tourState.idx, true);
  }
}
document.getElementById('tourBtn').addEventListener('click', () => {
  if (tourState.running) stopTour();
  else startTour();
});
document.getElementById('tourStop').addEventListener('click', stopTour);

// 静音按钮
document.getElementById('muteBtn').addEventListener('click', () => {
  // 用户首次交互时也激活 AudioContext
  ensureAudioCtx();
  startAmbient();
  setMuted(audioState.enabled);
});

// 季节切换
document.querySelectorAll('#seasonPicker .season-btn').forEach(b => {
  b.addEventListener('click', () => {
    applySeason(b.dataset.season);
  });
});

// 天气切换
document.querySelectorAll('#weatherPicker .weather-btn').forEach(b => {
  b.addEventListener('click', () => {
    setWeather(b.dataset.weather);
  });
});

// 历史事件轴切换
const eraBtnEl = document.getElementById('eraBtn');
const eraPicker = document.getElementById('eraPicker');
if (eraBtnEl && eraPicker) {
  eraBtnEl.addEventListener('click', () => {
    eraPicker.classList.toggle('show');
  });
}
document.querySelectorAll('#eraPicker .era-btn').forEach(b => {
  b.addEventListener('click', () => {
    applyEra(b.dataset.era);
    if (eraPicker) setTimeout(() => eraPicker.classList.remove('show'), 200);
  });
});
// 点别处关闭 era picker
document.addEventListener('click', (e) => {
  if (!eraPicker || !eraPicker.classList.contains('show')) return;
  if (eraPicker.contains(e.target) || (eraBtnEl && eraBtnEl.contains(e.target))) return;
  eraPicker.classList.remove('show');
});

// 诗模式
const poemBtnEl = document.getElementById('poemBtn');
if (poemBtnEl) {
  poemBtnEl.addEventListener('click', () => setPoetryMode(!poetryMode));
}

/* ============================================================
 *  Game Mode UI binding
 * ============================================================ */
const gameBtnEl = document.getElementById('gameBtn');
const gameSelectEl = document.getElementById('gameSelect');
const gsStartBtn = document.getElementById('gsStartBtn');
const gsCancelBtn = document.getElementById('gsCancelBtn');
const gsNameInput = document.getElementById('gsNameInput');
let gsSelectedPreset = null;

if (gameBtnEl && gameSelectEl) {
  gameBtnEl.addEventListener('click', () => {
    if (gameState.active) {
      endGame();
      return;
    }
    gameSelectEl.classList.add('show');
    gsSelectedPreset = null;
    document.querySelectorAll('#gameSelect .gs-avatar').forEach(a => a.classList.remove('active'));
    if (gsStartBtn) gsStartBtn.disabled = true;
    if (gsNameInput) gsNameInput.value = '';
  });
}
document.querySelectorAll('#gameSelect .gs-avatar').forEach(av => {
  av.addEventListener('click', () => {
    document.querySelectorAll('#gameSelect .gs-avatar').forEach(a => a.classList.remove('active'));
    av.classList.add('active');
    gsSelectedPreset = av.dataset.preset;
    if (gsStartBtn) gsStartBtn.disabled = false;
    const preset = CHARACTER_PRESETS[gsSelectedPreset];
    if (preset && gsNameInput && !gsNameInput.value) {
      gsNameInput.placeholder = preset.defaultName;
    }
  });
});
if (gsStartBtn) {
  gsStartBtn.addEventListener('click', () => {
    if (!gsSelectedPreset) return;
    const name = (gsNameInput && gsNameInput.value.trim()) || '';
    startGame(gsSelectedPreset, name);
  });
}
if (gsCancelBtn) {
  gsCancelBtn.addEventListener('click', () => {
    if (gameSelectEl) gameSelectEl.classList.remove('show');
  });
}

// Inventory pill — 点击切换详情面板
const invPill = document.getElementById('inventoryPill');
const invPanel = document.getElementById('inventoryPanel');
if (invPill && invPanel) {
  invPill.addEventListener('click', (e) => {
    e.stopPropagation();
    invPanel.classList.toggle('show');
    if (invPanel.classList.contains('show')) {
      const cEl = document.getElementById('invCoins');
      if (cEl) cEl.innerHTML = `🪙 ${gameState.coins || 0} 文`;
    }
  });
  document.addEventListener('click', (e) => {
    if (!invPanel.classList.contains('show')) return;
    if (invPill.contains(e.target) || invPanel.contains(e.target)) return;
    invPanel.classList.remove('show');
  });
}

/* ============================================================
 *  Mini-games — 小游戏入口 + 蹴鞠 demo
 * ============================================================ */
const gamesModal = document.getElementById('gamesModal');
const gamesBtn = document.getElementById('gamesBtn');
const gamesClose = document.getElementById('gamesClose');
if (gamesBtn) gamesBtn.addEventListener('click', () => gamesModal.classList.add('show'));
if (gamesClose) gamesClose.addEventListener('click', () => gamesModal.classList.remove('show'));

// 蹴鞠 demo
const cujuOverlay = document.getElementById('cujuOverlay');
const cujuCanvas = document.getElementById('cujuCanvas');
const cujuCount = document.getElementById('cujuCount');
const cujuBest = document.getElementById('cujuBest');
const cujuEnd = document.getElementById('cujuEnd');

const cujuState = {
  running: false,
  ball: null,
  best: 0,
  count: 0,
  lastTs: 0,
  ctx: null,
  W: 0, H: 0,
};

function startCuju() {
  if (!cujuCanvas) return;
  cujuOverlay.classList.add('show');
  gamesModal.classList.remove('show');
  cujuState.W = cujuCanvas.width = window.innerWidth;
  cujuState.H = cujuCanvas.height = window.innerHeight;
  cujuState.ctx = cujuCanvas.getContext('2d');
  cujuState.ball = {
    x: cujuState.W / 2,
    y: cujuState.H * 0.3,
    vx: 0, vy: 0,
    r: 36,
  };
  cujuState.count = 0;
  cujuCount.textContent = '0';
  cujuState.running = true;
  cujuState.lastTs = performance.now();
  requestAnimationFrame(cujuLoop);
}

function stopCuju() {
  const wasRunning = cujuState.running;
  cujuState.running = false;
  cujuOverlay.classList.remove('show');
  if (cujuState.count > cujuState.best) {
    cujuState.best = cujuState.count;
    cujuBest.textContent = String(cujuState.best);
  }
  if (wasRunning && cujuState.count > 0) awardCujuRewards(cujuState.count);
}
function awardCujuRewards(count) {
  if (!gameState.wallet) gameState.wallet = { copper: 0, silk: 0, gold: 0, fame: 0 };
  let toast = '';
  if (count >= 50) {
    grantItemById('SILK_1', null, { silent: true });
    grantItemById('COIN_10', null, { silent: true });
    gameState.wallet.fame += 5;
    toast = `蹴鞠神艺！ ${count} 下 · 赏 🧵 绢一匹 + 🪙 十文 + 名声 5`;
  } else if (count >= 25) {
    grantItemById('COIN_10', null, { silent: true });
    grantItemById('COIN_10', null, { silent: true });
    gameState.wallet.fame += 2;
    toast = `好脚法！ ${count} 下 · 赏 🪙 廿文 + 名声 2`;
  } else if (count >= 10) {
    grantItemById('COIN_10', null, { silent: true });
    toast = `${count} 下 · 赏 🪙 十文铜钱`;
  } else if (count >= 5) {
    grantItemById('COIN_3', null, { silent: true });
    toast = `${count} 下 · 赏 🪙 三文铜钱`;
  } else {
    toast = `${count} 下 · 再练数次`;
  }
  if (typeof updateInventoryUI === 'function') updateInventoryUI();
  if (typeof showRewardToast === 'function') showRewardToast(toast, 3200);
  if (typeof playChime === 'function' && count >= 5) playChime();
}

function cujuLoop(ts) {
  if (!cujuState.running) return;
  const dt = Math.min(0.04, (ts - cujuState.lastTs) / 1000);
  cujuState.lastTs = ts;
  const b = cujuState.ball, ctx = cujuState.ctx;
  // 重力
  b.vy += 1100 * dt;
  // 阻力
  b.vx *= 0.998;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  // 落地 = 失败
  if (b.y > cujuState.H - 80) {
    drawCuju(true);
    setTimeout(stopCuju, 1100);
    return;
  }
  // 边界
  if (b.x < b.r) { b.x = b.r; b.vx *= -0.7; }
  if (b.x > cujuState.W - b.r) { b.x = cujuState.W - b.r; b.vx *= -0.7; }
  drawCuju(false);
  requestAnimationFrame(cujuLoop);
}

function drawCuju(failed) {
  const { W, H, ctx, ball: b, count } = cujuState;
  ctx.clearRect(0, 0, W, H);
  // 庭院背景 (远山 + 庭院地)
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#1e1410');
  grd.addColorStop(0.65, '#3d2818');
  grd.addColorStop(1, '#574020');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // 月亮
  ctx.beginPath();
  ctx.arc(W - 100, 90, 36, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 230, 180, 0.7)'; ctx.fill();
  // 地平线 (庭院围墙)
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(0, H - 80, W, 80);
  // 墙上瓦 (装饰)
  ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 2;
  for (let i = 0; i < W; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, H - 78);
    ctx.lineTo(i + 25, H - 88);
    ctx.lineTo(i + 50, H - 78);
    ctx.stroke();
  }
  // 鞠球
  const grad = ctx.createRadialGradient(b.x - b.r/3, b.y - b.r/3, 2, b.x, b.y, b.r);
  grad.addColorStop(0, '#f8e0a0');
  grad.addColorStop(0.6, '#c8862e');
  grad.addColorStop(1, '#8a4a14');
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  // 鞠球缝线
  ctx.strokeStyle = '#3a1f0a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + b.x / 100;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(a) * b.r * 0.85, b.y + Math.sin(a) * b.r * 0.85);
    ctx.stroke();
  }
  // 提示
  ctx.fillStyle = 'rgba(245, 232, 205, 0.5)';
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  if (count === 0) {
    ctx.fillText('点击鞠球 · 高踢不落地', W / 2, H - 130);
  }
  if (failed) {
    ctx.fillStyle = '#e8c884';
    ctx.font = 'bold 36px "Noto Serif SC", serif';
    ctx.fillText('鞠落 · 终', W / 2, H / 2 - 20);
    ctx.font = '16px "Noto Serif SC", serif';
    ctx.fillText(`计 ${count} 下`, W / 2, H / 2 + 16);
  }
}

if (cujuCanvas) {
  cujuCanvas.addEventListener('pointerdown', (e) => {
    if (!cujuState.running) return;
    const b = cujuState.ball;
    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > b.r + 30) return;
    // kick: 反向冲量 + 上向
    const nx = -dx / Math.max(1, d);
    const ny = -dy / Math.max(1, d);
    b.vx += nx * 280;
    b.vy = ny * 720 - 240;
    cujuState.count += 1;
    cujuCount.textContent = String(cujuState.count);
    if (typeof playHooves === 'function') playHooves();
  });
}
if (cujuEnd) cujuEnd.addEventListener('click', stopCuju);

/* ============================================================
 *  Mini-game: 弓射 (Archery)
 *  - 屏幕中央百步靶心 + 风向 + 拉弓蓄力
 *  - 鼠标位置 = 准星；按住 = 蓄力；松开 = 射
 * ============================================================ */
const archState = {
  running: false, ctx: null, W: 0, H: 0,
  cursor: { x: 0, y: 0 },
  charging: false, chargeStart: 0,
  arrows: [], score: 0, shots: 0, totalShots: 5,
  wind: 0, target: { x: 0, y: 0, r: 70 },
  endTimeout: null,
};
function startArchery() {
  if (!cujuCanvas) return;
  gamesModal.classList.remove('show');
  cujuOverlay.classList.add('show');
  archState.W = cujuCanvas.width = window.innerWidth;
  archState.H = cujuCanvas.height = window.innerHeight;
  archState.ctx = cujuCanvas.getContext('2d');
  archState.cursor = { x: archState.W / 2, y: archState.H / 2 };
  archState.charging = false;
  archState.arrows = [];
  archState.score = 0; archState.shots = 0;
  archState.target = { x: archState.W * 0.78, y: archState.H * 0.45, r: 70 };
  archState.wind = (Math.random() - 0.5) * 0.6;
  archState.running = true;
  document.getElementById('cujuCount').textContent = '0';
  document.querySelector('.cuju-row').textContent = '弓射 · ARCHERY';
  document.querySelector('.cuju-score').innerHTML =
    `<span>箭</span> <b id="archShot">0</b><span>/${archState.totalShots} · 中</span> <b id="archScore">0</b><span>环</span>`;
  archLoop(performance.now());
}
function stopArchery() {
  const wasRunning = archState.running;
  const finalScore = archState.score;
  const completedAllShots = archState.shots >= archState.totalShots;
  archState.running = false;
  cujuOverlay.classList.remove('show');
  if (archState.endTimeout) { clearTimeout(archState.endTimeout); archState.endTimeout = null; }
  if (wasRunning && completedAllShots) awardArcheryRewards(finalScore);
}
function awardArcheryRewards(rings) {
  if (!gameState.wallet) gameState.wallet = { copper: 0, silk: 0, gold: 0, fame: 0 };
  let toast = '';
  if (rings >= 40) {
    grantItemById('SILK_1', null, { silent: true });
    grantItemById('SILK_1', null, { silent: true });
    gameState.wallet.fame += 8;
    toast = `神射手！ ${rings} 环 · 赏 🧵 绢二匹 + 名声 8`;
  } else if (rings >= 30) {
    grantItemById('SILK_1', null, { silent: true });
    gameState.wallet.fame += 4;
    toast = `武曲入命！ ${rings} 环 · 赏 🧵 绢一匹 + 名声 4`;
  } else if (rings >= 20) {
    grantItemById('COIN_10', null, { silent: true });
    grantItemById('COIN_10', null, { silent: true });
    gameState.wallet.fame += 1;
    toast = `差强人意 · ${rings} 环 · 赏 🪙 廿文 + 名声 1`;
  } else if (rings >= 10) {
    grantItemById('COIN_10', null, { silent: true });
    toast = `${rings} 环 · 赏 🪙 十文铜钱`;
  } else {
    grantItemById('COIN_3', null, { silent: true });
    toast = `${rings} 环 · 赏 🪙 三文 安慰`;
  }
  if (typeof updateInventoryUI === 'function') updateInventoryUI();
  if (typeof showRewardToast === 'function') showRewardToast(toast, 3400);
  if (typeof playChime === 'function' && rings >= 20) playChime();
}
function archLoop(ts) {
  if (!archState.running) return;
  const { W, H, ctx } = archState;
  ctx.clearRect(0, 0, W, H);
  // 远山背景
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1a2a'); sky.addColorStop(0.5, '#4a3a3a'); sky.addColorStop(1, '#3a3220');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // 远山轮廓
  ctx.fillStyle = '#2a2418';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.7);
  for (let x = 0; x <= W; x += 60) {
    ctx.lineTo(x, H * 0.7 - Math.abs(Math.sin(x * 0.01)) * 60);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  // 地面
  const grd = ctx.createLinearGradient(0, H * 0.7, 0, H);
  grd.addColorStop(0, '#3a2a18'); grd.addColorStop(1, '#1a1208');
  ctx.fillStyle = grd; ctx.fillRect(0, H * 0.7, W, H * 0.3);
  // 风向旗
  ctx.save();
  ctx.translate(60, 60);
  ctx.fillStyle = '#c8a45e';
  ctx.font = '11px "Noto Serif SC", serif';
  ctx.fillText('风 ' + (archState.wind > 0 ? '→' : '←') + ' ' + Math.abs(archState.wind).toFixed(2), 0, 0);
  ctx.restore();
  // 靶子 (10 环同心圆)
  const tg = archState.target;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, tg.r * (1 - i * 0.18), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#f5e8cd' : '#8a2e2a';
    ctx.fill();
    ctx.strokeStyle = '#2c1f12'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  // 靶心
  ctx.beginPath();
  ctx.arc(tg.x, tg.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#c8a45e'; ctx.fill();
  // 已落箭
  for (const a of archState.arrows) {
    ctx.fillStyle = a.score >= 8 ? '#c8a45e' : a.score >= 5 ? '#e0d0a0' : '#888';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2c1f12'; ctx.lineWidth = 1; ctx.stroke();
  }
  // 准星 (鼠标位置)
  const cx = archState.cursor.x, cy = archState.cursor.y;
  ctx.strokeStyle = 'rgba(245, 232, 205, 0.8)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 4, cy);
  ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 18, cy);
  ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 18);
  ctx.stroke();
  // 蓄力条
  if (archState.charging) {
    const charge = Math.min(1.5, (ts - archState.chargeStart) / 1500);
    const bw = 200, bh = 12;
    const bx = (W - bw) / 2, by = H - 50;
    ctx.fillStyle = 'rgba(20,17,15,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = charge > 1.2 ? '#e05a3a' : charge > 0.8 ? '#c8a45e' : '#888';
    ctx.fillRect(bx, by, bw * Math.min(1, charge), bh);
    ctx.strokeStyle = '#c8a45e'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#c8a45e';
    ctx.font = '11px "Noto Serif SC", serif'; ctx.textAlign = 'center';
    ctx.fillText('拉弓蓄力 · 满弓为佳', W / 2, by - 6);
  }
  // 完结
  if (archState.shots >= archState.totalShots) {
    ctx.fillStyle = 'rgba(8,5,3,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8a45e';
    ctx.font = 'bold 38px "Noto Serif SC", serif'; ctx.textAlign = 'center';
    ctx.fillText('射毕 · ' + archState.score + ' 环', W / 2, H / 2);
    ctx.font = '14px "Noto Serif SC", serif';
    ctx.fillStyle = '#e8c884';
    const rating = archState.score >= 40 ? '神射手' :
      archState.score >= 30 ? '武曲入命' :
      archState.score >= 20 ? '差强人意' : '再练数年';
    ctx.fillText(rating, W / 2, H / 2 + 30);
    if (!archState.endTimeout) {
      archState.endTimeout = setTimeout(stopArchery, 2600);
    }
  }
  requestAnimationFrame(archLoop);
}

/* ============================================================
 *  Mini-game: 曲江流饮 (Floating Wine Cup)
 *  - 羽觞顺曲水漂流，停在你面前时点击 = 饮酒赋诗
 * ============================================================ */
const qjState = {
  running: false, ctx: null, W: 0, H: 0,
  cup: null, t: 0, score: 0, rounds: 0, totalRounds: 8,
  stopMoment: -1, hasResolved: false,
  endTimeout: null,
};
function startQujiang() {
  if (!cujuCanvas) return;
  gamesModal.classList.remove('show');
  cujuOverlay.classList.add('show');
  qjState.W = cujuCanvas.width = window.innerWidth;
  qjState.H = cujuCanvas.height = window.innerHeight;
  qjState.ctx = cujuCanvas.getContext('2d');
  qjState.t = 0; qjState.score = 0; qjState.rounds = 0;
  qjState.cup = null; qjState.stopMoment = -1; qjState.hasResolved = false;
  qjState.running = true;
  document.querySelector('.cuju-row').textContent = '曲江流饮 · QUJIANG';
  document.querySelector('.cuju-score').innerHTML =
    `<span>第</span> <b id="qjRound">0</b><span>/${qjState.totalRounds} 回 · 中</span> <b id="qjScore">0</b><span>次</span>`;
  qjState.lastTs = performance.now();
  qjNewCup();
  qjLoop(performance.now());
}
function stopQujiang() {
  const wasRunning = qjState.running;
  const completed = qjState.rounds >= qjState.totalRounds;
  const finalScore = qjState.score;
  qjState.running = false;
  cujuOverlay.classList.remove('show');
  if (qjState.endTimeout) { clearTimeout(qjState.endTimeout); qjState.endTimeout = null; }
  if (wasRunning && completed) awardQujiangRewards(finalScore);
}
function awardQujiangRewards(hits) {
  if (!gameState.wallet) gameState.wallet = { copper: 0, silk: 0, gold: 0, fame: 0 };
  let toast = '';
  if (hits >= 7) {
    grantItemById('tengwang_rub', null, { silent: true });
    grantItemById('grape_wine', null, { silent: true });
    gameState.wallet.fame += 8;
    toast = `诗酒风流！ 赋 ${hits} 首 · 赏 📜《滕王阁序》拓本 + 🍷 葡萄酒 + 名声 8`;
  } else if (hits >= 5) {
    grantItemById('grape_wine', null, { silent: true });
    grantItemById('grape_wine', null, { silent: true });
    gameState.wallet.fame += 4;
    toast = `兴酣题诗 · 赋 ${hits} 首 · 赏 🍷 葡萄酒二杯 + 名声 4`;
  } else if (hits >= 3) {
    grantItemById('green_tea', null, { silent: true });
    grantItemById('COIN_10', null, { silent: true });
    gameState.wallet.fame += 1;
    toast = `小成 · 赋 ${hits} 首 · 赏 🍵 清茗一盏 + 🪙 十文 + 名声 1`;
  } else if (hits >= 1) {
    grantItemById('COIN_10', null, { silent: true });
    toast = `赋 ${hits} 首 · 赏 🪙 十文铜钱`;
  } else {
    grantItemById('COIN_3', null, { silent: true });
    toast = `未中一觞 · 赏 🪙 三文 安慰`;
  }
  if (typeof updateInventoryUI === 'function') updateInventoryUI();
  if (typeof showRewardToast === 'function') showRewardToast(toast, 3600);
  if (typeof playChime === 'function' && hits >= 3) playChime();
}
function qjNewCup() {
  qjState.cup = {
    x: -50, y: 0, vx: 200 + Math.random() * 140,
    rot: 0, willStopAt: 0.4 + Math.random() * 0.4,  // 0-1 比例
    stopped: false, stopHeld: 0,
  };
  qjState.stopMoment = -1; qjState.hasResolved = false;
}
function qjLoop(ts) {
  if (!qjState.running) return;
  const dt = Math.min(0.04, (ts - qjState.lastTs) / 1000);
  qjState.lastTs = ts;
  const { W, H, ctx } = qjState;
  ctx.clearRect(0, 0, W, H);
  // 园林背景
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#3a4a5a'); sky.addColorStop(0.7, '#7a6850'); sky.addColorStop(1, '#5a4830');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // 远柳影
  ctx.fillStyle = '#1a2a18';
  for (let x = 0; x < W; x += 100) {
    ctx.beginPath();
    ctx.ellipse(x, H * 0.55, 50, 80, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 曲水 (S 形)
  ctx.strokeStyle = '#4a6878'; ctx.lineWidth = 80;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const midY = H * 0.7;
  ctx.moveTo(-50, midY);
  ctx.bezierCurveTo(W * 0.3, midY - 60, W * 0.7, midY + 60, W + 50, midY);
  ctx.stroke();
  // 水面亮纹
  ctx.strokeStyle = 'rgba(245, 232, 205, 0.15)'; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const offY = midY - 25 + i * 10;
    ctx.moveTo(-50, offY + Math.sin(qjState.t * 2 + i) * 4);
    ctx.bezierCurveTo(W * 0.3, offY - 50 + i * 6, W * 0.7, offY + 50 - i * 6, W + 50, offY);
    ctx.stroke();
  }

  // 羽觞 (cup)
  const cup = qjState.cup;
  if (cup) {
    // 移动
    if (!cup.stopped) {
      cup.x += cup.vx * dt;
      cup.rot += dt * 1.5;
      const progress = cup.x / W;
      if (!cup.stopped && progress >= cup.willStopAt && progress <= cup.willStopAt + 0.04) {
        cup.stopped = true;
        cup.vx = 0;
        qjState.stopMoment = ts;
      }
    } else {
      cup.stopHeld += dt;
      cup.rot += dt * 0.6;
      // 超时未点击 = 错过
      if (cup.stopHeld > 1.5 && !qjState.hasResolved) {
        qjState.hasResolved = true;
        qjState.rounds++;
        if (qjState.rounds < qjState.totalRounds) {
          setTimeout(qjNewCup, 700);
        }
      }
    }
    // 计算 cup 在 S 曲线上的 y
    const t = Math.max(0, Math.min(1, cup.x / W));
    const cupY = midY + Math.sin(t * Math.PI) * 60 - 40;
    cup.y = cupY;
    // 绘 cup (耳杯/羽觞)
    ctx.save();
    ctx.translate(cup.x, cup.y);
    ctx.rotate(Math.sin(cup.rot) * 0.15);
    // 杯身 (橢圆)
    ctx.fillStyle = '#7a4a1a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // 杯内酒
    ctx.fillStyle = '#3a1a0a';
    ctx.beginPath();
    ctx.ellipse(0, -1, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 两耳 (羽觞的特征)
    ctx.fillStyle = '#7a4a1a';
    ctx.beginPath();
    ctx.ellipse(-22, 0, 5, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 0, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 杯口边
    ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // 如果停止了，画"饮"提示
    if (cup.stopped && !qjState.hasResolved) {
      ctx.fillStyle = '#c8a45e';
      ctx.font = 'bold 24px "Noto Serif SC", serif'; ctx.textAlign = 'center';
      ctx.fillText('饮', cup.x, cup.y - 32);
      ctx.font = '11px "Noto Serif SC", serif';
      ctx.fillText('点击赋诗', cup.x, cup.y - 18);
      // 剩余时间圆圈
      const left = Math.max(0, 1 - cup.stopHeld / 1.5);
      ctx.strokeStyle = '#c8a45e'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cup.x, cup.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
      ctx.stroke();
    }
  }

  // 完结
  if (qjState.rounds >= qjState.totalRounds) {
    ctx.fillStyle = 'rgba(8,5,3,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8a45e';
    ctx.font = 'bold 38px "Noto Serif SC", serif'; ctx.textAlign = 'center';
    ctx.fillText('觞尽 · 赋诗 ' + qjState.score + ' 首', W / 2, H / 2);
    if (!qjState.endTimeout) {
      qjState.endTimeout = setTimeout(stopQujiang, 2400);
    }
  }

  qjState.t += dt;
  // 自动新一轮
  if (cup && cup.x > W + 80 && !qjState.hasResolved) {
    qjState.hasResolved = true;
    qjState.rounds++;
    if (qjState.rounds < qjState.totalRounds) {
      setTimeout(qjNewCup, 600);
    }
  }
  requestAnimationFrame(qjLoop);
}

/* ============================================================
 *  Mini-game: 雁塔题名 (Calligraphy)
 *  - 大雁塔壁上摹"进士及第 X 名"，鼠标拖动写字
 * ============================================================ */
const ytState = {
  running: false, ctx: null, W: 0, H: 0,
  paths: [], drawing: false, lastPt: null,
  fadeOpacity: 1,
};
function startYanta() {
  if (!cujuCanvas) return;
  gamesModal.classList.remove('show');
  cujuOverlay.classList.add('show');
  ytState.W = cujuCanvas.width = window.innerWidth;
  ytState.H = cujuCanvas.height = window.innerHeight;
  ytState.ctx = cujuCanvas.getContext('2d');
  ytState.paths = [];
  ytState.drawing = false;
  ytState.lastPt = null;
  ytState.fadeOpacity = 1;
  ytState.finished = false;
  ytState.running = true;
  document.querySelector('.cuju-row').textContent = '雁塔题名 · YANTA';
  document.querySelector('.cuju-score').innerHTML =
    `<span>描红 "進士及第" ·</span> <b id="ytStroke">0</b><span>笔 ·</span>
     <button id="ytReset" style="background:none;border:1px solid #4a3a24;color:#c8a45e;padding:3px 10px;margin-left:6px;font-family:inherit;font-size:11px;cursor:pointer;border-radius:6px;">重写</button>
     <button id="ytDone"  style="background:linear-gradient(135deg,#b9844c,#80582c);border:none;color:#160f08;padding:3px 12px;margin-left:6px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;border-radius:6px;letter-spacing:.12em;">题名完毕</button>`;
  document.getElementById('ytReset').addEventListener('click', (e) => {
    e.stopPropagation();
    ytState.paths = [];
    ytState.fadeOpacity = 1;
    const sc = document.getElementById('ytStroke');
    if (sc) sc.textContent = '0';
    ytRender();
  });
  document.getElementById('ytDone').addEventListener('click', (e) => {
    e.stopPropagation();
    finalizeYanta();
  });
  ytRender();
}
function stopYanta() {
  ytState.running = false;
  ytState.finished = false;
  cujuOverlay.classList.remove('show');
}
function finalizeYanta() {
  if (!ytState.running || ytState.finished) return;
  ytState.finished = true;
  ytState.drawing = false;
  // 评分依据：笔画数 + 覆盖率（点的平均到画框中心的散布）
  const strokes = ytState.paths.length;
  const pts = ytState.paths.reduce((acc, p) => acc + (p.points?.length || 0), 0);
  const score = strokes * 3 + Math.min(60, Math.floor(pts / 8));
  // 等级 + 奖励
  let rank, blurb, rewards;
  if (score >= 60) {
    rank = '及第';
    blurb = '笔意自有风骨，雁塔之名当镌。';
    rewards = [
      { type: 'item', id: 'exam_seal' },
      { type: 'currency', id: 'SILK_1' },
    ];
  } else if (score >= 30) {
    rank = '题成';
    blurb = '虽未及甲，秀逸可观。';
    rewards = [
      { type: 'item', id: 'tengwang_rub' },
      { type: 'currency', id: 'COIN_10' },
    ];
  } else if (score >= 12) {
    rank = '勉之';
    blurb = '笔意稍涩，再练数年。';
    rewards = [
      { type: 'fame', n: 3 },
      { type: 'currency', id: 'COIN_3' },
    ];
  } else {
    rank = '草率';
    blurb = '寥寥数笔，未成名记。';
    rewards = [{ type: 'currency', id: 'COIN_3' }];
  }
  // 发放
  if (!gameState.wallet) gameState.wallet = { copper: 0, silk: 0, gold: 0, fame: 0 };
  for (const r of rewards) {
    if (r.type === 'item') grantItemById(r.id, null, { silent: true });
    else if (r.type === 'currency') grantItemById(r.id, null, { silent: true });
    else if (r.type === 'fame') gameState.wallet.fame += r.n;
  }
  if (typeof updateInventoryUI === 'function') updateInventoryUI();
  // 绘结算面
  const { W, H, ctx } = ytState;
  ytRender();
  ctx.fillStyle = 'rgba(8,5,3,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#c8a45e'; ctx.textAlign = 'center';
  ctx.font = 'bold 48px "Noto Serif SC", serif';
  ctx.fillText('雁塔已题 · ' + rank, W / 2, H / 2 - 60);
  ctx.font = '18px "Noto Serif SC", serif';
  ctx.fillStyle = '#e8c884';
  ctx.fillText(blurb, W / 2, H / 2 - 22);
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.fillStyle = '#a89070';
  ctx.fillText(`共 ${strokes} 笔 · 笔意 ${score} 分`, W / 2, H / 2 + 12);
  // 奖励列
  ctx.font = '16px "Noto Serif SC", serif';
  ctx.fillStyle = '#f0d088';
  let ry = H / 2 + 50;
  for (const r of rewards) {
    let line;
    if (r.type === 'item') {
      const it = ITEMS[r.id];
      line = `赏 ${it.icon} ${it.name}`;
    } else if (r.type === 'currency') {
      line = r.id === 'COIN_10' ? '赏 🪙 十文铜钱'
            : r.id === 'COIN_3'  ? '赏 🪙 三文铜钱'
            : r.id === 'SILK_1'  ? '赏 🧵 一匹绢帛'
            : '赏 🏵 一锭金';
    } else {
      line = `名声 +${r.n}`;
    }
    ctx.fillText(line, W / 2, ry); ry += 26;
  }
  ctx.font = '12px "Noto Serif SC", serif';
  ctx.fillStyle = '#807060';
  ctx.fillText('按 "收" 或 ESC 退出', W / 2, ry + 16);
  if (typeof playChime === 'function') playChime();
  if (ytState.endTimeout) clearTimeout(ytState.endTimeout);
  ytState.endTimeout = setTimeout(() => { stopYanta(); activeGame = null; }, 4200);
}
function ytRender() {
  if (!ytState.running) return;
  const { W, H, ctx } = ytState;
  ctx.clearRect(0, 0, W, H);
  // 石壁背景
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#5c4a30'); grd.addColorStop(0.5, '#3a2c1a'); grd.addColorStop(1, '#2a1f10');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  // 石壁纹理 (随机线条)
  ctx.strokeStyle = 'rgba(20,15,8,0.4)'; ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const x = (i * 37) % W, y = (i * 53) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(i) * 30, y + Math.cos(i) * 30);
    ctx.stroke();
  }
  // 题名碑文背景 (中央方框)
  const bx = W * 0.18, by = H * 0.20, bw = W * 0.64, bh = H * 0.60;
  ctx.fillStyle = 'rgba(40,30,18,0.7)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = '#c8a45e'; ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.strokeStyle = '#8a7042'; ctx.lineWidth = 1;
  ctx.strokeRect(bx + 8, by + 8, bw - 16, bh - 16);
  // 描红提示文字 (空心或浅色)
  ctx.fillStyle = `rgba(200,164,94,${0.18 * ytState.fadeOpacity})`;
  ctx.font = `bold ${Math.min(96, H * 0.18)}px "Noto Serif SC", "Songti SC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = (bx + bw / 2), cy = (by + bh / 2);
  ctx.fillText('進士及第', cx, cy - 30);
  ctx.font = `${Math.min(28, H * 0.04)}px "Noto Serif SC", serif`;
  ctx.fillText('— 唐 · 慈恩寺塔 题 —', cx, cy + 60);
  // 用户笔迹
  ctx.strokeStyle = '#1a0a05'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const path of ytState.paths) {
    ctx.lineWidth = path.width;
    ctx.beginPath();
    for (let i = 0; i < path.points.length; i++) {
      const p = path.points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // 边缘水印
  ctx.fillStyle = 'rgba(200,164,94,0.4)';
  ctx.font = '12px "Noto Serif SC", serif'; ctx.textAlign = 'left';
  ctx.fillText('雁塔题名记 · YANTA TIMING', bx + 12, by + bh - 10);
}

// 拓展点击/拖拽事件支持多游戏
let activeGame = null;  // 'cuju' | 'archery' | 'qujiang' | 'yanta' | null

if (cujuCanvas) {
  // 旧蹴鞠 pointerdown 已绑定，扩充
  cujuCanvas.addEventListener('pointermove', (e) => {
    if (activeGame === 'archery' && archState.running) {
      archState.cursor.x = e.clientX; archState.cursor.y = e.clientY;
    } else if (activeGame === 'yanta' && ytState.running && ytState.drawing && !ytState.finished) {
      const lp = ytState.lastPt;
      if (lp && ytState.paths.length > 0) {
        ytState.paths[ytState.paths.length - 1].points.push({ x: e.clientX, y: e.clientY });
        ytState.lastPt = { x: e.clientX, y: e.clientY };
        ytRender();
      }
    }
  });
  cujuCanvas.addEventListener('pointerdown', (e) => {
    if (activeGame === 'archery' && archState.running && archState.shots < archState.totalShots) {
      archState.charging = true;
      archState.chargeStart = performance.now();
    } else if (activeGame === 'qujiang' && qjState.running && qjState.cup && qjState.cup.stopped && !qjState.hasResolved) {
      qjState.hasResolved = true;
      qjState.score++; qjState.rounds++;
      document.getElementById('qjScore').textContent = String(qjState.score);
      document.getElementById('qjRound').textContent = String(qjState.rounds);
      if (typeof playChime === 'function') playChime();
      if (qjState.rounds < qjState.totalRounds) {
        setTimeout(qjNewCup, 700);
      }
    } else if (activeGame === 'yanta' && ytState.running && !ytState.finished) {
      // 描红时不响应"题名完毕"按钮误触
      if (e.target && (e.target.id === 'ytDone' || e.target.id === 'ytReset')) return;
      ytState.drawing = true;
      ytState.fadeOpacity = Math.max(0.3, ytState.fadeOpacity - 0.05);
      ytState.lastPt = { x: e.clientX, y: e.clientY };
      ytState.paths.push({ points: [{ x: e.clientX, y: e.clientY }], width: 4 + Math.random() * 4 });
      const sc = document.getElementById('ytStroke');
      if (sc) sc.textContent = String(ytState.paths.length);
      ytRender();
    }
  });
  cujuCanvas.addEventListener('pointerup', (e) => {
    if (activeGame === 'archery' && archState.running && archState.charging) {
      const charge = Math.min(1.5, (performance.now() - archState.chargeStart) / 1500);
      archState.charging = false;
      // 计算落点 (准星 + 风偏 + 蓄力误差)
      const power = charge;
      const tg = archState.target;
      let lx = archState.cursor.x;
      let ly = archState.cursor.y;
      // 风偏 (按力度反比)
      lx += archState.wind * 80 * (1.4 - power);
      // 蓄力不足误差
      const errMag = Math.max(0, 0.85 - power) * 90;
      lx += (Math.random() - 0.5) * errMag;
      ly += (Math.random() - 0.5) * errMag;
      // 过满拉爆 (>1.2)
      if (power > 1.2) {
        lx += (Math.random() - 0.5) * 60;
        ly += (Math.random() - 0.5) * 60;
      }
      const dist = Math.hypot(lx - tg.x, ly - tg.y);
      const ring = Math.max(0, 10 - Math.floor(dist / (tg.r / 10)));
      archState.arrows.push({ x: lx, y: ly, score: ring });
      archState.score += ring;
      archState.shots++;
      document.getElementById('archShot').textContent = String(archState.shots);
      document.getElementById('archScore').textContent = String(archState.score);
      if (typeof playHooves === 'function') playHooves();
      // 新风向
      archState.wind = (Math.random() - 0.5) * 0.6;
    } else if (activeGame === 'yanta') {
      ytState.drawing = false;
      ytState.lastPt = null;
    }
  });
}

function endAllGames() {
  stopCuju(); stopArchery(); stopQujiang(); stopYanta();
  activeGame = null;
}

// ESC 键统一退出：先关游戏 overlay，再关 modal
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (activeGame) {
    endAllGames();
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  if (gamesModal && gamesModal.classList.contains('show')) {
    gamesModal.classList.remove('show');
    e.preventDefault();
  }
}, true);

// 包装：每个 start 函数前设置 activeGame
const _origStartCuju = startCuju;
const _origStartArch = startArchery;
const _origStartQj   = startQujiang;
const _origStartYt   = startYanta;
function gateGame(name, fn) { return function() { endAllGames(); activeGame = name; fn(); }; }
const startCujuG    = gateGame('cuju',    _origStartCuju);
const startArcheryG = gateGame('archery', _origStartArch);
const startQujiangG = gateGame('qujiang', _origStartQj);
const startYantaG   = gateGame('yanta',   _origStartYt);

document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const g = card.dataset.game;
    if (g === 'cuju') startCujuG();
    else if (g === 'archery') startArcheryG();
    else if (g === 'qujiang') startQujiangG();
    else if (g === 'yanta') startYantaG();
  });
});
// "收"按钮统一关闭
if (cujuEnd) {
  cujuEnd.addEventListener('click', endAllGames);
}

// 移动端菜单按钮
const mobileBtn = document.getElementById('mobileMenuBtn');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    document.getElementById('sidePanel').classList.toggle('open');
  });
}
// 切换场景时自动关闭移动端侧栏
document.querySelectorAll('#sceneRail button[data-scene]').forEach(b => {
  b.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      document.getElementById('sidePanel').classList.remove('open');
    }
  });
});

function setActiveScene(idx, fromTour = false) {
  document.querySelectorAll('#sceneRail button[data-scene]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.scene, 10) === idx);
  });
  const s = SCENES[idx];
  document.getElementById('chapterTitle').textContent = s.title;
  document.querySelector('.scene-title').textContent = s.sub;
  document.querySelector('.mode-pill').textContent = s.mode;
  loadDialogue(idx);
  flyTo(s.view, 1.6);
  showBanner(idx, fromTour ? 4000 : 2400);
  if (typeof playChime === 'function') playChime();
  if (typeof startAmbient === 'function') startAmbient();
  if (typeof showPoem === 'function') showPoem(idx);
}

function showScene(idx) { setActiveScene(idx, false); if (tourState.running) stopTour(); }

// URL hash 调试 / 深链 (e.g. #view=battle / #view=market / #h=18&view=farm)
function parseHashView() {
  const m = location.hash.match(/view=(\w+)/);
  if (!m) return;
  const v = m[1];
  if (v === 'overview') { flyTo('overview', 0.1); return; }
  const idx = SCENES.findIndex(s => s.view === v);
  if (idx >= 0) { setTimeout(() => setActiveScene(idx, false), 50); return; }
  // 也支持非场景视点 (palaceAxis / xuanzheng / zichen 等)
  if (VIEWS[v]) setTimeout(() => flyTo(v, 0.1), 50);
}
parseHashView();
window.addEventListener('hashchange', parseHashView);
if (location.hash.includes('tour=1')) setTimeout(startTour, 800);

const DIALOGUES = [
  [  // 0: 朱雀大街 / 总览
    { who: '老者', initial: '老', say: '<em>子游</em>，看这座长安。北起<em>朱雀门</em>，南至<em>曲江池</em>，朱雀大街贯之，宽百余步、长十里、两旁百八坊。' },
    { who: '子游', initial: '游', say: '果是"<em>九天阊阖开宫殿、万国衣冠拜冕旒</em>"。城中究有几人？' },
    { who: '老者', initial: '老', say: '<em>百万</em>之众。东西二市、坊巷整齐、宵禁严明。胡商、汉贾、僧道、士庶——百业兴旺。' },
    { who: '系统', initial: '✦', say: '点 <span class="hint-glow">右侧 1-8</span> 切换镜头到八个分区，或点上方<span class="hint-glow">魔术棒图标</span>启动自动巡游。' },
    { who: '系统', initial: '✦', say: '场内可点击 <span class="hint-glow">16 处</span> 标的物听史。' },
  ],
  [  // 1: 大明宫含元殿
    { who: '老者', initial: '老', say: '此<em>含元殿</em>，大明宫之正殿。<em>龙朔三年</em>（公元 663 年）建成，高三十丈，下立<em>龙尾道</em>百余级。' },
    { who: '子游', initial: '游', say: '殿前两阁如双翼？' },
    { who: '老者', initial: '老', say: '<em>翔鸾阁</em>（东）、<em>栖凤阁</em>（西）。元日大朝、外蕃来贡、皇帝御此受百官朝。"<em>千官望长安、万国拜含元</em>"——王维之诗。' },
    { who: '子游', initial: '游', say: '殿外青松森森，鼎香缭绕……' },
    { who: '老者', initial: '老', say: '<em>苍松翠柏</em>、列<em>九鼎</em>象征九州，殿内龙椅、宦官、御林军。开元盛世之时，含元殿钟鼓既鸣，长安四方坊门同启。' },
    { who: '系统', initial: '✦', say: '殿前 12 名御林军 + 8 名朝臣列班。' },
  ],
  [  // 2: 大雁塔
    { who: '老者', initial: '老', say: '此<em>大雁塔</em>。永徽三年僧<em>玄奘</em>始建，五层贮经，后增至九层，今所见七层。' },
    { who: '子游', initial: '游', say: '砖石攒尖、四面拱窗——这便是"<em>象阙浮西</em>"？' },
    { who: '老者', initial: '老', say: '然。<em>慈恩寺塔</em>，长安最高，登临可观天市百坊。下旁石狮、香炉、柏阴森森，常有游人题诗于塔壁——"<em>雁塔题名</em>"，进士登科之大事也。' },
    { who: '系统', initial: '✦', say: '塔前广场可见香客、僧侣、士子。' },
  ],
  [  // 3: 曲江池
    { who: '老者', initial: '老', say: '此<em>曲江池</em>。隋开皇引黄渠水入此，唐代成皇室禁苑。<em>上巳节</em>、<em>重阳</em>之日，士庶游赏，画舫穿池，柳岸如云。' },
    { who: '子游', initial: '游', say: '亭中那群人？' },
    { who: '老者', initial: '老', say: '<em>新科进士</em>聚饮于此，谓之"<em>曲江流饮</em>"。"<em>三月三日天气新、长安水边多丽人</em>"——杜少陵之诗景，正是此处。' },
    { who: '系统', initial: '✦', say: '池畔垂柳成行，画舫漂荡。' },
  ],
  [  // 3: 东市
    { who: '老者', initial: '老', say: '<em>东市</em>近达官里坊。卖珠玉、彩帛、丝绸、文玩，<em>胡贾</em>蕃货咸集。' },
    { who: '子游', initial: '游', say: '与<em>西市</em>有何别？' },
    { who: '老者', initial: '老', say: '西市更杂，平民百业；东市清贵，士族多至。<em>武则天</em>时市楼击鼓二百下开市、击钲三百下闭市。' },
    { who: '系统', initial: '✦', say: '市内桃花树下，胡姬蕃商日夜不绝。' },
  ],
  [  // 4: 田畴
    { who: '老者', initial: '老', say: '关中沃野。<em>开元盛世</em>，一夫养十口，关中粟米积如山。' },
    { who: '子游', initial: '游', say: '那弯柄犁是？' },
    { who: '老者', initial: '老', say: '<em>曲辕犁</em>，唐代农匠之新器。短曲辕、可深可浅、转弯灵便——比汉代之直辕犁，效率倍之。河中大轮乃<em>筒车</em>，竹筒兜水自旋而上，灌田千亩。' },
    { who: '系统', initial: '✦', say: '河边筒车昼夜不停，水声潺潺。' },
  ],
  [  // 5: 朱雀门
    { who: '老者', initial: '老', say: '<em>朱雀门</em>，皇城正南门。门道三、城楼重檐，左右挂"龙"、"凤"二旗。' },
    { who: '子游', initial: '游', say: '门钉为何如此之密？' },
    { who: '老者', initial: '老', say: '<em>九五之尊</em>。皇门方钉九纵九横、共八十一，象征九五至尊。普通城门只钉九列。' },
    { who: '系统', initial: '✦', say: '门外迎送骑队，门上甲士林立。' },
  ],
  [  // 6: 边塞
    { who: '老者', initial: '老', say: '此乃<em>云中道</em>。卫国公<em>李靖</em>、苏定方曾出此击突厥。' },
    { who: '子游', initial: '游', say: '帅帐前两面大旗、三具<em>大黄连弩</em>、四四步阵——好不威武！' },
    { who: '老者', initial: '老', say: '大唐军威，远迈汉魏。骑兵以<em>突骑</em>横扫漠北，遣甲带刀皆中亚锻造之上品。' },
    { who: '系统', initial: '✦', say: '战马奔腾、扬尘四起；夜则<span class="hint-glow">22:00</span> 烽燧大燃。' },
  ],
  [  // 7: 驼商
    { who: '老者', initial: '老', say: '<em>丝路</em>畅通。出长安西门，经武威、张掖、敦煌，过阳关、玉门关，可至<em>大食</em>、<em>拂菻</em>。' },
    { who: '子游', initial: '游', say: '骆驼背载丝绢，归则带来什么？' },
    { who: '老者', initial: '老', say: '蒲桃、石榴、胡麻、<em>大宛马</em>、龟兹乐、罽宾舞女、犍陀罗佛像——异域之珍，络绎不绝。' },
    { who: '系统', initial: '✦', say: '驼商队由胡商带头、唐兵护卫，沿西大道徐行。' },
  ],
];

function loadDialogue(idx) {
  const dia = document.getElementById('dialog');
  dia.innerHTML = '';
  DIALOGUES[idx].forEach((t, i) => {
    const turn = document.createElement('div');
    turn.className = 'turn';
    turn.style.animationDelay = (i * 0.12) + 's';
    turn.innerHTML = `
      <div class="avatar">${t.initial}</div>
      <div>
        <div class="name">${t.who}</div>
        <div class="said">${t.say}</div>
      </div>
    `;
    dia.appendChild(turn);
  });
}
loadDialogue(0);

document.getElementById('prevBtn').addEventListener('click', () => navChapter(-1));
document.getElementById('nextBtn').addEventListener('click', () => navChapter(1));
function navChapter(d) {
  const active = document.querySelector('#sceneRail button.active');
  const current = active ? parseInt(active.dataset.scene, 10) : -1;
  const n = SCENES.length;
  const idx = ((current + d) + n) % n;
  document.querySelector(`#sceneRail button[data-scene="${idx}"]`).click();
}

/* ============================================================
 *  Game Mode — 第三人称角色扮演
 *  WASD 移动 / E 交互 / Esc 退出
 * ============================================================ */
const gameState = window.gameState = {
  active: false,
  viewMode: 'tps',     // 'tps' / 'fps' / 'gallery'  (tps = umbrella for all ortho variants below)
  cameraMode: 'isometric',  // 'isometric' / 'follow' / 'topdown' / 'cinema'  (sub-mode of 'tps')
  galleryId: null,
  nearDoor: null,
  fpsCamera: null,
  fpsControls: null,
  player: null,        // THREE.Group
  marker: null,        // 头顶箭头
  preset: null,        // 'scholar'(世子) / 'merchant'(商贾) / 'lady'(侍女) / 'knight'(游侠)
  name: '行客',
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  facing: 0,
  speed: 4.2,
  inputKeys: { w: false, a: false, s: false, d: false, q: false, e: false, shift: false },
  prevHotKeyE: false,
  nearestNpc: null,
  dialogActive: false,
  currentLine: 0,
  dialogScript: null,
  questId: null,
  questStep: 0,
  inventory: [],       // [{ itemId, qty }]
  wallet: { copper: 0, silk: 0, gold: 0, fame: 0 },
  stamina: 100,
  charm: 0,
  charmExpires: 0,
  equip: { head: null, body: null, acc: null },
  nearestShop: null,   // 最近店铺 hotspot
  shopActive: false,
  dialogNpc: null,
  cameraOffset: new THREE.Vector3(12, 18, 12),
  cameraTarget: new THREE.Vector3(),
  savedCameraPos: null,
  savedCameraTarget: null,
  savedZoom: null,
  // 对话取景: 打开 voice panel / dialog 时把镜头切到 3/4 视角, NPC 转身面向玩家
  dialogueFraming: {
    active: false,
    npc: null,
    savedCameraMode: null,
    savedNpcRot: 0,
    npcTargetRot: 0,
  },
};

/* ============================================================
 *  Camera Modes — 五种镜头视角
 *    isometric → 经典等距俯瞰（原 TPS 默认）
 *    follow    → 第三人称越肩跟随，随主角转身
 *    topdown   → 鸟瞰，纯俯视，看地图布局
 *    cinema    → 低角度宽屏剧场视角，戏剧感更强
 *    fps       → 第一人称（已有，独立分支）
 * ============================================================ */
const VIEW_MODES = {
  isometric: {
    id: 'isometric', label: '俯瞰', short: 'ISO',
    offset: new THREE.Vector3(12, 18, 12),
    zoom: 1.4, rotateWithPlayer: false, lookAheadXZ: 0, lookY: 0,
    desc: '经典等距俯瞰，便于全局观察',
  },
  follow: {
    id: 'follow', label: '跟随', short: 'OTS',
    offset: new THREE.Vector3(0, 11, -12),  // 在玩家身后 (-Z, 按 facing 旋转后会变成实际后方)
    zoom: 1.7, rotateWithPlayer: true, lookAheadXZ: 5, lookY: 1.2,
    desc: '第三人称越肩跟随，随主角转身',
  },
  topdown: {
    id: 'topdown', label: '鹰瞰', short: 'TOP',
    offset: new THREE.Vector3(0.01, 38, 0.6),
    zoom: 2.0, rotateWithPlayer: false, lookAheadXZ: 0, lookY: 0,
    desc: '俯视全景，看地图布局',
  },
  cinema: {
    id: 'cinema', label: '剧场', short: 'CINE',
    offset: new THREE.Vector3(20, 7, 6),
    zoom: 1.05, rotateWithPlayer: false, lookAheadXZ: 0, lookY: 1.6,
    desc: '低角度宽屏，戏剧感取景',
  },
  fps: {
    id: 'fps', label: '第一人称', short: 'FPS',
    desc: '主角眼睛视角 (鼠标转头 · ESC 解锁)',
  },
};
const VIEW_MODE_ORDER = ['isometric', 'follow', 'topdown', 'cinema', 'fps'];

function isOrthoCameraMode(m) { return m === 'isometric' || m === 'follow' || m === 'topdown' || m === 'cinema'; }

// 统一切换视角：'isometric' | 'follow' | 'topdown' | 'cinema' | 'fps'
//   - 4 个正交子模式都映射到 viewMode='tps'，差异在 cameraMode + computeDesiredCamera
//   - 'fps' 走原有 setViewMode('fps') 分支
function setCameraView(mode, { silent = false } = {}) {
  if (mode === 'fps') {
    if (gameState.viewMode === 'fps') return;
    if (gameState.viewMode === 'gallery') return;  // 展厅里不允许跳到 fps
    if (typeof setViewMode === 'function') setViewMode('fps');
    if (!silent) showGameToast('视角 · 第一人称 (FPS) — 鼠标转头, ESC 解锁', 1800);
  } else if (isOrthoCameraMode(mode)) {
    // 若当前在 fps，先回到 tps 容器
    if (gameState.viewMode !== 'tps') {
      if (typeof setViewMode === 'function') setViewMode('tps');
    }
    gameState.cameraMode = mode;
    if (!silent) {
      const def = VIEW_MODES[mode];
      showGameToast(`视角 · ${def.label} (${def.short}) — ${def.desc}`, 1800);
    }
  }
  if (typeof window !== 'undefined' && typeof window.updateViewModePicker === 'function') {
    window.updateViewModePicker();
  }
  // 视角变化 → 通知周引之 (debounce 在 emitTourContext 内部处理)
  if (typeof emitTourContext === 'function') {
    const viewBlurb = {
      isometric: '玩家切回了等距斜俯视角，正在俯瞰长安城布局',
      follow:    '玩家切到了第三人称跟随视角，正贴身跟在角色后方',
      topdown:   '玩家切到了俯瞰鹰瞰视角，全城坊里尽在眼底',
      cinema:    '玩家切到了过肩电影镜头视角',
      fps:       '玩家切到了第一人称沉浸视角，准备贴近观察',
    }[mode] || '玩家切换了观察视角';
    emitTourContext('view', `[场景提示] ${viewBlurb}。请用 15-25 字一句话点评一下视野变化或推荐合适的去处。`, { debounceMs: 8000 });
  }
}

// 在 5 个视角之间循环
function cycleCameraView() {
  let curIdx;
  if (gameState.viewMode === 'fps') curIdx = VIEW_MODE_ORDER.indexOf('fps');
  else if (gameState.viewMode === 'gallery') return;  // 展厅不让循环
  else curIdx = VIEW_MODE_ORDER.indexOf(gameState.cameraMode);
  if (curIdx < 0) curIdx = 0;
  const next = VIEW_MODE_ORDER[(curIdx + 1) % VIEW_MODE_ORDER.length];
  setCameraView(next);
}

if (typeof window !== 'undefined') {
  window.setCameraView = setCameraView;
  window.cycleCameraView = cycleCameraView;
}

function getActiveCameraDef() {
  const m = gameState.cameraMode;
  return VIEW_MODES[m] || VIEW_MODES.isometric;
}

// 计算给定模式下的相机理想位置 + 看向目标 (世界坐标)
function computeDesiredCamera(mode, playerPos, facing) {
  const def = VIEW_MODES[mode] || VIEW_MODES.isometric;
  const offset = def.offset.clone();
  if (def.rotateWithPlayer) {
    // 按 facing 旋转 offset 的 (x, z) 分量，让"后方"始终是玩家身后
    const cos = Math.cos(facing), sin = Math.sin(facing);
    const ox = offset.x, oz = offset.z;
    offset.x = ox * cos + oz * sin;
    offset.z = -ox * sin + oz * cos;
  }
  const camPos = new THREE.Vector3(
    playerPos.x + offset.x,
    playerPos.y + offset.y,
    playerPos.z + offset.z,
  );
  // 看向目标 = 玩家 + 前方一小段 + 抬头一点点
  let lookX = playerPos.x, lookZ = playerPos.z;
  if (def.lookAheadXZ) {
    lookX += Math.sin(facing) * def.lookAheadXZ;
    lookZ += Math.cos(facing) * def.lookAheadXZ;
  }
  const lookTarget = new THREE.Vector3(lookX, playerPos.y + (def.lookY || 0), lookZ);
  return { camPos, lookTarget, zoom: def.zoom || 1.4 };
}

const CHARACTER_PRESETS = {
  scholar: {
    name: '世子',
    desc: '蓝袍贵胄，入长安问鼎风雅',
    robe: 'silkBlue', cap: 'black', tool: 'scroll', role: 'scholar',
    starts: { x: 0, z: 12 }, defaultName: '李承曜',
  },
  merchant: {
    name: '商贾',
    desc: '金袍掌柜，通货财与奇珍',
    robe: 'silkGold', cap: 'black', tool: null, role: 'merchant',
    starts: { x: -20, z: 4 }, defaultName: '沈万金',
  },
  lady: {
    name: '侍女',
    desc: '粉衣执扇，随主游赏长安',
    robe: 'silkPink', cap: 'none', tool: null, role: 'lady',
    starts: { x: 30, z: 18 }, defaultName: '阿檀',
  },
  knight: {
    name: '游侠',
    desc: '红衣佩刀，行走市井江湖',
    robe: 'vermillion', cap: 'iron', hat: 'iron', tool: 'halberd', role: 'soldier',
    starts: { x: 4, z: 28 }, defaultName: '聂阳',
  },
};

/* ============================================================
 *  Quests — 主线 5 步
 * ============================================================ */
const QUESTS = {
  arrival: {
    id: 'arrival',
    title: '初到长安',
    steps: [
      {
        text: '走到 朱雀门 城下',
        targetPos: new THREE.Vector3(0, 0, 28),
        radius: 8,
        hint: '北行至朱雀门，向守门将求见。',
      },
      {
        text: '在 西市 寻找张掌柜',
        targetPos: new THREE.Vector3(-22, 0, -3),
        radius: 7,
        hint: '听守门将说，西市张掌柜手中有内城腰牌。',
      },
      {
        text: '到 大雁塔 题名留念',
        targetPos: new THREE.Vector3(28, 0, 22),
        radius: 7,
        hint: '张掌柜赠你笔墨，去慈恩寺塔题"進士及第"。',
        action: 'launchYanta',
      },
      {
        text: '回到 含元殿 前递呈表章',
        targetPos: new THREE.Vector3(0, 0, -60),
        radius: 9,
        hint: '凭你雁塔题名，可至大明宫含元殿前递表，求面圣。',
      },
      {
        text: '任务完成 · 名垂长安',
        targetPos: null,
        hint: '"长安米贵，居大不易"——但你已名留雁塔，再无人敢看轻。',
      },
    ],
  },
};

function buildPlayerAvatar(preset) {
  const opt = CHARACTER_PRESETS[preset];
  const g = buildPerson({
    role: opt.role,
    robe: opt.robe,
    cap: opt.cap,
    hat: opt.hat || null,
    tool: opt.tool,
    scale: 1.05,
  });
  g.userData.isPlayer = true;
  g.userData.npc = false;  // 主角不是 NPC
  // 头顶光环 / 箭头标记
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.08, 6, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe19c, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.55;
  g.add(ring);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.4, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd56b }),
  );
  arrow.position.y = 1.95;
  arrow.rotation.x = Math.PI;
  g.add(arrow);
  g.userData.marker = { ring, arrow };
  return g;
}

function startGame(preset, customName) {
  if (gameState.active) return;
  const opt = CHARACTER_PRESETS[preset];
  if (!opt) return;
  gameState.preset = preset;
  gameState.name = (customName || opt.defaultName).trim();
  gameState.active = true;
  // 保存相机状态
  gameState.savedCameraPos = camera.position.clone();
  gameState.savedCameraTarget = controls.target.clone();
  gameState.savedZoom = camera.zoom;
  // 创建主角
  gameState.player = buildPlayerAvatar(preset);
  gameState.pos.set(opt.starts.x, 0.05, opt.starts.z);
  gameState.player.position.copy(gameState.pos);
  scene.add(gameState.player);
  // 若用户在 MODEL_REGISTRY 里注册了 'player' (或当前职业 preset.key), 自动接管
  // —— 玩家就用 GLB 模型, 程序化几何被隐藏
  const playerGlbKey = MODEL_REGISTRY[preset] ? preset
                     : MODEL_REGISTRY['player'] ? 'player'
                     : null;
  if (playerGlbKey) {
    gameState.player.userData = gameState.player.userData || {};
    gameState.player.userData.personaId = preset;
    attachGlbToNpc(gameState.player, playerGlbKey).then(char => {
      if (char) {
        gameState.player.userData.glbChar = char;
        // 玩家速度由 gameState.pos 与上一帧位置的差算出, 见下面的状态机
      }
    });
  }
  // 启动任务
  startQuest('arrival');
  // 锁定 OrbitControls (但保留键盘)
  controls.enabled = false;
  camera.zoom = 1.4;
  camera.updateProjectionMatrix();
  // 切换 UI
  document.getElementById('gameSelect').classList.remove('show');
  document.getElementById('gameHud').classList.add('show');
  document.querySelector('.app')?.classList.add('game-on');
  // 进入游戏自动收起左侧叙事栏 (但记住玩家此前的偏好以便退出还原)
  if (typeof window.isSideCollapsed === 'function' && typeof window.setSideCollapsed === 'function') {
    gameState._sideWasCollapsed = window.isSideCollapsed();
    if (!gameState._sideWasCollapsed) {
      window.setSideCollapsed(true, { persist: false });
    }
  }
  // 重置背包 & 钱袋（每局新开）— 不同职业开局资源不同
  gameState.inventory = [];
  gameState.equip = { head: null, body: null, acc: null };
  gameState.stamina = 100;
  gameState.charm = 0;
  gameState.charmExpires = 0;
  const startWallet = {
    scholar:  { copper: 60, silk: 3, gold: 1, fame: 6 },
    merchant: { copper: 80, silk: 4, gold: 0, fame: 1 },
    lady:     { copper: 50, silk: 3, gold: 1, fame: 3 },
    knight:   { copper: 40, silk: 0, gold: 0, fame: 2 },
  }[preset] || { copper: 30, silk: 1, gold: 0, fame: 1 };
  gameState.wallet = { ...startWallet };
  // 世子开局赠笔墨
  if (preset === 'scholar') {
    grantItemById('brush_huzhou', null, { silent: true });
    grantItemById('paper_xuan',   null, { silent: true });
  }
  // 侍女开局赠玉佩
  if (preset === 'lady') grantItemById('jade_pendant', null, { silent: true });
  // 游侠开局赠胡饼
  if (preset === 'knight') { grantItemById('hu_cake', null, { silent: true }); grantItemById('hu_cake', null, { silent: true }); }
  updateInventoryUI();
  // 显示初始化提示
  showGameToast(`欢迎，${gameState.name}。WASD 移动 · E 交互 · F 入店 · V 视角 · ⇧F 全屏 · Esc 退出`);
  // 初始化视角选择条
  if (typeof window !== 'undefined' && typeof window.updateViewModePicker === 'function') {
    window.updateViewModePicker();
  }
  // 2.5s 后自动召唤周引之 (随身导览), 在 voice panel 中实时讲解+答疑
  // 若玩家已在和别人对话则跳过, 避免抢镜
  setTimeout(() => {
    if (!gameState.active) return;
    if (voicePanelState.open) return;
    openAmbientTourGuide();
    // 给 iframe 暖机+agent ready 留 6s, 再投递首条 context
    const charClassZh = {
      scholar: '一位蓝袍世子', merchant: '一位商贾', lady: '一位粉衣侍女', knight: '一名红衣游侠',
    }[gameState.preset] || '一位访客';
    setTimeout(() => {
      if (!gameState.active || voicePanelState.personaId !== 'tour_guide') return;
      emitTourContext(
        'arrival',
        `[场景提示] 玩家${gameState.name}（${charClassZh}）方才入长安，眼下立在朱雀大街起点，正张望全景。请你以一句话欢迎并提议下一步去处（不超过 50 字）。`,
        { debounceMs: 0 },
      );
    }, 6000);
  }, 2500);
  // 如果用户点了 "丹青館 / 自寫一幅" 但游戏未启 → 现在 startGame 已经跑完, 自动把人传到馆门口
  if (typeof DiyHall !== 'undefined' && DiyHall.consumePendingTeleport) {
    DiyHall.consumePendingTeleport();
  }
  if (typeof BrandPlaza !== 'undefined' && BrandPlaza.consumePendingTeleport) {
    BrandPlaza.consumePendingTeleport();
  }
}

function endGame() {
  if (!gameState.active) return;
  gameState.active = false;
  if (gameState.player) scene.remove(gameState.player);
  gameState.player = null;
  controls.enabled = true;
  if (gameState.savedCameraPos) {
    camera.position.copy(gameState.savedCameraPos);
    controls.target.copy(gameState.savedCameraTarget);
    camera.zoom = gameState.savedZoom || 1;
    camera.updateProjectionMatrix();
  }
  document.getElementById('gameHud').classList.remove('show');
  document.getElementById('gameDialog').classList.remove('show');
  document.getElementById('gameToast').classList.remove('show');
  document.getElementById('gameSelect').classList.remove('show');
  document.querySelector('.app')?.classList.remove('game-on');
  // 退出游戏：还原玩家进入前的侧栏状态
  if (typeof window.setSideCollapsed === 'function' && gameState._sideWasCollapsed === false) {
    window.setSideCollapsed(false, { persist: false });
  }
  gameState._sideWasCollapsed = undefined;
  // 顺手关闭挂着的语音面板（避免退出后还在右侧浮一个孤儿对话）
  if (typeof closeVoicePanel === 'function' && voicePanelState && voicePanelState.open) {
    closeVoicePanel();
  }
  gameState.dialogActive = false;
  // 关闭 FPS / Gallery
  if (gameState.viewMode !== 'tps') setViewMode('tps');
  if (gameState.fpsControls && gameState.fpsControls.isLocked) gameState.fpsControls.unlock();
}

/* ============================================================
 *  FPS Mode + Gallery 360°
 * ============================================================ */
let fpsCamera = null;
let fpsControls = null;
let fpsMoveKeys = { w: false, a: false, s: false, d: false, shift: false };
const fpsForward = new THREE.Vector3();
const fpsRight = new THREE.Vector3();
const galleryRooms = {};   // id -> { group, center, murals[], title }

function ensureFps() {
  if (fpsCamera) return;
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  fpsCamera = new THREE.PerspectiveCamera(72, aspect, 0.08, 600);
  fpsControls = new PointerLockControls(fpsCamera, renderer.domElement);
  // 锁定状态时禁用 OrbitControls
  fpsControls.addEventListener('lock', () => {
    const o = document.getElementById('fpsHint');
    if (o) o.style.display = 'none';
  });
  fpsControls.addEventListener('unlock', () => {
    const o = document.getElementById('fpsHint');
    if (o && (gameState.viewMode === 'fps' || gameState.viewMode === 'gallery')) o.style.display = '';
  });
  gameState.fpsCamera = fpsCamera;
  gameState.fpsControls = fpsControls;
}

const galleryEnvState = {
  active: false,
  background: null,
  fog: null,
  exposure: null,
  bloom: null,
};

function applyGalleryEnvironment(id) {
  if (!galleryEnvState.active) {
    galleryEnvState.background = scene.background && scene.background.clone
      ? scene.background.clone()
      : scene.background;
    galleryEnvState.fog = scene.fog ? {
      color: scene.fog.color.clone(),
      near: scene.fog.near,
      far: scene.fog.far,
    } : null;
    galleryEnvState.exposure = renderer.toneMappingExposure;
    galleryEnvState.bloom = {
      strength: bloom.strength,
      radius: bloom.radius,
      threshold: bloom.threshold,
    };
    galleryEnvState.active = true;
  }

  // 室内展厅不吃外部晴空白雾和低阈值 Bloom，否则米白墙面会被洗成一片白。
  scene.background = new THREE.Color(id === 'diyhall' ? 0x201711 : 0x17110d);
  if (scene.fog) {
    scene.fog.color.set(id === 'diyhall' ? 0x201711 : 0x17110d);
    scene.fog.near = 60;
    scene.fog.far = 420;
  }
  renderer.toneMappingExposure = id === 'diyhall' ? 0.78 : 0.86;
  bloom.strength = id === 'diyhall' ? 0.04 : 0.08;
  bloom.radius = 0.25;
  bloom.threshold = 0.82;
}

function restoreGalleryEnvironment() {
  if (!galleryEnvState.active) return;
  scene.background = galleryEnvState.background;
  if (scene.fog && galleryEnvState.fog) {
    scene.fog.color.copy(galleryEnvState.fog.color);
    scene.fog.near = galleryEnvState.fog.near;
    scene.fog.far = galleryEnvState.fog.far;
  }
  if (galleryEnvState.exposure != null) {
    renderer.toneMappingExposure = galleryEnvState.exposure;
  }
  if (galleryEnvState.bloom) {
    bloom.strength = galleryEnvState.bloom.strength;
    bloom.radius = galleryEnvState.bloom.radius;
    bloom.threshold = galleryEnvState.bloom.threshold;
  }
  galleryEnvState.active = false;
}

function setViewMode(mode) {
  if (mode === gameState.viewMode) return;
  const prev = gameState.viewMode;
  gameState.viewMode = mode;
  if (mode === 'fps' || mode === 'gallery') {
    ensureFps();
    // 把 FPS 相机放在主角头部位置 (若有 player) 或者展厅中央
    if (mode === 'fps' && gameState.player) {
      const p = gameState.pos;
      fpsCamera.position.set(p.x, 1.6, p.z);
      fpsCamera.lookAt(p.x + Math.sin(gameState.facing), 1.6, p.z + Math.cos(gameState.facing));
      gameState.player.visible = false;
    }
    if (mode === 'gallery') {
      const room = galleryRooms[gameState.galleryId];
      if (room) {
        fpsCamera.position.copy(room.center);
        fpsCamera.lookAt(room.center.x, room.center.y, room.center.z - 1);
      }
      applyGalleryEnvironment(gameState.galleryId);
    }
    renderPass.camera = fpsCamera;
    outline.renderCamera = fpsCamera;
    controls.enabled = false;
    const o = document.getElementById('fpsHint');
    if (o) o.style.display = '';
    // 显示退出按键提示
    const hud = document.getElementById('gameControls') || document.querySelector('.game-controls');
    if (hud) hud.classList.add('fps-mode');
  } else {
    restoreGalleryEnvironment();
    // 切回 TPS
    if (gameState.player) gameState.player.visible = true;
    renderPass.camera = camera;
    outline.renderCamera = camera;
    const o = document.getElementById('fpsHint');
    if (o) o.style.display = 'none';
    if (fpsControls && fpsControls.isLocked) fpsControls.unlock();
    const hud = document.querySelector('.game-controls');
    if (hud) hud.classList.remove('fps-mode');
  }
}

// FPS 更新：用 fpsCamera 的朝向解算位移，同步到 gameState.pos
function updateFps(dt) {
  if (!fpsCamera || gameState.viewMode !== 'fps') return;
  const sp = gameState.speed * (fpsMoveKeys.shift ? 1.7 : 1);
  fpsCamera.getWorldDirection(fpsForward);
  fpsForward.y = 0; fpsForward.normalize();
  fpsRight.copy(fpsForward).cross(new THREE.Vector3(0, 1, 0)).normalize();
  let mx = 0, mz = 0;
  // 对话期间冻结移动 (跟 TPS 一致: 只看 dialogActive, 不看语音面板;
  // 语音面板可能是常驻"周引之"导览, 不应该锁住玩家)
  const frozen = gameState.dialogActive;
  let manualInput = false;
  if (!frozen) {
    if (fpsMoveKeys.w) { mx += fpsForward.x; mz += fpsForward.z; manualInput = true; }
    if (fpsMoveKeys.s) { mx -= fpsForward.x; mz -= fpsForward.z; manualInput = true; }
    if (fpsMoveKeys.d) { mx += fpsRight.x; mz += fpsRight.z; manualInput = true; }
    if (fpsMoveKeys.a) { mx -= fpsRight.x; mz -= fpsRight.z; manualInput = true; }
  }
  // 自动寻路 (语音指令"带我去..."触发) — 玩家无手动输入时生效, 一旦按键立刻让出控制
  if (!frozen && !manualInput && gameState.autoWalk) {
    const aw = gameState.autoWalk;
    const ddx = aw.x - gameState.pos.x, ddz = aw.z - gameState.pos.z;
    const dist = Math.hypot(ddx, ddz);
    if (dist < 1.4) {
      if (typeof showGameToast === 'function') showGameToast(`已到达 · ${aw.label}`, 1500);
      if (typeof emitTourContext === 'function') {
        emitTourContext(
          'arrive:' + aw.label,
          `[场景提示] 玩家循着你指引到了"${aw.label}"，正眼前张望。请用一段连贯讲解（60-110 字, 不换行）介绍此处的来历、风物与逸事。`,
          { debounceMs: 4000 },
        );
      }
      gameState.autoWalk = null;
    } else {
      mx = ddx / dist; mz = ddz / dist;
    }
  } else if (manualInput && gameState.autoWalk) {
    gameState.autoWalk = null; // 玩家主动操作即取消自动寻路
  }
  const mag = Math.hypot(mx, mz);
  if (mag > 0.001) {
    mx /= mag; mz /= mag;
    gameState.pos.x = Math.max(-58, Math.min(58, gameState.pos.x + mx * sp * dt));
    gameState.pos.z = Math.max(-98, Math.min(58, gameState.pos.z + mz * sp * dt));
    fpsCamera.position.x = gameState.pos.x;
    fpsCamera.position.z = gameState.pos.z;
    fpsCamera.position.y = 1.6 + Math.sin(elapsed * 8) * 0.04; // 头部微晃
  } else {
    fpsCamera.position.x = gameState.pos.x;
    fpsCamera.position.z = gameState.pos.z;
    fpsCamera.position.y = 1.6 + Math.sin(elapsed * 4) * 0.015;
  }
  // 同步主角朝向到镜头水平角
  const yaw = Math.atan2(fpsForward.x, fpsForward.z);
  gameState.facing = yaw;
  // 同步隐形 player 的 3D 位置 (供取景/NPC 视觉跟随使用)
  if (gameState.player) {
    gameState.player.position.x = gameState.pos.x;
    gameState.player.position.z = gameState.pos.z;
  }
  // 与 TPS 共用的交互/HUD 循环 (NPC 探测、E 键、店铺、任务步骤)
  updateInteractionsAndHud(dt);
}

function updateGallery(dt) {
  if (!fpsCamera || gameState.viewMode !== 'gallery') return;
  const room = galleryRooms[gameState.galleryId];
  if (!room) return;
  const sp = 2.6;
  fpsCamera.getWorldDirection(fpsForward);
  fpsForward.y = 0; fpsForward.normalize();
  fpsRight.copy(fpsForward).cross(new THREE.Vector3(0, 1, 0)).normalize();
  let mx = 0, mz = 0;
  if (fpsMoveKeys.w) { mx += fpsForward.x; mz += fpsForward.z; }
  if (fpsMoveKeys.s) { mx -= fpsForward.x; mz -= fpsForward.z; }
  if (fpsMoveKeys.d) { mx += fpsRight.x; mz += fpsRight.z; }
  if (fpsMoveKeys.a) { mx -= fpsRight.x; mz -= fpsRight.z; }
  const mag = Math.hypot(mx, mz);
  if (mag > 0.001) {
    mx /= mag; mz /= mag;
    const next = fpsCamera.position.clone();
    next.x += mx * sp * dt;
    next.z += mz * sp * dt;
    // 房间边界 (room.bound = radius)
    const half = room.halfSize - 0.4;
    next.x = Math.max(room.center.x - half, Math.min(room.center.x + half, next.x));
    next.z = Math.max(room.center.z - half, Math.min(room.center.z + half, next.z));
    fpsCamera.position.x = next.x;
    fpsCamera.position.z = next.z;
  }
  // 朝向最近壁画时显示标题
  let nearMural = null, bestDot = -1;
  for (const m of room.murals) {
    const toM = m.mesh.getWorldPosition(new THREE.Vector3()).sub(fpsCamera.position).normalize();
    const dot = toM.dot(fpsForward);
    if (dot > 0.85 && dot > bestDot) {
      bestDot = dot;
      nearMural = m;
    }
  }
  const card = document.getElementById('muralCard');
  if (card) {
    if (nearMural) {
      const mp = nearMural.masterpiece ? ` <span class="m-tag">真迹</span>` : '';
      const meta = nearMural.masterpiece
        ? `<div class="m-meta">${[nearMural.artist, nearMural.dynasty, nearMural.year].filter(Boolean).join(' · ')}</div>`
        : '';
      card.innerHTML = `<div class="m-title">${nearMural.title}${mp}</div>${meta}<div class="m-cap">${nearMural.caption}</div>`;
      card.classList.add('show');
    } else {
      card.classList.remove('show');
    }
  }
  // 真迹凝视 ≥1.2s → 自动让苏阮卿讲解 (每幅画 debounce 40s, 不会反复抛)
  if (nearMural && nearMural.masterpiece) {
    const now = Date.now();
    if (tourGuide.lastNearbyMural !== nearMural.title) {
      tourGuide.lastNearbyMural = nearMural.title;
      tourGuide.lastNearbyMuralAt = now;
    } else if (now - tourGuide.lastNearbyMuralAt > 1200) {
      const brief = nearMural.voice_brief || nearMural.caption || '';
      const meta = [nearMural.artist, nearMural.dynasty, nearMural.year].filter(Boolean).join(' · ');
      const detail = (nearMural.viewpoints && nearMural.viewpoints.length)
        ? ' 可挑这些细节铺陈: ' + nearMural.viewpoints.slice(0, 2).join(' / ')
        : '';
      emitDocentContext(
        'mural:' + nearMural.title,
        `[场景提示] 客人驻足在《${nearMural.title}》前 (${meta}). 这幅画的要点: ${brief}.${detail} 阮卿请你以画学博士口吻, 用一段 100-150 字的连贯讲解开讲, 按"作者 → 形制 → 命意 → 趣闻"自然展开, 但只挑两到三处最动人的细节铺陈, 不换行.`,
        { debounceMs: 40000 },
      );
    }
  } else if (!nearMural) {
    tourGuide.lastNearbyMural = null;
  }
  // 普通题材壁画 (非真迹) 也提一句, 但话很短 (50-80 字)
  if (nearMural && !nearMural.masterpiece) {
    const now = Date.now();
    if (tourGuide.lastNearbyMural !== nearMural.title) {
      tourGuide.lastNearbyMural = nearMural.title;
      tourGuide.lastNearbyMuralAt = now;
    } else if (now - tourGuide.lastNearbyMuralAt > 1500) {
      const brief = nearMural.voice_brief || nearMural.caption || '';
      emitDocentContext(
        'mural-aux:' + nearMural.title,
        `[场景提示] 客人转向壁画《${nearMural.title}》(非真迹, 殿内自配). 题材要点: ${brief} 阮卿请用 50-80 字简短点一句来历与寓意, 不换行.`,
        { debounceMs: 30000 },
      );
    }
  }
  // 苏阮卿轻微 idle 摆动 (站姿微转), 让她看起来在听客人讲话
  const docentBundle = galleryDocents[gameState.galleryId];
  if (docentBundle && docentBundle.docent) {
    const d = docentBundle.docent;
    const base = d.userData.baseRot || 0;
    // 朝向"客人 + 真迹"的中点; 没有 nearMural 时仅微微回正
    let targetRot = base;
    if (nearMural) {
      const mp = nearMural.mesh.getWorldPosition(new THREE.Vector3());
      const cp = fpsCamera.position;
      const aim = new THREE.Vector3((mp.x + cp.x) * 0.5, 0, (mp.z + cp.z) * 0.5);
      targetRot = Math.atan2(aim.x - d.position.x, aim.z - d.position.z);
    }
    // 微缓插值 (lerpAngle)
    let delta = targetRot - d.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    d.rotation.y += delta * Math.min(1, dt * 1.4);
    // 头部微微浮动 (用 idle 累计)
    d.userData.idle = (d.userData.idle || 0) + dt;
    d.position.y = d.userData.basePos.y + Math.sin(d.userData.idle * 1.8) * 0.014;
  }
}

/* ============================================================
 *  Galleries — 大殿 / 大雁塔 / 慈恩寺 / 曲江亭 360° 展厅
 *  房间预置在天空 y=500 之上，FPS 进入时传送
 * ============================================================ */
const GALLERIES = {
  // 丹青馆 — 用户 DIY 馆, ensureGallery() 识别 isDiyHall 跳过常规渲染
  diyhall: DiyHall.DIY_GALLERY_DEF,
  hanyuan: {
    title: '含元殿 · 万邦来朝',
    center: new THREE.Vector3(-300, 502, 0),
    halfSize: 9,
    wallColor: 0x8a3a26,
    floorColor: 0x5a3c20,
    ceilColor: 0x2a1f16,
    panels: [
      {
        // 真迹 1：阎立本 · 步辇图（贞观十五年 · 唐太宗接见吐蕃使者禄东赞）
        title: '步辇图',
        caption: '贞观十五年，太宗坐步辇接见吐蕃使者禄东赞，议文成公主入藏和亲——大唐与吐蕃汉藏一家之始。',
        tint: 0xc04030,
        imageUrl: 'murals/bunian-tu.png',
        masterpiece: true,
        artist: '阎立本',
        dynasty: '唐',
        year: '贞观十五年（641 年）',
        medium: '绢本设色 · 38.5×129cm',
        keeper: '北京故宫博物院',
        voice_brief: '阎立本《步辇图》。画面右侧太宗坐步辇，九宫女抬辇举扇；左侧三人：典礼官在前引路，红衣禄东赞居中，白袍译官随后。题材是贞观十五年松赞干布遣禄东赞求婚——次年文成公主入藏，开汉藏和亲之先河。',
        viewpoints: [
          '画中太宗的步辇由九名宫女抬扛，举伞张扇——天子出行规制可由此一窥。',
          '红衣者即禄东赞，吐蕃名相，深目高鼻、衣袍带土黄色调，画家用色凸显异族身份。',
          '前后两个礼官，一人持笏在前，一人为通译——这是唐朝接见外使的"三人组"标准程式。',
          '阎立本号"右相"，主管太宗朝绘画署，画中人物比例严格遵循"主大臣小"的等级法，太宗最大。',
        ],
      },
      {
        // 真迹 2：阎立本 · 历代帝王图（贞观时期 · 13 位历代帝王肖像）
        title: '历代帝王图',
        caption: '阎立本绘十三位历代帝王全身像，自汉昭烈至隋炀帝。太宗以为镜鉴：成就在为君者一念之间。',
        tint: 0xd1a050,
        imageUrl: 'murals/lidai-diwang-tu.png',
        masterpiece: true,
        artist: '阎立本',
        dynasty: '唐',
        year: '约贞观（627-649 年）',
        medium: '绢本设色 · 51.3×531cm',
        keeper: '美国波士顿美术馆',
        voice_brief: '阎立本《历代帝王图》。十三位帝王自右向左：汉昭烈（刘备）、汉光武、魏文帝、吴大帝、晋武帝、陈宣帝、陈文帝、陈废帝、陈后主、北周武帝、隋文帝、隋炀帝……每位帝王身边配二到四名侍从。画家用衣冠颜色明暗、身姿仪态来褒贬功过。',
        viewpoints: [
          '画卷从右起：汉昭烈帝刘备，红袍——画家以正色彰显仁主之像。',
          '隋炀帝立于卷末，黑袍佝偻，眉宇含忧——亡国之君的"贬笔"。',
          '太宗令阎立本作此图，意在以历代得失自勉——"以铜为镜可正衣冠，以古为镜可知兴替"。',
          '画中人物等大却气度悬殊：开国仁主皆挺立轩昂，亡国之君则侧身退缩，是中国人物画"以形写神"的范本。',
        ],
      },
      {
        title: '万邦来朝',
        caption: '日本遣唐使、新罗朝贡、大食使节、吐蕃赞普——异邦贺正使节列于含元殿丹墀。',
        tint: 0xd1a050,
        voice_brief: '此为"万邦来朝"理想图景：元正之日，外邦使节自丹凤门入，登含元殿丹墀朝贺，奏《九部乐》。',
      },
      {
        title: '元日大朝',
        caption: '正月元日，皇帝御含元殿，受群臣朝贺，奏《破阵乐》《庆善乐》。',
        tint: 0x9a3030,
        voice_brief: '元日大朝是大唐最隆重的朝会，文武百官按品级序立，皇帝亲御含元殿——这场仪式一年只此一回。',
      },
      {
        title: '凤翔丹墀',
        caption: '含元殿前有翔鸾、栖凤双阙，飞檐如展翼。',
        tint: 0xd4a060,
        voice_brief: '含元殿前翔鸾、栖凤二阁——双阙如展翼凤凰，是大明宫"千官望长安、万国拜含元"的标志。',
      },
    ],
  },
  xuanzheng: {
    title: '宣政殿 · 常朝政务',
    center: new THREE.Vector3(-300, 502, 60),
    halfSize: 7,
    wallColor: 0x4a3622,
    floorColor: 0x5a3c20,
    ceilColor: 0x2a1f16,
    panels: [
      { title: '常朝图', caption: '宣政殿为天子常朝之所，五日一朝，三省六部奏事。', tint: 0xc09060 },
      { title: '紫绯朝服', caption: '三品以上服紫，四五品服绯，金银鱼袋别尊卑。', tint: 0x9a3a4a },
      { title: '中书省草制', caption: '中书草、门下封、尚书行——三省制衡之政。', tint: 0x6a8838 },
      { title: '御史台', caption: '"豸冠"獬豸冠，纠弹百官，肃整朝纲。', tint: 0x4a5870 },
    ],
  },
  zichen: {
    title: '紫宸殿 · 内朝寝兴',
    center: new THREE.Vector3(-300, 502, 120),
    halfSize: 8,
    wallColor: 0x6a4a30,
    floorColor: 0x5a3c20,
    ceilColor: 0x3a2818,
    panels: [
      {
        // 真迹 3: 周昉《簪花仕女图》 (御府新藏 · 中晚唐宫廷仕女画压卷之作)
        title: '簪花仕女图',
        caption: '周昉绘宫中贵妇五人、侍女一人，戏犬扑蝶、执扇引鹤；簪花高髻、红裙曳地——盛唐"丰肌秀骨"仕女画的范本。',
        tint: 0xc08868,
        imageUrl: 'murals/zanhua-shinu-tu.png',
        masterpiece: true,
        artist: '周昉',
        dynasty: '唐',
        year: '约大历至贞元间（766-805 年）',
        medium: '绢本设色 · 46×180cm',
        keeper: '辽宁省博物馆',
        voice_brief: '周昉《簪花仕女图》。横卷, 六位人物自右向左: 持拂红裙妇人逗小犬、侍女执长柄团扇、披纱中年仕女款步而来、幼女持团扇随侍、执花仕女低头嗅花、最右贵妇执拂柄引白鹤。皆梳"望仙髻"高髻、簪四五朵牡丹芍药、外披透明罗纱大袖衫, 内着抹胸襦裙。',
        viewpoints: [
          '画家以"游丝描"细线勾勒披纱, 透出内里红裙花纹——"层而不乱"的笔法是周郎方独门绝技。',
          '六位人物体态"丰腴秾丽", 与阎立本时代的修长身姿判然有别——这是开元天宝以来"以肥为美"的审美定型, 杨贵妃便是这身姿。',
          '画中无任何背景, 只见人物相互呼应——戏犬妇人手中拂柄、执扇侍女眼神、簪花妇人低头闻香, 形成"以人映人"的空间感。',
          '题材表面是宫闱闲事, 实则是宫廷女子在朝政紧绷之外的一点松弛——史家以为这恰是天宝后期"避乱怀宁"心境的隐喻。',
        ],
      },
      { title: '入阁仪', caption: '紫宸殿为内朝，唯亲贵大臣得入，谓之"入阁"。', tint: 0xb88848 },
      { title: '夜对', caption: '皇帝夜召学士对答时政，烛火摇红，琴书雅集。', tint: 0x3a3050 },
      { title: '后宫', caption: '紫宸殿后即蓬莱、太液池，皇帝寝兴起居之所。', tint: 0xc05878 },
    ],
  },
  pagoda: {
    title: '大雁塔 · 玄奘西天',
    center: new THREE.Vector3(-300, 502, 180),
    halfSize: 7,
    wallColor: 0x705038,
    floorColor: 0x5a3c20,
    ceilColor: 0x3a2818,
    panels: [
      { title: '玄奘取经图', caption: '贞观三年，玄奘西行万里，赴天竺求佛法十七年。', tint: 0xd4a060 },
      { title: '译经场', caption: '回长安后，于慈恩寺西院译经一千三百三十五卷。', tint: 0xa07040 },
      { title: '雁塔题名', caption: '凡进士登第，杏花盛开时齐登塔顶题名留念。', tint: 0xc06030 },
      { title: '佛祖说法', caption: '《大唐西域记》载西天圣境，菩萨垂华盖，香风四溢。', tint: 0xe0c060 },
    ],
  },
  qujiang: {
    title: '曲江亭 · 文人雅集',
    center: new THREE.Vector3(-300, 502, 240),
    halfSize: 7,
    wallColor: 0x4a5a3a,
    floorColor: 0x5a3c20,
    ceilColor: 0x3a3a28,
    panels: [
      { title: '丽人行', caption: '"三月三日天气新，长安水边多丽人"——杜甫《丽人行》。', tint: 0xc06090 },
      { title: '曲江流饮', caption: '羽觞随曲水漂流，停于谁前谁赋诗一首。', tint: 0x5a8090 },
      { title: '杏园探花', caption: '新科进士曲江游宴，择年少俊美者为"探花使"。', tint: 0xe0a0a0 },
    ],
  },
  // === 鞍马图苑 · 韩马韩牛 ===
  // 太仆寺与殿中省共维之畜兽画苑, 专陈大唐鞍马、牛畜两宗——
  // 韩干笔下的御厩名马(照夜白), 韩滉宰相亲笔的中原五牛。
  // 大唐"重马政"的传统由此可见, 苏阮卿在此可讲到太仆寺、汗血马、六监八坊。
  anma: {
    title: '鞍马图苑 · 韩马韩牛',
    center: new THREE.Vector3(-300, 502, 360),
    halfSize: 8,
    wallColor: 0x5a3a22,   // 栗色 (马毛)
    floorColor: 0x8a6a3a,  // 干草色
    ceilColor: 0x3a2818,   // 深木梁
    panels: [
      {
        // 真迹 6: 韩干《照夜白图》
        title: '照夜白图',
        caption: '韩干所绘玄宗御马"照夜白"——大宛汗血宝马, 拴桩昂首嘶鸣, 蹄爪奋张如欲腾空。',
        tint: 0xeae3d2,
        masterpiece: true,
        artist: '韩干',
        dynasty: '盛唐 · 玄宗朝',
        year: '约天宝初 (约 742 年)',
        medium: '纸本设色, 30.8 × 33.5 cm',
        keeper: '泰西纽约大都会博物馆 (真迹)',
        voice_brief: '《照夜白》是韩干壮年盛笔, 画的是玄宗皇帝最珍爱的一匹西域大宛汗血宝马, 因毛色雪白、夜行如月而得名。画中马匹拴在一根木桩上, 昂首长嘶、蹄爪奋张, 鬃毛飞起, 是大唐"鞍马画"的扛鼎之作。',
        viewpoints: [
          '韩干画马, 不学前人成法, 直入御厩对真马写生——他对玄宗说: "陛下内厩之马, 皆臣之师也。"是中国画史上"对实物写生"的开山。',
          '此马"照夜白"是大宛(今费尔干纳)所献汗血宝马, 玄宗"日不见照夜白则寝不安", 命韩干画其形以慰相思。',
          '画中马匹的"飞踢之势" — 前蹄腾空、后蹄踏地, 是韩干独创的"瞬间动势"画法, 后世张萱、周昉画人物动姿皆师之。',
          '杜甫诗 "干惟画肉不画骨"——后人多解作贬, 阮卿以为乃是赞叹: 韩干以丰润示力量, 把战马的"内里精气"全融在那一身雪白的肌理里了。',
        ],
      },
      {
        // 真迹 7: 韩滉《五牛图》
        title: '五牛图',
        caption: '韩滉所绘五头神态各异之牛——立、行、舐、回首、走泥, 中唐"重农画"的压卷之作。',
        tint: 0xc89868,
        masterpiece: true,
        artist: '韩滉',
        dynasty: '中唐 · 德宗朝',
        year: '约贞元间 (约 780-790 年)',
        medium: '纸本设色, 长 139.8 × 高 20.8 cm',
        keeper: '皇宫秘藏 (现存北京故宫博物院)',
        voice_brief: '《五牛图》是韩滉以宰相之尊亲笔所绘——五头牛、黑白花、赭红、棕黄各异毛色, 各作立、行、舐、回首、走泥之姿, 五种动态、五种性情, 是中唐"重农画"的最高代表。',
        viewpoints: [
          '韩滉是中唐宰相, 官至同平章事, 总持江淮转运十年; 在公务之余以画自遣——这是士大夫"以画明志"的范本。',
          '五牛各具其性: 最右黑白花牛独立回首, 神色微傲; 居中老牛回首望向画外, 似听人语; 左侧两牛对行如夫妻共耕。',
          '韩滉用笔粗壮如农夫扛犁, 线条沉重稳实——是"以拙胜巧"的极致, 也是中唐文人画"意远笔近"之滥觞。',
          '此卷寄意: 大唐以农立国, 牛是农事根本; 宰相亲画五牛, 是向天子宣告"勤农即勤政"——一卷画即一道政纲。',
        ],
      },
      {
        title: '太宗六骏石刻',
        caption: '昭陵北门外六块石浮雕——太宗一生驰骋疆场的六匹战马: 飒露紫、青骓、特勒骠、什伐赤、白蹄乌、拳毛䯄。',
        tint: 0x8a5c3a,
        voice_brief: '"昭陵六骏"是太宗李世民临终遗命所建, 立于昭陵北司马门外。阎立本起稿、石匠雕刻, 是大唐"重马"国策最沉痛的纪念。',
      },
      {
        title: '汗血宝马入贡图',
        caption: '大宛、康居、回鹘使节牵汗血宝马入长安——西域诸国年年献马, 充实御厩, 也充实大唐铁骑。',
        tint: 0x6a8a4a,
        voice_brief: '大宛、康居、于阗诸国每年向大唐进贡汗血马, 由太仆寺监收, 编入御厩或六监八坊。玄宗朝御厩养马最盛时, 多至四十万匹。',
      },
      {
        title: '六监八坊行营图',
        caption: '太仆寺六监八坊四十八监牧——散布陇右、河西、河东三道, 是大唐马政的脊梁。',
        tint: 0x4a5a78,
        voice_brief: '太仆寺下辖六监八坊四十八监牧, 散布西北三道; 安史之乱后, 六监马失大半, 唐朝从此再无昔年铁骑之盛。',
      },
    ],
  },
  // === 万邦奇画苑 · 瀛海远卷 ===
  // 长安画学馆的偏殿, 专陈列波斯、大食、天竺、大秦(罗马)等远方所贡画卷。
  // 因画风奇特、人物常憨态似童子, 此苑别号"童子苑"。
  // 苏阮卿在此可坦然讲泰西名作: 这些是"千载之后远舶画师所摹奇梦"。
  wanguo: {
    title: '万邦奇画苑 · 瀛海远卷',
    center: new THREE.Vector3(-300, 502, 300),
    halfSize: 8,
    wallColor: 0x1a2848,    // 深靛 — 呼应星空蓝
    floorColor: 0x4a3820,   // 暖羊皮纸
    ceilColor: 0x121a30,    // 夜空
    panels: [
      {
        // 真迹 4 (异邦): 蒙娜丽莎童子像 (达·芬奇 Mona Lisa 的 Q 版摹本)
        title: '蒙娜丽莎童子像',
        caption: '泰西大秦国后裔画师达·芬奇所作《里萨夫人像》, 童子笔法摹本——黑袍含笑、青山远水, 西人称作"千年第一画"。',
        tint: 0x6a5238,
        imageUrl: 'murals/monalisa-q.png',
        masterpiece: true,
        artist: '达·芬奇 (传)',
        dynasty: '瀛海西极 · 文艺新生时',
        year: '千年之后 (约公元 1503-1506)',
        medium: '童趣摹本 · 纸本设色',
        keeper: '泰西卢浮宫 (真迹)',
        voice_brief: '《蒙娜丽莎》本为西海大秦遗民画师达·芬奇所绘半身仕女像, 画中是商人之妻里萨, 含微笑而坐, 背后蜿蜒山水如梦。此画乃童趣摹本——人面如圆月, 大眼黑黑如墨, 两颊染胭脂, 然眉宇间的浅笑与原作相承, 山水缥缈如真。',
        viewpoints: [
          '画中人那一抹浅笑——西人千百年来不解其意, 或谓含愁、或谓含喜、或谓欲言又止, 此即所谓"蒙娜丽莎之微笑"。',
          '背景的青山曲水, 画家以"渐淡法" (sfumato) 令远景如雾中所见——这种使远景失焦发青的技法, 比我朝"远山无皴, 近山有皴"的写意更进一程。',
          '原作画师达·芬奇是西海大秦后裔, 既画画也通天文、机巧、解剖、水利——是个"什么都钻研"的奇才, 这画整整画了三年还说没完。',
          '此摹本人物体小头大、双瞳如珠, 是"童子笔" (即 Q 版) 的画风——略其形而存其神, 与我朝齐白石"妙在似与不似之间"暗合。',
        ],
      },
      {
        // 真迹 5 (异邦): 星河村夜图 (梵高 Starry Night 的 Q 版摹本)
        title: '星河村夜图',
        caption: '泰西后裔画师梵高所绘《星夜》之童趣摹本——夜空旋涡如星河奔涌, 月亮含笑而下, 山下村庄灯火点点。',
        tint: 0x2848a0,
        imageUrl: 'murals/xingye-q.png',
        masterpiece: true,
        artist: '梵高 (传)',
        dynasty: '瀛海西极 · 印象后时代',
        year: '千一百年之后 (公元 1889)',
        medium: '童趣摹本 · 油彩仿色',
        keeper: '泰西纽约现代美术馆 (真迹)',
        voice_brief: '《星夜》乃西海大秦后裔画师梵高所作, 时其身在疯人院, 自窗中所见夜空有感而绘。原作笔触粗犷, 星辰、云气皆作旋涡之状, 仿若整个夜空在活活转动。此摹本以童趣笔法存其精神——月亮作笑面、星子团团旋, 山村灯火金黄如萤。',
        viewpoints: [
          '画中漩涡星河——西人谓此乃梵高"目疾所见"或"心病所幻", 我观之, 却像我朝顾恺之画水时"以波纹勾起涟漪"的笔法, 暗合"动中含静"的意趣。',
          '左侧那株擎天巨柏, 浓黑如墨笔提按——西人谓柏为"墓园之木", 此画暗藏画师对死亡的凝视；却也可解作长安园林中那种"独柏冲天"的高古之气。',
          '画师梵高生前一画都未卖出去, 一生贫病潦倒, 三十七岁早殁——身后画价直至数百年后才被推崇, 这是绘画之道里"生不逢时"的范本。',
          '此摹本将那轮月亮画成憨笑童脸——这是西人称"Q 版"的画法, 将悲剧的原作转化为可亲可近的睡前故事, 阮卿以为, 这正是"以稚趣化沉重"的另一种慈悲。',
        ],
      },
      {
        title: '波斯邸献画图',
        caption: '西市波斯邸胡商献画——驼背画卷千卷, 远自大秦、波斯、大食。',
        tint: 0xc08848,
        voice_brief: '西市波斯邸胡商每年向长安画学馆献画千卷, 多为大秦遗风、波斯细密、天竺梵相之作, 是大唐"万国来朝"在丹青上的写照。',
      },
      {
        title: '童子笔奇画',
        caption: '凡画中人物头大身小、双瞳似珠、神态憨然者, 馆内皆归此"童子苑"。',
        tint: 0x886040,
        voice_brief: '"童子苑"是馆内别号——凡画风稚拙、人物头大身小、神态憨然的远舶画, 都归此苑。看似童子戏笔, 实则多藏巧思, 是西人取我朝"妙在似与不似之间"的另一种诠释。',
      },
    ],
  },
};

function buildPlacardCanvas(p) {
  // 真迹下方铜牌：黑漆底 + 描金字 (标题 · 作者 · 年代 · 收藏)
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a0f08';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d4a04a';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = '#f5e0a8';
  ctx.font = 'bold 56px "STKaiti","Kaiti","KaiTi",serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.title || '', canvas.width / 2, 70);
  ctx.font = '28px "STSong","SimSun",serif';
  ctx.fillStyle = '#d4a060';
  const meta = [p.artist, p.dynasty, p.year].filter(Boolean).join(' · ');
  ctx.fillText(meta, canvas.width / 2, 115);
  if (p.medium) {
    ctx.font = '22px "STSong","SimSun",serif';
    ctx.fillStyle = '#b48848';
    ctx.fillText(p.medium + (p.keeper ? ' · ' + p.keeper : ''), canvas.width / 2, 152);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildMuralCanvas(panel) {
  // 占位壁画：纯色底 + 标题 + 装饰 + 注解
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  // 底色 + 渐变
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const c = new THREE.Color(panel.tint);
  grad.addColorStop(0, `rgb(${Math.floor(c.r*150)},${Math.floor(c.g*150)},${Math.floor(c.b*150)})`);
  grad.addColorStop(1, `rgb(${Math.floor(c.r*80)},${Math.floor(c.g*80)},${Math.floor(c.b*80)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 边框 (描金)
  ctx.strokeStyle = '#d4a04a';
  ctx.lineWidth = 16;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
  // 噪点 / 颗粒
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,220,160,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
  }
  // 装饰 — 仿壁画云纹
  ctx.strokeStyle = 'rgba(255,220,160,0.5)';
  ctx.lineWidth = 4;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    const cx = 120 + r * 180, cy = 200 + (r % 2) * 100;
    ctx.arc(cx, cy, 50, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  // 标题
  ctx.fillStyle = '#f5e0a8';
  ctx.font = 'bold 76px "STKaiti","Kaiti","KaiTi","SimSun",serif';
  ctx.textAlign = 'center';
  ctx.fillText(panel.title, canvas.width / 2, canvas.height / 2 - 20);
  // 注解
  ctx.fillStyle = '#fff2c8';
  ctx.font = '24px "STSong","SimSun",serif';
  const lines = panel.caption.match(/.{1,18}/g) || [];
  lines.forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, canvas.height / 2 + 60 + i * 36));
  // 落款
  ctx.fillStyle = '#d4a060';
  ctx.font = '20px serif';
  ctx.fillText('— 大唐长安壁画 —', canvas.width / 2, canvas.height - 90);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function loadMuralImage(panel) {
  // 用户可在 panel 上设置 imageUrl 来加载真实素材；加载失败时返回 null 走占位
  if (!panel.imageUrl) return null;
  const loader = new THREE.TextureLoader();
  const tex = loader.load(
    panel.imageUrl,
    undefined,
    undefined,
    () => { console.warn('[mural] 加载失败，回退占位:', panel.imageUrl); },
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildGalleryRoom(id, def) {
  const g = new THREE.Group();
  g.position.copy(def.center);
  const H = 6, R = def.halfSize;
  // 地板
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshLambertMaterial({ color: def.floorColor }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -H / 2;
  g.add(floor);
  // 天花板
  const ceil = floor.clone();
  ceil.material = new THREE.MeshBasicMaterial({ color: def.ceilColor });
  ceil.position.y = H / 2;
  ceil.rotation.x = Math.PI / 2;
  g.add(ceil);
  // 4 面墙（带壁画）
  const panels = def.panels;
  const wallMat = new THREE.MeshLambertMaterial({ color: def.wallColor });
  const muralRefs = [];
  // 按 panel 数量在 4 / 6 / 8 面墙间分配
  const N = Math.max(4, Math.min(8, panels.length * 2));   // 偶数面墙
  const ang0 = Math.PI / 4;
  for (let i = 0; i < N; i++) {
    const a = ang0 + (i / N) * Math.PI * 2;
    const wx = Math.sin(a) * R;
    const wz = Math.cos(a) * R;
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry((Math.PI * 2 * R) / N - 0.05, H),
      wallMat,
    );
    wall.position.set(wx, 0, wz);
    wall.lookAt(0, 0, 0);
    g.add(wall);
    // 在 odd index 的墙上挂壁画
    if (i % 2 === 1 && panels[(i - 1) / 2 | 0]) {
      const p = panels[Math.floor((i - 1) / 2)] || panels[panels.length - 1];
      const tex = loadMuralImage(p) || buildMuralCanvas(p);
      // 真迹（长卷）用横幅；其他用立轴
      const isScroll = !!p.masterpiece;
      const muralH = isScroll ? H * 0.42 : H * 0.78;
      const muralW = isScroll ? H * 1.45 : muralH * 0.75;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(muralW, muralH),
        new THREE.MeshBasicMaterial({ map: tex }),
      );
      m.position.set(wx * 0.96, 0, wz * 0.96);
      m.lookAt(0, 0, 0);
      g.add(m);
      // 真迹加描金画框
      if (isScroll) {
        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(muralW + 0.4, muralH + 0.4),
          new THREE.MeshBasicMaterial({ color: 0x4a2818 }),
        );
        frame.position.set(wx * 0.97, 0, wz * 0.97);
        frame.lookAt(0, 0, 0);
        frame.renderOrder = -1;
        g.add(frame);
        const gold = new THREE.Mesh(
          new THREE.PlaneGeometry(muralW + 0.2, muralH + 0.2),
          new THREE.MeshBasicMaterial({ color: 0xd4a04a }),
        );
        gold.position.set(wx * 0.965, 0, wz * 0.965);
        gold.lookAt(0, 0, 0);
        g.add(gold);
        // 真迹下方小铜牌：标题 + 作者
        const placard = new THREE.Mesh(
          new THREE.PlaneGeometry(muralW * 0.55, 0.55),
          new THREE.MeshBasicMaterial({ map: buildPlacardCanvas(p), transparent: true }),
        );
        placard.position.set(wx * 0.96, -muralH * 0.5 - 0.55, wz * 0.96);
        placard.lookAt(0, -muralH * 0.5 - 0.55, 0);
        g.add(placard);
      }
      // 真迹面板携带完整 voice metadata，留给 hotspot 用
      muralRefs.push({
        mesh: m, title: p.title, caption: p.caption,
        masterpiece: !!p.masterpiece,
        artist: p.artist, dynasty: p.dynasty, year: p.year,
        medium: p.medium, keeper: p.keeper,
        voice_brief: p.voice_brief, viewpoints: p.viewpoints,
      });
    }
  }
  // 光源 (展厅内灯)
  const torchA = new THREE.PointLight(0xffd29a, 1.4, 18, 1.5);
  torchA.position.set(0, 1.2, 0);
  g.add(torchA);
  const torchB = new THREE.PointLight(0xffe2b0, 0.6, 20, 1.5);
  torchB.position.set(0, H / 2 - 0.5, 0);
  g.add(torchB);
  // 中央展示牌
  const titleCanvas = document.createElement('canvas');
  titleCanvas.width = 512; titleCanvas.height = 128;
  const tctx = titleCanvas.getContext('2d');
  tctx.fillStyle = '#1a0f08';
  tctx.fillRect(0, 0, 512, 128);
  tctx.strokeStyle = '#d4a060';
  tctx.lineWidth = 4;
  tctx.strokeRect(10, 10, 492, 108);
  tctx.fillStyle = '#f5e0a8';
  tctx.font = 'bold 44px "STKaiti","Kaiti","KaiTi",serif';
  tctx.textAlign = 'center';
  tctx.fillText(def.title, 256, 80);
  const titleTex = new THREE.CanvasTexture(titleCanvas);
  titleTex.colorSpace = THREE.SRGBColorSpace;
  const titleBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true }),
  );
  titleBoard.position.set(0, 2.4, 0);
  g.add(titleBoard);

  scene.add(g);
  return { group: g, center: def.center.clone(), halfSize: R, murals: muralRefs, title: def.title };
}

// 显式加载所有 galleries (lazy: 只在用户首次进入时构建)
function ensureGallery(id) {
  if (galleryRooms[id]) return galleryRooms[id];
  const def = GALLERIES[id];
  if (!def) return null;
  // 丹青馆: 几何已在模块 install 时建好, 这里只回一个 synthetic room
  // 供 updateGallery (movement bounds) 使用
  if (def.isDiyHall) {
    galleryRooms[id] = {
      group: null,
      center: def.center.clone(),
      halfSize: def.halfSize,
      murals: [],   // 无壁画 → 不触发 docent 凝视讲解
      title: def.title,
      isDiyHall: true,
    };
    return galleryRooms[id];
  }
  // 品牌展馆: 同样由 BrandPlaza 自建几何, 这里只回 synthetic room
  if (def.isBrandPavilion) {
    galleryRooms[id] = {
      group: null,
      center: def.center.clone(),
      halfSize: def.halfSize,
      murals: [],
      title: def.title,
      isBrandPavilion: true,
      brandId: def.brandId,
    };
    return galleryRooms[id];
  }
  galleryRooms[id] = buildGalleryRoom(id, def);
  return galleryRooms[id];
}

function enterGallery(id) {
  if (!GALLERIES[id]) return;
  ensureGallery(id);
  gameState.galleryId = id;
  setViewMode('gallery');
  showGameToast('入展厅 · ' + GALLERIES[id].title, 2500);
  // 进入展厅隐藏 outdoor UI
  document.getElementById('questHud')?.classList.add('hide-in-gallery');
  document.getElementById('doorPrompt')?.classList.remove('show');
  document.getElementById('gamePrompt')?.classList.remove('show');
  // ── 丹青馆: 跳过苏阮卿讲解流程, 改用三站点交互 ──
  if (id === 'diyhall') {
    DiyHall.beginEnter();
    showGameToast('入丹青馆 · 走到三面墙前 · 按 E 互动', 3500);
    return;
  }
  // ── AI 品牌馆: 跳过画学博士流程, 让 BrandPlaza 拉起"智机使"讲解员 ──
  if (GALLERIES[id]?.isBrandPavilion) {
    BrandPlaza.beginEnter(id);
    showGameToast('入 ' + GALLERIES[id].title + ' · 走到讲席前 · 按 E 问', 3500);
    return;
  }
  // 展厅内召唤画学博士苏阮卿 + 观众 (幂等, 重复进同一展厅不会重复生成)
  spawnGalleryDocent(id);
  // 切换语音面板: 周引之让位给苏阮卿
  openDocentPanel();
  // 投递"入殿"上下文: 把房间标题、真迹清单告诉苏阮卿
  const def = GALLERIES[id];
  const masters = (def.panels || []).filter((p) => p.masterpiece);
  const others  = (def.panels || []).filter((p) => !p.masterpiece);
  let cue = `[场景提示] 客人推门进了"${def.title}"展厅, 阮卿请你以画学博士口吻热情致意.`;
  if (masters.length) {
    const list = masters.map((m) => `《${m.title}》(${[m.artist, m.year].filter(Boolean).join(', ')})`).join(' 与 ');
    cue += ` 墙上挂着真迹: ${list}.`;
  }
  if (others.length) {
    const otherNames = others.slice(0, 3).map((p) => `《${p.title}》`).join('、');
    cue += ` 另有题材壁画 ${otherNames} 等可看.`;
  }
  cue += ' 请用一段 60-90 字的连贯欢迎辞: 自我介绍 + 殿堂名 + 提示客人请近前看真迹, 不换行.';
  // 给 iframe 4s 暖机后投递 (避免抢在 agent join channel 之前)
  setTimeout(() => emitDocentContext('arrival:' + id, cue, { debounceMs: 800 }), 4200);
}
function exitGallery() {
  if (gameState.viewMode !== 'gallery') return;
  const exitingId = gameState.galleryId;
  gameState.galleryId = null;
  setViewMode('tps');
  showGameToast('礼出展厅', 1500);
  document.getElementById('questHud')?.classList.remove('hide-in-gallery');
  document.getElementById('muralCard')?.classList.remove('show');
  // ── 丹青馆: 没有 docent 流程, 也不召唤随身导览 (避免突兀打断) ──
  if (exitingId === 'diyhall') {
    DiyHall.beginExit();
    return;
  }
  // ── 品牌馆出: 让 BrandPlaza 清理, 不切回街头导览 (用户出馆通常会继续逛街) ──
  if (exitingId && GALLERIES[exitingId]?.isBrandPavilion) {
    BrandPlaza.beginExit(exitingId);
    return;
  }
  // 关掉苏阮卿语音面板, 让街头随身导览周引之归位
  closeVoicePanel();
  setTimeout(() => {
    if (typeof openAmbientTourGuide === 'function') openAmbientTourGuide();
    if (typeof emitTourContext === 'function' && exitingId) {
      const def = GALLERIES[exitingId];
      if (def) {
        emitTourContext(
          'gallery-exit:' + exitingId,
          `[场景提示] 玩家从"${def.title}"展厅出来, 转身又入街市. 请你一句话承接客人走出大殿的瞬间, 自然将话题拉回街头风物 (30-50 字, 不换行).`,
          { debounceMs: 2000 },
        );
      }
    }
  }, 600);
}

// 殿门感应点 — 走近时显示 F 入展提示
// (let 而非 const: 自定义品牌增删时整体重建一次)
let GALLERY_DOORS = [
  { id: 'hanyuan',   pos: new THREE.Vector3(0,   0, -60), label: '含元殿' },
  { id: 'xuanzheng', pos: new THREE.Vector3(0,   0, -76), label: '宣政殿' },
  { id: 'zichen',    pos: new THREE.Vector3(0,   0, -89), label: '紫宸殿' },
  { id: 'pagoda',    pos: new THREE.Vector3(28,  0,  22), label: '大雁塔' },
  { id: 'qujiang',   pos: new THREE.Vector3(28,  0,  6 ),  label: '曲江亭' },
  { id: 'wanguo',    pos: new THREE.Vector3(-28, 0,  22), label: '万邦奇画苑' },
  { id: 'anma',      pos: new THREE.Vector3(-15, 0,  40), label: '鞍马图苑' },
  DiyHall.DIY_DOOR,   // 丹青馆 · (32, 0, -60) 大明宫东侧
];

// 安装丹青馆 (室外建筑 + 室内远岛厅堂 + CanvasTexture 三面墙)
DiyHall.install({ scene, gameState });

// 安装 AI 品牌街 (朱雀大街上的 7 个牌坊 + 远岛展馆), 注入 doors + galleries
BrandPlaza.install({ scene, gameState });
(function attachBrandPlaza() {
  // 把品牌牌坊门加入 GALLERY_DOORS
  GALLERY_DOORS.push(...BrandPlaza.getDoors());
  // 把品牌展馆定义并入 GALLERIES
  Object.assign(GALLERIES, BrandPlaza.getGalleryDefs());
  // 自定义品牌增减时: 重建 doors / galleries (去掉旧 isBrandPavilion 的, 再加新的)
  window.addEventListener('han-brand-plaza-changed', () => {
    GALLERY_DOORS = GALLERY_DOORS.filter((d) => !d.isBrandPavilion);
    for (const k of Object.keys(GALLERIES)) {
      if (GALLERIES[k] && GALLERIES[k].isBrandPavilion) delete GALLERIES[k];
    }
    GALLERY_DOORS.push(...BrandPlaza.getDoors());
    Object.assign(GALLERIES, BrandPlaza.getGalleryDefs());
    console.info('[Scene] brand plaza changed — doors/galleries rebuilt');
  });
})();

/* ============================================================
 *  天枢府 · 人文场景 · 古今穿越 NPC 群 + 现代道具
 *  ──────────────────────────────────────────────────────────
 *  在已建好的 9 馆 + 中央广场上铺一层"活着"的内容:
 *    · 戴 Vision Pro / 拿手机 / 举奶茶的古装 NPC  (体验科技)
 *    · 围观孩童 + 拍照胡商 + 看热闹学者         (人气)
 *    · 3 个互动桩 NPC, 启动 AI 主题小游戏        (玩法)
 *
 *  坊中心: (38, 0, 5). 50×40u 坊位. 馆抬高 0.30u 在 plinth 上.
 * ========================================================== */
(function bootTienshuLife() {
  const TX = 38, TZ = 5;          // 天枢府中心
  const TY = 0.30 + 0.02;         // 站在台基 plinth 顶面
  const lifeRoot = new THREE.Group();
  lifeRoot.name = 'TienshuLifeRoot';
  scene.add(lifeRoot);

  /* ---------- 现代道具构造器 ---------- */

  // Vision Pro 眼罩 (古装 NPC 戴上 — 反差萌)
  function attachVisionPro(npc) {
    const g = new THREE.Group();
    g.name = 'VisionPro';
    // 主体: 半透明深玻璃面罩 (椭圆方块)
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.18, 0.08),
      new THREE.MeshPhysicalMaterial({
        color: 0x2a3038, transmission: 0.4, transparent: true, opacity: 0.85,
        roughness: 0.12, metalness: 0.6, clearcoat: 1.0,
      }),
    );
    glass.position.set(0, 0, 0.08);
    g.add(glass);
    // 银色外框
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.22, 0.04),
      new THREE.MeshLambertMaterial({ color: 0xe8e8ec, emissive: 0x40484f, emissiveIntensity: 0.4 }),
    );
    frame.position.set(0, 0, 0.04);
    g.add(frame);
    // 镜片 (两块亮蓝色发光小椭圆 — 表示"屏幕开着")
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.CircleGeometry(0.055, 16),
        new THREE.MeshBasicMaterial({ color: 0x80d8ff, transparent: true, opacity: 0.9 }),
      );
      eye.position.set(sx * 0.10, 0, 0.13);
      g.add(eye);
    }
    // 后带子
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.012, 6, 18, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1e }),
    );
    strap.position.set(0, 0, -0.02);
    strap.rotation.y = Math.PI / 2;
    g.add(strap);
    // 一点光环让它"看起来在工作"
    const light = new THREE.PointLight(0x80d8ff, 0.5, 1.2, 1.6);
    light.position.set(0, 0, 0.15);
    g.add(light);
    // 安到头部高度 (buildPerson scale=1 时头部约 y=1.5)
    g.position.set(0, 1.55, 0.02);
    npc.add(g);
    npc.userData.hasVisionPro = true;
  }

  // 现代手机自拍杆 (古胡商爱拿)
  function attachSelfieStick(npc) {
    const g = new THREE.Group();
    g.name = 'SelfieStick';
    // 杆
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
    );
    rod.position.set(0.3, 1.2, 0.0);
    rod.rotation.z = -Math.PI / 4;
    g.add(rod);
    // 手机屏 (亮蓝)
    const phone = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.3, 0.015),
      new THREE.MeshLambertMaterial({ color: 0x202830, emissive: 0x4a90e8, emissiveIntensity: 0.7 }),
    );
    phone.position.set(0.6, 1.55, 0.0);
    phone.rotation.z = -Math.PI / 4;
    g.add(phone);
    npc.add(g);
  }

  // 奶茶 (仕女爱拿)
  function attachBobaCup(npc) {
    const g = new THREE.Group();
    g.name = 'BobaCup';
    // 杯身
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.035, 0.14, 14),
      new THREE.MeshLambertMaterial({ color: 0xc9a880 }),     // 奶茶色
    );
    cup.position.set(0.22, 0.85, 0.05);
    g.add(cup);
    // 杯盖 (亮粉透明)
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.02, 14),
      new THREE.MeshLambertMaterial({ color: 0xff80a8, emissive: 0xff5080, emissiveIntensity: 0.3 }),
    );
    lid.position.set(0.22, 0.93, 0.05);
    g.add(lid);
    // 吸管
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6),
      new THREE.MeshLambertMaterial({ color: 0xff4070 }),
    );
    straw.position.set(0.22, 1.04, 0.05);
    g.add(straw);
    npc.add(g);
  }

  // 现代游客: 用 buildPerson + 显眼亮色"运动衫"配色
  function makeTourist(opts = {}) {
    const colors = ['silkBlue', 'silkGreen', 'silkPink', 'white'];
    const robe = opts.robe || colors[Math.floor(Math.random() * colors.length)];
    const p = buildPerson({ robe, role: opts.role || 'civilian' });
    // 给现代游客加墨镜
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.07, 0.04),
      new THREE.MeshPhysicalMaterial({
        color: 0x0a0a0e, roughness: 0.15, metalness: 0.4, transmission: 0.2, opacity: 0.95,
      }),
    );
    glasses.position.set(0, 1.5, 0.13);
    p.add(glasses);
    // 现代游客统一标
    p.userData.isModernTourist = true;
    return p;
  }

  /* ---------- NPC 注册帮手 ---------- */

  function placeNpc(npc, x, z, opts = {}) {
    npc.position.set(x, TY, z);
    if (opts.faceTo) {
      npc.rotation.y = Math.atan2(opts.faceTo.x - x, opts.faceTo.z - z);
    } else if (typeof opts.face === 'number') {
      npc.rotation.y = opts.face;
    } else {
      // 默认朝向坊中心
      npc.rotation.y = Math.atan2(TX - x, TZ - z);
    }
    npc.userData.basePos = npc.position.clone();
    npc.userData.idle = Math.random() * Math.PI;
    if (opts.label)       npc.userData.npcLabel       = opts.label;
    if (opts.role)        npc.userData.npcRole        = opts.role;
    if (opts.specialMini) npc.userData.specialMini    = opts.specialMini;
    if (opts.intro)       npc.userData.specialIntro   = opts.intro;
    lifeRoot.add(npc);
    animatables.push({ type: 'person', obj: npc });
  }

  /* ---------- ① 中央广场 Agora 周围 (古今穿越焦点群) ---------- */

  // 戴 Vision Pro 的老者 (站在 Agora 西门正前方, 玩家入坊第一眼看到 ★)
  const elderVP = buildPerson({
    robe: 'silkGold', cap: 'black', role: 'scholar', tool: 'scroll', scale: 1.05,
  });
  attachVisionPro(elderVP);
  placeNpc(elderVP, TX - 7, TZ - 0.5, {
    label: '试戴新眼镜的老学究',
    role: 'sage',
    intro: '老朽戴此「天眼」，眼前山河尽显! 君亦试一试乎? 啊⸺ 此甚妙也!',
  });

  // 围观孩童 ×2 (指着老者笑)
  for (const off of [{x: -4.5, z: 0.5}, {x: -5.2, z: -1.5}]) {
    const k = makeChild();
    placeNpc(k, TX + off.x, TZ + off.z, {
      label: '看热闹的小孩',
      role: 'child',
      faceTo: { x: TX - 7, z: TZ - 0.5 },
      intro: '爷爷脸上挂着的是甚么? 我也想戴, 我也想戴!',
    });
  }

  // 自拍胡商 (拿手机自拍杆, 在 Agora 西门口南侧)
  const persianSelfie = makeForeigner();
  attachSelfieStick(persianSelfie);
  placeNpc(persianSelfie, TX - 5.5, TZ + 3.0, {
    label: '自拍胡商',
    role: 'foreigner',
    face: -Math.PI / 4,  // 面向自己的"手机"
    intro: '波斯老乡, 此物名「自拍」! 凭一根长杆能录百人景, 速来与我合影!',
  });

  // 举奶茶仕女 (中央广场西南角)
  const ladyBoba = makeLady();
  attachBobaCup(ladyBoba);
  placeNpc(ladyBoba, TX - 3.0, TZ + 5.5, {
    label: '尝奶茶的仕女',
    role: 'lady',
    intro: '此饮称「珍珠奶茶」, 一杯抵长安一日工钱! 你也来一口?',
  });

  /* ---------- ② 北排 3 馆门前 (z ≈ -3) ---------- */

  // OpenAI 馆前: 戴 VP 的学者 (体验"开门人")
  const openaiTester = buildPerson({ robe: 'silkBlue', role: 'scholar', tool: 'scroll' });
  attachVisionPro(openaiTester);
  placeNpc(openaiTester, 25, -3, {
    label: '试道 OpenAI 的太学生',
    role: 'scholar',
    intro: '此机能写策论, 能解史经, 能答天问! 我已与它论辩三日, 受教良多。',
  });

  // Anthropic 馆前: 翻竹简的学者 (Claude 长上下文)
  const claudeReader = buildPerson({ robe: 'silkPurple', role: 'scholar', tool: 'scroll', scale: 1.02 });
  placeNpc(claudeReader, 38, -3, {
    label: '读 Claude 长卷的学士',
    role: 'scholar',
    intro: '翰派此卷长达万言, 一口气可读尽不漏一字。妙哉! 妙哉!',
  });

  // DeepSeek 馆前: 拿算盘的工程师老者
  const dsAbacus = buildPerson({ robe: 'silkGreen', role: 'craftsman', tool: 'staff' });
  placeNpc(dsAbacus, 51, -3, {
    label: '玄铁派老匠人',
    role: 'craftsman',
    intro: '此派以工程见长, 开源公示, 童叟无欺。我亦在其中习算一二。',
  });

  /* ---------- ③ 中排东西馆 (Qwen 朝东, Zhipu 朝西) ---------- */

  // Qwen 馆门外 (馆在 dx=-13, 门朝 +x → 门口在 x=25+d/2+1 ≈ 28)
  const qwenScholar = buildPerson({ robe: 'silkGold', role: 'scholar', tool: 'scroll' });
  placeNpc(qwenScholar, 29, 5, {
    label: '通问千问的太学生',
    role: 'scholar',
    intro: '千问之派, 大中小皆有, 童叟无欺。问无不答, 答无不通。',
  });

  // Zhipu 馆门外 (馆 dx=+13, 门朝 -x → 门口在 x=51-d/2-1 ≈ 47)
  const zhipuTester = buildPerson({ robe: 'silkBlue', role: 'scholar', tool: 'scroll' });
  attachVisionPro(zhipuTester);
  placeNpc(zhipuTester, 47, 5, {
    label: '清谱派学子',
    role: 'scholar',
    intro: '清华之学府, 谱写中华大模。试此眼镜, 入清谱之境, 万象毕陈。',
  });

  /* ---------- ④ 南排 3 馆门前 (z ≈ 14) ---------- */

  // MiniMax 馆前: 仕女拿奶茶 (海螺多模态)
  const minimaxLady = makeLady();
  attachBobaCup(minimaxLady);
  placeNpc(minimaxLady, 25, 14, {
    label: '海螺派伶人',
    role: 'lady',
    intro: '海螺之派, 能歌、能画、能写、能演! 一人当百人之力。',
  });

  // Kimi 馆前: 月暗道士
  const kimiDaoist = buildPerson({ robe: 'silkPurple', role: 'daoist', tool: 'staff', scale: 1.03 });
  placeNpc(kimiDaoist, 38, 14, {
    label: '月暗派道长',
    role: 'daoist',
    intro: '月之暗面, 长卷无垠。贫道一卷长百万言, 一日可阅穷尽。',
  });

  // ChatGPT 馆前: 现代游客 + 孩童围观 (扮演"用 GPT 的现代人")
  const gptTourist = makeTourist({ robe: 'silkBlue', role: 'civilian' });
  attachSelfieStick(gptTourist);
  placeNpc(gptTourist, 51, 14, {
    label: '万民派游客',
    role: 'civilian',
    intro: '此物天下皆知! 街头巷尾、村野学堂, 人人会用、人人会问!',
  });
  // 围观孩童 (拉着大人衣角)
  const gptKid = makeChild();
  placeNpc(gptKid, 51 - 1.5, 14 + 0.6, {
    label: '小学童',
    role: 'child',
    faceTo: { x: 51, z: 14 },
    intro: '叔叔! 这就是那个 GPT 吗? 我也要问它一个问题!',
  });

  /* ---------- ⑤ 互动桩 (3 个特色小游戏 NPC) ---------- */

  // ★ AI 押韵桩 — 南墙东角, 复用 riddle (灯谜) 机制, 题目主题改"AI 一条街"
  const rhymeMaster = buildPerson({
    robe: 'silkGold', cap: 'black', role: 'scholar', tool: 'scroll', scale: 1.08,
  });
  placeNpc(rhymeMaster, 30, 18, {
    label: 'AI 押韵宗师',
    role: 'scholar',
    specialMini: 'lanternRiddle',
    intro: '老朽设了几道"AI 谜题", 君若解得, 当奉香茶一盏!',
  });
  // 桩上立个小灯笼 (装饰)
  {
    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 1.6, 8),
      new THREE.MeshLambertMaterial({ color: 0x6a4a30 }),
    );
    lampPole.position.set(30 + 0.6, TY + 0.8, 18);
    lifeRoot.add(lampPole);
    const riddleLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xffb060, emissive: 0xff9040, emissiveIntensity: 0.8 }),
    );
    riddleLamp.position.set(30 + 0.6, TY + 1.65, 18);
    lifeRoot.add(riddleLamp);
    const pl = new THREE.PointLight(0xff9040, 0.5, 4, 1.8);
    pl.position.set(30 + 0.6, TY + 1.65, 18);
    lifeRoot.add(pl);
  }

  // ★ 猜词卡桩 — 南墙西角, 复用 caimei (猜枚) 机制
  const wordcardLady = makeLady();
  placeNpc(wordcardLady, 46, 18, {
    label: '猜词阁主',
    role: 'lady',
    specialMini: 'caimei',
    intro: '小女子有词卡一盒, 君猜中几枚, 便得几枚珍珠。来玩否?',
  });

  // ★ 未来骰桩 — 北墙东角, 复用 dice
  const futureDice = makeForeigner();
  placeNpc(futureDice, 44, -7, {
    label: '未来骰子郎',
    role: 'foreigner',
    specialMini: 'dice',
    intro: '此骰乃西域奇物, 摇之可见未来! 君敢与我一掷否?',
  });

  /* ---------- ⑥ 散布"现代游客" (4 人, 拍照 / 看牌坊 / 走动) ---------- */

  const touristSpots = [
    { x: 31, z: -8,  role: 'civilian', label: '北门游客',     intro: '此坊真新奇! AI 一条街, 古今穿越!' },
    { x: 47, z: -7,  role: 'civilian', label: '东北角游客',   intro: '听说此处有 Agora, 能直接对话, 我去试试!' },
    { x: 32, z: 17,  role: 'civilian', label: '南门游客',     intro: '小姐姐, 听说每个馆都有"智机使"讲解, 是真的吗?' },
    { x: 45, z: 16,  role: 'civilian', label: '东南角游客',   intro: '哎呀这味道太正了, 帮我跟牌坊合个影!' },
  ];
  for (const ts of touristSpots) {
    const t = makeTourist({ role: ts.role });
    if (Math.random() < 0.5) attachSelfieStick(t);
    placeNpc(t, ts.x, ts.z, { label: ts.label, role: ts.role, intro: ts.intro });
  }

  /* ---------- ⑦ 围观孩童群 (再加 2 个, 跑动) ---------- */
  for (const off of [{x: 35, z: 0}, {x: 40, z: -1}]) {
    const k = makeChild();
    placeNpc(k, off.x, off.z, {
      label: '玩耍的小童',
      role: 'child',
      intro: '老爷爷脸上的镜子真好玩, 我转圈圈给你看!',
    });
  }

  console.info('[Tienshu Life] populated', lifeRoot.children.length, 'objects (NPCs + props)');
})();

// 给"万邦奇画苑"造一座牌坊作为地图上的视觉锚点
// (其他 5 处展厅都贴着已有建筑, 不必再加; 万邦苑在西侧空地, 必须立个门面)
function buildWanguoGateway() {
  const g = new THREE.Group();
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x2a3458 });   // 深靛立柱
  const beamMat   = new THREE.MeshLambertMaterial({ color: 0xc99a3a });   // 描金横梁
  const sillMat   = new THREE.MeshLambertMaterial({ color: 0x4a2818 });   // 暗朱底座
  // 双立柱 (高 4m, 间距 4m)
  for (const x of [-2, 2]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), sillMat);
    base.position.set(x, 0.2, 0); base.castShadow = true; g.add(base);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 4.0, 12), pillarMat);
    pillar.position.set(x, 2.2, 0); pillar.castShadow = true; g.add(pillar);
    // 柱顶斗拱 (Tang 风格小斗)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.55), beamMat);
    cap.position.set(x, 4.3, 0); g.add(cap);
  }
  // 主横梁 (描金)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.45, 0.6), beamMat);
  beam.position.set(0, 4.6, 0); beam.castShadow = true; g.add(beam);
  // 上层雀替 (额枋)
  const upper = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 0.45), sillMat);
  upper.position.set(0, 4.95, 0); g.add(upper);
  // 飞檐 — 两端微微翘起的瓦顶
  const roofGeo = new THREE.BoxGeometry(5.8, 0.22, 0.9);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2c3140 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.25, 0); g.add(roof);
  // 飞檐翘角 (左右各一)
  for (const x of [-2.9, 2.9]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 4), roofMat);
    wing.position.set(x, 5.55, 0); wing.rotation.z = x > 0 ? -0.6 : 0.6;
    g.add(wing);
  }
  // 中央竖匾 "万邦奇画苑"
  const c = document.createElement('canvas');
  c.width = 256; c.height = 640;
  const cx = c.getContext('2d');
  cx.fillStyle = '#2b1810'; cx.fillRect(0, 0, 256, 640);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 6; cx.strokeRect(12, 12, 232, 616);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 76px STKaiti, KaiTi, "Songti SC", serif';
  cx.textAlign = 'center';
  ['万', '邦', '奇', '画', '苑'].forEach((ch, i) => cx.fillText(ch, 128, 110 + i * 110));
  const plaqueTex = new THREE.CanvasTexture(c);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), plaqueMat);
  plaque.position.set(0, 3.0, 0.32);
  g.add(plaque);
  const plaqueBack = plaque.clone(); plaqueBack.position.z = -0.32; plaqueBack.rotation.y = Math.PI;
  g.add(plaqueBack);
  // 两侧悬灯 (远舶夜光, 提示访客)
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xffc878, emissive: 0xffc878, emissiveIntensity: 0.45,
  });
  for (const x of [-1.5, 1.5]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: 0x1a1610 }));
    chain.position.set(x, 4.05, 0); g.add(chain);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lampMat);
    lamp.position.set(x, 3.62, 0); g.add(lamp);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe080 }));
    tail.position.set(x, 3.38, 0); tail.rotation.x = Math.PI; g.add(tail);
  }
  // 地面引导光圈 — 跟 NPC halo 同款, 远处也能看见入口
  const haloGeo = new THREE.RingGeometry(1.6, 2.2, 36);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xd4a04a, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02;
  g.add(halo);
  // 入口暖光 (夜里看得见)
  const pointLight = new THREE.PointLight(0xffc878, 1.2, 14, 1.5);
  pointLight.position.set(0, 3.0, 0);
  g.add(pointLight);
  return g;
}

// 立在门口位置, 朝向城内 (z+ 方向作正面)
const wanguoGate = buildWanguoGateway();
wanguoGate.position.set(-28, 0, 22);
wanguoGate.rotation.y = Math.PI * 0.5;  // 横向 (门洞面向南北, 玩家可从东侧或西侧穿过)
scene.add(wanguoGate);

// 给"鞍马图苑"造一座御厩风的木栅门坊
// — 原木立柱 + 茅草顶 + 横悬两根缰绳 + 马鞭装饰, 一眼能看出是马厩入口
function buildAnmaGateway() {
  const g = new THREE.Group();
  const woodMat   = new THREE.MeshLambertMaterial({ color: 0x6a4226 });   // 原木深栗
  const beamMat   = new THREE.MeshLambertMaterial({ color: 0x4a2818 });   // 老栎横梁
  const sillMat   = new THREE.MeshLambertMaterial({ color: 0x3a2418 });   // 暗朱底座
  const thatchMat = new THREE.MeshLambertMaterial({ color: 0xa88c52 });   // 干茅金黄
  // 双立柱 (高 3.5m, 间距 4.5m, 比万邦那座稍朴拙)
  for (const x of [-2.25, 2.25]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.32, 10), sillMat);
    base.position.set(x, 0.16, 0); base.castShadow = true; g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 3.6, 10), woodMat);
    post.position.set(x, 1.96, 0); post.castShadow = true; g.add(post);
    // 柱顶榫头
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.20, 10), beamMat);
    cap.position.set(x, 3.86, 0); g.add(cap);
  }
  // 横梁 (粗大原木)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.2, 12), beamMat);
  beam.position.set(0, 4.08, 0); beam.rotation.z = Math.PI / 2; beam.castShadow = true;
  g.add(beam);
  // 茅草顶 (两面坡)
  const roofGeo = new THREE.BoxGeometry(5.6, 0.18, 1.4);
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.set(0, 4.34, 0); g.add(roof);
  // 茅草纹理（仅以多片小三角模拟蓬松感）
  for (let i = -2.4; i <= 2.4; i += 0.4) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 4),
      new THREE.MeshLambertMaterial({ color: 0x8e7440 }));
    t.position.set(i, 4.56, (Math.random() - 0.5) * 0.5);
    t.rotation.x = (Math.random() - 0.5) * 0.4;
    t.rotation.z = (Math.random() - 0.5) * 0.2;
    g.add(t);
  }
  // 中央竖匾 "鞍马图苑"
  const c = document.createElement('canvas');
  c.width = 256; c.height = 520;
  const cx = c.getContext('2d');
  cx.fillStyle = '#2a1810'; cx.fillRect(0, 0, 256, 520);
  cx.strokeStyle = '#caa050'; cx.lineWidth = 5; cx.strokeRect(10, 10, 236, 500);
  cx.fillStyle = '#f5d890'; cx.font = 'bold 78px STKaiti, KaiTi, "Songti SC", serif';
  cx.textAlign = 'center';
  ['鞍', '马', '图', '苑'].forEach((ch, i) => cx.fillText(ch, 128, 110 + i * 110));
  const plaqueTex = new THREE.CanvasTexture(c);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.85), plaqueMat);
  plaque.position.set(0, 2.6, 0.30);
  g.add(plaque);
  const plaqueBack = plaque.clone(); plaqueBack.position.z = -0.30; plaqueBack.rotation.y = Math.PI;
  g.add(plaqueBack);
  // 两侧悬缰绳 + 小鞍铃
  for (const x of [-1.6, 1.6]) {
    // 缰绳 (深褐色细绳, 从横梁垂下)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6),
      new THREE.MeshBasicMaterial({ color: 0x3a2818 }));
    rope.position.set(x, 3.5, 0.0); g.add(rope);
    // 末端铜铃 (反光金属)
    const bellMat = new THREE.MeshLambertMaterial({
      color: 0xc89844, emissive: 0xc89844, emissiveIntensity: 0.22,
    });
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 8), bellMat);
    bell.position.set(x, 2.95, 0); bell.rotation.x = Math.PI;
    g.add(bell);
  }
  // 地面引导光圈 (与万邦同款, 但用赭黄色)
  const haloGeo = new THREE.RingGeometry(1.6, 2.2, 36);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xb88848, transparent: true, opacity: 0.45,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02;
  g.add(halo);
  // 暖光 (栗色)
  const pointLight = new THREE.PointLight(0xd8a050, 1.0, 12, 1.6);
  pointLight.position.set(0, 2.6, 0);
  g.add(pointLight);
  return g;
}

const anmaGate = buildAnmaGateway();
anmaGate.position.set(-15, 0, 40);
anmaGate.rotation.y = -Math.PI * 0.18;  // 略微朝向城内
scene.add(anmaGate);

function checkGalleryDoors() {
  if (!gameState.active || gameState.viewMode === 'gallery') return;
  const p = gameState.pos;
  let near = null;
  for (const d of GALLERY_DOORS) {
    const dx = d.pos.x - p.x, dz = d.pos.z - p.z;
    if (Math.hypot(dx, dz) < 8) { near = d; break; }
  }
  gameState.nearDoor = near;
  const prompt = document.getElementById('doorPrompt');
  if (prompt) {
    if (near) {
      prompt.innerHTML = `<span class="kbd">F</span> 入 <b>${near.label}</b> 看壁画`;
      prompt.classList.add('show');
    } else {
      prompt.classList.remove('show');
    }
  }
}

function startQuest(id) {
  const q = QUESTS[id];
  if (!q) return;
  gameState.questId = id;
  gameState.questStep = 0;
  updateQuestHud();
}
function advanceQuest() {
  const q = QUESTS[gameState.questId];
  if (!q) return;
  gameState.questStep++;
  if (gameState.questStep >= q.steps.length) {
    showGameToast('任务完成 · ' + q.title);
    updateQuestHud();
    return;
  }
  const s = q.steps[gameState.questStep];
  showGameToast('任务推进：' + s.text);
  updateQuestHud();
}
function updateQuestHud() {
  const el = document.getElementById('questHud');
  if (!el) return;
  const q = QUESTS[gameState.questId];
  if (!q) { el.innerHTML = ''; return; }
  const s = q.steps[gameState.questStep];
  el.innerHTML =
    `<div class="quest-title">${q.title} · ${gameState.questStep + 1}/${q.steps.length}</div>` +
    `<div class="quest-step">${s ? s.text : '—'}</div>` +
    (s && s.hint ? `<div class="quest-hint">${s.hint}</div>` : '');
}

function showGameToast(text, dur = 3000) {
  const t = document.getElementById('gameToast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur);
}

// 供 lib/ 各模块调用 (传送 / toast)
if (typeof window !== 'undefined') {
  window.showGameToast = showGameToast;
  window.startGame = startGame;
  window.endGame = endGame;
  window.enterGallery = enterGallery;
  window.exitGallery = exitGallery;
}

// 主角动态对话脚本 (根据当前 quest step 切换)
function buildDialogScriptForNpc(npc) {
  const role = npc.userData.npcRole || 'civilian';
  const q = QUESTS[gameState.questId];
  const step = q ? q.steps[gameState.questStep] : null;

  // 与任务相关的特殊对话
  if (step) {
    const dist = npc.position.distanceTo(gameState.pos);
    // 当前在朱雀门附近且 step 1 (寻找守门将)
    if (gameState.questStep === 0 && Math.abs(npc.position.z - 28) < 10 && role === 'soldier') {
      return [
        { who: '守门将', text: `「${gameState.name}是吧？外乡口音。」` },
        { who: gameState.name, text: '「正是。听说西市张掌柜手中有腰牌？」' },
        { who: '守门将', text: '「不错，西市西南角，认丝绸幡子的便是。」', advance: true },
      ];
    }
    // 在西市 + 商贾
    if (gameState.questStep === 1 && role === 'merchant' && Math.abs(npc.position.x - (-22)) < 12) {
      return [
        { who: '张掌柜', text: '「客官面生，从何处来？」' },
        { who: gameState.name, text: '「自江南而至，听说掌柜有腰牌？」' },
        { who: '张掌柜', text: '「腰牌无价，但你若能在雁塔题名，便算长安人。送你笔墨一副。」', advance: true },
      ];
    }
    // 雁塔附近 → 触发 yanta mini-game
    if (gameState.questStep === 2 && (role === 'scholar' || role === 'civilian')) {
      const inPagoda = Math.hypot(npc.position.x - 28, npc.position.z - 22) < 15;
      if (inPagoda) {
        return [
          { who: '香客', text: '「壮士可是来题名？此塔自唐贞观间立，凡进士登科必题之。」' },
          { who: gameState.name, text: '「正是。请引我笔。」' },
          { who: '系统', text: '— 打开"雁塔题名" mini-game —', advance: true, action: 'launchYanta' },
        ];
      }
    }
    // 含元殿前官员
    if (gameState.questStep === 3 && role === 'scholar' && npc.position.z < -55) {
      return [
        { who: '礼部官', text: '「雁塔题名记，可有？」' },
        { who: gameState.name, text: '「在此。」' },
        { who: '礼部官', text: '「好。明日辰时，含元殿御朝。」', advance: true },
      ];
    }
  }

  // Round 1: Themed zone NPCs with specialMini get a custom intro
  if (npc.userData.specialIntro) {
    const label = npc.userData.npcLabel || roleLabel(role);
    return [
      { who: label, text: `「${npc.userData.specialIntro}」` },
    ];
  }

  // 默认：跟现有 NPC_LINES 配套
  const lines = NPC_LINES[role] || NPC_FALLBACK;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return [
    { who: roleLabel(role), text: line },
    { who: gameState.name, text: '「多谢相告。」' },
  ];
}

function openDialog(npc) {
  if (gameState.dialogActive) return;
  gameState.dialogActive = true;
  gameState.dialogNpc = npc;  // 用于后续小游戏引用
  gameState.dialogScript = buildDialogScriptForNpc(npc);
  gameState.currentLine = 0;
  // 锁定鼠标时先释放，方便点对话按钮
  if (fpsControls && fpsControls.isLocked) fpsControls.unlock();
  // 路人 NPC 也转身面向玩家 (不切镜头, 仅旋转)
  beginDialogueFraming(npc);
  renderDialog();
}
// 判断 NPC 是否愿意陪你玩猜拳/猜谜
function npcWillingToPlay(npc) {
  if (!npc) return false;
  const r = npc.userData.npcRole;
  // 兵卒/官员/僧侣比较严肃，但 30% 概率也愿意
  if (r === 'soldier' || r === 'official' || r === 'monk') return Math.random() < 0.3;
  return true;
}

/* ============================================================
 *  NPC 街头游戏池 · 按角色定制可玩游戏列表
 *  每次对话最后一句, 从角色游戏池中随机抽 2 个供玩家选.
 *  这样同一个 NPC 多次对话也能玩到不同小游戏.
 * ============================================================ */
const STREET_GAME_POOL = {
  // 通用工匠/商人/百姓 — 市井百业, 啥都来
  civilian: ['rps', 'riddle', 'dice', 'caimei'],
  vendor:   ['rps', 'dice', 'caimei', 'finger'],
  merchant: ['rps', 'dice', 'finger', 'caimei'],
  craftsman:['rps', 'riddle', 'dice', 'caimei'],
  farmer:   ['rps', 'riddle', 'caimei'],
  // 仕女 / 孩童 — 文雅
  lady:     ['riddle', 'doucao', 'caimei', 'dice'],
  child:    ['rps', 'riddle', 'caimei', 'doucao'],
  // 文士 / 学者 / 长者 — 偏雅
  scholar:  ['riddle', 'dice', 'caimei'],
  elder:    ['riddle', 'doucao', 'caimei', 'dice'],
  sage:     ['riddle', 'doucao'],
  // 兵卒 / 校尉 — 武人豪爽, 偏赌
  soldier:  ['rps', 'dice', 'finger'],
  general:  ['dice', 'finger', 'rps'],
  // 官员 / 道士 / 僧侣 — 一般不玩, 但概率低也可
  official: ['dice', 'riddle'],
  monk:     ['riddle', 'caimei'],
  daoist:   ['caimei', 'riddle', 'dice'],
  // 胡商 / 突厥 / 使节 — 酒徒, 喜欢喝酒博戏
  foreigner: ['dice', 'finger', 'caimei'],
  xiongnu:   ['dice', 'finger', 'rps'],
  envoy:     ['dice', 'finger'],
  // 乐工 — 喜欢猜
  musician:  ['riddle', 'caimei'],
};
function getNpcGamePool(npc) {
  if (!npc) return ['rps', 'riddle'];
  const r = npc.userData.npcRole;
  return STREET_GAME_POOL[r] || ['rps', 'riddle', 'dice', 'caimei'];
}
function pickRandomGames(pool, count = 2) {
  const copy = [...pool];
  const out = [];
  for (let i = 0; i < count && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
const STREET_GAME_META = {
  rps:    { label: '🪨 猜拳' },
  riddle: { label: '🎴 猜谜' },
  dice:   { label: '🎲 摇骰' },
  finger: { label: '👊 划拳' },
  doucao: { label: '🌿 斗草' },
  caimei: { label: '📿 猜枚' },
};
function launchStreetGame(gameId, npc) {
  switch (gameId) {
    case 'rps':    return startRps(npc);
    case 'riddle': return startRiddle(npc);
    case 'dice':   return startDice(npc);
    case 'finger': return startFingerGuess(npc);
    case 'doucao': return startDouCao(npc);
    case 'caimei': return startCaiMei(npc);
    default: console.warn('[street-game] unknown:', gameId);
  }
}
// 调试钩子: ?demogame=dice|finger|doucao|caimei|rps|riddle  → 用模拟 NPC 直接打开游戏
if (typeof window !== 'undefined') {
  window.launchStreetGame = launchStreetGame;
  window._debugStreetGame = (id, role = 'civilian') => {
    const mockNpc = { userData: { npcRole: role, npcLabel: '[Debug] ' + role } };
    launchStreetGame(id, mockNpc);
  };
  const _qsg = new URLSearchParams(window.location.search);
  const _dg = _qsg.get('demogame');
  if (_dg) {
    const _role = _qsg.get('demorole') || 'civilian';
    setTimeout(() => window._debugStreetGame(_dg, _role), 1200);
  }
}
// 判断 NPC 是否愿意与你诗酒对答（文人雅集）
function npcWillingToPoetry(npc) {
  if (!npc) return false;
  const r = npc.userData.npcRole;
  const chance = {
    scholar: 1.0, lady: 1.0, elder: 1.0, monk: 0.95, official: 0.85,
    sage: 1.0,  merchant: 0.7, child: 0.6,
    civilian: 0.6, vendor: 0.5, foreigner: 0.55,
    farmer: 0.35, soldier: 0.3,
    // Round 3: 道士爱论道, 校尉武官不擅诗
    daoist: 0.92, general: 0.35,
  }[r];
  return Math.random() < (chance != null ? chance : 0.5);
}
function renderDialog() {
  const dl = document.getElementById('gameDialog');
  if (!dl) return;
  const script = gameState.dialogScript;
  if (!script || gameState.currentLine >= script.length) {
    dl.classList.remove('show');
    gameState.dialogActive = false;
    return;
  }
  const line = script[gameState.currentLine];
  const isLast = gameState.currentLine === script.length - 1;
  const showGame = isLast && npcWillingToPlay(gameState.dialogNpc);
  const showPoetry = isLast && npcWillingToPoetry(gameState.dialogNpc);
  // 从 NPC 角色游戏池中随机抽 2 个 (每轮对话不同)
  // 关键: 同一次 renderDialog 调用产生稳定结果, 防止"继续"按钮重新洗牌
  if (showGame) {
    if (gameState._lastDialogTurn !== gameState.currentLine ||
        gameState._lastDialogNpc !== gameState.dialogNpc) {
      gameState._dialogGamePicks = pickRandomGames(getNpcGamePool(gameState.dialogNpc), 2);
      gameState._lastDialogTurn = gameState.currentLine;
      gameState._lastDialogNpc = gameState.dialogNpc;
    }
  }
  const gamePicks = showGame ? (gameState._dialogGamePicks || ['rps', 'riddle']) : [];
  // Round 1: themed-zone NPCs carry a specialMini (lanternRiddle / rhythmTap)
  // 永远在最后一句显示, 不与 willingToPlay 概率挂钩 (这是 zone 主题专属互动)
  const specialMini = isLast
    && gameState.dialogNpc
    && gameState.dialogNpc.userData
    && gameState.dialogNpc.userData.specialMini;
  const specialMiniLabel = ({
    lanternRiddle: '🏮 解灯谜',
    rhythmTap:     '🥁 和拍',
    jadeAppraisal: '💎 鉴宝',
    dyeMix:        '🎨 调色',
    // Round 3
    archery:       '🏹 射艺',
    classics:      '📚 论经',
    polo:          '🐎 击鞠',
    fortune:       '🎴 抽签',
    // Round 4
    tongyi:        '🌐 通译',
    yijing:        '✝ 译经',
    wenzhen:       '💊 问诊',
    guanxiang:     '🔭 观象',
  })[specialMini] || '';
  dl.innerHTML = `
    <div class="dialog-who">${line.who}</div>
    <div class="dialog-text">${line.text}</div>
    <div class="dialog-actions">
      ${specialMini ? `<button id="dialogPlaySpecial" class="dialog-btn poetry" style="background: linear-gradient(135deg, #c23a2a, #6a1818); color: #ffd890;">${specialMiniLabel}</button>` : ''}
      ${gamePicks.map((g, i) => {
        const meta = STREET_GAME_META[g];
        return meta ? `<button id="dialogPlayGame${i}" data-game="${g}" class="dialog-btn alt">${meta.label}</button>` : '';
      }).join('')}
      ${showPoetry ? `<button id="dialogPlayPoetry" class="dialog-btn poetry">🍷 对诗</button>` : ''}
      <button id="dialogNext" class="dialog-btn">${isLast ? '结束 ✓' : '继续 ▶'}</button>
      <button id="dialogClose" class="dialog-btn ghost">退出</button>
    </div>
  `;
  dl.classList.add('show');
  document.getElementById('dialogNext').addEventListener('click', () => {
    const ln = gameState.dialogScript[gameState.currentLine];
    if (ln && ln.advance) advanceQuest();
    if (ln && ln.action === 'launchYanta' && typeof startYantaG === 'function') {
      gameState.currentLine++;
      dl.classList.remove('show');
      gameState.dialogActive = false;
      setTimeout(() => startYantaG(), 400);
      return;
    }
    gameState.currentLine++;
    renderDialog();
  });
  document.getElementById('dialogClose').addEventListener('click', () => {
    dl.classList.remove('show');
    gameState.dialogActive = false;
  });
  if (showGame) {
    gamePicks.forEach((g, i) => {
      const btn = document.getElementById(`dialogPlayGame${i}`);
      if (!btn) return;
      btn.addEventListener('click', () => {
        dl.classList.remove('show');
        gameState.dialogActive = false;
        // 玩完后重置 picks, 让下次对话洗新牌
        gameState._lastDialogTurn = -1;
        launchStreetGame(g, gameState.dialogNpc);
      });
    });
  }
  if (showPoetry) {
    document.getElementById('dialogPlayPoetry').addEventListener('click', () => {
      dl.classList.remove('show');
      gameState.dialogActive = false;
      startPoetry(gameState.dialogNpc);
    });
  }
  if (specialMini) {
    const sb = document.getElementById('dialogPlaySpecial');
    if (sb) sb.addEventListener('click', () => {
      dl.classList.remove('show');
      gameState.dialogActive = false;
      if (specialMini === 'lanternRiddle' && typeof startLanternRiddle === 'function') {
        startLanternRiddle(gameState.dialogNpc);
      } else if (specialMini === 'rhythmTap' && typeof startRhythmTap === 'function') {
        startRhythmTap(gameState.dialogNpc);
      } else if (specialMini === 'jadeAppraisal' && typeof startJadeAppraisal === 'function') {
        startJadeAppraisal(gameState.dialogNpc);
      } else if (specialMini === 'dyeMix' && typeof startDyeMix === 'function') {
        startDyeMix(gameState.dialogNpc);
      } else if (specialMini === 'archery' && typeof startArcheryDrill === 'function') {
        startArcheryDrill(gameState.dialogNpc);
      } else if (specialMini === 'classics' && typeof startClassics === 'function') {
        startClassics(gameState.dialogNpc);
      } else if (specialMini === 'polo' && typeof startPolo === 'function') {
        startPolo(gameState.dialogNpc);
      } else if (specialMini === 'fortune' && typeof startFortune === 'function') {
        startFortune(gameState.dialogNpc);
      } else if (specialMini === 'tongyi' && typeof startTongyi === 'function') {
        startTongyi(gameState.dialogNpc);
      } else if (specialMini === 'yijing' && typeof startYijing === 'function') {
        startYijing(gameState.dialogNpc);
      } else if (specialMini === 'wenzhen' && typeof startWenzhen === 'function') {
        startWenzhen(gameState.dialogNpc);
      } else if (specialMini === 'guanxiang' && typeof startGuanxiang === 'function') {
        startGuanxiang(gameState.dialogNpc);
      }
    });
  }
}

/* ============================================================
 *  Street Games — 与 NPC 玩猜拳 / 猜谜，随机赏赐
 * ============================================================ */
/* ============================================================
 *  V11 经济系统 · ITEMS 物品目录 (5 类: food / literati / attire / collectible / pass / mood)
 *  币种: copper 铜钱 · silk 绢帛 · gold 金锭 · fame 风雅 (≈名望)
 * ============================================================ */
const ITEMS = {
  // ===== 食货 food (回体力 / 临时风度 charm 加成) =====
  hu_cake:         { name: '胡饼',          icon: '🥯', cat: 'food', stamina: 8,                 buy: { copper: 2  }, sell: { copper: 1  } },
  rice_bowl:       { name: '一碗粳米饭',     icon: '🍚', cat: 'food', stamina: 12,                buy: { copper: 4  }, sell: { copper: 2  } },
  roast_chestnut:  { name: '一把炒栗子',     icon: '🌰', cat: 'food', stamina: 6,                 buy: { copper: 3  }, sell: { copper: 1  } },
  sushan:          { name: '一颗酥山',       icon: '🍧', cat: 'food', stamina: 15, charm: 5,  dur: 60,  buy: { copper: 12 }, sell: { copper: 6  } },
  grape_wine:      { name: '一杯葡萄酒',     icon: '🍷', cat: 'food', stamina: 6,  charm: 10, dur: 90,  buy: { copper: 8  }, sell: { copper: 4  } },
  green_tea:       { name: '一盏清茗',       icon: '🍵', cat: 'food', stamina: 4,  charm: 3,  dur: 60,  buy: { copper: 5  }, sell: { copper: 2  } },
  jian_nan_chun:   { name: '一壶剑南春',     icon: '🍶', cat: 'food', stamina: 18, charm: 15, dur: 180, buy: { silk: 1, copper: 5 }, sell: { copper: 15 } },

  // ===== 文房 literati (诗会胜率加成) =====
  brush_huzhou:    { name: '湖州狼毫笔',     icon: '🖌', cat: 'literati', poetryBonus: 10, buy: { silk: 1  }, sell: { copper: 8  } },
  ink_song:        { name: '一锭松烟墨',     icon: '⚫', cat: 'literati', poetryBonus: 5,  buy: { copper: 15 }, sell: { copper: 7  } },
  paper_xuan:      { name: '一刀宣纸',       icon: '📄', cat: 'literati', poetryBonus: 5,  buy: { copper: 12 }, sell: { copper: 6  } },
  inkstone_duan:   { name: '一方端州歙砚',   icon: '🟫', cat: 'literati', poetryBonus: 20, buy: { silk: 2  }, sell: { copper: 12 } },
  tang_poems:      { name: '一卷《唐诗集》', icon: '📚', cat: 'literati', poetryBonus: 25, buy: { silk: 3  }, sell: { copper: 18 } },
  whole_tang:      { name: '一卷《全唐诗》', icon: '📚', cat: 'literati', poetryBonus: 35, buy: { gold: 1  }, sell: { silk: 4  } },
  doggerel:        { name: '一卷打油诗',     icon: '📝', cat: 'literati', poetryBonus: 2,  buy: { copper: 5  }, sell: { copper: 2  } },

  // ===== 衣冠 attire (装备 → 改 NPC 称呼 / 临时 charm) =====
  scholar_robe:    { name: '一袭青衫',       icon: '👘', cat: 'attire', slot: 'body', charm: 6, label: 'scholar',  buy: { silk: 5 }, sell: { silk: 2 } },
  official_cap:    { name: '一顶乌纱帽',     icon: '🎩', cat: 'attire', slot: 'head', charm: 8, label: 'official', buy: { silk: 8 }, sell: { silk: 3 } },
  silk_kerchief:   { name: '一方织锦帕',     icon: '🧣', cat: 'attire', slot: 'acc',  charm: 5,                    buy: { copper: 25 }, sell: { copper: 12 } },
  jade_pendant:    { name: '一枚玉佩',       icon: '🟢', cat: 'attire', slot: 'acc',  charm: 8,                    buy: { silk: 2 },    sell: { copper: 18 } },
  bamboo_pin:      { name: '一支竹簪',       icon: '🎋', cat: 'attire', slot: 'head', charm: 3,                    buy: { copper: 8 },  sell: { copper: 4  } },
  fragrance_pouch: { name: '龙井香囊',       icon: '🌸', cat: 'attire', slot: 'acc',  charm: 6, fame: 2,           buy: { copper: 30 }, sell: { copper: 15 } },

  // ===== 雅物 collectible (风雅 fame +) =====
  western_mirror:  { name: '一面西凉铜镜',   icon: '🪞', cat: 'collectible', fame: 5,  buy: { silk: 3 }, sell: { silk: 1 } },
  pearl:           { name: '一颗东海明珠',   icon: '🔮', cat: 'collectible', fame: 15, buy: { gold: 1 }, sell: { silk: 3 } },
  wu_zi_painting:  { name: '一帧吴道子真迹', icon: '🎨', cat: 'collectible', fame: 30, buy: { gold: 3 }, sell: { gold: 1 } },
  shu_brocade:     { name: '一卷蜀锦',       icon: '🎀', cat: 'collectible', fame: 8,  buy: { silk: 4 }, sell: { silk: 2 } },
  tengwang_rub:    { name: '《滕王阁序》拓本', icon: '📜', cat: 'collectible', fame: 10, buy: { silk: 2 }, sell: { copper: 30 } },
  tangchang_map:   { name: '《长安城坊图》', icon: '🗺', cat: 'collectible', fame: 6,  buy: { copper: 40 }, sell: { copper: 18 } },

  // ===== 凭证 pass (门禁 / 解锁) =====
  poet_token:      { name: '诗仙赞·墨色腰牌', icon: '🪪', cat: 'pass', unlock: ['libai_circle'], fame: 10 },
  gate_warrant:    { name: '城门通关文牒',     icon: '📋', cat: 'pass', unlock: ['frontier'], buy: { gold: 1 } },
  exam_seal:       { name: '新科进士印',       icon: '🏛', cat: 'pass', unlock: ['daming_palace'], fame: 25 },
  // Round 4 — 异域 / 医道 / 天文 凭证与珍品
  tongyi_token:    { name: '一枚通译铜牌',     icon: '🎫', cat: 'pass', unlock: ['honglu_si'], fame: 12 },
  yeguang_cup:     { name: '一只夜光琉璃杯',   icon: '🍶', cat: 'collectible', fame: 18, buy: { silk: 4 }, sell: { silk: 2 } },
  jingjiao_scroll: { name: '一卷大秦景教经',   icon: '📜', cat: 'literati', poetryBonus: 18, fame: 10, buy: { silk: 3 }, sell: { silk: 1 } },
  ling_dan:        { name: '一颗太医灵丹',     icon: '💊', cat: 'food', stamina: 30, charm: 8, dur: 180, buy: { silk: 2 }, sell: { copper: 12 } },
  tianwen_map:     { name: '一幅司天星图',     icon: '🗺', cat: 'collectible', fame: 22, buy: { gold: 1 }, sell: { silk: 4 } },
  persian_glass:   { name: '一瓶波斯香露',     icon: '🧴', cat: 'attire', slot: 'acc', charm: 12, fame: 6, buy: { silk: 3 }, sell: { copper: 18 } },

  // ===== 安慰 mood (无值，纯味道) =====
  smile:           { name: '路人一笑',       icon: '😊', cat: 'mood' },
  encore:          { name: '一句"再来"',      icon: '💬', cat: 'mood' },
  grimace:         { name: '一个鬼脸',       icon: '😜', cat: 'mood' },
};

// 战利品池：每档 outcome 不同 itemId 概率
const LOOT_TABLES = {
  win: [
    'western_mirror', 'tengwang_rub', 'fragrance_pouch', 'sushan',
    'grape_wine', 'silk_kerchief', 'pearl', 'shu_brocade',
    'tangchang_map', 'jade_pendant', 'doggerel', 'brush_huzhou',
    'COIN_10', 'SILK_1',  // 特殊 token: 直接发币
  ],
  draw: [
    'hu_cake', 'roast_chestnut', 'rice_bowl', 'bamboo_pin', 'green_tea',
    'doggerel', 'COIN_3',
  ],
  lose: ['smile', 'encore', 'grimace'],
  perfect: [  // 诗仙赞专享
    'jian_nan_chun', 'whole_tang', 'brush_huzhou', 'inkstone_duan',
    'wu_zi_painting', 'poet_token',
  ],
};

function drawLootId(outcome) {
  const table = LOOT_TABLES[outcome] || LOOT_TABLES.lose;
  return table[Math.floor(Math.random() * table.length)];
}

// 给一个 itemId（或币 token） → 入袋 / 入钱包
function grantItemById(itemId, npc, opts = {}) {
  if (!gameState.wallet) gameState.wallet = { copper: 0, silk: 0, gold: 0, fame: 0 };
  if (!gameState.inventory) gameState.inventory = [];
  let displayIcon, displayName;
  // 处理币 token
  if (itemId === 'COIN_10') { gameState.wallet.copper += 10; displayIcon = '🪙'; displayName = '十文开元通宝'; }
  else if (itemId === 'COIN_3') { gameState.wallet.copper += 3; displayIcon = '🪙'; displayName = '三文铜钱'; }
  else if (itemId === 'SILK_1') { gameState.wallet.silk += 1; displayIcon = '🧵'; displayName = '一匹绢帛'; }
  else if (itemId === 'GOLD_1') { gameState.wallet.gold += 1; displayIcon = '🏵'; displayName = '一锭金'; }
  else {
    const def = ITEMS[itemId];
    if (!def) return;
    displayIcon = def.icon;
    displayName = def.name;
    // 不可堆叠的装备槽 = 衣冠/凭证 → 但允许多件备用，仍然 stack
    const exist = gameState.inventory.find(x => x.itemId === itemId);
    if (exist) exist.qty = (exist.qty || 1) + 1;
    else gameState.inventory.push({ itemId, qty: 1 });
    // 雅物 → 增加 fame
    if (def.fame && !exist) gameState.wallet.fame += def.fame;
  }
  const who = opts.silent ? null : (npc ? roleLabel(npc.userData.npcRole) : '路人');
  const verb = opts.verb || (opts.silent ? null : '赏你');
  if (!opts.silent && who) showRewardToast(`${who} ${verb} ${displayIcon} ${displayName}`);
  updateInventoryUI();
}

function grantReward(outcome, npc) {
  const id = drawLootId(outcome);
  const verb = outcome === 'win' || outcome === 'perfect' ? '赏你'
            : outcome === 'draw' ? '塞给你' : '安慰你';
  grantItemById(id, npc, { verb });
}

function showRewardToast(text, dur = 2800) {
  const t = document.getElementById('rewardToast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), dur);
}

// 累计某类物品的属性值 (stamina/poetryBonus/charm/fame…)
function ownedSum(attr, cat = null) {
  if (!gameState.inventory) return 0;
  return gameState.inventory.reduce((acc, x) => {
    const def = ITEMS[x.itemId];
    if (!def) return acc;
    if (cat && def.cat !== cat) return acc;
    return acc + (def[attr] || 0) * (x.qty || 1);
  }, 0);
}
function ownsItem(itemId) {
  return !!gameState.inventory?.find(x => x.itemId === itemId && (x.qty || 1) > 0);
}

// ===== 使用 / 食用 物品 =====
function useItem(itemId) {
  const def = ITEMS[itemId];
  if (!def) return;
  if (def.cat === 'food') {
    // 食用 → 回体力 + 临时 charm
    const before = gameState.stamina || 0;
    gameState.stamina = Math.min(100, before + (def.stamina || 0));
    if (def.charm) {
      gameState.charm = (gameState.charm || 0) + def.charm;
      gameState.charmExpires = (performance.now() / 1000) + (def.dur || 60);
    }
    // 消耗一件
    const slot = gameState.inventory.find(x => x.itemId === itemId);
    if (slot) {
      slot.qty -= 1;
      if (slot.qty <= 0) gameState.inventory = gameState.inventory.filter(x => x !== slot);
    }
    showRewardToast(`食 ${def.icon} ${def.name}　体力 +${def.stamina}${def.charm ? `　风度 +${def.charm}（${def.dur}s）` : ''}`);
    updateInventoryUI();
    return true;
  } else if (def.cat === 'attire') {
    // 着装：装备到对应槽位（替换）
    if (!gameState.equip) gameState.equip = { head: null, body: null, acc: null };
    const slot = def.slot || 'acc';
    const old = gameState.equip[slot];
    if (old === itemId) {
      // 已穿 → 卸下
      gameState.equip[slot] = null;
      showRewardToast(`卸下 ${def.icon} ${def.name}`);
    } else {
      gameState.equip[slot] = itemId;
      showRewardToast(`着 ${def.icon} ${def.name}　风度 +${def.charm || 0}`);
    }
    updateInventoryUI();
    return true;
  } else {
    showRewardToast(`${def.icon} ${def.name}　[暂不可用]`, 1800);
    return false;
  }
}
window.useItem = useItem;

// 装备加成: 取所有 equip 的 charm 之和
function equippedCharm() {
  if (!gameState.equip) return 0;
  return Object.values(gameState.equip).reduce((a, id) => {
    if (!id) return a;
    const d = ITEMS[id];
    return a + (d?.charm || 0);
  }, 0);
}
// 临时风度（食物/酒残留时长）
function activeCharm() {
  const t = performance.now() / 1000;
  if (gameState.charmExpires && t < gameState.charmExpires) return gameState.charm || 0;
  if (gameState.charmExpires) { gameState.charm = 0; gameState.charmExpires = 0; }
  return 0;
}

// 体力慢恢复 (called per-frame in updateGame)
let _staminaAcc = 0;
function tickStamina(dt) {
  if (!gameState.active) return;
  if (gameState.stamina == null) gameState.stamina = 100;
  _staminaAcc += dt;
  if (_staminaAcc >= 1) {  // 每秒 +1
    _staminaAcc = 0;
    gameState.stamina = Math.min(100, gameState.stamina + 1);
    updateInventoryUI();
  }
}

const CAT_LABEL = {
  food: '食货', literati: '文房', attire: '衣冠',
  collectible: '雅物', pass: '凭证', mood: '路边趣事',
};
const CAT_ORDER = ['food', 'literati', 'attire', 'collectible', 'pass', 'mood'];

function updateInventoryUI() {
  const inv = document.getElementById('inventoryPill');
  if (!inv) return;
  const w = gameState.wallet || { copper: 0, silk: 0, gold: 0, fame: 0 };
  const items = gameState.inventory || [];
  inv.innerHTML = `<span class="w-cu" title="铜钱">🪙 ${w.copper}</span>` +
                  (w.silk ? `<span class="w-si" title="绢帛">🧵 ${w.silk}</span>` : '') +
                  (w.gold ? `<span class="w-go" title="金锭">🏵 ${w.gold}</span>` : '') +
                  `<span class="w-fa" title="风雅">✦ ${w.fame}</span>` +
                  `<span class="w-bag" title="行囊">🎁 ${items.length}</span>`;

  // 体力条
  const stEl = document.getElementById('staminaBar');
  if (stEl) {
    const s = Math.max(0, Math.min(100, gameState.stamina || 0));
    stEl.querySelector('.st-fill').style.width = s + '%';
    stEl.querySelector('.st-num').textContent = `${s}/100`;
    const c = activeCharm() + equippedCharm();
    const chEl = stEl.querySelector('.st-charm');
    if (chEl) chEl.textContent = c > 0 ? `· 风度 +${c}` : '';
  }

  // 总览面板：按类聚合
  const list = document.getElementById('inventoryList');
  if (!list) return;
  if (items.length === 0) {
    list.innerHTML = '<div class="inv-empty">— 囊中空空 · 摆摊处购货 / 路人处对诗 —</div>';
    return;
  }
  const groups = {};
  for (const it of items) {
    const def = ITEMS[it.itemId];
    if (!def) continue;
    if (!groups[def.cat]) groups[def.cat] = [];
    groups[def.cat].push({ ...it, def });
  }
  let html = '';
  for (const cat of CAT_ORDER) {
    if (!groups[cat]) continue;
    html += `<div class="inv-group"><div class="inv-cat">${CAT_LABEL[cat]}</div>`;
    for (const it of groups[cat]) {
      const def = it.def;
      const slot = def.slot;
      const equipped = slot && gameState.equip && gameState.equip[slot] === it.itemId;
      const usable = def.cat === 'food' || def.cat === 'attire';
      html += `<div class="inv-row${equipped ? ' equipped' : ''}" data-iid="${it.itemId}">
        <span class="inv-icon">${def.icon}</span>
        <span class="inv-name">${def.name}${equipped ? ' · 已着' : ''}</span>
        <span class="inv-qty">×${it.qty || 1}</span>
        ${usable ? `<button class="inv-use" data-iid="${it.itemId}">${def.cat === 'food' ? '食' : (equipped ? '卸' : '着')}</button>` : ''}
      </div>`;
    }
    html += `</div>`;
  }
  list.innerHTML = html;
  list.querySelectorAll('.inv-use').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      useItem(b.dataset.iid);
    });
  });
}

/* === 诗仙赞 · 完美对诗专享奖品 (V11 已迁移到 LOOT_TABLES.perfect) === */

/* === 飞花令 题库：八个关键字，含字 vs 不含字 === */
const POETRY_FEIHUA = {
  花: {
    hits: [
      '人面不知何处去，桃花依旧笑春风',
      '春城无处不飞花，寒食东风御柳斜',
      '桃花潭水深千尺，不及汪伦送我情',
      '梨花一枝春带雨',
      '感时花溅泪，恨别鸟惊心',
      '夜来风雨声，花落知多少',
    ],
    misses: ['白日依山尽', '锄禾日当午', '欲穷千里目', '海内存知己', '床前明月光', '千山鸟飞绝'],
  },
  月: {
    hits: [
      '举头望明月，低头思故乡',
      '月落乌啼霜满天，江枫渔火对愁眠',
      '海上生明月，天涯共此时',
      '明月几时有，把酒问青天',
      '露从今夜白，月是故乡明',
      '深林人不知，明月来相照',
    ],
    misses: ['锄禾日当午', '白日依山尽', '千山鸟飞绝', '欲穷千里目', '海内存知己', '春眠不觉晓'],
  },
  风: {
    hits: [
      '春风又绿江南岸，明月何时照我还',
      '古道西风瘦马，夕阳西下',
      '风急天高猿啸哀，渚清沙白鸟飞回',
      '大风起兮云飞扬',
      '林暗草惊风，将军夜引弓',
      '夜来风雨声，花落知多少',
    ],
    misses: ['床前明月光', '锄禾日当午', '海上生明月', '白日依山尽', '欲穷千里目', '千山鸟飞绝'],
  },
  春: {
    hits: [
      '春风又绿江南岸',
      '春眠不觉晓，处处闻啼鸟',
      '国破山河在，城春草木深',
      '春城无处不飞花',
      '等闲识得东风面，万紫千红总是春',
      '红豆生南国，春来发几枝',
    ],
    misses: ['床前明月光', '锄禾日当午', '千山鸟飞绝', '月落乌啼霜满天', '海内存知己', '白日依山尽'],
  },
  江: {
    hits: [
      '江流天地外，山色有无中',
      '千里江陵一日还',
      '春江潮水连海平，海上明月共潮生',
      '不尽长江滚滚来',
      '星垂平野阔，月涌大江流',
      '日暮乡关何处是，烟波江上使人愁',
    ],
    misses: ['床前明月光', '白日依山尽', '锄禾日当午', '千山鸟飞绝', '海内存知己', '欲穷千里目'],
  },
  酒: {
    hits: [
      '葡萄美酒夜光杯，欲饮琵琶马上催',
      '兰陵美酒郁金香',
      '劝君更尽一杯酒，西出阳关无故人',
      '借问酒家何处有，牧童遥指杏花村',
      '人生得意须尽欢，莫使金樽空对月（樽中即酒）',
      '一壶浊酒喜相逢，古今多少事，都付笑谈中',
    ],
    misses: ['床前明月光', '白日依山尽', '锄禾日当午', '千山鸟飞绝', '海内存知己', '欲穷千里目'],
  },
  山: {
    hits: [
      '白日依山尽，黄河入海流',
      '远上寒山石径斜，白云生处有人家',
      '山重水复疑无路，柳暗花明又一村',
      '千山鸟飞绝，万径人踪灭',
      '相看两不厌，只有敬亭山',
      '空山不见人，但闻人语响',
    ],
    misses: ['床前明月光', '锄禾日当午', '海上生明月', '春眠不觉晓', '海内存知己', '欲穷千里目'],
  },
  雪: {
    hits: [
      '孤舟蓑笠翁，独钓寒江雪',
      '北风卷地白草折，胡天八月即飞雪',
      '柴门闻犬吠，风雪夜归人',
      '燕山雪花大如席',
      '忽如一夜春风来，千树万树梨花开（喻雪）',
      '已是悬崖百丈冰，犹有花枝俏（雪意）',
    ],
    misses: ['床前明月光', '白日依山尽', '锄禾日当午', '海上生明月', '欲穷千里目', '海内存知己'],
  },
};

/* === 对联 题库：盛唐名句 === */
const POETRY_COUPLETS = [
  { up: '海内存知己',         down: '天涯若比邻' },
  { up: '落霞与孤鹜齐飞',     down: '秋水共长天一色' },
  { up: '两个黄鹂鸣翠柳',     down: '一行白鹭上青天' },
  { up: '野火烧不尽',         down: '春风吹又生' },
  { up: '千山鸟飞绝',         down: '万径人踪灭' },
  { up: '白日依山尽',         down: '黄河入海流' },
  { up: '举杯邀明月',         down: '对影成三人' },
  { up: '红豆生南国',         down: '春来发几枝' },
  { up: '孤舟蓑笠翁',         down: '独钓寒江雪' },
  { up: '桃花潭水深千尺',     down: '不及汪伦送我情' },
  { up: '感时花溅泪',         down: '恨别鸟惊心' },
  { up: '君不见黄河之水天上来', down: '奔流到海不复回' },
  { up: '醉卧沙场君莫笑',     down: '古来征战几人回' },
  { up: '葡萄美酒夜光杯',     down: '欲饮琵琶马上催' },
  { up: '劝君更尽一杯酒',     down: '西出阳关无故人' },
  { up: '海上生明月',         down: '天涯共此时' },
  { up: '春风又绿江南岸',     down: '明月何时照我还' },
  { up: '空山新雨后',         down: '天气晚来秋' },
];

function _shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function makePoetryRound() {
  if (Math.random() < 0.5) {
    // 飞花令
    const keys = Object.keys(POETRY_FEIHUA);
    const k = keys[Math.floor(Math.random() * keys.length)];
    const pool = POETRY_FEIHUA[k];
    const hit = pool.hits[Math.floor(Math.random() * pool.hits.length)];
    const misses = _shuffle(pool.misses).slice(0, 3);
    const options = _shuffle([hit, ...misses]);
    return {
      type: 'feihua',
      prompt: `飞花令 · 取「${k}」字`,
      hint: `请挑出诗句中含「${k}」字者`,
      options,
      answer: options.indexOf(hit),
    };
  } else {
    // 对联
    const c = POETRY_COUPLETS[Math.floor(Math.random() * POETRY_COUPLETS.length)];
    const others = _shuffle(POETRY_COUPLETS.filter(x => x !== c)).slice(0, 3).map(x => x.down);
    const options = _shuffle([c.down, ...others]);
    return {
      type: 'duilian',
      prompt: '对对联 · 选下联',
      hint: `上联　${c.up}`,
      options,
      answer: options.indexOf(c.down),
    };
  }
}

function startPoetry(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  const total = 3;
  let round = 0;
  let score = 0;
  // 文房灵感: 累计持有文房 poetryBonus 之和；>=15 给 1 次重答机会
  const poetryBonus = ownedSum('poetryBonus', 'literati');
  let retriesLeft = poetryBonus >= 15 ? 1 : 0;

  function renderRound() {
    if (round >= total) return renderFinal();
    round++;
    const q = makePoetryRound();
    const bonusBadge = poetryBonus > 0
      ? `<span class="poetry-bonus" title="文房四宝加成">✒ 文房灵感 +${poetryBonus}${retriesLeft ? `　· 可灵思一次` : ''}</span>` : '';
    overlay.innerHTML = `
      <div class="sg-card poetry">
        <div class="sg-title">🍷 诗酒小宴 · 与 ${who} 共饮${bonusBadge}</div>
        <div class="sg-sub">${q.prompt}　·　第 ${round} / ${total} 巡　·　对中 ${score}</div>
        <div class="poetry-hint">${q.hint}</div>
        <div class="riddle-options">
          ${q.options.map((o, i) => `<button class="riddle-opt poetry-opt" data-i="${i}">${o}</button>`).join('')}
        </div>
        <div class="sg-result" id="sgResult">— 请落杯赋诗 —</div>
        <div class="sg-actions">
          <button id="sgClose" class="sg-btn ghost">中途告辞</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    let answered = false;
    overlay.querySelectorAll('.riddle-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        const i = parseInt(btn.dataset.i, 10);
        const correct = i === q.answer;
        // 文房灵思：答错时若有 retry，自动给一次重答机会
        if (!correct && retriesLeft > 0) {
          retriesLeft--;
          btn.classList.add('disabled', 'wrong');
          const result = document.getElementById('sgResult');
          result.textContent = `✒ 灵思一闪　此句非也，再思一句（剩余灵思 ${retriesLeft}）`;
          result.className = 'sg-result draw';
          return;
        }
        answered = true;
        if (correct) score++;
        overlay.querySelectorAll('.riddle-opt').forEach((b, j) => {
          b.classList.add('disabled');
          if (j === q.answer) b.classList.add('correct');
          if (j === i && !correct) b.classList.add('wrong');
        });
        const result = document.getElementById('sgResult');
        result.textContent = correct
          ? `✦ 对！正解：${q.options[q.answer]}`
          : `✕ 应是：${q.options[q.answer]}`;
        result.className = 'sg-result ' + (correct ? 'win' : 'lose');
        setTimeout(renderRound, 1700);
      });
    });
    document.getElementById('sgClose').addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }

  function renderFinal() {
    let title, sub, out;
    if (score === 3) {
      title = '✦✦✦  诗仙！三巡皆中  ✦✦✦';
      sub = `${who} 起身揖手：「君诗才超群，请受拙作以纪此会。」`;
      out = 'perfect';
    } else if (score === 2) {
      title = '◎ 才情不俗 · 两中一负';
      sub = `${who} 笑：「胜负无碍，雅集尽兴。」`;
      out = 'draw';
    } else if (score === 1) {
      title = '· 勉强一巡 · 一中两负';
      sub = `${who} 摇头：「君且回去再读几卷。」`;
      out = 'lose';
    } else {
      title = '✕ 颗粒无收';
      sub = `${who} 调侃：「公子何不饮酒，少谈诗？」`;
      out = 'lose';
    }
    overlay.innerHTML = `
      <div class="sg-card poetry">
        <div class="sg-title">诗酒已罢 · ${score} / ${total} 中</div>
        <div class="sg-sub">${sub}</div>
        <div class="sg-result ${out === 'perfect' ? 'win' : out}" style="font-size:18px; padding:14px;">${title}</div>
        <div class="sg-actions">
          <button id="sgAgain" class="sg-btn ghost">再来三巡</button>
          <button id="sgClose" class="sg-btn">告辞</button>
        </div>
      </div>
    `;
    // 颁奖（迁移至 LOOT_TABLES）
    setTimeout(() => {
      if (out === 'perfect') {
        const id = drawLootId('perfect');
        const def = ITEMS[id];
        grantItemById(id, npc, { silent: true });
        showRewardToast(`✦ 诗仙赞 ✦  ${who} 赐 ${def ? def.icon + ' ' + def.name : ''}`, 3800);
      } else {
        grantReward(out, npc);
      }
    }, 500);
    document.getElementById('sgAgain').addEventListener('click', () => {
      score = 0; round = 0; renderRound();
    });
    document.getElementById('sgClose').addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }

  renderRound();
}

/* ============================================================
 *  V11 SHOPS · 五处店铺，分布东市/西市/酒肆
 * ============================================================ */
const SHOPS = [
  {
    id: 'tavern',     name: '朱雀酒肆',         keeperRole: '酒肆掌柜',
    pos: new THREE.Vector3(-5, 0, -1.0), radius: 2.5, lanternColor: 0xd84030,
    flavor: '掌柜吆喝："客官请进！酒香三里，不饮可惜！"',
    sells: ['hu_cake', 'roast_chestnut', 'rice_bowl', 'grape_wine', 'sushan', 'green_tea', 'jian_nan_chun'],
  },
  {
    id: 'east_grain',  name: '东市米粮铺',       keeperRole: '粮铺店家',
    pos: new THREE.Vector3(5, 0, 16), radius: 2.5, lanternColor: 0xd0b860,
    flavor: '店家："新到江南粳米、关中麦面，养胃实在。"',
    sells: ['rice_bowl', 'hu_cake', 'roast_chestnut', 'green_tea'],
  },
  {
    id: 'east_lit',    name: '东市文房斋',       keeperRole: '文房掌柜',
    pos: new THREE.Vector3(-5, 0, 17), radius: 2.5, lanternColor: 0x6080a0,
    flavor: '掌柜抚须："君家书房可缺一砚？"',
    sells: ['brush_huzhou', 'ink_song', 'paper_xuan', 'inkstone_duan', 'tang_poems', 'whole_tang', 'doggerel'],
  },
  {
    id: 'east_silk',   name: '东市绫罗肆',       keeperRole: '绫罗肆老板娘',
    pos: new THREE.Vector3(0, 0, 19), radius: 2.5, lanternColor: 0xb060a0,
    flavor: '老板娘："衣冠者之礼，看君样貌该是文士。"',
    sells: ['scholar_robe', 'official_cap', 'silk_kerchief', 'jade_pendant', 'bamboo_pin', 'fragrance_pouch'],
  },
  {
    id: 'west_huhang', name: '西市胡商货栈',     keeperRole: '胡商',
    pos: new THREE.Vector3(-22, 0, -3), radius: 3.0, lanternColor: 0xc89060,
    flavor: '胡商笑眯眯：「波斯来的稀奇货，错过不再有！」',
    sells: ['western_mirror', 'pearl', 'wu_zi_painting', 'shu_brocade', 'tengwang_rub', 'tangchang_map', 'gate_warrant'],
  },
];

// 简易店招：底座 + 立柱 + 灯笼 + 牌匾
function buildShopMarker(shop) {
  const grp = new THREE.Group();
  // 立柱
  grp.add(box(0.16, 2.2, 0.16, 'wood', 0, 0, 0));
  // 灯笼 (球 + 流苏)
  const lanternMat = new THREE.MeshLambertMaterial({ color: shop.lanternColor, emissive: shop.lanternColor, emissiveIntensity: 0.3 });
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), lanternMat);
  lantern.position.set(0, 2.2, 0);
  grp.add(lantern);
  // 流苏
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), new THREE.MeshBasicMaterial({ color: 0xffe080 }));
  tassel.position.set(0, 1.94, 0); tassel.rotation.x = Math.PI;
  grp.add(tassel);
  // 牌匾
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.05), new THREE.MeshLambertMaterial({ color: 0x2b1810 }));
  plate.position.set(0, 1.5, 0);
  grp.add(plate);
  // 牌匾文字 (Canvas Texture)
  const c = document.createElement('canvas');
  c.width = 280; c.height = 80;
  const cx = c.getContext('2d');
  cx.fillStyle = '#2b1810'; cx.fillRect(0, 0, 280, 80);
  cx.strokeStyle = '#e0c068'; cx.lineWidth = 3; cx.strokeRect(4, 4, 272, 72);
  cx.fillStyle = '#f0d090'; cx.font = 'bold 36px STKaiti, KaiTi, serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(shop.name, 140, 44);
  const tex = new THREE.CanvasTexture(c);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.36), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(0, 1.5, 0.03);
  grp.add(sign);
  const signBack = sign.clone(); signBack.position.z = -0.03; signBack.rotation.y = Math.PI;
  grp.add(signBack);
  grp.position.copy(shop.pos);
  grp.userData = { shopMarker: shop.id, lantern };
  shop._marker = grp;
  return grp;
}
// 把店招加入场景
const shopGroup = new THREE.Group();
SHOPS.forEach(s => shopGroup.add(buildShopMarker(s)));
scene.add(shopGroup);
// 灯笼晃动
function tickShopLanterns(t) {
  for (const s of SHOPS) {
    if (s._marker && s._marker.userData.lantern) {
      s._marker.userData.lantern.position.x = Math.sin(t * 1.2 + s.pos.x) * 0.05;
    }
  }
}

// 检测最近店铺（仅 TPS 模式）
function checkNearestShop() {
  if (!gameState.active || gameState.viewMode !== 'tps') {
    gameState.nearestShop = null;
    return;
  }
  const px = gameState.pos.x, pz = gameState.pos.z;
  let best = null, bestD = Infinity;
  for (const s of SHOPS) {
    const d = Math.hypot(s.pos.x - px, s.pos.z - pz);
    if (d < s.radius && d < bestD) { bestD = d; best = s; }
  }
  gameState.nearestShop = best;
  // 复用 doorPrompt UI
  const dp = document.getElementById('doorPrompt');
  if (!dp) return;
  if (best && !gameState.dialogActive && !gameState.shopActive) {
    dp.innerHTML = `<span class="kbd">F</span> 入 <b>${best.name}</b>`;
    dp.classList.add('show');
  } else if (!gameState.nearDoor) {
    dp.classList.remove('show');
  }
}

// 开店 UI
function openShop(shop) {
  if (gameState.shopActive) return;
  gameState.shopActive = true;
  gameState.activeShop = shop;
  if (fpsControls && fpsControls.isLocked) fpsControls.unlock();
  renderShopUI('buy');
}

function closeShop() {
  gameState.shopActive = false;
  gameState.activeShop = null;
  const overlay = document.getElementById('shopOverlay');
  if (overlay) overlay.classList.remove('show');
}

function priceText(price) {
  if (!price) return '<span class="px-no">非卖</span>';
  const parts = [];
  if (price.gold)   parts.push(`<span class="px-go">🏵${price.gold}</span>`);
  if (price.silk)   parts.push(`<span class="px-si">🧵${price.silk}</span>`);
  if (price.copper) parts.push(`<span class="px-cu">🪙${price.copper}</span>`);
  return parts.join(' ');
}

function canAfford(price) {
  if (!price) return false;
  const w = gameState.wallet || { copper: 0, silk: 0, gold: 0 };
  return (w.copper >= (price.copper || 0)) && (w.silk >= (price.silk || 0)) && (w.gold >= (price.gold || 0));
}

function pay(price) {
  if (!price) return false;
  gameState.wallet.copper -= (price.copper || 0);
  gameState.wallet.silk   -= (price.silk   || 0);
  gameState.wallet.gold   -= (price.gold   || 0);
  return true;
}
function receive(price) {
  if (!price) return;
  gameState.wallet.copper += (price.copper || 0);
  gameState.wallet.silk   += (price.silk   || 0);
  gameState.wallet.gold   += (price.gold   || 0);
}

function renderShopUI(mode = 'buy') {
  const overlay = document.getElementById('shopOverlay');
  const shop = gameState.activeShop;
  if (!overlay || !shop) return;
  const w = gameState.wallet || { copper: 0, silk: 0, gold: 0, fame: 0 };
  let rows = '';
  if (mode === 'buy') {
    for (const iid of shop.sells) {
      const def = ITEMS[iid];
      if (!def) continue;
      const aff = canAfford(def.buy);
      rows += `
        <div class="shop-row${aff ? '' : ' poor'}" data-iid="${iid}">
          <span class="shop-icon">${def.icon}</span>
          <span class="shop-name">${def.name}<div class="shop-cat">${CAT_LABEL[def.cat] || def.cat}</div></span>
          <span class="shop-price">${priceText(def.buy)}</span>
          <button class="shop-buy" data-iid="${iid}" ${aff ? '' : 'disabled'}>购</button>
        </div>`;
    }
  } else {
    const items = gameState.inventory || [];
    if (items.length === 0) {
      rows = '<div class="shop-empty">— 你身无长物 —</div>';
    } else {
      for (const it of items) {
        const def = ITEMS[it.itemId];
        if (!def || !def.sell) continue;
        rows += `
          <div class="shop-row">
            <span class="shop-icon">${def.icon}</span>
            <span class="shop-name">${def.name}<div class="shop-cat">${CAT_LABEL[def.cat] || def.cat} · ×${it.qty}</div></span>
            <span class="shop-price">${priceText(def.sell)}</span>
            <button class="shop-sell" data-iid="${it.itemId}">售</button>
          </div>`;
      }
    }
  }
  overlay.innerHTML = `
    <div class="shop-card">
      <div class="shop-header">
        <div class="shop-title">🏮 ${shop.name}</div>
        <div class="shop-flavor">${shop.flavor}</div>
      </div>
      <div class="shop-wallet">
        <span>🪙 ${w.copper} 文</span>
        <span>🧵 ${w.silk} 匹</span>
        <span>🏵 ${w.gold} 锭</span>
        <span>✦ ${w.fame} 风雅</span>
      </div>
      <div class="shop-tabs">
        <button class="shop-tab ${mode === 'buy' ? 'active' : ''}" data-mode="buy">买入</button>
        <button class="shop-tab ${mode === 'sell' ? 'active' : ''}" data-mode="sell">卖出</button>
      </div>
      <div class="shop-list">${rows}</div>
      <div class="shop-actions">
        <button id="shopClose" class="sg-btn">告辞</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  // 绑定事件
  overlay.querySelectorAll('.shop-tab').forEach(b => {
    b.addEventListener('click', () => renderShopUI(b.dataset.mode));
  });
  overlay.querySelectorAll('.shop-buy').forEach(b => {
    b.addEventListener('click', () => {
      const iid = b.dataset.iid;
      const def = ITEMS[iid];
      if (!def || !canAfford(def.buy)) return;
      pay(def.buy);
      grantItemById(iid, null, { silent: true });
      showRewardToast(`${shop.keeperRole} 递来 ${def.icon} ${def.name}`, 1800);
      renderShopUI('buy');
    });
  });
  overlay.querySelectorAll('.shop-sell').forEach(b => {
    b.addEventListener('click', () => {
      const iid = b.dataset.iid;
      const def = ITEMS[iid];
      const slot = gameState.inventory.find(x => x.itemId === iid);
      if (!def || !slot || !def.sell) return;
      slot.qty -= 1;
      if (slot.qty <= 0) gameState.inventory = gameState.inventory.filter(x => x !== slot);
      receive(def.sell);
      // 脱装
      for (const k of Object.keys(gameState.equip || {})) {
        if (gameState.equip[k] === iid && !ownsItem(iid)) gameState.equip[k] = null;
      }
      showRewardToast(`售 ${def.icon} ${def.name} → ${priceText(def.sell).replace(/<[^>]+>/g, '').trim()}`, 1800);
      updateInventoryUI();
      renderShopUI('sell');
    });
  });
  document.getElementById('shopClose').addEventListener('click', closeShop);
}

// 暴露给 Playwright 测试
if (typeof window !== 'undefined') {
  window.startRps = startRps;
  window.startRiddle = startRiddle;
  window.startPoetry = startPoetry;
  window.grantReward = grantReward;
  window.grantItemById = grantItemById;
  window.openShop = openShop;
  window.closeShop = closeShop;
  window.updateInventoryUI = updateInventoryUI;
  window.SHOPS = SHOPS;
  window.ITEMS = ITEMS;
}

/* === 猜拳 === */
const RPS_HANDS = [
  { id: 'rock',     emoji: '✊', label: '石' },
  { id: 'scissors', emoji: '✌', label: '剪' },
  { id: 'paper',    emoji: '✋', label: '布' },
];
function rpsJudge(p, n) {
  if (p === n) return 'draw';
  if ((p === 'rock' && n === 'scissors') ||
      (p === 'scissors' && n === 'paper') ||
      (p === 'paper' && n === 'rock')) return 'win';
  return 'lose';
}

function startRps(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  overlay.innerHTML = `
    <div class="sg-card">
      <div class="sg-title">猜拳 · 与 ${who} 比划三招</div>
      <div class="sg-sub">挑一个，看你能否赢这位 ${who}。</div>
      <div class="sg-versus">
        <div class="sg-side"><div class="sg-side-label">你</div><div class="sg-hand" id="sgYou">？</div></div>
        <div class="sg-vs">—</div>
        <div class="sg-side"><div class="sg-side-label">${who}</div><div class="sg-hand" id="sgThem">？</div></div>
      </div>
      <div class="sg-row">
        ${RPS_HANDS.map(h => `<button class="sg-pick" data-pick="${h.id}"><span class="sg-emoji">${h.emoji}</span><span class="sg-label">${h.label}</span></button>`).join('')}
      </div>
      <div class="sg-result" id="sgResult">— 请出手 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再来一局</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const youEl = document.getElementById('sgYou');
  const themEl = document.getElementById('sgThem');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  let busy = false;

  overlay.querySelectorAll('.sg-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      const pick = btn.dataset.pick;
      const pHand = RPS_HANDS.find(h => h.id === pick);
      // NPC 抽签动画 (200ms 滚动)
      let tick = 0;
      const interval = setInterval(() => {
        themEl.textContent = RPS_HANDS[tick % 3].emoji;
        tick++;
      }, 60);
      youEl.textContent = pHand.emoji;
      setTimeout(() => {
        clearInterval(interval);
        const nIdx = Math.floor(Math.random() * 3);
        const nHand = RPS_HANDS[nIdx];
        themEl.textContent = nHand.emoji;
        const out = rpsJudge(pick, nHand.id);
        const text = out === 'win' ? '✦ 你胜！'
                  : out === 'draw' ? '◎ 平手' : '✕ 你输了';
        resultEl.textContent = text;
        resultEl.className = 'sg-result ' + out;
        setTimeout(() => grantReward(out, npc), 400);
        againBtn.style.display = '';
        busy = false;
      }, 600);
    });
  });
  againBtn.addEventListener('click', () => startRps(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* === 猜谜 === */
const RIDDLES = [
  { q: '身穿绿衣衫，肚里水汪汪，生的子儿多，个个黑脸膛。', options: ['西瓜', '葡萄', '苹果', '梨'], a: 0 },
  { q: '头戴红帽子，身披白褂子，说话伸脖子，走路摆架子。', options: ['鸡', '鸭', '鹅', '雀'], a: 2 },
  { q: '弟兄六七个，围着柱子坐，大家一分手，衣服全扯破。', options: ['竹', '蒜', '葱', '韭'], a: 1 },
  { q: '青枝绿叶不是树，开花结桃不是桃，剥开桃子白花花。', options: ['梅', '兰', '棉花', '稻'], a: 2 },
  { q: '一物生得真奇怪，腰里长出胡须来，没有须时还能吃，有了须时吃不来。', options: ['茄子', '玉米', '萝卜', '南瓜'], a: 1 },
  { q: '"日"出东方一片红，"月"明半夜照天空，"明"君治世千秋业——猜一字。', options: ['明', '日', '月', '天'], a: 0 },
  { q: '上有半截草，下有一池水——猜一字。', options: ['苓', '苦', '茫', '萍'], a: 2 },
  { q: '"床前明月光，疑是地上霜"是谁所作？', options: ['杜甫', '李白', '王维', '白居易'], a: 1 },
  { q: '"安史之乱"发生在哪位皇帝在位？', options: ['唐太宗', '武则天', '唐玄宗', '唐肃宗'], a: 2 },
  { q: '玄奘西行天竺求佛法共多少年？', options: ['七年', '十年', '十七年', '二十年'], a: 2 },
  { q: '长安城内"东市"主售什么？', options: ['内贸日用百货', '西域奇货', '兵器', '书籍'], a: 0 },
  { q: '雁塔题名是为庆祝什么人？', options: ['新科状元', '新科进士', '新科举子', '探花使'], a: 1 },
];

function startRiddle(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
  overlay.innerHTML = `
    <div class="sg-card riddle">
      <div class="sg-title">猜谜 · ${who} 出题</div>
      <div class="sg-sub">猜对赏你佳物，猜错也有路人之礼。</div>
      <div class="riddle-q">${r.q}</div>
      <div class="riddle-options" id="riddleOpts">
        ${r.options.map((o, i) => `<button class="riddle-opt" data-i="${i}">${o}</button>`).join('')}
      </div>
      <div class="sg-result" id="sgResult">— 请猜 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再来一题</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  let answered = false;
  overlay.querySelectorAll('.riddle-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const i = parseInt(btn.dataset.i, 10);
      const correct = i === r.a;
      overlay.querySelectorAll('.riddle-opt').forEach((b, j) => {
        b.classList.add('disabled');
        if (j === r.a) b.classList.add('correct');
        if (j === i && !correct) b.classList.add('wrong');
      });
      resultEl.textContent = correct
        ? `✦ 答对了！正是【${r.options[r.a]}】`
        : `✕ 错了，应是【${r.options[r.a]}】`;
      resultEl.className = 'sg-result ' + (correct ? 'win' : 'lose');
      setTimeout(() => grantReward(correct ? 'win' : 'lose', npc), 500);
      againBtn.style.display = '';
    });
  });
  againBtn.addEventListener('click', () => startRiddle(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* ============================================================
 *  街头游戏池 · 通用工具
 * ============================================================ */
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/* === 摇骰子 · 大点比拼 (3 颗骰子) ===
 *  唐人尚博戏, 长安东西市皆设博场.
 *  规则: 各掷 3 颗骰子, 点数大者胜. 通杀/三同点 = 完胜.
 */
function startDice(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  overlay.innerHTML = `
    <div class="sg-card dice">
      <div class="sg-title">🎲 摇骰 · 与 ${who} 比大点</div>
      <div class="sg-sub">各掷三枚骰子, 点数高者得彩. 同点和 = 平局.</div>
      <div class="sg-versus">
        <div class="sg-side">
          <div class="sg-side-label">你</div>
          <div class="dice-row" id="dicePlayer">
            <span class="dice-face">⚀</span><span class="dice-face">⚀</span><span class="dice-face">⚀</span>
          </div>
          <div class="dice-sum" id="dicePlayerSum">—</div>
        </div>
        <div class="sg-vs">VS</div>
        <div class="sg-side">
          <div class="sg-side-label">${who}</div>
          <div class="dice-row" id="diceNpc">
            <span class="dice-face">⚀</span><span class="dice-face">⚀</span><span class="dice-face">⚀</span>
          </div>
          <div class="dice-sum" id="diceNpcSum">—</div>
        </div>
      </div>
      <div class="sg-row">
        <button class="sg-pick" id="diceRollBtn"><span class="sg-emoji">🎲</span><span class="sg-label">摇骰</span></button>
      </div>
      <div class="sg-result" id="sgResult">— 点击摇骰 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再摇一回</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const rollBtn = document.getElementById('diceRollBtn');
  const playerRow = document.getElementById('dicePlayer');
  const npcRow = document.getElementById('diceNpc');
  const playerSum = document.getElementById('dicePlayerSum');
  const npcSum = document.getElementById('diceNpcSum');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  let busy = false;

  rollBtn.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    rollBtn.disabled = true;
    // 滚动动画
    let ticks = 0;
    const interval = setInterval(() => {
      [playerRow, npcRow].forEach(row => {
        row.innerHTML = [0,1,2].map(() =>
          `<span class="dice-face rolling">${DICE_FACES[Math.floor(Math.random()*6)]}</span>`
        ).join('');
      });
      ticks++;
      if (ticks > 14) {
        clearInterval(interval);
        // 终值
        const p = [0,1,2].map(() => 1 + Math.floor(Math.random()*6));
        const n = [0,1,2].map(() => 1 + Math.floor(Math.random()*6));
        const pTot = p.reduce((a,b)=>a+b,0);
        const nTot = n.reduce((a,b)=>a+b,0);
        playerRow.innerHTML = p.map(v => `<span class="dice-face">${DICE_FACES[v-1]}</span>`).join('');
        npcRow.innerHTML    = n.map(v => `<span class="dice-face">${DICE_FACES[v-1]}</span>`).join('');
        playerSum.textContent = `共 ${pTot} 点`;
        npcSum.textContent    = `共 ${nTot} 点`;
        // 三同点判定 (豹子)
        const pTriple = p[0] === p[1] && p[1] === p[2];
        const nTriple = n[0] === n[1] && n[1] === n[2];
        let out, text;
        if (pTriple && !nTriple) { out = 'win'; text = `✦ 豹子 · ${p[0]}点三同, 大胜!`; }
        else if (nTriple && !pTriple) { out = 'lose'; text = `✕ 对方豹子 · 输得彻底`; }
        else if (pTot > nTot) { out = 'win'; text = `✦ 你 ${pTot} 点胜 (${nTot} 点)`; }
        else if (pTot < nTot) { out = 'lose'; text = `✕ 输 ${nTot - pTot} 点 (${pTot}/${nTot})`; }
        else { out = 'draw'; text = `◎ 同点 ${pTot} 平局`; }
        resultEl.textContent = text;
        resultEl.className = 'sg-result ' + out;
        setTimeout(() => grantReward(out, npc), 500);
        againBtn.style.display = '';
        rollBtn.disabled = false;
        busy = false;
      }
    }, 70);
  });
  againBtn.addEventListener('click', () => startDice(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* === 划拳 · 拇战 (Finger-flashing) ===
 *  唐宋以来的酒令. 双方同时出 0-5 指, 同时喊一个 0-10 数, 喊中两人手指总和者赢.
 *  实现简化: 玩家先出手指数(0-5)、喊总和(0-10), NPC 随机出手指. 中者赢, 一中一不中各胜各负, 都中或都不中 = 平.
 *  实际上为了趣味, 让 NPC 也"喊"一个数(算法上猜玩家最常喊的), 双方比对.
 */
function startFingerGuess(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  let chosenFingers = null, chosenCall = null;
  overlay.innerHTML = `
    <div class="sg-card finger">
      <div class="sg-title">👊 划拳 · 与 ${who} 拇战</div>
      <div class="sg-sub">先出 0-5 指, 同时喊一个 0-10 数. 双方手指总和等于谁喊的数, 谁胜!</div>
      <div class="finger-step">
        <div class="finger-step-label">① 你出几指?</div>
        <div class="sg-row wrap" id="fingerHandRow">
          ${[0,1,2,3,4,5].map(i => `<button class="sg-pick small" data-fingers="${i}"><span class="sg-emoji">${i === 0 ? '✊' : '👆'}</span><span class="sg-label">${i}指</span></button>`).join('')}
        </div>
      </div>
      <div class="finger-step" id="fingerCallStep" style="display:none;">
        <div class="finger-step-label">② 你喊什么数 (两人手指总和)?</div>
        <div class="sg-row wrap" id="fingerCallRow">
          ${[0,1,2,3,4,5,6,7,8,9,10].map(i => `<button class="sg-pick tiny" data-call="${i}">${i}</button>`).join('')}
        </div>
      </div>
      <div class="finger-resolve" id="fingerResolve" style="display:none;">
        <div class="sg-versus">
          <div class="sg-side"><div class="sg-side-label">你</div><div class="finger-hand" id="fingerYou">？</div><div class="finger-call" id="fingerYouCall">喊?</div></div>
          <div class="sg-vs">+</div>
          <div class="sg-side"><div class="sg-side-label">${who}</div><div class="finger-hand" id="fingerThem">？</div><div class="finger-call" id="fingerThemCall">喊?</div></div>
          <div class="sg-vs">=</div>
          <div class="sg-side"><div class="sg-side-label">总和</div><div class="finger-sum" id="fingerSum">?</div></div>
        </div>
      </div>
      <div class="sg-result" id="sgResult">— ① 先选指数 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再来一拳</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  const callStep = document.getElementById('fingerCallStep');
  const resolveStep = document.getElementById('fingerResolve');

  overlay.querySelectorAll('[data-fingers]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (chosenFingers != null) return;
      chosenFingers = parseInt(btn.dataset.fingers, 10);
      btn.classList.add('chosen');
      overlay.querySelectorAll('[data-fingers]').forEach(b => { if (b !== btn) b.classList.add('disabled'); });
      callStep.style.display = '';
      resultEl.textContent = '— ② 喊一个 0-10 的数 —';
    });
  });
  overlay.querySelectorAll('[data-call]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (chosenCall != null || chosenFingers == null) return;
      chosenCall = parseInt(btn.dataset.call, 10);
      btn.classList.add('chosen');
      overlay.querySelectorAll('[data-call]').forEach(b => { if (b !== btn) b.classList.add('disabled'); });
      resolveFinger();
    });
  });

  function resolveFinger() {
    resolveStep.style.display = '';
    // NPC 出: 0-5 均匀分布
    const npcFingers = Math.floor(Math.random() * 6);
    // NPC 喊数: 偏向均值(5), 高斯抽样 → clamp 0-10
    let npcCall = Math.round(5 + (Math.random() - 0.5) * 6 + (Math.random() - 0.5) * 3);
    npcCall = Math.max(0, Math.min(10, npcCall));
    const total = chosenFingers + npcFingers;
    document.getElementById('fingerYou').textContent = chosenFingers === 0 ? '✊' : '👋'.repeat(1);
    document.getElementById('fingerThem').textContent = npcFingers === 0 ? '✊' : '👋'.repeat(1);
    document.getElementById('fingerYou').setAttribute('data-n', chosenFingers);
    document.getElementById('fingerThem').setAttribute('data-n', npcFingers);
    // 显示数字
    document.getElementById('fingerYou').innerHTML = `<span class="big">${chosenFingers}</span>`;
    document.getElementById('fingerThem').innerHTML = `<span class="big">${npcFingers}</span>`;
    document.getElementById('fingerYouCall').textContent  = '喊 ' + chosenCall;
    document.getElementById('fingerThemCall').textContent = '喊 ' + npcCall;
    document.getElementById('fingerSum').textContent = String(total);
    const playerHit = chosenCall === total;
    const npcHit = npcCall === total;
    let out, text;
    if (playerHit && !npcHit)  { out = 'win';  text = `✦ 你喊中 ${total}! 罚 ${who} 一杯!`; }
    else if (!playerHit && npcHit) { out = 'lose'; text = `✕ ${who} 喊中 ${total}, 该你饮!`; }
    else if (playerHit && npcHit)  { out = 'draw'; text = `◎ 双方都喊中 ${total}, 各饮半杯`; }
    else                            { out = 'draw'; text = `◎ 都不中 (实为 ${total}), 再战`; }
    resultEl.textContent = text;
    resultEl.className = 'sg-result ' + out;
    setTimeout(() => grantReward(out, npc), 500);
    againBtn.style.display = '';
  }

  againBtn.addEventListener('click', () => startFingerGuess(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* === 斗草 · 武斗百草 (Grass-fighting) ===
 *  唐代仕女、儿童常玩. 各取一草, 名号相对者胜.
 *  实现: 玩家从 6 种花草中挑一, NPC 随机出, 名号"对仗"判赢 (相生 / 同类 / 相克).
 *  采用诗意配对而非真正植物相生, 增加唐风味.
 */
const DOU_CAO_HERBS = [
  { id: 'meihua',   name: '梅花', emoji: '🌸', poetic: '寒梅' },
  { id: 'liu',      name: '柳条', emoji: '🌿', poetic: '弱柳' },
  { id: 'lan',      name: '兰草', emoji: '🌱', poetic: '幽兰' },
  { id: 'mudan',    name: '牡丹', emoji: '🌷', poetic: '富贵牡丹' },
  { id: 'jushui',   name: '菊水', emoji: '🌼', poetic: '黄菊' },
  { id: 'lianhua',  name: '莲花', emoji: '🪷', poetic: '清莲' },
];
// 对仗表: 玩家草 vs NPC 草 -> 'win' / 'lose' / 'draw' (诗意对应)
const DOU_CAO_PAIRS = {
  // 寒梅 ↔ 黄菊 (傲骨之争, 寒梅胜)
  meihua:  { jushui: 'win',  liu: 'win',  mudan: 'lose', lan: 'draw', lianhua: 'lose', meihua: 'draw' },
  liu:     { lianhua: 'win', lan: 'win',  meihua: 'lose', mudan: 'lose', jushui: 'draw', liu: 'draw' },
  lan:     { mudan: 'win',  jushui: 'win', liu: 'lose', meihua: 'draw', lianhua: 'lose', lan: 'draw' },
  mudan:   { meihua: 'win', lianhua: 'win', lan: 'lose', jushui: 'draw', liu: 'win', mudan: 'draw' },
  jushui:  { liu: 'draw', lianhua: 'win',  lan: 'lose', mudan: 'draw', meihua: 'lose', jushui: 'draw' },
  lianhua: { jushui: 'lose', lan: 'win', meihua: 'win', liu: 'lose', mudan: 'lose', lianhua: 'draw' },
};
function startDouCao(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  overlay.innerHTML = `
    <div class="sg-card doucao">
      <div class="sg-title">🌿 斗草 · 与 ${who} 较名号</div>
      <div class="sg-sub">取一草以对其名号. 寒梅压傲菊, 弱柳胜清莲——胜负在诗意.</div>
      <div class="sg-row wrap">
        ${DOU_CAO_HERBS.map(h => `<button class="sg-pick" data-herb="${h.id}"><span class="sg-emoji">${h.emoji}</span><span class="sg-label">${h.name}</span></button>`).join('')}
      </div>
      <div class="sg-versus" id="dcResolve" style="display:none; margin-top:14px;">
        <div class="sg-side"><div class="sg-side-label">你</div><div class="sg-hand big" id="dcYou">？</div></div>
        <div class="sg-vs">↔</div>
        <div class="sg-side"><div class="sg-side-label">${who}</div><div class="sg-hand big" id="dcThem">？</div></div>
      </div>
      <div class="sg-result" id="sgResult">— 取一草 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再斗一回</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  let chosen = false;
  overlay.querySelectorAll('[data-herb]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (chosen) return;
      chosen = true;
      const pId = btn.dataset.herb;
      const nId = DOU_CAO_HERBS[Math.floor(Math.random() * DOU_CAO_HERBS.length)].id;
      const pH = DOU_CAO_HERBS.find(h => h.id === pId);
      const nH = DOU_CAO_HERBS.find(h => h.id === nId);
      document.getElementById('dcResolve').style.display = '';
      document.getElementById('dcYou').innerHTML  = `<span class="sg-emoji">${pH.emoji}</span><br><span class="poetic">${pH.poetic}</span>`;
      document.getElementById('dcThem').innerHTML = `<span class="sg-emoji">${nH.emoji}</span><br><span class="poetic">${nH.poetic}</span>`;
      overlay.querySelectorAll('[data-herb]').forEach(b => b.classList.add('disabled'));
      btn.classList.add('chosen');
      const out = (DOU_CAO_PAIRS[pId] && DOU_CAO_PAIRS[pId][nId]) || 'draw';
      const text = out === 'win'  ? `✦ ${pH.poetic} 压 ${nH.poetic} — 你赢!`
                : out === 'draw' ? `◎ ${pH.poetic} 对 ${nH.poetic} — 各擅其妙`
                :                  `✕ ${nH.poetic} 胜 ${pH.poetic} — 输此一筹`;
      resultEl.textContent = text;
      resultEl.className = 'sg-result ' + out;
      setTimeout(() => grantReward(out, npc), 500);
      againBtn.style.display = '';
    });
  });
  againBtn.addEventListener('click', () => startDouCao(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* === 猜枚 · 单双 (Cai Mei / Odd-or-Even) ===
 *  唐风酒令小品. NPC 拳中藏 1-5 枚铜钱, 玩家猜单/双.
 *  极简易上手, 老少咸宜. 输赢与猜枚多少结合.
 */
function startCaiMei(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = roleLabel(npc.userData.npcRole);
  overlay.innerHTML = `
    <div class="sg-card caimei">
      <div class="sg-title">📿 猜枚 · ${who} 藏铜钱于拳</div>
      <div class="sg-sub">${who} 攥 1-5 枚铜钱在手, 你猜是单数还是双数.</div>
      <div class="caimei-fist">
        <div class="caimei-emoji" id="cmFist">✊</div>
      </div>
      <div class="sg-row">
        <button class="sg-pick" data-parity="odd"><span class="sg-emoji">①③⑤</span><span class="sg-label">单</span></button>
        <button class="sg-pick" data-parity="even"><span class="sg-emoji">②④</span><span class="sg-label">双</span></button>
      </div>
      <div class="sg-result" id="sgResult">— 选单 / 双 —</div>
      <div class="sg-actions">
        <button id="sgAgain" class="sg-btn ghost" style="display:none;">再猜一回</button>
        <button id="sgClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('sgResult');
  const againBtn = document.getElementById('sgAgain');
  const fistEl = document.getElementById('cmFist');
  let chosen = false;
  overlay.querySelectorAll('[data-parity]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (chosen) return;
      chosen = true;
      const guess = btn.dataset.parity;
      const n = 1 + Math.floor(Math.random() * 5);
      const actual = n % 2 === 1 ? 'odd' : 'even';
      // 摇拳动画 → 打开
      let ticks = 0;
      const interval = setInterval(() => {
        fistEl.textContent = ['✊','🤚','✊','✋'][ticks % 4];
        ticks++;
        if (ticks > 8) {
          clearInterval(interval);
          fistEl.innerHTML = '🪙'.repeat(n);
          overlay.querySelectorAll('[data-parity]').forEach(b => b.classList.add('disabled'));
          btn.classList.add('chosen');
          const out = guess === actual ? 'win' : 'lose';
          // 5 枚全中 → 奖励升级到 perfect, 但简单实现走 win
          resultEl.textContent = out === 'win'
            ? `✦ ${n} 枚 (${actual === 'odd' ? '单' : '双'}) · 猜中!`
            : `✕ ${n} 枚 (${actual === 'odd' ? '单' : '双'}) · 猜错`;
          resultEl.className = 'sg-result ' + out;
          // 5枚=完美奖励
          setTimeout(() => grantReward(out === 'win' && n === 5 ? 'perfect' : out, npc), 500);
          againBtn.style.display = '';
        }
      }, 90);
    });
  });
  againBtn.addEventListener('click', () => startCaiMei(npc));
  document.getElementById('sgClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* ============================================================
 *  Round 1 mini · 灯谜 (Lantern Riddle) — 平康坊夜市 灯谜老者 专属
 *  与 startRiddle (脑筋急转弯) 区别: 这里走民俗灯谜池, 视觉是红灯氛围,
 *  答对发放 葡萄酒/酥山/铜钱; 答错发个胡饼安慰一下.
 * ============================================================ */
const LANTERN_RIDDLES = [
  {
    q: '千条线, 万条线, 落到水里看不见。',
    options: ['雪花', '雨', '柳枝', '蛛丝'], a: 1,
  },
  {
    q: '麻屋子, 红帐子, 里头睡个白胖子。',
    options: ['莲花', '蚕茧', '花生', '榴莲'], a: 2,
  },
  {
    q: '白胖子, 圆滚滚, 倒进锅里似翻身; 元月十五人争食, 一年只许此夜尝。',
    options: ['饺子', '汤圆', '粽子', '月饼'], a: 1,
  },
  {
    q: '悬空一面镜, 高挂半天云; 不论阴和晴, 它常照人心。',
    options: ['日', '月', '星', '虹'], a: 1,
  },
  {
    q: '弯弯一条桥, 七色彩缤纷; 桥下不流水, 不见过桥人。',
    options: ['浮桥', '彩虹', '云霓', '苑墙'], a: 1,
  },
  {
    q: '上不在天, 下不在田, 中不在人, 玲珑剔透。',
    options: ['玉', '云', '空', '心'], a: 0,
  },
];

function startLanternRiddle(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const r = LANTERN_RIDDLES[Math.floor(Math.random() * LANTERN_RIDDLES.length)];
  const who = npc && npc.userData.npcLabel
    ? npc.userData.npcLabel
    : roleLabel(npc && npc.userData.npcRole || 'elder');
  overlay.innerHTML = `
    <div class="sg-card riddle lantern" style="
      background: radial-gradient(circle at 30% 20%, #6a1818 0%, #2a0808 70%);
      box-shadow: 0 0 60px rgba(255, 80, 40, 0.45), inset 0 0 30px rgba(255, 160, 100, 0.25);
      border: 2px solid #d4a04a;
    ">
      <div class="sg-title" style="color: #ffd890;">🏮 灯谜 · ${who} 出题</div>
      <div class="sg-sub" style="color: #f3c890;">解中一谜, 老朽奉酒一杯 · 不中也送你胡饼一只.</div>
      <div class="riddle-q" style="color: #fff5d8; font-size: 1.15em; line-height: 1.7;">${r.q}</div>
      <div class="riddle-options" id="lrOpts">
        ${r.options.map((o, i) => `<button class="riddle-opt" data-i="${i}" style="background: #4a1010; color: #ffd890; border-color: #d4a04a;">${o}</button>`).join('')}
      </div>
      <div class="sg-result" id="lrResult" style="color: #ffd890;">— 请猜 —</div>
      <div class="sg-actions">
        <button id="lrAgain" class="sg-btn ghost" style="display:none;">再来一题</button>
        <button id="lrClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('lrResult');
  const againBtn = document.getElementById('lrAgain');
  let answered = false;
  overlay.querySelectorAll('#lrOpts .riddle-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const i = parseInt(btn.dataset.i, 10);
      const correct = i === r.a;
      overlay.querySelectorAll('#lrOpts .riddle-opt').forEach((b, j) => {
        b.classList.add('disabled');
        if (j === r.a) b.classList.add('correct');
        if (j === i && !correct) b.classList.add('wrong');
      });
      resultEl.textContent = correct
        ? `🏮 解中! 是【${r.options[r.a]}】`
        : `🏮 错了, 谜底是【${r.options[r.a]}】`;
      resultEl.className = 'sg-result ' + (correct ? 'win' : 'lose');
      // 奖品: 解中 → 葡萄酒 or 酥山 (随机); 错 → 胡饼 安慰
      setTimeout(() => {
        if (correct) {
          const prize = Math.random() < 0.55 ? 'grape_wine' : 'sushan';
          if (typeof grantItemById === 'function') {
            grantItemById(prize, npc, { verb: '奉你' });
          }
        } else {
          if (typeof grantItemById === 'function') {
            grantItemById('hu_cake', npc, { verb: '塞给你' });
          }
        }
      }, 500);
      againBtn.style.display = '';
    });
  });
  againBtn.addEventListener('click', () => startLanternRiddle(npc));
  document.getElementById('lrClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}

/* ============================================================
 *  Round 1 mini · 节奏跟弹 (Rhythm Tap) — 梨园教坊 梨园乐工 专属
 *  4 拍循环: 老师先按顺序闪 4 个鼓位, 然后玩家依样点击复弹.
 *  全对 → 剑南春; 半对 → 清茗; 弹错 → 一卷打油诗(消遣).
 * ============================================================ */
function startRhythmTap(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '梨园乐工';
  // 随机生成 4 拍序列, 索引 0-3 任意, 允许重复
  const sequence = [];
  for (let i = 0; i < 4; i++) sequence.push(Math.floor(Math.random() * 4));

  const drumColors = ['#c23a2a', '#4670a0', '#6b8e3d', '#d4a01e'];
  const drumNames  = ['鼓', '笛', '琵琶', '排箫'];

  overlay.innerHTML = `
    <div class="sg-card rhythm" style="
      background: radial-gradient(circle at 50% 0%, #3a2418 0%, #1a0e08 80%);
      box-shadow: 0 0 60px rgba(212, 160, 74, 0.35), inset 0 0 40px rgba(180, 110, 60, 0.18);
      border: 2px solid #d4a04a; min-width: 420px;
    ">
      <div class="sg-title" style="color: #ffd890;">🥁 节奏跟弹 · ${who}</div>
      <div class="sg-sub" id="rtPhase" style="color: #f3c890;">老师将先击四拍 — 请看清次序</div>
      <div id="rtDrums" style="display: flex; gap: 12px; justify-content: center; margin: 22px 0;">
        ${[0, 1, 2, 3].map((k) => `
          <button class="rt-drum" data-k="${k}" disabled style="
            width: 76px; height: 92px; border-radius: 12px;
            background: ${drumColors[k]}; color: #fff5d8;
            border: 3px solid #6e4222; font-size: 22px; font-family: STKaiti, serif;
            cursor: pointer; opacity: 0.6; transition: all 0.15s;
          ">${drumNames[k]}</button>
        `).join('')}
      </div>
      <div class="sg-result" id="rtResult" style="color: #ffd890; min-height: 24px;">— 拍 0 / 4 —</div>
      <div class="sg-actions">
        <button id="rtAgain" class="sg-btn ghost" style="display:none;">再来一拍</button>
        <button id="rtClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const phaseEl  = document.getElementById('rtPhase');
  const resultEl = document.getElementById('rtResult');
  const againBtn = document.getElementById('rtAgain');
  const drumBtns = Array.from(overlay.querySelectorAll('.rt-drum'));

  const flash = (idx) => {
    const b = drumBtns[idx]; if (!b) return;
    b.style.opacity = '1';
    b.style.transform = 'scale(1.12)';
    b.style.boxShadow = `0 0 40px ${drumColors[idx]}`;
    setTimeout(() => {
      b.style.opacity = '0.6';
      b.style.transform = 'scale(1)';
      b.style.boxShadow = 'none';
    }, 360);
  };

  // 演示阶段: 依次闪 4 拍 (每拍 600ms)
  let demoIdx = 0;
  const demoTick = () => {
    if (demoIdx >= sequence.length) {
      // 进入玩家阶段
      phaseEl.textContent = '该您和拍 — 依样按 4 次';
      drumBtns.forEach(b => { b.disabled = false; b.style.opacity = '0.85'; });
      let playerIdx = 0;
      let mistakes = 0;
      const onPlay = (e) => {
        const b = e.currentTarget;
        const k = parseInt(b.dataset.k, 10);
        flash(k);
        const expected = sequence[playerIdx];
        if (k !== expected) mistakes++;
        playerIdx++;
        resultEl.textContent = `— 拍 ${playerIdx} / 4 ${mistakes ? '(误 ' + mistakes + ')' : ''} —`;
        if (playerIdx >= sequence.length) {
          // 判定
          drumBtns.forEach(b2 => { b2.disabled = true; b2.style.opacity = '0.5'; });
          let outcome, msg, prize;
          if (mistakes === 0) {
            outcome = 'perfect'; msg = '🎵 全弹合拍! 老师击节称善.';
            prize = 'jian_nan_chun';
          } else if (mistakes <= 1) {
            outcome = 'win'; msg = '🎵 还算得心应手, 老师颔首.';
            prize = 'grape_wine';
          } else if (mistakes <= 2) {
            outcome = 'draw'; msg = '🎵 拍是有了, 律差几分.';
            prize = 'green_tea';
          } else {
            outcome = 'lose'; msg = '🎵 此曲未谐 — 老师赠你打油诗一卷.';
            prize = 'doggerel';
          }
          resultEl.textContent = msg;
          resultEl.className = 'sg-result ' + (mistakes === 0 ? 'win' : (mistakes >= 3 ? 'lose' : ''));
          setTimeout(() => {
            if (typeof grantItemById === 'function') {
              grantItemById(prize, npc, { verb: outcome === 'lose' ? '塞给你' : '奉你' });
            }
          }, 500);
          againBtn.style.display = '';
        }
      };
      drumBtns.forEach(b => b.addEventListener('click', onPlay));
      return;
    }
    phaseEl.textContent = `老师击 ${demoIdx + 1} / 4 拍`;
    flash(sequence[demoIdx]);
    demoIdx++;
    setTimeout(demoTick, 600);
  };
  setTimeout(demoTick, 500);

  againBtn.addEventListener('click', () => startRhythmTap(npc));
  document.getElementById('rtClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}


/* ============================================================
 *  Round 2 mini · 鉴宝 (Jade Appraisal) — 东市 鉴宝商贾 专属
 *  3 件玉璧, 1 真 2 赝; 真品有 3 个明示线索, 玩家细看后选一件.
 *  选中真品 → 玉佩 / 东海明珠; 选错 → 蜀锦(安慰); 二次错 → 打油诗.
 * ============================================================ */
const JADE_CLUES = [
  {
    name: '青玉璧 (真)',
    color: 0x6a9c7a,
    clues: ['润泽温和, 油性十足', '色匀无杂, 透光见絮', '叩之声如清磬'],
    real: true,
  },
  {
    name: '碧玉璧 (赝)',
    color: 0x4a7a98,
    clues: ['色虽蓝绿, 微显艳俗', '触之偏凉, 沉手过实', '叩之声闷如石'],
    real: false,
  },
  {
    name: '老玉璧 (赝)',
    color: 0x9a8a44,
    clues: ['表面有蜡感, 是新染', '裂纹齐整, 是人工沁色', '叩之声短促刺耳'],
    real: false,
  },
];

function startJadeAppraisal(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '鉴宝商贾';
  // 随机洗一下 3 件位置 (固定 1 真 2 赝)
  const items = JADE_CLUES.slice().sort(() => Math.random() - 0.5);
  overlay.innerHTML = `
    <div class="sg-card jade" style="
      background: radial-gradient(circle at 50% 0%, #2a4a3a 0%, #0a1a14 80%);
      box-shadow: 0 0 60px rgba(140, 220, 170, 0.35), inset 0 0 40px rgba(110, 180, 140, 0.18);
      border: 2px solid #7be0a0; min-width: 480px; max-width: 600px;
    ">
      <div class="sg-title" style="color: #d8f5d0;">💎 鉴宝 · ${who} 出题</div>
      <div class="sg-sub" style="color: #a8e0b0;">三件玉璧, 一真二赝. 细看每件的釉色与"丝纹", 选出真品.</div>
      <div id="jaItems" style="display: flex; gap: 14px; justify-content: center; margin: 24px 0;">
        ${items.map((it, i) => `
          <button class="ja-item" data-i="${i}" style="
            width: 140px; padding: 14px 10px;
            background: rgba(0, 30, 20, 0.55); color: #e0f5d8;
            border: 2px solid #4a8a6a; border-radius: 14px;
            cursor: pointer; transition: all 0.2s;
            display: flex; flex-direction: column; align-items: center; gap: 10px;
          ">
            <div style="
              width: 86px; height: 86px; border-radius: 50%;
              background: radial-gradient(circle at 32% 32%, ${'#' + it.color.toString(16).padStart(6, '0')} 0%, #1a3024 80%);
              box-shadow: 0 0 24px rgba(120, 220, 160, 0.25);
              border: 3px solid #d4a04a;
              position: relative;
            ">
              <div style="
                position: absolute; left: 22px; top: 22px;
                width: 42px; height: 42px; border-radius: 50%;
                background: #0a1a14; box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
              "></div>
            </div>
            <div style="font-family: STKaiti, KaiTi, serif; font-size: 0.95em;">${it.name.split(' ')[0]}</div>
            <div style="font-size: 0.78em; color: #a0d0b0; line-height: 1.5; min-height: 76px;">
              ${it.clues.map(c => `• ${c}`).join('<br>')}
            </div>
          </button>
        `).join('')}
      </div>
      <div class="sg-result" id="jaResult" style="color: #d8f5d0;">— 请细辨 —</div>
      <div class="sg-actions">
        <button id="jaAgain" class="sg-btn ghost" style="display:none;">再来一局</button>
        <button id="jaClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('jaResult');
  const againBtn = document.getElementById('jaAgain');
  let answered = false;
  overlay.querySelectorAll('.ja-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const i = parseInt(btn.dataset.i, 10);
      const picked = items[i];
      const correct = picked.real;
      // 标记
      overlay.querySelectorAll('.ja-item').forEach((b, j) => {
        b.style.cursor = 'default';
        b.style.opacity = '0.5';
        if (items[j].real) {
          b.style.borderColor = '#7be0a0';
          b.style.boxShadow = '0 0 24px #7be0a0';
          b.style.opacity = '1';
        }
        if (j === i && !correct) {
          b.style.borderColor = '#e08a8a';
          b.style.boxShadow = '0 0 24px #e08a8a';
        }
      });
      let prize, verb, msg, outcome;
      if (correct) {
        prize = Math.random() < 0.45 ? 'pearl' : 'jade_pendant';
        verb = '奉你';
        msg = `💎 慧眼! 真品确是【${picked.name.split(' ')[0]}】.`;
        outcome = 'win';
      } else {
        prize = Math.random() < 0.5 ? 'shu_brocade' : 'doggerel';
        verb = '安慰你';
        msg = `💎 走眼了, 真品本是【${items.find(x => x.real).name.split(' ')[0]}】.`;
        outcome = 'lose';
      }
      resultEl.textContent = msg;
      resultEl.className = 'sg-result ' + (correct ? 'win' : 'lose');
      setTimeout(() => {
        if (typeof grantItemById === 'function') {
          grantItemById(prize, npc, { verb });
        }
      }, 500);
      againBtn.style.display = '';
    });
  });
  againBtn.addEventListener('click', () => startJadeAppraisal(npc));
  document.getElementById('jaClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}


/* ============================================================
 *  Round 2 mini · 调色 (Dye Mix) — 染坊 染坊师傅 专属
 *  给一个目标色 (紫/翠/橙); 玩家从 4 染缸里选 2 种染料,
 *  匹配到正确配比 → 一匹蜀锦; 1 对 → 一方织锦帕; 2 错 → 一盏清茗.
 * ============================================================ */
const DYE_RECIPES = [
  { target: '紫', color: 0x6a4884, recipe: ['朱', '蓝'], hint: '紫 — 朱赤 + 靛蓝' },
  { target: '翠', color: 0x6a9c7a, recipe: ['黄', '蓝'], hint: '翠 — 杏黄 + 靛蓝' },
  { target: '橙', color: 0xd47428, recipe: ['朱', '黄'], hint: '橙 — 朱赤 + 杏黄' },
  { target: '黛', color: 0x3a4a5a, recipe: ['蓝', '翠'], hint: '黛 — 靛蓝 + 老翠' },
];
const DYE_BASE_COLORS = ['朱', '黄', '蓝', '翠'];
const DYE_BASE_HEX = {
  '朱': '#c23a2a', '黄': '#d4a01e', '蓝': '#4670a0', '翠': '#6a9c7a',
};

function startDyeMix(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '染坊师傅';
  const recipe = DYE_RECIPES[Math.floor(Math.random() * DYE_RECIPES.length)];
  let picked = [];
  overlay.innerHTML = `
    <div class="sg-card dye" style="
      background: radial-gradient(circle at 30% 0%, #3a2418 0%, #1a0e08 80%);
      box-shadow: 0 0 60px rgba(212, 160, 74, 0.35), inset 0 0 40px rgba(180, 110, 60, 0.18);
      border: 2px solid #d4a04a; min-width: 460px; max-width: 580px;
    ">
      <div class="sg-title" style="color: #ffd890;">🎨 调色 · ${who}</div>
      <div class="sg-sub" style="color: #f3c890;">这匹绢丝, 我要染成 <b style="color:${'#'+recipe.color.toString(16).padStart(6,'0')}; text-shadow: 0 0 8px ${'#'+recipe.color.toString(16).padStart(6,'0')};">${recipe.target} 色</b>. 客官选 <b>两味</b> 染料.</div>
      <div id="dmTarget" style="
        margin: 18px auto; width: 120px; height: 120px;
        background: ${'#' + recipe.color.toString(16).padStart(6, '0')};
        border-radius: 50%; border: 3px solid #d4a04a;
        box-shadow: 0 0 36px ${'#' + recipe.color.toString(16).padStart(6, '0')};
        display: flex; align-items: center; justify-content: center;
        font-family: STKaiti, serif; font-size: 60px;
        color: rgba(255, 255, 255, 0.85); text-shadow: 0 2px 8px rgba(0,0,0,0.6);
      ">${recipe.target}</div>
      <div id="dmVats" style="display: flex; gap: 14px; justify-content: center; margin: 18px 0;">
        ${DYE_BASE_COLORS.map(c => `
          <button class="dm-vat" data-c="${c}" style="
            width: 86px; height: 100px;
            background: ${DYE_BASE_HEX[c]};
            color: #fff5d8; text-shadow: 0 2px 6px rgba(0,0,0,0.7);
            border: 3px solid #6e4222; border-radius: 14px;
            cursor: pointer; transition: all 0.2s;
            font-family: STKaiti, serif; font-size: 28px;
          ">${c}</button>
        `).join('')}
      </div>
      <div class="sg-result" id="dmResult" style="color: #ffd890; min-height: 24px;">— 已选 0 / 2 —</div>
      <div class="sg-actions">
        <button id="dmReset" class="sg-btn ghost" style="display:none;">重选</button>
        <button id="dmAgain" class="sg-btn ghost" style="display:none;">换一色</button>
        <button id="dmClose" class="sg-btn">退出</button>
      </div>
    </div>
  `;
  overlay.classList.add('show');
  const resultEl = document.getElementById('dmResult');
  const resetBtn = document.getElementById('dmReset');
  const againBtn = document.getElementById('dmAgain');
  const vatBtns = Array.from(overlay.querySelectorAll('.dm-vat'));
  let finalized = false;

  const finalize = () => {
    if (finalized) return;
    finalized = true;
    vatBtns.forEach(b => { b.style.cursor = 'default'; b.style.opacity = '0.55'; });
    const hits = picked.filter(c => recipe.recipe.includes(c)).length;
    let outcome, msg, prize, verb;
    if (hits === 2) {
      outcome = 'perfect';
      msg = `🎨 配方对了! 这正是【${recipe.hint}】.`;
      prize = Math.random() < 0.4 ? 'shu_brocade' : 'silk_kerchief';
      verb = '奉你';
    } else if (hits === 1) {
      outcome = 'win';
      msg = `🎨 有一味对, 一味偏 — 真方是【${recipe.hint}】.`;
      prize = 'bamboo_pin';
      verb = '塞给你';
    } else {
      outcome = 'lose';
      msg = `🎨 此色未谐, 真方是【${recipe.hint}】.`;
      prize = 'green_tea';
      verb = '安慰你';
    }
    resultEl.textContent = msg;
    resultEl.className = 'sg-result ' + (hits === 2 ? 'win' : (hits === 0 ? 'lose' : ''));
    setTimeout(() => {
      if (typeof grantItemById === 'function') {
        grantItemById(prize, npc, { verb });
      }
    }, 500);
    againBtn.style.display = '';
    resetBtn.style.display = 'none';
  };

  vatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (finalized) return;
      const c = btn.dataset.c;
      if (picked.includes(c)) return;
      picked.push(c);
      btn.style.opacity = '0.55';
      btn.style.transform = 'scale(0.92)';
      btn.style.boxShadow = '0 0 18px ' + DYE_BASE_HEX[c];
      resultEl.textContent = `— 已选 ${picked.length} / 2 (${picked.join(' + ')}) —`;
      resetBtn.style.display = picked.length >= 1 ? '' : 'none';
      if (picked.length >= 2) {
        setTimeout(finalize, 350);
      }
    });
  });
  resetBtn.addEventListener('click', () => {
    if (finalized) return;
    picked = [];
    vatBtns.forEach(b => {
      b.style.opacity = '1';
      b.style.transform = 'scale(1)';
      b.style.boxShadow = 'none';
    });
    resultEl.textContent = '— 已选 0 / 2 —';
    resetBtn.style.display = 'none';
  });
  againBtn.addEventListener('click', () => startDyeMix(npc));
  document.getElementById('dmClose').addEventListener('click', () => {
    overlay.classList.remove('show');
  });
}


/* ============================================================
 *  Round 3 mini · 射艺 (Archery Drill) — 演武校场 校尉教头 专属
 *  注意: 函数命名为 startArcheryDrill 以区别已有的 canvas 弓射游戏 startArchery.
 *  3 矢, 每矢 3 种射法 (持稳 / 瞄红心 / 速射), 不同射法不同概率.
 *  ≥13 = perfect → 通关文牒; ≥7 = win → 蜀锦/丝帕; <7 = lose → 胡饼
 * ============================================================ */
const ARCHERY_DRILL_STYLES = [
  { id: 'steady', label: '🎯 持稳瞄准', sub: '稳健, 中环居多',
    probs: { bull: 0.18, mid: 0.62, outer: 0.18, miss: 0.02 } },
  { id: 'aim',    label: '🔥 瞄准红心', sub: '险中求胜, 红心高概率',
    probs: { bull: 0.45, mid: 0.28, outer: 0.20, miss: 0.07 } },
  { id: 'speed',  label: '⚡ 速射穿心', sub: '快疾, 偏靶率高',
    probs: { bull: 0.20, mid: 0.30, outer: 0.30, miss: 0.20 } },
];
const ARCHERY_DRILL_SCORES = { bull: 5, mid: 3, outer: 1, miss: 0 };
const ARCHERY_DRILL_TXT = { bull: '🎯 正中红心 (5 分)', mid: '🟦 中蓝环 (3 分)', outer: '⚪ 擦白外圈 (1 分)', miss: '💢 偏靶离弦 (0 分)' };

function startArcheryDrill(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '校尉教头';
  let shots = 0, total = 0;
  const shotLog = [];
  const renderRound = () => {
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #2c1f12 0%, #110c08 80%);
        box-shadow: 0 0 60px rgba(255, 180, 102, 0.32), inset 0 0 40px rgba(178, 100, 50, 0.18);
        border: 2px solid #c98a3a; min-width: 480px; max-width: 600px;
      ">
        <div class="sg-title" style="color: #ffd0a0;">🏹 射艺 · ${who}</div>
        <div class="sg-sub" style="color: #f0c890;">第 <b style="color: #ffba66;">${shots + 1}</b> / 3 矢 · 已得 <b style="color:#ffd870;">${total}</b> 分</div>
        <div style="margin: 14px 0 4px 0; font-family: STKaiti, serif; color: #f5dca0;">${shotLog.length ? '上一矢: ' + shotLog[shotLog.length - 1] : '请君选射法'}</div>
        <div id="arStyles" style="display:flex; flex-direction:column; gap:10px; margin:16px 0;">
          ${ARCHERY_STYLES.map(s => `
            <button class="ar-style sg-btn" data-id="${s.id}" style="
              padding: 12px 16px; font-family: STKaiti, serif; font-size: 17px;
              background: linear-gradient(135deg, #6e3a18, #3a1d08);
              color: #ffd890; border: 2px solid #c98a3a; cursor: pointer;
              text-align: left;
            ">
              ${s.label}
              <span style="display:block; font-size:13px; opacity:0.85; margin-top:4px; color:#e0b888;">${s.sub}</span>
            </button>
          `).join('')}
        </div>
        <div class="sg-actions">
          <button id="arClose" class="sg-btn ghost">退出校场</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.ar-style').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = ARCHERY_DRILL_STYLES.find(s => s.id === btn.dataset.id);
        const r = Math.random();
        let cum = 0, hit = 'miss';
        for (const k of ['bull', 'mid', 'outer', 'miss']) {
          cum += style.probs[k];
          if (r < cum) { hit = k; break; }
        }
        total += ARCHERY_DRILL_SCORES[hit];
        shots += 1;
        shotLog.push(ARCHERY_DRILL_TXT[hit]);
        if (shots >= 3) {
          setTimeout(finalize, 500);
        } else {
          setTimeout(renderRound, 600);
        }
      });
    });
    document.getElementById('arClose').addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  };
  const finalize = () => {
    let outcome, msg, prize, verb;
    if (total >= 13) {
      outcome = 'perfect';
      msg = `🏹 三矢累计 ${total} 分 — 神射! 校尉拱手赠帛.`;
      prize = Math.random() < 0.5 ? 'gate_warrant' : 'shu_brocade';
      verb = '亲手赐你';
    } else if (total >= 7) {
      outcome = 'win';
      msg = `🏹 累计 ${total} 分 — 有些功夫, 算是过了考验.`;
      prize = Math.random() < 0.5 ? 'silk_kerchief' : 'shu_brocade';
      verb = '赠你';
    } else {
      outcome = 'lose';
      msg = `🏹 累计 ${total} 分 — 君当多练, 校尉摇头.`;
      prize = 'hu_cake';
      verb = '塞给你';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #2c1f12 0%, #110c08 80%);
        box-shadow: 0 0 60px rgba(255, 180, 102, 0.45);
        border: 2px solid #c98a3a; min-width: 460px; max-width: 580px;
      ">
        <div class="sg-title" style="color: #ffd0a0;">🏹 射艺 · 结算</div>
        <div class="sg-result ${outcome === 'lose' ? 'lose' : 'win'}" style="color:#ffd890; margin:18px 0;">${msg}</div>
        <div style="font-family: STKaiti, serif; font-size: 14px; color: #c8a878; line-height: 1.8;">
          矢 1: ${shotLog[0]}<br/>矢 2: ${shotLog[1]}<br/>矢 3: ${shotLog[2]}
        </div>
        <div class="sg-actions" style="margin-top:18px;">
          <button id="arAgain" class="sg-btn ghost">再试三矢</button>
          <button id="arEnd" class="sg-btn">退出</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb });
    }, 500);
    document.getElementById('arAgain').addEventListener('click', () => startArcheryDrill(npc));
    document.getElementById('arEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  renderRound();
}


/* ============================================================
 *  Round 3 mini · 论经 (Classics) — 国子监 太学大儒 专属
 *  3 题, 给上句, 玩家从 3 选 1 接下句. 3/3=perfect; 2/3=win; ≤1=lose.
 *  题库: 论语 / 诗经 / 孟子 / 礼记 等
 * ============================================================ */
const CLASSICS_QA = [
  { source: '《论语·学而》',     prompt: '学而时习之 →',                opts: ['不亦说乎', '不亦乐乎', '不亦君子乎'], ans: 0 },
  { source: '《论语·述而》',     prompt: '三人行 →',                    opts: ['必有我师焉', '必有忠信焉', '必有仁义焉'], ans: 0 },
  { source: '《论语·里仁》',     prompt: '朝闻道 →',                    opts: ['夕可乐也', '夕死可矣', '夕有所立'], ans: 1 },
  { source: '《诗经·关雎》',     prompt: '关关雎鸠 →',                  opts: ['在河之洲', '在沙之上', '于林之间'], ans: 0 },
  { source: '《诗经·蒹葭》',     prompt: '所谓伊人 →',                  opts: ['在水一方', '在山之巅', '在天之涯'], ans: 0 },
  { source: '《孟子·梁惠王》',   prompt: '老吾老, 以及人之老 →',        opts: ['幼吾幼, 以及人之幼', '亲吾亲, 以及人之亲', '爱吾爱, 以及人之爱'], ans: 0 },
  { source: '《孟子·告子》',     prompt: '生于忧患 →',                  opts: ['死于安乐', '亡于骄奢', '废于怠惰'], ans: 0 },
  { source: '《礼记·中庸》',     prompt: '博学之, 审问之 →',            opts: ['慎思之, 明辨之, 笃行之', '广求之, 精探之, 实证之', '勤学之, 慎思之, 力行之'], ans: 0 },
  { source: '《道德经》',         prompt: '道可道 →',                    opts: ['非常道', '不可言', '人莫见'], ans: 0 },
  { source: '《大学》',           prompt: '大学之道, 在明明德 →',        opts: ['在亲民, 在止于至善', '在敦行, 在止于至理', '在修身, 在止于至中'], ans: 0 },
];

function startClassics(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '太学大儒';
  // 抽 3 题 (不重复)
  const pool = ARRAY_SHUFFLE_LOCAL(CLASSICS_QA.slice()).slice(0, 3);
  let idx = 0, correct = 0;
  const log = [];
  const renderQ = () => {
    const q = pool[idx];
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c2638 0%, #0a0e18 80%);
        box-shadow: 0 0 60px rgba(140, 192, 255, 0.32), inset 0 0 40px rgba(80, 120, 180, 0.18);
        border: 2px solid #6c92c8; min-width: 500px; max-width: 620px;
      ">
        <div class="sg-title" style="color: #d8e6ff;">📚 论经 · ${who}</div>
        <div class="sg-sub" style="color: #b8c8e8;">第 <b style="color:#88c0ff;">${idx + 1}</b> / 3 题 · 已对 <b style="color:#88e0a0;">${correct}</b> 题</div>
        <div style="margin: 16px 0; font-family: STKaiti, serif; color: #f0f4ff;">
          <div style="font-size: 14px; color: #889ac8; margin-bottom: 6px;">${q.source}</div>
          <div style="font-size: 22px; line-height: 1.6;">"${q.prompt}"</div>
        </div>
        <div id="clOpts" style="display:flex; flex-direction:column; gap:10px; margin:16px 0;">
          ${q.opts.map((o, i) => `
            <button class="cl-opt sg-btn" data-i="${i}" style="
              padding: 12px 18px; font-family: STKaiti, serif; font-size: 18px;
              background: linear-gradient(135deg, #2a4068, #1a2848);
              color: #e8f0ff; border: 2px solid #6c92c8; cursor: pointer;
              text-align: left;
            ">${'甲乙丙'[i]}、${o}</button>
          `).join('')}
        </div>
        <div class="sg-actions">
          <button id="clClose" class="sg-btn ghost">退出</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.cl-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = parseInt(btn.dataset.i);
        const ok = choice === q.ans;
        if (ok) correct += 1;
        log.push({ q: q.prompt, ok, ans: q.opts[q.ans], chose: q.opts[choice] });
        btn.style.background = ok ? 'linear-gradient(135deg, #2a6e3a, #14401a)' : 'linear-gradient(135deg, #6e2a2a, #401414)';
        idx += 1;
        if (idx >= pool.length) setTimeout(finalize, 700);
        else setTimeout(renderQ, 800);
      });
    });
    document.getElementById('clClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let outcome, msg, prize, verb;
    if (correct === 3) {
      outcome = 'perfect';
      msg = `📚 三题全中! 大儒抚须曰: "孺子可教."`;
      prize = Math.random() < 0.5 ? 'whole_tang' : 'tang_poems';
      verb = '亲笔签赠';
    } else if (correct === 2) {
      outcome = 'win';
      msg = `📚 三题中二 — 大儒颔首: "尚可."`;
      prize = Math.random() < 0.5 ? 'brush_huzhou' : 'inkstone_duan';
      verb = '赠你';
    } else {
      outcome = 'lose';
      msg = `📚 略输文采 — 大儒摇头, 取一卷打油诗予君以勉.`;
      prize = 'doggerel';
      verb = '塞给你';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c2638 0%, #0a0e18 80%);
        border: 2px solid #6c92c8; min-width: 500px; max-width: 640px;
      ">
        <div class="sg-title" style="color: #d8e6ff;">📚 论经 · 结算</div>
        <div class="sg-result ${outcome === 'lose' ? 'lose' : 'win'}" style="color:#e0f0ff; margin:16px 0;">${msg}</div>
        <div style="font-family: STKaiti, serif; font-size: 14px; color: #a8bcd8; line-height: 1.9; text-align:left; padding: 0 16px;">
          ${log.map((l, i) => `<div>${i + 1}. ${l.ok ? '✓' : '✗'} ${l.q} <span style="color:#88c0ff;">${l.ans}</span></div>`).join('')}
        </div>
        <div class="sg-actions" style="margin-top:18px;">
          <button id="clAgain" class="sg-btn ghost">再考三题</button>
          <button id="clEnd" class="sg-btn">退出</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb });
    }, 500);
    document.getElementById('clAgain').addEventListener('click', () => startClassics(npc));
    document.getElementById('clEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  renderQ();
}
// 本地数组打乱 (避免污染全局)
function ARRAY_SHUFFLE_LOCAL(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


/* ============================================================
 *  Round 3 mini · 击鞠 (Polo) — 马球场 司礼官 专属
 *  3 击, 每击选 1 种打法 (平直/弧线/旋切), 不同打法不同进门概率.
 *  3 进 = perfect → 东海明珠; 2 进 = win → 西凉镜; ≤1 = lose → 葡萄酒
 * ============================================================ */
const POLO_STYLES = [
  { id: 'flat',  label: '➡️ 平直推射', sub: '稳, 进门率适中',     prob: 0.5  },
  { id: 'arc',   label: '🌙 弧线吊门', sub: '神技, 进门率高',     prob: 0.7  },
  { id: 'spin',  label: '🌀 旋切偏门', sub: '炫, 进门率低 但奇',  prob: 0.3  },
];

function startPolo(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '司礼官';
  let shots = 0, goals = 0;
  const log = [];
  const renderRound = () => {
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c2a14 0%, #0a1208 80%);
        box-shadow: 0 0 60px rgba(168, 220, 120, 0.32), inset 0 0 40px rgba(100, 150, 70, 0.18);
        border: 2px solid #88a050; min-width: 500px; max-width: 620px;
      ">
        <div class="sg-title" style="color: #e0f0a8;">🐎 击鞠 · ${who}</div>
        <div class="sg-sub" style="color: #c8e090;">第 <b style="color:#a0d870;">${shots + 1}</b> / 3 击 · 入门 <b style="color:#ffd870;">${goals}</b></div>
        <div style="margin: 14px 0; font-family: STKaiti, serif; color: #e8f0c0;">${log.length ? '上一击: ' + log[log.length - 1] : '请君选打法'}</div>
        <div id="poStyles" style="display:flex; flex-direction:column; gap:10px; margin:16px 0;">
          ${POLO_STYLES.map(s => `
            <button class="po-style sg-btn" data-id="${s.id}" style="
              padding: 12px 16px; font-family: STKaiti, serif; font-size: 17px;
              background: linear-gradient(135deg, #3a5818, #1a2808);
              color: #e8f0a8; border: 2px solid #88a050; cursor: pointer;
              text-align: left;
            ">
              ${s.label}
              <span style="display:block; font-size:13px; opacity:0.85; margin-top:4px; color:#b8d068;">${s.sub}</span>
            </button>
          `).join('')}
        </div>
        <div class="sg-actions">
          <button id="poClose" class="sg-btn ghost">退出球场</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.po-style').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = POLO_STYLES.find(s => s.id === btn.dataset.id);
        const ok = Math.random() < style.prob;
        if (ok) goals += 1;
        log.push(ok ? `🎯 ${style.label} → 入门!` : `💢 ${style.label} → 偏出`);
        shots += 1;
        if (shots >= 3) setTimeout(finalize, 600);
        else setTimeout(renderRound, 600);
      });
    });
    document.getElementById('poClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let outcome, msg, prize, verb;
    if (goals === 3) {
      outcome = 'perfect';
      msg = `🐎 三击三入! 司礼官惊呼: "击鞠之圣手也!"`;
      prize = 'pearl';
      verb = '奉你';
    } else if (goals === 2) {
      outcome = 'win';
      msg = `🐎 三击二入 — 司礼官鼓掌: "技艺娴熟."`;
      prize = Math.random() < 0.5 ? 'western_mirror' : 'shu_brocade';
      verb = '赠你';
    } else {
      outcome = 'lose';
      msg = `🐎 三击仅入 ${goals} — 司礼官摇头, 取酒一壶聊解郁结.`;
      prize = 'grape_wine';
      verb = '塞给你';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c2a14 0%, #0a1208 80%);
        border: 2px solid #88a050; min-width: 500px; max-width: 600px;
      ">
        <div class="sg-title" style="color: #e0f0a8;">🐎 击鞠 · 结算</div>
        <div class="sg-result ${outcome === 'lose' ? 'lose' : 'win'}" style="color:#e8f0c0; margin:16px 0;">${msg}</div>
        <div style="font-family: STKaiti, serif; font-size: 14px; color: #b0c870; line-height: 1.8;">
          ${log.map((l, i) => `${i + 1}. ${l}<br/>`).join('')}
        </div>
        <div class="sg-actions" style="margin-top:18px;">
          <button id="poAgain" class="sg-btn ghost">再战三击</button>
          <button id="poEnd" class="sg-btn">退出</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb });
    }, 500);
    document.getElementById('poAgain').addEventListener('click', () => startPolo(npc));
    document.getElementById('poEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  renderRound();
}


/* ============================================================
 *  Round 3 mini · 抽签 (Fortune) — 玄都观 玄都老道 专属
 *  摇签筒, 出 1 签 (5 档加权随机), 每档对应 1 句解签词 + 1 件奖励.
 *  上上签(10%) → 进士印; 上签(20%) → 吴道子真迹/poet_token; 中签(40%) → 龙井香囊;
 *  下签(20%) → 清茗; 下下签(10%) → 路人一笑.
 * ============================================================ */
const FORTUNE_DRAWS = [
  { tier: '上上签', weight: 10, color: '#ffd870', text: '紫微在上, 文运大开 — 此岁必有功名加身.', prize: 'exam_seal',   verb: '亲手赠你', outcome: 'perfect' },
  { tier: '上签',   weight: 20, color: '#a0f0b8', text: '日月运行, 风云际会 — 心愿可成, 阻路皆消.', prize: 'wu_zi_painting', verb: '奉你',     outcome: 'win'     },
  { tier: '上签',   weight: 10, color: '#a0f0b8', text: '紫气东来, 贵人相助 — 名声远播, 此为吉兆.', prize: 'poet_token',  verb: '赠你',     outcome: 'win'     },
  { tier: '中签',   weight: 35, color: '#d8d8d8', text: '阴阳平和, 进退两宜 — 安守本分, 自有清福.', prize: 'fragrance_pouch', verb: '塞给你', outcome: 'draw'    },
  { tier: '下签',   weight: 20, color: '#a0b0c0', text: '云遮日色, 暂避锋芒 — 静心修身, 三月后吉.', prize: 'green_tea',   verb: '安慰你',   outcome: 'lose'    },
  { tier: '下下签', weight:  5, color: '#806878', text: '霜降秋寒, 万物潜藏 — 切勿冒进, 守一笑泯之.', prize: 'smile',       verb: '只能给你', outcome: 'lose'    },
];

function drawFortune() {
  const total = FORTUNE_DRAWS.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of FORTUNE_DRAWS) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return FORTUNE_DRAWS[FORTUNE_DRAWS.length - 1];
}

function startFortune(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '玄都老道';
  let shaking = false;
  const renderRoll = () => {
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #281c30 0%, #0c0810 80%);
        box-shadow: 0 0 60px rgba(216, 184, 255, 0.32), inset 0 0 40px rgba(140, 110, 180, 0.18);
        border: 2px solid #b08aff; min-width: 480px; max-width: 600px;
      ">
        <div class="sg-title" style="color: #e8d8ff;">🎴 抽签 · ${who}</div>
        <div class="sg-sub" style="color: #c8b0e8;">合掌摇签筒, 一签定乾坤</div>
        <div id="fortuneTube" style="
          margin: 28px auto; width: 110px; height: 180px;
          background: linear-gradient(180deg, #5a3a18, #2a1808);
          border-radius: 12px; border: 3px solid #c98a3a;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 18px; box-shadow: inset 0 0 16px #000;
          transition: transform 0.2s;
        ">
          <div style="
            width: 6px; height: 80px; background: linear-gradient(180deg, #e8e0c8, #b8a880);
            border-radius: 3px; margin: 0 3px;
          "></div>
          <div style="
            width: 6px; height: 80px; background: linear-gradient(180deg, #e8e0c8, #b8a880);
            border-radius: 3px; margin: 0 3px;
          "></div>
          <div style="
            width: 6px; height: 80px; background: linear-gradient(180deg, #e8e0c8, #b8a880);
            border-radius: 3px; margin: 0 3px;
          "></div>
        </div>
        <div id="fortuneResult" style="
          min-height: 80px; padding: 12px;
          font-family: STKaiti, serif; color: #e8d8ff; font-size: 16px;
        ">— 请摇签 —</div>
        <div class="sg-actions">
          <button id="ftShake" class="sg-btn" style="background: linear-gradient(135deg, #6e4884, #3a2048); color: #ffd890;">🎴 摇签筒</button>
          <button id="ftClose" class="sg-btn ghost">退出道观</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    document.getElementById('ftShake').addEventListener('click', () => {
      if (shaking) return;
      shaking = true;
      const tube = document.getElementById('fortuneTube');
      const res = document.getElementById('fortuneResult');
      res.textContent = '🌀 签筒摇动, 风云变幻...';
      let n = 0;
      const shake = setInterval(() => {
        tube.style.transform = `rotate(${(n % 2 === 0 ? -1 : 1) * 8}deg) translateY(${n % 2 === 0 ? -4 : 4}px)`;
        n += 1;
        if (n > 8) {
          clearInterval(shake);
          tube.style.transform = 'none';
          const draw = drawFortune();
          finalize(draw);
        }
      }, 110);
    });
    document.getElementById('ftClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = (draw) => {
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #281c30 0%, #0c0810 80%);
        box-shadow: 0 0 80px ${draw.color}66;
        border: 2px solid ${draw.color}; min-width: 500px; max-width: 600px;
      ">
        <div class="sg-title" style="color: ${draw.color};">${draw.tier} · ${who}</div>
        <div style="
          margin: 24px auto; width: 90px; height: 160px;
          background: linear-gradient(180deg, ${draw.color}, ${draw.color}88);
          border-radius: 8px; border: 3px solid #c98a3a;
          display: flex; align-items: center; justify-content: center;
          font-family: STKaiti, serif; font-size: 36px; color: #1c0c1c;
          text-shadow: 0 1px 4px rgba(255,255,255,0.4);
          box-shadow: 0 0 32px ${draw.color};
        ">${draw.tier[0]}${draw.tier[1] || ''}</div>
        <div style="
          font-family: STKaiti, serif; font-size: 17px; color: #e8d8ff;
          line-height: 1.8; margin: 18px 24px; text-align: center;
        ">"${draw.text}"</div>
        <div class="sg-actions" style="margin-top:14px;">
          <button id="ftAgain" class="sg-btn ghost">再求一签</button>
          <button id="ftEnd" class="sg-btn">辞别老道</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (typeof grantItemById === 'function') grantItemById(draw.prize, npc, { verb: draw.verb });
    }, 500);
    document.getElementById('ftAgain').addEventListener('click', () => { shaking = false; startFortune(npc); });
    document.getElementById('ftEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  renderRoll();
}


/* ============================================================
 *  Round 4 mini · 通译 (Tongyi / Foreign Tongue) — 鸿胪寺 卿 专属
 *  5 国问候语 + 5 国旗号, 给定外语听到的, 选对应国家. 3 局答对 ≥2 → 通译牌, 否则夜光杯/西凉镜.
 * ============================================================ */
const TONGYI_BANK = [
  { country: '吐蕃',   flag: '🏔', sound: 'བཀྲ་ཤིས་བདེ་ལེགས། (扎西德勒)',           options: ['新罗', '吐蕃', '日本', '大食'], a: 1 },
  { country: '新罗',   flag: '🌅', sound: '안녕하십니까 (按宁哈西尼吉)',              options: ['新罗', '波斯', '吐蕃', '大食'], a: 0 },
  { country: '日本',   flag: '⛩', sound: 'おはようございます (おはよ — 早安)',       options: ['新罗', '吐蕃', '日本', '波斯'], a: 2 },
  { country: '大食',   flag: '🐪', sound: 'السلام عليكم (As-salāmu ʿalaykum)',       options: ['波斯', '大食', '吐蕃', '新罗'], a: 1 },
  { country: '波斯',   flag: '🔥', sound: 'درود بر شما (Drood bar shoma)',          options: ['大食', '吐蕃', '波斯', '日本'], a: 2 },
];
function startTongyi(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '鸿胪寺卿';
  // 抽 3 题
  const pool = TONGYI_BANK.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  let idx = 0, correct = 0;
  const render = () => {
    const q = pool[idx];
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #2a1c0e 0%, #0c0806 80%);
        box-shadow: 0 0 60px rgba(252, 216, 122, 0.28);
        border: 2px solid #c98a3a; min-width: 480px; max-width: 620px;
      ">
        <div class="sg-title" style="color: #fcd87a;">🌐 通译 · ${who}</div>
        <div class="sg-sub" style="color: #e0c890;">第 ${idx + 1} / 3 局 — 听番邦使节问候, 判其国别</div>
        <div style="
          margin: 24px 24px 16px;
          padding: 22px;
          background: linear-gradient(135deg, #3a2a18, #1c1408);
          border: 1px solid #c98a3a; border-radius: 14px;
          font-family: STKaiti, serif; color: #ffd890;
          font-size: 20px; text-align: center; line-height: 1.7;
        ">
          <div style="font-size: 40px;">${q.flag}</div>
          <div style="margin-top: 12px; opacity: 0.85;">"${q.sound}"</div>
        </div>
        <div class="sg-actions" style="flex-direction: column; gap: 10px; padding: 0 24px;">
          ${q.options.map((opt, i) => `<button class="sg-btn opt" data-opt="${i}" style="
            background: linear-gradient(135deg, #6e3a1a, #2e1a0a); color: #ffd890; width: 100%;
          ">${opt}</button>`).join('')}
        </div>
        <div style="text-align: center; padding: 14px;">
          <button id="tyClose" class="sg-btn ghost">退出鸿胪寺</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const sel = parseInt(b.dataset.opt, 10);
      const isCorrect = sel === q.a;
      if (isCorrect) correct += 1;
      b.style.background = isCorrect ? 'linear-gradient(135deg, #50a060, #205020)' : 'linear-gradient(135deg, #a04040, #501818)';
      overlay.querySelectorAll('.opt').forEach(x => x.disabled = true);
      // 标记正确答案
      const cb = overlay.querySelector(`.opt[data-opt="${q.a}"]`);
      if (cb && !isCorrect) cb.style.background = 'linear-gradient(135deg, #50a060, #205020)';
      setTimeout(() => {
        idx += 1;
        if (idx < 3) render(); else finalize();
      }, 1100);
    }));
    document.getElementById('tyClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let prize, verb, color, msg;
    if (correct === 3) {
      prize = 'tongyi_token'; verb = '亲手赠你'; color = '#fcd87a';
      msg = '通译之艺, 已得九成! 此牌可凭以入鸿胪寺及外蕃馆.';
    } else if (correct === 2) {
      prize = 'yeguang_cup';  verb = '赠你'; color = '#a0e0ff';
      msg = '尚算有缘. 此夜光琉璃杯, 大食所贡, 持之宴客可显风度.';
    } else if (correct === 1) {
      prize = 'persian_glass'; verb = '塞给你'; color = '#d8b8ff';
      msg = '通译之路尚远. 这瓶波斯香露, 聊以慰之.';
    } else {
      prize = 'smile'; verb = '只给你'; color = '#d8d8d8';
      msg = '番邦之言, 非一日可通. 来年再战, 必有所得.';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #2a1c0e 0%, #0c0806 80%);
        box-shadow: 0 0 80px ${color}44; border: 2px solid ${color};
        min-width: 480px; max-width: 600px;
      ">
        <div class="sg-title" style="color: ${color};">${correct} / 3 · ${who}</div>
        <div style="font-family: STKaiti, serif; font-size: 17px; color: #f0e0c0;
          line-height: 1.8; margin: 20px 24px; text-align: center;">${msg}</div>
        <div class="sg-actions">
          <button id="tyAgain" class="sg-btn ghost">再来一局</button>
          <button id="tyEnd" class="sg-btn">辞别寺卿</button>
        </div>
      </div>
    `;
    setTimeout(() => { if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb }); }, 500);
    document.getElementById('tyAgain').addEventListener('click', () => startTongyi(npc));
    document.getElementById('tyEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  render();
}


/* ============================================================
 *  Round 4 mini · 译经 (Yi Jing / Foreign Script) — 西明胡寺 大秦景净 专属
 *  3 个 胡文符号 (Syriac/Pahlavi/Sogdian), 选中文对应义. 答对 ≥2 → 景教经卷.
 * ============================================================ */
const YIJING_BANK = [
  // 叙利亚文 (景教经卷常用)
  { sym: '☩', hint: '大秦景教 — 镶莲花的 十字',         options: ['火神', '十字', '日月', '星辰'], a: 1 },
  // 摩尼教 日月双光符号
  { sym: '☼☽', hint: '摩尼教 — 日月双光',                 options: ['弓与剑', '日与月', '风与水', '山与川'], a: 1 },
  // 祆教 火坛
  { sym: '🔥', hint: '祆教 — 永燃之火 (Atash)',           options: ['烈火崇拜', '日出朝拜', '云山仰望', '凡心荡涤'], a: 0 },
  // 大食 星月
  { sym: '☪', hint: '大食 — 星月新教',                     options: ['星月信仰', '佛陀真容', '飞天舞女', '太极图说'], a: 0 },
  // 婆罗门 卐
  { sym: '卍', hint: '天竺婆罗门 — 吉祥纹',                options: ['凶煞', '日轮', '吉祥', '幻象'], a: 2 },
];
function startYijing(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '大秦景净';
  const pool = YIJING_BANK.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  let idx = 0, correct = 0;
  const render = () => {
    const q = pool[idx];
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #28201c 0%, #0c0808 80%);
        box-shadow: 0 0 60px rgba(255, 220, 180, 0.22);
        border: 2px solid #d4b88a; min-width: 460px; max-width: 600px;
      ">
        <div class="sg-title" style="color: #fff0d8;">✝ 译经 · ${who}</div>
        <div class="sg-sub" style="color: #e0c8a0;">第 ${idx + 1} / 3 卷 — 释胡文符号, 通其义</div>
        <div style="
          margin: 24px 24px 8px;
          padding: 24px;
          background: linear-gradient(135deg, #3a2a1a, #1a1208);
          border: 1px solid #d4b88a; border-radius: 14px;
          text-align: center;
        ">
          <div style="font-size: 64px; line-height: 1; color: #ffd890; text-shadow: 0 0 16px #fcd87a;">${q.sym}</div>
          <div style="margin-top: 12px; font-family: STKaiti, serif; color: #e8d8b0; font-size: 14px;">${q.hint}</div>
        </div>
        <div class="sg-actions" style="flex-direction: column; gap: 10px; padding: 0 24px;">
          ${q.options.map((opt, i) => `<button class="sg-btn opt" data-opt="${i}" style="
            background: linear-gradient(135deg, #5a3a28, #2a1a0a); color: #fff0d8; width: 100%;
          ">${opt}</button>`).join('')}
        </div>
        <div style="text-align: center; padding: 14px;">
          <button id="yjClose" class="sg-btn ghost">退出胡寺</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const sel = parseInt(b.dataset.opt, 10);
      const isCorrect = sel === q.a;
      if (isCorrect) correct += 1;
      b.style.background = isCorrect ? 'linear-gradient(135deg, #50a060, #205020)' : 'linear-gradient(135deg, #a04040, #501818)';
      overlay.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const cb = overlay.querySelector(`.opt[data-opt="${q.a}"]`);
      if (cb && !isCorrect) cb.style.background = 'linear-gradient(135deg, #50a060, #205020)';
      setTimeout(() => {
        idx += 1;
        if (idx < 3) render(); else finalize();
      }, 1100);
    }));
    document.getElementById('yjClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let prize, verb, color, msg;
    if (correct === 3) {
      prize = 'jingjiao_scroll'; verb = '郑重赠你'; color = '#fff0d8';
      msg = '善哉! 此卷《大秦景教三威蒙度赞》, 译笔之精, 与天竺、波斯、汉文皆通.';
    } else if (correct === 2) {
      prize = 'persian_glass'; verb = '赠你'; color = '#d8b8ff';
      msg = '尚通胡义. 此瓶波斯香露, 异域之香, 可带与友人.';
    } else if (correct === 1) {
      prize = 'doggerel'; verb = '赠你'; color = '#a0b0c0';
      msg = '胡文之难, 一二识之即可. 此卷打油诗, 聊作纪念.';
    } else {
      prize = 'smile'; verb = '只能给你'; color = '#d8d8d8';
      msg = '胡文非一时可通. 多观经卷, 多听番邦. 三月后再来.';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #28201c 0%, #0c0808 80%);
        box-shadow: 0 0 80px ${color}44; border: 2px solid ${color};
        min-width: 460px; max-width: 600px;
      ">
        <div class="sg-title" style="color: ${color};">${correct} / 3 · ${who}</div>
        <div style="font-family: STKaiti, serif; font-size: 17px; color: #f0e0c0;
          line-height: 1.8; margin: 20px 24px; text-align: center;">${msg}</div>
        <div class="sg-actions">
          <button id="yjAgain" class="sg-btn ghost">再译一卷</button>
          <button id="yjEnd" class="sg-btn">辞别景净</button>
        </div>
      </div>
    `;
    setTimeout(() => { if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb }); }, 500);
    document.getElementById('yjAgain').addEventListener('click', () => startYijing(npc));
    document.getElementById('yjEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  render();
}


/* ============================================================
 *  Round 4 mini · 望闻问切 (Wenzhen / Diagnose) — 太医署 太医博士 专属
 *  3 个 病案, 给症状, 选正确药方. 答对 ≥2 → 灵丹 + 心境.
 * ============================================================ */
const WENZHEN_BANK = [
  { case: '风寒头痛', sym: '症见: 恶寒发热, 头疼如裂, 鼻塞流清涕, 舌淡苔薄白, 脉浮紧.',
    options: ['麻黄汤 (发汗解表)', '黄连解毒 (清热泻火)', '四物汤 (补血养肝)', '六味地黄 (滋肾阴)'], a: 0 },
  { case: '阴虚火旺', sym: '症见: 五心烦热, 盗汗失眠, 口干咽燥, 舌红少苔, 脉细数.',
    options: ['麻黄汤 (发汗解表)', '六味地黄丸 (滋阴降火)', '附子理中 (温阳救逆)', '小柴胡 (和解少阳)'], a: 1 },
  { case: '气虚乏力', sym: '症见: 倦怠无力, 少气懒言, 食欲不振, 舌淡胖, 脉弱无力.',
    options: ['白虎汤 (清热生津)', '麻黄汤 (发汗解表)', '四君子汤 (补气健脾)', '桃核承气 (活血祛瘀)'], a: 2 },
  { case: '湿热下注', sym: '症见: 下肢沉重, 阴部潮湿, 小便短黄, 舌苔黄腻, 脉滑数.',
    options: ['四神汤 (温肾止泻)', '黄柏龙胆泻肝 (清利湿热)', '人参补气 (益气固表)', '小建中 (温中补虚)'], a: 1 },
  { case: '心血不足', sym: '症见: 心悸怔忡, 失眠多梦, 健忘头晕, 面色无华, 脉细.',
    options: ['白虎汤 (清热生津)', '归脾汤 (益气补血)', '麻杏石甘 (宣肺平喘)', '安宫牛黄 (清热开窍)'], a: 1 },
];
function startWenzhen(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '太医博士';
  const pool = WENZHEN_BANK.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  let idx = 0, correct = 0;
  const render = () => {
    const q = pool[idx];
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c281c 0%, #060c08 80%);
        box-shadow: 0 0 60px rgba(160, 224, 160, 0.20);
        border: 2px solid #a0e0a0; min-width: 480px; max-width: 640px;
      ">
        <div class="sg-title" style="color: #a0e0a0;">💊 望闻问切 · ${who}</div>
        <div class="sg-sub" style="color: #c0e8c0;">第 ${idx + 1} / 3 案 — 辨证施治, 配伍得当则病退</div>
        <div style="
          margin: 24px 24px 12px;
          padding: 18px 20px;
          background: linear-gradient(135deg, #1e3a2a, #0a1a0e);
          border-left: 4px solid #50a060;
          border-radius: 8px;
          font-family: STKaiti, serif; color: #e0f0e0; line-height: 1.8;
        ">
          <div style="color: #ffd890; font-weight: bold; margin-bottom: 8px;">病案: ${q.case}</div>
          <div style="font-size: 15px;">${q.sym}</div>
        </div>
        <div class="sg-actions" style="flex-direction: column; gap: 10px; padding: 0 24px;">
          ${q.options.map((opt, i) => `<button class="sg-btn opt" data-opt="${i}" style="
            background: linear-gradient(135deg, #2e5a40, #102818); color: #e0f0e0; width: 100%; text-align: left; padding: 12px 16px;
          ">${opt}</button>`).join('')}
        </div>
        <div style="text-align: center; padding: 14px;">
          <button id="wzClose" class="sg-btn ghost">退出太医署</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const sel = parseInt(b.dataset.opt, 10);
      const isCorrect = sel === q.a;
      if (isCorrect) correct += 1;
      b.style.background = isCorrect ? 'linear-gradient(135deg, #50a060, #205020)' : 'linear-gradient(135deg, #a04040, #501818)';
      overlay.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const cb = overlay.querySelector(`.opt[data-opt="${q.a}"]`);
      if (cb && !isCorrect) cb.style.background = 'linear-gradient(135deg, #50a060, #205020)';
      setTimeout(() => {
        idx += 1;
        if (idx < 3) render(); else finalize();
      }, 1300);
    }));
    document.getElementById('wzClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let prize, verb, color, msg;
    if (correct === 3) {
      prize = 'ling_dan'; verb = '亲手研制赠你'; color = '#a0e0a0';
      msg = '医道精进! 此颗灵丹, 服之可补元气、定心神, 持身行远不疲.';
    } else if (correct === 2) {
      prize = 'fragrance_pouch'; verb = '赠你'; color = '#c8e8c0';
      msg = '配伍尚可. 此龙井香囊, 提神醒脑, 也算太医署一缕馨香.';
    } else if (correct === 1) {
      prize = 'green_tea'; verb = '赠你'; color = '#a0b8a0';
      msg = '医道之精, 在乎辨证. 这一盏清茗, 先静心读《本草》.';
    } else {
      prize = 'smile'; verb = '只能给你'; color = '#d8d8d8';
      msg = '医者父母心 — 望君再来求学, 太医署门常开.';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #1c281c 0%, #060c08 80%);
        box-shadow: 0 0 80px ${color}44; border: 2px solid ${color};
        min-width: 480px; max-width: 600px;
      ">
        <div class="sg-title" style="color: ${color};">${correct} / 3 · ${who}</div>
        <div style="font-family: STKaiti, serif; font-size: 17px; color: #e0f0e0;
          line-height: 1.8; margin: 20px 24px; text-align: center;">${msg}</div>
        <div class="sg-actions">
          <button id="wzAgain" class="sg-btn ghost">再诊一案</button>
          <button id="wzEnd" class="sg-btn">辞别博士</button>
        </div>
      </div>
    `;
    setTimeout(() => { if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb }); }, 500);
    document.getElementById('wzAgain').addEventListener('click', () => startWenzhen(npc));
    document.getElementById('wzEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  render();
}


/* ============================================================
 *  Round 4 mini · 观象 (Guanxiang / Star Reading) — 司天监 司天少监 专属
 *  3 道 星象题: 给天文现象 / 星宿名, 选其分野或寓意. 答对 ≥2 → 司天星图.
 * ============================================================ */
const GUANXIANG_BANK = [
  { sym: '🌌', q: '北辰之星 (北极星) 主何方?', options: ['四方之中, 帝王所居', '南极星座, 寿命主', '东方青龙, 春之始', '西方白虎, 秋之肃'], a: 0 },
  { sym: '🌠', q: '天狼星出, 主何征兆?', options: ['丰收年景', '兵戈之事 (西方边事)', '后宫安泰', '士子登科'], a: 1 },
  { sym: '🌕', q: '太白经天 (金星白昼可见), 古谓主何事?', options: ['女主当政或兵革之变', '雨水充沛之兆', '帝王长寿', '邦交友好'], a: 0 },
  { sym: '🌟', q: '"七月流火" 之 "火" 指何星?', options: ['火星 (荧惑)', '太阳', '心宿二 (大火)', '北斗第三星'], a: 2 },
  { sym: '✨', q: '紫微垣 与 太微垣, 各代表何处?', options: ['紫微 = 皇宫, 太微 = 朝堂', '紫微 = 边塞, 太微 = 长安', '紫微 = 后宫, 太微 = 民间', '紫微 = 江南, 太微 = 漠北'], a: 0 },
  { sym: '☄', q: '彗星 (扫帚星) 出现, 古书谓?', options: ['吉兆, 主丰年', '凶兆, 主除旧布新 (改朝换代)', '帝王长寿', '士子高中'], a: 1 },
];
function startGuanxiang(npc) {
  const overlay = document.getElementById('streetGame');
  if (!overlay) return;
  const who = (npc && npc.userData.npcLabel) || '司天少监';
  const pool = GUANXIANG_BANK.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  let idx = 0, correct = 0;
  const render = () => {
    const q = pool[idx];
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #0c1428 0%, #04080c 80%);
        box-shadow: 0 0 60px rgba(160, 192, 255, 0.22);
        border: 2px solid #a0c0ff; min-width: 480px; max-width: 640px;
      ">
        <div class="sg-title" style="color: #a0c0ff;">🔭 观象 · ${who}</div>
        <div class="sg-sub" style="color: #c0d8ff;">第 ${idx + 1} / 3 题 — 二十八宿之分野, 天人感应之验</div>
        <div style="
          margin: 24px 24px 12px;
          padding: 24px;
          background: linear-gradient(135deg, #1a2848, #08101c);
          border-radius: 12px;
          text-align: center;
        ">
          <div style="font-size: 50px; line-height: 1;">${q.sym}</div>
          <div style="margin-top: 12px; font-family: STKaiti, serif;
            color: #e0e8ff; font-size: 17px; line-height: 1.6;">${q.q}</div>
        </div>
        <div class="sg-actions" style="flex-direction: column; gap: 10px; padding: 0 24px;">
          ${q.options.map((opt, i) => `<button class="sg-btn opt" data-opt="${i}" style="
            background: linear-gradient(135deg, #2a3c64, #0a1424); color: #e0e8ff; width: 100%; text-align: left; padding: 12px 16px;
          ">${opt}</button>`).join('')}
        </div>
        <div style="text-align: center; padding: 14px;">
          <button id="gxClose" class="sg-btn ghost">退出司天监</button>
        </div>
      </div>
    `;
    overlay.classList.add('show');
    overlay.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const sel = parseInt(b.dataset.opt, 10);
      const isCorrect = sel === q.a;
      if (isCorrect) correct += 1;
      b.style.background = isCorrect ? 'linear-gradient(135deg, #50a060, #205020)' : 'linear-gradient(135deg, #a04040, #501818)';
      overlay.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const cb = overlay.querySelector(`.opt[data-opt="${q.a}"]`);
      if (cb && !isCorrect) cb.style.background = 'linear-gradient(135deg, #50a060, #205020)';
      setTimeout(() => {
        idx += 1;
        if (idx < 3) render(); else finalize();
      }, 1300);
    }));
    document.getElementById('gxClose').addEventListener('click', () => overlay.classList.remove('show'));
  };
  const finalize = () => {
    let prize, verb, color, msg;
    if (correct === 3) {
      prize = 'tianwen_map'; verb = '亲手摹本赠你'; color = '#a0c0ff';
      msg = '观象通天! 此司天星图, 二十八宿、三垣分野, 凭之可议天人之际.';
    } else if (correct === 2) {
      prize = 'whole_tang'; verb = '赠你'; color = '#c0d8ff';
      msg = '尚识星象. 此《全唐诗》中, 多有观象之句, 可对照星图细玩.';
    } else if (correct === 1) {
      prize = 'inkstone_duan'; verb = '赠你'; color = '#a8b8d8';
      msg = '观象需积年累月. 此端州歙砚, 持之记录星变, 也是司天之业.';
    } else {
      prize = 'smile'; verb = '只能给你'; color = '#d8d8d8';
      msg = '天文渺远, 非一夜可通. 司天监夜夜有人, 君可常来.';
    }
    overlay.innerHTML = `
      <div class="sg-card" style="
        background: radial-gradient(circle at 30% 0%, #0c1428 0%, #04080c 80%);
        box-shadow: 0 0 80px ${color}44; border: 2px solid ${color};
        min-width: 480px; max-width: 600px;
      ">
        <div class="sg-title" style="color: ${color};">${correct} / 3 · ${who}</div>
        <div style="font-family: STKaiti, serif; font-size: 17px; color: #e0e8ff;
          line-height: 1.8; margin: 20px 24px; text-align: center;">${msg}</div>
        <div class="sg-actions">
          <button id="gxAgain" class="sg-btn ghost">再观一象</button>
          <button id="gxEnd" class="sg-btn">辞别少监</button>
        </div>
      </div>
    `;
    setTimeout(() => { if (typeof grantItemById === 'function') grantItemById(prize, npc, { verb }); }, 500);
    document.getElementById('gxAgain').addEventListener('click', () => startGuanxiang(npc));
    document.getElementById('gxEnd').addEventListener('click', () => overlay.classList.remove('show'));
  };
  render();
}


function findNearestNpcForPlayer() {
  if (!gameState.player) return null;
  if (allNpcs.length === 0) collectAllNpcs();
  let best = null, bestD = Infinity;
  const px = gameState.pos.x, pz = gameState.pos.z;
  for (const n of allNpcs) {
    if (!n.visible) continue;
    const dx = n.position.x - px, dz = n.position.z - pz;
    const d = Math.hypot(dx, dz);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (bestD > 3.2) return null;
  return best;
}

function updateGame(dt) {
  if (!gameState.active || !gameState.player) return;
  // FPS / Gallery 模式不在此处更新位置（由 updateFps / updateGallery 负责）
  if (gameState.viewMode !== 'tps') return;

  // 输入 → 速度
  const k = gameState.inputKeys;
  const sp = gameState.speed * (k.shift ? 1.7 : 1);
  let vx = 0, vz = 0;
  if (k.w) vz -= 1;
  if (k.s) vz += 1;
  if (k.a) vx -= 1;
  if (k.d) vx += 1;
  // 自动寻路: 若 autoWalk 目标设置, 且玩家没有按方向键 → 朝目标移动
  if (gameState.autoWalk && !(vx || vz)) {
    const aw = gameState.autoWalk;
    const ddx = aw.x - gameState.pos.x, ddz = aw.z - gameState.pos.z;
    const dist = Math.hypot(ddx, ddz);
    if (dist < 1.4) {
      // 到达
      if (typeof showGameToast === 'function') showGameToast(`已到达 · ${aw.label}`, 1500);
      // 通知周引之
      if (typeof emitTourContext === 'function') {
        emitTourContext(
          'arrive:' + aw.label,
          `[场景提示] 玩家循着你指引到了"${aw.label}"，正眼前张望。请用一段连贯讲解（60-110 字, 不换行）介绍此处的来历、风物与逸事。`,
          { debounceMs: 4000 },
        );
      }
      gameState.autoWalk = null;
    } else {
      vx = ddx / dist; vz = ddz / dist;
      gameState.facing = Math.atan2(vx, vz);
    }
  } else if (vx || vz) {
    const mag = Math.hypot(vx, vz);
    vx /= mag; vz /= mag;
    gameState.facing = Math.atan2(vx, vz);
    // 玩家主动操作 → 取消自动寻路 (尊重玩家输入)
    if (gameState.autoWalk) gameState.autoWalk = null;
  }
  // 应用速度（dialog 中冻结）
  if (!gameState.dialogActive) {
    gameState.pos.x += vx * sp * dt;
    gameState.pos.z += vz * sp * dt;
    // 边界裁剪 (-58..58, -98..58)
    gameState.pos.x = Math.max(-58, Math.min(58, gameState.pos.x));
    gameState.pos.z = Math.max(-98, Math.min(58, gameState.pos.z));
  }
  gameState.player.position.copy(gameState.pos);
  gameState.player.position.y = 0.05 + Math.abs(Math.sin(elapsed * 6)) * (vx || vz ? 0.08 : 0.02);
  gameState.player.rotation.y = gameState.facing + Math.PI;
  // 暴露当前移动速度给 GLB 动画状态机 (autoAnimateState 用)
  gameState.player.userData = gameState.player.userData || {};
  gameState.player.userData._lastSpeed = (vx || vz) ? sp : 0;

  // 区划/地标跟踪 → 越过边界时通知周引之
  if (typeof emitTourContext === 'function') {
    const p = gameState.pos;
    let district = null;
    if      (p.x >  18 && p.x <  60 && p.z > -10 && p.z <  18) district = '东市';
    else if (p.x < -18 && p.x > -60 && p.z > -10 && p.z <  18) district = '西市';
    else if (p.x > -10 && p.x <  10 && p.z > -90 && p.z < -40) district = '大明宫前';
    else if (p.x > -10 && p.x <  10 && p.z >  -8 && p.z <  20) district = '朱雀大街';
    else if (p.x >  18 && p.x <  60 && p.z >  18 && p.z <  40) district = '大雁塔南';
    else if (p.x > -10 && p.x <  18 && p.z > -25 && p.z <  -8) district = '皇城南';
    if (district && tourGuide.lastDistrict !== district) {
      tourGuide.lastDistrict = district;
      const ctxText = {
        '东市':    '玩家走进了东市方向, 周围满是百货商铺与中原商贾',
        '西市':    '玩家步入了西市, 胡商林立, 波斯邸大食邸的香料、珠宝铺面随处可见',
        '大明宫前':'玩家行至大明宫南面广场, 含元殿翔鸾栖凤双阙在望',
        '朱雀大街':'玩家走回了朱雀大街中段, 这是长安城南北中轴的主干道',
        '大雁塔南':'玩家来到了慈恩寺大雁塔附近',
        '皇城南':  '玩家进入了皇城以南的官府坊区',
      }[district] || `玩家来到了${district}附近`;
      emitTourContext(
        'district:' + district,
        `[场景提示] ${ctxText}, 请用 30-50 字一句话介绍这里的看点 (不要换行)。`,
        { debounceMs: 12000 },
      );
    }
  }

  // 头顶环转动
  if (gameState.player.userData.marker) {
    gameState.player.userData.marker.ring.rotation.z = elapsed * 1.5;
  }

  // 相机平滑跟随 (按当前 cameraMode 计算理想位置)
  // 若 dialogueFraming.active → 改走对话取景路径 (3/4 越肩, NPC 转身)
  const tgt = gameState.pos;
  let desiredCamPos, desiredLookTarget, desiredZoom;
  if (gameState.dialogueFraming.active && gameState.dialogueFraming.npc) {
    const npc = gameState.dialogueFraming.npc;
    const np = npc.position;
    const dx = np.x - tgt.x, dz = np.z - tgt.z;
    const d = Math.hypot(dx, dz) || 1;
    // 玩家→NPC 单位向量
    const fx = dx / d, fz = dz / d;
    // 左侧法向量 (相对玩家面向 NPC 的方向): 旋转 90° → (-fz, fx)
    const sx = -fz, sz = fx;
    // 镜头放在玩家身后一点 + 右侧法向 → 经典 over-shoulder 3/4
    const back = 4.0, side = 5.5, up = 4.2;
    desiredCamPos = new THREE.Vector3(
      tgt.x - fx * back + sx * side,
      tgt.y + up,
      tgt.z - fz * back + sz * side,
    );
    // 看向 玩家+NPC 中点偏上, 让两人都在画面里
    const midX = (tgt.x + np.x) / 2, midZ = (tgt.z + np.z) / 2;
    desiredLookTarget = new THREE.Vector3(midX, tgt.y + 1.3, midZ);
    desiredZoom = 1.55;

    // NPC 朝向玩家 (插值过去)
    const targetRot = Math.atan2(tgt.x - np.x, tgt.z - np.z);
    gameState.dialogueFraming.npcTargetRot = targetRot;
    // shortest-angle lerp
    let cur = npc.rotation.y;
    let diff = targetRot - cur;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.rotation.y = cur + diff * 0.12;
  } else {
    const desired = computeDesiredCamera(gameState.cameraMode, tgt, gameState.facing);
    desiredCamPos = desired.camPos;
    desiredLookTarget = desired.lookTarget;
    desiredZoom = desired.zoom;
  }
  camera.position.lerp(desiredCamPos, 0.08);
  controls.target.lerp(desiredLookTarget, 0.12);
  // 平滑 zoom (orthographic 用 zoom 控制视野)
  const zDelta = desiredZoom - camera.zoom;
  if (Math.abs(zDelta) > 0.0015) {
    camera.zoom += zDelta * 0.08;
    camera.updateProjectionMatrix();
  }

  // 交互+HUD+任务步骤检查 (FPS/TPS 共用)
  updateInteractionsAndHud(dt);
}

/* ============================================================
 *  共用交互循环 (TPS + FPS 共用)
 *  ---
 *  原本所有 NPC 探测 / E 键 / 提示 / 店铺 / 任务步骤 都嵌在 updateGame 里,
 *  导致 FPS 模式下完全跑不到 (updateGame 在 viewMode!=='tps' 时直接 return)。
 *  抽出这个共用函数, 两种镜头都能进行同样的剧情/语音交互。
 * ============================================================ */
function updateInteractionsAndHud(dt) {
  if (!gameState.active || !gameState.player) return;
  const k = gameState.inputKeys;
  // 最近 NPC + 提示
  const near = findNearestNpcForPlayer();
  gameState.nearestNpc = near;
  const prompt = document.getElementById('gamePrompt');
  if (prompt) {
    if (near && !gameState.dialogActive) {
      const named = near.userData.personaId ? near.userData : null;
      if (named) {
        // 具名 NPC → 走入语音面板; 提示文案突出 🎙
        prompt.innerHTML = `<span class="kbd">E</span> 🎙 与 <b style="color:#f5e2b2">${named.displayName}</b> 实时对话`;
      } else {
        prompt.innerHTML = `<span class="kbd">E</span> 与 <b>${roleLabel(near.userData.npcRole)}</b> 交谈`;
      }
      prompt.classList.add('show');
    } else {
      prompt.classList.remove('show');
    }
  }

  // E 键交互
  if (k.e && !gameState.prevHotKeyE) {
    // ── 丹青馆三站点优先 ──
    if (gameState.viewMode === 'gallery' && gameState.galleryId === 'diyhall'
        && DiyHall.getCurrentStation()) {
      DiyHall.interactWithCurrent();
    } else if (
      // ── 品牌馆讲解员站点 ──
      gameState.viewMode === 'gallery' &&
      GALLERIES[gameState.galleryId]?.isBrandPavilion &&
      BrandPlaza.isDockerActive()
    ) {
      BrandPlaza.interactDocker();
    } else if (near && !gameState.dialogActive) {
      // 具名 NPC 直接打开 Agora 语音面板；其它 NPC 走原来的 bubble + 任务对话
      if (near.userData.personaId && typeof openVoicePanel === 'function') {
        openVoicePanel(near);
      } else {
        openDialog(near);
      }
    }
  }
  gameState.prevHotKeyE = k.e;

  // 店铺探测
  checkNearestShop();
  // 体力流动
  tickStamina(dt);

  // 对话取景生命周期 — 当对话/语音面板都已经关闭时, 自动 endDialogueFraming
  // (覆盖 renderDialog / dialogClose / startRps 等各种把 dialogActive 直接置 false 的路径)
  if (gameState.dialogueFraming.npc &&
      !gameState.dialogActive &&
      !(typeof voicePanelState !== 'undefined' && voicePanelState.open)) {
    endDialogueFraming();
  }

  // 任务步骤检查 (走到目标位置)
  const q = QUESTS[gameState.questId];
  if (q && !gameState.dialogActive) {
    const step = q.steps[gameState.questStep];
    if (step && step.targetPos) {
      const d = Math.hypot(step.targetPos.x - gameState.pos.x, step.targetPos.z - gameState.pos.z);
      if (d < step.radius) {
        // 步骤完成（自动推进）
        if (step.action !== 'launchYanta') {  // launchYanta 由对话触发
          if (!step._reachToast) {
            showGameToast('已抵达 · 与附近人物交谈推进剧情', 2500);
            step._reachToast = true;
          }
        }
      }
    }
  }
}

// 输入
window.addEventListener('keydown', (e) => {
  if (!gameState.active) return;
  const k = e.key.toLowerCase();
  // 同步给 TPS + FPS 两套输入
  const isFps = gameState.viewMode === 'fps' || gameState.viewMode === 'gallery';
  if (k === 'w' || e.key === 'ArrowUp')    { gameState.inputKeys.w = true; fpsMoveKeys.w = true; }
  if (k === 's' || e.key === 'ArrowDown')  { gameState.inputKeys.s = true; fpsMoveKeys.s = true; }
  if (k === 'a' || e.key === 'ArrowLeft')  { gameState.inputKeys.a = true; fpsMoveKeys.a = true; }
  if (k === 'd' || e.key === 'ArrowRight') { gameState.inputKeys.d = true; fpsMoveKeys.d = true; }
  if (k === 'q')      gameState.inputKeys.q = true;
  if (k === 'e' || k === ' ' || e.key === 'Enter') gameState.inputKeys.e = true;
  if (k === 'shift')  { gameState.inputKeys.shift = true; fpsMoveKeys.shift = true; }
  // V — 在 5 个视角之间循环
  if (k === 'v') {
    if (gameState.viewMode === 'gallery') return;
    cycleCameraView();
  }
  // F — 入店/入殿 (优先店铺)
  if (k === 'f') {
    if (gameState.shopActive) {
      closeShop();
    } else if (gameState.viewMode === 'gallery') {
      exitGallery();
    } else if (gameState.nearestShop) {
      openShop(gameState.nearestShop);
    } else if (gameState.nearDoor) {
      enterGallery(gameState.nearDoor.id);
    }
  }
  if (k === 'escape') {
    if (gameState.shopActive) {
      closeShop();
    } else if (gameState.viewMode === 'gallery') {
      exitGallery();
    } else if (gameState.viewMode === 'fps') {
      setViewMode('tps');
    } else {
      endGame();
    }
  }
});
window.addEventListener('keyup', (e) => {
  if (!gameState.active) return;
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp')    { gameState.inputKeys.w = false; fpsMoveKeys.w = false; }
  if (k === 's' || e.key === 'ArrowDown')  { gameState.inputKeys.s = false; fpsMoveKeys.s = false; }
  if (k === 'a' || e.key === 'ArrowLeft')  { gameState.inputKeys.a = false; fpsMoveKeys.a = false; }
  if (k === 'd' || e.key === 'ArrowRight') { gameState.inputKeys.d = false; fpsMoveKeys.d = false; }
  if (k === 'q')      gameState.inputKeys.q = false;
  if (k === 'e' || k === ' ' || e.key === 'Enter') gameState.inputKeys.e = false;
  if (k === 'shift')  { gameState.inputKeys.shift = false; fpsMoveKeys.shift = false; }
});

// 点击画布锁定鼠标 (FPS / Gallery)
renderer.domElement.addEventListener('click', () => {
  if (!gameState.active) return;
  if (gameState.viewMode === 'fps' || gameState.viewMode === 'gallery') {
    if (fpsControls && !fpsControls.isLocked) fpsControls.lock();
  }
});

/* ============================================================
 *  Animation loop
 * ============================================================ */
const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  const dt = clock.getDelta();
  elapsed += dt;

  // ---- 头顶字幕气泡: 平滑淡入/淡出 + GC ----
  if (typeof _tickOverheadSubtitles === 'function') _tickOverheadSubtitles(dt);

  // ---- GLB 角色: 推进 AnimationMixer + 自动 idle/walk/talk 切换 ----
  updateAnimMixers(dt);
  if (window.glbCharacters && window.glbCharacters.length) {
    for (const entry of window.glbCharacters) {
      if (entry.demoMotion) {
        // demo: 让狐沿圆轨道漫步
        const m = entry.demoMotion;
        m.angle += dt * m.speed;
        entry.npc.position.x = m.cx + Math.cos(m.angle) * m.r;
        entry.npc.position.z = m.cz + Math.sin(m.angle) * m.r;
        entry.npc.rotation.y = -m.angle + Math.PI * 0.5;
        // 已经 play('walk') 了, 不必每帧切
      } else {
        // 真正的 NPC: 根据 npc.userData._lastSpeed 与对话状态切动画
        const speed = entry.npc.userData?._lastSpeed || 0;
        // 三种 talking 触发源 (任一即播 talk 动画):
        //   (a) 经典 dialogActive (键盘 E 触发的对话框)
        //   (b) 该 NPC 的 persona 正与玩家通话 (voice panel 开着该 persona) 且 AI 正在说
        //   (c) 该 NPC 是 spawnGalleryDocent 临时召出的 docent 化身, 且 docent 正在说
        const npcPersona = entry.npc.userData?.personaId;
        const voiceMatch =
          typeof voicePanelState !== 'undefined'
          && voicePanelState.open
          && npcPersona
          && voicePanelState.personaId === npcPersona;
        const voiceTalking = !!(window.voiceAiSpeaking) && voiceMatch;
        const dialogTalking = !!(typeof gameState !== 'undefined'
          && gameState.dialogActive
          && gameState.nearestNpc === entry.npc);
        const talking = dialogTalking || voiceTalking;
        autoAnimateState(entry.char, { speed, talking });
      }
    }
  }

  // ---- named-NPC halo breathing (gentle pulse on the 5 voice-enabled NPCs) ----
  if (namedNpcs && namedNpcs.length) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.8);
    for (const n of namedNpcs) {
      const halo = n.userData.halo;
      if (!halo) continue;
      const inner = halo.userData.haloInner;
      const ring  = halo.userData.haloRing;
      if (inner) {
        const s = 0.9 + pulse * 0.45;
        inner.scale.set(s, s, s);
        inner.material.opacity = 0.25 + pulse * 0.4;
      }
      if (ring) {
        ring.material.opacity = 0.45 + pulse * 0.3;
      }
      // 对话取景结束后, 平滑把 NPC 转回原始朝向
      if (n.userData._restoreRot != null) {
        let cur = n.rotation.y;
        let diff = n.userData._restoreRot - cur;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.rotation.y = cur + diff * 0.10;
        if (Math.abs(diff) < 0.02) {
          n.rotation.y = n.userData._restoreRot;
          delete n.userData._restoreRot;
        }
      }
    }
  }

  // auto time
  if (autoTime) {
    let v = parseInt(timeSlider.value, 10) + dt * 80;  // 1 sec ≈ 0.8 min
    if (v > 2400) v -= 2400;
    timeSlider.value = v;
    const decH = v / 100;
    applyHour(decH);
    applyTimeUI(decH);
  }

  // ---- path walkers (camels, patrol, kids, cavalry, dust) ----
  for (const w of walkers) {
    const path = w.path;
    const i = w.idx;
    const j = (i + 1) % path.length;
    const a = path[i], b = path[j];
    const dur = a.distanceTo(b) / w.speed;
    w.t += dt;
    if (w.t >= dur) {
      w.t = 0;
      w.idx = j;
      continue;
    }
    const u = w.t / dur;
    w.obj.position.lerpVectors(a, b, u);
    const dir = b.clone().sub(a);
    w.obj.rotation.y = Math.atan2(dir.x, dir.z);
    // 步态 bob
    if (w.isCavalry) {
      w.obj.position.y += Math.abs(Math.sin(elapsed * 10)) * 0.12;  // 马蹄震荡更明显
    } else if (w.isCamel) {
      w.obj.position.y += Math.abs(Math.sin(elapsed * 3)) * 0.06;
    } else if (!w.isDust) {
      w.obj.position.y += Math.abs(Math.sin(elapsed * 6)) * 0.04;
    }
    // 扬尘脉动
    if (w.isDust) {
      w.obj.children.forEach((c, k) => {
        c.position.y = 0.2 + k * 0.2 + Math.sin(elapsed * 5 + k * 1.3) * 0.08;
        if (c.material) {
          const base = 0.4 - k * 0.1;
          c.material.opacity = base * (0.4 + Math.abs(Math.sin(elapsed * 3 + k * 0.7)) * 0.6);
        }
      });
    }
  }

  // ---- idle / smoke / waterwheel / flag / beacon / birds / petals ----
  for (const ax of animatables) {
    const a = ax.obj;
    if (ax.type === 'person') {
      a.position.y = a.userData.basePos.y + Math.sin(elapsed * 2 + a.userData.idle) * 0.02;
      if (a.userData.walk) {
        const base = a.userData.basePos;
        a.position.x = base.x + Math.sin(elapsed * 0.4 + a.userData.idle) * 1.2;
        a.position.z = base.z + Math.cos(elapsed * 0.4 + a.userData.idle) * 0.4;
        a.rotation.y = Math.cos(elapsed * 0.4 + a.userData.idle) * 0.5;
      }
    } else if (ax.type === 'chicken') {
      a.position.y = a.userData.basePos.y + Math.abs(Math.sin(elapsed * 4 + a.userData.idle)) * 0.04;
      a.rotation.y += dt * 0.4;
    } else if (ax.type === 'smoke') {
      a.children.forEach((s, i) => {
        s.position.y += dt * (0.2 + i * 0.05);
        s.material.opacity = Math.max(0, 0.5 - i * 0.1 - (s.position.y - 2.6 - i * 0.5) * 0.2);
        if (s.position.y > 6) {
          s.position.y = 2.6 + i * 0.5;
          s.material.opacity = 0.5 - i * 0.1;
        }
      });
    } else if (ax.type === 'waterwheel') {
      a.rotation.x += dt * 0.6;
    } else if (ax.type === 'drum') {
      // 战鼓拍动 — 微微缩放
      a.scale.set(1 + Math.abs(Math.sin(elapsed * 6)) * 0.06, 1, 1 + Math.abs(Math.sin(elapsed * 6)) * 0.06);
    } else if (ax.type === 'boat') {
      // 画舫水面摆动
      const phase = ax.phase || 0;
      a.position.y = 0.1 + Math.sin(elapsed * 0.8 + phase) * 0.05;
      a.rotation.z = Math.sin(elapsed * 1.2 + phase) * 0.02;
    } else if (ax.type === 'snow') {
      a.children.forEach(s => {
        s.position.y -= s.userData.fallSpeed * dt;
        s.position.x += Math.sin(elapsed * 1.2 + s.userData.swayPhase) * s.userData.swayAmp * dt;
        s.rotation.y += dt * 1.5;
        if (s.position.y < -0.5) {
          s.position.y = 25 + Math.random() * 4;
          s.position.x = (Math.random() - 0.5) * 110;
          s.position.z = -5 + (Math.random() - 0.5) * 120;
        }
      });
    } else if (ax.type === 'leaves') {
      a.children.forEach(s => {
        s.position.y -= s.userData.fallSpeed * dt;
        s.position.x += Math.sin(elapsed * 1.5 + s.userData.swayPhase) * s.userData.swayAmp * dt;
        s.rotation.x += dt * 1.8; s.rotation.z += dt * 1.2;
        if (s.position.y < -0.3) {
          s.position.y = 16 + Math.random() * 6;
          s.position.x = (Math.random() - 0.5) * 100;
          s.position.z = -5 + (Math.random() - 0.5) * 110;
        }
      });
    } else if (ax.type === 'rain') {
      if (a.visible) {
        // 风向让雨条整体倾斜
        const tiltZ = -windState.x * 0.12;
        const tiltX = windState.z * 0.12;
        a.children.forEach(r => {
          r.position.y -= r.userData.fallSpeed * dt;
          r.position.x += (windState.x * windState.strength + r.userData.windDrift) * dt;
          r.position.z += windState.z * windState.strength * dt;
          r.rotation.z = tiltZ;
          r.rotation.x = tiltX;
          if (r.position.y < -1) {
            r.position.y = 28 + Math.random() * 4;
            r.position.x = (Math.random() - 0.5) * 120;
            r.position.z = -10 + (Math.random() - 0.5) * 130;
          }
        });
      }
    } else if (ax.type === 'sand') {
      if (a.visible) {
        // 风向 + 阵风 (gust) 调制
        const gust = 1 + 0.5 * Math.sin(elapsed * 0.6);
        a.children.forEach(s => {
          s.position.x += windState.x * windState.strength * gust * s.userData.driftSpeed * dt * 0.3;
          s.position.z += windState.z * windState.strength * gust * s.userData.driftSpeed * dt * 0.3;
          s.position.y += Math.sin(elapsed * 2 + s.userData.swayPhase) * s.userData.swayAmp * dt;
          // 超出边界即回 spawn
          if (s.position.x > 75 || s.position.x < -80) {
            s.position.x = -75 - Math.random() * 20;
            s.position.y = 0.2 + Math.random() * 14;
            s.position.z = -10 + (Math.random() - 0.5) * 120;
          }
        });
      }
    } else if (ax.type === 'fireflies') {
      const isNight = (typeof currentHour !== 'undefined') && (currentHour < 6 || currentHour > 19);
      a.visible = (currentSeason === 'summer' && isNight);
      if (a.visible) {
        a.children.forEach(f => {
          const p = f.userData.phase + elapsed * 0.8;
          f.position.x = f.userData.basePos.x + Math.cos(p) * 1.2;
          f.position.z = f.userData.basePos.z + Math.sin(p) * 1.2;
          f.position.y = f.userData.basePos.y + Math.sin(elapsed * 2 + f.userData.phase) * 0.4;
          // 闪烁
          const blink = (Math.sin(elapsed * 4 + f.userData.phase) + 1) / 2;
          f.material.opacity = blink;
          f.material.transparent = true;
        });
      }
    } else if (ax.type === 'dancer') {
      // 胡旋舞 — 围圆周快速旋转
      const ang = (a.userData.danceAng || 0) + elapsed * 1.4;
      const c = a.userData.danceCenter;
      if (c) {
        a.position.x = c.x + Math.cos(ang) * 0.9;
        a.position.z = c.z + Math.sin(ang) * 0.9;
      }
      // 身体快速旋转 (袖飞)
      a.rotation.y = ang + Math.PI / 2 + elapsed * 3;
      a.position.y = 0.2 + Math.abs(Math.sin(elapsed * 6)) * 0.06;
    } else if (ax.type === 'liyuanDancer') {
      // 梨园主舞者 — 原地高速旋转, 不绕圆周走 (区别于市集的 dancer)
      a.rotation.y += dt * 3.2;
      // 微微抬腿 (上下 bob)
      const c = a.userData.danceCenter;
      const baseY = c ? c.y : 0.35;
      a.position.y = baseY + Math.abs(Math.sin(elapsed * 7)) * 0.08;
    } else if (ax.type === 'flag') {
      // 旗帜水平摆动
      a.rotation.y = Math.sin(elapsed * 1.5) * 0.25;
      a.scale.x = 1 + Math.sin(elapsed * 3) * 0.05;
    } else if (ax.type === 'armillary') {
      // 浑天仪缓慢旋转 (Round 4 · 司天监)
      a.rotation.y += dt * 0.18;
      // 内部环 (赤道/黄道) 独立旋转模拟天球运动
      a.children.forEach((ch, idx) => {
        if (ch.isMesh && ch.geometry && ch.geometry.type === 'TorusGeometry') {
          if (idx === 1) ch.rotation.z += dt * 0.12;  // 赤道环
          if (idx === 2) ch.rotation.z -= dt * 0.10;  // 黄道环
        }
      });
    } else if (ax.type === 'beacon') {
      // 烽火夜间燃烧 (脉冲)；天宝乱期间日夜常燃
      const isNight = currentHour < 6 || currentHour > 18;
      const burn = (typeof beaconsAlwaysOn !== 'undefined' && beaconsAlwaysOn.value) || isNight;
      a.material.emissiveIntensity = burn ? (0.8 + Math.sin(elapsed * 6) * 0.4) : 0;
      a.visible = burn;
    } else if (ax.type === 'birds') {
      a.children.forEach(bird => {
        bird.userData.angle += dt * bird.userData.speed;
        bird.position.x = Math.cos(bird.userData.angle) * bird.userData.radius;
        bird.position.z = Math.sin(bird.userData.angle) * bird.userData.radius;
        bird.position.y = bird.userData.height + Math.sin(elapsed * 2 + bird.userData.angle) * 0.5;
        bird.rotation.y = -bird.userData.angle + Math.PI / 2;
        // 翅膀拍动 (scale.x)
        bird.scale.x = 1 + Math.sin(elapsed * 12 + bird.userData.angle * 3) * 0.3;
      });
    } else if (ax.type === 'petals') {
      a.children.forEach(p => {
        p.position.y -= dt * p.userData.fallSpeed;
        p.position.x += Math.sin(elapsed + p.userData.swayPhase) * dt * p.userData.swayAmp;
        p.rotation.x += dt * 1.5;
        p.rotation.z += dt * 0.8;
        if (p.position.y < 0.1) {
          p.position.y = 8 + Math.random() * 4;
          p.position.x = (Math.random() - 0.5) * 18;
          p.position.z = 13 + Math.random() * 10;
        }
      });
    }
  }

  updateGame(dt);
  updateFps(dt);
  updateGallery(dt);
  checkGalleryDoors();
  // 丹青馆室内三站点距离检测 (每帧)
  if (gameState.viewMode === 'gallery' && gameState.galleryId === 'diyhall' && fpsCamera) {
    DiyHall.tickStations(fpsCamera.position);
  }
  // 品牌馆讲解员站点距离检测 (每帧)
  if (gameState.viewMode === 'gallery'
      && GALLERIES[gameState.galleryId]?.isBrandPavilion
      && fpsCamera) {
    BrandPlaza.tickDocker(fpsCamera.position);
  }
  tickLightning(dt);
  tickShopLanterns(performance.now() / 1000);

  // ---- Round 1 · 平康坊灯笼摇曳 (微幅 + 夜间 emissive 强化) ----
  if (window._pkLanterns && window._pkLanterns.length) {
    const isNight = (typeof currentHour !== 'undefined') && (currentHour < 6 || currentHour > 19);
    for (const item of window._pkLanterns) {
      const l = item.lant; if (!l) continue;
      l.rotation.z = Math.sin(elapsed * 1.3 + item.basePhase) * 0.06;
      if (l.material && l.material.emissiveIntensity !== undefined) {
        const base = isNight ? 0.75 : 0.45;
        l.material.emissiveIntensity = base + Math.sin(elapsed * 2.2 + item.basePhase) * 0.12;
      }
    }
  }

  // ---- Round 2 · 染坊 + 东市 彩缎森林微风摆动 (沿垂直轴轻轻摆动 + 上下浮动) ----
  if (window._rfSilks && window._rfSilks.length) {
    for (const silk of window._rfSilks) {
      const sw = silk.userData.silkSway;
      if (!sw) continue;
      silk.rotation.y = Math.sin(elapsed * 0.9 + sw.basePhase) * 0.18;
      silk.position.y = sw.baseY + Math.sin(elapsed * 0.7 + sw.basePhase * 1.3) * sw.ampY;
    }
  }
  // 东市的彩缎用 silkSway.base + silkSway.phase 字段, 单独遍历 dongshiZone
  if (typeof dongshiZone !== 'undefined') {
    dongshiZone.traverse((obj) => {
      const sw = obj.userData && obj.userData.silkSway;
      if (sw && sw.base !== undefined) {
        obj.rotation.y = sw.base + Math.sin(elapsed * 1.1 + sw.phase) * 0.12;
      }
    });
  }

  tickCameraTween(dt);
  tickTour(dt);
  controls.update();
  composer.render();
  requestAnimationFrame(animate);
}

/* ============================================================
 *  Init + resize
 * ============================================================ */
// Default initial time: 10 AM (bright morning) so the scene looks great on first load
// Override via URL hash, e.g. #h=18 for 6 PM evening
function parseInitialHour() {
  const m = location.hash.match(/h=([\d.]+)/);
  if (m) return Math.max(0, Math.min(24, parseFloat(m[1])));
  return 10;
}
const initialH = parseInitialHour();
timeSlider.value = Math.round(initialH * 100);
applyHour(initialH);
applyTimeUI(initialH);
updateProgress();
animate();

setTimeout(() => document.getElementById('loader').classList.add('gone'), 600);

function handleResize() {
  const { w, h } = stageSize();
  const aspect = w / h;
  camera.left = -frustum * aspect / 2;
  camera.right = frustum * aspect / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();
  if (fpsCamera) {
    fpsCamera.aspect = aspect;
    fpsCamera.updateProjectionMatrix();
  }
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', handleResize);
// safety: re-measure after first frame in case stage was 0 at boot
requestAnimationFrame(() => requestAnimationFrame(handleResize));

/* ============================================================
 *  Background Music — 古风 BGM 循环 + 自动 duck (语音对话时压音量)
 *  曲源: Pixabay-style royalty-free Chinese classical (archive.org).
 *  ✱ assets/bgm/*.mp3  ← 拖任意 .mp3 进这个目录都会自动接入 playlist.
 *  · 玩家进入游戏自动播放 (startGame 后)
 *  · 语音 panel 开启时音量 → 12% (duck), 关闭后还原
 *  · ?nobgm=1 关闭, ?bgm=0..100 直接设音量, ?bgm=skip 切下一首
 * ========================================================== */
(function bootTangBGM() {
  const PLAYLIST = [
    { src: 'assets/bgm/guqin-lost-tao.mp3',      title: '古琴 · 平沙落雁', meta: 'Lo Ka Ping · CC BY-NC-SA' },
    { src: 'assets/bgm/guzheng-bamboo-zen.mp3',  title: '古筝 · 竹笛禅意', meta: 'archive.org · 古风器乐' },
  ];

  const params = new URLSearchParams(window.location.search);
  const NO_BGM = params.get('nobgm') === '1';
  const FORCED_VOL = params.has('bgm') ? Math.max(0, Math.min(100, parseInt(params.get('bgm'), 10) || 0)) : null;

  const audio  = document.getElementById('bgmAudio');
  const pill   = document.getElementById('bgmPill');
  const toggle = document.getElementById('bgmToggle');
  const next   = document.getElementById('bgmNext');
  const vol    = document.getElementById('bgmVolume');
  const titleEl = document.getElementById('bgmTitle');
  const metaEl  = document.getElementById('bgmMeta');
  if (!audio || !pill || !toggle || !vol) return;

  const state = {
    started: false,
    muted: false,
    ducked: false,
    idx: 0,
    targetVol: FORCED_VOL != null ? FORCED_VOL / 100 : 0.32,
    duckedVol: 0.12,
    ready: false,
  };
  audio.volume = state.muted ? 0 : state.targetVol;
  audio.loop = false; // 自己手动切下一首

  function loadIndex(i, autoplay = true) {
    state.idx = (i + PLAYLIST.length) % PLAYLIST.length;
    const t = PLAYLIST[state.idx];
    audio.src = t.src;
    if (titleEl) titleEl.textContent = t.title;
    if (metaEl)  metaEl.textContent  = t.meta;
    if (autoplay && !state.muted) {
      audio.play().catch(() => { /* 浏览器可能拦截 — 玩家点击后会自动重试 */ });
    }
  }

  function applyVolume() {
    const v = state.muted ? 0 : (state.ducked ? Math.min(state.duckedVol, state.targetVol) : state.targetVol);
    audio.volume = v;
  }

  function start() {
    if (NO_BGM) return;
    if (!state.started) {
      loadIndex(0, true);
      state.started = true;
      pill.classList.add('ready');
    } else if (!state.muted) {
      audio.play().catch(() => {});
    }
  }
  function pause() {
    try { audio.pause(); } catch(e) {}
  }
  function duck(on) {
    state.ducked = !!on;
    applyVolume();
  }
  function setMuted(m) {
    state.muted = !!m;
    pill.classList.toggle('muted', state.muted);
    applyVolume();
    if (!state.muted) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    try { localStorage.setItem('tang.bgm.muted', state.muted ? '1' : '0'); } catch(e) {}
  }
  function nextTrack() {
    loadIndex(state.idx + 1, !state.muted);
  }

  // 自动切下一首 (跨首循环)
  audio.addEventListener('ended', () => loadIndex(state.idx + 1, !state.muted));
  audio.addEventListener('canplay', () => { state.ready = true; });
  audio.addEventListener('error', () => {
    console.warn('[BGM] failed to load', PLAYLIST[state.idx].src);
    // 跳过这一首
    if (PLAYLIST.length > 1) loadIndex(state.idx + 1, !state.muted);
  });

  // UI 绑定
  toggle.addEventListener('click', () => setMuted(!state.muted));
  next.addEventListener('click', () => nextTrack());
  vol.addEventListener('input', () => {
    state.targetVol = Math.max(0, Math.min(1, parseInt(vol.value, 10) / 100));
    applyVolume();
    try { localStorage.setItem('tang.bgm.vol', String(state.targetVol)); } catch(e) {}
  });

  // 上次玩家设置的偏好
  try {
    const m = localStorage.getItem('tang.bgm.muted');
    if (m === '1') { state.muted = true; pill.classList.add('muted'); }
    const v = parseFloat(localStorage.getItem('tang.bgm.vol'));
    if (!isNaN(v)) { state.targetVol = v; vol.value = Math.round(v * 100); }
  } catch(e) {}
  if (FORCED_VOL != null) { state.targetVol = FORCED_VOL / 100; vol.value = FORCED_VOL; }
  applyVolume();

  // ── Hook 进游戏/退游戏: monkey-patch startGame / endGame ──
  if (typeof window.startGame === 'function') {
    const _sg = window.startGame;
    window.startGame = function(...a) {
      const r = _sg.apply(this, a);
      try { start(); } catch(e) {}
      return r;
    };
  }
  // endGame 没 export 到 window, 但当 .app.game-on 被移除时也能侦测
  const appEl = document.querySelector('.app');
  if (appEl && typeof MutationObserver === 'function') {
    new MutationObserver(() => {
      if (!appEl.classList.contains('game-on')) {
        // 玩家退出游戏 — 不彻底停, 只是降到非常低让画面安静过渡; 用户再开仍能继续
      }
    }).observe(appEl, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Hook 语音 panel: 打开 → duck, 关闭 → 取消 duck ──
  function wrapVoiceOpen(fnName) {
    const orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function(...a) {
      try { duck(true); } catch(e) {}
      return orig.apply(this, a);
    };
  }
  ['openVoicePanel', 'openAmbientTourGuide', 'openDocentPanel', 'openBrandDocentPanel']
    .forEach(wrapVoiceOpen);
  if (typeof window.closeVoicePanel === 'function') {
    const _cv = window.closeVoicePanel;
    window.closeVoicePanel = function(...a) {
      const r = _cv.apply(this, a);
      try { duck(false); } catch(e) {}
      return r;
    };
  }

  // 玩家任意一次点击后再次尝试 play (突破浏览器 autoplay 限制)
  function unlockOnce() {
    if (state.started && !state.muted) audio.play().catch(() => {});
    window.removeEventListener('pointerdown', unlockOnce);
    window.removeEventListener('keydown', unlockOnce);
  }
  window.addEventListener('pointerdown', unlockOnce, { once: true });
  window.addEventListener('keydown',     unlockOnce, { once: true });

  // 暴露给 ?bgm=skip 等调试
  window.tangBGM = { start, pause, duck, setMuted, nextTrack, _state: state };
  if (params.get('bgm') === 'skip') nextTrack();

  console.info('[BGM] ready — 2 tracks · ?nobgm=1 to disable, ?bgm=0..100 to set volume');
})();
