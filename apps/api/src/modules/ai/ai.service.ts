import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Priority, TaskStatus } from '@prisma/client';

import { PrismaService } from '../../shared/database/prisma.service';
import { WorkersAiProvider } from './ai.providers/workers-ai.provider';
import {
  buildGenerateTaskPrompt,
  buildImproveDescriptionPrompt,
  buildPriorityPrompt,
  buildRegenerateSectionsPrompt,
  buildSubtasksPrompt,
  buildTaskSuggestionsPrompt,
} from './ai.prompts/task.prompts';
import {
  aiGeneratedTaskSchema,
  aiImproveDescriptionSchema,
  aiPrioritySuggestionSchema,
  aiRegenerateSectionsSchema,
  aiSubtasksSchema,
  aiTaskSuggestionsSchema,
} from './ai.schemas/ai-output.schemas';
import {
  AiGeneratedTask,
  AiPrioritySuggestion,
  AiProjectContext,
  AiRegeneratedSections,
  AiSubtasksSuggestion,
  AiTaskTitleSuggestions,
  AiDescriptionImprovement,
} from './ai.types/ai.types';
import { parseAiJson } from './ai.validators/json-response.validator';
import { GenerateTaskAiDto } from './dto/generate-task-ai.dto';
import { ImproveDescriptionAiDto } from './dto/improve-description-ai.dto';
import { GenerateSubtasksAiDto } from './dto/generate-subtasks-ai.dto';
import { SuggestPriorityAiDto } from './dto/suggest-priority-ai.dto';
import { TaskSuggestionsAiDto } from './dto/task-suggestions-ai.dto';
import { ConfirmGeneratedTaskAiDto } from './dto/confirm-generated-task-ai.dto';
import { RegenerateSectionsAiDto } from './dto/regenerate-sections-ai.dto';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class AiService {
  private readonly perMinuteLimit = 30;
  private readonly usageWindowMs = 60_000;
  private readonly usageMap = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly workersAi: WorkersAiProvider,
    private readonly tasksService: TasksService,
  ) {}

  async generateTask(dto: GenerateTaskAiDto, userId: string) {
    this.assertRateLimit(userId, 'generate-task');
    const context = await this.getProjectContext(dto.projectId, userId);

    const prompt = buildGenerateTaskPrompt({
      userIdea: this.sanitizeInput(dto.userIdea),
      titleHint: this.sanitizeInput(dto.titleHint),
      descriptionHint: this.sanitizeInput(dto.descriptionHint),
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `gen:${dto.projectId}:${dto.userIdea.trim().toLowerCase()}`,
      maxTokens: 1600,
    });

    const parsed = parseAiJson(result.raw, aiGeneratedTaskSchema);

    return {
      ...this.normalizeGeneratedTask(parsed, context),
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async improveDescription(dto: ImproveDescriptionAiDto, userId: string) {
    this.assertRateLimit(userId, 'improve-description');
    const context = await this.getProjectContext(dto.projectId, userId);
    const cleanDescription = this.sanitizeInput(dto.description);
    if (!cleanDescription) {
      throw new BadRequestException('Description is required');
    }

    const prompt = buildImproveDescriptionPrompt({
      title: this.sanitizeInput(dto.title),
      description: cleanDescription,
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `improve:${dto.projectId}:${cleanDescription.slice(0, 220).toLowerCase()}`,
      maxTokens: 1200,
    });

    const parsed = parseAiJson<AiDescriptionImprovement>(result.raw, aiImproveDescriptionSchema);

    return {
      improvedDescription: parsed.improvedDescription.trim(),
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async generateSubtasks(dto: GenerateSubtasksAiDto, userId: string) {
    this.assertRateLimit(userId, 'generate-subtasks');
    const context = await this.getProjectContext(dto.projectId, userId);

    const prompt = buildSubtasksPrompt({
      title: this.sanitizeInput(dto.title),
      description: this.sanitizeInput(dto.description),
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `subtasks:${dto.projectId}:${dto.title.trim().toLowerCase()}`,
      maxTokens: 1100,
    });

    const parsed = parseAiJson<AiSubtasksSuggestion>(result.raw, aiSubtasksSchema);

    return {
      subtasks: parsed.subtasks.map((s) => ({ title: s.title.trim() })),
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async suggestPriority(dto: SuggestPriorityAiDto, userId: string) {
    this.assertRateLimit(userId, 'suggest-priority');
    const context = await this.getProjectContext(dto.projectId, userId);

    const prompt = buildPriorityPrompt({
      title: this.sanitizeInput(dto.title),
      description: this.sanitizeInput(dto.description),
      dueDate: this.sanitizeInput(dto.dueDate),
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `priority:${dto.projectId}:${dto.title.trim().toLowerCase()}:${dto.dueDate ?? ''}`,
      maxTokens: 900,
    });

    const parsed = parseAiJson<AiPrioritySuggestion>(result.raw, aiPrioritySuggestionSchema);

    return {
      priority: this.ensureAllowedPriority(parsed.priority),
      estimatedHours: parsed.estimatedHours,
      complexity: parsed.complexity,
      reasoning: parsed.reasoning?.trim() || undefined,
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async suggestTaskTitles(dto: TaskSuggestionsAiDto, userId: string) {
    this.assertRateLimit(userId, 'suggest-titles');
    const context = await this.getProjectContext(dto.projectId, userId);

    const prompt = buildTaskSuggestionsPrompt({
      seed: this.sanitizeInput(dto.seed),
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `titles:${dto.projectId}:${dto.seed.trim().toLowerCase()}`,
      maxTokens: 700,
    });

    const parsed = parseAiJson<AiTaskTitleSuggestions>(result.raw, aiTaskSuggestionsSchema);

    return {
      suggestions: parsed.suggestions.map((s) => s.trim()).filter(Boolean),
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async regenerateSections(dto: RegenerateSectionsAiDto, userId: string) {
    this.assertRateLimit(userId, 'regenerate-sections');
    const context = await this.getProjectContext(dto.projectId, userId);

    const prompt = buildRegenerateSectionsPrompt({
      title: this.sanitizeInput(dto.title),
      description: this.sanitizeInput(dto.description),
      sections: dto.sections,
      currentLabels: (dto.currentLabels ?? [])
        .map((label) => this.cleanLabel(label))
        .filter((label): label is string => !!label),
      context,
    });

    const result = await this.workersAi.runJson(prompt, {
      cacheKey: `regen:${dto.projectId}:${dto.title.trim().toLowerCase()}:${dto.sections.join(',')}`,
      maxTokens: 1200,
    });

    const parsed = parseAiJson<AiRegeneratedSections>(result.raw, aiRegenerateSectionsSchema);

    return {
      labels: parsed.labels
        ?.map((label) => this.cleanLabel(label))
        .filter((label): label is string => !!label),
      subtasks: parsed.subtasks?.map((s) => ({ title: s.title.trim() })),
      acceptanceCriteria: parsed.acceptanceCriteria?.map((c) => c.trim()).filter(Boolean),
      estimatedHours: parsed.estimatedHours,
      complexity: parsed.complexity,
      _meta: {
        model: result.model,
        cached: result.cached,
        latencyMs: result.latencyMs,
      },
    };
  }

  async confirmGeneratedTask(dto: ConfirmGeneratedTaskAiDto, userId: string) {
    await this.getProjectContext(dto.projectId, userId);

    const tags = (dto.labels ?? [])
      .map((label) => this.cleanLabel(label))
      .filter((label): label is string => !!label)
      .slice(0, 12);

    const task = await this.tasksService.create(
      dto.projectId,
      {
        title: dto.title.trim(),
        description: this.composeStoredDescription(dto),
        priority: this.ensureAllowedPriority(dto.priority),
        status: dto.status ? this.ensureAllowedStatus(dto.status) : undefined,
        dueDate: dto.dueDate,
        assigneeId: dto.assigneeId,
        tags,
        subtasks: (dto.subtasks ?? []).map((subtask, index) => ({
          title: subtask.title,
          completed: false,
          position: index,
        })),
      },
      userId,
    );

    return {
      task,
      aiMetadata: {
        estimatedHours: dto.estimatedHours,
        complexity: dto.complexity,
      },
    };
  }

  private async getProjectContext(projectId: string, userId: string): Promise<AiProjectContext> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: { tags: true },
          take: 200,
        },
      },
    });

    if (!project) {
      throw new ForbiddenException('No access to this project');
    }

    const knownLabelsSet = new Set<string>();
    project.tasks.forEach((t) => t.tags.forEach((tag) => {
      const clean = this.cleanLabel(tag);
      if (clean) knownLabelsSet.add(clean);
    }));

    return {
      projectId: project.id,
      projectName: project.name,
      projectDescription: this.sanitizeInput(project.description) || '',
      projectStatus: project.status,
      allowedStatuses: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE],
      allowedPriorities: [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL],
      knownLabels: Array.from(knownLabelsSet).slice(0, 40),
      teamMembers: project.members.map((member) => ({
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`.trim(),
      })),
    };
  }

  private normalizeGeneratedTask(task: AiGeneratedTask, context: AiProjectContext): AiGeneratedTask {
    return {
      ...task,
      title: task.title.trim(),
      description: task.description.trim(),
      priority: this.ensureAllowedPriority(task.priority),
      status: this.ensureAllowedStatus(task.status),
      labels: task.labels
        .map((label) => this.cleanLabel(label))
        .filter((label): label is string => !!label)
        .slice(0, 8),
      subtasks: task.subtasks
        .map((subtask) => ({ title: subtask.title.trim() }))
        .filter((subtask) => subtask.title.length >= 3)
        .slice(0, 12),
      acceptanceCriteria: task.acceptanceCriteria
        .map((criterion) => criterion.trim())
        .filter(Boolean)
        .slice(0, 8),
      estimatedHours: Math.max(1, Math.min(task.estimatedHours, 240)),
      complexity: task.complexity,
    };
  }

  private ensureAllowedPriority(priority: string): Priority {
    if (priority === Priority.LOW || priority === Priority.MEDIUM || priority === Priority.HIGH || priority === Priority.CRITICAL) {
      return priority;
    }
    return Priority.MEDIUM;
  }

  private ensureAllowedStatus(status?: string): TaskStatus {
    if (status === TaskStatus.TODO || status === TaskStatus.IN_PROGRESS || status === TaskStatus.REVIEW || status === TaskStatus.DONE) {
      return status;
    }
    return TaskStatus.TODO;
  }

  private composeStoredDescription(dto: ConfirmGeneratedTaskAiDto) {
    const chunks: string[] = [dto.description.trim()];

    if (dto.acceptanceCriteria?.length) {
      const criteriaList = dto.acceptanceCriteria
        .map((criterion) => `<li>${criterion.trim()}</li>`)
        .join('');
      chunks.push(`<p><strong>Acceptance Criteria</strong></p><ul>${criteriaList}</ul>`);
    }

    if (dto.estimatedHours || dto.complexity) {
      chunks.push(
        `<p><strong>Estimated Effort</strong>: ${dto.estimatedHours ?? '-'}h${dto.complexity ? ` (${dto.complexity})` : ''}</p>`,
      );
    }

    return chunks.filter(Boolean).join('<p><br></p>');
  }

  private sanitizeInput(value: string | undefined | null): string {
    if (!value) return '';
    return value
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  }

  private cleanLabel(label: string | undefined | null): string | null {
    if (!label) return null;
    const cleaned = label
      .toLowerCase()
      .replace(/[^a-z0-9-\s_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 32);
    return cleaned.length >= 2 ? cleaned : null;
  }

  private assertRateLimit(userId: string, action: string) {
    const now = Date.now();
    const key = `${userId}:${action}`;
    const windowStart = now - this.usageWindowMs;
    const entries = this.usageMap.get(key) ?? [];
    const active = entries.filter((ts) => ts >= windowStart);

    if (active.length >= this.perMinuteLimit) {
      throw new BadRequestException('AI rate limit exceeded. Please try again in a few seconds.');
    }

    active.push(now);
    this.usageMap.set(key, active);
  }
}
