/**
 * Three-tier LOD Manager
 *
 * L0 (Hero):       Full detail + NPC + audio       — within 0-80u of camera
 * L1 (Generative): Simplified mesh + no NPC        — within 80-200u
 * L2 (Skybox):     Silhouette + low-poly           — 200u+
 *
 * Each region (ward/palace/market/gate) registers a buildLOD function
 * that takes a target level and returns the appropriate THREE.Group.
 *
 * The manager polls camera distance every 0.5s (configurable) and
 * swaps groups in/out of the scene.
 */

import * as THREE from 'three';

export const LOD = Object.freeze({
  L0: 'L0',
  L1: 'L1',
  L2: 'L2',
  HIDDEN: 'HIDDEN',
});

export const LOD_THRESHOLDS = {
  l0Max: 80,
  l1Max: 200,
  l2Max: 500,
};

export class LODManager {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {object} opts
   * @param {number} [opts.refreshMs=500]
   */
  constructor(scene, camera, opts = {}) {
    this.scene = scene;
    this.camera = camera;
    this.refreshMs = opts.refreshMs ?? 500;

    /** @type {Map<string, RegionState>} id → state */
    this.regions = new Map();

    this._lastTick = 0;
    this._tmpVec = new THREE.Vector3();
    this._forcedLOD = null; // for ?lod=L0 debug
  }

  /**
   * Register a region's LOD builders.
   * @param {object} region
   *   { id, center: THREE.Vector3, build: { L0?, L1?, L2? } }
   *   build functions return a THREE.Group or null (skip this LOD)
   */
  register(region) {
    if (this.regions.has(region.id)) {
      console.warn(`[LOD] region ${region.id} already registered, skipping`);
      return;
    }
    this.regions.set(region.id, {
      id: region.id,
      center: region.center,
      build: region.build,
      current: LOD.HIDDEN,
      activeGroup: null,
    });
  }

  unregister(id) {
    const st = this.regions.get(id);
    if (!st) return;
    if (st.activeGroup) {
      this.scene.remove(st.activeGroup);
      this._dispose(st.activeGroup);
    }
    this.regions.delete(id);
  }

  /** Force all regions to a specific LOD (or null to resume distance-based). */
  forceLOD(level) {
    this._forcedLOD = level;
    this._lastTick = 0; // immediate re-evaluate
  }

  /** Pick desired LOD by camera distance to region center. */
  pickLOD(distance) {
    if (this._forcedLOD) return this._forcedLOD;
    if (distance <= LOD_THRESHOLDS.l0Max) return LOD.L0;
    if (distance <= LOD_THRESHOLDS.l1Max) return LOD.L1;
    if (distance <= LOD_THRESHOLDS.l2Max) return LOD.L2;
    return LOD.HIDDEN;
  }

  /** Call every frame; internally throttled. */
  update(now = performance.now()) {
    if (now - this._lastTick < this.refreshMs) return;
    this._lastTick = now;

    this.camera.getWorldPosition(this._tmpVec);

    for (const st of this.regions.values()) {
      const d = st.center.distanceTo(this._tmpVec);
      const next = this.pickLOD(d);
      if (next !== st.current) {
        this._switch(st, next);
      }
    }
  }

  _switch(st, next) {
    if (st.activeGroup) {
      this.scene.remove(st.activeGroup);
      this._dispose(st.activeGroup);
      st.activeGroup = null;
    }
    if (next !== LOD.HIDDEN) {
      const builder = st.build[next];
      if (builder) {
        const g = builder();
        if (g) {
          this.scene.add(g);
          st.activeGroup = g;
        }
      } else if (next === LOD.L0 && st.build.L1) {
        const g = st.build.L1();
        if (g) {
          this.scene.add(g);
          st.activeGroup = g;
        }
      }
    }
    st.current = next;
  }

  _dispose(group) {
    group.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry?.dispose) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m?.dispose?.());
        } else {
          obj.material?.dispose?.();
        }
      }
    });
  }

  /** Diagnostic info. */
  stats() {
    const byLOD = { L0: 0, L1: 0, L2: 0, HIDDEN: 0 };
    for (const st of this.regions.values()) byLOD[st.current]++;
    return { total: this.regions.size, byLOD };
  }
}
