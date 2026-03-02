export function normalizeWebhookProvider(provider) {
  return String(provider || "").trim().toLowerCase();
}

export function normalizeWebhookEventId(eventId) {
  return String(eventId || "").trim();
}

export async function markWebhookEventProcessed(dbGet, { provider, eventId } = {}) {
  const normalizedProvider = normalizeWebhookProvider(provider);
  const normalizedEventId = normalizeWebhookEventId(eventId);
  if (!normalizedProvider || !normalizedEventId || typeof dbGet !== "function") {
    return false;
  }

  const inserted = await dbGet(
    `INSERT INTO billing_webhook_events (provider, event_id)
     VALUES ($1, $2)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [normalizedProvider, normalizedEventId]
  );
  return Boolean(inserted?.id);
}
