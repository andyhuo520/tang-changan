/**
 * Ward Registry — data-driven catalog of all regions (wards / palaces / markets / gates).
 *
 * Workflow:
 *   1. load _index.json to get the manifest list
 *   2. load each manifest JSON
 *   3. dynamic-import the build module specified in manifest.build.impl
 *   4. expose query / build / dispose API for the rest of the engine
 */

import * as THREE from 'three';
import { wardToWorld, GRID } from './grid.js';

export class WardRegistry {
  constructor() {
    /** @type {Map<string, object>} id → manifest */
    this.manifests = new Map();
    /** @type {Map<string, object>} id → loaded build module */
    this.modules = new Map();
    /** @type {Map<string, THREE.Group>} id → currently-built group */
    this.activeGroups = new Map();
  }

  /**
   * Bulk-load from data/wards/_index.json + individual manifests.
   * @param {string} basePath e.g. 'data/wards'
   */
  async loadFromManifestDir(basePath) {
    const index = await fetch(`${basePath}/_index.json`).then((r) => r.json());
    const tasks = index.regions.map(async (entry) => {
      try {
        const m = await fetch(`${basePath}/${entry.file}`).then((r) => r.json());
        this.manifests.set(m.id, m);
      } catch (e) {
        console.warn(`[WardRegistry] failed to load ${entry.file}`, e);
      }
    });
    await Promise.all(tasks);
    console.info(`[WardRegistry] loaded ${this.manifests.size} manifests`);
    return this.manifests.size;
  }

  /** Add or override a single manifest in memory. */
  register(manifest) {
    if (!manifest.id) throw new Error('manifest must have id');
    this.manifests.set(manifest.id, manifest);
  }

  get(id) { return this.manifests.get(id); }

  /** Query by filter. */
  query({ type, district, status } = {}) {
    const out = [];
    for (const m of this.manifests.values()) {
      if (type && m.type !== type) continue;
      if (district && m.district !== district) continue;
      if (status && m.status !== status) continue;
      out.push(m);
    }
    return out;
  }

  /** Compute world-space center of a region from its grid position. */
  centerOf(id) {
    const m = this.manifests.get(id);
    if (!m) return null;
    if (!m.grid) return new THREE.Vector3(0, 0, 0);
    const { x, z } = wardToWorld(m.grid.row, m.grid.col);
    return new THREE.Vector3(x, m.elevation || 0, z);
  }

  /**
   * Build a region's L0 group by dynamic-importing its build module.
   * Module contract: `export function build(opts, helpers) → THREE.Group`
   * @param {string} id
   * @param {object} [extraOpts]
   * @returns {Promise<THREE.Group | null>}
   */
  async buildL0(id, extraOpts = {}) {
    const m = this.manifests.get(id);
    if (!m) {
      console.warn(`[WardRegistry] no manifest ${id}`);
      return null;
    }
    if (!m.build?.impl) {
      console.warn(`[WardRegistry] manifest ${id} has no build.impl`);
      return null;
    }
    let mod = this.modules.get(id);
    if (!mod) {
      try {
        mod = await import(/* @vite-ignore */ '../../' + m.build.impl);
        this.modules.set(id, mod);
      } catch (e) {
        console.warn(`[WardRegistry] failed to import ${m.build.impl} for ${id}`, e);
        return null;
      }
    }
    if (typeof mod.build !== 'function') {
      console.warn(`[WardRegistry] ${m.build.impl} does not export build()`);
      return null;
    }
    const center = this.centerOf(id);
    const g = mod.build({ ...m.build.options, ...extraOpts, manifest: m, center });
    if (g) {
      g.name = id;
      g.position.set(center.x, m.elevation || 0, center.z);
      this.activeGroups.set(id, g);
    }
    return g;
  }

  dispose(id) {
    const g = this.activeGroups.get(id);
    if (!g) return;
    g.parent?.remove(g);
    g.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat?.dispose?.());
        else obj.material?.dispose?.();
      }
    });
    this.activeGroups.delete(id);
  }
}

/** Singleton instance for global use. */
export const wardRegistry = new WardRegistry();
