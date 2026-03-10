import client from './client';

export async function getApps() {
  const res = await client.get('/apps');
  return res.data;
}

export async function createApp(data) {
  const res = await client.post('/apps', data);
  return res.data;
}

export async function updateApp(id, data) {
  const res = await client.put(`/apps/${id}`, data);
  return res.data;
}

export async function deleteApp(id) {
  const res = await client.delete(`/apps/${id}`);
  return res.data;
}

export async function getAppCredential(id) {
  const res = await client.get(`/apps/${id}/credential`);
  return res.data;
}

export async function triggerAction(id, action) {
  const res = await client.post(`/apps/${id}/action`, action);
  return res.data;
}
