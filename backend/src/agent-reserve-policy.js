export const AGENT_RESERVE_UNITS_DEFAULT = 40;

export function resolveAgentReserveUnits(env = process.env) {
  const override = Number(env?.ZAKI_AGENT_RESERVE_UNITS);
  if (!Number.isFinite(override) || override < 1 || !Number.isInteger(override)) {
    return AGENT_RESERVE_UNITS_DEFAULT;
  }
  return override;
}
