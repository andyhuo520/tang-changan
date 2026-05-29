/**
 * Diegetic UI — 全场景嵌入式控件
 *
 * 替代漂浮 HTML 浮窗, 把所有功能做成场景里的 3D 道具:
 *   - 朱雀门 5 块横匾  → 时代切换 (贞观 / 永徽 / 开元 / 天宝 / 元和)
 *   - 入口长安舆图青铜沙盘 → 19 节点 = 快速传送
 *   - 三足铜鼎 → 全城 / 环绕 / 无人机 三种相机模式
 *   - 日晷 → 时辰滚动
 *   - 每 hero 坊上方金匾 → hover 发光, click 传送
 *
 * 所有 click 走单一 raycaster (pointerdown), 不依赖 OrbitControls.
 *
 * 用法:
 *   import { installDiegeticUI } from './world/diegetic-ui.js';
 *   const dUI = installDiegeticUI({ scene, camera, renderer, world });
 */

import * as THREE from 'three';
import { worldBounds } from './grid.js';
import { buildVoiceBell, showPersonaRing, notifyVoiceState } from './voice-bell.js?v=20260526-v31';
import { buildAtelierProp, openAtelier } from './atelier.js?v=20260526-v31';
import { buildGalleryHall, openGalleryHall } from './gallery-hall.js?v=20260526-v37';

/* ─────────────────────────── 配置 / 数据 ─────────────────────────── */

const PAL = {
  bronze:       0x6b4a23,
  bronzeHi:     0xb38641,
  jade:         0x7aa68c,
  gold:         0xd4a554,
  goldHi:       0xf2cf80,
  redLacquer:   0xa8332f,
  redLacquerHi: 0xd35c5c,
  ink:          0x231a13,
  stoneBase:    0x5a544a,
  parchment:    0xeed7a8,
};

/** 5 时代 — 显示文字 + 数据 id (与 tour-ui 的 era 一致) */
const ERAS = [
  { id: 'zhenguan', short: '贞观', year: '627-649', tone: 'cool',    sky: 0xbfd0d8, sun: 0.55, hemi: 0.35 },
  { id: 'yonghui',  short: '永徽', year: '650-655', tone: 'cool',    sky: 0xc4d4dc, sun: 0.58, hemi: 0.38 },
  { id: 'kaiyuan',  short: '开元', year: '713-741', tone: 'balance', sky: 0xcad9df, sun: 0.60, hemi: 0.40 },
  { id: 'tianbao',  short: '天宝', year: '742-756', tone: 'warm',    sky: 0xd8c8a8, sun: 0.62, hemi: 0.38 },
  { id: 'yuanhe',   short: '元和', year: '806-820', tone: 'dim',     sky: 0xb8b8a8, sun: 0.48, hemi: 0.30 },
];

/** 19 景 — 坊 id + 显示名 (用于沙盘节点) */
const KEY_REGIONS = [
  { id: 'region-daming',      zh: '大明宫',     district: 'palace' },
  { id: 'region-taiji',       zh: '太极宫',     district: 'palace' },
  { id: 'region-xingqing',    zh: '兴庆宫',     district: 'palace' },
  { id: 'region-huangcheng',  zh: '皇城',       district: 'office' },
  { id: 'region-east-market', zh: '东市',       district: 'market' },
  { id: 'region-west-market', zh: '西市',       district: 'market' },
  { id: 'region-qujiang',     zh: '曲江·芙蓉园', district: 'garden' },
  { id: 'ward-pingkang',      zh: '平康坊',     district: 'culture' },
  { id: 'ward-jinchang',      zh: '进昌坊',     district: 'culture' },
  { id: 'ward-chongren',      zh: '崇仁坊',     district: 'culture' },
  { id: 'ward-xinchang',      zh: '新昌坊',     district: 'culture' },
  { id: 'ward-yankang',       zh: '延康坊',     district: 'culture' },
  { id: 'ward-chongye',       zh: '崇业坊',     district: 'culture' },
  { id: 'ward-yongxing',      zh: '永兴坊',     district: 'residential' },
  { id: 'ward-xiuzhen',       zh: '修真坊',     district: 'residential' },
  { id: 'ward-wuben',         zh: '务本坊',     district: 'residential' },
  { id: 'ward-huaiyuan',      zh: '怀远坊',     district: 'residential' },
  { id: 'ward-xuanyang',      zh: '宣阳坊',     district: 'residential' },
  { id: 'ward-zhaoguo',       zh: '昭国坊',     district: 'residential' },
];

const DISTRICT_DOT = {
  palace:      0xd4a554,
  office:      0xb89870,
  market:      0xa8332f,
  garden:      0x7aa68c,
  culture:     0x9b7cc7,
  residential: 0x88a0c0,
};

const CAM_MODES = [
  { id: 'overview', short: '全城', desc: '俯瞰',     ang:  Math.PI * 0     },
  { id: 'orbit',    short: '环绕', desc: '环绕',     ang:  Math.PI * 2/3   },
  { id: 'drone',    short: '飞行', desc: '无人机',   ang:  Math.PI * 4/3   },
];

/* ─────────────────────────── 共用 helper ─────────────────────────── */

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

