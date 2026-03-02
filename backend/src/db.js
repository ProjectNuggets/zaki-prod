import fs from "node:fs";
import pg from "pg";

let pool = null;

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

  // Check for pgvector extension
  try {
    const result = await pool.query(`
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
  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zaki_admin_members (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_admin_members_active_role
    ON zaki_admin_members (active, role);
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS full_name TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS date_of_birth TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS creem_product_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'inactive';");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_last_event_created_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS stripe_last_event_id TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_code_campaign TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS access_code_last TEXT;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT FALSE;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS student_verified_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS legal_consent_at TIMESTAMPTZ;");
  await pool.query("ALTER TABLE zaki_users ADD COLUMN IF NOT EXISTS legal_consent_version TEXT;");

  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_legal_consent_events_user
    ON legal_consent_events (user_id, consented_at DESC);
  `);

  // Shared conversations table
  await pool.query(`
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
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_conversations_token ON shared_conversations(token);
  `);
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shared_conversations_user_id ON shared_conversations(user_id);
  `);

  // Access codes (campaign-based, monthly)
  await pool.query(`
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

  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_access_codes_code_normalized
    ON access_codes (UPPER(regexp_replace(code, '[\\s-]+', '', 'g')));
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_access_redemptions_user ON access_code_redemptions(user_id);
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_access_code_orders_user_created
    ON access_code_orders (user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_access_code_orders_email_status_updated
    ON access_code_orders (email_status, updated_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_webhook_events (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, event_id)
    );
  `);

  await pool.query(`
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_product_analytics_events_created_at
    ON product_analytics_events (created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_product_analytics_events_user_event
    ON product_analytics_events (user_id, event, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS website_feedback_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      body TEXT NOT NULL,
      display_name TEXT,
      status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_website_feedback_posts_visible_created
    ON website_feedback_posts (status, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS website_feedback_votes (
      post_id UUID NOT NULL REFERENCES website_feedback_posts(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, client_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_website_feedback_votes_post
    ON website_feedback_votes (post_id, updated_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS zaki_hidden_workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
      workspace_slug TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, workspace_slug)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_zaki_hidden_workspaces_user
    ON zaki_hidden_workspaces (user_id, created_at DESC);
  `);

  // Memories table with vector support
  try {
    await pool.query(`
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
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS importance_score FLOAT DEFAULT 0.5;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0.8;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS decay_rate FLOAT DEFAULT 0.01;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS user_verified BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_thread_id TEXT;`);
    await pool.query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS source_message_id TEXT;`);
    
    // Create indexes for efficient querying
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(user_id, content_hash);
    `);
    // Enforce exact dedupe integrity at DB layer.
    await pool.query(`
      DELETE FROM memories older
      USING memories newer
      WHERE older.user_id = newer.user_id
        AND older.content_hash = newer.content_hash
        AND (
          older.created_at < newer.created_at
          OR (older.created_at = newer.created_at AND older.id < newer.id)
        );
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memories_user_content_hash_unique
      ON memories(user_id, content_hash);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance_score DESC);
    `);
    
    // Vector similarity index (IVFFlat for approximate search)
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_embedding 
        ON memories USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
    } catch {
      // IVFFlat requires data to exist, use HNSW instead
      await pool.query(`
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
    await pool.query(`
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
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_triggers_user_date 
      ON memory_triggers(user_id, trigger_date) 
      WHERE fired = FALSE;
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_triggers_pending
      ON memory_triggers(trigger_date)
      WHERE fired = FALSE;
    `);
    
    console.log("[DB] Memory triggers table ready");
  } catch (err) {
    console.warn("[DB] Memory triggers table creation failed:", err.message);
  }
  
  // P0 FIX: Memory Confirmations table (user feedback system)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_confirmations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'context',
        source_thread_id TEXT,
        source_message_id TEXT,
        conflict_key TEXT,
        polarity TEXT,
        confidence_score FLOAT DEFAULT 0.8,
        status TEXT DEFAULT 'pending',
        memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE memory_confirmations ADD COLUMN IF NOT EXISTS conflict_key TEXT;`);
    await pool.query(`ALTER TABLE memory_confirmations ADD COLUMN IF NOT EXISTS polarity TEXT;`);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_confirmations_user_pending 
      ON memory_confirmations(user_id, status) 
      WHERE status = 'pending';
    `);
    
    console.log("[DB] Memory confirmations table ready (P0)");
  } catch (err) {
    console.warn("[DB] Memory confirmations table creation failed:", err.message);
  }

  // Translation cache for memory conflict keys
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_translation_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        language TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_translation_cache_source
      ON memory_translation_cache (source_text);
    `);

    console.log("[DB] Memory translation cache table ready");
  } catch (err) {
    console.warn("[DB] Memory translation cache table creation failed:", err.message);
  }

  // P1: Memory Conflicts table (always ask user on conflicts)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        new_content TEXT NOT NULL,
        new_type TEXT NOT NULL DEFAULT 'context',
        new_confidence_score FLOAT DEFAULT 0.8,
        conflicting_memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
        conflicting_content TEXT,
        conflicting_type TEXT,
        status TEXT DEFAULT 'pending',
        resolution TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_conflicts_user_pending
      ON memory_conflicts(user_id, status)
      WHERE status = 'pending';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_conflict_key
      ON memories ((metadata->>'conflictKey'));
    `);

    console.log("[DB] Memory conflicts table ready (P1)");
  } catch (err) {
    console.warn("[DB] Memory conflicts table creation failed:", err.message);
  }
  
  // P0 FIX: Memory Notifications table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_notifications_user_unread 
      ON memory_notifications(user_id, read, created_at DESC) 
      WHERE read = FALSE;
    `);

    console.log("[DB] Memory notifications table ready (P0)");
  } catch (err) {
    console.warn("[DB] Memory notifications table creation failed:", err.message);
  }

  // P0: Persistent undo windows (survives restarts / multi-instance)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memory_undo_windows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_undo_windows_memory_id
      ON memory_undo_windows(memory_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_undo_windows_user_active
      ON memory_undo_windows(user_id, expires_at DESC)
      WHERE used_at IS NULL;
    `);

    console.log("[DB] Memory undo windows table ready (P0)");
  } catch (err) {
    console.warn("[DB] Memory undo windows table creation failed:", err.message);
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
