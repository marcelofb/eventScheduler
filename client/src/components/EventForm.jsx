import { useState, useEffect, useRef } from 'react';
import { createEvent, updateEvent, rescheduleEvent } from '../api';

const PERSONS = ['Bicha', 'Bicho', 'Bicha y Bicho'];

function toDatetimeLocal(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({ onEventCreated, onEventUpdated, onEventRescheduled, editingEvent, mode = 'edit', onCancelEdit }) {
  const isEditing = !!editingEvent;
  const isRescheduling = isEditing && mode === 'reschedule';

  // Estado inicial derivado de props; al cambiar de evento/modo, App remonta
  // este componente vía `key`, por lo que los valores se recalculan.
  // Al reprogramar se exige una fecha nueva, no se reutiliza la anterior.
  const [title, setTitle] = useState(editingEvent?.title ?? '');
  const [description, setDescription] = useState(editingEvent?.description ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    editingEvent && !isRescheduling ? toDatetimeLocal(editingEvent.scheduled_at) : ''
  );
  const [person, setPerson] = useState(editingEvent?.person ?? '');
  const [isRecurring, setIsRecurring] = useState(!!editingEvent?.series_id);
  const [endDate, setEndDate] = useState(editingEvent?.series_end_date ?? '');
  const [editScope, setEditScope] = useState('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [minDateTime] = useState(() =>
    toDatetimeLocal(new Date(Date.now() + 60000).toISOString())
  );
  const formRef = useRef(null);

  useEffect(() => {
    if (editingEvent) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingEvent]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (new Date(scheduledAt) <= new Date()) {
      setError('La fecha y hora deben ser posteriores al momento actual.');
      return;
    }

    setLoading(true);
    const payload = {
      title,
      description,
      scheduled_at: new Date(scheduledAt).toISOString(),
      person,
      ...(isRecurring ? { recurrence: { end_date: endDate || null } } : {}),
    };
    try {
      if (isRescheduling) {
        const rescheduled = await rescheduleEvent(editingEvent.id, payload);
        onEventRescheduled(rescheduled);
      } else if (isEditing) {
        const updated = await updateEvent(editingEvent.id, payload, editScope);
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
      <h2>{isRescheduling ? 'Reprogramar evento' : isEditing ? 'Editar evento' : 'Nuevo evento'}</h2>

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

      {!isEditing && (
        <div className="field recurrence-field">
          <label className="recurrence-toggle" htmlFor="recurrence">
            <input
              id="recurrence"
              className="recurrence-checkbox"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <span>Se repite todos los meses</span>
          </label>
        </div>
      )}

      {isRecurring && !isRescheduling && (
        <div className="field">
          <label htmlFor="end_date">Termina el (opcional)</label>
          <input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      )}

      {isEditing && editingEvent.series_id && !isRescheduling && (
        <div className="field">
          <label htmlFor="edit_scope">Aplicar cambios a</label>
          <select id="edit_scope" value={editScope} onChange={(e) => setEditScope(e.target.value)}>
            <option value="single">Solo este evento</option>
            <option value="following">Este y los siguientes</option>
            <option value="all">Toda la serie</option>
          </select>
        </div>
      )}

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
          min={minDateTime}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="person">Para *</label>
        <select
          id="person"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          required
        >
          <option value="">— Seleccioná —</option>
          {PERSONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : isRescheduling ? 'Reprogramar' : isEditing ? 'Guardar cambios' : 'Agregar evento'}
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
