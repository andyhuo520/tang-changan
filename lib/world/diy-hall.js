/**
 * Diy Hall · 丹青館 — 大明宫边墙旁的"自寫一幅"室内体验馆
 *
 * 设计：WASD 走到大明宫东侧 → 进门 (F) → 室内 FPS → 三面墙各一个交互点
 *   - 东墙: 上傳壁 (E 触发上传)
 *   - 北墙: 生圖案 (E 触发 文生图)
 *   - 西墙: 題款壁 (E 触发 写签名)
 *
 * 共享 localStorage 'han.atelier.artworks.v1' 以保证云廊 DIY tab 同步显示
 * 签名独立 key 'han.diyhall.signatures.v1'
 *
 * 暴露 (供 scene.js 接入):
 *   install({ scene })                 — 创建 exterior + interior 几何
 *   DIY_DOOR                           — { id, pos, label } 加到 GALLERY_DOORS
 *   DIY_GALLERY_DEF                    — { title, center, halfSize } 加到 GALLERIES
 *   beginEnter()                       — enterGallery('diyhall') 调
 *   beginExit()                        — exitGallery() 调
 *   tickStations(playerWorldPos)       — animate loop 调
 *   interactWithCurrent()              — E 键调
 *   teleportPlayerToDoor(gameState)    — 让 voice-hud / onboarding / 语音意图复用
 */

import * as THREE from 'three';

/* ───────── 常量 ───────── */

const ARTWORKS_KEY  = 'han.atelier.artworks.v1';
const SIGNATURES_KEY = 'han.diyhall.signatures.v1';
const MAX_ARTWORKS = 12;
const MAX_SIGNATURES = 60;

// 室外 (大明宫东侧 — 含元殿 (0,0,-60) 的东边)
const DOOR_POS         = new THREE.Vector3(32, 0, -60);
const EXTERIOR_POS     = new THREE.Vector3(38, 0, -64);

// 室内 (远岛 — 跟其他 gallery 不冲突)
const INTERIOR_CENTER  = new THREE.Vector3(-700, 500, 0);
const ROOM_HALF = 6;      // 12×12 m
const ROOM_H    = 5;

// 三个站点 (相对 INTERIOR_CENTER 的世界坐标)
const STATIONS = [
  { id: 'upload', label: '上傳壁',   prompt: '上傳一張照片',  wallNormal: 'east',  pos: new THREE.Vector3(INTERIOR_CENTER.x + ROOM_HALF - 1.2, INTERIOR_CENTER.y + 1.6, INTERIOR_CENTER.z) },
  { id: 'gen',    label: '生圖案',   prompt: '一句话生图',    wallNormal: 'north', pos: new THREE.Vector3(INTERIOR_CENTER.x, INTERIOR_CENTER.y + 1.6, INTERIOR_CENTER.z - ROOM_HALF + 1.2) },
  { id: 'sign',   label: '題款壁',   prompt: '题一句留念',    wallNormal: 'west',  pos: new THREE.Vector3(INTERIOR_CENTER.x - ROOM_HALF + 1.2, INTERIOR_CENTER.y + 1.6, INTERIOR_CENTER.z) },
];

/* ───────── 模块内状态 ───────── */

let _installed = false;
let _scene     = null;
let _gameState = null;
let _exteriorGroup = null;
let _interiorGroup = null;
let _currentStation = null;
let _modalOpen = false;
const _wallCanvases = { upload: null, gen: null, sign: null };
const _wallTextures = { upload: null, gen: null, sign: null };

/* ───────── localStorage ───────── */

