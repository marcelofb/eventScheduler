import { useState } from 'react';
import { createEvent } from '../api';

export default function EventForm({ onEventCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const event = await createEvent({ title, description, scheduled_at: scheduledAt });
      onEventCreated(event);
      setTitle('');
      setDescription('');
      setScheduledAt('');
    } catch {
      setError('No se pudo guardar el evento. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <h2>Nuevo evento</h2>

      <div className="field">
        <label htmlFor="title">Título *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Pagar alquiler"
          required
          maxLength={100}
        />
      </div>

      <div className="field">
        <label htmlFor="description">Descripción</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle opcional"
          maxLength={200}
        />
      </div>

      <div className="field">
        <label htmlFor="scheduled_at">Fecha y hora *</label>
        <input
          id="scheduled_at"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando...' : 'Agregar evento'}
      </button>
    </form>
  );
}
