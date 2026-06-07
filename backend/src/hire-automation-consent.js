export const HIRE_AUTOMATION_CONSENT_VERSION = "2026-05-20.hire-automation-consent.v1";

const CONSENT_ACTIONS = new Set(["form_read", "apply_preview", "auto_apply"]);
const AUDIT_STATUSES = new Set(["consented", "blocked_consent_missing"]);

function normalizeAction(value) {
  const action = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CONSENT_ACTIONS.has(action) ? action : null;
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return AUDIT_STATUSES.has(status) ? status : "blocked_consent_missing";
}

function normalizeUserId(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || /^0+$/.test(text)) return null;
  return text;
}

function normalizeText(value, maxLength = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

function getHeader(req, name) {
  if (typeof req?.get === "function") {
    return req.get(name);
  }
  const lower = String(name || "").toLowerCase();
  for (const [key, value] of Object.entries(req?.headers || {})) {
    if (String(key).toLowerCase() === lower) {
      return Array.isArray(value) ? value.join(",") : value;
    }
  }
  return "";
}

function normalizeConsentObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function readBodyConsent(req) {
  const body = req?.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body
    : {};
  return normalizeConsentObject(body.zakiHireConsent || body.zaki_hire_consent);
}

export function resolveHireAutomationConsent(req = {}, requirement = {}) {
  const expectedAction = normalizeAction(requirement.action);
  if (!expectedAction) {
    return { accepted: false, source: null, reason: "unknown_action" };
  }

  const headerAction = normalizeAction(getHeader(req, "X-Zaki-Hire-Consent"));
  if (headerAction === expectedAction) {
    return { accepted: true, source: "header", action: expectedAction };
  }

  const bodyConsent = readBodyConsent(req);
  if (!bodyConsent) {
    return { accepted: false, source: null, reason: "missing" };
  }

  const bodyAction = normalizeAction(bodyConsent.action || bodyConsent.scope || expectedAction);
  const accepted = bodyConsent.accepted === true || bodyConsent.confirmed === true;
  if (accepted && bodyAction === expectedAction) {
    return { accepted: true, source: "body", action: expectedAction };
  }

  return {
    accepted: false,
    source: "body",
    reason: accepted ? "action_mismatch" : "not_accepted",
  };
}

export function buildHireAutomationConsentRequiredPayload({
  requestId,
  requirement,
} = {}) {
  return {
    code: "hire_automation_consent_required",
    error: "Hire automation consent is required.",
    message: "Confirm this Hire automation action before continuing.",
    action: requirement?.action || null,
    route: requirement?.routeTemplate || null,
    requestId,
  };
}

export function buildHireAutomationAuditUnavailablePayload(requestId) {
  return {
    code: "hire_automation_audit_unavailable",
    error: "Hire automation audit is unavailable.",
    message: "Hire automation is temporarily unavailable because the audit record could not be written.",
    retryable: true,
    requestId,
  };
}

export async function recordHireAutomationAuditEvent({
  dbQuery,
  zakiUser,
  requirement,
  status,
  requestId,
  consentSource = null,
  reason = null,
} = {}) {
  if (typeof dbQuery !== "function") {
    throw new Error("dbQuery is required.");
  }
  const userId = normalizeUserId(zakiUser?.id);
  if (!userId) {
    throw new Error("hire audit requires canonical user id.");
  }
  const action = normalizeAction(requirement?.action);
  if (!action) {
    throw new Error("hire audit requires known action.");
  }

  const details = {
    schemaVersion: HIRE_AUTOMATION_CONSENT_VERSION,
    consentSource: normalizeText(consentSource, 40),
    reason: normalizeText(reason, 80),
    method: normalizeText(requirement?.method, 16),
  };

  await dbQuery(
    `INSERT INTO zaki_hire_audit_events
      (user_id, action, status, request_id, lead_id, source_route, details_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`,
    [
      userId,
      action,
      normalizeStatus(status),
      normalizeText(requestId, 120),
      normalizeText(requirement?.leadId, 160),
      normalizeText(requirement?.routeTemplate, 240),
      JSON.stringify(details),
    ]
  );
}
