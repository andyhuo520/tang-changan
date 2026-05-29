/**
 * 进昌坊 (Jinchang Ward) — site of 大慈恩寺 + 大雁塔.
 *
 * Ward layout:
 *   ┌─[wall + 4 gates]────────────────────────┐
 *   │                                          │
 *   │         ┌─大慈恩寺 main hall──┐           │
 *   │         │                    │           │
 *   │         │   (玄奘 statue)     │           │
 *   │         └────────────────────┘           │
 *   │                                          │
 *   │            大雁塔 (7-level                │
 *   │            brick pagoda)                 │
 *   │                                          │
 *   │     雁塔题名碑 + 进士题诗墙               │
 *   │                                          │
 *   └─────────────────────────────────────────┘
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, brickPagoda, paifang, npcMarker,
} from './_shared.js';

export const id = 'ward-jinchang';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

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

  const ground = box(56, 0.08, 56, PALETTE.pavingDeep, 0, 0, 0);
  g.add(ground);

  const innerWall = courtyardWall({
    w: 38, d: 46, h: 3.5,
    color: 0xa68866,
    gates: [{ side: 'S', width: 6 }],
  });
  innerWall.position.y = 0.04;
  g.add(innerWall);

  const ciSiHall = tangHall({
    w: 24, d: 12, h: 6, columns: 7,
    tile: PALETTE.tileGrey, ridgeOrn: true, raisedBase: 1.0,
  });
  ciSiHall.position.set(0, 0, -10);
  g.add(ciSiHall);

  const xuanZangBase = cyl(0.8, 0.4, PALETTE.stoneBase, 0, 0.15, -3, 16);
  g.add(xuanZangBase);
  const xuanZang = npcMarker({
    robe: 0xb6a06a, skin: 0xddc294, hat: 0xb6a06a,
    npcId: 'xuan-zang', role: 'monk', name: '玄奘三藏',
  });
  xuanZang.position.set(0, 0.6, -3);
  g.add(xuanZang);

  const yanta = brickPagoda({ levels: 7, baseW: 7, baseH: 3.2 });
  yanta.position.set(0, 0, 8);
  yanta.scale.setScalar(0.9);
  g.add(yanta);

  const tiMingWall = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const stele = box(0.8, 2.2, 0.25, PALETTE.stoneBase, -8 + i * 4, 0.1, 22);
    tiMingWall.add(stele);
    const top = cone(0.55, 0.4, 0x9a8770, -8 + i * 4, 2.3, 22, 4, Math.PI / 4);
    tiMingWall.add(top);
  }
  g.add(tiMingWall);

  const arch = paifang({ w: 6, h: 4, text: '大慈恩寺' });
  arch.position.set(0, 0, -25);
  arch.rotation.y = Math.PI;
  g.add(arch);

  const yantaArch = paifang({ w: 6, h: 4, text: '雁塔' });
  yantaArch.position.set(0, 0, 16);
  g.add(yantaArch);

  const lotusPool = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 24),
    new THREE.MeshLambertMaterial({ color: PALETTE.water, transparent: true, opacity: 0.8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.1;
  lotusPool.add(water);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lotus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.05, 8),
      new THREE.MeshLambertMaterial({ color: 0xe89bbe }),
    );
    lotus.position.set(Math.cos(a) * 1.6, 0.15, Math.sin(a) * 1.6);
    lotusPool.add(lotus);
  }
  lotusPool.position.set(-10, 0, 0);
  g.add(lotusPool);
  const lp2 = lotusPool.clone();
  lp2.position.set(10, 0, 0);
  g.add(lp2);

  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const tree = new THREE.Group();
    const trunk = cyl(0.18, 1.6, 0x523320, 0, 0, 0, 6);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x4f6a3a }),
    );
    crown.position.y = 2.1;
    tree.add(trunk); tree.add(crown);
    tree.position.set(side * 16, 0, -12 + k * 8);
    g.add(tree);
  }

  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    if (npc.id === 'xuan-zang') continue;
    const robe = (() => {
      switch (npc.role) {
        case 'monk': return 0xb6a06a;
        case 'scholar': return 0x2e5e8e;
        default: return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe, npcId: npc.id, role: npc.role, name: npc.name,
      hat: npc.role === 'monk' ? robe : 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 0.6, npc.spawn?.offsetZ || 0);
    g.add(fig);
  }

  return g;
}
