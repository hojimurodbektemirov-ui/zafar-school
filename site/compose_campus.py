"""One-off: build site/index.src.html in the Kampus (C) design, reusing content blocks from the old source."""
import re, os
from bs4 import BeautifulSoup
HERE=os.path.dirname(os.path.abspath(__file__))
old=BeautifulSoup(open(os.path.join(HERE,'index.d.src.html.bak'),encoding='utf-8').read(),'html.parser')
def take(sel, all_=False):
    r=old.select(sel)
    assert r, sel
    return r if all_ else r[0]
def clean(el):
    for b in el.select('.badge'): b.decompose()
    for x in [el]+el.find_all(True):
        if x.has_attr('class'):
            x['class']=[c for c in x['class'] if c not in ('reveal','spot')]
            if not x['class']: del x['class']
    return str(el)

head=old.head
title=str(head.title); metas=''.join(str(m) for m in head.find_all('meta'))
lang=clean(take('#lang'))
exam_cards=''.join(clean(c) for c in take('.exam-grid > article',True))
road=clean(take('.road'))
expert=clean(take('.expert'))
wins_titles={}
gal=take('#gallery figure',True)
gallery=''.join(clean(f) for f in gal[:7])
reels=''.join(clean(r) for r in take('#reels .reel',True))
posts=take('#news a.post',True)[:6]
news=''.join(clean(p) for p in posts)
news_more=clean(take('.news-more'))
teachers=''.join(clean(t) for t in take('.teachers > article',True))
perks=''
for p in take('.perk-grid .perk',True):
    perks+=f'<div class="perk">{p.h3}{p.p}</div>'
steps=clean(take('#qabul .steps'))
docs=clean(take('#qabul .docs'))
grant=take('#qabul .grant')
for e in grant.select('.eyebrow'): e.decompose()
grant=clean(grant)
chat=clean(take('.chat-grid'))
info=clean(take('.info'))
form=clean(take('form#apply'))
dialogs=clean(take('#lb'))+clean(take('#vb'))
mbar=clean(take('nav.mbar'))
footer=clean(take('footer'))
# achievements texts from the old bento tiles
t=take('.bento .tile',True)
def tile(i): return t[i]
win_rows=[('TOP-10',tile(0).h3,tile(0).p),('12',tile(1).h3,tile(1).p),('284',tile(2).h3,tile(2).p),('50+',tile(6).h3,tile(6).p)]
wins=''.join(f'<div class="win"><b>{b}</b><div>{h}{p}</div></div>' for b,h,p in win_rows)
also=''.join(f'<div>{tile(i).h3}{tile(i).p}</div>' for i in (3,4,5))
# focus texts from old pillars
pil=take('.pillars > article',True)
imgs=['assets/campus/it-xona-2.jpg','assets/campus/ingliz-darsi.jpg','assets/campus/bayroq.jpg']
alts=["Kompyuter sinfidagi IT darsi","Ingliz tili darsi","Davlat bayrog'i kuni"]
focus=''
for a,img,alt in zip(pil,imgs,alts):
    focus+=f'<article class="focus-item"><img src="{img}" alt="{alt}" loading="lazy">{a.h3}{a.p}{a.ul}</article>'
lede_pillars=clean(old.select_one('#yonalish p.lead')); h_pillars=clean(old.select_one('#yonalish h2'))
sat_h=clean(old.select_one('#sat-ap h2')); sat_p=clean(old.select_one('#sat-ap p.lead'))
wins_h=clean(old.select_one('#yutuqlar h2')); wins_p=clean(old.select_one('#yutuqlar p.lead'))
gal_h=clean(old.select_one('#lavhalar h2')); gal_p=clean(old.select_one('#lavhalar p.lead'))
news_h=clean(old.select_one('#yangiliklar h2')); news_p=clean(old.select_one('#yangiliklar p.lead'))
t_h=clean(old.select_one('#ustozlar h2')); t_p=clean(old.select_one('#ustozlar p.lead'))
perk_h=clean(old.select_one('.perks h2'))
q_h=clean(old.select_one('#qabul h2')); q_p=clean(old.select_one('#qabul p.lead'))
c_h=clean(old.select_one('#aloqa h2')); c_p=clean(old.select_one('#aloqa p.lead'))
reel_p=clean(old.select_one('.reels-head p.lead'))
css=open(os.path.join(HERE,'campus.css'),encoding='utf-8').read()

