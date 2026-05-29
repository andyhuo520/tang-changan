/**
 * 太极宫 (Taiji Palace) — Tang early-imperial palace (隋大兴宫).
 *
 * Layout (north up):
 *   ┌──────────玄武门(N)──────────┐
 *   │   后苑 (rear garden)         │
 *   │   ┌─甘露殿─┐  寝居           │
 *   │   ┌─两仪殿─┐  便殿           │
 *   │   ┌─太极殿─┐  大朝, 7间      │
 *   │   ────广运门 / 承天门─────    │
 *   │   东宫 ║ 掖庭宫              │
 *   └──────────承天门(S)──────────┘
 *
 * Manifest size: 120 × 120 u
 * Style: 隋唐过渡期, 较朴素, 用 tileImperialGreen 表区分。
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, cityGate, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-taiji';

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const w = opts.manifest?.size?.w || 120;
  const d = opts.manifest?.size?.d || 120;

  // outer palace wall + 4 gates
  g.add(courtyardWall({
    w, d, h: 7, color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 12, name: 'chengtian-men' },
      { side: 'N', width: 10, name: 'xuanwu-men' },
      { side: 'E', width: 8 },
      { side: 'W', width: 8 },
    ],
  }));

  const plaza = box(w - 6, 0.18, d - 6, PALETTE.pavingDeep, 0, 0, 0);
  g.add(plaza);

  const royal = box(8, 0.06, d - 6, PALETTE.tileImperial, 0, 0.18, 0);
  g.add(royal);

  // 承天门 (south, ceremonial)
  const south = cityGate({ w: 22, h: 9, d: 5 });
  south.position.set(0, 0, d / 2 - 3);
  south.rotation.y = Math.PI;
  g.add(south);

  // 太极殿 (main audience hall, southernmost in the inner court)
  const taiji = tangHall({
    w: 36, d: 16, h: 7, columns: 7,
    tile: PALETTE.tileImperialGreen,  // 绿琉璃 — distinguishes from Daming's yellow
    ridgeOrn: true, raisedBase: 1.4,
  });
  taiji.position.set(0, 0.4, 18);
  g.add(taiji);

  // 两仪殿 (everyday business)
  const liangyi = tangHall({
    w: 26, d: 14, h: 6, columns: 7,
    tile: PALETTE.tileImperialGreen, ridgeOrn: true, raisedBase: 1.0,
  });
  liangyi.position.set(0, 0.4, -6);
  g.add(liangyi);

  // 甘露殿 (sleeping quarters)
  const ganlu = tangHall({
    w: 22, d: 12, h: 5.5, columns: 5,
    tile: PALETTE.tileImperialGreen, ridgeOrn: false, raisedBase: 0.8,
  });
  ganlu.position.set(0, 0.4, -28);
  g.add(ganlu);

  // 后苑 — rear garden (pine + pavilion)
  const pavGround = box(20, 0.06, 14, PALETTE.grass, 0, 0.05, -48);
  g.add(pavGround);
  const pavRoof = box(10, 0.4, 8, PALETTE.tileImperialGreen, 0, 4, -48);
  g.add(pavRoof);
  const pavRoofTop = cone(4.4, 2, PALETTE.tileRidge, 0, 4.4, -48, 4, Math.PI / 4);
  g.add(pavRoofTop);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const col = cyl(0.22, 4, PALETTE.column, Math.cos(a) * 4, 0, -48 + Math.sin(a) * 3, 8);
    g.add(col);
  }

  // 玄武门 (north) — historically significant: 玄武门之变, 626
  const xuanwu = cityGate({ w: 18, h: 9, d: 5 });
  xuanwu.position.set(0, 0, -d / 2 + 3);
  g.add(xuanwu);
  // Add a plaque under the gate to commemorate
  const xuanwuPlaque = paifang({ w: 8, h: 4, text: '玄武门' });
  xuanwuPlaque.position.set(0, 0, -d / 2 + 10);
  g.add(xuanwuPlaque);

  // 东宫 (left, crown prince) - simplified low cluster
  for (let i = 0; i < 3; i++) {
    const eb = box(8, 4, 12, PALETTE.wallBrick, -w / 2 + 14, 0, -10 + i * 16);
    g.add(eb);
    const er = box(9, 1, 13, PALETTE.tileGrey, -w / 2 + 14, 4, -10 + i * 16);
    g.add(er);
  }
  // 掖庭宫 (right, courtesans)
  for (let i = 0; i < 3; i++) {
    const eb = box(8, 4, 12, PALETTE.wallBrick, w / 2 - 14, 0, -10 + i * 16);
    g.add(eb);
    const er = box(9, 1, 13, PALETTE.tileGrey, w / 2 - 14, 4, -10 + i * 16);
    g.add(er);
  }

  // ceremonial pines
  const pineMat = new THREE.MeshLambertMaterial({ color: 0x3f5c3a });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x523320 });
  const pinePoints = [
    [-30, 8], [30, 8], [-30, -36], [30, -36], [-22, 26], [22, 26],
  ];
  for (const [px, pz] of pinePoints) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6), trunkMat);
    trunk.position.set(px, 1.1, pz); trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.6, 6), pineMat);
    crown.position.set(px, 3.7, pz); crown.castShadow = true; g.add(crown);
  }

  // arch
  const arch = paifang({ w: 10, h: 5, text: '太极殿' });
  arch.position.set(0, 0, 32);
  g.add(arch);

  // NPCs
  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'emperor':  return 0xb88828;
        case 'official': return 0x3e2d1c;
        default:         return 0x4a4032;
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
  }

  return g;
}
