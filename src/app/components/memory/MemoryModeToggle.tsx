import { useEffect, useState } from "react";
import { Brain, CheckCircle2, ShieldAlert, ShieldMinus, ShieldPlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  fetchMemoryPreferences,
  updateMemoryPreferences,
  type MemoryPolicy,
} from "@/lib/api";

const LEGACY_MEMORY_MODE_KEY = "zaki-memory-mode";

type MemoryPolicyMeta = {
  icon: typeof Sparkles;
  activeClass: string;
};

const policyMeta: Record<MemoryPolicy, MemoryPolicyMeta> = {
  balanced: {
    icon: Sparkles,
    activeClass: "border-zaki-accent bg-zaki-accent-10 text-zaki-accent",
  },
  ask_before_saving: {
    icon: ShieldAlert,
    activeClass: "border-zaki-brand bg-zaki-brand-10 text-zaki-brand",
  },
  save_less: {
    icon: ShieldMinus,
    activeClass: "border-[#8d6929] bg-[#faf3e1] text-[#8d6929]",
  },
  save_more: {
    icon: ShieldPlus,
    activeClass: "border-zaki-success bg-zaki-success/10 text-zaki-success",
  },
};

function readLegacyMemoryMode(): MemoryPolicy | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(LEGACY_MEMORY_MODE_KEY);
  if (saved === "autosave") return "balanced";
  if (saved === "manual") return "ask_before_saving";
  return null;
}

function clearLegacyMemoryMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_MEMORY_MODE_KEY);
}

interface MemoryModeToggleProps {
  value: MemoryPolicy;
  onChange: (mode: MemoryPolicy) => void;
  disabled?: boolean;
}

export function MemoryModeToggle({
  value,
  onChange,
  disabled = false,
}: MemoryModeToggleProps) {
  const { t } = useTranslation();

  const options: MemoryPolicy[] = [
    "balanced",
    "ask_before_saving",
    "save_less",
    "save_more",
  ];

  return (
    <div className="rounded-zaki-lg border border-zaki-subtle bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-zaki-accent" />
        <span className="text-sm font-medium text-zaki-primary">
          {t("memoryPanel.mode.title")}
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const meta = policyMeta[option];
          const Icon = meta.icon;
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "relative rounded-md border-2 p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? meta.activeClass
                  : "border-zaki-subtle text-zaki-secondary hover:border-zaki-strong"
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4",
                    active ? "" : "text-zaki-muted"
                  )}
                />
                <div>
                  <p className="text-sm font-medium">
                    {t(`memoryPanel.mode.${option}`)}
                  </p>
                  <p className="mt-1 text-2xs text-zaki-muted">
                    {t(`memoryPanel.mode.${option}Hint`)}
                  </p>
                </div>
              </div>
              {active ? (
                <CheckCircle2 className="absolute right-2 top-2 h-4 w-4" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useMemoryPolicy() {
  const [policy, setPolicy] = useState<MemoryPolicy>("balanced");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const legacy = readLegacyMemoryMode();
      try {
        const { response, data } = await fetchMemoryPreferences();
        if (!active) return;

        if (!response.ok || !data?.policy) {
          if (legacy) {
            setPolicy(legacy);
          }
          return;
        }

        const serverPolicy = data.policy;
        if (data.source === "default" && legacy && legacy !== serverPolicy) {
          const migrated = await updateMemoryPreferences(legacy);
          if (!active) return;
          if (migrated.response.ok && migrated.data?.policy) {
            setPolicy(migrated.data.policy);
            clearLegacyMemoryMode();
            return;
          }
        }

        setPolicy(serverPolicy);
        clearLegacyMemoryMode();
      } catch {
        if (active && legacy) {
          setPolicy(legacy);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const persistPolicy = async (nextPolicy: MemoryPolicy) => {
    const previous = policy;
    setPolicy(nextPolicy);
    setSaving(true);
    try {
      const { response, data } = await updateMemoryPreferences(nextPolicy);
      if (!response.ok || !data?.policy) {
        throw new Error("Failed to save memory policy.");
      }
      setPolicy(data.policy);
      clearLegacyMemoryMode();
      return true;
    } catch {
      setPolicy(previous);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    policy,
    setPolicy: persistPolicy,
    loading,
    saving,
  };
}
