import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WebhookDeliveryStatus, WebhookStatus } from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';

import { PrismaService } from '../../shared/database/prisma.service';
import { WEBHOOK_RETRY_DELAYS_MS } from './developers.constants';

interface DispatchWebhookEventParams {
  event: string;
  projectId?: string;
  userIds?: string[];
  payload: Record<string, unknown>;
}

@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatchEvent(params: DispatchWebhookEventParams) {
    const userIds = await this.resolveUserIds(params.projectId, params.userIds);
    if (userIds.length === 0) return;

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        userId: { in: userIds },
        status: WebhookStatus.ACTIVE,
        events: { has: params.event },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        url: true,
        secret: true,
      },
    });

    await Promise.all(
      webhooks.map(async (webhook) => {
        const payload: Prisma.InputJsonValue = {
          id: randomBytes(12).toString('hex'),
          event: params.event,
          occurredAt: new Date().toISOString(),
          data: params.payload as Prisma.InputJsonValue,
        };

        const delivery = await this.prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event: params.event,
            payload,
            status: WebhookDeliveryStatus.PENDING,
          },
          select: { id: true },
        });

        void this.attemptDelivery(delivery.id);
      }),
    );
  }

  async retryPendingDeliveries(limit = 50) {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRYING] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    await Promise.all(deliveries.map((delivery) => this.attemptDelivery(delivery.id)));
  }

  async attemptDelivery(deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        webhook: {
          select: {
            id: true,
            url: true,
            secret: true,
            status: true,
          },
        },
      },
    });

    if (!delivery || delivery.webhook.status !== WebhookStatus.ACTIVE) {
      return;
    }

    const startedAt = Date.now();
    const attemptedAt = new Date();
    const body = JSON.stringify(delivery.payload);
    const signature = createHmac('sha256', delivery.webhook.secret ?? '')
      .update(body)
      .digest('hex');

    try {
      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Tasku-Webhooks/1.0',
          'X-Tasku-Delivery': delivery.id,
          'X-Tasku-Event': delivery.event,
          'X-Tasku-Timestamp': attemptedAt.toISOString(),
          'X-Tasku-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = (await response.text()).slice(0, 2_000);
      const attemptCount = delivery.retryCount + 1;
      const durationMs = Date.now() - startedAt;

      if (response.ok) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.SUCCESS,
            retryCount: attemptCount,
            responseCode: response.status,
            responseBody,
            durationMs,
            lastAttemptAt: attemptedAt,
            nextRetryAt: null,
          },
        });
        return;
      }

      await this.scheduleRetry(delivery.id, attemptCount, attemptedAt, response.status, responseBody, durationMs);
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const attemptCount = delivery.retryCount + 1;
      const message = error instanceof Error ? error.message : 'Unknown webhook error';
      await this.scheduleRetry(delivery.id, attemptCount, attemptedAt, null, message.slice(0, 2_000), durationMs);
    }
  }

  private async scheduleRetry(
    deliveryId: string,
    attemptCount: number,
    attemptedAt: Date,
    responseCode: number | null,
    responseBody: string,
    durationMs: number,
  ) {
    const retryDelay = WEBHOOK_RETRY_DELAYS_MS[attemptCount - 1];
    const nextRetryAt = retryDelay ? new Date(attemptedAt.getTime() + retryDelay) : null;
    const status = nextRetryAt ? WebhookDeliveryStatus.RETRYING : WebhookDeliveryStatus.FAILED;

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        retryCount: attemptCount,
        responseCode,
        responseBody,
        durationMs,
        lastAttemptAt: attemptedAt,
        nextRetryAt,
      },
    });

    if (!nextRetryAt) {
      this.logger.warn(`Webhook delivery ${deliveryId} exhausted retries`);
    }
  }

  private async resolveUserIds(projectId?: string, explicitUserIds?: string[]) {
    if (explicitUserIds && explicitUserIds.length > 0) {
      return Array.from(new Set(explicitUserIds));
    }

    if (!projectId) return [];

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    });

    return Array.from(new Set(members.map((member) => member.userId)));
  }
}
