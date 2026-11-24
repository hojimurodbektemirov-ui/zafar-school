import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const COOKIE = 'zis_admin';
let DUMMY_HASH = null;

/** Create the first admin account if none exists. Returns a generated password when one was made up. */
export function ensureAdmin(db, cfg) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count > 0) return null;
  const password = cfg.adminPassword || crypto.randomBytes(9).toString('base64url');
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
    .run(cfg.adminUsername, bcrypt.hashSync(password, 12));
  return cfg.adminPassword ? null : password;
}

export function setPassword(db, username, password) {
  const r = db.prepare('UPDATE admins SET password_hash = ?, token_version = token_version + 1 WHERE username = ?')
    .run(bcrypt.hashSync(password, 12), username);
  return r.changes > 0;
}

export function checkLogin(db, username, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username ?? ''));
  // Compare against a dummy hash when the user is unknown so timing does not reveal usernames.
  const hash = admin?.password_hash ?? (DUMMY_HASH ??= bcrypt.hashSync('dummy-password', 12));
  const ok = bcrypt.compareSync(String(password ?? ''), hash);
  return ok && admin ? admin : null;
}

export function issueToken(cfg, admin) {
  return jwt.sign({ sub: admin.id, v: admin.token_version }, cfg.sessionSecret, { expiresIn: `${cfg.sessionHours}h` });
}

export function cookieOptions(cfg) {
  return { httpOnly: true, sameSite: 'strict', secure: cfg.cookieSecure, path: '/', maxAge: cfg.sessionHours * 3600 * 1000 };
}

/** Express middleware: requires a valid admin session; blocks cross-site writes. */
export function requireAdmin(db, cfg) {
  const byId = db.prepare('SELECT id, username, token_version FROM admins WHERE id = ?');
  return (req, res, next) => {
    try {
      const payload = jwt.verify(req.cookies?.[COOKIE] || '', cfg.sessionSecret);
      const admin = byId.get(payload.sub);
      if (!admin || admin.token_version !== payload.v) throw new Error('stale');
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.get('x-zis-csrf') !== '1') return res.status(403).json({ error: "So'rov rad etildi (CSRF)." });
        const origin = req.get('origin');
        if (origin && new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Boshqa saytdan so\'rov.' });
      }
      req.admin = admin;
      next();
    } catch {
      res.status(401).json({ error: 'Avval tizimga kiring.' });
    }
  };
}
