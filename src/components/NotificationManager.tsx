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
      const h = now.getHours();
      const m = now.getMinutes();
      // 9:30 PM local — allow a 2-minute window so we do not miss the tick on slow devices
      if (h === 21 && m >= 30 && m <= 31) {
        const todayStr = getToday();

        if (lastNotified.current === todayStr) return;

        const summary = logs[todayStr] || { totalCalories: 0, totalProtein: 0 };
        const safeCalories = targetCalories ?? 0;
        const safeProtein = targetProtein ?? 0;

        const title = "Gainly";
        const detail =
          safeCalories > 0 || safeProtein > 0
            ? `Today so far: ${Math.round(summary.totalCalories)} kcal · ${Math.round(summary.totalProtein)}g protein (targets ${safeCalories} kcal · ${safeProtein}g).`
            : "";
        const body = ["Check your calories & protein intake today.", detail].filter(Boolean).join(" ");

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icon-192x192.png", tag: "gainly-daily" });
          lastNotified.current = todayStr;
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [reminders.dailySummary, logs, targetCalories, targetProtein]);

  return null;
}
