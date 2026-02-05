// =============================================================================
// Auto-save with 3-second undo window
// =============================================================================
async function saveAndNotify({ userId, message, threadId = null }) {
  const { extractFacts } = await import("./memory.js");
  const { storeMemory } = await import("./memory.js");
  
  const facts = await extractFacts(message);
  
  if (facts.length === 0) {
    return { saved: [] };
  }
  
  const saved = [];
  
  for (const fact of facts) {
    try {
      // Store immediately (auto-save)
      const result = await storeMemory({
        userId,
        content: fact.content,
        type: fact.type,
        sourceThreadId: threadId,
      });
      
      if (!result.duplicate) {
        saved.push({
          id: result.id,
          content: fact.content,
          type: fact.type,
        });
      }
    } catch (err) {
      console.warn("[Memory] Failed to auto-save:", err.message);
    }
  }
  
  return { saved };
}

export { saveAndNotify };
