import { useState, useEffect, useRef } from 'react';
import { createEvent, updateEvent } from '../api';

const PERSONS = ['Bicha', 'Bicho', 'Bicha y Bicho'];

function toDatetimeLocal(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({ onEventCreated, onEventUpdated, editingEvent, onCancelEdit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [person, setPerson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const isEditing = !!editingEvent;

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setScheduledAt(toDatetimeLocal(editingEvent.scheduled_at));
      setPerson(editingEvent.person || '');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setPerson('');
    }
    setError('');
  }, [editingEvent]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const payload = {
      title,
      description,
      scheduled_at: new Date(scheduledAt).toISOString(),
      person: person || null,
    };
    try {
      if (isEditing) {
        const updated = await updateEvent(editingEvent.id, payload);
        onEventUpdated(updated);
      } else {
        const created = await createEvent(payload);
        onEventCreated(created);
        setTitle('');
        setDescription('');
        setScheduledAt('');
        setPerson('');
      }
    } catch {
      setError('No se pudo guardar el evento. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    onCancelEdit();
  }

  return (
    <form className="event-form" onSubmit={handleSubmit} ref={formRef}>
      <h2>{isEditing ? 'Editar evento' : 'Nuevo evento'}</h2>

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

      <div className="field">
        <label htmlFor="person">Para</label>
        <select
          id="person"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        >
          <option value="">— Sin asignar —</option>
          {PERSONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar evento'}
        </button>
        {isEditing && (
          <button type="button" className="btn-cancel" onClick={handleCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
