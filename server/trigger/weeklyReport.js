const { Router } = require('express');
const { pool } = require('../db/database');
const { sendTelegramMessage } = require('../telegram/bot');

const router = Router();

// POST /api/weekly-report — llamado por cron-job.org los domingos a las 16:15 ARG
router.post('/', async (req, res) => {
  const secret = req.headers['x-cron-secret'];

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    // Eventos de la semana próxima (lunes a domingo siguiente) en horario ARG
    const result = await pool.query(`
      SELECT * FROM events
      WHERE (scheduled_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
          BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 1
              AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 7
      ORDER BY scheduled_at ASC
    `);

    const events = result.rows;

    if (events.length === 0) {
      await sendTelegramMessage('📅 <b>Reporte semanal</b>\n\nNo hay eventos agendados para la semana que viene.');
      return res.json({ message: 'Reporte enviado (sin eventos)' });
    }

    // Agrupar por día
    const byDay = {};
    for (const e of events) {
      const date = new Date(e.scheduled_at).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(e);
    }

    const dayLines = Object.entries(byDay).map(([day, evs]) => {
      const items = evs.map((e) => {
        const time = new Date(e.scheduled_at).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Argentina/Buenos_Aires',
        });
        const person = e.person ? ` (${e.person})` : '';
        const desc = e.description ? `\n      ${e.description}` : '';
        return `  • <b>${time}</b> — ${e.title}${person}${desc}`;
      });
      const capitalDay = day.charAt(0).toUpperCase() + day.slice(1);
      return `<b>${capitalDay}</b>\n${items.join('\n')}`;
    });

    const message = `📅 <b>Reporte semanal</b>\n\n${dayLines.join('\n\n')}`;

    await sendTelegramMessage(message);

    res.json({ message: `Reporte enviado con ${events.length} evento(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el reporte semanal' });
  }
});

module.exports = router;
