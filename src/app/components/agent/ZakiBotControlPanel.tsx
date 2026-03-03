import { useEffect, useState } from "react";
import {
  connectAgentTelegram,
  createAgentCron,
  deleteAgentSecret,
  deleteAgentCron,
  disconnectAgentTelegram,
  fetchAgentConfig,
  fetchAgentHeartbeat,
  fetchAgentOnboarding,
  listAgentCron,
  getAgentSecret,
  provisionAgent,
  putAgentSecret,
  updateAgentCron,
  updateAgentConfig,
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

export function ZakiBotControlPanel({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingJson, setOnboardingJson] = useState("{}");
  const [configJson, setConfigJson] = useState("{}");
  const [secretKey, setSecretKey] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [telegramJson, setTelegramJson] = useState("{}");
  const [heartbeatJson, setHeartbeatJson] = useState("{}");
  const [cronJson, setCronJson] = useState("[]");
  const [cronEditId, setCronEditId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      fetchAgentOnboarding(),
      fetchAgentConfig(),
      fetchAgentHeartbeat(),
      listAgentCron(),
    ])
      .then(([onboardingResult, configResult, heartbeatResult, cronResult]) => {
        if (!active) return;
        setOnboardingJson(stringifyJson(onboardingResult.data));
        setConfigJson(stringifyJson(configResult.data));
        setHeartbeatJson(stringifyJson(heartbeatResult.data));
        setCronJson(stringifyJson(cronResult.data));
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
              Minimal control panel for provisioning and Nullclaw round-trip testing.
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

        {status ? <div className="mb-3 rounded-zaki-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</div> : null}
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
                    setError(String((data as { error?: string }).error || "Provision failed."));
                    return;
                  }
                  setStatus("Provisioned ZAKI BOT successfully.");
                }}
              >
                Provision agent
              </button>
            </div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zaki-muted">
              Onboarding payload
            </label>
            <textarea
              className="min-h-28 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={onboardingJson}
              onChange={(event) => setOnboardingJson(event.target.value)}
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
                      setError(String((data as { error?: string }).error || "Config update failed."));
                      return;
                    }
                    setStatus("Agent config updated.");
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : "Invalid config JSON.");
                  }
                }}
              >
                Save config
              </button>
            </div>
            <textarea
              className="min-h-40 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
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
              className="min-h-24 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-sm text-zaki-secondary outline-none"
              placeholder="Secret value"
              value={secretValue}
              onChange={(event) => setSecretValue(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  if (!secretKey.trim()) return;
                  const { response, data } = await getAgentSecret(secretKey.trim());
                  if (!response.ok) {
                    setError(String((data as { error?: string }).error || "Unable to read secret."));
                    return;
                  }
                  setSecretValue(stringifyJson(data));
                  setStatus(`Loaded secret ${secretKey.trim()}.`);
                }}
              >
                Load
              </button>
              <button
                type="button"
                className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                onClick={async () => {
                  if (!secretKey.trim()) return;
                  const { response, data } = await putAgentSecret(secretKey.trim(), secretValue);
                  if (!response.ok) {
                    setError(String((data as { error?: string }).error || "Unable to save secret."));
                    return;
                  }
                  setStatus(`Saved secret ${secretKey.trim()}.`);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                onClick={async () => {
                  if (!secretKey.trim()) return;
                  const { response, data } = await deleteAgentSecret(secretKey.trim());
                  if (!response.ok) {
                    setError(String((data as { error?: string }).error || "Unable to delete secret."));
                    return;
                  }
                  setStatus(`Deleted secret ${secretKey.trim()}.`);
                  setSecretValue("");
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
                  const { response, data } = await disconnectAgentTelegram();
                  if (!response.ok) {
                    setError(String((data as { error?: string }).error || "Unable to disconnect Telegram."));
                    return;
                  }
                  setStatus("Telegram disconnected.");
                }}
              >
                Disconnect
              </button>
            </div>
            <textarea
              className="min-h-24 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={telegramJson}
              onChange={(event) => setTelegramJson(event.target.value)}
            />
            <button
              type="button"
              className="mt-3 rounded-full bg-zaki-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-zaki-brand-hover"
              onClick={async () => {
                setError("");
                try {
                  const payload = JSON.parse(telegramJson);
                  const { response, data } = await connectAgentTelegram(payload);
                  if (!response.ok) {
                    setError(String((data as { error?: string }).error || "Unable to connect Telegram."));
                    return;
                  }
                  setStatus("Telegram connect request sent.");
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : "Invalid Telegram JSON.");
                }
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
                  setError("");
                  try {
                    const payload = JSON.parse(heartbeatJson);
                    const { response, data } = await updateAgentHeartbeat(payload);
                    if (!response.ok) {
                      setError(String((data as { error?: string }).error || "Heartbeat update failed."));
                      return;
                    }
                    setStatus("Heartbeat updated.");
                  } catch (nextError) {
                    setError(nextError instanceof Error ? nextError.message : "Invalid heartbeat JSON.");
                  }
                }}
              >
                Save heartbeat
              </button>
            </div>
            <textarea
              className="min-h-28 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={heartbeatJson}
              onChange={(event) => setHeartbeatJson(event.target.value)}
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
                    setError("");
                    try {
                      const payload = JSON.parse(cronJson);
                      const listPayload = Array.isArray(payload)
                        ? payload[0] ?? {}
                        : payload;
                      const { response, data } = await createAgentCron(listPayload);
                      if (!response.ok) {
                        setError(String((data as { error?: string }).error || "Cron create failed."));
                        return;
                      }
                      setStatus("Cron entry created.");
                    } catch (nextError) {
                      setError(nextError instanceof Error ? nextError.message : "Invalid cron JSON.");
                    }
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zaki-subtle px-3 py-1.5 text-sm text-zaki-secondary hover:bg-zaki-hover"
                  onClick={async () => {
                    if (!cronEditId.trim()) {
                      setError("Enter a cron id to update.");
                      return;
                    }
                    setError("");
                    try {
                      const payload = JSON.parse(cronJson);
                      const listPayload = Array.isArray(payload)
                        ? payload[0] ?? {}
                        : payload;
                      const { response, data } = await updateAgentCron(cronEditId.trim(), listPayload);
                      if (!response.ok) {
                        setError(String((data as { error?: string }).error || "Cron update failed."));
                        return;
                      }
                      setStatus(`Cron ${cronEditId.trim()} updated.`);
                    } catch (nextError) {
                      setError(nextError instanceof Error ? nextError.message : "Invalid cron JSON.");
                    }
                  }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={async () => {
                    if (!cronEditId.trim()) {
                      setError("Enter a cron id to delete.");
                      return;
                    }
                    const { response, data } = await deleteAgentCron(cronEditId.trim());
                    if (!response.ok) {
                      setError(String((data as { error?: string }).error || "Cron delete failed."));
                      return;
                    }
                    setStatus(`Cron ${cronEditId.trim()} deleted.`);
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
            <textarea
              className="min-h-32 w-full rounded-zaki-lg border border-zaki-subtle bg-zaki-sunken/40 px-3 py-2 text-xs text-zaki-secondary outline-none"
              value={cronJson}
              onChange={(event) => setCronJson(event.target.value)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
