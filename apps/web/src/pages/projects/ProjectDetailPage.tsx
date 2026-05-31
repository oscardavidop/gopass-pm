import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardList,
  Clock3,
  FilePenLine,
  FolderOpen,
  Gauge,
  HeartPulse,
  LayoutGrid,
  Plus,
  Rows3,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { TaskFilters, type TaskGroupBy } from '@/features/tasks/TaskFilters';
import { TaskListView } from '@/features/tasks/TaskListView';
import { TaskCalendarView } from '@/features/tasks/TaskCalendarView';
import { TaskDrawer } from '@/features/tasks/TaskDrawer';
import { TaskForm } from '@/features/tasks/TaskForm';
import { AiTaskCreateDrawer } from '@/features/tasks/AiTaskCreateDrawer';
import { ManualTaskCreateDrawer } from '@/features/tasks/ManualTaskCreateDrawer';
import { PresenceAvatars } from '@/components/shared/PresenceAvatars';
import { EntityFilesSection } from '@/components/shared/EntityFilesSection';
import { ProjectFilesHub } from '@/features/projects/ProjectFilesHub';
import { MemberManager } from '@/features/projects/MemberManager';
import { ProjectIdentityAvatar } from '@/components/shared/ProjectIdentityAvatar';
import { PremiumSelect } from '@/components/ui/PremiumSelect';
import {
  useDeleteProject,
  useProject,
  useProjectActivity,
  useTransferProjectOwnership,
  useUpdateProject,
  projectKeys,
} from '@/hooks/useProjects';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteTask, useProjectTasks, useUpdateTask } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/auth.store';
import { useEntityFiles, useUploadFile } from '@/hooks/useUploads';
import { trackUiEvent } from '@/utils/analytics';
import { stripRichText } from '@/utils/richText';
import { resolveApiAssetUrl } from '@/utils/url';
import { type Priority, type Task, type TaskStatus } from '@/types/task.types';

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'default',
  ARCHIVED: 'secondary',
};

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
] as const;

type ProjectMainTab = 'overview' | 'tasks' | 'calendar' | 'files' | 'members' | 'activity' | 'settings';

