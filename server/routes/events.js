const { Router } = require('express');
const { pool } = require('../db/database');
const { createReminderJob, deleteReminderJob, replaceReminderJob } = require('../lib/cronJobsApi');

const router = Router();

// GET /api/events — todos los eventos ordenados por fecha
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM events ORDER BY scheduled_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// POST /api/events — crear evento
router.post('/', async (req, res) => {
  const { title, description, scheduled_at, person } = req.body;

  if (!title || !scheduled_at || !person) {
    return res.status(400).json({ error: 'title, scheduled_at y person son requeridos' });
  }

  try {
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
  const { title, description, scheduled_at, person } = req.body;

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

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [id]
    );
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
