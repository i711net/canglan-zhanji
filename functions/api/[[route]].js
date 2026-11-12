// Cloudflare Pages Functions 后端：邮箱注册 / 登录 / 云存档 / 邮件验证码找回密码
// 需要在 Pages 项目里绑定一个 D1 数据库，变量名必须是 DB
// 数据表会在第一次请求时自动创建（也可以手动执行 schema.sql）
// 找回密码要在 Pages 项目的「变量和机密」里加两个：
//   MAIL_URL = 发信脚本的网址，例如 https://wuyu.991828.xyz/cl-mail.php
//   MAIL_KEY = 和发信脚本里 $KEY 一样的那串密钥（类型选「机密」）

let tablesReady = false;

async function ensureTables(db) {
  if (tablesReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL,
      pass_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      tries INTEGER NOT NULL,
      sent_at INTEGER NOT NULL,
      day_count INTEGER NOT NULL
    )`),
  ]);
  tablesReady = true;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

async function pbkdf2(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits);
}

async function sha256(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const SESSION_DAYS = 30;

async function createSession(db, userId) {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_DAYS * 86400000;
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, expires)
    .run();
  return token;
}

async function getUser(db, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.nickname, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .bind(await sha256(token))
    .first();
  if (!row || row.expires_at < Date.now()) return null;
  return { ...row, tokenHashPromise: sha256(token) };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function register(db, request) {
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const nickname = String(body.nickname || '').trim().slice(0, 12) || email.split('@')[0].slice(0, 12);
  if (!EMAIL_RE.test(email) || email.length > 120) return json({ error: '邮箱格式不正确' }, 400);
  if (password.length < 6 || password.length > 64) return json({ error: '密码需要 6-64 位' }, 400);

  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return json({ error: '这个邮箱已经注册过了，请直接登录' }, 409);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  const res = await db
    .prepare('INSERT INTO users (email, nickname, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(email, nickname, hash, toHex(salt), Date.now())
    .run();
  const userId = res.meta.last_row_id;
  const token = await createSession(db, userId);
  return json({ token, email, nickname });
}

async function login(db, request) {
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return json({ error: '邮箱或密码错误' }, 401);
  const hash = await pbkdf2(password, fromHex(user.salt));
  if (!safeEqual(hash, user.pass_hash)) return json({ error: '邮箱或密码错误' }, 401);
  // 顺手清理这个用户过期的登录
  await db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(user.id, Date.now()).run();
  const token = await createSession(db, user.id);
  return json({ token, email: user.email, nickname: user.nickname });
}

/* ---------- 找回密码：发 6 位验证码到注册邮箱 ---------- */
const CODE_MINUTES = 10; // 验证码有效期
const RESEND_SECONDS = 60; // 同一个邮箱两次发送的最短间隔
const MAX_PER_DAY = 5; // 同一个邮箱 24 小时内最多发几次
const MAX_TRIES = 5; // 一个验证码最多试错几次

async function forgot(db, env, request) {
  if (!env.MAIL_URL || !env.MAIL_KEY) return json({ error: '服务器还没有配置发信（MAIL_URL / MAIL_KEY），暂时不能找回密码' }, 503);
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return json({ error: '邮箱格式不正确' }, 400);
  const now = Date.now();
  const old = await db.prepare('SELECT * FROM resets WHERE email = ?').bind(email).first();
  if (old && now - old.sent_at < RESEND_SECONDS * 1000) return json({ error: `发送太频繁，请 ${RESEND_SECONDS} 秒后再试` }, 429);
  const sameDay = old && now - old.sent_at < 86400000;
  if (sameDay && old.day_count >= MAX_PER_DAY) return json({ error: '今天发送次数太多了，请明天再试' }, 429);
  // 不管邮箱有没有注册，回复都一样，免得被人拿来试探哪些邮箱注册过
  const okMsg = { ok: true, message: `如果这个邮箱注册过，验证码已经发出，${CODE_MINUTES} 分钟内有效（没收到请看垃圾箱）` };
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  await db
    .prepare(
      `INSERT INTO resets (email, code_hash, expires_at, tries, sent_at, day_count) VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, sent_at = excluded.sent_at, day_count = excluded.day_count`
    )
    .bind(email, user ? await sha256(code + '|' + email) : '-', now + CODE_MINUTES * 60000, now, sameDay ? old.day_count + 1 : 1)
    .run();
  if (!user) return json(okMsg);
  let r;
  try {
    r = await fetch(env.MAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mail-Key': env.MAIL_KEY },
      body: JSON.stringify({ to: email, code, minutes: CODE_MINUTES }),
    });
  } catch (e) {
    return json({ error: '发信服务连不上，请稍后再试' }, 502);
  }
  if (!r.ok) return json({ error: '发信失败（' + r.status + '），请稍后再试' }, 502);
  return json(okMsg);
}

async function resetPassword(db, request) {
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email)) return json({ error: '邮箱格式不正确' }, 400);
  if (!/^\d{6}$/.test(code)) return json({ error: '验证码是 6 位数字' }, 400);
  if (password.length < 6 || password.length > 64) return json({ error: '新密码需要 6-64 位' }, 400);
  const row = await db.prepare('SELECT * FROM resets WHERE email = ?').bind(email).first();
  if (!row || row.expires_at < Date.now()) return json({ error: '验证码已过期，请重新获取' }, 400);
  if (row.tries >= MAX_TRIES) return json({ error: '验证码试错次数太多，请重新获取' }, 400);
  if (!safeEqual(await sha256(code + '|' + email), row.code_hash)) {
    await db.prepare('UPDATE resets SET tries = tries + 1 WHERE email = ?').bind(email).run();
    return json({ error: '验证码不对' }, 400);
  }
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return json({ error: '验证码不对' }, 400);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  await db.batch([
    db.prepare('UPDATE users SET pass_hash = ?, salt = ? WHERE id = ?').bind(hash, toHex(salt), user.id),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id), // 改密码后，其他设备上的登录全部失效
    db.prepare('DELETE FROM resets WHERE email = ?').bind(email),
  ]);
  const token = await createSession(db, user.id);
  return json({ token, email: user.email, nickname: user.nickname });
}

const MAX_SAVE_BYTES = 200 * 1024;

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!env.DB) {
    return json({ error: '服务器还没有绑定 D1 数据库（Pages 设置 → 绑定 → D1，变量名填 DB）' }, 500);
  }
  const db = env.DB;
  const route = (params.route || []).join('/');
  const method = request.method;

  try {
    await ensureTables(db);

    if (route === 'register' && method === 'POST') return await register(db, request);
    if (route === 'login' && method === 'POST') return await login(db, request);
    if (route === 'forgot' && method === 'POST') return await forgot(db, env, request);
    if (route === 'reset' && method === 'POST') return await resetPassword(db, request);

    // 以下接口需要登录
    const user = await getUser(db, request);
    if (!user) return json({ error: '登录已过期，请重新登录' }, 401);

    if (route === 'me' && method === 'GET') {
      return json({ email: user.email, nickname: user.nickname });
    }

    if (route === 'logout' && method === 'POST') {
      await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await user.tokenHashPromise).run();
      return json({ ok: true });
    }

    if (route === 'save' && method === 'GET') {
      const row = await db.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?').bind(user.id).first();
      return json({
        email: user.email,
        nickname: user.nickname,
        data: row ? JSON.parse(row.data) : null,
        updated_at: row ? row.updated_at : 0,
      });
    }

    if ((route === 'save' && method === 'PUT') || (route === 'save' && method === 'POST')) {
      const text = await request.text();
      if (text.length > MAX_SAVE_BYTES) return json({ error: '存档太大' }, 413);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: '存档格式错误' }, 400);
      }
      if (!body || typeof body.data !== 'object' || body.data === null) return json({ error: '缺少存档数据' }, 400);
      const now = Date.now();
      await db
        .prepare(
          `INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        )
        .bind(user.id, JSON.stringify(body.data), now)
        .run();
      return json({ ok: true, updated_at: now });
    }

    return json({ error: '接口不存在' }, 404);
  } catch (e) {
    return json({ error: '服务器错误：' + (e && e.message ? e.message : e) }, 500);
  }
}
