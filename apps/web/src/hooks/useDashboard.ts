import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardService.getStats });
}

export function useDashboardProjectsOverview() {
  return useQuery({ queryKey: ['dashboard', 'projects-overview'], queryFn: dashboardService.getProjectsOverview });
}

export function useDashboardActivity(limit = 20) {
  return useQuery({ queryKey: ['dashboard', 'activity', limit], queryFn: () => dashboardService.getActivity(limit) });
}

export function useDashboardTimeline() {
  return useQuery({ queryKey: ['dashboard', 'timeline'], queryFn: dashboardService.getTimeline });
}
