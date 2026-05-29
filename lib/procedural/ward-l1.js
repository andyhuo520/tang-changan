/**
 * L1 (procedural) ward template — generated from grid+template+density.
 *
 * One ward (default 60×60) is built as:
 *   - outer ward wall (low, ~2 u high)
 *   - 4 corner stones
 *   - cross 十字 main street inside (4 u wide)
 *   - 4 quadrants, each filled with a procedural house cluster
 *   - optionally one landmark (small shrine / well / shop) at center
 *
 * All houses use shared InstancedMesh for low draw call.
 */

import * as THREE from 'three';
import { GRID } from '../world/grid.js';

const PALETTE = {
  wall: 0xbba588,
  wallTop: 0x8a785b,
  roofTile: 0x3a4250,
  roofRidge: 0x252a36,
  groundPath: 0xa89878,
  groundEarth: 0x8e6e45,
};

const TEMPLATE_CONFIG = {
  residential: { housesPerQuad: { low: 1, medium: 3, high: 5 }, landmark: null },
  mixed:       { housesPerQuad: { low: 2, medium: 4, high: 6 }, landmark: 'well' },
  'temple-small': { housesPerQuad: { low: 1, medium: 2, high: 3 }, landmark: 'shrine' },
  office:      { housesPerQuad: { low: 1, medium: 2, high: 4 }, landmark: 'tower' },
  'market-fringe': { housesPerQuad: { low: 2, medium: 4, high: 6 }, landmark: 'banner' },
  garden:      { housesPerQuad: { low: 0, medium: 1, high: 2 }, landmark: 'pavilion' },
};

/* 歇山式 hipped roof: 矮金字塔屋顶下 + 木檐 + 正脊 */
function makeHippedRoofGeo(baseW = 6.4, eaveOver = 0.6, slopeH = 1.6, eaveH = 0.4) {
  /* 用三个 box/pyramid 组合; 我们 instance 化为单 geometry → 这里只生成 base eave;
     正脊和坡顶分别 instance */
  return new THREE.BoxGeometry(baseW + eaveOver * 2, eaveH, baseW + eaveOver * 2);
}

function makePyramidRoofGeo(baseW = 6.4, slopeH = 1.6) {
  // 4 面金字塔 (歇山简化), 高度低, 看起来像中式坡顶
  return new THREE.ConeGeometry(baseW * 0.78, slopeH, 4);
}

function makeRidgeGeo(baseW = 6.4) {
  // 正脊 = 长 0.7w 的矮 box 横在金字塔顶
  return new THREE.BoxGeometry(baseW * 0.7, 0.22, 0.32);
}

const _shared = (() => {
  const houseGeo = new THREE.BoxGeometry(6, 4, 6);
  const eaveGeo  = makeHippedRoofGeo(6.4, 0.6, 1.6, 0.4);
  const pyramidGeo = makePyramidRoofGeo(6.4, 1.6);
  const ridgeGeo = makeRidgeGeo(6.4);
  const flagPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 6, 6);
  const flagFlagGeo = new THREE.PlaneGeometry(1.4, 0.8);

  const wallMat = new THREE.MeshLambertMaterial({ color: PALETTE.wall });
  const eaveMat = new THREE.MeshLambertMaterial({ color: 0x6b4a32 }); // 木檐
  const roofMat = new THREE.MeshLambertMaterial({ color: PALETTE.roofTile });
  const ridgeMat = new THREE.MeshLambertMaterial({ color: PALETTE.roofRidge });
  const wardWallMat = new THREE.MeshLambertMaterial({ color: 0xa89880 });
  const wardWallTopMat = new THREE.MeshLambertMaterial({ color: PALETTE.wallTop });
  const pathMat = new THREE.MeshLambertMaterial({ color: PALETTE.groundPath });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a3220 });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xa8332f, side: THREE.DoubleSide });

  return {
    houseGeo, eaveGeo, pyramidGeo, ridgeGeo, flagPoleGeo, flagFlagGeo,
    wallMat, eaveMat, roofMat, ridgeMat,
    wardWallMat, wardWallTopMat, pathMat,
    poleMat, flagMat,
  };
})();

/**
 * Build a single procedural ward.
 * @param {object} manifest must have build.template + build.density
 * @returns {THREE.Group}
 */
