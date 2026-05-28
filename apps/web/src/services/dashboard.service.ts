import { api } from './api';

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats').then((r) => r.data.data),
  getProjectsOverview: () => api.get('/dashboard/projects-overview').then((r) => r.data.data),
  getActivity: (limit = 20) => api.get('/dashboard/activity', { params: { limit } }).then((r) => r.data.data),
  getTimeline: () => api.get('/dashboard/timeline').then((r) => r.data.data),
};
