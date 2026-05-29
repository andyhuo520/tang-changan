/**
 * Generates the street network (Suzaku ave + side streets) and outer walls.
 *
 * This is purely data-driven: it just consumes `GRID` from grid.js and emits
 * meshes. Replaces hard-coded street strips in legacy scene.js.
 */

import * as THREE from 'three';
import { GRID, wardToWorld, worldBounds } from './grid.js';

const DEFAULT_PALETTE = {
  zhuqueStone: 0xb8a98a,
  sideStreet: 0xa89878,
  wallStone: 0x9a8770,
  wallBrick: 0x86735c,
  wallTop: 0x5b4a38,
};

/**
 * Build the city's street + wall geometry.
 * @param {object} [opts]
 * @returns {THREE.Group}
 */
export function buildStreetsAndWalls(opts = {}) {
  const palette = { ...DEFAULT_PALETTE, ...(opts.palette || {}) };
  const g = new THREE.Group();
  g.name = 'CityStreetsAndWalls';

  const b = worldBounds();
  const innerW = b.maxX - b.minX;
  const innerD = b.maxZ - b.minZ;

  const groundMat = new THREE.MeshLambertMaterial({ color: palette.zhuqueStone });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerD), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  g.add(ground);

  const zhuqueLen = innerD;
  const zhuqueMat = new THREE.MeshLambertMaterial({ color: palette.zhuqueStone });
  const zhuque = new THREE.Mesh(
    new THREE.BoxGeometry(GRID.zhuqueW, 0.08, zhuqueLen),
    zhuqueMat,
  );
  zhuque.position.set(0, 0.04, (b.minZ + b.maxZ) / 2);
  zhuque.receiveShadow = true;
  g.add(zhuque);

  const sideMat = new THREE.MeshLambertMaterial({ color: palette.sideStreet });
  for (let r = 1; r < GRID.rows; r++) {
    const { z } = wardToWorld(r, 0);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(innerW, 0.06, GRID.streetW),
      sideMat,
    );
    strip.position.set(0, 0.03, z - GRID.wardSize / 2 - GRID.streetW / 2);
    strip.receiveShadow = true;
    g.add(strip);
  }
  for (let c = 1; c < GRID.cols; c++) {
    if (c === GRID.centerCol) continue;
    const { x } = wardToWorld(0, c);
    const w = GRID.streetW;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.06, innerD),
      sideMat,
    );
    strip.position.set(x - GRID.wardSize / 2 - w / 2, 0.03, (b.minZ + b.maxZ) / 2);
    strip.receiveShadow = true;
    g.add(strip);
  }

  const wallMat = new THREE.MeshLambertMaterial({ color: palette.wallStone });
  const topMat = new THREE.MeshLambertMaterial({ color: palette.wallTop });
  const wallH = 6;
  const wallT = 2;

  const makeWall = (w, d, x, z) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wall.position.set(x, wallH / 2, z);
    wall.castShadow = true; wall.receiveShadow = true;
    g.add(wall);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.4, d * 1.02), topMat);
    top.position.set(x, wallH + 0.2, z);
    g.add(top);
  };

  makeWall(innerW + wallT * 2, wallT, 0, b.minZ - wallT / 2);
  makeWall(innerW + wallT * 2, wallT, 0, b.maxZ + wallT / 2);
  makeWall(wallT, innerD + wallT * 2, b.minX - wallT / 2, 0);
  makeWall(wallT, innerD + wallT * 2, b.maxX + wallT / 2, 0);

  const gateMat = new THREE.MeshLambertMaterial({ color: 0xa8332f });
  const makeGate = (x, z, rotY = 0, name = 'gate') => {
    const gate = new THREE.Group();
    gate.name = name;
    const base = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 4), gateMat);
    base.position.y = 4;
    gate.add(base);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 4.2),
      new THREE.MeshBasicMaterial({ color: 0x000000 }));
    arch.position.y = 2.5;
    gate.add(arch);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 6),
      new THREE.MeshLambertMaterial({ color: 0xc99a3a }));
    roof.position.y = 8.5;
    gate.add(roof);
    gate.position.set(x, 0, z);
    gate.rotation.y = rotY;
    g.add(gate);
  };

  makeGate(0, b.maxZ + wallT, 0, 'mingde-men');
  makeGate(0, b.minZ - wallT, Math.PI, 'zhuque-men');
  makeGate(b.minX - wallT, 0, -Math.PI / 2, 'jinguang-men');
  makeGate(b.maxX + wallT, 0, Math.PI / 2, 'chunming-men');

  return g;
}
