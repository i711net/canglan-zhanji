'use strict';
/* =========================================================
   苍岚战纪 —— 手机网页单机 RPG（云端存档）
   三职业 / 打怪爆装备 / 强化 / 红名恶徒 / BOSS / 挂机
   （在《苍岚城物语》的引擎上改的）
   ========================================================= */

const API = '/api';
const VERSION = '20261112e'; // 每次更新改这里和 index.html 里的 ?v=，手机就会加载新版
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmt = (n) => (n >= 100000 ? (n / 10000).toFixed(1) + '万' : String(Math.floor(n)));
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function strHash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/* ===================== 游戏数据 ===================== */
const ITEMS = {
  wood: { n: '木材', ic: '🌲', p: 2 },
  stone: { n: '石料', ic: '🧱', p: 2 },
  herb: { n: '草药', ic: '🌿', p: 4 },
  slime_gel: { n: '鲜肉', ic: '🍖', p: 3 },
  boar_tusk: { n: '獠牙', ic: '🦷', p: 6 },
  leather: { n: '皮革', ic: '👜', p: 5 },
  bat_wing: { n: '蝠翼', ic: '🦇', p: 9 },
  silk: { n: '蛛丝', ic: '🕸️', p: 10 },
  iron_ore: { n: '铁矿石', ic: '⚙️', p: 12 },
  stinger: { n: '毒针', ic: '📌', p: 18 },
  bone: { n: '骸骨', ic: '🦴', p: 16 },
  sand_crystal: { n: '琥珀晶', ic: '🔶', p: 30 },
  old_coin: { n: '古代金币', ic: '🏅', p: 45 },
  wolf_fur: { n: '狼皮', ic: '🐺', p: 28 },
  ice_crystal: { n: '寒晶', ic: '❄️', p: 45 },
  ember: { n: '余烬', ic: '🔥', p: 40 },
  magma_core: { n: '石像核心', ic: '🌋', p: 80 },
  dragon_scale: { n: '王者鳞片', ic: '🐲', p: 300 },
  ghost_essence: { n: '幽魂精华', ic: '👻', p: 60 },
  croc_scale: { n: '硬甲壳', ic: '🪲', p: 55 },
  poison_gland: { n: '毒腺', ic: '☠️', p: 50 },
  demon_horn: { n: '兽角', ic: '📯', p: 110 },
  abyss_shard: { n: '陵墓碎片', ic: '🔮', p: 120 },
  demon_heart: { n: '虫母之心', ic: '🖤', p: 800 },
  thunder_feather: { n: '箭羽', ic: '🪶', p: 160 },
  storm_core: { n: '魔核', ic: '🌪️', p: 180 },
  sky_steel: { n: '魔钢', ic: '🔩', p: 150 },
  lion_mane: { n: '王者鬃毛', ic: '🦁', p: 2500 },
  chaos_crystal: { n: '混沌晶石', ic: '🟣', p: 260 },
  blood_ruby: { n: '血红宝石', ic: '♦️', p: 280 },
  ancient_key: { n: '远古钥匙', ic: '🗝️', p: 240 },
  chaos_heart: { n: '魔蛛之心', ic: '💗', p: 6000 },
  upgrade_stone: { n: '强化石', ic: '💎', p: 25, quest: true },
  upgrade_stone_2: { n: '高级强化石', ic: '💠', p: 120, quest: true },
  upgrade_stone_3: { n: '神圣强化石', ic: '🔱', p: 400, quest: true },
  upgrade_stone_4: { n: '至尊强化石', ic: '🌟', p: 1500, quest: true },
  potion_s: { n: '小药水', ic: '🧪', p: 5, heal: 80 },
  potion_m: { n: '中药水', ic: '⚗️', p: 20, heal: 260 },
  potion_l: { n: '大药水', ic: '🍶', p: 60, heal: 700 },
  potion_xl: { n: '特大药水', ic: '🏺', p: 150, heal: 2000 },
  potion_xxl: { n: '神圣药水', ic: '💖', p: 400, heal: 5000 },
  // 灵泉：回复灵力（放技能用）
  mana_s: { n: '小灵泉', ic: '🔹', p: 5, mana: 60 },
  mana_m: { n: '中灵泉', ic: '🔷', p: 20, mana: 220 },
  mana_l: { n: '大灵泉', ic: '💙', p: 60, mana: 700 },
  mana_xl: { n: '特大灵泉', ic: '🧿', p: 150, mana: 2000 },
  // 加速饮料：只能在杂货铺买，不能出售
  speed_s: { n: '疾风饮料', ic: '🥤', p: 0, speed: 1.5, dur: 90, nosell: true },
  speed_l: { n: '狂风饮料', ic: '🧃', p: 0, speed: 2, dur: 90, nosell: true },
  speed_xl: { n: '雷霆饮料', ic: '⚡', p: 0, speed: 2, dur: 300, nosell: true },
};
const POTION_ORDER = ['potion_s', 'potion_m', 'potion_l', 'potion_xl', 'potion_xxl'];
const MANA_ORDER = ['mana_s', 'mana_m', 'mana_l', 'mana_xl'];
const DRINK_ORDER = ['speed_xl', 'speed_l', 'speed_s']; // 默认先喝效果最强的

// 怪物属性按等级查表（等级之间线性插值），每只怪再乘自己的倍率
const LV_PTS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 50];
const CURVE = {
  hp: [30, 110, 240, 470, 730, 1500, 2900, 4800, 6500, 12000],
  atk: [6, 18, 33, 54, 81, 160, 250, 330, 440, 640],
  def: [0, 5, 12, 20, 32, 50, 88, 130, 160, 230],
  exp: [6, 26, 55, 105, 200, 350, 680, 1150, 1650, 3000],
  gold: [2, 7, 13, 22, 34, 48, 85, 140, 200, 320],
};
function curve(k, lv) {
  const a = CURVE[k];
  if (lv <= 1) return a[0];
  for (let i = 1; i < LV_PTS.length; i++) if (lv <= LV_PTS[i]) {
    const t = (lv - LV_PTS[i - 1]) / (LV_PTS[i] - LV_PTS[i - 1]);
    return a[i - 1] + (a[i] - a[i - 1]) * t;
  }
  return a[a.length - 1];
}
// 小怪：o.hp / o.atk 是倍率；size 是体型（主角大约 20）；passive 不主动打人；ranged 远程
function mon(n, ic, lv, drops, o = {}) {
  const g = curve('gold', lv), h = o.hp || 1;
  return Object.assign({ n, ic, lv, hp: Math.round(curve('hp', lv) * h), atk: Math.round(curve('atk', lv) * (o.atk || 1)), def: Math.round(curve('def', lv)),
    exp: Math.round(curve('exp', lv) * Math.sqrt(h)), gold: [Math.round(g * 0.7), Math.round(g * 1.3)], spd: o.spd || 70, size: o.size || 20, drops }, o.x || {});
}
// BOSS：血很厚、体型大，x 里可以带 slam（红圈重击）和 ranged（弹幕）
function boss(n, ic, lv, drops, o = {}) {
  const g = curve('gold', lv);
  return Object.assign({ n, ic, lv, hp: Math.round(curve('hp', lv) * (o.hp || 12)), atk: Math.round(curve('atk', lv) * 1.5), def: Math.round(curve('def', lv) * 1.3),
    exp: Math.round(curve('exp', lv) * (o.exp || 15)), gold: [Math.round(g * 30), Math.round(g * 50)], spd: o.spd || 65, size: o.size || 50, boss: true, drops }, o.x || {});
}
const shot = (c, keep) => ({ range: 300, keep: keep === undefined ? 170 : keep, cd: 2.1, spd: 280, c });
const MONS = {
  // 城郊草原
  hen: mon('鸡', '🐔', 1, [['slime_gel', 0.7]], { hp: 0.6, atk: 0.6, size: 13, spd: 55, x: { passive: true } }),
  deer: mon('鹿', '🦌', 2, [['slime_gel', 0.6], ['leather', 0.45]], { hp: 1.2, size: 22, spd: 85, x: { passive: true } }),
  boar: mon('野猪', '🐗', 3, [['boar_tusk', 0.55], ['leather', 0.4]], { size: 20 }),
  snake: mon('草蛇', '🐍', 4, [['herb', 0.5], ['boar_tusk', 0.2]], { hp: 0.8, atk: 1.15, size: 15, spd: 80 }),
  // 幽暗密林
  wolf: mon('森林狼', '🐺', 5, [['leather', 0.5], ['wolf_fur', 0.15]], { size: 20, spd: 105 }),
  spider: mon('毒蜘蛛', '🕷️', 6, [['silk', 0.65]], { size: 18, spd: 70 }),
  ape: mon('林猿', '🦍', 8, [['leather', 0.5], ['iron_ore', 0.3]], { hp: 1.5, size: 26, spd: 55 }),
  // 骸骨洞
  bat: mon('洞蝠', '🦇', 7, [['bat_wing', 0.65]], { hp: 0.8, size: 15, spd: 110 }),
  skel: mon('骷髅', '💀', 8, [['bone', 0.7]], { size: 20, spd: 60 }),
  skelarcher: mon('骷髅射手', '☠️', 10, [['bone', 0.5], ['old_coin', 0.2]], { hp: 0.8, size: 20, spd: 65, x: { ranged: shot('#e8e0c8') } }),
  skelguard: mon('骷髅卫士', '💀', 11, [['bone', 0.6], ['iron_ore', 0.4]], { hp: 1.5, size: 24, spd: 55 }),
  skelking: boss('骷髅王', '💀', 12, [['old_coin', 1], ['old_coin', 1], ['sand_crystal', 1], ['upgrade_stone', 1], ['upgrade_stone', 1]], { hp: 9, size: 44 }),
  // 废弃矿洞
  zombie: mon('僵尸', '🧟', 13, [['old_coin', 0.3], ['iron_ore', 0.45]], { hp: 1.3, size: 21, spd: 45 }),
  maggot: mon('洞蛆', '🐛', 14, [['stinger', 0.6]], { hp: 0.8, size: 15, spd: 75 }),
  vampbat: mon('吸血蝠', '🦇', 15, [['bat_wing', 0.6], ['sand_crystal', 0.15]], { hp: 0.8, size: 17, spd: 120 }),
  shockzombie: mon('电僵尸', '🧟‍♀️', 17, [['sand_crystal', 0.35], ['old_coin', 0.3]], { size: 21, spd: 50, x: { ranged: shot('#9fe8ff', 150) } }),
  crawler: mon('爬尸', '🧟‍♂️', 18, [['bone', 0.5], ['sand_crystal', 0.25]], { hp: 1.6, size: 24, spd: 60 }),
  corpseking: boss('尸王', '🧟', 20, [['dragon_scale', 1], ['dragon_scale', 0.5], ['upgrade_stone_2', 1], ['upgrade_stone_2', 1], ['sand_crystal', 1]], { hp: 10, size: 50, spd: 50 }),
  // 毒蛇谷
  redsnake: mon('赤练蛇', '🐍', 16, [['poison_gland', 0.5]], { hp: 0.9, atk: 1.15, size: 18, spd: 90 }),
  greywolf: mon('灰狼', '🐺', 17, [['wolf_fur', 0.6]], { size: 22, spd: 110 }),
  pincer: mon('钳虫', '🦂', 18, [['stinger', 0.6], ['ice_crystal', 0.2]], { hp: 1.2, size: 20, spd: 70 }),
  toad: mon('毒蟾', '🐸', 19, [['ice_crystal', 0.45], ['poison_gland', 0.3]], { size: 19, spd: 80, x: { ranged: shot('#9be36a', 140) } }),
  // 古庙
  templeguard: mon('庙卫', '👹', 22, [['ember', 0.6]], { hp: 1.2, size: 24, spd: 75 }),
  statue: mon('石像', '🗿', 24, [['magma_core', 0.4], ['iron_ore', 0.5]], { hp: 1.8, size: 28, spd: 40 }),
  firespirit: mon('火灵', '🔥', 25, [['ember', 0.55]], { hp: 0.8, size: 18, spd: 85, x: { ranged: shot('#ff8a3a') } }),
  wraith: mon('幽魂', '👻', 27, [['ghost_essence', 0.6]], { size: 22, spd: 100 }),
  templewarrior: mon('庙将', '👺', 28, [['magma_core', 0.35], ['ghost_essence', 0.3]], { hp: 1.6, size: 26, spd: 70 }),
  abbot: boss('古庙之主', '👹', 29, [['dragon_scale', 1], ['dragon_scale', 1], ['upgrade_stone_2', 1], ['upgrade_stone_3', 1], ['magma_core', 1], ['magma_core', 1]], { hp: 12, size: 54, x: { slam: { r: 120, cd: 5, mult: 1.8 } } }),
  // 蜈蚣窟
  centipede: mon('蜈蚣', '🐛', 30, [['poison_gland', 0.6]], { size: 22, spd: 95 }),
  beetle: mon('黑甲虫', '🪲', 31, [['croc_scale', 0.6]], { hp: 1.6, size: 22, spd: 55 }),
  bigpincer: mon('巨钳虫', '🦂', 33, [['croc_scale', 0.4], ['poison_gland', 0.3]], { hp: 1.3, size: 26, spd: 75 }),
  spitter: mon('喷毒虫', '🪱', 33, [['poison_gland', 0.5]], { hp: 0.8, size: 18, spd: 60, x: { ranged: shot('#b8e04a') } }),
  broodmother: boss('地穴虫母', '🪱', 34, [['demon_heart', 1], ['demon_heart', 0.3], ['upgrade_stone_3', 1], ['upgrade_stone_3', 1], ['croc_scale', 1], ['croc_scale', 1]], { hp: 12, size: 56, x: { ranged: { range: 360, keep: 0, cd: 3, spd: 300, c: '#b8e04a' } } }),
  // 石陵
  blackboar: mon('黑野猪', '🐗', 35, [['demon_horn', 0.55]], { hp: 1.2, size: 24, spd: 85 }),
  redboar: mon('红野猪', '🐖', 37, [['demon_horn', 0.45], ['abyss_shard', 0.2]], { hp: 1.4, atk: 1.1, size: 26, spd: 80 }),
  tombguard: mon('石陵卫士', '🧌', 39, [['abyss_shard', 0.5]], { hp: 1.8, size: 30, spd: 50 }),
  tombbat: mon('陵蝠', '🦇', 38, [['abyss_shard', 0.3]], { hp: 0.8, size: 18, spd: 130 }),
  boarking: boss('白鬃猪王', '🐗', 42, [['lion_mane', 1], ['lion_mane', 0.3], ['upgrade_stone_3', 1], ['upgrade_stone_3', 1], ['upgrade_stone_4', 1], ['abyss_shard', 1]], { hp: 14, size: 58, spd: 85, x: { slam: { r: 120, cd: 5, mult: 1.8 } } }),
  // 魔殿
  idol: mon('魔殿雕像', '🗿', 41, [['sky_steel', 0.6]], { hp: 1.8, size: 30, spd: 45 }),
  bowguard: mon('魔殿弓卫', '🧝', 43, [['thunder_feather', 0.55]], { hp: 0.8, size: 21, spd: 70, x: { ranged: shot('#fff27a') } }),
  hallscorpion: mon('魔蝎', '🦂', 44, [['storm_core', 0.5]], { hp: 1.2, size: 26, spd: 100 }),
  hallknight: mon('魔殿卫士', '🧛', 46, [['sky_steel', 0.4], ['storm_core', 0.3]], { hp: 1.5, atk: 1.1, size: 25, spd: 90 }),
  halllord: boss('魔殿之主', '🦹', 47, [['lion_mane', 1], ['upgrade_stone_4', 1], ['upgrade_stone_4', 1], ['sky_steel', 1], ['sky_steel', 1], ['storm_core', 1]], { hp: 18, size: 58, x: { slam: { r: 130, cd: 4.5, mult: 1.9 }, ranged: { range: 360, keep: 0, cd: 3, spd: 300, c: '#c77aff' } } }),
  // 赤峡
  bloodspider: mon('血蛛', '🕷️', 45, [['blood_ruby', 0.5]], { size: 24, spd: 110 }),
  gorgebeast: mon('赤峡蛮兽', '🦬', 46, [['blood_ruby', 0.3], ['chaos_crystal', 0.3]], { hp: 1.7, size: 30, spd: 60 }),
  eye: mon('魔眼', '👁️', 48, [['chaos_crystal', 0.4], ['ancient_key', 0.25]], { hp: 0.9, size: 22, spd: 55, x: { ranged: shot('#ff4a8a', 190) } }),
  webguard: mon('守巢蛛', '🕷️', 49, [['chaos_crystal', 0.5], ['ancient_key', 0.15]], { hp: 1.5, atk: 1.1, size: 28, spd: 95 }),
  spiderlord: boss('赤峡魔蛛', '🕷️', 50, [['chaos_heart', 1], ['chaos_heart', 0.3], ['upgrade_stone_4', 1], ['upgrade_stone_4', 1], ['upgrade_stone_4', 0.5], ['blood_ruby', 1], ['chaos_crystal', 1], ['chaos_crystal', 1]], { hp: 23, size: 66, spd: 75, x: { slam: { r: 140, cd: 4, mult: 2 }, ranged: { range: 380, keep: 0, cd: 2.4, spd: 320, c: '#ff5a2a' } } }),
};

// 地图。野外是大地图；洞穴分层：只有第一层能从地图直接去，下面几层要走到最里面的楼梯下去（prev / next）。
// g：属于哪个洞穴（地图面板里合并显示）；max：怪物数量；elite：精英率；nest：怪物巢穴里的怪数
const BIG = 6000, DUN = 4200;
const ZONES = {
  village: { n: '苍岚城', lv: 1, w: 1100, h: 950, bg: '#7cb760', tuft: '#6aa64f', safe: true },
  plain: { n: '城郊草原', ic: '🌾', lv: 1, w: BIG, h: BIG, bg: '#6aa850', tuft: '#5a9842', mons: ['hen', 'deer', 'boar', 'snake'], max: 120, nodes: { tree: 120, bush: 66, rock: 30 }, theme: 'forest' },
  wood: { n: '幽暗密林', ic: '🌲', lv: 5, w: BIG, h: BIG, bg: '#4b8240', tuft: '#3f7236', mons: ['wolf', 'spider', 'ape'], max: 120, nodes: { tree: 150, bush: 48, rock: 36 }, theme: 'forest', elite: 0.02 },
  skel1: { n: '骸骨洞一层', ic: '💀', g: '骸骨洞', lv: 8, w: DUN, h: DUN, bg: '#4b4954', tuft: '#3e3c46', mons: ['bat', 'skel', 'skelarcher'], max: 104, nodes: { rock: 72, ore: 36 }, theme: 'cave', elite: 0.03, next: 'skel2' },
  skel2: { n: '骸骨洞二层', ic: '💀', g: '骸骨洞', lv: 11, w: DUN, h: DUN, bg: '#42404c', tuft: '#35333e', mons: ['skel', 'skelarcher', 'skelguard'], max: 109, nodes: { rock: 60, ore: 48 }, theme: 'cave', elite: 0.05, nest: 12, boss: 'skelking', prev: 'skel1' },
  mine1: { n: '废弃矿洞一层', ic: '⛏️', g: '废弃矿洞', lv: 13, w: DUN, h: DUN, bg: '#54483a', tuft: '#463b2f', mons: ['zombie', 'maggot', 'vampbat'], max: 109, nodes: { rock: 60, ore: 66 }, theme: 'cave', elite: 0.05, next: 'mine2' },
  mine2: { n: '废弃矿洞二层', ic: '⛏️', g: '废弃矿洞', lv: 16, w: DUN, h: DUN, bg: '#4a4034', tuft: '#3c3329', mons: ['zombie', 'vampbat', 'shockzombie'], max: 114, nodes: { rock: 54, ore: 72 }, theme: 'cave', elite: 0.07, nest: 12, prev: 'mine1', next: 'mine3' },
  mine3: { n: '废弃矿洞三层', ic: '⛏️', g: '废弃矿洞', lv: 19, w: DUN, h: DUN, bg: '#40372d', tuft: '#332b23', mons: ['shockzombie', 'crawler', 'maggot'], max: 120, nodes: { rock: 48, ore: 78 }, theme: 'cave', elite: 0.09, nest: 15, boss: 'corpseking', prev: 'mine2' },
  valley: { n: '毒蛇谷', ic: '🐍', lv: 16, w: BIG, h: BIG, bg: '#4f6a48', tuft: '#42593c', mons: ['redsnake', 'greywolf', 'pincer', 'toad'], max: 130, nodes: { tree: 90, bush: 72, rock: 48 }, theme: 'swamp', elite: 0.06, nest: 15 },
  temple1: { n: '古庙一层', ic: '⛩️', g: '古庙', lv: 22, w: DUN, h: DUN, bg: '#5a3a30', tuft: '#4a2e26', mons: ['templeguard', 'statue', 'firespirit'], max: 114, nodes: { rock: 54, ore: 42 }, theme: 'volcano', elite: 0.08, next: 'temple2' },
  temple2: { n: '古庙二层', ic: '⛩️', g: '古庙', lv: 25, w: DUN, h: DUN, bg: '#50322a', tuft: '#412820', mons: ['statue', 'firespirit', 'wraith'], max: 120, nodes: { rock: 54, ore: 42 }, theme: 'volcano', elite: 0.1, nest: 15, prev: 'temple1', next: 'temple3' },
  temple3: { n: '古庙三层', ic: '⛩️', g: '古庙', lv: 28, w: DUN, h: DUN, bg: '#462a24', tuft: '#38211c', mons: ['wraith', 'templewarrior', 'firespirit'], max: 125, nodes: { rock: 54, ore: 42 }, theme: 'volcano', elite: 0.12, nest: 18, boss: 'abbot', prev: 'temple2' },
  worm1: { n: '蜈蚣窟一层', ic: '🐛', g: '蜈蚣窟', lv: 30, w: DUN, h: DUN, bg: '#2e2638', tuft: '#241d2c', mons: ['centipede', 'beetle', 'spitter'], max: 125, nodes: { rock: 60, ore: 48 }, theme: 'abyss', elite: 0.14, nest: 18, next: 'worm2' },
  worm2: { n: '蜈蚣窟二层', ic: '🐛', g: '蜈蚣窟', lv: 33, w: DUN, h: DUN, bg: '#261f30', tuft: '#1d1726', mons: ['beetle', 'bigpincer', 'spitter'], max: 130, nodes: { rock: 60, ore: 48 }, theme: 'abyss', elite: 0.16, nest: 21, boss: 'broodmother', prev: 'worm1' },
  tomb1: { n: '石陵一层', ic: '🐗', g: '石陵', lv: 35, w: DUN, h: DUN, bg: '#585a60', tuft: '#4a4c52', mons: ['blackboar', 'tombbat'], max: 125, nodes: { rock: 78, ore: 42 }, theme: 'cave', elite: 0.16, nest: 18, next: 'tomb2' },
  tomb2: { n: '石陵二层', ic: '🐗', g: '石陵', lv: 38, w: DUN, h: DUN, bg: '#4e5056', tuft: '#404248', mons: ['blackboar', 'redboar', 'tombbat'], max: 130, nodes: { rock: 78, ore: 42 }, theme: 'cave', elite: 0.18, nest: 21, prev: 'tomb1', next: 'tomb3' },
  tomb3: { n: '石陵三层', ic: '🐗', g: '石陵', lv: 41, w: DUN, h: DUN, bg: '#44464c', tuft: '#37393e', mons: ['redboar', 'tombguard', 'tombbat'], max: 135, nodes: { rock: 78, ore: 42 }, theme: 'cave', elite: 0.2, nest: 21, boss: 'boarking', prev: 'tomb2' },
  hall1: { n: '魔殿一层', ic: '🏛️', g: '魔殿', lv: 40, w: DUN, h: DUN, bg: '#3a1418', tuft: '#2c0f12', mons: ['idol', 'bowguard'], max: 130, nodes: { rock: 60, ore: 54 }, theme: 'chaos', elite: 0.2, nest: 21, next: 'hall2' },
  hall2: { n: '魔殿二层', ic: '🏛️', g: '魔殿', lv: 43, w: DUN, h: DUN, bg: '#341216', tuft: '#270d10', mons: ['idol', 'bowguard', 'hallscorpion'], max: 135, nodes: { rock: 60, ore: 54 }, theme: 'chaos', elite: 0.22, nest: 24, prev: 'hall1', next: 'hall3' },
  hall3: { n: '魔殿三层', ic: '🏛️', g: '魔殿', lv: 46, w: DUN, h: DUN, bg: '#2e1014', tuft: '#220b0e', mons: ['bowguard', 'hallscorpion', 'hallknight'], max: 140, nodes: { rock: 60, ore: 54 }, theme: 'chaos', elite: 0.25, nest: 24, boss: 'halllord', prev: 'hall2' },
  gorge: { n: '赤峡', ic: '🏜️', lv: 45, w: BIG, h: BIG, bg: '#a8563a', tuft: '#964a30', mons: ['bloodspider', 'gorgebeast', 'eye'], max: 146, nodes: { tree: 48, rock: 90, ore: 42 }, theme: 'desert', elite: 0.25, nest: 24, next: 'lair' },
  lair: { n: '赤峡魔穴', ic: '🕸️', g: '赤峡', lv: 48, w: DUN, h: DUN, bg: '#3a1a1e', tuft: '#2c1216', mons: ['bloodspider', 'eye', 'webguard'], max: 146, nodes: { rock: 60, ore: 54 }, theme: 'chaos', elite: 0.28, nest: 27, boss: 'spiderlord', prev: 'gorge' },
};
const ZONE_ORDER = ['plain', 'wood', 'skel1', 'skel2', 'mine1', 'mine2', 'mine3', 'valley', 'temple1', 'temple2', 'temple3', 'worm1', 'worm2', 'tomb1', 'tomb2', 'tomb3', 'hall1', 'hall2', 'hall3', 'gorge', 'lair'];
const gearTierOf = (zid) => clamp(Math.floor(ZONES[zid].lv / 5), 0, 9); // 这张图掉哪一档装备
const NEST_ELITE = 0.35;

