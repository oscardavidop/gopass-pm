/**
 * ProjectDrawer — premium side drawer for creating/editing projects.
 * Features a live color preview header, gradient swatch grid, and inline validations.
 */
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Sparkles, FolderKanban, Calendar, Tag, Check } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { isRichTextEmpty } from '@/utils/richText';
import { type Project } from '@/types/project.types';

const COLOR_SWATCHES = [
  { label: 'Indigo',  hex: '#6366f1' },
  { label: 'Violet',  hex: '#8b5cf6' },
  { label: 'Blue',    hex: '#3b82f6' },
  { label: 'Cyan',    hex: '#06b6d4' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Lime',    hex: '#84cc16' },
  { label: 'Amber',   hex: '#f59e0b' },
  { label: 'Orange',  hex: '#f97316' },
  { label: 'Rose',    hex: '#f43f5e' },
  { label: 'Pink',    hex: '#ec4899' },
  { label: 'Slate',   hex: '#64748b' },
  { label: 'Stone',   hex: '#78716c' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Active',    dot: 'bg-emerald-400' },
  { value: 'ON_HOLD',   label: 'On hold',   dot: 'bg-amber-400' },
  { value: 'COMPLETED', label: 'Completed', dot: 'bg-blue-400' },
  { value: 'ARCHIVED',  label: 'Archived',  dot: 'bg-slate-400' },
];

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
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
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
        {/* Color preview header */}
        <motion.div
          className="h-20 shrink-0 relative overflow-hidden"
          animate={{ background: `linear-gradient(135deg, ${selectedColor}cc, ${selectedColor}44)` }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 opacity-20 bg-grid" />
          <div className="absolute inset-0 flex items-end px-6 pb-4 gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: selectedColor }}
            >
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight truncate max-w-[220px]">
                {projectName || (isEditing ? project?.name : 'New project')}
              </p>
              <span className={cn(
                'inline-flex items-center gap-1 text-white/80 text-xs font-medium mt-0.5',
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full bg-white/80')} />
                {statusInfo.label}
              </span>
            </div>
          </div>
        </motion.div>

        {/* <DrawerHeader className="border-t-0 pt-4">
          <DrawerTitle>
            {isEditing ? 'Edit project' : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                New project
              </span>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {isEditing
              ? 'Update your project details below.'
              : 'Fill in the details to create a new project.'}
          </DrawerDescription>
        </DrawerHeader> */}

        <DrawerBody>
          <form id="project-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            {/* Name */}
            <Input
              label="Project name *"
              placeholder="e.g. Marketing Campaign Q4"
              error={errors.name?.message}
              autoFocus
              {...register('name')}
            />

            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <RichTextEditor
                  label="Description"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Describe goals, scope, dependencies and delivery notes..."
                  error={fieldState.error?.message}
                  maxLength={3000}
                  minHeightClassName="min-h-[150px]"
                />
              )}
            />

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    type="button"
                    key={swatch.hex}
                    title={swatch.label}
                    onClick={() => setValue('color', swatch.hex, { shouldValidate: true })}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all duration-150 hover:scale-110',
                      'flex items-center justify-center',
                    )}
                    style={{ background: swatch.hex }}
                  >
                    {selectedColor === swatch.hex && (
                      <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}
                <div className="relative w-7 h-7">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                    className="absolute inset-0 w-full h-full rounded-full cursor-pointer opacity-0"
                    title="Custom color"
                  />
                  <div
                    className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground text-xs hover:border-primary transition-colors"
                    style={{ background: COLOR_SWATCHES.every((s) => s.hex !== selectedColor) ? selectedColor : 'transparent' }}
                  >
                    {COLOR_SWATCHES.every((s) => s.hex !== selectedColor) ? '' : '+'}
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                          field.value === opt.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border hover:border-border/70 hover:bg-accent text-muted-foreground',
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', opt.dot)} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            {/* Dates */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-2 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Timeline
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start date" type="date" {...register('startDate')} />
                <Input label="End date" type="date" {...register('endDate')} />
              </div>
            </div>
          </form>
        </DrawerBody>

        <DrawerFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="project-form"
            isLoading={isLoading}
            disabled={!isValid && !isEditing}
          >
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
}
