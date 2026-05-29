/**
 * Shared building primitives for Tang Chang'an hero modules.
 *
 * Style guide:
 *   - Hipped roof (庑殿) for imperial halls (玄宗朝最高级)
 *   - Gable-hip (歇山) for officials / temples
 *   - Vermilion columns (#a8332f)
 *   - Yellow/green glazed tiles (#c99a3a / #4d7e44) for imperial
 *   - Grey tiles (#3a4250) for non-imperial
 *   - White stone bases (#bba588)
 *
 * All builders return THREE.Group with castShadow/receiveShadow set.
 */

import * as THREE from 'three';

export const PALETTE = Object.freeze({
  column: 0xa8332f,
  beam: 0x5b3221,
  wallBrick: 0xbba588,
  wallTop: 0x8a785b,
  stoneBase: 0xc8b89a,
  pavingDeep: 0xa89878,
  tileImperial: 0xc99a3a,
  tileImperialGreen: 0x4d7e44,
  tileGrey: 0x3a4250,
  tileRidge: 0x252a36,
  wood: 0x6b4a32,
  water: 0x5e93a7,
  waterDeep: 0x3f6c80,
  jade: 0x6fb1c4,
  grass: 0x5e8255,
});

const MAT = {};
function mat(id, color, extras = {}) {
  if (!MAT[id]) MAT[id] = new THREE.MeshLambertMaterial({ color, ...extras });
  return MAT[id];
}
export function getMat(id, color, extras) {
  return mat(id, color, extras);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, rotY = 0) {
  const m = mat('box-' + color, color);
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  g.position.set(x, y + h / 2, z);
  g.rotation.y = rotY;
  g.castShadow = true; g.receiveShadow = true;
  return g;
}

export function cyl(r, h, color, x = 0, y = 0, z = 0, segs = 12) {
  const m = mat('cyl-' + color, color);
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segs), m);
  g.position.set(x, y + h / 2, z);
  g.castShadow = true; g.receiveShadow = true;
  return g;
}

export function cone(r, h, color, x = 0, y = 0, z = 0, segs = 4, rotY = 0) {
  const m = mat('cone-' + color, color);
  const g = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), m);
  g.position.set(x, y + h / 2, z);
  g.rotation.y = rotY;
  g.castShadow = true;
  return g;
}

/**
 * 中式大殿. Used for 含元殿 / 麟德殿 / 紫宸殿 / 太极殿 etc.
 * @param {object} opts
 *   w: width (east-west), d: depth (north-south), h: column height
 *   columns: number of front columns (defaults 7 for hero halls — odd recommended)
 *   tile: tileImperial | tileImperialGreen | tileGrey
 *   ridgeOrn: include ridge ornament
 *   raisedBase: stone platform height (default 1.0)
 *   x, y, z: position of base center
 */
export function tangHall(opts = {}) {
  const w = opts.w ?? 24;
  const d = opts.d ?? 14;
  const h = opts.h ?? 6;
  const columns = opts.columns ?? 7;
  const tile = opts.tile ?? PALETTE.tileImperial;
  const ridgeOrn = opts.ridgeOrn ?? true;
  const baseH = opts.raisedBase ?? 1.0;

  const g = new THREE.Group();

  const baseM = mat('hall-base', PALETTE.stoneBase);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 2, baseH, d + 2), baseM);
  base.position.y = baseH / 2;
  base.receiveShadow = true;
  g.add(base);

  const stepM = mat('hall-step', PALETTE.pavingDeep);
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.6, 0.18, 1.2),
      stepM,
    );
    step.position.set(0, 0.09 + i * 0.18, d / 2 + 1.4 + i * 1.0);
    g.add(step);
  }

  const colM = mat('hall-col', PALETTE.column);
  const colR = 0.32;
  const colY = baseH;
  for (let i = 0; i < columns; i++) {
    const xx = -w / 2 + 0.8 + (w - 1.6) * (i / (columns - 1));
    const front = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR, h, 10), colM);
    front.position.set(xx, colY + h / 2, d / 2 - 0.7);
    front.castShadow = true;
    g.add(front);
    const back = front.clone();
    back.position.z = -d / 2 + 0.7;
    g.add(back);
  }

  const wallM = mat('hall-wall', PALETTE.wallBrick);
  const wallH = h * 0.8;
  const sideWalls = [
    { w: 1.0, d: d - 1.4, x: -w / 2 + 0.5, z: 0 },
    { w: 1.0, d: d - 1.4, x:  w / 2 - 0.5, z: 0 },
    { w: w - 8,  d: 1.0,   x: 0, z: -d / 2 + 0.5 },
  ];
  for (const wp of sideWalls) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wp.w, wallH, wp.d), wallM);
    wall.position.set(wp.x, baseH + wallH / 2, wp.z);
    wall.castShadow = true; wall.receiveShadow = true;
    g.add(wall);
  }

  const eaveH = 0.4;
  const eaveOverhang = 1.6;
  const eaveM = mat('hall-eave-' + tile.toString(16), tile);
  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(w + eaveOverhang * 2, eaveH, d + eaveOverhang * 2),
    eaveM,
  );
  eave.position.y = baseH + h;
  eave.castShadow = true;
  g.add(eave);

  const roofH = Math.max(2.5, h * 0.55);
  const roofGeo = new THREE.BoxGeometry(w + eaveOverhang * 1.7, roofH, d + eaveOverhang * 1.7);
  const roof = new THREE.Mesh(roofGeo, eaveM);
  roof.position.y = baseH + h + eaveH + roofH / 2;
  roof.castShadow = true;
  g.add(roof);

  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(w + eaveOverhang * 1.7, 0.35, 0.8),
    mat('hall-ridge', PALETTE.tileRidge),
  );
  ridge.position.y = baseH + h + eaveH + roofH + 0.18;
  g.add(ridge);

  if (ridgeOrn) {
    const ornL = cone(0.5, 1.4, PALETTE.tileRidge,
      -w / 2 - eaveOverhang * 0.85, baseH + h + eaveH + roofH + 0.35, 0, 4, Math.PI / 4);
    const ornR = ornL.clone();
    ornR.position.x = w / 2 + eaveOverhang * 0.85;
    g.add(ornL); g.add(ornR);
  }

  if (opts.x !== undefined || opts.y !== undefined || opts.z !== undefined) {
    g.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
  }
  return g;
}

