require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/database');
const eventsRouter = require('./routes/events');
const checkRemindersRouter = require('./trigger/checkReminders');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: solo permite el origen del frontend
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
}));

app.use(express.json());

// Rutas
app.use('/api/events', eventsRouter);
app.use('/api/check-reminders', checkRemindersRouter);

// Health check para UptimeRobot o verificaciones básicas
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Iniciar servidor
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al inicializar la DB:', err);
    process.exit(1);
  });
