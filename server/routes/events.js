const { Router } = require('express');
const { pool } = require('../db/database');

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
    res.status(201).json(result.rows[0]);
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
    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, scheduled_at=$3, person=$4 WHERE id=$5 AND telegram_sent=false RETURNING *',
      [title, description || null, scheduled_at, person || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(result.rows[0]);
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
    const result = await pool.query(
      'UPDATE events SET title=$1, description=$2, scheduled_at=$3, person=$4, telegram_sent=false WHERE id=$5 RETURNING *',
      [title, description || null, scheduled_at, person || null, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(result.rows[0]);
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
    res.json({ message: 'Evento eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

module.exports = router;
