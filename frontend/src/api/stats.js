import client from './client';

export async function getAllStats() {
  const res = await client.get('/stats');
  return res.data;
}

export async function getAppStats(id) {
  const res = await client.get(`/stats/${id}`);
  return res.data;
}

export async function getAppHistory(id) {
  const res = await client.get(`/stats/${id}/history`);
  return res.data;
}

export async function fetchCalendar(appId, start, end) {
  const res = await client.get(`/calendar/${appId}`, { params: { start, end } });
  return res.data;
}
