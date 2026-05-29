/**
 * modelLoader.js — GLB / USDZ 模型加载 + 动画绑定 + 状态机
 *
 * 用法（在 scene.js 里）：
 *
 *   import { loadCharacter, updateAnimMixers, MODEL_REGISTRY } from './modelLoader.js';
 *
 *   // 用 GLB 替换某个 NPC 的程序化模型：
 *   MODEL_REGISTRY['libai'] = { url: 'models/characters/libai.glb', targetHeight: 1.75 };
 *
 *   // 在 animate() 循环里：
 *   updateAnimMixers(dt);
 *
 *   // 直接加载：
 *   const char = await loadCharacter('libai');
 *   scene.add(char.group);
 *   char.play('idle');            // 'idle' / 'walk' / 'talk' / 任意 clip 名
 *
 * 设计原则：
 *  - 异步, 加载失败不抛出, 调用方可优雅 fallback 到程序化模型
 *  - 自动缓存: 同一个 url 只下载一次, 复用 GLTF resource (clone scene for instances)
 *  - 高度归一化: targetHeight 默认 1.7m, 不同来源的模型也能合在一起
 *  - 动画状态机: idle/walk/talk 自动 crossfade, 不存在的 clip 自动 fallback 到 idle
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { USDZLoader } from 'three/addons/loaders/USDZLoader.js';

// ============================================================
// 模型注册表 —— 一处统一管理"哪个 personaId / NPC id 用哪个 GLB"
// 在 scene.js 里改这个对象即可让某 NPC 自动用 GLB 而非程序化模型
// ============================================================
export const MODEL_REGISTRY = {
  /* 示例:
   *
   * libai: {
   *   url: 'models/characters/libai.glb',
   *   targetHeight: 1.75,        // 模型最终在场景里的高度 (米)
   *   yOffset: 0,                // 加载后整体 y 偏移 (有些 GLB 的轴心在脚 / 在中心)
   *   animationMap: {            // 把 GLB 自带的 clip 名映射到我们的状态名
   *     idle: 'idle_breath',     // GLB 里的 clip 叫 "idle_breath", 我们当 idle 用
   *     walk: 'walking',
   *     talk: 'talking_gesture',
   *   },
   * },
   */
};

// ============================================================
// 内部状态
// ============================================================
const _loader = new GLTFLoader();
const _draco = new DRACOLoader();
_draco.setDecoderPath('https://www.gstatic.com/draco/v1/5.7.1/');
_loader.setDRACOLoader(_draco);

const _usdz = new USDZLoader();

const _cache = new Map();      // url -> Promise<GLTF | { scene, animations }>
const _mixers = [];            // 所有活跃的 AnimationMixer

/**
 * 加载 GLB / GLTF 文件 (带缓存)
 * @param {string} url
 * @returns {Promise<{scene: THREE.Object3D, animations: THREE.AnimationClip[]}>}
 */
function _loadGLB(url) {
  if (_cache.has(url)) return _cache.get(url);
  const p = new Promise((resolve, reject) => {
    _loader.load(
      url,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations || [] }),
      undefined,
      (err) => reject(err),
    );
  });
  _cache.set(url, p);
  return p;
}

/**
 * 加载 USDZ 文件 (带缓存)
 * 注意: Three.js 的 USDZLoader 是实验性的, 仅支持有限的 USDZ 子集
 * (主要是静态几何 + 简单贴图, 动画支持不完整)。**强烈建议优先用 GLB**。
 * @param {string} url
 * @returns {Promise<{scene: THREE.Object3D, animations: []}>}
 */
function _loadUSDZ(url) {
  if (_cache.has(url)) return _cache.get(url);
  const p = new Promise((resolve, reject) => {
    _usdz.load(
      url,
      (obj) => resolve({ scene: obj, animations: [] }),
      undefined,
      (err) => reject(err),
    );
  });
  _cache.set(url, p);
  return p;
}

/**
 * 根据 url 后缀自动选择加载器
 */
async function _load(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.usdz') || lower.endsWith('.usd')) {
    console.warn('[modelLoader] USDZ 是实验性支持, 动画/材质可能丢失。优先用 GLB:', url);
    return _loadUSDZ(url);
  }
  return _loadGLB(url);
}

/**
 * 把一个模型缩放到目标高度
 * @param {THREE.Object3D} obj
 * @param {number} targetHeight 米
 */
function _normalizeHeight(obj, targetHeight) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0) {
    const scale = targetHeight / size.y;
    obj.scale.multiplyScalar(scale);
  }
}

/**
 * 让模型的脚底贴在 y=0
 * @param {THREE.Object3D} obj
 */
function _groundOnFeet(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box.min.y;
}

