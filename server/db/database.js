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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_series (
      id                 SERIAL PRIMARY KEY,
      title              TEXT NOT NULL,
      description        TEXT,
      person             TEXT,
      first_scheduled_at TIMESTAMPTZ NOT NULL,
      end_date           DATE,
      active             BOOLEAN DEFAULT true,
      created_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Migración: agregar columna person si no existe
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS person TEXT
  `);
  // Migración: agregar columna cron_job_id para recordatorios de 15 min
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS cron_job_id TEXT
  `);
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS series_id INTEGER REFERENCES event_series(id) ON DELETE SET NULL
  `);
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS occurrence_index INTEGER
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS events_series_occurrence_idx
      ON events (series_id, occurrence_index)
      WHERE series_id IS NOT NULL
  `);
  console.log('DB lista');
}

module.exports = { pool, initDB };
