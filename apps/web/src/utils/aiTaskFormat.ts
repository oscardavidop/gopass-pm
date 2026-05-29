import { sanitizeRichText } from './richText';
import type { AiGeneratedSubtask } from '@/types/ai.types';

function toHtmlList(items: string[]) {
  if (!items.length) return '';
  const listItems = items.map((item) => `<li>${item}</li>`).join('');
  return `<ul>${listItems}</ul>`;
}

export function appendAiSectionsToDescription(input: {
  baseDescription?: string;
  subtasks?: AiGeneratedSubtask[];
  acceptanceCriteria?: string[];
  estimatedHours?: number;
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';
}) {
  const chunks: string[] = [];

  if (input.subtasks?.length) {
    chunks.push(`<p><strong>Subtasks</strong></p>${toHtmlList(input.subtasks.map((s) => s.title))}`);
  }
  if (input.acceptanceCriteria?.length) {
    chunks.push(`<p><strong>Acceptance Criteria</strong></p>${toHtmlList(input.acceptanceCriteria)}`);
  }
  if (input.estimatedHours || input.complexity) {
    chunks.push(
      `<p><strong>Estimated Effort</strong>: ${input.estimatedHours ?? '-'}h${input.complexity ? ` (${input.complexity})` : ''}</p>`,
    );
  }

  const base = input.baseDescription?.trim() ?? '';
  const next = [base, ...chunks].filter(Boolean).join('<p><br></p>');
  return sanitizeRichText(next);
}
