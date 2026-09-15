import { prisma } from "./prisma";
import { env } from "./env";
import { sendCallbackTelegram } from "./telegram";

// A persisted lease prevents concurrent workers from sending the same reminder.
// Failed attempts and interrupted workers become eligible again after five minutes.
export async function deliverCallbackReminders(now = new Date()) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const eligible = {
    callbackAt: { lte: now }, callbackSentAt: null,
    OR: [{ callbackClaimedAt: null }, { callbackClaimedAt: { lt: new Date(now.getTime() - 300_000) } }],
  };
  const due = await prisma.lead.findMany({ where: eligible, orderBy: { callbackAt: "asc" }, take: 50 });
  for (const lead of due) {
    const claimedAt = new Date();
    const claim = await prisma.lead.updateMany({
      where: { ...eligible, id: lead.id, callbackAt: lead.callbackAt },
      data: { callbackClaimedAt: claimedAt },
    });
    if (!claim.count) continue;
    const current = await prisma.lead.findFirst({
      where: { id: lead.id, callbackAt: lead.callbackAt, callbackClaimedAt: claimedAt, callbackSentAt: null },
      include: { manager: { select: { name: true, email: true } } },
    });
    if (!current?.callbackAt) continue;
    const sent = await sendCallbackTelegram({ ...current, callbackAt: current.callbackAt });
    if (sent.ok && !sent.skipped) {
      await prisma.lead.updateMany({
        where: { id: lead.id, callbackAt: lead.callbackAt, callbackClaimedAt: claimedAt },
        data: { callbackSentAt: new Date(), callbackClaimedAt: null },
      });
    }
  }
}

export function startCallbackReminders() {
  let running = false;
  const check = async () => {
    if (running) return;
    running = true;
    try { await deliverCallbackReminders(); }
    catch { console.error("[callback-reminders] Delivery failed; will retry"); }
    finally { running = false; }
  };
  void check();
  const timer = setInterval(() => { void check(); }, 30_000);
  timer.unref();
  return timer;
}
