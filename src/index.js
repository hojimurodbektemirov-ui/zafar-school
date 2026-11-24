import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { ensureAdmin } from './auth.js';
import { seedNews } from './seed.js';
import { createApp } from './app.js';
import { importChannel } from './importer.js';

const log = (...a) => console.log(new Date().toISOString(), ...a);

const cfg = loadConfig();
const db = openDb(cfg.dbFile);

const generated = ensureAdmin(db, cfg);
if (generated) {
  log('==================================================');
  log(`Admin yaratildi. Login: ${cfg.adminUsername}  Parol: ${generated}`);
  log("Bu parolni saqlab qo'ying va admin panelda o'zgartiring.");
  log('==================================================');
}
if (cfg.ephemeralSecret) log("Ogohlantirish: SESSION_SECRET berilmagan, server qayta ishga tushsa sessiyalar o'chadi.");
const seeded = seedNews(db, cfg);
if (seeded) log(`${seeded} ta boshlang'ich yangilik qo'shildi.`);

const { app, telegram } = createApp({ db, cfg, log });
const server = app.listen(cfg.port, () => {
  log(`ZIS sayti ishga tushdi: http://localhost:${cfg.port}  (admin: /admin)`);
  log(`Telegram xabarnomalari: ${telegram.enabled ? 'yoqilgan' : "o'chiq (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID yo'q)"}`);
});

let timer = null;
if (cfg.importIntervalMin > 0) {
  const run = () => importChannel({ db, cfg, log })
    .then((r) => r.added && log(`Telegram import: ${r.added} ta yangi post (ko'rib chiqilgan: ${r.scanned}).`))
    .catch((e) => log(`Telegram import xatosi: ${e.message}`));
  setTimeout(run, 15_000);
  timer = setInterval(run, cfg.importIntervalMin * 60_000);
}

function shutdown(sig) {
  log(`${sig} olindi, server to'xtatilmoqda...`);
  clearInterval(timer);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
