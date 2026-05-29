/**
 * Polaroid · 拍立得 — canvas 截图 + 日期戳 + 浮层抽屉
 *
 * 调 snapPolaroid() 即可:
 *   1. 截当前 Three.js canvas (preserveDrawingBuffer 需要 true; 见 bootstrap)
 *   2. 合成拍立得风: 白边 + 底部日期/印章
 *   3. 浮到左下角 "拍立得抽屉" + 持久存到 localStorage
 *   4. 点 polaroid → 全屏放大 / 下载
 *
 * 公开:
 *   snapPolaroid()       — 拍一张
 *   showPolaroidDrawer() — 打开抽屉
 *   hidePolaroidDrawer() — 收起
 *   listPolaroids()
 */

const STORAGE_KEY = 'han.polaroids.v1';
const MAX_KEEP = 20;

let polaroids = loadPolaroids();
let drawerEl = null;

function loadPolaroids() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (e) { return []; }
}
function savePolaroids() {
  try {
    // 避免单条太大, 限长
    localStorage.setItem(STORAGE_KEY, JSON.stringify(polaroids.slice(0, MAX_KEEP)));
  } catch (e) {
    console.warn('[Polaroid] quota exceeded, dropping oldest', e);
    polaroids = polaroids.slice(0, 10);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(polaroids)); } catch (_) {}
  }
}

/* ─── 主操作 ─── */
export async function snapPolaroid(opts = {}) {
  installDrawerDom();
  const canvas = findRenderCanvas();
  if (!canvas) {
    console.warn('[Polaroid] no canvas found');
    return null;
  }

  /* 尝试 toDataURL — Three.js 渲染器需要 preserveDrawingBuffer:true */
  let snapshot;
  try {
    snapshot = canvas.toDataURL('image/png');
  } catch (e) {
    console.error('[Polaroid] toDataURL failed (probably preserveDrawingBuffer=false)', e);
    // 退路 - 取 video frame? 暂时用空 fallback
    snapshot = makeFallbackSnap();
  }

  /* 合成拍立得 */
  const polaroidImg = await composePolaroid(snapshot, opts);

  const entry = {
    id: 'p-' + Date.now(),
    src: polaroidImg,
    timestamp: Date.now(),
    label: opts.label || '長安遊',
  };
  polaroids = [entry, ...polaroids].slice(0, MAX_KEEP);
  savePolaroids();
  renderDrawer();
  // 自动闪一下抽屉
  showPolaroidDrawer();
  flashLatest(entry.id);

  return entry;
}

function findRenderCanvas() {
  // 优先 #scene > canvas, 再回退第一个非 hidden canvas
  const sceneEl = document.getElementById('scene');
  let cv = sceneEl?.querySelector?.('canvas');
  if (cv) return cv;
  cv = document.querySelector('canvas');
  return cv || null;
}

function makeFallbackSnap() {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 450;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#d4a554';
  ctx.font = 'bold 24px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('截图待恢复', c.width / 2, c.height / 2);
  return c.toDataURL('image/png');
}

