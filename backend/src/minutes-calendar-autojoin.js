import { dbQuery as defaultDbQuery } from "./db.js";

// WP-M10 slice 3 — the standing auto-join consent, the meeting-scope preference,
// and the Hub-side mirror of the user's capture policy.
//
// WHY the mirror (design-review must-fix, attack 2b): the Hub has no engine
// policy READ — capture_enabled + retention + the engine's stored policy_version
// live only in the engine store. An unattended poller therefore can't (a) check
// capture_enabled before spending a paid hold, or (b) re-`ensure` the engine
// policy before firing (needed because the engine compares the attestation's
// policy_version against its STORED one, frozen at the user's last consent — a
// version rotation between connect and meeting would 422 every future auto-join
// forever). So every successful /control/consent mirrors {capture_enabled,
// retention, policy_version} here, and the poller reads it via getAutojoinFireContext.
//
// WHY the standing consent is separate from the per-capture tick: the manual
// path's visible_bot_attested is an in-session affirmation with no persisted
// version. A scheduler has no session, so it needs a standing, versioned,
// revocable proof a human affirmed the visible-bot terms. Bump the version to
// force re-consent.
export const MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION = "2026-07-23.calendar-autojoin-consent.v1";

export const CALENDAR_JOIN_SCOPES = ["organizer", "accepted", "all"];
export const DEFAULT_JOIN_SCOPE = "accepted";

export const MINUTES_CALENDAR_AUTOJOIN_DDL = `
CREATE TABLE IF NOT EXISTS zaki_calendar_autojoin (
  user_id BIGINT PRIMARY KEY REFERENCES zaki_users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  join_scope TEXT NOT NULL DEFAULT 'accepted' CHECK (join_scope IN ('organizer','accepted','all')),
  consent_version TEXT,
  consent_at TIMESTAMPTZ,
  -- Hub mirror of the engine capture policy, refreshed on every successful ensure.
  mirror_capture_enabled BOOLEAN,
  mirror_agent_read_enabled BOOLEAN,
  mirror_audio_days INTEGER,
  mirror_transcript_days INTEGER,
  mirror_summary_days INTEGER,
  mirror_policy_version TEXT,
  mirror_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Additive column for tables created before the settings UI reflected agent-read.
ALTER TABLE zaki_calendar_autojoin ADD COLUMN IF NOT EXISTS mirror_agent_read_enabled BOOLEAN;
-- Append-only audit: the standing consent must be provable for compliance.
CREATE TABLE IF NOT EXISTS zaki_calendar_autojoin_events (
  event_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('consent_granted','consent_withdrawn','scope_changed','policy_mirrored')),
  consent_version TEXT,
  join_scope TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zaki_calendar_autojoin_events_user
  ON zaki_calendar_autojoin_events (user_id, at DESC);
`;

export class MinutesCalendarAutojoinError extends Error {
  constructor(message, { code = "calendar_autojoin_error" } = {}) {
    super(message);
    this.name = "MinutesCalendarAutojoinError";
    this.code = code;
  }
}

function requireUserId(userId) {
  if (!/^[1-9][0-9]{0,18}$/.test(String(userId || ""))) {
    throw new MinutesCalendarAutojoinError("A valid user id is required.", { code: "calendar_autojoin_user_invalid" });
  }
  return String(userId);
}

function normalizeScope(value) {
  const s = String(value || "").trim().toLowerCase();
  return CALENDAR_JOIN_SCOPES.includes(s) ? s : null;
}

// Save/replace the standing auto-join consent + scope. Enabling records
// consent at the CURRENT version; disabling withdraws it. Audited both ways.
export async function saveAutojoinConsent(
  { userId, enabled, joinScope },
  { dbQuery = defaultDbQuery, now = () => new Date() } = {}
) {
  const uid = requireUserId(userId);
  const on = Boolean(enabled);
  const scope = normalizeScope(joinScope) || DEFAULT_JOIN_SCOPE;
  const version = on ? MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION : null;
  const at = on ? now() : null;
  // Single statement (data-modifying CTE) so the state upsert and the append-only
  // audit row commit atomically — the consent audit must never diverge from state.
  await dbQuery(
    `WITH up AS (
       INSERT INTO zaki_calendar_autojoin (user_id, enabled, join_scope, consent_version, consent_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         join_scope = EXCLUDED.join_scope,
         consent_version = EXCLUDED.consent_version,
         consent_at = EXCLUDED.consent_at,
         updated_at = NOW()
       RETURNING user_id
     )
     INSERT INTO zaki_calendar_autojoin_events (user_id, event, consent_version, join_scope)
     SELECT user_id, $6, $4, $3 FROM up`,
    [uid, on, scope, version, at, on ? "consent_granted" : "consent_withdrawn"]
  );
}

