import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, Sparkles, Clock3, CircleDashed, CheckCircle2, Gauge } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskDrawer } from '@/features/tasks/TaskDrawer';
import { TaskFilters } from '@/features/tasks/TaskFilters';
import { PresenceAvatars } from '@/components/shared/PresenceAvatars';
import { MemberManager } from '@/features/projects/MemberManager';
import { useProject } from '@/hooks/useProjects';
import { useProjectTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/store/auth.store';
import { type Priority, type Task, type TaskStatus } from '@/types/task.types';

const STATUS_VARIANT: Record<string, any> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  REVIEW: 'warning',
  DONE: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
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
      setTaskFormOpen(true);
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

  const debouncedSearch = useDebounce(search, 300);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: tasksData, isLoading: tasksLoading } = useProjectTasks(id!, {
    search: debouncedSearch || undefined,
    priority: priority || undefined,
    assigneeId: assigneeFilter || undefined,
    limit: 200,
  });

  const createTask = useCreateTask(id!);
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
  const inProgressCount = useMemo(() => tasks.filter((t) => t.status === 'IN_PROGRESS').length, [tasks]);
  const reviewCount = useMemo(() => tasks.filter((t) => t.status === 'REVIEW').length, [tasks]);
  const todoCount = useMemo(() => tasks.filter((t) => t.status === 'TODO').length, [tasks]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
  }, []);

  const handleAddTask = useCallback((status: string) => {
    setDefaultStatus(status as TaskStatus);
    setEditingTask(null);
    setTaskFormOpen(true);
  }, []);

  const handleQuickAdd = useCallback(async (status: string, title: string) => {
    await createTask.mutateAsync({ title, status: status as TaskStatus, priority: 'MEDIUM' });
  }, [createTask]);

  const handleCreateTask = useCallback(async (formData: any) => {
    await createTask.mutateAsync(formData);
    setTaskFormOpen(false);
  }, [createTask]);

  const handleEditTask = useCallback(async (formData: any) => {
    if (!editingTask) return;
    await updateTask.mutateAsync({ id: editingTask.id, data: formData });
    setEditingTask(null);
    setTaskFormOpen(false);
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
        <p className="text-muted-foreground mb-4">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
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
                  {STATUS_LABEL[project.status] ?? project.status}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  Live workspace
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <p className="text-muted-foreground">Total tasks</p>
              <p className="mt-0.5 text-base font-semibold">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <p className="text-muted-foreground">In progress</p>
              <p className="mt-0.5 text-base font-semibold text-blue-400">{inProgressCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <p className="text-muted-foreground">In review</p>
              <p className="mt-0.5 text-base font-semibold text-amber-400">{reviewCount}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2">
              <p className="text-muted-foreground">Completed</p>
              <p className="mt-0.5 text-base font-semibold text-emerald-400">{doneCount}</p>
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
                <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  Sprint completion
                </div>
                <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
              </div>
            )}

            <Button
              size="sm"
              onClick={() => handleAddTask('TODO')}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add task
            </Button>
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
            <CircleDashed className="h-3.5 w-3.5 text-slate-400" />
            {todoCount} todo
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-blue-400" />
            {inProgressCount} in progress
          </span>
          <span className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-amber-400" />
            {reviewCount} review
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            {doneCount} done
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
      <TaskForm
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
        task={editingTask}
        isLoading={createTask.isPending || updateTask.isPending}
        defaultStatus={defaultStatus}
        members={members}
      />

      {/* ── Task Drawer ── */}
      <TaskDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => {
          setEditingTask(task);
          setTaskFormOpen(true);
        }}
      />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}
        title="Delete task"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteTask.isPending}
        onConfirm={handleDeleteTask}
      />
    </div>
  );
}
