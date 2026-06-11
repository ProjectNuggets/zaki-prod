#!/usr/bin/env node
/**
 * One-time migration: re-embed every memory with the CURRENT embedder.
 * Run AFTER switching the AnythingLLM embedder (e.g. to multilingual-e5-small)
 * and setting ZAKI_MEMORY_EMBED_MODEL accordingly — the vector space changes,
 * so old vectors must be regenerated. Idempotent; safe to re-run.
 * Usage: node scripts/reembed-memories.mjs            (all users)
 *        node scripts/reembed-memories.mjs <userId>   (one user)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initDb, dbAll, dbQuery, getDb } from "../src/db.js";
import { getEmbeddings } from "../src/memory/operations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(__dirname, "..", ".env.local"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: p.endsWith(".env.local") });
    }
  }
}

async function main() {
  loadEnv();
  if (!String(process.env.DATABASE_URL || "").trim()) throw new Error("DATABASE_URL not set");
  await initDb();
  const userId = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;
  const rows = await dbAll(
    userId
      ? `SELECT id, content FROM memories WHERE user_id = $1 ORDER BY created_at ASC`
      : `SELECT id, content FROM memories ORDER BY created_at ASC`,
    userId ? [userId] : []
  );
  console.log(`Re-embedding ${rows.length} memories${userId ? ` for ${userId}` : ""}...`);
  let ok = 0, fail = 0;
  for (const [i, row] of rows.entries()) {
    try {
      const { embeddings } = await getEmbeddings(String(row.content || ""), { intent: "passage" });
      const vec = embeddings?.[0];
      if (!vec) { fail++; continue; }
      await dbQuery(`UPDATE memories SET embedding = $1::vector WHERE id = $2`, [`[${vec.join(",")}]`, row.id]);
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  [${row.id}] ${e?.message || e}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${rows.length} (ok=${ok} fail=${fail})`);
  }
  console.log(`Done. re-embedded=${ok} failed=${fail}`);
}

let code = 0;
try { await main(); } catch (e) { console.error("[reembed] fatal:", e?.message || e); code = 1; }
finally { try { await getDb().end(); } catch {} }
process.exit(code);
