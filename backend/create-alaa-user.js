// Create user: alaasuccar@gmail.com
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createUser() {
  const email = 'alaasuccar@gmail.com';
  const password = '1122334455';
  const fullName = 'Alaa Succar';

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

    console.log('✅ User created and verified:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${result.rows[0].id}`);
    console.log('\n🎉 You can now login!');
  } catch (err) {
    if (err.code === '23505') {
      console.log('✅ User already exists. Verifying...');
      await pool.query(
        `UPDATE zaki_users SET verified = true, password_hash = $1, updated_at = $2 WHERE email = $3`,
        [passwordHash, now, email]
      );
      console.log('✅ User verified and password updated');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    await pool.end();
  }
}

createUser();
