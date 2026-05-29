/**
 * Gallery Hall · 雲廊畫廊 — 唐画藏馆 (v2 diegetic + HTML overlay)
 *
 * 設計目標:
 *   - 在 v2 鸟瞰沙盘里增加一座"雲廊" diegetic 建筑 (与丹青阁 / 青铜钟 共三大入口)
 *   - 点击 → 全屏 HTML 画廊 overlay 浏览 7 个殿宇的真迹 + DIY 创作
 *   - 每幅画可点开 lightbox: 大图 + 标题 + 关键见解 (viewpoints)
 *   - 顶部一键 "召喚苏阮卿讲解" → 触发现有 voice panel
 *   - 自动把 atelier 的 AI/上传作品 也展出到 "DIY 长安" 区
 *
 * Public:
 *   buildGalleryHall({ parent, registerClickable })
 *   openGalleryHall(opts)   - opts.galleryId 选定打开哪个殿
 *   closeGalleryHall()
 */

import * as THREE from 'three';
import { worldBounds } from './grid.js';

/* ────────────────────────────────────────────────────────
 * 唐画真迹 + 殿宇内容 (取自 v1 scene.js GALLERIES, 同义保留 voice_brief)
 * 7 个殿苑, 共 28 幅画 (含 7 幅真迹 masterpiece).
 * ──────────────────────────────────────────────────────── */