async function composePolaroid(snapDataUrl, opts) {
  const img = await loadImg(snapDataUrl);

  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 720;
  const ctx = c.getContext('2d');

  // 拍立得纸底 (轻微米黄)
  const paperGrad = ctx.createLinearGradient(0, 0, 0, c.height);
  paperGrad.addColorStop(0, '#fffaf0');
  paperGrad.addColorStop(1, '#f4eed8');
  ctx.fillStyle = paperGrad;
  ctx.fillRect(0, 0, c.width, c.height);

  // 阴影 (内描)
  ctx.shadowColor = 'rgba(0,0,0,.15)';
  ctx.shadowBlur = 8;

  // 照片区 — 顶部白边 36, 左右白边 36, 底部留 168 给文字
  const px = 36, py = 36, pw = c.width - 72, ph = c.height - 36 - 168;
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);
  ctx.shadowBlur = 0;

  // 把截图按 cover 画
  const ar = img.width / img.height;
  const phAr = pw / ph;
  let dw, dh, dx, dy;
  if (ar > phAr) {
    dh = ph;
    dw = ph * ar;
    dx = px - (dw - pw) / 2;
    dy = py;
  } else {
    dw = pw;
    dh = pw / ar;
    dx = px;
    dy = py - (dh - ph) / 2;
  }
  // 裁剪到照片区
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // 颗粒 (复古风)
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = i % 2 ? '#fff' : '#000';
    ctx.fillRect(px + Math.random() * pw, py + Math.random() * ph, 1, 1);
  }
  ctx.globalAlpha = 1;

  // 标签 (手写感)
  const dateStr = formatDate(new Date());
  const label = (opts.label || '長安遊').slice(0, 14);
  ctx.fillStyle = '#3a2418';
  ctx.font = 'italic 36px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, 44, c.height - 110);

  ctx.fillStyle = '#a8332f';
  ctx.font = 'bold 18px "Noto Serif SC", serif';
  ctx.fillText('· 大唐長安 三维舆图 ·', 46, c.height - 80);

  ctx.fillStyle = '#7a5a3a';
  ctx.font = '20px "JetBrains Mono", "SF Mono", monospace';
  ctx.fillText(dateStr, 44, c.height - 46);

  // 朱印 (右下)
  ctx.fillStyle = '#a8332f';
  ctx.fillRect(c.width - 96, c.height - 100, 60, 60);
  ctx.fillStyle = '#f5d68b';
  ctx.font = 'bold 22px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('長', c.width - 66, c.height - 76);
  ctx.fillText('安', c.width - 66, c.height - 52);

  // 顶部角孔 (拍立得味儿)
  ctx.fillStyle = '#eee';
  ctx.beginPath();
  ctx.arc(c.width / 2, 18, 5, 0, Math.PI * 2);
  ctx.fill();

  return c.toDataURL('image/png');
}

