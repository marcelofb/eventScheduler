const { Router } = require('express');
const { pool } = require('../db/database');
const { createReminderJob, deleteReminderJob, replaceReminderJob } = require('../lib/cronJobsApi');
const {
  createRemindersForRows,
  getHorizonDate,
  materializeOccurrences,
} = require('../lib/occurrences');
const { addMonthClamped } = require('../lib/recurrence');

const router = Router();

function isValidDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// GET /api/events — todos los eventos ordenados por fecha
router.get('/', async (req, res) => {
  const { from, to } = req.query;

  if ((from && !to) || (!from && to)) {
    return res.status(400).json({ error: 'Debés enviar from y to juntos' });
  }

  if (from && to) {
    if (!isValidDateOnly(from) || !isValidDateOnly(to)) {
      return res.status(400).json({ error: 'from y to deben tener formato YYYY-MM-DD' });
    }
    if (from > to) {
      return res.status(400).json({ error: 'from no puede ser mayor que to' });
    }
  }

  try {
    let result;

    if (from && to) {
      result = await pool.query(
        `SELECT e.*, s.end_date AS series_end_date, s.active AS series_active
         FROM events e
         LEFT JOIN event_series s ON s.id = e.series_id
         WHERE (e.scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
           BETWEEN $1::date AND $2::date
         ORDER BY e.scheduled_at ASC`,
        [from, to]
      );
    } else {
      result = await pool.query(
        `SELECT e.*, s.end_date AS series_end_date, s.active AS series_active
         FROM events e
         LEFT JOIN event_series s ON s.id = e.series_id
         ORDER BY e.scheduled_at ASC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// POST /api/events — crear evento
router.post('/', async (req, res) => {
  const { title, description, scheduled_at, person, recurrence } = req.body;

  if (!title || !scheduled_at || !person) {
    return res.status(400).json({ error: 'title, scheduled_at y person son requeridos' });
  }

  try {
    if (recurrence) {
      if (recurrence.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(recurrence.end_date)) {
        return res.status(400).json({ error: 'end_date debe tener formato YYYY-MM-DD' });
      }
      if (recurrence.end_date && recurrence.end_date < scheduled_at.slice(0, 10)) {
        return res.status(400).json({ error: 'end_date no puede ser anterior al evento' });
      }

      const seriesResult = await pool.query(
        `INSERT INTO event_series
          (title, description, person, first_scheduled_at, end_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, description || null, person, scheduled_at, recurrence.end_date || null]
      );
      const series = seriesResult.rows[0];
      const occurrences = await materializeOccurrences(series);
      await createRemindersForRows(occurrences);
      const first = occurrences[0];
      return res.status(201).json(first);
    }

    const result = await pool.query(
      'INSERT INTO events (title, description, scheduled_at, person) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || null, scheduled_at, person || null]
    );
    const event = result.rows[0];
    try {
      const cronJobId = await createReminderJob(event);
      if (cronJobId) {
        await pool.query('UPDATE events SET cron_job_id=$1 WHERE id=$2', [cronJobId, event.id]);
        event.cron_job_id = cronJobId;
      }
    } catch (cronErr) {
      console.error('Error al crear cron job de recordatorio:', cronErr.message, cronErr.response?.data);
    }
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear evento' });
  }
});

