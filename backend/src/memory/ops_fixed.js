/**
 * FIXED storeMemory - handles embeddings gracefully
 */

export async function storeMemoryFixed({
  userId,
  content,
  type = "context",
  metadata = {},
  sourceThreadId = null,
  importanceScore = null,
}) {
  const hash = hashText(content);
  const isPg = await checkStorage();
  
  // Check for duplicates
  if (isPg) {
    const existing = await dbGet(
      "SELECT id FROM memories WHERE user_id = $1 AND content_hash = $2",
      [userId, hash]
    );
    if (existing) return { id: existing.id, duplicate: true };
  }
  
  // Get embeddings (graceful degradation - S-tier)
  let embedding = null;
  try {
    const result = await getEmbeddings(content);
    embedding = result.embeddings[0];
  } catch (err) {
    console.warn("[Memory] Embeddings failed, storing without:", err.message);
  }

  // Calculate importance
  const importance = importanceScore || calculateImportance(content, type);

  // Store
  const id = crypto.randomUUID();
  
  if (isPg) {
    if (embedding) {
      await dbQuery(
        `INSERT INTO memories 
         (id, user_id, content, content_hash, type, embedding, importance, source_thread_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, NOW())`,
        [id, userId, content, hash, type, `[${embedding.join(",")}]`, importance, sourceThreadId]
      );
    } else {
      // Store without embeddings (graceful degradation)
      await dbQuery(
        `INSERT INTO memories 
         (id, user_id, content, content_hash, type, importance, source_thread_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, userId, content, hash, type, importance, sourceThreadId]
      );
    }
  }

  return { id, duplicate: false, importance };
}
