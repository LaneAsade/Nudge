import React, { useState } from 'react';
import { Task, TaskCategory, Subtask, Goal } from '../types';
import { Plus, Check, Sparkles, ChevronDown, ChevronUp, CheckSquare, Trash2, Calendar, TrendingUp, Search, Zap, Mail, Clock, MessageSquare, Bell, Brain } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';

import { DeepFocusView } from './DeepFocusView';

interface TasksWidgetProps {
  tasks: Task[];
  goals: Goal[];
  onAddTask: (taskData: Omit<Task, 'id' | 'userId' | 'priorityScore' | 'status' | 'subtasks'>) => void;
  onUpdateTask: (id: string, fields: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAutoPrioritize: () => void;
  onAutoBatch?: () => void;
  onGenerateSubtasks: (taskId: string, title: string, desc: string) => void;
  onDraftEmailAction: (task: Task) => void;
  onProposeScheduleAction: (task: Task) => void;
  isPrioritizing: boolean;
  isBatching?: boolean;
  isFocusMode?: boolean;
  onExitFocusMode?: () => void;
  onSyncGTasks?: () => void;
  isSyncingGTasks?: boolean;
  accessToken?: string | null;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  tasks,
  goals,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAutoPrioritize,
  onAutoBatch,
  onGenerateSubtasks,
  onDraftEmailAction,
  onProposeScheduleAction,
  isPrioritizing,
  isBatching,
  isFocusMode = false,
  onExitFocusMode = () => {},
  onSyncGTasks,
  isSyncingGTasks,
  accessToken
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');

  const CATEGORY_COLORS: Record<TaskCategory, string> = {
    school: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    work: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    personal: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    finance: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState(1);
  const [category, setCategory] = useState<TaskCategory>('work');
  const [goalId, setGoalId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    onAddTask({
      title,
      description,
      deadline,
      estimatedEffort: Number(estimatedEffort),
      category,
      ...(goalId ? { goalId } : {}),
    });

    // Reset
    setTitle('');
    setDescription('');
    setDeadline('');
    setEstimatedEffort(1);
    setCategory('work');
    setGoalId('');
    setIsAdding(false);
  };

  const getTimeRemaining = (deadlineStr: string) => {
    const total = Date.parse(deadlineStr) - Date.parse(new Date().toString());
    if (isNaN(total)) return 'Unknown deadline';
    if (total <= 0) return 'Overdue';

    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    const mins = Math.floor((total / 1000 / 60) % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m left`;
    }
    return `${mins}m left`;
  };

  const getDeadlineColor = (deadline: string) => {
    const diffHours = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (diffHours <= 6) return 'border-red-500';
    if (diffHours <= 24) return 'border-amber-500';
    return 'border-green-500';
  };

  const getUrgentTimer = (deadline: string) => {
    const diffMs = new Date(deadline).getTime() - new Date().getTime();
    if (diffMs < 0) return null;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) return null;
    const h = Math.floor(diffHours);
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const isUnderOneHour = diffHours < 1;
    return (
      <span className={`font-mono font-bold ${isUnderOneHour ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
        Due in {h}h {m}m
      </span>
    );
  };

  const toggleSubtask = (taskId: string, subtask: Subtask) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subtask.id ? { ...s, completed: !s.completed } : s
    );

    // Trigger confetti if this completes all subtasks
    const previouslyAllCompleted = task.subtasks.every(s => s.completed);
    const nowAllCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed);
    
    if (!previouslyAllCompleted && nowAllCompleted) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      });
    }

    onUpdateTask(taskId, { subtasks: updatedSubtasks });
  };

  // Sorted tasks: first by priorityScore descending, then by deadline
  const sortedTasks = [...tasks]
    .filter(t => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return b.priorityScore - a.priorityScore;
    });

  const displayedTasks = isFocusMode 
    ? sortedTasks.filter(t => t.status !== 'completed').slice(0, 1) 
    : sortedTasks;

  // Calculate weekly trend
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const chartData = last7Days.map((date, i) => {
    const isToday = i === 6;
    let dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    if (isToday) {
      dayStr = `Today (${dayStr})`;
    }
    
    // Tasks completed on this day
    const completedCount = tasks.filter(t => {
      if (t.status !== 'completed') return false;
      const completedDate = t.completedAt ? new Date(t.completedAt) : new Date(); // fallback to today
      return completedDate.toDateString() === date.toDateString();
    }).length;

    // Tasks due on this day (or completed on this day)
    const dueCount = tasks.filter(t => {
      const dueDate = new Date(t.deadline);
      return dueDate.toDateString() === date.toDateString();
    }).length;

    // Total tasks active or relevant for this day could be estimated by due + completed not due today, but a simple metric:
    // Rate = completed / (due + completed) to avoid > 100%, or just completed / due (cap at 100%)
    // Let's use a simple approach: if dueCount is 0 but completedCount > 0, it's 100%. 
    const totalForDay = Math.max(dueCount, completedCount);
    const completionRate = totalForDay > 0 ? Math.round((completedCount / totalForDay) * 100) : 0;

    return { 
      name: dayStr, 
      completed: completedCount, 
      rate: completionRate,
      fullDate: date.toLocaleDateString(),
      isToday
    };
  });

  // Energy Balance Calculation
  const [showEnergyBalInfo, setShowEnergyBalInfo] = useState(false);
  const completedEffort = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.estimatedEffort, 0);
  const pendingEffort = tasks.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.estimatedEffort, 0);
  const totalEffort = completedEffort + pendingEffort;
  const energyBalancePercent = totalEffort > 0 ? (completedEffort / totalEffort) * 100 : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (energyBalancePercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-sans font-medium tracking-tighter tracking-wide text-text-med transition-colors">
          {isFocusMode ? 'Deep Focus' : "Today's Focus"}
        </h2>
        {!isFocusMode && (
          <div className="flex items-center gap-2">
            {onAutoBatch && (
              <button
                onClick={onAutoBatch}
                disabled={isBatching || tasks.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-gold text-bg-app text-xs font-semibold rounded-full uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                {isBatching ? 'Batching...' : 'Auto-Batch'}
              </button>
            )}
            {accessToken && onSyncGTasks && (
               <button
                onClick={onSyncGTasks}
                disabled={isSyncingGTasks}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase tracking-wider hover:bg-blue-200 disabled:opacity-50 transition-all cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {isSyncingGTasks ? 'Syncing...' : 'Sync GTasks'}
              </button>
            )}
            <button
              onClick={onAutoPrioritize}
              disabled={isPrioritizing || tasks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green text-[#111] text-xs font-semibold rounded-full uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Brain className="w-3.5 h-3.5" />
              {isPrioritizing ? 'Prioritizing...' : 'AI Re-Rank'}
            </button>
          </div>
        )}
      </div>

      {!isFocusMode && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-mut" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-input border border-border-color rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-text-med text-bg-app border-text-med'
                  : 'bg-transparent text-text-mut border-border-color hover:border-text-mut'
              }`}
            >
              All
            </button>
            {(['school', 'work', 'personal', 'finance', 'other'] as TaskCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : 'bg-transparent text-text-mut border-border-color hover:border-text-mut'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Productivity Trend */}
      {!isFocusMode && (
        <div className="bg-[#F9F9F9] dark:bg-neutral-900 rounded-[24px] p-5 border border-border-color shadow-sm shrink-0 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-gold" />
              <h3 className="text-[11px] font-sans font-bold text-text-med uppercase tracking-[0.12em]">Productivity Trend</h3>
            </div>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(234, 179, 8, 0.3)" />
                    <stop offset="100%" stopColor="rgba(234, 179, 8, 0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const isToday = payload.value.includes('Today');
                    return (
                      <text x={x} y={Number(y) + 10} textAnchor="middle" fill={isToday ? '#EAB308' : '#8E8E78'} fontSize={10} fontWeight={isToday ? 'bold' : 'normal'}>
                        {payload.value}
                      </text>
                    );
                  }}
                  padding={{ left: 30, right: 30 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  ticks={[0, 5, 10, 15]} 
                  tick={{ fontSize: 10, fill: '#8E8E78' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1C1A', border: '1px solid #333631', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#D4D4CE' }}
                  labelStyle={{ color: '#8E8E78', marginBottom: '4px' }}
                  formatter={(value: any) => [`${value} tasks completed`, '']}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#EAB308" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  activeDot={{ r: 6, fill: '#fff', strokeWidth: 2, stroke: '#EAB308' }}
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#EAB308' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Header Metrics */}
      {!isFocusMode && (
        <div className="grid grid-cols-3 gap-4 bg-bg-card rounded-[24px] p-4 border border-border-color shadow-sm shrink-0 transition-colors">
          <div className="flex flex-col items-center justify-center py-0.5">
            <span className="text-2xl font-bold text-text-med font-mono transition-colors">
              {tasks.filter(t => t.status === 'completed').length}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-text-mut font-bold text-center mt-1 transition-colors">
              Completed
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-0.5 border-l border-border-color transition-colors relative">
            <div className="relative w-10 h-10 flex items-center justify-center mb-1">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  className="text-bg-input"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="20"
                  cy="20"
                />
                <circle
                  className="text-accent-green transition-all duration-1000 ease-out"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="20"
                  cy="20"
                />
              </svg>
              <Zap className="w-3.5 h-3.5 text-accent-green absolute" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-text-mut font-bold text-center transition-colors flex items-center justify-center gap-1 relative">
              Energy Bal
              <button 
                onClick={(e) => { e.stopPropagation(); setShowEnergyBalInfo(!showEnergyBalInfo); }} 
                className="w-3 h-3 rounded-full border border-text-mut/50 flex items-center justify-center text-[8px] cursor-pointer hover:bg-black dark:hover:bg-white/10"
              >
                i
              </button>
              {showEnergyBalInfo && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-bg-card border border-border-color p-3 rounded-xl text-[11px] text-text-med shadow-xl z-50 normal-case tracking-normal">
                  Shows the ratio of completed effort to total estimated effort for all active tasks.
                </div>
              )}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-0.5 border-l border-border-color transition-colors">
            <span className="text-2xl font-bold text-accent-gold font-mono transition-colors">
              {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.priorityScore, 0) / tasks.length) : 0}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-text-mut font-bold text-center mt-1 transition-colors">
              Avg Priority
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-1 relative">
        {isPrioritizing && (
          <div className="absolute inset-0 z-10 bg-bg-card/90 backdrop-blur-[2px] flex items-center justify-center rounded-[32px] animate-in fade-in duration-300">
            <div className="bg-bg-card px-6 py-3 rounded-full shadow-lg border border-border-color flex items-center gap-3">
              <Zap className="w-5 h-5 text-accent-gold animate-pulse" />
              <span className="text-sm font-bold text-text-med tracking-widest uppercase">⚡ Re-ranking with Gemini...</span>
            </div>
          </div>
        )}
        {isBatching && (
          <div className="absolute inset-0 z-10 bg-bg-card/90 backdrop-blur-[2px] flex items-center justify-center rounded-[32px] animate-in fade-in duration-300">
            <div className="bg-bg-card px-6 py-3 rounded-full shadow-lg border border-border-color flex items-center gap-3">
              <Zap className="w-5 h-5 text-accent-gold animate-pulse" />
              <span className="text-sm font-bold text-text-med tracking-widest uppercase">🔄 Batching with Gemini...</span>
            </div>
          </div>
        )}
        {/* Form Expandable Card */}
        {!isFocusMode && (
          isAdding ? (
            <form onSubmit={handleSubmit} className="bg-bg-card p-6 rounded-[32px] border border-border-color shadow-md space-y-4 transition-colors">
              <h3 className="text-sm font-bold text-text-med uppercase tracking-wider mb-2 transition-colors">Add High-Stake Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finalize Quarterly Report, Thesis Prep"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Description (AI Context)</label>
                <textarea
                  placeholder="Provide context like stakeholders, stakes of missing it, or contents"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm h-16 focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main resize-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Hard Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
                >
                  <option value="work">Work</option>
                  <option value="school">School</option>
                  <option value="personal">Personal</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Est. Effort (Hours)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(Number(e.target.value))}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] uppercase font-bold text-text-mut transition-colors">Link to Goal (Optional)</label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green text-text-main transition-colors"
                >
                  <option value="">None</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-border-color text-text-main text-xs rounded-full font-bold uppercase tracking-wider cursor-pointer hover:bg-bg-input transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-accent-green text-[#111] text-xs rounded-full font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer transition-colors"
              >
                Create Task
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-[#F9F9F9] dark:bg-neutral-900 p-4 rounded-[32px] border border-dashed border-border-color flex items-center justify-center transition-colors">
            <button
              onClick={() => setIsAdding(true)}
              className="text-text-mut text-sm font-semibold flex items-center gap-2 hover:text-text-med transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New High-Stake Task
            </button>
          </div>
        ))}

        {/* Tasks List */}
        {isFocusMode && displayedTasks.length > 0 ? (
          <DeepFocusView 
            task={displayedTasks[0]} 
            onComplete={(taskId) => {
              onUpdateTask(taskId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
              });
              onExitFocusMode();
            }} 
            onExit={onExitFocusMode} 
          />
        ) : displayedTasks.length === 0 ? (
          <div className="bg-bg-card p-8 rounded-[32px] border border-border-color text-center text-text-mut transition-colors">
            <CheckSquare className="w-12 h-12 mx-auto opacity-30 mb-2" />
            <p className="font-sans font-medium tracking-tighter text-lg text-text-med transition-colors">
              {isFocusMode ? "You are all caught up!" : "A clean focus board."}
            </p>
            {!isFocusMode && <p className="text-xs mt-1">Add tasks with hard deadlines to trigger the AI agent loop.</p>}
          </div>
        ) : (
          (() => {
            const groups: { [key: string]: typeof displayedTasks } = {};
            const ungrouped: typeof displayedTasks = [];
            displayedTasks.forEach(task => {
              if (task.batchGroup) {
                if (!groups[task.batchGroup]) groups[task.batchGroup] = [];
                groups[task.batchGroup].push(task);
              } else {
                ungrouped.push(task);
              }
            });

            const renderTask = (task: typeof displayedTasks[0]) => {
            const timeRem = getTimeRemaining(task.deadline);
            const isCompleted = task.status === 'completed';
            const isOverdue = timeRem === 'Overdue' && !isCompleted;
            const isTaskExpanded = expandedTask === task.id;

            return (
              <div
                key={task.id}
                className={`bg-bg-card border-border-color border p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md group mb-3 relative overflow-hidden ${isCompleted ? 'opacity-65' : ''}`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getDeadlineColor(task.deadline)} border-l-4`}></div>
                
                <button
                  onClick={() => {
                    onUpdateTask(task.id, {
                      status: isCompleted ? 'pending' : 'completed',
                      completedAt: isCompleted ? undefined : new Date().toISOString(),
                    });
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 cursor-pointer ml-2 ${
                    isCompleted
                      ? 'bg-accent text-[#111]'
                      : 'bg-[#F2F2F2] dark:bg-neutral-800 text-text-mut hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Sparkles className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm font-sans font-semibold text-text-main truncate ${isCompleted ? 'line-through text-text-mut' : ''}`} title={task.title}>
                      {task.title}
                    </h4>
                    <span className="px-2 py-0.5 border border-black/10 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[#F2F2F2] dark:bg-neutral-800 text-text-main">
                      P: {task.priorityScore}
                    </span>
                    {isOverdue && (
                      <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">Overdue</span>
                    )}
                    {(!isOverdue && !isCompleted && getUrgentTimer(task.deadline)) && (
                       <button
                         onClick={() => onDraftEmailAction(task)}
                         className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold uppercase hover:bg-amber-200 transition-colors cursor-pointer ml-auto"
                       >
                         Draft Delay Notice
                       </button>
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-[11px] text-text-mut font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(task.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {getUrgentTimer(task.deadline) || timeRem}
                    </span>
                    {task.subtasks.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-black dark:hover:text-white transition-colors" onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}>
                          <MessageSquare className="w-3 h-3" /> {task.subtasks.length} subtasks
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-32 hidden lg:block shrink-0 px-4">
                   <div className="flex justify-between text-[10px] font-bold text-text-main mb-1.5">
                     <span>{isCompleted ? '100%' : `${Math.round((task.subtasks.filter(s => s.completed).length / Math.max(1, task.subtasks.length)) * 100)}%`} complete</span>
                   </div>
                   <div className="h-1.5 w-full bg-[#E5E5E5] rounded-full overflow-hidden">
                     <div className={`h-full bg-accent rounded-full`} style={{ width: isCompleted ? '100%' : `${(task.subtasks.filter(s => s.completed).length / Math.max(1, task.subtasks.length)) * 100}%` }}></div>
                   </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t border-border-color md:border-none pt-3 md:pt-0 mt-3 md:mt-0">
                  <button
                    onClick={() => onProposeScheduleAction(task)}
                    className="px-4 py-2 border border-border-color bg-bg-card hover:border-accent rounded-full text-[11px] font-semibold flex items-center gap-2 transition-colors text-text-main"
                  >
                    <Bell className="w-3 h-3" /> Reminder
                  </button>
                  <button 
                    onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}
                    className="w-8 h-8 rounded-full border border-border-color flex items-center justify-center text-text-mut hover:border-accent hover:text-black dark:hover:text-white transition-colors"
                  >
                    {isTaskExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Details Panel */}
                {isTaskExpanded && (
                  <div className="w-full basis-full mt-4 pt-4 border-t border-border-color pl-14">
                    {task.description && (
                      <p className="text-xs text-text-mut mb-4">{task.description}</p>
                    )}
                    {task.subtasks.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h5 className="text-[10px] font-bold text-text-main uppercase tracking-wider">Subtask Checklist</h5>
                        <div className="grid grid-cols-1 gap-1.5 bg-[#F2F2F2] dark:bg-neutral-800 p-3 rounded-2xl">
                          {task.subtasks.map((s) => (
                            <div key={s.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={s.completed}
                                onChange={() => toggleSubtask(task.id, s)}
                                className="rounded text-text-primary focus:ring-black border-border-color bg-bg-card"
                              />
                              <span className={`text-xs ${s.completed ? 'line-through text-text-mut' : 'text-text-main'}`}>
                                {s.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {task.subtasks.length === 0 && (
                        <button
                          onClick={() => onGenerateSubtasks(task.id, task.title, task.description)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border-color hover:border-accent text-text-main text-[10px] font-bold rounded-full transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" /> Break Into Subtasks
                        </button>
                      )}
                      <button
                        onClick={() => onDraftEmailAction(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-border-color hover:border-accent text-text-main text-[10px] font-bold rounded-full transition-colors cursor-pointer"
                      >
                        <Mail className="w-3 h-3" /> Draft Update Email
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-full transition-colors cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            };

            return (
              <div className="w-full">
                {Object.entries(groups).map(([groupName, groupTasks]) => (
                  <div key={groupName} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6 w-full">
                    <div className="flex items-center justify-between border-b border-border-color/50 pb-2 pl-2 pr-2">
                      <h3 className="text-xs font-bold text-text-mut uppercase tracking-widest">{groupName} ({groupTasks.length})</h3>
                      <div className="flex items-center gap-1 opacity-70">
                        <Zap className="w-3 h-3 text-accent-gold" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-accent-gold">Gemini</span>
                      </div>
                    </div>
                    {groupTasks.map(renderTask)}
                  </div>
                ))}
                {ungrouped.length > 0 && ungrouped.map(renderTask)}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};
