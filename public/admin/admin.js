/* ZIS admin panel — vanilla JS, no build step. All user data is rendered with textContent. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
    return el;
  };

  const STATUS = { new: 'Yangi', contacted: "Bog'lanildi", exam: 'Imtihonga chaqirildi', accepted: 'Qabul qilindi', rejected: 'Rad etildi' };
  const GRADES = ['Pre-School (0-sinf)', '1-sinf', '2-sinf', '3-sinf', '4-sinf', '5-sinf', '6-sinf', '7-sinf', '8-sinf'];

  const tz = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtDateTime = (utc) => { const d = new Date(String(utc).replace(' ', 'T') + 'Z'); return isNaN(d) ? utc : tz.format(d).replace(',', ''); };
  const fmtPhone = (p) => { const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(p); return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p; };
  const plural = (n, w) => `${n} ta ${w}`;

  function toast(msg, err) {
    const t = h('div', { class: 'toast' + (err ? ' err' : ''), text: msg });
    $('#toasts').append(t);
    setTimeout(() => t.remove(), err ? 6000 : 3500);
  }

  async function api(path, { method = 'GET', body, form } = {}) {
    const opts = { method, credentials: 'same-origin', headers: { 'x-zis-csrf': '1' } };
    if (form) opts.body = form;
    else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
    const res = await fetch('/api/admin' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/login') { showLogin(); throw new Error(data.error || 'Sessiya tugadi.'); }
    if (!res.ok) { const e = new Error(data.error || `Xatolik (${res.status})`); e.fields = data.fields; throw e; }
    return data;
  }

  /* ---------------- auth ---------------- */
  function showLogin() { $('#appView').hidden = true; $('#loginView').hidden = false; $('#loginForm [name=username]').focus(); }
  function showApp(username) { $('#loginView').hidden = true; $('#appView').hidden = false; $('#whoami').textContent = username; go(location.hash.slice(1) || 'dashboard'); }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target); const btn = $('button[type=submit]', e.target);
    btn.disabled = true; $('#loginError').textContent = '';
    try { const r = await api('/login', { method: 'POST', body: Object.fromEntries(f) }); e.target.reset(); showApp(r.username); }
    catch (err) { $('#loginError').textContent = err.message; }
    finally { btn.disabled = false; }
  });
  $('#logoutBtn').addEventListener('click', async () => { await api('/logout', { method: 'POST' }).catch(() => {}); showLogin(); });

  /* ---------------- navigation ---------------- */
  const loaders = {};
  function go(view) {
    if (!loaders[view]) view = 'dashboard';
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + view; });
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    loaders[view]();
  }
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));

  /* ---------------- dashboard ---------------- */
  let lastStats = null;
  loaders.dashboard = async () => {
    const s = lastStats = await api('/stats');
    const badge = $('#newBadge'); badge.hidden = !s.byStatus.new; badge.textContent = s.byStatus.new;
    $('#kpis').replaceChildren(
      h('div', { class: 'kpi hl' }, h('b', { text: s.byStatus.new }), h('span', { text: "Yangi (ko'rilmagan)" })),
      h('div', { class: 'kpi' }, h('b', { text: s.today }), h('span', { text: 'Bugun' })),
      h('div', { class: 'kpi' }, h('b', { text: s.week }), h('span', { text: 'Oxirgi 7 kun' })),
      h('div', { class: 'kpi' }, h('b', { text: s.total }), h('span', { text: 'Jami arizalar' })),
    );
    // 14-day chart with empty days filled in
    const days = []; const map = Object.fromEntries(s.daily.map((d) => [d.d, d.n]));
    for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, map[d] || 0]); }
    const max = Math.max(1, ...days.map((d) => d[1]));
    $('#dailyChart').replaceChildren(...days.map(([d, n]) => h('div', { class: 'bar', title: `${d}: ${n}` },
      n ? h('em', { text: n }) : null, h('i', { style: `height:${(n / max) * 100}%` }), h('small', { text: d.slice(8) }))));
    const hbars = (rows) => { const m = Math.max(1, ...rows.map((r) => r[1]));
      return rows.map(([label, n]) => h('div', { class: 'hbar' }, h('span', { text: label }), h('div', { class: 'track' }, h('i', { style: `width:${(n / m) * 100}%` })), h('b', { text: n }))); };
    $('#statusBreak').replaceChildren(...hbars(Object.entries(s.byStatus).map(([k, n]) => [STATUS[k], n])));
    $('#gradeBreak').replaceChildren(...(s.byGrade.length ? hbars(s.byGrade.map((g) => [g.grade, g.n])) : [h('p', { class: 'muted', text: "Hali ariza yo'q." })]));
    const t = s.telegram; const li = t.lastImport;
    $('#tgStatus').replaceChildren(
      h('p', {}, h('span', { class: 'st ' + (t.configured ? 'st-accepted' : 'st-new'), text: t.configured ? 'Xabarnomalar yoqilgan' : "Xabarnomalar o'chiq" })),
      h('p', { class: 'muted', text: t.configured ? 'Har bir yangi ariza Telegram chatga darhol yuboriladi.' : ".env faylida TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID ni to'ldiring." }),
      h('p', { class: 'muted', text: `Kanal: @${t.channel}. Import: ${t.importIntervalMin > 0 ? `har ${t.importIntervalMin} daqiqada` : "o'chiq"}.` + (li ? ` Oxirgi: ${fmtDateTime(li.at.slice(0, 19).replace('T', ' '))}, ${li.added} ta yangi.` : '') }),
      h('p', { class: 'muted', text: `Yangiliklar: ${s.news.published} ta saytda, ${s.news.hidden} ta yashirin.` }),
    );
  };

  /* ---------------- applications ---------------- */
  const appState = { page: 1, q: '', status: '', grade: '', open: new Set() };
  for (const [k, v] of Object.entries(STATUS)) $('#appStatus').append(h('option', { value: k, text: v }));
  for (const g of GRADES) $('#appGrade').append(h('option', { value: g, text: g }));
  const appQs = () => new URLSearchParams(Object.entries({ q: appState.q, status: appState.status, grade: appState.grade }).filter(([, v]) => v)).toString();

  let searchTimer;
  $('#appSearch').addEventListener('input', (e) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { appState.q = e.target.value.trim(); appState.page = 1; loaders.applications(); }, 300); });
  $('#appStatus').addEventListener('change', (e) => { appState.status = e.target.value; appState.page = 1; loaders.applications(); });
  $('#appGrade').addEventListener('change', (e) => { appState.grade = e.target.value; appState.page = 1; loaders.applications(); });

  function statusSelect(a) {
    const sel = h('select', { class: 'status st-' + a.status, 'aria-label': 'Holat' },
      ...Object.entries(STATUS).map(([k, v]) => h('option', { value: k, text: v, selected: k === a.status })));
    sel.addEventListener('change', async () => {
      try {
        const u = await api(`/applications/${a.id}`, { method: 'PATCH', body: { status: sel.value } });
        Object.assign(a, u); sel.className = 'status st-' + u.status; sel.closest('tr').classList.toggle('is-new', u.status === 'new');
        toast(`#${a.id}: ${STATUS[u.status]}`); refreshBadge();
      } catch (e) { toast(e.message, true); sel.value = a.status; }
    });
    return sel;
  }

  function detailRow(a) {
    const ta = h('textarea', { 'aria-label': 'Admin izohi', placeholder: "Ichki izoh: qachon qo'ng'iroq qilindi, natija..." }); ta.value = a.admin_note || '';
    const save = h('button', { class: 'btn primary small', text: 'Izohni saqlash', onclick: async () => {
      try { const u = await api(`/applications/${a.id}`, { method: 'PATCH', body: { admin_note: ta.value } }); a.admin_note = u.admin_note; toast('Izoh saqlandi'); }
      catch (e) { toast(e.message, true); } } });
    const del = h('button', { class: 'btn danger small', text: "O'chirish", onclick: async () => {
      if (!confirm(`#${a.id} arizani (${a.parent_name}) butunlay o'chirasizmi?`)) return;
      try { await api(`/applications/${a.id}`, { method: 'DELETE' }); toast("Ariza o'chirildi"); appState.open.delete(a.id); loaders.applications(); refreshBadge(); }
      catch (e) { toast(e.message, true); } } });
    return h('tr', { class: 'detail' }, h('td', { colspan: 8 }, h('div', { class: 'detail-box' },
      a.message ? h('p', {}, h('b', { text: "Ota-ona izohi: " }), a.message) : h('p', { class: 'muted small', text: "Ota-ona izoh qoldirmagan." }),
      h('p', { class: 'muted small', text: `Telegram xabari: ${a.notified ? 'yuborilgan' : 'yuborilmagan'} · Yangilangan: ${fmtDateTime(a.updated_at)}` }),
      ta, h('div', { class: 'row' }, save, h('a', { class: 'btn ghost small', href: `tel:${a.phone}`, text: "Qo'ng'iroq qilish" }), del))));
  }

  loaders.applications = async () => {
    const qs = appQs();
    $('#csvLink').href = '/api/admin/applications.csv' + (qs ? '?' + qs : '');
    const d = await api(`/applications?page=${appState.page}&per=25${qs ? '&' + qs : ''}`);
    $('#appCount').textContent = `${plural(d.total, 'ariza')} topildi`;
    const tbody = $('#appTable tbody'); tbody.replaceChildren();
    $('#appTable').hidden = !d.items.length;
    $('#appEmpty').hidden = !!d.items.length;
    $('#appEmpty').textContent = appState.q || appState.status || appState.grade ? "Bu filtr bo'yicha ariza topilmadi. Filtrni o'zgartiring." : "Hali ariza kelmagan. Saytdagi forma orqali kelgan arizalar shu yerda chiqadi.";
    for (const a of d.items) {
      const toggle = h('button', { class: 'icon-btn', title: 'Batafsil', 'aria-expanded': String(appState.open.has(a.id)), text: appState.open.has(a.id) ? '−' : '+' });
      const tr = h('tr', { class: a.status === 'new' ? 'is-new' : '' },
        h('td', { class: 'mono', 'data-l': '№', text: a.id }),
        h('td', { class: 'mono', 'data-l': 'Sana', text: fmtDateTime(a.created_at) }),
        h('td', { 'data-l': 'Ota-ona' }, h('b', { text: a.parent_name }), a.message || a.admin_note ? ' 💬' : ''),
        h('td', { 'data-l': 'Telefon' }, h('a', { class: 'tel', href: `tel:${a.phone}`, text: fmtPhone(a.phone) })),
        h('td', { 'data-l': 'Farzand', text: a.child_name }),
        h('td', { 'data-l': 'Sinf', text: a.grade }),
        h('td', {}, statusSelect(a)),
        h('td', {}, h('div', { class: 'acts' }, toggle)));
      tbody.append(tr);
      let det = appState.open.has(a.id) ? detailRow(a) : null;
      if (det) tbody.append(det);
      toggle.addEventListener('click', () => {
        if (det) { det.remove(); det = null; appState.open.delete(a.id); toggle.textContent = '+'; toggle.setAttribute('aria-expanded', 'false'); }
        else { det = detailRow(a); tr.after(det); appState.open.add(a.id); toggle.textContent = '−'; toggle.setAttribute('aria-expanded', 'true'); }
      });
    }
    const pages = Math.ceil(d.total / d.per);
    $('#appPager').replaceChildren(...(pages > 1 ? [
      h('button', { class: 'btn ghost small', text: '← Oldingi', disabled: d.page <= 1, onclick: () => { appState.page--; loaders.applications(); } }),
      h('span', { class: 'muted small', text: `${d.page} / ${pages}` }),
      h('button', { class: 'btn ghost small', text: 'Keyingi →', disabled: d.page >= pages, onclick: () => { appState.page++; loaders.applications(); } }),
    ] : []));
  };
  const refreshBadge = () => api('/stats').then((s) => { const b = $('#newBadge'); b.hidden = !s.byStatus.new; b.textContent = s.byStatus.new; }).catch(() => {});

  /* ---------------- news ---------------- */
  let newsFilter = '';
  let newsItems = [];
  $$('#newsFilter button').forEach((b) => b.addEventListener('click', () => {
    $$('#newsFilter button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    newsFilter = b.dataset.f; loaders.news();
  }));

  async function patchNews(n, fields, msg) {
    const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    try { await api(`/news/${n.id}`, { method: 'PATCH', form: fd }); toast(msg); loaders.news(); }
    catch (e) { toast(e.message, true); }
  }

  loaders.news = async () => {
    const d = await api('/news' + (newsFilter ? `?filter=${newsFilter}` : ''));
    newsItems = d.items.filter((n) => n.title !== "[o'chirilgan]");
    $('#newsEmpty').hidden = !!newsItems.length;
    $('#newsEmpty').textContent = newsFilter === 'hidden' ? "Yashirin yangilik yo'q. Telegramdan import qilingan postlar avval shu yerga tushadi." : "Yangilik yo'q. \"+ Yangi yangilik\" tugmasini bosing.";
    $('#newsGrid').replaceChildren(...newsItems.map((n) => h('article', { class: 'ncard' + (n.published ? '' : ' off') },
      h('div', { class: 'thumb', style: n.image ? `background-image:url("${encodeURI(n.image)}")` : '' },
        h('div', { class: 'tags' },
          n.source === 'telegram' ? h('span', { class: 'tag tg', text: 'Telegram' }) : null,
          n.pinned ? h('span', { class: 'tag pin', text: 'Mahkamlangan' }) : null,
          n.published ? null : h('span', { class: 'tag off', text: 'Yashirin' }))),
      h('div', { class: 'nb' }, h('span', { class: 'muted small', text: n.published_at }), h('h3', { text: n.title }), h('p', { text: n.body })),
      h('div', { class: 'na' },
        h('button', { class: 'btn ghost small', text: 'Tahrirlash', onclick: () => openEditor(n) }),
        h('button', { class: 'btn ghost small', text: n.published ? 'Yashirish' : "Saytga chiqarish", onclick: () => patchNews(n, { published: n.published ? '0' : '1' }, n.published ? 'Yashirildi' : 'Saytga chiqarildi') }),
        h('button', { class: 'btn ghost small', text: n.pinned ? 'Mahkamni olish' : 'Mahkamlash', onclick: () => patchNews(n, { pinned: n.pinned ? '0' : '1' }, 'Saqlandi') }),
        h('button', { class: 'btn danger small', text: "O'chirish", onclick: async () => {
          if (!confirm(`"${n.title}" yangiligini o'chirasizmi?`)) return;
          try { await api(`/news/${n.id}`, { method: 'DELETE' }); toast("O'chirildi"); loaders.news(); } catch (e) { toast(e.message, true); } } })))));
  };

  const dlg = $('#newsDialog'); const nform = $('#newsForm'); let editing = null;
  function openEditor(n) {
    editing = n || null; nform.reset(); $('#newsError').textContent = '';
    $('#newsDialogTitle').textContent = n ? 'Yangilikni tahrirlash' : 'Yangi yangilik';
    nform.title.value = n?.title || ''; nform.body.value = n?.body || ''; nform.link.value = n?.link || '';
    nform.published_at.value = n?.published_at || new Date().toISOString().slice(0, 10);
    nform.published.checked = n ? !!n.published : true; nform.pinned.checked = !!n?.pinned;
    const prev = $('#newsPreview'); prev.hidden = !n?.image; if (n?.image) prev.src = n.image;
    $('#removeImageWrap').hidden = !n?.image;
    dlg.showModal(); nform.title.focus();
  }
  $('#newNewsBtn').addEventListener('click', () => openEditor(null));
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  nform.image.addEventListener('change', () => {
    const f = nform.image.files[0]; const prev = $('#newsPreview');
    if (f) { prev.src = URL.createObjectURL(f); prev.hidden = false; }
  });
  nform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(nform);
    fd.set('published', nform.published.checked ? '1' : '0');
    fd.set('pinned', nform.pinned.checked ? '1' : '0');
    if (!nform.image.files.length) fd.delete('image');
    const btn = $('#newsSave'); btn.disabled = true; $('#newsError').textContent = '';
    try {
      await api(editing ? `/news/${editing.id}` : '/news', { method: editing ? 'PATCH' : 'POST', form: fd });
      dlg.close(); toast(editing ? 'Yangilik saqlandi' : "Yangilik qo'shildi"); loaders.news();
    } catch (err) {
      $('#newsError').textContent = err.fields ? Object.values(err.fields).join(' ') : err.message;
    } finally { btn.disabled = false; }
  });

  $('#importBtn').addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Import qilinmoqda…';
    try {
      const r = await api('/import', { method: 'POST' });
      toast(r.added ? `${r.added} ta yangi post qo'shildi. Ular "Yashirin" bo'limida: ko'rib chiqib saytga chiqaring.` : `Yangi post yo'q (${r.scanned} ta tekshirildi).`);
      if (r.added) { $$('#newsFilter button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === 'hidden'))); newsFilter = 'hidden'; }
      loaders.news();
    } catch (err) { toast(err.message, true); }
    finally { b.disabled = false; b.textContent = 'Telegramdan import'; }
  });

  /* ---------------- settings ---------------- */
  loaders.settings = async () => {
    const s = lastStats || await api('/stats'); const t = s.telegram;
    $('#tgInfo').textContent = t.configured
      ? 'Yoqilgan. Har bir yangi ariza bot orqali belgilangan chatga yuboriladi.'
      : "O'chiq. Server .env faylida TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID ni to'ldirib, serverni qayta ishga tushiring (README'da batafsil).";
    $('#importInfo').textContent = `@${t.channel} kanali ${t.importIntervalMin > 0 ? `har ${t.importIntervalMin} daqiqada` : 'faqat qo\'lda'} tekshiriladi. Yangi postlar ${t.autoPublish ? 'darhol saytga chiqadi' : '"Yashirin" holatda tushadi, siz tasdiqlaysiz'}.`;
  };
  $('#tgTestBtn').addEventListener('click', async () => {
    try { await api('/telegram/test', { method: 'POST' }); toast('Test xabar yuborildi. Telegramni tekshiring.'); }
    catch (e) { toast(e.message, true); }
  });
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); $('#pwError').textContent = '';
    if (f.next !== f.again) { $('#pwError').textContent = 'Yangi parollar bir xil emas.'; return; }
    try { await api('/password', { method: 'POST', body: { current: f.current, next: f.next } }); e.target.reset(); toast("Parol o'zgartirildi"); }
    catch (err) { $('#pwError').textContent = err.message; }
  });

  /* ---------------- boot ---------------- */
  api('/me').then((r) => showApp(r.username)).catch(() => showLogin());
})();
