const axios = require('axios');

const CRON_JOB_ORG_API = 'https://api.cron-job.org';

/**
 * Crea un cron job de una sola vez en cron-job.org que llama directamente
 * a la API de Telegram ~15 minutos antes del evento.
 * Devuelve el/los jobId(s) como string separado por comas, o null si no corresponde crear.
 */
async function createReminderJob(event) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;

  if (!apiKey || !token || chatIds.length === 0) return null;

  // Tiempo del recordatorio: 15 min antes del evento
  const reminderTime = new Date(new Date(event.scheduled_at).getTime() - 15 * 60 * 1000);

  // Si ya pasó el momento del recordatorio, no crear job
  if (reminderTime <= new Date()) return null;

  // Hora de visualización del evento en zona Argentina
  const eventTime = new Date(event.scheduled_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const person = event.person ? ` (${event.person})` : '';
  const desc = event.description ? `\n${event.description}` : '';
  const text = `⏰ <b>En ~15 min</b>: ${event.title}${person} a las <b>${eventTime}</b>${desc}`;

  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  // Campos de schedule en UTC
  const hours = reminderTime.getUTCHours();
  const minutes = reminderTime.getUTCMinutes();
  const mdays = reminderTime.getUTCDate();
  const months = reminderTime.getUTCMonth() + 1;

  // El job expira 5 minutos después del disparo → efectivamente se ejecuta una sola vez
  const expiresAt = Math.floor(reminderTime.getTime() / 1000) + 5 * 60;

  const jobIds = [];
  for (const chatId of chatIds) {
    const response = await axios.put(
      `${CRON_JOB_ORG_API}/jobs`,
      {
        job: {
          url: telegramUrl,
          enabled: true,
          title: `Reminder: ${event.title}`,
          requestMethod: 1, // POST
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
          headers: [{ name: 'Content-Type', value: 'application/json' }],
          schedule: {
            timezone: 'UTC',
            expiresAt,
            hours: [hours],
            mdays: [mdays],
            minutes: [minutes],
            months: [months],
            wdays: [-1],
          },
        },
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    jobIds.push(String(response.data.jobId));
  }

  return jobIds.join(',');
}

/**
 * Elimina uno o varios cron jobs de cron-job.org dado el string de IDs guardado en DB.
 * Los errores de eliminación se loguean pero no propagan (el evento ya puede estar eliminado).
 */
async function deleteReminderJob(cronJobId) {
  if (!cronJobId) return;
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;
  if (!apiKey) return;

  const jobIds = String(cronJobId)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  await Promise.all(
    jobIds.map((id) =>
      axios
        .delete(`${CRON_JOB_ORG_API}/jobs/${id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        .catch((err) => console.error(`Error al eliminar cron job ${id}:`, err.message))
    )
  );
}

/**
 * Reemplaza un cron job existente por uno nuevo.
 * Incluye un delay entre el DELETE y el PUT para evitar rate limiting (HTTP 429).
 */
async function replaceReminderJob(oldCronJobId, event) {
  await deleteReminderJob(oldCronJobId);
  await new Promise((resolve) => setTimeout(resolve, 700));
  return createReminderJob(event);
}

module.exports = { createReminderJob, deleteReminderJob, replaceReminderJob };
