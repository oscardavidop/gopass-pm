import { BadGatewayException } from '@nestjs/common';
import { ZodSchema } from 'zod';

function extractJsonObject(raw: string): string {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new BadGatewayException('AI provider returned invalid JSON payload');
  }
  return raw.slice(firstBrace, lastBrace + 1);
}

export function parseAiJson<T>(raw: string, schema: ZodSchema<T>): T {
  try {
    const jsonSlice = extractJsonObject(raw);
    const parsed = JSON.parse(jsonSlice);
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new BadGatewayException('AI response schema validation failed');
    }
    return validated.data;
  } catch (error) {
    if (error instanceof BadGatewayException) {
      throw error;
    }
    throw new BadGatewayException('Failed to parse AI JSON response');
  }
}
