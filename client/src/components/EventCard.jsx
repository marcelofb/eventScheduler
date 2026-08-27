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
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  function handleDelete() {
    if (deleting) return;
    if (event.series_id) {
      setShowDeleteOptions(true);
      return;
    }
    if (window.confirm(`¿Eliminar "${event.title}"?`)) deleteWithScope('single');
  }

  async function deleteWithScope(scope) {
    if (deleting) return;
    setShowDeleteOptions(false);

    setDeleting(true);

    try {
      await deleteEvent(event.id, scope);
      onDeleted(event.id, event.title, scope, event.series_id);
    } catch {
      if (onDeleteError) onDeleteError();
    } finally {
      setDeleting(false);
    }
  }

  function handleModalKeyDown(e) {
    if (e.key === 'Escape') setShowDeleteOptions(false);
  }

  return (
    <div className={`event-card ${event.telegram_sent ? 'sent' : ''}`}>
      <div className="event-card-header">
        <span className="event-date">{formatDate(event.scheduled_at)}</span>
        {event.series_id && <span title="Se repite cada mes">↻ Mensual</span>}
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

      {showDeleteOptions && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowDeleteOptions(false);
        }}>
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${event.id}`}
            onKeyDown={handleModalKeyDown}
            tabIndex="-1"
            ref={(node) => node?.focus()}
          >
            <div className="delete-modal-header">
              <div>
                <p className="modal-eyebrow">Evento mensual</p>
                <h2 id={`delete-title-${event.id}`}>¿Qué querés eliminar?</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowDeleteOptions(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <p className="delete-modal-description">
              Elegí qué parte de “{event.title}” querés quitar.
            </p>
            <div className="delete-options">
              <button type="button" className="delete-option" onClick={() => deleteWithScope('single')}>
                <strong>Solo este evento</strong>
                <span>Conserva las demás fechas de la serie.</span>
              </button>
              <button type="button" className="delete-option" onClick={() => deleteWithScope('following')}>
                <strong>Este y los siguientes</strong>
                <span>Elimina esta fecha y las futuras.</span>
              </button>
              <button type="button" className="delete-option danger" onClick={() => deleteWithScope('all')}>
                <strong>Toda la serie</strong>
                <span>Elimina las fechas futuras, conserva el historial.</span>
              </button>
            </div>
            <button type="button" className="btn-cancel modal-cancel" onClick={() => setShowDeleteOptions(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
