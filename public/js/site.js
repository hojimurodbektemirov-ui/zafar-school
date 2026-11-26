/* Zafar International School — sayt skripti */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = window.ZIS_T || {}; const LANG = T.lang || document.documentElement.lang || 'uz';

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
  const words = T.swap;
  let wi = 0; const sw = document.getElementById('swap');
  if (!reduce) setInterval(() => { wi = (wi+1) % words.length; sw.textContent = words[wi]; }, 2200);

  /* terminal */
  const scripts = T.term;
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
  const mqEn = ['Knowledge','Future','Code','Victory','Dream','Teacher','Friendship','Algorithm','SAT','AP'];
  const mq = mqEn.map((e,i) => [e, T.marquee[i]]);
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
    const levels=[1500,1350,1150,0].map((min,i)=>[min,T.satLevels[i]]);
    const upd=()=>{ const a=+rw.value, b=+mt.value, t=a+b;
      document.getElementById('satRWv').textContent=a; document.getElementById('satMv').textContent=b;
      tot.textContent=t; gv.style.strokeDashoffset=String(100-((t-400)/1200)*100);
      lvl.innerHTML=levels.find(([min])=>t>=min)[1]; };
    rw.addEventListener('input',upd); mt.addEventListener('input',upd); upd();
  }

  /* ---------- AP score scale (official College Board descriptors) ---------- */
  const apBox=document.getElementById('apScale');
  if (apBox){
    const AP={}; ['Extremely well qualified','Very well qualified','Qualified','Possibly qualified','No recommendation'].forEach((d,i)=>{ AP[5-i]=[d,T.ap[i]]; });
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
    ['Victory','/ˈvɪk.tər.i/','Every lesson is a small victory.'],
    ['Curious','/ˈkjʊə.ri.əs/','Curious students ask great questions.'],
    ['Algorithm','/ˈæl.ɡə.rɪ.ðəm/','We wrote an algorithm to sort numbers.'],
    ['Confident','/ˈkɒn.fɪ.dənt/','She is confident when she speaks English.'],
    ['Teamwork','/ˈtiːm.wɜːk/','Teamwork makes our projects better.'],
    ['Discover','/dɪˈskʌv.ər/','Children discover answers themselves.'],
    ['Debug','/ˌdiːˈbʌɡ/','Let\'s debug the code together.'],
    ['Grateful','/ˈɡreɪt.fəl/','We are grateful to our teachers.']
  ].map((r,i) => [r[0], r[1], T.wotd[i], r[2]]);
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



  /* ---------- questions as a Telegram-style chat ---------- */
  const qa = document.getElementById('qaData'), chips = document.getElementById('qChips'), chat = document.getElementById('chat');
  if (qa && chips && chat){
    const sec = qa.closest('.chat-sec'); sec.classList.add('js-chat');
    const pairs = [...qa.querySelectorAll('dt')].map(dt => [dt.textContent.trim(), dt.nextElementSibling.textContent.trim()]);
    const typingLabel = sec.querySelector('.typing-label')?.textContent || '';
    const now = () => new Date().toLocaleTimeString(LANG==='en'?'en-GB':LANG, {hour:'2-digit', minute:'2-digit'});
    chat.querySelectorAll('.msg').forEach(m => m.dataset.t = now());
    const add = (cls, text) => { const m = document.createElement('div'); m.className = 'msg ' + cls; m.textContent = text; m.dataset.t = now(); chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m; };
    let busy = false;
    pairs.forEach(([q, a], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        if (busy) return; busy = true;
        chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        add('out', q);
        if (reduce){ add('in', a); busy = false; return; }
        const t = document.createElement('div'); t.className = 'msg in typing'; t.setAttribute('aria-label', typingLabel);
        t.innerHTML = '<i></i><i></i><i></i>'; chat.appendChild(t); chat.scrollTop = chat.scrollHeight;
        setTimeout(() => { t.remove(); add('in', a); busy = false; }, 650 + Math.min(1200, a.length * 6));
      });
      chips.appendChild(b);
    });
  }

  /* ---------- API integration ---------- */
  // When the page is served by the ZIS server, the form and news use the API.
  // Opened as a plain file (file://), it falls back to the Telegram flow and the static news cards.
  const API = location.protocol.startsWith('http') ? '' : null;

  /* news from the server */
  const newsEl = document.getElementById('news');
  const fmtDate = d => { const m=T.months; const [y,mo,da] = String(d).split('-').map(Number); if (!mo) return '';
    return LANG==='uz' ? `${da}-${m[mo-1]}, ${y}` : `${da} ${m[mo-1]} ${y}`; };
  // Server news are stored in the current Latin alphabet; show them in the improved one on the Uzbek page.
  const toNew = t => LANG!=='uz' ? t : String(t)
    .replace(/([Oo])[‘’ʻʼ'`]/g,(m,o)=>o==='O'?'Ö':'ö').replace(/([Gg])[‘’ʻʼ'`]/g,(m,g)=>g==='G'?'Ğ':'ğ')
    .replace(/SH/g,'Ş').replace(/S[hH]/g,'Ş').replace(/sh/g,'ş').replace(/CH/g,'Ç').replace(/C[hH]/g,'Ç').replace(/ch/g,'ç');
  function newsCard(n, feature){
    const a = document.createElement('a');
    a.className = 'post in' + (feature ? ' feature' : '');
    a.href = n.link || 'https://t.me/zafar_international_school'; a.target = '_blank'; a.rel = 'noopener';
    if (n.image){ const img = document.createElement('img'); img.src = n.image; img.alt = ''; img.loading = 'lazy'; a.appendChild(img); }
    const body = document.createElement('div'); body.className = 'body';
    const t = document.createElement('time'); t.dateTime = n.published_at; t.textContent = fmtDate(n.published_at);
    const h = document.createElement('h3'); h.textContent = toNew(n.title);
    const p = document.createElement('p'); const txt = String(n.body||'').replace(/\s+/g,' ').trim(); p.textContent = toNew(txt.length > 190 ? txt.slice(0,187).replace(/\s+\S*$/,'') + '…' : txt);
    const more = document.createElement('span'); more.className = 'more'; more.textContent = n.link ? T.more : '';
    body.append(t, h, p, more); a.appendChild(body); return a;
  }
  if (API !== null && newsEl && LANG === 'uz'){
    fetch(API + '/api/news?limit=8').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.items || !d.items.length) return;
      newsEl.replaceChildren(...d.items.map((n,i) => newsCard(n, i === 0)));
    }).catch(() => {});
  }

  /* application form */
  const form = document.getElementById('apply'), ok = document.getElementById('ok'), btn = document.getElementById('applyBtn');
  const F = T.form;
  if (API === null) document.getElementById('formNote').textContent = F.note;
  const showMsg = (text, isErr) => { ok.textContent = text; ok.classList.toggle('error', !!isErr); ok.classList.add('show'); };
  const setErrors = (errs) => form.querySelectorAll('.err').forEach(el => {
    const msg = errs[el.dataset.for] || ''; el.textContent = msg; el.closest('.field').classList.toggle('invalid', !!msg);
  });
  function localCheck(f){
    const errs = {};
    if (String(f.get('parent')||'').trim().length < 2) errs.parent = F.errParent;
    if (String(f.get('child')||'').trim().length < 2) errs.child = F.errChild;
    const d = String(f.get('phone')||'').replace(/\D/g,'');
    if (!(d.length === 9 || (d.length === 12 && d.startsWith('998')))) errs.phone = F.errPhone;
    return errs;
  }
  async function telegramFallback(f){
    const gradeLabel = form.querySelector('#grade option:checked')?.textContent || f.get('grade');
    const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
    const text = fill(F.fb, {parent:f.get('parent'), phone:f.get('phone'), child:f.get('child'), grade:gradeLabel}) + (f.get('message') ? fill(F.fbNote, {note:f.get('message')}) : '');
    try { await navigator.clipboard.writeText(text); } catch(_) {}
    showMsg(F.fbDone);
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
    btn.disabled = true; btn.textContent = F.sending;
    try {
      const res = await fetch(API + '/api/applications', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(Object.fromEntries(f)) });
      const data = await res.json().catch(() => ({}));
      if (res.ok){
        form.reset(); setErrors({});
        showMsg(F.ok.replace('{id}', data.id ? ' (№ ' + data.id + ')' : ''));
      } else if ([404, 405, 501].includes(res.status)){
        await telegramFallback(f); // static hosting (e.g. GitHub Pages): no API server
      } else if (res.status === 400 && data.fields){ const loc={}; for (const k of Object.keys(data.fields)) loc[k] = {parent:F.errParent, child:F.errChild, phone:F.errPhone}[k] || data.fields[k]; setErrors(loc); showMsg(F.check, true); }
      else showMsg(LANG==='uz' && data.error ? data.error : F.err, true);
    } catch (_){
      await telegramFallback(f);
    } finally { btn.disabled = false; btn.textContent = F.submit; }
  });
})();