function loadArtworks() {
  try { return JSON.parse(localStorage.getItem(ARTWORKS_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveArtworks(list) {
  try { localStorage.setItem(ARTWORKS_KEY, JSON.stringify(list.slice(0, MAX_ARTWORKS))); }
  catch (e) { console.warn('[DiyHall] saveArtworks failed', e); }
}
function loadSignatures() {
  try { return JSON.parse(localStorage.getItem(SIGNATURES_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveSignatures(list) {
  try { localStorage.setItem(SIGNATURES_KEY, JSON.stringify(list.slice(0, MAX_SIGNATURES))); }
  catch (e) { console.warn('[DiyHall] saveSignatures failed', e); }
}
function addArtwork(aw) {
  const list = loadArtworks();
  const next = [{ ...aw, date: new Date().toISOString() }, ...list].slice(0, MAX_ARTWORKS);
  saveArtworks(next);
  window.dispatchEvent(new CustomEvent('han-atelier-artwork-added', { detail: aw }));
  return next;
}
function addSignature(sig) {
  const list = loadSignatures();
  const next = [{ ...sig, date: new Date().toISOString() }, ...list].slice(0, MAX_SIGNATURES);
  saveSignatures(next);
  window.dispatchEvent(new CustomEvent('han-diyhall-signature-added', { detail: sig }));
  return next;
}

/* ───────── 墙面 CanvasTexture 重绘 ───────── */

function paintImageWall(kind, headline, sub, modeFilter) {
  const c = _wallCanvases[kind];
  if (!c) return;
  const ctx = c.getContext('2d');
  // 米黄绢本背景
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#f4e8c8');
  grad.addColorStop(1, '#e1cd9a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  // 描金内框
  ctx.strokeStyle = '#a8732a';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32);
  // 标题
  ctx.fillStyle = '#3a1810';
  ctx.font = 'bold 72px "STKaiti","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.fillText(headline, c.width / 2, 96);
  ctx.font = 'italic 28px "STKaiti","Songti SC",serif';
  ctx.fillStyle = '#7a4a1c';
  ctx.fillText(sub, c.width / 2, 142);

  const items = loadArtworks().filter(a => a.mode === modeFilter).slice(0, 6);
  if (items.length === 0) {
    ctx.font = '40px "STKaiti","Songti SC",serif';
    ctx.fillStyle = '#8a6a3a';
    ctx.fillText('— 走近 · 按 E 添加 —', c.width / 2, c.height / 2 + 30);
    if (_wallTextures[kind]) _wallTextures[kind].needsUpdate = true;
    return;
  }

  // 3×2 网格
  const cols = 3, rows = 2;
  const padTop = 180, padBot = 50, padSide = 60;
  const cellW = (c.width  - padSide * 2) / cols;
  const cellH = (c.height - padTop - padBot) / rows;

  function drawCell(i, aw) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = padSide + col * cellW + cellW / 2;
    const cy = padTop  + row * cellH + cellH / 2;
    const fw = cellW * 0.86, fh = cellH * 0.86;
    // 朱漆画框 + 描金
    ctx.fillStyle = '#3a2018';
    ctx.fillRect(cx - fw / 2 - 8, cy - fh / 2 - 8, fw + 16, fh + 16);
    ctx.fillStyle = '#d4a04a';
    ctx.fillRect(cx - fw / 2 - 4, cy - fh / 2 - 4, fw + 8, fh + 8);
    // 标题底色 (image 还没加载到时占位)
    ctx.fillStyle = '#f0e3c0';
    ctx.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);

    const img = new Image();
    img.onload = () => {
      const r = Math.max(fw / img.width, fh / img.height);
      const w = img.width * r, h = img.height * r;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - fw / 2, cy - fh / 2, fw, fh);
      ctx.clip();
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
      // 画作下方题字
      ctx.fillStyle = 'rgba(20,12,4,0.78)';
      ctx.fillRect(cx - fw / 2, cy + fh / 2 - 26, fw, 26);
      ctx.fillStyle = '#f5d890';
      ctx.font = '18px "STKaiti","Songti SC",serif';
      ctx.textAlign = 'center';
      ctx.fillText((aw.title || '').slice(0, 16), cx, cy + fh / 2 - 8);
      if (_wallTextures[kind]) _wallTextures[kind].needsUpdate = true;
    };
    img.src = aw.src;
  }

  items.forEach((aw, i) => drawCell(i, aw));

  if (_wallTextures[kind]) _wallTextures[kind].needsUpdate = true;
}

function paintUploadWall() { paintImageWall('upload', '上傳壁', 'UPLOAD · 你帶來的長安',          'upload'); }
function paintGenWall()    { paintImageWall('gen',    '生圖案', 'TEXT-TO-IMAGE · 一句话写一幅', 'ai'); }

function paintSignWall() {
  const c = _wallCanvases.sign;
  if (!c) return;
  const ctx = c.getContext('2d');
  // 灰宣纸
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#ece2c4');
  grad.addColorStop(1, '#d3c290');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  // 描金内框
  ctx.strokeStyle = '#a8732a';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32);
  // 标题
  ctx.fillStyle = '#3a1810';
  ctx.font = 'bold 72px "STKaiti","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.fillText('題款壁', c.width / 2, 96);
  ctx.font = 'italic 28px "STKaiti","Songti SC",serif';
  ctx.fillStyle = '#7a4a1c';
  ctx.fillText('SIGN · 落款留長安', c.width / 2, 142);

  const sigs = loadSignatures().slice(0, 30);
  if (sigs.length === 0) {
    ctx.font = '40px "STKaiti","Songti SC",serif';
    ctx.fillStyle = '#8a6a3a';
    ctx.fillText('— 走近 · 按 E 题款 —', c.width / 2, c.height / 2 + 30);
    if (_wallTextures.sign) _wallTextures.sign.needsUpdate = true;
    return;
  }

  // 散点排版 — 4 列, 每列错开
  const cols = 4;
  const padTop = 190;
  const padSide = 70;
  const colW = (c.width - padSide * 2) / cols;
  sigs.forEach((sig, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = padSide + col * colW + (((i * 37) % 17) - 8);
    const oy = padTop + row * 56 + (((i * 13) % 11) - 5);
    if (oy > c.height - 40) return;
    // 朱红印章一类的"名"
    ctx.font = 'bold 22px "STKaiti","Songti SC",serif';
    ctx.fillStyle = '#8a2818';
    ctx.textAlign = 'left';
    ctx.fillText((sig.name || '匿名').slice(0, 8), ox, oy);
    // 墨色"句"
    ctx.font = '22px "STKaiti","Songti SC",serif';
    ctx.fillStyle = '#2a1a0a';
    const nameW = ctx.measureText((sig.name || '匿名').slice(0, 8)).width;
    ctx.fillText(' · ' + (sig.text || '').slice(0, 18), ox + nameW, oy);
  });
  if (_wallTextures.sign) _wallTextures.sign.needsUpdate = true;
}

function paintAllWalls() {
  paintUploadWall();
  paintGenWall();
  paintSignWall();
}

/* ───────── 室外建筑 (大明宫边) ───────── */

function buildExterior() {
  const g = new THREE.Group();
  g.name = 'DiyHallExterior';

  // 石基
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: 0xa39570 }),
  );
  base.position.y = 0.3; g.add(base);

  // 四朱漆柱
  const pillarMat = new THREE.MeshLambertMaterial({
    color: 0xa8332f, emissive: 0x3a1010, emissiveIntensity: 0.20,
  });
  for (const x of [-4, 4]) for (const z of [-3, 3]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 5.0, 10), pillarMat);
    p.position.set(x, 3.1, z); g.add(p);
  }

  // 飞檐 — 两层
  const eaveMat = new THREE.MeshLambertMaterial({ color: 0x3c4856 });
  const eave1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 9), eaveMat);
  eave1.position.y = 5.8; g.add(eave1);
  const eave2 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.45, 7), eaveMat);
  eave2.position.y = 6.35; g.add(eave2);
  // 屋脊
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, 0.45), eaveMat);
  ridge.position.set(0, 6.75, 0); g.add(ridge);

  // 翘角 (4 个)
  const wingMat = eaveMat;
  for (const x of [-4.5, 4.5]) for (const z of [-3.5, 3.5]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.55, 4), wingMat);
    wing.position.set(x, 6.05, z);
    wing.rotation.z = x > 0 ? -0.5 : 0.5;
    g.add(wing);
  }

  // 门匾 "丹青館" (南面)
  const plaqueTex = makePlaqueTex('丹青館', { vertical: false });
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.95),
    new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true }),
  );
  plaque.position.set(0, 5.05, 4.06);
  g.add(plaque);
  const plaqueBack = plaque.clone();
  plaqueBack.position.z = -4.06;
  plaqueBack.rotation.y = Math.PI;
  g.add(plaqueBack);

  // 一对悬灯
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xffd29a, emissive: 0xffc878, emissiveIntensity: 0.6,
  });
  for (const x of [-2.5, 2.5]) {
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
      new THREE.MeshBasicMaterial({ color: 0x1a1610 }),
    );
    chain.position.set(x, 5.0, 4.0); g.add(chain);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lampMat);
    lamp.position.set(x, 4.55, 4.0); g.add(lamp);
  }

  // 引导地毯 (南面铺一块朱红, 引导玩家走近门)
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 5.5),
    new THREE.MeshBasicMaterial({ color: 0x8a2820, transparent: true, opacity: 0.75 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.62, 6.7);
  g.add(carpet);

  // 高悬叠匾 (顶上方)
  const overheadTex = makeOverheadTex('丹青館');
  const overhead = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.2),
    new THREE.MeshBasicMaterial({ map: overheadTex, transparent: true, depthWrite: false }),
  );
  overhead.position.set(0, 11.5, 0);
  overhead.userData.kind = 'overhead-label';
  // 让它始终朝向相机
  overhead.onBeforeRender = function (renderer, scene, cam) {
    overhead.lookAt(cam.position.x, overhead.position.y, cam.position.z);
  };
  g.add(overhead);

  // 馆内透出的暖光 (放在馆中心略上方)
  const lamp = new THREE.PointLight(0xffd29a, 1.0, 14, 1.6);
  lamp.position.set(0, 3.6, 0);
  g.add(lamp);

  return g;
}

