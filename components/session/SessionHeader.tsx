"use client";

import { useState, useEffect, useMemo } from "react";
import { useSharedState } from "@/lib/state/shared-state";
import { createClient } from "@/lib/supabase/client";
import { differenceInMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

const ACTIVITY_LABELS: Record<string, string> = {
  foam_rolling: "Foam Rolling",
  stretching: "Stretching",
  vyper: "Vyper Recovery",
  massage_gun: "Massage Gun",
  other: "Recovery",
};

export function SessionHeader() {
  const { state } = useSharedState();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const session = state.currentSession;

  useEffect(() => {
    if (session.status !== "in_progress" || !session.startedAt) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [session.status, session.startedAt]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (state.isLoading) {
    return (
      <div className="glass-panel px-4 py-4">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-surface-elevated" />
          <div className="h-4 w-8 rounded bg-surface-elevated" />
        </div>
      </div>
    );
  }

  const planned = session.plannedExercises;
  const completedNames = new Set(
    session.completedExercises.map((e) => e.exercise_name.toLowerCase())
  );
  const exerciseCount = session.completedExercises.length;
  const recoveryCount = session.completedRecovery.length;
  const hasPlan = planned.length > 0;
  const hasContent = hasPlan || exerciseCount > 0 || recoveryCount > 0;

  const duration =
    session.startedAt
      ? differenceInMinutes(now, new Date(session.startedAt))
      : 0;

  const doneCount = hasPlan
    ? planned.filter((p) => completedNames.has(p.name.toLowerCase())).length
    : 0;

  const statusLabel =
    session.status === "in_progress"
      ? "SESSION ACTIVE"
      : session.status === "completed"
        ? "COMPLETED"
        : "READY";

  const statusColor =
    session.status === "in_progress"
      ? "text-success"
      : session.status === "completed"
        ? "text-primary"
        : "text-text-tertiary";

  return (
    <div className="glass-panel z-50 sticky top-0">
      <div className="flex items-center justify-between pl-4 pr-2 py-3">
        {/* Main Status Area */}
        <button
          onClick={() => hasContent && setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 text-left"
        >
           <div className="flex flex-col">
             <div className="flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className={`animate-glow absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    session.status === 'in_progress' ? 'bg-success' : 
                    session.status === 'completed' ? 'bg-primary' : 'bg-text-tertiary'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    session.status === 'in_progress' ? 'bg-success' : 
                    session.status === 'completed' ? 'bg-primary' : 'bg-text-tertiary'
                  }`}></span>
                </div>
                <span className={`text-label ${statusColor} tracking-widest`}>
                  {statusLabel}
                </span>
                {duration > 0 && (
                  <span className="text-label text-text-tertiary border-l border-border pl-2 ml-1">
                    {duration} MIN
                  </span>
                )}
             </div>

             {/* Sub-status: Progress or Counts */}
             {(hasPlan && session.status === "in_progress") ? (
                <div className="mt-1 flex items-center gap-2">
                   <div className="h-0.5 w-24 bg-surface-elevated overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(doneCount / planned.length) * 100}%` }}
                      />
                   </div>
                   <span className="text-[10px] text-text-tertiary font-mono">
                     {doneCount}/{planned.length}
                   </span>
                </div>
             ) : (
                hasContent && !hasPlan && (
                  <span className="text-[10px] text-text-tertiary mt-0.5">
                    {[
                      exerciseCount > 0 && `${exerciseCount} EXERCISES`,
                      recoveryCount > 0 && `${recoveryCount} RECOVERY`,
                    ].filter(Boolean).join(" / ")}
                  </span>
                )
             )}
           </div>
           
           {hasContent && (
             <motion.svg
               width="12"
               height="12"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2"
               className="text-text-tertiary opacity-50"
               animate={{ rotate: expanded ? 180 : 0 }}
             >
               <polyline points="6 9 12 15 18 9" />
             </motion.svg>
           )}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push("/stats")}
            className="p-2 hover:bg-surface-elevated rounded transition-colors text-text-secondary"
            aria-label="Stats"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </button>
          <button
            onClick={() => router.push("/history")}
            className="p-2 hover:bg-surface-elevated rounded transition-colors text-text-secondary"
            aria-label="History"
          >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
          </button>
          <button
            onClick={handleLogout}
             className="p-2 hover:bg-surface-elevated rounded transition-colors text-text-secondary"
            aria-label="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && hasContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-surface/50 border-t border-border"
          >
            <div className="px-4 py-3 space-y-3">
              {hasPlan && (
                <div>
                  <p className="text-label mb-2">Planned</p>
                  <div className="space-y-1">
                    {planned.map((p, i) => {
                      const done = completedNames.has(p.name.toLowerCase());
                      return (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-success' : 'bg-surface-elevated border border-border'}`} />
                            <span className={`text-sm ${done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                              {p.name}
                            </span>
                          </div>
                          <span className="text-xs text-text-tertiary font-mono">{p.target_sets}S</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                  {session.completedExercises
                    .filter(e => !hasPlan || !planned.some(p => p.name.toLowerCase() === e.exercise_name.toLowerCase()))
                    .map(e => (
                    <div key={e.id} className="flex items-center justify-between">
                       <span className="text-sm text-text-secondary">{e.exercise_name}</span>
                       <span className="text-xs text-text-tertiary font-mono">
                          {[
                            e.sets && `${e.sets}S`,
                            e.reps && `${e.reps}R`,
                            e.weight && `${e.weight}KG`
                          ].filter(Boolean).join(" · ")}
                       </span>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
