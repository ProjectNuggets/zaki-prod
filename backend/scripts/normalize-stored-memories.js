#!/usr/bin/env node

import { dbAll, dbQuery, initDb } from "../src/db.js";
import { normalizeMemoryRecordForMaintenance } from "../src/memory/operations.js";

async function main() {
  await initDb();
  const rows = await dbAll(
    `SELECT id, content, type, metadata
     FROM memories
     ORDER BY created_at DESC`
  );

  let updated = 0;
  for (const row of rows) {
    const normalized = normalizeMemoryRecordForMaintenance(row);
    const oldMetadata = JSON.stringify(row.metadata || {});
    const newMetadata = JSON.stringify(normalized.metadata || {});
    if (
      String(row.content || "") === String(normalized.content || "") &&
      String(row.type || "") === String(normalized.type || "") &&
      oldMetadata === newMetadata
    ) {
      continue;
    }

    await dbQuery(
      `UPDATE memories
       SET content = $2,
           type = $3,
           metadata = $4
       WHERE id = $1`,
      [row.id, normalized.content, normalized.type, normalized.metadata]
    );
    updated += 1;
  }

  console.log(JSON.stringify({ success: true, scanned: rows.length, updated }, null, 2));
}

main().catch((error) => {
  console.error("[normalize-stored-memories] failed:", error);
  process.exitCode = 1;
});
