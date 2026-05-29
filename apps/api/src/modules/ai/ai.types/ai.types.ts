import { Priority, TaskStatus } from '@prisma/client';

export type AiComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiProjectContext {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectStatus: string;
  allowedStatuses: TaskStatus[];
  allowedPriorities: Priority[];
  knownLabels: string[];
  teamMembers: Array<{
    id: string;
    name: string;
  }>;
}

export interface AiGeneratedSubtask {
  title: string;
}

export interface AiGeneratedTask {
  title: string;
  description: string;
  priority: Priority;
  status?: TaskStatus;
  estimatedHours: number;
  complexity: AiComplexity;
  labels: string[];
  subtasks: AiGeneratedSubtask[];
  acceptanceCriteria: string[];
}

export interface AiDescriptionImprovement {
  improvedDescription: string;
}

export interface AiSubtasksSuggestion {
  subtasks: AiGeneratedSubtask[];
}

export interface AiPrioritySuggestion {
  priority: Priority;
  estimatedHours: number;
  complexity: AiComplexity;
  reasoning?: string;
}

export interface AiTaskTitleSuggestions {
  suggestions: string[];
}

export interface AiRegeneratedSections {
  labels?: string[];
  subtasks?: AiGeneratedSubtask[];
  acceptanceCriteria?: string[];
  estimatedHours?: number;
  complexity?: AiComplexity;
}

export interface AiProviderResult {
  raw: string;
  model: string;
  cached: boolean;
  latencyMs: number;
}
