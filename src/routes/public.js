import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { validateApplication, GRADES } from '../validate.js';

export function publicRouter({ db, cfg, telegram, log }) {
  const r = express.Router();

  r.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  r.get('/meta', (_req, res) => res.json({ grades: GRADES }));

  const listNews = db.prepare(`SELECT id, title, body, image, link, published_at, pinned FROM news
                               WHERE published = 1 ORDER BY pinned DESC, published_at DESC, id DESC LIMIT ? OFFSET ?`);
  r.get('/news', (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 24);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    res.set('cache-control', 'no-cache'); // revalidate via ETag so admin edits show at once
    res.json({ items: listNews.all(limit, offset) });
  });

  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: cfg.applicationRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Juda ko'p urinish. 10 daqiqadan so'ng qayta urinib ko'ring yoki 78 113 77 73 ga qo'ng'iroq qiling." },
  });

  const recentDup = db.prepare(`SELECT id FROM applications WHERE phone = ? AND child_name = ?
                                AND created_at > datetime('now', '-30 minutes')`);
  const insert = db.prepare(`INSERT INTO applications (parent_name, phone, child_name, grade, message, ip_hash, user_agent)
                             VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`);
  const markNotified = db.prepare('UPDATE applications SET notified = 1 WHERE id = ?');

  r.post('/applications', limiter, express.json({ limit: '10kb' }), async (req, res) => {
    // Honeypot: bots fill the hidden "website" field; pretend success and store nothing.
    if (req.body?.website) return res.status(201).json({ ok: true });

    const { value, errors } = validateApplication(req.body);
    if (errors) return res.status(400).json({ error: "Ma'lumotlarni tekshiring.", fields: errors });

    const dup = recentDup.get(value.phone, value.child_name);
    if (dup) return res.status(201).json({ ok: true, id: dup.id, duplicate: true });

    const ipHash = crypto.createHash('sha256').update(`${req.ip}|${cfg.sessionSecret}`).digest('hex').slice(0, 16);
    const app = insert.get(value.parent_name, value.phone, value.child_name, value.grade, value.message,
      ipHash, String(req.get('user-agent') || '').slice(0, 200));

    res.status(201).json({ ok: true, id: app.id });

    // Notify staff after responding so a slow Telegram API never delays the parent.
    const sent = await telegram.notifyApplication(app);
    if (sent.ok) markNotified.run(app.id);
    else if (sent.reason !== 'not_configured') log(`Telegram xabari yuborilmadi (ariza #${app.id}): ${sent.reason}`);
  });

  return r;
}