function makePlaqueTex(text, opts = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const cx = c.getContext('2d');
  cx.fillStyle = '#1a0a06'; cx.fillRect(0, 0, 512, 128);
  cx.strokeStyle = '#d4a04a'; cx.lineWidth = 6; cx.strokeRect(8, 8, 496, 112);
  cx.fillStyle = '#f5d890';
  cx.font = 'bold 72px "STKaiti","KaiTi","Songti SC",serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(text, 256, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeOverheadTex(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 384;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  // 圆角朱漆牌
  const r = 40;
  ctx.fillStyle = 'rgba(170,42,30,0.94)';
  ctx.beginPath();
  ctx.moveTo(20 + r, 20);
  ctx.arcTo(c.width - 20, 20, c.width - 20, 20 + r, r);
  ctx.arcTo(c.width - 20, c.height - 20, c.width - 20 - r, c.height - 20, r);
  ctx.arcTo(20, c.height - 20, 20, c.height - 20 - r, r);
  ctx.arcTo(20, 20, 20 + r, 20, r);
  ctx.closePath();
  ctx.fill();
  // 金边
  ctx.strokeStyle = '#f5d890'; ctx.lineWidth = 8;
  ctx.stroke();
  // 文字
  ctx.fillStyle = '#fff5d8';
  ctx.font = 'bold 200px "STKaiti","KaiTi","Songti SC",serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 12);
  // sub
  ctx.font = '36px "STKaiti","Songti SC",serif';
  ctx.fillStyle = '#ffe2a8';
  ctx.fillText('自寫長安 · 按 F 入', c.width / 2, c.height - 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ───────── 室内 (远岛上的方厅) ───────── */

function buildInterior() {
  const g = new THREE.Group();
  g.name = 'DiyHallInterior';
  g.position.copy(INTERIOR_CENTER);

  const H = ROOM_H;
  const R = ROOM_HALF;

  // 地板 (青砖)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshLambertMaterial({ color: 0x6c4a2c }),
  );
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);

  // 天花
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, R * 2),
    new THREE.MeshLambertMaterial({ color: 0x2a1f16, side: THREE.BackSide }),
  );
  ceil.rotation.x = -Math.PI / 2;
  ceil.position.y = H;
  g.add(ceil);

  // ── 三面墙: 朝内侧贴 CanvasTexture ──

  // East (upload)
  _wallCanvases.upload  = document.createElement('canvas');
  _wallCanvases.upload.width  = 1024; _wallCanvases.upload.height = 640;
  _wallTextures.upload  = new THREE.CanvasTexture(_wallCanvases.upload);
  _wallTextures.upload.colorSpace = THREE.SRGBColorSpace;
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: _wallTextures.upload, side: THREE.DoubleSide }),
  );
  eastWall.position.set(R - 0.02, H / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  g.add(eastWall);

  // North (gen)
  _wallCanvases.gen     = document.createElement('canvas');
  _wallCanvases.gen.width = 1024; _wallCanvases.gen.height = 640;
  _wallTextures.gen     = new THREE.CanvasTexture(_wallCanvases.gen);
  _wallTextures.gen.colorSpace = THREE.SRGBColorSpace;
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: _wallTextures.gen, side: THREE.DoubleSide }),
  );
  northWall.position.set(0, H / 2, -R + 0.02);
  northWall.rotation.y = 0;
  g.add(northWall);

  // West (sign)
  _wallCanvases.sign    = document.createElement('canvas');
  _wallCanvases.sign.width = 1024; _wallCanvases.sign.height = 640;
  _wallTextures.sign    = new THREE.CanvasTexture(_wallCanvases.sign);
  _wallTextures.sign.colorSpace = THREE.SRGBColorSpace;
  const westWall = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2, H),
    new THREE.MeshBasicMaterial({ map: _wallTextures.sign, side: THREE.DoubleSide }),
  );
  westWall.position.set(-R + 0.02, H / 2, 0);
  westWall.rotation.y = Math.PI / 2;
  g.add(westWall);

  // South wall (入口 — 暗色 + 一块"丹青館"竖匾对内)
  const southMat = new THREE.MeshLambertMaterial({ color: 0xc7a574 });
  const southWall = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, H), southMat);
  southWall.position.set(0, H / 2, R - 0.02);
  southWall.rotation.y = Math.PI;
  g.add(southWall);

  // 中央桌 (生图案视觉强化)
  const tableMat = new THREE.MeshLambertMaterial({ color: 0x4a2c14 });
  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.2), tableMat);
  tabletop.position.set(0, 0.85, -R + 1.6);
  g.add(tabletop);
  for (const tx of [-1.0, 1.0]) for (const tz of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), tableMat);
    leg.position.set(tx, 0.42, -R + 1.6 + tz);
    g.add(leg);
  }
  // 桌上一张白纸 (示意"待画")
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xf4e8c8 }),
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, 0.92, -R + 1.6);
  g.add(paper);

  // 室内主光 + 三个 station 暖光
  const central = new THREE.PointLight(0xffe0b0, 1.4, 18, 1.2);
  central.position.set(0, H - 0.5, 0);
  g.add(central);
  for (const s of STATIONS) {
    const lamp = new THREE.PointLight(0xffd29a, 0.55, 8, 1.6);
    lamp.position.set(s.pos.x - INTERIOR_CENTER.x, H - 1.2, s.pos.z - INTERIOR_CENTER.z);
    g.add(lamp);
  }

  // 三个站点小立牌 (地面上的金色光圈 + 文字, 提示玩家走近)
  for (const s of STATIONS) {
    // 光圈
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0xd4a04a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.pos.x - INTERIOR_CENTER.x, 0.02, s.pos.z - INTERIOR_CENTER.z);
    g.add(ring);
    // 浮空文字
    const labTex = makePlaqueTex(s.label);
    const lab = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.30),
      new THREE.MeshBasicMaterial({ map: labTex, transparent: true, depthTest: false }),
    );
    lab.position.set(s.pos.x - INTERIOR_CENTER.x, 1.7, s.pos.z - INTERIOR_CENTER.z);
    lab.renderOrder = 9;
    lab.onBeforeRender = (renderer, scene, cam) => {
      lab.lookAt(cam.position.x, lab.position.y, cam.position.z);
    };
    g.add(lab);
  }

  // 顶上"丹青館"小匾
  const titleTex = makePlaqueTex('丹青館');
  const titleBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true }),
  );
  titleBoard.position.set(0, H - 0.5, R - 0.05);
  titleBoard.rotation.y = Math.PI;
  g.add(titleBoard);

  return g;
}

