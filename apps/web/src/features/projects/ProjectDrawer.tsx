import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronRight,
  FolderKanban,
  Lock,
  Globe,
  Users,
  Sparkles,
  UserPlus,
  Mail,
  X,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  DrawerRoot,
  DrawerContent,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/Drawer';
import { Avatar } from '@/components/ui/Avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/utils/cn';
import { isRichTextEmpty } from '@/utils/richText';
import {
  type Project,
  type ProjectRole,
  type ProjectVisibility,
  type ProjectWorkflowType,
} from '@/types/project.types';

const COLOR_SWATCHES = [
  '#0ea5e9',
  '#10b981',
  '#f97316',
  '#ef4444',
  '#eab308',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0f172a',
];

const ICONS = ['rocket', 'layers', 'compass', 'bolt', 'gem', 'shield'];

const DEFAULT_WORKFLOW = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100, 'Max 100 characters'),
  description: z.string().max(3000, 'Max 3000 characters').optional(),
  icon: z.string().max(32).default('rocket'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']),
  workflowType: z.enum(['DEFAULT', 'CUSTOM']),
  workflowStatesText: z.string().max(200).optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof schema>;

export interface ProjectDrawerSubmitPayload {
  project: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    visibility?: ProjectVisibility;
    workflowType?: ProjectWorkflowType;
    workflowStates?: string[];
    status?: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
    startDate?: string;
    endDate?: string;
  };
  members: Array<{ userId: string; role: ProjectRole }>;
  invitations: Array<{ email: string; role: ProjectRole }>;
}

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ProjectDrawerSubmitPayload) => Promise<void> | void;
  project?: Project | null;
  isLoading?: boolean;
}

interface DraftMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
  role: ProjectRole;
}

interface DraftInvite {
  email: string;
  role: ProjectRole;
}

