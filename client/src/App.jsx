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

  function handleEventCreated(newEvent) {
    setEvents((prev) =>
      [...prev, newEvent].sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      )
    );
  }

  function handleEventDeleted(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
            <EventForm onEventCreated={handleEventCreated} />
            <EventList
              events={events}
              loading={loading}
              onDeleted={handleEventDeleted}
            />
          </>
        )}
      </main>
    </div>
  );
}
