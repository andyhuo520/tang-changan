/**
 * Brand registry · AI 顶流品牌街
 *
 * 每一条 = 一个品牌, 在朱雀大街路口立一座唐风"品牌牌坊" + 远岛一座展馆.
 * 内置 9 个 (Claude / ChatGPT / OpenAI / DeepSeek / Qwen / 智谱 / MiniMax / Kimi + featured Agora).
 * 用户自定义品牌通过 localStorage 注入 (见 brand-plaza.js).
 *
 * id          : 内部唯一标识, 用作 GALLERIES key, GALLERY_DOORS id, 也用作 persona context key.
 * brand       : 显示名 (中文优先, 旁置英文 latin).
 * latin       : Logo 上的拉丁字 (大字渲染, 仅作为 logo 缺图时 fallback).
 * tagline     : 牌坊副标题 / 小一行的 sub.
 * logoUrl     : 真品牌 logo PNG 路径 (相对项目根, 一般 assets/brand-logos/X.png).
 *               立柱牌、馆内 logo 墙、横幅都会用它. 缺图时 fallback 到 latin 大字.
 * brandColor  : Logo 主色 (用于立柱 emissive 背光 + 馆内地毯). 0xRRGGBB.
 *               与 accent 区别: accent 是牌坊朱漆调子 (唐风); brandColor 是品牌真实主色.
 * accent      : 朱漆/锦缎色 (Tang plaque tint), 0xRRGGBB. 牌坊会用这个色调.
 * gold        : 描金色, 一般统一 0xd4a554.
 * latinColor  : Latin 字的颜色 (与牌底对比).
 * row         : 牌坊放在朱雀大街第几行路口 (0=最北, 12=最南). 朱雀大街沿 x=0.
 *               featured 的 Agora 可以占一个最显眼的中段位.
 * side        : 'W' | 'E' — 牌坊摆在朱雀大街的西侧还是东侧 (左右交错排列).
 * blurb       : 一段简洁中文介绍 (90-160 字), 进展馆时投递给"智机使"作为 [场景提示].
 * highlights  : 3-5 条品牌核心能力/事件, 牌坊背后说明牌 + 讲解员的"展品列表".
 * featured    : 是否做加大版 (Agora 用).
 * personaCue  : 短一句, 给"智机使"作开场的 hook.
 */

export const LOGO_BASE = 'assets/brand-logos';

