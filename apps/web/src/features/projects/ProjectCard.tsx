import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Users,
  CheckSquare,
  Calendar,
  Trash2,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectIdentityAvatar } from '@/components/shared/ProjectIdentityAvatar';
import { formatDate } from '@/utils/formatters';
import { stripRichText } from '@/utils/richText';
import { cn } from '@/utils/cn';
import { type Project } from '@/types/project.types';
import { useTranslation } from 'react-i18next';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'default',
  ARCHIVED: 'secondary',
};

interface ProjectCardProps {
  project: Project;
  doneTasks?: number;
  view?: 'grid' | 'list';
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

function ProjectMenu({ project, onEdit, onDelete }: Pick<ProjectCardProps, 'project' | 'onEdit' | 'onDelete'>) {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center justify-center h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[160px] z-50 animate-scale-in"
          sideOffset={4}
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-accent outline-none rounded-md mx-1 transition-colors"
              onSelect={() => onEdit(project)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> {t('project.edit', { defaultValue: 'Edit project' })}
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-accent outline-none rounded-md mx-1 transition-colors"
            onSelect={() => {}}
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> {t('project.open', { defaultValue: 'Open project' })}
          </DropdownMenu.Item>
          {onDelete && (
            <>
              <DropdownMenu.Separator className="my-1.5 border-t border-border mx-2" />
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-destructive/10 text-destructive outline-none rounded-md mx-1 transition-colors"
                onSelect={() => onDelete(project)}
              >
                <Trash2 className="h-3.5 w-3.5" /> {t('project.deleteAction', { defaultValue: 'Delete project' })}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ProjectCard({ project, doneTasks = 0, view = 'grid', onEdit, onDelete }: ProjectCardProps) {
  const { t } = useTranslation();
  const totalTasks = project._count?.tasks ?? 0;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const color = project.color ?? '#6366f1';
  const iconUrl = project.branding?.iconUrl ?? null;
  const descriptionPreview = stripRichText(project.description ?? '');
  const statusLabel: Record<string, string> = {
    ACTIVE: t('project.status.active'),
    ON_HOLD: t('project.status.onHold'),
    COMPLETED: t('project.status.completed'),
    ARCHIVED: t('project.status.archived'),
  };

  if (view === 'list') {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} layout>
        <div className="group premium-panel flex items-center gap-4 px-4 py-3.5 hover:-translate-y-[1px] transition-all duration-200">
          <ProjectIdentityAvatar name={project.name} color={color} iconUrl={iconUrl} size="sm" />
          <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate hover:text-primary transition-colors">{project.name}</p>
            {descriptionPreview && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{descriptionPreview}</p>
            )}
          </Link>
          <div className="hidden sm:flex items-center gap-2 w-36 shrink-0">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: color }} />
            </div>
            <span className="text-xs text-muted-foreground w-6 text-right">{progress}%</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" />{totalTasks}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project._count?.members ?? 0}</span>
            {project.endDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(project.endDate)}</span>}
          </div>
          <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="hidden sm:inline-flex shrink-0">
            {statusLabel[project.status]}
          </Badge>
          {project.owner && (
            <Avatar src={project.owner.avatar} firstName={project.owner.firstName} lastName={project.owner.lastName} size="xs" className="shrink-0" />
          )}
          <ProjectMenu project={project} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
      <div className="group premium-panel overflow-hidden transition-all duration-200 flex flex-col hover:-translate-y-[2px] hover:shadow-lg">
        <div className="h-1.5 shrink-0" style={{ background: `linear-gradient(90deg, ${color}, ${color}66)` }} />
        <div className="h-16 px-4 pt-3 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5">{t('project.workspaceProject', { defaultValue: 'Workspace Project' })}</span>
            <span>{t('project.collaboratorsCount', { defaultValue: '{{count}} collaborators', count: project._count?.members ?? 0 })}</span>
          </div>
          <div className="mt-2">
            <ProjectIdentityAvatar name={project.name} color={color} iconUrl={iconUrl} size="sm" />
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/projects/${project.id}`} className="flex-1 min-w-0 group/link">
              <h3 className="font-semibold text-foreground truncate group-hover/link:text-primary transition-colors text-sm">
                {project.name}
              </h3>
              {descriptionPreview ? (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                  {descriptionPreview}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{t('project.noDescriptionYet', { defaultValue: 'No description added yet.' })}</p>
              )}
            </Link>
            <ProjectMenu project={project} onEdit={onEdit} onDelete={onDelete} />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground border border-border/60 rounded-lg px-2.5 py-2 bg-background/50">
            <span className="flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" />{t('project.tasksCount', { defaultValue: '{{count}} tasks', count: totalTasks })}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{project._count?.members ?? 0}</span>
            {project.endDate && (
              <span className="flex items-center gap-1 ml-auto"><Calendar className="h-3.5 w-3.5" />{formatDate(project.endDate)}</span>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('project.progress', { defaultValue: 'Progress' })}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <Badge variant={STATUS_VARIANT[project.status] ?? 'default'}>{statusLabel[project.status]}</Badge>
            {project.owner && (
              <Avatar src={project.owner.avatar} firstName={project.owner.firstName} lastName={project.owner.lastName} size="sm" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
