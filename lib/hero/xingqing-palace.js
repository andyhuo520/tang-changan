/**
 * 兴庆宫 (Xingqing Palace) — Tang Xuanzong's beloved residence.
 *
 * 100 × 100 u, near city's east, NOT in the imperial 北宫城.
 * Famous for: 龙池, 沉香亭 (where 李白 met 杨贵妃), 花萼相辉楼.
 *
 * Layout (north up):
 *   ┌───────────────────────────┐
 *   │  花萼相辉楼  勤政务本楼     │
 *   │   兴庆殿(main)             │
 *   │   ┌─龙池─┐                │
 *   │   │ 沉香 │                │
 *   │   │  亭  │                │
 *   │   └──────┘                │
 *   │  乐舞台 (music stage)      │
 *   └───────────────────────────┘
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, pond, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-xingqing';

function makeChenxiangTing() {
  // 沉香亭 — square pavilion built from 沉香木 (purple-brown)
  const g = new THREE.Group();
  // base
  g.add(box(7, 0.6, 7, PALETTE.stoneBase, 0, 0, 0));
  // 4 columns in red+purple tone (representing 沉香)
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    g.add(cyl(0.18, 3, 0x5b2e2a, x, 0.6, z, 8));
  }
  // roof
  g.add(box(8.5, 0.4, 8.5, PALETTE.tileImperial, 0, 3.7, 0));
  g.add(cone(3.6, 1.8, PALETTE.tileImperial, 0, 4.1, 0, 4, Math.PI / 4));
  // ridge ornaments
  for (const [x, z] of [[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]]) {
    g.add(cone(0.3, 0.6, PALETTE.tileRidge, x, 3.9, z, 4));
  }
  // hanging lantern
  const lantern = cyl(0.3, 0.5, 0xffb86b, 0, 2.8, 0, 12);
  g.add(lantern);
  return g;
}

function makeFlowerLou(name) {
  // 花萼/勤政 = ornate 2-story tower
  const g = new THREE.Group();
  g.add(box(13, 0.6, 11, PALETTE.stoneBase, 0, 0, 0));
  g.add(box(11, 4, 9, PALETTE.column, 0, 0.6, 0));
  g.add(box(13, 0.4, 11, PALETTE.tileImperial, 0, 4.8, 0));
  g.add(box(10, 3.5, 8, PALETTE.wallBrick, 0, 5.2, 0));
  g.add(box(12, 0.4, 10, PALETTE.tileImperial, 0, 8.7, 0));
  // 千鸟破风 (chigi-like ornaments)
  for (const x of [-5, 5]) {
    g.add(cone(0.4, 1.2, PALETTE.tileRidge, x, 9, 0, 4, Math.PI / 4));
  }
  return g;
}

function makePeonyBush() {
  const g = new THREE.Group();
  const colors = [0xe6557e, 0xd64263, 0xe89bb4, 0xc83856];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 5),
      new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }),
    );
    c.position.set(Math.cos(i * 1.5) * 0.5, 0.3 + Math.random() * 0.2, Math.sin(i * 1.5) * 0.5);
    g.add(c);
  }
  return g;
}

function makeMusicStage() {
  const g = new THREE.Group();
  g.add(box(10, 0.7, 6, PALETTE.stoneBase, 0, 0, 0));
  g.add(box(10, 0.2, 6, PALETTE.tileImperial, 0, 0.7, 0));
  // drum
  g.add(cyl(0.6, 1.0, PALETTE.beam, -3, 0.9, 0, 12));
  // guzheng (just a long box)
  g.add(box(2.4, 0.16, 0.4, 0x6b4a32, 0.5, 1.0, 0));
  // pipa
  g.add(box(0.6, 0.16, 1.0, 0x6b4a32, 3, 1.0, 0));
  return g;
}

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const w = opts.manifest?.size?.w || 100;
  const d = opts.manifest?.size?.d || 100;

  g.add(courtyardWall({
    w, d, h: 6, color: PALETTE.wallBrick,
    gates: [
      { side: 'S', width: 10, name: 'xingqing-south' },
      { side: 'W', width: 8, name: 'xingqing-west' },
      { side: 'N', width: 8 },
      { side: 'E', width: 8 },
    ],
  }));

  g.add(box(w - 4, 0.1, d - 4, PALETTE.pavingDeep, 0, 0, 0));

  // 兴庆殿 (main hall, north)
  const xingqing = tangHall({
    w: 26, d: 13, h: 6.5, columns: 7,
    tile: PALETTE.tileImperial, ridgeOrn: true, raisedBase: 1.2,
  });
  xingqing.position.set(0, 0.4, -30);
  g.add(xingqing);

  // 花萼相辉楼 (NE) + 勤政务本楼 (NW)
  const huae = makeFlowerLou('花萼相辉楼');
  huae.position.set(20, 0, -16);
  g.add(huae);
  const qinzheng = makeFlowerLou('勤政务本楼');
  qinzheng.position.set(-20, 0, -16);
  g.add(qinzheng);

  // 龙池 (central pond)
  const longchi = pond({
    w: 40, d: 32,
    islands: [{ x: 0, z: 0, r: 3.5, peak: false }],
  });
  longchi.position.set(0, 0.15, 8);
  g.add(longchi);

  // 沉香亭 — on the island in 龙池
  const chenxiang = makeChenxiangTing();
  chenxiang.position.set(0, 0.4, 8);
  g.add(chenxiang);

  // arched bridge to 沉香亭
  const bridgeMat = new THREE.MeshLambertMaterial({ color: PALETTE.stoneBase });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 14), bridgeMat);
  bridge.position.set(0, 1.0, 17);
  g.add(bridge);

  // 乐舞台 (music stage, south side)
  const stage = makeMusicStage();
  stage.position.set(0, 0, 32);
  g.add(stage);

  // 牡丹 borders — famous, since 李白's "云想衣裳花想容" was written about 牡丹 here
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const r = 22 + (i % 3) * 1.8;
    const px = Math.cos(angle) * r;
    const pz = 8 + Math.sin(angle) * r * 0.8;
    if (Math.hypot(px, pz - 8) < 18) continue; // skip pond
    const peony = makePeonyBush();
    peony.position.set(px, 0, pz);
    g.add(peony);
  }

  // entrance arch
  const arch = paifang({ w: 10, h: 5, text: '兴庆宫' });
  arch.position.set(0, 0, d / 2 - 3);
  g.add(arch);

  // 沉香亭 plaque (small)
  const cxPlaque = paifang({ w: 4, h: 2.5, text: '沉香亭' });
  cxPlaque.position.set(0, 0.4, 13);
  cxPlaque.scale.set(0.7, 0.7, 0.7);
  g.add(cxPlaque);

  // NPCs
  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'poet':       return 0x2e5e8e;
        case 'lady':       return 0xa84a78;
        case 'songstress': return 0xc94e7e;
        default:           return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe, npcId: npc.id, role: npc.role, name: npc.name,
      hat: 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 0.6, (npc.spawn?.offsetZ || 0) + 8);
    g.add(fig);
  }
  return g;
}