/**
 * 坊墙 / 院墙 (4 walls + optional gates).
 * opts: { w, d, h, t, color, gates }
 *   gates: array of {side:'N'|'S'|'E'|'W', width, name?}
 */
export function courtyardWall(opts = {}) {
  const w = opts.w ?? 60;
  const d = opts.d ?? 60;
  const h = opts.h ?? 4;
  const t = opts.t ?? 0.8;
  const color = opts.color ?? PALETTE.wallBrick;
  const gates = opts.gates ?? [];

  const g = new THREE.Group();
  const wallM = mat('court-wall', color);
  const topM = mat('court-walltop', PALETTE.wallTop);

  const sides = [
    { side: 'N', cx: 0, cz: -d / 2 + t / 2, ww: w, dd: t },
    { side: 'S', cx: 0, cz:  d / 2 - t / 2, ww: w, dd: t },
    { side: 'W', cx: -w / 2 + t / 2, cz: 0, ww: t, dd: d },
    { side: 'E', cx:  w / 2 - t / 2, cz: 0, ww: t, dd: d },
  ];
  for (const s of sides) {
    const gate = gates.find((gt) => gt.side === s.side);
    if (!gate) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(s.ww, h, s.dd), wallM);
      wall.position.set(s.cx, h / 2, s.cz);
      wall.castShadow = true; wall.receiveShadow = true;
      g.add(wall);
      const top = new THREE.Mesh(new THREE.BoxGeometry(s.ww + 0.2, 0.35, s.dd + 0.2), topM);
      top.position.set(s.cx, h + 0.18, s.cz);
      g.add(top);
    } else {
      const isHoriz = s.side === 'N' || s.side === 'S';
      const gw = gate.width || 6;
      const sideLen = isHoriz ? (w - gw) / 2 : (d - gw) / 2;
      for (let k = 0; k < 2; k++) {
        const sgn = k === 0 ? -1 : 1;
        const offset = sgn * (gw / 2 + sideLen / 2);
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(isHoriz ? sideLen : s.ww, h, isHoriz ? s.dd : sideLen),
          wallM,
        );
        wall.position.set(
          isHoriz ? offset : s.cx,
          h / 2,
          isHoriz ? s.cz : offset,
        );
        wall.castShadow = true; wall.receiveShadow = true;
        g.add(wall);
      }
      const gateBase = box(
        isHoriz ? gw : t * 2,
        h * 1.1,
        isHoriz ? t * 2 : gw,
        PALETTE.column,
        s.cx, 0, s.cz,
      );
      g.add(gateBase);
      const gateRoof = box(
        isHoriz ? gw + 1 : t * 3,
        0.5,
        isHoriz ? t * 3 : gw + 1,
        PALETTE.tileImperial,
        s.cx, h * 1.1, s.cz,
      );
      g.add(gateRoof);
    }
  }
  return g;
}

/**
 * 城门 (large gate tower). Bigger than courtyard gate.
 */
export function cityGate(opts = {}) {
  const w = opts.w ?? 24;
  const h = opts.h ?? 10;
  const d = opts.d ?? 6;
  const g = new THREE.Group();
  const base = box(w, h, d, PALETTE.wallBrick, 0, 0, 0);
  g.add(base);
  const archGeo = new THREE.BoxGeometry(w * 0.25, h * 0.55, d + 0.2);
  const archMat = new THREE.MeshBasicMaterial({ color: 0x111114 });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.y = h * 0.28;
  g.add(arch);
  const tower = box(w * 0.9, 2, d * 0.9, PALETTE.column, 0, h, 0);
  g.add(tower);
  const roof = box(w * 1.05, 0.6, d * 1.15, PALETTE.tileImperial, 0, h + 2, 0);
  g.add(roof);
  const ridge = box(w * 1.05, 0.4, 0.4, PALETTE.tileRidge, 0, h + 2.6, 0);
  g.add(ridge);
  return g;
}