/** Canvas → Texture, 古籍朱色 / 隶书 */
function makeTextTexture(text, opts = {}) {
  const {
    w = 512, h = 128,
    bg = '#2a1810',
    fg = '#e7c87a',
    font = `bold ${Math.floor(h * 0.5)}px "Noto Serif SC", "STSong", serif`,
    border = '#d4a554',
  } = opts;

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // 木质底纹
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, bg);
  grd.addColorStop(0.5, '#3a2418');
  grd.addColorStop(1, bg);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);

  // 描金边
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  }

  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 6;
  ctx.fillText(text, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** 一块横匾 (匾额) — Group, 朝向 -z (面向南来访的游客) */
function makePlaque({ text, w = 9, h = 2.6, depth = 0.4, sub = '' }) {
  const g = new THREE.Group();

  // 主板 (朱漆木板 + 金字)
  const tex = makeTextTexture(text, { w: 1024, h: 256 });
  const front = new THREE.MeshLambertMaterial({ map: tex });
  const side = mat(0x4a2a1a);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, depth),
    [side, side, side, side, front, side],
  );
  board.castShadow = board.receiveShadow = true;
  g.add(board);

  // 描金边框
  const trim = mat(PAL.gold);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.18, depth + 0.15), trim);
  top.position.y = h / 2 + 0.1;
  const bot = top.clone();
  bot.position.y = -h / 2 - 0.1;
  g.add(top); g.add(bot);

  // 副字 (年号)
  if (sub) {
    const subTex = makeTextTexture(sub, {
      w: 512, h: 64, font: 'italic 32px "Noto Serif SC", serif', bg: '#2a1810', fg: '#c79850', border: null,
    });
    const subMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.6, 0.6),
      new THREE.MeshBasicMaterial({ map: subTex, transparent: true }),
    );
    subMesh.position.set(0, -h / 2 - 0.7, depth / 2 + 0.01);
    g.add(subMesh);
  }

  g.userData.plaqueText = text;
  return g;
}

/* ─────────────────────────── 朱雀门 5 块横匾 ─────────────────────────── */

function buildEraPlaques(parent, clickReg) {
  const grp = new THREE.Group();
  grp.name = 'EraPlaques';

  const b = worldBounds();
  // 朱雀门正南, 城墙外的入口广场上空
  const z = b.maxZ + 25;
  const yBase = 60;
  const gap = 56;
  const PLAQUE_W = 44;
  const PLAQUE_H = 16;

  ERAS.forEach((era, i) => {
    const plaque = makePlaque({ text: era.short, sub: era.year, w: PLAQUE_W, h: PLAQUE_H, depth: 2.2 });
    plaque.position.set((i - 2) * gap, yBase, z);
    plaque.lookAt(plaque.position.x, yBase - 6, b.minZ);
    plaque.userData.kind = 'era';
    plaque.userData.eraId = era.id;
    plaque.userData.era = era;
    // 让 board 略发光以便在阴暗背景下也鲜艳
    plaque.traverse((c) => {
      if (c.isMesh && c.material?.emissive) {
        c.material.emissive.setHex(0x2a1606);
      }
    });
    clickReg(plaque, era);

    // 悬挂的金链
    for (const dx of [-16, 16]) {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 32, 6),
        mat(PAL.bronzeHi),
      );
      chain.position.set(plaque.position.x + dx, yBase + 24, z);
      grp.add(chain);
    }
    grp.add(plaque);
  });

  // 顶部桁架 (横跨 5 匾)
  const beamW = ERAS.length * gap + 40;
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(beamW, 4.5, 5),
    mat(PAL.redLacquer, { emissive: 0x441010, emissiveIntensity: 0.25 }),
  );
  beam.position.set(0, yBase + 40, z);
  grp.add(beam);

  // 两端柱 (朱漆 + 金顶)
  for (const dx of [-beamW / 2, beamW / 2]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(5, 90, 5),
      mat(PAL.redLacquer, { emissive: 0x441010, emissiveIntensity: 0.2 }),
    );
    post.position.set(dx, 45, z);
    grp.add(post);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 7, 6),
      mat(PAL.gold, { emissive: 0x583a18, emissiveIntensity: 0.4 }),
    );
    cap.position.set(dx, 94, z);
    grp.add(cap);
  }

  // 朱雀门匾顶部加一行小字 (朱雀门)
  const titleTex = makeTextTexture('朱 雀 门  ·  五 代 风 华', {
    w: 1024, h: 96, font: 'bold 56px "Noto Serif SC", serif',
    bg: '#3a1810', fg: '#f0d690', border: '#d4a554',
  });
  const titleTag = new THREE.Mesh(
    new THREE.PlaneGeometry(beamW * 0.7, 7),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true }),
  );
  titleTag.position.set(0, yBase + 49, z + 2.6);
  grp.add(titleTag);

  parent.add(grp);
  return grp;
}

/* ─────────────────────────── 入口长安舆图青铜沙盘 ─────────────────────────── */

