import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { authService } from '@/services/auth.service';

export function EmailPreviewsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const previews = useQuery({
    queryKey: ['email-previews'],
    queryFn: () => authService.listEmailPreviews(50),
  });

  const selected = useQuery({
    queryKey: ['email-preview', selectedId],
    queryFn: () => authService.getEmailPreview(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold tracking-tight">Email previews</h1>
        <p className="text-sm text-muted-foreground mt-1">Local mode preview when SEND_REAL_EMAIL=false</p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-3 space-y-2 max-h-[75vh] overflow-y-auto">
            {(previews.data ?? []).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${selectedId === item.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}
              >
                <p className="text-xs text-muted-foreground">{item.kind}</p>
                <p className="text-sm font-medium truncate">{item.subject}</p>
                <p className="text-xs text-muted-foreground truncate">{item.to}</p>
              </button>
            ))}
            {previews.isLoading && <p className="text-sm text-muted-foreground">Loading previews...</p>}
            {!previews.isLoading && (previews.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No previews yet.</p>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden min-h-[75vh]">
            {selected.data ? (
              <iframe
                title="email-preview"
                className="w-full h-[75vh]"
                srcDoc={selected.data.html}
              />
            ) : (
              <div className="h-[75vh] flex items-center justify-center text-sm text-muted-foreground">
                Select an email preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