export function buildProceduralWard(manifest) {
  const g = new THREE.Group();
  g.name = manifest.id;

  const size = GRID.wardSize;
  const half = size / 2;
  const template = manifest.build?.template || 'residential';
  const density = manifest.build?.density || 'medium';
  const cfg = TEMPLATE_CONFIG[template] || TEMPLATE_CONFIG.residential;
  const housesPerQuad = cfg.housesPerQuad[density] || 3;

  const wallH = 2.2;
  const wallT = 0.5;
  const sides = [
    [size, wallT, 0, -half + wallT / 2],
    [size, wallT, 0,  half - wallT / 2],
    [wallT, size, -half + wallT / 2, 0],
    [wallT, size,  half - wallT / 2, 0],
  ];
  for (const [w, d, x, z] of sides) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), _shared.wardWallMat);
    wall.position.set(x, wallH / 2, z);
    wall.castShadow = true; wall.receiveShadow = true;
    g.add(wall);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.3, d * 1.04), _shared.wardWallTopMat);
    top.position.set(x, wallH + 0.15, z);
    g.add(top);
  }

  const innerStreetW = 4;
  const ns = new THREE.Mesh(new THREE.BoxGeometry(innerStreetW, 0.04, size - wallT * 2), _shared.pathMat);
  ns.position.set(0, 0.02, 0); ns.receiveShadow = true;
  g.add(ns);
  const ew = new THREE.Mesh(new THREE.BoxGeometry(size - wallT * 2, 0.04, innerStreetW), _shared.pathMat);
  ew.position.set(0, 0.02, 0); ew.receiveShadow = true;
  g.add(ew);

  const quadOffset = (size - wallT * 2 - innerStreetW) / 4;
  const quadCenters = [
    { x: -quadOffset, z: -quadOffset },
    { x:  quadOffset, z: -quadOffset },
    { x: -quadOffset, z:  quadOffset },
    { x:  quadOffset, z:  quadOffset },
  ];

  const totalHouses = housesPerQuad * 4;
  if (totalHouses > 0) {
    const ringR = quadOffset * 0.7;
    /* 4 个 instance mesh: 墙体 + 木檐 + 坡顶 + 正脊 */
    const houseInst = new THREE.InstancedMesh(_shared.houseGeo,   _shared.wallMat,  totalHouses);
    const eaveInst  = new THREE.InstancedMesh(_shared.eaveGeo,    _shared.eaveMat,  totalHouses);
    const roofInst  = new THREE.InstancedMesh(_shared.pyramidGeo, _shared.roofMat,  totalHouses);
    const ridgeInst = new THREE.InstancedMesh(_shared.ridgeGeo,   _shared.ridgeMat, totalHouses);
    houseInst.castShadow = true; houseInst.receiveShadow = true;
    eaveInst.castShadow  = true;
    roofInst.castShadow  = true;
    ridgeInst.castShadow = false;

    const dummy = new THREE.Object3D();
    let i = 0;
    for (const q of quadCenters) {
      for (let h = 0; h < housesPerQuad; h++) {
        const angle = (h / housesPerQuad) * Math.PI * 2 + (manifest.grid?.col || 0);
        const x = q.x + Math.cos(angle) * ringR * (0.4 + Math.random() * 0.4);
        const z = q.z + Math.sin(angle) * ringR * (0.4 + Math.random() * 0.4);
        const rotY = Math.round(Math.random() * 4) * (Math.PI / 2);
        const sw = 0.85 + Math.random() * 0.4;
        const sh = 0.85 + Math.random() * 0.4;
        const sd = 0.85 + Math.random() * 0.4;

        /* 墙体 (中心 y=2, box h=4 → 底 y=0, 顶 y=4*sh) */
        dummy.position.set(x, 2 * sh, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(sw, sh, sd);
        dummy.updateMatrix();
        houseInst.setMatrixAt(i, dummy.matrix);

        const wallTop = 4 * sh;

        /* 木檐 (在墙顶上方, 厚 0.4) */
        dummy.position.set(x, wallTop + 0.2, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(sw, 1, sd);
        dummy.updateMatrix();
        eaveInst.setMatrixAt(i, dummy.matrix);

        /* 金字塔坡顶 (在木檐上方) — cone 中心 y 是 h/2, 所以 y = eaveTop + slopeH/2 */
        dummy.position.set(x, wallTop + 0.4 + 0.8, z);
        dummy.rotation.set(0, rotY + Math.PI / 4, 0); // 旋转 45° 让 4 面对齐墙体
        dummy.scale.set(sw, 1, sd);
        dummy.updateMatrix();
        roofInst.setMatrixAt(i, dummy.matrix);

        /* 正脊 (横在屋顶最高点) */
        dummy.position.set(x, wallTop + 0.4 + 1.6, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(sw, 1, sd);
        dummy.updateMatrix();
        ridgeInst.setMatrixAt(i, dummy.matrix);

        i++;
      }
    }
    houseInst.instanceMatrix.needsUpdate = true;
    eaveInst.instanceMatrix.needsUpdate  = true;
    roofInst.instanceMatrix.needsUpdate  = true;
    ridgeInst.instanceMatrix.needsUpdate = true;
    // 默认 bounding sphere 取自源几何 (≈5m)，远小于实际 instance 散落范围；
    // 相机斜视时整个 InstancedMesh 会被错误剔除 → 屋顶大片消失。
    // 用 InstancedMesh.computeBoundingSphere 让 frustum culling 拿到正确包围球。
    for (const inst of [houseInst, eaveInst, roofInst, ridgeInst]) {
      if (typeof inst.computeBoundingSphere === 'function') inst.computeBoundingSphere();
      if (typeof inst.computeBoundingBox === 'function')   inst.computeBoundingBox();
    }
    g.add(houseInst);
    g.add(eaveInst);
    g.add(roofInst);
    g.add(ridgeInst);
  }

  /* 旗杆 — 每个坊在东南角立一根, 增加垂直 silhouette */
  const flagAnchor = new THREE.Group();
  const pole = new THREE.Mesh(_shared.flagPoleGeo, _shared.poleMat);
  pole.position.set(0, 3, 0);
  flagAnchor.add(pole);
  const flag = new THREE.Mesh(_shared.flagFlagGeo, _shared.flagMat);
  flag.position.set(0.7, 5.3, 0);
  flagAnchor.add(flag);
  // 放到东南角 (距离边墙 4 米)
  flagAnchor.position.set(half - 4, 0, half - 4);
  // 让 flag 随机偏角
  flagAnchor.rotation.y = ((manifest.grid?.row || 0) * 13 + (manifest.grid?.col || 0) * 7) % (Math.PI * 2);
  g.add(flagAnchor);

  if (cfg.landmark) {
    const lm = buildLandmark(cfg.landmark);
    if (lm) {
      lm.position.set(0, 0, 0);
      g.add(lm);
    }
  }

  return g;
}

function buildLandmark(type) {
  switch (type) {
    case 'well': {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.4, 1, 16),
        new THREE.MeshLambertMaterial({ color: 0x6b5a48 }),
      );
      ring.position.y = 0.5;
      g.add(ring);
      return g;
    }
    case 'shrine': {
      const g = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1, 4),
        new THREE.MeshLambertMaterial({ color: 0x9a8770 }),
      );
      base.position.y = 0.5;
      g.add(base);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshLambertMaterial({ color: 0xa8332f }),
      );
      body.position.y = 2.5;
      g.add(body);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 1.5, 4),
        new THREE.MeshLambertMaterial({ color: 0xc99a3a }),
      );
      roof.position.y = 4.8; roof.rotation.y = Math.PI / 4;
      g.add(roof);
      return g;
    }
    case 'tower': {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const tier = new THREE.Mesh(
          new THREE.BoxGeometry(4 - i * 0.6, 1.2, 4 - i * 0.6),
          new THREE.MeshLambertMaterial({ color: 0x9a8770 }),
        );
        tier.position.y = 0.6 + i * 1.4;
        g.add(tier);
      }
      return g;
    }
    case 'pavilion': {
      const g = new THREE.Group();
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 1.6, 6),
        new THREE.MeshLambertMaterial({ color: 0x3a4250 }),
      );
      roof.position.y = 3.5; roof.rotation.y = Math.PI / 6;
      g.add(roof);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 3, 6),
          new THREE.MeshLambertMaterial({ color: 0xa8332f }),
        );
        col.position.set(Math.cos(a) * 1.8, 1.5, Math.sin(a) * 1.8);
        g.add(col);
      }
      return g;
    }
    case 'banner': {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 5, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b5a48 }),
      );
      pole.position.y = 2.5;
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 3),
        new THREE.MeshBasicMaterial({ color: 0xa8332f, side: THREE.DoubleSide }),
      );
      flag.position.set(0.85, 3.3, 0);
      const g = new THREE.Group();
      g.add(pole); g.add(flag);
      return g;
    }
    default: return null;
  }
}
