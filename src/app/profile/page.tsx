"use client";

import { useStore } from "@/store/useStore";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Settings, Bell, LogOut, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { auth, profile, updateProfile, targetCalories, targetProtein, setTargets, reminders, updateReminders } = useStore();
  
  const [startingWeight, setStartingWeight] = useState(profile.startingWeight?.toString() || profile.currentWeight?.toString() || "");
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight?.toString() || "");
  const [durationWeeks, setDurationWeeks] = useState(profile.weeks?.toString() || "");

  const [manualCal, setManualCal] = useState(targetCalories?.toString() || "");
  const [manualPro, setManualPro] = useState(targetProtein?.toString() || "");

  const maintenance = Number(profile.currentWeight || 0) * 24 * 1.55;
  const totalGainKg = Number(targetWeight || 0) - Number(profile.currentWeight || 0);
  const dailySurplus = (totalGainKg * 7700) / (Math.max(1, Number(durationWeeks || 0)) * 7);
  const recommendedCalories = Math.round(maintenance + dailySurplus);
  const recommendedProtein = Math.round(Number(targetWeight || 0) * 1.8);

  const handleSaveGoals = async () => {
    updateProfile({
      startingWeight: Number(startingWeight),
      targetWeight: Number(targetWeight),
      weeks: Number(durationWeeks),
    });
    setManualCal(recommendedCalories.toString());
    setManualPro(recommendedProtein.toString());
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       await supabase.from('profiles').update({
          starting_weight: Number(startingWeight),
          target_weight: Number(targetWeight),
          weeks: Number(durationWeeks)
       }).eq('id', user.id);
    }
    toast.success("Goals updated!");
  };

  const handleSaveTargets = async () => {
    setTargets(Number(manualCal), Number(manualPro));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
       await supabase.from('profiles').update({
          target_calories: Number(manualCal),
          target_protein: Number(manualPro)
       }).eq('id', user.id);
    }
    toast.success("Daily targets updated!");
  };

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 overflow-y-auto pb-safe">
      <header className="pt-4 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted text-sm mt-1">Configure your body metrics.</p>
        <div className="mt-4 p-4 bg-primary/10 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold text-background uppercase">
            {auth.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="font-bold">{auth.name || "User"}</h2>
            <p className="text-xs text-muted flex items-center gap-2">
               {auth.email} {auth.age ? `• ${auth.age} yrs` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <section className="bg-surface border border-white/5 p-5 rounded-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">Body Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Starting Weight (kg)</label>
              <input
                type="number"
                value={startingWeight}
                onChange={(e) => setStartingWeight(e.target.value)}
                className="w-24 bg-background border border-white/10 rounded-xl py-2 px-3 text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Target Weight (kg)</label>
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-24 bg-background border border-white/10 rounded-xl py-2 px-3 text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Duration (Weeks)</label>
              <input
                type="number"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                className="w-24 bg-background border border-white/10 rounded-xl py-2 px-3 text-right focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleSaveGoals}
              className="w-full py-2.5 bg-white/5 border border-white/10 text-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Update Auto-Calculations
            </button>
          </div>
        </section>

        <section className="bg-primary/10 border border-primary/20 p-5 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Settings className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Daily Targets</h2>
          <p className="text-xs text-foreground/70 mb-4 pr-10">You can manually edit these or use the auto-calculated suggestions.</p>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
               <label className="text-[10px] uppercase text-primary font-bold">Calories (kcal)</label>
               <input
                 type="number"
                 value={manualCal}
                 onChange={(e) => setManualCal(e.target.value)}
                 className="w-full bg-background/50 border border-white/10 rounded-xl py-3 px-3 text-lg font-bold mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
               />
               <p className="text-[10px] text-muted mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> Suggested: {recommendedCalories}</p>
            </div>
            <div className="flex-1">
               <label className="text-[10px] uppercase text-primary font-bold">Protein (g)</label>
               <input
                 type="number"
                 value={manualPro}
                 onChange={(e) => setManualPro(e.target.value)}
                 className="w-full bg-background/50 border border-white/10 rounded-xl py-3 px-3 text-lg font-bold mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
               />
               <p className="text-[10px] text-muted mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> Suggested: {recommendedProtein}</p>
            </div>
          </div>
          
          <button
            onClick={handleSaveTargets}
            className="w-full py-3 bg-primary text-background rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform mt-2"
          >
            <Check className="w-4 h-4" /> Apply Targets
          </button>
        </section>

        <section className="bg-surface border border-white/5 p-5 rounded-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4 border-b border-white/5 pb-2">Reminders</h2>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted" />
              <div>
                 <span className="text-sm text-foreground/90 font-semibold block">Daily Summary</span>
                 <span className="text-[10px] text-muted">Triggers at 9:30 PM everyday</span>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !reminders.dailySummary;
                updateReminders({ dailySummary: next });
                if (next) {
                  if ("Notification" in window) Notification.requestPermission();
                  toast.success("Daily summary reminder enabled");
                }
              }}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${reminders.dailySummary ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${reminders.dailySummary ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </section>

        <section className="p-2 space-y-2">
          <button 
            onClick={async () => {
               await supabase.auth.signOut();
               toast.success("Logged out successfully");
            }}
            className="w-full flex items-center justify-center p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-500 font-bold text-sm border border-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout Account
          </button>
        </section>
      </div>
    </div>
  );
}
