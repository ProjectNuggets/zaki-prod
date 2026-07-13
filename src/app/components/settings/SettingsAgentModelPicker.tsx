import { V2Badge } from "@/app/components/v2";
import type { BotSettingsProfile } from "@/lib/api";

import { V2SettingsRow } from "./V2SettingsPrimitives";

export const AGENT_MODEL_OPTIONS = [
  { id: "kimi-k2.6", label: "Kimi K2.6", context: "256K", cost: "A" },
  { id: "kimi-k2.5", label: "Kimi K2.5", context: "256K", cost: "A" },
  { id: "claude-opus-4.7", label: "Claude Opus 4.7", context: "1M", cost: "C" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", context: "1M", cost: "B" },
  { id: "claude-opus-4.6", label: "Claude Opus 4.6", context: "1M", cost: "C" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", context: "1M", cost: "B" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", context: "200K", cost: "A" },
  { id: "gpt-5.2", label: "GPT-5.2", context: "128K", cost: "C" },
  { id: "gpt-4.1", label: "GPT-4.1", context: "128K", cost: "B" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", context: "512K", cost: "A" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", context: "512K", cost: "A" },
] as const;

export function SettingsAgentModelPicker({
  value,
  disabled,
  onChange,
}: {
  value: BotSettingsProfile["selected_model"];
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  const selected = AGENT_MODEL_OPTIONS.find((model) => model.id === value);

  return (
    <V2SettingsRow
      name="Default model"
      description="Choose the allowlisted model used for new Agent turns. The operator default applies when no override is selected."
    >
      <div className="zaki-settings-v2__actions zaki-settings-v2__actions--with-note">
        <select
          className="v2-input"
          aria-label="Default model"
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">Automatic · Kimi K2.6</option>
          {AGENT_MODEL_OPTIONS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} · {model.context} · cost {model.cost}
            </option>
          ))}
        </select>
        {selected ? (
          <V2Badge>
            {selected.context} · cost {selected.cost}
          </V2Badge>
        ) : null}
      </div>
    </V2SettingsRow>
  );
}
