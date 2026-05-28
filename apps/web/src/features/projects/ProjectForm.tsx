import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { type Project } from '@/types/project.types';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color'),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof schema>;

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  project?: Project | null;
  isLoading?: boolean;
}

export function ProjectForm({ open, onClose, onSubmit, project, isLoading }: ProjectFormProps) {
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(schema),
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

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description ?? '',
        color: project.color ?? '#6366f1',
        status: project.status as any,
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      });
    } else {
      reset({ name: '', description: '', color: '#6366f1', status: 'ACTIVE', startDate: '', endDate: '' });
    }
  }, [project, reset, open]);

  const handleFormSubmit = (data: ProjectFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Project name"
          placeholder="My awesome project"
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
            placeholder="What's this project about?"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium mb-2">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setValue('color', c)}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  background: c,
                  borderColor: selectedColor === c ? 'hsl(var(--foreground))' : 'transparent',
                }}
              />
            ))}
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setValue('color', e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border border-input"
              title="Custom color"
            />
          </div>
        </div>

        {/* Status */}
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                {...field}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" {...register('startDate')} />
          <Input label="End date" type="date" {...register('endDate')} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
