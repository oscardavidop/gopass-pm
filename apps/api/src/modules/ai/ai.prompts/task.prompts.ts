import { AiProjectContext } from '../ai.types/ai.types';

function safeContext(context: AiProjectContext) {
  return {
    projectName: context.projectName,
    projectDescription: context.projectDescription,
    projectStatus: context.projectStatus,
    allowedStatuses: context.allowedStatuses,
    allowedPriorities: context.allowedPriorities,
    knownLabels: context.knownLabels,
    teamMembers: context.teamMembers,
  };
}

export const AI_SYSTEM_PROMPT = [
  'You are a senior product execution copilot inside a SaaS project management platform.',
  'Return strict JSON only. No markdown. No prose outside JSON.',
  'Never invent workflow statuses or priorities outside the allowed values in context.',
  'Write practical, implementation-ready output with concrete engineering details.',
  'Descriptions must be professional, concise, and specific.',
].join(' ');

export function buildGenerateTaskPrompt(input: {
  userIdea: string;
  titleHint?: string;
  descriptionHint?: string;
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Generate a complete task object',
    instructions: [
      'Use the user idea and project context.',
      'Output JSON with keys exactly: title, description, priority, status, estimatedHours, complexity, labels, subtasks, acceptanceCriteria.',
      'Use realistic estimatedHours for a mid-level engineer.',
      'Subtasks must be actionable and ordered.',
      'Acceptance criteria must be testable outcomes.',
      'Labels should prioritize knownLabels when relevant.',
    ],
    input: {
      userIdea: input.userIdea,
      titleHint: input.titleHint ?? '',
      descriptionHint: input.descriptionHint ?? '',
      context: safeContext(input.context),
    },
    jsonContract: {
      title: 'string',
      description: 'string',
      priority: 'LOW|MEDIUM|HIGH|CRITICAL',
      estimatedHours: 'number',
      complexity: 'LOW|MEDIUM|HIGH',
      labels: ['string'],
      subtasks: [{ title: 'string' }],
      acceptanceCriteria: ['string'],
    },
  });
}

export function buildImproveDescriptionPrompt(input: {
  title?: string;
  description: string;
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Improve task description',
    instructions: [
      'Preserve user intent.',
      'Improve clarity, technical precision and structure.',
      'Keep it concise and implementation-ready.',
      'Output JSON with key: improvedDescription.',
    ],
    input: {
      title: input.title ?? '',
      description: input.description,
      context: safeContext(input.context),
    },
    jsonContract: {
      improvedDescription: 'string',
    },
  });
}

export function buildSubtasksPrompt(input: {
  title: string;
  description?: string;
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Generate subtasks',
    instructions: [
      'Break the task into practical implementation subtasks.',
      'Avoid generic subtasks.',
      'Output JSON with key: subtasks.',
    ],
    input: {
      title: input.title,
      description: input.description ?? '',
      context: safeContext(input.context),
    },
    jsonContract: {
      subtasks: [{ title: 'string' }],
    },
  });
}

export function buildPriorityPrompt(input: {
  title: string;
  description?: string;
  dueDate?: string;
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Suggest task priority and effort',
    instructions: [
      'Infer urgency and effort from title, description, dueDate and project context.',
      'Output JSON with keys: priority, estimatedHours, complexity, reasoning.',
      'Reasoning must be short and concrete.',
    ],
    input: {
      title: input.title,
      description: input.description ?? '',
      dueDate: input.dueDate ?? '',
      context: safeContext(input.context),
    },
    jsonContract: {
      priority: 'LOW|MEDIUM|HIGH|CRITICAL',
      estimatedHours: 'number',
      complexity: 'LOW|MEDIUM|HIGH',
      reasoning: 'string',
    },
  });
}

export function buildTaskSuggestionsPrompt(input: {
  seed: string;
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Generate task title suggestions',
    instructions: [
      'Generate concise, actionable titles.',
      'Keep each suggestion under 100 characters.',
      'Output JSON with key: suggestions.',
    ],
    input: {
      seed: input.seed,
      context: safeContext(input.context),
    },
    jsonContract: {
      suggestions: ['string'],
    },
  });
}

export function buildRegenerateSectionsPrompt(input: {
  title: string;
  description?: string;
  sections: Array<'LABELS' | 'SUBTASKS' | 'ACCEPTANCE_CRITERIA' | 'EFFORT'>;
  currentLabels?: string[];
  context: AiProjectContext;
}) {
  return JSON.stringify({
    task: 'Regenerate selected AI sections for an existing task draft',
    instructions: [
      'Only include requested sections in output.',
      'Return strict JSON with optional keys: labels, subtasks, acceptanceCriteria, estimatedHours, complexity.',
      'For labels, prioritize knownLabels from context when suitable.',
      'Subtasks and acceptance criteria must be actionable and non-generic.',
    ],
    input: {
      title: input.title,
      description: input.description ?? '',
      sections: input.sections,
      currentLabels: input.currentLabels ?? [],
      context: safeContext(input.context),
    },
    jsonContract: {
      labels: ['string'],
      subtasks: [{ title: 'string' }],
      acceptanceCriteria: ['string'],
      estimatedHours: 'number',
      complexity: 'LOW|MEDIUM|HIGH',
    },
  });
}
