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
    set((state) => ({
      taskPresenceByProject: {
        ...state.taskPresenceByProject,
        [projectId]: {
          ...(state.taskPresenceByProject[projectId] ?? {}),
          [taskId]: { viewing, editing },
        },
      },
    }));
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
