/**
 * 平康坊 (Pingkang Ward) — 唐代教坊 / 妓馆 / 北里.
 *
 * 唐人称 "北里" — 文人雅士夜聚之地. 分北曲 / 中曲 / 南曲三处.
 *
 * Layout (60×60):
 *
 *   ┌─[坊墙 + 4 门]────────────────────────────────┐
 *   │                                                │
 *   │   ◆ 北曲 (高门馆)  ── 大宅 + 鼓楼 + 大灯笼      │
 *   │   ─────十字大街─────                            │
 *   │   ◆ 中曲 (酒肆)    ── 一行酒馆 + 露台戏台       │
 *   │   ─────内分隔─────                              │
 *   │   ◆ 南曲 (小馆)    ── 多个小院 + 八角井         │
 *   │                                                │
 *   └────────────────────────────────────────────────┘
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'ward-pingkang';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  /* 1) 外坊墙 (60×60, 高 4.5) — 4 门 */
  g.add(courtyardWall({
    w: 58, d: 58, h: 4.5,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 7, name: '正南门' },
      { side: 'N', width: 7, name: '通济门' },
      { side: 'E', width: 7 },
      { side: 'W', width: 7 },
    ],
  }));

  /* 2) 内地面 */
  const ground = box(56, 0.08, 56, PALETTE.pavingDeep, 0, 0, 0);
  g.add(ground);

  /* 3) 十字大街 (4u 宽) */
  const streetMat = new THREE.MeshLambertMaterial({ color: 0xc7ad84 });
  const ns = new THREE.Mesh(new THREE.BoxGeometry(4, 0.10, 56), streetMat);
  ns.position.set(0, 0.05, 0); g.add(ns);
  const ew = new THREE.Mesh(new THREE.BoxGeometry(56, 0.10, 4), streetMat);
  ew.position.set(0, 0.05, 0); g.add(ew);

  /* 4) 北曲 — 北方 1/3 (高门馆 + 鼓楼) */
  const beiqu = buildBeiqu();
  beiqu.position.set(0, 0, -18);
  g.add(beiqu);

  /* 5) 中曲 — 中部 1/3 (酒肆 + 戏台) */
  const zhongqu = buildZhongqu();
  zhongqu.position.set(0, 0, 0);
  g.add(zhongqu);

  /* 6) 南曲 — 南方 1/3 (小院 + 八角井) */
  const nanqu = buildNanqu();
  nanqu.position.set(0, 0, 18);
  g.add(nanqu);

  /* 7) 牌坊立于北门内, 写 "北里" */
  const archway = paifang({ w: 8, h: 5.5, text: '北 里' });
  archway.position.set(0, 0, -25);
  g.add(archway);

  /* 8) NPC markers — 4 位歌伎/诗人 */
  const npcs = [
    { robe: 0xa8332f, hat: 0x1a0e08, npcId: 'ms-xue-tao',      role: 'songstress', name: '薛涛',    x: 0, z: -10 },
    { robe: 0x5e93a7, hat: 0x1a0e08, npcId: 'ms-songstress-1', role: 'songstress', name: '明月',    x: -12, z: 0 },
    { robe: 0xd99a2e, hat: 0x1a0e08, npcId: 'ms-songstress-2', role: 'songstress', name: '秋红',    x: 12, z: 0 },
    { robe: 0x2a3e5e, hat: 0x1a0e08, npcId: 'poet-du-mu',      role: 'poet',       name: '杜牧',    x: 4,  z: 6 },
  ];
  for (const n of npcs) {
    const npc = npcMarker(n);
    npc.position.set(n.x, 0.6, n.z);
    g.add(npc);
  }

  /* 9) 大量灯笼 — 唐人称 "灯火不绝", 这是平康坊标志 */
  const lanternCount = opts.lanterns ?? 48;
  for (let i = 0; i < lanternCount; i++) {
    const a = (i / lanternCount) * Math.PI * 2;
    const r = 24;
    const x = Math.cos(a) * r * (0.85 + Math.random() * 0.15);
    const z = Math.sin(a) * r * (0.85 + Math.random() * 0.15);
    // 灯杆 + 红灯笼
    const pole = cyl(0.06, 4, 0x3a2418, x, 0, z, 6);
    g.add(pole);
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff7235 }),
    );
    lantern.position.set(x, 3.6, z);
    g.add(lantern);
  }

  return g;
}

/* ───────── 子区域 builders ───────── */

