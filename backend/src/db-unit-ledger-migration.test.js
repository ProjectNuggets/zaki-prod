import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Task 3: idempotent schema migration. db.js must, immediately after applying the
// unit-ledger DDL, issue an idempotent ALTER that guarantees the two anchor columns
// exist on zaki_unit_wallets. This is a no-op on already-migrated databases.
//
// We assert against the source text (not a live DB) so the guarantee is pinned
// deterministically without a Postgres connection.
const dbSource = readFileSync(
  fileURLToPath(new URL("./db.js", import.meta.url)),
  "utf8"
);

describe("db.js: unit-ledger anchor-column migration", () => {
  it("applies the UNIT_LEDGER_DDL", () => {
    expect(dbSource).toMatch(/await pool\.query\(UNIT_LEDGER_DDL\);/);
  });

  it("issues an idempotent ALTER TABLE IF EXISTS on zaki_unit_wallets after the DDL", () => {
    const ddlIdx = dbSource.indexOf("await pool.query(UNIT_LEDGER_DDL);");
    expect(ddlIdx).toBeGreaterThan(-1);
    const after = dbSource.slice(ddlIdx);
    expect(after).toMatch(/ALTER TABLE IF EXISTS zaki_unit_wallets/);
  });

  it("guarantees weekly_anchor_at via ADD COLUMN IF NOT EXISTS", () => {
    expect(dbSource).toMatch(
      /ADD COLUMN IF NOT EXISTS weekly_anchor_at TIMESTAMPTZ/
    );
  });

  it("guarantees weekly_reset_at via ADD COLUMN IF NOT EXISTS", () => {
    expect(dbSource).toMatch(
      /ADD COLUMN IF NOT EXISTS weekly_reset_at TIMESTAMPTZ/
    );
  });

  it("orders the anchor-column ALTER after applying UNIT_LEDGER_DDL", () => {
    const ddlIdx = dbSource.indexOf("await pool.query(UNIT_LEDGER_DDL);");
    const alterIdx = dbSource.indexOf("ALTER TABLE IF EXISTS zaki_unit_wallets");
    expect(ddlIdx).toBeGreaterThan(-1);
    expect(alterIdx).toBeGreaterThan(ddlIdx);
  });
});
