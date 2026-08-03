import { useState } from 'react';
import { getEvents } from '../api';
import EventCard from './EventCard';

const PERSON_OPTIONS = ['Todos', 'Bicha', 'Bicho', 'Bicha y Bicho'];

function toDateKeyInBuenosAires(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export default function EventList({
  events,
  loading,
  onDeleted,
  onDeleteError,
  onEdit,
  onReschedule,
}) {
  const [personFilter, setPersonFilter] = useState('Todos');
  const [showRangeSearch, setShowRangeSearch] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeEvents, setRangeEvents] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [rangeSearched, setRangeSearched] = useState(false);

  if (loading) return null; // App muestra el loader global

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <p>No hay eventos agendados.</p>
        <p className="empty-hint">Agregá uno arriba.</p>
      </div>
    );
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.scheduled_at) >= now);
  const past = events.filter((e) => new Date(e.scheduled_at) < now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKeyInBuenosAires(yesterday);

  const previousDayEvents = past
    .filter((e) => toDateKeyInBuenosAires(e.scheduled_at) === yesterdayKey)
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const filteredUpcoming =
    personFilter === 'Todos'
      ? upcoming
      : upcoming.filter((e) => e.person === personFilter);

  async function handleRangeSearch(event) {
    event.preventDefault();
    setRangeError('');

    if (!fromDate || !toDate) {
      setRangeError('Completá fecha desde y fecha hasta.');
      return;
    }

    if (fromDate > toDate) {
      setRangeError('La fecha desde no puede ser mayor que la fecha hasta.');
      return;
    }

    setRangeLoading(true);

    try {
      const data = await getEvents({ from: fromDate, to: toDate });
      setRangeEvents(data);
      setRangeSearched(true);
    } catch {
      setRangeError('No se pudo buscar por rango. Intentá nuevamente.');
    } finally {
      setRangeLoading(false);
    }
  }

  function handleClearRangeSearch() {
    setFromDate('');
    setToDate('');
    setRangeEvents([]);
    setRangeError('');
    setRangeSearched(false);
  }

  return (
    <div className="event-list">
      <section>
        <h3 className="list-section-title">Próximos</h3>
        <div className="filter-chips">
          {PERSON_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`filter-chip${personFilter === opt ? ' active' : ''}`}
              onClick={() => setPersonFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        {filteredUpcoming.length > 0 ? (
          filteredUpcoming.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onDeleted={onDeleted}
              onDeleteError={onDeleteError}
              onEdit={onEdit}
              onReschedule={onReschedule}
              isPast={false}
            />
          ))
        ) : upcoming.length > 0 ? (
          <p className="filter-empty">No hay próximos para {personFilter}.</p>
        ) : (
          <p className="filter-empty">No hay eventos próximos.</p>
        )}
      </section>

      <section>
        <h3 className="list-section-title past">Del día anterior</h3>
        {previousDayEvents.length > 0 ? (
          previousDayEvents.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onDeleted={onDeleted}
              onDeleteError={onDeleteError}
              onEdit={null}
              onReschedule={onReschedule}
              isPast={true}
            />
          ))
        ) : (
          <p className="filter-empty">No hay eventos del día anterior.</p>
        )}

        <button
          className="btn-toggle-past"
          onClick={() => setShowRangeSearch((v) => !v)}
        >
          {showRangeSearch ? '▲ Ocultar búsqueda por fecha' : '▼ Ver otros eventos por rango de fechas'}
        </button>

        {showRangeSearch && (
          <div className="range-search-box">
            <form className="range-search-form" onSubmit={handleRangeSearch}>
              <div className="field">
                <label htmlFor="fromDate">Desde</label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="toDate">Hasta</label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div className="range-actions">
                <button className="btn-primary" type="submit" disabled={rangeLoading}>
                  {rangeLoading ? 'Buscando...' : 'Buscar'}
                </button>
                <button className="btn-cancel" type="button" onClick={handleClearRangeSearch}>
                  Limpiar
                </button>
              </div>
            </form>

            {rangeError && <p className="form-error" style={{ marginTop: '10px' }}>{rangeError}</p>}

            {rangeSearched && !rangeError && (
              <div className="range-results">
                <h4 className="list-section-title">Resultados del rango</h4>
                {rangeEvents.length > 0 ? (
                  rangeEvents.map((e) => (
                    <EventCard
                      key={`range-${e.id}`}
                      event={e}
                      onDeleted={onDeleted}
                      onDeleteError={onDeleteError}
                      onEdit={new Date(e.scheduled_at) >= now ? onEdit : null}
                      onReschedule={onReschedule}
                      isPast={new Date(e.scheduled_at) < now}
                    />
                  ))
                ) : (
                  <p className="filter-empty">No hay eventos para ese rango.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
