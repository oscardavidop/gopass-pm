import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { tasksService } from '@/services/tasks.service';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

const PRIORITY_BG: Record<string, string> = {
  LOW:      '#64748b',
  MEDIUM:   '#3b82f6',
  HIGH:     '#f59e0b',
  CRITICAL: '#ef4444',
};

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'dayGridMonth' | 'dayGridWeek'>('dayGridMonth');

  /* Fetch all projects then all their tasks */
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all-for-calendar'],
    queryFn: () => projectsService.list({ limit: 100 } as any),
  });
  const projects: any[] = projectsData?.items ?? projectsData ?? [];

  const projectIds: string[] = projects.map((p: any) => p.id);

  const tasksQueries = useQuery({
    queryKey: ['calendar-tasks', projectIds.join(',')],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const results = await Promise.all(
        projectIds.map((id) => tasksService.listByProject(id, { limit: 200 } as any)),
      );
      return results.flatMap((r: any) => r?.items ?? r ?? []);
    },
    enabled: projectIds.length > 0,
  });

  const events = useMemo(() => {
    const tasks: any[] = tasksQueries.data ?? [];
    return tasks
      .filter((t: any) => !!t.dueDate)
      .map((t: any) => {
        const project = projects.find((p: any) => p.id === t.projectId);
        return {
          id: t.id,
          title: t.title,
          date: t.dueDate,
          backgroundColor: PRIORITY_BG[t.priority] ?? '#6366f1',
          borderColor: PRIORITY_BG[t.priority] ?? '#6366f1',
          textColor: '#ffffff',
          extendedProps: { task: t, project },
        };
      });
  }, [tasksQueries.data, projects]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks with due dates across all projects</p>
        </div>

        <div className="flex items-center gap-2 bg-accent/40 rounded-lg p-1">
          <button
            onClick={() => setView('dayGridMonth')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              view === 'dayGridMonth'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            Month
          </button>
          <button
            onClick={() => setView('dayGridWeek')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              view === 'dayGridWeek'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Week
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(PRIORITY_BG).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c }} />
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      {/* Calendar */}
      {events.length === 0 && !tasksQueries.isLoading ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="No tasks with due dates"
          description="Tasks with due dates will appear here. Set a due date on any task to see it on the calendar."
          primaryAction={{ label: 'Go to Projects', onClick: () => navigate('/projects') }}
        />
      ) : (
        <div className="card p-4 rounded-xl border border-border bg-card calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView={view}
            key={view}
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            height="auto"
            eventClick={({ event }) => {
              const task = event.extendedProps.task;
              if (task?.projectId) navigate(`/projects/${task.projectId}`);
            }}
            eventContent={({ event }) => (
              <div className="px-1.5 py-0.5 truncate text-[11px] font-medium">
                {event.title}
              </div>
            )}
            dayCellClassNames="hover:bg-accent/30 transition-colors cursor-pointer"
            dayMaxEvents={4}
            moreLinkText={(n) => `+${n} more`}
          />
        </div>
      )}
    </motion.div>
  );
}
