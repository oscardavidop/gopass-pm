import { useMemo, useState } from 'react';
import { Search, Download, File as FileIcon, Trash2, UserCircle2 } from 'lucide-react';

import { useAuthStore } from '@/store/auth.store';
import { useDeleteFile, useEntityFiles, useUploadFile } from '@/hooks/useUploads';
import { resolveApiAssetUrl } from '@/utils/url';
import { Button } from '@/components/ui/Button';
import { FileUploader } from '@/components/shared/FileUploader';

interface ProjectFilesHubProps {
  projectId: string;
}

type FilesFilter = 'all' | 'images' | 'documents' | 'uploads' | 'mine';

export function ProjectFilesHub({ projectId }: ProjectFilesHubProps) {
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilesFilter>('all');

  const filesQuery = useEntityFiles('PROJECT', projectId);
  const upload = useUploadFile('PROJECT', projectId);
  const remove = useDeleteFile('PROJECT', projectId);

  const allFiles = filesQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFiles.filter((file) => {
      const bySearch = !q || file.filename.toLowerCase().includes(q) || file.mimeType.toLowerCase().includes(q);
      if (!bySearch) return false;

      if (filter === 'images') return file.mimeType.startsWith('image/');
      if (filter === 'documents') return file.mimeType === 'application/pdf' || file.mimeType.includes('word') || file.mimeType.includes('text') || file.mimeType.includes('excel');
      if (filter === 'uploads') return (file.kind || 'attachment') === 'attachment';
      if (filter === 'mine') return !!currentUser?.id && file.uploadedBy === currentUser.id;
      return true;
    });
  }, [allFiles, search, filter, currentUser?.id]);

  const imageFiles = filtered.filter((file) => file.mimeType.startsWith('image/'));
  const docFiles = filtered.filter((file) => !file.mimeType.startsWith('image/'));
  const recent = [...allFiles].slice(0, 6);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files"
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([
                ['all', 'All'],
                ['images', 'Images'],
                ['documents', 'Documents'],
                ['uploads', 'Uploads'],
                ['mine', 'My uploads'],
              ] as Array<[FilesFilter, string]>).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Project Files</h3>
          <FileUploader
            accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
            multiple
            disabled={upload.isPending}
            onUpload={(file, onProgress) => upload.mutateAsync({ file, kind: 'attachment', onProgress }).then(() => undefined)}
          />
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-6 text-center">
            <p className="text-sm font-semibold">No project files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Upload specifications, designs, documents or images.</p>
          </div>
        )}

        {imageFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Images</h4>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {imageFiles.map((file) => {
                const signed = resolveApiAssetUrl(file.signedUrl || file.url);
                return (
                  <div key={file.id} className="overflow-hidden rounded-xl border border-border/70 bg-card/50">
                    <a href={signed} target="_blank" rel="noreferrer">
                      <img src={signed} alt={file.filename} className="h-32 w-full object-cover" />
                    </a>
                    <div className="space-y-1 p-2">
                      <p className="truncate text-xs font-medium">{file.filename}</p>
                      <div className="flex items-center justify-between">
                        <a href={signed} target="_blank" rel="noreferrer">
                          <Button type="button" variant="ghost" size="icon-sm">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove.mutate(file.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {docFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents & attachments</h4>
            <div className="space-y-2">
              {docFiles.map((file) => {
                const signed = resolveApiAssetUrl(file.signedUrl || file.url);
                return (
                  <div key={file.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">{file.mimeType}</p>
                    </div>
                    <a href={signed} target="_blank" rel="noreferrer">
                      <Button type="button" variant="ghost" size="icon-sm">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove.mutate(file.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
          <h3 className="text-sm font-semibold">Recent Files</h3>
          <div className="mt-2 space-y-2">
            {recent.length === 0 && <p className="text-xs text-muted-foreground">No recent files yet.</p>}
            {recent.map((file) => (
              <a
                key={file.id}
                href={resolveApiAssetUrl(file.signedUrl || file.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 hover:bg-accent"
              >
                <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate text-xs">{file.filename}</span>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
