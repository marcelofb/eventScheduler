const API_URL = import.meta.env.VITE_API_URL ?? '';

export async function getEvents(options = {}) {
  const params = new URLSearchParams();

  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);

  const query = params.toString();
  const url = `${API_URL}/api/events${query ? `?${query}` : ''}`;

  const res = await fetch(url);
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

export async function updateEvent(id, data, scope = 'single') {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, scope }),
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

export async function deleteEvent(id, scope = 'single') {
  const query = scope === 'single' ? '' : `?scope=${scope}`;
  const res = await fetch(`${API_URL}/api/events/${id}${query}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar evento');
}