const NODE_YIELD = {
  tree: { n: '树木', give: [['wood', 2, 4]] },
  bush: { n: '草药丛', give: [['herb', 1, 3]] },
  rock: { n: '岩石', give: [['stone', 2, 4]] },
  ore: { n: '矿脉', give: [['iron_ore', 1, 2], ['stone', 1, 2]] },
};

// 家园：等级越高加成越多，并解锁生产设施
const HOUSE = [
  { n: '空地', hp: 0, atk: 0, def: 0, crit: 0, cost: null, desc: '一块属于你的空地。' },
  { n: '帐篷', hp: 25, atk: 0, def: 0, crit: 0, cost: { gold: 60, wood: 12 }, desc: '能在家休息回满血。最大生命 +25' },
  { n: '木屋', hp: 70, atk: 3, def: 1, crit: 0, cost: { gold: 350, wood: 45, stone: 15, leather: 6 }, desc: '解锁「菜园」自动产草药。生命 +70 攻击 +3' },
  { n: '石屋', hp: 140, atk: 8, def: 4, crit: 0, cost: { gold: 1400, wood: 70, stone: 80, iron_ore: 20, silk: 10 }, desc: '解锁「矿场」自动产石料铁矿。生命 +140 攻击 +8 防御 +4' },
  { n: '庄园', hp: 260, atk: 15, def: 8, crit: 0.02, cost: { gold: 4800, wood: 160, stone: 170, sand_crystal: 15, bone: 25 }, desc: '解锁「金库」自动生金币。生命 +260 攻击 +15 防御 +8' },
  { n: '城堡', hp: 450, atk: 28, def: 15, crit: 0.05, cost: { gold: 16000, stone: 400, ice_crystal: 25, magma_core: 10, dragon_scale: 1 }, desc: '设施可升到更高级。生命 +450 攻击 +28 防御 +15 暴击 +5%' },
  { n: '王宫', hp: 800, atk: 50, def: 28, crit: 0.08, cost: { gold: 80000, stone: 900, ghost_essence: 40, croc_scale: 30, abyss_shard: 25, demon_horn: 20 }, desc: '传说中的王宫。生命 +800 攻击 +50 防御 +28 暴击 +8%' },
  { n: '天空城', hp: 1600, atk: 95, def: 48, crit: 0.12, cost: { gold: 350000, stone: 2000, sky_steel: 60, storm_core: 40, chaos_crystal: 30, lion_mane: 2 }, desc: '漂浮在云端的城市，设施可升到满级。生命 +1600 攻击 +95 防御 +48 暴击 +12%' },
];
const PROD_SEC = 300; // 每 5 分钟产出一次（离线也算）
// 生产设施：可以升级（最高 10 级），提高每次产量和仓库容量。
// 升级越往后越贵，而且需要家园等级：设施每 3 级要求家园再升一级。
const FAC_MAX = 10;
const FACILITIES = [
  { id: 'garden', n: '菜园', ic: '🥬', tier: 2, base: { herb: 2 }, gold: 400,
    mats: (n) => ({ wood: 20 * n, herb: 6 * n, ...(n >= 4 ? { silk: 4 * n } : {}), ...(n >= 7 ? { ice_crystal: 3 * n } : {}) }) },
  { id: 'mine', n: '矿场', ic: '⛏️', tier: 3, base: { stone: 3, iron_ore: 1 }, gold: 900,
    mats: (n) => ({ wood: 25 * n, stone: 30 * n, iron_ore: 8 * n, ...(n >= 4 ? { bone: 4 * n } : {}), ...(n >= 7 ? { magma_core: 2 * n } : {}) }) },
  { id: 'vault', n: '金库', ic: '💰', tier: 4, base: { gold: 120 }, gold: 3000,
    mats: (n) => ({ stone: 40 * n, old_coin: 4 * n, sand_crystal: 3 * n, ...(n >= 4 ? { ice_crystal: 3 * n } : {}), ...(n >= 7 ? { abyss_shard: 2 * n } : {}) }) },
];
const facLv = (f) => (S.house.tier >= f.tier ? S.house.fac[f.id] || 1 : 0);
const facMult = (lv) => 1 + 0.5 * (lv - 1); // 产量倍率：10 级 = 5.5 倍
const facCap = (lv) => 12 + 8 * (lv - 1); // 仓库容量：1 级 12 次，10 级 84 次
const facNeedTier = (f, n) => Math.min(HOUSE.length - 1, f.tier + Math.floor((n - 1) / 3));
function facUpCost(f, cur) {
  const n = cur; // 从 cur 升到 cur+1
  const c = { gold: Math.round(f.gold * Math.pow(1.9, n - 1)), ...f.mats(n) };
  if (n >= 3) c.upgrade_stone = n * 2;
  if (n >= 6) c.upgrade_stone_2 = n - 4;
  return c;
}
function facGive(f, lv) {
  const out = {};
  for (const [k, v] of Object.entries(f.base)) out[k] = Math.round(v * facMult(lv));
  return out;
}

// 杂货铺：升级后解锁更多商品，出售价格也提高
const SHOP_LEVELS = [
  null,
  { n: '小摊', sell: 1.0 },
  { n: '杂货铺', sell: 1.05, cost: { gold: 600, wood: 40, leather: 10 } },
  { n: '商店', sell: 1.1, cost: { gold: 4000, stone: 120, iron_ore: 30, silk: 20 } },
  { n: '商会', sell: 1.15, cost: { gold: 18000, sand_crystal: 25, old_coin: 15, wolf_fur: 25 } },
  { n: '皇家商行', sell: 1.25, cost: { gold: 70000, magma_core: 20, ice_crystal: 30, ghost_essence: 20 } },
  { n: '天空商城', sell: 1.35, cost: { gold: 300000, sky_steel: 40, storm_core: 25, thunder_feather: 40 } },
];

/* ===================== 职业 / 技能 / 装备（苍岚战纪新增） ===================== */
// 三个职业：hp/def/atk/mp 是属性倍率，range 是普通攻击距离，bolt 有值表示远程（发射弹丸）
// statN：主属性叫什么（剑士看攻击，法师看魔法，灵使看道术）
const CLASSES = {
  blade: { n: '剑士', ic: '⚔️', statN: '攻击', desc: '近战。血厚防高，前期全靠平砍，Lv7 起学剑法，越练越强。', hp: 1.35, def: 1.2, atk: 1, mp: 0.6, range: 62, atkCd: 0.42 },
  mage: { n: '法师', ic: '🔥', statN: '魔法', desc: '远程。法术最多、清怪最快，但身板脆，蓝用完就危险。', hp: 0.65, def: 0.8, atk: 1.25, mp: 1.9, range: 300, atkCd: 0.55, bolt: '#ff8a3a' },
  spirit: { n: '灵使', ic: '🐾', statN: '道术', desc: '中程。能治疗、下毒、召唤骨卫和灵兽替你扛怪，最稳。', hp: 0.95, def: 1, atk: 0.9, mp: 1.2, range: 200, atkCd: 0.5, bolt: '#8affc8' },
};
const CLASS_IDS = Object.keys(CLASSES);
/* 技能：要先有技能书（书店买，或红名 / BOSS 掉），等级够了在背包里「学习」。
   学会后是 0 级，用得多了会涨熟练度，最高 3 级，每级效果更强。
   t：basic 普通攻击自带 / passive 被动 / active 要按按钮；lv 学习等级；cd 冷却；mp 耗蓝 */
const SKILLS = {
  blade: [
    { id: 'sword', n: '基础剑法', ic: '🗡️', t: 'passive', lv: 7, desc: (l) => `被动：攻击 +${4 + 4 * l}%。每砍一刀涨熟练` },
    { id: 'heavy', n: '重击', ic: '💥', t: 'passive', lv: 14, desc: (l) => `被动：每第 4 刀伤害 ${160 + 20 * l}%` },
    { id: 'arc', n: '弧月斩', ic: '🌙', t: 'active', lv: 20, cd: 5, mp: 10, desc: (l) => `横扫周身一圈，伤害 ${160 + 20 * l}%` },
    { id: 'thrust', n: '穿刺', ic: '📍', t: 'passive', lv: 26, desc: (l) => `被动：平砍同时刺中目标身后的敌人，伤害 ${70 + 10 * l}%` },
    { id: 'charge', n: '冲撞', ic: '💨', t: 'active', lv: 30, cd: 8, mp: 16, desc: (l) => `冲到最近的敌人面前，伤害 ${260 + 30 * l}%，撞慢 2 秒` },
    { id: 'flame', n: '炎刃', ic: '🔥', t: 'active', lv: 35, cd: 10, mp: 22, desc: (l) => `剑上起火猛劈一刀，伤害 ${320 + 40 * l}%` },
  ],
  mage: [
    { id: 'fire', n: '火弹术', ic: '☄️', t: 'basic', lv: 1, desc: (l) => `普通攻击：发射火弹，伤害 ${100 + 8 * l}%` },
    { id: 'push', n: '斥力环', ic: '💫', t: 'active', lv: 12, cd: 8, mp: 14, desc: (l) => `把身边的怪弹开并减速 2 秒，伤害 ${100 + 15 * l}%` },
    { id: 'thunder', n: '落雷', ic: '⚡', t: 'active', lv: 17, cd: 3.5, mp: 18, desc: (l) => `雷劈最近的敌人，伤害 ${260 + 30 * l}%` },
    { id: 'bigfire', n: '烈焰弹', ic: '🔥', t: 'passive', lv: 19, desc: (l) => `被动：火弹变大，伤害再 +${25 + 10 * l}%` },
    { id: 'wall', n: '火墙', ic: '🧱', t: 'active', lv: 24, cd: 12, mp: 30, desc: (l) => `在敌人脚下烧起一片火 8 秒，每跳伤害 ${50 + 8 * l}%` },
    { id: 'ward', n: '灵盾', ic: '🛡️', t: 'active', lv: 31, cd: 30, mp: 40, desc: (l) => `15 秒内吸收 ${40 + 8 * l}% 生命上限的伤害` },
    { id: 'ice', n: '冰暴', ic: '❄️', t: 'active', lv: 35, cd: 9, mp: 45, desc: (l) => `冰雹砸向一片敌人，伤害 ${240 + 30 * l}%，减速 3 秒` },
  ],
  spirit: [
    { id: 'charm', n: '灵符', ic: '📜', t: 'basic', lv: 1, desc: (l) => `普通攻击：掷出灵符，伤害 ${100 + 8 * l}%` },
    { id: 'heal', n: '治愈术', ic: '💚', t: 'active', lv: 7, cd: 8, mp: 14, desc: (l) => `5 秒内给自己和召唤物回复 ${30 + 6 * l}% 生命` },
    { id: 'venom', n: '蚀毒术', ic: '☠️', t: 'active', lv: 14, cd: 9, mp: 18, desc: (l) => `附近敌人中毒 8 秒：每秒掉 ${30 + 5 * l}% 道术的血，防御 -30%` },
    { id: 'bone', n: '唤骨卫', ic: '💀', t: 'active', lv: 19, cd: 20, mp: 30, desc: (l) => `召唤骨卫助战（攻击为你的 ${55 + 8 * l}%），怪被它打到会转去打它` },
    { id: 'armor', n: '灵甲术', ic: '🔰', t: 'active', lv: 25, cd: 30, mp: 30, desc: (l) => `20 秒内防御 +${30 + 8 * l}%` },
    { id: 'beast', n: '唤灵兽', ic: '🐅', t: 'active', lv: 35, cd: 25, mp: 50, desc: (l) => `召唤灵兽（攻击为你的 ${85 + 10 * l}%，血很厚），顶替骨卫` },
  ],
};
const SKILL_BY_ID = {};
for (const c of CLASS_IDS) for (const sk of SKILLS[c]) { sk.cls = c; SKILL_BY_ID[sk.id] = sk; }
const SK_PTS = [150, 500, 1200]; // 0→1、1→2、2→3 级需要的熟练度
const SK_LVADD = [3, 6, 10]; // 升到 1/2/3 级还要求人物等级 = 学习等级 + 这么多
const mySkills = () => SKILLS[S.cls] || SKILLS.blade;
const skLv = (id) => (S.sk[id] ? S.sk[id].l : -1); // -1 = 没学
const hasSk = (id) => !!S.sk[id];
const skillCost = (sk) => Math.round(sk.mp * (1 + S.lv / 25));
const activeSkills = () => mySkills().filter((sk) => sk.t === 'active' && hasSk(sk.id));
const bookPrice = (sk) => (sk.lv <= 20 ? 200 + sk.lv * 150 : sk.lv * sk.lv * 40);
for (const sk of Object.values(SKILL_BY_ID)) ITEMS['book_' + sk.id] = { n: '《' + sk.n + '》', ic: '📕', p: Math.round(bookPrice(sk) / 4), book: sk.id };
// 用技能涨熟练度，够了就升级
function trainSkill(id, n) {
  const st = S.sk[id], sk = SKILL_BY_ID[id];
  if (!st || st.l >= 3) return;
  st.x = (st.x || 0) + (n || 1);
  if (st.x >= SK_PTS[st.l] && S.lv >= sk.lv + SK_LVADD[st.l]) {
    st.x = 0; st.l++;
    toast(`${sk.ic} 「${sk.n}」练到 ${st.l} 级！`);
    markDirty();
  }
}
function learnSkill(id, quiet) {
  const sk = SKILL_BY_ID[id];
  if (!sk || hasSk(id)) return false;
  S.sk[id] = { l: 0, x: 0 };
  if (!quiet) toast(`${sk.ic} 学会了「${sk.n}」`);
  renderSkillBar();
  markDirty();
  return true;
}

// 装备：打怪掉在地上，走过去捡。品质越高属性越好；强化最高 +10（会失败）
const QUALITY = [
  { n: '普通', c: '#d8d8d8', m: 0.85 },
  { n: '精良', c: '#6fe06a', m: 1 },
  { n: '稀有', c: '#5aa8ff', m: 1.2 },
  { n: '史诗', c: '#c77aff', m: 1.45 },
  { n: '传说', c: '#ff9a2a', m: 1.75 },
];
// 装备名字：武器、衣甲每个职业一套，每 5 级换一把；首饰按材质分档
const WPN_NAMES = {
  blade: ['木剑', '青铜剑', '精铁剑', '斩马刀', '凌风剑', '裂岩刃', '寒魄剑', '断岳刀', '焚天剑', '苍岚龙渊'],
  mage: ['木杖', '青藤杖', '琉璃杖', '星火杖', '霜语杖', '雷纹杖', '玄晶杖', '焚星杖', '镇魂杖', '苍岚穹杖'],
  spirit: ['竹符剑', '松纹剑', '青铜铃剑', '伏灵剑', '玄符剑', '白虹剑', '镇岳剑', '渡厄剑', '太清剑', '苍岚归一'],
};
const ARM_NAMES = {
  blade: ['布衣', '轻皮甲', '镶铁甲', '重铠', '虎贲铠', '玄铁铠', '龙鳞铠', '破军铠', '镇狱铠', '苍岚战铠'],
  mage: ['布衣', '学徒袍', '星纹袍', '法师长袍', '霜华袍', '雷云袍', '玄晶袍', '焚星袍', '镇魂袍', '苍岚法袍'],
  spirit: ['布衣', '行者衣', '松风衣', '伏灵衣', '玄符衣', '白虹衣', '镇岳衣', '渡厄衣', '太清衣', '苍岚道衣'],
};
const GEAR_TIERS = ['皮制', '青铜', '精铁', '白银', '黄金', '翡翠', '玛瑙', '紫晶', '玄晶', '龙魂'];
const TIER_LV = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45]; // 穿戴需要的等级
const SLOTS = ['weapon', 'armor', 'helmet', 'necklace', 'ring', 'boots'];
const SLOT_N = { weapon: '武器', armor: '衣甲', helmet: '头盔', necklace: '项链', ring: '戒指', boots: '靴子' };
const SLOT_IC = { weapon: '🗡️', armor: '🥋', helmet: '⛑️', necklace: '📿', ring: '💍', boots: '🥾' };
const SLOT_NOUN = { helmet: '头盔', necklace: '项链', ring: '戒指', boots: '战靴' };
const STAT_N = { atk: '攻击', def: '防御', hp: '生命', crit: '暴击', cd: '暴伤', spd: '移速' };
const MAX_PLUS = 10;
const BAG_MAX = 40; // 装备背包格子
const ENH_RATE = [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]; // +0→+1 … +9→+10 的成功率
function gearStats(g) {
  const t = g.t, k = QUALITY[g.q].m * (1 + 0.05 * (g.p || 0));
  const b = {
    weapon: { atk: 14 + 30 * t },
    armor: { def: 4 + 9 * t, hp: 40 + 90 * t },
    helmet: { def: 2 + 5 * t, hp: 10 + 30 * t },
    necklace: { atk: 3 + 6 * t, crit: 0.02 + 0.02 * t, cd: 0.05 + 0.08 * t },
    ring: { atk: 5 + 10 * t, crit: 0.01 + 0.015 * t },
    boots: { def: 2 + 4 * t, hp: 20 + 45 * t, spd: 3 + 2 * t },
  }[g.s];
  const o = {};
  for (const [a, v] of Object.entries(b)) o[a] = a === 'crit' || a === 'cd' ? Math.round(v * k * 1000) / 1000 : Math.round(v * k);
  return o;
}
const gearName = (g) => (g.s === 'weapon' ? WPN_NAMES[g.c || 'blade'][g.t] : g.s === 'armor' ? ARM_NAMES[g.c || 'blade'][g.t] : GEAR_TIERS[g.t] + SLOT_NOUN[g.s]) + (g.p ? ' +' + g.p : '');
const gearText = (g) => Object.entries(gearStats(g)).map(([a, v]) => STAT_N[a] + '+' + (a === 'crit' || a === 'cd' ? Math.round(v * 100) + '%' : v)).join(' ');
const gearScore = (g) => { const s = gearStats(g); return (s.atk || 0) + (s.def || 0) * 1.5 + (s.hp || 0) * 0.15 + (s.crit || 0) * 400 + (s.cd || 0) * 100 + (s.spd || 0) * 2; };
const gearPrice = (g) => Math.round((20 + 40 * g.t + 60 * g.t * g.t) * [1, 2, 5, 15, 50][g.q] * (1 + 0.2 * (g.p || 0)));
const gearHtml = (g) => `<b style="color:${QUALITY[g.q].c}">${gearName(g)}</b>`;
const canEquip = (g) => S.lv >= TIER_LV[g.t] && (!g.c || g.c === S.cls);
function rollQuality(src) {
  const tbl = { mob: [62, 28, 8.5, 1.3, 0.2], elite: [25, 45, 22, 7, 1], rogue: [0, 40, 40, 17, 3], boss: [0, 0, 50, 38, 12] }[src];
  let r = Math.random() * 100;
  for (let i = 0; i < 5; i++) if ((r -= tbl[i]) < 0) return i;
  return 0;
}
function makeGear(tier, src, slot, cls) {
  const s = slot || pick(SLOTS);
  const g = { id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), s, t: clamp(tier, 0, GEAR_TIERS.length - 1), q: src === 'start' ? 0 : rollQuality(src), p: 0 };
  // 武器、衣甲分职业：六成是自己职业的，其余可以卖钱
  if (s === 'weapon' || s === 'armor') g.c = cls || (Math.random() < 0.6 ? S.cls : pick(CLASS_IDS));
  return g;
}
function enhanceCost(g) {
  const p = g.p || 0;
  const c = { gold: Math.round(80 * Math.pow(g.t + 1, 1.8) * Math.pow(p + 1, 1.5)) };
  if (p < 4) c.upgrade_stone = 1 + p;
  else if (p < 7) c.upgrade_stone_2 = p - 3;
  else if (p < 9) c.upgrade_stone_3 = p - 6;
  else c.upgrade_stone_4 = 2;
  return c;
}
// 红名恶徒（AI 扮演的敌对玩家）
const ROGUE_NAMES = ['血手阿屠', '夜枭', '独眼老莫', '赤蛇', '断刃', '鬼面书生', '黑鸦', '疯刀客', '冷月', '铁面'];
const expNeed = (lv) => Math.floor(20 * Math.pow(lv, 1.6));

