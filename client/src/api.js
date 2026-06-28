const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function getEvents() {
  const res = await fetch(`${API_URL}/api/events`);
  if (!res.ok) throw new Error('Error al obtener eventos');
  return res.json();
}

export async function createEvent(data) {
  const res = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear evento');
  return res.json();
}

export async function updateEvent(id, data) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al editar evento');
  return res.json();
}

export async function rescheduleEvent(id, data) {
  const res = await fetch(`${API_URL}/api/events/${id}/reschedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al reprogramar evento');
  return res.json();
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar evento');
}
