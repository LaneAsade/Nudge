import React from 'react';
import { CalendarEvent } from '../types';
import { Calendar, Clock, Trash2, Zap } from 'lucide-react';

interface CalendarWidgetProps {
  events: CalendarEvent[];
  accessToken: string | null;
  isSyncing?: boolean;
  onDeleteEvent: (id: string) => void;
  onSync?: () => void;
  offline?: boolean;
  reconnecting?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  events,
  accessToken,
  isSyncing,
  onDeleteEvent,
  onSync,
  offline,
  reconnecting
}) => {
  // Group events by date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Group events into dates
  const groups: { [dateStr: string]: CalendarEvent[] } = {};
  sortedEvents.forEach((ev) => {
    const dateStr = formatDate(ev.start);
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(ev);
  });

  const dates = Object.keys(groups);

  return (
    <div id="calendar-widget" className="bg-bg-card rounded-[32px] border border-border-color widget-3d p-5 flex flex-col h-full overflow-hidden transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-text-med" />
          <h3 className="text-sm font-semibold text-text-med uppercase tracking-widest">
            Synced Calendar
          </h3>
          {offline && (
            <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-bold tracking-widest uppercase">
              Offline
            </span>
          )}
          {reconnecting && (
            <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold tracking-widest uppercase animate-pulse">
              Reconnecting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!accessToken && onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="text-[10px] bg-bg-input text-text-med px-3 py-1 rounded-full font-mono uppercase hover:bg-bg-input/80 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : 'Sync with Google Calendar'}
            </button>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${accessToken ? 'bg-accent-green/20 text-accent-green font-bold' : 'bg-border-color/60 text-text-med'}`}>
            {accessToken ? 'SYNCED ✓' : 'Off-line'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 max-h-[350px]">
        {dates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-text-mut">
            <Clock className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs">No upcoming calendar events detected.</p>
            <p className="text-[10px] mt-1 max-w-[180px]">
              AI-scheduled focus blocks will appear here in real time.
            </p>
          </div>
        ) : (
          dates.map((dateStr) => {
            const dateObj = new Date(groups[dateStr][0].start);
            const dayNum = dateObj.getDate();
            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            return (
            <div key={dateStr} className="mb-6">
              <div className="flex items-center gap-2 mb-4 pl-1">
                <span className="text-3xl font-bold font-sans tracking-tight text-text-main leading-none">{dayNum}</span>
                <span className="text-[9px] font-bold font-sans text-[#8A96A8] uppercase tracking-[0.12em] leading-[1.2]">
                  {monthStr}<br/>{dayStr}
                </span>
              </div>
              
              <div className="relative pl-[26px] space-y-4">
                {/* Time Ruler */}
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#E2E8F0]"></div>
                
                {groups[dateStr].map((ev) => {
                  const isAi = ev.type === 'ai-scheduled';
                  const catColor = isAi ? 'bg-[#D97706]' : (ev as any).color === 'blue' ? 'bg-blue-500' : (ev as any).color === 'red' ? 'bg-red-500' : (ev as any).color === 'green' ? 'bg-green-500' : 'bg-[#94A3B8]';
                  const borderColor = isAi ? '#F6D860' : (ev as any).color === 'blue' ? '#3B82F6' : (ev as any).color === 'red' ? '#EF4444' : (ev as any).color === 'green' ? '#22C55E' : '#94A3B8';

                  return (
                    <div
                      key={ev.id}
                      className={`px-3 py-2.5 rounded-r-xl rounded-l-sm border-y border-r border-l-[3px] flex flex-col justify-center relative group/item transition-all ${
                        isAi
                          ? 'bg-accent-dim border-y-accent/30 border-r-accent/30 shadow-sm hover:-translate-y-[1px] hover:shadow-md'
                          : 'bg-bg-card-alt border-y-border-subtle border-r-border-subtle shadow-sm hover:-translate-y-[1px] hover:shadow-md'
                      }`}
                      style={{ borderLeftColor: borderColor }}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[19px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-[1.5px] border-white ${catColor} z-10 shadow-sm`}></div>

                      <div className="flex items-center justify-between overflow-hidden">
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-semibold font-sans text-text-main truncate">
                            {ev.title}
                          </span>
                          <span className="text-[10px] font-mono text-[#8A96A8] tracking-tight mt-0.5">
                            {formatTime(ev.start)} {ev.end ? `- ${formatTime(ev.end)}` : ''}
                          </span>
                        </div>

                        {isAi && (
                          <div className="shrink-0 bg-[#FEF9C3] text-[#854D0E] border border-[#FDE68A] rounded-full px-2 py-0.5 text-[8px] font-sans font-bold uppercase tracking-[0.12em] flex items-center gap-1 shadow-sm">
                            <Zap className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline-block">Gemini</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-black/5 rounded-md text-red-500 transition-opacity shrink-0 ml-2 cursor-pointer absolute right-2 top-1/2 -translate-y-1/2"
                          title="Delete calendar block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
