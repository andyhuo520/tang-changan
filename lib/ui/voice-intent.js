/**
 * Voice Intent (v2) — 把 voice agent 的 transcript / intent 翻译成 v2 动作.
 *
 * 监听 window 'message' (tang-voice-agent) 的:
 *   - data.type === 'intent' 且 data.kind 是 v2 新增的:
 *       'openAtelier' | 'snapPolaroid' | 'goTo' | 'openVoiceRing' | 'closeVoice'
 *   - data.type === 'transcript' (用户的话) → 关键词推断 intent
 *
 * 与 scene.js 的 listener 并行存在 (两者都注册 message listener, 互不干扰).
 */

import { openAtelier } from '../world/atelier.js?v=20260526-v30';
import { snapPolaroid } from './polaroid.js?v=20260526-v30';
import { showPersonaRing, hidePersonaRing } from '../world/voice-bell.js?v=20260526-v30';
import { openGalleryHall } from '../world/gallery-hall.js?v=20260526-v37';

// 丹青馆: 重设计后是位于大明宫边的厅堂, 走 WASD 进入. 这里 transcribe 到 → 调 gotoDiyHall.
const gotoDiyHall = () => {
  if (window.DiyHall && typeof window.DiyHall.gotoDiyHall === 'function') {
    window.DiyHall.gotoDiyHall();
  } else if (typeof openAtelier === 'function') {
    openAtelier();
  }
};

// AI 品牌馆 — 把品牌名转 brand id, 然后 gotoBrand
const gotoBrand = (id) => {
  if (window.BrandPlaza && typeof window.BrandPlaza.gotoBrand === 'function') {
    window.BrandPlaza.gotoBrand(id);
  }
};
const openCustomBrandModal = () => {
  if (window.BrandPlaza && typeof window.BrandPlaza.openCustomBrandModal === 'function') {
    window.BrandPlaza.openCustomBrandModal();
  }
};

// 普通地点 / NPC — 语音里的"带我去..."统一映射到游戏内自动寻路.
// 注意: 真正移动玩家的是 scene.js 暴露的 window.walkPlayerTo / walkPlayerToNpc.
const PLACE_ALIASES = [
  { keys: ['天枢府', 'AI街', 'AI一条街', '品牌街', '品牌馆', '人工智能街'], place: { x: 13, z: 5, label: '天枢府' } },
  { keys: ['朱雀大街', '朱雀门', '主街', '中轴线', 'zhuque'], place: '朱雀大街' },
  { keys: ['含元殿', '大明宫', '皇宫', '宫殿', 'hanyuan', 'region-daming'], place: '含元殿' },
  { keys: ['宣政殿'], place: '宣政殿' },
  { keys: ['紫宸殿'], place: '紫宸殿' },
  { keys: ['大雁塔', '雁塔', '慈恩寺', 'pagoda'], place: '大雁塔' },
  { keys: ['曲江池', '曲江', '杏园', 'qujiang', 'region-qujiang'], place: '曲江' },
  { keys: ['东市', 'east-market', 'region-east-market'], place: '东市' },
  { keys: ['西市', 'west-market', 'region-west-market'], place: '西市' },
  { keys: ['平康坊', '北里', 'ward-pingkang'], place: '平康坊' },
  { keys: ['梨园', '教坊'], place: '梨园' },
  { keys: ['染坊', '染布坊', '织绣'], place: '染坊' },
  { keys: ['演武校场', '校场', '演武场'], place: '演武校场' },
  { keys: ['国子监', '太学'], place: '国子监' },
  { keys: ['马球场', '马球'], place: '马球场' },
  { keys: ['玄都观', '道观'], place: '玄都观' },
  { keys: ['鸿胪寺'], place: '鸿胪寺' },
  { keys: ['西明胡寺', '胡寺'], place: '西明胡寺' },
  { keys: ['太医署'], place: '太医署' },
  { keys: ['司天监', '天文台'], place: '司天监' },
  { keys: ['丹青馆', '丹青館', '画室', '创作区', 'DIY'], action: gotoDiyHall, say: '带你去丹青馆' },
  { keys: ['李白', '李太白', '太白'], npc: 'libai' },
  { keys: ['杜甫', '杜子美', '子美'], npc: 'dufu' },
  { keys: ['王维', '王摩诘', '摩诘'], npc: 'wangwei' },
  { keys: ['周引之', '导游', '引路使'], npc: 'tour_guide' },
  { keys: ['陈忠武', '守门将', '校尉'], npc: 'gate_guard' },
];

