/* Zafar International School — sayt skripti */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  const burger = document.getElementById('burger'), menu = document.getElementById('menu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));

  /* swapping word in headline */
  const words = ['kod','Python','HTML','algoritm','robot'];
  let wi = 0; const sw = document.getElementById('swap');
  if (!reduce) setInterval(() => { wi = (wi+1) % words.length; sw.textContent = words[wi]; }, 2200);

  /* terminal */
  const scripts = {
    about: [
      ['p','$ '],['k','zis --about\n'],
      ['c','# Zafar International School\n'],
      ['','motto   : '],['s','"Xalqaro ta\'limga milliy yondashuv"\n'],
      ['','ochilgan: '],['s','2026, Oltinko\'l\n'],
      ['','sinflar : '],['s','Pre-School, 1–8\n'],
      ['','fokus   : '],['s','["IT", "English", "Math"]\n'],
      ['','reyting : '],['s','IRN TOP-10 → 4-o\'rin 🏆\n']
    ],
    it: [
      ['p','$ '],['k','zis --it\n'],
      ['c','# 5-sinf IT darsidan\n'],
      ['k','for '],['','kun '],['k','in '],['s','maktab_yili'],['',':\n'],
      ['','    o\'rgan('],['s','"mantiq"'],['',")\n"],
      ['','    yarat('],['s','"loyiha"'],['',")\n"],
      ['','    sina('],['s','"olimpiada"'],['',")\n"],
      ['c','# → natija: kelajak kasbi ✓\n']
    ],
    english: [
      ['p','$ '],['k','zis --english\n'],
      ['c','# Real English Environment\n'],
      ['','> Hello! How was your day?\n'],
      ['s','< It was amazing, teacher!\n'],
      ['s','< We spoke with a professor from Canada.\n'],
      ['','instructor: '],['k','IELTS 7.5 · Speaking 8.5\n'],
      ['','partner   : '],['k','Andijon davlat chet tillari instituti\n']
    ],
    sat: [
      ['p','$ '],['k','zis --sat\n'],
      ['c','# SAT · AP tayyorlov\n'],
      ['','SAT     : '],['s','400–1600 (R&W + Math)\n'],
      ['','AP      : '],['s','1–5 ball, universitet krediti\n'],
      ['','reja    : '],['s','diagnostika → mock → imtihon\n'],
      ['','mentor  : '],['k','Baxriddin Davlatmurodov\n'],
      ['','natija  : '],['s','SAT Math 800/800 · 100 o\'quvchi 700+\n'],
      ['c','# → batafsil: #sat-ap bo\'limi\n']
    ],
    qabul: [
      ['p','$ '],['k','zis --qabul 2026-2027\n'],
      ['','[1] ariza        '],['s','✓ ochiq\n'],
      ['','[2] akademik test '],['s','3 imkoniyat\n'],
      ['','[3] suhbat       '],['s','ota-ona + bola\n'],
      ['','[4] shartnoma    '],['s','→ xush kelibsiz!\n'],
      ['c','# 📞 78 113 77 73 · @ZISaloqa\n']
    ]
  };
  const body = document.getElementById('termBody');
  let timer = null;
  function run(name){
    clearTimeout(timer); body.innerHTML = '';
    const parts = scripts[name]; let pi = 0, ci = 0, span = null;
    const cursor = document.createElement('span'); cursor.className = 'cursor';
    if (reduce){
      parts.forEach(([c,t]) => { const s = document.createElement('span'); if(c) s.className=c; s.textContent=t; body.appendChild(s); });
      body.appendChild(cursor); return;
    }
    body.appendChild(cursor);
    (function step(){
      if (pi >= parts.length) return;
      const [cls, txt] = parts[pi];
      if (ci === 0){ span = document.createElement('span'); if(cls) span.className = cls; body.insertBefore(span, cursor); }
      span.textContent += txt[ci++];
      if (ci >= txt.length){ pi++; ci = 0; }
      timer = setTimeout(step, txt[ci-1] === '\n' ? 120 : 16 + Math.random()*22);
    })();
  }
  document.querySelectorAll('#termCmds button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#termCmds button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); run(b.dataset.cmd);
  }));
  run('about');

  /* marquee */
  const mq = [['Knowledge','bilim'],['Future','kelajak'],['Code','kod'],['Victory','zafar'],['Dream','orzu'],['Teacher','ustoz'],['Friendship','do\'stlik'],['Algorithm','algoritm'],['SAT','universitet sari'],['AP','advanced placement']];
  const track = document.getElementById('marquee');
  const html = mq.map(([e,u]) => `<span>${e} <small>= ${u}</small> ✦</span>`).join('');
  track.innerHTML = html + html;


  /* ---------- photo fallback: show initials if an image is missing ---------- */
  document.querySelectorAll('img[data-fallback]').forEach(img=>{
    const swap=()=>{ const box=img.parentElement; box.classList.add('noimg'); box.dataset.initials=img.dataset.fallback; img.remove(); };
    if (img.complete && img.naturalWidth===0 && img.getAttribute('src')) swap(); else img.addEventListener('error',swap);
  });

  /* ---------- SAT calculator ---------- */
  const rw=document.getElementById('satRW'), mt=document.getElementById('satM');
  if (rw && mt){
    const gv=document.getElementById('gaugeVal'), tot=document.getElementById('satTotal'), lvl=document.getElementById('satLevel');
    const levels=[[1500,"<b>Juda kuchli natija</b>: dunyoning eng nufuzli universitetlari darajasi."],[1350,"<b>Kuchli natija</b>: ko'plab yetakchi universitetlar uchun raqobatbardosh."],[1150,"<b>Yaxshi natija</b>: tizimli tayyorgarlik bilan yanada oshirish mumkin."],[0,"<b>Boshlang'ich daraja</b>: diagnostika va poydevor bosqichidan boshlaymiz."]];
    const upd=()=>{ const a=+rw.value, b=+mt.value, t=a+b;
      document.getElementById('satRWv').textContent=a; document.getElementById('satMv').textContent=b;
      tot.textContent=t; gv.style.strokeDashoffset=String(100-((t-400)/1200)*100);
      lvl.innerHTML=levels.find(([min])=>t>=min)[1]; };
    rw.addEventListener('input',upd); mt.addEventListener('input',upd); upd();
  }

  /* ---------- AP score scale (official College Board descriptors) ---------- */
  const apBox=document.getElementById('apScale');
  if (apBox){
    const AP={5:["Extremely well qualified","Ko'plab universitetlar kredit beradi yoki fanni o'tkazadi."],4:["Very well qualified","Aksariyat universitetlar kredit beradi."],3:["Qualified","Ko'p universitetlarda kredit uchun yetarli."],2:["Possibly qualified","Kamdan-kam hollarda kredit beriladi."],1:["No recommendation","Kredit berilmaydi: qayta tayyorlanib topshirish mumkin."]};
    const desc=document.getElementById('apDesc');
    const pick=(n)=>{ apBox.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===String(n))));
      desc.innerHTML=`<b>${n} — ${AP[n][0]}.</b> ${AP[n][1]}`; };
    apBox.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.s))); pick(5);
  }

  /* ---------- consultation button pre-fills the form ---------- */
  document.querySelectorAll('[data-consult]').forEach(a=>a.addEventListener('click',()=>{
    const m=document.getElementById('message'); if (m && !m.value) m.value=a.dataset.consult;
    setTimeout(()=>document.getElementById('parent')?.focus({preventScroll:true}),600);
  }));

  /* ---------- spotlight hover on cards ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches){
    document.querySelectorAll('.spot').forEach(el=>el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect(); el.style.setProperty('--mx',(e.clientX-r.left)+'px'); el.style.setProperty('--my',(e.clientY-r.top)+'px');
    }));
  }

  /* ---------- scroll progress + back to top ---------- */
  const bar=document.getElementById('progress'), top=document.getElementById('toTop');
  const onScrollUi=()=>{ const h=document.documentElement.scrollHeight-innerHeight;
    if (bar) bar.style.width=(h>0? (scrollY/h)*100 : 0)+'%';
    if (top) top.classList.toggle('show', scrollY>innerHeight*1.2); };
  addEventListener('scroll',onScrollUi,{passive:true}); onScrollUi();
  top?.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));

  /* counters */
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const end = +e.target.dataset.count;
    if (reduce){ e.target.textContent = end; return; }
    const t0 = performance.now();
    (function tick(t){ const p = Math.min(1,(t-t0)/1200); e.target.textContent = Math.round(end*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(tick); })(t0);
  }), {threshold:.4});
  counters.forEach(c => cio.observe(c));

  /* reveal */
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); rio.unobserve(e.target); } }), {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(el => rio.observe(el));

  /* word of the day */
  const W = [
    ['Victory','/ˈvɪk.tər.i/','Zafar, g\'alaba','Every lesson is a small victory.'],
    ['Curious','/ˈkjʊə.ri.əs/','Qiziquvchan','Curious students ask great questions.'],
    ['Algorithm','/ˈæl.ɡə.rɪ.ðəm/','Algoritm','We wrote an algorithm to sort numbers.'],
    ['Confident','/ˈkɒn.fɪ.dənt/','O\'ziga ishongan','She is confident when she speaks English.'],
    ['Teamwork','/ˈtiːm.wɜːk/','Jamoaviy ish','Teamwork makes our projects better.'],
    ['Discover','/dɪˈskʌv.ər/','Kashf etmoq','Children discover answers themselves.'],
    ['Debug','/ˌdiːˈbʌɡ/','Xatoni tuzatmoq','Let\'s debug the code together.'],
    ['Grateful','/ˈɡreɪt.fəl/','Minnatdor','We are grateful to our teachers.']
  ];
  let w = new Date().getDate() % W.length;
  const flip = document.getElementById('flip');
  function showW(){
    const [en,ph,uz,ex] = W[w];
    wEn.textContent = en; wPh.textContent = ph; wUz.textContent = uz; wEx.textContent = '"' + ex + '"';
    wN.textContent = (w+1) + '/' + W.length; flip.classList.remove('on');
  }
  const toggle = () => flip.classList.toggle('on');
  flip.addEventListener('click', toggle);
  flip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); } });
  wPrev.addEventListener('click', () => { w = (w-1+W.length)%W.length; showW(); });
  wNext.addEventListener('click', () => { w = (w+1)%W.length; showW(); });
  showW();


  /* gallery filter + lightbox */
  const figs=[...document.querySelectorAll('#gallery figure')];
  document.querySelectorAll('#chips button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#chips button').forEach(x=>x.setAttribute('aria-pressed','false'));
    b.setAttribute('aria-pressed','true');
    figs.forEach(f=>f.classList.toggle('hide', b.dataset.f!=='all' && f.dataset.cat!==b.dataset.f));
  }));
  const lb=document.getElementById('lb'), lbImg=document.getElementById('lbImg'), lbCap=document.getElementById('lbCap'), lbLink=document.getElementById('lbLink');
  let cur=0;
  const visible=()=>figs.filter(f=>!f.classList.contains('hide'));
  function show(i){ const v=visible(); cur=(i+v.length)%v.length; const f=v[cur], im=f.querySelector('img');
    lbImg.src=im.src; lbImg.alt=im.alt; lbCap.textContent=f.querySelector('figcaption').firstChild.textContent; lbLink.href=f.dataset.link; }
  figs.forEach(f=>{ f.tabIndex=0; f.setAttribute('role','button');
    const open=()=>{ show(visible().indexOf(f)); lb.showModal(); };
    f.addEventListener('click',open); f.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();open();} }); });
  document.getElementById('lbClose').onclick=()=>lb.close();
  document.getElementById('lbPrev').onclick=()=>show(cur-1);
  document.getElementById('lbNext').onclick=()=>show(cur+1);
  lb.addEventListener('click',e=>{ if(e.target===lb) lb.close(); });
  lb.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft') show(cur-1); if(e.key==='ArrowRight') show(cur+1); });

  /* reels: play video in-page via Telegram embed */
  const vb=document.getElementById('vb'), vbVideo=document.getElementById('vbVideo');
  document.querySelectorAll('.reel').forEach(a=>a.addEventListener('click',()=>{
    vbVideo.poster=a.querySelector('img').src; vbVideo.src=a.dataset.src;
    document.getElementById('vbLink').href=a.dataset.link;
    document.getElementById('vbCap').textContent=a.querySelector('span').firstChild.textContent;
    vb.showModal(); vbVideo.play().catch(()=>{});
  }));
  const closeVb=()=>{ vb.close(); };
  vb.addEventListener('close',()=>{ vbVideo.pause(); vbVideo.removeAttribute('src'); vbVideo.load(); });
  document.getElementById('vbClose').onclick=closeVb;
  vb.addEventListener('click',e=>{ if(e.target===vb) closeVb(); });

  /* reels scroll */
  const reels=document.getElementById('reels');
  document.getElementById('rPrev').onclick=()=>reels.scrollBy({left:-400,behavior:reduce?'auto':'smooth'});
  document.getElementById('rNext').onclick=()=>reels.scrollBy({left:400,behavior:reduce?'auto':'smooth'});


  /* ---------- API integration ---------- */
  // When the page is served by the ZIS server, the form and news use the API.
  // Opened as a plain file (file://), it falls back to the Telegram flow and the static news cards.
  const API = location.protocol.startsWith('http') ? '' : null;

  /* news from the server */
  const newsEl = document.getElementById('news');
  const fmtDate = d => { const m=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktabr','noyabr','dekabr'];
    const [y,mo,da] = String(d).split('-').map(Number); return mo ? `${da}-${m[mo-1]}, ${y}` : ''; };
  function newsCard(n, feature){
    const a = document.createElement('a');
    a.className = 'post in' + (feature ? ' feature' : '');
    a.href = n.link || 'https://t.me/zafar_international_school'; a.target = '_blank'; a.rel = 'noopener';
    if (n.image){ const img = document.createElement('img'); img.src = n.image; img.alt = ''; img.loading = 'lazy'; a.appendChild(img); }
    const body = document.createElement('div'); body.className = 'body';
    const t = document.createElement('time'); t.dateTime = n.published_at; t.textContent = fmtDate(n.published_at);
    const h = document.createElement('h3'); h.textContent = n.title;
    const p = document.createElement('p'); const txt = String(n.body||'').replace(/\s+/g,' ').trim(); p.textContent = txt.length > 190 ? txt.slice(0,187).replace(/\s+\S*$/,'') + '…' : txt;
    const more = document.createElement('span'); more.className = 'more'; more.textContent = n.link ? "Batafsil →" : '';
    body.append(t, h, p, more); a.appendChild(body); return a;
  }
  if (API !== null && newsEl){
    fetch(API + '/api/news?limit=8').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.items || !d.items.length) return;
      newsEl.replaceChildren(...d.items.map((n,i) => newsCard(n, i === 0)));
    }).catch(() => {});
  }

  /* application form */
  const form = document.getElementById('apply'), ok = document.getElementById('ok'), btn = document.getElementById('applyBtn');
  if (API === null) document.getElementById('formNote').textContent = "Ariza matni nusxalanadi va @ZISaloqa Telegram chati ochiladi: uni u yerga joylab yuboring.";
  const showMsg = (text, isErr) => { ok.textContent = text; ok.classList.toggle('error', !!isErr); ok.classList.add('show'); };
  const setErrors = (errs) => form.querySelectorAll('.err').forEach(el => {
    const msg = errs[el.dataset.for] || ''; el.textContent = msg; el.closest('.field').classList.toggle('invalid', !!msg);
  });
  function localCheck(f){
    const errs = {};
    if (String(f.get('parent')||'').trim().length < 2) errs.parent = "Ota-ona ismini kiriting.";
    if (String(f.get('child')||'').trim().length < 2) errs.child = 'Farzand ismini kiriting.';
    const d = String(f.get('phone')||'').replace(/\D/g,'');
    if (!(d.length === 9 || (d.length === 12 && d.startsWith('998')))) errs.phone = "Telefon raqamini to'liq kiriting: +998 XX XXX XX XX.";
    return errs;
  }
  async function telegramFallback(f){
    const text = `Assalomu alaykum! Qabulga ariza:\nOta-ona: ${f.get('parent')}\nTelefon: ${f.get('phone')}\nFarzand: ${f.get('child')}\nSinf: ${f.get('grade')}` + (f.get('message') ? `\nIzoh: ${f.get('message')}` : '');
    try { await navigator.clipboard.writeText(text); } catch(_) {}
    showMsg("Ariza matni nusxalandi. Ochilgan @ZISaloqa chatiga joylab yuboring yoki 78 113 77 73 raqamiga qo'ng'iroq qiling.");
    window.open('https://t.me/ZISaloqa', '_blank', 'noopener');
  }
  form.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
    const el = form.querySelector(`.err[data-for="${i.name}"]`); if (el && el.textContent){ el.textContent=''; i.closest('.field').classList.remove('invalid'); }
  }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    const errs = localCheck(f); setErrors(errs);
    if (Object.keys(errs).length){ ok.classList.remove('show'); form.querySelector('.field.invalid input')?.focus(); return; }
    if (API === null) return telegramFallback(f);
    btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
    try {
      const res = await fetch(API + '/api/applications', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(Object.fromEntries(f)) });
      const data = await res.json().catch(() => ({}));
      if (res.ok){
        form.reset(); setErrors({});
        showMsg(`Rahmat! Arizangiz qabul qilindi${data.id ? ' (№ ' + data.id + ')' : ''}. Aloqa markazimiz tez orada siz bilan bog'lanadi.`);
      } else if ([404, 405, 501].includes(res.status)){
        await telegramFallback(f); // static hosting (e.g. GitHub Pages): no API server
      } else if (res.status === 400 && data.fields){ setErrors(data.fields); showMsg(data.error, true); }
      else showMsg(data.error || "Xatolik yuz berdi. Iltimos, 78 113 77 73 raqamiga qo'ng'iroq qiling.", true);
    } catch (_){
      await telegramFallback(f);
    } finally { btn.disabled = false; btn.textContent = 'Arizani yuborish'; }
  });
})();
