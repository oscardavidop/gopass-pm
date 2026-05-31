import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { uploadsService } from '@/services/uploads.service';
import type { UploadEntityType } from '@/types/upload.types';
import { getApiErrorMessage } from '@/services/api-error';
import { translateByKey } from '@/i18n/translate';

export const uploadKeys = {
  all: ['uploads'] as const,
  byEntity: (entityType: UploadEntityType, entityId: string) => [...uploadKeys.all, entityType, entityId] as const,
};

export function useEntityFiles(entityType: UploadEntityType, entityId?: string) {
  return useQuery({
    queryKey: uploadKeys.byEntity(entityType, entityId || ''),
    queryFn: () => uploadsService.list(entityType, entityId || ''),
    enabled: !!entityId,
    staleTime: 15_000,
  });
}

export function useUploadFile(entityType: UploadEntityType, entityId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { file: File; kind?: string; onProgress?: (pct: number) => void }) => {
      if (!entityId) throw new Error('Missing entity id');
      return uploadsService.upload({
        file: args.file,
        entityType,
        entityId,
        kind: args.kind,
      }, args.onProgress);
    },
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: uploadKeys.byEntity(entityType, entityId) });
      }
      toast.success(translateByKey('uploads.uploadSuccess', undefined, 'File uploaded'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'uploads.uploadFailed', 'Upload failed')),
  });
}

export function useDeleteFile(entityType: UploadEntityType, entityId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => uploadsService.delete(fileId),
    onSuccess: () => {
      if (entityId) {
        qc.invalidateQueries({ queryKey: uploadKeys.byEntity(entityType, entityId) });
      }
      toast.success(translateByKey('uploads.deleteSuccess', undefined, 'File deleted'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'uploads.deleteFailed', 'Could not delete file')),
  });
}
