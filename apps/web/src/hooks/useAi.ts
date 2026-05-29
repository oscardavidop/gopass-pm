import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { aiService } from '@/services/ai.service';

export function useGenerateTaskAi() {
  return useMutation({
    mutationFn: aiService.generateTask,
    onError: () => toast.error('AI task generation failed'),
  });
}

export function useImproveDescriptionAi() {
  return useMutation({
    mutationFn: aiService.improveDescription,
    onError: () => toast.error('AI description improvement failed'),
  });
}

export function useGenerateSubtasksAi() {
  return useMutation({
    mutationFn: aiService.generateSubtasks,
    onError: () => toast.error('AI subtask generation failed'),
  });
}

export function useSuggestPriorityAi() {
  return useMutation({
    mutationFn: aiService.suggestPriority,
    onError: () => toast.error('AI priority suggestion failed'),
  });
}

export function useSuggestTaskTitlesAi() {
  return useMutation({
    mutationFn: aiService.suggestTitles,
    onError: () => toast.error('AI title suggestions failed'),
  });
}

export function useRegenerateSectionsAi() {
  return useMutation({
    mutationFn: aiService.regenerateSections,
    onError: () => toast.error('AI regenerate sections failed'),
  });
}

export function useConfirmAiTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiService.confirmTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to create AI task'),
  });
}