export const GALLERY_DATA = {
  hanyuan: {
    title: '含元殿 · 万邦来朝',
    subtitle: '丹凤门内 · 大明宫之始 · 异邦朝贺地',
    accent: '#c04030',
    panels: [
      {
        title: '步辇图',
        masterpiece: true,
        artist: '阎立本',
        dynasty: '唐 · 贞观',
        year: '641 年',
        medium: '绢本设色 · 38.5×129cm',
        keeper: '北京故宫博物院',
        caption: '贞观十五年, 太宗坐步辇接见吐蕃使者禄东赞, 议文成公主入藏和亲——大唐与吐蕃汉藏一家之始.',
        image: 'murals/bunian-tu.png',
        viewpoints: [
          '画中太宗的步辇由九名宫女抬扛, 举伞张扇——天子出行规制可由此一窥.',
          '红衣者即禄东赞, 吐蕃名相, 深目高鼻, 衣袍带土黄色调——画家用色凸显异族身份.',
          '前后两个礼官, 一人持笏在前, 一人为通译——这是唐朝接见外使的"三人组"标准程式.',
          '阎立本号"右相", 主管太宗朝绘画署; 画中人物比例严格遵循"主大臣小"的等级法, 太宗最大.',
        ],
      },
      {
        title: '历代帝王图',
        masterpiece: true,
        artist: '阎立本',
        dynasty: '唐 · 约贞观',
        year: '627-649 年',
        medium: '绢本设色 · 51.3×531cm',
        keeper: '美国波士顿美术馆',
        caption: '阎立本绘十三位历代帝王全身像, 自汉昭烈至隋炀帝. 太宗以为镜鉴: 成就在为君者一念之间.',
        image: 'murals/lidai-diwang-tu.png',
        viewpoints: [
          '画卷从右起: 汉昭烈帝刘备, 红袍——画家以正色彰显仁主之像.',
          '隋炀帝立于卷末, 黑袍佝偻, 眉宇含忧——亡国之君的"贬笔".',
          '太宗令阎立本作此图, 意在以历代得失自勉——"以铜为镜可正衣冠, 以古为镜可知兴替".',
          '画中人物等大却气度悬殊: 开国仁主皆挺立轩昂, 亡国之君则侧身退缩——"以形写神"的范本.',
        ],
      },
      {
        title: '万邦来朝',
        caption: '日本遣唐使, 新罗朝贡, 大食使节, 吐蕃赞普——异邦贺正使节列于含元殿丹墀.',
        viewpoints: [
          '元正之日, 外邦使节自丹凤门入, 登含元殿丹墀朝贺, 奏《九部乐》.',
          '此乃"万邦来朝"理想图景: 一日内接见七十二国使节, 大唐威仪四海尽彰.',
        ],
      },
      {
        title: '元日大朝',
        caption: '正月元日, 皇帝御含元殿, 受群臣朝贺, 奏《破阵乐》《庆善乐》.',
        viewpoints: [
          '元日大朝是大唐最隆重的朝会, 文武百官按品级序立, 皇帝亲御含元殿——一年只此一回.',
          '《破阵乐》是太宗征伐时所制, 战鼓擂动, 群臣山呼万岁——大唐最雄武的开年仪式.',
        ],
      },
    ],
  },

  zichen: {
    title: '紫宸殿 · 内朝寝兴',
    subtitle: '内朝最深处 · 唯亲贵得入 · 仕女画藏馆',
    accent: '#c08868',
    panels: [
      {
        title: '簪花仕女图',
        masterpiece: true,
        artist: '周昉',
        dynasty: '唐 · 大历至贞元',
        year: '766-805 年',
        medium: '绢本设色 · 46×180cm',
        keeper: '辽宁省博物馆',
        caption: '周昉绘宫中贵妇五人, 侍女一人——簪花高髻, 红裙曳地, 戏犬扑蝶——盛唐"丰肌秀骨"仕女画的范本.',
        image: 'murals/zanhua-shinu-tu.png',
        viewpoints: [
          '画家以"游丝描"细线勾勒披纱, 透出内里红裙花纹——"层而不乱"是周郎独门绝技.',
          '六位人物体态"丰腴秾丽"——开元天宝以来"以肥为美"的审美定型, 杨贵妃便是这身姿.',
          '画中无任何背景, 只见人物相互呼应——形成"以人映人"的空间感.',
          '题材表面是宫闱闲事, 实则是宫廷女子在朝政紧绷之外的一点松弛——"避乱怀宁"心境的隐喻.',
        ],
      },
      {
        title: '入阁仪',
        caption: '紫宸殿为内朝, 唯亲贵大臣得入, 谓之"入阁".',
        viewpoints: ['入阁者皆三品以上, 服紫披袍, 入紫宸殿前需在侧门候唤——是大唐最高的"门内礼".'],
      },
      {
        title: '夜对',
        caption: '皇帝夜召学士对答时政, 烛火摇红, 琴书雅集.',
        viewpoints: ['唐玄宗最爱夜对——召李白入紫宸殿, 草《清平调》三章, 是"千古文学夜会"的实景.'],
      },
    ],
  },

  pagoda: {
    title: '大雁塔 · 玄奘西天',
    subtitle: '慈恩寺译经场 · 进士题名地',
    accent: '#d4a060',
    panels: [
      {
        title: '玄奘取经图',
        caption: '贞观三年, 玄奘西行万里, 赴天竺求佛法十七年.',
        viewpoints: ['玄奘自长安出发, 经凉州、瓜州、玉门关、伊吾、高昌——是大唐"西行第一壮举".'],
      },
      {
        title: '译经场',
        caption: '回长安后, 于慈恩寺西院译经一千三百三十五卷.',
        viewpoints: ['译经场设"证义""缀文""润文""书手"四职, 是中古最大的国家翻译工程.'],
      },
      {
        title: '雁塔题名',
        caption: '凡进士登第, 杏花盛开时齐登塔顶题名留念.',
        viewpoints: ['"雁塔题名"成为唐人最高荣耀, 韩愈、白居易、刘禹锡皆题名于此.'],
      },
      {
        title: '佛祖说法',
        caption: '《大唐西域记》载西天圣境, 菩萨垂华盖, 香风四溢.',
        viewpoints: ['玄奘《大唐西域记》记一百三十八国, 是唐人对西域最翔实的地理志.'],
      },
    ],
  },

  qujiang: {
    title: '曲江亭 · 文人雅集',
    subtitle: '春暖花开 · 进士游宴地 · 长安最盛处',
    accent: '#c06090',
    panels: [
      {
        title: '丽人行',
        caption: '"三月三日天气新, 长安水边多丽人"——杜甫《丽人行》.',
        viewpoints: ['上巳节曲江畔, 长安仕女盛装出游, 是杜甫笔下唐朝最艳丽的春日图.'],
      },
      {
        title: '曲江流饮',
        caption: '羽觞随曲水漂流, 停于谁前谁赋诗一首.',
        viewpoints: ['唐人"曲水流觞"宗王羲之兰亭旧典——长安文人最雅的春日聚会.'],
      },
      {
        title: '杏园探花',
        caption: '新科进士曲江游宴, 择年少俊美者为"探花使".',
        viewpoints: ['进士及第后, 先曲江赐宴, 再杏园探花——"探花郎"由此得名.'],
      },
    ],
  },

  anma: {
    title: '鞍马图苑 · 韩马韩牛',
    subtitle: '太仆寺所掌 · 大唐"重马政"宗',
    accent: '#8a5c3a',
    panels: [
      {
        title: '照夜白图',
        masterpiece: true,
        artist: '韩干',
        dynasty: '盛唐 · 玄宗',
        year: '约 742 年',
        medium: '纸本设色 · 30.8×33.5cm',
        keeper: '美国纽约大都会博物馆',
        caption: '韩干所绘玄宗御马"照夜白"——大宛汗血宝马, 拴桩昂首嘶鸣, 蹄爪奋张如欲腾空.',
        image: 'murals/zhaoyebai-tu.png',
        viewpoints: [
          '韩干画马, 不学前人成法, 直入御厩对真马写生——"陛下内厩之马, 皆臣之师也".',
          '"照夜白"是大宛汗血宝马, 玄宗"日不见照夜白则寝不安", 命韩干画其形以慰相思.',
          '此马"飞踢之势"——前蹄腾空、后蹄踏地, 是韩干独创的"瞬间动势"画法.',
          '杜甫诗"干惟画肉不画骨"——后人多解作贬, 阮卿以为乃是赞叹: 韩干以丰润示力量.',
        ],
      },
      {
        title: '五牛图',
        masterpiece: true,
        artist: '韩滉',
        dynasty: '中唐 · 德宗',
        year: '约 780-790 年',
        medium: '纸本设色 · 139.8×20.8cm',
        keeper: '北京故宫博物院',
        caption: '韩滉所绘五头神态各异之牛——立, 行, 舐, 回首, 走泥, 中唐"重农画"的压卷之作.',
        image: 'murals/wuniu-tu.png',
        viewpoints: [
          '韩滉是中唐宰相, 总持江淮转运十年; 公务之余以画自遣——"以画明志"的范本.',
          '五牛各具其性: 最右黑白花牛独立回首, 神色微傲; 居中老牛回首望向画外, 似听人语.',
          '韩滉用笔粗壮如农夫扛犁, 线条沉重稳实——"以拙胜巧"的极致.',
          '此卷寄意: 大唐以农立国, 宰相亲画五牛, 是向天子宣告"勤农即勤政"——一卷画即一道政纲.',
        ],
      },
      {
        title: '太宗六骏石刻',
        caption: '昭陵北门外六块石浮雕——太宗一生驰骋疆场的六匹战马.',
        viewpoints: ['"昭陵六骏": 飒露紫、青骓、特勒骠、什伐赤、白蹄乌、拳毛䯄——阎立本起稿, 石匠雕刻.'],
      },
      {
        title: '汗血宝马入贡图',
        caption: '大宛、康居、回鹘使节牵汗血宝马入长安——西域诸国年年献马.',
        viewpoints: ['玄宗朝御厩养马最盛时, 多至四十万匹——大唐铁骑之盛冠绝古今.'],
      },
    ],
  },

  wanguo: {
    title: '万邦奇画苑 · 瀛海远卷',
    subtitle: '长安画学馆偏殿 · 别号"童子苑"',
    accent: '#1a2848',
    panels: [
      {
        title: '蒙娜丽莎童子像',
        masterpiece: true,
        artist: '达·芬奇 (传)',
        dynasty: '瀛海西极',
        year: '约 1503-1506 年',
        medium: '童趣摹本',
        keeper: '泰西卢浮宫 (真迹)',
        caption: '泰西大秦国后裔画师达·芬奇所作《里萨夫人像》, 童子笔法摹本——西人称作"千年第一画".',
        image: 'murals/monalisa-q.png',
        viewpoints: [
          '画中人那一抹浅笑——西人千百年来不解其意, 此即所谓"蒙娜丽莎之微笑".',
          '背景的青山曲水, 画家以"渐淡法" (sfumato) 令远景如雾中所见.',
          '原作画师达·芬奇是西海大秦后裔, 既画画也通天文、机巧、解剖、水利——"什么都钻研"的奇才.',
          '此摹本"童子笔" (Q 版): 略其形而存其神, 与齐白石"妙在似与不似之间"暗合.',
        ],
      },
      {
        title: '星河村夜图',
        masterpiece: true,
        artist: '梵高 (传)',
        dynasty: '瀛海西极',
        year: '约 1889 年',
        medium: '童趣摹本 · 油彩仿色',
        keeper: '美国纽约现代美术馆 (真迹)',
        caption: '泰西画师梵高《星夜》之童趣摹本——夜空旋涡如星河奔涌, 月亮含笑而下.',
        image: 'murals/xingye-q.png',
        viewpoints: [
          '画中漩涡星河——西人谓此乃梵高"目疾所见", 我观之像顾恺之画水时"以波纹勾起涟漪".',
          '左侧那株擎天巨柏, 浓黑如墨笔提按——可解作长安园林中"独柏冲天"的高古之气.',
          '画师梵高生前一画都未卖出去, 一生贫病潦倒, 三十七岁早殁——"生不逢时"的范本.',
          '此摹本将月亮画成憨笑童脸——"以稚趣化沉重"的另一种慈悲.',
        ],
      },
      {
        title: '波斯邸献画图',
        caption: '西市波斯邸胡商献画——驼背画卷千卷, 远自大秦、波斯、大食.',
        viewpoints: ['每年向画学馆献画千卷, 是大唐"万国来朝"在丹青上的写照.'],
      },
      {
        title: '童子笔奇画',
        caption: '凡画中人物头大身小、双瞳似珠、神态憨然者, 馆内皆归此"童子苑".',
        viewpoints: ['看似童子戏笔, 实则多藏巧思——西人取我朝"妙在似与不似之间"的另一种诠释.'],
      },
    ],
  },

  // DIY 区 — 把 atelier 用户作品也作为一个 "殿"
  diy: {
    title: '丹青閣 · 我的長安',
    subtitle: '用户上传 / AI 生成 / 语音生图 · 同步显示',
    accent: '#d4a554',
    isDiy: true,
    panels: [], // runtime 填充
  },
};

