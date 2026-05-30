import { useState, useCallback, useMemo, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, Sparkles, Clock3, CircleDashed, CheckCircle2, Gauge, ChevronDown, Bot, FilePenLine } from 'lucide-react';
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
import { TaskFilters } from '@/features/tasks/TaskFilters';
import { PresenceAvatars } from '@/components/shared/PresenceAvatars';
import { MemberManager } from '@/features/projects/MemberManager';
import { useProject } from '@/hooks/useProjects';
import { useProjectTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/auth.store';
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

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
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

  // Redirect if the current user gets removed from this project in real-time
  useEffect(() => {
    const handleRevoked = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === id) navigate('/projects', { replace: true });
    };
    window.addEventListener('project:access_revoked', handleRevoked);
    return () => window.removeEventListener('project:access_revoked', handleRevoked);
  }, [id, navigate]);

  useEffect(() => {
    const handleOpenTaskForm = () => {
      setDefaultStatus('TODO');
      setEditingTask(null);
      setTaskIdeaSeed('');
      setAiCreateOpen(true);
    };
    const handleOpenTaskDetail = (e: Event) => {
      const detail = (e as CustomEvent<{ taskId?: string }>).detail;
      if (detail?.taskId) setSelectedTaskId(detail.taskId);
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
    assigneeId: assigneeFilter || undefined,
    limit: 200,
  });

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const tasks = tasksData?.items ?? [];
  const members = useMemo(
    () => project?.members?.map(({ user }) => user) ?? [],
    [project],
  );

  const currentProjectRole = useMemo(
    () => project?.members?.find((m) => m.userId === currentUser?.id)?.role ?? 'MEMBER',
    [project, currentUser],
  );

  const doneCount = useMemo(() => tasks.filter((t) => t.status === 'DONE').length, [tasks]);
  const progress  = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const projectDescriptionPreview = useMemo(
    () => stripRichText(project?.description ?? ''),
    [project?.description],
  );
  const inProgressCount = useMemo(() => tasks.filter((t) => t.status === 'IN_PROGRESS').length, [tasks]);
  const reviewCount = useMemo(() => tasks.filter((t) => t.status === 'REVIEW').length, [tasks]);
  const todoCount = useMemo(() => tasks.filter((t) => t.status === 'TODO').length, [tasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
  }, []);

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

  /* ── loading state ── */
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
      {/* ── Header ── */}
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
            {/* Presence (online users) */}
            <PresenceAvatars projectId={id ?? ''} />

            {/* Members — modal trigger */}
            {project && (
              <MemberManager
                projectId={id!}
                members={project.members}
                currentUserId={currentUser?.id ?? ''}
                currentRole={currentProjectRole}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            {tasks.length > 0 && (
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
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 rounded-md bg-primary/15 p-1 text-primary"><Bot className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-medium">{t('task.createWithAi', { defaultValue: 'Create with AI' })} <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{t('common.suggested', { defaultValue: 'Suggested' })}</span></div>
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

      {/* ── Filters ── */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        priority={priority}
        onPriorityChange={(value) => setPriority(value as Priority | '')}
        assigneeId={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        members={members}
      />

      {/* ── Stats bar ── */}
      {tasks.length > 0 && (
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

      {/* ── Kanban ── */}
      {tasksLoading ? (
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
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onQuickAdd={handleQuickAdd}
        />
      )}

      {/* ── Task Form Dialog ── */}
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

      {/* ── Task Drawer ── */}
      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setEditingTask(task);
          setTaskEditOpen(true);
        }}
      />

      {/* ── Delete Confirm ── */}
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
