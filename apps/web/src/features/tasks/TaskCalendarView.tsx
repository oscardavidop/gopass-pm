import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar, CalendarDays, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/EmptyState';
import { type Task } from '@/types/task.types';
import { useCollaborationStore } from '@/store/collaboration.store';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/Button';

interface TaskCalendarViewProps {
  projectId: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskCalendarView({ projectId, tasks, onTaskClick }: TaskCalendarViewProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('dayGridMonth');
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const taskHighlights = useCollaborationStore((state) => state.taskHighlights);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask();

  const events = useMemo(() => {
    return tasks
      .filter((task) => Boolean(task.dueDate))
      .map((task) => ({
        id: task.id,
        title: task.title,
        start: task.dueDate as string,
        allDay: true,
        backgroundColor: getPriorityColor(task.priority),
        borderColor: getPriorityColor(task.priority),
        extendedProps: {
          task,
          isOverdue: Boolean(task.dueDate) && new Date(task.dueDate as string) < new Date() && task.status !== 'DONE',
        },
      }));
  }, [tasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stats = useMemo(() => {
    const withDate = tasks.filter((task) => task.dueDate);
    const overdue = withDate.filter((task) => task.dueDate && new Date(task.dueDate) < today && task.status !== 'DONE');
    const upcoming = withDate.filter((task) => {
      if (!task.dueDate || task.status === 'DONE') return false;
      const due = new Date(task.dueDate);
      const diff = due.getTime() - today.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
    });
    const week = withDate.filter((task) => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      const diff = due.getTime() - today.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
    });
    const completedRecently = withDate.filter((task) => {
      if (!task.dueDate || task.status !== 'DONE') return false;
      const due = new Date(task.dueDate);
      const diff = today.getTime() - due.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
    });
    return {
      today: withDate.filter((task) => task.dueDate?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      upcoming: upcoming.length,
      week: week.length,
      overdue: overdue.length,
      completedRecently: completedRecently.length,
    };
  }, [tasks, today]);

  const handleCreateAtDate = async () => {
    if (!quickDate || !quickTitle.trim()) return;
    await createTask.mutateAsync({
      title: quickTitle.trim(),
      dueDate: quickDate,
      status: 'TODO',
      priority: 'MEDIUM',
    });
    setQuickDate(null);
    setQuickTitle('');
  };

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-7 w-7" />}
        title={t('project.calendar.emptyTitle', { defaultValue: 'No dated tasks yet' })}
        description={t('project.calendar.emptyDesc', { defaultValue: 'Set due dates on tasks to see them in the calendar view.' })}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
            view === 'dayGridMonth'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('dayGridMonth')}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t('calendar.month', { defaultValue: 'Month' })}
        </button>
        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
            view === 'timeGridWeek'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('timeGridWeek')}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t('calendar.week', { defaultValue: 'Week' })}
        </button>

        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
            view === 'timeGridDay'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('timeGridDay')}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t('calendar.day', { defaultValue: 'Day' })}
        </button>

        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
            view === 'listWeek'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('listWeek')}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t('calendar.agenda', { defaultValue: 'Agenda' })}
        </button>
      </div>

        {quickDate && (
          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t('calendar.quickCreateFor', { defaultValue: 'Create task for {{date}}', date: quickDate })}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={t('calendar.quickCreatePlaceholder', { defaultValue: 'Task title' })}
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreateAtDate()}
                disabled={!quickTitle.trim() || createTask.isPending}
                className="inline-flex items-center gap-1.5"
              >
                {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t('calendar.createTask', { defaultValue: 'Create Task' })}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card calendar-container overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          key={view}
          height="auto"
          events={events}
          editable
          eventStartEditable
          dateClick={({ dateStr }) => setQuickDate(dateStr)}
          eventDrop={({ event }) => {
            void updateTask.mutateAsync({ id: event.id, data: { dueDate: event.startStr.slice(0, 10) } });
          }}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          eventClick={({ event }) => {
            const task = event.extendedProps.task as Task;
            onTaskClick(task);
          }}
          eventDidMount={(info) => {
            const task = info.event.extendedProps.task as Task;
            const assignee = task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : t('task.unassigned', { defaultValue: 'Unassigned' });
            info.el.title = [
              task.title,
              `${t('task.priority', { defaultValue: 'Priority' })}: ${task.priority}`,
              `${t('task.status', { defaultValue: 'Status' })}: ${task.status}`,
              `${t('task.assignee', { defaultValue: 'Assignee' })}: ${assignee}`,
            ].join('\n');
          }}
          eventContent={({ event }) => {
            const isOverdue = Boolean(event.extendedProps.isOverdue);
            const highlight = taskHighlights[event.id];
            const hasHighlight = !!highlight && highlight.expiresAt > Date.now();
            return (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden rounded-md"
                title={event.title}
                style={hasHighlight ? {
                  boxShadow: `inset 0 0 0 1px ${highlight?.actor?.collaborationColor ?? '#3b82f6'}`,
                  background: `${highlight?.actor?.collaborationColor ?? '#3b82f6'}44`,
                } : undefined}
              >
                {isOverdue && <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />}
                <span className="truncate text-[11px] font-medium leading-none text-white">{event.title}</span>
              </div>
            );
          }}
        />
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
          <h3 className="text-sm font-semibold">{t('calendar.summary', { defaultValue: 'Calendar Summary' })}</h3>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <span>{t('calendar.today', { defaultValue: 'Today' })}</span>
              <span className="font-semibold">{stats.today}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <span>{t('calendar.upcoming', { defaultValue: 'Upcoming' })}</span>
              <span className="font-semibold">{stats.upcoming}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <span>{t('calendar.thisWeek', { defaultValue: 'This Week' })}</span>
              <span className="font-semibold">{stats.week}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <span>{t('calendar.overdue', { defaultValue: 'Overdue' })}</span>
              <span className="font-semibold text-destructive">{stats.overdue}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2">
              <span>{t('calendar.completedRecently', { defaultValue: 'Completed Recently' })}</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.completedRecently}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function getPriorityColor(priority: Task['priority']) {
  switch (priority) {
    case 'CRITICAL':
      return '#ef4444';
    case 'HIGH':
      return '#f59e0b';
    case 'MEDIUM':
      return '#3b82f6';
    case 'LOW':
    default:
      return '#64748b';
  }
}
