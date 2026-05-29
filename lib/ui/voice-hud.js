/**
 * Voice HUD — 永远在底部居中的一个金色光圈按钮
 *
 * 三种状态:
 *   idle      — 灰金圆 + "敲鐘召喚" 字样
 *   ringing   — AI 在说话 (window.voiceAiSpeaking==true) → 脉冲金色
 *   open      — 已有 voice panel 在 (voicePanelState.open==true) → 一个 X 按钮叠在边上
 *
 * 点击行为:
 *   idle  → 弹 persona ring (voice-bell.js)
 *   open  → toggle voice panel
 *
 * 快捷键:
 *   Q     — 弹 persona ring
 *   Shift+Q — 关闭当前对话
 */

import { showPersonaRing, hidePersonaRing } from '../world/voice-bell.js?v=20260526-v30';

let hud = null;
let lastSpeak = false;

export function installVoiceHud() {
  if (document.getElementById('voice-hud')) return;

  const style = document.createElement('style');
  style.textContent = `
    #voice-hud {
      position:fixed; left:50%; bottom:24px; transform:translateX(-50%);
      z-index:99993; pointer-events:none;
      display:flex; flex-direction:column; align-items:center; gap:6px;
      font-family:"Noto Serif SC","Songti SC",serif;
      user-select:none;
    }
    #voice-hud .vh-row { display:flex; align-items:center; gap:14px; }
    #voice-hud .vh-side {
      pointer-events:auto;
      width:62px; height:62px; border-radius:50%;
      background:radial-gradient(circle at 30% 30%, #4a3220, #1a0e08);
      border:2px solid #d4a554;
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:1px; padding:0; cursor:pointer; color:#f5d68b;
      box-shadow:0 6px 20px rgba(0,0,0,.55), inset 0 0 12px rgba(212,165,84,.16);
      transition:transform .18s, box-shadow .18s, border-color .18s;
      font-family:inherit;
    }
    #voice-hud .vh-side:hover {
      transform:translateY(-2px) scale(1.06);
      border-color:#f5d68b;
      box-shadow:0 10px 26px rgba(0,0,0,.65), 0 0 22px rgba(245,214,139,.32), inset 0 0 14px rgba(212,165,84,.28);
    }
    #voice-hud .vh-side-glyph { font-size:22px; line-height:1; text-shadow:0 0 10px rgba(245,214,139,.5); }
    #voice-hud .vh-side-label { font-size:9px; letter-spacing:.18em; color:#c5a878; }
    #voice-hud .vh-btn {
      pointer-events:auto;
      width:80px; height:80px; border-radius:50%;
      background:radial-gradient(circle at 30% 30%, #5a3a22, #1a0e08);
      border:2.5px solid #d4a554;
      display:flex; align-items:center; justify-content:center;
      box-shadow:
        0 8px 24px rgba(0,0,0,.6),
        inset 0 0 16px rgba(212,165,84,.18);
      cursor:pointer;
      transition:transform .18s, box-shadow .18s, border-color .18s;
      position:relative;
    }
    #voice-hud .vh-btn:hover {
      transform:translateY(-2px) scale(1.04);
      border-color:#f5d68b;
      box-shadow:0 14px 32px rgba(0,0,0,.75), 0 0 28px rgba(245,214,139,.4), inset 0 0 20px rgba(212,165,84,.32);
    }
    #voice-hud .vh-btn .vh-glyph {
      color:#f5d68b; font-size:36px;
      text-shadow:0 0 14px rgba(245,214,139,.6);
      transition:transform .25s;
    }
    #voice-hud .vh-btn:hover .vh-glyph { transform:scale(1.1) rotate(-6deg); }
    #voice-hud.speaking .vh-btn {
      border-color:#f5d68b;
      animation:vh-ring 1.4s ease-in-out infinite;
    }
    #voice-hud.speaking .vh-glyph {
      animation:vh-glow 0.9s ease-in-out infinite alternate;
    }
    @keyframes vh-ring {
      0%, 100% { box-shadow:0 8px 24px rgba(0,0,0,.6), 0 0 0 0 rgba(245,214,139,.5), inset 0 0 16px rgba(212,165,84,.18); }
      50%      { box-shadow:0 8px 24px rgba(0,0,0,.6), 0 0 0 20px rgba(245,214,139,0), inset 0 0 26px rgba(212,165,84,.55); }
    }
    @keyframes vh-glow {
      from { text-shadow:0 0 6px rgba(245,214,139,.4); }
      to   { text-shadow:0 0 22px rgba(245,214,139,.95), 0 0 36px rgba(212,165,84,.7); }
    }
    #voice-hud .vh-label {
      pointer-events:none;
      color:#d4a554; font-size:11px; letter-spacing:.32em;
      text-shadow:0 1px 3px rgba(0,0,0,.7);
    }
    #voice-hud .vh-hint {
      pointer-events:none;
      color:#9a8060; font-size:10px; letter-spacing:.22em;
    }
    /* close pip 当 voice panel 已开 */
    #voice-hud .vh-close {
      pointer-events:auto;
      position:absolute; top:-6px; right:-6px;
      width:26px; height:26px; border-radius:50%;
      background:#a8332f; border:1.5px solid #f5d68b;
      color:#f5d68b; font-size:14px; line-height:1;
      cursor:pointer;
      display:none; align-items:center; justify-content:center;
      transition:transform .15s;
    }
    #voice-hud .vh-close:hover { transform:rotate(90deg); }
    #voice-hud.panel-open .vh-close { display:flex; }
  `;
  document.head.appendChild(style);

  hud = document.createElement('div');
  hud.id = 'voice-hud';
  hud.innerHTML = `
    <div class="vh-row">
      <button class="vh-side vh-side-l" id="voice-hud-gallery" type="button" title="雲廊 · 唐画藏馆 (G)">
        <span class="vh-side-glyph">畫</span>
        <span class="vh-side-label">雲廊</span>
      </button>
      <div class="vh-btn" id="voice-hud-btn" title="敲鐘召喚 · 長安諸賢 (Q)">
        <div class="vh-glyph">鈴</div>
        <button class="vh-close" id="voice-hud-close" type="button" title="關閉對話 (Shift+Q)">×</button>
      </div>
      <button class="vh-side vh-side-r" id="voice-hud-atelier" type="button" title="丹青館 · 走過去自寫一幅 (A · 未開遊戲時用)">
        <span class="vh-side-glyph">筆</span>
        <span class="vh-side-label">丹青館</span>
      </button>
    </div>
    <div class="vh-label">敲鐘召喚 · 長安諸賢</div>
    <div class="vh-hint">Q · CHOOSE COMPANION · G 雲廊 · A 入長安遊 · P 拍立得</div>
  `;
  document.body.appendChild(hud);

  /* 点击行为 */
  document.getElementById('voice-hud-btn').onclick = (e) => {
    if (e.target.id === 'voice-hud-close') return;
    showPersonaRing();
  };
  document.getElementById('voice-hud-close').onclick = (e) => {
    e.stopPropagation();
    if (typeof window.closeVoicePanel === 'function') window.closeVoicePanel();
    hud.classList.remove('panel-open');
  };
  document.getElementById('voice-hud-gallery').onclick = () => {
    if (typeof window.openGalleryHall === 'function') window.openGalleryHall();
  };
  document.getElementById('voice-hud-atelier').onclick = () => {
    // 重设计后: 丹青馆 是位于大明宫边墙的实体厅堂, WASD 走入才能玩.
    // 这个按钮改为 "传送到丹青馆门口" — 已在游戏中直接传送, 未启动游戏先开 CTA.
    if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
      window.DiyHall.gotoDiyHall();
    } else if (typeof window.openAtelier === 'function') {
      // fallback (旧 atelier 还在的话)
      window.openAtelier();
    }
  };

  /* 快捷键 */
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    // 文本输入时不抢
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

    if ((e.key === 'q' || e.key === 'Q') && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (e.shiftKey) {
        if (typeof window.closeVoicePanel === 'function') window.closeVoicePanel();
      } else {
        showPersonaRing();
      }
      return;
    }
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (typeof window.openGalleryHall === 'function') window.openGalleryHall();
      return;
    }
    if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      // 在 WASD 游戏中, A 是 左移 — 不要抢
      if (window.gameState && window.gameState.active) return;
      e.preventDefault();
      if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
        window.DiyHall.gotoDiyHall();
      } else if (typeof window.openAtelier === 'function') {
        window.openAtelier();
      }
      return;
    }
    if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (typeof window.snapPolaroid === 'function') window.snapPolaroid({ label: '長安遊' });
      return;
    }
  });

  /* 状态轮询 */
  setInterval(() => {
    const speaking = !!window.voiceAiSpeaking;
    if (speaking !== lastSpeak) {
      hud.classList.toggle('speaking', speaking);
      lastSpeak = speaking;
    }
    // panel open?
    const panel = document.getElementById('voicePanel');
    const open = !!(panel && panel.classList.contains('show'));
    hud.classList.toggle('panel-open', open);
  }, 200);

  console.info('[VoiceHUD] installed (Q=召唤 · G=雲廊 · A=丹青 · P=拍立得 · Shift+Q=关闭)');
}
