import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getDb, initDb } from "../src/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultSqlitePath = path.resolve(__dirname, "..", "data", "zaki.sqlite");
const sqlitePath = (process.env.SQLITE_PATH || defaultSqlitePath).trim();

function readSqliteJson(sql) {
  const output = execFileSync("sqlite3", ["-json", sqlitePath, sql], {
    encoding: "utf8",
  }).trim();
  if (!output) return [];
  return JSON.parse(output);
}

function sqliteTableExists(name) {
  const rows = readSqliteJson(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}';`
  );
  return rows.length > 0;
}

function ensureSqliteExists() {
  if (!sqlitePath) {
    throw new Error("SQLITE_PATH is not configured.");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found at ${sqlitePath}`);
  }
}

async function migrate() {
  ensureSqliteExists();
  await initDb();

  const users = readSqliteJson(
    "SELECT id, email, password_hash, full_name, date_of_birth, verified, nova_user_id, created_at, updated_at FROM zaki_users ORDER BY id;"
  );
  const tokens = readSqliteJson(
    "SELECT id, user_id, token, expires_at, used_at, created_at FROM verification_tokens ORDER BY id;"
  );
  const resetTokens = sqliteTableExists("password_reset_tokens")
    ? readSqliteJson(
        "SELECT id, user_id, token, expires_at, used_at, created_at FROM password_reset_tokens ORDER BY id;"
      )
    : [];

  const pool = getDb();
  const client = await pool.connect();
  const idMap = new Map();

  try {
    await client.query("BEGIN");

    for (const row of users) {
      const verified = Boolean(Number(row.verified));
      const novaUserId =
        row.nova_user_id === null || row.nova_user_id === undefined
          ? null
          : Number(row.nova_user_id);
      await client.query(
        `INSERT INTO zaki_users
         (id, email, password_hash, full_name, date_of_birth, verified, nova_user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           date_of_birth = EXCLUDED.date_of_birth,
           verified = EXCLUDED.verified,
           nova_user_id = EXCLUDED.nova_user_id,
           updated_at = EXCLUDED.updated_at`,
        [
          Number(row.id),
          row.email,
          row.password_hash,
          row.full_name || null,
          row.date_of_birth || null,
          verified,
          novaUserId,
          row.created_at,
          row.updated_at,
        ]
      );

      const idResult = await client.query(
        "SELECT id FROM zaki_users WHERE email = $1",
        [row.email]
      );
      if (idResult.rows[0]?.id) {
        idMap.set(Number(row.id), Number(idResult.rows[0].id));
      }
    }

    for (const row of tokens) {
      const mappedUserId = idMap.get(Number(row.user_id));
      if (!mappedUserId) {
        continue;
      }
      await client.query(
        `INSERT INTO verification_tokens
         (id, user_id, token, expires_at, used_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (token) DO NOTHING`,
        [
          Number(row.id),
          mappedUserId,
          row.token,
          Number(row.expires_at),
          row.used_at === null || row.used_at === undefined
            ? null
            : Number(row.used_at),
          row.created_at,
        ]
      );
    }

    for (const row of resetTokens) {
      const mappedUserId = idMap.get(Number(row.user_id));
      if (!mappedUserId) {
        continue;
      }
      await client.query(
        `INSERT INTO password_reset_tokens
         (id, user_id, token, expires_at, used_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (token) DO NOTHING`,
        [
          Number(row.id),
          mappedUserId,
          row.token,
          Number(row.expires_at),
          row.used_at === null || row.used_at === undefined
            ? null
            : Number(row.used_at),
          row.created_at,
        ]
      );
    }

    await client.query(
      `SELECT setval(pg_get_serial_sequence('zaki_users','id'), (SELECT COALESCE(MAX(id), 1) FROM zaki_users))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('verification_tokens','id'), (SELECT COALESCE(MAX(id), 1) FROM verification_tokens))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('password_reset_tokens','id'), (SELECT COALESCE(MAX(id), 1) FROM password_reset_tokens))`
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  console.log(
    `[ZAKI] Migration complete. Users: ${users.length}, Tokens: ${tokens.length}, Reset tokens: ${resetTokens.length}`
  );
}

migrate().catch((error) => {
  console.error(`[ZAKI] Migration failed: ${error.message || error}`);
  process.exit(1);
});
