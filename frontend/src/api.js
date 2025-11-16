import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Episodes
export const getEpisodes = () => api.get('/episodes');
export const getEpisode = (id) => api.get(`/episodes/${id}`);
export const createEpisode = (data) => api.post('/episodes', data);
export const updateEpisode = (id, data) => api.put(`/episodes/${id}`, data);
export const deleteEpisode = (id) => api.delete(`/episodes/${id}`);

// Text-to-Speech
export const generateTTS = (data) => api.post('/tts/generate', data);
export const generateEpisodeAudio = (episodeId) => api.post(`/tts/generate-episode/${episodeId}`);

// ChatGPT
export const getChatGPTSuggestion = (data) => api.post('/chatgpt/suggest', data);
export const generateShownotes = (episodeId) => api.post(`/chatgpt/generate-shownotes/${episodeId}`);

// Analytics
export const getDashboardStats = () => api.get('/analytics/dashboard');
export const getEpisodeAnalytics = (episodeId) => api.get(`/analytics/episode/${episodeId}`);

// Voices
export const getVoices = () => api.get('/voices');

// Music
export const uploadMusic = (file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/music/upload?category=${category}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
export const getMusicLibrary = (category) => api.get('/music', { params: { category } });

export default api;
