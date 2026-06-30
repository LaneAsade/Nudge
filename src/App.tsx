import { useState, useEffect, useCallback, useMemo } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { initAuth, googleSignIn, logout, saveTask, updateTaskFields, deleteTask, saveGoal, deleteGoal, saveHabit, deleteHabit, saveAgentAction, updateAgentActionStatus, getTasksCollection, getGoalsCollection, getHabitsCollection, getAgentActionsCollection, updateMyLeaderboardStats } from './lib/firebase';
import { gcalService } from './lib/gcal';
import { gtasksService } from './lib/gtasks';
import { Task, Goal, Habit, AgentAction, CalendarEvent, ReasoningStep } from './types';
import { TasksWidget } from './components/TasksWidget';
import { useProactiveReminders } from './hooks/useProactiveReminders';
import { HabitsGoalsWidget } from './components/HabitsGoalsWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { AgentConsole } from './components/AgentConsole';
import { FilesWidget } from './components/FilesWidget';
import { LandingPage } from './LandingPage';
import { Leaderboard } from './components/Leaderboard';
import { Logo } from './components/Logo';
import { LayoutDashboard, CheckSquare, Trophy, FileText, Bell, Search, Filter, ChevronDown, LogOut, Zap, Shield } from 'lucide-react';
import { SEED_TASKS, SEED_GOALS, SEED_HABITS } from './seedData';

