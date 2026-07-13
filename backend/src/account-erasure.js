import crypto from "node:crypto";

export class AccountErasureError extends Error {
  constructor(message, {
    code = "account_erasure_failed",
    status = 502,
    details,
    retryable = false,
    cause,
    internalDetails,
  } = {}) {
    super(message);
    this.name = "AccountErasureError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
    if (cause !== undefined) this.cause = cause;
    if (internalDetails !== undefined) this.internalDetails = internalDetails;
  }
}

export function resolveAccountErasureTimeoutMs(
  value,
  { defaultMs, minMs = 1_000, maxMs = 300_000 } = {}
) {
  const fallback = Number.isFinite(defaultMs) ? defaultMs : 60_000;
  const parsed = Number(value);
  const resolved = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.max(minMs, Math.min(maxMs, Math.trunc(resolved)));
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
    // Deploy-order interlock (review CRITICAL): pg_embedding_rows_removed only exists on
    // engines with the durable embedding purge (NULL-ALIS #166). Requiring it makes a
    // pre-#166 engine fail LOUD here instead of silently skipping the pgvector purge for
    // non-resident tenants — the engine-first deploy order is self-enforcing forever.
    isCount(manifest.pg_embedding_rows_removed) &&
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
        errorCount: errors.length,
      },
      internalDetails: { errors },
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
  runInTransaction,
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
      cause: error,
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
        cause: error,
      });
    }
    if (!deletion?.ok && deletion?.status !== 404) {
      throw new AccountErasureError("TYP account purge failed.", {
        code: "typ_purge_failed",
        status: 502,
        details: { upstreamStatus: deletion?.status || null },
      });
    }
    if (deletion?.status === 404) {
      // 404 is treated as idempotent success, but a KNOWN-linked nova_user_id 404ing may
      // mean the admin route is misrouted (path drift) rather than "already deleted" —
      // log loudly so a systematic 404 pattern is visible in ops (review minor).
      console.error(
        `[AccountErasure] TYP purge got 404 for known-linked nova_user_id=${zakiUser.nova_user_id} — verify the admin route if this repeats across deletions.`
      );
    }
    typ = { attempted: true, status: deletion?.status || null };
  }
  const billing = (await cleanupBilling({ zakiUser })) || {
    attempted: false,
    ok: true,
    reason: "unknown",
  };
  const learning = await deleteLearning({ zakiUser, requestId });

  return runInTransaction(async (transaction) => {
    const query = transaction.query.bind(transaction);
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
        const result = await query(`DELETE FROM ${table} WHERE user_id = $1`, [memoryKey]);
        hubRowsDeleted[table] = Number(result?.rowCount || 0);
      } catch (error) {
        if (error?.code !== "42P01") throw error;
        hubRowsDeleted[table] = 0;
      }
    }
    const userDelete = await query("DELETE FROM zaki_users WHERE id = $1", [zakiUser.id]);
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
      pgEmbeddingRowsRemoved: Number(engine.pg_embedding_rows_removed || 0),
      filesystemRemoved: Boolean(engine.filesystem_removed),
    };
    const spokeSummary = {
      typ,
      billing: {
        attempted: Boolean(billing?.attempted),
        ok: Boolean(billing?.ok),
        reason: billing?.reason || null,
      },
      learning: {
        attempted: Boolean(learning?.attempted),
        reason: learning?.reason || null,
        deletedCount: Array.isArray(learning?.deleted) ? learning.deleted.length : 0,
        deletedResources: Array.isArray(learning?.deleted)
          ? learning.deleted.map((item) => item?.resource).filter(Boolean)
          : [],
      },
    };
    const receiptResult = await query(
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
    return {
      engine,
      typ,
      learning,
      receiptId: receiptResult?.rows?.[0]?.id || null,
    };
  });
}
