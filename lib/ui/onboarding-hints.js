/**
 * Onboarding Hints — 首次打开时 6 秒的金色提示条, 列出 4 件可干的事:
 *   1. 召唤·长安诸贤  (voice HUD / Q)
 *   2. 走進長安      (entry gate)
 *   3. 丹青閣        (atelier - 自寫一幅)
 *   4. 拍立得        (snapshot)
 *
 * 30 天内只显示一次 (localStorage); 用户可点 × 关闭.
 */

const KEY = 'han.onboarding-hints.v2';
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function installOnboardingHints() {
  console.info('[OnboardingHints] install() called');
  if (document.getElementById('han-onboarding')) {
    console.info('[OnboardingHints] already mounted, skipping');
    return;
  }
  if (!document.body) {
    console.warn('[OnboardingHints] document.body not ready, retrying in 200ms');
    setTimeout(installOnboardingHints, 200);
    return;
  }

  // URL ?onboarding=force 强制显示, ?onboarding=off 关闭
  const params = new URLSearchParams(window.location.search);
  const force = params.get('onboarding') === 'force';
  const off   = params.get('onboarding') === 'off';
  if (off) {
    console.info('[OnboardingHints] off via URL, skipping');
    return;
  }

  // 已显示过 → 跳过 (除非 force)
  if (!force) {
    try {
      const last = parseInt(localStorage.getItem(KEY) || '0', 10);
      if (Date.now() - last < TTL_MS) {
        console.info('[OnboardingHints] already seen within 30 days, skipping (use ?onboarding=force to force)');
        return;
      }
    } catch (e) {}
  }
  console.info('[OnboardingHints] showing welcome banner');

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ob-slide-in { from { transform:translateX(-50%) translateY(40px); opacity:0; } to { transform:translateX(-50%) translateY(0); opacity:1; } }
    @keyframes ob-pulse { 0%,100% { box-shadow:0 8px 24px rgba(0,0,0,.55), 0 0 0 0 rgba(212,165,84,.5);} 50% { box-shadow:0 8px 24px rgba(0,0,0,.55), 0 0 0 8px rgba(212,165,84,0);} }
    #han-onboarding {
      position:fixed; left:50%; top:14px; transform:translateX(-50%);
      z-index:99999;
      background:linear-gradient(180deg, rgba(60,30,16,.96), rgba(20,10,6,.96));
      border:1.5px solid #d4a554; border-radius:14px;
      padding:14px 22px 14px 18px;
      color:#f5d68b; font-family:"Noto Serif SC","Songti SC",serif;
      display:flex; gap:18px; align-items:center;
      box-shadow:0 16px 36px rgba(0,0,0,.7);
      animation:ob-slide-in .4s cubic-bezier(.32,1.3,.55,1), ob-pulse 2.4s ease-in-out infinite;
      max-width:min(720px, 92vw);
    }
    #han-onboarding .ob-title { font-size:13px; letter-spacing:.22em; color:#d4a554; font-weight:600; margin-bottom:6px; }
    #han-onboarding .ob-list { display:flex; gap:10px; flex-wrap:wrap; }
    #han-onboarding .ob-item {
      display:flex; align-items:center; gap:6px;
      padding:5px 12px; background:rgba(212,165,84,.1);
      border:1px solid rgba(212,165,84,.3); border-radius:18px;
      font-size:12px; letter-spacing:.1em; white-space:nowrap;
      cursor:pointer;
      transition:transform .15s, background .15s, border-color .15s;
    }
    #han-onboarding .ob-item:hover {
      transform:translateY(-1px);
      background:rgba(212,165,84,.22);
      border-color:#f5d68b;
    }
    #han-onboarding .ob-item b { color:#f5d68b; }
    #han-onboarding .ob-close {
      width:28px; height:28px; border-radius:50%;
      border:1px solid #d4a554; background:transparent;
      color:#f5d68b; font-size:16px; cursor:pointer;
      transition:transform .15s, background .15s;
      display:flex; align-items:center; justify-content:center;
    }
    #han-onboarding .ob-close:hover { transform:rotate(90deg); background:rgba(212,165,84,.2); }
    @media (max-width:720px) {
      #han-onboarding { flex-direction:column; align-items:stretch; max-width:94vw; }
    }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = 'han-onboarding';
  wrap.innerHTML = `
    <div>
      <div class="ob-title">歡迎遊大唐 · 六件可玩</div>
      <div class="ob-list">
        <div class="ob-item" data-action="voice">🔔 <b>召喚諸賢</b> · Q</div>
        <div class="ob-item" data-action="gallery">🏛 <b>雲廊</b> · 唐画藏馆</div>
        <div class="ob-item" data-action="enter">🚪 <b>走進長安</b> · 第一視角</div>
        <div class="ob-item" data-action="atelier">🖌 <b>丹青館</b> · 走過去自寫</div>
        <div class="ob-item" data-action="brands">🪧 <b>天枢府</b> · AI 七殿 · 朱雀大街东侧</div>
        <div class="ob-item" data-action="polaroid">📸 <b>拍立得</b> · 留念</div>
      </div>
    </div>
    <button class="ob-close" id="han-onboarding-close" type="button">×</button>
  `;
  document.body.appendChild(wrap);

  const close = () => {
    wrap.style.transition = 'opacity .35s ease, transform .35s ease';
    wrap.style.opacity = '0';
    wrap.style.transform = 'translateX(-50%) translateY(-12px)';
    setTimeout(() => wrap.remove(), 350);
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
  };
  document.getElementById('han-onboarding-close').onclick = close;

  // 4 个 pill 都可点 → 直接触发对应动作
  wrap.querySelectorAll('.ob-item').forEach((el) => {
    el.onclick = () => {
      const action = el.dataset.action;
      // 触发动作后, 自动关掉 onboarding (不再阻挡)
      const triggerAndClose = (fn) => {
        try { fn(); } catch (e) { console.warn('[OnboardingHints] action error', e); }
        close();
      };
      if (action === 'voice') {
        triggerAndClose(() => {
          import('../world/voice-bell.js?v=20260526-v31')
            .then(m => m.showPersonaRing())
            .catch(() => {});
        });
      } else if (action === 'enter') {
        triggerAndClose(() => {
          if (typeof window.diegeticUI?.enterGameMode === 'function') {
            window.diegeticUI.enterGameMode();
          } else {
            document.getElementById('enterGameBtn')?.click?.();
          }
        });
      } else if (action === 'atelier') {
        triggerAndClose(() => {
          // 重设计后: 丹青馆 是 WASD 触发的实体厅堂, 不再是 overlay.
          // gotoDiyHall 内部判断: 已开游戏直接传送, 未开则触发"走进长安" CTA.
          if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
            window.DiyHall.gotoDiyHall();
          } else if (typeof window.openAtelier === 'function') {
            window.openAtelier();
          }
        });
      } else if (action === 'polaroid') {
        triggerAndClose(() => {
          if (typeof window.snapPolaroid === 'function') window.snapPolaroid({ label: '長安遊' });
        });
      } else if (action === 'gallery') {
        triggerAndClose(() => {
          if (typeof window.openGalleryHall === 'function') window.openGalleryHall();
        });
      } else if (action === 'brands') {
        triggerAndClose(() => {
          // 优先: 已开游戏 → 传送到 Agora 镇街; 没开 → 触发 CTA + pending
          if (window.BrandPlaza && typeof window.BrandPlaza.gotoBrand === 'function') {
            window.BrandPlaza.gotoBrand('agora');
          }
        });
      }
    };
  });

  // 12 秒后自动收
  setTimeout(close, 12000);
}

/** 重置一次性提示 (调试用) */
export function resetOnboardingHints() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

// 暴露调试 API
if (typeof window !== 'undefined') {
  window.resetOnboardingHints = resetOnboardingHints;
}
