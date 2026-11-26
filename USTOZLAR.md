# Ustoz qo'shish yoki o'zgartirish

Hammasi GitHub saytining o'zida qilinadi, kompyuterga hech narsa o'rnatish shart emas.
O'zgarishni saqlaganingizdan 1–2 daqiqa o'tib sayt o'zi yangilanadi.

## 1. Rasmni yuklash
1. Repozitoriyda `public` → `assets` → `teachers` papkasiga kiring.
2. **Add file → Upload files**, rasmni tashlang, pastda **Commit changes**.
   - Fayl nomi lotincha, bo'sh joysiz: `dilnoza.jpg` (`Dilnoza Rasm.JPG` emas).
   - Rasm kvadrat bo'lsa yaxshi (masalan 600×600), yuz o'rtada.

## 2. Ma'lumotni yozish
1. Repozitoriy bosh sahifasida **`ustozlar.json`** faylini oching, qalamcha (✏️ Edit) ni bosing.
2. Oxirgi ustozning `}` qavsidan keyin **vergul** qo'yib, quyidagi namunani joylang:

```json
  {
    "ism": "Karimova Dilnoza",
    "rasm": "dilnoza.jpg",
    "yonalish": "til",
    "video": "https://t.me/zafar_international_school/123",
    "uz": {
      "lavozim": "Ingliz tili o'qituvchisi",
      "yutuq": "8.0",
      "yutuq_izoh": "IELTS · Speaking 8.5",
      "fazilatlar": ["6 yillik tajriba", "CEFR C1 sertifikati"],
      "batafsil": "Batafsil oynasida chiqadigan to'liq izoh."
    },
    "ru": { "lavozim": "Учитель английского языка" },
    "en": { "lavozim": "English teacher" }
  }
```
3. Pastda **Commit changes** ni bosing.

## Maydonlar
| Maydon | Nima yoziladi |
|---|---|
| `ism` | To'liq ism-familiya |
| `rasm` | 1-qadamda yuklangan fayl nomi, harfma-harf bir xil |
| `yonalish` | Saralash tugmasi: `boshl` (Boshlang'ich sinf), `til` (Tillar), `math` (Matematika va SAT), `sanat` (San'at) |
| `video` | Ixtiyoriy. Telegramdagi video tanishuv havolasi. Kerak bo'lmasa qatorni o'chiring |
| `yutuq` | Kartadagi katta yozuv: `7.5`, `800`, `22 yil` |
| `yutuq_izoh` | Katta yozuv ostidagi kichik matn |
| `fazilatlar` | 2 ta qisqa band, har biri qo'shtirnoqda, vergul bilan |
| `batafsil` | "Batafsil" bosilganda chiqadigan to'liq izoh |

- `ru` va `en` ixtiyoriy: yozilmagan maydon rus/ingliz sahifasida o'zbekcha chiqadi.
  Ismning tarjimasi kerak bo'lsa `"ism": "..."` ni ham shu yerga yozing.
- O'zbekchani eski yoki yangi alifboda yozsangiz ham bo'ladi, sayt yangi alifboga (Ş, Ç, Ğ, Ö) o'zi o'giradi.
- Ustozni olib tashlash: uning `{ ... }` blokini va oldidagi vergulni o'chiring.
- Tartib: faylda qaysi tartibda bo'lsa, saytda ham shunday chiqadi.

## Xato bo'lsa
Repozitoriyda **Actions** bo'limida qizil ❌ chiqadi, sayt esa eski holatida qoladi (buzilmaydi).
Qizil yozuvni ochsangiz, `❌ ustozlar.json: ...` deb nimani tuzatish kerakligi o'zbekcha yoziladi.
Ko'p uchraydigan xato — vergul tushib qolgan yoki ortiqcha qo'yilgan.
