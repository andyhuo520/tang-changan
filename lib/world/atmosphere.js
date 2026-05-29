/**
 * Atmosphere — 盛唐黄昏氛围
 *
 *   - 金色时辰太阳光 (warm directional)
 *   - 微粒尘埃 (粒子在城内浮游, light = god rays)
 *   - 远景城墙剪影 (一圈低饱和的薄墙 + 远山)
 *
 * 用法:
 *   import { installAtmosphere } from './world/atmosphere.js';
 *   installAtmosphere({ scene, world });
 */

import * as THREE from 'three';
import { worldBounds } from './grid.js';

const DEFAULTS = {
  sunIntensity: 1.05,
  hemiIntensity: 0.55,
  ambientIntensity: 0.30,
  dustCount: 1600,
  dustArea: 1800,  // half-extent
  dustHeight: 90,  // 浮游高度
  fogNear: 600,
  fogFar:  3500,
  fogColor: 0x2a1f15,
  bgColor:  0x2a1f15,
};

export function installAtmosphere({ scene, world } = {}) {
  scene = scene || window.scene;
  if (!scene) return null;

  /* 1) 太阳光 — 暮金色斜射 */
  const sun = new THREE.DirectionalLight(0xffd49a, DEFAULTS.sunIntensity);
  sun.position.set(-1200, 1600, 800); // 西落日
  sun.target = new THREE.Object3D();
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);
  sun.castShadow = false; // 大场景关阴影性能
  scene.add(sun);

  /* 2) 半天光 — 暖天 + 冷地 */
  const hemi = new THREE.HemisphereLight(0xd6b58a, 0x2a1e12, DEFAULTS.hemiIntensity);
  scene.add(hemi);

  /* 3) 环境光底色 */
  const amb = new THREE.AmbientLight(0x4a3a26, DEFAULTS.ambientIntensity);
  scene.add(amb);

  /* 4) 雾 + 背景 — 让远处坊柔和淡出 */
  scene.fog = new THREE.Fog(DEFAULTS.fogColor, DEFAULTS.fogNear, DEFAULTS.fogFar);
  scene.background = new THREE.Color(DEFAULTS.bgColor);

  /* 5) 远景城墙剪影 — 一圈低柱阵, 暗色, 半透明 */
  const silhouettes = buildHorizonSilhouettes();
  scene.add(silhouettes);

  /* 6) 微粒尘埃 — Points 粒子 */
  const dust = buildDustParticles();
  scene.add(dust);

  /* 7) 每帧让粒子缓慢浮动 + 让太阳呼吸性微动 */
  let t0 = performance.now();
  function tick() {
    const t = (performance.now() - t0) / 1000;
    // 粒子缓慢上下 (整体上下浮)
    if (dust) {
      const off = Math.sin(t * 0.15) * 4;
      dust.position.y = 30 + off;
    }
    // 太阳光强度微呼吸 (1.0 - 1.1)
    sun.intensity = DEFAULTS.sunIntensity + Math.sin(t * 0.25) * 0.04;
    requestAnimationFrame(tick);
  }
  tick();

  console.info('[Atmosphere] installed (盛唐黄昏: 金色斜光 + 尘埃 + 远城剪影)');

  return {
    sun, hemi, amb, dust, silhouettes,
    setTimeOfDay(hour) {
      // hour 0-24 — 16~18 为黄昏盛唐
      const norm = ((hour - 6) / 12) % 1; // 0 ~ 1 (dawn → dusk)
      const angle = norm * Math.PI;
      sun.position.set(Math.cos(angle) * 1600, Math.sin(angle) * 1600 + 200, 600);
      // 黄昏时颜色偏红
      const warm = Math.min(1, (hour - 14) / 6);
      sun.color.setHSL(0.06 + warm * 0.02, 0.6, 0.6 - warm * 0.05);
    },
    dispose() {
      [sun, hemi, amb, dust, silhouettes].forEach(o => o && scene.remove(o));
    },
  };
}

/* ------ helpers ------ */

function buildDustParticles() {
  const N = DEFAULTS.dustCount;
  const area = DEFAULTS.dustArea;
  const yMax = DEFAULTS.dustHeight;
  const positions = new Float32Array(N * 3);
  const sizes = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    positions[3 * i + 0] = (Math.random() - 0.5) * area * 2;
    positions[3 * i + 1] = Math.random() * yMax;
    positions[3 * i + 2] = (Math.random() - 0.5) * area * 2;
    sizes[i] = Math.random() * 0.6 + 0.4;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // 用 PointsMaterial 即可, 加 transparency + 暖色
  const mat = new THREE.PointsMaterial({
    color: 0xf2d68b,
    size: 1.4,
    transparent: true,
    opacity: 0.38,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geom, mat);
  points.name = 'AtmosphericDust';
  return points;
}

function buildHorizonSilhouettes() {
  // 在 worldBounds 外圈放一圈短柱, 当远景城墙/山影 fade-in fog
  const b = worldBounds();
  const grp = new THREE.Group();
  grp.name = 'HorizonSilhouette';

  const ring = 2500;
  const N = 64;
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3a2a1c,
    transparent: true,
    opacity: 0.85,
    fog: true,
  });

  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = ring + (Math.sin(i * 7.13) * 200);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 40 + Math.abs(Math.sin(i * 1.7)) * 80;
    const w = 40 + (i % 5) * 18;
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w * 0.8),
      mat,
    );
    tower.position.set(x, h / 2, z);
    grp.add(tower);
  }

  return grp;
}
