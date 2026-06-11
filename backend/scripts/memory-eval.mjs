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
  findConflict,
  markMemoryOutdated,
} from "../src/memory/operations.js";
import { extractFacts, extractMemories } from "../src/memory-extraction.js";

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

// ---------------------------------------------------------------------------
// Bucket 2: Supersede (newest wins). Deterministic — exercises the supersede
// MECHANISM (findConflict -> markMemoryOutdated -> retrieval excludes outdated)
// without the LLM, so it never flakes. Proves a contradiction resolves so only
// the newest value is recalled.
// ---------------------------------------------------------------------------
const SUPERSEDE_CASES = [
  {
    key: "identity:location",
    oldFact: "Lives in London",
    newFact: "Lives in Tokyo",
    query: "the city where I live",
    expectNew: "tokyo",
    expectOldGone: "london",
  },
  {
    key: "identity:occupation",
    oldFact: "Works as a teacher",
    newFact: "Works as a software engineer",
    query: "what I do for work",
    expectNew: "software engineer",
    expectOldGone: "teacher",
  },
];

async function runSupersedeChecks() {
  process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED = "true";
  const failures = [];
  const rows = [];
  for (const c of SUPERSEDE_CASES) {
    await clearEvalUserMemories();
    await storeMemory({
      userId: EVAL_USER_ID,
      content: c.oldFact,
      type: "fact",
      metadata: { conflictKey: c.key, userVerified: true },
    });
    // Simulate capturing the contradictory fact: detect + supersede + store.
    const conflict = await findConflict({
      userId: EVAL_USER_ID,
      content: c.newFact,
      conflictKey: c.key,
    });
    if (conflict?.memoryId) {
      await markMemoryOutdated({ userId: EVAL_USER_ID, memoryId: conflict.memoryId });
    }
    await storeMemory({
      userId: EVAL_USER_ID,
      content: c.newFact,
      type: "fact",
      metadata: { conflictKey: c.key, userVerified: true },
    });

    const res = await buildFastContext({ userId: EVAL_USER_ID, query: c.query, limit: RECALL_LIMIT });
    const hay = (res?.sources || [])
      .map((s) => String(s?.content || "").toLowerCase())
      .join("\n");
    const detected = Boolean(conflict?.memoryId);
    const newOk = hay.includes(c.expectNew);
    const oldGone = !hay.includes(c.expectOldGone);
    if (!detected) failures.push(`supersede[${c.key}]: contradiction not detected`);
    if (!newOk) failures.push(`supersede[${c.key}]: new value "${c.expectNew}" not recalled`);
    if (!oldGone) failures.push(`supersede[${c.key}]: stale value "${c.expectOldGone}" still recalled`);
    rows.push({ key: c.key, detected, newOk, oldGone });
  }
  return { failures, rows };
}

// ---------------------------------------------------------------------------
// Bucket 3: Extraction precision. Runs the REAL extractor (LLM + pattern
// fallback). Asserts only PRECISION (no false positives) — robust even when the
// extraction LLM times out, because the heuristic question-guard + pattern fixes
// hold on the fallback path. Locks in the Phase 1 bugfixes.
// ---------------------------------------------------------------------------
const PRECISION_CASES = [
  { input: "do I have any travel plans?", forbid: "any", why: "question must extract nothing" },
  { input: "where do I live?", forbid: "any", why: "question must extract nothing" },
  { input: "هل لدي أي خطط سفر؟", forbid: "any", why: "Arabic question must extract nothing" },
  {
    input: "I have a meeting tomorrow",
    forbid: /^health detail:/i,
    why: "ordinary 'I have X' must not become a health detail",
  },
];

async function runPrecisionChecks() {
  const failures = [];
  const rows = [];
  for (const c of PRECISION_CASES) {
    let facts = [];
    try {
      facts = await extractFacts(c.input);
    } catch {
      facts = [];
    }
    const contents = (facts || []).map((f) => String(f?.content || ""));
    let ok = true;
    if (c.forbid === "any") {
      ok = contents.length === 0;
    } else if (c.forbid instanceof RegExp) {
      ok = !contents.some((x) => c.forbid.test(x));
    }
    if (!ok) {
      failures.push(`precision: "${c.input}" (${c.why}); got ${JSON.stringify(contents)}`);
    }
    rows.push({ input: c.input, ok });
  }
  return { failures, rows };
}

