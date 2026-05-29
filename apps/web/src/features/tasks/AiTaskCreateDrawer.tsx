import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Bot,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Flag,
  Tags,
  ListTodo,
  ShieldCheck,
  UserRound,
  Calendar,
  Link2,
  Paperclip,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  useConfirmAiTask,
  useGenerateTaskAi,
  useImproveDescriptionAi,
  useRegenerateSectionsAi,
  useSuggestPriorityAi,
} from '@/hooks/useAi';
import type { AiGeneratedTask } from '@/types/ai.types';
import type { Priority, TaskStatus, Task } from '@/types/task.types';
import { cn } from '@/utils/cn';

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'DONE', label: 'Done' },
];

const LOADING_STEPS = [
  'Analyzing project context...',
  'Generating subtasks...',
  'Creating acceptance criteria...',
  'Optimizing task structure...',
];

interface AiTaskCreateDrawerProps {
  open: boolean;
  projectId: string;
  defaultStatus?: TaskStatus;
  initialIdea?: string;
  members?: Array<{ id: string; firstName: string; lastName: string }>;
  onClose: () => void;
  onCreated?: (task: Task) => void;
}

type Stage = 'idea' | 'loading' | 'preview';

export function AiTaskCreateDrawer({
  open,
  projectId,
  defaultStatus = 'TODO',
  initialIdea,
  members = [],
  onClose,
  onCreated,
}: AiTaskCreateDrawerProps) {
  const [stage, setStage] = useState<Stage>('idea');
  const [idea, setIdea] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({ subtasks: false, criteria: false, advanced: false });
  const [draft, setDraft] = useState<AiGeneratedTask | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [attachmentsMock, setAttachmentsMock] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(0);

  const generateTaskAi = useGenerateTaskAi();
  const improveDescriptionAi = useImproveDescriptionAi();
  const suggestPriorityAi = useSuggestPriorityAi();
  const regenerateSectionsAi = useRegenerateSectionsAi();
  const confirmAiTask = useConfirmAiTask();

  const draftStorageKey = useMemo(() => `tasku:ai-draft:${projectId}`, [projectId]);

  const busy =
    generateTaskAi.isPending ||
    improveDescriptionAi.isPending ||
    suggestPriorityAi.isPending ||
    regenerateSectionsAi.isPending ||
    confirmAiTask.isPending;

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { idea?: string; draft?: AiGeneratedTask; dueDate?: string; assigneeId?: string; advancedOpen?: boolean; dependencies?: string; attachmentsMock?: string };
      if (parsed.idea) setIdea(parsed.idea);
      if (parsed.draft) {
        setDraft(parsed.draft);
        setStage('preview');
      }
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      if (parsed.assigneeId) setAssigneeId(parsed.assigneeId);
      if (parsed.advancedOpen) setAdvancedOpen(true);
      if (parsed.dependencies) setDependencies(parsed.dependencies);
      if (parsed.attachmentsMock) setAttachmentsMock(parsed.attachmentsMock);
    } catch {
      // Ignore draft parse issues
    }
  }, [open, draftStorageKey]);

  useEffect(() => {
    if (!open) return;
    const payload = {
      idea,
      draft,
      dueDate,
      assigneeId,
      advancedOpen,
      dependencies,
      attachmentsMock,
    };
    localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [open, idea, draft, dueDate, assigneeId, advancedOpen, dependencies, attachmentsMock, draftStorageKey]);

  useEffect(() => {
    if (stage !== 'loading') return;
    const timer = window.setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1100);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (!open) return;
    if (initialIdea?.trim()) {
      setIdea(initialIdea.trim());
    }
  }, [open, initialIdea]);

  const resetState = () => {
    setStage('idea');
    setIdea('');
    setDraft(null);
    setDueDate('');
    setAssigneeId('');
    setAdvancedOpen(false);
    setDependencies('');
    setAttachmentsMock('');
    localStorage.removeItem(draftStorageKey);
  };

  const handleClose = () => {
    onClose();
  };

  const handleGenerate = async () => {
    const seed = idea.trim();
    if (seed.length < 3) {
      toast.error('Describe a bit more what needs to be done');
      return;
    }

    setStage('loading');
    try {
      const generated = await generateTaskAi.mutateAsync({
        projectId,
        userIdea: seed,
        titleHint: seed,
      });

      setDraft({
        ...generated,
        status: generated.status ?? defaultStatus,
      });
      setStage('preview');
      toast.success('AI task preview ready');
    } catch {
      setStage('idea');
    }
  };

  const handleRegenerate = async () => {
    const seed = idea.trim() || draft?.title || draft?.description;
    if (!seed) return;
    setStage('loading');
    try {
      const generated = await generateTaskAi.mutateAsync({
        projectId,
        userIdea: seed,
        titleHint: draft?.title,
        descriptionHint: draft?.description,
      });
      setDraft({ ...generated, status: draft?.status ?? generated.status ?? defaultStatus });
      setStage('preview');
    } catch {
      setStage('preview');
    }
  };

  const handleImproveDescription = async () => {
    if (!draft?.description) return;
    const response = await improveDescriptionAi.mutateAsync({
      projectId,
      title: draft.title,
      description: draft.description,
    });
    setDraft({ ...draft, description: response.improvedDescription });
  };

  const handleSuggestPriority = async () => {
    if (!draft) return;
    const response = await suggestPriorityAi.mutateAsync({
      projectId,
      title: draft.title,
      description: draft.description,
      dueDate: dueDate || undefined,
    });
    setDraft({
      ...draft,
      priority: response.priority,
      estimatedHours: response.estimatedHours,
      complexity: response.complexity,
    });
  };

  const handleRegenerateSections = async (sections: Array<'LABELS' | 'SUBTASKS' | 'ACCEPTANCE_CRITERIA' | 'EFFORT'>) => {
    if (!draft) return;
    const response = await regenerateSectionsAi.mutateAsync({
      projectId,
      title: draft.title,
      description: draft.description,
      sections,
      currentLabels: draft.labels,
    });

    setDraft({
      ...draft,
      labels: response.labels ?? draft.labels,
      subtasks: response.subtasks ?? draft.subtasks,
      acceptanceCriteria: response.acceptanceCriteria ?? draft.acceptanceCriteria,
      estimatedHours: response.estimatedHours ?? draft.estimatedHours,
      complexity: response.complexity ?? draft.complexity,
    });
  };

  const handleConfirmCreate = async () => {
    if (!draft) return;
    const created = await confirmAiTask.mutateAsync({
      projectId,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      status: draft.status ?? defaultStatus,
      estimatedHours: draft.estimatedHours,
      complexity: draft.complexity,
      labels: draft.labels,
      subtasks: draft.subtasks,
      acceptanceCriteria: draft.acceptanceCriteria,
      dueDate: dueDate || undefined,
      assigneeId: assigneeId || undefined,
    });

    toast.success('AI task created');
    resetState();
    onCreated?.(created);
    onClose();
  };

  const canGenerate = idea.trim().length >= 3;
  const canCreate = !!draft?.title?.trim() && !!draft?.description?.trim();

  return (
    <DrawerRoot open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DrawerContent size="2xl" className="h-screen w-full max-w-[960px] border-l border-border/80 bg-card/95 backdrop-blur-xl">
        <DrawerHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-xl border-b border-border/80">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Task Creation
          </DrawerTitle>
          <DrawerDescription>
            AI-native flow: idea, generate, review, confirm.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="relative pb-28">
          <AnimatePresence mode="wait">
            {stage === 'idea' && (
              <motion.div
                key="idea"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-transparent to-cyan-500/10 p-4">
                  <p className="text-sm font-medium">Start with a simple idea</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Describe what needs to be done and AI will generate title, description, subtasks, priority, labels and effort.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                  <label className="mb-2 block text-sm font-medium">Task idea</label>
                  <textarea
                    autoFocus
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe what needs to be done..."
                    className="min-h-[150px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Shortcut: press C or N anywhere in project board</span>
                    <span>{idea.trim().length} chars</span>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex min-h-[360px] flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <motion.div
                    className="h-16 w-16 rounded-full border-2 border-primary/25"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                  />
                  <Bot className="absolute inset-0 m-auto h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{LOADING_STEPS[loadingIndex]}</p>
                <div className="w-72 overflow-hidden rounded-full border border-border/70">
                  <motion.div
                    className="h-1.5 bg-gradient-to-r from-primary to-cyan-400"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}

            {stage === 'preview' && draft && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background px-2 py-0.5 text-primary">
                      <Wand2 className="h-3.5 w-3.5" />
                      AI Preview
                    </span>
                    <span>Model: {draft._meta?.model ?? 'Workers AI'}</span>
                    <span>Latency: {draft._meta?.latencyMs ?? '-'} ms</span>
                  </div>
                </div>

                <section className="rounded-xl border border-border/80 bg-card/75 p-4">
                  <Input
                    label="Title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="h-10"
                  />
                  <div className="mt-3">
                    <RichTextEditor
                      label="Description"
                      value={draft.description}
                      onChange={(nextValue) => setDraft({ ...draft, description: nextValue })}
                      minHeightClassName="min-h-[170px]"
                      maxLength={5000}
                      placeholder="Task description..."
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-3 md:grid-cols-4 rounded-xl border border-border/80 bg-card/75 p-4">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Flag className="h-3.5 w-3.5" />
                      Priority
                    </label>
                    <select
                      value={draft.priority}
                      onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ListTodo className="h-3.5 w-3.5" />
                      Status
                    </label>
                    <select
                      value={draft.status ?? defaultStatus}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Input
                      label="Estimated Hours"
                      type="number"
                      min={1}
                      max={240}
                      value={draft.estimatedHours}
                      onChange={(e) => setDraft({ ...draft, estimatedHours: Number(e.target.value || 1) })}
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Complexity
                    </label>
                    <select
                      value={draft.complexity}
                      onChange={(e) => setDraft({ ...draft, complexity: e.target.value as AiGeneratedTask['complexity'] })}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </section>

                <section className="rounded-xl border border-border/80 bg-card/75 p-4 space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Tags className="h-4 w-4 text-primary" /> Labels
                  </label>
                  <Input
                    value={draft.labels.join(', ')}
                    onChange={(e) => setDraft({ ...draft, labels: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                    placeholder="backend, payments, stripe"
                  />
                </section>

                <section className="rounded-xl border border-border/80 bg-card/75 p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-sm font-medium"
                    onClick={() => setCollapsed((prev) => ({ ...prev, subtasks: !prev.subtasks }))}
                  >
                    <span className="flex items-center gap-1.5"><ListTodo className="h-4 w-4 text-primary" /> Subtasks ({draft.subtasks.length})</span>
                    {collapsed.subtasks ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  {!collapsed.subtasks && (
                    <div className="mt-3 space-y-2">
                      {draft.subtasks.map((subtask, index) => (
                        <Input
                          key={`subtask-${index}-${subtask.title}`}
                          value={subtask.title}
                          onChange={(e) => {
                            const subtasks = [...draft.subtasks];
                            subtasks[index] = { title: e.target.value };
                            setDraft({ ...draft, subtasks });
                          }}
                          className="h-9"
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-border/80 bg-card/75 p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-sm font-medium"
                    onClick={() => setCollapsed((prev) => ({ ...prev, criteria: !prev.criteria }))}
                  >
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Acceptance Criteria ({draft.acceptanceCriteria.length})</span>
                    {collapsed.criteria ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                  {!collapsed.criteria && (
                    <div className="mt-3 space-y-2">
                      {draft.acceptanceCriteria.map((criterion, index) => (
                        <Input
                          key={`criterion-${index}-${criterion}`}
                          value={criterion}
                          onChange={(e) => {
                            const acceptanceCriteria = [...draft.acceptanceCriteria];
                            acceptanceCriteria[index] = e.target.value;
                            setDraft({ ...draft, acceptanceCriteria });
                          }}
                          className="h-9"
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-border/80 bg-card/75 p-4">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between text-sm font-medium"
                  >
                    <span>Advanced Mode</span>
                    {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {advancedOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> Due date
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" /> Assignee
                        </label>
                        <select
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Dependencies (mock)"
                        value={dependencies}
                        onChange={(e) => setDependencies(e.target.value)}
                        placeholder="PAY-234, API-10"
                        leftIcon={<Link2 className="h-4 w-4" />}
                      />

                      <Input
                        label="Attachments (mock)"
                        value={attachmentsMock}
                        onChange={(e) => setAttachmentsMock(e.target.value)}
                        placeholder="spec.pdf, stripe-diagram.png"
                        leftIcon={<Paperclip className="h-4 w-4" />}
                      />
                    </div>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </DrawerBody>

        <DrawerFooter className="sticky bottom-0 z-10 border-t border-border/80 bg-card/95 backdrop-blur-xl">
          <div className="mr-auto flex flex-wrap items-center gap-2">
            {stage === 'preview' && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={handleImproveDescription} isLoading={improveDescriptionAi.isPending}>
                  Improve with AI
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRegenerateSections(['SUBTASKS'])} isLoading={regenerateSectionsAi.isPending}>
                  Regenerate subtasks
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRegenerateSections(['LABELS'])} isLoading={regenerateSectionsAi.isPending}>
                  Regenerate labels
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRegenerateSections(['ACCEPTANCE_CRITERIA'])} isLoading={regenerateSectionsAi.isPending}>
                  Regenerate criteria
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestPriority} isLoading={suggestPriorityAi.isPending}>
                  Suggest priority
                </Button>
              </>
            )}
          </div>

          <Button type="button" variant="ghost" onClick={stage === 'idea' ? handleClose : () => setStage('idea')}>
            {stage === 'idea' ? 'Cancel' : 'Back'}
          </Button>

          {stage === 'idea' && (
            <Button type="button" onClick={handleGenerate} disabled={!canGenerate} isLoading={generateTaskAi.isPending}>
              <Sparkles className="h-4 w-4" />
              Generate Task
            </Button>
          )}

          {stage === 'preview' && (
            <>
              <Button type="button" variant="secondary" onClick={handleRegenerate} isLoading={generateTaskAi.isPending}>
                <RefreshCw className={cn('h-4 w-4', generateTaskAi.isPending && 'animate-spin')} />
                Regenerate
              </Button>
              <Button type="button" onClick={handleConfirmCreate} disabled={!canCreate || busy} isLoading={confirmAiTask.isPending}>
                <Check className="h-4 w-4" />
                Save AI Task
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
}