const GALLERY_ORDER = ['hanyuan', 'zichen', 'pagoda', 'qujiang', 'anma', 'wanguo', 'diy'];

let groupRef = null;
let openedId = null;

/* ────────────────────────────────────────────────────────
 * 3D 入口 prop —— "雲廊" (一座长方形带匾朱漆建筑)
 * 位于鸟瞰沙盘的北侧, 与丹青阁(东)、青铜钟(西) 三足鼎立
 * ──────────────────────────────────────────────────────── */
export function buildGalleryHall({ parent, registerClickable }) {
  const g = new THREE.Group();
  g.name = 'GalleryHall';
  g.userData.kind = 'gallery-hall';

  const b = worldBounds();
  const x = 0;
  const z = b.minZ - 90; // 朝北, 比沙盘北边再往后 90

  /* 1) 石基 */
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(120, 4, 32),
    new THREE.MeshLambertMaterial({ color: 0xb3a07a }),
  );
  base.position.set(x, 2, z);
  base.userData.kind = 'gallery-hall';
  g.add(base);

  /* 2) 八根朱漆立柱 */
  const POSTS = [-54, -36, -18, 0, 18, 36, 54];
  POSTS.forEach((dx, idx) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 36, 12),
      new THREE.MeshLambertMaterial({ color: 0xa8332f, emissive: 0x3a1010, emissiveIntensity: 0.22 }),
    );
    post.position.set(x + dx, 22, z);
    post.userData.kind = 'gallery-hall';
    g.add(post);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.5, 5),
      new THREE.MeshLambertMaterial({ color: 0xd4a554, emissive: 0x4a3210, emissiveIntensity: 0.35 }),
    );
    cap.position.set(x + dx, 41, z);
    g.add(cap);
  });

  /* 3) 重檐 (两层) */
  for (const [yOff, w, depth, color] of [
    [0,  120, 8, 0x8a3a26],
    [5,  126, 9, 0xd4a554],
    [10, 130, 10, 0x8a3a26],
    [22, 100, 7, 0x6a2a18],
  ]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(w, 2.5, depth),
      new THREE.MeshLambertMaterial({ color, emissive: 0x2a1008, emissiveIntensity: 0.18 }),
    );
    beam.position.set(x, 42 + yOff, z);
    beam.userData.kind = 'gallery-hall';
    g.add(beam);
  }

  /* 4) 屋顶歇山 (4 个三角) */
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a1f12 });
  const roofShape = new THREE.ConeGeometry(72, 14, 4, 1, false, Math.PI / 4);
  const roof = new THREE.Mesh(roofShape, roofMat);
  roof.position.set(x, 78, z);
  roof.scale.set(1.0, 1.0, 0.18);
  roof.userData.kind = 'gallery-hall';
  g.add(roof);

  /* 5) 大匾 — "雲 廊 · 唐 畫 藏 館" */
  const titleTex = makePlaqueTex('雲 廊', '唐 畫 藏 館 · 七 殿 一 苑');
  const titlePlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 12),
    new THREE.MeshBasicMaterial({ map: titleTex, transparent: true, depthWrite: false }),
  );
  titlePlaque.position.set(x, 56, z + 5.5);
  titlePlaque.userData.kind = 'gallery-hall';
  g.add(titlePlaque);

  /* 6) 7 幅迷你画框立在台基前 (作为视觉暗示) */
  const MINI_FRAMES = GALLERY_ORDER.length;
  for (let i = 0; i < MINI_FRAMES; i++) {
    const fx = x - 54 + (108 / (MINI_FRAMES - 1)) * i;
    const fz = z + 13;
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(1, 8, 1),
      new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),
    );
    stand.position.set(fx, 5, fz);
    g.add(stand);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(10, 7, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x4a3220 }),
    );
    frame.position.set(fx, 11, fz);
    frame.userData.kind = 'gallery-hall';
    frame.userData.galleryId = GALLERY_ORDER[i];
    g.add(frame);
    // 缩略图 (使用 plaque tex)
    const def = GALLERY_DATA[GALLERY_ORDER[i]];
    const miniTex = makeMiniPanelTex(def);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 6),
      new THREE.MeshBasicMaterial({ map: miniTex, transparent: false }),
    );
    panel.position.set(fx, 11, fz + 0.35);
    panel.userData.kind = 'gallery-hall';
    panel.userData.galleryId = GALLERY_ORDER[i];
    g.add(panel);
  }

  /* 7) 暖色 PointLight */
  const warm = new THREE.PointLight(0xf2d68b, 1.6, 160, 1.4);
  warm.position.set(x, 50, z + 25);
  g.add(warm);

  /* 8) 鸟瞰头牌 sprite */
  const head = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeBigHeadTex('🏛 雲廊 · 唐画藏馆', '点入 · 七殿一苑 · 苏阮卿讲解'), transparent: true, depthTest: false }),
  );
  head.position.set(x, 100, z);
  head.scale.set(82, 18, 1);
  head.renderOrder = 999;
  head.userData.kind = 'gallery-hall';
  g.add(head);

  /* 9) 召唤光圈 */
  const beacon = new THREE.Mesh(
    new THREE.RingGeometry(8, 50, 36),
    new THREE.MeshBasicMaterial({ color: 0xf2d68b, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.rotation.x = -Math.PI / 2;
  beacon.position.set(x, 4.2, z);
  g.add(beacon);

  registerClickable(g, { id: 'gallery-hall' });
  parent.add(g);
  groupRef = g;
  return { group: g };
}

/* ────────────────────────────────────────────────────────
 * HTML overlay (隐藏式, 第一次 open 时 install)
 * ──────────────────────────────────────────────────────── */
function installOverlay() {
  if (document.getElementById('gallery-hall-overlay')) return;

  const wrap = document.createElement('div');
  wrap.id = 'gallery-hall-overlay';
  wrap.style.cssText = `
    position:fixed; inset:0; z-index:99996; display:none;
    background:radial-gradient(circle at center, rgba(20,12,6,.92), rgba(0,0,0,.98));
    backdrop-filter:blur(10px);
    color:#f5d68b; font-family:"Noto Serif SC","Songti SC",serif;
    overflow:auto;
  `;
  const style = document.createElement('style');
  style.textContent = `
    #gallery-hall-overlay { animation: gh-fade .35s ease; }
    @keyframes gh-fade { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
    #gallery-hall-overlay .gh-bar {
      position:sticky; top:0; padding:16px 24px; z-index:3;
      display:flex; align-items:center; gap:18px; justify-content:space-between;
      background:linear-gradient(180deg,rgba(20,12,6,.96),rgba(20,12,6,.7));
      border-bottom:1px solid #4a3624;
    }
    #gallery-hall-overlay .gh-title {
      font-size:26px; font-weight:600; letter-spacing:.22em;
      text-shadow:0 0 24px rgba(212,165,84,.4);
    }
    #gallery-hall-overlay .gh-sub { color:#9a8060; font-size:12px; letter-spacing:.25em; margin-top:2px; }
    #gallery-hall-overlay .gh-actions { display:flex; gap:10px; align-items:center; }
    #gallery-hall-overlay .gh-act {
      padding:9px 16px; border:1.5px solid #d4a554; border-radius:24px;
      background:linear-gradient(180deg,#3a2418,#1a0e08); color:#f5d68b;
      font-family:inherit; font-size:13px; letter-spacing:.1em; cursor:pointer;
      transition:transform .15s, box-shadow .15s, border-color .15s;
    }
    #gallery-hall-overlay .gh-act:hover { transform:translateY(-1px); border-color:#f5d68b; box-shadow:0 6px 18px rgba(0,0,0,.55); }
    #gallery-hall-overlay .gh-close {
      width:42px; height:42px; border-radius:50%;
      border:1.5px solid #d4a554; background:#2a1a10;
      color:#f5d68b; font-size:22px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:transform .15s, background .15s;
    }
    #gallery-hall-overlay .gh-close:hover { transform:rotate(90deg); background:#3a2018; }

    /* 选项卡 */
    #gallery-hall-overlay .gh-tabs {
      display:flex; gap:8px; padding:18px 24px 0 24px;
      flex-wrap:wrap;
      max-width:1400px; margin:0 auto;
    }
    #gallery-hall-overlay .gh-tab {
      padding:10px 18px; border:1px solid #4a3624; border-radius:8px;
      background:#1a0e08; color:#9a8060; font-family:inherit; font-size:13px;
      letter-spacing:.1em; cursor:pointer; transition:all .18s;
    }
    #gallery-hall-overlay .gh-tab:hover { color:#f5d68b; border-color:#d4a554; }
    #gallery-hall-overlay .gh-tab.active {
      background:linear-gradient(180deg,#5a3624,#2a1a10);
      border-color:#d4a554; color:#f5d68b;
      box-shadow:0 4px 12px rgba(0,0,0,.45), 0 0 0 1px rgba(212,165,84,.4);
    }
    #gallery-hall-overlay .gh-section-head {
      max-width:1400px; margin:18px auto 0;
      padding:18px 24px; border-bottom:1px solid #4a3624;
    }
    #gallery-hall-overlay .gh-shead-title { font-size:24px; letter-spacing:.16em; color:#f5d68b; }
    #gallery-hall-overlay .gh-shead-sub { color:#c5a878; font-size:13px; letter-spacing:.16em; margin-top:6px; }

    #gallery-hall-overlay .gh-grid {
      display:grid; gap:22px;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      padding:22px 24px 60px;
      max-width:1400px; margin:0 auto;
    }
    #gallery-hall-overlay .gh-card {
      background:linear-gradient(180deg,#22140cee,#0e0805ee);
      border:1.5px solid #4a3624; border-radius:10px;
      overflow:hidden; cursor:pointer;
      transition:transform .2s, box-shadow .2s, border-color .2s;
      position:relative;
    }
    #gallery-hall-overlay .gh-card:hover {
      transform:translateY(-4px);
      border-color:#d4a554;
      box-shadow:0 18px 36px rgba(0,0,0,.7), 0 0 0 1px rgba(212,165,84,.3);
    }
    #gallery-hall-overlay .gh-card .gh-img {
      width:100%; aspect-ratio:4/3; object-fit:cover; display:block;
      background:linear-gradient(135deg,#3a2418,#1a0e08);
    }
    #gallery-hall-overlay .gh-card .gh-meta { padding:12px 14px 14px; }
    #gallery-hall-overlay .gh-card .gh-mt { font-size:15px; color:#f5d68b; font-weight:600; letter-spacing:.05em; }
    #gallery-hall-overlay .gh-card .gh-msub { color:#9a8060; font-size:11px; letter-spacing:.12em; margin-top:4px; }
    #gallery-hall-overlay .gh-card .gh-mcap { color:#c5a878; font-size:12px; line-height:1.5; margin-top:8px;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    #gallery-hall-overlay .gh-card .gh-masterpiece {
      position:absolute; top:8px; right:8px; padding:3px 8px;
      background:linear-gradient(180deg,#a8332f,#6a1d18);
      color:#f5d68b; font-size:10px; letter-spacing:.16em;
      border-radius:4px; border:1px solid #d4a554;
      box-shadow:0 4px 10px rgba(0,0,0,.5);
    }

    /* lightbox */
    #gallery-hall-overlay .gh-lightbox {
      position:fixed; inset:0; z-index:5; display:none;
      background:rgba(0,0,0,.92); backdrop-filter:blur(12px);
      overflow:auto; padding:40px 20px;
    }
    #gallery-hall-overlay .gh-lightbox.show { display:block; }
    #gallery-hall-overlay .gh-lb-inner {
      max-width:1100px; margin:0 auto;
      background:linear-gradient(180deg,#22140cee,#0e0805ee);
      border:1.5px solid #4a3624; border-radius:14px;
      overflow:hidden;
      box-shadow:0 24px 60px rgba(0,0,0,.7);
    }
    #gallery-hall-overlay .gh-lb-img {
      width:100%; max-height:60vh; object-fit:contain; background:#0e0805;
      display:block;
    }
    #gallery-hall-overlay .gh-lb-img.placeholder {
      aspect-ratio:16/9; max-height:none;
      background:repeating-linear-gradient(135deg,#2a1a10,#2a1a10 8px,#22140c 8px,#22140c 16px);
      display:flex; align-items:center; justify-content:center;
      color:#5a3a22; font-size:36px; letter-spacing:.3em;
    }
    #gallery-hall-overlay .gh-lb-body { padding:22px 28px; }
    #gallery-hall-overlay .gh-lb-title { font-size:28px; color:#f5d68b; letter-spacing:.08em; font-weight:600; }
    #gallery-hall-overlay .gh-lb-meta { color:#c5a878; font-size:13px; letter-spacing:.12em; margin-top:6px; }
    #gallery-hall-overlay .gh-lb-cap { color:#e0c898; font-size:15px; line-height:1.7; margin:14px 0 4px; }
    #gallery-hall-overlay .gh-lb-vps {
      list-style:none; padding:0; margin:14px 0 0;
      display:grid; gap:8px;
    }
    #gallery-hall-overlay .gh-lb-vps li {
      padding:10px 14px;
      background:#1a0e08; border-left:3px solid #d4a554; border-radius:4px;
      color:#c5a878; font-size:13px; line-height:1.6;
    }
    #gallery-hall-overlay .gh-lb-actions {
      display:flex; gap:10px; padding:16px 28px 24px; flex-wrap:wrap;
      border-top:1px solid #4a3624;
    }
    #gallery-hall-overlay .gh-lb-close {
      position:absolute; top:18px; right:24px;
      width:42px; height:42px; border-radius:50%;
      border:1.5px solid #d4a554; background:#2a1a10;
      color:#f5d68b; font-size:22px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      z-index:6;
    }
    #gallery-hall-overlay .gh-lb-close:hover { transform:rotate(90deg); }

    #gallery-hall-overlay .gh-empty {
      grid-column: 1 / -1;
      padding:60px 24px; text-align:center;
      color:#5a3a22; font-size:14px; letter-spacing:.16em;
    }
  `;
  document.head.appendChild(style);

  wrap.innerHTML = `
    <div class="gh-bar">
      <div>
        <div class="gh-title">雲 廊 · 唐 畫 藏 館</div>
        <div class="gh-sub">SEVEN HALLS · 28 PAINTINGS · ONE GUIDE 苏阮卿</div>
      </div>
      <div class="gh-actions">
        <button class="gh-act" id="gh-voice-btn" type="button">🔔 召喚 苏阮卿 講解</button>
        <button class="gh-close" id="gh-close" type="button" aria-label="关闭">×</button>
      </div>
    </div>
    <div class="gh-tabs" id="gh-tabs"></div>
    <div class="gh-section-head">
      <div class="gh-shead-title" id="gh-shead-title">含元殿 · 万邦来朝</div>
      <div class="gh-shead-sub" id="gh-shead-sub">丹凤门内 · 大明宫之始 · 异邦朝贺地</div>
    </div>
    <div class="gh-grid" id="gh-grid"></div>

    <div class="gh-lightbox" id="gh-lightbox">
      <button class="gh-lb-close" id="gh-lb-close" type="button">×</button>
      <div class="gh-lb-inner" id="gh-lb-inner"></div>
    </div>
  `;
  document.body.appendChild(wrap);

  // 选项卡
  const tabsRoot = wrap.querySelector('#gh-tabs');
  GALLERY_ORDER.forEach((id) => {
    const def = GALLERY_DATA[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gh-tab' + (id === 'hanyuan' ? ' active' : '');
    btn.dataset.id = id;
    btn.textContent = def.title.split('·')[0].trim();
    btn.onclick = () => selectGallery(id);
    tabsRoot.appendChild(btn);
  });

  wrap.querySelector('#gh-close').onclick = closeGalleryHall;
  wrap.querySelector('#gh-lb-close').onclick = () => {
    wrap.querySelector('#gh-lightbox').classList.remove('show');
  };

  wrap.querySelector('#gh-voice-btn').onclick = () => {
    if (typeof window.openVoicePanel === 'function') {
      window.openVoicePanel({
        userData: {
          personaId: 'docent',
          displayName: '苏阮卿 · 画学博士',
          subtitle: '雲廊七殿 · 我为你逐一解画',
        },
      });
    }
  };

  // Esc 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const lb = wrap.querySelector('#gh-lightbox');
    if (lb && lb.classList.contains('show')) {
      lb.classList.remove('show');
      e.stopPropagation();
      return;
    }
    if (wrap.style.display !== 'none') {
      closeGalleryHall();
      e.stopPropagation();
    }
  }, true);
}

function selectGallery(id) {
  openedId = id;
  const overlay = document.getElementById('gallery-hall-overlay');
  if (!overlay) return;
  overlay.querySelectorAll('.gh-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.id === id);
  });
  const def = GALLERY_DATA[id];
  overlay.querySelector('#gh-shead-title').textContent = def.title;
  overlay.querySelector('#gh-shead-sub').textContent = def.subtitle;

  const grid = overlay.querySelector('#gh-grid');
  grid.innerHTML = '';

  let panels = def.panels;
  if (def.isDiy) {
    panels = loadDiyPanels();
  }
  if (!panels.length) {
    grid.innerHTML = `<div class="gh-empty">— 此苑暂无藏品 · 去丹青閣自寫一幅 —</div>`;
    return;
  }
  panels.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'gh-card';
    const imgHtml = p.image
      ? `<img class="gh-img" src="${p.image}" alt="${p.title}" onerror="this.style.opacity=0">`
      : `<div class="gh-img"></div>`;
    card.innerHTML = `
      ${imgHtml}
      ${p.masterpiece ? '<div class="gh-masterpiece">真 迹</div>' : ''}
      <div class="gh-meta">
        <div class="gh-mt">${p.title}</div>
        ${p.artist ? `<div class="gh-msub">${[p.artist, p.dynasty, p.year].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="gh-mcap">${p.caption || ''}</div>
      </div>
    `;
    card.onclick = () => openLightbox(p);
    grid.appendChild(card);
  });
}

function openLightbox(p) {
  const wrap = document.getElementById('gallery-hall-overlay');
  if (!wrap) return;
  const lb = wrap.querySelector('#gh-lightbox');
  const inner = wrap.querySelector('#gh-lb-inner');
  const imgHtml = p.image
    ? `<img class="gh-lb-img" src="${p.image}" alt="${p.title}" onerror="this.outerHTML='<div class=&quot;gh-lb-img placeholder&quot;>畫卷意象 · 待繪</div>'">`
    : `<div class="gh-lb-img placeholder">畫卷意象 · 待繪</div>`;
  const meta = [p.artist, p.dynasty, p.year, p.medium, p.keeper].filter(Boolean).join(' · ');
  const vps = (p.viewpoints || []).map((v) => `<li>${v}</li>`).join('');
  inner.innerHTML = `
    ${imgHtml}
    <div class="gh-lb-body">
      <div class="gh-lb-title">${p.masterpiece ? '【真迹】 ' : ''}${p.title}</div>
      ${meta ? `<div class="gh-lb-meta">${meta}</div>` : ''}
      <div class="gh-lb-cap">${p.caption || ''}</div>
      ${vps ? `<ul class="gh-lb-vps">${vps}</ul>` : ''}
    </div>
    <div class="gh-lb-actions">
      <button class="gh-act" id="gh-lb-voice" type="button">🔔 召喚 苏阮卿 講此畫</button>
      ${p.prompt ? `<button class="gh-act" id="gh-lb-copy-prompt" type="button">📝 复制 prompt</button>` : ''}
    </div>
  `;
  lb.classList.add('show');

  wrap.querySelector('#gh-lb-voice').onclick = () => {
    if (typeof window.openVoicePanel === 'function') {
      window.openVoicePanel({
        userData: {
          personaId: 'docent',
          displayName: '苏阮卿 · 画学博士',
          subtitle: `《${p.title}》——讲此画`,
          briefHint: p.voice_brief || p.caption,
        },
      });
    }
  };
  if (p.prompt) {
    const btn = wrap.querySelector('#gh-lb-copy-prompt');
    if (btn) btn.onclick = () => navigator.clipboard?.writeText(p.prompt);
  }
}

function loadDiyPanels() {
  try {
    const list = JSON.parse(localStorage.getItem('han.atelier.artworks.v1') || '[]');
    return list.map((a) => ({
      title: a.title || '無題',
      caption: a.prompt
        ? `${a.mode === 'ai' ? 'AI 提筆' : a.mode === 'voice' ? '语音生图' : '我上傳'} · ${a.prompt}`
        : (a.mode === 'upload' ? '本地上传' : 'AI 生成'),
      image: a.src,
      artist: '訪客 · 我',
      dynasty: a.mode === 'ai' ? 'AI 提筆' : a.mode === 'voice' ? '语音生图' : '我上傳',
      year: a.date ? a.date.slice(0, 10) : '',
      prompt: a.prompt,
      viewpoints: a.prompt ? [`提示词: ${a.prompt}`] : [],
    }));
  } catch (e) {
    return [];
  }
}

/* ─── 公开 API ─── */

export function openGalleryHall(opts = {}) {
  installOverlay();
  const wrap = document.getElementById('gallery-hall-overlay');
  if (!wrap) return;
  wrap.style.display = 'block';
  const target = opts.galleryId && GALLERY_DATA[opts.galleryId] ? opts.galleryId : (openedId || 'hanyuan');
  selectGallery(target);
}

export function closeGalleryHall() {
  const wrap = document.getElementById('gallery-hall-overlay');
  if (wrap) wrap.style.display = 'none';
  const lb = wrap?.querySelector('#gh-lightbox');
  if (lb) lb.classList.remove('show');
}

/* ─── helpers ─── */

function makeBigHeadTex(headline, sub) {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(60,30,16,.95)');
  grad.addColorStop(1, 'rgba(20,10,6,.95)');
  ctx.fillStyle = grad;
  const r = 32;
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
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 92px "Noto Serif SC","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#f5d68b'; ctx.shadowBlur = 22;
  ctx.fillText(headline, c.width / 2, 96);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c5a878';
  ctx.font = '40px "Noto Serif SC",serif';
  ctx.fillText(sub, c.width / 2, 184);
  return new THREE.CanvasTexture(c);
}

function makePlaqueTex(text, sub) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 320;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#5a2018');
  grad.addColorStop(1, '#1a0810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, c.width - 28, c.height - 28);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 120px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 - 32);
  if (sub) {
    ctx.font = '32px "Noto Serif SC", serif';
    ctx.fillStyle = '#c5a878';
    ctx.fillText(sub, c.width / 2, c.height / 2 + 72);
  }
  return new THREE.CanvasTexture(c);
}

function makeMiniPanelTex(def) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 176;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, def.accent || '#5a2018');
  grad.addColorStop(1, '#1a0810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d4a554';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 36px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const t = def.title.split('·')[0].trim();
  ctx.fillText(t, c.width / 2, c.height / 2 - 6);
  ctx.font = '14px "Noto Serif SC", serif';
  ctx.fillStyle = '#c5a878';
  const cnt = (def.panels || []).length;
  ctx.fillText(`${cnt || '∞'} 幅`, c.width / 2, c.height / 2 + 36);
  return new THREE.CanvasTexture(c);
}
