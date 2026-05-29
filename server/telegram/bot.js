const axios = require('axios');

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = (process.env.TELEGRAM_CHAT_ID || '').split(',').map((id) => id.trim()).filter(Boolean);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await Promise.all(
    chatIds.map((chatId) =>
      axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      })
    )
  );
}

module.exports = { sendTelegramMessage };
