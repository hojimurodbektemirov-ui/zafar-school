import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function int(v, def) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : def;
}

function bool(v, def) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

/** Build the runtime config from environment variables (see .env.example). */
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const dataDir = path.resolve(ROOT, env.DATA_DIR || 'data');

  const cfg = {
    root: ROOT,
    production,
    port: int(env.PORT, 3000),
    dataDir,
    dbFile: env.DB_FILE || path.join(dataDir, 'zis.db'),
    uploadsDir: path.join(dataDir, 'uploads'),
    publicDir: path.join(ROOT, 'public'),
    trustProxy: bool(env.TRUST_PROXY, false),
    cookieSecure: bool(env.COOKIE_SECURE, production),

    adminUsername: env.ADMIN_USERNAME || 'admin',
    adminPassword: env.ADMIN_PASSWORD || '',
    sessionSecret: env.SESSION_SECRET || '',
    sessionHours: int(env.SESSION_HOURS, 12),

    telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: env.TELEGRAM_CHAT_ID || '',
    telegramApiBase: env.TELEGRAM_API_BASE || 'https://api.telegram.org',

    channel: env.TG_CHANNEL || 'zafar_international_school',
    importIntervalMin: int(env.IMPORT_INTERVAL_MIN, 30),
    importAutoPublish: bool(env.IMPORT_AUTO_PUBLISH, false),

    applicationRateLimit: int(env.APPLICATION_RATE_LIMIT, 5),
    seedNews: bool(env.SEED_NEWS, true),
  };

  if (!cfg.sessionSecret) {
    if (production) throw new Error('SESSION_SECRET majburiy (production rejimida).');
    cfg.sessionSecret = crypto.randomBytes(32).toString('hex');
    cfg.ephemeralSecret = true;
  }
  if (production && !cfg.adminPassword) {
    throw new Error('ADMIN_PASSWORD majburiy (production rejimida).');
  }
  return cfg;
}
