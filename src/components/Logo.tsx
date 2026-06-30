import React from 'react';

export const Logo: React.FC<{ className?: string, iconOnly?: boolean, stacked?: boolean }> = ({ className = '', iconOnly = false, stacked = false }) => (
  <div className={`flex ${stacked ? 'flex-col' : 'flex-row'} items-center justify-center gap-4 group select-none ${className}`}>
    {/* Symbol */}
    <div className="flex flex-col items-center justify-center gap-[8px] text-text-primary group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-md shrink-0">
      {/* Top Dot */}
      <div className="w-[12px] h-[12px] bg-current rounded-full" />
      
      {/* Dumbbell / Division bar */}
      <svg width="48" height="14" viewBox="0 0 42 12" fill="currentColor">
        <path d="M 6 0 A 6 6 0 0 0 6 12 Q 21 9 36 12 A 6 6 0 0 0 36 0 Q 21 3 6 0 Z" />
      </svg>
      
      {/* Bottom Dot */}
      <div className="w-[12px] h-[12px] bg-current rounded-full" />
    </div>

    {/* Text */}
    {!iconOnly && (
      <div className={`flex flex-col ${stacked ? 'items-center' : 'items-start'} justify-center mt-1`}>
        {/* Nudge in sans-serif */}
        <span className={`font-sans text-4xl font-bold tracking-tighter text-text-primary drop-shadow-sm`}>
          Nudge<span className="text-accent-gold">.</span>
        </span>
        
        {/* Minimalist Tagline */}
        <span className={`text-[9px] font-sans font-bold tracking-[0.2em] uppercase text-text-muted mt-1 ${stacked ? 'text-center' : ''}`}>
          it doesn't remind. it acts.
        </span>
      </div>
    )}
  </div>
);
