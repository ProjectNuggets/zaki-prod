// Create a verified test user
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createUser() {
  const email = 'nova@test.com'; // Change this
  const password = 'password123'; // Change this
  const fullName = 'Nova Test';

  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  try {
    const result = await pool.query(
      `INSERT INTO zaki_users 
       (email, password_hash, full_name, verified, created_at, updated_at)
       VALUES ($1, $2, $3, true, $4, $5)
       RETURNING id, email`,
      [email, passwordHash, fullName, now, now]
    );

    console.log('✅ User created:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${result.rows[0].id}`);
    console.log('\n🔐 Login credentials:');
    console.log(`   Username: ${email}`);
    console.log(`   Password: ${password}`);
  } catch (err) {
    if (err.code === '23505') {
      console.log('❌ User already exists. Trying to verify existing user...');
      await pool.query(
        `UPDATE zaki_users SET verified = true, updated_at = $1 WHERE email = $2`,
        [now, email]
      );
      console.log('✅ Existing user verified');
      console.log(`\n🔐 Try logging in with:`);
      console.log(`   Username: ${email}`);
      console.log(`   Password: ${password} (if this was your original password)`);
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    await pool.end();
  }
}

createUser();