// shop: 需要的杂货铺等级
const SHOP_BUY = [
  { id: 'potion_s', price: 15, shop: 1 },
  { id: 'mana_s', price: 15, shop: 1 },
  { id: 'wood', price: 8, shop: 1 },
  { id: 'stone', price: 10, shop: 1 },
  { id: 'potion_m', price: 60, shop: 2 },
  { id: 'mana_m', price: 60, shop: 2 },
  { id: 'speed_s', price: 80, shop: 2 },
  { id: 'leather', price: 25, shop: 2 },
  { id: 'potion_l', price: 180, shop: 3 },
  { id: 'mana_l', price: 180, shop: 3 },
  { id: 'speed_l', price: 300, shop: 3 },
  { id: 'iron_ore', price: 45, shop: 3 },
  { id: 'herb', price: 15, shop: 3 },
  { id: 'potion_xl', price: 500, shop: 4 },
  { id: 'mana_xl', price: 500, shop: 4 },
  { id: 'upgrade_stone', price: 800, shop: 4 },
  { id: 'speed_xl', price: 900, shop: 5 },
  { id: 'upgrade_stone_2', price: 4000, shop: 5 },
  { id: 'potion_xxl', price: 1500, shop: 6 },
  { id: 'upgrade_stone_3', price: 20000, shop: 6 },
];

/* ===================== 存档 ===================== */
let S = null; // 当前存档（会上传到云端）
function newSave(nick) {
  return {
    v: 1, name: nick || '勇者', cls: '', lv: 1, exp: 0, hp: 100, gold: 30,
    inv: { potion_s: 3, mana_s: 3 },
    equip: {}, gear: [], sk: {}, opt: { autoSell: false },
    pet: null, petGrow: { atk: 0, hp: 0, def: 0 },
    house: { tier: 0, prod: {}, fac: {} },
    shopLv: 1,
    spd: { m: 1, until: 0 },
    quests: [],
    zone: 'village',
    stat: { kills: 0, boss: 0, deaths: 0, pk: 0 },
    created: Date.now(), ts: Date.now(),
  };
}
function fixSave(d, nick) {
  const base = newSave(nick);
  const s = Object.assign(base, d || {});
  s.inv = Object.assign({}, s.inv);
  if (!CLASSES[s.cls]) s.cls = '';
  const okGear = (g) => g && SLOTS.includes(g.s) && GEAR_TIERS[g.t] && QUALITY[g.q] && (!g.c || CLASSES[g.c]);
  s.equip = Object.assign({}, s.equip);
  for (const k of Object.keys(s.equip)) if (!SLOTS.includes(k) || !okGear(s.equip[k])) delete s.equip[k];
  s.gear = Array.isArray(s.gear) ? s.gear.filter(okGear) : [];
  s.opt = Object.assign({ autoSell: false }, s.opt);
  s.petGrow = Object.assign({ atk: 0, hp: 0, def: 0 }, s.petGrow);
  if (s.pet && !(s.pet.kind === 'bone' || s.pet.kind === 'beast')) s.pet = null;
  s.sk = Object.assign({}, s.sk);
  for (const k of Object.keys(s.sk)) if (!SKILL_BY_ID[k] || !s.sk[k]) delete s.sk[k];
  s.house = Object.assign({ tier: 0, prod: {}, fac: {} }, s.house);
  s.house.prod = Object.assign({}, s.house.prod);
  s.house.fac = Object.assign({}, s.house.fac);
  s.shopLv = clamp(s.shopLv || 1, 1, SHOP_LEVELS.length - 1);
  s.spd = Object.assign({ m: 1, until: 0 }, s.spd);
  s.stat = Object.assign({ kills: 0, boss: 0, deaths: 0, pk: 0 }, s.stat);
  if (!Array.isArray(s.quests)) s.quests = [];
  if (!ZONES[s.zone]) s.zone = 'village';
  return s;
}

/* ===================== 账号 & 云同步 ===================== */
const Auth = {
  token: localStorage.getItem('cl_token') || '',
  email: localStorage.getItem('cl_email') || '',
};
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (Auth.token) headers.Authorization = 'Bearer ' + Auth.token;
  let r;
  try {
    r = await fetch(API + path, { ...opts, headers });
  } catch (e) {
    throw Object.assign(new Error('网络连接失败'), { status: 0 });
  }
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(j.error || '请求失败（' + r.status + '）'), { status: r.status });
  return j;
}
const Sync = { dirty: false, saving: false, lastChange: 0, lastOk: 0 };
const localKey = () => 'cl_save_' + Auth.email;
function markDirty() {
  if (!S) return;
  Sync.dirty = true;
  Sync.lastChange = Date.now();
  S.ts = Date.now();
  try { localStorage.setItem(localKey(), JSON.stringify(S)); } catch {}
  setSync('✏️ 待同步');
}
function setSync(t) { const el = $('#hSync'); if (el) el.textContent = t; }
async function cloudSave(force) {
  if (!S || Sync.saving || (!Sync.dirty && !force)) return;
  Sync.saving = true;
  Sync.dirty = false;
  S.hpSaved = Math.round(G.player ? G.player.hp : S.hp);
  const body = JSON.stringify({ data: S });
  setSync('⏳ 保存中');
  try {
    await api('/save', { method: 'PUT', body });
    Sync.lastOk = Date.now();
    setSync('☁️ 已保存');
  } catch (e) {
    Sync.dirty = true;
    if (e.status === 401) { toast('登录已过期，请重新登录'); logout(); }
    else setSync('⚠️ 离线，已存本机');
  }
  Sync.saving = false;
}
// 实时保存：有改动后 2 秒内上传，且最少间隔 3 秒
setInterval(() => {
  if (Sync.dirty && Date.now() - Sync.lastChange > 1200 && Date.now() - Sync.lastOk > 3000) cloudSave();
}, 1000);
function flushOnExit() {
  if (!S || !Sync.dirty || !Auth.token) return;
  S.ts = Date.now();
  try {
    localStorage.setItem(localKey(), JSON.stringify(S));
    fetch(API + '/save', {
      method: 'PUT', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + Auth.token },
      body: JSON.stringify({ data: S }),
    });
    Sync.dirty = false;
  } catch {}
}
addEventListener('pagehide', flushOnExit);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushOnExit(); });

/* ===================== 登录界面 ===================== */
let authMode = 'login'; // login 登录 / register 注册 / reset 用邮件验证码重设密码
function setAuthMode(m) {
  authMode = m;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === m));
  $('#fNick').classList.toggle('hidden', m !== 'register');
  $('#fCodeRow').classList.toggle('hidden', m !== 'reset');
  $('#fPass').placeholder = m === 'reset' ? '新密码（至少 6 位）' : '密码（至少 6 位）';
  $('#fPass').autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('#authBtn').textContent = { login: '登录并开始', register: '注册并开始', reset: '重设密码并登录' }[m];
  $('#forgotLink').textContent = m === 'reset' ? '← 返回登录' : '忘记密码？';
  $('#authMsg').className = 'msg';
  $('#authMsg').textContent = m === 'reset' ? '填好邮箱，点「发送验证码」，再输入收到的 6 位数字和新密码' : '';
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setAuthMode(t.dataset.tab)));
$('#forgotLink').addEventListener('click', (e) => { e.preventDefault(); setAuthMode(authMode === 'reset' ? 'login' : 'reset'); });
// 发送验证码：60 秒内不能重复点
$('#sendCodeBtn').addEventListener('click', async () => {
  const btn = $('#sendCodeBtn'), msg = $('#authMsg');
  const email = $('#fEmail').value.trim();
  msg.className = 'msg';
  if (!email) { msg.textContent = '先填邮箱'; return; }
  btn.disabled = true;
  try {
    const r = await api('/forgot', { method: 'POST', body: JSON.stringify({ email }) });
    msg.className = 'msg ok';
    msg.textContent = r.message || '验证码已发送';
    let left = 60;
    const tick = () => {
      btn.textContent = left > 0 ? left + ' 秒后可重发' : '发送验证码';
      if (left-- > 0) setTimeout(tick, 1000); else btn.disabled = false;
    };
    tick();
  } catch (err) {
    msg.textContent = err.status === 404 || err.status === 405 ? '找不到后端接口，请确认已部署 functions 目录' : err.message;
    btn.disabled = false;
  }
});
$('#fEmail').value = Auth.email;
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#authMsg');
  const btn = $('#authBtn');
  msg.className = 'msg';
  msg.textContent = '';
  btn.disabled = true;
  try {
    const body = { email: $('#fEmail').value.trim(), password: $('#fPass').value, nickname: $('#fNick').value.trim() };
    if (authMode === 'reset') body.code = $('#fCode').value.trim();
    const r = await api('/' + authMode, { method: 'POST', body: JSON.stringify(body) });
    Auth.token = r.token;
    Auth.email = r.email;
    localStorage.setItem('cl_token', r.token);
    localStorage.setItem('cl_email', r.email);
    msg.className = 'msg ok';
    msg.textContent = authMode === 'reset' ? '密码已重设！正在进入游戏…' : '成功！正在进入游戏…';
    await loadAndStart(r.nickname);
    $('#fPass').value = ''; $('#fCode').value = '';
    if (authMode === 'reset') setAuthMode('login');
  } catch (err) {
    msg.textContent = err.status === 404 || err.status === 405 ? '找不到后端接口，请确认已部署 functions 目录并绑定 D1' : err.message;
  }
  btn.disabled = false;
});

async function loadAndStart(nickHint) {
  const r = await api('/save');
  let data = r.data;
  // 本机有更新的未同步存档时用本机的
  try {
    const local = JSON.parse(localStorage.getItem(localKey()) || 'null');
    if (local && (!data || (local.ts || 0) > (data.ts || 0))) { data = local; Sync.dirty = true; }
  } catch {}
  S = fixSave(data, r.nickname || nickHint);
  if (!data) { S.quests = []; Sync.dirty = true; }
  $('#auth').classList.add('hidden');
  $('#game').classList.remove('hidden');
  startGame();
  if (Sync.dirty) cloudSave(true); else setSync('☁️ 已保存');
}

async function logout() {
  flushOnExit();
  try { if (Auth.token) await api('/logout', { method: 'POST' }); } catch {}
  Auth.token = '';
  localStorage.removeItem('cl_token');
  S = null;
  G.running = false;
  closePanel();
  $('#game').classList.add('hidden');
  $('#auth').classList.remove('hidden');
}

/* ===================== 游戏状态 ===================== */
const cv = $('#cv');
const ctx = cv.getContext('2d');
const G = {
  running: false, paused: false, zone: 'village', player: null,
  enemies: [], nodes: [], decor: [], tufts: [], texts: [], fx: [], npcs: [], critters: [], proj: [], warns: [], loot: [], pproj: [], walls: [], pet: null, auto: false, autoTgt: null,
  respawns: [], cam: { x: 0, y: 0 }, scale: 1, dpr: 1, vw: 0, vh: 0,
  near: null, atkHeld: false, keys: {}, joy: { x: 0, y: 0, id: null }, t: 0, deadT: 0,
};

function stats() {
  const L = S.lv, h = HOUSE[S.house.tier], C = CLASSES[S.cls] || CLASSES.blade, p = G.player;
  const g = { atk: 0, def: 0, hp: 0, crit: 0, cd: 0, spd: 0 };
  for (const s of SLOTS) { const it = S.equip[s]; if (it) for (const [a, v] of Object.entries(gearStats(it))) g[a] += v; }
  const sw = S.sk.sword ? 1.04 + 0.04 * S.sk.sword.l : 1; // 剑士「基础剑法」
  const ar = p && p.armorT > 0 ? 1 + p.armorK : 1; // 灵使「灵甲术」
  return {
    maxHp: Math.round((100 + 22 * (L - 1) + g.hp + h.hp) * C.hp),
    maxMp: Math.round((60 + 12 * (L - 1)) * C.mp),
    atk: Math.round((10 + 3 * (L - 1) + g.atk + h.atk) * C.atk * sw),
    def: Math.round((2 + 1.2 * (L - 1) + g.def + h.def) * C.def * ar),
    crit: Math.min(0.6, 0.05 + g.crit + h.crit),
    critDmg: 1.5 + g.cd,
    speed: (165 + g.spd) * speedMult(),
  };
}
function speedMult() {
  return S && S.spd && S.spd.until > Date.now() ? S.spd.m : 1;
}
const has = (k) => (k === 'gold' ? S.gold : S.inv[k] || 0);
function give(k, n) {
  if (k === 'gold') S.gold += n;
  else S.inv[k] = (S.inv[k] || 0) + n;
}
function take(k, n) {
  if (k === 'gold') S.gold -= n;
  else { S.inv[k] = (S.inv[k] || 0) - n; if (S.inv[k] <= 0) delete S.inv[k]; }
}
const canAfford = (cost) => Object.entries(cost).every(([k, v]) => has(k) >= v);
const payCost = (cost) => Object.entries(cost).forEach(([k, v]) => take(k, v));
const itemName = (k) => (k === 'gold' ? '金币' : ITEMS[k] ? ITEMS[k].n : k);
const sellable = (k) => S.inv[k] > 0 && ITEMS[k] && !ITEMS[k].heal && !ITEMS[k].mana && !ITEMS[k].book && !ITEMS[k].quest && !ITEMS[k].nosell;
const sellPrice = (k) => Math.max(1, Math.floor(ITEMS[k].p * SHOP_LEVELS[S.shopLv].sell));
const itemIc = (k) =>(k === 'gold' ? '💰' : ITEMS[k] ? ITEMS[k].ic : '❔');
function needHtml(cost) {
  return Object.entries(cost)
    .map(([k, v]) => `<span class="need ${has(k) >= v ? 'ok' : 'no'}">${itemIc(k)}${itemName(k)} ${fmt(has(k))}/${fmt(v)}</span>`)
    .join('');
}

/* ===================== 区域生成 ===================== */
function enterZone(id, silent, from) {
  const z = ZONES[id];
  G.zone = id;
  S.zone = id;
  G.enemies = []; G.nodes = []; G.decor = []; G.texts = []; G.fx = []; G.npcs = []; G.critters = []; G.respawns = []; G.proj = []; G.warns = []; G.loot = []; G.pproj = []; G.walls = []; G.autoTgt = null;
  G.nest = null; G.stairs = null;
  const rnd = seeded(strHash(id));
  G.tufts = [];
  for (let i = 0; i < (z.w * z.h) / 14000; i++) G.tufts.push({ x: rnd() * z.w, y: rnd() * z.h, s: 0.6 + rnd() * 0.8 });
  const p = G.player;
  if (id === 'village') {
    buildVillage(rnd);
    p.x = 550; p.y = 640;
  } else {
    // 地图最下面：回城传送阵（野外 / 洞穴第一层）或回上一层的楼梯；最上面：去下一层的楼梯
    G.portal = { x: z.w / 2, y: z.h - 70 };
    if (z.next) G.stairs = { x: z.w / 2, y: 130, to: z.next };
    p.x = z.w / 2; p.y = z.h - 150;
    if (from && z.next === from) p.y = 230; // 从下一层走上来，站在下行楼梯旁边
    const far = (x, y) => Math.hypot(x - G.portal.x, y - G.portal.y) > 200 && (!G.stairs || Math.hypot(x - G.stairs.x, y - G.stairs.y) > 160);
    for (let i = 0; i < (z.w * z.h) / 56000; i++) {
      const x = rnd() * z.w, y = rnd() * z.h;
      if (far(x, y)) G.decor.push({ k: 'deco', x, y, s: 0.7 + rnd() * 0.6, v: rnd() });
    }
    for (const [kind, count] of Object.entries(z.nodes)) {
      for (let i = 0; i < count; i++) {
        let x, y;
        do { x = 60 + rnd() * (z.w - 120); y = 60 + rnd() * (z.h - 120); } while (!far(x, y));
        G.nodes.push({ kind, x, y, ready: true, t: 0 });
      }
    }
    if (z.nest) {
      // 怪物巢穴放在地图上半部分的一侧，远离入口
      const side = rnd() < 0.5 ? 0.25 : 0.75;
      G.nest = { x: z.w * side, y: z.h * 0.3, r: 420 };
      for (let i = 0; i < z.nest; i++) spawnEnemy(pick(z.mons), undefined, undefined, true);
    }
    for (let i = 0; i < z.max; i++) spawnEnemy(pick(z.mons));
    if (z.boss) spawnEnemy(z.boss, z.w / 2, 300);
    // 红名恶徒：Lv10 以上的图 1 个，Lv25 以上 2 个
    for (let i = 0; i < (z.lv >= 25 ? 2 : z.lv >= 10 ? 1 : 0); i++) spawnRogue();
  }
  if (G.pet) { G.pet.x = p.x + 30; G.pet.y = p.y + 10; } // 召唤物跟着换地图
  updateHud();
  if (!silent) toast(`📍 进入「${z.n}」`);
}

function buildVillage(rnd) {
  G.npcs = [
    { id: 'house', n: '我的家园', x: 250, y: 330, r: 120 },
    { id: 'quest', n: '任务板', x: 520, y: 190, r: 80 },
    { id: 'shop', n: '杂货铺', x: 820, y: 250, r: 100 },
    { id: 'smith', n: '铁匠铺', x: 840, y: 560, r: 100 },
    { id: 'gate', n: '出城', x: 550, y: 880, r: 90 },
  ];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 1100, y = rnd() * 950;
    if (x > 120 && x < 1000 && y > 90 && y < 900) continue; // 树只在边缘
    G.decor.push({ k: 'deco', x, y, s: 0.8 + rnd() * 0.5, v: rnd() });
  }
  for (let i = 0; i < 4; i++) G.critters.push({ x: 400 + rnd() * 300, y: 400 + rnd() * 250, tx: 500, ty: 500, ic: i < 3 ? '🐔' : '🐈', t: 0 });
}

function spawnEnemy(type, x, y, inNest) {
  const z = ZONES[G.zone];
  const base = MONS[type];
  if (x === undefined && inNest && G.nest) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * G.nest.r * 0.85;
    x = clamp(G.nest.x + Math.cos(a) * r, 40, z.w - 40);
    y = clamp(G.nest.y + Math.sin(a) * r, 40, z.h - 40);
  } else if (x === undefined) {
    let tries = 0;
    do { x = 80 + Math.random() * (z.w - 160); y = 80 + Math.random() * (z.h - 160); tries++; }
    while (tries < 50 && (Math.hypot(x - G.portal.x, y - G.portal.y) < 380 || (G.player && Math.hypot(x - G.player.x, y - G.player.y) < 300)));
  }
  // 精英怪：血 ×3，攻击 ×1.4，经验金币 ×3，掉落翻倍
  const eliteCh = base.boss ? 0 : inNest ? NEST_ELITE : z.elite || 0;
  const elite = Math.random() < eliteCh;
  const m = elite
    ? Object.assign({}, base, { n: '精英·' + base.n, hp: base.hp * 3, atk: Math.round(base.atk * 1.4), def: Math.round(base.def * 1.2), exp: base.exp * 3, gold: [base.gold[0] * 3, base.gold[1] * 3], size: Math.round(base.size * 1.25), elite: true })
    : base;
  G.enemies.push({ type, m, x, y, sx: x, sy: y, hp: m.hp, tx: x, ty: y, wait: Math.random() * 2, cd: 0, flash: 0, aggro: false, face: 1, nest: !!inNest });
}

/* ===================== 玩家 ===================== */
function initPlayer() {
  const st = stats();
  G.player = { x: 550, y: 640, hp: Math.min(st.maxHp, S.hpSaved || st.maxHp), mp: st.maxMp, face: 1, dir: 0, swing: 0, atkCd: 0, cds: {}, hurt: 0, moving: false, step: 0, armorT: 0, armorK: 0, ward: 0, wardT: 0, mend: 0, combo: 0 };
}

function gainExp(n) {
  S.exp += n;
  let up = false;
  const lv0 = S.lv;
  while (S.exp >= expNeed(S.lv)) {
    S.exp -= expNeed(S.lv);
    S.lv++;
    up = true;
  }
  if (up) {
    G.player.hp = stats().maxHp; G.player.mp = stats().maxMp;
    toast(`🎉 升级到 Lv.${S.lv}！`);
    floatText(G.player.x, G.player.y - 50, 'LEVEL UP!', '#ffe066', 22);
    for (const zid of ZONE_ORDER) if (ZONES[zid].lv > lv0 && ZONES[zid].lv <= S.lv && !ZONES[zid].prev) toast(`🗺️ 新地图解锁：${ZONES[zid].g || ZONES[zid].n}`);
    for (const sk of mySkills()) if (sk.lv > lv0 && sk.lv <= S.lv && !hasSk(sk.id)) toast(`📕 可以学「${sk.n}」了：去杂货铺「书架」买技能书`);
    fillQuests();
  }
}

