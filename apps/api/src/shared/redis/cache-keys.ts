export const CACHE_KEY_PREFIX = 'tasku';

function key(...parts: Array<string | number | undefined | null>) {
    return [CACHE_KEY_PREFIX, ...parts.filter((part) => part !== undefined && part !== null && String(part).length > 0)]
        .join(':');
}

export class CacheKeys {
    static user(id: string) { return key('user', id); }
    static userPublic(id: string) { return key('user', id, 'public'); }
    static userPreferences(id: string) { return key('user', id, 'preferences'); }
    static userSettings(id: string) { return key('settings', id); }
    static userPermissions(id: string) { return key('user', id, 'permissions'); }

    static project(id: string) { return key('project', id); }
    static projectMembers(id: string) { return key('project', id, 'members'); }
    static projectStats(id: string) { return key('project', id, 'stats'); }
    static projectActivity(id: string, limit: number) { return key('project', id, 'activity', limit); }
    static projectTasks(id: string, hash: string) { return key('project', id, 'tasks', hash); }
    static projectOverview(id: string) { return key('project', id, 'overview'); }

    static task(id: string) { return key('task', id); }
    static taskActivity(id: string, limit: number) { return key('task', id, 'activity', limit); }
    static taskSubtasks(id: string) { return key('task', id, 'subtasks'); }
    static taskAssignees(id: string) { return key('task', id, 'assignees'); }
    static taskAttachments(id: string) { return key('task', id, 'attachments'); }

    static dashboardOverview(userId: string, role: string) { return key('dashboard', userId, role, 'overview'); }
    static dashboardMetrics(userId: string, role: string) { return key('dashboard', userId, role, 'metrics'); }
    static dashboardActivity(userId: string, role: string, limit: number) { return key('dashboard', userId, role, 'activity', limit); }
    static dashboardTimeline(userId: string, role: string) { return key('dashboard', userId, role, 'timeline'); }

    static activity(userId: string, role: string, limit: number) { return key('activity', userId, role, limit); }
    static notificationUnread(userId: string) { return key('notification', userId, 'unread'); }
    static notificationRecent(userId: string, limit: number) { return key('notification', userId, 'recent', limit); }

    static apiKey(hash: string) { return key('apikey', hash); }
    static apiKeyPermissions(hash: string) { return key('apikey', hash, 'permissions'); }
    static apiKeyOwner(hash: string) { return key('apikey', hash, 'owner'); }

    static session(id: string) { return key('session', id); }
    static userSessions(userId: string) { return key('session', 'user', userId); }
    static oauthProfile(provider: string, accountId: string) { return key('oauth', provider, accountId); }

    static fileMetadata(fileId: string) { return key('file', fileId, 'metadata'); }
    static fileOwnership(fileId: string) { return key('file', fileId, 'ownership'); }
    static filePermissions(fileId: string) { return key('file', fileId, 'permissions'); }

    static searchProjects(queryHash: string, userId: string) { return key('search', userId, 'projects', queryHash, userId); }
    static searchUsers(queryHash: string) { return key('search', 'users', queryHash); }

    static presenceOnline(userId: string) { return key('presence', 'online', userId); }
    static presenceProjectMember(projectId: string, userId: string) { return key('presence', 'project', projectId, userId); }
    static presenceTask(projectId: string, taskId: string, userId: string) { return key('presence', 'task', projectId, taskId, userId); }

    static metric(name: string) { return key('metrics', name); }
}
