import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { ensureAdmin } from '../src/auth.js';
import { seedNews } from '../src/seed.js';
import { createApp } from '../src/app.js';
import { parseChannelHtml, titleFromText } from '../src/importer.js';

const FIXTURE = fs.readFileSync(new URL('./fixtures/channel.html', import.meta.url), 'utf8');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);

let server, base, db, tmp;
const sent = []; // Telegram messages captured by the mock

// Mock for outgoing requests: Telegram Bot API, the channel page and channel images.
async function fakeFetch(url, opts = {}) {
  url = String(url);
  if (url.includes('/sendMessage')) {
    sent.push(JSON.parse(opts.body));
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  }
  if (url === 'https://t.me/s/zafar_international_school') return new Response(FIXTURE, { headers: { 'content-type': 'text/html' } });
  if (url.includes('telesco.pe')) return new Response(JPEG, { headers: { 'content-type': 'image/jpeg' } });
  return new Response('nope', { status: 404 });
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zis-test-'));
  const cfg = loadConfig({
    DATA_DIR: tmp, ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'test-password-123', SESSION_SECRET: 'x'.repeat(40),
    TELEGRAM_BOT_TOKEN: '123:abc', TELEGRAM_CHAT_ID: '-100', APPLICATION_RATE_LIMIT: '6', IMPORT_INTERVAL_MIN: '0',
  });
  db = openDb(path.join(tmp, 'test.db'));
  ensureAdmin(db, cfg);
  seedNews(db, cfg);
  const { app } = createApp({ db, cfg, fetchImpl: fakeFetch, log: () => {} });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

async function login() {
  const res = await post('/api/admin/login', { username: 'admin', password: 'test-password-123' });
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  return (p, opts = {}) => fetch(base + p, { ...opts, headers: { cookie, 'x-zis-csrf': '1', ...(opts.headers || {}) } });
}

describe('public site', () => {
  test('serves the homepage, admin page and security headers', async () => {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Zafar International School/);
    assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal((await fetch(base + '/admin/')).status, 200);
    assert.equal((await fetch(base + '/js/site.js')).status, 200);
  });

  test('lists seeded news, pinned first, published only', async () => {
    const { items } = await (await fetch(base + '/api/news?limit=50')).json();
    assert.equal(items.length, 8);
    assert.equal(items[0].pinned, 1);
    assert.match(items[0].title, /TOP-10/);
  });
});

describe('applications', () => {
  test('valid application is stored and sent to Telegram', async () => {
    const res = await post('/api/applications', { parent: 'Dilnoza Karimova', phone: '90 123 45 67', child: 'Aziz', grade: '5-sinf', message: '<b>kechqurun</b>' });
    assert.equal(res.status, 201);
    const { id } = await res.json();
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
    assert.equal(row.phone, '+998901234567');
    assert.equal(row.status, 'new');
    await new Promise((r) => setTimeout(r, 50));
    const msg = sent.at(-1);
    assert.equal(msg.chat_id, '-100');
    assert.match(msg.text, /Dilnoza Karimova/);
    assert.match(msg.text, /&lt;b&gt;kechqurun/); // user HTML is escaped
    assert.equal(db.prepare('SELECT notified FROM applications WHERE id = ?').get(id).notified, 1);
  });

  test('invalid input returns field errors', async () => {
    const res = await post('/api/applications', { parent: 'A', phone: '123', child: '', grade: '12-sinf' });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.deepEqual(Object.keys(data.fields).sort(), ['child', 'grade', 'parent', 'phone']);
  });

  test('duplicate within 30 minutes is not stored twice', async () => {
    const body = { parent: 'Olim Aliyev', phone: '+998 93 111 22 33', child: 'Sardor', grade: '2-sinf' };
    const a = await (await post('/api/applications', body)).json();
    const b = await (await post('/api/applications', body)).json();
    assert.equal(a.id, b.id);
    assert.equal(b.duplicate, true);
  });

  test('honeypot field silently drops bots', async () => {
    const before = db.prepare('SELECT COUNT(*) n FROM applications').get().n;
    const res = await post('/api/applications', { parent: 'Bot', phone: '901234567', child: 'Bot', grade: '1-sinf', website: 'spam.com' });
    assert.equal(res.status, 201);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM applications').get().n, before);
  });

  test('rate limit kicks in', async () => {
    let last;
    for (let i = 0; i < 6; i++) last = await post('/api/applications', { parent: 'Test', phone: '901234567', child: 'X' + i, grade: '1-sinf' });
    assert.equal(last.status, 429);
  });
});

