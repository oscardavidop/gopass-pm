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
          className="flex items-center justify-center h-8 w-8 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border/40 shrink-0 outline-none focus-visible:opacity-100 focus-visible:bg-muted"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1.5 min-w-[170px] z-50 animate-in fade-in-50 zoom-in-95 duration-150"
          sideOffset={6}
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted/80 outline-none rounded-lg mx-1.5 transition-colors text-foreground"
            onSelect={() => {}}
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/80" /> {t('project.open', { defaultValue: 'Open project' })}
          </DropdownMenu.Item>
          {onEdit && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted/80 outline-none rounded-lg mx-1.5 transition-colors text-foreground"
              onSelect={() => onEdit(project)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground/80" /> {t('project.edit', { defaultValue: 'Edit project' })}
            </DropdownMenu.Item>
          )}
          {onDelete && (
            <>
              <DropdownMenu.Separator className="my-1 border-t border-border/40 mx-2" />
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer hover:bg-destructive/10 text-destructive outline-none rounded-lg mx-1.5 transition-colors"
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

  // ==========================================
  // VISTA: LISTA (LIST VIEW)
  // ==========================================
  if (view === 'list') {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} layout  layoutId={`project-${project.id}`}>
        <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card px-4 py-3 flex items-center gap-4 transition-all duration-300 will-change-transform hover:shadow-md hover:border-border/80">
          {/* Sutil acento de color a la izquierda para identificar el proyecto */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] opacity-80" style={{ backgroundColor: color }} />
          
          <div className="shrink-0 pl-1">
            <ProjectIdentityAvatar name={project.name} color={color} iconUrl={iconUrl} size="sm" />
          </div>
          
          <Link to={`/projects/${project.id}`} className="flex-1 min-w-0 group/title">
            <p className="text-sm font-semibold truncate text-foreground group-hover/title:text-primary transition-colors">{project.name}</p>
            {descriptionPreview && (
              <p className="text-xs text-muted-foreground/80 truncate mt-0.5 max-w-xl">{descriptionPreview}</p>
            )}
          </Link>
          
          {/* Barra de Progreso Compacta */}
          <div className="hidden sm:flex items-center gap-3 w-40 shrink-0">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: color }} />
            </div>
            <span className="text-[11px] font-mono font-medium text-muted-foreground/90 w-7 text-right">{progress}%</span>
          </div>
          
          {/* Métricas */}
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-muted-foreground/70 shrink-0">
            <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5 text-muted-foreground/50" />{totalTasks}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground/50" />{project._count?.members ?? 0}</span>
            {project.endDate && (
              <span className="flex items-center gap-1.5 border-l border-border/40 pl-4">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />{formatDate(project.endDate)}
              </span>
            )}
          </div>
          
          <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="hidden sm:inline-flex shrink-0 shadow-sm font-medium">
            {statusLabel[project.status]}
          </Badge>
          
          {project.owner && (
            <div className="shrink-0 border border-background rounded-full shadow-sm">
              <Avatar src={project.owner.avatar} firstName={project.owner.firstName} lastName={project.owner.lastName} size="xs" />
            </div>
          )}
          
          <ProjectMenu project={project} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </motion.div>
    );
  }

  // ==========================================
  // VISTA: CUADRÍCULA (GRID VIEW)
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout layoutId={`project-${project.id}`}>
      <div className="group relative rounded-xl border border-border/50 bg-card/40 hover:bg-card/90 overflow-hidden transition-all duration-300 flex flex-col h-full hover:-translate-y-[2px] hover:shadow-xl hover:border-border/90 will-change-transform">
        
        {/* Barra superior con gradiente de color del proyecto */}
        <div className="h-[3px] w-full shrink-0" style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }} />
        
        {/* Cabecera / Sección Contextual */}
        <div className="px-4 pt-3 flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase">
          <span className="rounded-md border border-border/40 bg-background/60 px-2 py-0.5">{t('project.workspaceProject', { defaultValue: 'Workspace Project' })}</span>
          <span>{t('project.collaboratorsCount', { defaultValue: '{{count}} collaborators', count: project._count?.members ?? 0 })}</span>
        </div>

        {/* Cuerpo Principal de la Tarjeta */}
        <div className="p-4 flex-1 flex flex-col justify-between gap-4">
          
          {/* Identidad Visual e Información Base */}
          <div className="flex items-start gap-3 relative">
            <div className="shrink-0 mt-0.5">
              <ProjectIdentityAvatar name={project.name} color={color} iconUrl={iconUrl} size="sm" />
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <Link to={`/projects/${project.id}`} className="group/link block">
                <h3 className="font-bold text-foreground truncate group-hover/link:text-primary transition-colors text-sm tracking-tight">
                  {project.name}
                </h3>
              </Link>
              {descriptionPreview ? (
                <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2 leading-relaxed font-normal">
                  {descriptionPreview}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/40 italic mt-1 font-normal">{t('project.noDescriptionYet', { defaultValue: 'No description added yet.' })}</p>
              )}
            </div>

            {/* Menú de acciones flotando correctamente a la derecha */}
            <div className="absolute right-0 top-0">
              <ProjectMenu project={project} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>

          {/* Grilla Semántica de Contadores */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground/80 rounded-xl px-3 py-2 bg-muted/40 border border-border/20">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground/50" />
              {totalTasks} {t('project.tasks', { defaultValue: 'tasks' })}
            </span>
            {project.endDate && (
              <span className="flex items-center gap-1.5 justify-end border-l border-border/30 pl-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                {formatDate(project.endDate)}
              </span>
            )}
          </div>

          {/* Estado de Progreso de Tareas */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground/90">{t('project.progress', { defaultValue: 'Progress' })}</span>
              <span className="font-mono text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          </div>

          {/* Pie de Tarjeta */}
          <div className="flex items-center justify-between pt-2 border-t border-border/10">
            <Badge variant={STATUS_VARIANT[project.status] ?? 'default'} className="font-medium tracking-wide shadow-sm">
              {statusLabel[project.status]}
            </Badge>
            {project.owner && (
              <div className="border border-background rounded-full shadow-sm">
                <Avatar src={project.owner.avatar} firstName={project.owner.firstName} lastName={project.owner.lastName} size="sm" />
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}