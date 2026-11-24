import fs from 'node:fs';
import path from 'node:path';
import { setMeta } from './db.js';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, k) => ENT[k]);

/** Parse the public channel preview page (t.me/s/<channel>) into posts. */
export function parseChannelHtml(html, channel) {
  const posts = [];
  const chunks = html.split('<div class="tgme_widget_message_wrap').slice(1);
  const idRe = new RegExp(`data-post="${channel}/(\\d+)"`);
  for (const b of chunks) {
    const id = idRe.exec(b)?.[1];
    if (!id) continue;
    const textHtml = /<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/.exec(b)?.[1] ?? '';
    const text = decode(textHtml.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).trim();
    const photo = /tgme_widget_message_photo_wrap[^"]*"[^>]*?background-image:url\('([^']+)'\)/.exec(b)?.[1]
      || /tgme_widget_message_video_thumb"[^>]*?background-image:url\('([^']+)'\)/.exec(b)?.[1] || '';
    const date = /<time datetime="([^"]+)"/.exec(b)?.[1]?.slice(0, 10) || '';
    posts.push({ id: Number(id), text, photo, date });
  }
  return posts;
}

/** Derive a short headline from a post's text. */
export function titleFromText(text) {
  const first = text.split('\n').map((l) => l.trim()).find((l) => l.replace(/[^\p{L}\p{N}]/gu, '').length >= 3) || '';
  let t = first.replace(/^[^\p{L}\p{N}"«“]+/u, '').replace(/[\s\p{Extended_Pictographic}️]+$/u, '').trim();
  if (t.length > 110) t = t.slice(0, 107).replace(/\s+\S*$/, '') + '…';
  return t;
}

/** Fetch the channel and insert posts that are not in the DB yet. */
export async function importChannel({ db, cfg, fetchImpl = globalThis.fetch, log = () => {} }) {
  const url = `https://t.me/s/${cfg.channel}`;
  const res = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; ZIS-site/1.0)' } });
  if (!res.ok) throw new Error(`Kanal sahifasi ochilmadi: HTTP ${res.status}`);
  const posts = parseChannelHtml(await res.text(), cfg.channel);

  const exists = db.prepare('SELECT 1 FROM news WHERE tg_post_id = ?');
  const insert = db.prepare(`INSERT INTO news (title, body, image, link, source, tg_post_id, published, published_at)
                             VALUES (?, ?, ?, ?, 'telegram', ?, ?, ?)`);
  fs.mkdirSync(cfg.uploadsDir, { recursive: true });

  let added = 0;
  for (const p of posts) {
    // Only posts with a picture and a real caption make good news cards.
    if (!p.photo || p.text.length < 60 || exists.get(p.id)) continue;
    const title = titleFromText(p.text);
    if (title.length < 3) continue;

    let image = '';
    try {
      const img = await fetchImpl(p.photo);
      const type = img.headers.get('content-type') || '';
      if (img.ok && type.startsWith('image/')) {
        const buf = Buffer.from(await img.arrayBuffer());
        if (buf.length < 8 * 1024 * 1024) {
          const name = `tg-${p.id}.jpg`;
          fs.writeFileSync(path.join(cfg.uploadsDir, name), buf);
          image = `/uploads/${name}`;
        }
      }
    } catch (e) {
      log(`Rasm yuklanmadi (post ${p.id}): ${e.message}`);
    }
    insert.run(title, p.text, image, `https://t.me/${cfg.channel}/${p.id}`, p.id,
      cfg.importAutoPublish ? 1 : 0, p.date || new Date().toISOString().slice(0, 10));
    added++;
  }
  setMeta(db, 'last_import', JSON.stringify({ at: new Date().toISOString(), scanned: posts.length, added }));
  return { scanned: posts.length, added };
}
