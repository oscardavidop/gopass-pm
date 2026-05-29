import React, { useState, useCallback } from 'react';
import {
  X, Pencil, Trash2, Calendar, Flag, Tag, MessageSquare,
  CheckSquare, Square, Plus, Clock, ChevronRight, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/Select';
import { useTask, useDeleteTask, useAddComment, useUpdateTask } from '@/hooks/useTasks';
import { timeAgo, formatDate } from '@/utils/formatters';
import { type Task, type TaskStatus, type Priority } from '@/types/task.types';
import { cn } from '@/utils/cn';

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
  const [commentText, setCommentText]   = useState('');
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [activeTab, setActiveTab]       = useState<'details' | 'activity' | 'comments'>('details');

  const { data: task, isLoading } = useTask(taskId ?? '');
  const deleteTask  = useDeleteTask();
  const addComment  = useAddComment(taskId ?? '');
  const updateTask  = useUpdateTask();

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
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ChevronRight className="h-3.5 w-3.5" />
                <span>Task detail</span>
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
                  <div>
                    <h2 className="text-lg font-semibold leading-snug mb-1.5">{task.title}</h2>
                    {task.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background/60 border border-border text-sm">
                    <MetaRow label="Status">
                      <div className="relative flex items-center">
                        {updateTask.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground absolute -left-4" />
                        )}
                        <Select
                          value={task.status}
                          disabled={updateTask.isPending}
                          onValueChange={(v) =>
                            updateTask.mutate({ id: task.id, data: { status: v as TaskStatus } })
                          }
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[120px] border-0 bg-transparent px-1.5 py-0 text-xs focus:ring-0 hover:bg-accent rounded-md disabled:opacity-60 disabled:cursor-not-allowed">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full', statusCfg?.dot)} />
                                <span>{statusCfg?.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TODO">To do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                            <SelectItem value="REVIEW">Review</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </MetaRow>

                    <MetaRow label="Priority">
                      <div className="relative flex items-center">
                        <Select
                          value={task.priority}
                          disabled={updateTask.isPending}
                          onValueChange={(v) =>
                            updateTask.mutate({ id: task.id, data: { priority: v as Priority } })
                          }
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[110px] border-0 bg-transparent px-1.5 py-0 text-xs focus:ring-0 hover:bg-accent rounded-md disabled:opacity-60 disabled:cursor-not-allowed">
                            <SelectValue>
                              <span className={cn('inline-flex items-center gap-1', priorityCfg?.color)}>
                                <Flag className="h-3 w-3" />
                                {priorityCfg?.label}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </MetaRow>

                    {(task as any).assignee && (
                      <MetaRow label="Assignee">
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

                    {(task as any).dueDate && (
                      <MetaRow label="Due date">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate((task as any).dueDate)}</span>
                        </div>
                      </MetaRow>
                    )}

                    <MetaRow label="Created">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{timeAgo((task as any).createdAt)}</span>
                      </div>
                    </MetaRow>
                  </div>

                  {/* Tags */}
                  {(task as any).tags?.length > 0 && (
                    <div>
                      <SectionLabel icon={<Tag className="h-3.5 w-3.5" />}>Tags</SectionLabel>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(task as any).tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-secondary/60 text-secondary-foreground px-2.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

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
                            ? `Comments (${(task as any).comments?.length ?? 0})`
                            : tab === 'activity'
                            ? `Activity (${(task as any).activityLogs?.length ?? 0})`
                            : 'Subtasks'}
                        </button>
                      ))}
                    </div>

                    {/* Tab: Subtasks placeholder */}
                    {activeTab === 'details' && (
                      <SubtasksPanel task={task as Task} />
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
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description="This action cannot be undone. The task and all its data will be permanently deleted."
        confirmLabel="Delete task"
        variant="destructive"
        isLoading={deleteTask.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

/* ─── sub-panels ────────────────────────────────────────────── */
function SubtasksPanel({ task }: { task: Task }) {
  const [items, setItems] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), title: input.trim(), done: false }]);
    setInput('');
    setAdding(false);
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{done}/{items.length} completed</span>
            <span>{Math.round((done / items.length) * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(done / items.length) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <motion.button
            key={item.id}
            layout
            onClick={() => toggle(item.id)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
          >
            {item.done ? (
              <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
            )}
            <span className={cn('text-sm', item.done && 'line-through text-muted-foreground')}>
              {item.title}
            </span>
          </motion.button>
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
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                  if (e.key === 'Escape') { setAdding(false); setInput(''); }
                }}
                placeholder="Subtask title…"
                className="flex-1 text-sm bg-background/60 border border-input rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={addItem} disabled={!input.trim()}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setInput(''); }}>Cancel</Button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add subtask
          </button>
        )}
      </AnimatePresence>

      {items.length === 0 && !adding && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No subtasks yet
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

function describeActivityLog(log: any): React.ReactNode {
  const old = log.oldValue ?? {};
  const next = log.newValue ?? {};

  if (log.action === 'UPDATED') {
    const parts: string[] = [];
    if (old.status) {
      parts.push(
        `changed status from "${STATUS_LABELS[old.status] ?? old.status}" to "${STATUS_LABELS[next.status] ?? next.status}"`,
      );
    }
    if (old.priority) {
      parts.push(
        `changed priority from "${PRIORITY_LABELS[old.priority] ?? old.priority}" to "${PRIORITY_LABELS[next.priority] ?? next.priority}"`,
      );
    }
    if (old.assigneeId !== undefined) {
      parts.push('changed the assignee');
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
    return <span className="text-muted-foreground">updated this task</span>;
  }

  if (log.action === 'CREATED') return <span className="text-muted-foreground">created this task</span>;
  if (log.action === 'DELETED') return <span className="text-muted-foreground">deleted this task</span>;
  if (log.action === 'COMMENT_ADDED') return <span className="text-muted-foreground">added a comment</span>;

  return <span className="text-muted-foreground lowercase">{log.action.replace(/_/g, ' ')}</span>;
}

function ActivityPanel({ logs }: { logs: any[] }) {
  if (!logs.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No activity recorded
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
  return (
    <div className="space-y-4">
      {/* Thread */}
      <div className="space-y-4">
        {comments.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No comments yet. Start the conversation!
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
          placeholder="Write a comment… (Ctrl+Enter to send)"
          rows={2}
          className="flex-1 text-sm bg-background/60 border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
        />
        <Button
          size="sm"
          onClick={onCommentSubmit}
          disabled={!commentText.trim() || isSubmitting}
          className="self-end"
        >
          {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
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
