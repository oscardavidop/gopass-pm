import React, { useState, useCallback, useEffect } from 'react';
import {
  X, Pencil, Trash2, Calendar, Flag, Tag, MessageSquare,
  CheckSquare, Plus, Clock, ChevronRight, Loader2, Save, Sparkles, Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { PremiumSelect, type PremiumSelectOption } from '@/components/ui/PremiumSelect';
import {
  useTask,
  useDeleteTask,
  useAddComment,
  useUpdateTask,
  useAddSubtask,
  useUpdateSubtask,
  useDeleteSubtask,
  useReorderSubtasks,
} from '@/hooks/useTasks';
import { useGenerateSubtasksAi, useImproveDescriptionAi, useSuggestPriorityAi } from '@/hooks/useAi';
import { useSocketInstance } from '@/hooks/useSocket';
import { timeAgo } from '@/utils/formatters';
import { isRichTextEmpty, sanitizeRichText } from '@/utils/richText';
import { type Task, type TaskStatus, type Priority } from '@/types/task.types';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { translateByKey } from '@/i18n/translate';
import { useCollaborationStore } from '@/store/collaboration.store';
import { AvatarGroup } from '@/components/ui/Avatar';
import { EntityFilesSection } from '@/components/shared/EntityFilesSection';

/* ─── config maps ──────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Low',      color: 'text-slate-400',  bg: 'bg-slate-400/10' },
  MEDIUM:   { label: 'Medium',   color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  HIGH:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-400/10' },
  CRITICAL: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-400/10' },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  TODO:        { label: 'To do',       dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-blue-400' },
  REVIEW:      { label: 'Review',      dot: 'bg-amber-400' },
  DONE:        { label: 'Done',        dot: 'bg-emerald-400' },
};

const PRIORITY_BORDER: Record<string, string> = {
  LOW:      'border-l-slate-500/60',
  MEDIUM:   'border-l-amber-400/70',
  HIGH:     'border-l-orange-400/80',
  CRITICAL: 'border-l-red-500',
};

/* ─── props ─────────────────────────────────────────────────── */
interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onEdit?: (task: Task) => void;
}

