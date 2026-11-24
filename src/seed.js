import { getMeta, setMeta } from './db.js';

const T = 'https://t.me/zafar_international_school/';

// The curated news that were hard-coded on the static site; inserted once on first start.
const NEWS = [
  ['2026-11-13', "Respublika TOP-10 ichida 4-o'rin!", "IRN imtihonida yuqori natijalar uchun maktabimiz respublikaning eng kuchli 10 ta ta'lim muassasasi qatoridan joy oldi. IRON olimpiadasi tashkilotchilari g'oliblarni shaxsan taqdirlab, maktabga maxsus sovrin topshirdi.", 'irn-sovrin', 339, 1],
  ['2026-11-16', "Pre-School 0.4 guruhiga qabul ochildi", "Navbatda turgan 14 bolaning barchasiga o'rin bor. Guruh 18 nafar bilan cheklangan. Birinchi dars: 19-noyabr, 09:00.", 'preschool-04', 346, 0],
  ['2026-11-11', 'Maxsus maktab avtobusi keladi', "Konditsionerli avtobus, har bola alohida o'rinda, kamar bilan. Uzoqda yashovchilar va kichik sinflarga ustunlik.", 'maktab-avtobusi', 329, 0],
  ['2026-11-10', "Iqtidor granti: 12 g'olib aniqlandi", "100 mln so'mlik fond to'liq taqsimlandi. Bosh grant 8-sinf o'quvchisiga: 85,61 ball, o'qish butunlay bepul.", 'grant-rahmat', 328, 0],
  ['2026-11-01', 'Ominahon — xalqaro olimpiada finalisti', "NextGen xalqaro olimpiadasining hal qiluvchi bosqichi. G'olibni Avstraliyadagi finalga 100% grant kutadi.", 'ominahon-finalist', 284, 0],
  ['2026-10-17', "50 dan ortiq o'quvchi IRN olimpiadasida", "Maxsus tayyorgarlikdan so'ng o'quvchilarimiz olimpiadaga yo'l oldi. Natija: respublika bo'yicha 4-o'rin.", 'olimpiada-jamoa', 250, 0],
  ['2026-10-17', '"Art terapiya party" va sevimli ustoz', "Zulfiya nomidagi davlat mukofoti sovrindori, 17 yillik tajribali rassom Oygul Faziljanovna ota-onalar va bolalar bilan birga ijod qildi.", 'sanat-darsi-1', 254, 0],
  ['2026-10-13', "Har bir o'quvchiga termos sovg'a", "Sovuq kunlar boshlanishi bilan maktab barcha o'quvchilarga sifatli termos sovg'a qildi.", 'termos-sovga', 234, 0],
];

export function seedNews(db, cfg) {
  if (!cfg.seedNews || getMeta(db, 'seeded_news')) return 0;
  const ins = db.prepare(`INSERT OR IGNORE INTO news (title, body, image, link, source, tg_post_id, published, pinned, published_at)
                          VALUES (?, ?, ?, ?, 'seed', ?, 1, ?, ?)`);
  for (const [date, title, body, img, post, pinned] of NEWS) {
    ins.run(title, body, `/assets/photos/${img}.jpg`, T + post, post, pinned, date);
  }
  setMeta(db, 'seeded_news', '1');
  return NEWS.length;
}
