import { deleteEvent } from '../api';

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export default function EventCard({ event, onDeleted, isPast }) {
  async function handleDelete() {
    try {
      await deleteEvent(event.id);
      onDeleted(event.id);
    } catch {
      alert('No se pudo eliminar el evento.');
    }
  }

  return (
    <div className={`event-card ${event.telegram_sent ? 'sent' : ''}`}>
      <div className="event-card-header">
        <span className="event-date">{formatDate(event.scheduled_at)}</span>
        {event.telegram_sent && <span className="badge-sent">✓ Enviado</span>}
      </div>
      <h3 className="event-title">{event.title}</h3>
      {event.description && <p className="event-description">{event.description}</p>}
      {!isPast && (
        <button className="btn-delete" onClick={handleDelete} aria-label="Eliminar evento">
          Eliminar
        </button>
      )}
    </div>
  );
}
