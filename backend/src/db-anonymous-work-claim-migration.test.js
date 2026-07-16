import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbSource = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");

describe("anonymous work claim migration", () => {
  it("adds the durable one-shot context marker to existing databases", () => {
    expect(dbSource).toMatch(
      /ALTER TABLE zaki_anonymous_work_messages[\s\S]*ADD COLUMN IF NOT EXISTS context_forwarded_at TIMESTAMPTZ/
    );
    expect(dbSource).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_zaki_anonymous_work_messages_pending_context[\s\S]*WHERE context_forwarded_at IS NULL/
    );
    expect(dbSource).toMatch(
      /CREATE TABLE IF NOT EXISTS zaki_imported_context_leases[\s\S]*lease_id UUID NOT NULL[\s\S]*lease_expires_at TIMESTAMPTZ NOT NULL/
    );
  });
});
