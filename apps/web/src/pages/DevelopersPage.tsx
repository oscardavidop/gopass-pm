import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BookOpen,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  ShieldAlert,
  Terminal,
  Trash2,
  Zap,
RefreshCw, Eye, CornerDownRight, Server, ShieldCheck, AlertCircle
} from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PremiumMultiSelect } from '@/components/ui/PremiumMultiSelect';
import {
  DEFAULT_DEVELOPER_SCOPES,
  DEFAULT_WEBHOOK_EVENTS,
  DEVELOPER_SCOPE_GROUPS,
  DEVELOPER_WEBHOOK_EVENT_GROUPS,
} from '@/features/developers/developers.constants';
import {
  useCreateDeveloperApiKey,
  useCreateDeveloperWebhook,
  useDeveloperApiKeys,
  useDeveloperDocs,
  useDeveloperLimits,
  useDeveloperRecentUsage,
  useDeveloperUsageSummary,
  useDeveloperWebhookDeliveries,
  useDeveloperWebhooks,
  useDisableDeveloperWebhook,
  useRevokeDeveloperApiKey,
} from '@/hooks/useDevelopers';


interface WebhookDelivery {
  id: string;
  event: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  responseCode: number | null;
  durationMs: number;
  retryCount: number;
  createdAt: string;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  requestPayload?: string; // Added to simulate fully loaded payloads
  requestHeaders?: string; // Added for authentic engineering depth
  responseBody: string | null;
  webhook: {
    name: string;
    url: string;
  };
}