/**
 * 大雁塔 / 砖塔 (square brick pagoda).
 * @param {object} opts levels, baseW, baseH, tile
 */
export function brickPagoda(opts = {}) {
  const levels = opts.levels ?? 7;
  const baseW = opts.baseW ?? 9;
  const baseH = opts.baseH ?? 3.4;
  const taper = opts.taper ?? 0.78;
  const g = new THREE.Group();

  const platform = box(baseW * 1.5, 0.8, baseW * 1.5, PALETTE.stoneBase, 0, 0, 0);
  g.add(platform);

  let curW = baseW;
  let y = 0.8;
  for (let i = 0; i < levels; i++) {
    const tier = box(curW, baseH, curW, PALETTE.wallBrick, 0, y, 0);
    g.add(tier);
    const eave = box(curW * 1.12, 0.4, curW * 1.12, PALETTE.tileGrey, 0, y + baseH, 0);
    g.add(eave);
    y += baseH + 0.4;
    curW *= taper;
  }
  const top = cone(curW * 0.55, 2.4, PALETTE.tileImperial, 0, y, 0, 8);
  g.add(top);
  return g;
}

/**
 * 水池 / 太液池. Simple flat water plane + optional islands.
 */
export function pond(opts = {}) {
  const w = opts.w ?? 30;
  const d = opts.d ?? 20;
  const islands = opts.islands ?? [];
  const g = new THREE.Group();
  const waterMat = new THREE.MeshLambertMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: 0.85,
  });
  const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), waterMat);
  water.position.y = 0.08;
  g.add(water);
  const bank = box(w + 1, 0.4, 0.4, PALETTE.stoneBase, 0, 0.1, -d / 2 - 0.1);
  g.add(bank);
  const bank2 = bank.clone(); bank2.position.z = d / 2 + 0.1; g.add(bank2);
  const bank3 = box(0.4, 0.4, d + 1, PALETTE.stoneBase, -w / 2 - 0.1, 0.1, 0); g.add(bank3);
  const bank4 = bank3.clone(); bank4.position.x = w / 2 + 0.1; g.add(bank4);

  for (const isl of islands) {
    const ix = isl.x || 0, iz = isl.z || 0, ir = isl.r || 3;
    const land = new THREE.Mesh(
      new THREE.CylinderGeometry(ir, ir * 1.05, 0.5, 16),
      mat('isl-land', 0x6e5a3e),
    );
    land.position.set(ix, 0.4, iz);
    land.castShadow = true; land.receiveShadow = true;
    g.add(land);
    if (isl.peak) {
      const peak = cone(ir * 0.4, 2.5, PALETTE.column, ix, 0.5, iz, 6);
      g.add(peak);
    }
  }
  return g;
}

/**
 * 牌坊 / paifang (memorial archway).
 */
export function paifang(opts = {}) {
  const w = opts.w ?? 8;
  const h = opts.h ?? 5;
  const text = opts.text ?? '';
  const g = new THREE.Group();
  const colL = cyl(0.25, h, PALETTE.column, -w / 2, 0, 0, 8);
  const colR = cyl(0.25, h, PALETTE.column,  w / 2, 0, 0, 8);
  g.add(colL); g.add(colR);
  const beam = box(w + 0.6, 0.6, 0.5, PALETTE.column, 0, h - 0.3, 0);
  g.add(beam);
  const roof = box(w + 1.2, 0.4, 0.9, PALETTE.tileImperial, 0, h + 0.3, 0);
  g.add(roof);
  if (text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a120a'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#e8c46c';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.7, 1.0),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    );
    plate.position.y = h - 0.3;
    plate.position.z = 0.3;
    g.add(plate);
  }
  return g;
}

/**
 * Quick NPC marker (low poly humanoid figure for hero modules).
 * Returns a Group with .userData.npcId set to manifest npc id.
 */
export function npcMarker(opts = {}) {
  const robe = opts.robe ?? 0x2a3e5e;
  const skin = opts.skin ?? 0xd9b18a;
  const g = new THREE.Group();
  const body = box(0.6, 1.2, 0.4, robe, 0, 0, 0);
  g.add(body);
  const head = cyl(0.22, 0.4, skin, 0, 1.2, 0, 12);
  g.add(head);
  const hat = box(0.5, 0.2, 0.5, opts.hat ?? 0x1a1410, 0, 1.6, 0);
  g.add(hat);
  g.userData.npcId = opts.npcId;
  g.userData.role = opts.role;
  g.userData.name = opts.name;
  return g;
}