function buildBronzeMap(parent, clickReg, world) {
  const grp = new THREE.Group();
  grp.name = 'BronzeMap';

  const b = worldBounds();
  // 沙盘放在南墙外的入口广场
  const baseX = 0, baseZ = b.maxZ + 70;
  const tableW = 160, tableD = 80, tableH = 4;

  // 储存所有 ward node 的世界坐标 (供 closest-node fallback)
  const nodes = [];

  // 石基座
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(tableW + 16, tableH, tableD + 16),
    mat(PAL.stoneBase),
  );
  base.position.set(baseX, tableH / 2, baseZ);
  base.receiveShadow = true;
  grp.add(base);

  // 青铜桌面 (微凹仿沙盘) — 也注册为可点击, click handler 找最近的坊节点
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(tableW, 2, tableD),
    mat(PAL.bronze),
  );
  top.position.set(baseX, tableH + 1, baseZ);
  grp.add(top);

  // 沙盘边框雕刻 (金漆)
  for (const [w, d, x, z] of [
    [tableW + 2, 1.2, 0, -tableD / 2],
    [tableW + 2, 1.2, 0,  tableD / 2],
    [1.2, tableD + 2, -tableW / 2, 0],
    [1.2, tableD + 2,  tableW / 2, 0],
  ]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w, 1.2, d),
      mat(PAL.gold),
    );
    edge.position.set(baseX + x, tableH + 2.2, baseZ + z);
    grp.add(edge);
  }

  // 在沙盘上根据 ward 真实坐标摆 19 个铜点
  const cityW = b.maxX - b.minX;
  const cityD = b.maxZ - b.minZ;
  const scaleX = (tableW - 12) / cityW;
  const scaleZ = (tableD - 12) / cityD;

  KEY_REGIONS.forEach((r) => {
    const center = world?.centerOf?.(r.id);
    if (!center) return;
    const px = baseX + center.x * scaleX;
    const pz = baseZ + center.z * scaleZ;
    const py = tableH + 2 + 0.6;

    // 节点本体: 短柱头 + 金顶 (放大以便容易点击)
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 3.6, 10),
      mat(DISTRICT_DOT[r.district] || 0xa67c4a),
    );
    stem.position.set(px, py + 1.8, pz);
    stem.userData.kind = 'map-node';
    stem.userData.wardId = r.id;
    stem.userData.wardName = r.zh;
    clickReg(stem, r); // stem 也可点

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 4.5, 14),
      mat(PAL.gold, { emissive: 0x6a3a14, emissiveIntensity: 0.6 }),
    );
    cap.position.set(px, py + 5.8, pz);
    cap.userData.kind = 'map-node';
    cap.userData.wardId = r.id;
    cap.userData.wardName = r.zh;
    clickReg(cap, r);
    grp.add(stem);
    grp.add(cap);

    // 记录节点位置以便点击桌面时找最近 ward
    nodes.push({ wardId: r.id, wardName: r.zh, px, pz });

    // 文字铭牌, 贴在桌面
    const tex = makeTextTexture(r.zh, {
      w: 256, h: 64,
      bg: 'rgba(58,40,24,0.92)',
      fg: '#f2d68b',
      font: 'bold 36px "Noto Serif SC", serif',
      border: '#d4a554',
    });
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    tag.position.set(px, py + 0.15, pz + 3);
    tag.rotation.x = -Math.PI / 2;
    grp.add(tag);
  });

  // 把青铜桌面注册为 click 接收器, hit 后找最近的 ward 触发 goto
  top.userData.kind = 'bronze-map-surface';
  top.userData.nodes = nodes;
  top.userData.baseX = baseX;
  top.userData.baseZ = baseZ;
  clickReg(top, { surface: true });

  // "長安輿圖"主匾, 在沙盘南端立起来 (即 baseZ + tableD/2 + 6)
  const titlePlaque = makePlaque({ text: '長安輿圖', sub: '十九景速跳', w: 56, h: 16, depth: 2 });
  titlePlaque.position.set(baseX, 24, baseZ + tableD / 2 + 6);
  titlePlaque.rotation.y = Math.PI; // +Z 朝向南来访者
  grp.add(titlePlaque);

  // 支柱
  for (const dx of [-28, 28]) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.6, 32, 12),
      mat(PAL.bronze),
    );
    pillar.position.set(baseX + dx, 16, baseZ + tableD / 2 + 6);
    grp.add(pillar);
  }

  parent.add(grp);
  return grp;
}

/* ─────────────────────────── 三足铜鼎 (相机模式) ─────────────────────────── */

function buildCameraDing(parent, clickReg, currentMode = 'orbit') {
  const grp = new THREE.Group();
  grp.name = 'CameraDing';

  const b = worldBounds();
  // 放在沙盘东侧, 入口广场上
  const x = 200, z = b.maxZ + 50;
  const SCALE = 5;

  // 石基
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(4 * SCALE, 4.5 * SCALE, 1 * SCALE, 16),
    mat(PAL.stoneBase),
  );
  base.position.set(x, 0.5 * SCALE, z);
  grp.add(base);

  // 鼎腹
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4 * SCALE, 2.8 * SCALE, 3.2 * SCALE, 24),
    mat(PAL.bronze),
  );
  body.position.set(x, 2.6 * SCALE, z);
  grp.add(body);

  // 鼎口边沿
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.5 * SCALE, 0.18 * SCALE, 8, 24),
    mat(PAL.bronzeHi),
  );
  rim.position.set(x, 4.2 * SCALE, z);
  rim.rotation.x = Math.PI / 2;
  grp.add(rim);

  // 两耳
  for (const dx of [-2.6 * SCALE, 2.6 * SCALE]) {
    const ear = new THREE.Mesh(
      new THREE.TorusGeometry(0.45 * SCALE, 0.12 * SCALE, 6, 12, Math.PI),
      mat(PAL.bronzeHi),
    );
    ear.position.set(x + dx, 4.3 * SCALE, z);
    ear.rotation.z = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
    grp.add(ear);
  }

  // 三足
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const fx = Math.cos(ang) * 2.0 * SCALE;
    const fz = Math.sin(ang) * 2.0 * SCALE;
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * SCALE, 0.42 * SCALE, 1.8 * SCALE, 8),
      mat(PAL.bronze),
    );
    foot.position.set(x + fx, 1.05 * SCALE, z + fz);
    grp.add(foot);
  }

  // 三面"模式牌" — 立柱 + 牌
  CAM_MODES.forEach((m, i) => {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const px = x + Math.cos(ang) * 5.5 * SCALE;
    const pz = z + Math.sin(ang) * 5.5 * SCALE;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 36, 8),
      mat(PAL.bronze),
    );
    post.position.set(px, 18, pz);
    grp.add(post);

    const tag = makePlaque({ text: m.short, sub: m.desc, w: 12, h: 5.4, depth: 0.8 });
    tag.position.set(px, 40, pz);
    tag.lookAt(x, 40, z); // 朝向鼎中心
    tag.userData.kind = 'cam-mode';
    tag.userData.modeId = m.id;
    tag.userData.mode = m;
    clickReg(tag, m);
    grp.add(tag);
  });

  parent.add(grp);
  return grp;
}

/* ─────────────────────────── 进城牌坊 (替代金色 CTA) ─────────────────────────── */

