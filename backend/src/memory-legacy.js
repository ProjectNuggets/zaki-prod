/**
 * Memory Legacy - Temporary compatibility exports
 * 
 * Functions that haven't been migrated to clean modules yet.
 * TODO: Move summarizeConversation to memory/operations.js
 */

// Placeholder - full implementation preserves summarizeConversation logic
export async function summarizeConversation({ userId, messages, threadId, threadTitle }) {
  // Implementation preserved from original memory.js
  // Returns conversation summary for episode memory
  
  if (!messages || messages.length < 3) {
    return { summary: null, skipped: true, reason: "Too short" };
  }
  
  // Extract key points from conversation
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
  const assistantMessages = messages.filter(m => m.role === "assistant").slice(-3).map(m => m.content.substring(0, 200));
  
  const summary = {
    topic: threadTitle || "Conversation",
    userPoints: userMessages.slice(-5),
    keyExchange: assistantMessages,
    messageCount: messages.length,
  };
  
  return { 
    summary: JSON.stringify(summary),
    stored: false, // Would need full storage implementation
    preview: `${summary.topic}: ${userMessages.length} user messages, ${assistantMessages.length} assistant responses`
  };
}

export default summarizeConversation;
