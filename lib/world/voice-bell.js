/**
 * Voice Bell — 第 5 个 diegetic prop. 让用户在鸟瞰模式中直接召唤语音 AI.
 *
 * 视觉: 一座青铜大钟 (悬于木架), 朱漆撑柱, 钟身刻金纹 "聞"
 *       钟身呼吸金光; AI 说话时震动 + 加强金光.
 *
 * 交互:
 *   - hover → tooltip "敲钟召唤 · 长安诸贤"
 *   - click → 弹出 persona 快选环 (6 个角色: 周引之/李白/杜甫/王维/苏阮卿/陈忠武)
 *   - 选中 persona → 调用 window.openVoicePanel({ userData: { personaId, displayName, subtitle } })
 *   - 进入"对话中"状态 → 钟身震动 + 光晕加强
 *
 * 公开 API:
 *   buildVoiceBell({ parent, position, registerClickable })
 *   showPersonaRing()      — 编程开启
 *   hidePersonaRing()
 *   notifyVoiceState(speaking)  — 由 host 调用驱动视觉
 */

import * as THREE from 'three';
import { worldBounds } from './grid.js';

/* ─── persona 数据 ─── */
export const PERSONAS = [
  { id: 'tour_guide', short: '周引之', sub: '引路使 · 长安导览', desc: '为你介绍当前视野', accent: 0xe8b65e, glyph: '引' },
  { id: 'libai',      short: '李白',   sub: '诗仙 · 唐 · 长安', desc: '与你对诗、饮酒、说月', accent: 0x9ac5dd, glyph: '诗' },
  { id: 'dufu',       short: '杜甫',   sub: '诗圣 · 唐 · 长安', desc: '说百姓苦、家国事', accent: 0xc88a4a, glyph: '诗' },
  { id: 'wangwei',    short: '王维',   sub: '诗佛 · 唐 · 长安', desc: '说画、说山水、说禅', accent: 0x8ab36e, glyph: '禅' },
  { id: 'docent',     short: '苏阮卿', sub: '画学博士 · 万邦讲席', desc: '为你讲画', accent: 0xd4a554, glyph: '画' },
  { id: 'gate_guard', short: '陈忠武', sub: '朱雀门校尉', desc: '问城门规制', accent: 0xa8332f, glyph: '武' },
];

/* ─── 视觉状态 ─── */
let bellGroup = null;
let bellBody = null;
let bellGlow = null;
let speaking = false;
let lastSpeakPulse = 0;

