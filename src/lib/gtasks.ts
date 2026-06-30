import { Task as AppTask } from '../types';

export const gtasksService = {
  async getPrimaryTaskList(accessToken: string): Promise<string | null> {
    const url = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.items?.[0]?.id || null;
  },

  async listTasks(accessToken: string, taskListId: string): Promise<any[]> {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  },

  async createTask(accessToken: string, taskListId: string, task: AppTask): Promise<string | null> {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;
    const payload = {
      title: task.title,
      notes: task.description || '',
      due: task.deadline ? new Date(task.deadline).toISOString() : undefined,
      status: task.status === 'completed' ? 'completed' : 'needsAction',
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.id;
  },

  async updateTask(accessToken: string, taskListId: string, googleTaskId: string, task: AppTask): Promise<boolean> {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`;
    const payload = {
      id: googleTaskId,
      title: task.title,
      notes: task.description || '',
      due: task.deadline ? new Date(task.deadline).toISOString() : undefined,
      status: task.status === 'completed' ? 'completed' : 'needsAction',
    };
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  },

  async deleteTask(accessToken: string, taskListId: string, googleTaskId: string): Promise<boolean> {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  }
};
