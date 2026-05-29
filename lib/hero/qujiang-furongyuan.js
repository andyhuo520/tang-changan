/**
 * 曲江·芙蓉园 (Qujiang Pond & Furong Garden) — imperial pleasure garden.
 *
 * 160 × 180 u in city's SE corner.
 *
 * Layout:
 *   - West:   芙蓉园 (imperial garden) walled
 *   - East:   曲江池 (open pond, public access)
 *   - North:  乐游原 (raised plateau)
 *   - Center: 紫云楼 (multi-story pavilion overlooking lake)
 *   - SE:     杏园 (apricot grove for new 进士 feast)
 *
 * Vibe: 柳树 + 桃花 + 荷塘 + 画舫 + 文士群游.
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  courtyardWall, pond, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-qujiang';

function makeWillow(scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.2 * scale, 2.2 * scale, 0x5d4633, 0, 0, 0, 6);
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.random();
    const r = 1.4 * scale;
    const branch = new THREE.Mesh(
      new THREE.SphereGeometry(0.9 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshLambertMaterial({ color: 0x9aaf60 }),
    );
    branch.scale.set(1.4, 2.4, 1.4);
    branch.position.set(Math.cos(a) * r * 0.6, 2.4 * scale, Math.sin(a) * r * 0.6);
    g.add(branch);
  }
  return g;
}

function makePeachTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.16 * scale, 1.4 * scale, 0x5d4633, 0, 0, 0, 6);
  g.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.9 * scale, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe89bb4 }),
  );
  crown.position.y = 1.9 * scale;
  g.add(crown);
  return g;
}

function makePavilion3Story() {
  const g = new THREE.Group();
  // platform
  g.add(box(11, 0.8, 11, PALETTE.stoneBase, 0, 0, 0));
  // story 1
  g.add(box(9, 4, 9, PALETTE.column, 0, 0.8, 0));
  g.add(box(11, 0.4, 11, PALETTE.tileImperial, 0, 4.8, 0));
  // story 2
  g.add(box(8, 3.5, 8, PALETTE.wallBrick, 0, 5.2, 0));
  g.add(box(10, 0.4, 10, PALETTE.tileImperial, 0, 8.7, 0));
  // story 3
  g.add(box(6.5, 3, 6.5, PALETTE.column, 0, 9.1, 0));
  g.add(box(8.5, 0.4, 8.5, PALETTE.tileImperial, 0, 12.1, 0));
  // top roof
  const top = cone(4.5, 2.4, PALETTE.tileImperial, 0, 12.5, 0, 4, Math.PI / 4);
  g.add(top);
  // ridge ornaments
  for (const [x, z] of [[-3.8, 0], [3.8, 0], [0, -3.8], [0, 3.8]]) {
    g.add(cone(0.4, 0.7, PALETTE.tileRidge, x, 12.4, z, 4));
  }
  return g;
}

function makeBoat() {
  const b = new THREE.Group();
  b.add(box(3.4, 0.4, 1.2, 0x6b4a32, 0, 0, 0));
  b.add(box(2.4, 1.0, 1.0, PALETTE.tileImperial, 0, 0.5, 0));
  b.add(box(2.6, 0.2, 1.05, PALETTE.tileRidge, 0, 1.1, 0));
  // bow
  b.add(cone(0.5, 0.6, 0x6b4a32, 1.9, 0, 0, 4, Math.PI / 4));
  return b;
}

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const w = opts.manifest?.size?.w || 160;
  const d = opts.manifest?.size?.d || 180;

  // outer (low) wall on west half = 芙蓉园 (imperial)
  const furongW = 70;
  g.add(courtyardWall({
    w: furongW, d: d - 8, h: 5, color: PALETTE.wallBrick,
    gates: [
      { side: 'E', width: 8, name: 'furong-east' },
      { side: 'S', width: 6, name: 'furong-south' },
    ],
  }) /* will offset below */);
  const furongWall = g.children[g.children.length - 1];
  furongWall.position.set(-w / 2 + furongW / 2 + 4, 0, 0);

  // overall ground
  g.add(box(w - 4, 0.1, d - 4, PALETTE.grass, 0, 0, 0));

  // 曲江池 — large pond on east 2/3, irregular shape via overlapping boxes
  const lake = pond({
    w: 80, d: 100,
    islands: [
      { x: 0, z: 0, r: 5, peak: true },
      { x: -16, z: 16, r: 3 },
      { x: 18, z: -20, r: 3 },
    ],
  });
  lake.position.set(28, 0.15, 0);
  g.add(lake);

  // 紫云楼 — central pavilion overlooking the lake, on the west bank
  const ziyun = makePavilion3Story();
  ziyun.position.set(-10, 0, 0);
  g.add(ziyun);
  const ziyunPlaque = paifang({ w: 8, h: 4, text: '紫云楼' });
  ziyunPlaque.position.set(-10, 0, 10);
  g.add(ziyunPlaque);

  // 杏园 (apricot grove) — SE corner where 进士宴 happens
  const apricotPlaza = box(20, 0.06, 16, 0xe8c9a2, w / 2 - 14, 0.06, d / 2 - 14);
  g.add(apricotPlaza);
  for (let i = 0; i < 6; i++) {
    const ax = w / 2 - 22 + (i % 3) * 6;
    const az = d / 2 - 22 + Math.floor(i / 3) * 8;
    const tree = makePeachTree(1.1);
    tree.position.set(ax, 0, az);
    g.add(tree);
  }
  const apricotPlaque = paifang({ w: 5, h: 3, text: '杏园' });
  apricotPlaque.position.set(w / 2 - 14, 0, d / 2 - 22);
  apricotPlaque.scale.set(0.8, 0.8, 0.8);
  g.add(apricotPlaque);

  // 乐游原 (north plateau) — raised earth
  const leyouOrigin = -d / 2 + 18;
  g.add(box(40, 1.5, 14, 0x9c7c4c, 30, 0.75, leyouOrigin));
  // mini pavilion on plateau
  const platePav = new THREE.Group();
  platePav.add(box(6, 3, 6, PALETTE.column, 0, 0, 0));
  platePav.add(box(7.5, 0.3, 7.5, PALETTE.tileImperial, 0, 3, 0));
  platePav.add(cone(3, 1.6, PALETTE.tileImperial, 0, 3.3, 0, 4, Math.PI / 4));
  platePav.position.set(30, 1.5, leyouOrigin);
  g.add(platePav);
  const leyouPlaque = paifang({ w: 7, h: 4, text: '乐游原' });
  leyouPlaque.position.set(30, 1.5, leyouOrigin + 8);
  g.add(leyouPlaque);

  // boats on the lake
  const boats = opts.manifest?.build?.options?.boats || 6;
  for (let i = 0; i < boats; i++) {
    const boat = makeBoat();
    const a = (i / boats) * Math.PI * 2;
    boat.position.set(28 + Math.cos(a) * 22, 0.4, Math.sin(a) * 26);
    boat.rotation.y = a + Math.PI / 2;
    g.add(boat);
  }

  // willows along the banks
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2;
    const rr = 38 + (i % 3) * 2;
    const wx = 28 + Math.cos(ang) * rr;
    const wz = Math.sin(ang) * rr;
    if (Math.abs(wx) > w / 2 - 2 || Math.abs(wz) > d / 2 - 2) continue;
    const willow = makeWillow(0.9 + Math.random() * 0.4);
    willow.position.set(wx, 0, wz);
    g.add(willow);
  }

  // peach trees in furong garden
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const rr = 22 + (i % 2) * 5;
    const px = -w / 2 + furongW / 2 + 4 + Math.cos(ang) * rr;
    const pz = Math.sin(ang) * rr;
    if (Math.abs(px) > w / 2 - 2 || Math.abs(pz) > d / 2 - 2) continue;
    const tree = makePeachTree(0.8 + Math.random() * 0.4);
    tree.position.set(px, 0, pz);
    g.add(tree);
  }

  // 芙蓉花池 — small lily pond in Furong garden
  const lily = pond({ w: 16, d: 14, islands: [] });
  lily.position.set(-w / 2 + furongW / 2 + 4, 0.15, 20);
  g.add(lily);

  // arched stone bridge from west bank to island
  const bridge = new THREE.Group();
  bridge.add(box(14, 0.4, 2.4, PALETTE.stoneBase, 0, 1.2, 0));
  bridge.add(cyl(1.0, 0.4, PALETTE.stoneBase, -4.5, 0, 0, 12));
  bridge.add(cyl(1.0, 0.4, PALETTE.stoneBase,  4.5, 0, 0, 12));
  bridge.rotation.y = -Math.PI / 6;
  bridge.position.set(8, 0, 6);
  g.add(bridge);

  // entrance arches
  const arch = paifang({ w: 12, h: 6, text: '曲江' });
  arch.position.set(0, 0, d / 2 - 3);
  g.add(arch);
  const archW = paifang({ w: 10, h: 5, text: '芙蓉园' });
  archW.position.set(-w / 2 + 6, 0, 0);
  archW.rotation.y = Math.PI / 2;
  g.add(archW);

  // NPCs
  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'poet':    return 0x2e5e8e;
        case 'lady':    return 0xa84a78;
        case 'scholar': return 0x4a5670;
        case 'civilian':return 0x6b4a32;
        default:        return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe, npcId: npc.id, role: npc.role, name: npc.name,
      hat: 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 0.6, npc.spawn?.offsetZ || 0);
    g.add(fig);
  }
  return g;
}