export function ProjectDrawer({ open, onClose, onSubmit, project, isLoading }: ProjectDrawerProps) {
  const { t } = useTranslation();
  const isEditing = !!project;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('MEMBER');
  const [selectedMembers, setSelectedMembers] = useState<DraftMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<DraftInvite[]>([]);

  const debouncedSearch = useDebounce(search, 250);
  const { data: users = [], isLoading: usersLoading } = useUsers(open && debouncedSearch.length > 0 ? debouncedSearch : undefined);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      icon: 'rocket',
      color: '#0ea5e9',
      visibility: 'PRIVATE',
      workflowType: 'DEFAULT',
      workflowStatesText: 'TODO, IN_PROGRESS, REVIEW, DONE',
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
    },
  });

  const selectedColor = watch('color');
  const selectedName = watch('name');
  const visibility = watch('visibility');
  const workflowType = watch('workflowType');
  const workflowStatesText = watch('workflowStatesText');
  const roleOptions = useMemo(
    () => [
      { value: 'OWNER' as const, label: t('project.roleOwner', { defaultValue: 'Owner' }) },
      { value: 'ADMIN' as const, label: t('project.roleAdmin', { defaultValue: 'Admin' }) },
      { value: 'MEMBER' as const, label: t('project.roleMember', { defaultValue: 'Member' }) },
      { value: 'VIEWER' as const, label: t('project.roleViewer', { defaultValue: 'Viewer' }) },
    ],
    [t],
  );

  const workflowStates = useMemo(() => {
    if (workflowType === 'DEFAULT') return DEFAULT_WORKFLOW;
    return (workflowStatesText || '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8);
  }, [workflowStatesText, workflowType]);

  const workflowPreviewColumns = useMemo(() => {
    const columns = workflowStates.length > 0 ? workflowStates : DEFAULT_WORKFLOW;
    return columns.map((state, index) => ({
      state,
      accent: COLOR_SWATCHES[index % COLOR_SWATCHES.length],
    }));
  }, [workflowStates]);

  useEffect(() => {
    if (!open) return;

    if (project) {
      reset({
        name: project.name,
        description: project.description ?? '',
        icon: project.icon ?? 'rocket',
        color: project.color ?? '#0ea5e9',
        visibility: project.visibility ?? 'PRIVATE',
        workflowType: project.workflowType ?? 'DEFAULT',
        workflowStatesText: (project.workflowStates ?? DEFAULT_WORKFLOW).join(', '),
        status: project.status,
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      });
      setSelectedMembers(
        project.members.map((member) => ({
          userId: member.userId,
          firstName: member.user?.firstName ?? '',
          lastName: member.user?.lastName ?? '',
          email: member.user?.email ?? '',
          avatar: member.user?.avatar ?? null,
          role: member.role,
        })),
      );
      setPendingInvites(
        (project.invitations ?? [])
          .filter((invitation) => invitation.status === 'PENDING')
          .map((invitation) => ({ email: invitation.email, role: invitation.role })),
      );
    } else {
      reset({
        name: '',
        description: '',
        icon: 'rocket',
        color: '#0ea5e9',
        visibility: 'PRIVATE',
        workflowType: 'DEFAULT',
        workflowStatesText: 'TODO, IN_PROGRESS, REVIEW, DONE',
        status: 'ACTIVE',
        startDate: '',
        endDate: '',
      });
      setSelectedMembers([]);
      setPendingInvites([]);
    }

    setSearch('');
    setInviteEmail('');
    setInviteRole('MEMBER');
    setStep(1);
  }, [open, project, reset]);

  const selectedMemberIds = new Set(selectedMembers.map((member) => member.userId));
  const candidateUsers = users.filter((user) => !selectedMemberIds.has(user.id));

  const addUserMember = (user: any) => {
    setSelectedMembers((prev) => [
      ...prev,
      {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        role: 'MEMBER',
      },
    ]);
    setSearch('');
  };

  const updateMemberRole = (userId: string, role: ProjectRole) => {
    setSelectedMembers((prev) => prev.map((member) => (member.userId === userId ? { ...member, role } : member)));
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((member) => member.userId !== userId));
  };

  const addInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (pendingInvites.some((invite) => invite.email === email)) return;
    setPendingInvites((prev) => [...prev, { email, role: inviteRole }]);
    setInviteEmail('');
    setInviteRole('MEMBER');
  };

  const removeInvite = (email: string) => {
    setPendingInvites((prev) => prev.filter((invite) => invite.email !== email));
  };

  const handleFormSubmit = async (data: ProjectFormData) => {
    const payload: ProjectDrawerSubmitPayload = {
      project: {
        name: data.name,
        description: isRichTextEmpty(data.description) ? undefined : data.description,
        icon: data.icon,
        color: data.color,
        visibility: data.visibility,
        workflowType: data.workflowType,
        workflowStates,
        status: data.status,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      },
      members: selectedMembers.map((member) => ({ userId: member.userId, role: member.role })),
      invitations: pendingInvites,
    };

    await onSubmit(payload);
  };

  const visibilityUI = {
    PRIVATE: { icon: Lock, label: t('project.visibilityPrivate', { defaultValue: 'Private' }) },
    TEAM: { icon: Users, label: t('project.visibilityTeam', { defaultValue: 'Team' }) },
    PUBLIC: { icon: Globe, label: t('project.visibilityPublic', { defaultValue: 'Public' }) },
  } as const;

  const StepIndicator = ({ value, label }: { value: 1 | 2 | 3; label: string }) => (
    <button
      type="button"
      onClick={() => setStep(value)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        step === value
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/40',
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[11px] font-bold">{value}</span>
      {label}
    </button>
  );

  return (
    <DrawerRoot open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent size="lg">
        <DrawerBody>
          <form id="project-form-v2" onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.9fr]">
            <section className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StepIndicator value={1} label={t('project.stepBasic', { defaultValue: 'Basic info' })} />
                  <StepIndicator value={2} label={t('project.stepWorkflow', { defaultValue: 'Workflow' })} />
                  <StepIndicator value={3} label={t('project.stepMembers', { defaultValue: 'Members' })} />
                </div>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      <Input
                        label={t('project.nameRequired', { defaultValue: 'Project name *' })}
                        placeholder={t('project.namePlaceholder', { defaultValue: 'Product redesign sprint' })}
                        error={errors.name?.message}
                        autoFocus
                        {...register('name')}
                      />

                      <Controller
                        name="description"
                        control={control}
                        render={({ field, fieldState }) => (
                          <RichTextEditor
                            label={t('task.description', { defaultValue: 'Description' })}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            placeholder={t('project.descriptionPlaceholder', { defaultValue: 'Describe goals, scope, timeline and blockers...' })}
                            error={fieldState.error?.message}
                            maxLength={3000}
                            minHeightClassName="min-h-[140px]"
                          />
                        )}
                      />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium">{t('project.icon', { defaultValue: 'Project icon' })}</label>
                          <div className="flex flex-wrap gap-2">
                            {ICONS.map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => setValue('icon', icon, { shouldValidate: true })}
                                className={cn(
                                  'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                                  watch('icon') === icon
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:border-primary/40',
                                )}
                              >
                                {t(`project.icon.${icon}` as any, { defaultValue: icon })}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">{t('project.visibility', { defaultValue: 'Visibility' })}</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(visibilityUI) as Array<keyof typeof visibilityUI>).map((key) => {
                              const OptIcon = visibilityUI[key].icon;
                              const active = visibility === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setValue('visibility', key)}
                                  className={cn(
                                    'rounded-xl border px-2 py-2 text-[11px] transition-colors',
                                    active
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted-foreground hover:border-primary/40',
                                  )}
                                >
                                  <OptIcon className="mx-auto mb-1 h-3.5 w-3.5" />
                                  {visibilityUI[key].label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">{t('project.color', { defaultValue: 'Color' })}</label>
                        <div className="flex items-center gap-2">
                          {COLOR_SWATCHES.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setValue('color', color, { shouldValidate: true })}
                              className="flex h-7 w-7 items-center justify-center rounded-full"
                              style={{ background: color }}
                            >
                              {selectedColor === color && <Check className="h-3.5 w-3.5 text-white" />}
                            </button>
                          ))}
                          <input
                            type="color"
                            value={selectedColor}
                            onChange={(event) => setValue('color', event.target.value, { shouldValidate: true })}
                            className="h-7 w-7 rounded-full border border-border"
                            aria-label="Custom color"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Input label={t('project.startDate', { defaultValue: 'Start date' })} type="date" {...register('startDate')} />
                        <Input label={t('project.endDate', { defaultValue: 'End date' })} type="date" {...register('endDate')} />
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" onClick={() => setStep(2)}>
                          {t('common.next', { defaultValue: 'Next' })}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step-2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4 max-w-xl">
                      <div>
                        <label className="mb-2 block text-sm font-medium">{t('project.workflowType', { defaultValue: 'Workflow type' })}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'DEFAULT', label: t('project.workflowDefault', { defaultValue: 'Default workflow' }) },
                            { value: 'CUSTOM', label: t('project.workflowCustom', { defaultValue: 'Custom workflow' }) },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setValue('workflowType', opt.value as ProjectWorkflowType)}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-sm transition-colors',
                                workflowType === opt.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:border-primary/40',
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {workflowType === 'CUSTOM' && (
                        <Input
                          label={t('project.workflowStates', { defaultValue: 'Workflow states (comma separated)' })}
                          placeholder="BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE"
                          {...register('workflowStatesText')}
                        />
                      )}

                      <div>
                        <p className="mb-2 text-sm font-medium max-w-[300px]">{t('project.kanbanPreview', { defaultValue: 'Kanban preview' })}</p>
                        <div className="grid min-h-[380px] grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 overflow-x-auto pb-2">
                          {workflowPreviewColumns.map(({ state, accent }, index) => (
                            <motion.div
                              key={state}
                              layout
                              className="flex min-h-[360px] flex-col rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{state}</p>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                    {t('project.columnLabel', { defaultValue: 'Column' })} {index + 1}
                                  </p>
                                </div>
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                              </div>

                              <div className="mt-3 flex flex-1 flex-col gap-2">
                                {[0, 1].map((cardIndex) => (
                                  <div key={`${state}-${cardIndex}`} className="rounded-xl border border-border/70 bg-background px-3 py-3 shadow-sm">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {cardIndex === 0 ? t('project.sampleTaskCard', { defaultValue: 'Design review' }) : t('project.sampleTaskCard2', { defaultValue: 'Align stakeholders' })}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                          {t('project.sampleCardDescription', { defaultValue: 'Design, review and ship the smallest valuable slice.' })}
                                        </p>
                                      </div>
                                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                                        {cardIndex === 0 ? t('project.sampleTaskTagA', { defaultValue: 'UI' }) : t('project.sampleTaskTagB', { defaultValue: 'Sync' })}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-primary/15" />
                                      <div className="h-2 w-16 rounded-full bg-muted" />
                                    </div>
                                  </div>
                                ))}
                                <div className="mt-auto rounded-xl border border-dashed border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
                                  {t('project.sampleCardFooter', { defaultValue: 'Live tasks preview' })}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                          {t('common.back', { defaultValue: 'Back' })}
                        </Button>
                        <Button type="button" onClick={() => setStep(3)}>
                          {t('common.next', { defaultValue: 'Next' })}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="step-3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                      <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="mb-2 text-sm font-semibold">{t('project.searchUsers', { defaultValue: 'Search users' })}</p>
                        <Input
                          placeholder={t('project.searchUsersPlaceholder', { defaultValue: 'Search by name or email...' })}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />

                        <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                          {usersLoading && <p className="text-xs text-muted-foreground">{t('common.loading', { defaultValue: 'Loading...' })}</p>}
                          {!usersLoading && debouncedSearch && candidateUsers.length === 0 && (
                            <p className="text-xs text-muted-foreground">{t('project.noUsersFound', { defaultValue: 'No users found' })}</p>
                          )}
                          {candidateUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => addUserMember(user)}
                              className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-left hover:border-primary/40"
                            >
                              <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{user.firstName} {user.lastName}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                              </div>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold">
                          {isEditing ? t('project.currentMembers', { defaultValue: 'Current members' }) : t('project.projectTeam', { defaultValue: 'Project team' })}
                        </p>
                        {isEditing && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {t('project.currentMembersHint', { defaultValue: 'Adjust roles for the current team or add new people below.' })}
                          </p>
                        )}
                        <AnimatePresence>
                          {selectedMembers.map((member) => (
                            <motion.div
                              key={member.userId}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-2 flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2"
                            >
                              <Avatar src={member.avatar} firstName={member.firstName} lastName={member.lastName} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{member.firstName} {member.lastName}</p>
                                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                              </div>
                              <select
                                aria-label={t('project.memberRole', { defaultValue: 'Member role' })}
                                value={member.role}
                                onChange={(event) => updateMemberRole(member.userId, event.target.value as ProjectRole)}
                                className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
                              >
                                {roleOptions.map((role) => (
                                  <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => removeMember(member.userId)} className="rounded-md p-1 hover:bg-destructive/10">
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {selectedMembers.length === 0 && (
                          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                            {t('project.noMembersSelected', { defaultValue: 'No members selected yet.' })}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="mb-2 text-sm font-semibold">{t('project.pendingInvitations', { defaultValue: 'Pending invitations' })}</p>
                        <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-2">
                          <Input
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder={t('project.inviteByEmail', { defaultValue: 'Invite by email...' })}
                            icon={<Mail className="h-4 w-4" />}
                          />
                          <select
                            value={inviteRole}
                            onChange={(event) => setInviteRole(event.target.value as ProjectRole)}
                            className="rounded-lg border border-border bg-card px-2 text-xs"
                          >
                            {roleOptions.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          <Button type="button" variant="outline" onClick={addInvite}>
                            {t('common.add', { defaultValue: 'Add' })}
                          </Button>
                        </div>

                        <div className="space-y-1">
                          {pendingInvites.map((invite) => (
                            <div key={invite.email} className="flex items-center justify-between rounded-lg border border-border/60 px-2 py-1.5 text-xs">
                              <span className="truncate">{invite.email}</span>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-border px-2 py-0.5">{invite.role}</span>
                                <button type="button" onClick={() => removeInvite(invite.email)} className="text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {pendingInvites.length === 0 && (
                            <p className="text-xs text-muted-foreground">{t('project.noPendingInvites', { defaultValue: 'No pending invitations' })}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => setStep(2)}>
                          {t('common.back', { defaultValue: 'Back' })}
                        </Button>
                        <Button type="submit" form="project-form-v2" isLoading={isLoading} disabled={!isValid && !isEditing}>
                          {isEditing
                            ? t('common.saveChanges', { defaultValue: 'Save changes' })
                            : t('project.createProject', { defaultValue: 'Create project' })}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <aside className="space-y-3">
              <div className="rounded-2xl border border-border/70 p-4" style={{ background: `linear-gradient(145deg, ${selectedColor}22, transparent)` }}>
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: selectedColor }}>
                  <FolderKanban className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-semibold">{selectedName || t('projects.newProject', { defaultValue: 'New project' })}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('project.liveSummary', { defaultValue: 'Live summary updates as you configure the project.' })}</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-sm">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t('project.summary', { defaultValue: 'Summary' })}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between"><span>{t('project.visibility', { defaultValue: 'Visibility' })}</span><span className="font-medium">{visibilityUI[visibility].label}</span></div>
                  <div className="flex items-center justify-between"><span>{t('project.workflow', { defaultValue: 'Workflow' })}</span><span className="font-medium">{workflowType === 'DEFAULT' ? t('project.workflowDefault', { defaultValue: 'Default workflow' }) : t('project.workflowCustom', { defaultValue: 'Custom workflow' })}</span></div>
                  <div className="flex items-center justify-between"><span>{t('project.workflowStatesLabel', { defaultValue: 'States' })}</span><span className="font-medium">{workflowStates.length}</span></div>
                  <div className="flex items-center justify-between"><span>{t('project.membersCount', { defaultValue: 'Members' })}</span><span className="font-medium">{selectedMembers.length}</span></div>
                  <div className="flex items-center justify-between"><span>{t('project.pendingInvitations', { defaultValue: 'Pending invitations' })}</span><span className="font-medium">{pendingInvites.length}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('project.creationSignals', { defaultValue: 'Creation signals' })}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />{t('project.signalRealtime', { defaultValue: 'Realtime project event' })}</li>
                  <li className="inline-flex items-center gap-2"><UserPlus className="h-3.5 w-3.5" />{t('project.signalActivityLog', { defaultValue: 'Activity log entries' })}</li>
                  <li className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{t('project.signalNotifications', { defaultValue: 'In-app + email notifications' })}</li>
                </ul>
              </div>
            </aside>
          </form>
        </DrawerBody>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
}
