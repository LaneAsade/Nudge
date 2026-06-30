import { useEffect, useRef } from 'react';
import { Task } from '../types';

export function useProactiveReminders(tasks: Task[], onNudge?: (task: Task) => void) {
  const lastNudgeTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    // Request permission on mount if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }
  }, []);

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date().getTime();
      const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
      const THIRTY_MINS_IN_MS = 30 * 60 * 1000;

      tasks.forEach(task => {
        if (task.status === 'completed' || !task.deadline) {
          return;
        }

        const deadlineTime = new Date(task.deadline).getTime();
        const timeUntilDeadline = deadlineTime - now;

        if (timeUntilDeadline > 0 && timeUntilDeadline <= THREE_HOURS_IN_MS) {
          const lastNudge = lastNudgeTimes.current[task.id] || 0;
          if (now - lastNudge >= THIRTY_MINS_IN_MS) {
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Deadline Pressure Mode Active', {
                  body: `"${task.title}" is due soon. Focus required.`,
                });
              }
              if (onNudge) onNudge(task);
              lastNudgeTimes.current[task.id] = now;
            } catch (error) {
              console.error("Failed to show notification:", error);
            }
          }
        }
      });
    };

    // Check immediately and then every minute
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60 * 1000);

    return () => clearInterval(interval);
  }, [tasks, onNudge]);
}
