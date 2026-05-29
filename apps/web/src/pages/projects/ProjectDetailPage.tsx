import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div
            className="w-9 h-9 rounded-xl shadow-sm shrink-0"
            style={{ background: project.color ?? '#6366f1' }}
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="text-xs">
                {STATUS_LABEL[project.status] ?? project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Progress */}
          {tasks.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            {tasks.filter((t) => t.status === 'TODO').length} todo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            {tasks.filter((t) => t.status === 'IN_PROGRESS').length} in progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {tasks.filter((t) => t.status === 'REVIEW').length} review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
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
