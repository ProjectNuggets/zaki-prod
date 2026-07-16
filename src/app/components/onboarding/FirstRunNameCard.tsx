import { FormEvent, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FirstRunCeremonyPhase } from "@/lib/firstRunCeremony";
import { normalizeFirstRunAgentName } from "@/lib/firstRunCeremony";

type Props = {
  phase: Extract<FirstRunCeremonyPhase, "awaiting_name" | "saving_name">;
  onComplete: (name: string) => Promise<void>;
  error?: string | null;
};

export function FirstRunNameCard({ phase, onComplete, error = null }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("ZAKI");
  const normalizedName = normalizeFirstRunAgentName(name);
  const saving = phase === "saving_name";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedName || saving) return;
    await onComplete(normalizedName);
  };

  return (
    <section
      className="mx-auto w-full max-w-[760px] border-y border-zaki-subtle bg-zaki-raised/85 px-4 py-3 font-mono sm:border sm:px-5"
      aria-labelledby="first-run-name-title"
      data-testid="first-run-name-card"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)] sm:items-end">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zaki-brand">
            {t("firstRun.name.kicker", { defaultValue: "First breath · make it yours" })}
          </p>
          <h2 id="first-run-name-title" className="text-sm font-semibold text-zaki-primary">
            {t("firstRun.name.title", { defaultValue: "What will you call your ZAKI?" })}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-zaki-muted">
            {t("firstRun.name.helper", {
              defaultValue:
                "This becomes its identity everywhere you meet it. Keep ZAKI or choose a name of your own.",
            })}
          </p>
        </div>

        <form onSubmit={submit} className="flex min-w-0 items-stretch border border-zaki-strong bg-zaki-sunken">
          <label htmlFor="first-run-agent-name" className="sr-only">
            {t("firstRun.name.label", { defaultValue: "Name your agent" })}
          </label>
          <input
            id="first-run-agent-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            disabled={saving}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-xs text-zaki-primary outline-none placeholder:text-zaki-disabled focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-zaki-brand disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!normalizedName || saving}
            className="inline-flex min-w-[118px] items-center justify-center gap-1.5 border-l border-zaki-strong bg-zaki-primary px-3 py-2 text-[11px] font-semibold text-zaki-sunken transition-colors hover:bg-zaki-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              saving
                ? t("firstRun.name.saving", { defaultValue: "Saving name…" })
                : t("firstRun.name.submitAria", {
                    name: normalizedName || "ZAKI",
                    defaultValue: `Make ${normalizedName || "ZAKI"} mine`,
                  })
            }
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-3" aria-hidden="true" />
            )}
            {saving
              ? t("firstRun.name.savingShort", { defaultValue: "Saving" })
              : t("firstRun.name.submit", { defaultValue: "Choose name" })}
          </button>
        </form>
      </div>
      {error ? (
        <p className="mt-2 text-[11px] text-[#b74c3a] dark:text-[#f7b1a4]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
