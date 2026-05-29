const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id          SERIAL PRIMARY KEY,
      title       TEXT        NOT NULL,
      description TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL,
      telegram_sent BOOLEAN   DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('DB lista');
}

module.exports = { pool, initDB };
