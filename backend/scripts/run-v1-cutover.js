#!/usr/bin/env node
import dotenv from "dotenv";
import { dbAll, dbGet, getDb, initDb, withDbTransaction } from "../src/db.js";
import { fetchTypWorkspaceSlugs } from "../src/typ-client.js";
import {
  V1_CUTOVER_VERSION,
  listV1CutoverUsers,
  requestNullalisV1Cutover,
  runV1CutoverBatch,
} from "../src/v1-cutover.js";

dotenv.config();

function parseArgs(argv) {
  const args = {
    actorEmail: process.env.V1_CUTOVER_ACTOR_EMAIL || "as@novanuggets.com",
    cutoverVersion: V1_CUTOVER_VERSION,
    dryRun: false,
    limit: undefined,
    userId: undefined,
    yes: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--yes") args.yes = true;
    else if (arg.startsWith("--actor=")) args.actorEmail = arg.slice("--actor=".length);
    else if (arg.startsWith("--cutover-version=")) args.cutoverVersion = arg.slice("--cutover-version=".length);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--user-id=")) args.userId = Number(arg.slice("--user-id=".length));
    else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  npm --prefix backend run v1-cutover -- --dry-run
  npm --prefix backend run v1-cutover -- --yes
  npm --prefix backend run v1-cutover -- --user-id=42 --yes

Options:
  --dry-run                 List candidate users without mutating state.
  --yes                     Required for a mutating run.
  --user-id=<id>            Cut over one user.
  --limit=<n>               Limit candidate users for staged batches.
  --actor=<email>           Audit actor email. Defaults to V1_CUTOVER_ACTOR_EMAIL or owner email.
  --cutover-version=<text>  Override the cutover marker version.
`);
}

function readNullalisEnv(primary, fallback) {
  return String(process.env[primary] || process.env[fallback] || "").trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000, label = "Request") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (typeof timeout.unref === "function") timeout.unref();
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function listLegacyWorkspaceSlugsForV1Cutover(user) {
  const row = await dbGet(`SELECT nova_user_id FROM zaki_users WHERE id = $1`, [user.id]);
  const novaUserId = Number(row?.nova_user_id);
  if (!Number.isSafeInteger(novaUserId) || novaUserId <= 0) {
    return [];
  }
  const result = await fetchTypWorkspaceSlugs(novaUserId);
  if (!result?.success) {
    throw new Error(result?.error || "Unable to list beta workspaces.");
  }
  return Array.isArray(result.slugs) ? result.slugs : [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.dryRun && !args.yes) {
    throw new Error("Refusing mutating V1 cutover without --yes.");
  }

  await initDb();

  if (args.dryRun) {
    const users = await listV1CutoverUsers({
      dbAll,
      userId: args.userId,
      limit: args.limit,
    });
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          cutoverVersion: args.cutoverVersion,
          total: users.length,
          users: users.map((user) => ({
            id: Number(user.id),
            email: String(user.email || "").trim().toLowerCase(),
            planTier: user.plan_tier || "free",
          })),
        },
        null,
        2
      )
    );
    return;
  }

  const baseUrl = readNullalisEnv("NULLALIS_BASE_URL", "NULLCLAW_BASE_URL");
  const internalToken = readNullalisEnv("NULLALIS_INTERNAL_TOKEN", "NULLCLAW_INTERNAL_TOKEN");
  if (!baseUrl) throw new Error("NULLALIS_BASE_URL/NULLCLAW_BASE_URL is not configured.");
  if (!internalToken) throw new Error("NULLALIS_INTERNAL_TOKEN/NULLCLAW_INTERNAL_TOKEN is not configured.");

  const requestId = `v1-cutover-${Date.now()}`;
  const result = await runV1CutoverBatch({
    actorEmail: args.actorEmail,
    requestId,
    cutoverVersion: args.cutoverVersion,
    userId: args.userId,
    limit: args.limit,
    dbAll,
    withDbTransaction,
    listWorkspaceSlugs: listLegacyWorkspaceSlugsForV1Cutover,
    nullalisCutover: (cutoverArgs) =>
      requestNullalisV1Cutover({
        ...cutoverArgs,
        baseUrl,
        internalToken,
        fetchWithTimeout,
        timeoutMs: Number(process.env.V1_CUTOVER_NULLALIS_TIMEOUT_MS || 30000),
      }),
  });
  console.log(JSON.stringify({ requestId, ...result }, null, 2));
  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getDb().end();
    } catch {}
  });
