import client from './client';
import { setTokens, clearTokens, getRefreshToken } from '../store/auth';

export async function login(username, password) {
  const res = await client.post('/auth/login', { username, password });
  if (res.data.requires_2fa) {
    return { requires_2fa: true, partial_token: res.data.partial_token };
  }
  setTokens(res.data.access_token, res.data.refresh_token);
  return { success: true };
}

export async function verify2fa(partialToken, token) {
  const res = await client.post('/auth/verify-2fa', {
    partial_token: partialToken,
    token,
  });
  setTokens(res.data.access_token, res.data.refresh_token);
  return { success: true };
}

export async function logout() {
  const refresh = getRefreshToken();
  try {
    await client.post('/auth/logout', { refresh_token: refresh });
  } catch {}
  clearTokens();
}

export async function setup2fa() {
  const res = await client.get('/auth/2fa/setup');
  return res.data;
}

export async function confirm2fa(token) {
  const res = await client.post('/auth/2fa/confirm', { token });
  return res.data;
}