/* ─── 主构建函数 ─── */
export function buildVoiceBell({ parent, registerClickable }) {
  const g = new THREE.Group();
  g.name = 'VoiceBell';
  g.userData.kind = 'voice-bell';

  const b = worldBounds();
  // 放在沙盘 西侧 (与铜鼎对称), 远离 era 匾 / 进城牌坊
  const x = -200, z = b.maxZ + 50;

  /* 1) 石基座 */
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(28, 4, 22),
    new THREE.MeshLambertMaterial({ color: 0xb3a07a }),
  );
  base.position.set(x, 2, z);
  base.userData.kind = 'voice-bell';
  g.add(base);

  /* 2) 朱漆木架 (两根立柱 + 横梁) */
  const POSTS = [-9, 9];
  for (const dx of POSTS) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 36, 10),
      new THREE.MeshLambertMaterial({
        color: 0xa8332f,
        emissive: 0x3a1010,
        emissiveIntensity: 0.25,
      }),
    );
    post.position.set(x + dx, 22, z);
    post.userData.kind = 'voice-bell';
    g.add(post);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2, 4),
      new THREE.MeshLambertMaterial({ color: 0xd4a554, emissive: 0x4a3210, emissiveIntensity: 0.35 }),
    );
    cap.position.set(x + dx, 40, z);
    cap.userData.kind = 'voice-bell';
    g.add(cap);
  }

  /* 横梁 (金漆描边) */
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(26, 3, 4),
    new THREE.MeshLambertMaterial({ color: 0x6b3422, emissive: 0x3a1010, emissiveIntensity: 0.2 }),
  );
  beam.position.set(x, 39, z);
  beam.userData.kind = 'voice-bell';
  g.add(beam);

  const beamTop = new THREE.Mesh(
    new THREE.BoxGeometry(28, 1.5, 5),
    new THREE.MeshLambertMaterial({ color: 0xd4a554, emissive: 0x4a3210, emissiveIntensity: 0.4 }),
  );
  beamTop.position.set(x, 41.5, z);
  beamTop.userData.kind = 'voice-bell';
  g.add(beamTop);

  /* 3) 大钟 (cylinder + 顶弧) */
  const bellRadius = 7;
  const bellHeight = 18;
  bellBody = new THREE.Mesh(
    new THREE.CylinderGeometry(bellRadius, bellRadius * 1.05, bellHeight, 20, 1, true),
    new THREE.MeshLambertMaterial({
      color: 0x6b4a32,    // 古铜本色
      emissive: 0x2a1a08,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  bellBody.position.set(x, 28, z);
  bellBody.userData.kind = 'voice-bell';
  bellBody.userData.__baseY = 28;
  bellBody.userData.__baseEmiss = 0.45;
  g.add(bellBody);

  /* 钟顶 (半球) */
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(bellRadius, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({
      color: 0x6b4a32, emissive: 0x2a1a08, emissiveIntensity: 0.45,
    }),
  );
  cap.position.set(x, 28 + bellHeight / 2, z);
  cap.userData.kind = 'voice-bell';
  g.add(cap);

  /* 钟舌 (cone, 倒挂) */
  const tongue = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0xd4a554, emissive: 0x4a3210, emissiveIntensity: 0.4 }),
  );
  tongue.position.set(x, 24, z);
  tongue.rotation.x = Math.PI;
  tongue.userData.kind = 'voice-bell';
  g.add(tongue);

  /* 钟身正面 — 金漆 "聞" 字 */
  const wenTex = makeCharTexture('聞');
  const wenPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({ map: wenTex, transparent: true, depthWrite: false }),
  );
  wenPanel.position.set(x, 28, z + bellRadius + 0.05);
  wenPanel.userData.kind = 'voice-bell';
  g.add(wenPanel);

  /* 4) 钟下金色光晕 */
  bellGlow = new THREE.Mesh(
    new THREE.RingGeometry(2, 11, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf2d68b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  bellGlow.position.set(x, 4.5, z);
  bellGlow.rotation.x = -Math.PI / 2;
  g.add(bellGlow);

  /* 5) 副匾 — 在底座前, 略高便于鸟瞰看见 */
  const subPlaqueTex = makePlaqueTexture('敲鐘召喚 · 長安諸賢');
  const subPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(38, 8),
    new THREE.MeshBasicMaterial({ map: subPlaqueTex, transparent: true, depthWrite: false }),
  );
  subPlaque.position.set(x, 12, z + 16);
  subPlaque.rotation.x = -0.4;
  subPlaque.userData.kind = 'voice-bell';
  g.add(subPlaque);

  /* 5b) 巨大 sprite 头牌 (永远朝相机, 鸟瞰一眼可识) */
  const headTex = makeBigHeadTex('🔔 召喚', '長安諸賢 · 語音對話');
  const headSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: headTex, transparent: true, depthTest: false }),
  );
  headSprite.position.set(x, 56, z);
  headSprite.scale.set(46, 12, 1);
  headSprite.renderOrder = 998;
  headSprite.userData.kind = 'voice-bell';
  g.add(headSprite);

  /* 5c) 钟身金色 PointLight (鸟瞰可识) */
  const bellLight = new THREE.PointLight(0xf2d68b, 1.4, 90, 1.6);
  bellLight.position.set(x, 32, z);
  g.add(bellLight);

  /* 注册可点 */
  registerClickable(g, { id: 'voice-bell' });

  parent.add(g);
  bellGroup = g;

  /* 安装 HTML 浮层 — persona 选择环 */
  installPersonaRingDom();

  /* 每帧动画 */
  function tick() {
    const t = performance.now() / 1000;
    if (bellBody) {
      // 持续呼吸金光
      const base = bellBody.userData.__baseEmiss;
      let intensity = base + Math.sin(t * 1.6) * 0.08;
      // 说话时加强 + 抖动
      if (speaking) {
        intensity = 0.85 + Math.sin(t * 22) * 0.25;
        bellBody.position.x = bellGroup.position.x + Math.sin(t * 30) * 0.4 - 200;
        bellBody.rotation.z = Math.sin(t * 14) * 0.04;
      } else {
        bellBody.position.x = bellGroup.position.x - 200;
        bellBody.rotation.z = 0;
      }
      bellBody.material.emissiveIntensity = Math.max(0.25, Math.min(1.2, intensity));
    }
    if (bellGlow) {
      const op = speaking ? (0.35 + Math.sin(t * 5) * 0.12) : (0.18 + Math.sin(t * 1.2) * 0.05);
      bellGlow.material.opacity = op;
      bellGlow.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    }
    requestAnimationFrame(tick);
  }
  tick();

  return {
    group: g,
    showPicker: showPersonaRing,
    hidePicker: hidePersonaRing,
    setSpeaking: (s) => { speaking = !!s; },
  };
}