export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('none');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [activeTab, setActiveTab] = useState<ProjectMainTab>('overview');

  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [manualCreateOpen, setManualCreateOpen] = useState(false);
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskIdeaSeed, setTaskIdeaSeed] = useState('');
  const [manualTitleSeed, setManualTitleSeed] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('TODO');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsDeleteOpen, setSettingsDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const [workflowDraft, setWorkflowDraft] = useState<string[]>([]);
  const [priorityDraft, setPriorityDraft] = useState<string[]>([]);
  const [newWorkflowState, setNewWorkflowState] = useState('');
  const [newPriorityLabel, setNewPriorityLabel] = useState('');
  const [transferTargetUserId, setTransferTargetUserId] = useState('');

  const [generalDraft, setGeneralDraft] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    color: '#6366f1',
    visibility: 'PRIVATE',
    invitePermission: 'ADMIN',
    taskCreatePermission: 'MEMBER',
    notificationSettings: {
      taskCreated: true,
      taskAssigned: true,
      taskCompleted: true,
      memberAdded: true,
      workflowUpdated: true,
      fileUploaded: true,
    },
  });

  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const { data: activity = [], isLoading: activityLoading } = useProjectActivity(id!, 200);
  const { data: tasksData, isLoading: tasksLoading } = useProjectTasks(id!, {
    search: debouncedSearch || undefined,
    priority: priority || undefined,
    status: statusFilter || undefined,
    assigneeId: assigneeFilter || undefined,
    limit: 250,
  });
  const filesQuery = useEntityFiles('PROJECT', id);

  const updateProject = useUpdateProject();
  const transferOwnership = useTransferProjectOwnership();
  const deleteProject = useDeleteProject();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const uploadProjectFile = useUploadFile('PROJECT', id);

  const tasks = tasksData?.items ?? [];
  const files = filesQuery.data ?? [];

  const iconUrl = project?.branding?.iconUrl ?? files.find((f) => f.kind === 'icon')?.signedUrl ?? null;
  const bannerUrl = project?.branding?.bannerUrl ?? files.find((f) => f.kind === 'banner')?.signedUrl ?? null;

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
  const inProgressCount = useMemo(() => visibleTasks.filter((t) => t.status === 'IN_PROGRESS').length, [visibleTasks]);
  const reviewCount = useMemo(() => visibleTasks.filter((t) => t.status === 'REVIEW').length, [visibleTasks]);
  const todoCount = useMemo(() => visibleTasks.filter((t) => t.status === 'TODO').length, [visibleTasks]);
  const completionPct = visibleTasks.length ? Math.round((doneCount / visibleTasks.length) * 100) : 0;

  const projectDescriptionPreview = useMemo(() => stripRichText(project?.description ?? ''), [project?.description]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return visibleTasks.filter((task) => !!task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE').length;
  }, [visibleTasks]);

  const openCount = useMemo(() => visibleTasks.filter((task) => task.status !== 'DONE').length, [visibleTasks]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return [...visibleTasks]
      .filter((task) => !!task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 6);
  }, [visibleTasks]);

  const workload = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const task of visibleTasks) {
      const key = task.assignee?.id || 'unassigned';
      const current = map.get(key) || {
        name: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : t('task.unassigned', { defaultValue: 'Unassigned' }),
        count: 0,
      };
      current.count += 1;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [visibleTasks, t]);

  const projectHealth = useMemo(() => {
    if (overdueCount >= 5) return { tone: 'bad', text: t('project.healthBad', { defaultValue: 'Project Health: Risk' }) };
    if (overdueCount > 0) return { tone: 'warn', text: t('project.healthWarn', { defaultValue: 'Project Health: Attention needed' }) };
    return { tone: 'good', text: t('project.healthGood', { defaultValue: 'Project Health: Good' }) };
  }, [overdueCount, t]);

  useEffect(() => {
    if (!project) return;
    setGeneralDraft({
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      color: project.color ?? '#6366f1',
      visibility: project.visibility,
      invitePermission: project.invitePermission ?? 'ADMIN',
      taskCreatePermission: project.taskCreatePermission ?? 'MEMBER',
      notificationSettings: {
        taskCreated: project.notificationSettings?.taskCreated !== false,
        taskAssigned: project.notificationSettings?.taskAssigned !== false,
        taskCompleted: project.notificationSettings?.taskCompleted !== false,
        memberAdded: project.notificationSettings?.memberAdded !== false,
        workflowUpdated: project.notificationSettings?.workflowUpdated !== false,
        fileUploaded: project.notificationSettings?.fileUploaded !== false,
      },
    });
    setWorkflowDraft(project.workflowStates ?? []);
    setPriorityDraft(project.priorityLabels ?? ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    setTransferTargetUserId('');
    setSettingsDirty(false);
  }, [project]);

  useEffect(() => {
    if (!id) return;
    const stored = window.localStorage.getItem(`project-view:${id}`);
    if (stored === 'board' || stored === 'list') setViewMode(stored);
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
    const handleProjectDeleted = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === id) navigate('/projects', { replace: true });
    };

    window.addEventListener('project:access_revoked', handleRevoked);
    window.addEventListener('project:deleted', handleProjectDeleted);

    return () => {
      window.removeEventListener('project:access_revoked', handleRevoked);
      window.removeEventListener('project:deleted', handleProjectDeleted);
    };
  }, [id, navigate]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    trackUiEvent({ event: 'Task Opened', payload: { taskId: task.id, source: activeTab } });
  }, [activeTab]);

  const handleInlineUpdate = useCallback(async (
    taskId: string,
    data: Partial<{ status: TaskStatus; priority: Priority; assigneeId: string | null; dueDate: string | null; tags: string[] }>,
  ) => {
    await updateTask.mutateAsync({ id: taskId, data: data as any });
  }, [updateTask]);

  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
    await Promise.all(taskIds.map((taskId) => deleteTask.mutateAsync(taskId)));
  }, [deleteTask]);

  const handleAddTask = useCallback((status: string) => {
    setDefaultStatus(status as TaskStatus);
    setTaskIdeaSeed('');
    setEditingTask(null);
    setAiCreateOpen(true);
    setActiveTab('tasks');
  }, []);

  const handleQuickAdd = useCallback(async (status: string, title: string) => {
    setDefaultStatus(status as TaskStatus);
    setManualTitleSeed(title);
    setManualCreateOpen(true);
    setActiveTab('tasks');
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

  const handleSaveSettings = useCallback(async () => {
    if (!project?.id) return;
    await updateProject.mutateAsync({
      id: project.id,
      data: {
        name: generalDraft.name,
        description: generalDraft.description,
        status: generalDraft.status as any,
        color: generalDraft.color,
        visibility: generalDraft.visibility as any,
        workflowStates: workflowDraft,
        priorityLabels: priorityDraft,
        invitePermission: generalDraft.invitePermission as any,
        taskCreatePermission: generalDraft.taskCreatePermission as any,
        notificationSettings: generalDraft.notificationSettings,
      },
    });
    setSettingsDirty(false);
  }, [project?.id, updateProject, generalDraft, workflowDraft, priorityDraft]);

  const handleProjectIconUpload = useCallback(async (file: File) => {
    if (!id) return;
    await uploadProjectFile.mutateAsync({ file, kind: 'icon' });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
    ]);
  }, [id, uploadProjectFile, queryClient]);

  const toggleNotificationSetting = (key: keyof typeof generalDraft.notificationSettings) => {
    setGeneralDraft((prev) => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [key]: !prev.notificationSettings[key],
      },
    }));
    setSettingsDirty(true);
  };

  const moveItem = (arr: string[], from: number, to: number) => {
    const copy = [...arr];
    const [picked] = copy.splice(from, 1);
    copy.splice(to, 0, picked);
    return copy;
  };

  if (projectLoading) {
    return (
      <div className="space-y-5 page-enter">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <LayoutGrid className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="mb-4 text-muted-foreground">{t('project.notFound', { defaultValue: 'Project not found.' })}</p>
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('projects.backToProjects', { defaultValue: 'Back to Projects' })}
        </Button>
      </div>
    );
  }

  const topActivity = activity.slice(0, 8);

  return (
    <div className="space-y-4 page-enter">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60">
        <div className="h-1" style={{ background: project.color ?? '#6366f1' }} />

        <div className="relative">
          <div className="h-[140px] sm:h-[180px] lg:h-[220px] w-full bg-secondary/40">
            {bannerUrl ? (
              <img
                src={resolveApiAssetUrl(bannerUrl)}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-slate-800/30 via-slate-700/20 to-slate-900/30" />
            )}
          </div>

          <div className="absolute left-4 top-4">
            <Link
              to="/projects"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/85 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="absolute -bottom-7 left-4 sm:left-6">
            <ProjectIdentityAvatar
              name={project.name}
              color={project.color}
              iconUrl={iconUrl}
              size="lg"
              editable
              uploading={uploadProjectFile.isPending}
              onClick={() => iconInputRef.current?.click()}
              overlayText={t('project.changeProjectIcon', { defaultValue: 'Change Project Icon' })}
            />
            <input
              ref={iconInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleProjectIconUpload(file);
                e.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        <div className="px-4 pb-4 pt-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="text-xs">
              {t(`project.status.${String(project.status).toLowerCase()}`, { defaultValue: project.status })}
            </Badge>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              {t('project.liveWorkspace', { defaultValue: 'Live workspace' })}
            </span>
          </div>

          {projectDescriptionPreview && (
            <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{projectDescriptionPreview}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3.5">
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
              <div className="hidden items-center gap-2 sm:flex">
                <div className="inline-flex items-center gap-1 rounded-full border border-border/75 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  {t('project.sprintCompletion', { defaultValue: 'Sprint completion' })}
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all duration-500 dark:bg-emerald-400"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{completionPct}%</span>
              </div>

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
                          <div className="text-sm font-medium">{t('task.createWithAi', { defaultValue: 'Create with AI' })}</div>
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
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('project.totalTasks', { defaultValue: 'Total tasks' })} value={visibleTasks.length} />
            <StatCard label={t('project.completedTasks', { defaultValue: 'Completed tasks' })} value={doneCount} tone="good" />
            <StatCard label={t('project.overdueTasks', { defaultValue: 'Overdue tasks' })} value={overdueCount} tone={overdueCount > 0 ? 'danger' : 'default'} />
            <StatCard label={t('project.openTasks', { defaultValue: 'Open tasks' })} value={openCount} />
            <StatCard label={t('project.membersCount', { defaultValue: 'Members' })} value={members.length} />
            <StatCard label={t('project.filesCount', { defaultValue: 'Files' })} value={files.length} />
            <StatCard label={t('project.completion', { defaultValue: 'Completion' })} value={`${completionPct}%`} tone="good" />
            <StatCard label={t('project.activityEvents', { defaultValue: 'Activity events' })} value={activity.length} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 lg:col-span-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-semibold">{t('project.progressSection', { defaultValue: 'Progress' })}</p>
                <span className="text-muted-foreground">{completionPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('project.progressHint', { defaultValue: '{{done}} completed of {{total}} total tasks', done: doneCount, total: visibleTasks.length })}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{t('project.healthTitle', { defaultValue: 'Project Health' })}</p>
              </div>
              <p className={`mt-2 text-sm font-medium ${projectHealth.tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : projectHealth.tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {projectHealth.text}
              </p>
              {overdueCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('project.healthOverdueHint', { defaultValue: '{{count}} overdue tasks detected', count: overdueCount })}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <p className="text-sm font-semibold">{t('project.teamWorkload', { defaultValue: 'Team Workload' })}</p>
              <div className="mt-3 space-y-2">
                {workload.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('project.workloadEmpty', { defaultValue: 'No workload data yet.' })}</p>
                )}
                {workload.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-2 text-xs">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <p className="text-sm font-semibold">{t('project.upcomingTasks', { defaultValue: 'Upcoming Tasks' })}</p>
              <div className="mt-3 space-y-2">
                {upcomingTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('project.upcomingEmpty', { defaultValue: 'No upcoming tasks.' })}</p>
                )}
                {upcomingTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleTaskClick(task)}
                    className="w-full rounded-lg border border-border/60 bg-background/50 px-2.5 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-xs font-medium">{task.title}</p>
                    <p className="text-[11px] text-muted-foreground">{task.dueDate?.slice(0, 10)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-sm font-semibold">{t('project.recentActivity', { defaultValue: 'Recent Activity' })}</p>
            <div className="mt-3 space-y-2">
              {topActivity.length === 0 && <p className="text-xs text-muted-foreground">{t('project.activityEmpty', { defaultValue: 'No project activity yet.' })}</p>}
              {topActivity.map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <>
          <TaskFilters
            search={search}
            onSearchChange={(value) => setSearch(value)}
            priority={priority}
            onPriorityChange={(value) => setPriority(value as Priority | '')}
            status={statusFilter}
            onStatusChange={(value) => setStatusFilter(value as TaskStatus | '')}
            assigneeId={assigneeFilter}
            onAssigneeChange={(value) => setAssigneeFilter(value)}
            labelFilter={labelFilter}
            onLabelFilterChange={(value) => setLabelFilter(value)}
            groupBy={groupBy}
            onGroupByChange={(value) => setGroupBy(value)}
            members={members}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            {visibleTasks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CircleDashed className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />{t('project.todoCount', { defaultValue: '{{count}} todo', count: todoCount })}</span>
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />{t('project.inProgressCount', { defaultValue: '{{count}} in progress', count: inProgressCount })}</span>
                <span className="flex items-center gap-1.5"><LayoutGrid className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />{t('project.reviewCount', { defaultValue: '{{count}} review', count: reviewCount })}</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{t('project.doneCount', { defaultValue: '{{count}} done', count: doneCount })}</span>
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
                    onClick={() => setViewMode(item.key as 'board' | 'list')}
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
          projectId={project.id}
          tasks={visibleTasks}
          onTaskClick={handleTaskClick}
        />
      )}

      {activeTab === 'files' && id && <ProjectFilesHub projectId={id} />}

      {activeTab === 'members' && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">{t('project.tab.members', { defaultValue: 'Members' })}</h3>
              <p className="text-sm text-muted-foreground">{t('project.currentMembersHint', { defaultValue: 'Manage team roles and access from this panel.' })}</p>
            </div>
            <MemberManager
              projectId={id!}
              members={project.members}
              currentUserId={currentUser?.id ?? ''}
              currentRole={currentProjectRole}
              pendingInvitations={(project.invitations ?? []).filter((invitation) => invitation.status === 'PENDING') as any}
              onlyButton
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-3.5 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <ProjectIdentityAvatar name={`${member.user.firstName} ${member.user.lastName}`} iconUrl={member.user.avatar ?? null} size="sm" />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-semibold text-foreground">{member.user.firstName} {member.user.lastName}</span>
                    <span className="truncate text-xs text-muted-foreground">{member.user.email}</span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-border/50 bg-secondary/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-secondary-foreground">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">

          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/10 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {t('project.activityTitle', { defaultValue: 'Project Activity' })}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('project.activitySubtitle', { defaultValue: 'Track all recent changes and updates in a timeline.' })}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-border/50 shadow-sm">
              {activity.length} {t('project.events', { defaultValue: 'events' })}
            </Badge>
          </div>

          {/* Contenedor principal */}
          <div className="p-6">

            {/* 1. Estado de Carga (Skeletons en formato Timeline) */}
            {activityLoading && (
              <div className="relative ml-3 border-l-2 border-border/40 py-2">
                <div className="flex flex-col gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="relative pl-8">
                      {/* Nodo del Skeleton */}
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-border/50 ring-4 ring-card" />

                      {/* Contenido del Skeleton */}
                      <div className="space-y-2.5">
                        <Skeleton className="h-4 w-3/4 bg-border/40" />
                        <Skeleton className="h-3 w-1/3 bg-border/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Estado Vacío */}
            {!activityLoading && activity.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-12 text-center transition-colors hover:bg-muted/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Activity className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {t('project.activityEmpty', { defaultValue: 'No project activity yet' })}
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {t('project.activityEmptyDesc', { defaultValue: 'Events will appear here as a timeline when actions occur.' })}
                </p>
              </div>
            )}

            {/* 3. Lista de Actividad (Timeline Real) */}
            {!activityLoading && activity.length > 0 && (
              <div className="relative ml-3 border-l-2 border-border/40 py-2">
                <div className="flex flex-col gap-6">
                  {activity.map((log, index) => {
                    // Comprobamos si es el último elemento para opcionalmente atenuar la línea (opcional)
                    const isLast = index === activity.length - 1;

                    return (
                      <div key={log.id} className="relative pl-8 group">
                        {/* Nodo de la línea de tiempo (Punto) */}
                        {/* Usamos ring-card para simular un recorte en la línea y que el punto respire */}
                        <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background ring-4 ring-card transition-colors group-hover:bg-primary" />

                        {/* 
                    Contenedor del componente hijo.
                    Asegúrate de que tu componente <ActivityRow /> no tenga 
                    márgenes excesivos que rompan el flujo de la línea.
                  */}
                        <div className="-mt-1.5">
                          <ActivityRow log={log} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t('project.settingsTitle', { defaultValue: 'Project Settings' })}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t('project.settingsHint', { defaultValue: 'All sections below are live and persist to this project.' })}</p>
              </div>
              <Button type="button" size="sm" onClick={() => void handleSaveSettings()} disabled={!settingsDirty || updateProject.isPending}>
                {t('common.saveChanges', { defaultValue: 'Save changes' })}
              </Button>
            </div>
          </div>

          <SettingsSection title={t('project.settings.general', { defaultValue: 'General' })}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label={t('project.nameRequired', { defaultValue: 'Project name *' })}
                value={generalDraft.name}
                onChange={(e) => { setGeneralDraft((prev) => ({ ...prev, name: e.target.value })); setSettingsDirty(true); }}
              />
              <Input
                label={t('project.color', { defaultValue: 'Color' })}
                type="color"
                value={generalDraft.color}
                onChange={(e) => { setGeneralDraft((prev) => ({ ...prev, color: e.target.value })); setSettingsDirty(true); }}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <PremiumSelect
                value={generalDraft.status as any}
                onValueChange={(value) => { setGeneralDraft((prev) => ({ ...prev, status: value })); setSettingsDirty(true); }}
                options={[
                  { value: 'ACTIVE', label: t('project.status.active', { defaultValue: 'Active' }) },
                  { value: 'ON_HOLD', label: t('project.status.onHold', { defaultValue: 'On hold' }) },
                  { value: 'COMPLETED', label: t('project.status.completed', { defaultValue: 'Completed' }) },
                  { value: 'ARCHIVED', label: t('project.status.archived', { defaultValue: 'Archived' }) },
                ]}
              />
              <PremiumSelect
                value={generalDraft.visibility as any}
                onValueChange={(value) => { setGeneralDraft((prev) => ({ ...prev, visibility: value })); setSettingsDirty(true); }}
                options={[
                  { value: 'PRIVATE', label: t('project.visibilityPrivate', { defaultValue: 'Private' }) },
                  { value: 'TEAM', label: t('project.visibilityTeam', { defaultValue: 'Team' }) },
                  { value: 'PUBLIC', label: t('project.visibilityPublic', { defaultValue: 'Public' }) },
                ]}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('project.descriptionLabel', { defaultValue: 'Description' })}</label>
              <textarea
                value={generalDraft.description}
                onChange={(e) => { setGeneralDraft((prev) => ({ ...prev, description: e.target.value })); setSettingsDirty(true); }}
                className="min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </SettingsSection>

          <SettingsSection title={t('project.settings.branding', { defaultValue: 'Branding' })}>
            <p className="text-xs text-muted-foreground">{t('uploads.brandingDesc', { defaultValue: 'Manage project visual assets without cluttering your main workspace.' })}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <EntityFilesSection entityType="PROJECT" entityId={id} title={t('uploads.projectCover', { defaultValue: 'Project cover' })} kind="cover" accept="image/jpeg,image/png,image/webp" multiple={false} />
              <EntityFilesSection entityType="PROJECT" entityId={id} title={t('uploads.projectIcon', { defaultValue: 'Project icon/image' })} kind="icon" accept="image/jpeg,image/png,image/webp" multiple={false} />
              <EntityFilesSection entityType="PROJECT" entityId={id} title={t('uploads.projectBanner', { defaultValue: 'Project banner' })} kind="banner" accept="image/jpeg,image/png,image/webp" multiple={false} />
            </div>
          </SettingsSection>

          <div className="flex gap-4 w-full">

            <SettingsSection className="flex-1" title={t('project.settings.workflow', { defaultValue: 'Workflow' })}>
              <div className="space-y-2">
                {workflowDraft.map((state, idx) => (
                  <div
                    key={`${state}-${idx}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('wf-index', String(idx))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData('wf-index'));
                      if (Number.isFinite(from) && from !== idx) {
                        setWorkflowDraft((prev) => moveItem(prev, from, idx));
                        setSettingsDirty(true);
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg"
                  >
                    <input
                      value={state}
                      onChange={(e) => {
                        const value = e.target.value;
                        setWorkflowDraft((prev) => prev.map((item, index) => (index === idx ? value : item)));
                        setSettingsDirty(true);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setWorkflowDraft((prev) => prev.filter((_, i) => i !== idx)); setSettingsDirty(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={newWorkflowState} onChange={(e) => setNewWorkflowState(e.target.value)} placeholder={t('project.newWorkflowState', { defaultValue: 'New workflow state' })} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!newWorkflowState.trim()) return;
                    setWorkflowDraft((prev) => [...prev, newWorkflowState.trim().toUpperCase()]);
                    setNewWorkflowState('');
                    setSettingsDirty(true);
                  }}
                >
                  {t('common.add', { defaultValue: 'Add' })}
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection className="flex-1" title={t('project.settings.priorities', { defaultValue: 'Priorities' })}>
              <div className="space-y-2">
                {priorityDraft.map((label, idx) => (
                  <div key={`${label}-${idx}`} className="flex items-center gap-2">
                    <input
                      value={label}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPriorityDraft((prev) => prev.map((item, index) => (index === idx ? value : item)));
                        setSettingsDirty(true);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setPriorityDraft((prev) => prev.filter((_, i) => i !== idx)); setSettingsDirty(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input value={newPriorityLabel} onChange={(e) => setNewPriorityLabel(e.target.value)} placeholder={t('project.newPriorityLabel', { defaultValue: 'New priority label' })} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!newPriorityLabel.trim()) return;
                    setPriorityDraft((prev) => [...prev, newPriorityLabel.trim().toUpperCase()]);
                    setNewPriorityLabel('');
                    setSettingsDirty(true);
                  }}
                >
                  {t('common.add', { defaultValue: 'Add' })}
                </Button>
              </div>
            </SettingsSection>
          </div>


          <SettingsSection title={t('project.settings.permissions', { defaultValue: 'Permissions' })}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{t('project.whoCanInviteMembers', { defaultValue: 'Who can invite members?' })}</p>
                <PremiumSelect
                  value={generalDraft.invitePermission as any}
                  onValueChange={(value) => { setGeneralDraft((prev) => ({ ...prev, invitePermission: value })); setSettingsDirty(true); }}
                  options={ROLE_OPTIONS.map((role) => ({ value: role.value, label: t(`project.role${role.value.charAt(0)}${role.value.slice(1).toLowerCase()}`, { defaultValue: role.label }) })) as any}
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">{t('project.whoCanCreateTasks', { defaultValue: 'Who can create tasks?' })}</p>
                <PremiumSelect
                  value={generalDraft.taskCreatePermission as any}
                  onValueChange={(value) => { setGeneralDraft((prev) => ({ ...prev, taskCreatePermission: value })); setSettingsDirty(true); }}
                  options={ROLE_OPTIONS.map((role) => ({ value: role.value, label: t(`project.role${role.value.charAt(0)}${role.value.slice(1).toLowerCase()}`, { defaultValue: role.label }) })) as any}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t('project.settings.notifications', { defaultValue: 'Notifications' })}>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                ['taskCreated', t('project.notification.taskCreated', { defaultValue: 'Task Created' })],
                ['taskAssigned', t('project.notification.taskAssigned', { defaultValue: 'Task Assigned' })],
                ['taskCompleted', t('project.notification.taskCompleted', { defaultValue: 'Task Completed' })],
                ['memberAdded', t('project.notification.memberAdded', { defaultValue: 'Member Added' })],
                ['workflowUpdated', t('project.notification.workflowUpdated', { defaultValue: 'Workflow Updated' })],
                ['fileUploaded', t('project.notification.fileUploaded', { defaultValue: 'File Uploaded' })],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={generalDraft.notificationSettings[key as keyof typeof generalDraft.notificationSettings]}
                    onChange={() => toggleNotificationSetting(key as keyof typeof generalDraft.notificationSettings)}
                    
                  />
                </label>
              ))}
            </div>
          </SettingsSection>

          <SettingsSection title={t('project.settings.dangerZone', { defaultValue: 'Danger Zone' })} tone="danger">
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                <p className="mb-1 text-xs text-muted-foreground">{t('project.selectNewOwner', { defaultValue: 'Select new owner' })}</p>
                <PremiumSelect
                  value={transferTargetUserId || null as any}
                  onValueChange={(value) => setTransferTargetUserId(value)}
                  options={project.members
                    .filter((member) => member.userId !== project.ownerId)
                    .map((member) => ({
                      value: member.userId,
                      label: `${member.user.firstName} ${member.user.lastName}`,
                      description: member.user.email,
                      icon: <UserCheck className="h-3.5 w-3.5" />,
                    })) as any}
                  placeholder={t('project.selectNewOwner', { defaultValue: 'Select new owner' })}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setArchiveOpen(true)}>
                  {t('project.archiveProject', { defaultValue: 'Archive Project' })}
                </Button>
                <Button type="button" variant="outline" onClick={() => setTransferOpen(true)}>
                  {t('project.transferOwnership', { defaultValue: 'Transfer Ownership' })}
                </Button>
                <Button type="button" variant="destructive" onClick={() => setSettingsDeleteOpen(true)}>
                  {t('project.deleteAction', { defaultValue: 'Delete project' })}
                </Button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      <AiTaskCreateDrawer
        open={aiCreateOpen}
        projectId={id ?? ''}
        defaultStatus={defaultStatus}
        members={members}
        initialIdea={taskIdeaSeed}
        onClose={() => { setAiCreateOpen(false); setTaskIdeaSeed(''); }}
      />

      <ManualTaskCreateDrawer
        open={manualCreateOpen}
        projectId={id ?? ''}
        defaultStatus={defaultStatus}
        members={members}
        initialTitle={manualTitleSeed}
        onClose={() => { setManualCreateOpen(false); setManualTitleSeed(''); }}
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
        onEdit={(task) => { setEditingTask(task); setTaskEditOpen(true); }}
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

      <ConfirmDialog
        open={settingsDeleteOpen}
        onOpenChange={setSettingsDeleteOpen}
        title={t('project.deleteTitle', { defaultValue: 'Delete project' })}
        description={t('project.deleteDescription', { defaultValue: 'This action cannot be undone.' })}
        confirmLabel={t('project.deleteAction', { defaultValue: 'Delete project' })}
        variant="destructive"
        isLoading={deleteProject.isPending}
        onConfirm={async () => {
          if (!project?.id) return;
          await deleteProject.mutateAsync(project.id);
          navigate('/projects', { replace: true });
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={t('project.archiveProject', { defaultValue: 'Archive Project' })}
        description={t('project.archiveDescription', { defaultValue: 'Archived projects are hidden from active workflows but remain accessible.' })}
        confirmLabel={t('project.archiveProject', { defaultValue: 'Archive Project' })}
        isLoading={updateProject.isPending}
        onConfirm={async () => {
          if (!project?.id) return;
          await updateProject.mutateAsync({ id: project.id, data: { status: 'ARCHIVED' } as any });
        }}
      />

      <ConfirmDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        title={t('project.transferOwnership', { defaultValue: 'Transfer Ownership' })}
        description={t('project.transferOwnershipDescription', { defaultValue: 'Select a member and confirm secure ownership transfer.' })}
        confirmLabel={t('project.transferOwnership', { defaultValue: 'Transfer Ownership' })}
        isLoading={transferOwnership.isPending}
        onConfirm={async () => {
          if (!project?.id || !transferTargetUserId) return;
          await transferOwnership.mutateAsync({ id: project.id, userId: transferTargetUserId });
        }}
      />
    </div>
  );
}

