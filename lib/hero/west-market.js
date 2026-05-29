/**
 * 西市 (West Market) — Tang Chang'an's international bazaar.
 *
 * Manifest size: 120 × 120 u
 * Layout:
 *   ┌─[wall + 4 gates]──────────────┐
 *   │ [spice][spice][gem][gem]      │
 *   │ [wine][wine][carpet][carpet]  │
 *   │   ━━━━ 市楼(center) ━━━━       │
 *   │ [camel][camel][fur][fur]      │
 *   │ [dye][dye][perfume][hujipub]  │
 *   └───────────────────────────────┘
 *
 * Foreigner-heavy: Sogdian, Persian, Turkic, Tibetan merchants.
 */

import * as THREE from 'three';
import {
  PALETTE, box, cyl, cone,
  tangHall, courtyardWall, paifang, npcMarker,
} from './_shared.js';

export const id = 'region-west-market';

const SHOP_COLORS = {
  spice:       { tile: 0xc99a3a, banner: 0xd4a01e },
  gem:         { tile: 0x6b4a8e, banner: 0x9e7bbf },
  'wine-grape':{ tile: 0x5b3b6e, banner: 0x9c5da9 },
  carpet:      { tile: 0x8c4a2f, banner: 0xd06c3f },
  camelmount:  { tile: 0xa78a5e, banner: 0xc99a3a },
  fur:         { tile: 0x6b4a32, banner: 0x9a7048 },
  'dye-house': { tile: 0x4a5670, banner: 0x6e8aa6 },
  perfume:     { tile: 0xa84a78, banner: 0xd06aa4 },
  'huji-pub':  { tile: 0xb96e3f, banner: 0xe8a05a },
};

const SHOP_NAMES = {
  spice: '香药行',
  gem: '珉玉行',
  'wine-grape': '葡萄酒肆',
  carpet: '毛毡行',
  camelmount: '驼商场',
  fur: '皮货行',
  'dye-house': '染坊',
  perfume: '香料行',
  'huji-pub': '胡姬酒肆',
};

function buildShop(kind, w = 12, d = 12) {
  const g = new THREE.Group();
  g.name = 'shop-' + kind;
  const colors = SHOP_COLORS[kind] || SHOP_COLORS.spice;

  const base = box(w, 0.4, d, PALETTE.stoneBase, 0, 0, 0);
  g.add(base);
  const hut = box(w * 0.85, 3.2, d * 0.85, PALETTE.wallBrick, 0, 0.4, 0);
  g.add(hut);
  const eave = box(w * 1.1, 0.4, d * 1.1, colors.tile, 0, 3.7, 0);
  g.add(eave);
  const roof = box(w * 0.95, 1.6, d * 0.95, colors.tile, 0, 4.5, 0);
  g.add(roof);
  const banner = box(0.25, 3.5, 0.25, colors.banner, w / 2 - 0.5, 0, d / 2 - 0.5);
  g.add(banner);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.8),
    new THREE.MeshBasicMaterial({ color: colors.banner, side: THREE.DoubleSide }),
  );
  flag.position.set(w / 2 - 0.5, 2.5, d / 2 - 1.2);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);

  if (kind === 'huji-pub') {
    const seatM = new THREE.MeshLambertMaterial({ color: 0x6b4a32 });
    for (let i = 0; i < 3; i++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), seatM);
      seat.position.set(-w / 3 + i * (w / 3), 0.65, d / 2 + 1.4);
      g.add(seat);
    }
  } else if (kind === 'camelmount') {
    const camelBody = box(2.2, 1.4, 0.9, 0xa78a5e, 0, 1.4, d / 2 + 1.5);
    const humpA = cyl(0.55, 0.6, 0xa78a5e, -0.5, 2.2, d / 2 + 1.5, 8);
    const humpB = cyl(0.55, 0.6, 0xa78a5e,  0.5, 2.2, d / 2 + 1.5, 8);
    const head = box(0.6, 0.6, 0.5, 0xa78a5e, 0, 2.3, d / 2 + 2.4);
    g.add(camelBody); g.add(humpA); g.add(humpB); g.add(head);
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
      { side: 'N', width: 8 },
      { side: 'S', width: 8 },
      { side: 'E', width: 8 },
      { side: 'W', width: 8 },
    ],
  }));

  const ground = box(w - 2, 0.1, d - 2, PALETTE.pavingDeep, 0, 0, 0);
  g.add(ground);

  const shopRows = opts.manifest?.build?.options?.shopRows
    || opts.shopRows
    || [
      ['spice', 'spice', 'gem', 'gem'],
      ['wine-grape', 'wine-grape', 'carpet', 'carpet'],
      ['camelmount', 'camelmount', 'fur', 'fur'],
      ['dye-house', 'dye-house', 'perfume', 'huji-pub'],
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

  for (let i = 1; i < 4; i++) {
    const px = -w / 2 + 8 + i * cellW - cellW / 2;
    const path = box(2, 0.04, d - 4, PALETTE.stoneBase, px, 0.05, 0);
    g.add(path);
  }
  for (let i = 1; i < 4; i++) {
    const pz = -d / 2 + 8 + i * cellD - cellD / 2;
    const path = box(w - 4, 0.04, 2, PALETTE.stoneBase, 0, 0.05, pz);
    g.add(path);
  }

  const shiLou = new THREE.Group();
  const slBase = box(8, 0.6, 8, PALETTE.stoneBase, 0, 0, 0);
  const slBody = box(6, 4, 6, PALETTE.column, 0, 0.6, 0);
  const slEave = box(9, 0.5, 9, PALETTE.tileImperial, 0, 4.6, 0);
  const slRoof = box(7.5, 2.5, 7.5, PALETTE.tileImperial, 0, 5.1, 0);
  const slDrum = cyl(0.5, 1.0, PALETTE.beam, 0, 1.5, 0, 12);
  shiLou.add(slBase); shiLou.add(slBody); shiLou.add(slEave); shiLou.add(slRoof); shiLou.add(slDrum);
  shiLou.userData.shiLou = true;
  g.add(shiLou);

  const arch = paifang({ w: 8, h: 5, text: '西市' });
  arch.position.set(0, 0, d / 2 - 4);
  g.add(arch);

  const npcs = opts.manifest?.npcs || [];
  for (const npc of npcs) {
    const robe = (() => {
      switch (npc.role) {
        case 'foreigner': return 0x9a5a3e;
        case 'songstress': return 0xc94e7e;
        case 'poet': return 0x2e5e8e;
        case 'merchant': return 0x6b4a32;
        default: return 0x4a4032;
      }
    })();
    const fig = npcMarker({
      robe,
      npcId: npc.id,
      role: npc.role,
      name: npc.name,
      hat: npc.role === 'foreigner' ? 0x8a4a32 : 0x1a1410,
    });
    fig.position.set(npc.spawn?.offsetX || 0, 0.6, npc.spawn?.offsetZ || 0);
    g.add(fig);
  }

  return g;
}
