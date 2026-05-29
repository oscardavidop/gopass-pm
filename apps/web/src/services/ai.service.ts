import { api } from './api';
import type {
  AiConfirmTaskPayload,
  AiGeneratedTask,
  AiImproveDescriptionResponse,
  AiPriorityResponse,
  AiRegeneratedSectionsResponse,
  AiSubtasksResponse,
  AiSuggestionsResponse,
} from '@/types/ai.types';
import type { Task } from '@/types/task.types';

export const aiService = {
  generateTask: (payload: {
    projectId: string;
    userIdea: string;
    titleHint?: string;
    descriptionHint?: string;
  }) => api.post<{ data: AiGeneratedTask }>('/ai/tasks/generate', payload).then((r) => r.data.data),

  improveDescription: (payload: {
    projectId: string;
    title?: string;
    description: string;
  }) => api.post<{ data: AiImproveDescriptionResponse }>('/ai/tasks/improve-description', payload).then((r) => r.data.data),

  generateSubtasks: (payload: {
    projectId: string;
    title: string;
    description?: string;
  }) => api.post<{ data: AiSubtasksResponse }>('/ai/tasks/subtasks', payload).then((r) => r.data.data),

  suggestPriority: (payload: {
    projectId: string;
    title: string;
    description?: string;
    dueDate?: string;
  }) => api.post<{ data: AiPriorityResponse }>('/ai/tasks/priority', payload).then((r) => r.data.data),

  suggestTitles: (payload: {
    projectId: string;
    seed: string;
  }) => api.post<{ data: AiSuggestionsResponse }>('/ai/tasks/suggestions', payload).then((r) => r.data.data),

  regenerateSections: (payload: {
    projectId: string;
    title: string;
    description?: string;
    sections: Array<'LABELS' | 'SUBTASKS' | 'ACCEPTANCE_CRITERIA' | 'EFFORT'>;
    currentLabels?: string[];
  }) => api.post<{ data: AiRegeneratedSectionsResponse }>('/ai/tasks/regenerate-sections', payload).then((r) => r.data.data),

  confirmTask: (payload: AiConfirmTaskPayload) =>
    api.post<{ data: { task: Task } }>('/ai/tasks/confirm', payload).then((r) => r.data.data.task),
};
