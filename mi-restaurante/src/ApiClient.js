// src/apiClient.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

// === IA NUTRICIÓN ===
export async function obtenerIANutricion(nombrePlato) {
  return apiRequest(`/api/ia-nutricion?q=${encodeURIComponent(nombrePlato)}`);
}

// === GENÉRICO ===
export async function apiRequest(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getToken();

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.mensaje || 'Error en la petición';
    throw new Error(msg);
  }

  return data;
}

// PLATOS
export async function obtenerPlatos() {
  return apiRequest('/api/platos');
}

export async function crearPlato(plato) {
  return apiRequest('/api/platos', {
    method: 'POST',
    body: plato,
  });
}

export async function actualizarPlato(id, plato) {
  return apiRequest(`/api/platos/${id}`, {
    method: 'PUT',
    body: plato,
  });
}

export async function eliminarPlato(id) {
  return apiRequest(`/api/platos/${id}`, {
    method: 'DELETE',
  });
}

// PEDIDOS
export async function crearPedido(pedido) {
  return apiRequest('/api/pedidos', {
    method: 'POST',
    body: pedido,
  });
}
