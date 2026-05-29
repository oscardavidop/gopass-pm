import { useEffect, useMemo, useState } from 'react';
import { Sparkles, RotateCcw, Wand2, Target, CheckCircle2 } from 'lucide-react';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AiGeneratedTask } from '@/types/ai.types';
import type { Priority } from '@/types/task.types';

interface AiTaskPreviewDialogProps {
  open: boolean;
  initialValue: AiGeneratedTask | null;
  isRegenerating?: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onConfirm: (value: AiGeneratedTask) => void;
}

export function AiTaskPreviewDialog({
  open,
  initialValue,
  isRegenerating,
  onClose,
  onRegenerate,
  onConfirm,
}: AiTaskPreviewDialogProps) {
  const [draft, setDraft] = useState<AiGeneratedTask | null>(initialValue);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  const canConfirm = useMemo(
    () => !!draft?.title?.trim() && !!draft?.description?.trim(),
    [draft],
  );

  const updateSubtask = (index: number, value: string) => {
    if (!draft) return;
    const subtasks = [...draft.subtasks];
    subtasks[index] = { title: value };
    setDraft({ ...draft, subtasks });
  };

  const updateCriterion = (index: number, value: string) => {
    if (!draft) return;
    const acceptanceCriteria = [...draft.acceptanceCriteria];
    acceptanceCriteria[index] = value;
    setDraft({ ...draft, acceptanceCriteria });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="max-w-4xl"
      title={(
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Generated Task
        </div>
      )}
    >
      {!draft ? null : (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2 py-0.5 text-primary">
                <Wand2 className="h-3.5 w-3.5" />
                AI Draft
              </span>
              <span>Model: {draft._meta?.model ?? 'Workers AI'}</span>
              <span>Latency: {draft._meta?.latencyMs ?? '-'} ms</span>
            </div>
          </div>

          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="h-10"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
              <select
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <Input
              label="Estimated Hours"
              type="number"
              min={1}
              max={240}
              value={draft.estimatedHours}
              onChange={(e) => setDraft({ ...draft, estimatedHours: Number(e.target.value || 1) })}
              className="h-10"
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complexity</label>
              <select
                value={draft.complexity}
                onChange={(e) => setDraft({ ...draft, complexity: e.target.value as AiGeneratedTask['complexity'] })}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <Input
            label="Labels"
            value={draft.labels.join(', ')}
            onChange={(e) => setDraft({
              ...draft,
              labels: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
            })}
            className="h-10"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Target className="h-4 w-4 text-primary" />
                Subtasks
              </p>
              <div className="space-y-2">
                {draft.subtasks.map((subtask, index) => (
                  <Input
                    key={`${index}-${subtask.title}`}
                    value={subtask.title}
                    onChange={(e) => updateSubtask(index, e.target.value)}
                    className="h-9"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Acceptance Criteria
              </p>
              <div className="space-y-2">
                {draft.acceptanceCriteria.map((criterion, index) => (
                  <Input
                    key={`${index}-${criterion}`}
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                    className="h-9"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={onRegenerate} isLoading={isRegenerating}>
              <RotateCcw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button type="button" onClick={() => draft && onConfirm(draft)} disabled={!canConfirm}>
              Apply to task
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
