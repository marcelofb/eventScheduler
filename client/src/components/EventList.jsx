import EventCard from './EventCard';

export default function EventList({ events, loading, onDeleted }) {
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

  return (
    <div className="event-list">
      {upcoming.length > 0 && (
        <section>
          <h3 className="list-section-title">Próximos</h3>
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} onDeleted={onDeleted} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="list-section-title past">Anteriores</h3>
          {past.map((e) => (
            <EventCard key={e.id} event={e} onDeleted={onDeleted} />
          ))}
        </section>
      )}
    </div>
  );
}
