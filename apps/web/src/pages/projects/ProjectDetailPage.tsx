import { useState, useCallback, useMemo, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  LayoutGrid,
  Sparkles,
  Clock3,
  CircleDashed,
  CheckCircle2,
  Gauge,
  ChevronDown,
  Bot,
  FilePenLine,
  CalendarDays,
  Rows3,
  FolderOpen,
  Users,
  Activity,
  Settings as SettingsIcon,
  ClipboardList,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { AiTaskCreateDrawer } from '@/features/tasks/AiTaskCreateDrawer';
import { ManualTaskCreateDrawer } from '@/features/tasks/ManualTaskCreateDrawer';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskDrawer } from '@/features/tasks/TaskDrawer';
import { TaskFilters, type TaskGroupBy } from '@/features/tasks/TaskFilters';
import { TaskListView } from '@/features/tasks/TaskListView';
import { TaskCalendarView } from '@/features/tasks/TaskCalendarView';
import { PresenceAvatars } from '@/components/shared/PresenceAvatars';
import { MemberManager } from '@/features/projects/MemberManager';
import { EntityFilesSection } from '@/components/shared/EntityFilesSection';
import { ProjectFilesHub } from '@/features/projects/ProjectFilesHub';
import { useProject } from '@/hooks/useProjects';
import { useProjectTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/auth.store';
import { trackUiEvent } from '@/utils/analytics';
import { stripRichText } from '@/utils/richText';
import { type Priority, type Task, type TaskStatus } from '@/types/task.types';

const STATUS_VARIANT: Record<string, any> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  REVIEW: 'warning',
  DONE: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'status.todo',
  IN_PROGRESS: 'status.inProgress',
  REVIEW: 'status.review',
  DONE: 'status.done',
};

