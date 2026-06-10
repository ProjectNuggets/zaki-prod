/**
 * generated-files.js
 * Record and authorize access to agent-generated file downloads.
 * The engine emits fileDownload SSE events; we persist storageFilename → user
 * so the BFF download proxy can enforce ownership before hitting the engine's
 * unauthenticated GET /api/v1/document/generated-files/:storageFilename.
 */

/**
 * Returns true if the storage filename is safe to use in a URL and DB lookup.
 * Accepts only names matching ^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$ with no path separators.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isValidStorageFilename(name) {
  if (typeof name !== "string" || name.length === 0) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  return /^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(name);
}

/**
 * Persist a batch of generated-file references scoped to a user+workspace+thread.
 * Files with invalid/missing storageFilename are silently skipped.
 * Uses INSERT … ON CONFLICT DO NOTHING so the call is idempotent.
 *
 * @param {(sql: string, params: unknown[]) => Promise<{rows: unknown[]}>} dbQuery
 * @param {{ zakiUserId: string, workspaceSlug: string, threadSlug: string }} context
 * @param {Array<{ storageFilename: string, filename: string, fileSize: number }>} files
 */
export async function recordGeneratedFiles(dbQuery, { zakiUserId, workspaceSlug, threadSlug }, files) {
  if (!Array.isArray(files) || files.length === 0) return;
  for (const file of files) {
    if (!isValidStorageFilename(file?.storageFilename)) continue;
    await dbQuery(
      `INSERT INTO zaki_generated_files
         (storage_filename, zaki_user_id, workspace_slug, thread_slug, filename, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (storage_filename) DO NOTHING`,
      [file.storageFilename, zakiUserId, workspaceSlug, threadSlug, file.filename, file.fileSize]
    );
  }
}

/**
 * Returns true iff storageFilename is valid AND owned by zakiUserId.
 *
 * @param {(sql: string, params: unknown[]) => Promise<{rows: unknown[]}>} dbQuery
 * @param {string} storageFilename
 * @param {string} zakiUserId
 * @returns {Promise<boolean>}
 */
export async function userOwnsGeneratedFile(dbQuery, storageFilename, zakiUserId) {
  if (!isValidStorageFilename(storageFilename)) return false;
  const result = await dbQuery(
    `SELECT storage_filename FROM zaki_generated_files
     WHERE storage_filename = $1 AND zaki_user_id = $2
     LIMIT 1`,
    [storageFilename, zakiUserId]
  );
  return result.rows.length > 0;
}
