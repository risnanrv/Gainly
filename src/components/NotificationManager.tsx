"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";

export function NotificationManager() {
  const { reminders, logs, targetCalories, targetProtein } = useStore();
  const lastNotified = useRef("");

  useEffect(() => {
    if (!reminders.dailySummary) return;

    const interval = setInterval(() => {
      const now = new Date();
      // Check if it's 21:30 (9:30 PM)
      if (now.getHours() === 21 && now.getMinutes() === 30) {
        const todayStr = getToday();
        
        // Prevent double notification
        if (lastNotified.current === todayStr) return;

        const summary = logs[todayStr] || { totalCalories: 0, totalProtein: 0 };
        const safeCalories = targetCalories || 0;
        const safeProtein = targetProtein || 0;
        const reachedTarget = summary.totalCalories >= safeCalories;
        
        const title = reachedTarget ? "Great job!" : "You missed your target";
        const body = `You ate ${Math.round(summary.totalCalories)}/${safeCalories} kcal and ${Math.round(summary.totalProtein)}/${safeProtein}g protein today.`;

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icon-192x192.png" });
          lastNotified.current = todayStr;
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [reminders.dailySummary, logs, targetCalories, targetProtein]);

  return null;
}
