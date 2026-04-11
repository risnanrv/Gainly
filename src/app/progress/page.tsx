"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Target, Plus, ChevronDown, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ProgressPage() {
  const { weightLogs, profile, logs, addWeight, removeFood } = useStore();
  
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualWeight, setManualWeight] = useState("");
  const [addingWeight, setAddingWeight] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const sortedDates = Object.keys(weightLogs).sort();
  const graphData = sortedDates.map(date => {
    const d = new Date(date);
    const label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return { date: label, weight: weightLogs[date] };
  });

  const hasData = graphData.length > 0;
  const startingWeight = profile.startingWeight || profile.currentWeight || 0;
  const currentLog = hasData ? graphData[graphData.length - 1].weight : (profile.currentWeight || 0);
  const diff = currentLog - startingWeight;
  const isGain = diff >= 0;

  // Weekly stats calculator
  let weeklyCals = 0;
  let weeklyProtein = 0;
  let daysLogged = 0;

  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  last7Days.forEach(date => {
    if (logs[date] && logs[date].entries.length > 0) {
      weeklyCals += logs[date].totalCalories;
      weeklyProtein += logs[date].totalProtein;
      daysLogged++;
    }
  });

  const avgCals = daysLogged > 0 ? Math.round(weeklyCals / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round(weeklyProtein / daysLogged) : 0;

  // History mapping
  const historyDates = Object.keys(logs).sort().reverse();

  const handleManualWeight = () => {
    if (!manualWeight) return;
    addWeight(manualDate, Number(manualWeight));
    toast.success(`Weight for ${manualDate} added!`);
    setAddingWeight(false);
    setManualWeight("");
  };

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 overflow-y-auto pb-safe">
      <header className="pt-4 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
          <p className="text-muted text-sm mt-1">Track your weight and averages over time.</p>
        </div>
      </header>

      <div className="space-y-6">
        <section className="bg-surface border border-white/5 p-5 rounded-3xl">
          <div className="grid grid-cols-3 gap-2 text-center items-end mb-6">
             <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1">Starting</p>
                <div className="font-bold text-lg">{startingWeight} <span className="text-xs text-muted font-normal">kg</span></div>
             </div>
             <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1 pl-1">Current</p>
                <div className="font-bold text-3xl tracking-tight text-primary drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  {currentLog} <span className="text-sm font-normal text-muted">kg</span>
                </div>
             </div>
             <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1">Total Diff</p>
                <div className={`font-bold text-lg ${isGain ? 'text-highlight' : 'text-red-400'}`}>
                   {isGain ? '+' : ''}{diff.toFixed(1)} <span className="text-xs text-muted font-normal">kg</span>
                </div>
             </div>
          </div>

          <div className="h-48 w-full -ml-4">
            {hasData && graphData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']}
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                 <Target className="w-8 h-8 mb-2" />
                 <p className="text-sm">Log past weights to form a trend chart.</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-primary/5 border border-primary/10 p-5 rounded-3xl grid grid-cols-2 gap-4">
          <div className="border-r border-primary/10">
            <p className="text-xs uppercase tracking-wider text-primary font-medium mb-1">Weekly Avg Cals</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{avgCals}</span>
                <span className="text-xs text-muted">kcal/day</span>
            </div>
          </div>
          <div className="pl-2">
            <p className="text-xs uppercase tracking-wider text-primary font-medium mb-1">Weekly Avg Pro</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{avgProtein}</span>
                <span className="text-xs text-muted">g/day</span>
            </div>
          </div>
        </section>

        <section>
           <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">Diet History <span className="text-xs font-normal text-muted bg-surface px-2 py-0.5 rounded-full">{historyDates.length} days</span></h2>
           <div className="space-y-3 pb-8">
             {historyDates.length === 0 ? (
                <div className="text-center py-6 text-muted text-sm border border-white/5 border-dashed rounded-3xl bg-surface/30">No history available yet.</div>
             ) : (
               historyDates.map((dateStr) => {
                 const dayLog = logs[dateStr];
                 const d = new Date(dateStr);
                 const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                 const isExpanded = expandedDate === dateStr;

                 return (
                   <div key={dateStr} className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                      <button 
                         onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                         className="w-full p-4 flex justify-between items-center transition-colors active:bg-white/5"
                      >
                         <div className="text-left">
                            <h3 className="font-bold text-sm tracking-wide">{dateLabel}</h3>
                            <p className="text-xs text-muted mt-0.5">{Math.round(dayLog.totalCalories)} kcal • {Math.round(dayLog.totalProtein)}g</p>
                         </div>
                         {isExpanded ? <ChevronDown className="w-5 h-5 text-muted" /> : <ChevronRight className="w-5 h-5 text-muted" />}
                      </button>

                      <AnimatePresence>
                         {isExpanded && (
                           <motion.div 
                             initial={{ height: 0 }}
                             animate={{ height: "auto" }}
                             exit={{ height: 0 }}
                             className="overflow-hidden bg-background/50 border-t border-white/5"
                           >
                              <div className="p-4 space-y-3">
                                {dayLog.entries.length === 0 ? (
                                   <p className="text-xs text-muted text-center py-2">No foods logged.</p>
                                ) : (
                                  dayLog.entries.map((entry, idx) => (
                                    <div key={entry.id || idx} className="flex justify-between items-center text-sm group">
                                      <div>
                                         <span className="text-foreground/90 font-medium">{entry.name}</span>
                                         <span className="text-muted tracking-tight text-xs ml-2">
                                           {entry.calories} cal / {entry.protein}g
                                         </span>
                                      </div>
                                      <button onClick={() => removeFood(dateStr, entry.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 opacity-50 hover:opacity-100 hover:bg-red-500/10 active:scale-95 transition-all">
                                         <span className="text-[10px] font-bold uppercase">Del</span>
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                 );
               })
             )}
           </div>
        </section>
      </div>
    </div>
  );
}