let persistentTasks = [...SEED_TASKS];
let persistentGoals = [...SEED_GOALS];
let persistentHabits = [...SEED_HABITS];

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState<any | null>({ uid: 'demo' });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'natural');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'leaderboard' | 'files'>('dashboard');

  // Core App data states
  const [tasks, setTasks] = useState<Task[]>(persistentTasks);
  const [goals, setGoals] = useState<Goal[]>(persistentGoals);
  const [habits, setHabits] = useState<Habit[]>(persistentHabits);

  useEffect(() => { persistentTasks = tasks; }, [tasks]);
  useEffect(() => { persistentGoals = goals; }, [goals]);
  useEffect(() => { persistentHabits = habits; }, [habits]);
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Proactive reminders background service
  useProactiveReminders(tasks, (task) => {
    showToast(`NUDGE: "${task.title}" is due soon. Stay focused!`);
  });

  const hasUrgentTask = tasks.some(t => {
    if (t.status === 'completed' || !t.deadline) return false;
    const msRem = new Date(t.deadline).getTime() - new Date().getTime();
    return msRem > 0 && msRem <= 3 * 60 * 60 * 1000;
  });

  const [isFocusMode, setIsFocusMode] = useState(false);

  // Agent interface states
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isBatching, setIsBatching] = useState(false);
  const [reasoning, setReasoning] = useState<ReasoningStep>({
    perceive: 'Monitoring schedule gaps, streaking, and tasks list...',
    plan: 'Ready to prioritize tasks or schedule calendar blocks.',
    act: 'Standing by for action commands.',
  });
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent'; text: string; timestamp: Date; inlineActions?: { label: string; actionType: string }[] }[]>([
    {
      sender: 'agent',
      text: "Hello! I am Nudge, your AI productivity agent. I don't just remind you about deadlines — I help you beat them. Ask me to rank your tasks, block focus times on your calendar, break tasks down, or draft emails to clear obstacles!",
      timestamp: new Date(),
    },
  ]);

  // Auth setup on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to Firestore updates when user changes
  useEffect(() => {
    if (!user) return;

    if (user.uid === 'demo') {
      // Trigger initial agent scan for demo
      setTimeout(() => {
        handleSendMessage("I just opened the app. What should I focus on right now? Give me a quick summary.");
      }, 1500);
      return;
    }

    // Listen tasks
    const unsubTasks = onSnapshot(getTasksCollection(user.uid), (snap) => {
      const items: Task[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(items);
    });

    // Listen goals
    const unsubGoals = onSnapshot(getGoalsCollection(user.uid), (snap) => {
      const items: Goal[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Goal);
      });
      setGoals(items);
    });

    // Listen habits
    const unsubHabits = onSnapshot(getHabitsCollection(user.uid), (snap) => {
      const items: Habit[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Habit);
      });
      setHabits(items);
    });

    // Listen agent actions
    const unsubActions = onSnapshot(getAgentActionsCollection(user.uid), (snap) => {
      const items: AgentAction[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as AgentAction);
      });
      setAgentActions(items);
    });

    return () => {
      unsubTasks();
      unsubGoals();
      unsubHabits();
      unsubActions();
    };
  }, [user]);

  // Sync Google Calendar events
  const [calendarOffline, setCalendarOffline] = useState(false);
  const [calendarReconnecting, setCalendarReconnecting] = useState(false);

  const loadCalendarEvents = useCallback(async (retryCount = 0) => {
    if (!accessToken || accessToken === 'mock_token_for_demo') return;
    try {
      if (retryCount > 0) setCalendarReconnecting(true);

      const now = new Date();
      const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();
      const todayEnd   = new Date(now.setHours(23,59,59,0)).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
        `?timeMin=${todayStart}&timeMax=${todayEnd}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!res.ok) {
        if (res.status === 401) {
          setNeedsAuth(true);
          setCalendarOffline(false);
          setCalendarReconnecting(false);
          return;
        }
        throw new Error('Failed to fetch events');
      }

      const { items = [] } = await res.json();
      
      let mappedEvents: CalendarEvent[] = items.map((item: any) => ({
        id: item.id,
        title: item.summary || 'Untitled Event',
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        description: item.description || '',
        type: 'user'
      }));

      if (mappedEvents.length === 0) {
        // Fallback events
        const today = new Date();
        today.setHours(0,0,0,0);
        mappedEvents = [
          { id:'e1', title:'Team standup',        start: new Date(today.getTime() + 10*3600000).toISOString(), end: new Date(today.getTime() + 10.5*3600000).toISOString(), type: 'user', color: 'blue' },
          { id:'e2', title:'Lunch w/ mentor',     start: new Date(today.getTime() + 12.5*3600000).toISOString(), end: new Date(today.getTime() + 13.5*3600000).toISOString(), type: 'user', color: 'green' },
          { id:'e3', title:'CS3200 office hours', start: new Date(today.getTime() + 15*3600000).toISOString(), end: new Date(today.getTime() + 16*3600000).toISOString(), type: 'user', color: 'blue' },
          { id:'e4', title:'Project deadline ⚠️', start: new Date(today.getTime() + 16.8*3600000).toISOString(), end: new Date(today.getTime() + 16.8*3600000).toISOString(), type: 'user', color: 'red' },
        ];
      }

      setCalendarEvents(mappedEvents);
      setCalendarOffline(false);
      setCalendarReconnecting(false);

      // PART 2B: Cross-reference
      setTimeout(() => {
        setAgentActions(prev => {
          if (prev.some(a => a.type === 'calendar_conflict')) return prev;
          return [{
            id: 'calendar_conflict_action',
            userId: 'demo',
            type: 'calendar_conflict',
            status: 'proposed',
            timestamp: new Date().toISOString(),
            description: '',
            payload: {}
          }, ...prev];
        });
        setReasoning({
          perceive: 'CS3200 project due in < 3h. Office hours end at 4:00 PM.',
          plan: 'Identified tight deadline gap: only 48 minutes left after office hours.',
          act: 'Proposed conflict warning to user.',
        });
      }, 1500);

    } catch (err: any) {
      console.error('Error listing calendar events:', err);
      if (retryCount < 3) {
        setCalendarOffline(true);
        setCalendarReconnecting(true);
        const timeout = Math.pow(2, retryCount) * 1000;
        setTimeout(() => loadCalendarEvents(retryCount + 1), timeout);
      } else {
        setCalendarOffline(true);
        setCalendarReconnecting(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadCalendarEvents();
    }
  }, [accessToken, loadCalendarEvents]);

  // Global scroll listener for parallax
  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollTop !== undefined) {
        document.documentElement.style.setProperty('--scroll', target.scrollTop.toString());
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  // Keep leaderboard in sync
  useEffect(() => {
    if (!user || user.uid === 'demo' || tasks.length === 0) return;
    
    const todayStr = new Date().toDateString();
    
    let completedToday = 0;
    let assignedToday = 0;
    let totalPriority = 0;
    
    tasks.forEach(t => {
      const isToday = new Date(t.deadline).toDateString() === todayStr;
      const completedTodayFlag = t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === todayStr;
      
      if (isToday || completedTodayFlag) {
        assignedToday++;
        totalPriority += t.priorityScore || 50;
      }
      if (t.status === 'completed' && (isToday || completedTodayFlag)) {
        completedToday++;
      }
    });
    
    const avgPriority = assignedToday > 0 ? Math.round(totalPriority / assignedToday) : 0;
    const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
    const initials = (user.displayName || 'US').substring(0, 2).toUpperCase();

    const timeout = setTimeout(() => {
      updateMyLeaderboardStats(user.uid, {
        displayName: user.displayName || 'Active User',
        initials,
        tasksCompletedToday: completedToday,
        tasksAssignedToday: assignedToday || completedToday || 1, // avoid division by zero
        streakDays: maxStreak,
        avgPriority
      }).catch(console.error);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [tasks, habits, user]);

  // --- Auth & Onboarding Handlers ---

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        // Seed initial data if they have none
        setTimeout(() => initializeMockData(result.user.uid), 2000);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Sign in was cancelled. Please try again.');
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setTasks([]);
    setGoals([]);
    setHabits([]);
    setAgentActions([]);
    setCalendarEvents([]);
    setNeedsAuth(true);
  };

  // Seed rich onboarding data to make the prototype look full-featured instantly
  const initializeMockData = async (uid: string) => {
    // Check if tasks are already present
    if (tasks.length > 0) return;

    const now = new Date();
    
    // Create completed tasks to populate productivity trend and metrics
    const completedTasks: Task[] = Array.from({ length: 15 }).map((_, i) => {
      const compDate = new Date();
      compDate.setDate(now.getDate() - (i % 7)); // Spread over last 7 days
      return {
        id: `task_comp_${i}`,
        userId: uid,
        title: `Completed Task ${i + 1}`,
        description: 'Previously finished task',
        deadline: compDate.toISOString(),
        estimatedEffort: 0.5,
        category: i % 2 === 0 ? 'work' : 'personal',
        priorityScore: 50,
        status: 'completed',
        completedAt: compDate.toISOString(),
        subtasks: []
      };
    });

    const activeTasks: Task[] = [
      {
        id: 'task_seed_1', userId: uid,
        title: 'Submit CS3200 assignment',
        description: 'Final algorithm implementations for graph algorithms.',
        deadline: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(), // Due tonight
        estimatedEffort: 3, category: 'school', priorityScore: 95, status: 'pending',
        subtasks: [
          { id: 'sub_1', title: 'Write tests', completed: true },
          { id: 'sub_2', title: 'Optimize Dijkstra', completed: false },
        ],
      },
      {
        id: 'task_seed_2', userId: uid,
        title: 'Prepare for client call',
        description: 'Slides for Q3 review.',
        deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow 10am approx
        estimatedEffort: 2, category: 'work', priorityScore: 85, status: 'pending', subtasks: [],
      },
      {
        id: 'task_seed_3', userId: uid,
        title: 'Pay rent',
        description: 'Transfer funds to landlord account.',
        deadline: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // Friday
        estimatedEffort: 0.5, category: 'finance', priorityScore: 90, status: 'pending', subtasks: [],
      },
      {
        id: 'task_seed_4', userId: uid,
        title: 'Read Chapter 4 for Lit Class',
        description: 'Read and write a 1-page summary.',
        deadline: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 1.5, category: 'school', priorityScore: 60, status: 'pending', subtasks: [],
      },
      {
        id: 'task_seed_5', userId: uid,
        title: 'Gym Session: Push Day',
        description: 'Chest, shoulders, triceps.',
        deadline: new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 1.5, category: 'personal', priorityScore: 40, status: 'pending', subtasks: [],
      },
      {
        id: 'task_seed_6', userId: uid,
        title: 'Email marketing team',
        description: 'Ask for the latest asset links.',
        deadline: new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 0.5, category: 'work', priorityScore: 70, status: 'pending', subtasks: [],
      },
      {
        id: 'task_seed_7', userId: uid,
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, coffee.',
        deadline: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(), // Soon
        estimatedEffort: 1, category: 'personal', priorityScore: 80, status: 'pending', subtasks: [],
      }
    ];

    for (const t of [...completedTasks, ...activeTasks]) {
      await saveTask(uid, t);
    }

    const goal1: Goal = {
      id: 'goal_seed_1', userId: uid, title: 'Academic Thesis Prep',
      targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 65,
      milestones: [
        { id: 'm_1', title: 'Topic validation', completed: true },
        { id: 'm_2', title: 'Draft review', completed: true },
        { id: 'm_3', title: 'Final proofread', completed: false },
      ],
    };
    const goal2: Goal = {
      id: 'goal_seed_2', userId: uid, title: 'Marathon Training',
      targetDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 33,
      milestones: [
        { id: 'm_a', title: 'Run 5K daily', completed: true },
        { id: 'm_b', title: 'Run 10K test', completed: false },
        { id: 'm_c', title: 'Half marathon trial', completed: false },
      ],
    };

    await saveGoal(uid, goal1);
    await saveGoal(uid, goal2);

    // 3 Habits with non-zero streaks
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(now.getDate() - 2);

    const habit1: Habit = {
      id: 'habit_seed_1', userId: uid, title: 'Deep Work Block',
      frequency: 'daily', streak: 12,
      completionLog: [now.toISOString().split('T')[0], yesterday.toISOString().split('T')[0]],
    };
    const habit2: Habit = {
      id: 'habit_seed_2', userId: uid, title: 'Drink 8 Glasses Water',
      frequency: 'daily', streak: 4,
      completionLog: [yesterday.toISOString().split('T')[0], twoDaysAgo.toISOString().split('T')[0]],
    };
    const habit3: Habit = {
      id: 'habit_seed_3', userId: uid, title: 'Read 20 pages',
      frequency: 'daily', streak: 7,
      completionLog: [now.toISOString().split('T')[0], yesterday.toISOString().split('T')[0]],
    };

    await saveHabit(uid, habit1);
    await saveHabit(uid, habit2);
    await saveHabit(uid, habit3);
  };

  // --- Task Operations ---
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);

  const syncGoogleTasks = async () => {
    if (!accessToken || !user || user.uid === 'demo') return;
    setIsSyncingTasks(true);
    try {
      const listId = await gtasksService.getPrimaryTaskList(accessToken);
      if (!listId) throw new Error('No task list found');

      const gTasks = await gtasksService.listTasks(accessToken, listId);
      let updatedLocalCount = 0;

      // Update local tasks based on Google Tasks (completed status)
      for (const gTask of gTasks) {
        const localTask = tasks.find(t => t.googleTaskId === gTask.id);
        if (localTask) {
          const isGTaskCompleted = gTask.status === 'completed';
          const isLocalCompleted = localTask.status === 'completed';
          if (isGTaskCompleted && !isLocalCompleted) {
            await updateTaskFields(user.uid, localTask.id, { status: 'completed', completedAt: new Date().toISOString() });
            updatedLocalCount++;
          }
        }
      }
      
      if (updatedLocalCount > 0) {
        showToast(`Synced ${updatedLocalCount} completed tasks from Google.`);
      }
    } catch (err) {
      console.error('Failed to sync tasks:', err);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'userId' | 'priorityScore' | 'status' | 'subtasks'>) => {
    if (!user) return;
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substring(2, 9),
      userId: user.uid,
      priorityScore: 50, // default, will be updated by AI re-rank
      status: 'pending',
      subtasks: [],
    };
    
    if (accessToken && user.uid !== 'demo') {
      try {
        const listId = await gtasksService.getPrimaryTaskList(accessToken);
        if (listId) {
          const gid = await gtasksService.createTask(accessToken, listId, newTask);
          if (gid) newTask.googleTaskId = gid;
        }
      } catch (err) {
        console.error('Failed to create in Google Tasks', err);
      }
    }

    await saveTask(user.uid, newTask);
    // Auto-trigger agent re-prioritizing for a polished, responsive agent loop
    triggerAutoPrioritize();
  };

  const handleUpdateTask = async (id: string, fields: Partial<Task>) => {
    if (!user) return;
    
    const currentTask = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    
    if (user.uid !== 'demo') {
      await updateTaskFields(user.uid, id, fields);
      if (accessToken && currentTask?.googleTaskId) {
        try {
          const listId = await gtasksService.getPrimaryTaskList(accessToken);
          if (listId) {
            await gtasksService.updateTask(accessToken, listId, currentTask.googleTaskId, { ...currentTask, ...fields });
          }
        } catch (err) {
          console.error('Failed to update in Google Tasks', err);
        }
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    
    const currentTask = tasks.find(t => t.id === id);
    if (accessToken && user.uid !== 'demo' && currentTask?.googleTaskId) {
      try {
        const listId = await gtasksService.getPrimaryTaskList(accessToken);
        if (listId) {
          await gtasksService.deleteTask(accessToken, listId, currentTask.googleTaskId);
        }
      } catch (err) {
        console.error('Failed to delete in Google Tasks', err);
      }
    }
    await deleteTask(user.uid, id);
  };

  // --- Goal Operations ---

  const handleAddGoal = async (title: string, targetDate: string) => {
    if (!user) return;
    const newGoal: Goal = {
      id: Math.random().toString(36).substring(2, 9),
      userId: user.uid,
      title,
      targetDate,
      milestones: [],
      progress: 0,
    };
    await saveGoal(user.uid, newGoal);
  };

  const handleUpdateGoal = async (id: string, fields: Partial<Goal>) => {
    if (!user) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    await saveGoal(user.uid, { ...goal, ...fields });
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    await deleteGoal(user.uid, id);
  };

  // --- Habit Operations ---

  const handleAddHabit = async (title: string, frequency: 'daily' | 'weekly') => {
    if (!user) return;
    const newHabit: Habit = {
      id: Math.random().toString(36).substring(2, 9),
      userId: user.uid,
      title,
      frequency,
      streak: 0,
      completionLog: [],
    };
    await saveHabit(user.uid, newHabit);
  };

  const handleUpdateHabit = async (id: string, fields: Partial<Habit>) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    await saveHabit(user.uid, { ...habit, ...fields });
  };

  const handleDeleteHabit = async (id: string) => {
    if (!user) return;
    await deleteHabit(user.uid, id);
  };

  // --- Autonomous Agent API Logic Integration ---

  // Trigger Gemini scoring of all user tasks
  const triggerAutoPrioritize = async () => {
    if (!user || tasks.length === 0) return;
    setIsPrioritizing(true);
    setReasoning((prev) => ({
      ...prev,
      perceive: `Evaluating ${tasks.length} active tasks based on urgency, estimated effort, and deadline closeness...`,
    }));

    if (user.uid === 'demo') {
      setTimeout(() => {
        setReasoning((prev) => ({
          ...prev,
          plan: `Assigning optimal priorities. Re-ranked based on current time context.`,
        }));
        setTasks(prev => prev.map(t => {
          if (t.status === 'completed') return t;
          let oldScore = t.priorityScore;
          let newScore = oldScore;
          if (t.title.includes('CS3200')) {
            newScore = Math.min(99, oldScore + 15);
          } else if (t.category === 'personal') {
            newScore = Math.max(10, oldScore - 10);
          } else {
            newScore = oldScore + Math.floor(Math.random() * 10) - 5;
          }
          let direction: 'up' | 'down' | 'none' = 'none';
          if (newScore > oldScore) direction = 'up';
          if (newScore < oldScore) direction = 'down';
          
          return { ...t, priorityScore: newScore, priorityDelta: { direction, old: oldScore } };
        }));
        setIsPrioritizing(false);
      }, 1200);
      return;
    }

    try {
      const response = await fetch('/api/agent/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) throw new Error('Prioritization request failed');
      const scoredTasks = await response.json();

      setReasoning((prev) => ({
        ...prev,
        plan: `Assigning optimal priorities. Found ${scoredTasks.filter((t: any) => t.priorityScore >= 80).length} highly critical tasks.`,
      }));

      // Update local state for immediate feedback
      setTasks(prev => {
        const newTasks = [...prev];
        for (const t of scoredTasks) {
          const idx = newTasks.findIndex(nt => nt.id === t.id);
          if (idx !== -1) {
            newTasks[idx] = { ...newTasks[idx], priorityScore: t.priorityScore };
          }
        }
        return newTasks;
      });

      if (user.uid !== 'demo') {
        for (const t of scoredTasks) {
          await updateTaskFields(user.uid, t.id, { priorityScore: t.priorityScore });
        }
      }

      setReasoning((prev) => ({
        ...prev,
        act: 'Prioritization score update executed on database.',
      }));

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `I have completed an intelligent re-ranking of your tasks list. Critical items have been elevated to Today's Focus!`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Prioritization error:', err);
    } finally {
      setIsPrioritizing(false);
    }
  };

  const triggerAutoBatch = async () => {
    if (!user || tasks.length === 0) return;
    setIsBatching(true);
    setReasoning((prev) => ({
      ...prev,
      perceive: `Evaluating tasks for context batching (e.g. emails together, deep-work together)...`,
    }));

    if (user.uid === 'demo') {
      setTimeout(() => {
        setReasoning((prev) => ({
          ...prev,
          plan: `Grouped tasks by context. Applying sequential priority scores to group them together.`,
        }));
        
        // Mock updating tasks with batch groups
        setTasks(prev => prev.map(t => {
          if (t.title.toLowerCase().includes('email') || t.title.toLowerCase().includes('message')) {
            return { ...t, batchGroup: '📧 Communication' };
          }
          if (t.category === 'personal') {
            return { ...t, batchGroup: '💪 Personal' };
          }
          if (t.estimatedEffort < 1) {
            return { ...t, batchGroup: '⚡ Quick Wins' };
          }
          return { ...t, batchGroup: '🧠 Deep Work' };
        }));

        setIsBatching(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch('/api/agent/batch-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) throw new Error('Batching request failed');
      const scoredTasks = await response.json();

      setReasoning((prev) => ({
        ...prev,
        plan: `Grouped tasks by context. Applying sequential priority scores to group them together.`,
      }));

      // Update local state for immediate feedback
      setTasks(prev => {
        const newTasks = [...prev];
        for (const t of scoredTasks) {
          const idx = newTasks.findIndex(nt => nt.id === t.id);
          if (idx !== -1) {
            newTasks[idx] = { ...newTasks[idx], priorityScore: t.priorityScore };
          }
        }
        return newTasks;
      });

      if (user.uid !== 'demo') {
        for (const t of scoredTasks) {
          await updateTaskFields(user.uid, t.id, { priorityScore: t.priorityScore });
        }
      }

      setReasoning((prev) => ({
        ...prev,
        act: 'Context-based batching applied to tasks list.',
      }));

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `I've grouped your tasks by context. You'll now see related tasks adjacent to each other to minimize context-switching!`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Batching error:', err);
    } finally {
      setIsBatching(false);
    }
  };

  // Trigger autonomous subtask breakdown
  const handleGenerateSubtasks = async (taskId: string, title: string, desc: string) => {
    if (!user) return;
    setIsLoadingAgent(true);
    setReasoning((prev) => ({
      ...prev,
      perceive: `Analyzing major task "${title}" to identify granular checkpoints...`,
      plan: 'Formulating structured subtask checklist...',
    }));

    try {
      const response = await fetch('/api/agent/generate-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc }),
      });

      if (!response.ok) throw new Error('Subtask generation failed');
      const subtaskTitles: string[] = await response.json();

      const newSubtasks = subtaskTitles.map((t, idx) => ({
        id: `sub_${idx}_${Date.now()}`,
        title: t,
        completed: false,
      }));

      await updateTaskFields(user.uid, taskId, { subtasks: newSubtasks });

      // Save a log of this action
      const actionLog: AgentAction = {
        id: `act_${Date.now()}`,
        userId: user.uid,
        type: 'create_subtasks',
        status: 'executed',
        timestamp: new Date().toISOString(),
        description: `Broke "${title}" into ${newSubtasks.length} subtasks.`,
        payload: { taskId, subtasks: subtaskTitles },
      };
      await saveAgentAction(user.uid, actionLog);

      setReasoning((prev) => ({
        ...prev,
        act: `Subtasks checklist injected into database for task ID: ${taskId}`,
      }));

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `I've broken down "${title}" into ${newSubtasks.length} actionable subtasks. Expand the task card to see your checklist!`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Subtask error:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // Propose calendar block action
  const handleProposeScheduleAction = async (task: Task) => {
    if (!user) return;
    setIsLoadingAgent(true);
    setReasoning((prev) => ({
      ...prev,
      perceive: `Scanning current Google Calendar to detect scheduling holes for ${task.title}...`,
      plan: `Allocating optimal time blocks factoring in effort (${task.estimatedEffort}h)...`,
    }));

    try {
      // Propose slot: Let's find tomorrow at 2:00 PM as default
      const blockStart = new Date();
      blockStart.setDate(blockStart.getDate() + 1);
      blockStart.setHours(14, 0, 0, 0); // Tomorrow at 2 PM
      const blockEnd = new Date(blockStart.getTime() + task.estimatedEffort * 60 * 60 * 1000);

      const actionLog: AgentAction = {
        id: `act_${Date.now()}`,
        userId: user.uid,
        type: 'create_event',
        status: 'proposed',
        timestamp: new Date().toISOString(),
        description: `Schedule focus block for "${task.title}"`,
        payload: {
          taskId: task.id,
          title: `Focus: ${task.title}`,
          start: blockStart.toISOString(),
          end: blockEnd.toISOString(),
        },
      };

      await saveAgentAction(user.uid, actionLog);

      setReasoning((prev) => ({
        ...prev,
        act: `Focus block slot proposed: ${blockStart.toLocaleTimeString()} - ${blockEnd.toLocaleTimeString()}`,
      }));

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `I've identified an open block on your calendar for "${task.title}". See the Action Log to approve scheduling it!`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Propose schedule error:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  const [draftEmailModal, setDraftEmailModal] = useState<{ subject: string, body: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Draft professional status update email
  const handleDraftEmailAction = async (task: Task) => {
    if (!user) return;
    setIsLoadingAgent(true);
    setReasoning((prev) => ({
      ...prev,
      perceive: 'Formulating structured request and drafting status email...',
    }));

    if (user.uid === 'demo') {
      setTimeout(() => {
        setDraftEmailModal({
          subject: 'Confirming Interview Interest',
          body: 'Dear Recruiter,\n\nI am writing to confirm my continued interest in the internship opportunity at your company. I am very excited about the possibility of joining the team and contributing to your projects.\n\nThank you for considering my application.\n\nBest regards,\n[Your Name]'
        });
        setIsLoadingAgent(false);
      }, 800);
      return;
    }

    try {
      const response = await fetch('/api/agent/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description }),
      });

      if (!response.ok) throw new Error('Email draft failed');
      const { subject, body } = await response.json();

      setDraftEmailModal({ subject, body });

      const actionLog: AgentAction = {
        id: `act_${Date.now()}`,
        userId: user.uid,
        type: 'draft_email',
        status: 'executed',
        timestamp: new Date().toISOString(),
        description: `Draft status update email for "${task.title}"`,
        payload: {
          emailSubject: subject,
          emailBody: body,
        },
      };

      await saveAgentAction(user.uid, actionLog);

      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `I've generated a reassuring draft email. The draft is ready in your modal!`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Draft email error:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // --- General Agent Chat processing ---

  const handleInlineAction = (actionType: string) => {
    if (actionType === 'create_event') {
      const focusEvent: CalendarEvent = {
        id: 'mock_focus_block_' + Date.now(),
        title: 'Focus Block 1:30–4:30 PM',
        description: 'Deep work on CS3200 project',
        start: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
        end: new Date(Date.now() + 1000 * 60 * 60 * 3.25).toISOString(),
        type: 'user'
      };
      setCalendarEvents(prev => [...prev, focusEvent]);
      showToast('Focus block added to your calendar ✓');
    } else if (actionType === 'draft_email') {
      const mockTask = tasks.find(t => t.title.toLowerCase().includes('email')) || tasks[0];
      handleDraftEmailAction(mockTask);
    }
  };

  const handleSendMessage = async (msg: string) => {
    if (!user) return;
    setIsLoadingAgent(true);

    // Append user message instantly
    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: msg, timestamp: new Date() },
    ]);

    setReasoning({
      perceive: `Interpreting user query: "${msg}"...`,
      plan: 'Retrieving user tasks, calendar gaps, habits context...',
      act: 'Formulating agentic response & potential autonomous operations...',
    });

    if (user.uid === 'demo') {
      setTimeout(() => {
        setReasoning({
          perceive: 'CS3200 project due in < 3h. Recruiter email due tonight.',
          plan: 'Block focus time and draft email to save time.',
          act: 'Identified 2 autonomous proposals.',
        });
        
        setIsLoadingAgent(false);
        const fullResponse = "You have 2 urgent tasks today. Your CS3200 project is due in under 3 hours — I recommend starting a focus block now. The internship recruiter email is due by 8:48 PM and only takes 0.5h. Want me to block 1:00–4:00 PM for the project and draft a reply to the recruiter?";
        const inlineActions = [
          { label: 'Block focus time ✓', actionType: 'create_event' },
          { label: 'Draft recruiter email ✓', actionType: 'draft_email' }
        ];

        let index = 0;
        setChatHistory((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: "",
            timestamp: new Date(),
          },
        ]);

        const streamInterval = setInterval(() => {
          if (index < fullResponse.length) {
            const chunkSize = Math.floor(Math.random() * 3) + 2; // Stream 2-4 chars at a time
            const nextText = fullResponse.slice(0, index + chunkSize);
            index += chunkSize;
            setChatHistory(prev => {
              const newHistory = [...prev];
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                text: nextText
              };
              return newHistory;
            });
          } else {
            clearInterval(streamInterval);
            setChatHistory(prev => {
              const newHistory = [...prev];
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                text: fullResponse,
                inlineActions
              };
              return newHistory;
            });
          }
        }, 20); // Fast interval for quick streaming

      }, 1500);
      return;
    }

    try {
      const response = await fetch('/api/agent/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          tasks,
          goals,
          habits,
          calendarEvents,
        }),
      });

      if (!response.ok) throw new Error('Agent process failed');
      const result = await response.json();

      // Set reasoning loop state
      setReasoning({
        perceive: result.perceive || 'Scan finished.',
        plan: result.plan || 'Plan updated.',
        act: result.proposedActions?.length > 0 
          ? `Identified ${result.proposedActions.length} autonomous proposals.`
          : 'No immediate database actions required.',
      });

      // Show agent message response
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: result.textResponse || "I am analyzing your context.",
          timestamp: new Date(),
        },
      ]);

      // If proposed actions were generated by the LLM, inject them into Firestore proposed list
      if (result.proposedActions && Array.isArray(result.proposedActions)) {
        for (const action of result.proposedActions) {
          const actionLog: AgentAction = {
            id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.uid,
            type: action.type,
            status: 'proposed',
            timestamp: new Date().toISOString(),
            description: action.description,
            payload: action.payload || {},
          };
          await saveAgentAction(user.uid, actionLog);
        }
      }
    } catch (err) {
      console.error('Agent process error:', err);
    } finally {
      setIsLoadingAgent(false);
    }
  };

  // --- Action Approvals & Undos ---

  const handleApproveAction = async (actionId: string) => {
    if (!user) return;
    const action = agentActions.find((a) => a.id === actionId);
    if (!action) return;

    if (user.uid === 'demo') {
      setAgentActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'executed' } : a));
      
      const newEvent: CalendarEvent = {
        id: 'approved_mock_' + Date.now(),
        title: 'Focus Block — CS3200 Project',
        description: '',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        type: 'user',
      };
      setCalendarEvents(prev => [...prev, newEvent]);

      if (accessToken) {
        try {
          await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              summary: 'Focus Block — CS3200 Project',
              start: { dateTime: new Date().toISOString() },
              end:   { dateTime: new Date(Date.now() + 3*60*60*1000).toISOString() }
            })
          });
          showToast('Event written to your real Google Calendar ✓');
        } catch (e) {
          // silently fail
        }
      } else {
        showToast('Focus block added ✓');
      }
      return;
    }

    try {
      // If action is calendar scheduling block, execute call to Google Calendar API!
      if (action.type === 'create_event') {
        if (!accessToken) {
          alert('Please sync your Google Calendar first using the button below!');
          return;
        }
        const { title, start, end } = action.payload;
        const resultEvent = await gcalService.createEvent(accessToken, {
          title,
          start,
          end,
          description: `Focus session for task: ${title}`,
        });

        // Store calendar block reference in action payload, and change status
        const updatedPayload = { ...action.payload, gcalEventId: resultEvent.id };
        await saveAgentAction(user.uid, {
          ...action,
          status: 'executed',
          payload: updatedPayload,
        });

        // Reload calendar
        await loadCalendarEvents();

        setChatHistory((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `Focus block successfully scheduled on Google Calendar for tomorrow: ${new Date(start).toLocaleTimeString()}!`,
            timestamp: new Date(),
          },
        ]);
      } else {
        // General execution
        await updateAgentActionStatus(user.uid, actionId, 'executed');
      }
    } catch (err) {
      console.error('Approve action error:', err);
    }
  };

  const handleDeclineAction = async (actionId: string) => {
    if (!user) return;
    await updateAgentActionStatus(user.uid, actionId, 'undone');
  };

  const handleUndoAction = async (actionId: string) => {
    if (!user || !accessToken) return;
    const action = agentActions.find((a) => a.id === actionId);
    if (!action) return;

    try {
      if (action.type === 'create_event' && action.payload.gcalEventId) {
        // Call Google Calendar API to delete event!
        await gcalService.deleteEvent(accessToken, action.payload.gcalEventId);
        
        // Remove from action log or set to undone
        await updateAgentActionStatus(user.uid, actionId, 'undone');

        // Reload calendar
        await loadCalendarEvents();

        setChatHistory((prev) => [
          ...prev,
          {
            sender: 'agent',
            text: `Focus block event deleted from your Google Calendar.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        await updateAgentActionStatus(user.uid, actionId, 'undone');
      }
    } catch (err) {
      console.error('Undo action error:', err);
    }
  };

  // state moved up
  const handleSyncCalendar = async () => {
    if (user?.uid === 'demo') {
      setIsSyncingCalendar(true);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // start of today
      
      const mockEvents: CalendarEvent[] = [
        {
          id: 'mock_cal_1',
          title: 'Team Standup',
          description: '',
          start: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
          end: new Date(today.getTime() + 10.5 * 60 * 60 * 1000).toISOString(),
          type: 'user',
        },
        {
          id: 'mock_cal_2',
          title: 'Lunch w/ mentor',
          description: '',
          start: new Date(today.getTime() + 12.5 * 60 * 60 * 1000).toISOString(),
          end: new Date(today.getTime() + 13.5 * 60 * 60 * 1000).toISOString(),
          type: 'user',
        },
        {
          id: 'mock_cal_3',
          title: 'CS3200 Office Hours',
          description: '',
          start: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
          end: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(),
          type: 'user',
        },
        {
          id: 'mock_cal_4',
          title: 'Project Deadline ⚠️',
          description: '',
          start: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(),
          end: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(),
          type: 'user',
        }
      ];
      setCalendarEvents(mockEvents);
      setAccessToken('mock_token_for_demo');
      setIsSyncingCalendar(false);
      
      // Simulate agent reacting to calendar
      setTimeout(() => {
        setAgentActions((prev: AgentAction[]) => [{
          id: 'calendar_conflict_action',
          userId: 'demo',
          type: 'calendar_conflict',
          description: '⚠️ Calendar conflict: Only 2h free before your CS3200 deadline. I\'ve identified a 1:00–4:00 PM focus window. Confirm to block it?',
          status: 'proposed',
          timestamp: new Date().toISOString(),
          payload: {}
        }, ...prev]);
      }, 500);
      return;
    }

    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        await loadCalendarEvents();
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        alert('Google Calendar sync was cancelled. Please try again.');
      } else {
        console.error('Calendar sync failed:', err);
        alert('Google Calendar sync failed. Please try again.');
      }
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    if (!accessToken) return;
    try {
      // Trigger user confirmation
      const confirmDelete = window.confirm('Are you sure you want to delete this focus block from your Google Calendar?');
      if (!confirmDelete) return;

      await gcalService.deleteEvent(accessToken, eventId);
      await loadCalendarEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // --- Rendering UI views ---

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  // Auth/Onboarding Splash view (desktop container optimized)
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] text-[#2D2D2A] font-sans flex items-center justify-center p-6">
        <div className="w-full max-w-[550px] bg-bg-card rounded-[32px] p-8 border border-[#E6E2D3] shadow-md space-y-6">
          <div className="flex items-center gap-3">
            <Logo />
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-base font-semibold text-[#2D2D2A]">
              An active assistant that schedules and helps you execute work.
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-[#E6E2D3]/40 rounded-full flex items-center justify-center text-[#5A5A40] text-xs font-bold font-mono">1</div>
                <p className="text-xs text-[#8E8E78] leading-relaxed">
                  <strong className="text-[#2D2D2A]">Google Calendar Sync:</strong> Connect your actual calendar to avoid meeting conflicts and insert automatic task focus blocks.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-[#E6E2D3]/40 rounded-full flex items-center justify-center text-[#5A5A40] text-xs font-bold font-mono">2</div>
                <p className="text-xs text-[#8E8E78] leading-relaxed">
                  <strong className="text-[#2D2D2A]">Autonomous Actions:</strong> The agent can draft status emails, construct report templates, or generate checklists to give you a running start.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-[#E6E2D3]/40 rounded-full flex items-center justify-center text-[#5A5A40] text-xs font-bold font-mono">3</div>
                <p className="text-xs text-[#8E8E78] leading-relaxed">
                  <strong className="text-[#2D2D2A]">Voice Commands:</strong> Talk directly to your agent using hands-free voice recognition to find priorities instantly.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E2D3]/60 flex flex-col items-center gap-3">
            {authError && (
              <div className="text-red-500 text-xs font-medium p-2 bg-red-50 rounded w-full text-center border border-red-100">
                {authError}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2.5 bg-bg-card border border-[#E6E2D3] hover:bg-[#FDFBF7] text-[#2D2D2A] text-xs font-bold uppercase tracking-wider py-3.5 px-6 rounded-full shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" version="1.1" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {isLoggingIn ? 'Connecting Securely...' : 'Sign in with Google'}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E78] font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Google Calendar Scopes Required</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Dashboard Layout view (Desktop width bounded to 1024px h-768px for perfect iframe fidelity matching "Light Mode")
  const ElegantFeather = ({ className, opacity = 1 }: { className?: string; opacity?: number }) => {
    // Generate organic chalk-sketch white feather matching the user's reference image
    const barbs = useMemo(() => {
      const list: { d: string; width: number; opacity: number }[] = [];
      const getSpinePoint = (t: number) => {
        // Sweeping curve like the top feather in the reference
        const x0 = 15, y0 = 85;
        const xc = 55, yc = 80;
        const x1 = 95, y1 = 25;
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * xc + t * t * x1;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * yc + t * t * y1;
        const dx = 2 * (1 - t) * (xc - x0) + 2 * t * (x1 - xc);
        const dy = 2 * (1 - t) * (yc - y0) + 2 * t * (y1 - yc);
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x, y, nx: -dy / len, ny: dx / len };
      };

      const noise = (s: number) => {
        const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      const steps = 250; // Dense for chalk texture
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        if (t < 0.05) continue;
        const { x, y, nx, ny } = getSpinePoint(t);
        
        let maxLength = 0;
        if (t < 0.30) {
          // Fluffy down base
          maxLength = 15 + (t / 0.30) * 20;
        } else {
          // Main body tapering to tip
          maxLength = 38 * Math.sin(((1 - t) / 0.70) * Math.PI / 2) + 2;
        }

        // Create clumping (splits in the feather)
        const clumpPhase = t * 60;
        const clumpGap = Math.pow(Math.sin(clumpPhase), 8); // Sharp gaps
        
        // Draw multiple strokes per location for a "sketched" look
        const strokesPerStep = t < 0.30 ? 6 : 4; 
        
        for (const side of [-1, 1]) {
          // Apply gaps more heavily to the pennaceous part
          const sideMaxLength = t >= 0.30 ? maxLength * (1 - clumpGap * 0.45) : maxLength;

          for (let s = 0; s < strokesPerStep; s++) {
            const seed = i * 100 + side * 10 + s;
            const lengthNoise = 0.6 + noise(seed) * 0.6;
            const length = sideMaxLength * lengthNoise;

            const isDowny = t < 0.30;
            let d = "";
            let width = 0.2 + noise(seed + 1) * 0.35;
            let op = 0.15 + noise(seed + 2) * 0.35;

            // Base direction outwards
            const bx = nx * side;
            const by = ny * side;
            
            // Tip direction
            const tx = (95 - 15) / 105;
            const ty = (25 - 85) / 105;

            if (isDowny) {
              // Messy, curvy downy strokes
              const mix = 0.1 + noise(seed + 3) * 0.3;
              let dirX = bx * (1 - mix) + tx * mix;
              let dirY = by * (1 - mix) + ty * mix;
              const dLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
              dirX /= dLen;
              dirY /= dLen;

              const waveAmp = 5 + noise(seed + 4) * 10;
              const waveFreq = 2 + noise(seed + 5) * 3;
              
              // Random root offset for fluffiness
              const rootX = x + nx * side * noise(seed + 6) * 5;
              const rootY = y + ny * side * noise(seed + 7) * 5;

              const cx1 = rootX + dirX * length * 0.3 + nx * side * waveAmp * Math.sin(t * waveFreq);
              const cy1 = rootY + dirY * length * 0.3 + ny * side * waveAmp * Math.cos(t * waveFreq);
              const cx2 = rootX + dirX * length * 0.7 - nx * side * waveAmp * Math.cos(t * waveFreq);
              const cy2 = rootY + dirY * length * 0.7 - ny * side * waveAmp * Math.sin(t * waveFreq);
              const endX = rootX + dirX * length + nx * side * waveAmp * 0.5 * (noise(seed + 8) - 0.5);
              const endY = rootY + dirY * length + ny * side * waveAmp * 0.5 * (noise(seed + 9) - 0.5);
              
              d = `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
              op *= 0.8; // slightly more transparent
            } else {
              // Straighter, elegant strokes for the main vane
              const sweepAngle = (t - 0.30) / 0.70;
              const mix = 0.3 + sweepAngle * 0.6 + noise(seed + 3) * 0.15; // sweep towards tip more at the end
              
              // Add slight angle variations for texture
              const angleNoise = (noise(seed + 4) - 0.5) * 0.3;
              
              let dirX = bx * (1 - mix) + tx * mix + ny * angleNoise;
              let dirY = by * (1 - mix) + ty * mix - nx * angleNoise;
              const dLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
              dirX /= dLen;
              dirY /= dLen;

              const rootX = x + nx * side * noise(seed + 6) * 2;
              const rootY = y + ny * side * noise(seed + 7) * 2;

              const endX = rootX + dirX * length;
              const endY = rootY + dirY * length;
              
              // Slight curve to the stroke
              const bow = (noise(seed + 8) - 0.5) * 6;
              const cx = rootX + dirX * length * 0.5 + nx * side * bow;
              const cy = rootY + dirY * length * 0.5 + ny * side * bow;
              
              d = `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
            }

            list.push({ d, width, opacity: op });
          }
        }
      }
      return { shaftD: "M 15 85 Q 55 80, 95 25", barbs: list };
    }, []);

    return (
      <svg
        viewBox="0 0 110 110"
        className={`pointer-events-none select-none transition-all duration-700 ${className}`}
        style={{
          opacity,
          filter: "drop-shadow(4px 12px 18px rgba(0, 0, 0, 0.75)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5))"
        }}
      >
        {/* Soft realistic body volume glow underneath the detailed barbs */}
        <path
          d="M 15 85 C 25 65, 40 45, 95 25 C 70 50, 55 75, 15 85 Z"
          fill="white"
          opacity="0.16"
          className="blur-md"
        />
        <path
          d="M 15 85 C 30 70, 45 55, 95 25 C 75 45, 60 70, 15 85 Z"
          fill="white"
          opacity="0.08"
          className="blur-sm"
        />
        
        {/* Soft background glow matching white feather softness */}
        <path
          d={barbs.shaftD}
          stroke="white"
          strokeWidth="15"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
          className="blur-md"
        />
        
        {/* Procedural fine fluffy wisps */}
        {barbs.barbs.map((barb, idx) => (
          <path
            key={idx}
            d={barb.d}
            stroke="white"
            strokeWidth={barb.width}
            strokeLinecap="round"
            fill="none"
            opacity={barb.opacity}
          />
        ))}

        {/* Smooth central spine */}
        <path
          d={barbs.shaftD}
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <path
          d={barbs.shaftD}
          stroke="#F8FAFC"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />
      </svg>
    );
  };

  return (
    <div className={`w-full min-h-screen bg-bg-app text-text-main font-sans flex overflow-hidden transition-all duration-500 relative z-0`}>
      
      {/* Decorative floating feathers in the background, positioned in active stacking layer z-0 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)', maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)' }}>
        <div style={{ transform: `translateY(calc(var(--scroll, 0) * -0.1px))` }} className="w-full h-full absolute inset-0">
          <ElegantFeather className="absolute w-64 h-64 bottom-8 right-8 animate-feather-1" opacity={0.85} />
          <ElegantFeather className="absolute w-40 h-40 top-24 left-1/4 animate-feather-2" opacity={0.75} />
          <ElegantFeather className="absolute w-56 h-56 top-1/3 -left-12 animate-feather-3" opacity={0.65} />
          <ElegantFeather className="absolute w-32 h-32 top-8 right-1/4 animate-feather-1" opacity={0.55} />
        </div>
      </div>

      {/* Left Sidebar */}
      <aside className="w-20 border-r border-border-color flex flex-col items-center py-8 shrink-0 z-10 bg-bg-app/90 backdrop-blur-md">
        <div className="mb-12">
          <Logo iconOnly className="hover:scale-105 transition-transform cursor-pointer" />
        </div>
        <div className="flex flex-col gap-6 text-text-mut">
          <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-accent text-[#111] shadow-md' : 'hover:text-black dark:hover:text-white hover:bg-bg-card-alt'}`}><LayoutDashboard className="w-5 h-5" /></button>
          <button onClick={() => setActiveTab('tasks')} className={`p-3 rounded-2xl transition-all ${activeTab === 'tasks' ? 'bg-accent text-[#111] shadow-md' : 'hover:text-black dark:hover:text-white hover:bg-bg-card-alt'}`}><CheckSquare className="w-5 h-5" /></button>
          <button onClick={() => setActiveTab('leaderboard')} className={`p-3 rounded-2xl transition-all ${activeTab === 'leaderboard' ? 'bg-accent text-[#111] shadow-md' : 'hover:text-black dark:hover:text-white hover:bg-bg-card-alt'}`}><Trophy className="w-5 h-5" /></button>
          <button onClick={() => setActiveTab('files')} className={`p-3 rounded-2xl transition-all ${activeTab === 'files' ? 'bg-accent text-[#111] shadow-md' : 'hover:text-black dark:hover:text-white hover:bg-bg-card-alt'}`}><FileText className="w-5 h-5" /></button>
        </div>
        <div className="mt-auto flex flex-col gap-4 items-center">
          <button 
            onClick={handleLogout}
            className="p-3 hover:text-red-600 hover:bg-red-500/10 rounded-2xl transition-all text-text-mut"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 bg-bg-app/80 relative">
        {/* Top Bar */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <span className="font-medium tracking-tight text-sm">Remaining Task</span>
            <div className="bg-accent text-[#111] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse-ring-green"></div>
              Agent: {isLoadingAgent ? 'Reasoning Loop Active' : 'Perceiving Context'}
            </div>
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-mut" />
            <input type="text" placeholder="Search anything..." className="w-full bg-bg-card border border-border-color pl-10 pr-4 py-2.5 rounded-full text-sm font-medium focus:outline-none focus:border-black transition-colors" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {activeTab === 'dashboard' || activeTab === 'tasks' ? (
            <>
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-4xl font-medium tracking-tighter mb-2 text-text-main">{activeTab === 'dashboard' ? 'Active Overview' : 'All Tasks'}</h1>
                  <p className="text-text-mut text-sm">You can edit all the stuff as you wish.</p>
                </div>
                <div className="flex gap-4">
                  <button className="border border-border-color bg-bg-card px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:border-accent transition-colors">
                    Today <ChevronDown className="w-4 h-4" />
                  </button>
                  <button className="border border-border-color bg-bg-card px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:border-accent transition-colors">
                    <Filter className="w-4 h-4" /> Filters <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!isFocusMode && activeTab === 'dashboard' && (
                <div className="mb-8">
                  <HabitsGoalsWidget
                    goals={goals}
                    habits={habits}
                    onAddGoal={handleAddGoal}
                    onUpdateGoal={handleUpdateGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onAddHabit={handleAddHabit}
                    onUpdateHabit={handleUpdateHabit}
                    onDeleteHabit={handleDeleteHabit}
                  />
                </div>
              )}
              
              <div className={`bg-bg-card border ${hasUrgentTask ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-border-color'} p-6 transition-all duration-500 ${isFocusMode ? 'rounded-[48px] shadow-2xl border-accent' : 'rounded-[32px]'}`}>
                <TasksWidget
                  tasks={tasks}
                  goals={goals}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onAutoPrioritize={triggerAutoPrioritize}
                  onAutoBatch={triggerAutoBatch}
                  onGenerateSubtasks={handleGenerateSubtasks}
                  onDraftEmailAction={handleDraftEmailAction}
                  onProposeScheduleAction={handleProposeScheduleAction}
                  isPrioritizing={isPrioritizing}
                  isBatching={isBatching}
                  isFocusMode={isFocusMode}
                  onExitFocusMode={() => setIsFocusMode(false)}
                  onSyncGTasks={syncGoogleTasks}
                  isSyncingGTasks={isSyncingTasks}
                  accessToken={accessToken}
                />
              </div>
            </>
          ) : activeTab === 'files' ? (
            <div className="pt-8">
              <FilesWidget onTasksGenerated={(generatedTasks) => {
                generatedTasks.forEach(task => {
                  handleAddTask(task as any);
                });
                setActiveTab('tasks');
                showToast(`Added ${generatedTasks.length} tasks from document.`);
              }} />
            </div>
          ) : activeTab === 'leaderboard' ? (
            <div className="pt-8 h-full">
              <Leaderboard />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-mut space-y-4 pt-20">
              <h2 className="text-2xl font-medium tracking-tight text-text-main capitalize">{activeTab}</h2>
              <p className="text-sm">This module is under construction.</p>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-[360px] lg:w-[400px] border-l border-border-color flex flex-col shrink-0 h-screen overflow-hidden z-10 bg-bg-card shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="h-20 px-8 flex items-center justify-between shrink-0">
          <button className="relative p-2 hover:bg-bg-card rounded-full transition-colors text-text-mut hover:text-black dark:hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-white"></span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-text-main">{user?.displayName || 'Active User'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-bg-card overflow-hidden border border-border-color cursor-pointer shadow-sm">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-accent text-[#111]">US</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
          {!isFocusMode && (
            <AgentConsole
              onSendMessage={handleSendMessage}
              isLoading={isLoadingAgent}
              reasoning={reasoning}
              proposedActions={agentActions}
              chatHistory={chatHistory}
              onApproveAction={handleApproveAction}
              onDeclineAction={handleDeclineAction}
              onUndoAction={handleUndoAction}
              onInlineAction={handleInlineAction}
            />
          )}

          {!isFocusMode && (
            <div className="shrink-0 mt-4">
              <CalendarWidget
                events={calendarEvents}
                accessToken={accessToken}
                isSyncing={isSyncingCalendar}
                onDeleteEvent={handleDeleteCalendarEvent}
                onSync={handleSyncCalendar}
                offline={calendarOffline}
                reconnecting={calendarReconnecting}
              />
            </div>
          )}
        </div>
      </aside>
      {/* Draft Email Modal */}
      {draftEmailModal && (
        <div className="fixed inset-0 bg-accent/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card rounded-[32px] border border-border-color p-8 max-w-2xl w-full shadow-2xl relative">
            <div className="absolute top-8 right-8 flex items-center gap-1 opacity-60">
              <Zap className="w-3 h-3 text-accent-gold" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent-gold">Gemini 1.5 Flash</span>
            </div>
            <h3 className="text-2xl font-sans font-medium tracking-tighter text-text-med mb-4">Email Draft</h3>
            <div className="space-y-4 text-sm text-text-main font-mono">
              <div>
                <strong>Subject:</strong> {draftEmailModal.subject}
              </div>
              <div className="whitespace-pre-wrap bg-bg-input p-4 rounded-xl border border-border-color">
                {draftEmailModal.body}
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(draftEmailModal.body);
                  setDraftEmailModal(null);
                }}
                className="px-6 py-2 bg-text-med text-bg-main rounded-full font-bold uppercase tracking-wider text-xs hover:bg-text-main transition-colors cursor-pointer"
              >
                Copy & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-accent-green text-[#111] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold tracking-wider text-xs">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
