import { useState } from 'react';
import EventCard from './EventCard';

const PERSON_OPTIONS = ['Todos', 'Bicha', 'Bicho', 'Bicha y Bicho'];

export default function EventList({ events, loading, onDeleted, onEdit, onReschedule }) {
  const [personFilter, setPersonFilter] = useState('Todos');
  const [showPast, setShowPast] = useState(false);

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
  const past = events.filter((e) => new Date(e.scheduled_at) < now).reverse();

  const filteredUpcoming =
    personFilter === 'Todos'
      ? upcoming
      : upcoming.filter((e) => e.person === personFilter);

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
            <EventCard key={e.id} event={e} onDeleted={onDeleted} onEdit={onEdit} onReschedule={onReschedule} isPast={false} />
          ))
        ) : upcoming.length > 0 ? (
          <p className="filter-empty">No hay próximos para {personFilter}.</p>
        ) : (
          <p className="filter-empty">No hay eventos próximos.</p>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <button
            className="btn-toggle-past"
            onClick={() => setShowPast((v) => !v)}
          >
            {showPast ? '▲ Ocultar anteriores' : `▼ Ver anteriores (${past.length})`}
          </button>
          {showPast && (
            <>
              <h3 className="list-section-title past" style={{ marginTop: '12px' }}>Anteriores</h3>
              {past.map((e) => (
                <EventCard key={e.id} event={e} onDeleted={onDeleted} onEdit={null} onReschedule={onReschedule} isPast={true} />
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
