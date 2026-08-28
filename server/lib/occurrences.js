const { pool } = require('../db/database');
const { createReminderJob } = require('./cronJobsApi');
const { addMonthClamped, generateMonthlyOccurrenceDates } = require('./recurrence');

const MATERIALIZE_HORIZON_MONTHS = 3;

function getHorizonDate() {
  return addMonthClamped(new Date(), MATERIALIZE_HORIZON_MONTHS);
}

async function materializeOccurrences(series, fromIndex = 0, horizonDate = getHorizonDate(), database = pool) {
  const dates = generateMonthlyOccurrenceDates(series, fromIndex, horizonDate);
  const rows = [];

  for (const occurrence of dates) {
    const result = await database.query(
      `INSERT INTO events
        (title, description, scheduled_at, person, series_id, occurrence_index)
       VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (series_id, occurrence_index) WHERE series_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [
        series.title,
        series.description || null,
        occurrence.scheduled_at,
        series.person || null,
        series.id,
        occurrence.occurrence_index,
      ]
    );
    if (result.rows[0]) rows.push(result.rows[0]);
  }

  return rows;
}

async function createRemindersForRows(rows) {
  for (const event of rows) {
    if (event.cron_job_id) continue;
    try {
      const cronJobId = await createReminderJob(event);
      if (cronJobId) {
        await pool.query('UPDATE events SET cron_job_id=$1 WHERE id=$2', [cronJobId, event.id]);
        event.cron_job_id = cronJobId;
      }
    } catch (err) {
      console.error('Error al crear cron job de ocurrencia:', err.message, err.response?.data);
    }
  }
}

module.exports = {
  MATERIALIZE_HORIZON_MONTHS,
  getHorizonDate,
  materializeOccurrences,
  createRemindersForRows,
};