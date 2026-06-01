import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, BookOpen, KeyRound, Link2, ShieldAlert, 
  Trash2, Copy, Check, Terminal, Clock, Globe, Zap 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  useCreateDeveloperApiKey,
  useCreateDeveloperWebhook,
  useDeveloperApiKeys,
  useDeveloperDocs,
  useDeveloperLimits,
  useDeveloperRecentUsage,
  useDeveloperUsageSummary,
  useDeveloperWebhooks,
  useDisableDeveloperWebhook,
  useRevokeDeveloperApiKey,
} from '@/hooks/useDevelopers';

const DEFAULT_SCOPES = ['projects:read', 'tasks:read'];

export function DevelopersPage() {
  // --- State ---
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('projects:read,tasks:read');
  const [expiresAt, setExpiresAt] = useState('');
  const [oneTimeSecret, setOneTimeSecret] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('task.created,task.updated');

  // --- Hooks ---
  const keys = useDeveloperApiKeys();
  const summary = useDeveloperUsageSummary();
  const usage = useDeveloperRecentUsage(20);
  const limits = useDeveloperLimits();
  const docs = useDeveloperDocs();
  const webhooks = useDeveloperWebhooks();

  const createKey = useCreateDeveloperApiKey();
  const revokeKey = useRevokeDeveloperApiKey();
  const createWebhook = useCreateDeveloperWebhook();
  const disableWebhook = useDisableDeveloperWebhook();

  // --- Memos & Handlers ---
  const parsedScopes = useMemo(() => {
    const source = scopes.trim() ? scopes : DEFAULT_SCOPES.join(',');
    return source
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }, [scopes]);

  const onCreateKey = async () => {
    if (!name.trim()) {
      toast.error('Key name is required');
      return;
    }

    const result = await createKey.mutateAsync({
      name: name.trim(),
      scopes: parsedScopes,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });

    setName('');
    setExpiresAt('');
    setOneTimeSecret(result.key);
    setIsCopied(false);
  };

  const onCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.error('Webhook name and URL are required');
      return;
    }

    await createWebhook.mutateAsync({
      name: webhookName.trim(),
      url: webhookUrl.trim(),
      events: webhookEvents
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    setWebhookName('');
    setWebhookUrl('');
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(oneTimeSecret);
    setIsCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 page-enter pb-10">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 sm:p-10 shadow-sm">
        {/* Subtle background glow effect */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
            <Terminal className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Developer Portal</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Manage secure API keys, configure granular scopes, monitor real-time usage analytics, 
            and set up webhooks seamlessly using our existing endpoints.
          </p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Today's Requests" value={summary.data?.todayRequests ?? 0} icon={<Activity className="h-4 w-4 text-blue-500" />} iconBg="bg-blue-500/10" />
        <MetricCard title="This Month" value={summary.data?.monthRequests ?? 0} icon={<Globe className="h-4 w-4 text-emerald-500" />} iconBg="bg-emerald-500/10" />
        <MetricCard title="Failed Requests" value={summary.data?.errorRequests ?? 0} icon={<ShieldAlert className="h-4 w-4 text-destructive" />} iconBg="bg-destructive/10" />
        <MetricCard title="Avg Latency" value={`${summary.data?.averageResponseMs ?? 0}ms`} icon={<Zap className="h-4 w-4 text-amber-500" />} iconBg="bg-amber-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: API Keys (Spans 2 columns) */}
        <Card className="lg:col-span-2 overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-primary" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Create Key Form */}
            <div className="rounded-xl border border-border/60 bg-muted/5 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Key Name</label>
                  <Input placeholder="e.g. Production Key" value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Scopes (comma separated)</label>
                  <Input placeholder="projects:read, tasks:read" value={scopes} onChange={(e) => setScopes(e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground ml-1">Expiration (Optional)</label>
                  <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bg-background" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button loading={createKey.isPending} onClick={onCreateKey}>Generate API Key</Button>
              </div>
            </div>

            {/* One-Time Secret Alert */}
            {oneTimeSecret && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-500">Save your secret key</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1 mb-3">
                      Please copy this key and save it somewhere secure. For security reasons, you will not be able to view it again.
                    </p>
                    <div className="flex gap-2">
                      <Input value={oneTimeSecret} readOnly className="bg-background font-mono text-sm border-amber-500/30" />
                      <Button variant="outline" onClick={handleCopySecret} className="shrink-0 border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-500 w-24">
                        {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Active Keys List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground mb-2">Active Keys</h4>
              {(keys.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/60 rounded-xl">No API keys generated yet.</p>
              ) : (
                (keys.data ?? []).map((key) => (
                  <motion.div
                    key={key.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/60 bg-background p-4 transition-all hover:border-primary/30 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-foreground">{key.name}</p>
                        <Badge variant={key.status === 'ACTIVE' ? 'secondary' : 'destructive'} className="text-[10px] uppercase tracking-wider h-5">
                          {key.status}
                        </Badge>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{key.keyPrefix}••••••••••••••••</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {key.scopes.map(scope => (
                          <span key={scope} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never used'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                        onClick={() => revokeKey.mutate(key.id)}
                        disabled={key.status !== 'ACTIVE'}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Revoke
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Documentation */}
        <Card className="h-fit overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4 text-purple-500" />
              API Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <InfoLine label="Base URL" value={docs.data?.baseUrl ?? '-'} />
            <InfoLine label="Bearer Auth" value={docs.data?.auth.bearer ?? '-'} />
            <InfoLine label="Header Auth" value={docs.data?.auth.apiKeyHeader ?? '-'} />
            <InfoLine label="Rate Limit" value={`${limits.data?.rateLimitPerHour ?? '-'} req / hour`} />
            
            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                <strong className="font-semibold">Authentication:</strong> Supported via <code className="bg-blue-500/10 px-1 py-0.5 rounded">Authorization ApiKey</code> and <code className="bg-blue-500/10 px-1 py-0.5 rounded">X-API-Key</code> headers. Fallback to standard Bearer token is also natively supported.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: API Traffic Logs */}
        <Card className="lg:col-span-2 overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-blue-500" />
              Recent API Traffic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {(usage.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No API key traffic recorded yet.</p>
              ) : (
                (usage.data ?? []).map((entry) => {
                  // Determine Method Color
                  const methodColors: Record<string, string> = {
                    GET: 'text-emerald-500 bg-emerald-500/10',
                    POST: 'text-blue-500 bg-blue-500/10',
                    PUT: 'text-amber-500 bg-amber-500/10',
                    DELETE: 'text-destructive bg-destructive/10',
                  };
                  const mColor = methodColors[entry.method] || 'text-muted-foreground bg-muted';
                  const isError = entry.statusCode >= 400;

                  return (
                    <div key={entry.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/5">
                      <div className="flex items-start gap-4">
                        <span className={`mt-0.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${mColor}`}>
                          {entry.method}
                        </span>
                        <div>
                          <p className="text-sm font-medium font-mono text-foreground">{entry.endpoint}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{entry.apiKey.name}</span>
                            <span className="text-border">•</span>
                            <span className="font-mono">{entry.apiKey.keyPrefix}...</span>
                            <span className="text-border">•</span>
                            <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs font-bold ${isError ? 'text-destructive' : 'text-emerald-500'}`}>
                          {entry.statusCode}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{entry.durationMs}ms</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Webhooks */}
        <Card className="h-fit overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Link2 className="h-4 w-4 text-rose-500" />
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            {/* Create Webhook Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Name</label>
                <Input placeholder="e.g. Task Sync" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Payload URL</label>
                <Input placeholder="https://api.example.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Events to send</label>
                <Input placeholder="task.created, task.updated" value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} />
              </div>
              <Button className="w-full mt-2" loading={createWebhook.isPending} onClick={onCreateWebhook}>Add Webhook</Button>
            </div>

            <div className="h-px w-full bg-border/50" />

            {/* Active Webhooks List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Configured Webhooks</h4>
              {(webhooks.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No webhooks configured.</p>
              ) : (
                (webhooks.data ?? []).map((hook) => (
                  <div key={hook.id} className="group relative rounded-xl border border-border/60 bg-muted/5 p-3 transition-colors hover:border-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">{hook.name}</p>
                      <div className={`h-2 w-2 rounded-full ${hook.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} title={hook.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground font-mono mb-2">{hook.url}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hook.events.map(ev => (
                        <span key={ev} className="rounded bg-background border border-border/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {ev}
                        </span>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                      onClick={() => disableWebhook.mutate(hook.id)}
                      disabled={hook.status !== 'ACTIVE'}
                    >
                      Disable Webhook
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, icon, iconBg }: { title: string; value: string | number; icon: React.ReactNode, iconBg: string }) {
  return (
    <Card className="border-border/50 shadow-sm transition-all hover:border-primary/20">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <code className="block rounded-lg bg-muted/30 px-3 py-2 text-xs font-mono text-foreground break-all">
        {value}
      </code>
    </div>
  );
}