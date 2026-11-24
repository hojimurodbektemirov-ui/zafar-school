export const GRADES = [
  'Pre-School (0-sinf)', '1-sinf', '2-sinf', '3-sinf', '4-sinf',
  '5-sinf', '6-sinf', '7-sinf', '8-sinf',
];

export const STATUSES = ['new', 'contacted', 'exam', 'accepted', 'rejected'];

export const STATUS_LABELS = {
  new: 'Yangi', contacted: "Bog'lanildi", exam: 'Imtihonga chaqirildi',
  accepted: 'Qabul qilindi', rejected: 'Rad etildi',
};

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Normalise an Uzbek phone number to +998XXXXXXXXX, or return null. */
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  return null;
}

export function formatPhone(p) {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(p);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

/** Validate a public application. Returns { value } or { errors: {field: message} }. */
export function validateApplication(body = {}) {
  const errors = {};
  const parent_name = clean(body.parent, 80);
  const child_name = clean(body.child, 80);
  const grade = clean(body.grade, 40);
  const message = clean(body.message, 500);
  const phone = normalizePhone(body.phone);

  if (parent_name.length < 2) errors.parent = "Ota-ona ismini kiriting.";
  if (child_name.length < 2) errors.child = 'Farzand ismini kiriting.';
  if (!phone) errors.phone = "Telefon raqamini to'liq kiriting: +998 XX XXX XX XX.";
  if (!GRADES.includes(grade)) errors.grade = "Sinfni ro'yxatdan tanlang.";

  if (Object.keys(errors).length) return { errors };
  return { value: { parent_name, child_name, grade, message, phone } };
}

export function validateNews(body = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};
  if (!partial || body.title !== undefined) {
    out.title = clean(body.title, 160);
    if (out.title.length < 3) errors.title = 'Sarlavha kamida 3 ta belgi.';
  }
  if (!partial || body.body !== undefined) out.body = String(body.body ?? '').trim().slice(0, 5000);
  if (!partial || body.link !== undefined) {
    out.link = clean(body.link, 300);
    if (out.link && !/^https?:\/\//i.test(out.link)) errors.link = 'Havola http(s):// bilan boshlanishi kerak.';
  }
  if (!partial || body.published_at !== undefined) {
    out.published_at = clean(body.published_at, 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.published_at)) errors.published_at = 'Sana formati: YYYY-MM-DD.';
  }
  for (const k of ['published', 'pinned']) {
    if (!partial || body[k] !== undefined) out[k] = ['1', 'true', 'on', true, 1].includes(body[k]) ? 1 : 0;
  }
  if (!partial && body.published === undefined) out.published = 1;
  if (Object.keys(errors).length) return { errors };
  return { value: out };
}
