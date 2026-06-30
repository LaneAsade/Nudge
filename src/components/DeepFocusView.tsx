import { useState, useEffect } from 'react';
import { Task } from '../types';
import { Play, Pause, Square, CloudRain, CheckCircle2, Coffee, Bell } from 'lucide-react';

interface DeepFocusViewProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onExit: () => void;
}

export const DeepFocusView = ({ task, onComplete, onExit }: DeepFocusViewProps) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timeInterval);
  }, []);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };
  
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  
  const progressPercent = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  const getDeadlineText = () => {
    const diff = new Date(task.deadline).getTime() - now.getTime();
    if (diff < 0) return 'Overdue';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Due in ${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-bg-card rounded-[32px] border border-border-color shadow-2xl h-full relative overflow-hidden widget-3d min-h-[500px]">
      {/* Decorative background circle */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 w-full max-w-lg flex flex-col items-center text-center space-y-6">
        <h2 className="text-3xl font-sans font-medium tracking-tighter text-text-main leading-tight">{task.title}</h2>
        <p className="text-sm text-text-mut max-w-md">{task.description}</p>
        
        <div className="bg-red-500/10 px-6 py-2 rounded-full border border-red-500/30 text-base font-bold text-red-500 flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <Bell className="w-4 h-4" />
          {getDeadlineText()}
        </div>

        {/* Timer */}
        <div className="relative py-8 w-full">
          <div className="text-[5rem] font-mono font-bold tracking-tighter text-text-main leading-none">
            {m}:{s}
          </div>
          <div className="mt-8 w-full h-3 bg-bg-input rounded-full overflow-hidden border border-border-color shadow-inner">
            <div className="h-full bg-accent-green transition-all duration-1000 relative" style={{ width: `${progressPercent}%` }}>
              <div className="absolute inset-0 bg-white/20"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 pt-4">
          <button
            onClick={resetTimer}
            className="w-12 h-12 bg-bg-input text-text-mut rounded-full flex items-center justify-center hover:bg-border-color transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
          <button
            onClick={toggleTimer}
            className="w-16 h-16 bg-text-main text-bg-app rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl cursor-pointer"
          >
            {isRunning ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
          </button>
          <button
            onClick={() => setMusicOn(!musicOn)}
            className={`px-4 h-12 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider ${
              musicOn ? 'bg-accent-green text-white shadow-md' : 'bg-bg-input text-text-mut hover:bg-border-color'
            }`}
            title="Ambient Music"
          >
            <CloudRain className="w-5 h-5" />
            {musicOn ? 'Focus sounds: ON' : 'Focus sounds: OFF'}
          </button>
        </div>

        <div className="w-full flex items-center gap-3 pt-8 mt-4 border-t border-border-color/50">
          <button
            onClick={onExit}
            className="flex-1 py-3 px-4 border-2 border-border-color text-text-med font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-bg-input transition-colors flex justify-center items-center gap-2 cursor-pointer"
          >
            <Coffee className="w-4 h-4" /> Take a Break
          </button>
          <button
            onClick={() => onComplete(task.id)}
            className="flex-1 py-3 px-4 bg-accent-green text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
};
