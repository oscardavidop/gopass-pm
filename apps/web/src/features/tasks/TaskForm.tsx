import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Flag, Sparkles, Tag, UserRound, Wand2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { AiTaskPreviewDialog } from '@/features/tasks/AiTaskPreviewDialog';
import {
  useGenerateTaskAi,
  useGenerateSubtasksAi,
  useImproveDescriptionAi,
  useSuggestPriorityAi,
  useSuggestTaskTitlesAi,
} from '@/hooks/useAi';
import { isRichTextEmpty } from '@/utils/richText';
import { appendAiSectionsToDescription } from '@/utils/aiTaskFormat';
import { type AiGeneratedTask } from '@/types/ai.types';
import { type Task } from '@/types/task.types';

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

type TaskFormData = z.infer<typeof schema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  projectId: string;
  task?: Task | null;
  isLoading?: boolean;
  defaultStatus?: string;
  members?: { id: string; firstName: string; lastName: string }[];
}

export function TaskForm({ open, onClose, onSubmit, projectId, task, isLoading, defaultStatus, members = [] }: TaskFormProps) {
  const isEditing = !!task;
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiGeneratedTask | null>(null);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: (defaultStatus as any) ?? 'TODO',
      dueDate: '',
      assigneeId: '',
      tags: '',
    },
  });

  const generateTaskAi = useGenerateTaskAi();
  const improveDescriptionAi = useImproveDescriptionAi();
  const generateSubtasksAi = useGenerateSubtasksAi();
  const suggestPriorityAi = useSuggestPriorityAi();
  const suggestTitlesAi = useSuggestTaskTitlesAi();

  const aiBusy = useMemo(
    () => generateTaskAi.isPending || improveDescriptionAi.isPending || generateSubtasksAi.isPending || suggestPriorityAi.isPending || suggestTitlesAi.isPending,
    [generateTaskAi.isPending, improveDescriptionAi.isPending, generateSubtasksAi.isPending, suggestPriorityAi.isPending, suggestTitlesAi.isPending],
  );

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority as any,
        status: task.status as any,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assigneeId: task.assigneeId ?? '',
        tags: task.tags?.join(', ') ?? '',
      });
    } else {
      reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: (defaultStatus as any) ?? 'TODO',
        dueDate: '',
        assigneeId: '',
        tags: '',
      });
    }
  }, [task, reset, open, defaultStatus]);

  const handleFormSubmit = (data: TaskFormData) => {
    const payload: any = {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      assigneeId: data.assigneeId || undefined,
      description: isRichTextEmpty(data.description) ? undefined : data.description,
      dueDate: data.dueDate || undefined,
    };
    delete payload.tags; // rebuild below
    payload.tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    onSubmit(payload);
  };

  const buildGenerateInput = () => {
    const title = getValues('title')?.trim();
    const description = getValues('description')?.trim();
    return {
      userIdea: title || description || 'Create a high-impact project task',
      titleHint: title || undefined,
      descriptionHint: description || undefined,
    };
  };

  const handleGenerateWithAi = async () => {
    const input = buildGenerateInput();
    const response = await generateTaskAi.mutateAsync({
      projectId,
      ...input,
    });
    setAiDraft(response);
    setAiPreviewOpen(true);
  };

  const handleApplyAiDraft = (draft: AiGeneratedTask) => {
    setValue('title', draft.title, { shouldDirty: true, shouldValidate: true });
    setValue(
      'description',
      appendAiSectionsToDescription({
        baseDescription: draft.description,
        subtasks: draft.subtasks,
        acceptanceCriteria: draft.acceptanceCriteria,
        estimatedHours: draft.estimatedHours,
        complexity: draft.complexity,
      }),
      { shouldDirty: true, shouldValidate: true },
    );
    setValue('priority', draft.priority, { shouldDirty: true, shouldValidate: true });
    setValue('tags', draft.labels.join(', '), { shouldDirty: true, shouldValidate: true });
    setAiPreviewOpen(false);
    toast.success('AI draft applied. Review and save your task.');
  };

  const handleImproveDescription = async () => {
    const currentDescription = getValues('description')?.trim();
    if (!currentDescription) {
      toast.error('Write a short description first');
      return;
    }

    const response = await improveDescriptionAi.mutateAsync({
      projectId,
      title: getValues('title') || undefined,
      description: currentDescription,
    });

    setValue('description', response.improvedDescription, { shouldDirty: true, shouldValidate: true });
    toast.success('Description improved with AI');
  };

  const handleGenerateSubtasks = async () => {
    const title = getValues('title')?.trim();
    if (!title) {
      toast.error('Add a task title first');
      return;
    }

    const response = await generateSubtasksAi.mutateAsync({
      projectId,
      title,
      description: getValues('description') || undefined,
    });

    const merged = appendAiSectionsToDescription({
      baseDescription: getValues('description') || '',
      subtasks: response.subtasks,
    });

    setValue('description', merged, { shouldDirty: true, shouldValidate: true });
    toast.success('Subtasks generated and inserted into description');
  };

  const handleSuggestPriority = async () => {
    const title = getValues('title')?.trim();
    if (!title) {
      toast.error('Add a task title first');
      return;
    }

    const response = await suggestPriorityAi.mutateAsync({
      projectId,
      title,
      description: getValues('description') || undefined,
      dueDate: getValues('dueDate') || undefined,
    });

    setValue('priority', response.priority, { shouldDirty: true, shouldValidate: true });
    toast.success(`Priority suggested: ${response.priority}`);
  };

  const handleSuggestTitles = async () => {
    const seed = getValues('title')?.trim() || getValues('description')?.trim() || 'project task';
    const response = await suggestTitlesAi.mutateAsync({ projectId, seed });
    setTitleSuggestions(response.suggestions);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {isEditing ? 'Edit Task' : 'Create Task'}
        </div>
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">AI Copilot</p>
              <p className="text-xs text-muted-foreground">Generate complete task drafts, improve descriptions and suggest priority.</p>
            </div>
            <Button type="button" size="sm" onClick={handleGenerateWithAi} isLoading={generateTaskAi.isPending}>
              <Wand2 className="h-4 w-4" />
              Generate with AI
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleSuggestTitles} isLoading={suggestTitlesAi.isPending}>
              Suggest task titles
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleImproveDescription} isLoading={improveDescriptionAi.isPending}>
              Improve description
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleGenerateSubtasks} isLoading={generateSubtasksAi.isPending}>
              Generate subtasks
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleSuggestPriority} isLoading={suggestPriorityAi.isPending}>
              Suggest priority
            </Button>
            {aiBusy && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating with AI...
              </span>
            )}
          </div>

          {titleSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {titleSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setValue('title', suggestion, { shouldDirty: true, shouldValidate: true })}
                  className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-3">
          <Input
            label="Task title"
            placeholder="What needs to be done?"
            error={errors.title?.message}
            className="h-10 rounded-xl"
            {...register('title')}
          />

          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <RichTextEditor
                label="Description"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Add context, acceptance criteria or notes..."
                error={fieldState.error?.message}
                maxLength={5000}
                minHeightClassName="min-h-[160px]"
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Flag className="h-3.5 w-3.5" />
                  Priority
                </label>
                <select
                  {...field}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Status
                </label>
                <select
                  {...field}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            )}
          />

          <div className="rounded-xl border border-border/70 bg-card/70 p-3">
            <Input label="Due date" type="date" className="h-10 rounded-xl" leftIcon={<Calendar className="h-4 w-4" />} {...register('dueDate')} />
          </div>

          {members.length > 0 && (
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    Assignee
                  </label>
                  <select
                    {...field}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          )}
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <Input
            label="Tags"
            placeholder="bug, frontend, design"
            leftIcon={<Tag className="h-4 w-4" />}
            className="h-10 rounded-xl"
            {...register('tags')}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            {isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>

      <AiTaskPreviewDialog
        open={aiPreviewOpen}
        initialValue={aiDraft}
        isRegenerating={generateTaskAi.isPending}
        onClose={() => setAiPreviewOpen(false)}
        onRegenerate={handleGenerateWithAi}
        onConfirm={handleApplyAiDraft}
      />
    </Dialog>
  );
}