export function DevelopersPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(DEFAULT_DEVELOPER_SCOPES);
  const [expiresAt, setExpiresAt] = useState('');
  const [oneTimeSecret, setOneTimeSecret] = useState('');
  const [apiSecretCopied, setApiSecretCopied] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(DEFAULT_WEBHOOK_EVENTS);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSecretCopied, setWebhookSecretCopied] = useState(false);

  const keys = useDeveloperApiKeys();
  const summary = useDeveloperUsageSummary();
  const usage = useDeveloperRecentUsage(20);
  const limits = useDeveloperLimits();
  const docs = useDeveloperDocs();
  const webhooks = useDeveloperWebhooks();
  const deliveries = useDeveloperWebhookDeliveries(12);

  const createKey = useCreateDeveloperApiKey();
  const revokeKey = useRevokeDeveloperApiKey();
  const createWebhook = useCreateDeveloperWebhook();
  const disableWebhook = useDisableDeveloperWebhook();

  const copyValue = async (value: string, onCopied: () => void) => {
    await navigator.clipboard.writeText(value);
    onCopied();
  };

  const onCreateKey = async () => {
    if (!name.trim()) {
      toast.error(t('developers.apiKey.nameRequired'));
      return;
    }

    const result = await createKey.mutateAsync({
      name: name.trim(),
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });

    setName('');
    setScopes(DEFAULT_DEVELOPER_SCOPES);
    setExpiresAt('');
    setOneTimeSecret(result.key);
    setApiSecretCopied(false);
  };

  const onCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.error(t('developers.webhook.formRequired'));
      return;
    }

    const result = await createWebhook.mutateAsync({
      name: webhookName.trim(),
      url: webhookUrl.trim(),
      events: webhookEvents,
    });

    setWebhookName('');
    setWebhookUrl('');
    setWebhookEvents(DEFAULT_WEBHOOK_EVENTS);
    setWebhookSecret(result.signingSecret ?? '');
    setWebhookSecretCopied(false);
  };

  return (
    <div className="space-y-6 page-enter pb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Terminal className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('developers.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('developers.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title={t('developers.metrics.todayRequests')} value={summary.data?.todayRequests ?? 0} icon={<Activity className="h-4 w-4 text-blue-500" />} iconBg="bg-blue-500/10" />
        <MetricCard title={t('developers.metrics.monthRequests')} value={summary.data?.monthRequests ?? 0} icon={<Globe className="h-4 w-4 text-emerald-500" />} iconBg="bg-emerald-500/10" />
        <MetricCard title={t('developers.metrics.failedRequests')} value={summary.data?.errorRequests ?? 0} icon={<ShieldAlert className="h-4 w-4 text-destructive" />} iconBg="bg-destructive/10" />
        <MetricCard title={t('developers.metrics.avgLatency')} value={`${summary.data?.averageResponseMs ?? 0}ms`} icon={<Zap className="h-4 w-4 text-amber-500" />} iconBg="bg-amber-500/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-primary" />
              {t('developers.apiKey.sectionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.apiKey.nameLabel')}</label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('developers.apiKey.namePlaceholder')} className="bg-background" />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.apiKey.scopesLabel')}</label>
                  <PremiumMultiSelect
                    values={scopes}
                    onChange={setScopes}
                    groups={DEVELOPER_SCOPE_GROUPS}
                    placeholder={t('developers.apiKey.scopesPlaceholder')}
                    searchPlaceholder={t('developers.searchScopes')}
                    emptyText={t('developers.noScopesFound')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.apiKey.expiresAtLabel')}</label>
                  <Input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="bg-background" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button loading={createKey.isPending} onClick={onCreateKey}>{t('developers.apiKey.generate')}</Button>
              </div>
            </div>

            {oneTimeSecret ? (
              <SecretPanel
                title={t('developers.apiKey.secretTitle')}
                description={t('developers.apiKey.secretBody')}
                value={oneTimeSecret}
                copied={apiSecretCopied}
                onCopy={() =>
                  void copyValue(oneTimeSecret, () => {
                    setApiSecretCopied(true);
                    toast.success(t('developers.copySuccess'));
                    window.setTimeout(() => setApiSecretCopied(false), 2000);
                  })
                }
              />
            ) : null}

            <div className="space-y-3">
              <h4 className="mb-2 text-sm font-medium text-foreground">{t('developers.apiKey.activeKeys')}</h4>
              {(keys.data ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 py-4 text-center text-sm text-muted-foreground">{t('developers.apiKey.empty')}</p>
              ) : (
                (keys.data ?? []).map((key) => {
                  const isRevoking = revokeKey.isPending && revokeKey.variables === key.id;
                  return (
                    <motion.div key={key.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="group flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:border-primary/30 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold text-foreground">{key.name}</p>
                          <Badge variant={key.status === 'ACTIVE' ? 'secondary' : 'destructive'} className="h-5 text-[10px] uppercase tracking-wider">{key.status}</Badge>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{key.keyPrefix}••••••••••••••••</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {key.scopes.map((scope) => (
                            <span key={scope} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{scope}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : t('developers.apiKey.neverUsed')}
                        </p>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => revokeKey.mutate(key.id)} disabled={key.status !== 'ACTIVE' || isRevoking}>
                          {isRevoking ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                          {t('developers.apiKey.revoke')}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4 text-purple-500" />
              {t('developers.docs.sectionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <InfoLine label={t('developers.docs.baseUrl')} value={docs.data?.baseUrl ?? '-'} />
            <InfoLine label={t('developers.docs.bearer')} value={docs.data?.auth.bearer ?? '-'} />
            <InfoLine label={t('developers.docs.header')} value={docs.data?.auth.apiKeyHeader ?? '-'} />
            <InfoLine label={t('developers.docs.rateLimit')} value={`${limits.data?.rateLimitPerHour ?? '-'} req / hour`} />
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-xs leading-relaxed text-blue-600 dark:text-blue-400">{t('developers.docs.authHint')}</p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => window.open(docs.data?.docsUrl ?? 'https://tasku.readme.io/', '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('developers.docs.openExternal')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-blue-500" />
              {t('developers.traffic.sectionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
              {(usage.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('developers.traffic.empty')}</p>
              ) : (
                (usage.data ?? []).map((entry) => {
                  const methodColors: Record<string, string> = {
                    GET: 'bg-emerald-500/10 text-emerald-500',
                    POST: 'bg-blue-500/10 text-blue-500',
                    PUT: 'bg-amber-500/10 text-amber-500',
                    DELETE: 'bg-destructive/10 text-destructive',
                  };
                  const methodColor = methodColors[entry.method] || 'bg-muted text-muted-foreground';
                  const isError = entry.statusCode >= 400;
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/5">
                      <div className="flex items-start gap-4">
                        <span className={`mt-0.5 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${methodColor}`}>{entry.method}</span>
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">{entry.endpoint}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{entry.apiKey.name}</span>
                            <span className="text-border">•</span>
                            <span className="font-mono">{entry.apiKey.keyPrefix}...</span>
                            <span className="text-border">•</span>
                            <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`text-xs font-bold ${isError ? 'text-destructive' : 'text-emerald-500'}`}>{entry.statusCode}</span>
                        <span className="text-[10px] text-muted-foreground">{entry.durationMs}ms</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Link2 className="h-4 w-4 text-rose-500" />
              {t('developers.webhook.sectionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.webhook.nameLabel')}</label>
                <Input value={webhookName} onChange={(event) => setWebhookName(event.target.value)} placeholder={t('developers.webhook.namePlaceholder')} />
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.webhook.urlLabel')}</label>
                <Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://api.example.com/webhooks/tasku" />
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-medium text-muted-foreground">{t('developers.webhook.eventsLabel')}</label>
                <PremiumMultiSelect
                  values={webhookEvents}
                  onChange={setWebhookEvents}
                  groups={DEVELOPER_WEBHOOK_EVENT_GROUPS}
                  placeholder={t('developers.webhook.eventsPlaceholder')}
                  searchPlaceholder={t('developers.searchEvents')}
                  emptyText={t('developers.noEventsFound')}
                />
              </div>
              <Button className="mt-2 w-full" loading={createWebhook.isPending} onClick={onCreateWebhook}>{t('developers.webhook.create')}</Button>
            </div>

            {webhookSecret ? (
              <SecretPanel
                title={t('developers.webhook.secretTitle')}
                description={t('developers.webhook.secretBody')}
                value={webhookSecret}
                copied={webhookSecretCopied}
                onCopy={() =>
                  void copyValue(webhookSecret, () => {
                    setWebhookSecretCopied(true);
                    toast.success(t('developers.webhook.secretCopied'));
                    window.setTimeout(() => setWebhookSecretCopied(false), 2000);
                  })
                }
              />
            ) : null}

            <div className="h-px w-full bg-border/50" />

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t('developers.webhook.configured')}</h4>
              {(webhooks.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('developers.webhook.empty')}</p>
              ) : (
                (webhooks.data ?? []).map((hook) => {
                  const isDisabling = disableWebhook.isPending && disableWebhook.variables === hook.id;
                  return (
                    <div key={hook.id} className="group relative rounded-xl border border-border/60 bg-muted/5 p-3 transition-colors hover:border-border">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{hook.name}</p>
                        <div className={`h-2 w-2 rounded-full ${hook.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} title={hook.status} />
                      </div>
                      <p className="mb-2 truncate font-mono text-xs text-muted-foreground">{hook.url}</p>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {hook.events.map((event) => (
                          <span key={event} className="rounded border border-border/50 bg-background px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{event}</span>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" className="h-8 w-full text-xs text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => disableWebhook.mutate(hook.id)} disabled={hook.status !== 'ACTIVE' || isDisabling}>
                        {isDisabling ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                        {t('developers.webhook.disable')}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <WebhookDeliveries deliveries={deliveries as any} t={t}  />
    </div>
  );
}

function MetricCard({ title, value, icon, iconBg }: { title: string; value: string | number; icon: React.ReactNode; iconBg: string }) {
  return (
    <Card className="border-border/50 shadow-sm transition-all hover:border-primary/20">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function SecretPanel({ title, description, value, copied, onCopy }: { title: string; description: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="w-full">
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-500">{title}</p>
          <p className="mb-3 mt-1 text-xs text-amber-600/80 dark:text-amber-500/80">{description}</p>
          <div className="flex gap-2">
            <Input value={value} readOnly className="border-amber-500/30 bg-background font-mono text-sm" />
            <Button variant="outline" className="w-24 shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 dark:text-amber-500" onClick={onCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <code className="block break-all rounded-lg bg-muted/30 px-3 py-2 text-xs font-mono text-foreground">{value}</code>
    </div>
  );
}
 function WebhookDeliveries({ deliveries, t }: { deliveries: { data?: WebhookDelivery[] }, t: any }) {
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Helper styling based on HTTP Status Codes
  const getStatusColor = (code: number | null, status: string) => {
    if (status === 'SUCCESS' || (code && code >= 200 && code < 300)) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (code && code >= 400 && code < 500) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <>
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t('developers.deliveries.sectionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(deliveries.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 stroke-[1.5] mb-2" />
              <p className="text-sm text-muted-foreground">{t('developers.deliveries.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {(deliveries.data ?? []).map((delivery) => {
                const isSuccess = delivery.status === 'SUCCESS';
                return (
                  <div 
                    key={delivery.id} 
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/5"
                  >
                    {/* Log Main Metadata */}
                    <div className="space-y-1.5 min-w-0 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${getStatusColor(delivery.responseCode, delivery.status)}`}>
                          {delivery.responseCode ?? 'ERR'}
                        </span>
                        <p className="text-sm font-semibold text-foreground tracking-tight">{delivery.event}</p>
                        <span className="text-xs text-muted-foreground/80">•</span>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {delivery.webhook.name}
                        </span>
                      </div>
                      
                      {/* URL Destination */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono truncate">
                        <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        <span className="truncate">{delivery.webhook.url}</span>
                      </div>

                      {/* Performance Indicators & Metrics */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {delivery.durationMs ?? 0}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> {delivery.retryCount} {delivery.retryCount === 1 ? 'retry' : 'retries'}
                        </span>
                        <span>
                          {new Date(delivery.lastAttemptAt ?? delivery.createdAt).toLocaleTimeString()}
                        </span>
                        {delivery.nextRetryAt && (
                          <span className="text-amber-600 dark:text-amber-500 font-medium bg-amber-500/5 px-1.5 py-0.2 rounded border border-amber-500/10">
                            Next retry: {new Date(delivery.nextRetryAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Inspector Button */}
                    <div className="flex items-center justify-end shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1.5 text-xs font-medium border-border/80 hover:bg-muted"
                        onClick={() => setSelectedDelivery(delivery)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect logs
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- View Details Modal (Shadcn Dialog) --- */}
      <Dialog open={!!selectedDelivery} onClose={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-3xl sm:max-w-2xl h-[85vh] sm:h-auto flex flex-col p-0 overflow-hidden gap-0">
          {selectedDelivery && (
            <>
              {/* Header Context Banner */}
              <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/10">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`rounded-md border px-2..5 py-0.5 font-mono text-xs font-bold ${getStatusColor(selectedDelivery.responseCode, selectedDelivery.status)}`}>
                    {selectedDelivery.responseCode ?? 'FAILED'}
                  </span>
                  <DialogTitle className="text-base font-semibold">{selectedDelivery.event}</DialogTitle>
                </div>
                <DialogDescription className="font-mono text-xs break-all pt-1 bg-background/50 border rounded-lg p-2 mt-2">
                  ID: {selectedDelivery.id}
                </DialogDescription>
              </DialogHeader>

              {/* Tabs Container */}
              <Tabs defaultValue="response" className="flex-1 flex flex-col">
                <div className="px-6 border-b border-border/50 bg-muted/5">
                  <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-4">
                    <TabsTrigger value="response" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-10 text-xs font-medium shadow-none">
                      Response Body
                    </TabsTrigger>
                    <TabsTrigger value="payload" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-10 text-xs font-medium shadow-none">
                      Request Payload
                    </TabsTrigger>
                    <TabsTrigger value="metadata" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 h-10 text-xs font-medium shadow-none">
                      Metadata Details
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab: Response Body */}
                <TabsContent value="response" className="flex-1 p-6 m-0 overflow-y-auto min-h-[300px]">
                  <div className="relative group rounded-xl border border-border/60 bg-muted/30 p-4 font-mono text-xs">
                    <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" variant="ghost" className="h-7 w-7 p-0 bg-background/80 shadow-sm"
                        onClick={() => handleCopy(selectedDelivery.responseBody || '', 'res')}
                      >
                        {copiedSection === 'res' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    {selectedDelivery.responseBody ? (
                      <pre className="overflow-x-auto text-foreground whitespace-pre-wrap">{selectedDelivery.responseBody}</pre>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground py-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground/70" />
                        <span>{t('developers.deliveries.noResponseBody')}</span>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Request Payload */}
                <TabsContent value="payload" className="flex-1 p-6 m-0 overflow-y-auto min-h-[300px]">
                  <div className="relative group rounded-xl border border-border/60 bg-muted/30 p-4 font-mono text-xs">
                    <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" variant="ghost" className="h-7 w-7 p-0 bg-background/80 shadow-sm"
                        onClick={() => handleCopy(selectedDelivery.requestPayload || '{\n  "event": "' + selectedDelivery.event + '",\n  "status": "triggered"\n}', 'req')}
                      >
                        {copiedSection === 'req' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto text-foreground whitespace-pre-wrap">
                      {selectedDelivery.requestPayload ?? JSON.stringify({ id: selectedDelivery.id, event: selectedDelivery.event, timestamp: selectedDelivery.createdAt }, null, 2)}
                    </pre>
                  </div>
                </TabsContent>

                {/* Tab: Metadata / Debugging Metrics */}
                <TabsContent value="metadata" className="flex-1 p-6 m-0 overflow-y-auto min-h-[300px] space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Server className="h-3 w-3" /> Endpoint Config
                      </p>
                      <p className="text-xs font-semibold text-foreground truncate">{selectedDelivery.webhook.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{selectedDelivery.webhook.url}</p>
                    </div>

                    <div className="rounded-lg border border-border/60 p-3 bg-muted/10">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="h-3 w-3" /> Diagnostics
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block">Latency:</span>
                          <span className="font-semibold text-foreground">{selectedDelivery.durationMs}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Retries Sent:</span>
                          <span className="font-semibold text-foreground">{selectedDelivery.retryCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Operational Timeline */}
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-4 space-y-2.5 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Execution Timestamps</p>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Created At</span>
                      <span className="font-medium">{new Date(selectedDelivery.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Last Delivery Attempt</span>
                      <span className="font-medium">{selectedDelivery.lastAttemptAt ? new Date(selectedDelivery.lastAttemptAt).toLocaleString() : '-'}</span>
                    </div>
                    {selectedDelivery.nextRetryAt && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-500 font-medium">
                        <span>Scheduled Auto-Retry</span>
                        <span>{new Date(selectedDelivery.nextRetryAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Modal Footer Controls */}
              <div className="border-t border-border/50 bg-muted/20 p-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedDelivery(null)}>
                  Close view
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}