describe('admin', () => {
  test('rejects bad login and unauthenticated access', async () => {
    assert.equal((await post('/api/admin/login', { username: 'admin', password: 'wrong' })).status, 401);
    assert.equal((await fetch(base + '/api/admin/applications')).status, 401);
  });

  test('blocks writes without the CSRF header', async () => {
    const res = await post('/api/admin/login', { username: 'admin', password: 'test-password-123' });
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const r = await fetch(base + '/api/admin/applications/1', { method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: '{"status":"contacted"}' });
    assert.equal(r.status, 403);
  });

  test('lists, filters, updates and exports applications', async () => {
    const req = await login();
    const list = await (await req('/api/admin/applications?q=Dilnoza')).json();
    assert.equal(list.total, 1, JSON.stringify(list.items.map(i=>[i.parent_name,i.child_name,i.phone])));
    const id = list.items[0].id;
    const upd = await req(`/api/admin/applications/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'contacted', admin_note: "Qo'ng'iroq qilindi" }) });
    assert.equal((await upd.json()).status, 'contacted');
    const byPhone = await (await req('/api/admin/applications?q=90123')).json();
    assert.ok(byPhone.items.some((a) => a.id === id));
    const stats = await (await req('/api/admin/stats')).json();
    assert.ok(stats.total >= 2);
    assert.equal(stats.byStatus.contacted, 1);
    const csv = await (await req('/api/admin/applications.csv')).text();
    assert.match(csv, /Dilnoza Karimova/);
    assert.match(csv, /\+998 90 123 45 67/);
  });

  test('CSV neutralises spreadsheet formulas', async () => {
    db.prepare("INSERT INTO applications (parent_name, phone, child_name, grade) VALUES ('=HYPERLINK(\"x\")', '+998900000000', 'Y', '1-sinf')").run();
    const req = await login();
    const csv = await (await req('/api/admin/applications.csv')).text();
    assert.match(csv, /"'=HYPERLINK/);
  });

  test('news CRUD with image upload, image type is sniffed', async () => {
    const req = await login();
    const fd = new FormData();
    fd.append('title', 'Yangi kompyuter sinfi'); fd.append('body', 'Matn'); fd.append('published_at', '2026-11-20');
    fd.append('image', new Blob([JPEG], { type: 'image/jpeg' }), 'a.jpg');
    const created = await (await req('/api/admin/news', { method: 'POST', body: fd })).json();
    assert.match(created.image, /^\/uploads\/.+\.jpg$/);
    assert.equal((await fetch(base + created.image)).status, 200);

    const bad = new FormData();
    bad.append('title', 'Yomon fayl'); bad.append('image', new Blob(['<?php echo 1;'], { type: 'image/jpeg' }), 'x.jpg');
    assert.equal((await req('/api/admin/news', { method: 'POST', body: bad })).status, 400);

    const hide = new FormData(); hide.append('published', '0');
    await req(`/api/admin/news/${created.id}`, { method: 'PATCH', body: hide });
    const pub = await (await fetch(base + '/api/news?limit=50')).json();
    assert.ok(!pub.items.some((n) => n.id === created.id));

    assert.equal((await req(`/api/admin/news/${created.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await fetch(base + created.image)).status, 404);
  });

  test('telegram import adds unpublished posts once, with local images', async () => {
    const req = await login();
    const first = await (await req('/api/admin/import', { method: 'POST' })).json();
    assert.ok(first.added > 0, 'some posts imported');
    const again = await (await req('/api/admin/import', { method: 'POST' })).json();
    assert.equal(again.added, 0, 'import is idempotent');
    const tg = db.prepare("SELECT * FROM news WHERE source = 'telegram'").all();
    assert.ok(tg.every((n) => n.published === 0));
    assert.ok(tg.some((n) => n.image.startsWith('/uploads/tg-')));
  });

  test('password change invalidates old sessions', async () => {
    const req = await login();
    const res = await req('/api/admin/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current: 'test-password-123', next: 'new-password-456' }) });
    assert.equal(res.status, 200);
    assert.equal((await req('/api/admin/me')).status, 401);
    // restore for other tests
    const r2 = await post('/api/admin/login', { username: 'admin', password: 'new-password-456' });
    assert.equal(r2.status, 200);
  });
});

describe('importer parsing', () => {
  test('parses real channel HTML', () => {
    const posts = parseChannelHtml(FIXTURE, 'zafar_international_school');
    assert.ok(posts.length >= 15);
    const irn = posts.find((p) => p.id === 339);
    assert.ok(irn, 'post 339 present');
    assert.match(irn.text, /IRON Olimpiadasi/);
    assert.ok(irn.photo.startsWith('https://'));
  });

  test('builds clean titles', () => {
    assert.equal(titleFromText('🏆 ZIS Iqtidor Granti — g‘oliblar aniqlandi 🎉\n\n12 nafar'), 'ZIS Iqtidor Granti — g‘oliblar aniqlandi');
    assert.equal(titleFromText('❄️ ZIS | Qishki kun tartibi\n📅 Noyabr'), 'ZIS | Qishki kun tartibi');
  });
});
