'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAetherStore } from '@/store/useAetherStore';
import { X, Clock, Zap, Database, Brain, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AgentInspector = () => {
  const selectedEventId = useAetherStore((s) => s.selectedEventId);
  const events = useAetherStore((s) => s.events);
  const setSelectedEvent = useAetherStore((s) => s.setSelectedEvent);

  const event = events.find((e) => e.id === selectedEventId);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-14 bottom-0 w-80 bg-[rgba(8,8,16,0.9)] backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/70">Node Inspector</h2>
            <button 
              onClick={() => setSelectedEvent(null)}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            
            {/* Type & Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-md",
                  event.type === 'thought' ? "bg-cyan-500/20 text-cyan-400" :
                  event.type === 'tool_call' ? "bg-orange-500/20 text-orange-400" :
                  event.type === 'tool_result' ? "bg-green-500/20 text-green-400" :
                  event.type === 'memory' ? "bg-purple-500/20 text-purple-400" :
                  "bg-rose-500/20 text-rose-400"
                )}>
                  {event.type === 'thought' ? <Brain size={14} /> :
                   event.type === 'tool_call' ? <Zap size={14} /> :
                   event.type === 'memory' ? <Database size={14} /> :
                   <AlertTriangle size={14} />}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  {event.type.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-mono">
                <Clock size={10} />
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Content Payload */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Content payload</h3>
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 text-[11px] text-white/80 font-mono leading-relaxed max-h-60 overflow-y-auto">
                {typeof event.content === 'string' ? event.content : JSON.stringify(event.content, null, 2)}
              </div>
            </div>

            {/* Metadata properties */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Properties</h3>
                <div className="space-y-1">
                  {Object.entries(event.metadata).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-[11px] text-white/50 font-mono">{key}</span>
                      <span className="text-[11px] text-cyan-400 font-mono">
                        {typeof val === 'object' ? 'Object' : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