function buildEntryGate(parent, clickReg) {
  const grp = new THREE.Group();
  grp.name = 'EntryGate';
  grp.userData.kind = 'enter-game';

  const b = worldBounds();
  // 放在沙盘正前 (正南广场中央), z 更近相机, 让它视觉主导
  // 避开 era 匾 (z=b.maxZ+25, y=60) 和铜鼎 (z=b.maxZ+50) 的射线范围
  const x = 0, z = b.maxZ + 140;

  // 朱漆牌坊三间四柱 — 加大尺寸让它在屏幕上占主导
  const postH = 80;
  const postR = 2.4;
  const POSTS_X = [-40, -14, 14, 40];
  for (const dx of POSTS_X) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postR, postR * 1.1, postH, 10),
      mat(PAL.redLacquer, { emissive: 0x441010, emissiveIntensity: 0.25 }),
    );
    post.position.set(x + dx, postH / 2, z);
    post.userData.kind = 'enter-game';
    grp.add(post);

    // 柱头朱漆斗拱
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(postR * 3.6, postR * 1.5, postR * 2.4),
      mat(PAL.gold, { emissive: 0x583a18, emissiveIntensity: 0.35 }),
    );
    cap.position.set(x + dx, postH + postR, z);
    cap.userData.kind = 'enter-game';
    grp.add(cap);
  }

  // 顶部三道横梁 (主梁/中梁/上梁)
  for (const [yOff, w, color] of [
    [0,   72, PAL.redLacquer],
    [6,   72, PAL.gold],
    [12,  76, PAL.redLacquer],
  ]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(w, 3, 4),
      mat(color, { emissive: 0x331010, emissiveIntensity: 0.2 }),
    );
    beam.position.set(x, postH + yOff, z);
    beam.userData.kind = 'enter-game';
    grp.add(beam);
  }

  // 屋顶飞檐 (用 6 个朱漆三角)
  for (const dx of [-30, -10, 10, 30]) {
    const eave = new THREE.Mesh(
      new THREE.ConeGeometry(4, 8, 4),
      mat(PAL.gold, { emissive: 0x4a2a10, emissiveIntensity: 0.35 }),
    );
    eave.position.set(x + dx, postH + 22, z);
    eave.rotation.y = Math.PI / 4;
    eave.userData.kind = 'enter-game';
    grp.add(eave);
  }

  // 中央大匾"走進長安"(可点)
  const mainPlaque = makePlaque({
    text: '走 進 長 安',
    sub: '按 WASD · 操控角色 · 按 E 對話',
    w: 36, h: 11, depth: 1.6,
  });
  mainPlaque.position.set(x, postH * 0.5, z + 0.5);
  mainPlaque.rotation.y = Math.PI; // face south访客
  mainPlaque.userData.kind = 'enter-game';
  mainPlaque.traverse((c) => {
    if (c.isMesh) {
      c.userData.kind = 'enter-game';
      if (c.material?.emissive) {
        c.material.emissive.setHex(0x4a2a10);
        c.material.emissiveIntensity = 0.5;
      }
    }
  });
  grp.add(mainPlaque);

  // 牌坊基座
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(78, 2, 8),
    mat(PAL.stoneBase),
  );
  base.position.set(x, 1, z);
  base.userData.kind = 'enter-game';
  grp.add(base);

  // 一对石狮(简化几何)
  for (const dx of [-40, 40]) {
    const lionBody = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 6),
      mat(0x9a8a72),
    );
    lionBody.position.set(x + dx, 4, z + 4);
    lionBody.userData.kind = 'enter-game';
    grp.add(lionBody);
    const lionHead = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 10),
      mat(0xa8987a),
    );
    lionHead.position.set(x + dx, 7, z + 5.5);
    lionHead.userData.kind = 'enter-game';
    grp.add(lionHead);
  }

  // 整个组注册可点 (registerClickable 会遍历所有子 mesh)
  clickReg(grp, { id: 'enter-game' });

  parent.add(grp);
  return grp;
}

/* ─────────────────────────── 每 hero 坊上方金匾 ─────────────────────────── */

function buildWardLabels(parent, clickReg, world) {
  const grp = new THREE.Group();
  grp.name = 'WardLabels';

  KEY_REGIONS.forEach((r) => {
    const center = world?.centerOf?.(r.id);
    if (!center) return;

    const plaque = makePlaque({ text: r.zh, w: 36, h: 10, depth: 1.5 });
    plaque.position.set(center.x, 80, center.z);
    plaque.userData.kind = 'ward-label';
    plaque.userData.wardId = r.id;
    plaque.userData.wardName = r.zh;
    plaque.userData.__baseY = 80;
    clickReg(plaque, r);
    grp.add(plaque);
  });

  // 跟随相机水平面旋转, 但不仰俯
  grp.userData.tick = (camera) => {
    grp.children.forEach((p) => {
      p.lookAt(camera.position.x, p.position.y, camera.position.z);
    });
  };

  parent.add(grp);
  return grp;
}

/* ─────────────────────────── 主入口 ─────────────────────────── */

