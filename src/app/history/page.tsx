"use client";

import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import { ChevronDown, Utensils } from "lucide-react";
import { useState } from "react";

export default function HistoryPage() {
  const { logs } = useStore();
  const today = getToday();
  const [expandedDay, setExpandedDay] = useState<string | null>(today);

  // Generate last 7 days strings
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500">
      <header className="pt-4 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Log History</h1>
        <p className="text-muted text-sm mt-1">Your past 7 days of consistency.</p>
      </header>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-24 space-y-4 no-scrollbar">
        {last7Days.map((dateStr) => {
          const dayLog = logs[dateStr];
          const hasData = dayLog && dayLog.entries.length > 0;
          const isExpanded = expandedDay === dateStr;
          
          const title = dateStr === today ? "Today" : new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

          return (
            <div key={dateStr} className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : dateStr)}
                className="w-full flex items-center justify-between p-5 active:bg-white/5 transition-colors"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold">{title}</span>
                  {hasData ? (
                    <span className="text-xs font-medium text-primary mt-1">
                      {Math.round(dayLog.totalCalories)} kcal • {Math.round(dayLog.totalProtein)}g prol
                    </span>
                  ) : (
                    <span className="text-xs text-muted mt-1">No entries</span>
                  )}
                </div>
                <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                  <ChevronDown className="w-5 h-5 text-muted" />
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 bg-background/50">
                  {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center opacity-50">
                      <Utensils className="w-8 h-8 mb-2" />
                      <p className="text-sm">You didn't log anything {dateStr === today ? "yet" : "this day"}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayLog.entries.map((entry, idx) => (
                        <div key={entry.id || idx} className="flex justify-between items-center text-sm group">
                          <div>
                             <span className="text-foreground/90 font-medium">{entry.name}</span>
                             <span className="text-muted tracking-tight text-xs ml-2">
                               {entry.calories} cal / {entry.protein}g
                             </span>
                          </div>
                          <button onClick={() => useStore.getState().removeFood(dateStr, entry.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 opacity-50 hover:opacity-100 hover:bg-red-500/10 active:scale-95 transition-all">
                             <span className="text-xs">✕</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
