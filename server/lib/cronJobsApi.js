const axios = require('axios');

const CRON_JOB_ORG_API = 'https://api.cron-job.org';

// Construye el payload del job a partir de los datos del evento y un chat ID
function buildJobPayload(event, chatId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const reminderTime = new Date(new Date(event.scheduled_at).getTime() - 15 * 60 * 1000);
  const eventTime = new Date(event.scheduled_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const person = event.person ? ` (${event.person})` : '';
  const desc = event.description ? `\n${event.description}` : '';
  const text = `⏰ <b>En ~15 min</b>: ${event.title}${person} a las <b>${eventTime}</b>${desc}`;

  // expiresAt: formato YYYYMMDDhhmmss en UTC (no Unix timestamp)
  const expiry = new Date(reminderTime.getTime() + 5 * 60 * 1000);
  const expiresAt = parseInt(
    `${expiry.getUTCFullYear()}` +
    String(expiry.getUTCMonth() + 1).padStart(2, '0') +
    String(expiry.getUTCDate()).padStart(2, '0') +
    String(expiry.getUTCHours()).padStart(2, '0') +
    String(expiry.getUTCMinutes()).padStart(2, '0') +
    String(expiry.getUTCSeconds()).padStart(2, '0')
  );

  return {
    url: `https://api.telegram.org/bot${token}/sendMessage`,
    enabled: true,
    title: `Reminder: ${event.title}`,
    requestMethod: 1,
    // body y headers van dentro de extendedData según la API de cron-job.org
    extendedData: {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    },
    schedule: {
      timezone: 'UTC',
      expiresAt,
      hours: [reminderTime.getUTCHours()],
      mdays: [reminderTime.getUTCDate()],
      minutes: [reminderTime.getUTCMinutes()],
      months: [reminderTime.getUTCMonth() + 1],
      wdays: [-1],
    },
  };
}

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

  const reminderTime = new Date(new Date(event.scheduled_at).getTime() - 15 * 60 * 1000);
  if (reminderTime <= new Date()) return null;

  const jobIds = [];
  for (const chatId of chatIds) {
    if (jobIds.length > 0) await new Promise((r) => setTimeout(r, 1200)); // límite: 1 req/seg
    const response = await axios.put(
      `${CRON_JOB_ORG_API}/jobs`,
      { job: buildJobPayload(event, chatId) },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
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
 * Actualiza los cron jobs existentes usando PATCH (1 llamada por job) en lugar de
 * DELETE + PUT (2 llamadas), evitando el rate limiting HTTP 429 de cron-job.org.
 * Fallback a delete+recrear si los IDs no coinciden en cantidad o el reminder es pasado.
 */
async function replaceReminderJob(oldCronJobId, event) {
  const apiKey = process.env.CRON_JOB_ORG_API_KEY;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!oldCronJobId) return createReminderJob(event);

  const oldIds = String(oldCronJobId).split(',').map((id) => id.trim()).filter(Boolean);
  const reminderTime = new Date(new Date(event.scheduled_at).getTime() - 15 * 60 * 1000);

  // PATCH in-place: 1 sola llamada API por job cuando la cantidad de IDs coincide
  if (apiKey && oldIds.length === chatIds.length && reminderTime > new Date()) {
    for (let i = 0; i < oldIds.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 700));
      await axios.patch(
        `${CRON_JOB_ORG_API}/jobs/${oldIds[i]}`,
        { job: buildJobPayload(event, chatIds[i]) },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
    }
    return oldCronJobId; // mismos IDs, payload actualizado
  }

  // Fallback: eliminar y recrear con delay
  await deleteReminderJob(oldCronJobId);
  if (reminderTime <= new Date()) return null;
  await new Promise((r) => setTimeout(r, 1500));
  return createReminderJob(event);
}

module.exports = { createReminderJob, deleteReminderJob, replaceReminderJob };