export function installDiegeticUI({ scene, camera, renderer, world, controls } = {}) {
  scene = scene || window.scene;
  camera = camera || window.camera;
  renderer = renderer || window.renderer;
  world = world || window.world;
  controls = controls || window.controls;

  if (!scene || !camera || !renderer) {
    console.warn('[DiegeticUI] missing scene/camera/renderer, abort');
    return null;
  }

  injectHideV1Styles();

  // 强制触发一次 resize 让 v1 的 handleResize 重算 canvas buffer
  // (隐藏侧栏后 .stage clientWidth 才会扩到全屏)
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  });

  const root = new THREE.Group();
  root.name = 'DiegeticUI';
  scene.add(root);

  /* ----------- raycaster click 总线 ----------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clickables = new Map(); // mesh.uuid → { meta, handler }
  let hovered = null;

  function registerClickable(mesh, meta, handler) {
    if (handler === undefined) {
      // 默认 handler 根据 kind 派发
      handler = (m, e) => defaultHandler(m, e);
    }
    // 注册所有子 mesh 的 uuid → meta, 让 raycaster 能命中描金边等子组件
    const root = mesh;
    root.traverse((child) => {
      if (child.isMesh) {
        clickables.set(child.uuid, { rootMesh: root, meta, handler });
      }
    });
  }

  function defaultHandler(rootMesh, event) {
    const kind = rootMesh.userData.kind;
    if (kind === 'era')        return setEra(rootMesh.userData.eraId);
    if (kind === 'map-node')   return goto(rootMesh.userData.wardId, { deep: true });
    if (kind === 'cam-mode')   return setCameraMode(rootMesh.userData.modeId);
    if (kind === 'ward-label') return goto(rootMesh.userData.wardId, { deep: true });
    if (kind === 'enter-game') return enterGameMode();
    if (kind === 'bronze-map-surface') return handleMapSurfaceClick(rootMesh, event);
    if (kind === 'voice-bell') { showPersonaRing(); return; }
    if (kind === 'gallery-hall') {
      const targetGallery = rootMesh?.userData?.galleryId || null;
      if (typeof window.openGalleryHall === 'function') return window.openGalleryHall(targetGallery ? { galleryId: targetGallery } : {});
      console.warn('[DiegeticUI] gallery-hall not ready');
      return;
    }
    if (kind === 'atelier-portal') {
      // 重设计后: 丹青馆 在大明宫边墙 (走 WASD 进入), 点 v2 鸟瞰中的旧 prop 改为传送+CTA
      if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
        return window.DiyHall.gotoDiyHall();
      }
      if (typeof window.openAtelier === 'function') return window.openAtelier();
      console.warn('[DiegeticUI] atelier not ready');
      return;
    }
  }

  /** 点到青铜沙盘表面 — 找最近的坊触发 goto */
  function handleMapSurfaceClick(surfaceMesh, event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(surfaceMesh, false);
    if (!hits.length) return;
    const p = hits[0].point;
    const nodes = surfaceMesh.userData.nodes || [];
    let best = null, bestD = Infinity;
    for (const n of nodes) {
      const dx = n.px - p.x, dz = n.pz - p.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = n; }
    }
    if (best) {
      showToast(`点中沙盘 → 最近: ${best.wardName}`, 1600);
      setTimeout(() => goto(best.wardId, { deep: true }), 220);
    }
  }

  /** 触发 v1 第一视角游戏模式 — 显示 v1 村落 + 调用 gameBtn */
  function enterGameMode() {
    showToast('走进长安 · 按 WASD 操控 · 按 E 对话', 4000);

    // 1) 让 v1 村落重见天日(它持有所有 NPC/语音/画廊/小游戏)
    if (window.village) {
      window.village.visible = true;
      console.info('[DiegeticUI] v1 village now visible (entering game mode)');
    }

    // 2) 把雾恢复, 让 v1 内部更有氛围 (v2 鸟瞰下我们关了 fog)
    if (window.scene && !window.scene.fog) {
      window.scene.fog = new THREE.Fog(0x1a1208, 60, 280);
    }

    // 3) 隐藏 diegetic UI 道具(进城后不需要这些大牌坊在第一视角里)
    if (root) root.visible = false;

    // 4) 触发 v1 的进入游戏流程
    const ctaBtn = document.getElementById('enterGameCta');
    const hiddenBtn = document.getElementById('gameBtn');
    if (ctaBtn) ctaBtn.click();
    else if (hiddenBtn) hiddenBtn.click();
    else console.warn('[DiegeticUI] enterGameMode: no gameBtn/enterGameCta found');

    // 5) 显示"回鸟瞰"退出按钮
    showExitButton();
  }

  /** 退出游戏模式回到 v2 鸟瞰 */
  function exitGameMode() {
    if (window.village) window.village.visible = false;
    if (window.scene?.fog) window.scene.fog = null;
    if (root) root.visible = true;
    // 把 v1 game-on 关掉 (它会还原 enterGameCta 等)
    document.querySelector('.app')?.classList.remove('game-on');
    showToast('已退回 长安鸟瞰', 2200);
    // 回到 fitInitialView
    if (window.world?.flyTo && window.scene) {
      // 触发 bootstrap 中保存的 fitInitialView (没暴露, 但 controls.target+camera 重置)
      window.dispatchEvent(new CustomEvent('han-diorama-back-to-overview'));
    }
    // 隐藏退出按钮
    hideExitButton();
  }

  /** 在游戏模式中显示 "回鸟瞰" 浮按钮 */
  function showExitButton() {
    let btn = document.getElementById('diegetic-exit-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'diegetic-exit-btn';
      btn.textContent = '← 回鸟瞰 (Esc)';
      btn.style.cssText = `
        position:fixed; top:16px; left:16px; z-index:99998;
        padding:10px 18px;
        background:linear-gradient(180deg,#3a1f12,#1a0e08);
        color:#f5d68b; font-family:"Noto Serif SC",serif;
        font-size:14px; font-weight:600;
        border:1.5px solid #d4a554; border-radius:6px;
        cursor:pointer; letter-spacing:.08em;
        box-shadow:0 6px 18px rgba(0,0,0,.55), inset 0 0 12px rgba(212,165,84,.18);
        transition:transform .15s, box-shadow .15s;
      `;
      btn.onmouseover = () => { btn.style.transform = 'translateY(-1px)'; btn.style.boxShadow = '0 10px 24px rgba(0,0,0,.65), inset 0 0 12px rgba(212,165,84,.3)'; };
      btn.onmouseout  = () => { btn.style.transform = ''; btn.style.boxShadow = '0 6px 18px rgba(0,0,0,.55), inset 0 0 12px rgba(212,165,84,.18)'; };
      btn.onclick = () => exitGameMode();
      document.body.appendChild(btn);
    }
    btn.style.display = 'block';
  }

  function hideExitButton() {
    const btn = document.getElementById('diegetic-exit-btn');
    if (btn) btn.style.display = 'none';
  }

  // ESC 快捷键: 游戏模式中→退游戏 / diegetic 模式中→重置鸟瞰
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!root.visible) {
      // 游戏模式 → 退回 diegetic
      exitGameMode();
    } else {
      // diegetic 模式 → 重置鸟瞰相机 (用户可能 zoom 到 ward 后想回来)
      if (window.world?.fitInitial) {
        window.world.fitInitial();
        showToast('已重置鸟瞰相机 (Esc)', 1800);
      }
    }
  });

  let downX = 0, downY = 0;
  function onPointerDown(e) {
    downX = e.clientX; downY = e.clientY;
  }
  function onPointerUp(e) {
    // 仅在没有拖拽时认为是 click (避免与 OrbitControls 拖拽冲突)
    if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) return;
    onClick(e);
  }
  /** 取得当前所有 mesh (然后命中后沿父链找已注册 ancestor) */
  function allTargets() {
    const t = [];
    root.traverse((o) => { if (o.isMesh) t.push(o); });
    return t;
  }

  /** 用 mesh 自身或祖先在 clickables 里找入口 */
  function resolveEntry(obj) {
    let cur = obj;
    while (cur) {
      if (clickables.has(cur.uuid)) return clickables.get(cur.uuid);
      cur = cur.parent;
    }
    return null;
  }

  function updatePointer(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function castHit() {
    // 强制刷新世界矩阵 + 投影矩阵, 避免 raycaster 用过期矩阵
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix?.();
    root.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const targets = allTargets();
    const hits = raycaster.intersectObjects(targets, true);
    if (window.DIEGETIC_DEBUG_HITS) {
      const summary = hits.slice(0, 8).map(h => {
        const k = h.object.userData?.kind || resolveEntry(h.object)?.rootMesh?.userData?.kind || '(unknown)';
        return `${h.distance.toFixed(0)}|${h.object.name || h.object.type}|${k}`;
      }).join(' >> ');
      console.log('[DiegeticUI] raw hits:', hits.length, '|', summary);
      // 也打印 ray 起点/方向 + 整个 root 中 enter-game 类型数量
      let gateCount = 0;
      root.traverse(o => { if (o.isMesh && o.userData.kind === 'enter-game') gateCount++; });
      console.log('[DiegeticUI] debug: gateMeshes=', gateCount,
        'rayOrig=', raycaster.ray.origin.toArray().map(n=>n.toFixed(0)).join(','),
        'rayDir=', raycaster.ray.direction.toArray().map(n=>n.toFixed(2)).join(','),
        'pointer=', pointer.x.toFixed(2), pointer.y.toFixed(2));
    }
    // 两遍扫描: 第一遍找"非沙盘表面"hit (避免大面 catch-all 抢点);
    // 第二遍找任意 hit (包括 surface)
    let surfaceHit = null;
    for (const h of hits) {
      const entry = resolveEntry(h.object);
      if (!entry) continue;
      const kind = entry.rootMesh?.userData?.kind;
      if (kind === 'bronze-map-surface') {
        if (!surfaceHit) surfaceHit = { hit: h, entry };
        continue;
      }
      return { hit: h, entry };
    }
    if (surfaceHit) return surfaceHit;
    return { hit: hits[0] || null, entry: null };
  }

  /** 屏幕距离 fallback: 找投影到屏幕上离 pointer 最近的可点击 root */
  function closestClickableInScreen() {
    let best = null;
    let bestD2 = 32 * 32; // 32px 容忍半径 — 防止抢错 prop
    const tmp = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    const px = pointer.x, py = pointer.y;
    // 去重 — 一个 root 只算一次, 用 root 的中心点
    const seen = new Set();
    // 排除"大块面板"类型 — 它们的 BBOX 中心容易抢误点
    const SKIP_KINDS = new Set(['bronze-map-surface']);
    for (const { rootMesh, meta, handler } of clickables.values()) {
      if (seen.has(rootMesh.uuid)) continue;
      seen.add(rootMesh.uuid);
      if (SKIP_KINDS.has(rootMesh.userData.kind)) continue;
      // 用 boundingSphere 中心做屏幕投影
      const center = new THREE.Box3().setFromObject(rootMesh).getCenter(tmp).clone();
      ndc.copy(center).project(camera);
      const dx = (ndc.x - px), dy = (ndc.y - py);
      // 转成 "屏幕像素" 距离平方 (大致): NDC 距离 * 半屏 px ~ 500
      const SCREEN_K = 500;
      const d2 = (dx * SCREEN_K) ** 2 + (dy * SCREEN_K) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { hit: null, entry: { rootMesh, meta, handler } };
      }
    }
    return best;
  }

  function onClick(e) {
    // 游戏模式中 diegetic UI 隐藏 — 让 v1 接管
    if (!root.visible) return;
    updatePointer(e);
    let { hit, entry } = castHit();
    if (!entry) {
      // 二次 fallback: 找屏幕距离最近的可点击 prop (容忍 ~64px)
      const fb = closestClickableInScreen();
      if (fb) {
        console.log('[DiegeticUI] click snap-to nearest prop. kind=', fb.entry.rootMesh?.userData?.kind);
        entry = fb.entry;
      }
    }
    if (!entry) {
      console.log('[DiegeticUI] click missed.',
        'hit=', hit ? (hit.object.name || hit.object.type) : 'none',
        'pointer=', pointer.x.toFixed(2), pointer.y.toFixed(2));
      return;
    }
    console.log('[DiegeticUI] click hit:', hit?.object?.name || hit?.object?.type || '(snap)',
      'kind=', entry.rootMesh?.userData?.kind);
    entry.handler(entry.rootMesh, e);
    flashFeedback(entry.rootMesh);
  }

  function onPointerMove(e) {
    if (!root.visible) {
      // 游戏模式 — 清掉 hover, 还回控制权
      if (hovered) { setHover(hovered, false); hovered = null; }
      return;
    }
    updatePointer(e);
    const { entry } = castHit();
    const newHovered = entry?.rootMesh || null;
    if (newHovered === hovered) return;
    if (hovered) setHover(hovered, false);
    hovered = newHovered;
    if (hovered) setHover(hovered, true);
    renderer.domElement.style.cursor = hovered ? 'pointer' : '';
  }

  function setHover(rootMesh, on) {
    rootMesh.traverse((c) => {
      if (c.isMesh && c.material && c.material.emissive !== undefined) {
        if (on) {
          c.userData.__origEmiss = c.material.emissive.getHex();
          c.material.emissive.setHex(0x4a3210);
        } else if (c.userData.__origEmiss !== undefined) {
          c.material.emissive.setHex(c.userData.__origEmiss);
        }
      }
    });
    rootMesh.scale.setScalar(on ? 1.08 : 1.0);
    // 显示/隐藏 tooltip
    if (on) showHoverTooltip(rootMesh);
    else hideHoverTooltip();
  }

  /** 顶部 hover tooltip (HTML 浮窗) - 跟随光标 */
  let hoverTooltipEl = null;
  let hoverMouseX = 0, hoverMouseY = 0;
  window.addEventListener('pointermove', (e) => {
    hoverMouseX = e.clientX;
    hoverMouseY = e.clientY;
    if (hoverTooltipEl && hoverTooltipEl.style.display === 'block') {
      hoverTooltipEl.style.left = (e.clientX + 14) + 'px';
      hoverTooltipEl.style.top  = (e.clientY + 14) + 'px';
    }
  });

  function showHoverTooltip(rootMesh) {
    const kind = rootMesh.userData.kind;
    let label = '';
    if (kind === 'era') label = `${rootMesh.userData.era?.short || ''} · ${rootMesh.userData.era?.year || ''}`;
    else if (kind === 'map-node' || kind === 'ward-label') label = rootMesh.userData.wardName || '';
    else if (kind === 'cam-mode') label = `${rootMesh.userData.mode?.short || ''} · ${rootMesh.userData.mode?.desc || ''}`;
    else if (kind === 'enter-game') label = '走進長安 · 第一視角';
    else if (kind === 'bronze-map-surface') label = '長安舆图 · 點之傳送';
    else if (kind === 'voice-bell') label = '敲鐘召喚 · 長安諸賢與你對話';
    else if (kind === 'atelier-portal') label = '丹青館 · 點此走過去';
    else if (kind === 'gallery-hall') label = '雲廊唐畫藏館 · 點入觀真跡 · 苏阮卿講解';
    if (!label) return;

    if (!hoverTooltipEl) {
      hoverTooltipEl = document.createElement('div');
      hoverTooltipEl.id = 'diegetic-hover-tip';
      hoverTooltipEl.style.cssText = `
        position:fixed; z-index:99997; pointer-events:none;
        padding:6px 14px;
        background:linear-gradient(180deg,#3a1f12f0,#1a0e08f0);
        color:#f5d68b; font-family:"Noto Serif SC",serif;
        font-size:14px; font-weight:600; letter-spacing:.06em;
        border:1.5px solid #d4a554; border-radius:4px;
        box-shadow:0 6px 16px rgba(0,0,0,.55);
        transition:opacity .15s;
      `;
      document.body.appendChild(hoverTooltipEl);
    }
    hoverTooltipEl.textContent = label;
    hoverTooltipEl.style.display = 'block';
    hoverTooltipEl.style.left = (hoverMouseX + 14) + 'px';
    hoverTooltipEl.style.top  = (hoverMouseY + 14) + 'px';
  }

  function hideHoverTooltip() {
    if (hoverTooltipEl) hoverTooltipEl.style.display = 'none';
  }

  function flashFeedback(rootMesh) {
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 400;
      if (t >= 1) {
        rootMesh.scale.setScalar(hovered === rootMesh ? 1.08 : 1.0);
        return;
      }
      const s = 1 + Math.sin(t * Math.PI) * 0.18;
      rootMesh.scale.setScalar(s);
      requestAnimationFrame(tick);
    };
    tick();
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  /* ----------- 时代 / 相机 / 传送 API ----------- */

  let activeEra = null;
  function setEra(id) {
    const era = ERAS.find((e) => e.id === id);
    if (!era) return;
    activeEra = id;
    // 轻度调氛围, 不再泛白
    if (scene.background) {
      const targetSky = new THREE.Color(era.sky);
      const curSky = scene.background.isColor ? scene.background.clone() : new THREE.Color(0xffffff);
      tweenColor(curSky, targetSky, 0.8, (c) => { scene.background = c; });
    } else {
      scene.background = new THREE.Color(era.sky);
    }
    if (scene.fog) {
      tweenColor(scene.fog.color.clone(), new THREE.Color(era.sky), 0.8, (c) => { scene.fog.color = c; });
    }
    scene.traverse((obj) => {
      if (obj.isDirectionalLight) obj.intensity = era.sun;
      if (obj.isHemisphereLight) obj.intensity = era.hemi;
    });
    showToast(`时代 → ${era.short}（${era.year}）`);
  }

  function goto(id, opts = {}) {
    const meta = KEY_REGIONS.find((r) => r.id === id);
    const { deep = false } = opts;
    if (deep && world?.flyTo && world?.centerOf) {
      // 推进到坊内: 相机斜俯视, 距坊中心 ~25 个单位
      const c = world.centerOf(id);
      if (c) {
        const m = world.get?.(id);
        const sz = Math.max(m?.size?.w || 60, m?.size?.d || 60);
        // 视野高度对齐坊大小 ~1.5 倍
        if (camera.isOrthographicCamera) {
          const fH = (camera.top - camera.bottom);
          camera.zoom = fH / (sz * 1.5);
          camera.updateProjectionMatrix();
        }
        camera.position.set(c.x + sz * 0.45, sz * 0.55, c.z + sz * 0.5);
        camera.lookAt(c.x, 0, c.z);
        if (controls) {
          controls.target.set(c.x, 0, c.z);
          controls.update?.();
        }
        showToast(`走入 ${meta?.zh || id} · 右键拖动可平移`, 3200);
        return;
      }
    }
    if (world?.goto) {
      world.goto(id);
      if (meta) showToast(`→ ${meta.zh} · 右键拖动可平移`, 2800);
    }
  }

  function setCameraMode(mode) {
    if (mode === 'overview') {
      world?.fitCity?.();
      showToast('相机 → 全城俯瞰');
    } else if (mode === 'orbit') {
      if (controls) {
        controls.minPolarAngle = Math.PI * 0.18;
        controls.maxPolarAngle = Math.PI * 0.45;
        controls.enableRotate = true;
      }
      showToast('相机 → 环绕');
    } else if (mode === 'drone') {
      enableDrone();
      showToast('相机 → 无人机 · WASD 飞行');
    }
  }

  /* ----------- 简化版 drone 飞行 ----------- */
  let droneActive = false;
  function enableDrone() {
    if (droneActive) return;
    droneActive = true;
    const speed = 5;
    const keys = new Set();
    const dnKey = (e) => keys.add(e.key.toLowerCase());
    const upKey = (e) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', dnKey);
    window.addEventListener('keyup', upKey);
    function loop() {
      if (!droneActive) return;
      const f = new THREE.Vector3();
      camera.getWorldDirection(f);
      const r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
      if (keys.has('w')) camera.position.addScaledVector(f, speed);
      if (keys.has('s')) camera.position.addScaledVector(f, -speed);
      if (keys.has('a')) camera.position.addScaledVector(r, -speed);
      if (keys.has('d')) camera.position.addScaledVector(r, speed);
      if (keys.has('q')) camera.position.y -= speed;
      if (keys.has('e')) camera.position.y += speed;
      if (controls) controls.target.copy(camera.position).add(f.multiplyScalar(50));
      controls?.update?.();
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ----------- 顶部一次性 toast (唯一的 HTML) ----------- */
  function showToast(text, ms = 2200) {
    let el = document.getElementById('diegetic-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'diegetic-toast';
      el.style.cssText = `
        position:fixed; top:32px; left:50%; transform:translate(-50%,-16px);
        z-index:99999; padding:14px 32px;
        background:linear-gradient(180deg,#3a1f12f5,#1a0e08f5);
        color:#f5d68b; font-family:"Noto Serif SC",serif; font-size:20px;
        border:2px solid #d4a554; border-radius:6px;
        box-shadow:0 12px 40px rgba(0,0,0,.55), inset 0 0 18px rgba(212,165,84,.18);
        opacity:0; transition:opacity .35s, transform .35s;
        pointer-events:none; letter-spacing:.08em; font-weight:600;`;
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%, 0)';
    });
    clearTimeout(el.__t);
    el.__t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -12px)';
    }, ms);
  }

  /* ----------- 入门提示 (5 秒后淡出) ----------- */
  showToast('朱雀门 / 进城牌坊 / 长安舆图 / 铜鼎 皆可点之 · 右键拖动可平移', 5500);

  /* ----------- build 各组件 ----------- */
  buildEraPlaques(root, (mesh, meta) => registerClickable(mesh, meta));
  buildBronzeMap(root, (mesh, meta) => registerClickable(mesh, meta), world);
  buildCameraDing(root, (mesh, meta) => registerClickable(mesh, meta));
  buildEntryGate(root, (mesh, meta) => registerClickable(mesh, meta));
  const voiceBell = buildVoiceBell({
    parent: root,
    registerClickable: (mesh, meta) => registerClickable(mesh, meta),
  });
  const atelierProp = buildAtelierProp({
    parent: root,
    registerClickable: (mesh, meta) => registerClickable(mesh, meta),
  });
  const galleryHall = buildGalleryHall({
    parent: root,
    registerClickable: (mesh, meta) => registerClickable(mesh, meta),
  });
  // Expose for voice intent + diegetic click route
  window.openAtelier = openAtelier;
  window.openGalleryHall = openGalleryHall;
  const wardLabels = buildWardLabels(root, (mesh, meta) => registerClickable(mesh, meta), world);

  /* ----------- 让钟跟随 voiceAiSpeaking 状态 ----------- */
  setInterval(() => {
    voiceBell?.setSpeaking?.(!!window.voiceAiSpeaking);
  }, 200);

  /* ----------- 每帧 tick: 让 ward 牌追相机水平 ----------- */
  function tick() {
    wardLabels.userData.tick?.(camera);
    requestAnimationFrame(tick);
  }
  tick();

  console.info('[DiegeticUI] installed (era plaques · bronze map · camera ding · entry gate · voice bell · atelier · gallery hall · ward labels)');

  return {
    setEra, goto, setCameraMode, enterGameMode, exitGameMode,
    showToast,
    dispose() {
      scene.remove(root);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
    },
  };
}

/* ─────────────────────────── 隐藏 legacy v1 HTML chrome ─────────────────────────── */
function injectHideV1Styles() {
  // 主要的 v2 hide 规则已经在 index.html 静态 <style> 中, 这里只补充冗余守护
  if (document.getElementById('diegetic-hide-v1')) return;
  const s = document.createElement('style');
  s.id = 'diegetic-hide-v1';
  s.textContent = `
    body.v2-active .side,
    body.v2-active aside.side,
    body.v2-active .side-toggle { display: none !important; }
    body.v2-active .app { grid-template-columns: 0 1fr !important; }
  `;
  document.head.appendChild(s);
}

/* ─────────────────────────── color tween util ─────────────────────────── */
function tweenColor(from, to, sec, apply) {
  const start = performance.now();
  const dur = sec * 1000;
  const tmp = from.clone();
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / dur);
    tmp.copy(from).lerp(to, t);
    apply(tmp);
    if (t < 1) requestAnimationFrame(step);
  };
  step();
}
