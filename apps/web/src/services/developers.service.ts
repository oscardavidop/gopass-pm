import { api } from './api';

export type DeveloperApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  usageCount: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type DeveloperUsageRow = {
  id: string;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
  };
};

export type DeveloperWebhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  createdAt: string;
  signingSecret?: string;
};

export type DeveloperWebhookDelivery = {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  responseCode: number | null;
  responseBody: string | null;
  durationMs: number | null;
  retryCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  webhook: {
    id: string;
    name: string;
    url: string;
  };
};

export const developersService = {
  listApiKeys: () => api.get('/developers/keys').then((r) => r.data.data as DeveloperApiKey[]),

  createApiKey: (payload: { name: string; scopes: string[]; expiresAt?: string }) =>
    api.post('/developers/keys', payload).then((r) => r.data.data as {
      id: string;
      name: string;
      keyPrefix: string;
      scopes: string[];
      status: string;
      expiresAt: string | null;
      createdAt: string;
      key: string;
      warning: string;
    }),

  revokeApiKey: (id: string) => api.delete(`/developers/keys/${id}`).then((r) => r.data.data),

  getUsageSummary: () =>
    api.get('/developers/usage/summary').then((r) =>
      r.data.data as {
        todayRequests: number;
        monthRequests: number;
        errorRequests: number;
        averageResponseMs: number;
      },
    ),

  getRecentUsage: (limit = 30) =>
    api.get('/developers/usage/requests', { params: { limit } }).then((r) => r.data.data as DeveloperUsageRow[]),

  getLimits: () =>
    api.get('/developers/limits').then((r) =>
      r.data.data as {
        rateLimitPerHour: number;
        usageHeader: string;
      },
    ),

  getDocs: () =>
    api.get('/developers/docs').then((r) =>
      r.data.data as {
        title: string;
        version: string;
        baseUrl: string;
        auth: {
          bearer: string;
          apiKeyHeader: string;
          apiKeyAuthHeader: string;
        };
        docsUrl: string;
        scopes: string[];
        scopeGroups?: Array<{ label: string; values: string[] }>;
        webhookEvents: string[];
        webhookEventGroups?: Array<{ label: string; values: string[] }>;
      },
    ),

  listWebhooks: () =>
    api.get('/developers/webhooks').then((r) =>
      r.data.data as DeveloperWebhook[],
    ),

  listWebhookDeliveries: (limit = 20) =>
    api.get('/developers/webhooks/deliveries', { params: { limit } }).then((r) => r.data.data as DeveloperWebhookDelivery[]),

  createWebhook: (payload: { name: string; url: string; events: string[] }) =>
    api.post('/developers/webhooks', payload).then((r) => r.data.data as DeveloperWebhook),

  disableWebhook: (id: string) => api.delete(`/developers/webhooks/${id}`).then((r) => r.data.data),
};
