import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000
});

export async function sendQuery(query, filters = {}) {
  const { data } = await api.post('/query', { query, filters });
  return data;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/ingest/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