/* ───────── Station detection ───────── */

export function tickStations(playerWorldPos) {
  if (!_installed) return;
  let nearest = null, bestD = Infinity;
  for (const s of STATIONS) {
    const dx = s.pos.x - playerWorldPos.x;
    const dz = s.pos.z - playerWorldPos.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.5 && d < bestD) { bestD = d; nearest = s; }
  }
  _currentStation = nearest;

  const prompt = document.getElementById('doorPrompt');
  if (!prompt) return;
  if (nearest && !_modalOpen) {
    prompt.innerHTML = `<span class="kbd">E</span> ${nearest.prompt}`;
    prompt.classList.add('show');
  } else if (!nearest && !_modalOpen) {
    // 让正常的 doorPrompt clear 流程接手
    prompt.classList.remove('show');
  }
}

export function getCurrentStation() { return _currentStation; }
export function isModalOpen() { return _modalOpen; }

/* ───────── Interact ───────── */

export function interactWithCurrent() {
  if (_modalOpen) return false;
  if (!_currentStation) return false;
  if (_currentStation.id === 'upload') openUploadModal();
  else if (_currentStation.id === 'gen') openGenModal();
  else if (_currentStation.id === 'sign') openSignModal();
  return true;
}

/* ───────── 三个 modal ───────── */