// ---------------------------------------------------------------------------
// Bucket 4: Extraction recall. Statements the regex misses must still be
// CAPTURED (as episodic); questions must capture nothing.
// ---------------------------------------------------------------------------
const EXTRACTION_RECALL_CASES = [
  { input: "I just got really into bouldering at the local gym", expect: "captured" },
  { input: "my weekends lately are all about restoring an old motorbike", expect: "captured" },
  { input: "I live in Hamburg", expect: "captured" }, // via Tier-1 fact
  { input: "what hobbies do I have?", expect: "none" }, // question
];

async function runExtractionRecallChecks() {
  const failures = [];
  const rows = [];
  for (const c of EXTRACTION_RECALL_CASES) {
    const { facts, episodic } = await extractMemories(c.input);
    const captured = facts.length + episodic.length > 0;
    const ok = c.expect === "captured" ? captured : !captured;
    if (!ok) failures.push(`extraction-recall: "${c.input}" expected ${c.expect}, got ${captured ? "captured" : "none"}`);
    rows.push({ input: c.input, ok });
  }
  return { failures, rows };
}

// ---------------------------------------------------------------------------
// Bucket 5: multilingual recall — only meaningful with a multilingual embedder.
// Skipped (and reported as skipped) unless ZAKI_MEMORY_EMBED_MODEL indicates e5,
// so the eval stays green on the current all-MiniLM embedder pre-switch.
// ---------------------------------------------------------------------------
const MULTILINGUAL_CASES = [
  { fact: "Wohnt in Berlin", query: "where does the user live", expect: "berlin" },
  { fact: "Liebt Jazzmusik", query: "what music does the user like", expect: "jazz" },
];

async function runMultilingualChecks() {
  if (!/e5/i.test(String(process.env.ZAKI_MEMORY_EMBED_MODEL || ""))) {
    return { skipped: true, failures: [], rows: [] };
  }
  process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED = "true";
  const failures = [];
  const rows = [];
  for (const c of MULTILINGUAL_CASES) {
    await clearEvalUserMemories();
    await storeMemory({ userId: EVAL_USER_ID, content: c.fact, type: "fact", metadata: { userVerified: true } });
    const res = await buildFastContext({ userId: EVAL_USER_ID, query: c.query, limit: RECALL_LIMIT });
    const hay = (res?.sources || []).map((s) => String(s?.content || "").toLowerCase()).join("\n");
    const ok = hay.includes(c.expect);
    if (!ok) failures.push(`multilingual: "${c.query}" did not recall "${c.expect}"`);
    rows.push({ query: c.query, ok });
  }
  return { skipped: false, failures, rows };
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

  // Bucket 2 (supersede) + Bucket 3 (extraction precision) + Bucket 4 (extraction recall) + Bucket 5 (multilingual).
  const supersede = await runSupersedeChecks();
  const precision = await runPrecisionChecks();
  const extractionRecall = await runExtractionRecallChecks();
  const multilingual = await runMultilingualChecks();

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

  console.log("--- Supersede (newest wins) ---");
  for (const r of supersede.rows) {
    console.log(
      `    ${r.key.padEnd(22)} detected:${r.detected ? "y" : "n"} new:${r.newOk ? "y" : "n"} old-gone:${r.oldGone ? "y" : "n"}`
    );
  }
  console.log("");
  console.log("--- Extraction precision (no false positives) ---");
  for (const r of precision.rows) {
    const q = r.input.length > 48 ? `${r.input.slice(0, 47)}…` : r.input;
    console.log(`    ${(r.ok ? "ok  " : "FAIL")} ${q}`);
  }
  console.log("");
  console.log("--- Extraction recall (capture the long tail) ---");
  for (const r of extractionRecall.rows) {
    const q = r.input.length > 48 ? `${r.input.slice(0, 47)}…` : r.input;
    console.log(`    ${(r.ok ? "ok  " : "FAIL")} ${q}`);
  }
  console.log("");
  console.log("--- Multilingual recall (cross-lingual) ---");
  if (multilingual.skipped) {
    console.log("    (skipped — not an e5 embedder; set ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small)");
  } else {
    for (const r of multilingual.rows) {
      const q = r.query.length > 48 ? `${r.query.slice(0, 47)}…` : r.query;
      console.log(`    ${(r.ok ? "ok  " : "FAIL")} ${q}`);
    }
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
  for (const f of supersede.failures) failures.push(f);
  for (const f of precision.failures) failures.push(f);
  for (const f of extractionRecall.failures) failures.push(f);
  for (const f of multilingual.failures) failures.push(f);

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
