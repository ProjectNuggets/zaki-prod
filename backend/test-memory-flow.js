#!/usr/bin/env node
/**
 * Test Memory Flow - Verify complete memory integration
 * 
 * Run: cd backend && node test-memory-flow.js
 */

import pg from 'pg';

const DATABASE_URL = 'postgres://nova@localhost:5432/zaki';
const TEST_USER = 'alaasuccar@gmail.com';

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  
  console.log('\n🧪 ZAKI Memory System Test\n');
  console.log('='.repeat(50));
  
  // 1. Check memories for user
  console.log(`\n1️⃣ Checking memories for user: ${TEST_USER}`);
  const memories = await pool.query(
    'SELECT id, content, type, created_at FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
    [TEST_USER]
  );
  console.log(`   Found ${memories.rows.length} memories`);
  if (memories.rows.length > 0) {
    memories.rows.forEach((m, i) => {
      console.log(`   ${i + 1}. [${m.type}] ${m.content}`);
    });
  }
  
  // 2. Check pending confirmations
  console.log(`\n2️⃣ Checking pending confirmations for user: ${TEST_USER}`);
  const confirmations = await pool.query(
    `SELECT id, content, type, status, created_at 
     FROM memory_confirmations 
     WHERE user_id = $1 
     ORDER BY created_at DESC LIMIT 5`,
    [TEST_USER]
  );
  console.log(`   Found ${confirmations.rows.length} confirmations`);
  if (confirmations.rows.length > 0) {
    confirmations.rows.forEach((c, i) => {
      console.log(`   ${i + 1}. [${c.status}] [${c.type}] ${c.content}`);
    });
  }
  
  // 3. Test memory extraction
  console.log(`\n3️⃣ Testing memory extraction pattern`);
  const testMessage = "My name is Alex and I love chocolate";
  
  // Pattern-based extraction
  const nameMatch = testMessage.match(/(?:my name is|i am|i'm) ([a-zA-Z\s]+?)(?:\.|,|$|and)/i);
  const likeMatch = testMessage.match(/(?:i love|i like|i enjoy|i prefer|i'm into) (.+?)(?:\.|,|because|when|$)/i);
  
  if (nameMatch) console.log(`   ✅ Name extracted: "${nameMatch[1].trim()}"`);
  else console.log(`   ❌ No name found`);
  
  if (likeMatch) console.log(`   ✅ Preference extracted: "${likeMatch[1].trim()}"`);
  else console.log(`   ❌ No preference found`);
  
  // 4. Test context building
  console.log(`\n4️⃣ Testing context building`);
  const contextQuery = await pool.query(
    `SELECT content, type, importance_score FROM memories 
     WHERE user_id = $1
     ORDER BY importance_score DESC, created_at DESC
     LIMIT 10`,
    [TEST_USER]
  );
  if (contextQuery.rows.length > 0) {
    console.log(`   Would inject ${contextQuery.rows.length} memories as context:`);
    let context = "About this person:\n";
    contextQuery.rows.forEach(m => {
      context += `- ${m.content}\n`;
    });
    console.log(`   ---\n${context}   ---`);
  } else {
    console.log(`   ⚠️ No memories to inject as context`);
  }
  
  // 5. Suggest fix
  if (memories.rows.length === 0) {
    console.log('\n💡 SUGGESTION:');
    console.log('   No memories found for this user. To test the memory system:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Start the frontend: npm run dev');
    console.log('   3. Log in as the user');
    console.log('   4. Send a message like "My name is Alex"');
    console.log('   5. A toast should appear showing the saved memory');
    console.log('   6. Open the Memory panel from the menu to see all memories');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Test complete!\n');
  
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
