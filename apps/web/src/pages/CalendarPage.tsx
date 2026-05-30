import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'framer-motion';
import { Calendar, LayoutGrid, AlertCircle, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { projectsService } from '@/services/projects.service';
import { tasksService } from '@/services/tasks.service';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';

const PRIORITY_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  LOW:      { bg: '#475569', dot: 'bg-slate-500',  label: 'Low' },
  MEDIUM:   { bg: '#3b82f6', dot: 'bg-blue-500',   label: 'Medium' },
  HIGH:     { bg: '#f59e0b', dot: 'bg-amber-500',  label: 'High' },
  CRITICAL: { bg: '#ef4444', dot: 'bg-red-500',    label: 'Critical' },
};

function CalendarSkeleton() {
  return (
    <div className="space-y-1 p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <Skeleton key={col} className="h-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<'dayGridMonth' | 'dayGridWeek'>('dayGridMonth');

  const projectsQuery = useQuery({
    queryKey: ['projects', 'all-for-calendar'],
    queryFn: () => projectsService.list({ limit: 100 }),
  });
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data]);
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const tasksQuery = useQuery({
    queryKey: ['calendar-tasks', projectIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        projectIds.map((id) => tasksService.listByProject(id, { limit: 500 })),
      );
      return results.flatMap((r) => r?.items ?? []);
    },
    enabled: projectIds.length > 0,
    staleTime: 30_000,
  });

  // TQ v5: disabled query has isLoading=false but isPending=true
  const isLoading =
    projectsQuery.isLoading ||
    (projectIds.length > 0 && (tasksQuery.isLoading || tasksQuery.isPending));

  const isError = projectsQuery.isError || tasksQuery.isError;

  const allTasks = tasksQuery.data ?? [];

  const events = useMemo(() => {
    const now = new Date();
    return allTasks
      .filter((t) => !!t.dueDate)
      .map((t) => {
        const cfg = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.MEDIUM;
        const isOverdue = t.dueDate != null && new Date(t.dueDate) < now && t.status !== 'DONE';
        return {
          id: t.id,
          title: t.title,
          start: t.dueDate!,
          allDay: true,
          backgroundColor: isOverdue ? '#dc2626' : cfg.bg,
          borderColor: 'transparent',
          textColor: '#fff',
          extendedProps: { task: t, isOverdue },
        };
      });
  }, [allTasks]);

  const overdueCount = events.filter((e) => e.extendedProps.isOverdue).length;
  const noDueDateCount = allTasks.filter((t) => !t.dueDate).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('calendar.title', { defaultValue: 'Calendar' })}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? t('calendar.loadingTasks', { defaultValue: 'Loading tasks...' })
              : events.length > 0
              ? <>
                  {t('calendar.tasksWithDueDates', { defaultValue: '{{count}} tasks with due dates', count: events.length })}
                  {noDueDateCount > 0 && (
                    <span className="ml-2 text-muted-foreground/70">· {t('calendar.withoutDates', { defaultValue: '{{count}} without dates', count: noDueDateCount })}</span>
                  )}
                </>
              : allTasks.length > 0
              ? t('calendar.noDueDateInTasks', { defaultValue: '{{count}} tasks found - none have a due date', count: allTasks.length })
              : t('calendar.noTasksInProjects', { defaultValue: 'No tasks in your projects' })}
            {overdueCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">· {t('calendar.overdueCount', { defaultValue: '{{count}} overdue', count: overdueCount })}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(PRIORITY_CONFIG).map(([p, cfg]) => (
              <div key={p} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                {cfg.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0 bg-red-600" />
              Overdue
            </div>
          </div>

          <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-1 border border-border">
            <button
              onClick={() => setView('dayGridMonth')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'dayGridMonth'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              {t('calendar.month', { defaultValue: 'Month' })}
            </button>
            <button
              onClick={() => setView('dayGridWeek')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'dayGridWeek'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t('calendar.week', { defaultValue: 'Week' })}
            </button>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t('calendar.loadFailed', { defaultValue: 'Failed to load calendar data. Please refresh.' })}
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-border bg-card calendar-container">
          <CalendarSkeleton />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title={allTasks.length > 0 ? t('calendar.noTasksHaveDueDate', { defaultValue: 'No tasks have a due date' }) : t('calendar.noTasksYet', { defaultValue: 'No tasks yet' })}
          description={
            allTasks.length > 0
              ? t('calendar.noTasksHaveDueDateDesc', { defaultValue: 'You have {{count}} tasks, but none have a due date set. Open any task, set a due date, and it will appear here.', count: allTasks.length })
              : t('calendar.createTasksForCalendar', { defaultValue: 'Create tasks and set due dates to see them on the calendar.' })
          }
          primaryAction={{ label: t('projects.goToProjects', { defaultValue: 'Go to Projects' }), onClick: () => navigate('/projects') }}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card calendar-container overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView={view}
            key={view}
            events={events}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            height="auto"
            eventClick={({ event }) => {
              const task = event.extendedProps.task;
              if (task?.projectId) navigate(`/projects/${task.projectId}`);
            }}
            eventContent={({ event }) => {
              const { isOverdue } = event.extendedProps;
              return (
                <div className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden" title={event.title}>
                  {isOverdue && <AlertCircle className="h-2.5 w-2.5 shrink-0 text-white/90" />}
                  <span className="truncate text-[11px] font-medium leading-none text-white">{event.title}</span>
                </div>
              );
            }}
            dayCellClassNames="hover:bg-accent/20 transition-colors"
            dayMaxEvents={3}
            moreLinkText={(n) => t('common.moreCount', { defaultValue: '+{{count}} more', count: n })}
          />
        </div>
      )}
    </motion.div>
  );
}
