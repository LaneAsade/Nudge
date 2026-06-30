export type TaskCategory = 'school' | 'work' | 'personal' | 'finance' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string; // ISO string
  estimatedEffort: number; // in hours
  category: TaskCategory;
  priorityScore: number; // calculated by AI, 0-100
  status: TaskStatus;
  subtasks: Subtask[];
  completedAt?: string; // ISO string when the task was completed
  goalId?: string; // Links a task to a long-term goal
  batchGroup?: string;
  priorityDelta?: { direction: 'up' | 'down' | 'none', old: number };
  googleTaskId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetDate: string; // ISO string
  milestones: Milestone[];
  progress: number; // 0-100
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completionLog: string[]; // dates of completion (YYYY-MM-DD)
}

export type ActionType = 'create_event' | 'send_reminder' | 'create_subtasks' | 'update_task_priority' | 'draft_email' | 'outline_doc' | 'calendar_conflict';
export type ActionStatus = 'proposed' | 'approved' | 'executed' | 'undone';

export interface AgentAction {
  id: string;
  userId: string;
  type: ActionType;
  payload: any;
  status: ActionStatus;
  timestamp: string; // ISO string
  description: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  description?: string;
  type: 'user' | 'ai-scheduled';
  taskId?: string; // reference to a task if scheduled by AI
  color?: string;
}

export interface ReasoningStep {
  perceive: string;
  plan: string;
  act: string;
}
