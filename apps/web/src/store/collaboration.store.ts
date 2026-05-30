import { create } from 'zustand';
import type { CollaborationUser, TaskHighlight, TaskPresenceState } from '@/types/collaboration.types';

interface CollaborationState {
  projectPresenceById: Record<string, CollaborationUser[]>;
  taskPresenceByProject: Record<string, Record<string, TaskPresenceState>>;
  taskHighlights: Record<string, TaskHighlight>;
  setProjectPresence: (projectId: string, users: CollaborationUser[]) => void;
  setTaskPresence: (payload: {
    projectId: string;
    taskId: string;
    viewing: CollaborationUser[];
    editing: Array<{ user: CollaborationUser; field?: string }>;
  }) => void;
  pushTaskHighlight: (highlight: Omit<TaskHighlight, 'expiresAt'>, ttlMs?: number) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  projectPresenceById: {},
  taskPresenceByProject: {},
  taskHighlights: {},

  setProjectPresence: (projectId, users) => {
    set((state) => ({
      projectPresenceById: {
        ...state.projectPresenceById,
        [projectId]: users,
      },
    }));
  },

  setTaskPresence: ({ projectId, taskId, viewing, editing }) => {
    set((state) => {
      const previous = state.taskPresenceByProject[projectId]?.[taskId];
      const sameViewing =
        (previous?.viewing?.length ?? 0) === viewing.length &&
        (previous?.viewing ?? []).every((user, index) => user.id === viewing[index]?.id);
      const sameEditing =
        (previous?.editing?.length ?? 0) === editing.length &&
        (previous?.editing ?? []).every((entry, index) => (
          entry.user.id === editing[index]?.user?.id && entry.field === editing[index]?.field
        ));

      if (sameViewing && sameEditing) return state;

      return {
        taskPresenceByProject: {
          ...state.taskPresenceByProject,
          [projectId]: {
            ...(state.taskPresenceByProject[projectId] ?? {}),
            [taskId]: { viewing, editing },
          },
        },
      };
    });
  },

  pushTaskHighlight: (highlight, ttlMs = 6000) => {
    const expiresAt = Date.now() + ttlMs;
    set((state) => ({
      taskHighlights: {
        ...state.taskHighlights,
        [highlight.taskId]: {
          ...highlight,
          expiresAt,
        },
      },
    }));

    setTimeout(() => {
      set((state) => {
        const current = state.taskHighlights[highlight.taskId];
        if (!current || current.expiresAt !== expiresAt) return state;
        const { [highlight.taskId]: _removed, ...rest } = state.taskHighlights;
        return { taskHighlights: rest };
      });
    }, ttlMs + 50);
  },
}));
