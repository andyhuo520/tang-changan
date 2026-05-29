/**
 * 东市 (East Market) — domestic high-end commerce.
 *
 * 120 × 120 u, 4×4 shop grid, central 市楼 (market tower).
 * Goods: 文房四宝, 绫罗, 字画, 漆器, 茶, 酒, 米...
 * Patrons: 进士举子, 官眷, 文士 — less foreigners than 西市.
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-east-market';

const SHOP_COLORS = {
  wenfangsibao: { tile: 0x4a5670, banner: 0x6e8aa6 }, // 文房四宝
  calligraphy:  { tile: 0x6b4a32, banner: 0x9a7048 }, // 字画
  silk:         { tile: 0xa84a78, banner: 0xd06aa4 }, // 绫罗
  lacquer:      { tile: 0x6b4a8e, banner: 0x9e7bbf }, // 漆器
  'paint-mount':{ tile: 0x4d7e44, banner: 0x70a060 }, // 装裱
  scroll:       { tile: 0xc99a3a, banner: 0xd4a01e }, // 卷轴
  tea:          { tile: 0x4d7e44, banner: 0x6fa860 }, // 茶
  'rice-wine':  { tile: 0xb96e3f, banner: 0xe8a05a }, // 米酒
  noodle:       { tile: 0xa78a5e, banner: 0xc99a3a }, // 面食
};

const SHOP_NAMES = {
  wenfangsibao: '笔墨纸砚',
  calligraphy: '字画行',
  silk: '绫罗肆',
  lacquer: '漆器行',
  'paint-mount': '装裱铺',
  scroll: '经卷行',
  tea: '茶肆',
  'rice-wine': '米酒铺',
  noodle: '面食铺',
};

function buildShop(kind, w, d) {
  const g = new THREE.Group();
  const colors = SHOP_COLORS[kind] || SHOP_COLORS.silk;
  const base = box(w, 0.4, d, PALETTE.stoneBase, 0, 0, 0);
  g.add(base);
  const hut = box(w * 0.85, 3.0, d * 0.85, PALETTE.wallBrick, 0, 0.4, 0);
  g.add(hut);
  const eave = box(w * 1.1, 0.36, d * 1.1, colors.tile, 0, 3.5, 0);
  g.add(eave);
  const roof = box(w * 0.95, 1.4, d * 0.95, colors.tile, 0, 4.3, 0);
  g.add(roof);
  const ridge = box(w * 0.96, 0.2, 0.3, PALETTE.tileRidge, 0, 5.05, 0);
  g.add(ridge);
  // banner pole + flag
  const pole = cyl(0.12, 4, colors.banner, w / 2 - 0.5, 0, d / 2 - 0.5, 6);
  g.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.8),
    new THREE.MeshBasicMaterial({ color: colors.banner, side: THREE.DoubleSide }),
  );
  flag.position.set(w / 2 - 0.5 + 0.43, 2.6, d / 2 - 0.5);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);
  // little goods on display
  if (kind === 'silk') {
    for (let i = 0; i < 3; i++) {
      const bolt = box(0.4, 0.4, 1.8, colors.banner, -w / 4 + i * 0.6, 0.6, d / 2 + 1.0);
      g.add(bolt);
    }
  } else if (kind === 'wenfangsibao' || kind === 'calligraphy') {
    const table = box(2.4, 0.5, 1.0, PALETTE.beam, 0, 0.65, d / 2 + 1.0);
    g.add(table);
    for (let i = 0; i < 4; i++) {
      const brush = cyl(0.05, 0.6, 0x1a1410, -0.9 + i * 0.5, 0.9, d / 2 + 1.0, 6);
      g.add(brush);
    }
  } else if (kind === 'tea' || kind === 'rice-wine') {
    for (let i = 0; i < 2; i++) {
      const seat = box(1.0, 0.4, 1.0, PALETTE.beam, -0.8 + i * 1.6, 0.6, d / 2 + 1.4);
      g.add(seat);
    }
  } else if (kind === 'scroll') {
    for (let i = 0; i < 3; i++) {
      const scroll = cyl(0.18, 1.0, colors.banner, -0.8 + i * 0.8, 0.6, d / 2 + 1.0, 8);
      g.add(scroll);
    }
  }
  return g;
}

export function build(opts = {}) {
  const g = new THREE.Group();
  g.name = id;

  const w = opts.manifest?.size?.w || 120;
  const d = opts.manifest?.size?.d || 120;

  g.add(courtyardWall({
    w, d, h: 5,
    color: PALETTE.wallBrick,
    gates: [
      { side: 'N', width: 9 },
      { side: 'S', width: 9 },
      { side: 'E', width: 9 },
      { side: 'W', width: 9 },
    ],
  }));

  const ground = box(w - 2, 0.1, d - 2, PALETTE.pavingDeep, 0, 0, 0);
  g.add(ground);

  // shop grid 4×4
  const shopRows = opts.manifest?.build?.options?.shopRows
    || opts.shopRows
    || [
      ['wenfangsibao', 'wenfangsibao', 'calligraphy', 'calligraphy'],
      ['silk', 'silk', 'lacquer', 'lacquer'],
      ['paint-mount', 'paint-mount', 'scroll', 'scroll'],
      ['tea', 'tea', 'rice-wine', 'noodle'],
    ];

  const cellW = (w - 16) / 4;
  const cellD = (d - 16) / 4;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const kind = shopRows[r]?.[c];
      if (!kind) continue;
      const shop = buildShop(kind, cellW * 0.85, cellD * 0.85);
      shop.position.set(
        -w / 2 + 8 + cellW / 2 + c * cellW,
        0,
        d / 2 - 8 - cellD / 2 - r * cellD,
      );
      g.add(shop);
    }
  }

  // inner streets
  for (let i = 1; i < 4; i++) {
    const px = -w / 2 + 8 + i * cellW - cellW / 2;
    g.add(box(2, 0.04, d - 4, PALETTE.stoneBase, px, 0.05, 0));
  }
  for (let i = 1; i < 4; i++) {
    const pz = -d / 2 + 8 + i * cellD - cellD / 2;
    g.add(box(w - 4, 0.04, 2, PALETTE.stoneBase, 0, 0.05, pz));
  }

  // central 市楼
  const shiLou = new THREE.Group();
  const slBase = box(7, 0.6, 7, PALETTE.stoneBase, 0, 0, 0);
  const slBody = box(5, 4, 5, PALETTE.column, 0, 0.6, 0);
  const slEave = box(8, 0.5, 8, PALETTE.tileImperial, 0, 4.6, 0);
  const slRoof = box(6.5, 2.2, 6.5, PALETTE.tileImperial, 0, 5.1, 0);
  const slDrum = cyl(0.5, 1.0, PALETTE.beam, 0, 1.5, 0, 12);
  shiLou.add(slBase, slBody, slEave, slRoof, slDrum);
  g.add(shiLou);

  // entrance paifang
  const arch = paifang({ w: 8, h: 5, text: '东市' });
  arch.position.set(0, 0, d / 2 - 4);
  g.add(arch);

  // ornamental plum trees
  const plumMat = new THREE.MeshLambertMaterial({ color: 0xc4577a });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x523320 });
  for (const [px, pz] of [[-50, 50], [50, 50], [-50, -50], [50, -50]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 6), trunkMat);
    trunk.position.set(px, 0.6, pz); g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), plumMat);
    crown.position.set(px, 1.6, pz); g.add(crown);
  }

  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'scholar':  return 0x2e5e8e;
        case 'lady':     return 0xa84a78;
        case 'merchant': return 0x6b4a32;
        default:         return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe,
      npcId: npc.id, role: npc.role, name: npc.name,
      hat: 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 0.6, npc.spawn?.offsetZ || 0);
    g.add(fig);
  }
  return g;
}
