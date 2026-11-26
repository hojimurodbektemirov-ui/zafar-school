# Zafar International School — sayt va backend

Maktab sayti, qabul arizalari, admin panel va Telegram integratsiyasi bitta loyihada.

## Nimalar bor

| Qism | Vazifasi |
|---|---|
| **Sayt** (`/`) | Bosh sahifa, galereya, videolar, yangiliklar, ariza formasi |
| **Ariza API** | Forma ma'lumotini tekshiradi, bazaga yozadi, Telegram'ga darhol xabar yuboradi |
| **Admin panel** (`/admin`) | Arizalar (holat, izoh, qidiruv, filtr, CSV/Excel), yangiliklar (qo'shish, rasm, yashirish, mahkamlash), statistika |
| **Telegram import** | `@zafar_international_school` kanalidagi yangi rasmli postlarni avtomatik yangilik qilib oladi |
| **Xavfsizlik** | Parol xeshlash (bcrypt), HttpOnly cookie, CSRF himoyasi, spam-bot tuzog'i, so'rovlar limiti, CSP sarlavhalari, rasm turini tekshirish |

Ariza holatlari: **Yangi → Bog'lanildi → Imtihonga chaqirildi → Qabul qilindi / Rad etildi**.

## Tez ishga tushirish (kompyuterda)

Kerak: **Node.js 22.5 yoki undan yangi** (https://nodejs.org).

```bash
npm install
cp .env.example .env      # keyin .env ni to'ldiring
npm start
```

Sayt: http://localhost:3000, admin panel: http://localhost:3000/admin.

> Mahalliy sinov uchun `.env` da `NODE_ENV=development` qilib qo'ysangiz, `SESSION_SECRET` va `ADMIN_PASSWORD` majburiy bo'lmaydi.
> Parol berilmasa, server birinchi ishga tushganda tasodifiy parol yaratib, konsolga chiqaradi.

## Uch til: O'zbek (yangi alifbo), Русский, English

Sayt uch sahifadan iborat: `public/index.html` (o'zbekcha, takomillashgan lotin alifbosida: Ö, Ğ, Ş, Ç),
`public/ru.html` va `public/en.html`. Ular **qo'lda tahrirlanmaydi**, bitta manbadan yig'iladi:

| Fayl | Nima uchun |
|---|---|
| `site/index.src.html` | Sahifaning yagona manbasi (o'zbekcha, odatiy lotin yozuvida yoziladi) |
| `site/i18n.json` | Har bir matn bo'lagining ruscha va inglizcha tarjimasi |
| `site/strings.py` | JavaScript ichidagi matnlar (terminal, SAT/AP, forma xabarlari) |
| `site/build_i18n.py` | Uch sahifani yig'adi; o'zbekchani avtomatik yangi alifboga o'giradi |

Matnni o'zgartirish tartibi:

```bash
pip install beautifulsoup4          # bir marta
python3 site/extract.py             # tarjimasi yo'q bo'laklar site/todo.json ga yoziladi
python3 site/build_i18n.py          # tarjima yetishmasa yoki HTML teglari mos kelmasa, xato bilan to'xtaydi
```

Yangi alifbo qoidasi: `O‘o‘ → Öö`, `G‘g‘ → Ğğ`, `Sh → Ş`, `Ch → Ç`. Inglizcha so'zlar (English, School, Speaking...)
va havolalar o'zgarmaydi; istisnolar ro'yxati `site/i18n_core.py` dagi `KEEP` to'plamida.

## Telegram botni ulash (arizalar Telegram'ga kelishi uchun)

1. Telegramda **@BotFather** ga `/newbot` yozing, bot yarating va **tokenni** oling.
2. Botni arizalar keladigan guruhga (masalan, qabul bo'limi guruhi) qo'shing va guruhga istalgan xabar yozing.
3. Brauzerda `https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching va `"chat":{"id":-100...}` raqamini toping.
4. `.env` ga yozing:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=-100xxxxxxxxxx
   ```
5. Serverni qayta ishga tushiring. Admin panel → **Sozlamalar** → **Test xabar yuborish**.

## Serverga joylash (hosting)

### Variant A: Docker (tavsiya)

```bash
cp .env.example .env          # to'ldiring
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d --build
```

### Variant B: oddiy VPS (Ubuntu)

```bash
npm ci --omit=dev
npm install -g pm2
pm2 start "npm start" --name zis && pm2 save && pm2 startup
```

So'ng **nginx** + **Let's Encrypt** (HTTPS) orqali domenni `localhost:3000` ga yo'naltiring va `.env` da `TRUST_PROXY=true` qiling.
HTTPS majburiy: admin cookie faqat HTTPS orqali ishlaydi (`COOKIE_SECURE=true`). HTTPS hali bo'lmasa, vaqtincha `COOKIE_SECURE=false`.

Namuna nginx sozlamasi:

```nginx
server {
  server_name zafarschool.uz;
  client_max_body_size 6m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
```

## Zaxira nusxa (backup)

Barcha ma'lumot `data/` papkasida: `zis.db` (baza) va `uploads/` (rasmlar). Shu papkani muntazam nusxalang, masalan har kecha:

```bash
sqlite3 data/zis.db ".backup data/backup-$(date +%F).db"
```

## Foydali buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Serverni ishga tushirish |
| `npm run dev` | Kod o'zgarganda avtomatik qayta yuklanadigan rejim |
| `npm test` | Avtomatik testlar (16 ta) |
| `npm run reset-password -- admin YangiParol123` | Admin parolini tiklash (parol unutilganda) |
| `python3 site/build_i18n.py` | Uch tilli sahifalarni qayta yig'ish |
| `python3 build.py` | Serversiz ko'rish uchun bitta `zafar-school.html` fayl yaratish (o'zbekcha) |

## Loyiha tuzilmasi

```
src/            server kodi
  index.js        ishga tushirish, import jadvali
  app.js          Express, xavfsizlik sarlavhalari
  routes/         public.js (sayt API), admin.js (admin API)
  importer.js     Telegram kanal importi
  telegram.js     Bot API orqali xabar yuborish
site/           sahifa manbasi va tarjimalar (index.src.html, i18n.json, strings.py)
public/         yig'ilgan sayt (index.html, ru.html, en.html, js/, assets/, admin/)
test/           avtomatik testlar
data/           baza va yuklangan rasmlar (gitga kirmaydi)
```

## API qisqacha

- `GET /api/news?limit=8` — saytdagi yangiliklar
- `POST /api/applications` — `{ parent, phone, child, grade, message }`
- `/api/admin/*` — faqat tizimga kirgan admin uchun (cookie + `X-ZIS-CSRF: 1` sarlavhasi)
