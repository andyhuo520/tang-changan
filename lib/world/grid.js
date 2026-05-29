/**
 * Chang'an City Grid System
 *
 * 1 world unit = 10 meters
 * Tang Chang'an outer wall ≈ 9.7km × 8.65km → ~1000 × 870 units
 *
 * Grid layout (looking from above, North up):
 *
 *   col → W (0) ... 4 | 5 (Suzaku Ave) | 6 ... 10 (E)
 *   row ↓
 *   N (0) — Palace/Imperial City row (太极宫 / 大明宫)
 *   ...
 *   S (12) — outer south wards & 曲江 garden
 *
 * Ward dims default 60×60 u (real ~500-590m → ÷10).
 * Suzaku ave (朱雀大街) sits between col 4 and col 6, in column-5 strip width 16 u.
 * Side streets 8 u wide.
 */

import * as THREE from 'three';

export const GRID = Object.freeze({
  rows: 13,
  cols: 11,
  wardSize: 60,
  streetW: 8,
  zhuqueW: 16,
  centerCol: 5,
  worldOrigin: Object.freeze({ x: -485, z: -432 }),
});

const halfWorldW =
  (GRID.cols - 1) * GRID.wardSize / 2 +
  (GRID.cols - 2) * GRID.streetW / 2 +
  (GRID.zhuqueW - GRID.streetW) / 2;
const halfWorldD =
  (GRID.rows - 1) * GRID.wardSize / 2 +
  (GRID.rows - 1) * GRID.streetW / 2;

/**
 * Convert ward (row, col) to world-space center {x, z}.
 * Row 0 is northern-most, col 0 is western-most.
 */
export function wardToWorld(row, col) {
  let x = 0;
  for (let c = 0; c < col; c++) {
    x += GRID.wardSize;
    x += (c === GRID.centerCol - 1) ? GRID.zhuqueW : GRID.streetW;
  }
  x += GRID.wardSize / 2;
  x -= halfWorldW + GRID.wardSize / 2;

  let z = 0;
  for (let r = 0; r < row; r++) {
    z += GRID.wardSize + GRID.streetW;
  }
  z += GRID.wardSize / 2;
  z -= halfWorldD + GRID.wardSize / 2;

  return { x, z };
}

/**
 * Reverse lookup: world (x, z) → {row, col} or null (if on a street).
 */
export function worldToWard(x, z) {
  const xOffset = x + halfWorldW + GRID.wardSize / 2;
  const zOffset = z + halfWorldD + GRID.wardSize / 2;

  let acc = 0;
  let col = -1;
  for (let c = 0; c < GRID.cols; c++) {
    const start = acc;
    acc += GRID.wardSize;
    if (xOffset >= start && xOffset < acc) {
      col = c;
      break;
    }
    acc += (c === GRID.centerCol - 1) ? GRID.zhuqueW : GRID.streetW;
  }
  if (col < 0) return null;

  let zAcc = 0;
  let row = -1;
  for (let r = 0; r < GRID.rows; r++) {
    const start = zAcc;
    zAcc += GRID.wardSize;
    if (zOffset >= start && zOffset < zAcc) {
      row = r;
      break;
    }
    zAcc += GRID.streetW;
  }
  if (row < 0) return null;

  return { row, col };
}

/** Is this point on a street (between wards or Suzaku Ave)? */
export function isStreet(x, z) {
  return worldToWard(x, z) === null;
}

/** Is this point on Suzaku Ave specifically? */
export function isOnZhuque(x, z) {
  return Math.abs(x) <= GRID.zhuqueW / 2;
}

/** Get the 4 neighboring wards. dir: 'N'|'S'|'E'|'W' */
export function neighborOf(row, col, dir) {
  const map = { N: [row - 1, col], S: [row + 1, col], E: [row, col + 1], W: [row, col - 1] };
  const [r, c] = map[dir] || [row, col];
  if (r < 0 || r >= GRID.rows || c < 0 || c >= GRID.cols) return null;
  return { row: r, col: c };
}

/** Total world bounds (rectangle). */
export function worldBounds() {
  return {
    minX: -halfWorldW - GRID.wardSize / 2,
    maxX: halfWorldW + GRID.wardSize / 2,
    minZ: -halfWorldD - GRID.wardSize / 2,
    maxZ: halfWorldD + GRID.wardSize / 2,
  };
}

/** Debug: render grid lines + ward id labels. Returns Three.js group. */
export function buildDebugGrid({ color = 0x4a5670, labels = true } = {}) {
  const g = new THREE.Group();
  g.name = 'DebugGrid';

  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
  const b = worldBounds();

  for (let r = 0; r <= GRID.rows; r++) {
    const { z } = wardToWorld(r === GRID.rows ? r - 1 : r, 0);
    const zLine = z + (r === GRID.rows ? GRID.wardSize / 2 : -GRID.wardSize / 2);
    const pts = [new THREE.Vector3(b.minX, 0.05, zLine), new THREE.Vector3(b.maxX, 0.05, zLine)];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  for (let c = 0; c <= GRID.cols; c++) {
    const { x } = wardToWorld(0, c === GRID.cols ? c - 1 : c);
    const xLine = x + (c === GRID.cols ? GRID.wardSize / 2 : -GRID.wardSize / 2);
    const pts = [new THREE.Vector3(xLine, 0.05, b.minZ), new THREE.Vector3(xLine, 0.05, b.maxZ)];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }

  if (labels) {
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const { x, z } = wardToWorld(r, c);
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(20,15,8,0.7)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = '#c8a45e';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`r${r}c${c}`, 128, 32);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sprite.position.set(x, 4, z);
        sprite.scale.set(8, 2, 1);
        g.add(sprite);
      }
    }
  }
  return g;
}
