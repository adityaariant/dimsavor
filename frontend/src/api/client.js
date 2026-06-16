const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export let currentApiKey = null;
export const setApiKey = (key) => currentApiKey = key;

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (currentApiKey) {
    headers['X-API-Key'] = currentApiKey;
  }

  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('unauthorized'));
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'API request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}
