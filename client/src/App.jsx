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
  const [deleteFeedback, setDeleteFeedback] = useState(null);

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
    if (!deleteFeedback) return undefined;

    const feedbackTimer = setTimeout(() => {
      setDeleteFeedback(null);
    }, 3000);

    return () => clearTimeout(feedbackTimer);
  }, [deleteFeedback]);

  function handleEventCreated(newEvent) {
    setEvents((prev) =>
      [...prev, newEvent].sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      )
    );
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

  function handleEventDeleted(id, title) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeleteFeedback({
      type: 'success',
      message: `Evento "${title}" eliminado.`,
    });
  }

  function handleDeleteError() {
    setDeleteFeedback({
      type: 'error',
      message: 'No se pudo eliminar el evento. Intentá de nuevo.',
    });
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
              deleteFeedback={deleteFeedback}
              onDismissFeedback={() => setDeleteFeedback(null)}
            />
          </>
        )}
      </main>
    </div>
  );
}