/* ─── component ─────────────────────────────────────────────── */
export function TaskDrawer({ taskId, onClose, onEdit }: TaskDrawerProps) {
  const { t } = useTranslation();
  const [commentText, setCommentText]   = useState('');
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [activeTab, setActiveTab]       = useState<'details' | 'activity' | 'comments'>('details');
  const [autosave, setAutosave]         = useState(true);
  const [titleDraft, setTitleDraft]     = useState('');
  const [descDraft, setDescDraft]       = useState('');
  const [draftDirty, setDraftDirty]     = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');

  const { data: task, isLoading } = useTask(taskId ?? '');
  const socket = useSocketInstance();
  const deleteTask  = useDeleteTask();
  const addComment  = useAddComment(taskId ?? '');
  const updateTask  = useUpdateTask();
  const improveDescriptionAi = useImproveDescriptionAi();
  const generateSubtasksAi = useGenerateSubtasksAi();
  const suggestPriorityAi = useSuggestPriorityAi();
  const addSubtask = useAddSubtask(taskId ?? '');
  const updateSubtask = useUpdateSubtask(taskId ?? '');
  const deleteSubtask = useDeleteSubtask(taskId ?? '');
  const reorderSubtasks = useReorderSubtasks(taskId ?? '');

  const handleDelete = useCallback(async () => {
    if (!taskId) return;
    await deleteTask.mutateAsync(taskId);
    setDeleteOpen(false);
    onClose();
  }, [taskId, deleteTask, onClose]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ content: commentText });
    setCommentText('');
  }, [addComment, commentText]);

  const priorityCfg = task ? (PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM) : null;
  const statusCfg   = task ? (STATUS_CONFIG[task.status]     ?? STATUS_CONFIG.TODO)     : null;
  const borderColor = task ? (PRIORITY_BORDER[task.priority] ?? 'border-l-slate-500/60') : '';
  const taskPresence = useCollaborationStore((state) => (task ? state.taskPresenceByProject[task.projectId]?.[task.id] : undefined));
  const viewers = taskPresence?.viewing ?? [];
  const editors = taskPresence?.editing ?? [];
  const presenceUsers = Array.from(new Map(
    [...viewers, ...editors.map((entry) => entry.user)].map((user) => [user.id, user]),
  ).values());
  const titleEditor = editors.find((entry) => entry.field === 'title');
  const descriptionEditor = editors.find((entry) => entry.field === 'description');
  const dueDateEditor = editors.find((entry) => entry.field === 'dueDate');
  const firstPresenceEditor = editors[0]?.user;
  const headerPresenceText = editors.length > 0
    ? t('task.liveEditingBy', { defaultValue: '{{name}} is editing', name: editors[0].user.firstName })
    : viewers.length > 0
      ? t('task.liveViewingBy', { defaultValue: '{{name}} is viewing this task', name: viewers[0].firstName })
      : '';

  useEffect(() => {
    if (!socket || !task || !taskId) return;
    socket.emit('task:viewing', { projectId: task.projectId, taskId, active: true });
    return () => {
      socket.emit('task:presence:leave', { projectId: task.projectId, taskId });
    };
  }, [socket, task, taskId]);

  const statusOptions: PremiumSelectOption<TaskStatus>[] = [
    { value: 'TODO', label: t('task.status.todo', { defaultValue: 'To do' }) },
    { value: 'IN_PROGRESS', label: t('task.status.inProgress', { defaultValue: 'In progress' }) },
    { value: 'REVIEW', label: t('task.status.review', { defaultValue: 'Review' }) },
    { value: 'DONE', label: t('task.status.done', { defaultValue: 'Done' }) },
  ];

  const priorityOptions: PremiumSelectOption<Priority>[] = [
    { value: 'LOW', label: t('task.priority.low', { defaultValue: 'Low' }) },
    { value: 'MEDIUM', label: t('task.priority.medium', { defaultValue: 'Medium' }) },
    { value: 'HIGH', label: t('task.priority.high', { defaultValue: 'High' }) },
    { value: 'CRITICAL', label: t('task.priority.critical', { defaultValue: 'Critical' }), badge: '!' },
  ];

  useEffect(() => {
    if (!task) return;
    if (!draftDirty) {
      setTitleDraft(task.title ?? '');
      setDescDraft(task.description ?? '');
    }
    setDueDateDraft(task.dueDate ? task.dueDate.slice(0, 10) : '');
  }, [task?.id, task?.updatedAt, task?.dueDate, draftDirty]);

  const persistDraft = useCallback(async () => {
    if (!task || !draftDirty) return;

    const nextTitle = titleDraft.trim();
    const nextDesc = sanitizeRichText(descDraft);
    const baseTitle = task.title ?? '';
    const baseDesc = sanitizeRichText(task.description ?? '');

    if (nextTitle.length < 2) return;
    if (nextTitle === baseTitle && nextDesc === baseDesc) {
      setDraftDirty(false);
      return;
    }

    await updateTask.mutateAsync({
      id: task.id,
      data: {
        title: nextTitle,
        description: isRichTextEmpty(nextDesc) ? undefined : nextDesc,
      },
    });
    setDraftDirty(false);
  }, [task, draftDirty, titleDraft, descDraft, updateTask]);

  useEffect(() => {
    if (!task || !autosave || !draftDirty) return;
    const timer = window.setTimeout(() => {
      persistDraft();
    }, 850);
    return () => window.clearTimeout(timer);
  }, [task, autosave, draftDirty, persistDraft]);

  const saveDueDate = useCallback(async (value: string) => {
    if (!task) return;
    const normalized = value || undefined;
    const current = task.dueDate ? task.dueDate.slice(0, 10) : '';
    if ((normalized ?? '') === current) return;
    await updateTask.mutateAsync({
      id: task.id,
      data: { dueDate: normalized },
    });
  }, [task, updateTask]);

  const handleImproveDescription = useCallback(async () => {
    if (!task) return;
    if (!descDraft.trim()) {
      toast.error(translateByKey('task.addDescriptionFirst', undefined, 'Add a description first'));
      return;
    }
    const response = await improveDescriptionAi.mutateAsync({
      projectId: task.projectId,
      title: titleDraft,
      description: descDraft,
    });
    setDescDraft(response.improvedDescription);
    setDraftDirty(true);
    toast.success(translateByKey('ai.descriptionImproved', undefined, 'Description improved'));
  }, [task, titleDraft, descDraft, improveDescriptionAi]);

  const handleGenerateSubtasks = useCallback(async () => {
    if (!task) return;
    const response = await generateSubtasksAi.mutateAsync({
      projectId: task.projectId,
      title: titleDraft || task.title,
      description: descDraft || undefined,
    });

    if (!response.subtasks.length) return;

    for (const subtask of response.subtasks) {
      await addSubtask.mutateAsync({ title: subtask.title });
    }
    toast.success(translateByKey('ai.subtasksCreated', undefined, 'AI subtasks created'));
  }, [task, titleDraft, descDraft, generateSubtasksAi, addSubtask]);

  const handleSuggestPriority = useCallback(async () => {
    if (!task) return;
    const response = await suggestPriorityAi.mutateAsync({
      projectId: task.projectId,
      title: titleDraft || task.title,
      description: descDraft || undefined,
      dueDate: dueDateDraft || undefined,
    });
    await updateTask.mutateAsync({
      id: task.id,
      data: { priority: response.priority },
    });
    toast.success(t('ai.priorityUpdated', { defaultValue: 'Priority updated to {{priority}}', priority: response.priority }));
  }, [task, titleDraft, descDraft, dueDateDraft, suggestPriorityAi, updateTask]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {taskId && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {taskId && (
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 35 }}
            style={{ marginTop: 0 }} // Override Radix's default margin
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex flex-col',
              'w-full max-w-[460px] bg-card shadow-2xl',
              'border-l border-border border-l-[3px]',
              borderColor,
            )}
          >
            {/* ── header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 bg-card/90 backdrop-blur-md">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{t('task.detailTitle', { defaultValue: 'Task detail' })}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    {t('task.liveBadge', { defaultValue: 'Live' })}
                  </span>
                </div>
                {(presenceUsers.length > 0 || editors.length > 0) && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    <AvatarGroup
                      users={presenceUsers.map((user) => ({
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        avatar: user.avatar,
                      }))}
                      size="xs"
                      max={4}
                    />
                    {headerPresenceText && (
                      <span style={{ color: firstPresenceEditor?.collaborationColor ?? undefined }}>
                        {headerPresenceText}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {task && onEdit && (
                  <button
                    onClick={() => { onEdit(task as Task); onClose(); }}
                    className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {task && (
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── body ── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <DrawerSkeleton />
              ) : task ? (
                <div className="px-5 py-5 space-y-5">
                  {/* Title + description */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <input
                        value={titleDraft}
                        onFocus={() => {
                          if (!socket || !task) return;
                          socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: true, field: 'title' });
                        }}
                        onBlur={() => {
                          if (socket && task) {
                            socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: false, field: 'title' });
                          }
                          if (!autosave) persistDraft();
                        }}
                        onChange={(e) => {
                          setTitleDraft(e.target.value);
                          setDraftDirty(true);
                        }}
                        className="w-full bg-transparent text-lg font-semibold leading-snug outline-none border border-transparent rounded-lg px-1.5 py-1 hover:border-border/60 focus:border-primary/40"
                        style={titleEditor?.user?.collaborationColor ? {
                          borderColor: `${titleEditor.user.collaborationColor}66`,
                          backgroundColor: `${titleEditor.user.collaborationColor}14`,
                        } : undefined}
                        placeholder={t('task.titlePlaceholder', { defaultValue: 'Task title' })}
                      />
                      {titleEditor && (
                        <span className="text-[11px]" style={{ color: titleEditor.user.collaborationColor ?? undefined }}>
                          {t('task.editingBy', { defaultValue: 'Editing by {{name}}', name: titleEditor.user.firstName })}
                        </span>
                      )}
                      <button
                        onClick={() => setAutosave((v) => !v)}
                        className={cn(
                          'shrink-0 rounded-full border px-2 py-1 text-[10px] transition-colors',
                          autosave
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-border text-muted-foreground hover:bg-accent',
                        )}
                        title={t('task.toggleAutosave', { defaultValue: 'Toggle autosave' })}
                      >
                        {t('task.autosave', { defaultValue: 'Autosave' })} {autosave ? t('common.on', { defaultValue: 'on' }) : t('common.off', { defaultValue: 'off' })}
                      </button>
                    </div>
                    {descriptionEditor && (
                      <span className="text-[11px]" style={{ color: descriptionEditor.user.collaborationColor ?? undefined }}>
                        {t('task.editingBy', { defaultValue: 'Editing by {{name}}', name: descriptionEditor.user.firstName })}
                      </span>
                    )}
                    <div
                      onFocusCapture={() => {
                        if (!socket || !task) return;
                        socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: true, field: 'description' });
                      }}
                      onBlurCapture={() => {
                        if (!socket || !task) return;
                        socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: false, field: 'description' });
                      }}
                      className={cn('rounded-lg transition-colors', descriptionEditor && 'border')}
                      style={descriptionEditor?.user?.collaborationColor ? {
                        borderColor: `${descriptionEditor.user.collaborationColor}66`,
                        backgroundColor: `${descriptionEditor.user.collaborationColor}12`,
                      } : undefined}
                    >
                      <RichTextEditor
                        label={t('task.description', { defaultValue: 'Description' })}
                        value={descDraft}
                        onChange={(nextValue) => {
                          setDescDraft(nextValue);
                          setDraftDirty(true);
                        }}
                        maxLength={5000}
                        minHeightClassName="min-h-[140px]"
                        placeholder={t('task.descriptionPlaceholder', { defaultValue: 'Add context, acceptance criteria or implementation notes...' })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleImproveDescription} isLoading={improveDescriptionAi.isPending}>
                        {t('ai.improveDescription', { defaultValue: 'Improve description' })}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleGenerateSubtasks} isLoading={generateSubtasksAi.isPending}>
                        {t('ai.generateSubtasks', { defaultValue: 'Generate subtasks' })}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleSuggestPriority} isLoading={suggestPriorityAi.isPending}>
                        {t('ai.suggestPriority', { defaultValue: 'Suggest priority' })}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{autosave ? t('task.autosaveHint', { defaultValue: 'Changes are saved automatically' }) : t('task.manualSaveHint', { defaultValue: 'Manual save mode' })}</span>

                      {
                        autosave  ? (
                          <Badge variant="success" className="rounded-full px-2 py-1">
                            <CheckSquare className="h-3.5 w-3.5" />
                            {t('common.saved', { defaultValue: 'Saved' })}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => persistDraft()}
                            disabled={updateTask.isPending || !draftDirty || titleDraft.trim().length < 2}
                          >
                            {updateTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            {t('common.save', { defaultValue: 'Save' })}
                          </Button>
                        )
                      }
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/60 border border-border text-sm">
                    <MetaRow label={t('task.statusLabel', { defaultValue: 'Status' })}>
                      <div className="relative flex items-center">
                        {updateTask.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground absolute -left-4" />
                        )}
                        <PremiumSelect
                          value={task.status}
                          disabled={updateTask.isPending}
                          onValueChange={(value) => updateTask.mutate({ id: task.id, data: { status: value as TaskStatus } })}
                          options={statusOptions}
                          size="sm"
                          ariaLabel={t('task.statusLabel', { defaultValue: 'Status' })}
                          triggerClassName="h-7 min-w-[132px] border-0 bg-transparent px-1.5 shadow-none hover:bg-accent rounded-md"
                        />
                      </div>
                    </MetaRow>

                    <MetaRow label={t('task.priorityLabel', { defaultValue: 'Priority' })}>
                      <div className="relative flex items-center">
                        <PremiumSelect
                          value={task.priority}
                          disabled={updateTask.isPending}
                          onValueChange={(value) => updateTask.mutate({ id: task.id, data: { priority: value as Priority } })}
                          options={priorityOptions}
                          size="sm"
                          ariaLabel={t('task.priorityLabel', { defaultValue: 'Priority' })}
                          triggerClassName="h-7 min-w-[126px] border-0 bg-transparent px-1.5 shadow-none hover:bg-accent rounded-md"
                        />
                      </div>
                    </MetaRow>

                    {(task as any).assignee && (
                      <MetaRow label={t('task.assigneeLabel', { defaultValue: 'Assignee' })}>
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            firstName={(task as any).assignee.firstName}
                            lastName={(task as any).assignee.lastName}
                            size="xs"
                          />
                          <span className="truncate">{(task as any).assignee.firstName}</span>
                        </div>
                      </MetaRow>
                    )}

                    <MetaRow label={t('task.dueDateLabel', { defaultValue: 'Due date' })}>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <input
                          type="date"
                          value={dueDateDraft}
                          onFocus={() => {
                            if (!socket || !task) return;
                            socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: true, field: 'dueDate' });
                          }}
                          onChange={(e) => setDueDateDraft(e.target.value)}
                          onBlur={(e) => {
                            if (socket && task) {
                              socket.emit('task:editing', { projectId: task.projectId, taskId: task.id, active: false, field: 'dueDate' });
                            }
                            saveDueDate(e.target.value);
                          }}
                          className="h-7 rounded-md border border-input bg-background/70 px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                          style={dueDateEditor?.user?.collaborationColor ? {
                            borderColor: `${dueDateEditor.user.collaborationColor}66`,
                            backgroundColor: `${dueDateEditor.user.collaborationColor}14`,
                          } : undefined}
                        />
                      </div>
                      {dueDateEditor && (
                        <p className="mt-1 text-[11px]" style={{ color: dueDateEditor.user.collaborationColor ?? undefined }}>
                          {t('task.editingBy', { defaultValue: 'Editing by {{name}}', name: dueDateEditor.user.firstName })}
                        </p>
                      )}
                    </MetaRow>

                    <MetaRow label={t('task.createdLabel', { defaultValue: 'Created' })}>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{timeAgo((task as any).createdAt)}</span>
                      </div>
                    </MetaRow>
                  </div>

                  {/* Tags */}
                  {(task as any).tags?.length > 0 && (
                    <div>
                      <SectionLabel icon={<Tag className="h-3.5 w-3.5" />}>{t('task.tags', { defaultValue: 'Tags' })}</SectionLabel>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(task as any).tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-secondary/60 text-secondary-foreground px-2.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <EntityFilesSection
                    entityType="TASK"
                    entityId={task.id}
                    title={t('uploads.attachments', { defaultValue: 'Attachments' })}
                    kind="attachment"
                    accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
                    multiple
                  />

                  {/* Tabs */}
                  <div>
                    <div className="flex gap-1 p-1 bg-background/60 border border-border rounded-lg mb-4">
                      {(['details', 'activity', 'comments'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            'flex-1 text-xs py-1.5 px-2 rounded-md font-medium capitalize transition-all',
                            activeTab === tab
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {tab === 'comments'
                            ? t('task.commentsTab', { defaultValue: 'Comments ({{count}})', count: (task as any).comments?.length ?? 0 })
                            : tab === 'activity'
                            ? t('task.activityTab', { defaultValue: 'Activity ({{count}})', count: (task as any).activityLogs?.length ?? 0 })
                            : t('task.subtasksTab', { defaultValue: 'Subtasks' })}
                        </button>
                      ))}
                    </div>

                    {/* Tab: Subtasks placeholder */}
                    {activeTab === 'details' && (
                      <SubtasksPanel
                        task={task as Task}
                        onCreate={async (title) => {
                          await addSubtask.mutateAsync({ title });
                        }}
                          onToggle={async (subtaskId, state) => {
                            await updateSubtask.mutateAsync({
                              subtaskId,
                              data: {
                                completed: state === 'DONE',
                                inProgress: state === 'IN_PROGRESS',
                              },
                            });
                        }}
                        onRename={async (subtaskId, title) => {
                          await updateSubtask.mutateAsync({ subtaskId, data: { title } });
                        }}
                        onDelete={async (subtaskId) => {
                          await deleteSubtask.mutateAsync({ subtaskId });
                        }}
                        onReorder={async (orderedIds) => {
                          await reorderSubtasks.mutateAsync({ orderedIds });
                        }}
                        isBusy={addSubtask.isPending || updateSubtask.isPending || deleteSubtask.isPending || reorderSubtasks.isPending}
                      />
                    )}

                    {/* Tab: Activity */}
                    {activeTab === 'activity' && (
                      <ActivityPanel logs={(task as any).activityLogs ?? []} />
                    )}

                    {/* Tab: Comments */}
                    {activeTab === 'comments' && (
                      <CommentsPanel
                        comments={(task as any).comments ?? []}
                        commentText={commentText}
                        onCommentChange={setCommentText}
                        onCommentSubmit={handleComment}
                        isSubmitting={addComment.isPending}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteOpen && !deleteTask.isPending}
        onOpenChange={setDeleteOpen}
        title={t('task.deleteTitle', { defaultValue: 'Delete task' })}
        description={t('task.deletePermanentDescription', { defaultValue: 'This action cannot be undone. The task and all its data will be permanently deleted.' })}
        confirmLabel={t('task.deleteAction', { defaultValue: 'Delete task' })}
        variant="destructive"
        isLoading={deleteTask.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

/* ─── sub-panels ────────────────────────────────────────────── */
function SubtasksPanel({
  task,
  onCreate,
  onToggle,
  onRename,
  onDelete,
  onReorder,
  isBusy,
}: {
  task: Task;
  onCreate: (title: string) => Promise<void>;
  onToggle: (subtaskId: string, state: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<void>;
  onRename: (subtaskId: string, title: string) => Promise<void>;
  onDelete: (subtaskId: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  isBusy: boolean;
}) {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const { t } = useTranslation();

  const items = task.subtasks ?? [];
  const done = items.filter((item) => item.completed).length;

  const getState = (item: (typeof items)[number]) => {
    if (item.completed) return 'DONE' as const;
    if (item.inProgress) return 'IN_PROGRESS' as const;
    return 'TODO' as const;
  };

  const getNextState = (item: (typeof items)[number]) => {
    const state = getState(item);
    if (state === 'TODO') return 'IN_PROGRESS' as const;
    if (state === 'IN_PROGRESS') return 'DONE' as const;
    return 'TODO' as const;
  };

  const addItem = async () => {
    const title = input.trim();
    if (!title) return;
    await onCreate(title);
    setInput('');
    setAdding(false);
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    await onReorder(reordered.map((item) => item.id));
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('task.subtasksCompleted', { defaultValue: '{{done}}/{{total}} completed', done, total: items.length })}</span>
            <span>{Math.round((done / items.length) * 100)}%</span>
          </div>
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(done / items.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent/50"
          >
            <button
              disabled={isBusy}
              onClick={() => onToggle(item.id, getNextState(item))}
              className="shrink-0"
              title={getState(item) === 'TODO'
                ? t('task.subtaskMarkInProgress', { defaultValue: 'Mark as in progress' })
                : getState(item) === 'IN_PROGRESS'
                  ? t('task.subtaskMarkDone', { defaultValue: 'Mark as done' })
                  : t('task.subtaskResetTodo', { defaultValue: 'Reset to to do' })}
            >
              {getState(item) === 'DONE' ? (
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              ) : getState(item) === 'IN_PROGRESS' ? (
                <Clock className="h-4 w-4 text-blue-400" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              )}
            </button>

            {editingId === item.id ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={async () => {
                  const next = editingTitle.trim();
                  if (next && next !== item.title) {
                    await onRename(item.id, next);
                  }
                  setEditingId(null);
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const next = editingTitle.trim();
                    if (next && next !== item.title) {
                      await onRename(item.id, next);
                    }
                    setEditingId(null);
                  }
                  if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
                className="h-7 flex-1 rounded-md border border-input bg-background/70 px-2 text-sm"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(item.id);
                  setEditingTitle(item.title);
                }}
                className={cn('flex-1 text-left text-sm', getState(item) === 'DONE' && 'line-through text-muted-foreground')}
              >
                {item.title}
              </button>
            )}

            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                getState(item) === 'DONE' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                getState(item) === 'IN_PROGRESS' && 'border-blue-500/30 bg-blue-500/10 text-blue-400',
                getState(item) === 'TODO' && 'border-border/70 bg-background/70 text-muted-foreground',
              )}
            >
              {getState(item) === 'DONE'
                ? t('task.status.done', { defaultValue: 'Done' })
                : getState(item) === 'IN_PROGRESS'
                  ? t('task.status.inProgress', { defaultValue: 'In progress' })
                  : t('task.status.todo', { defaultValue: 'To do' })}
            </span>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                disabled={isBusy || index === 0}
                onClick={() => moveItem(index, 'up')}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-accent"
                title={t('task.moveUp', { defaultValue: 'Move up' })}
              >
                ↑
              </button>
              <button
                disabled={isBusy || index === items.length - 1}
                onClick={() => moveItem(index, 'down')}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-accent"
                title={t('task.moveDown', { defaultValue: 'Move down' })}
              >
                ↓
              </button>
              <button
                disabled={isBusy}
                onClick={() => onDelete(item.id)}
                className="rounded p-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title={t('common.delete', { defaultValue: 'Delete' })}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {adding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') { setAdding(false); setInput(''); }
                }}
                placeholder={t('task.subtaskTitlePlaceholder', { defaultValue: 'Subtask title...' })}
                className="flex-1 rounded-md border border-input bg-background/60 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addItem} disabled={!input.trim() || isBusy}>{t('common.add', { defaultValue: 'Add' })}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setInput(''); }}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 flex items-center gap-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('task.addSubtask', { defaultValue: 'Add subtask' })}
          </button>
        )}
      </AnimatePresence>

      {items.length === 0 && !adding && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <CheckSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
          {t('task.noSubtasksYet', { defaultValue: 'No subtasks yet' })}
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

function getStatusLabel(status: string) {
  return translateByKey(`task.status.${status.toLowerCase()}`, undefined, STATUS_LABELS[status] ?? status);
}

function getPriorityLabel(priority: string) {
  return translateByKey(`task.priority.${priority.toLowerCase()}`, undefined, PRIORITY_LABELS[priority] ?? priority);
}

function describeActivityLog(log: any): React.ReactNode {
  const old = log.oldValue ?? {};
  const next = log.newValue ?? {};

  if (log.action === 'UPDATED') {
    const parts: string[] = [];
    if (old.status) {
      parts.push(
        translateByKey('task.activity.changedStatus', { from: getStatusLabel(old.status), to: getStatusLabel(next.status) }, 'changed status from "{{from}}" to "{{to}}"'),
      );
    }
    if (old.priority) {
      parts.push(
        translateByKey('task.activity.changedPriority', { from: getPriorityLabel(old.priority), to: getPriorityLabel(next.priority) }, 'changed priority from "{{from}}" to "{{to}}"'),
      );
    }
    if (old.assigneeId !== undefined) {
      parts.push(translateByKey('task.activity.changedAssignee', undefined, 'changed the assignee'));
    }
    if (parts.length > 0) {
      return (
        <span className="text-muted-foreground">
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 ? ' and ' : ''}
              {p}
            </span>
          ))}
        </span>
      );
    }
    return <span className="text-muted-foreground">{translateByKey('task.activity.updatedTask', undefined, 'updated this task')}</span>;
  }

  if (log.action === 'CREATED') return <span className="text-muted-foreground">{translateByKey('task.activity.createdTask', undefined, 'created this task')}</span>;
  if (log.action === 'DELETED') return <span className="text-muted-foreground">{translateByKey('task.activity.deletedTask', undefined, 'deleted this task')}</span>;
  if (log.action === 'COMMENT_ADDED') return <span className="text-muted-foreground">{translateByKey('task.activity.addedComment', undefined, 'added a comment')}</span>;

  return <span className="text-muted-foreground lowercase">{log.action.replace(/_/g, ' ')}</span>;
}

