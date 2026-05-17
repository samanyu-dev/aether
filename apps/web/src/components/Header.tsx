'use client';
import React from 'react';
import { useAetherStore } from '@/store/useAetherStore';
import { cn } from '@/lib/utils';

export const Header = () => {
  const activeSession = useAetherStore((state) => state.activeSession);
  const isStreaming = useAetherStore((state) => state.isStreaming);

  return (
    <header className="h-14 flex items-center justify-between px-6 aether-glass border-b z-50">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-primary glow-cyan flex items-center justify-center">
          <span className="text-[14px] font-bold text-background italic leading-none">A</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold tracking-tight text-white/90">AETHER</h1>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              isStreaming ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.8)]" : "bg-white/20"
            )} />
            <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
              {isStreaming ? 'Streaming Intelligence' : 'System Ready'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex items-center gap-8">
        <div className="flex items-center gap-6">
          <button className="text-[10px] font-bold tracking-widest text-white/40 hover:text-primary transition-colors uppercase">Observatory</button>
          <button className="text-[10px] font-bold tracking-widest text-white/40 hover:text-white transition-colors uppercase">History</button>
          <button className="text-[10px] font-bold tracking-widest text-white/40 hover:text-white transition-colors uppercase">SDK</button>
        </div>
        
        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase text-white/30 font-bold tracking-tighter">Active Trace</span>
            <span className="text-[10px] font-mono text-primary/80">{activeSession || 'NO_SESSION'}</span>
          </div>
          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-primary to-secondary opacity-50" />
          </div>
        </div>
      </nav>
    </header>
  );
};
