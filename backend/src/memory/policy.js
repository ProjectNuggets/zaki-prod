export const MEMORY_POLICY_IDS = [
  "balanced",
  "ask_before_saving",
  "save_less",
  "save_more",
  "off",
];

const LEGACY_MEMORY_MODE_TO_POLICY = {
  autosave: "balanced",
  manual: "ask_before_saving",
};

export function normalizeMemoryPolicy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "balanced";
  if (normalized in LEGACY_MEMORY_MODE_TO_POLICY) {
    return LEGACY_MEMORY_MODE_TO_POLICY[normalized];
  }
  return MEMORY_POLICY_IDS.includes(normalized) ? normalized : null;
}

export function buildMemoryCapturePolicyConfig(policyId) {
  const normalized = normalizeMemoryPolicy(policyId) || "balanced";
  switch (normalized) {
    case "off":
      return { id: "off", disabled: true };
    case "ask_before_saving":
      return {
        id: normalized,
        alwaysReview: true,
        reviewIfConfidenceMissing: true,
      };
    case "save_less":
      return {
        id: normalized,
        autoSaveMinConfidence: 0.93,
        reviewIfConfidenceMissing: true,
      };
    case "save_more":
      return {
        id: normalized,
        autoSaveMinConfidence: 0.78,
        reviewIfConfidenceMissing: true,
      };
    case "balanced":
    default:
      return {
        id: "balanced",
      };
  }
}
