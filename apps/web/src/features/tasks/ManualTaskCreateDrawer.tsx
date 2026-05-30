import { useEffect, useMemo, useState } from 'react';
import { Calendar, Flag, ListTodo, Sparkles, Tag, UserRound, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PremiumSelect, type PremiumSelectOption } from '@/components/ui/PremiumSelect';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/Drawer';
import {
  useGenerateSubtasksAi,
  useImproveDescriptionAi,
  useSuggestPriorityAi,
} from '@/hooks/useAi';
import { useCreateTask } from '@/hooks/useTasks';
import { translateByKey } from '@/i18n/translate';
import { isRichTextEmpty } from '@/utils/richText';
import type { TaskStatus, Priority } from '@/types/task.types';

interface ManualTaskCreateDrawerProps {
  open: boolean;
  projectId: string;
  initialTitle?: string;
  defaultStatus?: TaskStatus;
  members?: Array<{ id: string; firstName: string; lastName: string }>;
  onClose: () => void;
}

interface DraftSubtask {
  id: string;
  title: string;
}

export function ManualTaskCreateDrawer({
  open,
  projectId,
  initialTitle,
  defaultStatus = 'TODO',
  members = [],
  onClose,
}: ManualTaskCreateDrawerProps) {
  const { t } = useTranslation();
  const createTask = useCreateTask(projectId);
  const improveDescriptionAi = useImproveDescriptionAi();
  const generateSubtasksAi = useGenerateSubtasksAi();
  const suggestPriorityAi = useSuggestPriorityAi();

  const [title, setTitle] = useState(initialTitle ?? '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [tags, setTags] = useState('');
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  const busy =
    createTask.isPending ||
    improveDescriptionAi.isPending ||
    generateSubtasksAi.isPending ||
    suggestPriorityAi.isPending;

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? '');
    setStatus(defaultStatus);
  }, [open, initialTitle, defaultStatus]);

  const canSubmit = useMemo(() => title.trim().length >= 2, [title]);

  const priorityOptions = useMemo<PremiumSelectOption<Priority>[]>(() => ([
    { value: 'LOW', label: t('priority.low', { defaultValue: 'Low' }), icon: <Flag className="h-3.5 w-3.5" /> },
    { value: 'MEDIUM', label: t('priority.medium', { defaultValue: 'Medium' }), icon: <Flag className="h-3.5 w-3.5" /> },
    { value: 'HIGH', label: t('priority.high', { defaultValue: 'High' }), icon: <Flag className="h-3.5 w-3.5" /> },
    { value: 'CRITICAL', label: t('priority.critical', { defaultValue: 'Critical' }), icon: <Flag className="h-3.5 w-3.5" />, badge: '!' },
  ]), [t]);

  const statusOptions = useMemo<PremiumSelectOption<TaskStatus>[]>(() => ([
    { value: 'TODO', label: t('status.todo', { defaultValue: 'To do' }), icon: <ListTodo className="h-3.5 w-3.5" /> },
    { value: 'IN_PROGRESS', label: t('status.inProgress', { defaultValue: 'In progress' }), icon: <ListTodo className="h-3.5 w-3.5" /> },
    { value: 'REVIEW', label: t('status.review', { defaultValue: 'Review' }), icon: <ListTodo className="h-3.5 w-3.5" /> },
    { value: 'DONE', label: t('status.done', { defaultValue: 'Done' }), icon: <ListTodo className="h-3.5 w-3.5" /> },
  ]), [t]);

  const assigneeOptions = useMemo<PremiumSelectOption<string>[]>(() => ([
    { value: '', label: t('task.unassigned', { defaultValue: 'Unassigned' }), icon: <UserRound className="h-3.5 w-3.5" /> },
    ...members.map((member) => ({
      value: member.id,
      label: `${member.firstName} ${member.lastName}`,
      icon: <UserRound className="h-3.5 w-3.5" />,
      description: member.id,
    })),
  ]), [members, t]);

  const resetState = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setStatus(defaultStatus);
    setDueDate('');
    setAssigneeId('');
    setTags('');
    setSubtasks([]);
    setNewSubtask('');
  };

  const addSubtask = () => {
    const value = newSubtask.trim();
    if (!value) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title: value }]);
    setNewSubtask('');
  };

  const handleImproveDescription = async () => {
    if (!description.trim()) {
      toast.error(translateByKey('task.writeDescriptionFirst', undefined, 'Write a description first'));
      return;
    }
    const response = await improveDescriptionAi.mutateAsync({
      projectId,
      title: title || undefined,
      description,
    });
    setDescription(response.improvedDescription);
  };

  const handleGenerateSubtasks = async () => {
    if (!title.trim()) {
      toast.error(translateByKey('task.addTitleFirst', undefined, 'Add a title first'));
      return;
    }
    const response = await generateSubtasksAi.mutateAsync({
      projectId,
      title,
      description: description || undefined,
    });
    setSubtasks(response.subtasks.map((subtask) => ({ id: crypto.randomUUID(), title: subtask.title })));
  };

  const handleSuggestPriority = async () => {
    if (!title.trim()) {
      toast.error(translateByKey('task.addTitleFirst', undefined, 'Add a title first'));
      return;
    }
    const response = await suggestPriorityAi.mutateAsync({
      projectId,
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
    });
    setPriority(response.priority);
  };

  const handleCreate = async () => {
    await createTask.mutateAsync({
      title: title.trim(),
      description: isRichTextEmpty(description) ? undefined : description,
      priority,
      status,
      dueDate: dueDate || undefined,
      assigneeId: assigneeId || undefined,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      subtasks: subtasks.map((subtask, index) => ({ title: subtask.title, position: index, completed: false })),
    });

    toast.success(translateByKey('task.created', undefined, 'Task created'));
    resetState();
    onClose();
  };

  return (
    <DrawerRoot open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent size="xl" className="h-screen border-l border-border/80 bg-card/95 backdrop-blur-xl">
        <DrawerHeader className="sticky top-0 z-10 border-b border-border/80 bg-card/95 backdrop-blur-xl">
          <DrawerTitle className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            {t('task.manualCreation', { defaultValue: 'Manual Task Creation' })}
          </DrawerTitle>
          <DrawerDescription>
            {t('task.manualCreationDesc', { defaultValue: 'Full control with optional AI assistance.' })}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="space-y-4 pb-24">
          <div className="rounded-xl border border-border/80 bg-card/75 p-4 space-y-3">
            <Input label={t('task.title', { defaultValue: 'Title' })} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('task.titlePlaceholder', { defaultValue: 'Implement payment system' })} />

            <RichTextEditor
              label={t('task.description', { defaultValue: 'Description' })}
              value={description}
              onChange={setDescription}
              minHeightClassName="min-h-[150px]"
              placeholder={t('task.descriptionPlaceholder', { defaultValue: 'Describe implementation details, constraints and outcomes...' })}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleImproveDescription} isLoading={improveDescriptionAi.isPending}>
                <Sparkles className="h-4 w-4" /> {t('ai.improve', { defaultValue: 'Improve' })}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleGenerateSubtasks} isLoading={generateSubtasksAi.isPending}>
                <Wand2 className="h-4 w-4" /> {t('ai.generateSubtasks', { defaultValue: 'Generate subtasks' })}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleSuggestPriority} isLoading={suggestPriorityAi.isPending}>
                <Flag className="h-4 w-4" /> {t('ai.suggestPriority', { defaultValue: 'Suggest priority' })}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 border rounded-xl border-border/80 bg-card/75 p-3">
            <div className="bg-card/75 p-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Flag className="h-3.5 w-3.5" /> Priority
              </label>
              <PremiumSelect
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
                options={priorityOptions}
                ariaLabel={t('task.priority', { defaultValue: 'Priority' })}
              />
            </div>

            <div className="bg-card/75 p-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListTodo className="h-3.5 w-3.5" /> Status
              </label>
              <PremiumSelect
                value={status}
                onValueChange={(value) => setStatus(value as TaskStatus)}
                options={statusOptions}
                ariaLabel={t('task.status', { defaultValue: 'Status' })}
              />
            </div>

            <div className="bg-card/75 p-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {t('task.dueDate', { defaultValue: 'Due date' })}
              </label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" />
            </div>

            <div className="bg-card/75 p-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" /> Assignee
              </label>
              <PremiumSelect
                value={assigneeId}
                onValueChange={(value) => setAssigneeId(value)}
                options={assigneeOptions}
                ariaLabel={t('task.assignee', { defaultValue: 'Assignee' })}
                searchPlaceholder={t('common.search', { defaultValue: 'Search...' })}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card/75 p-3">
            <Input
              label={t('task.tags', { defaultValue: 'Tags' })}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('task.tagsPlaceholder', { defaultValue: 'backend, payments, stripe' })}
              leftIcon={<Tag className="h-4 w-4" />}
            />
          </div>

          <div className="rounded-xl border border-border/80 bg-card/75 p-3 space-y-2">
            <p className="text-sm font-medium">{t('task.subtasks', { defaultValue: 'Subtasks' })}</p>
            {subtasks.map((subtask, index) => (
              <div key={subtask.id} className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
                <Input
                  value={subtask.title}
                  onChange={(e) => {
                    const next = [...subtasks];
                    next[index] = { ...next[index], title: e.target.value };
                    setSubtasks(next);
                  }}
                  className="h-9"
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => setSubtasks((prev) => prev.filter((item) => item.id !== subtask.id))}>
                  {t('common.remove', { defaultValue: 'Remove' })}
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder={t('task.newSubtask', { defaultValue: 'New subtask' })}
                className="h-9"
              />
              <Button type="button" size="sm" onClick={addSubtask}>
                {t('common.add', { defaultValue: 'Add' })}
              </Button>
            </div>
          </div>
        </DrawerBody>

        <DrawerFooter className="sticky bottom-0 z-10 border-t border-border/80 bg-card/95 backdrop-blur-xl">
          <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="button" onClick={handleCreate} disabled={!canSubmit || busy} isLoading={createTask.isPending}>
            {t('task.create', { defaultValue: 'Create Task' })}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
}
