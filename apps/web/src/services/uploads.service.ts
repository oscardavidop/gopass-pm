import { api } from './api';
import type { UploadedFileRecord, UploadEntityType } from '@/types/upload.types';

export const uploadsService = {
  upload: (
    payload: {
      file: File;
      entityType: UploadEntityType;
      entityId: string;
      kind?: string;
    },
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('entityType', payload.entityType);
    form.append('entityId', payload.entityId);
    if (payload.kind) form.append('kind', payload.kind);

    return api
      .post<{ data: UploadedFileRecord }>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total) return;
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        },
      })
      .then((r) => r.data.data);
  },

  list: (entityType: UploadEntityType, entityId: string) =>
    api
      .get<{ data: UploadedFileRecord[] }>(`/uploads/${entityType.toLowerCase()}/${entityId}`)
      .then((r) => r.data.data),

  delete: (fileId: string) =>
    api.delete<{ data: { id: string; deleted: boolean } }>(`/uploads/${fileId}`).then((r) => r.data.data),
};
