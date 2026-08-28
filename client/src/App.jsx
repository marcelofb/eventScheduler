import { useState, useEffect } from 'react';
import { getEvents } from './api';
import EventForm from './components/EventForm';
import EventList from './components/EventList';
import './App.css';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowWarning, setSlowWarning] = useState(false);
  const [error, setError] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [formMode, setFormMode] = useState('edit');
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function handleEdit(event) {
    setFormMode('edit');
    setEditingEvent(event);
  }

  function handleReschedule(event) {
    setFormMode('reschedule');
    setEditingEvent(event);
  }

  function handleCancelEdit() {
    setEditingEvent(null);
    setFormMode('edit');
  }

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlowWarning(true), 4000);

    getEvents()
      .then((data) => {
        setEvents(data);
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor. Intentá recargar la página.');
      })
      .finally(() => {
        clearTimeout(slowTimer);
        setLoading(false);
        setSlowWarning(false);
      });

    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const feedbackTimer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(feedbackTimer);
  }, [toast]);

  function handleEventCreated(newEvent) {
    const createdEvents = newEvent.occurrences ?? [newEvent];
    setEvents((prev) =>
      [...prev, ...createdEvents].sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      )
    );
    showToast('¡Evento agregado!', 'success');
  }

  function handleEventUpdated(updated) {
    setEvents((prev) =>
      prev
        .map((e) => (e.id === updated.id ? updated : e))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    );
    handleCancelEdit();
  }

  function handleEventRescheduled(rescheduled) {
    setEvents((prev) =>
      prev
        .map((e) => (e.id === rescheduled.id ? rescheduled : e))
        .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    );
    handleCancelEdit();
  }

  function handleEventDeleted(id, title, scope = 'single', seriesId) {
    setEvents((prev) => prev.filter((e) => {
      if (scope === 'single') return e.id !== id;
      if (e.series_id !== seriesId) return true;
      if (scope === 'all') return e.telegram_sent || new Date(e.scheduled_at) < new Date();
      return e.id !== id && (e.telegram_sent || new Date(e.scheduled_at) < new Date());
    }));
    showToast(`Evento "${title}" eliminado.`, 'success');
  }

  function handleDeleteError() {
    showToast('No se pudo eliminar el evento. Intentá de nuevo.', 'error');
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📅 Agenda</h1>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
            {slowWarning ? (
              <>
                <p className="loading-title">Despertando el servidor...</p>
                <p className="loading-hint">
                  Esto puede tardar hasta 1 minuto la primera vez. Ya casi está.
                </p>
              </>
            ) : (
              <p className="loading-title">Cargando...</p>
            )}
          </div>
        ) : error ? (
          <div className="error-screen">
            <p>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <EventForm
              key={editingEvent ? `${editingEvent.id}-${formMode}` : 'new'}
              onEventCreated={handleEventCreated}
              onEventUpdated={handleEventUpdated}
              onEventRescheduled={handleEventRescheduled}
              editingEvent={editingEvent}
              mode={formMode}
              onCancelEdit={handleCancelEdit}
            />
            <EventList
              events={events}
              loading={loading}
              onDeleted={handleEventDeleted}
              onDeleteError={handleDeleteError}
              onEdit={handleEdit}
              onReschedule={handleReschedule}
            />
          </>
        )}
      </main>

      {toast && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className={`toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
              aria-label="Cerrar notificación"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
