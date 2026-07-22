import fs from "node:fs";
import pg from "pg";
import { startPostgresNotificationListener } from "./db-notifications.js";

let pool = null;

function enabledFlag(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

// The control BFF cannot safely run without both its wallet hold tables and
// callback/idempotency tables. Keep this local to db.js to avoid importing the
// control router (which itself imports database-backed state).
export function isMinutesControlSchemaRequired(env = process.env) {
  return enabledFlag(env.ZAKI_MINUTES_CONTROL_ENABLED) && enabledFlag(env.ZAKI_MINUTES_CONTROL_STAGING_READY);
}

export function failClosedMinutesControlSchema(schema, cause, env = process.env) {
  if (!isMinutesControlSchemaRequired(env)) return;
  const error = new Error(`Minutes control is active but required ${schema} schema migration failed.`);
  error.cause = cause;
  throw error;
}

export async function listenForDbNotifications(channel, onPayload, options = {}) {
  if (!pool) throw new Error("Database is not initialized.");
  return startPostgresNotificationListener({
    connect: () => pool.connect(),
    channel,
    onPayload,
    ...options,
  });
}

export async function initDb() {
  const connectionString = (process.env.DATABASE_URL || "").trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    const useSSL =
      String(process.env.PGSSLMODE || "").toLowerCase() === "require";
    const sslRejectUnauthorized =
      String(process.env.PGSSL_REJECT_UNAUTHORIZED || "true")
        .toLowerCase()
        .trim() !== "false";
    const inlineCa = String(process.env.PGSSL_CA || "").trim();
    const rootCertPath = String(process.env.PGSSLROOTCERT || "").trim();
    const loadedCa =
      !inlineCa && rootCertPath
        ? fs.readFileSync(rootCertPath, "utf8")
        : inlineCa;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && useSSL && !sslRejectUnauthorized) {
      throw new Error(
        "In production, PGSSL_REJECT_UNAUTHORIZED must not be false."
      );
    }

    const sslConfig = useSSL
      ? {
          rejectUnauthorized: sslRejectUnauthorized,
          ...(loadedCa ? { ca: loadedCa } : {}),
        }
      : undefined;
    const { Pool } = pg;
    pool = new Pool({
      connectionString,
      ssl: sslConfig,
    });
  }

  // Serialize schema migration across replicas (minReplicas=3): only one
  // boot runs the idempotent DDL at a time. The lock is session-scoped, so
  // it is pinned to a single checked-out client for the whole migration
  // (a pg.Pool does not guarantee the same physical connection across
  // separate pool.query calls). Released in the finally below.
  // 8534127 is an arbitrary fixed app key (must match the unlock call).
  const MIGRATION_LOCK_KEY = 8534127;
  const migrationClient = await pool.connect();
  try {
    // Fail-fast backstop: a hung DDL/lock-wait would otherwise block every other
    // replica on the advisory lock forever. On timeout the query errors → initDb
    // throws → boot exit(1) → session ends → advisory lock auto-releases.
    await migrationClient.query("SET statement_timeout = '120s'");
    await migrationClient.query("SELECT pg_advisory_lock($1)", [
      MIGRATION_LOCK_KEY,
    ]);

    // Check for pgvector extension
    try {
      const result = await migrationClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as has_vector;
      `);
      if (result.rows[0]?.has_vector) {
        console.log("[DB] pgvector extension detected ✓");
      } else {
        console.warn("[DB] pgvector extension not installed");
        console.warn("[DB] Run: CREATE EXTENSION vector; in the zaki database");
      }
    } catch (err) {
      console.warn("[DB] Could not check for pgvector:", err.message);
    }

  // Users table
  //
  // date_of_birth is DEPRECATED and UNUSED as of WP-M — see the ALTER below.
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      date_of_birth TEXT,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      nova_user_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_admin_members (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_admin_members_active_role
    ON zaki_admin_members (active, role);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_workspace_metadata (
      workspace_slug TEXT PRIMARY KEY,
      description TEXT,
      icon TEXT,
      color TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_spaces_defaults (
      zaki_user_id BIGINT PRIMARY KEY REFERENCES zaki_users(id) ON DELETE CASCADE,
      nova_user_id BIGINT,
      workspace_slug TEXT NOT NULL,
      thread_slug TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      return_to TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);
  await migrationClient.query(
    "ALTER TABLE verification_tokens ADD COLUMN IF NOT EXISTS return_to TEXT;"
  );

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS full_name TEXT;");
  // ---------------------------------------------------------------------------
  // DEPRECATED — zaki_users.date_of_birth (WP-M, GDPR Art. 5(1)(c))
  //
  // ZAKI no longer collects a date of birth: the age gate is off, so the value was
  // gathered and never enforced, which makes it a liability rather than an asset.
  // The signup form, request payload, Zod schema and every INSERT/UPDATE that
  // touched this column are gone (see email-signup-user.js). Nothing reads it
  // either — neither ZAKI_USER_COLUMNS (require-auth-user.js) nor _ZAKI_USER_COLS
  // (index.js) selects it.
  //
  // This is the "stop writing" half of an expand-contract removal. The column is
  // retained here, unused, so that:
  //   * schemas stay identical across prod / staging / a fresh dev DB, and
  //   * legacy rows are not destroyed by a deploy.
  //
  // CONTRACT STEP — NOT APPLIED. Dropping the column destroys the birthdates of
  // every existing account, which is irreversible and needs the owner's explicit
  // say-so. When approved, the whole migration is one statement:
  //
  //     ALTER TABLE zaki_users DROP COLUMN IF EXISTS date_of_birth;
  //
  // (Reversible only in structure — `ADD COLUMN date_of_birth TEXT` restores the
  // column but not the data, so take a backup first. Data minimisation says the
  // data SHOULD go; this is a decision, not an accident, hence it waits.)
  // ---------------------------------------------------------------------------
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS google_sub TEXT;");
  await migrationClient.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_zaki_users_google_sub
      ON zaki_users (google_sub)
      WHERE google_sub IS NOT NULL;
  `);
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS auth_provider TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_product_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS meter_entitlement_started_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_last_event_created_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_last_event_id TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_code_campaign TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_code_last TEXT;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT FALSE;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS student_verified_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS legal_consent_at TIMESTAMPTZ;");
  await migrationClient.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS legal_consent_version TEXT;");

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS legal_consent_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      policy_version TEXT NOT NULL,
      source TEXT NOT NULL,
      consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_legal_consent_events_user
    ON legal_consent_events (user_id, consented_at DESC);
  `);

  // Shared conversations table
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS shared_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT UNIQUE NOT NULL,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      workspace_slug TEXT NOT NULL,
      thread_slug TEXT NOT NULL,
      title TEXT,
      conversation_snapshot JSONB NOT NULL,
      is_password_protected BOOLEAN NOT NULL DEFAULT FALSE,
      password_hash TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  
  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_conversations_token ON shared_conversations(token);
  `);
  
  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_conversations_user_id ON shared_conversations(user_id);
  `);

  // Access codes (campaign-based, monthly)
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS access_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      campaign TEXT NOT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      max_redemptions INT,
      redeemed_count INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS access_code_redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      access_expires_at TIMESTAMPTZ NOT NULL,
      campaign TEXT,
      code TEXT
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_access_codes_code_normalized
    ON access_codes (UPPER(regexp_replace(code, '[\\s-]+', '', 'g')));
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_access_redemptions_user ON access_code_redemptions(user_id);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_learning_account_audit_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
      subject_hash TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT,
      details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_learning_account_audit_subject
    ON zaki_learning_account_audit_events(subject_hash, created_at DESC, id DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_account_erasure_receipts (
      id BIGSERIAL PRIMARY KEY,
      subject_hash TEXT NOT NULL,
      request_id TEXT,
      engine_manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      spoke_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      hub_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_account_erasure_receipts_subject
    ON zaki_account_erasure_receipts(subject_hash, created_at DESC, id DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_learning_study_profiles (
      user_id BIGINT PRIMARY KEY REFERENCES zaki_users(id) ON DELETE CASCADE,
      profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_learning_study_plans (
      id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_learning_study_plans_user_status
    ON zaki_learning_study_plans(user_id, status, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_learning_study_tasks (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES zaki_learning_study_plans(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'study',
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'error', 'skipped')),
      source_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      due_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_learning_study_tasks_user_plan
    ON zaki_learning_study_tasks(user_id, plan_id, created_at ASC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_design_projects (
      project_id TEXT PRIMARY KEY,
      owner_user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'provisioning'
        CHECK (status IN ('provisioning', 'active', 'deleted', 'failed')),
      source TEXT NOT NULL DEFAULT 'zaki-design-engine',
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_design_projects_owner_status
    ON zaki_design_projects(owner_user_id, status, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_design_project_roles (
      project_id TEXT NOT NULL REFERENCES zaki_design_projects(project_id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (project_id, user_id)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_design_project_roles_user
    ON zaki_design_project_roles(user_id, role, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_design_project_audit_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT REFERENCES zaki_users(id) ON DELETE SET NULL,
      project_id TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      request_id TEXT,
      details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_design_project_audit_user_created
    ON zaki_design_project_audit_events(user_id, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_design_sessions (
      session_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES zaki_design_projects(project_id) ON DELETE CASCADE,
      owner_user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'REQUESTED'
        CHECK (state IN (
          'REQUESTED', 'STARTING', 'RESTORING', 'READY', 'ACTIVE',
          'IDLE', 'DRAINING', 'CHECKPOINTING', 'STOPPED', 'FAILED'
        )),
      checkpoint_generation BIGINT NOT NULL DEFAULT 0 CHECK (checkpoint_generation >= 0),
      checkpoint_sha256 TEXT,
      checkpoint_bytes BIGINT CHECK (checkpoint_bytes IS NULL OR checkpoint_bytes >= 0),
      checkpoint_object_key TEXT,
      last_request_id TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      stopped_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_design_sessions_owner_state
    ON zaki_design_sessions(owner_user_id, state, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS access_code_orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      checkout_session_id TEXT NOT NULL UNIQUE,
      stripe_event_id TEXT,
      stripe_payment_intent_id TEXT,
      amount_total_cents INT,
      currency TEXT,
      campaign TEXT NOT NULL,
      duration_days INT NOT NULL DEFAULT 30,
      code_id UUID REFERENCES access_codes(id) ON DELETE SET NULL,
      email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
      email_attempts INT NOT NULL DEFAULT 0,
      last_email_error TEXT,
      fulfilled_at TIMESTAMPTZ,
      email_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_access_code_orders_user_created
    ON access_code_orders (user_id, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_access_code_orders_email_status_updated
    ON access_code_orders (email_status, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS billing_topup_orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      checkout_session_id TEXT NOT NULL UNIQUE,
      stripe_event_id TEXT,
      stripe_payment_intent_id TEXT,
      pack_id TEXT NOT NULL,
      units DOUBLE PRECISION NOT NULL CHECK (units > 0),
      amount_total_cents INT,
      currency TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'failed')),
      fulfilled_at TIMESTAMPTZ,
      failure_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_billing_topup_orders_user_created
    ON billing_topup_orders (user_id, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS billing_webhook_events (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, event_id)
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS product_analytics_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      source TEXT NOT NULL,
      language TEXT,
      viewport TEXT,
      plan TEXT,
      billing_interval TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_product_analytics_events_created_at
    ON product_analytics_events (created_at DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_product_analytics_events_user_event
    ON product_analytics_events (user_id, event, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_usage_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      surface TEXT NOT NULL,
      event_type TEXT NOT NULL,
      usage_unit_type TEXT NOT NULL DEFAULT 'request',
      usage_units NUMERIC(12, 4) NOT NULL DEFAULT 1,
      plan_id TEXT,
      entitlement TEXT,
      quota_bucket TEXT,
      quota_period TEXT,
      quota_limit INT,
      quota_used INT,
      quota_remaining INT,
      request_id TEXT,
      source_route TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_usage_events_created_at
    ON zaki_usage_events (created_at DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_usage_events_user_product
    ON zaki_usage_events (user_id, product_id, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_usage_events_surface_event
    ON zaki_usage_events (surface, event_type, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_hire_audit_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT,
      lead_id TEXT,
      source_route TEXT,
      details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_hire_audit_events_user_created
    ON zaki_hire_audit_events (user_id, created_at DESC, id DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_hire_audit_events_action_created
    ON zaki_hire_audit_events (action, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS website_feedback_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      body TEXT NOT NULL,
      display_name TEXT,
      status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_website_feedback_posts_visible_created
    ON website_feedback_posts (status, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS website_feedback_votes (
      post_id UUID NOT NULL REFERENCES website_feedback_posts(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, client_id)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_website_feedback_votes_post
    ON website_feedback_votes (post_id, updated_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS website_beta_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      role TEXT,
      use_case TEXT,
      locale TEXT,
      source TEXT,
      submission_count INT NOT NULL DEFAULT 1,
      first_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS name TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS role TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS use_case TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS locale TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS source TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS submission_count INT NOT NULL DEFAULT 1;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS first_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS ip_address TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS user_agent TEXT;"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
  );
  await migrationClient.query(
    "ALTER TABLE website_beta_waitlist ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
  );

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_website_beta_waitlist_last_submitted
    ON website_beta_waitlist (last_submitted_at DESC, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_website_beta_waitlist_source
    ON website_beta_waitlist (source, last_submitted_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_bot_messages (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      space_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    ALTER TABLE zaki_bot_messages
      ADD COLUMN IF NOT EXISTS events_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_bot_messages_user_thread
    ON zaki_bot_messages (user_id, space_id, thread_id, id ASC);
  `);

  // --- Anonymous -> account work claim (WP-A) ---
  // A signed-out visitor's conversation lives only in their browser: the
  // anonymous chat handler streams the reply and keeps nothing. When they sign
  // up, the claim carries that saved transcript into a real thread. Upstream
  // (nova-typ) has no message-append API — it only writes a thread message by
  // running the model — so imported turns land here and are merged into the
  // thread history read path.
  //
  // zaki_anonymous_work_claims is the idempotency record: UNIQUE (user_id,
  // claim_key) means re-claiming the same saved work can never create a second
  // thread or a second copy of the messages.
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_anonymous_work_claims (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      claim_key TEXT NOT NULL,
      work_id TEXT,
      workspace_slug TEXT NOT NULL,
      thread_slug TEXT,
      route TEXT NOT NULL,
      imported_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, claim_key)
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_anonymous_work_messages (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      claim_key TEXT NOT NULL,
      workspace_slug TEXT NOT NULL,
      thread_slug TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      context_forwarded_at TIMESTAMPTZ,
      UNIQUE (user_id, claim_key, position)
    );
  `);

  // Existing WP-A databases predate model-context forwarding. This marker is
  // set only after nova-typ accepts a stream request containing the imported
  // transcript, so restarts cannot inject the same transcript on every turn.
  await migrationClient.query(`
    ALTER TABLE zaki_anonymous_work_messages
      ADD COLUMN IF NOT EXISTS context_forwarded_at TIMESTAMPTZ;
  `);

  // A thread-level expiring lease makes imported-context delivery exclusive
  // across concurrent requests and across app replicas. It is released on a
  // failed stream and deleted atomically when exact message IDs are finalized.
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_imported_context_leases (
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      workspace_slug TEXT NOT NULL,
      thread_slug TEXT NOT NULL,
      lease_id UUID NOT NULL,
      lease_expires_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (user_id, workspace_slug, thread_slug)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_anonymous_work_messages_thread
    ON zaki_anonymous_work_messages (user_id, workspace_slug, thread_slug, id ASC);
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_anonymous_work_messages_pending_context
    ON zaki_anonymous_work_messages (user_id, workspace_slug, thread_slug, id ASC)
    WHERE context_forwarded_at IS NULL;
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_bot_threads (
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      space_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, space_id, thread_id)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_bot_threads_user_last_active
    ON zaki_bot_threads (user_id, last_active_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_daily_prompt_usage (
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'shared',
      used_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, usage_date, bucket)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_daily_prompt_usage_date_bucket
    ON zaki_daily_prompt_usage (usage_date, bucket);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_anonymous_prompt_usage (
      anon_key_hash TEXT NOT NULL,
      usage_date DATE NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'anonymous_spaces',
      used_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (anon_key_hash, usage_date, bucket)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_anonymous_prompt_usage_date_bucket
    ON zaki_anonymous_prompt_usage (usage_date, bucket);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_anonymous_device_usage (
      device_signal_hash TEXT NOT NULL,
      usage_date DATE NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'anonymous_spaces_device',
      used_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (device_signal_hash, usage_date, bucket)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_anonymous_device_usage_date_bucket
    ON zaki_anonymous_device_usage (usage_date, bucket);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_rate_limit_hits (
      rate_key TEXT PRIMARY KEY,
      total_hits INT NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_rate_limit_hits_reset_at
    ON zaki_rate_limit_hits (reset_at);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_login_failures (
      email TEXT PRIMARY KEY,
      failure_count INT NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_login_failures_reset_at
    ON zaki_login_failures (reset_at);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_meter_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      identity_type TEXT NOT NULL CHECK (identity_type IN ('user', 'anonymous')),
      user_id BIGINT REFERENCES zaki_users(id) ON DELETE CASCADE,
      anonymous_key_hash TEXT,
      product_id TEXT NOT NULL,
      internal_product_id TEXT NOT NULL,
      action TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      product_state TEXT NOT NULL,
      estimated_units DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_units DOUBLE PRECISION NOT NULL DEFAULT 0,
      request_id TEXT,
      idempotency_key TEXT,
      signed_grant TEXT NOT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (
        (identity_type = 'user' AND user_id IS NOT NULL AND anonymous_key_hash IS NULL) OR
        (identity_type = 'anonymous' AND anonymous_key_hash IS NOT NULL AND user_id IS NULL)
      )
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_meter_grants_user_created
    ON zaki_meter_grants (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_meter_grants_anonymous_created
    ON zaki_meter_grants (anonymous_key_hash, created_at DESC)
    WHERE anonymous_key_hash IS NOT NULL;
  `);

  await migrationClient.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_zaki_meter_grants_user_idempotency
    ON zaki_meter_grants (tenant_id, user_id, product_id, idempotency_key)
    WHERE user_id IS NOT NULL AND idempotency_key IS NOT NULL;
  `);

  await migrationClient.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_zaki_meter_grants_anonymous_idempotency
    ON zaki_meter_grants (tenant_id, anonymous_key_hash, product_id, idempotency_key)
    WHERE anonymous_key_hash IS NOT NULL AND idempotency_key IS NOT NULL;
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_meter_receipts (
      id BIGSERIAL PRIMARY KEY,
      grant_id UUID NOT NULL REFERENCES zaki_meter_grants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      internal_product_id TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
      raw_units DOUBLE PRECISION NOT NULL DEFAULT 0,
      weighted_units DOUBLE PRECISION NOT NULL DEFAULT 0,
      max_units DOUBLE PRECISION,
      max_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
      idempotency_key TEXT NOT NULL,
      raw_facts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (grant_id, idempotency_key)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_meter_receipts_grant_created
    ON zaki_meter_receipts (grant_id, created_at DESC);
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_runtime_settings (
      setting_key TEXT PRIMARY KEY,
      value_json JSONB NOT NULL,
      updated_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_bot_messages_legacy (
      id BIGSERIAL PRIMARY KEY,
      legacy_message_id BIGINT,
      legacy_user_id_text TEXT,
      space_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ,
      quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      quarantine_reason TEXT NOT NULL
    );
  `);

  const zakiBotUserIdType = await migrationClient.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zaki_bot_messages'
      AND column_name = 'user_id'
    LIMIT 1;
  `);
  const currentZakiBotUserIdType = String(zakiBotUserIdType.rows?.[0]?.data_type || "").toLowerCase();
  if (currentZakiBotUserIdType && currentZakiBotUserIdType !== "bigint") {
    await migrationClient.query("BEGIN");
    try {
      await migrationClient.query(`
        CREATE TABLE IF NOT EXISTS zaki_bot_messages_new (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
          space_id TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await migrationClient.query(`
        INSERT INTO zaki_bot_messages_legacy (
          legacy_message_id,
          legacy_user_id_text,
          space_id,
          thread_id,
          role,
          content,
          created_at,
          quarantine_reason
        )
        SELECT
          src.id,
          src.user_id,
          src.space_id,
          src.thread_id,
          src.role,
          src.content,
          src.created_at,
          CASE
            WHEN src.user_id IS NULL OR btrim(src.user_id) = '' THEN 'empty_user_id'
            WHEN src.user_id !~ '^[0-9]{1,18}$' THEN 'non_numeric_user_id'
            WHEN usr.id IS NULL THEN 'user_not_found'
            ELSE 'unknown'
          END AS quarantine_reason
        FROM zaki_bot_messages src
        LEFT JOIN zaki_users usr
          ON (src.user_id ~ '^[0-9]{1,18}$' AND usr.id = src.user_id::BIGINT)
        WHERE NOT (
          src.user_id ~ '^[0-9]{1,18}$'
          AND usr.id IS NOT NULL
        );
      `);

      await migrationClient.query(`
        INSERT INTO zaki_bot_messages_new (
          id,
          user_id,
          space_id,
          thread_id,
          role,
          content,
          created_at
        )
        SELECT
          src.id,
          src.user_id::BIGINT,
          src.space_id,
          src.thread_id,
          src.role,
          src.content,
          src.created_at
        FROM zaki_bot_messages src
        INNER JOIN zaki_users usr
          ON usr.id = src.user_id::BIGINT
        WHERE src.user_id ~ '^[0-9]{1,18}$';
      `);

      await migrationClient.query("DROP TABLE zaki_bot_messages;");
      await migrationClient.query("ALTER TABLE zaki_bot_messages_new RENAME TO zaki_bot_messages;");
      await migrationClient.query(`
        CREATE INDEX IF NOT EXISTS idx_zaki_bot_messages_user_thread
        ON zaki_bot_messages (user_id, space_id, thread_id, id ASC);
      `);
      await migrationClient.query(`
        SELECT setval(
          pg_get_serial_sequence('zaki_bot_messages', 'id'),
          GREATEST(COALESCE((SELECT MAX(id) FROM zaki_bot_messages), 0), 1),
          true
        );
      `);
      await migrationClient.query("COMMIT");
      console.log("[DB] Migrated zaki_bot_messages.user_id to BIGINT with quarantine handling.");
    } catch (error) {
      await migrationClient.query("ROLLBACK");
      throw error;
    }
  }

  const zakiBotIdSeqResult = await migrationClient.query(`
    SELECT pg_get_serial_sequence('zaki_bot_messages', 'id') AS seq;
  `);
  let zakiBotIdSeq = String(zakiBotIdSeqResult.rows?.[0]?.seq || "").trim();
  if (!zakiBotIdSeq) {
    await migrationClient.query("BEGIN");
    try {
      await migrationClient.query(`
        CREATE SEQUENCE IF NOT EXISTS zaki_bot_messages_id_seq;
      `);
      await migrationClient.query(`
        ALTER TABLE zaki_bot_messages
        ALTER COLUMN id SET DEFAULT nextval('zaki_bot_messages_id_seq');
      `);
      await migrationClient.query(`
        ALTER SEQUENCE zaki_bot_messages_id_seq
        OWNED BY zaki_bot_messages.id;
      `);
      await migrationClient.query("COMMIT");
      zakiBotIdSeq = "public.zaki_bot_messages_id_seq";
      console.log("[DB] Repaired zaki_bot_messages.id auto-increment sequence.");
    } catch (error) {
      await migrationClient.query("ROLLBACK");
      throw error;
    }
  }

  await migrationClient.query(
    `
      SELECT setval(
        $1::regclass,
        GREATEST(COALESCE((SELECT MAX(id) FROM zaki_bot_messages), 0), 1),
        true
      );
    `,
    [zakiBotIdSeq]
  );

  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_hidden_workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      workspace_slug TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, workspace_slug)
    );
  `);

  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_hidden_workspaces_user
    ON zaki_hidden_workspaces (user_id, created_at DESC);
  `);

  // Memories table with vector support
  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'context',
        embedding vector(384),
        embedding_provider TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // P0 Enhancement: Add importance scoring and access tracking columns
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS importance_score FLOAT DEFAULT 0.5;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.8;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS decay_rate FLOAT DEFAULT 0.01;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS user_verified BOOLEAN DEFAULT FALSE;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_thread_id TEXT;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_message_id TEXT;`);
    await migrationClient.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);
    
    // Create indexes for efficient querying
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    `);
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(user_id, content_hash);
    `);
    // Enforce exact dedupe integrity at DB layer.
    await migrationClient.query(`
      DELETE FROM memories older
      USING memories newer
      WHERE older.user_id = newer.user_id
        AND older.content_hash = newer.content_hash
        AND (
          older.created_at < newer.created_at
          OR (older.created_at = newer.created_at AND older.id < newer.id)
        );
    `);
    await migrationClient.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_user_content_hash_unique
      ON memories(user_id, content_hash);
    `);
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance_score DESC);
    `);
    // Speeds active-only filters (findConflict, identity core, retrieval) and the
    // outdated-row retention sweep (pruneOutdatedMemories).
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status);
    `);
    // Conflict-key lookup for findConflict's subject-scoped supersede. Lives in the
    // memories block (not a review-flow table block) so it survives that cleanup.
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_conflict_key
      ON memories ((metadata->>'conflictKey'));
    `);

    // Vector similarity index (IVFFlat for approximate search)
    try {
      await migrationClient.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_embedding 
        ON memories USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
    } catch {
      // IVFFlat requires data to exist, use HNSW instead
      await migrationClient.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_embedding 
        ON memories USING hnsw (embedding vector_cosine_ops);
      `).catch(() => {
        console.warn("[DB] Could not create vector index (needs data or HNSW support)");
      });
    }
    
    console.log("[DB] Memories table ready with pgvector");
  } catch (err) {
    console.warn("[DB] Memories table creation failed:", err.message);
  }
  
  // P0 Enhancement: Proactive Memory Triggers table
  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS memory_triggers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL,
        trigger_date TIMESTAMPTZ NOT NULL,
        trigger_condition JSONB DEFAULT '{}',
        context TEXT,
        fired BOOLEAN DEFAULT FALSE,
        fired_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_triggers_user_date 
      ON memory_triggers(user_id, trigger_date) 
      WHERE fired = FALSE;
    `);
    
    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_triggers_pending
      ON memory_triggers(trigger_date)
      WHERE fired = FALSE;
    `);
    
    console.log("[DB] Memory triggers table ready");
  } catch (err) {
    console.warn("[DB] Memory triggers table creation failed:", err.message);
  }
  
  // M2 cleanup (2026-06-11): the memory review/confirmation flow was RETIRED in
  // favor of deterministic auto-supersede. The memory_confirmations,
  // memory_conflicts, and memory_notifications tables are no longer created or
  // written. Legacy envs keep their (empty) tables; the data-export reads and the
  // GDPR delete-by-email both tolerate the tables' absence (Postgres 42P01).

  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS zaki_memory_preferences (
        user_id TEXT PRIMARY KEY,
        policy TEXT NOT NULL DEFAULT 'balanced',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("[DB] Memory preferences table ready");
  } catch (err) {
    console.warn("[DB] Memory preferences table creation failed:", err.message);
  }

  // Translation cache for memory conflict keys
  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS memory_translation_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        language TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await migrationClient.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_translation_cache_source
      ON memory_translation_cache (source_text);
    `);

    console.log("[DB] Memory translation cache table ready");
  } catch (err) {
    console.warn("[DB] Memory translation cache table creation failed:", err.message);
  }

  // (memory_conflicts + memory_notifications tables removed — see M2 cleanup note above.)

  // P0: Persistent undo windows (survives restarts / multi-instance)
  try {
    await migrationClient.query(`
      CREATE TABLE IF NOT EXISTS memory_undo_windows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await migrationClient.query(`
      ALTER TABLE memory_undo_windows
      ADD COLUMN IF NOT EXISTS superseded_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL;
    `);

    await migrationClient.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_undo_windows_memory_id
      ON memory_undo_windows(memory_id);
    `);

    await migrationClient.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_undo_windows_user_active
      ON memory_undo_windows(user_id, expires_at DESC)
      WHERE used_at IS NULL;
    `);

    console.log("[DB] Memory undo windows table ready (P0)");
  } catch (err) {
    console.warn("[DB] Memory undo windows table creation failed:", err.message);
  }

  // --- ZAKI sessions (v2.0 OATH phase) ---
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      replaced_by_session_id UUID REFERENCES zaki_sessions(id) ON DELETE SET NULL,
      last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_sessions_user_id
      ON zaki_sessions (user_id);
  `);
  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_sessions_active
      ON zaki_sessions (user_id, last_used_at DESC)
      WHERE revoked_at IS NULL;
  `);
  await migrationClient.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_zaki_sessions_refresh_hash
      ON zaki_sessions (refresh_token_hash);
  `);
  // AUTH-06: retain the exact successor of a rotated refresh session so the
  // concurrent-refresh guard does not infer identity from unrelated sessions.
  await migrationClient.query(`
    ALTER TABLE zaki_sessions
      ADD COLUMN IF NOT EXISTS replaced_by_session_id UUID
        REFERENCES zaki_sessions(id) ON DELETE SET NULL;
  `);
  // Phase 04-typ-adapter: TYP-03 — drop typ_session_token from running DBs
  await migrationClient.query(`
    ALTER TABLE zaki_sessions DROP COLUMN IF EXISTS typ_session_token;
  `);

  // --- Agent-generated file ownership registry ---
  await migrationClient.query(`
    CREATE TABLE IF NOT EXISTS zaki_generated_files (
      storage_filename TEXT PRIMARY KEY,
      zaki_user_id TEXT NOT NULL,
      workspace_slug TEXT,
      thread_slug TEXT,
      filename TEXT,
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await migrationClient.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_generated_files_user
      ON zaki_generated_files (zaki_user_id);
  `);

  // --- SaaS V1 unit ledger (H-02): wallets + reserve→settle holds ---
  // Dynamic import avoids a static circular dependency (unit-ledger.js imports db.js).
  try {
    const { UNIT_LEDGER_DDL } = await import("./unit-ledger.js");
    await migrationClient.query(UNIT_LEDGER_DDL);
    await migrationClient.query(`
      ALTER TABLE IF EXISTS zaki_unit_wallets
        ADD COLUMN IF NOT EXISTS weekly_anchor_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS weekly_reset_at TIMESTAMPTZ;
    `);
    console.log("[DB] Unit ledger tables ready (zaki_unit_wallets, zaki_meter_holds)");
  } catch (err) {
    console.warn("[DB] Unit ledger table creation failed:", err.message);
    failClosedMinutesControlSchema("unit-ledger", err);
  }

  // Minutes control stays runtime-disabled until explicit staging evidence, but
  // its callback ledger needs durable idempotency state before that gate opens.
  // This DDL contains only opaque IDs and metering state—never meeting content.
  try {
    const { MINUTES_CONTROL_STATE_DDL } = await import("./minutes-control-state.js");
    await migrationClient.query(MINUTES_CONTROL_STATE_DDL);
    console.log("[DB] Minutes control state tables ready");
  } catch (err) {
    console.warn("[DB] Minutes control state table creation failed:", err.message);
    failClosedMinutesControlSchema("control-state", err);
  }

  // WP-M10 calendar auto-join connection store (dark until the poller ships).
  // Holds one row per user with an AES-256-GCM-encrypted Google refresh token —
  // no calendar content, no meeting content. Independent of the control gate.
  try {
    const { MINUTES_CALENDAR_CONNECTIONS_DDL } = await import("./minutes-calendar-store.js");
    await migrationClient.query(MINUTES_CALENDAR_CONNECTIONS_DDL);
    console.log("[DB] Minutes calendar connection store ready");
  } catch (err) {
    console.warn("[DB] Minutes calendar connection table creation failed:", err.message);
    failClosedMinutesControlSchema("calendar-store", err);
  }

  // --- V1 beta cutover audit + reversible workspace archive registry ---
  // Dynamic import keeps this DDL colocated with the service while avoiding import cycles.
  try {
    const { V1_CUTOVER_DDL } = await import("./v1-cutover.js");
    await migrationClient.query(V1_CUTOVER_DDL);
    console.log("[DB] V1 cutover tables ready");
  } catch (err) {
    console.warn("[DB] V1 cutover table creation failed:", err.message);
  }
  } finally {
    await migrationClient
      .query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY])
      .catch(() => {});
    migrationClient.release();
  }
}

export function getDb() {
  if (!pool) {
    throw new Error("Database not initialized.");
  }
  return pool;
}

export async function dbQuery(text, params = []) {
  return getDb().query(text, params);
}

export async function dbGet(text, params = []) {
  const result = await getDb().query(text, params);
  return result.rows[0] ?? null;
}

export async function dbAll(text, params = []) {
  const result = await getDb().query(text, params);
  return result.rows;
}

export async function withDbTransaction(runInTransaction) {
  const client = await getDb().connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    const result = await runInTransaction(client);
    await client.query("COMMIT");
    committed = true;
    return result;
  } catch (error) {
    if (!committed) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if pgvector is available
 */
export async function hasPgVector() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_vector;
    `);
    return result.rows[0]?.has_vector === true;
  } catch {
    return false;
  }
}
