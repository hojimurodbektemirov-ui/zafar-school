"""Ustozlar kartalari: ustozlar.json (loyiha ildizida) -> #tGrid ichiga, har bir til uchun.
Rasmlar: public/assets/teachers/<rasm>. Xato bo'lsa tushunarli o'zbekcha xabar bilan to'xtaydi."""
import json, os, html
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FILE = os.path.join(ROOT, 'ustozlar.json')
IMG_DIR = os.path.join(ROOT, 'public', 'assets', 'teachers')
CATS = {'boshl', 'til', 'math', 'it', 'sanat'}
FIELDS = ('lavozim', 'yutuq', 'yutuq_izoh', 'batafsil')

def fail(msg):
    raise SystemExit('\n❌ ustozlar.json: ' + msg + '\n')

def load():
    try:
        data = json.load(open(FILE, encoding='utf-8'))
    except json.JSONDecodeError as e:
        fail(f'{e.lineno}-qatorda yozuv xatosi (vergul, qo\'shtirnoq yoki qavsni tekshiring): {e.msg}')
    if not isinstance(data, list) or not data:
        fail('fayl [ ... ] ichida kamida bitta ustozdan iborat ro\'yxat bo\'lishi kerak')
    for n, t in enumerate(data, 1):
        who = t.get('ism') or f'{n}-ustoz'
        for k in ('ism', 'rasm', 'yonalish', 'uz'):
            if not t.get(k):
                fail(f'"{who}" uchun "{k}" yozilmagan')
        if t['yonalish'] not in CATS:
            fail(f'"{who}": yonalish faqat {", ".join(sorted(CATS))} bo\'lishi mumkin, siz "{t["yonalish"]}" yozdingiz')
        if not os.path.exists(os.path.join(IMG_DIR, t['rasm'])):
            fail(f'"{who}": rasm topilmadi — public/assets/teachers/{t["rasm"]} (fayl nomi harfma-harf bir xil bo\'lsin, katta-kichik harf ham)')
        for k in FIELDS:
            if not t['uz'].get(k):
                fail(f'"{who}": uz ichida "{k}" yozilmagan')
    return data

def cards(lang, button, translit):
    e = html.escape
    x_ = lambda v: html.escape(v, quote=False)
    out = []
    for t in load():
        uz = t['uz']; loc = t.get(lang) or {}
        def g(k):
            v = loc.get(k) if lang != 'uz' else None
            v = v if v else uz.get(k, '')
            return translit(v) if lang == 'uz' and isinstance(v, str) else v
        name = (loc.get('ism') if lang != 'uz' else None) or (translit(t['ism']) if lang == 'uz' else t['ism'])
        feats = (loc.get('fazilatlar') if lang != 'uz' else None) or uz.get('fazilatlar') or []
        if lang == 'uz':
            feats = [translit(x) for x in feats]
        link = f' data-link="{e(t["video"])}"' if t.get('video') else ''
        out.append(
            f'      <article class="tcard" data-cat="{e(t["yonalish"])}"{link}>\n'
            f'        <div class="t-cred"><b>{x_(g("yutuq"))}</b><span>{x_(g("yutuq_izoh"))}</span></div>\n'
            f'        <div class="t-who"><img src="assets/teachers/{e(t["rasm"])}" alt="{e(name)}" width="72" height="72" loading="lazy"><div><h3>{x_(name)}</h3><p class="role">{x_(g("lavozim"))}</p></div></div>\n'
            f'        <ul>{"".join("<li>" + x_(x) + "</li>" for x in feats)}</ul>\n'
            f'        <p class="t-bio" hidden>{x_(g("batafsil"))}</p>\n'
            f'        <button class="t-open" type="button">{x_(button)}</button>\n'
            f'      </article>')
    return '\n'.join(out)