function ensureModalCss() {
  if (document.getElementById('diy-hall-css')) return;
  const css = document.createElement('style');
  css.id = 'diy-hall-css';
  css.textContent = `
    .dh-modal-bg {
      position: fixed; inset: 0; z-index: 99990;
      background: rgba(15, 9, 4, 0.74);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Noto Serif SC', 'Songti SC', 'STKaiti', serif;
    }
    .dh-card {
      width: min(440px, 92vw);
      background: linear-gradient(180deg, #f5e8c8 0%, #ddc89a 100%);
      border: 2px solid #a8732a;
      border-radius: 4px;
      padding: 24px 28px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.4);
      color: #2c1810;
    }
    .dh-card h3 {
      margin: 0 0 6px; font-size: 22px;
      color: #6a2a1a; letter-spacing: 0.18em;
    }
    .dh-card .dh-sub {
      font-size: 11px; color: #6a4a2a; opacity: 0.8;
      letter-spacing: 0.18em; margin-bottom: 18px;
    }
    .dh-card input[type=text], .dh-card textarea, .dh-card input[type=file] {
      width: 100%; box-sizing: border-box;
      padding: 10px 12px;
      background: rgba(255,255,255,0.6);
      border: 1px solid #a8732a;
      color: #2c1810;
      font-family: inherit; font-size: 14px;
      border-radius: 3px;
      margin-bottom: 10px;
    }
    .dh-card textarea { min-height: 70px; resize: vertical; }
    .dh-row { display: flex; gap: 8px; margin-top: 4px; }
    .dh-btn {
      padding: 10px 16px; cursor: pointer;
      background: linear-gradient(180deg, #8a4a1c, #5a2a0c);
      color: #f5d890;
      border: 1px solid #d4a04a;
      font-family: inherit; letter-spacing: 0.16em;
      border-radius: 3px; font-size: 13px;
    }
    .dh-btn.ghost { background: transparent; color: #6a4a2a; border-color: #a8732a; }
    .dh-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
    .dh-status { font-size: 12px; color: #6a4a2a; margin-top: 10px; letter-spacing: 0.12em; min-height: 1.2em; }
  `;
  document.head.appendChild(css);
}

