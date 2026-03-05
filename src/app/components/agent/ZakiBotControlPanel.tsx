import { useEffect, useState } from "react";
import {
  connectAgentTelegram,
  createAgentCron,
  deleteAgentCron,
  deleteAgentSecret,
  disconnectAgentTelegram,
  fetchAgentConfig,
  fetchAgentHeartbeat,
  fetchAgentOnboarding,
  getAgentSecret,
  listAgentCron,
  provisionAgent,
  putAgentSecret,
  updateAgentConfig,
  updateAgentCron,
  updateAgentHeartbeat,
} from "@/lib/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const error = String((data as { error?: string }).error || "").trim();
    if (error) return error;
    const message = String((data as { message?: string }).message || "").trim();
    if (message) return message;
  }
  return fallback;
}

function isValidCronSchedule(input: string) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("@")) {
    return ["@hourly", "@daily", "@weekly", "@monthly", "@yearly", "@annually"].includes(
      trimmed.toLowerCase()
    );
  }
  return trimmed.split(/\s+/).length === 5;
}

export function ZakiBotControlPanel({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingJson, setOnboardingJson] = useState("{}");
  const [configJson, setConfigJson] = useState("{}");

  const [secretKey, setSecretKey] = useState("");
  const [secretValue, setSecretValue] = useState("");

  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState("");

  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [heartbeatIntervalSec, setHeartbeatIntervalSec] = useState("300");

  const [cronEditId, setCronEditId] = useState("");
  const [cronName, setCronName] = useState("");
  const [cronSchedule, setCronSchedule] = useState("");
  const [cronPrompt, setCronPrompt] = useState("");
  const [cronEnabled, setCronEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError("");
    setStatus("");
    Promise.all([fetchAgentOnboarding(), fetchAgentConfig(), fetchAgentHeartbeat(), listAgentCron()])
      .then(([onboardingResult, configResult, heartbeatResult, cronResult]) => {
        if (!active) return;
        setOnboardingJson(stringifyJson(onboardingResult.data));
        setConfigJson(stringifyJson(configResult.data));

        const heartbeatData =
          heartbeatResult.data && typeof heartbeatResult.data === "object" ? heartbeatResult.data : {};
        const heartbeatEnabledValue = Boolean(
          (heartbeatData as { enabled?: boolean }).enabled ?? true
        );
        const heartbeatIntervalValue = Number(
          (heartbeatData as { intervalSec?: number; interval_seconds?: number }).intervalSec ??
            (heartbeatData as { intervalSec?: number; interval_seconds?: number }).interval_seconds ??
            300
        );
        setHeartbeatEnabled(heartbeatEnabledValue);
        setHeartbeatIntervalSec(String(Number.isFinite(heartbeatIntervalValue) ? heartbeatIntervalValue : 300));

        const cronData = cronResult.data;
        const cronItems = Array.isArray((cronData as { items?: unknown[] })?.items)
          ? ((cronData as { items?: unknown[] }).items as Array<Record<string, unknown>>)
          : Array.isArray(cronData)
          ? (cronData as Array<Record<string, unknown>>)
          : [];
        const firstCron = cronItems[0] || null;
        if (firstCron) {
          setCronEditId(String(firstCron.id || ""));
          setCronName(String(firstCron.name || ""));
          setCronSchedule(String(firstCron.schedule || firstCron.cron || ""));
          setCronPrompt(String(firstCron.prompt || firstCron.message || firstCron.task || ""));
          setCronEnabled(
            typeof firstCron.enabled === "boolean" ? firstCron.enabled : true
          );
        }
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load bot controls.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-zaki-subtle bg-[#FDF6EE] px-5 py-5 shadow-[0px_18px_36px_rgba(15,15,15,0.16)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zaki-primary">ZAKI BOT</h2>
            <p className="mt-1 text-sm text-zaki-secondary">
              Validated controls for provisioning, telegram, heartbeat, and cron.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-zaki-subtle px-3 py-1 text-sm text-zaki-secondary hover:bg-zaki-hover"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {status ? (
          <div className="mb-3 rounded-zaki-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</div>
        ) : null}
        {error ? <div className="mb-3 rounded-zaki-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        {loading ? <div className="mb-3 text-sm text-zaki-secondary">Loading…</div> : null}

        <div className="space-y-5">
          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zaki-primary">Provision</h3>
              <button
                type="button"
                className="rounded-full bg-zaki-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-zaki-brand-hover"
                onClick={async () => {
                  setError("");
                  const { response, data } = await provisionAgent();
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Provision failed."));
                    return;
                  }
                  setStatus("Provisioned ZAKI BOT successfully.");
                }}
              >
                Provision agent
              </button>
            </div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zaki-muted">
              Onboarding payload (read-only)
            </label>
            <textarea
              className="min-h-24 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={onboardingJson}
              readOnly
            />
          </section>

          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zaki-primary">Config</h3>
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  setError("");
                  try {
                    const payload = JSON.parse(configJson);
                    const { response, data } = await updateAgentConfig(payload);
                    if (!response.ok) {
                      setError(getErrorMessage(data, "Config update failed."));
                      return;
                    }
                    setStatus("Agent config updated.");
                  } catch {
                    setError("Invalid config JSON.");
                  }
                }}
              >
                Save config
              </button>
            </div>
            <textarea
              className="min-h-32 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={configJson}
              onChange={(event) => setConfigJson(event.target.value)}
            />
          </section>

          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zaki-primary">Secrets</h3>
            <input
              className="mb-2 w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Secret key"
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
            />
            <textarea
              className="min-h-20 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-sm text-zaki-secondary outline-none"
              placeholder="Secret value"
              value={secretValue}
              onChange={(event) => setSecretValue(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  const key = secretKey.trim();
                  if (!key) {
                    setError("Secret key is required.");
                    return;
                  }
                  const { response, data } = await getAgentSecret(key);
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Unable to read secret."));
                    return;
                  }
                  setSecretValue(stringifyJson(data));
                  setStatus(`Loaded secret ${key}.`);
                }}
              >
                Load
              </button>
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  const key = secretKey.trim();
                  if (!key) {
                    setError("Secret key is required.");
                    return;
                  }
                  const { response, data } = await putAgentSecret(key, secretValue);
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Unable to save secret."));
                    return;
                  }
                  setStatus(`Saved secret ${key}.`);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                onClick={async () => {
                  const key = secretKey.trim();
                  if (!key) {
                    setError("Secret key is required.");
                    return;
                  }
                  const { response, data } = await deleteAgentSecret(key);
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Unable to delete secret."));
                    return;
                  }
                  setSecretValue("");
                  setStatus(`Deleted secret ${key}.`);
                }}
              >
                Delete
              </button>
            </div>
          </section>

          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zaki-primary">Telegram</h3>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                onClick={async () => {
                  setError("");
                  setStatus("");
                  const { response, data } = await disconnectAgentTelegram();
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Unable to disconnect Telegram."));
                    return;
                  }
                  setStatus("Telegram disconnected.");
                }}
              >
                Disconnect
              </button>
            </div>
            <input
              className="mb-2 w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Bot token"
              value={telegramBotToken}
              onChange={(event) => setTelegramBotToken(event.target.value)}
            />
            <input
              className="w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Webhook URL (optional override)"
              value={telegramWebhookUrl}
              onChange={(event) => setTelegramWebhookUrl(event.target.value)}
            />
            <p className="mt-2 text-xs text-zaki-muted">
              Leave webhook URL empty to use the backend default (`ZAKI_AGENT_WEBHOOK_BASE_URL`).
            </p>
            <button
              type="button"
              className="mt-3 rounded-full bg-zaki-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-zaki-brand-hover"
              onClick={async () => {
                setError("");
                setStatus("");
                const botToken = telegramBotToken.trim();
                const webhookUrl = telegramWebhookUrl.trim();
                if (!botToken) {
                  setError("Telegram bot token is required.");
                  return;
                }
                if (webhookUrl) {
                  try {
                    new URL(webhookUrl);
                  } catch {
                    setError("Webhook URL must be a valid URL.");
                    return;
                  }
                }
                const payload: Parameters<typeof connectAgentTelegram>[0] = {
                  bot_token: botToken,
                };
                if (webhookUrl) payload.webhook_url = webhookUrl;
                const { response, data } = await connectAgentTelegram(payload);
                if (!response.ok) {
                  setError(getErrorMessage(data, "Unable to connect Telegram."));
                  return;
                }
                setStatus("Telegram connected. Send a message to your bot now to confirm inbound routing.");
              }}
            >
              Connect Telegram
            </button>
          </section>

          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zaki-primary">Heartbeat</h3>
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  const intervalSec = Number(heartbeatIntervalSec);
                  if (!Number.isInteger(intervalSec) || intervalSec < 10 || intervalSec > 86400) {
                    setError("Heartbeat interval must be an integer between 10 and 86400 seconds.");
                    return;
                  }
                  const payload = { enabled: heartbeatEnabled, intervalSec };
                  const { response, data } = await updateAgentHeartbeat(payload);
                  if (!response.ok) {
                    setError(getErrorMessage(data, "Heartbeat update failed."));
                    return;
                  }
                  setStatus("Heartbeat updated.");
                }}
              >
                Save heartbeat
              </button>
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-zaki-secondary">
              <input
                type="checkbox"
                checked={heartbeatEnabled}
                onChange={(event) => setHeartbeatEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <input
              className="w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Interval seconds"
              value={heartbeatIntervalSec}
              onChange={(event) => setHeartbeatIntervalSec(event.target.value)}
            />
          </section>

          <section className="rounded-zaki-xl border border-zaki-subtle bg-white/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zaki-primary">Cron</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                  onClick={async () => {
                    const name = cronName.trim();
                    const schedule = cronSchedule.trim();
                    const prompt = cronPrompt.trim();
                    if (!name) {
                      setError("Cron name is required.");
                      return;
                    }
                    if (!isValidCronSchedule(schedule)) {
                      setError("Cron schedule must be 5-part cron or @hourly/@daily/@weekly/@monthly/@yearly.");
                      return;
                    }
                    if (!prompt) {
                      setError("Cron prompt/task is required.");
                      return;
                    }
                    const payload = { name, schedule, prompt, enabled: cronEnabled };
                    const { response, data } = await createAgentCron(payload);
                    if (!response.ok) {
                      setError(getErrorMessage(data, "Cron create failed."));
                      return;
                    }
                    setStatus("Cron entry created.");
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                  onClick={async () => {
                    const id = cronEditId.trim();
                    if (!id) {
                      setError("Enter a cron id to update.");
                      return;
                    }
                    if (!isValidCronSchedule(cronSchedule)) {
                      setError("Cron schedule must be valid.");
                      return;
                    }
                    const payload = {
                      name: cronName.trim(),
                      schedule: cronSchedule.trim(),
                      prompt: cronPrompt.trim(),
                      enabled: cronEnabled,
                    };
                    const { response, data } = await updateAgentCron(id, payload);
                    if (!response.ok) {
                      setError(getErrorMessage(data, "Cron update failed."));
                      return;
                    }
                    setStatus(`Cron ${id} updated.`);
                  }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={async () => {
                    const id = cronEditId.trim();
                    if (!id) {
                      setError("Enter a cron id to delete.");
                      return;
                    }
                    const { response, data } = await deleteAgentCron(id);
                    if (!response.ok) {
                      setError(getErrorMessage(data, "Cron delete failed."));
                      return;
                    }
                    setStatus(`Cron ${id} deleted.`);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <input
              className="mb-2 w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Cron id for update/delete"
              value={cronEditId}
              onChange={(event) => setCronEditId(event.target.value)}
            />
            <input
              className="mb-2 w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Cron name"
              value={cronName}
              onChange={(event) => setCronName(event.target.value)}
            />
            <input
              className="mb-2 w-full rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-2 text-sm text-zaki-primary outline-none"
              placeholder="Schedule (e.g. 0 9 * * * or @daily)"
              value={cronSchedule}
              onChange={(event) => setCronSchedule(event.target.value)}
            />
            <textarea
              className="min-h-20 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-sm text-zaki-secondary outline-none"
              placeholder="Prompt/task"
              value={cronPrompt}
              onChange={(event) => setCronPrompt(event.target.value)}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-zaki-secondary">
              <input
                type="checkbox"
                checked={cronEnabled}
                onChange={(event) => setCronEnabled(event.target.checked)}
              />
              Enabled
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
