import { formatPhone } from './validate.js';

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Thin Telegram Bot API client. `fetchImpl` is injectable for tests. */
export function createTelegram(cfg, fetchImpl = globalThis.fetch) {
  const enabled = Boolean(cfg.telegramBotToken && cfg.telegramChatId);

  async function send(text, chatId = cfg.telegramChatId) {
    if (!enabled) return { ok: false, reason: 'not_configured' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetchImpl(`${cfg.telegramApiBase}/bot${cfg.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      return data.ok ? { ok: true } : { ok: false, reason: data.description || `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : e.message };
    } finally {
      clearTimeout(timer);
    }
  }

  function applicationMessage(a) {
    return [
      `🆕 <b>Yangi ariza #${a.id}</b>`,
      '',
      `👤 Ota-ona: <b>${escapeHtml(a.parent_name)}</b>`,
      `📞 Telefon: <code>${escapeHtml(formatPhone(a.phone))}</code>`,
      `🧒 Farzand: ${escapeHtml(a.child_name)}`,
      `🏫 Sinf: ${escapeHtml(a.grade)}`,
      a.message ? `💬 Izoh: ${escapeHtml(a.message)}` : null,
      '',
      `🕒 ${escapeHtml(a.created_at)} (UTC)`,
    ].filter((l) => l !== null).join('\n');
  }

  return {
    enabled,
    send,
    notifyApplication: (a) => send(applicationMessage(a)),
    applicationMessage,
  };
}
