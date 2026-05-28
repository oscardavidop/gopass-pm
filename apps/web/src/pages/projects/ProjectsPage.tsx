import { useState, useCallback } from 'react';
import { Plus, Search, LayoutGrid, List, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { ProjectDrawer } from '@/features/projects/ProjectDrawer';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';
import { type Project, type ProjectStatus } from '@/types/project.types';

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useProjects({ search: debouncedSearch || undefined, status: statusFilter || undefined });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const projects = data?.items ?? [];

  const handleCreate = useCallback(
    async (formData: any) => {
      await createProject.mutateAsync(formData);
      setDrawerOpen(false);
    },
    [createProject],
  );

  const handleEdit = useCallback(
    async (formData: any) => {
      if (!editingProject) return;
      await updateProject.mutateAsync({ id: editingProject.id, data: formData });
      setEditingProject(null);
      setDrawerOpen(false);
    },
    [editingProject, updateProject],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingProject) return;
    await deleteProject.mutateAsync(deletingProject.id);
    setDeletingProject(null);
  }, [deletingProject, deleteProject]);

  const openEdit = useCallback((project: Project) => {
    setEditingProject(project);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingProject(null);
  }, []);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3.5 w-24 inline-block" />
            ) : (
              `${data?.meta.total ?? 0} project${(data?.meta.total ?? 0) !== 1 ? 's' : ''}`
            )}
          </p>
        </div>
        <Button onClick={() => { setEditingProject(null); setDrawerOpen(true); }} size="sm">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
          className={cn(
            'px-3 py-2 rounded-lg border border-input bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'w-full sm:w-38 transition-colors hover:border-ring/50',
          )}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-input rounded-lg overflow-hidden bg-background shrink-0">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'px-3 py-2 transition-colors',
              view === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground',
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-3 py-2 border-l border-input transition-colors',
              view === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground',
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
          {Array.from({ length: view === 'grid' ? 6 : 5 }).map((_, i) => (
            view === 'grid' ? (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <div className="h-1.5 bg-muted" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-1.5 w-full rounded-full mt-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border border-border rounded-xl">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            )
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-10 w-10 text-muted-foreground/50" />}
          title={debouncedSearch ? 'No matching projects' : 'No projects yet'}
          description={
            debouncedSearch
              ? `No projects found for "${debouncedSearch}". Try a different search.`
              : 'Create your first project to start managing tasks and collaboration.'
          }
          action={
            !debouncedSearch ? (
              <Button onClick={() => setDrawerOpen(true)} size="sm">
                <Plus className="h-4 w-4" />
                Create your first project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-2'
            }
          >
            {projects.map((project: Project) => (
              <ProjectCard
                key={project.id}
                project={project}
                view={view}
                onEdit={openEdit}
                onDelete={(p) => setDeletingProject(p)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Project drawer */}
      <ProjectDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onSubmit={editingProject ? handleEdit : handleCreate}
        project={editingProject}
        isLoading={createProject.isPending || updateProject.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
        title="Delete project"
        description={`"${deletingProject?.name}" and all its tasks will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete project"
        isLoading={deleteProject.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

