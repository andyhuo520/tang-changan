/**
 * 大明宫 (Daming Palace) — Tang imperial palace, c.663-904 AD.
 *
 * Layout (north up):
 *   ┌───────────────────────┐
 *   │   玄武门               │  ← N gate
 *   │                       │
 *   │   太液池 + 蓬莱岛       │  ← imperial pleasure lake
 *   │                       │
 *   │   ┌─麟德殿─┐           │  ← banquet/diplomatic hall (high-pillared)
 *   │   │       │           │
 *   │   └───────┘           │
 *   │   ┌─紫宸殿─┐           │  ← inner court
 *   │   │       │           │
 *   │   └───────┘           │
 *   │   ┌──含元殿──┐         │  ← grand audience hall (largest)
 *   │   │  龙尾道  │         │
 *   │   └──────────┘        │
 *   │       丹凤门            │  ← main S gate
 *   └───────────────────────┘
 *
 * Manifest size: 180 × 240 u (elevation +3).
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, cityGate, pond, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-daming';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const wallOpts = {
    w: 170,
    d: 230,
    h: 8,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 14, name: 'danfengmen' },
      { side: 'N', width: 12, name: 'xuanwumen' },
      { side: 'E', width: 10, name: 'wangxianmen' },
      { side: 'W', width: 10, name: 'jianfumen' },
    ],
  };
  g.add(courtyardWall(wallOpts));

  const plaza = box(140, 0.18, 200, PALETTE.pavingDeep, 0, 0, 0);
  g.add(plaza);

  const royalPath = box(10, 0.06, 200, PALETTE.tileImperial, 0, 0.18, 0);
  g.add(royalPath);

  const danfeng = cityGate({ w: 26, h: 10, d: 5 });
  danfeng.position.set(0, 0, 110);
  danfeng.rotation.y = Math.PI;
  g.add(danfeng);

  const hanyuanPlaza = box(60, 0.32, 30, PALETTE.stoneBase, 0, 0.18, 70);
  g.add(hanyuanPlaza);
  const hanyuan = tangHall({
    w: 44, d: 18, h: 8, columns: 9,
    tile: PALETTE.tileImperial, ridgeOrn: true, raisedBase: 1.6,
  });
  hanyuan.position.set(0, 0.5, 60);
  g.add(hanyuan);
  const longweidao = box(8, 0.4, 14, PALETTE.stoneBase, 0, 0.2, 78);
  g.add(longweidao);

  for (let i = 0; i < 2; i++) {
    const ramp = cone(2.2, 4, PALETTE.column, i === 0 ? -22 : 22, 0.6, 64, 6);
    g.add(ramp);
  }

  const zichen = tangHall({
    w: 32, d: 16, h: 7, columns: 7,
    tile: PALETTE.tileImperial, ridgeOrn: true, raisedBase: 1.2,
  });
  zichen.position.set(0, 0.5, 22);
  g.add(zichen);

  const linde = tangHall({
    w: 50, d: 22, h: 7.5, columns: 9,
    tile: PALETTE.tileImperialGreen, ridgeOrn: true, raisedBase: 1.2,
  });
  linde.position.set(0, 0.5, -20);
  g.add(linde);

  const taiYe = pond({
    w: 60, d: 36,
    islands: [
      { x: 0, z: 0, r: 5, peak: true },
      { x: -16, z: -8, r: 2.5 },
      { x: 14, z: 6, r: 2.0 },
    ],
  });
  taiYe.position.set(0, 0.2, -70);
  g.add(taiYe);

  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    const hull = box(2.8, 0.4, 1.0, 0x6b4a32);
    const cabin = box(2.0, 1.0, 0.8, PALETTE.tileImperial, 0, 0.5, 0);
    const ridge = box(2.1, 0.2, 0.85, PALETTE.tileRidge, 0, 1.05, 0);
    boat.add(hull); boat.add(cabin); boat.add(ridge);
    const angle = (i / 3) * Math.PI * 2 + 0.6;
    boat.position.set(Math.cos(angle) * 18, 0.4, -70 + Math.sin(angle) * 10);
    boat.rotation.y = angle + Math.PI / 2;
    g.add(boat);
  }

  const xuanwu = cityGate({ w: 22, h: 9, d: 5 });
  xuanwu.position.set(0, 0, -110);
  g.add(xuanwu);

  const arch = paifang({ w: 12, h: 5, text: '丹凤朝阳' });
  arch.position.set(0, 0, 92);
  g.add(arch);

  const npcs = (opts.manifest?.npcs) || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'emperor': return 0xb88828;
        case 'lady': return 0xa84a78;
        case 'poet': return 0x2e5e8e;
        case 'foreigner': return 0x6a3e2b;
        case 'official': return 0x3e2d1c;
        default: return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe,
      npcId: npc.id,
      role: npc.role,
      name: npc.name,
      hat: npc.role === 'emperor' ? 0xc99a3a : 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 1.0, npc.spawn?.offsetZ || 0);
    g.add(fig);
    if (window.world?.npc) window.world.npc.register?.(fig, npc);
  }

  const pineMat = new THREE.MeshLambertMaterial({ color: 0x3f5c3a });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x523320 });
  for (let i = 0; i < 18; i++) {
    const px = -75 + Math.random() * 150;
    const pz = -100 + Math.random() * 200;
    if (Math.abs(pz) < 30 && Math.abs(px) < 30) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), trunkMat);
    trunk.position.set(px, 1, pz);
    trunk.castShadow = true;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.5, 6), pineMat);
    crown.position.set(px, 3.5, pz);
    crown.castShadow = true;
    g.add(crown);
  }

  return g;
}