function showModal(html, onMount) {
  ensureModalCss();
  closeAnyModal();
  const wrap = document.createElement('div');
  wrap.id = 'dh-modal';
  wrap.className = 'dh-modal-bg';
  wrap.innerHTML = `<div class="dh-card">${html}</div>`;
  document.body.appendChild(wrap);
  _modalOpen = true;
  // 释放 pointer lock
  if (window.__fpsControls && window.__fpsControls.isLocked) window.__fpsControls.unlock();
  if (window.fpsControls && window.fpsControls.isLocked) window.fpsControls.unlock();

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); e.preventDefault();
      closeAnyModal();
    }
  };
  document.addEventListener('keydown', escHandler, true);
  wrap._escHandler = escHandler;
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) closeAnyModal();
  });
  if (onMount) onMount(wrap);
}

function closeAnyModal() {
  const wrap = document.getElementById('dh-modal');
  if (wrap) {
    if (wrap._escHandler) document.removeEventListener('keydown', wrap._escHandler, true);
    wrap.remove();
  }
  _modalOpen = false;
}

function openUploadModal() {
  showModal(`
    <h3>上傳壁</h3>
    <div class="dh-sub">UPLOAD · 把照片挂到东墙</div>
    <input type="file" id="dh-upload-file" accept="image/*">
    <input type="text"  id="dh-upload-title" placeholder="给这张画起个名字 (可选)" maxlength="30">
    <div class="dh-row">
      <button class="dh-btn" id="dh-upload-confirm">挂上墙</button>
      <button class="dh-btn ghost" id="dh-cancel">取消 · Esc</button>
    </div>
    <div class="dh-status" id="dh-status"></div>
  `, (wrap) => {
    wrap.querySelector('#dh-cancel').onclick = closeAnyModal;
    wrap.querySelector('#dh-upload-confirm').onclick = async () => {
      const fileEl = wrap.querySelector('#dh-upload-file');
      const titleEl = wrap.querySelector('#dh-upload-title');
      const statusEl = wrap.querySelector('#dh-status');
      const f = fileEl.files?.[0];
      if (!f) { statusEl.textContent = '先选张图片'; return; }
      if (!f.type.startsWith('image/')) { statusEl.textContent = '不是图片文件'; return; }
      statusEl.textContent = '读取中…';
      try {
        const dataUrl = await fileToDataUrl(f);
        addArtwork({
          src: dataUrl,
          title: (titleEl.value || f.name.replace(/\.[^.]+$/, '')).slice(0, 30),
          mode: 'upload',
        });
        paintUploadWall();
        statusEl.textContent = '✅ 已挂上墙';
        setTimeout(closeAnyModal, 850);
      } catch (e) {
        statusEl.textContent = '上传失败: ' + e.message;
      }
    };
  });
}