function nearestEnemy(range, from) {
  const o = from || G.player;
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    const d = dist(o, e) - e.m.size;
    if (d < range && d < bd) { bd = d; best = e; }
  }
  return best;
}
// 普通攻击：剑士贴身砍（带被动剑法）；法师、灵使发射会追踪的弹丸
function playerAttack() {
  const p = G.player, st = stats(), C = CLASSES[S.cls] || CLASSES.blade;
  p.atkCd = C.atkCd;
  p.swing = 0.22;
  const best = nearestEnemy(C.range);
  if (!best) return;
  p.face = best.x >= p.x ? 1 : -1;
  p.dir = Math.atan2(best.y - p.y, best.x - p.x);
  if (C.bolt) {
    const basic = S.cls === 'mage' ? 'fire' : 'charm';
    let k = 1 + 0.08 * Math.max(0, skLv(basic));
    if (hasSk('bigfire')) { k += 0.25 + 0.1 * skLv('bigfire'); trainSkill('bigfire'); }
    trainSkill(basic);
    G.pproj.push({ x: p.x + p.face * 12, y: p.y - 22, e: best, atk: st.atk * k, c: C.bolt, life: 1.5, big: hasSk('bigfire') });
    return;
  }
  trainSkill('sword');
  let k = 1;
  if (hasSk('heavy')) { // 重击：每第 4 刀
    p.combo = (p.combo || 0) + 1;
    if (p.combo >= 4) { p.combo = 0; k = 1.6 + 0.2 * skLv('heavy'); trainSkill('heavy', 2); floatText(p.x, p.y - 62, '重击！', '#ffb02e', 14); }
  }
  if (hasSk('thrust')) { // 穿刺：顺着方向再刺中身后一个
    const bx = best.x + Math.cos(p.dir) * 60, by = best.y + Math.sin(p.dir) * 60;
    const second = G.enemies.find((e) => e !== best && Math.hypot(e.x - bx, e.y - by) < 55 + e.m.size);
    if (second) { hitEnemy(second, st.atk * (0.7 + 0.1 * skLv('thrust')), st); trainSkill('thrust'); }
  }
  hitEnemy(best, st.atk * k, st);
}
// 放技能。auto=true 是挂机时自动放：没有合适目标就不放，也不弹提示
function castSkill(id, auto) {
  const p = G.player, st = stats(), sk = SKILL_BY_ID[id], z = ZONES[G.zone];
  if (!sk || !hasSk(id) || sk.t !== 'active' || G.deadT > 0) return false;
  const say = (t) => { if (!auto) toast(t); return false; };
  if (p.cds[id] > 0) return false;
  if (z.safe) return say('城里不能放技能');
  const cost = skillCost(sk), l = skLv(id);
  if (p.mp < cost) return say('灵力不足，喝瓶灵泉（🔹）');
  switch (id) {
    case 'arc': {
      const hit = G.enemies.filter((e) => dist(p, e) < 115 + e.m.size);
      if (auto && !hit.length) return false;
      p.swing = 0.4;
      G.fx.push({ k: 'ring', x: p.x, y: p.y, t: 0, life: 0.45, r: 115 });
      for (const e of hit) hitEnemy(e, st.atk * (1.6 + 0.2 * l), st);
      break;
    }
    case 'push': {
      const hit = G.enemies.filter((e) => dist(p, e) < 130 + e.m.size);
      if (auto && !hit.length) return false;
      G.fx.push({ k: 'ring', x: p.x, y: p.y, t: 0, life: 0.45, r: 150, c: '#ffd27a' });
      for (const e of hit) {
        if (!e.m.boss) { const a = Math.atan2(e.y - p.y, e.x - p.x); e.x = clamp(e.x + Math.cos(a) * 140, 20, z.w - 20); e.y = clamp(e.y + Math.sin(a) * 140, 20, z.h - 20); }
        e.slow = 2;
        hitEnemy(e, st.atk * (1 + 0.15 * l), st);
      }
      break;
    }
    case 'charge': {
      const e = nearestEnemy(260);
      if (!e) return say('附近没有敌人');
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      G.fx.push({ k: 'dash', x: p.x, y: p.y, x2: e.x, y2: e.y, t: 0, life: 0.25 });
      p.x = clamp(e.x - Math.cos(a) * (e.m.size + 26), 20, z.w - 20);
      p.y = clamp(e.y - Math.sin(a) * (e.m.size + 26), 30, z.h - 20);
      p.face = e.x >= p.x ? 1 : -1; p.dir = a; p.swing = 0.3;
      e.slow = 2;
      hitEnemy(e, st.atk * (2.6 + 0.3 * l), st);
      break;
    }
    case 'flame': {
      const e = nearestEnemy(90);
      if (!e) return say('要贴近敌人才能用');
      p.face = e.x >= p.x ? 1 : -1; p.dir = Math.atan2(e.y - p.y, e.x - p.x); p.swing = 0.4;
      G.fx.push({ k: 'ring', x: e.x, y: e.y, t: 0, life: 0.4, r: 60, c: '#ff7a2a' });
      hitEnemy(e, st.atk * (3.2 + 0.4 * l), st);
      break;
    }
    case 'thunder': {
      const e = nearestEnemy(380);
      if (!e) return say('附近没有敌人');
      p.swing = 0.3;
      G.fx.push({ k: 'bolt', x: e.x, y: e.y, t: 0, life: 0.3 });
      hitEnemy(e, st.atk * (2.6 + 0.3 * l), st);
      break;
    }
    case 'wall': {
      const e = nearestEnemy(340);
      if (!e) return say('附近没有敌人');
      G.walls.push({ x: e.x, y: e.y, r: 95, t: 8, tk: 0, k: 0.5 + 0.08 * l });
      break;
    }
    case 'ice': {
      const e = nearestEnemy(360);
      if (!e) return say('附近没有敌人');
      G.fx.push({ k: 'ring', x: e.x, y: e.y, t: 0, life: 0.5, r: 150, c: '#9fe8ff' });
      G.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, r: 120 });
      for (const o of G.enemies.filter((o) => dist(o, e) < 140 + o.m.size)) { o.slow = 3; hitEnemy(o, st.atk * (2.4 + 0.3 * l), st); }
      break;
    }
    case 'ward':
      if (auto && (p.ward > 0 || !nearestEnemy(350))) return false;
      p.ward = Math.round(st.maxHp * (0.4 + 0.08 * l)); p.wardT = 15;
      floatText(p.x, p.y - 56, '灵盾 ' + p.ward, '#9fd8ff', 16);
      break;
    case 'heal':
      if (auto && p.hp > st.maxHp * 0.7 && !(G.pet && G.pet.hp < G.pet.maxHp * 0.5)) return false;
      p.mend = 5; p.mendK = 0.3 + 0.06 * l;
      floatText(p.x, p.y - 56, '治愈', '#7dff8a', 16);
      break;
    case 'venom': {
      const hit = G.enemies.filter((e) => dist(p, e) < 240 + e.m.size);
      if (!hit.length) return say('附近没有敌人');
      if (auto && hit.every((e) => e.poison > 2)) return false;
      G.fx.push({ k: 'ring', x: p.x, y: p.y, t: 0, life: 0.5, r: 240, c: '#8ae06a' });
      for (const e of hit) { e.poison = 8; e.pdmg = Math.round(st.atk * (0.3 + 0.05 * l)); e.ptk = 0; e.aggro = true; }
      break;
    }
    case 'bone':
      if (auto && G.pet) return false;
      if (G.pet && G.pet.kind === 'beast') return say('灵兽还在，不用召唤骨卫');
      if (G.pet) return say('骨卫还在（重新召唤等级会清零）');
      summonPet(st, 'bone', l);
      break;
    case 'beast':
      if (G.pet && G.pet.kind === 'beast') return say('灵兽还在（重新召唤等级会清零）');
      summonPet(st, 'beast', l);
      break;
    case 'armor':
      if (auto && (p.armorT > 0 || !nearestEnemy(300))) return false;
      p.armorT = 20; p.armorK = 0.3 + 0.08 * l;
      floatText(p.x, p.y - 56, `灵甲 防御 +${Math.round(p.armorK * 100)}%`, '#ffe08a', 15);
      break;
  }
  p.mp -= cost;
  p.cds[id] = sk.cd;
  trainSkill(id, 3);
  updateHud();
  return true;
}
// src：'pet' 灵兽打的（怪会转去咬灵兽）；'dot' 中毒掉血（无视防御、不暴击、不击退）
function hitEnemy(e, atk, st, src) {
  let dmg, crit = false;
  if (src === 'dot') dmg = Math.max(1, Math.round(atk));
  else {
    dmg = Math.max(1, Math.round(atk * rand(0.9, 1.1) - e.m.def * (e.poison > 0 ? 0.7 : 1) * 0.6));
    crit = Math.random() < st.crit;
    if (crit) dmg = Math.round(dmg * st.critDmg);
  }
  e.hp -= dmg;
  e.flash = 0.12;
  e.aggro = true;
  const pet = src === 'pet' && G.pet;
  if (pet) { e.tgt = G.pet; e.petHit = true; }
  if (src !== 'dot' && src !== 'wall' && !e.m.boss) {
    const o = pet ? G.pet : G.player;
    const ang = Math.atan2(e.y - o.y, e.x - o.x);
    e.x += Math.cos(ang) * 10; e.y += Math.sin(ang) * 10;
  }
  floatText(e.x + (pet ? 14 : 0), e.y - e.m.size - 6, (crit ? '暴击 ' : '') + dmg, src === 'dot' ? '#9be38a' : pet ? '#bfe6ff' : crit ? '#ffb02e' : '#fff', crit ? 19 : src === 'dot' || pet ? 13 : 15);
  if (e.hp <= 0) killEnemy(e);
}
// 灵使的召唤物：骨卫（Lv19）或灵兽（Lv35，更强）。同时只能有一个。
// S.pet 记着它的种类、等级（0~7，靠战功升）和战功，换地图、重新登录都还在；它死了或主人死了就清零。
// S.petGrow 是永久培养（攻 / 血 / 防，每级 +3%），对两种召唤物都有效。
const PET_KC = [8, 20, 40, 70, 110, 170, 250]; // 升到 1~7 级各要多少战功（小怪 1、精英 3、红名 5、BOSS 20）
const PET_MAX = 7, GROW_MAX = 20;
const FEED = {
  atk: { n: '利爪', ic: '🦷', mats: ['boar_tusk', 'stinger', 'ember', 'demon_horn', 'blood_ruby'] },
  hp: { n: '体魄', ic: '❤️', mats: ['slime_gel', 'leather', 'wolf_fur', 'croc_scale', 'sky_steel'] },
  def: { n: '硬皮', ic: '🛡️', mats: ['bone', 'iron_ore', 'magma_core', 'abyss_shard', 'chaos_crystal'] },
};
const feedCost = (k, n) => ({ gold: 150 * (n + 1) * (n + 1), [FEED[k].mats[Math.min(4, Math.floor(n / 4))]]: 4 + (n % 4) * 2 });
// 按主人当前属性、技能等级、召唤物等级、永久培养，重新算召唤物的属性（保持血量百分比）
function petCalc(st) {
  const s = S.pet, pet = G.pet;
  if (!s || !pet) return;
  const beast = s.kind === 'beast', g = S.petGrow, lk = 1 + 0.1 * s.lv, ratio = pet.maxHp ? pet.hp / pet.maxHp : 1;
  pet.maxHp = Math.round(st.maxHp * (beast ? 1.4 : 0.8) * lk * (1 + 0.03 * g.hp));
  pet.hp = pet.maxHp * ratio;
  pet.atk = Math.round(st.atk * (beast ? 0.85 + 0.1 * s.sl : 0.55 + 0.08 * s.sl) * lk * (1 + 0.03 * g.atk));
  pet.def = Math.round(st.def * (beast ? 1 : 0.8) * lk * (1 + 0.03 * g.def));
}
function makePet(st) {
  const p = G.player, beast = S.pet.kind === 'beast';
  G.pet = { kind: S.pet.kind, n: beast ? '灵兽' : '骨卫', ic: beast ? '🐅' : '💀', x: p.x + 30, y: p.y + 10, hp: 1, maxHp: 0, atk: 0, def: 0, cd: 0, face: 1, flash: 0 };
  petCalc(st);
  G.pet.hp = G.pet.maxHp;
}
function summonPet(st, kind, l) {
  S.pet = { kind, lv: 0, kc: 0, sl: l };
  makePet(st);
  G.fx.push({ k: 'puff', x: G.pet.x, y: G.pet.y, t: 0, life: 0.45, r: 30 });
  toast(`${G.pet.ic} ${G.pet.n}出现了`);
  markDirty();
}
// 召唤物参与打死的怪算战功，够了就升级
function petGain(n) {
  const s = S.pet;
  if (!s || !G.pet || s.lv >= PET_MAX) return;
  s.kc += n;
  let up = false;
  while (s.lv < PET_MAX && s.kc >= PET_KC[s.lv]) { s.kc -= PET_KC[s.lv]; s.lv++; up = true; }
  if (up) {
    petCalc(stats());
    G.pet.hp = G.pet.maxHp;
    G.fx.push({ k: 'ring', x: G.pet.x, y: G.pet.y, t: 0, life: 0.5, r: 60, c: '#ffe08a' });
    floatText(G.pet.x, G.pet.y - 50, 'LEVEL UP!', '#ffe066', 16);
    toast(`${G.pet.ic} ${G.pet.n}升到 ${s.lv} 级！`);
  }
  markDirty();
}
function losePet() { G.pet = null; S.pet = null; markDirty(); }
function petPanelHtml() {
  const s = S.pet, pet = G.pet, g = S.petGrow;
  let h = `<div class="desc">召唤物参与打死的怪算<b>战功</b>（小怪 1、精英 3、红名 5、BOSS 20），攒够就升级，最高 ${PET_MAX} 级，每级攻击、防御、生命 +10%。换地图、重新登录它都还在；<b style="color:#ff8f80">它战死或你战死，等级清零</b>。</div>`;
  if (s && pet) {
    const full = s.lv >= PET_MAX;
    h += `<div class="row"><div class="ic">${pet.ic}</div><div class="info"><b>${pet.n} · ${s.lv} 级</b><small>生命 ${Math.ceil(pet.hp)}/${pet.maxHp} · 攻击 ${pet.atk} · 防御 ${pet.def}</small>
      <div class="prog"><div style="width:${full ? 100 : (s.kc / PET_KC[s.lv]) * 100}%"></div></div><small>${full ? '已满级' : `战功 ${s.kc}/${PET_KC[s.lv]}`}</small></div></div>`;
  } else h += `<div class="row" style="opacity:.55"><div class="ic">🐾</div><div class="info"><b>现在没有召唤物</b><small>Lv.19 学「唤骨卫」，Lv.35 学「唤灵兽」，到野外按技能召唤</small></div></div>`;
  h += `<div class="section-t">永久培养（每级 +3%，最高 ${GROW_MAX} 级，对骨卫和灵兽都有效，不会清零）</div>`;
  for (const k of ['atk', 'hp', 'def']) {
    const n = g[k], F = FEED[k], label = { atk: '攻击', hp: '生命', def: '防御' }[k];
    if (n >= GROW_MAX) { h += `<div class="row"><div class="ic">${F.ic}</div><div class="info"><b>${F.n} ${n} 级</b><small>召唤物${label} +${n * 3}% · 已培养到顶</small></div></div>`; continue; }
    const c = feedCost(k, n);
    h += `<div class="row"><div class="ic">${F.ic}</div><div class="info"><b>${F.n} ${n} 级 → ${n + 1} 级</b><small>召唤物${label} +${n * 3}% → +${(n + 1) * 3}%</small><div>${needHtml(c)}</div></div>
      <div class="acts"><button class="btn primary" data-act="feed:${k}" ${canAfford(c) ? '' : 'disabled'}>喂养</button></div></div>`;
  }
  return h;
}
function dropBook() {
  const c = mySkills().filter((sk) => sk.t !== 'basic' && !hasSk(sk.id) && !has('book_' + sk.id) && sk.lv <= ZONES[G.zone].lv + 8);
  if (!c.length) return;
  const sk = pick(c);
  give('book_' + sk.id, 1);
  toast(`📕 掉落技能书《${sk.n}》！到背包「物品」里学习`);
}
function hurtPet(dmg) {
  const pet = G.pet;
  if (!pet) return;
  pet.hp -= dmg;
  pet.flash = 0.12;
  floatText(pet.x, pet.y - 30, '-' + dmg, '#ffb0a0', 12);
}
function updatePet(dt, st) {
  const pet = G.pet, p = G.player;
  if (!pet) return;
  if (pet.hp <= 0) {
    G.fx.push({ k: 'puff', x: pet.x, y: pet.y, t: 0, life: 0.45, r: 30 });
    losePet();
    toast(`${pet.ic} ${pet.n}战死了，等级清零，冷却好了再召唤`);
    return;
  }
  pet.cd -= dt; pet.flash -= dt;
  petCalc(st); // 主人升级、换装备后，召唤物属性跟着变
  pet.hp = Math.min(pet.maxHp, pet.hp + pet.maxHp * 0.01 * dt);
  if (dist(pet, p) > 700) { pet.x = p.x; pet.y = p.y; }
  let tgt = null, bd = 1e9;
  for (const e of G.enemies) {
    if (!e.aggro || dist(p, e) > 420) continue;
    const d = dist(pet, e);
    if (d < bd) { bd = d; tgt = e; }
  }
  let tx = p.x - p.face * 34, ty = p.y + 14, stop = 8;
  if (tgt) { tx = tgt.x; ty = tgt.y; stop = tgt.m.size + 20; }
  const dx = tx - pet.x, dy = ty - pet.y, dl = Math.hypot(dx, dy);
  if (dl > stop) {
    pet.x += (dx / dl) * 210 * dt; pet.y += (dy / dl) * 210 * dt;
    if (Math.abs(dx) > 2) pet.face = dx > 0 ? 1 : -1;
  }
  if (tgt && dl <= stop + 8 && pet.cd <= 0) { pet.cd = 0.9; hitEnemy(tgt, pet.atk, st, 'pet'); }
}
// 掉在地上的装备：走近自动捡
function dropGear(g, x, y) {
  const z = ZONES[G.zone];
  G.loot.push({ g, x: clamp(x + rand(-30, 30), 20, z.w - 20), y: clamp(y + rand(-8, 28), 30, z.h - 20), t: 120 });
}
function pickLoot(dt) {
  const p = G.player;
  for (const l of G.loot) {
    l.t -= dt;
    if (l.t <= 0 || Math.hypot(p.x - l.x, p.y - l.y) > 44) continue;
    const g = l.g;
    if (S.opt.autoSell && g.q === 0) {
      const v = gearPrice(g);
      S.gold += v; l.t = 0;
      floatText(l.x, l.y - 20, `+${v}💰 ${gearName(g)}`, '#ffd98a', 12);
      markDirty();
      continue;
    }
    if (S.gear.length >= BAG_MAX) {
      if (G.t - (G.fullT || -9) > 4) { G.fullT = G.t; toast(`🎒 装备背包满了（${BAG_MAX}/${BAG_MAX}），打开背包卖掉一些`); }
      continue;
    }
    S.gear.push(g); l.t = 0;
    floatText(l.x, l.y - 20, '拾取 ' + gearName(g), QUALITY[g.q].c, 13);
    if (g.q >= 3) toast(`✨ 获得${QUALITY[g.q].n}装备「${gearName(g)}」`);
    markDirty();
  }
  G.loot = G.loot.filter((l) => l.t > 0);
}
// 红名恶徒：AI 扮演的敌对玩家，比同图精英怪还强，必掉装备
function spawnRogue() {
  const z = ZONES[G.zone];
  if (!z.mons) return;
  const ref = MONS[z.mons[z.mons.length - 1]], cls = pick(CLASS_IDS), C = CLASSES[cls];
  const m = {
    n: pick(ROGUE_NAMES), rogue: cls, hp: Math.round(ref.hp * 4.5), atk: Math.round(ref.atk * 1.25), def: Math.round(ref.def * 1.1),
    exp: ref.exp * 6, gold: [ref.gold[0] * 8, ref.gold[1] * 8], spd: 115, size: 20, drops: [],
    ranged: C.bolt ? { range: 300, keep: cls === 'mage' ? 170 : 110, cd: 1.6, spd: 300, c: C.bolt } : null,
  };
  let x, y, tries = 0;
  do { x = 80 + Math.random() * (z.w - 160); y = 80 + Math.random() * (z.h - 160); tries++; }
  while (tries < 50 && (Math.hypot(x - G.portal.x, y - G.portal.y) < 420 || Math.hypot(x - G.player.x, y - G.player.y) < 360));
  G.enemies.push({ type: 'rogue', m, x, y, sx: x, sy: y, hp: m.hp, tx: x, ty: y, wait: 1, cd: 0, flash: 0, aggro: false, face: 1, nest: false });
}
// 挂机：自动走向最近的怪并攻击，没怪时去捡地上的装备
function autoMove() {
  const p = G.player, C = CLASSES[S.cls] || CLASSES.blade;
  let tgt = null, bd = 1e9;
  for (const e of G.enemies) {
    const d = dist(p, e) - (e.aggro ? 250 : 0); // 优先打已经盯上自己的
    if (d < 3000 && d < bd) { bd = d; tgt = e; } // 地图大，附近没怪就走远一点去找
  }
  G.autoTgt = tgt;
  // 脚边有掉落、又没有怪正贴着打自己时，先去捡
  let loot = null, ld = 260;
  for (const l of G.loot) {
    if (S.gear.length >= BAG_MAX && !(S.opt.autoSell && l.g.q === 0)) continue;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < ld) { ld = d; loot = l; }
  }
  const busy = G.enemies.some((e) => e.aggro && dist(p, e) < 170 + e.m.size);
  if (loot && (!tgt || !busy)) {
    if (!busy) G.autoTgt = null;
    return ld > 10 ? { x: (loot.x - p.x) / ld, y: (loot.y - p.y) / ld } : null;
  }
  if (tgt) {
    const d = dist(p, tgt), reach = (C.bolt ? C.range * 0.8 : C.range - 14) + tgt.m.size;
    if (d > reach) return { x: (tgt.x - p.x) / d, y: (tgt.y - p.y) / d };
    p.face = tgt.x >= p.x ? 1 : -1;
    return null;
  }
  return null;
}
function autoUse(st) {
  const p = G.player;
  if (p.hp < st.maxHp * 0.45) usePotion(true);
  if (p.mp < st.maxMp * 0.25) useMana(true);
  if (G.autoTgt && dist(p, G.autoTgt) < 400) for (const sk of activeSkills()) castSkill(sk.id, true);
}
function toggleAuto(on) {
  G.auto = on === undefined ? !G.auto : on;
  $('#btnAuto').classList.toggle('active', G.auto);
  toast(G.auto ? '🤖 挂机开启：自动找怪、放技能、喝药、捡装备（推摇杆可以随时接管）' : '🤖 挂机关闭');
}
function killEnemy(e) {
  G.enemies.splice(G.enemies.indexOf(e), 1);
  const m = e.m;
  const gold = ri(m.gold[0], m.gold[1]);
  give('gold', gold);
  const got = [];
  const rolls = m.elite ? 2 : 1;
  for (let r = 0; r < rolls; r++) for (const [k, ch] of m.drops) if (Math.random() < ch) { give(k, 1); got.push(k); }
  // 稀有任务材料（精英怪概率更高）
  const zl = ZONES[G.zone].lv;
  const rare = m.elite ? 3 : 1;
  if (Math.random() < 0.035 * rare) { give('upgrade_stone', 1); got.push('upgrade_stone'); }
  if (zl >= 15 && Math.random() < 0.03 * rare) { give('upgrade_stone_2', 1); got.push('upgrade_stone_2'); }
  if (zl >= 25 && Math.random() < 0.015 * rare) { give('upgrade_stone_3', 1); got.push('upgrade_stone_3'); }
  if (zl >= 35 && Math.random() < 0.01 * rare) { give('upgrade_stone_4', 1); got.push('upgrade_stone_4'); }
  // 装备掉落：落在地上，走过去捡。BOSS 必掉 3 件，有机会掉高一档的
  const tier = gearTierOf(G.zone);
  if (Math.random() < (m.boss ? 1 : m.rogue ? 0.3 : m.elite ? 0.03 : 0)) dropBook();
  if (m.boss) for (let i = 0; i < 3; i++) dropGear(makeGear(tier + (Math.random() < 0.4 ? 1 : 0), 'boss'), e.x, e.y);
  else if (m.rogue) {
    dropGear(makeGear(tier, 'rogue'), e.x, e.y);
    if (Math.random() < 0.4) dropGear(makeGear(tier, 'rogue'), e.x, e.y);
    S.stat.pk++;
    toast(`⚔️ 击败红名恶徒「${m.n}」`);
  } else if (Math.random() < (m.elite ? 0.4 : 0.09)) dropGear(makeGear(tier, m.elite ? 'elite' : 'mob'), e.x, e.y);
  if (G.autoTgt === e) G.autoTgt = null;
  if (m.elite) toast(`⭐ 击败 ${m.n}`);
  S.stat.kills++;
  if (e.petHit) petGain(m.boss ? 20 : m.rogue ? 5 : m.elite ? 3 : 1);
  if (m.boss) { S.stat.boss++; toast(`🏆 击败了 ${m.n}！`); }
  floatText(e.x, e.y - 10, '+' + gold + '💰', '#ffd98a', 14, 0.25);
  got.forEach((k, i) => floatText(e.x, e.y + 8 + i * 16, '+' + itemIc(k) + itemName(k), '#bff5b3', 13, 0.4 + i * 0.15));
  G.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.45, r: m.size * 1.6 });
  for (const q of S.quests) if (q.type === 'kill' && q.mon === e.type && q.cur < q.n) q.cur++;
  gainExp(m.exp);
  G.respawns.push({ type: e.type, t: m.boss ? 150 : m.rogue ? 90 : 7, boss: m.boss, rogue: !!m.rogue, nest: e.nest, x: e.sx, y: e.sy });
  markDirty();
  updateHud();
}

function hurtPlayer(dmg) {
  const p = G.player;
  if (G.deadT > 0) return;
  if (p.ward > 0) { // 法师「灵盾」先吸收
    const ab = Math.min(p.ward, dmg);
    p.ward -= ab; dmg -= ab;
    floatText(p.x, p.y - 60, '盾 -' + ab, '#9fd8ff', 13);
    if (dmg <= 0) return;
  }
  p.hp -= dmg;
  p.hurt = 0.2;
  floatText(p.x, p.y - 44, '-' + dmg, '#ff6b5b', 16);
  if (p.hp <= 0) {
    p.hp = 0;
    G.deadT = 2;
    losePet(); p.armorT = 0; p.ward = 0; p.mend = 0;
    const lost = Math.floor(S.gold * 0.1);
    S.gold -= lost;
    S.stat.deaths++;
    toast(`💀 你倒下了…遗失 ${lost} 金币，回城休整`);
    markDirty();
  }
  updateHud();
}

