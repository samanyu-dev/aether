'use client';
import React, { useRef, useEffect, memo } from 'react';
import { useAetherStore, AetherEvent } from '@/store/useAetherStore';
import { cn } from '@/lib/utils';

const EventEntry = memo(({ event }: { event: AetherEvent }) => {
  return (
    <div className="flex flex-col gap-1.5 border-l-2 border-white/5 pl-4 py-2 hover:bg-white/[0.02] transition-colors group">
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
          event.type === 'thought' ? 'text-primary bg-primary/10' :
          event.type === 'tool_call' ? 'text-accent bg-accent/10' :
          event.type === 'hallucination' ? 'text-red-400 bg-red-400/10' :
          'text-white/40 bg-white/5'
        )}>
          {event.type}
        </span>
        <span className="text-[8px] font-mono opacity-20 group-hover:opacity-40 transition-opacity">
          {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 2 })}
        </span>
      </div>
      <p className="text-[11px] text-white/70 leading-relaxed font-mono selection:bg-primary/30">
        {typeof event.content === 'string' ? event.content : JSON.stringify(event.content)}
      </p>
    </div>
  );
});

EventEntry.displayName = 'EventEntry';

export const StreamView = () => {
  const events = useAetherStore((state) => state.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="flex flex-col h-full aether-glass overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-primary rounded-full" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Cognition Stream</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[9px] font-mono opacity-30 uppercase">Events: {events.length}</div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {events.map((event) => (
          <EventEntry key={event.id} event={event} />
        ))}
        
        {events.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/20 animate-spin" />
            <p className="text-[10px] uppercase font-bold tracking-widest">Waiting for Intelligence...</p>
          </div>
        )}
      </div>
    </div>
  );
};