html=f'''<!doctype html>
<html lang="uz">
<head>
{metas}
{title}
<link rel="icon" href="assets/logo-256.jpg" type="image/jpeg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>

<header class="hdr" id="hdr">
  <div class="wrap">
    <a class="mark" href="#top" aria-label="Zafar International School — bosh sahifa"><img src="assets/logo-256.jpg" alt="Zafar International School logotipi" width="42" height="42"><span>Zafar International School</span></a>
    <nav class="menu" id="menu" aria-label="Asosiy menyu"><a href="#kun">Bir kun</a><a href="#talim">Ta'lim</a><a href="#sat-ap">SAT · AP</a><a href="#ustozlar">Ustozlar</a><a href="#qabul">Qabul</a><a href="#aloqa">Aloqa</a></nav>
    {lang}
    <a class="btn btn-green hdr-cta" href="#aloqa">Ariza qoldirish</a>
    <button class="burger" id="burger" type="button" aria-label="Menyuni ochish" aria-expanded="false" aria-controls="menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</header>

<section class="hero" id="top">
  <img class="hero-bg" src="assets/campus/sertifikatlar.jpg" alt="ZIS o'quvchilari sertifikatlarini ko'tarib turibdi">
  <div class="wrap">
    <div>
      <p class="hero-tag">2026–2027 o'quv yili: qabul ochiq</p>
      <h1>Kelajak shu yerda boshlanadi</h1>
      <p class="hero-lead">Oltinko'ldagi xalqaro maktab: IT, ingliz tili va SAT/AP. Pre-School va 1–8-sinflar.</p>
      <div class="cta"><a class="btn btn-green" href="#aloqa">Qabulga yozilish</a><a class="btn btn-glass" href="tel:+998781137773">78 113 77 73</a></div>
    </div>
    <button class="play" type="button" data-src="assets/videos/it-5sinf.mp4" data-link="https://t.me/zafar_international_school/154"><i aria-hidden="true"></i><span>IT darsini<br>videoda ko'ring</span></button>
  </div>
</section>

<div class="nums">
  <div class="wrap">
    <div><b>TOP-10</b><span>IRN imtihonida respublika bo'yicha 4-o'rin</span></div>
    <div><b>18</b><span>o'quvchi sinfda: har biriga alohida e'tibor</span></div>
    <div><b>800/800</b><span>SAT Math natijali mutaxassis</span></div>
    <div><b>100 mln</b><span>so'mlik iqtidor granti fondi</span></div>
  </div>
</div>

<section id="kun" style="padding-bottom:80px">
  <div class="wrap sec-head"><h2>ZIS'da bir kun</h2><p class="lede">Nonushtadan uyga ketguncha: har bir soat o'ylangan. Lentani yon tomonga suring.</p></div>
  <div class="strip">
    <figure class="moment"><img src="assets/campus/kirish.jpg" alt="" loading="lazy"><figcaption><time>08:25</time><span>Kutib olish va nonushta</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/doska.jpg" alt="" loading="lazy"><figcaption><time>08:30</time><span>Interaktiv darslar boshlanadi</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/it-xona.jpg" alt="" loading="lazy"><figcaption><time>IT</time><span>Kompyuter sinfi: mantiq va loyihalar</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/ingliz-darsi.jpg" alt="" loading="lazy"><figcaption><time>EN</time><span>Ingliz tili: speaking va listening</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/tushlik.jpg" alt="" loading="lazy"><figcaption><time>Tush</time><span>Muvozanatli issiq tushlik</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/sayohat.jpg" alt="" loading="lazy"><figcaption><time>Shanba</time><span>Sayohatlar, olimpiadalar va tadbirlar</span></figcaption></figure>
    <figure class="moment"><img src="assets/campus/ochilish.jpg" alt="" loading="lazy"><figcaption><time>16:00</time><span>Afternoon snack va uyga</span></figcaption></figure>
  </div>
</section>

<section id="talim" style="padding-top:30px">
  <div class="wrap">
    <div class="sec-head"><h2>Poydevordan yuqori sinflargacha</h2></div>
    <div class="split"><div class="pic"><img src="assets/campus/oquvchilar.jpg" alt="Pre-School o'quvchilari" loading="lazy"></div><div><span class="age">6 yosh</span><h3>Pre-School: poydevor yili</h3><p>Bir yilda bola 1-sinf davlat dasturini tugatadi va kuchli ingliz tili bilimiga ega bo'ladi. Guruhda 18 nafardan ortiq bola bo'lmaydi.</p></div></div>
    <div class="split"><div class="pic"><img src="assets/campus/sinfxona.jpg" alt="Boshlang'ich sinf darsi" loading="lazy"></div><div><span class="age">1–4-sinflar</span><h3>Tushunib o'qiydigan bolalar</h3><p>Tayyor javob berilmaydi: bola o'zi izlanadi va amalda sinab ko'radi. 22 yillik tajribali ustozlar har bir bolaning sur'atiga moslashadi.</p></div></div>
    <div class="split"><div class="pic"><img src="assets/campus/it-xona-2.jpg" alt="Yuqori sinf IT darsi" loading="lazy"></div><div><span class="age">5–8-sinflar</span><h3>IT, matematika va olimpiadalar</h3><p>Chuqurlashtirilgan IT, matematika va ingliz tili. 50 dan ortiq o'quvchi IRN olimpiadasida qatnashdi, 12 nafari iqtidor grantini yutdi.</p></div></div>
  </div>
</section>

<section class="focus" id="yonalish">
  <div class="wrap">
    <div class="sec-head">{h_pillars}{lede_pillars}</div>
    <div class="focus-grid">{focus}</div>
  </div>
</section>

<section class="dark" id="sat-ap">
  <div class="wrap">
    <div class="sec-head">{sat_h}{sat_p}</div>
    <div class="exam-grid">{exam_cards}</div>
    <div class="exam-card road-card"><h3>Tayyorgarlik yo'li</h3>{road}</div>
    {expert}
  </div>
</section>

<section id="yutuqlar">
  <div class="wrap wins">
    <div class="wins-photo"><img src="assets/photos/olimpiada-jamoa.jpg" alt="IRN olimpiadasi jamoasi" loading="lazy"></div>
    <div>
      {wins_h}{wins_p}
      <div style="margin-top:32px">{wins}</div>
      <div class="also">{also}</div>
    </div>
  </div>
</section>

<section style="background:var(--mist);padding-bottom:90px" id="video">
  <div class="wrap sec-head"><h2>Maktab hayoti videoda</h2>{reel_p}</div>
  <div class="reels" id="reels">{reels}</div>
</section>

<section id="lavhalar">
  <div class="wrap">
    <div class="sec-head">{gal_h}{gal_p}</div>
    <div class="gallery" id="gallery">{gallery}</div>
  </div>
</section>

<section id="yangiliklar" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head">{news_h}{news_p}</div>
    <div class="news" id="news">{news}</div>
    {news_more}
  </div>
</section>

<section id="ustozlar" style="border-top:1px solid var(--line)">
  <div class="wrap">
    <div class="sec-head">{t_h}{t_p}</div>
    <div class="teachers">{teachers}</div>
  </div>
</section>

<section class="perks">
  <div class="wrap">
    <div class="sec-head">{perk_h}</div>
    <div class="perk-grid">{perks}</div>
  </div>
</section>

<section id="qabul">
  <div class="wrap">
    <div class="sec-head">{q_h}{q_p}</div>
    {steps}
    {docs}
    {grant}
  </div>
</section>

<section class="chat-sec" id="savollar">
  {chat}
</section>

<section class="contact" id="aloqa">
  <img src="assets/campus/bayroq.jpg" alt="" loading="lazy">
  <div class="wrap">
    <div>{c_h}{c_p}{info}</div>
    {form}
  </div>
</section>

{dialogs}
{mbar}

{footer}

<script src="js/site.js" defer></script>
</body>
</html>
'''
open(os.path.join(HERE,'index.src.html'),'w',encoding='utf-8').write(html)
print('written', len(html))