/**
 * 加载一个角色 (基于 MODEL_REGISTRY 配置, 或直接传入 spec)
 *
 * @param {string|object} idOrSpec — 注册表里的 key 或一个 spec 对象 ({url, targetHeight, ...})
 * @returns {Promise<{
 *   group: THREE.Group,                  // 加进场景的根节点
 *   mixer: THREE.AnimationMixer | null,  // 动画混合器 (无动画时为 null)
 *   actions: Record<string, THREE.AnimationAction>,  // 按 clip 名索引
 *   play: (stateName: string, fade?: number) => boolean,  // 切动画状态 (idle/walk/talk)
 *   dispose: () => void,                 // 卸载, 移除 mixer
 * } | null>}
 */
export async function loadCharacter(idOrSpec) {
  const spec = typeof idOrSpec === 'string' ? MODEL_REGISTRY[idOrSpec] : idOrSpec;
  if (!spec || !spec.url) return null;

  let data;
  try {
    data = await _load(spec.url);
  } catch (err) {
    console.warn(`[modelLoader] 加载失败, 将回退到程序化模型: ${spec.url}`, err);
    return null;
  }

  // Clone 场景, 让多个实例可以共用同一份 GLTF resource
  const root = data.scene.clone(true);

  // 投射阴影
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      // sRGB color space (现代 GLB 标配)
      if (o.material && o.material.map) {
        o.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });

  // 归一化身高
  const targetH = spec.targetHeight || 1.7;
  _normalizeHeight(root, targetH);
  _groundOnFeet(root);
  if (spec.yOffset) root.position.y += spec.yOffset;

  // 把根节点 wrap 在一个 Group 里, 这样 scene.add(group) 而调用方可以
  // 设置 group.position / group.rotation 而不会被 normalize 改写
  const group = new THREE.Group();
  group.add(root);

  // 动画混合器
  let mixer = null;
  const actions = {};
  const animMap = spec.animationMap || {};
  const animations = data.animations || [];

  if (animations.length > 0) {
    mixer = new THREE.AnimationMixer(root);
    for (const clip of animations) {
      const act = mixer.clipAction(clip);
      actions[clip.name] = act;
      // 让 stop() 时不要保持最后一帧
      act.clampWhenFinished = false;
    }
    _mixers.push(mixer);
  }

  // 找一个最像"idle"的 clip 当默认
  let currentAction = null;
  const _resolveClipName = (stateName) => {
    // 优先用 animationMap 指定的名字
    const mapped = animMap[stateName];
    if (mapped && actions[mapped]) return mapped;
    // 否则模糊匹配 (idle / idle_01 / Idle 都算)
    const lower = stateName.toLowerCase();
    for (const name of Object.keys(actions)) {
      if (name.toLowerCase().includes(lower)) return name;
    }
    // 还没找到 — 返回 idle 的 fallback (第一个 clip)
    if (stateName !== 'idle' && Object.keys(actions).length > 0) {
      return Object.keys(actions)[0];
    }
    return null;
  };

  const play = (stateName, fade = 0.3) => {
    const name = _resolveClipName(stateName);
    if (!name) return false;
    const next = actions[name];
    if (currentAction === next) return true;
    if (currentAction) {
      next.reset().play();
      currentAction.crossFadeTo(next, fade, false);
    } else {
      next.reset().play();
    }
    currentAction = next;
    return true;
  };

  // 默认进入 idle (如果有的话)
  play('idle', 0);

  const dispose = () => {
    if (mixer) {
      const i = _mixers.indexOf(mixer);
      if (i >= 0) _mixers.splice(i, 1);
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    }
    // 释放几何 / 材质
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
            m.map?.dispose?.();
            m.dispose?.();
          });
        }
      }
    });
  };

  return { group, mixer, actions, play, dispose };
}

/**
 * 在 animate() 循环里调用, 推进所有活跃的 AnimationMixer
 * @param {number} dt 秒
 */
export function updateAnimMixers(dt) {
  for (let i = 0; i < _mixers.length; i++) {
    _mixers[i].update(dt);
  }
}

/**
 * 简易状态机: 根据 NPC 的运动状态 / 对话状态自动切动画
 *
 * 用法 (在 NPC 的每帧更新里):
 *   autoAnimateState(char, {
 *     speed: walker.speed * isMoving,
 *     talking: dialogActive && nearestNpc === this,
 *   });
 *
 * @param {{play: Function}} char  — loadCharacter 返回的对象
 * @param {{speed?: number, talking?: boolean}} state
 */
export function autoAnimateState(char, state = {}) {
  if (!char || typeof char.play !== 'function') return;
  if (state.talking) {
    char.play('talk', 0.25);
  } else if ((state.speed || 0) > 0.05) {
    char.play('walk', 0.2);
  } else {
    char.play('idle', 0.3);
  }
}

/**
 * 给场景里所有活跃 NPC 打 debug 标
 */
export function debugMixerCount() {
  return _mixers.length;
}
