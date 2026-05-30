/**
 * ProjectDrawer — premium side drawer for creating/editing projects.
 * Features a live color preview header, gradient swatch grid, and inline validations.
 */
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Calendar, FolderKanban, Check } from 'lucide-react';
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
import { cn } from '@/utils/cn';
import { isRichTextEmpty } from '@/utils/richText';
import { type Project } from '@/types/project.types';

const COLOR_SWATCHES = [
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Violet', hex: '#8b5cf6' },
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Cyan', hex: '#06b6d4' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Lime', hex: '#84cc16' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Pink', hex: '#ec4899' },
  { label: 'Slate', hex: '#64748b' },
  { label: 'Stone', hex: '#78716c' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', key: 'project.status.active', fallback: 'Active', dot: 'bg-emerald-400' },
  { value: 'ON_HOLD', key: 'project.status.onHold', fallback: 'On hold', dot: 'bg-amber-400' },
  { value: 'COMPLETED', key: 'project.status.completed', fallback: 'Completed', dot: 'bg-blue-400' },
  { value: 'ARCHIVED', key: 'project.status.archived', fallback: 'Archived', dot: 'bg-slate-400' },
] as const;

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100, 'Max 100 characters'),
  description: z.string().max(3000, 'Max 3000 characters').optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color'),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof schema>;

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void> | void;
  project?: Project | null;
  isLoading?: boolean;
}

export function ProjectDrawer({ open, onClose, onSubmit, project, isLoading }: ProjectDrawerProps) {
  const { t } = useTranslation();
  const isEditing = !!project;

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
      color: '#6366f1',
      status: 'ACTIVE',
      startDate: '',
      endDate: '',
    },
  });

  const selectedColor = watch('color');
  const projectName = watch('name');
  const selectedStatus = watch('status');

  const statusInfo = useMemo(
    () => STATUS_OPTIONS.find((s) => s.value === selectedStatus) ?? STATUS_OPTIONS[0],
    [selectedStatus],
  );

  useEffect(() => {
    if (open) {
      if (project) {
        reset({
          name: project.name,
          description: project.description ?? '',
          color: project.color ?? '#6366f1',
          status: project.status as ProjectFormData['status'],
          startDate: project.startDate ? project.startDate.slice(0, 10) : '',
          endDate: project.endDate ? project.endDate.slice(0, 10) : '',
        });
      } else {
        reset({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', startDate: '', endDate: '' });
      }
    }
  }, [project, reset, open]);

  const handleFormSubmit = async (data: ProjectFormData) => {
    await onSubmit({
      ...data,
      description: isRichTextEmpty(data.description) ? undefined : data.description,
    });
  };

  return (
    <DrawerRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent size="md">
        <motion.div
          className="h-20 relative shrink-0 overflow-hidden"
          animate={{ background: `linear-gradient(135deg, ${selectedColor}cc, ${selectedColor}44)` }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 opacity-20 bg-grid" />
          <div className="absolute inset-0 flex items-end gap-3 px-6 pb-4">
            <div className="h-10 w-10 rounded-xl shadow-lg flex items-center justify-center" style={{ background: selectedColor }}>
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="max-w-[220px] truncate text-sm font-semibold leading-tight text-white">
                {projectName || (isEditing ? project?.name : t('projects.newProject', { defaultValue: 'New project' }))}
              </p>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                {t(statusInfo.key, { defaultValue: statusInfo.fallback })}
              </span>
            </div>
          </div>
        </motion.div>

        <DrawerBody>
          <form id="project-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            <Input
              label={t('project.nameRequired', { defaultValue: 'Project name *' })}
              placeholder={t('project.namePlaceholder', { defaultValue: 'e.g. Marketing Campaign Q4' })}
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
                  placeholder={t('project.descriptionPlaceholder', { defaultValue: 'Describe goals, scope, dependencies and delivery notes...' })}
                  error={fieldState.error?.message}
                  maxLength={3000}
                  minHeightClassName="min-h-[150px]"
                />
              )}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">{t('project.color', { defaultValue: 'Color' })}</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    type="button"
                    key={swatch.hex}
                    title={swatch.label}
                    onClick={() => setValue('color', swatch.hex, { shouldValidate: true })}
                    className={cn('flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 hover:scale-110')}
                    style={{ background: swatch.hex }}
                  >
                    {selectedColor === swatch.hex && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </button>
                ))}
                <div className="relative h-7 w-7">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                    className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                    title={t('project.customColor', { defaultValue: 'Custom color' })}
                  />
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary"
                    style={{ background: COLOR_SWATCHES.every((s) => s.hex !== selectedColor) ? selectedColor : 'transparent' }}
                  >
                    {COLOR_SWATCHES.every((s) => s.hex !== selectedColor) ? '' : '+'}
                  </div>
                </div>
              </div>
            </div>

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">{t('task.status', { defaultValue: 'Status' })}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                          field.value === opt.value
                            ? 'border-primary bg-primary/5 font-medium text-primary'
                            : 'border-border text-muted-foreground hover:border-border/70 hover:bg-accent',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full', opt.dot)} />
                        {t(opt.key, { defaultValue: opt.fallback })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {t('project.timeline', { defaultValue: 'Timeline' })}
                <span className="font-normal text-muted-foreground">({t('common.optional', { defaultValue: 'optional' })})</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('project.startDate', { defaultValue: 'Start date' })} type="date" {...register('startDate')} />
                <Input label={t('project.endDate', { defaultValue: 'End date' })} type="date" {...register('endDate')} />
              </div>
            </div>
          </form>
        </DrawerBody>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" form="project-form" isLoading={isLoading} disabled={!isValid && !isEditing}>
            {isEditing ? t('common.saveChanges', { defaultValue: 'Save changes' }) : t('projects.newProject', { defaultValue: 'New project' })}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
}
