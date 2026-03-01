const RESPONSE_FORMATTING_STORAGE_KEY = "zaki.responseFormattingConfig";
export const RESPONSE_FORMATTING_EVENT = "zaki:response-formatting-config-changed";

export type ResponseFormattingConfig = {
  disableResponseEnvelope: boolean;
};

const DEFAULT_CONFIG: ResponseFormattingConfig = {
  disableResponseEnvelope: false,
};

export function readResponseFormattingConfig(): ResponseFormattingConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(RESPONSE_FORMATTING_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ResponseFormattingConfig>;
    return {
      disableResponseEnvelope: parsed.disableResponseEnvelope === true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeResponseFormattingConfig(config: ResponseFormattingConfig) {
  if (typeof window === "undefined") return;
  const normalized: ResponseFormattingConfig = {
    disableResponseEnvelope: config.disableResponseEnvelope === true,
  };
  window.localStorage.setItem(
    RESPONSE_FORMATTING_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  window.dispatchEvent(
    new CustomEvent(RESPONSE_FORMATTING_EVENT, {
      detail: normalized,
    })
  );
}
