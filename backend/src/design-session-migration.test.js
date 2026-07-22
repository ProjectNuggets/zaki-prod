import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dbSource = readFileSync(
  fileURLToPath(new URL("./db.js", import.meta.url)),
  "utf8"
);

describe("Design session migration", () => {
  test("pins one session binding per project and hub-owned checkpoint generation", () => {
    expect(dbSource).toContain("CREATE TABLE IF NOT EXISTS zaki_design_sessions");
    expect(dbSource).toContain("project_id TEXT NOT NULL UNIQUE");
    expect(dbSource).toContain("checkpoint_generation BIGINT NOT NULL DEFAULT 0");
    expect(dbSource).toContain("checkpoint_object_key TEXT");
  });
});
