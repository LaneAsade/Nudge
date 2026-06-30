import React, { useState } from 'react';
import { Goal, Habit } from '../types';
import { Check, Flame } from 'lucide-react';

interface HabitsGoalsWidgetProps {
  goals: Goal[];
  habits: Habit[];
  onAddGoal: (title: string, targetDate: string) => void;
  onUpdateGoal: (id: string, fields: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onAddHabit: (title: string, frequency: 'daily' | 'weekly') => void;
  onUpdateHabit: (id: string, fields: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
}

export const HabitsGoalsWidget: React.FC<HabitsGoalsWidgetProps> = ({
  goals,
  habits,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddHabit,
  onUpdateHabit,
}) => {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    onAddGoal(goalTitle, goalDate || new Date().toISOString().split('T')[0]);
    setGoalTitle('');
    setGoalDate('');
    setIsAddingGoal(false);
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;
    onAddHabit(habitTitle, habitFreq);
    setHabitTitle('');
    setIsAddingHabit(false);
  };

  const getTodayDateStr = () => {
    return new Date().toISOString().split('T')[0];
  };

  const toggleHabitCompletion = (habit: Habit) => {
    const today = getTodayDateStr();
    const isCompletedToday = habit.completionLog.includes(today);
    
    let updatedLog = [...habit.completionLog];
    let updatedStreak = habit.streak;

    if (isCompletedToday) {
      updatedLog = updatedLog.filter(date => date !== today);
      updatedStreak = Math.max(0, updatedStreak - 1);
    } else {
      updatedLog.push(today);
      updatedStreak += 1;
    }

    onUpdateHabit(habit.id, {
      completionLog: updatedLog,
      streak: updatedStreak,
    });
  };

  const toggleMilestone = (goal: Goal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = updatedMilestones.length > 0 
      ? Math.round((completedCount / updatedMilestones.length) * 100) 
      : 0;

    onUpdateGoal(goal.id, {
      milestones: updatedMilestones,
      progress,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Goals Card (Milestones Style) */}
      <div className="lg:col-span-1 bg-accent text-[#111] rounded-[32px] p-8 flex flex-col relative overflow-hidden group transition-all">
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-medium tracking-tight">Active Goals</h3>
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="text-[#111]/60 hover:text-[#111] transition-colors"
            >
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <span className="font-mono text-lg leading-none mb-0.5">+</span>
              </div>
            </button>
          </div>
          
          <p className="text-[#111]/60 text-sm mb-6">Manage your long-term milestones.</p>

          {isAddingGoal && (
            <form onSubmit={handleCreateGoal} className="mb-6 p-4 bg-bg-card/10 rounded-2xl space-y-3 backdrop-blur-sm">
              <input
                type="text"
                required
                placeholder="Goal title..."
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full bg-transparent border-b border-white/30 text-[#111] placeholder-white/50 px-1 py-1.5 text-sm focus:outline-none focus:border-white transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-bg-card text-text-primary text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-bg-card/90 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal(false)}
                  className="px-4 py-2 bg-transparent text-[#111] border border-white/30 text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-bg-card/10 transition-colors"
                >
                  X
                </button>
              </div>
            </form>
          )}
          
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar-light">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#111]/50 space-y-4">
                <Flame className="w-12 h-12 opacity-50" />
                <p className="text-sm">No active goals yet.</p>
              </div>
            ) : (
              goals.map((g) => (
                <div key={g.id} className="bg-bg-card/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between text-sm font-medium mb-3">
                    <span className="truncate pr-2">{g.title}</span>
                    <span className="font-mono">{g.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-bg-card/20 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-bg-card transition-all duration-500" style={{ width: `${g.progress}%` }}></div>
                  </div>
                  <div className="space-y-1.5">
                    {g.milestones.slice(0, 3).map(m => (
                      <div key={m.id} className="flex items-start gap-2 text-xs">
                        <button onClick={() => toggleMilestone(g, m.id)} className={`mt-0.5 w-3 h-3 rounded-[2px] flex items-center justify-center border ${m.completed ? 'bg-bg-card border-white text-text-primary' : 'border-white/40'}`}>
                           {m.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                        <span className={m.completed ? 'line-through opacity-50' : ''}>{m.title}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => onDeleteGoal(g.id)} className="mt-3 text-[10px] uppercase font-bold text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))
            )}
          </div>
          
          <button onClick={() => setIsAddingGoal(true)} className="w-full bg-bg-card text-text-primary py-4 rounded-full text-sm font-bold mt-6 hover:bg-gray-100 transition-colors shadow-lg">
            + Create Goal
          </button>
        </div>
        
        {/* Abstract aesthetic shape */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-bg-card/10 rounded-full blur-3xl pointer-events-none group-hover:bg-bg-card/20 transition-all duration-1000"></div>
      </div>

      {/* Habits Card (Task Summary Style) */}
      <div className="lg:col-span-2 bg-bg-card border border-border-color rounded-[32px] p-8 flex flex-col">
        <div className="flex justify-between items-center mb-8 border-b border-border-color pb-4">
          <h3 className="text-xl font-medium tracking-tight">Daily Habits Overview</h3>
          <button
            onClick={() => setIsAddingHabit(!isAddingHabit)}
            className="text-sm font-medium text-text-mut hover:text-black dark:hover:text-white transition-colors flex items-center gap-2 border border-border-color px-4 py-2 rounded-xl"
          >
             {isAddingHabit ? 'Close' : '+ Add Habit'}
          </button>
        </div>

        {isAddingHabit && (
          <form onSubmit={handleCreateHabit} className="mb-6 p-4 bg-[#F2F2F2] dark:bg-neutral-800 rounded-2xl flex items-end gap-4 border border-border-color">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-text-mut">Habit Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Deep Work Block"
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                className="w-full bg-bg-card border border-border-color rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-text-mut">Frequency</label>
              <select
                value={habitFreq}
                onChange={(e) => setHabitFreq(e.target.value as 'daily' | 'weekly')}
                className="w-full bg-bg-card border border-border-color rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-accent text-[#111] text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-black dark:hover:bg-white dark:bg-white/80 transition-colors shrink-0"
            >
              Add
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {habits.slice(0, 3).map((h, i) => {
            const completedToday = h.completionLog.includes(getTodayDateStr());
            const isFirst = i === 0;
            return (
              <div key={h.id} className={`p-6 rounded-[24px] flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-lg ${isFirst ? 'bg-accent text-[#111]' : 'bg-[#F9F9F9] dark:bg-neutral-900 border border-border-color'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isFirst ? 'bg-bg-card/10' : 'bg-accent/5'}`}>
                    <Check className={`w-6 h-6 ${isFirst ? 'text-[#111]' : 'text-text-primary'}`} />
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${isFirst ? 'bg-bg-card/20' : 'bg-bg-card border border-border-color'}`}>
                    <Flame className={`w-3.5 h-3.5 ${isFirst ? 'text-[#111]' : 'text-text-primary'}`} /> {h.streak}
                  </div>
                </div>
                
                <div>
                  <div className="text-3xl font-medium tracking-tighter mb-1">{h.streak} Days</div>
                  <div className={`text-sm mb-4 line-clamp-2 min-h-[40px] ${isFirst ? 'text-[#111]/60' : 'text-text-mut'}`}>{h.title}</div>
                  
                  <div className="flex items-center justify-between border-t border-current pt-4 border-opacity-10">
                     <button onClick={() => toggleHabitCompletion(h)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider w-full ${completedToday ? (isFirst ? 'bg-bg-card text-text-primary' : 'bg-accent text-[#111]') : (isFirst ? 'bg-bg-card/10 text-[#111]' : 'bg-bg-card border border-border-color text-text-primary hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black')} transition-colors`}>
                        {completedToday ? 'Done Today' : 'Log Habit'}
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {habits.length === 0 && (
             <div className="col-span-3 flex flex-col items-center justify-center text-text-mut h-full bg-[#F9F9F9] dark:bg-neutral-900 rounded-[24px] border border-dashed border-border-color p-8">
               <Flame className="w-12 h-12 mb-4 opacity-20 text-text-primary" />
               <p>No habits defined yet. Add some to build streaks!</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