function usePotion(quiet) {
  const p = G.player, st = stats();
  if (p.hp >= st.maxHp) { if (!quiet) toast('生命值已满'); return; }
  const order = POTION_ORDER;
  const missing = st.maxHp - p.hp;
  // 选一瓶最合适的：够用的最小一瓶，没有就用最大的
  let chosen = null;
  for (const k of order) if (has(k) > 0 && ITEMS[k].heal >= missing * 0.7) { chosen = k; break; }
  if (!chosen) for (const k of order.slice().reverse()) if (has(k) > 0) { chosen = k; break; }
  if (!chosen) { if (!quiet || G.t - (G.noPotT || -99) > 15) { G.noPotT = G.t; toast('没有药水了，去杂货铺买吧'); } return; }
  take(chosen, 1);
  p.hp = Math.min(st.maxHp, p.hp + ITEMS[chosen].heal);
  floatText(p.x, p.y - 44, '+' + ITEMS[chosen].heal, '#7dff8a', 16);
  markDirty();
  updateHud();
}

function useMana(quiet) {
  const p = G.player, st = stats();
  if (p.mp >= st.maxMp) { if (!quiet) toast('灵力已满'); return; }
  const missing = st.maxMp - p.mp;
  let chosen = null;
  for (const k of MANA_ORDER) if (has(k) > 0 && ITEMS[k].mana >= missing * 0.7) { chosen = k; break; }
  if (!chosen) for (const k of MANA_ORDER.slice().reverse()) if (has(k) > 0) { chosen = k; break; }
  if (!chosen) { if (!quiet) toast('没有灵泉了，去杂货铺买吧'); return; }
  take(chosen, 1);
  p.mp = Math.min(st.maxMp, p.mp + ITEMS[chosen].mana);
  floatText(p.x, p.y - 44, '+' + ITEMS[chosen].mana, '#7fc4ff', 16);
  markDirty();
  updateHud();
}

// 加速饮料：指定 id 就喝那瓶，否则喝效果最强的那瓶
function useDrink(id) {
  const now = Date.now();
  const k = id || DRINK_ORDER.find((d) => has(d) > 0);
  if (!k || has(k) <= 0) { toast('没有加速饮料，去杂货铺买（杂货铺 Lv2 解锁）'); return; }
  const I = ITEMS[k];
  const active = S.spd.until > now;
  if (active && S.spd.m > I.speed) { toast(`当前 ×${S.spd.m} 加速更强，等它结束再喝`); return; }
  take(k, 1);
  if (active && S.spd.m === I.speed) S.spd.until += I.dur * 1000; // 同档位叠加时间
  else S.spd = { m: I.speed, until: now + I.dur * 1000 };
  toast(`${I.ic} 移动速度 ×${I.speed}，持续 ${Math.round((S.spd.until - now) / 1000)} 秒`);
  if (G.player) floatText(G.player.x, G.player.y - 50, '加速 ×' + I.speed, '#7fe4ff', 16);
  markDirty();
  updateHud();
}

/* ===================== 交互 ===================== */
function findNear() {
  const p = G.player;
  if (G.zone === 'village') {
    for (const n of G.npcs) if (Math.hypot(p.x - n.x, p.y - n.y) < n.r) return { kind: 'npc', ref: n, label: n.n };
    return null;
  }
  const z = ZONES[G.zone];
  if (Math.hypot(p.x - G.portal.x, p.y - G.portal.y) < 80) return { kind: 'portal', label: z.prev ? '回上一层' : '回城' };
  if (G.stairs && Math.hypot(p.x - G.stairs.x, p.y - G.stairs.y) < 80) return { kind: 'stairs', label: '去' + ZONES[G.stairs.to].n };
  let best = null, bd = 70;
  for (const nd of G.nodes) {
    if (!nd.ready) continue;
    const d = Math.hypot(p.x - nd.x, p.y - nd.y);
    if (d < bd) { bd = d; best = nd; }
  }
  return best ? { kind: 'node', ref: best, label: '采集' + NODE_YIELD[best.kind].n } : null;
}
function interact() {
  const n = G.near;
  if (!n) return;
  if (n.kind === 'portal') return travel(ZONES[G.zone].prev || 'village');
  if (n.kind === 'stairs') return travel(G.stairs.to);
  if (n.kind === 'node') {
    const nd = n.ref;
    nd.ready = false;
    nd.t = 35;
    NODE_YIELD[nd.kind].give.forEach(([k, a, b], i) => {
      const c = ri(a, b);
      give(k, c);
      floatText(nd.x, nd.y - 30 - i * 16, `+${c} ${itemIc(k)}${itemName(k)}`, '#bff5b3', 14);
    });
    G.fx.push({ k: 'puff', x: nd.x, y: nd.y, t: 0, life: 0.35, r: 26 });
    markDirty();
    return;
  }
  if (n.kind === 'npc') {
    const id = n.ref.id;
    if (id === 'gate') openPanel('map');
    else openPanel(id);
  }
}
function travel(zid) {
  const z = ZONES[zid];
  if (S.lv < z.lv) { toast(`需要 Lv.${z.lv} 才能前往`); return; }
  closePanel();
  enterZone(zid, false, G.zone);
  markDirty();
}

/* ===================== 任务 ===================== */
function unlockedZones() { return ZONE_ORDER.filter((z) => S.lv >= ZONES[z].lv); }
function genQuest() {
  const zs = unlockedZones().slice(-2);
  const zid = pick(zs);
  const z = ZONES[zid];
  const mon = pick(z.mons);
  const m = MONS[mon];
  const stones = ri(1, 2) + (S.lv >= 10 ? 1 : 0) + (S.lv >= 25 ? 1 : 0);
  const stones2 = S.lv >= 12 && Math.random() < 0.55 ? 1 : 0;
  const stones3 = S.lv >= 25 && Math.random() < 0.35 ? 1 + (S.lv >= 35 ? 1 : 0) : 0;
  const stones4 = S.lv >= 38 && Math.random() < 0.3 ? 1 : 0;
  if (Math.random() < 0.6) {
    const n = ri(5, 12);
    return { id: Date.now() + Math.random(), type: 'kill', mon, n, cur: 0, zone: zid,
      reward: { gold: Math.round(n * (m.gold[0] + m.gold[1]) * 1.5), exp: Math.round(n * m.exp * 1.3), upgrade_stone: stones, upgrade_stone_2: stones2, upgrade_stone_3: stones3, upgrade_stone_4: stones4 } };
  }
  const item = m.drops[0][0];
  const n = ri(4, 9);
  return { id: Date.now() + Math.random(), type: 'collect', item, n, zone: zid,
    reward: { gold: Math.round(n * ITEMS[item].p * 3 + 20), exp: Math.round(n * m.exp * 1.1), upgrade_stone: stones, upgrade_stone_2: stones2, upgrade_stone_3: stones3, upgrade_stone_4: stones4 } };
}
function fillQuests() {
  while (S.quests.length < 3) S.quests.push(genQuest());
}
function questDone(q) { return q.type === 'kill' ? q.cur >= q.n : has(q.item) >= q.n; }
function questText(q) {
  if (q.type === 'kill') return `讨伐 ${MONS[q.mon].n} ×${q.n}`;
  return `收集 ${ITEMS[q.item].n} ×${q.n}`;
}
function completeQuest(i) {
  const q = S.quests[i];
  if (!q || !questDone(q)) return;
  if (q.type === 'collect') take(q.item, q.n);
  for (const [k, v] of Object.entries(q.reward)) if (v > 0 && k !== 'exp') give(k, v);
  gainExp(q.reward.exp);
  if (S.gear.length < BAG_MAX) { // 任务额外送一件当前地图档次的装备
    const g = makeGear(gearTierOf(q.zone), 'elite');
    S.gear.push(g);
    toast(`🎁 任务奖励装备「${gearName(g)}」（${QUALITY[g.q].n}）`);
  }
  S.quests.splice(i, 1);
  fillQuests();
  toast('✅ 任务完成！获得强化石等奖励');
  markDirty();
  updateHud();
}

/* ===================== 家园生产 ===================== */
function facilityState(f) {
  const lv = facLv(f);
  if (!lv) return null;
  const now = Date.now();
  if (!S.house.prod[f.id]) S.house.prod[f.id] = now;
  const cap = facCap(lv);
  const units = Math.min(cap, Math.floor((now - S.house.prod[f.id]) / (PROD_SEC * 1000)));
  const next = PROD_SEC - Math.floor(((now - S.house.prod[f.id]) / 1000) % PROD_SEC);
  return { units, next, cap, lv };
}
function collectFacility(f) {
  const st = facilityState(f);
  if (!st || st.units <= 0) return;
  const g = facGive(f, st.lv);
  const parts = [];
  for (const [k, v] of Object.entries(g)) { give(k, v * st.units); parts.push(itemIc(k) + fmt(v * st.units)); }
  if (st.units >= st.cap) S.house.prod[f.id] = Date.now();
  else S.house.prod[f.id] += st.units * PROD_SEC * 1000;
  toast(`${f.ic} 收获 ${parts.join(' ')}`);
  markDirty();
}
function upgradeFacility(f) {
  const lv = facLv(f);
  if (!lv || lv >= FAC_MAX) return;
  const need = facNeedTier(f, lv + 1);
  if (S.house.tier < need) return toast(`需要家园「${HOUSE[need].n}」`);
  const c = facUpCost(f, lv);
  if (!canAfford(c)) return toast('材料不足');
  collectFacility(f); // 先把已有产出收了，免得浪费
  payCost(c);
  S.house.fac[f.id] = lv + 1;
  toast(`${f.ic} ${f.n} 升到 ${lv + 1} 级！产量 ×${facMult(lv + 1)}，仓库 ${facCap(lv + 1)} 次`);
  markDirty();
}

/* ===================== 面板 UI ===================== */
let panelId = null;
const PTAB = { shop: 'sell', house: 'home', bag: 'gear', hero: 'me' }; // 面板顶部分页，记住上次选的
function tabBar(panel, tabs) {
  return '<div class="tabbar" style="grid-template-columns:repeat(' + tabs.length + ',1fr)">' +
    tabs.map(([id, n]) => `<button class="ptab ${PTAB[panel] === id ? 'on' : ''}" data-act="tab:${panel}|${id}">${n}</button>`).join('') + '</div>';
}
function openPanel(id) {
  panelId = id;
  G.paused = id === 'cls' || id === 'settings'; // 只有选职业和设置会暂停；背包、角色等面板开着时游戏照常进行
  G.atkHeld = false;
  $('#panel').classList.remove('hidden');
  $('#pClose').classList.toggle('hidden', id === 'cls');
  renderPanel();
}
function closePanel() {
  if (S && G.running && !S.cls) return; // 还没选职业，不能关
  panelId = null;
  G.paused = false;
  $('#panel').classList.add('hidden');
}
$('#pClose').addEventListener('click', closePanel);
$('#panel').addEventListener('click', (e) => { if (e.target.id === 'panel') closePanel(); });
document.querySelectorAll('#menuBar button').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.open)));

function renderPanel() {
  const T = $('#pTitle'), B = $('#pBody');
  const fn = PANELS[panelId];
  if (!fn) return;
  const r = fn();
  T.textContent = r.title;
  B.innerHTML = r.html;
  B.querySelectorAll('[data-act]').forEach((el) =>
    el.addEventListener('click', () => {
      const [act, arg] = el.dataset.act.split(':');
      ACTIONS[act] && ACTIONS[act](arg);
      updateHud();
      if (panelId) renderPanel();
    })
  );
}

