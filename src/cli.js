// Usage: npm run reset-password -- <username> <new-password>
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { setPassword } from './auth.js';
import bcrypt from 'bcryptjs';

const [cmd, username, password] = process.argv.slice(2);
if (cmd !== 'reset-password' || !username || !password || password.length < 10) {
  console.error('Foydalanish: npm run reset-password -- <login> <yangi-parol (kamida 10 belgi)>');
  process.exit(1);
}
const cfg = loadConfig({ ...process.env, NODE_ENV: 'development' });
const db = openDb(cfg.dbFile);
if (!setPassword(db, username, password)) {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, 12));
  console.log(`Yangi admin yaratildi: ${username}`);
} else {
  console.log(`Parol yangilandi: ${username}. Barcha eski sessiyalar bekor qilindi.`);
}
db.close();