export const BUILT_IN_BRANDS = [
  {
    id: 'agora',
    brand: 'Agora',
    latin: 'Agora',
    tagline: '实时音视频 · ConvoAI 语音智能体',
    logoUrl: `${LOGO_BASE}/agora.png?v=20260529-agora-logo`,
    brandColor: 0x00b7ff,   // agora 渐变蓝中段
    accent: 0xff7a3a,
    gold: 0xd4a554,
    latinColor: '#fff5d8',
    row: 6,
    side: 'E',
    featured: true,
    blurb: 'Agora 是全球最早把实时音视频 SDK 做成"插件"的公司之一。本游戏里你听到的每一句"长安诸贤"，背后跑的就是 Agora 的 ConvoAI——把 ASR、LLM、TTS 拼成一根低延迟的实时音频管线。Agora 的招牌是低于业内平均 6-7 秒一半的端到端响应（约 1-2 秒），SDK 覆盖 Web、iOS、Android、Flutter、RN。',
    highlights: [
      'ConvoAI · 语音智能体一键接入，本游戏的活体演示',
      'RTC SDK · 低于 200ms 全球实时音视频',
      'RTM · 在线状态/信令/Presence/Storage 一站',
      'Cloud Recording · 多人对话录制存档',
      'Voice Agent Skill · Coding Agent 30 秒搭出 demo',
    ],
    personaCue: '入"Agora 馆"——你正站在玩家与你之间这条语音管线的"机房"前。请先用一句"实时声波"的隐喻招呼客人，再点出本馆三件镇馆之宝：ConvoAI、低延迟 RTC、Voice Agent Skill。',
  },
  {
    id: 'anthropic',
    brand: 'Claude · Anthropic',
    latin: 'Claude',
    tagline: 'Anthropic · 长上下文 · 编码与推理',
    logoUrl: `${LOGO_BASE}/claude.png`,
    brandColor: 0xd97757,   // anthropic 暖橙
    accent: 0xd86b3a,
    gold: 0xd4a554,
    latinColor: '#fff2dc',
    row: 4,
    side: 'W',
    blurb: 'Claude 出自 Anthropic——一家以"AI 安全"为底色的实验室。它最大的招牌是超长上下文（200K-1M）、强项编码和精细 instruction-following，被很多开发者当作"代码 IDE 里的另一个大脑"。Cursor、Claude Code、Artifacts 都是它的核心产品形态。',
    highlights: [
      'Claude · 4 / 4.5 系列模型',
      '200K-1M tokens 长上下文',
      '编码与 agent 工具调用强项',
      'Constitutional AI · 安全对齐方法',
      'Anthropic 由 OpenAI 早期核心团队 2021 创立',
    ],
    personaCue: '入"Claude 馆"——这是一个把"长上下文 + 编码"做到极致的派系。先用一句类比唐代"翰林学士"的口吻引出"长卷不疲"，再点出 Claude 的三件招牌。',
  },
  {
    id: 'openai',
    brand: 'OpenAI',
    latin: 'OpenAI',
    tagline: 'GPT 系列 · 多模态 · Agent 平台',
    logoUrl: `${LOGO_BASE}/openai.png`,
    brandColor: 0xf0f0f0,   // openai 经典黑白, 取近白
    accent: 0x2a8c6e,
    gold: 0xd4a554,
    latinColor: '#e6fff2',
    row: 3,
    side: 'E',
    blurb: 'OpenAI 是把"大语言模型"从论文推向亿级用户的那家公司。从 2022 年底的 ChatGPT 开始，它接连定义了 LLM 产品形态、function calling、Assistants API、GPT-4o 多模态、Sora 视频、o1/o3 推理链。它的 API 已经是开发者市场的事实标准接口。',
    highlights: [
      'ChatGPT · 第一款月活破亿的消费级 AI',
      'GPT-4o / o3 · 多模态 + 推理链',
      'Sora · 文生视频',
      'Assistants & Realtime API',
      'DALL·E · 图像生成开创者之一',
    ],
    personaCue: '入"OpenAI 馆"——这是把 AI 推上"全民可用"的派系。用一句"开了大门的人"的隐喻招呼客人，再点出 ChatGPT、GPT-4o、Sora 三件招牌。',
  },
  {
    id: 'chatgpt',
    brand: 'ChatGPT',
    latin: 'ChatGPT',
    tagline: '十亿人的入门 AI 助手',
    logoUrl: `${LOGO_BASE}/chatgpt.png`,
    brandColor: 0x10a37f,   // openai 主品牌绿
    accent: 0x10a37f,
    gold: 0xd4a554,
    latinColor: '#e3fff3',
    row: 2,
    side: 'W',
    blurb: 'ChatGPT 是 OpenAI 推出的对话产品——它一个人开启了"AI 助手"赛道，也是 LLM 产品形态的事实模板：左边对话窗口、右边可调上下文、可装 GPTs / Connectors / Memory。月活破 4 亿，全球教育、企业、个人办公第一站。',
    highlights: [
      '月活 4 亿+',
      'GPTs · 用户自建 AI Agent',
      'Connectors · 连接 Gmail/Drive/Slack',
      'Memory · 跨对话长期记忆',
      'Voice Mode · 全双工语音',
    ],
    personaCue: '入"ChatGPT 馆"——这是 AI 应用的"普及入口"。用一句"千门开为一家"的口吻引出 ChatGPT，再点出 GPTs、记忆、语音三个亮点。',
  },
  {
    id: 'deepseek',
    brand: 'DeepSeek · 深度求索',
    latin: 'DeepSeek',
    tagline: '开源推理模型 · R1 / V3',
    logoUrl: `${LOGO_BASE}/deepseek.png`,
    brandColor: 0x4e6dff,   // deepseek 鲸蓝
    accent: 0x4e6dff,
    gold: 0xd4a554,
    latinColor: '#e8edff',
    row: 8,
    side: 'W',
    blurb: 'DeepSeek（深度求索）是把"中国开源 LLM"推到全球第一梯队的团队。2024-2025 年它的 V3 / R1 系列把"开源推理模型"的天花板从 70 分推到 90 分，连带着把 GPU 训练成本压到对手的 1/10。MoE 架构 + 强化学习推理是它的两张王牌。',
    highlights: [
      'DeepSeek-R1 · 开源推理模型，对标 o1',
      'V3 · 671B MoE，仅 37B 激活',
      '训练成本仅约 OpenAI 同档 1/10',
      'MIT 协议开源 weights',
      '搅动全球 GPU/估值格局',
    ],
    personaCue: '入"DeepSeek 馆"——这是把推理模型彻底开源、压垮训练成本的派系。用一句"开仓济市"的隐喻招呼客人，再点出 R1、V3、MoE 三件招牌。',
  },
  {
    id: 'minimax',
    brand: 'MiniMax · 海螺',
    latin: 'MiniMax',
    tagline: '多模态原生 · 视频/语音/文本',
    logoUrl: `${LOGO_BASE}/minimax.png`,
    brandColor: 0xff5a6a,   // minimax 粉红渐变
    accent: 0xb44df0,
    gold: 0xd4a554,
    latinColor: '#f4e6ff',
    row: 9,
    side: 'E',
    blurb: 'MiniMax 是国内最早把"多模态原生"做成全栈产品矩阵的公司——海螺 AI（chat）、海螺视频（text-to-video）、Speech 2.5（TTS）、MiniMax-01（456B 参数）。它的核心赌注是：未来用户不再分开用文字 / 视频 / 语音，而是一个 AI 同时输出三态。',
    highlights: [
      'MiniMax-01 · 456B 参数旗舰',
      'Hailuo Video · 国内最强 text-to-video',
      'Speech 2.5 · 多语言 TTS',
      '海螺 AI · C 端对话产品',
      'MCP 生态早期参与方',
    ],
    personaCue: '入"MiniMax 馆"——这是把文字、视频、语音三合一的派系。用一句"三才同器"的隐喻招呼客人，再点出 MiniMax-01、海螺视频、Speech 2.5 三件招牌。',
  },
  {
    id: 'kimi',
    brand: 'Kimi · 月之暗面',
    latin: 'Kimi',
    tagline: 'Moonshot · 长文本 · 国产代表',
    logoUrl: `${LOGO_BASE}/kimi.png`,
    brandColor: 0x4a90ff,   // kimi 蓝色高光
    accent: 0x3a3f7a,
    gold: 0xd4a554,
    latinColor: '#e8e9ff',
    row: 10,
    side: 'W',
    blurb: 'Kimi 出自月之暗面 Moonshot——把"长文本"做成 C 端品牌的国产 AI 助手。Kimi 2 / K2 系列在中文 Agent、代码、推理三项榜单上常驻第一。它的另一张牌是搜索 + 阅读：把整本书、整个网站塞进去也不掉链子。',
    highlights: [
      'Kimi K2 · 1T 参数 MoE 旗舰',
      '200 万 tokens 中文长上下文',
      '深度搜索 + Web Browse',
      '强代码 / 数学推理',
      '国产 Agent 评测常驻冠军',
    ],
    personaCue: '入"Kimi 馆"——这是把"长文本"做成国产代表的派系。用一句"千卷不疲"的隐喻招呼客人，再点出 K2、长上下文、深度搜索三件招牌。',
  },
  {
    id: 'qwen',
    brand: 'Qwen · 通义千问',
    latin: 'Qwen',
    tagline: '阿里通义 · 全尺寸开源 · 多模态',
    logoUrl: `${LOGO_BASE}/qwen.png`,
    brandColor: 0x615ced,   // 通义紫
    accent: 0x615ced,
    gold: 0xd4a554,
    latinColor: '#ece9ff',
    row: 7,
    side: 'E',
    blurb: 'Qwen（通义千问）出自阿里巴巴达摩院——把"全尺寸开源"做成全球开发者第一选择的国产派系。从 0.5B 到 235B、从 base 到 coder、math、vl、audio，Qwen 一家把所有规模和能力线都铺满了。Hugging Face 下载量、衍生模型数长期力压 Llama, 一度成为开源圈"事实上的基模".',
    highlights: [
      'Qwen3 · 235B / 30B / 7B 全尺寸开源',
      'Qwen3-Coder · 编码专项, 对标 Claude/GPT-4',
      'Qwen-VL · 多模态视觉理解',
      'Qwen-Audio / Omni · 语音 + 多模态',
      'HF 下载量 + 衍生数 一度全球第一',
    ],
    personaCue: '入"Qwen 馆"——这是把"全尺寸开源"铺满的派系，国产 LLM 在世界开源圈的旗手。用一句"千问千答"的隐喻招呼客人，再点出 Qwen3、Coder、VL/Audio 三件招牌。',
  },
  {
    id: 'zhipu',
    brand: '智谱 · ChatGLM',
    latin: 'Zhipu',
    tagline: 'GLM 系列 · 清华系 · 国产基模',
    logoUrl: `${LOGO_BASE}/zhipu.png`,
    brandColor: 0x4e44ce,   // 智谱紫
    accent: 0x4e44ce,
    gold: 0xd4a554,
    latinColor: '#ebe9ff',
    row: 5,
    side: 'W',
    blurb: '智谱 AI（Zhipu）出自清华大学知识工程实验室——是中国最早一批做大模型预训练的团队之一。它的 GLM / ChatGLM 系列把"双语 + 推理 + 工具调用"打磨到第一梯队，旗下的 BigModel、智谱清言（chatglm.cn）一直是国产应用层的"基模供应商"，AutoGLM 还开了国产 Agent 操控浏览器的先河。',
    highlights: [
      'GLM-4 / GLM-4.6 · 中文基模旗舰',
      'ChatGLM 系列 · 6B / 9B 早期开源代表',
      'CogVideoX / CogView · 多模态生成',
      'AutoGLM · 国产 Agent 操控浏览器',
      '清华系 · 中国大模型"黄埔军校"',
    ],
    personaCue: '入"智谱馆"——这是清华系点燃的国产大模型派系。用一句"清流出谷"的隐喻招呼客人，再点出 GLM-4、ChatGLM、AutoGLM 三件招牌。',
  },
];