type ProjectMainTab = 'overview' | 'tasks' | 'calendar' | 'files' | 'members' | 'activity' | 'settings';

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('none');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activeTab, setActiveTab] = useState<ProjectMainTab>('tasks');
  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskIdeaSeed, setTaskIdeaSeed] = useState('');
  const [manualTitleSeed, setManualTitleSeed] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!id) return;
    const stored = window.localStorage.getItem(`project-view:${id}`);
    if (stored === 'board' || stored === 'list') {
      setViewMode(stored);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    window.localStorage.setItem(`project-view:${id}`, viewMode);
  }, [id, viewMode]);

  useEffect(() => {
    const handleRevoked = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === id) navigate('/projects', { replace: true });
    };
    window.addEventListener('project:access_revoked', handleRevoked);
    return () => window.removeEventListener('project:access_revoked', handleRevoked);
  }, [id, navigate]);

  useEffect(() => {
    const handleProjectDeleted = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === id) navigate('/projects', { replace: true });
    };
    window.addEventListener('project:deleted', handleProjectDeleted);
    return () => window.removeEventListener('project:deleted', handleProjectDeleted);
  }, [id, navigate]);

  useEffect(() => {
    const handleOpenTaskForm = () => {
      setDefaultStatus('TODO');
      setEditingTask(null);
      setTaskIdeaSeed('');
      setActiveTab('tasks');
      setAiCreateOpen(true);
    };
    const handleOpenTaskDetail = (e: Event) => {
      const detail = (e as CustomEvent<{ taskId?: string }>).detail;
      if (detail?.taskId) {
        setActiveTab('tasks');
        setSelectedTaskId(detail.taskId);
      }
    };

    window.addEventListener('gopass:open-task-form', handleOpenTaskForm);
    window.addEventListener('gopass:open-task-detail', handleOpenTaskDetail);
    return () => {
      window.removeEventListener('gopass:open-task-form', handleOpenTaskForm);
      window.removeEventListener('gopass:open-task-detail', handleOpenTaskDetail);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      );
      if (isTextInput) return;
      if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('tasks');
        setEditingTask(null);
        setDefaultStatus('TODO');
        setManualTitleSeed('');
        setManualCreateOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const debouncedSearch = useDebounce(search, 300);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: tasksData, isLoading: tasksLoading } = useProjectTasks(id!, {
    search: debouncedSearch || undefined,
    priority: priority || undefined,
    status: statusFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    limit: 200,
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = tasksData?.items ?? [];
  const visibleTasks = useMemo(() => {
    const labelQuery = labelFilter.trim().toLowerCase();
    if (!labelQuery) return tasks;
    return tasks.filter((task) => task.tags.some((tag) => tag.toLowerCase().includes(labelQuery)));
  }, [tasks, labelFilter]);

  const members = useMemo(() => project?.members?.map(({ user }) => user) ?? [], [project]);

  const currentProjectRole = useMemo(
    () => project?.members?.find((m) => m.userId === currentUser?.id)?.role ?? 'MEMBER',
    [project, currentUser],
  );

  const doneCount = useMemo(() => visibleTasks.filter((t) => t.status === 'DONE').length, [visibleTasks]);
  const progress = visibleTasks.length ? Math.round((doneCount / visibleTasks.length) * 100) : 0;
  const projectDescriptionPreview = useMemo(() => stripRichText(project?.description ?? ''), [project?.description]);
  const inProgressCount = useMemo(() => visibleTasks.filter((t) => t.status === 'IN_PROGRESS').length, [visibleTasks]);
  const reviewCount = useMemo(() => visibleTasks.filter((t) => t.status === 'REVIEW').length, [visibleTasks]);
  const todoCount = useMemo(() => visibleTasks.filter((t) => t.status === 'TODO').length, [visibleTasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    trackUiEvent({ event: 'Task Opened', payload: { taskId: task.id, source: viewMode } });
  }, [viewMode]);

  const handleInlineUpdate = useCallback(async (
    taskId: string,
    data: Partial<{ status: TaskStatus; priority: Priority; assigneeId: string | null; dueDate: string | null; tags: string[] }>,
  ) => {
    await updateTask.mutateAsync({ id: taskId, data: data as any });
    trackUiEvent({ event: 'Task Edited', payload: { taskId, fields: Object.keys(data), source: 'list' } });
  }, [updateTask]);

  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
    await Promise.all(taskIds.map((taskId) => deleteTask.mutateAsync(taskId)));
  }, [deleteTask]);

  const handleAddTask = useCallback((status: string) => {
    setDefaultStatus(status as TaskStatus);
    setEditingTask(null);
    setTaskIdeaSeed('');
    setAiCreateOpen(true);
  }, []);

  const handleQuickAdd = useCallback(async (status: string, title: string) => {
    setDefaultStatus(status as TaskStatus);
    setManualTitleSeed(title);
    setManualCreateOpen(true);
  }, []);

  const handleEditTask = useCallback(async (formData: any) => {
    if (!editingTask) return;
    await updateTask.mutateAsync({ id: editingTask.id, data: formData });
    setEditingTask(null);
    setTaskEditOpen(false);
  }, [editingTask, updateTask]);

  const handleDeleteTask = useCallback(async () => {
    if (!deleteTaskId) return;
    await deleteTask.mutateAsync(deleteTaskId);
    setDeleteTaskId(null);
    setSelectedTaskId(null);
  }, [deleteTaskId, deleteTask]);

  if (projectLoading) {
    return (
      <div className="space-y-5 page-enter">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 min-w-[272px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground mb-4">{t('project.notFound', { defaultValue: 'Project not found.' })}</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('projects.backToProjects', { defaultValue: 'Back to Projects' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter">
      <div className="premium-panel p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/projects"
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div
              className="w-10 h-10 rounded-xl shadow-sm shrink-0 border border-border/60"
              style={{ background: project.color ?? '#6366f1' }}
            />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{project.name}</h1>
                <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="text-xs">
                  {t(STATUS_LABEL[project.status] ?? project.status, { defaultValue: project.status })}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  {t('project.liveWorkspace', { defaultValue: 'Live workspace' })}
                </span>
              </div>
              {projectDescriptionPreview && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{projectDescriptionPreview}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-muted-foreground">{t('project.totalTasks', { defaultValue: 'Total tasks' })}</p>
              <p className="mt-0.5 text-base font-semibold">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-muted-foreground">{t('status.inProgress')}</p>
              <p className="mt-0.5 text-base font-semibold text-blue-700 dark:text-blue-400">{inProgressCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-muted-foreground">{t('status.review')}</p>
              <p className="mt-0.5 text-base font-semibold text-amber-700 dark:text-amber-400">{reviewCount}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-muted-foreground">{t('project.completed', { defaultValue: 'Completed' })}</p>
              <p className="mt-0.5 text-base font-semibold text-emerald-700 dark:text-emerald-400">{doneCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-border/60 pt-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <PresenceAvatars projectId={id ?? ''} />
            <MemberManager
              projectId={id!}
              members={project.members}
              currentUserId={currentUser?.id ?? ''}
              currentRole={currentProjectRole}
              pendingInvitations={(project.invitations ?? []).filter((invitation) => invitation.status === 'PENDING') as any}
            />
          </div>

          <div className="flex items-center gap-3">
            {visibleTasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border border-border/75 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  {t('project.sprintCompletion', { defaultValue: 'Sprint completion' })}
                </div>
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
              </div>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button size="sm" className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  {t('task.newTask', { defaultValue: 'New Task' })}
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={8}
                  align="end"
                  className="z-50 w-72 rounded-xl border border-border bg-card p-1.5 shadow-xl"
                >
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 outline-none transition-colors hover:bg-accent"
                    onSelect={() => {
                      setDefaultStatus('TODO');
                      setTaskIdeaSeed('');
                      setAiCreateOpen(true);
                      setActiveTab('tasks');
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 rounded-md bg-primary/15 p-1 text-primary"><Bot className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium">{t('task.createWithAi', { defaultValue: 'Create with AI' })}</div>
                        <p className="text-xs text-muted-foreground">{t('task.createWithAiDesc', { defaultValue: 'Generate complete task draft with AI context.' })}</p>
                      </div>
                    </div>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 outline-none transition-colors hover:bg-accent"
                    onSelect={() => {
                      setDefaultStatus('TODO');
                      setManualTitleSeed('');
                      setManualCreateOpen(true);
                      setActiveTab('tasks');
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 rounded-md bg-secondary p-1 text-muted-foreground"><FilePenLine className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-medium">{t('task.createManually', { defaultValue: 'Create manually' })}</div>
                        <p className="text-xs text-muted-foreground">{t('task.createManuallyDesc', { defaultValue: 'Full control over fields, subtasks and details.' })}</p>
                      </div>
                    </div>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/50 p-1.5">
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'overview', label: t('project.tab.overview', { defaultValue: 'Overview' }), icon: LayoutGrid },
            { key: 'tasks', label: t('project.tab.tasks', { defaultValue: 'Tasks' }), icon: ClipboardList },
            { key: 'calendar', label: t('project.tab.calendar', { defaultValue: 'Calendar' }), icon: CalendarDays },
            { key: 'files', label: t('project.tab.files', { defaultValue: 'Files' }), icon: FolderOpen },
            { key: 'members', label: t('project.tab.members', { defaultValue: 'Members' }), icon: Users },
            { key: 'activity', label: t('project.tab.activity', { defaultValue: 'Activity' }), icon: Activity },
            { key: 'settings', label: t('project.tab.settings', { defaultValue: 'Settings' }), icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as ProjectMainTab)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{t('project.totalTasks', { defaultValue: 'Total tasks' })}</p>
            <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{t('project.sprintCompletion', { defaultValue: 'Sprint completion' })}</p>
            <p className="mt-1 text-2xl font-semibold">{progress}%</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{t('project.membersCount', { defaultValue: 'Members' })}</p>
            <p className="mt-1 text-2xl font-semibold">{members.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <>
          <TaskFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'search' } });
            }}
            priority={priority}
            onPriorityChange={(value) => {
              setPriority(value as Priority | '');
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'priority', value } });
            }}
            status={statusFilter}
            onStatusChange={(value) => {
              setStatusFilter(value as TaskStatus | '');
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'status', value } });
            }}
            assigneeId={assigneeFilter}
            onAssigneeChange={(value) => {
              setAssigneeFilter(value);
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'assignee', value } });
            }}
            labelFilter={labelFilter}
            onLabelFilterChange={(value) => {
              setLabelFilter(value);
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'labels', value } });
            }}
            groupBy={groupBy}
            onGroupByChange={(value) => {
              setGroupBy(value);
              trackUiEvent({ event: 'Filters Applied', payload: { filter: 'groupBy', value } });
            }}
            members={members}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            {visibleTasks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CircleDashed className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  {t('project.todoCount', { defaultValue: '{{count}} todo', count: todoCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {t('project.inProgressCount', { defaultValue: '{{count}} in progress', count: inProgressCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <LayoutGrid className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  {t('project.reviewCount', { defaultValue: '{{count}} review', count: reviewCount })}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t('project.doneCount', { defaultValue: '{{count}} done', count: doneCount })}
                </span>
              </div>
            )}

            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {[
                { key: 'board', icon: LayoutGrid, label: t('project.view.board', { defaultValue: 'Board' }) },
                { key: 'list', icon: Rows3, label: t('project.view.list', { defaultValue: 'List' }) },
              ].map((item) => {
                const Icon = item.icon;
                const active = viewMode === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    onClick={() => {
                      setViewMode(item.key as 'board' | 'list');
                      trackUiEvent({ event: 'View Switched', payload: { view: item.key, projectId: id } });
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {viewMode === 'board' && (
            tasksLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-[272px] space-y-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-24 w-full rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <KanbanBoard
                tasks={visibleTasks}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onQuickAdd={handleQuickAdd}
              />
            )
          )}

          {viewMode === 'list' && (
            <TaskListView
              tasks={visibleTasks}
              loading={tasksLoading}
              projectName={project.name}
              groupBy={groupBy}
              members={members}
              onTaskClick={handleTaskClick}
              onInlineUpdate={handleInlineUpdate}
              onDeleteTasks={handleBulkDelete}
            />
          )}
        </>
      )}

      {activeTab === 'calendar' && (
        <TaskCalendarView
          tasks={visibleTasks}
          onTaskClick={handleTaskClick}
        />
      )}

      {activeTab === 'files' && id && (
        <ProjectFilesHub projectId={id} />
      )}

      {activeTab === 'members' && (
        <div className="rounded-xl border border-border/70 bg-card/60 p-4">
          <h3 className="text-sm font-semibold">{t('project.tab.members', { defaultValue: 'Members' })}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t('project.currentMembersHint', { defaultValue: 'Manage team roles and access from this panel.' })}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {project.members.map((member) => (
              <div key={member.id} className="rounded-lg border border-border/70 bg-background/50 p-2.5">
                <p className="text-sm font-medium truncate">{member.user.firstName} {member.user.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-xl border border-border/70 bg-card/60 p-6 text-center">
          <Activity className="mx-auto h-7 w-7 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-semibold">{t('project.activityTitle', { defaultValue: 'Project activity' })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('project.activityHint', { defaultValue: 'Task-level realtime activity is available from each task drawer.' })}</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <h3 className="text-sm font-semibold">{t('uploads.brandingTitle', { defaultValue: 'Branding' })}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('uploads.brandingDesc', { defaultValue: 'Manage project visual assets without cluttering your main workspace.' })}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <EntityFilesSection
              entityType="PROJECT"
              entityId={id}
              title={t('uploads.projectCover', { defaultValue: 'Project cover' })}
              kind="cover"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
            />
            <EntityFilesSection
              entityType="PROJECT"
              entityId={id}
              title={t('uploads.projectIcon', { defaultValue: 'Project icon/image' })}
              kind="icon"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
            />
            <EntityFilesSection
              entityType="PROJECT"
              entityId={id}
              title={t('uploads.projectBanner', { defaultValue: 'Project banner' })}
              kind="banner"
              accept="image/jpeg,image/png,image/webp"
              multiple={false}
            />
          </div>
        </div>
      )}

      <AiTaskCreateDrawer
        open={aiCreateOpen}
        projectId={id ?? ''}
        defaultStatus={defaultStatus}
        members={members}
        initialIdea={taskIdeaSeed}
        onClose={() => {
          setAiCreateOpen(false);
          setTaskIdeaSeed('');
        }}
      />

      <ManualTaskCreateDrawer
        open={manualCreateOpen}
        projectId={id ?? ''}
        defaultStatus={defaultStatus}
        members={members}
        initialTitle={manualTitleSeed}
        onClose={() => {
          setManualCreateOpen(false);
          setManualTitleSeed('');
        }}
      />

      <TaskForm
        open={taskEditOpen}
        onClose={() => { setTaskEditOpen(false); setEditingTask(null); }}
        onSubmit={handleEditTask}
        projectId={id ?? ''}
        task={editingTask}
        isLoading={updateTask.isPending}
        defaultStatus={defaultStatus}
        members={members}
      />

      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setEditingTask(task);
          setTaskEditOpen(true);
        }}
      />

      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}
        title={t('task.deleteTitle', { defaultValue: 'Delete task' })}
        description={t('task.deleteDescription', { defaultValue: 'This action cannot be undone.' })}
        confirmLabel={t('common.delete', { defaultValue: 'Delete' })}
        variant="destructive"
        isLoading={deleteTask.isPending}
        onConfirm={handleDeleteTask}
      />
    </div>
  );
}
