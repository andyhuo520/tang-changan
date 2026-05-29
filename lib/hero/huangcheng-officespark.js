/**
 * 皇城 (Imperial City / Government Quarter)
 *
 * 240 × 60 u — wide strip between 宫城 (north) and 朱雀大街 (south).
 * Houses 三省 (zhongshu / menxia / shangshu), 九寺, 五监.
 *
 * Layout (looking down, north up):
 *   ┌────────────────────────────────────────────────────┐
 *   │  鸿胪寺  司天监  尚书省  ⬛ 中书省 ⬛  门下省  太医署  太常寺 │
 *   │   通译    天文    行政     大政厅      谏议     医学    礼乐 │
 *   │  ─── 御史台/三品衙署 主轴 ───                          │
 *   │  五监 (国子/少府/将作/军器/都水) — 矮台                 │
 *   └────────────────────────────────────────────────────┘
 *
 * Style: 灰瓦, 朱柱, 整齐, 庄重.
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-huangcheng';

const MINISTRIES = [
  { id: 'honglu',    label: '鸿胪寺',   x: -100, role: 'foreign'  },
  { id: 'sitian',    label: '司天监',   x: -70,  role: 'astronomy'},
  { id: 'shangshu',  label: '尚书省',   x: -40,  role: 'central'  },
  { id: 'zhongshu',  label: '中书省',   x:  0,   role: 'central'  },
  { id: 'menxia',    label: '门下省',   x:  40,  role: 'central'  },
  { id: 'taiyi',     label: '太医署',   x:  70,  role: 'medical'  },
  { id: 'taichang',  label: '太常寺',   x:  100, role: 'rites'    },
];

const DIRECTORATES = [
  { id: 'guozi',     label: '国子监',   x: -90  },
  { id: 'shaofu',    label: '少府监',   x: -45  },
  { id: 'jiangzuo',  label: '将作监',   x:  0   },
  { id: 'junqi',     label: '军器监',   x:  45  },
  { id: 'dushui',    label: '都水监',   x:  90  },
];

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const w = opts.manifest?.size?.w || 240;
  const d = opts.manifest?.size?.d || 60;

  // outer wall (low, ceremonial)
  g.add(courtyardWall({
    w, d, h: 5, color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 18, name: 'zhuque-men' },
      { side: 'N', width: 14, name: 'chengtian-men' },
      { side: 'E', width: 10, name: 'guangyun-men' },
      { side: 'W', width: 10, name: 'chunhua-men' },
    ],
  }));

  const ground = box(w - 4, 0.1, d - 4, PALETTE.pavingDeep, 0, 0, 0);
  g.add(ground);

  // central main axis (north-south)
  const axis = box(8, 0.06, d - 4, PALETTE.stoneBase, 0, 0.06, 0);
  g.add(axis);

  // east-west axis between 三省 and 五监
  const exwAxis = box(w - 4, 0.06, 4, PALETTE.stoneBase, 0, 0.06, 4);
  g.add(exwAxis);

  // 三省 / 九寺 / 主要 — northern row
  for (const m of MINISTRIES) {
    const isCentral = m.role === 'central';
    const hallW = isCentral ? 22 : 18;
    const hallD = isCentral ? 14 : 11;
    const hallH = isCentral ? 6 : 5;
    const tile  = isCentral ? PALETTE.tileImperial : PALETTE.tileGrey;
    const hall = tangHall({
      w: hallW, d: hallD, h: hallH, columns: isCentral ? 7 : 5,
      tile, ridgeOrn: isCentral, raisedBase: 0.7,
    });
    hall.position.set(m.x, 0.4, -12);
    g.add(hall);
    // plaque
    const plaque = paifang({ w: 7, h: 3.5, text: m.label });
    plaque.position.set(m.x, 0, -3);
    plaque.scale.set(0.8, 0.8, 0.8);
    g.add(plaque);
  }

  // 五监 — southern row, smaller
  for (const dr of DIRECTORATES) {
    const hall = tangHall({
      w: 14, d: 9, h: 4.5, columns: 5,
      tile: PALETTE.tileGrey, ridgeOrn: false, raisedBase: 0.5,
    });
    hall.position.set(dr.x, 0.4, 16);
    g.add(hall);
    const plaque = paifang({ w: 5, h: 2.8, text: dr.label });
    plaque.position.set(dr.x, 0, 22);
    plaque.scale.set(0.7, 0.7, 0.7);
    g.add(plaque);
  }

  // 御史台 (special) — east end
  const yushi = tangHall({
    w: 12, d: 8, h: 5, columns: 5,
    tile: PALETTE.tileImperial, ridgeOrn: true, raisedBase: 0.6,
  });
  yushi.position.set(w / 2 - 14, 0.4, -10);
  g.add(yushi);

  // pines for elegance
  const pineMat = new THREE.MeshLambertMaterial({ color: 0x3f5c3a });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x523320 });
  for (let i = -110; i <= 110; i += 12) {
    if (Math.abs(i) < 16) continue;
    [-20, 22].forEach((pz) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.6, 6), trunkMat);
      trunk.position.set(i, 0.8, pz); g.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.6, 6), pineMat);
      crown.position.set(i, 2.7, pz); g.add(crown);
    });
  }

  // central plaza paifang
  const arch = paifang({ w: 14, h: 6, text: '皇城' });
  arch.position.set(0, 0, d / 2 - 2);
  g.add(arch);

  // Sitian observatory accent — a small armillary sphere
  const armi = new THREE.Group();
  const armBase = cyl(1.0, 0.6, PALETTE.stoneBase, 0, 0, 0, 12);
  armi.add(armBase);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.06, 6, 24),
      new THREE.MeshLambertMaterial({ color: PALETTE.tileImperial }),
    );
    ring.position.y = 2.0;
    ring.rotation.x = (i / 3) * Math.PI;
    ring.rotation.z = (i / 3) * Math.PI * 0.4;
    armi.add(ring);
  }
  armi.position.set(-70, 0, -16);
  g.add(armi);

  // 鸿胪寺 — colorful flags representing foreign delegations
  for (let i = 0; i < 5; i++) {
    const pole = cyl(0.1, 5, PALETTE.beam, -100 + i * 2, 0, -22, 6);
    g.add(pole);
    const flagColor = [0xa8332f, 0x3a5a8a, 0xc99a3a, 0x4a8e9e, 0x5b3b6e][i];
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.2),
      new THREE.MeshBasicMaterial({ color: flagColor, side: THREE.DoubleSide }),
    );
    flag.position.set(-100 + i * 2 + 0.6, 3.5, -22);
    g.add(flag);
  }

  // NPCs
  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const fig = npcMarker({
      robe: 0x3e2d1c,
      npcId: npc.id, role: npc.role, name: npc.name,
      hat: 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 1.0, npc.spawn?.offsetZ || 0);
    g.add(fig);
  }

  return g;
}
