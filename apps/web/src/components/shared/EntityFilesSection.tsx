import { Download, File, Image as ImageIcon, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FileUploader } from './FileUploader';
import { useDeleteFile, useEntityFiles, useUploadFile } from '@/hooks/useUploads';
import { resolveApiAssetUrl } from '@/utils/url';
import type { UploadEntityType } from '@/types/upload.types';
import type { UploadedFileRecord } from '@/types/upload.types';

interface EntityFilesSectionProps {
  entityType: UploadEntityType;
  entityId?: string;
  title: string;
  kind?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded?: (file: UploadedFileRecord) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function EntityFilesSection({
  entityType,
  entityId,
  title,
  kind,
  accept,
  multiple = true,
  onUploaded,
  emptyTitle,
  emptyDescription,
}: EntityFilesSectionProps) {
  const filesQuery = useEntityFiles(entityType, entityId);
  const upload = useUploadFile(entityType, entityId);
  const remove = useDeleteFile(entityType, entityId);
  const [preview, setPreview] = useState<UploadedFileRecord | null>(null);

  const items = useMemo(() => {
    const list = filesQuery.data ?? [];
    if (!kind) return list;
    return list.filter((file) => (file.kind || 'attachment') === kind);
  }, [filesQuery.data, kind]);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-3">
      <h3 className="text-sm font-semibold">{title}</h3>

      <FileUploader
        accept={accept}
        multiple={multiple}
        disabled={!entityId || upload.isPending}
        onUpload={async (file, onProgress) => {
          if (!multiple && items.length > 0) {
            await Promise.all(items.map((existing) => remove.mutateAsync(existing.id)));
          }
          const uploaded = await upload.mutateAsync({ file, kind, onProgress });
          onUploaded?.(uploaded);
        }}
      />

      <div className="space-y-2">
        {items.map((file) => {
          const isImage = file.mimeType.startsWith('image/');
          const isPdf = file.mimeType === 'application/pdf';
          const signedUrl = resolveApiAssetUrl(file.signedUrl || file.url);
          return (
            <div key={file.id} className="rounded-lg border border-border/70 bg-background/60 p-2.5">
              <div className="flex items-center gap-2">
                {isImage ? (
                  <button type="button" onClick={() => setPreview(file)} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
                    <img src={signedUrl} alt={file.filename} className="h-12 w-12 rounded object-cover" />
                  </button>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
                    <File className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{file.filename}</p>
                  <p className="text-[11px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {(isImage || isPdf) && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Preview file"
                    onClick={() => setPreview(file)}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </Button>
                )}
                <a href={signedUrl} target="_blank" rel="noreferrer">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Download file">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete file"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(file.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-4 text-center">
            <p className="text-sm font-medium">{emptyTitle || 'No project files yet'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emptyDescription || 'Upload specifications, designs, documents or images.'}
            </p>
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute -right-2 -top-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
              {(preview.mimeType || '').startsWith('image/') ? (
                <img
                  src={resolveApiAssetUrl(preview.signedUrl || preview.url)}
                  alt={preview.filename}
                  className="max-h-[78vh] w-full object-contain"
                />
              ) : (preview.mimeType || '') === 'application/pdf' ? (
                <iframe
                  src={resolveApiAssetUrl(preview.signedUrl || preview.url)}
                  className="h-[78vh] w-full"
                  title={preview.filename}
                />
              ) : (
                <div className="flex h-[40vh] items-center justify-center text-sm text-white/80">
                  Preview not available for this file type.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
