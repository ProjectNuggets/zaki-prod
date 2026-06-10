#!/usr/bin/env node
/**
 * Golden eval harness for chat memory recall (Task 8).
 *
 * Proves two things against the REAL Postgres + NOVA embeddings:
 *   1. Semantic recall (pgvector cosine) beats keyword recall on paraphrased,
 *      non-lexical queries — recall@5 must clear the threshold.
 *   2. The deterministic identity core stays bounded (<= 6 items, <= 350 chars)
 *      and high-confidence.
 *
 * It runs each fixture query twice through buildFastContext():
 *   - ZAKI_CHAT_MEMORY_VECTOR_ENABLED="false"  -> keyword baseline
 *   - ZAKI_CHAT_MEMORY_VECTOR_ENABLED="true"   -> semantic
 * and compares recall@5.
 *
 * SAFETY: only ever touches the namespaced user "memeval@local.test".
 * Never reads, writes, or deletes any other user's data.
 *
 * Run: npm run memory:eval   (from backend/)
 * Exit 0 = pass. Non-zero = fail (semantic recall below threshold, or a
 * keyword-correct case regressed under semantic).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { initDb, dbQuery, getDb } from "../src/db.js";
import {
  storeMemory,
  buildFastContext,
  buildIdentityCore,
} from "../src/memory/operations.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVAL_USER_ID = "memeval@local.test";
const RECALL_LIMIT = 5;
const SEMANTIC_RECALL_THRESHOLD = 0.85;
const IDENTITY_CORE_MAX_ITEMS = 6;
const IDENTITY_CORE_MAX_CHARS = 350;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(
  __dirname,
  "..",
  "test-fixtures",
  "memory-eval-cases.json"
);

// ---------------------------------------------------------------------------
// Env loading (mirror create-access-code.js / smoke-test.mjs)
// ---------------------------------------------------------------------------

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(__dirname, "..", ".env.local"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: envPath.endsWith(".env.local") });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFixture() {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  const cases = JSON.parse(raw);
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error("Fixture must be a non-empty array of cases.");
  }
  for (const [i, c] of cases.entries()) {
    if (!Array.isArray(c.facts) || c.facts.length === 0) {
      throw new Error(`Case ${i} is missing facts[].`);
    }
    if (!c.query || typeof c.query !== "string") {
      throw new Error(`Case ${i} is missing a query.`);
    }
    if (!Array.isArray(c.expectContains) || c.expectContains.length === 0) {
      throw new Error(`Case ${i} is missing expectContains[].`);
    }
  }
  return cases;
}

// recall@5: did any returned source's content include ANY expectContains
// substring (case-insensitive)?
function sourcesContainExpected(sources, expectContains) {
  const haystack = (sources || [])
    .map((s) => String(s?.content || "").toLowerCase())
    .join("\n");
  return expectContains.some((needle) =>
    haystack.includes(String(needle || "").toLowerCase())
  );
}

async function clearEvalUserMemories() {
  // Defense-in-depth: the WHERE clause is hard-pinned to the namespaced user.
  await dbQuery("DELETE FROM memories WHERE user_id = $1", [EVAL_USER_ID]);
}

async function runCaseOnce(caseDef, vectorEnabled) {
  process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED = vectorEnabled ? "true" : "false";
  const result = await buildFastContext({
    userId: EVAL_USER_ID,
    query: caseDef.query,
    limit: RECALL_LIMIT,
  });
  return sourcesContainExpected(result?.sources, caseDef.expectContains);
}

function fmtRow(cols, widths) {
  return cols
    .map((c, i) => String(c).padEnd(widths[i]))
    .join("  ")
    .trimEnd();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();

  if (!String(process.env.DATABASE_URL || "").trim()) {
    throw new Error("DATABASE_URL is not configured — cannot run eval.");
  }

  await initDb();

  const cases = loadFixture();

  // Clean slate for the namespaced user before seeding.
  await clearEvalUserMemories();

  // Seed: store every fact from every case. Identity/origin/language/occupation
  // facts are marked userVerified so they clear the identity-core confidence
  // floor (>= 0.85). Preferences/goals stay at default confidence.
  let stored = 0;
  let duplicates = 0;
  for (const caseDef of cases) {
    for (const fact of caseDef.facts) {
      const conflictKey = String(fact.conflict_key || "").trim();
      const isIdentity = conflictKey.startsWith("identity:");
      const metadata = {};
      if (conflictKey) metadata.conflictKey = conflictKey;
      if (isIdentity) metadata.userVerified = true;
      const res = await storeMemory({
        userId: EVAL_USER_ID,
        content: fact.content,
        type: fact.type,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });
      if (res?.duplicate) duplicates += 1;
      else stored += 1;
    }
  }

  // Run keyword + semantic recall per case.
  const rows = [];
  let keywordHits = 0;
  let semanticHits = 0;
  const regressions = [];

  for (const [i, caseDef] of cases.entries()) {
    const keywordHit = await runCaseOnce(caseDef, false);
    const semanticHit = await runCaseOnce(caseDef, true);
    if (keywordHit) keywordHits += 1;
    if (semanticHit) semanticHits += 1;
    // Regression: keyword found it, semantic lost it. Semantic must never do
    // WORSE than keyword on a case keyword got right.
    if (keywordHit && !semanticHit) {
      regressions.push(i + 1);
    }
    rows.push({
      n: i + 1,
      query: caseDef.query,
      keyword: keywordHit,
      semantic: semanticHit,
    });
  }

  const keywordRecall = keywordHits / cases.length;
  const semanticRecall = semanticHits / cases.length;

  // Identity core bounds + confidence.
  const core = await buildIdentityCore({ userId: EVAL_USER_ID });
  const coreLines = core
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "));
  const coreItemCount = coreLines.length;
  const coreCharCount = core.length;
  const coreWithinItems = coreItemCount <= IDENTITY_CORE_MAX_ITEMS;
  const coreWithinChars = coreCharCount <= IDENTITY_CORE_MAX_CHARS;

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  const widths = [4, 58, 9, 9];
  console.log("");
  console.log("=== Memory Golden Eval ===");
  console.log(`User: ${EVAL_USER_ID}`);
  console.log(`Cases: ${cases.length}  Facts stored: ${stored}  Duplicates: ${duplicates}`);
  console.log("");
  console.log(fmtRow(["#", "query", "keyword", "semantic"], widths));
  console.log(fmtRow(["-".repeat(4), "-".repeat(58), "-".repeat(9), "-".repeat(9)], widths));
  for (const r of rows) {
    const q = r.query.length > 56 ? `${r.query.slice(0, 55)}…` : r.query;
    console.log(
      fmtRow(
        [r.n, q, r.keyword ? "HIT" : "miss", r.semantic ? "HIT" : "miss"],
        widths
      )
    );
  }
  console.log("");
  console.log("--- Aggregates ---");
  console.log(
    `keyword recall@${RECALL_LIMIT}:  ${keywordRecall.toFixed(3)} (${keywordHits}/${cases.length})`
  );
  console.log(
    `semantic recall@${RECALL_LIMIT}: ${semanticRecall.toFixed(3)} (${semanticHits}/${cases.length})`
  );
  console.log(
    `semantic lift:           +${(semanticRecall - keywordRecall).toFixed(3)}`
  );
  console.log("");
  console.log("--- Identity core ---");
  console.log(
    `items: ${coreItemCount} (max ${IDENTITY_CORE_MAX_ITEMS})  chars: ${coreCharCount} (max ${IDENTITY_CORE_MAX_CHARS})`
  );
  if (core) {
    console.log("core text:");
    console.log(
      core
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")
    );
  } else {
    console.log("core text: (empty)");
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Verdicts
  // -------------------------------------------------------------------------
  const failures = [];
  if (semanticRecall < SEMANTIC_RECALL_THRESHOLD) {
    failures.push(
      `semantic recall@${RECALL_LIMIT} ${semanticRecall.toFixed(3)} < threshold ${SEMANTIC_RECALL_THRESHOLD}`
    );
  }
  if (regressions.length > 0) {
    failures.push(
      `semantic regressed vs keyword on case(s): ${regressions.join(", ")}`
    );
  }
  if (!coreWithinItems) {
    failures.push(
      `identity core has ${coreItemCount} items > ${IDENTITY_CORE_MAX_ITEMS}`
    );
  }
  if (!coreWithinChars) {
    failures.push(
      `identity core is ${coreCharCount} chars > ${IDENTITY_CORE_MAX_CHARS}`
    );
  }

  // Always clean up the namespaced user's memories.
  await clearEvalUserMemories();

  if (failures.length > 0) {
    console.log("RESULT: FAIL");
    for (const f of failures) console.log(`  - ${f}`);
    return 1;
  }

  console.log("RESULT: PASS");
  return 0;
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (err) {
  console.error("[memory-eval] fatal:", err?.message || err);
  // Best-effort cleanup even on fatal error, only for the namespaced user.
  try {
    await clearEvalUserMemories();
  } catch {
    // ignore — pool may not be initialized
  }
  exitCode = 1;
} finally {
  try {
    await getDb().end();
  } catch {
    // pool may not exist
  }
}
process.exit(exitCode);
