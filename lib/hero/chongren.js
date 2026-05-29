/**
 * 崇仁坊 (Chongren Ward) — 文人三角之一, 紧邻东市与皇城.
 *
 * 一街辐辏, 遂倾两市, 昼夜喧呼, 灯火不绝 — 《长安志》
 *
 * Layout (60×60):
 *   ┌─[坊墙 + 4 门]──────────────┐
 *   │ 客栈区 (东南角)  6 客栈      │
 *   │ 国子监诸生士子寓 (西北)      │
 *   │ 中央: 酒肆 4 + 书坊 3        │
 *   │ 八角井 + 牌坊               │
 *   └────────────────────────────┘
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'ward-chongren';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  /* 外坊墙 */
  g.add(courtyardWall({
    w: 58, d: 58, h: 4.5,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 7 },
      { side: 'N', width: 7 },
      { side: 'E', width: 7 },
      { side: 'W', width: 7 },
    ],
  }));

  /* 地面 */
  g.add(box(56, 0.08, 56, PALETTE.pavingDeep, 0, 0, 0));

  /* 十字主街 */
  const streetMat = new THREE.MeshLambertMaterial({ color: 0xc7ad84 });
  const ns = new THREE.Mesh(new THREE.BoxGeometry(4, 0.10, 56), streetMat);
  ns.position.set(0, 0.05, 0); g.add(ns);
  const ew = new THREE.Mesh(new THREE.BoxGeometry(56, 0.10, 4), streetMat);
  ew.position.set(0, 0.05, 0); g.add(ew);

  /* 客栈区 — 东南象限, 6 客栈 */
  const innCount = opts.inns ?? 6;
  for (let i = 0; i < innCount; i++) {
    const row = i % 3, col = Math.floor(i / 3);
    const x = 8 + col * 8, z = 8 + row * 7;
    /* 客栈主屋 (2 层) */
    const lower = box(6, 3, 5, PALETTE.wallBrick, x, 0, z);
    g.add(lower);
    const upper = box(5.5, 2.4, 4.5, PALETTE.column, x, 3, z);
    g.add(upper);
    const eave1 = box(6.6, 0.3, 5.6, PALETTE.wood, x, 3, z);
    g.add(eave1);
    const roof = cone(3.4, 1.4, PALETTE.tileGrey, x, 5.4, z, 4, Math.PI / 4);
    g.add(roof);
    const ridge = box(3, 0.22, 0.3, PALETTE.tileRidge, x, 6.0, z);
    g.add(ridge);
    /* 招牌 */
    const banner = box(0.3, 1.5, 0.6, 0xa8332f, x - 3.5, 0, z);
    g.add(banner);
  }

  /* 书坊区 — 西北象限, 3 间 */
  const bookshopCount = opts.bookshops ?? 3;
  for (let i = 0; i < bookshopCount; i++) {
    const x = -16 + i * 6, z = -14;
    const shop = box(5, 2.5, 4, PALETTE.wood, x, 0, z);
    g.add(shop);
    const roof = cone(2.6, 1.0, PALETTE.tileGrey, x, 2.5, z, 4, Math.PI / 4);
    g.add(roof);
    /* 书坊招牌 */
    const banner = box(0.2, 1.2, 0.5, 0x4a3220, x + 2.2, 0, z);
    g.add(banner);
  }

  /* 士子寓所 — 西北象限下部, 5 院 */
  const hostelCount = opts.scholarsHostels ?? 4;
  for (let i = 0; i < hostelCount; i++) {
    const x = -16 + i * 6, z = -6;
    g.add(courtyardWall({
      w: 5, d: 5, h: 2.2,
      color: 0xa68866,
      gates: [{ side: 'S', width: 1.5 }],
    }).translateX(x).translateZ(z));
    const room = box(3.5, 2, 3, PALETTE.wallBrick, x, 0, z);
    g.add(room);
    const roof = cone(2.0, 0.9, PALETTE.tileGrey, x, 2, z, 4, Math.PI / 4);
    g.add(roof);
  }

  /* 酒肆 — 东北象限, 4 间一行 */
  const wineCount = opts.wineHouses ?? 4;
  for (let i = 0; i < wineCount; i++) {
    const x = 6 + i * 5, z = -10;
    const shop = box(4, 3, 4, 0x9a4030, x, 0, z);
    g.add(shop);
    const roof = cone(2.2, 1.0, PALETTE.tileGrey, x, 3, z, 4, Math.PI / 4);
    g.add(roof);
    /* 酒旗 — 红色长条 */
    const pole = cyl(0.06, 4, 0x3a2418, x + 2.3, 0, z, 6);
    g.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.4),
      new THREE.MeshBasicMaterial({ color: 0xff7235, side: THREE.DoubleSide }),
    );
    flag.position.set(x + 2.9, 3, z);
    g.add(flag);
  }

  /* 中央 paifang */
  const archway = paifang({ w: 8, h: 5.5, text: '崇 仁' });
  archway.position.set(0, 0, -22);
  g.add(archway);

  /* 八角井 (西南象限) */
  const wellBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.6, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: PALETTE.stoneBase }),
  );
  wellBase.position.set(-14, 0.3, 14);
  g.add(wellBase);
  const wellInside = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.5, 8),
    new THREE.MeshBasicMaterial({ color: 0x111114 }),
  );
  wellInside.position.set(-14, 0.5, 14);
  g.add(wellInside);

  /* NPC markers */
  const npcs = [
    { robe: 0x2a3e5e, npcId: 'scholar-juzi-3', role: 'scholar',  name: '举子·张生', x: -8, z: 0 },
    { robe: 0x3a5e2e, npcId: 'scholar-juzi-4', role: 'scholar',  name: '举子·刘生', x: 8,  z: 0 },
    { robe: 0xa8332f, npcId: 'innkeeper',      role: 'merchant', name: '客栈掌柜',  x: 0,  z: 6 },
  ];
  for (const n of npcs) {
    const npc = npcMarker(n);
    npc.position.set(n.x, 0.6, n.z);
    g.add(npc);
  }

  return g;
}
