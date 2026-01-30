// Quick auth diagnostic script
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnose() {
  console.log('🔍 ZAKI Auth Diagnostic\n');
  
  // 1. Check database connection
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
  } catch (err) {
    console.log('❌ Database connection failed:', err.message);
    return;
  }

  // 2. List all users
  const usersResult = await pool.query('SELECT id, email, verified, nova_user_id FROM zaki_users');
  console.log(`\n📋 Found ${usersResult.rows.length} users:`);
  usersResult.rows.forEach(u => {
    console.log(`  - ${u.email} (verified: ${u.verified}, nova_id: ${u.nova_user_id || 'none'})`);
  });

  // 3. Check NOVA.TYP connection
  const NOVA_TYP_BASE_URL = process.env.NOVA_TYP_BASE_URL;
  const NOVA_TYP_API_KEY = process.env.NOVA_TYP_API_KEY;
  
  console.log(`\n🔐 NOVA.TYP Config:`);
  console.log(`  Base URL: ${NOVA_TYP_BASE_URL || '❌ NOT SET'}`);
  console.log(`  API Key: ${NOVA_TYP_API_KEY ? '✅ Set' : '❌ NOT SET'}`);

  if (NOVA_TYP_BASE_URL && NOVA_TYP_API_KEY) {
    try {
      const testUrl = `${NOVA_TYP_BASE_URL.replace(/\/+$/, '')}/api/v1/users`;
      const response = await fetch(testUrl, {
        headers: { 'Authorization': `Bearer ${NOVA_TYP_API_KEY}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ NOVA.TYP accessible (${data.users?.length || 0} users)`);
      } else {
        console.log(`❌ NOVA.TYP returned ${response.status}`);
        const text = await response.text().catch(() => '');
        console.log(`   Response: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      console.log(`❌ NOVA.TYP request failed:`, err.message);
    }
  }

  // 4. Test login flow for first user
  if (usersResult.rows.length > 0) {
    const user = usersResult.rows[0];
    console.log(`\n🧪 Testing login flow for: ${user.email}`);
    
    if (!user.verified) {
      console.log('❌ User not verified. Run this to verify:');
      console.log(`   UPDATE zaki_users SET verified = true WHERE email = '${user.email}';`);
    } else {
      console.log('✅ User is verified');
    }

    if (!user.nova_user_id && NOVA_TYP_BASE_URL && NOVA_TYP_API_KEY) {
      console.log('\n⚠️  User has no NOVA user ID. Login will attempt to create one.');
      console.log('   This requires NOVA.TYP to be in multi-user mode.');
    }
  }

  await pool.end();
}

diagnose().catch(console.error);
