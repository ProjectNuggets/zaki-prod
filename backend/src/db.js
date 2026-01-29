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

  // Enable pgvector extension (requires superuser or extension already installed)
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("[DB] pgvector extension enabled");
  } catch (err) {
    console.warn("[DB] pgvector extension not available:", err.message);
    console.warn("[DB] Memory will use in-memory fallback");
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
