"use client";

import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import { useState } from "react";
import { Scale, Check } from "lucide-react";
import { toast } from "sonner";

export function WeightTracker() {
  const { weightLogs, addWeight } = useStore();
  const today = getToday();
  const currentWeight = weightLogs[today];
  const [weightInput, setWeightInput] = useState(currentWeight?.toString() || "");
  const [isEditing, setIsEditing] = useState(!currentWeight);

  // Find previous weight
  const sortedDates = Object.keys(weightLogs).sort();
  const previousDates = sortedDates.filter(d => d < today).reverse();
  const lastWeight = previousDates.length > 0 ? weightLogs[previousDates[0]] : null;
  
  const diff = currentWeight && lastWeight ? (currentWeight - lastWeight).toFixed(1) : null;
  const isGain = diff ? Number(diff) > 0 : false;

  const handleSave = () => {
    const val = Number(weightInput);
    if (!isNaN(val) && val > 0) {
      addWeight(today, val);
      setIsEditing(false);
      toast.success("Weight logged successfully");
    }
  };

  return (
    <div className="bg-surface p-5 rounded-[24px] border border-white/5 flex flex-col justify-between items-start w-full relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Scale width="80" height="80" />
      </div>
      <p className="text-muted text-xs uppercase tracking-wider mb-3">Daily Weight</p>
      
      {isEditing ? (
        <div className="flex w-full items-center gap-3 relative z-10">
          <input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 68.5"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="flex-1 bg-background border border-white/10 rounded-xl py-2 px-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <span className="text-muted text-sm -ml-2">kg</span>
          <button 
            onClick={handleSave}
            className="w-10 h-10 rounded-xl bg-primary text-background flex items-center justify-center shrink-0 active:scale-95"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div 
          className="flex flex-col relative z-10 w-full"
          onClick={() => setIsEditing(true)}
        >
          <div className="flex items-baseline gap-2 cursor-pointer">
            <span className="text-3xl font-bold">{currentWeight}</span>
            <span className="text-muted">kg</span>
          </div>
          {diff && (
             <span className={`text-xs mt-1 font-medium ${isGain ? 'text-primary' : 'text-highlight'}`}>
               {isGain ? '+' : ''}{diff} kg since last entry
             </span>
          )}
          {!diff && lastWeight && (
            <span className="text-xs mt-1 text-muted">Same as last entry</span>
          )}
        </div>
      )}
    </div>
  );
}
