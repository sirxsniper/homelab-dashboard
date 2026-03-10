let accessToken = sessionStorage.getItem('access_token') || null;
let refreshToken = sessionStorage.getItem('refresh_token') || null;

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  if (access) sessionStorage.setItem('access_token', access);
  else sessionStorage.removeItem('access_token');
  if (refresh) sessionStorage.setItem('refresh_token', refresh);
  else sessionStorage.removeItem('refresh_token');
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
}

export function isAuthenticated() {
  return !!accessToken;
}

export function parseToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function getUser() {
  const payload = parseToken(accessToken);
  if (!payload) return null;
  return { id: payload.sub, username: payload.username, role: payload.role };
}
