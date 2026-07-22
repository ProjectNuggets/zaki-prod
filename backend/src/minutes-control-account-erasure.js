// Account deletion must not infer that a dark control gate means no historical
// Minutes raw-store data exists. A prior capture binding is durable evidence;
// without live control credentials the safe outcome is a retryable refusal.
export async function resolveMinutesControlAccountErasure({
  controlActive,
  zakiUser,
  requestId,
  hasAccountState,
  eraseAccount,
} = {}) {
  if (controlActive) {
    return eraseAccount({ zakiUser, requestId });
  }
  if (typeof hasAccountState !== "function") {
    throw new Error("Minutes account-state lookup is required while control is dark.");
  }
  const hasExistingState = await hasAccountState({
    userId: String(zakiUser?.id || ""),
    tenantId: "default",
  });
  if (!hasExistingState) {
    return { attempted: false, ok: true, reason: "minutes_control_not_ready" };
  }
  return {
    attempted: false,
    ok: false,
    status: 503,
    retryable: true,
    reason: "minutes_control_erasure_unavailable",
  };
}
