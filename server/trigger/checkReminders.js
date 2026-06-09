const { Router } = require('express');
const { pool } = require('../db/database');
const { sendTelegramMessage } = require('../telegram/bot');

const router = Router();

// POST /api/check-reminders — llamado por cron-job.org a las 00:00
router.post('/', async (req, res) => {
  const secret = req.headers['x-cron-secret'];

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // Buscar eventos de hoy que aún no se notificaron (timezone Argentina)
    const result = await pool.query(`
      SELECT * FROM events
      WHERE (scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        AND telegram_sent = false
      ORDER BY scheduled_at ASC
    `);

    const events = result.rows;

    if (events.length === 0) {
      return res.json({ message: 'Sin recordatorios para hoy' });
    }

    // Armar mensaje agrupado
    const lines = events.map((e) => {
      const time = new Date(e.scheduled_at).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const desc = e.description ? `\n   ${e.description}` : '';
      const person = e.person ? ` (${e.person})` : '';
      return `• <b>${time}</b> — ${e.title}${person}${desc}`;
    });

    const message = `📅 <b>Recordatorios de hoy</b>\n\n${lines.join('\n\n')}`;

    await sendTelegramMessage(message);

    // Marcar como enviados
    const ids = events.map((e) => e.id);
    await pool.query(
      'UPDATE events SET telegram_sent = true WHERE id = ANY($1)',
      [ids]
    );

    res.json({ message: `${events.length} recordatorio(s) enviado(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar recordatorios' });
  }
});

module.exports = router;
