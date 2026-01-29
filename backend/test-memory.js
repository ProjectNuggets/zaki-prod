/**
 * ZAKI Backend Memory Integration Test
 * Run with: node test-memory.js
 */

// Load env vars FIRST, before any imports that use them
import dotenv from "dotenv";
dotenv.config();

// Now import memory module (which reads env vars at load time)
const { getEmbeddings, storeMemory, searchMemories, buildContext } = await import("./src/memory.js");

const testUserId = "test-user-123";

async function runTests() {
  console.log("=".repeat(60));
  console.log("ZAKI Backend - Memory Integration Tests");
  console.log("=".repeat(60));
  console.log("");

  let passed = 0;
  let failed = 0;

  // Test 1: Embeddings
  try {
    console.log("Test 1: Get embeddings...");
    const result = await getEmbeddings("Hello, this is a test.");
    if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error("No embeddings returned");
    }
    console.log(`  ✅ Provider: ${result.provider}, Dims: ${result.dims}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    failed++;
  }

  // Test 2: Store memories
  try {
    console.log("\nTest 2: Store memories...");
    
    await storeMemory({
      userId: testUserId,
      content: "User prefers dark mode",
      type: "preference",
    });
    
    await storeMemory({
      userId: testUserId,
      content: "User works at a tech startup",
      type: "fact",
    });
    
    await storeMemory({
      userId: testUserId,
      content: "User is building an AI chat application",
      type: "context",
    });
    
    console.log("  ✅ Stored 3 memories");
    passed++;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    failed++;
  }

  // Test 3: Search memories
  try {
    console.log("\nTest 3: Search memories...");
    const result = await searchMemories({
      userId: testUserId,
      query: "What does the user do for work?",
      limit: 3,
      minScore: 0.2, // Lower threshold for test
    });
    
    if (result.results.length === 0) {
      throw new Error("No search results");
    }
    
    console.log(`  ✅ Found ${result.results.length} results`);
    for (const r of result.results) {
      console.log(`     - [${r.score.toFixed(3)}] ${r.content.slice(0, 50)}...`);
    }
    passed++;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    failed++;
  }

  // Test 4: Build context
  try {
    console.log("\nTest 4: Build LLM context...");
    const result = await buildContext({
      userId: testUserId,
      query: "Tell me about the user",
    });
    
    if (!result.context) {
      throw new Error("No context generated");
    }
    
    console.log(`  ✅ Generated context (${result.context.length} chars)`);
    console.log(`  Sources: ${result.sources.length}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    failed++;
  }

  // Test 5: Duplicate detection
  try {
    console.log("\nTest 5: Duplicate detection...");
    const result = await storeMemory({
      userId: testUserId,
      content: "User prefers dark mode", // Same as before
      type: "preference",
    });
    
    if (result.duplicate) {
      console.log("  ✅ Duplicate correctly detected");
      passed++;
    } else {
      throw new Error("Duplicate not detected");
    }
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    failed++;
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