function SettingsSection({ title, children, tone = 'default', className = '' }: { title: string; children: React.ReactNode; tone?: 'default' | 'danger'; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === 'danger' ? 'border-destructive/40 bg-destructive/5' : 'border-border/70 bg-card/60'} ${className}`}>
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'good' | 'danger' }) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ActivityRow({ log }: { log: any }) {
  const action = String(log.action || '').replace(/_/g, ' ').toLowerCase();
  const actor = `${log.user?.firstName ?? ''} ${log.user?.lastName ?? ''}`.trim() || 'System';
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm">
            <span className="font-semibold">{actor}</span>{' '}
            <span className="text-muted-foreground">{action}</span>
            {log.task?.title && <span className="font-medium"> "{log.task.title}"</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
        </div>
        {log.action?.includes('FILE') && <Upload className="h-4 w-4 text-muted-foreground" />}
        {log.action?.includes('UPDATED') && <SettingsIcon className="h-4 w-4 text-muted-foreground" />}
      </div>
      {(log.oldValue?.status || log.newValue?.status) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {String(log.oldValue?.status || '-')}
          {' -> '}
          {String(log.newValue?.status || '-')}
        </p>
      )}
      {(log.oldValue?.priority || log.newValue?.priority) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {String(log.oldValue?.priority || '-')}
          {' -> '}
          {String(log.newValue?.priority || '-')}
        </p>
      )}
    </div>
  );
}
