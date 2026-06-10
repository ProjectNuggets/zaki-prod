export const MEMORY_POLICY_IDS = ["balanced", "off"];

// Memory capture is now binary (on/off). Any legacy/retired policy id resolves
// to "balanced" (on) so previously-stored preferences keep working; only "off"
// disables capture.
const LEGACY_MEMORY_MODE_TO_POLICY = {
  autosave: "balanced",
  manual: "balanced",
  ask_before_saving: "balanced",
  save_less: "balanced",
  save_more: "balanced",
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
  if (normalized === "off") {
    return { id: "off", disabled: true };
  }
  return { id: "balanced" };
}
