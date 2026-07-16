const POSTGRES_CHANNEL_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

function quoteChannel(channel) {
  const normalized = String(channel || "").trim();
  if (!POSTGRES_CHANNEL_PATTERN.test(normalized)) {
    throw new Error("Invalid Postgres notification channel.");
  }
  return `"${normalized}"`;
}

/**
 * Hold one pooled Postgres client open for LISTEN/NOTIFY delivery.
 * The returned async stop function cleanly detaches and releases that client.
 */
export async function startPostgresNotificationListener({
  connect,
  channel,
  onPayload,
  onError = () => {},
  onConnected = () => {},
  onDisconnected = () => {},
  retryDelayMs = 1000,
  scheduleRetry = (callback, delay) => setTimeout(callback, delay),
  clearRetry = (timer) => clearTimeout(timer),
} = {}) {
  if (typeof connect !== "function") throw new Error("Postgres connect is required.");
  if (typeof onPayload !== "function") throw new Error("Notification handler is required.");

  const quotedChannel = quoteChannel(channel);
  let stopped = false;
  let active = null;
  let retryTimer = null;

  function detach(entry, error = null) {
    if (!entry) return;
    entry.client.off("notification", entry.handleNotification);
    entry.client.off("error", entry.handleDisconnect);
    entry.client.off("end", entry.handleDisconnect);
    entry.client.release(error || undefined);
  }

  function queueReconnect() {
    if (stopped || retryTimer) return;
    retryTimer = scheduleRetry(async () => {
      retryTimer = null;
      try {
        await connectListener();
      } catch (error) {
        onError(error);
        onDisconnected(error);
        queueReconnect();
      }
    }, Math.max(1, retryDelayMs));
    retryTimer?.unref?.();
  }

  async function connectListener() {
    const client = await connect();
    if (stopped) {
      client.release();
      return;
    }

    const entry = {
      client,
      handleNotification(message) {
        if (!stopped && message?.channel === channel) {
          onPayload(String(message?.payload || ""));
        }
      },
      handleDisconnect(error) {
        if (active !== entry) return;
        active = null;
        detach(entry, error instanceof Error ? error : new Error("Postgres listener ended."));
        onDisconnected(error);
        if (error instanceof Error) onError(error);
        queueReconnect();
      },
    };

    client.on("notification", entry.handleNotification);
    client.on("error", entry.handleDisconnect);
    client.on("end", entry.handleDisconnect);
    try {
      await client.query(`LISTEN ${quotedChannel}`);
      if (stopped) {
        detach(entry);
        return;
      }
      active = entry;
      onConnected();
    } catch (error) {
      detach(entry, error);
      throw error;
    }
  }

  try {
    await connectListener();
  } catch (error) {
    onError(error);
    onDisconnected(error);
    queueReconnect();
  }

  return async function stop() {
    if (stopped) return;
    stopped = true;
    if (retryTimer) {
      clearRetry(retryTimer);
      retryTimer = null;
    }
    const entry = active;
    active = null;
    if (!entry) return;
    entry.client.off("notification", entry.handleNotification);
    entry.client.off("error", entry.handleDisconnect);
    entry.client.off("end", entry.handleDisconnect);
    try {
      await entry.client.query(`UNLISTEN ${quotedChannel}`);
    } finally {
      entry.client.release();
    }
  };
}
