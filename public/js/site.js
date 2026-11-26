/* Zafar International School — sayt skripti (Kampus dizayni) */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = window.ZIS_T || {}; const LANG = T.lang || document.documentElement.lang || 'uz';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  /* ---------- header: transparent over the hero, solid after scrolling ---------- */
  const hdr = $('#hdr'), menu = $('#menu'), burger = $('#burger');
  const setSolid = () => hdr.classList.toggle('solid', scrollY > 40 || menu.classList.contains('open'));
  addEventListener('scroll', setSolid, {passive:true}); setSolid();
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open)); setSolid();
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); setSolid();
  }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { burger.click(); burger.focus(); } });

  /* ---------- photo fallback: initials instead of a broken image ---------- */
  $$('img[data-fallback]').forEach(img => {
    const swap = () => { const box = img.parentElement; box.classList.add('noimg'); box.dataset.initials = img.dataset.fallback; img.remove(); };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) swap(); else img.addEventListener('error', swap);
  });

  /* ---------- video player (hero button + reels) ---------- */
  const vb = $('#vb'), vbVideo = $('#vbVideo');
  $$('[data-src]').forEach(el => el.addEventListener('click', () => {
    const poster = el.querySelector('img')?.src || el.dataset.src.replace(/\.mp4$/, '.jpg');
    vbVideo.poster = poster; vbVideo.src = el.dataset.src;
    $('#vbLink').href = el.dataset.link || 'https://t.me/zafar_international_school';
    $('#vbCap').textContent = (el.querySelector('span')?.firstChild?.textContent || el.textContent).trim();
    vb.showModal(); vbVideo.play().catch(() => {});
  }));
  vb.addEventListener('close', () => { vbVideo.pause(); vbVideo.removeAttribute('src'); vbVideo.load(); });
  $('#vbClose').onclick = () => vb.close();
  vb.addEventListener('click', e => { if (e.target === vb) vb.close(); });

  /* ---------- gallery lightbox ---------- */
  const figs = $$('#gallery figure'), lb = $('#lb'), lbImg = $('#lbImg');
  let cur = 0;
  function show(i){
    cur = (i + figs.length) % figs.length; const f = figs[cur], im = f.querySelector('img');
    lbImg.src = im.src; lbImg.alt = im.alt;
    $('#lbCap').textContent = f.querySelector('figcaption').firstChild.textContent;
    $('#lbLink').href = f.dataset.link;
  }
  figs.forEach((f, i) => {
    f.tabIndex = 0; f.setAttribute('role', 'button');
    const open = () => { show(i); lb.showModal(); };
    f.addEventListener('click', open);
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  $('#lbClose').onclick = () => lb.close();
  $('#lbPrev').onclick = () => show(cur - 1);
  $('#lbNext').onclick = () => show(cur + 1);
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });

  /* ---------- SAT calculator ---------- */
  const rw = $('#satRW'), mt = $('#satM');
  if (rw && mt){
    const levels = [1500, 1350, 1150, 0].map((min, i) => [min, T.satLevels[i]]);
    const upd = () => {
      const a = +rw.value, b = +mt.value, t = a + b;
      $('#satRWv').textContent = a; $('#satMv').textContent = b; $('#satTotal').textContent = t;
      $('#gaugeVal').style.strokeDashoffset = String(100 - ((t - 400) / 1200) * 100);
      $('#satLevel').innerHTML = levels.find(([min]) => t >= min)[1];
    };
    rw.addEventListener('input', upd); mt.addEventListener('input', upd); upd();
  }

  /* ---------- AP score scale (College Board descriptors) ---------- */
  const apBox = $('#apScale');
  if (apBox){
    const AP = {};
    ['Extremely well qualified', 'Very well qualified', 'Qualified', 'Possibly qualified', 'No recommendation']
      .forEach((d, i) => { AP[5 - i] = [d, T.ap[i]]; });
    const pick = n => {
      apBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === String(n))));
      $('#apDesc').innerHTML = `<b>${n} — ${AP[n][0]}.</b> ${AP[n][1]}`;
    };
    apBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => pick(b.dataset.s)));
    pick(5);
  }

  /* ---------- consultation buttons pre-fill the form ---------- */
  $$('[data-consult]').forEach(a => a.addEventListener('click', () => {
    const m = $('#message'); if (m && !m.value) m.value = a.dataset.consult;
    setTimeout(() => $('#parent')?.focus({preventScroll:true}), 600);
  }));

  /* ---------- parents' questions as a Telegram-style chat ---------- */
  const qa = $('#qaData'), chips = $('#qChips'), chat = $('#chat');
  if (qa && chips && chat){
    const sec = qa.closest('.chat-sec'); sec.classList.add('js-chat');
    const pairs = [...qa.querySelectorAll('dt')].map(dt => [dt.textContent.trim(), dt.nextElementSibling.textContent.trim()]);
    const typingLabel = sec.querySelector('.typing-label')?.textContent || '';
    const now = () => new Date().toLocaleTimeString(LANG === 'en' ? 'en-GB' : LANG, {hour:'2-digit', minute:'2-digit'});
    chat.querySelectorAll('.msg').forEach(m => m.dataset.t = now());
    const add = (cls, text) => { const m = document.createElement('div'); m.className = 'msg ' + cls; m.textContent = text; m.dataset.t = now(); chat.appendChild(m); chat.scrollTop = chat.scrollHeight; };
    let busy = false;
    pairs.forEach(([q, a]) => {
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
  // Served by the ZIS server: news and the form use the API.
  // Opened as a file or on static hosting: static news cards and the Telegram fallback.
  const API = location.protocol.startsWith('http') ? '' : null;

  const fmtDate = d => { const m = T.months; const [y, mo, da] = String(d).split('-').map(Number); if (!mo) return '';
    return LANG === 'uz' ? `${da}-${m[mo-1]}, ${y}` : `${da} ${m[mo-1]} ${y}`; };
  // Server news are stored in the current Latin alphabet; the Uzbek page shows the improved one.
  const toNew = t => LANG !== 'uz' ? t : String(t)
    .replace(/([Oo])[‘’ʻʼ'`]/g, (m, o) => o === 'O' ? 'Ö' : 'ö').replace(/([Gg])[‘’ʻʼ'`]/g, (m, g) => g === 'G' ? 'Ğ' : 'ğ')
    .replace(/S[hH]/g, 'Ş').replace(/sh/g, 'ş').replace(/C[hH]/g, 'Ç').replace(/ch/g, 'ç');
  function newsCard(n, feature){
    const a = document.createElement('a');
    a.className = 'post' + (feature ? ' feature' : '');
    a.href = n.link || 'https://t.me/zafar_international_school'; a.target = '_blank'; a.rel = 'noopener';
    if (n.image){ const img = document.createElement('img'); img.src = n.image; img.alt = ''; img.loading = 'lazy'; a.appendChild(img); }
    const body = document.createElement('div'); body.className = 'body';
    const t = document.createElement('time'); t.dateTime = n.published_at; t.textContent = fmtDate(n.published_at);
    const h = document.createElement('h3'); h.textContent = toNew(n.title);
    const p = document.createElement('p'); const txt = String(n.body || '').replace(/\s+/g, ' ').trim();
    p.textContent = toNew(txt.length > 190 ? txt.slice(0, 187).replace(/\s+\S*$/, '') + '…' : txt);
    const more = document.createElement('span'); more.className = 'more'; more.textContent = n.link ? T.more : '';
    body.append(t, h, p, more); a.appendChild(body); return a;
  }
  const newsEl = $('#news');
  if (API !== null && newsEl && LANG === 'uz'){
    fetch(API + '/api/news?limit=6').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.items || !d.items.length) return;
      newsEl.replaceChildren(...d.items.map((n, i) => newsCard(n, i === 0)));
    }).catch(() => {});
  }

  /* ---------- application form ---------- */
  const form = $('#apply'), ok = $('#ok'), btn = $('#applyBtn'), F = T.form;
  if (API === null) $('#formNote').textContent = F.note;
  const showMsg = (text, isErr) => { ok.textContent = text; ok.classList.toggle('error', !!isErr); ok.classList.add('show'); };
  const setErrors = errs => form.querySelectorAll('.err').forEach(el => {
    const msg = errs[el.dataset.for] || ''; el.textContent = msg; el.closest('.field').classList.toggle('invalid', !!msg);
  });
  function localCheck(f){
    const errs = {};
    if (String(f.get('parent') || '').trim().length < 2) errs.parent = F.errParent;
    if (String(f.get('child') || '').trim().length < 2) errs.child = F.errChild;
    const d = String(f.get('phone') || '').replace(/\D/g, '');
    if (!(d.length === 9 || (d.length === 12 && d.startsWith('998')))) errs.phone = F.errPhone;
    return errs;
  }
  async function telegramFallback(f){
    const gradeLabel = form.querySelector('#grade option:checked')?.textContent || f.get('grade');
    const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
    const text = fill(F.fb, {parent:f.get('parent'), phone:f.get('phone'), child:f.get('child'), grade:gradeLabel})
      + (f.get('message') ? fill(F.fbNote, {note:f.get('message')}) : '');
    try { await navigator.clipboard.writeText(text); } catch(_) {}
    showMsg(F.fbDone);
    window.open('https://t.me/ZISaloqa', '_blank', 'noopener');
  }
  form.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
    const el = form.querySelector(`.err[data-for="${i.name}"]`);
    if (el && el.textContent){ el.textContent = ''; i.closest('.field').classList.remove('invalid'); }
  }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    const errs = localCheck(f); setErrors(errs);
    if (Object.keys(errs).length){ ok.classList.remove('show'); form.querySelector('.field.invalid input')?.focus(); return; }
    if (API === null) return telegramFallback(f);
    btn.disabled = true; btn.textContent = F.sending;
    try {
      const res = await fetch(API + '/api/applications', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(Object.fromEntries(f))});
      const data = await res.json().catch(() => ({}));
      if (res.ok){ form.reset(); setErrors({}); showMsg(F.ok.replace('{id}', data.id ? ' (№ ' + data.id + ')' : '')); }
      else if ([404, 405, 501].includes(res.status)) await telegramFallback(f); // static hosting, no API server
      else if (res.status === 400 && data.fields){
        const loc = {}; for (const k of Object.keys(data.fields)) loc[k] = {parent:F.errParent, child:F.errChild, phone:F.errPhone}[k] || data.fields[k];
        setErrors(loc); showMsg(F.check, true);
      } else showMsg(LANG === 'uz' && data.error ? data.error : F.err, true);
    } catch(_){ await telegramFallback(f); }
    finally { btn.disabled = false; btn.textContent = F.submit; }
  });
})();
