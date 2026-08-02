import { useState } from 'react';
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

export default function EventCard({ event, onDeleted, onDeleteError, onEdit, onReschedule, isPast }) {
  const isBlocked = isPast || event.telegram_sent;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) return;
    if (!window.confirm(`¿Eliminar "${event.title}"?`)) return;

    setDeleting(true);

    try {
      await deleteEvent(event.id);
      onDeleted(event.id, event.title);
    } catch {
      if (onDeleteError) onDeleteError();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`event-card ${event.telegram_sent ? 'sent' : ''}`}>
      <div className="event-card-header">
        <span className="event-date">{formatDate(event.scheduled_at)}</span>
        {event.telegram_sent && <span className="badge-sent">✓ Enviado</span>}
      </div>
      <h3 className="event-title">{event.title}</h3>
      {event.person && <p className="event-person">👤 {event.person}</p>}
      {event.description && <p className="event-description">{event.description}</p>}
      {!isBlocked ? (
        <div className="card-actions">
          <button className="btn-edit" onClick={() => onEdit(event)} aria-label="Editar evento">
            Editar
          </button>
          <button className="btn-delete" onClick={handleDelete} aria-label="Eliminar evento" disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      ) : (
        onReschedule && (
          <div className="card-actions">
            <button
              className="btn-reschedule"
              onClick={() => onReschedule(event)}
              aria-label="Reprogramar evento"
            >
              Reprogramar
            </button>
          </div>
        )
      )}
    </div>
  );
}
