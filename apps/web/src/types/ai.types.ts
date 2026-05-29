import type { Priority } from './task.types';

export type AiComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiGeneratedSubtask {
  title: string;
}

export interface AiGeneratedTask {
  title: string;
  description: string;
  priority: Priority;
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  estimatedHours: number;
  complexity: AiComplexity;
  labels: string[];
  subtasks: AiGeneratedSubtask[];
  acceptanceCriteria: string[];
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiImproveDescriptionResponse {
  improvedDescription: string;
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiSubtasksResponse {
  subtasks: AiGeneratedSubtask[];
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiPriorityResponse {
  priority: Priority;
  estimatedHours: number;
  complexity: AiComplexity;
  reasoning?: string;
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiSuggestionsResponse {
  suggestions: string[];
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiRegeneratedSectionsResponse {
  labels?: string[];
  subtasks?: AiGeneratedSubtask[];
  acceptanceCriteria?: string[];
  estimatedHours?: number;
  complexity?: AiComplexity;
  _meta?: {
    model: string;
    cached: boolean;
    latencyMs: number;
  };
}

export interface AiConfirmTaskPayload {
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  estimatedHours?: number;
  complexity?: AiComplexity;
  labels?: string[];
  subtasks?: AiGeneratedSubtask[];
  acceptanceCriteria?: string[];
  dueDate?: string;
  assigneeId?: string;
}