function openGenModal() {
  showModal(`
    <h3>生圖案</h3>
    <div class="dh-sub">TEXT-TO-IMAGE · 一句话写一幅</div>
    <textarea id="dh-gen-prompt" placeholder="例: 唐风山水 · 雪夜灯火"></textarea>
    <div class="dh-row">
      <button class="dh-btn" id="dh-gen-confirm">提筆</button>
      <button class="dh-btn ghost" id="dh-cancel">取消 · Esc</button>
    </div>
    <div class="dh-status" id="dh-status"></div>
  `, (wrap) => {
    wrap.querySelector('#dh-cancel').onclick = closeAnyModal;
    wrap.querySelector('#dh-gen-confirm').onclick = async () => {
      const promptEl = wrap.querySelector('#dh-gen-prompt');
      const statusEl = wrap.querySelector('#dh-status');
      const prompt = promptEl.value.trim();
      if (!prompt) { statusEl.textContent = '先写几个字'; return; }
      statusEl.textContent = 'AI 正在提笔…';
      try {
        const dataUrl = await aiGenerateImage(prompt);
        addArtwork({ src: dataUrl, title: prompt.slice(0, 24), mode: 'ai', prompt });
        paintGenWall();
        statusEl.textContent = '🖌 已挂上墙';
        setTimeout(closeAnyModal, 850);
      } catch (e) {
        statusEl.textContent = '生图失败: ' + e.message;
      }
    };
  });
}

function openSignModal() {
  showModal(`
    <h3>題款壁</h3>
    <div class="dh-sub">SIGN · 在西墙落款</div>
    <input type="text" id="dh-sign-name" placeholder="你的名号 (任意)" maxlength="20">
    <textarea id="dh-sign-text" placeholder="一句话留念 (≤30 字)" maxlength="30"></textarea>
    <div class="dh-row">
      <button class="dh-btn" id="dh-sign-confirm">落款</button>
      <button class="dh-btn ghost" id="dh-cancel">取消 · Esc</button>
    </div>
    <div class="dh-status" id="dh-status"></div>
  `, (wrap) => {
    wrap.querySelector('#dh-cancel').onclick = closeAnyModal;
    wrap.querySelector('#dh-sign-confirm').onclick = () => {
      const nameEl = wrap.querySelector('#dh-sign-name');
      const textEl = wrap.querySelector('#dh-sign-text');
      const statusEl = wrap.querySelector('#dh-status');
      const name = (nameEl.value || '匿名').trim().slice(0, 12);
      const text = textEl.value.trim();
      if (!text) { statusEl.textContent = '题一句话再走'; return; }
      addSignature({ name, text });
      paintSignWall();
      statusEl.textContent = '✍️ 已落款';
      setTimeout(closeAnyModal, 850);
    };
  });
}

/* ───────── 工具 ───────── */

function fileToDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

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
    if (j.url)     return j.url;
    throw new Error('endpoint returned no image');
  }
  return await stubTangPainting(prompt);
}