const PANELS = {
  bag() {
    let h = tabBar('bag', [['gear', `🗡️ 装备（${S.gear.length}/${BAG_MAX}）`], ['item', '🎒 物品']]);
    if (PTAB.bag === 'gear') {
      h += `<div class="desc">怪物掉的装备落在地上，走过去就捡起来。<b style="color:#9be38a">▲</b> 比身上的好，<b style="color:#ff8f80">▼</b> 比身上的差。武器和衣甲分职业。</div>
        <div class="row"><div class="ic">♻️</div><div class="info"><b>随身回收</b><small>捡到普通装备直接换金币：${S.opt.autoSell ? '<b style="color:#9be38a">已开启</b>' : '未开启'}</small></div>
        <div class="acts col"><button class="btn" data-act="autosell">${S.opt.autoSell ? '关闭' : '开启'}自动回收</button><button class="btn red" data-act="sellq:0">卖掉全部普通</button><button class="btn red" data-act="sellq:1">卖掉精良及以下</button></div></div>`;
      if (!S.gear.length) h += '<div class="empty">还没有捡到装备，去野外打怪吧！</div>';
      const list = S.gear.slice().sort((a, b) => b.q - a.q || b.t - a.t);
      for (const g of list) {
        const cur = S.equip[g.s], ok = canEquip(g);
        const diff = gearScore(g) - (cur ? gearScore(cur) : 0);
        const cmp = !ok ? '' : diff > 0.5 ? ' <b style="color:#9be38a">▲</b>' : diff < -0.5 ? ' <b style="color:#ff8f80">▼</b>' : '';
        const why = g.c && g.c !== S.cls ? CLASSES[g.c].n + '专用' : 'Lv.' + TIER_LV[g.t];
        h += `<div class="row"><div class="ic">${SLOT_IC[g.s]}</div><div class="info">${gearHtml(g)}${cmp}<small>${QUALITY[g.q].n}${SLOT_N[g.s]} · 需要 Lv.${TIER_LV[g.t]}${g.c ? ' · ' + CLASSES[g.c].n : ''}</small><small>${gearText(g)}</small></div>
          <div class="acts col">${ok ? `<button class="btn primary" data-act="equip:${g.id}">穿戴</button>` : `<button class="btn" disabled>${why}</button>`}<button class="btn" data-act="sellgear:${g.id}">卖 ${fmt(gearPrice(g))}</button></div></div>`;
      }
      return { title: '🎒 背包', html: h };
    }
    const keys = Object.keys(S.inv).filter((k) => S.inv[k] > 0);
    h += `<div class="desc">💰 金币：<b>${fmt(S.gold)}</b>　材料可以在城里杂货铺卖钱，💎强化石用于铁匠铺强化装备。</div>`;
    if (!keys.length) h += '<div class="empty">背包空空的，去野外打怪吧！</div>';
    else h += '<div class="grid">' + keys.map((k) => `<div class="cell"><span class="n">${fmt(S.inv[k])}</span><span class="ic">${itemIc(k)}</span>${itemName(k)}</div>`).join('') + '</div>';
    const usable = [...POTION_ORDER, ...MANA_ORDER, ...DRINK_ORDER.slice().reverse()].filter((k) => has(k) > 0);
    if (usable.length) {
      h += '<div class="section-t">使用道具</div>';
      for (const k of usable) {
        const I = ITEMS[k];
        const eff = I.heal ? '回复 ' + I.heal + ' 生命' : I.mana ? '回复 ' + I.mana + ' 灵力' : '移动速度 ×' + I.speed + '，' + I.dur + ' 秒';
        h += `<div class="row"><div class="ic">${I.ic}</div><div class="info"><b>${I.n} ×${has(k)}</b><small>${eff}</small></div>
          <div class="acts"><button class="btn green" data-act="${I.heal ? 'drinkhp' : I.mana ? 'drinkmp' : 'drinkspd'}:${k}">使用</button></div></div>`;
      }
    }
    const books = keys.filter((k) => ITEMS[k] && ITEMS[k].book);
    if (books.length) {
      h += '<div class="section-t">技能书</div>';
      for (const k of books) {
        const sk = SKILL_BY_ID[ITEMS[k].book], mine = sk.cls === S.cls;
        const btn = !mine ? `<button class="btn" disabled>${CLASSES[sk.cls].n}的书</button>` : hasSk(sk.id) ? '<button class="btn" disabled>已学会</button>' : S.lv < sk.lv ? `<button class="btn" disabled>Lv.${sk.lv}</button>` : `<button class="btn primary" data-act="learn:${k}">学习</button>`;
        h += `<div class="row"><div class="ic">📕</div><div class="info"><b>${ITEMS[k].n} ×${has(k)}</b><small>${sk.desc(0)}</small></div><div class="acts">${btn}</div></div>`;
      }
    }
    if (has('herb') >= 3) h += `<div class="section-t">炼药</div><div class="row"><div class="ic">🌿</div><div class="info"><b>3 草药 → 1 小药水</b><small>有 ${has('herb')} 个草药</small></div><div class="acts"><button class="btn green" data-act="brew">炼制</button></div></div>`;
    return { title: '🎒 背包', html: h };
  },
  hero() {
    const st = stats(), p = G.player, C = CLASSES[S.cls] || CLASSES.blade;
    const tabs = S.cls === 'spirit' ? tabBar('hero', [['me', '🧝 角色'], ['pet', '🐾 召唤物']]) : '';
    if (tabs && PTAB.hero === 'pet') return { title: '🧝 ' + S.name, html: tabs + petPanelHtml() };
    let h = tabs + `<div class="statgrid">
      <div class="stat">职业<b>${C.ic} ${C.n}</b></div>
      <div class="stat">等级<b>Lv.${S.lv}</b></div>
      <div class="stat">生命<b>${Math.ceil(p.hp)}/${st.maxHp}</b></div>
      <div class="stat">灵力<b>${Math.floor(p.mp)}/${st.maxMp}</b></div>
      <div class="stat">${C.statN}<b>${Math.round(st.atk * 0.9)}-${Math.round(st.atk * 1.1)}</b></div>
      <div class="stat">防御<b>${st.def}</b></div>
      <div class="stat">暴击<b>${Math.round(st.crit * 100)}%</b></div>
      <div class="stat">暴伤<b>${Math.round(st.critDmg * 100)}%</b></div>
      <div class="stat">经验<b>${S.exp}/${expNeed(S.lv)}</b></div>
      <div class="stat">家园<b>${HOUSE[S.house.tier].n}</b></div>
      <div class="stat">击杀<b>${S.stat.kills}</b></div>
      <div class="stat">击败BOSS<b>${S.stat.boss}</b></div>
      <div class="stat">击败红名<b>${S.stat.pk}</b></div>
      <div class="stat">阵亡<b>${S.stat.deaths}</b></div></div>
      <div class="section-t">身上的装备</div>`;
    for (const s of SLOTS) {
      const g = S.equip[s];
      h += g
        ? `<div class="row"><div class="ic">${SLOT_IC[s]}</div><div class="info">${gearHtml(g)}<small>${QUALITY[g.q].n}${SLOT_N[s]} · ${gearText(g)}</small></div><div class="acts"><button class="btn" data-act="unequip:${s}">卸下</button></div></div>`
        : `<div class="row" style="opacity:.55"><div class="ic">${SLOT_IC[s]}</div><div class="info"><b>${SLOT_N[s]}：空</b><small>打怪掉落，在背包里穿戴</small></div></div>`;
    }
    h += '<div class="section-t">技能（技能书在杂货铺「📖 书架」买，红名和 BOSS 也会掉；用得越多等级越高）</div>';
    for (const sk of mySkills()) {
      const k = S.sk[sk.id], tag = { basic: '普攻', passive: '被动', active: '主动' }[sk.t];
      if (!k) { h += `<div class="row" style="opacity:.5"><div class="ic">🔒</div><div class="info"><b>${sk.n}</b> <small style="display:inline">（${tag}）</small><small>${sk.desc(0)}</small><small>Lv.${sk.lv} 可学 · 需要技能书</small></div></div>`; continue; }
      const need = sk.lv + SK_LVADD[Math.min(2, k.l)];
      const prog = k.l >= 3 ? '已练满' : `熟练度 ${Math.min(k.x, SK_PTS[k.l])}/${SK_PTS[k.l]}${S.lv < need ? ' · 升级还要人物 Lv.' + need : ''}`;
      h += `<div class="row"><div class="ic">${sk.ic}</div><div class="info"><b>${sk.n} · ${k.l} 级</b> <small style="display:inline">（${tag}）</small><small>${sk.desc(k.l)}</small>
        ${sk.t === 'active' ? `<small>冷却 ${sk.cd} 秒 · 灵力 ${skillCost(sk)}</small>` : ''}<div class="prog"><div style="width:${k.l >= 3 ? 100 : Math.min(100, (k.x / SK_PTS[k.l]) * 100)}%"></div></div><small>${prog}</small></div></div>`;
    }
    return { title: '🧝 ' + S.name, html: h };
  },
  quests() {
    fillQuests();
    let h = '<div class="desc">任务在城里「任务板」交付。完成任务可以获得 💎强化石（强化装备必需）。</div>';
    S.quests.forEach((q, i) => {
      const done = questDone(q);
      const cur = q.type === 'kill' ? q.cur : Math.min(has(q.item), q.n);
      const rw = Object.entries(q.reward).filter(([, v]) => v > 0).map(([k, v]) => (k === 'exp' ? `✨${v}经验` : `${itemIc(k)}${v}`)).join(' ');
      const canTurn = G.zone === 'village';
      h += `<div class="row"><div class="ic">${q.type === 'kill' ? '⚔️' : '📦'}</div><div class="info"><b>${questText(q)}</b>
        <small>📍${ZONES[q.zone].n}　奖励：${rw}</small>
        <div class="prog"><div style="width:${(cur / q.n) * 100}%"></div></div><small>${cur}/${q.n}</small></div>
        <div class="acts">${done ? (canTurn ? `<button class="btn primary" data-act="quest:${i}">交付</button>` : '<button class="btn" disabled>回城交付</button>') : `<button class="btn" data-act="reroll:${i}">换(10💰)</button>`}</div></div>`;
    });
    return { title: '📜 任务', html: h };
  },
  quest() { return PANELS.quests(); },
  map() {
    let h = `<div class="desc">野外是大地图；洞穴分好几层，<b style="color:#ffd98a">只能从第一层进，走到最里面（地图最上方）的楼梯才能下到下一层</b>，BOSS 在最底层。越深的图掉的装备越好；Lv10 以上的图有<b style="color:#ff8f80">红名恶徒</b>出没。左上角小地图：白点是你，蓝点回城 / 上楼，黄点下楼，橙点 BOSS。</div>`;
    h += `<div class="row"><div class="ic">🏡</div><div class="info"><b>苍岚城</b><small>安全区 · 杂货铺、书架、铁匠、任务、家园</small></div><div class="acts">${G.zone === 'village' ? '<button class="btn" disabled>当前</button>' : '<button class="btn green" data-act="go:village">回城</button>'}</div></div>`;
    for (const zid of ZONE_ORDER) {
      const z = ZONES[zid];
      if (z.prev) continue; // 深层不能直接传送
      const floors = [zid];
      for (let n = z.next; n; n = ZONES[n].next) floors.push(n);
      const last = ZONES[floors[floors.length - 1]];
      const ok = S.lv >= z.lv, here = floors.includes(G.zone);
      const mons = z.mons.map((m) => MONS[m].n).join('、');
      const bosses = floors.filter((f) => ZONES[f].boss).map((f) => MONS[ZONES[f].boss].n);
      const deep = floors.length > 1 ? (z.g ? `共 ${floors.length} 层` : `深处通往「${last.n}」`) + ' · ' : '';
      h += `<div class="row"><div class="ic">${ok ? z.ic : '🔒'}</div><div class="info"><b>${z.g || z.n}</b><small>Lv.${z.lv}${last.lv > z.lv ? '~' + last.lv : ''} · ${deep}${mons}${bosses.length ? ' · BOSS ' + bosses.join('、') : ''}</small><small>掉落：${GEAR_TIERS[gearTierOf(zid)]}${last !== z && gearTierOf(floors[floors.length - 1]) > gearTierOf(zid) ? '~' + GEAR_TIERS[gearTierOf(floors[floors.length - 1])] : ''}档装备</small></div>
        <div class="acts">${here ? `<button class="btn" disabled>${G.zone === zid ? '当前' : '在深层'}</button>` : ok ? `<button class="btn primary" data-act="go:${zid}">前往</button>` : `<button class="btn" disabled>Lv.${z.lv}</button>`}</div></div>`;
    }
    return { title: '🗺️ 地图', html: h };
  },
  shop() {
    const sl = S.shopLv, SL = SHOP_LEVELS[sl];
    const tab = PTAB.shop;
    let h = tabBar('shop', [['up', '⬆️ 升级'], ['sell', '💰 卖货'], ['buy', '🛒 买货'], ['book', '📖 书架']]);
    if (tab === 'book') {
      h += `<div class="desc">💰 现有金币：<b>${fmt(S.gold)}</b>　等级够了买技能书就能学会。高级的书很贵，红名恶徒和 BOSS 也会掉。</div>`;
      for (const sk of mySkills()) {
        if (sk.t === 'basic') continue;
        const own = has('book_' + sk.id) > 0;
        const btn = hasSk(sk.id) ? '<button class="btn" disabled>已学会</button>' : S.lv < sk.lv ? `<button class="btn" disabled>Lv.${sk.lv}</button>`
          : `<button class="btn primary" data-act="buybook:${sk.id}" ${own || S.gold >= bookPrice(sk) ? '' : 'disabled'}>${own ? '学习' : '买来学'}</button>`;
        h += `<div class="row" style="${hasSk(sk.id) ? 'opacity:.55' : ''}"><div class="ic">${sk.ic}</div><div class="info"><b>《${sk.n}》</b> <small style="display:inline">（${sk.t === 'passive' ? '被动' : '主动'}）</small><small>${sk.desc(0)}</small><small>需要 Lv.${sk.lv} · ${own ? '背包里已有这本书' : fmt(bookPrice(sk)) + ' 金币'}</small></div><div class="acts">${btn}</div></div>`;
      }
      return { title: '🏪 ' + SL.n, html: h };
    }
    if (tab === 'up') {
      h += `<div class="row"><div class="ic">🏪</div><div class="info"><b>${SL.n}（Lv.${sl}）</b><small>出售价格 ×${SL.sell.toFixed(2)}</small></div></div>`;
      if (sl < SHOP_LEVELS.length - 1) {
        const N = SHOP_LEVELS[sl + 1];
        const newItems = SHOP_BUY.filter((it) => it.shop === sl + 1).map((it) => ITEMS[it.id].ic + ITEMS[it.id].n).join('、');
        h += `<div class="row"><div class="ic">🔨</div><div class="info"><b>扩建为「${N.n}」Lv.${sl + 1}</b><small>新商品：${newItems}；卖价 ×${N.sell.toFixed(2)}</small><div>${needHtml(N.cost)}</div></div>
          <div class="acts"><button class="btn primary" data-act="shopup" ${canAfford(N.cost) ? '' : 'disabled'}>扩建</button></div></div>`;
      } else h += '<div class="desc">✨ 已经是最高级的皇家商行了！</div>';
      h += '<div class="section-t">各等级解锁的商品</div>';
      for (let i = 1; i < SHOP_LEVELS.length; i++) {
        const items = SHOP_BUY.filter((it) => it.shop === i).map((it) => ITEMS[it.id].ic + ITEMS[it.id].n).join('、');
        h += `<div class="row" style="${sl >= i ? '' : 'opacity:.5'}"><div class="ic">${sl >= i ? '✅' : '🔒'}</div><div class="info"><b>Lv.${i} ${SHOP_LEVELS[i].n}</b><small>${items}</small></div></div>`;
      }
    } else if (tab === 'buy') {
      h += `<div class="desc">💰 现有金币：<b>${fmt(S.gold)}</b></div>`;
      for (const it of SHOP_BUY) {
        const I = ITEMS[it.id];
        if (sl < it.shop) {
          h += `<div class="row" style="opacity:.45"><div class="ic">🔒</div><div class="info"><b>${I.n}</b><small>杂货铺 Lv.${it.shop} 解锁</small></div></div>`;
          continue;
        }
        const eff = I.heal ? '回复 ' + I.heal + ' 生命 · ' : I.speed ? `移速 ×${I.speed} ${I.dur}秒 · ` : '';
        h += `<div class="row"><div class="ic">${I.ic}</div><div class="info"><b>${I.n}</b><small>${eff}${it.price} 金币 · 持有 ${has(it.id)}</small></div>
          <div class="acts"><button class="btn" data-act="buy:${it.id}|1" ${S.gold < it.price ? 'disabled' : ''}>×1</button><button class="btn" data-act="buy:${it.id}|10" ${S.gold < it.price * 10 ? 'disabled' : ''}>×10</button></div></div>`;
      }
    } else {
      const sell = Object.keys(S.inv).filter(sellable);
      if (!sell.length) h += '<div class="empty">没有可以卖的东西</div>';
      else {
        const total = sell.reduce((s, k) => s + S.inv[k] * sellPrice(k), 0);
        h += `<button class="btn red big" data-act="sellall">全部卖出（${fmt(total)} 金币）</button>
          <div class="desc">⚠️ 强化装备和盖房也要用这些材料，别全卖光哦。</div>`;
        for (const k of sell)
          h += `<div class="row"><div class="ic">${itemIc(k)}</div><div class="info"><b>${itemName(k)} ×${S.inv[k]}</b><small>单价 ${sellPrice(k)} 金币</small></div>
            <div class="acts"><button class="btn" data-act="sell:${k}|1">卖1</button><button class="btn primary" data-act="sell:${k}|all">全卖</button></div></div>`;
      }
    }
    return { title: '🏪 ' + SL.n, html: h };
  },
  smith() {
    let h = `<div class="desc">强化身上穿的装备，每级属性 +5%，最高 +${MAX_PLUS}。需要金币和 💎强化石（任务奖励，怪物也会掉）。<b>+3 以后可能失败</b>：失败只损失材料；+7 以上失败还会掉 1 级。</div>`;
    for (const s of SLOTS) {
      const g = S.equip[s];
      if (!g) { h += `<div class="row" style="opacity:.5"><div class="ic">${SLOT_IC[s]}</div><div class="info"><b>${SLOT_N[s]}：空</b><small>先穿上装备才能强化</small></div></div>`; continue; }
      const p = g.p || 0;
      if (p >= MAX_PLUS) { h += `<div class="row"><div class="ic">${SLOT_IC[s]}</div><div class="info">${gearHtml(g)}<small>已强化到顶 · ${gearText(g)}</small></div></div>`; continue; }
      const c = enhanceCost(g);
      h += `<div class="row"><div class="ic">${SLOT_IC[s]}</div><div class="info">${gearHtml(g)} → +${p + 1}<small>${gearText(g)} · 成功率 ${Math.round(ENH_RATE[p] * 100)}%</small><div>${needHtml(c)}</div></div>
        <div class="acts"><button class="btn primary" data-act="enh:${s}" ${canAfford(c) ? '' : 'disabled'}>强化</button></div></div>`;
    }
    return { title: '⚒️ 铁匠铺', html: h };
  },
  cls() {
    let h = '<div class="desc">选一个职业开始冒险。<b style="color:#ffd98a">选定后不能更改</b>，三个职业的打法、技能和武器都不一样。</div>';
    for (const id of CLASS_IDS) {
      const C = CLASSES[id];
      h += `<div class="row"><div class="ic">${C.ic}</div><div class="info"><b>${C.n}</b><small>${C.desc}</small><small>技能：${SKILLS[id].map((k) => k.ic + k.n).join('　')}</small></div>
        <div class="acts"><button class="btn primary" data-act="pickcls:${id}">选择</button></div></div>`;
    }
    return { title: '⚔️ 选择职业', html: h };
  },
  house() {
    const t = S.house.tier;
    const H = HOUSE[t];
    const ready = FACILITIES.some((f) => { const st = facilityState(f); return st && st.units > 0; });
    let h = tabBar('house', [['home', '🏠 我的屋子'], ['fac', '🏭 生产设施' + (ready ? ' 🔴' : '')]]);
    if (PTAB.house === 'home') {
      h += `<div class="row"><div class="ic">🏠</div><div class="info"><b>当前：${H.n}</b><small>${H.desc}</small></div>
        ${t >= 1 ? '<div class="acts"><button class="btn green" data-act="rest">休息回血</button></div>' : ''}</div>`;
      if (t < HOUSE.length - 1) {
        const N = HOUSE[t + 1];
        h += `<div class="section-t">升级为「${N.n}」</div><div class="row"><div class="ic">🔨</div><div class="info"><b>${N.n}</b><small>${N.desc}</small><div>${needHtml(N.cost)}</div></div>
          <div class="acts"><button class="btn primary" data-act="build" ${canAfford(N.cost) ? '' : 'disabled'}>建造</button></div></div>`;
        h += '<div class="desc">🌲木材在森林砍树，🧱石料在洞穴采石，也可以在杂货铺买。</div>';
      } else h += '<div class="desc">👑 王宫已经建成，你是苍岚城最有名的冒险者！</div>';
      return { title: '🏡 我的家园', html: h };
    }
    h += `<button class="btn green big" data-act="collectall" ${ready ? '' : 'disabled'}>一键收获全部</button><div class="desc">离线也会生产，仓库满了就停。每升 3 级需要家园再升一级。</div>`;
    for (const f of FACILITIES) {
      if (t < f.tier) {
        h += `<div class="row" style="opacity:.45"><div class="ic">🔒</div><div class="info"><b>${f.n}</b><small>家园升到「${HOUSE[f.tier].n}」解锁</small></div></div>`;
        continue;
      }
      const st = facilityState(f);
      const g = Object.entries(facGive(f, st.lv)).map(([k, v]) => itemIc(k) + v).join(' ');
      let up = '<small>✨ 已满级</small>', upBtn = '';
      if (st.lv < FAC_MAX) {
        const need = facNeedTier(f, st.lv + 1);
        const c = facUpCost(f, st.lv);
        const g2 = Object.entries(facGive(f, st.lv + 1)).map(([k, v]) => itemIc(k) + v).join(' ');
        const tierOk = t >= need;
        up = `<small>⬆️ 升 Lv.${st.lv + 1}：产出 ${g2} · 仓库 ${facCap(st.lv + 1)} 次${tierOk ? '' : ` · <span style="color:#ff8f80">需家园「${HOUSE[need].n}」</span>`}</small><div>${needHtml(c)}</div>`;
        upBtn = `<button class="btn primary" data-act="facup:${f.id}" ${tierOk && canAfford(c) ? '' : 'disabled'}>升级</button>`;
      }
      h += `<div class="row fac"><div class="ic">${f.ic}</div><div class="info"><b>${f.n} Lv.${st.lv}</b>
          <small>每5分钟 ${g} · 仓库 <b style="color:${st.units >= st.cap ? '#ff8f80' : '#9be38a'}">${st.units}/${st.cap}</b> · ${st.units >= st.cap ? '已满' : '下次 ' + Math.ceil(st.next / 60) + ' 分钟'}</small>${up}</div>
        <div class="acts col"><button class="btn green" data-act="collect:${f.id}" ${st.units > 0 ? '' : 'disabled'}>收获</button>${upBtn}</div></div>`;
    }
    return { title: '🏡 我的家园', html: h };
  },
  settings() {
    const h = `<div class="row"><div class="ic">📧</div><div class="info"><b>${Auth.email}</b><small>角色：${S.name} · 存档每次变化都会自动上传云端 · 游戏版本 ${VERSION}</small></div></div>
      <button class="btn green big" data-act="savenow">立即保存到云端</button><div style="height:8px"></div>
      <button class="btn big" data-act="fullscreen">全屏模式</button><div style="height:8px"></div>
      <button class="btn red big" data-act="logout">退出登录</button>
      <div class="desc" style="margin-top:12px">📱 手机：左半屏拖动摇杆移动，⚔️ 按住连续攻击，旁边三个是职业技能（耗灵力），🧪 喝药水，🔹 喝灵泉回灵力，🥤 加速饮料，🤖 挂机（自动找怪、放技能、喝药、捡装备；推摇杆随时接管）。装备掉在地上，走过去就捡。<br>💻 电脑：WASD/方向键 移动，空格 或 C 攻击，F / G / H 技能，Q 或 1 喝药，X 或 3 喝灵泉，R 或 2 加速饮料，Z 挂机，E 交互，B 背包，J 角色，Y 任务，M 地图，O 设置，Esc 关闭窗口。</div>`;
    return { title: '⚙️ 设置', html: h };
  },
};

const ACTIONS = {
  brew() { if (has('herb') >= 3) { take('herb', 3); give('potion_s', 1); toast('🧪 炼成小药水'); markDirty(); } },
  quest(i) { completeQuest(+i); },
  reroll(i) {
    if (S.gold < 10) return toast('金币不足');
    S.gold -= 10;
    S.quests[+i] = genQuest();
    markDirty();
  },
  go(z) { if (!ZONES[z].prev) travel(z); },
  tab(arg) {
    const [panel, id] = arg.split('|');
    PTAB[panel] = id;
    $('#pBody').scrollTop = 0;
  },
  collectall() { FACILITIES.forEach((f) => collectFacility(f)); },
  drinkhp() { usePotion(); },
  drinkspd(k) { useDrink(k); },
  facup(id) { upgradeFacility(FACILITIES.find((f) => f.id === id)); },
  shopup() {
    const N = SHOP_LEVELS[S.shopLv + 1];
    if (!N || !canAfford(N.cost)) return toast('材料不足');
    payCost(N.cost);
    S.shopLv++;
    toast(`🏪 扩建为「${N.n}」，解锁新商品！`);
    markDirty();
  },
  buy(arg) {
    const [id, n] = arg.split('|');
    const it = SHOP_BUY.find((x) => x.id === id);
    if (!it || S.shopLv < it.shop) return;
    const cost = it.price * +n;
    if (S.gold < cost) return toast('金币不足');
    S.gold -= cost;
    give(id, +n);
    toast(`购买 ${ITEMS[id].n} ×${n}`);
    markDirty();
  },
  sell(arg) {
    const [k, n] = arg.split('|');
    const c = n === 'all' ? has(k) : Math.min(+n, has(k));
    if (c <= 0) return;
    if (!sellable(k)) return;
    take(k, c);
    S.gold += c * sellPrice(k);
    toast(`卖出 ${itemName(k)} ×${c}，获得 ${c * sellPrice(k)} 金币`);
    markDirty();
  },
  sellall() {
    let total = 0;
    for (const k of Object.keys(S.inv)) {
      if (!sellable(k)) continue;
      total += S.inv[k] * sellPrice(k);
      delete S.inv[k];
    }
    S.gold += total;
    toast(`全部卖出，获得 ${total} 金币`);
    markDirty();
  },
  pickcls(id) {
    if (S.cls || !CLASSES[id]) return;
    S.cls = id;
    S.equip.weapon = makeGear(0, 'start', 'weapon', id);
    S.equip.armor = makeGear(0, 'start', 'armor', id);
    const st = stats();
    if (id === 'mage') learnSkill('fire', true);
    if (id === 'spirit') learnSkill('charm', true);
    G.player.hp = st.maxHp; G.player.mp = st.maxMp;
    renderSkillBar();
    closePanel();
    toast(`${CLASSES[id].ic} 你成为了${CLASSES[id].n}！`);
    setTimeout(() => toast('👉 走到城门「出城」去城郊草原打怪'), 1600);
    setTimeout(() => toast('🗡️ 怪会掉装备，走过去捡，在背包里穿戴'), 4400);
    markDirty();
  },
  equip(id) {
    const i = S.gear.findIndex((g) => g.id === id);
    if (i < 0) return;
    const g = S.gear[i];
    if (!canEquip(g)) return toast('现在还穿不了这件');
    const old = S.equip[g.s];
    S.gear.splice(i, 1);
    if (old) S.gear.push(old);
    S.equip[g.s] = g;
    toast(`穿上了「${gearName(g)}」`);
    markDirty();
  },
  unequip(s) {
    const g = S.equip[s];
    if (!g) return;
    if (S.gear.length >= BAG_MAX) return toast('装备背包满了');
    delete S.equip[s];
    S.gear.push(g);
    markDirty();
  },
  sellgear(id) {
    const i = S.gear.findIndex((g) => g.id === id);
    if (i < 0) return;
    const v = gearPrice(S.gear[i]);
    toast(`卖出「${gearName(S.gear[i])}」，获得 ${fmt(v)} 金币`);
    S.gear.splice(i, 1);
    S.gold += v;
    markDirty();
  },
  sellq(q) {
    const out = S.gear.filter((g) => g.q <= +q);
    if (!out.length) return toast('没有符合条件的装备');
    const v = out.reduce((a, g) => a + gearPrice(g), 0);
    S.gear = S.gear.filter((g) => g.q > +q);
    S.gold += v;
    toast(`卖出 ${out.length} 件装备，获得 ${fmt(v)} 金币`);
    markDirty();
  },
  learn(k) {
    const sk = ITEMS[k] && SKILL_BY_ID[ITEMS[k].book];
    if (!sk || has(k) <= 0 || sk.cls !== S.cls || hasSk(sk.id)) return;
    if (S.lv < sk.lv) return toast(`需要 Lv.${sk.lv}`);
    take(k, 1);
    learnSkill(sk.id);
  },
  buybook(id) {
    const sk = SKILL_BY_ID[id];
    if (!sk || sk.cls !== S.cls || hasSk(id)) return;
    if (S.lv < sk.lv) return toast(`需要 Lv.${sk.lv}`);
    if (has('book_' + id) > 0) { take('book_' + id, 1); return learnSkill(id); }
    if (S.gold < bookPrice(sk)) return toast('金币不足');
    S.gold -= bookPrice(sk);
    learnSkill(id);
  },
  feed(k) {
    const n = S.petGrow[k];
    if (!FEED[k] || n >= GROW_MAX) return;
    const c = feedCost(k, n);
    if (!canAfford(c)) return toast('材料不足');
    payCost(c);
    S.petGrow[k] = n + 1;
    petCalc(stats());
    toast(`${FEED[k].ic} ${FEED[k].n}培养到 ${n + 1} 级`);
    markDirty();
  },
  autosell() { S.opt.autoSell = !S.opt.autoSell; markDirty(); },
  drinkmp() { useMana(); },
  enh(s) {
    const g = S.equip[s];
    if (!g || (g.p || 0) >= MAX_PLUS) return;
    const p = g.p || 0, c = enhanceCost(g);
    if (!canAfford(c)) return toast('材料不足');
    payCost(c);
    if (Math.random() < ENH_RATE[p]) { g.p = p + 1; toast(`⚒️ 强化成功！「${gearName(g)}」`); }
    else if (p >= 7) { g.p = p - 1; toast(`💥 强化失败，掉到 +${g.p}`); }
    else toast('💨 强化失败，材料没了');
    markDirty();
  },
  build() {
    const t = S.house.tier;
    const N = HOUSE[t + 1];
    if (!N || !canAfford(N.cost)) return toast('材料不足');
    payCost(N.cost);
    S.house.tier++;
    for (const f of FACILITIES) if (f.tier === S.house.tier) S.house.prod[f.id] = Date.now();
    G.player.hp = stats().maxHp;
    toast(`🏗️ 家园升级为「${N.n}」！`);
    markDirty();
  },
  rest() { G.player.hp = stats().maxHp; toast('😴 休息好了，生命全满'); },
  collect(id) { collectFacility(FACILITIES.find((f) => f.id === id)); },
  savenow() { Sync.dirty = true; cloudSave(true); toast('正在保存…'); },
  fullscreen() {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  },
  logout() { if (confirm('确定退出登录吗？进度已保存在云端。')) logout(); },
};