// Refresh the Hub capture-policy mirror. Called after a successful /control/consent
// ensure. Never creates a row that "enables" auto-join — only fills the mirror.
export async function mirrorCapturePolicy(
  { userId, captureEnabled, agentReadEnabled, retention, policyVersion },
  { dbQuery = defaultDbQuery } = {}
) {
  const uid = requireUserId(userId);
  const r = retention || {};
  await dbQuery(
    `WITH up AS (
       INSERT INTO zaki_calendar_autojoin
         (user_id, mirror_capture_enabled, mirror_agent_read_enabled, mirror_audio_days,
          mirror_transcript_days, mirror_summary_days, mirror_policy_version, mirror_updated_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         mirror_capture_enabled = EXCLUDED.mirror_capture_enabled,
         mirror_agent_read_enabled = EXCLUDED.mirror_agent_read_enabled,
         mirror_audio_days = EXCLUDED.mirror_audio_days,
         mirror_transcript_days = EXCLUDED.mirror_transcript_days,
         mirror_summary_days = EXCLUDED.mirror_summary_days,
         mirror_policy_version = EXCLUDED.mirror_policy_version,
         mirror_updated_at = NOW(),
         updated_at = NOW()
       RETURNING user_id
     )
     INSERT INTO zaki_calendar_autojoin_events (user_id, event, consent_version)
     SELECT user_id, 'policy_mirrored', $7 FROM up`,
    [uid, Boolean(captureEnabled), Boolean(agentReadEnabled),
      Number.isFinite(Number(r.audio_days)) ? Number(r.audio_days) : null,
      Number.isFinite(Number(r.transcript_days)) ? Number(r.transcript_days) : null,
      Number.isFinite(Number(r.summary_days)) ? Number(r.summary_days) : null,
      policyVersion ? String(policyVersion) : null]
  );
}

// The saved capture consent for the settings UI to reflect, so the form stops
// resetting its checkboxes to unchecked (re-saving blank silently disables
// consent). Booleans only; a missing row or NULL mirror reads as false.
// ponytail: reads the Hub mirror, not the engine — zaki-control.v1 has no
// policy-read; the mirror is refreshed on every successful consent ensure.
export async function getMinutesConsentMirror({ userId }, deps = {}) {
  const row = await getRow({ userId }, deps);
  return {
    captureEnabled: row?.mirror_capture_enabled === true,
    agentReadEnabled: row?.mirror_agent_read_enabled === true,
  };
}

async function getRow({ userId }, { dbQuery = defaultDbQuery } = {}) {
  const { rows } = await dbQuery(`SELECT * FROM zaki_calendar_autojoin WHERE user_id = $1`, [String(userId)]);
  return rows[0] || null;
}

// User-facing settings view. Mirrors legal-consent's buildConsentStatus shape.
export async function getAutojoinStatus({ userId }, deps = {}) {
  const row = await getRow({ userId }, deps);
  const consentVersion = row?.consent_version || null;
  const consentedAt = row?.consent_at ? new Date(row.consent_at).toISOString() : null;
  const isCurrent = Boolean(consentVersion && consentVersion === MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION);
  return {
    enabled: Boolean(row?.enabled) && isCurrent, // a stale-consent row is not "on"
    joinScope: row?.join_scope || DEFAULT_JOIN_SCOPE,
    consentVersion: MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION,
    hasConsent: Boolean(consentVersion && consentedAt),
    isCurrent,
    requiresReconsent: Boolean(row?.enabled) && !isCurrent,
    consentedAt,
  };
}

// The poller's decision surface for a user. shouldFire requires ALL of: auto-join
// enabled, standing consent at the CURRENT version, and the mirrored engine policy
// says capture is enabled. Returns the mirrored policy so the poller can re-ensure
// it before firing (keeping the engine's stored policy_version fresh).
export async function getAutojoinFireContext({ userId }, deps = {}) {
  const row = await getRow({ userId }, deps);
  if (!row) return { shouldFire: false, reason: "not_configured" };
  const consentCurrent = row.consent_version === MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION;
  const captureEnabled = row.mirror_capture_enabled === true;
  const reason = !row.enabled ? "disabled"
    : !consentCurrent ? "consent_stale"
    : !captureEnabled ? "capture_disabled"
    : row.mirror_policy_version == null ? "policy_unmirrored"
    : null;
  return {
    shouldFire: reason === null,
    reason,
    joinScope: row.join_scope || DEFAULT_JOIN_SCOPE,
    policy: {
      captureEnabled,
      policyVersion: row.mirror_policy_version || null,
      retention: {
        audio_days: row.mirror_audio_days,
        transcript_days: row.mirror_transcript_days,
        summary_days: row.mirror_summary_days,
      },
    },
  };
}