function ActivityPanel({ logs }: { logs: any[] }) {
  const { t } = useTranslation();
  if (!logs.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        {t('task.noActivityRecorded', { defaultValue: 'No activity recorded' })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log: any) => (
        <div key={log.id} className="flex gap-3">
          <Avatar
            firstName={log.user.firstName}
            lastName={log.user.lastName}
            size="xs"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs">
              <span className="font-medium text-foreground">{log.user.firstName}</span>{' '}
              {describeActivityLog(log)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(log.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CommentsPanelProps {
  comments: any[];
  commentText: string;
  onCommentChange: (v: string) => void;
  onCommentSubmit: () => void;
  isSubmitting: boolean;
}

function CommentsPanel({ comments, commentText, onCommentChange, onCommentSubmit, isSubmitting }: CommentsPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Thread */}
      <div className="space-y-4">
        {comments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {t('task.noCommentsYet', { defaultValue: 'No comments yet. Start the conversation!' })}
          </div>
        )}
        {comments.map((comment: any) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar
              firstName={comment.author.firstName}
              lastName={comment.author.lastName}
              size="xs"
            />
            <div className="flex-1 min-w-0">
              <div className="bg-secondary/40 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">
                    {comment.author.firstName} {comment.author.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm leading-relaxed">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <textarea
          value={commentText}
          onChange={(e) => onCommentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommentSubmit();
          }}
          placeholder={t('task.commentPlaceholder', { defaultValue: 'Write a comment... (Ctrl+Enter to send)' })}
          rows={2}
          className="flex-1 text-sm bg-background/60 border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
        />
        <Button
          size="sm"
          onClick={onCommentSubmit}
          disabled={!commentText.trim() || isSubmitting}
          className="self-end"
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('task.postComment', { defaultValue: 'Post' })}
        </Button>
      </div>
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────────── */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {icon}
      {children}
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="px-5 py-5 space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/60 border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