function routeToPlace(raw) {
  const text = String(raw || '').trim();
  if (!text) return false;
  for (const item of PLACE_ALIASES) {
    if (!item.keys.some((k) => text.toLowerCase().includes(k.toLowerCase()))) continue;
    if (item.action) {
      item.action();
      if (item.say) showToast(item.say);
      return true;
    }
    if (item.npc && typeof window.walkPlayerToNpc === 'function') {
      if (!window.gameState?.active) {
        showToast('请先点击「走进长安」进入游戏模式，再让我带路');
        return true;
      }
      window.walkPlayerToNpc(item.npc);
      showToast(`带你去找 ${item.keys[0]}`);
      return true;
    }
    if (item.place && typeof window.walkPlayerTo === 'function') {
      if (!window.gameState?.active) {
        showToast('请先点击「走进长安」进入游戏模式，再让我带路');
        return true;
      }
      if (typeof item.place === 'object') {
        window.walkPlayerTo({ x: item.place.x, z: item.place.z }, { label: item.place.label || item.keys[0] });
      } else {
        window.walkPlayerTo(item.place, { label: item.keys[0] });
      }
      showToast(`带你去 ${item.keys[0]}`);
      return true;
    }
  }
  return false;
}

function routeTranscriptDestination(text) {
  if (!/(带我去|帶我去|去一下|前往|导航到|導航到|走到|我要去|想去|找一下|去找|找)/i.test(text)) {
    return false;
  }
  return routeToPlace(text);
}

// 关键词 → 动作 (用户对 AI 说的话, transcribe 后传到 parent)
const TRANSCRIPT_RULES = [
  { re: /丹青[阁閣館馆]|画[室]|atelier|创作[区]|题款|簽名|签名|落款|挂画|上墙/i, action: gotoDiyHall, say: '已传送至丹青館门口 · 走入按 F · 三面墙按 E' },
  { re: /拍立得|polaroid|留念|合影|拍[一张照]/i, action: () => snapPolaroid({ label: '長安遊·語音' }), say: '拍立得已生成在左下角' },
  { re: /画廊|畫廊|看画|看畫|藏馆|藏館|gallery|雲廊/i, action: () => openGalleryHall(), say: '雲廊已开 · 苏阮卿等你' },
  { re: /含元殿|万邦来朝|步辇图|帝王图/i, action: () => openGalleryHall({ galleryId: 'hanyuan' }), say: '雲廊 · 含元殿' },
  { re: /紫宸殿|簪花|仕女图/i, action: () => openGalleryHall({ galleryId: 'zichen' }), say: '雲廊 · 紫宸殿' },
  { re: /大雁塔|玄奘|译经/i, action: () => openGalleryHall({ galleryId: 'pagoda' }), say: '雲廊 · 大雁塔' },
  { re: /曲江|丽人行|杏园|文人雅集/i, action: () => openGalleryHall({ galleryId: 'qujiang' }), say: '雲廊 · 曲江亭' },
  { re: /鞍马|韩干|照夜白|五牛/i, action: () => openGalleryHall({ galleryId: 'anma' }), say: '雲廊 · 鞍马图苑' },
  { re: /蒙娜丽莎|星夜|梵高|达[\.·]?芬奇|万邦奇画|童子苑/i, action: () => openGalleryHall({ galleryId: 'wanguo' }), say: '雲廊 · 万邦奇画苑' },
  { re: /我的[画作創]|DIY|我[上传]?的图|私人画作/i, action: () => openGalleryHall({ galleryId: 'diy' }), say: '雲廊 · 我的長安' },
  { re: /关闭对话|结束对话|不[聊讲]了|再见|bye/i, action: () => window.closeVoicePanel?.(), say: null },
  { re: /换[一]?个角色|switch persona|换人|选[别人]/i, action: () => showPersonaRing(), say: '请选要召唤的人' },
  // ── AI 品牌街 ──
  { re: /Agora|ConvoAI|实时音[频频]|RTC/i,                         action: () => gotoBrand('agora'),     say: '已传送至 Agora 馆' },
  { re: /claude|克劳德|Anthropic|安特罗皮/i,                       action: () => gotoBrand('anthropic'), say: '已传送至 Claude 馆' },
  { re: /chatgpt|ChatGpt|GPT/i,                                  action: () => gotoBrand('chatgpt'),    say: '已传送至 ChatGPT 馆' },
  { re: /openai|OpenAi|奥特曼|sam altman/i,                        action: () => gotoBrand('openai'),     say: '已传送至 OpenAI 馆' },
  { re: /deepseek|DeepSeek|深度求索/i,                             action: () => gotoBrand('deepseek'),   say: '已传送至 DeepSeek 馆' },
  { re: /minimax|MiniMax|海螺|hailuo/i,                            action: () => gotoBrand('minimax'),    say: '已传送至 MiniMax 馆' },
  { re: /kimi|Kimi|月之暗面|moonshot/i,                            action: () => gotoBrand('kimi'),       say: '已传送至 Kimi 馆' },
  { re: /品牌街|AI[ ]?展[馆街]|建[座我]?品牌馆|自[制建]品牌|自定[义]品牌/i,
    action: () => openCustomBrandModal(), say: '打开自定义品牌馆' },
  { re: /全城|鸟瞰|看整体|整个长安/i, action: () => window.world?.fitCity?.(), say: '飞至全城' },
  { re: /回[到看]?(广场|入口|平面)/i, action: () => window.world?.fitInitial?.(), say: '回到鸟瞰广场' },
];

