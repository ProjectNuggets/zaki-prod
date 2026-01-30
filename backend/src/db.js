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
    
    // Create indexes for efficient querying
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(user_id, content_hash);
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
