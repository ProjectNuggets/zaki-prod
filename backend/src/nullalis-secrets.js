// Two-phase secret vault flow (D8, NULL-ALIS#11).
//
// Nullalis /api/v1/users/:id/secrets/:key PUT and DELETE require a
// confirmation_token issued by a prior POST /prepare call. The BFF
// runs the pairing internally so clients stay ignorant of the dance.

export async function prepareAndApplySecret({ callNullclaw, userId, key, action, value }) {
  if (action !== "put" && action !== "delete") {
    return { status: 500, body: { error: "invalid_action" } };
  }
  if (action === "put" && typeof value !== "string") {
    return { status: 400, body: { error: "value_required" } };
  }

  const userPath = `/api/v1/users/${encodeURIComponent(userId)}/secrets/${encodeURIComponent(key)}`;

  const prepare = await callNullclaw({
    method: "POST",
    path: `${userPath}/prepare`,
    body: { action },
  });
  if (!prepare.ok) {
    return {
      status: prepare.status || 502,
      body: prepare.data || { error: "secret_prepare_failed" },
    };
  }
  const token = prepare.data?.token;
  if (typeof token !== "string" || token.length === 0) {
    return { status: 502, body: { error: "secret_prepare_missing_token" } };
  }

  // Safe retry policy: the second call is NOT retried here. If it fails
  // with a 5xx the caller re-drives from prepare, which burns the spent
  // token but avoids the far worse case of a reused token reaching
  // nullalis (token_invalid) or acting on the wrong value.
  const applyBody =
    action === "put"
      ? { value, confirmation_token: token }
      : { confirmation_token: token };
  const apply = await callNullclaw({
    method: action === "put" ? "PUT" : "DELETE",
    path: userPath,
    body: applyBody,
  });
  return { status: apply.status, body: apply.data };
}
