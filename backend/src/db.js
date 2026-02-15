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
    const { Pool } = pg;
    pool = new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
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
