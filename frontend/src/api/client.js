import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000
});

export async function sendQuery(query, filters = {}) {
  const { data } = await api.post('/query', { query, filters });
  return data;
}

export async function uploadFile(file) {
  const text = await file.text();
  const { data } = await api.post('/ingest', {
    source: 'manual_upload',
    data: { text }
  });
  return data;
}

export async function ingestText(source, text) {
  const { data } = await api.post('/ingest', { source, data: { text } });
  return data;
}

export async function getSystemStatus() {
  const { data } = await api.get('/system/status');
  return data;
}

export async function getDecisions() {
  const { data } = await api.get('/decisions');
  return data.decisions || [];
}

export async function getPendingActions() {
  const { data } = await api.get('/actions/pending');
  return data.pending || [];
}

export async function approveAction(id, action) {
  const { data } = await api.post('/actions/approve', { id, action });
  return data;
}

export async function getAuditLogs() {
  const { data } = await api.get('/audit-logs');
  return data.logs || [];
}

export async function getActionHistory() {
  const { data } = await api.get('/actions/history');
  return data.actions || [];
}

export async function getRecentSources(limit = 10) {
  const { data } = await api.get('/sources/recent', { params: { limit } });
  return data.sources || [];
}