/* ───────── localStorage 自定义品牌 ───────── */

const CUSTOM_KEY = 'han.brands.custom.v1';
const MAX_CUSTOM_BRANDS = 8;

export function loadCustomBrands() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); }
  catch (e) { return []; }
}

export function saveCustomBrands(list) {
  try {
    localStorage.setItem(
      CUSTOM_KEY,
      JSON.stringify(list.slice(0, MAX_CUSTOM_BRANDS)),
    );
  } catch (e) { console.warn('[brand-data] saveCustomBrands failed', e); }
}

/** 添加一个用户自定义品牌. data 形如 { brand, latin, tagline, blurb, logoDataUrl, accent? }. */
export function addCustomBrand(data) {
  const list = loadCustomBrands();
  const id =
    'custom_' +
    (data.latin || data.brand || 'brand')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') +
    '_' + Date.now().toString(36).slice(-4);
  const next = [
    {
      id,
      brand: (data.brand || '未名品牌').slice(0, 30),
      latin: (data.latin || data.brand || 'Brand').slice(0, 16),
      tagline: (data.tagline || '').slice(0, 40),
      accent: data.accent ?? 0xa8332f,
      gold: 0xd4a554,
      latinColor: data.latinColor || '#fff5d8',
      logoDataUrl: data.logoDataUrl || null,
      blurb: (data.blurb || '').slice(0, 500),
      highlights: Array.isArray(data.highlights) ? data.highlights.slice(0, 6) : [],
      side: data.side || 'E',
      row: data.row != null ? data.row : (5 + (list.length % 5)),
      featured: false,
      custom: true,
      personaCue:
        `入"${(data.brand || '该馆')}"——客人自带的品牌. ` +
        `请以"未来使节"的口吻欢迎客人, 60-90 字, 不换行, ` +
        `把客人留下的简介自然融入开场.`,
      createdAt: Date.now(),
    },
    ...list,
  ].slice(0, MAX_CUSTOM_BRANDS);
  saveCustomBrands(next);
  window.dispatchEvent(new CustomEvent('han-brand-added', { detail: { id } }));
  return next[0];
}

/** 删除一个自定义品牌 */
export function removeCustomBrand(id) {
  const next = loadCustomBrands().filter((b) => b.id !== id);
  saveCustomBrands(next);
  window.dispatchEvent(new CustomEvent('han-brand-removed', { detail: { id } }));
  return next;
}

/** 合并: 内置 + 自定义 */
export function allBrands() {
  return [...BUILT_IN_BRANDS, ...loadCustomBrands()];
}
