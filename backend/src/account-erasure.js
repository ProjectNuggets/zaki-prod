export class AccountErasureError extends Error {
  constructor(message, {
    code = "account_erasure_failed",
    status = 502,
    details,
    retryable = false,
  } = {}) {
    super(message);
    this.name = "AccountErasureError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
  }
}

export function assertAuthoritativeNullalisManifest(manifest) {
  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
  const valid =
    manifest !== null &&
    typeof manifest === "object" &&
    typeof manifest.status === "string" &&
    isCount(manifest.sessions_evicted) &&
    isCount(manifest.sessions_skipped_active) &&
    typeof manifest.pg_user_row_deleted === "boolean" &&
    isCount(manifest.vector_rows_removed) &&
    typeof manifest.filesystem_removed === "boolean" &&
    Array.isArray(manifest.errors) &&
    manifest.errors.every((error) => typeof error === "string");
  if (!valid) {
    throw new AccountErasureError("Nullalis account purge returned an invalid manifest.", {
      code: "nullalis_purge_invalid_manifest",
      status: 502,
    });
  }
  const errors = Array.isArray(manifest?.errors) ? manifest.errors : [];
  const hasResidue =
    manifest?.status !== "ok" ||
    errors.length > 0 ||
    Number(manifest?.sessions_skipped_active || 0) > 0;
  if (hasResidue) {
    throw new AccountErasureError("Nullalis account purge reported residual data.", {
      code: "nullalis_purge_residue",
      status: 502,
      details: {
        status: manifest?.status || null,
        sessionsSkippedActive: Number(manifest?.sessions_skipped_active || 0),
        errors,
      },
    });
  }
  return manifest;
}

export async function eraseAccountData({
  zakiUser,
  memoryKey,
  requestId,
  purgeNullalis,
  deleteTypUser,
  cleanupBilling,
  deleteLearning,
  dbQuery,
}) {
  let purge;
  try {
    purge = await purgeNullalis({
      userId: String(zakiUser.id),
      requestId,
    });
  } catch (error) {
    throw new AccountErasureError("Nullalis account purge is unavailable.", {
      code: "nullalis_purge_unavailable",
      status: 502,
      retryable: true,
      details: { cause: error?.message || "Nullalis request failed." },
    });
  }
  if (!purge?.ok) {
    throw new AccountErasureError("Nullalis account purge failed.", {
      code: "nullalis_purge_failed",
      status: 502,
      details: { upstreamStatus: purge?.status || null },
    });
  }
  const engine = assertAuthoritativeNullalisManifest(purge.data);
  let typ = { attempted: false, status: null };
  if (zakiUser.nova_user_id) {
    let deletion;
    try {
      deletion = await deleteTypUser({
        novaUserId: Number(zakiUser.nova_user_id),
        requestId,
      });
    } catch (error) {
      throw new AccountErasureError("TYP account purge is unavailable.", {
        code: "typ_purge_unavailable",
        status: 502,
        retryable: true,
        details: { cause: error?.message || "TYP request failed." },
      });
    }
    if (!deletion?.ok && deletion?.status !== 404) {
      throw new AccountErasureError("TYP account purge failed.", {
        code: "typ_purge_failed",
        status: 502,
        details: { upstreamStatus: deletion?.status || null },
      });
    }
    typ = { attempted: true, status: deletion?.status || null };
  }
  await cleanupBilling({ zakiUser });
  const learning = await deleteLearning({ zakiUser, requestId });

  await dbQuery("BEGIN");
  try {
    const hubTables = [
      "memory_notifications",
      "memory_conflicts",
      "memory_confirmations",
      "memory_triggers",
      "memories",
      "zaki_memory_preferences",
    ];
    const hubRowsDeleted = {};
    for (const table of hubTables) {
      try {
        const result = await dbQuery(`DELETE FROM ${table} WHERE user_id = $1`, [memoryKey]);
        hubRowsDeleted[table] = Number(result?.rowCount || 0);
      } catch (error) {
        if (error?.code !== "42P01") throw error;
        hubRowsDeleted[table] = 0;
      }
    }
    const userDelete = await dbQuery("DELETE FROM zaki_users WHERE id = $1", [zakiUser.id]);
    hubRowsDeleted.zaki_users = Number(userDelete?.rowCount || 0);

    const subjectHash = crypto
      .createHash("sha256")
      .update(`${zakiUser.id}:${String(zakiUser.email || "").trim().toLowerCase()}`)
      .digest("hex");
    const engineSummary = {
      status: engine.status,
      sessionsEvicted: Number(engine.sessions_evicted || 0),
      sessionsSkippedActive: Number(engine.sessions_skipped_active || 0),
      pgUserRowDeleted: Boolean(engine.pg_user_row_deleted),
      vectorRowsRemoved: Number(engine.vector_rows_removed || 0),
      filesystemRemoved: Boolean(engine.filesystem_removed),
    };
    const spokeSummary = {
      typ,
      learning: {
        attempted: Boolean(learning?.attempted),
        reason: learning?.reason || null,
        deletedCount: Array.isArray(learning?.deleted) ? learning.deleted.length : 0,
        deletedResources: Array.isArray(learning?.deleted)
          ? learning.deleted.map((item) => item?.resource).filter(Boolean)
          : [],
      },
    };
    const receiptResult = await dbQuery(
      `INSERT INTO zaki_account_erasure_receipts
         (subject_hash, request_id, engine_manifest_json, spoke_summary_json, hub_summary_json, created_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, NOW())
       RETURNING id`,
      [
        subjectHash,
        requestId || null,
        JSON.stringify(engineSummary),
        JSON.stringify(spokeSummary),
        JSON.stringify({ rowsDeleted: hubRowsDeleted }),
      ]
    );
    await dbQuery("COMMIT");
    return {
      engine,
      typ,
      learning,
      receiptId: receiptResult?.rows?.[0]?.id || null,
    };
  } catch (error) {
    await dbQuery("ROLLBACK");
    throw error;
  }
}
import crypto from "node:crypto";
