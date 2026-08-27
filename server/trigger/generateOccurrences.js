const { Router } = require('express');
const { pool } = require('../db/database');
const { createRemindersForRows, getHorizonDate, materializeOccurrences } = require('../lib/occurrences');

const router = Router();

router.post('/', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const seriesResult = await pool.query('SELECT * FROM event_series WHERE active = true');
    let generated = 0;

    for (const series of seriesResult.rows) {
      const lastResult = await pool.query(
        'SELECT COALESCE(MAX(occurrence_index), -1) AS last_index FROM events WHERE series_id=$1',
        [series.id]
      );
      const rows = await materializeOccurrences(
        series,
        Number(lastResult.rows[0].last_index) + 1,
        getHorizonDate()
      );
      await createRemindersForRows(rows);
      generated += rows.length;
    }

    res.json({ message: `${generated} ocurrencia(s) generada(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar ocurrencias' });
  }
});

module.exports = router;