/* ─── helpers ─── */

function makeCharTexture(ch, opts = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  // 无背景, 只画字
  ctx.fillStyle = '#d4a554';
  ctx.font = 'bold 196px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f5d68b';
  ctx.shadowBlur = 16;
  ctx.fillText(ch, 128, 138);
  ctx.shadowBlur = 0;
  // 描边
  ctx.strokeStyle = '#3a1a08';
  ctx.lineWidth = 4;
  ctx.strokeText(ch, 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeBigHeadTex(headline, sub) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  // 透明背景 + 深色描金边浮匾
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(60,30,16,.95)');
  grad.addColorStop(1, 'rgba(20,10,6,.95)');
  ctx.fillStyle = grad;
  // 圆角矩形
  const r = 28;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(c.width - r, 0);
  ctx.arcTo(c.width, 0, c.width, r, r);
  ctx.lineTo(c.width, c.height - r);
  ctx.arcTo(c.width, c.height, c.width - r, c.height, r);
  ctx.lineTo(r, c.height);
  ctx.arcTo(0, c.height, 0, c.height - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 4;
  ctx.stroke();
  // headline
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 86px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f5d68b'; ctx.shadowBlur = 22;
  ctx.fillText(headline, c.width / 2, 92);
  ctx.shadowBlur = 0;
  // sub
  ctx.fillStyle = '#c5a878';
  ctx.font = '38px "Noto Serif SC", serif';
  ctx.fillText(sub, c.width / 2, 180);
  return new THREE.CanvasTexture(c);
}

function makePlaqueTexture(text) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 160;
  const ctx = c.getContext('2d');
  // 朱漆背景
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#5a2018');
  grad.addColorStop(1, '#2a0e08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  // 金边
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  // 字
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 64px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  return new THREE.CanvasTexture(c);
}

/* ─── HTML persona-ring overlay ─── */

function installPersonaRingDom() {
  if (document.getElementById('voice-bell-ring')) return;
  const wrap = document.createElement('div');
  wrap.id = 'voice-bell-ring';
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:99996;
    display:none;
    align-items:center; justify-content:center;
    background:radial-gradient(circle at center, rgba(0,0,0,.78), rgba(0,0,0,.92));
    backdrop-filter:blur(6px);
    animation:vbr-fade .25s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes vbr-fade { from { opacity:0 } to { opacity:1 } }
    @keyframes vbr-pop  { from { transform:scale(.6) rotate(-12deg); opacity:0 } to { transform:scale(1) rotate(0); opacity:1 } }
    #voice-bell-ring .vbr-title {
      position:absolute; top:11vh; left:50%; transform:translateX(-50%);
      color:#f5d68b; font-family:"Noto Serif SC","Songti SC",serif;
      font-size:30px; font-weight:600; letter-spacing:.22em;
      text-shadow: 0 4px 24px rgba(0,0,0,.7), 0 0 24px rgba(212,165,84,.4);
    }
    #voice-bell-ring .vbr-sub {
      position:absolute; top:calc(11vh + 50px); left:50%; transform:translateX(-50%);
      color:#9a8060; font-size:13px; letter-spacing:.3em;
    }
    #voice-bell-ring .vbr-circle {
      position:relative; width:560px; height:560px;
      max-width:90vw; max-height:80vh; aspect-ratio:1/1;
    }
    #voice-bell-ring .vbr-card {
      position:absolute; width:140px; height:170px;
      transform-origin:center;
      animation:vbr-pop .35s cubic-bezier(.32,1.3,.55,1) backwards;
      background:linear-gradient(180deg,#2a1a10ee,#0e0805ee);
      border:1.5px solid #d4a554;
      border-radius:10px;
      padding:14px 12px;
      display:flex; flex-direction:column; align-items:center; gap:6px;
      cursor:pointer;
      transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      box-shadow:0 8px 24px rgba(0,0,0,.55);
    }
    #voice-bell-ring .vbr-card:hover {
      transform:scale(1.08) translateY(-3px);
      border-color:#f5d68b;
      box-shadow:0 16px 36px rgba(0,0,0,.8), 0 0 18px rgba(212,165,84,.4);
    }
    #voice-bell-ring .vbr-glyph {
      width:50px; height:50px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-family:"Noto Serif SC",serif; font-size:30px; font-weight:bold;
      color:#1a0e08; background:#d4a554;
      box-shadow:inset 0 0 12px rgba(255,255,255,.3), 0 2px 8px rgba(0,0,0,.5);
    }
    #voice-bell-ring .vbr-name {
      color:#f5d68b; font-family:"Noto Serif SC",serif;
      font-size:17px; font-weight:600; letter-spacing:.06em;
    }
    #voice-bell-ring .vbr-sub2 {
      color:#9a8060; font-size:10px; letter-spacing:.15em; text-align:center;
      line-height:1.3;
    }
    #voice-bell-ring .vbr-desc {
      color:#c5a878; font-size:11px; text-align:center; font-style:italic;
      margin-top:4px;
    }
    #voice-bell-ring .vbr-close {
      position:absolute; top:24px; right:24px;
      width:42px; height:42px; border-radius:50%;
      border:1.5px solid #d4a554; background:#2a1a10;
      color:#f5d68b; font-size:22px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:transform .15s, background .15s;
    }
    #voice-bell-ring .vbr-close:hover { transform:rotate(90deg); background:#3a2018; }
    #voice-bell-ring .vbr-hint {
      position:absolute; bottom:8vh; left:50%; transform:translateX(-50%);
      color:#9a8060; font-size:12px; letter-spacing:.2em;
    }
  `;
  document.head.appendChild(style);

  // 标题 + 副标题
  const title = document.createElement('div');
  title.className = 'vbr-title';
  title.textContent = '召 唤 · 长 安 诸 贤';
  wrap.appendChild(title);
  const sub = document.createElement('div');
  sub.className = 'vbr-sub';
  sub.textContent = 'CHOOSE YOUR COMPANION';
  wrap.appendChild(sub);

  // 关闭
  const closeBtn = document.createElement('button');
  closeBtn.className = 'vbr-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = hidePersonaRing;
  wrap.appendChild(closeBtn);

  // 圆环
  const circle = document.createElement('div');
  circle.className = 'vbr-circle';
  wrap.appendChild(circle);

  // 6 张卡片 沿圆环分布
  const R_PCT = 0.36; // 半径占 circle 的比例
  PERSONAS.forEach((p, i) => {
    const angle = (i / PERSONAS.length) * Math.PI * 2 - Math.PI / 2;
    const cx = 50 + Math.cos(angle) * R_PCT * 100;
    const cy = 50 + Math.sin(angle) * R_PCT * 100;
    const card = document.createElement('div');
    card.className = 'vbr-card';
    card.style.left = `calc(${cx}% - 70px)`;
    card.style.top  = `calc(${cy}% - 85px)`;
    card.style.animationDelay = `${i * 0.05}s`;
    card.dataset.personaId = p.id;
    card.innerHTML = `
      <div class="vbr-glyph" style="background:#${p.accent.toString(16).padStart(6,'0')}">${p.glyph}</div>
      <div class="vbr-name">${p.short}</div>
      <div class="vbr-sub2">${p.sub}</div>
      <div class="vbr-desc">${p.desc}</div>
    `;
    card.onclick = () => {
      hidePersonaRing();
      summonPersona(p);
    };
    circle.appendChild(card);
  });

  const hint = document.createElement('div');
  hint.className = 'vbr-hint';
  hint.textContent = '点角色召唤 · Esc 取消';
  wrap.appendChild(hint);

  // 点击背景空白关闭
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) hidePersonaRing();
  });

  document.body.appendChild(wrap);

  // Esc 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.style.display !== 'none') {
      e.stopPropagation();
      hidePersonaRing();
    }
  }, true);
}

export function showPersonaRing() {
  const el = document.getElementById('voice-bell-ring');
  if (el) el.style.display = 'flex';
}
export function hidePersonaRing() {
  const el = document.getElementById('voice-bell-ring');
  if (el) el.style.display = 'none';
}

/** 召唤 persona — 调 v1 的 openVoicePanel, 用合成 npc-like 对象 */
function summonPersona(p) {
  const synthNpc = {
    userData: {
      personaId: p.id,
      displayName: p.short,
      subtitle: p.sub,
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
  };
  if (typeof window.openVoicePanel === 'function') {
    window.openVoicePanel(synthNpc);
  } else {
    console.warn('[VoiceBell] openVoicePanel not ready');
  }
  // 通知钟体"对话中"状态 (闪一下, 随 voiceAiSpeaking 持续)
  speaking = true;
  setTimeout(() => { speaking = !!window.voiceAiSpeaking; }, 1200);
}

export function notifyVoiceState(s) { speaking = !!s; }
