import { Injectable, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AI_SYSTEM_PROMPT } from '../ai.prompts/task.prompts';
import { AiProviderResult } from '../ai.types/ai.types';

interface RunOptions {
  cacheKey?: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class WorkersAiProvider {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, { expiresAt: number; result: AiProviderResult }>();

  constructor(private readonly config: ConfigService) {
    this.accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.apiToken = this.config.get<string>('CLOUDFLARE_API_TOKEN', '');
    this.model = this.config.get<string>('CLOUDFLARE_AI_MODEL', '@cf/meta/llama-3.1-8b-instruct');
    this.timeoutMs = Number(this.config.get<string>('AI_REQUEST_TIMEOUT_MS', '18000'));
    this.maxRetries = Number(this.config.get<string>('AI_REQUEST_RETRIES', '2'));
    this.cacheTtlMs = Number(this.config.get<string>('AI_CACHE_TTL_MS', '90000'));
  }

  async runJson(userPrompt: string, options?: RunOptions): Promise<AiProviderResult> {
    if (!this.accountId || !this.apiToken) {
      throw new ServiceUnavailableException('AI provider is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
    }

    const cacheKey = options?.cacheKey;
    const cached = cacheKey ? this.cache.get(cacheKey) : undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const startedAt = Date.now();
        const raw = await this.callWorkersAi(userPrompt, {
          temperature: options?.temperature ?? 0.2,
          maxTokens: options?.maxTokens ?? 1400,
        });

        const result: AiProviderResult = {
          raw,
          model: this.model,
          cached: false,
          latencyMs: Date.now() - startedAt,
        };

        if (cacheKey) {
          this.cache.set(cacheKey, {
            result,
            expiresAt: Date.now() + this.cacheTtlMs,
          });
        }

        return result;
      } catch (error) {
        lastError = error;
      }
    }

    throw new BadGatewayException('Workers AI request failed after retries', {
      cause: lastError as Error,
    });
  }

  private async callWorkersAi(userPrompt: string, options: { temperature: number; maxTokens: number }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [
              { role: 'system', content: AI_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: options.temperature,
            max_tokens: options.maxTokens,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new BadGatewayException(`Workers AI HTTP ${response.status}: ${body.slice(0, 300)}`);
      }

      const payload = await response.json() as any;
      if (payload?.success === false) {
        throw new BadGatewayException(payload?.errors?.[0]?.message ?? 'Workers AI returned an error');
      }

      const rawText =
        payload?.result?.response ??
        payload?.result?.output_text ??
        payload?.result?.generated_text ??
        payload?.result?.text ??
        (Array.isArray(payload?.result) ? payload.result.map((i: any) => i?.response ?? i?.generated_text ?? '').join('\n') : undefined);

      if (!rawText || typeof rawText !== 'string') {
        throw new BadGatewayException('Workers AI returned empty response text');
      }

      return rawText;
    } finally {
      clearTimeout(timer);
    }
  }
}
