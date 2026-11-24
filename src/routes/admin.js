import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { COOKIE, checkLogin, cookieOptions, issueToken, requireAdmin, setPassword } from '../auth.js';
import { STATUSES, STATUS_LABELS, formatPhone, validateNews } from '../validate.js';
import { importChannel } from '../importer.js';
import { getMeta } from '../db.js';

/** Detect the real image type from magic bytes (never trust the client's mime type). */
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // block spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export function adminRouter({ db, cfg, telegram, log, fetchImpl }) {
  const r = express.Router();
  const auth = requireAdmin(db, cfg);
  const json = express.json({ limit: '50kb' });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

  function saveImage(file) {
    if (!file) return null;
    const ext = sniffImage(file.buffer);
    if (!ext) { const e = new Error('Faqat JPG, PNG yoki WEBP rasm yuklash mumkin.'); e.status = 400; throw e; }
    fs.mkdirSync(cfg.uploadsDir, { recursive: true });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(cfg.uploadsDir, name), file.buffer);
    return `/uploads/${name}`;
  }
  function removeImage(url) {
    if (!url?.startsWith('/uploads/')) return;
    const file = path.join(cfg.uploadsDir, path.basename(url));
    fs.rm(file, { force: true }, () => {});
  }

  /* ---------- session ---------- */
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: "Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring." } });

  r.post('/login', loginLimiter, json, (req, res) => {
    const admin = checkLogin(db, req.body?.username, req.body?.password);
    if (!admin) return res.status(401).json({ error: "Login yoki parol noto'g'ri." });
    res.cookie(COOKIE, issueToken(cfg, admin), cookieOptions(cfg));
    res.json({ ok: true, username: admin.username });
  });
  r.post('/logout', (_req, res) => { res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true }); });
  r.get('/me', auth, (req, res) => res.json({ username: req.admin.username }));

  r.post('/password', auth, json, (req, res) => {
    const { current, next } = req.body || {};
    if (!checkLogin(db, req.admin.username, current)) return res.status(400).json({ error: "Joriy parol noto'g'ri." });
    if (typeof next !== 'string' || next.length < 10) return res.status(400).json({ error: "Yangi parol kamida 10 ta belgi bo'lsin." });
    setPassword(db, req.admin.username, next);
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(req.admin.username);
    res.cookie(COOKIE, issueToken(cfg, admin), cookieOptions(cfg));
    res.json({ ok: true });
  });

  /* ---------- dashboard ---------- */
  r.get('/stats', auth, (_req, res) => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const row of db.prepare('SELECT status, COUNT(*) n FROM applications GROUP BY status').all()) byStatus[row.status] = row.n;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const today = db.prepare("SELECT COUNT(*) n FROM applications WHERE date(created_at) = date('now')").get().n;
    const week = db.prepare("SELECT COUNT(*) n FROM applications WHERE created_at > datetime('now','-7 days')").get().n;
    const daily = db.prepare(`SELECT date(created_at) d, COUNT(*) n FROM applications
                              WHERE created_at > datetime('now','-14 days') GROUP BY d ORDER BY d`).all();
    const byGrade = db.prepare('SELECT grade, COUNT(*) n FROM applications GROUP BY grade ORDER BY n DESC').all();
    const news = db.prepare('SELECT SUM(published) published, SUM(1 - published) hidden FROM news').get();
    res.json({
      total, today, week, byStatus, daily, byGrade,
      news: { published: news.published ?? 0, hidden: news.hidden ?? 0 },
      telegram: { configured: telegram.enabled, channel: cfg.channel, importIntervalMin: cfg.importIntervalMin,
        autoPublish: cfg.importAutoPublish, lastImport: JSON.parse(getMeta(db, 'last_import') || 'null') },
      statusLabels: STATUS_LABELS,
    });
  });

  /* ---------- applications ---------- */
  function appQuery(q) {
    const where = [];
    const args = [];
    if (STATUSES.includes(q.status)) { where.push('status = ?'); args.push(q.status); }
    if (q.grade) { where.push('grade = ?'); args.push(String(q.grade)); }
    if (q.q) {
      const like = `%${String(q.q).trim().slice(0, 60)}%`;
      const digits = String(q.q).replace(/\D/g, '');
      where.push(`(parent_name LIKE ? OR child_name LIKE ? ${digits ? 'OR phone LIKE ?' : ''})`);
      args.push(like, like, ...(digits ? [`%${digits}%`] : []));
    }
    return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
  }

  r.get('/applications', auth, (req, res) => {
    const { sql, args } = appQuery(req.query);
    const per = Math.min(Math.max(Number.parseInt(req.query.per, 10) || 25, 1), 100);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const total = db.prepare(`SELECT COUNT(*) n FROM applications ${sql}`).get(...args).n;
    const items = db.prepare(`SELECT * FROM applications ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(...args, per, (page - 1) * per);
    res.json({ total, page, per, items });
  });

  r.get('/applications.csv', auth, (req, res) => {
    const { sql, args } = appQuery(req.query);
    const rows = db.prepare(`SELECT * FROM applications ${sql} ORDER BY id DESC`).all(...args);
    const head = ['ID', 'Sana (UTC)', 'Ota-ona', 'Telefon', 'Farzand', 'Sinf', 'Holat', 'Izoh', 'Admin izohi'];
    const lines = rows.map((a) => [a.id, a.created_at, a.parent_name, formatPhone(a.phone), a.child_name, a.grade,
      STATUS_LABELS[a.status], a.message, a.admin_note].map(csvCell).join(','));
    res.set('content-type', 'text/csv; charset=utf-8');
    res.set('content-disposition', `attachment; filename="arizalar-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + [head.map(csvCell).join(','), ...lines].join('\r\n'));
  });

  r.patch('/applications/:id', auth, json, (req, res) => {
    const a = db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(req.params.id));
    if (!a) return res.status(404).json({ error: 'Ariza topilmadi.' });
    const status = req.body?.status ?? a.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: "Noto'g'ri holat." });
    const note = req.body?.admin_note !== undefined ? String(req.body.admin_note).slice(0, 1000) : a.admin_note;
    const updated = db.prepare(`UPDATE applications SET status = ?, admin_note = ?, updated_at = datetime('now')
                                WHERE id = ? RETURNING *`).get(status, note, a.id);
    res.json(updated);
  });

  r.delete('/applications/:id', auth, (req, res) => {
    const out = db.prepare('DELETE FROM applications WHERE id = ?').run(Number(req.params.id));
    if (!out.changes) return res.status(404).json({ error: 'Ariza topilmadi.' });
    res.json({ ok: true });
  });

  /* ---------- news ---------- */
  r.get('/news', auth, (req, res) => {
    const filter = { published: 'WHERE published = 1', hidden: 'WHERE published = 0' }[req.query.filter] || '';
    res.json({ items: db.prepare(`SELECT * FROM news ${filter} ORDER BY pinned DESC, published_at DESC, id DESC`).all() });
  });

  r.post('/news', auth, upload.single('image'), (req, res) => {
    const { value, errors } = validateNews(req.body);
    if (errors) return res.status(400).json({ error: "Ma'lumotlarni tekshiring.", fields: errors });
    const image = saveImage(req.file) || '';
    const item = db.prepare(`INSERT INTO news (title, body, image, link, published, pinned, published_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`)
      .get(value.title, value.body, image, value.link, value.published, value.pinned, value.published_at);
    res.status(201).json(item);
  });

  r.patch('/news/:id', auth, upload.single('image'), (req, res) => {
    const item = db.prepare('SELECT * FROM news WHERE id = ?').get(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Yangilik topilmadi.' });
    const body = req.body || {};
    const { value, errors } = validateNews(body, { partial: true });
    if (errors) return res.status(400).json({ error: "Ma'lumotlarni tekshiring.", fields: errors });
    const image = saveImage(req.file);
    if (image || ['1', 'true'].includes(body.remove_image)) {
      removeImage(item.image);
      value.image = image || '';
    }
    const keys = Object.keys(value);
    if (keys.length) {
      db.prepare(`UPDATE news SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`)
        .run(...keys.map((k) => value[k]), item.id);
    }
    res.json(db.prepare('SELECT * FROM news WHERE id = ?').get(item.id));
  });

  r.delete('/news/:id', auth, (req, res) => {
    const item = db.prepare('SELECT * FROM news WHERE id = ?').get(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Yangilik topilmadi.' });
    if (item.source === 'telegram') {
      // Keep a hidden tombstone so the importer does not bring the post back.
      removeImage(item.image);
      db.prepare("UPDATE news SET published = 0, image = '', title = '[o''chirilgan]', body = '' WHERE id = ?").run(item.id);
    } else {
      removeImage(item.image);
      db.prepare('DELETE FROM news WHERE id = ?').run(item.id);
    }
    res.json({ ok: true });
  });

  r.post('/import', auth, async (_req, res) => {
    try {
      res.json(await importChannel({ db, cfg, fetchImpl, log }));
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  r.post('/telegram/test', auth, async (_req, res) => {
    const out = await telegram.send('✅ Zafar International School sayti: Telegram xabarnomalari ishlayapti.');
    if (out.ok) return res.json({ ok: true });
    res.status(out.reason === 'not_configured' ? 400 : 502).json({
      error: out.reason === 'not_configured' ? 'TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID sozlanmagan.' : `Xatolik: ${out.reason}`,
    });
  });

  // multer / validation errors -> JSON
  r.use((err, _req, res, _next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
    if (status >= 500) log(err.stack || err.message);
    res.status(status).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Rasm 5 MB dan katta bo\'lmasin.' : (status >= 500 ? 'Server xatosi.' : err.message) });
  });

  return r;
}
