// Check if memories are being created
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkMemories() {
  console.log('🧠 Checking memory system...\n');
  
  // Check if memories table exists
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'memories'
    );
  `);
  console.log('✅ Memories table exists:', tableCheck.rows[0].exists);
  
  // Count memories
  const countResult = await pool.query('SELECT COUNT(*) as count FROM memories');
  console.log(`📊 Total memories: ${countResult.rows[0].count}`);
  
  // List memories by user
  const byUser = await pool.query(`
    SELECT user_id, COUNT(*) as count 
    FROM memories 
    GROUP BY user_id
  `);
  
  console.log('\n👥 Memories by user:');
  if (byUser.rows.length === 0) {
    console.log('  (none yet)');
  } else {
    byUser.rows.forEach(row => {
      console.log(`  ${row.user_id}: ${row.count} memories`);
    });
  }
  
  // Show recent memories
  const recent = await pool.query(`
    SELECT user_id, content, type, created_at 
    FROM memories 
    ORDER BY created_at DESC 
    LIMIT 5
  `);
  
  if (recent.rows.length > 0) {
    console.log('\n📝 Recent memories:');
    recent.rows.forEach((m, i) => {
      console.log(`\n${i + 1}. [${m.type}] ${m.user_id}`);
      console.log(`   "${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}"`);
      console.log(`   Created: ${new Date(m.created_at).toLocaleString()}`);
    });
  } else {
    console.log('\n📝 No memories yet. Have a conversation to create some!');
  }
  
  await pool.end();
}

checkMemories().catch(console.error);
