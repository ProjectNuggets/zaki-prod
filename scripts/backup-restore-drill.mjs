#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
];

function parseEnvFile(contents) {
  const parsed = {};
  for (const rawLine of String(contents || "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    parsed[key] = value;
  }
  return parsed;
}

function loadEnvFiles(candidates = ENV_CANDIDATES) {
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const loaded = parseEnvFile(fs.readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(loaded)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function parseArgs(argv) {
  const args = {
    databaseUrl: process.env.DATABASE_URL || "",
    backupDir: process.env.BACKUP_DIR || "tmp/backups",
    adminDatabase: process.env.BACKUP_ADMIN_DATABASE || "postgres",
    keepDrillDb: false,
  };

  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [rawKey, rawValue] = item.slice(2).split("=");
    const key = String(rawKey || "").trim();
    const value = String(rawValue || "").trim();
    switch (key) {
      case "database-url":
        args.databaseUrl = value || args.databaseUrl;
        break;
      case "backup-dir":
        args.backupDir = value || args.backupDir;
        break;
      case "admin-database":
        args.adminDatabase = value || args.adminDatabase;
        break;
      case "keep-drill-db":
        args.keepDrillDb = ["1", "true", "yes", "on"].includes(value.toLowerCase());
        break;
      default:
        break;
    }
  }

  return args;
}

function ensureUrl(value) {
  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  }
  const dbName = parsed.pathname.replace(/^\//, "").trim();
  if (!dbName) {
    throw new Error("DATABASE_URL must include a database name path.");
  }
  return { parsed, dbName };
}

function makeAdminUrl(parsed, databaseName = "postgres") {
  const admin = new URL(parsed.toString());
  const normalized = String(databaseName || "").trim() || "postgres";
  admin.pathname = `/${normalized}`;
  return admin.toString();
}

function makeDbUrl(parsed, dbName) {
  const target = new URL(parsed.toString());
  target.pathname = `/${dbName}`;
  return target.toString();
}

function maskUrl(urlValue) {
  const u = new URL(urlValue);
  const host = `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  return `${u.protocol}//${host}${u.pathname}`;
}

function run(cmd, args, { env = process.env, captureStdout = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env,
      stdio: captureStdout ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (captureStdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${cmd} ${args.join(" ")} failed with exit ${code}${
            stderr ? `: ${stderr.trim()}` : ""
          }`
        )
      );
    });
  });
}

async function ensureCommandExists(command) {
  await run("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], {
    captureStdout: true,
  }).catch(() => {
    throw new Error(`Required command not found in PATH: ${command}`);
  });
}

async function main() {
  loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));
  const { parsed, dbName } = ensureUrl(args.databaseUrl);

  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), args.backupDir);
  const backupPath = path.join(backupDir, `${dbName}-${stamp}.dump`);
  const evidencePath = path.join(backupDir, `${dbName}-${stamp}.drill.json`);
  const drillDbName = `${dbName}_drill_${Date.now().toString(36).slice(-6)}`;
  const adminUrl = makeAdminUrl(parsed, args.adminDatabase);
  const drillUrl = makeDbUrl(parsed, drillDbName);

  fs.mkdirSync(backupDir, { recursive: true });

  await ensureCommandExists("pg_dump");
  await ensureCommandExists("pg_restore");
  await ensureCommandExists("psql");

  console.log(`[Drill] Source: ${maskUrl(args.databaseUrl)}`);
  console.log(`[Drill] Backup: ${backupPath}`);
  console.log(`[Drill] Evidence: ${evidencePath}`);
  console.log(`[Drill] Drill DB: ${drillDbName}`);
  console.log(`[Drill] Admin DB: ${args.adminDatabase}`);

  await run("pg_dump", ["--format=custom", "--file", backupPath, args.databaseUrl]);

  await run("psql", [adminUrl, "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS "${drillDbName}";`]);
  await run("psql", [adminUrl, "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE "${drillDbName}";`]);

  let restored = false;
  try {
    await run("pg_restore", [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--dbname",
      drillUrl,
      backupPath,
    ]);
    restored = true;

    const query = [
      "SELECT",
      "  (SELECT COUNT(*) FROM zaki_users) AS users,",
      "  (SELECT COUNT(*) FROM memories) AS memories,",
      "  (SELECT COUNT(*) FROM memory_confirmations) AS confirmations;",
    ].join(" ");
    const check = await run(
      "psql",
      [drillUrl, "-v", "ON_ERROR_STOP=1", "-At", "-F", ",", "-c", query],
      { captureStdout: true }
    );
    const [usersRaw, memoriesRaw, confirmationsRaw] = String(check.stdout || "")
      .trim()
      .split(",");
    const users = Number(usersRaw || 0);
    const memories = Number(memoriesRaw || 0);
    const confirmations = Number(confirmationsRaw || 0);

    const finishedAt = new Date();
    const report = {
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      sourceDatabase: dbName,
      adminDatabase: args.adminDatabase,
      drillDatabase: drillDbName,
      backupPath,
      evidencePath,
      restored,
      counts: { users, memories, confirmations },
    };
    fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (!args.keepDrillDb) {
      await run(
        "psql",
        [adminUrl, "-v", "ON_ERROR_STOP=1", "-c", `DROP DATABASE IF EXISTS "${drillDbName}";`],
        { captureStdout: true }
      );
    }
  }
}

main().catch((error) => {
  console.error("[Drill] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
