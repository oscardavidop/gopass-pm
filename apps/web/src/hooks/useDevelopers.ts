import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { translateByKey } from '@/i18n/translate';

import { developersService } from '@/services/developers.service';
import { getApiErrorMessage } from '@/services/api-error';

export function useDeveloperApiKeys() {
  return useQuery({
    queryKey: ['developers', 'keys'],
    queryFn: () => developersService.listApiKeys(),
    staleTime: 20_000,
  });
}

export function useCreateDeveloperApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: developersService.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'keys'] });
      queryClient.invalidateQueries({ queryKey: ['developers', 'usage'] });
      toast.success(translateByKey('developers.apiKey.created', undefined, 'API key created successfully'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'common.internalError', 'Unable to create API key'));
    },
  });
}

export function useRevokeDeveloperApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => developersService.revokeApiKey(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['developers', 'keys'] });
      const previousKeys = queryClient.getQueryData(['developers', 'keys']);

      queryClient.setQueryData(['developers', 'keys'], (current: any[] | undefined) =>
        (current ?? []).map((key) => (key.id === id ? { ...key, status: 'REVOKED' } : key)),
      );

      return { previousKeys };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'keys'] });
      queryClient.invalidateQueries({ queryKey: ['developers', 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['developers', 'docs'] });
      toast.success(translateByKey('developers.apiKey.revoked', undefined, 'API key revoked'));
    },
    onError: (error, _id, context) => {
      if (context?.previousKeys) {
        queryClient.setQueryData(['developers', 'keys'], context.previousKeys);
      }
      toast.error(getApiErrorMessage(error, 'developers.apiKey.revokeFailed', 'Unable to revoke API key'));
    },
  });
}

export function useDeveloperUsageSummary() {
  return useQuery({
    queryKey: ['developers', 'usage', 'summary'],
    queryFn: () => developersService.getUsageSummary(),
    staleTime: 20_000,
  });
}

export function useDeveloperRecentUsage(limit = 30) {
  return useQuery({
    queryKey: ['developers', 'usage', 'requests', limit],
    queryFn: () => developersService.getRecentUsage(limit),
    staleTime: 15_000,
  });
}

export function useDeveloperWebhookDeliveries(limit = 20) {
  return useQuery({
    queryKey: ['developers', 'webhooks', 'deliveries', limit],
    queryFn: () => developersService.listWebhookDeliveries(limit),
    staleTime: 15_000,
  });
}

export function useDeveloperLimits() {
  return useQuery({
    queryKey: ['developers', 'limits'],
    queryFn: () => developersService.getLimits(),
    staleTime: 60_000,
  });
}

export function useDeveloperDocs() {
  return useQuery({
    queryKey: ['developers', 'docs'],
    queryFn: () => developersService.getDocs(),
    staleTime: 5 * 60_000,
  });
}

export function useDeveloperWebhooks() {
  return useQuery({
    queryKey: ['developers', 'webhooks'],
    queryFn: () => developersService.listWebhooks(),
    staleTime: 20_000,
  });
}

export function useCreateDeveloperWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: developersService.createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['developers', 'webhooks', 'deliveries'] });
      toast.success(translateByKey('developers.webhook.created', undefined, 'Webhook created'));
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'common.internalError', 'Unable to create webhook'));
    },
  });
}

export function useDisableDeveloperWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => developersService.disableWebhook(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['developers', 'webhooks'] });
      const previousWebhooks = queryClient.getQueryData(['developers', 'webhooks']);

      queryClient.setQueryData(['developers', 'webhooks'], (current: any[] | undefined) =>
        (current ?? []).map((hook) => (hook.id === id ? { ...hook, status: 'DISABLED' } : hook)),
      );

      return { previousWebhooks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['developers', 'webhooks', 'deliveries'] });
      toast.success(translateByKey('developers.webhook.disabled', undefined, 'Webhook disabled'));
    },
    onError: (error, _id, context) => {
      if (context?.previousWebhooks) {
        queryClient.setQueryData(['developers', 'webhooks'], context.previousWebhooks);
      }
      toast.error(getApiErrorMessage(error, 'developers.webhook.disableFailed', 'Unable to disable webhook'));
    },
  });
}