function buildBeiqu() {
  const g = new THREE.Group();
  g.name = 'pingkang-beiqu';

  /* 三座高门大宅, 排成东西一线 */
  for (let i = -1; i <= 1; i++) {
    const hall = tangHall({
      w: 12, d: 8, h: 4.5, columns: 5,
      tile: PALETTE.tileGrey,
      ridgeOrn: true,
      raisedBase: 0.6,
    });
    hall.position.set(i * 16, 0, 0);
    g.add(hall);

    /* 院门 (paifang) */
    const pf = paifang({ w: 4, h: 3.5, text: i === 0 ? '北 曲' : '' });
    pf.position.set(i * 16, 0, 6);
    g.add(pf);
  }

  /* 鼓楼 (中间高耸 — 北里 night-watch) */
  const drumBase = box(4, 5, 4, PALETTE.wallBrick, 0, 0, -8);
  g.add(drumBase);
  const drumRoom = box(3.5, 2.5, 3.5, PALETTE.column, 0, 5, -8);
  g.add(drumRoom);
  const drumRoof = cone(2.8, 2.0, PALETTE.tileGrey, 0, 7.5, -8, 4, Math.PI / 4);
  g.add(drumRoof);
  const drumRidge = cone(0.4, 1.2, PALETTE.tileRidge, 0, 9.3, -8, 4, Math.PI / 4);
  g.add(drumRidge);

  return g;
}

function buildZhongqu() {
  const g = new THREE.Group();
  g.name = 'pingkang-zhongqu';

  /* 一行酒肆 — 6 间, 木结构 */
  for (let i = -2.5; i <= 2.5; i++) {
    const shop = box(4, 3, 5, PALETTE.wood, i * 5, 0, -7);
    g.add(shop);
    const roof = cone(2.6, 1.4, PALETTE.tileGrey, i * 5, 3, -7, 4, Math.PI / 4);
    g.add(roof);
    // 招牌
    const banner = box(0.2, 1.5, 0.6, 0xff7235, i * 5 - 1.8, 0, -4.5);
    g.add(banner);
  }

  /* 露台戏台 — 中央 */
  const stagePlatform = box(8, 0.8, 6, PALETTE.stoneBase, 0, 0, 4);
  g.add(stagePlatform);
  // 戏台立柱
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const col = cyl(0.18, 4, PALETTE.column, i * 3, 0.8, 4 + j * 2, 8);
      g.add(col);
    }
  }
  // 戏台屋顶
  const stageRoof = box(9, 0.3, 7, PALETTE.tileImperial, 0, 4.8, 4);
  g.add(stageRoof);
  const stageRidge = box(9, 0.3, 0.5, PALETTE.tileRidge, 0, 5.1, 4);
  g.add(stageRidge);

  return g;
}

function buildNanqu() {
  const g = new THREE.Group();
  g.name = 'pingkang-nanqu';

  /* 4 个小院, 每个 8x6 */
  const courts = [
    { x: -12, z: -3 }, { x: 0, z: -3 }, { x: 12, z: -3 },
    { x: -6,  z:  6 }, { x: 6, z:  6 },
  ];
  for (const c of courts) {
    g.add(courtyardWall({
      w: 8, d: 6, h: 2.2,
      color: 0xa68866,
      gates: [{ side: 'N', width: 1.8 }],
    }).translateX(c.x).translateZ(c.z));
    // 小院屋
    const room = box(5, 2.5, 4, PALETTE.wallBrick, c.x, 0, c.z);
    g.add(room);
    const roof = cone(2.8, 1.2, PALETTE.tileGrey, c.x, 2.5, c.z, 4, Math.PI / 4);
    g.add(roof);
  }

  /* 八角井 (中心) */
  const wellBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.6, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: PALETTE.stoneBase }),
  );
  wellBase.position.set(0, 0.3, 0);
  g.add(wellBase);
  const wellInside = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.5, 8),
    new THREE.MeshBasicMaterial({ color: 0x111114 }),
  );
  wellInside.position.set(0, 0.5, 0);
  g.add(wellInside);
  // 井栏
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const px = Math.cos(a) * 1.5, pz = Math.sin(a) * 1.5;
    const post = cyl(0.08, 1.2, PALETTE.wood, px, 0.6, pz, 6);
    g.add(post);
  }
  // 井顶横木 + 滑轮
  const beam = box(3, 0.18, 0.18, PALETTE.wood, 0, 1.9, 0);
  g.add(beam);

  return g;
}