/* ===================== HUD / 提示 ===================== */
function updateHud() {
  if (!S || !G.player) return;
  const st = stats();
  const p = G.player;
  p.hp = Math.min(p.hp, st.maxHp);
  $('#hLv').textContent = S.lv;
  $('#hName').textContent = S.name;
  $('#hZone').textContent = ZONES[G.zone].n;
  $('#hHp').style.width = (p.hp / st.maxHp) * 100 + '%';
  $('#hHpT').textContent = Math.ceil(p.hp) + ' / ' + st.maxHp;
  p.mp = Math.min(p.mp, st.maxMp);
  $('#hMp').style.width = (p.mp / st.maxMp) * 100 + '%';
  $('#hMpT').textContent = Math.floor(p.mp) + ' / ' + st.maxMp;
  $('#manaCnt').textContent = MANA_ORDER.reduce((a, k) => a + has(k), 0);
  const need = expNeed(S.lv);
  $('#hXp').style.width = (S.exp / need) * 100 + '%';
  $('#hXpT').textContent = 'EXP ' + S.exp + ' / ' + need;
  $('#hGold').textContent = fmt(S.gold);
  $('#potCnt').textContent = POTION_ORDER.reduce((a, k) => a + has(k), 0);
  $('#spdCnt').textContent = DRINK_ORDER.reduce((a, k) => a + has(k), 0);
  const left = Math.ceil((S.spd.until - Date.now()) / 1000);
  const bf = $('#hBuff');
  if (left > 0) { bf.classList.remove('hidden'); bf.textContent = `⚡×${S.spd.m} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
  else bf.classList.add('hidden');
  $('#btnSpeed').classList.toggle('active', left > 0);
}
function toast(t) {
  const box = $('#toasts');
  const w = document.createElement('div');
  w.className = 'toast-wrap';
  w.innerHTML = `<span class="toast"></span>`;
  w.firstChild.textContent = t;
  box.appendChild(w);
  while (box.children.length > 4) box.removeChild(box.firstChild);
  setTimeout(() => w.remove(), 2700);
}
function floatText(x, y, text, color, size, delay) {
  G.texts.push({ x, y, text, color, size: size || 14, t: -(delay || 0), life: 1.1 });
}

/* ===================== 输入 ===================== */
const joyBase = $('#joyBase'), joyKnob = $('#joyKnob');
cv.addEventListener('pointerdown', (e) => {
  if (G.joy.id !== null) return;
  if (e.clientX > innerWidth * 0.6) return;
  G.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
  joyBase.style.left = e.clientX + 'px';
  joyBase.style.top = e.clientY + 'px';
  joyKnob.style.transform = 'translate(0,0)';
  joyBase.classList.remove('hidden');
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== G.joy.id) return;
  let dx = e.clientX - G.joy.ox, dy = e.clientY - G.joy.oy;
  const d = Math.hypot(dx, dy), max = 50;
  if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
  G.joy.x = dx / max;
  G.joy.y = dy / max;
  joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = (e) => {
  if (e.pointerId !== G.joy.id) return;
  G.joy = { id: null, x: 0, y: 0 };
  joyBase.classList.add('hidden');
};
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);

function holdBtn(el, down, up) {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
  if (up) ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, up));
}
holdBtn($('#btnAttack'), () => (G.atkHeld = true), () => (G.atkHeld = false));
// 技能栏：学会的主动技能排成一排（最多 5 个），电脑按 F G H T V
const SK_KEYS = ['F', 'G', 'H', 'T', 'V'];
function renderSkillBar() {
  const bar = $('#skillBar');
  bar.innerHTML = '';
  if (!S) return;
  activeSkills().slice(0, 5).forEach((sk, i) => {
    const b = document.createElement('button');
    b.className = 'sbtn';
    b.dataset.id = sk.id;
    b.innerHTML = `<b>${sk.ic}</b><span></span><i class="key">${SK_KEYS[i]}</i><em>${sk.n}</em>`;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!G.paused) castSkill(sk.id); });
    bar.appendChild(b);
  });
}
holdBtn($('#btnPotion'), () => !G.paused && usePotion());
holdBtn($('#btnSpeed'), () => !G.paused && useDrink());
holdBtn($('#btnMana'), () => !G.paused && useMana());
holdBtn($('#btnAuto'), () => !G.paused && toggleAuto());
holdBtn($('#btnInteract'), () => !G.paused && interact());
document.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (!G.running || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === ' ') e.preventDefault(); // 空格只用来攻击，不要去点到页面上刚点过的按钮
  G.keys[k] = true;
  if (k === 'escape') closePanel();
  // 电脑快捷键打开面板：再按一次同一个键就关掉
  const pk = { b: 'bag', j: 'hero', y: 'quests', m: 'map', o: 'settings' }[k];
  if (pk && !e.repeat && S.cls) {
    if (panelId === pk) closePanel();
    else openPanel(pk);
    return;
  }
  if (G.paused) return;
  if (k === ' ' || k === 'c') G.atkHeld = true;
  const si = ['f', 'g', 'h', 't', 'v'].indexOf(k);
  if (si >= 0 && activeSkills()[si]) castSkill(activeSkills()[si].id);
  if (k === 'q' || k === '1') usePotion();
  if (k === 'x' || k === '3') useMana();
  if (k === 'z' && !e.repeat) toggleAuto();
  if (k === 'r' || k === '2') useDrink();
  if (k === 'e') interact();
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' && e.target.tagName !== 'INPUT') e.preventDefault();
  G.keys[k] = false;
  if (k === ' ' || k === 'c') G.atkHeld = false;
});

function resize() {
  G.dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * G.dpr;
  cv.height = innerHeight * G.dpr;
  G.scale = clamp(Math.min(innerWidth, innerHeight) / 540, 0.62, 1.15); // 镜头拉远：人物小、视野大
  G.vw = innerWidth / G.scale;
  G.vh = innerHeight / G.scale;
}
addEventListener('resize', resize);

/* ===================== 更新 ===================== */
function update(dt) {
  G.t += dt;
  const p = G.player, st = stats(), z = ZONES[G.zone];

  if (G.deadT > 0) {
    G.deadT -= dt;
    if (G.deadT <= 0) { p.hp = st.maxHp; p.mp = st.maxMp; enterZone('village'); }
    return;
  }

  // 移动
  let mx = G.joy.x, my = G.joy.y;
  if (G.keys['a'] || G.keys['arrowleft']) mx -= 1;
  if (G.keys['d'] || G.keys['arrowright']) mx += 1;
  if (G.keys['w'] || G.keys['arrowup']) my -= 1;
  if (G.keys['s'] || G.keys['arrowdown']) my += 1;
  let ml = Math.hypot(mx, my), autoAtk = false;
  if (G.auto && !z.safe && ml <= 0.15) { // 挂机：没推摇杆时自动走位、攻击、喝药、放技能
    const v = autoMove();
    if (v) { mx = v.x; my = v.y; ml = 1; }
    autoAtk = !!G.autoTgt;
    if (Math.floor(G.t * 3) !== Math.floor((G.t - dt) * 3)) autoUse(st);
  }
  p.moving = ml > 0.15;
  if (p.moving) {
    if (ml > 1) { mx /= ml; my /= ml; }
    p.x = clamp(p.x + mx * st.speed * dt, 20, z.w - 20);
    p.y = clamp(p.y + my * st.speed * dt, 30, z.h - 20);
    if (Math.abs(mx) > 0.1) p.face = mx > 0 ? 1 : -1;
    p.dir = Math.atan2(my, mx);
    p.step += dt * 10;
  }

  p.atkCd -= dt; p.swing -= dt; p.hurt -= dt;
  for (const k in p.cds) p.cds[k] = Math.max(0, p.cds[k] - dt);
  const wantAtk = G.atkHeld || autoAtk;
  if (wantAtk && p.atkCd <= 0 && !z.safe) playerAttack();
  else if (wantAtk && p.atkCd <= 0 && z.safe) { p.atkCd = 0.4; p.swing = 0.22; }
  // 技能状态：灵甲 / 灵盾 / 治愈
  if (p.armorT > 0) p.armorT -= dt;
  if (p.wardT > 0 && (p.wardT -= dt) <= 0) p.ward = 0;
  if (p.mend > 0) {
    p.mend -= dt;
    p.hp = Math.min(st.maxHp, p.hp + (st.maxHp * (p.mendK || 0.3) / 5) * dt);
    if (G.pet) G.pet.hp = Math.min(G.pet.maxHp, G.pet.hp + (G.pet.maxHp * (p.mendK || 0.3) / 5) * dt);
  }

  // 回血：城里快，野外慢
  const regen = z.safe ? st.maxHp * 0.08 : st.maxHp * 0.006;
  p.hp = Math.min(st.maxHp, p.hp + regen * dt);
  p.mp = Math.min(st.maxMp, p.mp + st.maxMp * (z.safe ? 0.1 : 0.012) * dt);

  // 敌人
  for (const e of G.enemies) {
    const m = e.m;
    e.flash -= dt; e.cd -= dt;
    // tg：这只怪现在追的目标——被灵兽打过就去咬灵兽，否则追玩家
    const tg = e.tgt && e.tgt === G.pet && G.pet.hp > 0 ? G.pet : p;
    if (tg === p) e.tgt = null;
    const d = dist(tg, e);
    if (!e.aggro && !m.passive && dist(p, e) < (m.boss ? 320 : m.rogue ? 260 : 190)) e.aggro = true;
    if (e.aggro && Math.hypot(e.x - e.sx, e.y - e.sy) > 650) { e.aggro = false; e.tgt = null; e.tx = e.sx; e.ty = e.sy; e.hp = Math.min(m.hp, e.hp + m.hp * 0.3); }
    let tx, ty, spd = m.spd * (e.slow > 0 ? 0.5 : 1);
    if (e.slow > 0) e.slow -= dt;
    const dmgTo = (mult) => Math.max(1, Math.round(m.atk * (mult || 1) * rand(0.9, 1.1) - (tg === p ? st.def : tg.def) * 0.6));
    if (e.aggro && m.slam) {
      // BOSS 范围重击：先在玩家脚下出现红圈，1.1 秒后爆炸，走出圈外就能躲开
      e.slamCd = (e.slamCd === undefined ? m.slam.cd : e.slamCd) - dt;
      if (e.slamCd <= 0 && d < 500) {
        e.slamCd = m.slam.cd;
        G.warns.push({ x: tg.x, y: tg.y, r: m.slam.r, t: 1.1, life: 1.1, dmg: dmgTo(m.slam.mult) });
      }
    }
    if (e.aggro && m.ranged && (m.ranged.keep > 0 || d > m.size + 60)) {
      // 远程怪：保持距离，定时发射弹幕
      const R = m.ranged;
      if (d < R.keep) { tx = e.x - (tg.x - e.x); ty = e.y - (tg.y - e.y); spd *= 0.9; }
      else if (d > R.range * 0.85) { tx = tg.x; ty = tg.y; spd *= 1.1; }
      else { tx = e.x; ty = e.y; }
      if (d < R.range && e.cd <= 0) {
        e.cd = R.cd * (m.elite ? 0.8 : 1);
        const a = Math.atan2(tg.y - e.y, tg.x - e.x);
        const shots = m.boss ? [-0.25, 0, 0.25] : m.elite ? [-0.12, 0.12] : [0];
        for (const off of shots)
          G.proj.push({ x: e.x, y: e.y - m.size * 0.6, vx: Math.cos(a + off) * R.spd, vy: Math.sin(a + off) * R.spd, life: (R.range * 1.3) / R.spd, dmg: dmgTo(), c: R.c });
      }
    } else if (e.aggro) {
      tx = tg.x; ty = tg.y; spd *= 1.25;
      if (d < m.size + 22) {
        tx = e.x; ty = e.y;
        if (e.cd <= 0) {
          e.cd = m.boss ? 1.6 : 1.25;
          if (tg === p) hurtPlayer(dmgTo()); else hurtPet(dmgTo());
          if (m.boss) G.fx.push({ k: 'ring', x: e.x, y: e.y, t: 0, life: 0.4, r: 90, c: '#ff6a2a' });
        }
      }
    } else {
      e.wait -= dt;
      if (e.wait <= 0) { e.wait = rand(1.5, 4); e.tx = e.sx + rand(-120, 120); e.ty = e.sy + rand(-120, 120); }
      tx = e.tx; ty = e.ty; spd *= 0.5;
    }
    const dx = tx - e.x, dy = ty - e.y, dl = Math.hypot(dx, dy);
    if (dl > 3) {
      e.x += (dx / dl) * spd * dt; e.y += (dy / dl) * spd * dt;
      if (Math.abs(dx) > 2) e.face = dx > 0 ? 1 : -1;
    }
    e.x = clamp(e.x, 20, z.w - 20); e.y = clamp(e.y, 20, z.h - 20);
  }
  // 简单分离，避免怪物叠在一起
  for (let i = 0; i < G.enemies.length; i++)
    for (let j = i + 1; j < G.enemies.length; j++) {
      const a = G.enemies[i], b = G.enemies[j];
      const dd = dist(a, b), min = a.m.size + b.m.size;
      if (dd > 0 && dd < min) {
        const push = (min - dd) / 2, ux = (a.x - b.x) / dd, uy = (a.y - b.y) / dd;
        if (!a.m.boss) { a.x += ux * push; a.y += uy * push; }
        if (!b.m.boss) { b.x -= ux * push; b.y -= uy * push; }
      }
    }

  // 重生
  for (const r of G.respawns) r.t -= dt;
  const ready = G.respawns.filter((r) => r.t <= 0);
  G.respawns = G.respawns.filter((r) => r.t > 0);
  for (const r of ready) r.boss ? spawnEnemy(r.type, r.x, r.y) : r.rogue ? spawnRogue() : spawnEnemy(pick(z.mons), undefined, undefined, r.nest);
  for (const nd of G.nodes) if (!nd.ready && (nd.t -= dt) <= 0) nd.ready = true;

  // 村庄小动物
  for (const c of G.critters) {
    c.t -= dt;
    if (c.t <= 0) { c.t = rand(2, 5); c.tx = clamp(c.x + rand(-120, 120), 360, 760); c.ty = clamp(c.y + rand(-100, 100), 380, 700); }
    const dx = c.tx - c.x, dy = c.ty - c.y, dl = Math.hypot(dx, dy);
    if (dl > 2) { c.x += (dx / dl) * 30 * dt; c.y += (dy / dl) * 30 * dt; c.f = dx > 0 ? -1 : 1; }
  }

  // 中毒掉血（每秒一跳）
  for (const e of G.enemies.slice()) if (e.poison > 0) {
    e.poison -= dt; e.ptk = (e.ptk || 0) + dt;
    if (e.ptk >= 1) { e.ptk = 0; hitEnemy(e, e.pdmg, st, 'dot'); }
  }
  // 火墙：每 0.8 秒烧一次站在里面的怪
  for (const w of G.walls) {
    w.t -= dt; w.tk -= dt;
    if (w.tk <= 0) { w.tk = 0.8; for (const e of G.enemies.slice()) if (Math.hypot(e.x - w.x, e.y - w.y) < w.r + e.m.size) hitEnemy(e, st.atk * w.k, st, 'wall'); }
  }
  G.walls = G.walls.filter((w) => w.t > 0);
  updatePet(dt, st);
  // 玩家的弹丸：追着目标飞
  for (const b of G.pproj) {
    b.life -= dt;
    const e = b.e;
    if (e.hp <= 0 || !G.enemies.includes(e)) { b.life = 0; continue; }
    const dx = e.x - b.x, dy = e.y - e.m.size * 0.5 - b.y, dl = Math.hypot(dx, dy), step = 560 * dt;
    if (dl <= step + e.m.size * 0.6) { b.life = 0; hitEnemy(e, b.atk, st); }
    else { b.x += (dx / dl) * step; b.y += (dy / dl) * step; }
  }
  G.pproj = G.pproj.filter((b) => b.life > 0);
  pickLoot(dt);

  // 弹幕
  for (const b of G.proj) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life > 0 && Math.hypot(b.x - p.x, b.y - (p.y - 18)) < 20) { b.life = 0; hurtPlayer(b.dmg); }
    else if (b.life > 0 && G.pet && Math.hypot(b.x - G.pet.x, b.y - (G.pet.y - 10)) < 20) { b.life = 0; hurtPet(b.dmg); }
  }
  G.proj = G.proj.filter((b) => b.life > 0);
  // 红圈预警
  for (const w of G.warns) {
    w.t -= dt;
    if (w.t <= 0) {
      if (Math.hypot(p.x - w.x, p.y - w.y) < w.r) hurtPlayer(w.dmg);
      if (G.pet && Math.hypot(G.pet.x - w.x, G.pet.y - w.y) < w.r) hurtPet(w.dmg);
      G.fx.push({ k: 'ring', x: w.x, y: w.y + 10, t: 0, life: 0.45, r: w.r * 1.1, c: '#ff4a2a' });
    }
  }
  G.warns = G.warns.filter((w) => w.t > 0);
  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter((t) => t.t < t.life);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < f.life);

  // 交互按钮
  const near = findNear();
  G.near = near;
  const ib = $('#btnInteract');
  if (near) { ib.classList.remove('hidden'); if (ib.textContent !== near.label) ib.textContent = near.label; }
  else ib.classList.add('hidden');

  // 技能冷却显示
  for (const b of $('#skillBar').children) {
    const id = b.dataset.id, cd = p.cds[id] || 0;
    b.classList.toggle('cd', cd > 0 || p.mp < skillCost(SKILL_BY_ID[id]));
    b.children[1].textContent = cd > 0 ? Math.ceil(cd) : '';
  }

  if (Math.floor(G.t * 4) !== Math.floor((G.t - dt) * 4)) updateHud();
}

/* ===================== 绘制 ===================== */
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function emoji(ic, x, y, size, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.fillStyle = '#000'; // 必须用不透明颜色，否则彩色表情会跟着上一个半透明颜色变透明
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ic, 0, 0);
  ctx.restore();
}
function shadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}
function label(text, x, y, color, size) {
  ctx.font = `bold ${Math.round((size || 13) * 1.25)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color || '#fff';
  ctx.fillText(text, x, y);
}

function drawTree(x, y, s, theme, v) {
  shadow(x, y + 4, 22 * s);
  if (theme === 'desert') { // 仙人掌
    ctx.fillStyle = '#4d9a4a';
    ctx.fillRect(x - 7 * s, y - 46 * s, 14 * s, 48 * s);
    ctx.fillRect(x - 20 * s, y - 32 * s, 8 * s, 18 * s);
    ctx.fillRect(x - 20 * s, y - 18 * s, 14 * s, 6 * s);
    ctx.fillRect(x + 12 * s, y - 38 * s, 8 * s, 18 * s);
    ctx.fillRect(x + 6 * s, y - 24 * s, 14 * s, 6 * s);
    return;
  }
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 5 * s, y - 16 * s, 10 * s, 18 * s);
  if (theme === 'snow') {
    ctx.fillStyle = '#2f6b4f';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - (70 - i * 14) * s);
      ctx.lineTo(x - (26 - i * 2) * s, y - (26 - i * 12) * s * 0.6 - 14 * s);
      ctx.lineTo(x + (26 - i * 2) * s, y - (26 - i * 12) * s * 0.6 - 14 * s);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(x, y - 70 * s); ctx.lineTo(x - 9 * s, y - 56 * s); ctx.lineTo(x + 9 * s, y - 56 * s); ctx.fill();
    return;
  }
  if (theme === 'swamp') { // 枯树
    ctx.strokeStyle = '#3a2e22'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(x, y - 14 * s); ctx.lineTo(x, y - 48 * s); ctx.moveTo(x, y - 34 * s); ctx.lineTo(x - 16 * s, y - 50 * s); ctx.moveTo(x, y - 40 * s); ctx.lineTo(x + 14 * s, y - 58 * s); ctx.stroke();
    ctx.fillStyle = 'rgba(90,130,90,.7)'; ctx.beginPath(); ctx.arc(x - 16 * s, y - 52 * s, 8 * s, 0, Math.PI * 2); ctx.arc(x + 14 * s, y - 60 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
    return;
  }
  ctx.fillStyle = v > 0.5 ? '#2f7a34' : '#3b8a3a';
  ctx.beginPath(); ctx.arc(x, y - 34 * s, 24 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.arc(x - 8 * s, y - 42 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
}
function drawRock(x, y, s, theme, ore) {
  shadow(x, y + 4, 20 * s);
  ctx.fillStyle = theme === 'sky' ? '#8d9db5' : theme === 'chaos' ? '#4a2a2e' : theme === 'abyss' ? '#2e2240' : theme === 'swamp' ? '#56645a' : theme === 'volcano' ? '#3a2a28' : theme === 'desert' ? '#b0905a' : theme === 'snow' ? '#a9b6c4' : '#7d7a85';
  ctx.beginPath();
  ctx.moveTo(x - 20 * s, y + 2);
  ctx.lineTo(x - 14 * s, y - 18 * s);
  ctx.lineTo(x + 2 * s, y - 24 * s);
  ctx.lineTo(x + 18 * s, y - 12 * s);
  ctx.lineTo(x + 20 * s, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 16 * s); ctx.lineTo(x + 2 * s, y - 22 * s); ctx.lineTo(x - 2 * s, y - 10 * s); ctx.fill();
  if (ore) {
    ctx.fillStyle = theme === 'volcano' ? '#ff7a2a' : theme === 'abyss' ? '#c77aff' : theme === 'chaos' ? '#ff3a5a' : theme === 'sky' ? '#7ad8ff' : '#e0b25a';
    [[-8, -8], [6, -14], [10, -4]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, 3.2 * s, 0, Math.PI * 2); ctx.fill(); });
  }
}
function drawBush(x, y, s, theme) {
  shadow(x, y + 3, 16 * s);
  ctx.fillStyle = theme === 'snow' ? '#5f8f7a' : '#3f9a44';
  [[-9, -8], [9, -8], [0, -16]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, 11 * s, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#d8f06a';
  [[-6, -12], [7, -14], [1, -20]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, 2.4 * s, 0, Math.PI * 2); ctx.fill(); });
}
function drawDeco(d, theme) {
  if (theme === 'sky') { // 云朵
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(d.x, d.y, 20 * d.s, 0, Math.PI * 2); ctx.arc(d.x + 22 * d.s, d.y + 4, 16 * d.s, 0, Math.PI * 2); ctx.arc(d.x - 22 * d.s, d.y + 5, 15 * d.s, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (theme === 'chaos') { // 断裂石柱 / 血晶
    if (d.v < 0.5) {
      ctx.fillStyle = '#5a4a4e'; ctx.fillRect(d.x - 10 * d.s, d.y - 50 * d.s, 20 * d.s, 50 * d.s);
      ctx.fillStyle = '#6e5c60'; ctx.fillRect(d.x - 14 * d.s, d.y - 54 * d.s, 28 * d.s, 8 * d.s);
    } else {
      ctx.fillStyle = 'rgba(255,40,70,.8)';
      ctx.beginPath(); ctx.moveTo(d.x - 8, d.y); ctx.lineTo(d.x, d.y - 38 * d.s); ctx.lineTo(d.x + 8, d.y); ctx.fill();
    }
    return;
  }
  if (theme === 'cave' || theme === 'volcano' || theme === 'abyss') {
    if (d.v < 0.5) drawRock(d.x, d.y, d.s * 0.8, theme, false);
    else if (theme === 'volcano') { ctx.fillStyle = 'rgba(255,90,30,.75)'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 34 * d.s, 14 * d.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,200,80,.6)'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 18 * d.s, 6 * d.s, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (theme === 'abyss') { // 紫色魔晶
      ctx.fillStyle = 'rgba(170,80,255,.85)';
      ctx.beginPath(); ctx.moveTo(d.x - 9, d.y); ctx.lineTo(d.x - 3, d.y - 44 * d.s); ctx.lineTo(d.x + 4, d.y); ctx.fill();
      ctx.beginPath(); ctx.moveTo(d.x + 2, d.y); ctx.lineTo(d.x + 12, d.y - 28 * d.s); ctx.lineTo(d.x + 16, d.y); ctx.fill();
      ctx.fillStyle = 'rgba(220,170,255,.5)'; ctx.fillRect(d.x - 4, d.y - 36 * d.s, 2, 26 * d.s);
    }
    else { ctx.fillStyle = '#6a6875'; ctx.beginPath(); ctx.moveTo(d.x - 10, d.y); ctx.lineTo(d.x, d.y - 40 * d.s); ctx.lineTo(d.x + 10, d.y); ctx.fill(); }
  } else if (theme === 'swamp' && d.v > 0.55) { // 沼泽水潭
    ctx.fillStyle = 'rgba(40,70,55,.85)'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 44 * d.s, 18 * d.s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,220,120,.35)'; ctx.beginPath(); ctx.arc(d.x - 10, d.y - 3, 4, 0, Math.PI * 2); ctx.arc(d.x + 14, d.y + 4, 3, 0, Math.PI * 2); ctx.fill();
  } else if (theme === 'desert' && d.v > 0.6) drawRock(d.x, d.y, d.s * 0.7, theme, false);
  else drawTree(d.x, d.y, d.s, theme || 'forest', d.v);
}

