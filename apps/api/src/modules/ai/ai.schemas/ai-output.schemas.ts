import { z } from 'zod';

export const aiComplexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const aiGeneratedSubtaskSchema = z.object({
  title: z.string().min(3).max(160),
});

export const aiGeneratedTaskSchema = z.object({
  title: z.string().min(4).max(200),
  description: z.string().min(20).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  estimatedHours: z.coerce.number().int().min(1).max(240),  complexity: aiComplexitySchema,
  labels: z.array(z.string().min(2).max(40)).min(1).max(8),
  subtasks: z.array(aiGeneratedSubtaskSchema).min(2).max(12),
  acceptanceCriteria: z.array(z.string().min(10).max(220)).min(2).max(8),
});

export const aiImproveDescriptionSchema = z.object({
  improvedDescription: z.string().min(20).max(5000),
});

export const aiSubtasksSchema = z.object({
  subtasks: z.array(aiGeneratedSubtaskSchema).min(2).max(12),
});

export const aiPrioritySuggestionSchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  estimatedHours: z.coerce.number().int().min(1).max(240),
  complexity: aiComplexitySchema,
  reasoning: z.string().min(8).max(240).optional(),
});

export const aiTaskSuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(4).max(120)).min(3).max(8),
});

export const aiRegenerateSectionsSchema = z.object({
  labels: z.array(z.string().min(2).max(40)).min(1).max(8).optional(),
  subtasks: z.array(aiGeneratedSubtaskSchema).min(2).max(12).optional(),
  acceptanceCriteria: z.array(z.string().min(10).max(220)).min(2).max(8).optional(),
  estimatedHours: z.coerce.number().int().min(1).max(240).optional(),
  complexity: aiComplexitySchema.optional(),
});