// PUT /api/events/:id — editar evento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, scheduled_at, person, recurrence, scope = 'single' } = req.body;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  if (!title || !scheduled_at || !person) {
    return res.status(400).json({ error: 'title, scheduled_at y person son requeridos' });
  }

  try {
    // Obtener cron_job_id actual antes de modificar
    const current = await pool.query('SELECT cron_job_id FROM events WHERE id=$1', [id]);
    const oldCronJobId = current.rows[0]?.cron_job_id;

    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, scheduled_at=$3, person=$4 WHERE id=$5 AND telegram_sent=false RETURNING *',
      [title, description || null, scheduled_at, person || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const event = result.rows[0];
    if (scope !== 'single' && event.series_id) {
      const seriesResult = await pool.query('SELECT * FROM event_series WHERE id=$1', [event.series_id]);
      const series = seriesResult.rows[0];
      const firstIndex = event.occurrence_index;
      const futureResult = await pool.query(
        `SELECT * FROM events
         WHERE series_id=$1 AND occurrence_index >= $2 AND telegram_sent=false
         ORDER BY occurrence_index ASC`,
        [event.series_id, firstIndex]
      );
      await Promise.all(futureResult.rows.map((row) => deleteReminderJob(row.cron_job_id)));
      await pool.query(
        'DELETE FROM events WHERE series_id=$1 AND occurrence_index >= $2 AND telegram_sent=false',
        [event.series_id, firstIndex]
      );
      const newFirstScheduledAt = scope === 'following'
        ? addMonthClamped(scheduled_at, -firstIndex)
        : addMonthClamped(scheduled_at, -firstIndex);
      await pool.query(
        `UPDATE event_series SET title=$1, description=$2, person=$3,
          first_scheduled_at=$4, end_date=$5 WHERE id=$6`,
        [
          title,
          description || null,
          person,
          newFirstScheduledAt,
          recurrence?.end_date || series.end_date || null,
          event.series_id,
        ]
      );
      const updatedSeries = { ...series, title, description, person, first_scheduled_at: newFirstScheduledAt };
      const regenerated = await materializeOccurrences(updatedSeries, firstIndex, getHorizonDate());
      await createRemindersForRows(regenerated);
      return res.json(regenerated[0] || event);
    }
    try {
      const cronJobId = await replaceReminderJob(oldCronJobId, event);
      await pool.query('UPDATE events SET cron_job_id=$1 WHERE id=$2', [cronJobId || null, event.id]);
      event.cron_job_id = cronJobId;
    } catch (cronErr) {
      console.error('Error al actualizar cron job de recordatorio:', cronErr.message, cronErr.response?.data);
    }
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar evento' });
  }
});

// PUT /api/events/:id/reschedule — reprogramar evento bloqueado (pasado o ya notificado)
router.put('/:id/reschedule', async (req, res) => {
  const { id } = req.params;
  const { title, description, scheduled_at, person } = req.body;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  if (!title || !scheduled_at || !person) {
    return res.status(400).json({ error: 'title, scheduled_at y person son requeridos' });
  }
  if (new Date(scheduled_at) <= new Date()) {
    return res.status(400).json({ error: 'La nueva fecha debe ser posterior al momento actual' });
  }

  try {
    // Obtener cron_job_id actual antes de reprogramar
    const current = await pool.query('SELECT cron_job_id FROM events WHERE id=$1', [id]);
    const oldCronJobId = current.rows[0]?.cron_job_id;

    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, scheduled_at=$3, person=$4, telegram_sent=false WHERE id=$5 RETURNING *',
      [title, description || null, scheduled_at, person || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    const event = result.rows[0];
    try {
      const cronJobId = await replaceReminderJob(oldCronJobId, event);
      await pool.query('UPDATE events SET cron_job_id=$1 WHERE id=$2', [cronJobId || null, event.id]);
      event.cron_job_id = cronJobId;
    } catch (cronErr) {
      console.error('Error al actualizar cron job de recordatorio:', cronErr.message, cronErr.response?.data);
    }
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reprogramar evento' });
  }
});

// DELETE /api/events/:id — eliminar evento
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const scope = req.query.scope || 'single';

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const current = await pool.query('SELECT * FROM events WHERE id=$1', [id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    const event = current.rows[0];
    let result;
    if (scope === 'single' || !event.series_id) {
      result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [id]);
    } else {
      const condition = scope === 'following' ? 'AND occurrence_index >= $2' : '';
      const future = await pool.query(
        `SELECT * FROM events
         WHERE series_id=$1 AND telegram_sent=false AND scheduled_at >= CURRENT_TIMESTAMP ${condition}`,
        scope === 'following' ? [event.series_id, event.occurrence_index] : [event.series_id]
      );
      await Promise.all(future.rows.map((row) => deleteReminderJob(row.cron_job_id)));
      await pool.query(
        `DELETE FROM events
         WHERE series_id=$1 AND telegram_sent=false AND scheduled_at >= CURRENT_TIMESTAMP ${condition}`,
        scope === 'following' ? [event.series_id, event.occurrence_index] : [event.series_id]
      );
      await pool.query(
        'UPDATE event_series SET active=false WHERE id=$1',
        [event.series_id]
      );
      return res.json({ message: 'Serie eliminada' });
    }
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    // Eliminar cron job de recordatorio si existe
    try {
      await deleteReminderJob(result.rows[0].cron_job_id);
    } catch (cronErr) {
      console.error('Error al eliminar cron job de recordatorio:', cronErr.message);
    }
    res.json({ message: 'Evento eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

module.exports = router;
