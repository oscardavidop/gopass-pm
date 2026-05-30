import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  Clock3,
  Filter,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { PremiumSelect, type PremiumSelectOption } from '@/components/ui/PremiumSelect';
import { Skeleton } from '@/components/ui/Skeleton';
import { trackUiEvent } from '@/utils/analytics';
import { type Priority, type Task, type TaskStatus } from '@/types/task.types';
import type { TaskGroupBy } from '@/features/tasks/TaskFilters';
import { useCollaborationStore } from '@/store/collaboration.store';

type SortBy = 'title' | 'priority' | 'status' | 'dueDate' | 'createdAt' | 'updatedAt' | 'assignee';
type SortOrder = 'asc' | 'desc';

interface TaskListViewProps {
  tasks: Task[];
  loading: boolean;
  projectName: string;
  groupBy: TaskGroupBy;
  members: Array<{ id: string; firstName: string; lastName: string }>;
  onTaskClick: (task: Task) => void;
  onInlineUpdate: (taskId: string, data: Partial<{
    status: TaskStatus;
    priority: Priority;
    assigneeId: string;
    dueDate: string;
    tags: string[];
  }>) => Promise<unknown>;
  onDeleteTasks: (taskIds: string[]) => Promise<unknown>;
}

export function TaskListView({
  tasks,
  loading,
  projectName,
  groupBy,
  members,
  onTaskClick,
  onInlineUpdate,
  onDeleteTasks,
}: TaskListViewProps) {
  const { t } = useTranslation();
  const taskHighlights = useCollaborationStore((state) => state.taskHighlights);
  const taskPresenceByProject = useCollaborationStore((state) => state.taskPresenceByProject);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const statusOptions = useMemo<PremiumSelectOption<TaskStatus>[]>(() => ([
    { value: 'TODO', label: t('status.todo', { defaultValue: 'To do' }) },
    { value: 'IN_PROGRESS', label: t('status.inProgress', { defaultValue: 'In progress' }) },
    { value: 'REVIEW', label: t('status.review', { defaultValue: 'Review' }) },
    { value: 'DONE', label: t('status.done', { defaultValue: 'Done' }) },
  ]), [t]);

  const priorityOptions = useMemo<PremiumSelectOption<Priority>[]>(() => ([
    { value: 'LOW', label: t('priority.low', { defaultValue: 'Low' }) },
    { value: 'MEDIUM', label: t('priority.medium', { defaultValue: 'Medium' }) },
    { value: 'HIGH', label: t('priority.high', { defaultValue: 'High' }) },
    { value: 'CRITICAL', label: t('priority.critical', { defaultValue: 'Critical' }), badge: '!' },
  ]), [t]);

  const assigneeOptions = useMemo<PremiumSelectOption<string>[]>(() => ([
    { value: '', label: t('task.unassigned', { defaultValue: 'Unassigned' }) },
    ...members.map((member) => ({
      value: member.id,
      label: `${member.firstName} ${member.lastName}`,
      description: member.id,
    })),
  ]), [members, t]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => compareTasks(a, b, sortBy, sortOrder)),
    [tasks, sortBy, sortOrder],
  );

  const grouped = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: t('project.list.groupAll', { defaultValue: 'All tasks' }), items: sorted }];
    }

    const bucket = new Map<string, Task[]>();

    sorted.forEach((task) => {
      const key = getGroupKey(task, groupBy, t);
      const list = bucket.get(key) ?? [];
      list.push(task);
      bucket.set(key, list);
    });

    return Array.from(bucket.entries()).map(([key, items]) => ({ key, title: key, items }));
  }, [sorted, groupBy, t]);

  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(sorted.map((task) => task.id));
  };

  const toggleSelect = (taskId: string) => {
    setSelectedIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const handleSort = (nextSort: SortBy) => {
    if (sortBy === nextSort) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(nextSort);
    setSortOrder('asc');
  };

  const runBulkStatus = async (status: TaskStatus) => {
    const ids = selectedIds;
    await Promise.all(ids.map((id) => onInlineUpdate(id, { status })));
    setSelectedIds([]);
    trackUiEvent({ event: 'Bulk Update', payload: { action: 'status', count: ids.length, status } });
  };

  const runBulkPriority = async (priority: Priority) => {
    const ids = selectedIds;
    await Promise.all(ids.map((id) => onInlineUpdate(id, { priority })));
    setSelectedIds([]);
    trackUiEvent({ event: 'Bulk Update', payload: { action: 'priority', count: ids.length, priority } });
  };

  const runBulkAssignee = async (assigneeId: string) => {
    const ids = selectedIds;
    await Promise.all(ids.map((id) => onInlineUpdate(id, assigneeId ? { assigneeId } : {})));
    setSelectedIds([]);
    trackUiEvent({ event: 'Bulk Update', payload: { action: 'assignee', count: ids.length } });
  };

  const runBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await onDeleteTasks(selectedIds);
    setSelectedIds([]);
    trackUiEvent({ event: 'Bulk Update', payload: { action: 'delete', count: selectedIds.length } });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <Skeleton key={idx} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedIds.length > 0 && (
        <div className="premium-panel p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('project.list.selectedCount', { defaultValue: '{{count}} selected', count: selectedIds.length })}</span>

            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span>{t('task.status', { defaultValue: 'Status' })}</span>
              <PremiumSelect
                value={undefined}
                onValueChange={(value) => runBulkStatus(value as TaskStatus)}
                options={statusOptions}
                size="sm"
                placeholder={t('common.apply', { defaultValue: 'Apply' })}
                ariaLabel={t('task.status', { defaultValue: 'Status' })}
                triggerClassName="min-w-[108px] border-0 bg-transparent px-1 shadow-none"
              />
            </label>

            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              <span>{t('task.priority', { defaultValue: 'Priority' })}</span>
              <PremiumSelect
                value={undefined}
                onValueChange={(value) => runBulkPriority(value as Priority)}
                options={priorityOptions}
                size="sm"
                placeholder={t('common.apply', { defaultValue: 'Apply' })}
                ariaLabel={t('task.priority', { defaultValue: 'Priority' })}
                triggerClassName="min-w-[108px] border-0 bg-transparent px-1 shadow-none"
              />
            </label>

            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <UserRound className="h-3.5 w-3.5" />
              <span>{t('task.assignee', { defaultValue: 'Assignee' })}</span>
              <PremiumSelect
                value={undefined}
                onValueChange={(value) => runBulkAssignee(value)}
                options={assigneeOptions}
                size="sm"
                placeholder={t('common.apply', { defaultValue: 'Apply' })}
                ariaLabel={t('task.assignee', { defaultValue: 'Assignee' })}
                triggerClassName="min-w-[132px] border-0 bg-transparent px-1 shadow-none"
              />
            </label>

            <Button size="sm" variant="destructive" className="h-7 px-2.5 text-xs" onClick={runBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-7 w-7" />}
          title={t('project.list.emptyTitle', { defaultValue: 'No tasks match these filters' })}
          description={t('project.list.emptyDesc', { defaultValue: 'Try adjusting search or filters to find tasks quickly.' })}
        />
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={group.key} className="rounded-xl border border-border bg-card overflow-hidden">
              {groupBy !== 'none' && (
                <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</span>
                    <span className="text-xs text-muted-foreground">{group.items.length}</span>
                  </div>
                </div>
              )}

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label={t('project.list.selectAll', { defaultValue: 'Select all tasks' })}
                        />
                      </th>
                      <SortableHeader label={t('task.task', { defaultValue: 'Task' })} active={sortBy === 'title'} order={sortOrder} onClick={() => handleSort('title')} />
                      <SortableHeader label={t('task.status', { defaultValue: 'Status' })} active={sortBy === 'status'} order={sortOrder} onClick={() => handleSort('status')} />
                      <SortableHeader label={t('task.priority', { defaultValue: 'Priority' })} active={sortBy === 'priority'} order={sortOrder} onClick={() => handleSort('priority')} />
                      <SortableHeader label={t('task.assignee', { defaultValue: 'Assignee' })} active={sortBy === 'assignee'} order={sortOrder} onClick={() => handleSort('assignee')} />
                      <th className="px-3 py-2">{t('project.title', { defaultValue: 'Project' })}</th>
                      <SortableHeader label={t('task.dueDate', { defaultValue: 'Due date' })} active={sortBy === 'dueDate'} order={sortOrder} onClick={() => handleSort('dueDate')} />
                      <SortableHeader label={t('common.createdAt', { defaultValue: 'Created' })} active={sortBy === 'createdAt'} order={sortOrder} onClick={() => handleSort('createdAt')} />
                      <SortableHeader label={t('common.updatedAt', { defaultValue: 'Updated' })} active={sortBy === 'updatedAt'} order={sortOrder} onClick={() => handleSort('updatedAt')} />
                    </tr>
                  </thead>

                  <tbody>
                    {group.items.map((task) => (
                      (() => {
                        const highlight = taskHighlights[task.id];
                        const hasHighlight = !!highlight && highlight.expiresAt > Date.now();
                        const taskPresence = taskPresenceByProject[task.projectId]?.[task.id];
                        return (
                      <tr
                        key={task.id}
                        className="border-b border-border/70 last:border-0 hover:bg-accent/40 transition-colors"
                        style={hasHighlight ? {
                          boxShadow: `inset 0 0 0 1px ${highlight?.actor?.collaborationColor ?? '#3b82f6'}`,
                          background: `${highlight?.actor?.collaborationColor ?? '#3b82f6'}12`,
                        } : undefined}
                        onClick={() => {
                          onTaskClick(task);
                          trackUiEvent({ event: 'Task Opened', payload: { taskId: task.id, source: 'list' } });
                        }}
                      >
                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => toggleSelect(task.id)} aria-label={t('project.list.selectTask', { defaultValue: 'Select task' })} />
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="space-y-1">
                            {hasHighlight && (
                              <p className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: highlight?.actor?.collaborationColor ?? '#64748b' }} />
                                {highlight?.message}
                              </p>
                            )}
                            <p className="font-medium text-foreground truncate max-w-[300px]">{task.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3 w-3" />
                                {task.subtasks.filter((item) => item.completed).length}/{task.subtasks.length || 0}
                              </span>
                              <span>{t('project.list.commentsCount', { defaultValue: '{{count}} comments', count: task._count.comments })}</span>
                              {(taskPresence?.viewing?.length ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <AvatarGroup
                                    users={(taskPresence?.viewing ?? []).map((viewer) => ({
                                      id: viewer.id,
                                      firstName: viewer.firstName,
                                      lastName: viewer.lastName,
                                      avatar: viewer.avatar,
                                    }))}
                                    size="xs"
                                    max={3}
                                  />
                                </span>
                              )}
                            </div>
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <PremiumSelect
                            value={task.status}
                            onValueChange={(value) => onInlineUpdate(task.id, { status: value as TaskStatus })}
                            options={statusOptions}
                            size="sm"
                            ariaLabel={t('task.status', { defaultValue: 'Status' })}
                            triggerClassName="h-8 rounded-xl"
                          />
                        </td>

                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <PremiumSelect
                            value={task.priority}
                            onValueChange={(value) => onInlineUpdate(task.id, { priority: value as Priority })}
                            options={priorityOptions}
                            size="sm"
                            ariaLabel={t('task.priority', { defaultValue: 'Priority' })}
                            triggerClassName="h-8 rounded-xl"
                          />
                        </td>

                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <label className="sr-only">{t('task.assignee', { defaultValue: 'Assignee' })}</label>
                          <PremiumSelect
                            value={task.assigneeId ?? ''}
                            onValueChange={(value) => onInlineUpdate(task.id, value ? { assigneeId: value } : {})}
                            options={assigneeOptions}
                            size="sm"
                            ariaLabel={t('task.assignee', { defaultValue: 'Assignee' })}
                            triggerClassName="h-8 max-w-[170px] rounded-xl"
                          />
                        </td>

                        <td className="px-3 py-2 text-xs text-muted-foreground">{projectName}</td>

                        <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="date"
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={task.dueDate ? formatDateInput(task.dueDate) : ''}
                            onChange={(event) => onInlineUpdate(task.id, event.target.value ? { dueDate: event.target.value } : {})}
                          />
                        </td>

                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(task.createdAt)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(task.updatedAt)}</td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 p-3 lg:hidden">
                {group.items.map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className="w-full rounded-xl border border-border bg-background p-3 text-left"
                    onClick={() => {
                      onTaskClick(task);
                      trackUiEvent({ event: 'Task Opened', payload: { taskId: task.id, source: 'list-mobile' } });
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(task.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelect(task.id)}
                        aria-label={t('project.list.selectTask', { defaultValue: 'Select task' })}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Badge variant="outline">{t(statusLabel(task.status), { defaultValue: task.status })}</Badge>
                          <Badge variant="outline">{t(priorityLabel(task.priority), { defaultValue: task.priority })}</Badge>
                          {task.assignee && (
                            <span className="inline-flex items-center gap-1">
                              <Avatar size="xs" firstName={task.assignee.firstName} lastName={task.assignee.lastName} src={task.assignee.avatar} />
                              {task.assignee.firstName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  order,
  onClick,
}: {
  label: string;
  active: boolean;
  order: SortOrder;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2">
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={onClick}>
        {label}
        {active ? (order === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
      </button>
    </th>
  );
}

function compareTasks(a: Task, b: Task, sortBy: SortBy, sortOrder: SortOrder) {
  const dir = sortOrder === 'asc' ? 1 : -1;

  const valueA = (() => {
    switch (sortBy) {
      case 'title':
        return a.title.toLowerCase();
      case 'priority':
        return priorityWeight(a.priority);
      case 'status':
        return statusWeight(a.status);
      case 'dueDate':
        return a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      case 'createdAt':
        return new Date(a.createdAt).getTime();
      case 'updatedAt':
        return new Date(a.updatedAt).getTime();
      case 'assignee':
        return (a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '').toLowerCase();
      default:
        return 0;
    }
  })();

  const valueB = (() => {
    switch (sortBy) {
      case 'title':
        return b.title.toLowerCase();
      case 'priority':
        return priorityWeight(b.priority);
      case 'status':
        return statusWeight(b.status);
      case 'dueDate':
        return b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      case 'createdAt':
        return new Date(b.createdAt).getTime();
      case 'updatedAt':
        return new Date(b.updatedAt).getTime();
      case 'assignee':
        return (b.assignee ? `${b.assignee.firstName} ${b.assignee.lastName}` : '').toLowerCase();
      default:
        return 0;
    }
  })();

  if (valueA < valueB) return -1 * dir;
  if (valueA > valueB) return 1 * dir;
  return 0;
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return 'status.todo';
    case 'IN_PROGRESS':
      return 'status.inProgress';
    case 'REVIEW':
      return 'status.review';
    case 'DONE':
      return 'status.done';
    default:
      return 'task.status';
  }
}

function priorityLabel(priority: Priority) {
  switch (priority) {
    case 'LOW':
      return 'priority.low';
    case 'MEDIUM':
      return 'priority.medium';
    case 'HIGH':
      return 'priority.high';
    case 'CRITICAL':
      return 'priority.critical';
    default:
      return 'task.priority';
  }
}

function statusWeight(status: TaskStatus) {
  switch (status) {
    case 'TODO':
      return 1;
    case 'IN_PROGRESS':
      return 2;
    case 'REVIEW':
      return 3;
    case 'DONE':
      return 4;
    default:
      return 99;
  }
}

function priorityWeight(priority: Priority) {
  switch (priority) {
    case 'LOW':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'HIGH':
      return 3;
    case 'CRITICAL':
      return 4;
    default:
      return 0;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getGroupKey(task: Task, groupBy: TaskGroupBy, t: ReturnType<typeof useTranslation>['t']) {
  switch (groupBy) {
    case 'status':
      return t(statusLabel(task.status), { defaultValue: task.status });
    case 'priority':
      return t(priorityLabel(task.priority), { defaultValue: task.priority });
    case 'assignee':
      return task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : t('task.unassigned', { defaultValue: 'Unassigned' });
    case 'dueDate':
      return task.dueDate ? formatDate(task.dueDate) : t('project.list.noDueDate', { defaultValue: 'No due date' });
    default:
      return t('project.list.groupAll', { defaultValue: 'All tasks' });
  }
}
