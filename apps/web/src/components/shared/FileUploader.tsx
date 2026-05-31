import { useMemo, useRef, useState } from 'react';
import { UploadCloud, XCircle, RefreshCw, CheckCircle2, Image as ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { resolveApiAssetUrl } from '@/utils/url';

type QueueStatus = 'queued' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  progress: number;
  status: QueueStatus;
  error?: string;
  preview?: string;
}

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
}

export function FileUploader({ accept, multiple = true, disabled, onUpload }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const pending = useMemo(() => queue.some((q) => q.status === 'uploading'), [queue]);

  const enqueue = (files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      progress: 0,
      status: 'queued' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setQueue((prev) => [...prev, ...next]);
    next.forEach((item) => void processItem(item.id, item.file));
  };

  const processItem = async (id: string, file: File) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'uploading', error: undefined } : item)));

    try {
      await onUpload(file, (pct) => {
        setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, progress: pct } : item)));
      });
      setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'done', progress: 100 } : item)));
    } catch (error: any) {
      setQueue((prev) => prev.map((item) => (
        item.id === id
          ? { ...item, status: 'error', error: error?.message || 'Upload failed' }
          : item
      )));
    }
  };

  const retry = (item: QueueItem) => void processItem(item.id, item.file);

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed p-5 transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-background/40'} ${disabled ? 'opacity-60' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          if (e.dataTransfer.files?.length) enqueue(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            if (!e.target.files?.length) return;
            enqueue(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            onClick={() => inputRef.current?.click()}
          >
            Select files
          </Button>
        </div>

        {dragging && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary bg-primary/10" />
        )}
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/70 bg-background/70 p-2.5">
              <div className="flex items-center gap-2">
                {item.preview ? (
                  <img src={resolveApiAssetUrl(item.preview)} alt={item.file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{item.file.name}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>

                {item.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {item.status === 'error' && (
                  <button type="button" onClick={() => retry(item)} className="text-destructive" title="Retry upload">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                {item.status === 'queued' && <XCircle className="h-4 w-4 text-muted-foreground" />}
              </div>
              {item.error && <p className="mt-1 text-[11px] text-destructive">{item.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
