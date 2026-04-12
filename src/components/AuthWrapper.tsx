"use client";

import { useStore } from "@/store/useStore";
import type { DailySummary, ExpenseCategory, ExpenseEntry, FoodEntry, FoodEntryDB } from "@/store/useStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

function normalizeLogEntries(raw: unknown): FoodEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e: Record<string, unknown>) => ({
    id: typeof e.id === "string" && e.id ? e.id : crypto.randomUUID(),
    name: String(e.name ?? ""),
    calories: Number(e.calories ?? 0),
    protein: Number(e.protein ?? 0),
    timestamp: typeof e.timestamp === "number" ? e.timestamp : Date.now(),
  }));
}

function mapFoodRow(row: Record<string, unknown>): FoodEntryDB {
  const created = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
  return {
    id: String(row.id),
    name: String(row.name),
    unit: (row.unit === "count" || row.unit === "ml" || row.unit === "grams" ? row.unit : "grams") as FoodEntryDB["unit"],
    calories_per_100g: row.calories_per_100g != null ? Number(row.calories_per_100g) : undefined,
    protein_per_100g: row.protein_per_100g != null ? Number(row.protein_per_100g) : undefined,
    calories_per_unit: row.calories_per_unit != null ? Number(row.calories_per_unit) : undefined,
    protein_per_unit: row.protein_per_unit != null ? Number(row.protein_per_unit) : undefined,
    calories_per_100ml: row.calories_per_100ml != null ? Number(row.calories_per_100ml) : undefined,
    protein_per_100ml: row.protein_per_100ml != null ? Number(row.protein_per_100ml) : undefined,
    timestamp: created,
  };
}

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { auth, updateAuth, updateProfile } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSessionUserId = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void handleSession(session.user.id, session.user.email ?? undefined);
      } else {
        lastSessionUserId.current = null;
        useStore.getState().clearData();
        if (useStore.getState().auth.isAuthenticated) updateAuth({ isAuthenticated: false });
        setInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void handleSession(session.user.id, session.user.email ?? undefined);
      } else {
        lastSessionUserId.current = null;
        useStore.getState().clearData();
        updateAuth({ isAuthenticated: false });
        if (pathname !== "/login") router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (userId: string, email?: string) => {
    const switched = lastSessionUserId.current !== null && lastSessionUserId.current !== userId;
    lastSessionUserId.current = userId;
    if (switched) {
      useStore.getState().clearData();
    }
    await fetchUserData(userId, email);
  };

  const fetchUserData = async (userId: string, email?: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (profileError) {
        console.error("profiles fetch:", profileError.message);
      }

      const logsResp = await supabase.from("logs").select("*").eq("user_id", userId);
      if (logsResp.error) console.error("logs fetch:", logsResp.error.message);

      const weightsResp = await supabase.from("weights").select("*").eq("user_id", userId);
      if (weightsResp.error) console.error("weights fetch:", weightsResp.error.message);

      const foodsResp = await supabase.from("foods").select("*").eq("user_id", userId);
      if (foodsResp.error) console.error("foods fetch:", foodsResp.error.message);

      const expensesResp = await supabase.from("expenses").select("*").eq("user_id", userId);
      if (expensesResp.error) console.error("expenses fetch:", expensesResp.error.message);

      let categoriesResp = await supabase.from("expense_categories").select("*").eq("user_id", userId);
      if (categoriesResp.error) console.error("expense_categories fetch:", categoriesResp.error.message);

      let expenseCategories: ExpenseCategory[] = (categoriesResp.data || []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name),
      }));

      if (!expenseCategories.length && !categoriesResp.error) {
        const seed = [
          { user_id: userId, name: "Gym" },
          { user_id: userId, name: "Diet Foods" },
        ];
        const { data: inserted, error: seedErr } = await supabase.from("expense_categories").insert(seed).select();
        if (seedErr) {
          console.error("seed expense_categories:", seedErr.message);
        } else if (inserted) {
          expenseCategories = inserted.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: String(c.name),
          }));
        }
      }

      const stateUpdates: Partial<ReturnType<typeof useStore.getState>> = {};

      if (profile) {
        updateAuth({
          isAuthenticated: true,
          email: email,
          name: profile.name ?? undefined,
          age: profile.age ?? undefined,
        });

        if (profile.target_calories !== undefined && profile.target_calories !== null) {
          const tc = Number(profile.target_calories);
          if (!Number.isNaN(tc)) stateUpdates.targetCalories = tc;
        }
        if (profile.target_protein !== undefined && profile.target_protein !== null) {
          const tp = Number(profile.target_protein);
          if (!Number.isNaN(tp)) stateUpdates.targetProtein = tp;
        }

        stateUpdates.profile = {
          startingWeight: profile.starting_weight ?? null,
          currentWeight: profile.current_weight ?? null,
          targetWeight: profile.target_weight ?? null,
          weeks: profile.weeks ?? null,
        };

        const hidden = profile.hidden_foods;
        if (Array.isArray(hidden)) {
          stateUpdates.hiddenDefaultFoodNames = hidden.map((n: string) => String(n).toLowerCase());
        }

        if (typeof profile.daily_reminder_enabled === "boolean") {
          stateUpdates.reminders = { dailySummary: profile.daily_reminder_enabled };
        }
      } else {
        updateAuth({ isAuthenticated: true, email: email });
        if (pathname !== "/login") router.replace("/login?setup=true");
      }

      if (!logsResp.error && logsResp.data) {
        const logs: Record<string, DailySummary> = {};
        logsResp.data.forEach((log: Record<string, unknown>) => {
          const entries = normalizeLogEntries(log.entries);
          const totalCalories = Number(log.total_calories ?? 0);
          const totalProtein = Number(log.total_protein ?? 0);
          logs[String(log.date)] = { totalCalories, totalProtein, entries };
        });
        stateUpdates.logs = logs;
      }

      if (!weightsResp.error && weightsResp.data) {
        const weightLogs: Record<string, number> = {};
        weightsResp.data.forEach((w: Record<string, unknown>) => {
          weightLogs[String(w.date)] = Number(w.weight);
        });
        stateUpdates.weightLogs = weightLogs;
      }

      if (!foodsResp.error && foodsResp.data) {
        stateUpdates.customFoods = foodsResp.data.map((row) => mapFoodRow(row as Record<string, unknown>));
      }

      if (!expensesResp.error && expensesResp.data) {
        const expenses: Record<string, ExpenseEntry[]> = {};
        expensesResp.data.forEach((row: Record<string, unknown>) => {
          const date = String(row.date);
          const ts = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
          const entry: ExpenseEntry = {
            id: String(row.id),
            amount: Number(row.amount),
            category: String(row.category),
            date,
            timestamp: ts,
          };
          if (!expenses[date]) expenses[date] = [];
          expenses[date].push(entry);
        });
        stateUpdates.expenses = expenses;
      }

      if (expenseCategories.length) {
        stateUpdates.expenseCategories = expenseCategories;
      }

      if (Object.keys(stateUpdates).length > 0) {
        useStore.setState((state) => ({ ...state, ...stateUpdates }));
      }
    } catch (e: unknown) {
      console.error("Error fetching user data:", e);
      const err = e as { code?: string };
      if (err?.code === "PGRST116") {
        updateAuth({ isAuthenticated: true, email: email });
        if (pathname !== "/login") router.replace("/login?setup=true");
      }
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (!mounted || initializing || !auth.isAuthenticated) return;

    const unsub = useStore.subscribe(() => {
      if (!useStore.getState().auth.isAuthenticated) return;

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const state = useStore.getState();

        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            starting_weight: state.profile.startingWeight,
            current_weight: state.profile.currentWeight,
            target_weight: state.profile.targetWeight,
            weeks: state.profile.weeks,
            target_calories: state.targetCalories,
            target_protein: state.targetProtein,
            hidden_foods: state.hiddenDefaultFoodNames,
            daily_reminder_enabled: state.reminders.dailySummary,
          })
          .eq("id", user.id);

        if (profileErr) console.error("sync profiles:", profileErr.message);

        const logsToUpsert = Object.entries(state.logs).map(([date, log]) => ({
          user_id: user.id,
          date,
          total_calories: log.totalCalories,
          total_protein: log.totalProtein,
          entries: log.entries,
        }));
        if (logsToUpsert.length > 0) {
          const { error } = await supabase.from("logs").upsert(logsToUpsert, {
            onConflict: "user_id,date",
          });
          if (error) console.error("sync logs:", error.message);
        }

        const weightsToUpsert = Object.entries(state.weightLogs).map(([date, weight]) => ({
          user_id: user.id,
          date,
          weight,
        }));
        if (weightsToUpsert.length > 0) {
          const { error } = await supabase.from("weights").upsert(weightsToUpsert, {
            onConflict: "user_id,date",
          });
          if (error) console.error("sync weights:", error.message);
        }

        const foodsToUpsert = state.customFoods.map((food) => ({
          id: food.id,
          user_id: user.id,
          name: food.name,
          unit: food.unit,
          calories_per_100g: food.calories_per_100g ?? null,
          protein_per_100g: food.protein_per_100g ?? null,
          calories_per_unit: food.calories_per_unit ?? null,
          protein_per_unit: food.protein_per_unit ?? null,
          calories_per_100ml: food.calories_per_100ml ?? null,
          protein_per_100ml: food.protein_per_100ml ?? null,
        }));
        if (foodsToUpsert.length > 0) {
          const { error } = await supabase.from("foods").upsert(foodsToUpsert, {
            onConflict: "user_id,name",
          });
          if (error) console.error("sync foods:", error.message);
        }

        const expenseRows = Object.values(state.expenses)
          .flat()
          .map((e) => ({
            id: e.id,
            user_id: user.id,
            date: e.date,
            amount: e.amount,
            category: e.category,
          }));
        if (expenseRows.length > 0) {
          const { error } = await supabase.from("expenses").upsert(expenseRows, { onConflict: "id" });
          if (error) console.error("sync expenses:", error.message);
        }
      }, 2000);
    });

    return () => unsub();
  }, [mounted, initializing, auth.isAuthenticated]);

  useEffect(() => {
    if (!mounted || initializing) return;

    if (!auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    } else if (auth.isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [mounted, initializing, auth.isAuthenticated, pathname, router]);

  if (!mounted || initializing) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (!auth.isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
