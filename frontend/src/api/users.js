import client from './client';

export async function getUsers() {
  const res = await client.get('/users');
  return res.data;
}

export async function getMe() {
  const res = await client.get('/users/me');
  return res.data;
}

export async function createUser(data) {
  const res = await client.post('/users', data);
  return res.data;
}

export async function updateUser(id, data) {
  const res = await client.put(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id) {
  const res = await client.delete(`/users/${id}`);
  return res.data;
}

export async function disable2fa(id) {
  const res = await client.put(`/users/${id}/disable-2fa`);
  return res.data;
}

export async function getAuditLog(limit = 50, offset = 0) {
  const res = await client.get(`/audit?limit=${limit}&offset=${offset}`);
  return res.data;
}
