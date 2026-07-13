import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import {
  ACCESS_CODE_MAX_DURATION_DAYS,
  clampAccessCodeDurationDays,
} from "../src/access-code-policy.js";

dotenv.config();

const { Pool } = pg;

const args = process.argv.slice(2);
const options = {};
for (const arg of args) {
  if (!arg.startsWith("--")) continue;
  const [rawKey, rawValue] = arg.slice(2).split("=");
  const key = String(rawKey || "").trim();
  const value = rawValue === undefined ? "true" : rawValue;
  if (key) options[key] = value;
}

if (options.help || options.h) {
  console.log("Create time-bound access grants");
  console.log("");
  console.log("Usage:");
  console.log(
    "  npm run access-code:create -- --campaign=launch --count=10 --duration=30 --max=1 --expires=2026-12-31"
  );
  console.log("");
  console.log("Options:");
  console.log("  --campaign=<name>    Required campaign label");
  console.log("  --count=<n>          How many codes to create (default: 1)");
  console.log(
    `  --duration=<days>    Access duration in days (default: 30, max: ${ACCESS_CODE_MAX_DURATION_DAYS})`
  );
  console.log("  --max=<n|unlimited>  Max redemptions per code (default: 1)");
  console.log("  --expires=<date>     Optional code expiry date (YYYY-MM-DD)");
  process.exit(0);
}

const campaign = String(options.campaign || "").trim();
if (!campaign) {
  console.error("Missing required --campaign option.");
  process.exit(1);
}

const count = Math.max(1, Number(options.count || 1));
const durationDays = clampAccessCodeDurationDays(options.duration);
const maxRaw = String(options.max || "1").trim().toLowerCase();
const maxRedemptions =
  maxRaw === "unlimited" || maxRaw === "none" ? null : Math.max(1, Number(maxRaw));
const expiresAtRaw = String(options.expires || "").trim();
const expiresAt = expiresAtRaw
  ? new Date(`${expiresAtRaw}T23:59:59.000Z`).toISOString()
  : null;

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomToken(length) {
  const bytes = crypto.randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += alphabet[bytes[i] % alphabet.length];
  }
  return token;
}

function buildCode() {
  const prefix = campaign
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  return `${prefix}${randomToken(8)}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const created = [];

  try {
    for (let i = 0; i < count; i += 1) {
      let row = null;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const code = buildCode();
        try {
          const result = await pool.query(
            `INSERT INTO access_codes
             (code, campaign, duration_days, max_redemptions, expires_at, active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id, code, campaign, duration_days, max_redemptions, expires_at, created_at`,
            [code, campaign, durationDays, maxRedemptions, expiresAt]
          );
          row = result.rows[0] || null;
          break;
        } catch (err) {
          if (err?.code !== "23505") throw err;
        }
      }

      if (!row) {
        throw new Error("Unable to generate unique code after multiple attempts.");
      }
      created.push(row);
    }

    console.log(`Created ${created.length} access code(s):`);
    for (const item of created) {
      console.log(
        `- ${item.code} | campaign=${item.campaign} | duration=${item.duration_days}d | max=${
          item.max_redemptions ?? "unlimited"
        }${item.expires_at ? ` | expires=${new Date(item.expires_at).toISOString()}` : ""}`
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to create access codes:", err?.message || err);
  process.exit(1);
});
