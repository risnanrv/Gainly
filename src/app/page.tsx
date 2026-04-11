"use client";

import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import { RingChart } from "@/components/RingChart";
import { QuickAddCard } from "@/components/QuickAddCard";
import { WeightTracker } from "@/components/WeightTracker";
import { useEffect, useState } from "react";
import { Bell, Flame, Info, History } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const { targetCalories, logs, targetProtein } = useStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  const today = getToday();
  const todaySummary = logs[today] || { totalCalories: 0, totalProtein: 0, entries: [] };

  const safeTargetCalories = targetCalories || 0;
  const safeTargetProtein = targetProtein || 0;
  
  const progress = safeTargetCalories > 0 ? (todaySummary.totalCalories / safeTargetCalories) * 100 : 0;
  const proteinProgress = safeTargetProtein > 0 ? (todaySummary.totalProtein / safeTargetProtein) * 100 : 0;

  const remainingCals = Math.max(0, safeTargetCalories - todaySummary.totalCalories);
  const remainingProtein = Math.max(0, safeTargetProtein - todaySummary.totalProtein);

  // Calculate Streak
  let streak = 0;
  const sortedLogDates = Object.keys(logs).sort().reverse();
  const d = new Date();

  // Quick streak logic reading backwards
  for (let i = 0; i < 365; i++) {
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    const dateStr = localDate.toISOString().split("T")[0];
    if (logs[dateStr] && logs[dateStr].entries.length > 0) {
      streak++;
    } else if (dateStr !== today) {
      // if we skipped a day that isn't today, break streak
      break;
    }
    d.setDate(d.getDate() - 1);
  }

  // Basic AI Suggestions logic
  let suggestion = "";
  if (remainingProtein > 30 && remainingCals < 500) {
    suggestion = "You are low on protein but high on calories. Focus on lean protein sources.";
  } else if (remainingCals <= 0) {
    suggestion = "You've exceeded calorie limits! Focus on hydration and rest.";
  } else if (remainingCals > 0 || remainingProtein > 0) {
    suggestion = "You still have room for more calories and protein today.";
  } else {
    suggestion = "Doing great! Keep tracking.";
  }

  let motivation = "Let's gain some mass today!";
  if (progress > 100) motivation = "Target crushed! Great job 💪";
  else if (progress > 80) motivation = "Almost there! One more meal 🍽️";
  else if (progress > 50) motivation = "Halfway! Keep eating 🚀";

  const reqNotification = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        toast.success("Reminders enabled!");
      }
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 overflow-y-auto pb-safe">
      <header className="flex justify-between items-start pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-primary text-sm font-medium">{motivation}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/progress" className="h-10 px-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-sm gap-1.5 active:scale-95 transition-transform">
            <Flame className="w-4 h-4 fill-orange-500" /> {streak}
          </Link>
          <button onClick={reqNotification} className="w-10 h-10 rounded-xl bg-surface/50 border border-white/5 flex items-center justify-center hover:bg-surface transition-colors active:scale-95 text-muted">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {suggestion && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl flex items-center gap-3 text-sm text-foreground/90 font-medium">
          <Info className="w-5 h-5 text-primary shrink-0" />
          <p>{suggestion}</p>
        </div>
      )}

      <section className="flex flex-col items-center justify-center py-2">
        <RingChart progress={progress} size={260} strokeWidth={24}>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-black tracking-tighter">
              {Math.round(todaySummary.totalCalories)}
            </span>
            <span className="text-muted text-sm uppercase tracking-widest font-medium mt-1">
              / {targetCalories} kcal
            </span>
            {remainingCals > 0 ? (
              <span className="mt-2 text-xs font-medium text-muted bg-surface px-3 py-1.5 rounded-full border border-white/5">
                <span className="text-foreground">{Math.round(remainingCals)}</span> cals left
              </span>
            ) : (
              <span className="mt-2 text-xs font-semibold text-highlight bg-highlight/10 px-3 py-1.5 rounded-full">
                Goal Reached!
              </span>
            )}
          </div>
        </RingChart>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-5 rounded-[24px] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <p className="text-muted text-xs uppercase tracking-wider mb-2">Protein</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{Math.round(todaySummary.totalProtein)}</span>
            <span className="text-sm text-muted mb-1 pb-0.5">/ {targetProtein}g</span>
          </div>
          {remainingProtein > 0 && <span className="text-[10px] text-muted mt-1">{Math.round(remainingProtein)}g more needed</span>}
          <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, proteinProgress)}%` }}
            />
          </div>
        </div>

        <WeightTracker />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Quick Add</h3>
          <span className="text-xs text-muted">Hold for custom</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          {["Egg", "Banana", "Soya Chunks", "Peanuts", "Sweet Potato", "Cherupayar (Green Gram)"].map(food => (
            <QuickAddCard key={food} foodName={food} />
          ))}
        </div>
      </section>
    </div>
  );
}