let installed = false;
export function installVoiceIntent() {
  if (installed) return;
  installed = true;

  window.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || data.source !== 'tang-voice-agent') return;

    // 显式 intent — voice agent 端可以直接指定
    if (data.type === 'intent') {
      const kind = data.kind;
      const p = data.payload || {};
      if (kind === 'openAtelier')   return gotoDiyHall();
      if (kind === 'snapPolaroid')  return snapPolaroid({ label: p.label });
      if (kind === 'openVoiceRing') return showPersonaRing();
      if (kind === 'openGallery')   return openGalleryHall({ galleryId: p.galleryId });
      if (kind === 'closeVoice')    return window.closeVoicePanel?.();
      if (kind === 'goTo') {
        const target = p.place || p.id || p.name || p.label || p.destination;
        if (routeToPlace(target)) return;
        if (target && typeof window.walkPlayerTo === 'function') return window.walkPlayerTo(target);
        return window.world?.goto?.(p.id);
      }
      if (kind === 'walkTo') {
        const target = p.place || p.id || p.name || p.label || p.destination;
        if (routeToPlace(target)) return;
        if (target && typeof window.walkPlayerTo === 'function') return window.walkPlayerTo(target);
      }
      // 其他 intent 由 scene.js 的 listener 处理 (setView/walkTo/findNpc)
      return;
    }

    // 用户 transcript - 关键词推断
    if (data.type === 'transcript' && data.isAgent === false) {
      const text = (data.text || '').trim();
      if (!text) return;
      if (routeTranscriptDestination(text)) return;
      for (const r of TRANSCRIPT_RULES) {
        if (r.re.test(text)) {
          try { r.action(); } catch (e) { console.warn('[VoiceIntent] action error', e); }
          if (r.say) showToast(r.say);
          break;  // 单次匹配避免一句话触发多个动作
        }
      }
    }
  });

  console.info('[VoiceIntent] installed (transcript + intent routing for v2)');
}

function showToast(text) {
  // 复用 atelier toast 如果在显示中
  const at = document.getElementById('atelier-toast');
  if (at && document.getElementById('atelier-overlay')?.style.display !== 'none') {
    at.textContent = text;
    at.classList.add('show');
    setTimeout(() => at.classList.remove('show'), 2400);
    return;
  }
  // 否则用 game toast 或自己造一个
  if (typeof window.showGameToast === 'function') {
    window.showGameToast(text, 2400);
    return;
  }
  // fallback
  let el = document.getElementById('voice-intent-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'voice-intent-toast';
    el.style.cssText = `
      position:fixed; left:50%; bottom:130px; transform:translateX(-50%);
      padding:10px 22px; background:#3a2418; color:#f5d68b;
      border:1px solid #d4a554; border-radius:24px;
      font-family:"Noto Serif SC",serif; font-size:14px; letter-spacing:.1em;
      z-index:99997; pointer-events:none; opacity:0;
      transition:opacity .25s, transform .25s;
    `;
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(8px)';
  }, 2400);
}
