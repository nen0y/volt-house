import { env } from "./env";

export interface LeadNotification {
  id: string;
  type: string;
  name: string;
  phone: string;
  email?: string | null;
  interest?: string | null;
  message?: string | null;
  items?: Array<{ id: string; name: string; price: number; quantity: number; availability?: string; custom?: boolean }> | null;
  total?: number | null;
  createdAt: Date;
}

const money = (n?: number | null) => (n == null ? "" : `$${n.toLocaleString("en-US")}`);

// Telegram parse_mode=HTML — escape user-supplied text.
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const TYPE_LABEL: Record<string, string> = {
  order: "🛒 Нове замовлення",
  consultation: "📋 Заявка на консультацію",
  callback: "📞 Замовлення дзвінка",
};

const INTEREST_LABEL: Record<string, string> = {
  "full-system": "Повна сонячна + акумуляторна система",
  "battery-only": "Тільки резервний акумулятор",
  "solar-only": "Тільки сонячні панелі",
  inverter: "Оновлення інвертора",
  consultation: "Просто консультація",
};

function render(lead: LeadNotification): string {
  const lines: string[] = [];
  lines.push(`<b>${TYPE_LABEL[lead.type] ?? "Нова заявка"}</b>`);
  lines.push("");
  lines.push(`👤 <b>Ім'я:</b> ${esc(lead.name)}`);
  lines.push(`📞 <b>Телефон:</b> ${esc(lead.phone)}`);
  if (lead.email) lines.push(`✉️ <b>Email:</b> ${esc(lead.email)}`);
  if (lead.interest) lines.push(`🎯 <b>Цікавить:</b> ${esc(INTEREST_LABEL[lead.interest] ?? lead.interest)}`);
  if (lead.message) lines.push(`💬 <b>Повідомлення:</b> ${esc(lead.message)}`);

  if (lead.items && lead.items.length) {
    lines.push("");
    lines.push("🛍 <b>Замовлення:</b>");
    for (const it of lead.items) {
      lines.push(`• ${esc(it.name)} × ${it.quantity} — ${money(it.price * it.quantity)}`);
      if (it.custom || it.availability === "unavailable") lines.push("  ⚠️ <b>Товар потрібно знайти</b>");
      if (it.availability === "preorder") lines.push("  🕒 <b>Товар очікується</b>");
    }
    lines.push(`<b>Разом: ${money(lead.total)}</b>`);
  }

  lines.push("");
  lines.push(`🕒 ${esc(lead.createdAt.toLocaleString("uk-UA"))}`);
  return lines.join("\n");
}

export async function sendUnavailableProductTelegram(lead: Pick<LeadNotification, "id" | "name" | "phone"> & { productName: string }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: true, skipped: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, parse_mode: "HTML", text: `⚠️ <b>Потрібно знайти товар</b>\n\n🛍 ${esc(lead.productName)}\n👤 ${esc(lead.name)}\n📞 ${esc(lead.phone)}\n🆔 ${esc(lead.id)}` }),
    });
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok };
  } catch (err) {
    console.error("[telegram] unavailable product notification failed:", err);
    return { ok: false };
  }
}

/** Sends the lead to the configured Telegram group. Never throws. */
export async function sendLeadTelegram(
  lead: LeadNotification
): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: true, skipped: true }; // not configured — silently skip
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: render(lead),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      console.error(`[telegram] API error: ${data.description || res.statusText}`);
      return { ok: false };
    }
    console.log(`[telegram] Lead ${lead.id} sent to chat ${env.TELEGRAM_CHAT_ID}`);
    return { ok: true };
  } catch (err) {
    console.error("[telegram] send failed:", err);
    return { ok: false };
  }
}

export async function sendCallbackTelegram(lead: {
  id: string; name: string; phone: string; callbackAt: Date; callbackNote: string;
  interest?: string | null; waitingProduct?: string; notes?: string;
  manager?: { name: string | null; email: string } | null;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { ok: false, skipped: true };
  const clip = (value: string) => esc(value.slice(0, 400));
  const url = new URL("/admin/", env.SITE_URL);
  url.searchParams.set("tab", "crm");
  url.searchParams.set("lead", lead.id);
  const text = [
    "⏰ <b>Час передзвонити клієнту</b>",
    `👤 ${clip(lead.name)}`,
    `📞 ${clip(lead.phone)}`,
    `🕒 ${lead.callbackAt.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })} (Київ)`,
    lead.manager ? `👔 ${clip(lead.manager.name || lead.manager.email)}` : "",
    lead.callbackNote ? `💬 ${clip(lead.callbackNote)}` : "",
    lead.interest ? `🎯 ${clip(lead.interest)}` : "",
    lead.waitingProduct ? `📦 ${clip(lead.waitingProduct)}` : "",
    lead.notes ? `📝 ${clip(lead.notes)}` : "",
  ].filter(Boolean).join("\n");
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_notification: false,
        reply_markup: { inline_keyboard: [[{ text: "Відкрити картку клієнта", url: url.toString() }]] } }),
    });
    const data: any = await response.json().catch(() => ({}));
    return { ok: response.ok && data.ok === true };
  } catch { return { ok: false }; }
}
