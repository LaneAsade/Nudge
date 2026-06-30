import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Zap, Clock, Activity, Flame } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  displayName: string;
  initials: string;
  tasksCompletedToday: number;
  tasksAssignedToday: number;
  streakDays: number;
  avgPriority: number;
  lastUpdated: string;
}

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const currentUserUid = auth.currentUser?.uid;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'leaderboard'), (snapshot) => {
      const fetchedUsers: LeaderboardUser[] = [];
      snapshot.forEach(doc => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as LeaderboardUser);
      });
      
      // Sort by tasks completed today (desc), then streak (desc)
      fetchedUsers.sort((a, b) => {
        if (b.tasksCompletedToday !== a.tasksCompletedToday) {
          return b.tasksCompletedToday - a.tasksCompletedToday;
        }
        return b.streakDays - a.streakDays;
      });

      setUsers(fetchedUsers);
      setLastRefreshed(new Date());
    });
    return () => unsubscribe();
  }, []);

  const currentUserRank = users.findIndex(u => u.id === currentUserUid) + 1;
  const currentUserStats = users.find(u => u.id === currentUserUid);

  useEffect(() => {
    const fetchInsight = async () => {
      if (!currentUserStats || users.length === 0) return;
      setIsLoadingInsight(true);
      try {
        const response = await fetch('/api/gemini/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaderboardData: users.slice(0, 10), // send top 10 to save tokens
            userRank: currentUserRank,
            userTasksDone: currentUserStats.tasksCompletedToday
          })
        });
        if (response.ok) {
          const data = await response.json();
          setInsight(data.insight);
        }
      } catch (error) {
        console.error('Failed to fetch insight:', error);
      } finally {
        setIsLoadingInsight(false);
      }
    };

    // Debounce insight fetch
    const timeout = setTimeout(() => {
      if (users.length > 0) fetchInsight();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [users, currentUserRank, currentUserStats]);

  const getAvatarColor = (initials: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-emerald-600', 'bg-cyan-600'];
    const hash = initials.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const top3 = [
    users[1], // 2nd place (left)
    users[0], // 1st place (center)
    users[2]  // 3rd place (right)
  ];

  return (
    <div className="h-full flex gap-8">
      {/* Main Leaderboard Area */}
      <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-medium tracking-tighter mb-2 text-text-primary">Leaderboard</h1>
            <p className="text-text-muted text-sm flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Refreshed at {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Podium */}
        {users.length >= 3 && (
          <div className="flex justify-center items-end gap-4 h-64 mt-12 mb-16">
            {top3.map((u, index) => {
              if (!u) return <div key={index} className="w-1/3 flex-1"></div>;
              
              const isFirst = index === 1;
              const isSecond = index === 0;
              
              const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
              
              return (
                <div 
                  key={u.id} 
                  className={`flex flex-col items-center justify-end rounded-t-[32px] border-t border-l border-r p-6 relative transition-all duration-500 hover:-translate-y-2
                    ${isFirst ? 'h-[120%] bg-accent-dim border-accent w-1/3 z-10 shadow-[0_-10px_30px_rgba(232,200,74,0.15)]' : 
                      'h-[90%] bg-bg-card border-border-medium w-[28%] opacity-90'}`}
                >
                  <div className="absolute -top-6 text-3xl filter drop-shadow-md">{medal}</div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg ${getAvatarColor(u.initials)}`}>
                    {u.initials}
                  </div>
                  <div className="text-text-primary font-medium truncate w-full text-center mb-1">
                    {u.displayName}
                  </div>
                  <div className="text-accent text-3xl font-bold tracking-tighter mb-1">
                    {u.tasksCompletedToday}
                  </div>
                  <div className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
                    Tasks Done
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full List */}
        <div className="space-y-3">
          {users.map((u, index) => {
            const isCurrentUser = u.id === currentUserUid;
            const remaining = Math.max(0, u.tasksAssignedToday - u.tasksCompletedToday);
            const progressPct = u.tasksAssignedToday > 0 
              ? Math.min(100, (u.tasksCompletedToday / u.tasksAssignedToday) * 100) 
              : 0;

            return (
              <div 
                key={u.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors
                  ${isCurrentUser ? 'bg-accent-dim border-accent/30' : 'bg-bg-card border-border-subtle hover:bg-bg-card-alt'}`}
              >
                <div className="w-8 text-center font-mono text-text-muted font-medium">
                  #{index + 1}
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${getAvatarColor(u.initials)}`}>
                  {u.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary truncate">{u.displayName}</span>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-[#111] text-[9px] uppercase tracking-widest font-bold">You</span>
                    )}
                    {remaining > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-border-medium text-text-secondary text-[10px] whitespace-nowrap">
                        {remaining} left
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }}></div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 shrink-0 ml-4">
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-text-primary">{u.tasksCompletedToday}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Done</span>
                  </div>
                  <div className="flex flex-col items-end w-16">
                    <span className="text-lg font-bold text-orange-500 flex items-center gap-1">
                      <Flame className="w-4 h-4" /> {u.streakDays}
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Streak</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Stats Sidebar */}
      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-bg-card rounded-[32px] border border-border-subtle p-6">
          <h3 className="text-sm font-medium text-text-secondary uppercase tracking-widest mb-6">Your Stats Today</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-base rounded-2xl p-4 border border-border-subtle">
              <div className="text-text-muted mb-1 text-xs">Rank</div>
              <div className="text-2xl font-bold text-text-primary">
                {currentUserRank > 0 ? `#${currentUserRank}` : '-'}
              </div>
            </div>
            <div className="bg-bg-base rounded-2xl p-4 border border-border-subtle">
              <div className="text-text-muted mb-1 text-xs">Tasks</div>
              <div className="text-2xl font-bold text-accent">
                {currentUserStats?.tasksCompletedToday || 0}
              </div>
            </div>
            <div className="bg-bg-base rounded-2xl p-4 border border-border-subtle">
              <div className="text-text-muted mb-1 text-xs">Streak</div>
              <div className="text-2xl font-bold text-orange-500 flex items-center gap-1">
                <Flame className="w-5 h-5" /> {currentUserStats?.streakDays || 0}
              </div>
            </div>
            <div className="bg-bg-base rounded-2xl p-4 border border-border-subtle">
              <div className="text-text-muted mb-1 text-xs">Avg Prio</div>
              <div className="text-2xl font-bold text-text-primary">
                {currentUserStats?.avgPriority || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Gemini Insight Card */}
        <div className="bg-bg-card rounded-[32px] border border-border-subtle p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" /> Analysis
            </h3>
            <div className="flex items-center gap-1 bg-border-subtle px-2 py-1 rounded-md">
              <Zap className="w-3 h-3 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-primary">Gemini Insight</span>
            </div>
          </div>
          
          <div className="relative z-10">
            {isLoadingInsight ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-border-medium rounded w-3/4"></div>
                <div className="h-4 bg-border-medium rounded w-5/6"></div>
                <div className="h-4 bg-border-medium rounded w-2/3"></div>
              </div>
            ) : insight ? (
              <p className="text-text-primary font-medium leading-relaxed italic">
                "{insight}"
              </p>
            ) : (
              <p className="text-text-muted text-sm italic">
                Complete a task to get AI insights on your leaderboard performance.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
