import { Task, Goal, Habit } from './types';

const now = new Date();

export const SEED_TASKS: Task[] = [
  {
    id: 't1',
    userId: 'demo',
    title: 'Submit CS3200 final project',
    description: 'Final algorithm implementations for graph algorithms. Must pass all test cases.',
    deadline: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 3,
    category: 'school',
    priorityScore: 92,
    status: 'pending',
    subtasks: []
  },
  {
    id: 't2',
    userId: 'demo',
    title: 'Reply to internship recruiter email',
    description: 'Confirm interview availability for next week.',
    deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 0.5,
    category: 'work',
    priorityScore: 85,
    status: 'pending',
    subtasks: []
  },
  {
    id: 't3',
    userId: 'demo',
    title: 'Pay rent',
    description: 'Transfer funds via portal before late fee.',
    deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 0.5,
    category: 'finance',
    priorityScore: 78,
    status: 'pending',
    subtasks: []
  },
  {
    id: 't4',
    userId: 'demo',
    title: 'Prepare for group presentation',
    description: 'Slide deck review with the team.',
    deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 2,
    category: 'school',
    priorityScore: 65,
    status: 'pending',
    subtasks: []
  },
  {
    id: 't5',
    userId: 'demo',
    title: 'Gym Session: Push Day',
    description: 'Chest, shoulders, triceps.',
    deadline: new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 1.5,
    category: 'personal',
    priorityScore: 50,
    status: 'pending',
    subtasks: []
  },
  {
    id: 't6',
    userId: 'demo',
    title: 'Weekly grocery run',
    description: 'Milk, eggs, bread, coffee.',
    deadline: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
    estimatedEffort: 1,
    category: 'personal',
    priorityScore: 60,
    status: 'pending',
    subtasks: []
  },
  // Add 15 completed tasks spread over the last 7 days to simulate a real trend chart
  ...Array.from({ length: 15 }).map((_, i) => {
    const compDate = new Date();
    // To make it look like: Sun:3, Mon:5, Tue:4, Wed:7, Thu:6, Fri:2, Sat:0
    // We will just scatter them randomly across the last 7 days
    const daysAgo = i % 7; 
    compDate.setDate(now.getDate() - daysAgo);
    return {
      id: `task_comp_${i}`,
      userId: 'demo',
      title: `Completed Task ${i + 1}`,
      description: 'Previously finished task',
      deadline: compDate.toISOString(),
      estimatedEffort: 0.5,
      category: i % 2 === 0 ? 'work' : 'personal' as any,
      priorityScore: 50,
      status: 'completed' as const,
      completedAt: compDate.toISOString(),
      subtasks: []
    };
  })
];

export const SEED_GOALS: Goal[] = [
  {
    id: 'g1',
    userId: 'demo',
    title: 'Graduate with distinction',
    targetDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 70,
    milestones: []
  },
  {
    id: 'g2',
    userId: 'demo',
    title: 'Launch side project MVP',
    targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 40,
    milestones: []
  }
];

export const SEED_HABITS: Habit[] = [
  {
    id: 'h1',
    userId: 'demo',
    title: 'Morning review',
    frequency: 'daily',
    streak: 12,
    completionLog: [now.toISOString().split('T')[0]]
  },
  {
    id: 'h2',
    userId: 'demo',
    title: 'No phone before 9am',
    frequency: 'daily',
    streak: 4,
    completionLog: [now.toISOString().split('T')[0]]
  },
  {
    id: 'h3',
    userId: 'demo',
    title: 'Evening shutdown ritual',
    frequency: 'daily',
    streak: 7,
    completionLog: [now.toISOString().split('T')[0]]
  }
];
