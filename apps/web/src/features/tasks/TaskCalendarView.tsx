import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/EmptyState';
import { type Task } from '@/types/task.types';
import { useCollaborationStore } from '@/store/collaboration.store';

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'dayGridMonth' | 'dayGridWeek'>('dayGridMonth');
  const taskHighlights = useCollaborationStore((state) => state.taskHighlights);

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
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
            view === 'dayGridWeek'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setView('dayGridWeek')}
        >
          <Calendar className="h-3.5 w-3.5" />
          {t('calendar.week', { defaultValue: 'Week' })}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card calendar-container overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={view}
          key={view}
          height="auto"
          events={events}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          eventClick={({ event }) => {
            const task = event.extendedProps.task as Task;
            onTaskClick(task);
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
