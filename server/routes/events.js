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
  const { title, description, scheduled_at } = req.body;

  if (!title || !scheduled_at) {
    return res.status(400).json({ error: 'title y scheduled_at son requeridos' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, scheduled_at) VALUES ($1, $2, $3) RETURNING *',
      [title, description || null, scheduled_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear evento' });
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