async function stubTangPainting(prompt) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 576;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#f4e8c8');
  grad.addColorStop(1, '#d4b888');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
  let h = 0;
  for (const ch of prompt) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const accent = `hsl(${hue}, 55%, 35%)`;
  const ink = `hsl(${(hue + 180) % 360}, 30%, 18%)`;
  // 远山
  ctx.fillStyle = accent; ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.moveTo(0, c.height * 0.55);
  for (let x = 0; x < c.width; x += 30) {
    const y = c.height * 0.55 - (Math.sin(x * 0.012 + hue) * 60 + ((h + x) % 30));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(c.width, c.height); ctx.lineTo(0, c.height); ctx.fill();
  ctx.globalAlpha = 1;
  // 树丛
  ctx.fillStyle = ink;
  for (let i = 0; i < 12; i++) {
    const tx = (i / 12) * c.width + Math.sin(i + hue) * 20;
    const ty = c.height * 0.62 + Math.cos(i + hue) * 10;
    ctx.beginPath();
    ctx.arc(tx, ty, 14 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 题字
  ctx.fillStyle = '#3a1810';
  ctx.font = 'bold 38px "STKaiti","Songti SC",serif';
  ctx.textAlign = 'right';
  ctx.fillText(prompt.slice(0, 12), c.width - 30, 64);
  ctx.font = '20px "STKaiti","Songti SC",serif';
  ctx.fillText(new Date().getFullYear() + ' · 长安丹青馆', c.width - 30, 96);
  // 朱印
  ctx.fillStyle = '#8a2818';
  ctx.fillRect(c.width - 86, 110, 50, 50);
  ctx.fillStyle = '#f5d890';
  ctx.font = 'bold 16px "STKaiti","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.fillText('长安', c.width - 61, 132);
  ctx.fillText('丹青', c.width - 61, 152);
  return c.toDataURL('image/png');
}

/* ───────── Public API ───────── */

export function install({ scene, gameState }) {
  if (_installed) return;
  _scene = scene;
  _gameState = gameState;

  _exteriorGroup = buildExterior();
  _exteriorGroup.position.copy(EXTERIOR_POS);
  // 房屋朝南 (开口对着玩家从 0,0,-40 北上方向)
  _exteriorGroup.rotation.y = 0;
  scene.add(_exteriorGroup);

  _interiorGroup = buildInterior();
  scene.add(_interiorGroup);

  paintAllWalls();

  // 刷新墙面: 玩家从云廊 / 拍立得 / atelier 其他入口创建画作时
  window.addEventListener('han-atelier-artwork-added', () => {
    paintUploadWall(); paintGenWall();
  });

  _installed = true;
  console.info('[DiyHall] installed · exterior at', EXTERIOR_POS, '· interior at', INTERIOR_CENTER);
}

/** GALLERY_DOORS 注册项 */
export const DIY_DOOR = Object.freeze({
  id: 'diyhall',
  pos: DOOR_POS.clone(),
  label: '丹青館',
});

/** GALLERIES 注册项 — buildGalleryRoom 应识别 isDiyHall=true 跳过自身渲染 */
export const DIY_GALLERY_DEF = Object.freeze({
  title: '丹青館 · 自寫一幅',
  center: INTERIOR_CENTER.clone(),
  halfSize: ROOM_HALF,
  isDiyHall: true,
});

/** enterGallery('diyhall') 时调 */
export function beginEnter() {
  paintAllWalls();
  _currentStation = null;
}

/** exitGallery() 离开 diyhall 时调 */
export function beginExit() {
  closeAnyModal();
  _currentStation = null;
}

/** 让玩家"瞬移"到丹青馆门口 (gameState 已活才有意义) */
export function teleportPlayerToDoor() {
  if (!window.gameState || !window.gameState.active) return false;
  window.gameState.pos.set(DOOR_POS.x, 0.05, DOOR_POS.z - 6);  // 站门外 6m
  window.gameState.facing = 0;  // 朝北
  if (window.gameState.player) {
    window.gameState.player.position.copy(window.gameState.pos);
  }
  if (typeof window.showGameToast === 'function') {
    window.showGameToast('已传送至丹青馆 · 走入按 F 进门 · 三面墙按 E 互动', 3500);
  }
  return true;
}

/**
 * 统一入口: 老 atelier 按钮 / 语音指令 / onboarding pill / URL ?action=atelier 都接到这里.
 * 流程:
 *   - 已在 WASD 游戏中  → 传送到丹青馆门口, 提示走入
 *   - 未在 WASD 游戏中  → 把 CTA 按钮 (走进长安) 触发, 并设 pending → 等 startGame 一完就自动传送
 */
let _pendingTeleport = false;

export function gotoDiyHall() {
  if (window.gameState && window.gameState.active) {
    return teleportPlayerToDoor();
  }
  // 未启动 WASD: 触发 CTA + 设置 pending
  _pendingTeleport = true;
  const cta =
    document.querySelector('.enter-game-cta') ||
    document.getElementById('enter-game-cta') ||
    document.getElementById('gameBtn');
  if (cta) {
    cta.click();
    if (typeof window.showGameToast === 'function') {
      window.showGameToast('选好角色后将自动前往 丹青館 (大明宫东侧)', 4500);
    }
    return true;
  }
  if (typeof window.showGameToast === 'function') {
    window.showGameToast('请先 "走进长安" · 然后走到大明宫东侧找 丹青館', 4000);
  }
  return false;
}

/**
 * scene.js startGame 末尾调一下: 如果有 pending teleport, 等渲染稳定后传送.
 */
export function consumePendingTeleport() {
  if (!_pendingTeleport) return false;
  _pendingTeleport = false;
  // 等 startGame 完成的相机/玩家初始化, 600ms 后再 teleport
  setTimeout(() => teleportPlayerToDoor(), 800);
  return true;
}

/** 暴露 paintAllWalls 供外部 (画作变动时) */
export function refreshWalls() { paintAllWalls(); }