function formatDate(d) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}.${M}.${D} · ${h}:${m}`;
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/* ─── 抽屉 UI ─── */
function installDrawerDom() {
  if (document.getElementById('polaroid-drawer')) return;
  const wrap = document.createElement('div');
  wrap.id = 'polaroid-drawer';
  wrap.style.cssText = `
    position:fixed; left:16px; bottom:16px; z-index:99994;
    display:flex; flex-direction:column; align-items:flex-start; gap:8px;
    pointer-events:none;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pol-pop {
      from { transform:scale(.4) rotate(-12deg); opacity:0; }
      to   { transform:scale(1) rotate(-2deg); opacity:1; }
    }
    #polaroid-drawer .pol-stack {
      display:flex; flex-direction:row; gap:-30px;
      align-items:flex-end;
      pointer-events:auto;
    }
    #polaroid-drawer .pol-toggle {
      pointer-events:auto;
      background:rgba(20,12,6,.92); border:1.5px solid #d4a554;
      border-radius:24px;
      color:#f5d68b;
      padding:8px 16px; font-size:12px; letter-spacing:.18em;
      font-family:"Noto Serif SC",serif;
      cursor:pointer;
      transition:transform .15s, box-shadow .15s;
      box-shadow:0 6px 18px rgba(0,0,0,.5);
    }
    #polaroid-drawer .pol-toggle:hover { transform:translateY(-1px); border-color:#f5d68b; }
    #polaroid-drawer .pol-card {
      width:130px;
      cursor:pointer;
      transform-origin:bottom center;
      margin-right:-28px;
      filter:drop-shadow(0 8px 12px rgba(0,0,0,.6));
      transition:transform .25s ease, margin .25s ease;
      animation:pol-pop .45s cubic-bezier(.32,1.3,.55,1);
    }
    #polaroid-drawer .pol-card:hover {
      transform:scale(1.15) translateY(-12px) rotate(0deg) !important;
      z-index:5;
      margin-right:8px;
    }
    #polaroid-drawer .pol-card img {
      width:100%; display:block; border-radius:2px;
    }
    #polaroid-drawer .pol-card.flash {
      animation:pol-pop .55s cubic-bezier(.32,1.3,.55,1), pol-flash 1.2s ease;
    }
    @keyframes pol-flash {
      0%, 100% { filter:drop-shadow(0 8px 12px rgba(0,0,0,.6)); }
      40%      { filter:drop-shadow(0 0 40px rgba(245,214,139,.85)); }
    }

    #polaroid-lightbox {
      position:fixed; inset:0; z-index:99999; display:none;
      background:rgba(0,0,0,.92); align-items:center; justify-content:center;
      flex-direction:column; gap:14px;
      backdrop-filter:blur(8px);
    }
    #polaroid-lightbox.show { display:flex; }
    #polaroid-lightbox img {
      max-width:70vw; max-height:80vh;
      box-shadow:0 24px 60px rgba(0,0,0,.85);
    }
    #polaroid-lightbox .pl-actions {
      display:flex; gap:14px;
    }
    #polaroid-lightbox button {
      padding:10px 24px; border:1.5px solid #d4a554; border-radius:8px;
      background:#2a1a10; color:#f5d68b; cursor:pointer;
      font-family:"Noto Serif SC",serif; font-size:14px; letter-spacing:.12em;
    }
    #polaroid-lightbox button:hover { background:#3a2418; }
  `;
  document.head.appendChild(style);

  wrap.innerHTML = `
    <div class="pol-toggle" id="polaroid-toggle">📸 拍立得 · <span id="polaroid-count">0</span></div>
    <div class="pol-stack" id="polaroid-stack"></div>
  `;
  document.body.appendChild(wrap);
  drawerEl = wrap;

  document.getElementById('polaroid-toggle').onclick = togglePolaroidDrawer;

  // lightbox
  const lb = document.createElement('div');
  lb.id = 'polaroid-lightbox';
  lb.innerHTML = `
    <img id="polaroid-lightbox-img" alt="">
    <div class="pl-actions">
      <button id="polaroid-download">⬇ 下載</button>
      <button id="polaroid-close">關閉 (Esc)</button>
    </div>
  `;
  document.body.appendChild(lb);
  document.getElementById('polaroid-close').onclick = closeLightbox;
  document.getElementById('polaroid-download').onclick = () => {
    const img = document.getElementById('polaroid-lightbox-img');
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `changan-polaroid-${Date.now()}.png`;
    a.click();
  };
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('show')) {
      e.stopPropagation();
      closeLightbox();
    }
  }, true);

  renderDrawer();
}

function renderDrawer() {
  if (!drawerEl) return;
  const stack = document.getElementById('polaroid-stack');
  const count = document.getElementById('polaroid-count');
  if (count) count.textContent = String(polaroids.length);
  if (!stack) return;
  stack.innerHTML = '';
  // 显示最近 5 张
  polaroids.slice(0, 5).forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'pol-card';
    card.dataset.id = p.id;
    card.style.transform = `rotate(${(i % 2 ? 1 : -1) * (2 + i * 1.5)}deg)`;
    card.innerHTML = `<img src="${p.src}" alt="">`;
    card.onclick = () => openLightbox(p);
    stack.appendChild(card);
  });
}

function flashLatest(id) {
  setTimeout(() => {
    const el = drawerEl?.querySelector?.(`.pol-card[data-id="${id}"]`);
    if (el) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1200);
    }
  }, 40);
}

function openLightbox(p) {
  const lb = document.getElementById('polaroid-lightbox');
  const img = document.getElementById('polaroid-lightbox-img');
  if (lb && img) { img.src = p.src; lb.classList.add('show'); }
}
function closeLightbox() {
  const lb = document.getElementById('polaroid-lightbox');
  if (lb) lb.classList.remove('show');
}

export function showPolaroidDrawer() {
  installDrawerDom();
  if (drawerEl) drawerEl.style.display = 'flex';
}
export function hidePolaroidDrawer() {
  if (drawerEl) drawerEl.style.display = 'none';
}
export function togglePolaroidDrawer() {
  if (!drawerEl) installDrawerDom();
  const stack = document.getElementById('polaroid-stack');
  if (!stack) return;
  stack.style.display = (stack.style.display === 'none') ? '' : 'none';
}
export function listPolaroids() { return polaroids.slice(); }
