/**
 * 务本坊 (Wuben Ward) — 国子监所在地, 唐代最高学府.
 *
 * 设六学: 国子学 / 太学 / 四门学 / 律学 / 书学 / 算学
 * 开元年间生数达八千余人.
 *
 * Layout (60×60):
 *   ┌─[坊墙]──────────────────────────────────────┐
 *   │  ┌─[国子监内墙]────────────────────────┐    │
 *   │  │  孔庙 (西) + 大成殿 (中) + 彝伦堂   │    │
 *   │  │  敬一亭 (北) + 6 学斋 (东)          │    │
 *   │  │  考场广场 (南) + 18 颗 槐树           │    │
 *   │  └────────────────────────────────────┘    │
 *   └─────────────────────────────────────────────┘
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'ward-wuben';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  /* 外坊墙 */
  g.add(courtyardWall({
    w: 58, d: 58, h: 4.5,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 8, name: '正南门' },
      { side: 'E', width: 6 },
      { side: 'W', width: 6 },
    ],
  }));
  /* 地面 */
  g.add(box(56, 0.08, 56, PALETTE.pavingDeep, 0, 0, 0));

  /* 国子监内墙 (38x46), 一门朝南 */
  const innerWall = courtyardWall({
    w: 38, d: 46, h: 3.5,
    color: 0xa68866,
    gates: [{ side: 'S', width: 6, name: '太学门' }],
  });
  innerWall.position.y = 0.04;
  g.add(innerWall);

  /* paifang at south gate */
  const archway = paifang({ w: 7, h: 5.5, text: '国 子 监' });
  archway.position.set(0, 0, 23);
  g.add(archway);

  /* 大成殿 (中央, 孔庙主殿) */
  const dachengHall = tangHall({
    w: 16, d: 9, h: 5, columns: 5,
    tile: PALETTE.tileImperial,
    ridgeOrn: true,
    raisedBase: 0.8,
  });
  dachengHall.position.set(0, 0, -2);
  g.add(dachengHall);

  /* 大成殿小卓 — 孔子位 */
  const altarBase = cyl(0.7, 0.4, PALETTE.stoneBase, 0, 0.15, -4, 8);
  g.add(altarBase);
  const kongziTablet = box(0.6, 1.4, 0.3, 0xa8332f, 0, 0.55, -4);
  g.add(kongziTablet);

  /* 彝伦堂 — 北侧, 较小, 灰瓦 */
  const yilunTang = tangHall({
    w: 12, d: 7, h: 4, columns: 5,
    tile: PALETTE.tileGrey,
    raisedBase: 0.6,
  });
  yilunTang.position.set(0, 0, -14);
  g.add(yilunTang);

  /* 敬一亭 — 八角亭, 最北 */
  const tingBase = box(6, 0.5, 6, PALETTE.stoneBase, 0, 0, -20);
  g.add(tingBase);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const px = Math.cos(a) * 2.4, pz = -20 + Math.sin(a) * 2.4;
    const col = cyl(0.16, 3.5, PALETTE.column, px, 0.5, pz, 8);
    g.add(col);
  }
  const tingRoof = cone(3.6, 1.6, PALETTE.tileImperialGreen, 0, 4, -20, 8);
  g.add(tingRoof);
  const tingRidge = cone(0.4, 1.2, PALETTE.tileRidge, 0, 5.5, -20, 4, Math.PI / 4);
  g.add(tingRidge);

  /* 6 学斋 — 东侧一排 */
  const schoolNames = ['国子学', '太学', '四门学', '律学', '书学', '算学'];
  for (let i = 0; i < 6; i++) {
    const z = -10 + i * 3.4;
    /* 学斋 */
    const room = box(5, 2.6, 3, PALETTE.wallBrick, 12, 0, z);
    g.add(room);
    const eave = box(5.6, 0.3, 3.4, PALETTE.wood, 12, 2.6, z);
    g.add(eave);
    const roof = cone(2.8, 1.0, PALETTE.tileGrey, 12, 3.0, z, 4, Math.PI / 4);
    g.add(roof);
    /* 学斋标牌 */
    const sign = box(0.2, 1.0, 0.4, 0x4a3220, 9.4, 0, z);
    g.add(sign);
  }

  /* 考场广场 — 南侧, 摆 18 考棚 (1 米见方) */
  const trees = opts.scholarTrees ?? 18;
  for (let i = 0; i < trees; i++) {
    const row = Math.floor(i / 6), col = i % 6;
    const x = -12 + col * 4.8;
    const z = 6 + row * 3.5;
    /* 考棚 (低盒) */
    const booth = box(1.5, 1.4, 1.5, PALETTE.wood, x, 0, z);
    g.add(booth);
    const cover = cone(1.0, 0.6, PALETTE.tileGrey, x, 1.4, z, 4, Math.PI / 4);
    g.add(cover);
  }

  /* 槐树 (国子监前的科举 luck tree) - 简化为绿球 */
  const treePositions = [
    { x: -20, z: -18 }, { x: 20, z: -18 },
    { x: -20, z: 18 },  { x: 20, z: 18 },
    { x: -22, z: 0 },   { x: 22, z: 0 },
  ];
  for (const tp of treePositions) {
    const trunk = cyl(0.32, 2.6, 0x5a3c20, tp.x, 0, tp.z, 8);
    g.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 8, 6),
      new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
    );
    crown.position.set(tp.x, 4.5, tp.z);
    g.add(crown);
  }

  /* NPC */
  const npcs = [
    { robe: 0x4a3220, hat: 0x1a0e08, npcId: 'han-yu',         role: 'official', name: '韩愈(国子博士)',   x: 0,  z: -6 },
    { robe: 0x2a3e5e, hat: 0x1a0e08, npcId: 'scholar-master', role: 'scholar',  name: '国子学博士',       x: -8, z: -4 },
    { robe: 0x3a5e2e, hat: 0x1a0e08, npcId: 'student-1',      role: 'scholar',  name: '国子生·甲',        x: -12, z: 4 },
    { robe: 0x5e93a7, hat: 0x1a0e08, npcId: 'student-2',      role: 'scholar',  name: '国子生·乙',        x: 12,  z: 4 },
  ];
  for (const n of npcs) {
    const npc = npcMarker(n);
    npc.position.set(n.x, 0.6, n.z);
    g.add(npc);
  }

  return g;
}
