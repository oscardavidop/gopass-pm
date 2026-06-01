import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
      toast.success('API key created successfully');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'keys'] });
      toast.success('API key revoked');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'common.internalError', 'Unable to revoke API key'));
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
      toast.success('Webhook created');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developers', 'webhooks'] });
      toast.success('Webhook disabled');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'common.internalError', 'Unable to disable webhook'));
    },
  });
}
