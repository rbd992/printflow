import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

let _serverUrl = '';

export async function initApi() {
  _serverUrl = await window.printflow.getServerUrl();
}

export function getServerUrl() { return _serverUrl; }
export function setServerUrlCache(url) { _serverUrl = url; }

function createClient() {
  const client = axios.create({ timeout: 15000 });

  // Inject Authorization header on every request
  client.interceptors.request.use(async (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.baseURL = _serverUrl;
    return config;
  });

  // Handle 401 — only logout if it's an auth endpoint, not a missing/broken route
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status === 401) {
        const url = err.config?.url || '';
        // Only force logout on core auth endpoints, not on feature routes
        // that may not be patched into the container yet
        const isAuthRoute = url.includes('/api/auth/me') || url.includes('/api/auth/refresh');
        if (isAuthRoute) {
          useAuthStore.getState().logout();
        }
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const api = createClient();

// Convenience wrappers
export const authApi = {
  login:          (email, password) => api.post('/api/auth/login', { email, password }),
  logout:         ()                => api.post('/api/auth/logout'),
  me:             ()                => api.get('/api/auth/me'),
  refresh:        ()                => api.post('/api/auth/refresh'),
  changePassword: (cur, next)       => api.post('/api/auth/change-password', { currentPassword: cur, newPassword: next }),
};

export const usersApi = {
  list:   ()         => api.get('/api/users'),
  get:    (id)       => api.get(`/api/users/${id}`),
  create: (data)     => api.post('/api/users', data),
  update: (id, data) => api.patch(`/api/users/${id}`, data),
  remove: (id)       => api.delete(`/api/users/${id}`),
};

export const filamentApi = {
  list:     ()              => api.get('/api/filament'),
  lowStock: ()              => api.get('/api/filament/low-stock'),
  get:      (id)            => api.get(`/api/filament/${id}`),
  create:   (data)          => api.post('/api/filament', data),
  update:   (id, data)      => api.patch(`/api/filament/${id}`, data),
  deduct:   (id, grams)     => api.post(`/api/filament/${id}/deduct`, { grams }),
  remove:   (id)            => api.delete(`/api/filament/${id}`),
};

export const ordersApi = {
  list:   (params)   => api.get('/api/orders', { params }),
  get:    (id)       => api.get(`/api/orders/${id}`),
  create: (data)     => api.post('/api/orders', data),
  update: (id, data) => api.patch(`/api/orders/${id}`, data),
  remove: (id)       => api.delete(`/api/orders/${id}`),
};

export const partsApi = {
  list:   ()         => api.get('/api/parts'),
  create: (data)     => api.post('/api/parts', data),
  update: (id, data) => api.patch(`/api/parts/${id}`, data),
  remove: (id)       => api.delete(`/api/parts/${id}`),
};

export const dashboardApi = {
  get: () => api.get('/api/dashboard'),
};

export const printersApi = {
  list:       ()         => api.get('/api/printers'),
  register:   (data)     => api.post('/api/printers', data),
  updateTray: (serial, data) => api.patch(`/api/printers/${serial}/tray`, data),
  remove:     (id)       => api.delete(`/api/printers/${id}`),
};

export const auditApi = {
  list: (params) => api.get('/api/audit', { params }),
};

export const settingsApi = {
  get:    (key)        => api.get(`/api/settings/${key}`),
  set:    (key, value) => api.put(`/api/settings/${key}`, { value }),
  delete: (key)        => api.delete(`/api/settings/${key}`),
};

export const shopifyApi = {
  // Proxies Shopify API calls through the NAS server to avoid CORS
  proxy: (storeUrl, apiKey, path, method = 'GET', body) =>
    api.post('/api/shopify/proxy', { storeUrl, apiKey, path, method, body }),
};
