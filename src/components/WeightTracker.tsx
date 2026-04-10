"use client";

import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import { useState } from "react";
import { Scale, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function WeightTracker() {
  const { weightLogs, addWeight } = useStore();
  const today = getToday();
  const currentWeight = weightLogs[today];
  const [weightInput, setWeightInput] = useState(currentWeight?.toString() || "");
  const [isEditing, setIsEditing] = useState(false); // don't open automatically on initial render if it's missing to avoid UX blocking, or maybe we still want that? The user wants tap to open.

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
    } else {
      toast.error("Please enter a valid weight");
    }
  };

  return (
    <div className="bg-surface p-5 rounded-[24px] border border-white/5 flex flex-col justify-between items-start w-full relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Scale width="80" height="80" />
      </div>
      <p className="text-muted text-xs uppercase tracking-wider mb-3">Daily Weight</p>
      
      <div 
        className="flex flex-col relative z-10 w-full"
        onClick={() => {
          setWeightInput(currentWeight?.toString() || "");
          setIsEditing(true);
        }}
      >
        <div className="flex items-baseline gap-2 cursor-pointer">
          <span className="text-3xl font-bold">{currentWeight ? currentWeight : "--"}</span>
          <span className="text-muted">kg</span>
        </div>
        {diff && (
           <span className={`text-xs mt-1 font-medium ${isGain ? 'text-primary' : 'text-highlight'}`}>
             {isGain ? '+' : ''}{diff} kg since last entry
           </span>
        )}
        {!diff && lastWeight && currentWeight && (
          <span className="text-xs mt-1 text-muted">Same as last entry</span>
        )}
        {!currentWeight && (
          <span className="text-xs mt-1 text-muted">Tap to log weight</span>
        )}
      </div>

      <AnimatePresence>
        {isEditing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[320px] bg-surface border border-white/10 p-6 rounded-3xl z-[101] shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex flex-col items-center"
            >
              <h3 className="text-xl font-bold text-foreground mb-6">Enter your weight</h3>
              
              <div className="flex items-center justify-center gap-3 mb-8">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-28 bg-background border border-white/10 rounded-2xl py-4 text-center text-4xl font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
                  autoFocus
                />
                <span className="text-muted text-xl font-bold">kg</span>
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 text-muted font-bold active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-background font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5 stroke-[3]" /> Confirm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
