# Event Scheduler

Agenda de eventos personal con recordatorios diarios por Telegram. PWA mobile-first.

## Stack

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| Frontend | React 18 + Vite + vite-plugin-pwa | Netlify |
| Backend | Node.js + Express | Render (free tier) |
| Base de datos | PostgreSQL serverless | Neon (free tier) |
| Recordatorios | Telegram Bot API | cron-job.org |

## Funcionalidades

- Crear, editar y eliminar eventos con fecha/hora
- Asignar evento a una persona (Bicha / Bicho / Bicha y Bicho)
- Notificación diaria por Telegram con todos los eventos del día
- Eventos pasados: solo lectura (no se pueden editar ni eliminar)
- Eventos ya notificados: bloqueados (no se pueden editar ni eliminar)
- Instalable como PWA en Android/iOS

## Estructura

```
event-scheduler/
├── client/          # React + Vite (frontend)
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
│           ├── EventForm.jsx
│           ├── EventList.jsx
│           └── EventCard.jsx
└── server/          # Express (backend)
    ├── index.js
    ├── db/database.js
    ├── routes/events.js
    ├── telegram/bot.js
    └── trigger/checkReminders.js
```

## Variables de entorno

Copiar `.env.example` como `.env` en la carpeta `server/`:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `TELEGRAM_CHAT_ID` | ID del chat donde se envían los recordatorios |
| `CRON_SECRET` | Secret para autenticar el trigger de cron-job.org |
| `ALLOWED_ORIGIN` | URL del frontend (para CORS) |
| `PORT` | Puerto del servidor (default: 3001) |

Para el frontend, crear `client/.env.local`:

```
VITE_API_URL=https://tu-backend.onrender.com
```

## Desarrollo local

```bash
# Terminal 1 — backend
cd server
npm install
node index.js

# Terminal 2 — frontend
cd client
npm install
npm run dev
```

El frontend corre en `http://localhost:5173` y proxea `/api` al backend en el puerto 3001.

## Deploy

### Backend → Render
- Root directory: `server/`
- Build command: `npm install`
- Start command: `node index.js`
- Agregar todas las variables de entorno del `.env.example`

### Frontend → Netlify
- Root directory: `client/`
- Build command: `npm run build`
- Publish directory: `dist`
- Variable de entorno: `VITE_API_URL=https://tu-backend.onrender.com`

### Cron → cron-job.org
- URL: `https://tu-backend.onrender.com/api/check-reminders`
- Método: `POST`
- Header: `x-cron-secret: <tu CRON_SECRET>`
- Horario: 03:00 UTC (= 00:00 Argentina)

## Notas

- Render free tier duerme tras 15 min de inactividad. El primer request del día puede tardar ~30s (el frontend muestra "Despertando el servidor..." después de 4s).
- La columna `person` se agrega automáticamente vía migración al iniciar el servidor (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
