import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../store/auth';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let refreshing = null;
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefreshToken();
      if (!refresh) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (!refreshing) {
        refreshing = axios.post('/api/auth/refresh', { refresh_token: refresh })
          .then((res) => {
            setTokens(res.data.access_token, res.data.refresh_token || refresh);
            refreshing = null;
            return res.data.access_token;
          })
          .catch(() => {
            clearTokens();
            refreshing = null;
            window.location.href = '/login';
            return null;
          });
      }

      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
    }
    return Promise.reject(error);
  }
);

export default client;
