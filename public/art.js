/* =============================================================
   苍岚战纪 · 画面（art.js）
   在 game.js 之后加载，把里面画东西的函数换成更精细的版本。
   不用任何图片：地面贴图、树、人物、怪物、特效全部用代码画。
   游戏逻辑一行都不改；删掉这个文件就回到原来的画面。
   ============================================================= */

/* ---------- 小工具 ---------- */
const OL = 'rgba(25,15,10,.85)'; // 描边色
function aEll(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
function aRR(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function aCirc(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
// 颜色变亮（f>0）或变暗（f<0）
const _shadeCache = {};
function shade(hex, f) {
  const key = hex + f;
  if (_shadeCache[key]) return _shadeCache[key];
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return (_shadeCache[key] = `rgb(${r | 0},${g | 0},${b | 0})`);
}
function vgrad(y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
function seededRnd(seed) { let s = seed % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
// 影子：比原来的更柔和
shadow = function (x, y, r) { ctx.fillStyle = 'rgba(15,22,8,.3)'; aEll(x, y, r, r * 0.36); ctx.fill(); };

/* ---------- 名字和飘字：更粗的字，带描边 ---------- */
const ART_FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
label = function (text, x, y, color, size) {
  ctx.font = `bold ${Math.round((size || 13) * 1.2)}px ${ART_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.78)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color || '#fff'; ctx.fillText(text, x, y);
};

/* =============================================================
   地面贴图：每张地图按主题生成一块 256×256 的贴图，平铺
   ============================================================= */
const ART = { tiles: {}, parts: [], lastT: 0, clouds: null, dirt: null, cobble: null };
function makeTile(theme, bg, tuft, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), R = seededRnd(seed);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  const wrap = (fn) => { for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
  // 深浅斑块（所有主题都有，让地面不死板）
  for (let i = 0; i < 60; i++) {
    const x = R() * 256, y = R() * 256, r = 14 + R() * 34, dark = R() < 0.5;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, dark ? 'rgba(0,0,0,.13)' : 'rgba(255,255,255,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  }
  const grassy = !theme || theme === 'forest' || theme === 'swamp';
  if (grassy) {
    for (let i = 0; i < 900; i++) {
      const x = R() * 256, y = R() * 256, h = 3 + R() * 5, lean = (R() - 0.5) * 3;
      g.strokeStyle = R() < 0.55 ? 'rgba(20,50,10,.35)' : 'rgba(210,255,160,.22)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + lean, y - h); g.stroke();
    }
    g.fillStyle = tuft; for (let i = 0; i < 40; i++) { const x = R() * 256, y = R() * 256; g.fillRect(x, y, 2, 6); g.fillRect(x + 3, y + 2, 2, 4); }
    if (theme !== 'swamp') for (let i = 0; i < 14; i++) {
      const x = R() * 256, y = R() * 256, col = ['#fff6d8', '#ffe36a', '#f6a6c8', '#c8b4ff'][Math.floor(R() * 4)];
      for (let k = 0; k < 5; k++) { g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 1.8, y + Math.sin(k * 1.26) * 1.8, 1.3, 0, 7); g.fill(); }
      g.fillStyle = '#e8a02a'; g.beginPath(); g.arc(x, y, 0.9, 0, 7); g.fill();
    } else for (let i = 0; i < 10; i++) { const x = R() * 256, y = R() * 256; g.fillStyle = 'rgba(30,50,35,.45)'; g.beginPath(); g.ellipse(x, y, 10 + R() * 14, 4 + R() * 5, 0, 0, 7); g.fill(); }
  } else if (theme === 'desert') {
    g.strokeStyle = 'rgba(120,80,30,.18)'; g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) { const y = R() * 256, x = R() * 256; g.beginPath(); g.moveTo(x - 40, y); g.quadraticCurveTo(x, y - 6, x + 40, y); g.stroke(); }
    for (let i = 0; i < 160; i++) { g.fillStyle = R() < 0.5 ? 'rgba(120,80,40,.3)' : 'rgba(255,240,200,.3)'; g.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2); }
  } else if (theme === 'snow') {
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(120,150,190,.12)'; g.beginPath(); g.ellipse(R() * 256, R() * 256, 12 + R() * 22, 4 + R() * 7, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(R() * 256, R() * 256, 1.2, 1.2); }
  } else {
    // 石头地：洞穴、火山、深渊、魔殿
    const crack = theme === 'volcano' ? 'rgba(255,110,30,.55)' : theme === 'chaos' ? 'rgba(255,50,70,.35)' : theme === 'abyss' ? 'rgba(170,90,255,.3)' : 'rgba(0,0,0,.28)';
    // 石板缝
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    for (let i = 0; i < 18; i++) { const x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 30); g.stroke(); }
    for (let i = 0; i < 90; i++) { const x = R() * 256, y = R() * 256, r = 1 + R() * 3.5; g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, 7); g.fill(); }
    g.strokeStyle = crack; g.lineWidth = theme === 'volcano' ? 1.8 : 1.2;
    for (let i = 0; i < (theme === 'cave' ? 6 : 9); i++) {
      let x = R() * 256, y = R() * 256; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * 30; y += (R() - 0.3) * 20; g.lineTo(x, y); }
      g.stroke();
    }
    if (theme === 'abyss' || theme === 'chaos') for (let i = 0; i < 24; i++) { g.fillStyle = theme === 'abyss' ? 'rgba(200,150,255,.6)' : 'rgba(255,120,120,.5)'; g.fillRect(R() * 256, R() * 256, 1.4, 1.4); }
  }
  return ctx.createPattern(c, 'repeat');
}
function tileFor(zid) {
  if (ART.tiles[zid]) return ART.tiles[zid];
  const z = ZONES[zid];
  return (ART.tiles[zid] = makeTile(z.theme, z.bg, z.tuft, strHash(zid) || 7));
}
function dirtPattern() {
  if (ART.dirt) return ART.dirt;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), R = seededRnd(42);
  g.fillStyle = '#b39466'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { g.fillStyle = R() < 0.5 ? 'rgba(120,92,56,.45)' : 'rgba(210,186,140,.45)'; g.fillRect(R() * 128, R() * 128, 1 + R() * 3, 1 + R() * 2); }
  for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(100,80,55,.5)'; g.beginPath(); g.ellipse(R() * 128, R() * 128, 1.5 + R() * 2.5, 1 + R() * 1.5, 0, 0, 7); g.fill(); }
  return (ART.dirt = ctx.createPattern(c, 'repeat'));
}
function cobblePattern() {
  if (ART.cobble) return ART.cobble;
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'), R = seededRnd(77);
  g.fillStyle = '#8f8676'; g.fillRect(0, 0, 96, 96);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    const x = col * 16 + (row % 2) * 8, y = row * 16;
    const v = 150 + Math.floor(R() * 40);
    g.fillStyle = `rgb(${v},${v - 8},${v - 22})`;
    g.beginPath(); g.ellipse(x + 8, y + 8, 7, 6.2, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x + 6, y + 6, 3.5, 2.5, 0, 0, 7); g.fill();
  }
  return (ART.cobble = ctx.createPattern(c, 'repeat'));
}

/* =============================================================
   树、石头、灌木、各主题装饰
   ============================================================= */
drawTree = function (x, y, s, theme, v) {
  if (theme === 'desert') { // 仙人掌
    shadow(x + 4, y + 3, 18 * s);
    const g = ctx.createLinearGradient(x - 8 * s, 0, x + 8 * s, 0); g.addColorStop(0, '#7cc06a'); g.addColorStop(1, '#3d7a3a');
    ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1.4;
    aRR(x - 7 * s, y - 50 * s, 14 * s, 52 * s, 7 * s); ctx.fill(); ctx.stroke();
    aRR(x - 21 * s, y - 36 * s, 9 * s, 20 * s, 4.5 * s); ctx.fill(); ctx.stroke(); aRR(x - 21 * s, y - 20 * s, 16 * s, 7 * s, 3.5 * s); ctx.fill();
    aRR(x + 12 * s, y - 42 * s, 9 * s, 20 * s, 4.5 * s); ctx.fill(); ctx.stroke(); aRR(x + 5 * s, y - 26 * s, 16 * s, 7 * s, 3.5 * s); ctx.fill();
    ctx.fillStyle = '#f6c0d8'; aCirc(x, y - 52 * s, 3.5 * s); ctx.fill();
    return;
  }
  if (theme === 'snow') { // 积雪松树
    shadow(x + 8, y + 4, 28 * s);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 5 * s, y - 18 * s, 10 * s, 22 * s);
    for (let i = 0; i < 4; i++) {
      const yy = y - (14 + i * 19) * s, w = (36 - i * 7) * s;
      ctx.fillStyle = ['#1f4d3a', '#28604a', '#2f6e54', '#3a7d60'][i];
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 34 * s); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f8fc'; ctx.beginPath(); ctx.moveTo(x - w * 0.55, yy - 15 * s); ctx.lineTo(x, yy - 34 * s); ctx.lineTo(x + w * 0.55, yy - 15 * s); ctx.quadraticCurveTo(x, yy - 10 * s, x - w * 0.55, yy - 15 * s); ctx.fill();
    }
    return;
  }
  if (theme === 'swamp') { // 枯树，挂着藤
    shadow(x + 6, y + 3, 22 * s);
    ctx.strokeStyle = '#3a2e22'; ctx.lineCap = 'round';
    ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 * s, y - 50 * s); ctx.stroke();
    ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x + 1 * s, y - 32 * s); ctx.lineTo(x - 18 * s, y - 52 * s); ctx.moveTo(x + 2 * s, y - 42 * s); ctx.lineTo(x + 18 * s, y - 62 * s); ctx.moveTo(x + 2 * s, y - 50 * s); ctx.lineTo(x - 4 * s, y - 66 * s); ctx.stroke();
    ctx.strokeStyle = 'rgba(110,150,90,.85)'; ctx.lineWidth = 2 * s;
    for (const [vx, vy, l] of [[-16, -50, 18], [16, -60, 22], [-3, -64, 14]]) { ctx.beginPath(); ctx.moveTo(x + vx * s, y + vy * s); ctx.quadraticCurveTo(x + (vx + 3) * s, y + (vy + l / 2) * s, x + vx * s, y + (vy + l) * s); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,130,80,.75)'; aCirc(x - 18 * s, y - 54 * s, 7 * s); ctx.fill(); aCirc(x + 18 * s, y - 64 * s, 8 * s); ctx.fill();
    return;
  }
  // 普通的树：一半是圆冠阔叶树，一半是松树
  if (v !== undefined && v > 0.62) {
    shadow(x + 8, y + 4, 30 * s, 0.3);
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 5 * s, y - 18 * s, 10 * s, 22 * s);
    for (let i = 0; i < 4; i++) {
      const yy = y - (14 + i * 20) * s, w = (40 - i * 8) * s;
      ctx.fillStyle = ['#1f4d2a', '#28603a', '#317244', '#3c8450'][i];
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 36 * s); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - 36 * s); ctx.lineTo(x - w * 0.2, yy); ctx.closePath(); ctx.fill();
    }
    return;
  }
  const sw = Math.sin(G.t * 1.3 + x * 0.01) * 1.6;
  shadow(x + 10, y + 4, 40 * s);
  ctx.fillStyle = '#6b4526'; aRR(x - 7 * s, y - 34 * s, 14 * s, 38 * s, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 1 * s, y - 34 * s, 6 * s, 38 * s);
  const cols = (v || 0) < 0.3 ? ['#2f6b2a', '#3f8a33', '#5aa844', '#7cc45a'] : ['#355f24', '#4c7f2c', '#6aa23a', '#93c95a'];
  const blobs = [[0, -62, 40], [-26, -48, 28], [26, -46, 28], [-12, -82, 26], [16, -78, 24]];
  for (let L = 0; L < 4; L++) for (const [bx, by, br] of blobs) {
    ctx.fillStyle = cols[L];
    aCirc(x + (bx - L * 2.4 + sw * (L / 3)) * s, y + (by - L * 4) * s, (br - L * 7) * s); ctx.fill();
  }
  if ((v || 0) > 0.5) for (let i = 0; i < 4; i++) { ctx.fillStyle = '#e8412e'; aCirc(x + (-20 + i * 13) * s, y + (-56 + (i % 2) * 14) * s, 3.2 * s); ctx.fill(); }
};
const ROCK_COL = { sky: '#8d9db5', chaos: '#5a3236', abyss: '#3a2c52', swamp: '#5e6c62', volcano: '#3e2e2a', desert: '#b8976a', snow: '#aebccc' };
drawRock = function (x, y, s, theme, ore) {
  shadow(x + 4, y + 3, 22 * s);
  const base = ROCK_COL[theme] || '#7d8088';
  ctx.fillStyle = base; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 21 * s, y + 1); ctx.lineTo(x - 16 * s, y - 18 * s); ctx.lineTo(x - 2 * s, y - 27 * s); ctx.lineTo(x + 15 * s, y - 20 * s); ctx.lineTo(x + 21 * s, y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(base, 0.25); ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 18 * s); ctx.lineTo(x - 2 * s, y - 27 * s); ctx.lineTo(x + 4 * s, y - 12 * s); ctx.lineTo(x - 10 * s, y - 7 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(base, -0.25); ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 12 * s); ctx.lineTo(x + 15 * s, y - 20 * s); ctx.lineTo(x + 21 * s, y + 1); ctx.lineTo(x + 2 * s, y + 1); ctx.closePath(); ctx.fill();
  if (theme === 'snow') { ctx.fillStyle = '#f4f8fc'; ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 18 * s); ctx.lineTo(x - 2 * s, y - 27 * s); ctx.lineTo(x + 15 * s, y - 20 * s); ctx.quadraticCurveTo(x, y - 16 * s, x - 16 * s, y - 18 * s); ctx.fill(); }
  else if (!theme || theme === 'forest') { ctx.fillStyle = 'rgba(90,140,60,.65)'; aEll(x - 8 * s, y - 3 * s, 8 * s, 3 * s); ctx.fill(); }
  if (ore) {
    const oc = theme === 'volcano' ? '#ff8a3a' : theme === 'abyss' ? '#d08aff' : theme === 'chaos' ? '#ff4a6a' : theme === 'snow' ? '#8fe0ff' : '#ffd25a';
    ctx.globalCompositeOperation = 'lighter';
    for (const [a, b] of [[-8, -9], [6, -15], [10, -5]]) { const g = ctx.createRadialGradient(x + a * s, y + b * s, 0, x + a * s, y + b * s, 8 * s); g.addColorStop(0, oc); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(x + a * s, y + b * s, 8 * s); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    for (const [a, b] of [[-8, -9], [6, -15], [10, -5]]) { ctx.fillStyle = oc; ctx.beginPath(); ctx.moveTo(x + a * s, y + (b - 4) * s); ctx.lineTo(x + (a + 3) * s, y + b * s); ctx.lineTo(x + a * s, y + (b + 4) * s); ctx.lineTo(x + (a - 3) * s, y + b * s); ctx.fill(); }
  }
};
drawBush = function (x, y, s, theme) {
  shadow(x, y + 3, 24 * s);
  const snow = theme === 'snow', swamp = theme === 'swamp';
  const c = snow ? ['#3f6f5f', '#4f8270', '#e8f0f6'] : swamp ? ['#3e5e36', '#4f7442', '#7a9a5a'] : ['#3a7a30', '#4c9440', '#6cb456'];
  for (const [bx, by, br, i] of [[-12, -10, 14, 0], [12, -10, 14, 0], [0, -18, 16, 1], [-6, -21, 9, 2]]) { ctx.fillStyle = c[i]; aCirc(x + bx * s, y + by * s, br * s); ctx.fill(); }
  // 草药丛开小花
  for (let i = 0; i < 5; i++) { ctx.fillStyle = snow ? '#9fd8ff' : '#f2f06a'; aCirc(x + (-14 + i * 7) * s, y + (-14 - (i % 2) * 8) * s, 2.3 * s); ctx.fill(); }
};
function aCrystal(x, y, s, c1, c2) {
  for (const [ox, h, w, lean] of [[-8, 40, 7, -0.15], [4, 52, 8, 0.05], [13, 30, 6, 0.25]]) {
    ctx.save(); ctx.translate(x + ox * s, y); ctx.rotate(lean);
    const g = ctx.createLinearGradient(-w * s, 0, w * s, 0); g.addColorStop(0, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w * s, 0); ctx.lineTo(-w * 0.7 * s, -h * 0.75 * s); ctx.lineTo(0, -h * s); ctx.lineTo(w * 0.7 * s, -h * 0.75 * s); ctx.lineTo(w * s, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-w * 0.7 * s, -h * 0.75 * s); ctx.lineTo(0, -h * s); ctx.lineTo(-w * 0.1 * s, -h * 0.2 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 24 * s, 0, x, y - 24 * s, 46 * s); g.addColorStop(0, c1.replace('rgb', 'rgba').replace(')', ',.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; aCirc(x, y - 24 * s, 46 * s); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
function aStalagmite(x, y, s, col) {
  shadow(x + 3, y + 2, 16 * s);
  ctx.fillStyle = col; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 13 * s, y); ctx.quadraticCurveTo(x - 6 * s, y - 20 * s, x - 1 * s, y - 46 * s); ctx.quadraticCurveTo(x + 6 * s, y - 20 * s, x + 13 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(x - 9 * s, y); ctx.quadraticCurveTo(x - 4 * s, y - 20 * s, x - 1 * s, y - 42 * s); ctx.lineTo(x - 2 * s, y); ctx.fill();
}
function aLavaPool(x, y, s) {
  ctx.fillStyle = '#2a1a16'; aEll(x, y, 40 * s, 17 * s); ctx.fill();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 34 * s); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.35, '#ffb03a'); g.addColorStop(1, '#c8341a');
  ctx.fillStyle = g; aEll(x, y, 34 * s, 13 * s); ctx.fill();
  const b = (G.t * 0.8 + x) % 1;
  ctx.fillStyle = `rgba(255,240,180,${1 - b})`; aCirc(x - 8 * s + b * 4, y - 2 * s, (2 + b * 3) * s); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const h = ctx.createRadialGradient(x, y, 0, x, y, 70 * s); h.addColorStop(0, 'rgba(255,120,40,.35)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = h; aCirc(x, y, 70 * s); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
drawDeco = function (d, theme) {
  const s = d.s;
  if (theme === 'chaos') {
    if (d.v < 0.5) { // 断裂石柱
      shadow(d.x + 6, d.y + 3, 22 * s);
      const g = ctx.createLinearGradient(d.x - 12 * s, 0, d.x + 12 * s, 0); g.addColorStop(0, '#7a6668'); g.addColorStop(1, '#3e2e32');
      ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(d.x - 11 * s, d.y); ctx.lineTo(d.x - 11 * s, d.y - 50 * s); ctx.lineTo(d.x - 2 * s, d.y - 58 * s); ctx.lineTo(d.x + 3 * s, d.y - 50 * s); ctx.lineTo(d.x + 11 * s, d.y - 54 * s); ctx.lineTo(d.x + 11 * s, d.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.3)'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(d.x - 11 * s + i * 5.5 * s, d.y); ctx.lineTo(d.x - 11 * s + i * 5.5 * s, d.y - 48 * s); ctx.stroke(); }
      ctx.fillStyle = '#5a464a'; aRR(d.x - 15 * s, d.y - 6 * s, 30 * s, 8 * s, 2); ctx.fill();
    } else aCrystal(d.x, d.y, s * 0.9, 'rgb(255,60,90)', 'rgb(140,10,40)');
    return;
  }
  if (theme === 'abyss') { if (d.v < 0.5) aStalagmite(d.x, d.y, s, '#3e3058'); else aCrystal(d.x, d.y, s * 0.9, 'rgb(190,110,255)', 'rgb(80,30,140)'); return; }
  if (theme === 'volcano') { if (d.v < 0.5) aStalagmite(d.x, d.y, s, '#3e2e2a'); else aLavaPool(d.x, d.y, s); return; }
  if (theme === 'cave') { if (d.v < 0.4) drawRock(d.x, d.y, s * 0.8, theme, false); else if (d.v < 0.8) aStalagmite(d.x, d.y, s, '#6a6875'); else aCrystal(d.x, d.y, s * 0.6, 'rgb(140,200,255)', 'rgb(60,90,160)'); return; }
  if (theme === 'swamp' && d.v > 0.55) { // 沼泽水潭
    ctx.fillStyle = '#3a4a2e'; aEll(d.x, d.y + 3, 48 * s, 20 * s); ctx.fill();
    const g = ctx.createRadialGradient(d.x - 10, d.y - 4, 2, d.x, d.y, 44 * s); g.addColorStop(0, '#5a8a6a'); g.addColorStop(1, '#22402e');
    ctx.fillStyle = g; aEll(d.x, d.y, 44 * s, 17 * s); ctx.fill();
    const b = (G.t * 0.5 + d.x * 0.01) % 1; ctx.strokeStyle = `rgba(200,255,180,${0.5 * (1 - b)})`; ctx.lineWidth = 1.2; aEll(d.x + 8, d.y, 6 + b * 12, (6 + b * 12) * 0.4); ctx.stroke();
    ctx.fillStyle = '#4c7a3a'; aEll(d.x - 18 * s, d.y + 4, 8 * s, 3.5 * s); ctx.fill(); aEll(d.x + 20 * s, d.y - 5, 7 * s, 3 * s); ctx.fill();
    ctx.strokeStyle = '#6a7a3a'; ctx.lineWidth = 1.6; for (let i = 0; i < 4; i++) { const rx = d.x + (30 + i * 4) * s; ctx.beginPath(); ctx.moveTo(rx, d.y + 6); ctx.lineTo(rx + (i - 1.5) * 2, d.y - 22 * s - i * 3); ctx.stroke(); }
    return;
  }
  if (theme === 'desert' && d.v > 0.6) return drawRock(d.x, d.y, s * 0.7, theme, false);
  if (theme === 'snow' && d.v > 0.7) return drawRock(d.x, d.y, s * 0.8, theme, false);
  drawTree(d.x, d.y, s, theme || 'forest', d.v);
};
drawNode = function (nd, theme) {
  const k = nd.kind;
  if (!nd.ready) {
    if (k === 'tree') { shadow(nd.x, nd.y + 2, 12); ctx.fillStyle = '#7a5230'; aEll(nd.x, nd.y - 2, 9, 5); ctx.fill(); ctx.fillStyle = '#c9a06a'; aEll(nd.x, nd.y - 4, 7, 3.4); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(0,0,0,.15)'; aEll(nd.x, nd.y, 12, 5); ctx.fill(); }
    return;
  }
  const inside = theme === 'cave' || theme === 'volcano' || theme === 'abyss' || theme === 'chaos';
  if (k === 'tree') drawTree(nd.x, nd.y, 1, inside ? 'forest' : theme, 0.2);
  else if (k === 'bush') drawBush(nd.x, nd.y, 1, theme);
  else drawRock(nd.x, nd.y, 1.1, theme, k === 'ore');
  const tw = (Math.sin(G.t * 3 + nd.x) + 1) / 2; // 闪光：表示可以采集
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,255,200,${0.25 + tw * 0.55})`;
  const sx = nd.x + 14, sy = nd.y - (k === 'tree' ? 80 : 32);
  ctx.beginPath(); ctx.moveTo(sx, sy - 6 - tw * 2); ctx.lineTo(sx + 1.5, sy - 1.5); ctx.lineTo(sx + 6 + tw * 2, sy); ctx.lineTo(sx + 1.5, sy + 1.5); ctx.lineTo(sx, sy + 6 + tw * 2); ctx.lineTo(sx - 1.5, sy + 1.5); ctx.lineTo(sx - 6 - tw * 2, sy); ctx.lineTo(sx - 1.5, sy - 1.5); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
};

/* =============================================================
   人物：剑士 / 法师 / 灵使（主角、红名恶徒、城里的 NPC 共用）
   o：face 朝向，body 衣甲色，wpn 武器色，cls 职业，swing 挥动，hurt 受击，
      hair 发色，walk 走路相位，moving 是否在走，cape 披风色，npc 是否 NPC
   ============================================================= */
drawHuman = function (x, y, o) {
  const f = o.face || 1, cls = o.cls || 'blade';
  const walk = o.moving ? Math.sin(o.walk || 0) : 0;
  const bob = o.moving ? Math.abs(Math.cos(o.walk || 0)) * 1.6 : Math.sin(G.t * 2 + x) * 0.5;
  const body = o.body || '#7c6a52', wpn = o.wpn || '#c0c6cc';
  ctx.save(); ctx.translate(x, y - bob); ctx.scale(f * 0.86, 0.86);
  ctx.lineWidth = 1.6; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const robe = cls !== 'blade';
  // 披风 / 背后的东西
  if (cls === 'blade') {
    const cape = Math.sin(G.t * 6) * 2 + (o.moving ? -6 : 0);
    ctx.fillStyle = o.cape || '#8f1d22'; ctx.beginPath(); ctx.moveTo(-6, -38); ctx.quadraticCurveTo(-18 + cape, -18, -16 + cape, -2); ctx.lineTo(-2, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // 腿 / 鞋
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 4, -14); ctx.rotate(walk * 0.5 * s);
    if (!robe) { ctx.fillStyle = '#4a3a2a'; aRR(-3.5, 0, 7, 14, 3); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#2a1e14'; aRR(-4, 11, 9, 4, 2); ctx.fill();
    ctx.restore();
  }
  if (robe) {
    // 长袍：下摆张开，随走路摆动
    const sway = walk * 2;
    const g = ctx.createLinearGradient(-14, -42, 14, 0); g.addColorStop(0, shade(body, 0.35)); g.addColorStop(0.55, body); g.addColorStop(1, shade(body, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(9, -42); ctx.lineTo(14 + sway, -2); ctx.quadraticCurveTo(0, 2, -14 + sway, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(body, 0.45); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(1, -40); ctx.lineTo(2 + sway * 0.6, -1); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
    if (cls === 'spirit') { ctx.fillStyle = '#f2ecd8'; ctx.beginPath(); ctx.moveTo(-5, -42); ctx.lineTo(0, -34); ctx.lineTo(5, -42); ctx.closePath(); ctx.fill(); } // 白色交领
    ctx.fillStyle = cls === 'mage' ? '#e2b54a' : wpn; ctx.fillRect(-10, -25, 20, 4); // 腰带
    if (cls === 'spirit') { ctx.fillStyle = wpn; ctx.beginPath(); ctx.moveTo(-4, -21); ctx.lineTo(-7 + sway, -9); ctx.lineTo(-3 + sway, -9); ctx.closePath(); ctx.fill(); } // 腰带垂下来
  } else {
    // 铠甲
    const g = ctx.createLinearGradient(-11, -40, 11, -12); g.addColorStop(0, shade(body, 0.55)); g.addColorStop(0.5, body); g.addColorStop(1, shade(body, -0.35));
    ctx.fillStyle = g; aRR(-11, -40, 22, 28, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a1a1e'; ctx.fillRect(-11, -24, 22, 5);
    ctx.fillStyle = '#e2b54a'; aRR(-3, -25, 6, 7, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; aRR(-7, -37, 5, 10, 2); ctx.fill();
    ctx.fillStyle = shade(body, 0.3); aEll(8, -37, 6, 4.5); ctx.fill(); ctx.stroke(); // 肩甲
  }
  // 头
  ctx.fillStyle = '#f2c99c'; aCirc(1, -50, 10); ctx.fill(); ctx.stroke();
  if (cls === 'blade') {
    const hc = o.npc ? null : shade(body, 0.5);
    if (hc) {
      const hg = ctx.createLinearGradient(-10, -62, 10, -50); hg.addColorStop(0, shade(hc.startsWith('rgb') ? '#d0d4da' : hc, 0)); hg.addColorStop(1, shade(body, -0.2));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(1, -52, 11, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(12, -50); ctx.lineTo(-10, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.cape || '#b52a2a'; ctx.beginPath(); ctx.moveTo(-1, -63); ctx.quadraticCurveTo(-12 - Math.sin(G.t * 5) * 2, -70, -14, -60); ctx.quadraticCurveTo(-6, -64, -1, -60); ctx.fill(); // 盔缨
    } else { ctx.fillStyle = o.hair || '#5a3a1a'; ctx.beginPath(); ctx.arc(1, -52, 10.5, Math.PI, Math.PI * 2); ctx.fill(); }
  } else if (cls === 'mage') {
    ctx.fillStyle = o.hair || '#d8d0c0'; ctx.beginPath(); ctx.moveTo(-8, -48); ctx.quadraticCurveTo(-11, -40, -6, -38); ctx.lineTo(-4, -46); ctx.fill(); // 长发
    const hg = ctx.createLinearGradient(-14, -58, 14, -58); hg.addColorStop(0, shade(body, 0.2)); hg.addColorStop(1, shade(body, -0.4));
    ctx.fillStyle = hg; aEll(1, -57, 16, 4.5); ctx.fill(); ctx.stroke(); // 帽檐
    ctx.beginPath(); ctx.moveTo(-9, -58); ctx.quadraticCurveTo(-2, -70, 2, -80); ctx.quadraticCurveTo(-6 - Math.sin(G.t * 3) * 2, -82, -8 - Math.sin(G.t * 3) * 3, -76); ctx.quadraticCurveTo(4, -70, 11, -58); ctx.closePath(); ctx.fill(); ctx.stroke(); // 尖帽
    ctx.fillStyle = '#e2b54a'; ctx.fillRect(-9, -60, 20, 2.5);
  } else {
    ctx.fillStyle = o.hair || '#2a1a10'; ctx.beginPath(); ctx.arc(1, -52, 10.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    aCirc(-1, -63, 5); ctx.fill(); // 发髻
    ctx.strokeStyle = '#e2b54a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -66); ctx.lineTo(6, -61); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.6; // 发簪
    ctx.fillStyle = wpn; ctx.fillRect(-9, -57, 20, 2.6); // 额带
  }
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(5, -51, 2.6, 3); // 眼睛
  // 手臂和武器
  const sw = o.swing > 0 ? 1 - o.swing / 0.22 : -1;
  const armA = o.swing > 0 ? -2.2 + sw * 3.2 : 0.35 + Math.sin(G.t * 2 + x) * 0.04;
  ctx.save(); ctx.translate(7, -36); ctx.rotate(armA);
  ctx.fillStyle = robe ? shade(body, 0.1) : shade(body, 0.2);
  if (robe) { ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(6, 14); ctx.lineTo(-5, 14); ctx.closePath(); ctx.fill(); ctx.stroke(); } // 宽袖
  else { aRR(-3, 0, 7, 14, 3); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#f2c99c'; aCirc(0.5, 15, 2.6); ctx.fill();
  ctx.translate(0.5, 15);
  if (cls === 'blade') {
    ctx.fillStyle = '#e2b54a'; aRR(-6, -2, 13, 4, 1.5); ctx.fill(); ctx.stroke();
    const bg = ctx.createLinearGradient(-3, 0, 3, 0); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, shade(wpn, 0.3)); bg.addColorStop(1, shade(wpn, -0.35));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-2.8, 2); ctx.lineTo(2.8, 2); ctx.lineTo(2.2, 34); ctx.lineTo(0, 39); ctx.lineTo(-2.2, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (cls === 'mage') {
    ctx.fillStyle = '#6b4526'; ctx.fillRect(-1.6, -30, 3.2, 52); ctx.strokeRect(-1.6, -30, 3.2, 52);
    ctx.strokeStyle = '#e2b54a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, -33, 6, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); ctx.strokeStyle = OL;
    ctx.globalCompositeOperation = 'lighter';
    const pul = 0.75 + Math.sin(G.t * 5) * 0.25, gg = ctx.createRadialGradient(0, -35, 0, 0, -35, 14 * pul);
    gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.3, wpn); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; aCirc(0, -35, 14 * pul); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = wpn; aCirc(0, -35, 4); ctx.fill();
  } else {
    // 灵使：桃木符剑，剑身贴着黄符
    ctx.fillStyle = '#e2b54a'; aRR(-5, -2, 11, 3.5, 1.2); ctx.fill();
    const bg = ctx.createLinearGradient(-3, 0, 3, 0); bg.addColorStop(0, '#d8a070'); bg.addColorStop(1, '#8a5a30');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-2.6, 2); ctx.lineTo(2.6, 2); ctx.lineTo(2, 30); ctx.lineTo(0, 34); ctx.lineTo(-2, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe36a'; ctx.fillRect(-3.5, 10, 7, 9); ctx.strokeStyle = '#c82a1a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-2, 12); ctx.lineTo(2, 12); ctx.moveTo(0, 12); ctx.lineTo(0, 18); ctx.moveTo(-2, 15); ctx.lineTo(2, 16); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = wpn.length === 7 ? wpn + '55' : 'rgba(140,255,200,.3)'; aCirc(0, 22, 8); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (o.npcItem === 'hammer') { ctx.fillStyle = '#6b4526'; ctx.fillRect(-14, -40, 3, 22); ctx.fillStyle = '#7a7f88'; aRR(-18, -44, 11, 7, 2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
  if (o.hurt) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,.45)'; aEll(x, y - 28, 15, 28); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
};

drawPlayer = function (p) {
  const aT = S.equip.armor ? S.equip.armor.t : 0, wT = S.equip.weapon ? S.equip.weapon.t : 0;
  const cls = S.cls || 'blade';
  shadow(p.x, p.y + 2, 17);
  if (p.armorT > 0) { // 灵甲术：脚下金光
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,200,80,${0.25 + Math.sin(G.t * 8) * 0.1})`; aEll(p.x, p.y + 2, 28, 11); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (aT >= 9) { // 高档衣甲：脚下一圈光环
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,220,120,${0.25 + Math.sin(G.t * 3) * 0.12})`; ctx.lineWidth = 2; aEll(p.x, p.y + 2, 24, 9); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (p.invis > 0) ctx.globalAlpha = 0.4;
  drawHuman(p.x, p.y, { face: p.face, moving: p.moving, walk: p.step, body: TIER_COL[aT], wpn: WPN_COL[wT], cls, swing: p.swing, hurt: p.hurt > 0 });
  ctx.globalAlpha = 1;
  if (p.ward > 0) { // 灵盾
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y - 24, 10, p.x, p.y - 24, 36);
    g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.8, `rgba(120,200,255,${0.18 + Math.sin(G.t * 6) * 0.06})`); g.addColorStop(1, 'rgba(160,230,255,.45)');
    ctx.fillStyle = g; aEll(p.x, p.y - 24, 28, 36); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (p.mend > 0) for (let i = 0; i < 3; i++) { const t = (G.t * 0.8 + i / 3) % 1; ctx.fillStyle = `rgba(130,255,140,${1 - t})`; aCirc(p.x - 12 + i * 12, p.y - 10 - t * 50, 2.5); ctx.fill(); }
  // 剑光：外层淡金、里层亮白
  if (cls === 'blade' && p.swing > 0 && !ZONES[G.zone].safe) {
    const sweep = 1 - p.swing / 0.22;
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [w, col, al] of [[14, '255,210,120', 0.35], [6, '255,255,255', 0.9]]) {
      ctx.strokeStyle = `rgba(${col},${al * (1 - sweep * 0.6)})`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(p.x, p.y - 18, 50, p.dir - 1.15 + sweep * 0.4, p.dir - 1.15 + 2.3 * Math.min(1, sweep * 2.2)); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  label(S.name, p.x, p.y - (cls === 'mage' ? 78 : 66), '#ffe9a8', 12);
  if (G.deadT > 0) label('💀', p.x, p.y - 20, '#fff', 28);
};
drawRogue = function (e) {
  const m = e.m;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,40,30,${0.22 + Math.sin(G.t * 5 + e.sx) * 0.08})`; aEll(e.x, e.y + 2, 26, 10); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  shadow(e.x, e.y + 2, 17);
  const mv = artMoving(e);
  drawHuman(e.x, e.y, { face: e.face, moving: mv, walk: G.t * 10 + e.sx, body: '#4a1a1a', wpn: '#ff5a4a', cape: '#2a0a0a', cls: m.rogue, swing: e.cd > 1 ? 0.12 : 0, hurt: e.flash > 0, hair: '#111' });
  label('☠ ' + m.n, e.x, e.y - (m.rogue === 'mage' ? 80 : 68), '#ff4a3a', 13);
  hpBar(e.x, e.y - (m.rogue === 'mage' ? 72 : 60), 56, e.hp / m.hp, '#ff3a2a');
  statusIcons(e, 22, 44);
};

/* =============================================================
   怪物：按体型分类画，每种怪有自己的配色和特征
   ============================================================= */
const MART = {
  hen: { a: 'bird', c: '#f7f3ea' },
  deer: { a: 'quad', head: 'deer', c: '#c98a50', c2: '#f4e6cc', spots: 1 },
  boar: { a: 'quad', head: 'pig', c: '#6a4630', c2: '#8a6044', tusk: 1, mane: 1 },
  snake: { a: 'snake', c: '#5aa83a', c2: '#c8e070' },
  wolf: { a: 'quad', head: 'wolf', c: '#9aa2ad', c2: '#d9dde2' },
  spider: { a: 'spider', c: '#3a2a3a', c2: '#c83a7a' },
  ape: { a: 'ape', c: '#5a4030', c2: '#a08060' },
  bat: { a: 'bat', c: '#4a3a5a', c2: '#9a7ab0' },
  skel: { a: 'hum', head: 'skull', skin: '#ece4cc', wpn: 'sword' },
  skelarcher: { a: 'hum', head: 'skull', skin: '#ece4cc', cloth: '#5a4a3a', wpn: 'bow' },
  skelguard: { a: 'hum', head: 'skull', skin: '#ece4cc', armor: '#7a7a8a', wpn: 'axe', shield: '#6a5a4a' },
  skelking: { a: 'hum', head: 'skull', skin: '#f4ecd4', armor: '#4a3a6a', wpn: 'sword', crown: 1, cape: '#5a1a2a', aura: '#a07aff' },
  zombie: { a: 'hum', head: 'zombie', skin: '#8aa86a', cloth: '#5a5a6a', hunch: 1 },
  maggot: { a: 'worm', c: '#e8d8b8', c2: '#c8b088' },
  vampbat: { a: 'bat', c: '#5a1a2a', c2: '#d83a4a' },
  shockzombie: { a: 'hum', head: 'zombie', skin: '#7aa8b8', cloth: '#3a4a6a', hunch: 1, glow: '#9fe8ff' },
  crawler: { a: 'hum', head: 'zombie', skin: '#6a7a5a', cloth: '#3a3a2a', hunch: 2 },
  corpseking: { a: 'hum', head: 'zombie', skin: '#6a8a5a', armor: '#4a3a2a', wpn: 'axe', crown: 1, cape: '#3a2a1a', aura: '#8aff6a' },
  redsnake: { a: 'snake', c: '#c83a2a', c2: '#f0c060' },
  greywolf: { a: 'quad', head: 'wolf', c: '#7a7f88', c2: '#c0c4c9' },
  pincer: { a: 'scorp', c: '#8a5a3a', c2: '#c88a5a' },
  toad: { a: 'frog', c: '#6a9a3a', c2: '#d8e88a' },
  templeguard: { a: 'hum', head: 'horn', skin: '#b84a3a', armor: '#5a3a2a', wpn: 'spear' },
  statue: { a: 'golem', c: '#8a8478', c2: '#b0aa9c', eye: '#ff8a3a' },
  firespirit: { a: 'spirit', kind: 'fire', c: '#ff7a2a', c2: '#ffe06a' },
  wraith: { a: 'spirit', kind: 'ghost', c: '#b8c8e8', c2: '#ffffff' },
  templewarrior: { a: 'hum', head: 'horn', skin: '#a83a3a', armor: '#3a2a2a', wpn: 'axe', shield: '#5a2a1a' },
  abbot: { a: 'hum', head: 'horn', skin: '#c84a2a', armor: '#6a1a1a', wpn: 'staff', crown: 1, cape: '#3a0a0a', aura: '#ff6a2a' },
  centipede: { a: 'centi', c: '#8a2a1a', c2: '#e0a040' },
  beetle: { a: 'beetle', c: '#2a2a3a', c2: '#6a7ab0' },
  bigpincer: { a: 'scorp', c: '#5a3a2a', c2: '#a87a4a', tail: 1 },
  spitter: { a: 'worm', c: '#8ab83a', c2: '#d8f06a' },
  broodmother: { a: 'worm', c: '#7a5a8a', c2: '#d0a0e0', aura: '#c07aff' },
  blackboar: { a: 'quad', head: 'pig', c: '#2e2e34', c2: '#4a4a52', tusk: 1, mane: 1 },
  redboar: { a: 'quad', head: 'pig', c: '#8a2a1e', c2: '#b04a30', tusk: 1, mane: 1 },
  tombguard: { a: 'golem', c: '#6a6a72', c2: '#9a9aa6', eye: '#6affb0' },
  tombbat: { a: 'bat', c: '#3a3a48', c2: '#7a7a90' },
  boarking: { a: 'quad', head: 'pig', c: '#e8e4dc', c2: '#ffffff', tusk: 1, mane: 1, crown: 1, aura: '#ffe08a' },
  idol: { a: 'golem', c: '#5a3a3a', c2: '#9a5a4a', eye: '#ff3a3a' },
  bowguard: { a: 'hum', head: 'helm', skin: '#d8b090', armor: '#3a2a4a', wpn: 'bow' },
  hallscorpion: { a: 'scorp', c: '#4a1a3a', c2: '#a83a7a', tail: 1 },
  hallknight: { a: 'hum', head: 'helm', skin: '#c8a080', armor: '#2a1a3a', wpn: 'sword', shield: '#4a1a3a', cape: '#5a1a3a' },
  halllord: { a: 'hum', head: 'horn', skin: '#7a3a8a', armor: '#2a0a2a', wpn: 'staff', crown: 1, cape: '#4a0a3a', aura: '#c77aff' },
  bloodspider: { a: 'spider', c: '#6a0a1a', c2: '#ff3a4a' },
  gorgebeast: { a: 'quad', head: 'bull', c: '#8a3a2a', c2: '#c8784a' },
  eye: { a: 'eye', c: '#efe0e0', c2: '#c81a3a' },
  webguard: { a: 'spider', c: '#2a2a2a', c2: '#e8c03a' },
  spiderlord: { a: 'spider', c: '#4a0a0a', c2: '#ff6a2a', crown: 1, aura: '#ff4a2a' },
  snowwolf: { a: 'quad', head: 'wolf', c: '#eef2f6', c2: '#ffffff' },
  icebear: { a: 'quad', head: 'bear', c: '#f2f6fa', c2: '#ffffff' },
  snowman: { a: 'snowman', c: '#ffffff' },
  icesprite: { a: 'spirit', kind: 'ice', c: '#8fd8ff', c2: '#ffffff' },
  iceguard: { a: 'hum', head: 'helm', skin: '#a8d0e8', armor: '#5a8ab0', wpn: 'spear' },
  icegolem: { a: 'golem', c: '#8fc8e8', c2: '#d8f0ff', crystal: 1, eye: '#ffffff' },
  frostwitch: { a: 'hum', head: 'hood', skin: '#c8d8f0', cloth: '#3a5a9a', wpn: 'staff' },
  snoweagle: { a: 'eagle', c: '#e8ecf0', c2: '#3a3a3a' },
  frostgiant: { a: 'golem', c: '#9fd0f0', c2: '#e8f8ff', crystal: 1, crown: 1, eye: '#bff8ff', aura: '#9fe8ff' },
  firelizard: { a: 'quad', head: 'lizard', c: '#c84a1a', c2: '#ffb03a' },
  lavafiend: { a: 'golem', c: '#3a1a10', c2: '#5a2a18', lava: 1, eye: '#ffd23a' },
  dragonguard: { a: 'hum', head: 'dragon', skin: '#4a8a4a', armor: '#8a6a2a', wpn: 'spear', shield: '#6a4a1a' },
  wyvern: { a: 'dragon', c: '#8a3a2a', c2: '#e8a03a' },
  drake: { a: 'quad', head: 'lizard', c: '#5a2a1a', c2: '#c86a2a' },
  abyssdragon: { a: 'dragon', c: '#2a1a3a', c2: '#ff5a2a', crown: 1, aura: '#ff4a2a' },
  // 召唤物和城里的小动物
  _bone: { a: 'hum', head: 'skull', skin: '#ece4cc', wpn: 'sword', shield: '#5a6a8a' },
  _beast: { a: 'quad', head: 'cat', c: '#e88a2a', c2: '#fff4e0', stripes: 1 },
  _cat: { a: 'quad', head: 'cat', c: '#c8a070', c2: '#f0e0c8' },
};
// 判断这一帧有没有在走（看位置有没有变）
function artMoving(e) {
  const mv = e._ax !== undefined && Math.hypot(e.x - e._ax, e.y - e._ay) > 0.15;
  e._ax = e.x; e._ay = e.y;
  if (mv) e._mvT = G.t;
  return e._mvT !== undefined && G.t - e._mvT < 0.12;
}
function legs4(xs, y0, len, walk, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w || 3.2; ctx.lineCap = 'round';
  xs.forEach((x, i) => { const s = (i % 2 ? 1 : -1) * walk * 5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + s, y0 + len); ctx.stroke(); });
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
}
function crown(x, y, s) {
  ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y); ctx.lineTo(x - 8 * s, y - 7 * s); ctx.lineTo(x - 4 * s, y - 3 * s); ctx.lineTo(x, y - 9 * s); ctx.lineTo(x + 4 * s, y - 3 * s); ctx.lineTo(x + 8 * s, y - 7 * s); ctx.lineTo(x + 8 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff3a4a'; aCirc(x, y - 3 * s, 1.6 * s); ctx.fill();
  ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
}
// ---- 四足兽：猪、鹿、狼、熊、猫、蜥蜴、牛 ----
function artQuad(o, walk) {
  const c = o.c, c2 = o.c2, legCol = shade(c, -0.45);
  const lizard = o.head === 'lizard', bear = o.head === 'bear', bull = o.head === 'bull';
  const by = lizard ? -12 : bear ? -22 : -20, bh = lizard ? 7 : bear ? 13 : 10, bw = lizard ? 20 : bear ? 20 : 18;
  legs4([-11, -6, 7, 12], by + 6, lizard ? 7 : bear ? 16 : 13, walk, legCol, bear ? 5 : 3.2);
  // 尾巴
  ctx.fillStyle = c; ctx.strokeStyle = OL;
  if (lizard) { ctx.beginPath(); ctx.moveTo(-16, by - 2); ctx.quadraticCurveTo(-34, by - 2 + walk * 4, -40, by + 4); ctx.quadraticCurveTo(-30, by + 4, -16, by + 4); ctx.fill(); ctx.stroke(); }
  else if (o.head === 'wolf' || o.head === 'cat') { ctx.beginPath(); ctx.moveTo(-16, by - 2); ctx.quadraticCurveTo(-30, by - 10 + walk * 3, -28, by + 6); ctx.quadraticCurveTo(-22, by + 2, -16, by + 4); ctx.fill(); ctx.stroke(); }
  else if (o.head === 'pig') { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-19, by - 3, 3, 0, 5); ctx.stroke(); ctx.strokeStyle = OL; }
  // 身体
  ctx.fillStyle = vgrad(by - bh, by + bh, shade(c, 0.2), shade(c, -0.25)); aEll(0, by, bw, bh); ctx.fill(); ctx.stroke();
  if (c2) { ctx.fillStyle = c2; ctx.globalAlpha = 0.85; aEll(2, by + bh * 0.45, bw * 0.55, bh * 0.38); ctx.fill(); ctx.globalAlpha = 1; }
  if (o.spots) { ctx.fillStyle = '#f4e6cc'; for (const [sx, sy] of [[-8, -4], [-2, -6], [4, -3], [-5, 1]]) { aCirc(sx, by + sy, 1.4); ctx.fill(); } }
  if (o.stripes) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; for (let i = -10; i < 12; i += 5) { ctx.beginPath(); ctx.moveTo(i, by - bh + 1); ctx.lineTo(i + 2, by - 2); ctx.stroke(); } ctx.lineWidth = 1.5; ctx.strokeStyle = OL; }
  if (o.mane) { ctx.strokeStyle = shade(c, -0.55); ctx.lineWidth = 1.4; for (let i = -12; i < 8; i += 4) { ctx.beginPath(); ctx.moveTo(i, by - bh + 1); ctx.lineTo(i + 2, by - bh - 4); ctx.stroke(); } ctx.strokeStyle = OL; ctx.lineWidth = 1.5; }
  if (lizard) { ctx.fillStyle = c2; for (let i = -14; i < 12; i += 5) { ctx.beginPath(); ctx.moveTo(i, by - bh + 1); ctx.lineTo(i + 2.5, by - bh - 5); ctx.lineTo(i + 5, by - bh + 1); ctx.fill(); } }
  // 头
  const hx = 16, hy = by - (lizard ? 1 : 4);
  if (o.head === 'pig') {
    ctx.fillStyle = shade(c, 0.05); aEll(hx, hy + 2, 9, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d99a8a'; aEll(hx + 8, hy + 4, 4, 4.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a2a20'; aCirc(hx + 7.5, hy + 3, 0.9); ctx.fill(); aCirc(hx + 9.5, hy + 5, 0.9); ctx.fill();
    if (o.tusk) { ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.moveTo(hx + 3, hy + 8); ctx.quadraticCurveTo(hx + 9, hy + 7, hx + 9, hy - 1); ctx.lineTo(hx + 6, hy + 7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = shade(c, -0.3); ctx.beginPath(); ctx.moveTo(hx - 5, hy - 3); ctx.lineTo(hx - 3, hy - 10); ctx.lineTo(hx, hy - 3); ctx.fill();
    ctx.fillStyle = '#ffda5a'; aCirc(hx, hy - 1, 1.6); ctx.fill();
  } else if (o.head === 'deer') {
    ctx.fillStyle = shade(c, 0.1); ctx.beginPath(); ctx.moveTo(hx - 6, hy); ctx.lineTo(hx, hy - 14); ctx.lineTo(hx + 6, hy - 12); ctx.lineTo(hx + 2, hy + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    aEll(hx + 5, hy - 15, 7, 5, 0.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1a10'; aCirc(hx + 11, hy - 14, 1.6); ctx.fill();
    ctx.fillStyle = '#222'; aCirc(hx + 6, hy - 16, 1.2); ctx.fill();
    ctx.strokeStyle = '#d9c09a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 2, hy - 19); ctx.lineTo(hx - 1, hy - 29); ctx.lineTo(hx - 6, hy - 32); ctx.moveTo(hx - 1, hy - 29); ctx.lineTo(hx + 2, hy - 34); ctx.moveTo(hx + 5, hy - 19); ctx.lineTo(hx + 7, hy - 28); ctx.lineTo(hx + 11, hy - 31); ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  } else if (o.head === 'wolf' || o.head === 'cat') {
    const cat = o.head === 'cat';
    ctx.fillStyle = shade(c, 0.05);
    if (cat) { aCirc(hx, hy - 3, 8); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(hx - 6, hy - 7); ctx.lineTo(hx + 12, hy - 4); ctx.lineTo(hx + 14, hy + 1); ctx.lineTo(hx - 3, hy + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = shade(c, -0.15); ctx.beginPath(); ctx.moveTo(hx - 4, hy - 7); ctx.lineTo(hx - 2, hy - 16); ctx.lineTo(hx + 3, hy - 8); ctx.fill(); ctx.stroke();
    if (cat) { ctx.beginPath(); ctx.moveTo(hx + 2, hy - 9); ctx.lineTo(hx + 6, hy - 16); ctx.lineTo(hx + 8, hy - 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = o.c === '#eef2f6' ? '#5ab8ff' : '#ffcf3a'; aCirc(hx + 4, hy - 3, 1.7); ctx.fill();
    ctx.fillStyle = '#222'; aCirc(cat ? hx + 8 : hx + 14, hy - 1, 1.4); ctx.fill();
    if (o.stripes) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx - 3, hy - 8); ctx.lineTo(hx - 1, hy - 4); ctx.moveTo(hx + 1, hy - 10); ctx.lineTo(hx + 2, hy - 6); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; }
    if (!cat) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 6, hy + 1); ctx.lineTo(hx + 7, hy + 3); ctx.moveTo(hx + 10, hy + 0.5); ctx.lineTo(hx + 11, hy + 2.5); ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; }
  } else if (bear) {
    ctx.fillStyle = shade(c, 0.05); aCirc(hx + 2, hy - 2, 10); ctx.fill(); ctx.stroke();
    aCirc(hx - 3, hy - 11, 3.5); ctx.fill(); ctx.stroke(); aCirc(hx + 6, hy - 11, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8d0d8'; aEll(hx + 9, hy + 1, 5, 4); ctx.fill();
    ctx.fillStyle = '#222'; aCirc(hx + 12, hy, 1.6); ctx.fill(); aCirc(hx + 5, hy - 4, 1.4); ctx.fill();
  } else if (lizard) {
    ctx.fillStyle = shade(c, 0.05); ctx.beginPath(); ctx.moveTo(hx - 6, hy - 5); ctx.lineTo(hx + 14, hy - 3); ctx.lineTo(hx + 15, hy + 2); ctx.lineTo(hx - 6, hy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23a'; aCirc(hx + 3, hy - 3, 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(hx + 2.6, hy - 4.6, 0.9, 3.2);
    ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(hx + 4, hy + 1.5); ctx.lineTo(hx + 14, hy + 0.5); ctx.stroke();
    if (Math.sin(G.t * 4) > 0.6) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,140,40,.6)'; aCirc(hx + 18, hy + 1, 3); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  } else if (bull) {
    ctx.fillStyle = shade(c, 0.05); aEll(hx + 1, hy, 9, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c2; aEll(hx + 7, hy + 4, 5, 4); ctx.fill();
    ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.moveTo(hx - 4, hy - 6); ctx.quadraticCurveTo(hx - 12, hy - 14, hx - 6, hy - 20); ctx.quadraticCurveTo(hx - 6, hy - 12, hx, hy - 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 4, hy - 7); ctx.quadraticCurveTo(hx + 8, hy - 16, hx + 14, hy - 18); ctx.quadraticCurveTo(hx + 10, hy - 11, hx + 7, hy - 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3a2a'; aCirc(hx + 3, hy - 2, 1.7); ctx.fill();
  }
  if (o.crown) crown(hx, hy - (o.head === 'pig' ? 10 : 14), 1);
}
function artBird(o, walk) {
  legs4([-3, 3], -6, 6, walk, '#e8a13a');
  ctx.fillStyle = o.c; aEll(0, -12, 11, 8.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(o.c, -0.06); aEll(-8, -14, 6, 7, -0.6); ctx.fill();
  ctx.fillStyle = o.c; aCirc(8, -20, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e23a2a'; ctx.beginPath(); ctx.arc(7, -27, 2.4, 0, 7); ctx.arc(10, -26, 2.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#f2a52a'; ctx.beginPath(); ctx.moveTo(13, -21); ctx.lineTo(18, -19.5); ctx.lineTo(13, -18); ctx.fill();
  ctx.fillStyle = '#222'; aCirc(10, -21, 1.1); ctx.fill();
  ctx.fillStyle = shade(o.c, -0.12); aEll(-1, -11, 6, 4, 0.3); ctx.fill();
}
function artEagle(o) {
  const flap = Math.sin(G.t * 9);
  const lift = -14 - Math.abs(flap) * 3;
  ctx.fillStyle = shade(o.c, -0.1);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, lift - 6); ctx.quadraticCurveTo(-10, lift - 22 * (0.6 + flap * 0.4 * s), -26, lift - 14 * (0.5 + flap * 0.5 * s)); ctx.quadraticCurveTo(-14, lift - 6, -2, lift - 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = vgrad(lift - 12, lift + 4, o.c, shade(o.c, -0.2)); aEll(0, lift - 4, 13, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c; aCirc(12, lift - 9, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8b030'; ctx.beginPath(); ctx.moveTo(16, lift - 11); ctx.quadraticCurveTo(23, lift - 10, 19, lift - 4); ctx.lineTo(16, lift - 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#222'; aCirc(13, lift - 10, 1.3); ctx.fill();
  ctx.fillStyle = o.c2; ctx.beginPath(); ctx.moveTo(-12, lift - 4); ctx.lineTo(-22, lift - 1); ctx.lineTo(-12, lift + 1); ctx.fill();
}
function artSnake(o, walk, e) {
  const ph = G.t * 6 + (e ? e.sx : 0), n = 9;
  const pts = []; for (let i = 0; i < n; i++) pts.push([-22 + i * 5, -5 + Math.sin(ph - i * 0.8) * 3.5]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
  path(); ctx.strokeStyle = OL; ctx.lineWidth = 10; ctx.stroke();
  path(); ctx.strokeStyle = o.c; ctx.lineWidth = 7.5; ctx.stroke();
  path(); ctx.strokeStyle = o.c2; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
  const [hx, hy] = pts[n - 1];
  ctx.fillStyle = shade(o.c, -0.1); ctx.lineWidth = 1.5; ctx.strokeStyle = OL; aEll(hx + 5, hy - 2, 7, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffde3a'; aCirc(hx + 7, hy - 4, 1.8); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(hx + 6.6, hy - 5.2, 0.9, 2.4);
  if (Math.sin(G.t * 9 + (e ? e.sx : 0)) > 0.3) { ctx.strokeStyle = '#e8322a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + 12, hy - 1); ctx.lineTo(hx + 17, hy - 1); ctx.lineTo(hx + 19, hy - 3); ctx.moveTo(hx + 17, hy - 1); ctx.lineTo(hx + 19, hy + 1); ctx.stroke(); }
  ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
}
function artWorm(o, walk, e) {
  const ph = G.t * 4 + (e ? e.sx : 0), n = 7;
  for (let i = 0; i < n; i++) {
    const x = -18 + i * 5.5, bulge = 1 + Math.sin(ph - i * 0.9) * 0.15, r = (5.5 + Math.sin((i / (n - 1)) * Math.PI) * 3) * bulge;
    ctx.fillStyle = i % 2 ? o.c : shade(o.c, -0.1); aEll(x, -r, r, r * 0.95); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; aEll(x - 1, -r * 1.4, r * 0.4, r * 0.25); ctx.fill();
  }
  const hx = 18, hy = -7;
  ctx.fillStyle = shade(o.c, 0.1); aCirc(hx, hy, 6.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(o.c2, -0.4); aEll(hx + 4, hy + 1, 3, 3.6); ctx.fill();
  ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(hx + 2 + i * 1.3, hy - 2); ctx.lineTo(hx + 2.6 + i * 1.3, hy + 0.5); ctx.lineTo(hx + 3.2 + i * 1.3, hy - 2); ctx.fill(); }
  ctx.fillStyle = '#ff3a2a'; aCirc(hx - 1, hy - 4, 1.4); ctx.fill();
}
function artCenti(o, walk, e) {
  const ph = G.t * 9 + (e ? e.sx : 0), n = 8;
  for (let i = 0; i < n; i++) {
    const x = -20 + i * 5.2, y = -6 + Math.sin(ph * 0.5 - i * 0.7) * 1.5;
    ctx.strokeStyle = o.c2; ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + Math.sin(ph - i) * 2, y + 7 * s * 0.6 + 4); ctx.stroke(); }
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
    ctx.fillStyle = i % 2 ? o.c : shade(o.c, -0.15); aEll(x, y, 4.6, 4); ctx.fill(); ctx.stroke();
  }
  const hx = 22, hy = -6;
  ctx.fillStyle = shade(o.c, -0.2); aCirc(hx, hy, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = o.c2; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + 2, hy - 3); ctx.quadraticCurveTo(hx + 8, hy - 10, hx + 12, hy - 8); ctx.moveTo(hx + 1, hy - 4); ctx.quadraticCurveTo(hx + 4, hy - 12, hx + 9, hy - 13); ctx.stroke();
  ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
  ctx.fillStyle = '#ffde3a'; aCirc(hx + 2, hy - 1, 1.2); ctx.fill();
}
function artSpider(o, walk) {
  const ph = G.t * 10;
  ctx.strokeStyle = shade(o.c, -0.3); ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const bx = -2 + i * 3.5, sw = walk ? Math.sin(ph + i * 1.6 + (s > 0 ? Math.PI : 0)) * 3 : 0;
    ctx.beginPath(); ctx.moveTo(bx, -10); ctx.quadraticCurveTo(bx + (i - 1.5) * 7 + sw, -20, bx + (i - 1.5) * 10 + sw, -2 + (s > 0 ? 2 : 0)); ctx.stroke();
  }
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  ctx.fillStyle = vgrad(-24, -4, shade(o.c, 0.2), shade(o.c, -0.3)); aEll(-9, -13, 11, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(-6, -14); ctx.lineTo(-9, -8); ctx.lineTo(-12, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(o.c, 0.1); aEll(6, -11, 6.5, 5.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; for (const [ex, ey] of [[8, -13], [10, -12], [9, -10], [11, -10]]) { aCirc(ex, ey, 1); ctx.fill(); }
  ctx.strokeStyle = shade(o.c2, -0.2); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(11, -8); ctx.lineTo(13, -5); ctx.moveTo(9, -7); ctx.lineTo(10, -4); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
  if (o.crown) crown(6, -16, 0.9);
}
function artScorp(o, walk) {
  const ph = G.t * 10;
  ctx.strokeStyle = shade(o.c, -0.35); ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const bx = -6 + i * 5, sw = walk ? Math.sin(ph + i + s) * 2 : 0; ctx.beginPath(); ctx.moveTo(bx, -6); ctx.lineTo(bx - 3 + sw, -1 + (s > 0 ? 1 : 0)); ctx.stroke(); }
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  // 尾巴
  if (o.tail) {
    ctx.fillStyle = o.c;
    const tw = Math.sin(G.t * 3) * 2;
    [[-14, -8, 4], [-19, -13, 3.6], [-20, -20, 3.4], [-16, -26, 3.2]].forEach(([x, y, r], i) => { aCirc(x + tw * (i / 3), y, r); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = o.c2; ctx.beginPath(); ctx.moveTo(-14 + tw, -29); ctx.lineTo(-8 + tw, -26); ctx.lineTo(-13 + tw, -24); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = vgrad(-14, -2, shade(o.c, 0.2), shade(o.c, -0.25)); aEll(-2, -7, 13, 6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; for (let i = -10; i < 8; i += 4) { ctx.beginPath(); ctx.moveTo(i, -12); ctx.lineTo(i, -2); ctx.stroke(); } ctx.strokeStyle = OL;
  // 钳子
  const pinch = Math.abs(Math.sin(G.t * 4)) * 0.3;
  for (const s of [-1, 1]) {
    ctx.fillStyle = o.c2;
    ctx.beginPath(); ctx.moveTo(9, -7 + s * 2); ctx.lineTo(16, -9 + s * 4); ctx.stroke();
    ctx.save(); ctx.translate(18, -9 + s * 4);
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(s * pinch); ctx.beginPath(); ctx.moveTo(3, -1); ctx.lineTo(9, -3 * s); ctx.lineTo(4, 1); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#111'; aCirc(8, -10, 1.1); ctx.fill();
}
function artBeetle(o, walk) {
  const ph = G.t * 10;
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) { const bx = -7 + i * 7, sw = walk ? Math.sin(ph + i * 2) * 2.5 : 0; ctx.beginPath(); ctx.moveTo(bx, -7); ctx.lineTo(bx - 3 + sw, 0); ctx.stroke(); }
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  ctx.fillStyle = vgrad(-20, -4, shade(o.c, 0.15), shade(o.c, -0.3)); aEll(-2, -11, 15, 9); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(-10, -3); ctx.stroke(); ctx.strokeStyle = OL;
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = o.c2; ctx.globalAlpha = 0.55; aEll(-6, -15, 6, 2.5, -0.5); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = shade(o.c, -0.2); aCirc(13, -9, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(o.c, 0.1); ctx.beginPath(); ctx.moveTo(15, -12); ctx.quadraticCurveTo(22, -18, 22, -24); ctx.quadraticCurveTo(19, -16, 16, -9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5a3a'; aCirc(15, -9, 1.2); ctx.fill();
}
function artBat(o, walk, e) {
  const flap = Math.sin(G.t * 16 + (e ? e.sx : 0)), fy = -26 + Math.sin(G.t * 3 + (e ? e.sx : 0)) * 3;
  shadow(0, 0, 10);
  ctx.fillStyle = o.c;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, fy - 2);
    ctx.quadraticCurveTo(s * 10, fy - 14 * flap - 4, s * 22, fy - 10 * flap);
    ctx.lineTo(s * 18, fy - 2 * flap + 2); ctx.lineTo(s * 13, fy - 4 * flap + 5); ctx.lineTo(s * 7, fy + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = vgrad(fy - 7, fy + 6, shade(o.c, 0.2), shade(o.c, -0.2)); aEll(0, fy, 6, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4, fy - 5); ctx.lineTo(-5, fy - 12); ctx.lineTo(-1, fy - 6); ctx.moveTo(4, fy - 5); ctx.lineTo(5, fy - 12); ctx.lineTo(1, fy - 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2 === '#d83a4a' ? '#ff3a3a' : '#ffde3a'; aCirc(-2, fy - 2, 1.3); ctx.fill(); aCirc(2, fy - 2, 1.3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-1.5, fy + 3); ctx.lineTo(-1, fy + 5.5); ctx.lineTo(-0.3, fy + 3); ctx.moveTo(0.3, fy + 3); ctx.lineTo(1, fy + 5.5); ctx.lineTo(1.5, fy + 3); ctx.fill();
}
function artFrog(o, walk, e) {
  const hop = walk ? Math.abs(Math.sin(G.t * 8 + (e ? e.sx : 0))) * 5 : 0, by = -9 - hop;
  ctx.fillStyle = shade(o.c, -0.15); aEll(-8, by + 5, 7, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = vgrad(by - 9, by + 7, shade(o.c, 0.15), shade(o.c, -0.25)); aEll(0, by, 13, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; aEll(3, by + 4, 8, 4); ctx.fill();
  ctx.fillStyle = shade(o.c, -0.35); for (const [sx, sy] of [[-5, -4], [-1, -6], [-8, 0]]) { aCirc(sx, by + sy, 1.6); ctx.fill(); }
  for (const ex of [3, 9]) { ctx.fillStyle = o.c; aCirc(ex, by - 8, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffe36a'; aCirc(ex + 0.5, by - 8.5, 2.4); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(ex, by - 10, 1, 3); }
  ctx.strokeStyle = OL; ctx.beginPath(); ctx.moveTo(6, by + 1); ctx.quadraticCurveTo(10, by + 3, 13, by); ctx.stroke();
}
function artSnowman(o, walk) {
  const wob = Math.sin(G.t * 3) * 0.06;
  ctx.save(); ctx.rotate(wob);
  ctx.fillStyle = vgrad(-24, 0, '#ffffff', '#c8d8e8'); aCirc(0, -11, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = vgrad(-38, -18, '#ffffff', '#d0dcea'); aCirc(0, -28, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = vgrad(-48, -34, '#ffffff', '#d8e2ee'); aCirc(0, -41, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#222'; aCirc(2, -43, 1.2); ctx.fill(); aCirc(5, -42, 1.2); ctx.fill(); for (let i = 0; i < 3; i++) { aCirc(2, -32 + i * 4, 1.1); ctx.fill(); }
  ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(5, -40); ctx.lineTo(12, -39); ctx.lineTo(5, -38); ctx.fill();
  ctx.strokeStyle = '#6b4526'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, -29); ctx.lineTo(17, -36); ctx.lineTo(19, -40); ctx.moveTo(-7, -29); ctx.lineTo(-16, -33); ctx.stroke();
  ctx.fillStyle = '#c83a3a'; ctx.fillRect(-7, -36, 14, 3); ctx.fillRect(-6, -36, 3, 8);
  ctx.restore(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
}
function artEye(o, walk, e) {
  const fy = -24 + Math.sin(G.t * 2.5 + (e ? e.sx : 0)) * 3;
  shadow(0, 0, 11);
  ctx.strokeStyle = shade(o.c2, -0.3); ctx.lineWidth = 2.2;
  for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.3, w = Math.sin(G.t * 4 + i) * 3; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 6, fy + 9); ctx.quadraticCurveTo(Math.sin(a) * 14 + w, fy + 16, Math.sin(a) * 10 + w, fy + 24); ctx.stroke(); }
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  ctx.fillStyle = vgrad(fy - 12, fy + 12, '#ffffff', shade(o.c, -0.2)); aCirc(0, fy, 12); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,30,40,.5)'; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 11, fy + Math.sin(a) * 11); ctx.lineTo(Math.cos(a + 0.3) * 6, fy + Math.sin(a + 0.3) * 6); ctx.stroke(); }
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL;
  const lx = 4 + Math.sin(G.t * 0.7) * 1.5;
  ctx.fillStyle = o.c2; aCirc(lx, fy, 5.5); ctx.fill();
  ctx.fillStyle = '#111'; aEll(lx + 0.5, fy, 1.6, 4); ctx.fill();
  ctx.fillStyle = '#fff'; aCirc(lx - 2, fy - 2, 1.3); ctx.fill();
}
function artSpirit(o, walk, e) {
  const fy = -22 + Math.sin(G.t * 3 + (e ? e.sx : 0)) * 3;
  if (o.kind === 'fire') {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, fy, 0, 0, fy, 26); g.addColorStop(0, 'rgba(255,170,60,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(0, fy, 26); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const ph = G.t * 9 + i * 1.3, h = 14 + Math.sin(ph) * 4, w = 6 - i * 0.6, ox = (i - 2) * 3;
      ctx.fillStyle = i < 2 ? o.c : o.c2; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(ox - w, fy + 8); ctx.quadraticCurveTo(ox - w, fy - h * 0.4, ox + Math.sin(ph) * 2, fy - h); ctx.quadraticCurveTo(ox + w, fy - h * 0.4, ox + w, fy + 8); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a0a00'; aCirc(-2, fy - 1, 1.5); ctx.fill(); aCirc(4, fy - 1, 1.5); ctx.fill();
  } else if (o.kind === 'ghost') {
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = vgrad(fy - 14, fy + 16, '#ffffff', o.c);
    ctx.beginPath(); ctx.moveTo(-11, fy + 12); ctx.lineTo(-11, fy - 4); ctx.quadraticCurveTo(-11, fy - 16, 0, fy - 16); ctx.quadraticCurveTo(11, fy - 16, 11, fy - 4); ctx.lineTo(11, fy + 12);
    for (let i = 0; i < 4; i++) { const xx = 11 - (i + 1) * 5.5, w = Math.sin(G.t * 6 + i) * 2; ctx.quadraticCurveTo(xx + 2.75, fy + 16 + w, xx, fy + 12); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a2a4a'; aEll(-3, fy - 5, 2, 3); ctx.fill(); aEll(4, fy - 5, 2, 3); ctx.fill(); aEll(0.5, fy + 2, 2.5, 2); ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, fy, 0, 0, fy, 24); g.addColorStop(0, 'rgba(150,220,255,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(0, fy, 24); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(0, fy); ctx.rotate(G.t * 0.8);
    const cg = ctx.createLinearGradient(-8, -12, 8, 12); cg.addColorStop(0, '#ffffff'); cg.addColorStop(1, o.c);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(7, 0); ctx.lineTo(0, 13); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) { const a = G.t * 2 + i * 2.1; ctx.fillStyle = '#e8f8ff'; aCirc(Math.cos(a) * 14, fy + Math.sin(a) * 6, 1.6); ctx.fill(); }
  }
}
function artGolem(o, walk, e) {
  const sw = walk ? Math.sin(G.t * 6 + (e ? e.sx : 0)) : 0;
  const stone = o.c, hi = o.c2;
  for (const s of [-1, 1]) { ctx.fillStyle = shade(stone, -0.2); aRR(s * 6 - 4.5, -14 + (s * sw > 0 ? -2 : 0), 9, 14, 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = vgrad(-44, -12, hi, shade(stone, -0.2)); aRR(-14, -44, 28, 32, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(14, -32); ctx.moveTo(-2, -44); ctx.lineTo(1, -12); ctx.stroke(); ctx.strokeStyle = OL;
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 16, -40); ctx.rotate(s * 0.12 + sw * 0.25 * s); ctx.fillStyle = shade(stone, -0.05); aRR(-5, 0, 10, 26, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = shade(stone, -0.15); aRR(-6.5, 22, 13, 9, 3); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = vgrad(-58, -42, hi, stone); aRR(-8, -57, 16, 14, 3); ctx.fill(); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const ec = o.eye || '#ffd23a';
  for (const ex of [-3, 4]) { const g = ctx.createRadialGradient(ex, -51, 0, ex, -51, 5); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, ec); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(ex, -51, 5); ctx.fill(); }
  if (o.lava) { ctx.strokeStyle = `rgba(255,${120 + Math.sin(G.t * 4) * 40 | 0},30,.9)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -40); ctx.lineTo(-3, -32); ctx.lineTo(-7, -22); ctx.moveTo(6, -42); ctx.lineTo(3, -30); ctx.lineTo(9, -18); ctx.stroke(); ctx.lineWidth = 1.5; }
  ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = OL;
  if (o.crystal) { for (const [cx, h] of [[-9, 12], [-2, 16], [6, 11]]) { ctx.fillStyle = '#e8f8ff'; ctx.beginPath(); ctx.moveTo(cx - 3, -44); ctx.lineTo(cx, -44 - h); ctx.lineTo(cx + 3, -44); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  if (o.crown) crown(0, -60, 1.1);
}
function artApe(o, walk, e) {
  const sw = walk ? Math.sin(G.t * 8 + (e ? e.sx : 0)) : 0;
  for (const s of [-1, 1]) { ctx.fillStyle = shade(o.c, -0.25); aRR(s * 5 - 3.5, -12 + (s * sw > 0 ? -2 : 0), 7, 12, 3); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = vgrad(-38, -10, shade(o.c, 0.15), shade(o.c, -0.25)); aEll(0, -24, 14, 15); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; aEll(3, -21, 8, 9); ctx.fill();
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 12, -32); ctx.rotate(s * 0.2 + sw * 0.4 * s); ctx.fillStyle = o.c; aRR(-4, 0, 8, 28, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = shade(o.c2, -0.2); aCirc(0, 28, 4.5); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = o.c; aCirc(4, -40, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; aEll(8, -38, 6, 5); ctx.fill();
  ctx.fillStyle = '#222'; aCirc(6, -42, 1.4); ctx.fill(); aCirc(10, -42, 1.4); ctx.fill();
  ctx.fillStyle = '#3a2010'; ctx.fillRect(6, -36, 5, 1.4);
}
function artDragon(o, walk, e) {
  const flap = Math.sin(G.t * 5 + (e ? e.sx : 0)), fly = -10 - Math.abs(flap) * 4;
  // 翅膀
  ctx.fillStyle = shade(o.c, -0.15);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-2, fly - 14);
    ctx.lineTo(-10, fly - 40 * (0.65 + flap * 0.35 * s)); ctx.lineTo(-30, fly - 28 * (0.6 + flap * 0.4 * s));
    ctx.quadraticCurveTo(-20, fly - 18, -14, fly - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(o.c, -0.4); ctx.beginPath(); ctx.moveTo(-2, fly - 14); ctx.lineTo(-22, fly - 30 * (0.62 + flap * 0.38 * s)); ctx.stroke(); ctx.strokeStyle = OL;
  }
  legs4([-8, 8], fly - 4, 12 - fly * 0.3, walk, shade(o.c, -0.4), 4);
  ctx.fillStyle = o.c; ctx.beginPath(); ctx.moveTo(-14, fly - 8); ctx.quadraticCurveTo(-30, fly - 2, -38, fly + 6); ctx.quadraticCurveTo(-28, fly + 2, -14, fly - 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = vgrad(fly - 20, fly, shade(o.c, 0.2), shade(o.c, -0.3)); aEll(0, fly - 10, 17, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.c2; aEll(3, fly - 5, 10, 4); ctx.fill();
  ctx.fillStyle = o.c; ctx.beginPath(); ctx.moveTo(10, fly - 16); ctx.quadraticCurveTo(16, fly - 30, 22, fly - 30); ctx.lineTo(24, fly - 22); ctx.quadraticCurveTo(18, fly - 20, 16, fly - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(o.c, 0.05); ctx.beginPath(); ctx.moveTo(18, fly - 34); ctx.lineTo(34, fly - 30); ctx.lineTo(34, fly - 25); ctx.lineTo(20, fly - 23); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#efe0c0'; ctx.beginPath(); ctx.moveTo(19, fly - 34); ctx.lineTo(13, fly - 44); ctx.lineTo(22, fly - 35); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23a'; aCirc(24, fly - 30, 1.8); ctx.fill();
  if (Math.sin(G.t * 2.5) > 0.7) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(40, fly - 27, 0, 40, fly - 27, 10); g.addColorStop(0, 'rgba(255,230,120,.9)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = g; aCirc(40, fly - 27, 10); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  if (o.crown) crown(22, fly - 36, 1);
}
// ---- 人形：骷髅、僵尸、卫兵、巫师…… ----
function artHum(o, walk, e, atk) {
  const hunch = o.hunch || 0, lean = hunch * 0.18;
  const skel = o.head === 'skull';
  const body = o.armor || o.cloth || o.skin;
  ctx.save(); ctx.rotate(lean);
  if (o.cape) { const cw = Math.sin(G.t * 5) * 2; ctx.fillStyle = o.cape; ctx.beginPath(); ctx.moveTo(-6, -38); ctx.quadraticCurveTo(-18 + cw, -18, -15 + cw, -1); ctx.lineTo(-1, -5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // 腿
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 4, -14); ctx.rotate(walk * 0.5 * s);
    if (skel) { ctx.strokeStyle = o.skin; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 13); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; }
    else { ctx.fillStyle = shade(body, -0.3); aRR(-3.5, 0, 7, 14, 3); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = skel ? o.skin : '#2a1e14'; aRR(-4, 11, 9, 4, 2); ctx.fill();
    ctx.restore();
  }
  // 身体
  if (skel && !o.armor) {
    ctx.strokeStyle = o.skin; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, -14); ctx.stroke();
    ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-7 + i * 0.5, -36 + i * 5); ctx.quadraticCurveTo(0, -33 + i * 5, 7 - i * 0.5, -36 + i * 5); ctx.stroke(); }
    ctx.fillStyle = o.skin; aEll(0, -15, 7, 3); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
    if (o.cloth) { ctx.fillStyle = o.cloth; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(8, -18); ctx.lineTo(9, -8); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else {
    const g = ctx.createLinearGradient(-11, -40, 11, -12); g.addColorStop(0, shade(body, 0.35)); g.addColorStop(0.5, body); g.addColorStop(1, shade(body, -0.35));
    ctx.fillStyle = g;
    if (o.wpn === 'staff' || o.head === 'hood') { ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(9, -42); ctx.lineTo(14, -2); ctx.quadraticCurveTo(0, 2, -14, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { aRR(-11, -40, 22, 28, 6); ctx.fill(); ctx.stroke(); }
    if (o.armor) { ctx.fillStyle = shade(o.armor, 0.35); aEll(8, -37, 6, 4.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.22)'; aRR(-7, -37, 5, 10, 2); ctx.fill(); }
    if (o.head === 'zombie') { ctx.fillStyle = o.skin; aEll(4, -22, 4, 3); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-4, -18); ctx.lineTo(-2, -14); ctx.stroke(); ctx.strokeStyle = OL; } // 破洞
  }
  // 头
  const hy = -50;
  if (skel) {
    ctx.fillStyle = vgrad(hy - 11, hy + 8, '#ffffff', o.skin); aCirc(1, hy, 9.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.skin; aRR(-3, hy + 5, 9, 6, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1010'; aEll(3, hy - 1, 2.6, 3); ctx.fill(); aEll(-3, hy - 1, 2.2, 2.8); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = o.aura ? o.aura : 'rgba(255,80,60,.9)'; aCirc(3, hy - 1, 1.2); ctx.fill(); aCirc(-3, hy - 1, 1); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-1 + i * 2.5, hy + 6); ctx.lineTo(-1 + i * 2.5, hy + 10); ctx.stroke(); } ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
  } else {
    ctx.fillStyle = o.skin; aCirc(1, hy, 10); ctx.fill(); ctx.stroke();
    if (o.head === 'zombie') {
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(1, hy - 2, 10.5, Math.PI * 1.1, Math.PI * 1.7); ctx.fill();
      ctx.fillStyle = '#fff8c0'; aCirc(5, hy - 1, 2.2); ctx.fill(); ctx.fillStyle = '#111'; aCirc(5.5, hy - 1, 0.9); ctx.fill();
      ctx.strokeStyle = '#3a1a10'; ctx.beginPath(); ctx.moveTo(2, hy + 5); ctx.lineTo(8, hy + 4); ctx.stroke(); ctx.strokeStyle = OL;
      if (o.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = o.glow; ctx.lineWidth = 1.4; const j = () => (Math.random() - 0.5) * 6; ctx.beginPath(); ctx.moveTo(-8, hy - 6); ctx.lineTo(-12 + j(), hy - 14); ctx.lineTo(-8 + j(), hy - 20); ctx.moveTo(10, hy - 4); ctx.lineTo(16 + j(), hy - 10); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = OL; ctx.lineWidth = 1.5; }
    } else if (o.head === 'horn') {
      ctx.fillStyle = '#2a1a10'; aCirc(5, hy - 1, 1.5); ctx.fill();
      ctx.fillStyle = '#ffe2a0'; aCirc(5, hy - 1.5, 0.7); ctx.fill();
      ctx.fillStyle = '#efe0c0'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(1 + s * 5, hy - 7); ctx.quadraticCurveTo(1 + s * 13, hy - 12, 1 + s * 11, hy - 20); ctx.quadraticCurveTo(1 + s * 9, hy - 12, 1 + s * 2, hy - 9); ctx.fill(); ctx.stroke(); }
      ctx.strokeStyle = '#3a1a10'; ctx.beginPath(); ctx.moveTo(3, hy + 5); ctx.lineTo(9, hy + 4); ctx.stroke(); ctx.strokeStyle = OL;
    } else if (o.head === 'helm' || o.head === 'dragon') {
      const hc = o.armor ? shade(o.armor, 0.3) : '#8a8a9a';
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(1, hy - 1, 11, Math.PI, Math.PI * 2); ctx.lineTo(12, hy + 4); ctx.lineTo(-10, hy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.fillRect(2, hy - 1, 9, 2.4);
      if (o.head === 'dragon') { ctx.fillStyle = o.skin; ctx.beginPath(); ctx.moveTo(-6, hy - 9); ctx.lineTo(-10, hy - 20); ctx.lineTo(-2, hy - 11); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4, hy - 11); ctx.lineTo(4, hy - 22); ctx.lineTo(9, hy - 10); ctx.fill(); ctx.stroke(); }
      else { ctx.fillStyle = '#c83a3a'; ctx.beginPath(); ctx.moveTo(-1, hy - 12); ctx.quadraticCurveTo(-10, hy - 18, -13, hy - 8); ctx.quadraticCurveTo(-5, hy - 12, -1, hy - 9); ctx.fill(); }
    } else if (o.head === 'hood') {
      ctx.fillStyle = shade(o.cloth, -0.1); ctx.beginPath(); ctx.moveTo(-11, hy + 6); ctx.quadraticCurveTo(-12, hy - 14, 2, hy - 16); ctx.quadraticCurveTo(10, hy - 12, 12, hy - 2); ctx.lineTo(9, hy + 2); ctx.quadraticCurveTo(6, hy - 8, 0, hy - 8); ctx.quadraticCurveTo(-6, hy - 4, -6, hy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#9fe8ff'; aCirc(5, hy - 1, 1.6); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (o.crown) crown(1, hy - 10, 1);
  // 手臂 + 武器（攻击时往前挥）
  const armA = atk > 0 ? -1.6 + (1 - atk) * 2.8 : 0.35 + Math.sin(G.t * 2 + (e ? e.sx : 0)) * 0.06 + (hunch ? -0.9 : 0);
  ctx.save(); ctx.translate(7, -36); ctx.rotate(armA);
  if (skel) { ctx.strokeStyle = o.skin; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 14); ctx.stroke(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; }
  else { ctx.fillStyle = o.armor ? shade(o.armor, 0.15) : o.cloth ? shade(o.cloth, 0.1) : o.skin; aRR(-3, 0, 7, 14, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = o.skin; aCirc(0.5, 15, 2.6); ctx.fill(); }
  ctx.translate(0.5, 15);
  const w = o.wpn;
  if (w === 'sword') {
    ctx.fillStyle = '#8a7a5a'; aRR(-5, -2, 11, 3.5, 1.2); ctx.fill();
    ctx.fillStyle = vgrad(0, 30, '#e8ecf0', '#7a8490'); ctx.beginPath(); ctx.moveTo(-2.4, 2); ctx.lineTo(2.4, 2); ctx.lineTo(2, 28); ctx.lineTo(0, 32); ctx.lineTo(-2, 28); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (w === 'axe') {
    ctx.fillStyle = '#6b4526'; ctx.fillRect(-1.5, -4, 3, 30);
    ctx.fillStyle = vgrad(14, 30, '#d8dde2', '#6a7480'); ctx.beginPath(); ctx.moveTo(1, 16); ctx.quadraticCurveTo(14, 14, 13, 28); ctx.quadraticCurveTo(8, 24, 1, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (w === 'spear') {
    ctx.fillStyle = '#6b4526'; ctx.fillRect(-1.3, -20, 2.6, 52);
    ctx.fillStyle = '#d8dde2'; ctx.beginPath(); ctx.moveTo(-3, 32); ctx.lineTo(0, 42); ctx.lineTo(3, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c83a3a'; ctx.fillRect(-2.5, 29, 5, 3);
  } else if (w === 'bow') {
    ctx.strokeStyle = '#7a4a24'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(4, 4, 14, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.2) * 14, 4 + Math.sin(-1.2) * 14); ctx.lineTo(4 + Math.cos(1.2) * 14, 4 + Math.sin(1.2) * 14); ctx.stroke();
    ctx.strokeStyle = OL; ctx.lineWidth = 1.5;
  } else if (w === 'staff') {
    ctx.fillStyle = '#4a2a1a'; ctx.fillRect(-1.5, -26, 3, 48);
    ctx.globalCompositeOperation = 'lighter';
    const c = o.aura || (o.cloth ? '#9fe8ff' : '#ff6a3a'), g = ctx.createRadialGradient(0, -30, 0, 0, -30, 11);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(0, -30, 11); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else if (!skel) { ctx.fillStyle = '#e8e0c8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-2 + i * 2, 1); ctx.lineTo(-1.5 + i * 2, 5); ctx.lineTo(-1 + i * 2, 1); ctx.fill(); } } // 爪子
  ctx.restore();
  if (o.shield) {
    ctx.fillStyle = vgrad(-38, -18, shade(o.shield, 0.3), shade(o.shield, -0.3));
    ctx.beginPath(); ctx.moveTo(-14, -38); ctx.lineTo(-2, -38); ctx.lineTo(-2, -26); ctx.quadraticCurveTo(-8, -16, -8, -16); ctx.quadraticCurveTo(-14, -22, -14, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e2b54a'; aCirc(-8, -30, 2.2); ctx.fill();
  }
  ctx.restore();
}
const ARCH = { quad: artQuad, bird: artBird, eagle: artEagle, snake: artSnake, worm: artWorm, centi: artCenti, spider: artSpider, scorp: artScorp, beetle: artBeetle, bat: artBat, frog: artFrog, snowman: artSnowman, eye: artEye, spirit: artSpirit, golem: artGolem, ape: artApe, dragon: artDragon, hum: artHum };
// 每种体型画出来大约多大（用来把 m.size 换算成缩放倍数）
const ARCH_UNIT = { quad: 20, bird: 14, eagle: 20, snake: 15, worm: 17, centi: 20, spider: 18, scorp: 20, beetle: 20, bat: 16, frog: 18, snowman: 24, eye: 20, spirit: 18, golem: 26, ape: 24, dragon: 24, hum: 21 };
const ARCH_TOP = { quad: 40, bird: 30, eagle: 40, snake: 16, worm: 22, centi: 22, spider: 26, scorp: 30, beetle: 28, bat: 44, frog: 26, snowman: 50, eye: 46, spirit: 46, golem: 62, ape: 52, dragon: 60, hum: 64 };
// 画一只怪（或召唤物、诱惑来的怪）。返回它头顶的高度，好放名字和血条
function drawCreature(type, x, y, size, face, opts) {
  const o = MART[type];
  if (!o) return null;
  const k = size / ARCH_UNIT[o.a];
  const walk = opts.moving ? Math.sin(G.t * 10 + (opts.e ? opts.e.sx : x)) : 0;
  if (o.aura || opts.elite) {
    ctx.globalCompositeOperation = 'lighter';
    const col = opts.elite && !o.aura ? '255,200,80' : null;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30 * k);
    g.addColorStop(0, col ? `rgba(${col},.35)` : o.aura + '66'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; aEll(x, y, 30 * k, 12 * k); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.a !== 'bat' && o.a !== 'eye') shadow(x, y + 2, Math.min(60, 15 * k));
  ctx.save();
  ctx.translate(x, y); ctx.scale(face * k, k);
  ctx.lineWidth = 1.5; ctx.strokeStyle = OL; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ARCH[o.a](o, walk, opts.e, opts.atk || 0);
  ctx.restore();
  if (opts.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${Math.min(0.6, opts.flash * 4)})`; aEll(x, y - ARCH_TOP[o.a] * k * 0.45, 18 * k, ARCH_TOP[o.a] * k * 0.5); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  return ARCH_TOP[o.a] * k;
}
function hpBar(x, y, w, frac, col) {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; aRR(x - w / 2 - 1, y - 1, w + 2, 6, 3); ctx.fill();
  ctx.fillStyle = col; aRR(x - w / 2, y, Math.max(0, w * frac), 4, 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - w / 2, y, Math.max(0, w * frac), 1.2);
}
function statusIcons(e, dx, h) {
  if (e.poison > 0) { ctx.fillStyle = 'rgba(130,230,90,.9)'; for (let i = 0; i < 2; i++) { const t = (G.t + i * 0.5) % 1; aCirc(e.x + dx - 4 + i * 8, e.y - h - t * 12, 2.2 * (1 - t) + 0.6); ctx.fill(); } }
  if (e.slow > 0) { ctx.strokeStyle = 'rgba(180,235,255,.9)'; ctx.lineWidth = 1.4; const cx = e.x - dx, cy = e.y - h; for (let i = 0; i < 3; i++) { const a = i * 1.05; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4); ctx.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); ctx.stroke(); } }
}
drawEnemy = function (e) {
  const m = e.m;
  if (m.rogue) return drawRogue(e);
  const mv = artMoving(e);
  if (e._lastCd !== undefined && e.cd > e._lastCd + 0.3) e._atkT = G.t; // cd 突然变大 = 刚出手
  e._lastCd = e.cd;
  const atk = e._atkT && G.t - e._atkT < 0.3 ? (G.t - e._atkT) / 0.3 : 0;
  const top = drawCreature(e.type, e.x, e.y, m.size, e.face, { moving: mv, e, flash: e.flash, elite: m.elite, atk });
  if (top === null) { // 没有画法的怪：退回原来的表情符号
    shadow(e.x, e.y + m.size * 0.6, m.size);
    ctx.globalAlpha = e.flash > 0 ? 0.5 : 1; emoji(m.ic || '👾', e.x, e.y - m.size * 0.6, m.size * 2.1, e.face > 0); ctx.globalAlpha = 1;
  }
  const h = top || m.size * 1.8;
  if (m.boss) label('👑 ' + m.n, e.x, e.y - h - 20, '#ffb07a', 15);
  else if (m.elite) label('⭐' + m.n, e.x, e.y - h - 16, '#ffcf4a', 12);
  statusIcons(e, m.size, h * 0.8);
  if (e.hp < m.hp || m.boss) hpBar(e.x, e.y - h - (m.boss ? 10 : 8), m.boss ? 120 : Math.max(30, m.size * 2.2), e.hp / m.hp, m.boss ? '#ff4a2a' : '#e8402e');
};
drawPet = function (pet) {
  const ghost = G.player.invis > 0 && G.player.invisAll;
  ctx.globalAlpha = ghost ? 0.45 : 1;
  const top = drawCreature(pet.kind === 'beast' ? '_beast' : '_bone', pet.x, pet.y, pet.kind === 'beast' ? 26 : 19, pet.face, { moving: artMoving(pet), e: pet, flash: pet.flash });
  ctx.globalAlpha = 1;
  const lvl = S.pet && S.pet.lv ? ' Lv' + S.pet.lv : '';
  label(pet.n + lvl, pet.x, pet.y - top - 18, S.pet && S.pet.lv >= 7 ? '#ffe08a' : '#bfe6ff', 11);
  hpBar(pet.x, pet.y - top - 9, 38, pet.hp / pet.maxHp, '#6fd8ff');
};
drawCharm = function (a) {
  const ghost = G.player.invis > 0 && G.player.invisAll;
  ctx.globalAlpha = ghost ? 0.45 : 1;
  let top = drawCreature(a.type, a.x, a.y, a.size, a.face, { moving: artMoving(a), e: a, flash: a.flash });
  if (top === null) { shadow(a.x, a.y + 4, a.size * 0.8); emoji(a.ic, a.x, a.y - a.size * 0.4, a.size * 1.5, a.face > 0); top = a.size * 1.5; }
  ctx.globalAlpha = 1;
  // 粉色心形光圈，表示是自己人
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,140,210,${0.4 + Math.sin(G.t * 4) * 0.15})`; ctx.lineWidth = 2; aEll(a.x, a.y + 2, a.size * 1.1, a.size * 0.42); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  label('💞' + a.n, a.x, a.y - top - 18, '#ffb0e6', 11);
  hpBar(a.x, a.y - top - 9, 36, a.hp / a.maxHp, '#ff8ad8');
};
drawLoot = function (l) {
  const c = QUALITY[l.g.q].c, tw = (Math.sin(G.t * 4 + l.x) + 1) / 2;
  if (l.t < 15 && Math.floor(G.t * 4) % 2) return;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; aEll(l.x, l.y + 4, 12, 4); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(l.x, l.y - 4, 0, l.x, l.y - 4, 16 + tw * 6); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55 + l.g.q * 0.08; ctx.fillStyle = g; aCirc(l.x, l.y - 4, 16 + tw * 6); ctx.fill(); ctx.globalAlpha = 1;
  if (l.g.q >= 3) { ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(l.x, l.y - 4); ctx.lineTo(l.x, l.y - 46 - tw * 10); ctx.stroke(); ctx.globalAlpha = 1; } // 好装备有光柱
  ctx.globalCompositeOperation = 'source-over';
  emoji(SLOT_IC[l.g.s], l.x, l.y - 6, 16);
  label(gearName(l.g), l.x, l.y - 24, c, 11);
};

/* =============================================================
   主城：房子、铁匠铺、任务板、城门、NPC
   ============================================================= */
function aRoof(x, y, w, h, col, eave) {
  const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, shade(col, -0.25));
  ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x - w / 2 - eave, y); ctx.quadraticCurveTo(x - w / 4, y - h * 0.45, x, y - h); ctx.quadraticCurveTo(x + w / 4, y - h * 0.45, x + w / 2 + eave, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(x - (w / 2 + eave) * (1 - t) - 2, y - h * t * 0.9); ctx.lineTo(x + (w / 2 + eave) * (1 - t) + 2, y - h * t * 0.9); ctx.stroke(); }
  ctx.strokeStyle = OL;
}
function aWall(x, y, w, h, col) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, shade(col, 0.15)); g.addColorStop(1, shade(col, -0.2));
  ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeRect(x - w / 2, y - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let yy = y - h + 9; yy < y; yy += 9) { ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); ctx.stroke(); }
  ctx.strokeStyle = OL;
}
function aDoor(x, y, w, h) { ctx.fillStyle = '#5a3a1a'; aRR(x - w / 2, y - h, w, h, [w / 2, w / 2, 0, 0]); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e2b54a'; aCirc(x + w * 0.25, y - h * 0.45, 1.6); ctx.fill(); }
function aWindow(x, y, w, h) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.strokeStyle = '#6b4526'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke(); ctx.strokeStyle = OL; }
drawBuilding = function (n) {
  const x = n.x, y = n.y;
  if (n.id === 'quest') {
    shadow(x, y + 30, 46);
    ctx.fillStyle = '#6b4423'; ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
    aRR(x - 34, y - 14, 7, 46, 2); ctx.fill(); ctx.stroke(); aRR(x + 27, y - 14, 7, 46, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = vgrad(y - 56, y - 6, '#c8975a', '#8a6034'); aRR(x - 42, y - 56, 84, 50, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.moveTo(x - 48, y - 54); ctx.lineTo(x, y - 72); ctx.lineTo(x + 48, y - 54); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [px, py, w, h, r] of [[-34, -50, 24, 30, -0.05], [-6, -48, 22, 22, 0.06], [18, -50, 20, 26, -0.03]]) { ctx.save(); ctx.translate(x + px + w / 2, y + py + h / 2); ctx.rotate(r); ctx.fillStyle = '#f3e7c4'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = 'rgba(80,60,30,.5)'; ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 3, -h / 2 + 5 + i * 6); ctx.lineTo(w / 2 - 3, -h / 2 + 5 + i * 6); ctx.stroke(); } ctx.fillStyle = '#c83a2a'; aCirc(0, -h / 2 + 1, 1.6); ctx.fill(); ctx.restore(); }
    if (S.quests.some(questDone)) { const b = Math.sin(G.t * 5) * 3; ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = OL; aRR(x - 4, y - 104 + b, 8, 18, 3); ctx.fill(); ctx.stroke(); aCirc(x, y - 80 + b, 4); ctx.fill(); ctx.stroke(); }
    label('📜 任务板', x, y + 46, '#fff', 13);
    return;
  }
  if (n.id === 'gate') {
    shadow(x, y + 10, 80);
    for (const s of [-1, 1]) {
      const px = x + s * 58;
      ctx.fillStyle = vgrad(y - 80, y + 10, '#b0a898', '#6e665a'); ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
      ctx.fillRect(px - 12, y - 78, 24, 88); ctx.strokeRect(px - 12, y - 78, 24, 88);
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; for (let yy = y - 70; yy < y + 10; yy += 10) { ctx.beginPath(); ctx.moveTo(px - 12, yy); ctx.lineTo(px + 12, yy); ctx.stroke(); } ctx.strokeStyle = OL;
      ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(px - 16, y - 78); ctx.lineTo(px, y - 96); ctx.lineTo(px + 16, y - 78); ctx.closePath(); ctx.fill(); ctx.stroke();
      const fl = Math.sin(G.t * 4 + s) * 4; ctx.fillStyle = '#c83a3a'; ctx.beginPath(); ctx.moveTo(px, y - 96); ctx.lineTo(px, y - 116); ctx.lineTo(px + 16 * s + fl * s, y - 110); ctx.lineTo(px, y - 104); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = vgrad(y - 84, y - 64, '#a87a44', '#6b4526'); aRR(x - 70, y - 84, 140, 20, 3); ctx.fill(); ctx.stroke();
    label('苍岚城', x, y - 74, '#ffe9a8', 13);
    label('🗺️ 出城冒险', x, y + 26, '#ffe9a8', 13);
    return;
  }
  const isShop = n.id === 'shop';
  shadow(x, y + 30, 92);
  aWall(x, y + 30, 140, 80, isShop ? '#e7cf9f' : '#8f8a84');
  aRoof(x, y - 48, 140, 58, isShop ? '#2f6a98' : '#4a4446', 14);
  if (!isShop) { ctx.fillStyle = '#5a5452'; ctx.fillRect(x + 36, y - 96, 14, 30); ctx.strokeRect(x + 36, y - 96, 14, 30); for (let i = 0; i < 3; i++) { const t = (G.t * 0.5 + i / 3) % 1; ctx.fillStyle = `rgba(200,200,200,${0.4 * (1 - t)})`; aCirc(x + 43 + Math.sin(t * 6) * 4, y - 100 - t * 40, 5 + t * 8); ctx.fill(); } }
  aDoor(x, y + 30, 26, 38);
  aWindow(x - 56, y - 22, 20, 16); aWindow(x + 36, y - 22, 20, 16);
  if (isShop) {
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d9443a'; ctx.beginPath(); ctx.moveTo(x - 76 + i * 21.7, y - 48); ctx.lineTo(x - 54 + i * 21.7, y - 48); ctx.lineTo(x - 54 + i * 21.7, y - 34); ctx.quadraticCurveTo(x - 65 + i * 21.7, y - 30, x - 76 + i * 21.7, y - 34); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#8a5a2a'; aRR(x + 40, y + 6, 36, 22, 2); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#e8343a', '#2f7bff', '#ffd23a'][i]; aCirc(x + 48 + i * 10, y + 4, 3.5); ctx.fill(); }
    drawHuman(x + 58, y + 40, { face: -1, cls: 'blade', npc: true, body: '#5a8a3a', hair: '#6a4a2a', wpn: '#ccc', swing: 0 });
  } else {
    ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(x - 48, y + 16, 0, x - 48, y + 16, 26 + Math.sin(G.t * 9) * 3); fg.addColorStop(0, 'rgba(255,170,60,.8)'); fg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fg; aCirc(x - 48, y + 16, 30); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a3a3e'; aRR(x - 60, y + 8, 26, 20, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 56, y + 12, 18, 6);
    ctx.fillStyle = '#4a4a50'; ctx.beginPath(); ctx.moveTo(x + 24, y + 30); ctx.lineTo(x + 28, y + 20); ctx.lineTo(x + 18, y + 18); ctx.lineTo(x + 46, y + 16); ctx.lineTo(x + 40, y + 20); ctx.lineTo(x + 42, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke(); // 铁砧
    drawHuman(x + 62, y + 40, { face: -1, cls: 'blade', npc: true, body: '#7a5a3a', hair: '#2a1a10', wpn: '#ccc', swing: (G.t % 1.2) < 0.22 ? 0.22 - (G.t % 1.2) : 0, npcItem: 'hammer' });
  }
  label(isShop ? '🏪 杂货铺' : '⚒️ 铁匠铺', x, y + 52, '#fff', 13);
};

/* =============================================================
   粒子：打中、打死、受伤时的火花（只是装饰，不影响战斗）
   ============================================================= */
function burst(x, y, col, n, spd) {
  if (ART.parts.length > 260) return;
  for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = (0.4 + Math.random() * 0.6) * (spd || 140); ART.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: 0.35 + Math.random() * 0.35, c: col, r: 1.5 + Math.random() * 2 }); }
}
const _hitEnemy = hitEnemy;
hitEnemy = function (e, atk, st, src, ally) {
  const hp0 = e.hp;
  const r = _hitEnemy(e, atk, st, src, ally);
  if (src !== 'dot' && src !== 'wall' && e.m) burst(e.x, e.y - e.m.size, e.hp <= 0 ? '#ffe9a0' : '#fff4cf', e.hp <= 0 ? 12 : 5, e.hp <= 0 ? 170 : 130);
  if (hp0 > 0 && e.hp <= 0 && e.m) burst(e.x, e.y - e.m.size * 0.8, e.m.boss ? '#ffb03a' : '#c9ff9a', e.m.boss ? 40 : 10, 120);
  return r;
};
const _hurtPlayer = hurtPlayer;
hurtPlayer = function (d) { const p = G.player, hp0 = p.hp; const r = _hurtPlayer(d); if (p.hp < hp0) burst(p.x, p.y - 30, '#ff6a5a', 5, 110); return r; };

/* =============================================================
   整体绘制
   ============================================================= */
const OUTDOOR = { forest: 1, swamp: 1, desert: 1, snow: 1 };
function flame(x, y, h, ph, a) {
  ctx.fillStyle = `rgba(255,${120 + (Math.sin(ph) * 40 | 0)},30,${a})`;
  ctx.beginPath(); ctx.moveTo(x - h * 0.35, y); ctx.quadraticCurveTo(x - h * 0.4, y - h * 0.5, x + Math.sin(ph) * h * 0.15, y - h); ctx.quadraticCurveTo(x + h * 0.4, y - h * 0.5, x + h * 0.35, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(255,240,150,${a})`;
  ctx.beginPath(); ctx.moveTo(x - h * 0.15, y); ctx.quadraticCurveTo(x - h * 0.18, y - h * 0.3, x + Math.sin(ph) * h * 0.08, y - h * 0.55); ctx.quadraticCurveTo(x + h * 0.18, y - h * 0.3, x + h * 0.15, y); ctx.closePath(); ctx.fill();
}
render = function () {
  const z = ZONES[G.zone], p = G.player;
  const dt = Math.max(0, Math.min(0.05, G.t - ART.lastT)); ART.lastT = G.t;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c0e0a'; ctx.fillRect(0, 0, cv.width, cv.height);
  G.cam.x = z.w < G.vw ? (z.w - G.vw) / 2 : clamp(p.x - G.vw / 2, 0, z.w - G.vw);
  G.cam.y = z.h < G.vh ? (z.h - G.vh) / 2 : clamp(p.y - G.vh / 2, 0, z.h - G.vh);
  const k = G.dpr * G.scale;
  ctx.setTransform(k, 0, 0, k, -G.cam.x * k, -G.cam.y * k);
  // 地面贴图（只铺镜头看得到的那一块）
  const x0 = Math.max(0, G.cam.x - 4), y0 = Math.max(0, G.cam.y - 4), x1 = Math.min(z.w, G.cam.x + G.vw + 4), y1 = Math.min(z.h, G.cam.y + G.vh + 4);
  ctx.fillStyle = tileFor(G.zone); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

  if (G.zone === 'village') {
    // 石板广场 + 土路
    ctx.fillStyle = 'rgba(60,80,30,.35)'; ctx.fillRect(514, 194, 72, 762); ctx.fillRect(244, 424, 712, 62);
    ctx.fillStyle = dirtPattern();
    ctx.fillRect(520, 200, 60, 750); ctx.fillRect(250, 430, 700, 50); ctx.fillRect(560, 250, 260, 40); ctx.fillRect(560, 560, 280, 40);
    ctx.fillStyle = 'rgba(60,50,30,.4)'; aCirc(550, 455, 78); ctx.fill();
    ctx.fillStyle = cobblePattern(); aCirc(550, 455, 72); ctx.fill();
    // 井
    shadow(550, 470, 30);
    ctx.fillStyle = vgrad(430, 470, '#a8a298', '#6a645a'); ctx.strokeStyle = OL; ctx.lineWidth = 1.6; aEll(550, 458, 26, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a5a88'; aEll(550, 455, 18, 9); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,.5)'; aEll(545, 453, 6, 2.5); ctx.fill();
    ctx.fillStyle = '#6b4526'; ctx.fillRect(526, 420, 5, 38); ctx.fillRect(569, 420, 5, 38); ctx.strokeRect(526, 420, 5, 38); ctx.strokeRect(569, 420, 5, 38);
    ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(518, 424); ctx.lineTo(550, 404); ctx.lineTo(582, 424); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    // 传送阵：旋转的光环
    const pt = G.portal;
    ctx.fillStyle = 'rgba(30,40,60,.55)'; aEll(pt.x, pt.y, 52, 23); ctx.fill();
    ctx.strokeStyle = 'rgba(200,190,170,.8)'; ctx.lineWidth = 3; aEll(pt.x, pt.y, 52, 23); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const t = (G.t * 0.6 + i / 3) % 1; ctx.strokeStyle = `rgba(120,210,255,${0.7 * (1 - t)})`; ctx.lineWidth = 2.5; aEll(pt.x, pt.y, 44 * t + 6, (44 * t + 6) * 0.44); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,210,255,.18)'; aEll(pt.x, pt.y, 46, 20); ctx.fill();
    for (let i = 0; i < 8; i++) { const a = G.t * 0.8 + i * 0.785; ctx.fillStyle = 'rgba(180,235,255,.8)'; aCirc(pt.x + Math.cos(a) * 46, pt.y + Math.sin(a) * 20, 2); ctx.fill(); }
    for (let i = 0; i < 4; i++) { const t = (G.t * 0.7 + i / 4) % 1; ctx.fillStyle = `rgba(160,225,255,${0.6 * (1 - t)})`; aCirc(pt.x + Math.sin(i * 2.3) * 24, pt.y - t * 60, 2.4); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    label(z.prev ? '⬆️ 回上一层' : '🏡 回城传送阵', pt.x, pt.y + 38, '#cdf1ff', 12);
    if (G.stairs) { // 往下的石阶
      const sx = G.stairs.x, sy = G.stairs.y;
      ctx.fillStyle = '#5a5248'; ctx.strokeStyle = OL; ctx.lineWidth = 1.6; aEll(sx, sy, 56, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0806'; aEll(sx, sy + 2, 46, 21); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = shade('#8a8072', -i * 0.15); aRR(sx - 34 + i * 4, sy - 14 + i * 6, 68 - i * 8, 5, 1.5); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,210,110,${0.45 + Math.sin(G.t * 4) * 0.25})`; ctx.lineWidth = 3; aEll(sx, sy, 58, 29); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      label('⬇️ ' + ZONES[G.stairs.to].n, sx, sy + 44, '#ffe08a', 12);
    }
    for (const w of G.walls) { // 火墙
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r); g.addColorStop(0, 'rgba(255,140,40,.4)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; aEll(w.x, w.y, w.r, w.r * 0.6); ctx.fill();
      for (let i = 0; i < 11; i++) { const a = i * 0.571 + w.x; flame(w.x + Math.cos(a) * w.r * 0.7, w.y + Math.sin(a) * w.r * 0.42, 18 + Math.sin(G.t * 9 + i) * 6, G.t * 10 + i, 0.75); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (G.nest) {
      const n = G.nest;
      ctx.fillStyle = `rgba(110,10,10,${0.16 + Math.sin(G.t * 2) * 0.04})`; aCirc(n.x, n.y, n.r); ctx.fill();
      ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(255,80,60,.55)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      label('⚠️ 怪物巢穴（怪多·精英多·掉落好）', n.x, n.y - n.r - 12, '#ffb0a0', 13);
    }
  }

  const list = [];
  const vis = (o, m = 160) => o.x > G.cam.x - m && o.x < G.cam.x + G.vw + m && o.y > G.cam.y - m && o.y < G.cam.y + G.vh + m * 1.6;
  for (const d of G.decor) if (vis(d)) list.push({ y: d.y, f: () => drawDeco(d, z.theme) });
  for (const nd of G.nodes) if (vis(nd)) list.push({ y: nd.y, f: () => drawNode(nd, z.theme) });
  for (const n of G.npcs) list.push({ y: n.y + 30, f: () => (n.id === 'house' ? drawHouse(n) : drawBuilding(n)) });
  for (const c of G.critters) list.push({ y: c.y, f: () => (drawCreature(c.ic === '🐈' ? '_cat' : 'hen', c.x, c.y, c.ic === '🐈' ? 14 : 13, c.f < 0 ? -1 : 1, { moving: artMoving(c), e: c }) === null ? emoji(c.ic, c.x, c.y - 10, 22, c.f < 0) : 0) });
  for (const e of G.enemies) if (vis(e)) list.push({ y: e.y, f: () => drawEnemy(e) });
  for (const l of G.loot) if (vis(l)) list.push({ y: l.y - 6, f: () => drawLoot(l) });
  if (G.pet) list.push({ y: G.pet.y, f: () => drawPet(G.pet) });
  for (const a of G.charmed) list.push({ y: a.y, f: () => drawCharm(a) });
  list.push({ y: p.y, f: () => drawPlayer(p) });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();

  for (const w of G.warns) { // 红圈预警
    const kk = 1 - w.t / w.life;
    ctx.fillStyle = `rgba(255,40,30,${0.12 + 0.22 * kk})`; aEll(w.x, w.y, w.r, w.r * 0.55); ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,60,.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,60,40,.5)'; aEll(w.x, w.y, w.r * kk, w.r * 0.55 * kk); ctx.fill();
  }
  // 弹丸：用叠加发光，不用 shadowBlur（手机上快很多）
  ctx.globalCompositeOperation = 'lighter';
  const orb = (b, r) => { const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.4); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, b.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(b.x, b.y, r * 2.4); ctx.fill(); };
  for (const b of G.proj) orb(b, 7);
  for (const b of G.pproj) { orb(b, b.big ? 9 : 6); if (b.px !== undefined) { ctx.strokeStyle = b.c; ctx.globalAlpha = 0.5; ctx.lineWidth = b.big ? 6 : 4; ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1; } b.px = b.x; b.py = b.y; }
  for (const f of G.fx) {
    const a = 1 - f.t / f.life;
    if (f.k === 'bolt') {
      const j = (n) => Math.sin(f.x * 0.37 + n * 12.9 + f.t * 40) * 14;
      for (const [w, col] of [[9, `rgba(255,240,140,${0.35 * a})`], [3.5, `rgba(255,255,230,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(f.x + j(0), f.y - 260);
        for (let i = 1; i <= 6; i++) ctx.lineTo(f.x + (i < 6 ? j(i) : 0), f.y - 260 + i * 43);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(f.x, f.y - 6, 0, f.x, f.y - 6, 50); g.addColorStop(0, `rgba(255,250,200,${0.7 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; aCirc(f.x, f.y - 6, 50); ctx.fill();
    } else if (f.k === 'dash') {
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = 12 * a + 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 16); ctx.lineTo(f.x2, f.y2 - 16); ctx.stroke();
    } else if (f.k === 'ring') {
      const r = f.r * (0.35 + 0.65 * (f.t / f.life));
      ctx.strokeStyle = f.c || '#a0d2ff'; ctx.globalAlpha = a; ctx.lineWidth = 7 * a + 2;
      aEll(f.x, f.y - 6, r, r * 0.55); ctx.stroke();
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = f.c || '#a0d2ff'; aEll(f.x, f.y - 6, r, r * 0.55); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2, r = f.r * (f.t / f.life);
        ctx.fillStyle = `rgba(230,240,255,${a * 0.55})`; aCirc(f.x + Math.cos(an) * r, f.y - 10 + Math.sin(an) * r * 0.6, 6 * a + 1); ctx.fill();
      }
    }
  }
  // 粒子
  for (const q of ART.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; const a = 1 - q.t / q.life; if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = q.c; aCirc(q.x, q.y, q.r * a + 0.4); ctx.fill(); } }
  ctx.globalAlpha = 1;
  ART.parts = ART.parts.filter((q) => q.t < q.life);
  ctx.globalCompositeOperation = 'source-over';
  // 飘字：刚出现时放大一下
  for (const t of G.texts) {
    if (t.t < 0) continue;
    const pop = t.t < 0.12 ? 1 + (0.12 - t.t) * 4 : 1;
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t.t - t.life * 0.5) / (t.life * 0.5));
    const crit = /暴击/.test(t.text);
    ctx.font = `900 ${Math.round((t.size || 14) * 1.2 * pop)}px ${ART_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = crit ? '#5a1a00' : 'rgba(0,0,0,.85)';
    const yy = t.y - t.t * 40;
    ctx.strokeText(t.text, t.x, yy); ctx.fillStyle = t.color || '#fff'; ctx.fillText(t.text, t.x, yy);
    ctx.globalAlpha = 1;
  }
  // 云影（野外）
  if (OUTDOOR[z.theme] || G.zone === 'village') {
    if (!ART.clouds) ART.clouds = [0, 1, 2, 3, 4].map((i) => ({ x: i * 1400 + Math.random() * 600, y: Math.random() * 6000, r: 280 + Math.random() * 180 }));
    for (const c of ART.clouds) {
      c.x += 14 * dt; if (c.x - c.r > Math.max(z.w, 7000)) { c.x = -c.r; c.y = Math.random() * z.h; }
      if (c.x + c.r < G.cam.x || c.x - c.r > G.cam.x + G.vw || c.y + c.r < G.cam.y || c.y - c.r > G.cam.y + G.vh) continue;
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r); g.addColorStop(0, 'rgba(10,25,20,.15)'); g.addColorStop(1, 'rgba(10,25,20,0)');
      ctx.fillStyle = g; ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
    }
  }

  // 屏幕光影
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const W = cv.width, H = cv.height;
  if (OUTDOOR[z.theme] || G.zone === 'village') {
    const sun = ctx.createLinearGradient(0, 0, W, H); sun.addColorStop(0, z.theme === 'snow' ? 'rgba(220,240,255,.10)' : 'rgba(255,240,190,.10)'); sun.addColorStop(0.6, 'rgba(255,240,190,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  } else {
    // 洞穴、火山、深渊、魔殿：四周暗，只有身边亮
    const px = (p.x - G.cam.x) * k, py = (p.y - 30 - G.cam.y) * k, R = Math.min(W, H) * 0.62;
    const tint = z.theme === 'volcano' ? '40,8,0' : z.theme === 'abyss' ? '12,4,28' : z.theme === 'chaos' ? '30,0,8' : '4,6,12';
    const dk = ctx.createRadialGradient(px, py, R * 0.32, px, py, R * 1.35);
    dk.addColorStop(0, `rgba(${tint},0)`); dk.addColorStop(1, `rgba(${tint},.62)`);
    ctx.fillStyle = dk; ctx.fillRect(0, 0, W, H);
    if (z.theme === 'volcano') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,80,20,${0.04 + Math.sin(G.t * 1.5) * 0.015})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  }
  if (G.deadT > 0) { ctx.fillStyle = 'rgba(80,0,0,.35)'; ctx.fillRect(0, 0, W, H); }
  drawMinimap(z);
};