// 装备档次对应的衣服 / 武器颜色
const TIER_COL = ['#7c6a52', '#8b5a2b', '#b8733a', '#bfe3ff', '#d24a2a', '#5a7a6a', '#6a3a9a', '#4aa8e8', '#8a1a2a', '#ffd84a'];
const WPN_COL = ['#a87a4a', '#c0c6cc', '#e0935a', '#9fe8ff', '#ff6a3a', '#8affc8', '#c07aff', '#7ad8ff', '#ff3a5a', '#fff27a'];
// 画一个小人（主角和红名恶徒共用）。o：face 朝向，bob 上下晃，body 衣服色，wpn 武器色，cls 职业，swing 挥动，hurt 受击，hair 发色
function drawHuman(x, y, o) {
  ctx.save();
  ctx.translate(x, y + (o.bob || 0));
  ctx.fillStyle = o.hurt ? '#ff6b6b' : o.body;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -26, 22, 26, 6) : ctx.rect(-11, -26, 22, 26); ctx.fill();
  if (o.cls !== 'blade') { ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(-15, 0); ctx.lineTo(15, 0); ctx.lineTo(11, -10); ctx.fill(); } // 袍子下摆
  ctx.fillStyle = '#ffd9b0';
  ctx.beginPath(); ctx.arc(0, -34, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = o.hair || '#5a3a1a';
  ctx.beginPath(); ctx.arc(0, -37, 10, Math.PI, Math.PI * 2); ctx.fill();
  if (o.cls === 'mage') { ctx.fillStyle = o.body; ctx.beginPath(); ctx.moveTo(-12, -40); ctx.lineTo(0, -60); ctx.lineTo(12, -40); ctx.fill(); } // 尖帽
  if (o.cls === 'spirit') { ctx.fillStyle = o.wpn; ctx.fillRect(-10, -42, 20, 3); } // 额带
  ctx.fillStyle = '#222';
  ctx.fillRect(o.face * 4 - 1.5, -35, 3, 3);
  ctx.save();
  ctx.translate(o.face * 12, -14);
  const swing = o.swing > 0 ? (1 - o.swing / 0.22) * Math.PI * 1.2 - 0.6 : -0.3;
  ctx.rotate(o.face * (swing + Math.PI / 2) - (o.face < 0 ? Math.PI : 0));
  if (o.cls === 'mage') { // 法杖：木杆 + 发光的珠子
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-1.5, -34, 3, 34);
    ctx.fillStyle = o.wpn; ctx.beginPath(); ctx.arc(0, -37, 5.5, 0, Math.PI * 2); ctx.fill();
  } else if (o.cls === 'spirit') { // 灵幡：木杆 + 幡旗
    ctx.fillStyle = '#7a5230'; ctx.fillRect(-1.5, -36, 3, 36);
    ctx.fillStyle = o.wpn; ctx.fillRect(1.5, -36, 11, 17);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(5, -33, 4, 11);
  } else { // 重剑
    ctx.fillStyle = o.wpn; ctx.fillRect(-2.5, -32, 5, 32);
    ctx.fillStyle = '#c9a55c'; ctx.fillRect(-7, -2, 14, 4);
  }
  ctx.restore();
  ctx.restore();
}
function drawPlayer(p) {
  const aT = S.equip.armor ? S.equip.armor.t : 0, wT = S.equip.weapon ? S.equip.weapon.t : 0;
  const cls = S.cls || 'blade';
  shadow(p.x, p.y + 2, 16);
  if (p.armorT > 0) { // 灵甲术：脚下金光
    ctx.fillStyle = `rgba(255,210,90,${0.25 + Math.sin(G.t * 8) * 0.1})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawHuman(p.x, p.y, { face: p.face, bob: p.moving ? Math.sin(p.step) * 2 : 0, body: TIER_COL[aT], wpn: WPN_COL[wT], cls, swing: p.swing, hurt: p.hurt > 0 });
  if (p.ward > 0) { // 灵盾：蓝色护罩
    ctx.strokeStyle = `rgba(140,210,255,${0.6 + Math.sin(G.t * 6) * 0.2})`; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(140,210,255,.14)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 22, 26, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (p.mend > 0) emoji('💚', p.x + 18, p.y - 50 + Math.sin(G.t * 6) * 3, 12);
  if (cls === 'blade' && p.swing > 0 && !ZONES[G.zone].safe) {
    ctx.strokeStyle = `rgba(255,255,255,${p.swing * 3})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y - 14, 46, p.dir - 0.9, p.dir + 0.9); ctx.stroke();
  }
  label(S.name, p.x, p.y - (cls === 'mage' ? 70 : 56), '#ffe9a8', 12);
  if (G.deadT > 0) label('💀', p.x, p.y - 20, '#fff', 28);
}
// 左上角小地图：白点=你，蓝=回城/上楼，黄=下楼，橙=BOSS，红=红名，灰点=怪
function drawMinimap(z) {
  if (z.safe) return;
  const d = G.dpr, land = innerWidth > innerHeight;
  const sz = 92 * d, x0 = 10 * d, y0 = (land ? 112 : 126) * d, k = sz / Math.max(z.w, z.h);
  const w = z.w * k, h = z.h * k;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = 'rgba(201,165,92,.8)'; ctx.lineWidth = d; ctx.strokeRect(x0, y0, w, h);
  const dot = (o, c, r) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + o.x * k, y0 + o.y * k, r * d, 0, Math.PI * 2); ctx.fill(); };
  if (G.nest) { ctx.strokeStyle = 'rgba(255,120,80,.7)'; ctx.beginPath(); ctx.arc(x0 + G.nest.x * k, y0 + G.nest.y * k, G.nest.r * k, 0, Math.PI * 2); ctx.stroke(); }
  for (const e of G.enemies) if (!e.m.boss && !e.m.rogue) dot(e, 'rgba(220,220,220,.55)', 0.8);
  for (const e of G.enemies) if (e.m.rogue) dot(e, '#ff3a2a', 2.2);
  for (const e of G.enemies) if (e.m.boss) dot(e, '#ff9a2a', 3.2);
  dot(G.portal, '#6fd8ff', 3);
  if (G.stairs) dot(G.stairs, '#ffe04a', 3);
  dot(G.player, '#fff', 2.6);
  ctx.restore();
}
function drawRogue(e) {
  const m = e.m;
  shadow(e.x, e.y + 2, 16);
  drawHuman(e.x, e.y, { face: e.face, bob: Math.sin(G.t * 9 + e.sx) * 1.5, body: '#4a1a1a', wpn: '#ff5a4a', cls: m.rogue, swing: e.cd > 1 ? 0.15 : 0, hurt: e.flash > 0, hair: '#111' });
  label('☠ ' + m.n, e.x, e.y - (m.rogue === 'mage' ? 72 : 58), '#ff4a3a', 13);
  const w = 56, y = e.y - (m.rogue === 'mage' ? 64 : 50);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2, y, w, 5);
  ctx.fillStyle = '#ff3a2a'; ctx.fillRect(e.x - w / 2, y, (w * Math.max(0, e.hp)) / m.hp, 5);
  if (e.poison > 0) emoji('☠️', e.x + 22, e.y - 40, 12);
  if (e.slow > 0) emoji('❄️', e.x - 22, e.y - 40, 12);
}
function drawPet(pet) {
  shadow(pet.x, pet.y + 6, 14);
  ctx.globalAlpha = pet.flash > 0 ? 0.5 : 1;
  emoji(pet.ic, pet.x, pet.y - 8 + Math.sin(G.t * 7) * 1.5, pet.kind === 'beast' ? 38 : 30, pet.face > 0);
  ctx.globalAlpha = 1;
  label(pet.n + (S.pet && S.pet.lv ? ' Lv' + S.pet.lv : ''), pet.x, pet.y - 36, S.pet && S.pet.lv >= PET_MAX ? '#ffe08a' : '#bfe6ff', 11);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(pet.x - 18, pet.y - 27, 36, 4);
  ctx.fillStyle = '#6fd8ff'; ctx.fillRect(pet.x - 18, pet.y - 27, (36 * Math.max(0, pet.hp)) / pet.maxHp, 4);
}
function drawLoot(l) {
  const c = QUALITY[l.g.q].c, tw = (Math.sin(G.t * 4 + l.x) + 1) / 2;
  if (l.t < 15 && Math.floor(G.t * 4) % 2) return; // 快消失时闪烁
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(l.x, l.y + 4, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = c; ctx.shadowBlur = 6 + tw * 8;
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(l.x, l.y - 4, 6, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  emoji(SLOT_IC[l.g.s], l.x, l.y - 6, 15);
  label(gearName(l.g), l.x, l.y - 22, c, 11);
}

function drawEnemy(e) {
  const m = e.m;
  if (m.rogue) return drawRogue(e);
  shadow(e.x, e.y + m.size * 0.6, m.size);
  const bob = Math.sin(G.t * 6 + e.sx) * 2;
  if (!m.ic) { // 史莱姆
    const sq = 1 + Math.sin(G.t * 8 + e.sx) * 0.08;
    ctx.fillStyle = e.flash > 0 ? '#fff' : m.color;
    ctx.beginPath(); ctx.ellipse(e.x, e.y - m.size * 0.5, m.size * sq, m.size * 0.8 / sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#123';
    ctx.fillRect(e.x - 6, e.y - m.size * 0.7, 3, 4); ctx.fillRect(e.x + 3, e.y - m.size * 0.7, 3, 4);
  } else {
    ctx.globalAlpha = e.flash > 0 ? 0.5 : 1;
    emoji(m.ic, e.x, e.y - m.size * 0.6 + bob, m.size * 2.1, e.face > 0);
    ctx.globalAlpha = 1;
  }
  if (m.boss || m.elite) {
    if (m.elite) label('⭐' + m.n, e.x, e.y - m.size * 1.9 - 6, '#ffcf4a', 12); else
    label(m.n, e.x, e.y - m.size * 1.9, '#ff9a6a', 14);
  }
  if (e.poison > 0) emoji('☠️', e.x + m.size, e.y - m.size * 1.5, 12);
  if (e.slow > 0) emoji('❄️', e.x - m.size, e.y - m.size * 1.5, 12);
  if (e.hp < m.hp || m.boss) {
    const w = m.boss ? 110 : m.size * 2.2;
    const y = e.y - m.size * (m.boss ? 1.6 : 1.75);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2, y, w, 5);
    ctx.fillStyle = m.boss ? '#ff4a2a' : '#ff5a4a'; ctx.fillRect(e.x - w / 2, y, (w * Math.max(0, e.hp)) / m.hp, 5);
  }
}

function drawHouse(n) {
  const t = S.house.tier, x = n.x, y = n.y;
  // 地块
  ctx.fillStyle = '#a98a5a';
  ctx.fillRect(x - 110, y - 40, 220, 120);
  ctx.strokeStyle = '#7a5a2e'; ctx.lineWidth = 3;
  ctx.strokeRect(x - 110, y - 40, 220, 120);
  if (t === 0) {
    ctx.fillStyle = '#6b4423'; ctx.fillRect(x - 3, y - 10, 6, 40);
    ctx.fillStyle = '#d9b27a'; ctx.fillRect(x - 30, y - 30, 60, 26);
    label('待建造', x, y - 17, '#3a2a10', 12);
  } else if (t === 1) {
    ctx.fillStyle = '#d8c9a0';
    ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x - 55, y + 30); ctx.lineTo(x + 55, y + 30); ctx.fill();
    ctx.fillStyle = '#5a4a30';
    ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x - 14, y + 30); ctx.lineTo(x + 14, y + 30); ctx.fill();
  } else {
    const big = t >= 4;
    const W = big ? 170 : 120, Hh = big ? 80 : 64;
    const wall = ['', '', '#c99a62', '#a7a7ad', '#e6dccb', '#b9b9c4', '#f4ecd8'][t];
    const roof = ['', '', '#8b4a2a', '#5a6a8a', '#b2402e', '#4a4a7a', '#d4a020'][t];
    ctx.fillStyle = wall; ctx.fillRect(x - W / 2, y + 30 - Hh, W, Hh);
    if (t >= 5) {
      ctx.fillStyle = wall;
      ctx.fillRect(x - W / 2 - 20, y - 80, 34, 110); ctx.fillRect(x + W / 2 - 14, y - 80, 34, 110);
      ctx.fillStyle = roof;
      [x - W / 2 - 3, x + W / 2 + 3].forEach((tx) => { ctx.beginPath(); ctx.moveTo(tx, y - 120); ctx.lineTo(tx - 22, y - 80); ctx.lineTo(tx + 22, y - 80); ctx.fill(); });
      ctx.fillStyle = '#ff4a4a'; ctx.fillRect(x - 3 - W / 2, y - 140, 3, 22); ctx.fillRect(x - W / 2, y - 140, 14, 9);
    }
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x - W / 2 - 12, y + 32 - Hh); ctx.lineTo(x, y - Hh - 20); ctx.lineTo(x + W / 2 + 12, y + 32 - Hh); ctx.fill();
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 12, y, 24, 30);
    ctx.fillStyle = '#9fd3ff';
    ctx.fillRect(x - W / 2 + 14, y - Hh + 46, 20, 16); ctx.fillRect(x + W / 2 - 34, y - Hh + 46, 20, 16);
  }
  if (t >= 2) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 108, y + 48, 50, 30); emoji('🥬', x - 83, y + 62, 20); }
  if (t >= 3) emoji('⛏️', x + 85, y + 60, 22);
  if (t >= 4) emoji('💰', x + 55, y + 62, 20);
  label('🏡 ' + HOUSE[t].n, x, y + 95, '#fff', 13);
}
function drawBuilding(n) {
  const x = n.x, y = n.y;
  if (n.id === 'quest') {
    ctx.fillStyle = '#6b4423'; ctx.fillRect(x - 32, y - 10, 6, 40); ctx.fillRect(x + 26, y - 10, 6, 40);
    ctx.fillStyle = '#b8874a'; ctx.fillRect(x - 40, y - 52, 80, 46);
    ctx.fillStyle = '#f3e7c4'; ctx.fillRect(x - 32, y - 46, 26, 32); ctx.fillRect(x + 4, y - 44, 28, 26);
    const ready = S.quests.some(questDone);
    if (ready) emoji('❗', x, y - 72 + Math.sin(G.t * 5) * 3, 24);
    label('📜 任务板', x, y + 44, '#fff', 13);
    return;
  }
  if (n.id === 'gate') {
    ctx.fillStyle = '#7a5a2e'; ctx.fillRect(x - 60, y - 60, 12, 70); ctx.fillRect(x + 48, y - 60, 12, 70);
    ctx.fillStyle = '#9b7440'; ctx.fillRect(x - 66, y - 70, 132, 16);
    label('🗺️ 出城冒险', x, y - 82, '#ffe9a8', 13);
    return;
  }
  const isShop = n.id === 'shop';
  ctx.fillStyle = isShop ? '#e7cf9f' : '#8a8a8a';
  ctx.fillRect(x - 70, y - 50, 140, 80);
  ctx.fillStyle = isShop ? '#2f7aa8' : '#3a3a3a';
  ctx.beginPath(); ctx.moveTo(x - 82, y - 48); ctx.lineTo(x, y - 100); ctx.lineTo(x + 82, y - 48); ctx.fill();
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 14, y - 6, 28, 36);
  if (isShop) {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d9443a'; ctx.fillRect(x - 70 + i * 23.3, y - 48, 23.3, 12); }
    emoji('🧑‍🌾', x + 44, y + 10, 26);
  } else {
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 60, y - 2, 30, 20);
    emoji('⚒️', x + 46, y + 8, 24);
  }
  label(isShop ? '🏪 杂货铺' : '⚒️ 铁匠铺', x, y + 48, '#fff', 13);
}

function render() {
  const z = ZONES[G.zone], p = G.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cv.width, cv.height);
  // 相机
  G.cam.x = z.w < G.vw ? (z.w - G.vw) / 2 : clamp(p.x - G.vw / 2, 0, z.w - G.vw);
  G.cam.y = z.h < G.vh ? (z.h - G.vh) / 2 : clamp(p.y - G.vh / 2, 0, z.h - G.vh);
  const k = G.dpr * G.scale;
  ctx.setTransform(k, 0, 0, k, -G.cam.x * k, -G.cam.y * k);

  ctx.fillStyle = z.bg;
  ctx.fillRect(0, 0, z.w, z.h);
  ctx.fillStyle = z.tuft;
  for (const t of G.tufts) {
    if (t.x < G.cam.x - 10 || t.x > G.cam.x + G.vw + 10 || t.y < G.cam.y - 10 || t.y > G.cam.y + G.vh + 10) continue;
    ctx.fillRect(t.x, t.y, 3 * t.s, 7 * t.s); ctx.fillRect(t.x + 4 * t.s, t.y + 2, 3 * t.s, 5 * t.s);
  }

  if (G.zone === 'village') {
    // 道路
    ctx.fillStyle = '#c9ab78';
    ctx.fillRect(520, 200, 60, 750);
    ctx.fillRect(250, 430, 700, 50);
    ctx.fillRect(560, 250, 260, 40);
    ctx.fillRect(560, 560, 280, 40);
    ctx.beginPath(); ctx.arc(550, 455, 70, 0, Math.PI * 2); ctx.fill();
    // 井
    ctx.fillStyle = '#8a8a8a'; ctx.beginPath(); ctx.arc(550, 455, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a6aa8'; ctx.beginPath(); ctx.arc(550, 455, 14, 0, Math.PI * 2); ctx.fill();
  } else {
    // 传送阵
    const pt = G.portal;
    ctx.strokeStyle = `rgba(140,220,255,${0.6 + Math.sin(G.t * 4) * 0.3})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 46, 20, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(140,220,255,.25)'; ctx.fill();
    label(z.prev ? '⬆️ 回上一层' : '🏡 回城传送阵', pt.x, pt.y + 36, '#cdf1ff', 12);
    if (G.stairs) { // 下一层的楼梯
      const sx = G.stairs.x, sy = G.stairs.y;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(sx, sy, 50, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,220,120,${0.6 + Math.sin(G.t * 4) * 0.3})`; ctx.lineWidth = 4; ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,220,120,${0.5 - i * 0.1})`; ctx.fillRect(sx - 26 + i * 6, sy - 10 + i * 6, 52 - i * 12, 4); }
      label('⬇️ ' + ZONES[G.stairs.to].n, sx, sy + 40, '#ffe08a', 12);
    }
    for (const w of G.walls) { // 火墙
      ctx.fillStyle = `rgba(255,110,30,${0.22 + Math.sin(G.t * 10 + w.x) * 0.06})`;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + G.t * 0.7; emoji('🔥', w.x + Math.cos(a) * w.r * 0.6, w.y + Math.sin(a) * w.r * 0.36 - Math.abs(Math.sin(G.t * 8 + i)) * 6, 20); }
    }
    if (G.nest) {
      const n = G.nest;
      ctx.fillStyle = `rgba(160,20,20,${0.16 + Math.sin(G.t * 2) * 0.04})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(255,80,60,.6)'; ctx.lineWidth = 3;
      ctx.stroke(); ctx.setLineDash([]);
      label('⚠️ 怪物巢穴（怪多·精英多·掉落好）', n.x, n.y - n.r - 12, '#ffb0a0', 13);
    }
  }

  // 按 y 排序绘制
  const list = [];
  // 只画镜头附近的东西（地图很大）
  const vis = (o, m = 160) => o.x > G.cam.x - m && o.x < G.cam.x + G.vw + m && o.y > G.cam.y - m && o.y < G.cam.y + G.vh + m;
  for (const d of G.decor) if (vis(d)) list.push({ y: d.y, f: () => drawDeco(d, z.theme) });
  for (const nd of G.nodes) if (vis(nd)) list.push({ y: nd.y, f: () => drawNode(nd, z.theme) });
  for (const n of G.npcs) list.push({ y: n.y + 30, f: () => (n.id === 'house' ? drawHouse(n) : drawBuilding(n)) });
  for (const c of G.critters) list.push({ y: c.y, f: () => emoji(c.ic, c.x, c.y - 10, 22, c.f < 0) });
  for (const e of G.enemies) if (vis(e)) list.push({ y: e.y, f: () => drawEnemy(e) });
  for (const l of G.loot) if (vis(l)) list.push({ y: l.y - 6, f: () => drawLoot(l) });
  if (G.pet) list.push({ y: G.pet.y, f: () => drawPet(G.pet) });
  list.push({ y: p.y, f: () => drawPlayer(p) });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();

  for (const w of G.warns) { // 红圈预警（画在最上层，方便看见）
    const k = 1 - w.t / w.life;
    ctx.fillStyle = `rgba(255,40,30,${0.15 + 0.25 * k})`;
    ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,60,.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,60,40,.55)';
    ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * k, w.r * 0.55 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of G.proj) {
    ctx.fillStyle = b.c; ctx.shadowColor = b.c; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of G.pproj) { // 玩家的弹丸
    ctx.fillStyle = b.c; ctx.shadowColor = b.c; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.big ? 9 : 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const f of G.fx) {
    const a = 1 - f.t / f.life;
    if (f.k === 'bolt') { // 落雷：从天上劈下来的折线
      ctx.strokeStyle = `rgba(255,245,160,${a})`; ctx.lineWidth = 5; ctx.shadowColor = '#fff27a'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(f.x - 30, f.y - 260); ctx.lineTo(f.x + 12, f.y - 170); ctx.lineTo(f.x - 14, f.y - 110); ctx.lineTo(f.x + 6, f.y - 50); ctx.lineTo(f.x, f.y - 8); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (f.k === 'dash') { // 破阵突：一道残影
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`; ctx.lineWidth = 10 * a + 2;
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 14); ctx.lineTo(f.x2, f.y2 - 14); ctx.stroke();
    } else if (f.k === 'ring') {
      ctx.strokeStyle = f.c ? f.c : `rgba(160,210,255,${a})`;
      ctx.globalAlpha = a;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(f.x, f.y - 10, f.r * (0.4 + 0.6 * (f.t / f.life)), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`;
      for (let i = 0; i < 6; i++) {
        const an = (i / 6) * Math.PI * 2, r = f.r * (f.t / f.life);
        ctx.beginPath(); ctx.arc(f.x + Math.cos(an) * r, f.y - 10 + Math.sin(an) * r * 0.6, 5 * a + 1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  for (const t of G.texts) {
    if (t.t < 0) continue;
    ctx.globalAlpha = 1 - t.t / t.life;
    label(t.text, t.x, t.y - t.t * 40, t.color, t.size);
    ctx.globalAlpha = 1;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.deadT > 0) { ctx.fillStyle = 'rgba(80,0,0,.35)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  drawMinimap(z);
}
function drawNode(nd, theme) {
  const k = nd.kind;
  if (!nd.ready) {
    if (k === 'tree') { shadow(nd.x, nd.y + 2, 12); ctx.fillStyle = '#6b4423'; ctx.fillRect(nd.x - 7, nd.y - 8, 14, 10); }
    else { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(nd.x, nd.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  if (k === 'tree') drawTree(nd.x, nd.y, 1, theme === 'cave' || theme === 'volcano' || theme === 'abyss' ? 'forest' : theme, 0.7);
  else if (k === 'bush') drawBush(nd.x, nd.y, 1, theme);
  else drawRock(nd.x, nd.y, 1.1, theme, k === 'ore');
  // 闪光提示可采集
  const tw = (Math.sin(G.t * 3 + nd.x) + 1) / 2;
  ctx.fillStyle = `rgba(255,255,200,${0.3 + tw * 0.6})`;
  ctx.beginPath(); ctx.arc(nd.x + 14, nd.y - (k === 'tree' ? 56 : 30), 3 + tw * 2, 0, Math.PI * 2); ctx.fill();
}

/* ===================== 启动 ===================== */
let loopStarted = false;
function startGame() {
  resize();
  initPlayer();
  fillQuests();
  G.pet = null;
  enterZone('village', true);
  if (S.pet && S.cls === 'spirit' && hasSk(S.pet.kind)) makePet(stats()); else S.pet = null; // 上次的召唤物还在
  G.running = true;
  G.paused = false;
  G.auto = false;
  $('#btnAuto').classList.remove('active');
  renderSkillBar();
  updateHud();
  if (!S.cls) openPanel('cls'); // 新角色先选职业
  else toast(`欢迎回来，${S.name}！`);
  if (!loopStarted) {
    loopStarted = true;
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (G.running) {
        if (!G.paused) update(dt);
        render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// 已登录则自动进入
(async () => {
  if (Auth.token) {
    try {
      await loadAndStart();
    } catch (e) {
      if (e.status === 401) { Auth.token = ''; localStorage.removeItem('cl_token'); }
      else $('#authMsg').textContent = e.message;
    }
  }
})();
